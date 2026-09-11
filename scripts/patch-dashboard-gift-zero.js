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
const periodNew='giftAmount:0';
if(src.includes(periodOld)){
  src=src.replace(periodOld,periodNew);
  changes++;
}

if(!changes){
  if(src.includes('giftAmount:0')){
    console.log('[LP28] Prestations offertes déjà affichées à 0 € sur le dashboard.');
    process.exit(0);
  }
  throw new Error('[LP28] Calcul des prestations offertes introuvable.');
}

fs.writeFileSync(file,src,'utf8');
console.log(`[LP28] ${changes} calcul(s) don / prestation offerte corrigé(s) à 0 €.`);
