
const express = require("express");
const session = require("express-session");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);
app.use(express.json());
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

app.get("/api/health", (req, res) => {
  res.json({ ok: true, app: "Location Photobooth 28 Suite", version: "5.1.0" });
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

function adminOnly(req, res, next) {
  if (req.session.admin) return next();
  return res.status(401).json({ ok: false, message: "Non autorisé." });
}

app.get("/api/dashboard", adminOnly, (req, res) => {
  res.json({
    stats: {
      events: 0,
      photos: 0,
      videos: 0,
      activeGalleries: 0
    },
    upcoming: []
  });
});

const distDir = path.join(__dirname, "dist");
app.use(express.static(distDir));

app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ ok: false });
  res.sendFile(path.join(distDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Location Photobooth 28 Suite V5.1.0 lancé sur le port ${PORT}`);
});
