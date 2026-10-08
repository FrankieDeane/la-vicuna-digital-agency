/* La Vicuña — automatizaciones.js
   Demo "The North Face en Mercado Libre" de /automatizaciones y zona admin.
   Datos: /.netlify/functions/tnf-ml (monitor real). Si todavía no hay relevamientos
   o la función no responde, se usan los datos de ejemplo de datos-ejemplo.json. */
(function () {
  'use strict';

  var EN = document.documentElement.lang === 'en';
  var T = EN ? {
    cargando: 'Loading the latest snapshot…',
    demo: 'Sample data: illustrative figures to show the report. Live Mercado Libre data appears here once the monitor runs.',
    real: 'Live Mercado Libre data · snapshot of ',
    error: 'Could not load the report.',
    kCats: 'Categories tracked', kTop: 'Brand products in the top 20', kTop3: 'Spots in the top 3',
    kDif: 'Median price vs. competitors', kLider: 'Main competitor',
    pos: '#', prod: 'Product', marca: 'Brand', precio: 'Price', vend: 'Seller', cat: 'Category',
    min: 'Lowest', max: 'Highest', nvend: 'Sellers', compMed: 'Competitors (median)', dif: 'Difference',
    mejor: 'Best spot', enTop: 'In top 20', lider: 'Leading competitor', tnf: 'The North Face',
    comp: 'Competitors', bb: 'Buy box price', minL: 'Lowest seller price', compL: 'Competitors median (category)',
    puesto: 'Spot', sinDatos: 'Not enough history yet.', vsComp: 'vs. competitors',
    refrescar: 'Refresh The North Face data', yaListo: 'Today\'s data is already up to date.',
    sinMonitor: 'The live monitor is not connected yet: the sample data stays on screen.',
    entrar: 'Signing in…', quitar: 'Remove', relevando: 'Collecting… step ', listo: 'Done: data updated.',
    lugares: ' spots', top3: ' in top 3',
    repEjemplo: 'Sample report: written from the sample data above, not from live Mercado Libre data.',
    repPie: 'Report built with fixed rules from the dashboard data, without AI. Review it before making decisions.',
    repBasico: 'Basic report built from the data: AI is not available right now.',
    repIA: 'AI-generated report', repGen: 'Creating the report…', repErr: 'Could not create the report.', repOtra: 'Create again',
    rSum: 'Summary', rOk: 'What worked', rNo: 'What did not work', rTry: 'What to try this week',
    rResumen: function (c, top, dif) { return 'The North Face holds ' + top + ' spots in the top 20 across ' + c + ' categories and sells, on average, ' + dif + ' above its competitors\' median price.'; },
    rBien: function (x) { return 'Best spot in ' + x.cat + ': #' + x.pos + ' (' + x.nombre + ').'; },
    rBienMarca: function (m, n, sh) { return m + ' is the closest rival in the rankings with ' + n + ' spots (' + sh + '% of the total).'; },
    rMal: function (x) { return x.cat + ': the median price is ' + x.dif + ' above the competition and the best spot is only #' + x.pos + '.'; },
    rProb1: function (c) { return 'Test Product Ads (CPC) on products ranked #4 to #15 in ' + c + ': they already convert organically and paid clicks can push them into the top 3.'; },
    rProb2: function (c) { return 'Review the price gap in ' + c + ' (promotions, installments or free shipping) before paying for clicks.'; },
    rProb3: 'Track the same products every day for a week to confirm which spot changes come from price and which from ads.'
  } : {
    cargando: 'Leyendo el último relevamiento…',
    demo: 'Datos de ejemplo: cifras ilustrativas para mostrar el reporte. Cuando el monitor corre, acá aparecen los datos reales de Mercado Libre.',
    real: 'Datos reales de Mercado Libre · relevamiento del ',
    error: 'No se pudo cargar el reporte.',
    kCats: 'Categorías relevadas', kTop: 'Productos de la marca en el top 20', kTop3: 'Lugares en el top 3',
    kDif: 'Precio mediano vs. competencia', kLider: 'Competidor principal',
    pos: '#', prod: 'Producto', marca: 'Marca', precio: 'Precio', vend: 'Vendedor', cat: 'Categoría',
    min: 'Mínimo', max: 'Máximo', nvend: 'Vendedores', compMed: 'Competencia (mediana)', dif: 'Diferencia',
    mejor: 'Mejor puesto', enTop: 'En el top 20', lider: 'Competidor líder', tnf: 'The North Face',
    comp: 'Competencia', bb: 'Precio buy box', minL: 'Precio más bajo', compL: 'Mediana competencia (categoría)',
    puesto: 'Puesto', sinDatos: 'Todavía no hay historia suficiente.', vsComp: 'vs. competencia',
    refrescar: 'Actualizar datos de The North Face', yaListo: 'Los datos de hoy ya están actualizados.',
    sinMonitor: 'El monitor en vivo todavía no está conectado: se siguen mostrando los datos de ejemplo.',
    entrar: 'Entrando…', quitar: 'Quitar', relevando: 'Relevando… paso ', listo: 'Listo: datos actualizados.',
    lugares: ' lugares', top3: ' en el top 3',
    repEjemplo: 'Reporte de ejemplo: armado con los datos de ejemplo de arriba, no con datos reales de Mercado Libre.',
    repPie: 'Reporte armado con reglas fijas a partir de los datos del tablero, sin IA. Revisalo antes de tomar decisiones.',
    repBasico: 'Reporte básico armado con los datos: la IA no está disponible en este momento.',
    repIA: 'Reporte generado con IA', repGen: 'Creando el reporte…', repErr: 'No se pudo crear el reporte.', repOtra: 'Crear de nuevo',
    rSum: 'Resumen', rOk: 'Qué funcionó', rNo: 'Qué no funcionó', rTry: 'Qué probar esta semana',
    rResumen: function (c, top, dif) { return 'The North Face ocupa ' + top + ' lugares del top 20 en ' + c + ' categorías y vende, en promedio, ' + dif + ' por encima de la mediana de precios de la competencia.'; },
    rBien: function (x) { return 'Mejor puesto en ' + x.cat + ': #' + x.pos + ' (' + x.nombre + ').'; },
    rBienMarca: function (m, n, sh) { return m + ' es el rival más cercano en los rankings con ' + n + ' lugares (' + sh + '% del total).'; },
    rMal: function (x) { return x.cat + ': el precio mediano está ' + x.dif + ' por encima de la competencia y el mejor puesto es solo #' + x.pos + '.'; },
    rProb1: function (c) { return 'Probar Product Ads (CPC) en los productos del puesto 4 al 15 de ' + c + ': ya convierten orgánico y el clic pago los puede empujar al top 3.'; },
    rProb2: function (c) { return 'Revisar la brecha de precio en ' + c + ' (promociones, cuotas o envío gratis) antes de pagar clics.'; },
    rProb3: 'Seguir los mismos productos todos los días durante una semana para confirmar qué cambios de puesto vienen del precio y cuáles de la pauta.'
  };

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var urlSegura = function (u) { return /^https:\/\//.test(u || '') ? u : null; };
  var fmtNum = new Intl.NumberFormat(EN ? 'en-US' : 'es-AR', { maximumFractionDigits: 0 });
  var precio = function (v) { return v == null || isNaN(v) ? '—' : '$ ' + fmtNum.format(v); };
  var pct = function (v) { return v == null || isNaN(v) ? '—' : (v > 0 ? '+' : '') + Math.round(v) + '%'; };
  var fecha = function (f) {
    if (!f) return '';
    var p = f.split('-');
    return EN ? p[1] + '/' + p[2] : p[2] + '/' + p[1];
  };
  var mediana = function (xs) {
    var s = xs.filter(function (x) { return typeof x === 'number' && isFinite(x); }).sort(function (a, b) { return a - b; });
    if (!s.length) return null;
    var m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  var corto = function (s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

  var datos = null;
  var catSel = null;

  /* ---- Carga ------------------------------------------------------------ */
  function estado(tipo, txt) {
    var b = $('au-status');
    if (!b) return;
    b.className = 'au-status' + (tipo ? ' au-status-' + tipo : '');
    b.textContent = txt || '';
  }

  function cargarEjemplo() {
    return fetch('/automatizaciones/datos-ejemplo.json').then(function (r) { return r.json(); });
  }

  function cargar() {
    if (!$('au-kpis')) return;
    estado('info', T.cargando);
    fetch('/.netlify/functions/tnf-ml')
      .then(function (r) { return r.ok ? r.json() : { vacio: true }; })
      .catch(function () { return { vacio: true }; })
      .then(function (d) { return d && d.vista && !d.vacio ? d : cargarEjemplo(); })
      .then(function (d) {
        datos = d;
        if (d.demo) estado('', '');
        else estado('ok', T.real + fecha(d.vista.fecha) + '.');
        pintar();
      })
      .catch(function () { estado('error', T.error); });
  }

  /* ---- Pintado ---------------------------------------------------------- */
  function pintar() {
    var v = datos.vista;
    var cats = v.categorias.filter(function (c) { return c.top && c.top.length; });
    if (!catSel || !cats.some(function (c) { return c.id === catSel; })) catSel = cats.length ? cats[0].id : null;
    kpis(v, cats);
    chips(cats);
    ranking(cats);
    topProductos(v);
    selectores(v);
    marcas(v);
    competencia(v);
    diferencias(cats);
  }

  function kpis(v, cats) {
    var enTop = 0, top3 = 0, difs = [];
    cats.forEach(function (c) {
      c.top.forEach(function (t) { if (t.tnf) { enTop++; if (t.pos <= 3) top3++; } });
      if (c.resumen && c.resumen.dif != null) difs.push(c.resumen.dif);
    });
    var lider = (v.marcas || []).filter(function (m) { return !m.tnf && !/^Sin marca/.test(m.marca); })[0];
    var items = [
      [cats.length, T.kCats], [enTop, T.kTop], [top3, T.kTop3],
      [pct(mediana(difs)), T.kDif], [lider ? lider.marca : '—', T.kLider]
    ];
    $('au-kpis').innerHTML = items.map(function (k) {
      return '<div class="au-kpi"><span class="au-kpi-num">' + esc(k[0]) + '</span><span class="au-kpi-lbl mono">' + esc(k[1]) + '</span></div>';
    }).join('');
  }

  function chips(cats) {
    var box = $('au-cats');
    box.innerHTML = cats.map(function (c) {
      return '<button type="button" role="tab" class="au-chip" data-cat="' + esc(c.id) + '" aria-selected="' + (c.id === catSel) + '">' + esc(c.nombre) + '</button>';
    }).join('');
    box.onclick = function (e) {
      var b = e.target.closest('[data-cat]');
      if (!b) return;
      catSel = b.getAttribute('data-cat');
      chips(cats);
      ranking(cats);
    };
  }

  function foto(url, alt) {
    var u = urlSegura(url);
    return u ? '<img class="au-thumb" src="' + esc(u) + '" alt="' + esc(alt) + '" loading="lazy" width="48" height="48">'
      : '<span class="au-thumb au-thumb-ph" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M2 20l7-12 4 6 3-4 6 10z"/></svg></span>';
  }
  function link(url, txt) {
    var u = urlSegura(url);
    return u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener nofollow">' + esc(txt) + '</a>' : esc(txt);
  }

  function ranking(cats) {
    var c = cats.filter(function (x) { return x.id === catSel; })[0];
    if (!c) { $('au-rank').innerHTML = ''; return; }
    $('au-rank').innerHTML = '<thead><tr><th>' + T.pos + '</th><th colspan="2">' + T.prod + '</th><th>' + T.marca + '</th><th class="num">' + T.precio + '</th><th>' + T.vend + '</th></tr></thead><tbody>' +
      c.top.slice(0, 10).map(function (t) {
        return '<tr' + (t.tnf ? ' class="au-hl"' : '') + '><td class="mono">' + t.pos + '</td><td class="au-td-img">' + foto(t.foto, t.nombre) + '</td><td>' + link(t.permalink, corto(t.nombre, 70)) +
          '</td><td>' + esc(t.marca || '—') + '</td><td class="num">' + precio(t.precio) + '</td><td class="mono au-dim">' + esc(t.vendedor || '—') + '</td></tr>';
      }).join('') + '</tbody>';
  }

  function topProductos(v) {
    var lista = v.productos.filter(function (p) { return p.posiciones && p.posiciones.length; }).slice(0, 8);
    $('au-top').innerHTML = lista.map(function (p) {
      var mejor = p.posiciones.slice().sort(function (a, b) { return a.pos - b.pos; })[0];
      var pr = p.buyBox ? p.buyBox.precio : p.min;
      return '<article class="au-prod">' + foto(p.foto, p.nombre) +
        '<div><span class="au-prod-pos mono">#' + mejor.pos + ' · ' + esc(mejor.cat) + '</span>' +
        '<h4>' + link(p.permalink, corto(p.nombre, 60)) + '</h4>' +
        '<span class="au-prod-price">' + precio(pr) + '</span> <span class="au-dif mono ' + (p.dif > 0 ? 'up' : 'down') + '">' + pct(p.dif) + ' ' + T.vsComp + '</span></div></article>';
    }).join('');
  }

  function selectores(v) {
    var opciones = v.productos.map(function (p) {
      return '<option value="' + esc(p.id) + '">' + esc(corto(p.nombre, 60)) + '</option>';
    }).join('');
    var sp = $('au-pos-sel'), sv = $('au-price-sel');
    sp.innerHTML = opciones; sv.innerHTML = opciones;
    sp.onchange = function () { graficoPuesto(sp.value); };
    sv.onchange = function () { graficoPrecio(sv.value); };
    if (v.productos.length) { graficoPuesto(v.productos[0].id); graficoPrecio(v.productos[0].id); }
  }

  function graficoPuesto(id) {
    var h = datos.historia || [];
    var serie = h.map(function (d) { var p = d.p && d.p[id]; return p ? p[4] : null; });
    lineas($('au-pos-chart'), h.map(function (d) { return d.fecha; }), [{ nombre: T.puesto, valores: serie, cls: 's-tnf' }],
      { invertir: true, min: 1, ancho: 440, alto: 240, fmt: function (x) { return '#' + Math.round(x); } });
  }

  function graficoPrecio(id) {
    var h = datos.historia || [];
    var prod = datos.vista.productos.filter(function (p) { return p.id === id; })[0] || {};
    var catId = prod.catId;
    var bb = [], mn = [], cm = [];
    h.forEach(function (d) {
      var p = d.p && d.p[id];
      bb.push(p ? p[2] : null);
      mn.push(p ? p[0] : null);
      var cat = catId || (p && p[6]);
      var r = cat && d.r && d.r[cat];
      cm.push(r ? mediana(r.t.filter(function (t) { return !t[3]; }).map(function (t) { return t[4]; })) : null);
    });
    var series = [
      { nombre: T.bb, valores: bb, cls: 's-tnf' },
      { nombre: T.minL, valores: mn, cls: 's-min' },
      { nombre: T.compL, valores: cm, cls: 's-comp' }
    ];
    lineas($('au-price-chart'), h.map(function (d) { return d.fecha; }), series, { fmt: precio, compacto: true });
    $('au-price-legend').innerHTML = series.map(function (s) {
      return '<span class="au-leg ' + s.cls + '"><i></i>' + esc(s.nombre) + '</span>';
    }).join('');
  }

  // Link a las publicaciones de la marca en Mercado Libre Argentina
  function linkMarca(nombre) {
    var slug = String(nombre).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return slug ? link('https://listado.mercadolibre.com.ar/' + slug, nombre) : esc(nombre);
  }

  function marcas(v) {
    var lista = (v.marcas || []).filter(function (m) { return !/^Sin marca/.test(m.marca); }).slice(0, 10);
    var max = Math.max.apply(null, lista.map(function (m) { return m.apariciones; }).concat(1));
    $('au-brands').innerHTML = lista.map(function (m) {
      return '<div class="au-bar' + (m.tnf ? ' au-bar-tnf' : '') + '"><span class="au-bar-lbl">' + linkMarca(m.marca) + '</span>' +
        '<span class="au-bar-track"><span class="au-bar-fill" style="width:' + (m.apariciones / max * 100).toFixed(1) + '%"></span></span>' +
        '<span class="au-bar-val mono">' + m.apariciones + '<small> · ' + Math.round(m.share) + '%</small></span></div>';
    }).join('');
  }

  function competencia(v) {
    $('au-comp').innerHTML = '<thead><tr><th>' + T.prod + '</th><th>' + T.cat + '</th><th class="num">' + T.puesto + '</th><th class="num">' + T.bb + '</th><th class="num">' + T.min + '</th><th class="num">' + T.max + '</th><th class="num">' + T.nvend + '</th><th class="num">' + T.compMed + '</th><th class="num">' + T.dif + '</th></tr></thead><tbody>' +
      v.productos.map(function (p) {
        var mejor = (p.posiciones || []).slice().sort(function (a, b) { return a.pos - b.pos; })[0];
        return '<tr><td>' + link(p.permalink, corto(p.nombre, 56)) + '</td><td class="au-dim">' + esc(p.categoria || '—') + '</td><td class="num mono">' + (mejor ? '#' + mejor.pos : '—') +
          '</td><td class="num">' + precio(p.buyBox && p.buyBox.precio) + '</td><td class="num">' + precio(p.min) + '</td><td class="num">' + precio(p.max) +
          '</td><td class="num mono">' + (p.n || '—') + '</td><td class="num">' + precio(p.compMediana) + '</td><td class="num mono ' + (p.dif > 0 ? 'up' : 'down') + '">' + pct(p.dif) + '</td></tr>';
      }).join('') + '</tbody>';
  }

  function diferencias(cats) {
    var max = Math.max.apply(null, cats.map(function (c) { return Math.max(c.resumen.medianaTnf || 0, c.resumen.medianaComp || 0); }).concat(1));
    $('au-diff').innerHTML = cats.map(function (c) {
      var r = c.resumen;
      return '<div class="au-pair"><span class="au-bar-lbl">' + esc(c.nombre) + '</span><div class="au-pair-bars">' +
        '<span class="au-bar-track"><span class="au-bar-fill s-tnf" style="width:' + ((r.medianaTnf || 0) / max * 100).toFixed(1) + '%"></span><em>' + precio(r.medianaTnf) + '</em></span>' +
        '<span class="au-bar-track"><span class="au-bar-fill s-comp" style="width:' + ((r.medianaComp || 0) / max * 100).toFixed(1) + '%"></span><em>' + precio(r.medianaComp) + '</em></span>' +
        '</div></div>';
    }).join('') + '<div class="au-legend mono"><span class="au-leg s-tnf"><i></i>' + T.tnf + '</span><span class="au-leg s-comp"><i></i>' + T.comp + '</span></div>';
    $('au-diff-table').innerHTML = '<thead><tr><th>' + T.cat + '</th><th class="num">' + T.enTop + '</th><th class="num">' + T.mejor + '</th><th class="num">' + T.tnf + '</th><th class="num">' + T.comp + '</th><th class="num">' + T.dif + '</th><th>' + T.lider + '</th></tr></thead><tbody>' +
      cats.map(function (c) {
        var r = c.resumen;
        return '<tr><td>' + esc(c.nombre) + '</td><td class="num mono">' + r.tnfEnTop + '</td><td class="num mono">' + (r.mejorPuestoTnf ? '#' + r.mejorPuestoTnf : '—') +
          '</td><td class="num">' + precio(r.medianaTnf) + '</td><td class="num">' + precio(r.medianaComp) + '</td><td class="num mono ' + (r.dif > 0 ? 'up' : 'down') + '">' + pct(r.dif) +
          '</td><td>' + esc(r.lider ? r.lider.marca : '—') + '</td></tr>';
      }).join('') + '</tbody>';
  }

  /* ---- Gráfico de líneas en SVG (sin librerías: lo permite la CSP del sitio) */
  function lineas(el, fechas, series, op) {
    var W = op.ancho || 720, H = op.alto || 260, L = op.compacto ? 64 : 40, R = 14, TOP = 14, B = 28;
    var vals = [];
    series.forEach(function (s) { s.valores.forEach(function (x) { if (x != null && isFinite(x)) vals.push(x); }); });
    if (vals.length < 2) { el.innerHTML = '<p class="au-note mono">' + T.sinDatos + '</p>'; return; }
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    if (op.min != null) lo = Math.min(lo, op.min);
    if (hi === lo) hi = lo + 1;
    var pad = (hi - lo) * 0.08;
    if (!op.invertir) { lo = Math.max(0, lo - pad); hi += pad; } else { hi += 1; }
    var n = fechas.length;
    var x = function (i) { return L + (n === 1 ? 0 : i * (W - L - R) / (n - 1)); };
    var y = function (v) {
      var t = (v - lo) / (hi - lo);
      return op.invertir ? TOP + t * (H - TOP - B) : H - B - t * (H - TOP - B);
    };
    var compacto = function (v) {
      if (!op.compacto) return op.fmt(v);
      return v >= 1e6 ? '$' + (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? '$' + Math.round(v / 1e3) + 'k' : op.fmt(v);
    };
    var g = '';
    for (var k = 0; k <= 4; k++) {
      var v = lo + (hi - lo) * k / 4;
      var yy = y(v);
      g += '<line class="au-grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + yy.toFixed(1) + '" y2="' + yy.toFixed(1) + '"/>' +
        '<text class="au-axis" x="' + (L - 8) + '" y="' + (yy + 4).toFixed(1) + '" text-anchor="end">' + esc(compacto(v)) + '</text>';
    }
    var paso = Math.max(1, Math.ceil(n / 7));
    for (var i = 0; i < n; i += paso) {
      g += '<text class="au-axis" x="' + x(i).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(fecha(fechas[i])) + '</text>';
    }
    series.forEach(function (s) {
      var d = '', pen = false;
      s.valores.forEach(function (v, i) {
        if (v == null || !isFinite(v)) { pen = false; return; }
        d += (pen ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1);
        pen = true;
      });
      g += '<path class="au-line ' + s.cls + '" d="' + d + '"/>';
      var ult = -1;
      s.valores.forEach(function (v, i) { if (v != null && isFinite(v)) ult = i; });
      if (ult >= 0) g += '<circle class="au-dot ' + s.cls + '" cx="' + x(ult).toFixed(1) + '" cy="' + y(s.valores[ult]).toFixed(1) + '" r="4"><title>' + esc(s.nombre + ' · ' + fecha(fechas[ult]) + ': ' + op.fmt(s.valores[ult])) + '</title></circle>';
    });
    // Zona de lectura: al pasar el mouse se ve el valor de cada serie en esa fecha
    g += '<line class="au-cursor" x1="0" x2="0" y1="' + TOP + '" y2="' + (H - B) + '" visibility="hidden"/>';
    el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(series.map(function (s) { return s.nombre; }).join(', ')) + '">' + g + '</svg><div class="au-tip mono" hidden></div>';
    var svg = el.querySelector('svg'), cur = el.querySelector('.au-cursor'), tip = el.querySelector('.au-tip');
    svg.addEventListener('pointermove', function (e) {
      var r = svg.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width * W;
      var i = Math.max(0, Math.min(n - 1, Math.round((px - L) / ((W - L - R) / Math.max(1, n - 1)))));
      cur.setAttribute('x1', x(i)); cur.setAttribute('x2', x(i)); cur.setAttribute('visibility', 'visible');
      tip.hidden = false;
      tip.innerHTML = '<b>' + esc(fecha(fechas[i])) + '</b>' + series.map(function (s) {
        return '<span class="' + s.cls + '"><i></i>' + esc(op.fmt(s.valores[i])) + '</span>';
      }).join('');
      var left = x(i) / W * r.width;
      tip.style.left = Math.min(Math.max(left, 70), r.width - 70) + 'px';
    });
    svg.addEventListener('pointerleave', function () { cur.setAttribute('visibility', 'hidden'); tip.hidden = true; });
  }


  /* ---- Reporte automatizado con IA + PDF A4 ------------------------------ */
  function mdAHtml(md) {
    var out = [], lista = null;
    var cerrar = function () { if (lista) { out.push('</' + lista + '>'); lista = null; } };
    var inline = function (t) { return esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); };
    String(md || '').split(/\r?\n/).forEach(function (l) {
      var m;
      if ((m = l.match(/^#{1,3}\s+(.*)/))) { cerrar(); out.push('<h2>' + inline(m[1]) + '</h2>'); }
      else if ((m = l.match(/^\s*[-*•]\s+(.*)/))) { if (lista !== 'ul') { cerrar(); out.push('<ul>'); lista = 'ul'; } out.push('<li>' + inline(m[1]) + '</li>'); }
      else if ((m = l.match(/^\s*\d+[.)]\s+(.*)/))) { if (lista !== 'ol') { cerrar(); out.push('<ol>'); lista = 'ol'; } out.push('<li>' + inline(m[1]) + '</li>'); }
      else if (l.trim()) { cerrar(); out.push('<p>' + inline(l.trim()) + '</p>'); }
    });
    cerrar();
    return out.join('');
  }

  // Reporte de ejemplo: se arma con reglas simples a partir de los datos de ejemplo (sin IA)
  function reporteEjemplo(v) {
    var cats = v.categorias.filter(function (c) { return c.top && c.top.length; });
    var top = 0, difs = [], mejores = [], malas = [];
    cats.forEach(function (c) {
      top += c.resumen.tnfEnTop;
      if (c.resumen.dif != null) difs.push(c.resumen.dif);
      if (c.resumen.mejorPuestoTnf) {
        var t = c.top.filter(function (x) { return x.tnf; })[0];
        if (c.resumen.mejorPuestoTnf <= 2) mejores.push({ cat: c.nombre, pos: c.resumen.mejorPuestoTnf, nombre: corto(t.nombre, 50) });
        else malas.push({ cat: c.nombre, pos: c.resumen.mejorPuestoTnf, dif: pct(c.resumen.dif) });
      }
    });
    cats.slice().sort(function (a, b) { return (b.resumen.dif || 0) - (a.resumen.dif || 0); }).slice(0, 2).forEach(function (c) {
      if (!malas.some(function (m) { return m.cat === c.nombre; })) malas.push({ cat: c.nombre, pos: c.resumen.mejorPuestoTnf || '—', dif: pct(c.resumen.dif) });
    });
    var rival = (v.marcas || []).filter(function (m) { return !m.tnf && !/^Sin marca/.test(m.marca); })[0];
    var difMed = pct(mediana(difs));
    var peor = malas[0] ? malas[0].cat : (cats[0] && cats[0].nombre) || '';
    var li = function (a) { return a.map(function (x) { return '- ' + x; }).join('\n'); };
    return '## ' + T.rSum + '\n' + T.rResumen(cats.length, top, difMed) +
      '\n\n## ' + T.rOk + '\n' + li(mejores.slice(0, 3).map(T.rBien).concat(rival ? [T.rBienMarca(rival.marca, rival.apariciones, Math.round(rival.share))] : [])) +
      '\n\n## ' + T.rNo + '\n' + li(malas.slice(0, 3).map(T.rMal)) +
      '\n\n## ' + T.rTry + '\n1. ' + T.rProb1(cats[0] ? cats[0].nombre : '') + '\n2. ' + T.rProb2(peor) + '\n3. ' + T.rProb3;
  }

  function mostrarReporte(md, meta, aviso) {
    $('au-report-body').innerHTML = mdAHtml(md);
    $('au-report-meta').textContent = meta || '';
    var foot = document.querySelector('.au-report-foot');
    if (foot) { if (!foot.getAttribute('data-ia')) foot.setAttribute('data-ia', foot.textContent); foot.textContent = aviso ? T.repPie : foot.getAttribute('data-ia'); }
    var f = $('au-report-flag');
    f.hidden = !aviso;
    f.textContent = aviso || '';
    $('au-report').hidden = false;
    document.title = (EN ? 'The North Face report · La Vicuña' : 'Reporte The North Face · La Vicuña');
  }

  function crearReporte() {
    var btn = $('au-ai-btn');
    if (!datos) return;
    btn.disabled = true;
    var label = btn.textContent;
    btn.textContent = T.repGen;
    var hoy = new Date().toLocaleDateString(EN ? 'en-US' : 'es-AR');
    var ejemplo = function () {
      mostrarReporte(reporteEjemplo(datos.vista), hoy, T.repEjemplo);
    };
    var fin = function () { btn.disabled = false; btn.textContent = label; $('au-report').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    if (datos.demo) { ejemplo(); fin(); return; }
    fetch('/.netlify/functions/tnf-reporte-ai' + (EN ? '?lang=en' : ''), { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.ejemplo) ejemplo();
        else if (d.error && d.motivo) mostrarReporte(reporteEjemplo(datos.vista), hoy, T.repBasico);
        else if (d.error) { $('au-report').hidden = false; $('au-report-body').innerHTML = '<p>' + esc(d.error) + '</p>'; $('au-report-flag').hidden = true; }
        else mostrarReporte(d.text, fecha(d.fecha) + ' · ' + T.repIA, '');
      })
      .catch(function () { $('au-report').hidden = false; $('au-report-body').innerHTML = '<p>' + esc(T.repErr) + '</p>'; })
      .then(fin);
  }

  function iniciarReporte() {
    if (!$('au-ai-btn')) return;
    $('au-ai-btn').addEventListener('click', crearReporte);
    $('au-report-again').addEventListener('click', crearReporte);
    $('au-report-pdf').addEventListener('click', function () { window.print(); });
  }

  /* ---- Zona admin ------------------------------------------------------- */
  var API_ADMIN = '/.netlify/functions/admin';

  function postAdmin(body) {
    return fetch(API_ADMIN, {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    }).then(function (r) { return r.json().then(function (d) { d._ok = r.ok; return d; }); });
  }

  function pintarAdmin(d) {
    var panel = $('au-panel'), login = $('au-login');
    if (!panel) return;
    if (!d || !d.admin) { panel.hidden = true; login.hidden = false; return; }
    login.hidden = true;
    panel.hidden = false;
    var ul = $('au-links');
    ul.innerHTML = '';
    (d.links || []).forEach(function (l) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.textContent = l.titulo;
      if (/^https?:\/\//.test(l.url) || /^\/(?!\/)/.test(l.url)) a.href = l.url;
      if (/^https?:\/\//.test(l.url)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
      var x = document.createElement('button');
      x.type = 'button';
      x.className = 'au-x mono';
      x.textContent = T.quitar;
      x.addEventListener('click', function () { postAdmin({ accion: 'quitar', id: l.id }).then(pintarAdmin); });
      li.appendChild(a);
      li.appendChild(x);
      ul.appendChild(li);
    });
  }

  function iniciarAdmin() {
    var box = $('au-admin');
    if (!box) return;
    if (location.hash === '#admin') box.open = true;
    fetch(API_ADMIN, { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (d) {
      pintarAdmin(d);
      if (d.admin || location.hash === '#admin') box.open = true;
    }).catch(function () {});

    $('au-login').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, msg = $('au-login-msg');
      msg.textContent = T.entrar;
      postAdmin({ accion: 'login', usuario: f.usuario.value, clave: f.clave.value }).then(function (d) {
        f.clave.value = '';
        msg.textContent = d._ok ? '' : (d.error || T.error);
        if (d._ok) pintarAdmin(d);
      }).catch(function () { msg.textContent = T.error; });
    });

    $('au-add').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target;
      postAdmin({ accion: 'agregar', titulo: f.titulo.value, url: f.url.value }).then(function (d) {
        $('au-panel-msg').textContent = d._ok ? '' : (d.error || T.error);
        if (d._ok) { f.reset(); pintarAdmin(d); }
      });
    });

    $('au-logout').addEventListener('click', function () {
      postAdmin({ accion: 'logout' }).then(pintarAdmin);
    });
  }

  /* ---- Botón público: releva solo The North Face ------------------------ */
  function iniciarRefrescar() {
    var btn = $('au-refresh'), msg = $('au-refresh-msg');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var vuelta = 0;
      btn.disabled = true;
      (function paso() {
        fetch('/.netlify/functions/tnf-ml', {
          method: 'POST', credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' }, body: '{}'
        }).then(function (r) { return r.json().then(function (d) { d._ok = r.ok; return d; }); }).then(function (d) {
          if (d.sinCuenta) { msg.textContent = T.sinMonitor; btn.disabled = false; return; }
          if (!d._ok || d.error) throw new Error(d.error || T.error);
          if (d.yaListo) { msg.textContent = T.yaListo; btn.disabled = false; cargar(); return; }
          msg.textContent = T.relevando + Math.min(d.vista.paso + 1, d.vista.pasos) + '/' + d.vista.pasos;
          if (d.vista.listo || ++vuelta >= 25) { msg.textContent = T.listo; btn.disabled = false; cargar(); return; }
          paso();
        }).catch(function (e) { msg.textContent = e.message || T.error; btn.disabled = false; });
      })();
    });
  }

  cargar();
  iniciarReporte();
  iniciarAdmin();
  iniciarRefrescar();
})();
