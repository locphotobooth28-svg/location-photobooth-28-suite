require("dotenv").config();

const express = require("express");
const session = require("express-session");
const path = require("path");
const crypto = require("crypto");
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

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@locationphotobooth28.fr";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-moi";

function adminOnly(req, res, next) {
  if (req.session.admin) return next();
  return res.status(401).json({ ok: false, message: "Non autorisÃ©." });
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
      notes: u.notes,
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

app.get("/api/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, app: "Location Photobooth 28 Suite", version: "8.2.1", database: "ok" });
  } catch {
    res.status(500).json({ ok: false, database: "error" });
  }
});

app.get("/api/session", (req, res) => {
  res.json({ authenticated: Boolean(req.session.admin) });
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body || {};

  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ ok: false, message: "Identifiants incorrects." });
  }

  req.session.admin = true;
  req.session.save((err) => {
    if (err) {
      console.error("Erreur sauvegarde session :", err);
      return res.status(500).json({ ok: false, message: "Impossible d'enregistrer la session." });
    }
    res.json({ ok: true, authenticated: true });
  });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
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
  const kind = req.params.kind;

  if(kind !== "calendar" && kind !== "drive"){
    return res.status(400).json({
      ok:false,
      message:"Type de connexion Google invalide."
    });
  }
app.post("/api/google/disconnect/:kind", adminOnly, async (req, res) => {
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
});

app.post("/api/google/disconnect", adminOnly, async (req, res) => {
  await googleService.disconnect();

  res.json({
    ok:true
  });
});
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

app.get("/api/dashboard", adminOnly, async (req, res) => {
  const today = new Date();
  today.setHours(0,0,0,0);

  const [events, upcoming, consumables] = await Promise.all([
    prisma.event.count(),
    prisma.event.count({ where: { archived: false, eventDate: { gte: today } } }),
    prisma.consumable.findMany({ orderBy: { printer: "asc" } })
  ]);

  res.json({
    stats: {
      events,
      upcoming,
      activeGalleries: 0,
      signedContracts: 0
    },
    consumables
  });
});

app.get("/api/materials", adminOnly, async (req, res) => {
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
app.get("/api/material-unavailabilities", adminOnly, async (req, res) => {
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

app.get("/api/events", adminOnly, async (req, res) => {
  const events = await prisma.event.findMany({
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
}
},
    orderBy: { eventDate: "desc" }
  });

  res.json({
    events: events.map(e => ({
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
totalPrice: e.totalPrice != null
  ? Number(e.totalPrice)
  : "",

deposit: e.deposit != null
  ? Number(e.deposit)
  : "",

balance: e.balance != null
  ? Number(e.balance)
  : "",
customPrintCount:
  e.customPrintCount != null
    ? Number(e.customPrintCount)
    : "",

customPrintPrice:
  e.customPrintPrice != null
    ? Number(e.customPrintPrice)
    : "",

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
      payments: {
        depositPaid: e.depositPaid,
        balancePaid: e.balancePaid,
        cautionReceived: e.cautionReceived,
        cautionReturned: e.cautionReturned
      },
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
      preparation: e.preparation,
      notes: e.notes,
      archived: e.archived,
      status: e.status,
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
    }))
  });
});
app.get("/api/events/:id/contract.pdf", adminOnly, async (req, res) => {
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

    const pdf = await contractService.generateContractPdf(event);

    const safeName = String(event.name || "contrat")
      .replace(/[^a-z0-9_-]+/gi, "_")
      .replace(/^_+|_+$/g, "");

    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    res.setHeader(
      "Content-Disposition",
      `inline; filename="Contrat_${safeName || "evenement"}.pdf"`
    );

    res.send(pdf);

  } catch (err) {
    console.error(
      "Génération contrat PDF :",
      err
    );

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

    // Un contrat déjà signé ne doit pas être remplacé silencieusement
    if (event.contractStatus === "SIGNED") {
      const currentHash = contractHash(event);

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
      return res.status(409).json({
        ok: false,
        message: "Ce contrat est déjà signé."
      });
    }

    const pdf = await contractService.generateContractPdf(event);
    const hash = contractHash(event);

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

    const pdf = await contractService.generateContractPdf(event);
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

    const hash = contractHash(event);

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

  res.json({ ok: true, event, google, printerWarning: printerChoice.warning || null });
});

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

  // Le dossier Drive est volontairement conservÃ© pour Ã©viter toute perte de photos/documents.
  res.json({ ok: true });
});

app.get("/api/events/:id/share", adminOnly, async (req, res) => {
  const event = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!event) return res.status(404).json({ ok: false, message: "Ã‰vÃ©nement introuvable." });

  const base = appBaseUrl(req);

  const guestUrl = `${base}/portal/${event.guestToken}`;
  const organizerUrl = `${base}/portal/${event.organizerToken}`;

  const qrDataUrl = await QRCode.toDataURL(guestUrl, { width: 700, margin: 2 });

  res.json({ ok: true, guestUrl, organizerUrl, qrDataUrl });
});


app.get("/api/material-planning", adminOnly, async (req, res) => {
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

app.get("/api/availability", adminOnly, async (req, res) => {
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

async function portalAccess(token){
  const event=await prisma.event.findFirst({where:{OR:[{guestToken:token},{organizerToken:token}]}});
  if(!event)return null;
  return {event,role:event.organizerToken===token?"ORGANIZER":"GUEST"};
}
function safeMedia(m){
  return {id:m.id,url:`/memories/${encodeURIComponent(m.fileName)}`,originalName:m.originalName,mimeType:m.mimeType,mediaType:m.mediaType,status:m.status,createdAt:m.createdAt};
}

// Endpoint public limitÃ© au portail organisateur/invitÃ©.
// Aucun lien d'administration, inventaire ou stock n'est exposÃ© ici.
app.get("/api/guest/:token/portal", async (req,res)=>{
  await ensureV82Settings();
  const access=await portalAccess(req.params.token);
  const event=access?.event;
  if(!event||!event.portalEnabled)return res.status(404).json({ok:false,message:"Portail indisponible."});
  if(event.portalExpiresAt&&event.portalExpiresAt<new Date())return res.status(410).json({ok:false,message:"Portail expirÃ©."});

  const [videos,settingsRows]=await Promise.all([
    prisma.assistanceVideo.findMany({where:{active:true},orderBy:[{sortOrder:"asc"},{createdAt:"asc"}]}),
    prisma.appSetting.findMany({where:{key:{in:["supportPhone","whatsappUrl","googleReviewUrl"]}}})
  ]);
  const safeSettings=Object.fromEntries(settingsRows.map(x=>[x.key,x.value]));

  res.json({
    ok:true,
    event:{
      name:event.name,
      type:event.type,
      date:event.eventDate.toISOString().slice(0,10),
      guestUploadEnabled:event.guestUploadEnabled,
      guestVideoEnabled:event.guestVideoEnabled,
      guestUploadModerated:event.guestUploadModerated,
      fotoshareUrl:event.fotoshareUrl
    },
    assistanceVideos:videos.map(v=>({id:v.id,title:v.title,url:v.url})),
    role:access.role,
    support:{
      phone:safeSettings.supportPhone||"",
      whatsappUrl:safeSettings.whatsappUrl||"",
      googleReviewUrl:safeSettings.googleReviewUrl||""
    }
  });
});

// ---------------- V8.2.2 : LP28 Memories ----------------
app.use("/memories", express.static(MEMORIES_DIR, {fallthrough:false,maxAge:"1h"}));

app.get("/api/guest/:token/memories", async (req,res)=>{
  const access=await portalAccess(req.params.token);
  if(!access?.event?.portalEnabled)return res.status(404).json({ok:false,message:"Portail indisponible."});
  const where={eventId:access.event.id,status:access.role==="ORGANIZER"?{in:["VISIBLE","HIDDEN","PENDING"]}:"VISIBLE"};
  const media=await prisma.memoryMedia.findMany({where,orderBy:{createdAt:"asc"}});
  res.json({ok:true,role:access.role,media:media.map(safeMedia)});
});

app.post("/api/guest/:token/memories/upload", memoriesUpload.array("files",100), async (req,res)=>{
  const access=await portalAccess(req.params.token);
  if(!access?.event?.portalEnabled){ for(const f of req.files||[]) fs.unlink(f.path,()=>{}); return res.status(404).json({ok:false,message:"Portail indisponible."}); }
  const files=req.files||[];
  if(!files.length)return res.status(400).json({ok:false,message:"Aucun fichier reÃ§u."});
  for(const f of files){
    const isVideo=f.mimetype.startsWith("video/");
    const allowed=isVideo?access.event.guestVideoEnabled:access.event.guestUploadEnabled;
    if(!allowed){ fs.unlink(f.path,()=>{}); continue; }
    await prisma.memoryMedia.create({data:{eventId:access.event.id,fileName:f.filename,originalName:f.originalname,mimeType:f.mimetype,sizeBytes:f.size,mediaType:isVideo?"VIDEO":"PHOTO",status:access.event.guestUploadModerated?"PENDING":"VISIBLE",uploadedBy:access.role}});
  }
  res.json({ok:true});
});

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

app.get("/api/admin/galleries", adminOnly, async (req, res) => {
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
        portalExpiresAt: e.portalExpiresAt
          ? e.portalExpiresAt.toISOString().slice(0, 10)
          : null,
        organizerToken: e.organizerToken,
        guestToken: e.guestToken,
        fotoshareUrl: e.fotoshareUrl,
        total: active.length,
        photos: active.filter(m => m.mediaType === "PHOTO").length,
        videos: active.filter(m => m.mediaType === "VIDEO").length,
        hidden: active.filter(m => m.status === "HIDDEN").length,
        pending: active.filter(m => m.status === "PENDING").length
      };
    })
  });
});

app.get("/api/admin/galleries/:eventId", adminOnly, async (req, res) => {
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
    url: `/memories/${encodeURIComponent(m.fileName)}`
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
      fotoshareUrl: event.fotoshareUrl
    },
    media: mediaWithUrls
  });
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
    return res.status(400).json({
      ok: false,
      message: "Saisissez DELETE pour confirmer."
    });
  }

  const media = await prisma.memoryMedia.findUnique({
    where: { id: req.params.id }
  });

  if (!media) {
    return res.status(404).json({
      ok: false,
      message: "Souvenir introuvable."
    });
  }

  try {
    if (media.storagePath && fs.existsSync(media.storagePath)) {
      fs.unlinkSync(media.storagePath);
    }
  } catch (err) {
    console.error("Suppression fichier Memories :", err.message);
  }

  await prisma.memoryMedia.delete({
    where: { id: media.id }
  });

  res.json({ ok: true });
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
app.get("/api/collaborators", adminOnly, async (req, res) => {
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
      canSeeBalance: b.canSeeBalance !== false,
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
      canSeeBalance: b.canSeeBalance !== false,
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

    client: access.canSeeClient
      ? {
          name: event.organizerName,
          phone: event.organizerPhone,
          email: event.organizerEmail
        }
      : null,

    balance: access.canSeeBalance
      ? event.balance
      : null,

      balancePaid: access.canSeeBalance
  ? event.balancePaid
  : null,

    caution: access.canManageCaution
      ? {
          received: event.cautionReceived,
          returned: event.cautionReturned
        }
      : null,

actions: (event.collaboratorActions || []).map(a => ({
  action: a.action,
  createdAt: a.createdAt
})),

    instructions: access.canSeeInstructions
      ? access.missionNotes
      : null,
documents: {
  contract: access.canSeeContract
    ? driveDocuments.find(f =>
        /contrat/i.test(f.name)
      ) || null
    : null,

  invoice: access.canSeeInvoice
    ? driveDocuments.find(f =>
        /facture|invoice/i.test(f.name)
      ) || null
    : null
},
    permissions: {
      contract: access.canSeeContract,
      invoice: access.canSeeInvoice,
      balance: access.canSeeBalance,
      caution: access.canManageCaution,
      client: access.canSeeClient,
      instructions: access.canSeeInstructions
    }
  });
});
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

  if (!access.canManageCaution) {
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

  if (!access.canManageCaution) {
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

  if (!access.canSeeBalance) {
    return res.status(403).json({
      ok: false,
      message: "Gestion du règlement non autorisée."
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
 