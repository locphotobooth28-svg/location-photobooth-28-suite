const fs=require("fs");
const appPath="client/src/App.jsx";
let app=fs.readFileSync(appPath,"utf8");

const startMarker='<details className="accordion-block lp28-portal-accordion">';
const nextMarker='\n\n      <h3>🚗 Frais de déplacement</h3>';
const start=app.indexOf(startMarker);
const end=app.indexOf(nextMarker,start);
if(start<0||end<0) throw new Error('[portal-admin-table] bloc Portail événement introuvable');

const block=`<details className="accordion-block lp28-portal-accordion">
        <summary><span>📸 Portail événement</span><small>{form.portalEnabled?"Activé":"Désactivé"}</small></summary>
        <div className="accordion-content lp28-portal-table-wrap">
          <style>{\`
            .lp28-portal-table-wrap{--bg:#0b111a;--card:#0f1a28;--line:rgba(93,130,178,.28);--text:#f6f8fb;--muted:#aeb8c7;--blue:#2e8cff;--purple:#a542ff;--green:#22c98b;color:var(--text)}
            .lp28-portal-table-wrap *{box-sizing:border-box}.lp28-portal-table-shell{display:grid;gap:14px}.lp28-portal-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border:1px solid var(--line);border-radius:14px;background:linear-gradient(145deg,rgba(19,34,55,.96),rgba(10,19,31,.96))}.lp28-portal-head-left{display:flex;align-items:center;gap:12px}.lp28-portal-head input{width:27px!important;height:27px!important;margin:0!important;accent-color:var(--blue)}.lp28-portal-head strong{font-size:15px}.lp28-portal-head small{display:block;color:var(--muted);margin-top:3px}.lp28-state{padding:6px 10px;border-radius:999px;font-size:11px;font-weight:900;border:1px solid rgba(34,201,139,.4);background:rgba(34,201,139,.12);color:#82f1ca}.lp28-state.off{border-color:rgba(148,163,184,.3);background:rgba(148,163,184,.1);color:#c3cad4}
            .lp28-table-card{border:1px solid var(--line);border-radius:14px;overflow:hidden;background:linear-gradient(180deg,rgba(12,25,41,.96),rgba(8,18,31,.98))}.lp28-table-title{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-bottom:1px solid var(--line);font-weight:900}.lp28-table-title small{color:var(--muted);font-weight:600}.lp28-table{width:100%;border-collapse:collapse;table-layout:fixed}.lp28-table th,.lp28-table td{padding:11px 12px;border-bottom:1px solid rgba(255,255,255,.055);vertical-align:middle}.lp28-table tr:last-child td{border-bottom:0}.lp28-table th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#9fb0c6;background:rgba(255,255,255,.025)}.lp28-table th:nth-child(2),.lp28-table th:nth-child(3),.lp28-table td:nth-child(2),.lp28-table td:nth-child(3){width:100px;text-align:center}.lp28-table th:nth-child(4),.lp28-table td:nth-child(4){width:230px}.lp28-feature{font-weight:850}.lp28-feature small{display:block;color:var(--muted);font-size:10px;font-weight:500;margin-top:2px}.lp28-check{display:inline-flex;align-items:center;justify-content:center}.lp28-check input{width:21px!important;height:21px!important;margin:0!important;accent-color:var(--blue)}.lp28-dash{color:#667487}.lp28-action-btn{width:100%;min-height:36px;border-radius:9px!important;border:1px solid rgba(165,66,255,.48)!important;background:linear-gradient(135deg,rgba(112,44,184,.78),rgba(65,36,117,.78))!important;color:#fff!important;font-size:11px!important;font-weight:900!important;padding:7px 9px!important}.lp28-action-btn.blue{border-color:rgba(46,140,255,.55)!important;background:linear-gradient(135deg,rgba(27,116,224,.86),rgba(23,74,143,.82))!important}.lp28-action-btn:disabled{opacity:.42!important;cursor:not-allowed}.lp28-paid-row td{background:rgba(136,54,210,.08)}.lp28-paid-tag{display:inline-flex;padding:4px 7px;border-radius:8px;border:1px solid rgba(165,66,255,.5);background:rgba(165,66,255,.11);color:#dfb7ff;font-size:10px;font-weight:900;margin-left:7px}.lp28-renew-note{padding:9px 12px;border-top:1px solid var(--line);color:var(--muted);font-size:11px}
            .lp28-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.lp28-field{border:1px solid var(--line);border-radius:12px;background:rgba(13,27,44,.9);padding:11px;min-width:0}.lp28-field label{display:block!important;margin:0 0 7px!important;font-size:11px;font-weight:900}.lp28-field input{width:100%;margin:0!important}.lp28-field small{display:block;margin-top:6px;color:var(--muted);font-size:10px;line-height:1.4}.lp28-options-card{border:1px solid var(--line);border-radius:14px;padding:12px;background:rgba(10,21,35,.96)}.lp28-options-head{font-weight:900;margin-bottom:10px}.lp28-options-table th:nth-child(2),.lp28-options-table td:nth-child(2){width:130px;text-align:center}.lp28-options-table th:nth-child(3),.lp28-options-table td:nth-child(3){width:130px;text-align:center}.lp28-info-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.lp28-info-box{border:1px solid rgba(46,140,255,.35);border-radius:12px;padding:11px 12px;background:rgba(33,79,137,.11)}.lp28-info-box.tip{border-color:rgba(225,182,64,.38);background:rgba(95,73,16,.12)}.lp28-info-box strong{display:block;margin-bottom:4px}.lp28-info-box p{margin:0;color:var(--muted);font-size:11px;line-height:1.45}
            @media(max-width:820px){.lp28-info-row,.lp28-fields{grid-template-columns:1fr}.lp28-table{table-layout:auto}.lp28-table th:nth-child(4),.lp28-table td:nth-child(4){width:170px}.lp28-table th:nth-child(2),.lp28-table th:nth-child(3),.lp28-table td:nth-child(2),.lp28-table td:nth-child(3){width:78px}}
            @media(max-width:620px){.lp28-table-card{overflow-x:auto}.lp28-table{min-width:660px}.lp28-options-table{min-width:520px}.lp28-portal-head{align-items:flex-start;flex-direction:column}.lp28-portal-head .lp28-state{align-self:flex-start}}
          \`}</style>

          <div className="lp28-portal-table-shell">
            <div className="lp28-portal-head">
              <label className="lp28-portal-head-left">
                <input type="checkbox" checked={Boolean(form.portalEnabled)} onChange={e=>set("portalEnabled",e.target.checked)}/>
                <span><strong>Activer le portail</strong><small>Rend le portail accessible à l’organisateur.</small></span>
              </label>
              <span className={form.portalEnabled?"lp28-state":"lp28-state off"}>{form.portalEnabled?"● Activé":"● Désactivé"}</span>
            </div>

            <div className="lp28-info-row">
              <div className="lp28-info-box"><strong>ℹ️ Information</strong><p>Cochez les éléments que l’organisateur et les invités pourront utiliser.</p></div>
              <div className="lp28-info-box tip"><strong>💡 Bon à savoir</strong><p>Les accès peuvent être modifiés à tout moment. Les jetons catalogue peuvent être renouvelés si nécessaire.</p></div>
            </div>

            {form.portalEnabled && <>
              <div className="lp28-table-card">
                <div className="lp28-table-title"><span>🔐 Accès au portail</span><small>Gestion centralisée des droits</small></div>
                <table className="lp28-table">
                  <thead><tr><th>Fonction</th><th>Organisateur</th><th>Invité</th><th>Action</th></tr></thead>
                  <tbody>
                    <tr><td className="lp28-feature">📄 Contrat<small>Consultation du contrat</small></td><td><span className="lp28-check"><input type="checkbox" checked={portalPermissions.organizerContract} onChange={e=>setPortalPermissions(p=>({...p,organizerContract:e.target.checked}))}/></span></td><td className="lp28-dash">—</td><td></td></tr>
                    <tr><td className="lp28-feature">🧾 Documents / Factures<small>Factures et documents client</small></td><td><span className="lp28-check"><input type="checkbox" checked={portalPermissions.organizerDocuments} onChange={e=>setPortalPermissions(p=>({...p,organizerDocuments:e.target.checked}))}/></span></td><td className="lp28-dash">—</td><td></td></tr>
                    <tr><td className="lp28-feature">👥 Partage / QR invités<small>Partage du lien et QR code invités</small></td><td><span className="lp28-check"><input type="checkbox" checked={portalPermissions.organizerShare} onChange={e=>setPortalPermissions(p=>({...p,organizerShare:e.target.checked}))}/></span></td><td className="lp28-dash">—</td><td></td></tr>
                    <tr><td className="lp28-feature">🎧 Assistance Mathis<small>Accès à l’assistance LP28</small></td><td><span className="lp28-check"><input type="checkbox" checked={portalPermissions.organizerMathis} onChange={e=>setPortalPermissions(p=>({...p,organizerMathis:e.target.checked}))}/></span></td><td><span className="lp28-check"><input type="checkbox" checked={portalPermissions.guestMathis} onChange={e=>setPortalPermissions(p=>({...p,guestMathis:e.target.checked}))}/></span></td><td></td></tr>
                    <tr><td className="lp28-feature">🖼️ Galerie photos<small>Accès galerie côté invités</small></td><td className="lp28-dash">—</td><td><span className="lp28-check"><input type="checkbox" checked={portalPermissions.guestGallery} onChange={e=>setPortalPermissions(p=>({...p,guestGallery:e.target.checked}))}/></span></td><td></td></tr>
                    <tr className="lp28-paid-row"><td className="lp28-feature">🎨 Catalogues personnalisation <span className="lp28-paid-tag">25 €</span><small>Activation générale de l’option payante</small></td><td><span className="lp28-check"><input type="checkbox" checked={portalPermissions.personalizationAccess===true} onChange={e=>setPortalPermissions(p=>({...p,personalizationAccess:e.target.checked}))}/></span></td><td className="lp28-dash">—</td><td></td></tr>
                    <tr className="lp28-paid-row"><td className="lp28-feature">🎨 Catalogue TemplatesBooth<small>Modèles TemplatesBooth</small></td><td><span className="lp28-check"><input type="checkbox" disabled={portalPermissions.personalizationAccess!==true} checked={portalPermissions.personalizationTemplatesBooth!==false} onChange={e=>setPortalPermissions(p=>({...p,personalizationTemplatesBooth:e.target.checked}))}/></span></td><td className="lp28-dash">—</td><td><button type="button" className="lp28-action-btn" disabled={!form?.id||portalPermissions.personalizationAccess!==true} onClick={()=>renewPersonalizationLink("templates")}>🔄 Nouveau jeton TemplatesBooth</button></td></tr>
                    <tr className="lp28-paid-row"><td className="lp28-feature">🏞️ Catalogue BoothWidget<small>Modèles BoothWidget</small></td><td><span className="lp28-check"><input type="checkbox" disabled={portalPermissions.personalizationAccess!==true} checked={portalPermissions.personalizationBoothWidget!==false} onChange={e=>setPortalPermissions(p=>({...p,personalizationBoothWidget:e.target.checked}))}/></span></td><td className="lp28-dash">—</td><td><button type="button" className="lp28-action-btn blue" disabled={!form?.id||portalPermissions.personalizationAccess!==true} onClick={()=>renewPersonalizationLink("boothwidget")}>🔄 Nouveau jeton BoothWidget</button></td></tr>
                  </tbody>
                </table>
                {personalizationRenewMsg&&<div className="lp28-renew-note">{personalizationRenewMsg}</div>}
              </div>

              <div className="lp28-options-card">
                <div className="lp28-options-head">⚙️ Options supplémentaires</div>
                <table className="lp28-table lp28-options-table">
                  <thead><tr><th>Option</th><th>Autoriser</th><th>Portée</th></tr></thead>
                  <tbody>
                    <tr><td className="lp28-feature">📷 Photos invités<small>Ajout de photos par les invités</small></td><td><span className="lp28-check"><input type="checkbox" checked={Boolean(form.guestUploadEnabled)} onChange={e=>set("guestUploadEnabled",e.target.checked)}/></span></td><td>Invités</td></tr>
                    <tr><td className="lp28-feature">🎥 Vidéos invités<small>Ajout de vidéos par les invités</small></td><td><span className="lp28-check"><input type="checkbox" checked={Boolean(form.guestVideoEnabled)} onChange={e=>set("guestVideoEnabled",e.target.checked)}/></span></td><td>Invités</td></tr>
                    <tr><td className="lp28-feature">🛡️ Modération avant publication<small>Validation avant affichage</small></td><td><span className="lp28-check"><input type="checkbox" checked={form.guestUploadModerated!==false} onChange={e=>set("guestUploadModerated",e.target.checked)}/></span></td><td>Photos / vidéos</td></tr>
                  </tbody>
                </table>
              </div>

              <div className="lp28-fields">
                <div className="lp28-field"><label>📅 Expiration de l’accès</label><input type="date" value={form.portalExpiresAt||""} onChange={e=>set("portalExpiresAt",e.target.value)}/><small>Laissez vide pour un accès sans limite de date.</small></div>
                <div className="lp28-field"><label>🔒 Mot de passe (facultatif)</label><input value={form.portalPassword||""} onChange={e=>set("portalPassword",e.target.value)}/><small>Optionnel : protège l’accès au portail.</small></div>
                <div className="lp28-field"><label>🔗 Galerie Photos du Photobooth</label><input placeholder="https://fotoshare.co/..." value={form.fotoshareUrl||""} onChange={e=>set("fotoshareUrl",e.target.value)}/><small>Alimente le bouton « Photos Borne ». Accès client prévu pendant 30 jours.</small></div>
              </div>
            </>}
          </div>
        </div>
      </details>`;

app=app.slice(0,start)+block+app.slice(end);
fs.writeFileSync(appPath,app,"utf8");
console.log('[portal-admin-table] OK: portail événement en tableau compact');
