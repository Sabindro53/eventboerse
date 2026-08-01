/* ==================== PLANUNGS-ASSISTENT (lokale "KI", ChatGPT-Look) ==================== */
// Regelbasierter Assistent für das Planungs-Board — läuft KOMPLETT im
// Browser: keine externen KI-Calls, keine Tokens, keine Kosten. Versteht
// Event-Typen, Dienstleister-Kategorien, Budget-/Termin-/Checklisten-Fragen
// und legt Projekte & Board-Karten direkt an.

var _AI_CATS = [
  { key: 'dj',         emoji: '🎧', label: 'DJ & Musik' },
  { key: 'catering',   emoji: '🍽️', label: 'Catering' },
  { key: 'foto',       emoji: '📷', label: 'Fotografie' },
  { key: 'location',   emoji: '🏰', label: 'Location' },
  { key: 'licht',      emoji: '💡', label: 'Licht & Technik' },
  { key: 'florist',    emoji: '💐', label: 'Floristik' },
  { key: 'moderation', emoji: '🎤', label: 'Moderation' },
  { key: 'deko',       emoji: '🎈', label: 'Dekoration' }
];
var _AI_TYPES = [
  [/hochzeit|heirat|braut/i,                                        'wedding',    '💍', 'Hochzeit'],
  [/kinderfest|kindergeburtstag/i,                                  'kids',       '🎈', 'Kinderfest'],
  [/geburtstag|b-?day/i,                                            'birthday',   '🎂', 'Geburtstag'],
  [/firmenfeier|firmen-?event|weihnachtsfeier|sommerfest|betriebsfeier/i, 'corporate', '🏢', 'Firmenfeier'],
  [/festival|open-?air/i,                                           'festival',   '🎪', 'Festival'],
  [/konferenz|tagung|kongress|seminar/i,                            'conference', '🎤', 'Konferenz'],
  [/taufe|kommunion|konfirmation/i,                                 'baptism',    '⛪', 'Taufe/Feier'],
  [/privatfeier|party|feier|jubil[äa]um|abschluss/i,                'private',    '🏡', 'Privatfeier']
];
var _AI_TMPL_EMOJI = { wedding:'💍', birthday:'🎂', corporate:'🏢', festival:'🎪', conference:'🎤', baptism:'⛪', kids:'🎈', private:'🏡', custom:'✨' };

/* ─── Chat-State (localStorage, pro Nutzer) ─────────────────── */
var _aiMsgs = null;
var _aiCtxProjectId = null;

function _aiKey() {
  return 'eb_ai_chat_v1_' + (currentUser && currentUser.id ? currentUser.id : 'gast');
}
function _aiLoad() {
  if (_aiMsgs) return _aiMsgs;
  try { _aiMsgs = JSON.parse(localStorage.getItem(_aiKey()) || '[]'); } catch (e) { _aiMsgs = []; }
  if (!Array.isArray(_aiMsgs)) _aiMsgs = [];
  return _aiMsgs;
}
function _aiSave() {
  try { localStorage.setItem(_aiKey(), JSON.stringify((_aiMsgs || []).slice(-60))); } catch (e) {}
}
function _aiCtxProject() {
  if (_aiCtxProjectId) {
    var p = (_boardProjects || []).find(function(x) { return x.id === _aiCtxProjectId; });
    if (p) return p;
  }
  return (_boardProjects || [])[0] || null;
}

/* ─── Layout (Sidebar + Chat) ───────────────────────────────── */
function _aiBoardLayoutHtml(isProvider) {
  var catsHtml = _AI_CATS.map(function(c) {
    return '<button type="button" class="bai-cat" onclick="_aiAskCategory(\'' + c.key + '\')">' +
      '<span class="bai-cat-emoji">' + c.emoji + '</span>' + c.label + '</button>';
  }).join('');
  return '<div class="board-ai-layout">' +
    '<aside class="bai-side">' +
      '<button type="button" class="bai-new" onclick="' + (currentUser ? 'openCreateBoardModal()' : "openModal('loginModal')") + '">' +
        '<span class="material-icons-round">add</span> Neues Event-Projekt</button>' +
      '<div class="bai-side-scroll">' +
        '<div class="bai-side-title">Projekte</div>' +
        '<div class="bai-plist" id="baiProjects"></div>' +
        '<div class="bai-side-title">Kategorien</div>' +
        '<div class="bai-cats">' + catsHtml + '</div>' +
      '</div>' +
      '<div class="bai-side-foot"><span class="material-icons-round">offline_bolt</span>' +
        'Läuft lokal im Browser — ohne KI-Token, 0&nbsp;€ Kosten</div>' +
    '</aside>' +
    '<div class="bai-main">' +
      '<div class="bai-head">' +
        '<div class="bai-head-title"><span class="bai-ava">✨</span>' +
          '<div><b>Planungs-Assistent</b><em>Dein Event-Copilot — lokal &amp; kostenlos</em></div></div>' +
        '<button type="button" class="bai-clear" onclick="_aiClearChat()" title="Verlauf löschen" aria-label="Verlauf löschen">' +
          '<span class="material-icons-round">delete_sweep</span></button>' +
      '</div>' +
      '<div class="bai-chat" id="baiChat"></div>' +
      '<div class="bai-suggests" id="baiSuggests"></div>' +
      '<form class="bai-inputrow" onsubmit="_aiSend(event)">' +
        '<input type="text" id="baiInput" placeholder="Beschreib dein Event oder stell eine Frage…" autocomplete="off" maxlength="300" oninput="_aiInputSuggest(this)" />' +
        '<button type="submit" class="bai-send" aria-label="Senden"><span class="material-icons-round">arrow_upward</span></button>' +
      '</form>' +
    '</div>' +
  '</div>' +
  (isProvider ? _renderAuftragsboardSectionHtml({ state: 'loading', jobs: [] }) : '');
}

function _aiRenderSidebarProjects() {
  var el = document.getElementById('baiProjects');
  if (!el) return;
  if (!currentUser) {
    el.innerHTML = '<button type="button" class="bai-plist-login" onclick="openModal(\'loginModal\')">' +
      '<span class="material-icons-round">login</span> Anmelden für Projekte</button>';
    return;
  }
  if (!(_boardProjects || []).length) {
    el.innerHTML = '<div class="bai-plist-empty">Noch keine Projekte — sag mir einfach, was du planst!</div>';
    return;
  }
  var ctx = _aiCtxProject();
  el.innerHTML = _boardProjects.map(function(p) {
    var active = ctx && p.id === ctx.id;
    return '<div class="bai-pitem' + (active ? ' active' : '') + '" onclick="openBoardProject(\'' + p.id + '\')" title="' + _escHtml(p.name) + '">' +
      '<span class="bai-pitem-emoji">' + (_AI_TMPL_EMOJI[p.template] || '✨') + '</span>' +
      '<span class="bai-pitem-name">' + _escHtml(p.name) + '</span>' +
      '<span class="bai-pitem-acts">' +
        '<button type="button" onclick="event.stopPropagation();openEditBoardProjectModal(\'' + p.id + '\')" title="Bearbeiten" aria-label="Projekt bearbeiten"><span class="material-icons-round">edit</span></button>' +
        '<button type="button" onclick="event.stopPropagation();deleteBoardProjectById(\'' + p.id + '\')" title="Löschen" aria-label="Projekt löschen"><span class="material-icons-round">close</span></button>' +
      '</span></div>';
  }).join('');
}

/* ─── Chat-Rendering ────────────────────────────────────────── */
function _aiMsgHtml(m) {
  if (m.role === 'user') {
    return '<div class="bai-msg user"><div class="bai-bubble">' + m.html + '</div></div>';
  }
  return '<div class="bai-msg ai"><span class="bai-msg-ava">✨</span><div class="bai-bubble">' + m.html + '</div></div>';
}

function _aiRenderChat() {
  _aiMsgs = null; // pro Nutzer neu laden (Login-Wechsel)
  var chat = document.getElementById('baiChat');
  if (!chat) return;
  var msgs = _aiLoad();
  if (!msgs.length) {
    chat.innerHTML = '<div class="bai-hello">' +
      '<span class="bai-hello-emoji">✨</span>' +
      '<h3>Womit kann ich helfen?</h3>' +
      '<p>Ich bin dein Planungs-Assistent: Ich lege Event-Projekte an, finde passende Dienstleister, checke Budget &amp; Termine — direkt hier im Browser, ohne externe KI.</p>' +
    '</div>';
  } else {
    chat.innerHTML = msgs.map(_aiMsgHtml).join('');
  }
  _aiRenderSuggests();
  chat.scrollTop = chat.scrollHeight;
}

function _aiRenderSuggests() {
  var el = document.getElementById('baiSuggests');
  if (!el) return;
  var chips = (currentUser && _aiCtxProject())
    ? ['Was fehlt noch?', 'Budget-Übersicht', 'Zeig mir Fotografen', 'Wie viele Tage noch?']
    : ['Ich plane eine Hochzeit', 'Geburtstagsparty organisieren', 'Zeig mir DJs', 'Was kannst du erklären?'];
  // Gelernte Vorlieben nach vorn holen — der Assistent kennt seinen Nutzer.
  try {
    var topCat = _ebTasteTop('cats', 1)[0];
    var topType = _ebTasteTop('types', 1)[0];
    if (topCat && _EB_CAT_GRAMMAR[topCat]) {
      chips.unshift('Zeig mir ' + _EB_CAT_GRAMMAR[topCat].label);
    } else if (topType && _EB_TYPE_GRAMMAR[topType]) {
      chips.unshift('Ich plane ' + _EB_TYPE_GRAMMAR[topType].label.toLowerCase());
    }
  } catch (e) {}
  el.innerHTML = chips.slice(0, 5).map(function(c) {
    return '<button type="button" class="bai-chip" onclick="_aiQuick(this.textContent)">' + _escHtml(c) + '</button>';
  }).join('');
}

/**
 * Live-Vervollständigung im Board-Assistenten: während des Tippens werden
 * dieselben Satz-Vorschläge angeboten wie in der Suche.
 */
function _aiInputSuggest(inputEl) {
  var el = document.getElementById('baiSuggests');
  if (!el || !inputEl) return;
  var val = inputEl.value || '';
  if (val.trim().length < 3) { _aiRenderSuggests(); return; }
  var s = _ebSuggest(val);
  var items = [];
  if (s.completion) items.push({ text: s.full, emoji: '✨' });
  s.alternatives.forEach(function(a) { items.push({ text: a.text, emoji: a.emoji }); });
  if (!items.length) { _aiRenderSuggests(); return; }
  el.innerHTML = items.slice(0, 4).map(function(it) {
    var safe = String(it.text).replace(/'/g, '\\u0027');
    return '<button type="button" class="bai-chip bai-chip-sug" onclick="_aiAcceptSuggest(\'' + _escHtml(safe) + '\')">' +
      _escHtml(it.emoji) + ' ' + _escHtml(it.text) + '</button>';
  }).join('');
}

/** Vorschlag ins Eingabefeld übernehmen — der Nutzer kann weiterschreiben. */
function _aiAcceptSuggest(text) {
  var inp = document.getElementById('baiInput');
  if (!inp) return;
  inp.value = String(text || '');
  inp.focus();
  try { inp.setSelectionRange(inp.value.length, inp.value.length); } catch (e) {}
  _aiInputSuggest(inp);
}

function _aiPushMsg(role, html) {
  var msgs = _aiLoad();
  msgs.push({ role: role, html: html, t: Date.now() });
  _aiSave();
  var chat = document.getElementById('baiChat');
  if (!chat) return;
  var hello = chat.querySelector('.bai-hello');
  if (hello) hello.remove();
  chat.insertAdjacentHTML('beforeend', _aiMsgHtml({ role: role, html: html }));
  chat.scrollTop = chat.scrollHeight;
  if (role === 'ai') _aiRenderSuggests();
}

function _aiTyping(on) {
  var chat = document.getElementById('baiChat');
  if (!chat) return;
  var t = document.getElementById('baiTyping');
  if (on && !t) {
    chat.insertAdjacentHTML('beforeend',
      '<div class="bai-msg ai" id="baiTyping"><span class="bai-msg-ava">✨</span>' +
      '<div class="bai-bubble bai-typing"><i></i><i></i><i></i></div></div>');
    chat.scrollTop = chat.scrollHeight;
  }
  if (!on && t) t.remove();
}

function _aiClearChat() {
  _aiMsgs = [];
  _aiSave();
  _aiRenderChat();
}

/* ─── Eingaben ──────────────────────────────────────────────── */
function _aiSend(ev) {
  ev.preventDefault();
  var inp = document.getElementById('baiInput');
  var t = (inp && inp.value || '').trim();
  if (!t) return;
  inp.value = '';
  _aiUserSays(t);
}
function _aiQuick(t) {
  _aiUserSays(String(t || '').trim());
}
function _aiAskCategory(catKey) {
  var cat = _AI_CATS.find(function(c) { return c.key === catKey; });
  _aiPushMsg('user', _escHtml('Zeig mir ' + (cat ? cat.label : catKey)));
  _aiTyping(true);
  setTimeout(function() {
    _aiTyping(false);
    _aiPushMsg('ai', _aiAnswerCategory(catKey));
  }, 380);
}
function _aiUserSays(text) {
  if (!text) return;
  _aiPushMsg('user', _escHtml(text));
  _aiTyping(true);
  setTimeout(function() {
    _aiTyping(false);
    var html;
    try { html = _aiAnswer(text); }
    catch (e) { html = 'Hoppla, da ist etwas schiefgelaufen. Versuch es bitte noch einmal!'; }
    _aiPushMsg('ai', html);
  }, 420 + Math.random() * 380);
}

/* ─── Antwort-Engine (Intent-Erkennung) ─────────────────────── */
function _aiCatFromText(t) {
  if (/\bdjs?\b|musik|band/.test(t)) return 'dj';
  if (/catering|essen|buffet|men[üu]/.test(t)) return 'catering';
  if (/fotograf|foto|kamera|video/.test(t)) return 'foto';
  if (/location|saal|halle|räum|raum|schloss/.test(t)) return 'location';
  if (/licht|technik|ton|bühne/.test(t)) return 'licht';
  if (/blume|florist|strauß/.test(t)) return 'florist';
  if (/moderat|sprecher/.test(t)) return 'moderation';
  if (/deko/.test(t)) return 'deko';
  return null;
}

function _aiAnswer(raw) {
  var t = (raw || '').toLowerCase();

  // 0) Läuft gerade eine geführte Rückfrage? Dann ist die Eingabe die Antwort
  //    darauf — außer der Nutzer bricht ausdrücklich ab.
  if (_aiSlots) {
    if (/(abbrech|stop|vergiss|abbruch|doch nicht)/.test(t)) {
      _aiSlots = null;
      return 'Okay, ich habe das Anlegen abgebrochen. Sag Bescheid, wenn du neu starten willst.';
    }
    return _aiHandleSlotAnswer(raw);
  }

  var cat = _aiCatFromText(t);
  var type = null;
  for (var i = 0; i < _AI_TYPES.length; i++) {
    if (_AI_TYPES[i][0].test(t)) { type = _AI_TYPES[i]; break; }
  }

  // 1) Event-Typ → Projekt anlegen ("Ich plane eine Hochzeit …")
  if (type && (/(plan|organisier|erstell|anleg|neu|vorbereit|steht an|vor der tür)/.test(t) || !cat)) {
    return _aiAnswerCreate(type, raw);
  }
  // 2) Kategorie → Dienstleister-Empfehlungen
  if (cat) return _aiAnswerCategory(cat);
  // 3) Budget — aber Plattform-/Gebührenfragen gehören in die Wissensbasis,
  //    nicht in die Budget-Rechnung des eigenen Projekts.
  if (/(budget|kosten|preis|ausgeben|teuer|euro|€)/.test(t)) {
    if (/(provision|geb[üu]hr|versteckt|auszahl|stripe|storn|r[üu]ckerstatt|was kostet (die nutzung|eventb)|inserier)/.test(t)) {
      var feeHit = _ebKbGoodHit(raw);
      if (feeHit) return _aiKbAnswerHtml(feeHit);
    }
    return _aiAnswerBudget();
  }
  // 4) Offene Schritte / Checkliste
  if (/(fehlt|offen|nächst|weiter|schritt|checklist|to-?do|aufgabe)/.test(t)) return _aiAnswerNextSteps();
  // 5) Countdown / Datum
  if (/(wie ?viele? tage|countdown|wann|datum|termin)/.test(t)) return _aiAnswerCountdown();
  // 6) Status / Übersicht
  if (/(status|übersicht|zusammenfassung|fortschritt|wie läuft)/.test(t)) return _aiAnswerStatus();
  // 7) Gruß / Hilfe
  // „funktioniert …?" ist eine Inhaltsfrage, keine Hilfe-Anfrage → nicht abfangen.
  if (/^(hi|hallo|hey|servus|moin|na\b|guten)/.test(t) ||
      /(^|\s)(hilfe|was kannst du|welche funktionen|funktionsumfang)(\s|$|\?)/.test(t)) return _aiAnswerHelp();
  // 8) Danke
  if (/(danke|super|top|perfekt|nice|cool)/.test(t)) {
    return 'Sehr gerne! 🎉 Sag Bescheid, wenn ich noch etwas für dein Event tun kann.';
  }
  // 9) Themenübersicht: „Was kannst du erklären / worüber weißt du Bescheid?"
  if (/(was kannst du (alles )?(erklär|erklaer|beantworten)|welche themen|worüber|worueber|themen|übersicht der themen)/.test(t)) {
    return _aiAnswerTopics();
  }
  // 10) Wissensbasis aus dem Vault (nur freigegebenes Wissen) — beantwortet
  //     alles rund um Konto, Buchung, Zahlung, Provision, Sicherheit, Praxis …
  var kbHit = _ebKbGoodHit(raw);
  if (kbHit) return _aiKbAnswerHtml(kbHit);
  _ebKbNoteMiss(raw);
  return _aiAnswerFallback(raw);
}

/** Wissens-Treffer als Chat-Antwort im Board-Look aufbereiten. */
function _aiKbAnswerHtml(hit) {
  var txt = hit.text || '';
  if (txt.length > 620) txt = txt.slice(0, 610).replace(/\s+\S*$/, '') + ' …';
  var paras = txt.split('\n\n').filter(Boolean).slice(0, 3);
  var body = paras.map(function(p) {
    var lines = p.split('\n').filter(Boolean);
    var bullets = lines.filter(function(l) { return /^•\s/.test(l.trim()); });
    if (bullets.length >= 2) {
      return '<ul class="bai-list">' + bullets.map(function(l) {
        return '<li>' + _escHtml(l.replace(/^•\s*/, '').trim()) + '</li>';
      }).join('') + '</ul>';
    }
    return '<p>' + _escHtml(p.replace(/\n/g, ' ').trim()) + '</p>';
  }).join('');
  var head = hit.heading ? '<b>' + _escHtml(hit.heading) + '</b><br>' : '';
  return head + body;
}

function _aiQuickBtn(label) {
  var safe = String(label).replace(/'/g, '\\u0027');
  return '<button type="button" class="bai-act" onclick="_aiQuick(\'' + _escHtml(safe) + '\')">' +
    '<span class="material-icons-round">help_outline</span> ' + _escHtml(label) + '</button>';
}

function _aiAnswerHelp() {
  var topics = _ebKbTopics();
  var topicList = topics.length
    ? '<br><b>Außerdem erkläre ich dir alles rund um die Plattform:</b><ul class="bai-list">' +
      topics.map(function(t) { return '<li>' + _escHtml(t.title) + '</li>'; }).join('') +
      '</ul>Frag einfach — z.&nbsp;B. „Wie hoch ist die Provision?" oder „Wie sicher sind meine Zahlungsdaten?".'
    : '';
  return 'Hey! 👋 Ich bin dein <b>lokaler</b> Planungs-Assistent — keine externe KI, keine Kosten. Das kann ich:' +
    '<ul class="bai-list">' +
    '<li>🗂️ <b>Projekt anlegen</b> — „Ich plane eine Hochzeit 2030" (ich frage die Eckdaten ab)</li>' +
    '<li>🎧 <b>Dienstleister finden</b> — „Zeig mir DJs" oder links eine Kategorie wählen</li>' +
    '<li>💶 <b>Budget checken</b> — „Budget-Übersicht"</li>' +
    '<li>📋 <b>Nächste Schritte</b> — „Was fehlt noch?"</li>' +
    '<li>⏳ <b>Countdown</b> — „Wie viele Tage noch?"</li>' +
    '</ul>' + topicList +
    '<div class="bai-actions">' + _aiQuickBtn('Wie hoch ist die Provision?') + _aiQuickBtn('Wie läuft eine Buchung ab?') + '</div>';
}

/** „Was kannst du erklären?" — alle freigegebenen Themen auflisten. */
function _aiAnswerTopics() {
  var topics = _ebKbTopics();
  if (!topics.length) {
    return 'Meine Wissensbasis lädt gerade noch — frag mich gleich noch einmal. ' +
      'In der Zwischenzeit: „Was fehlt noch?" oder „Budget-Übersicht" beantworte ich sofort.';
  }
  var html = 'Ich kann dir zu diesen Themen alles erklären, was öffentlich ist: 📚<ul class="bai-list">';
  topics.forEach(function(t) {
    var qs = t.questions.slice(0, 3).map(function(q) { return _escHtml(q); }).join(' · ');
    html += '<li><b>' + _escHtml(t.title) + '</b>' + (qs ? '<br><small>' + qs + '</small>' : '') + '</li>';
  });
  html += '</ul>Stell einfach deine Frage — oder tippe eine der Fragen oben ab.' +
    '<div class="bai-actions">' + _aiQuickBtn('Wie hoch ist die Provision?') +
    _aiQuickBtn('Was kostet ein DJ?') + '</div>';
  return html;
}

function _aiAnswerFallback(raw) {
  var sugg = raw ? _ebKbSuggestions(raw, 3) : [];
  if (sugg.length) {
    return 'Das habe ich nicht sicher verstanden. 🤔 Meintest du vielleicht eine dieser Fragen?' +
      '<div class="bai-actions">' + sugg.map(_aiQuickBtn).join('') + '</div>' +
      '<br><small>Oder tippe „Was kannst du erklären?" für alle Themen.</small>';
  }
  return 'Das habe ich nicht ganz verstanden. 🤔 Probier zum Beispiel:' +
    '<ul class="bai-list">' +
    '<li>„Ich plane eine <b>Hochzeit 2030</b>" — ich frage dann die Eckdaten ab</li>' +
    '<li>„Zeig mir <b>DJs</b>" — oder wähle links eine Kategorie</li>' +
    '<li>„<b>Was fehlt noch?</b>" oder „<b>Budget-Übersicht</b>"</li>' +
    '<li>„<b>Wie hoch ist die Provision?</b>" — ich erkläre dir die Plattform</li>' +
    '</ul>' +
    '<div class="bai-actions">' + _aiQuickBtn('Was kannst du erklären?') + '</div>';
}

/* ─── Geführte Rückfragen („Slot-Filling") ────────────────────────
   Statt sofort ein halbleeres Projekt anzulegen, fragt der Assistent die
   fehlenden Eckdaten nacheinander ab: Datum → Gäste → Budget → Ort.
   Jede Frage ist überspringbar („weiß ich noch nicht").            */
var _aiSlots = null;

var _AI_SLOT_DEFS = [
  { key: 'date',     icon: 'calendar_today', q: 'Wann soll es stattfinden? Nenn mir gern ein Datum wie <b>20.09.2030</b> — ein Jahr oder Monat reicht auch.', skip: 'Datum steht noch nicht fest' },
  { key: 'guests',   icon: 'group',          q: 'Mit wie vielen <b>Gästen</b> rechnest du ungefähr?', skip: 'Gästezahl offen' },
  { key: 'budget',   icon: 'savings',        q: 'Welches <b>Gesamtbudget</b> hast du im Kopf? Ich rechne dann mit, wie viel noch frei ist.', skip: 'Budget offen' },
  { key: 'location', icon: 'place',          q: 'In welcher <b>Stadt oder Region</b> soll es stattfinden? Dann schlage ich passende Dienstleister in der Nähe vor.', skip: 'Ort offen' }
];

function _aiSlotSkipped(t) {
  return /(weiß|weiss) (ich )?(noch )?nicht|keine ahnung|unklar|offen|später|spaeter|überspring|ueberspring|skip|egal|noch nicht|^-$|^\?$/i.test(t.trim());
}

function _aiParseSlot(key, raw) {
  var t = String(raw || '').toLowerCase().trim();
  if (key === 'guests') {
    var g = t.match(/(\d{1,4})/);
    return g ? parseInt(g[1], 10) : null;
  }
  if (key === 'budget') {
    var b = t.match(/(\d[\d.\s]{0,9})\s*(?:€|euro|eur)?/);
    if (!b) return null;
    var n = parseFloat(b[1].replace(/[.\s]/g, ''));
    if (!isNaN(n) && /(k|tsd|tausend)\b/.test(t)) n *= 1000;
    return isNaN(n) || n <= 0 ? null : n;
  }
  if (key === 'date') {
    var full = raw.match(/\d{1,2}\.\d{1,2}\.\d{2,4}/);
    if (full) return full[0];
    var dm = raw.match(/\d{1,2}\.\d{1,2}\./);
    if (dm) return dm[0];
    var MON = ['januar','februar','märz','maerz','april','mai','juni','juli','august','september','oktober','november','dezember'];
    for (var i = 0; i < MON.length; i++) {
      if (t.indexOf(MON[i]) !== -1) {
        var dnum = t.match(new RegExp('(\\d{1,2})\\s*\\.?\\s*' + MON[i])) || t.match(/(\d{1,2})\s*\./);
        var yr = t.match(/(20\d{2})/);
        return (dnum ? dnum[1] + '. ' : '') + MON[i].charAt(0).toUpperCase() + MON[i].slice(1) + (yr ? ' ' + yr[1] : '');
      }
    }
    var y = t.match(/\b(20\d{2})\b/);
    return y ? y[1] : null;
  }
  if (key === 'location') {
    var city = (typeof _ebDetectCityInText === 'function') ? _ebDetectCityInText(raw) : '';
    if (city) return city;
    var clean = String(raw).trim().replace(/^(in|im|bei|nahe|rund um)\s+/i, '');
    return clean.length >= 2 && clean.length <= 40 ? clean : null;
  }
  return null;
}

function _aiSlotAsk() {
  var s = _aiSlots;
  if (!s) return '';
  while (s.queue.length) {
    var key = s.queue[0];
    var def = _AI_SLOT_DEFS.filter(function(d) { return d.key === key; })[0];
    if (!def) { s.queue.shift(); continue; }
    s.asked = key;
    var step = (s.total - s.queue.length + 1) + '/' + s.total;
    return '<span class="material-icons-round" style="font-size:15px;vertical-align:-3px">' + def.icon + '</span> ' +
      '<b>Frage ' + step + ':</b> ' + def.q +
      '<div class="bai-actions"><button type="button" class="bai-act" onclick="_aiQuick(\'weiß ich noch nicht\')">' +
      '<span class="material-icons-round">redo</span> Weiß ich noch nicht</button></div>';
  }
  return _aiSlotSummary();
}

function _aiSlotSummary() {
  var d = window._aiDraft || {};
  _aiSlots = null;
  var rows = [
    { l: 'Event', v: d.name || 'Mein Event' },
    { l: 'Datum', v: d.date || '— offen' },
    { l: 'Gäste', v: d.guests ? d.guests + ' Personen' : '— offen' },
    { l: 'Budget', v: d.budget ? d.budget.toLocaleString('de-DE') + ' €' : '— offen' },
    { l: 'Ort', v: d.location || '— offen' }
  ].map(function(r) { return '<li><b>' + r.l + ':</b> ' + _escHtml(String(r.v)) + '</li>'; }).join('');
  var sugg = (_CHECKLIST_TEMPLATES[d.template] || []).slice(0, 5).map(function(s) {
    return '<li>' + _escHtml(s) + '</li>';
  }).join('');
  return 'Perfekt, das reicht mir für den Start! 🎯<ul class="bai-list">' + rows + '</ul>' +
    'Ich lege dir ein Board mit geführter Checkliste an, u.&nbsp;a.:' +
    '<ul class="bai-list">' + sugg + '</ul>' +
    '<div class="bai-actions"><button type="button" class="bai-act primary" onclick="_aiCreateFromDraft()">' +
    '<span class="material-icons-round">add</span> Projekt anlegen</button></div>';
}

/* Antwort dem Slot zuordnen, zu dem sie inhaltlich passt — auch wenn der
   Nutzer sie in anderer Reihenfolge liefert („20.06.2030" auf die Gästefrage). */
function _aiRouteSlot(raw, queue, asked) {
  var t = String(raw || '').toLowerCase();
  var has = function(k) { return queue.indexOf(k) !== -1; };
  if (has('date') && /\d{1,2}\.\d{1,2}\.?(\d{2,4})?/.test(raw)) return 'date';
  if (has('guests') && /(gäste|gaeste|personen|leute|pax)/.test(t)) return 'guests';
  if (has('budget') && /(€|euro|eur|budget|\d\s*k\b|tausend)/.test(t)) return 'budget';
  if (has('location') && typeof _ebDetectCityInText === 'function' && _ebDetectCityInText(raw)) return 'location';
  return asked;
}

function _aiHandleSlotAnswer(raw) {
  var s = _aiSlots;
  var key = _aiRouteSlot(raw, s.queue, s.asked);
  if (!key) return _aiSlotAsk();
  var d = window._aiDraft = window._aiDraft || {};
  if (_aiSlotSkipped(raw)) {
    s.queue.shift();
    return 'Alles gut, das klären wir später. ' + _aiSlotAsk();
  }
  var val = _aiParseSlot(key, raw);
  if (val === null) {
    var def2 = _AI_SLOT_DEFS.filter(function(x) { return x.key === key; })[0];
    return 'Das konnte ich nicht sicher lesen. ' + (def2 ? def2.q : '') +
      '<div class="bai-actions"><button type="button" class="bai-act" onclick="_aiQuick(\'weiß ich noch nicht\')">' +
      '<span class="material-icons-round">redo</span> Weiß ich noch nicht</button></div>';
  }
  d[key] = val;
  // Jahr im Projektnamen mitziehen, wenn das Datum eines nennt
  var yr = String(val).match(/\b(20\d{2})\b/);
  if (key === 'date' && yr && d.name) d.name = d.name.replace(/\b20\d{2}\b/, yr[1]);
  // Genau diesen Slot entfernen (nicht zwingend den zuerst gefragten)
  var pos = s.queue.indexOf(key);
  if (pos !== -1) s.queue.splice(pos, 1); else s.queue.shift();
  var ack = key === 'budget' ? ('Notiert: <b>' + Number(val).toLocaleString('de-DE') + ' €</b>. ')
    : key === 'guests' ? ('Notiert: <b>' + val + ' Gäste</b>. ')
    : ('Notiert: <b>' + _escHtml(String(val)) + '</b>. ');
  return ack + _aiSlotAsk();
}

function _aiAnswerCreate(type, raw) {
  var t = raw.toLowerCase();
  var dateM = raw.match(/(\d{1,2}\.\d{1,2}\.(?:\d{4}|\d{2})?)/);
  var yearM = raw.match(/\b(20\d{2})\b/);
  var guestsM = t.match(/(\d{1,4})\s*(gäste|personen|leute|pax)/);
  var budgetM = t.match(/(\d[\d.]{0,8})\s*(€|euro)/);
  // Eine blanke Jahreszahl ist KEIN Termin — sie benennt nur das Projekt.
  // Nach dem konkreten Datum wird trotzdem gefragt.
  var date = dateM ? dateM[1] : '';
  var guests = guestsM ? parseInt(guestsM[1], 10) : 0;
  var budget = budgetM ? parseFloat(budgetM[1].replace(/\./g, '')) : 0;
  var loc = (typeof _ebDetectCityInText === 'function') ? (_ebDetectCityInText(raw) || '') : '';
  var year = yearM ? yearM[1] : String(new Date().getFullYear());
  window._aiDraft = {
    template: type[1],
    name: type[3] + ' ' + year,
    date: date, guests: guests, budget: budget, location: loc
  };
  if (!currentUser) {
    return type[2] + ' Eine ' + type[3] + ' — wie schön! Melde dich kurz an, dann lege ich dir ein Planungs-Board mit geführter Checkliste an.' +
      '<div class="bai-actions"><button type="button" class="bai-act primary" onclick="openModal(\'loginModal\')">' +
      '<span class="material-icons-round">login</span> Anmelden</button></div>';
  }
  // Fehlende Eckdaten der Reihe nach erfragen, statt halbleer anzulegen.
  var missing = [];
  if (!date) missing.push('date');
  if (!guests) missing.push('guests');
  if (!budget) missing.push('budget');
  if (!loc) missing.push('location');
  var known = (date ? 'Am <b>' + _escHtml(date) + '</b>. ' : '') +
    (guests ? '<b>' + guests + ' Gäste</b>. ' : '') +
    (budget ? 'Budget ca. <b>' + budget.toLocaleString('de-DE') + ' €</b>. ' : '') +
    (loc ? 'In <b>' + _escHtml(loc) + '</b>. ' : '');
  if (missing.length) {
    _aiSlots = { queue: missing, total: missing.length, asked: null };
    return type[2] + ' <b>' + type[3] + '</b> — schön! ' + known +
      'Damit dein Board wirklich hilft, brauche ich noch ' + missing.length +
      (missing.length === 1 ? ' Angabe' : ' Angaben') + '.<br><br>' + _aiSlotAsk();
  }
  return type[2] + ' <b>' + type[3] + '</b> — super! ' + known + _aiSlotSummary();
}

function _aiCreateFromDraft() {
  var d = window._aiDraft;
  if (!d) return;
  if (!currentUser) { openModal('loginModal'); return; }
  var project = {
    id: 'bp_' + Date.now(),
    name: d.name || 'Mein Event',
    date: d.date || '',
    budget: d.budget || 0,
    guests: d.guests || 0,
    location: d.location || '',
    template: d.template || 'custom',
    cards: [], checklist: [],
    createdAt: new Date().toISOString(),
    updatedAt: Date.now()
  };
  _boardProjects.unshift(project);
  _saveBoardProjects({ immediate: true });
  _aiCtxProjectId = project.id;
  _aiRenderSidebarProjects();
  showToast('Event-Projekt „' + project.name + '“ wurde erstellt!', 'check_circle');
  _aiPushMsg('ai', '✅ Projekt <b>' + _escHtml(project.name) + '</b> ist angelegt! Die geführte Checkliste wartet im Board. ' +
    'Was brauchst du als Erstes — z.&nbsp;B. <b>Location</b> oder <b>DJ</b>?' +
    '<div class="bai-actions"><button type="button" class="bai-act" onclick="openBoardProject(\'' + project.id + '\')">' +
    '<span class="material-icons-round">view_kanban</span> Board öffnen</button></div>');
}

function _aiIsSearch(l) {
  var t = (l.listingType || l.kind || l.type || '').toString().toLowerCase();
  if (t === 'search' || t === 'gesuch' || t.indexOf('suche') === 0) return true;
  return /\bgesucht\b/i.test(l.title || '') || /^\s*suche\s/i.test(l.title || '');
}

function _aiAnswerCategory(catKey) {
  var cat = _AI_CATS.find(function(c) { return c.key === catKey; }) || { key: catKey, emoji: '✨', label: catKey };
  var base = (typeof _visibleListings === 'function') ? _visibleListings() : (LISTINGS || []);
  var list = base.filter(function(l) {
    if (!l || _aiIsSearch(l)) return false;
    return l.category === catKey ||
      _guideCategoryFor(l.categoryLabel || '') === catKey ||
      _guideCategoryFor(l.title || '') === catKey;
  }).sort(function(a, b) {
    return (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0);
  }).slice(0, 3);

  if (!list.length) {
    return 'In der Kategorie <b>' + cat.label + '</b> habe ich gerade keine Inserate gefunden. Schau mal in der Suche vorbei!' +
      '<div class="bai-actions"><button type="button" class="bai-act" onclick="navigateTo(\'browse\')">' +
      '<span class="material-icons-round">search</span> Zur Suche</button></div>';
  }
  var cards = list.map(function(l) {
    var img = l.image || l.providerImg || '';
    var price = l.priceLabel || (l.price ? 'ab ' + l.price + ' €' : '');
    return '<div class="bai-lcard">' +
      (img
        ? '<span class="bai-lcard-img" style="background-image:url(\'' + _escHtml(img) + '\')"></span>'
        : '<span class="bai-lcard-img bai-lcard-noimg">' + cat.emoji + '</span>') +
      '<span class="bai-lcard-body"><b>' + _escHtml(l.providerName || l.title || '') + '</b>' +
        '<em>★ ' + (l.rating || '–') + (price ? ' · ' + _escHtml(price) : '') + '</em></span>' +
      '<span class="bai-lcard-acts">' +
        '<button type="button" class="bai-act" onclick="navigateTo(\'detail\',' + l.id + ')">Ansehen</button>' +
        '<button type="button" class="bai-act primary" onclick="_aiAddListing(' + l.id + ')">+ Board</button>' +
      '</span></div>';
  }).join('');
  return cat.emoji + ' Hier sind Top-Empfehlungen für <b>' + cat.label + '</b>:' +
    '<div class="bai-lcards">' + cards + '</div>';
}

function _aiAddListing(listingId) {
  if (!currentUser) { openModal('loginModal'); return; }
  var l = (LISTINGS || []).find(function(x) { return x && x.id === listingId; });
  if (!l) { showToast('Inserat nicht gefunden', 'warning'); return; }
  var project = _aiCtxProject();
  if (!project) {
    window._aiDraft = { template: 'custom', name: 'Mein Event', date: '', guests: 0, budget: 0 };
    _aiPushMsg('ai', 'Du hast noch kein Projekt. Soll ich eins anlegen und <b>' + _escHtml(l.providerName || l.title || '') + '</b> direkt einplanen?' +
      '<div class="bai-actions"><button type="button" class="bai-act primary" onclick="_aiCreateFromDraft();_aiAddListing(' + listingId + ')">Ja, anlegen &amp; einplanen</button></div>');
    return;
  }
  if ((project.cards || []).some(function(c) { return c.listingId && String(c.listingId) === String(listingId); })) {
    _aiPushMsg('ai', '<b>' + _escHtml(l.providerName || l.title || '') + '</b> ist schon in „' + _escHtml(project.name) + '“ eingeplant. 👍');
    return;
  }
  var card = {
    id: 'card_' + Date.now(),
    name: l.providerName || l.title || 'Dienstleister',
    category: l.categoryLabel || l.category || '',
    price: parseFloat(l.price) || 0,
    note: '', startTime: '', endTime: '',
    stage: 'geplant',
    listingId: l.id,
    providerId: l.providerId || null,
    avatar: l.providerImg || '',
    listingImage: l.image || '',
    listingTitle: l.title || '',
    createdAt: new Date().toISOString()
  };
  if (!project.cards) project.cards = [];
  project.cards.push(card);
  _saveBoardProjects({ immediate: true });
  _aiPushMsg('ai', '✅ <b>' + _escHtml(card.name) + '</b> ist jetzt in „' + _escHtml(project.name) + '“ unter <b>Geplant</b>.' +
    '<div class="bai-actions"><button type="button" class="bai-act" onclick="openBoardProject(\'' + project.id + '\')">' +
    '<span class="material-icons-round">view_kanban</span> Board öffnen</button></div>');
}

function _aiAnswerBudget() {
  var p = currentUser ? _aiCtxProject() : null;
  if (!p) {
    return 'Dafür brauche ich ein Projekt. Sag mir z.&nbsp;B. „Ich plane eine Hochzeit mit 5000 € Budget" — dann rechne ich für dich mit!';
  }
  var sum = (p.cards || []).reduce(function(s, c) { return s + (parseFloat(c.price) || 0); }, 0);
  var booked = (p.cards || []).filter(function(c) { return c.stage === 'bestaetigt' || c.stage === 'abgeschlossen'; })
    .reduce(function(s, c) { return s + (parseFloat(c.price) || 0); }, 0);
  var budgetLine;
  if (p.budget) {
    var diff = p.budget - sum;
    budgetLine = '<li>Budget: <b>' + (+p.budget).toLocaleString('de-DE') + ' €</b> → ' +
      (diff >= 0
        ? 'noch <b>' + diff.toLocaleString('de-DE') + ' € frei</b> ✅'
        : '<b>' + Math.abs(diff).toLocaleString('de-DE') + ' € drüber</b> ⚠️') + '</li>';
  } else {
    budgetLine = '<li>Kein Budget hinterlegt — ergänze es über „Projekt bearbeiten".</li>';
  }
  return '💶 <b>Budget für „' + _escHtml(p.name) + '“</b>' +
    '<ul class="bai-list">' +
    '<li>Eingeplant gesamt: <b>' + sum.toLocaleString('de-DE') + ' €</b></li>' +
    '<li>Davon fest gebucht: <b>' + booked.toLocaleString('de-DE') + ' €</b></li>' +
    budgetLine + '</ul>';
}

function _aiAnswerNextSteps() {
  var p = currentUser ? _aiCtxProject() : null;
  if (!p) {
    return 'Noch kein Projekt vorhanden — sag mir, was du planst (z.&nbsp;B. „Ich plane einen Geburtstag"), dann erstelle ich dir eine geführte Checkliste!';
  }
  var steps = _guideSteps(p);
  var open = steps.filter(function(s) { return !s.done; });
  if (!open.length) {
    return '🎉 Alles erledigt in „' + _escHtml(p.name) + '“ — dein Event kann kommen!';
  }
  var lis = open.slice(0, 5).map(function(s) {
    var dl = '';
    if (s.deadline) {
      var dd = ('0' + s.deadline.getDate()).slice(-2) + '.' + ('0' + (s.deadline.getMonth() + 1)).slice(-2) + '.';
      dl = ' <em class="bai-dl' + (s.overdue ? ' od' : '') + '">bis ' + dd + '</em>';
    }
    return '<li>' + _escHtml(s.text) + dl + '</li>';
  }).join('');
  return '📋 In „' + _escHtml(p.name) + '“ sind noch <b>' + open.length + ' Schritte</b> offen:' +
    '<ul class="bai-list">' + lis + '</ul>' +
    '<div class="bai-actions"><button type="button" class="bai-act" onclick="openBoardProject(\'' + p.id + '\')">' +
    '<span class="material-icons-round">checklist</span> Zum Planungs-Guide</button></div>';
}

function _aiAnswerCountdown() {
  var p = currentUser ? _aiCtxProject() : null;
  if (!p) return 'Leg zuerst ein Projekt an — dann zähle ich die Tage bis zu deinem Event runter! ⏳';
  if (!p.date) {
    return 'Für „' + _escHtml(p.name) + '“ ist noch kein Datum hinterlegt. Ergänze es über „Projekt bearbeiten", dann starte ich den Countdown!';
  }
  var ms = _parseDateDe(p.date);
  if (!ms) return 'Das Datum „' + _escHtml(p.date) + '“ kann ich nicht lesen (Format TT.MM.JJJJ).';
  var days = Math.ceil((ms - Date.now()) / 86400000);
  if (days < 0) return '„' + _escHtml(p.name) + '“ war vor <b>' + Math.abs(days) + ' Tagen</b>. Ich hoffe, es war großartig! 🎉';
  if (days === 0) return '🎉 <b>Heute ist es so weit!</b> Viel Spaß bei „' + _escHtml(p.name) + '“!';
  return '⏳ Noch <b>' + days + ' Tage</b> bis „' + _escHtml(p.name) + '“ am <b>' + _escHtml(p.date) + '</b>.' +
    (days <= 30 ? ' Es wird ernst — check am besten die offenen Schritte! 💪' : '');
}

function _aiAnswerStatus() {
  var p = currentUser ? _aiCtxProject() : null;
  if (!p) return 'Noch kein Projekt vorhanden — erzähl mir von deinem Event, dann starten wir!';
  var cards = p.cards || [];
  var byStage = { geplant: 0, kontaktiert: 0, angebot: 0, bestaetigt: 0, abgeschlossen: 0 };
  cards.forEach(function(c) { if (byStage[c.stage] != null) byStage[c.stage]++; });
  var steps = _guideSteps(p);
  var done = steps.filter(function(s) { return s.done; }).length;
  return '📊 <b>Status „' + _escHtml(p.name) + '“</b>' +
    '<ul class="bai-list">' +
    '<li>Checkliste: <b>' + done + ' / ' + steps.length + '</b> Schritten erledigt</li>' +
    '<li>Dienstleister: <b>' + cards.length + '</b> im Board (' + byStage.bestaetigt + ' bestätigt, ' + byStage.abgeschlossen + ' abgeschlossen)</li>' +
    (p.date ? '<li>Datum: <b>' + _escHtml(p.date) + '</b></li>' : '') +
    '</ul>' +
    '<div class="bai-actions"><button type="button" class="bai-act" onclick="openBoardProject(\'' + p.id + '\')">' +
    '<span class="material-icons-round">view_kanban</span> Board öffnen</button></div>';
}

