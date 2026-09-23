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
      if (i > 0) el.style.setProperty('--rd', (Math.min(i, 8) * 0.07).toFixed(2) + 's');
      el.classList.add('is-in');
      io.unobserve(el);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });

  Array.prototype.forEach.call(els, function (el) { io.observe(el); });
})();
