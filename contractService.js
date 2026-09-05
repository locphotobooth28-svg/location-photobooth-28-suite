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

function getFramePricing(event){
  const source = String(event.frameSource || "NONE").toUpperCase();
  const preparation =
    event.preparation && typeof event.preparation === "object"
      ? event.preparation
      : {};

  const pricing = String(
    preparation.framePricing ||
    event.framePricing ||
    ""
  ).toUpperCase();

  const rawFramePrice =
    preparation.framePrice !== undefined &&
    preparation.framePrice !== null &&
    preparation.framePrice !== ""
      ? preparation.framePrice
      : event.framePrice;

  const rawPrice = Number(rawFramePrice);

  if(source === "CLIENT"){
    return {
      source:"CLIENT",
      label:"Cadre photo fourni par le client",
      price:0,
      priceLabel:"Gratuit"
    };
  }

  if(source === "LP28"){
    if(pricing === "OFFERED"){
      return {
        source:"LP28",
        label:"Création du cadre photo par Location Photobooth 28",
        price:0,
        priceLabel:"Offert"
      };
    }

    const price = Number.isFinite(rawPrice) && rawPrice >= 0 ? rawPrice : 25;

    return {
      source:"LP28",
      label:"Création du cadre photo par Location Photobooth 28",
      price,
      priceLabel:money(price)
    };
  }

  return {
    source:"NONE",
    label:"Cadre photo non renseigné",
    price:0,
    priceLabel:"Non renseigné"
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
  const framePricing = getFramePricing(event);

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
    size=9.5,
    fontUsed=font,
    indent=0,
    gapAfter=5,
    lineHeight=null
  }={}){
    const actualLineHeight =
      lineHeight || Math.round(size * 1.28 * 10) / 10;

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

  // Hiérarchie typographique harmonisée : 4 niveaux seulement.
  function title(text){
    ensureSpace(38);
    y -= 5;
    drawText(text,{
      size:14,
      fontUsed:bold,
      gapAfter:10,
      lineHeight:17
    });
  }

  function section(number,text){
    ensureSpace(34);
    y -= 7;
    drawText(
      `${number}. ${text}`,
      {
        size:11.5,
        fontUsed:bold,
        gapAfter:8,
        lineHeight:14
      }
    );
  }

  function bullet(text){
    drawText(
      `• ${text}`,
      {
        size:9.5,
        indent:10,
        gapAfter:3,
        lineHeight:12
      }
    );
  }

  function separator(gapAfter=14){
    ensureSpace(gapAfter + 1);

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

    y -= gapAfter;
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

  drawText(BUSINESS.address1,{size:8.5,gapAfter:0,lineHeight:11});
  drawText(BUSINESS.address2,{size:8.5,gapAfter:0,lineHeight:11});
  drawText(`Tél : ${BUSINESS.phone}`,{size:8.5,gapAfter:0,lineHeight:11});
  drawText(`E-mail : ${BUSINESS.email}`,{size:8.5,gapAfter:12,lineHeight:11});

  // En-tête du contrat : titre encadré par deux filets dorés.
  // Cela évite l'effet de trait collé au texte observé sur l'ancien modèle.
  // Espace renforcé sous le filet supérieur : le trait ne touche plus le titre.
  separator(20);

  drawText(
    "CONTRAT DE LOCATION",
    {
      size:19,
      fontUsed:bold,
      gapAfter:11,
      lineHeight:22
    }
  );

  separator(16);

  drawText(
    event.name || "Prestation Location Photobooth 28",
    {
      size:11.5,
      fontUsed:bold,
      gapAfter:16,
      lineHeight:14
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

  if(framePricing.source !== "NONE"){
    bullet(`${framePricing.label} — ${framePricing.priceLabel}`);
  }

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

  if(framePricing.source !== "NONE"){
    drawText(
      `Cadre photo : ${framePricing.label} — ${framePricing.priceLabel}.`,
      { fontUsed:bold, gapAfter:5 }
    );
  }

  const specialNeed = event.preparation && typeof event.preparation === "object"
    ? event.preparation
    : {};
  const specialNeedDescription = String(specialNeed.specialNeedDescription || "").trim();
  const specialNeedPriceRaw = specialNeed.specialNeedPrice;
  const specialNeedHasPrice = specialNeedPriceRaw !== undefined && specialNeedPriceRaw !== null && specialNeedPriceRaw !== "";
  const specialNeedPrice = Math.max(Number(specialNeedPriceRaw || 0), 0);

  if(specialNeedDescription){
    drawText(
      `Besoin particulier : ${specialNeedDescription}${specialNeedHasPrice ? ` — ${specialNeedPrice > 0 ? money(specialNeedPrice) : "Offert"}` : ""}.`,
      { fontUsed:bold, gapAfter:5 }
    );
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

  section(9,"Conclusion du contrat et droit de rétractation");

  drawText(
    "La réservation devient ferme à la première des dates suivantes : signature ou acceptation du devis, ou paiement de l'acompte lorsque celui-ci vaut acceptation du devis. Cette date constitue la date de conclusion du contrat."
  );

  drawText(
    "Lorsqu'il agit en qualité de consommateur et que le contrat est conclu à distance ou hors établissement, le locataire dispose, sauf exception légale, d'un délai de quatorze (14) jours à compter de la conclusion du contrat pour exercer son droit de rétractation, sans avoir à motiver sa décision."
  );

  drawText(
    "La rétractation peut être exercée au moyen d'une déclaration dénuée d'ambiguïté adressée à Location Photobooth 28, notamment par e-mail à l'adresse indiquée en tête du présent contrat. Le consommateur peut également utiliser le formulaire type de rétractation figurant à la fin du contrat."
  );

  drawText(
    "Lorsque le consommateur demande que l'exécution de la prestation commence avant l'expiration du délai de rétractation, cette exécution anticipée nécessite sa demande expresse. S'il se rétracte après le commencement de l'exécution demandé expressément, il reste redevable du montant correspondant aux prestations effectivement fournies jusqu'à la communication de sa décision, calculé proportionnellement au prix convenu."
  );

  drawText(
    "Lorsque la prestation a été entièrement exécutée avant la fin du délai de rétractation, après demande expresse du consommateur et reconnaissance de la perte de son droit de rétractation après exécution complète, le droit de rétractation ne peut plus être exercé."
  );

  section(10,"Annulation, report et force majeure");

  drawText(
    "Toute demande d'annulation ou de report doit être adressée au loueur par écrit. Les sommes éventuellement dues ou remboursables sont déterminées selon le devis accepté, les prestations déjà exécutées, les dépenses engagées et les dispositions légales applicables."
  );

  drawText(
    "En cas de force majeure au sens de l'article 1218 du Code civil empêchant temporairement ou définitivement l'exécution de la prestation, les parties recherchent prioritairement une solution de report. Lorsque l'empêchement est définitif, les conséquences sont déterminées conformément aux dispositions légales applicables."
  );

  section(11,"Panne, alimentation et conditions techniques");

  drawText(
    "Le loueur s'engage à fournir un matériel en état de fonctionnement et à mettre en œuvre les moyens raisonnables permettant l'exécution de la prestation. En cas de panne technique non imputable au locataire, le loueur intervient dans la mesure du possible afin de rétablir le service ou de proposer une solution de remplacement."
  );

  drawText(
    "Le locataire doit mettre à disposition une alimentation électrique conforme, stable et accessible ainsi qu'un emplacement adapté, sécurisé et protégé des intempéries. Une connexion Internet peut être nécessaire pour certaines fonctions en ligne ; son indisponibilité n'empêche pas nécessairement le fonctionnement local de la borne lorsque celui-ci est possible."
  );

  drawText(
    "Aucune limitation de responsabilité prévue au présent contrat ne saurait priver le consommateur des droits et garanties impératifs prévus par la loi."
  );

  section(12,"Données personnelles et galerie photo");

  drawText(
    "Les données personnelles nécessaires à la réservation, à l'exécution de la prestation, à la facturation et à la gestion du contrat sont traitées par Location Photobooth 28 pour ces finalités. Les photographies et médias éventuellement déposés ou générés dans la galerie de l'événement sont utilisés pour fournir le service convenu et sont accessibles selon les modalités communiquées pour l'événement."
  );

  drawText(
    "Les personnes concernées peuvent demander l'accès, la rectification ou, lorsque les conditions légales sont réunies, l'effacement de leurs données en contactant Location Photobooth 28 à l'adresse e-mail indiquée en tête du contrat. Les durées de conservation applicables tiennent compte de la durée nécessaire au service ainsi que des obligations légales de conservation."
  );

  section(13,"Droit à l'image et utilisation des photographies");

  drawText(
    "Dans le cadre d'un événement privé ou professionnel dont l'accès est réservé aux participants, les photographies réalisées par le photobooth sont destinées à l'usage de l'organisateur et des participants. Location Photobooth 28 assure la fourniture du service, le traitement technique et, le cas échéant, la mise à disposition temporaire des photographies dans la galerie associée à l'événement."
  );

  drawText(
    "Sauf autorisation spécifique des personnes concernées, Location Photobooth 28 n'utilise pas ces photographies à des fins publicitaires, commerciales ou de communication sur ses réseaux sociaux, son site Internet ou tout autre support."
  );

  drawText(
    "Lorsque l'événement prévoit une utilisation ou une diffusion publique des photographies, notamment sur les réseaux sociaux, un site Internet ou des supports de communication de l'organisateur ou de Location Photobooth 28, le consentement des personnes concernées pourra être recueilli directement par l'intermédiaire du photobooth avant la prise de vue. Ce consentement précise les utilisations autorisées et leur destination."
  );

  drawText(
    "L'autorisation donnée à l'organisateur et l'autorisation donnée à Location Photobooth 28 sont distinctes. Une personne peut accepter la prise de vue sans autoriser l'utilisation de son image à des fins de communication ou de promotion. Pour les personnes mineures, toute utilisation de leur image nécessitant une autorisation est soumise aux autorisations requises de leurs représentants légaux."
  );

  drawText(
    "L'organisateur demeure responsable des utilisations et diffusions des photographies qu'il effectue après leur remise ou leur téléchargement. Les présentes dispositions ne portent pas atteinte aux droits des personnes photographiées concernant leur image et leurs données personnelles."
  );

  section(14,"Médiation de la consommation et litiges");

  drawText(
    "En cas de réclamation, le locataire est invité à contacter en priorité Location Photobooth 28 afin de rechercher une solution amiable."
  );

  drawText(
    "Lorsqu'il agit en qualité de consommateur, le locataire peut, après une réclamation écrite préalable restée sans solution satisfaisante, recourir gratuitement au médiateur de la consommation dont relève Location Photobooth 28. Les coordonnées et le site Internet du médiateur désigné seront indiqués dans le présent contrat dès confirmation de l'organisme compétent et de l'adhésion de Location Photobooth 28 à son dispositif."
  );

  drawText(
    "À défaut d'accord amiable ou de médiation, les juridictions compétentes sont déterminées conformément aux règles légales applicables."
  );

  section(15,"Acceptation");

  drawText(
    "Le locataire déclare avoir pris connaissance du présent contrat, des caractéristiques essentielles de la prestation, de son prix et des conditions applicables, et accepter l'ensemble de ses stipulations."
  );

  // Formulaire de rétractation consommateur
  ensureSpace(250);
  y -= 8;
  drawText("FORMULAIRE TYPE DE RÉTRACTATION",{
    size:12,
    fontUsed:bold,
    gapAfter:9
  });
  drawText(
    "À utiliser uniquement si le locataire bénéficie légalement d'un droit de rétractation et souhaite l'exercer.",
    {size:9,gapAfter:7}
  );
  drawText(
    "À l'attention de Location Photobooth 28, 20 Rue des Catalpas, 28630 Thivars — E-mail : loc.photobooth.28@gmail.com"
  );
  drawText(
    "Je vous notifie par la présente ma rétractation du contrat portant sur la prestation suivante : ______________________________"
  );
  drawText(
    "Devis / événement : ______________________________"
  );
  drawText(
    "Contrat conclu le : ____ / ____ / ______"
  );
  drawText(
    "Nom du consommateur : ______________________________"
  );
  drawText(
    "Adresse du consommateur : ______________________________"
  );
  drawText(
    "Date : ____ / ____ / ______     Signature (uniquement en cas d'envoi du formulaire sur papier) : __________________"
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

  // Numérotation automatique de chaque page
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  pages.forEach((p,index)=>{
    const label = `Page ${index+1} / ${totalPages}`;
    const size = 8;
    const width = font.widthOfTextAtSize(label,size);

    p.drawText(label,{
      x:pageWidth - margin - width,
      y:20,
      size,
      font,
      color:rgb(0.35,0.35,0.35)
    });
  });

  const bytes = await pdfDoc.save();

  return Buffer.from(bytes);
}

module.exports = {
  generateContractPdf,
  BOOTHS,
  PRINT_NAMES
};