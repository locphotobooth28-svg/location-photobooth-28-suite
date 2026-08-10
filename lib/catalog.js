const MATERIAL_CATALOG = [
  // Bornes : le prix dépend du forfait d'impression,
  // donc pas de defaultPrice directement sur la borne.
  { name:"Borne Photobooth Miroir Lola", category:"Bornes", capacity:1, blocksPlanning:true, bookingVisible:true, resourceKind:"UNIQUE", defaultPrice:null },
  { name:"Borne Photobooth Nina", category:"Bornes", capacity:1, blocksPlanning:true, bookingVisible:true, resourceKind:"UNIQUE", defaultPrice:null },
  { name:"Borne Photobooth Gabin", category:"Bornes", capacity:1, blocksPlanning:true, bookingVisible:true, resourceKind:"UNIQUE", defaultPrice:null },

  // Composants intégrés
  { name:"Nikon D7200", category:"Composants intégrés", capacity:3, blocksPlanning:false, bookingVisible:false, resourceKind:"FIXED_COMPONENT", defaultPrice:null },
  { name:"Flash Godox", category:"Composants intégrés", capacity:3, blocksPlanning:false, bookingVisible:false, resourceKind:"FIXED_COMPONENT", defaultPrice:null },
  { name:"Parapluie", category:"Composants intégrés", capacity:6, blocksPlanning:false, bookingVisible:false, resourceKind:"FIXED_COMPONENT", defaultPrice:null },

  // Compatibilité anciens événements
  { name:"Appareil photo Reflex Nikon D7200", category:"Composants intégrés", capacity:3, blocksPlanning:false, bookingVisible:false, resourceKind:"FIXED_COMPONENT", defaultPrice:null },
  { name:"Flash + parapluie", category:"Composants intégrés", capacity:3, blocksPlanning:false, bookingVisible:false, resourceKind:"FIXED_COMPONENT", defaultPrice:null },

  // Supports
  { name:"Tonneau", category:"Supports", capacity:2, blocksPlanning:true, bookingVisible:true, resourceKind:"SHARED", defaultPrice:null },
  { name:"Mange-debout", category:"Supports", capacity:2, blocksPlanning:true, bookingVisible:true, resourceKind:"SHARED", defaultPrice:null },

  // Options
  { name:"Personnalisation cadre photo", category:"Options", capacity:9999, blocksPlanning:false, bookingVisible:true, resourceKind:"SERVICE", defaultPrice:25 },
  { name:"Clé USB photos", category:"Options", capacity:9999, blocksPlanning:false, bookingVisible:true, resourceKind:"SERVICE", defaultPrice:10 },

  { name:"Location livre d'or audio", category:"Options", capacity:2, blocksPlanning:true, bookingVisible:true, resourceKind:"SHARED", defaultPrice:40 },
  { name:"Clé USB livre d'or audio", category:"Options", capacity:9999, blocksPlanning:false, bookingVisible:true, resourceKind:"SERVICE", defaultPrice:10 },

  { name:"Location enceinte LG 1000w", category:"Options", capacity:1, blocksPlanning:true, bookingVisible:true, resourceKind:"SHARED", defaultPrice:50 },
  { name:"Location enceinte LG 1000w + 2 micros", category:"Options", capacity:1, blocksPlanning:true, bookingVisible:true, resourceKind:"SHARED", defaultPrice:70 },
  { name:"Location 2 micros JBL", category:"Options", capacity:1, blocksPlanning:true, bookingVisible:true, resourceKind:"SHARED", defaultPrice:30 },

  { name:"Location Fontaine + 1 ou 2 contenant de 30L", category:"Options", capacity:1, blocksPlanning:true, bookingVisible:true, resourceKind:"SHARED", defaultPrice:50 },

  { name:"Location Écran Karaoké", category:"Options", capacity:1, blocksPlanning:true, bookingVisible:true, resourceKind:"SHARED", defaultPrice:40 },
  { name:"Location Écran Karaoké + enceinte + 2 micros", category:"Options", capacity:1, blocksPlanning:true, bookingVisible:true, resourceKind:"SHARED", defaultPrice:100 },

  { name:"Location 6 poteaux de guidage + corde", category:"Options", capacity:1, blocksPlanning:true, bookingVisible:true, resourceKind:"SHARED", defaultPrice:50 },
  { name:"Location tapis rouge 5m", category:"Options", capacity:1, blocksPlanning:true, bookingVisible:true, resourceKind:"SHARED", defaultPrice:20 },

  // Effets spéciaux
  { name:"Location Kit Jet d'étincelle", category:"Effets spéciaux", capacity:12, blocksPlanning:true, bookingVisible:true, resourceKind:"QUANTITY", defaultPrice:60 },

  // Forfaits impressions :
  // prix calculé selon Lola ou Nina/Gabin.
  { name:"Forfait sans aucune impression", category:"Impressions", capacity:9999, blocksPlanning:false, bookingVisible:true, resourceKind:"SERVICE", defaultPrice:null },
  { name:"Forfait 100 impressions", category:"Impressions", capacity:9999, blocksPlanning:false, bookingVisible:true, resourceKind:"SERVICE", defaultPrice:null },
  { name:"Forfait 200 impressions", category:"Impressions", capacity:9999, blocksPlanning:false, bookingVisible:true, resourceKind:"SERVICE", defaultPrice:null },
  { name:"Forfait 300 impressions", category:"Impressions", capacity:9999, blocksPlanning:false, bookingVisible:true, resourceKind:"SERVICE", defaultPrice:null },
  { name:"Forfait 400 impressions", category:"Impressions", capacity:9999, blocksPlanning:false, bookingVisible:true, resourceKind:"SERVICE", defaultPrice:null },
  { name:"Forfait 700 impressions", category:"Impressions", capacity:9999, blocksPlanning:false, bookingVisible:true, resourceKind:"SERVICE", defaultPrice:null },
  { name:"Forfait impressions personnalisé", category:"Impressions", capacity:9999, blocksPlanning:false, bookingVisible:true, resourceKind:"SERVICE", defaultPrice:null }
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
        resourceKind:item.resourceKind,
        defaultPrice:item.defaultPrice ?? null
      },
      create:{
        name:item.name,
        category:item.category,
        active:true,
        capacity:item.capacity,
        blocksPlanning:item.blocksPlanning,
        bookingVisible:item.bookingVisible,
        resourceKind:item.resourceKind,
        defaultPrice:item.defaultPrice ?? null
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
          resourceKind:item.resourceKind,
          defaultPrice:item.defaultPrice ?? null
        } : {})
      },
      create:{
        name,
        category:item?.category||"Autres",
        active:true,
        capacity:item?.capacity||1,
        blocksPlanning:item?.blocksPlanning ?? true,
        bookingVisible:item?.bookingVisible ?? true,
        resourceKind:item?.resourceKind||"SHARED",
        defaultPrice:item?.defaultPrice ?? null
      }
    });
  }

  return prisma.material.findMany({where:{name:{in:selected}}});
}

module.exports={MATERIAL_CATALOG,PRINTERS,ensureCatalog,ensureSelectedMaterials};
