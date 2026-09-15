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
var _radarArt = 'alle';
var _radarSuche = '';
var _radarOverlayHits = [];

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
    ebSpeichern(RADAR_SPEICHER, JSON.stringify({ lat: g.lat, lng: g.lng, quelle: quelle }));
  } catch (e) { /* Privater Modus: dann eben nur diese Sitzung. */ }
}

function radarGemerkterOrt() {
  try {
    var roh = JSON.parse(localStorage.getItem(RADAR_SPEICHER) || 'null');
    if (!roh || typeof roh.lat !== 'number' || typeof roh.lng !== 'number') return null;
    return isFinite(roh.lat) && isFinite(roh.lng) && Math.abs(roh.lat) <= 90 && Math.abs(roh.lng) <= 180 ? roh : null;
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
  if (eintrag && eintrag._aktivitaet && typeof ebAktivitaetPosition === 'function') return eintrag._position || ebAktivitaetPosition(eintrag._aktivitaet, null);
  var k = eintrag && eintrag.koordinaten;
  if (Array.isArray(k) && k.length === 2 && typeof k[0] === 'number' && typeof k[1] === 'number' && isFinite(k[0]) && isFinite(k[1]) && Math.abs(k[0]) <= 90 && Math.abs(k[1]) <= 180) {
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

  var listings = typeof getHeroListings === 'function' ? getHeroListings() : [];
  sammeln(listings.filter(function (l) {
    return !(typeof _isRequestListing === 'function' && _isRequestListing(l));
  }), 'dienstleister');
  if (!window.EB_HIDE_DEMO) sammeln(typeof DEMO_EVENTS !== 'undefined' ? DEMO_EVENTS : [], 'event');
  if (typeof _aktBestand !== 'undefined' && _aktBestand && typeof ebAktivitaetenGefiltert === 'function') {
    var aktiv = ebAktivitaetenGefiltert(_aktBestand, pos, radiusKm, new Date());
    aktiv.termine.concat(aktiv.orte).forEach(function(t) {
      var e = t.daten;
      var gebiet = (_aktBestand.gebiete || []).find(function(g) { return g.stadt === e.gebiet || (e.ort && g.stadt === e.ort.stadt); });
      treffer.push({ art: 'aktivitaet', km: t.km, ort: e.ort && e.ort.stadt || '', genau: t.genau,
        daten: { id: e.id, title: e.titel, location: e.ort && e.ort.stadt || '',
          _aktivitaet: e, _position: ebAktivitaetPosition(e, gebiet || _aktBestand.mitte) } });
    });
  }
  if (_radarArt === 'aktivitaeten') treffer = treffer.filter(function(t) { return t.art === 'aktivitaet' || t.art === 'event'; });
  if (_radarArt === 'dienstleister') treffer = treffer.filter(function(t) { return t.art === 'dienstleister'; });
  if (_radarSuche) treffer = treffer.filter(function(t) {
    var d = t.daten || {};
    return [d.title, d.name, d.location, d.categoryLabel, d._aktivitaet && d._aktivitaet.kategorie].join(' ').toLowerCase().indexOf(_radarSuche) !== -1;
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
    _radarOrtSynchronisieren();
    if (fertig) fertig(_radarPos);
  }, function (err) {
    var abgelehnt = err && err.code === 1;
    showToast(abgelehnt
      ? 'Kein Standort freigegeben — wähle stattdessen deine Stadt.'
      : 'Standort nicht ermittelbar. Wähle deine Stadt.', 'error_outline');
    if (fertig) fertig(null);
  }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
}

/**
 * Position aus Koordinaten setzen.
 *
 * Der Weg für alles, was KEIN Name aus `RADAR_ORTE` ist — etwa ein Gebiet
 * aus `assets/eb-aktivitaeten.json`. Die Alternative wäre gewesen, dass
 * jede solche Stelle `_radarPos` selbst beschreibt und dabei `_radarMerken`
 * vergisst; dann bleibt die Wahl bis zum Neuladen und ist danach weg.
 */
function radarPositionSetzen(lat, lng, quelle) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  _radarPos = { lat: lat, lng: lng };
  _radarQuelle = quelle === 'geo' ? 'geo' : 'stadt';
  _radarMerken(_radarPos, _radarQuelle);
  _radarOrtSynchronisieren();
  return _radarPos;
}

/** Shared place labels prevent Feed, Suche and Map from disagreeing. */
function _radarOrtSynchronisieren() {
  if (!_radarPos) return;
  var name = radarOrtsname(_radarPos.lat, _radarPos.lng) || '';
  var input = document.getElementById('browseLocation');
  if (input && name) input.value = name;
  if (typeof _setNavWoLabel === 'function') _setNavWoLabel(name || 'Mein Standort');
  var label = document.getElementById('feedLocationText');
  if (label) label.textContent = name ? 'Nähe ' + name : 'Mein Standort';
}

/** Ohne Standortfreigabe: Stadt wählen. Gleichwertig, nicht zweite Wahl. */
function radarStadtWaehlen(name) {
  var c = RADAR_ORTE[name];
  if (!c) return null;
  return radarPositionSetzen(c[0], c[1], 'stadt');
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
  var input = document.getElementById('browseLocation');
  if (input) input.value = '';
  if (typeof _setNavWoLabel === 'function') _setNavWoLabel('');
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
  var overlay = _radarEl('mapOverlay');
  if (overlay && !_radarEl('radarAktivFilter')) {
    var controls = document.createElement('div');
    controls.id = 'radarAktivFilter'; controls.className = 'akt-overlay-filter';
    controls.innerHTML = '<label>Anzeigen<select id="radarArt" onchange="_radarArt=this.value;radarAnzeigen()"><option value="alle">Alles</option><option value="aktivitaeten">Aktivitäten</option><option value="dienstleister">Dienstleister</option></select></label>'
      + '<label>Aktivität<select id="radarKategorie" onchange="_aktKategorie=this.value;radarAnzeigen()"><option value="">Alle Aktivitäten</option>'
      + ['Sport','Kino','Museum','Theater','Zoo','Escape-Room','Kletterhalle','Erlebnisbad'].map(function(c) { return '<option>' + c + '</option>'; }).join('') + '</select></label>'
      + '<label>Termine<select id="radarZeit" onchange="_aktZeit=this.value;radarAnzeigen()"><option value="alle">Alle Termine</option><option value="jetzt">Nächste 4 Stunden</option><option value="heute">Heute</option><option value="wochenende">Wochenende</option></select></label>';
    var anchor = _radarEl('mapContainer');
    if (anchor) anchor.parentNode.insertBefore(controls, anchor);
  }
  if (_radarEl('radarArt')) _radarEl('radarArt').value = _radarArt;
  if (_radarEl('radarKategorie')) _radarEl('radarKategorie').value = _aktKategorie;
  if (_radarEl('radarZeit')) _radarEl('radarZeit').value = _aktZeit;
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
  _radarOverlayHits = treffer;

  if (!treffer.length) {
    var groesser = RADAR_RADIEN.filter(function (r) { return r > radiusKm; })[0];
    liste.innerHTML = '<p class="radar-leer">Im Umkreis von ' + radiusKm + ' km ist nichts eingetragen.'
      + (groesser ? ' <button type="button" class="radar-link" onclick="radarRadiusKlick(' + groesser
        + ')">Auf ' + groesser + ' km erweitern</button>' : '') + '</p>';
    return;
  }

  _radarOverlayHits = treffer;
  liste.innerHTML = treffer.slice(0, 80).map(function (t, index) {
    var d = t.daten;
    var titel = d.title || d.name || 'Ohne Titel';
    var symbol = t.art === 'dienstleister' ? 'storefront' : 'celebration';
    // Die ID geht durch JSON UND durch die HTML-Maskierung: das Attribut ist
    // mit " begrenzt, und ein " in der ID bräche sonst aus dem onclick aus.
    // Beides zusammen, nicht nur eines — der XSS-Scanner sucht genau danach.
    var ruf = 'radarTrefferOeffnen(' + index + ')';
    return '<button type="button" class="radar-treffer" onclick="' + ruf + '">'
      + '<span class="material-icons-round radar-treffer-icon">' + symbol + '</span>'
      + '<span class="radar-treffer-text">'
      + '<span class="radar-treffer-titel">' + _escHtml(titel) + '</span>'
      // „Berlin · Kreuzberg" statt nur „Berlin". Wo wir nur die Stadt kennen,
      // steht das auch da — eine Entfernung ab Stadtmitte ist eine Schätzung
      // und soll nicht wie eine Messung aussehen.
      + '<span class="radar-treffer-ort">'
      + _escHtml(t.stadtteil ? t.ort + ' · ' + t.stadtteil : t.ort)
      + (t.art === 'aktivitaet' ? ' · Externe Quelle' : t.art === 'event' ? ' · Demo-Event' : ' · Auf Eventbörse')
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
  var citySelect = _radarEl('radarStadt');
  if (citySelect) citySelect.value = name || '';
  if (vergessen) vergessen.hidden = false;

  var treffer = radarUmkreis(stand.pos, stand.radius);
  if (hinweis) {
    hinweis.textContent = treffer.length + ' im Umkreis von ' + stand.radius + ' km'
      + (stand.quelle === 'geo' ? ' · Standort auf ~1 km gerundet gespeichert' : '');
  }
  _radarKarteZeichnen(stand.pos, stand.radius);
  _radarListe(treffer, stand.radius);
  _radarOverlayMarker(treffer);
}

/** Beim Öffnen der Karte: gemerkten Ort übernehmen, nichts neu erfragen. */
function radarBeimOeffnen() {
  if (!radarStand().pos) radarWiederherstellen();
  radarAnzeigen();
  if (typeof ebAktivitaetenLaden === 'function') ebAktivitaetenLaden(function() {
    if (document.getElementById('mapOverlay')?.classList.contains('show')) radarAnzeigen();
  });
}

function radarTrefferOeffnen(index) { _radarTrefferOeffnen(_radarOverlayHits[index]); }
function _radarTrefferOeffnen(hit) {
  if (!hit) return;
  if (hit.art === 'dienstleister') { closeMapOverlay(); navigateTo('detail', hit.daten.id); return; }
  var e = hit.daten && hit.daten._aktivitaet;
  // ── BETREIBERSEITE VOR KARTENSEITE (15.09.2026) ──────────────────────
  //
  // Hier stand nur `e.quelle.url` — und das ist bei 800 von 954 Eintraegen
  // die OpenStreetMap-Objektseite. Gemeldet: „das radar oeffnet
  // openstreetmap statt die website des externen betreibers". Wer ein Kino
  // antippt, will die Spielzeiten.
  //
  // `quelle.url` bleibt als ODbL-Attribution erhalten und wird weiter
  // angezeigt — nur ist sie nicht mehr das Ziel des Klicks, solange es
  // eine echte Betreiberseite gibt.
  var url = (e && e.webseite) || (e && e.quelle && e.quelle.url);
  if (typeof url === 'string' && /^https:\/\//.test(url)) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  closeMapOverlay();
  navigateTo('aktuelles', 'events');
}

function _radarOverlayMarker(hits) {
  if (typeof leafletMap === 'undefined' || !leafletMap || typeof L === 'undefined') return;
  mapMarkers.forEach(function(m) { leafletMap.removeLayer(m); });
  mapMarkers = [];
  _feedRadarGruppen(hits).forEach(function(group) {
    var popup = group.items.map(function(item) {
      var t = item.hit;
      return '<button type="button" class="feed-radar-popup-row" onclick="radarTrefferOeffnen(' + item.index + ')"><span><strong>'
        + _escHtml(t.daten.title || t.daten.name || 'Aktivität') + '</strong><small>'
        + _escHtml(t.ort || '') + ' · ' + (t.art === 'aktivitaet' ? 'Externe Quelle' : t.art === 'event' ? 'Demo-Event' : 'Auf Eventbörse')
        + (t.genau ? '' : ' · Stadtmitte') + '</small></span></button>';
    }).join('');
    var marker = L.marker([group.pos.lat, group.pos.lng], { icon: L.divIcon({
      className: 'map-marker-wrapper', html: '<span class="map-marker-custom">' + group.items.length + ' Treffer</span>',
      iconSize: [90, 30], iconAnchor: [45, 15],
    }) }).addTo(leafletMap).bindPopup(popup, { maxWidth: 300 });
    mapMarkers.push(marker);
  });
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

/* ── Radar als eigener Feed-Kanal ─────────────────────────────────── */

/* Eigene Leaflet-Instanz für den Feed. Die große Karten-Overlay-Instanz
   (`leafletMap`) bleibt davon unabhängig, damit beide Oberflächen ihre
   Marker und ihren Zoom nicht gegenseitig überschreiben. */
var _feedRadarMap = null;
var _feedRadarRange = null;
var _feedRadarPulse = null;
var _feedRadarPulseRaf = 0;
var _feedRadarMarkers = [];
var _feedRadarHits = [];

function _destroyFeedRadarMap() {
  if (_feedRadarPulseRaf) {
    cancelAnimationFrame(_feedRadarPulseRaf);
    _feedRadarPulseRaf = 0;
  }
  if (_feedRadarMap) {
    try { _feedRadarMap.remove(); } catch (e) { /* DOM kann schon ersetzt sein. */ }
  }
  _feedRadarMap = null;
  _feedRadarRange = null;
  _feedRadarPulse = null;
  _feedRadarMarkers = [];
}

function _feedRadarPopupHtml(gruppe) {
  var eintraege = gruppe.map(function(item) {
    var hit = item.hit;
    var d = hit.daten || {};
    var title = d.title || d.name || 'Aktivität';
    return '<button type="button" class="feed-radar-popup-row" onclick="feedRadarOpen(' + item.index + ')">'
      + '<span class="material-icons-round">' + (hit.art === 'dienstleister' ? 'storefront' : 'celebration') + '</span>'
      + '<span><strong>' + _escHtml(title) + '</strong><small>'
      + _escHtml(hit.ort || '') + ' · ' + (hit.art === 'aktivitaet' ? 'Externe Quelle · ' : '') + _escHtml(radarEntfernung(hit.km))
      + (hit.genau ? '' : ' · ca.') + '</small>' + _aiDisclosureLabelsHtml(d, 'ai-disclosure-radar-popup') + '</span>'
      + '<span class="material-icons-round">arrow_forward</span></button>';
  }).join('');
  return '<div class="feed-radar-popup"><div class="feed-radar-popup-head">'
    + '<span>IM RADAR</span><strong>' + gruppe.length + ' Treffer</strong></div>'
    + eintraege + '</div>';
}

/** Identische echte Positionen und Stadtmittelpunkte werden gebündelt.
    Eine künstliche Streuung würde Genauigkeit vortäuschen; ein Marker mit
    Zähler sagt dagegen ehrlich, dass mehrere Inserate am selben bekannten
    Punkt liegen. */
function _feedRadarGruppen(hits) {
  var gruppen = {};
  hits.forEach(function(hit, index) {
    var pos = radarPosition(hit.daten);
    if (!pos) return;
    var key = pos.lat.toFixed(5) + ':' + pos.lng.toFixed(5);
    if (!gruppen[key]) gruppen[key] = { pos: pos, items: [] };
    gruppen[key].items.push({ hit: hit, index: index });
  });
  return Object.keys(gruppen).map(function(key) { return gruppen[key]; });
}

function _feedRadarScanStart(pos, radiusKm, trefferzahl) {
  if (!_feedRadarMap || typeof L === 'undefined') return;
  var status = document.getElementById('feedRadarScanStatus');
  var reduced = ebBewegungReduziert();
  var maxRadius = radiusKm * 1000;

  _feedRadarPulse = L.circle([pos.lat, pos.lng], {
    radius: reduced ? maxRadius : 1,
    color: '#27e6d2', weight: 2, opacity: reduced ? 0 : .9,
    fillColor: '#27e6d2', fillOpacity: reduced ? 0 : .18,
    interactive: false, className: 'feed-radar-scan-wave',
  }).addTo(_feedRadarMap);

  if (reduced) {
    if (status) status.innerHTML = '<span class="feed-radar-live-dot"></span>'
      + trefferzahl + ' Treffer im Umkreis';
    return;
  }

  var start = 0;
  var dauer = 1800;
  if (status) status.innerHTML = '<span class="feed-radar-live-dot scannt"></span>Radar scannt …';

  function frame(now) {
    if (!_feedRadarMap || !_feedRadarPulse) return;
    if (!start) start = now;
    var fortschritt = Math.min(1, (now - start) / dauer);
    var weich = 1 - Math.pow(1 - fortschritt, 3);
    _feedRadarPulse.setRadius(Math.max(1, maxRadius * weich));
    _feedRadarPulse.setStyle({
      opacity: .92 * (1 - fortschritt),
      fillOpacity: .18 * (1 - fortschritt),
    });
    if (fortschritt < 1) {
      _feedRadarPulseRaf = requestAnimationFrame(frame);
      return;
    }
    _feedRadarPulseRaf = 0;
    try { _feedRadarMap.removeLayer(_feedRadarPulse); } catch (e) {}
    _feedRadarPulse = null;
    if (status) status.innerHTML = '<span class="feed-radar-live-dot"></span>'
      + trefferzahl + ' Treffer entdeckt';
  }
  _feedRadarPulseRaf = requestAnimationFrame(frame);
}

function _initFeedRadarMap(hits) {
  var container = document.getElementById('feedRadarMap');
  if (!container || !_radarPos) return;
  if (typeof L === 'undefined') {
    container.innerHTML = '<div class="feed-radar-map-fallback"><span class="material-icons-round">map</span>'
      + '<strong>Karte gerade nicht erreichbar</strong><span>Alle Treffer stehen weiterhin darunter.</span></div>';
    return;
  }

  _feedRadarMap = L.map(container, {
    zoomControl: false,
    attributionControl: true,
    scrollWheelZoom: false,
    // Radiuswechsel ersetzen die Karte sofort. Leaflets eigene
    // Zoomtransition dürfte sonst noch auf den alten DOM-Knoten zugreifen.
    zoomAnimation: false,
    fadeAnimation: false,
    markerZoomAnimation: false,
  }).setView([_radarPos.lat, _radarPos.lng], 10);
  L.control.zoom({ position: 'bottomright' }).addTo(_feedRadarMap);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(_feedRadarMap);

  _feedRadarRange = L.circle([_radarPos.lat, _radarPos.lng], {
    radius: _radarRadius * 1000,
    color: '#00a699', weight: 2, opacity: .9,
    fillColor: '#00a699', fillOpacity: .08,
    interactive: false, className: 'feed-radar-range-circle',
  }).addTo(_feedRadarMap);

  L.marker([_radarPos.lat, _radarPos.lng], {
    interactive: false,
    icon: L.divIcon({
      className: 'feed-radar-origin-wrap',
      html: '<span class="feed-radar-origin"><span></span></span>',
      iconSize: [30, 30], iconAnchor: [15, 15],
    }),
  }).addTo(_feedRadarMap);

  _feedRadarGruppen(hits).forEach(function(gruppe) {
    var anzahl = gruppe.items.length;
    var nurEvents = gruppe.items.every(function(item) { return item.hit.art !== 'dienstleister'; });
    var icon = L.divIcon({
      className: 'feed-radar-marker-wrap',
      html: '<span class="feed-radar-marker ' + (anzahl > 1 ? 'cluster' : (nurEvents ? 'event' : 'listing')) + '">'
        + '<span class="material-icons-round">' + (anzahl > 1 ? 'layers' : (nurEvents ? 'celebration' : 'storefront')) + '</span>'
        + (anzahl > 1 ? '<b>' + anzahl + '</b>' : '') + '</span>',
      iconSize: [42, 48], iconAnchor: [21, 44], popupAnchor: [0, -42],
    });
    var marker = L.marker([gruppe.pos.lat, gruppe.pos.lng], {
      icon: icon,
      title: anzahl + ' Treffer an dieser Position',
      alt: anzahl + ' Radar-Treffer',
    }).addTo(_feedRadarMap).bindPopup(_feedRadarPopupHtml(gruppe.items), {
      maxWidth: 330, minWidth: 250, closeButton: true,
    });
    _feedRadarMarkers.push({ marker: marker, indexes: gruppe.items.map(function(item) { return item.index; }) });
  });

  var bounds = _feedRadarRange.getBounds();
  _feedRadarMap.fitBounds(bounds, { padding: [24, 24], animate: false });
  setTimeout(function() {
    if (!_feedRadarMap) return;
    _feedRadarMap.invalidateSize();
    _feedRadarMap.fitBounds(bounds, { padding: [24, 24], animate: false });
  }, 80);
  _feedRadarScanStart(_radarPos, _radarRadius, hits.length);
}

function renderFeedRadar(container) {
  if (!container) return;
  if (_aktZustand === 'kalt' || _aktZustand === 'laedt') ebAktivitaetenLaden(function() {
    if (document.getElementById('feedRadarResults')) _drawFeedRadar();
  });
  _destroyFeedRadarMap();
  if (!_radarPos) radarWiederherstellen();
  if (!_radarPos) radarStadtWaehlen('Köln');
  var city = radarOrtsname(_radarPos.lat, _radarPos.lng) || 'gewähltem Ort';
  var options = Object.keys(RADAR_ORTE).sort(function(a,b){ return a.localeCompare(b, 'de'); }).map(function(name){
    return '<option value="' + _escHtml(name) + '"' + (name === city ? ' selected' : '') + '>' + _escHtml(name) + '</option>';
  }).join('');
  var chips = RADAR_RADIEN.map(function(km){
    return '<button type="button" class="radar-chip' + (km === _radarRadius ? ' aktiv' : '') + '" onclick="feedRadarRadius(' + km + ')">' + km + ' km</button>';
  }).join('');
  container.innerHTML = '<section class="feed-radar-card">' +
    '<div class="feed-radar-head"><div><span class="release-kicker">ENTDECKEN UNTERWEGS</span><h2><span class="material-icons-round">radar</span> Aktivitäten-Radar</h2>' +
    '<p>Aktivitäten und Dienstleister im Umkreis von ' + _escHtml(city) + ' – direkt auf der Karte.</p></div>' +
    '<button class="btn-primary" type="button" onclick="feedRadarGeo()"><span class="material-icons-round">my_location</span> Mein Standort</button></div>' +
    '<div class="feed-radar-controls"><label>Stadt<select id="feedRadarCity" onchange="feedRadarCity(this.value)">' + options + '</select></label>' +
    '<div><span class="radar-control-label">Radius</span><div class="radar-chip-row">' + chips + '</div></div></div>' +
    '<div class="release-privacy"><span class="material-icons-round">shield</span><span>Dein genauer Standort bleibt im Browser. Gespeichert wird nur eine grobe Position; du kannst sie jederzeit <button type="button" onclick="feedRadarForget()">vergessen</button>.</span></div>' +
    '<label class="akt-radar-type">Anzeigen<select id="feedRadarType" onchange="feedRadarArt(this.value)"><option value="alle">Alles</option><option value="aktivitaeten">Aktivitäten</option><option value="dienstleister">Dienstleister</option></select></label>' +
    ebAktivitaetenFilterHtml(true) + '<div id="feedRadarResults"></div></section>';
  document.getElementById('feedRadarType').value = _radarArt;
  _drawFeedRadar();
}

function feedRadarArt(value) {
  if (['alle', 'aktivitaeten', 'dienstleister'].indexOf(value) < 0) return;
  _radarArt = value; _drawFeedRadar();
}
function feedRadarCity(name) {
  if (radarStadtWaehlen(name)) renderFeedRadar(document.getElementById('feedList'));
}
function feedRadarRadius(km) {
  radarRadiusSetzen(km);
  renderFeedRadar(document.getElementById('feedList'));
}
function feedRadarGeo() {
  radarStandortErfragen(function(pos){ if (pos) renderFeedRadar(document.getElementById('feedList')); });
}
function feedRadarForget() {
  radarVergessen();
  _radarPos = { lat: RADAR_ORTE.Köln[0], lng: RADAR_ORTE.Köln[1] };
  _radarQuelle = 'vorschau';
  renderFeedRadar(document.getElementById('feedList'));
  showToast('Standortdaten wurden vergessen.', 'delete_outline');
}

function _drawFeedRadar() {
  var root = document.getElementById('feedRadarResults');
  if (!root || !_radarPos) return;
  _destroyFeedRadarMap();
  var hits = radarUmkreis(_radarPos, _radarRadius);
  _feedRadarHits = hits;
  var dienstleister = hits.filter(function(hit){ return hit.art === 'dienstleister'; }).length;
  // Gemessen am 15.09.2026 in Köln: 212 Aktivitäten, 1 Demo-Event, 5 Dienstleister
  // — und die Legende nannte 213 davon „Events", während jede Karte darunter
  // „EXTERNE AKTIVITÄT" sagte. Der Bestand besteht aus Aktivitäten; Demo-Events
  // sind der Rest, der verschwindet. Die Zahl heisst deshalb, was sie zählt.
  var aktivitaeten = hits.length - dienstleister;
  var mapHtml = '<div class="feed-radar-map-shell">'
    + '<div id="feedRadarMap" class="feed-radar-map" role="region" aria-label="Radar-Karte mit Treffern im Umkreis von '
    + _radarRadius + ' Kilometern"></div>'
    + '<div class="feed-radar-map-top"><span id="feedRadarScanStatus"><span class="feed-radar-live-dot scannt"></span>Radar startet …</span>'
    + '<span class="feed-radar-map-radius"><span class="material-icons-round">radio_button_checked</span>' + _radarRadius + ' km</span></div>'
    + '<div class="feed-radar-legend"><span><i class="listing"></i>' + dienstleister + ' Dienstleister</span>'
    + '<span><i class="event"></i>' + aktivitaeten + ' Aktivitäten</span><span><i class="approx"></i>ca. = Stadtmitte</span></div></div>';

  if (!hits.length) {
    var next = RADAR_RADIEN.filter(function(r){ return r > _radarRadius; })[0];
    root.innerHTML = mapHtml + '<div class="release-empty feed-radar-empty"><span class="material-icons-round">travel_explore</span><h3>Noch keine Treffer in ' + _radarRadius + ' km</h3><p>Der Scan ist leer. Wähle eine andere Stadt oder erweitere den Radius.</p>' +
      (next ? '<button class="btn-primary" onclick="feedRadarRadius(' + next + ')">Auf ' + next + ' km erweitern</button>' : '') + '</div>' + (_aktZustand === 'laedt' ? '<p role="status">Aktivitäten werden geladen …</p>' : ebAktivitaetenLeermeldung(_radarRadius, _radarPos)) + ebAktivitaetenExternHtml(_radarPos);
    _initFeedRadarMap(hits);
    return;
  }
  root.innerHTML = mapHtml + '<div class="feed-radar-summary"><strong>' + hits.length + ' Möglichkeiten im Radar</strong><span>Tippe einen Marker oder Treffer an · nach Entfernung sortiert</span></div>' +
    '<div class="feed-radar-results">' + hits.map(function(hit, index){
      var d = hit.daten || {};
      var title = d.title || d.name || 'Aktivität';
      var image = (d.images && d.images[0]) || d.image || window.EB_IMG_FALLBACK;
      return '<article class="feed-radar-result" data-radar-index="' + index + '"' + _aiDisclosureAttrs(d) + '>' +
        '<button type="button" class="feed-radar-result-map" onclick="feedRadarFocus(' + index + ')" aria-label="' + _escHtml(title) + ' auf der Karte zeigen">' +
        '<span class="feed-radar-result-image"><img src="' + _escHtml(image) + '" alt="" loading="lazy"' + window.EB_IMG_ERR_ATTR + '></span><span><span class="radar-result-meta"><span>' + (hit.art === 'aktivitaet' ? 'EXTERNE AKTIVITÄT' : hit.art === 'event' ? 'DEMO-EVENT' : 'DIENSTLEISTER') + '</span><strong>' + _escHtml(radarEntfernung(hit.km)) + '</strong></span>' +
        '<strong class="feed-radar-result-title">' + _escHtml(title) + '</strong>' + _aiDisclosureLabelsHtml(d, 'ai-disclosure-radar-result') + '<small><span class="material-icons-round">location_on</span>' + _escHtml(hit.ort || '') + (hit.genau ? '' : ' · ca.') + '</small></span></button>' +
        '<button type="button" class="feed-radar-result-open" onclick="feedRadarOpen(' + index + ')" aria-label="' + _escHtml(title) + ' öffnen"><span class="material-icons-round">arrow_forward</span></button></article>';
    }).join('') + '</div>' + '<p class="akt-fuss">Externe Aktivitäten: OpenLigaDB und © OpenStreetMap-Mitwirkende (ODbL). Öffnungszeiten und Buchungen bei der Quelle prüfen.</p>' + ebAktivitaetenStarthilfe();
  _initFeedRadarMap(hits);
}

function feedRadarFocus(index) {
  if (!_feedRadarMap) return;
  var gruppe = _feedRadarMarkers.find(function(item) { return item.indexes.indexOf(index) !== -1; });
  if (!gruppe) return;
  var pos = gruppe.marker.getLatLng();
  _feedRadarMap.flyTo(pos, Math.max(_feedRadarMap.getZoom(), 12), { duration: .55 });
  gruppe.marker.openPopup();
  Array.prototype.forEach.call(document.querySelectorAll('.feed-radar-result'), function(card) {
    card.classList.toggle('active', Number(card.dataset.radarIndex) === index);
  });
  var map = document.getElementById('feedRadarMap');
  if (map) map.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function feedRadarOpen(index) {
  var hit = _feedRadarHits[index];
  if (!hit) return;
  if (hit.art === 'dienstleister') {
    navigateTo('detail', hit.daten.id);
    return;
  }
  _radarTrefferOeffnen(hit);
}
