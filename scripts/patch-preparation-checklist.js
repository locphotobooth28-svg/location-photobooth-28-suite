const fs=require("fs");
const appPath="client/src/App.jsx";
let app=fs.readFileSync(appPath,"utf8");

function replaceOnce(from,to,label){
  if(!app.includes(from)) throw new Error(`[preparation-checklist] ${label}: bloc introuvable`);
  app=app.replace(from,to);
}

if(!app.includes("LP28_PREPARATION_CHECKLIST_V1")){
  const anchor='  const groups=[...new Set(MATERIALS.map(m=>m.group))];';
  const code=`
  /* LP28_PREPARATION_CHECKLIST_V1 */
  const lp28PrepState=(form.preparation&&typeof form.preparation==="object")?form.preparation:{};
  const lp28SelectedMaterials=Array.isArray(form.materials)?form.materials:[];
  const lp28Has=(...words)=>lp28SelectedMaterials.some(m=>words.some(w=>String(m||"").toLowerCase().includes(String(w).toLowerCase())));
  const lp28Booths=lp28SelectedMaterials.filter(m=>/borne photobooth/i.test(String(m||"")));
  const lp28HasPrint=lp28SelectedMaterials.some(m=>/forfait (100|200|300|400|700)|impressions personnalisé/i.test(String(m||"")));
  const lp28BasePrep=[];
  lp28Booths.forEach(b=>lp28BasePrep.push({id:"booth-"+b,label:b,icon:"📸"}));
  if(lp28Booths.length){
    lp28BasePrep.push({id:"camera",label:"Appareil photo",icon:"📷"});
    lp28BasePrep.push({id:"umbrella",label:"Parapluie pour flash",icon:"☂️"});
    lp28BasePrep.push({id:"flash-ms300",label:"Flash Godox MS300",icon:"💡"});
    lp28BasePrep.push({id:"extension",label:"Rallonge électrique",icon:"🔌"});
    lp28BasePrep.push({id:"support",label:"Mange-debout ou tonneau",icon:"🪵"});
  }
  if(lp28HasPrint){
    lp28BasePrep.push({id:"printer",label:"Imprimante",icon:"🖨️"});
    lp28BasePrep.push({id:"paper",label:"Papier photo / consommables",icon:"🧻"});
  }
  const lp28OptionPrep=lp28SelectedMaterials.filter(m=>/livre d.or|karaok|enceinte|micro|fontaine|jet d.|poteaux|toile|clé usb/i.test(String(m||""))).map((m,i)=>({id:"option-"+String(m).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||i,label:m,icon:/livre d.or/i.test(m)?"☎️":/karaok/i.test(m)?"🎤":/enceinte|micro/i.test(m)?"🔊":/fontaine/i.test(m)?"🍹":/jet d./i.test(m)?"✨":"📦"}));
  const lp28PrepItems=[...lp28BasePrep,...lp28OptionPrep];
  const lp28PrepChecks=(lp28PrepState.checklist&&typeof lp28PrepState.checklist==="object")?lp28PrepState.checklist:{};
  const lp28PrepDone=lp28PrepItems.filter(i=>lp28PrepChecks[i.id]===true).length;
  const lp28PrepTotal=lp28PrepItems.length;
  const lp28PrepPercent=lp28PrepTotal?Math.round(lp28PrepDone*100/lp28PrepTotal):0;
  const setLp28PrepCheck=(id,value)=>setForm(f=>({...f,preparation:{...((f.preparation&&typeof f.preparation==="object")?f.preparation:{}),checklist:{...((((f.preparation&&typeof f.preparation==="object")?f.preparation:{}).checklist)||{}),[id]:value}}}));
  const lp28PreparationPanel=<section className="lp28-prep-panel" data-lp28-tab="prep">
    <style>{\`
      .lp28-prep-panel{border:1px solid rgba(70,140,255,.24);border-radius:16px;background:linear-gradient(180deg,rgba(15,26,42,.98),rgba(8,17,29,.98));padding:16px;margin:4px 0 18px;color:#f7f8fb}.lp28-prep-top{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:12px}.lp28-prep-top h3{margin:0!important;font-size:18px}.lp28-prep-top p{margin:5px 0 0;color:#aeb8c7;font-size:12px}.lp28-prep-score{white-space:nowrap;font-size:12px;font-weight:900;padding:7px 10px;border-radius:999px;background:rgba(46,140,255,.13);border:1px solid rgba(46,140,255,.35);color:#b9d8ff}.lp28-prep-progress{height:8px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden;margin-bottom:14px}.lp28-prep-progress>span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#2e8cff,#22c98b);transition:width .2s ease}.lp28-prep-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.lp28-prep-item{display:flex!important;align-items:center;gap:10px;margin:0!important;padding:11px 12px;border:1px solid rgba(255,255,255,.09);border-radius:11px;background:rgba(255,255,255,.025);cursor:pointer}.lp28-prep-item.done{border-color:rgba(34,201,139,.3);background:rgba(34,201,139,.07)}.lp28-prep-item input{width:21px!important;height:21px!important;margin:0!important;accent-color:#22c98b;flex:0 0 auto}.lp28-prep-icon{font-size:18px}.lp28-prep-label{font-weight:750;font-size:12px}.lp28-prep-complete{margin-top:12px;padding:11px 13px;border:1px solid rgba(34,201,139,.35);border-radius:11px;background:rgba(34,201,139,.1);color:#91f2d0;font-weight:900;text-align:center}.lp28-prep-empty{padding:16px;border:1px dashed rgba(255,255,255,.15);border-radius:11px;color:#aeb8c7;text-align:center;font-size:12px}@media(max-width:700px){.lp28-prep-list{grid-template-columns:1fr}.lp28-prep-top{flex-direction:column}.lp28-prep-score{align-self:flex-start}}
    \`}</style>
    <div className="lp28-prep-top"><div><h3>✅ Check-list de préparation</h3><p>Le matériel de base est ajouté selon la borne et les options cochées dans la prestation.</p></div><span className="lp28-prep-score">{lp28PrepDone}/{lp28PrepTotal} · {lp28PrepPercent}%</span></div>
    <div className="lp28-prep-progress"><span style={{width:lp28PrepPercent+"%"}}/></div>
    {lp28PrepTotal?<div className="lp28-prep-list">{lp28PrepItems.map(item=><label key={item.id} className={lp28PrepChecks[item.id]?"lp28-prep-item done":"lp28-prep-item"}><input type="checkbox" checked={lp28PrepChecks[item.id]===true} onChange={e=>setLp28PrepCheck(item.id,e.target.checked)}/><span className="lp28-prep-icon">{item.icon}</span><span className="lp28-prep-label">{item.label}</span></label>)}</div>:<div className="lp28-prep-empty">Sélectionne une borne et les options dans l’onglet Matériel : la check-list sera créée automatiquement.</div>}
    {lp28PrepTotal>0&&lp28PrepDone===lp28PrepTotal&&<div className="lp28-prep-complete">✅ Matériel prêt pour l’événement</div>}
  </section>;
`;
  replaceOnce(anchor,code+'\n'+anchor,'logique checklist');

  replaceOnce('<div className="lp28-event-tabs" role="tablist" aria-label="Sections de l’événement">','{eventTab==="prep"&&lp28PreparationPanel}\n      <div className="lp28-event-tabs" role="tablist" aria-label="Sections de l’événement">','affichage checklist');
}

fs.writeFileSync(appPath,app,"utf8");
console.log("[preparation-checklist] OK: checklist automatique et persistante ajoutée");
