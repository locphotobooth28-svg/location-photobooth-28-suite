const prisma=require("../lib/prisma");
const {ensureCatalog}=require("../lib/catalog");
ensureCatalog(prisma)
  .then(()=>console.log("Catalogue LP28 initialisé."))
  .catch(e=>{console.error(e);process.exit(1)})
  .finally(()=>prisma.$disconnect());
