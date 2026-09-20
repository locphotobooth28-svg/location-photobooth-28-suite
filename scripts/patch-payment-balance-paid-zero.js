const fs=require("fs");
const file="client/src/App.jsx";
let src=fs.readFileSync(file,"utf8");
const from='  const togglePayment=(key)=>setForm(f=>({...f,payments:{...f.payments,[key]:!f.payments[key]}}));';
const to=`  const togglePayment=(key)=>setForm(f=>{
    const nextValue=!f.payments[key];
    const nextPayments={...f.payments,[key]:nextValue};
    let balance=f.balance;
    if(key==="balancePaid"){
      balance=nextValue
        ? "0.00"
        : (f.totalPrice
            ? Math.max(Number(f.totalPrice||0)-Number(f.deposit||0),0).toFixed(2)
            : "");
    }
    return {...f,payments:nextPayments,balance};
  });`;
if(src.includes(to)){console.log("[payment-balance] already applied");process.exit(0);}
if(!src.includes(from))throw new Error("[payment-balance] togglePayment anchor missing");
src=src.replace(from,to);
fs.writeFileSync(file,src,"utf8");
console.log("[payment-balance] OK");
