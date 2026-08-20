
/* ============================================
   Eventbörse – Event Marketplace Application
   SPA Router, Chat, Negotiation, Listings, Auth

   ⚠️ app.js IST GENERIERT — NICHT VON HAND EDITIEREN!
   Quelle: js/modules/** (Reihenfolge: js/modules/modules.list).
   Nach Modul-Änderungen: ./build-app-js.sh ausführen und app.js
   mitcommitten. CI prüft Drift (./build-app-js.sh --check).
   ============================================ */

/* ============================================================================
 * AVATAR-GENERATOR (Self-Hosted, deterministisch, kein externer Roundtrip)
 *
 * Erzeugt deterministisch eine Initial-Avatar-SVG-Data-URI aus einem Seed.
 * Ersatz für DiceBear-API: keine DNS-Queries, kein Drittanbieter-Tracking,
 * kein Drittlandtransfer (DSGVO-Plus), instant render, voll cachebar.
 *
 * Kompatibilitätsschicht: ebAvatar(seed, name?) ist drop-in-Ersatz für
 *   'https://api.dicebear.com/7.x/avataaars/svg?seed=' + seed.
 * ============================================================================ */
(function(){
  // 12 zugängliche Tailwind-ähnliche Pastell-Töne (gegen Reizüberflutung).
  var PALETTE = [
    '#FF385C', '#7C3AED', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444',
    '#06B6D4', '#8B5CF6', '#EC4899', '#84CC16', '#F97316', '#3B82F6'
  ];
  function _hash(s){ var h=0; s = String(s||'guest'); for(var i=0;i<s.length;i++){ h = ((h<<5)-h) + s.charCodeAt(i); h |= 0; } return Math.abs(h); }
  function _initials(name){
    if(!name) return '?';
    var parts = String(name).trim().split(/[\s\-_\.]+/).filter(Boolean);
    if(parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
  }
  var _cache = Object.create(null);
  /**
   * @param {string} seed eindeutiger Seed (User-ID, Slug, etc.)
   * @param {string} [name] Anzeigename für Initialen; fällt zurück auf Seed
   * @returns {string} data:image/svg+xml;utf8,…
   */
  window.ebAvatar = function(seed, name){
    var key = (seed||'') + '|' + (name||'');
    if(_cache[key]) return _cache[key];
    var h = _hash(seed);
    var bg = PALETTE[h % PALETTE.length];
    var bg2 = PALETTE[(h >> 4) % PALETTE.length];
    var initials = _initials(name || seed);
    var svg = ''
      + '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'
      + '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
      + '<stop offset="0%" stop-color="' + bg + '"/>'
      + '<stop offset="100%" stop-color="' + bg2 + '"/>'
      + '</linearGradient></defs>'
      + '<rect width="100" height="100" rx="50" fill="url(#g)"/>'
      + '<text x="50" y="50" text-anchor="middle" dominant-baseline="central" font-family="-apple-system,Segoe UI,Roboto,sans-serif" '
      + 'font-size="40" font-weight="700" fill="#fff">' + initials + '</text>'
      + '</svg>';
    var url = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
    _cache[key] = url;
    return url;
  };

  // Drop-in-Replacement: Wenn alter DiceBear-Code irgendwo seine URL mitbringt,
  // fängt das hier den Request ab und rendert lokal. Spart DNS + Roundtrip.
  if (typeof Image !== 'undefined') {
    document.addEventListener('error', function(e){
      var t = e.target;
      if (!t || t.tagName !== 'IMG' || !t.src) return;
      if (t.src.indexOf('api.dicebear.com') === -1) return;
      // Fallback auf lokalen Avatar
      var m = t.src.match(/seed=([^&]+)/);
      var seed = m ? decodeURIComponent(m[1]) : (t.alt || 'user');
      t.src = window.ebAvatar(seed, t.alt || seed);
    }, true);
  }
})();

// Avatar-Normalisierung: PHP-generierte data:SVG-Avatare (y="58", kein dominant-baseline)
// durch JS-generierte ersetzen. Echte Foto-URLs (https://...) werden unverändert durchgereicht.
function _resolveAvatar(img, name) {
  if (!img || img.startsWith('data:')) return window.ebAvatar(name || 'user', name || '');
  return img;
}

// ========== DEMO / BOT-ACCOUNT FILTER ==========
// Bot-Inserate (90001–90009) sind hardcoded und sollen vor Release ausblendbar sein.
// Flag wird vom Backend per <script>window.EB_HIDE_DEMO=…</script> in den <head> gesetzt.
// Admin-Toggle: POST /admin/hide-demo. Falls das Flag (noch) nicht im Window steht, default: false.
window.EB_DEMO_PROVIDER_IDS = window.EB_DEMO_PROVIDER_IDS || [90001,90002,90003,90004,90005,90006,90007,90008,90009,90010,90011,90012,90013,90014,90015];
// Default: Demo-Inserate ausblenden. Backend kann window.EB_HIDE_DEMO=false setzen, um sie wieder anzuzeigen.
window.EB_HIDE_DEMO = (typeof window.EB_HIDE_DEMO !== 'undefined') ? !!window.EB_HIDE_DEMO : true;
// Einzige Quelle der Wahrheit für die Sichtbarkeit ALLER Demo-Daten
// (Listings, Chats, Events, Marketing-Zahlen). Folgt dem Admin-Switch.
function demoVisible() { return !window.EB_HIDE_DEMO; }
// Berechnet die Startseiten-Marketing-Zahlen aus dem SICHTBAREN Listing-Set
// (filterDemos respektiert window.EB_HIDE_DEMO → Zahlen folgen dem Switch).
function updateHeroStats() {
  var visible = filterDemos(Array.isArray(LISTINGS) ? LISTINGS.slice() : []);
  var providerIds = {};
  var ratedSum = 0, ratedCount = 0;
  visible.forEach(function(l) {
    if (!l) return;
    var pid = l.providerId != null ? l.providerId : (l.provider && l.provider.id);
    if (pid != null) providerIds[pid] = true;
    var r = parseFloat(l.rating);
    if (r > 0) { ratedSum += r; ratedCount++; }
  });
  var providerCount = Object.keys(providerIds).length;
  if (providerCount === 0) providerCount = visible.length; // Fallback: Listings zählen

  var elProv = document.getElementById('statProviders');
  if (elProv) elProv.textContent = String(providerCount);
  var elSub = document.getElementById('heroSubProviders');
  if (elSub) elSub.textContent = providerCount + ' Dienstleister';

  var elRatingItem = document.getElementById('statRatingItem');
  if (elRatingItem) {
    if (ratedCount > 0) {
      var avg = Math.round((ratedSum / ratedCount) * 10) / 10;
      elRatingItem.innerHTML = '<strong id="statRating">' + avg.toFixed(1) + '★</strong> Ø Bewertung';
    } else {
      elRatingItem.innerHTML = '<strong id="statRating">Neu</strong>';
    }
  }
  var elSubRated = document.getElementById('heroSubRated');
  if (elSubRated) elSubRated.textContent = ratedCount > 0 ? 'Top bewertet' : 'Neu gestartet';
}
function isDemoListing(l) {
  if (!l) return false;
  // Server liefert isDemo=true für alle als Test/Bot markierten User
  // (hardcoded 90001–90009 ODER user_meta eb_is_demo='1').
  // Diese Prüfung greift VOR dem _fromDb-Check, damit auch nachträglich
  // angelegte DB-Inserate von Demo-Usern korrekt ausgeblendet werden.
  if (l.isDemo === true) return true;
  if (l._fromDb) return false; // echte DB-Inserate (nicht-Demo) sind nie Demo
  var pid = l.providerId != null ? l.providerId : (l.provider && l.provider.id);
  return pid != null && window.EB_DEMO_PROVIDER_IDS.indexOf(+pid) !== -1;
}
function isDemoUserId(uid) {
  return uid != null && window.EB_DEMO_PROVIDER_IDS.indexOf(+uid) !== -1;
}
function filterDemos(arr) {
  if (!window.EB_HIDE_DEMO || !Array.isArray(arr)) return arr;
  return arr.filter(function(l) { return !isDemoListing(l); });
}

// Einheitliche Sichtbarkeit für alle UI-Flächen.
// Wenn Admin Testdaten eingeblendet hat, werden sie überall angezeigt.
function _surfaceVisibleListings(arr) {
  var rows = Array.isArray(arr) ? arr : [];
  var adminWantsDemo = !!(
    !window.EB_HIDE_DEMO &&
    typeof currentUser !== 'undefined' &&
    currentUser &&
    currentUser.isAdmin
  );
  return adminWantsDemo ? rows : filterDemos(rows);
}

// AI transparency is stored separately for copy and media so a human photo
// is never falsely classified merely because the description used AI.
// "undeclared" is reserved for migrated legacy records and is not shown as
// proof of human authorship.
function _aiDisclosureValue(item, kind) {
  var key = kind === 'media' ? 'aiMediaDisclosure' : 'aiTextDisclosure';
  var nested = item && item.aiDisclosure && item.aiDisclosure[kind];
  var raw = item && (item[key] != null ? item[key] : nested);
  raw = String(raw || 'undeclared').toLowerCase();
  return ['none', 'assisted', 'generated', 'undeclared'].indexOf(raw) !== -1 ? raw : 'undeclared';
}

function _aiDisclosureAttrs(item) {
  return ' data-ai-text="' + _aiDisclosureValue(item, 'text') + '"' +
    ' data-ai-media="' + _aiDisclosureValue(item, 'media') + '"';
}

function _aiDisclosureLabels(item) {
  var textStatus = _aiDisclosureValue(item, 'text');
  var mediaStatus = _aiDisclosureValue(item, 'media');
  if (textStatus === 'generated' || mediaStatus === 'generated') {
    return [{ state: 'generated', label: 'KI-generierter Inhalt' }];
  }
  if (textStatus === 'assisted' || mediaStatus === 'assisted') {
    return [{ state: 'assisted', label: 'KI-unterstützter Inhalt' }];
  }
  if (textStatus === 'undeclared' || mediaStatus === 'undeclared') {
    return [{ state: 'open', label: 'KI-Status offen', legacy: true }];
  }
  return [];
}

function _aiDisclosureLabelsHtml(item, extraClass) {
  var labels = _aiDisclosureLabels(item);
  if (!labels.length) return '';
  return '<span class="ai-disclosure-stack' + (extraClass ? ' ' + _escHtml(extraClass) : '') + '" aria-label="KI-Transparenz">' +
    labels.map(function(info) {
      return '<span class="ai-content-label ai-content-label-' + info.state + (info.legacy ? ' ai-content-label-open' : '') + '" title="' +
        (info.legacy ? 'Altbestand: noch nicht nachdeklariert' : 'Von der einstellenden Person deklariert') + '">' +
        _escHtml(info.label) + '</span>';
    }).join('') + '</span>';
}

function _safeRun(label, fn) {
  try {
    if (typeof fn === 'function') fn();
  } catch (err) {
    console.error('Init-Fehler [' + label + ']', err);
  }
}
function _removeClassById(id, cls) {
  var el = document.getElementById(id);
  if (el) el.classList.remove(cls);
}
function _addClassById(id, cls) {
  var el = document.getElementById(id);
  if (el) el.classList.add(cls);
}

function _toPositiveInt(value) {
  var n = parseInt(value, 10);
  return isNaN(n) || n <= 0 ? 0 : n;
}

function _currentUserId() {
  return (typeof currentUser !== 'undefined' && currentUser) ? _toPositiveInt(currentUser.id) : 0;
}

function _sameUserId(a, b) {
  var aa = _toPositiveInt(a);
  var bb = _toPositiveInt(b);
  return aa > 0 && bb > 0 && aa === bb;
}

function _listingOwnerId(listing) {
  if (!listing || typeof listing !== 'object') return 0;
  var candidates = [
    listing.providerId,
    listing.user_id,
    listing.userId,
    listing.ownerId,
    listing.authorId,
    listing.provider_user_id,
    listing.providerUserId,
    listing.provider && listing.provider.id
  ];
  for (var i = 0; i < candidates.length; i++) {
    var val = _toPositiveInt(candidates[i]);
    if (val > 0) return val;
  }
  return 0;
}

function _isCurrentUserListingOwner(listing) {
  var uid = _currentUserId();
  var ownerId = _listingOwnerId(listing);
  return uid > 0 && ownerId > 0 && uid === ownerId;
}

function _listingMatchesId(listing, anyId) {
  if (!listing) return false;
  var needle = _toPositiveInt(anyId);
  if (!needle) return false;
  return _toPositiveInt(listing.id) === needle || _toPositiveInt(listing._dbId) === needle;
}

function _findListingByAnyId(anyId) {
  var needle = _toPositiveInt(anyId);
  if (!needle || !Array.isArray(LISTINGS)) return null;
  for (var i = 0; i < LISTINGS.length; i++) {
    if (_listingMatchesId(LISTINGS[i], needle)) return LISTINGS[i];
  }
  return null;
}

function _fetchWithTimeout(url, options, timeoutMs) {
  var ms = timeoutMs || 30000;
  if (typeof AbortController === 'undefined') return fetch(url, options || {});
  var controller = new AbortController();
  var opts = Object.assign({}, options || {}, { signal: controller.signal });
  var timer = setTimeout(function() { controller.abort(); }, ms);
  return fetch(url, opts).finally(function() {
    clearTimeout(timer);
  });
}

function registerEventboerseServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return;
  }
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function(err) {
      console.warn('Service Worker konnte nicht registriert werden:', err);
    });
  });
}

async function _ensureWriteSessionMatchesCurrentUser(actionLabel) {
  if (!isLoggedIn || !currentUser) {
    openModal('loginModal');
    showToast('Bitte melde dich an, bevor du fortfährst.', 'warning');
    return false;
  }

  var response;
  try {
    response = await _fetchWithTimeout(_apiUrl('me') + '?_t=' + Date.now(), {
      credentials: 'same-origin',
      headers: _apiHeaders()
    }, 12000);
    _refreshNonce(response);
  } catch (e) {
    showToast('Sitzung konnte nicht geprüft werden. Bitte lade die Seite neu.', 'warning');
    return false;
  }

  var data = {};
  try { data = await response.json(); } catch (_) {}

  if (!response.ok || !data || data.loggedIn === false) {
    isLoggedIn = false;
    currentUser = null;
    openModal('loginModal');
    showToast('Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.', 'warning');
    return false;
  }

  var serverId = _toPositiveInt(data.user_id || data.id);
  var localId = _currentUserId();
  var serverEmail = String(data.email || '').toLowerCase();
  var localEmail = String(currentUser.email || '').toLowerCase();
  var idMismatch = localId > 0 && serverId > 0 && localId !== serverId;
  var emailMismatch = localEmail && serverEmail && localEmail !== serverEmail;

  if (idMismatch || emailMismatch) {
    var serverUser = _normalizeUserPayload(data, {});
    var serverName = serverUser.name || serverEmail || 'einem anderen Account';
    currentUser = serverUser;
    isLoggedIn = true;
    showToast((actionLabel || 'Aktion') + ' gestoppt: Die Browser-Sitzung ist als ' + serverName + ' angemeldet. Bitte neu anmelden und erneut speichern.', 'warning');
    applyLogin();
    return false;
  }

  _applyAuthenticatedUser(data, currentUser);
  return true;
}

// ========== IMAGE FALLBACK ==========
// Manche externen Demo-URLs (Pexels) liefern 404. Damit die Karte nicht kaputt aussieht,
// wird bei einem Image-Load-Fehler ein neutrales SVG-Placeholder eingesetzt.
window.EB_IMG_FALLBACK = window.EB_IMG_FALLBACK || (
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="#FFE4E9"/><stop offset="1" stop-color="#FFC9D2"/>' +
      '</linearGradient></defs>' +
      '<rect width="600" height="400" fill="url(%23g)"/>' +
      '<g fill="#FF385C" opacity="0.55" transform="translate(260 160)">' +
        '<rect x="0" y="0" width="80" height="60" rx="6" fill="none" stroke="#FF385C" stroke-width="4"/>' +
        '<circle cx="22" cy="22" r="6"/>' +
        '<path d="M0 60 L24 36 L44 50 L80 18 L80 60 Z"/>' +
      '</g>' +
      '<text x="300" y="260" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#FF385C" font-weight="600">Bild nicht verf&#252;gbar</text>' +
    '</svg>'
  )
);
// HTML-Attribut, das Card-Images verwenden – "this.onerror=null" verhindert Endlosschleife.
window.EB_IMG_ERR_ATTR = ' onerror="this.onerror=null;this.src=window.EB_IMG_FALLBACK"';

// Globaler Bild-Fehler-Auffang (Capture-Phase, da error-Events nicht bubblen).
// Stellt sicher, dass JEDES <img> ein Fallback bekommt – auch Render-Stellen ohne
// eigenes inline-onerror. Bilder mit eigenem onerror-Handler werden übersprungen.
// Avatar-Bilder bekommen einen generierten Avatar, Inhaltsbilder das neutrale Placeholder.
(function installGlobalImgFallback() {
  if (window.__ebImgFallbackInstalled) return;
  window.__ebImgFallbackInstalled = true;
  document.addEventListener('error', function(e) {
    var el = e && e.target;
    if (!el || el.tagName !== 'IMG') return;
    // Schon ein Fallback gesetzt? -> nichts tun (keine Endlosschleife).
    if (el.dataset.ebFallback === 'done') return;
    // Render-Stelle hat einen eigenen inline-onerror -> der kümmert sich selbst.
    if (el.getAttribute('onerror')) return;
    el.dataset.ebFallback = 'done';
    var cls = el.className || '';
    var isAvatar = /avatar/i.test(cls) || el.hasAttribute('data-eb-avatar');
    if (isAvatar && typeof ebAvatar === 'function') {
      el.src = ebAvatar(el.alt || 'user', el.alt || '');
    } else {
      el.src = window.EB_IMG_FALLBACK;
    }
  }, true);
})();

// --- Admin-Bild-Blocklist ---
// Vom Admin gelöschte Bilder (auch bei hardcodierten Demo-Listings, die nicht
// in der DB liegen). Der Server liefert normalisierte Pfade via eventboerseApi;
// der Client blendet passende Bilder aus, sodass Löschungen Reload-fest sind.
window.EB_IMG_BLOCKLIST = (function() {
  var set = new Set();
  try {
    var list = (window.eventboerseApi && window.eventboerseApi.imageBlocklist) || [];
    if (Array.isArray(list)) list.forEach(function(p) { if (p) set.add(String(p)); });
  } catch (e) {}
  return set;
})();

// Normalisiert eine Bild-URL auf ihren Pfad ohne Query (spiegelt serverseitiges
// eb_norm_img_url) — so matchen verschiedene Größen-/Query-Varianten desselben Bilds.
function _imgNormPath(u) {
  if (!u) return '';
  try {
    var s = String(u);
    var q = s.indexOf('?');
    if (q >= 0) s = s.slice(0, q);
    try { return new URL(s, window.location.origin).pathname; }
    catch (e) { return s; }
  } catch (e) { return ''; }
}

function _isImgBlocked(u) {
  if (!u || !window.EB_IMG_BLOCKLIST || window.EB_IMG_BLOCKLIST.size === 0) return false;
  return window.EB_IMG_BLOCKLIST.has(_imgNormPath(u));
}

// Entfernt geblockte Bilder aus einer Listing-Liste (images[] + image-Cover).
function _applyImageBlocklist(arr) {
  if (!window.EB_IMG_BLOCKLIST || window.EB_IMG_BLOCKLIST.size === 0) return;
  (Array.isArray(arr) ? arr : []).forEach(function(l) {
    if (!l) return;
    if (Array.isArray(l.images)) {
      l.images = l.images.filter(function(u) { return !_isImgBlocked(u); });
    }
    if (l.image && _isImgBlocked(l.image)) {
      l.image = (Array.isArray(l.images) && l.images.length) ? l.images[0] : window.EB_IMG_FALLBACK;
    }
  });
}

// Feed-Bild Auto-Fit: Banner / Hochformat -> contain (volles Bild), normale Fotos -> cover
window._fitFeedImg = function(img) {
  if (!img || !img.naturalWidth || !img.naturalHeight) return;
  var ratio = img.naturalWidth / img.naturalHeight;
  // Sehr breit (Banner mit Text/Logo) oder Hochformat -> komplett zeigen
  if (ratio > 2.2 || ratio < 0.85) {
    img.classList.add('feed-post-image-contain');
  }
};

// Explore-Bild Auto-Fit: gleiche Logik wie Feed. Banner / Hochformat -> contain (volles Bild),
// normale Fotos behalten "cover". Dahinter liegt das Bild als unscharfer Hintergrund (siehe CSS).
window._fitExploreImg = function(img) {
  if (!img || !img.naturalWidth || !img.naturalHeight) return;
  var ratio = img.naturalWidth / img.naturalHeight;
  if (ratio > 1.4 || ratio < 0.85) {
    img.classList.add('explore-item-img-contain');
  }
};

/* ============================================================================
 * BILD-UPLOAD — gemeinsames Limit, klare Rückmeldung, Auto-Verkleinerung
 *
 * Eine Quelle der Wahrheit für alle Upload-Pfade (Inserat, Galerie, Avatar,
 * Cover, Chat, Feed). Vorher stand "5 MB" an neun Stellen im Code und in zwei
 * Hinweistexten — jede Änderung musste alle finden.
 *
 * ebPrepareImageFile(file) liefert ein Promise auf eine hochladbare Datei
 * oder auf null, wenn die Datei abgelehnt wurde. Abgelehnt wird nur noch,
 * was sich nicht retten lässt; zu große JPG/PNG/WebP werden im Browser
 * heruntergerechnet, statt den Nutzer mit einer Fehlermeldung wegzuschicken.
 * Jeder Ausgang gibt Rückmeldung — stiller Abbruch ist immer ein Bug.
 * ========================================================================== */

var EB_MAX_IMAGE_BYTES   = 15 * 1024 * 1024;   // 15 MB — Client wie Server
var EB_MAX_IMAGE_LABEL   = '15 MB';
var EB_IMAGE_TYPES       = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
var EB_IMAGE_TYPES_LABEL = 'JPG, PNG, WebP oder GIF';
var EB_DOWNSCALE_EDGE    = 2560;               // längste Kante nach dem Verkleinern
var EB_DOWNSCALE_QUALITY = 0.85;

function ebFormatBytes(bytes) {
  var n = Number(bytes) || 0;
  if (n >= 1024 * 1024) return (n / (1024 * 1024)).toFixed(1).replace('.', ',') + ' MB';
  if (n >= 1024) return Math.round(n / 1024) + ' KB';
  return n + ' B';
}

function _ebShortName(name) {
  var s = String(name || 'Bild');
  return s.length > 32 ? s.slice(0, 29) + '…' : s;
}

function _ebToast(msg, icon) {
  if (typeof showToast === 'function') showToast(msg, icon || 'error');
  else if (icon === 'error') console.warn(msg);
}

/**
 * Zeichnet die Datei auf ein Canvas und gibt sie kleiner zurück.
 * Reduziert notfalls mehrfach, bis das Limit unterschritten ist.
 * @returns {Promise<File>}
 */
function _ebDownscaleImage(file) {
  return new Promise(function(resolve, reject) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function() {
      URL.revokeObjectURL(url);
      var edge = EB_DOWNSCALE_EDGE;
      var quality = EB_DOWNSCALE_QUALITY;

      function attempt(round) {
        var scale = Math.min(1, edge / Math.max(img.naturalWidth, img.naturalHeight));
        var w = Math.max(1, Math.round(img.naturalWidth * scale));
        var h = Math.max(1, Math.round(img.naturalHeight * scale));
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        var ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas nicht verfügbar')); return; }
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(function(blob) {
          if (!blob) { reject(new Error('Verkleinern fehlgeschlagen')); return; }
          if (blob.size <= EB_MAX_IMAGE_BYTES || round >= 4) {
            if (blob.size > EB_MAX_IMAGE_BYTES) { reject(new Error('Bild bleibt zu groß')); return; }
            var base = String(file.name || 'bild').replace(/\.[^.]+$/, '');
            resolve(new File([blob], base + '.jpg', { type: 'image/jpeg', lastModified: Date.now() }));
          } else {
            // Noch zu groß: Kante und Qualität weiter zurücknehmen.
            edge = Math.round(edge * 0.75);
            quality = Math.max(0.6, quality - 0.08);
            attempt(round + 1);
          }
        }, 'image/jpeg', quality);
      }
      attempt(0);
    };
    img.onerror = function() {
      URL.revokeObjectURL(url);
      reject(new Error('Bild nicht lesbar'));
    };
    img.src = url;
  });
}

/**
 * Prüft Typ und Größe einer Datei und macht sie hochladbar.
 * Gibt in jedem Fall Rückmeldung an den Nutzer.
 * @param {File} file
 * @param {{quiet?: boolean}} [opts] quiet unterdrückt nur den Erfolgs-Hinweis
 * @returns {Promise<File|null>} null = abgelehnt, Grund wurde bereits angezeigt
 */
function ebPrepareImageFile(file, opts) {
  opts = opts || {};
  var name = _ebShortName(file && file.name);

  if (!file) {
    _ebToast('Keine Datei erkannt. Bitte erneut versuchen.', 'error');
    return Promise.resolve(null);
  }
  if (EB_IMAGE_TYPES.indexOf(file.type) === -1) {
    _ebToast(name + ': nicht unterstützt. Erlaubt sind ' + EB_IMAGE_TYPES_LABEL + '.', 'error');
    return Promise.resolve(null);
  }
  if (file.size <= EB_MAX_IMAGE_BYTES) {
    return Promise.resolve(file);
  }
  // GIFs würden beim Umzeichnen ihre Animation verlieren — lieber ehrlich ablehnen.
  if (file.type === 'image/gif') {
    _ebToast(name + ' ist ' + ebFormatBytes(file.size) + ' groß — max. ' + EB_MAX_IMAGE_LABEL + ' für GIFs.', 'error');
    return Promise.resolve(null);
  }

  _ebToast('Bild wird verkleinert…', 'image');
  var originalSize = file.size;
  return _ebDownscaleImage(file).then(function(smaller) {
    if (!opts.quiet) {
      _ebToast('Bild automatisch verkleinert: ' + ebFormatBytes(originalSize) + ' → ' + ebFormatBytes(smaller.size), 'check_circle');
    }
    return smaller;
  }).catch(function() {
    _ebToast(name + ' ist ' + ebFormatBytes(originalSize) + ' groß und ließ sich nicht verkleinern (max. ' + EB_MAX_IMAGE_LABEL + ').', 'error');
    return null;
  });
}

/**
 * Mehrere Dateien nacheinander prüfen/verkleinern (nacheinander, damit ein
 * 20-MB-Stapel den Hauptthread nicht blockiert).
 * @returns {Promise<File[]>} nur die Dateien, die durchgekommen sind
 */
function ebPrepareImageFiles(files, opts) {
  var list = Array.prototype.slice.call(files || []);
  var out = [];
  return list.reduce(function(chain, f) {
    return chain.then(function() {
      return ebPrepareImageFile(f, opts).then(function(ok) { if (ok) out.push(ok); });
    });
  }, Promise.resolve()).then(function() { return out; });
}

/* ═══════════════════════════════════════════════════════════════════════
   SPEICHER UND EINWILLIGUNG (TDDDG § 25)

   Bis zum 20.08.2026 wurde die Einwilligung erhoben und von KEINER
   schreibenden Stelle gelesen. Der Banner sagte zusätzlich „ausschließlich
   technisch notwendige Cookies" — während `eb_taste_v1` ein Präferenzprofil
   aus dem Klickverhalten ablegte und `eb_radar_ort` den Standort. Das war
   nicht nur eine wirkungslose Einwilligung, sondern eine falsche Aussage
   gegenüber Nutzern.

   Seitdem entscheidet die Antwort wirklich. Drei Klassen, eine Quelle:

     essenziell   Anmeldung, laufende Zahlung, die Einwilligung selbst.
                  Ohne sie funktioniert die Plattform nicht — keine
                  Einwilligung nötig (§ 25 Abs. 2 Nr. 2 TDDDG).
     funktional   Komfort und selbst angelegte Inhalte.
     profil       leitet aus Verhalten Vorlieben ab. Immer einwilligungspflichtig.

   Diese Tabelle ist die Codeseite von vault/40-Governance/Legal/Cookie-Liste.md.
   `node scripts/recht.mjs --check` vergleicht beide und bricht ab, sobald ein
   Schlüssel hier oder dort fehlt — eine Klassifizierung, die nur in einer
   Prosa-Notiz steht, wird beim nächsten Feature vergessen.
   ═══════════════════════════════════════════════════════════════════════ */

var EB_SPEICHER_KLASSEN = {
  eb_cookie_consent: 'essenziell',
  eb_user: 'essenziell',
  eb_demo_session: 'essenziell',
  eb_demo_users: 'essenziell',
  eb_demo_passkeys: 'essenziell',
  eb_pending_payment: 'essenziell',
  eventboerse_pending_login_otp: 'essenziell',

  eb_dark_mode: 'funktional',
  eb_favs_: 'funktional',
  eb_board_projects: 'funktional',
  eb_board_projects_: 'funktional',
  eb_board_tombstones_: 'funktional',
  eb_accepted_bookings: 'funktional',
  eb_social_posts: 'funktional',
  eb_post_comments: 'funktional',
  eb_liked_posts: 'funktional',
  eb_nav_search: 'funktional',
  eb_passkey_prompt_dismissed_: 'funktional',
  eb_stripe_onboarding_prompt_: 'funktional',
  eb_ai_chat_v1_: 'funktional',
  eb_radar_ort: 'funktional',

  eb_kb_misses: 'profil',
  eb_taste_v1: 'profil'
};

/**
 * Klasse eines Schlüssels. Längster passender Eintrag gewinnt, damit
 * `eb_board_projects_17` nicht am kürzeren `eb_board_projects` hängen bleibt.
 *
 * Unbekannt heißt 'profil', nicht 'essenziell': ein neuer Schlüssel, den
 * niemand eingeordnet hat, wird zurückhaltend behandelt statt großzügig.
 * Der Fehler faellt dann in der Oberflaeche auf — und nicht erst, wenn
 * jemand fragt, warum ohne Einwilligung Daten liegen.
 */
function ebSpeicherKlasse(key) {
  var k = String(key || '');
  var treffer = '';
  for (var muster in EB_SPEICHER_KLASSEN) {
    if (!Object.prototype.hasOwnProperty.call(EB_SPEICHER_KLASSEN, muster)) continue;
    if (k === muster || k.indexOf(muster) === 0) {
      if (muster.length > treffer.length) treffer = muster;
    }
  }
  return treffer ? EB_SPEICHER_KLASSEN[treffer] : 'profil';
}

/** Darf dieser Schlüssel gerade geschrieben werden? */
function ebDarfSpeichern(key) {
  if (ebSpeicherKlasse(key) === 'essenziell') return true;
  var c = (typeof _getCookieConsent === 'function') ? _getCookieConsent() : null;
  // Vor der Antwort wird nichts Nicht-Essenzielles gesetzt. Das ist Schritt 2
  // der dokumentierten Bannerlogik, der vorher fehlte.
  if (!c) return false;
  return ebSpeicherKlasse(key) === 'profil' ? !!c.profil : !!c.funktional;
}

/** Schreiben, wenn erlaubt. Gibt zurück, ob wirklich geschrieben wurde. */
function ebSpeichern(key, wert) {
  if (!ebDarfSpeichern(key)) return false;
  try { localStorage.setItem(key, wert); return true; } catch (e) { return false; }
}

/**
 * Alles wegräumen, was die aktuelle Antwort nicht mehr deckt.
 *
 * Ohne diesen Schritt wäre ein Widerruf wirkungslos für alles, was vor dem
 * Widerruf schon dalag — und genau das ist der Punkt an Art. 7 Abs. 3 DSGVO:
 * Widerruf so einfach wie Erteilung.
 */
function ebSpeicherAufraeumen() {
  var weg = [];
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && !ebDarfSpeichern(k)) weg.push(k);
    }
    weg.forEach(function(k) { try { localStorage.removeItem(k); } catch (e) {} });
  } catch (e) { /* privater Modus o. Ä. — dann liegt ohnehin nichts */ }
  return weg;
}
