const fs=require('fs');
const path=require('path');

const file=path.join(process.cwd(),'client','src','App.jsx');
let src=fs.readFileSync(file,'utf8');

const start='      .lp28-week-columns{display:grid!important;grid-template-columns:repeat(5,minmax(330px,1fr))!important;gap:14px!important;align-items:start;overflow-x:auto;padding-bottom:10px;scrollbar-width:thin;}';
const end='      @media(max-width:1250px){.lp28-week-columns{grid-template-columns:repeat(5,minmax(310px,310px))!important;}}';
const startIndex=src.indexOf(start);
const endIndex=src.indexOf(end,startIndex);

if(startIndex<0||endIndex<0){
  console.error('[event-weeks-layout-fix] weekly columns CSS block not found');
  process.exit(1);
}

const replacement=`      /* Correctif sécurité affichage LP28 : liste hebdomadaire lisible pleine largeur */
      .lp28-week-columns{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:14px!important;align-items:start!important;overflow:visible!important;padding-bottom:10px!important;}
      .lp28-week-columns .event-list-section-title{grid-column:1!important;grid-row:auto!important;position:static!important;width:auto!important;min-width:0!important;min-height:0!important;display:block!important;margin-top:8px!important;}
      .lp28-week-columns .event-list-section-title.week-current,
      .lp28-week-columns .event-list-section-title.week-1,
      .lp28-week-columns .event-list-section-title.week-2,
      .lp28-week-columns .event-list-section-title.week-3,
      .lp28-week-columns .event-list-section-title.week-later,
      .lp28-week-columns .event-week-card.week-current,
      .lp28-week-columns .event-week-card.week-1,
      .lp28-week-columns .event-week-card.week-2,
      .lp28-week-columns .event-week-card.week-3,
      .lp28-week-columns .event-week-card.week-later{grid-column:1!important;grid-row:auto!important;}
      .lp28-week-columns .event-card{grid-template-columns:250px minmax(0,1fr)!important;width:100%!important;max-width:none!important;min-width:0!important;}
      .lp28-week-columns .event-date{border-right:1px solid rgba(148,163,184,.18)!important;border-bottom:0!important;}
      .lp28-week-columns .event-content{min-width:0!important;}
      .lp28-week-columns .event-actions{display:flex!important;flex-wrap:wrap!important;gap:7px!important;}
      @media(max-width:760px){
        .lp28-week-columns .event-card{grid-template-columns:1fr!important;}
        .lp28-week-columns .event-date{border-right:0!important;border-bottom:1px solid rgba(148,163,184,.18)!important;}
      }`;

src=src.slice(0,startIndex)+replacement+src.slice(endIndex+end.length);
fs.writeFileSync(file,src,'utf8');
console.log('[event-weeks-layout-fix] OK: removed conflicting 5-column positioning and restored full-width layout');
