const SOURCE = 'https://singularitesdesterritoires.nantes.archi.fr/html/PNR/2026/';
const ORIGINAL_MAP = 'https://wild.wf/sto/Mod%C3%A8les/index.html';
const ORIGINAL_MODEL = `${SOURCE}gem%20app/carto%20interactive/index.html`;

const TERRITORIES = [
  {
    id: 'briere', name: 'Parc naturel régional de Brière', short: 'Parc de Brière', marker: 'Marais de Brière',
    image: 'briere.jpg', original: 'PNR_COVER.JPG', color: '#d8ed8d', theme: 'Milieux et patrimoine',
    coords: [-2.286, 47.378], location: 'Grande Brière · Saint-Lyphard · Saint-Joachim',
    summary: 'Un paysage de marais, de canaux et de villages qui invite à lire ensemble les milieux humides et le patrimoine habité.',
    question: 'Comment préserver un patrimoine qui continue d’être habité, utilisé et transformé ?',
    tags: ['Zones humides', 'Chaumières', 'Patrimoine'], layers: ['wetland', 'water', 'park'],
    observation: 'Superposer les zones humides et le réseau de canaux, puis repérer la position des bourgs autour du marais.',
  },
  {
    id: 'pontchateau', name: 'Pontchâteau–Crossac', short: 'Pontchâteau–Crossac', marker: 'Pontchâteau–Crossac',
    image: 'pontchateau.jpg', original: 'PCC_COVER.jpeg', color: '#f5bd91', theme: 'Habiter et traverser',
    coords: [-2.110, 47.436], location: 'Pontchâteau · Crossac · vallée du Brivet',
    summary: 'De la vallée du Brivet aux bourgs, le terrain met en relation les zones humides, les circulations et les manières d’habiter.',
    question: 'Comment les déplacements et les formes d’habitat franchissent-ils les limites entre bourg, campagne et marais ?',
    tags: ['Vallée du Brivet', 'Bourgs', 'Mobilités'], layers: ['water', 'urban', 'routes'],
    observation: 'Suivre le Brivet vers le nord et comparer son tracé aux routes et aux espaces urbanisés.',
  },
  {
    id: 'guerande', name: 'Guérande–Herbignac', short: 'Guérande–Herbignac', marker: 'Guérande–Herbignac',
    image: 'guerande.jpg', original: 'GH_COVER.jpg', color: '#e8d3ee', theme: 'Lisières et paysages',
    coords: [-2.401, 47.347], location: 'Guérande · Herbignac · lisière occidentale de la Brière',
    summary: 'Un terrain entre les marais salants, la ville historique de Guérande et les paysages ruraux en direction d’Herbignac.',
    question: 'Quelles continuités peut-on lire entre le patrimoine bâti, les milieux humides et les paysages agricoles ?',
    tags: ['Marais salants', 'Paysages', 'Patrimoine'], layers: ['wetland', 'urban', 'routes'],
    observation: 'Comparer l’emprise des zones humides de la presqu’île avec les espaces urbanisés vers Herbignac.',
  },
];

const PLACES = [
  { name: 'Guérande', coords: [-2.428, 47.328], territory: 'guerande', align: 'bottom', major: true },
  { name: 'Herbignac', coords: [-2.318, 47.449], territory: 'guerande', align: 'top', major: true },
  { name: 'La Baule-Escoublac', coords: [-2.391, 47.285], territory: 'guerande', align: 'bottom' },
  { name: 'Saint-Lyphard', coords: [-2.306, 47.398], territory: 'briere', align: 'left' },
  { name: 'Saint-Molf', coords: [-2.425, 47.391], territory: 'guerande', align: 'top' },
  { name: 'Saint-Joachim', coords: [-2.200, 47.380], territory: 'briere', align: 'bottom' },
  { name: 'La Chapelle-des-Marais', coords: [-2.244, 47.446], territory: 'briere', align: 'top' },
  { name: 'Saint-André-des-Eaux', coords: [-2.310, 47.312], territory: 'briere', align: 'top' },
  { name: 'Saint-Nazaire', coords: [-2.212, 47.274], territory: 'briere', align: 'top', major: true },
  { name: 'Montoir-de-Bretagne', coords: [-2.152, 47.331], territory: 'briere', align: 'bottom' },
  { name: 'Pontchâteau', coords: [-2.091, 47.436], territory: 'pontchateau', align: 'top', major: true },
  { name: 'Crossac', coords: [-2.168, 47.411], territory: 'pontchateau', align: 'bottom' },
  { name: 'Besné', coords: [-2.090, 47.398], territory: 'pontchateau', align: 'bottom' },
  { name: 'Donges', coords: [-2.075, 47.319], territory: 'pontchateau', align: 'bottom' },
];

const LAYERS = [
  { id: 'wetland', name: 'Zones humides', detail: 'Marais et milieux humides cartographiés', color: '#86b789', visible: true },
  { id: 'water', name: 'Hydrographie', detail: 'Cours d’eau, canaux et plans d’eau', color: '#78bfbe', visible: true },
  { id: 'urban', name: 'Espaces urbanisés', detail: 'Secteurs résidentiels, commerciaux et industriels', color: '#c3a573', visible: true },
  { id: 'routes', name: 'Axes et voies ferrées', detail: 'Routes principales et réseau ferroviaire', color: '#a1aba8', visible: true },
  { id: 'park', name: 'Périmètre du parc', detail: 'Limite du PNR publiée par la Région Pays de la Loire', color: '#d9ec9b', visible: true },
  { id: 'communes', name: 'Limites communales', detail: 'Contours issus de l’API Découpage administratif', color: '#d5c4a0', visible: false },
];

const PRESETS = [
  { id: 'complet', name: 'Toutes les couches', layers: ['wetland', 'water', 'urban', 'routes', 'park', 'communes'] },
  { id: 'milieux', name: 'Eau et milieux', layers: ['wetland', 'water', 'park'] },
  { id: 'habitat', name: 'Habitat et mobilités', layers: ['urban', 'routes', 'communes'] },
  { id: 'limites', name: 'Limites et périmètres', layers: ['park', 'communes'] },
];

const RESOURCES = [
  { id: 'marais-indivis', title: 'Le marais indivis', territory: 'briere', type: 'Planche', image: 'marais-indivis.jpg', original: 'PNR_FINAL_25.png', detail: 'Lecture du marais au prisme des valeurs patrimoniales et de la place donnée aux usages.' },
  { id: 'chaumiere', title: 'La chaumière habitée', territory: 'briere', type: 'Planche', image: 'chaumiere.jpg', original: 'PNR_FINAL_22.png', detail: 'Une planche sur les arbitrages entre le confort contemporain et la conservation du bâti.' },
  { id: 'indicateurs', title: 'Affiner les indicateurs', territory: 'briere', type: 'Planche', image: 'analyse-briere.jpg', original: 'PNR_FINAL_20.png', detail: 'Document de travail sur les sous-indicateurs du modèle d’analyse patrimoniale.' },
  { id: 'carte-brivet', title: 'Cartographie du terrain Pontchâteau–Crossac', territory: 'pontchateau', type: 'Carte', image: 'cartographie-pcc.jpg', original: '0 CART PC_01.JPG', detail: 'Une carte issue du dossier de terrain Pontchâteau–Crossac.' },
  { id: 'visite-brivet', title: 'Visite de terrain · novembre 2025', territory: 'pontchateau', type: 'Photographie', image: 'pcc-visite.jpg', original: 'PCC/PCC (1).jpeg', detail: 'Une image du reportage de terrain du studio à Pontchâteau.' },
  { id: 'carte-presquile', title: 'Cartographie du terrain Guérande–Herbignac', territory: 'guerande', type: 'Carte', image: 'cartographie-guerande.jpg', original: 'Guérande/Cartes/Guerande_carte (1).jpg', detail: 'Une carte tirée du dossier cartographique Guérande–Herbignac.' },
  { id: 'vieux-guerande', title: 'Carnet du vieux Guérande', territory: 'guerande', type: 'Photographie', image: 'guerande-archives.jpg', original: 'Guérande/Vieux_Guérande/Vieux_Guérande (1).jpg', detail: 'Une image de la série consacrée au vieux Guérande.' },
];

function originalImage(path) {
  return `${SOURCE}assets/images/${path.split('/').map(encodeURIComponent).join('/')}`;
}
