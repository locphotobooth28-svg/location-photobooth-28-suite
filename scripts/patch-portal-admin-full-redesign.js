const fs=require("fs");
const appPath="client/src/App.jsx";
let app=fs.readFileSync(appPath,"utf8");

const startMarker='<details className="accordion-block">\n        <summary><span>📸 Portail événement</span><small>{form.portalEnabled?"Activé":"Désactivé"}</small></summary>';
const nextMarker='\n\n      <h3>🚗 Frais de déplacement</h3>';
const start=app.indexOf(startMarker);
const end=app.indexOf(nextMarker,start);
if(start<0||end<0) throw new Error('[portal-full-redesign] bloc Portail événement introuvable');

const block=`<details className="accordion-block lp28-portal-accordion">
        <summary><span>📸 Portail événement</span><small>{form.portalEnabled?"Activé":"Désactivé"}</small></summary>
        <div className="accordion-content lp28-portal-wrap">
          <style>{\`
            .lp28-portal-wrap{--pbg:#09131f;--pcard:#0d1d2f;--pcard2:#10233a;--pborder:rgba(76,130,205,.34);--ptext:#f6f8fb;--pmuted:#aebbd0;--pblue:#2388ff;--ppurple:#a73bff;--pgreen:#18c989;--pgold:#e1b640;color:var(--ptext)}
            .lp28-portal-wrap *{box-sizing:border-box}.lp28-portal-shell{display:grid;gap:14px}.lp28-portal-top{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr) minmax(0,1fr);gap:12px}.lp28-pcard{border:1px solid var(--pborder);border-radius:15px;background:linear-gradient(145deg,rgba(17,39,65,.96),rgba(8,21,36,.96));padding:15px;min-width:0;box-shadow:inset 0 1px 0 rgba(255,255,255,.035),0 10px 24px rgba(0,0,0,.18)}
            .lp28-pcard.info{border-color:rgba(47,140,255,.55)}.lp28-pcard.tip{border-color:rgba(225,182,64,.58);background:linear-gradient(145deg,rgba(67,54,18,.28),rgba(12,23,35,.96))}.lp28-pcard h4{margin:0 0 7px;font-size:14px}.lp28-pcard p{margin:0;color:var(--pmuted);font-size:12px;line-height:1.5}.lp28-portal-toggle{display:flex;align-items:center;gap:12px;min-height:76px}.lp28-portal-toggle input{width:28px!important;height:28px!important;min-width:28px;accent-color:var(--pblue);margin:0!important}.lp28-portal-toggle strong{font-size:15px}.lp28-status{margin-left:auto;display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:6px 10px;font-size:11px;font-weight:900;border:1px solid rgba(24,201,137,.42);background:rgba(24,201,137,.12);color:#7bf2c8}.lp28-status.off{border-color:rgba(148,163,184,.3);background:rgba(148,163,184,.1);color:#bdc5d1}
            .lp28-section{border:1px solid var(--pborder);border-radius:16px;background:linear-gradient(180deg,rgba(9,26,44,.95),rgba(7,18,31,.97));padding:15px}.lp28-section-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}.lp28-section-head h4{margin:0;font-size:15px}.lp28-section-head p{margin:3px 0 0;color:var(--pmuted);font-size:11px}.lp28-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
            .lp28-choice{position:relative;display:flex!important;align-items:center!important;gap:11px!important;min-height:78px;padding:13px!important;margin:0!important;border:1px solid rgba(82,128,199,.34);border-radius:13px;background:linear-gradient(145deg,rgba(18,42,70,.86),rgba(10,25,43,.9));font-weight:800;cursor:pointer;transition:.16s}.lp28-choice:hover{border-color:rgba(67,151,255,.7);transform:translateY(-1px)}.lp28-choice input{width:22px!important;height:22px!important;min-width:22px;accent-color:var(--pblue);margin:0!important}.lp28-choice:has(input:checked){border-color:rgba(47,140,255,.72);box-shadow:inset 0 0 0 1px rgba(47,140,255,.16)}.lp28-choice:has(input:disabled){opacity:.5;cursor:not-allowed}.lp28-choice .ico{width:38px;height:38px;min-width:38px;display:grid;place-items:center;border-radius:10px;background:linear-gradient(145deg,#183e72,#132b4d);font-size:19px}.lp28-choice .txt{display:flex;flex-direction:column;gap:3px;line-height:1.25}.lp28-choice .txt small{color:var(--pmuted);font-weight:500;font-size:10px}
            .lp28-personal{border-color:rgba(174,62,255,.68);box-shadow:inset 0 0 0 1px rgba(174,62,255,.08)}.lp28-paid{display:inline-flex;align-items:center;border:1px solid rgba(174,62,255,.7);background:rgba(174,62,255,.14);color:#e4b6ff;border-radius:10px;padding:7px 10px;font-size:11px;font-weight:900}.lp28-personal-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.lp28-catalog{border:1px solid rgba(96,136,204,.38);border-radius:14px;background:linear-gradient(145deg,rgba(16,40,66,.88),rgba(11,27,47,.92));padding:12px}.lp28-catalog-top{display:flex;align-items:center;gap:10px}.lp28-catalog-top input{width:22px!important;height:22px!important;accent-color:var(--pblue);margin-left:auto!important}.lp28-catalog-title{font-weight:900}.lp28-catalog-sub{color:var(--pmuted);font-size:10px;margin-top:3px}.lp28-token{width:100%;margin-top:10px!important;min-height:39px;border-radius:10px!important;font-weight:900!important;border:1px solid rgba(174,62,255,.68)!important;background:linear-gradient(135deg,rgba(125,38,205,.88),rgba(81,35,146,.86))!important;color:#fff!important}.lp28-catalog:nth-child(2) .lp28-token{border-color:rgba(26,148,255,.7)!important;background:linear-gradient(135deg,rgba(19,126,235,.9),rgba(18,87,177,.86))!important}.lp28-renew-msg{margin-top:8px;color:var(--pmuted);font-size:11px}
            .lp28-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.lp28-field{border:1px solid rgba(82,128,199,.3);border-radius:13px;background:rgba(11,29,49,.86);padding:12px;min-width:0}.lp28-field>label{display:block!important;margin:0 0 7px!important;font-size:11px;font-weight:900}.lp28-field input[type="date"],.lp28-field input[type="text"],.lp28-field input:not([type]){width:100%;margin:0!important}.lp28-field.wide{grid-column:span 1}.lp28-field small{display:block;margin-top:7px;color:var(--pmuted);font-size:10px;line-height:1.4}.lp28-option-card{min-height:82px}.lp28-option-card .txt small{font-size:10px}.lp28-gallery-field{grid-column:span 1}
            @media(max-width:980px){.lp28-portal-top{grid-template-columns:1fr}.lp28-grid,.lp28-options{grid-template-columns:repeat(2,minmax(0,1fr))}.lp28-personal-grid{grid-template-columns:1fr}}
            @media(max-width:640px){.lp28-grid,.lp28-options{grid-template-columns:1fr}.lp28-portal-wrap{padding:10px!important}.lp28-section{padding:11px}.lp28-choice{min-height:68px}.lp28-section-head{align-items:flex-start;flex-direction:column}.lp28-paid{align-self:flex-start}}
          \`}</style>

          <div className="lp28-portal-shell">
            <div className="lp28-portal-top">
              <label className="lp28-pcard lp28-portal-toggle">
                <input type="checkbox" checked={Boolean(form.portalEnabled)} onChange={e=>set("portalEnabled",e.target.checked)}/>
                <div><strong>⚡ Activer le portail</strong><p>Rend le portail accessible à l’organisateur de cet événement.</p></div>
                <span className={form.portalEnabled?"lp28-status":"lp28-status off"}>{form.portalEnabled?"● Activé":"● Désactivé"}</span>
              </label>
              <div className="lp28-pcard info"><h4>ℹ️ Information</h4><p>Cochez les éléments que l’organisateur pourra voir et utiliser sur son portail événement.</p></div>
              <div className="lp28-pcard tip"><h4>💡 Bon à savoir</h4><p>Vous pouvez modifier ces accès à tout moment et renouveler les jetons de catalogue si nécessaire.</p></div>
            </div>

            {form.portalEnabled && <>
              <section className="lp28-section">
                <div className="lp28-section-head"><div><h4>🔐 Visibilité des portails</h4><p>Choisissez les éléments accessibles à l’organisateur et aux invités.</p></div></div>
                <div className="lp28-grid">
                  <label className="lp28-choice"><span className="ico">📄</span><span className="txt">Contrat<small>Organisateur : contrat</small></span><input type="checkbox" checked={portalPermissions.organizerContract} onChange={e=>setPortalPermissions(p=>({...p,organizerContract:e.target.checked}))}/></label>
                  <label className="lp28-choice"><span className="ico">🧾</span><span className="txt">Documents / Factures<small>Organisateur : documents et factures</small></span><input type="checkbox" checked={portalPermissions.organizerDocuments} onChange={e=>setPortalPermissions(p=>({...p,organizerDocuments:e.target.checked}))}/></label>
                  <label className="lp28-choice"><span className="ico">👥</span><span className="txt">Partage / QR invités<small>Organisateur : partage et QR code invités</small></span><input type="checkbox" checked={portalPermissions.organizerShare} onChange={e=>setPortalPermissions(p=>({...p,organizerShare:e.target.checked}))}/></label>
                  <label className="lp28-choice"><span className="ico">🎧</span><span className="txt">Assistance Mathis<small>Organisateur : assistance</small></span><input type="checkbox" checked={portalPermissions.organizerMathis} onChange={e=>setPortalPermissions(p=>({...p,organizerMathis:e.target.checked}))}/></label>
                  <label className="lp28-choice"><span className="ico">🖼️</span><span className="txt">Galerie invités<small>Invité : galerie</small></span><input type="checkbox" checked={portalPermissions.guestGallery} onChange={e=>setPortalPermissions(p=>({...p,guestGallery:e.target.checked}))}/></label>
                  <label className="lp28-choice"><span className="ico">🆘</span><span className="txt">Assistance invités<small>Invité : assistance Mathis</small></span><input type="checkbox" checked={portalPermissions.guestMathis} onChange={e=>setPortalPermissions(p=>({...p,guestMathis:e.target.checked}))}/></label>
                </div>
              </section>

              <section className="lp28-section lp28-personal">
                <div className="lp28-section-head"><div><h4>💎 Catalogues de personnalisation</h4><p>Permettez à l’organisateur de personnaliser ses cadres photos.</p></div><span className="lp28-paid">Option payante : 25 €</span></div>
                <label className="lp28-choice" style={{marginBottom:10}}><span className="ico">🎨</span><span className="txt">Activer les catalogues<small>Autorise l’accès aux catalogues de personnalisation</small></span><input type="checkbox" checked={portalPermissions.personalizationAccess===true} onChange={e=>setPortalPermissions(p=>({...p,personalizationAccess:e.target.checked}))}/></label>
                <div className="lp28-personal-grid">
                  <div className="lp28-catalog"><div className="lp28-catalog-top"><span className="ico">🎨</span><div><div className="lp28-catalog-title">Catalogue TemplatesBooth</div><div className="lp28-catalog-sub">Accès aux modèles TemplatesBooth</div></div><input type="checkbox" disabled={portalPermissions.personalizationAccess!==true} checked={portalPermissions.personalizationTemplatesBooth!==false} onChange={e=>setPortalPermissions(p=>({...p,personalizationTemplatesBooth:e.target.checked}))}/></div><button type="button" className="lp28-token" disabled={!form?.id||portalPermissions.personalizationAccess!==true} onClick={()=>renewPersonalizationLink("templates")}>🔑 Nouveau jeton TemplatesBooth</button></div>
                  <div className="lp28-catalog"><div className="lp28-catalog-top"><span className="ico">🏞️</span><div><div className="lp28-catalog-title">Catalogue BoothWidget</div><div className="lp28-catalog-sub">Accès aux modèles BoothWidget</div></div><input type="checkbox" disabled={portalPermissions.personalizationAccess!==true} checked={portalPermissions.personalizationBoothWidget!==false} onChange={e=>setPortalPermissions(p=>({...p,personalizationBoothWidget:e.target.checked}))}/></div><button type="button" className="lp28-token" disabled={!form?.id||portalPermissions.personalizationAccess!==true} onClick={()=>renewPersonalizationLink("boothwidget")}>🔑 Nouveau jeton BoothWidget</button></div>
                </div>
                {personalizationRenewMsg&&<div className="lp28-renew-msg">{personalizationRenewMsg}</div>}
              </section>

              <section className="lp28-section">
                <div className="lp28-section-head"><div><h4>⚙️ Options supplémentaires</h4><p>Paramètres additionnels du portail événement.</p></div></div>
                <div className="lp28-options">
                  <label className="lp28-choice lp28-option-card"><span className="ico">📷</span><span className="txt">Autoriser les photos invités<small>Permet aux invités d’ajouter des photos</small></span><input type="checkbox" checked={Boolean(form.guestUploadEnabled)} onChange={e=>set("guestUploadEnabled",e.target.checked)}/></label>
                  <label className="lp28-choice lp28-option-card"><span className="ico">🎥</span><span className="txt">Autoriser les vidéos invités<small>Permet aux invités d’ajouter des vidéos</small></span><input type="checkbox" checked={Boolean(form.guestVideoEnabled)} onChange={e=>set("guestVideoEnabled",e.target.checked)}/></label>
                  <label className="lp28-choice lp28-option-card"><span className="ico">🛡️</span><span className="txt">Modération avant publication<small>Optionnelle</small></span><input type="checkbox" checked={form.guestUploadModerated!==false} onChange={e=>set("guestUploadModerated",e.target.checked)}/></label>
                  <div className="lp28-field"><label>📅 Expiration de l’accès</label><input type="date" value={form.portalExpiresAt||""} onChange={e=>set("portalExpiresAt",e.target.value)}/><small>Laissez vide pour un accès sans limite de date.</small></div>
                  <div className="lp28-field"><label>🔒 Mot de passe (facultatif)</label><input value={form.portalPassword||""} onChange={e=>set("portalPassword",e.target.value)} placeholder="Mot de passe…"/><small>Optionnel : ajoutez un mot de passe pour sécuriser l’accès.</small></div>
                  <div className="lp28-field lp28-gallery-field"><label>🔗 Galerie Photos du Photobooth</label><input placeholder="https://fotoshare.co/..." value={form.fotoshareUrl||""} onChange={e=>set("fotoshareUrl",e.target.value)}/><small>Ce lien alimente le bouton « Photos Borne » du portail. Accès client prévu pendant 30 jours.</small></div>
                </div>
              </section>
            </>}
          </div>
        </div>
      </details>`;

app=app.slice(0,start)+block+app.slice(end);
fs.writeFileSync(appPath,app,"utf8");
console.log('[portal-full-redesign] OK: portail événement entièrement restructuré');
