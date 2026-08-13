// ========== DETAIL PAGE ==========
function loadDetail(listingId) {
  const listing = LISTINGS.find(l => l.id === listingId);
  if (!listing) return;
  currentListing = listing;
  // Lernsignal: angesehenes Inserat (lokal, siehe _ebTaste)
  _ebTasteSignal('view', { category: listing.category, location: listing.location });
  try { _setPageMeta('detail', listingId); } catch (e) { /* Meta optional */ }

  // Gallery
  const gallery = document.getElementById('detailGallery');
  const heroImg = document.getElementById('detailHeroImg');

  // Bilder defensiv normalisieren: images-Array → einzelnes image → Placeholder.
  // Verhindert Crashes bei DB-Listings ohne images-Array und eine leere Galerie
  // bei Inseraten ganz ohne Foto.
  var imgs = (Array.isArray(listing.images) && listing.images.length)
    ? listing.images
    : (listing.image ? [listing.image] : []);
  if (!imgs.length) imgs = [window.EB_IMG_FALLBACK];

  // Hero image for mobile (first image, shown prominently)
  if (imgs.length > 0) {
    heroImg.innerHTML = `<img src="${_escHtml(imgs[0])}" alt="${_escHtml(listing.title)}" class="detail-hero-photo"${window.EB_IMG_ERR_ATTR} />`;
  }

  // Swipeable gallery carousel
  // Admins sehen pro Bild einen Lösch-Button (fremde Inserate) — entfernt das
  // Bild persistent (auch bei Demo-Listings) via adminDeleteListingImage.
  var _detailCanModerate = !!(currentUser && currentUser.isAdmin && listing.providerId !== currentUser.id);
  gallery.innerHTML = '<div class="detail-gallery-track" id="detailGalleryTrack" tabindex="0" role="region" aria-label="Bilder: ' + _escHtml(listing.title) + '">' +
    imgs.map(function(img, i) {
      var delBtn = _detailCanModerate && img !== window.EB_IMG_FALLBACK
        ? '<button type="button" class="detail-gallery-admin-del" title="Bild als Admin löschen" aria-label="Bild als Admin löschen" onclick="adminDeleteListingImage(' + i + ', event)"><span class="material-icons-round">delete</span> Löschen</button>'
        : '';
      return '<div class="detail-gallery-slide"><img src="' + _escHtml(img) + '" alt="' + _escHtml(listing.title) + '"' + window.EB_IMG_ERR_ATTR + ' />' + delBtn + '</div>';
    }).join('') +
    '</div>' +
    (imgs.length > 1 ? '<button class="detail-gallery-arrow prev" aria-label="Vorheriges Bild" onclick="detailGalleryNav(-1)"><span class="material-icons-round">chevron_left</span></button>' +
    '<button class="detail-gallery-arrow next" aria-label="Nächstes Bild" onclick="detailGalleryNav(1)"><span class="material-icons-round">chevron_right</span></button>' +
    '<div class="detail-gallery-dots" id="detailGalleryDots" role="group" aria-label="Bildauswahl">' +
    imgs.map(function(_, i) { return '<button class="detail-gallery-dot' + (i === 0 ? ' active' : '') + '" onclick="detailGalleryGoTo(' + i + ')" aria-label="Bild ' + (i + 1) + ' von ' + imgs.length + ' anzeigen"></button>'; }).join('') +
    '</div>' +
    '<div class="detail-gallery-counter" id="detailGalleryCounter">1 / ' + imgs.length + '</div>' : '');
  _initDetailGallerySwipe();
  // Detect wide banners for hero + gallery
  detectWideBannerImg(heroImg.querySelector('img'));
  gallery.querySelectorAll('.detail-gallery-slide img').forEach(detectWideBannerImg);
  // Clean up previous cinema before starting new one
  if (_cinemaTimer) { clearInterval(_cinemaTimer); _cinemaTimer = null; }
  var oldCinema = gallery.querySelector('.dg-cinema');
  if (oldCinema && oldCinema.parentNode) oldCinema.parentNode.removeChild(oldCinema);
  // Cinematic preview on load
  if (imgs.length > 1) {
    _startCinemaPreview(gallery, imgs, listing.title);
  }

  // Info
  document.getElementById('detailCategory').textContent = listing.categoryLabel;
  document.getElementById('detailTitle').textContent = listing.title;
  // Review count: show stored DB values initially, loadDetailReviews will update with live data
  document.getElementById('detailRating').textContent = listing.rating || '0';
  document.getElementById('detailReviewCount').textContent = '(' + (listing.reviews || 0) + ' Bewertungen)';
  document.getElementById('detailLocation').textContent = listing.region;
  document.getElementById('detailProviderImg').src = _resolveAvatar(listing.providerImg, listing.providerName);
  document.getElementById('detailProviderName').textContent = listing.providerName;
  document.getElementById('detailProviderTag').textContent = `Superhost · Seit ${listing.providerSince} auf Eventbörse`;

  // Show edit button only for own listings
  var editBtn = document.getElementById('detailEditBtn');
  if (editBtn) editBtn.style.display = (currentUser && listing.providerId === currentUser.id) ? '' : 'none';

  // Board-Status-Chip: zeigt, ob dieses Inserat schon im Planungsboard steckt
  // (Im Plan / Kontaktiert / Angebot / Gebucht) — Verknüpfung Detail ↔ Board.
  var existingBoardStatus = document.getElementById('detailBoardStatus');
  if (existingBoardStatus) existingBoardStatus.remove();
  var _detailBadgeHtml = _boardStatusBadgeHtml(listing.id);
  if (_detailBadgeHtml) {
    var statusWrap = document.createElement('span');
    statusWrap.id = 'detailBoardStatus';
    statusWrap.innerHTML = _detailBadgeHtml;
    statusWrap.style.cursor = 'pointer';
    statusWrap.title = 'Im Planungsboard öffnen';
    statusWrap.onclick = function() { navigateTo('board'); };
    var provRowStatus = document.querySelector('.detail-provider-row');
    if (provRowStatus) provRowStatus.appendChild(statusWrap);
  }

  // Admin delete button for listing
  var existingAdminDel = document.getElementById('detailAdminDeleteBtn');
  if (existingAdminDel) existingAdminDel.remove();
  if (currentUser && currentUser.isAdmin && listing.providerId !== currentUser.id) {
    var adminDelBtn = document.createElement('button');
    adminDelBtn.id = 'detailAdminDeleteBtn';
    adminDelBtn.className = 'btn-outline btn-sm btn-danger-outline';
    adminDelBtn.innerHTML = '<span class="material-icons-round">delete</span> Inserat löschen';
    adminDelBtn.onclick = function() { adminDeleteListing(listing.id); };
    var provRow = document.querySelector('.detail-provider-row');
    if (provRow) provRow.appendChild(adminDelBtn);
  }

  document.getElementById('detailDescription').innerHTML = _sanitizeHtml(listing.description);
  // Preis + Einheit getrennt setzen — Einheit kommt aus priceLabel, NICHT hardcodiert
  // (sonst zeigt Detail z.B. "/ Event" obwohl die Karte "/ Stunde" zeigt).
  var _pl = listing.priceLabel || '';
  var _slash = _pl.indexOf('/');
  document.getElementById('detailPrice').textContent = (_slash >= 0 ? _pl.slice(0, _slash) : _pl).trim();
  var _unitEl = document.getElementById('detailPriceUnit');
  if (_unitEl) {
    var _unit = _slash >= 0 ? _pl.slice(_slash).trim() : '';
    _unitEl.textContent = _unit;
    _unitEl.style.display = _unit ? '' : 'none';
  }

  // Features
  document.getElementById('detailFeatures').innerHTML = (Array.isArray(listing.features) ? listing.features : []).map(f =>
    `<div class="feature-item"><span class="material-icons-round">check_circle</span><span>${_escHtml(f)}</span></div>`
  ).join('');

  // Sofortbuchung-Sektion (vor Anfrage-Button im bookingCard)
  _renderInstantBookSection(listing);

  // Verfügbarkeit aus DB nachladen → Picker disablen + Sofortbuchungs-Slots refreshen
  _applyAvailabilityToDetail(listing);

  // Reviews
  renderDetailReviews(listing);

  // Negotiation price
  document.getElementById('negOriginalPrice').value = listing.priceLabel;
  renderDetailCollaborationSuggestions(listing.providerId);
}

// ========== PROVIDER PROFILE ==========
let providerImages = [];
let lightboxIndex = 0;
// ID des aktuell angezeigten Provider-Profils + ob es das eigene ist
// (für Admin-Moderation von Bildern auf fremden Profilen).
let _currentProviderId = 0;
let _currentProviderIsOwn = false;

/**
 * Setzt das Provider-Page-DOM in einen sauberen, leeren Zustand zurück.
 * Wird vor jedem Provider/Profil-Aufruf synchron ausgeführt, damit zwischen
 * Page-Wechsel und Daten-Render keine alten Inhalte (z. B. eines vorher
 * angesehenen Anbieters) "durchblitzen".  Speziell wichtig für das eigene
 * Profil: wir wollen NIE Demo-Daten wie "Max Beats" im echten Nutzerkontext.
 */
function _resetProviderPageDom() {
  // Admin-Moderations-State zurücksetzen (kein stale Lösch-Button auf
  // „nicht gefunden"- oder eigenem Profil)
  _currentProviderId = 0;
  _currentProviderIsOwn = false;
  var existingLbDel = document.getElementById('plbAdminDelete');
  if (existingLbDel) existingLbDel.style.display = 'none';
  var setText = function(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  var setHtml = function(id, val) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = val;
  };

  // Cover / Galerie
  var pcg = document.getElementById('pcgScrollArea');
  if (pcg) pcg.innerHTML = '';

  // Profile Card
  var avatar = document.getElementById('providerAvatar');
  if (avatar) {
    avatar.src = 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20100%20100%22%3E%3Crect%20width%3D%22100%22%20height%3D%22100%22%20rx%3D%2250%22%20fill%3D%22%23EEEEEE%22%2F%3E%3C%2Fsvg%3E';
    avatar.alt = 'Profil';
  }
  var verified = document.getElementById('providerVerifiedBadge');
  if (verified) verified.style.display = 'none';

  // Skeleton: schlanke Linien statt Demo-Text während des Ladens
  setHtml('providerName', '<span class="eb-skeleton eb-skeleton-line lg" style="display:inline-block;width:180px"></span>');
  setHtml('providerTagline', '<span class="eb-skeleton eb-skeleton-line sm" style="display:inline-block;width:240px"></span>');
  setHtml('providerBadges', '');
  setText('providerListingCount', '–');
  setText('providerRating', '–');
  setText('providerReviews', '–');

  // Inhalts-Sektionen
  setHtml('providerBio', '');
  setHtml('providerHighlights', '');
  setHtml('providerPortfolio', '');
  setHtml('providerFacts', '');
  setHtml('providerSpecTags', '');
  setHtml('providerListings', '');
  setHtml('providerReviewsList', '');
  setHtml('providerCollaborations', '');

  // Provider-User-ID-Hidden-Input zurücksetzen
  var puidEl = document.getElementById('providerUserId');
  if (puidEl) puidEl.value = '';
}

/**
 * Zeigt einen sauberen Empty-State, wenn für eine Provider-ID keine Daten
 * gefunden werden konnten. Ersetzt den früheren, fehlerhaften Fallback auf
 * LISTINGS[0] (das war die Quelle des "Max Beats"-Bugs).
 */
function _showProviderNotFound(pid) {
  var setText = function(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  var setHtml = function(id, val) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = val;
  };
  setText('providerName', 'Profil nicht gefunden');
  setText('providerTagline', '');
  setHtml('providerBadges', '');
  setText('providerListingCount', '–');
  setText('providerRating', '–');
  setText('providerReviews', '–');
  setHtml('providerBio',
    '<div class="no-results-box" style="margin-top:12px">' +
      '<span class="material-icons-round no-results-icon">person_off</span>' +
      '<div class="no-results-box-text">' +
        '<h3>Dieses Profil ist nicht verfügbar</h3>' +
        '<p>Vielleicht wurde es entfernt oder die Verlinkung ist veraltet. ' +
        '<a href="#" onclick="navigateTo(\'browse\');return false;" style="color:var(--primary);font-weight:600">Zur Übersicht</a></p>' +
      '</div>' +
    '</div>'
  );
  setHtml('providerHighlights', '');
  setHtml('providerPortfolio', '');
  setHtml('providerFacts', '');
  setHtml('providerSpecTags', '');
  setHtml('providerListings', '');
  setHtml('providerReviewsList', '');
  setHtml('providerCollaborations', '');
  if (typeof console !== 'undefined' && console.warn) {
    console.warn('[eventboerse] loadProvider: keine Daten für Provider', pid);
  }
}

function loadProvider(providerId) {
  var pid = _toPositiveInt(providerId || (currentListing && currentListing.providerId));
  if (!pid) {
    _showProviderNotFound(pid);
    return;
  }
  // DB listings always take priority over demo data
  var dbListings = LISTINGS.filter(function(l) {
    return l && l._fromDb && _sameUserId(_listingOwnerId(l), pid);
  });
  var providerListings;
  if (dbListings.length > 0) {
    // Real provider from database
    providerListings = dbListings;
  } else {
    // Fall back to demo data
    var demoListings = LISTINGS.filter(function(l) {
      return l && !l._fromDb && _sameUserId(l.providerId, pid);
    });
    if (demoListings.length > 0) {
      providerListings = demoListings;
    } else {
      providerListings = [];
    }
  }
  var isDemoProvider = providerListings.length > 0 && !providerListings[0]._fromDb;

  // If no listings found locally, fetch provider from API — but NOT for demo providers
  if (providerListings.length === 0 && pid && !isDemoProvider) {
    // For own profile without listings, build from currentUser data
    if (currentUser && _sameUserId(pid, currentUser.id)) {
      providerListings = [{
        id: 'profile-' + pid,
        _ownProfile: true,
        providerId: pid,
        providerName: currentUser.name || 'Mein Profil',
        providerImg: currentUser.photoUrl || ebAvatar(currentUser.name || 'user', currentUser.name),
        providerSince: currentUser.since || new Date().getFullYear().toString(),
        description: currentUser.bio || '',
        location: currentUser.location || '',
        categoryLabel: currentUser.role || 'Mitglied',
        priceLabel: '',
        images: currentUser.gallery || [],
        features: [],
        tags: [],
        rating: 0,
        reviews: 0,
        badge: ''
      }];
    } else {
      fetch(_apiUrl('provider/' + pid) + '?_t=' + Date.now(), { credentials: 'same-origin', headers: _apiHeaders() })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (!data || data.message) return;
          if (data.listings && data.listings.length > 0) {
            _mergeDbListingsIntoCache(data.listings);
          } else {
            LISTINGS.push({
              id: 'profile-' + pid,
              _fromDb: true,
              providerId: pid,
              providerName: data.name || 'Anbieter',
              providerImg: data.photoUrl || ebAvatar(data.name || 'user', data.name),
              providerSince: data.since || '',
              description: data.bio || '',
              location: data.location || '',
              categoryLabel: data.role || 'Anbieter',
              priceLabel: '',
              images: data.gallery || [],
              features: [],
              tags: [],
              rating: 0,
              reviews: 0,
              badge: ''
            });
          }
          loadProvider(pid);
        })
        .catch(function() {});
      return;
    }
  }

  // FIX 2026-05: Kein Fallback auf LISTINGS[0] (= Demo-Daten "Max Beats").
  // Wenn wir keine Listings-Daten haben, zeigen wir einen Empty-State statt
  // ein fremdes Demo-Profil über das echte Nutzerprofil zu legen.
  const mainListing = providerListings[0];
  if (!mainListing) {
    _showProviderNotFound(pid);
    return;
  }
  providerImages = providerListings.flatMap(l => l.images || []);
  // Aktuell betrachtetes Profil merken (für Admin-Bildmoderation)
  _currentProviderId = pid;
  _currentProviderIsOwn = !!(currentUser && _sameUserId(pid, currentUser.id));
  // For own profile: if currentUser.gallery is non-empty, it is the saved portfolio
  // (may differ from listing images after edits — always prefer saved gallery)
  if (currentUser && _sameUserId(pid, currentUser.id) && currentUser.gallery && currentUser.gallery.length > 0) {
    providerImages = currentUser.gallery.slice();
  }
  // Vom Admin gelöschte Bilder ausblenden (auch Demo-Profile, Reload-fest)
  providerImages = providerImages.filter(function(u) { return !_isImgBlocked(u); });

  // Cover Gallery — full-width animated scroll rows
  buildGalleryRows(providerImages);

  // Profile Card
  document.getElementById('providerAvatar').src = _resolveAvatar(mainListing.providerImg, mainListing.providerName);
  document.getElementById('providerName').textContent = mainListing.providerName;
  document.getElementById('providerTagline').textContent = `${mainListing.categoryLabel} · ${mainListing.location}`;
  document.getElementById('providerListingCount').textContent = (providerListings.length === 1 && providerListings[0]._ownProfile) ? 0 : providerListings.length;
  // Provider rating/reviews from aggregated DB data — filled after API call below
  var providerRating = mainListing.rating;
  var providerReviewCount = mainListing.reviews;
  if (dbListings.length > 1) {
    var totalR = 0, countR = 0;
    dbListings.forEach(function(l) { if (l.rating > 0) { totalR += l.rating * (l.reviews || 1); countR += (l.reviews || 1); } });
    providerRating = countR > 0 ? Math.round(totalR / countR * 10) / 10 : 0;
    providerReviewCount = dbListings.reduce(function(s, l) { return s + (l.reviews || 0); }, 0);
  }
  document.getElementById('providerRating').textContent = providerRating || '–';
  document.getElementById('providerReviews').textContent = providerReviewCount || 0;

  // Store provider user ID for chat
  var puidEl = document.getElementById('providerUserId');
  if (!puidEl) {
    puidEl = document.createElement('input');
    puidEl.type = 'hidden';
    puidEl.id = 'providerUserId';
    document.getElementById('page-provider').appendChild(puidEl);
  }
  puidEl.value = mainListing.providerId || '';

  // Badges
  const badgesEl = document.getElementById('providerBadges');
  let badgesHtml = '';
  if (mainListing.categoryLabel === 'Admin') {
    badgesHtml += '<span class="ppc-badge admin-badge"><span class="material-icons-round">shield</span> Admin</span>';
  }
  if (mainListing.badge === 'Superhost') {
    badgesHtml += '<span class="ppc-badge ppc-badge-super"><span class="material-icons-round">workspace_premium</span> Superhost</span>';
  }
  badgesHtml += `<span class="ppc-badge"><span class="material-icons-round">schedule</span> Mitglied seit ${_escHtml(mainListing.providerSince)}</span>`;
  badgesHtml += '<span class="ppc-badge"><span class="material-icons-round">bolt</span> Antwortet schnell</span>';
  // Board-Verknüpfung: höchste Phase über alle Inserate dieses Anbieters
  (function() {
    var bestBadge = '';
    var bestIdx = -1;
    providerListings.forEach(function(l) {
      var st = l && _boardStatusForListing(l.id);
      if (st) {
        var idx = EB_BOARD_STAGE_ORDER.indexOf(st.stage);
        if (idx > bestIdx) { bestIdx = idx; bestBadge = _boardStatusBadgeHtml(l.id); }
      }
    });
    if (bestBadge) badgesHtml += bestBadge;
  })();
  badgesEl.innerHTML = badgesHtml;

  // Bio with read-more
  const bioEl = document.getElementById('providerBio');
  bioEl.innerHTML = _sanitizeHtml(mainListing.description);
  bioEl.classList.remove('bio-collapsed');
  const existingToggle = bioEl.parentElement.querySelector('.bio-toggle');
  if (existingToggle) existingToggle.remove();
  requestAnimationFrame(() => {
    if (bioEl.scrollHeight > 140) {
      bioEl.classList.add('bio-collapsed');
      const toggle = document.createElement('button');
      toggle.className = 'bio-toggle';
      toggle.innerHTML = '<span class="material-icons-round" style="font-size:16px">expand_more</span> Mehr anzeigen';
      toggle.onclick = () => {
        const collapsed = bioEl.classList.toggle('bio-collapsed');
        toggle.innerHTML = collapsed
          ? '<span class="material-icons-round" style="font-size:16px">expand_more</span> Mehr anzeigen'
          : '<span class="material-icons-round" style="font-size:16px">expand_less</span> Weniger anzeigen';
      };
      bioEl.parentElement.appendChild(toggle);
    }
  });

  // Highlights
  const icons = ['check_circle', 'music_note', 'lightbulb', 'handshake', 'auto_awesome', 'mic'];
  document.getElementById('providerHighlights').innerHTML = (mainListing.features || []).map((f, i) =>
    `<div class="prov-highlight"><span class="material-icons-round">${icons[i % icons.length]}</span> ${_escHtml(f)}</div>`
  ).join('');

  // Portfolio (admin-bewusst: auf fremden Profilen Lösch-Overlay für Admins)
  _renderProviderPortfolio();

  // Sidebar Facts
  document.getElementById('providerFacts').innerHTML = `
    <li><span class="material-icons-round">location_on</span> <span>${_escHtml(mainListing.location)}, Deutschland</span></li>
    <li><span class="material-icons-round">category</span> <span>${_escHtml(mainListing.categoryLabel)}</span></li>
    <li><span class="material-icons-round">euro</span> <span>${_escHtml(mainListing.priceLabel)}</span></li>
    <li><span class="material-icons-round">event_available</span> <span>Verfügbar</span></li>
    <li><span class="material-icons-round">speed</span> <span>Antwortet innerhalb von 1 Std.</span></li>
  `;

  // Spec Tags
  document.getElementById('providerSpecTags').innerHTML = (mainListing.tags || []).map(t =>
    `<span class="provider-spec-tag">${_escHtml(t)}</span>`
  ).join('');

  // Listings tab
  var hasOnlySynthetic = providerListings.length === 1 && providerListings[0]._ownProfile;
  if (hasOnlySynthetic) {
    document.getElementById('providerListings').innerHTML =
      '<div class="provider-add-listing" onclick="navigateTo(\'create-listing\')" style="' +
        'display:flex;flex-direction:column;align-items:center;justify-content:center;' +
        'border:2px dashed var(--border);border-radius:var(--radius-lg);' +
        'padding:48px 24px;cursor:pointer;transition:all .2s ease;' +
        'min-height:200px;color:var(--text-light);text-align:center;">' +
        '<span class="material-icons-round" style="font-size:56px;margin-bottom:12px;color:var(--primary);">add_circle_outline</span>' +
        '<span style="font-size:1.05rem;font-weight:600;color:var(--dark);">Erstes Inserat erstellen</span>' +
        '<span style="font-size:0.85rem;margin-top:4px;">Zeig der Community was du anbietest</span>' +
      '</div>';
  } else {
    var plGrid = document.getElementById('providerListings');
    plGrid.innerHTML = providerListings.map(renderListingCard).join('');
    _initGridCards(plGrid);
  }

  // Reviews tab — load from API
  var providerDbId = pid;
  if (providerDbId && mainListing._fromDb) {
    document.getElementById('providerReviewsList').innerHTML = '<div style="text-align:center; padding:20px;"><div class="spinner"></div></div>';
    fetch(_apiUrl('provider/' + providerDbId) + '?_t=' + Date.now(), { credentials: 'same-origin', headers: _apiHeaders() })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var reviews = data.reviews || [];
        if (reviews.length === 0) {
          document.getElementById('providerReviewsList').innerHTML =
            '<div style="text-align:center; padding: 40px 20px; color: var(--text-light);">' +
              '<span class="material-icons-round" style="font-size: 48px; margin-bottom: 12px; opacity: 0.4;">rate_review</span>' +
              '<p style="font-size: 1.05rem; font-weight: 600; color: var(--dark); margin-bottom: 6px;">Noch keine Bewertungen</p>' +
              '<p style="font-size: 0.9rem;">Dieser Anbieter ist neu auf Eventbörse.</p>' +
            '</div>';
        } else {
          document.getElementById('providerReviewsList').innerHTML = reviews.map(function(r) {
            var avatar = r.avatar || ebAvatar(r.name || 'user', r.name);
            var rating = parseInt(r.rating) || 0;
            var ltHtml = r.listingTitle ? '<div style="font-size:0.8rem;color:var(--text-light);margin-top:2px;">zu: ' + _escHtml(r.listingTitle) + '</div>' : '';
            var isOwnReview = currentUser && r.user_id && _sameUserId(r.user_id, currentUser.id);
            var isProviderOwner = currentUser && pid && _sameUserId(pid, currentUser.id);
            var canDelete = isOwnReview || isProviderOwner || (currentUser && currentUser.isAdmin);
            var deleteBtn = canDelete ? '<button onclick="deleteReview(' + r.id + ')" class="review-delete-btn" title="Bewertung löschen" aria-label="Bewertung löschen"><span class="material-icons-round">close</span></button>' : '';
            return '<div class="review-card">' +
              '<img src="' + _escHtml(avatar) + '" alt="' + _escHtml(r.name || 'Anonym') + '" class="review-avatar"' + (r.user_id ? ' style="cursor:pointer" onclick="navigateTo(\'provider\',' + r.user_id + ')"' : '') + ' />' +
              '<div class="review-content">' +
                '<div class="review-top"><strong' + (r.user_id ? ' style="cursor:pointer" onclick="navigateTo(\'provider\',' + r.user_id + ')"' : '') + '>' + _escHtml(r.name || 'Anonym') + '</strong>' + deleteBtn + '</div>' +
                '<div class="review-stars">' + _renderStars(rating) + '</div>' +
                ltHtml +
                '<p class="review-text">' + _escHtml(r.text || '') + '</p>' +
                '<span class="review-date">' + _escHtml(r.date || '') + '</span>' +
              '</div></div>';
          }).join('');
          // Update provider stats with real data
          var totalRating = reviews.reduce(function(s, r) { return s + (parseInt(r.rating) || 0); }, 0);
          var avgRating = Math.round(totalRating / reviews.length * 10) / 10;
          document.getElementById('providerRating').textContent = avgRating;
          document.getElementById('providerReviews').textContent = reviews.length;
        }
      })
      .catch(function() {});
  } else {
    document.getElementById('providerReviewsList').innerHTML =
      '<div style="text-align:center; padding: 40px 20px; color: var(--text-light);">' +
        '<span class="material-icons-round" style="font-size: 48px; margin-bottom: 12px; opacity: 0.4;">rate_review</span>' +
        '<p style="font-size: 1.05rem; font-weight: 600; color: var(--dark); margin-bottom: 6px;">Noch keine Bewertungen</p>' +
        '<p style="font-size: 0.9rem;">Dieser Anbieter ist neu auf Eventbörse.</p>' +
      '</div>';
  }

  // Action bar: show edit buttons for own profile, else message/follow
  var isOwnProviderProfile = currentUser && _sameUserId(pid, currentUser.id);
  var actionBar = document.querySelector('.provider-action-bar');
  if (actionBar) {
    if (isOwnProviderProfile) {
      actionBar.innerHTML =
        '<button class="btn-primary" onclick="toggleProviderEditMode()">' +
          '<span class="material-icons-round">edit</span> Profil bearbeiten' +
        '</button>' +
        '<button class="btn-outline" onclick="shareProvider()">' +
          '<span class="material-icons-round">share</span> Teilen' +
        '</button>';
    } else {
      var adminBtns = '';
      if (currentUser && currentUser.isAdmin) {
        adminBtns = '<button class="btn-outline btn-sm btn-danger-outline" onclick="adminDeleteUser(' + pid + ')">' +
          '<span class="material-icons-round">person_remove</span> Nutzer löschen' +
        '</button>';
      }
      actionBar.innerHTML =
        '<button class="btn-primary" onclick="startChatWithProvider()">' +
          '<span class="material-icons-round">chat</span> Nachricht senden' +
        '</button>' +
        '<button class="btn-outline" onclick="toggleFollow()">' +
          '<span class="material-icons-round" id="followIcon">person_add</span> <span id="followLabel">Folgen</span>' +
        '</button>' +
        '<button class="btn-outline" onclick="shareProvider()">' +
          '<span class="material-icons-round">share</span> Teilen' +
        '</button>' + adminBtns;
    }
  }

  // Reset to first tab
  switchProviderTab(document.querySelector('.provider-tabs .tab'), 'inserate');
  loadProviderCollaborations(pid, isOwnProviderProfile);
}

function switchProviderTab(btn, tab) {
  document.querySelectorAll('.provider-tabs .tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.provider-tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById('provider-tab-' + tab).classList.add('active');
}

/* ====== INLINE PROVIDER EDIT MODE ====== */
var _providerEditMode = false;

function toggleProviderEditMode() {
  _providerEditMode = !_providerEditMode;
  var page = document.getElementById('page-provider');
  if (!page) return;

  if (_providerEditMode) {
    page.classList.add('provider-edit-mode');
    _enterProviderEdit();
  } else {
    page.classList.remove('provider-edit-mode');
    _exitProviderEdit();
  }
}

function _enterProviderEdit() {
  var actionBar = document.querySelector('.provider-action-bar');
  if (actionBar) {
    actionBar.innerHTML =
      '<button class="btn-primary" onclick="_provSaveAndExit()">' +
        '<span class="material-icons-round">save</span> Speichern' +
      '</button>' +
      '<button class="btn-outline" onclick="shareProvider()">' +
        '<span class="material-icons-round">share</span> Teilen' +
      '</button>';
  }

  // --- Avatar edit overlay ---

  // Sync currentUser.gallery with all images currently shown in portfolio
  // (providerImages may come from listing data, not currentUser.gallery)
  if (currentUser && providerImages.length > 0) {
    currentUser.gallery = providerImages.slice();
  }
  var avatarImg = document.getElementById('providerAvatar');
  if (avatarImg && !avatarImg.parentElement.querySelector('.prov-edit-avatar-overlay')) {
    // Wrap avatar in a relative container if not already wrapped
    var avatarWrapper = avatarImg.parentElement;
    if (!avatarWrapper.classList.contains('prov-avatar-wrapper')) {
      avatarWrapper = document.createElement('div');
      avatarWrapper.className = 'prov-avatar-wrapper';
      avatarImg.parentNode.insertBefore(avatarWrapper, avatarImg);
      avatarWrapper.appendChild(avatarImg);
    }
    var overlay = document.createElement('div');
    overlay.className = 'prov-edit-avatar-overlay';
    overlay.innerHTML = '<span class="material-icons-round">photo_camera</span>';
    overlay.onclick = function() { document.getElementById('provEditAvatarInput').click(); };
    avatarWrapper.appendChild(overlay);
    // Hidden file input
    if (!document.getElementById('provEditAvatarInput')) {
      var inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*'; inp.id = 'provEditAvatarInput';
      inp.style.display = 'none';
      inp.onchange = function() { _provEditAvatar(this); };
      document.getElementById('page-provider').appendChild(inp);
    }
  }

  // --- Cover gallery edit overlay ---
  var coverGallery = document.getElementById('providerCoverGallery');
  if (coverGallery && !coverGallery.querySelector('.prov-edit-cover-overlay')) {
    var covOverlay = document.createElement('div');
    covOverlay.className = 'prov-edit-cover-overlay';
    covOverlay.innerHTML =
      '<button class="prov-edit-cover-btn" onclick="document.getElementById(\'provEditGalleryInput\').click()">' +
        '<span class="material-icons-round">add_photo_alternate</span> Bilder hinzufügen' +
      '</button>';
    coverGallery.appendChild(covOverlay);
    if (!document.getElementById('provEditGalleryInput')) {
      var ginp = document.createElement('input');
      ginp.type = 'file'; ginp.accept = 'image/*'; ginp.multiple = true;
      ginp.id = 'provEditGalleryInput'; ginp.style.display = 'none';
      ginp.onchange = function() { _provEditAddGalleryImages(this); };
      document.getElementById('page-provider').appendChild(ginp);
    }
  }

  // --- Name inline edit ---
  var nameEl = document.getElementById('providerName');
  if (nameEl && !nameEl.querySelector('.prov-edit-icon')) {
    nameEl.setAttribute('contenteditable', 'true');
    nameEl.classList.add('prov-editable');
    var editIcon = document.createElement('span');
    editIcon.className = 'material-icons-round prov-edit-icon';
    editIcon.textContent = 'edit';
    nameEl.appendChild(editIcon);
    nameEl.addEventListener('blur', _provSaveName);
    nameEl.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); nameEl.blur(); } });
  }

  // --- Tagline inline edit ---
  var tagEl = document.getElementById('providerTagline');
  if (tagEl && !tagEl.querySelector('.prov-edit-icon')) {
    tagEl.setAttribute('contenteditable', 'true');
    tagEl.classList.add('prov-editable');
    var tIcon = document.createElement('span');
    tIcon.className = 'material-icons-round prov-edit-icon';
    tIcon.textContent = 'edit';
    tagEl.appendChild(tIcon);
    tagEl.addEventListener('blur', _provSaveTagline);
    tagEl.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); tagEl.blur(); } });
  }

  // --- Bio inline edit ---
  var bioEl = document.getElementById('providerBio');
  if (bioEl) {
    bioEl.classList.remove('bio-collapsed');
    var bioToggle = bioEl.parentElement.querySelector('.bio-toggle');
    if (bioToggle) bioToggle.style.display = 'none';
    if (!bioEl.querySelector('.prov-edit-bio-area')) {
      var bioText = bioEl.innerText.trim();
      var editWrap = document.createElement('div');
      editWrap.className = 'prov-edit-bio-area';
      editWrap.innerHTML =
        '<textarea class="prov-edit-textarea" id="provEditBioText" rows="5" placeholder="Erzähle etwas über dich...">' +
          _escHtml(bioText) +
        '</textarea>';
      bioEl.innerHTML = '';
      bioEl.appendChild(editWrap);
    }
  }

  // --- Portfolio edit mode: add remove/crop buttons on each image ---
  var portfolioEl = document.getElementById('providerPortfolio');
  if (portfolioEl) {
    var imgs = portfolioEl.querySelectorAll('img');
    imgs.forEach(function(img, i) {
      if (img.parentElement.classList.contains('prov-portfolio-edit-wrap')) return;
      var wrap = document.createElement('div');
      wrap.className = 'prov-portfolio-edit-wrap';
      wrap.setAttribute('data-url', img.src);
      img.parentNode.insertBefore(wrap, img);
      wrap.appendChild(img);
      // Remove button
      var removeBtn = document.createElement('button');
      removeBtn.className = 'prov-portfolio-remove';
      removeBtn.innerHTML = '<span class="material-icons-round">close</span>';
      removeBtn.onclick = function(e) { e.stopPropagation(); _provRemovePortfolioImage(wrap); };
      wrap.appendChild(removeBtn);
      // Crop button
      var cropBtn = document.createElement('button');
      cropBtn.className = 'prov-portfolio-crop';
      cropBtn.innerHTML = '<span class="material-icons-round">crop</span>';
      cropBtn.onclick = function(e) { e.stopPropagation(); _provCropPortfolioImage(wrap); };
      wrap.appendChild(cropBtn);
      // Remove old onclick
      img.removeAttribute('onclick');
      img.style.cursor = 'default';
    });
    // Add button for more images
    if (!portfolioEl.querySelector('.prov-portfolio-add')) {
      var addBtn = document.createElement('div');
      addBtn.className = 'prov-portfolio-add';
      addBtn.innerHTML = '<span class="material-icons-round">add_photo_alternate</span><span>Bild hinzufügen</span>';
      addBtn.onclick = function() { document.getElementById('provEditGalleryInput').click(); };
      portfolioEl.appendChild(addBtn);
    }
  }

}

function _exitProviderEdit() {
  var actionBar = document.querySelector('.provider-action-bar');
  if (actionBar) {
    actionBar.innerHTML =
      '<button class="btn-primary" onclick="toggleProviderEditMode()">' +
        '<span class="material-icons-round">edit</span> Profil bearbeiten' +
      '</button>' +
      '<button class="btn-outline" onclick="shareProvider()">' +
        '<span class="material-icons-round">share</span> Teilen' +
      '</button>';
  }
  // Remove avatar overlay
  var avatarOverlay = document.querySelector('.prov-edit-avatar-overlay');
  if (avatarOverlay) avatarOverlay.remove();

  // Remove cover overlay
  var covOverlay = document.querySelector('.prov-edit-cover-overlay');
  if (covOverlay) covOverlay.remove();

  // Restore name
  var nameEl = document.getElementById('providerName');
  if (nameEl) {
    nameEl.removeAttribute('contenteditable');
    nameEl.classList.remove('prov-editable');
    var icon = nameEl.querySelector('.prov-edit-icon');
    if (icon) icon.remove();
    nameEl.removeEventListener('blur', _provSaveName);
    // Clean text
    nameEl.textContent = nameEl.textContent.trim();
  }

  // Restore tagline
  var tagEl = document.getElementById('providerTagline');
  if (tagEl) {
    tagEl.removeAttribute('contenteditable');
    tagEl.classList.remove('prov-editable');
    var icon2 = tagEl.querySelector('.prov-edit-icon');
    if (icon2) icon2.remove();
    tagEl.removeEventListener('blur', _provSaveTagline);
    tagEl.textContent = tagEl.textContent.trim();
  }

  // Restore bio
  var bioEl = document.getElementById('providerBio');
  if (bioEl) {
    var bioArea = bioEl.querySelector('.prov-edit-bio-area');
    if (bioArea) {
      var bioText = currentUser ? (currentUser.bio || '') : '';
      bioEl.innerHTML = _sanitizeHtml(bioText);
    }
    var bioToggle = bioEl.parentElement.querySelector('.bio-toggle');
    if (bioToggle) bioToggle.style.display = '';
  }

  // Restore portfolio
  var portfolioEl = document.getElementById('providerPortfolio');
  if (portfolioEl) {
    // Remove add button
    var addBtn = portfolioEl.querySelector('.prov-portfolio-add');
    if (addBtn) addBtn.remove();
    // Unwrap images
    portfolioEl.querySelectorAll('.prov-portfolio-edit-wrap').forEach(function(wrap) {
      var img = wrap.querySelector('img');
      if (img) {
        img.style.cursor = 'pointer';
        var idx = Array.from(portfolioEl.querySelectorAll('.prov-portfolio-edit-wrap')).indexOf(wrap);
        img.setAttribute('onclick', 'openProviderLightbox(' + idx + ')');
        wrap.parentNode.insertBefore(img, wrap);
      }
      wrap.remove();
    });
  }

  // Sync providerImages from the live DOM (avoids LISTINGS cache reverting cropped URLs)
  if (portfolioEl) {
    providerImages = Array.from(portfolioEl.querySelectorAll('img')).map(function(img) { return img.src; });
  }
  // Rebuild cover gallery with final providerImages
  buildGalleryRows(providerImages);
}

function _provEditAvatar(input) {
  if (!input.files || !input.files[0]) return;
  var file = input.files[0];
  if (file.size > 5 * 1024 * 1024) { showToast('Bild zu groß! Max. 5MB', 'error'); input.value = ''; return; }
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      _cropImg = img;
      _cropX = 0; _cropY = 0;
      document.getElementById('cropZoom').value = 1;
      openModal('avatarCropModal');
      setTimeout(function() { cropDraw(); cropBindEvents(); }, 50);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  input.value = '';
}

function _provSaveName() {
  var nameEl = document.getElementById('providerName');
  if (!nameEl || !currentUser) return;
  var newName = nameEl.textContent.replace(/edit$/i, '').trim();
  if (!newName || newName === currentUser.name) return;
  currentUser.name = newName;
  // Update nav avatar name
  var navName = document.querySelector('.dropdown-name');
  if (navName) navName.textContent = newName;
  fetch(_apiUrl('profile'), {
    method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
    body: JSON.stringify({ name: newName })
  }).then(function() { showToast('Name gespeichert!', 'check_circle'); })
    .catch(function() { showToast('Fehler beim Speichern', 'error'); });
}

function _provSaveTagline() {
  var tagEl = document.getElementById('providerTagline');
  if (!tagEl || !currentUser) return;
  var parts = tagEl.textContent.replace(/edit$/i, '').trim();
  // Tagline format: "Category · Location" — save as tagline
  currentUser.tagline = parts;
  fetch(_apiUrl('profile'), {
    method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
    body: JSON.stringify({ tagline: parts })
  }).then(function() { showToast('Tagline gespeichert!', 'check_circle'); })
    .catch(function() { showToast('Fehler beim Speichern', 'error'); });
}

function _provSaveAll() {
  if (!currentUser) return Promise.reject();
  var payload = {};
  // Bio
  var bioTextarea = document.getElementById('provEditBioText');
  if (bioTextarea) {
    var bioText = bioTextarea.value.trim();
    currentUser.bio = bioText;
    payload.bio = bioText;
  }
  // Gallery — read from DOM wraps (source of truth; includes adds/removes/crops)
  var gallery = [];
  var portfolioEl = document.getElementById('providerPortfolio');
  if (portfolioEl) {
    portfolioEl.querySelectorAll('.prov-portfolio-edit-wrap').forEach(function(wrap) {
      var url = wrap.getAttribute('data-url');
      // skip blob: URLs (upload in progress, not yet persisted)
      if (url && !url.startsWith('blob:')) gallery.push(url);
    });
  }
  if (gallery.length === 0) gallery = currentUser.gallery || [];
  currentUser.gallery = gallery;
  payload.gallery = gallery;
  // Also update LISTINGS cache so loadProvider won't revert on re-render
  LISTINGS.forEach(function(l) {
    if (l.providerId === currentUser.id) l.images = gallery.slice();
  });
  providerImages = gallery.slice();
  return fetch(_apiUrl('profile'), {
    method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
    body: JSON.stringify(payload)
  }).then(function(resp) {
    if (!resp.ok) {
      showToast('Fehler beim Speichern (Status ' + resp.status + ')', 'error');
      return Promise.reject();
    }
    return resp;
  }).catch(function() { showToast('Fehler beim Speichern', 'error'); return Promise.reject(); });
}

function _provSaveAndExit() {
  _provSaveAll().then(function() {
    toggleProviderEditMode();
    showToast('Profil gespeichert!', 'check_circle');
  }).catch(function() { /* error toast already shown */ });
}

function _provSaveBio() {
  var textarea = document.getElementById('provEditBioText');
  if (!textarea || !currentUser) return;
  var bioText = textarea.value.trim();
  currentUser.bio = bioText;
  fetch(_apiUrl('profile'), {
    method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
    body: JSON.stringify({ bio: bioText })
  }).then(function() { showToast('Bio gespeichert!', 'check_circle'); })
    .catch(function() { showToast('Fehler beim Speichern', 'error'); });
}

function _provRemovePortfolioImage(wrap) {
  var url = wrap.getAttribute('data-url');
  wrap.remove();
  // Update gallery in currentUser
  if (currentUser && currentUser.gallery) {
    currentUser.gallery = currentUser.gallery.filter(function(g) { return g !== url; });
    _provSaveGallery();
  }
  // Also update providerImages
  var idx = providerImages.indexOf(url);
  if (idx > -1) providerImages.splice(idx, 1);
  showToast('Bild entfernt', 'delete');
  // Rebuild cover gallery to reflect removal immediately
  buildGalleryRows(providerImages);
}

function _provCropPortfolioImage(wrap) {
  var img = wrap.querySelector('img');
  if (!img) return;
  var imgObj = new Image();
  // Same-origin images: crossOrigin not needed, canvas won't be tainted
  imgObj.onload = function() {
    _lcropImg = imgObj;
    _lcropX = 0; _lcropY = 0;
    _lcropEditTarget = wrap;
    _lcropMode = 'provider-portfolio';
    _lcropQueue = []; _lcropQueueIdx = 0;
    document.getElementById('lcropZoom').value = 1;
    openModal('listingCropModal');
    setTimeout(function() { lcropDraw(); lcropBindEvents(); }, 50);
  };
  imgObj.onerror = function() { showToast('Bild konnte nicht geladen werden', 'error'); };
  imgObj.src = img.src;
}

function _provEditAddGalleryImages(input) {
  if (!input.files || input.files.length === 0) return;
  var maxTotal = 50;
  var currentCount = (currentUser && currentUser.gallery) ? currentUser.gallery.length : 0;
  var files = Array.from(input.files);
  if (currentCount + files.length > maxTotal) {
    showToast('Maximal ' + maxTotal + ' Galerie-Bilder erlaubt!', 'error');
    files = files.slice(0, maxTotal - currentCount);
  }
  input.value = '';
  // Open crop modal for each image
  _lcropMode = 'provider-portfolio';
  _lcropEditTarget = null;
  _lcropQueue = files;
  _lcropQueueIdx = 0;
  if (files.length > 0) _lcropProcessNext();
}

function _provSaveGallery() {
  if (!currentUser) return;
  var gallery = currentUser.gallery || [];
  return fetch(_apiUrl('profile'), {
    method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
    body: JSON.stringify({ gallery: gallery })
  }).then(function(resp) {
    if (!resp.ok) showToast('Fehler beim Speichern der Galerie (Status ' + resp.status + ')', 'error');
    return resp;
  }).catch(function() { showToast('Fehler beim Speichern', 'error'); });
}

function _provAddPortfolioItem(url) {
  if (!currentUser) return;
  if (!currentUser.gallery) currentUser.gallery = [];
  currentUser.gallery.push(url);
  providerImages.push(url);
  _provSaveGallery();
  // Rebuild cover gallery to reflect the new image immediately
  buildGalleryRows(providerImages);
  // Add to portfolio grid if in edit mode
  var portfolioEl = document.getElementById('providerPortfolio');
  if (portfolioEl && _providerEditMode) {
    var addBtn = portfolioEl.querySelector('.prov-portfolio-add');
    var wrap = document.createElement('div');
    wrap.className = 'prov-portfolio-edit-wrap';
    wrap.setAttribute('data-url', url);
    var img = document.createElement('img');
    img.src = url; img.alt = 'Portfolio'; img.loading = 'lazy';
    img.style.cursor = 'default';
    wrap.appendChild(img);
    var removeBtn = document.createElement('button');
    removeBtn.className = 'prov-portfolio-remove';
    removeBtn.innerHTML = '<span class="material-icons-round">close</span>';
    removeBtn.onclick = function(e) { e.stopPropagation(); _provRemovePortfolioImage(wrap); };
    wrap.appendChild(removeBtn);
    var cropBtn = document.createElement('button');
    cropBtn.className = 'prov-portfolio-crop';
    cropBtn.innerHTML = '<span class="material-icons-round">crop</span>';
    cropBtn.onclick = function(e) { e.stopPropagation(); _provCropPortfolioImage(wrap); };
    wrap.appendChild(cropBtn);
    portfolioEl.insertBefore(wrap, addBtn);
    detectWideBannerImg(img);
  }
}

/* ── Gallery Lightbox ── */
var _galleryLightboxImages = [];
var _galleryLightboxIndex = 0;

function openGalleryLightbox(index) {
  var gallery = document.getElementById('profileGalleryDisplay');
  _galleryLightboxImages = Array.from(gallery.querySelectorAll('img')).map(function(img) { return img.src; });
  if (_galleryLightboxImages.length === 0) return;
  _galleryLightboxIndex = index;
  document.getElementById('galleryLightboxImg').src = _galleryLightboxImages[_galleryLightboxIndex];
  document.getElementById('galleryLightboxCounter').textContent = (_galleryLightboxIndex + 1) + ' / ' + _galleryLightboxImages.length;
  document.getElementById('galleryLightbox').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeGalleryLightbox(e) {
  if (e && e.target && e.target.tagName === 'IMG') return;
  if (e && e.target && e.target.closest('.plb-nav')) return;
  document.getElementById('galleryLightbox').classList.remove('show');
  document.body.style.overflow = '';
}

function galleryLightboxNav(dir) {
  _galleryLightboxIndex = (_galleryLightboxIndex + dir + _galleryLightboxImages.length) % _galleryLightboxImages.length;
  document.getElementById('galleryLightboxImg').src = _galleryLightboxImages[_galleryLightboxIndex];
  document.getElementById('galleryLightboxCounter').textContent = (_galleryLightboxIndex + 1) + ' / ' + _galleryLightboxImages.length;
}

/* ── Cover Fullscreen Lightbox ── */
function openCoverLightbox() {
  const cover = document.getElementById('profileCover');
  const bg = cover.style.backgroundImage;
  const url = bg ? bg.replace(/url\(["']?/, '').replace(/["']?\)/, '') : '';
  if (!url) return;
  document.getElementById('coverLightboxImg').src = url;
  document.getElementById('coverLightbox').classList.add('show');
  document.body.style.overflow = 'hidden';
}
function closeCoverLightbox(e) {
  if (e && e.target && e.target.tagName === 'IMG') return;
  document.getElementById('coverLightbox').classList.remove('show');
  document.body.style.overflow = '';
}

/* --- Animated Gallery Rows --- */
let galleryRAFs = [];

function buildGalleryRows(images) {
  const gallery = document.getElementById('providerCoverGallery');
  const area = document.getElementById('pcgScrollArea');
  if (!area || !gallery) return;
  area.innerHTML = '';
  galleryRAFs.forEach(function(r) { if (r && r.cancel) r.cancel(); else cancelAnimationFrame(r); });
  galleryRAFs = [];

  var provPage = document.getElementById('page-provider');
  if (!images.length) {
    // In edit mode: keep gallery visible so the upload button overlay is accessible
    var isEditMode = !!(document.getElementById('page-provider') || {}).classList && document.getElementById('page-provider').classList.contains('provider-edit-mode');
    if (!isEditMode) {
      gallery.style.display = 'none';
      if (provPage) provPage.style.setProperty('padding-top', 'calc(var(--nav-height) + 48px)', 'important');
    } else {
      gallery.style.display = '';
      if (provPage) provPage.style.setProperty('padding-top', '0', 'important');
    }
    return;
  }
  gallery.style.display = '';
  if (provPage) provPage.style.setProperty('padding-top', '0', 'important');

  // === Single image: static full-cover display, no animation ===
  if (images.length === 1) {
    area.style.padding = '0';
    const t = document.createElement('div');
    t.className = 'pcg-thumb';
    t.style.cssText = 'width:100%;height:100%;flex:1;background-size:cover;background-position:center;';
    t.style.backgroundImage = `url(${images[0]})`;
    t.addEventListener('click', () => openProviderLightbox(0));
    area.appendChild(t);
    return;
  }
  area.style.padding = '';

  // Row count: 1-9 → 1 row, 10-14 → 2 rows, 15+ → 3 rows
  const rowCount = images.length >= 15 ? 3 : images.length >= 10 ? 2 : 1;

  // Compute explicit pixel heights from container
  const gap = 6;
  const pad = 8; // padding top+bottom on scroll area
  const availH = gallery.offsetHeight - pad * 2;
  const totalGaps = (rowCount - 1) * gap;
  const thumbH = Math.floor((availH - totalGaps) / rowCount);
  const thumbW = Math.round(thumbH * 1.5); // landscape ratio
  const itemW = thumbW + gap;
  const viewW = gallery.offsetWidth || window.innerWidth;

  for (let r = 0; r < rowCount; r++) {
    const rowImages = [];
    for (let i = r; i < images.length; i += rowCount) {
      rowImages.push({ src: images[i], globalIdx: i });
    }
    if (!rowImages.length) continue;

    const wrap = document.createElement('div');
    wrap.className = 'pcg-row-wrap';
    wrap.style.height = thumbH + 'px';
    const row = document.createElement('div');
    row.className = 'pcg-row';
    row.style.height = thumbH + 'px';

    // Calculate enough copies to fill the viewport for seamless looping:
    // strip must be >= 2*segW + viewW so pos range [-2*segW, 0] never shows blank space
    const segW = rowImages.length * itemW;
    const copies = Math.max(3, Math.ceil(viewW / segW) + 2);
    const repeated = [];
    for (let c = 0; c < copies; c++) { rowImages.forEach(item => repeated.push(item)); }

    repeated.forEach(item => {
      const t = document.createElement('div');
      t.className = 'pcg-thumb';
      t.style.backgroundImage = `url(${item.src})`;
      t.style.width = thumbW + 'px';
      t.style.height = thumbH + 'px';
      // Detect portrait or extreme-wide images and adjust
      const img = new Image();
      img.onload = () => {
        const ratio = img.naturalWidth / img.naturalHeight;
        if (ratio < 1) {
          // Portrait: adjust width to image proportions
          const portraitW = Math.round(thumbH * ratio);
          t.style.width = portraitW + 'px';
          t.classList.add('pcg-contain');
        } else if (ratio > 2.2) {
          // Very wide banner: contain so full text/logo is visible
          t.classList.add('pcg-contain');
        }
      };
      img.src = item.src;
      t.addEventListener('click', () => openProviderLightbox(item.globalIdx));
      row.appendChild(t);
    });

    wrap.appendChild(row);
    area.appendChild(wrap);

    const dir = r % 2 === 0 ? -1 : 1;
    const speed = 0.3 + r * 0.1;
    startRowAnimation(row, segW, dir, speed, wrap, itemW);
  }
}

function startRowAnimation(row, segW, dir, baseSpeed, wrap, itemW) {
  let pos = dir === -1 ? 0 : -segW;
  let velocity = baseSpeed * dir;
  let dragging = false;
  let dragStartX = 0;
  let dragStartPos = 0;
  let lastDragX = 0;
  let dragVelocity = 0;
  let lastTime = 0;

  function normalizePos() {
    // Keep pos within [-2*segW, 0] for seamless looping
    while (pos < -2 * segW) pos += segW;
    while (pos > 0) pos -= segW;
  }

  let _rafId = 0;
  function tick(ts) {
    if (!lastTime) lastTime = ts;
    const dt = Math.min(ts - lastTime, 32); // Cap at ~30fps minimum
    lastTime = ts;

    if (!dragging) {
      // If we have residual drag velocity, blend it back to auto
      if (Math.abs(dragVelocity) > 0.1) {
        pos += dragVelocity * (dt / 16);
        // Decay drag velocity toward auto speed
        dragVelocity *= 0.95;
        if (Math.abs(dragVelocity) < Math.abs(velocity)) dragVelocity = 0;
      } else {
        dragVelocity = 0;
        pos += velocity * (dt / 16);
      }
    }

    normalizePos();
    row.style.transform = `translateX(${pos}px)`;
    _rafId = requestAnimationFrame(tick);
  }

  _rafId = requestAnimationFrame(tick);
  galleryRAFs.push({ cancel: function() { cancelAnimationFrame(_rafId); } });

  // --- Touch/Mouse drag ---
  const onStart = (x) => {
    dragging = true;
    dragStartX = x;
    dragStartPos = pos;
    lastDragX = x;
    dragVelocity = 0;
  };

  const onMove = (x) => {
    if (!dragging) return;
    const dx = x - dragStartX;
    pos = dragStartPos + dx;
    // Track velocity from last move
    dragVelocity = (x - lastDragX) * 0.5;
    lastDragX = x;
  };

  const onEnd = () => {
    if (!dragging) return;
    dragging = false;
    // dragVelocity carries momentum, will decay in tick()
  };

  wrap.addEventListener('mousedown', e => { e.preventDefault(); onStart(e.clientX); });
  wrap.addEventListener('mousemove', e => { if (dragging) { e.preventDefault(); onMove(e.clientX); } });
  wrap.addEventListener('mouseup', onEnd);
  wrap.addEventListener('mouseleave', onEnd);

  wrap.addEventListener('touchstart', e => { onStart(e.touches[0].clientX); }, { passive: true });
  wrap.addEventListener('touchmove', e => {
    if (dragging) {
      e.preventDefault();
      onMove(e.touches[0].clientX);
    }
  }, { passive: false });
  wrap.addEventListener('touchend', onEnd);
  wrap.addEventListener('touchcancel', onEnd);
}

/**
 * Rendert das Portfolio-Grid auf der Provider-Profilseite (View-Modus).
 * Für Admins, die ein FREMDES Profil ansehen, bekommt jedes Bild ein
 * Lösch-Overlay (Moderation). Der Eigentümer-Edit-Modus ist davon
 * unberührt (separater Render in toggleProviderEditMode).
 */
function _renderProviderPortfolio() {
  var portfolioEl = document.getElementById('providerPortfolio');
  if (!portfolioEl) return;
  var canModerate = !!(currentUser && currentUser.isAdmin && !_currentProviderIsOwn && _currentProviderId);
  portfolioEl.innerHTML = providerImages.map(function(img, i) {
    var imgTag = '<img src="' + _escHtml(img) + '" alt="Portfolio" loading="lazy" onclick="openProviderLightbox(' + i + ')" />';
    if (!canModerate) return imgTag;
    return '<div class="prov-portfolio-mod-wrap">' + imgTag +
      '<button type="button" class="prov-portfolio-mod-del" title="Als Admin löschen" ' +
      'aria-label="Bild als Admin löschen" onclick="adminDeleteProfileImage(' + i + ', event)">' +
      '<span class="material-icons-round">delete</span></button></div>';
  }).join('');
  portfolioEl.querySelectorAll('img').forEach(detectWideBannerImg);
}

/**
 * Admin-Moderation: löscht ein einzelnes Bild vom aktuell betrachteten
 * (fremden) Profil — serverseitig aus eb_gallery + allen Listings des
 * Nutzers, lokal aus providerImages + LISTINGS-Cache.
 */
function adminDeleteProfileImage(index, ev) {
  if (ev) { ev.stopPropagation(); if (ev.preventDefault) ev.preventDefault(); }
  if (!currentUser || !currentUser.isAdmin) return;
  var url = providerImages[index];
  if (!url) return;
  var targetId = _currentProviderId;
  if (!targetId) { showToast('Profil-ID unbekannt', 'error'); return; }
  if (!confirm('Als Admin: Dieses Bild wirklich vom Profil löschen?')) return;
  fetch(_apiUrl('admin/moderate-image'), {
    method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
    body: JSON.stringify({ user_id: targetId, image: url })
  }).then(function(r) {
    _refreshNonce(r);
    if (!r.ok) { showToast('Löschen fehlgeschlagen', 'error'); return; }
    // Blocklist im Client mitziehen → entfernt alle Größen-Varianten + Cover,
    // greift sofort und bleibt nach Reload weg (Server persistiert ebenfalls).
    if (window.EB_IMG_BLOCKLIST) window.EB_IMG_BLOCKLIST.add(_imgNormPath(url));
    providerImages = providerImages.filter(function(u) { return !_isImgBlocked(u); });
    _applyImageBlocklist(LISTINGS);
    _renderProviderPortfolio();
    buildGalleryRows(providerImages);
    // Lightbox-Status nachziehen, falls geöffnet
    var lb = document.getElementById('providerLightbox');
    var lbOpen = lb && lb.classList.contains('show');
    if (providerImages.length === 0) {
      closeProviderLightbox();
    } else {
      if (lightboxIndex >= providerImages.length) lightboxIndex = providerImages.length - 1;
      if (lbOpen) {
        document.getElementById('plbImage').src = providerImages[lightboxIndex];
        document.getElementById('plbCounter').textContent = (lightboxIndex + 1) + ' / ' + providerImages.length;
      }
    }
    showToast('Bild als Admin gelöscht.', 'delete');
  }).catch(function() { showToast('Löschen fehlgeschlagen', 'error'); });
}

/**
 * Admin-Moderation auf der INSERAT-DETAILSEITE: löscht ein einzelnes Bild der
 * aktuell offenen Inserat-Galerie (currentListing) — persistent via Blocklist,
 * wirkt auch für hardcodierte Demo-Listings.
 */
function adminDeleteListingImage(index, ev) {
  if (ev) { ev.stopPropagation(); if (ev.preventDefault) ev.preventDefault(); }
  if (!currentUser || !currentUser.isAdmin || !currentListing) return;
  var imgs = (Array.isArray(currentListing.images) && currentListing.images.length)
    ? currentListing.images
    : (currentListing.image ? [currentListing.image] : []);
  var url = imgs[index];
  if (!url || url === window.EB_IMG_FALLBACK) return;
  var targetId = currentListing.providerId;
  if (!targetId) { showToast('Anbieter-ID unbekannt', 'error'); return; }
  if (!confirm('Als Admin: Dieses Bild wirklich löschen?')) return;
  fetch(_apiUrl('admin/moderate-image'), {
    method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
    body: JSON.stringify({ user_id: targetId, image: url })
  }).then(function(r) {
    _refreshNonce(r);
    if (!r.ok) { showToast('Löschen fehlgeschlagen', 'error'); return; }
    // Blocklist mitziehen (alle Größen-Varianten + Cover) und Detailseite neu rendern
    if (window.EB_IMG_BLOCKLIST) window.EB_IMG_BLOCKLIST.add(_imgNormPath(url));
    _applyImageBlocklist(LISTINGS);
    showToast('Bild als Admin gelöscht.', 'delete');
    if (currentListing) loadDetail(currentListing.id);
  }).catch(function() { showToast('Löschen fehlgeschlagen', 'error'); });
}

function openProviderLightbox(index) {
  lightboxIndex = index;
  const lb = document.getElementById('providerLightbox');
  document.getElementById('plbImage').src = providerImages[lightboxIndex];
  document.getElementById('plbCounter').textContent = `${lightboxIndex + 1} / ${providerImages.length}`;
  _updateProviderLightboxAdminBtn();
  lb.classList.add('show');
  document.body.style.overflow = 'hidden';
  document.body.style.touchAction = 'none';
}

/**
 * Blendet im Provider-Lightbox einen Admin-Lösch-Button ein (nur fremde
 * Profile, nur Admins). Der Button wird bei Bedarf dynamisch erzeugt,
 * sodass kein Eingriff in die SPA-Shell (index.php/index.html) nötig ist.
 */
function _updateProviderLightboxAdminBtn() {
  var lb = document.getElementById('providerLightbox');
  if (!lb) return;
  var canModerate = !!(currentUser && currentUser.isAdmin && !_currentProviderIsOwn && _currentProviderId);
  var btn = document.getElementById('plbAdminDelete');
  if (!canModerate) { if (btn) btn.style.display = 'none'; return; }
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'plbAdminDelete';
    btn.type = 'button';
    btn.className = 'plb-admin-delete';
    btn.title = 'Als Admin löschen';
    btn.setAttribute('aria-label', 'Bild als Admin löschen');
    btn.innerHTML = '<span class="material-icons-round">delete</span> Löschen';
    btn.onclick = function(e) { adminDeleteProfileImage(lightboxIndex, e); };
    btn.addEventListener('touchend', function(e) {
      e.stopPropagation(); e.preventDefault(); adminDeleteProfileImage(lightboxIndex, e);
    });
    lb.appendChild(btn);
  }
  btn.style.display = '';
}

function closeProviderLightbox(e) {
  document.getElementById('providerLightbox').classList.remove('show');
  document.body.style.overflow = '';
  document.body.style.touchAction = '';
}

function lightboxNav(dir) {
  lightboxIndex = (lightboxIndex + dir + providerImages.length) % providerImages.length;
  document.getElementById('plbImage').src = providerImages[lightboxIndex];
  document.getElementById('plbCounter').textContent = `${lightboxIndex + 1} / ${providerImages.length}`;
}

// Touch swipe for lightbox
(function() {
  var lb = document.getElementById('providerLightbox');
  if (!lb) return;
  var startX = 0, startY = 0, tracking = false;

  // Direct touch handlers for buttons (iOS ignores onclick with touch-action:none)
  var closeBtn = lb.querySelector('.plb-close');
  var prevBtn = lb.querySelector('.plb-prev');
  var nextBtn = lb.querySelector('.plb-next');
  if (closeBtn) closeBtn.addEventListener('touchend', function(e) {
    e.stopPropagation(); e.preventDefault(); closeProviderLightbox();
  });
  if (prevBtn) prevBtn.addEventListener('touchend', function(e) {
    e.stopPropagation(); e.preventDefault(); lightboxNav(-1);
  });
  if (nextBtn) nextBtn.addEventListener('touchend', function(e) {
    e.stopPropagation(); e.preventDefault(); lightboxNav(1);
  });

  lb.addEventListener('touchstart', function(e) {
    if (e.target.closest('button')) return;
    if (e.touches.length === 1) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
    }
  }, { passive: true });
  lb.addEventListener('touchmove', function(e) {
    if (tracking) e.preventDefault();
  }, { passive: false });
  lb.addEventListener('touchend', function(e) {
    if (!tracking) return;
    tracking = false;
    var endX = e.changedTouches[0].clientX;
    var endY = e.changedTouches[0].clientY;
    var dx = endX - startX;
    var dy = endY - startY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      lightboxNav(dx < 0 ? 1 : -1);
    } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      closeProviderLightbox();
    }
  });
  lb.addEventListener('wheel', function(e) { e.preventDefault(); }, { passive: false });
})();

function toggleFollow() {
  const icon = document.getElementById('followIcon');
  const label = document.getElementById('followLabel');
  const following = icon.textContent.trim() === 'person_add';
  icon.textContent = following ? 'person_remove' : 'person_add';
  label.textContent = following ? 'Entfolgen' : 'Folgen';
  showToast(following ? 'Du folgst jetzt diesem Anbieter!' : 'Du folgst nicht mehr.', following ? 'person_add' : 'person_remove');
}

function shareProvider() {
  if (navigator.share) {
    navigator.share({ title: document.getElementById('providerName').textContent, url: window.location.href });
  } else {
    navigator.clipboard.writeText(window.location.href);
    showToast('Link kopiert!', 'content_copy');
  }
}
