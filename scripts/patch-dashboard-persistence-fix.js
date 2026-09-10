const fs=require('fs');
const path=require('path');

const file=path.join(process.cwd(),'client','src','App.jsx');
let src=fs.readFileSync(file,'utf8');

const oldInit=`  const [dashboardOrder,setDashboardOrder]=useState(()=>{\n    try{\n      const saved=JSON.parse(localStorage.getItem("lp28.dashboard.order")||"[]");\n      return Array.isArray(saved)&&saved.length?DASHBOARD_DEFAULT_ORDER.filter(id=>saved.includes(id)).concat(DASHBOARD_DEFAULT_ORDER.filter(id=>!saved.includes(id))):DASHBOARD_DEFAULT_ORDER;\n    }catch{return DASHBOARD_DEFAULT_ORDER;}\n  });`;
const newInit=`  const readDashboardOrder=()=>{\n    try{\n      const saved=JSON.parse(localStorage.getItem("lp28.dashboard.order")||"[]");\n      if(!Array.isArray(saved)||!saved.length)return [...DASHBOARD_DEFAULT_ORDER];\n      const validSaved=saved.filter(id=>DASHBOARD_DEFAULT_ORDER.includes(id));\n      return validSaved.concat(DASHBOARD_DEFAULT_ORDER.filter(id=>!validSaved.includes(id)));\n    }catch{return [...DASHBOARD_DEFAULT_ORDER];}\n  };\n  const [dashboardOrder,setDashboardOrder]=useState(readDashboardOrder);`;
if(!src.includes(oldInit)){
  console.error('[dashboard-persistence] dashboard order init pattern missing');
  process.exit(1);
}
src=src.replace(oldInit,newInit);

const oldSave=`  function saveDashboardOrder(next){\n    setDashboardOrder(next);\n    try{localStorage.setItem("lp28.dashboard.order",JSON.stringify(next));}catch{}\n  }`;
const newSave=`  function saveDashboardOrder(next){\n    const clean=[...new Set((next||[]).filter(id=>DASHBOARD_DEFAULT_ORDER.includes(id)))];\n    const finalOrder=clean.concat(DASHBOARD_DEFAULT_ORDER.filter(id=>!clean.includes(id)));\n    setDashboardOrder(finalOrder);\n    try{localStorage.setItem("lp28.dashboard.order",JSON.stringify(finalOrder));}catch{}\n  }`;
if(!src.includes(oldSave)){
  console.error('[dashboard-persistence] save helper pattern missing');
  process.exit(1);
}
src=src.replace(oldSave,newSave);

const lockNeedle=`  function toggleDashboardLock(){\n    const next=!dashboardLocked;\n    setDashboardLocked(next);\n    try{localStorage.setItem("lp28.dashboard.locked",String(next));}catch{}\n  }`;
const lockReplacement=`  function toggleDashboardLock(){\n    const next=!dashboardLocked;\n    if(next){\n      // Au verrouillage, persiste une dernière fois l'ordre affiché avant tout changement de vue.\n      saveDashboardOrder(dashboardOrder);\n    }\n    setDashboardLocked(next);\n    try{localStorage.setItem("lp28.dashboard.locked",String(next));}catch{}\n  }\n  useEffect(()=>{\n    // Le composant Admin reste monté lors des changements de page : recharge l'ordre sauvegardé\n    // quand on revient au tableau de bord afin d'éviter qu'un état ancien réécrase la disposition.\n    if(view==="dashboard")setDashboardOrder(readDashboardOrder());\n  },[view]);`;
if(!src.includes(lockNeedle)){
  console.error('[dashboard-persistence] lock helper pattern missing');
  process.exit(1);
}
src=src.replace(lockNeedle,lockReplacement);

fs.writeFileSync(file,src,'utf8');
console.log('[dashboard-persistence] OK: dashboard order now survives page navigation');
