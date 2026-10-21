// Calculadoras del blog: décimo tercero y cuarto, fondos de reserva, utilidades e impuesto a la renta.
// Cada calculadora es un <section data-calc="..."> con su formulario; el resultado se recalcula al escribir.
// VALORES LEGALES: todos están en P. Actualizarlos cada enero (SBU, tabla del SRI, canasta familiar básica).
(function () {
  var P = {
    year: 2026,
    sbu: 482,            // Salario Básico Unificado 2026 (Acuerdo Ministerial MDT-2025-195)
    iess: 0.0945,        // aporte personal al IESS, sector privado
    fondo: 0.0833,       // fondos de reserva: 8,33 % de la remuneración, desde el mes 13
    cfb: 821.80,         // canasta familiar básica (INEC, enero 2026): base del tope de gastos personales
    canastas: [7, 9, 11, 14, 17, 20],  // tope de gastos personales en canastas según cargas: 0, 1, 2, 3, 4, 5 o más
    rebaja: 0.18,        // rebaja del impuesto: 18 % de los gastos personales (hasta el tope)
    // Tabla del impuesto a la renta 2026 (SRI, Res. NAC-DGERCGC25-00000043): [desde, impuesto fracción básica, % excedente]
    tabla: [[0, 0, 0], [12208, 0, .05], [15549, 167, .10], [20188, 631, .12], [26700, 1412, .15],
            [35136, 2678, .20], [46575, 4965, .25], [62005, 8823, .30], [82679, 15025, .35], [109956, 24572, .37]]
  };

  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var MES3 = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var today = new Date(); today.setHours(0, 0, 0, 0);

  // ---------- formato ----------
  function money(n, dec) {
    dec = dec == null ? 2 : dec;
    var neg = n < 0, s = Math.abs(n).toFixed(dec).split('.');
    s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (neg ? '−' : '') + s.join(',');
  }
  function pct(r) { return (r * 100).toFixed(2).replace('.', ',').replace(/,00$/, '') + ' %'; }
  function fdate(d) { return d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear(); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function lines(rows) {
    return rows.map(function (r) {
      return '<div' + (r[2] ? ' class="' + r[2] + '"' : '') + '><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>';
    }).join('');
  }

  // ---------- fechas ----------
  function parseDate(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  function isLastDay(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() === d.getDate(); }
  // Días entre dos fechas (incluidas) en base 360: meses de 30 días, como se computan los décimos.
  function days360(a, b) {
    if (b < a) return 0;
    var d1 = Math.min(a.getDate(), 30), d2 = isLastDay(b) ? 30 : Math.min(b.getDate(), 30);
    return (b.getFullYear() - a.getFullYear()) * 360 + (b.getMonth() - a.getMonth()) * 30 + (d2 - d1) + 1;
  }

  // ---------- impuesto a la renta ----------
  function tramo(base) {
    var t = P.tabla, i = t.length - 1;
    while (i > 0 && base <= t[i][0]) i--;
    return i;
  }
  function irCausado(base) {
    var i = tramo(base), r = P.tabla[i];
    return Math.max(0, r[1] + (base - r[0]) * r[2]);
  }

  // ---------- animación del número grande ----------
  function setBig(el, value) {
    if (!el) return;
    var from = el._v == null ? value : el._v;
    el._v = value;
    el.classList.toggle('is-zero', value === 0);
    function paint(v) { el.innerHTML = '<small>$</small>' + money(v); }
    if (reduce || from === value) { paint(value); return; }
    var t0 = null, dur = 450;
    cancelAnimationFrame(el._raf);
    (function step(t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      paint(from + (value - from) * e);
      if (p < 1) el._raf = requestAnimationFrame(step);
    })(performance.now());
  }

  // ---------- lectura del formulario ----------
  function q(root, sel) { return root.querySelector(sel); }
  function num(root, name, min, max) {
    var el = q(root, '[name="' + name + '"]:not([type="range"])');
    var v = el ? parseFloat(String(el.value).replace(',', '.')) : 0;
    if (!isFinite(v)) v = 0;
    if (min != null) v = Math.max(min, v);
    if (max != null) v = Math.min(max, v);
    return v;
  }
  function radio(root, name) { var el = q(root, '[name="' + name + '"]:checked'); return el ? el.value : null; }
  function out(root, key, html) { var el = q(root, '[data-o="' + key + '"]'); if (el) el.innerHTML = html; return el; }
  function show(root, key, on) { var el = q(root, '[data-o="' + key + '"]'); if (el) el.hidden = !on; }

  function monthsStrip(start, days) {
    // 12 casillas desde el mes de inicio del período; se llenan los días trabajados (al final del período)
    var off = 360 - days, html = '';
    for (var i = 0; i < 12; i++) {
      var fill = Math.max(0, Math.min(30, (i + 1) * 30 - off)) / 30;
      html += '<span><b style="width:' + (fill * 100).toFixed(1) + '%"></b></span>';
    }
    var labels = '';
    for (var j = 0; j < 12; j++) labels += '<em>' + MES3[(start.getMonth() + j) % 12] + '</em>';
    return '<div class="cv-label"><span>Período de 12 meses</span><span>' + days + ' de 360 días</span></div>' +
      '<div class="cv-months">' + html + '</div><div class="cv-months">' + labels + '</div>';
  }

  // ---------- calculadoras ----------
  var CALCS = {
    decimos: function (root) {
      var mode = root.getAttribute('data-mode') || '13';
      var todo = radio(root, 'periodo') !== 'despues';
      var ingreso = parseDate((q(root, '[name="ingreso"]') || {}).value);
      var mensual = radio(root, 'modalidad') === 'mensual';
      var Y, start, end, pay, regionTxt = '';
      if (mode === '13') {
        Y = today > new Date(today.getFullYear(), 11, 24) ? today.getFullYear() + 1 : today.getFullYear();
        start = new Date(Y - 1, 11, 1); end = new Date(Y, 10, 30); pay = new Date(Y, 11, 24);
      } else {
        var costa = radio(root, 'region') === 'costa';
        var m = costa ? 2 : 7;  // marzo o agosto
        Y = today > new Date(today.getFullYear(), m, 15) ? today.getFullYear() + 1 : today.getFullYear();
        start = new Date(Y - 1, m, 1); end = new Date(Y, m, 0); pay = new Date(Y, m, 15);
        regionTxt = costa ? ' (Costa y Galápagos)' : ' (Sierra y Amazonía)';
      }
      var days = 360, warn = '';
      if (!todo && ingreso) {
        if (ingreso > end) { days = 0; warn = 'La fecha de ingreso es posterior al período: todavía no se genera este décimo.'; }
        else days = Math.min(360, days360(ingreso > start ? ingreso : start, end));
      }
      var periodo = 'del ' + fdate(start) + ' al ' + fdate(end);
      var total, perMonth, rows, fx, k;
      if (mode === '13') {
        var monthly = num(root, 'sueldo', 0) + num(root, 'variable', 0);
        var remun = monthly * days / 30;
        total = remun / 12; perMonth = monthly / 12;
        k = mensual ? 'Décimo tercero cada mes' : 'Décimo tercero a recibir';
        rows = [['Remuneración mensual (sueldo + variables)', '$ ' + money(monthly)],
                ['Días computados', days + ' de 360'],
                ['Remuneraciones del período', '$ ' + money(remun)],
                [mensual ? 'Cada mes (÷ 12)' : 'Décimo tercero (÷ 12)', '$ ' + money(mensual ? perMonth : total), 'is-total']];
        fx = mensual ? money(monthly) + ' ÷ 12 = ' + money(perMonth) : 'Σ ' + money(remun) + ' ÷ 12 = ' + money(total);
      } else {
        var parcial = !!(q(root, '[name="parcial"]') || {}).checked;
        var horas = parcial ? num(root, 'horas', 1, 40) : 40, f = horas / 40;
        total = P.sbu * days / 360 * f; perMonth = P.sbu / 12 * f;
        k = mensual ? 'Décimo cuarto cada mes' : 'Décimo cuarto a recibir';
        rows = [['Salario Básico Unificado ' + P.year, '$ ' + money(P.sbu)],
                ['Días computados', days + ' de 360'],
                ['Jornada', parcial ? 'Parcial: ' + money(horas, 0) + ' de 40 h' : 'Completa'],
                [mensual ? 'Cada mes (÷ 12)' : 'Décimo cuarto', '$ ' + money(mensual ? perMonth : total), 'is-total']];
        fx = mensual ? money(P.sbu) + ' ÷ 12' + (parcial ? ' × ' + money(horas, 0) + '/40' : '') + ' = ' + money(perMonth)
                     : money(P.sbu) + ' × ' + days + ' ÷ 360' + (parcial ? ' × ' + money(horas, 0) + '/40' : '') + ' = ' + money(total);
      }
      out(root, 'k', k);
      setBig(q(root, '[data-o="big"]'), mensual ? perMonth : total);
      out(root, 'sub', mensual
        ? 'Se suma a tu rol de pagos cada mes, en lugar del pago único. En el año: <b>$ ' + money(perMonth * 12) + '</b>.'
        : 'A pagar hasta el <b>' + fdate(pay) + '</b>' + regionTxt + ', por el período ' + periodo + '.');
      out(root, 'viz', monthsStrip(start, days));
      out(root, 'lines', lines(rows));
      out(root, 'fx', fx);
      out(root, 'warn', warn); show(root, 'warn', !!warn);
      var tip = mode === '14' && pay.getFullYear() > P.year
        ? 'Calculado con el SBU ' + P.year + ' (USD ' + P.sbu + '). El pago de ' + pay.getFullYear() + ' usará el salario básico que fije el Ministerio del Trabajo para ese año.' : '';
      out(root, 'tip', tip); show(root, 'tip', !!tip);
      return mensual ? perMonth : total;
    },

    fondos: function (root) {
      var sueldo = num(root, 'sueldo', 0);
      var ingreso = parseDate((q(root, '[name="ingreso"]') || {}).value) || new Date(today.getFullYear() - 2, today.getMonth(), 1);
      var iess = radio(root, 'modalidad') === 'iess';
      var desde = new Date(ingreso.getFullYear() + 1, ingreso.getMonth(), ingreso.getDate());
      var tiene = today >= desde, futuro = ingreso > today;
      var mensual = sueldo * P.fondo;
      var meses = Math.max(0, (today.getFullYear() - ingreso.getFullYear()) * 12 + today.getMonth() - ingreso.getMonth() - (today.getDate() < ingreso.getDate() ? 1 : 0));
      var serv = futuro ? 'Aún no inicia' : (Math.floor(meses / 12) ? Math.floor(meses / 12) + (Math.floor(meses / 12) === 1 ? ' año' : ' años') + (meses % 12 ? ' y ' : '') : '') + (meses % 12 || !Math.floor(meses / 12) ? (meses % 12) + (meses % 12 === 1 ? ' mes' : ' meses') : '');
      out(root, 'k', tiene ? (iess ? 'Depositado cada mes en el IESS' : 'Fondo de reserva cada mes') : 'Fondo de reserva desde el mes 13');
      setBig(q(root, '[data-o="big"]'), mensual);
      out(root, 'sub', tiene
        ? (iess ? 'Tu empleador lo deposita en tu cuenta del IESS junto con los aportes, sin que lo veas en el rol.' : 'Se paga en tu rol de pagos, junto con el sueldo.')
        : 'Todavía no lo generas: empiezas el <b>' + fdate(desde) + '</b>, al cumplir tu primer año de trabajo.');
      // línea de tiempo: primer año (sin fondos) y desde el mes 13
      var endT = new Date(Math.max(today.getTime(), desde.getTime()) + 1000 * 60 * 60 * 24 * 120);
      var span = endT - ingreso, x1 = (desde - ingreso) / span * 100, xn = Math.max(0, Math.min(100, (today - ingreso) / span * 100));
      out(root, 'viz', '<div class="cv-label"><span>Ingreso: ' + fdate(ingreso) + '</span><span>' + (tiene ? 'Ya tienes derecho' : 'Aún sin derecho') + '</span></div>' +
        '<div class="cv-time"><span class="t1" style="width:' + x1.toFixed(1) + '%"></span><span class="t2" style="left:' + x1.toFixed(1) + '%"></span><span class="now" style="left:' + xn.toFixed(1) + '%"></span></div>' +
        '<div class="cv-legend"><span>Año 1 · sin fondos</span><span>Desde el mes 13 · 8,33 %</span></div>');
      out(root, 'lines', lines([
        ['Remuneración mensual aportable', '$ ' + money(sueldo)],
        ['Porcentaje', pct(P.fondo)],
        ['En un año (12 meses)', '$ ' + money(mensual * 12)],
        ['Tiempo de servicio', serv],
        ['Derecho desde', fdate(desde), 'is-total']]));
      out(root, 'fx', money(sueldo) + ' × ' + pct(P.fondo) + ' = ' + money(mensual));
      return mensual;
    },

    utilidades: function (root) {
      var U = num(root, 'utilidad', 0);
      var p10 = U * 0.10, p5 = U * 0.05;
      var people = Array.prototype.map.call(root.querySelectorAll('.ct-row'), function (row, i) {
        var n = row.querySelector('[data-f="nombre"]').value.trim() || ('Trabajador ' + (i + 1));
        var d = Math.max(0, Math.min(360, parseFloat(row.querySelector('[data-f="dias"]').value) || 0));
        var c = Math.max(0, Math.min(30, Math.floor(parseFloat(row.querySelector('[data-f="cargas"]').value) || 0)));
        return { n: n, d: d, c: c };
      });
      var sd = 0, sdc = 0;
      people.forEach(function (p) { sd += p.d; sdc += p.d * p.c; });
      var max = 0;
      people.forEach(function (p) {
        p.a = sd ? p10 * p.d / sd : 0;
        p.b = sdc ? p5 * p.d * p.c / sdc : 0;
        p.t = p.a + p.b; max = Math.max(max, p.t);
      });
      out(root, 'k', 'Total a repartir (15 %)');
      setBig(q(root, '[data-o="big"]'), U * 0.15);
      out(root, 'sub', '<b>$ ' + money(p10) + '</b> por días trabajados (10 %) y <b>$ ' + money(p5) + '</b> por cargas familiares (5 %).');
      out(root, 'viz', '<div class="cv-key"><span>Parte del 10 %</span><span>Parte del 5 %</span></div><div class="cv-people">' +
        people.map(function (p) {
          var w = max ? 100 / max : 0;
          return '<div class="cv-person"><div class="cv-label"><b>' + esc(p.n) + '</b><span>$ ' + money(p.t) + '</span></div>' +
            '<div class="cv-stack"><i class="p10" style="width:' + (p.a * w).toFixed(2) + '%"></i><i class="p5" style="width:' + (p.b * w).toFixed(2) + '%"></i></div></div>';
        }).join('') + '</div>');
      out(root, 'lines', lines([
        ['Utilidad del ejercicio', '$ ' + money(U)],
        ['Suma de días trabajados', money(sd, 0)],
        ['Suma de días × cargas', money(sdc, 0)]]));
      var f = people[0];
      out(root, 'fx', f ? esc(f.n) + ': ' + money(p10) + ' × ' + money(f.d, 0) + ' ÷ ' + money(sd, 0) +
        (sdc ? ' + ' + money(p5) + ' × ' + money(f.d * f.c, 0) + ' ÷ ' + money(sdc, 0) : '') + ' = ' + money(f.t) : '');
      var warn = !sd ? 'Ingresa los días trabajados de cada persona.'
        : (!sdc && p5 > 0 ? 'Nadie en la lista tiene cargas familiares, así que el 5 % no tiene a quién repartirse por cargas. Consulta con el Ministerio del Trabajo cómo distribuirlo.' : '');
      out(root, 'warn', warn); show(root, 'warn', !!warn);
      return U * 0.15;
    },

    renta: function (root) {
      var sueldo = num(root, 'sueldo', 0), otros = num(root, 'otros', 0), gastos = num(root, 'gastos', 0);
      var cargas = Math.min(5, parseInt(radio(root, 'cargas') || '0', 10));
      var ingresos = sueldo * 12 + otros, aporte = ingresos * P.iess, base = Math.max(0, ingresos - aporte);
      var i = tramo(base), r = P.tabla[i], causado = irCausado(base);
      var tope = P.canastas[cargas] * P.cfb, rebaja = Math.min(Math.min(gastos, tope) * P.rebaja, causado);
      var pagar = Math.max(0, causado - rebaja);
      out(root, 'k', 'Impuesto a la renta ' + P.year);
      setBig(q(root, '[data-o="big"]'), pagar);
      out(root, 'sub', pagar > 0
        ? '≈ <b>$ ' + money(pagar / 12) + '</b> retenidos cada mes · tasa efectiva <b>' + pct(ingresos ? pagar / ingresos : 0) + '</b> de tus ingresos.'
        : (i === 0 ? 'Tu base imponible no supera la fracción exenta de USD ' + money(P.tabla[1][0], 0) + ': <b>no pagas impuesto a la renta</b>.'
                   : 'La rebaja por gastos personales cubre todo el impuesto causado: <b>no pagas impuesto a la renta</b>.'));
      var bars = '', labels = '';
      P.tabla.forEach(function (t, j) {
        var h = 14 + t[2] / 0.37 * 86;
        bars += '<span class="' + (j === i ? 'is-on' : (j < i ? 'is-past' : '')) + '" style="height:' + h.toFixed(0) + '%"></span>';
        labels += '<span class="' + (j === i ? 'is-on' : '') + '">' + Math.round(t[2] * 100) + '%</span>';
      });
      out(root, 'viz', '<div class="cv-label"><span>Tabla del SRI ' + P.year + '</span><span>' +
        (i === 0 ? 'Fracción exenta' : 'Tu tramo: ' + pct(r[2]) + ' sobre lo que pasa de ' + money(r[0], 0)) + '</span></div>' +
        '<div class="cv-brackets">' + bars + '</div><div class="cv-blabels">' + labels + '</div>');
      out(root, 'lines', lines([
        ['Ingresos gravados del año', '$ ' + money(ingresos)],
        ['− Aporte personal IESS (' + pct(P.iess) + ')', '$ ' + money(aporte)],
        ['= Base imponible', '$ ' + money(base)],
        ['Impuesto causado', '$ ' + money(causado)],
        ['− Rebaja por gastos personales (18 % de ' + money(Math.min(gastos, tope)) + ')', '$ ' + money(rebaja)],
        ['= Impuesto a pagar', '$ ' + money(pagar), 'is-total']]));
      out(root, 'fx', i === 0 ? money(base) + ' ≤ ' + money(P.tabla[1][0]) + ' → 0,00'
        : money(r[1]) + ' + ' + pct(r[2]) + ' × (' + money(base) + ' − ' + money(r[0]) + ') = ' + money(causado));
      out(root, 'tip', 'Tope de gastos personales con ' + cargas + (cargas === 5 ? ' o más' : '') + (cargas === 1 ? ' carga' : ' cargas') + ': ' +
        P.canastas[cargas] + ' canastas básicas = USD ' + money(tope) + '.');
      show(root, 'tip', true);
      return pagar;
    }
  };

  // ---------- enlaces entre controles ----------
  function paintRange(r) {
    var min = parseFloat(r.min) || 0, max = parseFloat(r.max) || 100, v = parseFloat(r.value) || 0;
    r.style.setProperty('--p', ((v - min) / (max - min) * 100).toFixed(1) + '%');
  }
  function bindRanges(root) {
    Array.prototype.forEach.call(root.querySelectorAll('.cf-range'), function (r) {
      var box = q(root, '[name="' + r.getAttribute('data-for') + '"]:not([type="range"])');
      if (!box) return;
      r.addEventListener('input', function () { box.value = r.value; paintRange(r); });
      box.addEventListener('input', function () { var v = parseFloat(box.value) || 0; r.value = Math.min(parseFloat(r.max), Math.max(parseFloat(r.min), v)); paintRange(r); });
      r.value = box.value; paintRange(r);
    });
  }
  function syncIf(root) {
    // [data-if="nombre=valor"]: visible solo si ese radio/checkbox está activo.
    // [data-mode-only="13|14"]: visible solo en esa pestaña. Si tiene ambos, deben cumplirse los dos.
    var mode = root.getAttribute('data-mode');
    Array.prototype.forEach.call(root.querySelectorAll('[data-if], [data-mode-only]'), function (el) {
      var ok = true, cond = el.getAttribute('data-if'), only = el.getAttribute('data-mode-only');
      if (cond) {
        var p = cond.split('='), ctl = q(root, '[name="' + p[0] + '"]' + (p[1] ? '[value="' + p[1] + '"]' : ''));
        ok = !!(ctl && ctl.checked);
      }
      if (only && mode) ok = ok && only === mode;
      el.hidden = !ok;
    });
  }

  function init(root) {
    var fn = CALCS[root.getAttribute('data-calc')];
    if (!fn) return;
    var live = q(root, '[data-o="live"]'), timer;
    function run() {
      syncIf(root);
      var v = fn(root);
      if (live) { clearTimeout(timer); timer = setTimeout(function () { live.textContent = 'Resultado: ' + money(v) + ' dólares.'; }, 700); }
    }
    bindRanges(root);
    root.addEventListener('input', run);
    root.addEventListener('change', run);
    root.addEventListener('submit', function (e) { e.preventDefault(); });

    // pestañas (décimos)
    var tabs = root.querySelectorAll('.calc-tab');
    function setMode(m) {
      root.setAttribute('data-mode', m);
      Array.prototype.forEach.call(tabs, function (t) { t.setAttribute('aria-selected', String(t.getAttribute('data-tab') === m)); t.tabIndex = t.getAttribute('data-tab') === m ? 0 : -1; });
      run();
    }
    Array.prototype.forEach.call(tabs, function (t) {
      t.addEventListener('click', function () { setMode(t.getAttribute('data-tab')); });
      t.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        var list = Array.prototype.slice.call(tabs), i = list.indexOf(t) + (e.key === 'ArrowRight' ? 1 : -1);
        var n = list[(i + list.length) % list.length]; n.focus(); n.click();
      });
    });
    var h = (location.hash || '').replace('#', '');
    if (tabs.length && /^calc-(13|14)$/.test(h)) {
      setMode(h.slice(5));
      setTimeout(function () { root.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); }, 60);
    }

    // filas de trabajadores (utilidades)
    var team = q(root, '.cf-team');
    if (team) {
      team.addEventListener('click', function (e) {
        var del = e.target.closest('.ct-del');
        if (del && team.querySelectorAll('.ct-row').length > 1) { del.closest('.ct-row').remove(); run(); }
        if (e.target.closest('.ct-add')) {
          var rows = team.querySelectorAll('.ct-row'), last = rows[rows.length - 1], c = last.cloneNode(true);
          c.querySelector('[data-f="nombre"]').value = '';
          c.querySelector('[data-f="dias"]').value = '360';
          c.querySelector('[data-f="cargas"]').value = '0';
          last.after(c); c.querySelector('[data-f="nombre"]').focus(); run();
        }
      });
    }
    run();
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-calc]'), init);
  window.SquareNetCalc = { P: P, irCausado: irCausado, days360: days360, money: money };
})();
