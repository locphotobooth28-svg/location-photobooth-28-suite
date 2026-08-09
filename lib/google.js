const crypto = require("crypto");
const { google } = require("googleapis");
const { DateTime } = require("luxon");
const prisma = require("./prisma");

const SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.events.owned",
  "https://www.googleapis.com/auth/drive.file",
];

function configured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET
  );
}

function redirectUri(req) {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
  const base = (process.env.APP_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
  return `${base}/auth/google/callback`;
}

function getOAuthClient(req) {
  if (!configured()) {
    throw new Error("Google OAuth n'est pas configuré.");
  }
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri(req)
  );
}

function encryptionKey() {
  const source = process.env.GOOGLE_TOKEN_KEY || process.env.SESSION_SECRET;
  if (!source) {
    throw new Error("GOOGLE_TOKEN_KEY ou SESSION_SECRET est requis pour protéger les jetons Google.");
  }
  return crypto.createHash("sha256").update(source).digest();
}

function encryptJson(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map(x => x.toString("base64")).join(".");
}

function decryptJson(payload) {
  const [ivB64, tagB64, dataB64] = String(payload || "").split(".");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Jeton Google stocké invalide.");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivB64, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const clear = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final()
  ]);
  return JSON.parse(clear.toString("utf8"));
}

async function saveConnection(tokens, extra = {}) {
  const current = await prisma.googleConnection.findUnique({ where: { id: "primary" } });
  let merged = tokens;
  if (current) {
    try {
      merged = { ...decryptJson(current.tokenEncrypted), ...tokens };
    } catch {
      merged = tokens;
    }
  }

  return prisma.googleConnection.upsert({
    where: { id: "primary" },
    update: {
      tokenEncrypted: encryptJson(merged),
      googleEmail: extra.googleEmail ?? current?.googleEmail ?? null,
      scopes: extra.scopes ?? current?.scopes ?? null,
      driveRootFolderId: extra.driveRootFolderId ?? current?.driveRootFolderId ?? null,
    },
    create: {
      id: "primary",
      tokenEncrypted: encryptJson(merged),
      googleEmail: extra.googleEmail || null,
      scopes: extra.scopes || null,
      driveRootFolderId: extra.driveRootFolderId || null,
    }
  });
}

async function getConnection() {
  return prisma.googleConnection.findUnique({ where: { id: "primary" } });
}

async function getAuthorizedClient(req) {
  const connection = await getConnection();
  if (!connection) return null;

  const client = getOAuthClient(req);
  const credentials = decryptJson(connection.tokenEncrypted);
  client.setCredentials(credentials);

  client.on("tokens", async (tokens) => {
    try {
      await saveConnection(tokens);
    } catch (err) {
      console.error("Impossible de sauvegarder les nouveaux jetons Google :", err.message);
    }
  });

  return client;
}

async function disconnect() {
  await prisma.googleConnection.deleteMany({ where: { id: "primary" } });
}

function googleAuthUrl(req) {
  const client = getOAuthClient(req);
  const state = crypto.randomBytes(24).toString("hex");
  req.session.googleOAuthState = state;

  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: SCOPES,
    state,
  });
}

async function handleCallback(req, code) {
  const client = getOAuthClient(req);
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  let googleEmail = null;
  try {
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const me = await oauth2.userinfo.get();
    googleEmail = me.data.email || null;
  } catch (err) {
    console.warn("Email Google non récupéré :", err.message);
  }

  await saveConnection(tokens, {
    googleEmail,
    scopes: SCOPES.join(" "),
  });

  return { googleEmail };
}

function eventDescription(event) {
  const materials = (event.materials || []).map(x => x.material?.name).filter(Boolean);
  const lines = [
    `Location Photobooth 28 Suite`,
    event.organizerName ? `Client : ${event.organizerName}` : null,
    event.organizerPhone ? `Téléphone : ${event.organizerPhone}` : null,
    event.organizerEmail ? `E-mail : ${event.organizerEmail}` : null,
    event.guestCount ? `Invités : ${event.guestCount}` : null,
    materials.length ? `Matériel : ${materials.join(", ")}` : null,
    event.notes ? `Notes : ${event.notes}` : null,
  ];
  return lines.filter(Boolean).join("\n");
}

function eventTimes(event) {
  const zone = process.env.GOOGLE_TIMEZONE || "Europe/Paris";
  const date = event.eventDate.toISOString().slice(0, 10);
  const startTime = event.installTime || "12:00";
  const endTime = event.pickupTime || null;

  let start = DateTime.fromISO(`${date}T${startTime}`, { zone });
  let end = endTime
    ? DateTime.fromISO(`${date}T${endTime}`, { zone })
    : start.plus({ hours: 4 });

  if (end <= start) end = end.plus({ days: 1 });

  return {
    start: { dateTime: start.toISO(), timeZone: zone },
    end: { dateTime: end.toISO(), timeZone: zone },
  };
}

async function ensureDriveRoot(auth) {
  const connection = await getConnection();
  if (process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID) {
    return process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  }
  if (connection?.driveRootFolderId) return connection.driveRootFolderId;

  const drive = google.drive({ version: "v3", auth });
  const folder = await drive.files.create({
    requestBody: {
      name: "Location Photobooth 28",
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
  });

  await saveConnection({}, { driveRootFolderId: folder.data.id });
  return folder.data.id;
}

async function createFolder(drive, name, parentId) {
  const result = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : undefined,
    },
    fields: "id,webViewLink",
  });
  return result.data;
}

async function ensureEventDriveFolder(auth, event) {
  if (event.googleDriveFolderId) return event.googleDriveFolderId;

  const drive = google.drive({ version: "v3", auth });
  const rootId = await ensureDriveRoot(auth);
  const date = event.eventDate.toISOString().slice(0, 10);
  const parent = await createFolder(drive, `${date} - ${event.name}`, rootId);

  for (const sub of ["Photos", "Documents", "Galerie", "Templates"]) {
    await createFolder(drive, sub, parent.id);
  }

  await prisma.event.update({
    where: { id: event.id },
    data: { googleDriveFolderId: parent.id }
  });

  return parent.id;
}

async function syncCalendar(auth, event) {
  const calendar = google.calendar({ version: "v3", auth });
  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
  const times = eventTimes(event);

  const resource = {
    summary: `📸 ${event.name}`,
    location: event.address || undefined,
    description: eventDescription(event),
    start: times.start,
    end: times.end,
    extendedProperties: {
      private: {
        lp28EventId: event.id
      }
    }
  };

  let googleEventId = event.googleCalendarEventId;

  if (googleEventId) {
    try {
      await calendar.events.update({
        calendarId,
        eventId: googleEventId,
        requestBody: resource,
      });
      return googleEventId;
    } catch (err) {
      if (err?.code !== 404) throw err;
      googleEventId = null;
    }
  }

  const inserted = await calendar.events.insert({
    calendarId,
    requestBody: resource,
  });

  await prisma.event.update({
    where: { id: event.id },
    data: { googleCalendarEventId: inserted.data.id }
  });

  return inserted.data.id;
}

async function syncEvent(req, eventId) {
  const auth = await getAuthorizedClient(req);
  if (!auth) {
    return { connected: false, calendar: false, drive: false };
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      materials: { include: { material: true } }
    }
  });

  if (!event) throw new Error("Événement introuvable.");

  const result = { connected: true, calendar: false, drive: false, warnings: [] };

  try {
    await syncCalendar(auth, event);
    result.calendar = true;
  } catch (err) {
    console.error("Google Calendar :", err.message);
    result.warnings.push(`Agenda : ${err.message}`);
  }

  try {
    await ensureEventDriveFolder(auth, event);
    result.drive = true;
  } catch (err) {
    console.error("Google Drive :", err.message);
    result.warnings.push(`Drive : ${err.message}`);
  }

  return result;
}

async function deleteCalendarEvent(req, event) {
  if (!event?.googleCalendarEventId) return;
  const auth = await getAuthorizedClient(req);
  if (!auth) return;

  const calendar = google.calendar({ version: "v3", auth });
  try {
    await calendar.events.delete({
      calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
      eventId: event.googleCalendarEventId,
    });
  } catch (err) {
    if (err?.code !== 404) {
      console.warn("Suppression Google Calendar impossible :", err.message);
    }
  }
}

module.exports = {
  configured,
  googleAuthUrl,
  handleCallback,
  getConnection,
  getAuthorizedClient,
  disconnect,
  syncEvent,
  deleteCalendarEvent,
};
