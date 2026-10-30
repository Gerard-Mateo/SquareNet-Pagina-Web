# Inserta una animación pegada por el cliente (HTML completo con <style>, un div raíz .XX2 y <script>)
# en la fila .mod-fn de una página de módulo.
# Uso: python anim.py <pagina.html> <id-fila> <archivo-pegado.html> <archivo-historia.html | ->
import re, sys
page, row, src, storyf = sys.argv[1:5]
marks = sys.argv[5].split('||') if len(sys.argv) > 5 else []
raw = open(src, encoding='utf-8').read()
css = re.search(r'<style>(.*?)</style>', raw, re.S).group(1)
body = re.search(r'<body[^>]*>(.*?)<script>', raw, re.S).group(1).strip()
js = re.search(r'<script>(.*?)</script>', raw, re.S).group(1)
root = re.search(r'class="(\w+)" id="(\w+)"', body)
C, ID = root.group(1), root.group(2)

# clases genéricas que chocan con broadsheet.css -> con prefijo
for old in ['logo', 'home', 'tag', 'btn', 'grid', 'row', 'sec', 'card', 'hr', 'go', 'x', 'pv', 'st', 'seg', 'tabs', 'chip', 'badge', 'pill', 'wrap', 'hero', 'note']:
    css = re.sub(r'\.%s(?![\w-])' % old, '.x' + old, css)
    body = re.sub(r'(class="(?:[^"]* )?)%s(?=[ "])' % old, r'\1x' + old, body)
    js = js.replace("'.%s'" % old, "'.x%s'" % old)
    js = re.sub(r'(class="(?:[^"]* )?)%s(?=[ "])' % old, r'x' + old, js)
# raíz: sin márgenes propios, sin chip
css = re.sub(r'\.%s\{position:relative;max-width:\d+px;margin:0 auto;padding:[^;]+;' % C, '.%s{position:relative;flex:0 0 auto;' % C, css)
css = re.sub(r'\.%s \.show-chip[^\n]*\n' % C, '', css)
body = re.sub(r'\s*<span class="show-chip">.*?</span>\s*(?=</div>\s*$)', '\n', body, flags=re.S)
# marco del iPhone igual al de las otras animaciones
css = re.sub(r'(\.%s \.iph\{[^}]*?)margin:0 auto;' % C, r'\1', css)
css = re.sub(r'background:linear-gradient\(145deg,#3a3b3f,#1c1d20 40%,#2b2c30\);box-shadow:inset 0 0 0 1.5px #55565b,0 26px 50px -22px rgba\(20,20,30,.55\)',
             'background:#0b0b0d;box-shadow:0 0 0 2px #9a9ca1,0 0 0 4px #5d6066,0 0 0 5px #2a2b2e,0 30px 60px -20px rgba(0,0,0,.55)', css)
css = css.replace('width:3px;border-radius:2px;background:#2a2b2f}', 'width:4px;border-radius:2px;background:linear-gradient(90deg,#6c6f75,#a9abb0)}')
css = re.sub(r'\{left:-3px;', '{left:-8px;', css); css = re.sub(r'\{right:-3px;', '{right:-8px;', css)
css = css.replace('box-shadow:0 70px 0 #2a2b2f', 'box-shadow:0 70px 0 #8a8d92')
# sin hora en la barra de estado
body = re.sub(r'(<div class="sbar"[^>]*>\s*<span[^>]*>)\s*\d{1,2}:\d{2}', r'\1', body)
body = re.sub(r'<span>\d{1,2}:\d{2}</span>', '<span></span>', body)
body = re.sub(r'\s*SquareNet 1\.5\.0\.1', ' SquareNet', body)
css += '@media (max-width:400px){.%s .iph{transform:scale(.86);transform-origin:top center;margin-bottom:-102px}}\n' % C
# JS: pausa fuera de pantalla, coordenadas con escala, pasos de la historia
js = js.replace('const sleep=ms=>new Promise(r=>setTimeout(r,ms));',
  "let live=false;\n  const wait=()=>(live&&!document.hidden)?null:new Promise(r=>{const t=setInterval(()=>{if(live&&!document.hidden){clearInterval(t);r()}},250)});\n"
  "  const sleep=ms=>new Promise(r=>setTimeout(r,ms)).then(wait);\n"
  "  if('IntersectionObserver' in window)new IntersectionObserver(e=>{live=e[0].isIntersecting}).observe(root);else live=true;\n"
  "  const K=()=>scr.getBoundingClientRect().width/scr.offsetWidth||1;\n"
  "  const story=[...document.querySelectorAll('#%sStory li')];const step=n=>story.forEach((li,i)=>li.classList.toggle('is-on',i===n));" % ID)
js = js.replace('return [a.left-s.left+a.width*fx, a.top-s.top+a.height*fy];', 'const q=K(); return [(a.left-s.left+a.width*fx)/q, (a.top-s.top+a.height*fy)/q];')
for n, m in enumerate(marks):
    assert m in js, m
    js = js.replace(m, 'step(%d); ' % n + m, 1)
js = re.sub(r'for\(;;\)\s*await run\(\);?', "for(;;){ await run(); scr.classList.add('sn-fade'); await sleep(900); setTimeout(()=>scr.classList.remove('sn-fade'),150); }", js)
js = js.replace("if(matchMedia('(prefers-reduced-motion: reduce)').matches){", "if(matchMedia('(prefers-reduced-motion: reduce)').matches){ story.forEach(li=>li.classList.add('is-on'));", 1)

s = open(page, encoding='utf-8', newline='').read()
N = lambda t: t.replace('\r\n', '\n').replace('\n', '\r\n')
i = s.index('</style>'); s = s[:i] + N('/* Animación .%s */\n' % C + css.strip() + '\n') + s[i:]
ph = re.search(r'          <div class="mod-fn-media" data-fn="%s"><div class="mod-fn-ph".*?</span></div></div>\r\n' % re.escape(row), s, re.S).group(0)
s = s.replace(ph, N('          <div class="mod-fn-media rp-stage" data-fn="%s">\n' % row + '\n'.join('          ' + l for l in body.split('\n')) + '\n          </div>\n'))
if storyf != '-':
    st = open(storyf, encoding='utf-8').read().strip()
    cp = re.search(r'(<article class="mod-fn" id="%s">\r\n          <div class="mod-fn-copy">.*?</p>)(</div>)' % re.escape(row), s)
    s = s[:cp.start()] + cp.group(1) + N('\n            <ol class="rp-story" id="%sStory">\n' % ID + st + '\n            </ol>\n          ') + cp.group(2) + s[cp.end():]
i = s.index('  <script src="js/fecha.js"></script>'); s = s[:i] + N('  <script>' + js + '</script>\n') + s[i:]
open(page, 'w', encoding='utf-8', newline='').write(s)
print(C, ID)
