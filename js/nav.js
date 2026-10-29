// Nav fijo: al bajar del tope de la página se vuelve una píldora flotante (html.nav-scrolled).
(function () {
  var root = document.documentElement, on = false;
  function update() {
    var s = window.scrollY > 12;
    if (s !== on) { on = s; root.classList.toggle('nav-scrolled', s); }
  }
  window.addEventListener('scroll', update, { passive: true });
  update();
})();

// Bloques de contacto (CTA): aparecen al entrar en pantalla (estilos .cta-js / .cta-on en broadsheet.css).
(function () {
  var els = document.querySelectorAll('.cta-band, .mod-cta, .modulos-cta');
  if (!els.length || !('IntersectionObserver' in window)) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.documentElement.classList.add('cta-js');
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('cta-on'); io.unobserve(e.target); } });
  }, { threshold: 0.25 });
  Array.prototype.forEach.call(els, function (el) { io.observe(el); });
})();
