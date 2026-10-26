// Pruebas de regresión de las calculadoras del blog (js/calc.js), sin dependencias: `node tests/calc.test.js`.
// Cargan calc.js con un DOM mínimo simulado y prueban sus núcleos de cálculo (funciones puras).
// Si cambian los parámetros legales (P en calc.js), algunos valores esperados cambian: actualízalos junto con P.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'calc.js'), 'utf8');
const win = { matchMedia: () => ({ matches: true }) };
const ctx = { window: win, document: { querySelectorAll: () => [], querySelector: () => null }, navigator: {}, location: { hash: '', href: '' },
  requestAnimationFrame: () => 0, cancelAnimationFrame: () => 0, performance: { now: () => 0 }, Event: function () {} };
vm.createContext(ctx);
vm.runInContext(src, ctx);
const C = win.SquareNetCalc;
const D = (s) => C.parseDate(s);

let ok = 0, fail = 0;
function eq(nombre, real, esperado, tol) {
  const pasa = typeof esperado === 'number' ? Math.abs(real - esperado) <= (tol == null ? 0.005 : tol) : real === esperado;
  if (pasa) ok++; else { fail++; console.error('✗ ' + nombre + ': se obtuvo ' + real + ', se esperaba ' + esperado); }
}

// ---------- impuesto a la renta 2026 ----------
eq('IR: ejemplo del artículo (2.500/mes, 1 carga, 5.000 de gastos)', C.irAnual({ ingresos: 30000, aporte: 2835, gastos: 5000, cargas: 1, year: 2026 }).impuesto, 581.75);
eq('IR: cero bajo la fracción exenta', C.irAnual({ ingresos: 12000, aporte: 1134, year: 2026 }).impuesto, 0);
eq('IR: límite exacto de la fracción exenta', C.irCausado(12208), 0);
eq('IR: un dólar sobre la fracción exenta (5 %)', C.irCausado(12209), 0.05);
eq('IR: ejemplo del depurador de SquareNet', C.irCausado(49929.27), 5803.57, 0.01);
eq('IR: tramo más alto', C.irCausado(150000), 39388.28);
eq('IR: rebaja topada (1 carga = 9 canastas)', C.irAnual({ ingresos: 84000, aporte: 7938, gastos: 20000, cargas: 1, year: 2026 }).rebaja, 1331.32);
eq('IR: enfermedad catastrófica (100 canastas)', C.irAnual({ ingresos: 84000, aporte: 7938, gastos: 20000, cargas: 1, especial: true, year: 2026 }).impuesto, 9440.10);
eq('IR: la rebaja no supera el impuesto causado', C.irAnual({ ingresos: 18000, aporte: 1701, gastos: 9000, cargas: 2, year: 2026 }).impuesto, 0);
eq('IR: 5 o más cargas = 20 canastas', C.irAnual({ ingresos: 60000, aporte: 5670, gastos: 30000, cargas: 7, year: 2026 }).tope, 16436);
eq('IR: año sin tabla publicada usa la vigente', C.irAnual({ ingresos: 30000, aporte: 2835, year: 2027 }).year, 2026);

// ---------- décimo tercero ----------
eq('D13: período completo con sueldo fijo', C.decimo13({ y: 2026, sueldo: 800, variable: 0 }).total, 800);
eq('D13: ingreso a mitad de período (16/03/2026)', C.decimo13({ y: 2026, sueldo: 800, ingreso: D('16/03/2026') }).total, 566.67);
eq('D13: ingresos variables mes a mes', C.decimo13({ y: 2026, sueldo: 1000, meses: [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 2200] }).total, 1100);
eq('D13: sueldo + variables', C.decimo13({ y: 2026, sueldo: 900, variable: 300 }).total, 1200);
eq('D13: ingreso posterior al período', C.decimo13({ y: 2026, sueldo: 800, ingreso: D('15/12/2026') }).total, 0);
eq('D13: ingreso anterior al período = completo', C.decimo13({ y: 2026, sueldo: 800, ingreso: D('01/01/2020') }).total, 800);
eq('D13: pago hasta el 24 de diciembre', C.decimo13({ y: 2026, sueldo: 1 }).pago.getDate(), 24);
eq('D13: sueldo cero', C.decimo13({ y: 2026, sueldo: 0 }).total, 0);

// ---------- décimo cuarto ----------
eq('D14: Sierra, período completo pagado en 2026 (SBU 482)', C.decimo14({ y: 2026, region: 'sierra' }).acumulado, 482);
eq('D14: pago de 2027 = SBU pendiente', C.decimo14({ y: 2027, region: 'sierra' }).sbuOk, false);
eq('D14: Costa, ingreso 01/09/2025 (180 días)', C.decimo14({ y: 2026, region: 'costa', ingreso: D('01/09/2025') }).acumulado, 241);
eq('D14: jornada parcial de 20 horas', C.decimo14({ y: 2026, region: 'sierra', horas: 20 }).acumulado, 241);
eq('D14: mensualizado cruza de año (470 ago–dic 2025 + 482 ene–jul 2026)', C.decimo14({ y: 2026, region: 'sierra' }).mensualizado, 477);
eq('D14: Costa paga el 15 de marzo', C.decimo14({ y: 2027, region: 'costa' }).pago.getMonth(), 2);
eq('D14: ingreso posterior al período', C.decimo14({ y: 2026, region: 'sierra', ingreso: D('01/08/2026') }).acumulado, 0);

// ---------- liquidación ----------
const L = (o) => C.liquidacion(Object.assign({ sueldo: 1000, variable: 0, d13: 'mensual', d14: 'mensual', region: 'sierra' }, o));
const rub = (r, k) => r.rubros.filter((x) => x.k === k)[0].monto;
const dsp = L({ causal: 'despido', ingreso: D('01/01/2022'), salida: D('28/02/2026') });
eq('Liq: despido con 4 años y 2 meses → 5 meses de indemnización', rub(dsp, 'indem'), 5000);
eq('Liq: despido → desahucio 25 % × 4 años completos', rub(dsp, 'desahucio'), 1000);
eq('Liq: despido con 2 años → 3 meses', rub(L({ causal: 'despido', ingreso: D('01/03/2024'), salida: D('28/02/2026') }), 'indem'), 3000);
eq('Liq: exactamente 3 años → 3 meses', rub(L({ causal: 'despido', ingreso: D('01/03/2023'), salida: D('28/02/2026') }), 'indem'), 3000);
eq('Liq: 3 años y 1 día → 4 meses (la fracción cuenta como año)', rub(L({ causal: 'despido', ingreso: D('01/03/2023'), salida: D('01/03/2026') }), 'indem'), 4000);
eq('Liq: tope de 25 meses', rub(L({ causal: 'despido', ingreso: D('01/01/1990'), salida: D('31/12/2025') }), 'indem'), 25000);
const ren = L({ causal: 'renuncia', ingreso: D('01/01/2022'), salida: D('28/02/2026') });
eq('Liq: renuncia → sin indemnización', rub(ren, 'indem'), 0);
eq('Liq: renuncia → desahucio', rub(ren, 'desahucio'), 1000);
const vb = L({ causal: 'vb_empleador', ingreso: D('01/01/2022'), salida: D('28/02/2026') });
eq('Liq: visto bueno del empleador → sin desahucio', rub(vb, 'desahucio'), 0);
eq('Liq: visto bueno del empleador → sin indemnización', rub(vb, 'indem'), 0);
eq('Liq: visto bueno del trabajador → indemnización', rub(L({ causal: 'vb_trabajador', ingreso: D('01/01/2022'), salida: D('28/02/2026') }), 'indem'), 5000);
eq('Liq: acuerdo entre las partes → desahucio (art. 185)', rub(L({ causal: 'acuerdo', ingreso: D('01/01/2023'), salida: D('31/12/2025') }), 'desahucio'), 750);
eq('Liq: período de prueba → sin bonificaciones', rub(L({ causal: 'prueba', ingreso: D('01/01/2026'), salida: D('15/03/2026') }), 'desahucio'), 0);
eq('Liq: vacaciones proporcionales (6 meses, 900)', rub(L({ sueldo: 900, causal: 'renuncia', ingreso: D('01/01/2025'), salida: D('30/06/2025') }), 'vac'), 225);
eq('Liq: décimo tercero acumulado proporcional', rub(L({ causal: 'renuncia', d13: 'acum', ingreso: D('01/01/2020'), salida: D('31/05/2026') }), 'd13'), 500);
eq('Liq: décimo tercero mensualizado = nada pendiente', rub(L({ causal: 'renuncia', ingreso: D('01/01/2020'), salida: D('31/05/2026') }), 'd13'), 0);
eq('Liq: remuneración pendiente y su aporte IESS', L({ causal: 'renuncia', diasPend: 15, ingreso: D('01/01/2020'), salida: D('15/05/2026') }).iess, 47.25);
eq('Liq: fondos pendientes antes del primer año = 0', rub(L({ causal: 'renuncia', fondosPend: 3, ingreso: D('01/01/2026'), salida: D('31/05/2026') }), 'fr'), 0);
eq('Liq: fechas invertidas → error', !!L({ causal: 'renuncia', ingreso: D('01/01/2026'), salida: D('01/01/2025') }).error, true);
eq('Liq: sin fechas → error', !!L({ causal: 'renuncia' }).error, true);


// ---------- sueldo neto ----------
eq('Neto: salario básico después del IESS', C.neto({ sueldo: 482 }).trasIess, 436.45);
eq('Neto: salario básico sin impuesto', C.neto({ sueldo: 482, ir: true, year: 2026 }).irMes, 0);
eq('Neto: 2.500 con impuesto (sin gastos)', C.neto({ sueldo: 2500, ir: true, year: 2026 }).irMes, 123.48);
eq('Neto: décimos mensualizados se suman', C.neto({ sueldo: 1200, decimos: true }).neto, 1226.77);   // 1200 − 113,40 + 100 + 40,17
eq('Neto: costo laboral sin fondos', C.neto({ sueldo: 1000 }).costo, 1286.67);
eq('Neto: costo con fondos de reserva (ejemplo del cliente: sueldo 1.000)', C.neto({ sueldo: 1000, fondos: true }).costo, 1369.97);

console.log((fail ? '✗ ' : '✓ ') + ok + ' pruebas pasaron' + (fail ? ', ' + fail + ' fallaron' : ''));
process.exit(fail ? 1 : 0);
