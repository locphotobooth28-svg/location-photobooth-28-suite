const crypto = require("crypto");
const { google } = require("googleapis");
const { DateTime } = require("luxon");
const prisma = require("../lib/prisma");

const SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.events.owned",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
];

function configured(){
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function redirectUri(req){
  return process.env.GOOGLE_REDIRECT_URI ||
    `${(process.env.APP_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/,"")}/auth/google/callback`;
}

function oauthClient(req){
  if(!configured()) throw new Error("Google OAuth n'est pas configuré.");
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri(req)
  );
}

function key(){
  const source=process.env.GOOGLE_TOKEN_KEY || process.env.SESSION_SECRET;
  if(!source) throw new Error("GOOGLE_TOKEN_KEY ou SESSION_SECRET est requis.");
  return crypto.createHash("sha256").update(source).digest();
}

function encrypt(obj){
  const iv=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv("aes-256-gcm",key(),iv);
  const enc=Buffer.concat([cipher.update(JSON.stringify(obj),"utf8"),cipher.final()]);
  const tag=cipher.getAuthTag();
  return [iv,tag,enc].map(x=>x.toString("base64")).join(".");
}

function decrypt(payload){
  const [ivB64,tagB64,dataB64]=String(payload||"").split(".");
  if(!ivB64||!tagB64||!dataB64) throw new Error("Jeton Google invalide.");
  const decipher=crypto.createDecipheriv("aes-256-gcm",key(),Buffer.from(ivB64,"base64"));
  decipher.setAuthTag(Buffer.from(tagB64,"base64"));
  const clear=Buffer.concat([decipher.update(Buffer.from(dataB64,"base64")),decipher.final()]);
  return JSON.parse(clear.toString("utf8"));
}

async function connection(){
  return prisma.googleConnection.findUnique({where:{id:"primary"}});
}

async function saveTokens(tokens,extra={}){
  const current=await connection();
  let merged=tokens;
  if(current){
    try{ merged={...decrypt(current.tokenEncrypted),...tokens}; }catch{}
  }

  return prisma.googleConnection.upsert({
    where:{id:"primary"},
    update:{
      tokenEncrypted:encrypt(merged),
      googleEmail:extra.googleEmail ?? current?.googleEmail ?? null,
      scopes:extra.scopes ?? current?.scopes ?? null,
      driveRootFolderId:extra.driveRootFolderId ?? current?.driveRootFolderId ?? null,
      defaultCalendarId:extra.defaultCalendarId ?? current?.defaultCalendarId ?? null,
      defaultCalendarSummary:extra.defaultCalendarSummary ?? current?.defaultCalendarSummary ?? null,
    },
    create:{
      id:"primary",
      tokenEncrypted:encrypt(merged),
      googleEmail:extra.googleEmail||null,
      scopes:extra.scopes||null,
      driveRootFolderId:extra.driveRootFolderId||null,
      defaultCalendarId:extra.defaultCalendarId||null,
      defaultCalendarSummary:extra.defaultCalendarSummary||null,
    }
  });
}

async function auth(req){
  const c=await connection();
  if(!c) return null;
  const client=oauthClient(req);
  client.setCredentials(decrypt(c.tokenEncrypted));
  client.on("tokens",async t=>{
    try{await saveTokens(t);}catch(e){console.error("Refresh token Google :",e.message);}
  });
  return client;
}

function authUrl(req){
  const client=oauthClient(req);
  const state=crypto.randomBytes(24).toString("hex");
  req.session.googleOAuthState=state;
  return client.generateAuthUrl({
    access_type:"offline",
    prompt:"consent",
    include_granted_scopes:true,
    scope:SCOPES,
    state
  });
}

async function callback(req, code) {
  console.log("GOOGLE CALLBACK: début");

  const client = oauthClient(req);

  console.log("GOOGLE CALLBACK: récupération tokens");
  const { tokens } = await client.getToken(code);

  console.log("GOOGLE CALLBACK: tokens reçus", {
    access_token: Boolean(tokens.access_token),
    refresh_token: Boolean(tokens.refresh_token)
  });

  client.setCredentials(tokens);

  let email = null;

  try {
    const oauth2 = google.oauth2({
      version: "v2",
      auth: client
    });

    const me = await oauth2.userinfo.get();
    email = me.data.email || null;

    console.log("GOOGLE CALLBACK: email =", email);
  } catch (err) {
    console.error("GOOGLE CALLBACK: userinfo erreur =", err.message);
  }

  console.log("GOOGLE CALLBACK: avant saveTokens");

  await saveTokens(tokens, {
    googleEmail: email,
    scopes: SCOPES.join(" ")
  });

  console.log("GOOGLE CALLBACK: saveTokens terminé");

  return { email };  try{
    const oauth2=google.oauth2({version:"v2",auth:client});
    const me=await oauth2.userinfo.get();
    email=me.data.email||null;
  }catch{}
  await saveTokens(tokens,{googleEmail:email,scopes:SCOPES.join(" ")});
  return {email};
}

async function disconnect(){
  await prisma.googleConnection.deleteMany({where:{id:"primary"}});
}

async function listCalendars(req){
  const client=await auth(req);
  if(!client) return [];
  const api=google.calendar({version:"v3",auth:client});
  const out=[];
  let pageToken;
  do{
    const r=await api.calendarList.list({maxResults:250,pageToken});
    for(const item of r.data.items||[]){
      out.push({
        id:item.id,
        summary:item.summary||item.id,
        primary:Boolean(item.primary),
        accessRole:item.accessRole||"reader",
        backgroundColor:item.backgroundColor||null
      });
    }
    pageToken=r.data.nextPageToken||undefined;
  }while(pageToken);

  return out.sort((a,b)=>{
    if(a.primary)return -1;
    if(b.primary)return 1;
    return a.summary.localeCompare(b.summary,"fr");
  });
}

async function listDriveFolders(req,parentId="root"){
  const client=await auth(req);
  if(!client) return [];
  const drive=google.drive({version:"v3",auth:client});
  const safe=String(parentId||"root").replace(/'/g,"\\'");
  const r=await drive.files.list({
    q:`'${safe}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields:"files(id,name,webViewLink,parents)",
    orderBy:"name",
    pageSize:100
  });
  return r.data.files||[];
}

async function saveSettings(data={}){
  const c=await connection();
  if(!c) throw new Error("Google n'est pas connecté.");
  return saveTokens({},{
    defaultCalendarId:data.defaultCalendarId ?? c.defaultCalendarId ?? null,
    defaultCalendarSummary:data.defaultCalendarSummary ?? c.defaultCalendarSummary ?? null,
    driveRootFolderId:data.driveRootFolderId ?? c.driveRootFolderId ?? null
  });
}

function times(event){
  const zone=process.env.GOOGLE_TIMEZONE||"Europe/Paris";
  const date=event.eventDate.toISOString().slice(0,10);
  const start=DateTime.fromISO(`${date}T${event.installTime||"12:00"}`,{zone});
  let end=event.pickupTime
    ? DateTime.fromISO(`${date}T${event.pickupTime}`,{zone})
    : start.plus({hours:4});
  if(end<=start) end=end.plus({days:1});
  return {
    start:{dateTime:start.toISO(),timeZone:zone},
    end:{dateTime:end.toISO(),timeZone:zone}
  };
}

function description(event){
  const mats=(event.materials||[]).map(x=>x.material?.name).filter(Boolean);
  return [
    "Location Photobooth 28 Suite",
    event.organizerName?`Client : ${event.organizerName}`:null,
    event.organizerPhone?`Téléphone : ${event.organizerPhone}`:null,
    event.organizerEmail?`E-mail : ${event.organizerEmail}`:null,
    mats.length?`Matériel : ${mats.join(", ")}`:null,
    event.notes?`Notes : ${event.notes}`:null
  ].filter(Boolean).join("\n");
}

async function ensureRootFolder(client){
  const c=await connection();
  if(process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID) return process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if(c?.driveRootFolderId) return c.driveRootFolderId;

  const drive=google.drive({version:"v3",auth:client});
  const folder=await drive.files.create({
    requestBody:{name:"Location Photobooth 28",mimeType:"application/vnd.google-apps.folder"},
    fields:"id"
  });
  await saveTokens({}, {driveRootFolderId:folder.data.id});
  return folder.data.id;
}

async function createFolder(drive,name,parentId){
  const r=await drive.files.create({
    requestBody:{name,mimeType:"application/vnd.google-apps.folder",parents:[parentId]},
    fields:"id,webViewLink"
  });
  return r.data;
}

async function ensureDrive(client,event){
  if(event.googleDriveFolderId) return event.googleDriveFolderId;
  const drive=google.drive({version:"v3",auth:client});
  const root=await ensureRootFolder(client);
  const date=event.eventDate.toISOString().slice(0,10);
  const parent=await createFolder(drive,`${date} - ${event.name}`,root);
  for(const sub of ["Photos","Documents","Galerie","Templates"]){
    await createFolder(drive,sub,parent.id);
  }
  await prisma.event.update({
    where:{id:event.id},
    data:{googleDriveFolderId:parent.id}
  });
  return parent.id;
}

async function syncCalendar(client,event){
  const c=await connection();
  const calendarId=
    event.googleCalendarId ||
    c?.defaultCalendarId ||
    process.env.GOOGLE_CALENDAR_ID ||
    "primary";

  const api=google.calendar({version:"v3",auth:client});
  const t=times(event);
  const resource={
    summary:`📸 ${event.name}`,
    location:event.address||undefined,
    description:description(event),
    visibility:"private",
    transparency:"opaque",
    start:t.start,
    end:t.end,
    extendedProperties:{private:{lp28EventId:event.id}}
  };

  let eventId=event.googleCalendarEventId;
  if(eventId){
    try{
      await api.events.update({calendarId,eventId,requestBody:resource});
      if(event.googleCalendarId!==calendarId){
        await prisma.event.update({where:{id:event.id},data:{googleCalendarId:calendarId}});
      }
      return eventId;
    }catch(err){
      if(err?.code!==404) throw err;
      eventId=null;
    }
  }

  const inserted=await api.events.insert({calendarId,requestBody:resource});
  await prisma.event.update({
    where:{id:event.id},
    data:{googleCalendarEventId:inserted.data.id,googleCalendarId:calendarId}
  });
  return inserted.data.id;
}

async function syncEvent(req,id){
  const client=await auth(req);
  if(!client) return {connected:false,calendar:false,drive:false};

  const event=await prisma.event.findUnique({
    where:{id},
    include:{materials:{include:{material:true}}}
  });
  if(!event) throw new Error("Événement introuvable.");

  const result={connected:true,calendar:false,drive:false,warnings:[]};
  try{await syncCalendar(client,event);result.calendar=true;}
  catch(e){result.warnings.push(`Agenda : ${e.message}`);}
  try{await ensureDrive(client,event);result.drive=true;}
  catch(e){result.warnings.push(`Drive : ${e.message}`);}
  return result;
}

async function deleteCalendarEvent(req,event){
  if(!event?.googleCalendarEventId) return;
  const client=await auth(req);
  if(!client) return;
  const c=await connection();
  const calendarId=event.googleCalendarId||c?.defaultCalendarId||process.env.GOOGLE_CALENDAR_ID||"primary";
  const api=google.calendar({version:"v3",auth:client});
  try{
    await api.events.delete({calendarId,eventId:event.googleCalendarEventId});
  }catch(e){
    if(e?.code!==404) console.warn("Suppression Google Calendar :",e.message);
  }
}

module.exports={
  configured,connection,authUrl,callback,disconnect,
  listCalendars,listDriveFolders,saveSettings,
  syncEvent,deleteCalendarEvent
};
