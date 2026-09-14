// ========== STORNO: der Weg des Planers zu seinem Geld ==========
//
// Beauftragt am 13.09.2026: „wenn er das nicht erfüllen kann, muss er
// Bescheid geben und Geld zurückzahlen … das muss immer sauber ablaufen."
//
// DIESE ANSICHT ENTSCHEIDET NICHTS. Sie blendet aus, was der Server
// ohnehin ablehnt — das ist Höflichkeit, kein Schutz. Wer beantragen darf,
// entscheidet `eb_storno_darf_beantragen()` am PaymentIntent von Stripe;
// wer entscheiden darf, `eb_erstattung_darf()`. Dieselbe Trennung wie bei
// Freunden und Gruppen, und sie steht hier, damit sie niemand verwechselt.
//
// EIN ANTRAG BEWEGT KEIN GELD. Er setzt eine Frist und macht den
// Dienstleister zuständig. Erst dessen Annahme erstattet — über die
// bestehende Route, damit es genau eine Stelle gibt, die Geld bewegt.

var _stornoStand = null;     // { meine: [], an_mich: [], frist_stunden }
var _stornoLaeuft = false;

/** Menschlicher Text je Zustand — vier Zustände, vier Aussagen. */
function ebStornoZustandText(z) {
  switch (z) {
    case 'offen':      return 'Wartet auf Antwort';
    case 'abgelaufen': return 'Frist abgelaufen — Eventbörse prüft';
    case 'angenommen': return 'Angenommen – Zahlungsstatus in der Buchung prüfen';
    case 'abgelehnt':  return 'Abgelehnt';
    default:           return 'Unbekannt';
  }
}

function ebStornoBetrag(cents, waehrung) {
  var v = (Number(cents) || 0) / 100;
  try {
    return v.toLocaleString('de-DE', { style: 'currency', currency: waehrung || 'EUR' });
  } catch (e) {
    return v.toFixed(2) + ' ' + (waehrung || 'EUR');
  }
}

/** Den Stand holen. Störung und „nichts da" sind zwei verschiedene Dinge. */
function ebStornoLaden() {
  return fetch(_apiUrl('storno'), { headers: _apiHeaders(), credentials: 'same-origin' })
    .then(function (r) {
      if (r.status === 401) { _stornoStand = null; return null; }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (d) {
      if (d) _stornoStand = d;
      return d;
    });
}

/**
 * Der Planer beantragt.
 *
 * Der Grund ist Pflicht — und zwar hier schon, damit der Nutzer die
 * Absage nicht erst vom Server bekommt. Der Server prüft ihn trotzdem;
 * diese Prüfung ist Höflichkeit.
 */
function ebStornoBeantragen(paymentIntent) {
  if (!isLoggedIn) { openModal('loginModal'); return; }
  var pi = String(paymentIntent || '');
  if (!/^pi_[A-Za-z0-9_]+$/.test(pi)) {
    showToast('Zu dieser Buchung liegt keine Zahlung vor.', 'error');
    return;
  }
  var grund = window.prompt(
    'Warum möchtest du stornieren?\n\n'
    + 'Der Dienstleister sieht diesen Text und hat '
    + ((_stornoStand && _stornoStand.frist_stunden) || 72) + ' Stunden Zeit zu antworten.\n'
    + 'Erstattet wird erst, wenn er zustimmt.', '');
  if (grund === null) return;                 // abgebrochen ist nicht abgelehnt
  if (_stornoLaeuft) return;
  _stornoLaeuft = true;

  fetch(_apiUrl('storno'), {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, _apiHeaders()),
    credentials: 'same-origin',
    body: JSON.stringify({ payment_intent: pi, grund: grund }),
  })
    .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
    .then(function (res) {
      if (!res.ok) {
        showToast((res.d && res.d.message) || 'Der Antrag konnte nicht gestellt werden.', 'error');
        return;
      }
      showToast('Storno beantragt. Der Dienstleister wurde informiert.', 'success');
      return ebStornoLaden();
    })
    .catch(function () { showToast('Der Antrag konnte nicht gestellt werden.', 'error'); })
    .then(function () { _stornoLaeuft = false; });
}

/**
 * Der Dienstleister entscheidet.
 *
 * Ablehnen braucht eine Begründung: eine Absage ohne Grund ist für den
 * Planer dasselbe wie keine Antwort, nur endgültig.
 */
function ebStornoEntscheiden(id, entscheidung) {
  if (_stornoLaeuft) return;
  var body = { entscheidung: entscheidung };
  if (entscheidung === 'ablehnen') {
    var a = window.prompt('Warum lehnst du den Storno ab?\n\n'
      + 'Der Planer sieht diesen Text.', '');
    if (a === null) return;
    body.antwort = a;
  } else {
    if (!window.confirm('Storno annehmen und den vollen Betrag erstatten?\n\n'
      + 'Das Geld geht zurück an den Kunden. Das lässt sich nicht rückgängig machen.')) return;
  }
  _stornoLaeuft = true;

  fetch(_apiUrl('storno/' + encodeURIComponent(id) + '/entscheiden'), {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json' }, _apiHeaders()),
    credentials: 'same-origin',
    body: JSON.stringify(body),
  })
    .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
    .then(function (res) {
      if (!res.ok) {
        showToast((res.d && res.d.message) || 'Die Entscheidung konnte nicht gespeichert werden.', 'error');
        return;
      }
      showToast(entscheidung === 'annehmen'
        ? 'Storno angenommen. Den Erstattungsstatus findest du in der Buchung.'
        : 'Storno abgelehnt.', 'success');
      return ebStornoLaden().then(ebStornoAnsichtZeichnen);
    })
    .catch(function () { showToast('Die Entscheidung konnte nicht gespeichert werden.', 'error'); })
    .then(function () { _stornoLaeuft = false; ebStornoAnsichtZeichnen(); });
}

/** Eine Zeile für die Liste. Fremder Text wird maskiert, immer. */
function ebStornoZeile(s, alsAnbieter) {
  var kopf = '<div class="storno-kopf"><strong>' + _escHtml(ebStornoBetrag(s.betrag_cents, s.waehrung))
    + '</strong><span class="storno-zustand storno-' + _escHtml(s.zustand) + '">'
    + _escHtml(ebStornoZustandText(s.zustand)) + '</span></div>';
  var grund = '<p class="storno-grund">' + _escHtml(s.grund || '') + '</p>';
  var antwort = s.antwort
    ? '<p class="storno-antwort"><em>Antwort:</em> ' + _escHtml(s.antwort) + '</p>' : '';
  var knoepfe = '';
  if (alsAnbieter && (s.zustand === 'offen' || s.zustand === 'abgelaufen')) {
    knoepfe = '<div class="storno-knoepfe">'
      + '<button class="btn-primary" onclick="ebStornoEntscheiden(' + Number(s.id) + ', \'annehmen\')">'
      + 'Annehmen & erstatten</button>'
      + '<button class="btn-outline" onclick="ebStornoEntscheiden(' + Number(s.id) + ', \'ablehnen\')">'
      + 'Ablehnen</button></div>';
  }
  return '<li class="storno-eintrag">' + kopf + grund + antwort + knoepfe + '</li>';
}

/**
 * Die Liste zeichnen — wenn es einen Platz dafür gibt.
 *
 * Kein Platz heisst NICHT „nichts zu tun": die Funktion ist dann still,
 * und der Aufrufer merkt nichts. Deshalb gibt sie zurueck, ob sie gezeichnet
 * hat, und ein Test haelt fest, dass der Platz existiert.
 */
function ebStornoAnsichtZeichnen() {
  // ── ZWEI PLÄTZE, EIN ZEICHNER ──────────────────────────────────────
  //
  // Der Planer arbeitet auf `/board`, der Dienstleister auf
  // `/auftraege` — das ist seine Tagesseite („hat mich jemand angefragt,
  // was muss ich liefern"). Eine Liste nur auf dem Board hiesse: der
  // Dienstleister sieht den Antrag, wenn er zufällig vorbeikommt, und
  // die 72-Stunden-Frist läuft derweil. Eine Frist auf einer Seite, die
  // der Zuständige nie öffnet, ist keine Frist.
  //
  // Gezeichnet wird deshalb in JEDEN Platz mit `[data-storno-liste]`.
  // Eine zweite Fassung der Funktion wäre die Alternative gewesen — und
  // zwei gepflegte Fassungen derselben Sache driften immer.
  var ziele = document.querySelectorAll('[data-storno-liste]');
  if (!ziele.length) return false;

  // Der ganze Block, nicht nur die Liste: eine Überschrift „Stornos" über
  // einem leeren Kasten ist schlechter als kein Kasten. `hidden` statt
  // `style.display`, damit die CSS-Regel greift und niemand die Anzeige
  // versehentlich auf einen anderen Wert zurückstellt.
  var schreiben = function (html, sichtbar) {
    for (var i = 0; i < ziele.length; i++) {
      ziele[i].innerHTML = html;
      var block = ziele[i].closest('[data-storno-block]');
      if (block) block.hidden = !sichtbar;
    }
  };

  if (!isLoggedIn) {
    // Abgemeldet gibt es niemanden, dem Anträge gehören könnten. Der Satz
    // bleibt im DOM (der Platz ist dann erklärt, falls ihn jemand sucht),
    // der Block verschwindet.
    schreiben('<p class="storno-leer">Melde dich an, um deine Storno-Anträge zu sehen.</p>', false);
    return true;
  }
  if (!_stornoStand) {
    // STÖRUNG bleibt sichtbar. Sie ist etwas anderes als „nichts da", und
    // wer sie wegblendet, meldet eine leere Liste für einen Netzfehler.
    schreiben('<p class="storno-leer">Die Anträge konnten nicht geladen werden. '
      + '<button class="btn-link" onclick="ebStornoLaden().then(ebStornoAnsichtZeichnen)">'
      + 'Erneut versuchen</button></p>', true);
    return true;
  }
  var meine = _stornoStand.meine || [];
  var anMich = _stornoStand.an_mich || [];
  if (!meine.length && !anMich.length) {
    schreiben('<p class="storno-leer">Kein Storno-Antrag offen.</p>', false);
    return true;
  }
  var html = '';
  if (anMich.length) {
    html += '<h4>An dich gerichtet</h4><ul class="storno-liste">'
      + anMich.map(function (s) { return ebStornoZeile(s, true); }).join('') + '</ul>';
  }
  if (meine.length) {
    html += '<h4>Deine Anträge</h4><ul class="storno-liste">'
      + meine.map(function (s) { return ebStornoZeile(s, false); }).join('') + '</ul>';
  }
  schreiben(html, true);
  return true;
}
