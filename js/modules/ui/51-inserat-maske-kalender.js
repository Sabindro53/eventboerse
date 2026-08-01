/* ==================== INSERAT-MASKE: Biete/Suche-Typ + Verfügbarkeitskalender ==================== */
// Einseitige Erstell-Maske: Typ-Umschalter („Ich biete" / „Ich suche") passt
// Labels und sichtbare Blöcke an; der Verfügbarkeitskalender (nur Biete)
// zeigt alle künftigen Tage als ✓ verfügbar — Antippen blockt einen Tag.
// Die geblockten Tage werden nach dem Speichern per
// PUT /listings/<id>/availability übernommen (gleiches Modell wie das
// bestehende Verfügbarkeits-Modal unter „Meine Inserate").

var _clAvailBlocked = {};   // { 'YYYY-MM-DD': true }
var _clAvailMonthOff = 0;   // 0 = aktueller Monat, max. +11

function _clAvailBlockedList() {
  return Object.keys(_clAvailBlocked).filter(function(d) { return _clAvailBlocked[d]; }).sort();
}

function _clSetType(type) {
  type = type === 'search' ? 'search' : 'offer';
  var inp = document.getElementById('createListingType');
  if (inp) inp.value = type;
  document.querySelectorAll('#clTypeToggle .cl-type-btn').forEach(function(b) {
    b.classList.toggle('active', b.getAttribute('data-type') === type);
  });
  var form = document.getElementById('createListingForm');
  if (form) form.classList.toggle('cl-search-mode', type === 'search');

  var isSearch = type === 'search';
  var set = function(id, text) { var el = document.getElementById(id); if (el) el.textContent = text; };
  var setPh = function(id, ph) { var el = document.getElementById(id); if (el) el.placeholder = ph; };

  set('clTitleLabel', isSearch ? 'Was suchst du?' : 'Titel deines Services');
  set('clTitleHint', isSearch
    ? 'Kurz und konkret — so finden dich die richtigen Anbieter. Beispiel: „DJ für Hochzeit am 20.09. in Berlin gesucht".'
    : 'Kurz, konkret, mit Mehrwert. Beispiel: „DJ für Hochzeiten in Berlin – Vinyl & House".');
  setPh('createTitle', isSearch ? 'z.B. DJ für Hochzeit am 20.09. gesucht' : 'z.B. Professionelle DJ-Services für jedes Event');
  set('clIntro1', isSearch
    ? 'Beschreib, was du brauchst — passende Dienstleister melden sich direkt bei dir.'
    : 'Mit klaren Angaben erhältst du mehr passende Anfragen. Du kannst alles später ändern.');
  setPh('createDescription', isSearch
    ? 'Beschreibe dein Event: Anlass, Ort, Uhrzeit, Gäste, Musikrichtung/Stil, Besonderheiten…'
    : 'Beschreibe deinen Service detailliert...');
  set('clPriceLabel', isSearch ? 'Budget (€)' : 'Preisspanne (€)');
  set('clPriceHint', isSearch
    ? 'Was möchtest du ungefähr ausgeben? Hilft Anbietern, passende Angebote zu machen.'
    : 'Mindestpreis ist Pflicht. „Bis“-Wert ist optional und zeigt deine Spanne für größere Events.');
  set('clTagsLabel', isSearch ? 'Anlass' : 'Verfügbar für');
  set('clFeaturesLabel', isSearch ? 'Gewünschte Leistungen' : 'Leistungen');
  set('clFeaturesHint', isSearch
    ? 'Was soll enthalten sein? Wähle aus oder ergänze eigene Wünsche.'
    : 'Wähle alles aus, was im Preis enthalten ist. Mindestens 3 Leistungen werden empfohlen – das erhöht deine Sichtbarkeit.');
  var introEl = document.getElementById('clPhotosIntro');
  if (introEl) introEl.innerHTML = isSearch
    ? 'Optional: Bilder (z.&nbsp;B. Location oder Moodboard) machen dein Gesuch anschaulicher.'
    : 'Inserate mit hochwertigen Fotos werden bis zu <strong>3&times; h&auml;ufiger</strong> angefragt. Lade mind. 3 Bilder hoch.';
  var subLabel = document.getElementById('clSubmitLabel');
  if (subLabel) subLabel.textContent = isSearch ? 'Gesuch veröffentlichen' : 'Inserat veröffentlichen';
}

/* ─── Verfügbarkeitskalender (Häkchen = verfügbar, OPTIONAL) ── */
// Standardmäßig eingeklappt: ohne Angabe gilt „alle Tage verfügbar".
// Der Dienstleister wird nie aufgehalten — Termine sind jederzeit später
// unter „Meine Inserate › Verfügbarkeit" pflegbar.
function _clAvailSetExpanded(open) {
  var body = document.getElementById('clAvailBody');
  var label = document.getElementById('clAvailToggleLabel');
  var arrow = document.getElementById('clAvailToggleArrow');
  if (body) body.style.display = open ? '' : 'none';
  if (label) label.textContent = open ? 'Kalender ausblenden' : 'Termine jetzt eintragen';
  if (arrow) arrow.textContent = open ? 'expand_less' : 'expand_more';
}
function _clAvailExpandToggle() {
  var body = document.getElementById('clAvailBody');
  var open = body && body.style.display === 'none';
  _clAvailSetExpanded(open);
  if (open) _clAvailRender();
}
function _clAvailReset() {
  _clAvailBlocked = {};
  _clAvailMonthOff = 0;
  _clAvailSetExpanded(false);
  _clAvailRender();
}

function _clAvailPrefill(listing) {
  _clAvailBlocked = {};
  _clAvailMonthOff = 0;
  _clAvailSetExpanded(false);
  var apply = function(dates) {
    (dates || []).forEach(function(d) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) _clAvailBlocked[d] = true;
    });
    // Bestehende Block-Tage vorhanden → Kalender direkt aufklappen
    if (_clAvailBlockedList().length) _clAvailSetExpanded(true);
    _clAvailRender();
  };
  if (listing && Array.isArray(listing.blockedDates) && listing.blockedDates.length) {
    apply(listing.blockedDates);
    return;
  }
  var dbId = listing && (listing._dbId || (listing.id > 10000 ? listing.id - 10000 : 0));
  if (dbId && typeof _fetchListingAvailability === 'function') {
    _fetchListingAvailability(dbId).then(function(av) { apply(av && av.blockedDates); });
  } else {
    _clAvailRender();
  }
}

function _clAvailNav(delta) {
  _clAvailMonthOff = Math.max(0, Math.min(11, _clAvailMonthOff + delta));
  _clAvailRender();
}

function _clAvailToggle(iso) {
  if (_clAvailBlocked[iso]) delete _clAvailBlocked[iso];
  else _clAvailBlocked[iso] = true;
  _clAvailRender();
}

function _clAvailRender() {
  var host = document.getElementById('clAvailCal');
  if (!host) return;
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var base = new Date(today.getFullYear(), today.getMonth() + _clAvailMonthOff, 1);
  var year = base.getFullYear(), month = base.getMonth();
  var monthNames = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  var daysInMonth = new Date(year, month + 1, 0).getDate();
  // Montag-basierter Wochenstart
  var firstDow = (new Date(year, month, 1).getDay() + 6) % 7;

  var html = '<div class="clav-head">' +
    '<button type="button" class="clav-nav" onclick="_clAvailNav(-1)" ' + (_clAvailMonthOff === 0 ? 'disabled' : '') + ' aria-label="Voriger Monat"><span class="material-icons-round">chevron_left</span></button>' +
    '<b>' + monthNames[month] + ' ' + year + '</b>' +
    '<button type="button" class="clav-nav" onclick="_clAvailNav(1)" ' + (_clAvailMonthOff >= 11 ? 'disabled' : '') + ' aria-label="Nächster Monat"><span class="material-icons-round">chevron_right</span></button>' +
  '</div>' +
  '<div class="clav-grid">' +
    ['Mo','Di','Mi','Do','Fr','Sa','So'].map(function(d) { return '<span class="clav-dow">' + d + '</span>'; }).join('');

  for (var i = 0; i < firstDow; i++) html += '<span class="clav-pad"></span>';
  for (var day = 1; day <= daysInMonth; day++) {
    var dt = new Date(year, month, day);
    var iso = year + '-' + ('0' + (month + 1)).slice(-2) + '-' + ('0' + day).slice(-2);
    if (dt < today) {
      html += '<span class="clav-day past">' + day + '</span>';
    } else {
      var blocked = !!_clAvailBlocked[iso];
      html += '<button type="button" class="clav-day ' + (blocked ? 'blocked' : 'avail') + '"' +
        ' onclick="_clAvailToggle(\'' + iso + '\')"' +
        ' aria-label="' + iso + (blocked ? ' geblockt' : ' verfügbar') + '"' +
        ' title="' + (blocked ? 'Geblockt — tippen zum Freigeben' : 'Verfügbar — tippen zum Blocken') + '">' + day + '</button>';
    }
  }
  html += '</div>';
  var nBlocked = _clAvailBlockedList().length;
  if (nBlocked > 0) {
    html += '<div class="clav-summary">' + nBlocked + ' Tag' + (nBlocked === 1 ? '' : 'e') + ' geblockt' +
      ' <button type="button" class="clav-clear" onclick="_clAvailBlocked={};_clAvailRender()">Alle freigeben</button></div>';
  }
  host.innerHTML = html;
}

// Kalender beim Start einmal rendern (Seite kann direkt geöffnet werden)
document.addEventListener('DOMContentLoaded', function() {
  try { _clAvailRender(); } catch (e) {}
});
