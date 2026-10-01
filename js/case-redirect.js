/* Páginas /casos/*: existen solo para que cada caso tenga su propia vista
   previa al compartirlo (WhatsApp, LinkedIn, etc.). El visitante se redirige
   a la home con el caso abierto, conservando los UTMs del enlace. */
(function () {
  var s = document.currentScript;
  var slug = s && s.getAttribute('data-case');
  if (slug) location.replace('/' + location.search + '#' + slug);
})();
