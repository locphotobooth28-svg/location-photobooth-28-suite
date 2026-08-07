require("dotenv").config();

const express = require("express");
const session = require("express-session");
const path = require("path");
const crypto = require("crypto");
const QRCode = require("qrcode");
const prisma = require("./lib/prisma");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || "change-me-location-photobooth-28-suite",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 12 * 60 * 60 * 1000
  }
}));

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@locationphotobooth28.fr";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-moi";

function adminOnly(req, res, next) {
  if (req.session.admin) return next();
  return res.status(401).json({ ok: false, message: "Non autorisé." });
}

function appBaseUrl(req) {
  return (process.env.APP_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
}

const PHOTOBOOTHS = [
  "Borne Photobooth Miroir Lola",
  "Borne Photobooth Nina",
  "Borne Photobooth Gabin"
];

async function findMaterialConflicts({ date, materialNames, excludeEventId = null }) {
  const selectedBooths = (Array.isArray(materialNames) ? materialNames : [])
    .filter(name => PHOTOBOOTHS.includes(name));

  if (!date || selectedBooths.length === 0) return [];

  const start = new Date(`${date}T00:00:00`);
  const end = new Date(`${date}T23:59:59.999`);

  const events = await prisma.event.findMany({
    where: {
      archived: false,
      eventDate: { gte: start, lte: end },
      ...(excludeEventId ? { id: { not: excludeEventId } } : {}),
      materials: {
        some: {
          material: {
            name: { in: selectedBooths }
          }
        }
      }
    },
    include: {
      materials: { include: { material: true } }
    }
  });

  const conflicts = [];
  for (const event of events) {
    const names = event.materials.map(x => x.material.name);
    for (const booth of selectedBooths) {
      if (names.includes(booth)) {
        conflicts.push({
          material: booth,
          eventId: event.id,
          eventName: event.name,
          date: event.eventDate.toISOString().slice(0, 10),
          time: event.installTime || null
        });
      }
    }
  }

  return conflicts;
}

app.get("/api/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, app: "Location Photobooth 28 Suite", version: "6.3.1", database: "ok" });
  } catch {
    res.status(500).json({ ok: false, database: "error" });
  }
});

app.get("/api/session", (req, res) => {
  res.json({ authenticated: Boolean(req.session.admin) });
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body || {};
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    req.session.admin = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ ok: false, message: "Identifiants incorrects." });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
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
  const materials = await prisma.material.findMany({
    where: { active: true },
    orderBy: [{ category: "asc" }, { name: "asc" }]
  });
  res.json({ materials });
});

app.get("/api/consumables", adminOnly, async (req, res) => {
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
  const { date, materials, excludeEventId } = req.body || {};
  const conflicts = await findMaterialConflicts({
    date,
    materialNames: materials,
    excludeEventId: excludeEventId || null
  });
  res.json({ ok: true, conflicts });
});

app.get("/api/events", adminOnly, async (req, res) => {
  const events = await prisma.event.findMany({
    include: {
      client: true,
      materials: { include: { material: true } }
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
      pickupTime: e.pickupTime,
      address: e.address,
      guestCount: e.guestCount,
      organizerName: e.organizerName,
      organizerPhone: e.organizerPhone,
      organizerEmail: e.organizerEmail,
      materials: e.materials.map(x => x.material.name),
      payments: {
        depositPaid: e.depositPaid,
        balancePaid: e.balancePaid,
        cautionReceived: e.cautionReceived,
        cautionReturned: e.cautionReturned
      },
      notes: e.notes,
      archived: e.archived,
      status: e.status
    }))
  });
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
    materialNames: selected
  });

  if (conflicts.length) {
    return res.status(409).json({
      ok: false,
      error: "material_conflict",
      message: "Une borne Photobooth est déjà réservée à cette date.",
      conflicts
    });
  }

  const materials = await prisma.material.findMany({
    where: { name: { in: selected } }
  });

  const event = await prisma.event.create({
    data: {
      name: String(b.name).trim(),
      type: String(b.type || "").trim() || null,
      eventDate: new Date(`${b.date}T12:00:00`),
      installTime: String(b.time || "").trim() || null,
      pickupTime: String(b.pickupTime || "").trim() || null,
      address: String(b.address || "").trim() || null,
      guestCount: b.guestCount ? Number(b.guestCount) : null,
      organizerName: organizerName || null,
      organizerEmail: String(b.organizerEmail || "").trim() || null,
      organizerPhone: String(b.organizerPhone || "").trim() || null,
      notes: String(b.notes || "").trim() || null,
      depositPaid: Boolean(b.payments?.depositPaid),
      balancePaid: Boolean(b.payments?.balancePaid),
      cautionReceived: Boolean(b.payments?.cautionReceived),
      cautionReturned: Boolean(b.payments?.cautionReturned),
      organizerToken: crypto.randomBytes(18).toString("hex"),
      guestToken: crypto.randomBytes(12).toString("hex"),
      clientId,
      materials: {
        create: materials.map(m => ({ materialId: m.id }))
      }
    }
  });

  res.json({ ok: true, event });
});

app.put("/api/events/:id", adminOnly, async (req, res) => {
  const b = req.body || {};
  const selected = Array.isArray(b.materials) ? b.materials : [];

  const conflicts = await findMaterialConflicts({
    date: b.date,
    materialNames: selected,
    excludeEventId: req.params.id
  });

  if (conflicts.length) {
    return res.status(409).json({
      ok: false,
      error: "material_conflict",
      message: "Une borne Photobooth est déjà réservée à cette date.",
      conflicts
    });
  }

  const materials = await prisma.material.findMany({ where: { name: { in: selected } } });

  const event = await prisma.$transaction(async tx => {
    await tx.eventMaterial.deleteMany({ where: { eventId: req.params.id } });

    return tx.event.update({
      where: { id: req.params.id },
      data: {
        name: String(b.name || "").trim(),
        type: String(b.type || "").trim() || null,
        eventDate: new Date(`${b.date}T12:00:00`),
        installTime: String(b.time || "").trim() || null,
        pickupTime: String(b.pickupTime || "").trim() || null,
        address: String(b.address || "").trim() || null,
        guestCount: b.guestCount ? Number(b.guestCount) : null,
        organizerName: String(b.organizerName || "").trim() || null,
        organizerEmail: String(b.organizerEmail || "").trim() || null,
        organizerPhone: String(b.organizerPhone || "").trim() || null,
        notes: String(b.notes || "").trim() || null,
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

  res.json({ ok: true, event });
});

app.post("/api/events/:id/archive", adminOnly, async (req, res) => {
  const current = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!current) return res.status(404).json({ ok: false, message: "Événement introuvable." });

  const event = await prisma.event.update({
    where: { id: current.id },
    data: { archived: !current.archived }
  });

  res.json({ ok: true, event });
});

app.delete("/api/events/:id", adminOnly, async (req, res) => {
  await prisma.event.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

app.get("/api/events/:id/share", adminOnly, async (req, res) => {
  const event = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!event) return res.status(404).json({ ok: false, message: "Événement introuvable." });

  const base = appBaseUrl(req);
  const guestUrl = `${base}/invites/${event.id}/${event.guestToken}`;
  const organizerUrl = `${base}/organisateur/${event.id}/${event.organizerToken}`;
  const qrDataUrl = await QRCode.toDataURL(guestUrl, { width: 700, margin: 2 });

  res.json({ ok: true, guestUrl, organizerUrl, qrDataUrl });
});

const distDir = path.join(__dirname, "dist");
app.use(express.static(distDir));

app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ ok: false });
  res.sendFile(path.join(distDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Location Photobooth 28 Suite V6.3.1 lancé sur le port ${PORT}`);
});
