const main = document.querySelector('#main');
const overlay = document.querySelector('#overlay');
const notification = document.querySelector('#notification');
const storageKey = 'atlas-briere-carnet-v1';
const atlas = { mode: 'map', panel: 'terrains', layers: [...DEFAULT_LAYERS], view: { ...MAP_HOME }, selected: '' };
const compare = { a: 'milieux', b: 'habitat', sync: true, terrain: '', views: [{ ...MAP_HOME }, { ...MAP_HOME }] };
const archives = { query: '', terrain: '', type: '' };
const pages = { atlas: atlasView, comparer: compareView, archives: archivesView, studio: studioView, modele: modelView };
let notebook = readNotebook();
let activePage = '';
let activeMaps = [];
let dialogKind = '';
let opener = null;
let imageQueue = [];
let currentImage = '';
let noticeTime;

function readNotebook() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    return Object.fromEntries(TERRITORIES.flatMap(terrain => {
      const entry = saved?.[terrain.id];
      return entry && typeof entry.note === 'string' ? [[terrain.id, { pinned: entry.pinned === true, note: entry.note.slice(0, 2500) }]] : [];
    }));
  } catch { return {}; }
}

function saveNotebook() {
  try { localStorage.setItem(storageKey, JSON.stringify(notebook)); }
  catch { notify('Le stockage est indisponible. Les modifications restent accessibles jusqu’à la fermeture de cette page.'); }
  const count = Object.values(notebook).filter(entry => entry.pinned || entry.note.trim()).length;
  const badge = document.querySelector('#notebook-count');
  badge.hidden = !count;
  badge.textContent = count;
}

function notify(message) {
  clearTimeout(noticeTime);
  notification.textContent = message;
  notification.classList.add('visible');
  noticeTime = setTimeout(() => notification.classList.remove('visible'), 3200);
}

function normalized(text) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function matches(text, query) {
  const searchable = normalized(text);
  return normalized(query).split(' ').every(word => searchable.includes(word));
}

function viewParam(view) {
  return [view.lon.toFixed(5), view.lat.toFixed(5), view.zoom.toFixed(2)].join(',');
}

function parseView(value) {
  if (!value || !/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,\d+(\.\d+)?$/.test(value)) return null;
  const [lon, lat, zoom] = value.split(',').map(Number);
  if (lon < -2.55 || lon > -1.98 || lat < 47.22 || lat > 47.55 || zoom < 0.8 || zoom > 6) return null;
  return { lon, lat, zoom };
}

function getRoute() {
  const [page, query] = location.hash.slice(1).split('?');
  return [Object.hasOwn(pages, page) ? page : 'atlas', new URLSearchParams(query)];
}

function setFromRoute(page, params) {
  if (page === 'atlas') {
    if (params.has('v')) atlas.view = parseView(params.get('v')) || { ...MAP_HOME };
    if (params.has('l')) atlas.layers = params.get('l').split(',').filter(id => LAYERS.some(layer => layer.id === id));
    if (params.has('mode')) atlas.mode = params.get('mode') === 'list' ? 'list' : 'map';
    if (params.has('t')) atlas.selected = territoryFor(params.get('t'))?.id || '';
  } else if (page === 'comparer') {
    for (const side of ['a', 'b']) if (PRESETS.some(preset => preset.id === params.get(side))) compare[side] = params.get(side);
    if (params.has('sync')) compare.sync = params.get('sync') !== '0';
    if (params.has('t')) compare.terrain = territoryFor(params.get('t'))?.id || '';
    if (params.has('va')) compare.views[0] = parseView(params.get('va')) || { ...MAP_HOME };
    if (params.has('vb')) compare.views[1] = parseView(params.get('vb')) || { ...MAP_HOME };
    if (compare.sync) compare.views[1] = { ...compare.views[0] };
  } else if (page === 'archives') {
    if (params.has('t')) archives.terrain = territoryFor(params.get('t'))?.id || '';
    if (params.has('type')) archives.type = RESOURCES.some(doc => doc.type === params.get('type')) ? params.get('type') : '';
    if (params.has('q')) archives.query = params.get('q').slice(0, 100);
  }
}

function renderPage({ focus = false } = {}) {
  if (overlay.open) overlay.close();
  const [page, params] = getRoute();
  setFromRoute(page, params);
  activeMaps.forEach(map => map.destroy());
  activeMaps = [];
  activePage = page;
  main.innerHTML = pages[page]();
  document.querySelectorAll('[data-nav]').forEach(link => {
    if (link.dataset.nav === page) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  if (page === 'atlas') initAtlas();
  if (page === 'comparer') initComparison();
  if (page === 'archives') {
    renderArchiveResults();
    if (RESOURCES.some(resource => resource.id === params.get('doc'))) openResource(params.get('doc'));
  }
  if (focus) {
    window.scrollTo(0, 0);
    if (!overlay.open) main.focus({ preventScroll: true });
  }
}

function go(page, params = {}) {
  const query = new URLSearchParams(params).toString();
  const target = `#${page}${query ? `?${query}` : ''}`;
  if (location.hash === target) renderPage({ focus: true });
  else location.hash = target;
}

function initAtlas() {
  activeMaps = [new AtlasMap(document.querySelector('#main-map'), {
    layers: atlas.layers, view: atlas.view, onView: view => { atlas.view = view; },
  })];
  activeMaps[0].select(atlas.selected);
  updateMapMode();
  renderPanel();
}

function updateMapMode() {
  const list = atlas.mode === 'list';
  document.querySelector('#main-map').hidden = list;
  document.querySelector('#map-legend').hidden = list;
  document.querySelector('#atlas-list').hidden = !list;
  document.querySelector('[data-action="mode-map"]').setAttribute('aria-pressed', !list);
  document.querySelector('[data-action="mode-list"]').setAttribute('aria-pressed', list);
}

function updateAtlasLayers() {
  activeMaps[0].setLayers(atlas.layers);
  document.querySelector('#map-legend').innerHTML = atlas.layers.length ? layerLegend(atlas.layers) : '<span>Fond de carte</span>';
}

function renderPanel() {
  const panel = document.querySelector('#panel-content');
  const layers = atlas.panel === 'layers';
  document.querySelector('[data-action="panel-terrains"]').setAttribute('aria-pressed', !layers);
  document.querySelector('[data-action="panel-layers"]').setAttribute('aria-pressed', layers);
  if (layers) {
    panel.innerHTML = `<div class="panel-heading"><div><h3>Couches de la carte</h3><p>Choisissez ce que vous souhaitez lire.</p></div></div>
      <div class="layer-list">${LAYERS.map(layer => `<label class="layer-row"><i style="--color:${layer.color}"></i><span title="${layer.detail}">${layer.name}</span><input type="checkbox" role="switch" data-layer="${layer.id}" ${atlas.layers.includes(layer.id) ? 'checked' : ''}></label>`).join('')}</div>
      <button class="text-button" type="button" data-action="reset-layers">Rétablir les couches initiales</button>`;
  } else {
    panel.innerHTML = `<div class="panel-heading"><div><h3>Terrains d’étude</h3><p>Sélectionnez un lieu pour ouvrir sa fiche.</p></div><span class="panel-count">${TERRITORIES.length}</span></div>
      <div class="territory-list">${TERRITORIES.map(territoryRow).join('')}</div>
      <a class="panel-compare" href="#comparer">${icon('compare')}<span>Comparer les couches</span></a>`;
  }
  updateAtlasLayers();
}

function initComparison() {
  function moveOther(index, view) {
    compare.views[index] = view;
    if (!compare.sync) return;
    const other = 1 - index;
    compare.views[other] = { ...view };
    activeMaps[other].setView(view, false);
  }
  activeMaps = ['a', 'b'].map((side, index) => new AtlasMap(document.querySelector(`#map-${side}`), {
    layers: PRESETS.find(preset => preset.id === compare[side]).layers,
    view: compare.views[index], pins: false, onView: view => moveOther(index, view),
  }));
  ['a', 'b'].forEach(updatePreset);
}

function updatePreset(side) {
  const { layers } = PRESETS.find(preset => preset.id === compare[side]);
  activeMaps[side === 'a' ? 0 : 1].setLayers(layers);
  document.querySelector(`#legend-${side}`).innerHTML = layerLegend(layers);
}

function renderArchiveResults() {
  const results = RESOURCES.filter(resource => (!archives.terrain || resource.territory === archives.terrain)
    && (!archives.type || resource.type === archives.type)
    && matches(`${resource.title} ${resource.detail} ${territoryFor(resource.territory).name}`, archives.query));
  document.querySelector('#archive-reset').hidden = !archives.query && !archives.terrain && !archives.type;
  document.querySelector('#archive-count').textContent = countLabel(results.length, 'document', 'documents');
  document.querySelector('#archive-grid').innerHTML = results.length ? results.map(archiveCard).join('')
    : `<div class="empty-state"><h2>Aucun document trouvé</h2><p>Essayez d’autres mots ou élargissez la sélection.</p>${button('clear-archives', 'Réinitialiser les filtres', null)}</div>`;
}

function dialogContent(kind, label, title, html, extra = '') {
  if (!overlay.open) opener = document.activeElement;
  dialogKind = kind;
  overlay.className = `overlay ${extra}`;
  overlay.innerHTML = `<div class="dialog-header"><div>${label ? `<p class="eyebrow"><span></span>${label}</p>` : ''}<h2 id="dialog-title">${title}</h2></div>
    <button type="button" class="button square" data-action="close" aria-label="Fermer la fenêtre" title="Fermer">${icon('close')}</button></div>${html}`;
  if (!overlay.open) overlay.showModal();
  overlay.querySelector('[data-autofocus]')?.focus();
}

function inspect(id) {
  const terrain = territoryFor(id);
  if (!terrain) return;
  atlas.selected = id;
  if (activePage === 'atlas') activeMaps[0].select(id);
  const entry = notebook[id] || { note: '', pinned: false };
  const docs = RESOURCES.filter(resource => resource.territory === id);
  dialogContent('terrain', terrain.theme, terrain.name, `
    <img class="detail-image" src="media/${terrain.image}" alt="" width="800" height="290">
    <p class="detail-location">${icon('pin')}${terrain.location}</p>
    <p>${terrain.summary}</p>
    <div class="tag-list">${terrain.tags.map(tag => `<span>${tag}</span>`).join('')}</div>
    <div class="detail-question"><h3>Question de terrain</h3><p>${terrain.question}</p><p>${terrain.observation}</p><button type="button" class="text-button" data-action="terrain-layers" data-id="${id}">Afficher les couches de cette lecture</button></div>
    <div class="button-group"><button type="button" class="button primary" data-action="locate-terrain" data-id="${id}">${icon('locate')}Centrer la carte</button>
    <a class="button" href="#archives?t=${id}&amp;type=&amp;q=">${icon('file')}${countLabel(docs.length, 'archive', 'archives')}</a>
    <button type="button" class="button" data-action="pin-terrain" data-id="${id}" aria-pressed="${entry.pinned}">${icon(entry.pinned ? 'check' : 'bookmark')}<span>${entry.pinned ? 'Dans le carnet' : 'Ajouter au carnet'}</span></button></div>
    <label class="note-field" for="terrain-note">Note personnelle<textarea id="terrain-note" rows="3" maxlength="2500" data-note="${id}" placeholder="Ajouter une observation de terrain…">${esc(entry.note)}</textarea><small>Enregistrement dans ce navigateur.</small></label>`, 'detail-dialog');
}

function showNotebook() {
  const entries = TERRITORIES.filter(terrain => notebook[terrain.id]?.pinned || notebook[terrain.id]?.note.trim());
  dialogContent('notebook', '', 'Carnet de terrain', entries.length
    ? `<p class="muted">Retrouvez les terrains et les notes enregistrés dans ce navigateur.</p><div class="notebook-entries">${entries.map(terrain => territoryRow(terrain)).join('')}</div>
      <div class="button-group">${button('export-notebook', 'Exporter le carnet', 'download', 'primary')}</div>`
    : '<div class="empty-state"><h3>Le carnet est vide</h3><p>Ouvrez une fiche de terrain pour l’ajouter au carnet ou écrire une première observation.</p></div>');
}

const SEARCH_INDEX = [
  ...TERRITORIES.map(terrain => ({ name: terrain.name, hint: 'Terrain d’étude', search: [terrain.name, terrain.location, ...terrain.tags].join(' '), action: 'inspect', id: terrain.id, icon: 'pin' })),
  ...PLACES.map(place => ({ name: place.name, hint: 'Commune sur la carte', search: place.name, action: 'locate-place', id: PLACES.indexOf(place), icon: 'map' })),
  ...RESOURCES.map(resource => ({ name: resource.title, hint: `${resource.type} · ${territoryFor(resource.territory).short}`, search: `${resource.title} ${resource.detail} ${resource.type}`, action: 'document', id: resource.id, icon: 'file' })),
  { name: 'Modèle Urbanité–Ruralité', hint: 'Outil du studio', search: 'modele urbanite ruralite arborescence critères', action: 'model', id: '', icon: 'layers' },
];

function showSearch() {
  dialogContent('search', '', 'Rechercher dans l’atlas', `
    <label class="field-search">${icon('search')}<input type="search" id="global-query" data-autofocus aria-label="Rechercher un terrain, une commune ou une archive" placeholder="Terrain, commune, archive…" autocomplete="off"></label>
    <div id="search-results" class="search-results"></div><span id="search-count" class="visually-hidden" role="status"></span>`);
  searchResults('');
}

function searchResults(query) {
  const terms = normalized(query);
  const results = terms ? SEARCH_INDEX.filter(result => matches(result.search, query)).sort((a, b) => Number(!normalized(a.name).startsWith(terms)) - Number(!normalized(b.name).startsWith(terms))).slice(0, 10) : SEARCH_INDEX.slice(0, TERRITORIES.length);
  document.querySelector('#search-results').innerHTML = results.length ? results.map(result => `
    <button type="button" class="search-result" data-action="${result.action}" data-id="${result.id}">${icon(result.icon)}<span><strong>${result.name}</strong><small>${result.hint}</small></span>${icon('chevron')}</button>`).join('')
    : '<p class="empty-state">Aucun résultat. Essayez le nom d’une commune ou un autre mot-clé.</p>';
  document.querySelector('#search-count').textContent = countLabel(results.length, 'résultat', 'résultats');
}

function openResource(id, keepQueue = false) {
  const resource = RESOURCES.find(item => item.id === id);
  if (!resource) return;
  if (!keepQueue) {
    const visibleDocs = dialogKind !== 'search' && activePage === 'archives' ? [...document.querySelectorAll('#archive-grid [data-id]')].map(el => el.dataset.id) : [];
    imageQueue = visibleDocs.includes(id) ? visibleDocs : RESOURCES.filter(item => item.territory === resource.territory).map(item => item.id);
  }
  currentImage = id;
  const position = imageQueue.indexOf(id);
  dialogContent('image', `${resource.type} · ${territoryFor(resource.territory).short}`, resource.title, `
    <img class="resource-image" src="media/${resource.image}" alt="${resource.title}">
    <p>${resource.detail}</p>
    <div class="document-actions"><div class="button-group"><button type="button" class="button square" data-action="previous-document" aria-label="Document précédent" ${position <= 0 ? 'disabled' : ''}>${icon('back')}</button><span>${position + 1} / ${imageQueue.length}</span><button type="button" class="button square" data-action="next-document" aria-label="Document suivant" ${position >= imageQueue.length - 1 ? 'disabled' : ''}>${icon('chevron')}</button></div>
    <a class="button" href="${originalImage(resource.original)}" target="_blank" rel="noopener">Fichier original ${icon('link')}</a></div>`, 'resource-dialog');
}

function imageStep(direction) {
  const next = imageQueue[imageQueue.indexOf(currentImage) + direction];
  if (next) {
    openResource(next, true);
    const target = overlay.querySelector(`[data-action="${direction > 0 ? 'next' : 'previous'}-document"]:not(:disabled)`) || overlay.querySelector('[data-action="close"]');
    target.focus();
  }
}

function showShare() {
  const url = new URL(location.href);
  const params = activePage === 'comparer'
    ? { a: compare.a, b: compare.b, sync: compare.sync ? '1' : '0', t: compare.terrain, va: viewParam(compare.views[0]), vb: viewParam(compare.views[1]) }
    : { v: viewParam(atlas.view), l: atlas.layers.join(','), mode: atlas.mode, t: atlas.selected };
  url.hash = `${activePage}?${new URLSearchParams(params)}`;
  dialogContent('share', '', 'Partager cette vue', `<p>${url.protocol === 'file:' ? 'Ce lien local fonctionne sur cet ordinateur. Après hébergement, le lien de la vue peut être envoyé à d’autres personnes.' : 'Le lien conserve le cadrage, les couches et le mode d’affichage.'}</p>
    <label class="share-field" for="share-url">Lien de la vue<input id="share-url" data-autofocus readonly value="${esc(url.href)}"></label>
    <div class="button-group">${button('copy-share', 'Copier le lien', 'copy', 'primary')}<span id="copy-status" class="muted" role="status"></span></div>`);
  document.querySelector('#share-url').select();
}

async function copyShare() {
  const field = document.querySelector('#share-url');
  const feedback = document.querySelector('#copy-status');
  try {
    if (!navigator.clipboard) throw new Error('clipboard');
    await navigator.clipboard.writeText(field.value);
    feedback.textContent = 'Lien de la vue copié.';
  } catch {
    field.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch { /* The selected link remains available for manual copy. */ }
    feedback.textContent = copied ? 'Lien de la vue copié.' : 'Lien sélectionné. Appuyez sur Ctrl+C ou ⌘C pour le copier.';
  }
}

function exportNotebook() {
  const sections = TERRITORIES.filter(terrain => notebook[terrain.id]?.pinned || notebook[terrain.id]?.note.trim()).map(terrain => {
    const note = notebook[terrain.id].note.trim();
    return `## ${terrain.name}\n\n${terrain.location}${note ? `\n\n${note}` : ''}`;
  });
  if (!sections.length) return;
  const file = new Blob([`# Carnet de terrain · Atlas de la Brière\n\n${sections.join('\n\n')}\n`], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'carnet-briere.md';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function locate(coords, id = '') {
  if (overlay.open) overlay.close();
  const view = { lon: coords[0], lat: coords[1], zoom: 2.15 };
  atlas.mode = 'map';
  atlas.selected = id;
  if (activePage !== 'atlas') {
    go('atlas', { v: viewParam(view), mode: 'map', t: id });
    return;
  }
  updateMapMode();
  activeMaps[0].target(coords, view.zoom);
  activeMaps[0].select(id);
  document.querySelector('#workspace').scrollIntoView({ block: 'nearest' });
  activeMaps[0].hit.focus({ preventScroll: true });
}

function toggleExpand() {
  const workspace = document.querySelector('#workspace');
  const expanded = workspace.classList.toggle('expanded');
  const trigger = workspace.querySelector('[data-action="expand"]');
  const text = expanded ? 'Réduire l’explorateur' : 'Agrandir l’explorateur';
  trigger.setAttribute('aria-label', text);
  trigger.title = text;
  trigger.innerHTML = icon(expanded ? 'collapse' : 'expand');
}

const actions = {
  'search': showSearch,
  'notebook': showNotebook,
  'inspect': button => inspect(button.dataset.id),
  'document': button => openResource(button.dataset.id),
  'close': () => overlay.close(),
  'model': () => go('modele'),
  'mode-map': () => { atlas.mode = 'map'; updateMapMode(); },
  'mode-list': () => { atlas.mode = 'list'; updateMapMode(); },
  'panel-terrains': () => { atlas.panel = 'terrains'; renderPanel(); },
  'panel-layers': () => { atlas.panel = 'layers'; atlas.mode = 'map'; updateMapMode(); renderPanel(); },
  'reset-layers': () => { atlas.layers = [...DEFAULT_LAYERS]; renderPanel(); document.querySelector('[data-action="reset-layers"]').focus(); },
  'share': showShare,
  'copy-share': copyShare,
  'expand': toggleExpand,
  'previous-document': () => imageStep(-1),
  'next-document': () => imageStep(1),
  'locate-terrain': button => locate(territoryFor(button.dataset.id).coords, button.dataset.id),
  'terrain-layers': button => {
    const terrain = territoryFor(button.dataset.id);
    atlas.layers = [...terrain.layers];
    atlas.panel = 'layers';
    if (activePage === 'atlas') renderPanel();
    locate(terrain.coords, terrain.id);
  },
  'locate-place': button => locate(PLACES[Number(button.dataset.id)].coords),
  'clear-archives': () => { Object.assign(archives, { query: '', terrain: '', type: '' }); go('archives', { t: '', q: '', type: '' }); },
  'pin-terrain': button => {
    const entry = notebook[button.dataset.id] ||= { note: '', pinned: false };
    entry.pinned = !entry.pinned;
    saveNotebook();
    button.setAttribute('aria-pressed', entry.pinned);
    button.innerHTML = `${icon(entry.pinned ? 'check' : 'bookmark')}<span>${entry.pinned ? 'Dans le carnet' : 'Ajouter au carnet'}</span>`;
  },
  'export-notebook': exportNotebook,
  'load-model': () => {
    document.querySelector('#model-access').innerHTML = `<h2>Interface du studio</h2><iframe src="${ORIGINAL_MODEL}" title="Modèle Urbanité–Ruralité du studio"></iframe><p><a href="${ORIGINAL_MODEL}" target="_blank" rel="noopener">Ouvrir sur le site de l’école ${icon('link')}</a></p>`;
    document.querySelector('#model-access iframe').focus();
  },
};

document.querySelectorAll('[data-icon]').forEach(element => { element.innerHTML = icon(element.dataset.icon); });
document.addEventListener('click', event => {
  const control = event.target.closest('[data-action]');
  if (control && !control.disabled) actions[control.dataset.action]?.(control);
  if (event.target === overlay && event.target.open) {
    const rect = overlay.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) overlay.close();
  }
  if (event.target.closest('.skip-link')) { event.preventDefault(); main.focus(); }
});

document.addEventListener('input', event => {
  const field = event.target;
  if (field.id === 'global-query') searchResults(field.value);
  if (field.id === 'archive-query') { archives.query = field.value; renderArchiveResults(); }
  if (field.dataset.note) {
    const entry = notebook[field.dataset.note] ||= { pinned: false, note: '' };
    entry.note = field.value.slice(0, 2500);
    saveNotebook();
  }
});

document.addEventListener('change', event => {
  const control = event.target;
  if (control.dataset.layer) {
    const id = control.dataset.layer;
    atlas.layers = control.checked ? [...new Set([...atlas.layers, id])] : atlas.layers.filter(layer => layer !== id);
    updateAtlasLayers();
  }
  if (control.id === 'archive-terrain') { archives.terrain = control.value; renderArchiveResults(); }
  if (control.id === 'archive-type') { archives.type = control.value; renderArchiveResults(); }
  if (control.id === 'preset-a' || control.id === 'preset-b') {
    const side = control.id.at(-1);
    compare[side] = control.value;
    updatePreset(side);
  }
  if (control.id === 'comparison-sync') {
    compare.sync = control.checked;
    if (compare.sync) activeMaps[0].setView(activeMaps[0].view);
  }
  if (control.id === 'comparison-terrain') {
    compare.terrain = control.value;
    const terrain = territoryFor(control.value);
    const view = terrain ? { lon: terrain.coords[0], lat: terrain.coords[1], zoom: 2 } : MAP_HOME;
    activeMaps.forEach((map, index) => { map.setView(view, false); compare.views[index] = { ...view }; });
  }
});

document.addEventListener('keydown', event => {
  const inputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
  if ((!inputFocused && event.key === '/') || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k')) {
    event.preventDefault(); showSearch(); return;
  }
  if (overlay.open && dialogKind === 'image' && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault(); imageStep(event.key === 'ArrowRight' ? 1 : -1); return;
  }
  if (overlay.open && dialogKind === 'search' && ['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) {
    const field = document.querySelector('#global-query');
    const results = [...document.querySelectorAll('.search-result')];
    const index = results.indexOf(document.activeElement);
    if (event.key === 'Enter' && document.activeElement === field && results.length) {
      event.preventDefault(); results[0].click();
    } else if (event.key !== 'Enter') {
      event.preventDefault();
      const nextIndex = event.key === 'ArrowDown' ? Math.min(index + 1, results.length - 1) : index - 1;
      (results[nextIndex] || field).focus();
    }
  }
  if (event.key === 'Escape' && !overlay.open && document.querySelector('.workspace.expanded')) toggleExpand();
});

overlay.addEventListener('close', () => {
  if (overlay.open) return;
  dialogKind = '';
  if (opener?.isConnected && (document.activeElement === document.body || document.activeElement === overlay)) opener.focus({ preventScroll: true });
  opener = null;
});

window.addEventListener('hashchange', () => renderPage({ focus: true }));
saveNotebook();
renderPage();
