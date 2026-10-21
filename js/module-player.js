// Reproductor de los módulos (.mod-video): carga el clip al acercarse, corre solo mientras se ve,
// botón pausa/play y barra de progreso. Clic en la pantalla = pantalla completa.
// Con prefers-reduced-motion o Save-Data no se reproduce solo: queda el póster hasta que el usuario pulse play.
(function () {
  var players = document.querySelectorAll('.mod-video');
  if (!players.length) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var hasIO = 'IntersectionObserver' in window;

  Array.prototype.forEach.call(players, function (box) {
    var video = box.querySelector('video');
    var toggle = box.querySelector('.mod-toggle');
    var bar = box.querySelector('.mod-progress b');
    var screen = box.querySelector('.mod-screen');
    if (!video || !toggle) return;
    var loaded = false, inView = !hasIO, userPaused = reduce || saveData;

    function setPaused(p) {
      box.classList.toggle('is-paused', p);
      toggle.setAttribute('aria-label', p ? 'Reproducir el video' : 'Pausar el video');
    }
    function load() {
      if (loaded) return;
      loaded = true;
      video.src = video.getAttribute('data-src');
      video.preload = 'auto';
      video.load();
    }
    function sync() {
      if (!loaded) return;
      if (inView && !userPaused && !document.hidden) {
        var p = video.play();
        if (p && p.catch) p.catch(function () { userPaused = true; setPaused(true); });
      } else {
        video.pause();
      }
    }

    video.addEventListener('playing', function () { box.classList.add('is-playing'); });
    video.addEventListener('timeupdate', function () {
      if (bar && video.duration) bar.style.width = (video.currentTime / video.duration * 100).toFixed(2) + '%';
    });
    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      userPaused = !userPaused;
      setPaused(userPaused);
      if (!userPaused) load();
      sync();
    });
    if (screen) screen.addEventListener('click', function () {
      load();
      var fs = video.requestFullscreen || video.webkitRequestFullscreen || video.webkitEnterFullscreen;
      if (fs) { userPaused = false; setPaused(false); sync(); fs.call(video); }
    });
    document.addEventListener('visibilitychange', sync);
    setPaused(userPaused);

    if (!hasIO) { if (!userPaused) load(); sync(); return; }
    new IntersectionObserver(function (en) {
      if (en[0].isIntersecting && !userPaused) load();
    }, { rootMargin: '600px 0px' }).observe(box);
    new IntersectionObserver(function (en) {
      inView = en[0].isIntersecting;
      sync();
    }, { threshold: 0.3 }).observe(box);
  });
})();
