/**
 * Der gemeinsame Plan einer Gruppe.
 *
 * „Gruppen für Events zusammenstellen können für ein gemeinsames Vorhaben."
 * Die Gruppen gab es seit dem 09.09.2026, den Plan darin nicht — der Knopf
 * „Vorhaben planen" führte ins Board und sagte das auch ehrlich. Das hier
 * holt es nach.
 *
 * ── DIE OBERFLÄCHE ENTSCHEIDET NICHTS ───────────────────────────────────
 *
 * Wie im Nachbarmodul: sie blendet aus, was der Server ohnehin ablehnen
 * würde. Das ist Höflichkeit, kein Schutz. Wer „Entfernen" nicht sieht, darf
 * trotzdem nicht — und wer es über die Konsole ruft, bekommt 403.
 *
 * ── EIN KONFLIKT IST EINE NACHRICHT, KEIN FEHLER ────────────────────────
 *
 * Zwei Leute am selben Posten sind der Normalfall eines gemeinsamen Plans,
 * nicht die Störung. Antwortet der Server mit 409, trägt seine Antwort den
 * AKTUELLEN Stand; der wird sofort eingesetzt und daneben steht, was
 * passiert ist. „Bitte neu laden" wäre hier die schlechteste Auskunft: der
 * Nutzer hat nichts falsch gemacht, und nach dem Neuladen ist seine Eingabe
 * weg.
 *
 * ── DREI ZUSTÄNDE, DREI SÄTZE ───────────────────────────────────────────
 *
 * Störung, leer und „noch nicht geladen" sagen Verschiedenes. „Noch nichts
 * geplant" bei einem Netzfehler wäre eine Falschaussage über die Gruppe —
 * dieselbe Regel wie bei der Jetzt-Ansicht und der Freundesliste.
 */

var _sozialPlan = {};        // gid -> { items, bilanz }
var _sozialPlanOffen = null; // welche Gruppe gerade aufgeklappt ist
var _sozialPlanFehler = {};  // gid -> Meldung, wenn der Abruf scheiterte
var _sozialPlanLaeuft = false;

/** Die Zustände in der Reihenfolge, in der sie fortschreiten. */
var EB_PLAN_STATUS = [
  { wert: 'offen', text: 'offen' },
  { wert: 'vergeben', text: 'übernommen' },
  { wert: 'gebucht', text: 'gebucht' },
  { wert: 'erledigt', text: 'erledigt' },
];

function planStatusText(wert) {
  for (var i = 0; i < EB_PLAN_STATUS.length; i++) {
    if (EB_PLAN_STATUS[i].wert === wert) return EB_PLAN_STATUS[i].text;
  }
  return wert;
}

/**
 * Cent als Betrag.
 *
 * Gerechnet wird auf dem Server; hier wird nur dargestellt. Zwei Rechenwege
 * für dieselbe Zahl driften, und diese Zahl ist Geld.
 */
function planBetrag(cent) {
  var n = Number(cent) || 0;
  return (n / 100).toLocaleString('de-DE', {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 2,
  });
}

/* ── Laden ────────────────────────────────────────────────────────── */

function sozialPlanLaden(gid) {
  return sozialRuf('social/gruppen/' + gid + '/plan').then(function (d) {
    _sozialPlan[gid] = { items: d.items || [], bilanz: d.bilanz || null };
    delete _sozialPlanFehler[gid];
  }).catch(function (e) {
    // Der Fehler wird FESTGEHALTEN, nicht nur getoastet: sonst stünde
    // danach „noch nichts geplant" da — eine Aussage über die Gruppe, die
    // wir gar nicht abrufen konnten.
    // Die Meldung nennt IHR SUBJEKT. `sozialRuf` wirft bei einer leeren
    // Fehlerantwort „Das hat nicht geklappt" — ein Satz, der nicht sagt,
    // was nicht geklappt hat, und der neben „noch nichts geplant" nicht
    // als etwas anderes zu erkennen ist. Drei Zustände, drei Sätze.
    _sozialPlanFehler[gid] = 'Der Plan konnte nicht geladen werden.';
    delete _sozialPlan[gid];
  });
}

/** Auf- und zuklappen. Der Plan lädt erst, wenn ihn jemand sehen will. */
function sozialGruppePlanen(gid) {
  if (_sozialPlanOffen === gid) {
    _sozialPlanOffen = null;
    renderFreundePage();
    return;
  }
  _sozialPlanOffen = gid;
  renderFreundePage();
  sozialPlanLaden(gid).then(renderFreundePage);
}

/* ── Zeichnen ─────────────────────────────────────────────────────── */

/**
 * Der Plan unter der Gruppenkarte.
 *
 * Er steht IN der Karte und nicht auf einer eigenen Seite: wer plant, will
 * sehen, mit wem. Ein eigener Bildschirm nähme genau den Zusammenhang weg,
 * um dessentwillen der Plan gemeinsam ist.
 */
function sozialPlanAnsicht(gr) {
  if (_sozialPlanOffen !== gr.id) return '';
  var gid = gr.id;

  var html = '<div class="soz-plan" id="sozPlan' + gid + '">';

  if (_sozialPlanFehler[gid]) {
    html += '<p class="soz-hinweis soz-stoerung">'
      + '<span class="material-icons-round">error_outline</span> '
      + _escHtml(_sozialPlanFehler[gid])
      + ' <button type="button" class="btn-outline" onclick="sozialPlanErneut(' + gid + ')">'
      + 'Erneut versuchen</button></p></div>';
    return html;
  }

  var stand = _sozialPlan[gid];
  if (!stand) {
    html += '<p class="soz-hinweis">Der Plan wird geladen …</p></div>';
    return html;
  }

  var b = stand.bilanz || { posten: 0, offen: 0, summeCent: 0 };
  html += '<div class="soz-plan-kopf">'
    + '<strong>Gemeinsamer Plan</strong>'
    + '<small>' + b.posten + ' Posten · ' + b.offen + ' offen · '
    + _escHtml(planBetrag(b.summeCent)) + '</small>'
    + '</div>';

  if (!stand.items.length) {
    html += '<p class="soz-hinweis">Noch nichts geplant. Trag ein, was gebraucht wird — '
      + 'DJ, Catering, Location. Jeder in der Gruppe kann etwas übernehmen.</p>';
  } else {
    html += '<div class="soz-plan-liste">'
      + stand.items.map(function (p) { return sozialPlanPosten(gid, p); }).join('')
      + '</div>';
  }

  html += sozialPlanFormular(gid) + '</div>';
  return html;
}

/** Ein Posten. */
function sozialPlanPosten(gid, p) {
  var meine = _sozialStand && _sozialStand.ich ? _sozialStand.ich.id : 0;
  var zu = p.zustaendig;
  var html = '<div class="soz-plan-posten soz-plan-' + _escHtml(p.status) + '">'
    + '<div class="soz-plan-titel">'
    + '<strong>' + _escHtml(String(p.titel)) + '</strong>';
  if (p.kategorie) {
    html += ' <span class="soz-plan-kat">' + _escHtml(String(p.kategorie)) + '</span>';
  }
  html += '<small class="soz-plan-status">' + _escHtml(planStatusText(p.status));
  if (p.betragCent) html += ' · ' + _escHtml(planBetrag(p.betragCent));
  html += '</small></div>';

  if (p.notiz) {
    html += '<p class="soz-plan-notiz">' + _escHtml(String(p.notiz)) + '</p>';
  }

  html += '<div class="soz-plan-zeile">';
  if (zu) {
    html += '<span class="soz-plan-wer">'
      + '<span class="material-icons-round">person</span> '
      + _escHtml(String(zu.name)) + '</span>';
  } else {
    html += '<span class="soz-plan-wer soz-plan-frei">Noch niemand</span>';
  }

  // Ausgeblendet wird, was der Server ohnehin ablehnt. Ob er es wirklich
  // ablehnt, prüft plan.spec.js — nicht diese Zeile.
  if (!zu) {
    html += '<button type="button" class="btn-primary" onclick="sozialPlanUebernehmen(' + gid + ',' + p.id + ')">'
      + 'Ich mach das</button>';
  } else if (zu.id === meine) {
    html += '<button type="button" class="btn-outline" onclick="sozialPlanFreigeben(' + gid + ',' + p.id + ')">'
      + 'Doch nicht</button>';
  }

  html += '<select class="soz-plan-wahl" aria-label="Zustand"'
    + ' onchange="sozialPlanStatus(' + gid + ',' + p.id + ',' + p.rev + ',this.value)">'
    + EB_PLAN_STATUS.map(function (s) {
      return '<option value="' + s.wert + '"' + (s.wert === p.status ? ' selected' : '') + '>'
        + s.text + '</option>';
    }).join('')
    + '</select>';

  html += '<button type="button" class="btn-outline soz-plan-weg" '
    + 'onclick="sozialPlanLoeschen(' + gid + ',' + p.id + ')" aria-label="Posten entfernen">'
    + '<span class="material-icons-round">delete_outline</span></button>';

  html += '</div></div>';
  return html;
}

/** Das Formular zum Hinzufügen. */
function sozialPlanFormular(gid) {
  return '<div class="soz-plan-neu">'
    + '<input type="text" id="sozPlanTitel' + gid + '" maxlength="120" '
    + 'placeholder="Was wird gebraucht? z. B. DJ" aria-label="Posten">'
    + '<input type="text" id="sozPlanKat' + gid + '" maxlength="60" '
    + 'placeholder="Kategorie" aria-label="Kategorie">'
    + '<input type="number" id="sozPlanEuro' + gid + '" min="0" step="1" '
    + 'placeholder="Budget €" aria-label="Budget in Euro">'
    + '<button type="button" class="btn-primary" onclick="sozialPlanAnlegen(' + gid + ')">'
    + '<span class="material-icons-round">add</span> Hinzufügen</button>'
    + '</div>';
}

/* ── Handlungen ───────────────────────────────────────────────────── */

function sozialPlanErneut(gid) {
  delete _sozialPlanFehler[gid];
  renderFreundePage();
  sozialPlanLaden(gid).then(renderFreundePage);
}

/**
 * Eine Antwort einarbeiten.
 *
 * Auch im Konfliktfall: der Server schickt bei 409 den aktuellen Stand mit,
 * und der ersetzt den veralteten sofort. Wer stattdessen nur eine
 * Fehlermeldung zeigt, lässt den Nutzer auf falsche Daten sehen und weiter
 * darauf klicken.
 */
function sozialPlanEinsetzen(gid, item) {
  var stand = _sozialPlan[gid];
  if (!stand || !item) return;
  for (var i = 0; i < stand.items.length; i++) {
    if (stand.items[i].id === item.id) { stand.items[i] = item; return; }
  }
  stand.items.push(item);
}

/** Ein gemeinsamer Ausgang für jede Plan-Handlung. */
function sozialPlanTun(gid, versprechen, erfolgstext) {
  if (_sozialPlanLaeuft) return;
  _sozialPlanLaeuft = true;
  return versprechen.then(function (d) {
    if (d && d.item) sozialPlanEinsetzen(gid, d.item);
    if (erfolgstext) showToast(erfolgstext, 'check_circle');
    return sozialPlanLaden(gid);
  }).catch(function (e) {
    // Ein Konflikt ist keine Störung: der aktuelle Stand kommt mit, wird
    // eingesetzt, und die Meldung sagt, was geschehen ist.
    if (e && e.status === 409 && e.daten && e.daten.item) {
      sozialPlanEinsetzen(gid, e.daten.item);
      showToast(e.message, 'info');
      return;
    }
    sozialFehler(e);
  }).then(function () {
    _sozialPlanLaeuft = false;
    renderFreundePage();
  });
}

function sozialPlanAnlegen(gid) {
  var t = document.getElementById('sozPlanTitel' + gid);
  var k = document.getElementById('sozPlanKat' + gid);
  var e = document.getElementById('sozPlanEuro' + gid);
  var titel = t ? String(t.value || '').trim() : '';
  if (!titel) {
    showToast('Der Posten braucht einen Namen.', 'error_outline');
    if (t) t.focus();
    return;
  }
  // Euro im Formular, Cent auf der Leitung: ein Betragsfeld, das Cent
  // verlangt, tippt jeder einmal falsch.
  var euro = e ? Math.max(0, Math.round(Number(e.value) || 0)) : 0;
  sozialPlanTun(gid, sozialRuf('social/gruppen/' + gid + '/plan', 'POST', {
    titel: titel,
    kategorie: k ? String(k.value || '').trim() : '',
    betragCent: euro * 100,
  }));
}

function sozialPlanUebernehmen(gid, id) {
  sozialPlanTun(gid, sozialRuf('social/gruppen/' + gid + '/plan/' + id + '/uebernehmen', 'POST', {}),
    'Übernommen — die Gruppe sieht es.');
}

function sozialPlanFreigeben(gid, id) {
  sozialPlanTun(gid, sozialRuf('social/gruppen/' + gid + '/plan/' + id + '/freigeben', 'POST', {}));
}

/**
 * Den Zustand ändern — mit Revision.
 *
 * Die Revision stammt aus dem gezeichneten Posten, nicht aus einem frischen
 * Abruf: genau das ist der Sinn. Hat inzwischen jemand anderes geschrieben,
 * antwortet der Server mit 409 und dem aktuellen Stand, und die Auswahl
 * springt sichtbar zurück.
 */
function sozialPlanStatus(gid, id, rev, wert) {
  sozialPlanTun(gid, sozialRuf('social/gruppen/' + gid + '/plan/' + id, 'POST', {
    rev: rev, status: wert,
  }));
}

function sozialPlanLoeschen(gid, id) {
  sozialPlanTun(gid, sozialRuf('social/gruppen/' + gid + '/plan/' + id + '/loeschen', 'POST', {}));
}
