(() => {
  const data = window.OBSERVATORY_DATA;
  let activeIndicator = 0, activeYear = data.years.length - 1, night = true, playing = false, timer, map, districtLayer, mapMode = 'simulation';
  const $ = (s) => document.querySelector(s);
  const fmt = (number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(number);

  function renderControls() {
    $('#indicatorList').innerHTML = data.indicators.map((item, index) => `<label class="indicator ${index === activeIndicator ? 'active' : ''}"><input type="radio" name="indicator" value="${index}" ${index === activeIndicator ? 'checked' : ''}/><span class="radio"></span><span>${item.label}</span></label>`).join('');
    $('#yearButtons').innerHTML = data.years.map((year, index) => `<button class="${index === activeYear ? 'selected' : ''}" data-year="${index}">${year}</button>`).join('');
    document.querySelectorAll('input[name=indicator]').forEach(el => el.addEventListener('change', e => { activeIndicator = Number(e.target.value); update(); }));
    document.querySelectorAll('[data-year]').forEach(el => el.addEventListener('click', () => { activeYear = Number(el.dataset.year); update(); }));
  }
  const districtLocations = [[52.392,4.84],[52.385,4.858],[52.377,4.874],[52.394,4.881],[52.367,4.882],[52.354,4.869],[52.345,4.89],[52.397,4.906],[52.381,4.91],[52.367,4.928],[52.389,4.932],[52.376,4.951],[52.356,4.937],[52.346,4.92],[52.337,4.9],[52.358,4.966],[52.373,4.975],[52.392,4.964],[52.403,4.944],[52.414,4.918],[52.408,4.888],[52.421,4.87],[52.43,4.905],[52.412,4.942],[52.388,4.99]];
  const colorFor = value => value > 23 ? '#75e0cc' : value > 19 ? '#a997f9' : value > 16 ? '#7560d1' : '#41376f';
  function districtValue(i) { return data.indicators[i % data.indicators.length].values[activeYear] || 0; }
  function initMap() {
    if (!window.L) return renderFallbackDistricts();
    map = L.map('mapCanvas', { zoomControl: false, attributionControl: true, minZoom: 10, maxZoom: 16, scrollWheelZoom: true }).setView([52.372, 4.9], 12);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    const tileUrl = data.mapboxToken ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/512/{z}/{x}/{y}?access_token=${data.mapboxToken}` : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    L.tileLayer(tileUrl, { subdomains: 'abcd', maxZoom: 20, attribution: data.mapboxToken ? '© Mapbox © OpenStreetMap' : '© OpenStreetMap © CARTO' }).addTo(map);
    map.attributionControl.setPrefix(''); renderDistricts();
  }
  function renderFallbackDistricts() { $('#districts').innerHTML = data.districts.map((name, i) => `<button class="district d${i}" style="--v:${districtValue(i)}" title="${name}"><span>${name}</span></button>`).join(''); }
  function renderDistricts() {
    if (!map) return renderFallbackDistricts();
    if (districtLayer) districtLayer.remove(); districtLayer = L.layerGroup().addTo(map);
    data.districts.forEach((name, i) => { const value = districtValue(i), radius = mapMode === 'simulation' ? 700 + value * 32 : 540; const circle = L.circle(districtLocations[i], { radius, color: '#d8d0ff', weight: 1, fillColor: colorFor(value), fillOpacity: mapMode === 'simulation' ? .58 : .42 }).addTo(districtLayer); circle.bindTooltip(`<strong>${name}</strong><br>${value} propriétés requises`, { direction:'top', offset:[0,-8], opacity:.96 }); circle.on('click', () => { $('#mapStatus').textContent = `${name} · ${value} propriétés requises`; map.flyTo(districtLocations[i], 13, { duration:.7 }); }); });
  }
  function update() {
    renderControls(); renderDistricts();
    const item = data.indicators[activeIndicator];
    $('#mapIndicatorName').textContent = item.label;
    $('#mapYear').textContent = `${fmt(item.values[activeYear])} ${item.unit}`;
    $('#mapStatus').textContent = `${item.label} · données du référentiel chargées`;
  }
  $('#playButton').addEventListener('click', () => {
    playing = !playing; $('#playButton').classList.toggle('running', playing); $('#playButton span').textContent = playing ? 'Pause' : 'Lire les années';
    clearInterval(timer); if (playing) timer = setInterval(() => { activeYear = (activeYear + 1) % data.years.length; update(); }, 1100);
  });
  $('#nightButton').addEventListener('click', () => { night = !night; $('#mapCanvas').classList.toggle('day', !night); $('#nightButton').textContent = night ? '☾' : '☀'; });
  $('#resetButton').addEventListener('click', () => { activeIndicator = 0; activeYear = data.years.length - 1; if(map) map.flyTo([52.372,4.9],12,{duration:.6}); update(); });
  $('#tourButton').addEventListener('click', () => { let i = 0; const tour = setInterval(() => { const point=districtLocations[i++ % districtLocations.length]; if(map) map.flyTo(point, 13, {duration:.55}); if(i > districtLocations.length) { clearInterval(tour); if(map) map.flyTo([52.372,4.9],12,{duration:.6}); } }, 700); });
  $('#fullButton').addEventListener('click', () => document.documentElement.requestFullscreen?.());
  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('[data-mode]').forEach(b => b.classList.remove('selected')); button.classList.add('selected'); mapMode=button.dataset.mode; $('#mapCanvas').classList.toggle('flat', mapMode === 'map'); renderDistricts(); }));
  $('#districtCount').textContent = data.city.districtCount; initMap(); update();
})();
