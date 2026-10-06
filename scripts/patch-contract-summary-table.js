const fs=require('fs');
const files=['contractService.js','services/contractService.js'];
const helperAnchor=`  function separator(gapAfter=14){
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
  }`;
const helperExtra=helperAnchor+`

  function drawSummaryTable(rows){
    const leftWidth=165;
    const rightWidth=contentWidth-leftWidth;
    const fontSize=9;
    const lineHeight=11;
    const cellPadX=7;
    const cellPadY=6;

    function drawRow(left,right,{header=false,boldRow=false}={}){
      const rowFont=(header||boldRow)?bold:font;
      const leftLines=wrapText(left,rowFont,fontSize,leftWidth-(cellPadX*2));
      const rightLines=wrapText(right,rowFont,fontSize,rightWidth-(cellPadX*2));
      const rowHeight=Math.max(leftLines.length,rightLines.length)*lineHeight+(cellPadY*2);
      ensureSpace(rowHeight+2);
      const topY=y;
      const bg=header?rgb(0.96,0.94,0.87):rgb(1,1,1);
      page.drawRectangle({x:margin,y:topY-rowHeight,width:leftWidth,height:rowHeight,color:bg,borderColor:rgb(0.72,0.68,0.58),borderWidth:0.6});
      page.drawRectangle({x:margin+leftWidth,y:topY-rowHeight,width:rightWidth,height:rowHeight,color:bg,borderColor:rgb(0.72,0.68,0.58),borderWidth:0.6});
      let ly=topY-cellPadY-fontSize;
      for(const line of leftLines){page.drawText(line,{x:margin+cellPadX,y:ly,size:fontSize,font:rowFont,color:rgb(0.12,0.12,0.12)});ly-=lineHeight;}
      let ry=topY-cellPadY-fontSize;
      for(const line of rightLines){page.drawText(line,{x:margin+leftWidth+cellPadX,y:ry,size:fontSize,font:rowFont,color:rgb(0.12,0.12,0.12)});ry-=lineHeight;}
      y-=rowHeight;
    }

    drawRow('Élément','Détail / Montant',{header:true});
    for(const row of rows)drawRow(row.label,row.value,{boldRow:Boolean(row.bold)});
    y-=8;
  }`;

const start=`  drawText(
    \`Forfait sélectionné : \${printPackage.label}.\`,`;
const end=`  drawText(
    "Le montant total enregistré dans la prestation prévaut sur les tarifs catalogue en cas de remise, offre commerciale, prestation professionnelle ou conditions particulières."
  );`;
const replacement=`  const summaryRows=[{label:"Forfait sélectionné",value:printPackage.label}];

  if(printPackage.custom){
    summaryRows.push({label:"Tarif du forfait personnalisé",value:money(printPackage.price)});
  }else if(booths.length===1&&printPackage.count!==null){
    const cataloguePrice=booths[0].prices[printPackage.count];
    if(cataloguePrice!==undefined)summaryRows.push({label:"Tarif catalogue correspondant",value:money(cataloguePrice)});
  }

  if(framePricing.source!=="NONE")summaryRows.push({label:"Cadre photo",value:\`\${framePricing.label} — \${framePricing.priceLabel}\`});

  const specialNeed=event.preparation&&typeof event.preparation==="object"?event.preparation:{};
  const specialNeedDescription=String(specialNeed.specialNeedDescription||"").trim();
  const specialNeedPriceRaw=specialNeed.specialNeedPrice;
  const specialNeedHasPrice=specialNeedPriceRaw!==undefined&&specialNeedPriceRaw!==null&&specialNeedPriceRaw!=="";
  const specialNeedPrice=Math.max(Number(specialNeedPriceRaw||0),0);
  if(specialNeedDescription)summaryRows.push({label:"Besoin particulier",value:\`\${specialNeedDescription}\${specialNeedHasPrice?\` — \${specialNeedPrice>0?money(specialNeedPrice):"Offert"}\`:""}\`});

  const travel=event.preparation&&typeof event.preparation==="object"?event.preparation:{};
  const travelDistance=Math.max(Number(travel.travelDistanceKm||0),0);
  const travelFreeKm=travel.travelFree15?15:0;
  const travelRate=Number.isFinite(Number(travel.travelRate))?Math.max(Number(travel.travelRate),0):0.50;
  const billedKm=Math.max(travelDistance-travelFreeKm,0);
  const travelFee=billedKm*travelRate;
  const kmLabel=n=>Number.isInteger(n)?String(n):String(Math.round(n*100)/100).replace(".",",");
  if(travelDistance>0){
    summaryRows.push({
      label:"Frais de déplacement (Aller/Retour)",
      value:travel.travelFree15
        ? \`\${kmLabel(travelDistance)} km (Aller/Retour) − 15 km offerts = \${kmLabel(billedKm)} km facturés × \${money(travelRate)}/km = \${money(travelFee)}\`
        : \`\${kmLabel(travelDistance)} km (Aller/Retour) × \${money(travelRate)}/km = \${money(travelFee)}\`
    });
  }

  summaryRows.push({label:"Montant total de la prestation",value:money(event.totalPrice),bold:true});
  drawSummaryTable(summaryRows);

  drawText(
    "Le montant total enregistré dans la prestation prévaut sur les tarifs catalogue en cas de remise, offre commerciale, prestation professionnelle ou conditions particulières."
  );`;

for(const file of files){
  let text=fs.readFileSync(file,'utf8');
  if(!text.includes('function drawSummaryTable(rows)')){
    if(!text.includes(helperAnchor))throw new Error(file+': helper anchor missing');
    text=text.replace(helperAnchor,helperExtra);
  }
  if(!text.includes('label:"Frais de déplacement (Aller/Retour)"')){
    const a=text.indexOf(start);
    const b=text.indexOf(end,a);
    if(a<0||b<0)throw new Error(file+': pricing block markers missing');
    text=text.slice(0,a)+replacement+text.slice(b+end.length);
  }
  fs.writeFileSync(file,text,'utf8');
  console.log(file+': OK');
}
