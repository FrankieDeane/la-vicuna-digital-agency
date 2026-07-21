# La Vicuña Digital Agency

Sitio estático (HTML/CSS/JS puro, sin frameworks ni build). Español por defecto con selector ES/EN.

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
index.html        página única (ES/EN)
css/style.css     estilos — tinta #0A0801 / hueso #D9D7D4 / verde #7FAE93 · temas dark/light
js/main.js        idioma, tema, reveals, grano, humo, previews, cookies, efectos de mouse
assets/img/       logo.png, favicon.png y logos de clientes
assets/video/     hero-fog.mp4 (video del hero)
```
