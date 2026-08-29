const {
  PDFDocument,
  StandardFonts,
  rgb
} = require("pdf-lib");

const BUSINESS = {
  name: "Location Photobooth 28",
  address1: "20 Rue des Catalpas",
  address2: "28630 Thivars",
  phone: "07 56 83 21 85",
  email: "loc.photobooth.28@gmail.com"
};

const BOOTHS = {
  "Borne Photobooth Miroir Lola": {
    shortName: "Lola",
    title: "Photobooth Miroir Lola",
    estimatedValue: 8500,
    prices: {
      0: 200,
      100: 250,
      200: 300,
      300: 350,
      400: 400,
      700: 550
    }
  },

  "Borne Photobooth Nina": {
    shortName: "Nina",
    title: "Photobooth Nina",
    estimatedValue: 8500,
    prices: {
      0: 150,
      100: 200,
      200: 250,
      300: 300,
      400: 350,
      700: 500
    }
  },

  "Borne Photobooth Gabin": {
    shortName: "Gabin",
    title: "Photobooth Gabin",
    estimatedValue: 8500,
    prices: {
      0: 150,
      100: 200,
      200: 250,
      300: 300,
      400: 350,
      700: 500
    }
  }
};

const PRINT_NAMES = {
  "Forfait sans aucune impression": 0,
  "Forfait 100 impressions": 100,
  "Forfait 200 impressions": 200,
  "Forfait 300 impressions": 300,
  "Forfait 400 impressions": 400,
  "Forfait 700 impressions": 700
};

function money(value){
  if(value === null || value === undefined || value === ""){
    return "Non renseigné";
  }

  const n = Number(value);

  if(Number.isNaN(n)){
    return "Non renseigné";
  }

  return `${n.toFixed(2).replace(".", ",")} €`;
}

function dateFr(value){
  if(!value){
    return "Non renseignée";
  }

  const d = new Date(value);

  if(Number.isNaN(d.getTime())){
    return "Non renseignée";
  }

  return d.toLocaleDateString("fr-FR", {
    day:"2-digit",
    month:"2-digit",
    year:"numeric"
  });
}

function getMaterialNames(event){
  return (event.materials || [])
    .map(item => {
      if(typeof item === "string"){
        return item;
      }

      if(item.material?.name){
        return item.material.name;
      }

      if(item.name){
        return item.name;
      }

      return null;
    })
    .filter(Boolean);
}

function getBooths(event){
  const names = getMaterialNames(event);

  return names
    .filter(name => BOOTHS[name])
    .map(name => ({
      materialName:name,
      ...BOOTHS[name]
    }));
}

function getPrintPackage(event){
  const names = getMaterialNames(event);

  if(
    names.includes("Forfait impressions personnalisé") ||
    Number(event.customPrintCount || 0) > 0
  ){
    return {
      custom:true,
      count:Number(event.customPrintCount || 0),
      price:
        event.customPrintPrice != null
          ? Number(event.customPrintPrice)
          : null,
      label:`Forfait personnalisé - ${Number(event.customPrintCount || 0)} impressions`
    };
  }

  for(const [name,count] of Object.entries(PRINT_NAMES)){
    if(names.includes(name)){
      return {
        custom:false,
        count,
        price:null,
        label:
          count === 0
            ? "Location sans impression"
            : `${count} impressions`
      };
    }
  }

  return {
    custom:false,
    count:null,
    price:null,
    label:"Forfait d'impression non renseigné"
  };
}

function getOptions(event){
  const names = getMaterialNames(event);

  return names.filter(name =>
    !BOOTHS[name] &&
    !Object.prototype.hasOwnProperty.call(PRINT_NAMES,name) &&
    name !== "Forfait impressions personnalisé" &&
    name !== "Appareil photo Reflex Nikon D7200" &&
    name !== "Nikon D7200" &&
    name !== "Flash Godox" &&
    name !== "Parapluie" &&
    name !== "Flash + parapluie"
  );
}

function clientInfo(event){
  const client = event.client || {};

  let name = "";

  if(client.firstName || client.lastName){
    name = [
      client.firstName,
      client.lastName
    ]
      .filter(Boolean)
      .join(" ");
  }

  if(!name){
    name = event.organizerName || "Non renseigné";
  }

  return {
    name,
    address:
      client.address ||
      "Non renseignée",

    phone:
      client.phone ||
      event.organizerPhone ||
      "Non renseigné",

    email:
      client.email ||
      event.organizerEmail ||
      "Non renseigné"
  };
}

function wrapText(text,font,size,maxWidth){
  const words = String(text || "").split(/\s+/);
  const lines = [];

  let line = "";

  for(const word of words){
    const test = line
      ? `${line} ${word}`
      : word;

    const width = font.widthOfTextAtSize(test,size);

    if(width > maxWidth && line){
      lines.push(line);
      line = word;
    }else{
      line = test;
    }
  }

  if(line){
    lines.push(line);
  }

  return lines;
}


function signatureDateTimeFr(value){
  if(!value) return null;

  const d = new Date(value);
  if(Number.isNaN(d.getTime())) return null;

  return {
    date:d.toLocaleDateString("fr-FR",{
      day:"2-digit",
      month:"2-digit",
      year:"numeric",
      timeZone:"Europe/Paris"
    }),
    time:d.toLocaleTimeString("fr-FR",{
      hour:"2-digit",
      minute:"2-digit",
      second:"2-digit",
      timeZone:"Europe/Paris"
    })
  };
}

function signatureDataUrl(event){
  return (
    event.contractSignatureData ||
    event.contractSignatureDataUrl ||
    event.signatureDataUrl ||
    event.contractSignature ||
    event.signature ||
    null
  );
}

function signatureSignerName(event,client){
  return (
    event.contractSignerName ||
    event.signerName ||
    client.name ||
    "Non renseigné"
  );
}

function signatureSignerEmail(event,client){
  return (
    event.contractSignerEmail ||
    event.signerEmail ||
    client.email ||
    "Non renseigné"
  );
}

function signatureSignedAt(event){
  return (
    event.contractSignedAt ||
    event.signedAt ||
    null
  );
}

async function generateContractPdf(event){
  if(!event){
    throw new Error("Événement obligatoire pour générer le contrat.");
  }

  const pdfDoc = await PDFDocument.create();

  const font = await pdfDoc.embedFont(
    StandardFonts.Helvetica
  );

  const bold = await pdfDoc.embedFont(
    StandardFonts.HelveticaBold
  );

  const client = clientInfo(event);
  const booths = getBooths(event);
  const printPackage = getPrintPackage(event);
  const options = getOptions(event);

  const signedAtValue = signatureSignedAt(event);
  const signedAt = signatureDateTimeFr(signedAtValue);
  const signatureImage = signatureDataUrl(event);
  const signerName = signatureSignerName(event,client);
  const signerEmail = signatureSignerEmail(event,client);
  const contractIsSigned =
    event.contractStatus === "SIGNED" ||
    Boolean(signedAtValue && signatureImage);

  const pageWidth = 595.28;
  const pageHeight = 841.89;

  const margin = 45;
  const contentWidth = pageWidth - (margin * 2);

  let page;
  let y;

  function newPage(){
    page = pdfDoc.addPage([
      pageWidth,
      pageHeight
    ]);

    y = pageHeight - 45;

    return page;
  }

  function ensureSpace(height=40){
    if(y - height < 45){
      newPage();
    }
  }

  function drawText(text,{
    size=10,
    fontUsed=font,
    indent=0,
    gapAfter=4,
    lineHeight=null
  }={}){
    const actualLineHeight =
      lineHeight || size + 4;

    const maxWidth =
      contentWidth - indent;

    const lines = wrapText(
      text,
      fontUsed,
      size,
      maxWidth
    );

    ensureSpace(
      (lines.length * actualLineHeight) +
      gapAfter
    );

    for(const line of lines){
      page.drawText(line,{
        x:margin + indent,
        y,
        size,
        font:fontUsed,
        color:rgb(0.12,0.12,0.12)
      });

      y -= actualLineHeight;
    }

    y -= gapAfter;
  }

  function title(text){
    ensureSpace(35);

    drawText(text,{
      size:15,
      fontUsed:bold,
      gapAfter:8
    });
  }

  function section(number,text){
    ensureSpace(30);

    drawText(
      `${number}. ${text}`,
      {
        size:12,
        fontUsed:bold,
        gapAfter:7
      }
    );
  }

  function bullet(text){
    drawText(
      `• ${text}`,
      {
        size:10,
        indent:10,
        gapAfter:2
      }
    );
  }

  function separator(){
    ensureSpace(15);

    page.drawLine({
      start:{
        x:margin,
        y:y
      },
      end:{
        x:pageWidth-margin,
        y:y
      },
      thickness:0.7,
      color:rgb(0.75,0.65,0.30)
    });

    y -= 14;
  }

  // PAGE 1
  newPage();

  page.drawText(
    BUSINESS.name,
    {
      x:margin,
      y,
      size:18,
      font:bold,
      color:rgb(0.72,0.55,0.12)
    }
  );

  y -= 24;

  drawText(BUSINESS.address1,{size:9,gapAfter:1});
  drawText(BUSINESS.address2,{size:9,gapAfter:1});
  drawText(`Tél : ${BUSINESS.phone}`,{size:9,gapAfter:1});
  drawText(`E-mail : ${BUSINESS.email}`,{size:9,gapAfter:10});

  separator();

  drawText(
    "CONTRAT DE LOCATION",
    {
      size:20,
      fontUsed:bold,
      gapAfter:4
    }
  );

  drawText(
    event.name || "Prestation Location Photobooth 28",
    {
      size:12,
      fontUsed:bold,
      gapAfter:14
    }
  );

  title("Coordonnées du locataire");

  drawText(`Nom / Prénom : ${client.name}`);
  drawText(`Adresse : ${client.address}`);
  drawText(`Téléphone : ${client.phone}`);
  drawText(`E-mail : ${client.email}`);

  title("Informations de la prestation");

  drawText(`Type : ${event.type || "Non renseigné"}`);
  drawText(`Lieu : ${event.address || "Non renseigné"}`);
  drawText(`Date : ${dateFr(event.eventDate)}`);
  drawText(
    `Installation : ${event.installTime || "Non renseignée"}`
  );

  drawText(
    `Reprise : ${
      event.pickupDate
        ? dateFr(event.pickupDate)
        : dateFr(event.eventDate)
    } ${
      event.pickupTime || ""
    }`
  );

  separator();

  section(1,"Désignation du matériel loué");

  if(booths.length){
    for(const booth of booths){
      bullet(`Borne Photobooth ${booth.shortName}`);
    }
  }else{
    bullet("Borne photobooth : non renseignée");
  }

  bullet("Appareil photo Reflex Nikon D7200");
  bullet("Flash et équipement d'éclairage");
  bullet("Câbles et alimentation nécessaires au fonctionnement");

  if(options.length){
    drawText(
      "Options / matériel complémentaires :",
      {
        fontUsed:bold,
        gapAfter:4
      }
    );

    for(const option of options){
      bullet(option);
    }
  }

  if(booths.length === 1){
    drawText(
      `Valeur estimée de la borne : ${money(booths[0].estimatedValue)}`,
      {
        fontUsed:bold,
        gapAfter:10
      }
    );
  }

  section(2,"État du matériel");

  drawText(
    "Le matériel est remis en bon état de fonctionnement. Le locataire reconnaît avoir pris connaissance des consignes d'utilisation et s'engage à signaler immédiatement toute anomalie constatée."
  );

  section(3,"Conditions de location");

  drawText(
    `Le matériel est loué du ${dateFr(event.eventDate)} au ${
      event.pickupDate
        ? dateFr(event.pickupDate)
        : dateFr(event.eventDate)
    }.`
  );

  drawText(
    `Forfait sélectionné : ${printPackage.label}.`,
    {
      fontUsed:bold
    }
  );

  if(printPackage.custom){
    drawText(
      `Tarif du forfait personnalisé : ${
        money(printPackage.price)
      }.`
    );
  }else if(
    booths.length === 1 &&
    printPackage.count !== null
  ){
    const cataloguePrice =
      booths[0].prices[printPackage.count];

    if(cataloguePrice !== undefined){
      drawText(
        `Tarif catalogue correspondant : ${money(cataloguePrice)}.`
      );
    }
  }

  drawText(
    `Montant total de la prestation : ${money(event.totalPrice)}.`,
    {
      size:11,
      fontUsed:bold,
      gapAfter:6
    }
  );

  drawText(
    "Le montant total enregistré dans la prestation prévaut sur les tarifs catalogue en cas de remise, offre commerciale, prestation professionnelle ou conditions particulières."
  );

  const travel = event.preparation && typeof event.preparation === "object"
    ? event.preparation
    : {};
  const travelDistance = Math.max(Number(travel.travelDistanceKm || 0), 0);
  const travelFreeKm = travel.travelFree15 ? 15 : 0;
  const travelRate = 0.50;
  const travelFee = Math.max(travelDistance - travelFreeKm, 0) * travelRate;

  if(travelDistance > 0){
    drawText(
      `Frais de déplacement : ${money(travelFee)}${travel.travelFree15 ? " (15 km offerts appliqués)" : ""}.`,
      { fontUsed:bold }
    );
  }

  // PAGE 2+
  section(4,"Règlement et dépôt de garantie");

  drawText(
    `Acompte : ${money(event.deposit)}.`
  );

  drawText(
    `Solde restant : ${
      event.balancePaid
        ? "Prestation réglée"
        : money(event.balance)
    }.`
  );

  drawText(
    "Le règlement total de la prestation est exigible au plus tard lors de la livraison et de l'installation du matériel, sauf conditions particulières prévues au devis."
  );

  drawText(
    "Un dépôt de garantie peut être demandé en fonction du matériel confié. Pour une borne photobooth, le dépôt de garantie de référence est de 4 500 €. Il n'est pas encaissé pendant la durée normale de la location."
  );

  drawText(
    "Le dépôt de garantie pourra être encaissé notamment en cas de dégradation, perte, vol, non-restitution ou manquement contractuel."
  );

  drawText(
    "Le dépôt de garantie est restitué après vérification du bon état du matériel lors de sa reprise."
  );

  section(5,"Forfait d'impression");

  drawText(
    "Le forfait d'impression sélectionné est défini lors de la réservation ou du devis."
  );

  drawText(
    "Les impressions incluses sont valables uniquement pendant la durée de la prestation."
  );

  drawText(
    "Toute impression non utilisée à l'issue de la location est considérée comme consommée et ne peut donner lieu à aucun remboursement, report ou compensation."
  );

  if(printPackage.count !== null){
    drawText(
      `Quantité prévue pour cette prestation : ${printPackage.count} impression(s).`,
      {
        fontUsed:bold
      }
    );
  }

  section(6,"Obligations du locataire");

  bullet(
    "Utiliser le matériel uniquement pour sa destination prévue."
  );

  bullet(
    "Ne pas démonter, modifier ou intervenir techniquement sur le matériel."
  );

  bullet(
    "Restituer le matériel propre et en bon état de fonctionnement."
  );

  bullet(
    "Assumer la responsabilité des dommages survenus pendant la période de location."
  );

  bullet(
    "Ne pas sous-louer ou céder le matériel à un tiers sans accord du loueur."
  );

  bullet(
    "Disposer d'une assurance responsabilité civile couvrant l'utilisation du matériel."
  );

  section(7,"Responsabilité");

  drawText(
    "Le locataire est responsable du matériel pendant toute la durée de la location."
  );

  drawText(
    "Le loueur ne pourra être tenu responsable des dommages résultant d'une mauvaise utilisation du matériel."
  );

  drawText(
    "Le loueur reste responsable en cas de défaut technique non imputable au locataire."
  );

  section(8,"Litiges");

  drawText(
    "En cas de litige, les parties s'engagent à rechercher en priorité une solution amiable."
  );

  drawText(
    "À défaut d'accord amiable, les juridictions compétentes seront déterminées conformément aux règles légales applicables."
  );

  section(9,"Acceptation");

  drawText(
    "Le locataire déclare avoir pris connaissance du présent contrat et accepter sans réserve l'ensemble de ses conditions."
  );

  y -= 12;

  if(contractIsSigned){
    ensureSpace(235);

    drawText(
      "CONTRAT SIGNÉ ÉLECTRONIQUEMENT",
      {
        size:12,
        fontUsed:bold,
        gapAfter:8
      }
    );

    drawText(
      `Signataire : ${signerName}`,
      {
        size:10,
        gapAfter:3
      }
    );

    drawText(
      `E-mail : ${signerEmail}`,
      {
        size:10,
        gapAfter:3
      }
    );

    if(signedAt){
      drawText(
        `Signé le ${signedAt.date} à ${signedAt.time} (heure de Paris)`,
        {
          size:10,
          fontUsed:bold,
          gapAfter:5
        }
      );
    }

    drawText(
      "Mention : Lu et approuvé",
      {
        size:10,
        gapAfter:10
      }
    );

    const boxHeight=105;

    ensureSpace(boxHeight + 25);

    page.drawRectangle({
      x:margin,
      y:y-boxHeight,
      width:contentWidth,
      height:boxHeight,
      borderWidth:1,
      borderColor:rgb(0.6,0.6,0.6)
    });

    if(signatureImage){
      try{
        const match=String(signatureImage).match(
          /^data:image\/(png|jpe?g);base64,(.+)$/i
        );

        if(match){
          const imageBytes=Buffer.from(match[2],"base64");

          const embeddedSignature=
            match[1].toLowerCase()==="png"
              ? await pdfDoc.embedPng(imageBytes)
              : await pdfDoc.embedJpg(imageBytes);

          const maxWidth=contentWidth-30;
          const maxHeight=boxHeight-20;

          const natural=embeddedSignature.scale(1);

          const scale=Math.min(
            maxWidth/natural.width,
            maxHeight/natural.height,
            1
          );

          const width=natural.width*scale;
          const height=natural.height*scale;

          page.drawImage(embeddedSignature,{
            x:margin+(contentWidth-width)/2,
            y:y-boxHeight+(boxHeight-height)/2,
            width,
            height
          });
        }else{
          page.drawText(
            "Signature électronique enregistrée",
            {
              x:margin+15,
              y:y-55,
              size:10,
              font:bold,
              color:rgb(0.12,0.12,0.12)
            }
          );
        }
      }catch(err){
        console.error(
          "Impossible d'intégrer l'image de signature dans le contrat PDF :",
          err
        );

        page.drawText(
          "Signature électronique enregistrée",
          {
            x:margin+15,
            y:y-55,
            size:10,
            font:bold,
            color:rgb(0.12,0.12,0.12)
          }
        );
      }
    }

    y -= boxHeight + 18;

    drawText(
      "La date et l'heure ci-dessus correspondent à l'horodatage enregistré lors de la signature électronique.",
      {
        size:8,
        gapAfter:14
      }
    );
  }else{
    drawText(
      `Fait à : ______________________________`,
      {
        gapAfter:8
      }
    );

    drawText(
      `Le : ____ / ____ / ______`,
      {
        gapAfter:16
      }
    );

    ensureSpace(130);

    drawText(
      "Pour le locataire",
      {
        fontUsed:bold,
        gapAfter:4
      }
    );

    drawText(
      "Nom, prénom et signature précédés de la mention « Lu et approuvé » :",
      {
        size:9,
        gapAfter:35
      }
    );

    page.drawRectangle({
      x:margin,
      y:y-45,
      width:contentWidth,
      height:70,
      borderWidth:1,
      borderColor:rgb(0.6,0.6,0.6)
    });

    y -= 65;
  }

  drawText(
    "Pour le propriétaire : Location Photobooth 28",
    {
      fontUsed:bold,
      gapAfter:4
    }
  );

  drawText(BUSINESS.address1,{size:9,gapAfter:1});
  drawText(BUSINESS.address2,{size:9,gapAfter:1});
  drawText(BUSINESS.email,{size:9,gapAfter:1});

  const bytes = await pdfDoc.save();

  return Buffer.from(bytes);
}

module.exports = {
  generateContractPdf,
  BOOTHS,
  PRINT_NAMES
};