const fs=require('fs');
const path=require('path');
const file=path.join(process.cwd(),'client','src','App.jsx');
let src=fs.readFileSync(file,'utf8');

const old=`      <h3>Organisateur</h3>\n      <div className="form-grid">\n        <div><label>Nom / prénom</label><input value={form.organizerName} onChange={e=>set("organizerName",e.target.value)}/></div>\n        <div><label>Téléphone</label><input value={form.organizerPhone} onChange={e=>set("organizerPhone",e.target.value)}/></div>\n        <div><label>E-mail</label><input type="email" value={form.organizerEmail} onChange={e=>set("organizerEmail",e.target.value)}/></div>\n      </div>`;

const replacement=`      <h3>Organisateur / Client</h3>\n      <div className="form-grid">\n        <div><label>Nom</label><input value={form.organizerName||""} onChange={e=>set("organizerName",e.target.value)} placeholder="Nom du client"/></div>\n        <div><label>Prénom</label><input value={form.preparation?.clientFirstName||""} onChange={e=>setForm(f=>({...f,preparation:{...(f.preparation||{}),clientFirstName:e.target.value}}))} placeholder="Prénom du client"/></div>\n        <div><label>Téléphone</label><input value={form.organizerPhone||""} onChange={e=>set("organizerPhone",e.target.value)}/></div>\n        <div><label>E-mail</label><input type="email" value={form.organizerEmail||""} onChange={e=>set("organizerEmail",e.target.value)}/></div>\n        <div><label>Établissement / Société / Association <span className="muted">(facultatif)</span></label><input value={form.preparation?.clientEstablishment||""} onChange={e=>setForm(f=>({...f,preparation:{...(f.preparation||{}),clientEstablishment:e.target.value}}))} placeholder="Ex : Mairie de Thivars"/></div>\n        <div><label>SIRET <span className="muted">(facultatif)</span></label><input inputMode="numeric" maxLength={14} value={form.preparation?.clientSiret||""} onChange={e=>setForm(f=>({...f,preparation:{...(f.preparation||{}),clientSiret:e.target.value.replace(/\\D/g,"").slice(0,14)}}))} placeholder="14 chiffres"/></div>\n      </div>`;

if(!src.includes(old)){console.error('[client-identity] organizer block not found');process.exit(1);}
src=src.replace(old,replacement);

// Personnalise le message Organisateur créé par le patch précédent.
const hello='    `Bonjour ${EMOJI.smile}`,';
const helloNamed='    `Bonjour ${event.preparation?.clientFirstName ? event.preparation.clientFirstName+" " : ""}${EMOJI.smile}`,';
if(src.includes(hello)) src=src.replace(hello,helloNamed);

fs.writeFileSync(file,src,'utf8');
console.log('[client-identity] OK: Nom/Prénom séparés + établissement/SIRET facultatifs + partage Organisateur personnalisé');
