const fs=require('fs');
const path=require('path');
const file=path.join(process.cwd(),'client','src','App.jsx');
let src=fs.readFileSync(file,'utf8');

const anchor='function Login({ onLogin }) {';
if(!src.includes(anchor)){console.error('[poster-v4] Login anchor missing');process.exit(1);}

const studio=`function openLP28PosterStudio({guestUrl,qrDataUrl,eventName}){
  if(!guestUrl)return alert("Le lien Invité n’est pas encore disponible.");
  const qr=qrDataUrl||('https://api.qrserver.com/v1/create-qr-code/?size=900x900&data='+encodeURIComponent(guestUrl));
  const safeName=String(eventName||'Votre événement').replace(/[<>&\"']/g,'');
  const templates=[
    {id:'elegant',name:'Élégant',file:'/posters/lp28-elegant.svg',qx:26.7,qy:39.8,qw:46.6,ey:29.3,color:'#9a6c13'},
    {id:'modern',name:'Moderne',file:'/posters/lp28-modern.svg',qx:26.4,qy:38.3,qw:47.1,ey:29.2,color:'#ffffff'},
    {id:'phone',name:'Photo & smartphone',file:'/posters/lp28-phone.svg',qx:29.7,qy:42.8,qw:40.6,ey:29.3,color:'#111111'},
    {id:'minimal',name:'Minimaliste',file:'/posters/lp28-minimal.svg',qx:28.0,qy:40.4,qw:44.1,ey:29.3,color:'#111111'},
    {id:'fun',name:'Fun',file:'/posters/lp28-fun.svg',qx:26.6,qy:38.7,qw:46.9,ey:29.5,color:'#ffd52a'}
  ];
  const w=window.open('', '_blank');
  if(!w)return alert("Autorisez les fenêtres pop-up pour ouvrir le générateur d’affiche.");
  w.document.write(\`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Affiche invités - \${safeName}</title><style>
  *{box-sizing:border-box}body{margin:0;background:#07111c;color:#f8fafc;font-family:Inter,Arial,sans-serif}.app{max-width:1550px;margin:auto;padding:20px}.head{display:flex;justify-content:space-between;align-items:center;gap:18px;margin-bottom:16px}.head h1{margin:0;font-size:32px}.head p{margin:5px 0 0;color:#b7c5d6}.lp28{font-weight:900;color:#e7c34d;letter-spacing:.8px}.notice{border:1px solid #185f91;background:#0b2b47;padding:11px 14px;border-radius:10px;margin-bottom:16px}.grid{display:grid;grid-template-columns:repeat(5,minmax(205px,1fr));gap:12px}.card{background:#101923;border:1px solid #34465a;border-radius:13px;padding:9px;cursor:pointer;transition:.18s}.card:hover{transform:translateY(-2px);border-color:#7693b3}.card.sel{border:2px solid #e7c34d;box-shadow:0 0 0 2px rgba(231,195,77,.12)}.card-head{display:flex;justify-content:space-between;align-items:center;padding:3px 2px 9px}.card-head b{display:block}.card-head small{color:#9fb0c2}.poster-preview{position:relative;aspect-ratio:794/1123;overflow:hidden;border-radius:8px;background:#fff}.poster-preview>img.bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.qrOverlay{position:absolute;background:white;padding:1.3%;border-radius:3%;object-fit:contain}.eventOverlay{position:absolute;left:8%;right:8%;text-align:center;font-family:Georgia,serif;font-weight:700;font-size:clamp(12px,1.7vw,23px);line-height:1.1;text-shadow:0 1px 1px rgba(255,255,255,.35)}.bottom{display:grid;grid-template-columns:1fr 1.25fr;gap:14px;margin-top:16px}.panel{background:#101923;border:1px solid #34465a;border-radius:13px;padding:16px}.panel h3{margin:0 0 10px}.panel input{width:100%;padding:11px 12px;border-radius:9px;border:1px solid #46586d;background:#08111b;color:#fff}.actions{display:flex;gap:10px;flex-wrap:wrap}.actions button{padding:13px 17px;border-radius:9px;border:1px solid #566a81;background:#172433;color:#fff;font-weight:800;cursor:pointer}.actions .primary{background:#e7c34d;color:#111;border-color:#e7c34d}.printSheet{display:none}@media(max-width:1050px){.grid{grid-template-columns:repeat(2,minmax(210px,1fr))}.bottom{grid-template-columns:1fr}}@page{size:A4;margin:0}@media print{body>*{display:none!important}.printSheet{display:block!important;position:fixed;inset:0;width:210mm;height:297mm;overflow:hidden;background:white}.printSheet .bg{position:absolute;inset:0;width:210mm;height:297mm}.printSheet .qr{position:absolute;object-fit:contain;background:#fff;padding:1.4mm}.printSheet .ename{position:absolute;left:18mm;right:18mm;text-align:center;font-family:Georgia,serif;font-weight:700;font-size:7mm;line-height:1.05}.printSheet .custom{position:absolute;left:20mm;right:20mm;bottom:28mm;text-align:center;font-family:Georgia,serif;font-style:italic;font-size:5.5mm;font-weight:700}}
  </style></head><body><div class="app"><div class="head"><div><h1>🎨 Affiche pour vos invités</h1><p>Choisissez votre modèle A4. Le QR Code Invité de cet événement est inséré automatiquement.</p></div><div class="lp28">📸 LOCATION PHOTOBOOTH 28</div></div><div class="notice">ℹ️ Le QR Code reste entièrement visible et lisible. Le nom Location Photobooth 28 ainsi que Facebook et Instagram restent intégrés sur chaque affiche.</div><div class="grid" id="grid"></div><div class="bottom"><div class="panel"><h3>✍️ Personnalisation facultative</h3><label>Petit message en bas de l’affiche</label><input id="custom" maxlength="60" placeholder="Ex. Merci d’être là ! ♡"><p style="color:#9fb0c2;margin-bottom:0">Le visuel LP28 et les réseaux sociaux ne peuvent pas être masqués.</p></div><div class="panel"><h3>📄 Votre affiche</h3><p style="color:#b7c5d6">Format A4 21 × 29,7 cm, prêt à imprimer. À placer près de la borne, à l’entrée ou sur les tables.</p><div class="actions"><button class="primary" onclick="doPrint()">⬇️ Télécharger / enregistrer en PDF</button><button onclick="doPrint()">🖨️ Imprimer directement</button></div></div></div></div><div class="printSheet" id="printSheet"><img class="bg" id="printBg"><img class="qr" id="printQr" src="\${qr}"><div class="ename" id="printName">\${safeName}</div><div class="custom" id="printCustom"></div></div><script>
  const templates=\${JSON.stringify(templates)};let selected=0;const eventName=\${JSON.stringify(safeName)};const qr=\${JSON.stringify(qr)};
  function render(){document.getElementById('grid').innerHTML=templates.map((t,i)=>\`<div class="card \${i===selected?'sel':''}" onclick="selected=\${i};render()"><div class="card-head"><div><b>Modèle \${i+1}</b><small>\${t.name}</small></div><span>\${i===selected?'✅':'○'}</span></div><div class="poster-preview"><img class="bg" src="\${t.file}"><div class="eventOverlay" style="top:\${t.ey}%;color:\${t.color}">\${eventName}</div><img class="qrOverlay" src="\${qr}" style="left:\${t.qx}%;top:\${t.qy}%;width:\${t.qw}%"></div></div>\`).join('')}
  function doPrint(){const t=templates[selected],sheet=document.getElementById('printSheet'),bg=document.getElementById('printBg'),q=document.getElementById('printQr'),n=document.getElementById('printName');bg.src=t.file;q.style.left=t.qx+'%';q.style.top=t.qy+'%';q.style.width=t.qw+'%';n.style.top=t.ey+'%';n.style.color=t.color;document.getElementById('printCustom').textContent=document.getElementById('custom').value.trim();setTimeout(()=>window.print(),250)}render();
<\\/script></body></html>\`);
  w.document.close();
}

`;
src=src.replace(anchor,studio+anchor);

// Admin: route the existing poster button to the new studio.
const shareStart=src.indexOf('function ShareModal({event,onClose})');
if(shareStart<0){console.error('[poster-v4] ShareModal missing');process.exit(1);}
const shareNeedle='        const guestUrl=share.guestUrl||"";\n        if(!guestUrl)return alert("Le lien Invité n’est pas encore disponible.");';
const shareIdx=src.indexOf(shareNeedle,shareStart);
if(shareIdx<0){console.error('[poster-v4] admin poster trigger missing');process.exit(1);}
src=src.slice(0,shareIdx)+shareNeedle+'\n        openLP28PosterStudio({guestUrl,qrDataUrl:share.qrDataUrl,eventName:event.name});\n        return;'+src.slice(shareIdx+shareNeedle.length);

// Organizer: route its poster button to the same studio.
const orgStart=src.indexOf('  function openGuestPosterDesigner(){');
if(orgStart<0){console.error('[poster-v4] organizer designer missing');process.exit(1);}
const orgNeedle='    const guestUrl=guestShare?.guestUrl||"";\n    if(!guestUrl)return alert("Le lien Invité n’est pas encore disponible.");';
const orgIdx=src.indexOf(orgNeedle,orgStart);
if(orgIdx<0){console.error('[poster-v4] organizer trigger missing');process.exit(1);}
src=src.slice(0,orgIdx)+orgNeedle+'\n    openLP28PosterStudio({guestUrl,qrDataUrl:guestShare?.qrDataUrl,eventName:eventDisplayName});\n    return;'+src.slice(orgIdx+orgNeedle.length);

fs.writeFileSync(file,src,'utf8');
console.log('[poster-v4] OK: same real A4 artwork studio enabled for Admin and Organizer');
