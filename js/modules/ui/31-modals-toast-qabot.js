// ========== MODALS ==========
function openModal(id) {
  var modal = document.getElementById(id);
  // Reset-Zustand bei Forgot-Modal
  if (id === 'forgotModal') {
    var fg = modal.querySelector('.form-group');
    var sb = modal.querySelector('button[type="submit"]');
    var sc = document.getElementById('forgotSuccess');
    if (fg) fg.style.display = '';
    if (sb) sb.style.display = '';
    if (sc) sc.style.display = 'none';
  }
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
  if (id === 'loginModal') initConditionalPasskeyLogin();
}

function closeModal(id) {
  var el = document.getElementById(id);
  el.classList.remove('show');
  document.body.style.overflow = '';
  // Fehler-Anzeigen zurücksetzen
  _clearFieldErrors(el);
  if (id === 'loginModal' && _conditionalAbort) {
    _conditionalAbort.abort();
    _conditionalAbort = null;
  }
}

function closeModalOnOverlay(e) {
  if (e.target.classList.contains('modal-overlay')) {
    closeModal(e.target.id);
  }
}

// ========== USER MENU ==========
function toggleUserMenu() {
  const menu = document.getElementById('userMenu');
  menu.classList.toggle('show');
}

// Close menu on outside click
document.addEventListener('click', (e) => {
  const menu = document.getElementById('userMenu');
  const avatar = document.getElementById('avatarBtn');
  if (!menu.contains(e.target) && !avatar.contains(e.target)) {
    menu.classList.remove('show');
  }
});

// ========== TOAST ==========
var _toastTimer = null;
function showToast(message, icon = 'check_circle') {
  const toast = document.getElementById('toast');
  document.getElementById('toastMessage').textContent = message;
  document.getElementById('toastIcon').textContent = icon;
  toast.classList.add('show');
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function() {
    toast.classList.remove('show');
    _toastTimer = null;
  }, 3000);
}

// ========== QA SUPPORT BOT (tokenfrei / muster-basiert) ==========
var _qaBotOpenedOnce = false;
var _qaAnswerCursor = 0;

var QA_TOPICS = [
  {
    id: 'login',
    icon: 'login',
    triggers: ['login', 'anmelden', 'einloggen', 'konto', 'passwort', 'email', 'e-mail', 'code', 'bestätigen', 'bestaetigen', 'registrierung'],
    replies: [
      'Ich prüfe zuerst den Zugangspfad: E-Mail, Passwort, Bestätigungscode und Passkey. Wenn du gerade festhängst, starte am besten direkt bei der Anmeldung neu.',
      'Klingt nach Zugang oder Verifizierung. Ich kann dich direkt zur Anmeldung, Registrierung oder zum Passwort-Reset bringen.',
      'Bei Login-Problemen ist der schnellste Weg: anmelden, dann Code bestätigen. Wenn ein Code abgelaufen ist, neu senden lassen.'
    ],
    actions: [
      { label: 'Anmelden', icon: 'login', kind: 'modal', target: 'loginModal' },
      { label: 'Registrieren', icon: 'person_add', kind: 'modal', target: 'registerModal' },
      { label: 'Passwort vergessen', icon: 'lock_reset', kind: 'modal', target: 'forgotModal' },
      { label: 'Support kontaktieren', icon: 'support_agent', kind: 'page', target: 'contact' }
    ]
  },
  {
    id: 'board',
    icon: 'view_kanban',
    triggers: ['board', 'planungsboard', 'planung', 'projekt', 'karte', 'geplant', 'baustein', 'paket', 'ablauf'],
    replies: [
      'Das Planungsboard ist deine Kommandozentrale: Bausteine sammeln, Pakete planen, Dienstleister kontaktieren und den Status verfolgen.',
      'Wenn es um Planung geht, ist das Board der richtige Ort. Dort kannst du Bausteine einzeln nutzen oder mehrere Angebote als Paket strukturieren.',
      'Ich leite dich ins Board. Falls du etwas bestimmtes gesucht hast, starte dort mit dem Projekt und füge passende Bausteine hinzu.'
    ],
    actions: [
      { label: 'Zum Board', icon: 'view_kanban', kind: 'page', target: 'board' },
      { label: 'Angebote suchen', icon: 'search', kind: 'page', target: 'browse' },
      { label: 'Nachrichten öffnen', icon: 'forum', kind: 'page', target: 'messages' }
    ]
  },
  {
    id: 'listing',
    icon: 'storefront',
    triggers: ['inserat', 'angebot', 'dienstleister', 'anbieter', 'erstellen', 'veröffentlichen', 'veroeffentlichen', 'bearbeiten', 'listing'],
    replies: [
      'Für Inserate gibt es zwei Wege: neues Inserat erstellen oder deine bestehenden Inserate prüfen.',
      'Wenn du Dienstleister bist, kannst du dein Angebot als Inserat veröffentlichen und später im Profil oder unter Meine Inserate kontrollieren.',
      'Ich bringe dich dorthin, wo du dein Angebot anlegen oder prüfen kannst. Achte auf klare Bilder, Preis und Leistungsumfang.'
    ],
    actions: [
      { label: 'Inserat erstellen', icon: 'add_circle', kind: 'page', target: 'create-listing' },
      { label: 'Meine Inserate', icon: 'storefront', kind: 'page', target: 'my-listings' },
      { label: 'Profil prüfen', icon: 'person', kind: 'page', target: 'profile' }
    ]
  },
  {
    id: 'payment',
    icon: 'payments',
    triggers: ['stripe', 'zahlung', 'bezahlen', 'auszahlung', 'konto', 'iban', 'connect', 'buchung', 'rechnung', 'apple pay', 'kreditkarte'],
    replies: [
      'Für Zahlungen und Auszahlungen ist Stripe zuständig. Als Dienstleister brauchst du ein verbundenes Auszahlungskonto in den Einstellungen.',
      'Bei Zahlungsfragen prüfe zuerst: Stripe-Konto verbunden, Buchung nicht eigenes Inserat, und Testmodus/Live-Modus korrekt.',
      'Ich schicke dich in die Zahlungs-/Auszahlungs-Einstellungen. Dort siehst du, ob Stripe Connect noch offen ist.'
    ],
    actions: [
      { label: 'Auszahlungs-Konto', icon: 'account_balance', kind: 'page', target: 'settings' },
      { label: 'Board-Zahlungen', icon: 'paid', kind: 'page', target: 'board' },
      { label: 'Support kontaktieren', icon: 'support_agent', kind: 'page', target: 'contact' }
    ]
  },
  {
    id: 'search',
    icon: 'travel_explore',
    triggers: ['suchen', 'suche', 'finden', 'dj', 'catering', 'fotograf', 'location', 'musik', 'event', 'hochzeit', 'geburtstag'],
    replies: [
      'Ich würde mit der Suche starten und dann nach Kategorie oder Region eingrenzen. Gute Treffer kannst du direkt ins Board übernehmen.',
      'Für Dienstleister-Suche: erst Kategorie, dann Region, dann Favorit oder Board. So verlierst du nichts.',
      'Wenn du konkrete Bausteine suchst, öffne die Suche und filtere nach Dienstleistung, Ort und Budget.'
    ],
    actions: [
      { label: 'Suche öffnen', icon: 'search', kind: 'page', target: 'browse' },
      { label: 'Feed ansehen', icon: 'dynamic_feed', kind: 'page', target: 'aktuelles' },
      { label: 'Board planen', icon: 'view_kanban', kind: 'page', target: 'board' }
    ]
  },
  {
    id: 'messages',
    icon: 'forum',
    triggers: ['nachricht', 'chat', 'kontakt', 'anfrage', 'antwort', 'kommunikation', 'support'],
    replies: [
      'Für laufende Abstimmungen ist der Nachrichtenbereich richtig. Für Plattform-Support gehe zu Kontakt & Support.',
      'Wenn du mit einem Dienstleister sprechen willst, öffne Nachrichten. Wenn Eventbörse helfen soll, nimm Kontakt & Support.',
      'Ich unterscheide kurz: Chat mit Nutzern läuft über Nachrichten, Plattformhilfe über Kontakt.'
    ],
    actions: [
      { label: 'Nachrichten', icon: 'forum', kind: 'page', target: 'messages' },
      { label: 'Kontakt & Support', icon: 'support_agent', kind: 'page', target: 'contact' }
    ]
  },
  {
    id: 'radar',
    icon: 'radar',
    triggers: ['radar', 'radius', 'umkreis', 'umgebung', 'unterwegs', 'reise', 'berlin fahren', 'in der nähe', 'in der naehe'],
    replies: [
      'Im Radar wählst du eine Stadt oder gibst freiwillig deinen Standort frei. Danach siehst du Events und Dienstleister nach Entfernung und kannst den Radius bis 250 km erweitern.',
      'Für eine Reise in eine andere Stadt: Öffne Aktuelles, wähle Radar, stelle die Zielstadt ein und passe den Radius an. Der genaue Standort bleibt im Browser.'
    ],
    actions: [
      { label: 'Radar öffnen', icon: 'radar', kind: 'page', target: 'aktuelles' },
      { label: 'Suche öffnen', icon: 'search', kind: 'page', target: 'browse' }
    ]
  },
  {
    id: 'business',
    icon: 'insights',
    triggers: ['business', 'cockpit', 'umsatz', 'einnahmen', 'statistik', 'steuer', 'steuern', 'pdf', 'rechnung', 'rechnungen', 'auftrag'],
    replies: [
      'Im Business-Cockpit siehst du Auftragsvolumen, Auszahlungen, offene Aufträge und Rechnungs-PDFs. Dort pflegst du auch Kleinunternehmerstatus, Steuersatz und Rechnungspräfix.',
      'Deine Plattformbuchungen werden im Business-Cockpit zu Umsatz, Pipeline und PDF-Abrechnungen zusammengeführt. Steuerangaben kannst du direkt dort speichern.'
    ],
    actions: [
      { label: 'Business-Cockpit', icon: 'insights', kind: 'page', target: 'business' },
      { label: 'Auftragsboard', icon: 'assignment', kind: 'page', target: 'auftraege' },
      { label: 'Auszahlungen', icon: 'account_balance', kind: 'page', target: 'settings' }
    ]
  },
  {
    id: 'collaboration',
    icon: 'handshake',
    triggers: ['partnerschaft', 'partner', 'zusammenarbeit', 'arbeitet zusammen', 'referenz', 'empfehlung', 'connection'],
    replies: [
      'Unter „Arbeitet zusammen mit“ kannst du eine echte Zusammenarbeit anfragen. Sie wird erst öffentlich, wenn der andere Dienstleister bestätigt – so bleibt die Referenz glaubwürdig.',
      'Bestätigte Partner schaffen Vertrauen und werden bei passenden Angeboten als Netzwerk vorgeschlagen. Offene Anfragen findest du im eigenen Profil.'
    ],
    actions: [
      { label: 'Mein Profil', icon: 'person', kind: 'page', target: 'profile' },
      { label: 'Benachrichtigungen', icon: 'notifications', kind: 'page', target: 'notifications' }
    ]
  },
  {
    id: 'media',
    icon: 'auto_awesome',
    triggers: ['bild', 'bilder', 'foto', 'fotos', 'galerie', 'portfolio', 'motiv', 'ki bild', 'profilbild'],
    replies: [
      'Eigene Uploads und neue Motive werden deinem Account zugeordnet. Im Business-Cockpit kannst du ein einzigartiges Markenmotiv entwerfen und direkt ins Portfolio oder als Profilbild übernehmen.',
      'Deine Bilder pflegst du im Profil. Für einen schnellen individuellen Entwurf gibt es zusätzlich das Smart Media Studio im Business-Cockpit.'
    ],
    actions: [
      { label: 'Media Studio', icon: 'auto_awesome', kind: 'page', target: 'business' },
      { label: 'Profil bearbeiten', icon: 'photo_library', kind: 'page', target: 'profile' }
    ]
  },
  {
    id: 'safechat',
    icon: 'shield',
    triggers: ['telefonnummer', 'adresse teilen', 'mailadresse', 'außerhalb', 'ausserhalb', 'kontaktdaten', 'whatsapp'],
    replies: [
      'Zum Schutz beider Seiten blockiert Eventbörse Telefonnummern, E-Mail-Adressen, Anschriften, externe Links und Messenger im Chat. Nutzt Nachrichten, Angebot und Buchung vollständig auf der Plattform.',
      'Kontaktdaten außerhalb der Plattform sind im Nutzerchat nicht erlaubt. So bleiben Absprachen, Zahlungen und Nachweise geschützt und nachvollziehbar.'
    ],
    actions: [
      { label: 'Nachrichten', icon: 'forum', kind: 'page', target: 'messages' },
      { label: 'Sicherheitsinfos', icon: 'policy', kind: 'page', target: 'community' }
    ]
  },
  {
    id: 'legal',
    icon: 'policy',
    triggers: ['agb', 'datenschutz', 'recht', 'impressum', 'widerruf', 'cookie', 'cookies', 'melden', 'dsa', 'sicherheit'],
    replies: [
      'Für rechtliche Infos leite ich dich direkt zur passenden Seite. Wenn es um einen konkreten Inhalt geht, nutze zusätzlich den Supportkontakt.',
      'Rechtsthemen sollten sauber nachvollziehbar sein. Ich kann dich zu Datenschutz, AGB, Impressum oder Meldeweg bringen.',
      'Ich gebe hier keine Rechtsberatung, aber ich bringe dich zur passenden Eventbörse-Infoseite.'
    ],
    actions: [
      { label: 'Datenschutz', icon: 'privacy_tip', kind: 'page', target: 'datenschutz' },
      { label: 'AGB', icon: 'description', kind: 'page', target: 'agb' },
      { label: 'Impressum', icon: 'badge', kind: 'page', target: 'impressum' },
      { label: 'Meldeweg', icon: 'flag', kind: 'page', target: 'dsa' }
    ]
  }
];

/* ══════════════════════════════════════════════════════════════════
   WISSENSBASIS (Vault → Website)  ·  Impuls 5 aus vault/00-Kern/Wissensstroeme
   ------------------------------------------------------------------
   assets/eb-knowledge.json wird aus dem Obsidian-Vault erzeugt und enthält
   AUSSCHLIESSLICH Notizen mit `share: public` (siehe
   vault/00-Kern/Sicherheits-Klassifikation.md). Sowohl der QA-Bot als auch
   der Board-Planungs-Assistent befragen dieselbe Basis — dadurch hat die
   Seite auf deutlich mehr Fragen eine fundierte Antwort statt eines
   allgemeinen Fallbacks.
   Läuft rein lokal im Browser: Laden = eine statische JSON-Datei, die Suche
   ist ein kleines Keyword-Ranking. Keine externe KI, keine Tokens.
   ══════════════════════════════════════════════════════════════════ */
var _ebKb = null;          // { entries: [...] } sobald geladen
var _ebKbState = 'idle';   // idle | loading | ready | failed
var _ebKbMiss = [];        // Impuls 6: Fragen ohne Treffer (Wissenslücken)

function _ebKbLoad() {
  if (_ebKbState === 'loading' || _ebKbState === 'ready') return;
  _ebKbState = 'loading';
  // Basis-URL robust bestimmen: bevorzugt themeUrl vom Server, sonst aus dem
  // <script src=".../app.js"> ableiten (funktioniert auch auf Unterrouten wie
  // /detail/10010, wo ein relativer Pfad ins Leere liefe).
  var base = '';
  if (window.eventboerseApi && window.eventboerseApi.themeUrl) {
    base = String(window.eventboerseApi.themeUrl).replace(/\/$/, '');
  } else {
    var tag = document.querySelector('script[src*="app.js"]');
    if (tag) base = String(tag.src).replace(/\/app\.js.*$/, '');
  }
  var url = (base ? base + '/' : '') + 'assets/eb-knowledge.json';
  fetch(url, { credentials: 'same-origin' })
    .then(function(r) { if (!r.ok) throw new Error('kb'); return r.json(); })
    .then(function(kb) {
      _ebKb = (kb && Array.isArray(kb.entries)) ? kb : null;
      _ebKbState = _ebKb ? 'ready' : 'failed';
    })
    .catch(function() { _ebKbState = 'failed'; });
}

var _EB_KB_STOP = ['und','oder','der','die','das','den','dem','ein','eine','ist','sind','wie','was','wer',
  'wo','wann','warum','kann','ich','mir','mich','mein','meine','für','mit','von','auf','aus','bei','zum',
  'zur','man','sich','nicht','nur','man','habe','hab','soll','muss','wird','werden','wenn','dann','denn',
  // Füllverben in Fragen — sonst gewinnt „…funktioniert nicht" jede „Wie funktioniert X?"-Frage
  'funktioniert','funktionieren','funktionierts','geht','gehts','macht','machen','erklär','erkläre',
  'erklaer','erklaere','sagen','sag','bitte','eigentlich','genau','überhaupt','ueberhaupt',
  // Frage-Modifikatoren ohne eigenen Inhalt („Wie hoch/viel/lange …")
  'hoch','viel','viele','lange','oft','weit','groß','gross'];

function _ebKbTokens(text) {
  return String(text || '').toLowerCase()
    .replace(/[^a-zäöüß0-9\s-]/g, ' ')
    .split(/\s+/)
    // ab 2 Zeichen, damit Fachbegriffe wie „dj" nicht verloren gehen
    .filter(function(w) { return w.length >= 2 && _EB_KB_STOP.indexOf(w) === -1; });
}

/** Grober deutscher Wortstamm — fängt Beugungen ab (kostet→kost, Zahlungen→zahlung). */
function _ebKbStem(w) {
  if (w.length <= 4) return w;
  return w.replace(/(ungen|ende|erin|keit|heit|ung|est|ern|em|en|er|es|et|st|e|n|s|t)$/, '');
}

/** Beste Wissens-Abschnitte zu einer Frage (Keyword-Ranking, lokal). */
function _ebKbSearch(query, limit) {
  if (_ebKbState !== 'ready' || !_ebKb) return [];
  var qs = _ebKbTokens(query);
  if (!qs.length) return [];
  var scored = [];
  _ebKb.entries.forEach(function(e) {
    var hay = (e.title + ' ' + e.heading + ' ' + e.text).toLowerCase();
    var keys = e.keys || [];
    var score = 0, hits = 0;
    qs.forEach(function(w) {
      // Kurze Wörter nur als ganzes Wort werten — sonst trifft „hoch" die
      // „Hochzeit" und eine Off-Topic-Frage bekommt eine Scheinantwort.
      var whole = function(h) {
        if (w.length >= 6) return h.indexOf(w) !== -1;
        return new RegExp('(^|[^a-zäöüß])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-zäöüß]|$)').test(h);
      };
      var inKey = keys.indexOf(w) !== -1;
      var inHead = whole((e.heading || '').toLowerCase());
      var inText = whole(hay);
      if (inHead) { score += 6; hits++; }
      else if (inKey) { score += 4; hits++; }
      else if (inText) { score += 2; hits++; }
      else {
        // Beugung abfangen: „kostet" ~ „Kosten"
        var stem = _ebKbStem(w);
        var frag = (stem.length >= 4 && hay.indexOf(stem) !== -1) ? stem : '';
        // Komposita über Präfixe: „provisionsregelung" ~ „Provision",
        // „zahlungsdaten" ~ „Zahlung"
        if (!frag && w.length >= 8) {
          for (var L = w.length - 1; L >= 6 && !frag; L--) {
            if (hay.indexOf(w.slice(0, L)) !== -1) frag = w.slice(0, L);
          }
        }
        if (frag) {
          // Lange, spezifische Wörter sind ein starkes Signal — und noch stärker,
          // wenn sie in der Überschrift des Abschnitts stecken.
          var inHeadFrag = (e.heading || '').toLowerCase().indexOf(frag) !== -1;
          score += inHeadFrag ? 5 : (w.length >= 8 ? 4 : 1.5);
          hits++;
        }
      }
    });
    if (!hits) return;
    // Abdeckung belohnen: viele der Frage-Wörter gefunden = relevanter
    score *= (0.5 + hits / qs.length);
    scored.push({ e: e, score: score, hits: hits });
  });
  scored.sort(function(a, b) { return b.score - a.score; });
  return scored.slice(0, limit || 3);
}

/** Reicht der beste Treffer als echte Antwort? */
function _ebKbGoodHit(query) {
  var r = _ebKbSearch(query, 1);
  if (!r.length) return null;
  var qs = _ebKbTokens(query);
  var need = qs.length <= 2 ? 1 : 2;
  if (r[0].hits < need || r[0].score < 5) return null;
  return r[0].e;
}

/** Alle erklärbaren Themen (Notiztitel) mit ihren Fragen — für „Was kannst du erklären?". */
function _ebKbTopics() {
  if (_ebKbState !== 'ready' || !_ebKb) return [];
  var byTitle = {};
  _ebKb.entries.forEach(function(e) {
    // Themenliste = nutzerseitige Hilfe-Notizen. Feature-/Flow-Doku bleibt als
    // Antwortquelle nutzbar, taucht aber nicht als „Thema" auf.
    if (String(e.source || '').indexOf('10-Produkt/Wissen/') !== 0) return;
    if (!byTitle[e.title]) byTitle[e.title] = [];
    if (e.heading) byTitle[e.title].push(e.heading);
  });
  return Object.keys(byTitle).map(function(title) {
    return { title: title, questions: byTitle[title] };
  });
}

/** Ähnliche Fragen vorschlagen, wenn kein sicherer Treffer da ist. */
function _ebKbSuggestions(query, n) {
  return _ebKbSearch(query, n || 3)
    .filter(function(r) { return r.e.heading; })
    .map(function(r) { return r.e.heading; });
}

/** Wissenslücke merken (Impuls 6). */
function _ebKbNoteMiss(q) {
  try {
    if (!q) return;
    _ebKbMiss.push({ q: String(q).slice(0, 140), t: Date.now() });
    if (_ebKbMiss.length > 50) _ebKbMiss.shift();
    ebSpeichern('eb_kb_misses', JSON.stringify(_ebKbMiss));
  } catch (e) {}
}

var QA_FALLBACK = {
  id: 'fallback',
  icon: 'support_agent',
  replies: [
    'Ich bin noch nicht sicher, was du meinst. Ich kann dich aber direkt zu den wichtigsten Bereichen bringen.',
    'Ich habe dafür keinen eindeutigen Treffer. Wähle einen der nächsten Wege, dann bist du schneller am Ziel.',
    'Hilf mir mit einem Wort wie Login, Board, Inserat, Zahlung oder Suche. Bis dahin zeige ich dir die sinnvollsten Abkürzungen.'
  ],
  actions: [
    { label: 'Suche', icon: 'search', kind: 'page', target: 'browse' },
    { label: 'Board', icon: 'view_kanban', kind: 'page', target: 'board' },
    { label: 'Kontakt', icon: 'support_agent', kind: 'page', target: 'contact' },
    { label: 'Anmelden', icon: 'login', kind: 'modal', target: 'loginModal' }
  ]
};

function _qaNormalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss');
}

function _qaPick(list, seed) {
  if (!list || !list.length) return '';
  var n = 0;
  var s = String(seed || '') + ':' + _qaAnswerCursor++;
  for (var i = 0; i < s.length; i++) n = (n + s.charCodeAt(i) * (i + 3)) % 997;
  return list[n % list.length];
}

function _qaFindTopic(text) {
  var q = _qaNormalize(text);
  if (!q) return QA_FALLBACK;
  var best = null;
  var bestScore = 0;
  QA_TOPICS.forEach(function(topic) {
    var score = 0;
    topic.triggers.forEach(function(t) {
      var key = _qaNormalize(t);
      if (q.indexOf(key) !== -1) score += key.length > 5 ? 3 : 2;
    });
    if (score > bestScore) {
      bestScore = score;
      best = topic;
    }
  });
  return best || QA_FALLBACK;
}

function _qaRenderActions(actions) {
  if (!actions || !actions.length) return '';
  return '<div class="eb-qa-actions">' + actions.map(function(action) {
    var kind = String(action.kind || '').replace(/[^a-z_-]/gi, '');
    var target = String(action.target || '').replace(/[^a-z0-9_-]/gi, '');
    return '<button type="button" class="eb-qa-action" data-kind="' + kind + '" data-target="' + target + '" onclick="runQaAction(this.dataset.kind,this.dataset.target)">' +
      '<span class="material-icons-round">' + _escHtml(action.icon || 'arrow_forward') + '</span>' +
      _escHtml(action.label || 'Öffnen') +
    '</button>';
  }).join('') + '</div>';
}

function _qaAddMessage(role, text, actions) {
  var box = document.getElementById('qaMessages');
  if (!box) return;
  var row = document.createElement('div');
  row.className = 'eb-qa-msg ' + (role === 'user' ? 'user' : 'bot');
  row.innerHTML =
    '<div class="eb-qa-bubble">' + _escHtml(text) + '</div>' +
    (role === 'bot' ? _qaRenderActions(actions) : '');
  box.appendChild(row);
  box.scrollTop = box.scrollHeight;
}

function _qaWelcomeText() {
  var role = currentUser ? (currentUser.role || currentUser.baseRole || 'Mitglied') : 'Gast';
  return _qaPick([
    'Hi, ich bin dein Eventbörse-Assistent. Frag mich zu Planung, Radar, Buchung, Partnerschaften, Rechnungen oder deinem Profil.',
    'Willkommen! Beschreibe kurz, was du vorhast – ich erkläre den passenden Ablauf und bringe dich direkt dorthin.',
    'Ich helfe dir bei deinem nächsten Schritt auf Eventbörse. Du bist gerade als ' + role + ' unterwegs.'
  ], role + Date.now());
}

function openQaBot() {
  var panel = document.getElementById('qaPanel');
  var btn = document.getElementById('qaLauncher');
  var input = document.getElementById('qaInput');
  if (!panel || !btn) return;
  _ebKbLoad(); // Wissensbasis beim Öffnen laden (einmalig, still)
  panel.hidden = false;
  btn.setAttribute('aria-expanded', 'true');
  if (!_qaBotOpenedOnce) {
    _qaAddMessage('bot', _qaWelcomeText(), [
      { label: 'Login', icon: 'login', kind: 'modal', target: 'loginModal' },
      { label: 'Board', icon: 'view_kanban', kind: 'page', target: 'board' },
      { label: 'Suche', icon: 'search', kind: 'page', target: 'browse' }
    ]);
    _qaBotOpenedOnce = true;
  }
  setTimeout(function() { if (input) input.focus(); }, 80);
}

function closeQaBot() {
  var panel = document.getElementById('qaPanel');
  var btn = document.getElementById('qaLauncher');
  if (panel) panel.hidden = true;
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

function toggleQaBot() {
  var panel = document.getElementById('qaPanel');
  if (!panel || panel.hidden) openQaBot();
  else closeQaBot();
}

function askQaPreset(text) {
  openQaBot();
  var input = document.getElementById('qaInput');
  if (input) input.value = text;
  _qaAnswer(text);
  if (input) input.value = '';
}

function _qaAnswer(text) {
  var topic = _qaFindTopic(text);
  _qaAddMessage('user', text);

  // Wissensbasis zuerst befragen: liefert sie einen klaren Treffer, antworten
  // wir inhaltlich statt nur weiterzuleiten (Impuls 5).
  var hit = _ebKbGoodHit(text);
  if (hit) {
    var kbAnswer = hit.text;
    if (kbAnswer.length > 460) kbAnswer = kbAnswer.slice(0, 450).replace(/\s+\S*$/, '') + ' …';
    var acts = (topic.id !== 'fallback' && topic.actions) ? topic.actions : QA_FALLBACK.actions;
    setTimeout(function() { _qaAddMessage('bot', kbAnswer, acts); }, 180);
    return;
  }

  // Themenübersicht: „Was kannst du erklären?"
  if (/(was kannst du|welche themen|worüber|worueber|themen|hilfe|womit hilfst)/i.test(text)) {
    var topics = _ebKbTopics();
    if (topics.length) {
      var list = 'Ich kann dir zu allem Auskunft geben, was öffentlich ist: ' +
        topics.map(function(t) { return t.title; }).join(' · ') +
        '. Stell einfach deine Frage — z. B. „Wie hoch ist die Provision?".';
      setTimeout(function() { _qaAddMessage('bot', list, QA_FALLBACK.actions); }, 180);
      return;
    }
  }

  var answer = _qaPick(topic.replies, topic.id + ':' + text);
  if (topic.id !== 'fallback' && currentUser) {
    answer += ' Ich berücksichtige, dass du gerade als ' + (currentUser.role || 'Nutzer') + ' unterwegs bist.';
  }
  if (topic.id === 'fallback') {
    _ebKbNoteMiss(text);
    // Statt Sackgasse: ähnliche beantwortbare Fragen anbieten.
    var sug = _ebKbSuggestions(text, 3);
    if (sug.length) answer += ' Vielleicht hilft dir eine dieser Fragen: „' + sug.join('", „') + '".';
  }
  setTimeout(function() {
    _qaAddMessage('bot', answer, topic.actions);
  }, 180);
}

function handleQaAsk(e) {
  e.preventDefault();
  var input = document.getElementById('qaInput');
  var value = input ? input.value.trim() : '';
  if (!value) {
    _qaAddMessage('bot', 'Frag mich zum Beispiel nach Radar, Hochzeit planen, Partnerschaften, Rechnungen, Bildern oder sicheren Nachrichten.', QA_FALLBACK.actions);
    return;
  }
  if (input) input.value = '';
  _qaAnswer(value);
}

function runQaAction(kind, target) {
  closeQaBot();
  if (kind === 'modal' && target) {
    openModal(target);
    return;
  }
  if (kind === 'page' && target) {
    navigateTo(target);
    return;
  }
  if (kind === 'toast') {
    showToast(target || 'Erledigt.', 'info');
  }
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeQaBot();
});
