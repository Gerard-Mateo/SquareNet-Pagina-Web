// Pruebas del blog, sin dependencias: `node tests/site.test.js`.
// Revisa JSON-LD, canonical, enlaces e imágenes internas, sitemap, textos pendientes.
'use strict';
const fs = require('fs'), path = require('path');
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

console.log((fail ? '✗ ' : '✓ ') + ok + ' comprobaciones pasaron' + (fail ? ', ' + fail + ' fallaron' : ''));
process.exit(fail ? 1 : 0);
