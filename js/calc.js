// Calculadoras del blog: décimos, fondos de reserva, utilidades, impuesto a la renta, liquidación y sueldo neto.
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
  // Años que calcula la de renta: el vigente y el nuevo, para comparar (pedido del cliente: no más años viejos).
  // Hoy solo 2026. Cuando el SRI publique la tabla 2027 (fines de diciembre), agregarla aquí con la canasta de enero 2027.
  P.renta = {
    2026: { cfb: P.cfb, tabla: P.tabla }
  };
  // Enfermedad catastrófica, rara o huérfana (del contribuyente o de una carga, certificada): el tope de gastos
  // personales sube a 100 canastas, sin importar el número de cargas. La rebaja sigue siendo el 18 %.
  P.catastrofica = 100;
  // Salario Básico Unificado por año (Ministerio del Trabajo). 2025: MDT-2024-301 · 2026: MDT-2025-195 (R.O. Supl. 187, 15-12-2025).
  // 2027: pendiente de publicación oficial; agregarlo aquí cuando salga (los décimos y la liquidación lo usan solos).
  P.sbuAnio = { 2025: 470, 2026: 482 };
  P.iessPatronal = 0.1215;   // aporte patronal, sector privado: 11,15 % IESS + 1 % IECE/SECAP (pasa a 12,15 % en total)

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
  function pct(r) { return (r * 100).toFixed(2).replace('.', ',').replace(/,00$/, '') + ' %'; }
  function fdate(d) { return d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear(); }
  function lines(rows) {
    return rows.map(function (r) {
      return '<div' + (r[2] ? ' class="' + r[2] + '"' : '') + '><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>';
    }).join('');
  }

  // ---------- fechas ----------
  // Acepta DD/MM/AAAA (lo que escribe el usuario) o AAAA-MM-DD (lo que devuelve el calendario nativo).
  function parseDate(v) {
    var m, y, mo, d;
    if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''))) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v || ''))) { d = +m[1]; mo = +m[2]; y = +m[3]; }
    else return null;
    var r = new Date(y, mo - 1, d);
    return y >= 1900 && y <= 2100 && r.getMonth() === mo - 1 && r.getDate() === d ? r : null;
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function dmy(d) { return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear(); }
  function iso(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function isLastDay(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() === d.getDate(); }
  // Días entre dos fechas (incluidas) en base 360: meses de 30 días, como se computan los décimos.
  function days360(a, b) {
    if (b < a) return 0;
    var d1 = Math.min(a.getDate(), 30), d2 = isLastDay(b) ? 30 : Math.min(b.getDate(), 30);
    return (b.getFullYear() - a.getFullYear()) * 360 + (b.getMonth() - a.getMonth()) * 30 + (d2 - d1) + 1;
  }

  // ---------- impuesto a la renta ----------
  function tramo(base, t) {
    t = t || P.tabla;
    var i = t.length - 1;
    while (i > 0 && base <= t[i][0]) i--;
    return i;
  }
  function irCausado(base, t) {
    t = t || P.tabla;
    var r = t[tramo(base, t)];
    return Math.max(0, r[1] + (base - r[0]) * r[2]);
  }

  // ---------- núcleos de cálculo (sin DOM: los usan las calculadoras y las pruebas de tests/calc.test.js) ----------
  function r2(x) { return Math.round((x + (x >= 0 ? 1e-9 : -1e-9)) * 100) / 100; }   // redondeo a centavos
  function sbuDe(y) { return P.sbuAnio[y] != null ? { v: P.sbuAnio[y], ok: true } : { v: P.sbu, ok: false }; }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function monthEnd(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }

  // Impuesto a la renta del año para un asalariado. o: { ingresos, aporte, gastos, cargas, especial, ipceg, year }
  function irAnual(o) {
    var Y = P.renta[o.year] || P.renta[P.year], T = Y.tabla;
    var base = Math.max(0, (o.ingresos || 0) - (o.aporte || 0));
    var causado = irCausado(base, T);
    var canastas = o.especial ? P.catastrofica : P.canastas[Math.min(5, Math.max(0, o.cargas || 0))];
    var tope = canastas * Y.cfb * (o.ipceg || 1);
    var potencial = Math.min(o.gastos || 0, tope) * P.rebaja;
    var rebaja = Math.min(potencial, causado);
    return { year: Y === P.renta[o.year] ? o.year : P.year, base: base, tramo: tramo(base, T), causado: r2(causado), canastas: canastas,
             cfb: Y.cfb, tope: r2(tope), potencial: r2(potencial), rebaja: r2(rebaja), impuesto: r2(causado - rebaja) };
  }

  // Décimo tercero (art. 111): la doceava parte de lo percibido del 1 de diciembre al 30 de noviembre; se paga hasta el 24 de diciembre
  // si se acumula, o mes a mes (la regla general desde 2015). o: { y (año del pago), sueldo, variable, ingreso?, meses?[12] }
  // meses[i] = lo que realmente cobró ese mes (opcional); si falta, se usa sueldo + variable por la parte trabajada del mes.
  function decimo13(o) {
    var start = new Date(o.y - 1, 11, 1), end = new Date(o.y, 10, 30), base = (o.sueldo || 0) + (o.variable || 0);
    var desde = o.ingreso && o.ingreso > start ? o.ingreso : start, months = [], suma = 0, dias = 0;
    for (var i = 0; i < 12; i++) {
      var ms = new Date(o.y - 1, 11 + i, 1), me = monthEnd(ms);
      var f = desde > me ? 0 : (desde > ms ? days360(desde, me) / 30 : 1);
      var dato = o.meses && o.meses[i] != null;
      var monto = dato ? o.meses[i] : base * f;
      months.push({ inicio: ms, fraccion: f, monto: r2(monto), dato: dato });
      suma += monto; dias += f * 30;
    }
    return { inicio: start, fin: end, pago: new Date(o.y, 11, 24), dias: Math.round(dias), meses: months,
             remuneraciones: r2(suma), total: r2(suma / 12), sinPeriodo: !!(o.ingreso && o.ingreso > end) };
  }

  // Décimo cuarto (art. 113): un SBU por período completo, proporcional a los días y a la jornada.
  // Sierra/Amazonía: 1 ago – 31 jul, pago hasta el 15 ago · Costa/Galápagos: 1 mar – fin de feb, pago hasta el 15 mar.
  // Acumulado: SBU vigente al pagar. Mensualizado: SBU/12 de cada mes. Si falta el SBU de un año, queda «pendiente».
  // o: { y (año del pago), region: 'sierra'|'costa', ingreso?, horas (semanales, 40 = completa) }
  function decimo14(o) {
    var mi = o.region === 'costa' ? 2 : 7;
    var start = new Date(o.y - 1, mi, 1), end = new Date(o.y, mi, 0), pago = new Date(o.y, mi, 15);
    var f = Math.min(1, Math.max(0, (o.horas || 40) / 40)), desde = o.ingreso && o.ingreso > start ? o.ingreso : start;
    var dias = o.ingreso && o.ingreso > end ? 0 : Math.min(360, days360(desde, end));
    var sp = sbuDe(o.y), mensual = 0, pendMes = false, months = [];
    for (var i = 0; i < 12; i++) {
      var ms = new Date(o.y - 1, mi + i, 1), me = monthEnd(ms), s = sbuDe(ms.getFullYear());
      var fr = desde > me ? 0 : (desde > ms ? days360(desde, me) / 30 : 1);
      var monto = s.v / 12 * fr * f;
      if (!s.ok && fr) pendMes = true;
      months.push({ inicio: ms, fraccion: fr, sbu: s.v, sbuOk: s.ok, monto: r2(monto) });
      mensual += monto;
    }
    return { inicio: start, fin: end, pago: pago, dias: dias, jornada: f, sbu: sp.v, sbuOk: sp.ok,
             acumulado: r2(sp.v * dias / 360 * f), mensualizado: r2(mensual), pendienteMes: pendMes, meses: months };
  }

  // Liquidación (Código del Trabajo). Cada causal tiene efectos distintos: nunca una fórmula universal.
  // o: { ingreso, salida, sueldo, variable, causal, diasPend, vacPend, d13: 'mensual'|'acum', d14: 'mensual'|'acum', region,
  //      horas, fondosPend (meses), otros, descuentos }
  var CAUSALES = {
    renuncia: { n: 'Renuncia voluntaria con desahucio', desahucio: true, indem: false },
    acuerdo: { n: 'Terminación por acuerdo entre las partes', desahucio: true, indem: false },
    despido: { n: 'Despido intempestivo', desahucio: true, indem: true },
    vb_trabajador: { n: 'Visto bueno pedido por el trabajador', desahucio: true, indem: true },
    vb_empleador: { n: 'Visto bueno pedido por el empleador', desahucio: false, indem: false },
    prueba: { n: 'Terminación en el período de prueba', desahucio: false, indem: false },
    obra: { n: 'Fin de la obra, contrato eventual o de temporada', desahucio: false, indem: false }
  };
  function liquidacion(o) {
    var c = CAUSALES[o.causal] || CAUSALES.renuncia, base = (o.sueldo || 0) + (o.variable || 0);
    if (!o.ingreso || !o.salida || o.salida < o.ingreso) return { error: 'Revisa las fechas: la salida debe ser posterior al ingreso.' };
    var dias = days360(o.ingreso, o.salida), completos = Math.floor(dias / 360), dia = base / 30, rubros = [];
    function add(k, label, monto, aplica, por) { rubros.push({ k: k, label: label, monto: r2(aplica ? monto : 0), aplica: aplica, por: por }); }
    // remuneración pendiente: días del último mes que aún no se pagaron
    var dp = Math.min(31, o.diasPend || 0);
    add('rem', 'Remuneración pendiente', dia * dp, dp > 0, dp ? dp + ' días × ' + money(dia) + ' (sueldo ÷ 30)' : 'No indicaste días del último mes por pagar.');
    // décimo tercero proporcional: desde el 1 de diciembre (o el ingreso) hasta la salida
    var s13 = o.salida.getMonth() === 11 ? new Date(o.salida.getFullYear(), 11, 1) : new Date(o.salida.getFullYear() - 1, 11, 1);
    var d13d = days360(o.ingreso > s13 ? o.ingreso : s13, o.salida);
    add('d13', 'Décimo tercero proporcional', base * d13d / 360, o.d13 === 'acum',
      o.d13 === 'acum' ? d13d + ' días desde el ' + fdate(o.ingreso > s13 ? o.ingreso : s13) + ' × remuneración ÷ 360' : 'Mensualizado: ya lo cobraste en cada rol.');
    // décimo cuarto proporcional (SBU del año de salida; jornada parcial en proporción)
    var mi = o.region === 'costa' ? 2 : 7, s14 = o.salida.getMonth() >= mi ? new Date(o.salida.getFullYear(), mi, 1) : new Date(o.salida.getFullYear() - 1, mi, 1);
    var d14d = days360(o.ingreso > s14 ? o.ingreso : s14, o.salida), sb = sbuDe(o.salida.getFullYear()), jf = Math.min(1, (o.horas || 40) / 40);
    add('d14', 'Décimo cuarto proporcional', sb.v * d14d / 360 * jf, o.d14 === 'acum',
      o.d14 === 'acum' ? d14d + ' días × SBU ' + o.salida.getFullYear() + ' (' + money(sb.v) + (sb.ok ? '' : ', pendiente de publicación oficial') + ') ÷ 360' + (jf < 1 ? ' × jornada ' + money(jf * 40, 0) + '/40' : '') : 'Mensualizado: ya lo cobraste en cada rol.');
    // vacaciones: lo pendiente de años anteriores + la parte del año de servicio en curso (15 días, +1 por año desde el sexto, tope 30)
    var aniv = new Date(o.ingreso.getFullYear() + completos, o.ingreso.getMonth(), o.ingreso.getDate());
    var enCurso = days360(aniv, o.salida), diasAnio = Math.min(30, 15 + Math.max(0, completos + 1 - 5));
    var vacProp = diasAnio * Math.min(360, enCurso) / 360, vacPend = Math.max(0, o.vacPend || 0);
    add('vac', 'Vacaciones no gozadas', dia * (vacProp + vacPend), vacProp + vacPend > 0,
      (vacPend ? vacPend + ' días pendientes + ' : '') + money(vacProp, 2) + ' días proporcionales del año en curso (' + diasAnio + ' días por año) × ' + money(dia) + ' por día');
    // fondos de reserva pendientes (solo después del primer año)
    var fp = Math.max(0, o.fondosPend || 0);
    add('fr', 'Fondos de reserva pendientes', base * P.fondo * fp, fp > 0 && dias > 360,
      dias <= 360 ? 'Todavía no cumplías un año: no se generan.' : (fp ? fp + ' meses × ' + pct(P.fondo) + ' de la remuneración' : 'Si los cobrabas cada mes o están en el IESS, no queda nada pendiente.'));
    // bonificación por desahucio (art. 185): 25 % de la última remuneración por año de servicio
    add('desahucio', 'Bonificación por desahucio', base * 0.25 * completos, c.desahucio && completos > 0,
      !c.desahucio ? 'No aplica en esta causal.' : (completos ? '25 % × ' + money(base) + ' × ' + completos + (completos === 1 ? ' año' : ' años') + ' completos (art. 185)' : 'Aplica, pero aún no cumples un año completo de servicio.'));
    // indemnización por despido intempestivo (art. 188): 3 meses hasta 3 años; desde ahí, un mes por año (la fracción cuenta como año), tope 25
    var mesesInd = dias <= 1080 ? 3 : Math.min(25, Math.ceil(dias / 360));
    add('indem', 'Indemnización por despido', base * mesesInd, c.indem,
      c.indem ? mesesInd + ' meses × ' + money(base) + (dias <= 1080 ? ' (hasta 3 años de servicio)' : ' (un mes por año; la fracción cuenta como año, tope 25)') + ' · art. 188' : 'Solo procede en despido intempestivo o visto bueno pedido por el trabajador.');
    var ot = Math.max(0, o.otros || 0);
    add('otros', 'Otros valores pendientes', ot, ot > 0, ot ? 'Valores que indicaste (horas extra, comisiones, bonos pendientes).' : 'Ninguno indicado.');
    var bruto = rubros.reduce(function (a, r) { return a + r.monto; }, 0);
    var iess = r2(rubros[0].monto * P.iess), desc = r2(Math.max(0, o.descuentos || 0));
    return { causal: c, dias: dias, anios: dias / 360, completos: completos, base: base, rubros: rubros,
             bruto: r2(bruto), iess: iess, descuentos: desc, total: r2(Math.max(0, bruto - iess - desc)), periodoPrueba: dias <= 90 };
  }

  // Sueldo neto en relación de dependencia (sector privado). o: { sueldo, descuentos, ir, gastos, cargas, decimos, fondos, year }
  function neto(o) {
    var s = o.sueldo || 0, aporte = r2(s * P.iess), irm = 0, ir = null;
    if (o.ir) { ir = irAnual({ ingresos: s * 12, aporte: s * 12 * P.iess, gastos: o.gastos, cargas: o.cargas, year: o.year }); irm = r2(ir.impuesto / 12); }
    var d13 = o.decimos ? r2(s / 12) : 0, d14 = o.decimos ? r2(P.sbu / 12) : 0, fr = o.fondos ? r2(s * P.fondo) : 0, desc = r2(o.descuentos || 0);
    var trasIess = r2(s - aporte);
    var patronal = r2(s * P.iessPatronal), vac = r2(s / 24);
    return { sueldo: s, aporte: aporte, trasIess: trasIess, irMes: irm, ir: ir, d13: d13, d14: d14, fondos: fr, descuentos: desc,
             neto: r2(trasIess - irm - desc + d13 + d14 + fr), patronal: patronal, vacaciones: vac,
             costo: r2(s + patronal + r2(s / 12) + r2(P.sbu / 12) + (o.fondos ? r2(s * P.fondo) : 0) + vac) };
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
  function opt(root, name) {
    var el = q(root, '[name="' + name + '"]:not([type="range"])');
    if (!el || String(el.value).trim() === '') return null;
    var v = parseFloat(String(el.value).replace(',', '.'));
    return isFinite(v) ? Math.max(0, v) : null;
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
    // Décimos: pestaña 13 (bono navideño) o 14 (bono escolar). Por ley se pagan mes a mes; acumulado solo si el trabajador lo pidió.
    decimos: function (root) {
      var mode = root.getAttribute('data-mode') || '13';
      var ingreso = parseDate((q(root, '[name="ingreso"]') || {}).value);
      var acum = radio(root, 'modalidad') === 'acumulado';
      var cicloSel = q(root, 'select[name="ciclo"]'), region = radio(root, 'region') || 'sierra';
      // ciclos: el que se paga después de hoy y el anterior
      var mi = mode === '13' ? 11 : (region === 'costa' ? 2 : 7), dd = mode === '13' ? 24 : 15;
      var yNext = today > new Date(today.getFullYear(), mi, dd) ? today.getFullYear() + 1 : today.getFullYear();
      if (cicloSel) {
        var key = mode + region;
        if (cicloSel._key !== key) {
          var cur = cicloSel._key ? cicloSel.selectedIndex : 0;
          cicloSel.innerHTML = [yNext, yNext - 1].map(function (y, k) {
            var ini = mode === '13' ? new Date(y - 1, 11, 1) : new Date(y - 1, mi, 1), fin = mode === '13' ? new Date(y, 10, 30) : new Date(y, mi, 0);
            return '<option value="' + y + '">' + MES3[ini.getMonth()] + ' ' + ini.getFullYear() + ' – ' + MES3[fin.getMonth()] + ' ' + fin.getFullYear() +
              (k ? ' (ya vencido)' : ' (se paga en ' + y + ')') + '</option>';
          }).join('');
          cicloSel.selectedIndex = Math.min(cur, 1); cicloSel._key = key;
        }
      }
      var y = cicloSel ? +cicloSel.value : yNext, R, big, k, sub, rows = [], fx, warn = '', tip = '', viz;
      if (mode === '13') {
        var vals = [], grid = root.querySelectorAll('[data-mes]');
        for (var i = 0; i < 12; i++) vals.push(grid[i] && String(grid[i].value).trim() !== '' ? Math.max(0, parseFloat(String(grid[i].value).replace(',', '.')) || 0) : null);
        R = decimo13({ y: y, sueldo: num(root, 'sueldo', 0), variable: num(root, 'variable', 0), ingreso: ingreso, meses: vals });
        // los campos mes a mes muestran su mes y lo que se asumiría si quedan vacíos
        Array.prototype.forEach.call(grid, function (inp, j) {
          var lab = inp.parentNode.parentNode.querySelector('label');
          var mm = R.meses[j].inicio;
          if (lab) lab.textContent = MES3[mm.getMonth()] + ' ' + mm.getFullYear();
          inp.placeholder = money((num(root, 'sueldo', 0) + num(root, 'variable', 0)) * R.meses[j].fraccion);
        });
        var esteMes = R.meses.filter(function (m) { return m.inicio.getFullYear() === today.getFullYear() && m.inicio.getMonth() === today.getMonth(); })[0];
        var mensual = esteMes ? r2(esteMes.monto / 12) : R.total;
        big = acum ? R.total : mensual;
        k = acum ? '¿Cuánto te toca de bono navideño?' : (esteMes ? 'Décimo tercero de este mes' : 'Décimo tercero mensualizado del período');
        sub = acum ? 'A pagar hasta el <b>' + fdate(R.pago) + '</b>, por lo ganado del ' + fdate(R.inicio) + ' al ' + fdate(R.fin) + '.'
                   : 'Se suma a tu rol cada mes (es la regla general). En todo el período: <b>$ ' + money(R.total) + '</b>.';
        rows = [['Remuneraciones del período<small>' + (vals.some(function (v) { return v != null; }) ? 'con los meses que ingresaste' : 'sueldo + variables por la parte trabajada de cada mes') + '</small>', '$ ' + money(R.remuneraciones)],
                ['Días computados', R.dias + ' de 360'],
                ['Décimo tercero (÷ 12)', '$ ' + money(R.total), acum ? 'is-total' : 'is-sum']];
        if (!acum && esteMes) rows.push(['Este mes (lo de este mes ÷ 12)', '$ ' + money(mensual), 'is-total']);
        fx = 'Σ ' + money(R.remuneraciones) + ' ÷ 12 = ' + money(R.total);
        viz = '<div class="cv-label"><span>Mes a mes</span><span>' + R.dias + ' de 360 días</span></div><div class="cv-mlist">' + R.meses.map(function (m) {
          return '<span class="' + (m.monto ? '' : 'is-off') + '"><em>' + MES3[m.inicio.getMonth()] + '</em><b>' + money(m.monto, 0) + '</b><i>' + money(m.monto / 12) + '</i></span>';
        }).join('') + '</div>';
        if (R.sinPeriodo) warn = 'Tu fecha de ingreso es posterior a este período: todavía no se genera este décimo.';
      } else {
        var parcial = !!(q(root, '[name="parcial"]') || {}).checked;
        R = decimo14({ y: y, region: region, ingreso: ingreso, horas: parcial ? num(root, 'horas', 1, 40) : 40 });
        var mes14 = R.meses.filter(function (m) { return m.inicio.getFullYear() === today.getFullYear() && m.inicio.getMonth() === today.getMonth(); })[0];
        big = acum ? R.acumulado : (mes14 ? mes14.monto : R.mensualizado);
        k = acum ? '¿Cuánto voy a cobrar de décimo cuarto?' : (mes14 ? 'Décimo cuarto de este mes' : 'Décimo cuarto mensualizado del período');
        sub = acum ? 'A pagar hasta el <b>' + fdate(R.pago) + '</b> (' + (region === 'costa' ? 'Costa y Galápagos' : 'Sierra y Amazonía') + '), por el período del ' + fdate(R.inicio) + ' al ' + fdate(R.fin) + '.'
                   : 'Se suma a tu rol cada mes: un salario básico ÷ 12. En todo el período: <b>$ ' + money(R.mensualizado) + '</b>.';
        rows = [['Salario básico para el pago de ' + y, R.sbuOk ? '$ ' + money(R.sbu) : 'Pendiente'],
                ['Días computados', R.dias + ' de 360'],
                ['Jornada', R.jornada < 1 ? 'Parcial: ' + money(R.jornada * 40, 0) + ' de 40 h' : 'Completa'],
                [acum ? 'Décimo cuarto acumulado' : 'En todo el período, mes a mes', '$ ' + money(acum ? R.acumulado : R.mensualizado), 'is-total']];
        fx = acum ? money(R.sbu) + ' × ' + R.dias + ' ÷ 360' + (R.jornada < 1 ? ' × ' + money(R.jornada * 40, 0) + '/40' : '') + ' = ' + money(R.acumulado)
                  : 'Σ SBU de cada mes ÷ 12' + (R.jornada < 1 ? ' × ' + money(R.jornada * 40, 0) + '/40' : '') + ' = ' + money(R.mensualizado);
        viz = monthsStrip(R.inicio, R.dias);
        if ((acum && !R.sbuOk) || (!acum && R.pendienteMes)) {
          warn = 'El salario básico de ' + (acum ? y : 'los meses de ' + (R.inicio.getFullYear() + 1)) + ' está pendiente de publicación oficial. Este valor es provisional: usa el SBU ' + P.year + ' (USD ' + money(P.sbu) + ') y cambiará cuando el Ministerio del Trabajo fije el nuevo.';
        }
        if (ingreso && ingreso > R.fin) warn = 'Tu fecha de ingreso es posterior a este período: todavía no se genera este décimo.';
      }
      out(root, 'k', k);
      setBig(q(root, '[data-o="big"]'), big);
      out(root, 'sub', sub);
      out(root, 'viz', viz);
      out(root, 'lines', lines(rows));
      out(root, 'fx', fx);
      out(root, 'warn', warn); show(root, 'warn', !!warn);
      out(root, 'tip', tip); show(root, 'tip', !!tip);
      return big;
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

    // Para una persona: la empresa (utilidad, trabajadores, cargas de todos) y tú (días, cargas, descuentos).
    // Supuesto: tus compañeros trabajaron el año completo; tú cuentas con tus días reales.
    utilidades: function (root) {
      var U = num(root, 'utilidad', 0), N = Math.max(1, Math.round(num(root, 'trab', 1)));
      var d = num(root, 'dias', 0, 360), c = Math.round(num(root, 'cargas', 0, 20));
      var TC = Math.round(num(root, 'tcargas', 0)), cc = Math.max(TC, c);
      var p10 = U * 0.10, p5 = U * 0.05;
      var sd = (N - 1) * 360 + d, sdc = (cc - c) * 360 + d * c;
      var a = sd ? p10 * d / sd : 0, b = sdc ? p5 * d * c / sdc : 0, bruto = a + b;
      // Descuentos, en orden y sin pasar de lo que te toca. Utilidades no aportan al IESS, pero el SRI
      // las suma a los ingresos gravados: el impuesto estimado es lo que suben sobre tu sueldo del año.
      var conIR = !!(q(root, '[name="ir"]') || {}).checked;
      var baseS = num(root, 'sueldo', 0) * 12 * (1 - P.iess);
      var irW = conIR ? Math.max(0, irCausado(baseS + bruto) - irCausado(baseS)) : 0;
      var judW = num(root, 'judicial', 0), otrW = num(root, 'otros', 0);
      var ir = Math.min(irW, bruto), jud = Math.min(judW, bruto - ir), otr = Math.min(otrW, bruto - ir - jud);
      var neto = bruto - ir - jud - otr;

      out(root, 'k', 'Te llega en utilidades');
      setBig(q(root, '[data-o="big"]'), neto);
      out(root, 'sub', 'Se pagan hasta el <b>15 de abril de ' + (P.year + 1) + '</b>. Tu empresa reparte <b>$ ' + money(U * 0.15) +
        '</b> entre ' + money(N, 0) + (N === 1 ? ' persona.' : ' personas.'));
      function flow(title, total, segs) {
        var bar = '', keys = '';
        segs.forEach(function (s) {
          if (s[2] <= 0) return;
          bar += '<i class="' + s[0] + '" style="width:' + (total ? s[2] / total * 100 : 0).toFixed(2) + '%"></i>';
          keys += '<span class="' + s[0] + '">' + s[1] + ' <b>$ ' + money(s[2]) + '</b></span>';
        });
        return '<div class="cv-flow"><div class="cv-label"><span>' + title + '</span><span>$ ' + money(total) + '</span></div>' +
          '<div class="cv-seg">' + bar + '</div><div class="cv-keys">' + keys + '</div></div>';
      }
      out(root, 'viz', flow('De dónde sale', bruto, [['k-a', 'Por días', a], ['k-b', 'Por cargas', b]]) +
        (ir + jud + otr > 0 ? flow('A dónde va', bruto, [['k-net', 'Te llega', neto], ['k-ir', 'Impuesto', ir], ['k-jud', 'Retención judicial', jud], ['k-otr', 'Anticipos', otr]]) : ''));
      var rows = [
        ['Tu parte del 10 % (por días)', '$ ' + money(a)],
        ['Tu parte del 5 % (por cargas)', '$ ' + money(b)],
        ['= Utilidades brutas', '$ ' + money(bruto)]];
      if (conIR) rows.push(['− Impuesto a la renta (estimado)', '$ ' + money(ir)]);
      if (jud) rows.push(['− Retención judicial', '$ ' + money(jud)]);
      if (otr) rows.push(['− Anticipos y otros descuentos', '$ ' + money(otr)]);
      rows.push(['= Te llega', '$ ' + money(neto), 'is-total']);
      out(root, 'lines', lines(rows));
      out(root, 'fx', money(p10) + ' × ' + money(d, 0) + ' ÷ ' + money(sd, 0) +
        (c && sdc ? ' + ' + money(p5) + ' × ' + money(d * c, 0) + ' ÷ ' + money(sdc, 0) : '') + ' = ' + money(bruto));
      out(root, 'tip', 'Las utilidades no pagan aporte al IESS, pero el SRI las suma a tus ingresos del año: si con ellas pasas la fracción exenta (USD ' +
        money(P.tabla[1][0], 0) + '), generan impuesto a la renta. Los décimos no se tocan: son pagos aparte.');
      show(root, 'tip', true);
      var warn = !d ? 'Ingresa los días que trabajaste en el año.'
        : TC < c ? 'El total de cargas de la empresa no puede ser menor que las tuyas: se usó ' + c + '.'
        : (!sdc && p5 > 0 ? 'Nadie tiene cargas familiares, así que el 5 % no tiene a quién repartirse por cargas. Consulta con el Ministerio del Trabajo cómo distribuirlo.'
        : (irW + judW + otrW > bruto + 0.005 ? 'Los descuentos superan lo que te toca: no te llega nada este año.' : ''));
      out(root, 'warn', warn); show(root, 'warn', !!warn);
      return neto;
    },

    // Igual que el depurador de SquareNet: lo cobrado en los meses anteriores + este mes + el pronóstico de los que faltan,
    // aporte IESS por cada tramo, impuesto del año, rebaja, lo ya retenido y lo que falta ÷ los meses que quedan.
    // Todo lo de «Afinar el cálculo» es opcional: vacío = se calcula con el sueldo actual.
    renta: function (root) {
      var yr = +root.getAttribute('data-year') || P.year, Y = P.renta[yr] || P.renta[P.year], T = Y.tabla;
      var S = num(root, 'sueldo', 0), E = num(root, 'extras', 0), gastos = num(root, 'gastos', 0);
      // sin campo de mes: se usa el mes actual (o diciembre si la tabla no es del año en curso)
      var m = yr === today.getFullYear() ? today.getMonth() + 1 : 12, ant = m - 1, pron = 12 - m, quedan = pron + 1;
      var cob = ant ? opt(root, 'cobrado') : null, ret = ant ? opt(root, 'retenido') : null;
      var noap = num(root, 'noaport', 0), util = num(root, 'utilidades', 0);
      var cargas = Math.min(5, parseInt(radio(root, 'cargas') || '0', 10));
      var cat = !!(q(root, '[name="cat"]') || {}).checked, canastas = cat ? P.catastrofica : P.canastas[cargas];
      var mesN = MESES[m - 1], antN = ant ? (ant === 1 ? 'enero' : 'enero a ' + MESES[m - 2]) : '';
      var antAport = cob == null ? (S + E) * ant : cob, mesAport = S + E;
      var ingresos = antAport + mesAport * quedan + noap + util;
      var apAnt = antAport * P.iess, apMes = mesAport * P.iess, aporte = apAnt + apMes * quedan;
      // Exoneraciones: 65 años o más = 1 fracción básica; discapacidad = 2 fracciones básicas × el porcentaje del grado.
      var adulto = !!(q(root, '[name="adulto"]') || {}).checked, discP = parseFloat((q(root, '[name="disc"]') || {}).value) || 0;
      var exAdulto = adulto ? T[1][0] : 0, exDisc = 2 * T[1][0] * discP;
      var base = Math.max(0, ingresos - aporte - exAdulto - exDisc);
      var i = tramo(base, T), r = T[i], causado = irCausado(base, T);
      var tope = canastas * Y.cfb, rebaja = Math.min(Math.min(gastos, tope) * P.rebaja, causado);
      var anual = Math.max(0, causado - rebaja);
      var retV = ret == null ? anual * ant / 12 : ret, falta = anual - retV, mesRet = Math.max(0, falta / quedan);

      out(root, 'k', 'Te descuentan en ' + mesN);
      setBig(q(root, '[data-o="big"]'), mesRet);
      out(root, 'sub', anual > 0
        ? 'Impuesto del año: <b>$ ' + money(anual) + '</b> · tasa efectiva <b>' + pct(ingresos ? anual / ingresos : 0) + '</b> de tus ingresos (tabla ' + yr + ').'
        : (i === 0 ? 'Tu base imponible no supera la fracción exenta de USD ' + money(T[1][0], 0) + ': <b>no pagas impuesto a la renta</b>.'
                   : 'La rebaja por gastos personales cubre todo el impuesto causado: <b>no pagas impuesto a la renta</b>.'));
      var bars = '', labels = '';
      T.forEach(function (t, j) {
        var h = 14 + t[2] / 0.37 * 86;
        bars += '<span class="' + (j === i ? 'is-on' : (j < i ? 'is-past' : '')) + '" style="height:' + h.toFixed(0) + '%"></span>';
        labels += '<span class="' + (j === i ? 'is-on' : '') + '">' + Math.round(t[2] * 100) + '%</span>';
      });
      out(root, 'viz', '<div class="cv-label"><span>Tabla del SRI ' + yr + '</span><span>' +
        (i === 0 ? 'Fracción exenta' : 'Tu tramo: ' + pct(r[2]) + ' sobre lo que pasa de ' + money(r[0], 0)) + '</span></div>' +
        '<div class="cv-brackets">' + bars + '</div><div class="cv-blabels">' + labels + '</div>');
      var next = T[i + 1];
      syncIrTable(root, yr, i, next ? (base - r[0]) / (next[0] - r[0]) : 1,
        'Tu base imponible: <b>USD ' + money(base) + '</b> · ' + (i === 0 ? 'fracción exenta, no pagas impuesto.' : 'tramo del ' + pct(r[2]) + ', desde USD ' + money(r[0], 0) + '.'), cat ? P.canastas.length : cargas);

      // «anterior + este mes + pronóstico × n meses», sin los tramos que no aplican (enero no tiene anterior; diciembre, pronóstico)
      function trio(a, x) {
        var p = [];
        if (a != null) p.push('anterior ' + money(a));
        p.push('este mes ' + money(x));
        if (pron) p.push('pronóstico ' + money(x) + ' × ' + pron + (pron === 1 ? ' mes' : ' meses'));
        return '<small>' + p.join(' + ') + '</small>';
      }
      var rows = [];
      if (cob != null) rows.push(['+ Ya cobrado, ' + antN + '<small>sueldo y extras de los meses anteriores</small>', '$ ' + money(cob)]);
      rows.push(['+ Sueldo' + trio(cob == null && ant ? S * ant : null, S), '$ ' + money(S * (cob == null ? 12 : quedan))]);
      if (E) rows.push(['+ Horas extra, comisiones y bonos' + trio(cob == null && ant ? E * ant : null, E), '$ ' + money(E * (cob == null ? 12 : quedan))]);
      if (noap) rows.push(['+ Ingresos no aportables', '$ ' + money(noap)]);
      if (util) rows.push(['+ Utilidades', '$ ' + money(util)]);
      rows.push(['− Aporte personal IESS (' + pct(P.iess) + ')' + trio(ant ? apAnt : null, apMes), '$ ' + money(aporte)]);
      if (exAdulto) rows.push(['− Exoneración por 65 años o más<small>1 fracción básica</small>', '$ ' + money(exAdulto)]);
      if (exDisc) rows.push(['− Exoneración por discapacidad<small>2 fracciones básicas × ' + Math.round(discP * 100) + ' %</small>', '$ ' + money(exDisc)]);
      rows.push(['= Base imponible neta', '$ ' + money(base), 'is-sum']);
      rows.push(['Impuesto del año según la tabla', '$ ' + money(causado)]);
      rows.push(['− Gastos personales<small>' + money(gastos) + (gastos > tope ? ' (limitado a ' : ' (tope ') + money(tope) + ', ' +
        (cat ? 'enfermedad catastrófica, ' : cargas + (cargas === 5 ? ' o más cargas, ' : (cargas === 1 ? ' carga, ' : ' cargas, '))) + canastas + ' canastas) × 18' + ' %</small>', '$ ' + money(rebaja)]);
      rows.push(['= Impuesto a pagar en el año', '$ ' + money(anual), 'is-sum']);
      if (ant) rows.push(['− Ya retenido, ' + antN + (ret == null ? '<small>estimado con tu sueldo actual</small>' : ''), '$ ' + money(retV)]);
      rows.push(['= Falta por retener<small>' + money(Math.max(0, falta)) + ' ÷ ' + quedan + (quedan === 1 ? ' mes' : ' meses') + '</small>', '$ ' + money(Math.max(0, falta))]);
      rows.push(['Retención de ' + mesN, '$ ' + money(mesRet), 'is-total']);
      // Menos ruido: arriba solo lo esencial; el paso a paso completo queda plegado.
      var more = q(root, '[data-o="more"]');
      if (more) {
        out(root, 'lines', lines([
          ['Base imponible', '$ ' + money(base)],
          ['Impuesto según la tabla', '$ ' + money(causado)],
          ['− Rebaja por gastos personales', '$ ' + money(rebaja)],
          ['Impuesto del año', '$ ' + money(anual), 'is-sum'],
          ['Retención de ' + mesN, '$ ' + money(mesRet), 'is-total']]));
        var open = more.querySelector('details') && more.querySelector('details').open;
        more.innerHTML = '<details class="calc-more"' + (open ? ' open' : '') + '><summary>Ver el cálculo paso a paso</summary><dl class="calc-lines">' + lines(rows) + '</dl></details>';
      } else out(root, 'lines', lines(rows));
      out(root, 'fx', i === 0 ? money(base) + ' ≤ ' + money(T[1][0]) + ' → 0,00'
        : money(r[1]) + ' + ' + pct(r[2]) + ' × (' + money(base) + ' − ' + money(r[0]) + ') = ' + money(causado));
      var warn = falta < -0.005 ? 'Ya te retuvieron $ ' + money(-falta) + ' más de lo que te toca en el año: no deberían retenerte nada más.' : '';
      out(root, 'warn', warn); show(root, 'warn', !!warn);
      out(root, 'tip', 'Tope de gastos personales ' + (cat ? 'por enfermedad catastrófica, rara o huérfana' : 'con ' + cargas + (cargas === 5 ? ' o más' : '') + (cargas === 1 ? ' carga' : ' cargas')) + ': ' +
        canastas + ' canastas básicas de enero de ' + yr + ' (USD ' + money(Y.cfb) + ') = USD ' + money(tope) + '.');
      show(root, 'tip', true);
      return anual;
    },

    // Liquidación: cada rubro dice si aplica o no y por qué, según la causal.
    liquidacion: function (root) {
      var R = liquidacion({
        ingreso: parseDate((q(root, '[name="ingreso"]') || {}).value), salida: parseDate((q(root, '[name="salida"]') || {}).value),
        sueldo: num(root, 'sueldo', 0), variable: num(root, 'variable', 0), causal: (q(root, '[name="causal"]') || {}).value,
        diasPend: num(root, 'diasPend', 0, 31), vacPend: num(root, 'vacPend', 0, 90), d13: radio(root, 'd13') || 'mensual', d14: radio(root, 'd14') || 'mensual',
        region: radio(root, 'region') || 'sierra', fondosPend: num(root, 'fondosPend', 0, 600), otros: num(root, 'otros', 0), descuentos: num(root, 'descuentos', 0)
      });
      out(root, 'k', 'Liquidación estimada');
      if (R.error) {
        setBig(q(root, '[data-o="big"]'), 0);
        out(root, 'sub', ''); out(root, 'lines', '');
        out(root, 'warn', R.error); show(root, 'warn', true);
        return 0;
      }
      setBig(q(root, '[data-o="big"]'), R.total);
      var anios = Math.floor(R.dias / 360), meses = Math.floor((R.dias % 360) / 30);
      out(root, 'sub', R.causal.n + ' · ' + (anios ? anios + (anios === 1 ? ' año' : ' años') + (meses ? ' y ' : '') : '') + (meses || !anios ? meses + (meses === 1 ? ' mes' : ' meses') : '') + ' de servicio.');
      var rows = R.rubros.map(function (r) {
        return [r.label + '<small>' + r.por + '</small>', r.aplica ? '$ ' + money(r.monto) : '<span class="na">No aplica</span>', r.aplica ? '' : 'is-na'];
      });
      rows.push(['= Total bruto', '$ ' + money(R.bruto), 'is-sum']);
      if (R.iess) rows.push(['− Aporte personal IESS<small>9,45 % de la remuneración pendiente</small>', '$ ' + money(R.iess)]);
      if (R.descuentos) rows.push(['− Anticipos y préstamos', '$ ' + money(R.descuentos)]);
      rows.push(['= Te deben pagar', '$ ' + money(R.total), 'is-total']);
      out(root, 'lines', lines(rows));
      var c = (q(root, '[name="causal"]') || {}).value, warn = '';
      if (c === 'renuncia') warn = 'La bonificación por desahucio supone que avisaste por escrito con al menos 15 días de anticipación. Si te retiras para jubilarte, la Corte Nacional (enero de 2025) resolvió que no procede.';
      if (c === 'vb_empleador') warn = 'Si el visto bueno no fue aprobado por un inspector del trabajo, la salida puede considerarse despido intempestivo.';
      if (c === 'prueba' && !R.periodoPrueba) warn = 'El período de prueba dura como máximo 90 días; con más tiempo trabajado, revisa la causal.';
      if (c === 'obra') warn = 'Revisa tu contrato: según el tipo (obra cierta, eventual, de temporada) pueden aplicar reglas propias.';
      out(root, 'warn', warn); show(root, 'warn', !!warn);
      return R.total;
    },

    // Sueldo neto: lo que queda después del IESS, el impuesto y otros descuentos, y lo que cuesta al empleador.
    neto: function (root) {
      var ir = !!(q(root, '[name="ir"]') || {}).checked, R = neto({
        sueldo: num(root, 'sueldo', 0), descuentos: num(root, 'descuentos', 0), ir: ir, gastos: num(root, 'gastos', 0),
        cargas: Math.min(5, parseInt(radio(root, 'cargas') || '0', 10)), decimos: radio(root, 'decimos') !== 'acumulado',
        fondos: !!(q(root, '[name="fondos"]') || {}).checked, year: P.year });
      out(root, 'k', 'Esto recibirías después del IESS');
      setBig(q(root, '[data-o="big"]'), R.trasIess);
      out(root, 'sub', 'Con impuesto, descuentos y beneficios mensualizados, cada mes te llegan <b>$ ' + money(R.neto) + '</b> (parámetros ' + P.year + ').');
      var rows = [['Sueldo bruto', '$ ' + money(R.sueldo)],
                  ['− Aporte personal IESS (' + pct(P.iess) + ')', '$ ' + money(R.aporte)],
                  ['= Después del IESS', '$ ' + money(R.trasIess), 'is-sum']];
      if (ir) rows.push(['− Impuesto a la renta del mes<small>' + (R.irMes ? 'impuesto del año ' + money(R.ir.impuesto) + ' ÷ 12' : 'no pasas la fracción exenta') + '</small>', '$ ' + money(R.irMes)]);
      if (R.descuentos) rows.push(['− Otros descuentos', '$ ' + money(R.descuentos)]);
      if (R.d13) rows.push(['+ Décimo tercero mensualizado<small>sueldo ÷ 12</small>', '$ ' + money(R.d13)]);
      if (R.d14) rows.push(['+ Décimo cuarto mensualizado<small>SBU ' + P.year + ' ÷ 12</small>', '$ ' + money(R.d14)]);
      if (R.fondos) rows.push(['+ Fondos de reserva<small>8,33 %, desde el mes 13</small>', '$ ' + money(R.fondos)]);
      rows.push(['= Te llega al mes', '$ ' + money(R.neto), 'is-total']);
      out(root, 'lines', lines(rows));
      out(root, 'emp', '<p class="calc-k">Vista del empleador</p><dl class="calc-lines">' + lines([
        ['Sueldo', '$ ' + money(R.sueldo)],
        ['+ Aporte patronal IESS (' + pct(P.iessPatronal) + ')', '$ ' + money(R.patronal)],
        ['+ Décimo tercero (provisión mensual)', '$ ' + money(r2(R.sueldo / 12))],
        ['+ Décimo cuarto (provisión mensual)', '$ ' + money(r2(P.sbu / 12))],
        ['+ Fondos de reserva', '$ ' + money(R.fondos ? R.fondos : 0)],
        ['+ Vacaciones (provisión: sueldo ÷ 24)', '$ ' + money(R.vacaciones)],
        ['= Costo laboral mensual', '$ ' + money(R.costo), 'is-total']]) + '</dl>');
      var warn = R.sueldo > 0 && R.sueldo < P.sbu ? 'Con jornada completa nadie puede ganar menos del salario básico (USD ' + money(P.sbu, 0) + ' en ' + P.year + '). Si trabajas a tiempo parcial, es proporcional.' : '';
      out(root, 'warn', warn); show(root, 'warn', !!warn);
      var esBasico = R.sueldo === P.sbu;
      out(root, 'tip', esBasico ? 'Ese es el salario básico ' + P.year + ' (USD ' + money(P.sbu, 0) + '): el mínimo que se paga con jornada completa.' : ''); show(root, 'tip', esBasico);
      return R.trasIess;
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
  // Campo de fecha DD/MM/AAAA: el <input type="date"> nativo muestra el formato del idioma del
  // navegador (mm/dd/aaaa en inglés), así que se escribe en texto con las barras automáticas y
  // el botón abre el calendario nativo escondido (.cf-pick) solo para elegir.
  function maskDate(el) {
    var v = el.value, pos = el.selectionStart == null ? v.length : el.selectionStart;
    var atEnd = pos >= v.length, before = v.slice(0, pos).replace(/\D/g, '').length;
    var isoM = /^\s*(\d{4})-(\d{1,2})-(\d{1,2})\s*$/.exec(v);
    if (isoM) v = isoM[3] + '/' + isoM[2] + '/' + isoM[1];
    var parts = v.replace(/[-.\s]/g, '/').replace(/[^\d\/]/g, '').split('/'), d = '';
    parts.forEach(function (p, i) { d += (i < 2 && i < parts.length - 1 && p.length === 1) ? '0' + p : p; });
    d = d.slice(0, 8);
    var f = d.slice(0, 2) + (d.length > 2 ? '/' + d.slice(2, 4) : '') + (d.length > 4 ? '/' + d.slice(4) : '');
    if (f === el.value) return;
    el.value = f;
    if (document.activeElement !== el) return;
    var c = f.length;
    if (!atEnd && !isoM) { c = 0; for (var n = 0; c < f.length && n < before; c++) if (/\d/.test(f[c])) n++; }
    el.setSelectionRange(c, c);
  }
  function bindDates(root) {
    Array.prototype.forEach.call(root.querySelectorAll('.cf-date'), function (box) {
      var txt = q(box, 'input:not(.cf-pick)'), pick = q(box, '.cf-pick'), btn = q(box, '.cf-cal');
      function mark(strict) {
        var v = txt.value, bad = v !== '' && (strict || v.length >= 10) && !parseDate(v);
        box.classList.toggle('is-bad', bad);
        txt.setAttribute('aria-invalid', String(bad));
      }
      txt.addEventListener('input', function () { maskDate(txt); mark(false); });
      txt.addEventListener('blur', function () { mark(true); });
      if (!pick || !btn || typeof pick.showPicker !== 'function') return;
      btn.hidden = false;
      btn.addEventListener('click', function () {
        var d = parseDate(txt.value);
        pick.value = d ? iso(d) : '';
        try { pick.showPicker(); } catch (e) { txt.focus(); }
      });
      // corre antes que el listener del <section>, así el cálculo ya lee la fecha nueva
      function fromPick() { var d = parseDate(pick.value); if (d) { txt.value = dmy(d); mark(true); } }
      pick.addEventListener('input', fromPick);
      pick.addEventListener('change', fromPick);
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

  // ---------- tabla del SRI junto a la calculadora de renta (.ir-card) ----------
  // Pestañas por año (.ir-tab), un panel por año (.ir-panel) con su tabla, la franja que marca
  // el tramo (.ir-hl, se desliza a la fila) y los botones Copiar / Excel (.ir-act).
  function syncIrTable(root, yr, i, pos, live, cargas) {
    var card = q(root, '.ir-card');
    if (card) {
      var show = card.getAttribute('data-show'), panel = q(card, '.ir-panel[data-year="' + show + '"]');
      var rows = panel ? panel.querySelectorAll('tbody tr') : [], on = String(yr) === show && rows.length > i;
      Array.prototype.forEach.call(card.querySelectorAll('tbody tr.is-on'), function (tr) { tr.classList.remove('is-on'); });
      if (on) rows[i].classList.add('is-on');
      card._hl = on ? { row: rows[i], pos: Math.max(0, Math.min(1, pos)) } : null;
      placeHl(card);
      var lv = q(card, '.ir-live');
      if (lv) lv.innerHTML = on ? live : (panel && panel.hasAttribute('data-soon') ? ''
        : 'Tabla de consulta: la calculadora usa las tablas de ' + Object.keys(P.renta).join(', ').replace(/, (\d+)$/, ' y $1') + '.');
    }
    // la fila de tus cargas en la tabla de topes de gastos personales
  }
  function placeHl(card, instant) {
    var hl = q(card, '.ir-hl'), s = card._hl;
    if (!hl) return;
    if (!s || !s.row.offsetParent) { hl.classList.remove('is-on'); return; }
    var first = instant || !hl.classList.contains('is-on');
    if (first) hl.classList.add('no-anim');
    var wr = hl.parentNode.getBoundingClientRect(), rr = s.row.getBoundingClientRect();
    hl.style.transform = 'translateY(' + (rr.top - wr.top).toFixed(1) + 'px)';
    hl.style.height = rr.height.toFixed(1) + 'px';
    hl.style.setProperty('--pos', (s.pos * 100).toFixed(1) + '%');
    hl.classList.add('is-on');
    if (first) { void hl.offsetHeight; requestAnimationFrame(function () { hl.classList.remove('no-anim'); }); }
  }
  function tableRows(panel) {
    return Array.prototype.map.call(panel.querySelectorAll('thead tr, tbody tr'), function (tr) {
      return Array.prototype.map.call(tr.children, function (c) { return { t: c.textContent.trim(), v: c.getAttribute('data-v') }; });
    });
  }
  var PAGE_URL = 'https://www.squarenet.com.ec/blog/impuesto-renta-relacion-dependencia-ecuador.html';
  function copyTable(panel) {
    var rows = tableRows(panel), src = (q(panel, '.ir-src') || {}).textContent || '';
    // «5 %» con espacio duro no lo reconoce Excel como porcentaje: se copia «5%»
    var tsv = rows.map(function (r) { return r.map(function (c) { return c.t.replace(/\s%$/, '%'); }).join('\t'); }).join('\n') + '\n\nFuente: ' + src.trim() + '\nTabla y calculadora: ' + PAGE_URL;
    var html = '<table>' + rows.map(function (r, k) {
      return '<tr>' + r.map(function (c) { var tg = k ? 'td' : 'th'; return '<' + tg + '>' + c.t + '</' + tg + '>'; }).join('') + '</tr>';
    }).join('') + '</table><p>Fuente: ' + src.trim() + '</p><p>Tabla y calculadora: <a href="' + PAGE_URL + '">' + PAGE_URL + '</a></p>';
    var cb = navigator.clipboard;
    if (cb && window.isSecureContext) {
      if (window.ClipboardItem) {
        return cb.write([new ClipboardItem({ 'text/plain': new Blob([tsv], { type: 'text/plain' }), 'text/html': new Blob([html], { type: 'text/html' }) })])
          .catch(function () { return cb.writeText(tsv); });
      }
      return cb.writeText(tsv);
    }
    var ta = document.createElement('textarea'), ok = false;
    ta.value = tsv; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(ta); ta.select();
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok ? Promise.resolve() : Promise.reject();
  }
  // Excel: .xlsx de verdad (celdas numéricas con formato) con SheetJS, que se carga recién al pulsar.
  // Si la librería no carga, se baja un CSV.
  var XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  function exportTable(panel, yr) {
    var rows = tableRows(panel), src = ((q(panel, '.ir-src') || {}).textContent || '').trim(), dec = panel.hasAttribute('data-dec');
    var name = 'tabla-impuesto-renta-' + yr + '-sri', title = 'Tabla del impuesto a la renta ' + yr + ' · personas naturales (USD)';
    var body = rows.slice(1).map(function (r) { return r.map(function (c) { return c.v ? +c.v : c.t; }); });
    function save(blob, file) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = file;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    }
    function xlsx() {
      var X = window.XLSX, aoa = [[title], [], rows[0].map(function (c) { return c.t; })].concat(body, [[], ['Fuente: ' + src], ['Tabla y calculadora: ' + PAGE_URL]]);
      var ws = X.utils.aoa_to_sheet(aoa);
      body.forEach(function (r, k) {
        r.forEach(function (v, c) {
          var cell = ws[X.utils.encode_cell({ r: k + 3, c: c })];
          if (cell && cell.t === 'n') cell.z = c === r.length - 1 ? '0%' : (dec ? '#,##0.00' : '#,##0');
        });
      });
      ws['!cols'] = [{ wch: 16 }, { wch: 16 }, { wch: 24 }, { wch: 22 }];
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
      var wb = X.utils.book_new();
      X.utils.book_append_sheet(wb, ws, 'IR ' + yr);
      X.writeFile(wb, name + '.xlsx');
    }
    function csv() {
      var lines = [[title], rows[0].map(function (c) { return c.t; })].concat(body, [[], ['Fuente: ' + src], ['Tabla y calculadora: ' + PAGE_URL]]);
      save(new Blob(['﻿' + lines.map(function (r) {
        return r.map(function (v) { return typeof v === 'number' ? String(v) : '"' + String(v).replace(/"/g, '""') + '"'; }).join(';');
      }).join('\r\n')], { type: 'text/csv;charset=utf-8' }), name + '.csv');
    }
    if (window.XLSX) { xlsx(); return; }
    var s = document.createElement('script');
    s.src = XLSX_URL; s.async = true;
    s.onload = function () { if (window.XLSX) xlsx(); else csv(); };
    s.onerror = csv;
    document.head.appendChild(s);
  }
  function flash(btn, txt) {
    var lab = q(btn, 'span'), old = btn._lab || (btn._lab = lab.textContent);
    lab.textContent = txt; btn.classList.add('is-done');
    clearTimeout(btn._t);
    btn._t = setTimeout(function () { lab.textContent = old; btn.classList.remove('is-done'); }, 1800);
  }
  function bindIrCard(root, run) {
    var card = q(root, '.ir-card');
    if (!card) return;
    var tabs = card.querySelectorAll('.ir-tab');
    function select(y, focus) {
      card.setAttribute('data-show', y);
      Array.prototype.forEach.call(tabs, function (t) {
        var on = t.getAttribute('data-year') === y;
        t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
        if (on && focus) t.focus({ preventScroll: true });
        // en celular la tira de años se desplaza: que la pestaña elegida quede a la vista
        var bar = t.parentNode;
        if (on && (t.offsetLeft < bar.scrollLeft || t.offsetLeft + t.offsetWidth > bar.scrollLeft + bar.clientWidth)) {
          bar.scrollLeft = t.offsetLeft - (bar.clientWidth - t.offsetWidth) / 2;
        }
      });
      Array.prototype.forEach.call(card.querySelectorAll('.ir-panel'), function (p) { p.hidden = p.getAttribute('data-year') !== y; });
      var soon = !!q(card, '.ir-panel[data-year="' + y + '"][data-soon]');
      Array.prototype.forEach.call(card.querySelectorAll('.ir-act'), function (b) { b.disabled = soon; });
      if (P.renta[y]) root.setAttribute('data-year', y);
      run();
    }
    Array.prototype.forEach.call(tabs, function (t) {
      t.addEventListener('click', function () { select(t.getAttribute('data-year')); });
      t.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        var list = Array.prototype.slice.call(tabs), k = list.indexOf(t) + (e.key === 'ArrowRight' ? 1 : -1);
        select(list[(k + list.length) % list.length].getAttribute('data-year'), true);
      });
    });
    card.addEventListener('click', function (e) {
      var b = e.target.closest('.ir-act');
      if (!b || b.disabled) return;
      var y = card.getAttribute('data-show'), panel = q(card, '.ir-panel[data-year="' + y + '"]');
      if (b.getAttribute('data-act') === 'copy') {
        copyTable(panel).then(function () { flash(b, 'Copiada'); }, function () { flash(b, 'No se pudo copiar'); });
      } else {
        exportTable(panel, y); flash(b, 'Descargando');
      }
    });
    var raf = 0;
    window.addEventListener('resize', function () {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () { placeHl(card, true); });
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { placeHl(card, true); });
  }

  // «Copiar resultado»: el resultado principal y el desglose en texto, con el enlace de la página.
  function copyText(text) {
    var cb = navigator.clipboard;
    if (cb && window.isSecureContext) return cb.writeText(text);
    var ta = document.createElement('textarea'), ok = false;
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(ta); ta.select();
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok ? Promise.resolve() : Promise.reject();
  }
  function resultText(root) {
    function txt(el) { if (!el) return ''; var c = el.cloneNode(true); Array.prototype.forEach.call(c.querySelectorAll('small'), function (s) { s.textContent = ' (' + s.textContent + ')'; }); return c.textContent.replace(/\s+/g, ' ').trim(); }
    var big = (q(root, '[data-o="big"]') || {}).textContent || '';
    var t = [txt(q(root, '[data-o="k"]')) + ': ' + big.replace(/\s+/g, '').replace('$', '$ '), txt(q(root, '[data-o="sub"]'))];
    Array.prototype.forEach.call(root.querySelectorAll('.calc-out [data-o="lines"] > div, .calc-out [data-o="emp"] .calc-lines > div'), function (d) {
      t.push(txt(d.querySelector('dt')) + ': ' + txt(d.querySelector('dd')));
    });
    var can = document.querySelector('link[rel="canonical"]');
    t.push('', 'Calculado en ' + (can ? can.href : location.href.split('#')[0]) + ' (referencial)');
    return t.filter(function (x, i) { return x || i > 1; }).join('\n');
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
    bindDates(root);
    bindIrCard(root, run);
    // GA4 (solo si el visitante aceptó cookies y hay gtag): inicio de cálculo y clic al software
    var started = false;
    function track(ev) { if (window.gtag) window.gtag('event', ev, { calculadora: root.getAttribute('data-calc') }); }
    root.addEventListener('input', function () { if (!started) { started = true; track('calc_inicio'); } });
    root.addEventListener('click', function (e) { if (e.target.closest('.calc-go')) track('calc_clic_software'); });
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

    root.addEventListener('click', function (e) {
      var b = e.target.closest('.calc-copy');
      if (!b) return;
      copyText(resultText(root)).then(function () { flash(b, 'Copiado'); }, function () { flash(b, 'No se pudo copiar'); });
    });
        // botones − / + (.cf-step)
    root.addEventListener('click', function (e) {
      var b = e.target.closest('.cf-step [data-step]');
      if (!b) return;
      var inp = b.parentNode.querySelector('input'), min = parseFloat(inp.min), max = parseFloat(inp.max);
      var v = (parseInt(inp.value, 10) || 0) + parseInt(b.getAttribute('data-step'), 10);
      inp.value = Math.max(isFinite(min) ? min : 0, Math.min(isFinite(max) ? max : 99, v));
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    });
    run();
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-calc]'), init);
  window.SquareNetCalc = { P: P, irCausado: irCausado, irAnual: irAnual, days360: days360, money: money, r2: r2, parseDate: parseDate,
    decimo13: decimo13, decimo14: decimo14, liquidacion: liquidacion, neto: neto };
})();
