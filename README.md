# La Vicuña Digital Agency

Sitio estático (HTML/CSS/JS puro, sin frameworks ni build). Español en `/` e inglés en `/en/`, cada versión con su propia URL (hreflang) para que Google indexe las dos.

## Deploy en Netlify

1. En Netlify: **Add new site → Import an existing project** y conectar este repositorio.
2. Branch a deployar: `main`.
3. Build command: *(vacío)* · Publish directory: `.` — ya está configurado en `netlify.toml`.

## /automatizaciones (reportes automatizados + zona admin)

La página `/automatizaciones/` (y `/en/automations/`) muestra un demo de The North Face en Mercado Libre.
Los datos salen de funciones de Netlify (`netlify/functions/`), por eso ahora hay un `package.json`
(solo para `@netlify/blobs`; el sitio sigue sin build).

- `tnf-ml` (GET público) devuelve el último relevamiento. Mientras no haya ninguno, la página usa
  `automatizaciones/datos-ejemplo.json` (datos inventados, se regeneran con `node tools/demo-data.js`).
- `tnf-ml-diario` corre solo cada mañana y releva Mercado Libre (mismo motor que el monitor GA.MA de Frankie Analytics).
- `admin` maneja el login y la zona "Otros links", que solo ve el admin. La clave se valida en el servidor.
- `meli-auth` conecta la cuenta de Mercado Libre (solo admin).

Variables de entorno en Netlify (Site configuration → Environment variables):

| Variable | Para qué |
|---|---|
| `AUTH_USER` | Usuario admin (mismo formato que Frankie Analytics) |
| `AUTH_PASS_HASH` | Hash de la clave: `pbkdf2:<iteraciones>:<salt_hex>:<hash_hex>`. Se genera con `node tools/hash-password.js` |
| `AUTH_SECRET` | Secreto para firmar la sesión (64 caracteres hex; lo genera el mismo script) |
| `MELI_CLIENT_ID`, `MELI_CLIENT_SECRET` | App de developers.mercadolibre.com.ar. Recomendado: una app propia para La Vicuña, con Redirect URI `https://www.lavicuna.com.ar/.netlify/functions/meli-auth` |
| `TNF_ML_*` (opcionales) | Categorías, búsquedas y marca del monitor (ver `netlify/functions/lib/tnf-ml.js`) |

La clave nunca va en el repo ni en el HTML.

## Pendientes para completar el sitio

| Ítem | Dónde va |
|---|---|
| **Verde exacto de Patagon Waters** | El acento verde actual (`#7FAE93` / `#3F6B54` en `css/style.css`) es una aproximación; reemplazar por el hex oficial de la marca si se consigue. |

## Estructura

```
index.html        home (ES/EN)
servicios/*/      landings por servicio (SEO, paid media, social media, desarrollo web)
automatizaciones/ reportes automatizados + demo The North Face en Mercado Libre (en/automations/ en inglés)
netlify/functions/ login admin y monitor de Mercado Libre del demo
casos/*/          casos completos (Sliabh, T-L / HMSA)
en/               versión en inglés: en/index.html se genera desde index.html (usa los data-en),
                  más en/services/* y en/cases/*. Si cambiás textos de la home, actualizá también en/index.html.
css/style.css     estilos — tinta #0A0801 / hueso #D9D7D4 / verde #7FAE93 · temas dark/light
js/main.js        idioma, tema, reveals, grano, humo, previews, cookies, efectos de mouse
assets/img/       logo.png (original), logo-120.webp / logo-mark.webp (versiones livianas), icon-*.png y logos de clientes
llms.txt          resumen de la agencia para buscadores con IA (ChatGPT, Claude, Perplexity)
assets/video/     hero-fog.mp4 (video del hero)
```
