# La Vicuña Digital Agency

Sitio estático (HTML/CSS/JS puro, sin frameworks ni build). Español en `/` e inglés en `/en/`, cada versión con su propia URL (hreflang) para que Google indexe las dos.

## Deploy en Netlify

1. En Netlify: **Add new site → Import an existing project** y conectar este repositorio.
2. Branch a deployar: `main`.
3. Build command: *(vacío)* · Publish directory: `.` — ya está configurado en `netlify.toml`.

## Pendientes para completar el sitio

| Ítem | Dónde va |
|---|---|
| **LinkedIn** | En `index.html`, buscar `data-todo="linkedin"` y poner la URL real (mientras esté en `#`, el botón se oculta solo). |
| **Verde exacto de Patagon Waters** | El acento verde actual (`#7FAE93` / `#3F6B54` en `css/style.css`) es una aproximación; reemplazar por el hex oficial de la marca si se consigue. |

## Estructura

```
index.html        home (ES/EN)
servicios/*/      landings por servicio (SEO, paid media, social media, desarrollo web)
casos/*/          casos completos (Sliabh, T-L / HMSA)
en/               versión en inglés: en/index.html se genera desde index.html (usa los data-en),
                  más en/services/* y en/cases/*. Si cambiás textos de la home, actualizá también en/index.html.
css/style.css     estilos — tinta #0A0801 / hueso #D9D7D4 / verde #7FAE93 · temas dark/light
js/main.js        idioma, tema, reveals, grano, humo, previews, cookies, efectos de mouse
assets/img/       logo.png (original), logo-120.webp / logo-mark.webp (versiones livianas), icon-*.png y logos de clientes
llms.txt          resumen de la agencia para buscadores con IA (ChatGPT, Claude, Perplexity)
assets/video/     hero-fog.mp4 (video del hero)
```
