const fs=require('fs');
const appPath='client/src/App.jsx';
const contractPath='services/contractService.js';
const serverPath='server.js';
let app=fs.readFileSync(appPath,'utf8');
let contract=fs.readFileSync(contractPath,'utf8');
let server=fs.readFileSync(serverPath,'utf8');
let changes=0;

// 1. Ordre des onglets : Matériel -> Portail -> Finances.
const oldTabs='["finance","💰 Finances"],\n          ["material","📦 Matériel"],\n          ["portal","🌐 Portail"],';
const newTabs='["material","📦 Matériel"],\n          ["portal","🌐 Portail"],\n          ["finance","💰 Finances"],';
if(app.includes(oldTabs)){app=app.replace(oldTabs,newTabs);changes++;}

// 2. Le cadre photo est une donnée financière facturable.
const oldFinance='if(t.includes("frais")||t.includes("déplacement")||t.includes("deplacement")||t.includes("commercial")||t.includes("acompte")||t.includes("solde")||t.includes("tarif")||t.includes("paiement")||t.includes("payé")||t.includes("paye")||t.includes("caution")||t.includes("règlement")||t.includes("reglement"))return "finance";';
const newFinance='if(t.includes("frais")||t.includes("déplacement")||t.includes("deplacement")||t.includes("commercial")||t.includes("acompte")||t.includes("solde")||t.includes("tarif")||t.includes("paiement")||t.includes("payé")||t.includes("paye")||t.includes("caution")||t.includes("règlement")||t.includes("reglement")||t.includes("cadre photo"))return "finance";';
if(app.includes(oldFinance)){app=app.replace(oldFinance,newFinance);changes++;}
app=app.replace('if(t.includes("google")||t.includes("agenda")||t.includes("cadre photo")||t.includes("notes")||t.includes("note")||t.includes("technique"))return "tech";','if(t.includes("google")||t.includes("agenda")||t.includes("notes")||t.includes("note")||t.includes("technique"))return "tech";');

// 3. Option animateur Johan dans l'onglet Matériel/Équipement.
if(!app.includes('LP28_ANIMATEUR_JOHAN_V1')){
  const tabEnd='      </div>`;';
  const p=app.indexOf(tabEnd,app.indexOf('aria-label="Sections de l’événement"'));
  if(p<0)throw new Error('[event-finance-animator] barre onglets introuvable');
  const insert=`      </div>\n      <div data-lp28-tab="material" className="panel" style={{marginBottom:16,padding:16}}>\n        {/* LP28_ANIMATEUR_JOHAN_V1 */}\n        <h3 style={{marginTop:0}}>👤 Option animateur Johan</h3>\n        <label style={{display:"flex",gap:10,alignItems:"flex-start"}}>\n          <input type="checkbox" style={{width:"auto",marginTop:3}} checked={form.preparation?.animatorJohan===true} onChange={e=>setForm(f=>({...f,preparation:{...(f.preparation||{}),animatorJohan:e.target.checked}}))}/>\n          <span><strong>Animateur Johan – gestion de la borne du début à la fin</strong><br/><span className="muted">Johan s’occupe de la borne pendant toute l’animation. Le client n’a pas à prévoir de chèque de caution pour l’animation de la borne photo.</span></span>\n        </label>\n        {form.preparation?.animatorJohan===true&&<div style={{marginTop:12,maxWidth:260}}>\n          <label>Prix de l’option animateur (€)</label>\n          <input type="number" min="0" step="0.01" value={form.preparation?.animatorJohanPrice??""} onChange={e=>setForm(f=>({...f,preparation:{...(f.preparation||{}),animatorJohanPrice:e.target.value}}))} placeholder="Ex. 150"/>\n        </div>}\n      </div>`;
  app=app.slice(0,p)+insert+app.slice(p+tabEnd.length);changes++;
}

// 4. Contrat : afficher l'option et son prix avec la mention absence de caution.
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

// 5. Empreinte du contrat : toute modification de l'option invalide l'ancien contrat à signer.
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
console.log(`[event-finance-animator] ${changes} modification(s) appliquée(s).`);
