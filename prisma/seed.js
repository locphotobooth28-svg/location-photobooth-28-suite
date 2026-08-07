const prisma = require("../lib/prisma");

const MATERIALS = [
  ["Borne Photobooth Miroir Lola","Bornes & photo"],
  ["Borne Photobooth Nina","Bornes & photo"],
  ["Borne Photobooth Gabin","Bornes & photo"],
  ["Appareil photo Reflex Nikon D7200","Bornes & photo"],
  ["Flash + parapluie","Bornes & photo"],
  ["Forfait sans aucune impression","Impressions"],
  ["Forfait 100 impressions","Impressions"],
  ["Forfait 200 impressions","Impressions"],
  ["Forfait 300 impressions","Impressions"],
  ["Forfait 400 impressions","Impressions"],
  ["Forfait 700 impressions","Impressions"],
  ["Location livre d'or audio","Options"],
  ["Location Fontaine + 1 ou 2 contenant de 30L","Options"],
  ["Location enceinte LG 1000w + 2 micros","Options"],
  ["Location 2 micros JBL","Options"],
  ["Location Écran Karaoké","Options"],
  ["Location Écran Karaoké + enceinte + 2 micros","Options"],
  ["Location Kit Jet d'étincelle","Options"],
  ["6 Poteaux + corde","Options"],
  ["6 Poteaux + corde avec tapis rouge de cérémonie","Options"]
];

async function main() {
  for (const [name, category] of MATERIALS) {
    await prisma.material.upsert({
      where: { name },
      update: { category, active: true },
      create: { name, category }
    });
  }

  await prisma.consumable.upsert({
    where: { name: "Papier Citizen" },
    update: { printer: "Citizen CY-02", unitsPerBox: 1400 },
    create: {
      name: "Papier Citizen",
      printer: "Citizen CY-02",
      unitsPerBox: 1400,
      currentUnits: 1400,
      warningAt: 300,
      criticalAt: 100
    }
  });

  await prisma.consumable.upsert({
    where: { name: "Papier DNP" },
    update: { printer: "DNP RX1HS", unitsPerBox: 800 },
    create: {
      name: "Papier DNP",
      printer: "DNP RX1HS",
      unitsPerBox: 800,
      currentUnits: 800,
      warningAt: 200,
      criticalAt: 100
    }
  });

  console.log("Seed LP28 terminé.");
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(async () => prisma.$disconnect());
