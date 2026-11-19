const ICONS = {
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
  bookmark: '<path d="M6 20V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v15l-6-4-6 4Z"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5m-18 4 9 5 9-5"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.4 10.7 7.2-4.4m-7.2 7 7.2 4.4"/>',
  expand: '<path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5"/>',
  collapse: '<path d="M4 9h5V4m11 5h-5V4M4 15h5v5m11-5h-5v5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  locate: '<circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>',
  pin: '<path d="M19 10c0 4.8-7 10-7 10s-7-5.2-7-10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  back: '<path d="m15 6-6 6 6 6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  compare: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 5v14"/>',
  file: '<path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9Zm0 0v7h7M8 15h8"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M5 17v4h14v-4"/>',
  link: '<path d="M13 5h6v6m0-6-9 9m8-2v7H5V6h7"/>',
};

function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

function countLabel(count, singular, plural) { return `${count} ${count === 1 ? singular : plural}`; }
function territoryFor(id) { return TERRITORIES.find(terrain => terrain.id === id); }

function button(action, label, symbol, extra = '') {
  return `<button type="button" class="button ${extra}" data-action="${action}">${symbol ? icon(symbol) : ''}${label}</button>`;
}

function hero(title, eyebrow, description) {
  return `<div class="page-intro"><div><p class="eyebrow"><span></span>${eyebrow}</p><h1>${title}</h1></div><p class="intro-copy">${description}</p></div>`;
}

function territoryRow(terrain) {
  return `<button class="territory-row" type="button" data-action="inspect" data-id="${terrain.id}">
    <img src="media/${terrain.image}" alt="" width="61" height="57">
    <span class="territory-text"><span class="territory-theme"><i style="--color:${terrain.color}"></i>${terrain.theme}</span><strong>${terrain.name}</strong></span>
    ${icon('chevron')}
  </button>`;
}

function territoryCard(terrain) {
  return `<article class="terrain-card">
    <button type="button" data-action="inspect" data-id="${terrain.id}">
      <img src="media/${terrain.image}" alt="" loading="lazy" width="700" height="420">
      <span class="terrain-card-copy"><span class="territory-theme"><i style="--color:${terrain.color}"></i>${terrain.theme}</span><strong>${terrain.name}</strong><span>${terrain.summary}</span></span>
    </button>
  </article>`;
}

function layerLegend(layers) {
  return LAYERS.filter(layer => layers.includes(layer.id)).map(layer => `<span><i style="--color:${layer.color}"></i>${layer.name}</span>`).join('');
}

function atlasView() {
  return `<div class="shell">
    ${hero('Atlas de la <em>Brière</em>', 'Singularités des territoires · Projet S7', 'Des marais aux bourgs, explorez les terrains d’étude du studio et croisez les couches qui dessinent leurs paysages.')}
    <section class="workspace" id="workspace" aria-label="Explorer les terrains">
      <div class="workspace-toolbar">
        <div class="workspace-title">${icon('map')}<h2>Explorateur territorial</h2></div>
        <div class="workspace-tools">
          <div class="segmented" role="group" aria-label="Mode d’affichage">
            <button type="button" data-action="mode-map" aria-pressed="true">${icon('map')}<span>Carte</span></button>
            <button type="button" data-action="mode-list" aria-pressed="false">${icon('list')}<span>Liste</span></button>
          </div>
          <button type="button" class="button toolbar-button" data-action="share" aria-label="Partager la vue" title="Partager la vue">${icon('share')}<span class="wide-only">Partager</span></button>
          <button type="button" class="button square" data-action="expand" aria-label="Agrandir l’explorateur" title="Agrandir l’explorateur">${icon('expand')}</button>
        </div>
      </div>
      <div class="explorer-body">
        <div class="atlas-panel">
          <div id="main-map" class="map-surface"></div>
          <div class="map-legend" id="map-legend" aria-label="Légende cartographique"></div>
          <div id="atlas-list" class="atlas-list" hidden>
            <h3>Les terrains d’étude</h3>
            ${TERRITORIES.map(terrain => `<div class="list-result">${territoryRow(terrain)}<p>${terrain.summary}</p></div>`).join('')}
          </div>
        </div>
        <aside class="side-panel" aria-label="Options de l’atlas">
          <div class="panel-tabs" role="group" aria-label="Panneau de l’explorateur">
            <button type="button" data-action="panel-terrains" aria-pressed="true">${icon('pin')}Terrains</button>
            <button type="button" data-action="panel-layers" aria-pressed="false">${icon('layers')}Couches</button>
          </div>
          <div class="panel-content" id="panel-content"></div>
        </aside>
      </div>
    </section>
    <section class="section-spacing" aria-labelledby="terrain-heading">
      <div class="section-heading"><div><p class="eyebrow"><span></span>Les études du studio</p><h2 id="terrain-heading">Trois regards sur un territoire</h2></div><a class="button" href="#archives">${icon('file')}Voir les archives</a></div>
      <div class="terrain-grid">${TERRITORIES.map(territoryCard).join('')}</div>
    </section>
    <section class="feature-band" aria-labelledby="model-link-title">
      <div class="model-icon">${icon('layers')}</div><div><h2 id="model-link-title">Modèle Urbanité–Ruralité</h2><p>Retrouvez la grille de lecture originale du studio et son arborescence interactive.</p></div>
      <a class="button ancre" href="#modele">Ouvrir le modèle</a>
    </section>
  </div>`;
}

function selectOptions(options, selected) {
  return options.map(([id, name]) => `<option value="${esc(id)}"${id === selected ? ' selected' : ''}>${esc(name)}</option>`).join('');
}

function comparePane(side, label) {
  return `<section class="compare-pane" aria-label="Carte ${label}">
    <div class="compare-pane-top"><span class="map-index" aria-hidden="true">${label}</span><label for="preset-${side}"><span class="visually-hidden">Thème de la carte ${label}</span><select id="preset-${side}">${selectOptions(PRESETS.map(preset => [preset.id, preset.name]), compare[side])}</select></label></div>
    <div id="map-${side}" class="map-surface compare-surface"></div>
    <div class="compare-legend" id="legend-${side}" aria-label="Légende de la carte ${label}"></div>
  </section>`;
}

function compareView() {
  return `<div class="shell">
    ${hero('Comparer les <em>couches</em>', 'Comparateur cartographique', 'Affichez deux lectures du territoire côte à côte. Le déplacement et le zoom sont synchronisés tant que l’option est active.')}
    <div class="compare-toolbar">
      <label for="comparison-terrain">Cadrage <select id="comparison-terrain">${selectOptions([['', 'Ensemble de la Brière'], ...TERRITORIES.map(terrain => [terrain.id, terrain.short])], compare.terrain)}</select></label>
      <label class="switch-line"><input id="comparison-sync" type="checkbox" role="switch" ${compare.sync ? 'checked' : ''}><span>Synchroniser</span></label>
      ${button('share', '<span>Partager</span>', 'share')}
    </div>
    <div class="compare-grid">${comparePane('a', 'A')}${comparePane('b', 'B')}</div>
    <div class="feature-band"><div class="model-icon">${icon('layers')}</div><div><h2>Urbanité–Ruralité</h2><p>Pour explorer le modèle théorique qui accompagne les cartes du studio.</p></div><a class="button ancre" href="#modele">Ouvrir le modèle</a></div>
  </div>`;
}

function archivesView() {
  return `<div class="shell">
    ${hero('Archives de <em>terrain</em>', 'Fonds du studio', 'Parcourez une sélection de cartes, de planches d’analyse et de photographies issues du site du studio.')}
    <div class="archive-filters">
      <label class="field-search">${icon('search')}<input type="search" id="archive-query" aria-label="Rechercher un document" placeholder="Rechercher un document" value="${esc(archives.query)}"></label>
      <label class="filter-select"><span>Terrain</span><select id="archive-terrain">${selectOptions([['', 'Tous les terrains'], ...TERRITORIES.map(terrain => [terrain.id, terrain.short])], archives.terrain)}</select></label>
      <label class="filter-select"><span>Type</span><select id="archive-type">${selectOptions([['', 'Tous les types'], ...[...new Set(RESOURCES.map(resource => resource.type))].map(type => [type, type])], archives.type)}</select></label>
      <button type="button" class="button" data-action="clear-archives" id="archive-reset" hidden>Effacer les filtres</button>
    </div>
    <p id="archive-count" class="muted" aria-live="polite"></p>
    <div id="archive-grid" class="archive-grid"></div>
    <p class="archive-source"><a href="${SOURCE}index.html" target="_blank" rel="noopener">Consulter le fonds complet sur le site du studio ${icon('link')}</a></p>
  </div>`;
}

function archiveCard(resource) {
  return `<article class="archive-card"><button type="button" data-action="document" data-id="${resource.id}">
      <img src="media/${resource.image}" alt="" loading="lazy" width="550" height="310">
      <span class="archive-copy"><span class="territory-theme">${resource.type} · ${territoryFor(resource.territory).short}</span><strong>${resource.title}</strong><span>${resource.detail}</span></span>
    </button></article>`;
}

function studioView() {
  return `<div class="shell">
    ${hero('Le <em>studio</em>', 'Demain Architecture Laboratory', 'Singularités des territoires explore les formes du paysage et les relations entre milieux, patrimoine et manières d’habiter.')}
    <div class="studio-grid">
      <figure class="studio-image"><img src="media/studio.jpg" alt="Vue de l’atelier de projet" width="1100" height="680"><figcaption>Vie de studio · photographie du site de référence</figcaption></figure>
      <section class="studio-copy"><h2>L’atelier autour de la Brière</h2><p>Le site de référence rassemble trois terrains d’étude, un modèle Urbanité–Ruralité, des travaux d’étudiants et des archives de visite. Cet atlas donne accès à ces contenus par lieu, par thème et par type de document.</p><p>Le comparateur permet de mettre en regard plusieurs lectures spatiales. Les fiches de terrain proposent des questions et des pistes de lecture à discuter en atelier.</p><a class="button" href="${SOURCE}index.html" target="_blank" rel="noopener">Voir la vie de studio et les travaux ${icon('link')}</a></section>
    </div>
    <section class="sources-section"><h2>Sources et méthode</h2><dl>
      <div><dt>Dossiers et visuels</dt><dd><a href="${SOURCE}index.html" target="_blank" rel="noopener">Singularités des territoires · édition 2026</a>. Les planches et photographies du catalogue renvoient à leur fichier source.</dd></div>
      <div><dt>Fond cartographique</dt><dd>Données <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>, via <a href="https://openfreemap.org/" target="_blank" rel="noopener">OpenFreeMap</a> et le schéma <a href="https://openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a>. Le fond et ses couches sont simplifiés à l’échelle de l’atlas. Les repères signalent les secteurs étudiés.</dd></div>
      <div><dt>Limites</dt><dd>Contours communaux de l’<a href="https://geo.api.gouv.fr/decoupage-administratif/communes" target="_blank" rel="noopener">API Découpage administratif</a>. Périmètre du parc issu du jeu de données publié par la <a href="https://www.data.gouv.fr/datasets/parcs-naturels-regionaux-des-pays-de-la-loire-1" target="_blank" rel="noopener">Région Pays de la Loire</a> (IGN).</dd></div>
      <div><dt>Cartes originales</dt><dd><a href="${ORIGINAL_MAP}" target="_blank" rel="noopener">Cartographie interactive du studio</a> · <a href="#modele">Modèle Urbanité–Ruralité</a>.</dd></div>
    </dl></section>
  </div>`;
}

function modelView() {
  return `<div class="shell">
    ${hero('Urbanité–<em>Ruralité</em>', 'Modèle du studio', 'Le modèle original organise les données territoriales en une arborescence. Explorez ses familles de critères, puis ouvrez l’interface du studio pour continuer.')}
    <section class="model-intro">
      <div class="model-explore">
        <p class="eyebrow"><span></span>Lire l’arborescence</p>
        <h2>Familles de critères</h2>
        <details open><summary>Anthropologique</summary><p>Les pratiques et manières d’habiter mobilisées dans la lecture du territoire.</p></details>
        <details><summary>Politique</summary><p>Les cadres collectifs et institutionnels qui interviennent dans l’organisation du territoire.</p></details>
        <details><summary>Interface abstraite</summary><p>Une famille de critères à explorer dans l’arborescence originale.</p></details>
        <details><summary>Économique</summary><p>Les activités et les relations économiques prises en compte dans le modèle.</p></details>
      </div>
      <div class="model-access" id="model-access"><div class="model-icon">${icon('layers')}</div><h2>Interface du studio</h2><p>La visualisation originale se charge depuis le serveur de l’école.</p><div class="button-group">${button('load-model', 'Charger ici', 'layers', 'primary')}<a class="button" href="${ORIGINAL_MODEL}" target="_blank" rel="noopener">Ouvrir à part ${icon('link')}</a></div></div>
    </section>
  </div>`;
}
