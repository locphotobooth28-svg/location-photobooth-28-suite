// LP28 - Annuaire léger des lieux de réception.
// Pas de photos : uniquement des données texte pour garder un stockage négligeable.
// Cette base est volontairement extensible ; les salles municipales du 28 sont prioritaires.
export const LP28_VENUES = [
  {name:"Domaine de la Cloche",type:"Domaine",city:"Arcisses",postcode:"28400",department:"28",address:"17 lieu dit, 28400 Arcisses"},
  {name:"Domaine de Tardais",type:"Domaine",city:"Senonches",postcode:"28250",department:"28",address:"21 Route des Étangs, 28250 Senonches"},
  {name:"Domaine de Meaucé",type:"Domaine",city:"Meaucé",postcode:"28240",department:"28",address:"Meaucé, 28240"},
  {name:"Manoir de Vacheresses les Basses",type:"Domaine",city:"Nogent-le-Roi",postcode:"28210",department:"28",address:"Nogent-le-Roi, 28210"},
  {name:"Ferme des Festivités",type:"Domaine",city:"Bazoches-en-Dunois",postcode:"28140",department:"28",address:"Bazoches-en-Dunois, 28140"},
  {name:"Allée de Marolles",type:"Domaine",city:"Les Villages Vovéens",postcode:"28150",department:"28",address:"Les Villages Vovéens, 28150"},
  {name:"Ferme du Coudray",type:"Domaine",city:"La Croix-du-Perche",postcode:"28480",department:"28",address:"La Croix-du-Perche, 28480"},
  {name:"Domaine de Vaujoly",type:"Domaine",city:"Courville-sur-Eure",postcode:"28190",department:"28",address:"Courville-sur-Eure, 28190"},
  {name:"Corvilla",type:"Salle de réception",city:"Courville-sur-Eure",postcode:"28190",department:"28",address:"Courville-sur-Eure, 28190"},
  {name:"Domaine de Moresville",type:"Domaine",city:"Flacey",postcode:"28800",department:"28",address:"Flacey, 28800"},
  {name:"Carrousel de Baronville",type:"Domaine",city:"Béville-le-Comte",postcode:"28700",department:"28",address:"Béville-le-Comte, 28700"},
  {name:"Domaine de la Thibaudière",type:"Domaine",city:"Faverolles",postcode:"28210",department:"28",address:"Faverolles, 28210"},
  {name:"Domaine des Evis",type:"Domaine",city:"La Chapelle-Fortin",postcode:"28340",department:"28",address:"La Chapelle-Fortin, 28340"},
  {name:"Ferme des Tourelles",type:"Domaine",city:"Boutigny-Prouais",postcode:"28410",department:"28",address:"Boutigny-Prouais, 28410"},
  {name:"La Tour d’Aligre",type:"Domaine",city:"Champrond-en-Gâtine",postcode:"28240",department:"28",address:"Champrond-en-Gâtine, 28240"},
  {name:"Le Clos Souvigny",type:"Domaine",city:"Pontgouin",postcode:"28190",department:"28",address:"Pontgouin, 28190"},
  {name:"Château de Herces",type:"Château / domaine",city:"Berchères-sur-Vesgre",postcode:"28260",department:"28",address:"Berchères-sur-Vesgre, 28260"},
  {name:"Château des Boulard",type:"Château / domaine",city:"Mignières",postcode:"28630",department:"28",address:"Mignières, 28630"},
  {name:"Dianetum",type:"Salle de réception",city:"Anet",postcode:"28260",department:"28",address:"Anet, 28260"},
  {name:"Salle polyvalente",type:"Salle polyvalente",city:"Saint-Georges-sur-Eure",postcode:"28190",department:"28",address:"5 Place de l’Église, 28190 Saint-Georges-sur-Eure"},
  {name:"Salle des fêtes",type:"Salle des fêtes",city:"Fontenay-sur-Eure",postcode:"28630",department:"28",address:"28630 Fontenay-sur-Eure"},
  {name:"Salle des fêtes",type:"Salle des fêtes",city:"Nogent-sur-Eure",postcode:"28120",department:"28",address:"3 Rue des Écoles, 28120 Nogent-sur-Eure"},
  {name:"Salle des fêtes",type:"Salle des fêtes",city:"Villemeux-sur-Eure",postcode:"28210",department:"28",address:"1 Rue de Tréon, 28210 Villemeux-sur-Eure"}
];

export function searchLp28Venues(query, limit=8){
  const normalize=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
  const q=normalize(query);
  if(q.length<2)return [];
  return LP28_VENUES
    .filter(v=>normalize(`${v.name} ${v.type} ${v.city} ${v.postcode} ${v.department} ${v.address}`).includes(q))
    .sort((a,b)=>Number(a.department!=="28")-Number(b.department!=="28")||a.city.localeCompare(b.city,"fr"))
    .slice(0,limit);
}
