const fs = require("fs");
const path = require("path");

const appPath = path.join(process.cwd(), "client", "src", "App.jsx");
let source = fs.readFileSync(appPath, "utf8");

const SENTINEL = "LP28_BOOTH_USAGE_DASHBOARD_V2";
if (source.includes(SENTINEL)) {
  console.log("[LP28] Suivi détaillé des bornes déjà injecté.");
  process.exit(0);
}

const logicMarker = '  const dashboardMoney=value=>Number(value||0).toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})+" €";';
if (!source.includes(logicMarker)) throw new Error("[LP28] Marqueur logique dashboard introuvable.");

const logic = `  /* ${SENTINEL} */
  const boothUsageDashboard=useMemo(()=>{
    const now=new Date();now.setHours(12,0,0,0);
    const monday=new Date(now);const day=(monday.getDay()+6)%7;monday.setDate(monday.getDate()-day);
    const weekEnd=new Date(monday);weekEnd.setDate(weekEnd.getDate()+7);
    const monthStart=new Date(now.getFullYear(),now.getMonth(),1,12,0,0,0);
    const monthEnd=new Date(now.getFullYear(),now.getMonth()+1,1,12,0,0,0);
    const yearStart=new Date(now.getFullYear(),0,1,12,0,0,0);
    const yearEnd=new Date(now.getFullYear()+1,0,1,12,0,0,0);
    const rows={
      LOLA:{id:"LOLA",label:"Lola",type:"Miroir",format:"1080 × 1920",week:0,month:0,year:0,total:0,color:"#c084fc",last:null},
      NINA:{id:"NINA",label:"Nina",type:"Classique",format:"1920 × 1080",week:0,month:0,year:0,total:0,color:"#38bdf8",last:null},
      GABIN:{id:"GABIN",label:"Gabin",type:"Classique",format:"",week:0,month:0,year:0,total:0,color:"#fb923c",last:null}
    };
    (events||[]).forEach(event=>{
      const booking=String(event?.bookingStatus||"").toUpperCase();if(booking==="CANCELLED"||booking==="DECLINED")return;
      const match=String(event?.date||"").match(/^(\\d{4})-(\\d{2})-(\\d{2})/);if(!match)return;
      const date=new Date(Number(match[1]),Number(match[2])-1,Number(match[3]),12,0,0,0);
      const materials=Array.isArray(event?.materials)?event.materials:[];const selected=[];
      if(materials.includes("Borne Photobooth Miroir Lola"))selected.push("LOLA");
      if(materials.includes("Borne Photobooth Nina"))selected.push("NINA");
      if(materials.includes("Borne Photobooth Gabin"))selected.push("GABIN");
      selected.forEach(id=>{
        const row=rows[id];row.total+=1;
        if(date>=monday&&date<weekEnd)row.week+=1;if(date>=monthStart&&date<monthEnd)row.month+=1;if(date>=yearStart&&date<yearEnd)row.year+=1;
        if(date<=now&&(!row.last||date>row.last.date))row.last={date,name:event.name||event.organizerName||"Événement"};
      });
    });
    const list=[rows.LOLA,rows.NINA,rows.GABIN];
    const total=list.reduce((acc,row)=>({week:acc.week+row.week,month:acc.month+row.month,year:acc.year+row.year,total:acc.total+row.total}),{week:0,month:0,year:0,total:0});
    const formatDate=date=>date?date.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"}):"—";
    return {list,total,formatDate};
  },[events]);

`;
source = source.replace(logicMarker, logic + logicMarker);

const renderMarker = '        <section className="panel dashboard-panel"><div><div className="panel-kicker">GESTION DES ÉVÉNEMENTS</div>';
if (!source.includes(renderMarker)) throw new Error("[LP28] Marqueur rendu dashboard introuvable.");

const panel = `        {isAdmin&&<section className="panel" style={{margin:"18px 0",padding:0,overflow:"hidden",border:"1px solid rgba(214,185,79,.38)"}}>
          <div style={{padding:"20px 22px 16px",display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:14,flexWrap:"wrap",borderBottom:"1px solid rgba(148,163,184,.16)"}}>
            <div><div className="panel-kicker">SUIVI DU MATÉRIEL</div><h2 style={{margin:"4px 0"}}>📸 Utilisation des bornes</h2><p className="muted" style={{margin:0}}>Nombre de prestations réservées avec chaque borne.</p></div>
            <div style={{padding:"8px 12px",borderRadius:999,border:"1px solid rgba(96,165,250,.28)",background:"rgba(59,130,246,.08)",fontSize:12,fontWeight:800}}>Hors événements annulés / refusés</div>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:1040}}>
              <thead><tr style={{background:"rgba(148,163,184,.06)"}}><th style={{padding:"13px 16px",textAlign:"left"}}>Borne</th><th style={{padding:"13px 16px",textAlign:"left"}}>Type</th><th style={{padding:"13px 16px",textAlign:"left"}}>Statut</th><th style={{padding:"13px 16px"}}>Cette semaine</th><th style={{padding:"13px 16px"}}>Ce mois-ci</th><th style={{padding:"13px 16px"}}>Cette année</th><th style={{padding:"13px 16px"}}>Total</th><th style={{padding:"13px 16px",textAlign:"left"}}>Dernière utilisation</th></tr></thead>
              <tbody>
                {boothUsageDashboard.list.map(row=>{
                  const live=opsBooths.find(b=>String(b?.booth||b?.name||"").toUpperCase().includes(row.id));
                  const online=!!live?.online;
                  return <tr key={row.label} style={{borderTop:"1px solid rgba(148,163,184,.12)"}}>
                    <td style={{padding:"15px 16px",fontWeight:950,color:row.color,fontSize:16}}>🖥️ {row.label}</td>
                    <td style={{padding:"15px 16px"}}><strong>{row.type}</strong>{row.format&&<div className="muted" style={{fontSize:12,marginTop:2}}>{row.format}</div>}</td>
                    <td style={{padding:"15px 16px"}}><span style={{display:"inline-flex",alignItems:"center",gap:7,padding:"6px 10px",borderRadius:999,background:online?"rgba(34,197,94,.14)":"rgba(148,163,184,.12)",color:online?"#4ade80":"#cbd5e1",fontWeight:900}}><span style={{width:9,height:9,borderRadius:"50%",background:online?"#22c55e":"#94a3b8"}}/>{online?"En ligne":"Disponible"}</span></td>
                    <td style={{padding:"15px 16px",textAlign:"center",fontWeight:900}}>{row.week}</td><td style={{padding:"15px 16px",textAlign:"center",fontWeight:900}}>{row.month}</td><td style={{padding:"15px 16px",textAlign:"center",fontWeight:900}}>{row.year}</td>
                    <td style={{padding:"15px 16px",textAlign:"center"}}><strong style={{display:"inline-block",minWidth:48,padding:"7px 11px",borderRadius:10,background:row.color+"22",color:row.color,fontSize:17}}>{row.total}</strong></td>
                    <td style={{padding:"15px 16px"}}><strong>{boothUsageDashboard.formatDate(row.last?.date)}</strong><div className="muted" style={{fontSize:12,marginTop:3,maxWidth:220,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{row.last?.name||"Aucune utilisation enregistrée"}</div></td>
                  </tr>;
                })}
                <tr style={{borderTop:"1px solid rgba(214,185,79,.38)",background:"rgba(214,185,79,.07)"}}><td colSpan={3} style={{padding:"15px 16px",fontWeight:950,color:"#f4c542"}}>📊 Total utilisations</td><td style={{padding:"15px 16px",textAlign:"center",fontWeight:950}}>{boothUsageDashboard.total.week}</td><td style={{padding:"15px 16px",textAlign:"center",fontWeight:950}}>{boothUsageDashboard.total.month}</td><td style={{padding:"15px 16px",textAlign:"center",fontWeight:950}}>{boothUsageDashboard.total.year}</td><td style={{padding:"15px 16px",textAlign:"center",fontWeight:950,color:"#f4c542",fontSize:18}}>{boothUsageDashboard.total.total}</td><td style={{padding:"15px 16px"}}></td></tr>
              </tbody>
            </table>
          </div>
          <div style={{padding:"13px 18px",display:"flex",gap:18,flexWrap:"wrap",borderTop:"1px solid rgba(148,163,184,.12)",fontSize:12}}><span><b style={{color:"#22c55e"}}>●</b> En ligne : agent LP28 connecté</span><span><b style={{color:"#94a3b8"}}>●</b> Disponible : borne hors ligne / prête</span><span className="muted">Les compteurs sont calculés automatiquement depuis les événements LP28.</span></div>
        </section>}
`;
source = source.replace(renderMarker, panel + renderMarker);
fs.writeFileSync(appPath, source, "utf8");
console.log("[LP28] Suivi détaillé utilisation des bornes injecté dans le Dashboard.");
