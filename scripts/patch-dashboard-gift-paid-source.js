const fs=require("fs");
const file="client/src/App.jsx";
let src=fs.readFileSync(file,"utf8");
const from='const summarize=(items,period)=>{const billed=items.filter(event=>!event?.preparation?.gifted);const gifted=items.filter(event=>!!event?.preparation?.gifted);let giftAmount=0;if(period!=="week"){giftAmount=gifted.reduce((sum,event)=>{const d=parseDate(event);if(period==="month"&&d&&d>=monday&&d<weekEnd)return sum;return sum+Math.max(Number(event?.totalPrice||0),0);},0);}return {billedCount:billed.length,billedAmount:billed.reduce((sum,event)=>sum+remaining(event),0),giftCount:gifted.length,giftAmount};};';
const to='const summarize=(items,period)=>{const billed=items.filter(event=>!event?.preparation?.gifted);const gifted=items.filter(event=>!!event?.preparation?.gifted);const giftAmount=gifted.reduce((sum,event)=>sum+remaining(event),0);return {billedCount:billed.length,billedAmount:billed.reduce((sum,event)=>sum+remaining(event),0),giftCount:gifted.length,giftAmount};};';
if(src.includes(to)){console.log("[gift-paid-source] already applied");process.exit(0);}
if(!src.includes(from))throw new Error("[gift-paid-source] confirmedFinanceDashboard anchor missing");
src=src.replace(from,to);
fs.writeFileSync(file,src,"utf8");
console.log("[gift-paid-source] OK");
