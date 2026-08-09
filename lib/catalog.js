const MATERIAL_CATALOG = [
  // Bornes : uniques. Le Nikon D7200 + flash + parapluie restent intégrés à chaque borne.
  { name:"Borne Photobooth Miroir Lola", category:"Bornes", capacity:1, blocksPlanning:true, bookingVisible:true, resourceKind:"UNIQUE" },
  { name:"Borne Photobooth Nina", category:"Bornes", capacity:1, blocksPlanning:true, bookingVisible:true, resourceKind:"UNIQUE" },
  { name:"Borne Photobooth Gabin", category:"Bornes", capacity:1, blocksPlanning:true, bookingVisible:true, resourceKind:"UNIQUE" },

  // Composants intégrés : visibles uniquement dans l'administration.
  { name:"Nikon D7200", category:"Composants intégrés", capacity:3, blocksPlanning:false, bookingVisible:false, resourceKind:"FIXED_COMPONENT" },
  { name:"Flash Godox", category:"Composants intégrés", capacity:3, blocksPlanning:false, bookingVisible:false, resourceKind:"FIXED_COMPONENT" },
  { name:"Parapluie", category:"Composants intégrés", capacity:6, blocksPlanning:false, bookingVisible:false, resourceKind:"FIXED_COMPONENT" },

  // Compatibilité anciens événements V7/V8 : ne doivent JAMAIS bloquer le planning.
  { name:"Appareil photo Reflex Nikon D7200", category:"Composants intégrés", capacity:3, blocksPlanning:false, bookingVisible:false, resourceKind:"FIXED_COMPONENT" },
  { name:"Flash + parapluie", category:"Composants intégrés", capacity:3, blocksPlanning:false, bookingVisible:false, resourceKind:"FIXED_COMPONENT" },

  // Supports : mutualisés.
  { name:"Tonneau", category:"Supports", capacity:2, blocksPlanning:true, bookingVisible:true, resourceKind:"SHARED" },
  { name:"Mange-debout", category:"Supports", capacity:2, blocksPlanning:true, bookingVisible:true, resourceKind:"SHARED" },

  // Options mutualisées.
  { name:"Location livre d'or audio", category:"Options", capacity:2, blocksPlanning:true, bookingVisible:true, resourceKind:"SHARED" },
  { name:"Location enceinte LG 1000w + 2 micros", category:"Options", capacity:1, blocksPlanning:true, bookingVisible:true, resourceKind:"SHARED" },
  { name:"Location 2 micros JBL", category:"Options", capacity:1, blocksPlanning:true, bookingVisible:true, resourceKind:"SHARED" },
  { name:"Location Fontaine + 1 ou 2 contenant de 30L", category:"Options", capacity:1, blocksPlanning:true, bookingVisible:true, resourceKind:"SHARED" },
  { name:"Location Écran Karaoké", category:"Options", capacity:1, blocksPlanning:true, bookingVisible:true, resourceKind:"SHARED" },
  { name:"Location Écran Karaoké + enceinte + 2 micros", category:"Options", capacity:1, blocksPlanning:true, bookingVisible:true, resourceKind:"SHARED" },

  // Jets : le nombre réservé vient de sceneJets.boxes (1 à 12).
  { name:"Location Kit Jet d'étincelle", category:"Effets spéciaux", capacity:12, blocksPlanning:true, bookingVisible:true, resourceKind:"QUANTITY" },

  // Forfaits : informations commerciales, JAMAIS des ressources bloquantes.
  { name:"Forfait sans aucune impression", category:"Impressions", capacity:9999, blocksPlanning:false, bookingVisible:true, resourceKind:"SERVICE" },
  { name:"Forfait 100 impressions", category:"Impressions", capacity:9999, blocksPlanning:false, bookingVisible:true, resourceKind:"SERVICE" },
  { name:"Forfait 200 impressions", category:"Impressions", capacity:9999, blocksPlanning:false, bookingVisible:true, resourceKind:"SERVICE" },
  { name:"Forfait 300 impressions", category:"Impressions", capacity:9999, blocksPlanning:false, bookingVisible:true, resourceKind:"SERVICE" },
  { name:"Forfait 400 impressions", category:"Impressions", capacity:9999, blocksPlanning:false, bookingVisible:true, resourceKind:"SERVICE" },
  { name:"Forfait 700 impressions", category:"Impressions", capacity:9999, blocksPlanning:false, bookingVisible:true, resourceKind:"SERVICE" }
];

const PRINTERS = [
  { name:"Citizen CY-02", model:"Citizen CY-02", loadedCapacity:700, remainingPrints:700, warningAt:100 },
  { name:"DNP DS620 n°1", model:"DNP DS620", loadedCapacity:400, remainingPrints:400, warningAt:100 },
  { name:"DNP DS620 n°2", model:"DNP DS620", loadedCapacity:400, remainingPrints:400, warningAt:100 }
];

async function ensureCatalog(prisma){
  for(const item of MATERIAL_CATALOG){
    await prisma.material.upsert({
      where:{name:item.name},
      update:{
        category:item.category,
        active:true,
        capacity:item.capacity,
        blocksPlanning:item.blocksPlanning,
        bookingVisible:item.bookingVisible,
        resourceKind:item.resourceKind
      },
      create:{
        name:item.name,
        category:item.category,
        active:true,
        capacity:item.capacity,
        blocksPlanning:item.blocksPlanning,
        bookingVisible:item.bookingVisible,
        resourceKind:item.resourceKind
      }
    });
  }

  for(const p of PRINTERS){
    await prisma.printer.upsert({
      where:{name:p.name},
      update:{model:p.model,active:true,warningAt:p.warningAt},
      create:p
    });
  }
}

async function ensureSelectedMaterials(prisma,names){
  const selected=[...new Set((Array.isArray(names)?names:[]).map(v=>String(v||"").trim()).filter(Boolean))];
  const byName=new Map(MATERIAL_CATALOG.map(x=>[x.name,x]));

  for(const name of selected){
    const item=byName.get(name);
    await prisma.material.upsert({
      where:{name},
      update:{
        active:true,
        ...(item ? {
          category:item.category,
          capacity:item.capacity,
          blocksPlanning:item.blocksPlanning,
          bookingVisible:item.bookingVisible,
          resourceKind:item.resourceKind
        } : {})
      },
      create:{
        name,
        category:item?.category||"Autres",
        active:true,
        capacity:item?.capacity||1,
        blocksPlanning:item?.blocksPlanning ?? true,
        bookingVisible:item?.bookingVisible ?? true,
        resourceKind:item?.resourceKind||"SHARED"
      }
    });
  }

  return prisma.material.findMany({where:{name:{in:selected}}});
}

module.exports={MATERIAL_CATALOG,PRINTERS,ensureCatalog,ensureSelectedMaterials};
