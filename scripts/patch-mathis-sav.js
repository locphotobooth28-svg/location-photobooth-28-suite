const fs=require('fs');
const path=require('path');
const file=path.resolve(process.cwd(),'client/src/App.jsx');
let s=fs.readFileSync(file,'utf8');
let changes=0;

function replaceOnce(label, oldText, newText){
  if(s.includes(newText)){
    console.log(`[Mathis SAV] ${label}: déjà appliqué`);
    return;
  }
  const count=s.split(oldText).length-1;
  if(count!==1){
    throw new Error(`[Mathis SAV] ${label}: motif attendu 1 fois, trouvé ${count}`);
  }
  s=s.replace(oldText,newText);
  changes++;
  console.log(`[Mathis SAV] ${label}: OK`);
}

replaceOnce(
  'suppression choix imprimante inconnu',
  '  citizen:{name:"Citizen CY-02",icon:"🖨️"},\n  unknown:{name:"Je ne sais pas",icon:"❓"}\n};',
  '  citizen:{name:"Citizen CY-02",icon:"🖨️"}\n};'
);

replaceOnce(
  'identification imprimante par étiquette arrière',
  '{step==="printer"&&<><div className="mathis-bubble mathis-bubble-bot">Les imprimantes ne sont pas affectées à une borne.<br/><b>Quelle imprimante est actuellement branchée à {boothInfo?.name} ?</b></div><div className="mathis-choice-grid mathis-printers">{Object.entries(MATHIS_PRINTERS).map(([id,p])=><button key={id} onClick={()=>choosePrinter(id)}><span>{p.icon}</span><b>{p.name}</b>{id.startsWith("dnp")&&<small>Repère physique {id==="dnp1"?"1":"2"}</small>}</button>)}</div></>}',
  '{step==="printer"&&<><div className="mathis-bubble mathis-bubble-bot"><b>Identifiez l’imprimante actuellement branchée à {boothInfo?.name}.</b><br/>Regardez <b>l’étiquette située derrière l’imprimante</b>. Si vous utilisez une <b>DNP DS620</b>, l’étiquette indique le chiffre <b>1</b> ou <b>2</b>. Sélectionnez ci-dessous le numéro indiqué.</div><div className="mathis-choice-grid mathis-printers">{Object.entries(MATHIS_PRINTERS).map(([id,p])=><button key={id} onClick={()=>choosePrinter(id)}><span>{p.icon}</span><b>{p.name}</b>{id.startsWith("dnp")&&<small>Étiquette arrière : {id==="dnp1"?"1":"2"}</small>}</button>)}</div></>}'
);

replaceOnce(
  'parcours LumaBooth démarrage et blocage',
  '      if(diagStage==="luma-start"||diagStage==="luma-freeze"||diagStage==="slow"||diagStage==="camera"||diagStage==="usb")return <><div className="mathis-bubble mathis-bubble-bot"><b>Merci. N\'effectuez aucune manipulation dans Windows.</b><br/>{diagStage==="luma-start"?"Si le bureau Windows est affiché à la place de LumaBooth, Johan doit intervenir à distance.":diagStage==="luma-freeze"?"Si LumaBooth ne répond plus, ne forcez pas sa fermeture.":"Je vais transmettre ce constat à Johan pour un contrôle à distance."}</div>{askPhoto("Photo de ce que vous voyez à l\'écran")}<div className="mathis-actions"><button onClick={()=>goN2("Borne / Windows / LumaBooth — "+diagStage)}>🟠 Demander l\'aide de Johan</button></div></>;',
  `      if(diagStage==="luma-start")return <><div className="mathis-bubble mathis-bubble-bot"><b>🐰 Première vérification : relancer simplement LumaBooth.</b><br/>Si vous voyez le bureau Windows, repérez l’icône <b>LumaBooth</b> puis faites un <b>double-clic</b> dessus. Patientez quelques secondes.<br/><br/><b>Est-ce que LumaBooth s’est ouvert ?</b></div><div className="mathis-actions"><button onClick={()=>finishN1("LumaBooth relancé par double-clic")}>✅ Oui, LumaBooth est ouvert</button><button onClick={()=>setDiagStage("luma-start-open")}>❌ Non, rien ne se passe</button></div></>;
      if(diagStage==="luma-start-open")return <><div className="mathis-bubble mathis-bubble-bot"><b>🖱️ Deuxième vérification.</b><br/>Laissez votre doigt appuyé quelques instants sur l’icône <b>LumaBooth</b> (ou faites un clic droit avec une souris). Un menu va s’ouvrir.<br/><br/>Sélectionnez uniquement <b>« Ouvrir »</b> en haut du menu, puis patientez quelques secondes.<br/><br/><b>Est-ce que LumaBooth s’est ouvert ?</b><br/><small>⚠️ Ne choisissez pas « Exécuter en tant qu’administrateur » et ne modifiez aucun autre réglage.</small></div><div className="mathis-actions"><button onClick={()=>finishN1("LumaBooth relancé via Ouvrir")}>✅ Oui, LumaBooth est ouvert</button><button onClick={()=>setDiagStage("luma-start-photo")}>❌ Non, toujours rien</button></div></>;
      if(diagStage==="luma-start-photo")return <><div className="mathis-bubble mathis-bubble-bot"><b>Merci. Les deux tentatives simples n’ont pas relancé LumaBooth.</b><br/>Ne faites aucune autre manipulation dans Windows. Mathis va maintenant transmettre la situation à Johan.</div>{askPhoto("Photo de ce que vous voyez à l’écran")}<div className="mathis-actions"><button onClick={()=>goN2("LumaBooth ne démarre pas après double-clic puis Ouvrir")}>🟠 Demander l’aide de Johan</button></div></>;
      if(diagStage==="luma-freeze")return <><div className="mathis-bubble mathis-bubble-bot"><b>LumaBooth semble bloqué.</b><br/>Ne forcez pas sa fermeture et ne touchez pas à Windows. <b>Attendez environ 20 secondes</b> sans cliquer, afin de vérifier si l’application reprend d’elle-même.<br/><br/><b>LumaBooth répond-il de nouveau ?</b></div><div className="mathis-actions"><button onClick={()=>finishN1("LumaBooth a repris après attente")}>✅ Oui, c’est reparti</button><button onClick={()=>setDiagStage("luma-freeze-photo")}>❌ Non, toujours bloqué</button></div></>;
      if(diagStage==="luma-freeze-photo")return <><div className="mathis-bubble mathis-bubble-bot"><b>LumaBooth reste bloqué après l’attente.</b><br/>Ne forcez pas sa fermeture. Une photo de l’écran peut maintenant aider Johan à identifier la situation avant la prise en main à distance.</div>{askPhoto("Photo de ce que vous voyez à l’écran")}<div className="mathis-actions"><button onClick={()=>goN2("LumaBooth toujours bloqué après 20 secondes")}>🟠 Demander l’aide de Johan</button></div></>;
      if(diagStage==="slow"||diagStage==="camera"||diagStage==="usb")return <><div className="mathis-bubble mathis-bubble-bot"><b>Merci. N’effectuez aucune manipulation dans Windows.</b><br/>Je vais transmettre ce constat à Johan pour un contrôle à distance.</div>{askPhoto("Photo de ce que vous voyez à l’écran")}<div className="mathis-actions"><button onClick={()=>goN2("Borne / Windows / LumaBooth — "+diagStage)}>🟠 Demander l’aide de Johan</button></div></>;`
);

replaceOnce(
  'combinaison de voyants absente',
  '      <div className="mathis-actions"><button onClick={()=>{setLedCode("");setPrinterStage("symptom")}}>↩️ Aucun voyant ne clignote finalement</button></div>',
  '      <div className="mathis-actions"><button onClick={()=>goN2("Combinaison de voyants absente de la liste")}>❓ La combinaison de voyants n’est pas dans la liste</button><button onClick={()=>{setLedCode("");setPrinterStage("symptom")}}>↩️ Aucun voyant ne clignote finalement</button></div>'
);

replaceOnce(
  'fin papier/ruban vers contrôle N2',
  '      <div className="mathis-actions"><button onClick={printerSolved}>✅ Impression rétablie</button><button onClick={printerStillBroken}>❌ Toujours en panne</button><button onClick={()=>setLedCode("")}>↩️ Revoir les voyants</button></div>',
  '      {(ledCode==="paper-end"||ledCode==="ribbon-end")?<div className="mathis-actions"><button onClick={printerStillBroken}>🟠 Demander le contrôle de Johan</button><button onClick={()=>setLedCode("")}>↩️ Revoir les voyants</button></div>:<div className="mathis-actions"><button onClick={printerSolved}>✅ Impression rétablie</button><button onClick={printerStillBroken}>❌ Toujours en panne</button><button onClick={()=>setLedCode("")}>↩️ Revoir les voyants</button></div>}'
);

if(changes){
  fs.writeFileSync(file,s,'utf8');
  console.log(`[Mathis SAV] ${changes} correction(s) appliquée(s) à ${file}`);
}else{
  console.log('[Mathis SAV] aucune modification nécessaire');
}
