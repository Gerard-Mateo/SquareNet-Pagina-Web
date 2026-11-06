// Ampliar las pantallas de muestra en celular: al tocar una (.mod-fn-media.rp-stage) se abre a pantalla completa
// con su tamaño natural y se recorre con el dedo. Es la misma caja que se ve en la página (no una copia), así que
// la animación sigue corriendo y su fit() la reescala sola al nuevo ancho. Estilos .zoom-* en broadsheet.css.
(function () {
  var mq = window.matchMedia ? window.matchMedia('(max-width: 860px)') : { matches: false };
  var state = null;

  function resize() { window.dispatchEvent(new Event('resize')); }

  function close() {
    if (!state) return;
    var s = state; state = null;
    s.ph.parentNode.insertBefore(s.media, s.ph);
    s.ph.parentNode.removeChild(s.ph);
    s.media.classList.remove('is-zoomed');
    s.media.style.width = '';
    s.ov.parentNode.removeChild(s.ov);
    document.documentElement.classList.remove('zoom-lock');
    document.removeEventListener('keydown', s.onKey);
    resize();
    if (s.opener && s.opener.focus) s.opener.focus({ preventScroll: true });
  }

  function open(media) {
    var root = media.firstElementChild;
    if (!root || state) return;
    var w = root.offsetWidth;                                    // ancho natural (el transform no lo cambia)
    if (!w || w < media.clientWidth * 1.12) return;              // ya se ve casi a su tamaño: no hay nada que ampliar
    var ph = document.createElement('div');
    ph.className = 'zoom-ph';
    ph.style.height = media.offsetHeight + 'px';
    media.parentNode.insertBefore(ph, media);
    var ov = document.createElement('div');
    ov.className = 'zoom-ov';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', 'Pantalla ampliada');
    ov.innerHTML = '<button type="button" class="zoom-x" aria-label="Cerrar">&times;</button>' +
      '<p class="zoom-hint">Desliza para ver toda la pantalla</p><div class="zoom-sc"></div>';
    var sc = ov.querySelector('.zoom-sc');
    sc.appendChild(media);
    media.classList.add('is-zoomed');
    media.style.width = w + 'px';
    document.body.appendChild(ov);
    document.documentElement.classList.add('zoom-lock');
    var onKey = function (e) { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    ov.addEventListener('click', function (e) { if (e.target === ov || e.target === sc || e.target.classList.contains('zoom-x')) close(); });
    state = { media: media, ph: ph, ov: ov, onKey: onKey, opener: document.activeElement };
    resize();
    ov.querySelector('.zoom-x').focus({ preventScroll: true });
  }

  document.addEventListener('click', function (e) {
    if (!mq.matches || state) return;
    var media = e.target.closest ? e.target.closest('.mod-fn-media.is-zoomable') : null;
    if (media) open(media);
  });
  document.addEventListener('keydown', function (e) {
    if (!mq.matches || state || (e.key !== 'Enter' && e.key !== ' ')) return;
    if (e.target.classList && e.target.classList.contains('is-zoomable')) { e.preventDefault(); open(e.target); }
  });
  // solo se marca como ampliable (aviso «Toca para ampliar») la pantalla que en celular se ve más chica que su tamaño natural
  function mark() {
    Array.prototype.forEach.call(document.querySelectorAll('.mod-fn-media.rp-stage'), function (m) {
      if (m.classList.contains('is-zoomed')) return;
      var root = m.firstElementChild, ok = !!(mq.matches && root && root.offsetWidth >= m.clientWidth * 1.12);
      m.classList.toggle('is-zoomable', ok);
      if (ok) { m.setAttribute('tabindex', '0'); m.setAttribute('role', 'button'); m.setAttribute('aria-label', 'Ampliar pantalla'); }
      else { m.removeAttribute('tabindex'); m.removeAttribute('role'); m.removeAttribute('aria-label'); }
    });
  }
  mark();
  window.addEventListener('load', mark);
  setTimeout(mark, 1000);   // por si alguna maqueta termina de acomodarse después de la carga
  window.addEventListener('resize', function () { if (!state) mark(); });
})();
