import React, {useEffect, useState} from "react";

// Un rappel n'est jamais envoyé automatiquement : WhatsApp ouvre seulement un brouillon.
export function reminderDetails(event){
  const prep=event?.preparation && typeof event.preparation==="object" ? event.preparation : {};
  const gifted=prep.gifted===true;
  const materials=Array.isArray(event?.materials) ? event.materials : [];
  const includesBooth=materials.some(x=>/borne photobooth/i.test(typeof x==="string"?x:(x?.name||"")));
  const cautionDue=includesBooth && !event?.payments?.cautionReceived && prep.animatorJohan!==true;
  const paid=event?.payments?.balancePaid===true;
  const totalKnown=event?.totalPrice!==null && event?.totalPrice!==undefined &&
    event?.totalPrice!=="" && Number.isFinite(Number(event.totalPrice));
  const total=totalKnown ? Math.max(0,Number(event.totalPrice)) : null;
  const deposit=event?.payments?.depositPaid ? Math.max(0,Number(event?.deposit)||0) : 0;
  const remaining=totalKnown ? Math.max(0,total-deposit) : null;
  const paymentDue=!gifted && !paid && (remaining===null || remaining>0.005);
  const prepFirst=String(prep.clientFirstName||"").trim();
  const firstName=prepFirst || String(event?.client?.firstName||"").trim();
  return {firstName,cautionDue,paymentDue,remaining,hasReminder:cautionDue||paymentDue};
}

export function isClientReminderDue(event){
  if(!event || event.archived || event.preparation?.clientReminderSentAt)return false;
  if(String(event.bookingStatus||"").toUpperCase()!=="CONFIRMED")return false;
  if(event.status==="COMPLETED" || event.status==="CANCELLED")return false;
  if(!reminderDetails(event).hasReminder)return false;
  const date=String(event.date||"").slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;
  const target=new Date(date+"T12:00:00");
  if(Number.isNaN(target.getTime()))return false;
  const now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate(),12);
  const days=Math.round((target-today)/86400000);
  return days>=0 && days<=7;
}

function euros(amount){
  return Number(amount||0).toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})+" €";
}
export function buildClientReminderMessage(event){
  const info=reminderDetails(event);
  if(!info.hasReminder)return "";
  const date=String(event?.date||"").slice(0,10);
  const validDate=/^\d{4}-\d{2}-\d{2}$/.test(date);
  const dateLabel=validDate?new Date(date+"T12:00:00").toLocaleDateString("fr-FR"):"";
  const intro=validDate ? "Votre événement du "+dateLabel+" approche ! 📸" : "Votre événement approche ! 📸";
  const lines=[
    "Bonjour"+(info.firstName?" "+info.firstName:"")+" 😊",
    "",
    intro,
    "",
    "Pour préparer au mieux notre prestation, nous nous permettons de vous rappeler de prévoir lors de l'installation :",
    ""
  ];
  if(info.cautionDue)lines.push("✅ Le chèque de caution de 4 500 €, non encaissé et restitué selon les conditions du contrat.");
  if(info.paymentDue)lines.push(info.remaining===null
    ? "✅ Le règlement du montant restant dû sur votre facture."
    : "✅ Le règlement restant de votre facture : "+euros(info.remaining)+".");
  lines.push("","Merci beaucoup pour votre confiance et à très bientôt ! 😊","","Johan","Location Photobooth 28");
  return lines.join("\n");
}

function whatsAppPhone(raw){
  let value=String(raw||"").replace(/\D/g,"");
  if(value.startsWith("00"))value=value.slice(2);
  if(value.length===10 && value.startsWith("0"))value="33"+value.slice(1);
  if(value.length===9 && /^[67]/.test(value))value="33"+value;
  return /^33\d{9}$/.test(value) ? value : "";
}

export default function ClientReminderModal({event,onClose,onUpdated}){
  const [message,setMessage]=useState(()=>buildClientReminderMessage(event));
  const [busy,setBusy]=useState(false);
  const [note,setNote]=useState("");
  const detail=reminderDetails(event);
  const sentAt=event?.preparation?.clientReminderSentAt;
  const phone=whatsAppPhone(event?.organizerPhone||event?.client?.phone);
  const whatsappUrl=phone ? "https://wa.me/"+phone+"?text="+encodeURIComponent(message) : "";
  useEffect(()=>{
    setMessage(buildClientReminderMessage(event));
    setNote("");
  },[event?.id,event?.totalPrice,event?.deposit,event?.payments?.depositPaid,event?.payments?.balancePaid,event?.payments?.cautionReceived,event?.preparation?.animatorJohan]);
  async function updateSent(action){
    if(busy)return;
    if(action==="mark_sent" && !window.confirm("Confirmer que vous avez réellement envoyé ce rappel au client ?"))return;
    if(action==="reset" && !window.confirm("Remettre ce rappel dans les rappels à envoyer ?"))return;
    setBusy(true);
    try{
      const response=await fetch("/api/events/"+encodeURIComponent(event.id)+"/client-reminder",{
        method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action})
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.message||"Impossible de mettre à jour le rappel.");
      onUpdated(event.id,data.sentAt);
      setNote(action==="mark_sent"?"Rappel marqué comme envoyé.":"Rappel de nouveau à traiter.");
    }catch(error){setNote(error.message||"Erreur d'enregistrement.");}
    finally{setBusy(false);}
  }
  async function copyReminder(){
    try{
      await navigator.clipboard.writeText(message);
      setNote("Message copié. L'envoi reste à confirmer manuellement.");
    }catch{
      window.prompt("Copiez ce message :",message);
    }
  }
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="event-modal" style={{maxWidth:700}} onClick={e=>e.stopPropagation()}>
        <div className="modal-head">
          <div><div className="eyebrow">RAPPEL CLIENT</div><h2>💬 Caution et règlement</h2></div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fermer">×</button>
        </div>
        <div style={{padding:"12px 18px 22px"}}>
          <p><strong>{event?.name||"Événement"}</strong> — {detail.firstName||event?.organizerName||"Prénom non renseigné"}</p>
          {sentAt&&<p style={{color:"#86efac",fontWeight:800}}>✅ Rappel marqué comme envoyé le {new Date(sentAt).toLocaleString("fr-FR")}</p>}
          {!detail.hasReminder ? (
            <p>✅ Aucun rappel nécessaire : la caution est déjà reçue ou dispensée et la prestation est réglée (ou offerte).</p>
          ) : (
            <>
              <p className="muted">Vérifiez les sommes et l'identité avant l'envoi. Montant calculé selon l'acompte et les règlements enregistrés dans LP28.</p>
              {!event?.payments?.balancePaid && !event?.payments?.depositPaid && Number(event?.deposit)>0&&
                <p style={{color:"#fbbf24"}}>⚠️ L'acompte n'est pas marqué « reçu » : le montant affiché comprend donc cet acompte.</p>}
              <textarea aria-label="Message à envoyer au client" value={message} onChange={e=>setMessage(e.target.value)} rows={12} style={{width:"100%",minHeight:270,borderRadius:12,padding:12,boxSizing:"border-box",resize:"vertical"}} />
              <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:14}}>
                <button type="button" className="primary" onClick={copyReminder} disabled={!message.trim()}>📋 Copier le message</button>
                {phone&&message.trim() ? <a className="primary" href={whatsappUrl} target="_blank" rel="noopener noreferrer">📱 Ouvrir WhatsApp</a> :
                  <span className="muted">📱 Téléphone WhatsApp absent ou invalide dans la fiche client.</span>}
                <button type="button" onClick={()=>updateSent("mark_sent")} disabled={busy||!message.trim()}>✅ Marquer comme envoyé</button>
              </div>
              <p className="muted" style={{marginTop:12}}>Ouvrir WhatsApp ou copier le texte ne confirme pas l'envoi. Utilisez ensuite « Marquer comme envoyé ».</p>
            </>
          )}
          {sentAt && <button type="button" onClick={()=>updateSent("reset")} disabled={busy}>↩️ Rappel à refaire</button>}
          {note && <p role="status" style={{marginTop:10,fontWeight:700}}>{note}</p>}
        </div>
      </div>
    </div>
  );
}
