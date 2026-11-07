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

/* ── Blickfolge: die Figur dreht den Kopf zum Zeiger ─────────────────────
 * Wunsch des Inhabers vom 30.10.2026: der Assistent schaut dorthin, wo die
 * Maus ist — und beim Tippen dorthin, wo der Finger war.
 *
 * Gerechnet wird nichts in 3D. scripts/avatar-blick.py (Blender) wölbt jede
 * Figur zu einer Büste und rendert sie aus 7 × 3 Blickrichtungen in ein
 * Raster (avatar-NN-blick.webp). Hier wird nur das passende Feld gezeigt:
 * kein WebGL, kein Dauerlauf, Arbeit nur bei einem Zeiger-Ereignis und
 * höchstens einmal je Frame.
 *
 * Das Raster (90–140 KB) lädt erst bei der ersten Bewegung — wer nie die
 * Maus bewegt (Leser am Telefon), zahlt nichts dafür. Bis es da ist, bleibt
 * das ruhende Bild stehen. Jeder Zustand ohne Raster sieht also aus wie
 * vorher, nicht wie ein Fehler.
 *
 * Zurück auf das ruhende Bild bei: Verlassen des Fensters, Blur, verstecktem
 * Tab, Bewegungsreduktion, ausgeblendetem Knopf. Bewegungsreduktion heißt
 * hier: gar keine Kopfbewegung, nicht bloß eine kürzere.
 */
var EB_BLICK_SPALTEN = 7;
var EB_BLICK_ZEILEN = 3;
var EB_BLICK_REICHWEITE = 420;      // px Abstand, ab dem der Kopf ganz gedreht ist
var EB_BLICK_TIPP_MS = 1400;        // so lange schaut er zum Finger, dann wieder nach vorn

function ebAssistentBlickUrl(nr) {
  var n = EB_FIGUREN.indexOf(nr) !== -1 ? nr : EB_FIGUR_VORGABE;
  return ebAssetUrl('assets/avatare/avatar-' + n + '-blick.webp');
}

/** Feld im Raster für eine Zeigerposition relativ zur Knopfmitte. */
function ebAssistentBlickFeld(dx, dy) {
  var nx = Math.max(-1, Math.min(1, dx / EB_BLICK_REICHWEITE));
  var ny = Math.max(-1, Math.min(1, dy / EB_BLICK_REICHWEITE));
  return {
    spalte: Math.round((nx + 1) / 2 * (EB_BLICK_SPALTEN - 1)),
    zeile: Math.round((ny + 1) / 2 * (EB_BLICK_ZEILEN - 1))
  };
}

(function() {
  var frame = 0, x = 0, y = 0, tippZeit = 0;
  var geladen = {};                  // Adresse → true, sobald das Raster dekodiert ist
  var ladend = {};

  function ebene() {
    var knopf = document.getElementById('qaLauncher');
    var huelle = knopf && knopf.querySelector('.eb-qa-launcher-icon');
    if (!huelle) return null;
    var el = huelle.querySelector('.eb-qa-blick');
    if (!el) {
      el = document.createElement('span');
      el.className = 'eb-qa-blick';
      el.setAttribute('aria-hidden', 'true');
      huelle.appendChild(el);
    }
    return el;
  }

  function reset() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    tippZeit = 0;
    var knopf = document.getElementById('qaLauncher');
    if (knopf) knopf.classList.remove('is-blick');
  }

  function laden(url) {
    if (geladen[url] || ladend[url]) return;
    ladend[url] = true;
    var probe = new Image();
    probe.onload = function() { geladen[url] = true; ladend[url] = false; if (!frame) frame = requestAnimationFrame(zeichnen); };
    // Fehlt das Raster, bleibt es beim ruhenden Bild — kein zweiter Versuch je Sitzung.
    probe.onerror = function() { ladend[url] = 'fehler'; };
    probe.src = url;
  }

  function zeichnen() {
    frame = 0;
    var knopf = document.getElementById('qaLauncher');
    var bot = document.getElementById('qaBot');
    if (document.hidden || ebBewegungReduziert() || !knopf ||
        (bot && bot.classList.contains('is-weg'))) { reset(); return; }
    var url = ebAssistentBlickUrl(ebAssistentFigur());
    // Neue Figur, Raster noch nicht da: lieber das ruhende Bild als den Kopf der alten Figur.
    if (!geladen[url]) { knopf.classList.remove('is-blick'); laden(url); return; }
    var el = ebene();
    if (!el) return;
    var rect = knopf.getBoundingClientRect();
    var feld = ebAssistentBlickFeld(x - rect.left - rect.width / 2, y - rect.top - rect.height / 2);
    var w = el.offsetWidth || rect.width;
    // Das Feld ist 2:3; wie das ruhende Bild (object-fit: cover, oben) füllt es die Breite.
    var bild = 'url("' + url + '")';
    if (el.dataset.url !== url) { el.style.backgroundImage = bild; el.dataset.url = url; }
    el.style.backgroundSize = (w * EB_BLICK_SPALTEN) + 'px auto';
    el.style.backgroundPosition = (-feld.spalte * w) + 'px ' + (-feld.zeile * w * 1.5) + 'px';
    el.dataset.feld = feld.spalte + ',' + feld.zeile;
    knopf.classList.add('is-blick');
  }

  function zeiger(event) {
    if (!event.isTrusted) return;
    if (document.hidden || ebBewegungReduziert()) { reset(); return; }
    x = event.clientX;
    y = event.clientY;
    if (!frame) frame = requestAnimationFrame(zeichnen);
  }

  document.addEventListener('pointermove', function(event) {
    if (event.pointerType === 'mouse') zeiger(event);
  }, { passive: true });
  // Finger: kein Dauer-Verfolgen beim Scrollen — ein Tippen genügt, dann wieder nach vorn.
  document.addEventListener('pointerdown', function(event) {
    if (event.pointerType === 'mouse') return;
    zeiger(event);
    var meine = tippZeit = Date.now();
    setTimeout(function() { if (tippZeit === meine) reset(); }, EB_BLICK_TIPP_MS);
  }, { passive: true });
  // Nur die Maus „verlässt" das Fenster. Ein Finger erzeugt beim Abheben ebenfalls
  // pointerleave — das würde den Blick sofort wieder zurückdrehen.
  document.documentElement.addEventListener('pointerleave', function(event) {
    if (event.pointerType === 'mouse') reset();
  }, { passive: true });
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', reset);
  ebBewegungBeobachten(reset);
})();

ebAssistentFigurAnwenden();
