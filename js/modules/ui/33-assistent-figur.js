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

/* ── N02: aus dem Weg beim Lesen ─────────────────────────────────────────
 * Entscheidung des Inhabers vom 17.10.2026: beim Herunterscrollen blendet
 * sich der Knopf aus, beim Hochscrollen wieder ein. Er lag sonst über dem
 * Inhalt, den man gerade liest (live an einer Auftragskarte gemessen).
 *
 * Drei Ausnahmen, alle aus Sicht der Person:
 *   - ganz oben (unter EB_FIGUR_OBEN px) ist er immer da;
 *   - ist das Panel offen, bleibt er — er ist dann der Weg zurück;
 *   - hat er den Tastaturfokus, bleibt er — Fokus auf etwas Unsichtbarem
 *     wäre eine Falle.
 * Kleine Bewegungen (unter EB_FIGUR_SCHWELLE px) zählen nicht, sonst
 * flackert er beim Lesen mit dem Daumen.
 *
 * Kein Dauerlauf: gerechnet wird nur bei einem Scroll-Ereignis, höchstens
 * einmal je Frame (rAF), und der Horcher ist passiv. Die Leerlauf-Regel aus
 * leerlauf.spec.js bleibt damit unberührt.
 * Bewegungsreduktion ändert nur das Gleiten (CSS), nicht die Funktion.
 */
var EB_FIGUR_OBEN = 120;
var EB_FIGUR_SCHWELLE = 8;
var _ebFigurLetzteY = 0;
var _ebFigurFrame = 0;

function _ebFigurScrollPruefen() {
  _ebFigurFrame = 0;
  var bot = document.getElementById('qaBot');
  if (!bot) return;
  var y = window.scrollY || document.documentElement.scrollTop || 0;
  var delta = y - _ebFigurLetzteY;
  var panel = document.getElementById('qaPanel');
  var knopf = document.getElementById('qaLauncher');
  var bleibt = y < EB_FIGUR_OBEN ||
    (panel && !panel.hidden) ||
    (knopf && document.activeElement === knopf);
  if (bleibt) {
    bot.classList.remove('is-weg');
    _ebFigurLetzteY = y;
    return;
  }
  if (Math.abs(delta) < EB_FIGUR_SCHWELLE) return;
  bot.classList.toggle('is-weg', delta > 0);
  _ebFigurLetzteY = y;
}

window.addEventListener('scroll', function() {
  if (!_ebFigurFrame) _ebFigurFrame = requestAnimationFrame(_ebFigurScrollPruefen);
}, { passive: true });

/* Dezenter Mausblick: nur das Bild bewegen, niemals den Scroll-Launcher.
 * Ein Frame bündelt Ereignisse; ohne neue Bewegung gibt es keine Arbeit.
 */
(function() {
  var maus = window.matchMedia('(hover: hover) and (pointer: fine)');
  var grob = window.matchMedia('(pointer: coarse)');
  var frame = 0;
  var x = 0;
  var y = 0;
  var bild = null;
  var vorher = '';

  function reset() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if (bild) bild.style.transform = vorher;
    bild = null;
  }

  function zeichnen() {
    frame = 0;
    var knopf = document.getElementById('qaLauncher');
    var bot = document.getElementById('qaBot');
    if (document.hidden || ebBewegungReduziert() || !maus.matches || grob.matches ||
        !knopf || (bot && bot.classList.contains('is-weg'))) {
      reset();
      return;
    }
    var img = knopf.querySelector('img[data-assistent-figur]');
    if (!img) { reset(); return; }
    if (bild !== img) {
      reset();
      bild = img;
      vorher = img.style.transform;
    }
    var rect = knopf.getBoundingClientRect();
    var dx = Math.max(-1, Math.min(1, (x - rect.left - rect.width / 2) / 360));
    var dy = Math.max(-1, Math.min(1, (y - rect.top - rect.height / 2) / 360));
    bild.style.transform = 'translate(' + (dx * 1.5).toFixed(2) + 'px, ' +
      (dy * 1.5).toFixed(2) + 'px) rotate3d(' + (-dy).toFixed(3) + ', ' +
      dx.toFixed(3) + ', 0, ' + (Math.max(Math.abs(dx), Math.abs(dy)) * 3).toFixed(2) + 'deg)';
  }

  document.addEventListener('pointermove', function(event) {
    if (!event.isTrusted || event.pointerType !== 'mouse') return;
    if (document.hidden || ebBewegungReduziert() || !maus.matches || grob.matches) {
      reset();
      return;
    }
    x = event.clientX;
    y = event.clientY;
    if (!frame) frame = requestAnimationFrame(zeichnen);
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', reset, { passive: true });
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', reset);
  ebBewegungBeobachten(reset);
  maus.addEventListener('change', reset);
  grob.addEventListener('change', reset);
})();

ebAssistentFigurAnwenden();
