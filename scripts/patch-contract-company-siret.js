const fs=require('fs');
const path=require('path');

// ----- Contrat PDF -----
const contractFile=path.join(process.cwd(),'services','contractService.js');
let contract=fs.readFileSync(contractFile,'utf8');

const clientReturnOld=`  return {\n    name,\n    address:\n      client.address ||\n      "Non renseignée",\n\n    phone:\n      client.phone ||\n      event.organizerPhone ||\n      "Non renseigné",\n\n    email:\n      client.email ||\n      event.organizerEmail ||\n      "Non renseigné"\n  };`;

const clientReturnNew=`  const preparation = event.preparation && typeof event.preparation === "object"\n    ? event.preparation\n    : {};\n\n  return {\n    name,\n    address:\n      client.address ||\n      "Non renseignée",\n\n    phone:\n      client.phone ||\n      event.organizerPhone ||\n      "Non renseigné",\n\n    email:\n      client.email ||\n      event.organizerEmail ||\n      "Non renseigné",\n\n    firstName: String(preparation.clientFirstName || "").trim(),\n    establishment: String(preparation.clientEstablishment || "").trim(),\n    legalName: String(preparation.clientLegalName || "").trim(),\n    siret: String(preparation.clientSiret || "").replace(/\\D/g, ""),\n    siren: String(preparation.clientSiren || "").replace(/\\D/g, ""),\n    establishmentAddress: String(preparation.clientEstablishmentAddress || "").trim(),\n    siretVerified: preparation.clientSiretVerified === true\n  };`;

if(!contract.includes(clientReturnOld)){
  console.error('[contract-company-siret] clientInfo block not found');
  process.exit(1);
}
contract=contract.replace(clientReturnOld,clientReturnNew);

const coordinatesOld=`  drawText(\`Nom / Prénom : \${client.name}\`);\n  drawText(\`Adresse : \${client.address}\`);\n  drawText(\`Téléphone : \${client.phone}\`);\n  drawText(\`E-mail : \${client.email}\`);`;

const coordinatesNew=`  const displayedClientName = client.firstName\n    ? [event.organizerName || client.name, client.firstName].filter(Boolean).join(" ")\n    : client.name;\n\n  const isProfessionalClient = Boolean(client.establishment || client.legalName || client.siret);\n\n  if(isProfessionalClient){\n    drawText(client.establishment || client.legalName || "Établissement non renseigné",{fontUsed:bold});\n\n    if(client.legalName && client.legalName !== client.establishment){\n      drawText(\`Raison sociale : \${client.legalName}\`);\n    }\n\n    if(client.siret){\n      const formattedSiret = client.siret.replace(/(\\d{3})(?=\\d)/g,"$1 ").trim();\n      drawText(\`SIRET : \${formattedSiret}\`);\n    }\n\n    if(client.establishmentAddress){\n      drawText(client.establishmentAddress);\n    }\n\n    if(displayedClientName && displayedClientName !== "Non renseigné"){\n      drawText(\`Représenté par : \${displayedClientName}\`,{fontUsed:bold});\n    }\n\n    drawText(\`Téléphone : \${client.phone}\`);\n    drawText(\`E-mail : \${client.email}\`);\n  }else{\n    drawText(\`Nom / Prénom : \${displayedClientName}\`);\n    drawText(\`Adresse : \${client.address}\`);\n    drawText(\`Téléphone : \${client.phone}\`);\n    drawText(\`E-mail : \${client.email}\`);\n  }`;

if(!contract.includes(coordinatesOld)){
  console.error('[contract-company-siret] contract coordinates block not found');
  process.exit(1);
}
contract=contract.replace(coordinatesOld,coordinatesNew);
fs.writeFileSync(contractFile,contract,'utf8');

// ----- Empreinte du contrat -----
// Les données entreprise doivent invalider l'ancien lien de signature si elles changent.
const serverFile=path.join(process.cwd(),'server.js');
let server=fs.readFileSync(serverFile,'utf8');
const hashAnchor=`    framePrice: event.preparation?.framePrice != null\n      ? String(event.preparation.framePrice)\n      : null,`;
const hashReplacement=`    framePrice: event.preparation?.framePrice != null\n      ? String(event.preparation.framePrice)\n      : null,\n\n    clientIdentity: {\n      firstName: event.preparation?.clientFirstName || null,\n      establishment: event.preparation?.clientEstablishment || null,\n      legalName: event.preparation?.clientLegalName || null,\n      siret: event.preparation?.clientSiret || null,\n      siren: event.preparation?.clientSiren || null,\n      establishmentAddress: event.preparation?.clientEstablishmentAddress || null\n    },`;

if(!server.includes(hashAnchor)){
  console.error('[contract-company-siret] contractHash anchor not found');
  process.exit(1);
}
server=server.replace(hashAnchor,hashReplacement);
fs.writeFileSync(serverFile,server,'utf8');

console.log('[contract-company-siret] OK: bloc locataire pro clarifié + SIRET formaté + particulier inchangé');
