/* ══════════════════════════════════════════════════════════════════
   WAS IST JETZT IN MEINER NÄHE LOS — die Ansicht zum Aktivitäten-Bestand

   `scripts/aktivitaeten.mjs` beantwortet die Frage in Daten und schreibt
   sie nach `assets/eb-aktivitaeten.json`. Hier wird sie sichtbar.

   ── VIER LEERE ZUSTÄNDE, DIE NICHT DASSELBE SIND ──────────────────

   Der Bestand unterscheidet sorgfältig zwischen „nie abgerufen" und
   „abgerufen und nichts gefunden". Diese Unterscheidung ist wertlos,
   wenn die Ansicht beide als leere Liste zeigt — dann hat der Besucher
   wieder nur einen leeren Bildschirm vor sich, und niemand erkennt,
   ob die Seite kaputt ist oder die Gegend still.

   Deshalb hat jeder Zustand hier seinen eigenen Text:

     FEHLER      Die Datei kam nicht an. Das ist ein Defekt, und er
                 wird als Defekt benannt.
     KALT        `stand: null` — der Abruf lief nie. Kein Fehler, aber
                 auch keine Aussage über die Gegend.
     UNERFASST   Der Ort liegt ausserhalb aller `gebiete`. Wir haben
                 hier nie nachgesehen — und sagen genau das. Bis zum
                 09.09.2026 kam hier der Satz darunter, also eine
                 Auskunft über eine Gegend ohne einen einzigen Abruf.
     LEER        Abgerufen, IM erfassten Gebiet, und im gewählten
                 Umkreis liegt nichts. DAS ist eine Aussage über die
                 Gegend, und der nächstgrößere Umkreis ist der
                 offensichtliche nächste Schritt.

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

/**
 * Die Basis kommt aus `ebAssetUrl()` — EINMAL beim Laden bestimmt.
 *
 * Hier stand die Auflösung selbst, aus zwei anderen Modulen abgeschrieben.
 * Sie war auf Unterrouten falsch: `tag.src` wird bei jedem Zugriff gegen
 * `document.baseURI` gerechnet, und `pushState` verschiebt den. Auf
 * `/aktuelles/jetzt` — also genau dort, wo diese Ansicht lebt — landete die
 * Anfrage bei `/aktuelles/assets/…` und damit im 404. Begründung und Messung
 * stehen bei `EB_THEME_BASIS` in `core/00-basis.js`.
 */
function ebAktivitaetenUrl() {
  return ebAssetUrl(EB_AKT_DATEI);
}

/**
 * Den Bestand einmal holen und merken.
 *
 * `fertig` wird IMMER gerufen, auch im Fehlerfall — eine Ansicht, die
 * bei einem Netzfehler einfach nichts tut, sieht aus wie eine Ansicht,
 * die noch lädt, und zwar für immer.
 */
var _aktLadeVorgang = null;
function ebAktivitaetenLaden(fertig) {
  if (_aktZustand === 'da' || _aktZustand === 'fehler') {
    if (fertig) fertig();
    return Promise.resolve(_aktBestand);
  }
  if (!_aktLadeVorgang) {
    _aktZustand = 'laedt';
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 10000) : null;
    _aktLadeVorgang = fetch(ebAktivitaetenUrl(), {
      credentials: 'same-origin', signal: controller ? controller.signal : undefined,
    }).then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); })
      .then(function (d) {
        if (!d || typeof d !== 'object' || !Array.isArray(d.eintraege)) throw new Error('form');
        _aktBestand = d;
        _aktZustand = 'da';
      }).catch(function () { _aktBestand = null; _aktZustand = 'fehler'; })
      .then(function () {
        if (timer) clearTimeout(timer);
        _aktLadeVorgang = null;
        return _aktBestand;
      });
  }
  // Every caller is notified, including callers arriving during the request.
  return _aktLadeVorgang.then(function (bestand) { if (fertig) fertig(); return bestand; });
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
  if (o && typeof o.lat === 'number' && typeof o.lon === 'number'
      && isFinite(o.lat) && isFinite(o.lon) && Math.abs(o.lat) <= 90 && Math.abs(o.lon) <= 180) {
    // `ungefaehr` ist die Kennzeichnung des Generators für eine Koordinate,
    // die die Mitte eines Gebiets ist und nicht die des Ortes — bei den
    // Fußballspielen der Fall. Ohne sie sähe eine Stadtmitte aus wie eine
    // Messung. Der Rückfall darunter gilt Dateien von vor der
    // Mehrstadt-Umstellung, die dort schlicht `null` stehen hatten.
    return { lat: o.lat, lng: o.lon, genau: o.ungefaehr !== true };
  }
  if (mitte && typeof mitte.lat === 'number' && typeof mitte.lon === 'number') {
    return { lat: mitte.lat, lng: mitte.lon, genau: false };
  }
  return null;
}

/* ══════════════════════════════════════════════════════════════════
   ABDECKUNG — worüber diese Datei überhaupt etwas aussagt

   Bis zum 09.09.2026 kannte die Ansicht nur einen Punkt: die Mitte des
   Bestands. Wer in Berlin stand, bekam „im Umkreis von 50 km ist gerade
   nichts eingetragen" — eine Aussage ÜBER BERLIN, abgegeben über eine
   Gegend, in die wir nie gesehen hatten.

   Das ist dieselbe Fehlerklasse wie der tote Gitleaks-Scan: eine
   Entwarnung, die der Prüfer nicht decken kann. Sie ist hier sogar
   teurer, weil sie beim Besucher landet und nicht im Log.

   `gebiete` in der Datei nennt die Städte, für die wirklich abgerufen
   wurde. Alles ausserhalb heisst **nicht erfasst** — und genau das
   steht dann da.
   ══════════════════════════════════════════════════════════════════ */

/**
 * Die erfassten Gebiete eines Bestands.
 *
 * Der Rückfall auf `mitte`/`umkreisKm` gilt Dateien von vor der
 * Umstellung. Er ist keine Bequemlichkeit: ohne ihn hielte die Ansicht
 * eine ältere, vollständig gültige Datei für „nichts erfasst" und
 * verweigerte die Auskunft, die sie geben könnte.
 */
function ebAktivitaetenGebiete(bestand) {
  if (!bestand || typeof bestand !== 'object') return [];
  var roh = Array.isArray(bestand.gebiete) ? bestand.gebiete : null;
  if (roh) {
    return roh.filter(function (g) {
      return g && typeof g.lat === 'number' && typeof g.lon === 'number'
        && typeof g.umkreisKm === 'number' && g.umkreisKm > 0;
    });
  }
  var m = bestand.mitte;
  if (m && typeof m.lat === 'number' && typeof m.lon === 'number') {
    return [{
      stadt: m.stadt,
      lat: m.lat,
      lon: m.lon,
      umkreisKm: typeof bestand.umkreisKm === 'number' ? bestand.umkreisKm : 50,
    }];
  }
  return [];
}

/** Liegt dieser Ort in einem erfassten Gebiet? Sonst null. */
function ebAktivitaetGebietVon(gebiete, pos) {
  if (!pos) return null;
  var treffer = null;
  var kuerzeste = Infinity;
  (gebiete || []).forEach(function (g) {
    var d = haversineKm(pos.lat, pos.lng, g.lat, g.lon);
    if (d <= g.umkreisKm && d < kuerzeste) { kuerzeste = d; treffer = g; }
  });
  return treffer;
}

/** Das nächstgelegene erfasste Gebiet — auch wenn der Ort ausserhalb liegt. */
function ebAktivitaetNaechstesGebiet(gebiete, pos) {
  var beste = -1;
  var kuerzeste = Infinity;
  (gebiete || []).forEach(function (g, i) {
    var d = pos ? haversineKm(pos.lat, pos.lng, g.lat, g.lon) : i;
    if (d < kuerzeste) { kuerzeste = d; beste = i; }
  });
  return beste;
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
    if (!e || e.abgesagt || /cancelled|canceled|postponed/.test(e.status || '')) return;
    var gebiet = (bestand.gebiete || []).find(function (g) { return g.stadt === e.gebiet || (e.ort && g.stadt === e.ort.stadt); });
    var p = ebAktivitaetPosition(e, gebiet || bestand.mitte);
    if (!p) return;
    var km = haversineKm(pos.lat, pos.lng, p.lat, p.lng);
    if (km > radiusKm) return;

    var satz = { daten: e, km: km, genau: p.genau };

    if (e.beginn) {
      var d = new Date(e.beginn);
      var ende = e.ende ? new Date(e.ende) : null;
      if (isNaN(d.getTime()) || (d <= now && (!ende || isNaN(ende.getTime()) || ende <= now))) return;
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

/** Shared activity filters for Jetzt and both radar views. Unknown opening hours
 * stay unknown; a place is an idea, never a promise that it is open. */
var _aktZeit = 'alle';
var _aktKategorie = '';
function ebAktivitaetPasst(e, jetzt) {
  if (!e) return false;
  if (_aktKategorie && (e.art === 'sport' ? 'Sport' : e.kategorie) !== _aktKategorie) return false;
  if (!e.beginn || _aktZeit === 'alle') return true;
  var now = jetzt || new Date();
  var start = new Date(e.beginn);
  var end = e.ende ? new Date(e.ende) : start;
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
  var from = now, to;
  if (_aktZeit === 'jetzt') to = new Date(now.getTime() + 4 * 3600000);
  if (_aktZeit === 'heute') to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (_aktZeit === 'wochenende') {
    var friday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    friday.setDate(friday.getDate() + (now.getDay() === 0 ? -2 : 5 - now.getDay()));
    var monday = new Date(friday); monday.setDate(monday.getDate() + 3);
    from = friday > now ? friday : now; to = monday;
  }
  return !!to && end >= from && start < to;
}

function ebAktivitaetenGefiltert(bestand, pos, radius, now) {
  var alle = ebAktivitaetenImUmkreis(bestand, pos, radius, now);
  return {
    termine: alle.termine.filter(function (t) { return ebAktivitaetPasst(t.daten, now); }),
    orte: alle.orte.filter(function (t) { return ebAktivitaetPasst(t.daten, now); }),
  };
}

function ebAktivitaetenFilterHtml(ohneOrt) {
  var stadt = radarStand().pos ? radarOrtsname(radarStand().pos.lat, radarStand().pos.lng) : '';
  var cities = Object.keys(RADAR_ORTE).sort(function(a,b) { return a.localeCompare(b, 'de'); });
  var kategorien = ['Sport', 'Kino', 'Museum', 'Theater', 'Zoo', 'Escape-Room', 'Kletterhalle', 'Erlebnisbad'];
  var zeiten = [['jetzt', 'Nächste 4 Stunden'], ['heute', 'Heute'], ['wochenende', 'Wochenende'], ['alle', 'Alle Termine']];
  return '<div class="akt-filter"><label' + (ohneOrt ? ' hidden' : '') + '>Ort<select id="feedJetztCity" onchange="feedJetztStadt(this.value)">'
    + '<option value="">Standort wählen</option>'
    + cities.map(function(c) { return '<option value="' + _escHtml(c) + '"' + (c === stadt ? ' selected' : '') + '>' + _escHtml(c) + '</option>'; }).join('')
    + '</select></label><label>Aktivität<select id="feedJetztCategory" onchange="feedJetztKategorie(this.value)"><option value="">Alles entdecken</option>'
    + kategorien.map(function(c) { return '<option' + (c === _aktKategorie ? ' selected' : '') + '>' + _escHtml(c) + '</option>'; }).join('')
    + '</select></label><div class="akt-filter-time"><span class="radar-control-label">Termine</span><div class="radar-chip-row">'
    + zeiten.map(function(z) { return '<button type="button" class="radar-chip' + (z[0] === _aktZeit ? ' aktiv' : '') + '" aria-pressed="' + (z[0] === _aktZeit) + '" onclick="feedJetztZeit(\'' + z[0] + '\')">' + z[1] + '</button>'; }).join('')
    + '</div></div></div>';
}

function feedJetztAktualisieren() {
  if (document.getElementById('feedRadarResults')) renderFeedRadar(document.getElementById('feedList'));
  else renderFeedJetzt(document.getElementById('feedList'));
}
function feedJetztStadt(name) { if (radarStadtWaehlen(name)) feedJetztAktualisieren(); }
function feedJetztKategorie(value) { _aktKategorie = String(value || ''); feedJetztAktualisieren(); }
function feedJetztZeit(value) {
  if (['alle', 'jetzt', 'heute', 'wochenende'].indexOf(value) < 0) return;
  _aktZeit = value; feedJetztAktualisieren();
}
function feedJetztFilterLoeschen() { _aktKategorie = ''; _aktZeit = 'alle'; feedJetztAktualisieren(); }

function ebAktivitaetPlanen(id) {
  var e = (_aktBestand && _aktBestand.eintraege || []).find(function(x) { return String(x.id) === String(id); });
  if (!e) return;
  var options = {
    intent: 'friends', title: String(e.titel || 'Gemeinsamer Ausflug'),
    location: e.ort && e.ort.stadt || '', date: e.beginn ? String(e.beginn).slice(0, 10) : '',
    activity: { id: e.id, title: e.titel, sourceName: e.quelle && e.quelle.name || '',
      sourceUrl: e.quelle && /^https:\/\//.test(e.quelle.url || '') ? e.quelle.url : '' },
  };
  if (typeof startPlanningBoard === 'function') startPlanningBoard(options);
  else navigateTo('freunde');
}

function ebAktivitaetenExternHtml(pos) {
  var ort = pos ? radarOrtsname(pos.lat, pos.lng) || '' : '';
  var q = encodeURIComponent('Events ' + ort);
  return '<div class="akt-extern"><h3>Mehr in deiner Umgebung entdecken</h3><p>Externe Suche: Termine, Verfügbarkeit und Buchungen prüfst du beim jeweiligen Anbieter. Für diese Angebote gilt kein Buchungsschutz von Eventbörse.</p>'
    + '<div class="akt-start-knoepfe"><a class="btn-outline" href="https://www.facebook.com/search/events/?q=' + q + '" target="_blank" rel="noopener noreferrer">Facebook Events ↗</a>'
    + '<a class="btn-outline" href="https://www.ticketmaster.de/search?q=' + encodeURIComponent(ort) + '" target="_blank" rel="noopener noreferrer">Ticketmaster ↗</a></div></div>';
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
    + '<p class="akt-herkunft">' + ebAktivitaetQuelle(e.quelle) + ' · Extern</p>'
    + (!mitZeit ? '<small class="akt-opening">Öffnungszeiten und Verfügbarkeit bitte bei der Quelle prüfen.</small>' : '')
    + '<button type="button" class="akt-plan-btn" onclick="ebAktivitaetPlanen(' + _escHtml(JSON.stringify(String(e.id))) + ')">Mit Freunden planen</button>'
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
function ebAktivitaetenLeermeldung(radiusKm, pos) {
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

  // ── NICHT ERFASST ist keine Aussage über die Gegend ──────────────────
  //
  // Der Satz darunter („hier ist gerade nichts eingetragen") behauptet,
  // wir hätten nachgesehen. Ausserhalb der erfassten Gebiete stimmt das
  // nicht, und die Verwechslung ist der ganze Grund für diesen Zweig.
  var gebiete = ebAktivitaetenGebiete(_aktBestand);
  if (gebiete.length && !ebAktivitaetGebietVon(gebiete, pos)) {
    var i = ebAktivitaetNaechstesGebiet(gebiete, pos);
    var naechstes = gebiete[i];
    return '<div class="akt-leer akt-leer-unerfasst">'
      + '<span class="material-icons-round">travel_explore</span>'
      + '<h4>Diese Gegend ist noch nicht erfasst.</h4>'
      + '<p>Wir stellen die Liste bisher für '
      + gebiete.map(function (g) { return _escHtml(String(g.stadt || '?')); }).join(', ')
      + ' zusammen. Dass hier nichts steht, heißt <strong>nicht</strong>, dass hier '
      + 'nichts los ist — wir haben hier noch nicht nachgesehen.</p>'
      + (naechstes
        ? '<button type="button" class="btn-outline" onclick="feedJetztGebiet(' + i + ')">'
          + '<span class="material-icons-round">place</span> In '
          + _escHtml(String(naechstes.stadt || 'einem erfassten Gebiet')) + ' umsehen</button>'
        : '')
      + '</div>';
  }

  var groesser = RADAR_RADIEN.filter(function (r) { return r > radiusKm; })[0];
  return '<div class="akt-leer">'
    + '<span class="material-icons-round">explore_off</span>'
    + '<h4>Im Umkreis von ' + radiusKm + ' km ist gerade nichts eingetragen.</h4>'
    + '<p>In unseren erfassten Quellen gibt es dafür keine Treffer. Das ist kein Fehler und keine vollständige Übersicht aller Angebote vor Ort.</p>'
    + (groesser ? '<button type="button" class="btn-outline" onclick="feedJetztRadius('
      + groesser + ')">Auf ' + groesser + ' km erweitern</button>' : '')
    + '</div>';
}

/**
 * „Du weißt nicht, was — nur DASS."
 *
 * Der Wunsch, der hinter dieser Ansicht steht, endet nicht bei einer
 * Liste: wer nichts Passendes findet, will trotzdem etwas unternehmen.
 * Deshalb steht der Weg dorthin IMMER da — auch unter einer vollen
 * Liste, nicht nur im leeren Fall. Eine Ansicht, die nur im Scheitern
 * einen Ausweg anbietet, hat den Ausweg als Trostpflaster gebaut.
 */
function ebAktivitaetenStarthilfe() {
  return '<div class="akt-start">'
    + '<h4><span class="material-icons-round">rocket_launch</span> Selbst etwas starten</h4>'
    + '<p>Nichts dabei? Dann plane dein eigenes Vorhaben — allein oder mit anderen.</p>'
    + '<div class="akt-start-knoepfe">'
    + '<button type="button" class="btn-primary" onclick="startPlanningBoard({intent: \'custom\'})">'
    + '<span class="material-icons-round">dashboard</span> Vorhaben planen</button>'
    + '<button type="button" class="btn-outline" onclick="startPlanningBoard({intent: \'friends\'})">'
    + '<span class="material-icons-round">groups</span> Mit Freunden</button>'
    + '<button type="button" class="btn-outline" onclick="navigateTo(\'browse\')">'
    + '<span class="material-icons-round">search</span> Dienstleister finden</button>'
    + '</div></div>';
}

/** Die ganze Ansicht zeichnen. */
/* ============================================================================
 * „DEMNÄCHST" IN DER SEITENLEISTE — echte Termine oder gar keine
 *
 * Bis zum 14.09.2026 stand hier eine fest verdrahtete Liste, in
 * `board/42-guide-social-feed.js`:
 *
 *   Rock Festival Berlin  · 12. Sep 2026
 *   Hochzeitsmesse Köln   · 20. Sep 2026
 *   Oktoberfest Opening   · 19. Okt 2026
 *
 * Drei erfundene Termine unter der Überschrift „Demnächst" — und am
 * 14.09.2026 lag der erste davon bereits in der VERGANGENHEIT. Eine
 * Liste, die mit der Zeit unwahr wird, ohne dass jemand etwas ändert:
 * dieselbe Klasse wie ein Prüfer, der nicht mehr prüft, nur an der
 * Oberfläche und mit Datum.
 *
 * Sie steht jetzt HIER statt dort, weil hier der Bestand liegt. Ein
 * zweiter Lader wäre eine zweite Wahrheit; `ebAktivitaetenImUmkreis()`
 * wirft Vergangenes und Abgesagtes ohnehin schon heraus, und der Radar
 * weiss, wo der Besucher steht.
 *
 * Die Karte ist schmal, die Meldungen sind kurz — aber sie bleiben
 * VERSCHIEDEN. „noch nicht abgerufen", „Gegend nicht erfasst" und „nichts
 * im Umkreis" sind drei verschiedene Aussagen; sie zusammenzuziehen macht
 * die Sorgfalt des Bestands wieder unsichtbar, und genau dafür gibt es
 * die vier Zustände der Jetzt-Ansicht.
 * ========================================================================= */

var EB_SEITENLEISTE_TERMINE = 3;

function _seitenleisteHinweis(text) {
  return '<p class="sidebar-upcoming-hinweis">' + _escHtml(String(text)) + '</p>';
}

function _seitenleisteMehr(text) {
  return '<button type="button" class="sidebar-upcoming-mehr" '
    + 'onclick="navigateTo(\'aktuelles\', \'jetzt\')">' + _escHtml(String(text)) + '</button>';
}

/** Füllt „Demnächst" in der Feed-Seitenleiste. Gibt die Zahl der Termine zurück. */
function renderSidebarUpcoming() {
  var el = document.getElementById('sidebarUpcoming');
  if (!el) return 0;

  if (_aktZustand === 'kalt' || _aktZustand === 'laedt') {
    el.innerHTML = _seitenleisteHinweis('Termine werden geladen …');
    ebAktivitaetenLaden(function () { renderSidebarUpcoming(); });
    return 0;
  }
  if (_aktZustand === 'fehler') {
    el.innerHTML = _seitenleisteHinweis('Die Terminliste ist gerade nicht abrufbar.');
    return 0;
  }
  if (!_aktBestand || _aktBestand.stand === null) {
    el.innerHTML = _seitenleisteHinweis('Noch nichts abgerufen — das heisst nicht, '
      + 'dass nichts los ist.');
    return 0;
  }

  // ── DIESE KARTE LIEST DEN RADAR, SIE STEUERT IHN NICHT ───────────────
  //
  // Der erste Entwurf rief hier `radarPositionSetzen()`, wenn noch keine
  // Position bekannt war — abgeschrieben von `renderFeedJetzt()`, wo es
  // richtig ist. Hier ist es falsch: `renderFeed()` ruft diese Karte VOR
  // der Radar-Ansicht, und der Radar ist geteilter Zustand. Die
  // Seitenleiste verschob damit die Karte einer anderen Ansicht.
  //
  // `radar.spec.js` hat es prompt gemeldet — „Marker-Popups bleiben im
  // Dark Mode deutlich lesbar" fiel in zwei von drei Läufen aus, weil
  // `feedRadarFocus(0)` danach auf einen anderen Marker zielte. Auf
  // `main` lief derselbe Test dreimal grün. Eine Nebenwirkung, die als
  // Flackern eines fremden Tests auftritt, ist die unauffälligste Sorte.
  //
  // Ohne bekannte Position rechnet die Karte deshalb LOKAL ab dem ersten
  // erfassten Gebiet und schreibt nichts zurück.
  if (!radarStand().pos) radarWiederherstellen();
  var stand = radarStand();
  var pos = stand.pos;
  var radius = stand.radius;
  if (!pos) {
    var erstes = ebAktivitaetenGebiete(_aktBestand)[0];
    if (!erstes) {
      el.innerHTML = _seitenleisteHinweis('Kein Ort bekannt.');
      return 0;
    }
    pos = { lat: erstes.lat, lng: erstes.lon };
    radius = erstes.umkreisKm || radius;
  }

  var gebiete = ebAktivitaetenGebiete(_aktBestand);
  if (gebiete.length && !ebAktivitaetGebietVon(gebiete, pos)) {
    el.innerHTML = _seitenleisteHinweis('Deine Gegend ist noch nicht erfasst.')
      + _seitenleisteMehr('Erfasste Städte ansehen');
    return 0;
  }

  var jetzt = new Date();
  var termine = ebAktivitaetenImUmkreis(_aktBestand, pos, radius, jetzt).termine;
  if (!termine.length) {
    el.innerHTML = _seitenleisteHinweis('Im Umkreis von ' + radius
      + ' km ist gerade nichts eingetragen.');
    return 0;
  }

  var zeige = termine.slice(0, EB_SEITENLEISTE_TERMINE);
  // Fremder Text, zweimal entschärft — der Generator maskiert, die Ansicht
  // maskiert erneut. Eine ausgelieferte Datei kann veraltet oder
  // verfälscht sein.
  el.innerHTML = zeige.map(function (t) {
    return '<div class="sidebar-event-item">'
      + '<div class="sidebar-event-dot"><span class="material-icons-round">event</span></div>'
      + '<div><strong>' + _escHtml(String(t.daten.titel || 'Termin')) + '</strong>'
      + '<span>' + _escHtml(ebAktivitaetZeit(t.wann, jetzt)) + '</span></div>'
      + '</div>';
  }).join('') + _seitenleisteMehr('Alle Termine ansehen');
  return zeige.length;
}

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

  // Ohne bekannte Position: das erste erfasste Gebiet. „Köln" fest
  // hineinzuschreiben wäre nach der Mehrstadt-Umstellung eine zweite
  // Wahrheit über die Abdeckung — und die driftet.
  if (!radarStand().pos) radarWiederherstellen();
  if (!radarStand().pos) {
    var erstes = ebAktivitaetenGebiete(_aktBestand)[0];
    if (erstes) radarPositionSetzen(erstes.lat, erstes.lon, 'stadt');
  }
  if (!radarStand().pos) radarStadtWaehlen('Köln');
  var stand = radarStand();
  if (!stand.pos) {
    // Kein Ort, keine Aussage. Vorher wäre hier auf `stand.pos.lat`
    // zugegriffen worden — ein leerer Reiter mit einem Fehler in der
    // Konsole statt einer Auskunft.
    container.innerHTML = '<section class="akt-karte-huelle"><div class="akt-leer">'
      + '<span class="material-icons-round">my_location</span>'
      + '<h4>Wo bist du gerade?</h4>'
      + '<p>Ohne Ort lässt sich nicht sagen, was in deiner Nähe los ist.</p>'
      + '<button type="button" class="btn-primary" onclick="feedJetztGeo()">'
      + '<span class="material-icons-round">my_location</span> Standort verwenden</button>'
      + '</div></section>';
    return;
  }
  var ortName = radarOrtsname(stand.pos.lat, stand.pos.lng) || 'deinem Ort';

  var ungefiltert = ebAktivitaetenImUmkreis(_aktBestand, stand.pos, stand.radius, new Date());
  var gefunden = ebAktivitaetenGefiltert(_aktBestand, stand.pos, stand.radius, new Date());
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
    + '<div class="radar-chip-row">' + chips + '</div></div></div>' + ebAktivitaetenFilterHtml();

  var koerper;
  if (!gefunden.termine.length && !gefunden.orte.length) {
    koerper = ungefiltert.termine.length || ungefiltert.orte.length
      ? '<div class="akt-leer"><h4>Für diese Auswahl ist nichts eingetragen.</h4><p>Andere Zeiten oder Aktivitäten können passen.</p><button type="button" class="btn-outline" onclick="feedJetztFilterLoeschen()">Alle Aktivitäten zeigen</button></div>'
      : ebAktivitaetenLeermeldung(stand.radius, stand.pos);
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
  var stale = _aktBestand && _aktBestand.stand && Date.now() - new Date(_aktBestand.stand).getTime() > 2 * 86400000;
  var fuss = (stale ? '<p class="akt-stale" role="status">Der Datenstand ist älter als zwei Tage. Prüfe aktuelle Termine und Öffnungszeiten direkt bei der Quelle.</p>' : '') + '<p class="akt-fuss"><span class="material-icons-round">info</span> '
    + (quellen ? 'Quellen: ' + quellen : 'Quellen werden mit der Liste geladen.')
    + (_aktBestand && _aktBestand.stand
      ? ' · Stand: ' + _escHtml(new Date(_aktBestand.stand).toLocaleDateString('de-DE',
        { day: '2-digit', month: '2-digit', year: 'numeric' }))
      : '')
    + '</p>';

  container.innerHTML = '<section class="feed-radar-card akt-karte-huelle">'
    + kopf + '<div class="akt-liste">' + koerper + '</div>'
    + ebAktivitaetenExternHtml(stand.pos) + ebAktivitaetenStarthilfe() + fuss + '</section>';
}

function feedJetztRadius(km) {
  radarRadiusSetzen(km);
  renderFeedJetzt(document.getElementById('feedList'));
}

/**
 * In ein erfasstes Gebiet wechseln.
 *
 * Angesprochen wird über den INDEX, nicht über den Namen: der Name kommt
 * aus einer geladenen Datei und stünde sonst in einem `onclick`-Attribut.
 * Eine verfälschte Datei hätte dort ihren Code untergebracht — dieselbe
 * Begründung, aus der eine Quell-Adresse nur bei `https://` verlinkt wird.
 */
function feedJetztGebiet(i) {
  var g = ebAktivitaetenGebiete(_aktBestand)[i];
  if (!g) return;
  radarPositionSetzen(g.lat, g.lon, 'stadt');
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
