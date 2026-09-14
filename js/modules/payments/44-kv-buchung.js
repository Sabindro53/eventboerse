// ========== VERBINDLICHE BUCHUNG: Kostenvoranschlag → Zustimmen & bezahlen → Board ==========
// Schließt die Lücke zwischen Chat-Verhandlung und Zahlung: Dienstleister
// senden strukturierte Kostenvoranschläge (Formular), der Kunde nimmt mit
// expliziter Verbindlichkeits-Abfrage an und bezahlt via Stripe — die
// Buchung wird automatisch als Board-Karte erfasst (Stage „Bezahlt") und
// ist damit überall wiederfindbar. Server-seitig ist der verhandelte
// Betrag bereits legitimiert (akzeptiertes Offer → eb_stripe_validate_
// booking_amount akzeptiert exakt diesen Betrag).

var _KV_PREFIX = '📋 Kostenvoranschlag';

// Strukturierten Kostenvoranschlag aus dem Nachrichtentext parsen.
function _kvParse(content) {
  var text = String(content || '');
  if (text.indexOf(_KV_PREFIX) !== 0) return null;
  var lines = text.split('\n');
  var title = lines[0].replace(_KV_PREFIX, '').replace(/^[:\s]+/, '').trim();
  var date = '', descLines = [];
  for (var i = 1; i < lines.length; i++) {
    var l = lines[i].trim();
    if (!l) continue;
    if (l.indexOf('📅') === 0) { date = l.replace('📅', '').trim(); }
    else { descLines.push(l); }
  }
  return { title: title, date: date, desc: descLines.join('\n') };
}

// Betrag einer Offer-Message robust ermitteln — auch bei deutschem
// Tausenderformat ("1.200,50€"); Server liefert "1200€" bzw. "890,5€".
function _offerAmountNum(msg) {
  if (typeof msg.amountValue === 'number' && isFinite(msg.amountValue)) return msg.amountValue;
  var s = String(msg.amount || msg.text || msg.content || '').replace(/[€\s]/g, '');
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.');
    var v = parseFloat(s);
    return isFinite(v) ? Math.max(0, Math.round(v * 100) / 100) : 0;
  }
  return _parseMoneyValue(s);
}

// Zentrale Render-Funktion für Angebots-/KV-Nachrichten im Chat.
// mine = eigene Nachricht; Aktionen nur für echte (Server-)Messages mit id.
function _renderOfferMsg(msg) {
  var mine = msg.label === 'Dein Angebot' || msg.type === 'sent';
  var offerClass = mine ? 'msg-offer offer-mine' : 'msg-offer offer-theirs';
  var amountNum = _offerAmountNum(msg);
  var kv = _kvParse(msg.content || msg.text || '');
  var status = msg.status || 'pending';
  var convo = (window._conversations || []).find(function(c) { return currentChat && String(c.id) === String(currentChat.id); });
  var providerId = convo && convo.providerId;
  var isProvider = providerId && currentUser && String(providerId) === String(currentUser.id);
  var canPay = providerId && !isProvider;
  var alreadyPaid = (_boardProjects || []).some(function(p) { return (p.cards || []).some(function(c) { return String(c.offerId || '') === String(msg.id) && _cardHasConfirmedPayment(c); }); });

  var body = '';
  if (kv) {
    body += '<div class="kv-head"><span class="material-icons-round">request_quote</span> Kostenvoranschlag</div>';
    if (kv.title) body += '<div class="kv-title">' + _escHtml(kv.title) + '</div>';
    if (kv.desc) body += '<div class="kv-desc">' + _escHtml(kv.desc) + '</div>';
    if (kv.date) body += '<div class="kv-date"><span class="material-icons-round">event</span> ' + _escHtml(kv.date) + '</div>';
  } else {
    body += '<div class="offer-label">' + _escHtml(msg.label || 'Angebot') + '</div>';
  }
  body += '<div class="offer-amount">' + _escHtml(amountNum > 0 ? _formatEuro(amountNum) : (msg.amount || msg.text || '')) + '</div>';
  body += '<div class="offer-status ' + _escHtml(status) + '">' + _escHtml(msg.statusLabel || 'Gesendet') + '</div>';

  var actions = '';
  if (msg.id) {
    if (mine && status === 'pending') {
      actions = '<button class="btn-sm btn-decline offer-revoke-btn" onclick="withdrawOwnOffer(' + msg.id + ')">' +
        '<span class="material-icons-round">undo</span> Zurückziehen</button>';
    } else if (!mine && status === 'pending' && amountNum > 0 && !canPay) {
      actions = '<button class="btn-sm btn-accept" onclick="respondToOffer(' + msg.id + ', \'accepted\')">Preisvorschlag annehmen</button>';
    } else if (!mine && status === 'pending' && amountNum > 0 && canPay) {
      actions = '<div class="offer-actions">' +
        '<button class="btn-sm btn-accept-pay" onclick="acceptAndPayOffer(' + msg.id + ', ' + amountNum + ')">' +
          '<span class="material-icons-round">verified</span> Zustimmen &amp; verbindlich bezahlen</button>' +
        '<button class="btn-sm btn-decline" onclick="respondToOffer(' + msg.id + ', \'declined\')">' +
          '<span class="material-icons-round">close</span> Ablehnen</button>' +
      '</div>';
    } else if (status === 'accepted' && amountNum > 0 && canPay && !alreadyPaid) {
      actions = '<div class="offer-actions">' +
        '<button class="btn-sm btn-accept-pay" onclick="payAcceptedOffer(' + msg.id + ', ' + amountNum + ')">' +
          '<span class="material-icons-round">lock</span> Jetzt verbindlich bezahlen</button>' +
        '<button class="btn-sm btn-decline offer-revoke-btn" onclick="revokeAcceptedOffer(' + msg.id + ')">' +
          '<span class="material-icons-round">undo</span> Doch ablehnen</button>' +
      '</div>';
    }
  }
  if (alreadyPaid) actions = '<div class="offer-status accepted">Zahlung bestätigt · Buchung im Board</div>';
  return '<div class="msg ' + offerClass + (kv ? ' msg-kv' : '') + '">' + body + actions + '</div>';
}

// ---------- Kostenvoranschlag-Formular (Dienstleister & Planer) ----------
function openKvModal() {
  if (!currentChat) { showToast('Bitte zuerst einen Chat öffnen.', 'info'); return; }
  var old = document.getElementById('kvModal');
  if (old) old.remove();
  var html = '<div class="modal-overlay show" id="kvModal" onclick="closeModalOnOverlay(event)" style="z-index:2200">' +
    '<div class="modal modal-sm" onclick="event.stopPropagation()">' +
      '<button class="modal-close" aria-label="Schließen" onclick="document.getElementById(\'kvModal\').remove()"><span class="material-icons-round">close</span></button>' +
      '<div class="modal-header"><span class="material-icons-round modal-icon">request_quote</span><h2>Kostenvoranschlag senden</h2></div>' +
      '<p class="kv-modal-hint">Dein Gegenüber kann direkt zustimmen &amp; bezahlen — dann ist die Buchung verbindlich und wird im Planungsboard erfasst.</p>' +
      '<form class="modal-form" onsubmit="submitKvOffer(event)">' +
        '<div class="form-group"><label>Leistung *</label><input type="text" id="kvTitle" maxlength="90" placeholder="z.B. DJ-Set Hochzeit inkl. Technik" required /></div>' +
        '<div class="form-group"><label>Gesamtpreis (€) *</label><input type="text" id="kvAmount" inputmode="decimal" placeholder="z.B. 890" oninput="moneyInputFilter(this)" required /></div>' +
        '<div class="form-group"><label>Event-Datum (optional)</label><input type="text" id="kvDate" placeholder="TT.MM.JJJJ" /></div>' +
        '<div class="form-group"><label>Beschreibung (optional)</label><textarea id="kvDesc" rows="3" maxlength="400" placeholder="Was ist enthalten? Auf- und Abbau, Anfahrt, …"></textarea></div>' +
        '<button type="submit" class="btn-primary btn-block"><span class="material-icons-round">send</span> Kostenvoranschlag senden</button>' +
      '</form>' +
    '</div>' +
  '</div>';
  document.body.insertAdjacentHTML('beforeend', html);
  try { _attachGermanDatePicker('#kvDate'); } catch (e) {}
}

function submitKvOffer(e) {
  e.preventDefault();
  if (!currentChat) return;
  var title = (document.getElementById('kvTitle').value || '').trim();
  var amount = _parseMoneyValue(document.getElementById('kvAmount').value);
  var date = (document.getElementById('kvDate').value || '').trim();
  var desc = (document.getElementById('kvDesc').value || '').trim();
  if (!title || amount <= 0) { showToast('Bitte Leistung und gültigen Preis angeben.', 'error'); return; }
  var content = _KV_PREFIX + ': ' + title;
  if (desc) content += '\n' + desc;
  if (date) content += '\n\u{1F4C5} ' + date;
  var modal = document.getElementById('kvModal');
  if (modal) modal.remove();
  document.getElementById('negotiationBanner') && (document.getElementById('negotiationBanner').style.display = 'none');
  fetch(_apiUrl('conversations/' + currentChat.id + '/messages'), {
    method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
    body: JSON.stringify({ content: content, type: 'offer', amount: amount })
  }).then(function(r) {
    _refreshNonce(r);
    if (!r.ok) {
      // Server-Grund anzeigen (z. B. Festpreis-Inserat → keine Angebote)
      return r.json().then(function(d) {
        showToast((d && d.message) || 'Senden fehlgeschlagen', 'error');
      }).catch(function() { showToast('Senden fehlgeschlagen', 'error'); });
    }
    showToast('Kostenvoranschlag über ' + _formatEuro(amount) + ' gesendet!', 'request_quote');
    openChat(currentChat.id);
  }).catch(function() { showToast('Senden fehlgeschlagen', 'error'); });
}

// ---------- Verbindlichkeits-Abfrage ----------
function _confirmBindingBooking(opts, onConfirm) {
  var old = document.getElementById('bindingConfirmModal');
  if (old) old.remove();
  var html = '<div class="modal-overlay show" id="bindingConfirmModal" style="z-index:2300">' +
    '<div class="modal modal-sm" onclick="event.stopPropagation()">' +
      '<div class="modal-header"><span class="material-icons-round modal-icon" style="color:#f59e0b">gavel</span><h2>Verbindlich buchen?</h2></div>' +
      '<div class="binding-summary">' +
        (opts.title ? '<div class="binding-row"><span>Leistung</span><strong>' + _escHtml(opts.title) + '</strong></div>' : '') +
        (opts.provider ? '<div class="binding-row"><span>Anbieter</span><strong>' + _escHtml(opts.provider) + '</strong></div>' : '') +
        '<div class="binding-row binding-amount"><span>Gesamtpreis</span><strong>' + _escHtml(_formatEuro(opts.amount || 0)) + '</strong></div>' +
      '</div>' +
      '<p class="binding-hint"><span class="material-icons-round">info</span> Mit Klick auf „Verbindlich buchen &amp; bezahlen“ gehst du eine <strong>verbindliche Buchung</strong> ein. Die Zahlung läuft sicher über Stripe und wird in deinem Planungsboard erfasst.</p>' +
      '<div class="binding-actions">' +
        '<button type="button" class="btn-outline" onclick="document.getElementById(\'bindingConfirmModal\').remove()">Abbrechen</button>' +
        '<button type="button" class="btn-primary" id="bindingConfirmGo"><span class="material-icons-round">lock</span> Verbindlich buchen &amp; bezahlen</button>' +
      '</div>' +
    '</div>' +
  '</div>';
  document.body.insertAdjacentHTML('beforeend', html);
  document.getElementById('bindingConfirmGo').onclick = function() {
    document.getElementById('bindingConfirmModal').remove();
    try { onConfirm(); } catch (e) { showToast('Fehler beim Starten der Zahlung', 'error'); }
  };
}

// ---------- Annehmen & bezahlen ----------
function acceptAndPayOffer(msgId, amount) {
  if (!currentChat) return;
  _confirmBindingBooking({ amount: amount, provider: currentChat.name, title: _offerTitleFor(msgId) }, function() {
    fetch(_apiUrl('messages/' + msgId + '/offer-status'), {
      method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
      body: JSON.stringify({ status: 'accepted' })
    }).then(function(r) {
      _refreshNonce(r);
      if (!r.ok) throw new Error('fail');
      var banner = document.getElementById('negotiationBanner');
      if (banner) banner.style.display = 'none';
      _startOfferPayment(msgId, amount);
    }).catch(function() { showToast('Angebot konnte nicht angenommen werden', 'error'); });
  });
}

function payAcceptedOffer(msgId, amount) {
  if (!currentChat) return;
  _confirmBindingBooking({ amount: amount, provider: currentChat.name, title: _offerTitleFor(msgId) }, function() {
    _startOfferPayment(msgId, amount);
  });
}

function _offerTitleFor(msgId) {
  try {
    var m = (currentChat.messages || []).find(function(x) { return x && x.id === msgId; });
    var kv = m && _kvParse(m.content || m.text || '');
    return kv && kv.title ? kv.title : '';
  } catch (e) { return ''; }
}

// Zahlung für ein (akzeptiertes) Chat-Angebot starten — legt vorab die
// Board-Karte an und nutzt den erprobten Board-Zahlungspfad
// (_openStripePaymentModal + _applyCardPaymentSuccess + Reconcile).
function _startOfferPayment(msgId, amount) {
  if (!currentChat) return;
  var chatId = currentChat.id;
  var convo = (window._conversations || []).find(function(c) { return c.id === chatId; });
  var listingRef = convo && convo.listingId;
  var listing = null;
  if (listingRef != null) {
    listing = (LISTINGS || []).find(function(l) {
      return l && (l.id === listingRef || l._dbId === listingRef || l.id === listingRef + 10000);
    }) || null;
  }
  if (!listing) {
    showToast('Kein Inserat zu diesem Chat gefunden — bitte über die Inseratsseite buchen.', 'warning');
    return;
  }

  var rec = _recordBookingToBoard({
    listing: listing,
    amount: amount,
    offerId: msgId,
    stage: 'angebot',
    note: 'Verhandelt im Chat (Kostenvoranschlag angenommen)'
  });
  if (!rec) { showToast('Board-Karte konnte nicht angelegt werden', 'error'); return; }

  // Doppelzahlungs-Schutz: dieses Listing ist bereits verbindlich gebucht
  // und bezahlt → keine zweite Zahlung starten.
  if (_cardHasConfirmedPayment(rec.card)) {
    showToast('Bereits verbindlich gebucht & bezahlt — siehe Planungsboard.', 'info');
    try { navigateTo('board'); } catch (e) {}
    return;
  }

  var img = listing.image || (listing.images && listing.images[0]) || '';
  try { _setPendingPayment({ type: 'card', cardId: rec.card.id, projectId: rec.projectId, amount: amount, title: listing.title || currentChat.name }); } catch (e) {}
  _openStripePaymentModal({
    amount: amount,
    title: listing.title || ('Buchung bei ' + currentChat.name),
    cardId: rec.card.id,
    projectId: rec.projectId,
    listingId: listing._dbId || listing.id,
    offerId: msgId,
    image: img,
    provider: listing.providerName || currentChat.name,
    category: listing.categoryLabel || listing.category || '',
    duration: listing.duration || '',
    dateLabel: '',
    onSuccess: function(res) {
      var rr = null;
      try { rr = _applyCardPaymentSuccess(rec.card.id, rec.projectId, amount, res); } catch (e) {}
      try { _clearPendingPayment(); } catch (e) {}
      // Beleg in den Chat — für beide Seiten nachvollziehbar
      fetch(_apiUrl('conversations/' + chatId + '/messages'), {
        method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
        body: JSON.stringify({ content: '✅ Verbindlich gebucht & bezahlt: ' + _formatEuro(amount) + ' — die Buchung ist im Planungsboard unter „Bezahlt“ erfasst.', type: 'message' })
      }).catch(function() {});
      if (typeof _showBookingSuccess === 'function') {
        _showBookingSuccess({ projectId: rec.projectId, amount: amount, title: listing.title || currentChat.name });
      } else {
        showToast('Zahlung erfolgreich — Buchung im Board erfasst!', 'check_circle');
      }
      try { openChat(currentChat.id); } catch (e) {}
    },
    onCancel: function() {
      try { _clearPendingPayment(); } catch (e) {}
      showToast('Zahlung abgebrochen — das angenommene Angebot bleibt bestehen.', 'info');
    }
  });
}

// Board-Erfassung: existierende Karte (gleiches Listing) wiederverwenden,
// sonst Karte im ersten Projekt bzw. auto-Projekt „Meine Buchungen" anlegen.
function _recordBookingToBoard(opts) {
  try { _migrateBoardProjects && _migrateBoardProjects(); } catch (e) {}
  try { if (!_boardProjects || !_boardProjects.length) _loadBoardProjects && _loadBoardProjects(); } catch (e) {}
  var listing = opts.listing;
  var lid = listing.id;

  // 1) Existierende Karte für dieses Listing? → wiederverwenden.
  for (var i = 0; i < (_boardProjects || []).length; i++) {
    var p = _boardProjects[i];
    var c = (p.cards || []).find(function(x) { return x && x.listingId && String(x.listingId) === String(lid) && (!opts.offerId || String(x.offerId || '') === String(opts.offerId) || (!x.offerId && !_cardHasConfirmedPayment(x) && p.id === _activeBoardId)); });
    if (c) {
      if (opts.offerId) c.offerId = opts.offerId;
      if (opts.amount > 0 && !_cardHasConfirmedPayment(c)) c.price = opts.amount;
      if (EB_BOARD_STAGE_ORDER.indexOf(c.stage) < EB_BOARD_STAGE_ORDER.indexOf(opts.stage || 'angebot')) {
        c.stage = opts.stage || 'angebot';
      }
      _saveBoardProjects({ immediate: true });
      return { projectId: p.id, card: c };
    }
  }

  // 2) Ziel-Projekt: aktives Projekt → erstes Projekt → auto „Meine Buchungen".
  var project = (_boardProjects || []).find(function(p) { return p.id === _activeBoardId; }) || (_boardProjects || [])[0];
  if (!project) {
    project = {
      id: 'bp_' + Date.now(),
      name: '\u{1F4D4} Meine Buchungen',
      date: '', budget: 0, guests: 0, template: 'custom',
      cards: [], checklist: [],
      createdAt: new Date().toISOString(), updatedAt: Date.now()
    };
    _boardProjects.unshift(project);
  }

  var card = {
    id: 'card_' + Date.now(),
    name: listing.providerName || listing.title || 'Dienstleister',
    category: listing.categoryLabel || listing.category || '',
    price: opts.amount || parseFloat(listing.price) || 0,
    note: opts.note || '',
    startTime: '', endTime: '',
    stage: opts.stage || 'angebot',
    listingId: lid,
    offerId: opts.offerId || null,
    providerId: listing.providerId || null,
    avatar: listing.providerImg || '',
    listingImage: listing.image || (listing.images && listing.images[0]) || '',
    listingTitle: listing.title || '',
    createdAt: new Date().toISOString()
  };
  if (!project.cards) project.cards = [];
  project.cards.push(card);
  _saveBoardProjects({ immediate: true });
  return { projectId: project.id, card: card };
}

/* Server-verified payment and cancellation view shared by both parties. */
var _bookingRefundBusy = false;
function bookingPaymentDetails(pi) {
  if (!/^pi_[A-Za-z0-9_]+$/.test(pi) || !currentUser) return;
  var old = document.getElementById('bookingPaymentDialog');
  if (old) old.remove();
  var dialog = document.createElement('dialog');
  dialog.id = 'bookingPaymentDialog';
  dialog.className = 'booking-payment-dialog';
  dialog.innerHTML = '<button type="button" class="btn-outline" data-booking-close aria-label="Zahlungsdetails schließen">Schließen</button><h2>Zahlung & Stornierung</h2><div id="bookingPaymentContent" aria-live="polite">Zahlung wird geprüft …</div>';
  document.body.appendChild(dialog);
  dialog.showModal();
  return sozialRuf('stripe/settlement/' + encodeURIComponent(pi)).then(function (data) {
    if (!dialog.isConnected) return;
    var refunds = data.refunds || [];
    var successful = refunds.filter(function (r) { return r.status === 'succeeded'; }).reduce(function (sum,r) { return sum + Number(r.amount || 0); }, 0);
    var pending = refunds.some(function (r) { return r.status === 'pending' || r.status === 'requires_action'; });
    var failed = refunds.some(function (r) { return r.status === 'failed' || r.status === 'canceled'; });
    var gross = Number(data.exact && data.exact.gross_cents) || 0;
    var state = successful >= gross && gross > 0 ? 'Erstattung bestätigt' : pending ? 'Erstattung in Bearbeitung' : failed ? 'Erstattung fehlgeschlagen — bitte Support kontaktieren' : data.cancellation ? 'Stornierung angefragt — Erstattung noch nicht bestätigt' : 'Zahlung bestätigt';
    var html = '<p class="booking-payment-status"><strong>' + _escHtml(state) + '</strong></p><p>Gesamtbetrag: <strong>' + _escHtml(_formatEuro(gross / 100)) + '</strong></p>';
    if (data.cancellation) html += '<p>Stornierungsgrund: ' + _escHtml(data.cancellation.reason || '') + '</p>';
    if (successful) html += '<p>Von Stripe bestätigte Erstattung: ' + _escHtml(_formatEuro(successful / 100)) + '. Die Gutschrift erfolgt über die ursprüngliche Zahlungsart.</p>';
    html += '<p>Der Anbieter erhält Zahlungen über Stripe Connect. Dies ist kein Treuhandkonto und keine zusätzliche Leistungsgarantie.</p>';
    if (data.canRefund && !pending && !failed && successful === 0) {
      html += '<form id="bookingRefundForm" data-payment="' + _escHtml(pi) + '"><label for="bookingRefundReason">Warum kannst du den Auftrag nicht erfüllen?</label><textarea id="bookingRefundReason" required minlength="10" maxlength="1000" rows="3" placeholder="Begründe die Absage für deinen Kunden."></textarea><p>Du stornierst die Buchung und veranlasst die vollständige Erstattung einschließlich der Plattformgebühr. Der endgültige Status wird durch Stripe bestätigt.</p><button type="submit" class="btn-primary">Stornieren & Erstattung veranlassen</button></form>';
    } else if (!successful || failed) html += '<button type="button" class="btn-outline" data-booking-support>Support kontaktieren</button>';
    html += '<button type="button" class="btn-outline" data-booking-payment="' + _escHtml(pi) + '">Status aktualisieren</button>';
    dialog.querySelector('#bookingPaymentContent').innerHTML = html;
  }).catch(function (e) {
    if (dialog.isConnected) dialog.querySelector('#bookingPaymentContent').textContent = 'Zahlung konnte nicht geprüft werden. ' + (e.message || 'Bitte erneut versuchen.');
  });
}

document.addEventListener('click', function (e) {
  var open = e.target.closest('[data-booking-payment]');
  if (open) bookingPaymentDetails(open.dataset.bookingPayment);
  var dialog = document.getElementById('bookingPaymentDialog');
  if (e.target.closest('[data-booking-close]') && dialog) dialog.close();
  if (e.target.closest('[data-booking-support]')) { if (dialog) dialog.close(); navigateTo('contact'); }
});
document.addEventListener('submit', function (e) {
  if (e.target.id !== 'bookingRefundForm') return;
  e.preventDefault();
  if (_bookingRefundBusy || !e.target.reportValidity()) return;
  var form = e.target;
  var pi = form.dataset.payment;
  var reason = form.querySelector('textarea').value.trim();
  if (reason.length < 10) return;
  _bookingRefundBusy = true;
  var button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = 'Erstattung wird angefragt …';
  sozialRuf('stripe/refund', 'POST', { payment_intent: pi, cancellation_reason: reason }).then(function (d) {
    showToast(d.message || 'Erstattung angefragt.', 'info');
    return bookingPaymentDetails(pi);
  }).catch(function (err) { showToast(err.message || 'Erstattung nicht bestätigt. Bitte Status prüfen.', 'error'); })
    .finally(function () { _bookingRefundBusy = false; if (button.isConnected) { button.disabled = false; button.textContent = 'Stornieren & Erstattung veranlassen'; } });
});
