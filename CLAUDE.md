# SquareNet — sitio web

Sitio estático (HTML/CSS/JS vanilla, sin build step) para SquareNet Software, empresa ecuatoriana de software de nómina/RRHH. No hay `package.json`; se sirve directo (`python -m http.server` para probar local).

## Sistema de diseño

Todo el sitio usa `css/broadsheet.css` — un design system "editorial broadsheet":
- Fuente: Source Serif 4 (`--font-heading`, `--font-body`), pesos serios, sin sans-serif genérica.
- Acento principal teal (`--color-accent*`), secundario magenta (`--color-accent-2*`) — usar con moderación.
- Radios de borde **muy sharp** (`--radius-sm:1px`, `--radius-md:2px`, `--radius-lg:4px`) — nunca cards muy redondeadas.
- Tokens de espaciado `--space-1..8`, sombras `--shadow-sm/md/lg`.
- Componentes reutilizables ya existentes: `.tag`/`.tag-accent`, `.card`/`.card-title`/`.card-body`, `.kicker`+`h1` (patrón eyebrow+heading en cada página), `.btn-primary`/`.btn-secondary`, `.wrap` (max-width 1320px), `.hero`, `.modules-grid` (hover lift + gradient overlay), `.feature-carousel`.
- Estilos específicos de cada página viven en un `<style>` inline en el `<head>` de esa página (no se tocan los estilos de otras páginas).

Cada página nueva o rediseñada debe reusar estos tokens/componentes en vez de inventar un sistema paralelo.

## Páginas rediseñadas recientemente (contexto, no reinventar desde cero)

- **`index.html` hero**: título "Más que un software, es una inversión" arriba, cubo metálico (`img/squarenet_logo_enhanced.png`, versión sin fondo que procesé con flood-fill porque el original tenía fondo negro sólido) flotando abajo, siempre en un z-index superior al texto. Efecto "sniper glint" cada 5s enmascarado a la silueta del cubo. Parallax 3D sutil con el mouse vía CSS custom properties (`--tiltX`/`--tiltY`) seteadas en `#heroStage`.
- **`index.html` feature-carousel**: 8 slides (crossfade + zoom Ken Burns al cambiar, texto entra escalonado). Sin auto-advance (el usuario decide: dots, flechas, o swipe táctil en mobile — las flechas se ocultan en mobile porque colisionaban con el texto). Copy real y SEO-friendly (décimos, IESS, SRI, RDEP, etc.) — verificar contra `modulono.html` antes de agregar claims nuevos.
- **`index.html` `.feature-slide-art`**: un sketch SVG de línea blanca por slide (viewBox 240×240, marco de esquinas tipo viewfinder), dentro del `.wrap` como flex item con `justify-content:space-between` — así queda en el hueco entre el texto y la flecha en cualquier ancho (el `padding-right` extra del wrap es lo que evita que choque con la flecha, que está anclada al borde del viewport). Se ocultan a ≤860px.
  - **Sistema de animación**: los trazos con `data-draw` se dibujan solos — el JS mide `getTotalLength()`, setea `--len` y un `--d` escalonado, y recién ahí agrega `art-ready` al carrusel (sin esa clase no corre ninguna animación, así no parpadea antes de medir). `data-pop` = entrada con escala. Todas las animaciones están gateadas en `.is-active` para que solo anime el slide visible. Fallback: si el JS no corre, los sketches se ven estáticos y completos.
  - **Motion por ícono**: huella con haz de escaneo (rect con gradiente recortado por `clipPath` a la silueta), campana que repica, knobs del panel que se deslizan, cursor que viaja entre monitores, barras que crecen desde la base, líneas punteadas que "fluyen" (`stroke-dashoffset` infinito). Acento cian (`--color-accent-300`) + `drop-shadow` en un solo elemento focal por ícono.
  - Parallax suave del SVG con el mouse vía `--artPX`/`--artPY` seteadas en el carrusel (rAF-throttled). Todo respeta `prefers-reduced-motion`.
- **`somos.html`**: reestructurada con intro+ledger (stats animados 2002/24/30+ con `requestAnimationFrame`), misión/visión, grid de 7 tarjetas "por qué SquareNet" con íconos SVG inline, cierre con línea de marca.

## Cómo probar cambios visuales

No hay entorno de test automatizado. Para verificar cambios de UI:
1. Servidor local: `python -m http.server 8891` desde la raíz del repo.
2. Screenshot real vía Chrome headless + CDP (más confiable que el flag `--screenshot` de un solo uso):
   - Lanzar `chrome.exe --headless=new --remote-debugging-port=9444 --user-data-dir=<carpeta temporal propia>` — **siempre pasar `--user-data-dir` propio**, si no se engancha al perfil de Chrome real del usuario.
   - Para mobile real (no solo una ventana angosta): usar `Emulation.setDeviceMetricsOverride` con `mobile:true` vía CDP. Un `--window-size=390,...` sin esto se queda clampeado a un mínimo de ~500px por Chrome y las capturas salen recortadas/engañosas.
   - **No usar `--virtual-time-budget`** para nada que dependa de `requestAnimationFrame` (contadores animados, etc.) — no lo hace avanzar de forma confiable y los valores capturados quedan a medio animar. Usar espera de reloj real en su lugar.
   - Matar los procesos de Chrome/servidor de prueba al terminar (buscar el PID por el puerto con PowerShell `Get-NetTCPConnection`, no asumir que el proceso hijo de bash lo mata solo).

## Skills de diseño instalados

`.claude/skills/` (local, gitignored, no viaja con el repo) tiene 14 skills de diseño instalados a pedido del usuario — ver memoria `reference_design_skills` para el detalle de cada uno (taste-skill de leonxlnx completo + web-design-guidelines de Vercel). Tres de ellos (`brandkit`, `imagegen-frontend-web`, `imagegen-frontend-mobile`) son de solo-generación-de-imagen y no son usables sin herramienta de image-gen.
