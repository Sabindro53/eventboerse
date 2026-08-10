// ========== COOKIE CONSENT ==========
// Nur technisch notwendige Cookies gemäß § 25 Abs. 2 Nr. 2 TDDDG — keine Einwilligung erforderlich.
// Analytics- und Marketing-Cookies werden derzeit nicht eingesetzt.
function _getCookieConsent() {
  try {
    var raw = localStorage.getItem('eb_cookie_consent');
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function toggleCookieDetails() {
  var d = document.getElementById('cookieBannerDetails');
  var t = document.getElementById('cookieDetailsToggle');
  if (!d || !t) return;
  var open = !d.hasAttribute('hidden');
  if (open) {
    d.setAttribute('hidden', '');
    t.setAttribute('aria-expanded', 'false');
    t.textContent = 'Details anzeigen';
  } else {
    d.removeAttribute('hidden');
    t.setAttribute('aria-expanded', 'true');
    t.textContent = 'Details ausblenden';
  }
}

function _saveCookieConsent() {
  localStorage.setItem('eb_cookie_consent', JSON.stringify({
    necessary: true,
    analytics: false,
    marketing: false,
    timestamp: new Date().toISOString()
  }));
  var banner = document.getElementById('cookieBanner');
  if (banner) banner.classList.remove('show');
}

function initCookieConsent() {
  var consent = _getCookieConsent();
  if (consent) return; // already answered

  var banner = document.getElementById('cookieBanner');
  if (!banner) return;

  // Show banner with slight delay for smooth entry
  setTimeout(function() { banner.classList.add('show'); }, 400);

  var acceptBtn = document.getElementById('cookieAcceptAll');
  if (acceptBtn) {
    acceptBtn.addEventListener('click', function() {
      _saveCookieConsent();
    });
  }
}

// ========== UPDATE NOTIFICATION ==========
var _EB_VERSION = '2026-04-04-1'; // Nur erhöhen bei echten neuen Features für Nutzer

// ========== CINEMATIC PREVIEW ==========
var _cinemaTimer = null;
function _startCinemaPreview(gallery, imgs, title) {
  // Hide carousel controls during preview
  gallery.querySelectorAll('.detail-gallery-arrow, .detail-gallery-dots, .detail-gallery-counter').forEach(function(el) {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.4s';
  });

  // Build cinema overlay
  var cinema = document.createElement('div');
  cinema.className = 'dg-cinema';
  var imgEls = [];
  imgs.forEach(function(src) {
    var im = document.createElement('img');
    im.className = 'dg-cinema-img';
    im.src = src;
    im.alt = title;
    cinema.appendChild(im);
    imgEls.push(im);
  });
  // Progress bar
  var prog = document.createElement('div');
  prog.className = 'dg-cinema-progress';
  cinema.appendChild(prog);
  // Counter
  var ctr = document.createElement('div');
  ctr.className = 'dg-cinema-counter';
  cinema.appendChild(ctr);
  gallery.appendChild(cinema);

  var current = 0;
  var total = imgs.length;
  var interval = 800;

  function showImage(idx) {
    imgEls.forEach(function(el, i) { el.classList.toggle('active', i === idx); });
    prog.style.width = (((idx + 1) / total) * 100) + '%';
    ctr.textContent = (idx + 1) + ' / ' + total;
  }

  function endCinema(landIdx) {
    if (_cinemaTimer) { clearInterval(_cinemaTimer); _cinemaTimer = null; }
    _detailGalleryIdx = landIdx;
    var track = document.getElementById('detailGalleryTrack');
    if (track) {
      track.style.scrollBehavior = 'auto';
      if (track.children[landIdx]) track.children[landIdx].scrollIntoView({ block: 'nearest', inline: 'start' });
      track.style.scrollBehavior = 'smooth';
    }
    _updateDetailGalleryUI();
    cinema.classList.add('fade-out');
    gallery.querySelectorAll('.detail-gallery-arrow, .detail-gallery-dots, .detail-gallery-counter').forEach(function(el) {
      el.style.opacity = '';
    });
    setTimeout(function() {
      if (cinema.parentNode) cinema.parentNode.removeChild(cinema);
    }, 650);
  }

  showImage(0);

  _cinemaTimer = setInterval(function() {
    current++;
    if (current >= total) {
      endCinema(0);
      return;
    }
    showImage(current);
  }, interval);

  cinema.addEventListener('click', function() {
    endCinema(current);
  });
}

// ========== DETAIL GALLERY CAROUSEL ==========
var _detailGalleryIdx = 0;
var _detailSwipeCleanup = null;
function _initDetailGallerySwipe() {
  // Clean up previous listeners to avoid leaks
  if (_detailSwipeCleanup) { _detailSwipeCleanup(); _detailSwipeCleanup = null; }
  var track = document.getElementById('detailGalleryTrack');
  if (!track) return;
  _detailGalleryIdx = 0;
  var startX = 0, startY = 0, dragging = false, moved = false;

  track.addEventListener('scroll', function() {
    var slideW = track.offsetWidth;
    if (slideW <= 0) return;
    var idx = Math.round(track.scrollLeft / slideW);
    if (idx !== _detailGalleryIdx) {
      _detailGalleryIdx = idx;
      _updateDetailGalleryUI();
    }
  });

  // Mouse drag
  track.addEventListener('mousedown', function(e) {
    dragging = true; moved = false;
    startX = e.clientX;
    track.style.scrollBehavior = 'auto';
    track.style.cursor = 'grabbing';
  });
  function _docMouseMove(e) {
    if (!dragging) return;
    var dx = e.clientX - startX;
    if (Math.abs(dx) > 5) moved = true;
    track.scrollLeft -= (e.clientX - startX);
    startX = e.clientX;
  }
  function _docMouseUp() {
    if (!dragging) return;
    dragging = false;
    track.style.scrollBehavior = 'smooth';
    track.style.cursor = '';
    // Snap to nearest
    var slideW = track.offsetWidth;
    var target = Math.round(track.scrollLeft / slideW) * slideW;
    track.scrollLeft = target;
  }
  document.addEventListener('mousemove', _docMouseMove);
  document.addEventListener('mouseup', _docMouseUp);
  _detailSwipeCleanup = function() {
    document.removeEventListener('mousemove', _docMouseMove);
    document.removeEventListener('mouseup', _docMouseUp);
  };
}

function _updateDetailGalleryUI() {
  var dots = document.querySelectorAll('#detailGalleryDots .detail-gallery-dot');
  dots.forEach(function(d, i) {
    d.classList.toggle('active', i === _detailGalleryIdx);
  });
  var counter = document.getElementById('detailGalleryCounter');
  if (counter) counter.textContent = (_detailGalleryIdx + 1) + ' / ' + dots.length;
}

function detailGalleryNav(dir) {
  var track = document.getElementById('detailGalleryTrack');
  if (!track) return;
  var total = track.children.length;
  _detailGalleryIdx = Math.max(0, Math.min(total - 1, _detailGalleryIdx + dir));
  track.children[_detailGalleryIdx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  _updateDetailGalleryUI();
}

function detailGalleryGoTo(idx) {
  var track = document.getElementById('detailGalleryTrack');
  if (!track) return;
  _detailGalleryIdx = idx;
  track.children[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  _updateDetailGalleryUI();
}
// ========== NAVBAR SCROLL EFFECT ==========
(function() {
  var _navShadowOn = false;
  var _scrollTicking = false;
  window.addEventListener('scroll', function() {
    if (_scrollTicking) return;
    _scrollTicking = true;
    requestAnimationFrame(function() {
      var shouldShadow = window.scrollY > 10;
      if (shouldShadow !== _navShadowOn) {
        _navShadowOn = shouldShadow;
        document.getElementById('navbar').style.boxShadow = shouldShadow ? '0 2px 12px rgba(0,0,0,0.08)' : 'none';
      }
      _scrollTicking = false;
    });
  }, { passive: true });
})();

// ========== FOOTER LOGO SCROLL ANIMATION ==========
function initFooterLogoAnimation() {
  const logo = document.querySelector('.footer-logo');
  if (!logo) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        logo.classList.add('visible');
        observer.unobserve(logo);
      }
    });
  }, { threshold: 0.3 });
  observer.observe(logo);
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
  renderFeaturedGrid();
  try {
    renderHeroMarquees();
  } catch (err) {
    console.error('Fehler beim Rendern der Hero-Marquee', err);
  }
  window.addEventListener('load', function() {
    try {
      renderHeroMarquees();
    } catch (err) {
      console.error('Fehler beim Rendern der Hero-Marquee (load)', err);
    }
  });
  initFooterLogoAnimation();
  initCookieConsent();

  // Stripe Checkout Return-Handler (success/cancel)
  try { _handleStripeReturn(); } catch(e) { console.error('Stripe return handler', e); }


  // Passkey-Verifizierung Button
  var vpkBtn = document.getElementById('verifyWithPasskeyBtn');
  if (vpkBtn) vpkBtn.addEventListener('click', verifyWithPasskey);

  // Set min date for date inputs to today
  const today = new Date().toISOString().split('T')[0];
  document.querySelectorAll('input[type="date"]').forEach(input => {
    input.min = today;
  });

  // Lightbox keyboard navigation
  document.addEventListener('keydown', (e) => {
    const lb = document.getElementById('providerLightbox');
    if (lb && lb.classList.contains('show')) {
      if (e.key === 'Escape') closeProviderLightbox();
      if (e.key === 'ArrowLeft') lightboxNav(-1);
      if (e.key === 'ArrowRight') lightboxNav(1);
      return;
    }
    const clb = document.getElementById('coverLightbox');
    if (clb && clb.classList.contains('show') && e.key === 'Escape') closeCoverLightbox();
  });
});

// ========== INTERACTIVE MAP (Leaflet) ==========
var CITY_COORDS = {
  'Berlin':      [52.5200, 13.4050],
  'Hamburg':     [53.5511,  9.9937],
  'München':     [48.1351, 11.5820],
  'Frankfurt':   [50.1109,  8.6821],
  'Düsseldorf':  [51.2277,  6.7735],
  'Starnberg':   [47.9983, 11.3408],
  'Köln':        [50.9375,  6.9603],
  'Stuttgart':   [48.7758,  9.1829],
};

const CATEGORY_EMOJI = {
  dj: '🎧', catering: '🍽️', florist: '🌸', licht: '💡',
  pyro: '🎆', foto: '📷', location: '🏰', deko: '🎈',
  planung: '📋', moderation: '🎤'
};

let leafletMap = null;
let mapMarkers = [];
let mapInitialized = false;

function toggleMapOverlay() {
  const overlay = document.getElementById('mapOverlay');
  const backdrop = document.getElementById('mapBackdrop');
  const isOpen = overlay.classList.contains('show');

  if (isOpen) {
    closeMapOverlay();
    return;
  }

  overlay.classList.add('show');
  backdrop.classList.add('show');
  document.body.style.overflow = 'hidden';

  if (!mapInitialized) {
    setTimeout(() => initLeafletMap(), 350);
    mapInitialized = true;
  } else {
    setTimeout(() => { if (leafletMap) leafletMap.invalidateSize(); }, 350);
  }

  renderLocationsList(filterDemos(LISTINGS));

  // Event-Radar: gemerkten groben Ort übernehmen und zeichnen. Es wird
  // NICHT neu nach dem Standort gefragt — das passiert nur, wenn der
  // Nutzer den Knopf drückt.
  if (typeof radarBeimOeffnen === 'function') {
    setTimeout(radarBeimOeffnen, 400);   // nach initLeafletMap
  }
}

function closeMapOverlay() {
  document.getElementById('mapOverlay').classList.remove('show');
  document.getElementById('mapBackdrop').classList.remove('show');
  document.body.style.overflow = '';
}

function initLeafletMap() {
  // Leaflet kommt von einem CDN. Fällt das aus oder blockiert es ein
  // Adblocker, warf diese Zeile bisher einen unbehandelten Fehler und riss
  // die restliche Kartenansicht mit — obwohl Trefferliste und Radar auch
  // ohne Karte vollständig arbeiten. Lieber ohne Karte als gar nichts.
  if (typeof L === 'undefined') {
    var behaelter = document.getElementById('mapContainer');
    if (behaelter && !behaelter.childElementCount) {
      behaelter.innerHTML = '<p class="radar-leer">Die Kartenansicht ist gerade nicht'
        + ' erreichbar. Die Liste unten funktioniert trotzdem.</p>';
    }
    return;
  }
  leafletMap = L.map('mapContainer', {
    zoomControl: false,
    attributionControl: false
  }).setView([51.1657, 10.4515], 6);

  L.control.zoom({ position: 'topright' }).addTo(leafletMap);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
  }).addTo(leafletMap);

  addListingMarkers(filterDemos(LISTINGS));
}

function createPriceIcon(listing) {
  const fmt = function(n) {
    return n >= 1000
      ? (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'k'
      : String(n);
  };
  const priceText = listing.priceMax && listing.priceMax > listing.price
    ? fmt(listing.price) + '–' + fmt(listing.priceMax) + '€'
    : fmt(listing.price) + '€';

  return L.divIcon({
    className: 'map-marker-wrapper',
    html: `<div class="map-marker-custom">${priceText}</div>`,
    iconSize: [70, 30],
    iconAnchor: [35, 15],
    popupAnchor: [0, -18]
  });
}

function addListingMarkers(listings) {
  // Ohne geladenes Leaflet gibt es keine Karte — die Liste bleibt
  // trotzdem bedienbar. Siehe initLeafletMap().
  if (!leafletMap) return;

  // Clear existing markers
  mapMarkers.forEach(m => leafletMap.removeLayer(m));
  mapMarkers = [];

  listings.forEach(listing => {
    // Echte Koordinaten, wenn das Inserat welche hat.
    //
    // Vorher stand hier eine Zufallsstreuung von ±0,8 km, NEU GEWÜRFELT bei
    // jedem Neuzeichnen. Dasselbe Inserat lag bei jedem Öffnen der Karte
    // woanders — eine erfundene Position, die aussah wie eine echte. Wer
    // danach seine Anfahrt einschätzt, tut das auf Basis von Zufall.
    //
    // Ohne Koordinaten sitzt der Marker jetzt exakt auf dem Stadtmittelpunkt.
    // Das ist sichtbar ungenau und damit ehrlicher als ein Punkt, der
    // Genauigkeit vortäuscht, die es nicht gibt.
    const genau = Array.isArray(listing.koordinaten) && listing.koordinaten.length === 2;
    const coords = genau ? listing.koordinaten : CITY_COORDS[listing.location];
    if (!coords) return;
    const pos = [coords[0], coords[1]];

    const marker = L.marker(pos, { icon: createPriceIcon(listing) })
      .addTo(leafletMap);

    const popupContent = `
      <div class="map-popup-card">
        <img src="${_escHtml(listing.image)}" alt="${_escHtml(listing.title)}" loading="lazy" onerror="this.onerror=null;this.src=window.EB_IMG_FALLBACK"/>
        <h4>${_escHtml(listing.title)}</h4>
        <div class="popup-meta">
          <span class="material-icons-round" style="font-size:14px;vertical-align:middle">location_on</span>
          ${_escHtml(listing.stadtteil ? listing.location + ' · ' + listing.stadtteil : listing.location)} · ${_escHtml(listing.categoryLabel)}
        </div>
        ${genau ? '' : '<div class="popup-meta popup-ungenau">Nur die Stadt bekannt — der Punkt zeigt die Stadtmitte.</div>'}
        <div class="popup-meta">★ ${_escHtml(listing.rating)} (${_escHtml(listing.reviews)} Bewertungen)</div>
        <div class="popup-price">${_escHtml(listing.priceLabel)}</div>
        <button class="popup-btn" onclick="closeMapOverlay(); navigateTo('detail', ${listing.id});">
          Details ansehen
        </button>
      </div>`;

    marker.bindPopup(popupContent, { maxWidth: 260, closeButton: true });

    marker.listingId = listing.id;
    mapMarkers.push(marker);
  });
}

function renderLocationsList(listings) {
  const list = document.getElementById('mapLocationsList');
  list.innerHTML = listings.map(l => {
    const emoji = CATEGORY_EMOJI[l.category] || '📌';
    return `
      <div class="map-loc-item" data-id="${l.id}" onclick="focusMapMarker(${l.id})">
        <img class="map-loc-img" src="${_escHtml(l.image)}" alt="${_escHtml(l.title)}" loading="lazy" onerror="this.onerror=null;this.src=window.EB_IMG_FALLBACK" />
        <div class="map-loc-info">
          <span class="map-loc-city">${_escHtml(l.location)}</span>
          <span class="map-loc-cat">${emoji} ${_escHtml(l.categoryLabel)}</span>
        </div>
        <div class="map-loc-price">${l.priceLabel}</div>
      </div>`;
  }).join('');
}

function focusMapMarker(listingId) {
  const listing = LISTINGS.find(l => l.id === listingId);
  if (!listing) return;

  const coords = CITY_COORDS[listing.location];
  if (!coords) return;

  leafletMap.flyTo(coords, 12, { duration: 0.8 });

  // Highlight sidebar item
  document.querySelectorAll('.map-loc-item').forEach(el => el.classList.remove('active'));
  const activeItem = document.querySelector(`.map-loc-item[data-id="${listingId}"]`);
  if (activeItem) {
    activeItem.classList.add('active');
    activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Activate marker styles & open popup
  mapMarkers.forEach(m => {
    const el = m.getElement();
    if (el) el.querySelector('.map-marker-custom')?.classList.remove('active');
  });
  const marker = mapMarkers.find(m => m.listingId === listingId);
  if (marker) {
    const el = marker.getElement();
    if (el) el.querySelector('.map-marker-custom')?.classList.add('active');
    marker.openPopup();
  }
}

function filterMapMarkers() {
  // Ohne geladenes Leaflet gibt es keine Karte — die Liste bleibt
  // trotzdem bedienbar. Siehe initLeafletMap().
  if (!leafletMap) return;

  const inp = document.getElementById('mapSearchInput');
  const query = inp ? inp.value.toLowerCase().trim() : '';

  const filtered = LISTINGS.filter(l => {
    const haystack = `${l.title} ${l.location} ${l.region} ${l.categoryLabel} ${l.tags.join(' ')}`.toLowerCase();
    return !query || haystack.includes(query);
  });

  // Update map markers
  if (leafletMap) {
    addListingMarkers(filtered);
    if (filtered.length > 0 && query) {
      const bounds = L.latLngBounds(filtered.map(l => CITY_COORDS[l.location]).filter(Boolean));
      if (bounds.isValid()) leafletMap.flyToBounds(bounds, { padding: [40, 40], maxZoom: 11, duration: 0.6 });
    }
  }

  // Update sidebar list
  renderLocationsList(filtered);
  return filtered;
}

function _ebTitleCase(s) {
  return String(s || '').split(/\s+/).map(function(w){
    return w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : '';
  }).join(' ').trim();
}

function _setNavWoLabel(text) {
  ['navWoValue', 'navAiQuickWoValue'].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.textContent = text || 'Region';
  });
  var btn = document.getElementById('navWoBtn');
  if (btn) btn.classList.toggle('has-value', !!text);
  var qbtn = document.getElementById('navAiQuickWo');
  if (qbtn) qbtn.classList.toggle('has-value', !!text);
}

// Called on Enter / magnifier click in the map overlay search bar.
// Zooms to the typed city (geocode fallback for unknown cities),
// writes the city into the "Wo?" nav segment + browseLocation, closes the
// map overlay and triggers the listings filter so the user immediately sees
// either matching results or the "Keine Ergebnisse / Alternativen in der
// Nähe von …" state.
function submitMapSearch() {
  var inp = document.getElementById('mapSearchInput');
  var raw = inp ? inp.value.trim() : '';
  if (!raw) { _setNavWoLabel(''); filterMapMarkers(); return; }

  var filtered = filterMapMarkers();
  // Prefer canonical city name if the input matches a known city
  var canonical = (typeof _ebDetectCityInText === 'function') ? _ebDetectCityInText(raw) : '';
  var labelCity = canonical || _ebTitleCase(raw);
  _setNavWoLabel(labelCity);

  // Sync browseLocation so listing filter uses this city
  var loc = document.getElementById('browseLocation');
  if (loc) loc.value = labelCity;

  // Close map overlay – focus shifts to the listings page
  if (typeof closeMapOverlay === 'function') {
    try { closeMapOverlay(); } catch(e) {}
  }

  // Navigate to browse and run the filter so the user gets immediate
  // feedback ("Keine Ergebnisse in Bonn" + Alternativen-Section).
  if (typeof navigateTo === 'function') {
    navigateTo('browse');
    setTimeout(function() {
      if (typeof filterListings === 'function') filterListings();
      if (typeof _ebScrollToBrowseResults === 'function') _ebScrollToBrowseResults();
    }, 200);
  } else if (typeof filterListings === 'function') {
    filterListings();
  }

  if (filtered.length > 0) return; // already zoomed via flyToBounds

  // Fallback: Geocode unknown city via Nominatim (e.g. "Bonn") so the
  // map is positioned correctly the next time it's opened.
  if (!leafletMap || !window.fetch) return;
  fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=de&q=' + encodeURIComponent(raw))
    .then(function(r){ return r.ok ? r.json() : []; })
    .then(function(arr){
      if (arr && arr[0] && leafletMap) {
        leafletMap.flyTo([parseFloat(arr[0].lat), parseFloat(arr[0].lon)], 11, { duration: 0.7 });
      }
    }).catch(function(){});
}

