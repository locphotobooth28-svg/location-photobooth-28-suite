const fs=require('fs');
const path=require('path');

const file=path.join(process.cwd(),'client','src','App.jsx');
let src=fs.readFileSync(file,'utf8');
let count=0;

function replaceOnce(oldValue,newValue,label){
  if(!src.includes(oldValue)){
    console.error(`[dashboard-end-drop] pattern missing: ${label}`);
    process.exit(1);
  }
  src=src.replace(oldValue,newValue);
  count++;
  console.log(`[dashboard-end-drop] OK: ${label}`);
}

replaceOnce(
`  function toggleDashboardLock(){`,
`  function dropDashboardCardToEnd(){
    if(dashboardLocked||!dashboardDragId)return setDashboardDragId(null);
    const next=dashboardOrder.filter(id=>id!==dashboardDragId);
    next.push(dashboardDragId);
    saveDashboardOrder(next);
    setDashboardDragId(null);
  }
  function toggleDashboardLock(){`,
'add drop-to-end helper'
);

replaceOnce(
`          .lp28-dashboard-item.is-dragging{opacity:.48;}\n          .lp28-dashboard-item>.stat-card{height:100%;box-sizing:border-box;}`,
`          .lp28-dashboard-item.is-dragging{opacity:.48;}\n          .lp28-dashboard-end-drop{grid-column:span 4;min-height:108px;border:1px dashed rgba(234,179,8,.5);border-radius:16px;display:flex;align-items:center;justify-content:center;text-align:center;color:#eab308;font-weight:800;background:rgba(234,179,8,.04);transition:.18s ease;}\n          .lp28-dashboard-end-drop:hover{background:rgba(234,179,8,.10);border-color:rgba(234,179,8,.85);}\n          .lp28-dashboard-item>.stat-card{height:100%;box-sizing:border-box;}`,
'add empty end-slot styling'
);

replaceOnce(
`          @media(max-width:1100px){.lp28-dashboard-item.summary,.lp28-dashboard-item.finance,.lp28-dashboard-item.live{grid-column:span 6;}}\n          @media(max-width:700px){.lp28-dashboard-grid{grid-template-columns:1fr;}.lp28-dashboard-item.summary,.lp28-dashboard-item.finance,.lp28-dashboard-item.live{grid-column:1;}}`,
`          @media(max-width:1100px){.lp28-dashboard-item.summary,.lp28-dashboard-item.finance,.lp28-dashboard-item.live,.lp28-dashboard-end-drop{grid-column:span 6;}}\n          @media(max-width:700px){.lp28-dashboard-grid{grid-template-columns:1fr;}.lp28-dashboard-item.summary,.lp28-dashboard-item.finance,.lp28-dashboard-item.live,.lp28-dashboard-end-drop{grid-column:1;}}`,
'make end slot responsive'
);

replaceOnce(
`          })}\n        </section>`,
`          })}\n          {!dashboardLocked&&isAdmin&&<div className=\"lp28-dashboard-end-drop\" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();dropDashboardCardToEnd();}}>⬇️ Déposer ici pour placer le bloc à la fin</div>}\n        </section>`,
'add visible end drop target'
);

fs.writeFileSync(file,src,'utf8');
console.log(`[dashboard-end-drop] completed: ${count} changes`);
