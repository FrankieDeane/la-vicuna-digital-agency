/**
 * La Vicuña Digital Agency — Recepción de leads del formulario web.
 *
 * Este script recibe los envíos del formulario de contacto del sitio y agrega
 * una fila en la planilla de Google Sheets. Opcionalmente te avisa por mail.
 *
 * Cómo usarlo: ver docs/formulario-google-sheets.md
 */

// Nombre de la pestaña donde se guardan los leads (se crea sola si no existe).
var SHEET_NAME = 'Leads';

// (Opcional) Poné tu mail entre las comillas para recibir un aviso por cada lead.
// Dejalo vacío ('') si no querés notificaciones por correo.
var NOTIFY_EMAIL = '';

function doPost(e) {
  try {
    var lock = LockService.getScriptLock();
    lock.waitLock(20000); // evita que dos envíos simultáneos pisen la misma fila

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

    // Encabezados la primera vez.
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Fecha', 'Nombre', 'Email', 'Teléfono', 'Mensaje', 'Página']);
    }

    var p = (e && e.parameter) || {};

    // Honeypot anti-spam: si viene completo, es un bot -> descartamos sin guardar.
    if (p._gotcha) {
      lock.releaseLock();
      return json({ ok: true });
    }

    sheet.appendRow([
      new Date(),
      p.nombre || '',
      p.email || '',
      p.telefono || '',
      p.mensaje || '',
      p._page || ''
    ]);

    if (NOTIFY_EMAIL) {
      MailApp.sendEmail({
        to: NOTIFY_EMAIL,
        subject: 'Nuevo lead — ' + (p.nombre || 'sin nombre'),
        body: 'Nombre: ' + (p.nombre || '') +
              '\nEmail: ' + (p.email || '') +
              '\nTeléfono: ' + (p.telefono || '') +
              '\nPágina: ' + (p._page || '') +
              '\n\nMensaje:\n' + (p.mensaje || '')
      });
    }

    lock.releaseLock();
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

// Permite verificar en el navegador que el endpoint está activo.
function doGet() {
  return json({ ok: true, msg: 'La Vicuña lead endpoint activo' });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
