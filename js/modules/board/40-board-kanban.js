// =========================================================
// ===================== EVENT-PLANER BOARD ================
// =========================================================

var _boardProjects = [];
var _activeBoardId = null;
var _boardTombstones = []; // [{ id, deletedAt }] - cross-device delete sync

function _boardStorageKey() {
  return currentUser ? 'eb_board_projects_' + currentUser.id : null;
}
function _boardTombstoneStorageKey() {
  return currentUser ? 'eb_board_tombstones_' + currentUser.id : null;
}

function _loadBoardTombstones() {
  var k = _boardTombstoneStorageKey();
  if (!k) { _boardTombstones = []; return; }
  try {
    var raw = localStorage.getItem(k);
    var arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) arr = [];
    // Prune older than 60 days
    var cutoff = Date.now() - 60 * 86400 * 1000;
    _boardTombstones = arr.filter(function(t){
      return t && t.id && typeof t.deletedAt === 'number' && t.deletedAt >= cutoff;
    });
  } catch(e) { _boardTombstones = []; }
}

function _saveBoardTombstones() {
  var k = _boardTombstoneStorageKey();
  if (!k) return;
  try { ebSpeichern(k, JSON.stringify(_boardTombstones)); } catch(e) {}
}

function _addBoardTombstone(id) {
  if (!id) return;
  var now = Date.now();
  var existing = null;
  for (var i = 0; i < _boardTombstones.length; i++) {
    if (_boardTombstones[i].id === id) { existing = _boardTombstones[i]; break; }
  }
  if (existing) { existing.deletedAt = now; }
  else { _boardTombstones.push({ id: id, deletedAt: now }); }
  _saveBoardTombstones();
}

function _mergeTombstones(serverArr) {
  if (!Array.isArray(serverArr)) return;
  var byId = {};
  _boardTombstones.forEach(function(t){ if (t && t.id) byId[t.id] = t.deletedAt || 0; });
  serverArr.forEach(function(t){
    if (!t || !t.id) return;
    var da = typeof t.deletedAt === 'number' ? t.deletedAt : 0;
    if (!byId[t.id] || byId[t.id] < da) byId[t.id] = da;
  });
  var cutoff = Date.now() - 60 * 86400 * 1000;
  _boardTombstones = Object.keys(byId)
    .filter(function(id){ return byId[id] >= cutoff; })
    .map(function(id){ return { id: id, deletedAt: byId[id] }; });
  _saveBoardTombstones();
}

function _isTombstoned(id) {
  for (var i = 0; i < _boardTombstones.length; i++) {
    if (_boardTombstones[i].id === id) return _boardTombstones[i].deletedAt || 0;
  }
  return 0;
}

var EB_BOARD_STAGE_MODEL_VERSION = 2;

function _cardHasConfirmedPayment(card) {
  if (!card) return false;
  return !!(
    card.paymentIntentId ||
    card.paymentReference ||
    (card.paymentStatus && /paid|bezahlt/i.test(String(card.paymentStatus)))
  );
}

// Stage-Modell v2:
// geplant → kontaktiert → gebucht → erfüllt → bezahlt.
// Frühere Karten verwendeten bestaetigt=Bezahlt und abgeschlossen=Erfüllt.
// Außerdem schrieb die alte Provider-Annahme ohne echte Stripe-Referenz
// fälschlich einen Bezahlt-Marker. Beides wird einmalig und verlustarm
// normalisiert. Manuelle Flow-Koordinaten entfallen, weil die Prozessstruktur
// ab v2 fest ist.
function _migrateBoardStageModel(projects) {
  var changed = false;
  (projects || []).forEach(function(project) {
    if (!project) return;
    if (project.flowLayout) {
      delete project.flowLayout;
      changed = true;
    }
    if (project.flowLayouts && Object.keys(project.flowLayouts).length) {
      project.flowLayouts = {};
      changed = true;
    }
    (project.cards || []).forEach(function(card) {
      if (!card || card._stageModel === EB_BOARD_STAGE_MODEL_VERSION) return;

      // Alte Provider-Annahme war keine Zahlung: ohne Stripe-Referenz und mit
      // identischem Annahme-/Zahlzeitpunkt den künstlichen Marker entfernen.
      var acceptanceOnlyPayment = !!(
        !card.paymentIntentId &&
        !card.paymentReference &&
        card.providerAcceptedAt &&
        card.paidAt &&
        String(card.providerAcceptedAt) === String(card.paidAt)
      );
      if (acceptanceOnlyPayment) {
        card.paidAt = '';
        card.paidAmount = 0;
        card.paymentStatus = '';
        card.paymentMethod = '';
      }

      var paid = _cardHasConfirmedPayment(card);
      var fulfilled = !!(
        card.fulfilledAt ||
        (card.userConfirmedAt && card.providerConfirmedAt && card.stage === 'abgeschlossen')
      );
      if (fulfilled) {
        card.fulfilledAt = card.fulfilledAt || card.providerConfirmedAt || card.userConfirmedAt;
        card.stage = paid ? 'abgeschlossen' : 'bestaetigt';
      } else if (paid) {
        // Bereits vorab bezahlt, aber noch nicht erbracht: bleibt gebucht,
        // bis beide Seiten die Erbringung bestätigen.
        card.stage = 'angebot';
      } else if (card.stage === 'bestaetigt' || card.stage === 'abgeschlossen') {
        card.stage = 'angebot';
      }
      card._stageModel = EB_BOARD_STAGE_MODEL_VERSION;
      changed = true;
    });
  });
  return changed;
}

function _migrateBoardProjects() {
  if (!currentUser) return;
  var newKey = 'eb_board_projects_' + currentUser.id;
  // If user has no data under new key but old global key exists, migrate it
  if (!localStorage.getItem(newKey)) {
    var old = localStorage.getItem('eb_board_projects');
    if (old && old !== '[]') {
      ebSpeichern(newKey, old);
    }
  }
  // Clean up old global key
  localStorage.removeItem('eb_board_projects');
}

function _loadBoardProjects() {
  var key = _boardStorageKey();
  _loadBoardTombstones();
  // 1) Schneller Cache: lokal geladene Projekte sofort anzeigen
  _boardProjects = key ? JSON.parse(localStorage.getItem(key) || '[]') : [];
  if (_migrateBoardStageModel(_boardProjects) && key) {
    try { ebSpeichern(key, JSON.stringify(_boardProjects)); } catch (e) {}
  }
  // Lokal bereits getombstoned? Raus damit.
  if (_boardTombstones.length) {
    _boardProjects = _boardProjects.filter(function(p){ return !p || !p.id || !_isTombstoned(p.id); });
  }
  // 2) Vom Server nachladen (account-gebunden, geräteübergreifend)
  if (currentUser) {
    _syncBoardFromServer({ initial: true });
    _ensureBoardSyncListeners();
  }
}

// Merge-Strategie: pro Projekt-ID gewinnt die Version mit dem neuesten updatedAt.
// Auf dem Server vorhandene Projekte, die lokal fehlen, werden übernommen.
// Lokale Projekte, die auf dem Server fehlen, werden hochgeladen (Migration / Offline-Sync).
function _mergeBoardProjects(serverArr, localArr) {
  var byId = {};
  var serverMigrated = _migrateBoardStageModel(serverArr);
  var localMigrated = _migrateBoardStageModel(localArr);
  var uploadNeeded = serverMigrated || localMigrated;
  function ts(p) {
    if (!p) return 0;
    var v = p.updatedAt || p.createdAt || 0;
    var t = typeof v === 'number' ? v : Date.parse(v);
    return isNaN(t) ? 0 : t;
  }
  (serverArr || []).forEach(function(p) {
    if (p && p.id) byId[p.id] = { project: p, source: 'server' };
  });
  (localArr || []).forEach(function(p) {
    if (!p || !p.id) return;
    var existing = byId[p.id];
    if (!existing) {
      byId[p.id] = { project: p, source: 'local-only' };
      uploadNeeded = true;
    } else if (ts(p) > ts(existing.project)) {
      // Lokale Version ist neuer → verwenden und später pushen
      byId[p.id] = { project: p, source: 'local-newer' };
      uploadNeeded = true;
    }
  });
  // Tombstones: IDs, die lokal oder auf dem Server als gelöscht markiert sind, entfernen.
  // Nur wenn das Projekt nach dem deletedAt geändert wurde, überlebt es (seltener Edge-Case).
  Object.keys(byId).forEach(function(id){
    var da = _isTombstoned(id);
    if (!da) return;
    var pts = ts(byId[id].project);
    if (pts <= da) {
      delete byId[id];
      // Falls die lokale Kopie das Projekt "lebendig" enthielt, muss die Tombstone-Liste zum Server.
      uploadNeeded = true;
    }
  });
  var merged = Object.keys(byId).map(function(k){ return byId[k].project; });
  // Sortieren: neueste zuerst
  merged.sort(function(a, b){ return ts(b) - ts(a); });
  return { merged: merged, uploadNeeded: uploadNeeded };
}

var _boardSyncInFlight = false;
var _boardCloudAvailable = null; // null = noch nicht geprüft, true/false = Ergebnis
/**
 * Snapshot des aktuellen Karten-Zustands (stage + Bestätigungs-Marker), um
 * nach einem Server-Sync zu erkennen, welche Karten ihren Status geändert
 * haben. Wird für Live-Toasts genutzt (z. B. „Anbieter hat angenommen").
 */
function _snapshotBoardCardStates(projects) {
  var snap = {};
  (projects || []).forEach(function(p){
    if (!p || !p.id) return;
    (p.cards || []).forEach(function(c){
      if (!c || !c.id) return;
      snap[p.id + '::' + c.id] = {
        stage: c.stage || '',
        providerAcceptedAt: c.providerAcceptedAt || '',
        providerConfirmedAt: c.providerConfirmedAt || '',
        fulfilledAt: c.fulfilledAt || '',
        projectName: p.name || '',
        projectDate: p.date || '',
        cardName: c.name || ''
      };
    });
  });
  return snap;
}

/**
 * Vergleicht alten Snapshot mit neuem Board-Stand und sendet Toasts
 * für relevante Server-getriebene Übergänge:
 *  – Anbieter hat Auftrag angenommen (providerAcceptedAt)
 *  – Anbieter hat Erbringung bestätigt (providerConfirmedAt neu)
 *  – Projekt erfüllt (fulfilledAt neu)
 */
function _notifyBoardTransitions(prevSnap, newProjects) {
  if (!prevSnap || !newProjects) return;
  newProjects.forEach(function(p){
    if (!p || !p.id) return;
    (p.cards || []).forEach(function(c){
      if (!c || !c.id) return;
      var key = p.id + '::' + c.id;
      var prev = prevSnap[key];
      if (!prev) return; // neue Karte – kein Übergang
      var dateStr = p.date ? _formatDateDe(p.date) : '';
      var who = c.name || 'Dienstleister';
      var what = (p.name ? '„' + p.name + '"' : 'dein Projekt');
      var when = dateStr ? ' am ' + dateStr : '';

      // 1) Anbieter hat Auftrag angenommen
      if (!prev.providerAcceptedAt && c.providerAcceptedAt) {
        showToast(who + ' hat deine Anfrage für ' + what + when + ' angenommen!', 'verified');
      }

      // 2) Anbieter hat Erbringung bestätigt
      if (!prev.providerConfirmedAt && c.providerConfirmedAt) {
        showToast(who + ' hat die Erbringung für ' + what + when + ' bestätigt.', 'task_alt');
      }

      // 3) Projekt vollständig erfüllt (beidseitig bestätigt)
      if (!prev.fulfilledAt && c.fulfilledAt) {
        showToast(what + when + ' ist erfüllt – beide Seiten haben bestätigt.', 'celebration');
      }
    });
  });
}

function _syncBoardFromServer(opts) {
  opts = opts || {};
  if (!currentUser) return Promise.resolve();
  if (_boardSyncInFlight) return Promise.resolve();
  _boardSyncInFlight = true;
  var key = _boardStorageKey();
  return fetch(_apiUrl('board-projects'), { credentials: 'same-origin', headers: _apiHeaders(), cache: 'no-store' })
    .then(function(r) {
      _refreshNonce(r);
      if (!r.ok) {
        _boardCloudAvailable = false;
        _boardLastSyncError = 'HTTP ' + r.status + (r.status === 404 ? ' – API-Route fehlt (Server-Update nötig)' : '');
        console.warn('[Board] Laden vom Server fehlgeschlagen: HTTP ' + r.status);
        if (opts.initial && r.status === 404) {
          showToast('Cloud-Sync nicht verfügbar (API 404). Bitte Theme-Update auf Server prüfen.', 'error');
        } else if (opts.initial && (r.status === 401 || r.status === 403)) {
          showToast('Cloud-Sync: Session abgelaufen. Bitte neu anmelden.', 'error');
        } else if (opts.showError) {
          showToast('Cloud-Sync fehlgeschlagen (HTTP ' + r.status + ')', 'error');
        }
        _updateBoardSyncIndicator();
        return null;
      }
      _boardCloudAvailable = true;
      _boardLastSyncError = null;
      return r.json();
    })
    .then(function(data) {
      if (!data || !Array.isArray(data.projects)) return;
      // Server-Tombstones einspielen, bevor gemerged wird
      _mergeTombstones(Array.isArray(data.deleted) ? data.deleted : []);
      var serverProjects = data.projects;
      var localProjects = key ? JSON.parse(localStorage.getItem(key) || '[]') : [];
      var activeWasDeletedRemotely = !!(_activeBoardId && _isTombstoned(_activeBoardId));
      // Snapshot des aktuellen Zustands für Live-Diff (Provider-Antworten,
      // Stage-Transitionen) – muss VOR dem Merge passieren.
      var _preSyncSnapshot = _snapshotBoardCardStates(_boardProjects);
      var res = _mergeBoardProjects(serverProjects, localProjects);
      _boardProjects = res.merged;
      // Live-Benachrichtigungen über erkannte Übergänge (z. B. Anbieter hat
      // Auftrag angenommen oder erfüllt). Erste Sync („initial") überspringt
      // Toasts, weil dort kein echter Übergang stattfand.
      if (!opts.initial) {
        _notifyBoardTransitions(_preSyncSnapshot, _boardProjects);
      }
      if (key) {
        try { ebSpeichern(key, JSON.stringify(_boardProjects)); } catch(e) {}
      }
      if (res.uploadNeeded) {
        console.info('[Board] Lokale Änderungen werden zum Server synchronisiert.');
        _saveBoardProjects({ immediate: true });
      }
      _boardLastSyncAt = Date.now();
      _updateBoardSyncIndicator();
      if (opts.initial) {
        console.info('[Board] Cloud-Sync OK – ' + serverProjects.length + ' Projekt(e) vom Server geladen.');
      }
      // Ansicht neu rendern, falls Board-Seite aktiv ist
      var boardPage = document.getElementById('page-board');
      if (boardPage && boardPage.classList.contains('active')) {
        if (_activeBoardId) {
          var p = _boardProjects.find(function(x){ return x.id === _activeBoardId; });
          if (p) {
            _updateBoardStats(p);
            var currentView = document.querySelector('.board-view-btn.active');
            if (currentView && currentView.dataset.view) switchBoardView(currentView.dataset.view);
          } else {
            if (activeWasDeletedRemotely) {
              showToast('Dieses Projekt wurde auf einem anderen Gerät gelöscht.', 'info');
            }
            showBoardProjects();
          }
        } else {
          renderBoardPage();
          _tryOpenPendingBoardProject();
        }
      }
    })
    .catch(function(err){
      _boardCloudAvailable = false;
      _boardLastSyncError = 'Server nicht erreichbar';
      console.warn('[Board] Server nicht erreichbar, verwende lokalen Cache.', err);
      if (opts.initial) showToast('Cloud-Sync: Server nicht erreichbar – arbeite offline.', 'error');
      else if (opts.showError) showToast('Cloud-Sync: Server nicht erreichbar.', 'error');
      _updateBoardSyncIndicator();
    })
    .then(function(){ _boardSyncInFlight = false; _updateBoardSyncIndicator(); });
}

// Automatischer Resync: beim Tab-Wechsel zurück zum Tab + periodisch alle 30 s
var _boardSyncListenersAttached = false;
var _boardSyncPollTimer = null;
var _boardLastSyncAt = 0; // Zeitstempel des letzten erfolgreichen Sync
var _boardLastSyncError = null; // Kurztext, falls letzter Sync fehlschlug

function _formatAgo(ts) {
  if (!ts) return 'noch nie';
  var diff = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (diff < 5)   return 'gerade eben';
  if (diff < 60)  return 'vor ' + diff + ' Sek.';
  if (diff < 3600) return 'vor ' + Math.round(diff / 60) + ' Min.';
  if (diff < 86400) return 'vor ' + Math.round(diff / 3600) + ' Std.';
  return 'vor ' + Math.round(diff / 86400) + ' Tagen';
}

function _updateBoardSyncIndicator() {
  var btn   = document.getElementById('btnBoardSync');
  var icon  = document.getElementById('btnBoardSyncIcon');
  var label = document.getElementById('btnBoardSyncLabel');
  if (!btn || !icon || !label) return;
  btn.style.display = currentUser ? '' : 'none';
  if (!currentUser) return;
  var status, tooltip, iconName, color;
  if (_boardSaveInflight || _boardSyncInFlight) {
    status = 'Synchronisiert…'; iconName = 'sync'; color = ''; tooltip = 'Synchronisiert gerade…';
  } else if (_boardCloudAvailable === false) {
    status = 'Offline'; iconName = 'cloud_off'; color = '#e0603a';
    tooltip = _boardLastSyncError || 'Cloud nicht erreichbar – Änderungen bleiben lokal, bis die Verbindung wieder da ist.';
  } else if (_boardDirty) {
    status = 'Ungespeichert'; iconName = 'cloud_upload'; color = '#e0a43a';
    tooltip = 'Lokale Änderungen warten auf Upload.';
  } else if (_boardLastSyncAt) {
    status = _formatAgo(_boardLastSyncAt); iconName = 'cloud_done'; color = 'var(--accent)';
    tooltip = 'Zuletzt synchronisiert ' + _formatAgo(_boardLastSyncAt) + '. Klick für manuellen Sync.';
  } else {
    status = 'Sync'; iconName = 'cloud_sync'; color = '';
    tooltip = 'Jetzt mit Cloud synchronisieren.';
  }
  icon.textContent = iconName;
  label.textContent = status;
  btn.title = tooltip;
  btn.style.borderColor = color || '';
  btn.style.color = color || '';
}

// Periodisch die „vor X Sek." Anzeige auffrischen
setInterval(_updateBoardSyncIndicator, 15000);

function _ensureBoardSyncListeners() {
  if (_boardSyncListenersAttached) return;
  _boardSyncListenersAttached = true;
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible' && currentUser) {
      _syncBoardFromServer();
    }
  });
  window.addEventListener('focus', function() {
    if (currentUser) _syncBoardFromServer();
  });
  window.addEventListener('online', function() {
    if (currentUser) {
      _syncBoardFromServer();
      if (_boardDirty) _pushBoardToServer();
    }
  });
  if (_boardSyncPollTimer) clearInterval(_boardSyncPollTimer);
  _boardSyncPollTimer = setInterval(function() {
    if (currentUser && document.visibilityState === 'visible' && !_boardSaveInflight && !_boardDirty) {
      // Schnellerer Live-Pulse, wenn die Board-Seite aktiv ist – damit
      // Server-Bestätigungen des Dienstleisters möglichst zeitnah als
      // Toast beim User ankommen.
      var boardActive = !!(document.getElementById('page-board') &&
        document.getElementById('page-board').classList.contains('active'));
      if (!boardActive && (Date.now() - _boardLastSyncAt) < 25000) return;
      _syncBoardFromServer();
    }
  }, 8000);
}

// Button-Handler: Manueller Cloud-Sync (optimistisch: erst push, dann pull)
function forceBoardSync() {
  if (!currentUser) { showToast('Bitte anmelden, um mit der Cloud zu synchronisieren.', 'error'); return; }
  var btn = document.getElementById('btnBoardSync');
  if (btn) { btn.disabled = true; btn.classList.add('is-loading'); }
  _updateBoardSyncIndicator();
  var pushPromise = _boardDirty ? _pushBoardToServer() : Promise.resolve();
  pushPromise
    .then(function(){ return _syncBoardFromServer({ showError: true, manual: true }); })
    .then(function(){
      if (_boardCloudAvailable !== false) showToast('Mit Cloud synchronisiert.', 'cloud_done');
    })
    .catch(function(){ /* Fehler wird bereits per Toast gemeldet */ })
    .then(function(){
      if (btn) { btn.disabled = false; btn.classList.remove('is-loading'); }
      _updateBoardSyncIndicator();
    });
}
window.forceBoardSync = forceBoardSync;

var _boardSaveTimer = null;
var _boardSaveInflight = false;
var _boardDirty = false; // ungespeicherte Änderungen vorhanden?

function _pushBoardToServer() {
  if (!currentUser) return Promise.resolve();
  _boardSaveInflight = true;
  _boardDirty = true;
  var payload = JSON.stringify({ projects: _boardProjects, deleted: _boardTombstones });
  return fetch(_apiUrl('board-projects'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: _apiHeaders(),
    body: payload,
    keepalive: true
  })
    .then(function(r) {
      _refreshNonce(r);
      if (!r.ok) {
        console.warn('[Board] Server-Speicherung fehlgeschlagen: HTTP ' + r.status);
        if (r.status === 404) {
          showToast('Cloud-Speicherung fehlgeschlagen: API nicht verfügbar (404). Server-Update nötig.', 'error');
          _boardCloudAvailable = false;
        } else if (r.status === 401 || r.status === 403) {
          showToast('Cloud-Sync: Session abgelaufen, bitte neu anmelden.', 'error');
        } else if (r.status === 413) {
          showToast('Projekt zu groß für Cloud-Speicherung (>2 MB).', 'error');
        } else {
          showToast('Cloud-Speicherung fehlgeschlagen (HTTP ' + r.status + ')', 'error');
        }
        return null;
      }
      _boardDirty = false;
      _boardCloudAvailable = true;
      _boardLastSyncAt = Date.now();
      _boardLastSyncError = null;
      _updateBoardSyncIndicator();
      return r.json();
    })
    .catch(function(err){
      _boardCloudAvailable = false;
      _boardLastSyncError = 'Server nicht erreichbar';
      _updateBoardSyncIndicator();
      console.warn('[Board] Server-Speicherung Netzwerkfehler – wird erneut versucht.', err);
    })
    .then(function(res){
      _boardSaveInflight = false;
      // Falls während des Uploads weiter geändert wurde, direkt erneut pushen
      if (_boardDirty) {
        if (_boardSaveTimer) clearTimeout(_boardSaveTimer);
        _boardSaveTimer = setTimeout(function(){ _boardSaveTimer = null; _pushBoardToServer(); }, 400);
      }
      return res;
    });
}

function _saveBoardProjects(opts) {
  opts = opts || {};
  // Jede Speicherung bekommt einen Timestamp, damit Merge-by-Newest funktioniert
  var now = Date.now();
  if (Array.isArray(_boardProjects)) {
    // Wir markieren das aktive Projekt (oder alle, wenn keins aktiv ist) als aktualisiert
    if (_activeBoardId) {
      _boardProjects.forEach(function(p){ if (p && p.id === _activeBoardId) p.updatedAt = now; });
    } else {
      _boardProjects.forEach(function(p){ if (p && !p.updatedAt) p.updatedAt = now; });
    }
  }
  var key = _boardStorageKey();
  if (key) {
    try { ebSpeichern(key, JSON.stringify(_boardProjects)); } catch(e) {}
  }
  if (!currentUser) return;
  _boardDirty = true;
  _updateBoardSyncIndicator();

  if (opts.immediate) {
    if (_boardSaveTimer) { clearTimeout(_boardSaveTimer); _boardSaveTimer = null; }
    if (!_boardSaveInflight) _pushBoardToServer();
    return;
  }

  // Debounced Push an den Server
  if (_boardSaveTimer) clearTimeout(_boardSaveTimer);
  _boardSaveTimer = setTimeout(function() {
    _boardSaveTimer = null;
    if (_boardSaveInflight) {
      _boardSaveTimer = setTimeout(_saveBoardProjects, 400);
      return;
    }
    _pushBoardToServer();
  }, 600);
}

// Beim Verlassen der Seite ungespeicherte Änderungen garantiert mitsenden
window.addEventListener('pagehide', function() {
  if (!_boardDirty || !currentUser) return;
  try {
    var url = _apiUrl('board-projects');
    var payload = JSON.stringify({ projects: _boardProjects, deleted: _boardTombstones });
    if (_wpNonce) url += (url.indexOf('?') === -1 ? '?' : '&') + '_wpnonce=' + encodeURIComponent(_wpNonce);
    if (navigator.sendBeacon) {
      var blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
    } else {
      fetch(url, { method: 'POST', credentials: 'same-origin', headers: _apiHeaders(), body: payload, keepalive: true });
    }
  } catch(e) {}
});

// Gebührenmodell (Spiegel von eb_stripe_calculate_fee_quote in functions.php):
// Vom Buchungsbetrag gehen Plattformprovision UND Stripe-Zahlungsgebühr ab —
// beide trägt der Dienstleister. Die Stripe-Gebühr ist ein Schätzwert
// (EWR-Karten), der endgültige Betrag hängt von Zahlungsmethode/Kartenland ab.
var EB_PLATFORM_FEE_RATE = 0.03;
var EB_STRIPE_FEE_RATE = 0.015;
var EB_STRIPE_FEE_FIXED = 0.25;

function calculatePayout(priceGross) {
  var gross = Math.round((parseFloat(priceGross) || 0) * 100) / 100;
  var platformFee = Math.round(gross * EB_PLATFORM_FEE_RATE * 100) / 100;
  var stripeFee = gross > 0
    ? Math.round((gross * EB_STRIPE_FEE_RATE + EB_STRIPE_FEE_FIXED) * 100) / 100
    : 0;
  var totalFees = Math.round((platformFee + stripeFee) * 100) / 100;
  if (totalFees > gross) { totalFees = gross; stripeFee = Math.max(0, Math.round((gross - platformFee) * 100) / 100); }
  var netPayout = Math.round((gross - totalFees) * 100) / 100;
  return {
    grossAmount: gross,
    platformFeeRate: EB_PLATFORM_FEE_RATE,
    platformFeeAmount: platformFee,
    stripeFeeAmount: stripeFee,
    totalFeeAmount: totalFees,
    netPayoutAmount: netPayout,
    stripeFeePaidBy: 'provider',
    note: 'Stripe-Gebühr ist eine Vorschau (' + (EB_STRIPE_FEE_RATE * 100).toFixed(1).replace('.', ',') +
      ' % + ' + _formatEuro(EB_STRIPE_FEE_FIXED) + ', EWR-Karten). Nach dem Zahlungseingang wird sie ' +
      'centgenau gegen die echte Stripe-Abrechnung nachjustiert.'
  };
}

/**
 * Holt die centgenaue Abrechnung einer Zahlung (echte Stripe-Gebühren aus der
 * Balance-Transaction). Liefert null, solange Stripe noch nicht abgerechnet hat.
 */
function fetchSettlement(paymentIntentId) {
  if (!paymentIntentId) return Promise.resolve(null);
  return fetch(_apiUrl('stripe/settlement/' + encodeURIComponent(paymentIntentId)), {
    credentials: 'same-origin', headers: _apiHeaders()
  })
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(d) { return (d && d.ok) ? d : null; })
    .catch(function() { return null; });
}

/** Exakte Abrechnung als HTML-Block (nach erfolgreicher Zahlung). */
function _settlementBreakdownHtml(s) {
  if (!s || !s.formatted) return '';
  var f = s.formatted;
  var exact = s.reconciled;
  var rows =
    '<div style="display:flex;justify-content:space-between"><span>Brutto (Kunde zahlt)</span><span>' + _escHtml(f.gross) + '</span></div>' +
    '<div style="display:flex;justify-content:space-between"><span>Eventb&ouml;rse-Provision</span><span>&minus;' + _escHtml(f.platform_fee) + '</span></div>' +
    '<div style="display:flex;justify-content:space-between"><span>Stripe-Zahlungsgeb&uuml;hr' + (exact ? ' (Ist)' : ' (vorl&auml;ufig)') + '</span><span>&minus;' + _escHtml(f.stripe_fee) + '</span></div>' +
    '<div style="display:flex;justify-content:space-between;margin-top:4px;padding-top:4px;border-top:1px dashed var(--border);color:var(--text)"><span>Auszahlung</span><strong style="color:#66bb6a">' + _escHtml(f.provider_payout) + '</strong></div>';
  var details = (s.stripe_fee_details || []).filter(function(d) { return d && d.amount; }).map(function(d) {
    return '<div style="display:flex;justify-content:space-between;font-size:11px;opacity:.8"><span>' +
      _escHtml(d.description || d.type) + '</span><span>' + _escHtml(_formatEuro((d.amount || 0) / 100)) + '</span></div>';
  }).join('');
  var badge = exact
    ? '<span style="color:#66bb6a;font-weight:600">✓ Centgenau abgerechnet</span>'
    : '<span style="color:var(--text-light)">Abrechnung l&auml;uft — endg&uuml;ltige Geb&uuml;hr folgt</span>';
  return '<div style="padding:10px 12px;background:var(--bg-alt);border-radius:8px;font-size:12px;color:var(--text-light);line-height:1.6;margin-bottom:10px">' +
    rows + (details ? '<div style="margin-top:6px;padding-top:6px;border-top:1px dotted var(--border)">' + details + '</div>' : '') +
    '<div style="margin-top:6px;font-size:11px">' + badge + '</div>' +
  '</div>';
}

function _payoutBreakdownHtml(priceNum) {
  var q = calculatePayout(priceNum);
  return '<div style="padding:10px 12px;background:var(--bg-alt);border-radius:8px;font-size:12px;color:var(--text-light);line-height:1.6;margin-bottom:10px">' +
    '<div style="display:flex;justify-content:space-between"><span>Brutto (Kunde zahlt)</span><span>' + _escHtml(_formatEuro(q.grossAmount)) + '</span></div>' +
    '<div style="display:flex;justify-content:space-between"><span>Eventb&ouml;rse-Provision (3%)</span><span>&minus;' + _escHtml(_formatEuro(q.platformFeeAmount)) + '</span></div>' +
    '<div style="display:flex;justify-content:space-between"><span>Stripe-Zahlungsgeb&uuml;hr (Vorschau)</span><span>&minus;' + _escHtml(_formatEuro(q.stripeFeeAmount)) + '</span></div>' +
    '<div style="display:flex;justify-content:space-between;margin-top:4px;padding-top:4px;border-top:1px dashed var(--border);color:var(--text)"><span>Voraussichtliche Auszahlung</span><strong style="color:#66bb6a">' + _escHtml(_formatEuro(q.netPayoutAmount)) + '</strong></div>' +
    '<div style="margin-top:6px;font-size:11px;color:var(--text-light)">' + _escHtml(q.note) + '</div>' +
  '</div>';
}

/* ─── Aufträge (Dienstleister-Ansicht) ─────────────────── */
function renderAuftraegePage() {
  var container = document.getElementById('auftraegeContent');
  if (!container) return;
  var isProvider = isDienstleister();

  // Aggregation: eigene Board-Karten (lokaler Scope) + server-seitige
  // Buchungen von anderen Nutzern, die ein Angebot des aktuellen
  // Dienstleisters bezahlt haben.
  var myId = currentUser && currentUser.id;
  var jobs = [];
  (_boardProjects || []).forEach(function(proj){
    (proj.cards || []).forEach(function(card){
      var l = card.listingId ? (LISTINGS || []).find(function(x){ return x.id === card.listingId; }) : null;
      var providerId = (l && l.providerId) || card.providerId;
      if (providerId && myId && providerId === myId) {
        jobs.push({ card: card, project: proj, listing: l, remote: false });
      }
    });
  });

  // Vom Server: Buchungen in fremden Boards, die zum aktuellen Provider gehören
  if (isProvider && currentUser) {
    fetch(_apiUrl('board-bookings') + '?debug=1', {
      method: 'GET', credentials: 'same-origin', headers: _apiHeaders()
    }).then(function(r){ return r.json(); }).then(function(data){
      // TEMP-Diagnose: zeigt provider listings, gescannte Boards, gesehene listingIds, Matches
      try { if (data && data._debug) console.log('[Auftragsboard DEBUG]', JSON.stringify(data._debug, null, 2)); } catch(e){}
      var remoteBookings = (data && data.bookings) || [];
      remoteBookings.forEach(function(b){
        // Duplikate mit lokalen Jobs vermeiden (gleiche card.id)
        var already = jobs.some(function(j){ return j.card.id === b.card.id; });
        if (!already) {
          var l = b.card.listingId ? (LISTINGS || []).find(function(x){ return x.id === b.card.listingId; }) : null;
          jobs.push({
            card: b.card,
            project: { id: b.project_id, name: b.project_name, date: b.project_date },
            listing: l,
            remote: true,
            customerId: b.customer_id,
            customerName: b.customer_name
          });
        }
      });
      _renderAuftraegeJobs(container, jobs, isProvider);
    }).catch(function(){
      _renderAuftraegeJobs(container, jobs, isProvider);
    });
    return; // wait for async
  }
  // Non-Provider oder kein Login: synchron rendern (keine Server-Buchungen)
  _renderAuftraegeJobs(container, jobs, isProvider);
}

/**
 * Renders the Aufträge job cards into the given container.
 * Handles both local and remote (cross-user) bookings.
 */
function _renderAuftraegeJobs(container, jobs, isProvider) {
  var html = '';
  html += '<details class="auftraege-howto" style="background:linear-gradient(135deg,rgba(255,56,92,0.06),rgba(0,166,153,0.06));border:1px solid var(--border);border-radius:14px;padding:14px 18px;margin-bottom:18px">' +
    '<summary style="display:flex;align-items:center;gap:10px;cursor:pointer;font-weight:600;list-style:none">' +
      '<span class="material-icons-round" style="color:var(--primary);font-size:22px">info</span>' +
      'So funktioniert dein Auftragsboard' +
    '</summary>' +
    '<div style="font-size:14px;line-height:1.7;margin-top:10px;color:var(--text-light)">' +
      '1. Ein Kunde bucht dich verbindlich &rarr; der Auftrag erscheint hier mit Status <em>&bdquo;Gebucht&ldquo;</em>.<br>' +
      '2. Du pr&uuml;fst die Details und klickst auf <strong>&bdquo;Auftrag annehmen&ldquo;</strong> &ndash; damit ist der Deal fix. Vom Buchungsbetrag gehen 3% Eventb&ouml;rse-Provision und die Stripe-Zahlungsgeb&uuml;hr ab &ndash; den Rest bekommst du ausgezahlt.<br>' +
      '3. Am Event-Tag best&auml;tigt <strong>der Kunde</strong> die Erbringung, <strong>du</strong> best&auml;tigst hier die Abnahme. Erst dann ist der Auftrag <em>erf&uuml;llt</em>.<br>' +
      '4. Anschlie&szlig;end bezahlt der Kunde sicher &uuml;ber Stripe &ndash; danach steht der Auftrag auf <em>&bdquo;Bezahlt&ldquo;</em>.' +
    '</div>' +
  '</details>';

  if (!isProvider) {
    html += '<div style="text-align:center;padding:40px 20px;color:var(--text-light)">' +
      '<span class="material-icons-round" style="font-size:48px;opacity:0.4">assignment</span>' +
      '<p style="margin-top:12px">Diese Seite ist f&uuml;r <strong>Dienstleister</strong> gedacht. Stelle deine Rolle im Profil um, um Auftr&auml;ge zu erhalten.</p>' +
    '</div>';
    container.innerHTML = html;
    return;
  }

  if (!jobs.length) {
    html += '<div style="text-align:center;padding:50px 20px;background:var(--bg-alt);border-radius:14px;border:1px dashed var(--border)">' +
      '<span class="material-icons-round" style="font-size:56px;opacity:0.3;color:var(--text-light)">inbox</span>' +
      '<h3 style="margin:12px 0 6px">Noch keine Auftr&auml;ge</h3>' +
      '<p style="color:var(--text-light);margin:0 0 6px">Sobald ein Kunde dich verbindlich bucht, erscheinen die Details hier.</p>' +
      '<p style="color:var(--text-light);font-size:13px;margin:0">Stelle sicher, dass dein Stripe-Auszahlungskonto aktiv ist, damit Buchungen bezahlt werden k&ouml;nnen.</p>' +
    '</div>';
    container.innerHTML = html;
    return;
  }

  var esc = _escHtml;
  var stageLabels = { angebot:'Gebucht', bestaetigt:'Erf\u00fcllt', abgeschlossen:'Bezahlt', geplant:'Geplant', kontaktiert:'Kontaktiert' };
  var stageColors = { angebot:'#AB47BC', bestaetigt:'#FF385C', abgeschlossen:'#00A699', geplant:'#9E9E9E', kontaktiert:'#FF9800' };

  html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px">';
  jobs.forEach(function(j){
    var c = j.card, p = j.project, l = j.listing;
    var stage = c.stage || 'geplant';
    var color = stageColors[stage] || '#9E9E9E';
    var priceStr = c.price ? (parseFloat(c.price).toFixed(2).replace(/\.00$/, '') + ' €') : '—';
    var dateStr = p.date ? _formatDateDe(p.date) : '—';
    var canConfirm = stage === 'angebot' && !!c.providerAcceptedAt && !c.providerConfirmedAt;
    var alreadyConfirmed = !!c.providerConfirmedAt && stage === 'angebot';
    var canAccept = stage === 'angebot' && !c.providerAcceptedAt;
    var priceNum = parseFloat(c.price) || 0;
    var isRemote = !!j.remote;
    var customerBadge = isRemote && j.customerName
      ? '<div style="font-size:12px;color:var(--text-light);margin-bottom:8px;display:flex;align-items:center;gap:4px"><span class="material-icons-round" style="font-size:14px">person</span>Kunde: <strong>' + esc(j.customerName) + '</strong></div>'
      : '';
    var actionHtml = '';
    if (canAccept) {
      var acceptFn = isRemote
        ? 'acceptAuftragRemote(\'' + esc(String(j.customerId || '')) + '\',\'' + esc(p.id) + '\',\'' + esc(c.id) + '\')'
        : 'acceptAuftragProvider(\'' + esc(p.id) + '\',\'' + esc(c.id) + '\')';
      actionHtml = _payoutBreakdownHtml(priceNum) +
        '<button class="btn-primary" style="width:100%;background:#66bb6a;border-color:#66bb6a" onclick="' + acceptFn + '"><span class="material-icons-round">check_circle</span> Auftrag annehmen</button>';
    } else if (canConfirm) {
      var confirmFn = isRemote
        ? 'confirmAuftragRemote(\'' + esc(String(j.customerId || '')) + '\',\'' + esc(p.id) + '\',\'' + esc(c.id) + '\')'
        : 'confirmAuftragProvider(\'' + esc(p.id) + '\',\'' + esc(c.id) + '\')';
      actionHtml = '<button class="btn-primary" style="width:100%" onclick="' + confirmFn + '"><span class="material-icons-round">verified</span> Erbringung best&auml;tigen</button>';
    } else if (alreadyConfirmed) {
      actionHtml = '<div style="padding:10px;background:rgba(102,187,106,0.1);border-radius:8px;color:#388e3c;font-size:13px;text-align:center"><span class="material-icons-round" style="vertical-align:middle;font-size:16px">check_circle</span> Deinerseits best&auml;tigt</div>';
    } else {
      var waitingText = stage === 'abgeschlossen'
        ? 'Auftrag bezahlt'
        : (stage === 'bestaetigt' ? 'Leistung erf&uuml;llt &ndash; Zahlung ausstehend' : 'Warten auf n&auml;chsten Schritt');
      actionHtml = '<div style="padding:10px;background:var(--bg-alt);border-radius:8px;color:var(--text-light);font-size:13px;text-align:center">' + waitingText + '</div>';
    }

    html += '<div style="background:var(--bg);border:1px solid var(--border);border-radius:14px;overflow:hidden;box-shadow:var(--shadow-sm)">' +
      '<div style="padding:14px 16px;background:' + color + ';color:#fff;display:flex;align-items:center;justify-content:space-between">' +
        '<strong style="font-size:13px;letter-spacing:0.5px;text-transform:uppercase">' + esc(stageLabels[stage] || stage) + '</strong>' +
        '<span style="font-size:12px;opacity:0.9">' + esc(dateStr) + '</span>' +
      '</div>' +
      '<div style="padding:16px">' +
        customerBadge +
        '<div style="font-weight:700;font-size:16px;margin-bottom:4px">' + esc((l && l.title) || c.name || 'Auftrag') + '</div>' +
        '<div style="color:var(--text-light);font-size:13px;margin-bottom:12px">Projekt: ' + esc(p.name || '—') + '</div>' +
        '<div style="display:flex;gap:12px;font-size:13px;margin-bottom:12px">' +
          '<div><span style="color:var(--text-light)">Preis:</span> <strong>' + esc(priceStr) + '</strong></div>' +
          (c.paymentMethod ? '<div><span style="color:var(--text-light)">Zahlung:</span> <strong>' + esc(c.paymentMethod) + '</strong></div>' : '') +
        '</div>' +
        actionHtml +
      '</div>' +
    '</div>';
  });
  html += '</div>';

  container.innerHTML = html;
}

/** Provider confirms locally (own board projects) */
function confirmAuftragProvider(projectId, cardId) {
  var proj = (_boardProjects || []).find(function(p){ return p.id === projectId; });
  if (!proj) return;
  var card = (proj.cards || []).find(function(c){ return c.id === cardId; });
  if (!card) return;
  card.providerConfirmedAt = new Date().toISOString();
  if (card.userConfirmedAt && card.stage === 'angebot') {
    card.fulfilledAt = new Date().toISOString();
    card.stage = _cardHasConfirmedPayment(card) ? 'abgeschlossen' : 'bestaetigt';
    showToast('Auftrag beidseitig best\u00e4tigt – erf\u00fcllt!', 'verified');
  } else {
    showToast('Best\u00e4tigung gespeichert. Wartet auf Kunden-Best\u00e4tigung.', 'hourglass_top');
  }
  card._stageModel = EB_BOARD_STAGE_MODEL_VERSION;
  _saveBoardProjects();
  renderAuftraegePage();
  _refreshBoardPageIfActive();
}

/** Provider confirms a remote booking (from another user's board) */
function confirmAuftragRemote(customerId, projectId, cardId) {
  fetch(_apiUrl('board-bookings/update-card'), {
    method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
    body: JSON.stringify({ customer_id: parseInt(customerId), project_id: projectId, card_id: cardId, action: 'confirm' })
  }).then(function(r){ return r.json().then(function(j){ return { ok: r.ok, data: j }; }); })
    .then(function(res){
      if (!res.ok) { showToast((res.data && res.data.error) || 'Fehler beim Best\u00e4tigen.', 'error'); return; }
      showToast('Best\u00e4tigung gespeichert. Der Kunde wird beim n\u00e4chsten Sync informiert.', 'hourglass_top');
      renderAuftraegePage();
      _refreshBoardPageIfActive();
    }).catch(function(){ showToast('Netzwerkfehler.', 'error'); });
}

/** Provider accepts a remote booking (from another user's board) */
function acceptAuftragRemote(customerId, projectId, cardId) {
  // First confirm with provider using same payout breakdown as local
  var _jobRef = null;
  // Try to find price from rendered context — do a best-effort lookup
  var priceNum = 0;
  (_boardProjects || []).forEach(function(proj){
    (proj.cards || []).forEach(function(card){
      if (card.id === cardId) { priceNum = parseFloat(card.price) || 0; }
    });
  });
  var payout = calculatePayout(priceNum);
  var msg = 'Auftrag verbindlich annehmen?\n\n' +
    (priceNum > 0 ? 'Brutto: ' + _formatEuro(payout.grossAmount) + '\n' +
    '\u2013 Eventb\u00f6rse-Provision (3%): ' + _formatEuro(payout.platformFeeAmount) + '\n' +
    '\u2013 Stripe-Zahlungsgeb\u00fchr (ca.): ' + _formatEuro(payout.stripeFeeAmount) + '\n' +
    'Voraussichtliche Auszahlung: ' + _formatEuro(payout.netPayoutAmount) + '\n\n' : '') +
    'Stripe-Zahlungsgeb\u00fchren werden im Stripe-Dashboard final ausgewiesen.';
  if (!confirm(msg)) return;
  fetch(_apiUrl('board-bookings/update-card'), {
    method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
    body: JSON.stringify({ customer_id: parseInt(customerId), project_id: projectId, card_id: cardId, action: 'accept' })
  }).then(function(r){ return r.json().then(function(j){ return { ok: r.ok, data: j }; }); })
    .then(function(res){
      if (!res.ok) { showToast((res.data && res.data.error) || 'Fehler beim Annehmen.', 'error'); return; }
      showToast('Auftrag angenommen' + (priceNum > 0 ? ' – Auszahlung ' + _formatEuro(payout.netPayoutAmount) : '') + '.', 'paid');
      renderAuftraegePage();
      _refreshBoardPageIfActive();
    }).catch(function(){ showToast('Netzwerkfehler.', 'error'); });
}

/** Re-renders /board if it is the currently active page (project overview only). */
function _refreshBoardPageIfActive() {
  var pageBoard = document.getElementById('page-board');
  if (!pageBoard || !pageBoard.classList.contains('active')) return;
  if (_activeBoardId) return; // inside a specific board view – don't disturb
  renderBoardPage();
}

/**
 * Provider nimmt einen gebuchten Auftrag an. Die Karte bleibt „Gebucht",
 * bis beide Seiten die Erbringung bestätigen. Zahlung folgt danach.
 * Der Kunde sieht die Statusänderung beim nächsten Sync automatisch.
 */
function acceptAuftragProvider(projectId, cardId) {
  var proj = (_boardProjects || []).find(function(p){ return p.id === projectId; });
  if (!proj) return;
  var card = (proj.cards || []).find(function(c){ return c.id === cardId; });
  if (!card) return;
  if (card.providerAcceptedAt) { showToast('Auftrag wurde bereits angenommen.', 'info'); return; }

  var priceNum = parseFloat(card.price) || 0;
  var payout = calculatePayout(priceNum);

  var msg = 'Auftrag verbindlich annehmen?\n\n' +
    'Brutto: ' + _formatEuro(payout.grossAmount) + '\n' +
    '– Eventb\u00f6rse-Provision (3%): ' + _formatEuro(payout.platformFeeAmount) + '\n' +
    '– Stripe-Zahlungsgeb\u00fchr (ca.): ' + _formatEuro(payout.stripeFeeAmount) + '\n' +
    'Voraussichtliche Auszahlung: ' + _formatEuro(payout.netPayoutAmount) + '\n\n' +
    'Stripe-Zahlungsgeb\u00fchren werden im Stripe-Dashboard final ausgewiesen.';
  if (!confirm(msg)) return;

  var nowIso = new Date().toISOString();
  card.providerAcceptedAt = nowIso;
  card.stage = 'angebot';
  card._stageModel = EB_BOARD_STAGE_MODEL_VERSION;
  card.grossAmount = payout.grossAmount;
  card.stripeFeeAmount = payout.stripeFeeAmount;
  card.stripeFeePaidBy = payout.stripeFeePaidBy;
  card.platformFeeAmount = payout.platformFeeAmount;
  card.totalFeeAmount = payout.totalFeeAmount;
  card.netPayoutAmount = payout.netPayoutAmount;
  card.feeModel = 'destination_charge_application_fee_incl_processing';

  _saveBoardProjects({ immediate: true });
  showToast('Auftrag angenommen – Auszahlung ' + _formatEuro(payout.netPayoutAmount) + '.', 'paid');
  renderAuftraegePage();
  _refreshBoardPageIfActive();
}

function renderBoardPage() {
  _activeBoardId = null;
  var projectsEl = document.getElementById('boardProjects');
  var boardViewEl = document.getElementById('boardView');
  var btnAllBoards = document.getElementById('btnAllBoards');
  var headerNewBtn = document.querySelector('.board-page-header-actions .board-new-btn');
  if (!projectsEl) return;
  boardViewEl && (boardViewEl.style.display = 'none');
  projectsEl.style.display = '';
  btnAllBoards && (btnAllBoards.style.display = 'none');

  // Übersicht: generischen Planungs-Board-Header wieder einblenden
  // (wurde in openBoardProject für die Eventboard-Vollansicht versteckt).
  var headerLeftOv = document.querySelector('#page-board .board-page-header-left');
  if (headerLeftOv) headerLeftOv.style.display = '';
  var boardPageOv = document.getElementById('page-board');
  if (boardPageOv) boardPageOv.classList.remove('board-single-view');

  // Hide/show header "new project" button based on login
  if (headerNewBtn) headerNewBtn.style.display = currentUser ? '' : 'none';
  var btnSync = document.getElementById('btnBoardSync');
  if (btnSync) btnSync.style.display = currentUser ? '' : 'none';
  _updateBoardSyncIndicator();

  if (!currentUser) { _boardProjects = []; }

  var isProvider = isDienstleister();
  _ebKbLoad(); // Wissensbasis für den Planungs-Assistenten bereitstellen

  // Header-Rolle korrekt zur angemeldeten Rolle anzeigen (Dienstleister sahen
  // fälschlich „EVENT-PLANER"). Gäste sehen den Standard „EVENT-PLANER".
  var _bpk = document.getElementById('boardPageKicker');
  if (_bpk) _bpk.textContent = (currentUser && isProvider) ? 'DIENSTLEISTER' : 'EVENT-PLANER';
  var _bps = document.getElementById('boardPageSubtitle');
  if (_bps) _bps.textContent = (currentUser && isProvider)
    ? 'Organisiere deine Buchungen, Kunden & Termine im Chat mit deinem Planungs-Assistenten'
    : 'Plane dein Event im Chat mit deinem Assistenten — Projekte, Dienstleister, Budget & Termine';

  // ChatGPT-Look: Sidebar (Projekte + Kategorien) links, lokaler
  // Planungs-Assistent rechts. Funktioniert auch ohne Login (Aktionen,
  // die ein Board brauchen, fragen dann nach Anmeldung).
  projectsEl.classList.remove('board-projects--sectioned');
  projectsEl.classList.add('board-projects--ai');

  // Soft-Refresh: Layout steht bereits für denselben Nutzer & dieselbe Rolle
  // → nur Sidebar/Daten aktualisieren, NICHT das Eingabefeld/den Chat neu
  // aufbauen (sonst löscht der 30-s-Cloud-Sync den gerade getippten Text).
  var renderKey = (currentUser && currentUser.id ? currentUser.id : 'gast') + ':' + (isProvider ? 'p' : 'u');
  var hasLayout = !!projectsEl.querySelector('.board-ai-layout');
  if (hasLayout && projectsEl.dataset.aiRenderKey === renderKey) {
    _aiRenderSidebarProjects();
    if (isProvider) _loadBoardAuftragsboard();
    return;
  }

  // Voll-Rebuild nötig: laufende Eingabe im Assistent-Feld erhalten.
  var prevInp = document.getElementById('baiInput');
  var prevVal = prevInp ? prevInp.value : '';
  var prevFocus = prevInp && document.activeElement === prevInp;

  projectsEl.dataset.aiRenderKey = renderKey;
  projectsEl.innerHTML = _aiBoardLayoutHtml(isProvider);
  _aiRenderSidebarProjects();
  _aiRenderChat();

  if (prevVal) {
    var newInp = document.getElementById('baiInput');
    if (newInp) {
      newInp.value = prevVal;
      if (prevFocus) {
        newInp.focus();
        try { newInp.setSelectionRange(prevVal.length, prevVal.length); } catch (e) {}
      }
    }
  }

  if (isProvider) {
    _loadBoardAuftragsboard();
  }
}

/**
 * Builds the "Eigene Projekte" section: heading + grid of project cards
 * or an inline empty state. Pure HTML – safe to inject inside #boardProjects.
 */
function _renderOwnProjectsSectionHtml(projects) {
  var headerHtml =
    '<div class="board-section-header">' +
      '<div class="board-section-header-text">' +
        '<h2><span class="material-icons-round">view_kanban</span> Eigene Projekte</h2>' +
        '<p>Deine Event-Projekte – plane, kontaktiere &amp; buche Dienstleister.</p>' +
      '</div>' +
      (currentUser ? '<button class="btn-outline board-section-action" onclick="openCreateBoardModal()">' +
        '<span class="material-icons-round">add</span> Neues Projekt' +
      '</button>' : '') +
    '</div>';

  if (!projects || projects.length === 0) {
    return '<section class="board-section" id="boardOwnSection">' +
      headerHtml +
      '<div class="board-section-empty">' +
        '<span class="material-icons-round">view_kanban</span>' +
        '<p>Noch kein Event-Projekt angelegt.</p>' +
        '<button class="btn-primary board-new-btn" onclick="openCreateBoardModal()">' +
          '<span class="material-icons-round">add</span> Erstes Projekt erstellen' +
        '</button>' +
      '</div>' +
    '</section>';
  }

  var cardsHtml = projects.map(_renderOwnProjectCardHtml).join('');
  return '<section class="board-section" id="boardOwnSection">' +
    headerHtml +
    '<div class="board-section-grid">' + cardsHtml + '</div>' +
  '</section>';
}

function _renderOwnProjectCardHtml(p) {
    var total = (p.cards || []).length;
    var confirmed = (p.cards || []).filter(function(c) { return c.stage === 'bestaetigt' || c.stage === 'abgeschlossen'; }).length;
    var budgetSum = (p.cards || []).reduce(function(s, c) { return s + (parseFloat(c.price) || 0); }, 0);

    // Countdown badge
    var countdownHtml = '';
    if (p.date) {
      var eventMs = _parseDateDe(p.date);
      if (eventMs) {
        var daysLeft = Math.ceil((eventMs - Date.now()) / 86400000);
        var cdClass = daysLeft <= 0 ? 'bpc-countdown past' : daysLeft <= 30 ? 'bpc-countdown urgent' : 'bpc-countdown';
        var cdLabel = daysLeft < 0 ? Math.abs(daysLeft) + 'd ago' : daysLeft === 0 ? 'Heute!' : daysLeft + ' Tage';
        countdownHtml = '<span class="' + cdClass + '">' + cdLabel + '</span>';
      }
    }
    // Guest count badge
    var guestHtml = p.guests ? '<span class="bpf-count"><span class="material-icons-round">people</span>' + p.guests + ' G&auml;ste</span>' : '';

    // Special badge for instant-booking projects
    var instantBadge = p.kind === 'instant'
      ? '<span class="bpc-instant-badge"><span class="material-icons-round">bolt</span>Direktbuchungen</span>'
      : '';

    return `
      <div class="board-project-card animated-entry${p.kind === 'instant' ? ' bpc-instant' : ''}" onclick="openBoardProject('${p.id}')">
        <button class="bpc-delete-btn" onclick="event.stopPropagation();deleteBoardProjectById('${p.id}')" title="Projekt l\u00f6schen" aria-label="Projekt l\u00f6schen"><span class="material-icons-round">close</span></button>
        <button class="bpc-edit-btn" onclick="event.stopPropagation();openEditBoardProjectModal('${p.id}')" title="Projekt bearbeiten" aria-label="Projekt bearbeiten"><span class="material-icons-round">edit</span></button>
        ${instantBadge}
        <div class="bpc-top-row">
          <h3>${_escHtml(p.name)}</h3>
          ${countdownHtml}
        </div>
        <div class="bpc-date"><span class="material-icons-round">event</span>${_escHtml(p.date || 'Datum noch offen')}</div>
        <div class="board-project-progress">
          ${(function() {
            var order = ['geplant','kontaktiert','angebot','bestaetigt','abgeschlossen'];
            var cards = p.cards || [];
            function maxStageIndex(c) {
              var idx = order.indexOf(c.stage);
              if (idx < 0) idx = 0;
              if (c.contactDate || c.contactMethod || c.contactMessage) idx = Math.max(idx, 1);
              if (c.bookedAt || c.invoiceSentAt) idx = Math.max(idx, 2);
              if (c.providerConfirmedAt) idx = Math.max(idx, 3);
              if (c.fulfilledAt || (c.userConfirmedAt && c.providerConfirmedAt)) idx = Math.max(idx, 4);
              return idx;
            }
            var maxReached = 0;
            cards.forEach(function(c) {
              var i = maxStageIndex(c);
              if (i > maxReached) maxReached = i;
            });
            return order.map(function(stage, i) {
              var atStage = cards.filter(function(c) { return c.stage === stage; }).length;
              var filled = atStage > 0;
              return '<div class="bpp-stage' + (filled ? ' filled stage-' + stage : '') +
                '" title="' + stage + ': ' + atStage + '"></div>';
            }).join('');
          })()}
        </div>
        <div class="board-project-footer">
          <span class="bpf-count"><span class="material-icons-round">group</span>${total} Dienstleister</span>
          ${p.budget ? `<span class="bpf-count"><span class="material-icons-round">savings</span>${parseFloat(p.budget).toLocaleString('de-DE')} \u20ac Budget</span>` : `<span class="bpf-count"><span class="material-icons-round">euro</span>${budgetSum.toFixed(0)} \u20ac</span>`}
          ${guestHtml}
          <span class="bpf-count" style="color:var(--accent)"><span class="material-icons-round">check_circle</span>${confirmed} Best.</span>
        </div>
      </div>`;
}

/* ─── Auftragsboard (Dienstleister-Sicht auf /board) ─────── */

/**
 * Sammelt lokale Board-Karten, bei denen der aktuelle User der
 * Provider ist. Nur Karten ab Buchung (angebot/bestaetigt/abgeschlossen)
 * werden als "Auftrag" gewertet.
 */
function _collectLocalAuftragsboardJobs() {
  var myId = currentUser && currentUser.id;
  var jobs = [];
  if (!myId) return jobs;
  var relevantStages = { angebot:1, bestaetigt:1, abgeschlossen:1 };
  (_boardProjects || []).forEach(function(proj){
    (proj.cards || []).forEach(function(card){
      var l = card.listingId ? (LISTINGS || []).find(function(x){ return x.id === card.listingId; }) : null;
      var providerId = (l && l.providerId) || card.providerId;
      if (!providerId || providerId !== myId) return;
      var stage = card.stage || 'geplant';
      if (!relevantStages[stage] && !card.bookedAt && !card.providerAcceptedAt) return;
      jobs.push({ card: card, project: proj, listing: l, remote: false });
    });
  });
  return jobs;
}

/**
 * Lädt Auftragsboard-Daten (lokal + remote) und rendert die Sektion neu.
 * Wird ausschließlich aus renderBoardPage() heraus aufgerufen, wenn der
 * aktuelle Nutzer Dienstleister ist.
 */
function _loadBoardAuftragsboard() {
  var localJobs = _collectLocalAuftragsboardJobs();
  if (!currentUser) {
    _updateBoardAuftragsboardSection({ state: 'ready', jobs: localJobs });
    return;
  }
  // Zeige sofort den Lade-State (für manuelles "Aktualisieren")
  _updateBoardAuftragsboardSection({ state: 'loading', jobs: [] });
  fetch(_apiUrl('board-bookings'), {
    method: 'GET', credentials: 'same-origin', headers: _apiHeaders()
  }).then(function(r){ return r.json(); }).then(function(data){
    var remote = (data && data.bookings) || [];
    var jobs = localJobs.slice();
    remote.forEach(function(b){
      var already = jobs.some(function(j){ return j.card && b.card && j.card.id === b.card.id; });
      if (already) return;
      var l = (b.card && b.card.listingId) ? (LISTINGS || []).find(function(x){ return x.id === b.card.listingId; }) : null;
      jobs.push({
        card: b.card,
        project: { id: b.project_id, name: b.project_name, date: b.project_date },
        listing: l,
        remote: true,
        customerId: b.customer_id,
        customerName: b.customer_name
      });
    });
    _updateBoardAuftragsboardSection({ state: 'ready', jobs: jobs });
  }).catch(function(){
    _updateBoardAuftragsboardSection({ state: 'ready', jobs: localJobs });
  });
}

/** Tauscht die Auftragsboard-Sektion in-place aus (ohne komplettes Re-Render). */
function _updateBoardAuftragsboardSection(state) {
  var sec = document.getElementById('boardAuftragsboardSection');
  if (!sec) return;
  var tmp = document.createElement('div');
  tmp.innerHTML = _renderAuftragsboardSectionHtml(state);
  if (tmp.firstElementChild) sec.replaceWith(tmp.firstElementChild);
}

/**
 * Rendert die "Auftragsboard"-Sektion.
 * state = { state:'loading'|'ready', jobs:[...] }
 */
function _renderAuftragsboardSectionHtml(state) {
  var jobs = (state && state.jobs) || [];
  // Gruppiere Jobs pro Projekt für bessere Übersicht.
  var groups = {};
  var order = [];
  jobs.forEach(function(j){
    var key = (j.remote ? 'r' : 'l') + ':' + (j.project && j.project.id ? j.project.id : '_');
    if (!groups[key]) {
      groups[key] = { project: j.project, customerName: j.customerName, remote: !!j.remote, jobs: [] };
      order.push(key);
    }
    groups[key].jobs.push(j);
  });
  // Sortierung: nach Event-Datum aufsteigend, undatierte ans Ende.
  order.sort(function(a, b){
    var da = _parseDateDe((groups[a].project && groups[a].project.date) || '') || Number.MAX_SAFE_INTEGER;
    var db = _parseDateDe((groups[b].project && groups[b].project.date) || '') || Number.MAX_SAFE_INTEGER;
    return da - db;
  });

  var pendingCount = jobs.filter(function(j){ return (j.card.stage === 'angebot') && !j.card.providerAcceptedAt; }).length;
  var openCount    = jobs.filter(function(j){ return j.card.stage === 'angebot' && !!j.card.providerAcceptedAt && !j.card.providerConfirmedAt; }).length;
  var doneCount    = jobs.filter(function(j){ return j.card.stage === 'bestaetigt' || j.card.stage === 'abgeschlossen'; }).length;

  var headerHtml =
    '<div class="board-section-header">' +
      '<div class="board-section-header-text">' +
        '<h2><span class="material-icons-round">assignment</span> Auftragsboard</h2>' +
        '<p>Dienstleistungen, die du erbringen musst – sortiert nach Event-Datum.</p>' +
      '</div>' +
      '<div class="board-section-header-right">' +
        '<button class="btn-outline board-section-action" onclick="_loadBoardAuftragsboard()" title="Auftr\u00e4ge neu laden">' +
          '<span class="material-icons-round">refresh</span> Aktualisieren' +
        '</button>' +
        '<div class="board-section-stats">' +
          (pendingCount ? '<span class="board-section-stat pending"><span class="material-icons-round">hourglass_bottom</span>' + pendingCount + ' zu best&auml;tigen</span>' : '') +
          (openCount    ? '<span class="board-section-stat open"><span class="material-icons-round">event_available</span>' + openCount + ' offen</span>' : '') +
          (doneCount    ? '<span class="board-section-stat done"><span class="material-icons-round">verified</span>' + doneCount + ' erf&uuml;llt</span>' : '') +
        '</div>' +
      '</div>' +
    '</div>';

  if (state && state.state === 'loading') {
    return '<section class="board-section board-section--auftraege" id="boardAuftragsboardSection">' +
      headerHtml +
      '<div class="board-section-loading"><span class="material-icons-round">refresh</span> Lade Auftr&auml;ge&hellip;</div>' +
    '</section>';
  }
  if (!jobs.length) {
    return '<section class="board-section board-section--auftraege" id="boardAuftragsboardSection">' +
      headerHtml +
      '<div class="board-section-empty">' +
        '<span class="material-icons-round">inbox</span>' +
        '<p><strong>Noch keine gebuchten Auftr&auml;ge.</strong></p>' +
        '<p style="font-size:13px;margin-top:-4px">Sobald ein Kunde eines deiner Angebote verbindlich bucht, erscheint sein Event-Board hier &ndash; mit allen Infos, die du f&uuml;r die Erbringung brauchst.</p>' +
        '<div class="board-section-empty-hints">' +
          '<div class="board-section-hint"><span class="material-icons-round">sync</span>Gerade gebucht worden? Tippe auf <strong>&bdquo;Aktualisieren&ldquo;</strong> &ndash; der Kunde synchronisiert sein Board ggf. erst nach wenigen Sekunden.</div>' +
          '<div class="board-section-hint"><span class="material-icons-round">storefront</span>Keine Auftr&auml;ge erhalten? Pr&uuml;fe, ob deine Angebote sichtbar sind und dein <strong>Stripe-Auszahlungskonto</strong> aktiv ist.</div>' +
        '</div>' +
        '<div class="board-section-empty-actions">' +
          '<button class="btn-outline" onclick="_loadBoardAuftragsboard()"><span class="material-icons-round">refresh</span> Jetzt neu laden</button>' +
          '<button class="btn-outline" onclick="navigateTo(\'profile\')"><span class="material-icons-round">storefront</span> Meine Angebote</button>' +
        '</div>' +
      '</div>' +
    '</section>';
  }

  var groupsHtml = order.map(function(key){ return _renderAuftragsboardGroupHtml(groups[key]); }).join('');
  return '<section class="board-section board-section--auftraege" id="boardAuftragsboardSection">' +
    headerHtml +
    '<div class="board-auftrag-groups">' + groupsHtml + '</div>' +
  '</section>';
}

/** Eine Projekt-Gruppe innerhalb des Auftragsboards. */
function _renderAuftragsboardGroupHtml(g) {
  var esc = _escHtml;
  var projName = (g.project && g.project.name) || 'Event';
  var projDate = g.project && g.project.date ? _formatDateDe(g.project.date) : '';
  var countdownHtml = '';
  if (g.project && g.project.date) {
    var ms = _parseDateDe(g.project.date);
    if (ms) {
      var daysLeft = Math.ceil((ms - Date.now()) / 86400000);
      var cdClass = daysLeft < 0 ? 'bpc-countdown past' : daysLeft <= 14 ? 'bpc-countdown urgent' : 'bpc-countdown';
      var cdLabel = daysLeft < 0 ? 'vor ' + Math.abs(daysLeft) + ' Tagen' : daysLeft === 0 ? 'Heute!' : 'in ' + daysLeft + ' Tagen';
      countdownHtml = '<span class="' + cdClass + '">' + cdLabel + '</span>';
    }
  }
  var customerHtml = g.customerName
    ? '<span class="board-auftrag-customer"><span class="material-icons-round">person</span>' + esc(g.customerName) + '</span>'
    : '<span class="board-auftrag-customer board-auftrag-customer--self"><span class="material-icons-round">edit_note</span>Aus eigenem Projekt</span>';

  var cardsHtml = g.jobs.map(function(j){ return _renderAuftragsboardCardHtml(j); }).join('');
  return '<div class="board-auftrag-group">' +
    '<div class="board-auftrag-group-header">' +
      '<div class="board-auftrag-group-title">' +
        '<h3>' + esc(projName) + '</h3>' +
        (projDate ? '<span class="board-auftrag-date"><span class="material-icons-round">event</span>' + esc(projDate) + '</span>' : '') +
        countdownHtml +
      '</div>' +
      customerHtml +
    '</div>' +
    '<div class="board-auftrag-cards">' + cardsHtml + '</div>' +
  '</div>';
}

/** Eine einzelne Auftragskarte (= eine zu erbringende Dienstleistung). */
function _renderAuftragsboardCardHtml(j) {
  var esc = _escHtml;
  var c = j.card, p = j.project, l = j.listing;
  var stage = c.stage || 'geplant';
  var stageLabels = { angebot:'Gebucht', bestaetigt:'Erf\u00fcllt', abgeschlossen:'Bezahlt', geplant:'Geplant', kontaktiert:'Kontaktiert' };
  var stageColors = { angebot:'#AB47BC', bestaetigt:'#FF385C', abgeschlossen:'#00A699', geplant:'#9E9E9E', kontaktiert:'#FF9800' };
  var color = stageColors[stage] || '#9E9E9E';
  var priceNum = parseFloat(c.price) || 0;
  var priceStr = priceNum ? priceNum.toFixed(2).replace(/\.00$/, '') + ' \u20ac' : '\u2014';
  var serviceTitle = (l && l.title) || c.listingTitle || c.name || 'Auftrag';
  var category = (l && (l.categoryLabel || l.category)) || c.category || '';
  var canAccept = stage === 'angebot' && !c.providerAcceptedAt;
  var canConfirm = stage === 'angebot' && !!c.providerAcceptedAt && !c.providerConfirmedAt;
  var alreadyConfirmed = !!c.providerConfirmedAt && stage === 'angebot';
  var isRemote = !!j.remote;

  var actionHtml = '';
  if (canAccept) {
    var acceptFn = isRemote
      ? "acceptAuftragRemote('" + esc(String(j.customerId || '')) + "','" + esc(p.id) + "','" + esc(c.id) + "')"
      : "acceptAuftragProvider('" + esc(p.id) + "','" + esc(c.id) + "')";
    actionHtml = _payoutBreakdownHtml(priceNum) +
      '<button class="btn-primary board-auftrag-btn board-auftrag-btn--accept" onclick="' + acceptFn + '">' +
        '<span class="material-icons-round">check_circle</span> Auftrag annehmen' +
      '</button>';
  } else if (canConfirm) {
    var confirmFn = isRemote
      ? "confirmAuftragRemote('" + esc(String(j.customerId || '')) + "','" + esc(p.id) + "','" + esc(c.id) + "')"
      : "confirmAuftragProvider('" + esc(p.id) + "','" + esc(c.id) + "')";
    actionHtml = '<button class="btn-primary board-auftrag-btn" onclick="' + confirmFn + '">' +
      '<span class="material-icons-round">verified</span> Erbringung best&auml;tigen' +
    '</button>';
  } else if (alreadyConfirmed) {
    actionHtml = '<div class="board-auftrag-status board-auftrag-status--waiting">' +
      '<span class="material-icons-round">hourglass_top</span> Wartet auf Kunden-Best&auml;tigung' +
    '</div>';
  } else if (stage === 'bestaetigt') {
    actionHtml = '<div class="board-auftrag-status board-auftrag-status--done">' +
      '<span class="material-icons-round">verified</span> Leistung erf&uuml;llt &ndash; Zahlung ausstehend' +
    '</div>';
  } else if (stage === 'abgeschlossen') {
    actionHtml = '<div class="board-auftrag-status board-auftrag-status--done">' +
      '<span class="material-icons-round">paid</span> Auftrag bezahlt' +
    '</div>';
  } else {
    actionHtml = '<div class="board-auftrag-status">Warten auf n&auml;chsten Schritt</div>';
  }

  var payoutNetto = (typeof c.netPayoutAmount === 'number' && c.netPayoutAmount > 0)
    ? c.netPayoutAmount
    : (priceNum ? (priceNum * 0.97) : 0);
  var payoutHtml = priceNum
    ? '<div class="board-auftrag-payout"><span class="material-icons-round">payments</span>Auszahlung ca. <strong>' + esc(payoutNetto.toFixed(2).replace(/\.00$/, '') + ' \u20ac') + '</strong></div>'
    : '';

  return '<div class="board-auftrag-card">' +
    '<div class="board-auftrag-card-head" style="background:' + color + '">' +
      '<span class="board-auftrag-stage">' + esc(stageLabels[stage] || stage) + '</span>' +
      '<span class="board-auftrag-price">' + esc(priceStr) + '</span>' +
    '</div>' +
    '<div class="board-auftrag-card-body">' +
      '<div class="board-auftrag-service">' + esc(serviceTitle) + '</div>' +
      (category ? '<div class="board-auftrag-cat">' + esc(category) + '</div>' : '') +
      payoutHtml +
      actionHtml +
    '</div>' +
  '</div>';
}

function _sendProjectCancellation(providerId, listingId, listingTitle, project, cancelText) {
  var cancelPayload = {
    kind: 'inquiry_cancelled',
    listing: listingTitle || '',
    projectName: (project && project.name) || '',
    date: (project && project.date) || '',
    reason: 'Projekt vom Kunden geschlossen'
  };
  var cancelJson = JSON.stringify(cancelPayload);
  return fetch(_apiUrl('conversations'), {
    method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
    body: JSON.stringify({ other_user_id: providerId, listing_id: listingId })
  })
    .then(function(r) { return r.json(); })
    .then(function(convo) {
      if (!convo || !convo.id) return null;
      // 1) Strukturierte Storno-Karte (flippt Inquiry-Card auf beiden Seiten)
      return fetch(_apiUrl('conversations/' + convo.id + '/messages'), {
        method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
        body: JSON.stringify({ content: cancelJson, type: 'message' })
      }).then(function() {
        // 2) Zusätzliche Text-Absage als höfliche Nachricht
        return fetch(_apiUrl('conversations/' + convo.id + '/messages'), {
          method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
          body: JSON.stringify({ content: cancelText, type: 'text' })
        });
      });
    })
    .catch(function() {});
}

function deleteBoardProjectById(projectId) {
  var project = _boardProjects.find(function(p) { return p.id === projectId; });
  // Re-entry-Guard: schützt vor Doppelklick innerhalb derselben Session.
  // Bewusst KEIN Tombstone-Check – falls ein „totes" Projekt wieder
  // auftaucht (Sync-Race etc.), muss der User es nochmal löschen dürfen.
  if (window._boardDeleteInFlight && window._boardDeleteInFlight[projectId]) return;

  // Wenn das Projekt lokal nicht (mehr) existiert, aber trotzdem noch sichtbar
  // war (stale DOM), einfach Tombstone aktualisieren und neu rendern.
  if (!project) {
    _boardProjects = _boardProjects.filter(function(p) { return p.id !== projectId; });
    _addBoardTombstone(projectId);
    _saveBoardProjects({ immediate: true });
    renderBoardPage();
    showToast('Projekt gelöscht', 'delete');
    return;
  }

  var cards = project.cards || [];
  var activeStages = ['kontaktiert', 'angebot', 'bestaetigt'];
  var contactedCards = cards.filter(function(c) {
    return activeStages.indexOf(c.stage) !== -1 && c.listingId;
  });

  var msg = 'Projekt "' + project.name + '" wirklich löschen?';
  if (contactedCards.length > 0) {
    msg += '\n\n' + contactedCards.length + ' Dienstleister ' +
      (contactedCards.length === 1 ? 'wurde' : 'wurden') +
      ' bereits kontaktiert und ' +
      (contactedCards.length === 1 ? 'erhält' : 'erhalten') +
      ' automatisch eine Nachricht, dass das Event-Projekt beendet wurde.';
  }
  if (!confirm(msg)) return;

  window._boardDeleteInFlight = window._boardDeleteInFlight || {};
  window._boardDeleteInFlight[projectId] = true;

  // In-Memory-Dedupe (pro Aufruf): verhindert, dass mehrere Karten mit
  // demselben Provider+Listing-Paar eine doppelte Absage bekommen.
  // Bewusst NICHT in localStorage persistiert – falls der User erneut
  // löscht (weil Projekt wieder auftauchte), soll die Absage erneut raus.
  var notified = {};

  // Send cancellation notifications to contacted providers
  if (contactedCards.length > 0 && isLoggedIn) {
    var cancelText = 'Hallo,\n\nleider muss ich das Event-Projekt "' + project.name +
      (project.date ? '" (geplant für ' + project.date + ')' : '"') +
      ' beenden. Die weitere Zusammenarbeit ist somit nicht mehr nötig.\n\n' +
      'Vielen Dank für Ihre Zeit und Ihr Verständnis!\n\nBeste Grüße';

    contactedCards.forEach(function(card) {
      var listing = (typeof LISTINGS !== 'undefined' && LISTINGS)
        ? LISTINGS.find(function(l) { return l.id === card.listingId; })
        : null;
      var providerId = (listing && listing.providerId) || card.providerId || null;
      if (!providerId) {
        // Fallback: Listing nachladen, falls LISTINGS-Cache (noch) leer ist
        fetch(_apiUrl('listings/' + card.listingId), { credentials: 'same-origin', headers: _apiHeaders() })
          .then(function(r){ return r.ok ? r.json() : null; })
          .then(function(l){
            if (!l || !l.providerId) return;
            if (currentUser && l.providerId === currentUser.id) return;
            var dk = l.providerId + '|' + card.listingId;
            if (notified[dk]) return;
            notified[dk] = true;
            _sendProjectCancellation(l.providerId, card.listingId, l.title || card.name || '', project, cancelText);
          })
          .catch(function(){});
        return;
      }
      if (currentUser && providerId === currentUser.id) return;

      var dedupeKey = providerId + '|' + card.listingId;
      if (notified[dedupeKey]) return;
      notified[dedupeKey] = true;

      _sendProjectCancellation(providerId, card.listingId, (listing && listing.title) || card.name || '', project, cancelText);
    });
  }

  _boardProjects = _boardProjects.filter(function(p) { return p.id !== projectId; });
  _addBoardTombstone(projectId);
  _saveBoardProjects({ immediate: true });
  renderBoardPage();

  if (contactedCards.length > 0) {
    showToast('Projekt gelöscht · ' + contactedCards.length + ' Dienstleister benachrichtigt', 'info');
  } else {
    showToast('Projekt gelöscht', 'delete');
  }

  // Flag nach kurzer Zeit wieder freigeben, damit erneutes Löschen möglich
  // ist, falls das Projekt durch einen Sync-Race wieder auftaucht.
  setTimeout(function() {
    if (window._boardDeleteInFlight) delete window._boardDeleteInFlight[projectId];
  }, 2000);
}

function showBoardProjects() {
  _activeBoardId = null;
  var boardViewEl = document.getElementById('boardView');
  var projectsEl = document.getElementById('boardProjects');
  var btnAllBoards = document.getElementById('btnAllBoards');
  boardViewEl && (boardViewEl.style.display = 'none');
  projectsEl && (projectsEl.style.display = '');
  btnAllBoards && (btnAllBoards.style.display = 'none');
  // URL zurück auf Übersicht /board (sonst bleibt /board/<id> in der Adressleiste)
  try {
    var _wantedPath = (typeof _spaPath === 'function') ? _spaPath('board') : '/board';
    if (window.location.pathname !== _wantedPath) {
      window.history.pushState({ page: 'board', data: null }, '', _wantedPath);
    }
  } catch(e) {}
  renderBoardPage();
}

// Legacy-Alias: öffnet das Projekt in-app (kein neuer Tab mehr).
// Wird für Rückwärtskompatibilität mit alten Inline-Handlern beibehalten.
var _pendingBoardProjectId = null;
function openBoardProjectInNewTab(projectId, ev) {
  if (ev) {
    // Modifier-Klicks: User will neuen Tab → nichts tun, Browser-Default greift.
    if (ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.button === 1) return;
  }
  openBoardProject(projectId);
}

// Versucht ein per Deep-Link angefragtes Projekt zu öffnen, sobald es im Cache vorhanden ist.
// Wird aus navigateTo('board', id) und nach erfolgreichem Server-Sync aufgerufen.
function _tryOpenPendingBoardProject() {
  if (!_pendingBoardProjectId) return;
  var pid = _pendingBoardProjectId;
  if (_boardProjects && _boardProjects.some(function(p){ return p && p.id === pid; })) {
    _pendingBoardProjectId = null;
    try { openBoardProject(pid); } catch(e) { console.warn('openBoardProject failed', e); }
  }
}

function openBoardProject(projectId) {
  var project = _boardProjects.find(function(p) { return p.id === projectId; });
  if (!project) return;
  _activeBoardId = projectId;

  // URL synchronisieren → /board/<id> (Deep-Link bleibt funktional, Back-Button geht zur Übersicht)
  try {
    var _wantedPath = (typeof _spaPath === 'function') ? _spaPath('board', projectId) : ('/board/' + projectId);
    if (window.location.pathname !== _wantedPath) {
      window.history.pushState({ page: 'board', data: projectId }, '', _wantedPath);
    }
  } catch(e) {}

  // Ensure board page is the active page
  var boardPage = document.getElementById('page-board');
  if (boardPage && !boardPage.classList.contains('active')) {
    document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
    boardPage.classList.add('active');
    currentPage = 'board';
  }

  var projectsEl = document.getElementById('boardProjects');
  var boardViewEl = document.getElementById('boardView');
  var btnAllBoards = document.getElementById('btnAllBoards');
  projectsEl && (projectsEl.style.display = 'none');
  boardViewEl && (boardViewEl.style.display = '');
  btnAllBoards && (btnAllBoards.style.display = '');

  // Eigene Vollbild-Seite fürs Eventboard: generischen Planungs-Board-Header
  // (Kicker/Titel/Beschreibung + "Neues Event-Projekt") ausblenden, damit das
  // Board nicht "darunter" erscheint, sondern die ganze Fläche bekommt. Die
  // eigene Meta-Bar (Eventname/Datum + Zurück) übernimmt die Kopfzeile.
  var headerLeft = document.querySelector('#page-board .board-page-header-left');
  if (headerLeft) headerLeft.style.display = 'none';
  var headerNewBtnOpen = document.querySelector('.board-page-header-actions .board-new-btn');
  if (headerNewBtnOpen) headerNewBtnOpen.style.display = 'none';
  var boardPageEl = document.getElementById('page-board');
  if (boardPageEl) boardPageEl.classList.add('board-single-view');

  var nameEl = document.getElementById('boardEventName');
  var dateEl = document.getElementById('boardEventDate');
  if (nameEl) nameEl.textContent = project.name;
  if (dateEl) dateEl.textContent = project.date ? new Date(project.date + 'T00:00:00').toLocaleDateString('de-DE', {day:'2-digit',month:'long',year:'numeric'}) : 'Datum noch offen';

  switchBoardView('flow');
  _updateBoardStats(project);
}

// Resolve a listing cover image for a board card. Prefers stored listingImage,
// then falls back to a lookup in LISTINGS by listingId. Returns '' if none.
function _cardListingImage(card) {
  if (!card) return '';
  if (card.listingImage) return card.listingImage;
  var lid = card.listingId;
  if (lid && Array.isArray(LISTINGS)) {
    var l = LISTINGS.find(function(x){ return x && (x.id === lid || x._dbId === lid); });
    if (l) {
      if (l.image) return l.image;
      if (Array.isArray(l.images) && l.images.length) return l.images[0];
      if (l.providerImg) return l.providerImg;
    }
  }
  return card.avatar || '';
}
function _cardListingTitle(card) {
  if (!card) return '';
  if (card.listingTitle) return card.listingTitle;
  var lid = card.listingId;
  if (lid && Array.isArray(LISTINGS)) {
    var l = LISTINGS.find(function(x){ return x && (x.id === lid || x._dbId === lid); });
    if (l && l.title) return l.title;
  }
  return '';
}

function renderKanban(project) {
  var stages = ['geplant','kontaktiert','angebot','bestaetigt','abgeschlossen'];
  stages.forEach(function(stage) {
    var colEl = document.getElementById('cards' + stage.charAt(0).toUpperCase() + stage.slice(1));
    if (!colEl) return;
    var cards = (project.cards || []).filter(function(c) { return c.stage === stage; });
    colEl.innerHTML = cards.map(function(card) { return renderKanbanCard(card); }).join('');
    _initCardDrag(colEl);
    var cntEl = document.getElementById('cnt' + stage.charAt(0).toUpperCase() + stage.slice(1));
    if (cntEl) cntEl.textContent = cards.length;
  });
}

function renderKanbanCard(card) {
  var avatar = card.avatar || ebAvatar(card.name || 'user', card.name);
  // Stage-specific status badge / CTA
  var stageBadge = '';
  if (card.stage === 'kontaktiert') {
    stageBadge = '<div class="kc-waiting"><span class="material-icons-round">hourglass_top</span> Warten auf Antwort</div>';
  } else if (card.stage === 'angebot') {
    stageBadge = '<button class="kc-book-now" onclick="event.stopPropagation();openStageAdvanceModal(\''+card.id+'\',\'angebot\')"><span class="material-icons-round">verified</span> Erbringung bestätigen</button>';
  } else if (card.stage === 'bestaetigt') {
    stageBadge = '<button class="kc-book-now" onclick="event.stopPropagation();openStageAdvanceModal(\''+card.id+'\',\'bestaetigt\')"><span class="material-icons-round">paid</span> Jetzt bezahlen</button>';
  }
  var _listImg = _cardListingImage(card);
  var _listTitle = _cardListingTitle(card);
  var bannerHtml = _listImg
    ? '<div class="kc-banner" style="background-image:url(\''+_escHtml(_listImg)+'\')">' +
        (_listTitle ? '<div class="kc-banner-title">' + _escHtml(_listTitle) + '</div>' : '') +
      '</div>'
    : '';
  return `<div class="kanban-card" draggable="true" data-card-id="${card.id}" ondragstart="dragCard(event,'${card.id}')" onclick="event.stopPropagation()">
    ${bannerHtml}
    <div class="kc-header">
      <img class="kc-avatar" src="${_escHtml(avatar)}" alt="${_escHtml(card.name)}" onerror="this.onerror=null;this.src=ebAvatar(this.alt||'user',this.alt)" />
      <div>
        <div class="kc-name">${_escHtml(card.name)}</div>
        <div class="kc-category">${_escHtml(card.category || '')}</div>
      </div>
    </div>
    ${card.price ? '<div class="kc-price">€ ' + _escHtml(String(card.price)) + '</div>' : ''}
    ${card.note ? '<div class="kc-note">' + _escHtml(card.note) + '</div>' : ''}
    ${stageBadge}
    <div class="kc-actions">
      ${card.listingId ? '<button aria-label="Details ansehen" onclick="navigateTo(\'detail\',' + card.listingId + ')"><span class="material-icons-round">open_in_new</span></button>' : ''}
      <button aria-label="Karte bearbeiten" onclick="editBoardCard('${card.id}')"><span class="material-icons-round">edit</span></button>
      <button class="kc-del" aria-label="Karte löschen" onclick="deleteBoardCard('${card.id}')"><span class="material-icons-round">delete</span></button>
    </div>
  </div>`;
}

function _updateBoardStats(project) {
  var confirmed = (project.cards || []).filter(function(c) { return c.stage === 'bestaetigt' || c.stage === 'abgeschlossen'; }).length;
  var budget = parseFloat(project.budget) || 0;
  var pending = (project.cards || []).filter(function(c) { return c.stage === 'kontaktiert' || c.stage === 'angebot'; }).length;
  var statC = document.getElementById('statConfirmed');
  var statB = document.getElementById('statBudget');
  var statP = document.getElementById('statPending');
  if (statC) statC.textContent = confirmed;
  if (statB) statB.textContent = budget.toLocaleString('de-DE') + ' €';
  if (statP) statP.textContent = pending;

  // Guests stat
  var guestsWrap = document.getElementById('statGuestsWrap');
  var statG = document.getElementById('statGuests');
  if (guestsWrap && statG) {
    if (project.guests) {
      guestsWrap.style.display = '';
      statG.textContent = project.guests;
    } else {
      guestsWrap.style.display = 'none';
    }
  }

  // Countdown stat
  var daysWrap = document.getElementById('statDaysWrap');
  var statD = document.getElementById('statDays');
  if (daysWrap && statD && project.date) {
    var eventMs = _parseDateDe(project.date);
    if (eventMs) {
      var diff = Math.ceil((eventMs - Date.now()) / 86400000);
      daysWrap.style.display = '';
      if (diff > 0) {
        statD.textContent = diff;
        statD.style.color = diff <= 30 ? '#FF385C' : diff <= 90 ? '#FF9800' : 'var(--accent)';
        daysWrap.querySelector('small').textContent = 'Tage noch';
      } else if (diff === 0) {
        statD.textContent = 'Heute';
        statD.style.color = '#FF385C';
        daysWrap.querySelector('small').textContent = 'Event-Tag!';
      } else {
        statD.textContent = Math.abs(diff) + ' vor';
        statD.style.color = 'var(--text-light)';
        daysWrap.querySelector('small').textContent = 'Tagen past';
      }
    } else {
      daysWrap.style.display = 'none';
    }
  } else if (daysWrap) {
    daysWrap.style.display = 'none';
  }
}

// Parse a German date string (DD.MM.YYYY or YYYY-MM-DD) to a timestamp.
function _parseDateDe(str) {
  if (!str) return 0;
  var m;
  m = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) return new Date(+m[3], +m[2]-1, +m[1]).getTime();
  m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(+m[1], +m[2]-1, +m[3]).getTime();
  return 0;
}

// Drag & Drop
var _dragCardId = null;
function dragCard(event, cardId) {
  _dragCardId = cardId;
  event.currentTarget.classList.add('dragging');
}
function allowDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.add('drag-over');
}
// Protected stages: nur über Aktions-/Payment-Flow erreichbar, nicht per Drag&Drop.
var _PROTECTED_STAGES = ['angebot','bestaetigt','abgeschlossen'];
function _protectedStageMessage(stage) {
  if (stage === 'angebot') return 'Status „Gebucht“ wird durch die Annahme des Dienstleisters gesetzt.';
  if (stage === 'bestaetigt') return 'Status „Erfüllt“ wird gesetzt, wenn beide Seiten die Erbringung bestätigen.';
  if (stage === 'abgeschlossen') return 'Status „Bezahlt“ wird ausschließlich nach bestätigter Zahlung gesetzt.';
  return 'Dieser Status wird vom System gesetzt.';
}
function dropCard(event, toStage) {
  event.preventDefault();
  event.currentTarget.classList.remove('drag-over');
  if (!_dragCardId || !_activeBoardId) return;
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;
  var card = (project.cards || []).find(function(c) { return c.id === _dragCardId; });
  if (card) {
    var isProtected = _PROTECTED_STAGES.indexOf(toStage) !== -1;
    // Erlaubt: innerhalb derselben Spalte bleiben (reine Sortierung).
    if (isProtected && card.stage !== toStage) {
      showToast(_protectedStageMessage(toStage), 'warning');
    } else {
      card.stage = toStage;
      _saveBoardProjects();
      renderKanban(project);
      _updateBoardStats(project);
    }
  }
  _dragCardId = null;
  document.querySelectorAll('.kanban-card.dragging').forEach(function(el) { el.classList.remove('dragging'); });
}
function _initCardDrag(colEl) {
  colEl.addEventListener('dragleave', function() { colEl.classList.remove('drag-over'); });
}

// View Toggle
function switchBoardView(view) {
  var kanban    = document.getElementById('boardKanban');
  var timeline  = document.getElementById('boardTimelineView');
  var flow      = document.getElementById('boardFlowView');
  var checklist = document.getElementById('boardChecklistView');
  var btnK  = document.getElementById('btnKanbanView');
  var btnT  = document.getElementById('btnTimelineView');
  var btnF  = document.getElementById('btnFlowView');
  var btnCh = document.getElementById('btnChecklistView');

  // reset all
  kanban    && (kanban.style.display    = 'none');
  timeline  && (timeline.style.display  = 'none');
  flow      && (flow.style.display      = 'none');
  checklist && (checklist.style.display = 'none');
  btnK  && btnK.classList.remove('active');
  btnT  && btnT.classList.remove('active');
  btnF  && btnF.classList.remove('active');
  btnCh && btnCh.classList.remove('active');

  if (view === 'kanban') {
    kanban && (kanban.style.display = '');
    btnK && btnK.classList.add('active');
  } else if (view === 'timeline') {
    timeline && (timeline.style.display = '');
    btnT && btnT.classList.add('active');
    renderBoardTimeline();
  } else if (view === 'flow') {
    flow && (flow.style.display = '');
    btnF && btnF.classList.add('active');
    renderBoardFlow();
  } else if (view === 'checklist') {
    checklist && (checklist.style.display = '');
    btnCh && btnCh.classList.add('active');
    renderBoardChecklist();
  }
}

function renderBoardTimeline() {
  if (!_activeBoardId) return;
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;
  var chain = document.getElementById('timelineChain');
  if (!chain) return;
  var confirmed = (project.cards || []).filter(function(c) { return c.stage === 'bestaetigt' || c.stage === 'abgeschlossen'; });
  if (confirmed.length === 0) {
    chain.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-light)"><span class="material-icons-round" style="font-size:40px;opacity:0.3;display:block;margin-bottom:12px">timeline</span>Noch keine bestätigten Dienstleister im Ablauf</div>';
    return;
  }
  chain.innerHTML = confirmed.map(function(card, i) {
    var avatar = card.avatar || ebAvatar(card.name || 'user', card.name);
    var timeStr = card.startTime || ('0' + (8 + i * 2) + ':00').slice(-5);
    var connector = i < confirmed.length - 1 ? '<div class="tl-connector"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 10h10M12 7l3 3-3 3"/></svg></div>' : '';
    return '<div class="tl-card animated-entry">' +
      '<div class="tl-time">' + _escHtml(timeStr) + '</div>' +
      '<img src="' + _escHtml(avatar) + '" alt="' + _escHtml(card.name) + '" onerror="this.onerror=null;this.src=ebAvatar(this.alt||\'user\',this.alt)" />' +
      '<h4>' + _escHtml(card.name) + '</h4>' +
      '<small>' + _escHtml(card.category || '') + '</small>' +
      '</div>' + connector;
  }).join('');
  _initAnimatedEntries();
}

/* ─── n8n-style Process Flow ─────────────────────────────── */
// Aktuelle Breakpoint-Kategorie für das Flow-Board. Layouts werden
// pro Breakpoint separat gespeichert, damit ein Wechsel zwischen
// Handy/Tablet/Desktop die Welt nicht zerschiesst.
function _currentFlowBp() {
  var vw = window.innerWidth || 1200;
  if (vw <= 600) return 'mobile';
  if (vw <= 900) return 'tablet';
  return 'desktop';
}

// Die Prozessstruktur ist fachlich fest und darf nicht durch versehentliches
// Ziehen dauerhaft zerlegt werden. Alte gespeicherte Koordinaten werden daher
// bewusst ignoriert; Karten bleiben weiterhin zwischen Stages verschiebbar.
function _getFlowLayoutForBp(project, bp) {
  return {};
}

// Debounced Resize-/Orientation-Watcher: bei Breakpoint-Wechsel neu rendern,
// sonst nur Verbindungen neu zeichnen. Wird einmal pro Seite registriert.
var _flowLastBp = null;
var _flowResizeTimer = null;
function _initFlowResizeWatcher() {
  if (window._flowResizeWatcherAttached) return;
  window._flowResizeWatcherAttached = true;
  function onResize() {
    if (_flowResizeTimer) clearTimeout(_flowResizeTimer);
    _flowResizeTimer = setTimeout(function() {
      var flow = document.getElementById('boardFlowView');
      if (!flow) return;
      // Nur reagieren, wenn die Flow-Ansicht gerade sichtbar ist.
      var cs = flow.style.display;
      var visible = cs !== 'none' && flow.offsetParent !== null;
      if (!visible || !_activeBoardId) return;
      var bp = _currentFlowBp();
      if (bp !== _flowLastBp) {
        _flowLastBp = bp;
        _flowFittedFor = null; // beim Breakpoint-Wechsel wieder fitten
        try { renderBoardFlow(); } catch(_) {}
      } else {
        try { _drawFlowConnections(); } catch(_) {}
      }
    }, 150);
  }
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
}

function renderBoardFlow() {
  _initFlowResizeWatcher();
  _flowLastBp = _currentFlowBp();
  try {
    _renderBoardFlowImpl();
  } catch (e) {
    try { console.error('[Flow] render failed', e); } catch (_) {}
    var cont = document.getElementById('boardFlowView');
    if (cont) {
      cont.innerHTML =
        '<div style="padding:40px;text-align:center;color:var(--text-light)">' +
        '<span class="material-icons-round" style="font-size:48px;opacity:.4;display:block;margin-bottom:12px">warning_amber</span>' +
        '<p style="margin:0 0 14px 0">Die Board-Ansicht konnte nicht geladen werden.</p>' +
        '<button class="btn-outline" onclick="try{renderBoardFlow()}catch(e){}">' +
        '<span class="material-icons-round">refresh</span> Erneut versuchen</button>' +
        '</div>';
    }
  }
}

function _renderBoardFlowImpl() {
  if (!_activeBoardId) return;
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;
  var container = document.getElementById('boardFlowView');
  if (!container) return;

  var stagesMeta = [
    { id: 'geplant',       label: 'Geplant',        color: '#9E9E9E', icon: 'schedule'     },
    { id: 'kontaktiert',   label: 'Kontaktiert',     color: '#FF9800', icon: 'mail'         },
    { id: 'angebot',       label: 'Gebucht',         color: '#AB47BC', icon: 'receipt_long' },
    { id: 'bestaetigt',    label: 'Erfüllt',         color: '#FF385C', icon: 'verified'     },
    { id: 'abgeschlossen', label: 'Bezahlt',         color: '#00A699', icon: 'paid'         }
  ];

  var cards = project.cards || [];
  var esc = _escHtml;
  var budget = parseFloat(project.budget) || 0;
  var spent  = cards.reduce(function(s, c) { return s + (parseFloat(c.price) || 0); }, 0);
  var pct    = budget > 0 ? Math.min(100, Math.round(spent / budget * 100)) : 0;
  var budgetColor = pct >= 100 ? '#FF385C' : pct >= 80 ? '#FF9800' : '#00A699';

  // Overall progress: % of cards confirmed or completed
  var confirmedCount = cards.filter(function(c){ return c.stage==='bestaetigt' || c.stage==='abgeschlossen'; }).length;
  var progressPct = cards.length > 0 ? Math.round(confirmedCount / cards.length * 100) : 0;

  // Default layout: responsive sizes based on viewport
  var _vw = window.innerWidth || 1200;
  var _isMobile = _vw <= 600;
  var _isTablet = _vw <= 900;
  var _bp = _isMobile ? 'mobile' : (_isTablet ? 'tablet' : 'desktop');
  // Stored layouts are kept PER BREAKPOINT, damit eine auf dem Desktop
  // gespeicherte Position nicht das Handy-Layout zerstört (und umgekehrt).
  var storedLayout = _getFlowLayoutForBp(project, _bp);
  var _GAP = _isMobile ? 24 : _isTablet ? 36 : 64;
  var _TW  = _isMobile ? 110 : _isTablet ? 136 : 168;
  var _NW  = _isMobile ? 150 : _isTablet ? 190 : 236;
  var _PAD = _isMobile ? 16 : _isTablet ? 30 : 60;
  var _defLayout;
  if (_isMobile) {
    // Handy-Layout: Alles UNTEREINANDER als vertikale Prozesskette.
    // Stages sind gestackt, Dienstleister-Karten liegen DIREKT UNTER ihrem Stage-Header.
    // y-Positionen werden dynamisch berechnet, abhängig davon wie viele
    // Dienstleister-Karten die vorherige Stage enthält (jede Karte ~240px hoch).
    var _STAGE_HDR_H = 108;   // Höhe Stage-Header-Node inkl. body
    var _CARD_H      = 240;   // durchschnittliche Höhe einer Provider-Karte (Banner+Meta+Actions)
    var _CARD_GAP    = 14;    // Abstand zwischen zwei Karten in einer Stage
    var _ROW_GAP     = 48;    // Abstand zwischen zwei Stage-Blöcken (inkl. Verbindungslinien-Platz)
    var _START_END_H = 170;   // Höhe der runden Start/End-Nodes

    function _mobileStageHeight(stageId) {
      var cnt = cards.filter(function(c){ return c.stage === stageId; }).length;
      var cardsBlock = cnt > 0 ? (_CARD_GAP + cnt * _CARD_H + (cnt - 1) * _CARD_GAP) : 0;
      return _STAGE_HDR_H + cardsBlock;
    }

    _defLayout = {};
    var _y = _PAD;
    _defLayout['start'] = { x: _PAD, y: _y };
    _y += _START_END_H + _ROW_GAP;
    ['geplant','kontaktiert','angebot','bestaetigt','abgeschlossen'].forEach(function(sid){
      _defLayout[sid] = { x: _PAD, y: _y };
      _y += _mobileStageHeight(sid) + _ROW_GAP;
    });
    _defLayout['end'] = { x: _PAD, y: _y };
  } else {
    _defLayout = {
      'start':         { x: _PAD,                                   y: _PAD },
      'geplant':       { x: _PAD + _TW + _GAP,                     y: _PAD },
      'kontaktiert':   { x: _PAD + _TW + _GAP + 1*(_NW+_GAP),     y: _PAD },
      'angebot':       { x: _PAD + _TW + _GAP + 2*(_NW+_GAP),     y: _PAD },
      'bestaetigt':    { x: _PAD + _TW + _GAP + 3*(_NW+_GAP),     y: _PAD },
      'abgeschlossen': { x: _PAD + _TW + _GAP + 4*(_NW+_GAP),     y: _PAD },
      'end':           { x: _PAD + _TW + _GAP + 5*(_NW+_GAP),     y: _PAD }
    };
  }
  function colStyle(id) {
    var p = storedLayout[id] || _defLayout[id] || { x: 60, y: 60 };
    return 'left:' + p.x + 'px;top:' + p.y + 'px';
  }

  var isPublic = !!project.isPublic;
  var html = '';

  // ── Toolbar ──────────────────────────────────────────────
  html += '<div class="flow-toolbar">';
  html += '<button class="flow-tbtn" onclick="flowZoom(-0.10)" title="Verkleinern (Ctrl + -)" aria-label="Verkleinern (Ctrl + -)"><span class="material-icons-round">remove</span></button>';
  html += '<span class="flow-zoom-pct" id="flowZoomPct" role="button" tabindex="0" title="Zoom-Prozent eingeben" onclick="flowZoomPrompt()">100%</span>';
  html += '<button class="flow-tbtn" onclick="flowZoom(0.10)" title="Vergrößern (Ctrl + +)" aria-label="Vergrößern (Ctrl + +)"><span class="material-icons-round">add</span></button>';
  html += '<div class="flow-tb-divider"></div>';
  html += '<button class="flow-tbtn" onclick="flowFitToScreen()" title="An Bildschirm anpassen" aria-label="An Bildschirm anpassen"><span class="material-icons-round">fit_screen</span></button>';
  html += '<button class="flow-tbtn" onclick="flowResetView()" title="Ansicht zurücksetzen" aria-label="Ansicht zurücksetzen"><span class="material-icons-round">center_focus_strong</span></button>';
  html += '<button class="flow-tbtn" id="flowFullscreenBtn" onclick="toggleFlowFullscreen()" title="Vollbild"><span class="material-icons-round" id="flowFullscreenIcon">fullscreen</span></button>';
  html += '<div class="flow-tb-divider"></div>';
  // Progress ring
  var circ = 2 * Math.PI * 15;
  var off  = circ * (1 - progressPct / 100);
  html += '<div class="flow-progress-ring" title="' + confirmedCount + '/' + cards.length + ' bestätigt (' + progressPct + '%)">';
  html += '<svg viewBox="0 0 40 40"><circle class="fpr-bg" cx="20" cy="20" r="15" fill="none" stroke-width="4"/>';
  html += '<circle class="fpr-fill" cx="20" cy="20" r="15" fill="none" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + circ.toFixed(2) + '" stroke-dashoffset="' + off.toFixed(2) + '"/></svg>';
  html += '<span class="fpr-label">' + progressPct + '%</span>';
  html += '</div>';
  html += '<div class="flow-tb-divider"></div>';
  html += '<button class="flow-visibility-pill' + (isPublic ? ' is-public' : '') + '" onclick="toggleFlowVisibility()" title="Sichtbarkeit umschalten">';
  html += '<span class="material-icons-round">' + (isPublic ? 'public' : 'lock') + '</span>' + (isPublic ? 'Öffentlich' : 'Privat');
  html += '</button>';
  if (isPublic) {
    html += '<button class="flow-tbtn" onclick="openFlowShareModal()" title="Teilen" aria-label="Teilen"><span class="material-icons-round">ios_share</span></button>';
  }
  html += '<button class="flow-tbtn" onclick="openAddProviderModalFlow(\'geplant\')" title="Dienstleister hinzufügen" aria-label="Dienstleister hinzufügen" style="background:rgba(255,56,92,0.18);border-color:rgba(255,56,92,0.4);color:#fff"><span class="material-icons-round">add</span></button>';
  html += '</div>';

  // ── Budget Overview Bar ──────────────────────────────────
  html += '<div class="flow-budget-bar">';
  html += '<div class="flow-budget-left">';
  html += '<span class="material-icons-round" style="color:' + budgetColor + '">account_balance_wallet</span>';
  html += '<div>';
  html += '<div class="flow-budget-title">Budget</div>';
  html += '<div class="flow-budget-num"><span style="color:' + budgetColor + '">' + spent.toLocaleString('de-DE') + ' €</span>';
  if (budget > 0) html += ' <span class="flow-budget-of">von ' + budget.toLocaleString('de-DE') + ' €</span>';
  html += '</div></div></div>';
  if (budget > 0) {
    html += '<div class="flow-budget-track"><div class="flow-budget-fill" style="width:' + pct + '%;background:' + budgetColor + '"></div></div>';
    html += '<div class="flow-budget-pct" style="color:' + budgetColor + '">' + pct + '%</div>';
  }
  html += '<button class="flow-budget-edit-btn" onclick="openFlowBudgetModal()" title="Budget bearbeiten">';
  html += '<span class="material-icons-round">edit</span></button>';
  html += '</div>';

  // ── Canvas (scroll container) + World (zoom target) ─────
  // Spacer-Div setzt die Scroll-Flaeche (visuelle Welt-Groesse nach Zoom),
  // OHNE den Canvas selbst aus seinem Flex-Slot herauswachsen zu lassen.
  // (Frueher: canvas.style.minHeight = wH*z + 600  =>  Canvas wurde > Parent
  // und sprengte das gesamte Page-Layout auf Mobile.)
  html += '<div class="flow-canvas" id="flowCanvas">';
  html += '<div class="flow-spacer" id="flowSpacer" aria-hidden="true"></div>';
  html += '<div class="flow-world" id="flowWorld">';
  html += '<svg class="flow-svg" id="flowSvg" xmlns="http://www.w3.org/2000/svg"></svg>';

  // Trigger node
  html += '<div class="flow-col" data-col-id="start" style="' + colStyle('start') + '">';
  html += '<div class="flow-node flow-node-trigger" data-nid="start" onclick="openFlowProjectModal()">';
  html += '<span class="material-icons-round" style="color:#FF385C;font-size:32px">celebration</span>';
  html += '<strong>' + esc(project.name || 'Event') + '</strong>';
  if (project.date) html += '<small>' + esc(project.date) + '</small>';
  html += '<span class="flow-node-edit-hint"><span class="material-icons-round" style="font-size:10px;vertical-align:middle">edit</span> Klicken zum Bearbeiten</span>';
  html += '</div>';
  html += '</div>';

  // Stage columns
  stagesMeta.forEach(function(stage) {
    var stageCards = cards.filter(function(c) { return c.stage === stage.id; });
    var stageBudget = stageCards.reduce(function(s, c) { return s + (parseFloat(c.price) || 0); }, 0);
    // Stage-Spalte ist Drop-Target fuer Provider-Karten
    html += '<div class="flow-col" data-col-id="' + stage.id + '"' +
            ' ondragover="_flowColDragOver(event,\'' + stage.id + '\')"' +
            ' ondragleave="_flowColDragLeave(event)"' +
            ' ondrop="_flowColDrop(event,\'' + stage.id + '\')"' +
            ' style="' + colStyle(stage.id) + '">';

    // Stage header node
    html += '<div class="flow-node flow-node-stage" data-nid="stage-' + stage.id + '">';
    html += '<div class="flow-node-hdr" style="background:' + stage.color + ';border-radius:12px 12px 0 0">';
    html += '<span class="material-icons-round">' + stage.icon + '</span>';
    html += '<span>' + stage.label + '</span>';
    if (stageCards.length) html += '<span class="flow-node-badge">' + stageCards.length + '</span>';
    html += '</div>';
    html += '<div class="flow-node-body">';
    if (stageCards.length) {
      html += '<div class="flow-node-cnt">' + stageCards.length + ' Dienstleister</div>';
      if (stageBudget > 0) html += '<div class="flow-node-budget-hint">Gesamt: ' + stageBudget.toLocaleString('de-DE') + ' €</div>';
    } else {
      html += '<span class="flow-node-empty">Noch leer</span>';
    }
    // "Hinzufügen" nur in der Start-Stage "geplant" anzeigen – alle weiteren
    // Stages werden systematisch durch Statuswechsel (Drag/Stage-Move) befüllt.
    if (stage.id === 'geplant') {
      html += '<button class="flow-node-add-btn" onclick="openAddProviderModalFlow(\'' + stage.id + '\')">';
      html += '<span class="material-icons-round">add</span> Hinzufügen</button>';
    }
    html += '</div>';
    html += '</div>';

    // Provider nodes
    stageCards.forEach(function(card) {
      var avatar = card.avatar || ebAvatar(card.name || 'user', card.name);
      var isConfirmed = !!card.confirmedByProvider;
      html += '<div class="flow-col-connector"></div>';
      // Provider-Karte: per HTML5-Drag in andere Stage-Spalten verschiebbar.
      html += '<div class="flow-node flow-node-provider' + (isConfirmed ? ' is-confirmed' : '') + '"' +
              ' draggable="true"' +
              ' ondragstart="_flowProvDragStart(event,\'' + esc(card.id) + '\')"' +
              ' ondragend="_flowProvDragEnd(event)"' +
              ' data-current-stage="' + stage.id + '"' +
              ' style="--stage-clr:' + stage.color + '" data-nid="card-' + esc(card.id) + '"' +
              ' onclick="openFlowCardModal(\'' + card.id + '\')">';
      if (isConfirmed) {
        html += '<span class="flow-confirm-badge confirmed"><span class="material-icons-round">verified</span>Bestätigt</span>';
      } else if (card.stage === 'angebot') {
        html += '<span class="flow-confirm-badge angebot"><span class="material-icons-round">check_circle</span>Angebot erhalten</span>';
      } else if (card.stage === 'kontaktiert') {
        html += '<span class="flow-confirm-badge pending"><span class="material-icons-round">hourglass_top</span>Warten auf Antwort</span>';
      }
      var _bImg = _cardListingImage(card);
      var _bTitle = _cardListingTitle(card);
      if (_bImg) {
        html += '<div class="flow-prov-banner" style="background-image:url(\''+esc(_bImg)+'\')"></div>';
        if (_bTitle) {
          html += '<div class="flow-prov-listing-title">' + esc(_bTitle) + '</div>';
        }
      }
      html += '<div class="flow-provider-inner">';
      html += '<img class="flow-prov-avatar" src="' + esc(avatar) + '" alt="' + esc(card.name || '') + '" onerror="this.onerror=null;this.src=ebAvatar(this.alt||\'user\',this.alt)" />';
      html += '<div class="flow-prov-info">';
      html += '<strong>' + esc(card.name) + '</strong>';
      html += '<small>' + esc(card.category || '') + '</small>';
      if (card.price) html += '<span class="flow-prov-price">' + parseFloat(card.price).toLocaleString('de-DE') + ' €</span>';
      if (card.startTime) html += '<span class="flow-prov-time"><span class="material-icons-round" style="font-size:11px">schedule</span>' + esc(card.startTime) + (card.endTime ? ' – ' + esc(card.endTime) : '') + '</span>';
      html += '</div>';
      html += '<div class="flow-prov-actions">';
      var _saLabels = {geplant:'Kontaktieren',angebot:'Erbringung bestätigen',bestaetigt:'Jetzt bezahlen'};
      var _saIcons  = {geplant:'forum',angebot:'verified',bestaetigt:'paid'};
      var _saColors = {geplant:'#42a5f5',angebot:'#FF385C',bestaetigt:'#00A699'};
      if (stage.id === 'kontaktiert') {
        // Locked: waiting for provider response
        html += '<button class="flow-prov-action-btn flow-prov-waiting" style="--sa-clr:#FF9800;opacity:0.85;cursor:default" onclick="event.stopPropagation();openStageAdvanceModal(\'' + card.id + '\',\'' + stage.id + '\')">';
        html += '<span class="material-icons-round">hourglass_top</span> Warten auf Antwort';
        html += '</button>';
      } else if (_saLabels[stage.id]) {
        html += '<button class="flow-prov-action-btn" style="--sa-clr:' + _saColors[stage.id] + '" onclick="event.stopPropagation();openStageAdvanceModal(\'' + card.id + '\',\'' + stage.id + '\')">';
        html += '<span class="material-icons-round">' + _saIcons[stage.id] + '</span> ' + _saLabels[stage.id];
        html += '</button>';
      }
      html += '<button class="flow-prov-btn flow-prov-move" onclick="event.stopPropagation();openStageMoveSheet(\'' + card.id + '\')" title="Stage \u00e4ndern"><span class="material-icons-round">low_priority</span> Verschieben</button>';
      var isPaid = !!(card.paymentIntentId || card.paymentReference || (card.paymentStatus && /paid|bezahlt/i.test(String(card.paymentStatus))));
      if (!isPaid) {
        html += '<button class="flow-prov-btn flow-prov-del" onclick="event.stopPropagation();deleteBoardCard(\'' + card.id + '\');renderBoardFlow()" title="Löschen"><span class="material-icons-round">close</span> Löschen</button>';
      }
      html += '</div>';
      html += '</div></div>';
    });

    html += '</div>'; // end flow-col
  });

  // End node
  html += '<div class="flow-col" data-col-id="end" style="' + colStyle('end') + '">';
  html += '<div class="flow-node flow-node-end" data-nid="end">';
  html += '<span class="material-icons-round" style="color:#4CAF50;font-size:32px">check_circle</span>';
  html += '<strong>Event fertig!</strong>';
  html += '<small>' + cards.filter(function(c){ return c.stage==='abgeschlossen'; }).length + ' abgeschlossen</small>';
  html += '</div>';
  html += '</div>';

  html += '</div>'; // end flow-world
  html += '</div>'; // end flow-canvas
  container.innerHTML = html;

  // Calc world size (max extents of all cols)
  var worldW = _defLayout['end'].x + _TW + _PAD;
  var worldH = _PAD * 2 + 200;
  Object.keys(storedLayout).forEach(function(k) {
    var p = storedLayout[k];
    if (p && typeof p.x === 'number') worldW = Math.max(worldW, p.x + _NW + _PAD);
    if (p && typeof p.y === 'number') worldH = Math.max(worldH, p.y + 200);
  });
  // Also account for stacked/horizontal provider cards per column
  stagesMeta.forEach(function(stage) {
    var cnt = cards.filter(function(c){ return c.stage===stage.id; }).length;
    var base = (storedLayout[stage.id] || _defLayout[stage.id]);
    if (_isMobile) {
      // Provider nodes stapeln sich UNTER dem Stage-Header (vertikale Prozesskette)
      worldW = Math.max(worldW, base.x + _NW + _PAD);
      worldH = Math.max(worldH, base.y + 108 + cnt * (240 + 14) + _PAD);
    } else {
      worldH = Math.max(worldH, base.y + 100 + cnt * 90 + _PAD);
    }
  });
  // End-Node unten auf Mobile berücksichtigen
  if (_isMobile) {
    worldH = Math.max(worldH, _defLayout['end'].y + 190);
    worldW = Math.max(worldW, _PAD + _NW + _PAD);
  }

  var worldEl = document.getElementById('flowWorld');
  if (worldEl) {
    worldEl.style.width  = worldW + 'px';
    worldEl.style.height = worldH + 'px';
    worldEl.dataset.worldW = worldW;
    worldEl.dataset.worldH = worldH;
  }
  // Apply current zoom (preserves user's zoom across re-renders)
  _flowApplyZoom(_flowZoom, true);

  requestAnimationFrame(function() {
    // ── Welt-Groesse anhand der echten DOM-Ausdehnung korrigieren ──
    // Die Schaetzung oben kennt die tatsaechliche Breite einer .flow-col
    // (inkl. Stage-Header + ggf. horizontaler Provider-Karten im Mobile-Modus
    // oder abweichender Inhalte) nicht. Wir messen hier die reale Box und
    // setzen worldW/H exakt darauf, damit Fit- und Pan-Grenzen stimmen.
    var worldElM = document.getElementById('flowWorld');
    var canvasEl = document.getElementById('flowCanvas');

    // ── Mobile: Y-Positionen ANHAND DER ECHTEN KARTENHÖHEN neu setzen ──
    // So überlappen Provider-Karten nie die nächste Stage, und die geraden
    // Verbindungslinien laufen sauber zwischen den Spalten.
    if (_isMobile && worldElM) {
      var mobileOrder = ['start','geplant','kontaktiert','angebot','bestaetigt','abgeschlossen','end'];
      var mobileGap   = 40; // Abstand für Verbindungslinie + Pfeil zwischen zwei Spalten
      var yCursor = _PAD;
      // ALLE Spalten auf Mobile linksbuendig (gleiches X) untereinander.
      // So bilden Start (XYZ) + alle Stages + End (Event abgeschlossen)
      // eine vertikale Linie auf der linken Seite.
      var leftX = _PAD;
      mobileOrder.forEach(function(cid){
        var col = worldElM.querySelector('[data-col-id="' + cid + '"]');
        if (!col) return;
        col.style.left = leftX + 'px';
        col.style.top  = yCursor + 'px';
        // Nach dem Positionieren die tatsächliche Höhe messen
        var h = col.offsetHeight || 120;
        yCursor += h + mobileGap;
      });
    }

    if (worldElM) {
      var cols = worldElM.querySelectorAll('[data-col-id]');
      var maxR = 0, maxB = 0;
      cols.forEach(function(col){
        var l = parseFloat(col.style.left) || col.offsetLeft || 0;
        var t = parseFloat(col.style.top)  || col.offsetTop  || 0;
        var r = l + col.offsetWidth;
        var b = t + col.offsetHeight;
        if (r > maxR) maxR = r;
        if (b > maxB) maxB = b;
      });
      // Kleiner Rand rechts/unten, damit nichts an der Kante klebt
      var PAD_R = 40, PAD_B = _isMobile ? 24 : 40;
      var measuredW, measuredH;
      if (_isMobile && canvasEl) {
        // Mobile: Weltbreite = Canvasbreite (kein horizontaler Scroll,
        // Welt richtet sich nach Inhalt/Viewport, nicht endlos in die Breite)
        measuredW = canvasEl.clientWidth;
        // WICHTIG: Auf Mobile NICHT mit dem (Desktop-)Initial-Wert maxen –
        // das wuerde unten viel Leerraum erzeugen. Stattdessen exakt die
        // gemessene Inhalts-Hoehe + kleiner Bottom-Pad nehmen.
        measuredH = maxB + PAD_B;
      } else {
        measuredW = Math.max(maxR + PAD_R, parseFloat(worldElM.dataset.worldW) || 0);
        measuredH = Math.max(maxB + PAD_B, parseFloat(worldElM.dataset.worldH) || 0);
      }
      worldElM.dataset.worldW = measuredW;
      worldElM.dataset.worldH = measuredH;
      // Basisgroesse (vor transform) setzen – _flowApplyZoom skaliert das dann.
      worldElM.style.width  = measuredW + 'px';
      worldElM.style.height = measuredH + 'px';
      // WICHTIG: Nach der echten Vermessung Zoom NEU anwenden, damit
      // canvas.minHeight die TATSAECHLICHE Welt-Hoehe widerspiegelt.
      // Sonst bleibt die Scroll-Range auf der zu kleinen ersten Schaetzung
      // haengen und man kann auf Handy nicht bis ganz nach unten scrollen.
      try { _flowApplyZoom(_flowZoom, true); } catch(_) {}
    }
    _drawFlowConnections(); _initFlowZoomPan();
    // Auf Mobile IMMER neu fitten + zum Start scrollen, damit der Nutzer
    // den Start-Node sofort im Fokus hat (und nicht im leeren Raum landet).
    if (_isMobile) {
      requestAnimationFrame(function(){
        setTimeout(function(){
          try { flowFitToScreen(); } catch(_) {}
          try {
            var cvs = document.getElementById('flowCanvas');
            if (cvs) { cvs.scrollLeft = 0; cvs.scrollTop = 0; }
            if (_flowFittedFor !== _activeBoardId) {
              _flowFittedFor = _activeBoardId;
              var startEl = document.querySelector('[data-nid="start"]');
              if (startEl) {
                startEl.classList.add('flow-focus-pulse');
                setTimeout(function(){ startEl.classList.remove('flow-focus-pulse'); }, 1600);
              }
            }
          } catch(_) {}
        }, 60);
      });
      return;
    }
    // Desktop: nur beim ersten Öffnen eines Projekts automatisch fitten.
    if (_flowFittedFor !== _activeBoardId) {
      _flowFittedFor = _activeBoardId;
      requestAnimationFrame(function(){
        setTimeout(function(){
          try { flowFitToScreen(); } catch(_) {}
          try {
            var cvs = document.getElementById('flowCanvas');
            if (cvs) { cvs.scrollLeft = 0; cvs.scrollTop = 0; }
            var startEl = document.querySelector('[data-nid="start"]');
            if (startEl) {
              startEl.classList.add('flow-focus-pulse');
              setTimeout(function(){ startEl.classList.remove('flow-focus-pulse'); }, 1600);
            }
          } catch(_) {}
        }, 60);
      });
    } else {
      _flowApplyZoom(_flowZoom, true);
    }
  });
}

/* ─── Flow view extra modals ─────────────────────────────── */
function openFlowProjectModal() {
  if (!_activeBoardId) return;
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;
  var html = '<div class="modal-overlay show" id="flowProjectModal" onclick="closeModalOnOverlay(event)" style="z-index:2000">' +
    '<div class="modal modal-sm" onclick="event.stopPropagation()">' +
    '<button class="modal-close" aria-label="Schließen" onclick="document.getElementById(\'flowProjectModal\').remove()"><span class="material-icons-round">close</span></button>' +
    '<div class="modal-header"><span class="material-icons-round modal-icon" style="color:var(--primary)">celebration</span>' +
    '<h2>Event bearbeiten</h2></div>' +
    '<form class="modal-form" onsubmit="_saveFlowProject(event)">' +
    '<div class="form-group"><label>Event-Name</label><input type="text" id="fpName" value="' + _escHtml(project.name) + '" required /></div>' +
    '<div class="form-group"><label>Datum</label><input type="text" id="fpDate" placeholder="TT.MM.JJJJ" autocomplete="off" value="' + _escHtml(_toIsoDate(project.date) || '') + '" /></div>' +
    '<div class="form-group"><label>Budget (€)</label><input type="number" id="fpBudget" value="' + (project.budget || '') + '" min="0" step="100" /></div>' +
    '<button type="submit" class="btn-primary btn-block"><span class="material-icons-round">save</span> Speichern</button>' +
    '<button type="button" class="btn-outline btn-block" style="margin-top:8px;border-color:#f44336;color:#f44336" onclick="_deleteFlowProject()">' +
    '<span class="material-icons-round">delete</span> Projekt löschen</button>' +
    '</form></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
  // Deutsches Datumsformat (TT.MM.JJJJ) mit Kalender.
  _attachGermanDatePicker('#fpDate');
}
function _saveFlowProject(event) {
  event.preventDefault();
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;
  project.name   = document.getElementById('fpName').value.trim() || project.name;
  project.date   = document.getElementById('fpDate').value.trim();
  project.budget = parseFloat(document.getElementById('fpBudget').value) || 0;
  _saveBoardProjects();
  document.getElementById('flowProjectModal') && document.getElementById('flowProjectModal').remove();
  renderBoardFlow();
  document.getElementById('boardEventName') && (document.getElementById('boardEventName').textContent = project.name);
  document.getElementById('boardEventDate') && (document.getElementById('boardEventDate').textContent = project.date ? new Date(project.date + 'T00:00:00').toLocaleDateString('de-DE', {day:'2-digit',month:'long',year:'numeric'}) : 'Datum noch offen');
  document.getElementById('statBudget') && (document.getElementById('statBudget').textContent = (project.budget || 0).toLocaleString('de-DE') + ' €');
}
function _deleteFlowProject() {
  if (!_activeBoardId) return;
  if (!confirm('Projekt wirklich löschen?')) return;
  var deletedId = _activeBoardId;
  _boardProjects = _boardProjects.filter(function(p) { return p.id !== deletedId; });
  _addBoardTombstone(deletedId);
  _saveBoardProjects({ immediate: true });
  document.getElementById('flowProjectModal') && document.getElementById('flowProjectModal').remove();
  showBoardProjects();
}

function openFlowBudgetModal() {
  if (!_activeBoardId) return;
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;
  var cards = project.cards || [];
  var budget = parseFloat(project.budget) || 0;
  var spent  = cards.reduce(function(s, c) { return s + (parseFloat(c.price) || 0); }, 0);
  var remaining = budget - spent;

  // Per-stage breakdown
  var stagesMeta = [
    { id: 'geplant', label: 'Geplant', color: '#9E9E9E' },
    { id: 'kontaktiert', label: 'Kontaktiert', color: '#FF9800' },
    { id: 'angebot', label: 'Gebucht', color: '#AB47BC' },
    { id: 'bestaetigt', label: 'Erfüllt', color: '#FF385C' },
    { id: 'abgeschlossen', label: 'Bezahlt', color: '#00A699' }
  ];

  var breakdown = stagesMeta.map(function(s) {
    var sc = cards.filter(function(c) { return c.stage === s.id; });
    var sum = sc.reduce(function(a, c) { return a + (parseFloat(c.price) || 0); }, 0);
    if (!sc.length) return '';
    var bPct = budget > 0 ? Math.min(100, Math.round(sum / budget * 100)) : 0;
    return '<div class="flow-bm-row">' +
      '<span class="flow-bm-dot" style="background:' + s.color + '"></span>' +
      '<span class="flow-bm-label">' + s.label + '</span>' +
      '<div class="flow-bm-track"><div class="flow-bm-fill" style="width:' + bPct + '%;background:' + s.color + '"></div></div>' +
      '<span class="flow-bm-val">' + sum.toLocaleString('de-DE') + ' €</span>' +
      '</div>';
  }).join('');

  var cardRows = cards.map(function(c) {
    return '<div class="flow-bm-card-row">' +
      '<span class="flow-bm-card-name">' + _escHtml(c.name) + '</span>' +
      '<span class="flow-bm-card-cat">' + _escHtml(c.category || '') + '</span>' +
      '<input class="flow-bm-card-price" type="number" value="' + (c.price || 0) + '" min="0" step="1" data-cid="' + c.id + '" oninput="_liveUpdateBudget()" />' +
      '<span class="flow-bm-eur">€</span>' +
      '</div>';
  }).join('') || '<div style="color:var(--text-light);font-style:italic;text-align:center;padding:12px">Noch keine Dienstleister in diesem Projekt</div>';

  var pct = budget > 0 ? Math.min(100, Math.round(spent / budget * 100)) : 0;
  var col = pct >= 100 ? '#FF385C' : pct >= 80 ? '#FF9800' : '#00A699';

  var html = '<div class="modal-overlay show" id="flowBudgetModal" onclick="closeModalOnOverlay(event)" style="z-index:2000">' +
    '<div class="modal" onclick="event.stopPropagation()" style="max-width:520px">' +
    '<button class="modal-close" aria-label="Schließen" onclick="document.getElementById(\'flowBudgetModal\').remove()"><span class="material-icons-round">close</span></button>' +
    '<div class="modal-header"><span class="material-icons-round modal-icon" style="color:' + col + '">account_balance_wallet</span>' +
    '<h2>Budget-Übersicht</h2></div>' +
    '<div class="flow-bm-summary">' +
    '<div class="flow-bm-big"><span class="flow-bm-spent" style="color:' + col + '">' + spent.toLocaleString('de-DE') + ' €</span>' +
    '<span class="flow-bm-divider">/</span>' +
    '<input class="flow-bm-total-input" type="number" id="bmTotalBudget" value="' + (budget || '') + '" min="0" step="100" placeholder="Budget festlegen" oninput="_liveUpdateBudget()" />' +
    '<span class="flow-bm-eur2">€ gesamt</span></div>' +
    '<div class="flow-bm-bar"><div class="flow-bm-bar-fill" id="bmBarFill" style="width:' + pct + '%;background:' + col + '"></div></div>' +
    '<div class="flow-bm-labels"><span style="color:' + col + '">' + pct + '% genutzt</span>' +
    (budget > 0 ? '<span>' + (remaining >= 0 ? remaining.toLocaleString('de-DE') + ' € verbleibend' : Math.abs(remaining).toLocaleString('de-DE') + ' € überzogen') + '</span>' : '') +
    '</div></div>' +
    (breakdown ? '<div class="flow-bm-breakdown">' + breakdown + '</div>' : '') +
    '<div class="flow-bm-cards">' +
    '<div class="flow-bm-cards-title"><span class="material-icons-round">format_list_bulleted</span> Einzelne Posten bearbeiten</div>' +
    cardRows +
    '</div>' +
    '<div style="display:flex;gap:10px;margin-top:16px">' +
    '<button class="btn-primary btn-block" onclick="_saveBudgetModal()"><span class="material-icons-round">save</span> Speichern</button>' +
    '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}

function _liveUpdateBudget() {
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;
  // update individual card prices inline
  document.querySelectorAll('.flow-bm-card-price').forEach(function(inp) {
    var cid = inp.dataset.cid;
    var card = (project.cards || []).find(function(c) { return c.id === cid; });
    if (card) card.price = parseFloat(inp.value) || 0;
  });
  var budget = parseFloat(document.getElementById('bmTotalBudget') ? document.getElementById('bmTotalBudget').value : 0) || 0;
  var spent  = (project.cards || []).reduce(function(s,c) { return s + (parseFloat(c.price)||0); }, 0);
  var pct = budget > 0 ? Math.min(100, Math.round(spent / budget * 100)) : 0;
  var col = pct >= 100 ? '#FF385C' : pct >= 80 ? '#FF9800' : '#00A699';
  var fill = document.getElementById('bmBarFill');
  if (fill) { fill.style.width = pct + '%'; fill.style.background = col; }
}

function _saveBudgetModal() {
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;
  // save card prices
  document.querySelectorAll('.flow-bm-card-price').forEach(function(inp) {
    var cid = inp.dataset.cid;
    var card = (project.cards || []).find(function(c) { return c.id === cid; });
    if (card) card.price = parseFloat(inp.value) || 0;
  });
  var budgetInput = document.getElementById('bmTotalBudget');
  if (budgetInput) project.budget = parseFloat(budgetInput.value) || 0;
  _saveBoardProjects();
  document.getElementById('flowBudgetModal') && document.getElementById('flowBudgetModal').remove();
  renderBoardFlow();
  _updateBoardStats(project);
  showToast('Budget gespeichert!', 'check_circle');
}

// ============= Zeit-Picker (Zeitraum + Presets + Stepper) =============
window._buildTimePicker = function(startId, endId, startVal, endVal) {
  var sv = startVal || '10:00';
  var ev = endVal || '';
  var presets = [
    { key:'morning',   icon:'wb_twilight',   label:'Vormittag',   hint:'09–12',  s:'09:00', e:'12:00' },
    { key:'afternoon', icon:'light_mode',    label:'Nachmittag',  hint:'13–17',  s:'13:00', e:'17:00' },
    { key:'evening',   icon:'nights_stay',   label:'Abend',       hint:'18–22',  s:'18:00', e:'22:00' },
    { key:'night',     icon:'dark_mode',     label:'Nacht',       hint:'22–02',  s:'22:00', e:'02:00' },
    { key:'allday',    icon:'event_available',label:'Ganztags',   hint:'10–22',  s:'10:00', e:'22:00' }
  ];
  var presetsHtml = presets.map(function(p){
    return '<button type="button" class="eb-tp-preset" data-s="'+p.s+'" data-e="'+p.e+'" onclick="_tpApplyPreset(\''+startId+'\',\''+endId+'\',\''+p.s+'\',\''+p.e+'\',this)">' +
      '<span class="material-icons-round">'+p.icon+'</span>' +
      '<span class="eb-tp-preset-lbl">'+p.label+'</span>' +
      '<span class="eb-tp-preset-hint">'+p.hint+'</span>' +
    '</button>';
  }).join('');
  return '<div class="eb-tp">' +
    '<div class="eb-tp-presets">' + presetsHtml + '</div>' +
    '<div class="eb-tp-range">' +
      '<div class="eb-tp-field">' +
        '<span class="eb-tp-lbl"><span class="material-icons-round">play_arrow</span>Start</span>' +
        '<div class="eb-tp-iw">' +
          '<button type="button" class="eb-tp-step" aria-label="-30 Min" onclick="_tpStep(\''+startId+'\',-30,\''+startId+'\',\''+endId+'\')">−</button>' +
          '<input type="time" id="'+startId+'" class="eb-tp-time" value="'+sv+'" oninput="_tpUpdateDur(\''+startId+'\',\''+endId+'\')" />' +
          '<button type="button" class="eb-tp-step" aria-label="+30 Min" onclick="_tpStep(\''+startId+'\',30,\''+startId+'\',\''+endId+'\')">+</button>' +
        '</div>' +
      '</div>' +
      '<span class="eb-tp-arrow material-icons-round">arrow_right_alt</span>' +
      '<div class="eb-tp-field">' +
        '<span class="eb-tp-lbl"><span class="material-icons-round">stop</span>Ende <em>(optional)</em></span>' +
        '<div class="eb-tp-iw">' +
          '<button type="button" class="eb-tp-step" aria-label="-30 Min" onclick="_tpStep(\''+endId+'\',-30,\''+startId+'\',\''+endId+'\')">−</button>' +
          '<input type="time" id="'+endId+'" class="eb-tp-time" value="'+ev+'" placeholder="--:--" oninput="_tpUpdateDur(\''+startId+'\',\''+endId+'\')" />' +
          '<button type="button" class="eb-tp-step" aria-label="+30 Min" onclick="_tpStep(\''+endId+'\',30,\''+startId+'\',\''+endId+'\')">+</button>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="eb-tp-dur" id="'+startId+'_dur"><span class="material-icons-round">hourglass_empty</span><span>Kein Endzeitpunkt</span></div>' +
  '</div>';
};

window._tpApplyPreset = function(sId, eId, s, e, btn) {
  var si = document.getElementById(sId), ei = document.getElementById(eId);
  if (si) si.value = s;
  if (ei) ei.value = e;
  // visual active state
  if (btn) {
    var grp = btn.parentElement;
    if (grp) grp.querySelectorAll('.eb-tp-preset').forEach(function(b){ b.classList.remove('is-active'); });
    btn.classList.add('is-active');
  }
  _tpUpdateDur(sId, eId);
};

window._tpStep = function(id, minutes, sId, eId) {
  var el = document.getElementById(id);
  if (!el) return;
  var v = el.value || '10:00';
  var parts = v.split(':');
  var total = (parseInt(parts[0],10)||0)*60 + (parseInt(parts[1],10)||0) + minutes;
  total = ((total % (24*60)) + (24*60)) % (24*60);
  var hh = Math.floor(total/60), mm = total%60;
  el.value = (hh<10?'0':'')+hh + ':' + (mm<10?'0':'')+mm;
  _tpUpdateDur(sId || id, eId || '');
  // clear preset highlight
  var tp = el.closest('.eb-tp');
  if (tp) tp.querySelectorAll('.eb-tp-preset.is-active').forEach(function(b){ b.classList.remove('is-active'); });
};

window._tpUpdateDur = function(sId, eId) {
  var dur = document.getElementById(sId+'_dur');
  if (!dur) return;
  var si = document.getElementById(sId), ei = document.getElementById(eId);
  var sv = si ? si.value : '', ev = ei ? ei.value : '';
  if (!sv || !ev) {
    dur.innerHTML = '<span class="material-icons-round">hourglass_empty</span><span>Kein Endzeitpunkt</span>';
    dur.classList.remove('is-set');
    return;
  }
  var sp = sv.split(':'), ep = ev.split(':');
  var sm = (+sp[0])*60 + (+sp[1]);
  var em = (+ep[0])*60 + (+ep[1]);
  var diff = em - sm;
  if (diff <= 0) diff += 24*60; // wrap past midnight
  var h = Math.floor(diff/60), m = diff%60;
  var txt = (h?h+' Std ':'') + (m?m+' Min':(h?'':'0 Min'));
  dur.innerHTML = '<span class="material-icons-round">schedule</span><span>Dauer: <strong>'+txt+'</strong></span>';
  dur.classList.add('is-set');
};

function openFlowCardModal(cardId) {
  if (!_activeBoardId) return;
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;
  var card = (project.cards || []).find(function(c) { return c.id === cardId; });
  if (!card) return;

  // Zahlung erkannt? → Preis & Stage sperren, Bezahlt-Info anzeigen
  var _isPaid = !!(card.paymentIntentId || card.paymentReference ||
    (card.paymentStatus && /paid|bezahlt/i.test(String(card.paymentStatus))));
  var _paidAmount = (typeof card.paidAmount === 'number' && card.paidAmount > 0)
    ? card.paidAmount
    : (parseFloat(card.price) || 0);

  // Selbst-Heilung: wenn bezahlt und card.price weicht vom bezahlten Betrag ab
  // (z.B. manuell verfälscht, bevor der Lock griff), Preis wieder auf den
  // tatsächlich bezahlten Betrag korrigieren. Stripe ist Quelle der Wahrheit.
  if (_isPaid && typeof card.paidAmount === 'number' && card.paidAmount > 0) {
    var _curPrice = parseFloat(card.price);
    if (!isFinite(_curPrice) || Math.abs(_curPrice - card.paidAmount) > 0.001) {
      card.price = card.paidAmount;
      try { _saveBoardProjects && _saveBoardProjects(); } catch(e) {}
    }
  }
  // Wenn bezahlt aber kein paidAmount auf der Karte (Karte aus Zeit vor dem
  // Fix): einmalig mit Stripe abgleichen – Webhook-Daten füllen die Felder.
  if (_isPaid && (typeof card.paidAmount !== 'number' || card.paidAmount <= 0)) {
    try {
      if (typeof _reconcileStripePayments === 'function') {
        _reconcileStripePayments().then(function(){
          // Modal neu öffnen, damit der korrigierte Betrag erscheint
          var open = document.getElementById('flowCardModal');
          if (open) { open.remove(); openFlowCardModal(cardId); }
        });
      }
    } catch(e) {}
  }
  var _paidAtIso = card.paidAt || card.bookedAt || card.invoiceSentAt || '';
  var _paidAtHuman = '';
  if (_paidAtIso) {
    try {
      _paidAtHuman = new Date(_paidAtIso).toLocaleString('de-DE', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch(e) { _paidAtHuman = _paidAtIso; }
  }
  var _piId = card.paymentIntentId || card.paymentReference || '';
  var _paidBlock = _isPaid
    ? '<div class="fc-paid-block">' +
        '<div class="fc-paid-head">' +
          '<span class="material-icons-round">verified</span>' +
          '<div>' +
            '<strong>Zahlung erhalten</strong>' +
            '<small>Diese Buchung ist sicher \u00fcber Stripe abgeschlossen.</small>' +
          '</div>' +
        '</div>' +
        '<div class="fc-paid-grid">' +
          '<div><span>Betrag</span><strong>' + _escHtml(_formatEuro(_paidAmount)) + '</strong></div>' +
          (_paidAtHuman ? '<div><span>Bezahlt am</span><strong>' + _escHtml(_paidAtHuman) + '</strong></div>' : '') +
          (_piId ? '<div class="fc-paid-pi"><span>Zahlungs-ID</span><code>' + _escHtml(_piId) + '</code></div>' : '') +
        '</div>' +
        (_piId && /^pi_/.test(_piId)
          ? '<a class="fc-paid-stripe-link" href="https://dashboard.stripe.com/payments/' + _escHtml(_piId) + '" target="_blank" rel="noopener">' +
              '<span class="material-icons-round">open_in_new</span> Beleg in Stripe ansehen' +
            '</a>'
          : '') +
      '</div>'
    : '';

  var stageOptions = [
    { id: 'geplant', label: 'Geplant' }, { id: 'kontaktiert', label: 'Kontaktiert' },
    { id: 'angebot', label: 'Gebucht' }, { id: 'bestaetigt', label: 'Erfüllt' },
    { id: 'abgeschlossen', label: 'Bezahlt' }
  ].map(function(s) {
    return '<option value="' + s.id + '"' + (s.id === card.stage ? ' selected' : '') + '>' + s.label + '</option>';
  }).join('');

  // Preis nach Zahlung gesperrt; readOnly statt disabled, damit der Wert
  // beim Speichern weiterhin gelesen werden kann
  var _priceField = _isPaid
    ? '<div class="form-group"><label>Preis (€) <span class="fc-locked-hint"><span class="material-icons-round">lock</span> nach Zahlung gesperrt</span></label>' +
        '<input type="number" id="fcPrice" value="' + _paidAmount + '" readonly /></div>'
    : '<div class="form-group"><label>Preis (€)</label><input type="number" id="fcPrice" value="' + (card.price || '') + '" min="0" step="1" /></div>';

  // Nach einer Zahlung ist die Stage unveränderlich. Vorab bezahlte Karten
  // bleiben bis zur beidseitigen Erfüllungsbestätigung unter „Gebucht“.
  var _stageField = _isPaid
    ? (function() {
        return '<div class="form-group"><label>Status / Stage <span class="fc-locked-hint"><span class="material-icons-round">lock</span> Zahlung abgeschlossen</span></label>' +
          '<select id="fcStage" disabled><option value="' + _escHtml(card.stage) + '">' +
            _escHtml((FLOW_STAGE_LABELS && FLOW_STAGE_LABELS[card.stage]) || card.stage) +
          '</option></select></div>';
      })()
    : '<div class="form-group"><label>Status / Stage</label><select id="fcStage">' + stageOptions + '</select></div>';

  // "Entfernen"-Button nach Zahlung versteckt (kein verfälschen der Buchhaltung)
  var _deleteBtn = _isPaid
    ? ''
    : '<button type="button" class="btn-outline btn-block" style="margin-top:8px;color:#f44336;border-color:#f44336" onclick="deleteBoardCard(\'' + cardId + '\');renderBoardFlow();document.getElementById(\'flowCardModal\').remove()">' +
        '<span class="material-icons-round">delete</span> Dienstleister entfernen</button>';

  var html = '<div class="modal-overlay show" id="flowCardModal" onclick="closeModalOnOverlay(event)" style="z-index:2000">' +
    '<div class="modal modal-sm" onclick="event.stopPropagation()">' +
    '<button class="modal-close" aria-label="Schließen" onclick="document.getElementById(\'flowCardModal\').remove()"><span class="material-icons-round">close</span></button>' +
    '<div class="modal-header"><span class="material-icons-round modal-icon">edit</span><h2>' + _escHtml(card.name) + '</h2></div>' +
    _paidBlock +
    '<form class="modal-form" onsubmit="_saveFlowCard(event,\'' + cardId + '\')">' +
    '<div class="form-group"><label>Name</label><input type="text" id="fcName" value="' + _escHtml(card.name) + '" required /></div>' +
    '<div class="form-group"><label>Kategorie</label><input type="text" id="fcCat" value="' + _escHtml(card.category || '') + '" /></div>' +
    _priceField +
    '<div class="form-group"><label>Uhrzeit am Eventtag</label>' + window._buildTimePicker('fcTime','fcTimeEnd', card.startTime || '10:00', card.endTime || '') + '</div>' +
    _stageField +
    '<div class="form-group"><label>Notiz</label><textarea id="fcNote" rows="3">' + _escHtml(card.note || '') + '</textarea></div>' +
    '<button type="submit" class="btn-primary btn-block"><span class="material-icons-round">save</span> Speichern</button>' +
    _deleteBtn +
    '</form></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}

function _saveFlowCard(event, cardId) {
  event.preventDefault();
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;
  var card = (project.cards || []).find(function(c) { return c.id === cardId; });
  if (!card) return;
  card.name      = document.getElementById('fcName').value.trim();
  card.category  = document.getElementById('fcCat').value.trim();

  // Preis: nach Zahlung NICHT mehr überschreiben (Schutz gegen Verfälschung)
  var _isPaid = !!(card.paymentIntentId || card.paymentReference ||
    (card.paymentStatus && /paid|bezahlt/i.test(String(card.paymentStatus))));
  if (!_isPaid) {
    card.price = parseFloat(document.getElementById('fcPrice').value) || 0;
  }

  card.startTime = document.getElementById('fcTime').value;
  card.endTime   = document.getElementById('fcTimeEnd') ? document.getElementById('fcTimeEnd').value : '';
  var _newStage = document.getElementById('fcStage').value;
  if (_isPaid) {
    // Zahlungsstatus und Prozessstand dürfen nicht manuell verfälscht werden.
    card.stage = card.stage;
  } else if (typeof _PROTECTED_STAGES !== 'undefined' && _PROTECTED_STAGES.indexOf(_newStage) !== -1 && card.stage !== _newStage) {
    showToast(_protectedStageMessage(_newStage), 'warning');
  } else {
    card.stage = _newStage;
  }
  card.note      = document.getElementById('fcNote').value.trim();
  _saveBoardProjects();
  document.getElementById('flowCardModal') && document.getElementById('flowCardModal').remove();
  renderBoardFlow();
  renderKanban(project);
  _updateBoardStats(project);
}

function openAddProviderModalFlow(stage) {
  openAddProviderModal(stage);
  // patch the submit handler to also refresh the flow view
  var originalForm = document.querySelector('#addProviderModal form');
  if (originalForm) {
    var origSubmit = originalForm.onsubmit;
    originalForm.onsubmit = function(e) {
      var result = origSubmit ? origSubmit.call(this, e) : null;
      setTimeout(function() { if (document.getElementById('boardFlowView') && document.getElementById('boardFlowView').style.display !== 'none') renderBoardFlow(); }, 50);
      return result;
    };
  }
}

function moveBoardCardStage(cardId, currentStage) {
  var stagesOrder = ['geplant','kontaktiert','angebot','bestaetigt','abgeschlossen'];
  var idx = stagesOrder.indexOf(currentStage);
  var nextStage = stagesOrder[(idx + 1) % stagesOrder.length];
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;
  var card = (project.cards || []).find(function(c) { return c.id === cardId; });
  if (!card) return;
  // Geschützte Stages dürfen nicht per Schnell-Move erreicht werden – der
  // Übergang muss über den offiziellen Aktions-/Payment-Flow erfolgen
  // (Anbieter-Annahme, beidseitige Bestätigung). Sonst könnte ein User
  // einfach durchklicken, ohne dass der Dienstleister geantwortet hat.
  if (typeof _PROTECTED_STAGES !== 'undefined' && _PROTECTED_STAGES.indexOf(nextStage) !== -1) {
    showToast(_protectedStageMessage(nextStage), 'warning');
    return;
  }
  card.stage = nextStage;
  _saveBoardProjects();
  renderBoardFlow();
  renderKanban(project);
  _updateBoardStats(project);
}

/* ── Rechnungs-/Buchungs-Benachrichtigung senden ──
 * Schickt eine HTML-Mail mit allen Details an User, Anbieter und
 * kontakt@eventbörse.de – für volle Transparenz der Transaktion.
 * Stripe-Integration folgt; diese Mail fungiert bis dahin als
 * "Buchungs-Bestätigung / Rechnungs-Anforderung".
 */
function _sendInvoiceNotification(card, project, listing) {
  try {
    var providerId = (listing && listing.providerId) || card.providerId || 0;
    var payload = {
      card_id: card.id || '',
      project_id: project && project.id || '',
      project_name: (project && project.name) || '',
      event_date: (project && project.date) || '',
      listing_id: (listing && (listing._dbId || listing.id)) || card.listingId || 0,
      listing_title: (listing && listing.title) || card.name || '',
      provider_user_id: providerId,
      price: parseFloat(card.price) || 0,
      note: card.bookingNote || ''
    };
    return fetch(_apiUrl('send-invoice'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: _apiHeaders(),
      body: JSON.stringify(payload)
    }).then(function(r){ if (!r.ok) throw new Error('invoice'); return r.json(); });
  } catch (e) {
    return Promise.reject(e);
  }
}
