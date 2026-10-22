// Consentimiento de cookies + Google Analytics 4 + anuncios de Google AdSense (todas las páginas).
// Pegar el ID de medición de GA4 en GA_ID (formato "G-XXXXXXXXXX", sale de
// Analytics → Administrar → Flujos de datos). Mientras esté vacío no se muestra el banner
// ni se carga nada: sin analítica, el sitio no pone cookies propias.
// Anuncios: pegar el ID de editor de AdSense en ADSENSE_CLIENT ("ca-pub-XXXXXXXXXXXXXXXX") y el ID de
// cada bloque de anuncios en el data-ad-slot de su <aside class="ad-slot"> en la página. Los espacios
// quedan ocultos hasta que el visitante acepta las cookies y Google sirve un anuncio.
(function () {
  var GA_ID = '';
  var ADSENSE_CLIENT = '';
  var KEY = 'sqn-consent'; // 'granted' | 'denied'

  var script = document.currentScript;
  var policyUrl = script ? new URL('../privacidad.html', script.src).href : '/privacidad.html';

  function getChoice() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function setChoice(v) {
    try { localStorage.setItem(KEY, v); } catch (e) { /* sin almacenamiento: se vuelve a preguntar */ }
  }

  var gaLoaded = false;
  function loadGA() {
    if (gaLoaded || !GA_ID) return;
    gaLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
  }

  var adsLoaded = false;
  function loadAds() {
    if (adsLoaded || !ADSENSE_CLIENT) return;
    var slots = Array.prototype.filter.call(document.querySelectorAll('.ad-slot[data-ad-slot]'), function (el) {
      return el.getAttribute('data-ad-slot');
    });
    if (!slots.length) return;
    adsLoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(ADSENSE_CLIENT);
    document.head.appendChild(s);
    slots.forEach(function (el) {
      var ins = document.createElement('ins');
      ins.className = 'adsbygoogle';
      ins.style.display = 'block';
      ins.setAttribute('data-ad-client', ADSENSE_CLIENT);
      ins.setAttribute('data-ad-slot', el.getAttribute('data-ad-slot'));
      ins.setAttribute('data-ad-format', 'auto');
      ins.setAttribute('data-full-width-responsive', 'true');
      el.appendChild(ins);
      el.hidden = false;
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    });
  }
  function loadAll() { loadGA(); loadAds(); }

  // Al revocar el permiso: borrar las cookies de Google (_ga / _ga_* de Analytics y __gads / __gpi / __eoi
  // de AdSense) del dominio y sus padres (se crean en el dominio más alto posible, p. ej. .squarenet.com.ec).
  function clearGACookies() {
    var host = location.hostname.split('.');
    var domains = [''];
    for (var i = 0; i < host.length; i++) domains.push(host.slice(i).join('.'));
    document.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (!/^(_ga|__gads|__gpi|__eoi)/.test(name)) return;
      domains.forEach(function (d) {
        document.cookie = name + '=; Max-Age=0; path=/' + (d ? '; domain=' + d : '');
      });
    });
  }

  var bar = null;
  function hideBar() {
    if (!bar) return;
    var el = bar; bar = null;
    el.classList.remove('is-in');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
  }
  function showBar() {
    if (bar) return;
    bar = document.createElement('div');
    bar.className = 'cookie-bar band-dark';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Preferencias de cookies');
    bar.innerHTML =
      '<p>' + (GA_ID && ADSENSE_CLIENT
        ? 'Usamos cookies de Google para saber qué páginas se visitan (Analytics) y para mostrar anuncios en el blog (AdSense). '
        : GA_ID ? 'Usamos cookies de analítica (Google Analytics) para saber qué páginas se visitan y mejorar el sitio. '
        : 'Usamos cookies de Google AdSense para mostrar anuncios en el blog. ') +
      'Solo se activan si las aceptas. <a href="' + policyUrl + '">Más información</a></p>' +
      '<div class="cookie-actions">' +
      '<button type="button" class="btn cookie-no">Rechazar</button>' +
      '<button type="button" class="btn btn-primary cookie-yes">Aceptar</button>' +
      '</div>';
    bar.querySelector('.cookie-yes').addEventListener('click', function () {
      setChoice('granted'); hideBar(); loadAll();
    });
    bar.querySelector('.cookie-no').addEventListener('click', function () {
      var wasOn = gaLoaded || adsLoaded;
      setChoice('denied'); clearGACookies(); hideBar();
      if (wasOn) location.reload(); // GA o los anuncios ya corrían en esta página: recargar para apagarlos
    });
    document.body.appendChild(bar);
    requestAnimationFrame(function () { requestAnimationFrame(function () { if (bar) bar.classList.add('is-in'); }); });
  }

  if (!GA_ID && !ADSENSE_CLIENT) return;

  // "Configurar cookies" en el pie de página: vuelve a abrir el banner.
  var foot = document.querySelector('.footer-bottom');
  if (foot) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'footer-link cookie-settings';
    b.textContent = 'Configurar cookies';
    b.addEventListener('click', showBar);
    var priv = foot.querySelector('a.footer-link');
    foot.insertBefore(b, priv ? priv.nextSibling : null); // justo al lado de "Privacidad y cookies"
  }

  var choice = getChoice();
  if (choice === 'granted') loadAll();
  else if (choice === 'denied') clearGACookies(); // GA puede reescribir su cookie justo al cerrar la página
  else showBar();
})();
