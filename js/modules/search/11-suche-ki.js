/* ══════════════════════════════════════════════════════════════════════
   EB INTELLIGENCE — Geschmacks-Gedächtnis & Satz-Vervollständigung
   ----------------------------------------------------------------------
   Zwei Bausteine, die überall greifen, wo gesucht, gefiltert oder geplant
   wird (Suchseite, Board-Assistent, Feed „Für dich"):

   1) _ebTaste  — lernt LOKAL, was diesen Nutzer interessiert (Kategorien,
      Orte, Event-Typen, häufige Suchen). Recency-gewichtet, gedeckelt.
   2) _ebSuggest — vervollständigt den angefangenen Satz in der Formulierung
      des Nutzers und schlägt drei alternative Enden vor.

   SICHERHEIT — bewusste Grenzen (siehe vault/40-Governance):
   • Alles bleibt im Browser (localStorage). Es werden keine Suchbegriffe,
     Profile oder Signale an den Server gesendet.
   • Gespeichert werden nur normalisierte, kurze Tokens (max. 32 Zeichen,
     max. 40 Begriffe) — keine Sätze, keine E-Mails, keine Zahlen-Folgen,
     die nach Kontaktdaten/Konten aussehen.
   • Jede Ausgabe wird beim Rendern escaped (_escHtml), niemals innerHTML
     mit rohem Nutzertext.
   • Vollständig abschaltbar/löschbar: _ebTasteReset().
   ══════════════════════════════════════════════════════════════════════ */

var EB_TASTE_KEY = 'eb_taste_v1';
var _ebTasteCache = null;

/** Tokens, die niemals gelernt werden (Kontakt-/Zahlungsdaten-Schutz). */
var _EB_TASTE_BLOCK = /(@|\+\d|www\.|https?:|\d{4,}|iban|bic|paypal|whatsapp|telegram|telefon|handy|passwort|password)/i;

function _ebTasteLoad() {
  if (_ebTasteCache) return _ebTasteCache;
  var t = null;
  try { t = JSON.parse(localStorage.getItem(EB_TASTE_KEY) || 'null'); } catch (e) {}
  if (!t || typeof t !== 'object') t = {};
  t.cats   = t.cats   && typeof t.cats   === 'object' ? t.cats   : {};
  t.locs   = t.locs   && typeof t.locs   === 'object' ? t.locs   : {};
  t.types  = t.types  && typeof t.types  === 'object' ? t.types  : {};
  t.terms  = t.terms  && typeof t.terms  === 'object' ? t.terms  : {};
  t.day    = t.day || '';
  _ebTasteCache = t;
  _ebTasteDecay();
  return t;
}

/** Einmal pro Tag alle Gewichte leicht abklingen lassen — Interessen altern. */
function _ebTasteDecay() {
  var t = _ebTasteCache; if (!t) return;
  var today = new Date().toISOString().slice(0, 10);
  if (t.day === today) return;
  ['cats', 'locs', 'types', 'terms'].forEach(function(bucket) {
    Object.keys(t[bucket]).forEach(function(k) {
      var v = t[bucket][k] * 0.92;
      if (v < 0.35) delete t[bucket][k]; else t[bucket][k] = Math.round(v * 1000) / 1000;
    });
  });
  t.day = today;
  _ebTasteSave();
}

function _ebTasteSave() {
  try {
    var t = _ebTasteCache; if (!t) return;
    // Deckeln: pro Bucket nur die stärksten Einträge behalten.
    ['cats', 'locs', 'types', 'terms'].forEach(function(bucket) {
      var keys = Object.keys(t[bucket]);
      var max = bucket === 'terms' ? 40 : 24;
      if (keys.length > max) {
        keys.sort(function(a, b) { return t[bucket][b] - t[bucket][a]; })
            .slice(max).forEach(function(k) { delete t[bucket][k]; });
      }
    });
    ebSpeichern(EB_TASTE_KEY, JSON.stringify(t));
  } catch (e) {}
}

function _ebTasteBump(bucket, key, weight) {
  if (!key) return;
  var k = String(key).toLowerCase().trim().slice(0, 32);
  if (!k || k.length < 2 || _EB_TASTE_BLOCK.test(k)) return;
  var t = _ebTasteLoad();
  if (!t[bucket]) return;
  t[bucket][k] = Math.min(50, (t[bucket][k] || 0) + (weight || 1));
}

/**
 * Ein Nutzer-Signal verarbeiten. kind: 'search' | 'view' | 'fav' | 'board' | 'contact'
 * Gewichte steigen mit der Verbindlichkeit der Handlung.
 */
function _ebTasteSignal(kind, data) {
  try {
    data = data || {};
    var w = { search: 1, view: 1.5, fav: 3, board: 4, contact: 6 }[kind] || 1;
    if (data.category) _ebTasteBump('cats', data.category, w);
    if (data.location) {
      var city = (typeof _ebDetectCityInText === 'function' ? _ebDetectCityInText(data.location) : '') || data.location;
      _ebTasteBump('locs', city, w);
    }
    if (data.eventType) _ebTasteBump('types', data.eventType, w);
    if (data.query) {
      var q = String(data.query).toLowerCase();
      if (!_EB_TASTE_BLOCK.test(q)) {
        (q.match(/[a-zäöüß]{3,}/g) || []).slice(0, 6).forEach(function(word) {
          if (_EB_STOPWORDS_SUGGEST.indexOf(word) === -1) _ebTasteBump('terms', word, w * 0.6);
        });
      }
      var c = _ebGuessCategory(q); if (c) _ebTasteBump('cats', c, w * 0.8);
      var ty = _ebGuessEventType(q); if (ty) _ebTasteBump('types', ty, w * 0.8);
      var lc = (typeof _ebDetectCityInText === 'function') ? _ebDetectCityInText(q) : '';
      if (lc) _ebTasteBump('locs', lc, w * 0.8);
    }
    _ebTasteSave();
  } catch (e) {}
}

/** Stärkste Interessen eines Buckets. */
function _ebTasteTop(bucket, n) {
  var t = _ebTasteLoad();
  var b = t[bucket] || {};
  return Object.keys(b).sort(function(a, c) { return b[c] - b[a]; }).slice(0, n || 3);
}

/** Affinität 0…1 für ein Listing — Grundlage für personalisiertes Ranking. */
function _ebTasteAffinity(listing) {
  if (!listing) return 0;
  var t = _ebTasteLoad();
  var score = 0;
  var cat = String(listing.category || '').toLowerCase();
  if (cat && t.cats[cat]) score += t.cats[cat] * 2;
  var loc = String(listing.location || '').toLowerCase();
  if (loc && t.locs[loc]) score += t.locs[loc] * 1.5;
  var hay = (String(listing.title || '') + ' ' + String(listing.categoryLabel || '')).toLowerCase();
  Object.keys(t.terms).forEach(function(term) {
    if (hay.indexOf(term) !== -1) score += t.terms[term] * 0.6;
  });
  return score;
}

/** Alles vergessen (Datenschutz-Kontrolle für den Nutzer). */
function _ebTasteReset() {
  _ebTasteCache = null;
  try { localStorage.removeItem(EB_TASTE_KEY); } catch (e) {}
  if (typeof showToast === 'function') showToast('Deine Such-Personalisierung wurde gelöscht.', 'lock_reset');
}

/* ─── Vokabular für Vervollständigung ──────────────────────────────── */

var _EB_STOPWORDS_SUGGEST = ['ich','für','und','der','die','das','ein','eine','einen','mit','von','auf',
  'suche','brauche','möchte','will','wir','uns','mir','mein','meine','einem','einer','den','dem','bei','zum','zur'];

// Kategorien mit korrektem Artikel — damit die Vorschläge grammatisch sauber sind.
var _EB_CAT_GRAMMAR = {
  dj:         { akk: 'einen DJ',              label: 'DJ & Musik',      emoji: '🎧', re: /\bdjs?\b|musik|band|beats|auflegen/ },
  catering:   { akk: 'ein Catering',          label: 'Catering',        emoji: '🍽️', re: /catering|essen|buffet|men[üu]|koch|foodtruck/ },
  foto:       { akk: 'einen Fotografen',      label: 'Fotografie',      emoji: '📷', re: /fotograf|foto|kamera|video|film/ },
  location:   { akk: 'eine Location',         label: 'Location',        emoji: '🏰', re: /location|saal|halle|r[äa]um|schloss|scheune|hof/ },
  licht:      { akk: 'Licht & Technik',       label: 'Licht & Technik', emoji: '💡', re: /licht|technik|ton|b[üu]hne|sound|beschallung/ },
  florist:    { akk: 'einen Floristen',       label: 'Floristik',       emoji: '💐', re: /blume|florist|strau[ßs]|blumendeko/ },
  deko:       { akk: 'eine Dekoration',       label: 'Dekoration',      emoji: '🎈', re: /deko|ballon|tischdeko|ausstattung/ },
  moderation: { akk: 'einen Moderator',       label: 'Moderation',      emoji: '🎤', re: /moderat|sprecher|redner|host/ },
  planung:    { akk: 'eine Eventplanung',     label: 'Eventplanung',    emoji: '📋', re: /planer|planung|organisation|wedding ?planner/ },
  pyro:       { akk: 'ein Feuerwerk',         label: 'Pyrotechnik',     emoji: '🎆', re: /feuerwerk|pyro|funken/ },
  wellness:   { akk: 'ein Wellness-Angebot',  label: 'Wellness & Spa',  emoji: '💆', re: /wellness|spa|massage/ }
};

/* ══════════════════════════════════════════════════════════════════════
   EVENT-UNIVERSUM — jede Art von Event, nicht nur die üblichen sechs
   ----------------------------------------------------------------------
   Eventbörse soll ALLES abbilden: von der Hochzeit über die Firmenfeier
   bis zum Dungeons-&-Dragons-Abend, LAN-Party, Vernissage oder Retreat.
   Diese Liste ist der gemeinsame Wortschatz für Filter, Suche,
   Vorschläge und Inseratserstellung. Sie ist bewusst OFFEN: `custom`
   erlaubt jeden frei formulierten Event-Typ.
   ══════════════════════════════════════════════════════════════════════ */
var EB_EVENT_UNIVERSE = [
  // ── Feiern & Familie ───────────────────────────────────────────────
  { key: 'hochzeit',    label: 'Hochzeit',            emoji: '💍', group: 'Feiern & Familie', syn: ['hochzeit','heirat','trauung','brautpaar','wedding','standesamt','freie trauung'] },
  { key: 'verlobung',   label: 'Verlobung',           emoji: '💐', group: 'Feiern & Familie', syn: ['verlobung','antrag','polterabend','junggesellenabschied','jga'] },
  { key: 'geburtstag',  label: 'Geburtstag',          emoji: '🎂', group: 'Feiern & Familie', syn: ['geburtstag','bday','birthday','runder geburtstag'] },
  { key: 'kinderfest',  label: 'Kinderfest',          emoji: '🎈', group: 'Feiern & Familie', syn: ['kinderfest','kindergeburtstag','kinderparty','einschulung'] },
  { key: 'taufe',       label: 'Taufe & Kommunion',   emoji: '⛪', group: 'Feiern & Familie', syn: ['taufe','kommunion','konfirmation','firmung','bar mizwa'] },
  { key: 'jubilaeum',   label: 'Jubiläum',            emoji: '🥂', group: 'Feiern & Familie', syn: ['jubiläum','jubilaeum','anniversary','silberhochzeit','goldene hochzeit'] },
  { key: 'abschluss',   label: 'Abschlussfeier',      emoji: '🎓', group: 'Feiern & Familie', syn: ['abschluss','abiball','abschlussfeier','graduation','examensfeier'] },
  { key: 'trauerfeier', label: 'Trauerfeier',         emoji: '🕊️', group: 'Feiern & Familie', syn: ['trauerfeier','beerdigung','gedenkfeier','abschiedsfeier'] },

  // ── Business ───────────────────────────────────────────────────────
  { key: 'firmenfeier', label: 'Firmenfeier',         emoji: '🏢', group: 'Business',        syn: ['firmenfeier','betriebsfeier','sommerfest','weihnachtsfeier','teamevent','firmenevent'] },
  { key: 'konferenz',   label: 'Konferenz & Tagung',  emoji: '🎤', group: 'Business',        syn: ['konferenz','tagung','kongress','seminar','symposium','summit'] },
  { key: 'messe',       label: 'Messe & Ausstellung', emoji: '🏬', group: 'Business',        syn: ['messe','ausstellung','fachmesse','expo','stand'] },
  { key: 'produktlaunch', label: 'Produkt-Launch',    emoji: '🚀', group: 'Business',        syn: ['launch','produktlaunch','markteinführung','eröffnung','opening'] },
  { key: 'workshop',    label: 'Workshop & Training', emoji: '🧑‍🏫', group: 'Business',      syn: ['workshop','training','schulung','coaching','bootcamp'] },
  { key: 'netzwerk',    label: 'Netzwerk-Event',      emoji: '🤝', group: 'Business',        syn: ['netzwerk','networking','meetup','stammtisch','pitch night'] },

  // ── Kultur & Bühne ─────────────────────────────────────────────────
  { key: 'konzert',     label: 'Konzert',             emoji: '🎸', group: 'Kultur & Bühne',  syn: ['konzert','gig','livemusik','auftritt','bandabend'] },
  { key: 'festival',    label: 'Festival & Open-Air', emoji: '🎪', group: 'Kultur & Bühne',  syn: ['festival','open-air','openair','stadtfest','straßenfest'] },
  { key: 'theater',     label: 'Theater & Lesung',    emoji: '🎭', group: 'Kultur & Bühne',  syn: ['theater','lesung','poetry slam','improtheater','kabarett'] },
  { key: 'vernissage',  label: 'Vernissage',          emoji: '🖼️', group: 'Kultur & Bühne',  syn: ['vernissage','ausstellungseröffnung','kunstausstellung','galerie'] },
  { key: 'filmabend',   label: 'Film & Kino',         emoji: '🎬', group: 'Kultur & Bühne',  syn: ['filmabend','kino','open-air-kino','filmpremiere','screening'] },

  // ── Community, Spiel & Nerd-Kultur ─────────────────────────────────
  { key: 'tabletop',    label: 'Tabletop & Rollenspiel', emoji: '🐉', group: 'Community & Spiel', syn: ['dungeons and dragons','dungeons & dragons','dnd','d&d','pen and paper','rollenspiel','tabletop','warhammer','brettspielabend','rpg'] },
  { key: 'lan',         label: 'LAN & Gaming',        emoji: '🎮', group: 'Community & Spiel', syn: ['lan','lan-party','gaming','esport','e-sport','turnier','konsolenabend'] },
  { key: 'cosplay',     label: 'Cosplay & Convention', emoji: '🦸', group: 'Community & Spiel', syn: ['cosplay','convention','comic con','anime','manga','fantreffen'] },
  { key: 'quiz',        label: 'Quiz & Pub-Abend',    emoji: '🧠', group: 'Community & Spiel', syn: ['quiz','pubquiz','kneipenquiz','bingo','spieleabend'] },
  { key: 'escape',      label: 'Escape & Krimi-Dinner', emoji: '🕵️', group: 'Community & Spiel', syn: ['escape','escape room','krimidinner','krimi-dinner','schnitzeljagd','stadtrallye'] },

  // ── Sport & Outdoor ────────────────────────────────────────────────
  { key: 'sportevent',  label: 'Sport-Event',         emoji: '🏅', group: 'Sport & Outdoor', syn: ['sportfest','turnier','lauf','marathon','sportevent','vereinsfest'] },
  { key: 'outdoor',     label: 'Outdoor & Camp',      emoji: '⛺', group: 'Sport & Outdoor', syn: ['outdoor','camp','zeltlager','wanderung','grillfest','picknick'] },

  // ── Wellness, Spirituelles & Saison ────────────────────────────────
  { key: 'retreat',     label: 'Retreat & Wellness',  emoji: '🧘', group: 'Wellness & Saison', syn: ['retreat','yoga','wellness','meditation','achtsamkeit','spa-tag'] },
  { key: 'saison',      label: 'Saisonfest',          emoji: '🎃', group: 'Wellness & Saison', syn: ['halloween','silvester','neujahr','karneval','fasching','ostern','oktoberfest'] },
  { key: 'privatfeier', label: 'Private Feier',       emoji: '🏡', group: 'Wellness & Saison', syn: ['party','feier','hausparty','gartenparty','dinner','pop-up dinner'] },

  // ── Offen ──────────────────────────────────────────────────────────
  { key: 'custom',      label: 'Anderes Event',       emoji: '✨', group: 'Offen',            syn: [] }
];

/** Event-Typ aus Freitext bestimmen — kennt das gesamte Universum. */
function _ebEventTypeFromText(text) {
  var t = String(text || '').toLowerCase();
  if (!t) return null;
  var best = null, bestLen = 0;
  EB_EVENT_UNIVERSE.forEach(function(ev) {
    ev.syn.forEach(function(s) {
      if (s.length > bestLen && t.indexOf(s) !== -1) { best = ev; bestLen = s.length; }
    });
  });
  return best;
}

/** Alle Event-Typen als gruppierte <optgroup>-Optionen. */
function _ebEventTypeOptionsHtml(selected) {
  var groups = {};
  EB_EVENT_UNIVERSE.forEach(function(ev) {
    (groups[ev.group] = groups[ev.group] || []).push(ev);
  });
  return Object.keys(groups).map(function(g) {
    return '<optgroup label="' + _escHtml(g) + '">' + groups[g].map(function(ev) {
      return '<option value="' + _escHtml(ev.label) + '"' + (selected === ev.label ? ' selected' : '') + '>' +
        ev.emoji + ' ' + _escHtml(ev.label) + '</option>';
    }).join('') + '</optgroup>';
  }).join('');
}

/** Event-Typ-Filter mit dem vollen Universum befüllen (einmalig). */
function _ebFillEventTypeSelect() {
  var sel = document.getElementById('browseEventType');
  if (!sel || sel.dataset.ebFilled === '1') return;
  var cur = sel.value;
  sel.innerHTML = '<option value="">Event-Typ</option>' + _ebEventTypeOptionsHtml(cur);
  sel.dataset.ebFilled = '1';
}

var _EB_TYPE_GRAMMAR = {
  wedding:   { dat: 'für meine Hochzeit',        label: 'Hochzeit',    emoji: '💍', re: /hochzeit|heirat|braut|trauung/ },
  birthday:  { dat: 'für meinen Geburtstag',     label: 'Geburtstag',  emoji: '🎂', re: /geburtstag|b-?day/ },
  corporate: { dat: 'für unsere Firmenfeier',    label: 'Firmenfeier', emoji: '🏢', re: /firmen|betriebs|weihnachtsfeier|sommerfest|team-?event/ },
  festival:  { dat: 'für unser Open-Air',        label: 'Open-Air',    emoji: '🎪', re: /festival|open-?air/ },
  conference:{ dat: 'für unsere Konferenz',      label: 'Konferenz',   emoji: '🎤', re: /konferenz|tagung|kongress|seminar/ },
  kids:      { dat: 'für einen Kindergeburtstag',label: 'Kinderfest',  emoji: '🎈', re: /kinder/ },
  baptism:   { dat: 'für die Taufe',             label: 'Taufe',       emoji: '⛪', re: /taufe|kommunion|konfirmation/ },
  private:   { dat: 'für unsere Feier',          label: 'Privatfeier', emoji: '🏡', re: /party|feier|jubil[äa]um|abschluss|abiball/ }
};

function _ebGuessCategory(text) {
  var t = String(text || '').toLowerCase();
  for (var k in _EB_CAT_GRAMMAR) {
    if (_EB_CAT_GRAMMAR[k].re.test(t)) return k;
  }
  return '';
}
function _ebGuessEventType(text) {
  var t = String(text || '').toLowerCase();
  for (var k in _EB_TYPE_GRAMMAR) {
    if (_EB_TYPE_GRAMMAR[k].re.test(t)) return k;
  }
  // Fallback auf das volle Event-Universum (D&D, LAN, Vernissage, Retreat …)
  var ev = (typeof _ebEventTypeFromText === 'function') ? _ebEventTypeFromText(t) : null;
  return ev && ev.key !== 'custom' ? ev.key : '';
}

/** Wie viele echte Angebote gibt es zu einer Kategorie? (Relevanz-Signal) */
function _ebCatSupply(catKey) {
  try {
    var all = (typeof getHeroListings === 'function') ? getHeroListings() : [];
    return all.filter(function(l) { return String(l.category || '').toLowerCase() === catKey; }).length;
  } catch (e) { return 0; }
}

/**
 * Kern: Vorschläge zu einer angefangenen Eingabe.
 * Liefert { head, completion, full, alternatives:[{text,label,emoji,why}] }
 *  - head       : der bereits getippte Text (unverändert erhalten)
 *  - completion : die wahrscheinlichste Fortsetzung SEINES Satzes
 *  - alternatives: drei andere sinnvolle Satz-Enden (Cross-Sell / smart)
 */
function _ebSuggest(raw) {
  var input = String(raw || '');
  var t = input.trim();
  var low = t.toLowerCase();
  var out = { head: input, completion: '', full: '', alternatives: [] };

  var cat  = _ebGuessCategory(low);
  var type = _ebGuessEventType(low);
  var city = (typeof _ebDetectCityInText === 'function') ? _ebDetectCityInText(t) : '';
  var hasGuests = /\b\d{1,4}\s*(g[äa]ste|personen|leute|pax)\b/.test(low);
  var hasDate   = /\b\d{1,2}\.\d{1,2}\.|\b(20\d{2})\b|januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember/.test(low);

  var topCats  = _ebTasteTop('cats', 3);
  var topTypes = _ebTasteTop('types', 2);
  var topLocs  = _ebTasteTop('locs', 2);

  // Beginnt der Nutzer einen Satz („Ich suche …") oder tippt er nur Stichworte?
  var isSentence = /^(ich|wir|suche|brauche|hab|habe|kann|wer|gibt|wo)\b/.test(low) || t.split(/\s+/).length >= 3;
  // Endet die Eingabe auf ein offenes Bindewort? Dann darf die Fortsetzung
  // es NICHT wiederholen („Fotograf für" + „für meine Hochzeit" = falsch).
  var openWord = (low.match(/\b(für|in|am|mit|ab|zum|zur|einen|eine|ein|meine|meinen|unser|unsere)$/) || [])[1] || '';
  // Beschreibt der Nutzer bereits sein Event („wir planen eine Hochzeit")
  // oder nennt er nur den Anlass („Krimidinner")? Dann braucht die
  // Fortsetzung einen Anschluss statt eines angeklebten Objekts.
  var hasVerb = /\b(suche|suchen|brauche|brauchen|möchte|moechte|will|finde|benötige|benoetige)\b/.test(low);
  var describesEvent = /^(wir|ich)\s+(planen?|organisieren?|feiern?|haben|machen)/.test(low) ||
    (!!type && !cat && !hasVerb);

  /** Bindewort am Anfang eines Fragments entfernen, wenn es schon dasteht. */
  function joinFragment(frag) {
    var f = frag.replace(/^\s+/, '');
    if (openWord) {
      var re = new RegExp('^' + openWord + '\\s+', 'i');
      if (re.test(f)) return ' ' + f.replace(re, '');
      // „für" getippt, Fragment beginnt mit „in" o. ä. → Bindewort passt nicht,
      // Fragment trotzdem ohne doppeltes Leerzeichen anhängen.
    }
    return ' ' + f;
  }

  // ── 1) Fortsetzung des eigenen Satzes ──────────────────────────────
  var parts = [];
  if (!cat) {
    var pick = topCats.filter(function(c) { return _EB_CAT_GRAMMAR[c]; })[0] || 'dj';
    var catFrag = _EB_CAT_GRAMMAR[pick].akk;
    // Wer sein Event beschreibt, bekommt einen sauberen Anschluss statt
    // eines angeklebten Objekts („… in München" → „… — dafür suche ich einen DJ").
    if (describesEvent && (type || city)) catFrag = '— dafür suche ich ' + catFrag;
    parts.push(joinFragment(catFrag));
  }
  if (!type) {
    var pt = topTypes.filter(function(x) { return _EB_TYPE_GRAMMAR[x]; })[0] || 'wedding';
    parts.push(joinFragment(_EB_TYPE_GRAMMAR[pt].dat));
  }
  if (!city) {
    var pl = topLocs[0];
    var cityName = pl ? pl.charAt(0).toUpperCase() + pl.slice(1) : 'Köln';
    parts.push(joinFragment('in ' + cityName));
  }
  if (cat && type && city && !hasGuests) parts.push(' für 80 Gäste');
  if (cat && type && city && hasGuests && !hasDate) parts.push(' im nächsten Sommer');

  out.completion = parts.join('').replace(/\s{2,}/g, ' ');
  out.full = (input.replace(/\s+$/, '') + out.completion).replace(/\s{2,}/g, ' ');

  // ── 2) Drei alternative Satz-Enden ────────────────────────────────
  var alts = [];
  var baseCat = cat || topCats[0] || 'dj';
  var stem = input.replace(/\s+$/, '');
  /** Fragment an den getippten Text hängen, ohne Bindewörter zu doppeln. */
  function appendToStem(frag) {
    return (stem + joinFragment(frag)).replace(/\s{2,}/g, ' ');
  }

  function addAlt(text, label, emoji, why) {
    if (!text) return;
    var clean = text.replace(/\s{2,}/g, ' ').trim();
    if (alts.some(function(a) { return a.text.toLowerCase() === clean.toLowerCase(); })) return;
    if (clean.toLowerCase() === out.full.trim().toLowerCase()) return;
    alts.push({ text: clean, label: label || '', emoji: emoji || '✨', why: why || '' });
  }

  // a) Gleiche Kategorie, anderer Anlass — aber nur, wenn der Anlass nicht
  //    schon im getippten Begriff steckt („Hochzeits-Location" bleibt Hochzeit).
  var typeLocked = !!type;
  if (!typeLocked) {
    var typeCandidates = topTypes.concat(['wedding', 'birthday', 'corporate']);
    typeCandidates.forEach(function(k) {
      if (alts.length >= 2) return;
      var g = _EB_TYPE_GRAMMAR[k];
      var c = _EB_CAT_GRAMMAR[baseCat];
      if (!g || !c) return;
      var sentence = cat ? appendToStem(g.dat) : 'Ich suche ' + c.akk + ' ' + g.dat;
      addAlt(sentence, g.label, g.emoji, 'Anderer Anlass');
    });
  }

  // b) Passende Zusatz-Gewerke zum erkannten Anlass (echtes Cross-Sell)
  var companions = {
    wedding:   ['foto', 'florist', 'catering', 'location'],
    birthday:  ['dj', 'catering', 'deko'],
    corporate: ['catering', 'licht', 'moderation', 'location'],
    festival:  ['licht', 'pyro', 'dj'],
    conference:['licht', 'moderation', 'catering'],
    kids:      ['deko', 'catering'],
    baptism:   ['florist', 'catering', 'foto'],
    private:   ['dj', 'catering', 'deko']
  }[type || 'wedding'] || ['foto', 'catering'];

  companions.forEach(function(ck) {
    if (ck === cat) return;
    var g = _EB_CAT_GRAMMAR[ck];
    if (!g) return;
    var tg = _EB_TYPE_GRAMMAR[type || topTypes[0] || 'wedding'];
    addAlt('Ich suche ' + g.akk + (tg ? ' ' + tg.dat : ''), g.label, g.emoji, 'Passt dazu');
  });

  // c) Konkretisierung mit Ort/Größe, wenn noch nichts angegeben ist
  if (cat && !city) {
    var lc = topLocs[0] ? topLocs[0].charAt(0).toUpperCase() + topLocs[0].slice(1) : 'Berlin';
    addAlt(appendToStem('in ' + lc), 'In ' + lc, '📍', 'Ort eingrenzen');
  }
  if (cat && !hasGuests) addAlt(appendToStem('für 120 Gäste'), 'Für 120 Gäste', '👥', 'Größe angeben');

  // Reihenfolge: Angebotslage + Geschmack zuerst, dann Rest
  alts.sort(function(a, b) {
    var ac = _ebGuessCategory(a.text), bc = _ebGuessCategory(b.text);
    var as = (topCats.indexOf(ac) !== -1 ? 5 : 0) + Math.min(3, _ebCatSupply(ac));
    var bs = (topCats.indexOf(bc) !== -1 ? 5 : 0) + Math.min(3, _ebCatSupply(bc));
    return bs - as;
  });

  out.alternatives = alts.slice(0, 3);
  out.meta = { cat: cat, type: type, city: city, isSentence: isSentence };
  return out;
}

// ========== KI-SUCHE ==========
const AI_KEYWORDS = {
  'dj': { term: 'DJ', category: 'dj', emoji: '🎧', hint: 'DJ & Musik für dein Event' },
  'musik': { term: 'DJ', category: 'dj', emoji: '🎧', hint: 'Musiker & DJs' },
  'sound': { term: 'DJ', category: 'dj', emoji: '🎧', hint: 'Sound & DJ-Service' },
  'party': { term: 'DJ', category: 'dj', emoji: '🎧', hint: 'Party-DJ buchen' },
  'beats': { term: 'DJ', category: 'dj', emoji: '🎧', hint: 'DJ & Beats' },
  'auflegen': { term: 'DJ', category: 'dj', emoji: '🎧', hint: 'DJ zum Auflegen' },
  'catering': { term: 'Catering', category: 'catering', emoji: '🍽️', hint: 'Catering-Service' },
  'essen': { term: 'Catering', category: 'catering', emoji: '🍽️', hint: 'Essen & Catering' },
  'buffet': { term: 'Catering', category: 'catering', emoji: '🍽️', hint: 'Buffet-Catering' },
  'koch': { term: 'Catering', category: 'catering', emoji: '🍽️', hint: 'Koch & Catering' },
  'gourmet': { term: 'Catering', category: 'catering', emoji: '🍽️', hint: 'Gourmet-Catering' },
  'foto': { term: 'Fotografie', category: 'foto', emoji: '📷', hint: 'Event-Fotografie' },
  'fotograf': { term: 'Fotografie', category: 'foto', emoji: '📷', hint: 'Fotograf buchen' },
  'kamera': { term: 'Fotografie', category: 'foto', emoji: '📷', hint: 'Fotograf & Kamera' },
  'bilder': { term: 'Fotografie', category: 'foto', emoji: '📷', hint: 'Fotos & Bilder' },
  'blumen': { term: 'Floristik', category: 'florist', emoji: '🌸', hint: 'Blumen & Floristik' },
  'florist': { term: 'Floristik', category: 'florist', emoji: '🌸', hint: 'Floristik-Service' },
  'deko': { term: 'Dekoration', category: 'deko', emoji: '🎈', hint: 'Event-Dekoration' },
  'dekoration': { term: 'Dekoration', category: 'deko', emoji: '🎈', hint: 'Dekoration & Design' },
  'schmuck': { term: 'Dekoration', category: 'deko', emoji: '🎈', hint: 'Deko & Schmuck' },
  'licht': { term: 'Licht & Technik', category: 'licht', emoji: '💡', hint: 'Licht & Technik' },
  'technik': { term: 'Licht & Technik', category: 'licht', emoji: '💡', hint: 'Eventtechnik' },
  'beleuchtung': { term: 'Licht & Technik', category: 'licht', emoji: '💡', hint: 'Beleuchtung & Licht' },
  'feuerwerk': { term: 'Pyrotechnik', category: 'pyro', emoji: '🎆', hint: 'Feuerwerk & Pyro' },
  'pyro': { term: 'Pyrotechnik', category: 'pyro', emoji: '🎆', hint: 'Pyrotechnik-Show' },
  'location': { term: 'Location', category: 'location', emoji: '🏰', hint: 'Event-Location finden' },
  'räume': { term: 'Location', category: 'location', emoji: '🏰', hint: 'Räume & Locations' },
  'saal': { term: 'Location', category: 'location', emoji: '🏰', hint: 'Festsaal & Location' },
  'schloss': { term: 'Location', category: 'location', emoji: '🏰', hint: 'Schloss-Location' },
  'planung': { term: 'Eventplanung', category: 'planung', emoji: '📋', hint: 'Event-Planung' },
  'planer': { term: 'Eventplanung', category: 'planung', emoji: '📋', hint: 'Eventplaner buchen' },
  'organisieren': { term: 'Eventplanung', category: 'planung', emoji: '📋', hint: 'Event organisieren' },
  'moderator': { term: 'Moderation', category: 'moderation', emoji: '🎤', hint: 'Moderator buchen' },
  'moderation': { term: 'Moderation', category: 'moderation', emoji: '🎤', hint: 'Event-Moderation' },
  'hochzeit': { term: 'Hochzeit', category: '', emoji: '💍', hint: 'Alles für die Hochzeit' },
  'heiraten': { term: 'Hochzeit', category: '', emoji: '💍', hint: 'Hochzeits-Services' },
  'geburtstag': { term: 'Geburtstag', category: '', emoji: '🎂', hint: 'Geburtstags-Services' },
  'firmen': { term: 'Firmen-Event', category: '', emoji: '🏢', hint: 'Firmen-Events' },
  'messe': { term: 'Messe', category: '', emoji: '🎪', hint: 'Messe-Services' },
};

// Typo / fuzzy matching – Levenshtein distance
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({length: m + 1}, (_, i) => {
    const row = new Array(n + 1);
    row[0] = i;
    return row;
  });
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a[i-1] !== b[j-1] ? 1 : 0));
  return d[m][n];
}

function aiMatchKeyword(input) {
  input = input.toLowerCase().trim();
  if (!input) return [];

  const words = input.split(/\s+/);
  const matches = new Map();

  words.forEach(word => {
    if (word.length < 2) return;
    Object.entries(AI_KEYWORDS).forEach(([key, val]) => {
      // Exact prefix or contains
      if (key.startsWith(word) || word.startsWith(key)) {
        matches.set(val.hint, { ...val, score: 0 });
        return;
      }
      // Fuzzy – allow 1-2 typos depending on word length
      const maxDist = word.length <= 3 ? 1 : 2;
      const dist = levenshtein(word, key);
      if (dist <= maxDist) {
        const existing = matches.get(val.hint);
        if (!existing || dist < existing.score) {
          matches.set(val.hint, { ...val, score: dist });
        }
      }
    });
  });

  // Also try matching against listing titles directly
  const listingMatches = getHeroListings().filter(l => {
    const haystack = `${l.title} ${l.categoryLabel} ${l.tags.join(' ')} ${l.providerName}`.toLowerCase();
    return words.some(w => w.length >= 2 && haystack.includes(w));
  }).slice(0, 2);

  listingMatches.forEach(l => {
    const emoji = CATEGORY_EMOJI[l.category] || '📌';
    matches.set('listing_' + l.id, {
      term: l.title,
      category: l.category,
      emoji: emoji,
      hint: `${l.categoryLabel} · ${l.location}`,
      listingId: l.id,
      score: 1
    });
  });

  return Array.from(matches.values())
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);
}

const AI_CATEGORIES = [
  { key: 'dj', label: 'DJ & Musik', emoji: '🎧' },
  { key: 'catering', label: 'Catering', emoji: '🍽️' },
  { key: 'foto', label: 'Fotografie', emoji: '📷' },
  { key: 'florist', label: 'Floristik', emoji: '🌸' },
  { key: 'deko', label: 'Dekoration', emoji: '🎈' },
  { key: 'licht', label: 'Licht & Technik', emoji: '💡' },
  { key: 'planung', label: 'Planung', emoji: '📋' },
  { key: 'moderation', label: 'Moderation', emoji: '🎤' },
  { key: 'pyro', label: 'Pyrotechnik', emoji: '🎆' },
  { key: 'location', label: 'Location', emoji: '🏰' },
];
let selectedCategories = new Set();
let aiDebounce = null;

function renderCategoryPicker() {
  const list = document.getElementById('aiSuggestionsList');
  list.innerHTML = AI_CATEGORIES.map(c => `
    <div class="ai-cat-chip${selectedCategories.has(c.key) ? ' selected' : ''}" onclick="toggleCategory('${c.key}')">
      <span class="ai-cat-emoji">${c.emoji}</span>
      <span class="ai-cat-label">${c.label}</span>
    </div>
  `).join('');
}

function toggleCategory(key) {
  if (selectedCategories.has(key)) {
    selectedCategories.delete(key);
  } else {
    selectedCategories.add(key);
  }
  renderCategoryPicker();
  renderSelectedTags();
}

function renderSelectedTags() {
  const container = document.getElementById('aiSelectedTags');
  if (!selectedCategories.size) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = Array.from(selectedCategories).map(key => {
    const cat = AI_CATEGORIES.find(c => c.key === key);
    return `<span class="ai-tag" onclick="toggleCategory('${key}')">
      ${cat.emoji} ${cat.label}
      <span class="material-icons-round">close</span>
    </span>`;
  }).join('');
}

function initAiSearch() {
  const input = document.getElementById('heroSearchInput');
  const box = document.getElementById('aiSuggestions');
  const field = input.closest('.hero-field-ai');

  input.addEventListener('focus', () => {
    field.classList.add('focused');
    renderCategoryPicker();
    box.classList.add('show');
  });

  input.addEventListener('input', () => {
    const val = input.value.trim();
    clearTimeout(aiDebounce);

    if (!val) {
      renderCategoryPicker();
      box.classList.add('show');
      return;
    }

    // Keep category picker open so user can select manually
    renderCategoryPicker();
    box.classList.add('show');
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.hero-search')) {
      box.classList.remove('show');
      field.classList.remove('focused');
    }
  });

  // Enter key → search
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      box.classList.remove('show');
      field.classList.remove('focused');
      performSearch();
    }
  });
}

// ========== CUSTOM CALENDAR (WANN) ==========
var calMonth = new Date().getMonth();
var calYear = new Date().getFullYear();
var calSelected = null;

var CAL_MONTHS_DE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

function toggleCalendar(e) {
  e.stopPropagation();
  var dd = document.getElementById('calDropdown');
  if (dd.classList.contains('show')) {
    dd.classList.remove('show');
  } else {
    renderCalendar();
    dd.classList.add('show');
  }
}

function renderCalendar() {
  var title = document.getElementById('calTitle');
  var grid = document.getElementById('calGrid');
  title.textContent = CAL_MONTHS_DE[calMonth] + ' ' + calYear;

  var firstDay = new Date(calYear, calMonth, 1).getDay();
  var startIdx = firstDay === 0 ? 6 : firstDay - 1; // Monday-based
  var daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  var daysInPrev = new Date(calYear, calMonth, 0).getDate();
  var today = new Date();
  today.setHours(0,0,0,0);

  var html = '';
  // Previous month trailing days
  for (var i = startIdx - 1; i >= 0; i--) {
    html += '<button type="button" class="cal-day other-month disabled">' + (daysInPrev - i) + '</button>';
  }

  // Current month days
  for (var d = 1; d <= daysInMonth; d++) {
    var date = new Date(calYear, calMonth, d);
    date.setHours(0,0,0,0);
    var isPast = date < today;
    var isToday = date.getTime() === today.getTime();
    var isSelected = calSelected && date.getTime() === calSelected.getTime();
    var cls = 'cal-day';
    if (isPast) cls += ' disabled';
    if (isToday) cls += ' today';
    if (isSelected) cls += ' selected';
    html += '<button type="button" class="' + cls + '"' + (isPast ? '' : ' onclick="calSelect(event,' + d + ')"') + '>' + d + '</button>';
  }

  // Next month leading days
  var totalCells = startIdx + daysInMonth;
  var remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (var n = 1; n <= remaining; n++) {
    html += '<button type="button" class="cal-day other-month disabled">' + n + '</button>';
  }

  grid.innerHTML = html;
}

function calNav(e, dir) {
  e.stopPropagation();
  calMonth += dir;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendar();
}

function calSelect(e, day) {
  e.stopPropagation();
  calSelected = new Date(calYear, calMonth, day);
  calSelected.setHours(0,0,0,0);
  var display = document.getElementById('heroDateDisplay');
  var input = document.getElementById('heroDate');
  var dd = calSelected.getDate();
  var mm = calSelected.getMonth() + 1;
  display.textContent = dd + '. ' + CAL_MONTHS_DE[calSelected.getMonth()] + ' ' + calSelected.getFullYear();
  display.classList.add('has-value');
  input.value = calSelected.getFullYear() + '-' + String(mm).padStart(2,'0') + '-' + String(dd).padStart(2,'0');
  document.getElementById('calDropdown').classList.remove('show');
  renderCalendar();
}

function calToday(e) {
  e.stopPropagation();
  var now = new Date();
  calMonth = now.getMonth();
  calYear = now.getFullYear();
  calSelect(e, now.getDate());
}

function calClear(e) {
  e.stopPropagation();
  calSelected = null;
  document.getElementById('heroDateDisplay').textContent = 'Datum wählen';
  document.getElementById('heroDateDisplay').classList.remove('has-value');
  document.getElementById('heroDate').value = '';
  document.getElementById('calDropdown').classList.remove('show');
}

// Close calendar on outside click
document.addEventListener('click', function(e) {
  var dd = document.getElementById('calDropdown');
  if (dd && !e.target.closest('.hero-field-date')) {
    dd.classList.remove('show');
  }
});

function performSearch() {
  navigateTo('browse');

  // Transfer hero values → browse filters
  const searchVal = document.getElementById('heroSearchInput').value;
  const eventType = document.getElementById('heroEventType').value;
  const locationVal = document.getElementById('heroLocation').value;

  if (searchVal) document.getElementById('browseSearch').value = searchVal;
  if (locationVal) document.getElementById('browseLocation').value = locationVal;

  // If categories selected, set the first one in browse filter (multi handled in filterListings)
  if (selectedCategories.size) {
    const browseCat = document.getElementById('browseCategory');
    if (browseCat) browseCat.value = '';
  }

  // Map hero event type to browse event type
  const browseET = document.getElementById('browseEventType');
  if (eventType && browseET) {
    browseET.value = EVENT_TYPE_MAP[eventType] || '';
  }

  filterListings();

  try {
    renderHeroMarquees();
  } catch (err) {
    console.error('Fehler renderHeroMarquees in performSearch', err);
  }
}

// ========== BROWSE PAGE ==========
var _browseGridPaging = {
  rows: [],
  visible: 0,
  step: 0
};

function _getBrowseGridColumnCount(grid) {
  if (!grid) return 1;
  try {
    var template = window.getComputedStyle(grid).gridTemplateColumns || '';
    var cols = template.split(' ').filter(Boolean).length;
    return Math.max(1, cols || 1);
  } catch (e) {
    return 1;
  }
}

function _alignBrowseCountToRow(count, total, cols) {
  if (cols <= 1) return Math.min(count, total);
  if (count >= total) return total;
  var rest = count % cols;
  if (rest === 0) return count;
  return Math.min(total, count + (cols - rest));
}

function _ensureBrowseLoadMoreUi() {
  var grid = document.getElementById('browseGrid');
  if (!grid || !grid.parentNode) return null;

  var wrap = document.getElementById('browseLoadMoreWrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'browseLoadMoreWrap';
    wrap.className = 'browse-load-more-wrap';
    var noResults = document.getElementById('noResultsContainer');
    if (noResults && noResults.parentNode === grid.parentNode) {
      grid.parentNode.insertBefore(wrap, noResults);
    } else {
      grid.parentNode.appendChild(wrap);
    }
  }

  var btn = document.getElementById('browseLoadMoreBtn');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'browseLoadMoreBtn';
    btn.type = 'button';
    btn.className = 'btn-secondary browse-load-more-btn';
    btn.innerHTML = '<span class="material-icons-round">expand_more</span> Mehr anzeigen';
    btn.addEventListener('click', browseShowMoreResults);
    wrap.appendChild(btn);
  }

  return { wrap: wrap, btn: btn };
}

function _renderBrowseGridPage() {
  var grid = document.getElementById('browseGrid');
  if (!grid) return;

  var total = _browseGridPaging.rows.length;
  var visibleRows = _browseGridPaging.rows.slice(0, _browseGridPaging.visible);
  grid.innerHTML = visibleRows.map(renderListingCard).join('');
  _initGridCards(grid);
  document.getElementById('browseResultCount').textContent = total + ' Services gefunden';

  var ui = _ensureBrowseLoadMoreUi();
  if (!ui) return;

  var remaining = total - _browseGridPaging.visible;
  if (remaining > 0) {
    ui.wrap.style.display = '';
    var nextCount = Math.min(remaining, _browseGridPaging.step || remaining);
    ui.btn.innerHTML = '<span class="material-icons-round">expand_more</span> Mehr anzeigen (' + nextCount + ')';
  } else {
    ui.wrap.style.display = 'none';
  }
}

function browseShowMoreResults() {
  var grid = document.getElementById('browseGrid');
  if (!grid) return;

  var total = _browseGridPaging.rows.length;
  var cols = _getBrowseGridColumnCount(grid);
  var next = _browseGridPaging.visible + (_browseGridPaging.step || cols * 3 || 6);
  _browseGridPaging.visible = _alignBrowseCountToRow(next, total, cols);
  _renderBrowseGridPage();
}

function renderBrowseGrid(listings) {
  const grid = document.getElementById('browseGrid');
  var rows = filterDemos(listings || []);
  var cols = _getBrowseGridColumnCount(grid);
  _browseGridPaging.rows = rows;
  _browseGridPaging.step = Math.max(6, cols * 3);
  _browseGridPaging.visible = _alignBrowseCountToRow(Math.min(rows.length, cols * 5), rows.length, cols);
  _renderBrowseGridPage();
}

/* ══════════════════════════════════════════════════════════════════════
   HERO-BILDMONTAGE — 10 Motive, generativ erzeugt
   ----------------------------------------------------------------------
   Die Motive werden im Browser prozedural als SVG erzeugt (Farbverlauf,
   Bokeh-Lichter, Lichtkegel, Silhouetten, Konfetti) und als Data-URI
   eingesetzt. Vorteil: keine externen Requests (CSP-fest), kein Ladezeit-
   Ruckler, funktioniert offline und kostet kein Bild-Hosting.
   Sollen später echte Foto-Renderings genutzt werden, genügt es, in
   _ebHeroShots() Data-URIs bzw. Bild-URLs zurückzugeben — der Ablauf
   (Montage + Dauerwechsel) bleibt unverändert.
   ══════════════════════════════════════════════════════════════════════ */
var _EB_HERO_SCENES = [
  { name: 'Hochzeit',      sky: ['#2b1055', '#7597de'], glow: '#ffd9e8', accent: '#ffffff', mood: 'soft'   },
  { name: 'Club-Night',    sky: ['#0f0c29', '#302b63'], glow: '#ff3b6b', accent: '#7b2ff7', mood: 'beams'  },
  { name: 'Dinner',        sky: ['#3a1c1c', '#b06a3b'], glow: '#ffcf87', accent: '#ffe9c4', mood: 'soft'   },
  { name: 'Open-Air',      sky: ['#12263a', '#2b6777'], glow: '#7ee8c0', accent: '#ffe66d', mood: 'beams'  },
  { name: 'Gala',          sky: ['#1a1a2e', '#16213e'], glow: '#e9c46a', accent: '#f4a261', mood: 'bokeh'  },
  { name: 'Geburtstag',    sky: ['#42275a', '#734b6d'], glow: '#ff8ba7', accent: '#ffc6c7', mood: 'confetti' },
  { name: 'Firmenevent',   sky: ['#0b3866', '#1f6feb'], glow: '#8ecae6', accent: '#ffffff', mood: 'beams'  },
  { name: 'Gartenfest',    sky: ['#1d3b2a', '#57886c'], glow: '#ffe8a3', accent: '#f2f7f5', mood: 'bokeh'  },
  { name: 'Konzert',       sky: ['#160f29', '#4b1d3f'], glow: '#ff5f6d', accent: '#ffc371', mood: 'beams'  },
  { name: 'Sommerfeier',   sky: ['#2c3e50', '#e96443'], glow: '#ffd86f', accent: '#fc913a', mood: 'confetti' }
];

/** Deterministischer Pseudo-Zufall — gleiche Szene sieht immer gleich aus. */
function _ebRnd(seed) {
  var s = seed;
  return function() { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
}

function _ebHeroSceneSvg(scene, seed) {
  var r = _ebRnd(seed * 7919 + 13);
  var W = 1200, H = 700;
  var parts = [];
  parts.push('<defs>' +
    '<linearGradient id="sky" x1="0" y1="0" x2="0.6" y2="1">' +
      '<stop offset="0%" stop-color="' + scene.sky[0] + '"/>' +
      '<stop offset="100%" stop-color="' + scene.sky[1] + '"/>' +
    '</linearGradient>' +
    '<radialGradient id="glow" cx="50%" cy="42%" r="62%">' +
      '<stop offset="0%" stop-color="' + scene.glow + '" stop-opacity="0.55"/>' +
      '<stop offset="100%" stop-color="' + scene.glow + '" stop-opacity="0"/>' +
    '</radialGradient>' +
    '<filter id="blur"><feGaussianBlur stdDeviation="18"/></filter>' +
    '<filter id="soft"><feGaussianBlur stdDeviation="6"/></filter>' +
  '</defs>');
  parts.push('<rect width="' + W + '" height="' + H + '" fill="url(#sky)"/>');
  parts.push('<rect width="' + W + '" height="' + H + '" fill="url(#glow)"/>');

  // Lichtkegel (Bühne/Club)
  if (scene.mood === 'beams') {
    for (var b = 0; b < 5; b++) {
      var bx = 120 + r() * (W - 240);
      var spread = 70 + r() * 90;
      parts.push('<polygon points="' + bx + ',-40 ' + (bx - spread) + ',' + H + ' ' + (bx + spread) + ',' + H + '" fill="' +
        scene.accent + '" opacity="' + (0.06 + r() * 0.09).toFixed(3) + '" filter="url(#blur)"/>');
    }
  }
  // Bokeh-Lichter (überall, Dichte je Stimmung)
  var bokehCount = scene.mood === 'bokeh' ? 34 : 20;
  for (var i = 0; i < bokehCount; i++) {
    var cx = r() * W, cy = r() * H * 0.86;
    var rad = 6 + r() * 46;
    var col = r() > 0.55 ? scene.glow : scene.accent;
    parts.push('<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + rad.toFixed(1) +
      '" fill="' + col + '" opacity="' + (0.05 + r() * 0.22).toFixed(3) + '" filter="url(#soft)"/>');
  }
  // Konfetti (Party-Motive)
  if (scene.mood === 'confetti') {
    for (var c = 0; c < 46; c++) {
      var px = r() * W, py = r() * H * 0.8, w = 5 + r() * 9, h = 9 + r() * 14;
      var rot = (r() * 360).toFixed(0);
      var cc = [scene.glow, scene.accent, '#ffffff'][Math.floor(r() * 3)];
      parts.push('<rect x="' + px.toFixed(0) + '" y="' + py.toFixed(0) + '" width="' + w.toFixed(0) + '" height="' + h.toFixed(0) +
        '" rx="2" fill="' + cc + '" opacity="' + (0.25 + r() * 0.5).toFixed(2) + '" transform="rotate(' + rot + ' ' + px.toFixed(0) + ' ' + py.toFixed(0) + ')"/>');
    }
  }
  // Lichterketten
  var yBase = 90 + r() * 60;
  for (var s2 = 0; s2 < 2; s2++) {
    var yy = yBase + s2 * 46;
    var d = 'M0 ' + yy + ' Q' + (W * 0.25) + ' ' + (yy + 56) + ' ' + (W * 0.5) + ' ' + yy + ' T' + W + ' ' + yy;
    parts.push('<path d="' + d + '" fill="none" stroke="' + scene.accent + '" stroke-opacity="0.22" stroke-width="1.5"/>');
    for (var l = 0; l <= 22; l++) {
      var tt = l / 22, xx = tt * W;
      var yl = yy + Math.sin(tt * Math.PI) * 46;
      parts.push('<circle cx="' + xx.toFixed(0) + '" cy="' + yl.toFixed(0) + '" r="3.4" fill="' + scene.glow + '" opacity="0.75"/>');
    }
  }
  // Horizont + Publikums-Silhouetten.
  // Menschliche Proportionen: Kopfdurchmesser d, Gesamthöhe ~6,5·d,
  // Schultern ~2,2·d breit. Dadurch wirken die Figuren nie gestreckt,
  // egal wie stark das Motiv skaliert wird.
  parts.push('<rect y="' + (H * 0.74) + '" width="' + W + '" height="' + (H * 0.26) + '" fill="#000" opacity="0.30"/>');
  var ground = H * 0.995;              // Fußlinie knapp über dem unteren Rand
  var crowd = [];
  for (var p = 0; p < 26; p++) {
    crowd.push({ x: r() * (W + 80) - 40, d: 15 + r() * 7, back: r() > 0.55 });
  }
  // Hintere Reihe zuerst zeichnen (kleiner, blasser) → Tiefe
  crowd.sort(function(a, b) { return (a.back === b.back) ? 0 : (a.back ? -1 : 1); });
  crowd.forEach(function(c) {
    var d = c.back ? c.d * 0.82 : c.d;             // Kopfdurchmesser
    var bodyH = d * 5.2;                            // Rumpf + Beine
    var shoulder = d * 2.15;                        // Schulterbreite
    var op = c.back ? 0.42 : 0.62;
    var headCy = ground - bodyH - d * 0.55;
    // Kopf
    parts.push('<circle cx="' + c.x.toFixed(1) + '" cy="' + headCy.toFixed(1) + '" r="' + (d / 2).toFixed(1) + '" fill="#000" opacity="' + op + '"/>');
    // Hals + Oberkörper (oben schmaler, unten breiter) als weiche Form
    var topY = headCy + d * 0.55;
    var pth = 'M' + (c.x - shoulder * 0.30).toFixed(1) + ' ' + topY.toFixed(1) +
      ' Q' + (c.x - shoulder * 0.52).toFixed(1) + ' ' + (topY + d * 0.55).toFixed(1) +
      ' ' + (c.x - shoulder * 0.5).toFixed(1) + ' ' + (topY + d * 1.5).toFixed(1) +
      ' L' + (c.x - shoulder * 0.42).toFixed(1) + ' ' + ground.toFixed(1) +
      ' L' + (c.x + shoulder * 0.42).toFixed(1) + ' ' + ground.toFixed(1) +
      ' L' + (c.x + shoulder * 0.5).toFixed(1) + ' ' + (topY + d * 1.5).toFixed(1) +
      ' Q' + (c.x + shoulder * 0.52).toFixed(1) + ' ' + (topY + d * 0.55).toFixed(1) +
      ' ' + (c.x + shoulder * 0.30).toFixed(1) + ' ' + topY.toFixed(1) + ' Z';
    parts.push('<path d="' + pth + '" fill="#000" opacity="' + op + '"/>');
  });
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">' + parts.join('') + '</svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

var _ebHeroShotsCache = null;
function _ebHeroShots() {
  if (_ebHeroShotsCache) return _ebHeroShotsCache;
  _ebHeroShotsCache = _EB_HERO_SCENES.map(function(sc, i) {
    return { name: sc.name, url: _ebHeroSceneSvg(sc, i + 1) };
  });
  return _ebHeroShotsCache;
}

var _ebHeroTimer = null;
/**
 * Montage: alle 10 Motive laufen in 2 Sekunden durch (200 ms je Bild),
 * danach wechselt der Hintergrund ruhig weiter (5 s je Motiv).
 * Bei „prefers-reduced-motion" bleibt es bei einem einzigen Standbild.
 */
function _initHeroShots() {
  var host = document.getElementById('aiHeroShots');
  if (!host) return;
  var shots = _ebHeroShots();
  if (!host.childElementCount) {
    host.innerHTML = shots.map(function(s, i) {
      return '<div class="ai-hero-shot' + (i === 0 ? ' active' : '') + '" data-i="' + i + '" role="img" aria-label="' +
        _escHtml(s.name) + '" style="background-image:url(&quot;' + s.url + '&quot;)"></div>';
    }).join('');
  }
  var slides = host.querySelectorAll('.ai-hero-shot');
  if (!slides.length) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (_ebHeroTimer) { clearInterval(_ebHeroTimer); _ebHeroTimer = null; }
  if (reduce) {
    slides.forEach(function(s, i) { s.classList.toggle('active', i === 0); });
    return;
  }

  var idx = 0;
  function show(i) {
    slides.forEach(function(s, k) { s.classList.toggle('active', k === i); });
  }
  // Phase 1 — schnelle Montage: 10 Motive in 2 Sekunden.
  host.classList.add('is-montage');
  _ebHeroTimer = setInterval(function() {
    idx = (idx + 1) % slides.length;
    show(idx);
    if (idx === slides.length - 1) {
      clearInterval(_ebHeroTimer);
      host.classList.remove('is-montage');
      // Phase 2 — ruhiger Dauerwechsel.
      _ebHeroTimer = setInterval(function() {
        idx = (idx + 1) % slides.length;
        show(idx);
      }, 5000);
    }
  }, 200);
}

// ===== AI Search Hero helpers =====
function setQuickSearch(term) {
  var input = document.getElementById('browseSearch');
  if (!input) return;
  input.value = term;
  _aiPlaceholderHideOnInput(input);
  filterListings();
  var grid = document.getElementById('browseGrid');
  if (grid) setTimeout(function() { window.scrollTo({ top: grid.getBoundingClientRect().top + window.pageYOffset - 100, behavior: 'smooth' }); }, 120);
}
function _aiPlaceholderHideOnInput(input) {
  var el = document.getElementById('aiPlaceholder');
  if (el) el.style.opacity = input.value ? '0' : '1';
  _ebSearchSuggestUpdate(input);
}

/* ─── Such-Vervollständigung (Inline-Ghost + Vorschlagsliste) ─────────
   Der getippte Text bleibt IMMER unangetastet — die Fortsetzung erscheint
   nur als Vorschau (grau) und wird per Tab/→ oder Klick übernommen.      */
var _ebSug = { data: null, timer: null, scrollTimer: null, open: false, idx: -1 };

function _ebSuggestPanel() {
  var el = document.getElementById('ebSuggestPanel');
  if (el) return el;
  // Bewusst direkt an <body>: im Hero wurde die Liste je nach Stacking-
  // Kontext von der sticky Kategorieleiste überlagert bzw. abgeschnitten.
  // Als fixiertes Element auf oberster Ebene kann das nicht mehr passieren.
  el = document.createElement('div');
  el.id = 'ebSuggestPanel';
  el.className = 'eb-sug-panel';
  el.setAttribute('role', 'listbox');
  el.hidden = true;
  document.body.appendChild(el);
  return el;
}

/** Liste exakt unter der Suchleiste positionieren (fixed, body-Ebene). */
function _ebSuggestPosition() {
  var panel = document.getElementById('ebSuggestPanel');
  var bar = document.querySelector('#page-browse .ai-searchbar');
  if (!panel || !bar || panel.hidden) return;
  var r = bar.getBoundingClientRect();
  var gap = 8;
  panel.style.left = Math.round(r.left) + 'px';
  panel.style.width = Math.round(r.width) + 'px';
  // Platz nach unten prüfen; sonst über der Leiste öffnen.
  var navH = 0;
  var mn = document.querySelector('.mobile-nav');
  if (mn && getComputedStyle(mn).display !== 'none') navH = mn.offsetHeight;
  var below = window.innerHeight - r.bottom - gap - navH - 8;
  var above = r.top - gap - 8;
  if (below < 180 && above > below) {
    panel.style.top = 'auto';
    panel.style.bottom = Math.round(window.innerHeight - r.top + gap) + 'px';
    panel.style.maxHeight = Math.max(140, Math.min(above, 420)) + 'px';
  } else {
    panel.style.bottom = 'auto';
    panel.style.top = Math.round(r.bottom + gap) + 'px';
    panel.style.maxHeight = Math.max(140, Math.min(below, 420)) + 'px';
  }
}

function _ebSearchSuggestUpdate(input) {
  input = input || document.getElementById('browseSearch');
  if (!input) return;
  clearTimeout(_ebSug.timer);
  _ebSug.timer = setTimeout(function() { _ebSearchSuggestRender(input); }, 90);
}

function _ebSearchSuggestRender(input) {
  var ghost = document.getElementById('ebGhostComplete');
  var panel = _ebSuggestPanel();
  var val = input.value || '';
  if (!val.trim()) { _ebSuggestClose(); return; }

  var s = _ebSuggest(val);
  _ebSug.data = s;
  _ebSug.idx = -1;

  // Inline-Ghost: getippter Text unsichtbar als Platzhalter, Rest grau daneben.
  if (!ghost) {
    var field = input.parentNode;
    if (field) {
      ghost = document.createElement('div');
      ghost.id = 'ebGhostComplete';
      ghost.className = 'eb-ghost-complete';
      ghost.setAttribute('aria-hidden', 'true');
      field.appendChild(ghost);
    }
  }
  if (ghost) {
    ghost.innerHTML = s.completion
      ? '<span class="ebg-typed">' + _escHtml(val) + '</span><span class="ebg-rest">' + _escHtml(s.completion) + '</span>'
      : '';
  }

  if (!panel) return;
  var rows = '';
  if (s.completion) {
    rows += '<button type="button" class="eb-sug-row eb-sug-primary" role="option" onclick="_ebSuggestAccept()">' +
      '<span class="material-icons-round eb-sug-ico">auto_awesome</span>' +
      '<span class="eb-sug-text"><span class="ebs-typed">' + _escHtml(val) + '</span><span class="ebs-rest">' + _escHtml(s.completion) + '</span></span>' +
      '<span class="eb-sug-key">Tab</span></button>';
  }
  s.alternatives.forEach(function(a, i) {
    rows += '<button type="button" class="eb-sug-row" role="option" onclick="_ebSuggestPick(' + i + ')">' +
      '<span class="eb-sug-emoji">' + _escHtml(a.emoji) + '</span>' +
      '<span class="eb-sug-text">' + _escHtml(a.text) + '</span>' +
      (a.why ? '<span class="eb-sug-why">' + _escHtml(a.why) + '</span>' : '') +
      '</button>';
  });
  if (!rows) { _ebSuggestClose(); return; }
  panel.innerHTML = rows +
    '<div class="eb-sug-foot"><span class="material-icons-round">shield</span> Vorschläge entstehen lokal in deinem Browser' +
    ' · <button type="button" class="eb-sug-reset" onclick="_ebTasteReset();_ebSuggestClose()">Personalisierung löschen</button></div>';
  panel.hidden = false;
  _ebSug.open = true;
  _ebSuggestPosition();
  if (!_ebSug.bound) {
    _ebSug.bound = true;
    window.addEventListener('scroll', _ebSuggestPosition, { passive: true });
    window.addEventListener('resize', _ebSuggestPosition);
  }
}

function _ebSuggestClose() {
  var panel = document.getElementById('ebSuggestPanel');
  if (panel) { panel.hidden = true; panel.innerHTML = ''; }
  var ghost = document.getElementById('ebGhostComplete');
  if (ghost) ghost.innerHTML = '';
  _ebSug.open = false; _ebSug.idx = -1;
}

/** Inline-Vorschlag übernehmen (Tab / → / Klick auf die erste Zeile). */
function _ebSuggestAccept() {
  var input = document.getElementById('browseSearch');
  if (!input || !_ebSug.data || !_ebSug.data.completion) return;
  input.value = _ebSug.data.full;
  _ebSuggestClose();
  input.focus();
  _ebSearchSuggestUpdate(input);   // weiter vervollständigen — Satz kann wachsen
}

/** Einen der drei Alternativvorschläge übernehmen und suchen. */
function _ebSuggestPick(i) {
  var input = document.getElementById('browseSearch');
  if (!input || !_ebSug.data) return;
  var a = _ebSug.data.alternatives[i];
  if (!a) return;
  input.value = a.text;
  _ebSuggestClose();
  _ebTasteSignal('search', { query: a.text });
  if (typeof filterListings === 'function') filterListings();
  if (typeof _ebScrollToBrowseResults === 'function') _ebScrollToBrowseResults();
}

/** Tastatursteuerung: Tab/→ übernimmt, ↓/↑ wählt, Esc schließt. */
function _ebSuggestKeydown(ev) {
  var input = ev.target;
  if (!_ebSug.open) return;
  var panel = document.getElementById('ebSuggestPanel');
  var rows = panel ? panel.querySelectorAll('.eb-sug-row') : [];
  if (ev.key === 'Tab' && _ebSug.data && _ebSug.data.completion && _ebSug.idx < 0) {
    ev.preventDefault(); _ebSuggestAccept(); return;
  }
  if (ev.key === 'ArrowRight' && input.selectionStart === input.value.length && _ebSug.data && _ebSug.data.completion) {
    ev.preventDefault(); _ebSuggestAccept(); return;
  }
  if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
    if (!rows.length) return;
    ev.preventDefault();
    _ebSug.idx += (ev.key === 'ArrowDown' ? 1 : -1);
    if (_ebSug.idx < 0) _ebSug.idx = rows.length - 1;
    if (_ebSug.idx >= rows.length) _ebSug.idx = 0;
    rows.forEach(function(r, i) { r.classList.toggle('active', i === _ebSug.idx); });
    return;
  }
  if (ev.key === 'Enter' && _ebSug.idx >= 0 && rows[_ebSug.idx]) {
    ev.preventDefault(); rows[_ebSug.idx].click(); return;
  }
  if (ev.key === 'Escape') { _ebSuggestClose(); }
}

// Klick außerhalb schließt die Vorschläge.
document.addEventListener('click', function(e) {
  if (!_ebSug.open) return;
  var panel = document.getElementById('ebSuggestPanel');
  var input = document.getElementById('browseSearch');
  if (panel && !panel.contains(e.target) && e.target !== input) _ebSuggestClose();
});
var _aiPlaceholderTimer = null;
function _initAiPlaceholder() {
  var el = document.getElementById('aiPlaceholder');
  var input = document.getElementById('browseSearch');
  if (!el || !input) return;
  var examples = [
    'DJ für Hochzeit in Berlin…',
    'Catering für 80 Personen…',
    'Fotograf für Geburtstagsfeier…',
    'Location für Firmen-Event…',
    'Pyrotechnik für Open-Air…',
    'Florist für Hochzeit in München…',
    'Moderation für Gala-Dinner…',
    'Licht & Technik für Party…',
  ];
  var idx = 0;
  if (_aiPlaceholderTimer) clearInterval(_aiPlaceholderTimer);
  el.textContent = examples[0];
  el.style.opacity = input.value ? '0' : '1';
  _aiPlaceholderTimer = setInterval(function() {
    if (input.value) return;
    el.style.opacity = '0';
    setTimeout(function() {
      idx = (idx + 1) % examples.length;
      el.textContent = examples[idx];
      if (!input.value) el.style.opacity = '1';
    }, 350);
  }, 3200);
}

// ── Category bar scroll hint arrow ──
function _initCategoryScrollHint() {
  var bar = document.querySelector('.browse-categories-bar');
  var inner = document.querySelector('.browse-categories-inner');
  if (!bar || !inner) return;

  // Remove old arrow if re-init
  var old = bar.querySelector('.scroll-hint-arrow');
  if (old) old.remove();

  // Create arrow button
  var arrow = document.createElement('button');
  arrow.className = 'scroll-hint-arrow';
  arrow.setAttribute('aria-label', 'Mehr Kategorien');
  arrow.innerHTML = '<span class="material-icons-round">chevron_right</span>';
  bar.style.position = 'sticky';
  bar.appendChild(arrow);

  function checkScroll() {
    var maxScroll = inner.scrollWidth - inner.clientWidth;
    if (maxScroll <= 10) {
      // Everything fits, hide arrow + fade
      arrow.classList.add('hidden');
      bar.style.setProperty('--after-opacity', '0');
    } else if (inner.scrollLeft >= maxScroll - 10) {
      // Scrolled to end
      arrow.classList.add('hidden');
    } else {
      arrow.classList.remove('hidden');
    }
  }

  arrow.addEventListener('click', function() {
    inner.scrollBy({ left: 200, behavior: 'smooth' });
  });

  inner.addEventListener('scroll', checkScroll, { passive: true });
  checkScroll();
}

function filterByCategory(btn, cat) {
  // On mobile: if "Alle" is tapped, open category picker sheet
  if (cat === '' && window.innerWidth <= 768) {
    openMobileCatPicker();
    return;
  }
  // Toggle active state on category buttons
  document.querySelectorAll('.cat-icon-btn').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  // Sync mobile picker active state
  document.querySelectorAll('.mobile-cat-option').forEach(function(o) {
    o.classList.toggle('active', o.getAttribute('data-cat') === (cat || ''));
  });
  // Set the category dropdown to match (empty string = all)
  var sel = document.getElementById('browseCategory');
  if (sel) sel.value = cat || '';
  filterListings();
  // Scroll results into view
  var grid = document.getElementById('browseGrid');
  if (grid) window.scrollTo({ top: grid.getBoundingClientRect().top + window.pageYOffset - 100, behavior: 'smooth' });
}

// ========== MOBILE CATEGORY PICKER ==========
function openMobileCatPicker() {
  var overlay = document.getElementById('mobileCatOverlay');
  var sheet = document.getElementById('mobileCatSheet');
  if (!overlay || !sheet) return;
  overlay.classList.add('open');
  sheet.classList.add('open');
  // Force reflow for animation
  sheet.offsetHeight;
  document.body.style.overflow = 'hidden';
}
function closeMobileCatPicker() {
  var overlay = document.getElementById('mobileCatOverlay');
  var sheet = document.getElementById('mobileCatSheet');
  if (!overlay || !sheet) return;
  overlay.classList.remove('open');
  sheet.classList.remove('open');
  document.body.style.overflow = '';
}
function selectMobileCategory(btn, cat) {
  // Update mobile picker active state
  document.querySelectorAll('.mobile-cat-option').forEach(function(o) { o.classList.remove('active'); });
  btn.classList.add('active');
  // Sync category bar buttons
  document.querySelectorAll('.cat-icon-btn').forEach(function(b) { b.classList.remove('active'); });
  document.querySelectorAll('.cat-icon-btn').forEach(function(b) {
    var btnCat = b.getAttribute('onclick');
    if (cat === '' && btnCat && btnCat.indexOf("''") !== -1) b.classList.add('active');
    else if (cat && btnCat && btnCat.indexOf("'" + cat + "'") !== -1) b.classList.add('active');
  });
  // Set the category dropdown
  var sel = document.getElementById('browseCategory');
  if (sel) sel.value = cat || '';
  closeMobileCatPicker();
  filterListings();
  // Scroll results into view
  var grid = document.getElementById('browseGrid');
  if (grid) {
    setTimeout(function() {
      window.scrollTo({ top: grid.getBoundingClientRect().top + window.pageYOffset - 100, behavior: 'smooth' });
    }, 100);
  }
}

function updateChipLabel(sel) {
  const lbl = sel.parentElement.querySelector('.chip-label');
  if (!lbl) return;
  lbl.textContent = sel.value ? sel.options[sel.selectedIndex].text : (lbl.dataset.default || '');
}

// ===== Smart Search: Token + Synonym-Cluster =====
const _EB_STOPWORDS = new Set([
  'für','fuer','in','im','am','an','mit','und','oder','der','die','das','den','dem','des',
  'ein','eine','einen','einer','eines','von','zu','zur','zum','auf','bei','aus','nach','vor',
  'ab','als','wie','sehr','etwas','bisschen','bitte','&','-','+','/','\\','|',',',';',':',
  // Satz-Füllwörter: Nutzer formulieren ganze Sätze („Ich suche einen DJ für
  // meine Hochzeit"). Ohne diese Liste scheiterte die Suche an „ich/suche/meine".
  'ich','du','wir','ihr','sie','er','es','man','mir','mich','uns','euch',
  'mein','meine','meinen','meinem','meiner','unser','unsere','unseren','unserem',
  'dein','deine','sein','seine','ihre','ihren',
  'suche','suchen','sucht','gesucht','such','finde','finden','brauche','brauchen',
  'braucht','benötige','benoetige','benötigen','benoetigen','möchte','moechte',
  'möchten','moechten','will','wollen','hätte','haette','habe','hab','haben','hat',
  'ist','sind','wäre','waere','wird','werden','kann','können','koennen','soll','sollte',
  'jemand','jemanden','wer','was','wo','wann','warum','welche','welcher','welches',
  'noch','gern','gerne','mal','denn','doch','auch','nur','schon','bald','dringend',
  'guten','gute','guter','gutes','schönen','schoenen','passenden','passende','passend',
  'professionellen','professionelle','günstigen','guenstigen','günstige','guenstige',
  'toll','tolle','tollen','super','beste','besten','bester'
]);
// Synonym-Cluster für Event-Dienstleistungen (DE). Jeder Token in einer Gruppe wird
// als äquivalent behandelt und matched alle anderen Begriffe der Gruppe.
const _EB_SYN_GROUPS = [
  ['florist','floristik','floristen','blume','blumen','blumendeko','blumenstrauss','blumenstrauß','brautstrauss','brautstrauß','hochzeitsblumen','blumenträume','blumentraeume'],
  ['dj','djs','djane','musik','beschallung','plattenteller','mischpult','sound'],
  ['band','liveband','livemusik','live-musik','musiker','musikerin','musikgruppe','combo'],
  ['foto','fotos','fotograf','fotografin','fotografie','fotografieren','bild','bilder','aufnahmen','hochzeitsfoto','hochzeitsfotograf','portrait'],
  ['video','videograf','videografin','videografie','film','filmer','filmemacher','hochzeitsvideo','clip','reels'],
  ['catering','caterer','buffet','essen','food','koch','köche','küche','partyservice','party-service','fingerfood','grill','bbq','barbecue','verpflegung'],
  ['bar','barkeeper','barkeeperin','bartender','cocktail','cocktails','mobilebar','mobile-bar','drinks'],
  ['location','locations','halle','saal','raum','räume','eventlocation','event-location','scheune','schloss','garten','gewölbe','gewoelbe','venue'],
  ['moderation','moderator','moderatorin','host','hostess','mc','ansage'],
  ['licht','beleuchtung','lichttechnik','scheinwerfer','lasershow','laser','led'],
  ['pyro','pyrotechnik','feuerwerk','feuershow','konfettikanone'],
  ['deko','dekoration','dekorateur','dekorateurin','tischdeko','raumdeko','tischschmuck'],
  ['security','sicherheit','türsteher','tuersteher','ordner','wachschutz'],
  ['transport','limousine','limo','shuttle','bus','fahrdienst','chauffeur','oldtimer'],
  ['torte','torten','kuchen','hochzeitstorte','konditor','konditorin','konditorei','tortenbäcker','tortenbaecker','patissier','patisserie'],
  ['styling','frisur','friseur','frisör','frisoer','makeup','make-up','haare','visagist','visagistin','braut-styling','brautstyling'],
  ['entertainment','zauberer','magier','künstler','kuenstler','comedian','animation','animateur','show','clown','jongleur','akrobat'],
  // Event-Typen (lockere Hinweise)
  ['hochzeit','hochzeiten','wedding','trauung','heirat','heiraten','brautpaar'],
  ['geburtstag','geb','bday','birthday','geburtstage'],
  ['firmenfeier','firma','firmenevent','firmenevents','corporate','business','teamevent','team-event'],
  ['jubiläum','jubilaeum','jubilaum','anniversary','jubilaeums'],
  ['gala','galaabend','gala-abend'],
  ['party','feier','fete','partys','parties'],
  ['taufe','konfirmation','kommunion','firmung'],
  ['weihnachtsfeier','weihnachten','xmas','christmas'],
  ['sommerfest','sommer','sommerparty'],
  ['openair','open-air','outdoor','draußen','draussen'],
  // Erweitertes Event-Universum: auch Nischen-Events sollen gefunden werden
  ['dnd','d&d','dungeons','tabletop','rollenspiel','pen-and-paper','warhammer','brettspiel','brettspielabend','rpg','pen','paper'],
  ['lan','lanparty','lan-party','gaming','esport','e-sport','konsole','turnier'],
  ['cosplay','convention','con','comiccon','comic-con','anime','manga','fantreffen'],
  ['quiz','pubquiz','kneipenquiz','bingo','spieleabend','spieleabende'],
  ['escape','escaperoom','escape-room','krimidinner','krimi-dinner','schnitzeljagd','stadtrallye'],
  ['vernissage','ausstellung','ausstellungseroeffnung','galerie','kunst','kunstausstellung'],
  ['lesung','poetry','poetryslam','poetry-slam','improtheater','kabarett','theater','buehne','bühne'],
  ['retreat','yoga','meditation','achtsamkeit','wellness','spa','entspannung'],
  ['halloween','silvester','neujahr','karneval','fasching','ostern','oktoberfest','saisonfest'],
  ['konferenz','tagung','kongress','seminar','symposium','summit','workshop','schulung','training'],
  ['messe','fachmesse','expo','ausstellungsstand','stand'],
  ['launch','produktlaunch','markteinfuehrung','markteinführung','eroeffnung','eröffnung','opening'],
  ['netzwerk','networking','meetup','stammtisch','pitch'],
  ['konzert','gig','auftritt','bandabend','livegig'],
  ['abiball','abschlussfeier','abschluss','graduation','examensfeier','einschulung'],
  ['polterabend','junggesellenabschied','jga','verlobung','antrag'],
  ['trauerfeier','beerdigung','gedenkfeier','abschiedsfeier'],
  ['sportfest','marathon','lauf','vereinsfest','sportevent'],
  ['camp','zeltlager','wanderung','picknick','grillfest'],
  ['filmabend','kino','filmpremiere','screening','openairkino'],
];
// Index Token → Set aller Synonyme (inkl. sich selbst)
const _EB_SYN_INDEX = (function() {
  const map = new Map();
  for (const g of _EB_SYN_GROUPS) {
    const set = new Set(g);
    for (const t of g) {
      if (map.has(t)) g.forEach(x => map.get(t).add(x));
      else map.set(t, new Set(set));
    }
  }
  return map;
})();
function _ebTokenizeQuery(q) {
  if (!q) return [];
  const raw = q.toLowerCase()
    .replace(/[.!?()"„"»«]/g, ' ')
    .split(/[\s,;\/\\|]+/)
    .map(t => t.replace(/^[^a-z0-9äöüß-]+|[^a-z0-9äöüß-]+$/g, ''))
    .filter(t => t.length >= 2 && !_EB_STOPWORDS.has(t));

  // Zusammengesetzte Wörter aufbrechen: „Hochzeits-Location" → auch
  // „hochzeits" + „location"; „Hochzeitsfotograf" → auch „fotograf".
  const out = [];
  const seen = new Set();
  const push = t => { if (t && t.length >= 2 && !_EB_STOPWORDS.has(t) && !seen.has(t)) { seen.add(t); out.push(t); } };
  raw.forEach(tok => {
    push(tok);
    if (tok.indexOf('-') !== -1) tok.split('-').forEach(push);
    // Bekannten Fachbegriff im Kompositum erkennen (ohne Bindestrich)
    if (tok.length >= 8 && typeof _EB_SYN_INDEX !== 'undefined') {
      for (const key of _EB_SYN_INDEX.keys()) {
        if (key.length >= 5 && key !== tok && tok.indexOf(key) !== -1) { push(key); break; }
      }
    }
  });
  return out;
}
/** Durchsuchbarer Text eines Inserats. */
function _ebHaystack(listing) {
  return `${listing.title || ''} ${listing.categoryLabel || ''} ${listing.category || ''} ${(listing.tags || []).join(' ')} ${listing.providerName || ''} ${listing.description || ''} ${listing.location || ''} ${listing.region || ''}`.toLowerCase();
}

/** Trifft ein einzelnes Token (direkt, per Synonym oder als Wortstamm)? */
function _ebTokenHits(tok, haystack) {
  if (haystack.includes(tok)) return true;
  const variants = _EB_SYN_INDEX.get(tok);
  if (variants) {
    for (const v of variants) if (haystack.includes(v)) return true;
  }
  if (tok.length >= 5) {
    // Präfix fängt Beugung/Komposita: „fotograf" → „fotografie"
    const prefix = tok.slice(0, Math.max(4, tok.length - 2));
    if (haystack.includes(prefix)) return true;
  }
  return false;
}

/**
 * Zerlegt die Anfrage in das GESUCHTE (Gewerk/Leistung) und den KONTEXT
 * (Anlass, Ort, Größe). Nur das Gesuchte darf ausschließen — der Kontext
 * verfeinert nur die Reihenfolge. Sonst findet „DJ für meine Hochzeit"
 * keinen DJ, der das Wort „Hochzeit" nicht zufällig im Text stehen hat.
 */
function _ebQueryParts(search) {
  const tokens = _ebTokenizeQuery(search);
  const core = [], context = [];
  const typeWords = new Set(['hochzeit','hochzeiten','wedding','trauung','heirat','heiraten','brautpaar',
    'geburtstag','bday','birthday','geburtstage','firmenfeier','firma','firmenevent','corporate',
    'business','teamevent','jubiläum','jubilaeum','gala','party','feier','fete','taufe','konfirmation',
    'kommunion','weihnachtsfeier','weihnachten','sommerfest','sommer','openair','open-air','outdoor']);
  tokens.forEach(t => {
    const isCity = (typeof _ebDetectCityInText === 'function') && !!_ebDetectCityInText(t);
    const isNum = /^\d+$/.test(t);
    if (typeWords.has(t) || isCity || isNum) context.push(t);
    else core.push(t);
  });
  return { tokens, core, context };
}

/**
 * Relevanz einer Anfrage für ein Inserat.
 * 0 = passt nicht. Höher = besser (für die Sortierung).
 */
function _ebMatchScore(search, listing) {
  const { tokens, core, context } = _ebQueryParts(search);
  if (!tokens.length) return 1;
  const hay = _ebHaystack(listing);

  // Das GESUCHTE muss vorkommen — sonst ist es schlicht das falsche Gewerk.
  let coreHits = 0;
  for (const t of core) if (_ebTokenHits(t, hay)) coreHits++;
  if (core.length && coreHits === 0) return 0;

  // Kein erkennbares Gewerk (z. B. nur „Hochzeit Köln")? Dann reicht ein Treffer.
  let ctxHits = 0;
  for (const t of context) if (_ebTokenHits(t, hay)) ctxHits++;
  if (!core.length && ctxHits === 0) return 0;

  // Punkte: Gewerk zählt am stärksten, Kontext hebt passende Treffer nach oben.
  let score = coreHits * 10 + ctxHits * 3;
  if (core.length && coreHits === core.length) score += 6;   // alle Kernbegriffe
  const title = String(listing.title || '').toLowerCase();
  for (const t of core) if (title.includes(t)) score += 4;   // Treffer im Titel
  return score;
}

function _ebSmartTextMatch(search, listing) {
  return _ebMatchScore(search, listing) > 0;
}

function filterListings() {
  const search = (document.getElementById('browseSearch')?.value || '').toLowerCase().trim();
  const category = document.getElementById('browseCategory')?.value || '';
  const eventType = document.getElementById('browseEventType')?.value || '';
  const location = (document.getElementById('browseLocation')?.value || '').toLowerCase().trim();
  const priceRange = document.getElementById('browsePrice')?.value || '';
  const minRating = document.getElementById('browseRating')?.value || '';

  // FIX 2026-05: Date-Range aus Nav-Date-Picker einbeziehen (war vorher nicht
  // verkabelt). Listings können `availableFrom` / `availableTo` / `unavailableDates`
  // tragen – wenn nichts angegeben, gelten sie als verfügbar.
  var dateFrom = '';
  var dateTo = '';
  try {
    if (window.selectedDateRange) {
      dateFrom = window.selectedDateRange.from || '';
      dateTo   = window.selectedDateRange.to   || dateFrom;
    }
  } catch (e) {}

  // Lernsignal: was sucht dieser Nutzer? (bleibt lokal, siehe _ebTaste)
  if (search || category || location || eventType) {
    _ebTasteSignal('search', { query: search, category: category, location: location, eventType: eventType });
  }

  let filtered = getHeroListings().filter(l => {
    if (!l) return false;
    // Smart Text-Suche: tokenisiert, entfernt Stopwörter, kennt Synonym-Cluster
    if (search && !_ebSmartTextMatch(search, l)) return false;
    if (category && l.category !== category) return false;
    // Multi-category filter from hero picker
    if (selectedCategories.size && !selectedCategories.has(l.category)) return false;
    // Event type → check listing tags (defensiv: tags kann undefined sein)
    if (eventType) {
      var et = eventType.toLowerCase();
      var tagsArr = Array.isArray(l.tags) ? l.tags : [];
      if (!tagsArr.some(t => (t || '').toLowerCase() === et)) return false;
    }
    // Location: defensiv (location/region können fehlen bei DB-Listings)
    if (location) {
      var locL = (l.location || '').toLowerCase();
      var regL = (l.region   || '').toLowerCase();
      if (!locL.includes(location) && !regL.includes(location)) return false;
    }
    // Price range
    if (priceRange) {
      if (priceRange === '2500+') { if ((l.price || 0) < 2500) return false; }
      else {
        const [min, max] = priceRange.split('-').map(Number);
        const p = +l.price || 0;
        if (p < min || p > max) return false;
      }
    }
    if (minRating && (+l.rating || 0) < parseFloat(minRating)) return false;
    // Date-Range: Listing ausschließen, wenn explizit als "nicht verfügbar"
    // an einem der gewünschten Tage markiert. Listings ohne Verfügbarkeits-
    // angaben gelten als verfügbar (kein Ausschluss).
    if (dateFrom) {
      var unavail = Array.isArray(l.unavailableDates) ? l.unavailableDates : [];
      if (unavail.length) {
        // Bei Range: wir prüfen die End-Tage konservativ
        if (unavail.indexOf(dateFrom) !== -1) return false;
        if (dateTo && dateTo !== dateFrom && unavail.indexOf(dateTo) !== -1) return false;
      }
      if (l.availableFrom && dateFrom < l.availableFrom) return false;
      if (l.availableTo   && dateTo   > l.availableTo)   return false;
    }
    return true;
  });

  // Sort
  const sort = document.getElementById('browseSort')?.value || '';
  switch (sort) {
    case 'preis-asc': filtered.sort((a, b) => a.price - b.price); break;
    case 'preis-desc': filtered.sort((a, b) => b.price - a.price); break;
    case 'rating': filtered.sort((a, b) => b.rating - a.rating); break;
    case 'neu': filtered.sort((a, b) => b.id - a.id); break;
    default:
      // Ohne explizite Sortierung: Text-Relevanz zuerst, dann Bewertung und
      // gelernte Vorlieben. So steht der passendste Treffer oben, ohne dass
      // schwache Treffer künstlich hochgespült werden.
      filtered.sort(function(a, b) {
        if (search) {
          var ar = _ebMatchScore(search, a), br = _ebMatchScore(search, b);
          if (br !== ar) return br - ar;
        }
        var af = _ebTasteAffinity(a), bf = _ebTasteAffinity(b);
        var as = (+a.rating || 0) + Math.min(1.2, af * 0.12);
        var bs = (+b.rating || 0) + Math.min(1.2, bf * 0.12);
        return bs - as;
      });
  }

  // Render active filter tags
  renderActiveFilters(search, category, eventType, location, priceRange, minRating);

  // Show results or no-results with alternatives
  const noResultsEl = document.getElementById('noResultsContainer');
  const gridEl = document.getElementById('browseGrid');

  if (filtered.length > 0) {
    gridEl.style.display = '';
    noResultsEl.style.display = 'none';
    renderBrowseGrid(filtered);
  } else {
    gridEl.style.display = 'none';
    noResultsEl.style.display = 'block';
    document.getElementById('browseResultCount').textContent = '0 Services gefunden';
    showNoResultsWithAlternatives(search, category, eventType, location);
    // Fokus/Feedback: nach unten zum Bereich "Alternativen" scrollen,
    // damit der Nutzer direkt sieht, dass Alternativen vorgeschlagen werden.
    if (!window._ebNoResScrollTimer) {
      window._ebNoResScrollTimer = setTimeout(function() {
        window._ebNoResScrollTimer = null;
        var target = document.getElementById('noResultsContainer');
        if (!target || target.style.display === 'none') return;
        // Nur scrollen, wenn das Element nicht im Viewport ist
        var rect = target.getBoundingClientRect();
        var inView = rect.top >= 80 && rect.top < window.innerHeight - 80;
        if (!inView) {
          window.scrollTo({
            top: rect.top + window.pageYOffset - 100,
            behavior: 'smooth'
          });
        }
      }, 220);
    }
  }
  // Live-Feedback-Chip unter der Hero-Suchleiste aktualisieren
  try { _ebUpdateLiveFeedback(filtered.length, search, location); } catch (e) {}
}

// Live-Feedback unterhalb der Searchbar: zeigt Treffer-Anzahl und führt zu den Ergebnissen
function _ebUpdateLiveFeedback(count, search, location) {
  var el = document.getElementById('aiLiveFeedback');
  if (!el) return;
  // Nur zeigen, wenn der User wirklich etwas eingegeben hat
  var hasInput = (search && search.length > 0) || (location && location.length > 0);
  if (!hasInput) {
    el.hidden = true;
    return;
  }
  var txt = el.querySelector('.ai-live-feedback-text');
  if (count > 0) {
    el.classList.remove('is-empty');
    if (txt) txt.textContent = count === 1
      ? '1 Treffer — Ergebnisse anzeigen'
      : count + ' Treffer — Ergebnisse anzeigen';
  } else {
    el.classList.add('is-empty');
    if (txt) txt.textContent = 'Keine Treffer — Vorschläge ansehen';
  }
  // Kurzer Re-Animation-Trigger
  el.style.animation = 'none';
  // eslint-disable-next-line no-unused-expressions
  el.offsetHeight;
  el.style.animation = '';
  el.hidden = false;
}

// Sanftes Scrollen zu den Browse-Ergebnissen oder dem Empty-State
function _ebScrollToBrowseResults() {
  setTimeout(function() {
    var noRes = document.getElementById('noResultsContainer');
    var grid = document.getElementById('browseGrid');
    var target = (noRes && noRes.style.display !== 'none') ? noRes : grid;
    if (!target) return;
    var top = target.getBoundingClientRect().top + window.pageYOffset - 100;
    window.scrollTo({ top: top, behavior: 'smooth' });
  }, 60);
}

function showNoResultsWithAlternatives(search, category, eventType, location) {
  // Build descriptive "no results" message
  const parts = [];
  if (eventType) parts.push(`„${eventType}"`);
  if (search) parts.push(`„${search}"`);
  if (location) parts.push(`in „${location.charAt(0).toUpperCase() + location.slice(1)}"`);
  if (category) {
    const catLabel = LISTINGS.find(l => l.category === category)?.categoryLabel || category;
    parts.push(`(${catLabel})`);
  }
  const desc = parts.length > 0 ? parts.join(' ') : 'deine Suche';
  document.getElementById('noResultsText').textContent =
    `Für ${desc} konnten wir leider keine passenden Services finden.`;

  // Detect category from search text (e.g. "dj" → dj, "foto" → foto, "catering hamburg" → catering)
  let detectedCategory = category || '';
  if (!detectedCategory && search) {
    const searchLower = search.toLowerCase();
    // Check against category keys and labels
    for (const [key, label] of Object.entries(CATEGORY_LABELS)) {
      if (searchLower.includes(key) || searchLower.includes(label.toLowerCase())) {
        detectedCategory = key;
        break;
      }
    }
    // Also check broader terms
    // FIX 2026-05: Duplikate entfernt.  Vorher mappte 'sound' erst auf 'dj',
    // wurde dann von 'sound' → 'licht' überschrieben (JS-Objekt: letzte
    // Definition gewinnt).  Konsequenz: "DJ Sound" → fälschlich Licht-Kategorie.
    // 'dekoration' war ebenfalls doppelt (harmlos, beide auf 'deko').
    const categoryAliases = {
      'musik': 'dj', 'disc': 'dj', 'sound': 'dj', 'beats': 'dj',
      'essen': 'catering', 'buffet': 'catering', 'kochen': 'catering', 'küche': 'catering',
      'blumen': 'florist', 'blume': 'florist', 'strauß': 'florist',
      'technik': 'licht', 'beleuchtung': 'licht', 'ton': 'licht', 'led': 'licht',
      'feuerwerk': 'pyro', 'feuer': 'pyro',
      'fotograf': 'foto', 'kamera': 'foto', 'video': 'foto', 'bild': 'foto',
      'raum': 'location', 'saal': 'location', 'halle': 'location', 'venue': 'location',
      'schmuck': 'deko', 'dekoration': 'deko',
      'planer': 'planung', 'organisation': 'planung', 'koordination': 'planung',
      'moderator': 'moderation', 'sprecher': 'moderation', 'entertainer': 'moderation',
    };
    if (!detectedCategory) {
      for (const [alias, cat] of Object.entries(categoryAliases)) {
        if (searchLower.includes(alias)) {
          detectedCategory = cat;
          break;
        }
      }
    }
  }

  // Find alternatives by relaxing filters progressively
  let alternatives = [];
  var _vis = getHeroListings();

  // 1. Same category (detected from search or filter), any location
  if (detectedCategory) {
    alternatives = _vis.filter(l => l.category === detectedCategory);
  }

  // 2. Same event type, any location  (FIX 2026-05: defensiv gegen fehlende tags)
  if (alternatives.length === 0 && eventType) {
    var etL = eventType.toLowerCase();
    alternatives = _vis.filter(l => {
      var tagsArr = Array.isArray(l && l.tags) ? l.tags : [];
      return tagsArr.some(t => (t || '').toLowerCase() === etL);
    });
  }

  // 3. Same location/region, any category  (FIX 2026-05: defensiv)
  if (alternatives.length === 0 && location) {
    alternatives = _vis.filter(l => {
      var locL = (l && l.location ? l.location : '').toLowerCase();
      var regL = (l && l.region   ? l.region   : '').toLowerCase();
      return locL.includes(location) || regL.includes(location);
    });
  }

  // 4. Fuzzy text match: search term in title, tags, description  (FIX 2026-05: defensiv)
  if (alternatives.length === 0 && search) {
    const words = search.split(/\s+/).filter(w => w.length >= 2);
    alternatives = _vis.filter(l => {
      if (!l) return false;
      var tagsTxt = Array.isArray(l.tags) ? l.tags.join(' ') : '';
      const hay = `${l.title || ''} ${l.categoryLabel || ''} ${tagsTxt} ${l.description || ''} ${l.providerName || ''}`.toLowerCase();
      return words.some(w => hay.includes(w));
    });
  }

  // 5. Fallback: zuerst sichtbare (DB-) Listings statt nur Demo-Daten.
  // FIX 2026-05: Vorher fiel der Fallback auf [...LISTINGS] zurück und zeigte
  // damit bei aktiven Nutzern fast nur Demo-Inserate als "Alternativen".
  if (alternatives.length === 0) {
    alternatives = _vis.length > 0 ? _vis.slice() : (Array.isArray(LISTINGS) ? LISTINGS.slice() : []);
  }

  // Sort by proximity to searched location.
  // Resolve canonical city from explicit location filter OR from free-text search
  // (so "DJ Bonn" / "in Bonn" also triggers nearest-neighbour sort).
  var searchCity = null;
  if (location) {
    if (typeof _ebDetectCityInText === 'function') searchCity = _ebDetectCityInText(location) || null;
    if (!searchCity) {
      searchCity = Object.keys(CITY_PROXIMITY).find(function(c){ return c.toLowerCase().includes(location); }) || null;
    }
  }
  if (!searchCity && search && typeof _ebDetectCityInText === 'function') {
    searchCity = _ebDetectCityInText(search) || null;
  }

  if (searchCity) {
    const ref = CITY_PROXIMITY[searchCity];
    alternatives = alternatives.map(a => {
      const dest = a && a.location ? CITY_PROXIMITY[a.location] : null;
      const d = dest ? Math.round(haversineKm(ref.lat, ref.lng, dest.lat, dest.lng)) : 9999;
      return { ...a, _distKm: d };
    }).sort((a, b) => a._distKm - b._distKm);
  } else {
    // No city match — sort by rating (FIX 2026-05: null-safe)
    alternatives = alternatives.map(a => ({ ...a, _distKm: null }))
      .sort((a, b) => (+b.rating || 0) - (+a.rating || 0));
  }

  // Limit to 6
  alternatives = alternatives.slice(0, 6);

  const altSection = document.getElementById('alternativesSection');
  const altGrid = document.getElementById('alternativesGrid');

  if (alternatives.length > 0) {
    altSection.style.display = '';
    let heading;
    if (searchCity) {
      heading = `<span class="material-icons-round">lightbulb</span> Alternativen in der Nähe von ${_escHtml(searchCity)}`;
    } else if (detectedCategory) {
      const catLabel = CATEGORY_LABELS[detectedCategory] || detectedCategory;
      heading = `<span class="material-icons-round">lightbulb</span> Ähnliche Angebote in der Kategorie „${_escHtml(catLabel)}"`;
    } else {
      heading = `<span class="material-icons-round">lightbulb</span> Das könnte dich auch interessieren`;
    }
    altSection.querySelector('h3').innerHTML = heading;

    altGrid.innerHTML = alternatives.map(l => {
      const distBadge = l._distKm != null && l._distKm > 0
        ? `<span class="alt-distance-badge"><span class="material-icons-round">near_me</span> ~${l._distKm} km</span>`
        : '';
      return `
        <div class="listing-card"${_aiDisclosureAttrs(l)} onclick="navigateTo('detail', ${l.id})">
          <div class="listing-card-img">
            <img src="${_escHtml(l.image)}" alt="${_escHtml(l.title)}" loading="lazy" />
            <button class="listing-fav" aria-label="Zu Favoriten hinzufügen" aria-pressed="false" onclick="event.stopPropagation(); toggleFavorite(${l.id}, this)">
              <span class="material-icons-round">favorite_border</span>
            </button>
            ${l.badge ? `<span class="listing-badge">${_escHtml(l.badge)}</span>` : ''}
          </div>
          <div class="listing-card-body">
            <div class="listing-card-top">
              <span class="listing-card-title">${_escHtml(l.title)}</span>
              <span class="listing-card-rating">
                <span class="material-icons-round">star</span> ${l.rating}
              </span>
            </div>
            ${_aiDisclosureLabelsHtml(l, 'ai-disclosure-card')}
            <div class="listing-card-category">${_escHtml(l.categoryLabel)}</div>
            <div class="listing-card-location">
              <span class="material-icons-round">location_on</span> ${_escHtml(l.location)} ${distBadge}
            </div>
            <div class="listing-card-price">${_escHtml(l.priceLabel)}</div>
            <div class="listing-card-tags">
              ${(Array.isArray(l.tags) ? l.tags : []).map(t => `<span class="listing-tag">${_escHtml(t)}</span>`).join('')}
            </div>
          </div>
        </div>`;
    }).join('');
  } else {
    altSection.style.display = 'none';
  }
}

function renderActiveFilters(search, category, eventType, location, priceRange, minRating) {
  const container = document.getElementById('activeFilters');
  const tags = [];

  if (search) tags.push({ label: `Suche: ${search}`, field: 'browseSearch' });
  if (category) {
    const catLabel = LISTINGS.find(l => l.category === category)?.categoryLabel || category;
    tags.push({ label: catLabel, field: 'browseCategory' });
  }
  if (eventType) tags.push({ label: `Event: ${eventType}`, field: 'browseEventType' });
  if (location) tags.push({ label: `Region: ${location}`, field: 'browseLocation' });
  if (priceRange) tags.push({ label: priceRange === '2500+' ? 'Über 2.500€' : priceRange.replace('-', '€ – ') + '€', field: 'browsePrice' });
  if (minRating) tags.push({ label: `★ ${minRating}+`, field: 'browseRating' });

  if (tags.length === 0) { container.innerHTML = ''; return; }

  container.innerHTML = tags.map(t =>
    `<span class="filter-tag">${_escHtml(t.label)}<button aria-label="Eingabe löschen" onclick="document.getElementById('${t.field}').value=''; filterListings();"><span class="material-icons-round">close</span></button></span>`
  ).join('') + `<button class="filter-tag-clear-all" onclick="clearAllFilters()">Alle Filter löschen</button>`;
}

function clearAllFilters() {
  ['browseSearch', 'browseCategory', 'browseEventType', 'browseLocation', 'browsePrice', 'browseRating'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  filterListings();
}

function setView(view) {
  document.getElementById('gridViewBtn').classList.toggle('active', view === 'grid');
  document.getElementById('listViewBtn').classList.toggle('active', view === 'list');
  const grid = document.getElementById('browseGrid');
  if (view === 'list') {
    grid.style.gridTemplateColumns = '1fr';
  } else {
    grid.style.gridTemplateColumns = '';
  }
}
