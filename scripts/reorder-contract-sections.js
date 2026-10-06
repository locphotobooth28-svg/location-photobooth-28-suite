const fs = require('fs');

const files = ['contractService.js', 'services/contractService.js'];

for (const file of files) {
  let text = fs.readFileSync(file, 'utf8');

  if (text.includes('section(3,"Forfait d\'impression")') && text.includes('section(4,"Conditions de location")') && text.includes('section(5,"Règlement et dépôt de garantie")')) {
    console.log(file + ': déjà réordonné');
    continue;
  }

  const forfaitStartMarker = '  section(5,"Forfait d\'impression");';
  const forfaitEndMarker = '  section(6,"Obligations du locataire");';
  const forfaitStart = text.indexOf(forfaitStartMarker);
  const forfaitEnd = text.indexOf(forfaitEndMarker, forfaitStart);

  if (forfaitStart < 0 || forfaitEnd < 0) {
    throw new Error(file + ': bloc forfait d\'impression introuvable');
  }

  let forfaitBlock = text.slice(forfaitStart, forfaitEnd);
  text = text.slice(0, forfaitStart) + text.slice(forfaitEnd);

  const conditionsOld = '  section(3,"Conditions de location");';
  const paymentOld = '  section(4,"Règlement et dépôt de garantie");';
  if (!text.includes(conditionsOld) || !text.includes(paymentOld)) {
    throw new Error(file + ': sections 3/4 introuvables');
  }

  text = text.replace(conditionsOld, '  section(4,"Conditions de location");');
  text = text.replace(paymentOld, '  section(5,"Règlement et dépôt de garantie");');
  forfaitBlock = forfaitBlock.replace(forfaitStartMarker, '  section(3,"Forfait d\'impression");');

  const insertMarker = '  section(4,"Conditions de location");';
  const insertAt = text.indexOf(insertMarker);
  if (insertAt < 0) throw new Error(file + ': point d\'insertion introuvable');
  text = text.slice(0, insertAt) + forfaitBlock + '\n' + text.slice(insertAt);

  fs.writeFileSync(file, text, 'utf8');
  console.log(file + ': OK');
}
