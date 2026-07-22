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
  var svcTriggers = document.querySelectorAll('.svc-trigger');
  svcTriggers.forEach(function (trigger) {
    trigger.addEventListener('click', function () {
      var item = trigger.closest('.svc-item');
      var isOpen = item.classList.contains('open');
      // acordeón: cerrar los demás
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
  });

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
