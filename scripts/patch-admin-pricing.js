const fs=require("fs"),path=require("path");
const appPath=path.join(process.cwd(),"client","src","App.jsx");
const serverPath=path.join(process.cwd(),"server.js");
let app=fs.readFileSync(appPath,"utf8"),server=fs.readFileSync(serverPath,"utf8");
const MARK="LP28_ADMIN_PRICING_V1";

if(!server.includes(MARK)){
 const anchor='// ---------------- V8 ADMIN ONLY : inventaire / imprimantes / papier ----------------';
 if(!server.includes(anchor))throw new Error("[pricing] ancre serveur introuvable");
 const block=`// ${MARK}
const LP28_DEFAULT_PRICING={
 travelRate:0.70,travelFreeKm:15,framePrice:25,extraDayPrice:50,operatorPrice:150,extra100PrintsPrice:100,
 printPacks:{
  "Forfait sans aucune impression":{lola:0,other:0},
  "Forfait 100 impressions":{lola:250,other:250},
  "Forfait 200 impressions":{lola:300,other:300},
  "Forfait 300 impressions":{lola:350,other:350},
  "Forfait 400 impressions":{lola:400,other:400},
  "Forfait 700 impressions":{lola:500,other:500}
 }
};
async function lp28Pricing(){
 const row=await prisma.appSetting.findUnique({where:{key:"lp28Pricing"}}).catch(()=>null);
 let saved={};try{saved=row?.value?JSON.parse(row.value):{}}catch{}
 const materials=await prisma.material.findMany({where:{active:true},orderBy:[{category:"asc"},{name:"asc"}]});
 return {...LP28_DEFAULT_PRICING,...saved,printPacks:{...LP28_DEFAULT_PRICING.printPacks,...(saved.printPacks||{})},materials:materials.map(m=>({id:m.id,name:m.name,category:m.category,defaultPrice:m.defaultPrice==null?null:Number(m.defaultPrice)}))};
}
app.get("/api/pricing",async(req,res)=>{try{res.json({ok:true,pricing:await lp28Pricing()})}catch(e){res.status(500).json({ok:false,message:"Tarifs indisponibles."})}});
app.put("/api/admin/pricing",adminOnly,async(req,res)=>{
 try{
  const b=req.body||{},num=(v,d=0)=>Math.max(Number(v??d)||0,0);
  const pricing={travelRate:num(b.travelRate,.70),travelFreeKm:num(b.travelFreeKm,15),framePrice:num(b.framePrice,25),extraDayPrice:num(b.extraDayPrice,50),operatorPrice:num(b.operatorPrice,150),extra100PrintsPrice:num(b.extra100PrintsPrice,100),printPacks:{}};
  for(const [name,p] of Object.entries(b.printPacks||{}))pricing.printPacks[name]={lola:num(p?.lola),other:num(p?.other)};
  await prisma.appSetting.upsert({where:{key:"lp28Pricing"},update:{value:JSON.stringify(pricing)},create:{key:"lp28Pricing",value:JSON.stringify(pricing)}});
  for(const m of Array.isArray(b.materials)?b.materials:[]){
   if(!m?.id)continue;
   const v=m.defaultPrice===""||m.defaultPrice==null?null:num(m.defaultPrice);
   await prisma.material.update({where:{id:m.id},data:{defaultPrice:v}}).catch(()=>{});
  }
  res.json({ok:true,pricing:await lp28Pricing()});
 }catch(e){console.error("Tarifs LP28 :",e);res.status(500).json({ok:false,message:"Impossible d’enregistrer les tarifs."})}
});
`;
 server=server.replace(anchor,block+"\n"+anchor);
 fs.writeFileSync(serverPath,server,"utf8");
}

if(!app.includes(MARK)){
 const funcAnchor='function SettingsPage({user}){';
 if(!app.includes(funcAnchor))throw new Error("[pricing] SettingsPage introuvable");
 const component=`function LP28PricingSettings(){
 const [pricing,setPricing]=useState(null),[busy,setBusy]=useState(false);
 useEffect(()=>{fetch("/api/pricing").then(r=>r.json()).then(d=>d.ok&&setPricing(d.pricing)).catch(()=>{})},[]);
 if(!pricing)return <div className="panel"><p>Chargement des tarifs…</p></div>;
 const set=(k,v)=>setPricing(p=>({...p,[k]:v}));
 const pack=(name,k,v)=>setPricing(p=>({...p,printPacks:{...p.printPacks,[name]:{...(p.printPacks[name]||{}),[k]:v}}}));
 const material=(id,v)=>setPricing(p=>({...p,materials:p.materials.map(m=>m.id===id?{...m,defaultPrice:v}:m)}));
 async function save(){setBusy(true);try{const r=await fetch("/api/admin/pricing",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(pricing)});const d=await r.json();if(!r.ok)throw new Error(d.message);setPricing(d.pricing);alert("✅ Tarifs LP28 enregistrés.");}catch(e){alert(e.message||"Enregistrement impossible.");}finally{setBusy(false)}}
 const money=(value,onChange)=><input type="number" min="0" step="0.01" value={value??""} onChange={e=>onChange(e.target.value)}/>;
 return <div className="panel"><div className="eyebrow">GESTION COMMERCIALE</div><h2>💶 Tarifs & produits</h2><p className="muted">Les nouveaux devis et événements utilisent ces tarifs. Les événements déjà enregistrés gardent leurs montants.</p>
 <h3>🚗 Déplacement & services</h3><div className="form-grid">
  <label>Tarif kilométrique (€ / km){money(pricing.travelRate,v=>set("travelRate",v))}</label>
  <label>Kilomètres offerts{money(pricing.travelFreeKm,v=>set("travelFreeKm",v))}</label>
  <label>Personnalisation cadre (€){money(pricing.framePrice,v=>set("framePrice",v))}</label>
  <label>Journée supplémentaire (€){money(pricing.extraDayPrice,v=>set("extraDayPrice",v))}</label>
  <label>Présence opérateur (€){money(pricing.operatorPrice,v=>set("operatorPrice",v))}</label>
  <label>100 impressions supplémentaires (€){money(pricing.extra100PrintsPrice,v=>set("extra100PrintsPrice",v))}</label>
 </div>
 <h3 style={{marginTop:20}}>📸 Forfaits Photobooth / impressions</h3><div style={{overflowX:"auto"}}><table><thead><tr><th>Forfait</th><th>Lola (€)</th><th>Nina / Gabin (€)</th></tr></thead><tbody>{Object.entries(pricing.printPacks||{}).map(([name,p])=><tr key={name}><td>{name}</td><td>{money(p.lola,v=>pack(name,"lola",v))}</td><td>{money(p.other,v=>pack(name,"other",v))}</td></tr>)}</tbody></table></div>
 <h3 style={{marginTop:20}}>🎉 Produits & options</h3><div style={{overflowX:"auto"}}><table><thead><tr><th>Produit</th><th>Catégorie</th><th>Prix TTC (€)</th></tr></thead><tbody>{(pricing.materials||[]).filter(m=>m.category!=="Composants intégrés").map(m=><tr key={m.id}><td>{m.name}</td><td>{m.category}</td><td>{money(m.defaultPrice,v=>material(m.id,v))}</td></tr>)}</tbody></table></div>
 <button className="primary" disabled={busy} onClick={save} style={{marginTop:18}}>{busy?"Enregistrement…":"💾 Enregistrer tous les tarifs"}</button></div>;
}

`;
 app=app.replace(funcAnchor,component+funcAnchor);
 const tab='<button className={settingsTab==="security"?"active":""} onClick={()=>setSettingsTab("security")}>Sécurité</button>';
 if(!app.includes(tab))throw new Error("[pricing] onglet sécurité introuvable");
 app=app.replace(tab,'{isAdmin&&<button className={settingsTab==="pricing"?"active":""} onClick={()=>setSettingsTab("pricing")}>💶 Tarifs & produits</button>}\n      '+tab);
 const content='{isAdmin&&settingsTab==="general"&&<>';
 if(!app.includes(content))throw new Error("[pricing] contenu général introuvable");
 app=app.replace(content,'{isAdmin&&settingsTab==="pricing"&&<LP28PricingSettings/>}\n\n    '+content);

 const printAnchor='const PRINT_MATERIALS = [';
 const idx=app.indexOf(printAnchor); if(idx<0)throw new Error("[pricing] forfaits introuvables");
 // Runtime pricing hook in EventForm: load settings and use them for travel + displayed rate.
 const eventAnchor='function EventForm({event,onClose,onSaved}) {';
 if(!app.includes(eventAnchor))throw new Error("[pricing] EventForm introuvable");
 app=app.replace(eventAnchor,eventAnchor+'\n  const [lp28Pricing,setLp28Pricing]=useState(null);\n  useEffect(()=>{fetch("/api/pricing").then(r=>r.json()).then(d=>d.ok&&setLp28Pricing(d.pricing)).catch(()=>{})},[]);');
 app=app.replace('return Math.max(distance - freeKm, 0) * 0.50;','return Math.max(distance - freeKm, 0) * Number(globalThis.__LP28_TRAVEL_RATE__||0.70);');
 app=app.replace('<input value="0,50 € / km" readOnly />','<input value={`${Number(lp28Pricing?.travelRate??0.70).toFixed(2).replace(".",",")} € / km`} readOnly />');
 app=app.replace('travelRate:0.50','travelRate:Number(lp28Pricing?.travelRate??0.70)');
 // EventForm publishes current rate for existing helper without invasive refactor.
 app=app.replace('const [lp28Pricing,setLp28Pricing]=useState(null);','const [lp28Pricing,setLp28Pricing]=useState(null);\n  globalThis.__LP28_TRAVEL_RATE__=Number(lp28Pricing?.travelRate??0.70);');
 fs.writeFileSync(appPath,app,"utf8");
}
console.log("[pricing] OK: paramètres Admin tarifs et produits");