/* ══════════════════════════════════════════════════════════════════
   EVENT-RADAR  ·  „Was ist in meiner Nähe?"

   Die Teile dafür gab es längst, nur unverbunden: haversineKm rechnete
   Entfernungen, die Karte setzte Marker auf Stadtkoordinaten, und die
   Standortfreigabe sortierte den Feed. Was fehlte, war der Radius —
   „alles im Umkreis von X km", statt „alles in derselben Stadt".

   Der Unterschied ist nicht kosmetisch. Wer in Potsdam wohnt, bekam
   bisher nichts aus Berlin, obwohl es 25 Minuten sind; wer in München
   sucht, bekam Starnberg nicht, obwohl es näher liegt als der andere
   Stadtrand.

   ── Standort bleibt im Browser ────────────────────────────────────
   Die Position wird NIE an den Server geschickt. Jede Entfernung wird
   hier gerechnet, aus Daten, die ohnehin im Browser liegen. Das ist
   dieselbe Regel, die auch für Suchbegriffe gilt, und sie ist der
   Grund, warum das Radar ohne eine einzige neue Server-Route auskommt.

   Für die Speicherung wird die Position auf zwei Nachkommastellen
   gerundet (~1,1 km). Ein geteiltes Gerät soll nicht die Hausnummer
   des letzten Nutzers verraten; für „was ist in 25 km" reicht das
   allemal. Die genaue Position lebt nur in dieser Sitzung.

   Kein IP-Standortdienst: der müsste die Adresse des Nutzers an einen
   Dritten geben, um eine Stadt zurückzubekommen. Wer keinen Standort
   freigeben will, wählt seine Stadt — das ist ehrlicher und genauer.
   ══════════════════════════════════════════════════════════════════ */

/** Radien in km. Bewusst grob: 7,5 km wäre eine Genauigkeit, die die
    Daten (Stadtkoordinaten) gar nicht hergeben. */
var RADAR_RADIEN = [10, 25, 50, 100, 250];
var RADAR_STANDARD = 50;

/** DACH — der Nutzerwunsch ist die ganze Region, nicht nur Deutschland. */
var RADAR_ORTE = {
  'Berlin':      [52.5200, 13.4050], 'Hamburg':     [53.5511,  9.9937],
  'München':     [48.1351, 11.5820], 'Frankfurt':   [50.1109,  8.6821],
  'Düsseldorf':  [51.2277,  6.7735], 'Starnberg':   [47.9983, 11.3408],
  'Köln':        [50.9375,  6.9603], 'Stuttgart':   [48.7758,  9.1829],
  'Leipzig':     [51.3397, 12.3731], 'Dresden':     [51.0504, 13.7373],
  'Hannover':    [52.3759,  9.7320], 'Nürnberg':    [49.4521, 11.0767],
  'Bremen':      [53.0793,  8.8017], 'Essen':       [51.4556,  7.0116],
  'Dortmund':    [51.5136,  7.4653], 'Potsdam':     [52.3906, 13.0645],
  'Wien':        [48.2082, 16.3738], 'Graz':        [47.0707, 15.4395],
  'Linz':        [48.3069, 14.2858], 'Salzburg':    [47.8095, 13.0550],
  'Innsbruck':   [47.2692, 11.4041],
  'Zürich':      [47.3769,  8.5417], 'Genf':        [46.2044,  6.1432],
  'Basel':       [47.5596,  7.5886], 'Bern':        [46.9480,  7.4474],
};

/** Nur in dieser Sitzung — bewusst nicht in localStorage. */
var _radarPos = null;
var _radarRadius = RADAR_STANDARD;
var _radarQuelle = null;   // 'geo' | 'stadt' | null

var RADAR_SPEICHER = 'eb_radar_ort';

/**
 * Position grob speichern.
 *
 * Zwei Nachkommastellen sind rund 1,1 km. Für „was ist im Umkreis"
 * ändert das nichts, nimmt einem gefundenen Gerät aber die Hausnummer.
 */
function _radarGrob(lat, lng) {
  return { lat: Math.round(lat * 100) / 100, lng: Math.round(lng * 100) / 100 };
}

function _radarMerken(pos, quelle) {
  try {
    var g = _radarGrob(pos.lat, pos.lng);
    localStorage.setItem(RADAR_SPEICHER, JSON.stringify({ lat: g.lat, lng: g.lng, quelle: quelle }));
  } catch (e) { /* Privater Modus: dann eben nur diese Sitzung. */ }
}

function radarGemerkterOrt() {
  try {
    var roh = JSON.parse(localStorage.getItem(RADAR_SPEICHER) || 'null');
    if (!roh || typeof roh.lat !== 'number' || typeof roh.lng !== 'number') return null;
    return roh;
  } catch (e) { return null; }
}

/** Die nächstgelegene bekannte Stadt — für die Beschriftung. */
function radarOrtsname(lat, lng) {
  var beste = null, kuerzeste = Infinity;
  for (var name in RADAR_ORTE) {
    if (!Object.prototype.hasOwnProperty.call(RADAR_ORTE, name)) continue;
    var d = haversineKm(lat, lng, RADAR_ORTE[name][0], RADAR_ORTE[name][1]);
    if (d < kuerzeste) { kuerzeste = d; beste = name; }
  }
  // Über 80 km ist „bei Berlin" eine Behauptung, keine Ortsangabe.
  return (beste && kuerzeste <= 80) ? beste : null;
}

/**
 * Alles im Umkreis — Dienstleister UND Events, gemeinsam sortiert.
 *
 * Gemeinsam ist Absicht: wer ein Fest plant, denkt nicht in „Inserate"
 * und „Veranstaltungen", sondern in „was gibt es hier".
 */
function radarUmkreis(pos, radiusKm) {
  if (!pos) return [];
  var treffer = [];

  (typeof LISTINGS !== 'undefined' ? LISTINGS : []).forEach(function (l) {
    var c = RADAR_ORTE[l.location];
    if (!c) return;
    var d = haversineKm(pos.lat, pos.lng, c[0], c[1]);
    if (d > radiusKm) return;
    treffer.push({ art: 'dienstleister', km: d, ort: l.location, daten: l });
  });

  (typeof DEMO_EVENTS !== 'undefined' ? DEMO_EVENTS : []).forEach(function (e) {
    var c = RADAR_ORTE[e.location];
    if (!c) return;
    var d = haversineKm(pos.lat, pos.lng, c[0], c[1]);
    if (d > radiusKm) return;
    treffer.push({ art: 'event', km: d, ort: e.location, daten: e });
  });

  return treffer.sort(function (a, b) { return a.km - b.km; });
}

/** „12 km" bzw. „unter 1 km" — Nachkommastellen wären hier gelogen. */
function radarEntfernung(km) {
  if (km < 1) return 'unter 1 km';
  return Math.round(km) + ' km';
}

/**
 * Standort erfragen. Nur auf ausdrückliche Handlung, nie beim Laden.
 */
function radarStandortErfragen(fertig) {
  if (!navigator.geolocation) {
    showToast('Dein Browser kennt keine Standortfreigabe. Wähle deine Stadt.', 'error_outline');
    if (fertig) fertig(null);
    return;
  }
  navigator.geolocation.getCurrentPosition(function (p) {
    _radarPos = { lat: p.coords.latitude, lng: p.coords.longitude };
    _radarQuelle = 'geo';
    _radarMerken(_radarPos, 'geo');
    if (fertig) fertig(_radarPos);
  }, function (err) {
    var abgelehnt = err && err.code === 1;
    showToast(abgelehnt
      ? 'Kein Standort freigegeben — wähle stattdessen deine Stadt.'
      : 'Standort nicht ermittelbar. Wähle deine Stadt.', 'error_outline');
    if (fertig) fertig(null);
  }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
}

/** Ohne Standortfreigabe: Stadt wählen. Gleichwertig, nicht zweite Wahl. */
function radarStadtWaehlen(name) {
  var c = RADAR_ORTE[name];
  if (!c) return null;
  _radarPos = { lat: c[0], lng: c[1] };
  _radarQuelle = 'stadt';
  _radarMerken(_radarPos, 'stadt');
  return _radarPos;
}

function radarRadiusSetzen(km) {
  if (RADAR_RADIEN.indexOf(km) === -1) return _radarRadius;
  _radarRadius = km;
  return _radarRadius;
}

function radarStand() {
  return { pos: _radarPos, radius: _radarRadius, quelle: _radarQuelle };
}

/** Beim Start den gemerkten groben Ort übernehmen — ohne neue Abfrage. */
function radarWiederherstellen() {
  var g = radarGemerkterOrt();
  if (!g) return null;
  _radarPos = { lat: g.lat, lng: g.lng };
  _radarQuelle = g.quelle === 'geo' ? 'geo' : 'stadt';
  return _radarPos;
}

function radarVergessen() {
  _radarPos = null;
  _radarQuelle = null;
  try { localStorage.removeItem(RADAR_SPEICHER); } catch (e) { /* egal */ }
}
