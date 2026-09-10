const fs=require('fs');
const path=require('path');

const file=path.join(process.cwd(),'client','src','App.jsx');
let src=fs.readFileSync(file,'utf8');

const old=`  const ficheUrl=share.organizerUrl||share.guestUrl||window.location.href;\n  const ficheText=[\n    \`📸 Location Photobooth 28\`,\n    \`📅 \${event.name}\`,\n    \`Date : \${eventDate}\`,\n    event.time?\`Heure : \${event.time}\`:null,\n    event.address?\`Lieu : \${event.address}\`:null,\n    \`Fiche événement : \${ficheUrl}\`\n  ].filter(Boolean).join("\\n");\n  const whatsapp=\`https://wa.me/?text=\${encodeURIComponent(ficheText)}\`;`;

const replacement=`  const ficheUrl=share.organizerUrl||share.guestUrl||window.location.href;\n  const ficheText=[\n    \`Bonjour \\u{1F60A}\`,\n    \`\`,\n    \`Voici votre lien personnel de notre application Location Photobooth 28 pour votre événement \\u{1F4F8}\`,\n    \`\`,\n    \`Grâce à ce lien, vous pourrez :\`,\n    \`\`,\n    \`\\u{1F4C5} Retrouver les informations de votre événement\`,\n    \`\\u{1F4F8} Accéder à votre galerie photos\`,\n    \`\\u{2705} Sélectionner une ou plusieurs photos\`,\n    \`\\u{2B07}\\u{FE0F} Télécharger vos photos directement\`,\n    \`\\u{1F4F2} Partager l'accès à la galerie avec vos invités\`,\n    \`\\u{1F198} Accéder rapidement à l’assistance LP28 en cas de besoin\`,\n    \`\`,\n    \`\\u{1F510} Ce lien est votre accès Organisateur, je vous conseille donc de le conserver jusqu’à la fin de votre événement.\`,\n    \`\`,\n    \`Tout est regroupé au même endroit pour vous simplifier la gestion de votre prestation \\u{1F60A}\`,\n    \`\`,\n    \`\\u{1F517} Votre lien Organisateur :\`,\n    ficheUrl,\n    \`\`,\n    \`Location Photobooth 28\`\n  ].join("\\n");\n  const whatsapp=\`https://wa.me/?text=\${encodeURIComponent(ficheText)}\`;`;

if(!src.includes(old)){
  console.error('[organizer-share-message] ShareModal message pattern missing');
  process.exit(1);
}
src=src.replace(old,replacement);

src=src.replace('{copied?"✅ Fiche copiée":"🔗 Copier la fiche"}','{copied?"✅ Message copié":"📋 Copier le message"}');
src=src.replace('>💬 WhatsApp</a>','>💬 Partager sur WhatsApp</a>');

fs.writeFileSync(file,src,'utf8');
console.log('[organizer-share-message] OK: organizer message uses unicode escapes for WhatsApp emojis');
