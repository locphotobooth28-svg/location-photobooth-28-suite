const fs=require('fs');
const path=require('path');

const file=path.join(process.cwd(),'client','src','App.jsx');
let src=fs.readFileSync(file,'utf8');
let changes=0;

function replaceOnce(oldValue,newValue,label){
  if(!src.includes(oldValue)){
    console.error(`[quote-finance] pattern missing: ${label}`);
    process.exit(1);
  }
  src=src.replace(oldValue,newValue);
  changes++;
  console.log(`[quote-finance] OK: ${label}`);
}

replaceOnce(
  'const DASHBOARD_DEFAULT_ORDER=["events","inProgress","upcoming","contracts","weekEvents","liveBooths","weekBilled","monthBilled","futureBilled","weekGift","monthGift","futureGift"];',
  'const DASHBOARD_DEFAULT_ORDER=["events","quoteSent","inProgress","upcoming","contracts","weekEvents","liveBooths","weekBilled","monthBilled","futureBilled","weekGift","monthGift","futureGift"];',
  'add quoteSent dashboard card order'
);

replaceOnce(
  '  const dashboardMoney=value=>Number(value||0).toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})+" €";',
  `  const dashboardMoney=value=>Number(value||0).toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})+" €";\n  const lp28FinanceConfirmed=event=>["CONFIRMED","COMPLETED"].includes(String(event?.bookingStatus||"").toUpperCase());\n  const quoteSentCount=(events||[]).filter(event=>!event?.archived&&String(event?.bookingStatus||"").toUpperCase()==="QUOTE_SENT").length;\n  const confirmedFinanceDashboard=useMemo(()=>{\n    const now=new Date();now.setHours(12,0,0,0);\n    const monday=new Date(now);const day=(monday.getDay()+6)%7;monday.setDate(monday.getDate()-day);monday.setHours(0,0,0,0);\n    const weekEnd=new Date(monday);weekEnd.setDate(weekEnd.getDate()+7);\n    const monthStart=new Date(now.getFullYear(),now.getMonth(),1,0,0,0,0);\n    const nextMonth=new Date(now.getFullYear(),now.getMonth()+1,1,0,0,0,0);\n    const parseDate=event=>{const m=String(event?.date||"").match(/^(\\d{4})-(\\d{2})-(\\d{2})/);return m?new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),12,0,0,0):null;};\n    const active=(events||[]).filter(event=>!event?.archived&&lp28FinanceConfirmed(event));\n    const remaining=event=>{if(event?.payments?.balancePaid===true)return 0;const b=Number(event?.balance);if(Number.isFinite(b))return Math.max(b,0);return Math.max(Number(event?.totalPrice||0)-Number(event?.deposit||0),0);};\n    const summarize=(items,period)=>{const billed=items.filter(event=>!event?.preparation?.gifted);const gifted=items.filter(event=>!!event?.preparation?.gifted);let giftAmount=0;if(period!=="week"){giftAmount=gifted.reduce((sum,event)=>{const d=parseDate(event);if(period==="month"&&d&&d>=monday&&d<weekEnd)return sum;return sum+Math.max(Number(event?.totalPrice||0),0);},0);}return {billedCount:billed.length,billedAmount:billed.reduce((sum,event)=>sum+remaining(event),0),giftCount:gifted.length,giftAmount};};\n    const week=active.filter(event=>{const d=parseDate(event);return d&&d>=monday&&d<weekEnd;});\n    const month=active.filter(event=>{const d=parseDate(event);return d&&d>=monthStart&&d<nextMonth;});\n    const future=active.filter(event=>{const d=parseDate(event);return d&&d>=nextMonth;});\n    return {week:summarize(week,"week"),month:summarize(month,"month"),future:summarize(future,"future")};\n  },[events]);`,
  'add confirmed-only finance summary and quote count'
);

const replacements=[
  ['weeklyDashboard.billedAmount','confirmedFinanceDashboard.week.billedAmount'],
  ['weeklyDashboard.billedCount','confirmedFinanceDashboard.week.billedCount'],
  ['weeklyDashboard.giftAmount','confirmedFinanceDashboard.week.giftAmount'],
  ['weeklyDashboard.giftCount','confirmedFinanceDashboard.week.giftCount'],
  ['dashboardPeriods.month.billedAmount','confirmedFinanceDashboard.month.billedAmount'],
  ['dashboardPeriods.month.billedCount','confirmedFinanceDashboard.month.billedCount'],
  ['dashboardPeriods.month.giftAmount','confirmedFinanceDashboard.month.giftAmount'],
  ['dashboardPeriods.month.giftCount','confirmedFinanceDashboard.month.giftCount'],
  ['dashboardPeriods.future.billedAmount','confirmedFinanceDashboard.future.billedAmount'],
  ['dashboardPeriods.future.billedCount','confirmedFinanceDashboard.future.billedCount'],
  ['dashboardPeriods.future.giftAmount','confirmedFinanceDashboard.future.giftAmount'],
  ['dashboardPeriods.future.giftCount','confirmedFinanceDashboard.future.giftCount']
];
for(const [oldValue,newValue] of replacements){
  if(src.includes(oldValue)){
    src=src.split(oldValue).join(newValue);
    changes++;
  }
}

replaceOnce(
  'if(!isAdmin&&["liveBooths","monthBilled","futureBilled","weekGift","monthGift","futureGift"].includes(id))return null;',
  'if(!isAdmin&&["quoteSent","liveBooths","monthBilled","futureBilled","weekGift","monthGift","futureGift"].includes(id))return null;',
  'hide quote card outside admin'
);

replaceOnce(
  'if(id==="events")card=<article className="stat-card"><span>Événements</span><strong>{stats.events}</strong></article>;',
  'if(id==="events")card=<article className="stat-card"><span>Événements</span><strong>{stats.events}</strong></article>;\n            if(id==="quoteSent")card=<article className="stat-card" style={{border:"1px solid rgba(59,130,246,.58)",background:"linear-gradient(135deg,rgba(30,64,175,.18),rgba(15,23,42,.30))"}}><span>📤 Devis envoyés</span><strong style={{color:"#60a5fa"}}>{quoteSentCount}</strong><small className="muted">Non comptabilisés dans les finances tant que la réservation n’est pas confirmée</small></article>;',
  'add quote sent dashboard card'
);

fs.writeFileSync(file,src,'utf8');
console.log(`[quote-finance] completed: ${changes} change(s)`);
