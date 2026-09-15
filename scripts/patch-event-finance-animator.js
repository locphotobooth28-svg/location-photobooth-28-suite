const fs=require('fs');
const appPath='client/src/App.jsx';
const contractPath='services/contractService.js';
const serverPath='server.js';
let app=fs.readFileSync(appPath,'utf8');
let contract=fs.readFileSync(contractPath,'utf8');
let server=fs.readFileSync(serverPath,'utf8');
let changes=0;

// Ce patch s'execute AVANT patch-event-form-tabs.js : on ne touche donc pas ici
// a la barre d'onglets, qui n'existe pas encore a ce stade du build.

// 1. Option animateur Johan : insertion dans le formulaire, explicitement classee Materiel.
if(!app.includes('LP28_ANIMATEUR_JOHAN_V1')){
  const formAnchor='    <form onSubmit={save}>';
  if(!app.includes(formAnchor))throw new Error('[event-finance-animator] formulaire evenement introuvable');
  const insert=`
      <div data-lp28-tab="material" className="panel" style={{marginBottom:16,padding:16}}>
        {/* LP28_ANIMATEUR_JOHAN_V1 */}
        <h3 style={{marginTop:0}}>👤 Option animateur Johan</h3>
        <label style={{display:"flex",gap:10,alignItems:"flex-start"}}>
          <input type="checkbox" style={{width:"auto",marginTop:3}} checked={form.preparation?.animatorJohan===true} onChange={e=>setForm(f=>({...f,preparation:{...(f.preparation||{}),animatorJohan:e.target.checked}}))}/>
          <span><strong>Animateur Johan – gestion de la borne du début à la fin</strong><br/><span className="muted">Johan s’occupe de la borne pendant toute l’animation. Le client n’a pas à prévoir de chèque de caution pour l’animation de la borne photo.</span></span>
        </label>
        {form.preparation?.animatorJohan===true&&<div style={{marginTop:12,maxWidth:260}}>
          <label>Prix de l’option animateur (€)</label>
          <input type="number" min="0" step="0.01" value={form.preparation?.animatorJohanPrice??""} onChange={e=>setForm(f=>({...f,preparation:{...(f.preparation||{}),animatorJohanPrice:e.target.value}}))} placeholder="Ex. 150"/>
        </div>}
      </div>`;
  app=app.replace(formAnchor,formAnchor+insert);changes++;
}

// 2. Contrat : afficher l'option et son prix avec la mention absence de caution.
if(!contract.includes('const animatorJohan = event.preparation?.animatorJohan === true;')){
  const anchor='  const framePricing = getFramePricing(event);';
  if(!contract.includes(anchor))throw new Error('[event-finance-animator] ancre contrat introuvable');
  contract=contract.replace(anchor,anchor+'\n  const animatorJohan = event.preparation?.animatorJohan === true;\n  const animatorJohanPrice = Number(event.preparation?.animatorJohanPrice);');
  const sectionStart=contract.indexOf('section(1,"Désignation du matériel loué");');
  const nextSection=contract.indexOf('section(2,',sectionStart);
  if(sectionStart<0||nextSection<0)throw new Error('[event-finance-animator] section matériel contrat introuvable');
  const sep=contract.lastIndexOf('  separator();',nextSection);
  if(sep<sectionStart)throw new Error('[event-finance-animator] fin section matériel introuvable');
  const contractText='  if(animatorJohan){\n    const priceLabel=Number.isFinite(animatorJohanPrice)?money(animatorJohanPrice):"Prix non renseigné";\n    bullet(`Option animateur Johan : ${priceLabel}`);\n    bullet("Johan assure la gestion de la borne du début à la fin de l’animation. Aucun chèque de caution n’est à prévoir pour l’animation de la borne photo.");\n  }\n\n';
  contract=contract.slice(0,sep)+contractText+contract.slice(sep);changes++;
}

// 3. Empreinte du contrat : toute modification de l'option invalide l'ancien contrat a signer.
if(!server.includes('animatorJohanPrice: event.preparation?.animatorJohanPrice')){
  const anchor='    framePrice: event.preparation?.framePrice != null\n      ? String(event.preparation.framePrice)\n      : null,';
  if(server.includes(anchor)){
    server=server.replace(anchor,anchor+'\n    animatorJohan: event.preparation?.animatorJohan === true,\n    animatorJohanPrice: event.preparation?.animatorJohanPrice != null ? String(event.preparation.animatorJohanPrice) : null,');
    changes++;
  }
}

fs.writeFileSync(appPath,app,'utf8');
fs.writeFileSync(contractPath,contract,'utf8');
fs.writeFileSync(serverPath,server,'utf8');
console.log(`[event-finance-animator] ${changes} modification(s) appliquee(s).`);
