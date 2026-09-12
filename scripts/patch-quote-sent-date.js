const fs=require("fs");
const appPath="client/src/App.jsx";
let app=fs.readFileSync(appPath,"utf8");

const marker="LP28_QUOTE_SENT_DATE_V1";
if(app.includes(marker)){
  console.log("[quote-sent-date] déjà appliqué");
  process.exit(0);
}

const statusBlock=`          <select value={form.bookingStatus||"CONFIRMED"} onChange={e=>set("bookingStatus",e.target.value)}>
            <option value="QUOTE_DRAFT">📝 Devis en préparation</option>
            <option value="QUOTE_SENT">📤 Devis envoyé</option>
            <option value="OPTION">🟠 Option / en attente client</option>
            <option value="CONFIRMED">🟢 Réservation confirmée</option>
            <option value="DECLINED">⚪ Devis refusé / sans suite</option>
            <option value="CANCELLED">🔴 Annulée</option>
            <option value="COMPLETED">🔵 Terminée</option>`;

if(!app.includes(statusBlock))throw new Error("[quote-sent-date] bloc statut commercial introuvable");

const replacement=`          {/* ${marker} */}
          <select value={form.bookingStatus||"CONFIRMED"} onChange={e=>{
            const next=e.target.value;
            setForm(f=>{
              const prep={...(f.preparation||{})};
              if(next==="QUOTE_SENT"&&!prep.quoteSentAt){
                const now=new Date();
                prep.quoteSentAt=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0")+"-"+String(now.getDate()).padStart(2,"0");
              }
              return {...f,bookingStatus:next,preparation:prep};
            });
          }}>
            <option value="QUOTE_DRAFT">📝 Devis en préparation</option>
            <option value="QUOTE_SENT">📤 Devis envoyé</option>
            <option value="OPTION">🟠 Option / en attente client</option>
            <option value="CONFIRMED">🟢 Réservation confirmée</option>
            <option value="DECLINED">⚪ Devis refusé / sans suite</option>
            <option value="CANCELLED">🔴 Annulée</option>
            <option value="COMPLETED">🔵 Terminée</option>`;
app=app.replace(statusBlock,replacement);

const selectEnd=`            <option value="CANCELLED">🔴 Annulée</option>
            <option value="COMPLETED">🔵 Terminée</option>
          </select>
        </div>`;
if(!app.includes(selectEnd))throw new Error("[quote-sent-date] fin du sélecteur statut introuvable");
app=app.replace(selectEnd,`            <option value="CANCELLED">🔴 Annulée</option>
            <option value="COMPLETED">🔵 Terminée</option>
          </select>
        </div>
        {form.bookingStatus==="QUOTE_SENT"&&<div>
          <label>📅 Date d’envoi du devis</label>
          <input
            type="date"
            value={form.preparation?.quoteSentAt||""}
            onChange={e=>setForm(f=>({...f,preparation:{...(f.preparation||{}),quoteSentAt:e.target.value}}))}
            required
          />
          <small className="muted">Le devis reste valable 15 jours à partir de cette date.</small>
        </div>`);

fs.writeFileSync(appPath,app,"utf8");
console.log("[quote-sent-date] OK : date affichée à côté du statut Devis envoyé");
