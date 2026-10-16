/* ==================== ASSISTENTEN-FIGUR (wählbar) ====================
 *
 * Auftrag des Inhabers vom 16.10.2026: zehn Event-Assistenten-Figuren
 * (`assets/avatare/avatar-01.webp` … `-10`) ersetzen den gezeichneten
 * Roboter. Jede Person wählt sich eine; Vorgabe ist Figur 1.
 *
 * Gespeichert wird die Wahl unter `eb_assistent_figur_v1` (funktional,
 * Cookie-Liste.md) — und nur über ebSpeichern(), also nur mit Einwilligung.
 * Ohne sie gilt die Wahl für diese Sitzung: „keine Speicherung" heißt nicht
 * „keine Funktion". Dieselbe Lehre wie beim Sprachschalter
 * (ai/53-assistent-stimme.js): ein Knopf, der sich drücken lässt und nach
 * dem Neuzeichnen nichts behalten hat, ist die teuerste Schadensart hier.
 *
 * Ein gespeicherter Wert wird GEGEN DIE LISTE geprüft, nie in eine Adresse
 * eingesetzt: ein manipuliertes `localStorage` darf keinen Pfad und kein
 * Markup erzeugen. Nur „01" … „10" kommen durch.
 * ==================================================================== */

var EB_FIGUR_SCHLUESSEL = 'eb_assistent_figur_v1';
var EB_FIGUR_VORGABE = '01';
var EB_FIGUREN = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'];

var _ebFigurWunsch = null;          // null = noch nicht gelesen
var _ebFigurGefragt = false;        // in dieser Sitzung schon gewählt oder „Später"

/** Die gewählte Figur — immer ein Eintrag aus EB_FIGUREN. */
function ebAssistentFigur() {
  if (_ebFigurWunsch === null) {
    var gespeichert = null;
    try { gespeichert = localStorage.getItem(EB_FIGUR_SCHLUESSEL); } catch (e) {}
    _ebFigurWunsch = EB_FIGUREN.indexOf(gespeichert) !== -1 ? gespeichert : null;
    // Eine gültige gespeicherte Wahl heißt: diese Person wurde schon gefragt.
    if (_ebFigurWunsch) _ebFigurGefragt = true;
  }
  return _ebFigurWunsch || EB_FIGUR_VORGABE;
}

/** Adresse einer Figur. Nimmt nur Werte aus der Liste an. */
function ebAssistentFigurUrl(nr) {
  var n = EB_FIGUREN.indexOf(nr) !== -1 ? nr : EB_FIGUR_VORGABE;
  return ebAssetUrl('assets/avatare/avatar-' + n + '.webp');
}

/** Setzt die gewählte Figur in jedes Bild mit [data-assistent-figur]. */
function ebAssistentFigurAnwenden() {
  var url = ebAssistentFigurUrl(ebAssistentFigur());
  document.querySelectorAll('img[data-assistent-figur]').forEach(function(img) {
    if (img.getAttribute('src') !== url) img.setAttribute('src', url);
  });
}

function ebAssistentFigurWaehlen(nr) {
  if (EB_FIGUREN.indexOf(nr) === -1) return false;
  _ebFigurWunsch = nr;
  _ebFigurGefragt = true;
  // ebSpeichern(), nicht localStorage.setItem(): ohne diesen Weg wäre die
  // Einwilligung hier wirkungslos (recht.spec.js).
  ebSpeichern(EB_FIGUR_SCHLUESSEL, nr);
  ebAssistentFigurAnwenden();
  ebAssistentFigurWahlSchliessen(false);
  return true;
}

function _ebFigurRasterZeichnen() {
  var raster = document.getElementById('qaFigurRaster');
  if (!raster) return;
  var aktuell = ebAssistentFigur();
  raster.innerHTML = EB_FIGUREN.map(function(nr, i) {
    var an = nr === aktuell;
    return '<button type="button" class="eb-qa-figur-wahl-knopf' + (an ? ' is-aktiv' : '') + '"' +
      ' data-figur="' + nr + '" aria-pressed="' + (an ? 'true' : 'false') + '"' +
      ' aria-label="Figur ' + (i + 1) + ' wählen" onclick="ebAssistentFigurWaehlen(\'' + nr + '\')">' +
      '<img src="' + _escHtml(ebAssistentFigurUrl(nr)) + '" alt="" width="48" height="72" loading="lazy" decoding="async" />' +
      '</button>';
  }).join('');
}

function ebAssistentFigurWahlOeffnen() {
  var wahl = document.getElementById('qaFigurWahl');
  if (!wahl) return;
  _ebFigurRasterZeichnen();
  wahl.hidden = false;
  var aktiv = wahl.querySelector('button[aria-pressed="true"]');
  if (aktiv) aktiv.focus();
}

/** `spaeter`: die Person hat nicht gewählt — Vorgabe bleibt, nicht erneut fragen. */
function ebAssistentFigurWahlSchliessen(spaeter) {
  var wahl = document.getElementById('qaFigurWahl');
  if (wahl) wahl.hidden = true;
  if (spaeter) {
    _ebFigurGefragt = true;
    // „Später" mit Einwilligung merkt sich die Vorgabe, damit die Frage
    // nicht bei jedem Neuladen wiederkommt.
    if (!_ebFigurWunsch) ebSpeichern(EB_FIGUR_SCHLUESSEL, EB_FIGUR_VORGABE);
  }
  var eingabe = document.getElementById('qaInput');
  if (eingabe && !document.getElementById('qaPanel').hidden) eingabe.focus();
}

/** Von openQaBot() gerufen: beim ersten Öffnen ohne Wahl die Auswahl zeigen. */
function ebAssistentFigurBeimOeffnen() {
  ebAssistentFigur();
  if (!_ebFigurGefragt) ebAssistentFigurWahlOeffnen();
}

ebAssistentFigurAnwenden();
