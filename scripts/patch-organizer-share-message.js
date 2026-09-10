const fs=require('fs');
const path=require('path');

const file=path.join(process.cwd(),'client','src','App.jsx');
let src=fs.readFileSync(file,'utf8');

const old=`  const ficheUrl=share.organizerUrl||share.guestUrl||window.location.href;\n  const ficheText=[\n    \`📸 Location Photobooth 28\`,\n    \`📅 \${event.name}\`,\n    \`Date : \${eventDate}\`,\n    event.time?\`Heure : \${event.time}\`:null,\n    event.address?\`Lieu : \${event.address}\`:null,\n    \`Fiche événement : \${ficheUrl}\`\n  ].filter(Boolean).join("\\n");\n  const whatsapp=\`https://wa.me/?text=\${encodeURIComponent(ficheText)}\`;`;

const replacement=`  const ficheUrl=share.organizerUrl||share.guestUrl||window.location.href;\n  const ficheText=[\n    \`Bonjour 😊\`,\n    \`\`,\n    \`Voici votre lien personnel LP28 Organisateur pour votre événement 📸\`,\n    \`\`,\n    \`Grâce à ce lien, vous pourrez :\`,\n    \`\`,\n    \`📅 Retrouver les informations de votre événement\`,\n    \`📸 Accéder à votre galerie photos\`,\n    \`✅ Sélectionner une ou plusieurs photos\`,\n    \`⬇️ Télécharger vos photos directement\`,\n    \`📲 Partager l'accès à la galerie avec vos invités\`,\n    \`🆘 Accéder rapidement à l’assistance LP28 en cas de besoin\`,\n    \`\`,\n    \`🔐 Ce lien est votre accès Organisateur, je vous conseille donc de le conserver jusqu’à la fin de votre événement.\`,\n    \`\`,\n    \`Tout est regroupé au même endroit pour vous simplifier la gestion de votre prestation 😊\`,\n    \`\`,\n    \`🔗 Votre lien Organisateur :\`,\n    ficheUrl,\n    \`\`,\n    \`Location Photobooth 28\`\n  ].join("\\n");\n  const whatsapp=\`https://wa.me/?text=\${encodeURIComponent(ficheText)}\`;`;

if(!src.includes(old)){
  console.error('[organizer-share-message] ShareModal message pattern missing');
  process.exit(1);
}
src=src.replace(old,replacement);

src=src.replace('{copied?"✅ Fiche copiée":"🔗 Copier la fiche"}','{copied?"✅ Message copié":"📋 Copier le message"}');
src=src.replace('>💬 WhatsApp</a>','>💬 Partager sur WhatsApp</a>');

fs.writeFileSync(file,src,'utf8');
console.log('[organizer-share-message] OK: organizer message + organizer link for WhatsApp/copy');
