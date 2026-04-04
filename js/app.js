/* ============================================================
   Construtor WKT — Sistemas de Referência de Coordenadas
   app.js
   ============================================================ */

'use strict';

/* =============================================================
   STATE
   ============================================================= */
var currentTab  = 'geog';
var searchKind  = 'CRS';          // active chip filter
var searchTimer = null;           // debounce handle
var detailData  = null;           // currently selected EPSG result
var lastResults = [];             // last search result list

/* =============================================================
   EPSG APIs

   BUSCA  → apps.epsg.org/api/v1  (API oficial da IOGP/OGP)
            Retorna JSON com Access-Control-Allow-Origin: *
            Endpoint: /CoordRefSystem/?searchTerm=<q>&pageSize=40

   WKT    → epsg.io/<code>.wkt  ou  .wkt2
            Resposta texto puro com Access-Control-Allow-Origin: *
   ============================================================= */

var EPSG_SEARCH_API = 'https://apps.epsg.org/api/v1/CoordRefSystem/';
var EPSG_WKT_BASE   = 'https://epsg.io/';

/**
 * Normaliza um resultado da apps.epsg.org para o formato
 * interno { code, name, kind } usado pelo restante do código.
 */
function normalizeResult(r) {
  /* O campo "type" da API oficial varia: "projected", "geographic 2D", etc. */
  var kind = r.type || r.Type || '';
  return {
    code: String(r.code || r.Code || ''),
    name: r.name || r.Name || '—',
    kind: kind
  };
}

/**
 * Busca na API oficial do EPSG GeoRepository (apps.epsg.org).
 * Suporta código numérico ou texto livre.
 * Retorna Promise<Array>.
 */
function fetchEPSG(query) {
  var params = new URLSearchParams({
    searchTerm: query,
    pageSize:   40,
    page:       1
  });
  var url = EPSG_SEARCH_API + '?' + params.toString();

  return fetch(url, { headers: { 'Accept': 'application/json' } })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      /* A resposta tem { Results: [...], TotalResults: N } */
      var list = data.Results || data.results || [];
      return list.map(normalizeResult);
    });
}

/**
 * Busca o WKT de um código EPSG via epsg.io (texto puro, CORS aberto).
 *   version '2019' ou '2015'  →  /<code>.wkt2
 *   version '1'               →  /<code>.wkt
 */
function fetchWKTByCode(code, version) {
  var ext = (version === '1') ? 'wkt' : 'wkt2';
  var url = EPSG_WKT_BASE + code + '.' + ext;

  return fetch(url)
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    })
    .then(function (txt) {
      /* epsg.io retorna HTML quando o código não existe — detectar */
      if (txt.trim().startsWith('<')) {
        throw new Error('WKT não disponível para EPSG:' + code);
      }
      return txt.trim();
    });
}

/* =============================================================
   SEARCH UI
   ============================================================= */

/** Set active kind chip */
function setKind(el) {
  document.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
  el.classList.add('active');
  searchKind = el.dataset.kind;
  if (lastResults.length) renderResults(lastResults);
}

/** Debounced input handler — waits 350 ms after last keystroke */
function scheduleSearch() {
  var q = document.getElementById('epsg-query').value.trim();
  var clearBtn = document.getElementById('search-clear');
  clearBtn.classList.toggle('visible', q.length > 0);

  clearTimeout(searchTimer);
  if (q.length < 2) {
    setStatus('');
    renderResults([]);
    return;
  }
  searchTimer = setTimeout(doSearch, 350);
}

/** Trigger search immediately */
function doSearch() {
  clearTimeout(searchTimer);
  var q = document.getElementById('epsg-query').value.trim();
  if (q.length < 2) return;

  setStatus('<span class="spinner"></span> Buscando…');
  closeDetail();

  fetchEPSG(q)
    .then(function (results) {
      lastResults = results;
      setStatus('');
      renderResults(results);
    })
    .catch(function (err) {
      setStatus('');
      var msg = err.message || String(err);
      /* Mensagem amigável para erros comuns */
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')) {
        msg = 'Sem conexão com a internet. Verifique sua rede e tente novamente.';
      } else if (msg.includes('token') || msg.includes('JSON')) {
        msg = 'Resposta inesperada da API. Verifique sua conexão ou tente novamente.';
      }
      document.getElementById('search-results').innerHTML =
        '<div class="search-error">Erro ao buscar: ' + escHtml(msg) + '</div>';
    });
}

/** Clear the search field and results */
function clearSearch() {
  document.getElementById('epsg-query').value = '';
  document.getElementById('search-clear').classList.remove('visible');
  setStatus('');
  lastResults = [];
  renderResults([]);
  closeDetail();
}

/** Update status bar */
function setStatus(html) {
  var el = document.getElementById('search-status');
  if (html) {
    el.innerHTML = html;
    el.style.display = 'flex';
  } else {
    el.style.display = 'none';
  }
}

/** Kind label for badge CSS class */
function kindClass(kind) {
  if (!kind) return 'other';
  var k = kind.toLowerCase();
  if (k.includes('geographic')) return 'geographic';
  if (k.includes('projected'))  return 'projected';
  if (k.includes('vertical'))   return 'vertical';
  return 'other';
}

/** Friendly kind label in Portuguese */
function kindLabel(kind) {
  if (!kind) return 'Outro';
  var k = kind.toLowerCase();
  if (k.includes('geographic')) return 'Geográfico';
  if (k.includes('projected'))  return 'Projetado';
  if (k.includes('vertical'))   return 'Vertical';
  if (k.includes('compound'))   return 'Composto';
  if (k.includes('geocentric')) return 'Geocêntrico';
  if (k.includes('engineering'))return 'Engenharia';
  return kind;
}

/**
 * Filter results by active chip.
 * searchKind 'CRS' = todos; outros mapeia para o type da API oficial.
 */
function applyKindFilter(results) {
  if (searchKind === 'CRS') return results;
  var map = {
    'Geographic': 'geographic',
    'Projected':  'projected',
    'Vertical':   'vertical'
  };
  var needle = (map[searchKind] || searchKind).toLowerCase();
  return results.filter(function (r) {
    return r.kind && r.kind.toLowerCase().includes(needle);
  });
}

/** Render result items into the results list */
function renderResults(results) {
  var container = document.getElementById('search-results');
  var filtered  = applyKindFilter(results);

  if (!filtered.length) {
    var q = document.getElementById('epsg-query').value.trim();
    if (q.length < 2) {
      container.innerHTML =
        '<div class="search-empty">' +
        '<svg viewBox="0 0 24 24" fill="none" width="28" height="28">' +
        '<circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="1.3"/>' +
        '<path d="M16.5 16.5l3.5 3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>' +
        '</svg><span>Digite um código EPSG ou nome para buscar</span></div>';
    } else {
      container.innerHTML =
        '<div class="search-empty"><span>Nenhum resultado para "' + escHtml(q) + '"</span></div>';
    }
    return;
  }

  var html = '';
  filtered.slice(0, 40).forEach(function (r, i) {
    var kc = kindClass(r.kind);
    var kl = kindLabel(r.kind);
    html +=
      '<button class="result-item" onclick="selectResult(' + i + ')" data-idx="' + i + '">' +
        '<div class="result-left">' +
          '<span class="result-name">' + escHtml(r.name || '—') + '</span>' +
          '<span class="result-code">EPSG:' + escHtml(String(r.code || '')) + '</span>' +
        '</div>' +
        '<div class="result-right">' +
          '<span class="badge-kind badge-' + kc + '">' + escHtml(kl) + '</span>' +
        '</div>' +
      '</button>';
  });

  if (filtered.length > 40) {
    html += '<div class="search-status" style="display:flex;padding:4px 2px">+ ' +
            (filtered.length - 40) + ' resultados — refine a busca</div>';
  }

  container.innerHTML = html;
  /* Re-bind filtered slice so selectResult index maps correctly */
  window.__searchSlice = filtered.slice(0, 40);
}

/** User clicked a result item */
function selectResult(idx) {
  var results = window.__searchSlice || [];
  var r = results[idx];
  if (!r) return;

  /* Highlight selected */
  document.querySelectorAll('.result-item').forEach(function (el) {
    el.classList.toggle('selected', parseInt(el.dataset.idx) === idx);
  });

  detailData = r;
  showDetail(r);
}

/** Show the detail card for a result, fetching WKT from epsg.io */
function showDetail(r) {
  document.getElementById('detail-name').textContent = r.name || '—';
  document.getElementById('detail-meta').textContent =
    'EPSG:' + (r.code || '?') + '  ·  ' + kindLabel(r.kind);

  var wktEl = document.getElementById('detail-wkt');
  wktEl.textContent = 'Carregando WKT…';

  var detail = document.getElementById('epsg-detail');
  detail.style.display = 'flex';
  detail.style.flexDirection = 'column';

  /* Determine version from the output panel selector */
  var ver = document.getElementById('wkt_ver').value;

  fetchWKTByCode(r.code, ver)
    .then(function (wkt) {
      wktEl.textContent = wkt || '(WKT não disponível para este código)';
      if (detailData) detailData._wkt = wkt;
    })
    .catch(function (err) {
      var msg = err.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')) {
        wktEl.textContent = '(Sem conexão para buscar o WKT — verifique sua rede)';
      } else {
        wktEl.textContent = '(WKT não disponível para EPSG:' + r.code + ')';
      }
    });
}

/** Hide the detail card */
function closeDetail() {
  document.getElementById('epsg-detail').style.display = 'none';
  detailData = null;
  document.querySelectorAll('.result-item').forEach(function (el) {
    el.classList.remove('selected');
  });
}

/** Copy WKT shown in the detail card */
function copyDetailWKT() {
  var txt = document.getElementById('detail-wkt').textContent;
  var btn = document.getElementById('copy-detail-btn');
  navigator.clipboard.writeText(txt).then(function () {
    btn.textContent = 'Copiado!';
    setTimeout(function () { btn.textContent = 'Copiar WKT'; }, 1800);
  }).catch(function () { fallbackCopy(txt); });
}

/**
 * Import: paste the WKT from the detail panel directly into the output box
 * and populate the CRS name + EPSG fields in the editor.
 */
function importFromDetail() {
  if (!detailData) return;

  var wkt = document.getElementById('detail-wkt').textContent;

  /* Put WKT straight into the output box */
  document.getElementById('wkt-out').textContent = wkt;
  document.getElementById('wkt-version').textContent = 'EPSG:' + detailData.code;

  /* Best-effort: set the name and EPSG code in the active editor pane */
  var code = String(detailData.code || '');
  var name = detailData.name || '';
  var kind = (detailData.kind || '').toLowerCase();

  if (kind.includes('projected')) {
    setTab('proj');
    setIfExists('p_name', name);
    setIfExists('p_epsg', code);
  } else if (kind.includes('vertical')) {
    setTab('vert');
    setIfExists('v_name', name);
    setIfExists('v_epsg', code);
  } else {
    setTab('geog');
    setIfExists('g_name', name);
    setIfExists('g_epsg', code);
  }
}

function setIfExists(id, val) {
  var el = document.getElementById(id);
  if (el) el.value = val;
}

/* =============================================================
   PROJECTION PARAMETER DEFINITIONS
   ============================================================= */
var projParams = {
  'Transverse Mercator': [
    { id: 'lat0', label: 'Latitude de origem', val: '0' },
    { id: 'lon0', label: 'Meridiano central',  val: '-45' },
    { id: 'k0',   label: 'Fator de escala',    val: '0.9996' },
    { id: 'fe',   label: 'False Easting (m)',   val: '500000' },
    { id: 'fn',   label: 'False Northing (m)',  val: '10000000' }
  ],
  'Mercator (variant B)': [
    { id: 'lat1', label: 'Latitude do paralelo padrão', val: '0' },
    { id: 'fe',   label: 'False Easting (m)',            val: '0' },
    { id: 'fn',   label: 'False Northing (m)',           val: '0' }
  ],
  'Lambert Conic Conformal (2SP)': [
    { id: 'lat0', label: 'Latitude de origem', val: '46.5' },
    { id: 'lon0', label: 'Meridiano central',  val: '3' },
    { id: 'lat1', label: 'Paralelo padrão 1',  val: '44' },
    { id: 'lat2', label: 'Paralelo padrão 2',  val: '49' },
    { id: 'fe',   label: 'False Easting (m)',   val: '700000' },
    { id: 'fn',   label: 'False Northing (m)',  val: '6600000' }
  ],
  'Lambert Conic Conformal (1SP)': [
    { id: 'lat0', label: 'Latitude de origem', val: '0' },
    { id: 'lon0', label: 'Meridiano central',  val: '0' },
    { id: 'k0',   label: 'Fator de escala',    val: '1' },
    { id: 'fe',   label: 'False Easting (m)',   val: '0' },
    { id: 'fn',   label: 'False Northing (m)',  val: '0' }
  ],
  'Albers Equal Area': [
    { id: 'lat0', label: 'Latitude de origem', val: '-12' },
    { id: 'lon0', label: 'Meridiano central',  val: '-54' },
    { id: 'lat1', label: 'Paralelo padrão 1',  val: '-2' },
    { id: 'lat2', label: 'Paralelo padrão 2',  val: '-22' },
    { id: 'fe',   label: 'False Easting (m)',   val: '0' },
    { id: 'fn',   label: 'False Northing (m)',  val: '0' }
  ],
  'Stereographic': [
    { id: 'lat0', label: 'Latitude de origem', val: '-90' },
    { id: 'lon0', label: 'Meridiano central',  val: '0' },
    { id: 'k0',   label: 'Fator de escala',    val: '0.994' },
    { id: 'fe',   label: 'False Easting (m)',   val: '2000000' },
    { id: 'fn',   label: 'False Northing (m)',  val: '2000000' }
  ],
  'Oblique Mercator': [
    { id: 'lat0',    label: 'Latitude do centro', val: '4' },
    { id: 'lon0',    label: 'Meridiano central',  val: '115' },
    { id: 'azimuth', label: 'Azimute',            val: '53.31582048' },
    { id: 'k0',      label: 'Fator de escala',    val: '0.99984' },
    { id: 'fe',      label: 'False Easting (m)',   val: '590521.147' },
    { id: 'fn',      label: 'False Northing (m)',  val: '442890.861' }
  ],
  'Cassini-Soldner': [
    { id: 'lat0', label: 'Latitude de origem', val: '0' },
    { id: 'lon0', label: 'Meridiano central',  val: '0' },
    { id: 'fe',   label: 'False Easting (m)',   val: '0' },
    { id: 'fn',   label: 'False Northing (m)',  val: '0' }
  ],
  'Polyconic': [
    { id: 'lat0', label: 'Latitude de origem', val: '0' },
    { id: 'lon0', label: 'Meridiano central',  val: '-54' },
    { id: 'fe',   label: 'False Easting (m)',   val: '5000000' },
    { id: 'fn',   label: 'False Northing (m)',  val: '10000000' }
  ]
};

var wktParamKeys = {
  lat0:    'Latitude of natural origin',
  lon0:    'Longitude of natural origin',
  k0:      'Scale factor at natural origin',
  fe:      'False easting',
  fn:      'False northing',
  lat1:    'Latitude of 1st standard parallel',
  lat2:    'Latitude of 2nd standard parallel',
  azimuth: 'Azimuth of initial line'
};

/* =============================================================
   PRESETS
   ============================================================= */
var presets = {
  wgs84:      { tab:'geog', g_name:'WGS 84', g_datum:'World Geodetic System 1984', g_sph_name:'WGS 84', g_a:'6378137', g_invf:'298.257223563', g_pm_name:'Greenwich', g_pm_val:'0', g_epsg:'4326' },
  sirgas2000: { tab:'geog', g_name:'SIRGAS 2000', g_datum:'Sistema de Referencia Geocentrico para las AmericaS 2000', g_sph_name:'GRS 1980', g_a:'6378137', g_invf:'298.257222101', g_pm_name:'Greenwich', g_pm_val:'0', g_epsg:'4674' },
  sad69:      { tab:'geog', g_name:'SAD69', g_datum:'South American Datum 1969', g_sph_name:'GRS 1967 Modified', g_a:'6378160', g_invf:'298.25', g_pm_name:'Greenwich', g_pm_val:'0', g_epsg:'4618' },
  etrs89:     { tab:'geog', g_name:'ETRS89', g_datum:'European Terrestrial Reference System 1989', g_sph_name:'GRS 1980', g_a:'6378137', g_invf:'298.257222101', g_pm_name:'Greenwich', g_pm_val:'0', g_epsg:'4258' },
  gda2020:    { tab:'geog', g_name:'GDA2020', g_datum:'Geocentric Datum of Australia 2020', g_sph_name:'GRS 1980', g_a:'6378137', g_invf:'298.257222101', g_pm_name:'Greenwich', g_pm_val:'0', g_epsg:'7844' },
  nad83:      { tab:'geog', g_name:'NAD83', g_datum:'North American Datum 1983', g_sph_name:'GRS 1980', g_a:'6378137', g_invf:'298.257222101', g_pm_name:'Greenwich', g_pm_val:'0', g_epsg:'4269' },
  utm23s:     { tab:'proj', p_name:'SIRGAS 2000 / UTM zone 23S', p_base:'SIRGAS 2000', p_epsg:'31983', p_proj:'Transverse Mercator', pp_lat0:'0', pp_lon0:'-45', pp_k0:'0.9996', pp_fe:'500000', pp_fn:'10000000' },
  utm24s:     { tab:'proj', p_name:'SIRGAS 2000 / UTM zone 24S', p_base:'SIRGAS 2000', p_epsg:'31984', p_proj:'Transverse Mercator', pp_lat0:'0', pp_lon0:'-39', pp_k0:'0.9996', pp_fe:'500000', pp_fn:'10000000' },
  webmerc:    { tab:'proj', p_name:'WGS 84 / Pseudo-Mercator', p_base:'WGS 84', p_epsg:'3857', p_proj:'Mercator (variant B)', pp_lat1:'0', pp_fe:'0', pp_fn:'0' },
  utm31n:     { tab:'proj', p_name:'WGS 84 / UTM zone 31N', p_base:'WGS 84', p_epsg:'32631', p_proj:'Transverse Mercator', pp_lat0:'0', pp_lon0:'3', pp_k0:'0.9996', pp_fe:'500000', pp_fn:'0' },
  lcc:        { tab:'proj', p_name:'RGF93 / Lambert-93', p_base:'RGF93', p_epsg:'2154', p_proj:'Lambert Conic Conformal (2SP)', pp_lat0:'46.5', pp_lon0:'3', pp_lat1:'44', pp_lat2:'49', pp_fe:'700000', pp_fn:'6600000' },
  albers_br:  { tab:'proj', p_name:'SIRGAS 2000 / Albers Brasil', p_base:'SIRGAS 2000', p_epsg:'', p_proj:'Albers Equal Area', pp_lat0:'-12', pp_lon0:'-54', pp_lat1:'-2', pp_lat2:'-22', pp_fe:'0', pp_fn:'0' }
};

/* =============================================================
   HELPERS
   ============================================================= */
function g(id)     { var el = document.getElementById(id); return el ? el.value : ''; }
function ind(s, n) { return '  '.repeat(n) + s; }

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fallbackCopy(txt) {
  var ta = document.createElement('textarea');
  ta.value = txt;
  ta.style.cssText = 'position:fixed;opacity:0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

/* =============================================================
   TAB SWITCHING
   ============================================================= */
function setTab(t) {
  currentTab = t;
  ['geog', 'proj', 'vert'].forEach(function (x) {
    document.getElementById('pane-' + x).style.display = x === t ? 'flex' : 'none';
  });
  document.querySelectorAll('.tab').forEach(function (el, i) {
    el.classList.toggle('active', ['geog', 'proj', 'vert'][i] === t);
  });
  render();
}

/* =============================================================
   DYNAMIC PROJECTION FIELDS
   ============================================================= */
function updateProjFields() {
  var proj   = document.getElementById('p_proj').value;
  var params = projParams[proj] || [];
  var html   = '';
  params.forEach(function (p) {
    html += '<div class="field-group"><div class="section-label">' + p.label + '</div>' +
            '<input type="number" id="pp_' + p.id + '" value="' + p.val + '" step="any" oninput="render()"></div>';
  });
  document.getElementById('proj-params').innerHTML = html;
}

/* =============================================================
   LOAD PRESET
   ============================================================= */
function loadPreset(key) {
  var pr = presets[key];
  if (!pr) return;
  setTab(pr.tab);
  Object.keys(pr).forEach(function (k) {
    if (k === 'tab' || k === 'p_proj') return;
    var el = document.getElementById(k);
    if (el) el.value = pr[k];
  });
  if (pr.p_proj) {
    var sel = document.getElementById('p_proj');
    if (sel) {
      sel.value = pr.p_proj;
      updateProjFields();
      Object.keys(pr).forEach(function (k) {
        if (k.startsWith('pp_')) { var el = document.getElementById(k); if (el) el.value = pr[k]; }
      });
    }
  }
  render();
}

/* =============================================================
   WKT GENERATORS
   ============================================================= */

function renderGeogWKT(v) {
  var name = g('g_name'), datum = g('g_datum'), sph = g('g_sph_name');
  var a    = g('g_a'),    invf  = g('g_invf'),  pm  = g('g_pm_name');
  var pmv  = g('g_pm_val'), unit = g('g_unit'), epsg = g('g_epsg');

  if (v === '1') {
    var r = 'GEOGCS["' + name + '",\n';
    r += ind('DATUM["' + datum.replace(/ /g, '_') + '",\n', 1);
    r += ind('SPHEROID["' + sph + '",' + a + ',' + invf + ']],\n', 2);
    r += ind('PRIMEM["' + pm + '",' + pmv + '],\n', 1);
    r += ind('UNIT["degree",0.0174532925199433]', 1);
    if (epsg) r += ',\n' + ind('AUTHORITY["EPSG","' + epsg + '"]', 1);
    return r + '\n]';
  }

  var kw = v === '2015' ? 'GEODCRS' : 'GEOGCRS';
  var r = kw + '["' + name + '",\n';
  r += ind('DATUM["' + datum + '",\n', 1);
  r += ind('ELLIPSOID["' + sph + '",' + a + ',' + invf + ',\n', 2);
  r += ind('LENGTHUNIT["metre",1]]],\n', 3);
  r += ind('PRIMEM["' + pm + '",' + pmv + ',\n', 1);
  r += ind('ANGLEUNIT["degree",0.0174532925199433]],\n', 2);
  r += ind('CS[ellipsoidal,2],\n', 1);
  r += ind('AXIS["geodetic latitude (Lat)",north,\n', 1);
  r += ind('ORDER[1],\n', 2);
  r += ind(unit + '],\n', 2);
  r += ind('AXIS["geodetic longitude (Lon)",east,\n', 1);
  r += ind('ORDER[2],\n', 2);
  r += ind(unit + ']', 2);
  if (epsg) r += ',\n' + ind('ID["EPSG",' + epsg + ']', 1);
  return r + '\n]';
}

function renderProjWKT(v) {
  var name   = g('p_name'), base = g('p_base'), proj = g('p_proj');
  var unit   = g('p_unit'), epsg = g('p_epsg');
  var params = projParams[proj] || [];

  if (v === '1') {
    var r = 'PROJCS["' + name + '",\n';
    r += ind('GEOGCS["' + base + '",\n', 1);
    r += ind('DATUM["' + base.replace(/ /g, '_') + '",\n', 2);
    r += ind('SPHEROID["GRS 1980",6378137,298.257222101]],\n', 3);
    r += ind('PRIMEM["Greenwich",0],\n', 2);
    r += ind('UNIT["degree",0.0174532925199433]],\n', 2);
    r += ind('PROJECTION["' + proj + '"],\n', 1);
    params.forEach(function (p) {
      var val = g('pp_' + p.id) || p.val;
      r += ind('PARAMETER["' + (wktParamKeys[p.id] || p.id) + '",' + val + '],\n', 1);
    });
    r += ind('UNIT["metre",1]', 1);
    if (epsg) r += ',\n' + ind('AUTHORITY["EPSG","' + epsg + '"]', 1);
    return r + '\n]';
  }

  var r = 'PROJCRS["' + name + '",\n';
  r += ind('BASEGEOGCRS["' + base + '",\n', 1);
  r += ind('DATUM["' + base + '",\n', 2);
  r += ind('ELLIPSOID["GRS 1980",6378137,298.257222101,\n', 3);
  r += ind('LENGTHUNIT["metre",1]]],\n', 4);
  r += ind('PRIMEM["Greenwich",0,\n', 2);
  r += ind('ANGLEUNIT["degree",0.0174532925199433]]],\n', 3);
  r += ind('CONVERSION["' + name + '",\n', 1);
  r += ind('METHOD["' + proj + '"]', 2);
  params.forEach(function (p) {
    var val = g('pp_' + p.id) || p.val;
    r += ',\n' + ind('PARAMETER["' + (wktParamKeys[p.id] || p.id) + '",' + val + ',\n', 2);
    r += ind('ANGLEUNIT["degree",0.0174532925199433]]', 3);
  });
  r += '],\n';
  r += ind('CS[Cartesian,2],\n', 1);
  r += ind('AXIS["(E)",east,ORDER[1],' + unit + '],\n', 1);
  r += ind('AXIS["(N)",north,ORDER[2],' + unit + ']', 1);
  if (epsg) r += ',\n' + ind('ID["EPSG",' + epsg + ']', 1);
  return r + '\n]';
}

function renderVertWKT(v) {
  var name = g('v_name'), datum = g('v_datum');
  var unit = g('v_unit'), dir   = g('v_dir'), epsg = g('v_epsg');

  if (v === '1') {
    var r = 'VERT_CS["' + name + '",\n';
    r += ind('VERT_DATUM["' + datum + '",2005],\n', 1);
    r += ind('UNIT["metre",1]', 1);
    if (epsg) r += ',\n' + ind('AUTHORITY["EPSG","' + epsg + '"]', 1);
    return r + '\n]';
  }

  var r = 'VERTCRS["' + name + '",\n';
  r += ind('VDATUM["' + datum + '"],\n', 1);
  r += ind('CS[vertical,1],\n', 1);
  r += ind('AXIS["gravity-related height (H)",' + dir + ',\n', 1);
  r += ind(unit + ']', 2);
  if (epsg) r += ',\n' + ind('ID["EPSG",' + epsg + ']', 1);
  return r + '\n]';
}

/* =============================================================
   MAIN RENDER
   ============================================================= */
function render() {
  var v    = g('wkt_ver');
  var vMap = { '2019':'WKT2:2019', '2015':'WKT2:2015', '1':'WKT1' };
  document.getElementById('wkt-version').textContent = vMap[v] || 'WKT2:2019';

  var wkt = currentTab === 'geog' ? renderGeogWKT(v)
          : currentTab === 'proj' ? renderProjWKT(v)
          : renderVertWKT(v);

  document.getElementById('wkt-out').textContent = wkt;
}

/* =============================================================
   OUTPUT ACTIONS
   ============================================================= */
function copyWKT() {
  var txt = document.getElementById('wkt-out').textContent;
  var btn = document.getElementById('copy-btn');
  navigator.clipboard.writeText(txt).then(function () {
    btn.textContent = 'Copiado!';
    setTimeout(function () { btn.textContent = 'Copiar WKT'; }, 1800);
  }).catch(function () { fallbackCopy(txt); });
}

function downloadWKT() {
  var txt      = document.getElementById('wkt-out').textContent;
  var filename = (g('g_name') || g('p_name') || g('v_name') || 'crs')
                   .replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.prj';
  var blob = new Blob([txt], { type: 'text/plain' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href   = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function clearOutput() {
  document.getElementById('wkt-out').textContent = '';
}

/* =============================================================
   INIT
   ============================================================= */
document.addEventListener('DOMContentLoaded', function () {
  updateProjFields();
  render();
});