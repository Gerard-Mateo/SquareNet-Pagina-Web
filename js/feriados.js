// Feriados de Ecuador (blog/feriados-ecuador.html): próximo feriado, calendario 2027, filtros por alcance,
// fines de semana largos, descarga .ics, imprimir y compartir.
// FUENTES: feriados nacionales = calendario oficial 2026–2030 del Viceministerio de Turismo (publicado el 1 de septiembre de 2025);
// traslados = regla del art. 65 del Código del Trabajo (R.O. Suplemento 906, 20-12-2016). Los locales marcados con pend:true
// se calcularon con esa regla y esperan confirmación oficial. Al publicarse el calendario de un año nuevo, agregarlo aquí.
(function () {
  var F = [
    // n: nombre · o: fecha original · d: días de descanso · s: alcance · t: detalle · pend: falta confirmación oficial
    { n: 'Día de los Difuntos', o: '2026-11-02', d: ['2026-11-02'], s: 'nacional', t: 'Cae lunes.' },
    { n: 'Independencia de Cuenca', o: '2026-11-03', d: ['2026-11-03'], s: 'nacional', t: 'Cae martes, junto a Difuntos.' },
    { n: 'Fundación de Quito', o: '2026-12-06', d: ['2026-12-07'], s: 'quito', t: 'Cae domingo: por la regla de traslado se descansaría el lunes 7.', pend: true },
    { n: 'Navidad', o: '2026-12-25', d: ['2026-12-25'], s: 'nacional', t: 'Cae viernes.' },
    { n: 'Año Nuevo', o: '2027-01-01', d: ['2027-01-01'], s: 'nacional', t: 'Cae viernes. No se traslada nunca.' },
    { n: 'Carnaval', o: '2027-02-08', d: ['2027-02-08', '2027-02-09'], s: 'nacional', t: 'Lunes y martes. No se trasladan.' },
    { n: 'Viernes Santo', o: '2027-03-26', d: ['2027-03-26'], s: 'nacional', t: 'Siempre cae viernes.' },
    { n: 'Día del Trabajo', o: '2027-05-01', d: ['2027-04-30'], s: 'nacional', t: 'Cae sábado: se descansa el viernes anterior.' },
    { n: 'Batalla de Pichincha', o: '2027-05-24', d: ['2027-05-24'], s: 'nacional', t: 'Cae lunes.' },
    { n: 'Fundación de Guayaquil', o: '2027-07-25', d: ['2027-07-26'], s: 'guayaquil', t: 'Cae domingo: por la regla de traslado se descansaría el lunes 26.', pend: true },
    { n: 'Primer Grito de Independencia', o: '2027-08-10', d: ['2027-08-09'], s: 'nacional', t: 'Cae martes: se descansa el lunes anterior.' },
    { n: 'Independencia de Guayaquil', o: '2027-10-09', d: ['2027-10-08'], s: 'nacional', t: 'Cae sábado: se descansa el viernes anterior.' },
    { n: 'Día de los Difuntos', o: '2027-11-02', d: ['2027-11-01'], s: 'nacional', t: 'Cae martes: se descansa el lunes 1.' },
    { n: 'Independencia de Cuenca', o: '2027-11-03', d: ['2027-11-02'], s: 'nacional', t: 'Cae miércoles: se descansa el martes 2, junto a Difuntos.' },
    { n: 'Fundación de Quito', o: '2027-12-06', d: ['2027-12-06'], s: 'quito', t: 'Cae lunes.', pend: true },
    { n: 'Navidad', o: '2027-12-25', d: ['2027-12-25'], s: 'nacional', t: 'Cae sábado y no se traslada nunca.' }
  ];
  var YEAR = 2027;
  var MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var root = document.querySelector('[data-fer-root]');
  if (!root) return;

  function D(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function key(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function largo(d) { return DIA[d.getDay()] + ' ' + d.getDate() + ' de ' + MES[d.getMonth()] + ' de ' + d.getFullYear(); }
  function corto(d) { return DIA[d.getDay()].slice(0, 3) + ' ' + d.getDate() + ' ' + MES[d.getMonth()].slice(0, 3); }
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var scope = 'nacional';
  try { scope = localStorage.getItem('sqn-fer-scope') || 'nacional'; } catch (e) { /* sin almacenamiento */ }

  function enAlcance(f) { return f.s === 'nacional' || f.s === scope; }
  function descansos(y) {   // mapa fecha → feriado, del alcance elegido
    var m = {};
    F.forEach(function (f) { if (!enAlcance(f)) return; f.d.forEach(function (x) { if (!y || D(x).getFullYear() === y) m[x] = f; }); });
    return m;
  }
  function esLibre(d, m) { return d.getDay() === 0 || d.getDay() === 6 || !!m[key(d)]; }
  // racha de días libres (fines de semana + feriados) que contiene a d
  function racha(d, m) {
    var a = new Date(d), b = new Date(d);
    while (esLibre(new Date(a.getFullYear(), a.getMonth(), a.getDate() - 1), m)) a.setDate(a.getDate() - 1);
    while (esLibre(new Date(b.getFullYear(), b.getMonth(), b.getDate() + 1), m)) b.setDate(b.getDate() + 1);
    return { desde: a, hasta: b, dias: Math.round((b - a) / 864e5) + 1 };
  }

  function proximo() {
    var m = descansos(), dias = Object.keys(m).sort(), box = root.querySelector('[data-fer="next"]');
    for (var i = 0; i < dias.length; i++) {
      var d = D(dias[i]);
      if (d >= today) {
        var f = m[dias[i]], falta = Math.round((d - today) / 864e5), r = racha(d, m);
        box.innerHTML = '<span class="fer-k">Próximo feriado' + (f.s !== 'nacional' ? ' local' : '') + '</span>' +
          '<b class="fer-n">' + f.n + '</b><span class="fer-d">' + largo(d) + (f.pend ? ' · por confirmar' : '') + '</span>' +
          '<strong class="fer-c">' + (falta === 0 ? '¡Es hoy!' : (falta === 1 ? 'Es mañana' : 'Faltan ' + falta + ' días')) + '</strong>' +
          (r.dias >= 3 ? '<span class="fer-l">Fin de semana largo: ' + r.dias + ' días, del ' + corto(r.desde) + ' al ' + corto(r.hasta) + '</span>' : '');
        return;
      }
    }
    box.innerHTML = '<span class="fer-k">Próximo feriado</span><b class="fer-n">Pendiente de publicación oficial</b>';
  }

  function calendario() {
    var m = descansos(YEAR), orig = {}, largos = {}, html = '';
    // todos los días (feriados y fin de semana) de cada racha de 3 o más días libres
    Object.keys(m).forEach(function (k) {
      var r = racha(D(k), m);
      if (r.dias < 3) return;
      for (var x = new Date(r.desde); x <= r.hasta; x.setDate(x.getDate() + 1)) largos[key(x)] = true;
    });
    F.forEach(function (f) { if (enAlcance(f) && D(f.o).getFullYear() === YEAR && f.d.indexOf(f.o) < 0) orig[f.o] = f; });
    for (var mo = 0; mo < 12; mo++) {
      var first = new Date(YEAR, mo, 1), off = (first.getDay() + 6) % 7, n = new Date(YEAR, mo + 1, 0).getDate(), cells = '';
      for (var e = 0; e < off; e++) cells += '<span class="is-empty"></span>';
      for (var day = 1; day <= n; day++) {
        var d = new Date(YEAR, mo, day), k = key(d), f = m[k], o = orig[k], cls = [];
        if (d.getDay() === 0 || d.getDay() === 6) cls.push('is-we');
        if (largos[k]) cls.push('is-long');
        if (f) { cls.push('is-fer'); if (f.s !== 'nacional') cls.push('is-local'); if (f.pend) cls.push('is-pend'); }
        if (o) cls.push('is-orig');
        if (+d === +today) cls.push('is-today');
        var tip = f ? f.n + (f.pend ? ' (por confirmar)' : '') : (o ? o.n + ': se descansa otro día' : '');
        cells += '<span class="' + cls.join(' ') + '"' + (tip ? ' title="' + tip + '"' : '') + '>' + day + (tip ? '<i class="calc-sr">, ' + tip + '</i>' : '') + '</span>';
      }
      html += '<div class="fer-m"><p class="fer-mt">' + MES[mo] + '</p><div class="fer-wd" aria-hidden="true"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div><div class="fer-days">' + cells + '</div></div>';
    }
    root.querySelector('[data-fer="cal"]').innerHTML = html;
  }

  function tabla() {
    var m = descansos(YEAR);
    Array.prototype.forEach.call(root.querySelectorAll('tr[data-s]'), function (tr) {
      var s = tr.getAttribute('data-s'), on = s === 'nacional' || s === scope;
      tr.hidden = !on;
      var cell = tr.querySelector('[data-long]');
      if (cell && on) {
        var r = racha(D(cell.getAttribute('data-long')), m);
        cell.innerHTML = r.dias >= 3 ? '<span class="fer-badge">' + r.dias + ' días seguidos</span>' : '';
      }
    });
  }

  function chips() {
    Array.prototype.forEach.call(root.querySelectorAll('[data-scope]'), function (b) {
      var on = b.getAttribute('data-scope') === scope;
      b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on));
    });
  }
  function render() { chips(); proximo(); calendario(); tabla(); }

  function ics() {
    var m = descansos(YEAR), lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SquareNet//Feriados Ecuador ' + YEAR + '//ES', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Feriados Ecuador ' + YEAR];
    var stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    Object.keys(m).sort().forEach(function (k) {
      var f = m[k], d = D(k), n = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      lines.push('BEGIN:VEVENT', 'UID:' + k + '-' + f.s + '@squarenet.com.ec', 'DTSTAMP:' + stamp,
        'DTSTART;VALUE=DATE:' + k.replace(/-/g, ''), 'DTEND;VALUE=DATE:' + key(n).replace(/-/g, ''),
        'SUMMARY:Feriado: ' + f.n + (f.s !== 'nacional' ? ' (' + f.s.charAt(0).toUpperCase() + f.s.slice(1) + ')' : '') + (f.pend ? ' - por confirmar' : ''),
        'DESCRIPTION:' + f.t.replace(/,/g, '\\,') + ' Fuente: squarenet.com.ec/blog/feriados-ecuador.html', 'TRANSP:TRANSPARENT', 'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' }));
    a.download = 'feriados-ecuador-' + YEAR + (scope !== 'nacional' ? '-' + scope : '') + '.ics';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }
  function aviso(b, txt) {
    var lab = b.querySelector('span'), old = b._lab || (b._lab = lab.textContent);
    lab.textContent = txt; clearTimeout(b._t); b._t = setTimeout(function () { lab.textContent = old; }, 1800);
  }

  root.addEventListener('click', function (e) {
    var c = e.target.closest('[data-scope]');
    if (c) {
      scope = c.getAttribute('data-scope');
      try { localStorage.setItem('sqn-fer-scope', scope); } catch (err) { /* sin almacenamiento */ }
      render(); return;
    }
    var b = e.target.closest('[data-fer-act]');
    if (!b) return;
    var act = b.getAttribute('data-fer-act'), url = (document.querySelector('link[rel="canonical"]') || {}).href || location.href;
    if (act === 'ics') { ics(); aviso(b, 'Descargando'); }
    else if (act === 'print') window.print();
    else if (navigator.share) navigator.share({ title: document.title, url: url }).catch(function () {});
    else if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(url).then(function () { aviso(b, 'Enlace copiado'); });
  });
  render();
  // para las pruebas de tests/
  window.SquareNetFeriados = { data: F, racha: function (s, sc) { var prev = scope; scope = sc || 'nacional'; var r = racha(D(s), descansos()); scope = prev; return r.dias; } };
})();
