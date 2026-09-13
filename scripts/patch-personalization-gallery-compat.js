const fs=require('fs');

const serverPath='server.js';
let server=fs.readFileSync(serverPath,'utf8');

const marker='LP28_PERSONALIZATION_GALLERY_COMPAT_V1';
if(server.includes(marker)||server.includes('personalizationAccess:savedPortal.personalizationAccess')){
  console.log('[personalization-gallery-compat] déjà compatible');
  process.exit(0);
}

const oldLine='const portalPermissions={organizerContract:savedPortal.organizerContract!==false,organizerDocuments:savedPortal.organizerDocuments!==false,organizerShare:savedPortal.organizerShare!==false,organizerMathis:savedPortal.organizerMathis!==false,guestGallery:savedPortal.guestGallery!==false,guestMathis:savedPortal.guestMathis!==false,guestPhotoboothOpen:organizerGuestAccess.photoboothOpen!==false,guestQrGalleryOpen:organizerGuestAccess.qrGalleryOpen!==false};';

const newLine=`/* ${marker} */\n    const portalPermissions={organizerContract:savedPortal.organizerContract!==false,organizerDocuments:savedPortal.organizerDocuments!==false,organizerShare:savedPortal.organizerShare!==false,organizerMathis:savedPortal.organizerMathis!==false,guestGallery:savedPortal.guestGallery!==false,guestMathis:savedPortal.guestMathis!==false,guestPhotoboothOpen:organizerGuestAccess.photoboothOpen!==false,guestQrGalleryOpen:organizerGuestAccess.qrGalleryOpen!==false,personalizationAccess:savedPortal.personalizationAccess===true,personalizationTemplatesBooth:savedPortal.personalizationTemplatesBooth!==false,personalizationBoothWidget:savedPortal.personalizationBoothWidget!==false};`;

if(!server.includes(oldLine)){
  throw new Error('[personalization-gallery-compat] portalPermissions issu du verrouillage galeries introuvable');
}

server=server.split(oldLine).join(newLine);
fs.writeFileSync(serverPath,server,'utf8');
console.log('[personalization-gallery-compat] OK : permissions galeries + personnalisation fusionnées');
