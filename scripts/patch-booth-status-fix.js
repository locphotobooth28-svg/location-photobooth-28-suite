const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "client", "src", "App.jsx");
let source = fs.readFileSync(appPath, "utf8");

const oldCode = 'const live=opsBooths.find(b=>String(b?.booth||b?.name||"").toUpperCase().includes(row.id));';
const newCode = 'const live=opsBooths.find(b=>Object.values(b||{}).some(v=>typeof v==="string"&&v.toUpperCase().includes(row.id)));';

if (source.includes(newCode)) {
  console.log("[LP28] Statut dynamique des bornes déjà corrigé.");
  process.exit(0);
}

if (!source.includes(oldCode)) {
  throw new Error("[LP28] Expression de statut des bornes introuvable.");
}

source = source.replace(oldCode, newCode);
fs.writeFileSync(appPath, source, "utf8");
console.log("[LP28] Statut des bornes relié aux données live /api/admin/booths.");
