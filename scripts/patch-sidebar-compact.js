const fs=require('fs');
const p='client/src/App.jsx';
let s=fs.readFileSync(p,'utf8');
if(s.includes('LP28_SIDEBAR_COMPACT_V1')){console.log('[sidebar-compact] deja applique');process.exit(0);}
const marker='  const [mobileMenuOpen,setMobileMenuOpen]=useState(false);';
if(!s.includes(marker))throw new Error('[sidebar-compact] state sidebar introuvable');
s=s.replace(marker,marker+'\n  const [moreNavOpen,setMoreNavOpen]=useState(false); // LP28_SIDEBAR_COMPACT_V1');
const old='{visibleNavModules.map(m=><button key={m.id} onClick={()=>{setView(m.id);setMobileMenuOpen(false)}} className={view===m.id?"active":""}><span>{m.icon}</span>{m.label}{m.id==="booths"&&isAdmin&&<small className={`sidebar-live-badge ${boothOnlineCount===3?"online":"offline"}`}>● LIVE {boothOnlineCount}/3</small>}</button>)}';
const neu=`{(()=>{const primaryIds=["dashboard","events","planning","booths","assistance","settings"];const primary=visibleNavModules.filter(m=>primaryIds.includes(m.id));const secondary=visibleNavModules.filter(m=>!primaryIds.includes(m.id));const navButton=m=><button key={m.id} onClick={()=>{setView(m.id);setMobileMenuOpen(false)}} className={view===m.id?"active":""}><span>{m.icon}</span>{m.label}{m.id==="booths"&&isAdmin&&<small className={\`sidebar-live-badge \${boothOnlineCount===3?"online":"offline"}\`}>● LIVE {boothOnlineCount}/3</small>}</button>;return <>{primary.filter(m=>m.id!=="settings").map(navButton)}{secondary.length>0&&<><button type="button" onClick={()=>setMoreNavOpen(v=>!v)} className={secondary.some(m=>m.id===view)?"active":""} aria-expanded={moreNavOpen}><span>☰</span>Plus <span style={{marginLeft:"auto",fontSize:11}}>{moreNavOpen?"▲":"▼"}</span></button>{moreNavOpen&&<div className="lp28-sidebar-more" style={{paddingLeft:10,borderLeft:"2px solid rgba(214,185,79,.25)",marginLeft:10}}>{secondary.map(navButton)}</div>}</>}{primary.filter(m=>m.id==="settings").map(navButton)}</>})()}`;
if(!s.includes(old))throw new Error('[sidebar-compact] rendu navigation introuvable');
s=s.replace(old,neu);
fs.writeFileSync(p,s,'utf8');
console.log('[sidebar-compact] OK');
