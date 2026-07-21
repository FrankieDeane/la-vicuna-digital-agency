/* La Vicuña Digital Agency — main.js
   Idioma ES/EN · reveals · grano · humo del hero · acordeón de servicios */
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

  /* ---- Acordeón de servicios -------------------------------------------- */
  document.querySelectorAll('.svc').forEach(function (svc) {
    function toggle() { svc.classList.toggle('open'); }
    svc.addEventListener('click', toggle);
    svc.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  });

  /* ---- Video del hero: ocultar si el archivo no está --------------------- */
  var video = document.querySelector('.hero-video');
  if (video) {
    var source = video.querySelector('source');
    var hideVideo = function () { video.style.display = 'none'; };
    video.addEventListener('error', hideVideo);
    if (source) source.addEventListener('error', hideVideo);
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
