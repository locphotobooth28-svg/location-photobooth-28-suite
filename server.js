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
require("./services/r2Patch");
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
    cb(ok?null:new Error("Format non autorisé."),ok);
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
