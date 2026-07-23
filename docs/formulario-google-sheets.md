# Formulario de contacto → Google Sheets

El formulario de la sección **Contacto** guarda cada lead directo en una planilla
de Google Sheets usando **Google Apps Script** (gratis, sin backend propio).

Seguí estos pasos **una sola vez** para activarlo.

---

## 1. Crear la planilla

1. Entrá a [sheets.google.com](https://sheets.google.com) con tu cuenta de Google.
2. Creá una planilla nueva. Nombrala, por ejemplo, **"Leads La Vicuña"**.
   (No hace falta crear columnas: el script arma los encabezados solo).

## 2. Pegar el script

1. En esa planilla, andá al menú **Extensiones → Apps Script**.
2. Borrá el código de ejemplo que aparece.
3. Copiá y pegá todo el contenido de [`apps-script/Codigo.gs`](apps-script/Codigo.gs).
4. (Opcional) Si querés recibir un mail por cada lead, poné tu correo en la línea:
   ```js
   var NOTIFY_EMAIL = 'tucorreo@gmail.com';
   ```
5. Guardá con el ícono de disquete (o `Ctrl/Cmd + S`).

## 3. Publicar como aplicación web

1. Arriba a la derecha, tocá **Implementar → Nueva implementación**.
2. En el engranaje ⚙ elegí **Aplicación web**.
3. Configurá:
   - **Descripción:** `Formulario La Vicuña`
   - **Ejecutar como:** *Yo* (tu cuenta)
   - **Quién tiene acceso:** **Cualquier usuario** (o "Cualquier persona")
4. Tocá **Implementar**. Google te va a pedir **autorizar permisos**: aceptá
   (es tu propio script escribiendo en tu propia planilla).
5. Copiá la **URL de la aplicación web**. Es larga y termina en `/exec`, algo así:
   ```
   https://script.google.com/macros/s/AKfycb....../exec
   ```

## 4. Conectar el sitio

1. Abrí `index.html`.
2. Buscá el formulario (`id="lead-form"`) y reemplazá el valor de `data-endpoint`:
   ```html
   <form class="lead-form" id="lead-form" data-endpoint="PEGÁ_ACÁ_TU_URL_/exec" novalidate>
   ```
3. Guardá, hacé commit y push. ¡Listo!

A partir de ahí, cada mensaje enviado desde el sitio aparece como una fila nueva
en tu planilla (Fecha, Nombre, Email, Teléfono, Mensaje, Página).

---

## Notas

- **Seguridad:** la CSP del sitio (`netlify.toml`) ya está configurada para permitir
  el envío a `script.google.com`. No toques eso.
- **Anti-spam:** el formulario tiene un campo trampa (*honeypot*) invisible; si un bot
  lo completa, el envío se descarta automáticamente.
- **Si cambiás el código del script**, tenés que volver a **Implementar → Gestionar
  implementaciones → Editar → Nueva versión** para que los cambios tomen efecto
  (la URL `/exec` se mantiene).
- **Probar el endpoint:** si abrís la URL `/exec` en el navegador, deberías ver
  `{"ok":true,"msg":"La Vicuña lead endpoint activo"}`.
