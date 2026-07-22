/* La Vicuña Digital Agency — main.js
   Idioma ES/EN · reveals · grano · humo del hero · previews de trabajos */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Idioma ES/EN ---------------------------------------------------- */
  var btnEs = document.getElementById('btn-es');
  var btnEn = document.getElementById('btn-en');

  function setLang(lang) {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-es]').forEach(function (el) {
      var text = el.getAttribute('data-' + lang);
      if (text) el.textContent = text;
    });
    btnEs.setAttribute('aria-pressed', String(lang === 'es'));
    btnEn.setAttribute('aria-pressed', String(lang === 'en'));
    try { localStorage.setItem('lv-lang', lang); } catch (e) {}
  }

  if (btnEs && btnEn) {
    btnEs.addEventListener('click', function () { setLang('es'); });
    btnEn.addEventListener('click', function () { setLang('en'); });
    var saved = null;
    try { saved = localStorage.getItem('lv-lang'); } catch (e) {}
    if (saved === 'en') setLang('en');
  }

  /* ---- Tema claro / oscuro ---------------------------------------------- */
  var themeBtn = document.getElementById('btn-theme');
  if (themeBtn) {
    var storedTheme = null;
    try { storedTheme = localStorage.getItem('lv-theme'); } catch (e) {}
    if (storedTheme === 'light') document.documentElement.setAttribute('data-theme', 'light');
    themeBtn.addEventListener('click', function () {
      var light = document.documentElement.getAttribute('data-theme') === 'light';
      if (light) {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
      }
      try { localStorage.setItem('lv-theme', light ? 'dark' : 'light'); } catch (e) {}
    });
  }

  /* ---- Barra de cookies --------------------------------------------------- */
  var cookieBar = document.getElementById('cookie-bar');
  if (cookieBar) {
    var consent = null;
    try { consent = localStorage.getItem('lv-consent'); } catch (e) {}
    if (!consent) cookieBar.hidden = false;
    function answerConsent(value) {
      try { localStorage.setItem('lv-consent', value); } catch (e) {}
      cookieBar.hidden = true;
    }
    cookieBar.querySelector('.cookie-accept').addEventListener('click', function () { answerConsent('accepted'); });
    cookieBar.querySelector('.cookie-reject').addEventListener('click', function () { answerConsent('rejected'); });
  }

  /* ---- Miniaturas embebidas de trabajos: escalar al ancho de la tarjeta --- */
  function scaleThumbs() {
    document.querySelectorAll('.work-thumb').forEach(function (thumb) {
      var iframe = thumb.querySelector('iframe');
      if (iframe) iframe.style.transform = 'scale(' + (thumb.clientWidth / 1280) + ')';
    });
  }
  scaleThumbs();
  window.addEventListener('resize', scaleThumbs);

  /* ---- Imágenes faltantes: ocultar en vez de mostrar ícono roto --------- */
  document.querySelectorAll('img').forEach(function (img) {
    var hide = function () { img.style.visibility = 'hidden'; };
    img.addEventListener('error', hide);
    // el script corre con defer: la carga pudo fallar antes de llegar acá
    if (img.complete && img.naturalWidth === 0) hide();
  });

  /* ---- Links pendientes (data-todo) ------------------------------------ */
  document.querySelectorAll('a[data-todo]').forEach(function (a) {
    if (a.getAttribute('href') === '#') a.style.display = 'none';
  });

  /* ---- Reveal on scroll ------------------------------------------------- */
  var revealed = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealed.forEach(function (el) { io.observe(el); });
  } else {
    revealed.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---- Servicios: pintar palabra y desplegar descripción ---------------- */
  var finePointerSvc = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  // Modo "campo flotante": solo desktop ancho, con puntero fino y sin reduce-motion
  var svcScatter = finePointerSvc && !reduceMotion && window.innerWidth > 760;
  var svcTriggers = document.querySelectorAll('.svc-trigger');
  svcTriggers.forEach(function (trigger) {
    // En modo lista: click despliega la descripción inline (acordeón)
    trigger.addEventListener('click', function () {
      if (svcScatter) return; // en campo flotante lo maneja el overlay
      var item = trigger.closest('.svc-item');
      var isOpen = item.classList.contains('open');
      document.querySelectorAll('.svc-item.open').forEach(function (other) {
        if (other !== item) {
          other.classList.remove('open');
          var t = other.querySelector('.svc-trigger');
          if (t) t.setAttribute('aria-expanded', 'false');
        }
      });
      item.classList.toggle('open', !isOpen);
      trigger.setAttribute('aria-expanded', String(!isOpen));
    });

    // Imán suave (solo modo lista, no en campo flotante)
    if (finePointerSvc && !reduceMotion && !svcScatter) {
      var word = trigger.querySelector('.svc-word');
      trigger.addEventListener('mousemove', function (e) {
        if (trigger.closest('.svc-item').classList.contains('open')) return;
        var r = trigger.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) * 0.05;
        var dy = (e.clientY - (r.top + r.height / 2)) * 0.12;
        word.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      });
      trigger.addEventListener('mouseleave', function () {
        word.style.transform = '';
      });
    }
  });

  /* ---- Servicios: campo flotante (deriva libre + rebote en bordes) ------- */
  (function initScatter() {
    if (!svcScatter) return;
    var section = document.querySelector('.services');
    var list = section && section.querySelector('.svc-lines');
    if (!section || !list) return;
    section.classList.add('scatter');

    var items = Array.prototype.slice.call(list.querySelectorAll('.svc-item')).map(function (el) {
      return { el: el, trigger: el.querySelector('.svc-trigger'), x: 0, y: 0, vx: 0, vy: 0, w: 0, h: 0, paused: false };
    });

    // Panel de descripción (overlay)
    var overlay = document.createElement('div');
    overlay.className = 'svc-overlay';
    overlay.innerHTML =
      '<div class="svc-overlay-card">' +
        '<span class="ov-num mono"></span>' +
        '<h3 class="ov-word"></h3>' +
        '<p class="ov-desc"></p>' +
        '<button class="ov-close mono" type="button" data-es="Cerrar ✕" data-en="Close ✕">Cerrar ✕</button>' +
      '</div>';
    section.appendChild(overlay);
    var ovNum = overlay.querySelector('.ov-num');
    var ovWord = overlay.querySelector('.ov-word');
    var ovDesc = overlay.querySelector('.ov-desc');
    var overlayOpen = false;

    function openOverlay(it) {
      var num = it.el.querySelector('.svc-num');
      var word = it.el.querySelector('.w-base');
      var desc = it.el.querySelector('.svc-desc p');
      ovNum.textContent = (num ? num.textContent : '') + ' · Servicio';
      ovWord.textContent = word ? word.textContent : '';
      ovDesc.textContent = desc ? desc.textContent : '';
      overlay.classList.add('show');
      overlayOpen = true;
    }
    function closeOverlay() {
      overlay.classList.remove('show');
      overlayOpen = false;
    }
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay || e.target.classList.contains('ov-close')) closeOverlay();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlayOpen) closeOverlay();
    });

    var box = { w: 0, h: 0 };
    function measure() {
      var r = list.getBoundingClientRect();
      box.w = r.width; box.h = r.height;
      items.forEach(function (it) {
        var ir = it.el.getBoundingClientRect();
        it.w = ir.width; it.h = ir.height;
        // clamp por si el resize dejó algo afuera
        it.x = Math.max(0, Math.min(it.x, box.w - it.w));
        it.y = Math.max(0, Math.min(it.y, box.h - it.h));
      });
    }

    // Posiciones iniciales repartidas en una grilla 3×2 con jitter
    function seed() {
      var cols = 3, rows = 2;
      items.forEach(function (it, i) {
        var cw = box.w / cols, ch = box.h / rows;
        var cx = (i % cols) * cw, cy = Math.floor(i / cols) * ch;
        it.x = Math.max(0, Math.min(cx + Math.random() * (cw - it.w), box.w - it.w));
        it.y = Math.max(0, Math.min(cy + Math.random() * (ch - it.h), box.h - it.h));
        var ang = Math.random() * Math.PI * 2;
        var sp = 0.28 + Math.random() * 0.26;
        it.vx = Math.cos(ang) * sp;
        it.vy = Math.sin(ang) * sp;
        it.el.style.transform = 'translate(' + it.x + 'px,' + it.y + 'px)';
      });
    }

    // Hover: pausar esa opción (fácil de clickear) + resaltar
    items.forEach(function (it) {
      it.trigger.addEventListener('mouseenter', function () { it.paused = true; it.el.classList.add('grabbed'); });
      it.trigger.addEventListener('mouseleave', function () { it.paused = false; it.el.classList.remove('grabbed'); });
      it.trigger.addEventListener('focus', function () { it.paused = true; });
      it.trigger.addEventListener('blur', function () { it.paused = false; });
      it.trigger.addEventListener('click', function () { openOverlay(it); });
    });

    measure(); seed();
    window.addEventListener('resize', measure);

    (function tick() {
      if (!overlayOpen) {
        for (var i = 0; i < items.length; i++) {
          var it = items[i];
          if (it.paused) continue;
          it.x += it.vx; it.y += it.vy;
          if (it.x <= 0) { it.x = 0; it.vx = Math.abs(it.vx); }
          else if (it.x >= box.w - it.w) { it.x = box.w - it.w; it.vx = -Math.abs(it.vx); }
          if (it.y <= 0) { it.y = 0; it.vy = Math.abs(it.vy); }
          else if (it.y >= box.h - it.h) { it.y = box.h - it.h; it.vy = -Math.abs(it.vy); }
          it.el.style.transform = 'translate(' + it.x + 'px,' + it.y + 'px)';
        }
      }
      requestAnimationFrame(tick);
    })();
  })();

  /* ---- Servicios: animación de fondo (blobs a la deriva) ----------------- */
  var svcBg = document.querySelector('.svc-bg');
  if (svcBg && !reduceMotion) {
    var sctx = svcBg.getContext('2d');
    var SW, SH, SDPR = Math.min(window.devicePixelRatio || 1, 2);
    var palette = [[127,174,147],[90,140,112],[63,107,84],[120,95,150],[160,180,150]];
    var svcBlobs = [];
    function sizeSvcBg() {
      var rect = svcBg.getBoundingClientRect();
      SW = svcBg.width = Math.max(1, Math.floor(rect.width * SDPR));
      SH = svcBg.height = Math.max(1, Math.floor(rect.height * SDPR));
    }
    sizeSvcBg();
    window.addEventListener('resize', sizeSvcBg);
    for (var sb = 0; sb < 6; sb++) {
      var col = palette[sb % palette.length];
      svcBlobs.push({
        x: Math.random(), y: Math.random(),
        r: 0.30 + Math.random() * 0.26,
        dx: (Math.random() - 0.5) * 0.00016,
        dy: (Math.random() - 0.5) * 0.00013,
        col: col, a: 0.14 + Math.random() * 0.12,
        ph: Math.random() * 6.28, sp: 0.0006 + Math.random() * 0.0006
      });
    }
    (function drawSvcBg(t) {
      sctx.clearRect(0, 0, SW, SH);
      sctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < svcBlobs.length; i++) {
        var b = svcBlobs[i];
        b.x += b.dx; b.y += b.dy;
        if (b.x < -0.3) b.x = 1.3; else if (b.x > 1.3) b.x = -0.3;
        if (b.y < -0.3) b.y = 1.3; else if (b.y > 1.3) b.y = -0.3;
        var pulse = 0.85 + 0.15 * Math.sin(t * b.sp + b.ph);
        var R = b.r * Math.max(SW, SH) * pulse;
        var g = sctx.createRadialGradient(b.x * SW, b.y * SH, 0, b.x * SW, b.y * SH, R);
        g.addColorStop(0, 'rgba(' + b.col[0] + ',' + b.col[1] + ',' + b.col[2] + ',' + b.a + ')');
        g.addColorStop(1, 'rgba(' + b.col[0] + ',' + b.col[1] + ',' + b.col[2] + ',0)');
        sctx.fillStyle = g;
        sctx.beginPath(); sctx.arc(b.x * SW, b.y * SH, R, 0, 6.2832); sctx.fill();
      }
      sctx.globalCompositeOperation = 'source-over';
      requestAnimationFrame(drawSvcBg);
    })(0);
  }

  /* ---- Preview de trabajos (modal con iframe) ---------------------------- */
  var modal = document.getElementById('preview-modal');
  if (modal) {
    var frame = modal.querySelector('.preview-frame');
    var loadingMsg = modal.querySelector('.preview-loading');
    var titleEl = modal.querySelector('#preview-title');
    var openLink = modal.querySelector('.preview-open');
    var lastFocus = null;

    frame.addEventListener('load', function () {
      if (frame.src) frame.classList.add('loaded');
    });

    function openPreview(url, title) {
      lastFocus = document.activeElement;
      titleEl.textContent = title;
      openLink.href = url;
      frame.classList.remove('loaded');
      frame.src = url;
      modal.hidden = false;
      document.body.classList.add('modal-open');
      modal.querySelector('.preview-close').focus();
    }

    function closePreview() {
      modal.hidden = true;
      frame.classList.remove('loaded');
      frame.src = '';
      document.body.classList.remove('modal-open');
      if (lastFocus) lastFocus.focus();
    }

    document.querySelectorAll('[data-preview]').forEach(function (card) {
      card.addEventListener('click', function (e) {
        // con modificadores se respeta el comportamiento normal (nueva pestaña)
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        openPreview(card.getAttribute('data-preview'), card.getAttribute('data-title') || 'Preview');
      });
    });

    modal.querySelectorAll('[data-close]').forEach(function (el) {
      el.addEventListener('click', closePreview);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) closePreview();
    });
  }

  /* ---- Video del hero: ocultar si el archivo no está --------------------- */
  var video = document.querySelector('.hero-video');
  if (video) {
    var source = video.querySelector('source');
    var hideVideo = function () { video.style.display = 'none'; };
    video.addEventListener('error', hideVideo);
    if (source) source.addEventListener('error', hideVideo);
  }

  /* ---- Efectos de mouse (solo desktop con puntero fino) ------------------- */
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (finePointer && !reduceMotion) {

    // Luz cálida que sigue al cursor
    var spot = document.createElement('div');
    spot.id = 'spotlight';
    spot.style.transform = 'translate(-1000px,-1000px)';
    document.body.appendChild(spot);
    var spotX = 0, spotY = 0, spotTX = 0, spotTY = 0, spotRaf = null;
    document.addEventListener('mousemove', function (e) {
      spotTX = e.clientX;
      spotTY = e.clientY;
      if (!spotRaf) spotRaf = requestAnimationFrame(moveSpot);
    });
    function moveSpot() {
      spotX += (spotTX - spotX) * 0.12;
      spotY += (spotTY - spotY) * 0.12;
      spot.style.transform = 'translate(' + spotX + 'px,' + spotY + 'px)';
      spotRaf = (Math.abs(spotTX - spotX) > 0.5 || Math.abs(spotTY - spotY) > 0.5)
        ? requestAnimationFrame(moveSpot)
        : null;
    }

    // Parallax sutil del hero
    var heroCenter = document.querySelector('.hero-center');
    var hero = document.querySelector('.hero');
    if (hero && heroCenter) {
      hero.addEventListener('mousemove', function (e) {
        var dx = (e.clientX / window.innerWidth - 0.5) * 18;
        var dy = (e.clientY / window.innerHeight - 0.5) * 12;
        heroCenter.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      });
      hero.addEventListener('mouseleave', function () {
        heroCenter.style.transform = '';
      });
    }

    // Brillo que sigue al mouse dentro de cada tarjeta de trabajo
    document.querySelectorAll('.work').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
        card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
      });
    });

    // Botones magnéticos
    document.querySelectorAll('.btn').forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        var dx = (e.clientX - r.left - r.width / 2) * 0.18;
        var dy = (e.clientY - r.top - r.height / 2) * 0.3;
        btn.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      });
      btn.addEventListener('mouseleave', function () {
        btn.style.transform = '';
      });
    });
  }

  /* ---- Grano de película -------------------------------------------------- */
  var grain = document.getElementById('grain');
  if (grain && !reduceMotion) {
    var gctx = grain.getContext('2d');
    var gw, gh;

    function sizeGrain() {
      gw = grain.width = Math.floor(window.innerWidth / 2);
      gh = grain.height = Math.floor(window.innerHeight / 2);
    }
    sizeGrain();
    window.addEventListener('resize', sizeGrain);

    var grainFrame = 0;
    (function drawGrain() {
      // regenerar cada 3 frames alcanza para la textura y ahorra CPU
      if (grainFrame++ % 3 === 0) {
        var image = gctx.createImageData(gw, gh);
        var data = image.data;
        for (var i = 0; i < data.length; i += 4) {
          var v = (Math.random() * 255) | 0;
          data[i] = data[i + 1] = data[i + 2] = v;
          data[i + 3] = 26;
        }
        gctx.putImageData(image, 0, 0);
      }
      requestAnimationFrame(drawGrain);
    })();
  } else if (grain) {
    grain.style.display = 'none';
  }

  /* ---- Atmósfera de humo del hero ------------------------------------------ */
  var atmos = document.getElementById('atmos');
  if (atmos && !reduceMotion) {
    var actx = atmos.getContext('2d');
    var aw, ah, blobs = [];

    function sizeAtmos() {
      aw = atmos.width = window.innerWidth;
      ah = atmos.height = window.innerHeight;
    }
    sizeAtmos();
    window.addEventListener('resize', sizeAtmos);

    for (var b = 0; b < 14; b++) {
      blobs.push({
        x: Math.random(),
        y: Math.random(),
        r: 0.18 + Math.random() * 0.3,
        dx: (Math.random() - 0.5) * 0.0005,
        dy: (Math.random() - 0.5) * 0.0003,
        a: 0.03 + Math.random() * 0.05
      });
    }

    (function drawAtmos() {
      actx.clearRect(0, 0, aw, ah);
      blobs.forEach(function (p) {
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < -0.3) p.x = 1.3; else if (p.x > 1.3) p.x = -0.3;
        if (p.y < -0.3) p.y = 1.3; else if (p.y > 1.3) p.y = -0.3;
        var r = p.r * Math.max(aw, ah);
        var g = actx.createRadialGradient(p.x * aw, p.y * ah, 0, p.x * aw, p.y * ah, r);
        g.addColorStop(0, 'rgba(217,215,212,' + p.a + ')');
        g.addColorStop(1, 'rgba(217,215,212,0)');
        actx.fillStyle = g;
        actx.beginPath();
        actx.arc(p.x * aw, p.y * ah, r, 0, Math.PI * 2);
        actx.fill();
      });
      requestAnimationFrame(drawAtmos);
    })();
  }
})();
