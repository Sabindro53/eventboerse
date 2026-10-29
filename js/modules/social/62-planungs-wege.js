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
    // ── DER ORT DARF NICHT VERFALLEN ──────────────────────────────────
    //
    // Der Entwurf trägt `location` (die Stadt der Aktivität), und das
    // Gruppenformular hat kein Ortsfeld — `eb_groups` auch keine Spalte
    // dafür. Die Angabe ging damit still verloren: der Planer hatte
    // gerade etwas in Köln angeklickt und fand im Plan nur den Titel.
    //
    // Sie kommt deshalb in den Posten, wo sie ohnehin hingehört und wo
    // es ein Feld dafür gibt. Eine Spalte an `eb_groups` wäre eine
    // Schema-Änderung mit Versionssprung — für eine Angabe, die am
    // einzelnen Vorhaben mehr sagt als an der Gruppe, und eine
    // Migration ist hier schon einmal beinahe teuer geworden.
    var quelle = draft.sourceUrl || (draft.activity && draft.activity.sourceUrl) || '';
    var ort = String(draft.location || '').trim();
    var teile = [];
    if (ort) teile.push('Ort: ' + ort);
    teile.push(quelle
      ? 'Externe Aktivität: ' + quelle + ' · Informationen beim Veranstalter prüfen.'
      : 'Gemeinsame Event-Idee');
    result.push({
      titel: String(draft.title).slice(0,120),
      // Die Kategorie ist im Bestand bereits ein deutsches Wort; die
      // Plan-Route nimmt `kategorie` mit 60 Zeichen.
      kategorie: String((draft.activity && draft.activity.kategorie) || draft.eventType || '').slice(0,60),
      notiz: teile.join(' · ').slice(0,500),
    });
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

/* ── Einladen ohne Konto (PRODUCT_REDESIGN.md 6.2, Teil A) ──────────────
 * Vorher: der Link führte Menschen ohne Konto auf „Dafür brauchst du ein
 * Konto." mit einem Anmelde-Knopf — ohne zu sagen, dass sie eingeladen
 * sind, ohne Registrierung, und nach der Anmeldung mussten sie Code-Feld
 * und „Beitreten" selbst finden.
 *
 * Drei Grenzen:
 *  1. Eventbörse verschickt nichts. WhatsApp, Mail und SMS öffnen die App
 *     des Einladenden; die Adresse der eingeladenen Person erreicht unseren
 *     Server nie (keine Daten Dritter, kein Werbe-Mail-Versand).
 *  2. Kein stilles Beitreten — erst der Klick schickt den Code.
 *  3. Gruppendaten erst nach der Anmeldung (Entscheidung E2 des Inhabers).
 * Der Code lebt nur in der Adresse; es gibt keinen neuen Speicherschlüssel. */
var EB_EINLADUNG_MUSTER = /^[a-f0-9]{18}$/;
var _ebEinladungUngueltig = false;
var _ebEinladenAuslöser = null;

/** Der Code aus der Adresse — nur in der Form, die der Server vergibt. */
function ebEinladungsCode() {
  var c = '';
  try { c = new URLSearchParams(location.search).get('einladung') || ''; } catch (e) {}
  return EB_EINLADUNG_MUSTER.test(c) ? c : '';
}

function ebEinladungsLink(code) {
  var url = new URL(_spaPath('freunde', 'einladung'), location.origin);
  url.searchParams.set('einladung', code);
  return url.href;
}

/** Der vorbereitete Satz — ohne Link, der kommt je nach Weg dazu. */
function ebEinladungsSatz(gruppe) {
  var wer = (currentUser && currentUser.name) ? String(currentUser.name) : 'Jemand';
  return wer + ' lädt dich ein, „' + String(gruppe.name || 'unser Event') + '" gemeinsam auf Eventbörse zu planen. '
    + 'Kostenlos registrieren und mitmachen:';
}

function _ebEinladungAusAdresse() {
  try {
    var u = new URL(location.href);
    u.searchParams.delete('einladung');
    history.replaceState(history.state, '', u.pathname + u.search + u.hash);
  } catch (e) {}
}

function _ebEinladenGruppe(gid) {
  return ((_sozialGruppen && _sozialGruppen.groups) || []).find(function (g) { return Number(g.id) === Number(gid); });
}

/** Ansicht für Menschen ohne Konto, die über einen Einladungslink kommen. */
function ebEinladungOhneKontoHtml() {
  return '<section class="soz-karte soz-leer-karte soz-einladung-karte">'
    + '<span class="material-icons-round" aria-hidden="true">celebration</span>'
    + '<h3>Du bist eingeladen!</h3>'
    + '<p>Jemand möchte ein Event gemeinsam mit dir auf Eventbörse planen. Registriere dich kostenlos — '
    + 'danach siehst du die Gruppe und entscheidest selbst, ob du mitmachst.</p>'
    + '<div class="soz-einladung-knoepfe">'
    + '<button type="button" class="btn-primary" onclick="sozialEinladungRegistrieren()">Kostenlos registrieren</button>'
    + '<button type="button" class="btn-outline" onclick="openModal(\'loginModal\')">Ich habe schon ein Konto</button>'
    + '</div>'
    + '<p class="soz-hinweis">Eventbörse ist ein Marktplatz für Events — von der ersten Idee bis zum gebuchten Dienstleister.</p>'
    + '</section>';
}

/** Die Bestätigung nach der Anmeldung — oder die Absage für einen alten Link. */
function ebEinladungsKarteHtml() {
  if (_ebEinladungUngueltig) {
    return '<section class="soz-karte soz-einladung-karte" role="status">'
      + '<h3><span class="material-icons-round" aria-hidden="true">link_off</span> Diese Einladung gilt nicht mehr.</h3>'
      + '<p>Bitte frag nach einem neuen Link. Einladungen laufen nach 14 Tagen ab oder werden erneuert.</p>'
      + '<div class="soz-einladung-knoepfe">'
      + '<button type="button" class="btn-outline" onclick="sozialEinladungSchliessen();navigateTo(\'explore\')">Entdecken</button>'
      + '<button type="button" class="btn-outline" onclick="sozialEinladungSchliessen()">Schließen</button>'
      + '</div></section>';
  }
  if (!ebEinladungsCode()) return '';
  return '<section class="soz-karte soz-einladung-karte">'
    + '<h3><span class="material-icons-round" aria-hidden="true">group_add</span> Du wurdest in eine Gruppe eingeladen</h3>'
    + '<p>Tritt bei, um den gemeinsamen Plan zu sehen und mitzuplanen.</p>'
    + '<div class="soz-einladung-knoepfe">'
    + '<button type="button" class="btn-primary" id="sozEinladungBeitreten" onclick="sozialEinladungBeitreten()">Gruppe beitreten</button>'
    + '<button type="button" class="btn-outline" onclick="sozialEinladungSpaeter()">Später</button>'
    + '</div></section>';
}

function sozialEinladungRegistrieren() {
  openModal('registerModal');
  // Eingeladene planen mit: die Registrierung steht auf Eventplaner.
  var b = document.querySelector('#registerModal .role-btn[data-role="user"]');
  if (b && typeof selectRole === 'function') selectRole(b, 'user');
}

function sozialEinladungBeitreten() {
  var code = ebEinladungsCode();
  if (!code) return Promise.resolve();
  var btn = document.getElementById('sozEinladungBeitreten');
  if (btn) btn.disabled = true;
  return sozialRuf('social/gruppen/beitreten', 'POST', { code: code }).then(function (d) {
    _ebEinladungAusAdresse();
    var gid = Number(d && d.group && d.group.id) || 0;
    showToast('Du bist dabei.', 'check_circle');
    return sozialLaden(true).then(function () { if (gid) sozialGruppePlanen(gid); });
  }).catch(function (e) {
    // Falsch und abgelaufen sagen dasselbe (der Server antwortet für beides 404).
    if (e && (e.status === 404 || e.code === 'code_ungueltig')) {
      _ebEinladungAusAdresse();
      _ebEinladungUngueltig = true;
      renderFreundePage();
      return;
    }
    if (btn && btn.isConnected) btn.disabled = false;
    sozialFehler(e);
  });
}

function sozialEinladungSpaeter() {
  _ebEinladungAusAdresse();
  showToast('Den Einladungslink kannst du jederzeit erneut öffnen.', 'info');
  renderFreundePage();
}

function sozialEinladungSchliessen() {
  _ebEinladungUngueltig = false;
  renderFreundePage();
}

/** „Freunde einladen": Teilen über die eigenen Apps des Einladenden. */
function sozialEinladenDialog(gid, ausloeser) {
  var group = _ebEinladenGruppe(gid);
  if (!group || !group.inviteCode || !['owner', 'admin'].includes(group.role)) return;
  _sozialEinladenSchliessen();
  _ebEinladenAuslöser = ausloeser || document.activeElement;
  var link = ebEinladungsLink(group.inviteCode);
  var satz = ebEinladungsSatz(group);
  var text = satz + ' ' + link;
  var enc = encodeURIComponent;
  var weg = function (href, icon, name, fremd) {
    return '<a class="soz-teilen-weg" href="' + _escHtml(href) + '"' + (fremd ? ' target="_blank" rel="noopener noreferrer"' : '') + '>'
      + '<span class="material-icons-round" aria-hidden="true">' + icon + '</span>' + name + '</a>';
  };
  var wrap = document.createElement('div');
  wrap.id = 'sozEinladenDialog';
  wrap.className = 'soz-einladen-huelle';
  wrap.innerHTML = '<div class="soz-einladen-dialog" role="dialog" aria-modal="true" aria-labelledby="sozEinladenTitel">'
    + '<h3 id="sozEinladenTitel">Freunde einladen</h3>'
    + '<p>Wer den Link öffnet, registriert sich kostenlos und kann „' + _escHtml(String(group.name || '')) + '" beitreten. '
    + 'Die Nachricht verschickst du selbst — Eventbörse sieht keine Nummern oder Adressen.</p>'
    + '<div class="soz-teilen-wege">'
    + weg('https://wa.me/?text=' + enc(text), 'chat', 'WhatsApp', true)
    + weg('mailto:?subject=' + enc('Einladung: ' + String(group.name || 'gemeinsam planen')) + '&body=' + enc(text), 'mail', 'E-Mail', false)
    + weg('sms:?&body=' + enc(text), 'sms', 'SMS', false)
    + '<button type="button" class="soz-teilen-weg" onclick="sozialEinladungKopieren(' + Number(group.id) + ')">'
    + '<span class="material-icons-round" aria-hidden="true">content_copy</span>Link kopieren</button>'
    + (typeof navigator.share === 'function'
      ? '<button type="button" class="soz-teilen-weg" onclick="sozialEinladungTeilen(' + Number(group.id) + ')">'
        + '<span class="material-icons-round" aria-hidden="true">share</span>Teilen …</button>'
      : '')
    + '</div>'
    + '<button type="button" class="btn-outline soz-einladen-zu" onclick="_sozialEinladenSchliessen()">Schließen</button>'
    + '</div>';
  wrap.addEventListener('click', function (ev) { if (ev.target === wrap) _sozialEinladenSchliessen(); });
  document.addEventListener('keydown', _sozialEinladenTaste, true);
  document.body.appendChild(wrap);
  var erster = wrap.querySelector('.soz-teilen-weg');
  if (erster) erster.focus();
}

/* Am Dokument, nicht am Dialog: klickt jemand auf eine freie Stelle im
   Dialog, wandert der Fokus auf <body>, und ein Horcher am Dialog hörte
   Escape nicht mehr. Abgemeldet wird beim Schließen — sonst finge jeder
   spätere Escape-Druck für einen Dialog ab, den es nicht mehr gibt. */
function _sozialEinladenTaste(ev) {
  if (ev.key !== 'Escape') return;
  ev.stopPropagation();
  _sozialEinladenSchliessen();
}

function _sozialEinladenSchliessen() {
  document.removeEventListener('keydown', _sozialEinladenTaste, true);
  var w = document.getElementById('sozEinladenDialog');
  if (!w) return;
  w.remove();
  var zurueck = _ebEinladenAuslöser;
  _ebEinladenAuslöser = null;
  if (zurueck && zurueck.isConnected && typeof zurueck.focus === 'function') zurueck.focus();
}

function sozialEinladungTeilen(gid) {
  var group = _ebEinladenGruppe(gid);
  if (!group || !group.inviteCode || typeof navigator.share !== 'function') return;
  navigator.share({
    title: 'Einladung: ' + String(group.name || 'gemeinsam planen'),
    text: ebEinladungsSatz(group),
    url: ebEinladungsLink(group.inviteCode),
  }).catch(function () { /* abgebrochen — nichts zu tun */ });
}

function sozialEinladungKopieren(gid) {
  var group = _ebEinladenGruppe(gid);
  if (!group || !group.inviteCode || !['owner','admin'].includes(group.role)) return;
  var href = ebEinladungsLink(group.inviteCode);
  if (!navigator.clipboard || !navigator.clipboard.writeText) {
    showToast('Kopiere den angezeigten Einladungscode und teile ihn mit deinen Freunden.', 'info'); return;
  }
  navigator.clipboard.writeText(href).then(function () {
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
