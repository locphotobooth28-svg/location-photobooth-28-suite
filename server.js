require("dotenv").config();

const express = require("express");
const session = require("express-session");
const path = require("path");
const crypto = require("crypto");
let webpush=null;
try{webpush=require("web-push");}catch{console.warn("web-push non installé : notifications Push désactivées.");}
const QRCode = require("qrcode");
const fs = require("fs");
const multer = require("multer");
const prisma = require("./lib/prisma");
const googleService = require("./services/googleService");
const contractService = require("./services/contractService");
const { ensureCatalog, ensureSelectedMaterials } = require("./lib/catalog");

const app = express();
const PORT = process.env.PORT || 3000;
const MEMORIES_DIR = process.env.MEMORIES_DIR || path.join(__dirname, "uploads", "memories");
fs.mkdirSync(MEMORIES_DIR, { recursive: true });
const memoriesStorage = multer.diskStorage({
  destination: (req,file,cb)=>cb(null,MEMORIES_DIR),
  filename: (req,file,cb)=>{
    const ext=path.extname(file.originalname||"").toLowerCase().replace(/[^.a-z0-9]/g,"").slice(0,8);
    cb(null,`${Date.now()}-${crypto.randomBytes(10).toString("hex")}${ext}`);
  }
});
const memoriesUpload = multer({
  storage: memoriesStorage,
  limits:{fileSize:25*1024*1024,files:100},
  fileFilter:(req,file,cb)=>{
    const ok=["image/jpeg","image/png","image/webp","image/heic","image/heif","video/mp4","video/quicktime"].includes(file.mimetype);
    cb(ok?null:new Error("Format non autorisÃ©."),ok);
  }
});

const documentUpload = multer({
  storage:multer.memoryStorage(),
  limits:{
    fileSize:15*1024*1024,
    files:1
  },
  fileFilter:(req,file,cb)=>{
    const isPdf =
      file.mimetype==="application/pdf" ||
      /\.pdf$/i.test(file.originalname||"");

    cb(
      isPdf ? null : new Error("Seuls les fichiers PDF sont autorisés."),
      isPdf
    );
  }
});

app.set("trust proxy", 1);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  name: "lp28.sid",
  secret: process.env.SESSION_SECRET || "change-me-location-photobooth-28-suite",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: "auto",
    maxAge: 12 * 60 * 60 * 1000
  }
}));

const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || "admin@locationphotobooth28.fr").trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-moi";
const TRUST_COOKIE = "lp28.trusted";
const TRUST_DAYS = 30;

function sha256(value){ return crypto.createHash("sha256").update(String(value)).digest("hex"); }
function randomToken(bytes=32){ return crypto.randomBytes(bytes).toString("base64url"); }
function normalizePhone(value){ return String(value||"").replace(/[^0-9+]/g,"").trim() || null; }
function normalizeEmail(value){ return String(value||"").trim().toLowerCase() || null; }
function normalizeUsername(value){ return String(value||"").trim().toLowerCase() || null; }
function normalizePersonName(value){ return String(value||"").trim().replace(/\s+/g," "); }
function parseCookies(req){
  return Object.fromEntries(String(req.headers.cookie||"").split(";").map(v=>v.trim()).filter(Boolean).map(v=>{const i=v.indexOf("=");return i<0?[v,""]:[v.slice(0,i),decodeURIComponent(v.slice(i+1))]}));
}
function hashPassword(password){
  const salt=crypto.randomBytes(16);
  const key=crypto.scryptSync(String(password),salt,64);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}
function verifyPassword(password,stored){
  const [kind,saltHex,keyHex]=String(stored||"").split("$");
  if(kind!=="scrypt"||!saltHex||!keyHex)return false;
  const expected=Buffer.from(keyHex,"hex");
  const actual=crypto.scryptSync(String(password),Buffer.from(saltHex,"hex"),expected.length);
  return actual.length===expected.length && crypto.timingSafeEqual(actual,expected);
}
const B32="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32Encode(buf){let bits=0,value=0,out="";for(const byte of buf){value=(value<<8)|byte;bits+=8;while(bits>=5){out+=B32[(value>>>(bits-5))&31];bits-=5}}if(bits>0)out+=B32[(value<<(5-bits))&31];return out;}
function base32Decode(text){let bits=0,value=0,out=[];for(const ch of String(text).toUpperCase().replace(/=+$/,"")){const idx=B32.indexOf(ch);if(idx<0)continue;value=(value<<5)|idx;bits+=5;if(bits>=8){out.push((value>>>(bits-8))&255);bits-=8}}return Buffer.from(out);}
function totpCode(secret,step=Math.floor(Date.now()/30000)){
  const key=base32Decode(secret); const b=Buffer.alloc(8); b.writeBigUInt64BE(BigInt(step));
  const h=crypto.createHmac("sha1",key).update(b).digest(); const o=h[h.length-1]&15;
  const n=((h[o]&127)<<24)|(h[o+1]<<16)|(h[o+2]<<8)|h[o+3]; return String(n%1000000).padStart(6,"0");
}
function verifyTotp(secret,code){ const c=String(code||"").replace(/\D/g,""); if(c.length!==6)return false; const step=Math.floor(Date.now()/30000); return [-1,0,1].some(d=>{const a=Buffer.from(totpCode(secret,step+d));const b=Buffer.from(c);return a.length===b.length&&crypto.timingSafeEqual(a,b)}); }
function accountStatus(u){
  const p=u?.permissions&&typeof u.permissions==="object"&&!Array.isArray(u.permissions)?u.permissions:{};
  return String(p.accountStatus||"").toUpperCase() || (u?.active===false?"BLOCKED":"ACTIVE");
}
function safeUser(u){
  const firstName=u.firstName||String(u.name||"").trim().split(/\s+/)[0]||null;
  const lastName=u.lastName||null;
  const displayName=[firstName,lastName].filter(Boolean).join(" ")||u.name||u.username||u.email;
  return {
    id:u.id,name:u.name,firstName,lastName,displayName,collaboratorId:u.collaboratorId||null,
    email:u.email,phone:u.phone,username:u.username,role:u.role,active:u.active,
    accountStatus:accountStatus(u),permissions:u.permissions||{},totpEnabled:u.totpEnabled,
    lastLoginAt:u.lastLoginAt,createdAt:u.createdAt
  };
}
function passwordPolicyError(password){
  const p=String(password||"");
  if(p.length<8)return "Le mot de passe doit contenir au minimum 8 caractères.";
  if(!/[A-ZÀ-ÖØ-Ý]/.test(p))return "Le mot de passe doit contenir au moins une majuscule.";
  if(!/[0-9]/.test(p))return "Le mot de passe doit contenir au moins un chiffre.";
  if(!/[^A-Za-z0-9À-ÖØ-öø-ÿ]/.test(p))return "Le mot de passe doit contenir au moins un caractère spécial.";
  return null;
}
function permissionsObject(u){
  return u?.permissions&&typeof u.permissions==="object"&&!Array.isArray(u.permissions)?u.permissions:{};
}
function eventIsGifted(event){
  let p=event?.preparation;
  if(typeof p==="string"){try{p=JSON.parse(p);}catch{p={};}}
  return Boolean(p&&typeof p==="object"&&p.gifted===true);
}
function eventOperationalRemaining(event){
  if(!event || event.balancePaid || eventIsGifted(event))return 0;
  const stored=Number(event.balance);
  if(Number.isFinite(stored) && stored>0)return Math.max(stored,0);
  const total=Number(event.totalPrice);
  const deposit=Number(event.deposit);
  if(Number.isFinite(total)){
    return Math.max(total-(Number.isFinite(deposit)?deposit:0),0);
  }
  return 0;
}
function effectiveCollaboratorPermissions(event,access){
  let prep=event?.preparation;
  if(typeof prep==="string"){try{prep=JSON.parse(prep);}catch{prep={};}}
  const saved=prep?.collaboratorPermissions&&typeof prep.collaboratorPermissions==="object"
    ? prep.collaboratorPermissions
    : {};
  const pick=(key,fallback)=>saved[key]!==undefined ? saved[key]===true : fallback===true;
  return {
    canSeeClient:pick("canSeeClient",access?.canSeeClient),
    canSeeContract:pick("canSeeContract",access?.canSeeContract),
    canSeeInvoice:pick("canSeeInvoice",access?.canSeeInvoice),
    canSeeBalance:!eventIsGifted(event)&&pick("canSeeBalance",access?.canSeeBalance),
    canManageCaution:pick("canManageCaution",access?.canManageCaution),
    canSeeInstructions:pick("canSeeInstructions",access?.canSeeInstructions)
  };
}
function notificationWhere(user){
 const now=new Date(),aud=["ALL"];if(user?.role==="ADMIN")aud.push("ADMIN");if(user?.role==="INTERVENANT")aud.push("INTERVENANTS");if(user?.role==="VIEWER")aud.push("VIEWERS");
 return {startsAt:{lte:now},AND:[{OR:[{expiresAt:null},{expiresAt:{gt:now}}]},{OR:[{audience:{in:aud}},{targetUserId:user?.id||"__none__"}]},{reads:{none:{userId:user?.id||"__none__",dismissedAt:{not:null}}}}]};
}
async function addNotification(d){
  const notification=await prisma.appNotification.create({data:{title:String(d.title||"Notification").slice(0,140),message:String(d.message||"").slice(0,1200),type:["INFO","SUCCESS","WARNING","URGENT"].includes(d.type)?d.type:"INFO",source:d.source||"SYSTEM",audience:d.audience||"ADMIN",targetUserId:d.targetUserId||null,eventId:d.eventId||null,startsAt:d.startsAt?new Date(d.startsAt):new Date(),expiresAt:d.expiresAt?new Date(d.expiresAt):null}});
  sendPushForNotification(notification).catch(err=>console.error("Push notification :",err.message));
  return notification;
}

async function familyPlanningNotificationUser(){
  try{
    const candidates=[];
    if(typeof FAMILY_PLANNING_EMAIL!=="undefined" && FAMILY_PLANNING_EMAIL){
      candidates.push({email:FAMILY_PLANNING_EMAIL});
    }
    candidates.push({firstName:{equals:"Lydie",mode:"insensitive"}});
    candidates.push({name:{contains:"Lydie",mode:"insensitive"}});
    return await prisma.user.findFirst({
      where:{active:true,OR:candidates},
      orderBy:{createdAt:"asc"}
    });
  }catch(err){
    console.warn("Recherche compte planning familial :",err.message);
    return null;
  }
}
async function notifyFamilyPlanningUser(data){
  const target=await familyPlanningNotificationUser();
  return addNotification({
    ...data,
    audience:target?"USER":"VIEWERS",
    targetUserId:target?.id||null
  });
}
function frDateShort(value){
  try{return new Date(value).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"});}
  catch{return String(value||"");}
}
const VAPID_PUBLIC_KEY=String(process.env.VAPID_PUBLIC_KEY||"").trim();
const VAPID_PRIVATE_KEY=String(process.env.VAPID_PRIVATE_KEY||"").trim();
const VAPID_SUBJECT=String(process.env.VAPID_SUBJECT||"mailto:admin@locationphotobooth28.fr").trim();
function pushConfigured(){return Boolean(webpush&&VAPID_PUBLIC_KEY&&VAPID_PRIVATE_KEY);}
if(pushConfigured()){
  try{webpush.setVapidDetails(VAPID_SUBJECT,VAPID_PUBLIC_KEY,VAPID_PRIVATE_KEY);}catch(err){console.error("Configuration VAPID :",err.message);}
}
async function notificationRecipientUserIds(n){
  if(n.targetUserId)return [n.targetUserId];
  const where={active:true};
  if(n.audience==="ADMIN")where.role="ADMIN";
  else if(n.audience==="INTERVENANTS")where.role="INTERVENANT";
  else if(n.audience==="VIEWERS")where.role="VIEWER";
  const users=await prisma.user.findMany({where,select:{id:true}});
  return users.map(u=>u.id);
}
async function sendPushForNotification(n){
  if(!pushConfigured())return;
  const userIds=await notificationRecipientUserIds(n);
  if(!userIds.length)return;
  const subs=await prisma.pushSubscription.findMany({where:{active:true,userId:{in:userIds}}});
  await Promise.allSettled(subs.map(async s=>{
    const receiptToken=randomToken(24);
    const delivery=await prisma.pushDelivery.create({data:{notificationId:n.id,userId:s.userId,subscriptionId:s.id,receiptToken,deviceLabel:s.deviceLabel||null,status:"PENDING"}});
    const payload=JSON.stringify({title:n.title,message:n.message,eventId:n.eventId||null,notificationId:n.id,deliveryToken:receiptToken,url:n.eventId?`/?event=${encodeURIComponent(n.eventId)}`:"/"});
    try{
      await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},payload,{TTL:3600,urgency:n.type==="URGENT"?"high":"normal"});
      await prisma.pushDelivery.update({where:{id:delivery.id},data:{status:"SENT",sentAt:new Date()}}).catch(()=>{});
    }catch(err){
      await prisma.pushDelivery.update({where:{id:delivery.id},data:{status:"FAILED",failedAt:new Date(),error:String(err?.message||"Échec Push").slice(0,500)}}).catch(()=>{});
      if(err?.statusCode===404||err?.statusCode===410){await prisma.pushSubscription.update({where:{endpoint:s.endpoint},data:{active:false}}).catch(()=>{});return;}
      throw err;
    }
  }));
}
function allowedModulesForUser(u){
  if(u?.role==="ADMIN")return null;
  const p=permissionsObject(u);
  const defaults=u?.role==="INTERVENANT"
    ? ["dashboard","events","planning","materialPlanning"]
    : ["dashboard","planning"];
  return Array.isArray(p.allowedModules)?p.allowedModules:defaults;
}
function canViewModule(u,moduleId){
  if(u?.role==="ADMIN")return true;
  return allowedModulesForUser(u).includes(moduleId);
}
async function setAuthenticatedSession(req,user){
  req.session.admin=user.role==="ADMIN";
  req.session.userId=user.id;
  req.session.role=user.role;
}
async function trustedUserFromRequest(req){
  const raw=parseCookies(req)[TRUST_COOKIE]; if(!raw)return null;
  const row=await prisma.trustedDevice.findUnique({where:{tokenHash:sha256(raw)},include:{user:true}}).catch(()=>null);
  if(!row||row.expiresAt<=new Date()||!row.user.active||accountStatus(row.user)!=="ACTIVE")return null;
  await prisma.trustedDevice.update({where:{id:row.id},data:{lastUsedAt:new Date()}}).catch(()=>{});
  return row.user;
}
async function sessionUser(req){
  if(!req.session?.userId)return null;
  const u=await prisma.user.findUnique({where:{id:req.session.userId}}).catch(()=>null);
  if(!u||!u.active||accountStatus(u)!=="ACTIVE")return null;
  return u;
}
async function adminOnly(req,res,next){
  const u=await sessionUser(req);
  if(u?.role==="ADMIN"){req.currentUser=u;return next();}
  if(!req.session?.userId&&req.session?.admin===true)return next();
  return res.status(401).json({ok:false,message:"Non autorisé."});
}
async function userOnly(req,res,next){
  const u=await sessionUser(req);
  if(u){req.currentUser=u;return next();}
  if(!req.session?.userId&&req.session?.admin===true)return next();
  return res.status(401).json({ok:false,message:"Non autorisé."});
}
function requireEventAction(action){return async(req,res,next)=>{
  const u=await sessionUser(req);
  if(u?.role==="ADMIN"){req.currentUser=u;return next();}
  if(!req.session?.userId&&req.session?.admin===true)return next();
  if(!u)return res.status(401).json({ok:false,message:"Non autorisé."});
  const p=permissionsObject(u);
  const defaults=u.role==="INTERVENANT"?["view","navigate","share","start","complete"]:u.role==="VIEWER"?["view"]:[];
  const actions=Array.isArray(p.eventActions)?p.eventActions:defaults;
  if(!actions.includes(action))return res.status(403).json({ok:false,message:"Cette action n'est pas autorisée pour votre compte."});
  req.currentUser=u;return next();
};}
function moduleViewOnly(moduleId){
  return async(req,res,next)=>{
    const u=await sessionUser(req);
    if(!u)return res.status(401).json({ok:false,message:"Non autorisé."});
    if(!canViewModule(u,moduleId))return res.status(403).json({ok:false,message:"Ce module n'est pas autorisé pour ce compte."});
    req.currentUser=u; next();
  };
}
function anyModuleViewOnly(moduleIds){
  return async(req,res,next)=>{
    const u=await sessionUser(req);
    if(!u)return res.status(401).json({ok:false,message:"Non autorisé."});
    if(u.role!=="ADMIN"&&!moduleIds.some(id=>canViewModule(u,id)))return res.status(403).json({ok:false,message:"Accès non autorisé."});
    req.currentUser=u; next();
  };
}

const DEFAULT_ASSISTANCE_SETTINGS = {
  copilotUrl: "https://copilot.fotoshare.co/events",
  remoteDesktopUrl: "https://remotedesktop.google.com/access/",
  lumaboothDashboardUrl: "https://dash.lumabooth.com/admin",
  googleCalendarUrl: "https://calendar.google.com/",
  googleDriveUrl: "https://drive.google.com/",
  supportPhone: "",
  whatsappUrl: "",
  googleReviewUrl: ""
};

async function ensureV82Settings(){
  for(const [key,value] of Object.entries(DEFAULT_ASSISTANCE_SETTINGS)){
    await prisma.appSetting.upsert({where:{key},update:{},create:{key,value}});
  }
}

function appBaseUrl(req) {
  return (process.env.APP_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
}

function eventRangeFromInput(date, time, pickupDate, pickupTime) {
  const start = new Date(`${date}T${time || "00:00"}:00`);
  const endDate = pickupDate || date;
  let end = new Date(`${endDate}T${pickupTime || "23:59"}:00`);
  if (end < start) end = new Date(new Date(end).setDate(end.getDate() + 1));
  return { start, end };
}

function eventRangeFromRecord(event) {
  const date = event.eventDate.toISOString().slice(0,10);
  const pickupDate = event.pickupDate
    ? event.pickupDate.toISOString().slice(0,10)
    : date;
  return eventRangeFromInput(
    date,
    event.installTime || "00:00",
    pickupDate,
    event.pickupTime || "23:59"
  );
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function defaultPreparation(materialNames = []) {
  const names = Array.isArray(materialNames) ? materialNames : [];
  return {
    materialChecked: false,
    paperChecked: false,
    cablesChecked: false,
    powerChecked: false,
    qrChecked: false,
    contractChecked: false,
    frameChecked: false,
    loaded: false,
    departed: false,
    returned: false,
    selectedMaterials: names
  };
}

const PHOTOBOOTHS = [
  "Borne Photobooth Miroir Lola",
  "Borne Photobooth Nina",
  "Borne Photobooth Gabin"
];

function plannedPrints(materialNames, customPrintCount = 0){
  for(const name of materialNames || []){
    if(name === "Forfait impressions personnalisé"){
      return Math.max(Number(customPrintCount || 0), 0);
    }

    const m = String(name).match(
      /Forfait\s+(\d+)\s+impressions/i
    );

    if(m){
      return Number(m[1]);
    }
  }

  return 0;
}

function requestedQuantityForMaterial(name, sceneJets){
  if(name === "Location Kit Jet d'Ã©tincelle" && sceneJets?.enabled){
    return Math.min(Math.max(Number(sceneJets.boxes || 1),1),12);
  }
  return 1;
}

async function findMaterialConflicts({
  date,time,pickupDate,pickupTime,materialNames,sceneJets,excludeEventId=null
}){
  const selected=[...new Set(
  (Array.isArray(materialNames)?materialNames:[])
    .map(String)
    .filter(Boolean)
)];
  if(!date || selected.length===0) return [];

  const requestedRange=eventRangeFromInput(date,time,pickupDate,pickupTime);

  const materials=await prisma.material.findMany({
    where:{name:{in:selected},active:true}
  });

  const blocking=materials.filter(m=>m.blocksPlanning);
  if(blocking.length===0) return [];

  const allUnavailabilities = await prisma.materialUnavailability.findMany({
  where:{
    materialId:{
      in:blocking.map(m=>m.id)
    },
    status:"ACTIVE"
  },
  orderBy:{
    startAt:"asc"
  }
});

const unavailabilities = allUnavailabilities.filter(u =>
  rangesOverlap(
    requestedRange.start,
    requestedRange.end,
    new Date(u.startAt),
    new Date(u.endAt)
  )
);

  const candidates=await prisma.event.findMany({
    where:{
      archived:false,
      bookingStatus:{in:["OPTION","CONFIRMED"]},
      ...(excludeEventId?{id:{not:excludeEventId}}:{})
    },
    include:{materials:{include:{material:true}}}
  });

  const conflicts=[];

  for(const material of blocking){
    const requestedQty=requestedQuantityForMaterial(material.name,sceneJets);
    let alreadyReserved=0;
    const reservations=[];
    const materialUnavailabilities = unavailabilities.filter(
  u=>u.materialId===material.id
);

    for(const event of candidates){
      const range=eventRangeFromRecord(event);
      if(!rangesOverlap(requestedRange.start,requestedRange.end,range.start,range.end)) continue;

      const link=event.materials.find(x=>x.materialId===material.id || x.material?.name===material.name);
      if(!link) continue;

      let qty=Number(link.quantity||1);
      if(material.name==="Location Kit Jet d'Ã©tincelle" && event.sceneJets?.enabled){
        qty=Math.min(Math.max(Number(event.sceneJets.boxes||1),1),12);
      }

      alreadyReserved+=qty;
      reservations.push({
        eventId:event.id,
        eventName:event.name,
        quantity:qty,
        date:event.eventDate.toISOString().slice(0,10),
        pickupDate:event.pickupDate?.toISOString().slice(0,10)||null
      });
    }
if(materialUnavailabilities.length){
  conflicts.push({
    material: material.name,
    capacity: material.capacity,
    alreadyReserved,
    requested: requestedQty,
    available: 0,
    unavailable: true,
    reservations,
    unavailabilities: materialUnavailabilities.map(u => ({
      id: u.id,
      startAt: u.startAt,
      endAt: u.endAt,
      reason: u.reason,
      notes: String(u.notes||"").startsWith("FAMILY_PLANNING|") ? "CONFIDENTIEL" : u.notes,
      confidential: String(u.notes||"").startsWith("FAMILY_PLANNING|"),
      status: u.status
    }))
  });

  continue;
}
    if(alreadyReserved + requestedQty > material.capacity){
      conflicts.push({
        material:material.name,
        capacity:material.capacity,
        alreadyReserved,
        requested:requestedQty,
        available:Math.max(material.capacity-alreadyReserved,0),
        reservations
      });
    }
  }

  return conflicts;
}

async function choosePrinterForEvent({
  date,time,pickupDate,pickupTime,planned,excludeEventId=null,currentPrinterId=null
}){
  if(!planned) return {printer:null,warning:null};

  const requestedRange=eventRangeFromInput(date,time,pickupDate,pickupTime);
  const printers=await prisma.printer.findMany({
    where:{active:true},
    orderBy:[{remainingPrints:"desc"},{name:"asc"}]
  });

  const overlapping=await prisma.event.findMany({
    where:{
      archived:false,
      bookingStatus:{in:["OPTION","CONFIRMED"]},
      printerId:{not:null},
      ...(excludeEventId?{id:{not:excludeEventId}}:{})
    }
  });

  const occupied=new Set();
  for(const e of overlapping){
    const range=eventRangeFromRecord(e);
    if(rangesOverlap(requestedRange.start,requestedRange.end,range.start,range.end) && e.printerId){
      occupied.add(e.printerId);
    }
  }

  if(currentPrinterId && !occupied.has(currentPrinterId)){
    const current=printers.find(p=>p.id===currentPrinterId);
    if(current){
      return {
        printer:current,
        warning:current.remainingPrints < planned
          ? `PrÃ©voir un remplacement de papier : ${current.remainingPrints} tirages restants pour ${planned} prÃ©vus.`
          : null
      };
    }
  }

  const free=printers.filter(p=>!occupied.has(p.id));
  if(!free.length){
    return {printer:null,warning:"Aucune imprimante n'est disponible sur cette pÃ©riode."};
  }

  const enough=free.filter(p=>p.remainingPrints>=planned).sort((a,b)=>a.remainingPrints-b.remainingPrints);
  const printer=enough[0] || free[0];

  return {
    printer,
    warning:printer.remainingPrints < planned
      ? `Papier insuffisant actuellement dans ${printer.name} : ${printer.remainingPrints} restants pour ${planned} prÃ©vus.`
      : null
  };
}



// ======================================================
// LUMABOOTH - LIEN UNIQUE PAR EVENEMENT
// ======================================================
app.get("/api/lumabooth/event/:token", async (req,res)=>{
  try{
    const event = await prisma.event.findFirst({
      where:{organizerToken:req.params.token}
    });

    if(!event){
      console.warn("LUMABOOTH EVENT : token inconnu", req.params.token);
      return res
        .status(404)
        .type("text/plain")
        .send("LP28 LumaBooth event not found");
    }

    const eventType = String(req.query.event_type || "").trim();
    const sourcePath = String(req.query.param1 || "").trim();
    const fotoshareUrl = String(req.query.param2 || "").trim();
    const kind = String(req.query.param3 || "").trim().toLowerCase();
    const album = String(req.query.param4 || "").trim();

    console.log("================ LUMABOOTH EVENT ================");
    console.log(JSON.stringify({
      receivedAt:new Date().toISOString(),
      eventId:event.id,
      eventName:event.name,
      eventType,
      sourcePath,
      fotoshareUrl,
      kind,
      album
    },null,2));
    console.log("==================================================");

    // Les événements de session sont seulement journalisés.
    if(eventType !== "file_upload"){
      return res
        .status(200)
        .type("text/plain")
        .send("LP28 LumaBooth event OK");
    }

    if(kind !== "original" && kind !== "print" && kind !== "animated"){
      console.log("LUMABOOTH EVENT : type de média ignoré =", kind);
      return res
        .status(200)
        .type("text/plain")
        .send("LP28 LumaBooth media ignored");
    }

    if(!fotoshareUrl){
      console.warn("LUMABOOTH EVENT : URL FotoShare absente.");
      return res
        .status(200)
        .type("text/plain")
        .send("LP28 LumaBooth missing FotoShare URL");
    }

    if(/license-error/i.test(fotoshareUrl)){
      console.warn(
        "LUMABOOTH EVENT : FotoShare en mode démo/licence, import impossible :",
        fotoshareUrl
      );
      return res
        .status(200)
        .type("text/plain")
        .send("LP28 LumaBooth FotoShare license error");
    }

    const originalName =
      path.basename(sourcePath.replace(/\\/g,"/")) ||
      `lumabooth-${Date.now()}.jpg`;

    const uploadedBy =
      kind === "print"
        ? "LUMABOOTH_PRINT"
        : kind === "animated"
          ? "LUMABOOTH_ANIMATED"
          : "LUMABOOTH_ORIGINAL";

    const existing = await prisma.memoryMedia.findFirst({
      where:{
        eventId:event.id,
        originalName,
        uploadedBy,
        deletedAt:null
      }
    });

    if(existing){
      console.log(
        "LUMABOOTH EVENT : doublon ignoré :",
        originalName,
        uploadedBy
      );

      return res
        .status(200)
        .type("text/plain")
        .send("LP28 LumaBooth duplicate ignored");
    }

    const fotoshareResponse = await fetch(fotoshareUrl,{
      redirect:"follow",
      headers:{
        "User-Agent":"LP28-LumaBooth/1.0",
        "Accept":"text/html,image/*,*/*;q=0.8"
      }
    });

    if(!fotoshareResponse.ok){
      console.warn(
        "LUMABOOTH EVENT : ouverture FotoShare impossible :",
        fotoshareResponse.status,
        fotoshareUrl
      );

      return res
        .status(200)
        .type("text/plain")
        .send(`LP28 FotoShare HTTP ${fotoshareResponse.status}`);
    }

    let imageResponse = fotoshareResponse;
    let mimeType =
      String(fotoshareResponse.headers.get("content-type") || "")
        .split(";")[0]
        .trim()
        .toLowerCase();

    // /i/<hash> est une page HTML FotoShare. On récupère l'image CDN
    // publiée dans og:image. C'est le fichier réellement affiché par FotoShare.
    if(mimeType === "text/html" || mimeType === "application/xhtml+xml"){
      const html = await fotoshareResponse.text();

      const ogMatch =
        html.match(
          /<meta\s+[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i
        ) ||
        html.match(
          /<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["'][^>]*>/i
        );

      let cdnUrl = ogMatch?.[1] || "";

      if(cdnUrl){
        cdnUrl = cdnUrl
          .replace(/&amp;/g,"&")
          .replace(/&#x2F;/gi,"/")
          .trim();
      }

      if(!cdnUrl || !/^https:\/\//i.test(cdnUrl)){
        console.warn(
          "LUMABOOTH EVENT : og:image FotoShare introuvable :",
          fotoshareUrl
        );

        return res
          .status(200)
          .type("text/plain")
          .send("LP28 FotoShare og:image not found");
      }

      console.log("LUMABOOTH EVENT : image CDN =", cdnUrl);

      imageResponse = await fetch(cdnUrl,{
        redirect:"follow",
        headers:{
          "User-Agent":"LP28-LumaBooth/1.0",
          "Accept":"image/*,*/*;q=0.8",
          "Referer":fotoshareUrl
        }
      });

      if(!imageResponse.ok){
        console.warn(
          "LUMABOOTH EVENT : téléchargement CDN impossible :",
          imageResponse.status,
          cdnUrl
        );

        return res
          .status(200)
          .type("text/plain")
          .send(`LP28 FotoShare CDN HTTP ${imageResponse.status}`);
      }

      mimeType =
        String(imageResponse.headers.get("content-type") || "")
          .split(";")[0]
          .trim()
          .toLowerCase();
    }

    if(!mimeType.startsWith("image/")){
      console.warn(
        "LUMABOOTH EVENT : la ressource finale n'est pas une image :",
        mimeType || "(content-type absent)",
        imageResponse.url
      );

      return res
        .status(200)
        .type("text/plain")
        .send("LP28 FotoShare final response is not an image");
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if(!buffer.length || buffer.length > 25*1024*1024){
      console.warn(
        "LUMABOOTH EVENT : taille image invalide :",
        buffer.length
      );

      return res
        .status(200)
        .type("text/plain")
        .send("LP28 invalid image size");
    }

    const extByMime = {
      "image/jpeg":".jpg",
      "image/png":".png",
      "image/webp":".webp",
      "image/gif":".gif",
      "image/heic":".heic",
      "image/heif":".heif"
    };

    const ext =
      extByMime[mimeType] ||
      path.extname(originalName).toLowerCase() ||
      ".jpg";

    const fileName =
      `${Date.now()}-${crypto.randomBytes(10).toString("hex")}${ext}`;

    // Google Drive est le stockage définitif des imports LumaBooth.
    // Le fichier temporaire n'existe que le temps de l'envoi vers Drive.
    const tempPath =
      path.join(MEMORIES_DIR,fileName);

    fs.writeFileSync(tempPath,buffer);

    try{
      const driveFile =
        await googleService.uploadMemoryToDrive(
          req,
          event,
          {
            path:tempPath,
            filename:fileName,
            originalname:originalName,
            mimetype:mimeType,
            size:buffer.length
          }
        );

      const media = await prisma.memoryMedia.create({
        data:{
          eventId:event.id,
          fileName,
          originalName,
          mimeType,
          sizeBytes:buffer.length,
          mediaType:"PHOTO",
          status:"VISIBLE",
          uploadedBy,
          driveFileId:driveFile.id,
          driveUrl:
            driveFile.webViewLink ||
            driveFile.webContentLink ||
            null,
          storageType:"DRIVE"
        }
      });

      console.log(
        `LUMABOOTH IMPORT DRIVE OK : ${event.name} / ${kind} / ${media.id} / ${driveFile.id}`
      );

    }finally{
      try{
        if(fs.existsSync(tempPath)){
          fs.unlinkSync(tempPath);
        }
      }catch(err){
        console.warn(
          "LUMABOOTH EVENT : suppression temporaire impossible :",
          err.message
        );
      }
    }

    return res
      .status(200)
      .type("text/plain")
      .send("LP28 LumaBooth import OK");

  }catch(err){
    console.error("LUMABOOTH EVENT ERROR :",err);

    return res
      .status(500)
      .type("text/plain")
      .send("LP28 LumaBooth event ERROR");
  }
});


// ======================================================
// LP28 BOOTH AGENT API V1
// ======================================================
// Authentification : Authorization: Bearer <BOOTH_AGENT_API_KEY>
// Le secret doit être défini dans Render et dans chaque Booth Agent.
const boothAgentUpload = multer({
  storage: memoriesStorage,
  limits:{fileSize:25*1024*1024,files:1},
  fileFilter:(req,file,cb)=>{
    const ok=["image/jpeg","image/png","image/webp","image/heic","image/heif","image/gif"].includes(file.mimetype);
    cb(ok?null:new Error("Format image non autorisé."),ok);
  }
});

function boothAgentOnly(req,res,next){
  const expected=String(process.env.BOOTH_AGENT_API_KEY||"").trim();
  const auth=String(req.get("authorization")||"");
  const supplied=auth.replace(/^Bearer\s+/i,"").trim();

  if(!expected){
    return res.status(503).json({ok:false,message:"Booth Agent API non configurée."});
  }

  const a=Buffer.from(supplied);
  const b=Buffer.from(expected);
  if(a.length!==b.length || !crypto.timingSafeEqual(a,b)){
    return res.status(401).json({ok:false,message:"Clé Booth Agent invalide."});
  }
  next();
}

function boothAgentDedupKey(eventId,sha256){
  return `boothAgentFile:${eventId}:${sha256}`;
}

app.get("/api/booth-agent/ping",boothAgentOnly,(req,res)=>{
  res.json({ok:true,service:"LP28 Booth Agent API",version:1});
});

app.get("/api/booth-agent/events",boothAgentOnly,async(req,res)=>{
  const events=await prisma.event.findMany({
    where:{archived:false},
    orderBy:{eventDate:"asc"},
    select:{id:true,name:true,eventDate:true,address:true,portalEnabled:true}
  });
  res.json({ok:true,events});
});

app.post(
  "/api/booth-agent/upload",
  boothAgentOnly,
  boothAgentUpload.single("file"),
  async(req,res)=>{
    const f=req.file;
    if(!f)return res.status(400).json({ok:false,message:"Fichier manquant."});

    try{
      const eventId=String(req.body?.eventId||"").trim();
      const kind=String(req.body?.kind||"").trim().toLowerCase();
      const declaredHash=String(req.body?.sha256||"").trim().toLowerCase();
      const boothName=String(req.body?.boothName||"").trim().slice(0,100);

      if(!eventId || !["original","print","animated"].includes(kind)){
        return res.status(400).json({ok:false,message:"eventId ou kind invalide."});
      }

      const event=await prisma.event.findUnique({where:{id:eventId}});
      if(!event)return res.status(404).json({ok:false,message:"Événement introuvable."});

      const actualHash=crypto.createHash("sha256").update(fs.readFileSync(f.path)).digest("hex");
      if(declaredHash && declaredHash!==actualHash){
        return res.status(400).json({ok:false,message:"Empreinte SHA-256 incorrecte."});
      }

      const dedupKey=boothAgentDedupKey(event.id,actualHash);
      const existing=await prisma.appSetting.findUnique({where:{key:dedupKey}});
      if(existing){
        return res.json({ok:true,duplicate:true,sha256:actualHash});
      }

      const driveFile=await googleService.uploadMemoryToDrive(req,event,f);
      let media;
      try{
        media=await prisma.memoryMedia.create({
          data:{
            eventId:event.id,
            fileName:f.filename,
            originalName:f.originalname,
            mimeType:f.mimetype,
            sizeBytes:f.size,
            mediaType:"PHOTO",
            status:"VISIBLE",
            uploadedBy:
              kind==="original"
                ? "LUMABOOTH_ORIGINAL"
                : kind==="animated"
                  ? "LUMABOOTH_ANIMATED"
                  : "LUMABOOTH_PRINT",
            driveFileId:driveFile.id,
            driveUrl:driveFile.webViewLink||driveFile.webContentLink||null,
            storageType:"DRIVE"
          }
        });

        await prisma.appSetting.create({
          data:{key:dedupKey,value:JSON.stringify({mediaId:media.id,boothName,kind,at:new Date().toISOString()})}
        });
      }catch(err){
        try{await googleService.deleteMemoryFromDrive(req,driveFile.id)}catch{}
        throw err;
      }

      console.log(`BOOTH AGENT IMPORT OK : ${event.name} / ${boothName||"borne"} / ${kind} / ${media.id}`);
      return res.json({ok:true,duplicate:false,mediaId:media.id,sha256:actualHash});
    }catch(err){
      console.error("BOOTH AGENT UPLOAD ERROR :",err);
      return res.status(500).json({ok:false,message:"Import Booth Agent impossible."});
    }finally{
      if(f?.path)fs.unlink(f.path,()=>{});
    }
  }
);


// ======================================================
// LP28 BOOTH SUPERVISION V2
// ======================================================
function boothStatusKey(boothName){
  const safe=String(boothName||"").trim().toUpperCase().replace(/[^A-Z0-9_-]+/g,"_").slice(0,50);
  return `boothStatus:${safe}`;
}

app.post("/api/booth-agent/heartbeat",boothAgentOnly,async(req,res)=>{
  try{
    const boothName=String(req.body?.boothName||"").trim().slice(0,100);
    if(!boothName)return res.status(400).json({ok:false,message:"Nom de borne manquant."});

    const p=req.body?.printer && typeof req.body.printer==="object" ? req.body.printer : null;
    const payload={
      boothName,
      agentVersion:String(req.body?.agentVersion||"").slice(0,40),
      eventId:String(req.body?.eventId||"").trim()||null,
      eventName:String(req.body?.eventName||"").trim().slice(0,200)||null,
      lumaActive:Boolean(req.body?.lumaActive),
      syncStatus:String(req.body?.syncStatus||"").slice(0,100),
      counts:req.body?.counts||null,
      printer:p?{
        model:String(p.model||"").slice(0,100),
        serialNumber:String(p.serialNumber||"").slice(0,150),
        portName:String(p.portName||"").slice(0,50),
        queueName:String(p.queueName||"").slice(0,150),
        pnpStatus:String(p.pnpStatus||"").slice(0,50),
        workOffline:p.workOffline===null||typeof p.workOffline==="undefined"?null:Boolean(p.workOffline),
        present:Boolean(p.present),
        mediaFormat:String(p.mediaFormat||"").slice(0,50)||null,
        mediaRemaining:Number.isFinite(Number(p.mediaRemaining))?Number(p.mediaRemaining):null,
        mediaCapacity:Number.isFinite(Number(p.mediaCapacity))?Number(p.mediaCapacity):null,
        mediaPercent:Number.isFinite(Number(p.mediaPercent))?Math.max(0,Math.min(100,Number(p.mediaPercent))):null,
        mediaSource:String(p.mediaSource||"").slice(0,50)||null,
        mediaReadAt:p.mediaReadAt?String(p.mediaReadAt).slice(0,80):null
      }:null,
      lastSeen:new Date().toISOString()
    };
    await prisma.appSetting.upsert({
      where:{key:boothStatusKey(boothName)},
      update:{value:JSON.stringify(payload)},
      create:{key:boothStatusKey(boothName),value:JSON.stringify(payload)}
    });
    res.json({ok:true,lastSeen:payload.lastSeen});
  }catch(err){
    console.error("BOOTH HEARTBEAT ERROR :",err);
    res.status(500).json({ok:false,message:"Supervision borne impossible."});
  }
});

app.get("/api/admin/booths",moduleViewOnly("booths"),async(req,res)=>{
  try{
    const rows=await prisma.appSetting.findMany({where:{key:{startsWith:"boothStatus:"}}});
    const now=Date.now();
    const byName={};
    for(const row of rows){
      try{
        const s=JSON.parse(row.value||"{}");
        const ageMs=s.lastSeen ? now-new Date(s.lastSeen).getTime() : Number.MAX_SAFE_INTEGER;
        s.online=ageMs<=60000;
        s.ageSeconds=Math.max(0,Math.round(ageMs/1000));
        if(s.printer){
          const mediaTime=s.printer.mediaReadAt?new Date(s.printer.mediaReadAt).getTime():NaN;
          if(Number.isFinite(mediaTime)){
            const mediaAgeMs=Math.max(0,now-mediaTime);
            s.printer.mediaAgeSeconds=Math.round(mediaAgeMs/1000);
            s.printer.mediaFresh=mediaAgeMs<=180000;
          }else{
            s.printer.mediaAgeSeconds=null;
            s.printer.mediaFresh=false;
          }
        }
        byName[String(s.boothName||"").trim().toUpperCase()]=s;
      }catch{}
    }
    const configured=["NINA","LOLA","GABIN"].map(name=>byName[name]||{
      boothName:name,online:false,lastSeen:null,eventId:null,eventName:null,lumaActive:false,
      syncStatus:"Aucune communication",counts:null,printer:null,ageSeconds:null
    });
    const extras=Object.values(byName).filter(s=>!["NINA","LOLA","GABIN"].includes(String(s.boothName||"").toUpperCase()));
    res.json({ok:true,booths:[...configured,...extras]});
  }catch(err){
    console.error("ADMIN BOOTHS ERROR :",err);
    res.status(500).json({ok:false,message:"Lecture des bornes impossible."});
  }
});

// ======================================================
// LUMABOOTH / FOTOSHARE - MODE TEST WEBHOOK
// ======================================================
// URL à renseigner dans LumaBooth > Déclencheurs > URL :
// https://location-photobooth-28-suite.onrender.com/api/lumabooth/test
//
// Cette route observe uniquement ce que LumaBooth envoie.
// Elle n'importe encore aucune photo dans LP28.
app.get("/api/lumabooth/test", async (req,res)=>{
  try{
    const payload={
      receivedAt:new Date().toISOString(),
      method:req.method,
      ip:req.ip,
      query:req.query,
      userAgent:req.get("user-agent") || null
    };

    console.log("================ LUMABOOTH TEST ================");
    console.log(JSON.stringify(payload,null,2));
    console.log("=================================================");

    res
      .status(200)
      .type("text/plain")
      .send("LP28 LumaBooth test OK");

  }catch(err){
    console.error("Erreur webhook LumaBooth test :",err);

    res
      .status(500)
      .type("text/plain")
      .send("LP28 LumaBooth test ERROR");
  }
});

app.post("/api/lumabooth/test", async (req,res)=>{
  try{
    const payload={
      receivedAt:new Date().toISOString(),
      method:req.method,
      ip:req.ip,
      query:req.query,
      body:req.body,
      contentType:req.get("content-type") || null,
      userAgent:req.get("user-agent") || null
    };

    console.log("================ LUMABOOTH TEST ================");
    console.log(JSON.stringify(payload,null,2));
    console.log("=================================================");

    res.json({
      ok:true,
      message:"LP28 LumaBooth test OK"
    });

  }catch(err){
    console.error("Erreur webhook LumaBooth test :",err);

    res.status(500).json({
      ok:false,
      message:"LP28 LumaBooth test ERROR"
    });
  }
});

app.get("/api/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, app: "Location Photobooth 28 Suite", version: "8.2.1", database: "ok" });
  } catch {
    res.status(500).json({ ok: false, database: "error" });
  }
});

app.get("/api/session", async (req,res)=>{
  let user=await sessionUser(req);
  if(!user&&req.session?.userId){
    delete req.session.userId;delete req.session.role;req.session.admin=false;
  }
  if(!user){user=await trustedUserFromRequest(req);if(user){await setAuthenticatedSession(req,user);await new Promise(resolve=>req.session.save(()=>resolve()));}}
  res.json({authenticated:Boolean(user||(!req.session?.userId&&req.session?.admin)),user:user?safeUser(user):null,legacy:Boolean(!user&&!req.session?.userId&&req.session?.admin)});
});

app.post("/api/login", async (req,res)=>{
  try{
    const login=String(req.body?.login||req.body?.email||"").trim(); const password=String(req.body?.password||"");
    const email=normalizeEmail(login), username=normalizeUsername(login), phone=normalizePhone(login);
    let user=await prisma.user.findFirst({where:{OR:[...(email?[{email}]:[]),...(username?[{username}]:[]),...(phone?[{phone}]:[])]}});
    // Transition douce : le premier login avec les identifiants Render crée Johan en base.
    if(!user && email===ADMIN_EMAIL && password===ADMIN_PASSWORD){
      user=await prisma.user.create({data:{email:ADMIN_EMAIL,username:"johan",name:"Johan",role:"ADMIN",active:true,passwordHash:hashPassword(password)}});
    }
    if(!user||!verifyPassword(password,user.passwordHash))return res.status(401).json({ok:false,message:"Identifiants incorrects."});
    if(!user.active||accountStatus(user)==="BLOCKED")return res.status(403).json({ok:false,message:"Ce compte est actuellement bloqué. Contacte l'administrateur LP28."});
    if(accountStatus(user)==="REVOKED")return res.status(403).json({ok:false,message:"L'accès de ce compte a été révoqué par l'administrateur LP28."});
    if(user.totpEnabled){
      const trusted=await trustedUserFromRequest(req);
      if(!trusted||trusted.id!==user.id){ req.session.pending2faUserId=user.id; return req.session.save(()=>res.json({ok:true,requires2fa:true,user:{name:user.name}})); }
    }
    await setAuthenticatedSession(req,user); await prisma.user.update({where:{id:user.id},data:{lastLoginAt:new Date()}});
    req.session.save(err=>err?res.status(500).json({ok:false,message:"Impossible d'enregistrer la session."}):res.json({ok:true,authenticated:true,user:safeUser(user)}));
  }catch(err){console.error("LOGIN ERROR",err);res.status(500).json({ok:false,message:"Connexion impossible."});}
});

app.post("/api/login/2fa",async(req,res)=>{
  const userId=req.session?.pending2faUserId; if(!userId)return res.status(400).json({ok:false,message:"Connexion 2FA expirée."});
  const user=await prisma.user.findUnique({where:{id:userId}}); if(!user||!user.totpEnabled||!user.active||accountStatus(user)!=="ACTIVE")return res.status(400).json({ok:false,message:"2FA indisponible pour ce compte."});
  let valid=verifyTotp(user.totpSecret,req.body?.code); let recovery=false;
  if(!valid){ const code=String(req.body?.code||"").trim().toUpperCase(); const hashes=Array.isArray(user.recoveryCodes)?user.recoveryCodes:[]; const h=sha256(code); if(hashes.includes(h)){valid=true;recovery=true;await prisma.user.update({where:{id:user.id},data:{recoveryCodes:hashes.filter(x=>x!==h)}});} }
  if(!valid)return res.status(401).json({ok:false,message:"Code de sécurité incorrect."});
  delete req.session.pending2faUserId; await setAuthenticatedSession(req,user); await prisma.user.update({where:{id:user.id},data:{lastLoginAt:new Date()}});
  if(req.body?.trustDevice){
    const label=String(req.body?.deviceLabel||"").trim().slice(0,80);
    if(!label)return res.status(400).json({ok:false,message:"Donne un nom à cet appareil (ex. PC Johan ou Samsung S26 Ultra)."});
    const raw=randomToken();
    await prisma.trustedDevice.create({data:{userId:user.id,tokenHash:sha256(raw),label,expiresAt:new Date(Date.now()+TRUST_DAYS*86400000)}});
    res.cookie(TRUST_COOKIE,raw,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:TRUST_DAYS*86400000});
  }
  req.session.save(()=>res.json({ok:true,authenticated:true,user:safeUser(user),recoveryCodeUsed:recovery}));
});

app.post("/api/logout",async(req,res)=>{
  const raw=parseCookies(req)[TRUST_COOKIE];
  if(raw)await prisma.trustedDevice.deleteMany({where:{tokenHash:sha256(raw)}}).catch(()=>{});
  res.clearCookie(TRUST_COOKIE,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production"});
  req.session.destroy(()=>res.json({ok:true}));
});

app.get("/api/admin/users",adminOnly,async(req,res)=>{const users=await prisma.user.findMany({orderBy:{createdAt:"asc"}});res.json({ok:true,users:users.map(safeUser)});});
app.post("/api/admin/invitations",adminOnly,async(req,res)=>{
  const creator=await prisma.user.findUnique({where:{id:req.session.userId}}); if(!creator)return res.status(409).json({ok:false,message:"Reconnecte-toi avec le compte administrateur Johan avant d'envoyer une invitation."});
  const firstName=normalizePersonName(req.body?.firstName),lastName=normalizePersonName(req.body?.lastName);
  if(!firstName||!lastName)return res.status(400).json({ok:false,message:"Le prénom et le nom sont obligatoires."});
  const role=["ADMIN","INTERVENANT","VIEWER"].includes(req.body?.role)?req.body.role:"VIEWER";
  let collaboratorId=role==="INTERVENANT"?String(req.body?.collaboratorId||"").trim()||null:null;
  if(collaboratorId){const exists=await prisma.collaborator.findUnique({where:{id:collaboratorId}});if(!exists)return res.status(400).json({ok:false,message:"Intervenant introuvable."});}
  const raw=randomToken(); const expiresAt=new Date(Date.now()+10*60*1000);
  const defaultAllowed=role==="INTERVENANT"?["dashboard","events","planning","materialPlanning"]:role==="VIEWER"?["dashboard","planning"]:null;
  const incomingPermissions=req.body?.permissions&&typeof req.body.permissions==="object"?req.body.permissions:{};
  const invitationPermissions=role==="ADMIN"?incomingPermissions:{...incomingPermissions,allowedModules:Array.isArray(incomingPermissions.allowedModules)?incomingPermissions.allowedModules:defaultAllowed,accountStatus:"ACTIVE"};
  const inv=await prisma.userInvitation.create({data:{tokenHash:sha256(raw),name:`${firstName} ${lastName}`,firstName,lastName,email:normalizeEmail(req.body?.email),phone:normalizePhone(req.body?.phone),collaboratorId,role,permissions:invitationPermissions,expiresAt,createdById:creator.id}});
  const url=`${appBaseUrl(req)}/inscription/${raw}`; res.json({ok:true,url,expiresAt:inv.expiresAt});
});
app.get("/api/register/:token",async(req,res)=>{const inv=await prisma.userInvitation.findUnique({where:{tokenHash:sha256(req.params.token)}});if(!inv||inv.usedAt||inv.expiresAt<=new Date())return res.status(410).json({ok:false,message:"Ce lien d'inscription est expiré ou déjà utilisé."});res.json({ok:true,invitation:{name:inv.name,firstName:inv.firstName,lastName:inv.lastName,email:inv.email,phone:inv.phone,role:inv.role,expiresAt:inv.expiresAt}});});
app.post("/api/register/:token",async(req,res)=>{
  const inv=await prisma.userInvitation.findUnique({where:{tokenHash:sha256(req.params.token)}}); if(!inv||inv.usedAt||inv.expiresAt<=new Date())return res.status(410).json({ok:false,message:"Ce lien d'inscription est expiré ou déjà utilisé."});
  const firstName=normalizePersonName(req.body?.firstName||inv.firstName),lastName=normalizePersonName(req.body?.lastName||inv.lastName);
  const username=normalizeUsername(req.body?.username),email=normalizeEmail(req.body?.email||inv.email),phone=normalizePhone(req.body?.phone||inv.phone),password=String(req.body?.password||"");
  if(!firstName||!lastName)return res.status(400).json({ok:false,message:"Le prénom et le nom sont obligatoires."});
  if(!username||username.length<3)return res.status(400).json({ok:false,message:"L'identifiant doit contenir au minimum 3 caractères."});
  const passwordError=passwordPolicyError(password);if(passwordError)return res.status(400).json({ok:false,message:passwordError});
  try{
    const user=await prisma.$transaction(async tx=>{
      let collaboratorId=inv.collaboratorId||null;
      if(inv.role==="INTERVENANT"){
        if(collaboratorId){
          await tx.collaborator.update({where:{id:collaboratorId},data:{firstName,lastName,email:email||undefined,phone:phone||undefined,active:true}});
        }else{
          const or=[];if(email)or.push({email});if(phone)or.push({phone});
          const existing=or.length?await tx.collaborator.findFirst({where:{OR:or}}):null;
          if(existing){collaboratorId=existing.id;await tx.collaborator.update({where:{id:existing.id},data:{firstName,lastName,email:email||undefined,phone:phone||undefined,active:true}});}
          else{const c=await tx.collaborator.create({data:{firstName,lastName,email,phone,active:true}});collaboratorId=c.id;}
        }
      }
      let u;
      if(inv.targetUserId){
        const target=await tx.user.findUnique({where:{id:inv.targetUserId}});const currentPermissions=permissionsObject(target);u=await tx.user.update({where:{id:inv.targetUserId},data:{passwordHash:hashPassword(password),username,email,phone,firstName,lastName,name:`${firstName} ${lastName}`,active:true,permissions:{...currentPermissions,accountStatus:"ACTIVE"}}});await tx.trustedDevice.deleteMany({where:{userId:u.id}});
      }else{
        u=await tx.user.create({data:{name:`${firstName} ${lastName}`,firstName,lastName,collaboratorId,email,phone,username,passwordHash:hashPassword(password),role:inv.role,permissions:inv.permissions||{},active:true}});
      }
      await tx.userInvitation.update({where:{id:inv.id},data:{usedAt:new Date()}});return u;
    });
    res.json({ok:true,user:safeUser(user)});
  }catch(err){console.error("REGISTER ERROR",err);res.status(409).json({ok:false,message:"Identifiant, e-mail, téléphone ou intervenant déjà associé à un autre compte."});}
});
app.patch("/api/admin/users/:id",adminOnly,async(req,res)=>{
  const data={};
  if(["ADMIN","INTERVENANT","VIEWER"].includes(req.body?.role))data.role=req.body.role;
  if(req.body?.permissions&&typeof req.body.permissions==="object")data.permissions=req.body.permissions;
  const u=await prisma.user.update({where:{id:req.params.id},data});
  res.json({ok:true,user:safeUser(u)});
});
app.patch("/api/admin/users/:id/permissions",adminOnly,async(req,res)=>{
  const target=await prisma.user.findUnique({where:{id:req.params.id}});
  if(!target)return res.status(404).json({ok:false,message:"Compte introuvable."});
  if(target.role==="ADMIN")return res.status(400).json({ok:false,message:"Les comptes administrateurs conservent l'accès complet."});
  const SAFE_MODULES=["dashboard","events","planning","materialPlanning","galleries","booths","collaborators"];
  const SAFE_EVENT_ACTIONS=["view","navigate","share","start","complete","contract","documents","edit","archive","delete","google"];
  const allowed=Array.isArray(req.body?.allowedModules)?req.body.allowedModules.filter(x=>SAFE_MODULES.includes(x)):[];
  const eventActions=Array.isArray(req.body?.eventActions)?req.body.eventActions.filter(x=>SAFE_EVENT_ACTIONS.includes(x)):[];
  if(!allowed.includes("dashboard"))allowed.unshift("dashboard");
  const p=permissionsObject(target);
  const u=await prisma.user.update({where:{id:target.id},data:{permissions:{...p,allowedModules:allowed,eventActions}}});
  res.json({ok:true,user:safeUser(u)});
});
app.patch("/api/admin/users/:id/access",adminOnly,async(req,res)=>{
  const target=await prisma.user.findUnique({where:{id:req.params.id}});
  if(!target)return res.status(404).json({ok:false,message:"Compte introuvable."});
  if(target.id===req.session.userId)return res.status(400).json({ok:false,message:"Tu ne peux pas bloquer ou révoquer ton propre compte administrateur."});
  const action=String(req.body?.action||"").toUpperCase();
  const p=permissionsObject(target);
  let active=target.active,status=accountStatus(target);
  if(action==="BLOCK"){active=false;status="BLOCKED";}
  else if(action==="UNBLOCK"){active=true;status="ACTIVE";}
  else if(action==="REVOKE"){active=false;status="REVOKED";}
  else if(action==="RESTORE"){active=true;status="ACTIVE";}
  else return res.status(400).json({ok:false,message:"Action inconnue."});
  const u=await prisma.user.update({where:{id:target.id},data:{active,permissions:{...p,accountStatus:status}}});
  if(status!=="ACTIVE")await prisma.trustedDevice.deleteMany({where:{userId:target.id}});
  res.json({ok:true,user:safeUser(u)});
});
app.post("/api/admin/users/:id/reset-password",adminOnly,async(req,res)=>{const raw=randomToken();const expiresAt=new Date(Date.now()+10*60*1000);const target=await prisma.user.findUnique({where:{id:req.params.id}});if(!target)return res.status(404).json({ok:false,message:"Compte introuvable."});const inv=await prisma.userInvitation.create({data:{tokenHash:sha256(raw),name:target.name,firstName:target.firstName,lastName:target.lastName,email:target.email,phone:target.phone,collaboratorId:target.collaboratorId,role:target.role,permissions:target.permissions||{},targetUserId:target.id,expiresAt,createdById:req.session.userId}});res.json({ok:true,url:`${appBaseUrl(req)}/inscription/${raw}`,expiresAt:inv.expiresAt,reset:true});});
app.post("/api/account/change-password",userOnly,async(req,res)=>{
  try{
    const user=await prisma.user.findUnique({where:{id:req.session.userId}});
    if(!user)return res.status(401).json({ok:false,message:"Session expirée."});
    const current=String(req.body?.currentPassword||""), next=String(req.body?.newPassword||"");
    if(!verifyPassword(current,user.passwordHash))return res.status(400).json({ok:false,message:"Le mot de passe actuel est incorrect."});
    if(next.length<8||!/[A-ZÀ-ÖØ-Ý]/.test(next)||!/[0-9]/.test(next)||!/[^A-Za-z0-9À-ÖØ-öø-ÿ]/.test(next))return res.status(400).json({ok:false,message:"Le nouveau mot de passe doit contenir au moins 8 caractères, 1 majuscule, 1 chiffre et 1 caractère spécial."});
    if(verifyPassword(next,user.passwordHash))return res.status(400).json({ok:false,message:"Choisis un mot de passe différent de l’actuel."});
    await prisma.user.update({where:{id:user.id},data:{passwordHash:hashPassword(next)}});
    await prisma.trustedDevice.deleteMany({where:{userId:user.id}});
    res.clearCookie(TRUST_COOKIE,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production"});
    res.json({ok:true,message:"Mot de passe modifié."});
  }catch(err){console.error("CHANGE PASSWORD ERROR",err);res.status(500).json({ok:false,message:"Impossible de modifier le mot de passe."});}
});
app.post("/api/account/2fa/setup",userOnly,async(req,res)=>{const user=await prisma.user.findUnique({where:{id:req.session.userId}});if(!user)return res.status(401).json({ok:false});const secret=base32Encode(crypto.randomBytes(20));req.session.pendingTotpSecret=secret;const label=encodeURIComponent(`LP28 Suite:${user.username||user.email||user.name}`);const issuer=encodeURIComponent("LP28 Suite");const uri=`otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;const qrDataUrl=await QRCode.toDataURL(uri);req.session.save(()=>res.json({ok:true,secret,qrDataUrl}));});
app.post("/api/account/2fa/enable",userOnly,async(req,res)=>{const secret=req.session.pendingTotpSecret;if(!secret||!verifyTotp(secret,req.body?.code))return res.status(400).json({ok:false,message:"Code Authenticator incorrect."});const codes=Array.from({length:8},()=>`${crypto.randomBytes(4).toString("hex").slice(0,4)}-${crypto.randomBytes(4).toString("hex").slice(0,4)}`.toUpperCase());await prisma.user.update({where:{id:req.session.userId},data:{totpEnabled:true,totpSecret:secret,recoveryCodes:codes.map(sha256)}});delete req.session.pendingTotpSecret;req.session.save(()=>res.json({ok:true,recoveryCodes:codes}));});
app.get("/api/account/trusted-devices",userOnly,async(req,res)=>{
  const devices=await prisma.trustedDevice.findMany({where:{userId:req.session.userId,expiresAt:{gt:new Date()}},include:{user:true},orderBy:{lastUsedAt:"desc"}});
  res.json({ok:true,devices:devices.map(d=>({id:d.id,label:d.label,ownerName:safeUser(d.user).displayName,expiresAt:d.expiresAt,lastUsedAt:d.lastUsedAt,createdAt:d.createdAt}))});
});
app.delete("/api/account/trusted-devices/:id",userOnly,async(req,res)=>{await prisma.trustedDevice.deleteMany({where:{id:req.params.id,userId:req.session.userId}});res.json({ok:true});});


app.get("/api/notifications",userOnly,async(req,res)=>{
 const user=req.currentUser||await sessionUser(req);const rows=await prisma.appNotification.findMany({where:notificationWhere(user),include:{reads:{where:{userId:user.id}}},orderBy:{createdAt:"desc"},take:100});
 res.json({ok:true,notifications:rows.map(n=>({id:n.id,title:n.title,message:n.message,type:n.type,source:n.source,eventId:n.eventId,createdAt:n.createdAt,read:n.reads.length>0}))});
});
app.post("/api/notifications/:id/read",userOnly,async(req,res)=>{
 const user=req.currentUser||await sessionUser(req);const n=await prisma.appNotification.findFirst({where:{id:req.params.id,...notificationWhere(user)}});if(!n)return res.status(404).json({ok:false});
 await prisma.appNotificationRead.upsert({where:{notificationId_userId:{notificationId:n.id,userId:user.id}},update:{readAt:new Date()},create:{notificationId:n.id,userId:user.id}});res.json({ok:true});
});
app.post("/api/notifications/read-all",userOnly,async(req,res)=>{
 const user=req.currentUser||await sessionUser(req);const rows=await prisma.appNotification.findMany({where:notificationWhere(user),select:{id:true}});const now=new Date();
 await Promise.all(rows.map(n=>prisma.appNotificationRead.upsert({where:{notificationId_userId:{notificationId:n.id,userId:user.id}},update:{readAt:now,dismissedAt:null},create:{notificationId:n.id,userId:user.id,readAt:now}})));
 res.json({ok:true,count:rows.length});
});
app.delete("/api/notifications/:id",userOnly,async(req,res)=>{
 const user=req.currentUser||await sessionUser(req);const n=await prisma.appNotification.findFirst({where:{id:req.params.id,...notificationWhere(user)}});if(!n)return res.status(404).json({ok:false,message:"Notification introuvable."});
 await prisma.appNotificationRead.upsert({where:{notificationId_userId:{notificationId:n.id,userId:user.id}},update:{dismissedAt:new Date()},create:{notificationId:n.id,userId:user.id,dismissedAt:new Date()}});res.json({ok:true});
});
app.delete("/api/notifications",userOnly,async(req,res)=>{
 const user=req.currentUser||await sessionUser(req);const rows=await prisma.appNotification.findMany({where:notificationWhere(user),select:{id:true}});const now=new Date();
 await Promise.all(rows.map(n=>prisma.appNotificationRead.upsert({where:{notificationId_userId:{notificationId:n.id,userId:user.id}},update:{dismissedAt:now},create:{notificationId:n.id,userId:user.id,dismissedAt:now}})));
 res.json({ok:true,count:rows.length});
});
app.post("/api/push/delivery/:token/received",async(req,res)=>{
 const token=String(req.params.token||"");if(!token)return res.status(400).json({ok:false});
 const d=await prisma.pushDelivery.findUnique({where:{receiptToken:token}}).catch(()=>null);if(!d)return res.status(404).json({ok:false});
 await prisma.pushDelivery.update({where:{id:d.id},data:{status:d.openedAt?"OPENED":"RECEIVED",receivedAt:d.receivedAt||new Date()}});res.json({ok:true});
});
app.post("/api/push/delivery/:token/opened",async(req,res)=>{
 const token=String(req.params.token||"");if(!token)return res.status(400).json({ok:false});
 const d=await prisma.pushDelivery.findUnique({where:{receiptToken:token}}).catch(()=>null);if(!d)return res.status(404).json({ok:false});
 const now=new Date();await prisma.pushDelivery.update({where:{id:d.id},data:{status:"OPENED",receivedAt:d.receivedAt||now,openedAt:now}});res.json({ok:true});
});
app.get("/api/admin/push-history",adminOnly,async(req,res)=>{
 const rows=await prisma.pushDelivery.findMany({orderBy:{createdAt:"desc"},take:250});
 const userIds=[...new Set(rows.map(x=>x.userId))],notificationIds=[...new Set(rows.map(x=>x.notificationId))];
 const [users,notifications]=await Promise.all([prisma.user.findMany({where:{id:{in:userIds}},select:{id:true,firstName:true,lastName:true,name:true,email:true,role:true}}),prisma.appNotification.findMany({where:{id:{in:notificationIds}},select:{id:true,title:true,message:true,eventId:true,source:true}})]);
 const um=new Map(users.map(u=>[u.id,u])),nm=new Map(notifications.map(n=>[n.id,n]));
 res.json({ok:true,history:rows.map(d=>{const u=um.get(d.userId)||{},n=nm.get(d.notificationId)||{};return {id:d.id,notificationId:d.notificationId,title:n.title||"Notification",message:n.message||"",eventId:n.eventId||null,source:n.source||"",userId:d.userId,userName:[u.firstName,u.lastName].filter(Boolean).join(" ")||u.name||u.email||"Utilisateur",role:u.role||"",deviceLabel:d.deviceLabel||"Appareil",status:d.status,sentAt:d.sentAt,receivedAt:d.receivedAt,openedAt:d.openedAt,failedAt:d.failedAt,error:d.error,createdAt:d.createdAt};})});
});
app.post("/api/admin/notifications",adminOnly,async(req,res)=>{
 const b=req.body||{};if(!String(b.title||"").trim()||!String(b.message||"").trim())return res.status(400).json({ok:false,message:"Titre et message obligatoires."});
 const audience=["ADMIN","ALL","INTERVENANTS","VIEWERS","USER"].includes(b.audience)?b.audience:"ADMIN";if(audience==="USER"&&!b.targetUserId)return res.status(400).json({ok:false,message:"Choisis un utilisateur."});
 res.json({ok:true,notification:await addNotification({...b,audience,targetUserId:audience==="USER"?b.targetUserId:null,source:"MANUAL"})});
});
app.get("/api/push/status",userOnly,async(req,res)=>{
  const user=req.currentUser||await sessionUser(req);
  const count=await prisma.pushSubscription.count({where:{userId:user.id,active:true}}).catch(()=>0);
  res.json({ok:true,configured:pushConfigured(),publicKey:pushConfigured()?VAPID_PUBLIC_KEY:null,subscriptions:count});
});
app.post("/api/push/subscribe",userOnly,async(req,res)=>{
  if(!pushConfigured())return res.status(503).json({ok:false,message:"Push non configuré sur le serveur."});
  const user=req.currentUser||await sessionUser(req),b=req.body||{},s=b.subscription||b;
  if(!s.endpoint||!s.keys?.p256dh||!s.keys?.auth)return res.status(400).json({ok:false,message:"Abonnement Push invalide."});
  await prisma.pushSubscription.upsert({where:{endpoint:s.endpoint},update:{userId:user.id,p256dh:s.keys.p256dh,auth:s.keys.auth,deviceLabel:String(b.deviceLabel||"").slice(0,100)||null,userAgent:String(req.headers["user-agent"]||"").slice(0,500),active:true},create:{userId:user.id,endpoint:s.endpoint,p256dh:s.keys.p256dh,auth:s.keys.auth,deviceLabel:String(b.deviceLabel||"").slice(0,100)||null,userAgent:String(req.headers["user-agent"]||"").slice(0,500)}});
  res.json({ok:true});
});
app.post("/api/push/unsubscribe",userOnly,async(req,res)=>{
  const endpoint=String(req.body?.endpoint||"");if(endpoint)await prisma.pushSubscription.updateMany({where:{endpoint},data:{active:false}});
  res.json({ok:true});
});
app.get("/api/account/appearance",userOnly,async(req,res)=>{
  const user=req.currentUser||await sessionUser(req);
  if(!user)return res.status(401).json({ok:false,message:"Non autorisé."});
  const permissions=permissionsObject(user);
  const raw=permissions.uiAppearance&&typeof permissions.uiAppearance==="object"?permissions.uiAppearance:{};
  const mode=["light","dark","auto"].includes(raw.mode)?raw.mode:"dark";
  const lightStart=/^\d{2}:\d{2}$/.test(raw.lightStart||"")?raw.lightStart:"07:00";
  const darkStart=/^\d{2}:\d{2}$/.test(raw.darkStart||"")?raw.darkStart:"19:00";
  res.json({ok:true,appearance:{mode,lightStart,darkStart}});
});
app.put("/api/account/appearance",userOnly,async(req,res)=>{
  const user=req.currentUser||await sessionUser(req);
  if(!user)return res.status(401).json({ok:false,message:"Non autorisé."});
  const incoming=req.body?.appearance||{};
  const mode=["light","dark","auto"].includes(incoming.mode)?incoming.mode:null;
  if(!mode)return res.status(400).json({ok:false,message:"Mode d'affichage invalide."});
  const validTime=v=>/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(String(v||""));
  const lightStart=validTime(incoming.lightStart)?incoming.lightStart:"07:00";
  const darkStart=validTime(incoming.darkStart)?incoming.darkStart:"19:00";
  const permissions=permissionsObject(user);
  const appearance={mode,lightStart,darkStart};
  await prisma.user.update({where:{id:user.id},data:{permissions:{...permissions,uiAppearance:appearance}}});
  res.json({ok:true,appearance});
});
app.get("/api/account/module-preferences",userOnly,async(req,res)=>{
  if(!req.session?.userId)return res.json({ok:true,modules:[]});
  const user=await prisma.user.findUnique({where:{id:req.session.userId},select:{permissions:true}});
  const permissions=user?.permissions&&typeof user.permissions==="object"&&!Array.isArray(user.permissions)?user.permissions:{};
  let modules=Array.isArray(permissions.uiModules)?permissions.uiModules:[];
  if(req.currentUser?.role!=="ADMIN"){
    const allowed=new Set([...allowedModulesForUser(req.currentUser),"settings"]);
    modules=modules.filter(m=>allowed.has(m.id)).map(m=>({...m,visible:true}));
  }
  res.json({ok:true,modules});
});
app.put("/api/account/module-preferences",userOnly,async(req,res)=>{
  if(!req.session?.userId)return res.status(400).json({ok:false,message:"Compte utilisateur requis."});
  const allowed=new Set(["dashboard","events","planning","materialPlanning","inventory","longPlanning","documents","galleries","booths","collaborators","google","assistance","settings"]);
  const required=new Set(["dashboard","events","planning","materialPlanning","inventory","longPlanning","documents","galleries","assistance","settings"]);
  const incoming=Array.isArray(req.body?.modules)?req.body.modules:[];
  const seen=new Set();
  const modules=[];
  for(const item of incoming){
    const id=String(item?.id||"");
    if(!allowed.has(id)||seen.has(id))continue;
    seen.add(id);
    modules.push({id,order:modules.length,visible:required.has(id)?true:item?.visible!==false});
  }
  for(const id of allowed)if(!seen.has(id))modules.push({id,order:modules.length,visible:true});
  const user=await prisma.user.findUnique({where:{id:req.session.userId},select:{permissions:true}});
  const permissions=user?.permissions&&typeof user.permissions==="object"&&!Array.isArray(user.permissions)?user.permissions:{};
  const nextPermissions={...permissions,uiModules:modules};
  await prisma.user.update({where:{id:req.session.userId},data:{permissions:nextPermissions}});
  res.json({ok:true,modules});
});


app.get("/api/google/status", adminOnly, async (req, res) => {
  const calendar = await googleService.connection("calendar");
  const drive = await googleService.connection("drive");

  res.json({
    configured: googleService.configured(),

    calendarConnected: Boolean(calendar),
    calendarEmail: calendar?.googleEmail || null,
    defaultCalendarId:
      calendar?.defaultCalendarId ||
      process.env.GOOGLE_CALENDAR_ID ||
      "primary",
    defaultCalendarSummary:
      calendar?.defaultCalendarSummary || null,

    driveConnected: Boolean(drive),
    driveEmail: drive?.googleEmail || null,
    driveRootFolderId:
      drive?.driveRootFolderId ||
      process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID ||
      null,

    connected: Boolean(calendar || drive)
  });
});

app.get("/auth/google/start/:kind", adminOnly, (req, res) => {
  try {
    const kind = req.params.kind;

    if(kind !== "calendar" && kind !== "drive"){
      return res.status(400).send("Type de connexion Google invalide.");
    }

    console.log(`GOOGLE START: ${kind}`);

    const url = googleService.authUrl(req, kind);

    req.session.save(err => {
      if(err){
        console.error(`GOOGLE START ${kind}: erreur session =`, err);
        return res.status(500).send("Erreur session Google.");
      }

      console.log(`GOOGLE START ${kind}: redirection Google`);
      res.redirect(url);
    });

  } catch(err){
    console.error("OAuth Google :", err);
    res.status(500).send(
      `Configuration Google incomplète : ${err.message}`
    );
  }
});

app.get("/auth/google/start", adminOnly, (req, res) => {
  res.redirect("/auth/google/start/calendar");
});

app.get("/auth/google/callback", adminOnly, async (req, res) => {
  try {
    if(!req.query.code){
      return res.status(400).send("Code OAuth manquant.");
    }

    if(
      !req.query.state ||
      req.query.state !== req.session.googleOAuthState
    ){
      return res.status(400).send("État OAuth invalide.");
    }

    delete req.session.googleOAuthState;

    const result = await googleService.callback(
      req,
      req.query.code
    );

    res.redirect(
      `/?google=${encodeURIComponent(result.kind || "connected")}`
    );

  } catch(err){
    console.error("Callback Google :", err);
    res.status(500).send(
      `Connexion Google impossible : ${err.message}`
    );
  }
});

app.post("/api/google/disconnect/:kind", adminOnly, async (req, res) => {
  try {
    const kind = req.params.kind;

    if(kind !== "calendar" && kind !== "drive"){
      return res.status(400).json({
        ok:false,
        message:"Type de connexion Google invalide."
      });
    }

    await googleService.disconnect(kind);

    res.json({
      ok:true,
      kind
    });

  } catch (err) {
    console.error("Déconnexion Google :", err);

    res.status(500).json({
      ok:false,
      message:"Impossible de déconnecter Google."
    });
  }
});

app.post("/api/google/disconnect", adminOnly, async (req, res) => {
  try {
    await googleService.disconnect();

    res.json({
      ok:true
    });

  } catch (err) {
    console.error("Déconnexion Google :", err);

    res.status(500).json({
      ok:false,
      message:"Impossible de déconnecter Google."
    });
  }
});

app.get("/api/google/calendars", adminOnly, async (req, res) => {
  try {
    res.json({ ok: true, calendars: await googleService.listCalendars(req) });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

app.get("/api/google/drive-folders", adminOnly, async (req, res) => {
  try {
    res.json({ ok: true, folders: await googleService.listDriveFolders(req, req.query.parentId || "root") });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

app.post("/api/google/settings", adminOnly, async (req, res) => {
  try {
    const saved = await googleService.saveSettings(req.body || {});
    res.json({
      ok: true,
      defaultCalendarId: saved.defaultCalendarId,
      defaultCalendarSummary: saved.defaultCalendarSummary,
      driveRootFolderId: saved.driveRootFolderId
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

app.post("/api/events/:id/google-sync", adminOnly, async (req, res) => {
  try {
    const result = await googleService.syncEvent(req, req.params.id);
    if (!result.connected) return res.status(409).json({ ok: false, message: "Google n'est pas connectÃ©." });
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

app.get("/api/dashboard", moduleViewOnly("dashboard"), async (req, res) => {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0,0,0,0);

  // LP28 V8.5.16 : le statut EN COURS est manuel.
  // Les événements à venir restent limités à aujourd'hui -> dimanche 23:59.
  // Un événement démarré reste dans « En cours » jusqu'à l'action
  // « Prestation terminée », même si la semaine change.
  const sundayEnd = new Date(today);
  const daysUntilSunday = (7 - sundayEnd.getDay()) % 7;
  sundayEnd.setDate(sundayEnd.getDate() + daysUntilSunday);
  sundayEnd.setHours(23,59,59,999);

  const currentUser=req.currentUser||await sessionUser(req);
  const assignedDashboardWhere=currentUser?.role==="INTERVENANT"&&currentUser?.collaboratorId
    ? {OR:[
        {responsibleCollaboratorId:currentUser.collaboratorId},
        {installerCollaboratorId:currentUser.collaboratorId},
        {pickupCollaboratorId:currentUser.collaboratorId}
      ]}
    : {};
  const activeBookingWhere = {
    archived: false,
    ...assignedDashboardWhere,
    bookingStatus: { notIn: ["DECLINED", "CANCELLED", "COMPLETED"] }
  };

  const inProgressWhere = {
    ...activeBookingWhere,
    status: "IN_PROGRESS"
  };

  const upcomingWhere = {
    ...activeBookingWhere,
    eventDate: { gte: today, lte: sundayEnd },
    status: { notIn: ["COMPLETED", "IN_PROGRESS"] }
  };

  const [events, inProgress, upcoming, unsignedUpcomingContracts, activeGalleries, signedContracts, consumables] = await Promise.all([
    prisma.event.count({ where: { archived: false, ...assignedDashboardWhere } }),
    prisma.event.count({ where: inProgressWhere }),
    prisma.event.count({ where: upcomingWhere }),
    prisma.event.count({
      where: {
        ...upcomingWhere,
        contractStatus: { not: "SIGNED" }
      }
    }),
    prisma.event.count({
      where: {
        archived: false,
        ...assignedDashboardWhere,
        portalEnabled: true,
        bookingStatus: { notIn: ["DECLINED", "CANCELLED"] }
      }
    }),
    prisma.event.count({
      where: {
        archived: false,
        ...assignedDashboardWhere,
        contractStatus: "SIGNED"
      }
    }),
    prisma.consumable.findMany({ orderBy: { printer: "asc" } })
  ]);

  res.json({
    stats: {
      events,
      inProgress,
      upcoming,
      unsignedUpcomingContracts,
      activeGalleries,
      signedContracts,
      upcomingUntil: sundayEnd.toISOString()
    },
    consumables
  });
});

app.get("/api/materials", anyModuleViewOnly(["planning","materialPlanning"]), async (req, res) => {
  await ensureCatalog(prisma);
  const materials = await prisma.material.findMany({
    where: { active: true, bookingVisible: true },
    orderBy: [{ category: "asc" }, { name: "asc" }]
  });
  const unavailabilities = await prisma.materialUnavailability.findMany({
  where: {
    status: "ACTIVE",
    startAt: { lt: end },
    endAt: { gte: start }
  },
  include: {
    material: true
  },
  orderBy: {
    startAt: "asc"
  }
});
  res.json({ materials });
});

const MATERIAL_UNAVAILABILITY_REASONS = [
  "MAINTENANCE",
  "REPAIR",
  "BREAKDOWN",
  "CHECK",
  "CLEANING",
  "VACATION",
  "LOAN",
  "WAITING_PART",
  "OTHER"
];

app.get("/api/materials/:id/unavailabilities", adminOnly, async (req, res) => {
  const material = await prisma.material.findUnique({
    where: { id: req.params.id }
  });

  if (!material) {
    return res.status(404).json({
      ok: false,
      message: "Matériel introuvable."
    });
  }

  const items = await prisma.materialUnavailability.findMany({
    where: {
      materialId: material.id
    },
    orderBy: {
      startAt: "desc"
    }
  });

  res.json({
    ok: true,
    material,
    unavailabilities: items
  });
});

app.post("/api/materials/:id/unavailabilities", adminOnly, async (req, res) => {
  const material = await prisma.material.findUnique({
    where: { id: req.params.id }
  });

  if (!material) {
    return res.status(404).json({
      ok: false,
      message: "Matériel introuvable."
    });
  }

  const {
    startAt,
    endAt,
    reason,
    notes
  } = req.body || {};

  if (!startAt || !endAt) {
    return res.status(400).json({
      ok: false,
      message: "La date de début et la date de fin sont obligatoires."
    });
  }

  const start = new Date(startAt);
  const end = new Date(endAt);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    return res.status(400).json({
      ok: false,
      message: "Période d'indisponibilité invalide."
    });
  }

  if (end < start) {
    return res.status(400).json({
      ok: false,
      message: "La date de fin doit être postérieure à la date de début."
    });
  }

  if (!MATERIAL_UNAVAILABILITY_REASONS.includes(reason)) {
    return res.status(400).json({
      ok: false,
      message: "Motif d'indisponibilité invalide."
    });
  }

  if (
    reason === "OTHER" &&
    !String(notes || "").trim()
  ) {
    return res.status(400).json({
      ok: false,
      message: "Un commentaire est obligatoire pour le motif Autre."
    });
  }

  const conflicts = await prisma.event.findMany({
    where: {
      archived: false,
      materials: {
        some: {
          materialId: material.id
        }
      }
    },
    include: {
      materials: true
    },
    orderBy: {
      eventDate: "asc"
    }
  });

  const conflictingEvents = conflicts.filter(event => {
    const range = eventRangeFromRecord(event);

    return rangesOverlap(
      start,
      end,
      range.start,
      range.end
    );
  });

  const item = await prisma.materialUnavailability.create({
    data: {
      materialId: material.id,
      startAt: start,
      endAt: end,
      reason,
      notes: String(notes || "").trim() || null,
      status: "ACTIVE"
    }
  });

  res.json({
    ok: true,
    unavailability: item,
    conflicts: conflictingEvents.map(event => ({
      id: event.id,
      name: event.name,
      eventDate: event.eventDate
    }))
  });
});
app.get("/api/material-unavailabilities", anyModuleViewOnly(["planning","materialPlanning"]), async (req, res) => {
  const items = await prisma.materialUnavailability.findMany({
    include:{
      material:true
    },
    orderBy:{
      startAt:"desc"
    }
  });

  res.json({
    ok:true,
    unavailabilities:items
  });
});
app.patch("/api/material-unavailabilities/:id", adminOnly, async (req, res) => {
  const current = await prisma.materialUnavailability.findUnique({
    where: {
      id: req.params.id
    }
  });

  if (!current) {
    return res.status(404).json({
      ok: false,
      message: "Indisponibilité introuvable."
    });
  }

  const status = String(req.body?.status || "").trim();

  if (!["ACTIVE", "COMPLETED", "CANCELLED"].includes(status)) {
    return res.status(400).json({
      ok: false,
      message: "Statut invalide."
    });
  }

  const updated = await prisma.materialUnavailability.update({
    where: {
      id: current.id
    },
    data: {
      status
    }
  });

  res.json({
    ok: true,
    unavailability: updated
  });
});

app.delete("/api/material-unavailabilities/:id", adminOnly, async (req, res) => {
  const current = await prisma.materialUnavailability.findUnique({
    where: {
      id: req.params.id
    }
  });

  if (!current) {
    return res.status(404).json({
      ok: false,
      message: "Indisponibilité introuvable."
    });
  }

  await prisma.materialUnavailability.delete({
    where: {
      id: current.id
    }
  });

  res.json({
    ok: true
  });
});

app.get("/api/consumables", adminOnly, async (req, res) => {
  await ensureCatalog(prisma);
  const consumables = await prisma.consumable.findMany({
    include: { movements: { orderBy: { createdAt: "desc" }, take: 20 } },
    orderBy: { printer: "asc" }
  });
  res.json({ consumables });
});

app.post("/api/consumables/:id/add-box", adminOnly, async (req, res) => {
  const item = await prisma.consumable.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ ok: false, message: "Consommable introuvable." });

  const updated = await prisma.$transaction(async tx => {
    const c = await tx.consumable.update({
      where: { id: item.id },
      data: { currentUnits: { increment: item.unitsPerBox } }
    });
    await tx.stockMovement.create({
      data: {
        consumableId: item.id,
        quantity: item.unitsPerBox,
        reason: "Ajout d'un carton"
      }
    });
    return c;
  });

  res.json({ ok: true, consumable: updated });
});

app.get("/api/clients", adminOnly, async (req, res) => {
  const clients = await prisma.client.findMany({
    include: { _count: { select: { events: true } } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
  });
  res.json({ clients });
});


app.post("/api/events/check-conflicts", adminOnly, async (req, res) => {
  const { date, time, pickupDate, pickupTime, materials, excludeEventId } = req.body || {};
  const conflicts = await findMaterialConflicts({
    date,
    time,
    pickupDate,
    pickupTime,
    materialNames: materials,
    excludeEventId: excludeEventId || null
  });
  res.json({ ok: true, conflicts });
});


// === LP28 V8.5.8 - Planning familial sécurisé ===
const FAMILY_PLANNING_EMAIL = String(process.env.FAMILY_PLANNING_EMAIL || "").trim().toLowerCase();
const FAMILY_PLANNING_PASSWORD = String(process.env.FAMILY_PLANNING_PASSWORD || "");
function familyPlanningOnly(req,res,next){
  if(req.session?.familyPlanning === true) return next();
  return res.status(401).json({ok:false,message:"Non autorisé."});
}
app.get("/api/family-planning/session",(req,res)=>res.json({authenticated:Boolean(req.session?.familyPlanning)}));
app.post("/api/family-planning/login",(req,res)=>{
  const email=String(req.body?.email||"").trim().toLowerCase();
  const password=String(req.body?.password||"");
  if(!FAMILY_PLANNING_EMAIL || !FAMILY_PLANNING_PASSWORD) return res.status(503).json({ok:false,message:"Accès planning familial non configuré."});
  if(email!==FAMILY_PLANNING_EMAIL || password!==FAMILY_PLANNING_PASSWORD) return res.status(401).json({ok:false,message:"Identifiants incorrects."});
  req.session.familyPlanning=true;
  req.session.familyPlanningEmail=email;
  req.session.save(err=>err?res.status(500).json({ok:false,message:"Impossible d'enregistrer la session."}):res.json({ok:true,authenticated:true}));
});
app.post("/api/family-planning/logout",(req,res)=>{ delete req.session.familyPlanning; delete req.session.familyPlanningEmail; req.session.save(()=>res.json({ok:true})); });

function familyEventDto(e){ return {
  id:e.id,name:e.name,type:e.type,date:e.eventDate.toISOString().slice(0,10),time:e.installTime,
  pickupDate:e.pickupDate?e.pickupDate.toISOString().slice(0,10):null,pickupTime:e.pickupTime,
  address:e.address,archived:e.archived,bookingStatus:e.bookingStatus,materials:(e.materials||[]).map(x=>x.material?.name).filter(Boolean)
};}
app.get("/api/family-planning/data",familyPlanningOnly,async(req,res)=>{
  const [events,blocks]=await Promise.all([
    prisma.event.findMany({where:{archived:false,bookingStatus:{notIn:["DECLINED","CANCELLED"]}},include:{materials:{include:{material:true}}},orderBy:{eventDate:"asc"}}),
    prisma.materialUnavailability.findMany({where:{status:"ACTIVE",reason:"VACATION",notes:{startsWith:"FAMILY_PLANNING|"}},orderBy:{startAt:"asc"}})
  ]);
  // Un blocage familial est créé pour chaque matériel bloquant. Pour l'interface,
  // on les regroupe en une seule période afin d'éviter une carte par matériel.
  const groupedBlocks=[];
  const seen=new Set();
  for(const b of blocks){
    const rawNotes=String(b.notes||"");
    const key=`${new Date(b.startAt).toISOString()}|${new Date(b.endAt).toISOString()}|${rawNotes}`;
    if(seen.has(key)) continue;
    seen.add(key);
    groupedBlocks.push({id:b.id,startAt:b.startAt,endAt:b.endAt,notes:rawNotes.replace(/^FAMILY_PLANNING\|/,"")});
  }
  res.json({ok:true,events:events.map(familyEventDto),blocks:groupedBlocks});
});

// Planning Admin : mêmes blocages familiaux, sans exposer le motif privé.
function canManageFamilyPlanningAccount(user){
  if(!user)return false;
  if(user.role==="ADMIN")return true;
  const email=String(user.email||"").trim().toLowerCase();
  if(FAMILY_PLANNING_EMAIL && email===FAMILY_PLANNING_EMAIL)return true;
  const identity=`${user.firstName||""} ${user.name||""}`.toLowerCase();
  return identity.includes("lydie");
}

app.get("/api/account/family-planning/blocks",userOnly,async(req,res)=>{
  const user=req.currentUser||await sessionUser(req);
  const canManage=canManageFamilyPlanningAccount(user);
  const blocks=await prisma.materialUnavailability.findMany({
    where:{status:"ACTIVE",reason:"VACATION",notes:{startsWith:"FAMILY_PLANNING|"}},
    orderBy:{startAt:"asc"}
  });
  const grouped=[]; const seen=new Set();
  for(const b of blocks){
    const key=`${new Date(b.startAt).toISOString()}|${new Date(b.endAt).toISOString()}|${String(b.notes||"")}`;
    if(seen.has(key)) continue; seen.add(key);
    const privateNote=String(b.notes||"").replace(/^FAMILY_PLANNING\|/,"");
    grouped.push({id:b.id,startAt:b.startAt,endAt:b.endAt,label:"NON RÉSERVABLE",notes:canManage?privateNote:""});
  }
  res.json({ok:true,canManage,blocks:grouped});
});

app.post("/api/account/family-planning/blocks",userOnly,async(req,res)=>{
  const user=req.currentUser||await sessionUser(req);
  if(!canManageFamilyPlanningAccount(user))return res.status(403).json({ok:false,message:"Ce compte ne peut pas bloquer le planning."});
  const startDate=String(req.body?.startDate||""); const endDate=String(req.body?.endDate||""); const note=String(req.body?.notes||"").trim();
  const start=new Date(`${startDate}T00:00:00`); const end=new Date(`${endDate}T23:59:59`);
  if(Number.isNaN(start.getTime())||Number.isNaN(end.getTime())||end<start) return res.status(400).json({ok:false,message:"Période invalide."});
  await ensureCatalog(prisma);
  const materials=await prisma.material.findMany({where:{active:true,blocksPlanning:true}});
  if(!materials.length)return res.status(400).json({ok:false,message:"Aucun matériel bloquant n'est configuré."});
  const created=await prisma.$transaction(materials.map(m=>prisma.materialUnavailability.create({data:{materialId:m.id,startAt:start,endAt:end,reason:"VACATION",notes:`FAMILY_PLANNING|${note}`,status:"ACTIVE"}})));
  const actor=user?.firstName||user?.name||"Lydie";
  const sameDay=startDate===endDate;
  await addNotification({title:"⛔ Date bloquée dans le planning",message:`${actor} a bloqué ${sameDay?`le ${frDateShort(start)}`:`du ${frDateShort(start)} au ${frDateShort(end)}`}${note?` — Motif : ${note}`:" — Sans motif renseigné"}.`,type:"WARNING",source:"FAMILY_DATE_BLOCKED",audience:"ADMIN"}).catch(err=>console.error("Notification blocage planning compte :",err));
  res.json({ok:true,count:created.length});
});

app.delete("/api/account/family-planning/blocks/:id",userOnly,async(req,res)=>{
  const user=req.currentUser||await sessionUser(req);
  if(!canManageFamilyPlanningAccount(user))return res.status(403).json({ok:false,message:"Ce compte ne peut pas libérer le planning."});
  const first=await prisma.materialUnavailability.findUnique({where:{id:req.params.id}});
  if(!first||first.reason!=="VACATION"||!String(first.notes||"").startsWith("FAMILY_PLANNING|"))return res.status(404).json({ok:false,message:"Blocage introuvable."});
  const note=String(first.notes||"");
  await prisma.materialUnavailability.deleteMany({where:{reason:"VACATION",notes:note,startAt:first.startAt,endAt:first.endAt}});
  const actor=user?.firstName||user?.name||"Lydie";
  const privateNote=note.replace(/^FAMILY_PLANNING\|/,"").trim();
  await addNotification({title:"✅ Date libérée dans le planning",message:`${actor} a libéré ${frDateShort(first.startAt)}${frDateShort(first.startAt)!==frDateShort(first.endAt)?` au ${frDateShort(first.endAt)}`:""}${privateNote?` — Motif précédent : ${privateNote}`:""}.`,type:"SUCCESS",source:"FAMILY_DATE_RELEASED",audience:"ADMIN"}).catch(err=>console.error("Notification libération planning compte :",err));
  res.json({ok:true});
});

app.post("/api/family-planning/blocks",familyPlanningOnly,async(req,res)=>{
  const startDate=String(req.body?.startDate||""); const endDate=String(req.body?.endDate||""); const note=String(req.body?.notes||"").trim();
  const start=new Date(`${startDate}T00:00:00`); const end=new Date(`${endDate}T23:59:59`);
  if(Number.isNaN(start.getTime())||Number.isNaN(end.getTime())||end<start) return res.status(400).json({ok:false,message:"Période invalide."});
  await ensureCatalog(prisma);
  const materials=await prisma.material.findMany({where:{active:true,blocksPlanning:true}});
  if(!materials.length) return res.status(400).json({ok:false,message:"Aucun matériel bloquant n'est configuré."});
  const created=await prisma.$transaction(materials.map(m=>prisma.materialUnavailability.create({data:{materialId:m.id,startAt:start,endAt:end,reason:"VACATION",notes:`FAMILY_PLANNING|${note}`,status:"ACTIVE"}})));

  const familyUser=await familyPlanningNotificationUser();
  const actor=familyUser?.firstName||familyUser?.name||"Lydie";
  const sameDay=startDate===endDate;
  await addNotification({
    title:"⛔ Date bloquée dans le planning",
    message:`${actor} a bloqué ${sameDay?`le ${frDateShort(start)}`:`du ${frDateShort(start)} au ${frDateShort(end)}`}${note?` — Motif : ${note}`:" — Sans motif renseigné"}.`,
    type:"WARNING",
    source:"FAMILY_DATE_BLOCKED",
    audience:"ADMIN"
  }).catch(err=>console.error("Notification blocage planning familial :",err));

  res.json({ok:true,count:created.length});
});
app.delete("/api/family-planning/blocks/:id",familyPlanningOnly,async(req,res)=>{
  const first=await prisma.materialUnavailability.findUnique({where:{id:req.params.id}});
  if(!first || first.reason!=="VACATION" || !String(first.notes||"").startsWith("FAMILY_PLANNING|")) return res.status(404).json({ok:false,message:"Blocage familial introuvable."});
  const note=String(first.notes||"");
  await prisma.materialUnavailability.deleteMany({where:{reason:"VACATION",notes:note,startAt:first.startAt,endAt:first.endAt}});

  const familyUser=await familyPlanningNotificationUser();
  const actor=familyUser?.firstName||familyUser?.name||"Lydie";
  const privateNote=note.replace(/^FAMILY_PLANNING\|/,"").trim();
  await addNotification({
    title:"✅ Date libérée dans le planning",
    message:`${actor} a libéré ${frDateShort(first.startAt)}${frDateShort(first.startAt)!==frDateShort(first.endAt)?` au ${frDateShort(first.endAt)}`:""}${privateNote?` — Motif précédent : ${privateNote}`:""}.`,
    type:"SUCCESS",
    source:"FAMILY_DATE_RELEASED",
    audience:"ADMIN"
  }).catch(err=>console.error("Notification libération planning familial :",err));

  res.json({ok:true});
});
// === fin Planning familial ===

app.get("/api/events", anyModuleViewOnly(["events","planning","materialPlanning"]), async (req, res) => {
  const currentUser=req.currentUser||await sessionUser(req);
  const assignedWhere=currentUser?.role==="INTERVENANT"&&currentUser?.collaboratorId
    ? {OR:[
        {responsibleCollaboratorId:currentUser.collaboratorId},
        {installerCollaboratorId:currentUser.collaboratorId},
        {pickupCollaboratorId:currentUser.collaboratorId}
      ]}
    : {};
  const events = await prisma.event.findMany({
    where:assignedWhere,
    include: {
  client: true,

  materials: {
    include: {
      material: true
    }
  },

  collaboratorActions: {
  include: {
    collaborator: true
  },
  orderBy: {
    createdAt: "desc"
  }
},
  collaboratorAccesses: true
},
    orderBy: { eventDate: "desc" }
  });

  res.json({
    events: events.map(e => {
      const access=currentUser?.role==="INTERVENANT"&&currentUser?.collaboratorId
        ? (e.collaboratorAccesses||[]).find(a=>a.collaboratorId===currentUser.collaboratorId&&a.active)
        : null;
      const gifted=eventIsGifted(e);
      const prep=e?.preparation&&typeof e.preparation==="object"?e.preparation:{};
      const savedMissionPermissions=prep?.collaboratorPermissions&&typeof prep.collaboratorPermissions==="object"
        ? prep.collaboratorPermissions
        : {};
      const isAssignedIntervenant=currentUser?.role==="INTERVENANT"&&currentUser?.collaboratorId&&[
        e.responsibleCollaboratorId,e.installerCollaboratorId,e.pickupCollaboratorId
      ].filter(Boolean).includes(currentUser.collaboratorId);
      const missionAllowsBalance=savedMissionPermissions.canSeeBalance!==undefined
        ? savedMissionPermissions.canSeeBalance===true
        : access?.canSeeBalance===true;
      const canSeeOperationalBalance=currentUser?.role==="ADMIN" || Boolean(isAssignedIntervenant&&missionAllowsBalance&&!gifted);
      return ({
      id: e.id,
      name: e.name,
      type: e.type,
      date: e.eventDate.toISOString().slice(0,10),
      time: e.installTime,
      pickupDate: e.pickupDate ? e.pickupDate.toISOString().slice(0,10) : null,
      pickupTime: e.pickupTime,
      address: e.address,
      guestCount: e.guestCount,
      organizerName: e.organizerName,
      organizerPhone: e.organizerPhone,
      organizerEmail: e.organizerEmail,
totalPrice: currentUser?.role==="ADMIN" && e.totalPrice != null ? Number(e.totalPrice) : null,
deposit: currentUser?.role==="ADMIN" && e.deposit != null ? Number(e.deposit) : null,
balance: currentUser?.role==="ADMIN" ? (e.balancePaid ? 0 : (e.balance != null ? Number(e.balance) : null)) : null,
operationalBalance: canSeeOperationalBalance ? eventOperationalRemaining(e) : null,
canSeeOperationalBalance,
customPrintCount: e.customPrintCount != null ? Number(e.customPrintCount) : "",
customPrintPrice: currentUser?.role==="ADMIN" && e.customPrintPrice != null ? Number(e.customPrintPrice) : null,

      responsibleCollaboratorId: e.responsibleCollaboratorId,
installerCollaboratorId: e.installerCollaboratorId,
pickupCollaboratorId: e.pickupCollaboratorId,

collaboratorActions: (e.collaboratorActions || []).map(a => ({
  id: a.id,
  action: a.action,
  createdAt: a.createdAt,
  collaborator: a.collaborator
    ? {
        firstName: a.collaborator.firstName,
        lastName: a.collaborator.lastName
      }
    : null
})),

      materials: e.materials.map(x => x.material.name),
      payments: currentUser?.role==="ADMIN" ? {
        depositPaid: e.depositPaid,
        balancePaid: e.balancePaid,
        cautionReceived: e.cautionReceived,
        cautionReturned: e.cautionReturned
      } : null,
      operationalBalancePaid: canSeeOperationalBalance ? Boolean(e.balancePaid) : null,
      bookingStatus: e.bookingStatus,
      optionUntil: e.optionUntil ? e.optionUntil.toISOString().slice(0,10) : null,
      sceneJets: e.sceneJets,
      portalEnabled: e.portalEnabled,
      guestUploadEnabled: e.guestUploadEnabled,
      guestVideoEnabled: e.guestVideoEnabled,
      guestUploadModerated: e.guestUploadModerated,
      portalExpiresAt: e.portalExpiresAt ? e.portalExpiresAt.toISOString().slice(0,10) : null,
      portalPassword: e.portalPassword,
      fotoshareUrl: e.fotoshareUrl,
      frameSource: e.frameSource,
      frameStatus: e.frameStatus,
      preparation: currentUser?.role==="ADMIN" ? e.preparation : {...(e.preparation||{}),gifted:false},
      notes: e.notes,
archived: e.archived,
status: e.status,

contractStatus: e.contractStatus,
contractSignedAt: e.contractSignedAt,
contractSignerName: e.contractSignerName,
contractSignerEmail: e.contractSignerEmail,

client: e.client ? {
  id: e.client.id,
  firstName: e.client.firstName,
  lastName: e.client.lastName,
  email: e.client.email,
  phone: e.client.phone
} : null,

googleCalendarEventId: e.googleCalendarEventId,
googleCalendarId: e.googleCalendarId,
googleDriveFolderId: e.googleDriveFolderId,
      printer: e.printer ? {
        id: e.printer.id,
        name: e.printer.name,
        model: e.printer.model,
        remainingPrints: e.printer.remainingPrints,
        loadedCapacity: e.printer.loadedCapacity
      } : null
    })})
  });
});
app.patch("/api/events/:id/start", requireEventAction("start"), async (req,res)=>{
  try{
    const event = await prisma.event.findUnique({
      where:{id:req.params.id}
    });

    if(!event){
      return res.status(404).json({
        ok:false,
        message:"Événement introuvable."
      });
    }

    if(event.archived){
      return res.status(409).json({
        ok:false,
        message:"Impossible de démarrer un événement archivé."
      });
    }

    if(["DECLINED","CANCELLED","COMPLETED"].includes(event.bookingStatus) || event.status==="COMPLETED"){
      return res.status(409).json({
        ok:false,
        message:"Cet événement ne peut pas être démarré dans son statut actuel."
      });
    }

    const updated = await prisma.event.update({
      where:{id:event.id},
      data:{status:"IN_PROGRESS"}
    });

    await addNotification({
      title:"▶️ Événement commencé",
      message:`${event.name || "Événement"} — la prestation vient d'être passée en cours.`,
      type:"INFO",source:"EVENT_STARTED",audience:"ADMIN",eventId:event.id
    }).catch(err=>console.error("Notification début événement :",err));

    res.json({
      ok:true,
      id:updated.id,
      status:updated.status,
      bookingStatus:updated.bookingStatus
    });

  }catch(err){
    console.error("Début de prestation :",err);

    res.status(500).json({
      ok:false,
      message:"Impossible de démarrer la prestation."
    });
  }
});

app.patch("/api/events/:id/complete", requireEventAction("complete"), async (req,res)=>{
  try{
    const event = await prisma.event.findUnique({
      where:{id:req.params.id}
    });

    if(!event){
      return res.status(404).json({
        ok:false,
        message:"Événement introuvable."
      });
    }

    const updated = await prisma.event.update({
      where:{id:event.id},
      data:{
        status:"COMPLETED",
        bookingStatus:"COMPLETED"
      }
    });

    res.json({
      ok:true,
      id:updated.id,
      status:updated.status,
      bookingStatus:updated.bookingStatus
    });

  }catch(err){
    console.error("Fin de prestation :",err);

    res.status(500).json({
      ok:false,
      message:"Impossible de terminer la prestation."
    });
  }
});
app.get("/api/events/:id/contract.pdf", userOnly, async (req, res) => {
  try {
    const currentUser=req.currentUser||await sessionUser(req);

    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: {
        client: true,
        materials: { include: { material: true } },
        collaboratorAccesses: true
      }
    });

    if (!event) {
      return res.status(404).json({
        ok: false,
        message: "Événement introuvable."
      });
    }

    if(currentUser?.role!=="ADMIN"){
      if(currentUser?.role!=="INTERVENANT" || !currentUser?.collaboratorId){
        return res.status(403).json({
          ok:false,
          message:"Contrat non autorisé pour ce compte."
        });
      }

      const assignedIds=[
        event.responsibleCollaboratorId,
        event.installerCollaboratorId,
        event.pickupCollaboratorId
      ].filter(Boolean);

      if(!assignedIds.includes(currentUser.collaboratorId)){
        return res.status(403).json({
          ok:false,
          message:"Cette prestation ne t'est pas attribuée."
        });
      }

      const access=(event.collaboratorAccesses||[])
        .find(a=>a.collaboratorId===currentUser.collaboratorId&&a.active);

      const permissions=effectiveCollaboratorPermissions(event,access);

      if(!permissions.canSeeContract){
        return res.status(403).json({
          ok:false,
          message:"Contrat non autorisé pour cette mission."
        });
      }
    }

    const pdf = await contractService.generateContractPdf(event);

    const safeName = String(event.name || "contrat")
      .replace(/[^a-z0-9_-]+/gi, "_")
      .replace(/^_+|_+$/g, "");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="Contrat_${safeName || "evenement"}${event.contractStatus==="SIGNED"?"_signe":""}.pdf"`
    );

    res.send(pdf);

  } catch (err) {
    console.error("Génération contrat PDF compte connecté :", err);

    res.status(500).json({
      ok: false,
      message: "Impossible de générer le contrat."
    });
  }
});
// ======================================================
// SIGNATURE ELECTRONIQUE DES CONTRATS
// ======================================================

function contractHash(event) {
  const contractData = {
    name: event.name || null,
    type: event.type || null,

    eventDate: event.eventDate
      ? new Date(event.eventDate).toISOString()
      : null,

    installTime: event.installTime || null,

    pickupDate: event.pickupDate
      ? new Date(event.pickupDate).toISOString()
      : null,

    pickupTime: event.pickupTime || null,
    address: event.address || null,

    organizerName: event.organizerName || null,
    organizerEmail: event.organizerEmail || null,
    organizerPhone: event.organizerPhone || null,

    totalPrice:
      event.totalPrice != null
        ? String(event.totalPrice)
        : null,

    deposit:
      event.deposit != null
        ? String(event.deposit)
        : null,

    balance:
      event.balance != null
        ? String(event.balance)
        : null,

    balancePaid: Boolean(event.balancePaid),

    customPrintCount: event.customPrintCount || null,

    customPrintPrice:
      event.customPrintPrice != null
        ? String(event.customPrintPrice)
        : null,

    frameSource: event.frameSource || "NONE",
    frameStatus: event.frameStatus || "NOT_REQUIRED",
    framePricing: event.preparation?.framePricing || null,
    framePrice: event.preparation?.framePrice != null
      ? String(event.preparation.framePrice)
      : null,

    client: event.client
      ? {
          firstName: event.client.firstName || null,
          lastName: event.client.lastName || null,
          address: event.client.address || null,
          phone: event.client.phone || null,
          email: event.client.email || null
        }
      : null,

    materials: (event.materials || [])
      .map(x => ({
        name: x.material?.name || x.name || null,
        quantity: x.quantity || 1
      }))
      .sort((a,b)=>
        String(a.name).localeCompare(String(b.name))
      )
  };

  return crypto
    .createHash("sha256")
    .update(JSON.stringify(contractData))
    .digest("hex");
}


// Générer / récupérer le lien sécurisé de signature
app.post("/api/events/:id/contract-signature-link", adminOnly, async (req, res) => {
  try {

    const event = await prisma.event.findUnique({
      where: {
        id: req.params.id
      },
      include: {
        client: true,
        materials: {
          include: {
            material: true
          }
        }
      }
    });

    if (!event) {
      return res.status(404).json({
        ok: false,
        message: "Événement introuvable."
      });
    }

    const currentHash = contractHash(event);

    // Un contrat déjà signé ne doit pas être remplacé silencieusement.
    if (event.contractStatus === "SIGNED") {
      return res.status(409).json({
        ok: false,
        message: "Ce contrat est déjà signé."
      });
    }

    // Si le contrat envoyé correspond toujours aux données actuelles,
    // on réutilise le même lien au lieu d'en créer un nouveau.
    if (
      event.contractStatus === "SENT" &&
      event.contractToken &&
      event.contractDocumentHash === currentHash
    ) {
      return res.json({
        ok: true,
        status: event.contractStatus,
        signatureUrl:
          `${appBaseUrl(req)}/signature/${event.contractToken}`,
        generatedAt: event.contractGeneratedAt,
        reused: true
      });
    }

    // Vérifie aussi que le PDF peut bien être généré avant de créer le lien.
    await contractService.generateContractPdf(event);
    const hash = currentHash;

    const token =
      event.contractToken ||
      crypto.randomBytes(24).toString("hex");

    const updated = await prisma.event.update({
      where: {
        id: event.id
      },
      data: {
        contractToken: token,
        contractStatus: "SENT",
        contractGeneratedAt: new Date(),
        contractDocumentHash: hash,

        // Une nouvelle génération annule une éventuelle
        // signature incomplète précédente.
        contractSignedAt: null,
        contractSignerName: null,
        contractSignerEmail: null,
        contractSignatureData: null
      }
    });

    const signatureUrl =
      `${appBaseUrl(req)}/signature/${updated.contractToken}`;

    res.json({
      ok: true,
      status: updated.contractStatus,
      signatureUrl,
      generatedAt: updated.contractGeneratedAt
    });

  } catch (err) {

    console.error("Création lien signature contrat :", err);

    res.status(500).json({
      ok: false,
      message: "Impossible de préparer le contrat à signer."
    });
  }
});


// Informations publiques du contrat à signer
app.get("/api/contract-signature/:token", async (req, res) => {
  try {

    const event = await prisma.event.findUnique({
      where: {
        contractToken: req.params.token
      },
      include: {
        client: true,
        materials: {
          include: {
            material: true
          }
        }
      }
    });

    if (!event) {
      return res.status(404).json({
        ok: false,
        message: "Lien de signature invalide."
      });
    }

    res.json({
      ok: true,

      status: event.contractStatus,

      event: {
        name: event.name,
        type: event.type,
        date: event.eventDate,
        address: event.address,

        organizerName:
          event.organizerName ||
          [
            event.client?.firstName,
            event.client?.lastName
          ].filter(Boolean).join(" "),

        organizerEmail:
          event.organizerEmail ||
          event.client?.email ||
          "",

        totalPrice:
          event.totalPrice != null
            ? Number(event.totalPrice)
            : null
      },

      generatedAt: event.contractGeneratedAt,
      signedAt: event.contractSignedAt,
      signerName: event.contractSignerName,

      contractPdfUrl:
        `/api/contract-signature/${encodeURIComponent(req.params.token)}/contract.pdf`
    });

  } catch (err) {

    console.error("Lecture contrat signature :", err);

    res.status(500).json({
      ok: false,
      message: "Impossible d'ouvrir le contrat."
    });
  }
});


// PDF correspondant exactement au contrat préparé
app.get("/api/contract-signature/:token/contract.pdf", async (req, res) => {
  try {

    const event = await prisma.event.findUnique({
      where: {
        contractToken: req.params.token
      },
      include: {
        client: true,
        materials: {
          include: {
            material: true
          }
        }
      }
    });

    if (!event) {
      return res.status(404).json({
        ok: false,
        message: "Contrat introuvable."
      });
    }

    const currentHash = contractHash(event);

    // Le contrat a été modifié après création du lien.
    if (
      event.contractDocumentHash &&
      currentHash !== event.contractDocumentHash
    ) {
      return res.status(409).json({
        ok: false,
        message:
          "Le contrat a été modifié depuis la création du lien. " +
          "Un nouveau lien de signature doit être généré."
      });
    }

    const pdf = await contractService.generateContractPdf(event);

    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    res.setHeader(
      "Content-Disposition",
      'inline; filename="Contrat_a_signer.pdf"'
    );

    res.send(pdf);

  } catch (err) {

    console.error("PDF signature contrat :", err);

    res.status(500).json({
      ok: false,
      message: "Impossible d'afficher le contrat."
    });
  }
});


// Enregistrement de la signature
app.post("/api/contract-signature/:token/sign", async (req, res) => {
  try {

    const signerName =
      String(req.body?.signerName || "").trim();

    const signerEmail =
      String(req.body?.signerEmail || "").trim();

    const signatureData =
      String(req.body?.signatureData || "");

    if (!signerName) {
      return res.status(400).json({
        ok: false,
        message: "Le nom du signataire est obligatoire."
      });
    }

    if (!signatureData.startsWith("data:image/")) {
      return res.status(400).json({
        ok: false,
        message: "Signature invalide."
      });
    }

    // Protection contre des données anormalement volumineuses
    if (signatureData.length > 1500000) {
      return res.status(413).json({
        ok: false,
        message: "La signature est trop volumineuse."
      });
    }

    const event = await prisma.event.findUnique({
      where: {
        contractToken: req.params.token
      },
      include: {
        client: true,
        materials: {
          include: {
            material: true
          }
        }
      }
    });

    if (!event) {
      return res.status(404).json({
        ok: false,
        message: "Lien de signature invalide."
      });
    }

    if (event.contractStatus === "SIGNED") {
      return res.status(409).json({
        ok: false,
        message: "Ce contrat a déjà été signé."
      });
    }

    const currentHash = contractHash(event);

if (
  !event.contractDocumentHash ||
  currentHash !== event.contractDocumentHash
) {
      return res.status(409).json({
        ok: false,
        message:
          "Le contrat a été modifié. Un nouveau lien de signature est nécessaire."
      });
    }

    // HORODATAGE SERVEUR
    const signedAt = new Date();

    await prisma.event.update({
      where: {
        id: event.id
      },
      data: {
        contractStatus: "SIGNED",
        contractSignedAt: signedAt,
        contractSignerName: signerName,
        contractSignerEmail: signerEmail || null,
        contractSignatureData: signatureData
      }
    });

    await addNotification({title:"✅ Contrat signé",message:`${event.name||"Événement"} — contrat signé par ${signerName}.`,type:"SUCCESS",source:"CONTRACT_SIGNED",audience:"ADMIN",eventId:event.id}).catch(err=>console.error("Notification contrat signé :",err));
    res.json({
      ok: true,
      status: "SIGNED",
      signedAt
    });

  } catch (err) {

    console.error("Signature contrat :", err);

    res.status(500).json({
      ok: false,
      message: "Impossible d'enregistrer la signature."
    });
  }
});

app.post("/api/events", adminOnly, async (req, res) => {
  const b = req.body || {};
  if (!String(b.name || "").trim() || !b.date) {
    return res.status(400).json({ ok: false, message: "Le nom et la date sont obligatoires." });
  }

  let clientId = null;
  const organizerName = String(b.organizerName || "").trim();

  if (organizerName) {
    const parts = organizerName.split(/\s+/);
    const firstName = parts.length > 1 ? parts.shift() : null;
    const lastName = parts.join(" ") || organizerName;

    const client = await prisma.client.create({
      data: {
        firstName,
        lastName,
        email: String(b.organizerEmail || "").trim() || null,
        phone: String(b.organizerPhone || "").trim() || null,
        address: String(b.address || "").trim() || null
      }
    });
    clientId = client.id;
  }

  const selected = Array.isArray(b.materials) ? b.materials : [];

  const conflicts = await findMaterialConflicts({
    date: b.date,
    time: b.time,
    pickupDate: b.pickupDate,
    pickupTime: b.pickupTime,
    materialNames: selected,
    sceneJets: b.sceneJets
  });

  if (conflicts.length) {
    return res.status(409).json({
      ok: false,
      error: "material_conflict",
      message: "Ressource indisponible sur cette pÃ©riode.",
      conflicts
    });
  }

  const materials = await ensureSelectedMaterials(prisma, selected);

  const printCount = plannedPrints(
  selected,
  b.customPrintCount
);
  const printerChoice = await choosePrinterForEvent({
    date:b.date,time:b.time,pickupDate:b.pickupDate,pickupTime:b.pickupTime,planned:printCount
  });

  if(printCount > 0 && !printerChoice.printer){
    return res.status(409).json({
      ok:false,
      error:"printer_conflict",
      message:printerChoice.warning || "Aucune imprimante disponible sur cette pÃ©riode."
    });
  }

  const event = await prisma.event.create({
    data: {
      name: String(b.name).trim(),
      type: String(b.type || "").trim() || null,
      eventDate: new Date(`${b.date}T12:00:00`),
      installTime: String(b.time || "").trim() || null,
      pickupDate: b.pickupDate ? new Date(`${b.pickupDate}T12:00:00`) : null,
      pickupTime: String(b.pickupTime || "").trim() || null,
      address: String(b.address || "").trim() || null,
      guestCount: b.guestCount ? Number(b.guestCount) : null,
      organizerName: organizerName || null,
      organizerEmail: String(b.organizerEmail || "").trim() || null,
      organizerPhone: String(b.organizerPhone || "").trim() || null,
      responsibleCollaboratorId:
  String(b.responsibleCollaboratorId || "").trim() || null,

installerCollaboratorId:
  String(b.installerCollaboratorId || "").trim() || null,

pickupCollaboratorId:
  String(b.pickupCollaboratorId || "").trim() || null,
      bookingStatus: ["QUOTE_DRAFT","QUOTE_SENT","OPTION","CONFIRMED","CANCELLED","DECLINED","COMPLETED"].includes(b.bookingStatus) ? b.bookingStatus : "CONFIRMED",
      optionUntil: b.optionUntil ? new Date(`${b.optionUntil}T12:00:00`) : null,
      sceneJets: b.sceneJets || null,
      portalEnabled: Boolean(b.portalEnabled),
      guestUploadEnabled: Boolean(b.guestUploadEnabled),
      guestVideoEnabled: Boolean(b.guestVideoEnabled),
      guestUploadModerated: Boolean(b.guestUploadModerated),
      portalExpiresAt: b.portalExpiresAt ? new Date(b.portalExpiresAt + "T12:00:00") : null,
      portalPassword: String(b.portalPassword || "").trim() || null,
      fotoshareUrl: String(b.fotoshareUrl || "").trim() || null,
      frameSource: ["NONE","CLIENT","LP28"].includes(b.frameSource) ? b.frameSource : "NONE",
      frameStatus: ["NOT_REQUIRED","TO_DO","IN_PROGRESS","DONE"].includes(b.frameStatus) ? b.frameStatus : "NOT_REQUIRED",
      preparation: b.preparation || defaultPreparation(selected),
      notes: String(b.notes || "").trim() || null,
      totalPrice:
  b.totalPrice !== "" && b.totalPrice != null
    ? Number(b.totalPrice)
    : null,

deposit:
  b.deposit !== "" && b.deposit != null
    ? Number(b.deposit)
    : null,

balance:
  b.balance !== "" && b.balance != null
    ? Number(b.balance)
    : null,
    customPrintCount:
  b.customPrintCount !== "" && b.customPrintCount != null
    ? Number(b.customPrintCount)
    : null,

customPrintPrice:
  b.customPrintPrice !== "" && b.customPrintPrice != null
    ? Number(b.customPrintPrice)
    : null,
      depositPaid: Boolean(b.payments?.depositPaid),
      balancePaid: Boolean(b.payments?.balancePaid),
      cautionReceived: Boolean(b.payments?.cautionReceived),
      cautionReturned: Boolean(b.payments?.cautionReturned),
      organizerToken: crypto.randomBytes(18).toString("hex"),
      guestToken: crypto.randomBytes(12).toString("hex"),
      googleCalendarId: String(b.googleCalendarId || "").trim() || null,
      printerId: printerChoice.printer?.id || null,
      clientId,
      materials: {
        create: materials.map(m => ({ materialId: m.id }))
      }
    }
  });

  let google = { connected: false, calendar: false, drive: false };
  try {
    google = await googleService.syncEvent(req, event.id);
  } catch (err) {
    console.error("Auto-sync Google aprÃ¨s crÃ©ation :", err.message);
    google = { connected: true, calendar: false, drive: false, warnings: [err.message] };
  }

  await notifyFamilyPlanningUser({
    title:"📅 Nouvel événement ajouté",
    message:`${event.name || "Événement"} — le ${frDateShort(event.eventDate)}${event.installTime?` à ${event.installTime}`:""}.`,
    type:"INFO",
    source:"EVENT_CREATED",
    eventId:event.id
  }).catch(err=>console.error("Notification nouvel événement planning familial :",err));

  res.json({ ok: true, event, google, printerWarning: printerChoice.warning || null });
});

app.put("/api/events/:id", adminOnly, async (req, res) => {
  const b = req.body || {};
  const selected = Array.isArray(b.materials) ? b.materials : [];

  const conflicts = await findMaterialConflicts({
    date: b.date,
    time: b.time,
    pickupDate: b.pickupDate,
    pickupTime: b.pickupTime,
    materialNames: selected,
    sceneJets: b.sceneJets,
    excludeEventId: req.params.id
  });

  if (conflicts.length) {
    return res.status(409).json({
      ok: false,
      error: "material_conflict",
      message: "Ressource indisponible sur cette pÃ©riode.",
      conflicts
    });
  }

  const materials = await ensureSelectedMaterials(prisma, selected);

  const currentEventForPrinter = await prisma.event.findUnique({ where:{id:req.params.id} });
  const printCount = plannedPrints(selected);
  const printerChoice = await choosePrinterForEvent({
    date:b.date,time:b.time,pickupDate:b.pickupDate,pickupTime:b.pickupTime,
    planned:printCount,excludeEventId:req.params.id,currentPrinterId:currentEventForPrinter?.printerId||null
  });

  if(printCount > 0 && !printerChoice.printer){
    return res.status(409).json({
      ok:false,
      error:"printer_conflict",
      message:printerChoice.warning || "Aucune imprimante disponible sur cette pÃ©riode."
    });
  }

  const event = await prisma.$transaction(async tx => {
    await tx.eventMaterial.deleteMany({ where: { eventId: req.params.id } });

    return tx.event.update({
      where: { id: req.params.id },
      data: {
        name: String(b.name || "").trim(),
        type: String(b.type || "").trim() || null,
        eventDate: new Date(`${b.date}T12:00:00`),
        installTime: String(b.time || "").trim() || null,
        pickupDate: b.pickupDate ? new Date(`${b.pickupDate}T12:00:00`) : null,
        pickupTime: String(b.pickupTime || "").trim() || null,
        address: String(b.address || "").trim() || null,
        guestCount: b.guestCount ? Number(b.guestCount) : null,
        organizerName: String(b.organizerName || "").trim() || null,
        organizerEmail: String(b.organizerEmail || "").trim() || null,
        organizerPhone: String(b.organizerPhone || "").trim() || null,
        responsibleCollaboratorId:
  String(b.responsibleCollaboratorId || "").trim() || null,

installerCollaboratorId:
  String(b.installerCollaboratorId || "").trim() || null,

pickupCollaboratorId:
  String(b.pickupCollaboratorId || "").trim() || null,
        bookingStatus: ["QUOTE_DRAFT","QUOTE_SENT","OPTION","CONFIRMED","CANCELLED","DECLINED","COMPLETED"].includes(b.bookingStatus) ? b.bookingStatus : "CONFIRMED",
        optionUntil: b.optionUntil ? new Date(`${b.optionUntil}T12:00:00`) : null,
        sceneJets: b.sceneJets || null,
        portalEnabled: Boolean(b.portalEnabled),
        guestUploadEnabled: Boolean(b.guestUploadEnabled),
        guestVideoEnabled: Boolean(b.guestVideoEnabled),
        guestUploadModerated: Boolean(b.guestUploadModerated),
        portalExpiresAt: b.portalExpiresAt ? new Date(b.portalExpiresAt + "T12:00:00") : null,
        portalPassword: String(b.portalPassword || "").trim() || null,
        fotoshareUrl: String(b.fotoshareUrl || "").trim() || null,
        frameSource: ["NONE","CLIENT","LP28"].includes(b.frameSource) ? b.frameSource : "NONE",
        frameStatus: ["NOT_REQUIRED","TO_DO","IN_PROGRESS","DONE"].includes(b.frameStatus) ? b.frameStatus : "NOT_REQUIRED",
        preparation: b.preparation || defaultPreparation(selected),
notes: String(b.notes || "").trim() || null,

totalPrice:
  b.totalPrice !== "" && b.totalPrice != null
    ? Number(b.totalPrice)
    : null,

deposit:
  b.deposit !== "" && b.deposit != null
    ? Number(b.deposit)
    : null,

balance:
  b.balance !== "" && b.balance != null
    ? Number(b.balance)
    : null,
customPrintCount:
  b.customPrintCount !== "" && b.customPrintCount != null
    ? Number(b.customPrintCount)
    : null,

customPrintPrice:
  b.customPrintPrice !== "" && b.customPrintPrice != null
    ? Number(b.customPrintPrice)
    : null,
googleCalendarId: String(b.googleCalendarId || "").trim() || null,
        printerId: printCount > 0 ? (printerChoice.printer?.id || null) : null,
        depositPaid: Boolean(b.payments?.depositPaid),
        balancePaid: Boolean(b.payments?.balancePaid),
        cautionReceived: Boolean(b.payments?.cautionReceived),
        cautionReturned: Boolean(b.payments?.cautionReturned),
        materials: {
          create: materials.map(m => ({ materialId: m.id }))
        }
      }
    });
  });

  let google = { connected: false, calendar: false, drive: false };
  try {
    google = await googleService.syncEvent(req, event.id);
  } catch (err) {
    console.error("Auto-sync Google aprÃ¨s modification :", err.message);
    google = { connected: true, calendar: false, drive: false, warnings: [err.message] };
  }

  if(
    currentEventForPrinter?.bookingStatus!=="CANCELLED" &&
    event.bookingStatus==="CANCELLED"
  ){
    await notifyFamilyPlanningUser({
      title:"❌ Événement annulé",
      message:`${event.name || "Événement"} — prévu le ${frDateShort(event.eventDate)} a été annulé.`,
      type:"WARNING",
      source:"EVENT_CANCELLED",
      eventId:event.id
    }).catch(err=>console.error("Notification événement annulé planning familial :",err));
  }

  res.json({ ok: true, event, google, printerWarning: printerChoice.warning || null });
});


app.post(
  "/api/events/:id/contract-signature/cancel",
  adminOnly,
  async (req,res)=>{
    try{
      const event=
        await prisma.event.findUnique({
          where:{id:req.params.id}
        });

      if(!event){
        return res.status(404).json({
          ok:false,
          message:"Événement introuvable."
        });
      }

      if(event.contractStatus!=="SIGNED"){
        return res.status(400).json({
          ok:false,
          message:"Ce contrat n'est pas signé."
        });
      }

      const cancelledAt=new Date();

      const historyKey=
        `contractSignatureHistory:${event.id}`;

      let history=[];

      try{
        const current=
          await prisma.appSetting.findUnique({
            where:{key:historyKey}
          });

        if(current?.value){
          const parsed=JSON.parse(current.value);

          if(Array.isArray(parsed)){
            history=parsed;
          }
        }
      }catch(parseErr){
        console.warn(
          "Lecture historique annulation signature :",
          parseErr.message
        );
      }

      history.push({
        signedAt:
          event.contractSignedAt
            ? event.contractSignedAt.toISOString()
            : null,
        signerName:
          event.contractSignerName || null,
        signerEmail:
          event.contractSignerEmail || null,
        cancelledAt:
          cancelledAt.toISOString()
      });

      history=history.slice(-20);

      await prisma.$transaction([
        prisma.appSetting.upsert({
          where:{key:historyKey},
          update:{value:JSON.stringify(history)},
          create:{
            key:historyKey,
            value:JSON.stringify(history)
          }
        }),

        prisma.event.update({
          where:{id:event.id},
          data:{
            contractStatus:"SENT",
            contractSignedAt:null,
            contractSignerName:null,
            contractSignerEmail:null,
            contractSignatureData:null
          }
        })
      ]);

      res.json({
        ok:true,
        status:"SENT",
        cancelledAt,
        signatureUrl:
          event.contractToken
            ? `${appBaseUrl(req)}/signature/${event.contractToken}`
            : null
      });

    }catch(err){
      console.error("Annulation signature contrat :",err);

      res.status(500).json({
        ok:false,
        message:"Impossible d'annuler la signature."
      });
    }
  }
);


app.get("/api/events/:id/documents", adminOnly, async (req,res)=>{
  try{
    const event=await prisma.event.findUnique({
      where:{id:req.params.id},
      select:{id:true,name:true}
    });

    if(!event){
      return res.status(404).json({
        ok:false,
        message:"Événement introuvable."
      });
    }

    const result=
      await googleService.listEventDocuments(
        req,
        event.id
      );

    const documents=(result.documents||[])
      .filter(f=>
        f.mimeType==="application/pdf" ||
        /\.pdf$/i.test(f.name||"")
      )
      .map(normalizeDriveDocument)
      .map(d=>({
        ...d,
        adminUrl:
          `/api/events/${encodeURIComponent(event.id)}` +
          `/documents/${encodeURIComponent(d.id)}/file`
      }));

    res.json({
      ok:true,
      connected:result.connected,
      event,
      documents
    });

  }catch(err){
    console.error("Liste documents événement :",err);

    res.status(500).json({
      ok:false,
      message:err.message || "Impossible de charger les documents."
    });
  }
});

app.post(
  "/api/events/:id/documents",
  adminOnly,
  documentUpload.single("file"),
  async (req,res)=>{
    try{
      if(!req.file){
        return res.status(400).json({
          ok:false,
          message:"Sélectionne un fichier PDF."
        });
      }

      const allowedTypes=[
        "QUOTE",
        "DEPOSIT_INVOICE",
        "INVOICE",
        "PURCHASE_ORDER",
        "OTHER"
      ];

      const type=
        allowedTypes.includes(String(req.body?.type||""))
          ? String(req.body.type)
          : "OTHER";

      const displayName=
        String(req.body?.displayName||"")
          .trim() ||
        documentTypeLabel(type);

      const visibleClient=
        String(req.body?.visibleClient||"true")==="true";

      const uploaded=
        await googleService.uploadEventDocument(
          req,
          req.params.id,
          req.file,
          {
            type,
            displayName,
            visibleClient
          }
        );

      const document=normalizeDriveDocument(uploaded);

      res.json({
        ok:true,
        document:{
          ...document,
          adminUrl:
            `/api/events/${encodeURIComponent(req.params.id)}` +
            `/documents/${encodeURIComponent(document.id)}/file`
        }
      });

    }catch(err){
      console.error("Ajout document événement :",err);

      res.status(500).json({
        ok:false,
        message:err.message || "Impossible d'ajouter le document."
      });
    }
  }
);

app.patch(
  "/api/events/:id/documents/:fileId",
  adminOnly,
  async (req,res)=>{
    try{
      const updated=
        await googleService.updateEventDocumentMetadata(
          req,
          req.params.id,
          req.params.fileId,
          {
            type:req.body?.type,
            displayName:req.body?.displayName,
            visibleClient:Boolean(req.body?.visibleClient)
          }
        );

      res.json({
        ok:true,
        document:normalizeDriveDocument(updated)
      });

    }catch(err){
      console.error("Modification document événement :",err);

      res.status(500).json({
        ok:false,
        message:err.message || "Impossible de modifier le document."
      });
    }
  }
);

app.delete(
  "/api/events/:id/documents/:fileId",
  adminOnly,
  async (req,res)=>{
    try{
      await googleService.deleteEventDocument(
        req,
        req.params.id,
        req.params.fileId
      );

      res.json({ok:true});

    }catch(err){
      console.error("Suppression document événement :",err);

      res.status(500).json({
        ok:false,
        message:err.message || "Impossible de supprimer le document."
      });
    }
  }
);

app.get(
  "/api/events/:id/documents/:fileId/file",
  adminOnly,
  async (req,res)=>{
    try{
      const driveResult=
        await googleService.listEventDocuments(
          req,
          req.params.id
        );

      const document=
        (driveResult.documents||[])
          .find(f=>f.id===req.params.fileId);

      if(!document){
        return res.status(404).end();
      }

      const stream=
        await googleService.getMemoryFromDrive(
          req,
          document.id
        );

      res.setHeader(
        "Content-Type",
        document.mimeType || "application/pdf"
      );

      res.setHeader(
        "Content-Disposition",
        `inline; filename="${String(document.name||"document.pdf")
          .replace(/"/g,"")}"`
      );

      stream.on("error",err=>{
        console.error("Lecture document admin :",err);

        if(!res.headersSent){
          res.status(500).end();
        }
      });

      stream.pipe(res);

    }catch(err){
      console.error("Ouverture document admin :",err);

      if(!res.headersSent){
        res.status(500).end();
      }
    }
  }
);

app.post("/api/events/:id/archive", adminOnly, async (req, res) => {
  const current = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!current) return res.status(404).json({ ok: false, message: "Ã‰vÃ©nement introuvable." });

  const event = await prisma.event.update({
    where: { id: current.id },
    data: { archived: !current.archived }
  });

  res.json({ ok: true, event });
});

app.delete("/api/events/:id", adminOnly, async (req, res) => {
  const event = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!event) return res.status(404).json({ ok: false, message: "Ã‰vÃ©nement introuvable." });

  await googleService.deleteCalendarEvent(req, event);
  await prisma.event.delete({ where: { id: req.params.id } });

  await notifyFamilyPlanningUser({
    title:"🗑️ Événement supprimé",
    message:`${event.name || "Événement"} — prévu le ${frDateShort(event.eventDate)} a été supprimé du planning.`,
    type:"WARNING",
    source:"EVENT_DELETED"
  }).catch(err=>console.error("Notification événement supprimé planning familial :",err));

  // Le dossier Drive est volontairement conservÃ© pour Ã©viter toute perte de photos/documents.
  res.json({ ok: true });
});

app.get("/api/events/:id/share", adminOnly, async (req, res) => {
  let event = await prisma.event.findUnique({ where: { id: req.params.id } });

  if (!event) {
    return res.status(404).json({
      ok: false,
      message: "Événement introuvable."
    });
  }

  // Dès qu'un lien de partage est demandé depuis l'administration,
  // le portail est activé automatiquement afin d'éviter un lien 404.
  if (!event.portalEnabled || !event.guestUploadEnabled) {
    event = await prisma.event.update({
      where: { id: event.id },
      data: {
        portalEnabled: true,
        guestUploadEnabled: true
      }
    });
  }

  const base = appBaseUrl(req);

  const guestUrl = `${base}/portal/${event.guestToken}`;
  const organizerUrl = `${base}/portal/${event.organizerToken}`;

  const qrDataUrl = await QRCode.toDataURL(
    guestUrl,
    { width: 700, margin: 2 }
  );

  res.json({
    ok: true,
    guestUrl,
    organizerUrl,
    qrDataUrl,
    portalEnabled: true
  });
});


app.get("/api/material-planning", moduleViewOnly("materialPlanning"), async (req, res) => {
  const start = req.query.start ? new Date(`${req.query.start}T00:00:00`) : new Date();
  const days = Math.min(Math.max(Number(req.query.days || 7), 1), 31);
  const end = new Date(start);
  end.setDate(end.getDate() + days);

  const events = await prisma.event.findMany({
    where: {
      archived: false,
      eventDate: { lt: end }
    },
    include: {
      printer: true,
      materials: { include: { material: true } }
    },
    orderBy: { eventDate: "asc" }
  });

  const materials = await prisma.material.findMany({
    where: { active: true },
    orderBy: [{ category: "asc" }, { name: "asc" }]
  });
const unavailabilities = await prisma.materialUnavailability.findMany({
  where: {
    status: "ACTIVE",
    startAt: { lt: end },
    endAt: { gte: start }
  },
  include: {
    material: true
  },
  orderBy: {
    startAt: "asc"
  }
});
  const relevantEvents = events.filter(event => {
    const range = eventRangeFromRecord(event);
    return range.end >= start && range.start < end;
  });

  res.json({
    ok: true,
    start: start.toISOString().slice(0,10),
    days,
    materials,
    unavailabilities,
    events: relevantEvents.map(event => ({
      id: event.id,
      name: event.name,
      type: event.type,
      date: event.eventDate.toISOString().slice(0,10),
      time: event.installTime,
      pickupDate: event.pickupDate?.toISOString().slice(0,10) || event.eventDate.toISOString().slice(0,10),
      pickupTime: event.pickupTime,
      address: event.address,
      materials: event.materials.map(x => x.material.name)
    }))
  });
});

app.get("/api/availability", anyModuleViewOnly(["planning","materialPlanning"]), async (req, res) => {
  const date = String(req.query.date || "");
  const time = String(req.query.time || "00:00");
  const pickupDate = String(req.query.pickupDate || date);
  const pickupTime = String(req.query.pickupTime || "23:59");

  if (!date) return res.status(400).json({ ok: false, message: "Date obligatoire." });

  const materials = await prisma.material.findMany({
    where: { active: true },
    orderBy: [{ category: "asc" }, { name: "asc" }]
  });

  const result = [];
  for (const material of materials) {
    const conflicts = await findMaterialConflicts({
      date, time, pickupDate, pickupTime,
      materialNames: [material.name]
    });

    result.push({
      id: material.id,
      name: material.name,
      category: material.category,
      available: conflicts.length === 0,
      conflicts
    });
  }

  res.json({ ok: true, items: result });
});

app.put("/api/events/:id/preparation", adminOnly, async (req, res) => {
  const preparation = req.body?.preparation || {};
  const event = await prisma.event.update({
    where: { id: req.params.id },
    data: { preparation }
  });
  res.json({ ok: true, preparation: event.preparation });
});


app.get("/api/planning-24-months", adminOnly, async (req, res) => {
  const startDate = req.query.start
    ? new Date(`${req.query.start}-01T00:00:00`)
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 24);

  const events = await prisma.event.findMany({
    where: {
      archived: false,
      bookingStatus: { in: ["OPTION", "CONFIRMED"] },
      eventDate: { gte: startDate, lt: endDate }
    },
    include: {
      materials: { include: { material: true } }
    },
    orderBy: { eventDate: "asc" }
  });

  const months = [];
  for (let i = 0; i < 24; i++) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    const monthEvents = events.filter(e => e.eventDate.toISOString().slice(0,7) === key);

    months.push({
      key,
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      total: monthEvents.length,
      confirmed: monthEvents.filter(e => e.bookingStatus === "CONFIRMED").length,
      options: monthEvents.filter(e => e.bookingStatus === "OPTION").length,
      materials: monthEvents.flatMap(e => e.materials.map(x => x.material.name))
    });
  }

  res.json({ ok: true, months });
});


// ---------------- V8 ADMIN ONLY : inventaire / imprimantes / papier ----------------
app.get("/api/admin/inventory", adminOnly, async (req,res)=>{
  const [materials,printers]=await Promise.all([
    prisma.material.findMany({where:{active:true},orderBy:[{category:"asc"},{name:"asc"}]}),
    prisma.printer.findMany({where:{active:true},orderBy:{name:"asc"}})
  ]);
  res.json({ok:true,materials,printers});
});

app.post("/api/admin/printers/:id/reload", adminOnly, async (req,res)=>{
  const capacity=Math.max(Number(req.body?.capacity||0),0);
  if(!capacity) return res.status(400).json({ok:false,message:"CapacitÃ© obligatoire."});

  const printer=await prisma.printer.update({
    where:{id:req.params.id},
    data:{
      loadedCapacity:capacity,
      remainingPrints:capacity,
      lastReloadAt:new Date()
    }
  });

  await prisma.printerPaperMovement.create({
    data:{
      printerId:printer.id,
      quantity:capacity,
      movementType:"RELOAD",
      note:"Nouveau consommable installÃ©"
    }
  });

  res.json({ok:true,printer});
});

app.post("/api/admin/printers/:id/use", adminOnly, async (req,res)=>{
  const used=Math.max(Number(req.body?.used||0),0);
  if(!used) return res.status(400).json({ok:false,message:"Nombre d'impressions obligatoire."});

  const current=await prisma.printer.findUnique({where:{id:req.params.id}});
  if(!current) return res.status(404).json({ok:false,message:"Imprimante introuvable."});

  const remaining=Math.max(current.remainingPrints-used,0);
  const printer=await prisma.printer.update({
    where:{id:current.id},
    data:{
      remainingPrints:remaining,
      totalPrints:{increment:used}
    }
  });

  await prisma.printerPaperMovement.create({
    data:{
      printerId:current.id,
      eventId:req.body?.eventId||null,
      quantity:-used,
      movementType:"USE",
      note:req.body?.note||null
    }
  });

  res.json({ok:true,printer});
});

app.get("/api/admin/printers/:id/history", adminOnly, async (req,res)=>{
  const movements=await prisma.printerPaperMovement.findMany({
    where:{printerId:req.params.id},
    orderBy:{createdAt:"desc"},
    take:100
  });
  res.json({ok:true,movements});
});

// ---------------- V8.2 ADMIN : Assistance & Pilotage ----------------
app.get("/api/admin/assistance", adminOnly, async (req,res)=>{
  await ensureV82Settings();
  const [videos,settingsRows]=await Promise.all([
    prisma.assistanceVideo.findMany({where:{active:true},orderBy:[{sortOrder:"asc"},{createdAt:"asc"}]}),
    prisma.appSetting.findMany()
  ]);
  res.json({ok:true,videos,settings:Object.fromEntries(settingsRows.map(x=>[x.key,x.value]))});
});

app.post("/api/admin/assistance/videos", adminOnly, async (req,res)=>{
  const title=String(req.body?.title||"").trim();
  const url=String(req.body?.url||"").trim();
  if(!title||!url)return res.status(400).json({ok:false,message:"Titre et lien obligatoires."});
  const video=await prisma.assistanceVideo.create({data:{title,url,sortOrder:Number(req.body?.sortOrder||0)}});
  res.json({ok:true,video});
});

app.delete("/api/admin/assistance/videos/:id", adminOnly, async (req,res)=>{
  await prisma.assistanceVideo.delete({where:{id:req.params.id}});
  res.json({ok:true});
});

app.post("/api/admin/assistance/settings", adminOnly, async (req,res)=>{
  for(const key of Object.keys(DEFAULT_ASSISTANCE_SETTINGS)){
    if(typeof req.body?.[key]==="string"){
      await prisma.appSetting.upsert({
        where:{key},
        update:{value:req.body[key].trim()},
        create:{key,value:req.body[key].trim()}
      });
    }
  }
  res.json({ok:true});
});

function portalAccessMode(event){
  const raw=event?.preparation && typeof event.preparation==="object"
    ? event.preparation.portalAccessMode
    : null;
  return ["OPEN","GUEST_LOCKED","ALL_LOCKED"].includes(raw) ? raw : "OPEN";
}

function portalMaintenanceMessage(){
  return "Suite à une maintenance temporaire, l’accès à cette galerie est momentanément verrouillé. Merci de réessayer ultérieurement.";
}

function isPortalAccessLocked(access){
  if(!access?.event)return false;
  const mode=portalAccessMode(access.event);
  return mode==="ALL_LOCKED" || (mode==="GUEST_LOCKED" && access.role==="GUEST");
}

async function portalAccessRaw(token){
  const event=await prisma.event.findFirst({where:{OR:[{guestToken:token},{organizerToken:token}]}});
  if(!event)return null;
  return {event,role:event.organizerToken===token?"ORGANIZER":"GUEST"};
}

async function portalAccess(token){
  const access=await portalAccessRaw(token);
  if(!access || isPortalAccessLocked(access))return null;
  return access;
}

function originalsSettingKey(eventId){
  return `galleryShowOriginalsToGuests:${eventId}`;
}

async function getShowOriginalsToGuests(eventId){
  const row=await prisma.appSetting.findUnique({
    where:{key:originalsSettingKey(eventId)}
  });
  return String(row?.value||"false").toLowerCase()==="true";
}
function safeMedia(m,token){
  return {
    id:m.id,
    url:`/api/guest/${encodeURIComponent(token)}/memories/${m.id}/file`,
    thumbnailUrl:m.mediaType==="PHOTO"?`/api/guest/${encodeURIComponent(token)}/memories/${m.id}/thumbnail`:null,
    originalName:m.originalName,
    mimeType:m.mimeType,
    mediaType:m.mediaType,
    status:m.status,
    uploadedBy:m.uploadedBy,
    sourceGroup:
      m.uploadedBy==="LUMABOOTH_ORIGINAL"
        ? "ORIGINAL"
        : m.uploadedBy==="LUMABOOTH_ANIMATED"
          ? "ANIMATED"
          : "PRINT_GUEST",
    createdAt:m.createdAt
  };
}

// Endpoint public limitÃ© au portail organisateur/invitÃ©.
// Aucun lien d'administration, inventaire ou stock n'est exposÃ© ici.
 
function documentTypeLabel(type){
  return ({
    QUOTE:"Devis",
    DEPOSIT_INVOICE:"Facture d'acompte",
    INVOICE:"Facture",
    PURCHASE_ORDER:"Bon de commande",
    OTHER:"Autre document"
  })[type] || "Document";
}

function normalizeDriveDocument(file){
  const props=file?.appProperties||{};
  const explicitType=String(props.lp28Type||"").trim();

  let type=explicitType;

  if(!type){
    const name=String(file?.name||"");

    if(/devis|quote/i.test(name)){
      type="QUOTE";
    }else if(/acompte/i.test(name) && /facture|invoice/i.test(name)){
      type="DEPOSIT_INVOICE";
    }else if(/facture|invoice/i.test(name)){
      type="INVOICE";
    }else if(/bon[ _-]*de[ _-]*commande|purchase[ _-]*order/i.test(name)){
      type="PURCHASE_ORDER";
    }else{
      type="OTHER";
    }
  }

  const legacyVisible =
    /facture|invoice|devis|quote|bon[ _-]*de[ _-]*commande|purchase[ _-]*order/i
      .test(String(file?.name||""));

  const visibleClient =
    props.lp28VisibleClient != null
      ? String(props.lp28VisibleClient)==="true"
      : legacyVisible;

  const displayName=
    String(
      props.lp28DisplayName ||
      file?.name ||
      documentTypeLabel(type)
    ).replace(/\.pdf$/i,"");

  return {
    id:file.id,
    name:file.name,
    displayName,
    type,
    typeLabel:documentTypeLabel(type),
    visibleClient,
    mimeType:file.mimeType,
    createdTime:file.createdTime||null,
    modifiedTime:file.modifiedTime||null,
    webViewLink:file.webViewLink||null
  };
}


// === Mathis SAV V3 — incidents persistants et synchronisés ===
app.post("/api/guest/:token/mathis/incidents", async (req,res)=>{
  try{
    const access=await portalAccess(req.params.token);
    if(!access?.event || !access.event.portalEnabled)return res.status(404).json({ok:false,message:"Portail indisponible."});
    const firstName=String(req.body?.contactFirstName||"").trim();
    const phone=String(req.body?.contactPhone||"").trim();
    if(!firstName || !phone)return res.status(400).json({ok:false,message:"Prénom et téléphone obligatoires."});
    const incident=await prisma.mathisIncident.create({data:{
      eventId:access.event.id,portalRole:access.role,
      booth:String(req.body?.booth||"").slice(0,120),printer:String(req.body?.printer||"").slice(0,120),
      issue:String(req.body?.issue||"").slice(0,160),diagnostic:String(req.body?.diagnostic||"").slice(0,500),
      led:String(req.body?.led||"").slice(0,180),contactFirstName:firstName.slice(0,80),contactPhone:phone.slice(0,40),
      photosAvailable:req.body?.photosAvailable!==false,printsAvailable:req.body?.printsAvailable===true,status:"REQUESTED"
    }});
    await prisma.appNotification.create({data:{title:"🤖 Mathis — demande N2",message:`${access.event.name} · ${firstName} · ${phone} · ${incident.issue||"Assistance"}`,type:"WARNING",source:"MATHIS",audience:"ADMIN",eventId:access.event.id}}).catch(()=>{});
    res.json({ok:true,incident});
  }catch(err){console.error("Mathis create incident",err);res.status(500).json({ok:false,message:"Impossible de transmettre la demande."});}
});
app.post("/api/guest/:token/mathis/incidents/resolved", async (req,res)=>{
  try{
    const access=await portalAccess(req.params.token);
    if(!access?.event || !access.event.portalEnabled)return res.status(404).json({ok:false,message:"Portail indisponible."});
    const incident=await prisma.mathisIncident.create({data:{
      eventId:access.event.id,portalRole:access.role,level:1,
      booth:String(req.body?.booth||"").slice(0,120),printer:String(req.body?.printer||"").slice(0,120),
      issue:String(req.body?.issue||"").slice(0,160),diagnostic:String(req.body?.diagnostic||"Résolu par Mathis").slice(0,500),
      led:String(req.body?.led||"").slice(0,180),contactFirstName:"Mathis",contactPhone:"",
      photosAvailable:req.body?.photosAvailable!==false,printsAvailable:req.body?.printsAvailable!==false,status:"RESOLVED",resolvedAt:new Date()
    }});
    res.json({ok:true,incident});
  }catch(err){console.error("Mathis resolved N1",err);res.status(500).json({ok:false,message:"Impossible d'enregistrer le compte rendu."});}
});
app.get("/api/guest/:token/mathis/incidents/active", async (req,res)=>{
  try{
    const access=await portalAccess(req.params.token);
    if(!access?.event)return res.status(404).json({ok:false});
    const incident=await prisma.mathisIncident.findFirst({where:{eventId:access.event.id,status:{in:["REQUESTED","REMOTE","LEVEL3"]}},orderBy:{createdAt:"desc"}});
    res.json({ok:true,incident});
  }catch(err){res.status(500).json({ok:false});}
});
app.get("/api/guest/:token/mathis/incidents/:id", async(req,res)=>{
  try{
    const access=await portalAccess(req.params.token);
    if(!access?.event)return res.status(404).json({ok:false});
    const incident=await prisma.mathisIncident.findFirst({where:{id:req.params.id,eventId:access.event.id}});
    if(!incident)return res.status(404).json({ok:false});
    res.json({ok:true,incident});
  }catch(err){res.status(500).json({ok:false});}
});
app.get("/api/admin/mathis/incidents", adminOnly, async(req,res)=>{
  const incidents=await prisma.mathisIncident.findMany({include:{event:{select:{id:true,name:true,eventDate:true}}},orderBy:{createdAt:"desc"},take:100});
  res.json({ok:true,incidents});
});
app.delete("/api/admin/mathis/incidents", adminOnly, async(req,res)=>{
  try{
    const ids=Array.isArray(req.body?.ids)?req.body.ids.map(String).filter(Boolean).slice(0,100):[];
    if(!ids.length)return res.status(400).json({ok:false,message:"Aucune assistance sélectionnée."});
    const result=await prisma.mathisIncident.deleteMany({where:{id:{in:ids},status:{in:["RESOLVED","CLOSED"]}}});
    res.json({ok:true,deleted:result.count});
  }catch(err){console.error("Mathis bulk delete",err);res.status(500).json({ok:false,message:"Suppression impossible."});}
});
app.patch("/api/admin/mathis/incidents/:id/status", adminOnly, async(req,res)=>{
  const allowed=["REMOTE","LEVEL3","RESOLVED","CLOSED"];
  const status=String(req.body?.status||"").toUpperCase();
  if(!allowed.includes(status))return res.status(400).json({ok:false,message:"Statut invalide."});
  const now=new Date();
  const data={status,adminNote:req.body?.adminNote==null?undefined:String(req.body.adminNote).slice(0,1000)};
  if(status==="REMOTE")data.takenAt=now;
  if(status==="LEVEL3")data.level3At=now;
  if(status==="RESOLVED"||status==="CLOSED")data.resolvedAt=now;
  const incident=await prisma.mathisIncident.update({where:{id:req.params.id},data});
  res.json({ok:true,incident});
});
// === fin Mathis SAV V3 ===

app.get("/api/guest/:token/portal", async (req,res)=>{
  try{
    await ensureV82Settings();

    const access=await portalAccessRaw(req.params.token);
    const event=access?.event;

    if(!event || !event.portalEnabled){
      return res.status(404).json({
        ok:false,
        message:"Portail indisponible."
      });
    }

    if(isPortalAccessLocked(access)){
      return res.status(423).json({
        ok:false,
        code:"PORTAL_TEMPORARILY_LOCKED",
        message:portalMaintenanceMessage()
      });
    }

    if(
      event.portalExpiresAt &&
      event.portalExpiresAt < new Date()
    ){
      return res.status(410).json({
        ok:false,
        message:"Portail expiré."
      });
    }

    const [videos,settingsRows]=await Promise.all([
      prisma.assistanceVideo.findMany({
        where:{active:true},
        orderBy:[
          {sortOrder:"asc"},
          {createdAt:"asc"}
        ]
      }),

      prisma.appSetting.findMany({
        where:{
          key:{
            in:[
              "supportPhone",
              "whatsappUrl",
              "googleReviewUrl"
            ]
          }
        }
      })
    ]);

    const safeSettings=
      Object.fromEntries(
        settingsRows.map(x=>[x.key,x.value])
      );

    let organizerDocuments=null;
    let guestShare=null;
    let prep=event.preparation;
    if(typeof prep==="string"){try{prep=JSON.parse(prep)}catch{prep={}}}
    const savedPortal=prep?.portalPermissions&&typeof prep.portalPermissions==="object"?prep.portalPermissions:{};
    const portalPermissions={organizerContract:savedPortal.organizerContract!==false,organizerDocuments:savedPortal.organizerDocuments!==false,organizerShare:savedPortal.organizerShare!==false,organizerMathis:savedPortal.organizerMathis!==false,guestGallery:savedPortal.guestGallery!==false,guestMathis:savedPortal.guestMathis!==false};

    if(access.role==="ORGANIZER"){

      const guestUrl =
        `${appBaseUrl(req)}/portal/${event.guestToken}`;

      const qrDataUrl =
        await QRCode.toDataURL(
          guestUrl,
          {
            width:900,
            margin:2,
            errorCorrectionLevel:"M"
          }
        );

      guestShare={
        guestUrl,
        qrDataUrl
      };

      let clientDocuments=[];

      try{
        const driveResult=
          await googleService.listEventDocuments(
            req,
            event.id
          );

        clientDocuments=(driveResult.documents||[])
          .filter(f=>
            f.mimeType==="application/pdf" ||
            /\.pdf$/i.test(f.name||"")
          )
          .map(normalizeDriveDocument)
          .filter(f=>f.visibleClient)
          .map(f=>({
            ...f,
            url:
              `/api/guest/${encodeURIComponent(req.params.token)}` +
              `/documents/${encodeURIComponent(f.id)}`
          }));

      }catch(err){
        console.error(
          "Documents portail organisateur :",
          err.message
        );
      }

      organizerDocuments={
        contract:{
          status:event.contractStatus || "NOT_SENT",

          signed:
            event.contractStatus==="SIGNED",

          signedAt:
            event.contractSignedAt || null,

          signerName:
            event.contractSignerName || null,

          pdfUrl:
            `/api/guest/${encodeURIComponent(req.params.token)}/contract.pdf`,

          signatureUrl:
            event.contractToken
              ? `/signature/${encodeURIComponent(event.contractToken)}`
              : null
        },

        files:clientDocuments,
        invoices:clientDocuments.filter(d=>
          d.type==="INVOICE" ||
          d.type==="DEPOSIT_INVOICE"
        )
      };
    }

    if(access.role==="ORGANIZER"&&organizerDocuments){
      if(!portalPermissions.organizerContract)organizerDocuments.contract=null;
      if(!portalPermissions.organizerDocuments){organizerDocuments.files=[];organizerDocuments.invoices=[];}
      if(!portalPermissions.organizerShare)guestShare=null;
    }

    res.json({
      ok:true,
      portalPermissions,

      event:{
        name:event.name,
        type:event.type,
        date:event.eventDate.toISOString().slice(0,10),

        guestUploadEnabled:
          event.guestUploadEnabled,

        guestVideoEnabled:
          event.guestVideoEnabled,

        guestUploadModerated:
          event.guestUploadModerated,

        showOriginalsToGuests:
          await getShowOriginalsToGuests(event.id),

        fotoshareUrl:
          event.fotoshareUrl
      },

      assistanceVideos:
        videos.map(v=>({
          id:v.id,
          title:v.title,
          url:v.url
        })),

      role:access.role,

      documents:organizerDocuments,

      guestShare,

      support:{
        phone:
          safeSettings.supportPhone || "",

        whatsappUrl:
          safeSettings.whatsappUrl || "",

        googleReviewUrl:
          safeSettings.googleReviewUrl || ""
      }
    });

  }catch(err){
    console.error(
      "Portail organisateur/invité :",
      err
    );

    res.status(500).json({
      ok:false,
      message:"Impossible de charger le portail."
    });
  }
});
app.post("/api/guest/:token/gallery-originals-visibility", async (req,res)=>{
  const access=await portalAccess(req.params.token);

  if(!access||access.role!=="ORGANIZER"||!access.event.portalEnabled){
    return res.status(403).json({
      ok:false,
      message:"Réservé à l'organisateur."
    });
  }

  const show=Boolean(req.body?.show);

  await prisma.appSetting.upsert({
    where:{key:originalsSettingKey(access.event.id)},
    update:{value:String(show)},
    create:{
      key:originalsSettingKey(access.event.id),
      value:String(show)
    }
  });

  res.json({ok:true,showOriginalsToGuests:show});
});

app.get(
  "/api/guest/:token/contract.pdf",
  async (req,res)=>{
    try{

      const access=
        await portalAccess(req.params.token);

      if(
        !access ||
        access.role!=="ORGANIZER" ||
        !access.event.portalEnabled
      ){
        return res.status(403).json({
          ok:false,
          message:"Accès réservé à l'organisateur."
        });
      }

      const event=
        await prisma.event.findUnique({
          where:{
            id:access.event.id
          },

          include:{
            client:true,

            materials:{
              include:{
                material:true
              }
            }
          }
        });

      if(!event){
        return res.status(404).json({
          ok:false,
          message:"Événement introuvable."
        });
      }

      const pdf=
        await contractService.generateContractPdf(
          event
        );

      const safeName=
        String(event.name || "contrat")
          .replace(/[^a-z0-9_-]+/gi,"_")
          .replace(/^_+|_+$/g,"");

      res.setHeader(
        "Content-Type",
        "application/pdf"
      );

      res.setHeader(
        "Content-Disposition",
        `inline; filename="Contrat_${safeName || "evenement"}.pdf"`
      );

      res.send(pdf);

    }catch(err){
      console.error(
        "Contrat portail organisateur :",
        err
      );

      res.status(500).json({
        ok:false,
        message:"Impossible d'ouvrir le contrat."
      });
    }
  }
);
app.get(
  "/api/guest/:token/documents/:fileId",
  async (req,res)=>{
    try{

      const access=
        await portalAccess(req.params.token);

      if(
        !access ||
        access.role!=="ORGANIZER" ||
        !access.event.portalEnabled
      ){
        return res.status(403).end();
      }

      const driveResult=
        await googleService.listEventDocuments(
          req,
          access.event.id
        );

      const document=
        (driveResult.documents || [])
          .map(normalizeDriveDocument)
          .find(f=>
            f.id===req.params.fileId &&
            f.visibleClient
          );

      if(!document){
        return res.status(404).end();
      }

      const stream=
        await googleService.getMemoryFromDrive(
          req,
          document.id
        );

      res.setHeader(
        "Content-Type",
        document.mimeType ||
        "application/pdf"
      );

      res.setHeader(
        "Content-Disposition",
        `inline; filename="${String(document.name || "facture.pdf")
          .replace(/"/g,"") }"`
      );

      stream.on("error",err=>{
        console.error(
          "Lecture facture Drive :",
          err
        );

        if(!res.headersSent){
          res.status(500).end();
        }
      });

      stream.pipe(res);

    }catch(err){
      console.error(
        "Document portail organisateur :",
        err
      );

      if(!res.headersSent){
        res.status(500).end();
      }
    }
  }
);
// ---------------- V8.2.2 : LP28 Memories ----------------
app.use("/memories", express.static(MEMORIES_DIR, {fallthrough:false,maxAge:"1h"}));

app.get("/api/guest/:token/memories", async (req,res)=>{
  const access=await portalAccess(req.params.token);
  if(!access?.event?.portalEnabled)return res.status(404).json({ok:false,message:"Portail indisponible."});

  const showOriginalsToGuests=
    access.role==="ORGANIZER"
      ? true
      : await getShowOriginalsToGuests(access.event.id);

  const where={
    eventId:access.event.id,
    status:access.role==="ORGANIZER"?{in:["VISIBLE","HIDDEN","PENDING"]}:"VISIBLE",
    ...(access.role!=="ORGANIZER"&&!showOriginalsToGuests
      ? {uploadedBy:{not:"LUMABOOTH_ORIGINAL"}}
      : {})
  };

  const media=await prisma.memoryMedia.findMany({where,orderBy:{createdAt:"asc"}});
  res.json({
    ok:true,
    role:access.role,
    showOriginalsToGuests,
    media:media.map(m=>safeMedia(m,req.params.token))
  });
});

app.get("/api/guest/:token/memories/:id/thumbnail", async (req,res)=>{
  try{
    const access=await portalAccess(req.params.token);
    if(!access?.event?.portalEnabled)return res.status(404).end();

    const media=await prisma.memoryMedia.findFirst({
      where:{id:req.params.id,eventId:access.event.id}
    });
    if(!media)return res.status(404).end();
    if(access.role!=="ORGANIZER"&&media.status!=="VISIBLE")return res.status(403).end();
    if(access.role!=="ORGANIZER"&&media.uploadedBy==="LUMABOOTH_ORIGINAL"&&!(await getShowOriginalsToGuests(access.event.id)))return res.status(403).end();

    // Drive fournit une miniature optimisée. Le navigateur la télécharge directement
    // depuis Google : les octets de l'image ne transitent donc pas par Render.
    if(media.storageType==="DRIVE"&&media.driveFileId&&media.mediaType==="PHOTO"){
      const thumbnailLink=await googleService.getMemoryThumbnailLink(req,media.driveFileId);
      if(thumbnailLink){
        res.setHeader("Cache-Control","private, max-age=1800");
        return res.redirect(302,thumbnailLink);
      }
    }

    // Repli sûr : aucune galerie cassée si Drive ne propose pas de miniature.
    return res.redirect(302,`/api/guest/${encodeURIComponent(req.params.token)}/memories/${encodeURIComponent(media.id)}/file`);
  }catch(err){
    console.error("Miniature souvenir :",err);
    return res.redirect(302,`/api/guest/${encodeURIComponent(req.params.token)}/memories/${encodeURIComponent(req.params.id)}/file`);
  }
});

app.get("/api/guest/:token/memories/:id/file", async (req,res)=>{
  try{
    const access=await portalAccess(req.params.token);

    if(!access?.event?.portalEnabled){
      return res.status(404).end();
    }

    const media=await prisma.memoryMedia.findFirst({
      where:{
        id:req.params.id,
        eventId:access.event.id
      }
    });

    if(!media){
      return res.status(404).end();
    }

    if(
      access.role!=="ORGANIZER" &&
      media.status!=="VISIBLE"
    ){
      return res.status(403).end();
    }

    if(
      access.role!=="ORGANIZER" &&
      media.uploadedBy==="LUMABOOTH_ORIGINAL" &&
      !(await getShowOriginalsToGuests(access.event.id))
    ){
      return res.status(403).end();
    }

    res.setHeader(
      "Content-Type",
      media.mimeType || "application/octet-stream"
    );

    res.setHeader(
      "Cache-Control",
      "private, max-age=3600"
    );

    if(
      media.storageType==="DRIVE" &&
      media.driveFileId
    ){
      const stream=
        await googleService.getMemoryFromDrive(
          req,
          media.driveFileId
        );

      stream.on("error",err=>{
        console.error("Lecture souvenir Drive :",err);

        if(!res.headersSent){
          res.status(500).end();
        }
      });

      return stream.pipe(res);
    }

    const localPath=
      path.join(MEMORIES_DIR,media.fileName);

    if(!fs.existsSync(localPath)){
      return res.status(404).end();
    }

    return res.sendFile(localPath);

  }catch(err){
    console.error("Lecture souvenir :",err);

    if(!res.headersSent){
      res.status(500).end();
    }
  }
});
app.post(
  "/api/guest/:token/memories/upload",
  memoriesUpload.array("files",100),
  async (req,res)=>{

    const access=
      await portalAccess(req.params.token);

    if(!access?.event?.portalEnabled){
      for(const f of req.files||[]){
        fs.unlink(f.path,()=>{});
      }

      return res.status(404).json({
        ok:false,
        message:"Portail indisponible."
      });
    }

    const files=req.files||[];

    if(!files.length){
      return res.status(400).json({
        ok:false,
        message:"Aucun fichier reçu."
      });
    }

    let uploadedCount=0;

    try{

      for(const f of files){

        const isVideo=
          f.mimetype.startsWith("video/");

        const allowed=
          isVideo
            ? access.event.guestVideoEnabled
            : (
                access.role==="ORGANIZER" ||
                access.event.guestUploadEnabled
              );

        if(!allowed){
          fs.unlink(f.path,()=>{});
          continue;
        }

        try{

          const driveFile=
            await googleService.uploadMemoryToDrive(
              req,
              access.event,
              f
            );

          await prisma.memoryMedia.create({
            data:{
              eventId:access.event.id,
              fileName:f.filename,
              originalName:f.originalname,
              mimeType:f.mimetype,
              sizeBytes:f.size,

              mediaType:
                isVideo ? "VIDEO" : "PHOTO",

              status:
                access.event.guestUploadModerated
                  ? "PENDING"
                  : "VISIBLE",

              uploadedBy:access.role,

              driveFileId:driveFile.id,

              driveUrl:
                driveFile.webViewLink ||
                driveFile.webContentLink ||
                null,

              storageType:"DRIVE"
            }
          });

          uploadedCount++;

        }finally{
          fs.unlink(f.path,()=>{});
        }
      }

      res.json({
        ok:true,
        uploaded:uploadedCount
      });

    }catch(err){

      console.error(
        "Upload souvenir Drive :",
        err
      );

      for(const f of files){
        if(fs.existsSync(f.path)){
          fs.unlink(f.path,()=>{});
        }
      }

      res.status(500).json({
        ok:false,
        message:
          "Impossible d'enregistrer les souvenirs sur Google Drive."
      });
    }
  }
);

app.post("/api/guest/:token/memories/:id/hide", async (req,res)=>{
  const access=await portalAccess(req.params.token);
  if(!access||access.role!=="ORGANIZER")return res.status(403).json({ok:false,message:"RÃ©servÃ© Ã  l'organisateur."});
  const media=await prisma.memoryMedia.findFirst({where:{id:req.params.id,eventId:access.event.id}});
  if(!media)return res.status(404).json({ok:false});
  await prisma.memoryMedia.update({where:{id:media.id},data:{status:"HIDDEN"}}); res.json({ok:true});
});
app.post("/api/guest/:token/memories/:id/show", async (req,res)=>{
  const access=await portalAccess(req.params.token);
  if(!access||access.role!=="ORGANIZER")return res.status(403).json({ok:false,message:"RÃ©servÃ© Ã  l'organisateur."});
  const media=await prisma.memoryMedia.findFirst({where:{id:req.params.id,eventId:access.event.id}});
  if(!media)return res.status(404).json({ok:false});
  await prisma.memoryMedia.update({where:{id:media.id},data:{status:"VISIBLE"}}); res.json({ok:true});
});
app.post("/api/guest/:token/memories/:id/approve", async (req,res)=>{
  const access=await portalAccess(req.params.token);
  if(!access||access.role!=="ORGANIZER")return res.status(403).json({ok:false,message:"RÃ©servÃ© Ã  l'organisateur."});
  const media=await prisma.memoryMedia.findFirst({where:{id:req.params.id,eventId:access.event.id}});
  if(!media)return res.status(404).json({ok:false});
  await prisma.memoryMedia.update({where:{id:media.id},data:{status:"VISIBLE"}}); res.json({ok:true});
});
app.delete("/api/guest/:token/memories/:id", async (req,res)=>{
  const access=await portalAccess(req.params.token);
  if(!access||access.role!=="ORGANIZER")return res.status(403).json({ok:false,message:"RÃ©servÃ© Ã  l'organisateur."});
  if(req.body?.confirmation!=="DELETE")return res.status(400).json({ok:false,message:"Saisissez DELETE en majuscules pour confirmer."});
  const media=await prisma.memoryMedia.findFirst({where:{id:req.params.id,eventId:access.event.id}});
  if(!media)return res.status(404).json({ok:false});
  await prisma.memoryMedia.delete({where:{id:media.id}});
  fs.unlink(path.join(MEMORIES_DIR,media.fileName),()=>{});
  res.json({ok:true});
});


// ---------------- V8.3 ADMIN : Galeries LP28 Memories ----------------

app.get("/api/admin/galleries", moduleViewOnly("galleries"), async (req, res) => {
  const events = await prisma.event.findMany({
    where: { portalEnabled: true },
    orderBy: { eventDate: "desc" },
    include: { memories: true }
  });

  res.json({
    ok: true,
    galleries: events.map(e => {
      const active = e.memories.filter(m => !m.deletedAt);

      return {
        id: e.id,
        name: e.name,
        type: e.type,
        date: e.eventDate.toISOString().slice(0, 10),
        status: e.status || null,
        bookingStatus: e.bookingStatus || null,
        archived: Boolean(e.archived),
        portalExpiresAt: e.portalExpiresAt
          ? e.portalExpiresAt.toISOString().slice(0, 10)
          : null,
        organizerToken: e.organizerToken,
        guestToken: e.guestToken,
        fotoshareUrl: e.fotoshareUrl,
        portalAccessMode: portalAccessMode(e),
        total: active.length,
        photos: active.filter(m => m.mediaType === "PHOTO").length,
        videos: active.filter(m => m.mediaType === "VIDEO").length,
        hidden: active.filter(m => m.status === "HIDDEN").length,
        pending: active.filter(m => m.status === "PENDING").length
      };
    })
  });
});

app.get("/api/admin/galleries/:eventId", moduleViewOnly("galleries"), async (req, res) => {
  const event = await prisma.event.findUnique({
    where: { id: req.params.eventId }
  });

  if (!event) {
    return res.status(404).json({
      ok: false,
      message: "Événement introuvable."
    });
  }

  const media = await prisma.memoryMedia.findMany({
    where: {
      eventId: event.id,
      deletedAt: null
    },
    orderBy: { createdAt: "asc" }
  });

  const mediaWithUrls = media.map(m => ({
  ...m,
  sourceGroup:
      m.uploadedBy==="LUMABOOTH_ORIGINAL"
        ? "ORIGINAL"
        : m.uploadedBy==="LUMABOOTH_ANIMATED"
          ? "ANIMATED"
          : "PRINT_GUEST",

  url:`/api/admin/galleries/media/${encodeURIComponent(m.id)}/file`,
  thumbnailUrl:m.mediaType==="PHOTO"
    ? `/api/admin/galleries/media/${encodeURIComponent(m.id)}/thumbnail`
    : null
}));

  res.json({
    ok: true,
    event: {
      id: event.id,
      name: event.name,
      type: event.type,
      date: event.eventDate.toISOString().slice(0, 10),
      portalExpiresAt: event.portalExpiresAt
        ? event.portalExpiresAt.toISOString().slice(0, 10)
        : null,
      organizerToken: event.organizerToken,
      guestToken: event.guestToken,
      fotoshareUrl: event.fotoshareUrl,
      portalAccessMode: portalAccessMode(event),
      showOriginalsToGuests: await getShowOriginalsToGuests(event.id),
      lumaboothWebhookPath: event.organizerToken
        ? `/api/lumabooth/event/${encodeURIComponent(event.organizerToken)}`
        : null
    },
    media: mediaWithUrls
  });
});

app.get("/api/admin/galleries/media/:id/thumbnail", moduleViewOnly("galleries"), async (req,res)=>{
  try{
    const media=await prisma.memoryMedia.findUnique({where:{id:req.params.id}});
    if(!media)return res.status(404).end();

    if(media.storageType==="DRIVE"&&media.driveFileId&&media.mediaType==="PHOTO"){
      const thumbnailLink=await googleService.getMemoryThumbnailLink(req,media.driveFileId);
      if(thumbnailLink){
        res.setHeader("Cache-Control","private, max-age=1800");
        return res.redirect(302,thumbnailLink);
      }
    }
    return res.redirect(302,`/api/admin/galleries/media/${encodeURIComponent(media.id)}/file`);
  }catch(err){
    console.error("Miniature admin souvenir :",err);
    return res.status(500).end();
  }
});

app.get("/api/admin/galleries/media/:id/file", moduleViewOnly("galleries"), async (req,res)=>{
  try{
    const media=await prisma.memoryMedia.findUnique({where:{id:req.params.id}});
    if(!media)return res.status(404).end();

    res.setHeader("Content-Type",media.mimeType||"application/octet-stream");
    res.setHeader("Cache-Control","private, max-age=3600");

    if(media.storageType==="DRIVE"&&media.driveFileId){
      const stream=await googleService.getMemoryFromDrive(req,media.driveFileId);
      stream.on("error",err=>{
        console.error("Lecture souvenir Drive admin :",err);
        if(!res.headersSent)res.status(500).end();
      });
      return stream.pipe(res);
    }

    const localPath=media.storagePath || path.join(MEMORIES_DIR,media.fileName);
    if(!localPath||!fs.existsSync(localPath))return res.status(404).end();
    return res.sendFile(localPath);
  }catch(err){
    console.error("Lecture souvenir admin :",err);
    if(!res.headersSent)res.status(500).end();
  }
});

app.post("/api/admin/galleries/:eventId/access-mode", adminOnly, async (req,res)=>{
  const mode=String(req.body?.mode||"").trim();
  if(!["OPEN","GUEST_LOCKED","ALL_LOCKED"].includes(mode)){
    return res.status(400).json({ok:false,message:"Mode d’accès invalide."});
  }

  const event=await prisma.event.findUnique({where:{id:req.params.eventId}});
  if(!event)return res.status(404).json({ok:false,message:"Événement introuvable."});

  const preparation=event.preparation&&typeof event.preparation==="object"&&!Array.isArray(event.preparation)
    ? {...event.preparation}
    : {};
  preparation.portalAccessMode=mode;

  await prisma.event.update({
    where:{id:event.id},
    data:{preparation}
  });

  res.json({ok:true,portalAccessMode:mode});
});

app.post("/api/admin/galleries/media/bulk-delete", adminOnly, async (req,res)=>{
  if(String(req.body?.confirmation||"")!=="DELETE"){
    return res.status(400).json({ok:false,message:"Saisissez DELETE pour confirmer."});
  }

  const ids=Array.isArray(req.body?.ids)
    ? [...new Set(req.body.ids.map(x=>String(x||"").trim()).filter(Boolean))].slice(0,1000)
    : [];
  if(!ids.length)return res.status(400).json({ok:false,message:"Aucun fichier sélectionné."});

  const mediaList=await prisma.memoryMedia.findMany({where:{id:{in:ids}}});
  const deleted=[];
  const failed=[];

  for(const media of mediaList){
    try{
      if(media.storageType==="DRIVE"&&media.driveFileId){
        await googleService.deleteMemoryFromDrive(req,media.driveFileId);
      }else{
        const localPath=media.storagePath || (media.fileName?path.join(MEMORIES_DIR,media.fileName):null);
        if(localPath&&fs.existsSync(localPath))fs.unlinkSync(localPath);
      }

      await prisma.memoryMedia.delete({where:{id:media.id}});
      deleted.push(media.id);
    }catch(err){
      console.error("Suppression en lot Memories :",media.id,err.message);
      failed.push({id:media.id,message:err.message||"Suppression impossible."});
    }
  }

  const status=failed.length&&deleted.length===0?500:200;
  res.status(status).json({ok:failed.length===0,deleted,failed});
});

app.post("/api/admin/galleries/media/:id/:action", adminOnly, async (req, res) => {
  const action = req.params.action;

  if (!["hide", "show"].includes(action)) {
    return res.status(400).json({
      ok: false,
      message: "Action invalide."
    });
  }

  const media = await prisma.memoryMedia.update({
    where: { id: req.params.id },
    data: {
      status: action === "hide" ? "HIDDEN" : "VISIBLE"
    }
  });

  res.json({ ok: true, media });
});

app.delete("/api/admin/galleries/media/:id", adminOnly, async (req, res) => {
  if (String(req.body?.confirmation || "") !== "DELETE") {
    return res.status(400).json({ok:false,message:"Saisissez DELETE pour confirmer."});
  }

  const media=await prisma.memoryMedia.findUnique({where:{id:req.params.id}});
  if(!media)return res.status(404).json({ok:false,message:"Souvenir introuvable."});

  try{
    if(media.storageType==="DRIVE"&&media.driveFileId){
      await googleService.deleteMemoryFromDrive(req,media.driveFileId);
    }else{
      const localPath=media.storagePath || (media.fileName?path.join(MEMORIES_DIR,media.fileName):null);
      if(localPath&&fs.existsSync(localPath))fs.unlinkSync(localPath);
    }

    await prisma.memoryMedia.delete({where:{id:media.id}});
    res.json({ok:true});
  }catch(err){
    console.error("Suppression fichier Memories admin :",err);
    return res.status(500).json({
      ok:false,
      message:"Suppression impossible. Le fichier a été conservé dans LP28 pour éviter une désynchronisation avec Google Drive."
    });
  }
});

app.post("/api/admin/galleries/:eventId/expiration", adminOnly, async (req, res) => {
  const value = String(req.body?.portalExpiresAt || "").trim();

  const event = await prisma.event.update({
    where: { id: req.params.eventId },
    data: {
      portalExpiresAt: value
        ? new Date(value + "T12:00:00")
        : null
    }
  });

  res.json({
    ok: true,
    portalExpiresAt: event.portalExpiresAt
  });
});
app.get("/api/collaborators", moduleViewOnly("collaborators"), async (req, res) => {
  const collaborators = await prisma.collaborator.findMany({
    where: {
      active: true
    },
    orderBy: [
      { isDefault: "desc" },
      { firstName: "asc" },
      { lastName: "asc" }
    ]
  });

  res.json({
    ok: true,
    collaborators
  });
});

app.post("/api/collaborators", adminOnly, async (req, res) => {
  const b = req.body || {};

  const firstName = String(b.firstName || "").trim();
  const lastName = String(b.lastName || "").trim() || null;
  const phone = String(b.phone || "").trim() || null;
  const email = String(b.email || "").trim() || null;

  if (!firstName) {
    return res.status(400).json({
      ok: false,
      message: "Le prénom est obligatoire."
    });
  }

  if (b.isDefault) {
    await prisma.collaborator.updateMany({
      data: { isDefault: false }
    });
  }

  const collaborator = await prisma.collaborator.create({
    data: {
      firstName,
      lastName,
      phone,
      email,
      active: b.active !== false,
      isDefault: Boolean(b.isDefault),
      canInstall: b.canInstall !== false,
      canPickup: b.canPickup !== false,
      canManage: b.canManage !== false
    }
  });

  res.json({
    ok: true,
    collaborator
  });
});

app.patch("/api/collaborators/:id", adminOnly, async (req, res) => {
  const b = req.body || {};

  const current = await prisma.collaborator.findUnique({
    where: { id: req.params.id }
  });

  if (!current) {
    return res.status(404).json({
      ok: false,
      message: "Collaborateur introuvable."
    });
  }

  if (b.isDefault === true) {
    await prisma.collaborator.updateMany({
      where: {
        id: { not: req.params.id }
      },
      data: {
        isDefault: false
      }
    });
  }

  const collaborator = await prisma.collaborator.update({
    where: { id: req.params.id },
    data: {
      ...(b.firstName !== undefined
        ? { firstName: String(b.firstName).trim() }
        : {}),
      ...(b.lastName !== undefined
        ? { lastName: String(b.lastName).trim() || null }
        : {}),
      ...(b.phone !== undefined
        ? { phone: String(b.phone).trim() || null }
        : {}),
      ...(b.email !== undefined
        ? { email: String(b.email).trim() || null }
        : {}),
      ...(b.active !== undefined
        ? { active: Boolean(b.active) }
        : {}),
      ...(b.isDefault !== undefined
        ? { isDefault: Boolean(b.isDefault) }
        : {}),
      ...(b.canInstall !== undefined
        ? { canInstall: Boolean(b.canInstall) }
        : {}),
      ...(b.canPickup !== undefined
        ? { canPickup: Boolean(b.canPickup) }
        : {}),
      ...(b.canManage !== undefined
        ? { canManage: Boolean(b.canManage) }
        : {})
    }
  });

  res.json({
    ok: true,
    collaborator
  });
});

app.put("/api/events/:eventId/collaborator-access-permissions", adminOnly, async (req,res)=>{
  const event=await prisma.event.findUnique({where:{id:req.params.eventId}});
  if(!event)return res.status(404).json({ok:false,message:"Événement introuvable."});

  const b=req.body||{};
  const data={
    canSeeClient:b.canSeeClient!==false,
    canSeeContract:b.canSeeContract!==false,
    canSeeInvoice:Boolean(b.canSeeInvoice),
    canSeeBalance:!eventIsGifted(event)&&b.canSeeBalance!==false,
    canManageCaution:b.canManageCaution!==false,
    canSeeInstructions:b.canSeeInstructions!==false
  };

  const updated=await prisma.collaboratorAccess.updateMany({
    where:{eventId:event.id,active:true},
    data
  });

  res.json({ok:true,updated:updated.count,permissions:data});
});

app.post("/api/events/:eventId/collaborator-access", adminOnly, async (req, res) => {
  const b = req.body || {};

  const collaboratorId = String(b.collaboratorId || "").trim();

  if (!collaboratorId) {
    return res.status(400).json({
      ok: false,
      message: "Collaborateur obligatoire."
    });
  }

  const event = await prisma.event.findUnique({
    where: { id: req.params.eventId }
  });

  if (!event) {
    return res.status(404).json({
      ok: false,
      message: "Événement introuvable."
    });
  }

  const collaborator = await prisma.collaborator.findUnique({
    where: { id: collaboratorId }
  });

  if (!collaborator || !collaborator.active) {
    return res.status(404).json({
      ok: false,
      message: "Collaborateur introuvable ou inactif."
    });
  }

  const assignedIds = [
    event.responsibleCollaboratorId,
    event.installerCollaboratorId,
    event.pickupCollaboratorId
  ].filter(Boolean);

  if (!assignedIds.includes(collaboratorId)) {
    return res.status(400).json({
      ok: false,
      message: "Ce collaborateur n'est pas affecté à cette prestation."
    });
  }

  const existing = await prisma.collaboratorAccess.findUnique({
    where: {
      eventId_collaboratorId: {
        eventId: event.id,
        collaboratorId
      }
    }
  });

  const token = existing?.token ||
    crypto.randomBytes(24).toString("hex");

  const access = await prisma.collaboratorAccess.upsert({
    where: {
      eventId_collaboratorId: {
        eventId: event.id,
        collaboratorId
      }
    },

    update: {
      active: true,

      canSeeClient: b.canSeeClient !== false,
      canSeeContract: b.canSeeContract !== false,
      canSeeInvoice: Boolean(b.canSeeInvoice),
      canSeeBalance: !eventIsGifted(event) && Boolean(b.canSeeBalance),
      canManageCaution: b.canManageCaution !== false,
      canSeeInstructions: b.canSeeInstructions !== false,

      missionNotes:
        String(b.missionNotes || "").trim() || null
    },

    create: {
      eventId: event.id,
      collaboratorId,
      token,

      active: true,

      canSeeClient: b.canSeeClient !== false,
      canSeeContract: b.canSeeContract !== false,
      canSeeInvoice: Boolean(b.canSeeInvoice),
      canSeeBalance: !eventIsGifted(event) && Boolean(b.canSeeBalance),
      canManageCaution: b.canManageCaution !== false,
      canSeeInstructions: b.canSeeInstructions !== false,

      missionNotes:
        String(b.missionNotes || "").trim() || null
    }
  });

  const base = appBaseUrl(req);

  const accessUrl =
    `${base}/collaborateur/${access.token}`;

  res.json({
    ok: true,
    access,
    accessUrl
  });
});

app.post("/api/collaborator-access/:id/revoke", adminOnly, async (req, res) => {
  const current = await prisma.collaboratorAccess.findUnique({
    where: { id: req.params.id }
  });

  if (!current) {
    return res.status(404).json({
      ok: false,
      message: "Accès collaborateur introuvable."
    });
  }

  const access = await prisma.collaboratorAccess.update({
    where: { id: req.params.id },
    data: {
      active: false
    }
  });

  res.json({
    ok: true,
    access
  });
});

app.get("/api/collaborator-portal/:token", async (req, res) => {
  const access = await prisma.collaboratorAccess.findUnique({
    where: {
      token: req.params.token
    },
    include: {
      collaborator: true,
      event: {
  include: {
    client: true,

    materials: {
      include: {
        material: true
      }
    },

    collaboratorActions: {
  orderBy: {
    createdAt: "desc"
  }
}
  }
}
    }
  });

  if (!access || !access.active) {
    return res.status(404).json({
      ok: false,
      message: "Accès invalide ou expiré."
    });
  }

  const event = access.event;
  const effectivePermissions=effectiveCollaboratorPermissions(event,access);
  const canSeeOperationalBalance=effectivePermissions.canSeeBalance;
let driveDocuments = [];

try {
  const driveResult = await googleService.listEventDocuments(
    req,
    event.id
  );

  driveDocuments = driveResult.documents || [];
} catch (err) {
  console.error(
    "Documents collaborateur :",
    err.message
  );
}
  res.json({
    ok: true,

    collaborator: {
      firstName: access.collaborator.firstName,
      lastName: access.collaborator.lastName
    },

    mission: {
      status: access.status,

      name: event.name,
      type: event.type,

      date: event.eventDate.toISOString().slice(0,10),
      installTime: event.installTime,

      pickupDate: event.pickupDate
        ? event.pickupDate.toISOString().slice(0,10)
        : null,

      pickupTime: event.pickupTime,

      address: event.address,

      materials: event.materials.map(x => ({
        name: x.material.name,
        quantity: x.quantity || 1
      }))
    },

    client: effectivePermissions.canSeeClient
      ? {
          name: event.organizerName,
          phone: event.organizerPhone,
          email: event.organizerEmail
        }
      : null,

    balance: canSeeOperationalBalance
      ? eventOperationalRemaining(event)
      : null,

      balancePaid: canSeeOperationalBalance
  ? event.balancePaid
  : null,

    caution: effectivePermissions.canManageCaution
      ? {
          received: event.cautionReceived,
          returned: event.cautionReturned
        }
      : null,

actions: (event.collaboratorActions || []).map(a => ({
  action: a.action,
  createdAt: a.createdAt
})),

    instructions: effectivePermissions.canSeeInstructions
      ? access.missionNotes
      : null,
documents: {
  contract: effectivePermissions.canSeeContract
    ? {
        available: true,
        signed: event.contractStatus === "SIGNED",
        status: event.contractStatus || "NOT_SENT",
        signedAt: event.contractSignedAt || null,
        signerName: event.contractSignerName || null,
        url:
          `/api/collaborator-portal/${encodeURIComponent(req.params.token)}/contract.pdf`
      }
    : null,

  invoice: effectivePermissions.canSeeInvoice
    ? driveDocuments.find(f =>
        /facture|invoice/i.test(f.name)
      ) || null
    : null
},
    permissions: {
      contract: effectivePermissions.canSeeContract,
      invoice: effectivePermissions.canSeeInvoice,
      balance: canSeeOperationalBalance,
      caution: effectivePermissions.canManageCaution,
      client: effectivePermissions.canSeeClient,
      instructions: effectivePermissions.canSeeInstructions
    }
  });
});

app.get(
  "/api/collaborator-portal/:token/contract.pdf",
  async (req,res)=>{
    try{
      const access =
        await prisma.collaboratorAccess.findUnique({
          where:{token:req.params.token},
          include:{
            event:{
              include:{
                client:true,
                materials:{
                  include:{material:true}
                }
              }
            }
          }
        });

      if(!access || !access.active){
        return res.status(404).json({
          ok:false,
          message:"Accès invalide ou expiré."
        });
      }

      const event=access.event;

      if(!event){
        return res.status(404).json({
          ok:false,
          message:"Événement introuvable."
        });
      }

      const effectivePermissions=effectiveCollaboratorPermissions(event,access);

      if(!effectivePermissions.canSeeContract){
        return res.status(403).json({
          ok:false,
          message:"Contrat non autorisé pour ce collaborateur."
        });
      }

      const pdf =
        await contractService.generateContractPdf(event);

      const safeName=
        String(event.name || "contrat")
          .replace(/[^a-z0-9_-]+/gi,"_")
          .replace(/^_+|_+$/g,"");

      res.setHeader(
        "Content-Type",
        "application/pdf"
      );

      res.setHeader(
        "Content-Disposition",
        `inline; filename="Contrat_${safeName || "evenement"}${event.contractStatus==="SIGNED"?"_signe":""}.pdf"`
      );

      res.send(pdf);

    }catch(err){
      console.error(
        "Contrat collaborateur :",
        err
      );

      res.status(500).json({
        ok:false,
        message:"Impossible d'ouvrir le contrat."
      });
    }
  }
);

app.post("/api/collaborator-portal/:token/caution-received", async (req, res) => {
  const access = await prisma.collaboratorAccess.findUnique({
    where: { token: req.params.token },
    include: {
      collaborator: true,
      event: true
    }
  });

  if (!access || !access.active) {
    return res.status(404).json({
      ok: false,
      message: "Accès invalide ou expiré."
    });
  }

  if (!effectiveCollaboratorPermissions(access.event,access).canManageCaution) {
    return res.status(403).json({
      ok: false,
      message: "Gestion de la caution non autorisée."
    });
  }

  const result = await prisma.$transaction(async tx => {
    const event = await tx.event.update({
      where: { id: access.eventId },
      data: {
        cautionReceived: true
      }
    });

    const action = await tx.collaboratorAction.create({
      data: {
        eventId: access.eventId,
        collaboratorId: access.collaboratorId,
        action: "CAUTION_RECEIVED"
      }
    });

    return { event, action };
  });

  res.json({
    ok: true,
    cautionReceived: true,
    action: {
      createdAt: result.action.createdAt,
      collaborator: {
        firstName: access.collaborator.firstName,
        lastName: access.collaborator.lastName
      }
    }
  });
});
app.post("/api/collaborator-portal/:token/caution-returned", async (req, res) => {
  const access = await prisma.collaboratorAccess.findUnique({
    where: { token: req.params.token },
    include: {
      collaborator: true,
      event: true
    }
  });

  if (!access || !access.active) {
    return res.status(404).json({
      ok: false,
      message: "Accès invalide ou expiré."
    });
  }

  if (!effectiveCollaboratorPermissions(access.event,access).canManageCaution) {
    return res.status(403).json({
      ok: false,
      message: "Gestion de la caution non autorisée."
    });
  }

  const result = await prisma.$transaction(async tx => {
    const event = await tx.event.update({
      where: { id: access.eventId },
      data: {
        cautionReturned: true
      }
    });

    const action = await tx.collaboratorAction.create({
      data: {
        eventId: access.eventId,
        collaboratorId: access.collaboratorId,
        action: "CAUTION_RETURNED"
      }
    });

    return { event, action };
  });

  res.json({
    ok: true,
    cautionReturned: true,
    action: {
      createdAt: result.action.createdAt,
      collaborator: {
        firstName: access.collaborator.firstName,
        lastName: access.collaborator.lastName
      }
    }
  });
});
const distDir = path.join(__dirname, "dist");

app.post("/api/collaborator-portal/:token/payment-received", async (req, res) => {
  const access = await prisma.collaboratorAccess.findUnique({
    where: { token: req.params.token },
    include: {
      collaborator: true,
      event: true
    }
  });

  if (!access || !access.active) {
    return res.status(404).json({
      ok: false,
      message: "Accès invalide ou expiré."
    });
  }

  const effectivePermissions=effectiveCollaboratorPermissions(access.event,access);
  if (!effectivePermissions.canSeeBalance) {
    return res.status(403).json({
      ok: false,
      message: "Gestion du règlement non autorisée pour cette prestation."
    });
  }

  if (access.event.balancePaid) {
    return res.status(400).json({
      ok: false,
      message: "La prestation est déjà indiquée comme réglée."
    });
  }

  const result = await prisma.$transaction(async tx => {
    const event = await tx.event.update({
      where: { id: access.eventId },
      data: {
        balancePaid: true,
        balance: 0
      }
    });

    const action = await tx.collaboratorAction.create({
      data: {
        eventId: access.eventId,
        collaboratorId: access.collaboratorId,
        action: "PAYMENT_RECEIVED"
      }
    });

    return { event, action };
  });

  const receivedAmount=eventOperationalRemaining(access.event);
  await addNotification({
    title:"💶 Règlement reçu",
    message:`${access.event.name || "Événement"} — ${access.collaborator.firstName}${access.collaborator.lastName?` ${access.collaborator.lastName}`:""} confirme la réception du règlement${receivedAmount>0?` de ${receivedAmount.toFixed(2).replace(".",",")} €`:""}.`,
    type:"SUCCESS",source:"PAYMENT_RECEIVED",audience:"ADMIN",eventId:access.eventId
  }).catch(err=>console.error("Notification règlement reçu :",err));

  res.json({
    ok: true,
    balancePaid: true,
    balance: 0,
    action: {
      createdAt: result.action.createdAt,
      collaborator: {
        firstName: access.collaborator.firstName,
        lastName: access.collaborator.lastName
      }
    }
  });
});

app.get("/sw.js",(req,res)=>{
  res.type("application/javascript").set("Cache-Control","no-cache").send(`
self.addEventListener("push",event=>{
  let data={};try{data=event.data?event.data.json():{};}catch{}
  const title=data.title||"LP28 Suite";
  const options={body:data.message||"Nouvelle notification",icon:"/icon-192.png",badge:"/icon-192.png",tag:data.notificationId||undefined,renotify:true,data:{url:data.url||"/",eventId:data.eventId||null,deliveryToken:data.deliveryToken||null}};
  const ack=data.deliveryToken?fetch("/api/push/delivery/"+encodeURIComponent(data.deliveryToken)+"/received",{method:"POST"}).catch(()=>null):Promise.resolve();
  event.waitUntil(Promise.all([self.registration.showNotification(title,options),ack]));
});
self.addEventListener("notificationclick",event=>{
  event.notification.close();const url=event.notification.data?.url||"/",token=event.notification.data?.deliveryToken||null;
  const ack=token?fetch("/api/push/delivery/"+encodeURIComponent(token)+"/opened",{method:"POST"}).catch(()=>null):Promise.resolve();
  event.waitUntil(Promise.all([ack,clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{for(const c of list){if("focus" in c){c.navigate(url).catch(()=>{});return c.focus();}}return clients.openWindow?clients.openWindow(url):null;})]));
});
`);
});
app.use(express.static(distDir));
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ ok: false });
  }

  res.sendFile(path.join(distDir, "index.html"));
});

async function startServer() {
  try {
    await ensureCatalog(prisma);
    await ensureV82Settings();
    console.log("Catalogue LP28 vÃ©rifiÃ©.");
  } catch (err) {
    console.error("Catalogue LP28 :", err.message);
  }

  app.listen(PORT, () => {
    console.log(
      `Location Photobooth 28 Suite V8.3.0 lancÃ© sur le port ${PORT}`
    );
  });
}

startServer();
 