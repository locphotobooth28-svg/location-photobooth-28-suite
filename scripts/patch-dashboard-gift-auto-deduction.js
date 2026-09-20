const fs=require("fs");
const file="client/src/App.jsx";
let src=fs.readFileSync(file,"utf8");
let changes=0;
const weeklyFrom="giftAmount:sumTotal(giftedEvents)";
const weeklyTo="giftAmount:sumRemaining(giftedEvents)";
if(src.includes(weeklyFrom)){src=src.replace(weeklyFrom,weeklyTo);changes++;}
const periodFrom="giftAmount:gifted.reduce((sum,event)=>sum+Math.max(Number(event?.totalPrice||0),0),0)";
const periodTo="giftAmount:gifted.reduce((sum,event)=>sum+remainingForEvent(event),0)";
if(src.includes(periodFrom)){src=src.replaceAll(periodFrom,periodTo);changes++;}
if(!changes && src.includes(weeklyTo) && src.includes(periodTo)){
  console.log("[gift-auto-deduction] already applied");process.exit(0);
}
if(!changes)throw new Error("[gift-auto-deduction] dashboard gift anchors missing");
fs.writeFileSync(file,src,"utf8");
console.log("[gift-auto-deduction] OK:",changes);
