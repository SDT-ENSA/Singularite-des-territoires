/* Source unique des contenus — vous pourrez remplacer ces valeurs par vos propres données. */
window.OBSERVATORY_DATA = {
  city: { name: 'Observatoire patrimonial', country: 'Référentiel scientifique', period: 'Révision 1', districtCount: 119 },
  mapboxToken: '', /* Ajoutez ici un jeton Mapbox public pour remplacer le fond OSM. */
  years: ['Référentiel'],
  indicators: [
    { id: 'novelty', label: 'Nouveauté', unit: 'propriétés requises', values: [21] },
    { id: 'usage', label: 'Usage', unit: 'propriétés requises', values: [17] },
    { id: 'art', label: 'Art', unit: 'propriétés requises', values: [27] },
    { id: 'history', label: 'Histoire', unit: 'propriétés requises', values: [20] },
    { id: 'memory', label: 'Mémoire', unit: 'propriétés requises', values: [16] },
    { id: 'age', label: 'Ancienneté', unit: 'propriétés requises', values: [18] }
  ],
  districts: ['Nouveauté','Usage','Art','Histoire','Mémoire','Ancienneté']
};
