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
