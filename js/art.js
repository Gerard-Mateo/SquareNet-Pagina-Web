// Arte de línea compartido (.la): mide cada trazo [data-draw] para que se dibuje solo
// (stroke-dashoffset), escalona los tiempos y arranca recién cuando el arte entra en pantalla.
(function () {
  var arts = document.querySelectorAll('.la');
  if (!arts.length) return;

  Array.prototype.forEach.call(arts, function (art) {
    var base = parseFloat(art.getAttribute('data-delay') || '0.1');
    var step = 0;
    Array.prototype.forEach.call(art.querySelectorAll('[data-draw]'), function (el) {
      var len = 0;
      try { len = el.getTotalLength(); } catch (e) { len = 0; }
      if (!len) return;
      el.style.setProperty('--len', len.toFixed(1));
      if (!el.style.getPropertyValue('--d')) el.style.setProperty('--d', (base + step * 0.06).toFixed(2) + 's');
      step++;
    });
    var tail = base + step * 0.06;
    Array.prototype.forEach.call(art.querySelectorAll('[data-pop], [data-fade]'), function (el, i) {
      if (!el.style.getPropertyValue('--d')) el.style.setProperty('--d', (tail + i * 0.08).toFixed(2) + 's');
    });
    art.classList.add('la-ready');
  });

  if (!('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(arts, function (a) { a.classList.add('is-play'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    Array.prototype.forEach.call(entries, function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-play');
      io.unobserve(entry.target);
    });
  }, { threshold: 0.25 });
  Array.prototype.forEach.call(arts, function (a) { io.observe(a); });
})();
