// ========== CHAT / MESSAGES ==========
function updateMsgBadge(count) {
  var badge = document.getElementById('msgBadge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = 'flex';
  } else {
    badge.textContent = '';
    badge.style.display = 'none';
  }
}

// ──── Heartbeat: send alive signal every 30s ────
var _heartbeatTimer = null;
function _startHeartbeat() {
  _stopHeartbeat();
  _sendHeartbeat();
  _heartbeatTimer = setInterval(_sendHeartbeat, 30000);
  // Send offline beacon when leaving the page
  window.addEventListener('beforeunload', _sendOfflineBeacon);
}
function _stopHeartbeat() {
  if (_heartbeatTimer) { clearInterval(_heartbeatTimer); _heartbeatTimer = null; }
  window.removeEventListener('beforeunload', _sendOfflineBeacon);
}
function _sendHeartbeat() {
  if (!isLoggedIn) return;
  if (document.hidden) return; // #8: kein Heartbeat bei Hintergrund-Tab
  fetch(_apiUrl('heartbeat'), { method: 'POST', credentials: 'same-origin', headers: _apiHeaders() }).catch(function(){});
}
function _sendOfflineBeacon() {
  var url = _apiUrl('offline');
  if (_wpNonce) url += (url.indexOf('?') === -1 ? '?' : '&') + '_wpnonce=' + encodeURIComponent(_wpNonce);
  if (navigator.sendBeacon) {
    var blob = new Blob([JSON.stringify({})], { type: 'application/json' });
    navigator.sendBeacon(url, blob);
  }
}

// ──── Inactivity auto-logout (15 min) ────
// Uses timestamp comparison instead of raw setTimeout so that
// Safari (which freezes timers when tabs are backgrounded) doesn't
// fire the callback immediately after the tab is foregrounded.
var _inactivityTimer = null;
var _lastActivity = 0;
var _INACTIVITY_MS = 15 * 60 * 1000;
var _INACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
var _inactivityAttached = false;

function _touchActivity() {
  _lastActivity = Date.now();
}

function _checkInactivity() {
  if (!isLoggedIn) return;
  var elapsed = Date.now() - _lastActivity;
  if (elapsed >= _INACTIVITY_MS) {
    logout();
    showToast('Du wurdest wegen Inaktivität abgemeldet.', 'timer_off');
  }
}

function _onInactivityVisibility() {
  if (!document.hidden) _checkInactivity();
}

function _startInactivityWatch() {
  _touchActivity();
  if (!_inactivityAttached) {
    _INACTIVITY_EVENTS.forEach(function(evt) {
      document.addEventListener(evt, _touchActivity, { passive: true });
    });
    document.addEventListener('visibilitychange', _onInactivityVisibility);
    _inactivityAttached = true;
  }
  if (_inactivityTimer) clearInterval(_inactivityTimer);
  _inactivityTimer = setInterval(_checkInactivity, 30000);
}

function _stopInactivityWatch() {
  if (_inactivityTimer) { clearInterval(_inactivityTimer); _inactivityTimer = null; }
  if (_inactivityAttached) {
    _INACTIVITY_EVENTS.forEach(function(evt) {
      document.removeEventListener(evt, _touchActivity);
    });
    document.removeEventListener('visibilitychange', _onInactivityVisibility);
    _inactivityAttached = false;
  }
}

// ──── Update chat header online/offline status ────
function _updateChatStatus(userId) {
  if (!userId) return;
  fetch(_apiUrl('user-status/' + userId), { credentials: 'same-origin', headers: _apiHeaders() })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var el = document.getElementById('chatStatus');
      if (!el) return;
      var on = data && data.online;
      el.textContent = on ? 'Online' : 'Offline';
      el.className = on ? 'chat-status online' : 'chat-status offline';
    })
    .catch(function(){});
}

// Live polling for new messages
var _chatPollTimer = null;
var _CHAT_POLL_BASE = 5000;
var _CHAT_POLL_CAP = 20000;
var _chatPollDelay = _CHAT_POLL_BASE;
function _scheduleChatPoll() {
  _chatPollTimer = setTimeout(_chatPollTick, _chatPollDelay);
}
function _startChatPoll() {
  _stopChatPoll();
  _chatPollDelay = _CHAT_POLL_BASE;
  _scheduleChatPoll();
}
function _chatPollTick() {
  if (!currentChat || !currentChat.id) { _stopChatPoll(); return; }
  if (document.hidden) { _chatPollTimer = null; return; } // Hidden-Pause: kein Fetch/Reschedule
    // Also refresh online status of chat partner
    if (currentChat.otherId) _updateChatStatus(currentChat.otherId);
    var _q = currentChat._cursor ? ('?since=' + encodeURIComponent(currentChat._cursor)) : '';
    fetch(_apiUrl('conversations/' + currentChat.id + '/messages' + _q), { credentials: 'same-origin', headers: _apiHeaders() })
      .then(function(r) { var _cur = r.headers.get('X-EB-Cursor'); var _typ = r.headers.get('X-EB-Partner-Typing'); return r.json().then(function(m){ return { delta: m, cursor: _cur, typing: _typ }; }); })
      .then(function(res) {
        if (!currentChat) return;
        var delta = (res && res.delta) || [];
        if (res && res.cursor) currentChat._cursor = res.cursor;
        // #8 inkrementell: Delta per ID in die volle Liste mergen (Upsert: ersetzen/anhängen)
        if (!Array.isArray(currentChat.messages)) currentChat.messages = [];
        if (delta.length) {
          var _byId = {}; currentChat.messages.forEach(function(m){ if (m) _byId[m.id] = m; });
          delta.forEach(function(m){ if (m) _byId[m.id] = m; });
          currentChat.messages = Object.keys(_byId).map(function(k){ return _byId[k]; })
            .sort(function(a,b){ return (a.created_at || '') < (b.created_at || '') ? -1 : 1; });
        }
        var messages = currentChat.messages;
        var hadDelta = delta.length > 0;
        if (res.typing === '1') { _showTypingIndicator(); _chatPollDelay = _CHAT_POLL_BASE; }
        else { _hideTypingIndicator(); }
        // #8 Backoff: neue/geänderte Nachricht → schnelle Basis, sonst Intervall erhöhen (Cap 20s)
        if (hadDelta) { _chatPollDelay = _CHAT_POLL_BASE; }
        else { _chatPollDelay = Math.min(Math.round(_chatPollDelay * 1.6), _CHAT_POLL_CAP); }
        // Always keep negotiation banner in sync
        var lastPendingOffer = null;
        (messages || []).forEach(function(msg) {
          if (msg.type === 'offer' && msg.status === 'pending' && msg.label !== 'Dein Angebot') {
            lastPendingOffer = msg;
          }
        });
        // FIX 2026-05: Null-Safe – wenn Banner-Elemente nicht (mehr) im DOM sind,
        // weiter machen, statt mit TypeError zu crashen.
        var banner = document.getElementById('negotiationBanner');
        var negDetails = document.getElementById('negDetails');
        if (banner) {
          if (lastPendingOffer) {
            if (negDetails) negDetails.textContent = lastPendingOffer.label + ': ' + lastPendingOffer.amount;
            banner.style.display = 'flex';
            banner.dataset.offerId = lastPendingOffer.id;
          } else {
            banner.style.display = 'none';
          }
        }
        // FIX 2026-05: Sidebar nur bei tatsächlichen Änderungen neu rendern –
        // vorher wurde alle 5 Sek. das gesamte Chat-Listen-DOM neu gebaut, was
        // auf Mobilgeräten Scroll-Position & Touch-Selektionen zerstörte.
        if (hadDelta) {
          renderChatList();
        }
        if (!hadDelta) return;
        // New messages arrived — check for board updates (acceptance/rejection)
        _checkBoardUpdatesFromMessages(messages || []);
        // Update display
        currentChat.messages = messages;
        var msgContainer = document.getElementById('chatMessages');
        var wasAtBottom = msgContainer.scrollHeight - msgContainer.scrollTop - msgContainer.clientHeight < 80;
        window._cbcCancelled = _collectCancelledProjectNames(messages);
        msgContainer.innerHTML = (messages || []).map(function(msg) {
          if (msg.msg_type === 'deleted' || msg.deleted) {
            var delCls = msg.type === 'sent' ? 'msg-sent' : 'msg-received';
            return '<div class="msg ' + delCls + ' msg-deleted"><span class="material-icons-round">block</span> Nachricht wurde gelöscht</div>';
          }
          if (msg.type === 'system') {
            return '<div class="msg msg-system">' + _escHtml(msg.text || msg.content || '') + '</div>';
          } else if (msg.type === 'offer') {
            return _renderOfferMsg(msg);
          } else if (msg.type === 'booking' || _isBookingContent(msg.text || msg.content)) {
            return _renderBookingCard(msg);
          } else if (_isStatusMessage(msg.text || msg.content)) {
            return '<div class="msg msg-system">' + _escHtml(msg.text || msg.content || '') + '</div>';
          } else if (msg.msg_type === 'image' || msg.type === 'image') {
            return _renderChatImageMsg(msg);
          } else {
            var cls = msg.type === 'sent' ? 'msg-sent' : 'msg-received';
            var time = msg.time || '';
            var delBtn = '';
            if (msg.id) {
              if (msg.type === 'sent') {
                delBtn = '<button class="msg-delete-btn" title="Nachricht löschen" aria-label="Nachricht löschen" onclick="deleteChatMessage(' + msg.id + ')"><span class="material-icons-round">delete</span></button>';
              } else if (msg.type === 'received') {
                delBtn = '<button class="msg-delete-btn" title="Für mich löschen" aria-label="Für mich löschen" onclick="hideMessageForMe(' + msg.id + ')"><span class="material-icons-round">delete</span></button>';
              }
            }
            return '<div class="msg ' + cls + '">' + delBtn + _escHtml(msg.text || msg.content || '') + '<span class="msg-time">' + _escHtml(time) + '</span></div>';
          }
        }).join('');
        if (wasAtBottom) setTimeout(function() { msgContainer.scrollTop = msgContainer.scrollHeight; }, 50);
      })
      .catch(function(err) {
        // FIX 2026-05: Chat-Poll-Fehler werden in DevTools-Konsole sichtbar,
        // statt komplett geschluckt zu werden.  Kein UI-Toast, weil das
        // Polling weiter läuft und der nächste Tick es typischerweise löst.
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[eventboerse] chat-poll fehlgeschlagen:', err && err.message ? err.message : err);
        }
      })
      .catch(function(){})
      .then(_scheduleChatPoll);
}
function _stopChatPoll() {
  if (_chatPollTimer) { clearTimeout(_chatPollTimer); _chatPollTimer = null; }
}
// #8: Tab wieder sichtbar → wenn Chat-Poll pausiert war, sofort pollen + Backoff-Reset
document.addEventListener('visibilitychange', function() {
  if (!document.hidden && currentChat && currentChat.id && _chatPollTimer === null) {
    _chatPollDelay = _CHAT_POLL_BASE;
    _chatPollTick();
  }
});

function _isBookingContent(text) {
  if (!text) return false;
  try {
    var d = JSON.parse(text);
    if (d && (d.listing || d.kind === 'inquiry_accepted' || d.kind === 'inquiry_rejected' || d.kind === 'inquiry_cancelled')) return true;
  } catch(e) {}
  if (/^Anfrage\n/.test(text)) return true;
  return false;
}

function _isStatusMessage(text) {
  if (!text) return false;
  return /Angebot\s+.{1,30}\s+(zur\u00fcckgezogen|angenommen|abgelehnt)/i.test(text);
}

function _parseOldBookingText(raw) {
  var lines = raw.split('\n');
  var data = {};
  lines.forEach(function(line) {
    var m;
    if ((m = line.match(/^Listing:\s*(.+)/))) data.listing = m[1];
    else if ((m = line.match(/^Datum:\s*(.+)/))) data.date = m[1];
    else if ((m = line.match(/^Event-Typ:\s*(.+)/))) data.eventType = m[1];
    else if ((m = line.match(/^Gäste:\s*(.+)/))) data.guests = m[1];
    else if ((m = line.match(/^Preis:\s*(.+)/))) data.price = m[1];
    else if ((m = line.match(/^Nachricht:\s*(.+)/))) data.message = m[1];
  });
  return data.listing ? data : null;
}

// Scan all messages in a conversation and return a map of project names
// whose inquiry was cancelled via a structured 'inquiry_cancelled' message.
// Used by _renderBookingCard to flip matching inquiry cards into a
// "storniert" state on both sides without any server-side schema changes.
function _collectCancelledProjectNames(messages) {
  var out = {};
  (messages || []).forEach(function(m) {
    var raw = m.text || m.content || '';
    if (!raw || raw.charAt(0) !== '{') return;
    try {
      var d = JSON.parse(raw);
      if (d && d.kind === 'inquiry_cancelled') {
        var key = (d.projectName || '') + '|' + (d.listing || '');
        out[key] = 1;
        if (d.projectName) out[d.projectName] = 1;
      }
    } catch (e) {}
  });
  return out;
}

function _renderChatImageMsg(msg) {
  var cls = msg.type === 'sent' ? 'msg-sent' : 'msg-received';
  var url = msg.text || msg.content || '';
  var time = msg.time || '';
  return '<div class="msg ' + cls + ' chat-img-msg">' +
    '<img class="chat-image" src="' + _escHtml(url) + '" alt="Bild" loading="lazy" decoding="async" onclick="openChatImage(\'' + _escHtml(url) + '\')" />' +
    '<span class="msg-time">' + _escHtml(time) + '</span></div>';
}
function openChatImage(url) {
  if (typeof _galleryLightboxImages !== 'undefined') { _galleryLightboxImages = [url]; _galleryLightboxIndex = 0; }
  var img = document.getElementById('galleryLightboxImg'); if (img) img.src = url;
  var c = document.getElementById('galleryLightboxCounter'); if (c) c.textContent = '1 / 1';
  var lb = document.getElementById('galleryLightbox'); if (lb) lb.classList.add('show');
}
function _renderBookingCard(msg) {
  var raw = msg.text || msg.content || '';
  var side = msg.type === 'sent' ? 'sent' : 'received';
  var time = msg.time || '';
  var data;
  try { data = JSON.parse(raw); } catch (e) { data = null; }
  if (!data) data = _parseOldBookingText(raw);

  // Acceptance/rejection cards
  if (data && (data.kind === 'inquiry_accepted' || data.kind === 'inquiry_rejected')) {
    var isAccepted = data.kind === 'inquiry_accepted';
    var clr = isAccepted ? '#66bb6a' : '#FF5252';
    var icon = isAccepted ? 'check_circle' : 'cancel';
    var label = isAccepted
      ? (side === 'sent' ? 'Du hast die Anfrage angenommen' : 'Anbieter hat angenommen – Jetzt buchen!')
      : (side === 'sent' ? 'Du hast die Anfrage abgelehnt' : 'Anbieter hat die Anfrage leider abgelehnt');
    var sysLabel = isAccepted ? 'Anfrage angenommen' : 'Anfrage abgelehnt';
    return '<div class="cbc cbc-' + side + ' cbc-status-msg">' +
      '<div class="cbc-sysbar" style="background:' + clr + ';"><span class="material-icons-round">' + icon + '</span> ' + sysLabel + '</div>' +
      '<div class="cbc-content">' +
        '<div class="cbc-status" style="color:' + clr + ';"><span class="material-icons-round">' + icon + '</span> ' + _escHtml(label) + '</div>' +
      '</div>' +
      (time ? '<span class="cbc-ts">' + _escHtml(time) + '</span>' : '') +
    '</div>';
  }

  // Storno-Karte (kompakt)
  // gesendet und auf beiden Seiten als Info-Banner angezeigt.
  if (data && data.kind === 'inquiry_cancelled') {
    var introCancel = side === 'sent'
      ? 'Du hast das Projekt geschlossen'
      : 'Projekt wurde vom Kunden geschlossen';
    var html2 = '<div class="cbc cbc-' + side + ' cbc-cancelled">' +
      '<div class="cbc-sysbar" style="background:#9E9E9E;"><span class="material-icons-round">cancel</span> Projekt storniert</div>' +
      '<div class="cbc-content">' +
        '<div class="cbc-label"><span class="material-icons-round">event_busy</span> ' + _escHtml(introCancel) + '</div>' +
        (data.projectName ? '<div class="cbc-listing">' + _escHtml(data.projectName) + '</div>' : '') +
        (data.listing ? '<p class="cbc-intro">Bezug: ' + _escHtml(data.listing) + '</p>' : '') +
        '<div class="cbc-status"><span class="material-icons-round">block</span> Anfrage nicht mehr aktiv</div>' +
      '</div>' +
      (time ? '<span class="cbc-ts">' + _escHtml(time) + '</span>' : '') +
    '</div>';
    return html2;
  }
  if (!data) {
    return '<div class="cbc cbc-' + side + '">' +
      '<div class="cbc-bubble"><p>' + _escHtml(raw).replace(/\n/g, '<br>') + '</p></div>' +
      (time ? '<span class="cbc-ts">' + _escHtml(time) + '</span>' : '') + '</div>';
  }
  var fmtDate = data.date || '';
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      var d = new Date(data.date + 'T00:00:00');
      fmtDate = d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  } catch (e) {}

  var intro = side === 'sent'
    ? 'Du hast eine Anfrage gesendet'
    : 'Hat dein Inserat gesehen und möchte buchen';

  var isInquiry = data.kind === 'inquiry';
  if (isInquiry) {
    intro = side === 'sent'
      ? 'Deine Anfrage wurde an den Anbieter gesendet'
      : 'Neue Projekt-Anfrage zu deinem Angebot';
  }

  // Wurde das Projekt (auf der Anfrage-Seite) gelöscht?  Dann Karte als
  // storniert markieren – für BEIDE Seiten, auch wenn der Anbieter noch
  // nicht geantwortet hat.
  var isCancelled = false;
  if (isInquiry) {
    var cset = window._cbcCancelled || {};
    var key = (data.projectName || '') + '|' + (data.listing || '');
    if (cset[key] || (data.projectName && cset[data.projectName])) {
      isCancelled = true;
    }
  }

  var html = '<div class="cbc cbc-' + side + (isInquiry ? ' cbc-inquiry' : '') + (isCancelled ? ' cbc-cancelled' : '') + '">';

  // System-generated banner
  if (isInquiry) {
    if (isCancelled) {
      html += '<div class="cbc-sysbar" style="background:#9E9E9E;"><span class="material-icons-round">cancel</span> Projekt storniert</div>';
    } else {
      html += '<div class="cbc-sysbar"><span class="material-icons-round">verified</span> Systemgenerierte Projekt-Anfrage</div>';
    }
  }

  // --- image banner ---
  if (data.image) {
    html += '<div class="cbc-banner"><img src="' + _escHtml(data.image) + '" alt="" /></div>';
  }

  // --- content ---
  html += '<div class="cbc-content">';
  html += '<div class="cbc-label"><span class="material-icons-round">' + (isInquiry ? 'event_note' : 'event_available') + '</span> ' + (isInquiry ? 'Projekt-Anfrage' : 'Anfrage') + '</div>';
  if (isInquiry && data.source) {
    var _srcTxt = data.source === 'board' ? 'aus dem Planungsboard' : (data.source === 'listing' ? 'von der Inseratsseite' : '');
    if (_srcTxt) html += '<div class="cbc-source" style="font-size:12px;color:#717171;margin:2px 0 6px">Anfrage ' + _srcTxt + '</div>';
  }
  html += '<p class="cbc-intro">' + _escHtml(intro) + '</p>';

  if (data.listing) {
    html += '<div class="cbc-listing">' + _escHtml(data.listing) + '</div>';
  }

  // detail chips
  var chips = '';
  if (data.projectName) chips += '<span class="cbc-chip"><span class="material-icons-round">folder</span>' + _escHtml(data.projectName) + '</span>';
  if (fmtDate) chips += '<span class="cbc-chip"><span class="material-icons-round">calendar_today</span>' + _escHtml(fmtDate) + '</span>';
  if (data.eventType) chips += '<span class="cbc-chip"><span class="material-icons-round">celebration</span>' + _escHtml(data.eventType) + '</span>';
  if (data.guests) chips += '<span class="cbc-chip"><span class="material-icons-round">group</span>' + _escHtml(data.guests) + ' Gäste</span>';
  if (data.price) chips += '<span class="cbc-chip"><span class="material-icons-round">sell</span>' + _escHtml(data.price) + '</span>';
  if (chips) html += '<div class="cbc-chips">' + chips + '</div>';

  // personal message
  if (data.message) {
    html += '<div class="cbc-msg">„' + _escHtml(data.message) + '"</div>';
  }

  // action buttons
  if (isInquiry) {
    if (isCancelled) {
      html += '<div class="cbc-status" style="color:#9E9E9E;"><span class="material-icons-round">block</span> ' +
        (side === 'sent' ? 'Du hast dieses Projekt geschlossen' : 'Kunde hat das Projekt geschlossen') +
        '</div>';
    } else if (side === 'received') {
      var _cbcCardId = _escHtml(data.cardId || '');
      var _cbcProjId = _escHtml(data.projectId || '');
      var isoDate = (data.date && /^\d{4}-\d{2}-\d{2}$/.test(data.date)) ? data.date : '';
      html += '<div class="cbc-actions">' +
        '<button class="cbc-btn cbc-btn-reject" onclick="rejectInquiryFromChat(\'' + _cbcCardId + '\',\'' + _cbcProjId + '\')"><span class="material-icons-round">cancel</span> Ablehnen</button>' +
        '<button class="cbc-btn cbc-btn-accept" onclick="acceptInquiryFromChat(\'' + _cbcCardId + '\',\'' + _cbcProjId + '\')"><span class="material-icons-round">check_circle</span> Annehmen</button>' +
        '</div>';
    } else {
      html += '<div class="cbc-status"><span class="material-icons-round">schedule</span> Warten auf Antwort des Anbieters</div>';
    }
  } else if (side === 'received') {
    if (typeof _isBookingAccepted === 'function' && _isBookingAccepted(msg.id)) {
      html += '<div class="cbc-status" style="color:#2E7D32"><span class="material-icons-round">check_circle</span> Anfrage angenommen</div>';
    } else {
      html += '<div class="cbc-actions">' +
        '<button class="cbc-btn cbc-btn-primary" onclick="openNegotiationInChat()"><span class="material-icons-round">gavel</span> Gegenangebot</button>' +
        '<button class="cbc-btn cbc-btn-accept" onclick="acceptBookingFromChat(\'' + _escHtml(String(msg.id || '')) + '\', this)"><span class="material-icons-round">check_circle</span> Annehmen</button>' +
        '</div>';
    }
  } else {
    html += '<div class="cbc-status"><span class="material-icons-round">check</span> Gesendet</div>';
  }

  html += '</div>'; // cbc-content

  // timestamp
  if (time) html += '<span class="cbc-ts">' + _escHtml(time) + '</span>';

  html += '</div>'; // cbc
  return html;
}

function _chatNowLabel() {
  var d = new Date();
  return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
}
// „Angenommen"-Status pro Buchungsanfrage (conv:msgId) persistent merken, damit
// die Karte nach Poll-Vollrender/Reload angenommen bleibt und nicht erneut
// angenommen werden kann.
function _acceptedBookingKey(msgId) {
  return (currentChat && currentChat.id ? currentChat.id : '') + ':' + (msgId != null ? msgId : '');
}
function _markBookingAccepted(msgId) {
  try {
    var s = JSON.parse(localStorage.getItem('eb_accepted_bookings') || '[]');
    var k = _acceptedBookingKey(msgId);
    if (s.indexOf(k) === -1) { s.push(k); ebSpeichern('eb_accepted_bookings', JSON.stringify(s)); }
  } catch (e) {}
}
function _isBookingAccepted(msgId) {
  try {
    var s = JSON.parse(localStorage.getItem('eb_accepted_bookings') || '[]');
    return s.indexOf(_acceptedBookingKey(msgId)) !== -1;
  } catch (e) { return false; }
}
// Antwort-Bubble sofort im Chatverlauf anzeigen (ohne Vollrender) und in
// currentChat spiegeln, damit sie einen späteren Poll-Vollrender übersteht.
// Doppelte Einträge (Poll hat sie schon geladen) werden vermieden.
function _appendChatSentMessage(serverMsg, text) {
  if (serverMsg && serverMsg.id && currentChat && Array.isArray(currentChat.messages) &&
      currentChat.messages.some(function(m) { return m && String(m.id) === String(serverMsg.id); })) {
    return;
  }
  var container = document.getElementById('chatMessages');
  var time = (serverMsg && serverMsg.time) || _chatNowLabel();
  if (container) {
    var delBtn = serverMsg && serverMsg.id
      ? '<button class="msg-delete-btn" title="Nachricht löschen" aria-label="Nachricht löschen" onclick="deleteChatMessage(' + serverMsg.id + ')"><span class="material-icons-round">delete</span></button>'
      : '';
    container.innerHTML += '<div class="msg msg-sent">' + delBtn + _escHtml(text) + '<span class="msg-time">' + _escHtml(time) + '</span></div>';
    setTimeout(function() { container.scrollTop = container.scrollHeight; }, 40);
  }
  if (currentChat && serverMsg && serverMsg.id) {
    if (!Array.isArray(currentChat.messages)) currentChat.messages = [];
    currentChat.messages.push({ id: serverMsg.id, type: 'sent', text: text, time: time, created_at: serverMsg.created_at || new Date().toISOString() });
  }
}

function acceptBookingFromChat(msgId, btn) {
  // 1) Angenommen-Status merken (überlebt Poll/Reload, verhindert Doppel-Annahme)
  _markBookingAccepted(msgId);
  // 2) Karte sofort auf „angenommen" umstellen
  var card = btn && btn.closest ? btn.closest('.cbc') : null;
  if (card) {
    var actions = card.querySelector('.cbc-actions');
    if (actions) actions.outerHTML = '<div class="cbc-status" style="color:#2E7D32"><span class="material-icons-round">check_circle</span> Anfrage angenommen</div>';
  }
  showToast('Anfrage angenommen! Der Kunde wird benachrichtigt.', 'check_circle');
  // 3) Antwort (Resonanz) in den Chat schreiben — persistiert & benachrichtigt den Kunden
  var replyText = 'Ich nehme deine Anfrage gerne an – ich freue mich riesig auf dein Event! 🎉 Lass uns die Details klären.';
  if (currentChat && currentChat.id) {
    fetch(_apiUrl('conversations/' + currentChat.id + '/messages'), {
      method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
      body: JSON.stringify({ content: replyText, type: 'message' })
    })
      .then(function(r) { if (!r.ok) throw new Error('send'); return r.json(); })
      .then(function(serverMsg) { _appendChatSentMessage(serverMsg, replyText); })
      .catch(function() { _appendChatSentMessage(null, replyText); });
  } else {
    _appendChatSentMessage(null, replyText);
  }
}

function acceptInquiryFromChat(cardId, projectId) {
  if (!currentChat) return;
  // Send structured acceptance so customer's board auto-updates
  var payload = JSON.stringify({ kind: 'inquiry_accepted', cardId: cardId || '', projectId: projectId || '' });
  fetch(_apiUrl('conversations/' + currentChat.id + '/messages'), {
    method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
    body: JSON.stringify({ content: payload, type: 'message' })
  })
    .then(function(r){ if(!r.ok) throw new Error('send'); return r.json(); })
    .then(function(){
      showToast('Zusage gesendet – Kunde wird benachrichtigt.', 'check_circle');
      if (typeof openChat === 'function' && currentChat && currentChat.id) openChat(currentChat.id);
    })
    .catch(function(){ showToast('Senden fehlgeschlagen.', 'error'); });
}

function rejectInquiryFromChat(cardId, projectId) {
  if (!currentChat) return;
  if (!confirm('Anfrage wirklich ablehnen?')) return;
  var payload = JSON.stringify({ kind: 'inquiry_rejected', cardId: cardId || '', projectId: projectId || '' });
  fetch(_apiUrl('conversations/' + currentChat.id + '/messages'), {
    method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
    body: JSON.stringify({ content: payload, type: 'message' })
  })
    .then(function(r){ if(!r.ok) throw new Error('send'); return r.json(); })
    .then(function(){
      showToast('Absage gesendet.', 'info');
      if (typeof openChat === 'function' && currentChat && currentChat.id) openChat(currentChat.id);
    })
    .catch(function(){ showToast('Senden fehlgeschlagen.', 'error'); });
}

// Called after loading/polling messages on the CUSTOMER side.
// Scans for inquiry_accepted / inquiry_rejected messages (received) and
// updates the matching board card automatically.
var _boardInquiryProcessed = {};
function _checkBoardUpdatesFromMessages(messages) {
  if (!Array.isArray(messages) || !_boardProjects || !_boardProjects.length) return;
  messages.forEach(function(msg) {
    if (msg.type !== 'received') return; // only messages FROM provider
    var msgKey = msg.id || (msg.created_at + '_' + (msg.text || '').slice(0,20));
    if (_boardInquiryProcessed[msgKey]) return;
    var text = msg.text || msg.content || '';
    var data;
    try { data = JSON.parse(text); } catch(e) { return; }
    if (!data || !data.kind) return;
    if (data.kind !== 'inquiry_accepted' && data.kind !== 'inquiry_rejected') return;
    _boardInquiryProcessed[msgKey] = 1;
    var cid = data.cardId;
    var pid = data.projectId;
    if (!cid || !pid) return;
    var proj = _boardProjects.find(function(p){ return p.id === pid; });
    if (!proj) return;
    var card = (proj.cards || []).find(function(c){ return c.id === cid; });
    if (!card) return;
    if (data.kind === 'inquiry_accepted' && card.stage === 'kontaktiert') {
      card.stage = 'angebot';
      card.providerAcceptedAt = msg.created_at || new Date().toISOString();
      _saveBoardProjects();
      showToast((card.name || 'Anbieter') + ' hat deine Anfrage angenommen – jetzt buchen!', 'check_circle');
      // Refresh board view if active
      var boardPage = document.getElementById('page-board');
      if (boardPage && boardPage.classList.contains('active') && _activeBoardId === pid) {
        try { renderKanban(proj); } catch(_) {}
        try { renderBoardFlow(); } catch(_) {}
        try { _updateBoardStats(proj); } catch(_) {}
      }
    } else if (data.kind === 'inquiry_rejected' && card.stage === 'kontaktiert') {
      card.stage = 'geplant';
      card.rejectedAt = msg.created_at || new Date().toISOString();
      _saveBoardProjects();
      showToast((card.name || 'Anbieter') + ' hat die Anfrage leider abgelehnt.', 'cancel');
      var boardPage = document.getElementById('page-board');
      if (boardPage && boardPage.classList.contains('active') && _activeBoardId === pid) {
        try { renderKanban(proj); } catch(_) {}
        try { renderBoardFlow(); } catch(_) {}
        try { _updateBoardStats(proj); } catch(_) {}
      }
    }
  });
}

function proposeAlternativeDate(currentIsoDate) {
  if (!currentChat) return;
  var newDate = prompt('Welchen Termin möchtest du vorschlagen? (TT.MM.JJJJ)', currentIsoDate ? _formatDateDe(currentIsoDate) : '');
  if (!newDate || !newDate.trim()) return;
  var note = prompt('Kurze Nachricht an den Anfrager (optional):', 'Am vorgeschlagenen Datum bin ich leider verhindert. Passt dir der Termin unten?') || '';
  var text = '📅 Alternativvorschlag: ' + newDate.trim() + (note.trim() ? '\n\n' + note.trim() : '');
  fetch(_apiUrl('conversations/' + currentChat.id + '/messages'), {
    method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
    body: JSON.stringify({ content: text, type: 'message' })
  })
    .then(function(r){ if(!r.ok) throw new Error('send'); return r.json(); })
    .then(function(){
      showToast('Alternativtermin gesendet.', 'success');
      if (typeof openChat === 'function' && currentChat && currentChat.id) openChat(currentChat.id);
    })
    .catch(function(){ showToast('Senden fehlgeschlagen.', 'error'); });
}

function renderChatList() {
  const list = document.getElementById('chatList');
  if (!isLoggedIn) {
    if (!demoVisible()) {
      list.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-light);">Melde dich an, um Chats zu sehen.</div>';
      return;
    }
    // Show demo chats for non-logged-in users
    list.innerHTML = DEMO_CHATS.map(function(c) {
      return '<div class="chat-item" onclick="openDemoChat(' + c.id + ')">' +
        '<img src="' + _escHtml(c.avatar) + '" alt="' + _escHtml(c.name) + '" />' +
        '<div class="chat-item-info">' +
          '<strong>' + _escHtml(c.name) + '</strong>' +
          '<p>' + _escHtml(c.lastMsg) + '</p>' +
        '</div>' +
        '<div class="chat-item-meta">' +
          '<span>' + _escHtml(c.time) + '</span>' +
          (c.unread > 0 ? '<span class="chat-item-unread">' + c.unread + '</span>' : '') +
        '</div>' +
      '</div>';
    }).join('');
    return;
  }
  fetch(_apiUrl('conversations'), { credentials: 'same-origin', headers: _apiHeaders() })
    .then(function(r) { return r.json(); })
    .then(function(convos) {
      window._conversations = convos || [];
      var showArchived = !!window._chatShowArchived;
      var visible = (convos || []).filter(function(c){ return showArchived ? c.archived : !c.archived; });
      var archivedCount = (convos || []).filter(function(c){ return c.archived; }).length;
      var archiveToggle = (!showArchived && archivedCount > 0)
        ? '<div class="chat-archived-toggle" onclick="toggleArchivedView(true)"><span class="material-icons-round">archive</span> Archiviert (' + archivedCount + ')</div>'
        : (showArchived ? '<div class="chat-archived-toggle active" onclick="toggleArchivedView(false)"><span class="material-icons-round">arrow_back</span> Zurück zu Chats</div>' : '');
      if (visible.length === 0) {
        list.innerHTML = archiveToggle + '<div style="padding:24px;text-align:center;color:var(--text-light);">' + (showArchived ? 'Keine archivierten Chats.' : 'Noch keine Nachrichten.') + '</div>';
        _updateChatBlockBanner();
        return;
      }
      list.innerHTML = archiveToggle + visible.map(function(c) {
        var name = c.other_name || 'Unbekannt';
        var avatar = c.other_photo || ebAvatar(name, name);
        var lastMsg = c.last_message || '';
        // Pretty-print booking messages in sidebar preview
        if (_isBookingContent(lastMsg)) {
          try { var bd = JSON.parse(lastMsg); lastMsg = (bd.kind === 'inquiry' ? '📨 Anfrage: ' : '📋 Anfrage: ') + (bd.listing || 'Buchung'); } catch(e) { lastMsg = '📋 Anfrage'; }
        }
        if (lastMsg.length > 40) lastMsg = lastMsg.substring(0, 40) + '…';
        var time = c.updated_at ? new Date(c.updated_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '';
        var unread = parseInt(c.unread_count) || 0;
        var activeClass = currentChat && currentChat.id === c.id ? 'active' : '';
        var flagIcons = '';
        if (c.pinned)   flagIcons += '<span class="chat-item-flag" title="Angeheftet"><span class="material-icons-round">push_pin</span></span>';
        if (c.muted)    flagIcons += '<span class="chat-item-flag" title="Stummgeschaltet"><span class="material-icons-round">notifications_off</span></span>';
        if (c.blocked_by_me) flagIcons += '<span class="chat-item-flag" title="Blockiert"><span class="material-icons-round">block</span></span>';
        return '<div class="chat-item ' + activeClass + (c.pinned ? ' pinned' : '') + (c.muted ? ' muted' : '') + '" oncontextmenu="return openChatItemMenu(event,' + c.id + ')" onclick="openChat(' + c.id + ')">' +
          '<div class="chat-item-avatar-wrap">' +
            '<img src="' + _escHtml(avatar) + '" alt="' + _escHtml(name) + '" />' +
            '<span class="chat-item-dot ' + (c.online ? 'online' : 'offline') + '"></span>' +
          '</div>' +
          '<div class="chat-item-info">' +
            '<strong>' + _escHtml(name) + (flagIcons ? ' ' + flagIcons : '') + '</strong>' +
            '<p>' + _escHtml(lastMsg) + '</p>' +
          '</div>' +
          '<div class="chat-item-meta">' +
            '<span>' + _escHtml(time) + '</span>' +
            (unread > 0 ? '<span class="chat-item-unread">' + unread + '</span>' : '') +
          '</div>' +
          '<button class="chat-item-delete" title="Chat löschen" aria-label="Chat löschen" onclick="deleteChatFromList(event,' + c.id + ')"><span class="material-icons-round">delete</span></button>' +
        '</div>';
      }).join('');
      _updateChatBlockBanner();
    })
    .catch(function() {
      // FIX 2026-05: Statt Sackgasse "Fehler beim Laden." mit Retry-Button.
      list.innerHTML =
        '<div class="no-results-box" style="margin:16px">' +
          '<span class="material-icons-round no-results-icon">cloud_off</span>' +
          '<div class="no-results-box-text">' +
            '<h3>Chats konnten nicht geladen werden</h3>' +
            '<p>Prüfe deine Verbindung. ' +
              '<a href="#" onclick="event.preventDefault(); renderChatList();" style="color:var(--primary);font-weight:600">Erneut versuchen</a>' +
            '</p>' +
          '</div>' +
        '</div>';
    });
}

function openChat(chatId) {
  fetch(_apiUrl('conversations/' + chatId + '/messages'), { credentials: 'same-origin', headers: _apiHeaders() })
    .then(function(r) { var _cur = r.headers.get('X-EB-Cursor'); return r.json().then(function(m){ return { messages: m, cursor: _cur }; }); })
    .then(function(res) {
      var messages = res.messages; var _openCursor = res.cursor;
      var convo = (window._conversations || []).find(function(c) { return c.id === chatId; });
      var _ccName = convo ? (convo.other_name || 'Chat') : 'Chat';
      currentChat = {
        id: chatId,
        name: _ccName,
        avatar: convo ? (convo.other_photo || ebAvatar(_ccName, _ccName)) : ebAvatar(_ccName, _ccName),
        otherId: convo ? convo.otherId : null,
        online: false,
        messages: messages || [],
        _cursor: _openCursor
      };

      // On mobile: hide sidebar, show chat
      if (window.innerWidth <= 768) {
        document.getElementById('chatSidebar').classList.add('hidden');
        document.getElementById('chatMain').classList.remove('hidden');
      }

      document.getElementById('chatEmpty').style.display = 'none';
      document.getElementById('chatActive').style.display = 'flex';

      document.getElementById('chatAvatar').src = currentChat.avatar;
      document.getElementById('chatName').textContent = currentChat.name;
      // Board-Verknüpfung im Chat-Header: plant man mit diesem Dienstleister
      // bereits im Board, erscheint der Status (Im Plan/Kontaktiert/…) neben
      // dem Namen — klickbar ins Board.
      (function() {
        var old = document.getElementById('chatBoardStatus');
        if (old) old.remove();
        var badge = _boardStatusBadgeForProvider(currentChat.otherId);
        if (!badge) return;
        var nameEl = document.getElementById('chatName');
        if (!nameEl) return;
        var wrap = document.createElement('span');
        wrap.id = 'chatBoardStatus';
        wrap.innerHTML = badge;
        wrap.style.cursor = 'pointer';
        wrap.title = 'Im Planungsboard öffnen';
        wrap.onclick = function(e) { e.stopPropagation(); navigateTo('board'); };
        nameEl.insertAdjacentElement('afterend', wrap);
      })();
      // Fetch real online status
      _updateChatStatus(currentChat.otherId);

      // Find last pending offer from the other user
      var lastPendingOffer = null;
      (messages || []).forEach(function(msg) {
        if (msg.type === 'offer' && msg.status === 'pending' && msg.label !== 'Dein Angebot') {
          lastPendingOffer = msg;
        }
      });

      // Show or hide negotiation banner
      var banner = document.getElementById('negotiationBanner');
      if (lastPendingOffer) {
        document.getElementById('negDetails').textContent = lastPendingOffer.label + ': ' + lastPendingOffer.amount;
        banner.style.display = 'flex';
        banner.dataset.offerId = lastPendingOffer.id;
      } else {
        banner.style.display = 'none';
      }

      // Render messages
      var msgContainer = document.getElementById('chatMessages');
      window._cbcCancelled = _collectCancelledProjectNames(messages);
      msgContainer.innerHTML = (messages || []).map(function(msg) {
        if (msg.msg_type === 'deleted' || msg.deleted) {
          var delCls = msg.type === 'sent' ? 'msg-sent' : 'msg-received';
          return '<div class="msg ' + delCls + ' msg-deleted"><span class="material-icons-round">block</span> Nachricht wurde gelöscht</div>';
        }
        if (msg.type === 'system') {
          return '<div class="msg msg-system">' + _escHtml(msg.text || msg.content || '') + '</div>';
        } else if (msg.type === 'offer') {
          return _renderOfferMsg(msg);
        } else if (msg.type === 'booking' || _isBookingContent(msg.text || msg.content)) {
          return _renderBookingCard(msg);
        } else if (_isStatusMessage(msg.text || msg.content)) {
          return '<div class="msg msg-system">' + _escHtml(msg.text || msg.content || '') + '</div>';
        } else if (msg.msg_type === 'image' || msg.type === 'image') {
          return _renderChatImageMsg(msg);
        } else {
          var cls = msg.type === 'sent' ? 'msg-sent' : 'msg-received';
          var time = msg.time || '';
          var delBtn = '';
          if (msg.id) {
            if (msg.type === 'sent') {
              delBtn = '<button class="msg-delete-btn" title="Nachricht löschen" aria-label="Nachricht löschen" onclick="deleteChatMessage(' + msg.id + ')"><span class="material-icons-round">delete</span></button>';
            } else if (msg.type === 'received') {
              delBtn = '<button class="msg-delete-btn" title="Für mich löschen" aria-label="Für mich löschen" onclick="hideMessageForMe(' + msg.id + ')"><span class="material-icons-round">delete</span></button>';
            }
          }
          return '<div class="msg ' + cls + '">' + delBtn + _escHtml(msg.text || msg.content || '') + '<span class="msg-time">' + _escHtml(time) + '</span></div>';
        }
      }).join('');
      // Scroll to bottom after render
      setTimeout(function() { msgContainer.scrollTop = msgContainer.scrollHeight; }, 50);

      // Check for provider acceptance/rejection and auto-update board cards
      _checkBoardUpdatesFromMessages(messages || []);

      // Update chat list and start live polling
      renderChatList();
      _updateChatBlockBanner();
      _startChatPoll();
    })
    .catch(function() {
      showToast('Chat konnte nicht geladen werden', 'error');
    });
}

function closeChatView() {
  _stopChatPoll();
  if (window.innerWidth <= 768) {
    document.getElementById('chatSidebar').classList.remove('hidden');
    document.getElementById('chatMain').classList.add('hidden');
  }
}

function _getCurrentUserFirstName() {
  if (!currentUser) return '';
  var first = (currentUser.first_name || '').trim();
  if (first) return first;
  var full = (currentUser.name || '').trim();
  if (!full) return '';
  return full.split(/\s+/)[0] || '';
}

function _formatDateForMessage(rawDate) {
  var str = (rawDate || '').trim();
  if (!str) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    var iso = new Date(str + 'T00:00:00');
    if (!isNaN(iso.getTime())) {
      return iso.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  }

  if (/^\d{2}\.\d{2}\.\d{4}$/.test(str)) {
    var p = str.split('.');
    var de = new Date(p[2] + '-' + p[1] + '-' + p[0] + 'T00:00:00');
    if (!isNaN(de.getTime())) {
      return de.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  }

  var generic = new Date(str);
  if (!isNaN(generic.getTime())) {
    return generic.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  return '';
}

function _sanitizeOutgoingMessage(text, dateHint, options) {
  var msg = (text || '').trim();
  if (!msg) return '';
  var opts = options || {};

  var safeDate = _formatDateForMessage(dateHint) || 'gewünschten Termin';
  msg = msg.replace(/Invalid Date/gi, safeDate);

  var firstName = _getCurrentUserFirstName();
  if (firstName) {
    msg = msg.replace(/(^|\n)\s*[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\s*$/i, '$1' + firstName);

    if (opts.enforceFormalSignature) {
      msg = msg.replace(/\n*Mit freundlichen Gr[üu]ßen[\s\S]*$/i, '').trim();
      msg += '\n\nMit freundlichen Grüßen\n' + firstName;
    }
  }

  return msg;
}

function _sendChatImage(input) {
  var file = input && input.files && input.files[0];
  if (input) input.value = '';
  if (!file || !currentChat || !currentChat.id) return;
  ebPrepareImageFile(file, { quiet: true }).then(function(ready) {
    if (!ready) return;   // Grund wurde bereits als Toast gezeigt
    _sendChatImageFile(ready);
  });
}

function _sendChatImageFile(file) {
  showToast('Bild wird gesendet…', 'image');
  uploadFile(file).then(function(r) {
    var url = r && r.url;
    if (!url) throw new Error('Upload fehlgeschlagen.');
    return fetch(_apiUrl('conversations/' + currentChat.id + '/messages'), {
      method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
      body: JSON.stringify({ content: url, type: 'image' })
    });
  }).then(function() {
    // Sofort pollen, damit das Bild gleich erscheint (#8-Mechanik)
    _chatPollDelay = _CHAT_POLL_BASE;
    if (currentChat && currentChat.id && !document.hidden && typeof _chatPollTick === 'function') {
      clearTimeout(_chatPollTimer); _chatPollTick();
    }
  }).catch(function(err) {
    showToast((err && err.message) || 'Bild konnte nicht gesendet werden.', 'error');
  });
}
var _lastTypingPing = 0;
function _onChatInput() {
  if (!currentChat || !currentChat.id || document.hidden) return;
  var now = Date.now();
  if (now - _lastTypingPing < 4000) return; // Drossel: max 1×/4s
  _lastTypingPing = now;
  fetch(_apiUrl('conversations/' + currentChat.id + '/typing'), {
    method: 'POST', credentials: 'same-origin', headers: _apiHeaders()
  }).catch(function(){});
}
function _showTypingIndicator() {
  var el = document.getElementById('chatTypingIndicator');
  if (!el || !currentChat) return;
  var nameEl = document.getElementById('chatTypingName');
  if (nameEl) nameEl.textContent = (currentChat.name || 'Jemand');
  el.style.display = '';
}
function _hideTypingIndicator() {
  var el = document.getElementById('chatTypingIndicator');
  if (el) el.style.display = 'none';
}
function sendMessage() {
  const input = document.getElementById('chatInput');
  const text = _sanitizeOutgoingMessage(input.value, '', { enforceFormalSignature: false });
  if (!text || !currentChat) return;

  // Check for blocked patterns (contact data)
  const hasBlockedContent = BLOCKED_PATTERNS.some(pattern => pattern.test(text));
  if (hasBlockedContent) {
    document.getElementById('commWarning').style.display = 'flex';
    return;
  }

  input.value = '';

  // #8: nach eigenem Senden Backoff zurücksetzen + zeitnah pollen
  _chatPollDelay = _CHAT_POLL_BASE;
  if (currentChat && currentChat.id && !document.hidden) { clearTimeout(_chatPollTimer); _chatPollTick(); }

  // Send to API
  fetch(_apiUrl('conversations/' + currentChat.id + '/messages'), {
    method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
    body: JSON.stringify({ content: text, type: 'message' })
  })
    .then(function(r) { return r.json(); })
    .then(function(msg) {
      // Append the sent message
      var time = msg.time || '';
      var msgContainer = document.getElementById('chatMessages');
      var content = msg.text || msg.content || text;
      if (_isStatusMessage(content)) {
        msgContainer.innerHTML += '<div class="msg msg-system">' + _escHtml(content) + '</div>';
      } else {
        var delBtn = msg && msg.id
          ? '<button class="msg-delete-btn" title="Nachricht löschen" aria-label="Nachricht löschen" onclick="deleteChatMessage(' + msg.id + ')"><span class="material-icons-round">delete</span></button>'
          : '';
        msgContainer.innerHTML += '<div class="msg msg-sent">' + delBtn + _escHtml(content) + '<span class="msg-time">' + time + '</span></div>';
      }
      setTimeout(function() { msgContainer.scrollTop = msgContainer.scrollHeight; }, 50);
    })
    .catch(function() {
      showToast('Nachricht senden fehlgeschlagen', 'error');
    });
}

function handleChatKeypress(e) {
  if (e.key === 'Enter') sendMessage();
}

function deleteChatMessage(messageId) {
  if (!messageId || !currentChat) return;
  if (!confirm('Nachricht wirklich löschen?')) return;
  fetch(_apiUrl('messages/' + messageId), {
    method: 'DELETE', credentials: 'same-origin', headers: _apiHeaders()
  })
    .then(function(r) {
      if (!r.ok) throw new Error('delete-failed');
      return r.json();
    })
    .then(function() {
      if (currentChat && Array.isArray(currentChat.messages)) {
        currentChat.messages.forEach(function(m) {
          if (m && m.id === messageId) { m.deleted = 1; m.msg_type = 'deleted'; m.text = ''; m.content = ''; }
        });
      }
      var container = document.getElementById('chatMessages');
      if (!container) return;
      var btn = container.querySelector('button.msg-delete-btn[onclick*="deleteChatMessage(' + messageId + ')"]');
      var bubble = btn ? btn.closest('.msg') : null;
      if (bubble) {
        bubble.className = 'msg msg-sent msg-deleted';
        bubble.innerHTML = '<span class="material-icons-round">block</span> Nachricht wurde gelöscht';
      }
    })
    .catch(function() {
      showToast('Löschen fehlgeschlagen', 'error');
    });
}

function hideMessageForMe(messageId) {
  if (!messageId || !currentChat) return;
  if (!confirm('Diese Nachricht nur für dich aus dem Chat entfernen?\n\nFür den anderen Kontakt bleibt sie weiterhin sichtbar.')) return;
  fetch(_apiUrl('messages/' + messageId + '/hide'), {
    method: 'POST', credentials: 'same-origin', headers: _apiHeaders()
  })
    .then(function(r) {
      if (!r.ok) throw new Error('hide-failed');
      return r.json();
    })
    .then(function() {
      if (currentChat && Array.isArray(currentChat.messages)) {
        currentChat.messages = currentChat.messages.filter(function(m) { return !m || m.id !== messageId; });
      }
      var container = document.getElementById('chatMessages');
      if (!container) return;
      var btn = container.querySelector('button.msg-delete-btn[onclick*="hideMessageForMe(' + messageId + ')"]');
      var bubble = btn ? btn.closest('.msg') : null;
      if (bubble) bubble.remove();
      renderChatList();
    })
    .catch(function() {
      showToast('Aktion fehlgeschlagen', 'error');
    });
}

function openDemoChat(chatId) {
  var chat = DEMO_CHATS.find(function(c) { return c.id === chatId; });
  if (!chat) return;

  // On mobile: hide sidebar, show chat
  if (window.innerWidth <= 768) {
    document.getElementById('chatSidebar').classList.add('hidden');
    document.getElementById('chatMain').classList.remove('hidden');
  }

  document.getElementById('chatEmpty').style.display = 'none';
  document.getElementById('chatActive').style.display = 'flex';

  document.getElementById('chatAvatar').src = chat.avatar;
  document.getElementById('chatName').textContent = chat.name;
  document.getElementById('chatStatus').textContent = chat.online ? 'Online' : 'Offline';
  document.getElementById('chatStatus').className = chat.online ? 'chat-status online' : 'chat-status offline';

  // Negotiation banner
  var negBanner = document.getElementById('negotiationBanner');
  if (chat.negotiation && chat.negotiation.active) {
    negBanner.style.display = 'flex';
    var details = 'Dein Angebot: ' + chat.negotiation.yourOffer + '€';
    if (chat.negotiation.counterOffer) details += ' · Gegenangebot: ' + chat.negotiation.counterOffer + '€';
    document.getElementById('negDetails').textContent = details;
  } else {
    negBanner.style.display = 'none';
  }

  // Render messages
  var msgContainer = document.getElementById('chatMessages');
  window._cbcCancelled = _collectCancelledProjectNames(chat.messages);
  msgContainer.innerHTML = chat.messages.map(function(msg) {
    if (msg.type === 'system') {
      return '<div class="msg msg-system">' + _escHtml(msg.text) + '</div>';
    } else if (msg.type === 'offer') {
      return _renderOfferMsg(msg);
    } else if (msg.type === 'booking' || _isBookingContent(msg.text || msg.content)) {
      return _renderBookingCard(msg);
    } else if (_isStatusMessage(msg.text)) {
      return '<div class="msg msg-system">' + _escHtml(msg.text) + '</div>';
    } else {
      var cls = msg.type === 'sent' ? 'msg-sent' : 'msg-received';
      return '<div class="msg ' + cls + '">' + _escHtml(msg.text) + '<span class="msg-time">' + _escHtml(msg.time) + '</span></div>';
    }
  }).join('');
  msgContainer.scrollTop = msgContainer.scrollHeight;

  // Mark active in list
  document.querySelectorAll('#chatList .chat-item').forEach(function(el) { el.classList.remove('active'); });
  var items = document.querySelectorAll('#chatList .chat-item');
  items.forEach(function(el) {
    if (el.getAttribute('onclick') === 'openDemoChat(' + chatId + ')') el.classList.add('active');
  });
}

function goToChatProfile() {
  if (currentChat && currentChat.otherId) {
    navigateTo('provider', currentChat.otherId);
  }
}

/* =====================================================================
   CHAT-OPTIONEN (WhatsApp-Stil)
   - Chat leeren, Stummschalten, Archivieren, Anheften, Als ungelesen,
     Blockieren, Melden, Im Chat suchen, Profil ansehen
   ===================================================================== */
function _currentConvMeta() {
  if (!currentChat || !currentChat.id) return null;
  return (window._conversations || []).find(function(c){ return c.id === currentChat.id; }) || null;
}
function _refreshChatMenuLabels() {
  var c = _currentConvMeta();
  var mMute = document.getElementById('chatMenuMute');
  var mPin  = document.getElementById('chatMenuPin');
  var mArch = document.getElementById('chatMenuArchive');
  var mBlk  = document.getElementById('chatMenuBlock');
  if (mMute) mMute.innerHTML = '<span class="material-icons-round">' + (c && c.muted ? 'notifications_active' : 'notifications_off') + '</span> ' + (c && c.muted ? 'Stummschaltung aufheben' : 'Stummschalten');
  if (mPin)  mPin.innerHTML  = '<span class="material-icons-round">push_pin</span> ' + (c && c.pinned ? 'Lösen' : 'Anheften');
  if (mArch) mArch.innerHTML = '<span class="material-icons-round">' + (c && c.archived ? 'unarchive' : 'archive') + '</span> ' + (c && c.archived ? 'Aus Archiv' : 'Archivieren');
  if (mBlk)  mBlk.innerHTML  = '<span class="material-icons-round">block</span> ' + (c && c.blocked_by_me ? 'Blockierung aufheben' : 'Blockieren');
}
function _updateChatBlockBanner() {
  var c = _currentConvMeta();
  var banner = document.getElementById('chatBlockBanner');
  var input  = document.getElementById('chatInputBar');
  var txt    = document.getElementById('chatBlockBannerText');
  var btn    = document.getElementById('chatBlockUnbtn');
  if (!banner || !input) return;
  if (c && (c.blocked_by_me || c.blocked_me)) {
    banner.style.display = 'flex';
    input.style.display = 'none';
    if (c.blocked_by_me) {
      txt.textContent = 'Du hast ' + (c.other_name || 'diesen Kontakt') + ' blockiert.';
      btn.style.display = '';
    } else {
      txt.textContent = (c.other_name || 'Dieser Kontakt') + ' kann aktuell keine Nachrichten empfangen.';
      btn.style.display = 'none';
    }
  } else {
    banner.style.display = 'none';
    input.style.display = '';
  }
}
function toggleChatMenu(e) {
  if (e) e.stopPropagation();
  var menu = document.getElementById('chatMenu');
  var btn  = document.getElementById('chatMenuBtn');
  if (!menu) return;
  var isOpen = !menu.hasAttribute('hidden');
  if (isOpen) {
    menu.setAttribute('hidden','');
    if (btn) btn.setAttribute('aria-expanded','false');
  } else {
    _refreshChatMenuLabels();
    menu.removeAttribute('hidden');
    if (btn) btn.setAttribute('aria-expanded','true');
    setTimeout(function(){
      document.addEventListener('click', _closeChatMenuOnce, { once: true });
    }, 10);
  }
}
function _closeChatMenuOnce(ev) {
  var menu = document.getElementById('chatMenu');
  var wrap = menu && menu.closest('.chat-menu-wrap');
  if (menu && wrap && !wrap.contains(ev.target)) {
    menu.setAttribute('hidden','');
    var btn = document.getElementById('chatMenuBtn');
    if (btn) btn.setAttribute('aria-expanded','false');
  }
}
function chatMenuAction(action) {
  var menu = document.getElementById('chatMenu');
  if (menu) menu.setAttribute('hidden','');
  if (!currentChat || !currentChat.id) return;
  var convId = currentChat.id;
  var c = _currentConvMeta() || {};
  switch (action) {
    case 'profile': goToChatProfile(); break;
    case 'search':  _openChatSearch(); break;
    case 'mute':    _setChatFlag(convId, 'mute',    !c.muted); break;
    case 'pin':     _setChatFlag(convId, 'pin',     !c.pinned); break;
    case 'archive': _setChatFlag(convId, 'archive', !c.archived); break;
    case 'unread':  _markChatUnread(convId); break;
    case 'clear':   _clearChat(convId, c.other_name); break;
    case 'block':   _toggleBlockUser(c); break;
    case 'report':  _reportUser(c, convId); break;
  }
}
function _setChatFlag(convId, flag, on) {
  var path = 'conversations/' + convId + '/' + flag;
  fetch(_apiUrl(path), {
    method: on ? 'POST' : 'DELETE',
    credentials: 'same-origin', headers: _apiHeaders()
  })
    .then(function(r){ if (!r.ok) throw new Error('flag'); return r.json(); })
    .then(function(){
      var label = { mute:['stummgeschaltet','Stummschaltung aufgehoben'], pin:['angeheftet','gelöst'], archive:['archiviert','aus Archiv entfernt'] }[flag] || ['','' ];
      showToast('Chat ' + (on ? label[0] : label[1]), 'success');
      renderChatList();
    })
    .catch(function(){ showToast('Aktion fehlgeschlagen', 'error'); });
}
function _markChatUnread(convId) {
  fetch(_apiUrl('conversations/' + convId + '/read'), {
    method: 'DELETE', credentials: 'same-origin', headers: _apiHeaders()
  })
    .then(function(r){ if (!r.ok) throw new Error('unread'); return r.json(); })
    .then(function(){ showToast('Als ungelesen markiert', 'success'); renderChatList(); })
    .catch(function(){ showToast('Aktion fehlgeschlagen', 'error'); });
}
function _clearChat(convId, otherName) {
  if (!confirm('Chat mit ' + (otherName || 'diesem Kontakt') + ' wirklich löschen?\n\nNur bei dir wird der Verlauf entfernt. Die Gegenseite sieht den Verlauf weiterhin. Bei einer neuen Nachricht erscheint der Chat wieder.')) return;
  fetch(_apiUrl('conversations/' + convId), {
    method: 'DELETE', credentials: 'same-origin', headers: _apiHeaders()
  })
    .then(function(r){ if (!r.ok) throw new Error('clear'); return r.json(); })
    .then(function(){
      showToast('Chat gelöscht', 'success');
      // Chat schließen und Liste neu laden
      _stopChatPoll();
      currentChat = null;
      var chatActive = document.getElementById('chatActive');
      var chatEmpty  = document.getElementById('chatEmpty');
      if (chatActive) chatActive.style.display = 'none';
      if (chatEmpty)  chatEmpty.style.display  = 'flex';
      if (window.innerWidth <= 768) {
        document.getElementById('chatSidebar').classList.remove('hidden');
        document.getElementById('chatMain').classList.add('hidden');
      }
      renderChatList();
    })
    .catch(function(){ showToast('Löschen fehlgeschlagen', 'error'); });
}
function _toggleBlockUser(c) {
  if (!c || !c.otherId) return;
  var willBlock = !c.blocked_by_me;
  var prompt = willBlock
    ? 'Möchtest du ' + (c.other_name || 'diesen Kontakt') + ' wirklich blockieren?\n\nIhr könnt euch dann keine Nachrichten mehr senden.'
    : 'Blockierung von ' + (c.other_name || 'diesem Kontakt') + ' aufheben?';
  if (!confirm(prompt)) return;
  fetch(_apiUrl('users/' + c.otherId + '/block'), {
    method: willBlock ? 'POST' : 'DELETE',
    credentials: 'same-origin', headers: _apiHeaders()
  })
    .then(function(r){ if (!r.ok) throw new Error('block'); return r.json(); })
    .then(function(){
      showToast(willBlock ? 'Kontakt blockiert' : 'Blockierung aufgehoben', 'success');
      renderChatList();
      if (currentChat && currentChat.id) {
        // Conversation-Objekt aktualisieren (banner refresh)
        setTimeout(function(){
          var cc = _currentConvMeta();
          if (cc) _updateChatBlockBanner();
        }, 250);
      }
    })
    .catch(function(){ showToast('Aktion fehlgeschlagen', 'error'); });
}
function _reportUser(c, convId) {
  if (!c || !c.otherId) return;
  var reason = prompt('Warum möchtest du ' + (c.other_name || 'diesen Kontakt') + ' melden?\n(z.B. Spam, Belästigung, Betrug)');
  if (reason === null) return;
  fetch(_apiUrl('users/' + c.otherId + '/report'), {
    method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
    body: JSON.stringify({ reason: reason, conversation_id: convId })
  })
    .then(function(r){ if (!r.ok) throw new Error('report'); return r.json(); })
    .then(function(){ showToast('Meldung übermittelt. Danke!', 'success'); })
    .catch(function(){ showToast('Melden fehlgeschlagen', 'error'); });
}
function _openChatSearch() {
  var q = prompt('Im Chat suchen:');
  if (!q) return;
  q = q.trim().toLowerCase();
  if (!q) return;
  var container = document.getElementById('chatMessages');
  if (!container) return;
  var bubbles = container.querySelectorAll('.msg');
  var firstHit = null;
  bubbles.forEach(function(b){
    b.classList.remove('msg-search-hit');
    var text = (b.textContent || '').toLowerCase();
    if (text.indexOf(q) !== -1) {
      b.classList.add('msg-search-hit');
      if (!firstHit) firstHit = b;
    }
  });
  if (firstHit) {
    firstHit.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else {
    showToast('Keine Treffer', 'info');
  }
}

function toggleArchivedView(show) {
  window._chatShowArchived = !!show;
  renderChatList();
}

// Direkter „Chat löschen"-Button in der Sidebar (WhatsApp-Stil)
function deleteChatFromList(ev, convId) {
  if (ev) { ev.preventDefault(); ev.stopPropagation(); }
  var c = (window._conversations || []).find(function(x){ return x.id === convId; });
  var name = c ? c.other_name : 'diesen Chat';
  // currentChat aktiv setzen, damit _clearChat Close-Logik funktioniert
  currentChat = Object.assign({}, currentChat || {}, { id: convId, otherId: c && c.otherId, name: name });
  _clearChat(convId, name);
}

function openChatItemMenu(ev, convId) {
  if (!ev) return true;
  ev.preventDefault();
  ev.stopPropagation();
  var existing = document.getElementById('chatItemCtxMenu');
  if (existing) existing.remove();
  var c = (window._conversations || []).find(function(x){ return x.id === convId; });
  if (!c) return false;
  var menu = document.createElement('div');
  menu.id = 'chatItemCtxMenu';
  menu.className = 'chat-item-ctx-menu';
  menu.innerHTML = [
    '<button data-act="open"><span class="material-icons-round">chat</span> Öffnen</button>',
    '<button data-act="pin" aria-label="Anpinnen"><span class="material-icons-round">push_pin</span> ' + (c.pinned ? 'Lösen' : 'Anheften') + '</button>',
    '<button data-act="mute" aria-label="Stummschalten"><span class="material-icons-round">' + (c.muted ? 'notifications_active' : 'notifications_off') + '</span> ' + (c.muted ? 'Stummschaltung aus' : 'Stummschalten') + '</button>',
    '<button data-act="archive" aria-label="Archivieren"><span class="material-icons-round">' + (c.archived ? 'unarchive' : 'archive') + '</span> ' + (c.archived ? 'Aus Archiv' : 'Archivieren') + '</button>',
    '<button data-act="unread"><span class="material-icons-round">mark_chat_unread</span> Als ungelesen</button>',
    '<button data-act="clear" class="chat-menu-warn"><span class="material-icons-round">delete_sweep</span> Chat löschen</button>',
    '<button data-act="block" class="chat-menu-danger" aria-label="Blockieren"><span class="material-icons-round">block</span> ' + (c.blocked_by_me ? 'Blockierung aufheben' : 'Blockieren') + '</button>'
  ].join('');
  document.body.appendChild(menu);
  var x = Math.min(ev.clientX, window.innerWidth - 240);
  var y = Math.min(ev.clientY, window.innerHeight - menu.offsetHeight - 8);
  menu.style.left = x + 'px';
  menu.style.top  = y + 'px';
  menu.addEventListener('click', function(e){
    var btn = e.target.closest('button');
    if (!btn) return;
    var act = btn.getAttribute('data-act');
    menu.remove();
    // Zielchat aktiv setzen, damit chatMenuAction darauf wirkt
    currentChat = Object.assign({}, currentChat || {}, { id: convId, otherId: c.otherId, name: c.other_name });
    if (act === 'open') { openChat(convId); return; }
    chatMenuAction(act);
  });
  setTimeout(function(){
    document.addEventListener('click', function h(){ menu.remove(); document.removeEventListener('click', h); }, { once: true });
  }, 10);
  return false;
}

function startChat() {
  if (!isLoggedIn) {
    showToast('Bitte melde dich an, um eine Nachricht zu senden.', 'warning');
    openModal('loginModal');
    return;
  }
  if (!currentListing || !currentListing.providerId) return;
  if (currentUser && currentListing.providerId === currentUser.id) {
    showToast('Du kannst dir nicht selbst schreiben.', 'info');
    return;
  }
  // Create or find conversation with provider
  fetch(_apiUrl('conversations'), {
    method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
    body: JSON.stringify({ other_user_id: currentListing.providerId, listing_id: currentListing._dbId || currentListing.id })
  })
    .then(function(r) { return r.json(); })
    .then(function(convo) {
      navigateTo('messages');
      setTimeout(function() { openChat(convo.id); }, 200);
    })
    .catch(function() {
      showToast('Chat konnte nicht gestartet werden', 'error');
    });
}

function startChatWithProvider() {
  if (!isLoggedIn) {
    showToast('Bitte melde dich an, um eine Nachricht zu senden.', 'warning');
    openModal('loginModal');
    return;
  }
  var providerIdEl = document.getElementById('providerUserId');
  var providerId = providerIdEl ? parseInt(providerIdEl.value) : null;
  if (!providerId) {
    showToast('Anbieter nicht gefunden', 'error');
    return;
  }
  fetch(_apiUrl('conversations'), {
    method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
    body: JSON.stringify({ other_user_id: providerId })
  })
    .then(function(r) { return r.json(); })
    .then(function(convo) {
      navigateTo('messages');
      setTimeout(function() { openChat(convo.id); }, 200);
    })
    .catch(function() {
      showToast('Chat konnte nicht gestartet werden', 'error');
    });
}

