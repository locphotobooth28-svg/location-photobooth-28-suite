const fs=require('fs');
const p='client/src/App.jsx';
let s=fs.readFileSync(p,'utf8');
if(s.includes('LP28_SIDEBAR_COMPACT_V2')){console.log('[sidebar-compact] deja applique');process.exit(0);}

const stateMarker='  const [mobileMenuOpen,setMobileMenuOpen]=useState(false);';
if(!s.includes(stateMarker))throw new Error('[sidebar-compact] state sidebar introuvable');
s=s.replace(stateMarker,stateMarker+'\n  const [moreNavOpen,setMoreNavOpen]=useState(false); // LP28_SIDEBAR_COMPACT_V2');

const start='        {navModules.filter(m=>{';
const end='        </button>)}';
const a=s.indexOf(start);
if(a<0)throw new Error('[sidebar-compact] debut navigation introuvable');
const b=s.indexOf(end,a);
if(b<0)throw new Error('[sidebar-compact] fin navigation introuvable');
const old=s.slice(a,b+end.length);

const neu=`        {(()=>{
          const allowedModules=navModules.filter(m=>{
            if(m.visible===false)return false;
            if(isAdmin)return true;
            if(m.id==="settings")return true;
            const allowed=Array.isArray(user?.permissions?.allowedModules)?user.permissions.allowedModules:(user?.role==="INTERVENANT"?["dashboard","events","planning","materialPlanning"]:["dashboard","planning"]);
            return allowed.includes(m.id);
          });
          const primaryIds=["dashboard","events","planning","booths","assistance","settings"];
          const primary=allowedModules.filter(m=>primaryIds.includes(m.id));
          const secondary=allowedModules.filter(m=>!primaryIds.includes(m.id));
          const renderNav=m=><button key={m.id} className={\`nav-item \${view===m.id?"active":""} \${m.id==="assistance"&&activeSavOps.length?"nav-assistance-alert":""}\`} onClick={()=>navigate(m.id)}>
            <span className="nav-main-label">{m.id==="booths"&&isAdmin&&boothProblemCount>0?<span className="lp28-booth-gyro" title={boothProblemTitle||"Anomalie détectée sur une borne"}>🚨</span>:m.icon} {m.label}</span>
            {m.id==="booths"&&isAdmin&&<span title={boothProblemTitle||undefined} className={\`booth-live-pill \${boothProblemCount>0?"alert":boothOnlineCount?"online":"offline"}\`}>{boothProblemCount>0?\`● ALERTE \${boothProblemCount}\`:\`● LIVE \${boothOnlineCount}/3\`}</span>}
            {m.id==="assistance"&&isAdmin&&activeSavOps.length>0&&<span className="nav-assistance-triangle" title={\`\${activeSavOps.length} demande(s) d'assistance\`}>⚠️</span>}
            {m.id==="assistance"&&isAdmin&&activeSavOps.length===0&&latestInfoSav&&view!=="assistance"&&<span className="nav-assistance-info" title={\`\${unreadInfoSav.length} information(s) N1 non lue(s)\`}>ⓘ</span>}
          </button>;
          return <>
            {primary.filter(m=>m.id!=="settings").map(renderNav)}
            {secondary.length>0&&<>
              <button type="button" className={\`nav-item \${secondary.some(m=>m.id===view)?"active":""}\`} onClick={()=>setMoreNavOpen(v=>!v)} aria-expanded={moreNavOpen}>
                <span className="nav-main-label">☰ Plus</span><span>{moreNavOpen?"▲":"▼"}</span>
              </button>
              {moreNavOpen&&<div className="lp28-sidebar-more" style={{paddingLeft:10,borderLeft:"2px solid rgba(214,185,79,.25)",marginLeft:10}}>{secondary.map(renderNav)}</div>}
            </>}
            {primary.filter(m=>m.id==="settings").map(renderNav)}
          </>;
        })()}`;

s=s.slice(0,a)+neu+s.slice(b+end.length);
fs.writeFileSync(p,s,'utf8');
console.log('[sidebar-compact] OK V2');
