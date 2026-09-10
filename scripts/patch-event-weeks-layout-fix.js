const fs=require('fs');
const path=require('path');

const file=path.join(process.cwd(),'client','src','App.jsx');
let src=fs.readFileSync(file,'utf8');

const needle='      .lp28-week-columns{display:grid!important;grid-template-columns:repeat(5,minmax(330px,1fr))!important;gap:14px!important;align-items:start;overflow-x:auto;padding-bottom:10px;scrollbar-width:thin;}';
if(!src.includes(needle)){
  console.error('[event-weeks-layout-fix] weekly columns CSS not found');
  process.exit(1);
}

const replacement=`      .lp28-week-columns{display:grid!important;grid-template-columns:1fr!important;gap:14px!important;align-items:start;overflow-x:visible!important;padding-bottom:10px;}\n      .lp28-week-columns .event-list-section-title,.lp28-week-columns .event-week-card{grid-column:1!important;}\n      .lp28-week-columns .event-card{grid-template-columns:250px minmax(0,1fr)!important;width:100%!important;max-width:none!important;}\n      @media(max-width:760px){.lp28-week-columns .event-card{grid-template-columns:1fr!important;}}`;

src=src.replace(needle,replacement);
fs.writeFileSync(file,src,'utf8');
console.log('[event-weeks-layout-fix] OK: restored readable full-width event layout');
