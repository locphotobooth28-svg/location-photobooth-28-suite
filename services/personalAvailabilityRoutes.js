"use strict";

// Disponibilités personnelles administrateur LP28.
// Stockage persistant dans AppSetting, sans migration de schéma.
module.exports = function registerPersonalAvailabilityRoutes(app, prisma, adminOnly) {
  const KEY = "LP28_PERSONAL_AVAILABILITY_V1";
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const validDay = value => {
    const v = String(value || "");
    if (!DATE_RE.test(v) || v < "2025-01-01" || v > "2040-12-31") return false;
    const d = new Date(v + "T12:00:00.000Z");
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  };
  const parse = row => {
    try {
      const data = JSON.parse(row?.value || "{}");
      if (!data || typeof data !== "object" || Array.isArray(data)) return {};
      return Object.fromEntries(Object.entries(data).filter(([key, value]) =>
        validDay(key) && value && ["AVAILABLE", "UNAVAILABLE"].includes(value.status)
      ).map(([key, value]) => [key, {
        status: value.status,
        note: String(value.note || "").slice(0, 180)
      }]));
    } catch {
      return {};
    }
  };

  app.get("/api/admin/personal-availability", adminOnly, async (req, res) => {
    try {
      res.set("Cache-Control", "no-store");
      const row = await prisma.appSetting.findUnique({where: {key: KEY}});
      res.json({ok: true, entries: parse(row), updatedAt: row?.updatedAt || null});
    } catch (err) {
      console.error("[personal-availability] lecture", err);
      res.status(500).json({ok: false, message: "Disponibilités personnelles indisponibles."});
    }
  });

  app.put("/api/admin/personal-availability", adminOnly, async (req, res) => {
    try {
      const date = String(req.body?.date || "");
      const status = String(req.body?.status || "");
      const note = String(req.body?.note || "").trim().slice(0, 180);
      if (!validDay(date) || !["AVAILABLE", "UNAVAILABLE", "UNKNOWN"].includes(status))
        return res.status(400).json({ok: false, message: "Date ou disponibilité invalide."});

      // Une lecture/écriture administrateur, un jour à la fois.
      const row = await prisma.appSetting.findUnique({where: {key: KEY}});
      const entries = parse(row);
      if (status === "UNKNOWN") delete entries[date];
      else entries[date] = {status, note};
      if (Object.keys(entries).length > 1400)
        return res.status(400).json({ok: false, message: "Trop de dates enregistrées."});
      const updated = await prisma.appSetting.upsert({
        where: {key: KEY},
        create: {key: KEY, value: JSON.stringify(entries)},
        update: {value: JSON.stringify(entries)}
      });
      res.set("Cache-Control", "no-store");
      res.json({ok: true, entries: parse(updated), updatedAt: updated.updatedAt});
    } catch (err) {
      console.error("[personal-availability] écriture", err);
      res.status(500).json({ok: false, message: "Impossible de sauvegarder cette disponibilité."});
    }
  });
};
