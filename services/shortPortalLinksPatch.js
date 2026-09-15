// LP28 - Liens courts de portail, sans migration BDD.
// Conserve les tokens longs comme secrets internes et expose des alias courts stables.
// /o/:code = organisateur, /i/:code = invité.

const crypto = require("crypto");
const express = require("express");
const prisma = require("../lib/prisma");

const CODE_LENGTH = 12;

function shortCode(role, eventId) {
  const secret = String(process.env.SESSION_SECRET || process.env.PORTAL_SHORTLINK_SECRET || "lp28-short-links");
  return crypto
    .createHmac("sha256", secret)
    .update(`${role}:${eventId}`)
    .digest("base64url")
    .slice(0, CODE_LENGTH);
}

function appBaseUrl(req) {
  const configured = String(process.env.APP_BASE_URL || "").trim().replace(/\/$/, "");
  if (configured) return configured;
  return `${req.protocol}://${req.get("host")}`;
}

function installShortPortalLinks(app) {
  if (!app || app.__lp28ShortPortalLinksInstalled) return;
  app.__lp28ShortPortalLinksInstalled = true;

  async function resolve(req, res, role) {
    try {
      const events = await prisma.event.findMany({
        where: { portalEnabled: true },
        select: { id: true, organizerToken: true, guestToken: true }
      });
      const event = events.find(e => shortCode(role, e.id) === req.params.code);
      const token = role === "organizer" ? event?.organizerToken : event?.guestToken;
      if (!event || !token) return res.status(404).send("Lien LP28 introuvable ou désactivé.");
      return res.redirect(302, `/portal/${encodeURIComponent(token)}`);
    } catch (err) {
      console.error("LP28 lien court portail :", err);
      return res.status(500).send("Impossible d'ouvrir le portail LP28.");
    }
  }

  app.get("/o/:code", (req, res) => resolve(req, res, "organizer"));
  app.get("/i/:code", (req, res) => resolve(req, res, "guest"));

  // Endpoint admin pratique pour les boutons Copier/Partager.
  app.get("/api/events/:id/short-portal-links", async (req, res) => {
    try {
      if (!req.session?.admin && !req.session?.userId) {
        return res.status(401).json({ ok: false, message: "Non autorisé." });
      }
      const event = await prisma.event.findUnique({
        where: { id: req.params.id },
        select: { id: true, portalEnabled: true, organizerToken: true, guestToken: true }
      });
      if (!event) return res.status(404).json({ ok: false, message: "Événement introuvable." });
      const base = appBaseUrl(req);
      return res.json({
        ok: true,
        organizerUrl: event.organizerToken ? `${base}/o/${shortCode("organizer", event.id)}` : null,
        guestUrl: event.guestToken ? `${base}/i/${shortCode("guest", event.id)}` : null
      });
    } catch (err) {
      console.error("LP28 génération liens courts :", err);
      return res.status(500).json({ ok: false, message: "Impossible de générer les liens courts." });
    }
  });
}

// Patch Express : installe les routes avant le catch-all SPA de server.js.
const originalListen = express.application.listen;
express.application.listen = function patchedListen(...args) {
  installShortPortalLinks(this);
  express.application.listen = originalListen;
  return originalListen.apply(this, args);
};

module.exports = { shortCode, installShortPortalLinks };
