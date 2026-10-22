// Pruebas del blog, sin dependencias: `node tests/site.test.js`.
// Revisa JSON-LD, canonical, enlaces e imágenes internas, sitemap, textos pendientes y las reglas de traslado de feriados.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..'), BLOG = path.join(ROOT, 'blog');
let ok = 0, fail = 0;
function check(nombre, cond, detalle) { if (cond) ok++; else { fail++; console.error('✗ ' + nombre + (detalle ? ': ' + detalle : '')); } }

const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const pages = fs.readdirSync(BLOG).filter((f) => f.endsWith('.html'));
for (const f of pages) {
  const html = fs.readFileSync(path.join(BLOG, f), 'utf8');
  const tag = f + ': ';
  // canonical y sitemap
  const canon = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
  const esperado = 'https://www.squarenet.com.ec/blog/' + (f === 'index.html' ? '' : f);
  check(tag + 'canonical', canon === esperado, canon);
  check(tag + 'está en el sitemap', sitemap.includes('<loc>' + esperado + '</loc>'));
  // JSON-LD válido
  const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (f !== 'index.html') {
    let data = null;
    try { data = ld && JSON.parse(ld[1]); } catch (e) { data = null; }
    check(tag + 'JSON-LD válido', !!data && data['@type'] === 'BlogPosting' && !!data.headline && data.mainEntityOfPage === esperado);
  }
  // un solo H1, título y descripción
  check(tag + 'un solo h1', (html.match(/<h1[\s>]/g) || []).length === 1);
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  check(tag + 'descripción de 70 a 220 caracteres', desc.length >= 70 && desc.length <= 220, desc.length + ' caracteres');
  if (desc.length > 160) console.warn('  aviso: ' + f + ' tiene una descripción de ' + desc.length + ' caracteres (Google suele cortar en ~160)');
  // enlaces e imágenes internos
  const refs = [...html.matchAll(/(?:href|src)="([^"#:]+)(?:#[^"]*)?"/g)].map((m) => m[1]).filter((u) => u && !u.startsWith('//'));
  for (const u of new Set(refs)) check(tag + 'existe ' + u, fs.existsSync(path.join(BLOG, decodeURI(u))));
  // cosas que no deben quedar
  check(tag + 'sin marcadores sin reemplazar', !/\{NB\}|\{READ\}|BTNX/.test(html));
  check(tag + 'sin enlace a la página de lectores eliminada', !html.includes('lectores.html'));
  check(tag + 'sin canales de soporte públicos', !/soporte@squarenet|98 220 4777|982204777/.test(html));
  if (/data-calc="/.test(html)) check(tag + 'carga calc.js', html.includes('../js/calc.js'));
}

// ---------- feriados: traslados según el art. 65 (R.O. 906) ----------
const fsrc = fs.readFileSync(path.join(ROOT, 'js', 'feriados.js'), 'utf8');
const F = vm.runInNewContext('(' + fsrc.match(/var F = (\[[\s\S]*?\n  \]);/)[1] + ')');
const D = (s) => { const p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
const nunca = ['Año Nuevo', 'Navidad', 'Carnaval', 'Viernes Santo'];
for (const h of F) {
  const o = D(h.o), d = D(h.d[0]), dow = o.getDay(), dias = Math.round((d - o) / 864e5);
  if (nunca.includes(h.n)) { check('Feriado ' + h.n + ' ' + h.o + ' no se traslada', dias === 0); continue; }
  if (h.n === 'Independencia de Cuenca' && h.o === '2027-11-03') { check('Cuenca 2027 se une a Difuntos (martes 2)', h.d[0] === '2027-11-02'); continue; }
  // feriados continuos: si dos feriados quedan seguidos (lunes y martes), el martes no se mueve al lunes ocupado
  if (h.n === 'Independencia de Cuenca' && h.o === '2026-11-03') { check('Cuenca 2026 queda martes, junto a Difuntos', h.d[0] === '2026-11-03'); continue; }
  const esperado = { 0: 1, 1: 0, 2: -1, 3: 2, 4: 1, 5: 0, 6: -1 }[dow];
  check('Feriado ' + h.n + ' ' + h.o + ': traslado de ' + esperado + ' días', dias === esperado, 'tiene ' + dias);
}
// fines de semana largos (nacionales 2027): 8
const libres = new Set(F.filter((h) => h.s === 'nacional').flatMap((h) => h.d));
const libre = (d) => d.getDay() === 0 || d.getDay() === 6 || libres.has(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'));
const grupos = new Set();
for (const k of libres) {
  if (!k.startsWith('2027')) continue;
  let a = D(k); while (libre(new Date(a.getFullYear(), a.getMonth(), a.getDate() - 1))) a = new Date(a.getFullYear(), a.getMonth(), a.getDate() - 1);
  let b = D(k); while (libre(new Date(b.getFullYear(), b.getMonth(), b.getDate() + 1))) b = new Date(b.getFullYear(), b.getMonth(), b.getDate() + 1);
  if (Math.round((b - a) / 864e5) + 1 >= 3) grupos.add(+a);
}
check('2027 tiene 8 fines de semana largos nacionales', grupos.size === 8, grupos.size);
check('2027 tiene 10 feriados nacionales', F.filter((h) => h.s === 'nacional' && h.o.startsWith('2027')).length === 10);

console.log((fail ? '✗ ' : '✓ ') + ok + ' comprobaciones pasaron' + (fail ? ', ' + fail + ' fallaron' : ''));
process.exit(fail ? 1 : 0);
