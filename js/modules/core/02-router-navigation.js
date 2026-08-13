// ========== SPA PATH HELPERS ==========
var _spaBase = (typeof eventboerseApi !== 'undefined' && eventboerseApi.siteUrl)
  ? new URL(eventboerseApi.siteUrl).pathname.replace(/\/+$/, '')
  : '';

function _spaPath(page, data) {
  if (!page || page === 'browse') return _spaBase + '/';
  return _spaBase + '/' + page + (data ? '/' + data : '');
}

function _readSpaRoute() {
  // First check for legacy hash routes and convert them
  var hash = window.location.hash.replace(/^#/, '');
  if (hash) {
    var parts = hash.split('/');
    return { page: parts[0] || 'browse', data: parts[1] ? (isNaN(parts[1]) ? parts[1] : parseInt(parts[1])) : null };
  }
  // Read from pathname
  var path = window.location.pathname;
  if (_spaBase) path = path.replace(new RegExp('^' + _spaBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '');
  path = path.replace(/^\/+|\/+$/g, '');
  if (!path) return { page: 'browse', data: null };
  var parts = path.split('/');
  var pg = parts[0] || 'browse';
  var dt = parts[1] ? (isNaN(parts[1]) ? parts[1] : parseInt(parts[1])) : null;
  return { page: pg, data: dt };
}

// Setzt document.title + meta[description] je SPA-Route (#4c). Templates
// spiegeln die Server-Vorlagen in index.php für Konsistenz.
function _setPageMeta(page, data) {
  var base = 'EventBörse';
  var title = base + ' – Dein Event-Marktplatz';
  var desc  = 'Finde DJs, Catering, Fotografen, Locations und mehr für dein nächstes Event.';
  switch (page) {
    case 'browse': title = 'Dienstleister entdecken – ' + base; break;
    case 'detail':
      if (currentListing && currentListing.title) {
        var cat = currentListing.categoryLabel || currentListing.category || '';
        title = currentListing.title + (cat ? ' – ' + cat : '') + ' | ' + base;
        if (currentListing.description) {
          desc = String(currentListing.description).replace(/<[^>]*>/g, '').trim().slice(0, 155);
        }
      }
      break;
    case 'board':    title = 'Eventboard – ' + base; break;
    case 'chat':     title = 'Nachrichten – ' + base; break;
    case 'messages': title = 'Nachrichten – ' + base; break;
    case 'profile':  title = 'Profil – ' + base; break;
    case 'settings': title = 'Einstellungen – ' + base; break;
    case 'business': title = 'Business-Cockpit – ' + base; break;
    case 'notifications': title = 'Benachrichtigungen – ' + base; break;
    case 'admin':    title = 'Admin – ' + base; break;
  }
  document.title = title;
  var md = document.querySelector('meta[name="description"]');
  if (md) md.setAttribute('content', desc);
}

// Prevent href="#" from appending "#" to clean URLs
document.addEventListener('click', function(e) {
  var link = e.target.closest('a[href="#"]');
  if (link) e.preventDefault();
});

// ========== STATE ==========
let currentPage = 'browse';
let currentListing = null;
let currentChat = null;
let isLoggedIn = false;
let favorites = new Set();

// Startseite immer auf Suche umleiten (ohne Reload):
(function() {
  var route = _readSpaRoute();
  if (route.page === 'home' || route.page === 'browse') {
    window.history.replaceState({ page: 'browse', data: null }, '', _spaPath('browse'));
    currentPage = 'browse';
  }
})();
let _dbListingsLoaded = false;
let _favoritesLoaded = false;

function forceBrowsePage() {
  // In manchen Umgebungen bleibt page-home trotzdem aktiv (z.B. WP-Theme-Initialzustand)
  var home = document.getElementById('page-home');
  var browse = document.getElementById('page-browse');
  if (!browse) return;

  var route = _readSpaRoute();
  if (route.page === 'home' || route.page === 'browse' || !route.page) {
    history.replaceState({ page: 'browse', data: null }, '', _spaPath('browse'));
  }

  if (home) home.classList.remove('active');
  if (!browse) return;
  browse.classList.add('active');
  currentPage = 'browse';

  console.log('[forceBrowsePage]', window.location.pathname, 'state', {
    home: home ? home.className : null,
    browse: browse.className,
    currentPage
  });

  try {
    renderHeroMarquees();
  } catch (e) {
    console.warn('forceBrowsePage: renderHeroMarquees failed', e);
  }
}

function _saveFavoritesToStorage() {
  var key = currentUser ? 'eb_favs_' + currentUser.id : 'eb_favs_guest';
  try { localStorage.setItem(key, JSON.stringify([...favorites])); } catch(e) {}
}

function _loadFavoritesFromStorage() {
  var key = currentUser ? 'eb_favs_' + currentUser.id : 'eb_favs_guest';
  try {
    var stored = localStorage.getItem(key);
    if (stored) {
      JSON.parse(stored).forEach(function(id) { favorites.add(id); });
    }
  } catch(e) {}
}

// ========== FILE UPLOAD HELPER ==========
async function uploadFile(file, _attempt) {
  var attempt = _attempt || 1;
  var maxRetries = 3;
  var formData = new FormData();
  var filename = (file instanceof File && file.name) ? file.name : 'upload-' + Date.now() + '.jpg';
  formData.append('file', file, filename);
  var headers = {};
  if (_wpNonce) headers['X-WP-Nonce'] = _wpNonce;
  var resp;
  try {
    resp = await _fetchWithTimeout(_apiUrl('upload'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: headers,
      body: formData
    }, 30000);
  } catch (networkErr) {
    if (networkErr && networkErr.name === 'AbortError') {
      throw new Error('Upload dauert zu lange. Bitte Bildgröße oder Verbindung prüfen und erneut versuchen.');
    }
    if (attempt < maxRetries) {
      await new Promise(function(r) { setTimeout(r, 1000 * attempt); });
      return uploadFile(file, attempt + 1);
    }
    throw new Error('Netzwerkfehler beim Upload – bitte erneut versuchen.');
  }
  if (resp.status === 503 || resp.status === 502 || resp.status === 504) {
    if (attempt < maxRetries) {
      await new Promise(function(r) { setTimeout(r, 1500 * attempt); });
      return uploadFile(file, attempt + 1);
    }
    throw new Error('Server vorübergehend nicht erreichbar (503). Bitte versuche es in einer Minute erneut.');
  }
  if (!resp.ok) {
    var err = {};
    try { err = await resp.json(); } catch(e) {}
    throw new Error(err.message || 'Upload fehlgeschlagen (Status ' + resp.status + ')');
  }
  return await resp.json();
}

function _mergeDbListingsIntoCache(rows) {
  if (!Array.isArray(rows) || !rows.length) return 0;
  var merged = 0;
  rows.forEach(function(row) {
    var rawId = _toPositiveInt(row && row.id);
    if (!rawId) return;
    var offsetId = rawId + 10000;
    var existing = (LISTINGS || []).find(function(ex) {
      if (!ex) return false;
      return _toPositiveInt(ex.id) === offsetId || _toPositiveInt(ex._dbId) === rawId;
    });
    if (existing) {
      Object.keys(row).forEach(function(k) { existing[k] = row[k]; });
      existing.id = offsetId;
      existing._fromDb = true;
      existing._dbId = rawId;
      return;
    }
    var listing = Object.assign({}, row, {
      id: offsetId,
      _fromDb: true,
      _dbId: rawId
    });
    LISTINGS.unshift(listing);
    merged++;
  });
  return merged;
}

// Load database listings into LISTINGS array (merged with demo data)
// forceReload=true: Cache-Flag ignorieren und frisch vom Server holen
// (z. B. beim Öffnen des Board-Pickers, damit neue Inserate auftauchen).
async function loadDbListings(forceReload) {
  if (_dbListingsLoaded && !forceReload) return;
  try {
    var resp = await fetch(_apiUrl('listings?per_page=50&_t=' + Date.now()), { credentials: 'same-origin', headers: _apiHeaders() });
    if (!resp.ok) return;
    var data = await resp.json();
    if (data.listings && data.listings.length > 0) {
      _mergeDbListingsIntoCache(data.listings);
    }
    // FIX: Server kappt bei 50/Seite — Folgeseiten nachladen, sonst fehlen
    // Inserate ab dem 51. überall (Browse, Board-Picker, Map). Cap bei 10
    // Seiten (500 Listings) als Sicherheitsnetz; Fehler einzelner Seiten
    // brechen den Rest nicht ab.
    var totalPages = Math.min(parseInt(data.pages, 10) || 1, 10);
    for (var p = 2; p <= totalPages; p++) {
      try {
        var r2 = await fetch(_apiUrl('listings?per_page=50&page=' + p + '&_t=' + Date.now()), { credentials: 'same-origin', headers: _apiHeaders() });
        if (!r2.ok) continue;
        var d2 = await r2.json();
        if (d2.listings && d2.listings.length > 0) _mergeDbListingsIntoCache(d2.listings);
      } catch (pageErr) { /* Einzelseite fehlgeschlagen — Rest weiterladen */ }
    }
    _applyImageBlocklist(LISTINGS); // vom Admin gelöschte Bilder auch hier ausblenden
    _dbListingsLoaded = true;
    try { renderHeroMarquees(); } catch (err) { console.error('Fehler beim Rendern der Hero-Marquee nach Daten-Ladung', err); }
    try { updateHeroStats(); } catch (err) { /* Stats optional */ }
  } catch(e) { /* API not available yet */ }
}

// Load user's favorites from backend
async function loadFavorites() {
  if (!isLoggedIn) return;
  try {
    var resp = await fetch(_apiUrl('favorites'), { credentials: 'same-origin', headers: _apiHeaders() });
    if (!resp.ok) return;
    var data = await resp.json();
    // Merge API favorites into local Set (don't clear — keeps local/demo favs intact)
    data.forEach(function(l) {
      favorites.add(l.id + 10000);
    });
    _favoritesLoaded = true;
    _saveFavoritesToStorage();
  } catch(e) {}
}

// ========== BLOCKED DATA PATTERNS ==========
const BLOCKED_PATTERNS = [
  /\b[A-Z0-9._%+\-]+\s*(?:@|\(at\)|\[at\]| at )\s*[A-Z0-9.\-]+\s*(?:\.| punkt | dot )\s*[A-Z]{2,}\b/i,
  /(?:\+|00)?(?=(?:[\d\s().\/-]*\d){9})\d[\d\s().\/-]{7,}\d/,
  /\b(?:https?:\/\/|www\.)\S+/i,
  /\b(?:whats?app|telegram|signal|facetime|skype|instagram|facebook|tiktok|snapchat|discord)\b/i,
  /\b\d{5}\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-]{2,}\b/,
  /\b[A-ZÄÖÜ][A-Za-zÄÖÜäöüß\-]{2,}(?:straße|strasse|str\.|weg|allee|platz|gasse)\s+\d+[a-z]?\b/i,
];

// ========== VISIBLE LISTINGS ==========
function _visibleListings() {
  if (!isLoggedIn) return filterDemos(LISTINGS);
  var dbItems = LISTINGS.filter(function(l) { return l._fromDb; });
  return dbItems.length > 0 ? dbItems : filterDemos(LISTINGS);
}

function getHeroListings() {
  var all = filterDemos(Array.isArray(LISTINGS) ? LISTINGS.slice() : []);
  if (!isLoggedIn) return all;

  try {
    var dbItems = _visibleListings() || [];
    if (!Array.isArray(dbItems)) dbItems = [];
    var ids = new Set(all.map(function(l){ return l && l.id != null ? l.id : null; }));
    dbItems.forEach(function(l){
      if (!l || l.id == null) return;
      if (!ids.has(l.id)) {
        ids.add(l.id);
        all.push(l);
      }
    });
  } catch (e) {
    console.warn('getHeroListings: Fehler beim Zusammenführen der Listings', e);
  }

  return all;
}

// ========== NAVIGATION ==========
function navigateTo(page, data, skipHistory) {
  // Make home an alias for browse, so es nur eine Suchseite zu pflegen gibt.
  if (page === 'home') {
    page = 'browse';
  }

  // ── Rollen-Weiche: Auftragsboard ist Dienstleister-only ─────────
  // Das Planungs-Board ('board') steht ALLEN offen: Event-Planer planen
  // ihr Event, Dienstleister planen ihre eigenen Events (z. B. Firmen-
  // feier) und stellen ebenfalls Dienstleister zusammen. Das Auftrags-
  // board ('auftraege') zeigt eingehende Buchungen und ergibt nur für
  // Dienstleister Sinn – Event-Planer werden zentral umgeleitet (auch
  // bei alten Links / direkt eingegebenen URLs).
  if (isLoggedIn && page === 'auftraege' && isEventPlaner()) {
    page = 'board';
  }

  // Pages that require login — redirect to login modal immediately
  var loginRequired = ['create-listing', 'messages', 'profile', 'edit-profile', 'settings', 'admin', 'business', 'notifications'];
  if (!isLoggedIn && loginRequired.indexOf(page) !== -1) {
    openModal('loginModal');
    showToast('Bitte melde dich an, um diese Funktion zu nutzen.', 'info');
    return;
  }

  // Hide user menu
  document.getElementById('userMenu').classList.remove('show');

  // Push browser history state (unless triggered by popstate or explicit skip)
  if (!skipHistory) {
    window.history.pushState({ page: page, data: data || null }, '', _spaPath(page, data));
  }

  // Deactivate all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  _stopChatPoll();

  // ── Always restore scrolling (modal/lightbox might have locked it) ──
  document.body.style.overflow = '';
  document.body.style.touchAction = '';
  // Close any open lightboxes/modals silently (except auth modals)
  var _authModals = ['loginModal','registerModal','forgotModal','resetPasswordModal','loginOtpModal','registerOtpModal','verifyModal','passkeySetupModal'];
  document.querySelectorAll('.modal-overlay.show, .provider-lightbox.show, .gallery-lightbox.show, .cover-lightbox.show').forEach(function(el) {
    if (_authModals.indexOf(el.id) === -1) el.classList.remove('show');
  });
  // Clear cinema preview if running
  if (_cinemaTimer) { clearInterval(_cinemaTimer); _cinemaTimer = null; }
  // Stop gallery row animations when leaving provider page
  if (typeof galleryRAFs !== 'undefined' && galleryRAFs.length) {
    galleryRAFs.forEach(function(r) { if (r && r.cancel) r.cancel(); else cancelAnimationFrame(r); });
    galleryRAFs = [];
  }
  // Clean up detail gallery swipe listeners
  if (_detailSwipeCleanup) { _detailSwipeCleanup(); _detailSwipeCleanup = null; }

  // Reset provider edit mode if leaving
  if (_providerEditMode) {
    _providerEditMode = false;
    var provPage = document.getElementById('page-provider');
    if (provPage) provPage.classList.remove('provider-edit-mode');
  }

  // Activate target page
  var targetId = page;
  if (page === 'edit-profile') targetId = 'profile';
  const target = document.getElementById('page-' + targetId);
  if (target) {
    target.classList.add('active');
    currentPage = page;
  }

  // Update mobile nav
  document.querySelectorAll('.mobile-nav button').forEach(b => {
    b.classList.toggle('active', b.dataset.page === page);
  });

  // Scroll to top
  window.scrollTo(0, 0);

  // Init scroll-triggered animations for the newly visible page
  setTimeout(_initAnimatedEntries, 80);

  // Page-specific logic
  switch (page) {
    case 'browse':
      _initAiPlaceholder();
      try { _ebFillEventTypeSelect(); } catch (err) { console.warn('Event-Typen konnten nicht geladen werden', err); }
      try { _initHeroShots(); } catch (err) { console.warn('Hero-Montage konnte nicht starten', err); }
      loadDbListings().then(function() {
        renderBrowseGrid(LISTINGS);
        try { renderHeroMarquees(); } catch (err) { console.error('Fehler renderHeroMarquees in navigateTo(browse)', err); }
        _initCategoryScrollHint();
      });
      break;
    case 'explore':
      loadDbListings().then(function() { renderExploreGrid(); });
      break;
    case 'aktuelles':
      loadDbListings().then(function() { renderFeed('foryou'); });
      break;
    case 'detail':
      loadDbListings().then(function() { loadDetail(data); });
      break;
    case 'provider':
      // FIX 2026-05: DOM SOFORT leeren, damit kein vorheriges Profil
      // "durchblitzt", während loadDbListings() async läuft.
      _resetProviderPageDom();
      loadDbListings().then(function() { loadProvider(data); });
      break;
    case 'messages':
      renderChatList();
      break;
    case 'profile':
      if (currentUser) {
        // Show provider page for own profile (same nice layout)
        document.getElementById('page-profile').classList.remove('active');
        var provPage = document.getElementById('page-provider');
        if (provPage) { provPage.classList.add('active'); currentPage = 'provider'; }
        // FIX 2026-05: DOM zuerst leeren – sonst zeigt das eigene Profil
        // kurz die Daten eines vorher angesehenen Anbieters oder Demo-Daten.
        _resetProviderPageDom();
        loadDbListings().then(function() { loadProvider(currentUser.id); });
        // Highlight mobile nav profile button
        document.querySelectorAll('.mobile-nav button').forEach(b => b.classList.remove('active'));
        var profBtn = document.querySelector('.mobile-nav button[data-page="profile"]');
        if (profBtn) profBtn.classList.add('active');
      }
      break;
    case 'create-listing':
      if (!window._isEditNavigation) {
        window._editingListingId = null;
        document.getElementById('createListingForm').reset();
        document.getElementById('uploadPreview').innerHTML = '';
        document.querySelectorAll('#createFeatureTags .feature-tag').forEach(function(t) { t.classList.remove('selected'); });
        document.querySelectorAll('#createFeatureTags .feature-tag-custom-item').forEach(function(t) { t.remove(); });
        // Clear Flatpickr dates
        var dfEl = document.getElementById('createDateFrom');
        var dtEl = document.getElementById('createDateTo');
        if (dfEl && dfEl._flatpickr) dfEl._flatpickr.clear();
        if (dtEl && dtEl._flatpickr) dtEl._flatpickr.clear();
        // Sofortbuchung + Wochentage zurücksetzen
        var _ibReset = document.getElementById('createInstantBook');
        if (_ibReset) _ibReset.checked = false;
        document.querySelectorAll('#createWeekdayPicker .weekday-pill').forEach(function(p) { p.classList.remove('selected'); });
        // Typ + Verfügbarkeitskalender + Titel/Buttons zurücksetzen
        try { _clSetType('offer'); } catch (e) {}
        try { _clAvailReset(); } catch (e) {}
        var _ctH = document.querySelector('#page-create-listing .create-title');
        if (_ctH) _ctH.textContent = 'Inserat erstellen';
        var _csB = document.querySelector('#step3 .btn-primary');
        if (_csB) _csB.innerHTML = '<span class="material-icons-round">publish</span> <span id="clSubmitLabel">Inserat veröffentlichen</span>';
      }
      updateCreateFormForRole();
      break;
    case 'dashboard':
      navigateTo('profile');
      return;
    case 'my-listings':
      renderMyListings();
      break;
    case 'favorites':
      renderFavorites();
      break;
    case 'edit-profile':
      renderDashboard();
      break;
    case 'settings':
      loadSettings();
      break;
    case 'business':
      if (!isDienstleister() && !(currentUser && currentUser.isAdmin)) {
        showToast('Das Business-Cockpit ist für Dienstleister verfügbar.', 'info');
        navigateTo('profile');
        return;
      }
      renderBusinessCockpit();
      break;
    case 'notifications':
      renderNotificationCenter();
      break;
    case 'agb':
    case 'agb-b2b':
    case 'agb-dienstleister':
    case 'marktplatz':
    case 'datenschutz':
    case 'cookies':
    case 'widerruf':
    case 'community':
    case 'bewertungen':
    case 'upload':
    case 'dsa':
    case 'p2b':
    case 'barrierefreiheit':
    case 'vsbg':
    case 'impressum':
      break;
    case 'admin':
      if (!currentUser || !currentUser.isAdmin) {
        showToast('Kein Zugriff – nur für Admins.', 'error');
        navigateTo('home');
        return;
      }
      loadAdminUsers();
      break;
    case 'board':
      if (currentUser) { _migrateBoardProjects(); _loadBoardProjects(); } else { _boardProjects = []; }
      // DB-Inserate nachladen: Karten referenzieren sie per listingId —
      // ohne sie kann das Kontakt-Modal Anbieter/Preis nicht auflösen
      // (Chat-Button wäre nach direktem /board-Aufruf fälschlich deaktiviert).
      try { loadDbListings(); } catch (e) {}
      renderBoardPage();
      try { if (currentUser && typeof _reconcileStripePayments === 'function') _reconcileStripePayments(); } catch(e) {}
      // Deep-Link: /board/<projectId> öffnet das Projekt direkt (z.B. aus neuem Tab)
      if (data) {
        _pendingBoardProjectId = String(data);
        _tryOpenPendingBoardProject();
      }
      break;
    case 'auftraege':
      if (!currentUser) { navigateTo('home'); return; }
      renderAuftraegePage();
      break;
    case 'contact':
      // Felder mit Kontaktdaten des angemeldeten Users vorausfüllen
      try {
        if (currentUser) {
          var _cn = document.getElementById('contactName');
          var _ce = document.getElementById('contactEmail');
          if (_cn && !_cn.value) _cn.value = currentUser.name || '';
          if (_ce && !_ce.value) _ce.value = currentUser.email || '';
        }
      } catch (e) {}
      break;
    case 'home':
      try { renderHeroMarquees(); } catch (err) { console.error('Fehler renderHeroMarquees in navigateTo(home)', err); }
      try { updateHeroStats(); } catch (err) { /* Stats optional */ }
      break;
  }

  // Hide footer on messages page, show on all others
  var gf = document.getElementById('globalFooter');
  if (gf) gf.style.display = (page === 'messages') ? 'none' : '';
  try { _setPageMeta(page, data); } catch (e) { /* Meta optional */ }
}

// ========== BOARD-STATUS-VERKNÜPFUNG ==========
// Zeigt überall (Browse-Karte, Detailseite, Provider-Profil), ob ein Inserat
// bereits im eigenen Planungsboard steckt und in welcher Phase.
var EB_BOARD_STAGE_INFO = {
  geplant:       { label: 'Im Plan',      icon: 'assignment',      cls: 'geplant' },
  kontaktiert:   { label: 'Kontaktiert',  icon: 'forum',           cls: 'kontaktiert' },
  angebot:       { label: 'Gebucht',      icon: 'event_available', cls: 'angebot' },
  bestaetigt:    { label: 'Erfüllt',      icon: 'verified',        cls: 'erfuellt' },
  abgeschlossen: { label: 'Bezahlt',      icon: 'paid',            cls: 'bezahlt' }
};
var EB_BOARD_STAGE_ORDER = ['geplant', 'kontaktiert', 'angebot', 'bestaetigt', 'abgeschlossen'];

// Höchste Board-Phase eines Inserats über ALLE Projekte des Nutzers.
// Liefert null, wenn das Inserat in keinem Board steckt.
function _boardStatusForListing(listingId) {
  if (listingId == null || !Array.isArray(_boardProjects) || !_boardProjects.length) return null;
  var best = -1;
  _boardProjects.forEach(function(p) {
    (p && Array.isArray(p.cards) ? p.cards : []).forEach(function(c) {
      if (!c || c.listingId == null) return;
      if (String(c.listingId) !== String(listingId)) return;
      var idx = EB_BOARD_STAGE_ORDER.indexOf(c.stage);
      if (idx > best) best = idx;
    });
  });
  if (best < 0) return null;
  var stage = EB_BOARD_STAGE_ORDER[best];
  return { stage: stage, info: EB_BOARD_STAGE_INFO[stage] };
}

// Kleines Status-Badge-HTML (leer, wenn kein Board-Bezug).
function _boardStatusBadgeHtml(listingId, extraClass) {
  var st = _boardStatusForListing(listingId);
  if (!st) return '';
  return '<span class="board-status-badge bsb-' + st.info.cls + (extraClass ? ' ' + extraClass : '') + '" title="Dieser Dienstleister ist in deinem Planungsboard">' +
    '<span class="material-icons-round">' + st.info.icon + '</span>' + st.info.label + '</span>';
}

// Höchste Board-Phase über ALLE Inserate eines Anbieters (User-ID) —
// für Kontexte, die den Partner kennen, aber kein konkretes Listing (Chat).
function _boardStatusBadgeForProvider(userId, extraClass) {
  if (userId == null || !Array.isArray(LISTINGS)) return '';
  var bestHtml = '', bestIdx = -1;
  LISTINGS.forEach(function(l) {
    if (!l || !_sameUserId(_listingOwnerId(l), userId)) return;
    var st = _boardStatusForListing(l.id);
    if (st) {
      var idx = EB_BOARD_STAGE_ORDER.indexOf(st.stage);
      if (idx > bestIdx) { bestIdx = idx; bestHtml = _boardStatusBadgeHtml(l.id, extraClass); }
    }
  });
  return bestHtml;
}
