const fs=require('fs');
const path=require('path');
const file=path.join(process.cwd(),'client','src','App.jsx');
let src=fs.readFileSync(file,'utf8');

const old='<span>{event.type}{event.organizerName?` · ${event.organizerName}`:""}{event.archived?" · Archivé":""}</span>';
const replacement='<span>{event.type}{event.organizerName?` · ${event.organizerName}${event.preparation?.clientFirstName?` ${event.preparation.clientFirstName}`:""}`:""}{event.archived?" · Archivé":""}</span>';

const count=src.split(old).length-1;
if(!count){
  console.error('[event-card-client-firstname] event title pattern not found');
  process.exit(1);
}
src=src.split(old).join(replacement);

fs.writeFileSync(file,src,'utf8');
console.log(`[event-card-client-firstname] OK: prénom ajouté dans ${count} affichage(s) événement`);
