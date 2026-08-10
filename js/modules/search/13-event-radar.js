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
 * Wo liegt dieser Eintrag — und wie genau wissen wir das?
 *
 * `genau: false` heißt: wir kennen nur die Stadt und rechnen ab deren
 * Mittelpunkt. Das ist eine brauchbare Näherung, aber der Unterschied
 * gehört sichtbar gemacht. Ein Eintrag ohne Koordinaten so darzustellen
 * wie einer mit wäre dieselbe Sorte Behauptung wie ein Katalog, der
 * Verbindungszustand vortäuscht.
 */
function radarPosition(eintrag) {
  var k = eintrag && eintrag.koordinaten;
  if (Array.isArray(k) && k.length === 2 && isFinite(k[0]) && isFinite(k[1])) {
    return { lat: k[0], lng: k[1], genau: true };
  }
  var c = RADAR_ORTE[eintrag && eintrag.location];
  if (!c) return null;
  return { lat: c[0], lng: c[1], genau: false };
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

  function sammeln(liste, art) {
    (liste || []).forEach(function (x) {
      var p = radarPosition(x);
      if (!p) return;
      var d = haversineKm(pos.lat, pos.lng, p.lat, p.lng);
      if (d > radiusKm) return;
      treffer.push({
        art: art, km: d, ort: x.location, daten: x,
        genau: p.genau, stadtteil: x.stadtteil || null,
      });
    });
  }

  sammeln(typeof LISTINGS !== 'undefined' ? LISTINGS : [], 'dienstleister');
  sammeln(typeof DEMO_EVENTS !== 'undefined' ? DEMO_EVENTS : [], 'event');

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

/* ══════════════════════════════════════════════════════════════════
   OBERFLÄCHE

   Bewusst an die bestehende Karte gehängt statt daneben gestellt: zwei
   Karten mit unterschiedlichen Trefferbegriffen wären für den Nutzer
   nicht auseinanderzuhalten.
   ══════════════════════════════════════════════════════════════════ */

var _radarKreis = null;
var _radarIchMarker = null;

function _radarEl(id) { return document.getElementById(id); }

/** Radius-Knöpfe und Stadtliste einmalig aufbauen. */
function radarLeisteAufbauen() {
  var radien = _radarEl('radarRadien');
  if (radien && !radien.childElementCount) {
    RADAR_RADIEN.forEach(function (km) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'radar-chip' + (km === _radarRadius ? ' aktiv' : '');
      b.textContent = km + ' km';
      b.setAttribute('aria-pressed', km === _radarRadius ? 'true' : 'false');
      b.onclick = function () { radarRadiusKlick(km); };
      radien.appendChild(b);
    });
  }
  var sel = _radarEl('radarStadt');
  if (sel && sel.options.length <= 1) {
    Object.keys(RADAR_ORTE).sort(function (a, b) { return a.localeCompare(b, 'de'); })
      .forEach(function (name) {
        var o = document.createElement('option');
        o.value = name; o.textContent = name;
        sel.appendChild(o);
      });
  }
}

function radarRadiusKlick(km) {
  radarRadiusSetzen(km);
  var radien = _radarEl('radarRadien');
  if (radien) {
    Array.prototype.forEach.call(radien.children, function (b) {
      var an = b.textContent === km + ' km';
      b.classList.toggle('aktiv', an);
      b.setAttribute('aria-pressed', an ? 'true' : 'false');
    });
  }
  radarAnzeigen();
}

function radarStandortKlick() {
  var btn = _radarEl('radarStandortBtn');
  if (btn) { btn.disabled = true; }
  radarStandortErfragen(function () {
    if (btn) { btn.disabled = false; }
    radarAnzeigen();
  });
}

function radarStadtKlick(name) {
  if (!name) return;
  radarStadtWaehlen(name);
  radarAnzeigen();
}

function radarVergessenKlick() {
  radarVergessen();
  var sel = _radarEl('radarStadt');
  if (sel) sel.value = '';
  radarAnzeigen();
}

/** Eigene Position und Umkreis auf der Karte zeichnen. */
function _radarKarteZeichnen(pos, radiusKm) {
  if (typeof leafletMap === 'undefined' || !leafletMap || typeof L === 'undefined') return;
  if (_radarKreis) { leafletMap.removeLayer(_radarKreis); _radarKreis = null; }
  if (_radarIchMarker) { leafletMap.removeLayer(_radarIchMarker); _radarIchMarker = null; }
  if (!pos) return;

  _radarKreis = L.circle([pos.lat, pos.lng], {
    radius: radiusKm * 1000,
    color: '#22d3ee', weight: 1.5, fillColor: '#22d3ee', fillOpacity: 0.07,
  }).addTo(leafletMap);
  _radarIchMarker = L.circleMarker([pos.lat, pos.lng], {
    radius: 7, color: '#0b1117', weight: 2, fillColor: '#22d3ee', fillOpacity: 1,
  }).addTo(leafletMap).bindPopup('Dein ungefährer Standort');

  leafletMap.fitBounds(_radarKreis.getBounds(), { padding: [24, 24] });
}

/**
 * Trefferliste zeichnen.
 *
 * Der leere Fall bekommt einen eigenen Text: „keine Treffer" ist eine
 * Aussage über die Gegend, nicht über einen Fehler — und der nächste
 * größere Radius ist der offensichtliche nächste Schritt.
 */
function _radarListe(treffer, radiusKm) {
  var liste = _radarEl('mapLocationsList');
  if (!liste) return;

  if (!treffer.length) {
    var groesser = RADAR_RADIEN.filter(function (r) { return r > radiusKm; })[0];
    liste.innerHTML = '<p class="radar-leer">Im Umkreis von ' + radiusKm + ' km ist nichts eingetragen.'
      + (groesser ? ' <button type="button" class="radar-link" onclick="radarRadiusKlick(' + groesser
        + ')">Auf ' + groesser + ' km erweitern</button>' : '') + '</p>';
    return;
  }

  liste.innerHTML = treffer.slice(0, 40).map(function (t) {
    var d = t.daten;
    var titel = d.title || d.name || 'Ohne Titel';
    var symbol = t.art === 'event' ? 'celebration' : 'storefront';
    // Die ID geht durch JSON UND durch die HTML-Maskierung: das Attribut ist
    // mit " begrenzt, und ein " in der ID bräche sonst aus dem onclick aus.
    // Beides zusammen, nicht nur eines — der XSS-Scanner sucht genau danach.
    var ruf = t.art === 'event' ? ''
      : 'navigateTo(&quot;detail&quot;,' + _escHtml(JSON.stringify(String(d.id))) + ')';
    return '<button type="button" class="radar-treffer" onclick="' + ruf + '">'
      + '<span class="material-icons-round radar-treffer-icon">' + symbol + '</span>'
      + '<span class="radar-treffer-text">'
      + '<span class="radar-treffer-titel">' + _escHtml(titel) + '</span>'
      // „Berlin · Kreuzberg" statt nur „Berlin". Wo wir nur die Stadt kennen,
      // steht das auch da — eine Entfernung ab Stadtmitte ist eine Schätzung
      // und soll nicht wie eine Messung aussehen.
      + '<span class="radar-treffer-ort">'
      + _escHtml(t.stadtteil ? t.ort + ' · ' + t.stadtteil : t.ort)
      + (t.genau ? '' : ' <span class="radar-ungenau">ab Stadtmitte</span>')
      + '</span></span>'
      + '<span class="radar-treffer-km">' + radarEntfernung(t.km) + '</span></button>';
  }).join('');
}

/** Alles neu zeichnen — Leiste, Karte, Liste. */
function radarAnzeigen() {
  radarLeisteAufbauen();
  var stand = radarStand();
  var text = _radarEl('radarOrtText');
  var vergessen = _radarEl('radarVergessenBtn');
  var hinweis = _radarEl('radarHinweis');

  if (!stand.pos) {
    if (text) text.textContent = 'Standort freigeben';
    if (vergessen) vergessen.hidden = true;
    if (hinweis) hinweis.textContent = 'Dein Standort bleibt im Browser — die Entfernungen werden hier gerechnet.';
    _radarKarteZeichnen(null, 0);
    return;
  }

  var name = radarOrtsname(stand.pos.lat, stand.pos.lng);
  if (text) text.textContent = name ? ('Nähe ' + name) : 'Standort gesetzt';
  if (vergessen) vergessen.hidden = false;

  var treffer = radarUmkreis(stand.pos, stand.radius);
  if (hinweis) {
    hinweis.textContent = treffer.length + ' im Umkreis von ' + stand.radius + ' km'
      + (stand.quelle === 'geo' ? ' · Standort auf ~1 km gerundet gespeichert' : '');
  }
  _radarKarteZeichnen(stand.pos, stand.radius);
  _radarListe(treffer, stand.radius);
}

/** Beim Öffnen der Karte: gemerkten Ort übernehmen, nichts neu erfragen. */
function radarBeimOeffnen() {
  if (!radarStand().pos) radarWiederherstellen();
  radarAnzeigen();
}

/* ══════════════════════════════════════════════════════════════════
   ADRESSE → KOORDINATEN (Geocoding)

   Der Mechanismus im Radar ist richtig, aber die Quelle fehlte: neue
   Inserate bekamen keine Koordinaten, weil die Maske nur „Stadt"
   abfragte. Damit landete jedes echte Inserat auf dem Stadtmittelpunkt,
   und nur die Demo-Einträge trugen Stadtteile.

   ── Nominatims Regeln sind bindend ────────────────────────────────
   Der Dienst ist ein Spendenprojekt, keine Infrastruktur zum
   Verbrauchen. Seine Bedingungen: höchstens eine Anfrage pro Sekunde,
   keine Abfrage bei jedem Tastendruck, erkennbarer Absender.

   Deshalb:
   · gesucht wird nur auf Knopfdruck, nie beim Tippen
   · eine harte Sperre von 1,1 s zwischen zwei Anfragen
   · identische Anfragen werden aus dem Zwischenspeicher bedient
   Wer diese Regeln bricht, wird gesperrt — und dann funktioniert die
   Adresssuche für alle Inserate nicht mehr.

   ── Was hier hinausgeht ───────────────────────────────────────────
   Die Geschäftsadresse des Anbieters, die ohnehin im Inserat steht.
   Das ist etwas anderes als der Standort eines Besuchers: der bleibt
   weiterhin im Browser. Wer keine Adresse angeben will, lässt das Feld
   leer — dann bleibt es beim Stadtmittelpunkt, sichtbar gekennzeichnet.
   ══════════════════════════════════════════════════════════════════ */

var GEO_DIENST = 'https://nominatim.openstreetmap.org/search';
var GEO_SPERRE_MS = 1100;          // Nominatim: max. 1 Anfrage/Sekunde
var _geoLetzteAnfrage = 0;
var _geoCache = {};

/** Wie lange noch gewartet werden muss, bevor gefragt werden darf. */
function geoWartezeit() {
  var seit = Date.now() - _geoLetzteAnfrage;
  return seit >= GEO_SPERRE_MS ? 0 : GEO_SPERRE_MS - seit;
}

/**
 * Adresse zu Koordinaten. Liefert bis zu fünf Vorschläge zur Auswahl.
 *
 * Bewusst mit Auswahl statt „erster Treffer gewinnt": „Hauptstraße 5"
 * gibt es in Deutschland hundertfach, und ein stillschweigend falsch
 * gesetzter Punkt ist schlimmer als eine Rückfrage.
 */
function geoSuchen(adresse, fertig) {
  var q = String(adresse || '').trim();
  if (q.length < 4) { fertig({ fehler: 'Bitte Straße und Ort angeben.' }); return; }

  if (Object.prototype.hasOwnProperty.call(_geoCache, q)) {
    fertig({ treffer: _geoCache[q] });
    return;
  }
  var warten = geoWartezeit();
  if (warten > 0) {
    fertig({ fehler: 'Einen Moment — die Adresssuche darf nur einmal pro Sekunde anfragen.' });
    return;
  }
  _geoLetzteAnfrage = Date.now();

  // DACH, nicht nur Deutschland — dasselbe Gebiet wie das Radar.
  var url = GEO_DIENST + '?format=jsonv2&addressdetails=1&limit=5'
    + '&countrycodes=de,at,ch&q=' + encodeURIComponent(q);

  fetch(url, { headers: { 'Accept': 'application/json' } })
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (arr) {
      var treffer = (Array.isArray(arr) ? arr : []).map(function (t) {
        var a = t.address || {};
        return {
          anzeige: String(t.display_name || '').slice(0, 160),
          lat: parseFloat(t.lat), lng: parseFloat(t.lon),
          ort: a.city || a.town || a.village || a.municipality || '',
          stadtteil: a.suburb || a.city_district || a.borough || a.neighbourhood || '',
        };
      }).filter(function (t) { return isFinite(t.lat) && isFinite(t.lng); });
      _geoCache[q] = treffer;
      fertig({ treffer: treffer });
    })
    .catch(function () {
      // Ein Ausfall des Dienstes darf das Inserat nicht blockieren.
      fertig({ fehler: 'Adresssuche gerade nicht erreichbar. Du kannst ohne Adresse fortfahren.' });
    });
}

/** Die gewählte Adresse für das Inserat — grob genug, präzise genug. */
function geoUebernehmen(treffer) {
  if (!treffer) return null;
  // Fünf Nachkommastellen sind gut ein Meter — mehr als eine Hausadresse
  // hergibt, und unnötig. Vier sind ~11 m und völlig ausreichend.
  return {
    koordinaten: [Math.round(treffer.lat * 10000) / 10000, Math.round(treffer.lng * 10000) / 10000],
    ort: treffer.ort || '',
    stadtteil: treffer.stadtteil || '',
  };
}

/* ── Adressfeld in der Inseratsmaske ──────────────────────────────── */

function _geoEl(id) { return document.getElementById(id); }

function geoSuchenKlick() {
  var feld = _geoEl('createAdresse');
  var status = _geoEl('geoStatus');
  var liste = _geoEl('geoTreffer');
  var btn = _geoEl('geoSuchenBtn');
  if (!feld || !status || !liste) return;

  liste.innerHTML = '';
  status.textContent = 'Suche …';
  if (btn) btn.disabled = true;

  geoSuchen(feld.value, function (ergebnis) {
    if (btn) btn.disabled = false;
    if (ergebnis.fehler) { status.textContent = ergebnis.fehler; return; }
    if (!ergebnis.treffer.length) {
      status.textContent = 'Keine Adresse gefunden. Ohne Adresse geht es auch — dann zählt die Stadtmitte.';
      return;
    }
    status.textContent = ergebnis.treffer.length === 1
      ? 'Eine Adresse gefunden — bitte bestätigen:'
      : ergebnis.treffer.length + ' Adressen gefunden — welche ist es?';

    // Auswahl statt „erster Treffer gewinnt": „Hauptstraße 5" gibt es
    // hundertfach, und ein still falsch gesetzter Punkt ist schlimmer
    // als eine Rückfrage.
    liste.innerHTML = ergebnis.treffer.map(function (t, i) {
      return '<li><button type="button" class="geo-treffer-btn" data-i="' + i + '">'
        + _escHtml(t.anzeige) + '</button></li>';
    }).join('');
    Array.prototype.forEach.call(liste.querySelectorAll('.geo-treffer-btn'), function (b) {
      b.onclick = function () { geoTrefferWaehlen(ergebnis.treffer[Number(b.dataset.i)]); };
    });
  });
}

function geoTrefferWaehlen(treffer) {
  var uebernahme = geoUebernehmen(treffer);
  if (!uebernahme) return;
  var feld = _geoEl('createKoordinaten');
  if (feld) feld.value = JSON.stringify(uebernahme);

  var liste = _geoEl('geoTreffer');
  if (liste) liste.innerHTML = '';
  var status = _geoEl('geoStatus');
  if (status) {
    status.textContent = 'Übernommen: ' + (uebernahme.stadtteil
      ? uebernahme.ort + ' · ' + uebernahme.stadtteil
      : (uebernahme.ort || 'Position gesetzt'));
  }
  // Die Stadt gleich mitfüllen, wenn sie noch leer ist — sonst müsste der
  // Anbieter dieselbe Information zweimal eintragen.
  var stadt = _geoEl('createRegion');
  if (stadt && !stadt.value && uebernahme.ort) stadt.value = uebernahme.ort;
}

/** Was die Maske ans Inserat weitergibt. Ohne Adresse: nichts. */
function geoInseratDaten() {
  var feld = _geoEl('createKoordinaten');
  if (!feld || !feld.value) return null;
  try { return JSON.parse(feld.value); } catch (e) { return null; }
}
