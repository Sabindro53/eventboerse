/* The planning workspace connects discovery, personal projects and group plans.
 * Group collaboration stays in its row-based API; personal booking data is never
 * shared by copying the account's board blob to another account. */
var _planningWorkspaceMode = 'projects';
var _planningBoardView = 'overview';
var _planningCreateOptions = {};

var EB_PLANNING_FRAGMENTS = {
  wedding: [
    ['venue', 'Location & Feier', 'Location'], ['ceremony', 'Trauung & Anmeldung', 'Trauredner'],
    ['food', 'Essen & Getränke', 'Catering'], ['music', 'DJ & Live-Musik', 'DJ'],
    ['photo', 'Fotos & Video', 'Fotograf'], ['flowers', 'Blumen & Floristik', 'Floristik'],
    ['decoration', 'Dekoration & Mobiliar', 'Dekoration'], ['cake', 'Hochzeitstorte', 'Torte'],
    ['outfits', 'Outfits & Styling', 'Styling'], ['rings', 'Ringe & Accessoires', 'Ringe'],
    ['guests', 'Einladungen & Sitzordnung', 'Papeterie'], ['stay', 'Unterkunft & Anreise', 'Hotel'],
    ['transport', 'Transport & Shuttle', 'Transport'], ['children', 'Kinderbetreuung', 'Kinderbetreuung'],
    ['technology', 'Licht & Technik', 'Technik'], ['coordination', 'Tagesablauf & Koordination', 'Eventplanung'],
    ['access', 'Barrierefreiheit & Bedürfnisse', ''], ['backup', 'Wetterplan & Reserve', '']
  ],
  birthday: [['venue', 'Ort & Gäste', 'Location'], ['food', 'Essen & Getränke', 'Catering'], ['music', 'Musik & Programm', 'DJ'], ['decoration', 'Deko & Kuchen', 'Dekoration']],
  corporate: [['venue', 'Location', 'Location'], ['food', 'Catering', 'Catering'], ['technology', 'Technik & Präsentation', 'Technik'], ['program', 'Programm & Team', 'Moderation']],
  custom: [['activity', 'Idee & Aktivität', ''], ['venue', 'Treffpunkt & Location', 'Location'], ['guests', 'Teilnehmende & Einladungen', ''], ['food', 'Essen & Getränke', 'Catering']]
};

function planningNormalizeDate(value) {
  var raw = String(value || '').trim();
  if (!raw) return '';
  var iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  var de = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!iso && !de) return '';
  var y = Number(iso ? iso[1] : de[3]);
  var m = Number(iso ? iso[2] : de[2]);
  var d = Number(iso ? iso[3] : de[1]);
  var date = new Date(y, m - 1, d);
  if (y < 1900 || y > 2200 || date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return '';
  return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
}

function planningDateLabel(value) {
  var date = planningNormalizeDate(value);
  return date ? new Date(date + 'T12:00:00').toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Datum noch offen';
}

function planningSafeUrl(value) {
  try {
    var url = new URL(String(value || ''));
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
  } catch (e) { return ''; }
}

function planningFragments(project) {
  if (Array.isArray(project.fragments)) return project.fragments;
  return (EB_PLANNING_FRAGMENTS[project.template] || EB_PLANNING_FRAGMENTS.custom).map(function(f) {
    return { id: f[0], title: f[1], category: f[2], enabled: true, budget: 0, note: '', cardId: '' };
  });
}

function planningCreateProject(options) {
  options = options || {};
  var now = Date.now();
  var template = String(options.template || 'custom');
  var activity = options.activity;
  var project = {
    id: 'bp_' + now + '_' + Math.random().toString(36).slice(2, 8),
    name: String(options.name || options.title || 'Mein Event').slice(0, 120),
    date: planningNormalizeDate(options.date),
    budget: Math.max(0, Math.min(1000000, Number(options.budget) || 0)),
    guests: Math.max(0, Math.min(100000, Math.round(Number(options.guests) || 0))),
    location: String(options.location || '').slice(0, 160), template: template, cards: [], checklist: [],
    createdAt: new Date(now).toISOString(), updatedAt: now
  };
  project.fragments = planningFragments(project);
  if (template === 'wedding') {
    project.checklist = (_CHECKLIST_TEMPLATES.wedding || []).map(function(text, i) {
      return { id: 'cli_wedding_' + i, text: text, done: false, isTemplate: true };
    });
  }
  if (activity && activity.title) {
    project.activity = { id: String(activity.id || '').slice(0, 120), title: String(activity.title).slice(0, 180),
      sourceUrl: planningSafeUrl(activity.sourceUrl), sourceName: String(activity.sourceName || '').slice(0, 100) };
  }
  return project;
}

/** Public entry for feed, radar, search and profile. */
function startPlanningBoard(options) {
  options = options || {};
  if (options.withFriends || options.intent === 'friends') {
    return window.startGroupPlanning(options);
  }
  _planningWorkspaceMode = 'projects';
  if (options.boardId && (_boardProjects || []).some(function(p) { return p.id === options.boardId; })) {
    navigateTo('board', options.boardId);
    return;
  }
  if (!currentUser) { openModal('loginModal'); return; }
  navigateTo('board');
  openCreateBoardModal(options);
}
window.startPlanningBoard = startPlanningBoard;

function renderPlanningHome(container, isProvider) {
  container.classList.remove('board-projects--ai');
  container.classList.add('board-projects--sectioned');
  delete container.dataset.aiRenderKey;
  var cards = (_boardProjects || []).map(function(p) {
    var tasks = (p.checklist || []).filter(function(t) { return t && t.text; });
    var completed = tasks.filter(function(t) { return t.done; }).length;
    return '<article class="planning-project">' +
      '<div class="planning-kicker">' + (p.template === 'wedding' ? 'HOCHZEIT' : 'MEIN EVENT') + '</div>' +
      '<h3><button type="button" data-planning-action="open" data-project="' + _escHtml(p.id) + '">' + _escHtml(p.name) + '</button></h3>' +
      '<p>' + _escHtml(planningDateLabel(p.date)) + (p.guests ? ' · ' + Number(p.guests) + ' Gäste' : '') + '</p>' +
      '<div class="planning-project-meta"><span>' + (p.cards || []).length + ' Leistungen</span><span>' + completed + '/' + tasks.length + ' Aufgaben</span>' +
      '<span>' + _escHtml(_formatEuro(Number(p.budget) || 0)) + ' Budget</span></div>' +
      '<button type="button" class="btn-outline" data-planning-action="open" data-project="' + _escHtml(p.id) + '">Plan öffnen <span class="material-icons-round">arrow_forward</span></button></article>';
  }).join('');
  container.innerHTML = '<div class="planning-home">' +
    '<section class="planning-starts" aria-label="Planung starten">' +
      '<button class="planning-start" type="button" data-planning-action="friends"><span class="material-icons-round">group_add</span><strong>Mit Freunden planen</strong><small>Gemeinsamer Plan, Aufgaben und Einladungen</small></button>' +
      '<button class="planning-start" type="button" data-planning-action="wedding"><span class="material-icons-round">favorite</span><strong>Hochzeit zusammenstellen</strong><small>Alle Bausteine, Gäste und Budget im Blick</small></button>' +
      '<button class="planning-start" type="button" data-planning-action="custom"><span class="material-icons-round">celebration</span><strong>Eigenes Event planen</strong><small>Von der ersten Idee bis zur letzten Buchung</small></button>' +
    '</section><div class="planning-section-title"><h2>Deine Projekte</h2><button type="button" class="btn-outline" data-planning-action="assistant"><span class="material-icons-round">auto_awesome</span> Assistent</button></div>' +
    (cards ? '<div class="planning-project-grid">' + cards + '</div>' : '<div class="planning-empty"><h3>Hier beginnt dein nächstes Event</h3><p>' +
      (currentUser ? 'Starte oben mit einer Idee. Leistungen, Aufgaben und Kosten bleiben in deinem Projekt zusammen.' : 'Melde dich an, um deine Planung zu speichern und gemeinsam weiterzuplanen.') + '</p></div>') +
    '<div class="planning-connections"><button type="button" class="btn-outline" data-planning-action="groups">Freunde & gemeinsame Pläne</button>' +
    '<button type="button" class="btn-outline" data-planning-action="discover">Inspiration in der Nähe</button></div></div>' +
    (isProvider ? _renderAuftragsboardSectionHtml({ state: 'loading', jobs: [] }) : '');
  if (isProvider) _loadBoardAuftragsboard();
}

function mountPlanningOverview() {
  var board = document.getElementById('boardView');
  if (!board) return;
  if (!document.getElementById('boardPlanningOverview')) {
    var section = document.createElement('section');
    section.id = 'boardPlanningOverview';
    section.className = 'planning-overview';
    section.setAttribute('aria-label', 'Event-Planung');
    var meta = board.querySelector('.board-meta-bar');
    if (meta) meta.insertAdjacentElement('afterend', section);
    else board.prepend(section);
  }
  var toggle = board.querySelector('.board-view-toggle');
  if (toggle && !document.getElementById('btnPlanningOverview')) {
    var button = document.createElement('button');
    button.id = 'btnPlanningOverview';
    button.className = 'board-vtoggle';
    button.type = 'button';
    button.textContent = 'Übersicht';
    button.addEventListener('click', function() { switchBoardView('overview'); });
    toggle.prepend(button);
  }
}

function renderPlanningOverview() {
  var project = (_boardProjects || []).find(function(p) { return p.id === _activeBoardId; });
  var container = document.getElementById('boardPlanningOverview');
  if (!project || !container) return;
  var fragments = planningFragments(project);
  var cards = project.cards || [];
  var tasks = (project.checklist || []).filter(function(t) { return t && t.text; });
  var completed = tasks.filter(function(t) { return t.done; }).length;
  // Linked estimates are counted once; this is planning, not a payment ledger.
  var cost = cards.reduce(function(sum, c) { return sum + Math.max(0, Number(c.price) || 0); }, 0) +
    fragments.reduce(function(sum, f) { return sum + (f.enabled !== false && !cards.some(function(c) { return c.id === f.cardId; }) ? Math.max(0, Number(f.budget) || 0) : 0); }, 0);
  var rest = (Number(project.budget) || 0) - cost;
  var source = project.activity && planningSafeUrl(project.activity.sourceUrl);
  container.innerHTML = '<div class="planning-topline"><div><div class="planning-kicker">' + (project.template === 'wedding' ? 'EURE HOCHZEIT' : 'DEIN EVENT') + '</div>' +
    '<h2>Alles für euren Tag</h2><p>Stelle die Bausteine zusammen, die zu euch passen.</p></div>' +
    '<button type="button" class="btn-primary" data-planning-action="collaborate"><span class="material-icons-round">group_add</span> Gemeinsam planen</button></div>' +
    (project.activity ? '<div class="planning-source"><span class="material-icons-round">explore</span><div><strong>' + _escHtml(project.activity.title) + '</strong><p>Als Inspiration aus dem Radar übernommen.' +
      (source ? ' <a href="' + _escHtml(source) + '" target="_blank" rel="noopener noreferrer">Beim Veranstalter ansehen</a>' : '') + '</p></div></div>' : '') +
    '<div class="planning-summary"><div><small>Gesamtbudget</small><strong>' + _escHtml(_formatEuro(Number(project.budget) || 0)) + '</strong></div>' +
    '<div><small>Eingeplant · geschätzt</small><strong>' + _escHtml(_formatEuro(cost)) + '</strong></div><div class="' + (rest < 0 ? 'planning-over-budget' : '') + '"><small>' + (rest < 0 ? 'Über Budget' : 'Noch verfügbar') + '</small><strong>' + _escHtml(_formatEuro(Math.abs(rest))) + '</strong></div>' +
    '<div><small>Gäste</small><strong>' + (Number(project.guests) || 'Noch offen') + '</strong></div></div>' +
    '<div class="planning-toolbar"><button type="button" class="btn-outline" data-planning-action="edit">Datum, Budget & Gäste bearbeiten</button>' +
    '<button type="button" class="btn-outline" data-planning-action="suppliers">Leistung hinzufügen</button>' +
    '<button type="button" class="btn-outline" data-planning-action="checklist">Aufgaben · ' + completed + '/' + tasks.length + '</button>' +
    '<button type="button" class="btn-outline" data-planning-action="messages">Nachrichten & Angebote</button></div>' +
    '<div class="planning-section-title"><h3>Deine Bausteine</h3><span>' + fragments.filter(function(f) { return f.enabled !== false; }).length + ' ausgewählt</span></div>' +
    '<p class="planning-hint">Bausteine sind eure Planung. Eine Leistung wird erst durch den Buchungsablauf verbindlich.</p>' +
    '<div class="planning-fragments">' + fragments.map(function(f) {
      var fid = _escHtml(f.id);
      var linked = cards.find(function(c) { return c.id === f.cardId; });
      return '<article class="planning-fragment' + (f.enabled === false ? ' is-disabled' : '') + '" data-fragment="' + fid + '">' +
        '<label class="planning-fragment-title"><input type="checkbox" data-planning-field="enabled"' + (f.enabled !== false ? ' checked' : '') + '><strong>' + _escHtml(f.title) + '</strong></label>' +
        '<div class="planning-fragment-fields"' + (f.enabled === false ? ' hidden' : '') + '>' +
        '<label>Teilbudget (€)<input type="number" min="0" max="1000000" step="0.01" data-planning-field="budget" value="' + (Number(f.budget) || '') + '" placeholder="Noch offen"></label>' +
        '<label>Leistung im Board<select data-planning-field="cardId"><option value="">Noch nicht ausgewählt</option>' + cards.map(function(c) {
          return '<option value="' + _escHtml(c.id) + '"' + (f.cardId === c.id ? ' selected' : '') + '>' + _escHtml(c.listingTitle || c.name) + '</option>';
        }).join('') + '</select></label>' +
        '<label>Wünsche & Notizen<textarea rows="2" maxlength="500" data-planning-field="note" placeholder="Was ist euch wichtig?">' + _escHtml(f.note || '') + '</textarea></label>' +
        (linked && linked.listingId ? '<button type="button" class="btn-outline" data-planning-action="listing" data-listing="' + _escHtml(String(linked.listingId)) + '">Leistung ansehen</button>' :
          f.category ? '<button type="button" class="btn-outline" data-planning-action="find-fragment">' + _escHtml(f.category) + ' finden</button>' : '') +
        '</div></article>';
    }).join('') + '</div>' +
    '<form class="planning-add-fragment" id="planningAddFragment"><label for="planningFragmentName">Eigener Baustein</label><div><input id="planningFragmentName" type="text" required maxlength="100" placeholder="z. B. Hundebetreuung"><button class="btn-primary" type="submit">Hinzufügen</button></div></form>';
}

function planningSaveFragment(target) {
  var project = (_boardProjects || []).find(function(p) { return p.id === _activeBoardId; });
  var node = target.closest('[data-fragment]');
  if (!project || !node) return;
  if (!Array.isArray(project.fragments)) project.fragments = planningFragments(project);
  var fragment = project.fragments.find(function(f) { return f.id === node.dataset.fragment; });
  if (!fragment) return;
  var field = target.dataset.planningField;
  if (field === 'enabled') fragment.enabled = target.checked;
  else if (field === 'budget') fragment.budget = Math.max(0, Math.min(1000000, Number(target.value) || 0));
  else if (field === 'note') fragment.note = target.value.slice(0, 500);
  else if (field === 'cardId') fragment.cardId = (project.cards || []).some(function(c) { return c.id === target.value; }) ? target.value : '';
  else return;
  project.updatedAt = Date.now();
  _saveBoardProjects();
  // Text entry stays focused; structural changes update the overview immediately.
  if (field !== 'note') renderPlanningOverview();
}

function planningHandleAction(button) {
  var action = button.dataset.planningAction;
  var project = (_boardProjects || []).find(function(p) { return p.id === _activeBoardId; });
  if (action === 'open') { navigateTo('board', button.dataset.project); return; }
  if (action === 'friends') { startPlanningBoard({ intent: 'friends' }); return; }
  if (action === 'wedding' || action === 'custom') { startPlanningBoard({ intent: action, template: action }); return; }
  if (action === 'projects' || action === 'assistant') {
    _planningWorkspaceMode = action === 'assistant' ? 'assistant' : 'projects'; renderBoardPage(); return;
  }
  if (action === 'groups') { navigateTo('freunde', 'gruppen'); return; }
  if (action === 'discover') { navigateTo('aktuelles', 'jetzt'); return; }
  if (!project) return;
  if (action === 'edit') openEditBoardProjectModal(project.id);
  if (action === 'checklist') switchBoardView('checklist');
  if (action === 'messages') navigateTo('messages');
  if (action === 'listing') navigateTo('detail', Number(button.dataset.listing) || button.dataset.listing);
  if (action === 'suppliers') openAddProviderModal('geplant');
  if (action === 'collaborate') planningInviteProject();
  if (action === 'find-fragment') {
    var parent = button.closest('[data-fragment]');
    var fragment = planningFragments(project).find(function(f) { return f.id === parent.dataset.fragment; });
    openAddProviderModal('geplant');
    var search = document.getElementById('lpickSearch');
    if (search && fragment) { search.value = fragment.category; _filterListingPicker(fragment.category); }
  }
}

document.addEventListener('click', function(event) {
  var button = event.target.closest && event.target.closest('[data-planning-action]');
  if (button) planningHandleAction(button);
});
document.addEventListener('change', function(event) {
  if (event.target.matches('[data-planning-field]')) planningSaveFragment(event.target);
});
document.addEventListener('submit', function(event) {
  if (event.target.id !== 'planningAddFragment') return;
  event.preventDefault();
  var project = (_boardProjects || []).find(function(p) { return p.id === _activeBoardId; });
  var input = document.getElementById('planningFragmentName');
  var title = input && input.value.trim();
  if (!project || !title) return;
  if (!Array.isArray(project.fragments)) project.fragments = planningFragments(project);
  if (project.fragments.length >= 60) { showToast('Bis zu 60 Bausteine pro Projekt.', 'info'); return; }
  project.fragments.push({ id: 'custom_' + Date.now(), title: title.slice(0, 100), category: '', enabled: true, budget: 0, note: '', cardId: '' });
  _saveBoardProjects();
  renderPlanningOverview();
});

function planningInviteProject() {
  var project = (_boardProjects || []).find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;
  if (project.groupId) return navigateTo('freunde', Number(project.groupId));
  return window.startGroupPlanning({ name: project.name, title: project.name, date: project.date, template: project.template,
    location: project.location || '', budget: project.budget, guests: project.guests, boardId: project.id,
    activity: project.activity || null, cards: project.cards || [], checklist: project.checklist || [], fragments: planningFragments(project) });
}
