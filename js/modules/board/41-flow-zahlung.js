/* ─── Pending-Payment Persistenz ─────────────────────────────────
 * Vor jeder Stripe-Zahlung wird die geplante Aktion serialisierbar in
 * localStorage abgelegt. Macht die Buchung redirect-fest: kehrt der
 * Nutzer nach 3-D-Secure/Redirect zurück (Seite neu geladen → onSuccess-
 * Closure ist weg), rekonstruiert _handlePaymentElementReturn() daraus
 * die Board-Karte. Schlüssel ist bewusst global (ein Zahlvorgang gleich-
 * zeitig).
 */
var EB_PENDING_PAYMENT_KEY = 'eb_pending_payment';
function _setPendingPayment(obj) {
  try { localStorage.setItem(EB_PENDING_PAYMENT_KEY, JSON.stringify(obj || {})); } catch (e) {}
}
function _getPendingPayment() {
  try {
    var raw = localStorage.getItem(EB_PENDING_PAYMENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
function _clearPendingPayment() {
  try { localStorage.removeItem(EB_PENDING_PAYMENT_KEY); } catch (e) {}
}

/**
 * Legt nach erfolgreicher Sofortbuchung die "Direktbuchungen"-Karte im
 * Board des Zahlers an. Genutzt von inline-onSuccess UND Redirect-Rückkehr.
 * info: { listingId, title, category, image, providerImg, provider, providerId, amount, dateIso, dateHuman }
 * Gibt { project, card, duplicate? } zurück.
 */
function _applyInstantBookingSuccess(info, res) {
  info = info || {};
  try { _migrateBoardProjects && _migrateBoardProjects(); } catch (e) {}
  var piId = (res && (res.payment_intent_id || res.payment_intent)) || '';
  // Idempotenz: dieselbe PaymentIntent darf kein zweites Board / keine zweite
  // Karte erzeugen (z. B. doppelte Redirect-Rückkehr). Über ALLE Projekte
  // suchen, da jede Direktbuchung ihr eigenes Board hat.
  if (piId) {
    for (var _pi = 0; _pi < (_boardProjects || []).length; _pi++) {
      var _ep = _boardProjects[_pi];
      var _dupCard = ((_ep && _ep.cards) || []).find(function(c) { return c.paymentIntentId === piId; });
      if (_dupCard) return { project: _ep, card: _dupCard, duplicate: true };
    }
  }
  // Jede Direktbuchung bekommt ihr EIGENES, umbenennbares Board. Der
  // Default-Name wird hochgezählt (Direktbuchung 1, 2, 3 …); per Stift-Symbol
  // im Board umbenennbar.
  var _instantCount = (_boardProjects || []).filter(function(p) { return p && p.kind === 'instant'; }).length;
  var proj = {
    id: 'proj_' + Date.now(),
    name: 'Direktbuchung ' + (_instantCount + 1),
    kind: 'instant',
    date: (info.dateIso || '').slice(0, 10),
    cards: [],
    createdAt: new Date().toISOString()
  };
  _boardProjects.push(proj);
  var nowIso = new Date().toISOString();
  var card = {
    id: 'bc_' + Date.now(),
    name: info.title || 'Direktbuchung',
    category: info.category || '',
    stage: 'angebot',
    price: info.amount,
    listingId: info.listingId,
    listingImage: info.image || '',
    listingTitle: info.title || '',
    avatar: info.providerImg || info.image || '',
    providerId: info.providerId || 0,
    note: 'Sofortbuchung' + (info.dateHuman ? ' für ' + info.dateHuman : ''),
    bookingDate: info.dateIso || '',
    bookedAt: nowIso, invoiceSentAt: nowIso, paidAt: nowIso,
    paidAmount: info.amount, paymentMethod: 'Stripe',
    paymentIntentId: piId, paymentReference: piId,
    paymentStatus: 'paid', providerAcceptedAt: nowIso, createdAt: nowIso,
    _stageModel: EB_BOARD_STAGE_MODEL_VERSION
  };
  proj.cards = proj.cards || [];
  proj.cards.push(card);
  try { _saveBoardProjects && _saveBoardProjects({ immediate: true }); } catch (e) {}
  // Resonanz für den Dienstleister: Benachrichtigung unabhängig vom Board-Scan
  if (info.providerId) {
    try {
      _sendInvoiceNotification(card, proj, { providerId: info.providerId, _dbId: info.listingId, id: info.listingId, title: info.title }).catch(function() {});
    } catch (e) {}
  }
  return { project: proj, card: card };
}

/**
 * Markiert eine bestehende Board-Karte (Angebot bezahlt) als "Bezahlt".
 * Genutzt von inline-onSuccess UND Redirect-Rückkehr. Gibt { project, card, duplicate? } oder null.
 */
function _applyCardPaymentSuccess(cardId, projectId, amount, res) {
  try { _migrateBoardProjects && _migrateBoardProjects(); } catch (e) {}
  var project = (_boardProjects || []).find(function(p) { return p.id === projectId; });
  var card = project && (project.cards || []).find(function(c) { return c.id === cardId; });
  if (!card) return null;
  var piId = (res && (res.payment_intent_id || res.payment_intent)) || '';
  if (piId && card.paymentIntentId === piId && card.paymentStatus === 'paid') {
    return { project: project, card: card, duplicate: true };
  }
  var nowIso = new Date().toISOString();
  card.bookedAt = card.bookedAt || nowIso;
  card.invoiceSentAt = card.invoiceSentAt || nowIso;
  card.paidAt = nowIso;
  card.paidAmount = amount || parseFloat(card.price) || 0;
  card.paymentMethod = 'Stripe';
  card.paymentIntentId = piId;
  card.paymentReference = piId;
  card.paymentStatus = 'paid';
  // Bezahlt ist die letzte Prozessstufe. Wurde vorab bezahlt, bleibt die
  // Karte bis zur beidseitigen Erfüllungsbestätigung unter „Gebucht“.
  card.stage = card.fulfilledAt ? 'abgeschlossen' : 'angebot';
  card._stageModel = EB_BOARD_STAGE_MODEL_VERSION;
  var listing = (typeof LISTINGS !== 'undefined' ? LISTINGS : []).find(function(l) { return l.id === card.listingId; });
  try { _sendInvoiceNotification(card, project, listing).catch(function() {}); } catch (e) {}
  try { _saveBoardProjects && _saveBoardProjects({ immediate: true }); } catch (e) {}
  try {
    if (_activeBoardId === project.id) {
      if (typeof renderBoardFlow === 'function') renderBoardFlow();
      if (typeof renderKanban === 'function') renderKanban(project);
      if (typeof _updateBoardStats === 'function') _updateBoardStats(project);
    }
  } catch (e) {}
  return { project: project, card: card };
}

/**
 * Einheitlicher Erfolgs-Screen nach erfolgreicher Zahlung. Erklärt, was
 * als Nächstes passiert, und führt direkt ins Board.
 * info: { projectId, amount, title, dateHuman, providerName }
 */
function _showBookingSuccess(info) {
  info = info || {};
  var ex = document.getElementById('bookingSuccessModal');
  if (ex) ex.remove();
  var amountStr = '';
  try { amountStr = info.amount ? _formatEuro(info.amount) : ''; } catch (e) { amountStr = info.amount ? (info.amount + ' €') : ''; }
  var goBoard = info.projectId
    ? "document.getElementById('bookingSuccessModal').remove();navigateTo('board');if(typeof openBoardProject==='function'){openBoardProject('" + String(info.projectId).replace(/'/g, "") + "');}"
    : "document.getElementById('bookingSuccessModal').remove();navigateTo('board');";
  var html =
    '<div class="modal-overlay show" id="bookingSuccessModal" style="z-index:3000" onclick="if(event.target===this)this.remove()">' +
      '<div class="modal modal-sm" onclick="event.stopPropagation()" style="text-align:center;max-width:440px">' +
        '<div style="width:72px;height:72px;border-radius:50%;background:rgba(102,187,106,0.15);display:flex;align-items:center;justify-content:center;margin:8px auto 14px">' +
          '<span class="material-icons-round" style="font-size:42px;color:#66bb6a">check_circle</span>' +
        '</div>' +
        '<h2 style="margin:0 0 6px">Zahlung erfolgreich</h2>' +
        '<p style="color:var(--text-light);margin:0 0 4px">' + _escHtml(info.title || 'Deine Buchung ist bestätigt.') + '</p>' +
        (amountStr ? '<p style="font-weight:700;font-size:20px;margin:0 0 14px">' + _escHtml(amountStr) + '</p>' : '<div style="height:8px"></div>') +
        '<div style="text-align:left;background:var(--bg-alt);border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin:0 0 18px;font-size:14px;line-height:1.7">' +
          '<strong>Wie es jetzt weitergeht:</strong>' +
          '<div style="display:flex;gap:10px;margin-top:8px"><span class="material-icons-round" style="color:var(--primary);font-size:20px">view_kanban</span><span>Die Buchung liegt in deinem <strong>Planungs-Board</strong> unter „Direktbuchungen".</span></div>' +
          '<div style="display:flex;gap:10px;margin-top:8px"><span class="material-icons-round" style="color:var(--primary);font-size:20px">notifications_active</span><span>Der Dienstleister wurde benachrichtigt und sieht die Buchung in seinem <strong>Auftragsboard</strong>.</span></div>' +
          '<div style="display:flex;gap:10px;margin-top:8px"><span class="material-icons-round" style="color:var(--primary);font-size:20px">event_available</span><span>Am Event-Tag bestätigt ihr beide die Leistung – erst dann gilt der Auftrag als erfüllt.</span></div>' +
        '</div>' +
        '<button class="btn-primary btn-block" onclick="' + goBoard + '"><span class="material-icons-round">view_kanban</span> Zum Board</button>' +
        '<button class="btn-outline btn-block" style="margin-top:8px" onclick="document.getElementById(\'bookingSuccessModal\').remove()">Schließen</button>' +
      '</div>' +
    '</div>';
  document.body.insertAdjacentHTML('beforeend', html);
}

/**
 * Redirect-Rückkehr des Stripe Payment Elements (3-D-Secure / Bankredirect).
 * Stripe hängt ?payment_intent=…&redirect_status=succeeded an die return_url.
 * Verifiziert server-seitig und wendet das persistierte Pending-Payment an.
 */
var _pendingPaymentResolving = false;

function _handlePaymentElementReturn(piParam, redirectStatus) {
  function cleanUrl() {
    try {
      var clean = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, clean);
    } catch (e) {}
  }
  if (redirectStatus && redirectStatus !== 'succeeded') {
    _clearPendingPayment();
    cleanUrl();
    showToast(redirectStatus === 'failed' ? 'Zahlung fehlgeschlagen.' : 'Zahlung nicht abgeschlossen.', 'info');
    return;
  }
  // PaymentIntent ins Pending uebernehmen, damit die Buchung auch einen
  // Reload bzw. eine noch nicht wiederhergestellte Session uebersteht.
  var pending = _getPendingPayment() || { type: 'unknown' };
  pending.pi = piParam;
  _setPendingPayment(pending);
  cleanUrl();
  _resolvePendingPayment();
}

/**
 * Verifiziert ein persistiertes Pending-Payment server-seitig und legt die
 * Board-Karte an - aber nur, wenn currentUser bereit ist (sonst ist der
 * Board-Storage-Key null und die Karte ginge verloren). Wird beim Init UND
 * nach jedem Login aufgerufen; das Pending bleibt bis zum Erfolg bestehen.
 */
function _resolvePendingPayment() {
  if (_pendingPaymentResolving) return;
  var pending = _getPendingPayment();
  if (!pending || !pending.pi) return;
  _pendingPaymentResolving = true;
  fetch(_apiUrl('stripe/verify-payment'), {
    method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
    body: JSON.stringify({ payment_intent: pending.pi })
  }).then(function(r) { return r.json().then(function(j) { return { ok: r.ok, data: j }; }); })
    .then(function(vr) {
      _pendingPaymentResolving = false;
      if (vr.ok && vr.data && vr.data.paid === false) {
        _clearPendingPayment();
        return;
      }
      if (!vr.ok || !vr.data || !vr.data.paid) {
        return; // unklar (401 vor Session-Restore, Netz) -> Pending behalten, spaeter erneut
      }
      if (!currentUser) return; // user-scoped Board braucht currentUser -> nach Login erneut
      var res = { payment_intent_id: pending.pi, payment_intent: pending.pi, amount: vr.data.amount, status: vr.data.status };
      try { _migrateBoardProjects && _migrateBoardProjects(); _loadBoardProjects && _loadBoardProjects(); } catch (e) {}
      if (pending.type === 'instant') {
        var info = pending.info || {};
        var r1 = _applyInstantBookingSuccess(info, res);
        _clearPendingPayment();
        _showBookingSuccess({ projectId: r1 && r1.project && r1.project.id, amount: info.amount, title: info.title, dateHuman: info.dateHuman, providerName: info.provider });
      } else if (pending.type === 'card') {
        var r2 = _applyCardPaymentSuccess(pending.cardId, pending.projectId, pending.amount, res);
        _clearPendingPayment();
        if (r2) _showBookingSuccess({ projectId: pending.projectId, amount: pending.amount, title: (r2.card && r2.card.name) || pending.title });
        else showToast('Zahlung bestaetigt.', 'paid');
      } else {
        _clearPendingPayment();
        try { _reconcileStripePayments && _reconcileStripePayments(); } catch (e) {}
        showToast('Zahlung erfolgreich bestaetigt.', 'paid');
      }
    }).catch(function() {
      _pendingPaymentResolving = false;
    });
}

/**
 * Stripe-Checkout Return Handler: wird beim Laden ausgefuehrt.
 * Liest ?stripe=success|cancel&card_id=&project_id=&session_id=, setzt die
 * entsprechende Karte auf "Bezahlt" (oder rollt zurueck bei Cancel) und
 * raeumt die URL auf. Erkennt zusätzlich die Payment-Element-Rückkehr
 * (?payment_intent=&redirect_status=) für redirect-pflichtige Zahlungen.
 */
function _handleStripeReturn() {
  var _peParams = new URLSearchParams(window.location.search || '');
  var _peIntent = _peParams.get('payment_intent');
  var _peStatus = _peParams.get('redirect_status');
  if (_peIntent && _peStatus) { _handlePaymentElementReturn(_peIntent, _peStatus); return; }
  var params = new URLSearchParams(window.location.search || '');
  var status = params.get('stripe');
  if (!status) return;
  var cardId    = params.get('card_id') || '';
  var projectId = params.get('project_id') || '';
  var sessionId = params.get('session_id') || '';

  // Board laden (nur fuer eingeloggte Nutzer sinnvoll)
  try { _migrateBoardProjects && _migrateBoardProjects(); _loadBoardProjects && _loadBoardProjects(); } catch(e) {}

  var proj = (_boardProjects || []).find(function(p){ return p.id === projectId; });
  var card = proj && (proj.cards || []).find(function(c){ return c.id === cardId; });

  if (status === 'success' && card) {
    card.paidAt = new Date().toISOString();
    card.paymentStatus = 'Bezahlt';
    card.paymentMethod = 'Stripe';
    card.paymentReference = sessionId || card.paymentReference || '';
    card.stripePending = false;
    if (card.fulfilledAt) card.stage = 'abgeschlossen';
    card._stageModel = EB_BOARD_STAGE_MODEL_VERSION;
    try { _saveBoardProjects && _saveBoardProjects(); } catch(e) {}
    showToast('Zahlung via Stripe erfolgreich – Status: Bezahlt.', 'paid');
  } else if (status === 'cancel' && card) {
    card.stripePending = false;
    try { _saveBoardProjects && _saveBoardProjects(); } catch(e) {}
    showToast('Stripe-Zahlung abgebrochen – keine Aenderung.', 'info');
  } else if (status === 'success') {
    showToast('Zahlung empfangen.', 'paid');
  } else if (status === 'cancel') {
    showToast('Zahlung abgebrochen.', 'info');
  }

  // URL aufraeumen, damit Reload kein Duplikat triggert
  try {
    var clean = window.location.pathname + window.location.hash;
    window.history.replaceState({}, document.title, clean);
  } catch(e) {}
}

/**
 * Reconcile: per Webhook bestaetigte Zahlungen, die vom Client ggf. verpasst wurden
 * (z.B. Tab-Close nach 3DS-Challenge). Wird beim Login und beim Oeffnen des Boards
 * aufgerufen. Markiert betroffene Karten rueckwirkend als "Bezahlt" und quittiert
 * die PIs server-seitig (damit sie nicht nochmal liefern).
 */
function _reconcileStripePayments() {
  if (!currentUser) return Promise.resolve();
  return fetch(_apiUrl('stripe/reconcile'), {
    method: 'GET',
    credentials: 'same-origin',
    headers: _apiHeaders()
  }).then(function(r){ return r.ok ? r.json() : { items: [] }; })
    .then(function(resp){
      var items = (resp && resp.items) || [];
      if (!items.length) return;
      try { _migrateBoardProjects && _migrateBoardProjects(); _loadBoardProjects && _loadBoardProjects(); } catch(e) {}

      var acked = [];
      var matched = 0;
      items.forEach(function(it){
        var proj = (_boardProjects || []).find(function(p){ return p.id === it.project_id; });
        var card = proj && (proj.cards || []).find(function(c){ return c.id === it.card_id; });
        if (card) {
          if (card.paymentReference !== it.pi) {
            card.paymentReference = it.pi;
            card.paymentMethod    = 'Stripe';
            card.paymentStatus    = 'Bezahlt';
            card.paidAt           = card.paidAt || new Date((it.paid_at || 0) * 1000).toISOString();
            card.paidAmount       = card.paidAmount || ((it.amount || 0) / 100);
            card.stripePending    = false;
            if (card.fulfilledAt) card.stage = 'abgeschlossen';
            card._stageModel = EB_BOARD_STAGE_MODEL_VERSION;
            matched++;
          }
          acked.push(it.pi);
        }
      });

      if (matched) {
        try { _saveBoardProjects && _saveBoardProjects(); } catch(e) {}
        try { if (typeof renderBoardFlow === 'function') renderBoardFlow(); } catch(e) {}
        showToast(matched + ' Zahlung' + (matched === 1 ? '' : 'en') + ' via Webhook nachtraeglich bestaetigt.', 'paid');
      }
      if (acked.length) {
        fetch(_apiUrl('stripe/reconcile') + '?ack=' + encodeURIComponent(acked.join(',')), {
          method: 'GET', credentials: 'same-origin', headers: _apiHeaders()
        }).catch(function(){});
      }
    }).catch(function(){});
}

// ─── Stripe Connect: Auszahlungskonto für Dienstleister ──────────────────────

function _renderCreatePayoutNotice(data) {
  var notice = document.getElementById('createPayoutNotice');
  if (!notice) {
    var subtitle = document.querySelector('#page-create-listing .create-subtitle');
    if (subtitle && subtitle.parentNode) {
      notice = document.createElement('div');
      notice.id = 'createPayoutNotice';
      notice.className = 'create-payout-notice';
      notice.style.display = 'none';
      subtitle.parentNode.insertBefore(notice, subtitle.nextSibling);
    }
  }
  if (!notice) return;
  if (!currentUser || !isDienstleister() || (data && data.status === 'hidden')) {
    notice.style.display = 'none';
    notice.innerHTML = '';
    return;
  }

  data = data || {};
  var status = data.status || 'none';
  var isActive = status === 'active';
  var isPending = status === 'pending';
  var isLoading = status === 'loading';
  var cls = isActive ? ' is-active' : (isPending ? '' : ' is-warning');
  var icon = isActive ? 'verified' : (isPending || isLoading ? 'hourglass_top' : 'account_balance');
  var title = 'Auszahlungskonto verbinden';
  var text = 'Du kannst dein Inserat erstellen. Buchungen und Sofortzahlungen werden erst freigegeben, wenn Stripe dein Auszahlungs-Konto verifiziert hat.';
  var actions = '';

  if (isLoading) {
    title = 'Auszahlungsstatus wird geprüft';
    text = 'Ich prüfe gerade, ob dein Stripe-Auszahlungskonto bereit ist.';
  } else if (isActive) {
    title = 'Auszahlungen sind aktiv';
    text = 'Kunden können deine Inserate buchen. Zahlungen laufen über Stripe Connect und werden deinem Auszahlungs-Konto zugeordnet.';
    actions =
      '<button type="button" class="btn-outline btn-sm" onclick="openStripeConnectDashboard()">' +
        '<span class="material-icons-round">open_in_new</span> Stripe öffnen' +
      '</button>';
  } else if (isPending) {
    title = 'Stripe prüft deine Angaben';
    text = 'Dein Konto ist angelegt, aber noch nicht vollständig für Buchungen freigeschaltet. Falls Stripe noch Angaben braucht, führe das Onboarding fort.';
    actions =
      '<button type="button" class="btn-primary btn-sm" onclick="connectStripeAccount(this)" style="background:#635BFF;border-color:#635BFF">' +
        '<span class="material-icons-round">settings</span> Onboarding fortsetzen' +
      '</button>';
  } else {
    actions =
      '<button type="button" class="btn-primary btn-sm" onclick="connectStripeAccount(this)" style="background:#635BFF;border-color:#635BFF">' +
        '<span class="material-icons-round">link</span> Stripe verbinden' +
      '</button>';
  }

  notice.className = 'create-payout-notice' + cls;
  notice.innerHTML =
    '<div class="create-payout-notice-inner">' +
      '<span class="material-icons-round">' + icon + '</span>' +
      '<div>' +
        '<div class="create-payout-title">' + _escHtml(title) + '</div>' +
        '<div class="create-payout-text">' + _escHtml(text) + '</div>' +
      '</div>' +
      '<div class="create-payout-actions">' + actions + '</div>' +
    '</div>';
  notice.style.display = '';
}

function _stripeDiagTone(tone) {
  return ['ok', 'warn', 'bad'].indexOf(tone) !== -1 ? tone : 'neutral';
}

function _stripeDiagRow(label, value, tone) {
  return '<div class="stripe-connect-diagnostics-row stripe-connect-diagnostics-row-' + _stripeDiagTone(tone) + '">' +
    '<span>' + _escHtml(label) + '</span>' +
    '<strong>' + _escHtml(value || 'unbekannt') + '</strong>' +
  '</div>';
}

function _stripeKeyKindLabel(kind) {
  var labels = {
    restricted: 'Restricted Key',
    secret: 'Secret Key',
    publishable: 'Publishable Key',
    missing: 'fehlt',
    unknown: 'unbekannt'
  };
  return labels[kind] || 'unbekannt';
}

function _stripeStatusLabel(status) {
  var labels = {
    active: 'aktiv',
    pending: 'in Prüfung',
    incomplete: 'unvollständig',
    none: 'nicht verbunden',
    admin: 'Admin-Prüfung'
  };
  return labels[status] || 'unbekannt';
}

function _renderStripeConnectDiagnostics(data) {
  var box = document.getElementById('stripeConnectDiagnosticsResult');
  if (!box) return;
  data = data || {};

  var rows = [];
  rows.push(_stripeDiagRow('Stripe-Modus', data.configured_mode === 'test' ? 'Test/Sandbox' : 'Live', data.configured_mode === 'test' ? 'warn' : 'ok'));
  rows.push(_stripeDiagRow('Modus-Schalter', data.configured_mode_present ? 'gesetzt' : 'nicht gesetzt', data.configured_mode_present ? 'ok' : 'warn'));
  rows.push(_stripeDiagRow('Test-Key-Paar', (data.test_public_key_configured && data.test_secret_key_configured) ? 'gesetzt' : 'fehlt', (data.test_public_key_configured && data.test_secret_key_configured) ? 'ok' : (data.configured_mode === 'test' ? 'bad' : 'neutral')));
  rows.push(_stripeDiagRow('Test-Webhook', data.test_webhook_configured ? 'gesetzt' : 'fehlt', data.test_webhook_configured ? 'ok' : (data.configured_mode === 'test' ? 'warn' : 'neutral')));
  var smoke = data.connect_smoke || {};
  var smokeReady = smoke.status === 'ready';
  var smokeSkipped = smoke.status === 'skipped_live';
  rows.push(_stripeDiagRow('Connect Smoke', smokeReady ? 'bereit' : (smokeSkipped ? 'nur im Testmodus' : 'blockiert'), smokeReady ? 'ok' : (smokeSkipped ? 'neutral' : 'bad')));
  rows.push(_stripeDiagRow('Secret-Key', data.secret_key_configured ? 'gesetzt' : 'fehlt', data.secret_key_configured ? 'ok' : 'bad'));
  rows.push(_stripeDiagRow('Secret-Typ', _stripeKeyKindLabel(data.secret_key_kind), data.secret_key_configured ? 'ok' : 'bad'));
  rows.push(_stripeDiagRow('Secret-Modus', data.secret_key_mode || 'unbekannt', data.secret_key_mode === 'live' ? 'ok' : (data.secret_key_mode === 'test' ? 'warn' : 'bad')));
  rows.push(_stripeDiagRow('Public-Key', data.public_key_configured ? 'gesetzt' : 'fehlt', data.public_key_configured ? 'ok' : 'warn'));
  rows.push(_stripeDiagRow('Public-Modus', data.public_key_mode || 'unbekannt', data.public_key_mode === 'live' ? 'ok' : (data.public_key_mode === 'test' ? 'warn' : 'neutral')));

  if (data.mode_match === false) {
    rows.push(_stripeDiagRow('Live/Test-Mix', 'Public und Secret passen nicht zusammen', 'bad'));
  } else if (data.mode_match === true) {
    rows.push(_stripeDiagRow('Live/Test-Mix', 'passt', 'ok'));
  }

  rows.push(_stripeDiagRow('Stripe API', data.stripe_account_read_ok ? 'erreichbar' : 'nicht bestätigt', data.stripe_account_read_ok ? 'ok' : 'bad'));

  var payDomain = data.payment_method_domain || {};
  var domainLabel = payDomain.domain ? payDomain.domain + ' · ' + (payDomain.configured ? (payDomain.status || 'registriert') : 'nicht registriert') : 'unbekannt';
  rows.push(_stripeDiagRow('Apple Pay Domain', domainLabel, payDomain.configured ? 'ok' : (payDomain.status === 'stripe_error' ? 'bad' : 'warn')));

  var connect = data.connect_status || {};
  rows.push(_stripeDiagRow('Connect-Konto', connect.connect_id_present ? _stripeStatusLabel(connect.status) : 'noch nicht verbunden', connect.active ? 'ok' : (connect.status === 'pending' ? 'warn' : 'neutral')));

  var error = data.stripe_error || {};
  var domainError = payDomain.stripe_error || {};
  var permissions = Array.isArray(data.required_permissions) ? data.required_permissions : (Array.isArray(error.required_permissions) ? error.required_permissions : []);
  if (!permissions.length && Array.isArray(domainError.required_permissions)) permissions = domainError.required_permissions;
  var hint = error.admin_hint || data.admin_hint || '';
  if (!hint && domainError.admin_hint) hint = domainError.admin_hint;
  var message = data.message || (data.ok ? 'Konfiguration erreichbar.' : 'Konfiguration konnte nicht bestätigt werden.');
  var setupUrl = (error && error.connect_setup_url) || data.connect_setup_url || '';
  var setupHtml = setupUrl
    ? '<a class="stripe-connect-error-link stripe-connect-setup-link" href="' + _escHtml(setupUrl) + '" target="_blank" rel="noopener noreferrer"><span class="material-icons-round">admin_panel_settings</span> Stripe Connect aktivieren</a>'
    : '';

  var permsHtml = '';
  if (permissions.length) {
    permsHtml =
      '<div class="stripe-connect-diagnostics-perms">' +
        '<span>Benötigte Stripe-Rechte</span>' +
        '<code>' + permissions.map(_escHtml).join('</code><code>') + '</code>' +
      '</div>';
  }

  box.innerHTML =
    '<div class="stripe-connect-diagnostics-head">' +
      '<span class="material-icons-round">' + (data.ok ? 'verified' : 'report') + '</span>' +
      '<div>' +
        '<strong>' + (data.ok ? 'Stripe-Konfiguration bereit' : 'Stripe-Konfiguration prüfen') + '</strong>' +
        '<p>' + _escHtml(message) + '</p>' +
      '</div>' +
    '</div>' +
    '<div class="stripe-connect-diagnostics-grid">' + rows.join('') + '</div>' +
    (hint ? '<p class="stripe-connect-diagnostics-hint">' + _escHtml(hint) + '</p>' : '') +
    setupHtml +
    permsHtml;
  box.style.display = '';
}

function runStripeConnectDiagnostics(btn) {
  if (!currentUser || !currentUser.isAdmin) {
    showToast('Nur Admins können die Stripe-Konfiguration prüfen.', 'warning');
    return;
  }
  var box = document.getElementById('stripeConnectDiagnosticsResult');
  if (box) {
    box.style.display = '';
    box.innerHTML =
      '<div class="stripe-connect-diagnostics-head">' +
        '<span class="material-icons-round btn-spinner">sync</span>' +
        '<div><strong>Stripe-Konfiguration wird geprüft</strong><p>Key wird sicher serverseitig getestet.</p></div>' +
      '</div>';
  }
  _setBtnLoading(btn, true);
  fetch(_apiUrl('stripe/connect/diagnostics'), {
    method: 'GET',
    credentials: 'same-origin',
    headers: _apiHeaders()
  })
  .then(function(r) {
    return r.json().then(function(data) {
      data = data || {};
      if (!r.ok && !data.message) data.message = 'Stripe-Diagnose konnte nicht geladen werden.';
      return data;
    });
  })
  .then(function(data) {
    _renderStripeConnectDiagnostics(data);
    if (data && data.ok) {
      showToast('Stripe-Konfiguration erreichbar.', 'check_circle');
    } else {
      showToast((data && data.message) || 'Stripe-Konfiguration prüfen.', 'warning');
    }
  })
  .catch(function() {
    if (box) {
      box.style.display = '';
      box.innerHTML = '<div class="stripe-connect-diagnostics-head"><span class="material-icons-round">report</span><div><strong>Diagnose fehlgeschlagen</strong><p>Netzwerkfehler beim Prüfen.</p></div></div>';
    }
    showToast('Stripe-Diagnose fehlgeschlagen.', 'error');
  })
  .finally(function() {
    _setBtnLoading(btn, false);
  });
}

function registerStripePaymentDomain(btn) {
  if (!currentUser || !currentUser.isAdmin) {
    showToast('Nur Admins können die Wallet-Domain registrieren.', 'warning');
    return;
  }
  _setBtnLoading(btn, true);
  fetch(_apiUrl('stripe/payment-domain/register'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: _apiHeaders()
  })
  .then(function(r) {
    return r.json().then(function(data) {
      return { ok: r.ok, data: data || {} };
    });
  })
  .then(function(res) {
    var data = res.data || {};
    if (!res.ok || !data.ok) {
      if (data && data.admin_hint) console.warn('[eventboerse] Stripe Payment Domain:', data.admin_hint);
      showToast(data.message || 'Wallet-Domain konnte nicht registriert werden.', 'warning');
      _renderStripeConnectDiagnostics({
        ok: false,
        message: data.message || 'Wallet-Domain konnte nicht registriert werden.',
        stripe_error: data,
        payment_method_domain: { configured: false, status: 'stripe_error' }
      });
      return;
    }
    showToast(data.message || 'Wallet-Domain registriert.', 'check_circle');
    runStripeConnectDiagnostics(null);
  })
  .catch(function() {
    showToast('Wallet-Domain Registrierung fehlgeschlagen.', 'error');
  })
  .finally(function() {
    _setBtnLoading(btn, false);
  });
}

/**
 * Stripe-Connect-Status laden und Einstellungs-UI aktualisieren.
 */
function loadStripeConnectStatus() {
  var card = document.getElementById('stripeConnectCard');
  var statusEl   = document.getElementById('stripeConnectStatusText');
  var accountRow = document.getElementById('stripeConnectAccountRow');
  var accountIdEl= document.getElementById('stripeConnectAccountId');
  var connectBtn = document.getElementById('stripeConnectBtn');
  var dashBtn    = document.getElementById('stripeConnectDashboardBtn');
  var disconnBtn = document.getElementById('stripeDisconnectBtn');
  var diagBtn    = document.getElementById('stripeConnectDiagnosticsBtn');
  var domainBtn  = document.getElementById('stripePaymentDomainBtn');
  var diagResult = document.getElementById('stripeConnectDiagnosticsResult');
  var isProvider = !!(currentUser && isDienstleister());
  var isAdmin    = !!(currentUser && currentUser.isAdmin);

  if (!currentUser || (!isProvider && !isAdmin)) {
    if (card) card.style.display = 'none';
    if (domainBtn) domainBtn.style.display = 'none';
    if (diagResult) diagResult.style.display = 'none';
    _renderCreatePayoutNotice({ status: 'hidden' });
    return Promise.resolve(null);
  }
  if (card) card.style.display = '';
  if (diagBtn) diagBtn.style.display = isAdmin ? '' : 'none';
  if (domainBtn) domainBtn.style.display = isAdmin ? '' : 'none';
  if (diagResult && !isAdmin) diagResult.style.display = 'none';

  if (!isProvider && isAdmin) {
    if (statusEl) statusEl.textContent = 'Admin-Prüfung verfügbar';
    if (accountRow) accountRow.style.display = 'none';
    if (connectBtn) connectBtn.style.display = 'none';
    if (dashBtn) dashBtn.style.display = 'none';
    if (disconnBtn) disconnBtn.style.display = 'none';
    if (domainBtn) domainBtn.style.display = '';
    _renderCreatePayoutNotice({ status: 'hidden' });
    return Promise.resolve({ status: 'admin' });
  }

  _renderCreatePayoutNotice({ status: 'loading' });

  if (statusEl) statusEl.textContent = 'Wird geladen …';

  return fetch(_apiUrl('stripe/connect/status'), {
    method: 'GET',
    credentials: 'same-origin',
    headers: _apiHeaders()
  })
  .then(function(r) { return r.ok ? r.json() : { status: 'none' }; })
  .then(function(data) {
    var s = (data && data.status) || 'none';
    window._stripeConnectStatus = data || { status: s };
    _renderCreatePayoutNotice(data || { status: s });

    if (statusEl) {
      var labels = {
        active:     '✅ Aktiv – Auszahlungen freigeschaltet',
        pending:    '⏳ In Bearbeitung – Stripe prüft deine Angaben',
        incomplete: '⚠️ Unvollständig – Onboarding nicht abgeschlossen',
        none:       'Nicht verbunden'
      };
      statusEl.textContent = labels[s] || 'Unbekannt';
    }

    if (accountRow && accountIdEl && data.connect_id) {
      accountIdEl.textContent = data.connect_id;
      accountRow.style.display = (s !== 'none') ? '' : 'none';
    }

    if (s === 'active') {
      if (connectBtn)  { connectBtn.style.display = 'none'; }
      if (dashBtn)     { dashBtn.style.display = ''; }
      if (disconnBtn)  { disconnBtn.style.display = ''; }
    } else if (s === 'pending' || s === 'incomplete') {
      if (connectBtn)  { connectBtn.style.display = ''; connectBtn.innerHTML = '<span class="material-icons-round">settings</span> Onboarding fortsetzen'; }
      if (dashBtn)     { dashBtn.style.display = 'none'; }
      if (disconnBtn)  { disconnBtn.style.display = ''; }
    } else {
      if (connectBtn)  { connectBtn.style.display = ''; connectBtn.innerHTML = '<span class="material-icons-round">link</span> Stripe-Konto verbinden'; }
      if (dashBtn)     { dashBtn.style.display = 'none'; }
      if (disconnBtn)  { disconnBtn.style.display = 'none'; }
      if (accountRow)  { accountRow.style.display = 'none'; }
    }
    return data || { status: s };
  })
  .catch(function() {
    if (statusEl) statusEl.textContent = 'Fehler beim Laden – bitte Seite neu laden.';
    _renderCreatePayoutNotice({ status: 'none' });
    return { status: 'none', error: true };
  });
}

var _stripeConnectCallerBtn = null;

function connectStripeAccount(btn) {
  _stripeConnectCallerBtn = btn;
  var toggle = document.getElementById('stripeBusinessTypeToggle');
  var defaultType = (currentUser && currentUser.company) ? 'company' : 'individual';
  if (toggle) {
    toggle.querySelectorAll('.role-btn').forEach(function(b) { b.classList.remove('active'); });
    var selected = toggle.querySelector('[data-btype="' + defaultType + '"]') || toggle.querySelector('[data-btype="individual"]');
    if (selected) selected.classList.add('active');
  }
  var companyFields = document.getElementById('stripeCompanyFields');
  if (companyFields) companyFields.classList.toggle('reg-collapsed', defaultType !== 'company');
  var companyNameInput = document.getElementById('stripeCompanyName');
  if (companyNameInput && currentUser && currentUser.company) companyNameInput.value = currentUser.company;
  var vatInput = document.getElementById('stripeCompanyVat');
  if (vatInput && currentUser && currentUser.vatId) vatInput.value = currentUser.vatId;
  openModal('stripeBusinessTypeModal');
}

function selectStripeBusinessType(btn, type) {
  var toggle = document.getElementById('stripeBusinessTypeToggle');
  if (toggle) toggle.querySelectorAll('.role-btn').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  var companyFields = document.getElementById('stripeCompanyFields');
  if (companyFields) {
    if (type === 'company') companyFields.classList.remove('reg-collapsed');
    else companyFields.classList.add('reg-collapsed');
  }
}

function _clearStripeBusinessTypeError() {
  var old = document.getElementById('stripeBusinessTypeError');
  if (old) old.remove();
}

function _stripeConnectReadableError(data) {
  data = data || {};
  var msg = data.message || 'Stripe-Auszahlungskonto konnte nicht eingerichtet werden.';

  if (data.stripe_message) {
    msg += ' Stripe: ' + data.stripe_message;
  }

  if (Array.isArray(data.required_permissions) && data.required_permissions.length) {
    msg += ' Fehlende Rechte: ' + data.required_permissions.join(', ');
  }

  if (data.admin_hint && currentUser && currentUser.isAdmin) {
    msg += ' ' + data.admin_hint;
  }

  if (data.http_status && data.http_status >= 500) {
    msg += ' HTTP ' + data.http_status + '.';
  }
  return msg;
}

function _isStripeOnboardingUrl(url) {
  url = String(url || '');
  return /^https:\/\/connect\.stripe\.com\//.test(url);
}

function _isStripeDashboardUrl(url) {
  url = String(url || '');
  return /^https:\/\/dashboard\.stripe\.com\/connect(?:$|[/?#])/.test(url);
}

function _showStripeBusinessTypeError(data) {
  _clearStripeBusinessTypeError();
  var confirmBtn = document.getElementById('stripeBusinessTypeConfirmBtn');
  if (!confirmBtn) return;
  data = data || {};
  var linkHtml = '';
  if (data.onboarding_url && _isStripeOnboardingUrl(data.onboarding_url)) {
    linkHtml =
      '<a class="stripe-connect-error-link" href="' + _escHtml(data.onboarding_url) + '" target="_blank" rel="noopener noreferrer">' +
        '<span class="material-icons-round">open_in_new</span> Stripe jetzt öffnen' +
      '</a>';
  }
  if (data.connect_setup_url && _isStripeDashboardUrl(data.connect_setup_url)) {
    linkHtml +=
      '<a class="stripe-connect-error-link stripe-connect-setup-link" href="' + _escHtml(data.connect_setup_url) + '" target="_blank" rel="noopener noreferrer">' +
        '<span class="material-icons-round">admin_panel_settings</span> Stripe Connect aktivieren' +
      '</a>';
  }
  var box = document.createElement('div');
  box.id = 'stripeBusinessTypeError';
  box.className = 'stripe-connect-inline-error';
  box.innerHTML =
    '<span class="material-icons-round">report</span>' +
    '<div>' +
      '<strong>Stripe-Verbindung konnte nicht gestartet werden</strong>' +
      '<p>' + _escHtml(_stripeConnectReadableError(data)) + '</p>' +
      linkHtml +
    '</div>';
  confirmBtn.parentNode.insertBefore(box, confirmBtn);
}

function _stripeConnectJsonResponse(r) {
  return r.text().then(function(text) {
    var data = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (err) {
        data = {
          message: r.ok
            ? 'Stripe hat eine unerwartete Antwort geliefert.'
            : 'Serverfehler beim Stripe-Onboarding. Bitte Stripe-Konfiguration prüfen.',
          code: 'stripe_connect_non_json_response',
          admin_hint: 'Die REST-Antwort war kein JSON. HTTP ' + r.status + '.'
        };
      }
    }
    data.http_status = r.status;
    data.http_ok = r.ok;
    return data;
  });
}

function confirmStripeBusinessType(confirmBtn) {
  _clearStripeBusinessTypeError();
  var toggle = document.getElementById('stripeBusinessTypeToggle');
  var active = toggle ? toggle.querySelector('.role-btn.active') : null;
  var businessType = active ? (active.dataset.btype || 'individual') : 'individual';

  var companyName = '';
  var vatId = '';
  if (businessType === 'company') {
    companyName = (document.getElementById('stripeCompanyName') || {}).value || '';
    vatId       = (document.getElementById('stripeCompanyVat')  || {}).value || '';
    if (!companyName.trim()) {
      showToast('Bitte Firmennamen eingeben.', 'error');
      return;
    }
  }

  _setBtnLoading(confirmBtn, true);
  fetch(_apiUrl('stripe/connect/onboard'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: Object.assign({}, _apiHeaders(), { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ business_type: businessType, company_name: companyName, vat_id: vatId })
  })
  .then(_stripeConnectJsonResponse)
  .then(function(data) {
    _setBtnLoading(confirmBtn, false);
    if (data && data.onboarding_url) {
      if (!_isStripeOnboardingUrl(data.onboarding_url)) {
        _showStripeBusinessTypeError({ message: 'Stripe hat keinen gültigen Onboarding-Link geliefert.' });
        showToast('Stripe hat keinen gültigen Onboarding-Link geliefert.', 'error');
        return;
      }

      window.location.assign(data.onboarding_url);
      window.setTimeout(function() {
        _showStripeBusinessTypeError({
          message: 'Falls die Weiterleitung nicht automatisch startet, öffne Stripe direkt über diesen Button.',
          onboarding_url: data.onboarding_url
        });
      }, 900);
    } else {
      if (data && data.admin_hint) console.warn('[eventboerse] Stripe Connect:', data.admin_hint);
      _showStripeBusinessTypeError(data || {});
      var msg = _stripeConnectReadableError(data || {});
      showToast(msg, 'error');
    }
  })
  .catch(function() {
    _setBtnLoading(confirmBtn, false);
    _showStripeBusinessTypeError({ message: 'Netzwerkfehler. Bitte erneut versuchen.' });
    showToast('Netzwerkfehler. Bitte erneut versuchen.', 'error');
  });
}

function openStripeConnectDashboard() {
  fetch(_apiUrl('stripe/connect/status?login_link=1'), {
    method: 'GET',
    credentials: 'same-origin',
    headers: _apiHeaders()
  })
  .then(function(r) { return r.ok ? r.json() : {}; })
  .then(function(data) {
    var url = (data && data.login_link) || 'https://dashboard.stripe.com/express';
    window.open(url, '_blank', 'noopener,noreferrer');
  })
  .catch(function() {
    window.open('https://dashboard.stripe.com/express', '_blank', 'noopener,noreferrer');
  });
}

function disconnectStripeAccount() {
  if (!confirm('Stripe-Konto wirklich trennen?\n\nFür neue Buchungen erhältst du keine automatischen Auszahlungen mehr, bis du dein Konto wieder verbindest.')) return;
  fetch(_apiUrl('stripe/connect/disconnect'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: _apiHeaders()
  })
  .then(function(r) { return r.json(); })
  .then(function() {
    showToast('Stripe-Konto getrennt.', 'info');
    loadStripeConnectStatus();
  })
  .catch(function() {
    showToast('Fehler beim Trennen. Bitte erneut versuchen.', 'error');
  });
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stripe Elements Modal (embedded, kein Redirect).
 * opts: { amount, title, cardId, projectId, listingId, onSuccess(result), onCancel? }
 * Flow:
 *   1) /stripe/create-payment-intent → client_secret + publishable_key
 *   2) Stripe.js Elements mit Payment Element mounten
 *   3) confirmPayment({ elements, redirect: 'if_required' })
 *   4) /stripe/verify-payment → server-seitig bestaetigen (authoritativ)
 *   5) onSuccess(result) aufrufen
 */
function _openStripePaymentModal(opts) {
  opts = opts || {};
  if (typeof Stripe === 'undefined') {
    showToast('Stripe.js konnte nicht geladen werden. Bitte Seite neu laden.', 'error');
    return;
  }

  // Overlay + Modal-Markup
  var ov = document.createElement('div');
  ov.className = 'stripe-modal-overlay';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-modal', 'true');

  // Visuelle Zusammenfassung (Bild + Meta) – gibt mehr Kontext zur Buchung
  var _img = opts.image || '';
  var _provider = opts.provider || '';
  var _category = opts.category || '';
  var _dateLabel = opts.dateLabel || '';
  var _duration = opts.duration || '';
  var _instant = !!opts.instant;
  var _summaryThumb = _img
    ? '<div class="stripe-summary-thumb"><img src="' + _escHtml(_img) + '" alt="" loading="lazy" /></div>'
    : '<div class="stripe-summary-thumb stripe-summary-thumb-placeholder"><span class="material-icons-round">image</span></div>';
  var _summaryMeta = '';
  if (_provider) _summaryMeta += '<span><span class="material-icons-round">person</span>' + _escHtml(_provider) + '</span>';
  if (_dateLabel) _summaryMeta += '<span><span class="material-icons-round">event</span>' + _escHtml(_dateLabel) + '</span>';
  if (_duration)  _summaryMeta += '<span><span class="material-icons-round">schedule</span>' + _escHtml(String(_duration)) + ' Std.</span>';
  var _summaryHtml =
    '<div class="stripe-summary' + (_instant ? ' is-instant' : '') + '">' +
      _summaryThumb +
      '<div class="stripe-summary-body">' +
        (_instant ? '<span class="stripe-summary-badge"><span class="material-icons-round">bolt</span> Sofortbuchung</span>' : '') +
        (_category ? '<span class="stripe-summary-cat">' + _escHtml(_category) + '</span>' : '') +
        '<strong class="stripe-summary-title">' + _escHtml(opts.title || 'Buchung') + '</strong>' +
        (_summaryMeta ? '<div class="stripe-summary-meta">' + _summaryMeta + '</div>' : '') +
        '<div class="stripe-summary-price">' + _escHtml(_formatEuro(opts.amount)) + '</div>' +
      '</div>' +
    '</div>';

  ov.innerHTML =
    '<div class="stripe-modal">' +
      '<div class="stripe-modal-header">' +
        '<div>' +
          '<div class="stripe-modal-title"><span class="material-icons-round">lock</span> Sichere Zahlung</div>' +
          '<div class="stripe-modal-sub">Pr\u00fcfe deine Buchung und schlie\u00dfe sie sicher ab.</div>' +
          '<div id="stripeModeBadge" class="stripe-mode-badge" style="display:none"><span class="material-icons-round">science</span> Testmodus / Sandbox</div>' +
        '</div>' +
        '<button class="stripe-modal-close" type="button" aria-label="Schließen">&times;</button>' +
      '</div>' +
      '<div class="stripe-modal-body">' +
        _summaryHtml +
        '<div id="stripePaymentElement"></div>' +
        '<div id="stripePaymentError" class="stripe-error" role="alert" style="display:none"></div>' +
        '<div class="stripe-trust">' +
          '<span class="material-icons-round">verified_user</span> Verschl\u00fcsselte Zahlung via <strong>Stripe</strong> \u00b7 Kartendaten ber\u00fchren unsere Server nie.' +
        '</div>' +
        '<div class="stripe-trust stripe-fee-note">' +
          '<span class="material-icons-round">receipt_long</span> Du zahlst nur den angezeigten Buchungsbetrag. Die Dienstleister-Auszahlung erfolgt \u00fcber Stripe Connect; Eventb\u00f6rse beh\u00e4lt 3% Application Fee ein.' +
        '</div>' +
      '</div>' +
      '<div class="stripe-modal-footer">' +
        '<button type="button" class="btn-outline" id="stripeCancelBtn">Abbrechen</button>' +
        '<button type="button" class="btn-primary" id="stripePayBtn" disabled>' +
          '<span class="stripe-btn-label"><span class="material-icons-round">lock</span> ' + _escHtml(_formatEuro(opts.amount)) + ' bezahlen</span>' +
          '<span class="stripe-btn-spinner" style="display:none"><span class="material-icons-round spin">sync</span> Verarbeite\u2026</span>' +
        '</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(ov);
  document.body.style.overflow = 'hidden';

  function cleanup() {
    try { document.body.removeChild(ov); } catch(e) {}
    document.body.style.overflow = '';
  }
  function onClose(wasPaid) {
    cleanup();
    if (!wasPaid && typeof opts.onCancel === 'function') opts.onCancel();
  }
  ov.querySelector('.stripe-modal-close').addEventListener('click', function(){ onClose(false); });
  ov.querySelector('#stripeCancelBtn').addEventListener('click', function(){ onClose(false); });
  ov.addEventListener('click', function(e){ if (e.target === ov) onClose(false); });

  var errEl  = ov.querySelector('#stripePaymentError');
  var payBtn = ov.querySelector('#stripePayBtn');
  var spinnerOn = function(on) {
    payBtn.disabled = on;
    payBtn.querySelector('.stripe-btn-label').style.display   = on ? 'none' : '';
    payBtn.querySelector('.stripe-btn-spinner').style.display = on ? '' : 'none';
  };
  var showErr = function(msg) {
    errEl.textContent = msg || 'Zahlung fehlgeschlagen.';
    errEl.style.display = '';
  };

  // Stripe-Element initialisieren und Pay-Button binden (wird aus 2 Pfaden gerufen)
  function _initStripe(stripeData) {
    var payEl = ov.querySelector('#stripePaymentElement');
    if (payEl) payEl.innerHTML = '';
    if (stripeData.mode === 'test') {
      var modeBadge = ov.querySelector('#stripeModeBadge');
      if (modeBadge) modeBadge.style.display = 'inline-flex';

      // Admin: Testkarten-Panel über dem Stripe-Element einblenden
      if (currentUser && currentUser.role === 'Admin' && payEl) {
        var _tcPanel = document.createElement('div');
        _tcPanel.className = 'stripe-testcard-panel';
        _tcPanel.innerHTML =
          '<div class="stripe-testcard-header">' +
            '<span class="material-icons-round">science</span>' +
            'Stripe Testdaten &nbsp;<span class="stripe-admin-badge">admin</span>' +
          '</div>' +
          '<div class="stripe-testcard-fields">' +
            '<div class="stripe-testcard-field">' +
              '<span class="stripe-testcard-label">Kartennummer</span>' +
              '<button type="button" class="stripe-testcard-copy" data-val="4242 4242 4242 4242">' +
                '4242 4242 4242 4242<span class="material-icons-round">content_copy</span>' +
              '</button>' +
            '</div>' +
            '<div class="stripe-testcard-field">' +
              '<span class="stripe-testcard-label">Ablaufdatum</span>' +
              '<button type="button" class="stripe-testcard-copy" data-val="12/34">' +
                '12 / 34<span class="material-icons-round">content_copy</span>' +
              '</button>' +
            '</div>' +
            '<div class="stripe-testcard-field">' +
              '<span class="stripe-testcard-label">CVC</span>' +
              '<button type="button" class="stripe-testcard-copy" data-val="123">' +
                '123<span class="material-icons-round">content_copy</span>' +
              '</button>' +
            '</div>' +
          '</div>' +
          '<div class="stripe-testcard-hint">' +
            '<span class="material-icons-round">touch_app</span>' +
            'Klicken zum Kopieren, dann in das Stripe-Feld einf\u00fcgen' +
          '</div>';
        _tcPanel.querySelectorAll('.stripe-testcard-copy').forEach(function(btn) {
          btn.addEventListener('click', function() {
            var val = btn.dataset.val;
            var icon = btn.querySelector('.material-icons-round');
            navigator.clipboard.writeText(val).then(function() {
              btn.classList.add('copied');
              if (icon) icon.textContent = 'check';
              setTimeout(function() {
                btn.classList.remove('copied');
                if (icon) icon.textContent = 'content_copy';
              }, 1800);
            }).catch(function() {
              // Fallback: select text
              var tmp = document.createElement('textarea');
              tmp.value = val;
              document.body.appendChild(tmp);
              tmp.select();
              document.execCommand('copy');
              document.body.removeChild(tmp);
              btn.classList.add('copied');
              if (icon) icon.textContent = 'check';
              setTimeout(function() {
                btn.classList.remove('copied');
                if (icon) icon.textContent = 'content_copy';
              }, 1800);
            });
          });
        });
        payEl.parentNode.insertBefore(_tcPanel, payEl);
      }
    }
    payBtn.style.display = '';
    var stripe = Stripe(stripeData.publishable_key);
    var elements = stripe.elements({
      clientSecret: stripeData.client_secret,
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary: '#FF385C',
          colorBackground: '#ffffff',
          colorText: '#222222',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          borderRadius: '10px'
        }
      }
    });
    var paymentElement = elements.create('payment', {
      layout: { type: 'tabs', defaultCollapsed: false }
    });
    paymentElement.mount('#stripePaymentElement');
    paymentElement.on('ready', function(){ payBtn.disabled = false; });
    paymentElement.on('change', function(e){
      if (e && e.error) showErr(e.error.message);
      else errEl.style.display = 'none';
    });
    payBtn.addEventListener('click', function onClick() {
      payBtn.removeEventListener('click', onClick);
      errEl.style.display = 'none';
      spinnerOn(true);
      stripe.confirmPayment({
        elements: elements,
        redirect: 'if_required',
        confirmParams: { return_url: window.location.href }
      }).then(function(r) {
        if (r.error) {
          spinnerOn(false);
          payBtn.addEventListener('click', onClick);
          showErr(r.error.message || 'Zahlung fehlgeschlagen.');
          return;
        }
        var pi = r.paymentIntent;
        if (!pi || pi.status !== 'succeeded') {
          spinnerOn(false);
          payBtn.addEventListener('click', onClick);
          showErr('Status: ' + (pi && pi.status || 'unbekannt') + ' – bitte erneut versuchen.');
          return;
        }
        fetch(_apiUrl('stripe/verify-payment'), {
          method: 'POST',
          credentials: 'same-origin',
          headers: _apiHeaders(),
          body: JSON.stringify({ payment_intent: pi.id })
        }).then(function(r2){ return r2.json().then(function(j){ return { ok: r2.ok, data: j }; }); })
          .then(function(vr){
            if (!vr.ok || !vr.data || !vr.data.paid) {
              spinnerOn(false);
              payBtn.addEventListener('click', onClick);
              showErr((vr.data && vr.data.message) || 'Zahlung wurde von Stripe nicht als abgeschlossen bestätigt.');
              return;
            }
            onClose(true);
            if (typeof opts.onSuccess === 'function') {
              opts.onSuccess({
                payment_intent:    pi.id,
                payment_intent_id: pi.id,
                amount:            vr.data.amount,
                status:            vr.data.status
              });
            }
          }).catch(function(e){
            spinnerOn(false);
            payBtn.addEventListener('click', onClick);
            showErr('Verifizierung fehlgeschlagen: ' + (e && e.message || e));
          });
      }).catch(function(e){
        spinnerOn(false);
        payBtn.addEventListener('click', onClick);
        showErr('Netzwerkfehler: ' + (e && e.message || e));
      });
    });
  }

  // 1) PaymentIntent erstellen
  fetch(_apiUrl('stripe/create-payment-intent'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: _apiHeaders(),
    body: JSON.stringify({
      amount:     opts.amount,
      currency:   'eur',
      title:      opts.title || 'Buchung',
      card_id:    opts.cardId || '',
      project_id: opts.projectId || '',
      listing_id: opts.listingId || 0
    })
  }).then(function(r){ return r.json().then(function(j){ return { ok: r.ok, data: j }; }); })
    .then(function(res) {
      if (!res.ok || !res.data || !res.data.client_secret || !res.data.publishable_key) {
        if (res.data && res.data.requires_connect_onboarding) {
          var payEl = ov.querySelector('#stripePaymentElement');
          if (payEl) {
            var _adminBtnHtml = '';
            if (currentUser && currentUser.role === 'Admin') {
              _adminBtnHtml =
                '<button type="button" class="stripe-admin-test-btn" id="stripeAdminTestBtn">' +
                  '<span class="material-icons-round">science</span>' +
                  'Testzahlung durchf\u00fchren\u2002<span class="stripe-admin-badge">admin</span>' +
                '</button>';
            }
            payEl.innerHTML =
              '<div class="stripe-payout-blocked">' +
                '<span class="material-icons-round">account_balance_wallet</span>' +
                '<div>' +
                  '<strong>Dienstleister noch nicht auszahlungsbereit</strong>' +
                  '<span>' + _escHtml(res.data.message || 'Diese Buchung ist erst m\u00f6glich, wenn der Dienstleister sein Stripe-Auszahlungskonto eingerichtet hat.') + '</span>' +
                '</div>' +
              '</div>' + _adminBtnHtml;
            if (_adminBtnHtml) {
              var _adminBtn = ov.querySelector('#stripeAdminTestBtn');
              _adminBtn.addEventListener('click', function() {
                _adminBtn.disabled = true;
                _adminBtn.innerHTML = '<span class="material-icons-round spin">sync</span> Lade\u2026';
                errEl.style.display = 'none';
                fetch(_apiUrl('stripe/create-payment-intent-admin'), {
                  method: 'POST',
                  credentials: 'same-origin',
                  headers: _apiHeaders(),
                  body: JSON.stringify({
                    amount:     opts.amount,
                    currency:   'eur',
                    title:      opts.title || 'Admin-Testzahlung',
                    listing_id: opts.listingId || 0,
                    card_id:    opts.cardId || '',
                    project_id: opts.projectId || ''
                  })
                }).then(function(r){ return r.json().then(function(j){ return { ok: r.ok, data: j }; }); })
                  .then(function(ar) {
                    if (!ar.ok || !ar.data || !ar.data.client_secret || !ar.data.publishable_key) {
                      _adminBtn.disabled = false;
                      _adminBtn.innerHTML =
                        '<span class="material-icons-round">science</span>' +
                        'Testzahlung durchf\u00fchren\u2002<span class="stripe-admin-badge">admin</span>';
                      showErr((ar.data && ar.data.message) || 'Admin-Testzahlung konnte nicht gestartet werden.');
                      return;
                    }
                    _adminBtn.remove();
                    _initStripe(ar.data);
                  }).catch(function(e) {
                    _adminBtn.disabled = false;
                    _adminBtn.innerHTML =
                      '<span class="material-icons-round">science</span>' +
                      'Testzahlung durchf\u00fchren\u2002<span class="stripe-admin-badge">admin</span>';
                    showErr('Fehler: ' + (e && e.message || e));
                  });
              });
            }
          }
          payBtn.style.display = 'none';
          showErr('Keine Zahlung gestartet. Der Dienstleister muss zuerst Stripe Connect abschlie\u00dfen.');
          return;
        }
        showErr((res.data && res.data.message) || 'Stripe konnte nicht initialisiert werden.');
        return;
      }
      _initStripe(res.data);
    }).catch(function(e) {
      showErr('Fehler beim Laden: ' + (e && e.message || e));
    });
}

function _formatEuro(n) {
  var v = parseFloat(n) || 0;
  try {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v);
  } catch (e) {
    return v.toFixed(2).replace('.', ',') + ' €';
  }
}

/* ── Flow-Board Stage-Verschieben (Sheet + Drag&Drop) ──────────────────
 * Stages laufen strikt sequenziell:
 *   geplant → kontaktiert → angebot (Gebucht) → bestaetigt (Erfüllt) → abgeschlossen (Bezahlt)
 * Logik:
 *   • Gleiche Stage  → ignorieren
 *   • +1 Schritt     → den vorhandenen Aktions-Flow für die AKTUELLE Stage öffnen
 *                      (z. B. Geplant→Kontaktiert öffnet "Kontaktieren"-Modal)
 *   • >+1 Schritt    → blockiert mit Hinweis "Erst „X" abschließen"
 *   • Rückwärts      → mit Bestätigung erlaubt; setzt nachgelagerte Marker zurück
 */
var FLOW_STAGE_ORDER  = ['geplant','kontaktiert','angebot','bestaetigt','abgeschlossen'];
var FLOW_STAGE_LABELS = { geplant:'Geplant', kontaktiert:'Kontaktiert', angebot:'Gebucht', bestaetigt:'Erfüllt', abgeschlossen:'Bezahlt' };
var FLOW_STAGE_ICONS  = { geplant:'schedule', kontaktiert:'mail', angebot:'receipt_long', bestaetigt:'verified', abgeschlossen:'paid' };
var FLOW_STAGE_COLORS = { geplant:'#9E9E9E', kontaktiert:'#FF9800', angebot:'#AB47BC', bestaetigt:'#FF385C', abgeschlossen:'#00A699' };

function openStageMoveSheet(cardId) {
  var project = _boardProjects.find(function(p){ return p.id === _activeBoardId; });
  if (!project) return;
  var card = (project.cards || []).find(function(c){ return c.id === cardId; });
  if (!card) return;
  var current = card.stage || 'geplant';
  var curIdx  = FLOW_STAGE_ORDER.indexOf(current);

  var rowsHtml = FLOW_STAGE_ORDER.map(function(sid, i) {
    var label = FLOW_STAGE_LABELS[sid];
    var icon  = FLOW_STAGE_ICONS[sid];
    var color = FLOW_STAGE_COLORS[sid];
    var dist  = i - curIdx;
    var hint = '', cls = '', pinIcon = 'arrow_forward', pinColor = color, disabled = false;
    if (dist === 0)      { hint = 'Aktuelle Stage';                              cls = 'sm-row-current'; pinIcon = 'place';   disabled = true; }
    else if (dist === 1) { hint = 'Nächster Schritt – Aktion ausführen';         cls = 'sm-row-next';    pinIcon = 'arrow_forward'; }
    else if (dist  >  1) {
      var missing = FLOW_STAGE_LABELS[FLOW_STAGE_ORDER[curIdx + 1]];
      hint = 'Erst „' + missing + '" abschließen';
      cls = 'sm-row-locked'; pinIcon = 'lock'; pinColor = '#888'; disabled = true;
    }
    else                 { hint = 'Zurücksetzen auf diese Stage';                cls = 'sm-row-back';    pinIcon = 'undo'; }
    return '<button type="button" class="sm-row ' + cls + '"' + (disabled ? ' disabled' : '') +
      ' onclick="_attemptMoveCardStage(\'' + cardId + '\',\'' + sid + '\')">' +
        '<span class="sm-row-dot" style="background:' + color + '"><span class="material-icons-round">' + icon + '</span></span>' +
        '<span class="sm-row-text"><strong>' + label + '</strong><small>' + hint + '</small></span>' +
        '<span class="material-icons-round sm-row-pin" style="color:' + pinColor + '">' + pinIcon + '</span>' +
      '</button>';
  }).join('');

  var html =
    '<div class="modal-overlay show sm-overlay" id="stageMoveSheet" onclick="if(event.target===this)this.remove()" style="z-index:2200">' +
      '<div class="modal sm-modal" onclick="event.stopPropagation()">' +
        '<button class="modal-close" aria-label="Schließen" onclick="document.getElementById(\'stageMoveSheet\').remove()"><span class="material-icons-round">close</span></button>' +
        '<div class="modal-header">' +
          '<span class="material-icons-round modal-icon">low_priority</span>' +
          '<h2>Stage ändern</h2>' +
          '<p>' + _escHtml(card.name || '') + '</p>' +
        '</div>' +
        '<div class="sm-list">' + rowsHtml + '</div>' +
        '<p class="sm-foot"><span class="material-icons-round" style="font-size:14px;vertical-align:-3px">info</span> Schritte können nicht übersprungen werden – das System führt dich Schritt für Schritt durch.</p>' +
      '</div>' +
    '</div>';
  document.body.insertAdjacentHTML('beforeend', html);
}

function _attemptMoveCardStage(cardId, targetStage) {
  var project = _boardProjects.find(function(p){ return p.id === _activeBoardId; });
  if (!project) return;
  var card = (project.cards || []).find(function(c){ return c.id === cardId; });
  if (!card) return;
  var current = card.stage || 'geplant';
  if (current === targetStage) return;
  var curIdx = FLOW_STAGE_ORDER.indexOf(current);
  var tgtIdx = FLOW_STAGE_ORDER.indexOf(targetStage);
  if (tgtIdx < 0 || curIdx < 0) return;

  // 1) Sprung > 1 Schritt nach vorn → blockieren
  if (tgtIdx > curIdx + 1) {
    var missingLabel = FLOW_STAGE_LABELS[FLOW_STAGE_ORDER[curIdx + 1]];
    showToast('Bitte zuerst „' + missingLabel + '" abschließen, bevor du zu „' + FLOW_STAGE_LABELS[targetStage] + '" springst.', 'lock');
    return;
  }
  // 2) Genau 1 Schritt nach vorn → den natürlichen Aktions-Flow der AKTUELLEN Stage öffnen
  if (tgtIdx === curIdx + 1) {
    var sheet = document.getElementById('stageMoveSheet');
    if (sheet) sheet.remove();
    openStageAdvanceModal(cardId, current);
    return;
  }
  // 3) Rückwärts → mit Bestätigung erlauben (Korrektur)
  if (tgtIdx < curIdx) {
    if (_cardHasConfirmedPayment(card)) {
      showToast('Eine bestätigte Zahlung kann nicht auf eine frühere Stage zurückgesetzt werden.', 'lock');
      return;
    }
    var ok = window.confirm('Karte von „' + FLOW_STAGE_LABELS[current] + '" zurück auf „' + FLOW_STAGE_LABELS[targetStage] + '" setzen?\n\nBereits gesetzte Bestätigungen ab dieser Stage werden zurückgesetzt.');
    if (!ok) return;
    card.stage = targetStage;
    // Nachgelagerte Marker bereinigen
    if (tgtIdx < FLOW_STAGE_ORDER.indexOf('bestaetigt')) {
      card.userConfirmedAt = null;
      card.providerConfirmedAt = null;
    }
    if (tgtIdx < FLOW_STAGE_ORDER.indexOf('angebot')) {
      card.bookedAt = null;
      card.paymentStatus = null;
      card.providerAcceptedAt = null;
    }
    if (tgtIdx < FLOW_STAGE_ORDER.indexOf('kontaktiert')) {
      card.contactDate = null;
      card.contactMethod = null;
    }
    _saveBoardProjects({ immediate: true });
    var sheet2 = document.getElementById('stageMoveSheet');
    if (sheet2) sheet2.remove();
    try { renderBoardFlow(); } catch(_){}
    showToast('Karte zurück auf „' + FLOW_STAGE_LABELS[targetStage] + '"', 'undo');
  }
}

/* HTML5 Drag&Drop Hooks */
function _flowProvDragStart(ev, cardId) {
  if (!ev.dataTransfer) return;
  try { ev.dataTransfer.setData('text/plain', cardId); } catch(_) {}
  try { ev.dataTransfer.effectAllowed = 'move'; } catch(_) {}
  if (ev.stopPropagation) ev.stopPropagation();
  var el = ev.currentTarget;
  if (el && el.classList) el.classList.add('flow-prov-dragging');
  // CardId zwischenspeichern (Fallback wenn dataTransfer leer)
  window._flowDragCardId = cardId;
}
function _flowProvDragEnd(ev) {
  var el = ev.currentTarget;
  if (el && el.classList) el.classList.remove('flow-prov-dragging');
  document.querySelectorAll('.flow-col.flow-drop-target').forEach(function(c){ c.classList.remove('flow-drop-target'); });
  window._flowDragCardId = null;
}
function _flowColDragOver(ev, stageId) {
  if (FLOW_STAGE_ORDER.indexOf(stageId) < 0) return;
  if (ev.preventDefault) ev.preventDefault();
  try { ev.dataTransfer.dropEffect = 'move'; } catch(_) {}
  var col = ev.currentTarget;
  if (col && col.classList) col.classList.add('flow-drop-target');
}
function _flowColDragLeave(ev) {
  var col = ev.currentTarget;
  if (col && col.classList) col.classList.remove('flow-drop-target');
}
function _flowColDrop(ev, stageId) {
  if (ev.preventDefault) ev.preventDefault();
  var col = ev.currentTarget;
  if (col && col.classList) col.classList.remove('flow-drop-target');
  var cardId = (ev.dataTransfer && ev.dataTransfer.getData('text/plain')) || window._flowDragCardId || '';
  window._flowDragCardId = null;
  if (!cardId) return;
  _attemptMoveCardStage(cardId, stageId);
}

/* ── Stage Advance Modal ── */
function openStageAdvanceModal(cardId, currentStage) {
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;
  var card = (project.cards || []).find(function(c) { return c.id === cardId; });
  if (!card) return;

  var titles = {geplant:'Kontaktieren',kontaktiert:'Warten auf Antwort',angebot:'Erbringung bestätigen',bestaetigt:'Jetzt bezahlen'};
  var icons  = {geplant:'forum',kontaktiert:'hourglass_top',angebot:'verified',bestaetigt:'paid'};
  var title  = titles[currentStage] || 'Weiter';
  var icon   = icons[currentStage] || 'arrow_forward';

  var fieldsHtml = '';
  // Look up provider contact info from listing + user
  var _listing = card.listingId ? (LISTINGS || []).find(function(l){ return l.id === card.listingId; }) : null;
  var _provPhone = (_listing && _listing.phone) || '';
  var _provEmail = (_listing && _listing.email) || '';
  var _provName  = card.name || (_listing && _listing.providerName) || 'Anbieter';
  var _provWhatsapp = (_listing && _listing.whatsapp) || '';
  // Also check provider user record
  if (_listing && _listing.providerId) {
    var _dUsers = _demoUsers();
    var _pu = _dUsers.find(function(u){ return u.id === _listing.providerId; });
    if (_pu) {
      if (!_provPhone && _pu.phone) _provPhone = _pu.phone;
      if (!_provEmail && _pu.email) _provEmail = _pu.email;
    }
  }
  var _hasPhone = !!_provPhone;
  var _hasWhatsapp = !!(_provWhatsapp || _provPhone);
  var _hasEmail = !!_provEmail;
  // Clean phone for tel/wa links
  var _cleanPhone = (_provWhatsapp || _provPhone || '').replace(/[\s\-\(\)]/g, '');
  if (_cleanPhone && !_cleanPhone.startsWith('+')) _cleanPhone = '+49' + _cleanPhone.replace(/^0/, '');
  // Project info for pre-filled messages
  var _projectName = project.name || 'mein Event';
  var _projectDate = project.date ? _formatDateDe(project.date) : '';
  var _senderName = '';
  if (typeof currentUser !== 'undefined' && currentUser) {
    _senderName = (currentUser.first_name || '').trim()
      || (currentUser.username || '').trim()
      || ((currentUser.first_name || '') + ' ' + (currentUser.last_name || '')).trim();
  }

  if (currentStage === 'geplant') {
    // Build pre-filled message
    var _defaultMsg = 'Hallo ' + _provName + ',\\n\\nich plane "' + _projectName + '"' +
      (_projectDate ? ' am ' + _projectDate : '') +
      ' und bin an Ihrem Angebot „' + (_listing ? _listing.title || '' : card.name || '') + '" interessiert.' +
      '\\n\\nKönnten wir die Details besprechen?' +
      (_senderName ? '\\n\\nMit freundlichen Grüßen\\n' + _senderName : '\\n\\nMit freundlichen Grüßen');
    var _defaultMsgClean = _defaultMsg.replace(/\\n/g, '\n');

    // Fallbacks: providerId direkt von der Karte (wird beim Hinzufügen
    // gespeichert), DB-Id aus dem 10000er-Offset der Frontend-Id ableiten —
    // so funktioniert Kontakt auch, wenn das Inserat (noch) nicht in
    // LISTINGS aufgelöst werden kann.
    // Demo-Konten sind kontaktierbar wie echte Anbieter — der Server leitet
    // die Benachrichtigung an kontakt@eventbörse.de um.
    var _provUserId = (_listing && _listing.providerId) || card.providerId || '';
    var _listingDbId = (_listing && (_listing._dbId || _listing.id)) ||
      (card.listingId && card.listingId > 10000 ? card.listingId - 10000 : '');
    var _canChat = !!_provUserId;

    fieldsHtml = '' +
      '<label class="sa-label">Nachricht anpassen</label>' +
      '<textarea id="saMessage" class="sa-input" rows="6">' + _defaultMsgClean + '</textarea>' +
      '<label class="sa-label" style="margin-top:8px">Kontaktweg wählen & direkt kontaktieren</label>' +
      '<div class="sa-action-buttons">' +
        // CHAT + E-MAIL (Primary, wie Kleinanzeigen)
        '<button type="button" class="sa-action-btn sa-action-email sa-action-primary' + (_canChat ? '' : ' sa-action-disabled') + '" id="saDoChat">' +
          '<span class="sa-action-icon"><span class="material-icons-round">forum</span></span>' +
          '<span class="sa-action-text">' +
            '<strong>Nachricht senden</strong>' +
            '<small>' + (_canChat ? 'Im Chat · automatisch per E-Mail benachrichtigt' : 'Anbieter nicht verfügbar') + '</small>' +
          '</span>' +
          '<span class="material-icons-round sa-action-arrow">arrow_forward</span>' +
        '</button>' +
        // TELEFON
        '<button type="button" class="sa-action-btn sa-action-phone' + (_hasPhone ? '' : ' sa-action-disabled') + '" id="saDoPhone">' +
          '<span class="sa-action-icon"><span class="material-icons-round">call</span></span>' +
          '<span class="sa-action-text">' +
            '<strong>Anrufen</strong>' +
            '<small>' + (_hasPhone ? _provPhone : 'Nicht verfügbar') + '</small>' +
          '</span>' +
          '<span class="material-icons-round sa-action-arrow">arrow_forward</span>' +
        '</button>' +
        // WHATSAPP
        '<button type="button" class="sa-action-btn sa-action-whatsapp' + (_hasWhatsapp ? '' : ' sa-action-disabled') + '" id="saDoWhatsapp">' +
          '<span class="sa-action-icon"><span class="material-icons-round">chat</span></span>' +
          '<span class="sa-action-text">' +
            '<strong>WhatsApp</strong>' +
            '<small>' + (_hasWhatsapp ? (_provWhatsapp || _provPhone) : 'Nicht verfügbar') + '</small>' +
          '</span>' +
          '<span class="material-icons-round sa-action-arrow">arrow_forward</span>' +
        '</button>' +
      '</div>' +
      '<input type="hidden" id="saContactMethod" value="">' +
      '<input type="hidden" id="saConversationId" value="">' +
      '<input type="hidden" id="saProvUserId" value="' + _escHtml(String(_provUserId)) + '">' +
      '<input type="hidden" id="saListingDbId" value="' + _escHtml(String(_listingDbId)) + '">' +
      '<input type="hidden" id="saProvPhone" value="' + _escHtml(_cleanPhone) + '">' +
      '<input type="hidden" id="saProvEmail" value="' + _escHtml(_provEmail) + '">' +
      '<input type="hidden" id="saProjectName" value="' + _escHtml(_projectName) + '">';
  } else if (currentStage === 'kontaktiert') {
    // Stage "Kontaktiert": Anfrage wurde gesendet – warten auf Anbieter-Antwort.
    // Hier gibt es KEINE Buchen-Aktion. Der Anbieter muss im Chat Ja/Nein sagen.
    var _contactedDate = card.contactDate ? _formatDateDe(card.contactDate) : '—';
    var _contactMethod = card.contactMethod || 'Chat';
    fieldsHtml = '' +
      '<div class="sa-info-card" style="background:linear-gradient(135deg,rgba(255,167,38,0.14),rgba(255,167,38,0.04));border:1px solid rgba(255,167,38,0.35);border-radius:12px;padding:14px;margin-bottom:12px">' +
        '<div style="display:flex;gap:10px;align-items:center;margin-bottom:6px">' +
          '<span class="material-icons-round" style="color:#FFA726">hourglass_top</span>' +
          '<strong>Warten auf Antwort des Anbieters</strong>' +
        '</div>' +
        '<div style="font-size:13px;color:var(--text-light);line-height:1.5">' +
          'Deine Anfrage wurde am <strong>' + _escHtml(_contactedDate) + '</strong> via <strong>' + _escHtml(_contactMethod) + '</strong> versendet.<br>' +
          'Sobald der Anbieter im Chat <strong>Annehmen</strong> oder <strong>Ablehnen</strong> klickt, ' +
          'wird die Karte automatisch aktualisiert.' +
        '</div>' +
      '</div>' +
      '<label class="sa-label">Dienstleister</label>' +
      '<input class="sa-input" readonly value="' + _escHtml(card.name || '') + '">' +
      '<label class="sa-label">Leistung</label>' +
      '<input class="sa-input" readonly value="' + _escHtml((_listing && _listing.title) || card.name || '') + '">' +
      '<button type="button" class="sa-action-btn sa-action-primary" style="width:100%;margin-top:8px" ' +
        'onclick="this.closest(\'.sa-overlay\').remove();navigateTo(\'messages\');' +
        (card.conversationId ? 'setTimeout(function(){try{openChat(' + parseInt(card.conversationId, 10) + ')}catch(e){}},300)' : '') +
        '"><span class="material-icons-round">forum</span> Chat öffnen</button>';
  } else if (currentStage === 'bestaetigt') {
    // Stage „Erfüllt“ → nach beidseitiger Bestätigung sicher bezahlen.
    var _bookPrice = (_listing && _listing.price) || card.price || '';
    var _bookEventDate = (project && project.date) ? _formatDateDe(project.date) : '—';
    fieldsHtml = '' +
      '<div class="sa-info-card" style="background:linear-gradient(135deg,rgba(102,187,106,0.14),rgba(102,187,106,0.04));border:1px solid rgba(102,187,106,0.35);border-radius:12px;padding:14px;margin-bottom:12px">' +
        '<div style="display:flex;gap:10px;align-items:center;margin-bottom:8px">' +
          '<span class="material-icons-round" style="color:#66bb6a">check_circle</span>' +
          '<strong>Leistung erfüllt – jetzt bezahlen</strong>' +
        '</div>' +
        '<div style="font-size:13px;color:var(--text-light);line-height:1.5">' +
          'Beide Seiten haben die Erbringung bestätigt. Mit der Zahlung wird eine Rechnung erstellt und automatisch an <strong>dich</strong>, den <strong>Anbieter</strong> ' +
          'und <strong>eventb&ouml;rse.de</strong> gesendet — f&uuml;r volle Transparenz.' +
        '</div>' +
      '</div>' +
      '<label class="sa-label">Leistung</label>' +
      '<input class="sa-input" readonly value="' + _escHtml((_listing && _listing.title) || card.name || '') + '">' +
      '<label class="sa-label">Event-Datum</label>' +
      '<input class="sa-input" readonly value="' + _escHtml(_bookEventDate) + '">' +
      '<label class="sa-label">Preis (€)</label>' +
      '<input id="saBookPrice" type="number" class="sa-input" step="1" min="0" value="' + _escHtml(String(_bookPrice)) + '">' +
      '<label class="sa-label">Anmerkung f&uuml;r Rechnung <small>(optional)</small></label>' +
      '<textarea id="saBookNote" class="sa-input" rows="2" placeholder="Uhrzeit, Adresse, Besonderheiten…"></textarea>';
  } else if (currentStage === 'angebot') {
    // Stage „Gebucht“ → „Erfüllt“: Dual-Confirmation am Event-Tag.
    var _hasProvConfirm = !!card.providerConfirmedAt;
    var _hasUserConfirm = !!card.userConfirmedAt;
    fieldsHtml = '' +
      '<div class="sa-info-card" style="background:linear-gradient(135deg,rgba(255,56,92,0.12),rgba(255,56,92,0.04));border:1px solid rgba(255,56,92,0.3);border-radius:12px;padding:14px;margin-bottom:12px">' +
        '<div style="display:flex;gap:10px;align-items:center;margin-bottom:6px">' +
          '<span class="material-icons-round" style="color:#FF385C">verified</span>' +
          '<strong>Erbringung der Leistung best&auml;tigen</strong>' +
        '</div>' +
        '<div style="font-size:13px;color:var(--text-light);line-height:1.5">' +
          'Am Event-Tag best&auml;tigen <strong>beide Seiten</strong> vor Ort. Der Dienstleister best&auml;tigt &uuml;ber ' +
          '<em>„Auftr&auml;ge&rdquo;</em> im Men&uuml;. Erst wenn beide best&auml;tigt haben, ist das Projekt abgeschlossen.' +
        '</div>' +
      '</div>' +
      '<div class="sa-dual-confirm" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">' +
        '<div style="padding:12px;border-radius:10px;border:1.5px solid ' + (_hasUserConfirm ? '#66bb6a' : 'var(--border)') + ';background:' + (_hasUserConfirm ? 'rgba(102,187,106,0.08)' : 'transparent') + '">' +
          '<div style="font-size:11px;text-transform:uppercase;color:var(--text-light);margin-bottom:4px">Deine Seite</div>' +
          '<div style="display:flex;align-items:center;gap:6px;font-weight:600">' +
            '<span class="material-icons-round" style="color:' + (_hasUserConfirm ? '#66bb6a' : 'var(--text-light)') + ';font-size:18px">' + (_hasUserConfirm ? 'check_circle' : 'radio_button_unchecked') + '</span>' +
            (_hasUserConfirm ? 'Best&auml;tigt' : 'Offen') +
          '</div>' +
        '</div>' +
        '<div style="padding:12px;border-radius:10px;border:1.5px solid ' + (_hasProvConfirm ? '#66bb6a' : 'var(--border)') + ';background:' + (_hasProvConfirm ? 'rgba(102,187,106,0.08)' : 'transparent') + '">' +
          '<div style="font-size:11px;text-transform:uppercase;color:var(--text-light);margin-bottom:4px">Dienstleister</div>' +
          '<div style="display:flex;align-items:center;gap:6px;font-weight:600">' +
            '<span class="material-icons-round" style="color:' + (_hasProvConfirm ? '#66bb6a' : 'var(--text-light)') + ';font-size:18px">' + (_hasProvConfirm ? 'check_circle' : 'hourglass_top') + '</span>' +
            (_hasProvConfirm ? 'Best&auml;tigt' : 'Wartet') +
          '</div>' +
        '</div>' +
      '</div>' +
      '<label class="sa-chip sa-confirm-check" style="display:flex;align-items:center;gap:8px;padding:12px;border:1.5px solid var(--border);border-radius:10px;cursor:pointer">' +
        '<input type="checkbox" id="saUserConfirm"' + (_hasUserConfirm ? ' checked' : '') + '>' +
        '<span><strong>Ich best&auml;tige:</strong> Die Leistung wurde wie vereinbart erbracht.</span>' +
      '</label>' +
      '<div class="sa-review-block" style="margin-top:14px;padding:16px;border:1px solid rgba(255,255,255,0.1);border-radius:14px;background:linear-gradient(180deg,rgba(255,193,7,0.06),rgba(255,255,255,0.02))">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">' +
          '<span class="material-icons-round" style="color:#FFC107;font-size:22px">star</span>' +
          '<strong style="font-size:14px;color:rgba(255,255,255,0.95)">Bewertung abgeben</strong>' +
          '<span style="margin-left:auto;font-size:10.5px;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:0.5px">öffentlich</span>' +
        '</div>' +
        '<div class="sa-stars sa-stars-lg" id="saStars" data-rating="' + (parseInt(card.rating) || 0) + '">' +
          '<span data-val="1" class="material-icons-round">star</span>' +
          '<span data-val="2" class="material-icons-round">star</span>' +
          '<span data-val="3" class="material-icons-round">star</span>' +
          '<span data-val="4" class="material-icons-round">star</span>' +
          '<span data-val="5" class="material-icons-round">star</span>' +
        '</div>' +
        '<div id="saRatingLabel" style="margin-top:8px;font-size:12.5px;color:rgba(255,255,255,0.6);min-height:18px;font-weight:500">Tippe auf einen Stern, um zu bewerten.</div>' +
        '<input type="hidden" id="saRating" value="' + (parseInt(card.rating) || 0) + '">' +
        '<label class="sa-label" style="margin-top:14px;display:block">Dein Kommentar <small style="color:rgba(255,255,255,0.4)">(mind. 10 Zeichen)</small></label>' +
        '<textarea id="saComment" class="sa-input" rows="4" placeholder="Wie war die Zusammenarbeit? Pünktlich, professionell, kreativ? Andere Kund:innen freuen sich über deine ehrliche Einschätzung.">' + _escHtml(card.reviewComment || '') + '</textarea>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">' +
          '<span style="font-size:11px;color:rgba(255,255,255,0.4)"><span class="material-icons-round" style="font-size:13px;vertical-align:-2px">public</span> Wird auf dem Anbieter-Profil sichtbar.</span>' +
          '<span id="saCommentHint" style="font-size:11px;color:rgba(255,255,255,0.4)">0 / 10</span>' +
        '</div>' +
      '</div>';
  }

  var _submitIcon = (currentStage === 'kontaktiert') ? 'close' : icon;
  var _submitText = (currentStage === 'kontaktiert') ? 'Schlie&szlig;en' : title;
  var _hideCancel = (currentStage === 'kontaktiert');
  var overlay = document.createElement('div');
  overlay.className = 'sa-overlay';
  overlay.innerHTML = '' +
    '<div class="sa-modal">' +
      '<div class="sa-header"><span class="material-icons-round">' + icon + '</span> ' + title + ' – ' + _escHtml(card.name || 'Karte') + '</div>' +
      '<div class="sa-body">' + fieldsHtml + '</div>' +
      '<div class="sa-footer">' +
        (_hideCancel ? '' : '<button class="sa-cancel" onclick="this.closest(\'.sa-overlay\').remove()">Abbrechen</button>') +
        '<button class="sa-submit" id="saSubmitBtn" aria-label="Absenden"><span class="material-icons-round">' + _submitIcon + '</span> ' + _submitText + '</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  requestAnimationFrame(function(){ overlay.classList.add('sa-visible'); });

  // Close on backdrop click
  overlay.addEventListener('click', function(e){ if(e.target===overlay) overlay.remove(); });

  // ── Contact action buttons (geplant stage) ──
  if (currentStage === 'geplant') {
    var _saMsg = function(){ return (document.getElementById('saMessage') || {}).value || ''; };
    var _saSetMethod = function(m){ var el = document.getElementById('saContactMethod'); if(el) el.value = m; };

    // Phone
    var phoneBtn = document.getElementById('saDoPhone');
    if (phoneBtn) phoneBtn.addEventListener('click', function() {
      var phone = (document.getElementById('saProvPhone') || {}).value;
      if (!phone) { showToast('Keine Telefonnummer verfügbar', 'error'); return; }
      _saSetMethod('Telefon');
      window.open('tel:' + phone, '_self');
      // Mark as contacted after a short delay
      phoneBtn.innerHTML = '<span class="sa-action-icon" style="background:#66bb6a"><span class="material-icons-round">check</span></span><span class="sa-action-text"><strong>Anruf gestartet</strong><small>Wurde als kontaktiert markiert</small></span>';
      phoneBtn.classList.add('sa-action-done');
    });

    // Chat + E-Mail (Kleinanzeigen-artig): Chat anlegen, Nachricht senden –
    // Server (eb_messages_send) verschickt automatisch eine E-Mail-
    // Benachrichtigung an den Empfaenger. Somit erreicht eine einzige Aktion
    // sowohl den Chat- als auch den Mail-Kanal.
    var chatBtn = document.getElementById('saDoChat');
    if (chatBtn) chatBtn.addEventListener('click', function() {
      if (chatBtn.classList.contains('sa-action-disabled') || chatBtn.dataset.busy === '1') return;
      // Bereits gesendet: Klick öffnet den Chat (statt erneut zu senden)
      if (chatBtn.classList.contains('sa-action-done')) {
        var _cid = parseInt((document.getElementById('saConversationId') || {}).value) || 0;
        try { overlay.remove(); } catch(_) {}
        navigateTo('messages');
        if (_cid) setTimeout(function(){ try { openChat(_cid); } catch(_) {} }, 250);
        return;
      }
      if (typeof isLoggedIn !== 'undefined' && !isLoggedIn) {
        showToast('Bitte melde dich an, um eine Nachricht zu senden.', 'warning');
        try { openModal('loginModal'); } catch(_) {}
        return;
      }
      var provUserId = parseInt((document.getElementById('saProvUserId') || {}).value) || 0;
      var listingDbId = parseInt((document.getElementById('saListingDbId') || {}).value) || 0;
      var msg = _saMsg();
      if (!provUserId) { showToast('Anbieter nicht gefunden', 'error'); return; }
      if (!msg || !msg.trim()) { showToast('Bitte schreibe eine Nachricht.', 'warning'); return; }

      // Build structured inquiry payload so it renders as a system widget
      // on both sides (using existing _renderBookingCard infrastructure).
      // cardId + projectId are included so the provider's acceptance can
      // reference back to update the customer's board card automatically.
      var inquiryPayload = {
        kind: 'inquiry',
        source: 'board',
        listing: (_listing && _listing.title) || card.name || '',
        image: (_listing && (_listing.image || (_listing.images && _listing.images[0]))) || '',
        price: (_listing && _listing.price) ? (_listing.price + (typeof _listing.price === 'number' ? '€' : '')) : '',
        eventType: (_listing && (_listing.category || _listing.categoryLabel)) || '',
        projectName: _projectName || '',
        date: (project && project.date) || '',
        message: msg.trim(),
        cardId: cardId,
        projectId: _activeBoardId || ''
      };
      var inquiryJson = JSON.stringify(inquiryPayload);

      chatBtn.dataset.busy = '1';
      var _origInner = chatBtn.innerHTML;
      chatBtn.innerHTML = '<span class="sa-action-icon"><span class="material-icons-round">hourglass_top</span></span><span class="sa-action-text"><strong>Wird gesendet…</strong><small>Chat wird erstellt</small></span>';

      // 1. Conversation anlegen/finden
      var convoPayload = { other_user_id: provUserId };
      if (listingDbId) convoPayload.listing_id = listingDbId;

      fetch(_apiUrl('conversations'), {
        method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
        body: JSON.stringify(convoPayload)
      })
        .then(function(r){ if(!r.ok) { var e = new Error('conv'); e.status = r.status; throw e; } return r.json(); })
        .then(function(convo){
          var convId = convo && convo.id;
          if (!convId) throw new Error('conv-id');
          var convoEl = document.getElementById('saConversationId');
          if (convoEl) convoEl.value = convId;

          // 2. Strukturierte Anfrage als JSON senden (Server-Mail inklusive)
          return fetch(_apiUrl('conversations/' + convId + '/messages'), {
            method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
            body: JSON.stringify({ content: inquiryJson, type: 'message' })
          }).then(function(r){ if(!r.ok) throw new Error('msg'); return r.json(); })
            .then(function(){ return convId; });
        })
        .then(function(resolvedConvId){
          _saSetMethod('Chat + E-Mail');
          chatBtn.classList.add('sa-action-done');
          chatBtn.dataset.busy = '';
          chatBtn.innerHTML = '<span class="sa-action-icon" style="background:#66bb6a"><span class="material-icons-round">check</span></span>' +
            '<span class="sa-action-text"><strong>Nachricht gesendet</strong><small>Tippen, um den Chat zu öffnen</small></span>' +
            '<span class="material-icons-round sa-action-arrow">arrow_forward</span>';
          showToast('Anfrage gesendet — du findest sie unter „Chat".', 'forum');

          // Auto-Advance: Stage von "geplant" -> "kontaktiert" direkt nach
          // erfolgreichem Senden. Der Nutzer muss NICHT extra auf
          // "Speichern/Weiter" klicken.
          try {
            if (currentStage === 'geplant') {
              // Refs frisch aus _boardProjects holen, da ein zwischenzeitlicher
              // _syncBoardFromServer das Array ersetzt haben kann (alte Refs
              // wären dann verwaist und Mutationen blieben unsichtbar).
              var _liveProject = _boardProjects.find(function(p){ return p.id === _activeBoardId; }) || project;
              var _liveCard = ((_liveProject && _liveProject.cards) || []).find(function(c){ return c.id === cardId; }) || card;
              _liveCard.contactMethod = 'Chat + E-Mail';
              _liveCard.contactMessage = msg.trim();
              _liveCard.contactDate = new Date().toISOString().slice(0,10);
              // Store conversationId so provider acceptance can be linked back
              if (resolvedConvId) _liveCard.conversationId = resolvedConvId;
              var stagesOrder = ['geplant','kontaktiert','angebot','bestaetigt','abgeschlossen'];
              var idx = stagesOrder.indexOf(currentStage);
              if (idx >= 0 && idx < stagesOrder.length - 1) {
                _liveCard.stage = stagesOrder[idx + 1];
              }
              _saveBoardProjects();
              // Etwas länger offen lassen: „Nachricht gesendet — tippen zum
              // Öffnen des Chats" soll noch klickbar sein.
              setTimeout(function(){
                try { overlay.remove(); } catch(_) {}
                try { renderBoardFlow(); } catch(_) {}
                try { renderKanban(_liveProject); } catch(_) {}
                try { _updateBoardStats(_liveProject); } catch(_) {}
              }, 2200);
            }
          } catch(_) {}
        })
        .catch(function(err){
          chatBtn.dataset.busy = '';
          chatBtn.innerHTML = _origInner;
          showToast(err && err.status === 404
            ? 'Anbieter-Konto nicht gefunden — dieses Inserat kann keine Nachrichten empfangen.'
            : 'Nachricht konnte nicht gesendet werden.', 'error');
        });
    });

    // WhatsApp
    var waBtn = document.getElementById('saDoWhatsapp');
    if (waBtn) waBtn.addEventListener('click', function() {
      var phone = (document.getElementById('saProvPhone') || {}).value;
      if (!phone) { showToast('Keine Nummer für WhatsApp verfügbar', 'error'); return; }
      var msg = _saMsg();
      var waUrl = 'https://wa.me/' + phone.replace('+', '') + '?text=' + encodeURIComponent(msg);
      window.open(waUrl, '_blank');
      _saSetMethod('WhatsApp');
      waBtn.innerHTML = '<span class="sa-action-icon" style="background:#66bb6a"><span class="material-icons-round">check</span></span><span class="sa-action-text"><strong>WhatsApp geöffnet</strong><small>Wurde als kontaktiert markiert</small></span>';
      waBtn.classList.add('sa-action-done');
    });
  }

  // ── Review-Widget (Gebucht → Erfüllt) ──
  if (currentStage === 'angebot') {
    var _saStarsEl = document.getElementById('saStars');
    var _saRatingInput = document.getElementById('saRating');
    var _saRatingLabel = document.getElementById('saRatingLabel');
    var _saCommentEl = document.getElementById('saComment');
    var _saCommentHint = document.getElementById('saCommentHint');
    var _ratingTexts = {
      0: 'Tippe auf einen Stern, um zu bewerten.',
      1: '★ — Leider enttäuschend.',
      2: '★★ — Ausbaufähig.',
      3: '★★★ — In Ordnung.',
      4: '★★★★ — Sehr gut!',
      5: '★★★★★ — Hervorragend, klare Empfehlung!'
    };
    function _saRenderStars(val, isHover) {
      if (!_saStarsEl) return;
      var spans = _saStarsEl.querySelectorAll('span');
      spans.forEach(function(s, i) {
        if (i < val) s.classList.add(isHover ? 'is-hover' : 'is-filled');
        else s.classList.remove(isHover ? 'is-hover' : 'is-filled');
        if (!isHover) s.classList.remove('is-hover');
      });
    }
    if (_saStarsEl) {
      var _initialRating = parseInt(_saStarsEl.getAttribute('data-rating')) || 0;
      _saRenderStars(_initialRating, false);
      if (_initialRating > 0 && _saRatingLabel) _saRatingLabel.textContent = _ratingTexts[_initialRating];
      _saStarsEl.querySelectorAll('span').forEach(function(span) {
        span.addEventListener('mouseenter', function() {
          var v = parseInt(this.getAttribute('data-val')) || 0;
          _saRenderStars(v, true);
        });
        span.addEventListener('mouseleave', function() {
          var current = parseInt(_saStarsEl.getAttribute('data-rating')) || 0;
          _saStarsEl.querySelectorAll('span').forEach(function(s){ s.classList.remove('is-hover'); });
          _saRenderStars(current, false);
        });
        span.addEventListener('click', function() {
          var v = parseInt(this.getAttribute('data-val')) || 0;
          _saStarsEl.setAttribute('data-rating', String(v));
          if (_saRatingInput) _saRatingInput.value = String(v);
          if (_saRatingLabel) _saRatingLabel.textContent = _ratingTexts[v];
          _saRenderStars(v, false);
        });
      });
    }
    function _saUpdateCommentHint() {
      if (!_saCommentEl || !_saCommentHint) return;
      var len = (_saCommentEl.value || '').trim().length;
      _saCommentHint.textContent = len + ' / 10';
      _saCommentHint.style.color = len >= 10 ? '#66bb6a' : 'rgba(255,255,255,0.4)';
    }
    if (_saCommentEl) {
      _saUpdateCommentHint();
      _saCommentEl.addEventListener('input', _saUpdateCommentHint);
    }
  }

  // Submit
  document.getElementById('saSubmitBtn').addEventListener('click', function() {
    var _nowIso = new Date().toISOString();
    var _advance = true; // wird ggf. unterdrueckt (Dual-Confirm)

    // Refs frisch auflösen – während das Modal offen war, kann
    // _syncBoardFromServer das _boardProjects-Array ersetzt haben, sodass
    // die ursprünglich gefangenen project/card-Referenzen verwaist sind
    // und Mutationen nicht im neuen Array (und damit auch nicht im
    // anschließenden Re-Render) sichtbar wären.
    var _liveProject = _boardProjects.find(function(p){ return p.id === _activeBoardId; });
    if (_liveProject) {
      project = _liveProject;
      var _liveCard = (_liveProject.cards || []).find(function(c){ return c.id === cardId; });
      if (_liveCard) card = _liveCard;
    }

    if (currentStage === 'geplant') {
      var method = (document.getElementById('saContactMethod') || {}).value || 'E-Mail';
      card.contactMethod = method;
      card.contactMessage = (document.getElementById('saMessage') || {}).value || '';
      card.contactDate = new Date().toISOString().slice(0,10);
    } else if (currentStage === 'kontaktiert') {
      // Warten auf Antwort – kein Submit-Action nötig, einfach schließen.
      overlay.remove();
      return;
    } else if (currentStage === 'bestaetigt') {
      // Leistung erfüllt → echte Stripe-Zahlung starten.
      var _bp = parseFloat((document.getElementById('saBookPrice') || {}).value);
      if (!isNaN(_bp) && _bp > 0) card.price = _bp;
      card.bookingNote = (document.getElementById('saBookNote') || {}).value || '';

      var _payAmount = parseFloat(card.price) || 0;
      if (_payAmount <= 0) {
        showToast('Bitte einen gültigen Preis eintragen.', 'warning');
        return;
      }

      // Stage-Advance-Modal schließen, Verbindlichkeit bestätigen lassen,
      // dann Stripe-Modal öffnen.
      overlay.remove();
      var _stripeImg = (_listing && (_listing.image || (_listing.images && _listing.images[0]))) || card.avatar || '';
      _confirmBindingBooking({
        amount: _payAmount,
        title: (_listing && _listing.title) || card.name || 'Buchung',
        provider: (_listing && _listing.providerName) || card.name || ''
      }, function() {
      _setPendingPayment({ type: 'card', cardId: card.id, projectId: project.id, amount: _payAmount, title: (_listing && _listing.title) || card.name || 'Buchung' });
      _openStripePaymentModal({
        amount: _payAmount,
        title: (_listing && _listing.title) || card.name || 'Buchung',
        cardId: card.id,
        projectId: project.id,
        listingId: (_listing && (_listing._dbId || _listing.id)) || 0,
        image: _stripeImg,
        provider: (_listing && _listing.providerName) || '',
        category: (_listing && (_listing.categoryLabel || _listing.category)) || card.category || '',
        duration: (_listing && _listing.duration) || '',
        dateLabel: (project && project.date) ? project.date : '',
        onSuccess: function(_res) {
          var rr = _applyCardPaymentSuccess(card.id, project.id, _payAmount, _res);
          _clearPendingPayment();
          if (rr) _showBookingSuccess({ projectId: project.id, amount: _payAmount, title: (rr.card && rr.card.name) || card.name });
          else showToast('Zahlung erfolgreich – Buchung bestätigt!', 'check_circle');
        },
        onCancel: function() {
          _clearPendingPayment();
          showToast('Zahlung abgebrochen.', 'info');
        }
      });
      });
      return; // Submit-Handler hier beenden – Rest übernimmt onSuccess.
    } else if (currentStage === 'angebot') {
      // Stage „Gebucht“ → „Erfüllt“: Dual-Confirm (User + Dienstleister)
      var _userOk = !!(document.getElementById('saUserConfirm') || {}).checked;
      var _ratingVal = parseInt((document.getElementById('saRating') || {}).value) || 0;
      var _commentVal = ((document.getElementById('saComment') || {}).value || '').trim();

      if (_userOk && !card.userConfirmedAt) card.userConfirmedAt = _nowIso;
      if (!_userOk) card.userConfirmedAt = '';

      // Eingaben immer auf die Karte spiegeln, damit nichts verloren geht
      // wenn der User vorzeitig schliesst oder der Provider noch nicht
      // bestaetigt hat.
      card.rating = _ratingVal;
      card.reviewComment = _commentVal;

      // Pflicht-Validierung – nur wenn der User uberhaupt bestaetigen will
      if (_userOk) {
        if (_ratingVal < 1) {
          showToast('Bitte vergib eine Sterne-Bewertung.', 'warning');
          _advance = false;
        } else if (_commentVal.length < 10) {
          showToast('Bitte schreibe mindestens 10 Zeichen Kommentar.', 'warning');
          _advance = false;
        }
      }

      // Nur weiter, wenn BEIDE bestaetigt haben
      if (_advance && !(card.userConfirmedAt && card.providerConfirmedAt)) {
        _advance = false;
        if (card.userConfirmedAt && !card.providerConfirmedAt) {
          showToast('Warten auf Best\u00e4tigung des Dienstleisters.', 'hourglass_top');
        } else if (!card.userConfirmedAt) {
          showToast('Bitte best\u00e4tige die Erbringung der Leistung.', 'warning');
        }
      }

      if (_advance) {
        card.fulfilledAt = _nowIso;
        // Review an die API uebertragen – einmalig, damit Mehrfach-Submits
        // keine Duplikate erzeugen (Server lehnt sie ohnehin ab).
        var _listingDbIdForReview = (_listing && (_listing._dbId || _listing.id)) || 0;
        if (_listingDbIdForReview && _ratingVal >= 1 && _commentVal.length >= 10 && !card.reviewPostedAt) {
          fetch(_apiUrl('listings/' + _listingDbIdForReview + '/reviews'), {
            method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
            body: JSON.stringify({ rating: _ratingVal, comment: _commentVal })
          })
            .then(function(r){ return r.json().then(function(d){ return { ok: r.ok, data: d }; }); })
            .then(function(resp){
              if (resp.ok && resp.data && resp.data.saved) {
                card.reviewPostedAt = new Date().toISOString();
                _saveBoardProjects();
                showToast('Bewertung ver\u00f6ffentlicht! \u2b50', 'star');
              } else if (resp.data && /bereits bewertet/i.test(resp.data.message || '')) {
                card.reviewPostedAt = new Date().toISOString();
                _saveBoardProjects();
              } else {
                showToast((resp.data && resp.data.message) || 'Bewertung konnte nicht gespeichert werden.', 'error');
              }
            })
            .catch(function(){
              showToast('Bewertung konnte nicht gesendet werden (Netzwerk).', 'error');
            });
        }
        showToast('Leistung beidseitig best\u00e4tigt – jetzt kann bezahlt werden.', 'verified');
      }
    }

    // Advance stage (falls nicht unterdrueckt)
    if (_advance) {
      var stagesOrder = ['geplant','kontaktiert','angebot','bestaetigt','abgeschlossen'];
      var idx = stagesOrder.indexOf(currentStage);
      if (idx >= 0 && idx < stagesOrder.length - 1) {
        card.stage = (currentStage === 'angebot' && card.fulfilledAt && _cardHasConfirmedPayment(card))
          ? 'abgeschlossen'
          : stagesOrder[idx + 1];
      }
      card._stageModel = EB_BOARD_STAGE_MODEL_VERSION;
    }

    _saveBoardProjects();
    overlay.remove();
    renderBoardFlow();
    renderKanban(project);
    _updateBoardStats(project);
  });
}

function _drawFlowConnections() {
  var canvas = document.getElementById('flowCanvas');
  var world  = document.getElementById('flowWorld');
  var svg    = document.getElementById('flowSvg');
  if (!canvas || !svg) return;
  // Wird beim ersten Stage-Header in der Schleife gefüllt und danach für ALLE
  // Connectors wiederverwendet → garantiert eine einzige perfekte Y-Achse.
  var _flowSharedAxisY = null;

  var host = world || canvas;
  var W = Math.max(host.scrollWidth || 2400, host.offsetWidth || 2400);
  var H = Math.max(host.scrollHeight || 700, host.offsetHeight || 700, 700);
  svg.setAttribute('width',  W);
  svg.setAttribute('height', H);
  svg.style.width  = W + 'px';
  svg.style.height = H + 'px';

  // Vollständige Bounding-Box eines Nodes (Welt-Koordinaten, scroll-unabhängig).
  function nodeBounds(nid) {
    var el = canvas.querySelector('[data-nid="' + nid + '"]');
    if (!el) return null;
    var col = el.closest('[data-col-id]');
    if (!col) return null;
    var colX = parseFloat(col.style.left) || 0;
    var colY = parseFloat(col.style.top)  || 0;
    var L = colX + el.offsetLeft;
    var T = colY + el.offsetTop;
    var R = L + el.offsetWidth;
    var B = T + el.offsetHeight;
    // Anker-Y: für Stage-Nodes die Mitte des Header-Streifens
    // (.flow-node-hdr), für Trigger/End-Kreise (kein Header) die echte
    // Box-Mitte. So setzt jede Linie sauber am optischen Mittelpunkt des
    // jeweiligen Widgets an und schneidet nicht durch dessen Innenraum.
    var hdr = el.querySelector('.flow-node-hdr');
    var anchorY;
    if (hdr) {
      anchorY = T + hdr.offsetTop + hdr.offsetHeight / 2;
    } else {
      anchorY = T + el.offsetHeight / 2;
    }
    return { left: L, right: R, top: T, bottom: B,
             midX: (L + R) / 2, midY: (T + B) / 2,
             anchorY: anchorY };
  }

  // Bounding-Box der kompletten Spalte (für Mobile: Start am Header-Top,
  // Ende am letzten sichtbaren Element – so schneidet die gerade
  // Verbindungslinie NIE durch Provider-Karten).
  function colBounds(cid) {
    var col = canvas.querySelector('[data-col-id="' + cid + '"]');
    if (!col) return null;
    var x = parseFloat(col.style.left) || 0;
    var y = parseFloat(col.style.top)  || 0;
    return {
      left:   x,
      right:  x + col.offsetWidth,
      top:    y,
      bottom: y + col.offsetHeight,
      midX:   x + col.offsetWidth / 2,
      midY:   y + col.offsetHeight / 2
    };
  }

  var isMobile = (window.innerWidth || 1200) <= 600;
  var seq = isMobile
    ? [{col:'start',n:'start'},{col:'geplant',n:'stage-geplant'},{col:'kontaktiert',n:'stage-kontaktiert'},
       {col:'angebot',n:'stage-angebot'},{col:'bestaetigt',n:'stage-bestaetigt'},
       {col:'abgeschlossen',n:'stage-abgeschlossen'},{col:'end',n:'end'}]
    : [{col:'start',n:'start'},{col:'geplant',n:'stage-geplant'},{col:'kontaktiert',n:'stage-kontaktiert'},
       {col:'angebot',n:'stage-angebot'},{col:'bestaetigt',n:'stage-bestaetigt'},
       {col:'abgeschlossen',n:'stage-abgeschlossen'},{col:'end',n:'end'}];

  // Pfeilspitze (PowerPoint-Stil: klare dreieckige Spitze).
  // Wir nutzen EINEN Marker mit orient="auto" – SVG dreht ihn automatisch in
  // die Linienrichtung (auch nach unten). So zeigt die Spitze immer korrekt
  // ans Linienende.
  var markerId = 'flarrow-h';
  var defs = '<defs>'
           + '<marker id="flarrow-h" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto" markerUnits="userSpaceOnUse">'
           +   '<polygon points="0,0 10,4 0,8" fill="rgba(255,255,255,0.6)"/>'
           + '</marker>'
           + '</defs>';

  var paths = '';
  var STROKE = 'rgba(255,255,255,0.45)';
  var SW = 2.25;

  // Gemeinsame Y-Achse berechnen: Durchschnitt aller anchorY-Werte → alle
  // Desktop-Linien verlaufen auf exakt einer Höhe (keine Knicke mehr).
  var _sharedAxisY = null;
  if (!isMobile) {
    var _aySum = 0, _ayCnt = 0;
    for (var _si = 0; _si < seq.length; _si++) {
      var _snb = nodeBounds(seq[_si].n);
      if (_snb) { _aySum += _snb.anchorY; _ayCnt++; }
    }
    if (_ayCnt) _sharedAxisY = Math.round(_aySum / _ayCnt);
  }

  // Compute a single shared Y axis for ALL desktop connections so every
  // connector is a perfectly straight horizontal line.
  var _sharedAxisY = null;
  if (!isMobile) {
    var _aySum = 0, _ayCnt = 0;
    for (var _si = 0; _si < seq.length; _si++) {
      var _snb = nodeBounds(seq[_si].n);
      if (_snb) { _aySum += _snb.anchorY; _ayCnt++; }
    }
    if (_ayCnt) _sharedAxisY = Math.round(_aySum / _ayCnt);
  }

  for (var i = 0; i < seq.length - 1; i++) {
    var d, fromC, toC;
    if (isMobile) {
      // Auf Mobile: gerade vertikale Linie vom Stage-Header (LINKE Spalte des
      // Grid) nach unten zum naechsten Stage-Header. So bleibt die
      // Hauptachse XYZ → Geplant → Kontaktiert … → Ende sauber gerade,
      // unabhaengig davon wie breit die Spalte durch Provider-Karten wird.
      var fromN = nodeBounds(seq[i].n);
      var toN   = nodeBounds(seq[i + 1].n);
      if (!fromN || !toN) continue;
      var x1 = Math.round((fromN.left + fromN.right) / 2);
      var x2 = Math.round((toN.left   + toN.right)   / 2);
      var y1 = fromN.bottom + 2;
      var y2 = toN.top - 2;
      if (Math.abs(x1 - x2) < 2) {
        d = 'M' + x2 + ',' + y1 + ' L' + x2 + ',' + y2;
      } else {
        var my = (y1 + y2) / 2;
        d = 'M' + x1 + ',' + y1
          + ' L' + x1 + ',' + my
          + ' L' + x2 + ',' + my
          + ' L' + x2 + ',' + y2;
      }
    } else {
      // Desktop: immer gerade horizontale Linie auf einer gemeinsamen Y-Achse.
      var from = nodeBounds(seq[i].n);
      var to   = nodeBounds(seq[i + 1].n);
      if (!from || !to) continue;
      var hx1 = from.right + 2, hx2 = to.left - 2;
      var hy = _sharedAxisY != null ? _sharedAxisY : Math.round((from.anchorY + to.anchorY) / 2);
      d = 'M' + hx1 + ',' + hy + ' L' + hx2 + ',' + hy;
    }

    paths += '<path d="' + d + '" fill="none" stroke="' + STROKE + '" stroke-width="' + SW + '" stroke-linecap="square" stroke-linejoin="miter" marker-end="url(#' + markerId + ')"/>';
  }

  svg.innerHTML = defs + paths;
}

/* ─── Flow drag-to-reposition ───────────────────────────── */
var _flowDrag = null;
var _flowDragJustEnded = false;
var _flowDragWinHandlers = null;
// Snap-to-Grid: muss exakt mit dem Dot-Pattern (28px) in styles.css matchen,
// damit Spalten visuell an den Punkten einrasten und Verbindungslinien
// automatisch gerade verlaufen.
var _FLOW_GRID = 28;
function _flowSnap(v) { return Math.round(v / _FLOW_GRID) * _FLOW_GRID; }

/* ─── Undo / Redo (Layout-Historie pro Projekt + Breakpoint) ─── */
var _flowHistory = {};   // key = projectId+'|'+bp → { stack:[snapshot...], idx:int }
var _flowSuppressHistory = false;
function _flowHistKey() {
  if (!_activeBoardId) return null;
  try { return _activeBoardId + '|' + _currentFlowBp(); } catch(_) { return _activeBoardId + '|desktop'; }
}
function _flowHistGet() {
  var k = _flowHistKey();
  if (!k) return null;
  if (!_flowHistory[k]) _flowHistory[k] = { stack: [], idx: -1 };
  return _flowHistory[k];
}
function _flowSnapshotLayout() {
  if (!_activeBoardId) return null;
  var project = _boardProjects.find(function(p){ return p.id === _activeBoardId; });
  if (!project) return null;
  var bp = _currentFlowBp();
  var layout = (project.flowLayouts && project.flowLayouts[bp]) || {};
  return JSON.stringify(layout);
}
function _flowPushHistory() {
  if (_flowSuppressHistory) return;
  var h = _flowHistGet();
  if (!h) return;
  var snap = _flowSnapshotLayout();
  if (snap == null) return;
  // Doppelte Einträge ignorieren
  if (h.idx >= 0 && h.stack[h.idx] === snap) return;
  // Alles nach idx verwerfen (neuer Branch)
  h.stack = h.stack.slice(0, h.idx + 1);
  h.stack.push(snap);
  if (h.stack.length > 50) h.stack.shift();
  h.idx = h.stack.length - 1;
  _flowUpdateUndoButtons();
}
function _flowApplySnapshot(snap) {
  if (!_activeBoardId || snap == null) return;
  var project = _boardProjects.find(function(p){ return p.id === _activeBoardId; });
  if (!project) return;
  var bp = _currentFlowBp();
  if (!project.flowLayouts) project.flowLayouts = {};
  try { project.flowLayouts[bp] = JSON.parse(snap) || {}; } catch(_) { project.flowLayouts[bp] = {}; }
  if (bp === 'desktop') project.flowLayout = project.flowLayouts.desktop;
  _saveBoardProjects();
  _flowSuppressHistory = true;
  try { renderBoardFlow(); } finally { _flowSuppressHistory = false; }
  _flowUpdateUndoButtons();
}
function flowUndo() {
  var h = _flowHistGet();
  if (!h || h.idx <= 0) return;
  h.idx--;
  _flowApplySnapshot(h.stack[h.idx]);
  showToast('Rückgängig gemacht', 'undo');
}
function flowRedo() {
  var h = _flowHistGet();
  if (!h || h.idx >= h.stack.length - 1) return;
  h.idx++;
  _flowApplySnapshot(h.stack[h.idx]);
  showToast('Wiederhergestellt', 'redo');
}
function _flowUpdateUndoButtons() {
  var h = _flowHistGet();
  var u = document.getElementById('flowUndoBtn');
  var r = document.getElementById('flowRedoBtn');
  if (u) u.disabled = !h || h.idx <= 0;
  if (r) r.disabled = !h || h.idx >= (h ? h.stack.length - 1 : 0);
}
// Globale Tastatur-Shortcuts: Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y, aber nur
// wenn die Flow-Ansicht aktiv und kein Eingabefeld fokussiert ist.
(function _initFlowShortcutsOnce() {
  if (window._flowShortcutsBound) return;
  window._flowShortcutsBound = true;
  document.addEventListener('keydown', function(e) {
    if (!(e.ctrlKey || e.metaKey)) return;
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    var flowEl = document.getElementById('boardFlowView');
    if (!flowEl || flowEl.style.display === 'none' || !flowEl.offsetParent) return;
    var key = (e.key || '').toLowerCase();
    if (key === 'z' && !e.shiftKey) { e.preventDefault(); flowUndo(); }
    else if ((key === 'z' && e.shiftKey) || key === 'y') { e.preventDefault(); flowRedo(); }
  });
})();

function _initFlowDrag() {
  // Remove stale window listeners from previous render
  if (_flowDragWinHandlers) {
    window.removeEventListener('mousemove', _flowDragWinHandlers.move);
    window.removeEventListener('mouseup',   _flowDragWinHandlers.up);
    _flowDragWinHandlers = null;
  }
  var canvas = document.getElementById('flowCanvas');
  if (!canvas) return;

  canvas.addEventListener('mousedown', function(e) {
    if (e.button !== 0) return;
    if (e.target.closest('button,input,select,textarea')) return;
    var handle = e.target.closest('.flow-drag-handle');
    if (!handle) return;
    var col = handle.closest('[data-col-id]');
    if (!col) return;
    e.preventDefault();
    _flowDrag = {
      col:          col,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startLeft:    parseFloat(col.style.left) || 0,
      startTop:     parseFloat(col.style.top)  || 0,
      moved:        false
    };
    col.style.zIndex     = '50';
    col.style.transition = 'none';
  });

  function onMove(e) {
    if (!_flowDrag) return;
    var z = _flowZoom || 1;
    var dx = (e.clientX - _flowDrag.startClientX) / z;
    var dy = (e.clientY - _flowDrag.startClientY) / z;
    if (!_flowDrag.moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
      _flowDrag.moved = true;
      _flowDrag.col.classList.add('is-dragging');
    }
    if (!_flowDrag.moved) return;
    var nx = _flowSnap(Math.max(0, _flowDrag.startLeft + dx));
    var ny = _flowSnap(Math.max(0, _flowDrag.startTop  + dy));
    _flowDrag.col.style.left = nx + 'px';
    _flowDrag.col.style.top  = ny + 'px';
    _drawFlowConnections();
  }

  function onUp() {
    if (!_flowDrag) return;
    _flowDrag.col.classList.remove('is-dragging');
    _flowDrag.col.style.zIndex     = '';
    _flowDrag.col.style.transition = '';
    if (_flowDrag.moved) {
      _flowDragJustEnded = true;
      setTimeout(function() { _flowDragJustEnded = false; }, 200);
      _saveFlowColPosition(_flowDrag.col);
    }
    _flowDrag = null;
  }

  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup',   onUp);
  _flowDragWinHandlers = { move: onMove, up: onUp };

  // Touch support
  canvas.addEventListener('touchstart', function(e) {
    if (e.target.closest('button')) return;
    var handle = e.target.closest('.flow-drag-handle');
    if (!handle) return;
    var col = handle.closest('[data-col-id]');
    if (!col) return;
    var t = e.touches[0];
    _flowDrag = {
      col:          col,
      startClientX: t.clientX,
      startClientY: t.clientY,
      startLeft:    parseFloat(col.style.left) || 0,
      startTop:     parseFloat(col.style.top)  || 0,
      moved:        false
    };
    col.style.zIndex = '50';
  }, { passive: true });

  canvas.addEventListener('touchmove', function(e) {
    if (!_flowDrag) return;
    var t = e.touches[0];
    var z = _flowZoom || 1;
    var dx = (t.clientX - _flowDrag.startClientX) / z;
    var dy = (t.clientY - _flowDrag.startClientY) / z;
    if (!_flowDrag.moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
      _flowDrag.moved = true;
      _flowDrag.col.classList.add('is-dragging');
    }
    if (!_flowDrag.moved) return;
    e.preventDefault();
    var nxT = _flowSnap(Math.max(0, _flowDrag.startLeft + dx));
    var nyT = _flowSnap(Math.max(0, _flowDrag.startTop  + dy));
    _flowDrag.col.style.left = nxT + 'px';
    _flowDrag.col.style.top  = nyT + 'px';
    _drawFlowConnections();
  }, { passive: false });

  canvas.addEventListener('touchend', function() {
    if (!_flowDrag) return;
    _flowDrag.col.classList.remove('is-dragging');
    _flowDrag.col.style.zIndex = '';
    if (_flowDrag.moved) {
      _flowDragJustEnded = true;
      setTimeout(function() { _flowDragJustEnded = false; }, 200);
      _saveFlowColPosition(_flowDrag.col);
    }
    _flowDrag = null;
  });
}

function _saveFlowColPosition(col) {
  if (!_activeBoardId) return;
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;
  var colId = col.dataset.colId;
  if (!colId) return;
  // Layouts werden pro Breakpoint gespeichert (mobile/tablet/desktop),
  // damit ein Wechsel des Formats nicht das Layout zerstört.
  var bp = _currentFlowBp();
  if (!project.flowLayouts || typeof project.flowLayouts !== 'object') {
    project.flowLayouts = {};
    // Legacy-Layout als Desktop migrieren, falls vorhanden.
    if (project.flowLayout && typeof project.flowLayout === 'object') {
      project.flowLayouts.desktop = project.flowLayout;
    }
  }
  if (!project.flowLayouts[bp]) project.flowLayouts[bp] = {};
  project.flowLayouts[bp][colId] = {
    x: Math.round(parseFloat(col.style.left) || 0),
    y: Math.round(parseFloat(col.style.top)  || 0)
  };
  // Legacy-Feld für Rückwärtskompatibilität aktuell halten (nur Desktop).
  if (bp === 'desktop') {
    project.flowLayout = project.flowLayouts.desktop;
  }
  _saveBoardProjects();
  _flowPushHistory();
}

/* ─── Flow Zoom / Pan ─────────────────────────────────── */
var _flowZoom = 1;
var _flowMinZoom = 0.4;
var _flowMaxZoom = 2;
var _flowPanInit = false;
var _flowPanWinHandlers = null;
var _flowFittedFor = null;
// Anzeige-Basis: Zoom-Wert, der dem Nutzer als "100 %" angezeigt wird.
// Wird beim Auto-Fit auf den Fit-Zoom gesetzt, damit Standard-Ansicht immer 100 % zeigt.
var _flowDisplayBase = 1;

function _flowApplyZoom(z, immediate) {
  z = Math.max(_flowMinZoom, Math.min(_flowMaxZoom, z));
  _flowZoom = z;
  var world = document.getElementById('flowWorld');
  var canvas = document.getElementById('flowCanvas');
  if (!world || !canvas) return;
  if (immediate) world.classList.add('no-transition');
  world.style.transform = 'scale(' + z + ')';
  // Basis-Layoutgröße der Welt (unskaliert) – bleibt konstant.
  var wW = parseFloat(world.dataset.worldW) || world.offsetWidth;
  var wH = parseFloat(world.dataset.worldH) || world.offsetHeight;
  world.style.width  = wW + 'px';
  world.style.height = wH + 'px';
  // Scroll-Flaeche kommt aus dem Spacer (visuelle, also skalierte Groesse).
  // Auf Mobile zusaetzlich kleine Bottom-Reserve (Komfort + Mobile-Nav).
  var _isMob = (window.innerWidth || 1200) <= 768;
  var extraBottom = _isMob ? 32 : 0;
  var spacer = document.getElementById('flowSpacer');
  if (spacer) {
    spacer.style.width  = (wW * z) + 'px';
    spacer.style.height = (wH * z + extraBottom) + 'px';
  }
  // KEIN canvas.style.minHeight setzen – das wuerde min-height: 0 (flex)
  // ueberschreiben und den Canvas selbst aus dem Parent-Flex herauswachsen
  // lassen. Der Spacer uebernimmt die Scrollarea.
  if (immediate) requestAnimationFrame(function(){ world.classList.remove('no-transition'); });
  var lbl = document.getElementById('flowZoomPct');
  if (lbl) {
    var base = _flowDisplayBase || 1;
    lbl.textContent = Math.round((z / base) * 100) + '%';
  }
}

function flowZoom(delta) {
  var canvas = document.getElementById('flowCanvas');
  if (!canvas) return;
  var oldZ = _flowZoom;
  // Anzeige-Basis = 1 (immer 100%-bezogen). Nutzer-Zoom ist absolute Stufe.
  _flowDisplayBase = 1;
  // In 10%-Schritten arbeiten: aktuellen Wert auf nächste 10er-Stufe runden
  // und dann delta (auch ein 10er-Vielfaches) addieren.
  var stepped = Math.round(oldZ * 10) / 10;
  var newZ = Math.max(_flowMinZoom, Math.min(_flowMaxZoom, stepped + delta));
  // Auf 2 Nachkommastellen runden, damit z.B. 1.0000001 nicht 100,00001 % wird
  newZ = Math.round(newZ * 100) / 100;
  if (Math.abs(newZ - oldZ) < 0.001) return;
  // Zoom toward center of current viewport
  var cx = canvas.scrollLeft + canvas.clientWidth / 2;
  var cy = canvas.scrollTop + canvas.clientHeight / 2;
  var ratio = newZ / oldZ;
  _flowApplyZoom(newZ);
  canvas.scrollLeft = cx * ratio - canvas.clientWidth / 2;
  canvas.scrollTop  = cy * ratio - canvas.clientHeight / 2;
}

// Custom Zoom-Prozent eingeben (Klick auf Label)
function flowZoomPrompt() {
  var canvas = document.getElementById('flowCanvas');
  if (!canvas) return;
  var current = Math.round(_flowZoom * 100);
  var input = window.prompt('Zoom (%) – z. B. 100, 75, 150:', String(current));
  if (input == null) return;
  var v = parseInt(String(input).replace(/[^0-9-]/g, ''), 10);
  if (!isFinite(v) || v <= 0) return;
  var minPct = Math.round(_flowMinZoom * 100);
  var maxPct = Math.round(_flowMaxZoom * 100);
  v = Math.max(minPct, Math.min(maxPct, v));
  _flowDisplayBase = 1;
  var oldZ = _flowZoom;
  var newZ = v / 100;
  if (Math.abs(newZ - oldZ) < 0.001) return;
  var cx = canvas.scrollLeft + canvas.clientWidth / 2;
  var cy = canvas.scrollTop + canvas.clientHeight / 2;
  var ratio = newZ / oldZ;
  _flowApplyZoom(newZ);
  canvas.scrollLeft = cx * ratio - canvas.clientWidth / 2;
  canvas.scrollTop  = cy * ratio - canvas.clientHeight / 2;
}
window.flowZoomPrompt = flowZoomPrompt;

function flowFitToScreen() {
  var canvas = document.getElementById('flowCanvas');
  var world  = document.getElementById('flowWorld');
  if (!canvas || !world) return;
  var wW = parseFloat(world.dataset.worldW) || world.offsetWidth;
  var wH = parseFloat(world.dataset.worldH) || world.offsetHeight;
  var availW = canvas.clientWidth  - 24;
  var availH = canvas.clientHeight - 24;
  if (availW <= 0 || wW <= 0) return;
  var isMobile = (window.innerWidth || 1200) <= 600;
  var fitZ;
  if (isMobile) {
    // Handy: KEIN Zoom-Fit. Welt ist genauso breit wie der Canvas,
    // Karten werden 1:1 dargestellt, nur vertikal gescrollt.
    fitZ = 1;
  } else {
    // Desktop: an beide Achsen anpassen (mit kleinem Headroom oben/unten)
    if (availH <= 0 || wH <= 0) return;
    fitZ = Math.min(availW / wW, availH / wH);
    // Minimal lesbar lassen – nicht mikroskopisch klein einrasten
    fitZ = Math.max(fitZ, 0.5);
  }
  fitZ = Math.max(_flowMinZoom, Math.min(_flowMaxZoom, fitZ));
  // 100 % entspricht IMMER der 1:1-Darstellung. Auto-Fit setzt nur den
  // initialen Zoom, aendert aber nicht, was der Nutzer als „100 %" sieht.
  _flowDisplayBase = 1;
  _flowApplyZoom(fitZ);
  // Welt zentriert ins Viewport ruecken (horizontal mittig, vertikal oben).
  setTimeout(function() {
    var sw = canvas.scrollWidth  - canvas.clientWidth;
    canvas.scrollLeft = isMobile ? 0 : Math.max(0, sw / 2);
    canvas.scrollTop  = 0;
  }, 50);
}

function flowResetView() {
  // Reset = zurueck auf 100 % (1:1) und horizontal zentriert.
  _flowDisplayBase = 1;
  _flowApplyZoom(1);
  var canvas = document.getElementById('flowCanvas');
  if (canvas) {
    var isMobile = (window.innerWidth || 1200) <= 600;
    setTimeout(function(){
      var sw = canvas.scrollWidth - canvas.clientWidth;
      canvas.scrollLeft = isMobile ? 0 : Math.max(0, sw / 2);
      canvas.scrollTop  = 0;
    }, 30);
  }
}

// Setzt das Layout für alle Breakpoints zurück auf die saubere Default-
// Struktur – nützlich wenn nach Gerätewechsel (Handy ↔ Desktop) die
// Positionen durcheinander geraten sind.
function flowAutoLayout() {
  if (!_activeBoardId) return;
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;
  if (!confirm('Struktur neu anordnen? Alle manuell verschobenen Spalten werden auf die Standard-Anordnung zurückgesetzt (Desktop & Handy).')) return;
  project.flowLayouts = {};
  delete project.flowLayout;
  _saveBoardProjects();
  _flowFittedFor = null;
  try { renderBoardFlow(); } catch(_) {}
  try { showToast && showToast('Struktur wiederhergestellt', 'success'); } catch(_) {}
}

function toggleFlowFullscreen() {
  var view = document.getElementById('boardFlowView');
  if (!view) return;
  var doc = document;
  var isFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement);
  // Pseudo-Fullscreen-Toggle (iOS)
  if (view.classList.contains('is-pseudo-fullscreen')) {
    view.classList.remove('is-pseudo-fullscreen');
    document.body.classList.remove('has-pseudo-fullscreen');
    _updateFlowFullscreenBtn(false);
    // Alles Overlay-artige zurück an den Body
    Array.from(view.children).forEach(function(el) {
      if (el.classList && (el.classList.contains('flow-toolbar') ||
                           el.classList.contains('flow-budget-bar') ||
                           el.classList.contains('flow-canvas'))) return;
      try { document.body.appendChild(el); } catch(_) {}
    });
    return;
  }
  if (isFs) {
    if (doc.exitFullscreen) doc.exitFullscreen();
    else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
    else if (doc.msExitFullscreen) doc.msExitFullscreen();
  } else {
    var req = view.requestFullscreen || view.webkitRequestFullscreen || view.msRequestFullscreen;
    if (req) {
      try { req.call(view); } catch(_) {}
    } else {
      // Fallback: CSS-Vollbild für iOS Safari (kein echtes Fullscreen-API)
      view.classList.add('is-pseudo-fullscreen');
      document.body.classList.add('has-pseudo-fullscreen');
      _updateFlowFullscreenBtn(true);
      // Bereits existierende Overlays/Modals in den Pseudo-Fullscreen umhängen
      Array.from(document.body.children).forEach(function(el) {
        if (el === view) return;
        var tag = el.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'LINK' || tag === 'META') return;
        if (el.id === 'wpadminbar') return;
        if (el.matches && el.matches('main, nav, header, footer, section.page, .site-header, .site-footer')) return;
        var cs = window.getComputedStyle(el);
        if (cs.position === 'fixed' || cs.position === 'absolute' ||
            (el.className && /modal|overlay|toast|popup|dropdown|menu|tooltip|dialog|snackbar|portal/i.test(el.className))) {
          try { view.appendChild(el); } catch(_) {}
        }
      });
      setTimeout(flowFitToScreen, 80);
      return;
    }
  }
}
function _updateFlowFullscreenBtn(isFs) {
  var icon = document.getElementById('flowFullscreenIcon');
  var btn  = document.getElementById('flowFullscreenBtn');
  if (icon) icon.textContent = isFs ? 'fullscreen_exit' : 'fullscreen';
  if (btn)  btn.title = isFs ? 'Vollbild verlassen' : 'Vollbild';
}
// Fullscreen-API Events → Button-Icon aktualisieren + Fit-to-Screen beim Entern
if (!window._flowFullscreenBound) {
  window._flowFullscreenBound = true;
  // Helper: aktives Fullscreen-Target (Board-Flow-View) ermitteln
  function _flowFsTarget() {
    var view = document.getElementById('boardFlowView');
    var real = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
    if (real === view) return view;
    if (view && view.classList.contains('is-pseudo-fullscreen')) return view;
    return null;
  }
  // MutationObserver: Alle neu an <body> angehängten Elemente, die während des
  // Vollbild-Modus hinzukommen, automatisch in den Fullscreen-Container umhängen
  // (Modals, Popups, Toasts, Tooltips, Overlays, Dropdowns, Menüs, …).
  // Sonst wären sie außerhalb des :fullscreen-Elements und nicht sichtbar.
  var _flowFsObserver = new MutationObserver(function(muts) {
    var target = _flowFsTarget();
    if (!target) return;
    muts.forEach(function(m) {
      m.addedNodes && m.addedNodes.forEach(function(node) {
        if (node.nodeType !== 1) return;
        if (node.parentNode !== document.body) return;
        if (node === target) return;
        // Immutable/structural Elemente NICHT umhängen
        var tag = node.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'LINK' || tag === 'META') return;
        if (node.id === 'wpadminbar') return;
        // Bestehende Seitenstruktur (Sections, Main, Nav etc.) nie verschieben
        if (node.matches && node.matches('main, nav, header, footer, section.page, .site-header, .site-footer')) return;
        // Alles andere (neue Overlays/Modals/Popups) ins Fullscreen-Target umhängen
        try { target.appendChild(node); } catch(_) {}
      });
    });
  });
  _flowFsObserver.observe(document.body, { childList: true });

  var _fsHandler = function() {
    var isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
    _updateFlowFullscreenBtn(isFs);
    if (isFs) {
      // Bereits existierende Overlay-artige Elemente ins Fullscreen-Target umhängen
      var target = _flowFsTarget();
      if (target) {
        Array.from(document.body.children).forEach(function(el) {
          if (el === target) return;
          var tag = el.tagName;
          if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'LINK' || tag === 'META') return;
          if (el.id === 'wpadminbar') return;
          if (el.matches && el.matches('main, nav, header, footer, section.page, .site-header, .site-footer')) return;
          // Nur Elemente übernehmen, die als Overlay/Modal/Popup/Toast wirken
          var cs = window.getComputedStyle(el);
          if (cs.position === 'fixed' || cs.position === 'absolute' ||
              (el.className && /modal|overlay|toast|popup|dropdown|menu|tooltip|dialog|snackbar|portal/i.test(el.className))) {
            try { target.appendChild(el); } catch(_) {}
          }
        });
      }
      setTimeout(flowFitToScreen, 120);
    } else {
      // Beim Verlassen: Alles Overlay-artige zurück an den Body
      var view = document.getElementById('boardFlowView');
      if (view) {
        Array.from(view.children).forEach(function(el) {
          if (el.classList && (el.classList.contains('flow-toolbar') ||
                               el.classList.contains('flow-budget-bar') ||
                               el.classList.contains('flow-canvas'))) return;
          if (el.id === 'flowCanvas') return;
          try { document.body.appendChild(el); } catch(_) {}
        });
      }
    }
  };
  document.addEventListener('fullscreenchange', _fsHandler);
  document.addEventListener('webkitfullscreenchange', _fsHandler);
  // ESC aus Pseudo-Fullscreen (iOS)
  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Escape') return;
    var view = document.getElementById('boardFlowView');
    if (view && view.classList.contains('is-pseudo-fullscreen')) {
      view.classList.remove('is-pseudo-fullscreen');
      document.body.classList.remove('has-pseudo-fullscreen');
      _updateFlowFullscreenBtn(false);
      // Alles Overlay-artige zurück an den Body
      Array.from(view.children).forEach(function(el) {
        if (el.classList && (el.classList.contains('flow-toolbar') ||
                             el.classList.contains('flow-budget-bar') ||
                             el.classList.contains('flow-canvas'))) return;
        try { document.body.appendChild(el); } catch(_) {}
      });
    }
  });
}

function _initFlowZoomPan() {
  var canvas = document.getElementById('flowCanvas');
  if (!canvas) return;
  // Prevent double-bind
  if (canvas._zoomInit) return;
  canvas._zoomInit = true;

  // Cleanup previous window listeners from a prior render
  if (_flowPanWinHandlers) {
    window.removeEventListener('mousemove', _flowPanWinHandlers.move);
    window.removeEventListener('mouseup',   _flowPanWinHandlers.up);
    _flowPanWinHandlers = null;
  }

  // Ctrl+wheel = zoom, plain wheel = scroll
  canvas.addEventListener('wheel', function(e) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      var delta = -Math.sign(e.deltaY) * 0.10;
      var rect = canvas.getBoundingClientRect();
      var cx = e.clientX - rect.left + canvas.scrollLeft;
      var cy = e.clientY - rect.top + canvas.scrollTop;
      var oldZ = _flowZoom;
      // Auf 10er-Raster snappen, damit Anzeige immer ganzzahlige Prozent zeigt
      _flowDisplayBase = 1;
      var stepped = Math.round(oldZ * 10) / 10;
      var newZ = Math.max(_flowMinZoom, Math.min(_flowMaxZoom, stepped + delta));
      newZ = Math.round(newZ * 100) / 100;
      if (Math.abs(newZ - oldZ) < 0.001) return;
      var ratio = newZ / oldZ;
      _flowApplyZoom(newZ);
      canvas.scrollLeft = cx * ratio - (e.clientX - rect.left);
      canvas.scrollTop  = cy * ratio - (e.clientY - rect.top);
    }
  }, { passive: false });

  // Background pan (drag on empty area) with momentum/inertia
  // Erlaubt auf Canvas-Hintergrund UND auf Spalten-Hintergrund (leerer Platz
  // in einer Stage zwischen/ober/unterhalb der Karten). Ausgeschlossen nur:
  // tatsächliche Karten, Buttons, Links, Form-Elemente und Drag-Handles
  // (Stage-Header sowie Start/End-Spalten, die per Drag verschoben werden).
  var panState = null;
  var _panMomentumRAF = null;

  function _cancelPanMomentum() {
    if (_panMomentumRAF) { cancelAnimationFrame(_panMomentumRAF); _panMomentumRAF = null; }
  }

  canvas.addEventListener('mousedown', function(e) {
    if (e.button !== 0) return;
    if (e.target.closest('.flow-node, .flow-drag-handle, button, a, input, select, textarea')) return;
    _cancelPanMomentum();
    panState = {
      sx: e.clientX, sy: e.clientY,
      scrollLeft: canvas.scrollLeft, scrollTop: canvas.scrollTop,
      lastX: e.clientX, lastY: e.clientY,
      velSamples: []
    };
    canvas.classList.add('is-panning');
  });

  function panMove(e) {
    if (!panState) return;
    var dvx = e.clientX - panState.lastX;
    var dvy = e.clientY - panState.lastY;
    panState.lastX = e.clientX;
    panState.lastY = e.clientY;
    // Rolling window of last 4 velocity samples for stable release velocity
    panState.velSamples.push({ vx: dvx, vy: dvy });
    if (panState.velSamples.length > 4) panState.velSamples.shift();
    canvas.scrollLeft = panState.scrollLeft - (e.clientX - panState.sx);
    canvas.scrollTop  = panState.scrollTop  - (e.clientY - panState.sy);
  }

  function panUp() {
    if (!panState) return;
    // Compute average velocity from last samples
    var samples = panState.velSamples;
    var vx = 0, vy = 0;
    if (samples.length > 0) {
      samples.forEach(function(s) { vx += s.vx; vy += s.vy; });
      vx /= samples.length;
      vy /= samples.length;
    }
    panState = null;
    canvas.classList.remove('is-panning');
    // Launch momentum glide if there is meaningful velocity
    if (Math.abs(vx) > 0.8 || Math.abs(vy) > 0.8) {
      var decay = 0.88;
      (function momentum() {
        vx *= decay;
        vy *= decay;
        canvas.scrollLeft -= vx;
        canvas.scrollTop  -= vy;
        if (Math.abs(vx) > 0.3 || Math.abs(vy) > 0.3) {
          _panMomentumRAF = requestAnimationFrame(momentum);
        } else {
          _panMomentumRAF = null;
        }
      })();
    }
  }

  window.addEventListener('mousemove', panMove);
  window.addEventListener('mouseup', panUp);
  _flowPanWinHandlers = { move: panMove, up: panUp };

  // Touch: 1 finger = pan (überall, auch auf Nodes – mit Bewegungs-Schwelle);
  //        2 Finger = Pinch-Zoom
  var touchState = null;
  var TAP_THRESHOLD = 8; // px – darunter = Tap/Klick, darüber = Pan
  canvas.addEventListener('touchstart', function(e) {
    if (e.touches.length === 2) {
      var t1 = e.touches[0], t2 = e.touches[1];
      var dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      touchState = { mode: 'pinch', startDist: dist, startZoom: _flowZoom,
                     cx: (t1.clientX + t2.clientX) / 2, cy: (t1.clientY + t2.clientY) / 2 };
    } else if (e.touches.length === 1) {
      var t = e.touches[0];
      // Interaktive Elemente niemals übersteuern (Buttons, Links, Inputs, Drag-Handles)
      var isInteractive = !!e.target.closest('button, a, input, select, textarea, .flow-drag-handle');
      _cancelPanMomentum();
      touchState = {
        mode: isInteractive ? null : 'maybe-pan',
        sx: t.clientX, sy: t.clientY,
        scrollLeft: canvas.scrollLeft, scrollTop: canvas.scrollTop,
        lastX: t.clientX, lastY: t.clientY,
        velSamples: [],
        moved: false
      };
    }
  }, { passive: true });
  canvas.addEventListener('touchmove', function(e) {
    if (!touchState) return;
    if (touchState.mode === 'pinch' && e.touches.length === 2) {
      e.preventDefault();
      var t1 = e.touches[0], t2 = e.touches[1];
      var dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      var scale = dist / touchState.startDist;
      var newZ = Math.max(_flowMinZoom, Math.min(_flowMaxZoom, touchState.startZoom * scale));
      var oldZ = _flowZoom;
      var ratio = newZ / oldZ;
      _flowApplyZoom(newZ);
      var rect = canvas.getBoundingClientRect();
      var cx = touchState.cx - rect.left + canvas.scrollLeft;
      var cy = touchState.cy - rect.top + canvas.scrollTop;
      canvas.scrollLeft = cx * ratio - (touchState.cx - rect.left);
      canvas.scrollTop  = cy * ratio - (touchState.cy - rect.top);
    } else if (e.touches.length === 1 && (touchState.mode === 'pan' || touchState.mode === 'maybe-pan')) {
      var tt = e.touches[0];
      var dx = tt.clientX - touchState.sx;
      var dy = tt.clientY - touchState.sy;
      if (touchState.mode === 'maybe-pan') {
        if (Math.abs(dx) > TAP_THRESHOLD || Math.abs(dy) > TAP_THRESHOLD) {
          touchState.mode = 'pan';
          canvas.classList.add('is-panning');
        }
      }
      if (touchState.mode === 'pan') {
        e.preventDefault();
        touchState.moved = true;
        var tdvx = tt.clientX - touchState.lastX;
        var tdvy = tt.clientY - touchState.lastY;
        touchState.lastX = tt.clientX;
        touchState.lastY = tt.clientY;
        touchState.velSamples.push({ vx: tdvx, vy: tdvy });
        if (touchState.velSamples.length > 4) touchState.velSamples.shift();
        canvas.scrollLeft = touchState.scrollLeft - dx;
        canvas.scrollTop  = touchState.scrollTop  - dy;
      }
    }
  }, { passive: false });
  canvas.addEventListener('touchend', function(e) {
    // Pinch-Zoom: am Ende auf 10er-Stufe einrasten, damit Anzeige saubere %-Werte zeigt
    if (touchState && touchState.mode === 'pinch' && e.touches.length < 2) {
      var snapZ = Math.round(_flowZoom * 10) / 10;
      snapZ = Math.max(_flowMinZoom, Math.min(_flowMaxZoom, snapZ));
      if (Math.abs(snapZ - _flowZoom) > 0.001) {
        var oldZ = _flowZoom;
        var ratio = snapZ / oldZ;
        var sx = canvas.scrollLeft + canvas.clientWidth / 2;
        var sy = canvas.scrollTop  + canvas.clientHeight / 2;
        _flowDisplayBase = 1;
        _flowApplyZoom(snapZ);
        canvas.scrollLeft = sx * ratio - canvas.clientWidth / 2;
        canvas.scrollTop  = sy * ratio - canvas.clientHeight / 2;
      }
    }
    if (touchState && touchState.moved) {
      // Momentum glide for touch
      var tSamples = touchState.velSamples || [];
      var tvx = 0, tvy = 0;
      if (tSamples.length > 0) {
        tSamples.forEach(function(s) { tvx += s.vx; tvy += s.vy; });
        tvx /= tSamples.length;
        tvy /= tSamples.length;
      }
      if (Math.abs(tvx) > 0.8 || Math.abs(tvy) > 0.8) {
        var tdecay = 0.88;
        (function tMomentum() {
          tvx *= tdecay;
          tvy *= tdecay;
          canvas.scrollLeft -= tvx;
          canvas.scrollTop  -= tvy;
          if (Math.abs(tvx) > 0.3 || Math.abs(tvy) > 0.3) {
            _panMomentumRAF = requestAnimationFrame(tMomentum);
          } else {
            _panMomentumRAF = null;
          }
        })();
      }
      // Verhindere, dass nach einem Swipe ein Klick/Tap auf eine Karte auslöst
      var blocker = function(ev) { ev.stopPropagation(); ev.preventDefault(); };
      canvas.addEventListener('click', blocker, { capture: true, once: true });
      setTimeout(function(){ try { canvas.removeEventListener('click', blocker, { capture: true }); } catch(_){} }, 350);
    }
    canvas.classList.remove('is-panning');
    if (e.touches.length === 0) touchState = null;
  });

  // Keyboard shortcuts
  if (!_flowPanInit) {
    _flowPanInit = true;
    document.addEventListener('keydown', function(e) {
      var view = document.getElementById('boardFlowView');
      if (!view || view.style.display === 'none') return;
      if (e.target && ['INPUT','TEXTAREA','SELECT'].indexOf(e.target.tagName) > -1) return;
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) { e.preventDefault(); flowZoom(0.10); }
      else if ((e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); flowZoom(-0.10); }
      else if ((e.ctrlKey || e.metaKey) && e.key === '0') { e.preventDefault(); flowResetView(); }
      else if (e.key === 'f' || e.key === 'F') { flowFitToScreen(); }
    });
  }
}

/* ─── Public / Private Toggle ─────────────────────────── */
function toggleFlowVisibility() {
  if (!_activeBoardId) return;
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;
  project.isPublic = !project.isPublic;
  _saveBoardProjects();
  renderBoardFlow();
  showToast(project.isPublic ? 'Projekt ist jetzt öffentlich teilbar' : 'Projekt ist jetzt privat', project.isPublic ? 'public' : 'lock');
}

function openFlowShareModal() {
  if (!_activeBoardId) return;
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project || !project.isPublic) return;
  var url = window.location.origin + window.location.pathname + '?board=' + encodeURIComponent(project.id);
  var html = '<div class="modal-overlay show" id="flowShareModal" onclick="closeModalOnOverlay(event)" style="z-index:2200">' +
    '<div class="modal modal-sm" onclick="event.stopPropagation()">' +
    '<button class="modal-close" aria-label="Schließen" onclick="document.getElementById(\'flowShareModal\').remove()"><span class="material-icons-round">close</span></button>' +
    '<div class="modal-header"><span class="material-icons-round modal-icon">ios_share</span><h2>Projekt teilen</h2><p>Teile diesen Link mit Freunden, Familie oder Dienstleistern</p></div>' +
    '<div class="modal-form">' +
    '<div class="flow-share-row"><input type="text" readonly id="flowShareUrl" value="' + _escHtml(url) + '" onclick="this.select()" />' +
    '<button type="button" class="btn-primary" aria-label="Link kopieren" onclick="_copyFlowShareUrl()"><span class="material-icons-round">content_copy</span></button></div>' +
    '<p style="font-size:12px;color:var(--text-light);margin-top:10px">Dienstleister können über diesen Link ihre Zustimmung bestätigen.</p>' +
    '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}
function _copyFlowShareUrl() {
  var inp = document.getElementById('flowShareUrl');
  if (!inp) return;
  inp.select();
  try {
    if (navigator.clipboard) navigator.clipboard.writeText(inp.value);
    else document.execCommand('copy');
    showToast('Link kopiert!', 'content_copy');
  } catch(e) { document.execCommand('copy'); }
}

/* ─── Provider confirmation simulation ────────────────── */
function toggleFlowCardConfirm(cardId) {
  // Alte Simulation: User durfte den Anbieter „simuliert" bestätigen und
  // damit die Stage selbst auf „Bezahlt" springen lassen. Das ist falsch –
  // Bestätigung MUSS vom Dienstleister-Server kommen. Funktion bleibt als
  // No-Op erhalten, damit alte Inline-Handler nicht crashen.
  showToast('Diese Aktion ist deaktiviert – die Bestätigung muss durch den Dienstleister erfolgen.', 'info');
  return;
}

// Modals for Board
function openCreateBoardModal() {
  var templates = [
    { id: 'wedding',   emoji: '💍', label: 'Hochzeit',    suggested: ['DJ','Fotograf','Catering','Location','Floristik','Torte'] },
    { id: 'birthday',  emoji: '🎂', label: 'Geburtstag',  suggested: ['DJ','Catering','Dekoration','Fotograf'] },
    { id: 'corporate', emoji: '🏢', label: 'Firmenfeier', suggested: ['Catering','Technik','Location','Fotograf','Moderation'] },
    { id: 'festival',  emoji: '🎪', label: 'Festival',    suggested: ['Bühnentechnik','DJ','Sicherheit','Catering','Toiletten'] },
    { id: 'conference',emoji: '🎤', label: 'Konferenz',   suggested: ['Location','Technik','Catering','Fotograf'] },
    { id: 'baptism',   emoji: '⛪', label: 'Taufe/Feier', suggested: ['Catering','Location','Fotograf','Floristik'] },
    { id: 'kids',      emoji: '🎈', label: 'Kinderfest',  suggested: ['Animation','Catering','Dekoration'] },
    { id: 'private',   emoji: '🏡', label: 'Privatfeier', suggested: ['Catering','DJ','Dekoration'] },
    { id: 'custom',    emoji: '✨', label: 'Eigenes',     suggested: [] }
  ];
  var tmplHtml = templates.map(function(t, i) {
    return '<div class="tmpl-card' + (i===0?' is-selected':'') + '" data-tmpl="' + t.id + '" onclick="_selectBoardTmpl(this)">' +
      '<span class="tmpl-emoji">' + t.emoji + '</span><span class="tmpl-label">' + t.label + '</span></div>';
  }).join('');
  window._boardTemplates = templates;

  var html = `<div class="modal-overlay show" id="createBoardModal" onclick="closeModalOnOverlay(event)" style="z-index:2000">
    <div class="modal modal-sm" onclick="event.stopPropagation()">
      <button class="modal-close" aria-label="Schließen" onclick="document.getElementById('createBoardModal').remove()"><span class="material-icons-round">close</span></button>
      <div class="modal-header">
        <span class="material-icons-round modal-icon">view_kanban</span>
        <h2>Neues Event-Projekt</h2>
        <p>Wähle einen Event-Typ und starte direkt mit passenden Kategorien</p>
      </div>
      <form class="modal-form" onsubmit="_createBoardProject(event)">
        <div class="form-group">
          <label>Event-Typ</label>
          <div class="tmpl-grid">${tmplHtml}</div>
          <input type="hidden" id="newBoardTmpl" value="wedding" />
        </div>
        <div class="form-group">
          <label>Event-Name</label>
          <input type="text" id="newBoardName" placeholder="z.B. Hochzeit Julia & Mark" required autofocus />
        </div>
        <div class="form-group">
          <label>Event-Datum</label>
          <input type="text" id="newBoardDate" placeholder="TT.MM.JJJJ" autocomplete="off" />
        </div>
        <div class="form-group">
          <label>Budget (€, optional)</label>
          <input type="number" id="newBoardBudget" placeholder="z.B. 5000" min="0" step="100" />
        </div>
        <div class="form-group">
          <label>Gästeanzahl (optional)</label>
          <input type="number" id="newBoardGuests" placeholder="z.B. 80" min="1" step="1" />
        </div>
        <button type="submit" class="btn-primary btn-block"><span class="material-icons-round">add</span> Projekt erstellen</button>
      </form>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  // Deutsches Datumsformat (TT.MM.JJJJ) mit Kalender – einheitlich zu den
  // anderen Datum-Feldern in der App.
  _attachGermanDatePicker('#newBoardDate');
}

function _selectBoardTmpl(el) {
  document.querySelectorAll('#createBoardModal .tmpl-card').forEach(function(c){ c.classList.remove('is-selected'); });
  el.classList.add('is-selected');
  var id = el.dataset.tmpl;
  document.getElementById('newBoardTmpl').value = id;
  // Auto-fill name placeholder
  var nameInp = document.getElementById('newBoardName');
  var tmpl = (window._boardTemplates || []).find(function(t){ return t.id === id; });
  if (nameInp && tmpl && id !== 'custom') {
    nameInp.placeholder = 'z.B. ' + tmpl.label + ' 2026';
  }
}

function _createBoardProject(event) {
  event.preventDefault();
  var name = document.getElementById('newBoardName').value.trim();
  var date = document.getElementById('newBoardDate').value.trim();
  var budget = document.getElementById('newBoardBudget').value.trim();
  var guests = document.getElementById('newBoardGuests').value.trim();
  var tmplId = (document.getElementById('newBoardTmpl') || {}).value || 'custom';
  if (!name) return;

  // Keine Beispielinserate / Platzhalter-Karten – das Board startet leer.
  // Dienstleister werden vom Nutzer ueber „+ Hinzufuegen" und die echte
  // Inserats-Suche selbst eingetragen.
  var cards = [];

  var project = {
    id: 'bp_' + Date.now(),
    name: name,
    date: date || '',
    budget: parseFloat(budget) || 0,
    guests: parseInt(guests) || 0,
    template: tmplId,
    cards: cards,
    checklist: [],
    createdAt: new Date().toISOString(),
    updatedAt: Date.now()
  };
  _boardProjects.unshift(project);
  _saveBoardProjects({ immediate: true });
  document.getElementById('createBoardModal') && document.getElementById('createBoardModal').remove();
  openBoardProject(project.id);
  showToast('Event-Projekt \u201e' + name + '\u201c wurde erstellt!', 'check_circle');
}

/* ─── Edit Board Project ──────────────────────────────────── */
function openEditBoardProjectModal(projectId) {
  var pid = projectId || _activeBoardId;
  if (!pid) return;
  var project = _boardProjects.find(function(p){ return p.id === pid; });
  if (!project) return;

  var html = '<div class="modal-overlay show" id="editBoardProjectModal" onclick="closeModalOnOverlay(event)" style="z-index:2000">' +
    '<div class="modal modal-sm" onclick="event.stopPropagation()">' +
      '<button class="modal-close" aria-label="Schließen" onclick="document.getElementById(\'editBoardProjectModal\').remove()"><span class="material-icons-round">close</span></button>' +
      '<div class="modal-header"><span class="material-icons-round modal-icon">edit</span><h2>Projekt bearbeiten</h2></div>' +
      '<form class="modal-form" onsubmit="_saveEditBoardProject(event,\'' + pid + '\')">' +
        '<div class="form-group"><label>Event-Name</label><input type="text" id="editProjName" value="' + _escHtml(project.name) + '" required /></div>' +
        '<div class="form-group"><label>Event-Datum</label><input type="text" id="editProjDate" value="' + _escHtml(project.date || '') + '" placeholder="TT.MM.JJJJ" /></div>' +
        '<div class="form-group"><label>Budget (€)</label><input type="number" id="editProjBudget" value="' + (project.budget || '') + '" min="0" step="100" /></div>' +
        '<div class="form-group"><label>G\u00e4steanzahl</label><input type="number" id="editProjGuests" value="' + (project.guests || '') + '" min="1" step="1" placeholder="z.B. 80" /></div>' +
        '<div class="form-group"><label>Event-Typ</label><select id="editProjTemplate">' +
          [
            {id:'wedding',l:'💍 Hochzeit'},{id:'birthday',l:'🎂 Geburtstag'},{id:'corporate',l:'🏢 Firmenfeier'},
            {id:'festival',l:'🎪 Festival'},{id:'conference',l:'🎤 Konferenz'},{id:'baptism',l:'⛪ Taufe/Feier'},
            {id:'kids',l:'🎈 Kinderfest'},{id:'private',l:'🏡 Privatfeier'},{id:'custom',l:'✨ Eigenes'}
          ].map(function(t){
            return '<option value="' + t.id + '"' + (project.template === t.id ? ' selected' : '') + '>' + t.l + '</option>';
          }).join('') +
        '</select></div>' +
        '<button type="submit" class="btn-primary btn-block"><span class="material-icons-round">save</span> Speichern</button>' +
      '</form>' +
    '</div>' +
  '</div>';
  document.body.insertAdjacentHTML('beforeend', html);
  _attachGermanDatePicker('#editProjDate');
}

function _saveEditBoardProject(event, projectId) {
  event.preventDefault();
  var project = _boardProjects.find(function(p){ return p.id === projectId; });
  if (!project) return;
  project.name     = document.getElementById('editProjName').value.trim() || project.name;
  project.date     = document.getElementById('editProjDate').value.trim();
  project.budget   = parseFloat(document.getElementById('editProjBudget').value) || 0;
  project.guests   = parseInt(document.getElementById('editProjGuests').value) || 0;
  project.template = document.getElementById('editProjTemplate').value || project.template;
  document.getElementById('editBoardProjectModal') && document.getElementById('editBoardProjectModal').remove();
  _saveBoardProjects();
  // Refresh UI
  var nameEl = document.getElementById('boardEventName');
  var dateEl = document.getElementById('boardEventDate');
  if (nameEl) nameEl.textContent = project.name;
  if (dateEl) dateEl.textContent = project.date ? new Date(project.date + 'T00:00:00').toLocaleDateString('de-DE', {day:'2-digit',month:'long',year:'numeric'}) : 'Datum noch offen';
  _updateBoardStats(project);
  renderBoardPage(); // refresh project card list too
  showToast('Projekt aktualisiert', 'check_circle');
}
window.openEditBoardProjectModal = openEditBoardProjectModal;

/* ─── Add current listing to board ──────────────────────── */
function addCurrentListingToBoard(listingId) {
  var lid = listingId || (typeof currentListing !== 'undefined' && currentListing && currentListing.id);
  if (!lid) { showToast('Kein Service ausgew\u00e4hlt.', 'error'); return; }
  if (!currentUser) { openModal('loginModal'); return; }

  var listing = (LISTINGS || []).find(function(l){ return l.id === lid; }) || { id: lid };

  // 0 Projekte → direkt Board erstellen; 1 Projekt → direkt hinzufügen; sonst → Auswahl
  if (_boardProjects.length === 0) {
    window._pendingAddListing = listing;
    openCreateBoardModal();
    return;
  }
  if (_boardProjects.length === 1) {
    _addListingToBoardProject(listing || { id: lid }, _boardProjects[0].id);
    return;
  }
  openSelectBoardProjectModal(listing);
}
window.addCurrentListingToBoard = addCurrentListingToBoard;

/* ─── Verfügbarkeitsverwaltung (Anbieter-Modal) ───────────────────────────
 * Anbieter blocken einzelne Tage über einen kleinen 2-Monats-Kalender.
 * Daten kommen aus GET /listings/{id}/availability und werden per PUT
 * persistiert. Suchende sehen geblockte Tage beim Datums-Picker (rot)
 * und in der Sofortbuchungs-Slot-Liste.
 *  - openAvailabilityModal(listingId)
 *  - renderAvailabilityCalendar()
 *  - toggleAvailabilityDate(iso)
 *  - resetAvailabilityBlocks()
 *  - saveAvailabilityBlocks()
 *  - Cache: _availabilityCache (Map<listingId, { blockedDates, weekdays, ts }>)
 *  - getCachedAvailability(listingId, maxAgeMs)  → für Detail-Picker
 */
var _availabilityCache = Object.create(null);
var _availabilityState = { listingId: 0, title: '', blocked: [], originalBlocked: [], monthOffset: 0 };

function _isoDate(d) {
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function _parseIso(iso) {
  // Lokales Datum (kein UTC-Drift) — wichtig fürs Kalenderraster.
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  var p = iso.split('-');
  return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
}

function getCachedAvailability(listingId, maxAgeMs) {
  if (!listingId) return Promise.resolve({ blockedDates: [], availableWeekdays: [] });
  var cached = _availabilityCache[listingId];
  var max = (typeof maxAgeMs === 'number') ? maxAgeMs : 60000;
  if (cached && (Date.now() - cached.ts) < max) {
    return Promise.resolve({
      blockedDates: cached.blockedDates.slice(),
      availableWeekdays: cached.availableWeekdays.slice()
    });
  }
  return fetch(_apiUrl('listings/' + listingId + '/availability'), {
    credentials: 'same-origin',
    headers: _apiHeaders()
  })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(data) {
      if (!data) return { blockedDates: [], availableWeekdays: [] };
      _availabilityCache[listingId] = {
        ts: Date.now(),
        blockedDates: Array.isArray(data.blockedDates) ? data.blockedDates : [],
        availableWeekdays: Array.isArray(data.availableWeekdays) ? data.availableWeekdays : []
      };
      return {
        blockedDates: _availabilityCache[listingId].blockedDates.slice(),
        availableWeekdays: _availabilityCache[listingId].availableWeekdays.slice()
      };
    })
    .catch(function() { return { blockedDates: [], availableWeekdays: [] }; });
}
window.getCachedAvailability = getCachedAvailability;

function openAvailabilityModal(listingId) {
  if (!isLoggedIn) { showToast('Bitte zuerst anmelden.', 'warning'); openModal('loginModal'); return; }
  if (!listingId) return;

  // Listing-Titel aus der Liste holen (Cache aus _mergeDbListingsIntoCache).
  var title = '';
  try {
    var hit = (LISTINGS || []).find(function(l) { return l && (l._dbId === listingId || l.id === listingId); });
    if (hit) title = hit.title || '';
  } catch (e) {}
  var titleEl = document.getElementById('availabilityListingTitle');
  if (titleEl) titleEl.textContent = title || ('Inserat #' + listingId);

  _availabilityState.listingId = listingId;
  _availabilityState.title = title;
  _availabilityState.blocked = [];
  _availabilityState.originalBlocked = [];
  _availabilityState.monthOffset = 0;

  openModal('availabilityModal');

  // Lade aktuelle Daten frisch (kein Cache, damit der Anbieter den realen Stand sieht).
  delete _availabilityCache[listingId];
  fetch(_apiUrl('listings/' + listingId + '/availability'), {
    credentials: 'same-origin', headers: _apiHeaders()
  })
    .then(function(r) { return r.ok ? r.json() : { blockedDates: [] }; })
    .then(function(data) {
      var blocked = Array.isArray(data && data.blockedDates) ? data.blockedDates : [];
      _availabilityState.blocked = blocked.slice();
      _availabilityState.originalBlocked = blocked.slice();
      _availabilityCache[listingId] = {
        ts: Date.now(),
        blockedDates: blocked.slice(),
        availableWeekdays: Array.isArray(data && data.availableWeekdays) ? data.availableWeekdays : []
      };
      renderAvailabilityCalendar();
    })
    .catch(function() { renderAvailabilityCalendar(); });
}
window.openAvailabilityModal = openAvailabilityModal;

function renderAvailabilityCalendar() {
  var host = document.getElementById('availabilityCal');
  if (!host) return;

  var today = new Date(); today.setHours(0, 0, 0, 0);
  var startMonth = new Date(today.getFullYear(), today.getMonth() + (_availabilityState.monthOffset | 0), 1);

  function monthHtml(monthDate) {
    var year = monthDate.getFullYear();
    var month = monthDate.getMonth();
    var firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Mo=0 … So=6
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var monthNames = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

    var cells = '';
    for (var i = 0; i < firstDow; i++) cells += '<span class="ac-cell ac-blank"></span>';
    for (var d = 1; d <= daysInMonth; d++) {
      var dt = new Date(year, month, d);
      var iso = _isoDate(dt);
      var isPast = dt < today;
      var isBlocked = _availabilityState.blocked.indexOf(iso) !== -1;
      var classes = ['ac-cell', 'ac-day'];
      if (isPast) classes.push('ac-past');
      if (isBlocked) classes.push('ac-blocked');
      if (dt.getTime() === today.getTime()) classes.push('ac-today');
      cells += '<button type="button" class="' + classes.join(' ') + '"' +
        (isPast ? ' disabled aria-disabled="true"' : ' onclick="toggleAvailabilityDate(\'' + iso + '\')"') +
        ' data-iso="' + iso + '"' +
        ' aria-pressed="' + (isBlocked ? 'true' : 'false') + '"' +
        ' aria-label="' + d + '. ' + monthNames[month] + ' ' + year + (isBlocked ? ' (geblockt)' : ' (verfügbar)') + '">' +
        d +
        '</button>';
    }
    return '<div class="ac-month">' +
      '<div class="ac-month-title">' + monthNames[month] + ' ' + year + '</div>' +
      '<div class="ac-dow"><span>Mo</span><span>Di</span><span>Mi</span><span>Do</span><span>Fr</span><span>Sa</span><span>So</span></div>' +
      '<div class="ac-grid">' + cells + '</div>' +
      '</div>';
  }

  var nextMonth = new Date(startMonth.getFullYear(), startMonth.getMonth() + 1, 1);
  host.innerHTML =
    '<div class="ac-nav">' +
      '<button type="button" class="ac-nav-btn"' + (_availabilityState.monthOffset <= 0 ? ' disabled' : '') + ' onclick="_availabilityMonthShift(-1)" aria-label="Vorheriger Monat"><span class="material-icons-round">chevron_left</span></button>' +
      '<button type="button" class="ac-nav-btn" onclick="_availabilityMonthShift(1)" aria-label="Nächster Monat"><span class="material-icons-round">chevron_right</span></button>' +
    '</div>' +
    '<div class="ac-months">' + monthHtml(startMonth) + monthHtml(nextMonth) + '</div>';

  var sum = document.getElementById('availabilitySummary');
  if (sum) {
    var n = _availabilityState.blocked.filter(function(iso) {
      var d = _parseIso(iso); return d && d >= today;
    }).length;
    sum.textContent = n === 0
      ? 'Keine Tage geblockt – alle Termine offen.'
      : n + (n === 1 ? ' Tag geblockt.' : ' Tage geblockt.');
  }
}
window.renderAvailabilityCalendar = renderAvailabilityCalendar;

function _availabilityMonthShift(dir) {
  _availabilityState.monthOffset = Math.max(0, (_availabilityState.monthOffset | 0) + (dir < 0 ? -1 : 1));
  renderAvailabilityCalendar();
}
window._availabilityMonthShift = _availabilityMonthShift;

function toggleAvailabilityDate(iso) {
  if (!iso) return;
  var idx = _availabilityState.blocked.indexOf(iso);
  if (idx === -1) _availabilityState.blocked.push(iso);
  else _availabilityState.blocked.splice(idx, 1);
  _availabilityState.blocked.sort();
  renderAvailabilityCalendar();
}
window.toggleAvailabilityDate = toggleAvailabilityDate;

function resetAvailabilityBlocks() {
  _availabilityState.blocked = [];
  renderAvailabilityCalendar();
}
window.resetAvailabilityBlocks = resetAvailabilityBlocks;

function saveAvailabilityBlocks() {
  var listingId = _availabilityState.listingId;
  if (!listingId) { closeModal('availabilityModal'); return; }
  var btn = document.getElementById('availabilitySaveBtn');
  if (btn) { btn.disabled = true; btn.dataset._html = btn.innerHTML; btn.innerHTML = '<span class="material-icons-round spin">progress_activity</span> Speichern…'; }

  fetch(_apiUrl('listings/' + listingId + '/availability'), {
    method: 'PUT',
    credentials: 'same-origin',
    headers: _apiHeaders(),
    body: JSON.stringify({ blockedDates: _availabilityState.blocked })
  })
    .then(function(r) {
      if (!r.ok) throw new Error('save failed');
      return r.json();
    })
    .then(function(data) {
      var blocked = Array.isArray(data && data.blockedDates) ? data.blockedDates : _availabilityState.blocked;
      _availabilityCache[listingId] = {
        ts: Date.now(),
        blockedDates: blocked.slice(),
        availableWeekdays: (_availabilityCache[listingId] && _availabilityCache[listingId].availableWeekdays) || []
      };
      _availabilityState.originalBlocked = blocked.slice();
      showToast('Verfügbarkeit gespeichert.', 'event_available');
      closeModal('availabilityModal');
    })
    .catch(function() {
      showToast('Speichern fehlgeschlagen. Bitte erneut versuchen.', 'error');
    })
    .finally(function() {
      if (btn) { btn.disabled = false; if (btn.dataset._html) btn.innerHTML = btn.dataset._html; }
    });
}
window.saveAvailabilityBlocks = saveAvailabilityBlocks;

/**
 * Wendet die Verfügbarkeit eines Listings auf der Detailseite an:
 *  - markiert geblockte Tage im Flatpickr-Datumsfeld als nicht wählbar (rot)
 *  - re-rendert die Sofortbuchung mit aktuellen blockedDates
 * Wird nach loadDetail() aufgerufen. Ruft `getCachedAvailability()` auf,
 * um per HTTP frisch (oder aus 60s-Cache) zu lesen.
 */
function _applyAvailabilityToDetail(listing) {
  if (!listing) return;
  var listingId = listing._dbId || listing.id;
  if (!listingId) return;

  getCachedAvailability(listingId, 60000).then(function(av) {
    var blocked = (av && Array.isArray(av.blockedDates)) ? av.blockedDates : [];
    // Auf currentListing spiegeln, damit andere Render-Pfade den State haben.
    if (currentListing && (currentListing._dbId === listingId || currentListing.id === listingId)) {
      currentListing.blockedDates = blocked.slice();
    }

    // Flatpickr: geblockte Tage als disable-Array setzen.
    var bookingDateEl = document.getElementById('bookingDate');
    if (bookingDateEl && bookingDateEl._flatpickr) {
      try { bookingDateEl._flatpickr.set('disable', blocked.slice()); } catch (e) {}
    }

    // Sofortbuchung neu rendern, damit Slots ohne geblockte Tage erscheinen.
    if (listing.instantBook) {
      _renderInstantBookSection(Object.assign({}, listing, { blockedDates: blocked }));
    }
  });
}
window._applyAvailabilityToDetail = _applyAvailabilityToDetail;

/* ─── Sofortbuchung (Direkt-Buchung) auf Detailseite ─────── */
function _renderInstantBookSection(listing) {
  // Existing Element entfernen (re-render bei jeder loadDetail)
  var existing = document.getElementById('instantBookSection');
  if (existing) existing.remove();

  if (!listing || !listing.instantBook) return;
  var wd = (listing.availableWeekdays || []).map(Number).filter(function(d){ return d>=0 && d<=6; });
  if (wd.length === 0) return;

  // Anker: vor dem "Anfragen"-Button im bookingCard
  var bookingForm = document.querySelector('#page-detail .booking-card .booking-form');
  if (!bookingForm) return;

  // Geblockte Einzeltermine (vom Anbieter im Verfügbarkeits-Modal gepflegt).
  var blockedSet = (function() {
    var arr = (listing.blockedDates || []).filter(function(d) { return /^\d{4}-\d{2}-\d{2}$/.test(d); });
    var s = Object.create(null);
    arr.forEach(function(d) { s[d] = true; });
    return s;
  })();

  // Nächste 12 freie Termine berechnen (ab morgen, geblockte Tage überspringen)
  var today = new Date(); today.setHours(0,0,0,0);
  var slots = [];
  for (var i = 1; slots.length < 12 && i < 120; i++) {
    var d = new Date(today.getTime() + i*86400000);
    if (wd.indexOf(d.getDay()) === -1) continue;
    var iso = _isoDate(d);
    if (blockedSet[iso]) continue;
    slots.push(d);
  }
  if (slots.length === 0) return;

  var price = parseFloat(listing.price) || 0;
  var timeFrom = listing.timeFrom || '';
  var dayNames = ['So','Mo','Di','Mi','Do','Fr','Sa'];
  var monthNames = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];

  var pills = slots.map(function(d, idx) {
    var iso = d.toISOString().slice(0,10);
    return '<button type="button" class="instant-slot" data-iso="' + iso + '" data-idx="' + idx + '">' +
      '<span class="is-dow">' + dayNames[d.getDay()] + '</span>' +
      '<span class="is-day">' + d.getDate() + '</span>' +
      '<span class="is-mon">' + monthNames[d.getMonth()] + '</span>' +
    '</button>';
  }).join('');

  var html =
    '<div class="instant-book-section" id="instantBookSection">' +
      '<div class="ib-head">' +
        '<span class="material-icons-round ib-bolt">bolt</span>' +
        '<div>' +
          '<strong>Sofortbuchung</strong>' +
          '<small>Freien Termin w\u00e4hlen \u00b7 direkt bezahlen \u00b7 Buchung best\u00e4tigt</small>' +
        '</div>' +
      '</div>' +
      '<div class="ib-slots">' + pills + '</div>' +
      '<div class="ib-meta">' +
        (timeFrom ? '<span><span class="material-icons-round">schedule</span> ab ' + _escHtml(timeFrom) + ' Uhr</span>' : '') +
        (listing.duration ? '<span><span class="material-icons-round">hourglass_top</span> ' + listing.duration + ' Std.</span>' : '') +
        '<span><span class="material-icons-round">euro</span> ' + _formatEuro(price) + '</span>' +
      '</div>' +
      '<button type="button" class="btn-primary btn-block ib-pay-btn" id="ibPayBtn" disabled>' +
        '<span class="material-icons-round">lock</span> Termin w\u00e4hlen' +
      '</button>' +
      '<p class="ib-note"><span class="material-icons-round">verified_user</span> Sichere Zahlung via Stripe \u00b7 sofortige Best\u00e4tigung</p>' +
    '</div>';

  bookingForm.insertAdjacentHTML('beforebegin', html);

  var section = document.getElementById('instantBookSection');
  var payBtn = section.querySelector('#ibPayBtn');
  var selectedIso = null;

  section.querySelectorAll('.instant-slot').forEach(function(btn) {
    btn.addEventListener('click', function() {
      section.querySelectorAll('.instant-slot').forEach(function(b){ b.classList.remove('selected'); });
      btn.classList.add('selected');
      selectedIso = btn.getAttribute('data-iso');
      payBtn.disabled = false;
      var dt = new Date(selectedIso);
      var human = dayNames[dt.getDay()] + ', ' + dt.getDate() + '. ' + monthNames[dt.getMonth()] + ' ' + dt.getFullYear();
      payBtn.innerHTML = '<span class="material-icons-round">lock</span> ' + human + ' \u00b7 ' + _formatEuro(price) + ' buchen';
    });
  });

  payBtn.addEventListener('click', function() {
    if (!selectedIso) return;
    if (!currentUser) { openModal('loginModal'); return; }
    _startInstantBooking(listing, selectedIso, price);
  });
}

function _startInstantBooking(listing, dateIso, amount) {
  if (!amount || amount <= 0) {
    showToast('F\u00fcr dieses Inserat ist kein g\u00fcltiger Preis hinterlegt.', 'warning');
    return;
  }
  var dateHuman = (function(){
    try { var d = new Date(dateIso); return d.toLocaleDateString('de-DE', { weekday:'long', day:'numeric', month:'long', year:'numeric' }); }
    catch(e) { return dateIso; }
  })();
  var listingId = listing._dbId || listing.id;

  // Buchungsdaten, die onSuccess UND die Redirect-Rückkehr brauchen.
  var info = {
    listingId: listingId,
    title: listing.title || 'Direktbuchung',
    category: listing.categoryLabel || listing.category || '',
    image: listing.image || (listing.images && listing.images[0]) || '',
    providerImg: listing.providerImg || listing.image || '',
    provider: listing.providerName || '',
    providerId: listing.providerId || 0,
    amount: amount,
    dateIso: dateIso,
    dateHuman: dateHuman
  };
  // Redirect-fest machen: vor dem Bezahlen persistieren.
  _setPendingPayment({ type: 'instant', info: info });

  _openStripePaymentModal({
    amount: amount,
    title: (listing.title || 'Direktbuchung') + ' \u00b7 ' + dateHuman,
    listingId: listingId,
    image: listing.image || (listing.images && listing.images[0]) || listing.providerImg || '',
    provider: listing.providerName || '',
    category: listing.categoryLabel || listing.category || '',
    duration: listing.duration || '',
    dateLabel: dateHuman,
    instant: true,
    onSuccess: function(res) {
      var r = _applyInstantBookingSuccess(info, res);
      _clearPendingPayment();
      _showBookingSuccess({ projectId: r && r.project && r.project.id, amount: info.amount, title: info.title, dateHuman: info.dateHuman, providerName: info.provider });
    },
    onCancel: function() {
      _clearPendingPayment();
      showToast('Zahlung abgebrochen.', 'info');
    }
  });
}
window._startInstantBooking = _startInstantBooking;

function openSelectBoardProjectModal(listing) {
  var rows = _boardProjects.map(function(p) {
    var cnt = (p.cards || []).length;
    var dateStr = p.date ? ' \u00b7 ' + _escHtml(p.date) : '';
    return '<button type="button" class="bsp-row" onclick="_addListingToBoardProject(window._pendingBoardListing,\'' + p.id + '\');document.getElementById(\'selectBoardProjectModal\').remove()">' +
      '<span class="material-icons-round" style="color:var(--primary);font-size:22px">event</span>' +
      '<span class="bsp-info"><strong>' + _escHtml(p.name) + '</strong>' +
        '<small>' + cnt + ' Dienstleister' + dateStr + '</small></span>' +
      '<span class="material-icons-round bsp-arrow">chevron_right</span>' +
    '</button>';
  }).join('');

  window._pendingBoardListing = listing;
  var title = (listing && (listing.title || listing.name)) || 'Dienstleister';
  var html = '<div class="modal-overlay show" id="selectBoardProjectModal" onclick="closeModalOnOverlay(event)" style="z-index:2000">' +
    '<div class="modal modal-sm" onclick="event.stopPropagation()">' +
      '<button class="modal-close" aria-label="Schließen" onclick="document.getElementById(\'selectBoardProjectModal\').remove()"><span class="material-icons-round">close</span></button>' +
      '<div class="modal-header"><span class="material-icons-round modal-icon">view_kanban</span><h2>Wohin damit?</h2>' +
        '<p>' + _escHtml(title) + ' zu deinem Planungs-Board hinzuf\u00fcgen.</p></div>' +
      '<button class="bsp-row bsp-row-new" type="button" onclick="window._pendingBoardListing=null;document.getElementById(\'selectBoardProjectModal\').remove();openCreateBoardModal()">' +
        '<span class="material-icons-round" style="color:var(--primary);font-size:22px">add_circle</span>' +
        '<span class="bsp-info"><strong>Neues Projekt erstellen</strong><small>Frisches Board f\u00fcr dieses Event</small></span>' +
        '<span class="material-icons-round bsp-arrow">chevron_right</span>' +
      '</button>' +
      (rows ? '<div class="bsp-divider"><span>oder zu vorhandenem Projekt</span></div><div class="bsp-list">' + rows + '</div>' : '') +
    '</div>' +
  '</div>';
  document.body.insertAdjacentHTML('beforeend', html);
}

function _addListingToBoardProject(listing, projectId) {
  var project = _boardProjects.find(function(p){ return p.id === projectId; });
  if (!project) return;
  var now = Date.now();
  var card = {
    id: 'bc_' + now,
    name: (listing && (listing.providerName || listing.title)) || 'Dienstleister',
    category: (listing && (listing.categoryLabel || listing.category)) || '',
    stage: 'geplant',
    price: (listing && listing.price) || 0,
    listingId: listing && listing.id,
    avatar: (listing && (listing.providerImg || listing.image)) || '',
    note: '',
    createdAt: new Date().toISOString()
  };
  project.cards = project.cards || [];
  project.cards.push(card);
  _saveBoardProjects();
  var name = card.name;
  var projName = project.name;
  showToast('\u201e' + name + '\u201c zu \u201e' + projName + '\u201c hinzugef\u00fcgt!', 'check_circle');
  window._pendingBoardListing = null;
  // Offer to navigate to board
  setTimeout(function() {
    showToast('Board ansehen?', 'view_kanban', function(){ navigateTo('board'); openBoardProject(projectId); });
  }, 1200);
}
window._addListingToBoardProject = _addListingToBoardProject;
window.acceptAuftragProvider = acceptAuftragProvider;
window.acceptAuftragRemote   = acceptAuftragRemote;
window.confirmAuftragProvider = confirmAuftragProvider;
window.confirmAuftragRemote   = confirmAuftragRemote;

// Hook: after project creation, check if we have a pending listing to add
var _origCreateBoardProject = _createBoardProject;
// The hook is handled inline inside openBoardProject after navigation.

/* ─── Board Checklist ─────────────────────────────────────── */
var _CHECKLIST_TEMPLATES = {
  wedding: [
    'Location buchen', 'Fotograf anfragen', 'DJ / Band buchen', 'Catering auswählen',
    'Floristik beauftragen', 'Einladungen versenden', 'Sitzordnung erstellen',
    'Hochzeitstorte bestellen', 'Ringe kaufen', 'Standesamt anmelden',
    'Hotel für Gäste organisieren', 'Musik-Playlist absprechen',
    'Zeitplan für den Tag erstellen', 'Brautkleid / Anzug besorgen',
    'Honeymoon buchen', 'Tag-Koordinator bestätigen'
  ],
  birthday: [
    'Location buchen', 'Einladungen versenden', 'Catering planen',
    'DJ / Musik buchen', 'Dekoration besorgen', 'Kuchen bestellen',
    'Fotograf anfragen', 'Programm planen', 'Gästeanzahl bestätigen'
  ],
  corporate: [
    'Location / Meetingraum buchen', 'Catering beauftragen', 'Technik / AV prüfen',
    'Moderation bestätigen', 'Agenda erstellen', 'Einladungen / Tickets versenden',
    'Fotograf / Videograf buchen', 'Parkplatzsituation klären',
    'Namensschilder vorbereiten', 'Nachberichterstattung planen'
  ],
  festival: [
    'Venue / Gelände sichern', 'Bühnentechnik bestellen', 'Line-up finalisieren',
    'Catering-Stände anfragen', 'Sicherheitsdienst buchen', 'Toiletten organisieren',
    'Strom- und Wasserversorgung prüfen', 'Ticketing einrichten',
    'Marketing starten', 'Erste-Hilfe-Posten einplanen'
  ],
  conference: [
    'Location buchen', 'Sprecher bestätigen', 'Catering planen',
    'Technik / Livestream prüfen', 'Agenda veröffentlichen', 'Tickets / Anmeldung einrichten',
    'Fotograf buchen', 'Rahmenprogramm planen', 'Fahrtinfos versenden'
  ],
  baptism: ['Location reservieren', 'Catering planen', 'Einladungen versenden',
    'Fotograf buchen', 'Floristik bestellen', 'Zeitplan erstellen'],
  kids: ['Location buchen', 'Einladungen versenden', 'Catering / Kuchen', 'Animation buchen',
    'Dekoration besorgen', 'Spieleprogramm planen'],
  private: ['Einladungen versenden', 'Catering planen', 'Musik / DJ buchen',
    'Dekoration besorgen', 'Getränke organisieren'],
  custom: ['Dienstleister recherchieren', 'Budget festlegen', 'Zeitplan erstellen',
    'Einladungen versenden', 'Ablauf am Eventtag planen']
};

function _getProjectChecklist(project) {
  // Echte (gespeicherte) Checkliste – nur das, was der Nutzer aktiv hinzugefügt hat.
  if (!project) return [];
  var saved = Array.isArray(project.checklist) ? project.checklist : [];
  return saved.filter(function(it){ return it && it.text; });
}
