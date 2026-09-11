const fs=require('fs');
const path=require('path');

const file=path.join(process.cwd(),'client','src','App.jsx');
let src=fs.readFileSync(file,'utf8');
let changes=0;

const weeklyOld='giftAmount:sumTotal(giftedEvents)';
const weeklyNew='giftAmount:0';
if(src.includes(weeklyOld)){
  src=src.replace(weeklyOld,weeklyNew);
  changes++;
}

const periodOld='giftAmount:gifted.reduce((sum,event)=>sum+Math.max(Number(event?.totalPrice||0),0),0)';
const periodNew='giftAmount:gifted.reduce((sum,event)=>{const d=parseEventDate(event);const ref=new Date();const monday=new Date(ref);const day=(monday.getDay()+6)%7;monday.setHours(0,0,0,0);monday.setDate(monday.getDate()-day);const weekEnd=new Date(monday);weekEnd.setDate(weekEnd.getDate()+7);const amount=d&&d>=monday&&d<weekEnd?0:Math.max(Number(event?.totalPrice||0),0);return sum+amount;},0)';
if(src.includes(periodOld)){
  src=src.replace(periodOld,periodNew);
  changes++;
}

if(!changes){
  if(src.includes('const amount=d&&d>=monday&&d<weekEnd?0:Math.max(Number(event?.totalPrice||0),0)')){
    console.log('[LP28] Calcul sélectif des dons déjà appliqué.');
    process.exit(0);
  }
  throw new Error('[LP28] Calcul des prestations offertes introuvable.');
}

fs.writeFileSync(file,src,'utf8');
console.log(`[LP28] ${changes} calcul(s) don / prestation offerte corrigé(s) sélectivement.`);
