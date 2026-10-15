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

var _sozialStand = null;          // { handle, ich, friends, incoming, outgoing, blocked }
var _sozialGruppen = null;        // { groups, invitations }
var _sozialReiter = 'freunde';    // 'freunde' | 'gruppen'
var _sozialTreffer = [];
var _sozialLaeuft = false;
var _sozialAccount = null;
var _sozialLadefolge = 0;
var _sozialSuchfolge = 0;
var _sozialLadePromise = null;
var _sozialSuchtext = '';
// Nickname und Auffindbarkeit — EINE Quelle fuer die Freunde-Seite und die
// Einstellungen. Zwei Kopien desselben Namens zeigten nach dem Speichern auf
// der einen Seite den alten, auf der anderen den neuen.
var _sozialNick = null;
var _sozialSuchmeldung = '';

/** Eine Antwort holen — Fehler enden IMMER sichtbar, nie in der Konsole. */
function sozialRuf(pfad, methode, rumpf) {
  var account = currentUser ? String(currentUser.id) : null;
  var opt = { method: methode || 'GET', headers: _apiHeaders(), credentials: 'same-origin' };
  if (rumpf) opt.body = JSON.stringify(rumpf);
  return fetch(_apiUrl(pfad), opt).then(function (r) {
    return r.json().catch(function () { return {}; }).then(function (d) {
      if ((currentUser ? String(currentUser.id) : null) !== account) {
        var changed = new Error('Dein Konto hat sich geändert. Bitte öffne die Ansicht erneut.');
        changed.code = 'account_changed'; throw changed;
      }
      if (!r.ok) {
        var e = new Error(d && d.message ? d.message : 'Das hat nicht geklappt.');
        e.code = d && d.error;
        e.status = r.status;
        // Der Rumpf bleibt am Fehler hängen. Eine Absage kann Nutzlast
        // tragen — beim gemeinsamen Plan schickt der Server bei 409 den
        // AKTUELLEN Stand mit, und ohne ihn müsste die Ansicht nachfragen
        // und bis dahin den veralteten weiterzeigen.
        e.daten = d;
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

/** Nickname und Einwilligung aus einer `social/ich`-Antwort übernehmen. */
function sozialNickAusIch(d) {
  var h = (d && d.handle) || '';
  // Ein Server ohne `auffindbar` (vor dem 15.10.2026) kennt nur „Handle =
  // auffindbar" — dann ist genau das die Wahrheit.
  _sozialNick = {
    handle: h,
    auffindbar: d && typeof d.auffindbar === 'boolean' ? d.auffindbar : !!h,
  };
}

/**
 * Der Nickname-Kasten — auf der Freunde-Seite und in den Einstellungen.
 *
 * Nickname und Auffindbarkeit stehen GETRENNT da, und der Schalter sagt in
 * Worten, was er bedeutet. Bis zum 15.10.2026 war beides eins: wer einen
 * Namen hatte, war auffindbar. Seit jedes Konto einen Nickname bekommen
 * kann, wäre das eine Einwilligung, die niemand gegeben hat.
 *
 * `ort` wird zu Kennungen und steht im onclick — deshalb nur die festen
 * Orte aus `sozialNickOrt()`.
 */
function sozialNicknameKasten(ort) {
  ort = sozialNickOrt(ort);
  if (!ort) return '';
  var n = _sozialNick || { handle: '', auffindbar: false };
  var id = 'sozNick_' + ort;
  return '<section class="soz-karte soz-handle" data-nick-ort="' + ort + '">'
    + '<h3><span class="material-icons-round" aria-hidden="true">alternate_email</span> Dein Nickname</h3>'
    + '<p>' + (n.handle
      ? 'Du bist <strong>@' + _escHtml(n.handle) + '</strong>. '
      : 'Du hast noch keinen Nickname. ')
    + 'Deine Nachrichten, Freunde und Buchungen bleiben erhalten, wenn du ihn änderst.</p>'
    + '<label class="soz-label" for="' + id + '">Nickname</label>'
    + '<div class="soz-handle-zeile">'
    + '<span class="soz-at" aria-hidden="true">@</span>'
    + '<input type="text" id="' + id + '" value="' + _escHtml(n.handle) + '" maxlength="25" '
    + 'placeholder="z. B. anna.b" autocomplete="off" spellcheck="false" '
    + 'aria-describedby="' + id + '_regel ' + id + '_status">'
    + '</div>'
    + '<small class="soz-hinweis" id="' + id + '_regel">3–24 Zeichen: Kleinbuchstaben, Ziffern, Punkt, Unterstrich.</small>'
    + '<label class="soz-schalter" for="' + id + '_auffindbar">'
    + '<input type="checkbox" id="' + id + '_auffindbar"' + (n.auffindbar ? ' checked' : '') + '> '
    + 'Über meinen Nickname gefunden werden</label>'
    + '<small class="soz-hinweis">Ist das aus, findet dich niemand in der Personensuche — '
    + 'auch nicht über deinen Namen oder deine E-Mail-Adresse.</small>'
    + '<p class="soz-nick-status" id="' + id + '_status" role="status" aria-live="polite"></p>'
    + '<div class="soz-nick-vorschlaege" id="' + id + '_vorschlaege"></div>'
    + '<button type="button" class="btn-primary" onclick="sozialNicknameSpeichern(\'' + ort + '\')">Speichern</button>'
    + '</section>';
}

/**
 * Ein Platz-Attribut auf einen BEKANNTEN Ort abbilden — oder auf nichts.
 *
 * Der Wert landet in Kennungen und im onclick. Ein Muster („nur
 * Kleinbuchstaben") liess jedes Wort durch, und CodeQL meldete am
 * 15.10.2026 zu Recht, dass hier Text aus dem DOM zu HTML wird. Zurück
 * kommt deshalb immer ein Literal aus diesem Code, nie der gelesene Text.
 */
function sozialNickOrt(roh) {
  if (roh === 'einstellungen') return 'einstellungen';
  if (roh === 'freunde') return 'freunde';
  return '';
}

/** Jeden Platz `[data-nickname-kasten]` neu füllen (Einstellungen). */
function sozialNicknameKaestenZeichnen() {
  var plaetze = document.querySelectorAll('[data-nickname-kasten]');
  for (var i = 0; i < plaetze.length; i++) {
    var ort = sozialNickOrt(plaetze[i].getAttribute('data-nickname-kasten'));
    plaetze[i].innerHTML = ort ? sozialNicknameKasten(ort) : '';
  }
}

function sozialNickMeldung(ort, text) {
  var el = document.getElementById('sozNick_' + ort + '_status');
  if (el) el.textContent = text || '';
}

/**
 * Speichern — nur bei einer gültigen ÄNDERUNG.
 *
 * Ein Klick ohne Änderung schickt nichts: jeder Namenswechsel zählt
 * serverseitig gegen einen Tagesdeckel, und wer dreimal „Speichern"
 * drückt, darf ihn nicht dabei verbrauchen.
 */
function sozialNicknameSpeichern(ort) {
  var id = 'sozNick_' + ort;
  var feld = document.getElementById(id);
  var schalter = document.getElementById(id + '_auffindbar');
  if (!feld || !schalter) return;
  var h = String(feld.value || '').trim().toLowerCase().replace(/^@/, '');
  var alt = _sozialNick || { handle: '', auffindbar: false };
  var vorschlaege = document.getElementById(id + '_vorschlaege');
  if (vorschlaege) vorschlaege.innerHTML = '';
  if (h === alt.handle && schalter.checked === alt.auffindbar) {
    sozialNickMeldung(ort, 'Es gibt nichts zu speichern.');
    return;
  }
  if (!/^[a-z0-9._]{3,24}$/.test(h)) {
    sozialNickMeldung(ort, '3–24 Zeichen: Kleinbuchstaben, Ziffern, Punkt, Unterstrich.');
    return;
  }
  sozialNickMeldung(ort, 'Wird gespeichert …');
  sozialRuf('social/handle', 'POST', { handle: h, auffindbar: schalter.checked })
    .then(function (d) {
      _sozialNick = { handle: d.handle || '', auffindbar: !!d.auffindbar };
      if (_sozialStand) _sozialStand.handle = _sozialNick.handle;
      showToast(_sozialNick.auffindbar
        ? 'Gespeichert. Andere finden dich als @' + _sozialNick.handle + '.'
        : 'Gespeichert. Du bist @' + _sozialNick.handle + ' und nicht auffindbar.', 'check_circle');
      sozialNicknameKaestenZeichnen();
      if (document.getElementById('sozNick_freunde')) renderFreundePage();
      sozialNickMeldung(ort, 'Gespeichert.');
    })
    .catch(function (e) {
      sozialNickMeldung(ort, (e && e.message) || 'Das hat nicht geklappt.');
      if (e && e.code === 'handle_vergeben') sozialNickVorschlaegeZeigen(ort, h);
    });
}

/** Bei „schon vergeben" freie Varianten anbieten, statt raten zu lassen. */
function sozialNickVorschlaegeZeigen(ort, h) {
  sozialRuf('social/handle/frei?h=' + encodeURIComponent(h)).then(function (d) {
    var el = document.getElementById('sozNick_' + ort + '_vorschlaege');
    if (!el) return;
    var frei = (d && d.vorschlaege || []).filter(function (v) { return /^[a-z0-9._]{3,24}$/.test(v); });
    el.innerHTML = frei.length ? '<span>Frei wären:</span> ' + frei.map(function (v) {
      return '<button type="button" class="btn-outline btn-sm" onclick="sozialNickVorschlagNehmen(\''
        + ort + '\',\'' + v + '\')">@' + _escHtml(v) + '</button>';
    }).join(' ') : '';
  }).catch(function () { /* die Meldung „vergeben" steht schon da */ });
}

function sozialNickVorschlagNehmen(ort, v) {
  var feld = document.getElementById('sozNick_' + ort);
  if (!feld || !/^[a-z0-9._]{3,24}$/.test(String(v))) return;
  feld.value = v;
  feld.focus();
  sozialNickMeldung(ort, '@' + v + ' ist eingetragen — zum Übernehmen speichern.');
}

/** Einstellungen: den Nickname-Kasten laden und zeichnen. */
function ebNicknameEinstellungen() {
  var plaetze = document.querySelectorAll('[data-nickname-kasten]');
  if (!plaetze.length) return;
  if (!currentUser) {
    for (var i = 0; i < plaetze.length; i++) plaetze[i].innerHTML = '';
    return;
  }
  if (_sozialNick && _sozialAccount === String(currentUser.id)) {
    sozialNicknameKaestenZeichnen();
    return;
  }
  for (var j = 0; j < plaetze.length; j++) {
    plaetze[j].innerHTML = '<section class="soz-karte"><p class="soz-hinweis">Dein Nickname wird geladen …</p></section>';
  }
  var uid = String(currentUser.id);
  sozialRuf('social/ich').then(function (d) {
    if (!currentUser || String(currentUser.id) !== uid) return;
    // Ein anderes Konto als zuletzt: erst alles Alte verwerfen, sonst stuende
    // auf der Freunde-Seite die Liste des vorigen Kontos.
    if (_sozialAccount !== uid) sozialZuruecksetzen();
    sozialNickAusIch(d);
    sozialNicknameKaestenZeichnen();
  }).catch(function () {
    for (var k = 0; k < plaetze.length; k++) {
      plaetze[k].innerHTML = '<section class="soz-karte"><p>Dein Nickname konnte nicht geladen werden.</p>'
        + '<button type="button" class="btn-outline" onclick="ebNicknameEinstellungen()">Erneut versuchen</button></section>';
    }
  });
}

function sozialFreundeAnsicht() {
  var s = _sozialStand || { friends: [], incoming: [], outgoing: [], blocked: [] };
  var html = '';

  html += '<section class="soz-karte">'
    + '<h3><span class="material-icons-round">person_search</span> Freunde finden</h3>'
    + '<div class="soz-suche-zeile">'
    + '<input type="search" id="sozSuche" placeholder="Nickname, z. B. @anna.b" autocomplete="off" '
    + 'value="' + _escHtml(_sozialSuchtext) + '" '
    + 'oninput="sozialSuchtextMerken(this.value)" '
    + 'spellcheck="false" aria-label="Nach Nickname suchen" aria-describedby="sozSucheHinweis" '
    + 'onkeydown="if(event.key===\'Enter\'){event.preventDefault();sozialSuchen();}">'
    + '<button type="button" class="btn-primary" onclick="sozialSuchen()">Suchen</button>'
    + '</div>'
    + '<p id="sozSucheHinweis" class="soz-hinweis">Mit oder ohne @ suchen. Ein Teil des Nicknames genügt (mindestens 3 Zeichen).</p>'
    + '<div id="sozTreffer" class="soz-liste" role="status" aria-live="polite" aria-atomic="true"></div>'
    + '</section>';
  html += sozialNicknameKasten('freunde');

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
        '<button type="button" class="btn-primary" onclick="startGroupPlanning({friendId:' + p.id + '})">Zusammen planen</button>'
        + '<button type="button" class="btn-outline" onclick="sozialChatStarten(' + p.id + ')">Chat</button>'
        + '<button type="button" class="btn-outline" onclick="sozialEntfernen(' + p.id + ')">Entfernen</button>'
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
    + '<h3><span class="material-icons-round">group_work</span> Gemeinsam ein Event planen</h3>'
    + '<p>Eine Gruppe ist ein gemeinsames Vorhaben — eine Hochzeit, ein Festival, '
    + 'ein Betriebsausflug. Wer dabei ist, plant mit.</p>'
    + '<div class="soz-formular">'
    + '<input type="text" id="sozGruppeName" maxlength="120" placeholder="Name, z. B. „Hochzeit Anna & Ben“" aria-label="Name der Gruppe">'
    + '<input type="text" id="sozGruppeTyp" maxlength="60" placeholder="Anlass (optional)" aria-label="Anlass">'
    + '<input type="date" id="sozGruppeDatum" aria-label="Datum (optional)">'
    + '<button type="button" class="btn-primary" onclick="sozialGruppeAnlegen()" aria-label="Plan erstellen">'
    + '<span class="material-icons-round">add</span> Plan erstellen</button>'
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
        + 'Alle deine Freunde sind schon dabei — oder du hast noch keine.</p>'
        + '<button type="button" class="btn-outline" onclick="sozialReiter(\'freunde\')">Freunde finden</button>';
    }
    if (gr.inviteCode) {
      html += '<div class="soz-code">'
        + '<span class="soz-hinweis">Einladungscode</span>'
        + '<code>' + _escHtml(String(gr.inviteCode)) + '</code>'
        + '<button type="button" class="btn-outline" onclick="sozialEinladungKopieren(' + gr.id + ')">Einladungslink kopieren</button>'
        + '<button type="button" class="btn-outline" onclick="sozialCodeNeu(' + gr.id + ')">Code erneuern</button>'
        + '</div>';
    }
    html += '</div>';
  }

  html += '<div class="soz-gruppe-fuss">'
    + '<button type="button" class="btn-primary" onclick="sozialGruppePlanen(' + gr.id + ')">'
    + '<span class="material-icons-round">checklist</span> Gemeinsamer Plan</button>'
    + '<button type="button" class="btn-outline" onclick="sozialGruppeVerlassen(' + gr.id + ')">Verlassen</button>'
    + '</div>'
    + sozialPlanAnsicht(gr)
    + '</div>';
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

  if (_sozialReiter === 'freunde') sozialTrefferZeichnen(_sozialSuchmeldung);
  if (typeof sozialPlanungsEntwurfZeigen === 'function') sozialPlanungsEntwurfZeigen();
}

function sozialReiter(name) {
  _sozialReiter = name === 'gruppen' ? 'gruppen' : 'freunde';
  renderFreundePage();
}

/**
 * Vom Board in die gemeinsame Planung.
 *
 * DIE BRÜCKE FEHLTE GANZ. Am 13.09.2026 im echten Browser gemessen: „Vorhaben
 * planen" auf der Landeseite führt nach `board`, und dort gab es **keinen
 * einzigen** Verweis auf Freunde, Gruppen oder Einladungen — gezählt über
 * jedes `onclick` der Seite, Ergebnis 0. Freunde, Gruppen und der gemeinsame
 * Plan sind seit dem 09./10.09. gebaut und waren von der Stelle aus, an die
 * der Nutzer geschickt wird, **nicht erreichbar**.
 *
 * Gemeldet hat es der Inhaber so: „event mit freunden planen ist fehlerhaft
 * und man wird dann zum board gebracht, aber dann beim KI-Talk, statt ein
 * Planungsboard zu erhalten wo man seine Freunde hinzufügen kann."
 *
 * Der Reiter wird VOR dem Wechsel gesetzt, nicht danach: `renderFreundePage()`
 * liest `_sozialReiter`, und wer erst navigiert und dann umschaltet, zeichnet
 * die Seite zweimal — beim ersten Mal mit dem falschen Reiter, sichtbar.
 *
 * Abgemeldet bleibt alles wie bisher: `/freunde` erklärt selbst, warum es ein
 * Konto braucht. Ein Anmeldedialog, der ohne Erklärung aufgeht, sieht aus wie
 * eine Absage — dieselbe Begründung wie im Router.
 */
function ebGemeinsamPlanen() {
  _sozialReiter = 'gruppen';
  if (_activeBoardId) return planningInviteProject();
  return startGroupPlanning();
}

/* ── Laden und Handlungen ─────────────────────────────────────────── */

function sozialZuruecksetzen() {
  _sozialLadefolge++;
  _sozialSuchfolge++;
  _sozialAccount = currentUser ? String(currentUser.id) : null;
  _sozialStand = null;
  _sozialGruppen = null;
  _sozialTreffer = [];
  _sozialSuchtext = '';
  _sozialSuchmeldung = '';
  _sozialNick = null;
  _sozialLaeuft = false;
  _sozialLadePromise = null;
  _sozialPlan = {};
  _sozialPlanFehler = {};
  _sozialPlanOffen = null;
  _sozialPlanLaeuft = false;
}

function sozialLaden(neu) {
  var uid = currentUser ? String(currentUser.id) : null;
  if (uid !== _sozialAccount) sozialZuruecksetzen();
  if (!uid) { renderFreundePage(); return Promise.resolve(); }
  if (_sozialLadePromise && !neu) return _sozialLadePromise;
  if (_sozialStand && !neu) { renderFreundePage(); return Promise.resolve(); }
  var folge = ++_sozialLadefolge;
  _sozialLaeuft = true;
  renderFreundePage();
  _sozialLadePromise = Promise.all([
    sozialRuf('social/freunde'), sozialRuf('social/gruppen'), sozialRuf('social/ich'),
  ]).then(function (a) {
    if (folge !== _sozialLadefolge || !currentUser || String(currentUser.id) !== uid) return;
    if (!Array.isArray(a[0].friends) || !Array.isArray(a[1].groups) || !a[2].person) {
      throw new Error('Unvollständige Antwort');
    }
    sozialNickAusIch(a[2]);
    _sozialStand = { handle: a[2].handle || '', ich: a[2].person,
      friends: a[0].friends, incoming: a[0].incoming || [],
      outgoing: a[0].outgoing || [], blocked: a[0].blocked || [] };
    _sozialGruppen = { groups: a[1].groups, invitations: a[1].invitations || [] };
  }).catch(function () {
    if (folge !== _sozialLadefolge) return;
    _sozialStand = null;
    _sozialGruppen = null;
  }).then(function () {
    if (folge !== _sozialLadefolge) return;
    _sozialLaeuft = false;
    _sozialLadePromise = null;
    renderFreundePage();
  });
  return _sozialLadePromise;
}

// Wer weitertippt, verwirft jede noch laufende Antwort der alten Suche.
function sozialSuchtextMerken(value) {
  _sozialSuchtext = String(value || '');
  _sozialSuchfolge++;
  _sozialTreffer = [];
  sozialTrefferZeichnen('');
}

function sozialSuchen() {
  var el = document.getElementById('sozSuche');
  _sozialSuchtext = el ? String(el.value || '') : _sozialSuchtext;
  var q = _sozialSuchtext.trim().toLowerCase().replace(/^@/, '');
  if (q.length < 3) {
    _sozialSuchfolge++;
    _sozialTreffer = [];
    sozialTrefferZeichnen('Mindestens drei Zeichen.');
    return;
  }
  _sozialTreffer = [];
  var folge = ++_sozialSuchfolge;
  var uid = currentUser && currentUser.id;
  sozialTrefferZeichnen('Suche läuft …');
  sozialRuf('social/suche?q=' + encodeURIComponent(q))
    .then(function (d) {
      if (folge !== _sozialSuchfolge || !currentUser || currentUser.id !== uid) return;
      _sozialTreffer = d.results || [];
      sozialTrefferZeichnen(_sozialTreffer.length ? '' : 'Niemand gefunden. Prüfe den Nickname oder frage deine Freunde nach ihrem @Namen.');
    })
    .catch(function (e) {
      if (folge !== _sozialSuchfolge || !currentUser || currentUser.id !== uid) return;
      sozialFehler(e);
      sozialTrefferZeichnen('Die Suche konnte nicht geladen werden. Bitte versuche es erneut.');
    });
}

function sozialTrefferZeichnen(meldung) {
  _sozialSuchmeldung = meldung || '';
  var el = document.getElementById('sozTreffer');
  if (!el) return;
  if (!_sozialTreffer.length) {
    el.innerHTML = meldung ? '<p class="soz-leer">' + _escHtml(String(meldung)) + '</p>' : '';
    return;
  }
  el.innerHTML = _sozialTreffer.map(function (p) {
    var k;
    if (p.state === 'accepted') k = '<span class="soz-status">Befreundet</span>';
    else if (p.state === 'pending' && p.mine) k = '<span class="soz-status">Anfrage gesendet</span>';
    else if (p.state === 'pending') k = '<button type="button" class="btn-primary" onclick="sozialAntwort(' + p.id + ',true)">Annehmen</button>'
      + '<button type="button" class="btn-outline" onclick="sozialAntwort(' + p.id + ',false)">Ablehnen</button>';
    else k = '<button type="button" class="btn-primary" onclick="sozialAnfragen(' + p.id + ')">Freundschaft anfragen</button>';
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
    .then(function () {
      if (_sozialSuchtext.trim().replace(/^@/, '').length >= 3) sozialSuchen();
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
  return sozialPlanGruppeErstellen();
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

/*
 * `sozialGruppePlanen()` steht jetzt in `social/61-gruppen-plan.js`.
 *
 * Hier stand bis zum 10.09.2026 ein ehrlicher Platzhalter: der Knopf legte
 * ein Board-Projekt an und sagte dazu, dass darin bis auf Weiteres EINE
 * Person plant. Das war richtig, solange es den gemeinsamen Plan nicht gab
 * — und es zurückzunehmen war der ganze Sinn der Sache.
 */

