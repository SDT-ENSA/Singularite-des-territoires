const MAP_HOME = { lon: -2.25, lat: 47.36, zoom: 1 };
const LON_SCALE = Math.cos(47.37 * Math.PI / 180);
const DEFAULT_LAYERS = LAYERS.filter(layer => layer.visible).map(layer => layer.id);
const geometryBounds = new WeakMap();

function boundsOf(points) {
  if (!geometryBounds.has(points)) {
    let west = Infinity;
    let south = Infinity;
    let east = -Infinity;
    let north = -Infinity;
    for (let i = 0; i < points.length; i += 2) {
      west = Math.min(west, points[i]);
      south = Math.min(south, points[i + 1]);
      east = Math.max(east, points[i]);
      north = Math.max(north, points[i + 1]);
    }
    geometryBounds.set(points, { west, south, east, north });
  }
  return geometryBounds.get(points);
}

class AtlasMap {
  constructor(element, options = {}) {
    this.element = element;
    this.view = { ...MAP_HOME, ...options.view };
    this.layers = new Set(options.layers || DEFAULT_LAYERS);
    this.onView = options.onView;
    this.pins = options.pins !== false;
    this.points = new Map();
    this.selected = '';
    this.frame = 0;
    this.pointers = new Map();
    element.innerHTML = `
      <canvas aria-hidden="true"></canvas>
      <div class="map-hit" tabindex="0" role="region" aria-label="Carte de la Brière. Utilisez les flèches pour vous déplacer, plus et moins pour zoomer."></div>
      <div class="map-pins"></div>
      <div class="map-tools">
        <span class="north" aria-label="Nord">N<svg viewBox="0 0 16 17" aria-hidden="true"><path d="m8 2 5 12-5-3-5 3Z" fill="currentColor"/></svg></span>
        <div class="map-buttons">
          <button type="button" class="map-button" data-map="in" aria-label="Zoom avant" title="Zoom avant">${icon('plus')}</button>
          <button type="button" class="map-button" data-map="out" aria-label="Zoom arrière" title="Zoom arrière">${icon('minus')}</button>
          <button type="button" class="map-button" data-map="reset" aria-label="Recentrer la carte" title="Recentrer la carte">${icon('locate')}</button>
        </div>
      </div>
      <div class="map-info"><span class="map-scale"></span><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a></div>`;
    this.canvas = element.querySelector('canvas');
    this.hit = element.querySelector('.map-hit');
    this.scaleLabel = element.querySelector('.map-scale');
    if (this.pins) {
      const pinLayer = element.querySelector('.map-pins');
      for (const terrain of TERRITORIES) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `map-pin pin-${terrain.id}`;
        button.dataset.action = 'inspect';
        button.dataset.id = terrain.id;
        button.style.setProperty('--pin', terrain.color);
        button.setAttribute('aria-label', `Voir la fiche ${terrain.name}`);
        button.innerHTML = `<span class="pin-dot">${icon('pin')}</span><span class="pin-text">${terrain.marker}</span>`;
        pinLayer.append(button);
        this.points.set(terrain.id, button);
      }
    }
    this.bindGestures();
    this.observer = new ResizeObserver(() => this.measure());
    this.observer.observe(element);
    this.measure();
  }

  bindGestures() {
    this.element.querySelector('.map-buttons').addEventListener('click', event => {
      const action = event.target.closest('[data-map]')?.dataset.map;
      if (action === 'reset') this.setView(MAP_HOME);
      if (action === 'in') this.zoomBy(1.35);
      if (action === 'out') this.zoomBy(1 / 1.35);
    });
    this.hit.addEventListener('wheel', event => {
      if (!event.ctrlKey && document.activeElement !== this.hit) return;
      event.preventDefault();
      const bounds = this.hit.getBoundingClientRect();
      this.zoomBy(Math.exp(-event.deltaY * (event.deltaMode ? 0.045 : 0.002)), event.clientX - bounds.left, event.clientY - bounds.top);
    }, { passive: false });
    this.hit.addEventListener('keydown', event => {
      const moves = { ArrowLeft: [-80, 0], ArrowRight: [80, 0], ArrowUp: [0, -80], ArrowDown: [0, 80] };
      if (event.key in moves) this.pan(...moves[event.key]);
      else if (['+', '='].includes(event.key)) this.zoomBy(1.35);
      else if (event.key === '-') this.zoomBy(1 / 1.35);
      else if (event.key === 'Home') this.setView(MAP_HOME);
      else return;
      event.preventDefault();
    });
    this.hit.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      this.hit.setPointerCapture(event.pointerId);
      this.pointers.set(event.pointerId, [event.clientX, event.clientY]);
      this.hit.classList.add('dragging');
    });
    this.hit.addEventListener('pointermove', event => {
      const previous = this.pointers.get(event.pointerId);
      if (!previous) return;
      const point = [event.clientX, event.clientY];
      this.pointers.set(event.pointerId, point);
      const peer = [...this.pointers.entries()].find(([id]) => id !== event.pointerId)?.[1];
      if (!peer) {
        this.pan(previous[0] - point[0], previous[1] - point[1]);
        return;
      }
      const distance = ([x, y]) => Math.hypot(x - peer[0], y - peer[1]);
      const bounds = this.hit.getBoundingClientRect();
      this.pan((previous[0] - point[0]) / 2, (previous[1] - point[1]) / 2);
      this.zoomBy(distance(point) / Math.max(1, distance(previous)), (point[0] + peer[0]) / 2 - bounds.left, (point[1] + peer[1]) / 2 - bounds.top);
    });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      this.hit.addEventListener(name, event => {
        this.pointers.delete(event.pointerId);
        if (!this.pointers.size) this.hit.classList.remove('dragging');
      });
    }
    this.hit.addEventListener('dblclick', event => this.zoomBy(1.55, event.offsetX, event.offsetY));
  }

  measure() {
    this.width = this.element.clientWidth;
    this.height = this.element.clientHeight;
    if (!this.width || !this.height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * ratio);
    this.canvas.height = Math.round(this.height * ratio);
    this.context = this.canvas.getContext('2d');
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.base = Math.min(this.width / (0.44 * LON_SCALE), this.height / 0.23);
    this.schedule();
  }

  get scale() { return this.base * this.view.zoom; }

  project([lon, lat]) {
    return [this.width / 2 + (lon - this.view.lon) * this.scale * LON_SCALE, this.height / 2 - (lat - this.view.lat) * this.scale];
  }

  setView(view, announce = true) {
    this.view = {
      lon: Math.min(-1.98, Math.max(-2.55, view.lon)),
      lat: Math.min(47.55, Math.max(47.22, view.lat)),
      zoom: Math.min(6, Math.max(0.8, view.zoom)),
    };
    this.schedule();
    if (announce) this.onView?.(this.view);
  }

  pan(dx, dy) {
    this.setView({ ...this.view, lon: this.view.lon + dx / (this.scale * LON_SCALE), lat: this.view.lat - dy / this.scale });
  }

  zoomBy(factor, x = this.width / 2, y = this.height / 2) {
    const zoom = Math.min(6, Math.max(0.8, this.view.zoom * factor));
    const delta = (1 - this.view.zoom / zoom) / this.scale;
    this.setView({ lon: this.view.lon + (x - this.width / 2) * delta / LON_SCALE, lat: this.view.lat - (y - this.height / 2) * delta, zoom });
  }

  setLayers(layers) { this.layers = new Set(layers); this.schedule(); }

  select(id) { this.selected = id; this.schedule(); }

  target(coords, zoom = 2.05) { this.setView({ lon: coords[0], lat: coords[1], zoom }); }

  schedule() {
    if (!this.frame) this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      if (this.context && this.width && this.height) this.draw();
    });
  }

  path(points, close = false) {
    const ctx = this.context;
    const scaleX = this.scale * LON_SCALE;
    const scaleY = this.scale;
    const originX = this.width / 2 - this.view.lon * scaleX;
    const originY = this.height / 2 + this.view.lat * scaleY;
    for (let index = 0; index < points.length; index += 2) {
      const x = originX + points[index] * scaleX;
      const y = originY - points[index + 1] * scaleY;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    if (close) ctx.closePath();
  }

  inView(points) {
    const { west, south, east, north } = boundsOf(points);
    const bounds = this.drawBounds;
    return east > bounds.west && west < bounds.east && north > bounds.south && south < bounds.north;
  }

  polygons(shapes, fill, outline, width = 1, dash = []) {
    if (!shapes?.length) return;
    const ctx = this.context;
    ctx.fillStyle = fill || 'transparent';
    ctx.strokeStyle = outline || 'transparent';
    ctx.lineWidth = width;
    ctx.setLineDash(dash);
    for (const polygon of shapes) {
      if (!this.inView(polygon[0])) continue;
      ctx.beginPath();
      for (const ring of polygon) if (this.inView(ring)) this.path(ring, true);
      if (fill) ctx.fill('evenodd');
      if (outline) ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  lines(shapes, color, width, dash = []) {
    if (!shapes?.length) return;
    const ctx = this.context;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dash);
    ctx.beginPath();
    for (const line of shapes) if (this.inView(line)) this.path(line);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawGrid() {
    const ctx = this.context;
    const step = this.view.zoom > 2.5 ? 0.015 : 0.03;
    const boundsLon = this.width / (2 * this.scale * LON_SCALE);
    const boundsLat = this.height / (2 * this.scale);
    ctx.beginPath();
    for (let lon = Math.floor((this.view.lon - boundsLon) / step) * step; lon < this.view.lon + boundsLon; lon += step) {
      const [x] = this.project([lon, 0]); ctx.moveTo(x, 0); ctx.lineTo(x, this.height);
    }
    for (let lat = Math.floor((this.view.lat - boundsLat) / step) * step; lat < this.view.lat + boundsLat; lat += step) {
      const [, y] = this.project([0, lat]); ctx.moveTo(0, y); ctx.lineTo(this.width, y);
    }
    ctx.strokeStyle = '#b2c5ad25';
    ctx.lineWidth = 0.65;
    ctx.stroke();
  }

  drawLabels() {
    const ctx = this.context;
    const pins = TERRITORIES.map(terrain => this.project(terrain.coords));
    ctx.font = 'italic 15px Georgia, serif';
    ctx.fillStyle = '#9bbdb6b5';
    for (const [name, coords] of [['Océan Atlantique', [-2.484, 47.252]], ['Estuaire de la Loire', [-2.145, 47.271]]]) {
      const [x, y] = this.project(coords);
      ctx.fillText(name, x, y);
    }
    for (const place of PLACES) {
      if (!place.major && this.width < 600 && this.view.zoom < 1.35) continue;
      const [x, y] = this.project(place.coords);
      if (x < 12 || x > this.width - 12 || y < 12 || y > this.height - 12) continue;
      ctx.beginPath(); ctx.arc(x, y, place.major ? 2.2 : 1.6, 0, Math.PI * 2);
      ctx.fillStyle = '#d5dcbe'; ctx.fill();
      ctx.font = `${place.major ? '600 12' : '400 11'}px "DM Sans", sans-serif`;
      ctx.textAlign = place.align === 'left' ? 'right' : 'center';
      const tx = place.align === 'left' ? x - 7 : x;
      const ty = y + (place.align === 'top' ? -8 : place.align === 'left' ? 3 : 14);
      const overlapsPin = this.pins && pins.some(([px, py]) => Math.abs(ty - py) < 17 && tx > px - 48 && tx < px + 153);
      if (!overlapsPin) {
        ctx.strokeStyle = '#1e372c'; ctx.lineWidth = 3.1; ctx.strokeText(place.name, tx, ty);
        ctx.fillStyle = place.major ? '#f0eedc' : '#c7d1bb'; ctx.fillText(place.name, tx, ty);
      }
      ctx.textAlign = 'start';
    }
  }

  draw() {
    const ctx = this.context;
    const geo = window.ATLAS_GEO || {};
    const spanX = (this.width / 2 + 3) / (this.scale * LON_SCALE);
    const spanY = (this.height / 2 + 3) / this.scale;
    this.drawBounds = { west: this.view.lon - spanX, east: this.view.lon + spanX, south: this.view.lat - spanY, north: this.view.lat + spanY };
    const bg = ctx.createLinearGradient(0, this.height, this.width, 0);
    bg.addColorStop(0, '#20382f'); bg.addColorStop(1, '#2b4535');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, this.width, this.height);
    this.polygons(geo.sea, '#1d3938');
    this.polygons(geo.forest, '#354c37');
    this.drawGrid();
    if (this.layers.has('wetland')) this.polygons(geo.wetland, '#577c53', '#85a66b9e', 0.75);
    if (this.layers.has('water')) {
      this.polygons(geo.water, '#3e7876', '#73b1a385', 0.7);
      this.lines(geo.waterway, '#6ea99f', this.view.zoom > 1.5 ? 1.1 : 0.72);
    }
    if (this.layers.has('urban')) this.polygons(geo.urban, '#a28e5c6d', '#cbb48261', 0.65);
    if (this.layers.has('routes')) {
      this.lines(geo.roadMinor, '#b1bba452', 0.8);
      this.lines(geo.roadMajor, '#cecdad9c', 1.22);
      this.lines(geo.rail, '#c9b09a90', 0.9, [3, 3]);
    }
    if (this.layers.has('communes')) this.polygons(geo.communes, null, '#ead9ab87', 0.85, [3, 4]);
    if (this.layers.has('park')) this.polygons(geo.park, '#b1c9780b', '#d2e991a6', 1.3, [5, 4]);
    this.drawLabels();
    for (const terrain of TERRITORIES) {
      const button = this.points.get(terrain.id);
      if (!button) continue;
      const [x, y] = this.project(terrain.coords);
      button.hidden = x < 20 || x > this.width - 20 || y < 25 || y > this.height - 25;
      button.style.left = `${x}px`;
      button.style.top = `${y}px`;
      const rightClearance = terrain.marker.length * 7 + 67;
      button.classList.toggle('pin-flipped', x > this.width - rightClearance);
      button.classList.toggle('selected', this.selected === terrain.id);
    }
    const maxKm = 86 * 111.2 / this.scale;
    const km = [0.25, 0.5, 1, 2, 5, 10].filter(value => value <= maxKm).at(-1) || 0.25;
    this.scaleLabel.style.width = `${km * this.scale / 111.2}px`;
    this.scaleLabel.textContent = km < 1 ? `${km * 1000} m` : `${km} km`;
  }

  destroy() {
    this.observer.disconnect();
    cancelAnimationFrame(this.frame);
  }
}
