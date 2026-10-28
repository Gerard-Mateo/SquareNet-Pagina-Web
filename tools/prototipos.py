"""Genera los prototipos de letra a partir de las páginas reales.

    python tools/prototipos.py

Crea prototipo-index.html y prototipo-plataforma.html: copias exactas de index.html y
plataforma.html (noindex, sin enlaces desde el sitio) que solo cambian la letra de títulos y
texto. Abajo a la izquierda hay un selector para comparar la letra actual con las candidatas;
la elección se recuerda en el navegador y también se puede pasar con ?letra=figtree.
Volver a correrlo cada vez que cambien index.html o plataforma.html.
"""
import os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')

# clave, nombre visible, familia CSS, peso de títulos, espaciado de títulos
FONTS = [
    ('serif', 'Source Serif (antes)', '"Source Serif 4", system-ui, serif', 600, '-.015em'),
    ('jakarta', 'Plus Jakarta Sans', '"Plus Jakarta Sans", system-ui, sans-serif', 700, '-.025em'),
    ('figtree', 'Figtree', '"Figtree", system-ui, sans-serif', 700, '-.02em'),
    ('dmsans', 'DM Sans (actual)', '"DM Sans", system-ui, sans-serif', 700, '-.02em'),
]
DEFAULT = 'dmsans'
GFONTS = ('https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,600;1,400&family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,500;1,600'
          '&family=Figtree:ital,wght@0,400;0,500;0,600;0,700;0,800;1,500;1,600'
          '&family=Oxanium:wght@700&family=Space+Grotesk:wght@500&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,500;1,9..40,600&display=swap')

# PRUEBA marca nueva: logo del cubo y paleta azul #1E82E6 + casi negro #0E1116
LOGO = ('<span class="sqn-logo" role="img" aria-label="SquareNet, software solutions">'
        '<svg viewBox="0 0 120 120" aria-hidden="true">'
        '<g stroke="#1E82E6" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="35.5" y="8.5" width="76" height="76"/>'
        '<path d="M8.5 35.5L35.5 8.5M84.5 35.5L111.5 8.5M84.5 111.5L111.5 84.5M8.5 111.5L35.5 84.5"/></g>'
        '<g fill="#1E82E6"><circle cx="35.5" cy="8.5" r="4.5"/><circle cx="111.5" cy="8.5" r="4.5"/><circle cx="111.5" cy="84.5" r="4.5"/><circle cx="35.5" cy="84.5" r="4.5"/></g>'
        '<rect x="8.5" y="35.5" width="76" height="76" stroke="#0E1116" stroke-width="6" stroke-linejoin="round" fill="none"/>'
        '<g fill="#0E1116"><circle cx="8.5" cy="35.5" r="4.5"/><circle cx="84.5" cy="35.5" r="4.5"/><circle cx="84.5" cy="111.5" r="4.5"/><circle cx="8.5" cy="111.5" r="4.5"/></g></svg>'
        '<span><span class="sqn-word">square<span>net</span></span><span class="sqn-tag">SOFTWARE SOLUTIONS</span></span></span>')
BRAND_CSS = """
  /* PRUEBA marca nueva: paleta azul (#1E82E6) y texto casi negro (#0E1116) en lugar del teal */
  :root{--color-text:#0E1116;--color-accent:#1E82E6;
    --color-accent-100:#ebf4fd;--color-accent-200:#d2e6fa;--color-accent-300:#a5cdf5;--color-accent-400:#6aaeee;--color-accent-500:#3f95ea;
    --color-accent-600:#1e82e6;--color-accent-700:#1769bd;--color-accent-800:#125192;--color-accent-900:#0d3863}
  footer.site-footer{background:#0E1116}
  .sqn-logo{display:inline-flex;align-items:center;gap:.31em;font-size:57px;color:#0E1116;transition:font-size .35s cubic-bezier(.16,1,.3,1)}
  .nav-scrolled .sqn-logo{font-size:36px}
  .nav-scrolled .sqn-tag{display:none}
  .sqn-logo svg{width:1em;height:1em;flex:none}
  .sqn-logo > span{display:flex;flex-direction:column}
  .sqn-word{font:700 .81em/.9 'Oxanium',sans-serif;letter-spacing:-.075em}
  .sqn-word span{color:#1E82E6}
  .sqn-tag{margin-top:.094em;padding-left:.03em;font:500 .117em 'Space Grotesk',sans-serif;letter-spacing:.34em;color:#5B6270;white-space:nowrap}
  @media (prefers-reduced-motion:reduce){.sqn-logo{transition:none}}"""

PAGES = [('index.html', 'prototipo-index.html'), ('plataforma.html', 'prototipo-plataforma.html')]


def head_block():
    rules = '\n'.join(
        f'  html[data-letra="{k}"]{{--font-heading:{fam};--font-body:{fam};--font-heading-weight:{w}}}\n'
        f'  html[data-letra="{k}"] h1,html[data-letra="{k}"] h2,html[data-letra="{k}"] h3{{letter-spacing:{ls}}}'
        for k, _, fam, w, ls in FONTS)
    return f'''<meta name="robots" content="noindex, nofollow">
<link href="{GFONTS}" rel="stylesheet">
<style>
  /* PROTOTIPO: igual a la página real, solo cambia la letra de títulos y texto (selector abajo a la izquierda) */
{rules}{BRAND_CSS}
  .proto-tag{{position:fixed;z-index:999;left:12px;bottom:12px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;max-width:calc(100vw - 24px);padding:6px;border-radius:18px;background:#16181b;color:#fff;font:600 13px/1 system-ui,sans-serif;box-shadow:0 8px 24px -8px rgba(0,0,0,.4)}}
  .proto-tag span{{padding:0 6px;opacity:.7}}
  .proto-tag button{{font:inherit;border:0;border-radius:999px;padding:8px 12px;cursor:pointer;background:transparent;color:#fff}}
  .proto-tag button[aria-pressed="true"]{{background:#fff;color:#16181b}}
  .proto-tag a{{color:#99e0ff;padding:0 8px}}
</style>
<script>
  // aplica la letra antes de pintar, para que no parpadee
  (function () {{
    var ok = {[k for k, *_ in FONTS]!r}, q = new URLSearchParams(location.search).get('letra'), s = null;
    try {{ s = localStorage.getItem('sqn-proto-letra'); }} catch (e) {{}}
    document.documentElement.setAttribute('data-letra', ok.indexOf(q) >= 0 ? q : (ok.indexOf(s) >= 0 ? s : '{DEFAULT}'));
  }})();
</script>'''


def tag_block(orig):
    btns = ''.join(f'<button type="button" data-letra="{k}">{name}</button>' for k, name, *_ in FONTS)
    return f'''  <div class="proto-tag" role="group" aria-label="Letra del prototipo"><span>Letra</span>{btns}<a href="{orig}">Original ↗</a></div>
  <script>
    (function () {{
      var html = document.documentElement, bs = document.querySelectorAll('.proto-tag [data-letra]');
      function mark() {{ bs.forEach(function (b) {{ b.setAttribute('aria-pressed', String(b.getAttribute('data-letra') === html.getAttribute('data-letra'))); }}); }}
      bs.forEach(function (b) {{ b.addEventListener('click', function () {{
        html.setAttribute('data-letra', b.getAttribute('data-letra'));
        try {{ localStorage.setItem('sqn-proto-letra', b.getAttribute('data-letra')); }} catch (e) {{}}
        mark();
      }}); }});
      mark();
    }})();
  </script>
'''


def build(src, dst):
    s = open(os.path.join(ROOT, src), encoding='utf-8', newline='').read()
    nl = '\r\n' if '\r\n' in s else '\n'
    anchor = '<link href="css/broadsheet.css" rel="stylesheet">'
    i = s.index(anchor) + len(anchor)
    s = s[:i] + nl + head_block().replace('\n', nl) + s[i:]
    s = s.replace('<img src="img/logosq.png" alt="SquareNet">', LOGO)
    # navegar entre los prototipos
    s = s.replace('href="index.html"', 'href="prototipo-index.html"').replace('href="plataforma.html"', 'href="prototipo-plataforma.html"')
    j = s.rindex('</body>')
    s = s[:j] + tag_block(src).replace('\n', nl) + s[j:]
    open(os.path.join(ROOT, dst), 'w', encoding='utf-8', newline='').write(s)
    print('ok', dst)


if __name__ == '__main__':
    for src, dst in PAGES:
        build(src, dst)
