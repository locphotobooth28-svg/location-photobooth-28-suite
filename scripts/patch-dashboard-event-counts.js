// LP28 - compteurs d'événements séparés, appliqués après tous les patchs existants.
const fs=require("fs");
const path=require("path");
const file=path.join(process.cwd(),"client","src","App.jsx");
let src=fs.readFileSync(file,"utf8");
function replaceOnce(before,after,name){
  if(src.includes(after))return;
  if(!src.includes(before))throw new Error("[event-counts] Point de modification absent : "+name);
  src=src.replace(before,after);
  console.log("[event-counts] OK : "+name);
}

const orderBefore='const DASHBOARD_DEFAULT_ORDER=["events","quoteSent","inProgress","upcoming","contracts","weekEvents","liveBooths","weekBilled","monthBilled","futureBilled","weekGift","monthGift","futureGift"];';
const orderAfter='const DASHBOARD_DEFAULT_ORDER=["events","quoteSent","completedEvents","futureEvents","pendingEvents","inProgress","upcoming","contracts","weekEvents","liveBooths","weekBilled","monthBilled","futureBilled","weekGift","monthGift","futureGift"];';
replaceOnce(orderBefore,orderAfter,"ordre des cartes");

const restoreBefore='      return validSaved.concat(DASHBOARD_DEFAULT_ORDER.filter(id=>!validSaved.includes(id)));';
const restoreAfter=[
  '      const missing=["completedEvents","futureEvents","pendingEvents"].filter(id=>!validSaved.includes(id));',
  '      const anchor=Math.max(validSaved.indexOf("quoteSent"),validSaved.indexOf("events"));',
  '      validSaved.splice(anchor+1,0,...missing);',
  '      return validSaved.concat(DASHBOARD_DEFAULT_ORDER.filter(id=>!validSaved.includes(id)));'
].join("\n");
replaceOnce(restoreBefore,restoreAfter,"dispositions personnalisées existantes");

const memo=[
  '  const lp28EventCounts=useMemo(()=>{',
  '    const now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate());',
  '    const counts={completed:0,future:0,pending:0};',
  '    (events||[]).forEach(event=>{',
  '      if(event?.archived)return;',
  '      const booking=String(event?.bookingStatus||"CONFIRMED").toUpperCase();',
  '      const status=String(event?.status||"").toUpperCase();',
  '      if(["DECLINED","CANCELLED"].includes(booking)||status==="CANCELLED")return;',
  '      if(status==="COMPLETED"||booking==="COMPLETED"){counts.completed++;return;}',
  '      if(status==="IN_PROGRESS")return;',
  '      const match=String(event?.date||"").match(/^(\\d{4})-(\\d{2})-(\\d{2})/);',
  '      if(!match)return;',
  '      const date=new Date(Number(match[1]),Number(match[2])-1,Number(match[3]),12,0,0,0);',
  '      if(date<today)return;',
  '      if(booking==="CONFIRMED")counts.future++;',
  '      if(["QUOTE_DRAFT","QUOTE_SENT","OPTION"].includes(booking))counts.pending++;',
  '    });',
  '    return counts;',
  '  },[events]);'
].join("\n");
const anchorMoney='  const dashboardMoney=value=>Number(value||0).toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})+" €";';
replaceOnce(anchorMoney,anchorMoney+"\n"+memo,"calcul des prestations");

const beforeCard='if(id==="events")card=<article className="stat-card"><span>Événements</span><strong>{stats.events}</strong></article>;';
const afterCard=[
  'if(id==="events")card=<article className="stat-card"><span>📁 Dossiers enregistrés</span><strong>{stats.events}</strong><small className="muted">Toutes dates et statuts · hors archives</small></article>;',
  '            if(id==="completedEvents")card=<article className="stat-card" style={{border:"1px solid rgba(34,197,94,.46)"}}><span>✅ Prestations terminées</span><strong style={{color:"#4ade80"}}>{lp28EventCounts.completed}</strong><small className="muted">Terminées · hors archives et annulations</small></article>;',
  '            if(id==="futureEvents")card=<article className="stat-card" style={{border:"1px solid rgba(59,130,246,.50)"}}><span>📅 Prestations futures confirmées</span><strong style={{color:"#60a5fa"}}>{lp28EventCounts.future}</strong><small className="muted">D’aujourd’hui aux années suivantes</small></article>;',
  '            if(id==="pendingEvents")card=<article className="stat-card" style={{border:"1px solid rgba(245,158,11,.50)"}}><span>⏳ Dossiers à confirmer</span><strong style={{color:"#fbbf24"}}>{lp28EventCounts.pending}</strong><small className="muted">Devis et options sur les dates futures</small></article>;'
].join("\n            ");
replaceOnce(beforeCard,afterCard,"nouvelles cartes et libellé du total");
replaceOnce('<span>Événements à venir</span><strong>{stats.upcoming}</strong>','<span>📆 Dossiers d’ici dimanche</span><strong>{stats.upcoming}</strong>',"événements de la semaine");
replaceOnce('if(!isAdmin&&["quoteSent","liveBooths","monthBilled","futureBilled","weekGift","monthGift","futureGift"].includes(id))return null;',
  'if(!isAdmin&&["quoteSent","pendingEvents","liveBooths","monthBilled","futureBilled","weekGift","monthGift","futureGift"].includes(id))return null;',
  "respect des droits d'accès administrateur");
fs.writeFileSync(file,src,"utf8");
console.log("[event-counts] Terminé");
