const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "client", "src", "App.jsx");
let source = fs.readFileSync(appPath, "utf8");

const SENTINEL = "LP28_BOOTH_USAGE_DASHBOARD_V1";
if (source.includes(SENTINEL)) {
  console.log("[LP28] Tableau utilisation bornes déjà injecté.");
  process.exit(0);
}

const logicMarker = '  const dashboardMoney=value=>Number(value||0).toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})+" €";';
if (!source.includes(logicMarker)) {
  throw new Error("[LP28] Marqueur logique dashboard introuvable.");
}

const logic = `  /* ${SENTINEL} */
  const boothUsageDashboard=useMemo(()=>{
    const now=new Date();
    now.setHours(12,0,0,0);
    const monday=new Date(now);
    const day=(monday.getDay()+6)%7;
    monday.setDate(monday.getDate()-day);
    const weekEnd=new Date(monday);weekEnd.setDate(weekEnd.getDate()+7);
    const monthStart=new Date(now.getFullYear(),now.getMonth(),1,12,0,0,0);
    const monthEnd=new Date(now.getFullYear(),now.getMonth()+1,1,12,0,0,0);
    const yearStart=new Date(now.getFullYear(),0,1,12,0,0,0);
    const yearEnd=new Date(now.getFullYear()+1,0,1,12,0,0,0);
    const rows={LOLA:{label:"Lola",week:0,month:0,year:0,color:"#c084fc"},NINA:{label:"Nina",week:0,month:0,year:0,color:"#38bdf8"},GABIN:{label:"Gabin",week:0,month:0,year:0,color:"#fb923c"}};
    (events||[]).forEach(event=>{
      const booking=String(event?.bookingStatus||"").toUpperCase();
      if(booking==="CANCELLED"||booking==="DECLINED")return;
      const match=String(event?.date||"").match(/^(\\d{4})-(\\d{2})-(\\d{2})/);
      if(!match)return;
      const date=new Date(Number(match[1]),Number(match[2])-1,Number(match[3]),12,0,0,0);
      const materials=Array.isArray(event?.materials)?event.materials:[];
      const selected=[];
      if(materials.includes("Borne Photobooth Miroir Lola"))selected.push("LOLA");
      if(materials.includes("Borne Photobooth Nina"))selected.push("NINA");
      if(materials.includes("Borne Photobooth Gabin"))selected.push("GABIN");
      selected.forEach(id=>{
        if(date>=monday&&date<weekEnd)rows[id].week+=1;
        if(date>=monthStart&&date<monthEnd)rows[id].month+=1;
        if(date>=yearStart&&date<yearEnd)rows[id].year+=1;
      });
    });
    const list=[rows.LOLA,rows.NINA,rows.GABIN];
    const total=list.reduce((acc,row)=>({week:acc.week+row.week,month:acc.month+row.month,year:acc.year+row.year}),{week:0,month:0,year:0});
    return {list,total};
  },[events]);

`;

source = source.replace(logicMarker, logic + logicMarker);

const renderMarker = '        <section className="panel dashboard-panel"><div><div className="panel-kicker">GESTION DES ÉVÉNEMENTS</div>';
if (!source.includes(renderMarker)) {
  throw new Error("[LP28] Marqueur rendu dashboard introuvable.");
}

const panel = `        {isAdmin&&<section className="panel" style={{margin:"18px 0",padding:0,overflow:"hidden",border:"1px solid rgba(214,185,79,.38)"}}>
          <div style={{padding:"18px 20px 14px",display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:14,flexWrap:"wrap",borderBottom:"1px solid rgba(148,163,184,.16)"}}>
            <div><div className="panel-kicker">SUIVI DU MATÉRIEL</div><h2 style={{margin:"4px 0"}}>📸 Utilisation des bornes</h2><p className="muted" style={{margin:0}}>Nombre de prestations réservées avec chaque borne.</p></div>
            <div style={{padding:"7px 10px",borderRadius:999,border:"1px solid rgba(96,165,250,.28)",background:"rgba(59,130,246,.08)",fontSize:12,fontWeight:800}}>Hors événements annulés / refusés</div>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:620}}>
              <thead><tr><th style={{padding:"12px 16px",textAlign:"left"}}>Borne</th><th style={{padding:"12px 16px"}}>Cette semaine</th><th style={{padding:"12px 16px"}}>Ce mois-ci</th><th style={{padding:"12px 16px"}}>Cette année</th></tr></thead>
              <tbody>
                {boothUsageDashboard.list.map(row=><tr key={row.label}><td style={{padding:"14px 16px",fontWeight:950,color:row.color}}>🖥️ {row.label}</td><td style={{padding:"14px 16px",textAlign:"center",fontWeight:800}}>{row.week}</td><td style={{padding:"14px 16px",textAlign:"center",fontWeight:800}}>{row.month}</td><td style={{padding:"14px 16px",textAlign:"center",fontWeight:800}}>{row.year}</td></tr>)}
                <tr><td style={{padding:"14px 16px",fontWeight:950,borderTop:"1px solid rgba(214,185,79,.38)"}}>Total utilisations</td><td style={{padding:"14px 16px",textAlign:"center",fontWeight:950,borderTop:"1px solid rgba(214,185,79,.38)"}}>{boothUsageDashboard.total.week}</td><td style={{padding:"14px 16px",textAlign:"center",fontWeight:950,borderTop:"1px solid rgba(214,185,79,.38)"}}>{boothUsageDashboard.total.month}</td><td style={{padding:"14px 16px",textAlign:"center",fontWeight:950,borderTop:"1px solid rgba(214,185,79,.38)"}}>{boothUsageDashboard.total.year}</td></tr>
              </tbody>
            </table>
          </div>
        </section>}
`;

source = source.replace(renderMarker, panel + renderMarker);
fs.writeFileSync(appPath, source, "utf8");
console.log("[LP28] Tableau utilisation des bornes injecté directement dans le Dashboard.");
