# La Vicuña Digital Agency

Sitio estático (HTML/CSS/JS puro, sin frameworks ni build). Español por defecto con selector ES/EN.

## Deploy en Netlify

1. En Netlify: **Add new site → Import an existing project** y conectar este repositorio.
2. Branch a deployar: `claude/lavicuna-website-redesign-om8prr` (o `main` cuando se mergee).
3. Build command: *(vacío)* · Publish directory: `.` — ya está configurado en `netlify.toml`.

## Pendientes para completar el sitio

| Ítem | Dónde va |
|---|---|
| **Video del hero** (niebla en montañas, Pexels) | Descargar de https://www.pexels.com/search/videos/fog%20mountains/ (tamaño HD, ~10–20 MB máx.) y guardarlo como `assets/video/hero-fog.mp4`. Si el archivo no está, el sitio muestra la atmósfera de humo animada como fallback. |
| **Logo real** (escudo grabado) | Reemplazar el emblema SVG provisional. Guardar como `assets/img/logo.png` (o `.svg`) y actualizar `index.html` (header y marca de agua de Nosotros). |
| **LinkedIn / Instagram** | En `index.html`, buscar `data-todo="linkedin"` y `data-todo="instagram"` y poner las URLs reales. |

## Estructura

```
index.html        página única (ES/EN)
css/style.css     estilos — paleta tinta #0A0801 / hueso #D9D7D4
js/main.js        idioma, reveals, grano, humo del hero
assets/img/       logo real (original, versión marfil y favicon)
assets/video/     hero-fog.mp4 (video del hero)
```
