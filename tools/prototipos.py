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
          '&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,500;1,9..40,600&display=swap')

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
{rules}
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
    # navegar entre los prototipos
    s = s.replace('href="index.html"', 'href="prototipo-index.html"').replace('href="plataforma.html"', 'href="prototipo-plataforma.html"')
    j = s.rindex('</body>')
    s = s[:j] + tag_block(src).replace('\n', nl) + s[j:]
    open(os.path.join(ROOT, dst), 'w', encoding='utf-8', newline='').write(s)
    print('ok', dst)


if __name__ == '__main__':
    for src, dst in PAGES:
        build(src, dst)
