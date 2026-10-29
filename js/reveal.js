// Reveal on scroll compartido: cualquier elemento con [data-reveal] entra al verse.
// Los hermanos con [data-reveal] se escalonan solos (--rd).
(function () {
  var els = document.querySelectorAll('[data-reveal]');
  if (!els.length) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(els, function (el) { el.classList.add('is-in'); });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    Array.prototype.forEach.call(entries, function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      var siblings = el.parentNode.querySelectorAll(':scope > [data-reveal]');
      var i = Array.prototype.indexOf.call(siblings, el);
      // [data-reveal-rows] en el padre: la grilla entra fila por fila; el escalón es la columna, no el índice
      if (el.parentNode.hasAttribute('data-reveal-rows')) {
        var top = el.offsetTop, col = 0;
        for (var k = 0; k < i; k++) if (Math.abs(siblings[k].offsetTop - top) < 4) col++;
        i = col * 1.7;
      }
      if (i > 0) el.style.setProperty('--rd', (Math.min(i, 8) * 0.07).toFixed(2) + 's');
      el.classList.add('is-in');
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });

  Array.prototype.forEach.call(els, function (el) { io.observe(el); });
})();
