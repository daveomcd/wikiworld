import './style.css';
import { geoNaturalEarth1, geoPath, geoGraticule10 } from 'd3-geo';
import { feature } from 'topojson-client';
import land from './data/land-110m.json';
import { events, regions, sources, presets } from './data/history.js';
import { formatYear, formatRange, eventsAt, regionById, validYear, moveYear, parseState, MIN_YEAR, MAX_YEAR } from './history-utils.js';

const icons = {
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 6h14M5 18h14"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  book: '<path d="M12 5v16M3 4c3-1 6-1 9 1 3-2 6-2 9-1v15c-3-1-6-1-9 1-3-2-6-2-9-1z"/>',
  compare: '<rect x="3" y="5" width="7" height="14" rx="1"/><rect x="14" y="5" width="7" height="14" rx="1"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  play: '<path d="m8 4 12 8-12 8z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  reset: '<path d="M3 10a9 9 0 1 1 1 7M3 4v6h6"/>',
};
const icon = (name, extra = '') => `<svg class="icon ${extra}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const evidence = { archaeology: 'Archaeological evidence', documented: 'Written records', mixed: 'Records & archaeology' };
let state = parseState(location.search);
let playing = null;
let selectedEvent = null;
let zoom = 1;
let pan = { x: 0, y: 0 };

document.querySelector('#app').innerHTML = `
  <a class="skip-link" href="#timeline">Skip to timeline</a>
  <header class="site-header">
    <a class="brand" href="./" aria-label="Meanwhile home">${icon('globe')}<span>meanwhile<span class="brand-dot">.</span></span></a>
    <span class="brand-description">A WORLD HISTORY ATLAS</span>
    <button class="text-button about-button" id="about-button">${icon('book')}<span>About the atlas</span></button>
  </header>
  <main>
    <section class="intro" aria-labelledby="page-title">
      <div><p class="eyebrow">ONE MOMENT. MANY WORLDS.</p><h1 id="page-title">History happened <em>everywhere.</em></h1><p class="intro-copy">Choose a moment in time. Discover what was happening somewhere else.</p></div>
      <div class="search-wrap"><label class="search-label" for="history-search">Find a moment</label><div class="search-input">${icon('search')}<input id="history-search" placeholder="Try Alexander, Edo, or 1492…" autocomplete="off" aria-controls="search-results" aria-expanded="false"/><kbd>/</kbd></div><div id="search-results" class="search-results" hidden></div></div>
    </section>
    <nav class="presets" aria-label="Explore a historical moment"><span>START EXPLORING</span>${presets.map(p => `<button data-preset="${p.id}" class="preset">${p.label}</button>`).join('')}</nav>
    <section class="atlas" aria-label="Interactive world history atlas">
      <div class="map-and-time">
        <div class="map-shell">
          <div class="map-heading"><div><span class="eyebrow">THE WORLD IN</span><h2 id="map-year"></h2></div><span class="map-hint">Select a region to explore</span><label class="mobile-map-region">Explore a region<select id="map-region-select">${regions.map(r => `<option value="${r.id}">${r.name}</option>`).join('')}</select></label></div>
          <svg id="world-map" viewBox="0 0 1000 530" role="group" aria-label="World map with selectable historical regions"><defs><radialGradient id="ocean-glow"><stop offset="0" stop-color="#283c41"/><stop offset="1" stop-color="#18282f"/></radialGradient></defs><rect width="1000" height="530" fill="url(#ocean-glow)"/><g id="map-geography"></g><g class="ocean-labels" aria-hidden="true"><text x="105" y="345">PACIFIC OCEAN</text><text x="406" y="305">ATLANTIC</text><text x="410" y="325">OCEAN</text><text x="695" y="385">INDIAN OCEAN</text></g><g id="map-markers"></g></svg>
          <div class="map-footer"><span class="map-legend"><i></i> <span id="coverage-count"></span> regions with entries</span><div class="map-tools"><button id="zoom-in" class="icon-button" aria-label="Zoom in">${icon('plus')}</button><button id="zoom-out" class="icon-button" aria-label="Zoom out">${icon('minus')}</button><button id="zoom-reset" class="icon-button" aria-label="Reset map">${icon('reset')}</button></div></div>
          <p class="map-disclaimer">Geographic reference points · not historical borders</p>
        </div>
        <section class="timeline" id="timeline" aria-label="Choose a year">
          <div class="timeline-top"><div class="timeline-title">${icon('globe')}<span>Travel through time</span></div><form id="year-form"><label for="year-input">Go to year</label><input id="year-input" type="number" min="1" max="1900" required aria-describedby="year-error"/><select id="year-era" aria-label="Year era"><option value="bce">BCE</option><option value="ce">CE</option></select><button class="go-button" type="submit">Go</button></form></div>
          <p id="year-error" class="form-error" role="alert" hidden></p>
          <div class="slider-row"><button id="play" class="play-button" aria-label="Play timeline">${icon('play')}</button><div class="slider-track"><label class="sr-only" for="year-slider">Year</label><input id="year-slider" type="range" min="-1000" max="1899" step="1"/><div class="timeline-ticks"><span>1000 BCE</span><span>500 BCE</span><span>1 CE</span><span>500 CE</span><span>1000 CE</span><span>1500 CE</span><span>1900 CE</span></div></div></div>
          <div class="timeline-bottom"><span id="period-caption">During Alexander’s campaigns</span><div class="step-controls"><button id="previous-year" class="icon-button" aria-label="Step backward">${icon('chevron', 'flipped')}</button><select id="year-step" aria-label="Timeline step size"><option value="1">1 year</option><option value="10" selected>10 years</option><option value="50">50 years</option><option value="100">100 years</option></select><button id="next-year" class="icon-button" aria-label="Step forward">${icon('chevron')}</button></div></div>
        </section>
      </div>
      <aside class="detail-panel" aria-label="Selected region" id="detail-panel"></aside>
    </section>
    <section id="comparison" class="comparison" aria-labelledby="comparison-title" hidden></section>
    <section class="elsewhere" aria-labelledby="elsewhere-title"><div class="section-heading"><div><p class="eyebrow">THE BIGGER PICTURE</p><h2 id="elsewhere-title">Elsewhere at the same time</h2></div><span class="section-hint">Different places. A shared moment.</span></div><div id="region-cards" class="region-cards"></div></section>
    <footer class="site-footer"><span>${icon('globe')} A world of stories, connected by time.</span><button class="text-button" id="sources-button">Sources & how to read this map</button><a href="https://github.com/daveomcd/wikiworld" target="_blank" rel="noopener noreferrer">View on GitHub</a></footer>
  </main>
  <dialog id="about-dialog" aria-labelledby="about-title"><button id="close-about" class="icon-button dialog-close" aria-label="Close about">${icon('close')}</button><p class="eyebrow">A NOTE ON PERSPECTIVE</p><h2 id="about-title">A map of connections,<br>and of what we know.</h2><p>Meanwhile puts regional histories beside one another. Choose a year, explore the map, and add up to three regions to a comparison.</p><h3>Evidence comes in different forms</h3><p><strong>Written records</strong> draw on texts and documents. <strong>Archaeological evidence</strong> draws on material remains. <strong>Records & archaeology</strong> combines them. These labels describe the evidence, not a ranking of societies or a certainty score.</p><h3>Read periods as periods</h3><p>Summaries describe developments across a date range, not events that happened in every selected year. “c.” means approximately. Transitions can span centuries, and period dates can differ between scholars.</p><h3>A curated starting point</h3><p id="collection-note"></p><p>Empty regions mean there is no entry in this collection for that year. They do not mean that nothing happened there. Broad regions and selected case studies cannot represent every community.</p><p>The coastline is a modern geographic reference from <a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noopener noreferrer">Natural Earth</a>, in the public domain. Markers do not represent borders, territorial claims, or precise settlement locations. BCE/CE dating has no year zero.</p><h3>Sources</h3><p>Each entry links to its supporting sources. Summaries are editorial syntheses of those sources, not quotations or live-generated answers.</p><div id="source-list"></div></dialog>
  <div id="status" class="sr-only" role="status" aria-live="polite"></div>
  <div id="toast" class="toast" role="status" hidden></div>
`;

const $ = selector => document.querySelector(selector);
const projection = geoNaturalEarth1().scale(180).translate([500, 277]);
const path = geoPath(projection);
$('#map-geography').innerHTML = `<path class="graticule" d="${path(geoGraticule10())}"/><path class="land" d="${path(feature(land, land.objects.land))}"/>`;

function syncUrl() {
  const url = new URL(location.href);
  url.searchParams.set('year', state.year);
  url.searchParams.set('region', state.region);
  if (state.compare.length) url.searchParams.set('compare', state.compare.join(','));
  else url.searchParams.delete('compare');
  history.replaceState(null, '', url);
}

function renderMap() {
  $('#map-year').innerHTML = `${Math.abs(state.year)} <span>${state.year < 0 ? 'BCE' : 'CE'}</span>`;
  $('#coverage-count').textContent = regions.filter(r => eventsAt(state.year, r.id).length).length;
  $('#map-markers').innerHTML = regions.map(region => {
    const available = eventsAt(state.year, region.id).length > 0;
    const [px, py] = projection(region.coordinates);
    const x = (px - 500) * zoom + 500 + pan.x, y = (py - 265) * zoom + 265 + pan.y;
    const active = state.region === region.id;
    return `<g class="marker ${active ? 'selected' : ''} ${available ? '' : 'unavailable'}" transform="translate(${x},${y})" tabindex="0" role="button" aria-label="${region.name}, ${available ? 'explore history' : 'no entry for this year'}" aria-pressed="${active}" data-region="${region.id}"><circle class="marker-hit" r="22"/><circle class="marker-halo" r="14"/><circle class="marker-ring" r="8"/><circle class="marker-core" r="4"/><text x="${region.label[0]}" y="${region.label[1]}" text-anchor="${region.id === 'japan' ? 'start' : 'middle'}">${region.name}</text></g>`;
  }).join('');
  $('#map-geography').setAttribute('transform', `translate(${500 + pan.x} ${265 + pan.y}) scale(${zoom}) translate(-500 -265)`);
  $('.ocean-labels').style.opacity = zoom > 1 ? 0 : 1;
}

function sourceLinks(event) {
  return event.sources.map(key => `<a href="${sources[key].url}" target="_blank" rel="noopener noreferrer">${icon('book')}<span>${escapeHtml(sources[key].title)}<small>${escapeHtml(sources[key].publisher)}</small></span></a>`).join('');
}

function renderDetail() {
  const region = regionById(state.region);
  const regionalEvents = eventsAt(state.year, state.region);
  const event = regionalEvents.find(e => e.id === selectedEvent) || regionalEvents[0];
  const compare = state.compare.includes(state.region);
  $('#detail-panel').innerHTML = `<div class="detail-kicker"><span class="eyebrow">MEANWHILE IN</span><span class="detail-year">${formatYear(state.year)}</span></div><div class="region-select-wrap"><select id="region-select" aria-label="Choose region">${regions.map(r => `<option value="${r.id}" ${r.id === state.region ? 'selected' : ''}>${r.name}</option>`).join('')}</select></div><p class="region-place">${region.place}</p>${event ? `
    ${regionalEvents.length > 1 ? `<div class="event-switcher" aria-label="Stories in this region">${regionalEvents.map(e => `<button data-event="${e.id}" class="${e.id === event.id ? 'active' : ''}">${e.culture}</button>`).join('')}</div>` : ''}
    <div class="story-divider"></div><span class="evidence-badge ${event.type}"><i></i>${evidence[event.type]}</span><h2 class="story-title">${event.title}</h2><p class="culture">${event.culture}</p><p class="date-range">${formatRange(event)}</p><p class="story-summary">${event.summary}</p><details class="context-details"><summary>More context <span>+</span></summary><p>${event.detail}</p>${event.note ? `<p class="date-note">${event.note}</p>` : ''}</details><div class="story-sources"><span class="eyebrow">FOLLOW THE EVIDENCE</span>${sourceLinks(event)}</div>` : `<div class="empty-region">${icon('book')}<h2>A story still to add.</h2><p>No entry in this collection covers ${region.name} in ${formatYear(state.year)}. This is a gap in the atlas, not in the region’s history.</p>${nearestButton(region.id)}</div>`}<button class="compare-button ${compare ? 'is-added' : ''}" data-compare="${region.id}">${icon('compare')}${compare ? 'Remove from comparison' : 'Add to comparison'}</button>`;
}

function nearestButton(regionId) {
  const nearest = events.filter(e => e.region === regionId).sort((a, b) => Math.min(Math.abs(a.start - state.year), Math.abs(a.end - state.year)) - Math.min(Math.abs(b.start - state.year), Math.abs(b.end - state.year)))[0];
  if (!nearest) return '';
  const year = Math.max(MIN_YEAR, Math.min(MAX_YEAR, state.year < nearest.start ? nearest.start : nearest.end));
  return `<button class="nearest-button" data-jump-year="${year}">See an entry in ${formatYear(year)}</button>`;
}

function renderCards() {
  const available = regions.filter(r => r.id !== state.region && eventsAt(state.year, r.id).length);
  $('#region-cards').innerHTML = available.length ? available.map(r => {
    const e = eventsAt(state.year, r.id)[0];
    return `<article class="region-card"><div class="card-top"><span>${r.name}</span><span class="evidence-dot ${e.type}" title="${evidence[e.type]}"></span></div><button class="card-open" data-region="${r.id}"><h3>${e.title}</h3></button><p>${e.summary}</p><div class="card-bottom"><span>${e.culture}</span><button class="icon-button ${state.compare.includes(r.id) ? 'is-added' : ''}" data-compare="${r.id}" aria-label="${state.compare.includes(r.id) ? 'Remove' : 'Add'} ${r.name} ${state.compare.includes(r.id) ? 'from' : 'to'} comparison">${icon('compare')}</button></div></article>`;
  }).join('') : '<p class="empty-cards">No other regions have entries for this year yet. Try a nearby date or one of the suggested moments.</p>';
}

function renderComparison() {
  const panel = $('#comparison');
  panel.hidden = !state.compare.length;
  panel.innerHTML = `<div class="section-heading"><div><p class="eyebrow">SIDE BY SIDE · ${formatYear(state.year)}</p><h2 id="comparison-title">One moment, different worlds.</h2></div><button class="text-button" id="clear-comparison">Clear comparison</button></div><div class="comparison-grid">${state.compare.map(id => {
    const r = regionById(id), active = eventsAt(state.year, id);
    return `<article class="comparison-card"><div class="card-top"><h3>${r.name}</h3><button class="icon-button" data-compare="${id}" aria-label="Remove ${r.name} from comparison">${icon('close')}</button></div>${active.length ? active.map(e => `<div class="comparison-story"><span class="evidence-badge ${e.type}"><i></i>${evidence[e.type]}</span><h4>${e.title}</h4><span class="date-range">${formatRange(e)}</span><p>${e.summary}</p><a href="${sources[e.sources[0]].url}" target="_blank" rel="noopener noreferrer">Read source</a></div>`).join('') : '<p>No entry in this collection covers this region in the selected year.</p>'}</article>`;
  }).join('')}${state.compare.length < 3 ? '<div class="comparison-placeholder">'+icon('compare')+'<p>Add another region<br>to see its story alongside.</p></div>' : ''}</div>`;
}

function render({ announce = false } = {}) {
  renderMap(); renderDetail(); renderCards(); renderComparison();
  $('#year-slider').value = state.year < 0 ? state.year : state.year - 1;
  $('#year-slider').setAttribute('aria-valuetext', formatYear(state.year));
  $('#year-input').value = Math.abs(state.year);
  $('#year-era').value = state.year < 0 ? 'bce' : 'ce';
  $('#map-region-select').value = state.region;
  const preset = presets.find(p => p.year === state.year);
  $('#period-caption').textContent = preset?.subtitle || 'A snapshot across the centuries';
  document.querySelectorAll('[data-preset]').forEach(b => { const active = presets.find(p => p.id === b.dataset.preset).year === state.year; b.classList.toggle('active', active); b.setAttribute('aria-pressed', active); });
  $('#previous-year').disabled = state.year === MIN_YEAR;
  $('#next-year').disabled = state.year === MAX_YEAR;
  syncUrl();
  if (announce) $('#status').textContent = `Showing ${formatYear(state.year)}. ${regionById(state.region).name} selected.`;
}

function setYear(year, announce = true) {
  if (!validYear(year)) return;
  state.year = year; selectedEvent = null;
  $('#year-error').hidden = true;
  render({ announce });
}
function setRegion(id) {
  if (!regionById(id)) return;
  state.region = id; selectedEvent = null;
  render({ announce: true });
}
function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => { $('#toast').hidden = true; }, 3500); }
function toggleCompare(id) {
  if (state.compare.includes(id)) state.compare = state.compare.filter(r => r !== id);
  else if (state.compare.length < 3) { state.compare.push(id); toast(`${regionById(id).name} added. Comparison is below the map.`); }
  else { toast('You can compare three regions. Remove one to add another.'); return; }
  renderDetail(); renderCards(); renderComparison(); syncUrl();
}
function stopPlaying() { clearInterval(playing); playing = null; $('#play').innerHTML = icon('play'); $('#play').setAttribute('aria-label', 'Play timeline'); }
function zoomMap(value) { zoom = Math.max(1, Math.min(3, value)); if (zoom === 1) pan = { x: 0, y: 0 }; renderMap(); $('#zoom-in').disabled = zoom === 3; $('#zoom-out').disabled = zoom === 1; }

document.addEventListener('click', event => {
  const region = event.target.closest('[data-region]');
  const compare = event.target.closest('[data-compare]');
  const presetButton = event.target.closest('[data-preset]');
  const eventButton = event.target.closest('[data-event]');
  const jump = event.target.closest('[data-jump-year]');
  if (region) setRegion(region.dataset.region);
  if (compare) toggleCompare(compare.dataset.compare);
  if (presetButton) { const preset = presets.find(p => p.id === presetButton.dataset.preset); stopPlaying(); state.region = preset.region; state.compare = [preset.reference, preset.region]; setYear(preset.year); }
  if (eventButton) { selectedEvent = eventButton.dataset.event; renderDetail(); }
  if (jump) { stopPlaying(); setYear(Number(jump.dataset.jumpYear)); }
  if (event.target.closest('#clear-comparison')) { state.compare = []; render(); }
  if (!event.target.closest('.search-wrap')) closeSearch();
});
document.addEventListener('change', event => { if (['region-select', 'map-region-select'].includes(event.target.id)) setRegion(event.target.value); });
document.addEventListener('keydown', event => {
  if (event.target.matches('.marker') && ['Enter', ' '].includes(event.key)) { event.preventDefault(); setRegion(event.target.dataset.region); const replacement = document.querySelector(`.marker[data-region="${state.region}"]`); replacement?.focus(); }
  if (event.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(event.target.tagName) && !$('#about-dialog').open) { event.preventDefault(); $('#history-search').focus(); }
  if (event.key === 'Escape') closeSearch();
});
$('#year-slider').addEventListener('input', event => { stopPlaying(); const raw = Number(event.target.value); setYear(raw < 0 ? raw : raw + 1, false); });
$('#year-slider').addEventListener('change', () => { $('#status').textContent = `Showing ${formatYear(state.year)}.`; });
$('#year-form').addEventListener('submit', event => {
  event.preventDefault(); stopPlaying();
  const year = Number($('#year-input').value) * ($('#year-era').value === 'bce' ? -1 : 1);
  if (!validYear(year)) { $('#year-error').textContent = 'Choose a year from 1000 BCE to 1900 CE. There is no year zero.'; $('#year-error').hidden = false; return; }
  setYear(year);
});
$('#previous-year').addEventListener('click', () => { stopPlaying(); setYear(moveYear(state.year, -Number($('#year-step').value))); });
$('#next-year').addEventListener('click', () => { stopPlaying(); setYear(moveYear(state.year, Number($('#year-step').value))); });
$('#play').addEventListener('click', () => {
  if (playing) return stopPlaying();
  if (state.year === MAX_YEAR) setYear(MIN_YEAR);
  $('#play').innerHTML = icon('pause'); $('#play').setAttribute('aria-label', 'Pause timeline');
  playing = setInterval(() => { setYear(moveYear(state.year, Number($('#year-step').value)), false); if (state.year === MAX_YEAR) stopPlaying(); }, 1200);
});
document.addEventListener('visibilitychange', () => { if (document.hidden) stopPlaying(); });
$('#zoom-in').addEventListener('click', () => zoomMap(zoom + 0.5));
$('#zoom-out').addEventListener('click', () => zoomMap(zoom - 0.5));
$('#zoom-reset').addEventListener('click', () => zoomMap(1));
// Dragging only pans a zoomed map; the full-world view preserves page scrolling.
let drag = null;
$('#world-map').addEventListener('pointerdown', event => {
  if (zoom === 1 || event.target.closest('.marker')) return;
  drag = { x: event.clientX, y: event.clientY, pan: { ...pan } }; event.currentTarget.setPointerCapture(event.pointerId);
});
$('#world-map').addEventListener('pointermove', event => { if (!drag) return; const scale = 1000 / event.currentTarget.getBoundingClientRect().width; pan.x = Math.max(-400 * (zoom - 1), Math.min(400 * (zoom - 1), drag.pan.x + (event.clientX - drag.x) * scale)); pan.y = Math.max(-180 * (zoom - 1), Math.min(180 * (zoom - 1), drag.pan.y + (event.clientY - drag.y) * scale)); renderMap(); });
$('#world-map').addEventListener('pointerup', () => { drag = null; });
$('#world-map').addEventListener('pointercancel', () => { drag = null; });

function closeSearch() { $('#search-results').hidden = true; $('#history-search').setAttribute('aria-expanded', 'false'); }
function search() {
  const query = $('#history-search').value.trim().toLowerCase();
  const results = $('#search-results');
  if (!query) return closeSearch();
  const yearMatch = query.match(/^(\d{1,4})\s*(bce?|ce|ad)?$/i);
  const year = yearMatch ? Number(yearMatch[1]) * (/^bc/i.test(yearMatch[2] || '') ? -1 : 1) : null;
  const matches = events.filter(e => `${e.title} ${e.culture} ${regionById(e.region).name} ${e.summary}`.toLowerCase().includes(query)).slice(0, 7);
  results.innerHTML = (validYear(year) ? `<button data-search-year="${year}"><strong>Go to ${formatYear(year)}</strong><span>Explore the world in this year</span></button>` : '') + matches.map(e => `<button data-search-event="${e.id}"><strong>${e.title}</strong><span>${regionById(e.region).name} · ${formatRange(e)}</span></button>`).join('');
  if (!results.innerHTML) results.innerHTML = '<p>No matching entry yet. Try a place, culture, or a year such as “330 BCE”.</p>';
  results.hidden = false; $('#history-search').setAttribute('aria-expanded', 'true');
}
$('#history-search').addEventListener('input', search);
$('#history-search').addEventListener('focus', search);
$('#history-search').addEventListener('keydown', event => { if (['ArrowDown', 'Enter'].includes(event.key) && !$('#search-results').hidden) { event.preventDefault(); if (event.key === 'Enter') $('#search-results button')?.click(); else $('#search-results button')?.focus(); } });
$('#search-results').addEventListener('keydown', event => { const buttons = [...event.currentTarget.querySelectorAll('button')]; const index = buttons.indexOf(document.activeElement); if (event.key === 'ArrowDown') { event.preventDefault(); buttons[(index + 1) % buttons.length]?.focus(); } if (event.key === 'ArrowUp') { event.preventDefault(); if (index <= 0) $('#history-search').focus(); else buttons[index - 1]?.focus(); } });
$('#search-results').addEventListener('click', event => {
  const item = event.target.closest('button'); if (!item) return;
  stopPlaying();
  if (item.dataset.searchEvent) { const e = events.find(e => e.id === item.dataset.searchEvent); state.region = e.region; setYear(Math.max(MIN_YEAR, Math.min(MAX_YEAR, e.start))); selectedEvent = e.id; renderDetail(); }
  else setYear(Number(item.dataset.searchYear));
  $('#history-search').value = ''; closeSearch(); $('#history-search').focus();
});

$('#collection-note').textContent = `This edition contains ${events.length} entries across ${regions.length} broad regions, from 1000 BCE to 1900 CE. Coverage is selective, not comprehensive.`;
$('#source-list').innerHTML = Object.values(sources).map(s => `<a href="${s.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.title)}<small>${escapeHtml(s.publisher)}</small></a>`).join('');
function openAbout() { stopPlaying(); $('#about-dialog').showModal(); }
$('#about-button').addEventListener('click', openAbout);
$('#sources-button').addEventListener('click', openAbout);
$('#close-about').addEventListener('click', () => $('#about-dialog').close());
$('#about-dialog').addEventListener('click', event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.currentTarget.close(); } });
window.addEventListener('popstate', () => { stopPlaying(); state = parseState(location.search); selectedEvent = null; render(); });
render();
zoomMap(1);

// Optional browser agent interface; the atlas works without this experimental API.
if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  const tool = {
    name: 'explore_history', title: 'Explore a historical year',
    description: 'Set the atlas year and selected region, optionally comparing up to three regions. Negative years mean BCE; there is no year zero.',
    inputSchema: { type: 'object', properties: { year: { type: 'integer', minimum: MIN_YEAR, maximum: MAX_YEAR }, region: { type: 'string', enum: regions.map(r => r.id) }, compare: { type: 'array', maxItems: 3, uniqueItems: true, items: { type: 'string', enum: regions.map(r => r.id) } } }, required: ['year', 'region'], additionalProperties: false },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute(input) {
      if (!input || !validYear(input.year) || !regionById(input.region) || (input.compare !== undefined && (!Array.isArray(input.compare) || input.compare.length > 3 || new Set(input.compare).size !== input.compare.length || input.compare.some(id => !regionById(id))))) throw new Error('Invalid year, region, or comparison.');
      stopPlaying(); state.region = input.region; if (input.compare) state.compare = [...input.compare]; setYear(input.year);
      return { year: state.year, region: state.region, compare: [...state.compare], entries: eventsAt(state.year, state.region).map(e => ({ title: e.title, summary: e.summary, sources: e.sources.map(key => sources[key].url) })) };
    },
  };
  try { Promise.resolve(document.modelContext.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch { /* Optional browser capability. */ }
  window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
}
