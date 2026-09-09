/* ══════════════════════════════════════════════════════════════════
   FREUNDE UND GRUPPEN — gemeinsame Vorhaben

   „Seine Freunde suchen und Gruppen für Events zusammenstellen können
   für ein gemeinsames Vorhaben."

   Die Regeln stehen im Backend (`includes/social/`), nicht hier. Diese
   Datei zeigt an und schickt ab; sie entscheidet nichts. Wer eine
   Berechtigung im Browser prüft und daraus schliesst, sie sei geprüft,
   hat sie nicht geprüft — der Browser gehört dem Nutzer.

   Was hier trotzdem geschieht: die Oberfläche BLENDET AUS, was der
   Server ohnehin ablehnen würde. Das ist Höflichkeit, kein Schutz, und
   der Unterschied steht hier, damit ihn niemand verwechselt.

   ── FREMDER TEXT BLEIBT TEXT ──────────────────────────────────────

   Gruppennamen und Anzeigenamen kommen von anderen Nutzern. Der Server
   entschärft sie beim Anlegen; hier wird jedes Feld ERNEUT maskiert.
   Zwei Schichten, dieselbe Begründung wie beim Aktivitäten-Bestand:
   eine Antwort kann veraltet oder verfälscht sein.
   ══════════════════════════════════════════════════════════════════ */

var _sozialStand = null;          // { handle, friends, incoming, outgoing, blocked }
var _sozialGruppen = null;        // { groups, invitations }
var _sozialReiter = 'freunde';    // 'freunde' | 'gruppen'
var _sozialTreffer = [];
var _sozialLaeuft = false;

/** Eine Antwort holen — Fehler enden IMMER sichtbar, nie in der Konsole. */
function sozialRuf(pfad, methode, rumpf) {
  var opt = { method: methode || 'GET', headers: _apiHeaders(), credentials: 'same-origin' };
  if (rumpf) opt.body = JSON.stringify(rumpf);
  return fetch(_apiUrl(pfad), opt).then(function (r) {
    return r.json().catch(function () { return {}; }).then(function (d) {
      if (!r.ok) {
        var e = new Error(d && d.message ? d.message : 'Das hat nicht geklappt.');
        e.code = d && d.error;
        e.status = r.status;
        throw e;
      }
      return d;
    });
  });
}

/** Ein Fehler wird gezeigt, nicht verschluckt. */
function sozialFehler(e) {
  showToast((e && e.message) || 'Das hat nicht geklappt.', 'error_outline');
}

/* ── Anzeige ──────────────────────────────────────────────────────── */

function sozialPersonZeile(p, knoepfe) {
  return '<div class="soz-person">'
    + '<img class="soz-avatar" src="' + _escHtml(String(p.photoUrl || '')) + '" alt="" loading="lazy">'
    + '<div class="soz-person-text">'
    + '<strong>' + _escHtml(String(p.name || 'Nutzer')) + '</strong>'
    + (p.handle ? '<small>@' + _escHtml(String(p.handle)) + '</small>' : '')
    + (p.role ? '<small class="soz-rolle">' + _escHtml(sozialRolleName(p.role)) + '</small>' : '')
    + '</div>'
    + '<div class="soz-person-aktion">' + (knoepfe || '') + '</div>'
    + '</div>';
}

function sozialRolleName(rolle) {
  if (rolle === 'owner') return 'Leitung';
  if (rolle === 'admin') return 'Verwaltung';
  if (rolle === 'invited') return 'eingeladen';
  return 'Mitglied';
}

/**
 * Der Handle-Kasten.
 *
 * Er steht ganz oben und sagt in Worten, was das Setzen bedeutet. Ein
 * Feld ohne diesen Satz wäre eine Einwilligung, die niemand als solche
 * erkennt — und damit keine.
 */
function sozialHandleKasten() {
  var h = (_sozialStand && _sozialStand.handle) || '';
  return '<section class="soz-karte soz-handle">'
    + '<h3><span class="material-icons-round">alternate_email</span> Dein Suchname</h3>'
    + '<p>Nur wer einen Suchnamen hat, kann von Freunden gefunden werden. '
    + 'Ohne ihn bist du <strong>nicht auffindbar</strong> — auch nicht über deinen Namen '
    + 'oder deine E-Mail-Adresse. Du kannst ihn jederzeit wieder löschen.</p>'
    + '<div class="soz-handle-zeile">'
    + '<span class="soz-at">@</span>'
    + '<input type="text" id="sozHandle" value="' + _escHtml(h) + '" maxlength="24" '
    + 'placeholder="z. B. anna.b" autocomplete="off" spellcheck="false" '
    + 'aria-label="Dein Suchname">'
    + '<button type="button" class="btn-primary" onclick="sozialHandleSpeichern()">Speichern</button>'
    + (h ? '<button type="button" class="btn-outline" onclick="sozialHandleLoeschen()">Löschen</button>' : '')
    + '</div>'
    + '<small class="soz-hinweis">3–24 Zeichen: Kleinbuchstaben, Ziffern, Punkt, Unterstrich.</small>'
    + '</section>';
}

function sozialFreundeAnsicht() {
  var s = _sozialStand || { friends: [], incoming: [], outgoing: [], blocked: [] };
  var html = sozialHandleKasten();

  html += '<section class="soz-karte">'
    + '<h3><span class="material-icons-round">person_search</span> Freunde finden</h3>'
    + '<div class="soz-suche-zeile">'
    + '<span class="soz-at">@</span>'
    + '<input type="text" id="sozSuche" placeholder="Suchname eingeben" autocomplete="off" '
    + 'spellcheck="false" aria-label="Nach Suchname suchen" '
    + 'onkeydown="if(event.key===\'Enter\'){event.preventDefault();sozialSuchen();}">'
    + '<button type="button" class="btn-primary" onclick="sozialSuchen()">Suchen</button>'
    + '</div>'
    + '<div id="sozTreffer" class="soz-liste"></div>'
    + '</section>';

  if (s.incoming.length) {
    html += '<section class="soz-karte"><h3><span class="material-icons-round">mark_email_unread</span> '
      + 'Anfragen an dich (' + s.incoming.length + ')</h3><div class="soz-liste">'
      + s.incoming.map(function (p) {
        return sozialPersonZeile(p,
          '<button type="button" class="btn-primary" onclick="sozialAntwort(' + p.id + ',true)">Annehmen</button>'
          + '<button type="button" class="btn-outline" onclick="sozialAntwort(' + p.id + ',false)">Ablehnen</button>');
      }).join('') + '</div></section>';
  }

  if (s.outgoing.length) {
    html += '<section class="soz-karte"><h3><span class="material-icons-round">schedule_send</span> '
      + 'Gesendet (' + s.outgoing.length + ')</h3><div class="soz-liste">'
      + s.outgoing.map(function (p) {
        return sozialPersonZeile(p,
          '<button type="button" class="btn-outline" onclick="sozialEntfernen(' + p.id + ')">Zurückziehen</button>');
      }).join('') + '</div></section>';
  }

  html += '<section class="soz-karte"><h3><span class="material-icons-round">group</span> '
    + 'Deine Freunde (' + s.friends.length + ')</h3>';
  if (!s.friends.length) {
    html += '<p class="soz-leer">Noch niemand. Such jemanden über seinen Suchnamen — '
      + 'oder gib deinen weiter, damit man dich findet.</p>';
  } else {
    html += '<div class="soz-liste">' + s.friends.map(function (p) {
      return sozialPersonZeile(p,
        '<button type="button" class="btn-outline" onclick="sozialEntfernen(' + p.id + ')">Entfernen</button>'
        + '<button type="button" class="btn-outline soz-sperr" onclick="sozialSperren(' + p.id + ')">Sperren</button>');
    }).join('') + '</div>';
  }
  html += '</section>';

  if (s.blocked.length) {
    html += '<section class="soz-karte"><h3><span class="material-icons-round">block</span> '
      + 'Gesperrt (' + s.blocked.length + ')</h3>'
      + '<p class="soz-hinweis">Gesperrte können dich nicht anfragen und finden dich nicht in der Suche. '
      + 'Sie erfahren davon nichts.</p>'
      + '<div class="soz-liste">' + s.blocked.map(function (p) {
        return sozialPersonZeile(p,
          '<button type="button" class="btn-outline" onclick="sozialEntsperren(' + p.id + ')">Entsperren</button>');
      }).join('') + '</div></section>';
  }

  return html;
}

function sozialGruppenAnsicht() {
  var g = _sozialGruppen || { groups: [], invitations: [] };
  var html = '';

  html += '<section class="soz-karte">'
    + '<h3><span class="material-icons-round">group_work</span> Neue Gruppe</h3>'
    + '<p>Eine Gruppe ist ein gemeinsames Vorhaben — eine Hochzeit, ein Festival, '
    + 'ein Betriebsausflug. Wer dabei ist, plant mit.</p>'
    + '<div class="soz-formular">'
    + '<input type="text" id="sozGruppeName" maxlength="120" placeholder="Name, z. B. „Hochzeit Anna & Ben“" aria-label="Name der Gruppe">'
    + '<input type="text" id="sozGruppeTyp" maxlength="60" placeholder="Anlass (optional)" aria-label="Anlass">'
    + '<input type="date" id="sozGruppeDatum" aria-label="Datum (optional)">'
    + '<button type="button" class="btn-primary" onclick="sozialGruppeAnlegen()">'
    + '<span class="material-icons-round">add</span> Anlegen</button>'
    + '</div>'
    + '<div class="soz-beitritt">'
    + '<input type="text" id="sozCode" maxlength="18" placeholder="Einladungscode" autocomplete="off" '
    + 'spellcheck="false" aria-label="Einladungscode">'
    + '<button type="button" class="btn-outline" onclick="sozialBeitreten()">Beitreten</button>'
    + '</div>'
    + '</section>';

  if (g.invitations.length) {
    html += '<section class="soz-karte"><h3><span class="material-icons-round">mail</span> '
      + 'Einladungen (' + g.invitations.length + ')</h3><div class="soz-liste">'
      + g.invitations.map(function (gr) {
        return '<div class="soz-gruppe soz-gruppe-einladung">'
          + '<div class="soz-gruppe-kopf"><strong>' + _escHtml(String(gr.name)) + '</strong>'
          + '<small>' + _escHtml(sozialGruppeUnterzeile(gr)) + '</small></div>'
          + '<div class="soz-person-aktion">'
          + '<button type="button" class="btn-primary" onclick="sozialEinladungAnnehmen(' + gr.id + ')">Annehmen</button>'
          + '<button type="button" class="btn-outline" onclick="sozialGruppeVerlassen(' + gr.id + ')">Ablehnen</button>'
          + '</div></div>';
      }).join('') + '</div></section>';
  }

  html += '<section class="soz-karte"><h3><span class="material-icons-round">groups</span> '
    + 'Deine Gruppen (' + g.groups.length + ')</h3>';
  if (!g.groups.length) {
    html += '<p class="soz-leer">Noch keine Gruppe. Leg eine an — oder tritt einer über '
      + 'ihren Einladungscode bei.</p>';
  } else {
    html += g.groups.map(sozialGruppenKarte).join('');
  }
  html += '</section>';
  return html;
}

function sozialGruppeUnterzeile(gr) {
  var teile = [];
  if (gr.eventType) teile.push(String(gr.eventType));
  if (gr.eventDate) teile.push(sozialDatum(gr.eventDate));
  teile.push(gr.memberCount + (gr.memberCount === 1 ? ' Person' : ' Personen'));
  if (gr.owner && gr.owner.name) teile.push('von ' + String(gr.owner.name));
  return teile.join(' · ');
}

function sozialDatum(iso) {
  var d = new Date(String(iso) + 'T12:00:00');
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function sozialGruppenKarte(gr) {
  var darf = gr.role === 'owner' || gr.role === 'admin';
  var html = '<div class="soz-gruppe">'
    + '<div class="soz-gruppe-kopf">'
    + '<strong>' + _escHtml(String(gr.name)) + '</strong>'
    + '<small>' + _escHtml(sozialGruppeUnterzeile(gr)) + '</small>'
    + '</div>'
    + '<div class="soz-liste soz-mitglieder">'
    + (gr.members || []).map(function (m) {
      var k = '';
      // Die Leitung ist nicht entfernbar — der Server lehnt das ohnehin
      // ab; hier wird der Knopf gar nicht erst gezeigt.
      if (darf && m.id !== gr.ownerId) {
        k += '<button type="button" class="btn-outline" onclick="sozialGruppeWerfen(' + gr.id + ',' + m.id + ')" '
          + 'aria-label="Entfernen">Entfernen</button>';
      }
      if (gr.role === 'owner' && m.id !== gr.ownerId && m.role !== 'invited') {
        k += '<button type="button" class="btn-outline" onclick="sozialGruppeRolle(' + gr.id + ',' + m.id + ',\''
          + (m.role === 'admin' ? 'member' : 'admin') + '\')">'
          + (m.role === 'admin' ? 'Verwaltung ab' : 'Verwaltung') + '</button>';
      }
      return sozialPersonZeile(m, k);
    }).join('')
    + '</div>';

  if (darf) {
    var freunde = ((_sozialStand && _sozialStand.friends) || []).filter(function (f) {
      return !(gr.members || []).some(function (m) { return m.id === f.id; });
    });
    html += '<div class="soz-gruppe-verwalten">';
    if (freunde.length) {
      html += '<label class="soz-einladen">Einladen: '
        + '<select id="sozEinladen' + gr.id + '" aria-label="Freund einladen">'
        + freunde.map(function (f) {
          return '<option value="' + f.id + '">' + _escHtml(String(f.name)) + '</option>';
        }).join('')
        + '</select>'
        + '<button type="button" class="btn-outline" onclick="sozialEinladen(' + gr.id + ')">Einladen</button>'
        + '</label>';
    } else {
      html += '<p class="soz-hinweis">Einladen kannst du nur Freunde. '
        + 'Alle deine Freunde sind schon dabei — oder du hast noch keine.</p>';
    }
    if (gr.inviteCode) {
      html += '<div class="soz-code">'
        + '<span class="soz-hinweis">Einladungscode</span>'
        + '<code>' + _escHtml(String(gr.inviteCode)) + '</code>'
        + '<button type="button" class="btn-outline" onclick="sozialCodeNeu(' + gr.id + ')">Neu ziehen</button>'
        + '</div>';
    }
    html += '</div>';
  }

  html += '<div class="soz-gruppe-fuss">'
    + '<button type="button" class="btn-primary" onclick="sozialGruppePlanen(' + gr.id + ')">'
    + '<span class="material-icons-round">dashboard</span> Vorhaben planen</button>'
    + '<button type="button" class="btn-outline" onclick="sozialGruppeVerlassen(' + gr.id + ')">Verlassen</button>'
    + '</div></div>';
  return html;
}

/* ── Zeichnen ─────────────────────────────────────────────────────── */

function renderFreundePage() {
  var el = document.getElementById('freundeInhalt');
  if (!el) return;

  if (!currentUser) {
    el.innerHTML = '<section class="soz-karte soz-leer-karte">'
      + '<span class="material-icons-round">lock</span>'
      + '<h3>Dafür brauchst du ein Konto.</h3>'
      + '<p>Freunde und Gruppen gehören zu deinem Konto — ohne Anmeldung gibt es '
      + 'niemanden, dem sie gehören könnten.</p>'
      + '<button type="button" class="btn-primary" onclick="openModal(\'loginModal\')">Anmelden</button>'
      + '</section>';
    return;
  }

  if (_sozialLaeuft && !_sozialStand) {
    el.innerHTML = '<p class="soz-laedt">Wird geladen …</p>';
    return;
  }
  if (!_sozialStand) {
    el.innerHTML = '<section class="soz-karte soz-leer-karte">'
      + '<span class="material-icons-round">cloud_off</span>'
      + '<h3>Das konnte nicht geladen werden.</h3>'
      + '<p>Das ist eine Störung bei uns, nicht bei dir.</p>'
      + '<button type="button" class="btn-outline" onclick="sozialLaden(true)">Erneut versuchen</button>'
      + '</section>';
    return;
  }

  var anfragen = _sozialStand.incoming.length;
  var einladungen = (_sozialGruppen && _sozialGruppen.invitations.length) || 0;
  el.innerHTML = '<div class="soz-reiter" role="tablist">'
    + '<button type="button" role="tab" class="soz-reiter-knopf' + (_sozialReiter === 'freunde' ? ' aktiv' : '')
    + '" aria-selected="' + (_sozialReiter === 'freunde') + '" onclick="sozialReiter(\'freunde\')">'
    + '<span class="material-icons-round">group</span> Freunde'
    + (anfragen ? '<span class="soz-punkt">' + anfragen + '</span>' : '') + '</button>'
    + '<button type="button" role="tab" class="soz-reiter-knopf' + (_sozialReiter === 'gruppen' ? ' aktiv' : '')
    + '" aria-selected="' + (_sozialReiter === 'gruppen') + '" onclick="sozialReiter(\'gruppen\')">'
    + '<span class="material-icons-round">groups</span> Gruppen'
    + (einladungen ? '<span class="soz-punkt">' + einladungen + '</span>' : '') + '</button>'
    + '</div>'
    + (_sozialReiter === 'freunde' ? sozialFreundeAnsicht() : sozialGruppenAnsicht());

  if (_sozialReiter === 'freunde') sozialTrefferZeichnen();
}

function sozialReiter(name) {
  _sozialReiter = name === 'gruppen' ? 'gruppen' : 'freunde';
  renderFreundePage();
}

/* ── Laden und Handlungen ─────────────────────────────────────────── */

function sozialLaden(neu) {
  if (!currentUser) { renderFreundePage(); return Promise.resolve(); }
  if (_sozialStand && !neu) { renderFreundePage(); return Promise.resolve(); }
  _sozialLaeuft = true;
  renderFreundePage();
  return Promise.all([
    sozialRuf('social/freunde'),
    sozialRuf('social/gruppen'),
    sozialRuf('social/ich'),
  ]).then(function (a) {
    _sozialStand = { handle: a[2].handle || '', friends: a[0].friends || [],
      incoming: a[0].incoming || [], outgoing: a[0].outgoing || [], blocked: a[0].blocked || [] };
    _sozialGruppen = { groups: a[1].groups || [], invitations: a[1].invitations || [] };
  }).catch(function () {
    // Ein Fehler löscht den Stand, damit die Ansicht ihn als Störung
    // zeigt — nicht als leere Liste. Eine leere Liste sähe aus wie
    // „du hast keine Freunde", und das wäre eine Falschaussage.
    _sozialStand = null;
    _sozialGruppen = null;
  }).then(function () {
    _sozialLaeuft = false;
    renderFreundePage();
  });
}

function sozialHandleSpeichern() {
  var el = document.getElementById('sozHandle');
  if (!el) return;
  sozialRuf('social/handle', 'POST', { handle: el.value })
    .then(function (d) {
      _sozialStand.handle = d.handle || '';
      showToast(d.handle ? 'Du bist jetzt als @' + d.handle + ' auffindbar.'
        : 'Du bist nicht mehr auffindbar.', 'check_circle');
      renderFreundePage();
    })
    .catch(sozialFehler);
}

function sozialHandleLoeschen() {
  sozialRuf('social/handle', 'POST', { handle: '' })
    .then(function () {
      _sozialStand.handle = '';
      showToast('Du bist nicht mehr auffindbar.', 'check_circle');
      renderFreundePage();
    })
    .catch(sozialFehler);
}

function sozialSuchen() {
  var el = document.getElementById('sozSuche');
  var q = el ? String(el.value || '').trim().toLowerCase().replace(/^@/, '') : '';
  if (q.length < 3) {
    _sozialTreffer = [];
    sozialTrefferZeichnen('Mindestens drei Zeichen.');
    return;
  }
  sozialRuf('social/suche?q=' + encodeURIComponent(q))
    .then(function (d) {
      _sozialTreffer = d.results || [];
      sozialTrefferZeichnen(_sozialTreffer.length ? '' : 'Niemand gefunden.');
    })
    .catch(function (e) { sozialFehler(e); sozialTrefferZeichnen('Das hat nicht geklappt.'); });
}

function sozialTrefferZeichnen(meldung) {
  var el = document.getElementById('sozTreffer');
  if (!el) return;
  if (!_sozialTreffer.length) {
    el.innerHTML = meldung ? '<p class="soz-leer">' + _escHtml(String(meldung)) + '</p>' : '';
    return;
  }
  el.innerHTML = _sozialTreffer.map(function (p) {
    var k;
    if (p.state === 'accepted') k = '<span class="soz-status">Befreundet</span>';
    else if (p.state === 'pending') k = '<span class="soz-status">Anfrage läuft</span>';
    else k = '<button type="button" class="btn-primary" onclick="sozialAnfragen(' + p.id + ')">Anfragen</button>';
    return sozialPersonZeile(p, k);
  }).join('');
}

function sozialAnfragen(id) {
  sozialRuf('social/freunde/anfragen', 'POST', { userId: id })
    .then(function () { showToast('Anfrage gesendet.', 'check_circle'); return sozialLaden(true); })
    .then(function () { sozialSuchen(); })
    .catch(sozialFehler);
}

function sozialAntwort(id, annehmen) {
  sozialRuf('social/freunde/antwort', 'POST', { userId: id, annehmen: !!annehmen })
    .then(function () {
      showToast(annehmen ? 'Ihr seid jetzt befreundet.' : 'Anfrage abgelehnt.', 'check_circle');
      return sozialLaden(true);
    })
    .catch(sozialFehler);
}

function sozialEntfernen(id) {
  sozialRuf('social/freunde/entfernen', 'POST', { userId: id })
    .then(function () { return sozialLaden(true); })
    .catch(sozialFehler);
}

function sozialSperren(id) {
  sozialRuf('social/freunde/sperren', 'POST', { userId: id, sperren: true })
    .then(function () { showToast('Gesperrt. Die Person erfährt davon nichts.', 'check_circle'); return sozialLaden(true); })
    .catch(sozialFehler);
}

function sozialEntsperren(id) {
  sozialRuf('social/freunde/sperren', 'POST', { userId: id, sperren: false })
    .then(function () { return sozialLaden(true); })
    .catch(sozialFehler);
}

function sozialGruppeAnlegen() {
  var n = document.getElementById('sozGruppeName');
  var t = document.getElementById('sozGruppeTyp');
  var d = document.getElementById('sozGruppeDatum');
  sozialRuf('social/gruppen', 'POST', {
    name: n ? n.value : '',
    eventType: t ? t.value : '',
    eventDate: d ? d.value : '',
  })
    .then(function () { showToast('Gruppe angelegt.', 'check_circle'); return sozialLaden(true); })
    .catch(sozialFehler);
}

function sozialBeitreten() {
  var el = document.getElementById('sozCode');
  sozialRuf('social/gruppen/beitreten', 'POST', { code: el ? el.value : '' })
    .then(function () { showToast('Du bist dabei.', 'check_circle'); return sozialLaden(true); })
    .catch(sozialFehler);
}

function sozialEinladen(gid) {
  var sel = document.getElementById('sozEinladen' + gid);
  if (!sel || !sel.value) return;
  sozialRuf('social/gruppen/' + gid + '/einladen', 'POST', { userId: parseInt(sel.value, 10) })
    .then(function () { showToast('Eingeladen.', 'check_circle'); return sozialLaden(true); })
    .catch(sozialFehler);
}

function sozialEinladungAnnehmen(gid) {
  sozialRuf('social/gruppen/' + gid + '/annehmen', 'POST', {})
    .then(function () { showToast('Du bist dabei.', 'check_circle'); return sozialLaden(true); })
    .catch(sozialFehler);
}

function sozialGruppeVerlassen(gid) {
  sozialRuf('social/gruppen/' + gid + '/verlassen', 'POST', {})
    .then(function () { return sozialLaden(true); })
    .catch(sozialFehler);
}

function sozialGruppeWerfen(gid, uid) {
  sozialRuf('social/gruppen/' + gid + '/entfernen', 'POST', { userId: uid })
    .then(function () { return sozialLaden(true); })
    .catch(sozialFehler);
}

function sozialGruppeRolle(gid, uid, rolle) {
  sozialRuf('social/gruppen/' + gid + '/rolle', 'POST', { userId: uid, role: rolle })
    .then(function () { return sozialLaden(true); })
    .catch(sozialFehler);
}

function sozialCodeNeu(gid) {
  sozialRuf('social/gruppen/' + gid + '/code', 'POST', {})
    .then(function () { showToast('Neuer Code — der alte gilt nicht mehr.', 'check_circle'); return sozialLaden(true); })
    .catch(sozialFehler);
}

/**
 * Vom gemeinsamen Vorhaben ins Board.
 *
 * Der geteilte Plan selbst ist noch nicht gebaut — und dieser Knopf
 * behauptet auch nicht, dass er es wäre. Er legt ein Board-Projekt mit
 * Name und Datum der Gruppe an; geplant wird darin bis auf Weiteres von
 * einer Person. Das ehrlich zu benennen ist billiger, als es später
 * zurückzunehmen.
 */
function sozialGruppePlanen(gid) {
  var gr = ((_sozialGruppen && _sozialGruppen.groups) || []).filter(function (g) { return g.id === gid; })[0];
  if (!gr) return;
  try {
    if (typeof ebBoardProjektAusGruppe === 'function') {
      ebBoardProjektAusGruppe(gr);
      return;
    }
  } catch (e) { /* faellt unten durch */ }
  showToast('Der gemeinsame Plan kommt als Nächstes. Bis dahin planst du im Board.', 'info');
  navigateTo('board');
}
