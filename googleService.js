const crypto = require("crypto");
const { google } = require("googleapis");

const { Readable } = require("stream");
const { DateTime } = require("luxon");
const prisma = require("../lib/prisma");

const CALENDAR_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.events.owned",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly"
];

const DRIVE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.metadata.readonly"
];

function configured(){
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET
  );
}

function redirectUri(req){
  return process.env.GOOGLE_REDIRECT_URI ||
    `${(process.env.APP_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/,"")}/auth/google/callback`;
}

function oauthClient(req){
  if(!configured()){
    throw new Error("Google OAuth n'est pas configuré.");
  }

  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri(req)
  );
}

function key(){
  const source =
    process.env.GOOGLE_TOKEN_KEY ||
    process.env.SESSION_SECRET;

  if(!source){
    throw new Error(
      "GOOGLE_TOKEN_KEY ou SESSION_SECRET est requis."
    );
  }

  return crypto
    .createHash("sha256")
    .update(source)
    .digest();
}

function encrypt(obj){
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    key(),
    iv
  );

  const enc = Buffer.concat([
    cipher.update(JSON.stringify(obj),"utf8"),
    cipher.final()
  ]);

  const tag = cipher.getAuthTag();

  return [iv,tag,enc]
    .map(x=>x.toString("base64"))
    .join(".");
}

function decrypt(payload){
  const [ivB64,tagB64,dataB64] =
    String(payload||"").split(".");

  if(!ivB64 || !tagB64 || !dataB64){
    throw new Error("Jeton Google invalide.");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(ivB64,"base64")
  );

  decipher.setAuthTag(
    Buffer.from(tagB64,"base64")
  );

  const clear = Buffer.concat([
    decipher.update(
      Buffer.from(dataB64,"base64")
    ),
    decipher.final()
  ]);

  return JSON.parse(
    clear.toString("utf8")
  );
}

async function connection(kind="calendar"){
  return prisma.googleConnection.findUnique({
    where:{id:kind}
  });
}

async function saveTokens(tokens, extra={}, kind="calendar"){
  const current = await connection(kind);

  let merged = tokens;

  if(current){
    try{
      merged = {
        ...decrypt(current.tokenEncrypted),
        ...tokens
      };
    }catch{}
  }

  return prisma.googleConnection.upsert({
    where:{id:kind},

    update:{
      tokenEncrypted:encrypt(merged),
      googleEmail:
        extra.googleEmail ??
        current?.googleEmail ??
        null,

      scopes:
        extra.scopes ??
        current?.scopes ??
        null,

      driveRootFolderId:
        extra.driveRootFolderId ??
        current?.driveRootFolderId ??
        null,

      defaultCalendarId:
        extra.defaultCalendarId ??
        current?.defaultCalendarId ??
        null,

      defaultCalendarSummary:
        extra.defaultCalendarSummary ??
        current?.defaultCalendarSummary ??
        null
    },

    create:{
      id:kind,
      tokenEncrypted:encrypt(merged),
      googleEmail:extra.googleEmail || null,
      scopes:extra.scopes || null,
      driveRootFolderId:extra.driveRootFolderId || null,
      defaultCalendarId:extra.defaultCalendarId || null,
      defaultCalendarSummary:extra.defaultCalendarSummary || null
    }
  });
}

async function auth(req, kind="calendar"){
  const c = await connection(kind);

  if(!c){
    return null;
  }

  const client = oauthClient(req);

  client.setCredentials(
    decrypt(c.tokenEncrypted)
  );

  client.on("tokens", async t=>{
    try{
      await saveTokens(t,{},kind);
    }catch(e){
      console.error(
        `Refresh token Google ${kind} :`,
        e.message
      );
    }
  });

  return client;
}

function authUrl(req, kind="calendar"){
  const client = oauthClient(req);

  const state =
    crypto.randomBytes(24).toString("hex");

  req.session.googleOAuthState = state;
  req.session.googleOAuthKind = kind;

  const scopes =
    kind === "drive"
      ? DRIVE_SCOPES
      : CALENDAR_SCOPES;

  return client.generateAuthUrl({
    access_type:"offline",
    prompt:"consent",
    include_granted_scopes:true,
    scope:scopes,
    state
  });
}

async function callback(req, code){
  const kind =
    req.session.googleOAuthKind ||
    "calendar";

  console.log(
    "GOOGLE CALLBACK:",
    kind
  );

  const client = oauthClient(req);

  const {tokens} =
    await client.getToken(code);

  client.setCredentials(tokens);

  let email = null;

  try{
    const oauth2 = google.oauth2({
      version:"v2",
      auth:client
    });

    const me =
      await oauth2.userinfo.get();

    email =
      me.data.email || null;

  }catch(err){
    console.error(
      "Google userinfo :",
      err.message
    );
  }

  const scopes =
    kind === "drive"
      ? DRIVE_SCOPES
      : CALENDAR_SCOPES;

  await saveTokens(
    tokens,
    {
      googleEmail:email,
      scopes:scopes.join(" ")
    },
    kind
  );

  delete req.session.googleOAuthKind;

  console.log(
    `Google ${kind} connecté :`,
    email
  );

  return {
    email,
    kind
  };
}

async function disconnect(kind){
  if(kind === "calendar" || kind === "drive"){
    await prisma.googleConnection.deleteMany({
      where:{id:kind}
    });

    return;
  }

  await prisma.googleConnection.deleteMany({
    where:{
      id:{
        in:["calendar","drive","primary"]
      }
    }
  });
}

async function listCalendars(req){
  const client=await auth(req,"calendar");
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
  const client=await auth(req,"drive");
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
  const calendar = await connection("calendar");
  const drive = await connection("drive");

  if(!calendar && !drive){
    throw new Error("Aucun compte Google n'est connecté.");
  }

  let savedCalendar = calendar;
  let savedDrive = drive;

  if(calendar){
    savedCalendar = await saveTokens({}, {
      defaultCalendarId:
        data.defaultCalendarId ?? calendar.defaultCalendarId ?? null,
      defaultCalendarSummary:
        data.defaultCalendarSummary ?? calendar.defaultCalendarSummary ?? null
    }, "calendar");
  }

  if(drive){
    savedDrive = await saveTokens({}, {
      driveRootFolderId:
        data.driveRootFolderId ?? drive.driveRootFolderId ?? null
    }, "drive");
  }

  return {
    defaultCalendarId: savedCalendar?.defaultCalendarId || null,
    defaultCalendarSummary: savedCalendar?.defaultCalendarSummary || null,
    driveRootFolderId: savedDrive?.driveRootFolderId || null
  };
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
  const c = await connection("drive");

  if(process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID){
    return process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  }

  if(c?.driveRootFolderId){
    return c.driveRootFolderId;
  }

  const drive = google.drive({
    version:"v3",
    auth:client
  });

  const folder = await drive.files.create({
    requestBody:{
      name:"Location Photobooth 28",
      mimeType:"application/vnd.google-apps.folder"
    },
    fields:"id"
  });

  await saveTokens(
    {},
    {driveRootFolderId:folder.data.id},
    "drive"
  );

  return folder.data.id;
}
async function createFolder(drive,name,parentId){
  const r = await drive.files.create({
    requestBody:{
      name,
      mimeType:"application/vnd.google-apps.folder",
      parents:[parentId]
    },
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
async function uploadMathisSavPhoto(req,event,incident,file,controlType="") {
  const client=await auth(req,"drive");
  if(!client) throw new Error("Compte Google Drive non connecté.");
  const drive=google.drive({version:"v3",auth:client});
  const rootId=await ensureRootFolder(client);
  const children=await drive.files.list({
    q:`'${rootId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields:"files(id,name)"
  });
  let sav=(children.data.files||[]).find(f=>String(f.name).toUpperCase()==="SAV");
  if(!sav) sav=await createFolder(drive,"SAV",rootId);
  const safeEvent=String(event.name||"Evenement").replace(/[\\/:*?"<>|]/g,"-").slice(0,100);
  const date=event.eventDate?new Date(event.eventDate).toISOString().slice(0,10):"";
  const eventFolderName=`${date}${date?" - ":""}${safeEvent}`;
  const eventChildren=await drive.files.list({q:`'${sav.id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,fields:"files(id,name)"});
  let eventFolder=(eventChildren.data.files||[]).find(f=>f.name===eventFolderName);
  if(!eventFolder) eventFolder=await createFolder(drive,eventFolderName,sav.id);
  const ext=require("path").extname(file.originalname||file.filename||"")||".jpg";
  const stamp=new Date().toISOString().replace(/[:.]/g,"-");
  const booth=String(incident.booth||"BORNE").replace(/[^a-z0-9_-]+/gi,"-").toUpperCase();
  const kind=String(controlType||incident.issue||"controle").replace(/[^a-z0-9_-]+/gi,"-").slice(0,50);
  const name=`${booth}_${kind}_${stamp}${ext.toLowerCase()}`;
  const fs=require("fs");
  const uploaded=await drive.files.create({requestBody:{name,parents:[eventFolder.id],appProperties:{lp28Sav:"true",lp28IncidentId:incident.id}},media:{mimeType:file.mimetype,body:fs.createReadStream(file.path)},fields:"id,name,mimeType,webViewLink,webContentLink"});
  return {id:uploaded.data.id,name:uploaded.data.name,webViewLink:uploaded.data.webViewLink||null,webContentLink:uploaded.data.webContentLink||null};
}

async function uploadMemoryToDrive(req,event,file){
  const client = await auth(req,"drive");

  if(!client){
    throw new Error("Compte Google Drive non connecté.");
  }

  const drive = google.drive({
    version:"v3",
    auth:client
  });

  const parentId = await ensureDrive(client,event);

  const folders = await drive.files.list({
    q:`'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields:"files(id,name)"
  });

  let galleryFolder = (folders.data.files || [])
    .find(f => f.name === "Galerie");

  if(!galleryFolder){
    galleryFolder = await createFolder(
      drive,
      "Galerie",
      parentId
    );
  }

  const fs = require("fs");

  const uploaded = await drive.files.create({
    requestBody:{
      name:file.originalname || file.filename,
      parents:[galleryFolder.id]
    },
    media:{
      mimeType:file.mimetype,
      body:fs.createReadStream(file.path)
    },
    fields:"id,name,mimeType,webViewLink,webContentLink"
  });

  return {
    id: uploaded.data.id,
    webViewLink: uploaded.data.webViewLink || null,
    webContentLink: uploaded.data.webContentLink || null
  };
}
async function getMemoryFromDrive(req,fileId){
  const client = await auth(req,"drive");

  if(!client){
    throw new Error("Compte Google Drive non connecté.");
  }

  const drive = google.drive({
    version:"v3",
    auth:client
  });

  const response = await drive.files.get(
    {
      fileId,
      alt:"media"
    },
    {
      responseType:"stream"
    }
  );

  return response.data;
}

async function deleteMemoryFromDrive(req,fileId){
  const client = await auth(req,"drive");

  if(!client){
    throw new Error("Compte Google Drive non connecté.");
  }

  const drive = google.drive({
    version:"v3",
    auth:client
  });

  await drive.files.delete({
    fileId
  });
}

async function syncCalendar(client,event){
  const c=await connection("calendar");
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
  const calendarClient = await auth(req,"calendar");
  const driveClient = await auth(req,"drive");

  if(!calendarClient && !driveClient){
    return {
      connected:false,
      calendar:false,
      drive:false
    };
  }

  const event = await prisma.event.findUnique({
    where:{id},
    include:{
      materials:{
        include:{material:true}
      }
    }
  });

  if(!event){
    throw new Error("Événement introuvable.");
  }

  const result = {
    connected:true,
    calendar:false,
    drive:false,
    calendarConnected:Boolean(calendarClient),
    driveConnected:Boolean(driveClient),
    warnings:[]
  };

  if(calendarClient){
    try{
      await syncCalendar(calendarClient,event);
      result.calendar=true;
    }catch(e){
      result.warnings.push(`Agenda : ${e.message}`);
    }
  }else{
    result.warnings.push("Agenda : compte Calendar non connecté.");
  }

  if(driveClient){
    try{
      await ensureDrive(driveClient,event);
      result.drive=true;
    }catch(e){
      result.warnings.push(`Drive : ${e.message}`);
    }
  }else{
    result.warnings.push("Drive : compte Drive non connecté.");
  }

  return result;
}
 
async function deleteCalendarEvent(req,event){
  if(!event?.googleCalendarEventId) return;

  const client=await auth(req,"calendar");
  if(!client) return;

  const c=await connection("calendar");
  const calendarId=event.googleCalendarId||c?.defaultCalendarId||process.env.GOOGLE_CALENDAR_ID||"primary";
  const api=google.calendar({version:"v3",auth:client});
  try{
    await api.events.delete({calendarId,eventId:event.googleCalendarEventId});
  }catch(e){
    if(e?.code!==404) console.warn("Suppression Google Calendar :",e.message);
  }
}
async function listEventDocuments(req,eventId){
  const client = await auth(req,"drive");

  if(!client){
    return {
      connected:false,
      documents:[]
    };
  }

  const event = await prisma.event.findUnique({
    where:{id:eventId}
  });

  if(!event){
    throw new Error("Événement introuvable.");
  }

  if(!event.googleDriveFolderId){
    return {
      connected:true,
      documents:[]
    };
  }

  const drive = google.drive({
    version:"v3",
    auth:client
  });

  const folders = await drive.files.list({
    q:`'${event.googleDriveFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields:"files(id,name)"
  });

  const documentsFolder = (folders.data.files||[])
    .find(f=>f.name==="Documents");

  if(!documentsFolder){
    return {
      connected:true,
      documents:[]
    };
  }

  const files = await drive.files.list({
    q:`'${documentsFolder.id}' in parents and trashed=false`,
    fields:"files(id,name,mimeType,webViewLink,webContentLink,createdTime,modifiedTime,appProperties)",
    orderBy:"name"
  });

  return {
    connected:true,
    folderId:documentsFolder.id,
    documents:files.data.files||[]
  };
}


async function ensureEventDocumentsFolder(req,eventId){
  const client = await auth(req,"drive");

  if(!client){
    throw new Error("Compte Google Drive non connecté.");
  }

  const event = await prisma.event.findUnique({
    where:{id:eventId}
  });

  if(!event){
    throw new Error("Événement introuvable.");
  }

  const drive = google.drive({
    version:"v3",
    auth:client
  });

  const parentId = await ensureDrive(client,event);

  const folders = await drive.files.list({
    q:`'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields:"files(id,name)"
  });

  let documentsFolder = (folders.data.files||[])
    .find(f=>f.name==="Documents");

  if(!documentsFolder){
    documentsFolder = await createFolder(
      drive,
      "Documents",
      parentId
    );
  }

  return {
    client,
    drive,
    event,
    folderId:documentsFolder.id
  };
}

async function uploadEventDocument(req,eventId,file,metadata={}){
  if(!file?.buffer){
    throw new Error("Fichier document manquant.");
  }

  const {
    drive,
    folderId
  } = await ensureEventDocumentsFolder(
    req,
    eventId
  );

  const type = String(metadata.type||"OTHER").trim() || "OTHER";
  const displayName =
    String(metadata.displayName||file.originalname||"Document")
      .trim()
      .slice(0,180) || "Document";

  const visibleClient =
    metadata.visibleClient === true ||
    String(metadata.visibleClient).toLowerCase()==="true";

  const safeOriginal =
    String(file.originalname||"document.pdf")
      .replace(/[\\/:*?"<>|]+/g,"-")
      .trim() || "document.pdf";

  const finalName =
    displayName.toLowerCase().endsWith(".pdf")
      ? displayName
      : `${displayName}.pdf`;

  const uploaded = await drive.files.create({
    requestBody:{
      name:finalName || safeOriginal,
      parents:[folderId],
      appProperties:{
        lp28Document:"true",
        lp28Type:type,
        lp28DisplayName:displayName,
        lp28VisibleClient:visibleClient ? "true" : "false"
      }
    },
    media:{
      mimeType:file.mimetype || "application/pdf",
      body:Readable.from(file.buffer)
    },
    fields:"id,name,mimeType,webViewLink,webContentLink,createdTime,modifiedTime,appProperties"
  });

  return uploaded.data;
}

async function deleteEventDocument(req,eventId,fileId){
  const client = await auth(req,"drive");

  if(!client){
    throw new Error("Compte Google Drive non connecté.");
  }

  const driveResult = await listEventDocuments(
    req,
    eventId
  );

  const document = (driveResult.documents||[])
    .find(f=>f.id===fileId);

  if(!document){
    throw new Error("Document introuvable.");
  }

  const drive = google.drive({
    version:"v3",
    auth:client
  });

  await drive.files.delete({
    fileId
  });

  return {
    ok:true,
    id:fileId
  };
}

async function updateEventDocumentMetadata(req,eventId,fileId,metadata={}){
  const client = await auth(req,"drive");

  if(!client){
    throw new Error("Compte Google Drive non connecté.");
  }

  const driveResult = await listEventDocuments(
    req,
    eventId
  );

  const document = (driveResult.documents||[])
    .find(f=>f.id===fileId);

  if(!document){
    throw new Error("Document introuvable.");
  }

  const drive = google.drive({
    version:"v3",
    auth:client
  });

  const currentProps = document.appProperties || {};

  const visibleClient =
    metadata.visibleClient === true ||
    String(metadata.visibleClient).toLowerCase()==="true";

  const type =
    String(metadata.type||currentProps.lp28Type||"OTHER")
      .trim() || "OTHER";

  const displayName =
    String(
      metadata.displayName ||
      currentProps.lp28DisplayName ||
      document.name ||
      "Document"
    ).trim().slice(0,180) || "Document";

  const finalName =
    displayName.toLowerCase().endsWith(".pdf")
      ? displayName
      : `${displayName}.pdf`;

  const updated = await drive.files.update({
    fileId,
    requestBody:{
      name:finalName,
      appProperties:{
        ...currentProps,
        lp28Document:"true",
        lp28Type:type,
        lp28DisplayName:displayName.replace(/\.pdf$/i,""),
        lp28VisibleClient:visibleClient ? "true" : "false"
      }
    },
    fields:"id,name,mimeType,webViewLink,webContentLink,createdTime,modifiedTime,appProperties"
  });

  return updated.data;
}

module.exports={
  configured,connection,authUrl,callback,disconnect,
  listCalendars,listDriveFolders,saveSettings,
  syncEvent,deleteCalendarEvent,listEventDocuments,
  uploadEventDocument,deleteEventDocument,updateEventDocumentMetadata,
  uploadMemoryToDrive,uploadMathisSavPhoto,
  getMemoryFromDrive,
  deleteMemoryFromDrive
};
