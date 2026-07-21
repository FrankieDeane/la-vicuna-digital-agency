# La Vicuña Digital Agency

Sitio estático (HTML/CSS/JS puro, sin frameworks ni build). Español por defecto con selector ES/EN.

## Deploy en Netlify

1. En Netlify: **Add new site → Import an existing project** y conectar este repositorio.
2. Branch a deployar: `main`.
3. Build command: *(vacío)* · Publish directory: `.` — ya está configurado en `netlify.toml`.

## Pendientes para completar el sitio

| Ítem | Dónde va |
|---|---|
| **Video del hero** (niebla en montañas, Pexels) | Descargar de https://www.pexels.com/search/videos/fog%20mountains/ (tamaño HD, ~10–20 MB máx.) y guardarlo como `assets/video/hero-fog.mp4`. Si el archivo no está, el sitio muestra la atmósfera de humo animada como fallback. |
| **Logo real** (escudo grabado) | Reemplazar el emblema SVG provisional `assets/img/logo-bone.svg` (y `assets/img/favicon.svg`) por el escudo real, manteniendo los mismos nombres de archivo. |
| **LinkedIn / Instagram** | En `index.html`, buscar `data-todo="linkedin"` y `data-todo="instagram"` y poner las URLs reales (mientras estén en `#`, los botones se ocultan solos). |
| **Logos de clientes** | Subir `assets/img/t-l-irrigation.png` y `assets/img/patagon-ink.png`. Mientras falten, se ocultan automáticamente. |

## Estructura

```
index.html        página única (ES/EN)
css/style.css     estilos — paleta tinta #0A0801 / hueso #D9D7D4
js/main.js        idioma, reveals, grano, humo del hero
assets/img/       logo-bone.svg y favicon.svg (emblema provisional)
assets/video/     hero-fog.mp4 (video del hero — pendiente, ver arriba)
```
