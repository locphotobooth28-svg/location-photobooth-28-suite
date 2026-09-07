const fs = require("fs");
const crypto = require("crypto");
const { Readable } = require("stream");

function configured(){
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME &&
    process.env.R2_ENDPOINT
  );
}

function cfg(){
  if(!configured()) throw new Error("Cloudflare R2 n'est pas configuré.");
  return {
    accountId:String(process.env.R2_ACCOUNT_ID).trim(),
    accessKey:String(process.env.R2_ACCESS_KEY_ID).trim(),
    secretKey:String(process.env.R2_SECRET_ACCESS_KEY).trim(),
    bucket:String(process.env.R2_BUCKET_NAME).trim(),
    endpoint:String(process.env.R2_ENDPOINT).trim().replace(/\/$/,"")
  };
}

function sha256(data){
  return crypto.createHash("sha256").update(data).digest("hex");
}
function hmac(key,data,encoding){
  return crypto.createHmac("sha256",key).update(data,"utf8").digest(encoding);
}
function amzDate(date=new Date()){
  return date.toISOString().replace(/[:-]|\.\d{3}/g,"");
}
function shortDate(amz){ return amz.slice(0,8); }
function signingKey(secret,date,region="auto",service="s3"){
  const kDate=hmac(Buffer.from(`AWS4${secret}`,"utf8"),date);
  const kRegion=hmac(kDate,region);
  const kService=hmac(kRegion,service);
  return hmac(kService,"aws4_request");
}
function encodePath(value){
  return String(value).split("/").map(encodeURIComponent).join("/");
}
function objectUrl(key){
  const c=cfg();
  return `${c.endpoint}/${encodeURIComponent(c.bucket)}/${encodePath(key)}`;
}
function canonicalUri(key){
  const c=cfg();
  return `/${encodeURIComponent(c.bucket)}/${encodePath(key)}`;
}
function canonicalQuery(params){
  return [...params.entries()]
    .sort(([a],[b])=>a.localeCompare(b))
    .map(([k,v])=>`${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}
function authHeaders(method,key,payloadHash){
  const c=cfg();
  const u=new URL(c.endpoint);
  const now=amzDate();
  const date=shortDate(now);
  const region="auto";
  const service="s3";
  const signedHeaders="host;x-amz-content-sha256;x-amz-date";
  const canonicalHeaders=`host:${u.host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${now}\n`;
  const request=[method,canonicalUri(key),"",canonicalHeaders,signedHeaders,payloadHash].join("\n");
  const scope=`${date}/${region}/${service}/aws4_request`;
  const stringToSign=`AWS4-HMAC-SHA256\n${now}\n${scope}\n${sha256(request)}`;
  const signature=hmac(signingKey(c.secretKey,date,region,service),stringToSign,"hex");
  return {
    "x-amz-date":now,
    "x-amz-content-sha256":payloadHash,
    "authorization":`AWS4-HMAC-SHA256 Credential=${c.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  };
}

function safeName(value){
  const clean=String(value||"media")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-zA-Z0-9._-]+/g,"-")
    .replace(/^-+|-+$/g,"");
  return clean.slice(-140)||"media";
}
function makeKey(event,file){
  const rnd=crypto.randomBytes(8).toString("hex");
  const stamp=new Date().toISOString().replace(/[:.]/g,"-");
  return `events/${event.id}/gallery/${stamp}-${rnd}-${safeName(file.originalname||file.filename)}`;
}
function toFileId(key){
  return `r2:${Buffer.from(String(key),"utf8").toString("base64url")}`;
}
function isR2FileId(value){ return String(value||"").startsWith("r2:"); }
function fromFileId(value){
  if(!isR2FileId(value)) return null;
  return Buffer.from(String(value).slice(3),"base64url").toString("utf8");
}

async function uploadFile(event,file){
  const key=makeKey(event,file);
  const body=await fs.promises.readFile(file.path);
  const payloadHash=sha256(body);
  const headers=authHeaders("PUT",key,payloadHash);
  if(file.mimetype) headers["content-type"]=file.mimetype;
  const response=await fetch(objectUrl(key),{method:"PUT",headers,body});
  if(!response.ok){
    const text=await response.text().catch(()=>"");
    throw new Error(`R2 upload ${response.status}: ${text.slice(0,300)}`);
  }
  return {key,fileId:toFileId(key)};
}

async function deleteFile(key){
  const payloadHash=sha256(Buffer.alloc(0));
  const response=await fetch(objectUrl(key),{method:"DELETE",headers:authHeaders("DELETE",key,payloadHash)});
  if(!response.ok && response.status!==404){
    const text=await response.text().catch(()=>"");
    throw new Error(`R2 delete ${response.status}: ${text.slice(0,300)}`);
  }
}

async function getStream(key){
  const payloadHash=sha256(Buffer.alloc(0));
  const response=await fetch(objectUrl(key),{method:"GET",headers:authHeaders("GET",key,payloadHash)});
  if(!response.ok) throw new Error(`R2 read ${response.status}`);
  return Readable.fromWeb(response.body);
}

function originalNameFromKey(key){
  const base=String(key||"").split("/").pop()||"photo";
  return base.replace(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[0-9a-f]{16}-/i,"")||"photo";
}

function presignGet(key,expires=900,options={}){
  const c=cfg();
  const endpoint=new URL(c.endpoint);
  const now=amzDate();
  const date=shortDate(now);
  const region="auto";
  const service="s3";
  const scope=`${date}/${region}/${service}/aws4_request`;
  const params=new URLSearchParams();
  params.set("X-Amz-Algorithm","AWS4-HMAC-SHA256");
  params.set("X-Amz-Credential",`${c.accessKey}/${scope}`);
  params.set("X-Amz-Date",now);
  params.set("X-Amz-Expires",String(Math.max(60,Math.min(Number(expires)||900,3600))));
  params.set("X-Amz-SignedHeaders","host");
  if(options?.download){
    const fileName=safeName(options.fileName||originalNameFromKey(key));
    params.set("response-content-disposition",`attachment; filename=\"${fileName}\"`);
  }
  const cq=canonicalQuery(params);
  const canonicalHeaders=`host:${endpoint.host}\n`;
  const canonicalRequest=["GET",canonicalUri(key),cq,canonicalHeaders,"host","UNSIGNED-PAYLOAD"].join("\n");
  const stringToSign=`AWS4-HMAC-SHA256\n${now}\n${scope}\n${sha256(canonicalRequest)}`;
  const signature=hmac(signingKey(c.secretKey,date,region,service),stringToSign,"hex");
  params.set("X-Amz-Signature",signature);
  return `${objectUrl(key)}?${canonicalQuery(params)}`;
}

module.exports={
  configured,
  uploadFile,
  deleteFile,
  getStream,
  presignGet,
  toFileId,
  fromFileId,
  isR2FileId
};
