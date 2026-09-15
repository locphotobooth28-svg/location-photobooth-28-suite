const fs=require('fs');
const file='client/src/App.jsx';
let src=fs.readFileSync(file,'utf8');
const MARK='LP28_EVENT_CARD_STATUS_BADGES_V1';
if(src.includes(MARK)){console.log('[event-card-status-badges] deja applique');process.exit(0);}

const signed='{event.contractStatus==="SIGNED"&&<span style={{display:"inline-block",padding:"4px 8px",borderRadius:999,background:"#dcfce7",color:"#166534",fontSize:12,fontWeight:700}}>🟢 Contrat signé</span>}';
if(!src.includes(signed))throw new Error('[event-card-status-badges] badge contrat introuvable');
src=src.replace(signed,signed+'\n                {/* '+MARK+' */}\n                {String(event.fotoshareUrl||"").trim()&&<span style={{display:"inline-block",padding:"4px 8px",borderRadius:999,background:"#dbeafe",color:"#1e40af",border:"1px solid #60a5fa",fontSize:12,fontWeight:800}}>📸 Lien FotoShare activé</span>}');

const booking='<span className={`booking-status status-${(event.bookingStatus||"CONFIRMED").toLowerCase()}`}>\n                  {event.bookingStatus==="OPTION"?"🟠 Option":event.bookingStatus==="QUOTE_SENT"?"📤 Devis envoyé":event.bookingStatus==="QUOTE_DRAFT"?"📝 Devis":event.bookingStatus==="CONFIRMED"?"🟢 Confirmé":event.bookingStatus==="COMPLETED"?"🔵 Terminé":event.bookingStatus==="DECLINED"?"⚪ Refusé":event.bookingStatus==="CANCELLED"?"🔴 Annulé":"Statut"}\n                </span>';
if(!src.includes(booking))throw new Error('[event-card-status-badges] badge booking introuvable');
const replacement='{!(event.status==="COMPLETED"||event.bookingStatus==="COMPLETED"||(event.contractStatus==="SIGNED"&&event.bookingStatus==="CONFIRMED"))&&<span className={`booking-status status-${(event.bookingStatus||"CONFIRMED").toLowerCase()}`}>\n                  {event.bookingStatus==="OPTION"?"🟠 Option":event.bookingStatus==="QUOTE_SENT"?"📤 Devis envoyé":event.bookingStatus==="QUOTE_DRAFT"?"📝 Devis":event.bookingStatus==="CONFIRMED"?"🟢 Confirmé":event.bookingStatus==="DECLINED"?"⚪ Refusé":event.bookingStatus==="CANCELLED"?"🔴 Annulé":"Statut"}\n                </span>}';
src=src.replace(booking,replacement);

fs.writeFileSync(file,src,'utf8');
console.log('[event-card-status-badges] OK: FotoShare + statuts sans doublon');
