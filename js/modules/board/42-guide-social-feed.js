// ========== PLANUNGS-GUIDE (geführte Steps) ==========
// Macht aus den Checklisten-Templates einen geführten Assistenten:
// geprüfte Steps in sinnvoller Reihenfolge, pro Step direkt passende
// Dienstleister finden ("unterwegs die Hochzeit planen"). Rein additiv —
// die bestehende freie Checkliste bleibt unverändert darunter.

// Step-Text → Browse-Kategorie (Keys wie in AI_CATEGORIES / browseCategory).
var _GUIDE_CAT_RULES = [
  [/location|venue|gel[äa]nde|meetingraum|schloss|saal/i, 'location'],
  [/fotograf|videograf|foto/i, 'foto'],
  [/\bdj\b|band|musik|line-up|playlist/i, 'dj'],
  [/catering|kuchen|torte|men[üu]|getr[äa]nke/i, 'catering'],
  [/florist|blumen|brautstrau/i, 'florist'],
  [/deko/i, 'deko'],
  [/technik|licht|\bav\b|strom|b[üu]hne|livestream/i, 'licht'],
  [/moderation|sprecher/i, 'moderation'],
  [/koordinator|planer|komplettplanung/i, 'planung'],
  [/feuerwerk|pyro/i, 'pyro'],
];
function _guideCategoryFor(text) {
  for (var i = 0; i < _GUIDE_CAT_RULES.length; i++) {
    if (_GUIDE_CAT_RULES[i][0].test(text || '')) return _GUIDE_CAT_RULES[i][1];
  }
  return null;
}

// Hat das Projekt schon einen Dienstleister dieser Kategorie im Board?
// Liefert die höchste Karten-Phase (für "Kontaktiert/Gebucht"-Chip im Step).
function _guideCardStageForCategory(project, cat) {
  if (!project || !cat || !Array.isArray(project.cards)) return null;
  var best = -1;
  project.cards.forEach(function(c) {
    if (!c) return;
    var cardCat = null;
    if (c.listingId != null) {
      var l = (LISTINGS || []).find(function(x) { return x && String(x.id) === String(c.listingId); });
      if (l) cardCat = l.category || _guideCategoryFor(l.categoryLabel || '');
    }
    if (!cardCat) cardCat = _guideCategoryFor(c.category || c.name || '');
    if (cardCat !== cat) return;
    var idx = EB_BOARD_STAGE_ORDER.indexOf(c.stage);
    if (idx > best) best = idx;
  });
  return best >= 0 ? EB_BOARD_STAGE_ORDER[best] : null;
}

// Empfohlene Vorlaufzeiten (Wochen vor dem Event) — Text-Regeln zuerst
// (spezifischer), dann Kategorie-Fallback. Steps ohne Regel bekommen
// keinen Termin-Chip.
var _GUIDE_LEAD_TEXT_RULES = [
  [/standesamt/i, 26], [/kleid|anzug/i, 24], [/ringe/i, 20], [/honeymoon/i, 20],
  [/einladung/i, 16], [/hotel/i, 12], [/torte|kuchen/i, 8], [/playlist/i, 6],
  [/sitzordnung/i, 4], [/koordinator/i, 4], [/zeitplan|ablauf/i, 2],
  [/tickets|anmeldung/i, 20], [/marketing/i, 24], [/sicherheitsdienst/i, 16],
  [/agenda|programm/i, 6], [/budget/i, 30],
];
var _GUIDE_LEAD_CAT_WEEKS = {
  location: 52, planung: 48, foto: 36, dj: 32, catering: 24, moderation: 20,
  licht: 16, florist: 12, pyro: 12, deko: 8,
};
function _guideLeadWeeksFor(text, cat) {
  for (var i = 0; i < _GUIDE_LEAD_TEXT_RULES.length; i++) {
    if (_GUIDE_LEAD_TEXT_RULES[i][0].test(text || '')) return _GUIDE_LEAD_TEXT_RULES[i][1];
  }
  if (cat && _GUIDE_LEAD_CAT_WEEKS[cat]) return _GUIDE_LEAD_CAT_WEEKS[cat];
  return null;
}

// Event-Datum des Projekts als Date (oder null).
function _guideEventDate(project) {
  if (!project || !project.date) return null;
  var iso = (typeof _toIsoDate === 'function') ? _toIsoDate(project.date) : '';
  if (!iso) return null;
  var d = new Date(iso + 'T12:00:00');
  return isNaN(d.getTime()) ? null : d;
}

// Geführte Steps mit Status aus Checkliste + Board-Karten ableiten.
function _guideSteps(project) {
  if (!project) return [];
  var tmpl = _CHECKLIST_TEMPLATES[project.template] || _CHECKLIST_TEMPLATES.custom;
  var doneMap = {};
  (project.checklist || []).forEach(function(it) {
    if (it && it.text) doneMap[it.text.toLowerCase()] = !!it.done;
  });
  var eventDate = _guideEventDate(project);
  var now = new Date();
  return tmpl.map(function(text, i) {
    var cat = _guideCategoryFor(text);
    var cardStage = cat ? _guideCardStageForCategory(project, cat) : null;
    // Ein Step gilt als erledigt, wenn abgehakt ODER der Dienstleister
    // dafür bereits fest gebucht/abgeschlossen ist.
    var done = doneMap[text.toLowerCase()] === true ||
      cardStage === 'angebot' || cardStage === 'bestaetigt' || cardStage === 'abgeschlossen';
    // Empfohlene Deadline: Eventdatum minus Vorlaufzeit (nur mit Datum).
    var deadline = null, overdue = false;
    if (eventDate) {
      var weeks = _guideLeadWeeksFor(text, cat);
      if (weeks != null) {
        deadline = new Date(eventDate.getTime() - weeks * 7 * 24 * 3600 * 1000);
        overdue = !done && deadline < now;
      }
    }
    return { idx: i, text: text, cat: cat, cardStage: cardStage, done: done, deadline: deadline, overdue: overdue };
  });
}

function _renderBoardGuide(project) {
  var steps = _guideSteps(project);
  if (!steps.length) return '';
  var doneCount = steps.filter(function(s) { return s.done; }).length;
  var pct = Math.round((doneCount / steps.length) * 100);
  var currentIdx = -1;
  for (var i = 0; i < steps.length; i++) { if (!steps[i].done) { currentIdx = i; break; } }

  var tmplLabels = { wedding: '💍 Hochzeit', birthday: '🎂 Geburtstag', corporate: '🏢 Firmenfeier', festival: '🎪 Festival', conference: '🎤 Konferenz', baptism: '⛪ Taufe/Feier', kids: '🎈 Kinderfest', private: '🏡 Privatfeier', custom: '✨ Event' };
  var tmplLabel = tmplLabels[project.template] || tmplLabels.custom;

  var stepsHtml = steps.map(function(s) {
    var state = s.done ? 'done' : (s.idx === currentIdx ? 'current' : 'open');
    var icon = s.done ? 'check_circle' : (state === 'current' ? 'radio_button_checked' : 'radio_button_unchecked');
    var stageChip = '';
    if (!s.done && s.cardStage) {
      var info = EB_BOARD_STAGE_INFO[s.cardStage];
      stageChip = '<span class="bguide-stage bsb-' + info.cls + '"><span class="material-icons-round">' + info.icon + '</span>' + info.label + '</span>';
    }
    // Termin-Empfehlung: "bis TT.MM." aus Eventdatum + Vorlaufzeit;
    // überfällige offene Steps werden rot markiert.
    var deadlineChip = '';
    if (!s.done && s.deadline) {
      var dd = ('0' + s.deadline.getDate()).slice(-2) + '.' + ('0' + (s.deadline.getMonth() + 1)).slice(-2) + '.';
      if (s.deadline.getFullYear() !== (new Date()).getFullYear()) dd += s.deadline.getFullYear();
      deadlineChip = '<span class="bguide-deadline' + (s.overdue ? ' overdue' : '') + '" title="Empfohlen bis ' + dd + ' (Vorlaufzeit)">' +
        '<span class="material-icons-round">' + (s.overdue ? 'notification_important' : 'schedule') + '</span> bis ' + dd + '</span>';
    }
    var findBtn = (!s.done && s.cat)
      ? '<button type="button" class="bguide-find" onclick="_guideFindProviders(\'' + s.cat + '\')"><span class="material-icons-round">search</span> Finden</button>'
      : '';
    var safeText = _escHtml(s.text).replace(/'/g, "\\'");
    return '<li class="bguide-step ' + state + (s.overdue ? ' overdue' : '') + '">' +
      '<button type="button" class="bguide-check" onclick="_guideToggleStep(\'' + safeText + '\')" aria-label="' + (s.done ? 'Als offen markieren' : 'Als erledigt markieren') + '">' +
        '<span class="bguide-num">' + (s.idx + 1) + '</span>' +
        '<span class="material-icons-round bguide-state-icon">' + icon + '</span>' +
      '</button>' +
      '<span class="bguide-text">' + _escHtml(s.text) + '</span>' +
      deadlineChip + stageChip + findBtn +
    '</li>';
  }).join('');

  // Budget-Tracking: verplant (Summe Karten-Preise) vs. Projekt-Budget.
  var budgetHtml = '';
  var planned = (project.cards || []).reduce(function(sum, c) {
    return sum + (c && !isNaN(parseFloat(c.price)) ? parseFloat(c.price) : 0);
  }, 0);
  if (project.budget > 0 || planned > 0) {
    var fmt = function(n) { return Math.round(n).toLocaleString('de-DE') + ' €'; };
    var over = project.budget > 0 && planned > project.budget;
    var bpct = project.budget > 0 ? Math.min(100, Math.round((planned / project.budget) * 100)) : 0;
    budgetHtml = '<div class="bguide-budget' + (over ? ' over' : '') + '">' +
      '<div class="bguide-budget-row">' +
        '<span class="material-icons-round">account_balance_wallet</span>' +
        '<span>' + fmt(planned) + (project.budget > 0 ? ' von ' + fmt(project.budget) + ' verplant' : ' verplant') + '</span>' +
        (over ? '<span class="bguide-budget-warn"><span class="material-icons-round">warning</span> ' + fmt(planned - project.budget) + ' über Budget</span>' : '') +
      '</div>' +
      (project.budget > 0 ? '<div class="bguide-budget-bar-wrap"><div class="bguide-budget-bar" style="width:' + bpct + '%"></div></div>' : '') +
    '</div>';
  }

  return '<div class="bguide-wrap">' +
    '<div class="bguide-header">' +
      '<div class="bguide-title"><span class="material-icons-round">route</span> Planungs-Guide <span class="bguide-tmpl">' + tmplLabel + '</span></div>' +
      '<div class="bguide-progress-label">' + doneCount + ' / ' + steps.length + ' Schritten</div>' +
      '<div class="bguide-progress-bar-wrap"><div class="bguide-progress-bar" style="width:' + pct + '%"></div></div>' +
    '</div>' +
    budgetHtml +
    (currentIdx >= 0
      ? '<div class="bguide-current-hint"><span class="material-icons-round">arrow_forward</span> Nächster Schritt: <strong>' + _escHtml(steps[currentIdx].text) + '</strong></div>'
      : '<div class="bguide-current-hint bguide-all-done"><span class="material-icons-round">celebration</span> Alle Schritte erledigt — dein Event ist durchgeplant!</div>') +
    '<ol class="bguide-list">' + stepsHtml + '</ol>' +
  '</div>';
}

// Step-Aktion: passende Dienstleister für die Kategorie öffnen (Browse
// mit vorgewähltem Kategorie-Filter) — von unterwegs direkt buchbar.
function _guideFindProviders(cat) {
  navigateTo('browse');
  setTimeout(function() {
    var sel = document.getElementById('browseCategory');
    if (sel) sel.value = cat || '';
    // Active-State der Kategorie-Buttons nachziehen (cat steckt im onclick,
    // Mobile-Picker nutzt data-cat).
    document.querySelectorAll('.cat-icon-btn').forEach(function(b) {
      var m = (b.getAttribute('onclick') || '').match(/filterByCategory\(this,\s*'([^']*)'/);
      b.classList.toggle('active', !!m && m[1] === (cat || ''));
    });
    document.querySelectorAll('.mobile-cat-option').forEach(function(o) {
      o.classList.toggle('active', (o.getAttribute('data-cat') || '') === (cat || ''));
    });
    if (typeof filterListings === 'function') filterListings();
    var grid = document.getElementById('browseGrid');
    if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 350);
}

// Step abhaken/reaktivieren — synchron zur gespeicherten Checkliste
// (gleicher Text = gleicher Eintrag), damit Guide und Checkliste nie
// auseinanderlaufen.
function _guideToggleStep(text) {
  if (!_activeBoardId) return;
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;
  project.checklist = project.checklist || [];
  var existing = project.checklist.find(function(it) {
    return it && it.text && it.text.toLowerCase() === String(text).toLowerCase();
  });
  if (existing) {
    existing.done = !existing.done;
  } else {
    project.checklist.push({ id: 'cli_guide_' + Date.now(), text: String(text), done: true, isTemplate: true });
  }
  _saveBoardProjects();
  renderBoardChecklist();
}

function _getChecklistSuggestions(project) {
  // Template-Items, die noch NICHT in der gespeicherten Liste sind = Vorschläge.
  if (!project) return [];
  var tmpl = _CHECKLIST_TEMPLATES[project.template] || _CHECKLIST_TEMPLATES.custom;
  var savedTexts = {};
  (project.checklist || []).forEach(function(it){ if (it && it.text) savedTexts[it.text.toLowerCase()] = 1; });
  return tmpl.filter(function(txt){ return !savedTexts[txt.toLowerCase()]; });
}

function renderBoardChecklist() {
  if (!_activeBoardId) return;
  var project = _boardProjects.find(function(p){ return p.id === _activeBoardId; });
  if (!project) return;
  var container = document.getElementById('boardChecklistView');
  if (!container) return;

  var items = _getProjectChecklist(project);
  var suggestions = _getChecklistSuggestions(project);
  var done = items.filter(function(it){ return it.done; }).length;
  var total = items.length;
  var pct = total ? Math.round((done / total) * 100) : 0;

  var listHtml;
  if (items.length === 0) {
    listHtml = '<div class="bcl-empty">' +
      '<span class="material-icons-round">playlist_add_check</span>' +
      '<p><strong>Noch keine Aufgaben</strong></p>' +
      '<p class="bcl-empty-hint">Schreib oben eine eigene Aufgabe oder klick unten auf eine Idee.</p>' +
    '</div>';
  } else {
    listHtml = '<ul class="bcl-list">' +
      items.map(function(it) {
        return '<li class="bcl-item' + (it.done ? ' done' : '') + '">' +
          '<button class="bcl-check" onclick="toggleChecklistItem(\'' + _escHtml(it.id) + '\')" aria-label="' + (it.done ? 'Erledigt' : 'Offen') + '">' +
            '<span class="material-icons-round">' + (it.done ? 'check_circle' : 'radio_button_unchecked') + '</span>' +
          '</button>' +
          '<span class="bcl-text">' + _escHtml(it.text) + '</span>' +
          '<button class="bcl-del" onclick="deleteChecklistItem(\'' + _escHtml(it.id) + '\')" title="Löschen" aria-label="Löschen"><span class="material-icons-round">close</span></button>' +
        '</li>';
      }).join('') +
      '</ul>';
  }

  var suggestionsHtml = '';
  if (suggestions.length > 0) {
    suggestionsHtml =
      '<div class="bcl-suggestions">' +
        '<div class="bcl-sug-header">' +
          '<span class="material-icons-round">lightbulb</span>' +
          '<span>Ideen <span class="bcl-sug-hint">(optional – tippe an, um aufzunehmen)</span></span>' +
        '</div>' +
        '<div class="bcl-sug-chips">' +
          suggestions.map(function(txt) {
            return '<button type="button" class="bcl-sug-chip" onclick="addChecklistSuggestion(\'' + _escHtml(txt).replace(/'/g, "\\'") + '\')">' +
              '<span class="material-icons-round">add</span>' +
              '<span>' + _escHtml(txt) + '</span>' +
            '</button>';
          }).join('') +
        '</div>' +
      '</div>';
  }

  var html = '<div class="bcl-wrap">' +
    // Geführter Planungs-Guide (Steps in geprüfter Reihenfolge, mit
    // Dienstleister-Suche pro Schritt) — die freie Checkliste bleibt darunter.
    _renderBoardGuide(project) +
    // Oben: Eingabe + Header
    '<div class="bcl-header">' +
      '<div class="bcl-title"><span class="material-icons-round">checklist</span> Planungs-Checkliste</div>' +
      (total ? (
        '<div class="bcl-progress-bar-wrap">' +
          '<div class="bcl-progress-bar" style="width:' + pct + '%"></div>' +
        '</div>' +
        '<div class="bcl-progress-label">' + done + ' / ' + total + ' erledigt</div>'
      ) : '') +
    '</div>' +
    '<form class="bcl-add-form bcl-add-top" onsubmit="addChecklistItem(event)">' +
      '<input type="text" id="newChecklistText" placeholder="Aufgabe hinzuf\u00fcgen\u2026" autocomplete="off" required />' +
      '<button type="submit" class="btn-primary"><span class="material-icons-round">add</span> Hinzufügen</button>' +
    '</form>' +
    // Mitte: tatsächliche Aufgaben
    listHtml +
    // Unten: optionale Vorschläge
    suggestionsHtml +
  '</div>';
  container.innerHTML = html;
}

function addChecklistSuggestion(text) {
  if (!_activeBoardId || !text) return;
  var project = _boardProjects.find(function(p){ return p.id === _activeBoardId; });
  if (!project) return;
  project.checklist = project.checklist || [];
  // Doppelte vermeiden
  var exists = project.checklist.some(function(it){ return it && it.text && it.text.toLowerCase() === text.toLowerCase(); });
  if (exists) return;
  project.checklist.push({ id: 'cli_sug_' + Date.now(), text: text, done: false });
  _saveBoardProjects();
  renderBoardChecklist();
}
window.addChecklistSuggestion = addChecklistSuggestion;
window.renderBoardChecklist = renderBoardChecklist;

function toggleChecklistItem(itemId) {
  if (!_activeBoardId) return;
  var project = _boardProjects.find(function(p){ return p.id === _activeBoardId; });
  if (!project) return;
  project.checklist = project.checklist || [];
  var items = _getProjectChecklist(project);
  var item = items.find(function(it){ return it.id === itemId; });
  if (!item) return;
  item.done = !item.done;
  // Persist: update or insert in project.checklist
  var existing = project.checklist.find(function(it){ return it.id === itemId; });
  if (existing) { existing.done = item.done; }
  else { project.checklist.push(item); }
  _saveBoardProjects();
  renderBoardChecklist();
}
window.toggleChecklistItem = toggleChecklistItem;

function deleteChecklistItem(itemId) {
  if (!_activeBoardId) return;
  var project = _boardProjects.find(function(p){ return p.id === _activeBoardId; });
  if (!project) return;
  project.checklist = (project.checklist || []).filter(function(it){ return it.id !== itemId; });
  _saveBoardProjects();
  renderBoardChecklist();
}
window.deleteChecklistItem = deleteChecklistItem;

function addChecklistItem(event) {
  event.preventDefault();
  if (!_activeBoardId) return;
  var project = _boardProjects.find(function(p){ return p.id === _activeBoardId; });
  if (!project) return;
  var inp = document.getElementById('newChecklistText');
  var text = inp ? inp.value.trim() : '';
  if (!text) return;
  project.checklist = project.checklist || [];
  project.checklist.push({ id: 'cli_custom_' + Date.now(), text: text, done: false, isTemplate: false });
  _saveBoardProjects();
  renderBoardChecklist();
}
window.addChecklistItem = addChecklistItem;

function openAddProviderModal(defaultStage) {
  // Nur Dienstleister-Inserate (Angebote) anzeigen, KEINE Such-Inserate.
  // Filter:
  //  1. Explizites Feld (zukuenftig): listingType / kind / type === 'search' | 'gesuch' | 'suche-dienstleister' → ausblenden
  //  2. Heuristik fuer Legacy-Daten: Titel/Kategorie enthaelt "gesucht" / beginnt mit "Suche " → Such-Inserat
  function _isSearchListing(l) {
    if (!l) return true;
    var t = (l.listingType || l.kind || l.type || '').toString().toLowerCase();
    if (t === 'search' || t === 'gesuch' || t === 'such' || t.indexOf('suche') === 0) return true;
    var title = (l.title || '').toString().toLowerCase();
    var cat   = (l.categoryLabel || l.category || '').toString().toLowerCase();
    if (/\bgesucht\b/.test(title) || /\bgesucht\b/.test(cat)) return true;
    if (/^\s*suche\s/.test(title)) return true;
    return false;
  }
  // Basis: BROWSE-PARITÄT — der Picker zeigt exakt das, was auch die Suche
  // zeigt: alle DB-Inserate PLUS Demo-Inserate, sofern sie nicht per
  // EB_HIDE_DEMO ausgeblendet sind. _visibleListings() ließ eingeloggt nur
  // DB-Inserate durch — dadurch fehlten unter „Geplant" sichtbare Inserate.
  function _pickerBaseList() {
    try {
      if (typeof getHeroListings === 'function') return getHeroListings();
    } catch (e) {}
    return (typeof _visibleListings === 'function')
      ? _visibleListings()
      : (typeof filterDemos === 'function' ? filterDemos(LISTINGS || []) : (LISTINGS || []));
  }
  var _baseList = _pickerBaseList();
  // Kein 30er-Cap mehr: sonst fehlen Inserate im Picker und die Suche darüber
  // findet sie nie (sie filtert nur gerenderte Karten). 300 als Sicherheitsnetz.
  // Rollen-Sichtbarkeit: Event-Planer sehen nur Dienstleister-Angebote;
  // Dienstleister sehen ALLES — Angebote UND Gesuche (um z. B. auf ein
  // "DJ gesucht"-Inserat zu reagieren und es einzuplanen).
  var _showSearchListings = (typeof isDienstleister === 'function') && isDienstleister();
  var listingCardsHtml = _buildListingPickerCardsHtml(_baseList, _isSearchListing, _showSearchListings);

  // Liste IMMER aktuell halten: Inserate frisch vom Server nachladen und
  // das Grid danach neu aufbauen (Auswahl + Suchfilter bleiben erhalten).
  try {
    loadDbListings(true).then(function() {
      var grid = document.getElementById('lpickGrid');
      if (!grid) return; // Modal inzwischen geschlossen
      var freshBase = _pickerBaseList();
      var selectedId = (document.getElementById('cardListingId') || {}).value || '';
      grid.innerHTML = _buildListingPickerCardsHtml(freshBase, _isSearchListing, _showSearchListings);
      if (selectedId) {
        var selBtn = grid.querySelector('.eb-lpick-card[data-id="' + selectedId + '"]');
        if (selBtn) selBtn.classList.add('is-active');
      }
      var searchEl = document.getElementById('lpickSearch');
      if (searchEl && searchEl.value) _filterListingPicker(searchEl.value);
    });
  } catch (e) { /* offline — gecachte Liste bleibt sichtbar */ }

  var html = `<div class="modal-overlay show" id="addProviderModal" onclick="closeModalOnOverlay(event)" style="z-index:2000">
    <div class="modal" onclick="event.stopPropagation()">
      <button class="modal-close" aria-label="Schließen" onclick="document.getElementById('addProviderModal').remove()"><span class="material-icons-round">close</span></button>
      <div class="modal-header">
        <span class="material-icons-round modal-icon">person_add</span>
        <h2>Dienstleister hinzufügen</h2>
        <p>Aus bestehenden Inseraten wählen oder manuell eingeben</p>
      </div>
      <form class="modal-form" onsubmit="_addProviderCard(event,'${defaultStage}')">
        <div class="form-group">
          <label>Aus Inseraten wählen <span style="font-weight:400;color:var(--text-light);font-size:12px">(optional)</span></label>
          <div class="eb-lpick-search">
            <span class="material-icons-round">search</span>
            <input type="text" id="lpickSearch" placeholder="Nach Name, Kategorie oder Ort suchen…" oninput="_filterListingPicker(this.value)" />
            <button type="button" class="eb-lpick-clear" onclick="_clearListingPick()" title="Auswahl löschen" aria-label="Auswahl löschen"><span class="material-icons-round">close</span></button>
          </div>
          <div class="eb-lpick-grid" id="lpickGrid">
            ${listingCardsHtml}
          </div>
          <input type="hidden" id="cardListingId" value="" />
          <input type="hidden" id="cardListingImage" value="" />
          <input type="hidden" id="cardListingTitle" value="" />
        </div>
        <div class="form-group">
          <label>Name / Firma</label>
          <input type="text" id="cardName" placeholder="DJ Max, Catering König, ..." required />
        </div>
        <div class="form-group">
          <label>Kategorie</label>
          <input type="text" id="cardCategory" placeholder="DJ, Catering, Fotografie, ..." />
        </div>
        <div class="form-group">
          <label>Preis (€)</label>
          <input type="number" id="cardPrice" placeholder="0" min="0" step="1" />
        </div>
        <div class="form-group">
          <label>Zeiten am Eventtag</label>
          <div id="cardZeiten"></div>
        </div>
        <div class="form-group">
          <label>Notiz</label>
          <textarea id="cardNote" rows="2" placeholder="Bespreche noch einen Rabatt, Technik muss vorher aufgebaut sein, ..."></textarea>
        </div>
        <button type="submit" class="btn-primary btn-block">
          <span class="material-icons-round">add</span> Zum Board hinzufügen
        </button>
      </form>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  window._ebZeitenRendern('cardZeiten', 'nkZ', []);
}

/** Baut die Karten-Buttons für den Inserat-Picker (Board "Dienstleister hinzufügen"). */
function _buildListingPickerCardsHtml(baseList, isSearchListingFn, showSearchListings) {
  var listings = (baseList || [])
    .filter(function(l){ return showSearchListings || !isSearchListingFn(l); })
    .slice(0, 300);
  return listings.map(function(l) {
    var img = l.image || l.providerImg || '';
    var price = l.priceLabel || (l.price ? ('ab ' + l.price + ' €') : '');
    return '<button type="button" class="eb-lpick-card" data-id="' + l.id +
      '"' + _aiDisclosureAttrs(l) +
      ' data-name="' + _escHtml(l.providerName || l.title || '') + '"' +
      ' data-category="' + _escHtml(l.categoryLabel || l.category || '') + '"' +
      ' data-price="' + (l.price || '') + '"' +
      ' data-avatar="' + _escHtml(img) + '"' +
      ' data-image="' + _escHtml(l.image || img) + '"' +
      ' data-title="' + _escHtml(l.title || '') + '"' +
      ' onclick="_selectListingCard(this)">' +
      '<span class="eb-lpick-thumb" style="background-image:url(\'' + _escHtml(img) + '\')"></span>' +
      '<span class="eb-lpick-body">' +
        '<span class="eb-lpick-title">' + _escHtml(l.title || '') + '</span>' +
        _aiDisclosureLabelsHtml(l, 'ai-disclosure-picker') +
        '<span class="eb-lpick-meta">' +
          '<span class="eb-lpick-cat">' + _escHtml(l.categoryLabel || l.category || '') + '</span>' +
          (price ? '<span class="eb-lpick-price">' + _escHtml(price) + '</span>' : '') +
        '</span>' +
      '</span>' +
      '<span class="eb-lpick-check material-icons-round">check_circle</span>' +
    '</button>';
  }).join('');
}

window._selectListingCard = function(btn) {
  var grid = btn.parentElement;
  var wasActive = btn.classList.contains('is-active');
  if (grid) grid.querySelectorAll('.eb-lpick-card').forEach(function(b){ b.classList.remove('is-active'); });
  if (wasActive) {
    _clearListingPick();
    return;
  }
  btn.classList.add('is-active');
  var hid = document.getElementById('cardListingId');
  if (hid) hid.value = btn.dataset.id || '';
  var nameEl = document.getElementById('cardName');
  var catEl = document.getElementById('cardCategory');
  var priceEl = document.getElementById('cardPrice');
  if (nameEl) { nameEl.value = btn.dataset.name || ''; nameEl.dispatchEvent(new Event('input')); }
  if (catEl) { catEl.value = btn.dataset.category || ''; catEl.dispatchEvent(new Event('input')); }
  if (priceEl && btn.dataset.price) { priceEl.value = btn.dataset.price; priceEl.dispatchEvent(new Event('input')); }
  var imgHid = document.getElementById('cardListingImage'); if (imgHid) imgHid.value = btn.dataset.image || '';
  var titleHid = document.getElementById('cardListingTitle'); if (titleHid) titleHid.value = btn.dataset.title || '';
  // Scroll to filled fields
  if (nameEl) nameEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

window._clearListingPick = function() {
  var grid = document.getElementById('lpickGrid');
  if (grid) grid.querySelectorAll('.eb-lpick-card.is-active').forEach(function(b){ b.classList.remove('is-active'); });
  var hid = document.getElementById('cardListingId'); if (hid) hid.value = '';
  var imgHid2 = document.getElementById('cardListingImage'); if (imgHid2) imgHid2.value = '';
  var titleHid2 = document.getElementById('cardListingTitle'); if (titleHid2) titleHid2.value = '';
  var search = document.getElementById('lpickSearch'); if (search) { search.value = ''; _filterListingPicker(''); }
};

window._filterListingPicker = function(q) {
  q = (q || '').toLowerCase().trim();
  var grid = document.getElementById('lpickGrid');
  if (!grid) return;
  grid.querySelectorAll('.eb-lpick-card').forEach(function(b){
    var text = (b.textContent || '').toLowerCase();
    b.style.display = (!q || text.indexOf(q) !== -1) ? '' : 'none';
  });
};

function _autoFillProviderFromListing(select) {
  var opt = select.options[select.selectedIndex];
  if (!opt.value) return;
  var nameEl = document.getElementById('cardName');
  var catEl = document.getElementById('cardCategory');
  var priceEl = document.getElementById('cardPrice');
  if (nameEl) nameEl.value = opt.dataset.name || '';
  if (catEl) catEl.value = opt.dataset.category || '';
  if (priceEl && opt.dataset.price) {
    priceEl.value = parseFloat(String(opt.dataset.price).replace(/[^\d.,]/g,'').replace(',','.')) || '';
  }
}

function _addProviderCard(event, stage) {
  event.preventDefault();
  if (!_activeBoardId) return;
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;

  var listingId = document.getElementById('cardListingId') ? parseInt(document.getElementById('cardListingId').value) || null : null;
  // Doppelte Karten verhindern (gleiche listingId im selben Projekt)
  if (listingId && project.cards && project.cards.some(function(c) { return c.listingId && String(c.listingId) === String(listingId); })) {
    showToast('Dieses Inserat ist bereits im Board.', 'warning');
    return;
  }
  var name = document.getElementById('cardName').value.trim();
  var category = document.getElementById('cardCategory').value.trim();
  var price = parseFloat(document.getElementById('cardPrice').value) || 0;
  var note = document.getElementById('cardNote').value.trim();
  var zeiten = ebKartenZeiten({ times: window._ebZeitenLesen('cardZeiten', 'nkZ') });

  var listing = listingId ? (LISTINGS || []).find(function(l) { return l.id === listingId; }) : null;
  var avatar = listing ? (listing.providerImg || listing.providerAvatar || null) : null;
  var listingImage = (document.getElementById('cardListingImage') || {}).value || (listing ? (listing.image || '') : '');
  var listingTitle = (document.getElementById('cardListingTitle') || {}).value || (listing ? (listing.title || '') : '');

  var card = {
    id: 'card_' + Date.now(),
    name: name,
    category: category,
    price: price,
    note: note,
    times: zeiten,
    // Spiegel der ersten Zeit — siehe ebKartenZeitenSetzen().
    startTime: zeiten.length ? zeiten[0].start : '',
    endTime: zeiten.length ? zeiten[0].end : '',
    stage: stage,
    listingId: listingId,
    providerId: listing ? (listing.providerId || null) : null,
    avatar: avatar,
    listingImage: listingImage || '',
    listingTitle: listingTitle || '',
    createdAt: new Date().toISOString()
  };

  if (!project.cards) project.cards = [];
  project.cards.push(card);
  _saveBoardProjects();
  document.getElementById('addProviderModal') && document.getElementById('addProviderModal').remove();
  renderKanban(project);
  _updateBoardStats(project);
  if (document.getElementById('boardFlowView') && document.getElementById('boardFlowView').style.display !== 'none') {
    renderBoardFlow();
  }
  showToast(name + ' wurde zum Board hinzugefügt!', 'check_circle');
}

function deleteBoardCard(cardId) {
  if (!_activeBoardId) return;
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;
  var card = (project.cards || []).find(function(c) { return c.id === cardId; });
  if (!card) return;
  var isPaid = !!(card.paymentIntentId || card.paymentReference || (card.paymentStatus && /paid|bezahlt/i.test(String(card.paymentStatus))));
  if (isPaid) {
    showToast('Bezahlte Buchungen können nicht gelöscht werden.', 'warning');
    return;
  }
  project.cards = (project.cards || []).filter(function(c) { return c.id !== cardId; });
  _saveBoardProjects();
  renderKanban(project);
  _updateBoardStats(project);
}

function editBoardCard(cardId) {
  if (!_activeBoardId) return;
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;
  var card = (project.cards || []).find(function(c) { return c.id === cardId; });
  if (!card) return;

  var html = `<div class="modal-overlay show" id="editCardModal" onclick="closeModalOnOverlay(event)" style="z-index:2000">
    <div class="modal modal-sm" onclick="event.stopPropagation()">
      <button class="modal-close" aria-label="Schließen" onclick="document.getElementById('editCardModal').remove()"><span class="material-icons-round">close</span></button>
      <div class="modal-header"><span class="material-icons-round modal-icon">edit</span><h2>Karte bearbeiten</h2></div>
      <form class="modal-form" onsubmit="_saveCardEdit(event,'${cardId}')">
        <div class="form-group"><label>Name</label><input type="text" id="editCardName" value="${_escHtml(card.name)}" required /></div>
        <div class="form-group"><label>Kategorie</label><input type="text" id="editCardCategory" value="${_escHtml(card.category || '')}" /></div>
        <div class="form-group"><label>Preis (€)</label><input type="number" id="editCardPrice" value="${card.price || ''}" min="0" step="1" /></div>
        <div class="form-group"><label>Zeiten</label><div id="editCardZeiten"></div></div>
        <div class="form-group"><label>Notiz</label><textarea id="editCardNote" rows="2">${_escHtml(card.note || '')}</textarea></div>
        <button type="submit" class="btn-primary btn-block"><span class="material-icons-round">save</span> Speichern</button>
      </form>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  window._ebZeitenRendern('editCardZeiten', 'ecZ', ebKartenZeiten(card));
}

function _saveCardEdit(event, cardId) {
  event.preventDefault();
  if (!_activeBoardId) return;
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;
  var card = (project.cards || []).find(function(c) { return c.id === cardId; });
  if (!card) return;
  card.name = document.getElementById('editCardName').value.trim();
  card.category = document.getElementById('editCardCategory').value.trim();
  card.price = parseFloat(document.getElementById('editCardPrice').value) || 0;
  var _gewollt = window._ebZeitenLesen('editCardZeiten', 'ecZ');
  var _gesetzt = ebKartenZeitenSetzen(card, _gewollt);
  if (_gewollt.length > _gesetzt.length) {
    showToast((_gewollt.length - _gesetzt.length) + ' doppelte oder ungültige Zeit verworfen.', 'schedule');
  }
  card.note = document.getElementById('editCardNote').value.trim();
  _saveBoardProjects();
  document.getElementById('editCardModal') && document.getElementById('editCardModal').remove();
  renderKanban(project);
  _updateBoardStats(project);
  if (document.getElementById('boardFlowView') && document.getElementById('boardFlowView').style.display !== 'none') {
    renderBoardFlow();
  }
  showToast('Gespeichert!', 'check_circle');
}


// =========================================================
// =================== SOCIAL FEED ENHANCED ================
// =========================================================

var _ignoredPosts = new Set();
var _ignoredUsers = new Set();

function openPostMenu(event, postId, authorName) {
  event.stopPropagation();
  // Remove any existing sheet
  closePostMenu();

  var overlay = document.createElement('div');
  overlay.className = 'post-options-overlay';
  overlay.id = 'postOptionsOverlay';
  overlay.onclick = closePostMenu;

  var sheet = document.createElement('div');
  sheet.className = 'post-options-sheet';
  sheet.id = 'postOptionsSheet';
  sheet.innerHTML =
    '<div class="post-options-handle"></div>' +
    '<button class="post-options-item" onclick="copyPostLink(\'' + postId + '\')">' +
      '<span class="material-icons-round">link</span> Link kopieren' +
    '</button>' +
    '<button class="post-options-item" onclick="markNotInterested(\'' + postId + '\')">' +
      '<span class="material-icons-round">thumb_down_off_alt</span> Nicht interessiert' +
    '</button>' +
    (authorName ? '<button class="post-options-item" onclick="ignoreUser(\'' + authorName + '\')">' +
      '<span class="material-icons-round">person_off</span> @' + authorName + ' ignorieren' +
    '</button>' : '') +
    '<div class="post-options-divider"></div>' +
    '<button class="post-options-item danger" onclick="reportPost(\'' + postId + '\')">' +
      '<span class="material-icons-round">flag</span> Beitrag melden' +
    '</button>' +
    '<button class="post-options-cancel" onclick="closePostMenu()">Abbrechen</button>';

  document.body.appendChild(overlay);
  document.body.appendChild(sheet);
  requestAnimationFrame(function() {
    overlay.classList.add('visible');
    sheet.classList.add('visible');
  });
  _attachSheetSwipe(sheet, overlay);
}

function _attachSheetSwipe(sheet, overlay) {
  var _startY = 0, _isDragging = false;
  sheet.addEventListener('touchstart', function(e) {
    _startY = e.touches[0].clientY;
    _isDragging = true;
    sheet.style.transition = 'none';
  }, { passive: true });
  sheet.addEventListener('touchmove', function(e) {
    if (!_isDragging) return;
    var dy = e.touches[0].clientY - _startY;
    if (dy > 0) {
      sheet.style.transform = 'translateX(-50%) translateY(' + dy + 'px)';
      overlay.style.opacity = Math.max(0, 1 - dy / 300);
    }
  }, { passive: true });
  sheet.addEventListener('touchend', function(e) {
    if (!_isDragging) return;
    _isDragging = false;
    var dy = e.changedTouches[0].clientY - _startY;
    sheet.style.transition = '';
    overlay.style.opacity = '';
    if (dy > 80) { closePostMenu(); }
    else { sheet.style.transform = 'translateX(-50%) translateY(0)'; }
  }, { passive: true });
}

function closePostMenu() {
  var overlay = document.getElementById('postOptionsOverlay');
  var sheet = document.getElementById('postOptionsSheet');
  if (!sheet) return;
  overlay.classList.remove('visible');
  sheet.classList.remove('visible');
  setTimeout(function() {
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    if (sheet && sheet.parentNode) sheet.parentNode.removeChild(sheet);
  }, 300);
}

function copyPostLink(postId) {
  closePostMenu();
  var url = window.location.origin + window.location.pathname + '#post-' + postId;
  try { navigator.clipboard.writeText(url); } catch(e) {}
  showToast('Link kopiert!', 'link');
}

function markNotInterested(postId) {
  closePostMenu();
  _ignoredPosts.add(postId);
  var card = document.querySelector('[data-post-id="' + postId + '"]');
  if (card) {
    card.style.transition = 'opacity 0.3s, transform 0.3s';
    card.style.opacity = '0';
    card.style.transform = 'scale(0.95)';
    setTimeout(function() { if (card.parentNode) card.parentNode.removeChild(card); }, 300);
  }
  showToast('Beitrag ausgeblendet', 'visibility_off');
}

function ignoreUser(authorName) {
  closePostMenu();
  _ignoredUsers.add(authorName);
  document.querySelectorAll('.feed-post-card').forEach(function(card) {
    var strong = card.querySelector('.feed-post-author strong');
    if (strong && strong.textContent.trim() === authorName) {
      card.style.transition = 'opacity 0.3s';
      card.style.opacity = '0';
      setTimeout(function() { if (card.parentNode) card.parentNode.removeChild(card); }, 300);
    }
  });
  showToast('@' + authorName + ' wird ignoriert', 'person_off');
}

function reportPost(postId) {
  closePostMenu();
  if (String(postId).indexOf('listing-') === 0) {
    var listingId = parseInt(String(postId).slice(8), 10);
    var listing = (typeof LISTINGS !== 'undefined' ? LISTINGS : []).find(function(item) { return item.id === listingId; });
    if (listing && typeof openListingReport === 'function') openListingReport(listing);
    return;
  }
  // Simple reason selection sheet
  var overlay = document.createElement('div');
  overlay.className = 'post-options-overlay';
  overlay.id = 'postOptionsOverlay';
  overlay.onclick = closePostMenu;

  var sheet = document.createElement('div');
  sheet.className = 'post-options-sheet';
  sheet.id = 'postOptionsSheet';
  var reasons = ['Spam oder Werbung', 'Unangemessene Inhalte', 'Belästigung oder Mobbing', 'Falsche Informationen', 'Urheberrechtsverletzung', 'Anderer Grund'];
  sheet.innerHTML =
    '<div class="post-options-handle"></div>' +
    '<div style="padding:4px 24px 12px;font-weight:700;font-size:16px;color:var(--text)">Warum möchtest du diesen Beitrag melden?</div>' +
    reasons.map(function(r) {
      return '<button class="post-options-item" onclick="submitReport(\'' + postId + '\', \'' + r + '\')">' +
        '<span class="material-icons-round">chevron_right</span>' + r +
      '</button>';
    }).join('') +
    '<button class="post-options-cancel" onclick="closePostMenu()">Abbrechen</button>';

  document.body.appendChild(overlay);
  document.body.appendChild(sheet);
  requestAnimationFrame(function() {
    overlay.classList.add('visible');
    sheet.classList.add('visible');
  });
  _attachSheetSwipe(sheet, overlay);
}

function submitReport(postId, reason) {
  closePostMenu();
  _ignoredPosts.add(postId);
  var card = document.querySelector('[data-post-id="' + postId + '"]');
  if (card) {
    card.style.transition = 'opacity 0.3s';
    card.style.opacity = '0';
    setTimeout(function() { if (card.parentNode) card.parentNode.removeChild(card); }, 300);
  }
  showToast('Beitrag gemeldet. Danke für dein Feedback.', 'flag');
}

// Vergleichbarer Zeitstempel (ms) aus createdAt/time — robust ggü. MySQL-
// ("2026-07-21 02:00:00") und ISO-Formaten. Basis für Feed-Sortierung.
function _listingTs(l) {
  var d = l && (l.createdAt || l.time);
  if (!d) return 0;
  var s = String(d);
  var t = new Date(s.replace(' ', 'T') + (s.indexOf('T') !== -1 || s.indexOf('+') !== -1 ? '' : 'Z')).getTime();
  return isNaN(t) ? 0 : t;
}

// Fester, KONSTANTER Anker für alle Demo-/Seed-Erstellzeiten (KEIN Date.now!).
// Demo-Inhalte sind KEINE frisch geposteten Beiträge – sie bekommen daher feste,
// ältere Erstelldaten (Wochen zurück). Dadurch ist der angezeigte Zeitpunkt
// konstant UND ehrlich: nichts erscheint fälschlich als „gerade eben"/„gestern".
// Echte Nutzerbeiträge (DB / selbst erstellt) behalten ihren realen Zeitpunkt.
var EB_DEMO_ANCHOR_MS = Date.parse('2026-07-20T10:00:00Z');
function _ebDemoBase() { return EB_DEMO_ANCHOR_MS; }

// Demo-Inserate: feste Erstelldaten (Wochen zurück, höhere id = neuer).
// Echte DB-Inserate (_fromDb) behalten ihr createdAt (UTC) vom Server.
(function _assignDemoListingTimes() {
  try {
    if (typeof LISTINGS === 'undefined' || !Array.isArray(LISTINGS)) return;
    LISTINGS.forEach(function(l) {
      if (!l || l._fromDb) return;
      var id = parseInt(l.id, 10) || 1;
      var daysAgo = 12 + (15 - id) * 4; // id15→12T … id11→28T … id1→68T
      if (daysAgo < 10) daysAgo = 10;
      l.createdAt = new Date(EB_DEMO_ANCHOR_MS - daysAgo * 86400000).toISOString();
    });
  } catch (e) {}
})();

var _socialPosts = (function() {
  var stored = JSON.parse(localStorage.getItem('eb_social_posts') || 'null');
  // Regenerate if old format (no suche- types) oder noch ohne _isDemo-Flag
  if (stored && stored.length && (!stored.some(function(p) { return (p.type || '').indexOf('suche') === 0; }) || !stored.some(function(p) { return p._isDemo === true; }))) {
    stored = null;
    localStorage.removeItem('eb_social_posts');
  }
  if (!stored) {
    stored = _generateDemoSocialPosts().map(function(p) { p._isDemo = true; return p; });
  }
  return stored;
})();

// Bestehende (evtl. veraltete) Demo-Post-Zeiten auf die festen Anker-Zeiten
// bringen – ohne echte Nutzerbeiträge anzufassen. So zeigen auch Browser mit
// altem localStorage-Stand sofort die korrekten, konstanten Erstellzeiten.
(function _syncDemoPostTimes() {
  try {
    var tpl = {};
    _generateDemoSocialPosts().forEach(function(p) { tpl[p.id] = p.time; });
    var changed = false;
    _socialPosts.forEach(function(p) {
      if (p && p._isDemo && tpl[p.id] && p.time !== tpl[p.id]) { p.time = tpl[p.id]; changed = true; }
    });
    if (changed) { try { ebSpeichern('eb_social_posts', JSON.stringify(_socialPosts)); } catch (e) {} }
  } catch (e) {}
})();

// Auch der fest verdrahtete Offline-Fallback besitzt echte Profilziele. Der
// Tagesfeed liefert reichere Profildaten nach; bis dahin entsteht aus jedem
// Demo-Beitrag ein klar gekennzeichnetes, inseratsfreies Demo-Profil.
function _registerSocialPostAccounts(posts) {
  if (typeof _registerDemoAccountProfiles !== 'function' || !Array.isArray(posts)) return;
  _registerDemoAccountProfiles(posts.filter(function(p) {
    return p && p._isDemo === true && _toPositiveInt(p.authorId) && p.author;
  }).map(function(p) {
    return {
      id: _toPositiveInt(p.authorId),
      name: p.author,
      avatar: p.avatar || '',
      avatarSeed: p.avatarSeed || ('demo-account-' + p.authorId),
      role: p.category || (p.type === 'suche-events' ? 'Dienstleister' : 'Eventplanung'),
      location: p.location || 'Deutschland',
      since: '2026',
      description: p.author + ' ist ein Demo-Account für Beispielbeiträge im Eventbörse-Community-Feed. ' +
        'Das Profil stellt keine echte Person oder Firma dar.',
      tags: ['Demo-Account', 'Community'],
      _isDemo: true
    };
  }));
}

function _socialPostHasAccount(post) {
  return !!(post && _toPositiveInt(post.authorId) && String(post.author || '').trim());
}

_registerSocialPostAccounts(_socialPosts);

// Filter Bot-/Demo-Beiträge aus dem Feed, wenn EB_HIDE_DEMO aktiv ist.
function _visibleSocialPosts() {
  var assigned = _socialPosts.filter(_socialPostHasAccount);
  if (!window.EB_HIDE_DEMO) return assigned;
  return assigned.filter(function(p) { return p._isDemo !== true; });
}
var _likedPosts = new Set(JSON.parse(localStorage.getItem('eb_liked_posts') || '[]'));

function _saveSocialData() {
  ebSpeichern('eb_social_posts', JSON.stringify(_socialPosts));
  ebSpeichern('eb_liked_posts', JSON.stringify([..._likedPosts]));
}

function _generateDemoSocialPosts() {
  // Zeiten aus der persistierten Demo-Basis ableiten → über Reloads konstant.
  var base = _ebDemoBase();
  return [
    {
      id: 'sp1',
      type: 'suche-dienstleister',
      author: 'Julia & Mark',
      authorId: 91101,
      avatar: ebAvatar('julia', 'Julia'),
      title: 'DJ für Hochzeit gesucht',
      category: 'DJ',
      location: 'Schloss Rheinsberg',
      date: '15. August 2026',
      budget: 'bis 800€',
      content: 'Wir suchen einen erfahrenen DJ für unsere Hochzeit! Circa 120 Gäste, Mix aus Charts, 80er und ein bisschen Techno zum Schluss. Eigene Anlage sollte vorhanden sein. #Hochzeit #DJ #Berlin',
      image: null,
      time: new Date(base - 14 * 86400000).toISOString(),
      likes: 12,
      comments: 5,
      metAt: null
    },
    {
      id: 'sp2',
      type: 'suche-events',
      author: 'DJ Max Beat',
      authorId: 91212,
      avatar: ebAvatar('djmax', 'DJ Max'),
      title: 'Erfahrener DJ sucht Aufträge in Hamburg',
      category: 'DJ',
      location: 'Hamburg & Umgebung',
      date: 'Flexibel',
      budget: 'ab 400€',
      content: 'Professioneller Event-DJ mit 8 Jahren Erfahrung sucht neue Aufträge! Hochzeiten, Firmenevents, Geburtstage. Eigene PA-Anlage & Lichtshow. #DJLife #EventDJ #Hamburg',
      image: 'https://images.pexels.com/photos/32589034/pexels-photo-32589034.jpeg?auto=compress&cs=tinysrgb&w=600',
      time: new Date(base - 18 * 86400000).toISOString(),
      likes: 83,
      comments: 7,
      metAt: null
    },
    {
      id: 'sp3',
      type: 'met',
      author: 'Sophia K.',
      authorId: 91115,
      avatar: ebAvatar('sophia', 'Sophia'),
      content: 'Durch die Firmenfeier mit Top Catering wirklich tolle Menschen kennengelernt. Das Essen war phantastisch! #Catering #Firmenevent',
      image: 'https://images.pexels.com/photos/2291367/pexels-photo-2291367.jpeg?auto=compress&cs=tinysrgb&w=600',
      time: new Date(base - 23 * 86400000).toISOString(),
      likes: 31,
      comments: 4,
      metAt: { eventName: 'Sommerfest Tech GmbH', date: '2026-06-20' }
    },
    {
      id: 'sp4',
      type: 'suche-dienstleister',
      author: 'Anna Berger',
      authorId: 91116,
      avatar: ebAvatar('anna', 'Anna'),
      title: 'Fotograf für Firmen-Sommerfest',
      category: 'Fotograf',
      location: 'München',
      date: '20. Juli 2026',
      budget: 'Verhandlungsbasis',
      content: 'Wir suchen einen Fotografen für unser Firmen-Sommerfest (ca. 200 Mitarbeiter). Mindestens 4 Stunden, am besten mit Erfahrung bei Firmenevents. Gerne Portfolio mitschicken! #Fotografie #Firmenevent #München',
      image: null,
      time: new Date(base - 30 * 86400000).toISOString(),
      likes: 24,
      comments: 9,
      metAt: null
    },
    {
      id: 'sp5',
      type: 'ankuendigung',
      author: 'BlumenZauber GmbH',
      authorId: 91213,
      avatar: ebAvatar('blumen', 'Blumen'),
      content: 'Neue Kollektion Frühjahr/Sommer! Exklusive Tischdekoration und Brautsträuße für euren unvergesslichen Tag. Jetzt anfragen! #Floristik #Hochzeit #Dekoration',
      image: 'https://images.pexels.com/photos/1045541/pexels-photo-1045541.jpeg?auto=compress&cs=tinysrgb&w=600',
      time: new Date(base - 38 * 86400000).toISOString(),
      likes: 56,
      comments: 8,
      metAt: null
    },
    {
      id: 'sp6',
      type: 'suche-events',
      author: 'Catering Deluxe',
      authorId: 91214,
      avatar: ebAvatar('catering', 'Catering'),
      title: 'Catering-Service sucht Sommer-Events',
      category: 'Catering',
      location: 'NRW & Umgebung',
      date: 'Juni–September 2026',
      budget: 'ab 25€ p.P.',
      content: 'Wir haben noch freie Kapazitäten für Sommer-Events! Buffets, Flying Dinner, BBQ – alles möglich. Bio & regional. Gerne auch größere Events ab 50 Personen. #Catering #Sommer #Events',
      image: null,
      time: new Date(base - 48 * 86400000).toISOString(),
      likes: 38,
      comments: 11,
      metAt: null
    }
  ];
}

// ========== FEED: STANDORT / „In deiner Nähe" ==========
var _feedNearby = false;        // Standort-Sortierung aktiv?
var _feedUserCoords = null;     // { lat, lng } des Nutzers
var _feedUserCity = null;       // nächste bekannte Stadt
var _feedLocating = false;      // Standortabfrage läuft?

// Nächstgelegene bekannte Stadt zu Koordinaten finden.
function _nearestCity(lat, lng) {
  var best = null, bestD = Infinity;
  Object.keys(CITY_PROXIMITY).forEach(function(c) {
    var p = CITY_PROXIMITY[c];
    var d = haversineKm(lat, lng, p.lat, p.lng);
    if (d < bestD) { bestD = d; best = c; }
  });
  return best ? { city: best, km: bestD } : null;
}

// Entfernung eines Feed-Eintrags (Listing/Post) zum Nutzer-Standort in km.
// Erkennt Städtenamen auch in Freitext-Orten („Hamburg & Umgebung").
function _feedItemKm(loc) {
  if (!_feedUserCoords || !loc) return null;
  var city = CITY_PROXIMITY[loc] ? loc : (typeof _ebDetectCityInText === 'function' ? _ebDetectCityInText(loc) : '');
  var p = city ? CITY_PROXIMITY[city] : null;
  if (!p) return null;
  return haversineKm(_feedUserCoords.lat, _feedUserCoords.lng, p.lat, p.lng);
}

// Array nach Nähe zum Nutzer sortieren (stabil, unbekannte Orte ans Ende).
function _sortByNearby(arr, getLoc) {
  return arr.slice().map(function(it, i) {
    return { it: it, i: i, km: _feedItemKm(getLoc(it)) };
  }).sort(function(a, b) {
    var ak = (a.km == null) ? Infinity : a.km;
    var bk = (b.km == null) ? Infinity : b.km;
    return (ak - bk) || (a.i - b.i);
  }).map(function(x) { return x.it; });
}

// Badge-Zustand aktualisieren: 'idle' | 'loading' | 'active'.
function _setFeedNearbyUI(state) {
  var badge = document.getElementById('feedLocationBadge');
  var txt = document.getElementById('feedLocationText');
  if (!badge || !txt) return;
  var icon = badge.querySelector('.material-icons-round');
  badge.classList.remove('active', 'loading');
  if (state === 'loading') {
    badge.classList.add('loading');
    txt.textContent = 'Standort…';
    if (icon) icon.textContent = 'my_location';
    badge.setAttribute('aria-pressed', 'false');
  } else if (state === 'active') {
    badge.classList.add('active');
    txt.textContent = _feedUserCity ? ('In der Nähe · ' + _feedUserCity) : 'In deiner Nähe';
    if (icon) icon.textContent = 'my_location';
    badge.setAttribute('aria-pressed', 'true');
  } else {
    txt.textContent = 'In deiner Nähe';
    if (icon) icon.textContent = 'location_on';
    badge.setAttribute('aria-pressed', 'false');
  }
}

// Aktuell aktiven Feed-Tab neu rendern (Standort-Sortierung greift automatisch).
function _rerenderCurrentFeed() {
  var activeTab = document.querySelector('#page-aktuelles .feed-tab.active');
  var tab = (activeTab && activeTab.dataset.feed) ? activeTab.dataset.feed : 'foryou';
  renderFeed(tab);
}

// Standort-Button umschalten: an → Standort abfragen & Feed nach Nähe sortieren.
function toggleFeedNearby() {
  if (_feedNearby) {
    _feedNearby = false;
    _feedUserCoords = null;
    _feedUserCity = null;
    _setFeedNearbyUI('idle');
    _rerenderCurrentFeed();
    return;
  }
  if (!navigator.geolocation) {
    showToast('Standort wird von deinem Browser nicht unterstützt.', 'error_outline');
    return;
  }
  if (_feedLocating) return;
  _feedLocating = true;
  _setFeedNearbyUI('loading');
  navigator.geolocation.getCurrentPosition(function(pos) {
    _feedLocating = false;
    _feedUserCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    var near = _nearestCity(_feedUserCoords.lat, _feedUserCoords.lng);
    _feedUserCity = near ? near.city : null;
    _feedNearby = true;
    _setFeedNearbyUI('active');
    _rerenderCurrentFeed();
    showToast('Feed nach deinem Standort sortiert' + (_feedUserCity ? ' · ' + _feedUserCity : ''), 'my_location');
  }, function(err) {
    _feedLocating = false;
    _setFeedNearbyUI('idle');
    var denied = err && err.code === 1;
    showToast(denied ? 'Standort-Zugriff abgelehnt. Bitte im Browser erlauben.' : 'Standort konnte nicht ermittelt werden.', 'error_outline');
  }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
}

/* ══════════════════════════════════════════════════════════════════
   TAGES-DEMO-FEED  ·  assets/eb-demo-feed.json
   ------------------------------------------------------------------
   Erzeugt von scripts/demo-feed.mjs, täglich von der Routine erneuert.
   Löst das Altern des fest einprogrammierten Ankers: ohne die Datei
   stünde nach Monaten unter jedem Demo-Beitrag „vor 6 Monaten".

   Die Ehrlichkeitsregel bleibt: der Generator gibt keinem Beitrag eine
   Erstellzeit von weniger als 10 Tagen zurück, und diese Seite prüft das
   beim Laden noch einmal nach. Ein Feed, der „gestern" behauptet, obwohl
   nichts gepostet wurde, wird hier verworfen statt angezeigt.
   ══════════════════════════════════════════════════════════════════ */
var _ebDemoFeedState = 'idle';   // idle | loading | ready | failed

function _ebDemoFeedUrl() {
  var base = '';
  if (window.eventboerseApi && window.eventboerseApi.themeUrl) {
    base = String(window.eventboerseApi.themeUrl).replace(/\/$/, '');
  } else {
    var tag = document.querySelector('script[src*="app.js"]');
    if (tag) base = String(tag.src).replace(/\/app\.js.*$/, '');
  }
  return (base ? base + '/' : '') + 'assets/eb-demo-feed.json';
}

function _ebDemoFeedLoad() {
  if (_ebDemoFeedState === 'loading' || _ebDemoFeedState === 'ready') return;
  _ebDemoFeedState = 'loading';
  fetch(_ebDemoFeedUrl(), { credentials: 'same-origin' })
    .then(function(r) { if (!r.ok) throw new Error('feed'); return r.json(); })
    .then(function(feed) {
      if (!feed || !Array.isArray(feed.posts) || !feed.posts.length) throw new Error('leer');
      if (feed.version !== 2 || !Array.isArray(feed.accounts) || !feed.accounts.length) throw new Error('accounts');
      var anker = Date.parse(feed.anchor);
      if (isNaN(anker)) throw new Error('anker');

      var accountIds = Object.create(null);
      feed.accounts.forEach(function(account) {
        var aid = _toPositiveInt(account && account.id);
        if (aid && account.name) accountIds[aid] = String(account.name);
      });

      // Ehrlichkeitsprüfung im Browser — der Generator garantiert es, aber
      // eine ausgelieferte Datei kann veraltet oder verfälscht sein.
      var minTage = typeof feed.minTageZurueck === 'number' ? feed.minTageZurueck : 10;
      var sauber = feed.posts.filter(function(p) {
        var t = Date.parse(p.time);
        var aid = _toPositiveInt(p.authorId);
        return !isNaN(t) && t <= anker && (anker - t) / 86400000 >= minTage &&
          aid && accountIds[aid] === String(p.author || '');
      });
      if (!sauber.length || sauber.length !== feed.posts.length) throw new Error('unehrlich-oder-verwaist');

      EB_DEMO_ANCHOR_MS = anker;
      _applyDemoFeed(sauber, feed.accounts);
      _ebDemoFeedState = 'ready';
    })
    .catch(function() { _ebDemoFeedState = 'failed'; });  // fest verdrahtete Beiträge bleiben
}

/** Tages-Beiträge an die Stelle der fest verdrahteten Demo-Beiträge setzen. */
function _applyDemoFeed(posts, accounts) {
  _registerDemoAccountProfiles(accounts);
  var eigene = _socialPosts.filter(function(p) { return p && !p._isDemo; });
  var neue = posts.map(function(p) {
    return {
      id: p.id,
      type: p.type,
      author: p.author,
      authorId: p.authorId,
      avatar: (typeof ebAvatar === 'function') ? ebAvatar(p.avatarSeed, p.author) : null,
      title: p.title || null,
      category: p.category || null,
      location: p.location || null,
      date: p.date || null,
      budget: p.budget || null,
      content: p.content,
      image: p.image || null,
      time: p.time,
      likes: p.likes || 0,
      comments: p.comments || 0,
      metAt: p.metAt || null,
      _isDemo: true
    };
  });
  _socialPosts = eigene.concat(neue);
  try { ebSpeichern('eb_social_posts', JSON.stringify(_socialPosts)); } catch (e) {}

  // Inserats-Zeiten hängen am selben Anker — sonst driften Feed und Karten.
  try {
    if (typeof LISTINGS !== 'undefined' && Array.isArray(LISTINGS)) {
      LISTINGS.forEach(function(l) {
        if (!l || l._fromDb) return;
        var id = parseInt(l.id, 10) || 1;
        var daysAgo = 12 + (15 - id) * 4;
        if (daysAgo < 10) daysAgo = 10;
        l.createdAt = new Date(EB_DEMO_ANCHOR_MS - daysAgo * 86400000).toISOString();
      });
    }
  } catch (e) {}

  var seite = document.getElementById('page-aktuelles');
  if (seite && seite.classList.contains('active')) _rerenderCurrentFeed();
}

function renderFeed(tab) {
  var list = document.getElementById('feedList');
  if (!list) return;

  _ebDemoFeedLoad();
  renderSidebarUpcoming();

  if (tab === 'radar') {
    renderFeedRadar(list);
    return;
  }

  // Bot-/Demo-Beiträge automatisch ausblenden, wenn EB_HIDE_DEMO aktiv ist.
  var visiblePosts = _visibleSocialPosts();
  var nearby = _feedNearby && !!_feedUserCoords;

  if (tab === 'events') {
    var eventPosts = visiblePosts.filter(function(p) { return p.type === 'event' || p.type === 'ankuendigung'; });
    if (nearby) eventPosts = _sortByNearby(eventPosts, function(p) { return p.location; });
    list.innerHTML = eventPosts.length ? eventPosts.map(function(p) { return renderSocialPostCard(p); }).join('') :
      '<div style="text-align:center;padding:40px;color:var(--text-light)">Noch keine Events oder Ankündigungen</div>';
    return;
  }

  if (tab === 'gesuche') {
    var searchPosts = visiblePosts.filter(function(p) { return p.type === 'suche-dienstleister' || p.type === 'suche-events'; });
    if (nearby) searchPosts = _sortByNearby(searchPosts, function(p) { return p.location; });
    list.innerHTML = searchPosts.length ? searchPosts.map(function(p) { return renderSocialPostCard(p); }).join('') :
      '<div style="text-align:center;padding:40px;color:var(--text-light)">Noch keine Gesuche – erstelle das erste!</div>';
    return;
  }

  // For foryou/newest/popular: mix social posts + listing cards
  var seen = new Set();
  var listings = getHeroListings().filter(function(l) {
    if (seen.has(l.id)) return false;
    seen.add(l.id);
    return true;
  });

  if (tab === 'newest') {
    // Nach echter Erstellzeit sortieren (nicht id) — dann stimmt die Reihenfolge
    // mit den angezeigten „vor X"-Zeiten überein. Bei aktivem Standort: Nähe zuerst.
    listings = nearby ? _sortByNearby(listings, function(l) { return l.location; })
      : listings.sort(function(a, b) { return (_listingTs(b) - _listingTs(a)) || (b.id - a.id); });
    var newestPosts = nearby ? _sortByNearby(visiblePosts.slice(), function(p) { return p.location; })
      : visiblePosts.slice().sort(function(a, b) { return _listingTs(b) - _listingTs(a); });
    var allItems = newestPosts.slice(0, 2).map(function(p) { return { _social: true, post: p }; })
      .concat(listings.slice(0, 8).map(function(l) { return { _listing: true, listing: l }; }));
    list.innerHTML = allItems.map(function(item) {
      return item._social ? renderSocialPostCard(item.post) : renderListingFeedCard(item.listing);
    }).join('');
  } else if (tab === 'popular') {
    listings = nearby ? _sortByNearby(listings, function(l) { return l.location; })
      : listings.sort(function(a, b) { return (b.rating || 0) - (a.rating || 0); });
    var popPosts = nearby ? _sortByNearby(visiblePosts.slice(), function(p) { return p.location; })
      : visiblePosts.slice().sort(function(a, b) { return (b.likes || 0) - (a.likes || 0); });
    var allItems2 = [];
    var li = 0, pi = 0;
    while (li < Math.min(listings.length, 8) || pi < popPosts.length) {
      if (pi < popPosts.length && (li % 3 === 0)) { allItems2.push({ _social: true, post: popPosts[pi++] }); }
      else if (li < listings.length) { allItems2.push({ _listing: true, listing: listings[li++] }); }
      else if (pi < popPosts.length) { allItems2.push({ _social: true, post: popPosts[pi++] }); }
      else break;
    }
    list.innerHTML = allItems2.map(function(item) {
      return item._social ? renderSocialPostCard(item.post) : renderListingFeedCard(item.listing);
    }).join('');
  } else {
    // foryou — nach gelernten Vorlieben sortiert (Standort hat Vorrang, wenn aktiv).
    // Ohne Signale bleibt es bei zufälliger Mischung, damit Neulinge Vielfalt sehen.
    var hasTaste = _ebTasteTop('cats', 1).length > 0;
    var shuffled = nearby ? _sortByNearby(listings, function(l) { return l.location; })
      : (hasTaste
          ? listings.slice().sort(function(a, b) { return _ebTasteAffinity(b) - _ebTasteAffinity(a); })
          : listings.slice().sort(function() { return Math.random() - 0.5; }));
    var orderedPosts = nearby ? _sortByNearby(visiblePosts, function(p) { return p.location; }) : visiblePosts;
    var mixed = [];
    var sIdx = 0;
    shuffled.slice(0, 8).forEach(function(l, i) {
      if (i > 0 && i % 2 === 0 && sIdx < orderedPosts.length) {
        mixed.push(renderSocialPostCard(orderedPosts[sIdx++]));
      }
      mixed.push(renderListingFeedCard(l));
    });
    while (sIdx < orderedPosts.length) {
      mixed.push(renderSocialPostCard(orderedPosts[sIdx++]));
    }
    list.innerHTML = mixed.join('');
  }
}

function renderSocialPostCard(post) {
  var authorAccountId = _toPositiveInt(post && post.authorId);
  if (!authorAccountId || !String(post.author || '').trim()) return '';
  var isLiked = _likedPosts.has(post.id);
  var typeBadge = '';
  var isSearch = (post.type === 'suche-dienstleister' || post.type === 'suche-events');

  if (post.type === 'suche-dienstleister') {
    typeBadge = '<span class="search-badge"><span class="material-icons-round">person_search</span>Sucht Dienstleister</span>';
  } else if (post.type === 'suche-events') {
    typeBadge = '<span class="search-badge search-badge-offer"><span class="material-icons-round">event_available</span>Sucht Events</span>';
  } else if (post.type === 'event') {
    typeBadge = '<span class="event-badge"><span class="material-icons-round">celebration</span>Event</span>';
  } else if (post.type === 'met') {
    typeBadge = '<span class="met-badge"><span class="material-icons-round">people</span>Verbindung</span>';
  } else if (post.type === 'ankuendigung') {
    typeBadge = '<span class="service-badge"><span class="material-icons-round">campaign</span>Ankündigung</span>';
  } else {
    typeBadge = '<span class="service-badge"><span class="material-icons-round">storefront</span>Service</span>';
  }

  var content = _escHtml(post.content || '');
  content = content.replace(/(#\w+)/g, '<span class="feed-hashtag">$1</span>');

  // Build search inserat details chips
  var searchInfo = '';
  if (isSearch && (post.title || post.category || post.location || post.date || post.budget)) {
    searchInfo = '<div class="feed-search-info">';
    if (post.title) {
      searchInfo += '<div class="feed-search-title"><span class="material-icons-round">' +
        (post.type === 'suche-dienstleister' ? 'person_search' : 'event_available') +
        '</span> ' + _escHtml(post.title) + '</div>';
    }
    var chips = '';
    if (post.category) chips += '<span class="feed-chip"><span class="material-icons-round">category</span>' + _escHtml(post.category) + '</span>';
    if (post.location) chips += '<span class="feed-chip"><span class="material-icons-round">location_on</span>' + _escHtml(post.location) + '</span>';
    if (post.date) chips += '<span class="feed-chip"><span class="material-icons-round">event</span>' + _escHtml(post.dateDisplay || post.date) + '</span>';
    if (post.budget) chips += '<span class="feed-chip"><span class="material-icons-round">payments</span>' + _escHtml(post.budget) + '</span>';
    if (chips) searchInfo += '<div class="feed-chips">' + chips + '</div>';
    searchInfo += '</div>';
  }

  // Legacy event info
  var eventInfo = '';
  if (post.type === 'event' && post.eventName) {
    eventInfo = '<div class="feed-event-info">' +
      '<span class="material-icons-round">celebration</span>' +
      '<span><strong>' + _escHtml(post.eventName) + '</strong>' + (post.eventDate ? ' · ' + _escHtml(post.eventDate) : '') + (post.eventLocation ? ' · ' + _escHtml(post.eventLocation) : '') + '</span>' +
      '</div>';
  }

  var metBanner = '';
  if (post.metAt) {
    metBanner = '<div class="met-at-banner"><span class="material-icons-round">people</span>' +
      'Kennengelernt bei <strong>' + _escHtml(post.metAt.eventName) + '</strong>' +
      (post.metAt.date ? ' am ' + _escHtml(post.metAt.date) : '') +
      '</div>';
  }

  var imgBlock = post.image ? '<div class="feed-post-media" style="background-image:url(&quot;' + _escHtml(post.image) + '&quot;)"><img class="feed-post-image" src="' + _escHtml(post.image) + '" alt="Post Bild" loading="lazy" onload="_fitFeedImg(this)" onerror="this.onerror=null;this.src=window.EB_IMG_FALLBACK" /></div>' : '';

  // Contact button for search posts — only visible to Dienstleister
  var isProvider = isDienstleister();
  var contactBtn = (isSearch && isProvider) ? '<button class="feed-contact-btn" onclick="showToast(\'Kontakt-Anfrage gesendet!\',\'check_circle\')"><span class="material-icons-round">mail_outline</span> Angebot stellen</button>' : '';

  return '<div class="feed-post-card' + (isSearch && !post.image ? ' feed-search-card' : '') + '" data-post-id="' + post.id + '">' +
    '<div class="feed-post-header">' +
      '<button type="button" class="feed-post-avatar-link" onclick="navigateTo(\'provider\',' + authorAccountId + ')" aria-label="Profil von ' + _escHtml(post.author) + ' öffnen">' +
        '<img class="feed-post-avatar" src="' + _escHtml(post.avatar || ebAvatar(post.author || 'user', post.author)) + '" alt="" data-seed="' + authorAccountId + '" data-name="' + _escHtml(post.author) + '" onerror="this.onerror=null;this.src=ebAvatar(this.dataset.seed||\'user\',this.dataset.name||\'user\')" />' +
      '</button>' +
      '<div class="feed-post-author">' +
        '<button type="button" class="feed-post-author-link" onclick="navigateTo(\'provider\',' + authorAccountId + ')" aria-label="Profil von ' + _escHtml(post.author) + ' öffnen"><strong>' + _escHtml(post.author) + '</strong></button>' +
        '<div class="feed-post-meta">' + typeBadge + ' <span title="' + _escHtml(_absTime(post.time)) + '">' + timeAgo(post.time) + '</span></div>' +
      '</div>' +
      '<button class="feed-more-btn" onclick="openPostMenu(event,\'' + post.id + '\',\'' + (post.author || '').replace(/'/g, '') + '\')" aria-label="Optionen"><span class="material-icons-round">more_horiz</span></button>' +
    '</div>' +
    imgBlock +
    searchInfo +
    eventInfo +
    '<div class="feed-post-content">' + content + '</div>' +
    metBanner +
    '<div class="feed-action-bar">' +
      '<div class="feed-actions">' +
        '<button class="feed-action-btn' + (isLiked ? ' liked' : '') + '" onclick="togglePostLike(this,\'' + post.id + '\')">' +
          '<span class="material-icons-round">' + (isLiked ? 'favorite' : 'favorite_border') + '</span> ' +
          '<span class="like-count">' + (post.likes || 0) + '</span>' +
        '</button>' +
        '<button class="feed-action-btn" onclick="openPostComments(\'' + post.id + '\')">' +
          '<span class="material-icons-round">chat_bubble_outline</span> <span class="comment-count" data-cc="' + _escHtml(post.id) + '">' + _postCommentCount(post.id) + '</span>' +
        '</button>' +
      '</div>' +
      contactBtn +
      '<button class="feed-share-btn" onclick="sharePost(\'' + post.id + '\')">' +
        '<span class="material-icons-round">share</span> Teilen' +
      '</button>' +
    '</div>' +
  '</div>';
}

function renderListingFeedCard(l) {
  var avatar = l.providerImg || l.providerAvatar || ebAvatar(l.providerName || 'user', l.providerName);
  var isFav = favorites.has(l.id);
  return '<div class="feed-post-card" data-post-id="listing-' + l.id + '"' + _aiDisclosureAttrs(l) + '>' +
    '<div class="feed-post-header">' +
      '<img class="feed-post-avatar" src="' + _escHtml(avatar) + '" alt="' + _escHtml(l.providerName) + '" onerror="this.onerror=null;this.src=ebAvatar(this.alt||\'user\',this.alt)" onclick="navigateTo(\'provider\',' + (l.providerId || l.id) + ')" />' +
      '<div class="feed-post-author">' +
        '<strong onclick="navigateTo(\'provider\',' + (l.providerId || l.id) + ')">' + _escHtml(l.providerName) + '</strong>' +
        '<div class="feed-post-meta"><span class="service-badge"><span class="material-icons-round">storefront</span>' + _escHtml(l.categoryLabel || 'Service') + '</span> <span title="' + _escHtml(_absTime(l.createdAt)) + '">' + timeAgo(l.createdAt) + '</span></div>' +
      '</div>' +
      '<button class="feed-more-btn" onclick="openPostMenu(event,\'listing-' + l.id + '\',\'' + (l.providerName || '').replace(/'/g, '') + '\')" aria-label="Optionen"><span class="material-icons-round">more_horiz</span></button>' +
    '</div>' +
    '<div class="feed-post-media" style="background-image:url(&quot;' + _escHtml(l.image) + '&quot;)"><img class="feed-post-image" src="' + _escHtml(l.image) + '" alt="' + _escHtml(l.title) + '" loading="lazy" onclick="navigateTo(\'detail\',' + l.id + ')" onload="_fitFeedImg(this)" onerror="this.onerror=null;this.src=window.EB_IMG_FALLBACK" /></div>' +
    '<div class="feed-post-content">' + _escHtml(l.title) + _aiDisclosureLabelsHtml(l, 'ai-disclosure-social') + (l.location ? '<br><small style="color:var(--text-light)"><span class=\"material-icons-round\" style=\"font-size:12px;vertical-align:middle\">location_on</span>' + _escHtml(l.location) + '</small>' : '') + '</div>' +
    '<div class="feed-action-bar">' +
      '<div class="feed-actions">' +
        '<button class="feed-action-btn' + (isFav ? ' liked' : '') + '" onclick="toggleFeedFav(this,' + l.id + ')">' +
          '<span class="material-icons-round">' + (isFav ? 'favorite' : 'favorite_border') + '</span>' +
        '</button>' +
        '<button class="feed-action-btn" onclick="navigateTo(\'detail\',' + l.id + ')">' +
          '<span class="material-icons-round">open_in_new</span> Ansehen' +
        '</button>' +
      '</div>' +
      '<span style="font-size:14px;font-weight:700;color:var(--primary-text)">' + _escHtml(l.priceLabel || '') + '</span>' +
    '</div>' +
  '</div>';
}

function togglePostLike(btn, postId) {
  var post = _socialPosts.find(function(p) { return p.id === postId; });
  if (!post) return;
  if (_likedPosts.has(postId)) {
    _likedPosts.delete(postId);
    post.likes = Math.max(0, (post.likes || 1) - 1);
    btn.classList.remove('liked');
    btn.querySelector('.material-icons-round').textContent = 'favorite_border';
  } else {
    _likedPosts.add(postId);
    post.likes = (post.likes || 0) + 1;
    btn.classList.add('liked');
    btn.querySelector('.material-icons-round').textContent = 'favorite';
  }
  var countEl = btn.querySelector('.like-count');
  if (countEl) countEl.textContent = post.likes;
  _saveSocialData();
}

/* ==================== FEED-KOMMENTARE (Instagram-Style, XSS-sicher) ==================== */
// Kommentare liegen pro Post in localStorage (eb_post_comments). Jeder Text wird
// beim Rendern mit _escHtml escaped — kein rohes HTML, sicher gegen XSS.
var _postComments = (function() {
  try { return JSON.parse(localStorage.getItem('eb_post_comments') || 'null') || _seedDemoComments(); }
  catch (e) { return _seedDemoComments(); }
})();
function _demoCommentSeed() {
  // Feste Demo-Kommentare mit KONSTANTEN Zeiten (kurz nach dem jeweiligen Post),
  // abgeleitet vom festen Demo-Anker – niemals „gerade eben"/„gestern".
  var base = _ebDemoBase();
  return {
    sp1: [
      { id: 'cd1', author: 'DJ Max Beat', avatar: ebAvatar('djmax','DJ Max'), text: 'Klingt super — schicke euch gleich eine Anfrage! 🎧', time: new Date(base - 14 * 86400000 + 6 * 3600000).toISOString() },
      { id: 'cd2', author: 'Lena K.', avatar: ebAvatar('lena','Lena'), text: 'Viel Erfolg bei der Suche, wird bestimmt eine tolle Feier!', time: new Date(base - 14 * 86400000 + 20 * 3600000).toISOString() }
    ],
    sp2: [
      { id: 'cd3', author: 'Julia & Mark', avatar: ebAvatar('julia','Julia'), text: 'Genau sowas suchen wir! Melden uns 😊', time: new Date(base - 18 * 86400000 + 5 * 3600000).toISOString() }
    ]
  };
}
function _seedDemoComments() {
  var seed = _demoCommentSeed();
  try { ebSpeichern('eb_post_comments', JSON.stringify(seed)); } catch (e) {}
  return seed;
}
// Bestehende (evtl. veraltete) Demo-Kommentar-Zeiten auf die festen Anker-Zeiten
// bringen – ohne echte Nutzer-Kommentare zu verändern.
(function _syncDemoCommentTimes() {
  try {
    var tpl = {}, seed = _demoCommentSeed();
    Object.keys(seed).forEach(function(pid) { seed[pid].forEach(function(c) { tpl[c.id] = c.time; }); });
    var changed = false;
    Object.keys(_postComments || {}).forEach(function(pid) {
      (_postComments[pid] || []).forEach(function(c) {
        if (c && tpl[c.id] && c.time !== tpl[c.id]) { c.time = tpl[c.id]; changed = true; }
      });
    });
    if (changed && typeof _savePostComments === 'function') _savePostComments();
  } catch (e) {}
})();
function _savePostComments() {
  try { ebSpeichern('eb_post_comments', JSON.stringify(_postComments)); } catch (e) {}
}
function _postCommentCount(postId) {
  var arr = _postComments[postId];
  return Array.isArray(arr) ? arr.length : 0;
}
function _currentUserAvatar() {
  var n = (currentUser && (currentUser.name || currentUser.first_name)) || 'Ich';
  return (currentUser && (currentUser.photo || currentUser.avatar || currentUser.eb_photo_url)) || ebAvatar(n, n);
}
function _renderCommentItemHtml(c) {
  return '<div class="fc-item">' +
    '<img class="fc-avatar" src="' + _escHtml(c.avatar || ebAvatar(c.author || 'user', c.author)) + '" alt="" onerror="this.onerror=null;this.src=ebAvatar(\'user\',\'user\')" />' +
    '<div class="fc-bubble">' +
      '<span class="fc-author">' + _escHtml(c.author || 'Nutzer') + '</span>' +
      '<span class="fc-text">' + _escHtml(c.text || '') + '</span>' +
      '<span class="fc-time" title="' + _escHtml(_absTime(c.time)) + '">' + timeAgo(c.time) + '</span>' +
    '</div>' +
  '</div>';
}
function _renderCommentsSectionHtml(postId) {
  var list = (_postComments[postId] || []).map(_renderCommentItemHtml).join('') ||
    '<div class="fc-empty">Noch keine Kommentare — schreib den ersten! ✨</div>';
  var inputRow;
  if (isLoggedIn && currentUser) {
    inputRow = '<form class="fc-input-row" onsubmit="return submitPostComment(event,\'' + _escHtml(postId) + '\')">' +
      '<img class="fc-avatar" src="' + _escHtml(_currentUserAvatar()) + '" alt="" onerror="this.onerror=null;this.src=ebAvatar(\'user\',\'user\')" />' +
      '<input type="text" class="fc-input" maxlength="500" placeholder="Kommentar hinzufügen…" aria-label="Kommentar" autocomplete="off" />' +
      '<button type="submit" class="fc-post-btn">Posten</button>' +
    '</form>';
  } else {
    inputRow = '<div class="fc-login-hint"><span class="material-icons-round">lock</span> ' +
      '<button type="button" onclick="openModal(\'loginModal\')">Melde dich an</button>, um zu kommentieren.</div>';
  }
  return '<div class="feed-comments" id="fc-' + _escHtml(postId) + '">' +
    '<div class="fc-list">' + list + '</div>' + inputRow + '</div>';
}

function openPostComments(postId) {
  var card = document.querySelector('.feed-post-card[data-post-id="' + (window.CSS && CSS.escape ? CSS.escape(postId) : postId) + '"]');
  if (!card) return;
  var existing = card.querySelector('.feed-comments');
  if (existing) { existing.remove(); return; } // Toggle zu
  card.insertAdjacentHTML('beforeend', _renderCommentsSectionHtml(postId));
  var sec = card.querySelector('.feed-comments');
  if (sec) {
    var inp = sec.querySelector('.fc-input');
    if (inp) inp.focus();
    sec.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function submitPostComment(ev, postId) {
  if (ev && ev.preventDefault) ev.preventDefault();
  if (!isLoggedIn || !currentUser) { showToast('Bitte melde dich an, um zu kommentieren.', 'lock'); try { openModal('loginModal'); } catch(e){} return false; }
  var card = document.querySelector('.feed-post-card[data-post-id="' + (window.CSS && CSS.escape ? CSS.escape(postId) : postId) + '"]');
  var sec = card && card.querySelector('.feed-comments');
  var inp = sec && sec.querySelector('.fc-input');
  if (!inp) return false;
  var text = (inp.value || '').trim();
  if (!text) return false;
  if (text.length > 500) text = text.slice(0, 500);
  var name = (currentUser.name || currentUser.first_name || 'Ich').toString();
  var comment = {
    id: 'c' + Date.now() + Math.random().toString(36).slice(2, 6),
    author: name,
    avatar: _currentUserAvatar(),
    text: text,               // roh gespeichert, beim Rendern escaped
    time: new Date().toISOString()
  };
  if (!Array.isArray(_postComments[postId])) _postComments[postId] = [];
  _postComments[postId].push(comment);
  _savePostComments();
  // Neue Kommentar-Karte anhängen (escaped) + Eingabe leeren
  var listEl = sec.querySelector('.fc-list');
  if (listEl) {
    var emptyEl = listEl.querySelector('.fc-empty');
    if (emptyEl) emptyEl.remove();
    listEl.insertAdjacentHTML('beforeend', _renderCommentItemHtml(comment));
  }
  inp.value = '';
  // Zähler live aktualisieren (alle Vorkommen dieses Posts)
  document.querySelectorAll('.comment-count[data-cc="' + (window.CSS && CSS.escape ? CSS.escape(postId) : postId) + '"]').forEach(function(el) {
    el.textContent = _postCommentCount(postId);
  });
  var post = _socialPosts.find(function(p) { return p.id === postId; });
  if (post) { post.comments = _postCommentCount(postId); _saveSocialData(); }
  return false;
}

function sharePost(postId) {
  if (navigator.share) {
    navigator.share({ title: 'Eventbörse Post', url: window.location.href })
      .catch(function() {});
  } else {
    try { navigator.clipboard.writeText(window.location.href); } catch(e) {}
    showToast('Link kopiert!', 'link');
  }
}

function switchFeedTab(btn) {
  document.querySelectorAll('.feed-tab').forEach(function(t) { t.classList.remove('active'); });
  btn.classList.add('active');
  renderFeed(btn.dataset.feed);
}

function renderSidebarUpcoming() {
  var el = document.getElementById('sidebarUpcoming');
  if (!el) return;
  var upcoming = [
    { emoji: '🎸', name: 'Rock Festival Berlin', date: '12. Sep 2026' },
    { emoji: '💒', name: 'Hochzeitsmesse Köln', date: '20. Sep 2026' },
    { emoji: '🎉', name: 'Oktoberfest Opening', date: '19. Okt 2026' },
  ];
  el.innerHTML = upcoming.map(function(u) {
    return '<div class="sidebar-event-item">' +
      '<div class="sidebar-event-dot">' + u.emoji + '</div>' +
      '<div><strong>' + _escHtml(u.name) + '</strong><span>' + _escHtml(u.date) + '</span></div>' +
    '</div>';
  }).join('');
}

function openCreatePostModal() {
  if (!isLoggedIn) { openModal('loginModal'); return; }
  var html = `<div class="modal-overlay show" id="createPostModal" onclick="closeModalOnOverlay(event)" style="z-index:2000">
    <div class="modal modal-lg" onclick="event.stopPropagation()">
      <button class="modal-close" aria-label="Schließen" onclick="document.getElementById('createPostModal').remove()"><span class="material-icons-round">close</span></button>
      <div class="modal-header">
        <span class="material-icons-round modal-icon">campaign</span>
        <h2>Inserat erstellen</h2>
        <p>Finde Dienstleister, Events oder teile dein Erlebnis</p>
      </div>
      <form class="modal-form" onsubmit="_createSocialPost(event)">

        <!-- Typ-Auswahl als Kacheln -->
        <div class="post-type-grid" id="postTypeGrid">
          <button type="button" class="post-type-tile active" data-type="suche-dienstleister" onclick="_selectPostType(this)">
            <span class="material-icons-round">person_search</span>
            <strong>Dienstleister gesucht</strong>
            <small>Du planst ein Event</small>
          </button>
          <button type="button" class="post-type-tile" data-type="suche-events" onclick="_selectPostType(this)">
            <span class="material-icons-round">event_available</span>
            <strong>Events gesucht</strong>
            <small>Du bietest einen Service</small>
          </button>
          <button type="button" class="post-type-tile" data-type="ankuendigung" onclick="_selectPostType(this)">
            <span class="material-icons-round">campaign</span>
            <strong>Ankündigung</strong>
            <small>News, Angebote, Updates</small>
          </button>
          <button type="button" class="post-type-tile" data-type="met" onclick="_selectPostType(this)">
            <span class="material-icons-round">people</span>
            <strong>Verbindung</strong>
            <small>Kennengelernt bei Event</small>
          </button>
        </div>
        <input type="hidden" id="postType" value="suche-dienstleister" />

        <!-- Suchinserat-Felder (Dienstleister / Events gesucht) -->
        <div id="postSearchFields">
          <div class="form-row">
            <div class="form-group form-half">
              <label>Titel</label>
              <input type="text" id="postTitle" placeholder="z.B. DJ für Hochzeit gesucht" />
            </div>
            <div class="form-group form-half">
              <label>Kategorie</label>
              <select id="postCategory">
                <option value="">Auswählen…</option>
                <option value="DJ">DJ</option>
                <option value="Fotograf">Fotograf</option>
                <option value="Videograf">Videograf</option>
                <option value="Catering">Catering</option>
                <option value="Floristik">Floristik</option>
                <option value="Location">Location</option>
                <option value="Band / Musik">Band / Musik</option>
                <option value="Moderation">Moderation</option>
                <option value="Dekoration">Dekoration</option>
                <option value="Planung">Planung / Koordination</option>
                <option value="Sonstiges">Sonstiges</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group form-half">
              <label><span class="material-icons-round" style="font-size:16px;vertical-align:-3px;margin-right:4px">location_on</span>Ort</label>
              <div class="city-autocomplete-wrap">
                <input type="text" id="postLocation" placeholder="Stadt eingeben…" autocomplete="off" />
                <ul class="city-autocomplete-list" id="postCityList"></ul>
              </div>
            </div>
            <div class="form-group form-half">
              <label><span class="material-icons-round" style="font-size:16px;vertical-align:-3px;margin-right:4px">event</span>Datum</label>
              <div class="post-cal-wrap" id="postCalWrap">
                <div class="post-cal-display" id="postDateDisplay" onclick="_togglePostCalendar(event)">
                  <span class="material-icons-round" style="font-size:18px">calendar_today</span>
                  <span id="postDateText">Datum wählen</span>
                </div>
                <input type="hidden" id="postDate" value="" />
                <div class="post-cal-dropdown" id="postCalDropdown">
                  <div class="cal-header">
                    <button type="button" class="cal-nav" aria-label="Voriger Monat" onclick="_postCalNav(event,-1)"><span class="material-icons-round">chevron_left</span></button>
                    <span class="cal-title" id="postCalTitle"></span>
                    <button type="button" class="cal-nav" aria-label="Nächster Monat" onclick="_postCalNav(event,1)"><span class="material-icons-round">chevron_right</span></button>
                  </div>
                  <div class="cal-weekdays"><span>Mo</span><span>Di</span><span>Mi</span><span>Do</span><span>Fr</span><span>Sa</span><span>So</span></div>
                  <div class="cal-grid" id="postCalGrid"></div>
                  <div class="cal-footer">
                    <button type="button" class="cal-footer-btn" onclick="_postCalToday(event)">Heute</button>
                    <button type="button" class="cal-footer-btn" onclick="_postCalClear(event)">Löschen</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="form-group">
            <label>Budget <small style="color:var(--text-light)">(optional)</small></label>
            <div class="post-budget-wrap">
              <div class="post-budget-input-wrap">
                <input type="number" id="postBudget" placeholder="0" min="0" step="1" />
                <span class="post-budget-currency">€</span>
              </div>
              <label class="post-vb-label">
                <input type="checkbox" id="postBudgetVB" onchange="document.getElementById('postBudget').disabled=this.checked" />
                <span>VB (Verhandlungsbasis)</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Met-Felder -->
        <div id="postMetFields" style="display:none">
          <div class="form-group">
            <label>Event, bei dem ihr euch kennengelernt habt</label>
            <input type="text" id="postMetEvent" placeholder="z.B. Sommerfest 2026" />
          </div>
        </div>

        <!-- Beschreibung -->
        <div class="form-group">
          <label>Beschreibung</label>
          <textarea id="postContent" rows="3" placeholder="Beschreibe genau, was du suchst oder teilen möchtest… #Hashtags willkommen!" required></textarea>
        </div>

        <!-- Bild Upload -->
        <div class="form-group">
          <label>Bilder <small style="color:var(--text-light)">(optional)</small></label>
          <div class="post-img-upload" id="postImgUpload" onclick="document.getElementById('postImgInput').click()">
            <span class="material-icons-round">add_photo_alternate</span>
            <span>Bild hinzufügen oder hierher ziehen</span>
          </div>
          <input type="file" id="postImgInput" accept="image/*" style="display:none" onchange="_handlePostImage(this)" />
          <div class="post-img-preview" id="postImgPreview" style="display:none">
            <img id="postImgThumb" />
            <button type="button" class="post-img-remove" aria-label="Bild entfernen" onclick="_removePostImage()"><span class="material-icons-round">close</span></button>
          </div>
        </div>

        <button type="submit" class="btn-primary btn-block"><span class="material-icons-round">send</span> Veröffentlichen</button>
      </form>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);

  // Drag & drop for image
  var dropZone = document.getElementById('postImgUpload');
  if (dropZone) {
    dropZone.addEventListener('dragover', function(e) { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', function() { dropZone.classList.remove('dragover'); });
    dropZone.addEventListener('drop', function(e) {
      e.preventDefault(); dropZone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        document.getElementById('postImgInput').files = e.dataTransfer.files;
        _handlePostImage(document.getElementById('postImgInput'));
      }
    });
  }

  // Init city autocomplete for location field
  _initPostCityAutocomplete();

  // Init calendar state
  _postCalMonth = new Date().getMonth();
  _postCalYear = new Date().getFullYear();
  _postCalSelected = null;
}

/* ---- Post Location City Autocomplete ---- */
function _initPostCityAutocomplete() {
  var input = document.getElementById('postLocation');
  var list = document.getElementById('postCityList');
  if (!input || !list) return;
  var activeIdx = -1;

  input.addEventListener('input', function() {
    var q = this.value.trim().toLowerCase();
    if (q.length < 1) { list.classList.remove('open'); list.innerHTML = ''; return; }
    var matches = GERMAN_CITIES.filter(function(c) { return c.name.toLowerCase().startsWith(q); }).slice(0, 8);
    if (matches.length === 0) { list.classList.remove('open'); list.innerHTML = ''; return; }
    activeIdx = -1;
    list.innerHTML = matches.map(function(c) {
      return '<li data-city="' + c.name + '" data-state="' + c.state + '">' + c.name + '<span class="city-state">' + c.state + '</span></li>';
    }).join('');
    list.classList.add('open');
  });

  list.addEventListener('click', function(e) {
    var li = e.target.closest('li');
    if (!li) return;
    input.value = li.dataset.city;
    list.classList.remove('open');
  });

  input.addEventListener('keydown', function(e) {
    var items = list.querySelectorAll('li');
    if (!items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = Math.min(activeIdx + 1, items.length - 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx = Math.max(activeIdx - 1, 0); }
    else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); items[activeIdx].click(); return; }
    else return;
    items.forEach(function(it, i) { it.classList.toggle('active', i === activeIdx); });
  });
}

/* ---- Post Calendar (independent from hero calendar) ---- */
var _postCalMonth = new Date().getMonth();
var _postCalYear = new Date().getFullYear();
var _postCalSelected = null;

function _togglePostCalendar(e) {
  e.stopPropagation();
  var dd = document.getElementById('postCalDropdown');
  if (!dd) return;
  if (dd.classList.contains('show')) {
    dd.classList.remove('show');
  } else {
    _renderPostCalendar();
    dd.classList.add('show');
  }
}

function _renderPostCalendar() {
  var title = document.getElementById('postCalTitle');
  var grid = document.getElementById('postCalGrid');
  if (!title || !grid) return;
  title.textContent = CAL_MONTHS_DE[_postCalMonth] + ' ' + _postCalYear;

  var firstDay = new Date(_postCalYear, _postCalMonth, 1).getDay();
  var startIdx = firstDay === 0 ? 6 : firstDay - 1;
  var daysInMonth = new Date(_postCalYear, _postCalMonth + 1, 0).getDate();
  var daysInPrev = new Date(_postCalYear, _postCalMonth, 0).getDate();
  var today = new Date(); today.setHours(0,0,0,0);

  var html = '';
  for (var i = startIdx - 1; i >= 0; i--) {
    html += '<button type="button" class="cal-day other-month disabled">' + (daysInPrev - i) + '</button>';
  }
  for (var d = 1; d <= daysInMonth; d++) {
    var date = new Date(_postCalYear, _postCalMonth, d); date.setHours(0,0,0,0);
    var isPast = date < today;
    var isToday = date.getTime() === today.getTime();
    var isSelected = _postCalSelected && date.getTime() === _postCalSelected.getTime();
    var cls = 'cal-day';
    if (isPast) cls += ' disabled';
    if (isToday) cls += ' today';
    if (isSelected) cls += ' selected';
    html += '<button type="button" class="' + cls + '"' + (isPast ? '' : ' onclick="_postCalSelect(event,' + d + ')"') + '>' + d + '</button>';
  }
  var totalCells = startIdx + daysInMonth;
  var remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (var n = 1; n <= remaining; n++) {
    html += '<button type="button" class="cal-day other-month disabled">' + n + '</button>';
  }
  grid.innerHTML = html;
}

function _postCalNav(e, dir) {
  e.stopPropagation();
  _postCalMonth += dir;
  if (_postCalMonth > 11) { _postCalMonth = 0; _postCalYear++; }
  if (_postCalMonth < 0) { _postCalMonth = 11; _postCalYear--; }
  _renderPostCalendar();
}

function _postCalSelect(e, day) {
  e.stopPropagation();
  _postCalSelected = new Date(_postCalYear, _postCalMonth, day); _postCalSelected.setHours(0,0,0,0);
  var dd = _postCalSelected.getDate();
  var mm = _postCalSelected.getMonth() + 1;
  var displayText = dd + '. ' + CAL_MONTHS_DE[_postCalSelected.getMonth()] + ' ' + _postCalSelected.getFullYear();
  var dateText = document.getElementById('postDateText');
  var dateInput = document.getElementById('postDate');
  var displayEl = document.getElementById('postDateDisplay');
  if (dateText) dateText.textContent = displayText;
  if (dateInput) dateInput.value = _postCalSelected.getFullYear() + '-' + String(mm).padStart(2,'0') + '-' + String(dd).padStart(2,'0');
  if (displayEl) displayEl.classList.add('has-value');
  var dropdown = document.getElementById('postCalDropdown');
  if (dropdown) dropdown.classList.remove('show');
  _renderPostCalendar();
}

function _postCalToday(e) {
  e.stopPropagation();
  var now = new Date();
  _postCalMonth = now.getMonth();
  _postCalYear = now.getFullYear();
  _postCalSelect(e, now.getDate());
}

function _postCalClear(e) {
  e.stopPropagation();
  _postCalSelected = null;
  var dateText = document.getElementById('postDateText');
  var dateInput = document.getElementById('postDate');
  var displayEl = document.getElementById('postDateDisplay');
  if (dateText) dateText.textContent = 'Datum wählen';
  if (dateInput) dateInput.value = '';
  if (displayEl) displayEl.classList.remove('has-value');
  var dropdown = document.getElementById('postCalDropdown');
  if (dropdown) dropdown.classList.remove('show');
}

// Close post calendar on outside click
document.addEventListener('click', function(e) {
  if (!e.target.closest('.post-cal-wrap')) {
    var dd = document.getElementById('postCalDropdown');
    if (dd) dd.classList.remove('show');
  }
  if (!e.target.closest('.city-autocomplete-wrap')) {
    var pl = document.getElementById('postCityList');
    if (pl) pl.classList.remove('open');
  }
});

function _selectPostType(btn) {
  document.querySelectorAll('.post-type-tile').forEach(function(t) { t.classList.remove('active'); });
  btn.classList.add('active');
  var type = btn.dataset.type;
  document.getElementById('postType').value = type;

  var searchFields = document.getElementById('postSearchFields');
  var metFields = document.getElementById('postMetFields');
  var titleInput = document.getElementById('postTitle');
  var contentArea = document.getElementById('postContent');

  // Show/hide fields based on type
  if (type === 'suche-dienstleister') {
    searchFields.style.display = '';
    metFields.style.display = 'none';
    if (titleInput) titleInput.placeholder = 'z.B. DJ für Hochzeit gesucht';
    if (contentArea) contentArea.placeholder = 'Beschreibe, was du genau suchst… #Hashtags willkommen!';
  } else if (type === 'suche-events') {
    searchFields.style.display = '';
    metFields.style.display = 'none';
    if (titleInput) titleInput.placeholder = 'z.B. Erfahrener Fotograf sucht Aufträge';
    if (contentArea) contentArea.placeholder = 'Beschreibe dein Angebot und was für Events du suchst…';
  } else if (type === 'ankuendigung') {
    searchFields.style.display = 'none';
    metFields.style.display = 'none';
    if (contentArea) contentArea.placeholder = 'Teile deine Neuigkeiten mit der Community… #Hashtags willkommen!';
  } else if (type === 'met') {
    searchFields.style.display = 'none';
    metFields.style.display = '';
    if (contentArea) contentArea.placeholder = 'Erzähle von deiner Erfahrung…';
  }
}

var _postImageData = null;

function _handlePostImage(input) {
  if (!input.files || !input.files[0]) return;
  var raw = input.files[0];
  ebPrepareImageFile(raw).then(function(file) {
    if (!file) return;   // Grund wurde bereits als Toast gezeigt
    var reader = new FileReader();
    reader.onload = function(e) {
      _postImageData = e.target.result;
      var preview = document.getElementById('postImgPreview');
      var upload = document.getElementById('postImgUpload');
      document.getElementById('postImgThumb').src = _postImageData;
      if (preview) preview.style.display = '';
      if (upload) upload.style.display = 'none';
    };
    reader.readAsDataURL(file);
  });
}

function _removePostImage() {
  _postImageData = null;
  var preview = document.getElementById('postImgPreview');
  var upload = document.getElementById('postImgUpload');
  if (preview) preview.style.display = 'none';
  if (upload) upload.style.display = '';
  var input = document.getElementById('postImgInput');
  if (input) input.value = '';
}

function _createSocialPost(event) {
  event.preventDefault();
  var authorAccountId = _toPositiveInt(currentUser && currentUser.id);
  if (!authorAccountId) {
    showToast('Der Beitrag braucht einen gültigen Account. Bitte melde dich erneut an.', 'account_circle');
    return;
  }
  var type = document.getElementById('postType').value;
  var content = document.getElementById('postContent').value.trim();
  if (!content) { showToast('Bitte Beschreibung eingeben', 'warning'); return; }

  var post = {
    id: 'sp_' + Date.now(),
    type: type,
    author: currentUser ? (currentUser.name || 'Du') : 'Du',
    authorId: authorAccountId,
    avatar: currentUser ? (currentUser.photoUrl || ebAvatar(currentUser.name || 'user', currentUser.name)) : ebAvatar('newuser', 'Neu'),
    content: content,
    image: _postImageData || null,
    time: new Date().toISOString(),
    likes: 0,
    comments: 0,
    metAt: null,
    title: null,
    category: null,
    location: null,
    date: null,
    budget: null
  };

  if (type === 'suche-dienstleister' || type === 'suche-events') {
    var ti = document.getElementById('postTitle');
    var ca = document.getElementById('postCategory');
    var lo = document.getElementById('postLocation');
    var da = document.getElementById('postDate');
    var bu = document.getElementById('postBudget');
    var vb = document.getElementById('postBudgetVB');
    post.title = ti ? ti.value.trim() : '';
    post.category = ca ? ca.value : '';
    post.location = lo ? lo.value.trim() : '';
    // Date: stored as YYYY-MM-DD from hidden input, display as readable text
    post.date = da && da.value ? da.value : '';
    if (post.date && _postCalSelected) {
      post.dateDisplay = _postCalSelected.getDate() + '. ' + CAL_MONTHS_DE[_postCalSelected.getMonth()] + ' ' + _postCalSelected.getFullYear();
    }
    // Budget: number + VB flag
    if (vb && vb.checked) {
      post.budget = 'VB';
    } else if (bu && bu.value) {
      post.budget = bu.value + '€';
    } else {
      post.budget = '';
    }
  } else if (type === 'met') {
    var me = document.getElementById('postMetEvent');
    post.metAt = me && me.value.trim() ? { eventName: me.value.trim(), date: '' } : null;
  }

  _postImageData = null;
  _socialPosts.unshift(post);
  _saveSocialData();
  document.getElementById('createPostModal') && document.getElementById('createPostModal').remove();

  // Switch to the matching tab so the new post is visible at the top
  var targetTab = (type === 'suche-dienstleister' || type === 'suche-events') ? 'gesuche' : 'foryou';
  document.querySelectorAll('.feed-tab').forEach(function(t) {
    t.classList.toggle('active', t.dataset.feed === targetTab);
  });
  renderFeed(targetTab);

  // Scroll feed list to top so the new post is immediately visible
  var feedList = document.getElementById('feedList');
  if (feedList) feedList.scrollIntoView({ behavior: 'smooth', block: 'start' });

  showToast('Inserat veröffentlicht!', 'check_circle');
}


// =========================================================
// =================== CONTACT FORM ========================
// =========================================================

function sendContactMessage(event) {
  event.preventDefault();
  var name = document.getElementById('contactName').value.trim();
  var email = document.getElementById('contactEmail').value.trim();
  var subject = document.getElementById('contactSubject').value;
  var message = document.getElementById('contactMessage').value.trim();

  if (!name || !email || !message) return;

  // Simple email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast('Bitte eine gültige E-Mail-Adresse eingeben.', 'error');
    return;
  }

  // Build mailto link (since we have no backend, we use mailto as fallback)
  var mailtoSubject = encodeURIComponent('[Eventbörse Support] ' + subject + ' – ' + name);
  var mailtoBody = encodeURIComponent('Von: ' + name + ' (' + email + ')\nBetreff: ' + subject + '\n\n' + message);
  var mailtoLink = 'mailto:Kontakt@Eventb%C3%B6rse.de?subject=' + mailtoSubject + '&body=' + mailtoBody;

  // Show success and open mail client
  var successEl = document.getElementById('contactSuccess');
  if (successEl) {
    successEl.style.display = '';
    setTimeout(function() { successEl.style.display = 'none'; }, 6000);
  }

  // Try to open mail client
  window.location.href = mailtoLink;

  // Reset form
  event.target.reset();
  showToast('Danke! Deine Nachricht wurde vorbereitet.', 'email');
}


// =========================================================
// =================== COUNT-UP ANIMATION ==================
// =========================================================
function _animateCountUp() {
  var els = document.querySelectorAll('.browse-hero-stats [data-count]');
  els.forEach(function(el) {
    if (el._counted) return;
    el._counted = true;
    var target = parseFloat(el.dataset.count);
    var suffix = el.dataset.suffix || '';
    var dec = parseInt(el.dataset.decimal) || 0;
    var duration = 1200;
    var start = performance.now();
    function tick(now) {
      var p = Math.min((now - start) / duration, 1);
      // ease-out cubic
      var ease = 1 - Math.pow(1 - p, 3);
      var val = (target * ease);
      el.textContent = (dec ? val.toFixed(dec) : Math.round(val)) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

// =========================================================
// =================== ANIMATIONS (IntersectionObserver) ===
// =========================================================

function _initAnimatedEntries() {
  if (!window.IntersectionObserver) return;
  var entries = document.querySelectorAll('.animated-entry:not(.visible)');
  var observer = new IntersectionObserver(function(records) {
    records.forEach(function(r) {
      if (r.isIntersecting) {
        r.target.classList.add('visible');
        observer.unobserve(r.target);
      }
    });
  }, { threshold: 0.12 });
  entries.forEach(function(el) { observer.observe(el); });
}

// Init on each page navigate
(function() {
  var _origNav = window.navigateTo;
  // We hook into navigateTo to init animations after every navigation
  // (Already added _initAnimatedEntries calls in board/feed)
})();

// =========================================================
// ========= EVENT CONNECTIONS (Profile) ===================
// =========================================================

function openAddEventConnectionModal() {
  if (!isLoggedIn) { openModal('loginModal'); return; }
  var html = `<div class="modal-overlay show" id="addEventConnModal" onclick="closeModalOnOverlay(event)" style="z-index:2000">
    <div class="modal modal-sm" onclick="event.stopPropagation()">
      <button class="modal-close" aria-label="Schließen" onclick="document.getElementById('addEventConnModal').remove()"><span class="material-icons-round">close</span></button>
      <div class="modal-header">
        <span class="material-icons-round modal-icon">celebration</span>
        <h2>Event hinzufügen</h2>
        <p>Trage ein Event ein, das du erlebt hast – und wen du dabei kennengelernt hast</p>
      </div>
      <form class="modal-form" onsubmit="_saveEventConnection(event)">
        <div class="form-group">
          <label>Event-Name</label>
          <input type="text" id="connEventName" placeholder="z.B. Sommerhochzeit 2026" required autofocus />
        </div>
        <div class="form-group">
          <label>Datum (optional)</label>
          <input type="text" id="connEventDate" placeholder="z.B. 15. August 2026" />
        </div>
        <div class="form-group">
          <label>Ort (optional)</label>
          <input type="text" id="connEventLocation" placeholder="z.B. Hamburg" />
        </div>
        <div class="form-group">
          <label>Kennengelernt (optional)</label>
          <input type="text" id="connMetPerson" placeholder="z.B. DJ Max, Fotograf Peter, ..." />
        </div>
        <button type="submit" class="btn-primary btn-block">
          <span class="material-icons-round">add</span> Hinzufügen
        </button>
      </form>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

function _saveEventConnection(event) {
  event.preventDefault();
  if (!currentUser) return;
  var name = document.getElementById('connEventName').value.trim();
  var date = document.getElementById('connEventDate').value.trim();
  var location = document.getElementById('connEventLocation').value.trim();
  var metPerson = document.getElementById('connMetPerson').value.trim();
  if (!name) return;

  if (!currentUser.eventConnections) currentUser.eventConnections = [];
  currentUser.eventConnections.unshift({
    id: 'ec_' + Date.now(),
    eventName: name,
    date: date,
    location: location,
    metPerson: metPerson,
    addedAt: new Date().toISOString()
  });

  // Persist
  var stored = JSON.parse(localStorage.getItem('eb_user') || 'null') || {};
  stored.eventConnections = currentUser.eventConnections;
  localStorage.setItem('eb_user', JSON.stringify(stored));

  document.getElementById('addEventConnModal') && document.getElementById('addEventConnModal').remove();
  _renderProfileEventConnections();
  showToast('Event "' + name + '" wurde hinzugefügt!', 'check_circle');
}

function _deleteEventConnection(ecId) {
  if (!currentUser || !currentUser.eventConnections) return;
  currentUser.eventConnections = currentUser.eventConnections.filter(function(ev) { return ev.id !== ecId; });
  var stored = JSON.parse(localStorage.getItem('eb_user') || 'null') || {};
  stored.eventConnections = currentUser.eventConnections;
  localStorage.setItem('eb_user', JSON.stringify(stored));
  _renderProfileEventConnections();
}

// ══════════════════════════════════════════════════════════════
//  NAV AI SEARCH OVERLAY & CATEGORY DROPDOWN (v2)
// ══════════════════════════════════════════════════════════════

var _navAiTypingTimer = null;
var _navSelectedCategory = '';
var _navAiCatSelection = new Set();

// ── Helpers ──
function _getNavAiCategories() {
  return (typeof AI_CATEGORIES !== 'undefined') ? AI_CATEGORIES : [
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
    { key: 'wellness', label: 'Wellness & Spa', emoji: '💆' },
  ];
}

var _NAV_AI_POPULAR = [
  { text: 'DJ für Hochzeit in Berlin', cat: 'DJ & Musik' },
  { text: 'Catering für 80 Personen', cat: 'Catering' },
  { text: 'Fotograf für Firmenfeier', cat: 'Fotografie' },
  { text: 'Location für Geburtstag', cat: 'Location' },
  { text: 'Florist für Hochzeit', cat: 'Floristik' },
  { text: 'Licht & Technik für Party', cat: 'Technik' },
];

// ── Mobile nav tap: go to browse and focus the right filter ──
function _navMobileTap(type) {
  var onBrowse = !!(document.getElementById('page-browse') && document.getElementById('page-browse').classList.contains('active'));

  function _focusSearchInput() {
    var inp = document.getElementById('browseSearch');
    if (!inp) return;
    inp.focus();
    inp.select();
    // Brief flash on the search row to signal focus
    var row = inp.closest('.browse-search-row') || inp.parentElement;
    if (row) {
      row.classList.add('nav-tap-flash');
      setTimeout(function() { row.classList.remove('nav-tap-flash'); }, 650);
    }
    var toolbar = document.querySelector('.browse-toolbar');
    if (toolbar) {
      var top = toolbar.getBoundingClientRect().top + window.pageYOffset - 8;
      window.scrollTo({ top: top, behavior: 'smooth' });
    }
  }

  function _focusLocationInput() {
    var inp = document.getElementById('browseLocation');
    if (!inp) return;
    inp.focus();
    inp.select();
    var row = inp.closest('.browse-search-row') || inp.parentElement;
    if (row) {
      row.classList.add('nav-tap-flash');
      setTimeout(function() { row.classList.remove('nav-tap-flash'); }, 650);
    }
    var toolbar = document.querySelector('.browse-toolbar');
    if (toolbar) {
      var top = toolbar.getBoundingClientRect().top + window.pageYOffset - 8;
      window.scrollTo({ top: top, behavior: 'smooth' });
    }
  }

  if (type === 'search') {
    if (!onBrowse) { navigateTo('browse'); setTimeout(_focusSearchInput, 360); }
    else _focusSearchInput();
  } else if (type === 'category') {
    if (!onBrowse) { navigateTo('browse'); setTimeout(openMobileCatPicker, 360); }
    else openMobileCatPicker();
  } else if (type === 'location') {
    if (!onBrowse) { navigateTo('browse'); setTimeout(_focusLocationInput, 360); }
    else _focusLocationInput();
  }
}

// ── Open / Close ──
function openNavAiSearch() {
  var overlay = document.getElementById('navAiOverlay');
  if (!overlay) return;
  overlay.classList.add('show');
  var inp = document.getElementById('navAiInput');
  // Pre-fill input with current nav label (if user had searched before)
  var typingEl = document.getElementById('navAiTyping');
  var navBtn = document.querySelector('.nav-search-ai');
  var prefill = (navBtn && navBtn.classList.contains('has-query') && typingEl) ? typingEl.textContent : '';
  if (inp) { inp.value = prefill; }
  _navAiCatSelection.clear();
  // Sync quick-access Wann?/Wo? labels from current segments
  var wannVal = document.getElementById('navDateValue');
  var quickWannVal = document.getElementById('navAiQuickWannValue');
  var quickWann = document.getElementById('navAiQuickWann');
  if (wannVal && quickWannVal) {
    var hasDate = wannVal.textContent && wannVal.textContent !== 'Zeitraum';
    quickWannVal.textContent = hasDate ? wannVal.textContent : 'Zeitraum';
    if (quickWann) quickWann.classList.toggle('has-value', !!hasDate);
  }
  var woVal = document.getElementById('navWoValue');
  var quickWoVal = document.getElementById('navAiQuickWoValue');
  var quickWo = document.getElementById('navAiQuickWo');
  if (woVal && quickWoVal) {
    var hasWo = woVal.textContent && woVal.textContent !== 'Region' && woVal.textContent !== 'Wo?';
    quickWoVal.textContent = hasWo ? woVal.textContent : 'Region';
    if (quickWo) quickWo.classList.toggle('has-value', !!hasWo);
  }
  _renderNavAiBody(prefill);
  setTimeout(function() { if (inp) { inp.focus(); inp.select(); } }, 350);
}

function closeNavAiSearch() {
  var overlay = document.getElementById('navAiOverlay');
  if (overlay) overlay.classList.remove('show');
}

// ── Render body based on input ──
function _renderNavAiBody(query) {
  var body = document.getElementById('navAiBody');
  if (!body) return;
  var q = query.toLowerCase().trim();
  var html = '';

  if (!q) {
    // Show categories + popular searches
    var cats = _getNavAiCategories();
    html += '<div class="nav-ai-section-title"><span class="material-icons-round">category</span> Kategorien</div>';
    html += '<div class="nav-ai-cat-grid">';
    cats.forEach(function(c) {
      var sel = _navAiCatSelection.has(c.key) ? ' selected' : '';
      html += '<button class="nav-ai-cat-card' + sel + '" onclick="toggleNavAiCat(\'' + c.key + '\')">' +
        '<span class="nav-ai-cat-emoji">' + c.emoji + '</span>' + c.label + '</button>';
    });
    html += '</div>';

    html += '<div class="nav-ai-section-title"><span class="material-icons-round">trending_up</span> Beliebte Suchen</div>';
    html += '<div class="nav-ai-popular-list">';
    _NAV_AI_POPULAR.forEach(function(p) {
      html += '<button class="nav-ai-popular-item" onclick="navAiFillAndSearch(\'' + p.text.replace(/'/g, "\\'") + '\')">' +
        '<span class="material-icons-round">search</span>' +
        '<span class="nav-ai-pop-text">' + p.text + '</span>' +
        '<span class="nav-ai-pop-cat">' + p.cat + '</span>' +
        '</button>';
    });
    html += '</div>';
  } else {
    // Live search results from LISTINGS — use smart matcher (synonyms + fuzzy) if available
    var listings = (typeof getHeroListings === 'function') ? getHeroListings() : (typeof LISTINGS !== 'undefined' ? LISTINGS : []);
    var smart = (typeof _ebSmartTextMatch === 'function');
    var results = listings.filter(function(l) {
      if (smart) return _ebSmartTextMatch(q, l);
      var haystack = (l.title + ' ' + l.categoryLabel + ' ' + l.tags.join(' ') + ' ' + l.providerName + ' ' + l.location).toLowerCase();
      return haystack.includes(q);
    }).slice(0, 6);

    // Fallback: when no strict match, relax to "any token matches" (so single-word typos still surface something)
    var relaxedNotice = false;
    if (results.length === 0 && smart && typeof _ebTokenizeQuery === 'function') {
      var toks = _ebTokenizeQuery(q);
      if (toks.length) {
        var syn = (typeof _EB_SYN_INDEX !== 'undefined') ? _EB_SYN_INDEX : null;
        results = listings.filter(function(l) {
          var hay = (l.title + ' ' + l.categoryLabel + ' ' + (l.category||'') + ' ' + l.tags.join(' ') + ' ' + l.providerName + ' ' + l.location + ' ' + (l.region||'')).toLowerCase();
          return toks.some(function(t) {
            if (hay.includes(t)) return true;
            if (syn && syn.get(t)) {
              for (var v of syn.get(t)) if (hay.includes(v)) return true;
            }
            return t.length >= 5 && hay.includes(t.slice(0, Math.max(4, t.length-2)));
          });
        }).slice(0, 6);
        if (results.length) relaxedNotice = true;
      }
    }

    // Also show matching categories
    var cats = _getNavAiCategories();
    var matchedCats = cats.filter(function(c) { return c.label.toLowerCase().includes(q) || c.key.includes(q); });
    if (matchedCats.length > 0) {
      html += '<div class="nav-ai-section-title"><span class="material-icons-round">category</span> Kategorien</div>';
      html += '<div class="nav-ai-cat-grid">';
      matchedCats.forEach(function(c) {
        var sel = _navAiCatSelection.has(c.key) ? ' selected' : '';
        html += '<button class="nav-ai-cat-card' + sel + '" onclick="toggleNavAiCat(\'' + c.key + '\')">' +
          '<span class="nav-ai-cat-emoji">' + c.emoji + '</span>' + c.label + '</button>';
      });
      html += '</div>';
    }

    if (results.length > 0) {
      html += '<div class="nav-ai-section-title"><span class="material-icons-round">auto_awesome</span> ' + (relaxedNotice ? 'Ähnliche Treffer' : 'Ergebnisse') + '</div>';
      html += '<div class="nav-ai-results">';
      results.forEach(function(l) {
        var img = (l.images && l.images[0]) ? l.images[0] : '';
        var stars = '★'.repeat(Math.round(l.rating)) + '☆'.repeat(5 - Math.round(l.rating));
        html += '<button class="nav-ai-result-card" type="button" aria-label="Profil ansehen" onclick="closeNavAiSearch();(typeof showToast===\'function\')&&showToast(\'Profil wird geladen…\',\'sync\');navigateTo(\'provider\', ' + (l.providerId || l.id) + ')">' +
          '<img class="nav-ai-result-img" src="' + img + '" alt="" onerror="this.style.display=\'none\'" />' +
          '<div class="nav-ai-result-info">' +
            '<div class="nav-ai-result-name">' + l.title + '</div>' +
            '<div class="nav-ai-result-meta">' +
              '<span class="nav-ai-result-rating">' + stars.substring(0,5) + ' ' + l.rating + '</span>' +
              '<span>·</span><span>' + l.location + '</span>' +
            '</div>' +
          '</div>' +
          '<span class="nav-ai-result-price">ab ' + l.price + '€</span>' +
          '</button>';
      });
      html += '</div>';
    }

    // Matching popular searches
    var matchedPop = _NAV_AI_POPULAR.filter(function(p) { return p.text.toLowerCase().includes(q); });
    if (matchedPop.length > 0) {
      html += '<div class="nav-ai-section-title"><span class="material-icons-round">trending_up</span> Vorschläge</div>';
      html += '<div class="nav-ai-popular-list">';
      matchedPop.forEach(function(p) {
        html += '<button class="nav-ai-popular-item" onclick="navAiFillAndSearch(\'' + p.text.replace(/'/g, "\\'") + '\')">' +
          '<span class="material-icons-round">search</span>' +
          '<span class="nav-ai-pop-text">' + p.text + '</span>' +
          '<span class="nav-ai-pop-cat">' + p.cat + '</span>' +
          '</button>';
      });
      html += '</div>';
    }

    if (results.length === 0 && matchedCats.length === 0 && matchedPop.length === 0) {
      html += '<div class="nav-ai-empty"><span class="material-icons-round">search_off</span>Keine Ergebnisse für „' + q + '"<br><small>Suche anpassen oder Kategorie wählen</small></div>';
    }
  }

  body.innerHTML = html;
}

function onNavAiInput() {
  var inp = document.getElementById('navAiInput');
  _renderNavAiBody(inp ? inp.value : '');
}

function toggleNavAiCat(key) {
  // User clicked a category card → directly search for that category (clear old query, single category)
  var cats = _getNavAiCategories();
  var cat = cats.find(function(c) { return c.key === key; });
  if (!cat) return;
  var inp = document.getElementById('navAiInput');
  if (inp) inp.value = cat.label;
  _navAiCatSelection.clear();
  _navAiCatSelection.add(key);
  submitNavAiSearch();
}

function navAiFillAndSearch(text) {
  var inp = document.getElementById('navAiInput');
  if (inp) inp.value = text;
  submitNavAiSearch();
}

function submitNavAiSearch() {
  var inp = document.getElementById('navAiInput');
  var query = inp ? inp.value.trim() : '';
  closeNavAiSearch();

  // Update nav bar label to show the active search query
  var typingEl = document.getElementById('navAiTyping');
  var navBtn = document.querySelector('.nav-search-ai');
  if (typingEl) {
    if (query) {
      // Pause animation and show actual query
      if (_navAiTypingTimer) { clearInterval(_navAiTypingTimer); clearTimeout(_navAiTypingTimer); _navAiTypingTimer = null; }
      typingEl.textContent = query;
      if (navBtn) navBtn.classList.add('has-query');
      // FIX 2026-05: KEIN localStorage.setItem mehr – die Nav-Suche soll wie
      // bei Google ein Per-Session-State sein, kein persistenter. Vorher landete
      // jede ausgeführte Suche dauerhaft in localStorage und tauchte beim
      // nächsten Page-Load überraschend wieder im Header auf (z. B. "Dekoration"
      // nach Kategorie-Klick). Persistenz ist nicht erwartet.
      var clearBtn = document.getElementById('navClearSearch');
      if (clearBtn) clearBtn.style.display = 'flex';
    } else {
      // No query – restart animation
      if (navBtn) navBtn.classList.remove('has-query');
      // (Alt-Eintrag aus localStorage trotzdem aufräumen, falls vorhanden)
      try { localStorage.removeItem('eb_nav_search'); } catch(e) {}
      var clearBtn2 = document.getElementById('navClearSearch');
      if (clearBtn2) clearBtn2.style.display = 'none';
      _initNavAiTyping();
    }
  }

  // Transfer category selections
  if (typeof selectedCategories !== 'undefined') {
    selectedCategories.clear();
    _navAiCatSelection.forEach(function(k) { selectedCategories.add(k); });
  }

  navigateTo('browse');
  setTimeout(function() {
    var heroInput = document.getElementById('heroSearchInput');
    if (heroInput && query) {
      heroInput.value = query;
      heroInput.dispatchEvent(new Event('input'));
    }
    var browseInput = document.getElementById('browseSearch');
    if (browseInput && query) {
      browseInput.value = query;
      _aiPlaceholderHideOnInput(browseInput);
    }

    // City detection inside the AI query → auto-sync Wo? + browseLocation.
    // Lets AI search and Wo? complement each other ("DJ in Köln" sets both),
    // and avoids the stale-location bug (typing "Köln" while Bonn was set).
    try {
      if (query) {
        var detected = (typeof _ebDetectCityInText === 'function') ? _ebDetectCityInText(query) : '';
        var locEl = document.getElementById('browseLocation');
        if (detected) {
          if (locEl) locEl.value = detected;
          if (typeof _setNavWoLabel === 'function') _setNavWoLabel(detected);
          var mapInp = document.getElementById('mapSearchInput');
          if (mapInp) mapInp.value = detected;
        }
        // else: keep whatever Wo? already had – searches complement
      }
    } catch(e) {}

    if (typeof filterListings === 'function') filterListings();
    // Scroll to results
    setTimeout(function() {
      var grid = document.getElementById('browseGrid');
      if (grid) window.scrollTo({ top: grid.getBoundingClientRect().top + window.pageYOffset - 110, behavior: 'smooth' });
    }, 150);
  }, 250);
}

// ── Typing animation for nav AI button ──
function _initNavAiTyping() {
  var el = document.getElementById('navAiTyping');
  if (!el) return;
  var phrases = [
    'Beschreib dein Event…',
    'DJ für Hochzeit…',
    'Catering für 80 Gäste…',
    'Fotograf gesucht…',
    'Location finden…',
  ];
  var phraseIdx = 0, charIdx = 0, isDeleting = false;
  if (_navAiTypingTimer) clearInterval(_navAiTypingTimer);

  function tick() {
    var phrase = phrases[phraseIdx];
    if (!isDeleting) {
      charIdx++;
      el.textContent = phrase.substring(0, charIdx);
      if (charIdx >= phrase.length) {
        isDeleting = true;
        clearInterval(_navAiTypingTimer);
        _navAiTypingTimer = setTimeout(function() {
          _navAiTypingTimer = setInterval(tick, 35);
        }, 2400);
        return;
      }
    } else {
      charIdx--;
      el.textContent = phrase.substring(0, charIdx) || '\u00A0';
      if (charIdx <= 0) {
        isDeleting = false;
        phraseIdx = (phraseIdx + 1) % phrases.length;
        clearInterval(_navAiTypingTimer);
        _navAiTypingTimer = setTimeout(function() {
          _navAiTypingTimer = setInterval(tick, 60);
        }, 400);
        return;
      }
    }
  }
  el.textContent = '\u00A0';
  _navAiTypingTimer = setInterval(tick, 60);
}

// ── Category Dropdown ──
function toggleNavCategoryDropdown(e) {
  // Backwards-compat: legacy "Event" button is now "Wann?" (date picker)
  return toggleNavDatePicker(e);
}
function _toggleNavCategoryDropdownLegacy(e) {
  if (e) e.stopPropagation();
  var dd = document.getElementById('navCatDropdown');
  if (!dd) return;
  if (dd.classList.contains('show')) {
    dd.classList.remove('show');
    return;
  }
  var cats = _getNavAiCategories();
  dd.innerHTML = cats.map(function(c) {
    var sel = _navSelectedCategory === c.key ? ' selected' : '';
    return '<button class="nav-cat-item' + sel + '" onclick="selectNavCategory(\'' + c.key + '\',\'' + c.label + '\',\'' + c.emoji + '\')">' +
      '<span class="nav-cat-emoji">' + c.emoji + '</span>' + c.label + '</button>';
  }).join('');
  // Position using fixed coords from button rect (escapes overflow:hidden on nav-search)
  var wrap = document.querySelector('.nav-search-segment-wrap');
  if (wrap) {
    var rect = wrap.getBoundingClientRect();
    dd.style.top = (rect.bottom + 6) + 'px';
    var left = rect.left + rect.width / 2 - 140;
    var maxLeft = window.innerWidth - 288;
    dd.style.left = Math.max(8, Math.min(left, maxLeft)) + 'px';
  }
  dd.classList.add('show');
}

function selectNavCategory(key, label, emoji) {
  var dd = document.getElementById('navCatDropdown');
  var valEl = document.getElementById('navCatValue');
  if (_navSelectedCategory === key) {
    _navSelectedCategory = '';
    if (valEl) valEl.textContent = 'Kategorie';
  } else {
    _navSelectedCategory = key;
    if (valEl) valEl.textContent = emoji + ' ' + label;
  }
  if (dd) dd.classList.remove('show');
  if (typeof selectedCategories !== 'undefined') {
    selectedCategories.clear();
    if (_navSelectedCategory) selectedCategories.add(_navSelectedCategory);
  }
}

function performNavSearch() {
  var dd = document.getElementById('navCatDropdown');
  if (dd) dd.classList.remove('show');

  // Close map overlay if open – focus shifts to results page
  try {
    var mapOv = document.getElementById('mapOverlay');
    if (mapOv && mapOv.classList.contains('show') && typeof closeMapOverlay === 'function') {
      closeMapOverlay();
    }
  } catch(e) {}

  // Sync map search → browseLocation. The AI search text wins if it
  // contains a recognised city ("DJ in Köln" overrides a stale Bonn).
  try {
    var mapInp = document.getElementById('mapSearchInput');
    var loc = document.getElementById('browseLocation');
    var typing = document.getElementById('navAiTyping');
    var aiQuery = (typing && typing.textContent ? typing.textContent : '').trim();
    var aiCity = (typeof _ebDetectCityInText === 'function') ? _ebDetectCityInText(aiQuery) : '';

    if (aiCity) {
      if (loc) loc.value = aiCity;
      _setNavWoLabel(aiCity);
      if (mapInp) mapInp.value = aiCity;
    } else if (mapInp && mapInp.value && mapInp.value.trim()) {
      var city = _ebTitleCase(mapInp.value.trim());
      if (loc) loc.value = city; // overwrite so Wo? always wins over previous
      _setNavWoLabel(city);
    }
  } catch(e) {}

  // FIX 2026-05: Such-Text aus Nav-AI-Searchbar in Browse-Filter übernehmen.
  // Vorher wurde nur die Location übertragen — der eigentliche Suchbegriff
  // (z. B. "DJ" in "DJ in Berlin") ging beim Klick aufs Lupen-Icon verloren.
  try {
    var typing2 = document.getElementById('navAiTyping');
    var aiQuery2 = (typing2 && typing2.textContent ? typing2.textContent : '').trim();
    var browseInp = document.getElementById('browseSearch');
    if (browseInp && aiQuery2) {
      browseInp.value = aiQuery2;
    }
  } catch (e) {}

  // On mobile: go to browse and scroll to the results grid (focus on userfeed)
  if (window.innerWidth <= 768) {
    _navMobileTap('search');
    return;
  }
  navigateTo('browse');
  setTimeout(function() {
    if (typeof filterListings === 'function') filterListings();
  }, 200);
}

// ── "Wann?" Date Range Picker ──
var _navDateRange = { from: '', to: '' };
try { window.selectedDateRange = _navDateRange; } catch(e) {}

function _navIsoDate(d) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function _navFmtDeDate(iso) {
  if (!iso) return '';
  var p = String(iso).split('-');
  if (p.length !== 3) return iso;
  return p[2] + '.' + p[1] + '.' + p[0].slice(2);
}
function _navDateLabel() {
  var r = _navDateRange;
  if (r.from && r.to) {
    if (r.from === r.to) return _navFmtDeDate(r.from);
    return _navFmtDeDate(r.from) + ' – ' + _navFmtDeDate(r.to);
  }
  if (r.from) return 'ab ' + _navFmtDeDate(r.from);
  return 'Zeitraum';
}
function _navUpdateDateLabel() {
  var el = document.getElementById('navDateValue');
  if (el) el.textContent = _navDateLabel();
  var btn = document.getElementById('navWannBtn');
  if (btn) btn.classList.toggle('has-value', !!(_navDateRange.from || _navDateRange.to));
}

function toggleNavDatePicker(e) {
  if (e) e.stopPropagation();
  // Close other dropdowns
  var dd = document.getElementById('navCatDropdown');
  if (dd) dd.classList.remove('show');

  var pop = document.getElementById('navDatePopover');
  if (!pop) {
    pop = document.createElement('div');
    pop.id = 'navDatePopover';
    pop.className = 'nav-date-popover';
    document.body.appendChild(pop);
    pop.addEventListener('click', function(ev) { ev.stopPropagation(); });
  }
  if (pop.classList.contains('show')) { pop.classList.remove('show'); return; }

  var today = new Date();
  var todayIso = _navIsoDate(today);
  var inWeek = new Date(today); inWeek.setDate(inWeek.getDate()+7);
  var inMonth = new Date(today); inMonth.setMonth(inMonth.getMonth()+1);
  var endOfYear = new Date(today.getFullYear(), 11, 31);

  pop.innerHTML =
    '<div class="nav-date-head">' +
      '<span class="material-icons-round">event</span>' +
      '<span>Wann ist dein Event?</span>' +
      '<button class="nav-date-close" onclick="closeNavDatePicker()" aria-label="Schließen"><span class="material-icons-round">close</span></button>' +
    '</div>' +
    '<div class="nav-date-presets">' +
      '<button class="nav-date-chip" onclick="applyNavDateRange(\''+todayIso+'\',\''+_navIsoDate(inWeek)+'\')">Diese Woche</button>' +
      '<button class="nav-date-chip" onclick="applyNavDateRange(\''+todayIso+'\',\''+_navIsoDate(inMonth)+'\')">Nächste 30 Tage</button>' +
      '<button class="nav-date-chip" onclick="applyNavDateRange(\''+todayIso+'\',\''+_navIsoDate(endOfYear)+'\')">Dieses Jahr</button>' +
      '<button class="nav-date-chip" onclick="clearNavDateRange()">Flexibel</button>' +
    '</div>' +
    '<div class="nav-date-fields">' +
      '<label><span>Von</span><input type="date" id="navDateFrom" value="'+_navDateRange.from+'" min="'+todayIso+'" oninput="_navDateInputSync()" /></label>' +
      '<label><span>Bis</span><input type="date" id="navDateTo" value="'+_navDateRange.to+'" min="'+(_navDateRange.from||todayIso)+'" oninput="_navDateInputSync()" /></label>' +
    '</div>' +
    '<div class="nav-date-actions">' +
      '<button class="nav-date-clear" onclick="clearNavDateRange()">Zurücksetzen</button>' +
      '<button class="nav-date-apply" onclick="confirmNavDateRange()"><span class="material-icons-round">check</span> Übernehmen</button>' +
    '</div>';

  var isMobile = window.innerWidth <= 768;
  pop.classList.toggle('sheet', isMobile);
  if (!isMobile) {
    var wrap = document.getElementById('navWannBtn');
    if (wrap) {
      var rect = wrap.getBoundingClientRect();
      pop.style.top = (rect.bottom + 8) + 'px';
      var w = 340;
      var left = rect.left + rect.width/2 - w/2;
      left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
      pop.style.left = left + 'px';
      pop.style.right = '';
    }
  } else {
    pop.style.top = '';
    pop.style.left = '';
    pop.style.right = '';
  }
  pop.classList.add('show');
}

function _navDateInputSync() {
  var f = document.getElementById('navDateFrom');
  var t = document.getElementById('navDateTo');
  if (f && t) {
    if (f.value) t.min = f.value;
    if (t.value && f.value && t.value < f.value) t.value = f.value;
  }
}

function applyNavDateRange(from, to) {
  _navDateRange.from = from || '';
  _navDateRange.to = to || _navDateRange.from || '';
  _navUpdateDateLabel();
  closeNavDatePicker();
  var onBrowse = !!(document.getElementById('page-browse') && document.getElementById('page-browse').classList.contains('active'));
  if (!onBrowse) {
    navigateTo('browse');
    setTimeout(function() { if (typeof filterListings === 'function') filterListings(); }, 250);
  } else {
    if (typeof filterListings === 'function') filterListings();
  }
}

function confirmNavDateRange() {
  var f = document.getElementById('navDateFrom');
  var t = document.getElementById('navDateTo');
  applyNavDateRange(f ? f.value : '', t ? t.value : '');
}

function clearNavDateRange() {
  _navDateRange.from = '';
  _navDateRange.to = '';
  _navUpdateDateLabel();
  closeNavDatePicker();
  if (typeof filterListings === 'function') filterListings();
}

function closeNavDatePicker() {
  var pop = document.getElementById('navDatePopover');
  if (pop) pop.classList.remove('show');
}

// Close dropdowns on outside click
document.addEventListener('click', function(e) {
  if (!e.target.closest('.nav-search-segment-wrap')) {
    var dd = document.getElementById('navCatDropdown');
    if (dd) dd.classList.remove('show');
  }
  if (!e.target.closest('#navDatePopover') && !e.target.closest('#navWannBtn')) {
    var pop = document.getElementById('navDatePopover');
    if (pop) pop.classList.remove('show');
  }
  if (!e.target.closest('.nav-ai-overlay-inner') && !e.target.closest('.nav-search-ai')) {
    closeNavAiSearch();
  }
});

// Escape key closes overlay
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeNavAiSearch();
    var pop = document.getElementById('navDatePopover');
    if (pop) pop.classList.remove('show');
  }
});

// ── Clear nav search ──
function clearNavAiSearch() {
  try { localStorage.removeItem('eb_nav_search'); } catch(e) {}
  var typingEl = document.getElementById('navAiTyping');
  var navBtn = document.querySelector('.nav-search-ai');
  var clearBtn = document.getElementById('navClearSearch');
  if (navBtn) navBtn.classList.remove('has-query');
  if (clearBtn) clearBtn.style.display = 'none';

  // Clear date range
  if (typeof _navDateRange !== 'undefined') {
    _navDateRange.from = '';
    _navDateRange.to = '';
  }
  if (typeof _navUpdateDateLabel === 'function') _navUpdateDateLabel();

  // Clear location (Wo?)
  var woVal = document.getElementById('navWoValue');
  if (woVal) woVal.textContent = 'Region';
  var woBtn = document.getElementById('navWoBtn');
  if (woBtn) woBtn.classList.remove('has-value');
  var mapSearch = document.getElementById('mapSearchInput');
  if (mapSearch) mapSearch.value = '';

  // Clear category selection
  if (typeof selectedCategories !== 'undefined') selectedCategories.clear();
  if (typeof _navAiCatSelection !== 'undefined') _navAiCatSelection.clear();

  // Clear browse search/location/category inputs if present
  var browseInput = document.getElementById('browseSearch');
  if (browseInput) browseInput.value = '';
  var browseLocation = document.getElementById('browseLocation');
  if (browseLocation) browseLocation.value = '';
  var heroInput = document.getElementById('heroSearchInput');
  if (heroInput) heroInput.value = '';

  // Re-render category buttons if a render fn exists
  if (typeof renderCategoryButtons === 'function') {
    try { renderCategoryButtons(); } catch(e) {}
  }

  if (typeof filterListings === 'function') filterListings();
  _initNavAiTyping();
}

// Init typing on load
// FIX 2026-05: Auto-Restore der letzten Suche aus localStorage entfernt.
// Jeder Page-Load startet jetzt mit der Typing-Animation, statt eine
// alte, oft vergessene Suche (z. B. "Dekoration") wieder anzuzeigen.
// Migrations-Aufräumung: alten Eintrag einmal still löschen.
document.addEventListener('DOMContentLoaded', function() {
  try { localStorage.removeItem('eb_nav_search'); } catch(e) {}
  _initNavAiTyping();
});
