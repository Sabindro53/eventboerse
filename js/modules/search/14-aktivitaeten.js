/* ══════════════════════════════════════════════════════════════════
   WAS IST JETZT IN MEINER NÄHE LOS — die Ansicht zum Aktivitäten-Bestand

   `scripts/aktivitaeten.mjs` beantwortet die Frage in Daten und schreibt
   sie nach `assets/eb-aktivitaeten.json`. Hier wird sie sichtbar.

   ── DREI LEERE ZUSTÄNDE, DIE NICHT DASSELBE SIND ──────────────────

   Der Bestand unterscheidet sorgfältig zwischen „nie abgerufen" und
   „abgerufen und nichts gefunden". Diese Unterscheidung ist wertlos,
   wenn die Ansicht beide als leere Liste zeigt — dann hat der Besucher
   wieder nur einen leeren Bildschirm vor sich, und niemand erkennt,
   ob die Seite kaputt ist oder die Gegend still.

   Deshalb hat jeder Zustand hier seinen eigenen Text:

     FEHLER   Die Datei kam nicht an. Das ist ein Defekt, und er wird
              als Defekt benannt.
     KALT     `stand: null` — der Abruf lief nie. Kein Fehler, aber
              auch keine Aussage über die Gegend.
     LEER     Abgerufen, aber im gewählten Umkreis liegt nichts. DAS
              ist eine Aussage über die Gegend, und der nächstgrößere
              Umkreis ist der offensichtliche nächste Schritt.

   ── FREMDER TEXT BLEIBT TEXT ──────────────────────────────────────

   Titel, Ortsnamen und Quell-Adressen stammen von OpenStreetMap und
   OpenLigaDB. Der Generator entschärft sie bereits; hier wird trotzdem
   jedes Feld maskiert und jede Adresse gegen `https://` geprüft. Eine
   ausgelieferte Datei kann veraltet oder verfälscht sein — dieselbe
   Begründung, aus der `_ebDemoFeedLoad()` die Ehrlichkeit des
   Demo-Feeds im Browser nachprüft, statt dem Generator zu glauben.

   ── DIE LIZENZ IST EINE ANZEIGEPFLICHT, KEINE FUSSNOTE ────────────

   OpenStreetMap steht unter ODbL: wer die Daten zeigt, muss die Quelle
   nennen. Der Hinweis steht deshalb in der Ansicht selbst, nicht im
   Impressum — und ein Test hält ihn fest.
   ══════════════════════════════════════════════════════════════════ */

var EB_AKT_DATEI = 'assets/eb-aktivitaeten.json';

var _aktBestand = null;
var _aktZustand = 'kalt';        // 'kalt' | 'laedt' | 'da' | 'fehler'

/** Wie viele Einträge je Abschnitt gezeigt werden. */
var EB_AKT_MAX = 24;

function ebAktivitaetenUrl() {
  var base = '';
  if (window.eventboerseApi && window.eventboerseApi.themeUrl) {
    base = String(window.eventboerseApi.themeUrl).replace(/\/$/, '');
  } else {
    var tag = document.querySelector('script[src*="app.js"]');
    if (tag) base = String(tag.src).replace(/\/app\.js.*$/, '');
  }
  return (base ? base + '/' : '') + EB_AKT_DATEI;
}

/**
 * Den Bestand einmal holen und merken.
 *
 * `fertig` wird IMMER gerufen, auch im Fehlerfall — eine Ansicht, die
 * bei einem Netzfehler einfach nichts tut, sieht aus wie eine Ansicht,
 * die noch lädt, und zwar für immer.
 */
function ebAktivitaetenLaden(fertig) {
  if (_aktZustand === 'da' || _aktZustand === 'fehler') { if (fertig) fertig(); return; }
  if (_aktZustand === 'laedt') return;
  _aktZustand = 'laedt';
  fetch(ebAktivitaetenUrl(), { credentials: 'same-origin' })
    .then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); })
    .then(function (d) {
      if (!d || typeof d !== 'object' || !Array.isArray(d.eintraege)) throw new Error('form');
      _aktBestand = d;
      _aktZustand = 'da';
    })
    .catch(function () { _aktBestand = null; _aktZustand = 'fehler'; })
    .then(function () { if (fertig) fertig(); });
}

/**
 * Ein Eintrag ohne eigene Koordinate zählt ab der Mitte des Bestands.
 *
 * Das betrifft die Fußballspiele: OpenLigaDB liefert Stadionname und
 * Stadt, aber keine Koordinaten. Sie deshalb wegzulassen wäre falsch —
 * ein Heimspiel ist die naheliegendste Aktivität überhaupt. Sie so
 * darzustellen, als sei die Entfernung gemessen, wäre aber ebenfalls
 * falsch. Also: gerechnet ab Stadtmitte, und genau das steht dann da.
 */
function ebAktivitaetPosition(eintrag, mitte) {
  var o = eintrag && eintrag.ort;
  if (o && typeof o.lat === 'number' && typeof o.lon === 'number') {
    return { lat: o.lat, lng: o.lon, genau: true };
  }
  if (mitte && typeof mitte.lat === 'number' && typeof mitte.lon === 'number') {
    return { lat: mitte.lat, lng: mitte.lon, genau: false };
  }
  return null;
}

/**
 * Was liegt im Umkreis und ist noch nicht vorbei?
 *
 * Vergangenes wird HIER ausgefiltert, nicht im Prüftor des Generators.
 * Das Tor lässt einen alten Abruf durch (er entsteht durch eine
 * ausgefallene Tagesroutine, nicht durch einen Commit) — die Ansicht
 * darf ihn trotzdem nicht zeigen. Ein Spiel von gestern als „was ist
 * jetzt los" anzubieten, ist schlimmer als eine kurze Liste.
 */
function ebAktivitaetenImUmkreis(bestand, pos, radiusKm, jetzt) {
  if (!bestand || !pos) return { termine: [], orte: [] };
  var now = jetzt || new Date();
  var termine = [];
  var orte = [];

  (bestand.eintraege || []).forEach(function (e) {
    var p = ebAktivitaetPosition(e, bestand.mitte);
    if (!p) return;
    var km = haversineKm(pos.lat, pos.lng, p.lat, p.lng);
    if (km > radiusKm) return;

    var satz = { daten: e, km: km, genau: p.genau };

    if (e.beginn) {
      var d = new Date(e.beginn);
      if (isNaN(d.getTime()) || d <= now) return;   // vorbei oder unlesbar
      satz.wann = d;
      termine.push(satz);
    } else {
      orte.push(satz);
    }
  });

  termine.sort(function (a, b) { return a.wann - b.wann; });
  orte.sort(function (a, b) { return a.km - b.km; });
  return { termine: termine, orte: orte };
}

/** „heute 20:30" · „morgen 15:30" · „Sa, 19.09. um 15:30" */
function ebAktivitaetZeit(d, jetzt) {
  var now = jetzt || new Date();
  var uhr = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  var tag0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var tagX = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  var tage = Math.round((tagX - tag0) / 86400000);
  if (tage === 0) return 'heute ' + uhr;
  if (tage === 1) return 'morgen ' + uhr;
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })
    + ' um ' + uhr;
}

/**
 * Die Quellenzeile eines Eintrags.
 *
 * Bei ODbL ist das Lizenzbedingung, nicht Höflichkeit. Die Adresse wird
 * nur verlinkt, wenn sie wirklich `https://` ist — eine verfälschte
 * Datei könnte sonst `javascript:` unterschieben, und ein Link ist
 * genau die Stelle, an der so etwas ausgeführt würde.
 */
function ebAktivitaetQuelle(q) {
  if (!q || !q.name) return '';
  var name = _escHtml(String(q.name));
  var url = typeof q.url === 'string' && /^https:\/\//.test(q.url) ? q.url : null;
  return url
    ? '<a class="akt-quelle" href="' + _escHtml(url) + '" target="_blank" rel="noopener noreferrer">' + name + '</a>'
    : '<span class="akt-quelle">' + name + '</span>';
}

/** OSM-Kategorie → Symbol. Unbekanntes bekommt `place`, nie einen leeren Kasten. */
var EB_AKT_ICON = {
  'Kino': 'local_movies',
  'Escape-Room': 'lock',
  'Kletterhalle': 'terrain',
  'Erlebnisbad': 'pool',
  'Museum': 'museum',
  'Zoo': 'pets',
  'Theater': 'theater_comedy',
};

function ebAktivitaetKarte(t, mitZeit, jetzt) {
  var e = t.daten;
  var symbol = e.art === 'sport' ? 'sports_soccer' : (EB_AKT_ICON[e.kategorie] || 'place');
  var ortText = (e.ort && e.ort.stadt) ? e.ort.stadt : '';
  return '<article class="akt-karte">'
    + '<span class="material-icons-round akt-icon">' + symbol + '</span>'
    + '<div class="akt-text">'
    + '<h4>' + _escHtml(String(e.titel || 'Ohne Titel')) + '</h4>'
    + '<p class="akt-meta">'
    + (mitZeit && t.wann ? '<b>' + _escHtml(ebAktivitaetZeit(t.wann, jetzt)) + '</b> · ' : '')
    + (e.kategorie ? _escHtml(String(e.kategorie)) + ' · ' : '')
    + (e.ort && e.ort.name && e.ort.name !== e.titel ? _escHtml(String(e.ort.name)) + ' · ' : '')
    + _escHtml(ortText)
    + '</p>'
    + '<p class="akt-herkunft">' + ebAktivitaetQuelle(e.quelle) + '</p>'
    + '</div>'
    + '<span class="akt-km">' + _escHtml(radarEntfernung(t.km))
    + (t.genau ? '' : '<small>ab Stadtmitte</small>') + '</span>'
    + '</article>';
}

/**
 * Der leere Fall — und WELCHER leere Fall es ist.
 *
 * Das ist der Kern dieser Ansicht. Wer hier alle drei Zustände in eine
 * Meldung zusammenfasst, macht die Ehrlichkeit des Bestands wieder
 * unsichtbar.
 */
function ebAktivitaetenLeermeldung(radiusKm) {
  if (_aktZustand === 'fehler') {
    return '<div class="akt-leer akt-leer-fehler">'
      + '<span class="material-icons-round">cloud_off</span>'
      + '<h4>Die Liste konnte nicht geladen werden.</h4>'
      + '<p>Das ist eine Störung bei uns, nicht bei dir. Versuch es gleich noch einmal.</p>'
      + '<button type="button" class="btn-outline" onclick="feedJetztNeuLaden()">Erneut versuchen</button>'
      + '</div>';
  }
  if (!_aktBestand || _aktBestand.stand === null) {
    return '<div class="akt-leer">'
      + '<span class="material-icons-round">schedule</span>'
      + '<h4>Noch nichts abgerufen.</h4>'
      + '<p>Die Liste wird einmal täglich aus öffentlichen Quellen zusammengestellt. '
      + 'Der erste Abruf steht noch aus — das heißt nicht, dass hier nichts los ist.</p>'
      + '</div>';
  }
  var groesser = RADAR_RADIEN.filter(function (r) { return r > radiusKm; })[0];
  return '<div class="akt-leer">'
    + '<span class="material-icons-round">explore_off</span>'
    + '<h4>Im Umkreis von ' + radiusKm + ' km ist gerade nichts eingetragen.</h4>'
    + '<p>Das ist eine Aussage über die Gegend, kein Fehler.</p>'
    + (groesser ? '<button type="button" class="btn-outline" onclick="feedJetztRadius('
      + groesser + ')">Auf ' + groesser + ' km erweitern</button>' : '')
    + '</div>';
}

/** Die ganze Ansicht zeichnen. */
function renderFeedJetzt(container) {
  if (!container) return;

  if (_aktZustand === 'kalt' || _aktZustand === 'laedt') {
    container.innerHTML = '<section class="akt-karte-huelle"><p class="akt-laedt">Liste wird geladen …</p></section>';
    ebAktivitaetenLaden(function () {
      var jetztAktiv = document.querySelector('#page-aktuelles .feed-tab[data-feed="jetzt"].active');
      if (jetztAktiv) renderFeedJetzt(document.getElementById('feedList'));
    });
    return;
  }

  if (!radarStand().pos) radarWiederherstellen();
  if (!radarStand().pos) radarStadtWaehlen('Köln');
  var stand = radarStand();
  var ortName = radarOrtsname(stand.pos.lat, stand.pos.lng) || 'deinem Ort';

  var gefunden = ebAktivitaetenImUmkreis(_aktBestand, stand.pos, stand.radius, new Date());
  var jetzt = new Date();

  var chips = RADAR_RADIEN.map(function (km) {
    return '<button type="button" class="radar-chip' + (km === stand.radius ? ' aktiv' : '')
      + '" onclick="feedJetztRadius(' + km + ')">' + km + ' km</button>';
  }).join('');

  var kopf = '<div class="feed-radar-head"><div>'
    + '<span class="release-kicker">JETZT IN DEINER NÄHE</span>'
    + '<h2><span class="material-icons-round">bolt</span> Was kannst du gerade machen?</h2>'
    + '<p>Termine und Orte im Umkreis von ' + _escHtml(ortName) + ' — aus öffentlichen Quellen.</p>'
    + '</div>'
    + '<button class="btn-primary" type="button" onclick="feedJetztGeo()">'
    + '<span class="material-icons-round">my_location</span> Mein Standort</button></div>'
    + '<div class="feed-radar-controls"><div><span class="radar-control-label">Umkreis</span>'
    + '<div class="radar-chip-row">' + chips + '</div></div></div>';

  var koerper;
  if (!gefunden.termine.length && !gefunden.orte.length) {
    koerper = ebAktivitaetenLeermeldung(stand.radius);
  } else {
    koerper = '';
    if (gefunden.termine.length) {
      koerper += '<h3 class="akt-gruppe"><span class="material-icons-round">event</span> Demnächst</h3>'
        + gefunden.termine.slice(0, EB_AKT_MAX).map(function (t) {
          return ebAktivitaetKarte(t, true, jetzt);
        }).join('');
    }
    if (gefunden.orte.length) {
      koerper += '<h3 class="akt-gruppe"><span class="material-icons-round">place</span> Jederzeit</h3>'
        + gefunden.orte.slice(0, EB_AKT_MAX).map(function (t) {
          return ebAktivitaetKarte(t, false, jetzt);
        }).join('');
    }
  }

  // Die Quellenangabe steht IMMER da, auch im leeren Fall: sie erklärt,
  // woher die Liste kommt, und genau das will jemand wissen, der nichts
  // sieht. Bei ODbL ist sie ausserdem Lizenzbedingung.
  var quellen = (_aktBestand && Array.isArray(_aktBestand.quellen) ? _aktBestand.quellen : [])
    .map(function (q) { return _escHtml(String(q.name)) + ' (' + _escHtml(String(q.lizenz)) + ')'; })
    .join(' · ');
  var fuss = '<p class="akt-fuss"><span class="material-icons-round">info</span> '
    + (quellen ? 'Quellen: ' + quellen : 'Quellen werden mit der Liste geladen.')
    + (_aktBestand && _aktBestand.stand
      ? ' · Stand: ' + _escHtml(new Date(_aktBestand.stand).toLocaleDateString('de-DE',
        { day: '2-digit', month: '2-digit', year: 'numeric' }))
      : '')
    + '</p>';

  container.innerHTML = '<section class="feed-radar-card akt-karte-huelle">'
    + kopf + '<div class="akt-liste">' + koerper + '</div>' + fuss + '</section>';
}

function feedJetztRadius(km) {
  radarRadiusSetzen(km);
  renderFeedJetzt(document.getElementById('feedList'));
}

function feedJetztGeo() {
  radarStandortErfragen(function (pos) {
    if (pos) renderFeedJetzt(document.getElementById('feedList'));
  });
}

/** Nach einem Ladefehler noch einmal versuchen — sonst bleibt der Zustand kleben. */
function feedJetztNeuLaden() {
  _aktZustand = 'kalt';
  renderFeedJetzt(document.getElementById('feedList'));
}
