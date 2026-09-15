const fs=require('fs');
const file='client/src/App.jsx';
let src=fs.readFileSync(file,'utf8');
const start=src.indexOf('              <div className="event-actions">\n                {canEventAction("view")&&<button onClick={()=>setViewEvent(event)}');
const end=src.indexOf('              </div>\n            </div>\n          </article></React.Fragment>;})}',start);
if(start<0||end<0)throw new Error('[event-actions-compact] bloc actions événement introuvable');
const block=`              <div className="event-actions lp28-event-actions-compact">
                {canEventAction("view")&&<button onClick={()=>setViewEvent(event)} style={{border:"1px solid #60a5fa",background:"rgba(30,64,175,.22)",color:"#bfdbfe",fontWeight:900}}>👁️ Voir l'événement</button>}
                {canEventAction("navigate")&&event.address&&<button onClick={()=>window.open(\`https://waze.com/ul?q=\${encodeURIComponent(event.address)}&navigate=yes&utm_source=lp28-suite\`,\`_blank\`,\`noopener,noreferrer\`)} style={{border:"1px solid #38bdf8",background:"rgba(14,116,144,.20)",color:"#bae6fd",fontWeight:900}}>🚗 Se rendre à l’événement</button>}
                {canEventAction("start")&&event.status!=="COMPLETED"&&event.status!=="IN_PROGRESS"&&<button onClick={()=>startEvent(event)} style={{border:"1px solid #f59e0b",background:"rgba(146,64,14,.28)",color:"#fdba74",fontWeight:900}}>▶️ Début événement</button>}
                {canEventAction("complete")&&event.status==="IN_PROGRESS"&&<button onClick={()=>completeEvent(event)} style={{border:"1px solid #22c55e",background:"rgba(22,101,52,.24)",color:"#86efac",fontWeight:900}}>✅ Prestation terminée</button>}
                {canEventAction("edit")&&<button onClick={()=>{setFormEvent(event);setShowForm(true)}}>✏️ Modifier</button>}

                {(isAdmin||canEventAction("contract")||canEventAction("documents"))&&<details className="lp28-action-menu"><summary>👥 Accès client</summary><div className="lp28-action-menu-panel">
                  {isAdmin&&<details className="preview-role-menu"><summary>👁️ Voir en tant que…</summary><div><button onClick={()=>previewPortal(event,"ORGANIZER")}>👤 Organisateur</button><button onClick={()=>previewPortal(event,"GUEST")}>👥 Invité</button></div></details>}
                  {canEventAction("contract")&&<button onClick={()=>window.open(\`/api/events/\${event.id}/contract.pdf\`,"_blank","noopener,noreferrer")}>📄 Voir le contrat</button>}
                  {canEventAction("documents")&&<button onClick={()=>setDocumentEvent(event)}>📁 Documents</button>}
                  {(isAdmin||canEventAction("contract"))&&(event.contractStatus==="SIGNED" ? <button className="danger-btn" onClick={()=>cancelContractSignature(event)}>↩️ Annuler la signature</button> : <button onClick={async()=>{try{const r=await fetch(\`/api/events/\${event.id}/contract-signature-link\`,{method:"POST"});const d=await r.json().catch(()=>({}));if(!r.ok)return alert(d.message||"Impossible de préparer le contrat à signer.");try{await navigator.clipboard.writeText(d.signatureUrl);alert(\`✅ Lien de signature créé et copié !\\n\\n\${d.signatureUrl}\`)}catch{prompt("Copie ce lien et envoie-le au client :",d.signatureUrl)}}catch(err){console.error(err);alert("Erreur lors de la création du lien de signature.")}}}>✍️ Faire signer</button>)}
                </div></details>}

                {(canEventAction("google")||canEventAction("share"))&&<details className="lp28-action-menu"><summary>📂 Gestion</summary><div className="lp28-action-menu-panel">
                  {canEventAction("google")&&<button onClick={()=>syncGoogle(event)}>☁️ Sync Google</button>}
                  {canEventAction("share")&&<button onClick={()=>setShareEvent(event)}>📱 Partager</button>}
                </div></details>}

                {(canEventAction("archive")||canEventAction("delete"))&&<details className="lp28-action-menu"><summary>⚙️ Plus</summary><div className="lp28-action-menu-panel">
                  {canEventAction("archive")&&<button onClick={()=>archive(event)}>{event.archived?"♻️ Réactiver":"📦 Archiver"}</button>}
                  {canEventAction("delete")&&<button className="danger-btn" onClick={()=>remove(event)}>🗑️ Supprimer</button>}
                </div></details>}
              </div>`;
src=src.slice(0,start)+block+src.slice(end+'              </div>'.length);
const css='`}</style>;';
const style=`
    .lp28-event-actions-compact{align-items:flex-start;}
    .lp28-action-menu{position:relative;}
    .lp28-action-menu>summary{list-style:none;cursor:pointer;border:1px solid rgba(148,163,184,.22);border-radius:10px;padding:9px 12px;background:rgba(17,24,39,.72);font-weight:800;white-space:nowrap;}
    .lp28-action-menu>summary::-webkit-details-marker{display:none;}
    .lp28-action-menu-panel{position:absolute;left:0;top:calc(100% + 6px);z-index:50;min-width:220px;padding:8px;display:grid;gap:7px;background:#111318;border:1px solid rgba(148,163,184,.28);border-radius:12px;box-shadow:0 18px 45px rgba(0,0,0,.45);}
    .lp28-action-menu-panel>button,.lp28-action-menu-panel>.preview-role-menu{width:100%;}
    .lp28-action-menu-panel button,.lp28-action-menu-panel summary{text-align:left;white-space:nowrap;}
`;
if(!src.includes('.lp28-action-menu-panel{'))src=src.replace(css,style+css);
fs.writeFileSync(file,src,'utf8');
console.log('[event-actions-compact] OK: actions événement regroupées');
