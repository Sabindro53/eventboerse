/* Shared entry points keep discovery, friends, the plan and chat connected.
   Group plans stay in the permission-checked social API, never in a copied
   personal board JSON blob. Drafts contain no payment or permission state. */
var _groupPlanningDraft = null;
var _groupPlanningSaving = false;

function startGroupPlanning(options) {
  _groupPlanningDraft = Object.assign({}, options || {});
  _groupPlanningDraft.accountId = currentUser ? String(currentUser.id) : null;
  _sozialReiter = 'gruppen';
  return Promise.resolve(navigateTo('freunde', 'gruppen')).then(function () {
    sozialPlanungsEntwurfZeigen();
    var input = document.getElementById('sozGruppeName');
    if (input) { input.focus(); input.scrollIntoView({ block: 'center' }); }
  });
}

function sozialAuthFortsetzen() {
  var page = document.getElementById('page-freunde');
  if (!page || !page.classList.contains('active')) return;
  if (_groupPlanningDraft && !_groupPlanningDraft.accountId && currentUser) {
    _groupPlanningDraft.accountId = String(currentUser.id);
  }
  sozialLaden(true);
}

function sozialPlanungsEntwurfZeigen() {
  if (_sozialReiter !== 'gruppen') return;
  var n = document.getElementById('sozGruppeName');
  var draft = _groupPlanningDraft;
  if (draft && draft.accountId && currentUser && draft.accountId !== String(currentUser.id)) {
    _groupPlanningDraft = null;
    draft = null;
  }
  if (n && draft) {
    if (!n.value) n.value = String(draft.name || draft.title || (['hochzeit','wedding'].includes(draft.template) ? 'Unsere Hochzeit' : 'Unser gemeinsames Event')).slice(0,120);
    var typ = document.getElementById('sozGruppeTyp');
    var datum = document.getElementById('sozGruppeDatum');
    if (typ && !typ.value) typ.value = String(draft.eventType || draft.template || '').slice(0,60);
    if (datum && !datum.value && /^\d{4}-\d{2}-\d{2}$/.test(draft.date || draft.eventDate || '')) datum.value = draft.date || draft.eventDate;
  }
  var code = document.getElementById('sozCode');
  var invite = new URLSearchParams(location.search).get('einladung');
  if (code && invite && /^[a-f0-9]{18}$/.test(invite)) code.value = invite;
  if (n && !document.getElementById('sozPlanFreunde')) {
    var friends = (_sozialStand && _sozialStand.friends) || [];
    var box = document.createElement('div');
    box.id = 'sozPlanFreunde';
    box.className = 'journey-invite-picker';
    box.innerHTML = '<strong>Wer plant mit?</strong><p>Ausgewählte Freunde erhalten eine Einladung und entscheiden selbst, ob sie mitmachen.</p>'
      + (friends.length ? friends.map(function (f) {
        return '<label><input type="checkbox" name="planFriend" value="' + Number(f.id) + '"'
          + (draft && Number(draft.friendId) === Number(f.id) ? ' checked' : '') + '>'
          + _escHtml(String(f.name || f.handle)) + '</label>';
      }).join('') : '<button type="button" class="btn-outline" onclick="sozialReiter(\'freunde\')">Freunde finden</button><small>Du kannst deinen Plan auch zuerst erstellen und danach per Einladungslink teilen.</small>');
    n.closest('.soz-formular').insertAdjacentElement('afterend', box);
  }
}

function sozialPlanListingId(id) {
  var listing = typeof findListing === 'function' ? findListing(Number(id)) : null;
  return Number(listing ? (listing._dbId || listing.id) : id) || 0;
}

function sozialPlanStartposten(draft) {
  if (!draft) return [];
  var result = [];
  if (draft.listingId) {
    var listing = typeof findListing === 'function' ? findListing(Number(draft.listingId)) : null;
    result.push({ titel: String(draft.title || (listing && listing.title) || 'Event-Idee').slice(0,120),
      listingId: sozialPlanListingId(draft.listingId), kategorie: (listing && listing.category) || '',
      notiz: 'Aus dem Entdecken-Bereich übernommen. Verfügbarkeit und Preis im Chat anfragen.' });
  } else if (draft.title) {
    result.push({ titel: String(draft.title).slice(0,120),
      notiz: String((draft.sourceUrl || (draft.activity && draft.activity.sourceUrl)) ? 'Externe Aktivität: ' + (draft.sourceUrl || draft.activity.sourceUrl) + ' · Informationen beim Veranstalter prüfen.' : 'Gemeinsame Event-Idee').slice(0,500) });
  }
  // Copy editable planning estimates, never payment state or private card data.
  var linkedCards = new Set();
  (draft.fragments || []).filter(function(f) { return f.enabled !== false; }).slice(0,60).forEach(function(f) {
    var card = (draft.cards || []).find(function(c) { return c.id === f.cardId; });
    if (card) linkedCards.add(card.id);
    result.push({ titel: String(f.title || 'Baustein').slice(0,120), kategorie: String(f.category || '').slice(0,60),
      betragCent: Math.round(Math.max(0, Number(card ? card.price : f.budget) || 0) * 100),
      listingId: sozialPlanListingId(card && (card._dbId || card.listingId)),
      notiz: String(f.note || 'Planungsstand übernommen. Buchungen bleiben im persönlichen Board.').slice(0,500) });
  });
  (draft.cards || []).filter(function(c) { return !linkedCards.has(c.id); }).slice(0,60).forEach(function(c) {
    result.push({ titel: String(c.title || c.name || 'Geplante Leistung').slice(0,120),
      kategorie: String(c.category || '').slice(0,60), betragCent: Math.round(Math.max(0, Number(c.price) || 0) * 100),
      listingId: sozialPlanListingId(c._dbId || c.listingId),
      notiz: 'Planungsstand übernommen. Buchungen bleiben im persönlichen Board.' });
  });
  (draft.checklist || []).slice(0,25).forEach(function (c) {
    var title = typeof c === 'string' ? c : (c.text || c.title || c.label || '');
    if (title) result.push({ titel: String(title).slice(0,120), notiz: 'Aus der persönlichen Planung übernommen.' });
  });
  return result;
}

async function sozialPlanGruppeErstellen() {
  if (_groupPlanningSaving || !currentUser) return;
  var n = document.getElementById('sozGruppeName');
  var typ = document.getElementById('sozGruppeTyp');
  var date = document.getElementById('sozGruppeDatum');
  var name = n ? n.value.trim() : '';
  if (!name) { showToast('Gib deinem gemeinsamen Event einen Namen.', 'info'); if (n) n.focus(); return; }
  var uid = String(currentUser.id);
  var draft = _groupPlanningDraft;
  var friends = Array.from(document.querySelectorAll('#sozPlanFreunde input:checked')).map(function (el) { return Number(el.value); });
  var button = n.closest('.soz-formular').querySelector('button');
  _groupPlanningSaving = true;
  if (button) { button.disabled = true; button.textContent = 'Plan wird erstellt …'; }
  var group = null;
  try {
    var data = await sozialRuf('social/gruppen', 'POST', { name: name, eventType: typ ? typ.value : '', eventDate: date ? date.value : '' });
    if (!currentUser || String(currentUser.id) !== uid) return;
    group = data.group;
    if (!group || !Number.isInteger(Number(group.id)) || Number(group.id) < 1) throw new Error('Die Gruppe wurde nicht bestätigt. Bitte lade deine Gruppen neu, bevor du es erneut versuchst.');
    _groupPlanningDraft = null;
    if (draft && draft.boardId) {
      var project = (_boardProjects || []).find(function(p) { return p.id === draft.boardId; });
      if (project) { project.groupId = Number(group.id); _saveBoardProjects(); }
    }
    _sozialPlanOffen = Number(group.id);
    _sozialReiter = 'gruppen';
    var warnings = [];
    for (var id of friends) {
      if (!currentUser || String(currentUser.id) !== uid) return;
      try { await sozialRuf('social/gruppen/' + group.id + '/einladen', 'POST', { userId: id }); }
      catch (e) { warnings.push('Eine Einladung konnte nicht gesendet werden. Lade die Person im Plan erneut ein.'); }
    }
    for (var item of sozialPlanStartposten(draft)) {
      if (!currentUser || String(currentUser.id) !== uid) return;
      try { await sozialRuf('social/gruppen/' + group.id + '/plan', 'POST', item); }
      catch (e) { warnings.push('Eine Idee konnte nicht übernommen werden. Du kannst sie im Plan ergänzen.'); }
    }
    await sozialLaden(true);
    await sozialPlanLaden(Number(group.id));
    if (!currentUser || String(currentUser.id) !== uid) return;
    renderFreundePage();
    history.replaceState({page:'freunde',data:Number(group.id)}, '', _spaPath('freunde',group.id));
    var plan = document.getElementById('sozPlan' + group.id);
    if (plan) plan.scrollIntoView({block:'start'});
    showToast(warnings.length ? 'Plan erstellt. ' + warnings[0] : 'Dein gemeinsamer Plan ist bereit.', warnings.length ? 'info' : 'check_circle');
  } catch (e) { sozialFehler(e); }
  finally {
    _groupPlanningSaving = false;
    if (button && button.isConnected) { button.disabled = false; button.textContent = 'Plan erstellen'; }
  }
}

function sozialEinladungKopieren(gid) {
  var group = ((_sozialGruppen && _sozialGruppen.groups) || []).find(function (g) { return Number(g.id) === Number(gid); });
  if (!group || !group.inviteCode || !['owner','admin'].includes(group.role)) return;
  var url = new URL(_spaPath('freunde', 'einladung'), location.origin);
  url.searchParams.set('einladung', group.inviteCode);
  if (!navigator.clipboard || !navigator.clipboard.writeText) {
    showToast('Kopiere den angezeigten Einladungscode und teile ihn mit deinen Freunden.', 'info'); return;
  }
  navigator.clipboard.writeText(url.href).then(function () {
    showToast('Einladungslink kopiert. Teile ihn nur mit Personen, die mitplanen dürfen.', 'check_circle');
  }).catch(function () { showToast('Kopieren nicht möglich. Du kannst den Einladungscode markieren und kopieren.', 'info'); });
}

function sozialChatStarten(uid) {
  if (!currentUser) { openModal('loginModal'); return; }
  return sozialRuf('conversations', 'POST', { other_user_id: Number(uid) }).then(function (data) {
    if (!Number(data.id)) throw new Error('Der Chat konnte nicht geöffnet werden.');
    return Promise.resolve(navigateTo('messages')).then(function () { openChat(Number(data.id)); });
  }).catch(sozialFehler);
}

function renderOwnProfileHub(pid) {
  var old = document.getElementById('ownProfileHub');
  if (old) old.remove();
  if (!currentUser || String(currentUser.id) !== String(pid)) return;
  var bar = document.querySelector('.provider-action-bar');
  if (!bar) return;
  var provider = typeof isDienstleister === 'function' && isDienstleister();
  var actions = provider ? [
    ['assignment','Aufträge','Anfragen und Termine','auftraege'],
    ['insights','Einnahmen','Umsätze und Zahlungen','business'],
    ['storefront','Meine Angebote','Leistungen verwalten','my-listings'],
  ] : [
    ['dashboard','Meine Planung','Ideen, Budget und Aufgaben','board'],
    ['favorite_border','Merkliste','Gespeicherte Leistungen','favorites'],
  ];
  actions.push(['groups','Freunde & Gruppen','Zusammen etwas erleben','freunde'],['chat_bubble_outline','Nachrichten','Absprechen und Angebote klären','messages']);
  var hub = document.createElement('section');
  hub.id = 'ownProfileHub';
  hub.className = 'journey-profile-hub';
  hub.setAttribute('aria-label', 'Mein Bereich');
  hub.innerHTML = '<h2>Mein Bereich</h2><div class="journey-actions">' + actions.map(function (a) {
    return '<button type="button" onclick="navigateTo(\'' + a[3] + '\')"><span class="material-icons-round">' + a[0]
      + '</span><span><strong>' + a[1] + '</strong><small>' + a[2] + '</small></span><span class="material-icons-round">chevron_right</span></button>';
  }).join('') + '</div>';
  bar.insertAdjacentElement('afterend',hub);
}
