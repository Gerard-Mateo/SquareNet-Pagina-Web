# Inserta una pantalla fija (HTML completo que pasa el cliente) en la fila .mod-fn de una página de módulo,
# tal cual viene: solo acota sus estilos, prefija los ids, envuelve su script y la escala a la columna.
# Uso: python tools/snap.py <pagina.html> <id-fila> <pegado.html> <prefijo>      (ej.: moduloca.html registros-de-asistencia pegado.html rg3)
import re, sys
page, row, src, P = sys.argv[1:5]
raw = open(src, encoding='utf-8').read()
styles = re.findall(r'<style>(.*?)</style>', raw, re.S)
body = re.search(r'<body[^>]*>(.*?)<script>', raw, re.S).group(1).strip()
js = re.search(r'<script>(.*?)</script>', raw, re.S).group(1)
W = int(re.search(r'\.stage\{[^}]*width:(\d+)px', ''.join(styles)).group(1))   # ancho de dibujo

def scope(css):
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    out = []
    for sel, dec in re.findall(r'([^{}]+)\{([^{}]*)\}', css):
        parts = []
        for x in sel.split(','):
            x = x.strip()
            parts.append('.%s *' % P if x == '*' else '.%s' % P if x == 'body' else '.%s %s' % (P, x))
        if sel.strip() == 'body':
            dec = re.sub(r'background:[^;]+;?', '', dec)          # el fondo de la página no es del componente
        out.append(','.join(parts) + '{' + dec.strip() + '}')
    return '\n'.join(out)
css = '\n'.join(scope(s) for s in styles)

for i in re.findall(r'id="(\w+)"', body):                              # ids con prefijo
    new = P + i
    body = body.replace('id="%s"' % i, 'id="%s"' % new)
    css = re.sub(r'#%s(?![\w-])' % i, '#' + new, css)
    js = js.replace("getElementById('%s')" % i, "getElementById('%s')" % new)
    js = re.sub(r"(['\"`])#%s(?![\w-])" % i, r"\1#" + new, js)

fit = '''
  var root=document.getElementById('%(P)s'),stage=root.firstElementChild,media=root.parentElement;
  function fit(){var k=Math.min(1,(media.clientWidth-40)/%(W)d);root.style.transformOrigin='top left';root.style.transform='scale('+k+')';root.style.marginBottom=(-(1-k)*stage.offsetHeight)+'px';root.style.marginRight=(-(1-k)*%(W)d)+'px';}
  fit(); if('ResizeObserver' in window) new ResizeObserver(fit).observe(media);
''' % {'P': P, 'W': W}
script = '  <script>\n(function(){\n' + js.strip() + '\n' + fit + '})();\n  </script>\n'
html = ('          <div class="mod-fn-media rp-stage" data-fn="%s">\n          <div class="%s" id="%s" style="width:%dpx">\n' % (row, P, P, W)
        + body + '\n          </div>\n          </div>\n')

s = open(page, encoding='utf-8', newline='').read().replace('\r\n', '\n')
m = re.search(r'          <div class="mod-fn-media[^"]*" data-fn="%s">.*?(?=\n        </article>)' % re.escape(row), s, re.S)
s = s[:m.start()] + html.rstrip('\n') + s[m.end():]
blk = '/* %s: pantalla del cliente, acotada a .%s */\n' % (row, P) + css + '\n'
if '</style>' in s:
    i = s.index('</style>'); s = s[:i] + blk + s[i:]
else:                                    # página sin <style> propio: se crea uno en el <head>
    i = s.index('</head>'); s = s[:i] + '<style>\n' + blk + '</style>\n' + s[i:]
j = s.index('  <script src="js/fecha.js"></script>'); s = s[:j] + script + s[j:]
open(page, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n'))
print('ok', P, W)
