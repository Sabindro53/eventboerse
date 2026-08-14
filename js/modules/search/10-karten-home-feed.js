// ========== LISTING CARD RENDERER ==========
function renderListingCard(listing) {
  const isFav = favorites.has(listing.id);
  var imgs = Array.isArray(listing.images) && listing.images.length ? listing.images : [listing.image];
  var galleryId = 'gridGallery_' + listing.id;
  return `
    <div class="listing-card" data-listing-id="${listing.id}"${_aiDisclosureAttrs(listing)}>
      <div class="listing-card-img">
        <div class="grid-gallery-track" id="${galleryId}" tabindex="0" role="region" aria-label="Bilder: ${_escHtml(listing.title)}">
          ${imgs.map(function(img, i) { return '<div class="grid-gallery-slide"><img src="' + _escHtml(img) + '" alt="' + _escHtml(listing.title) + '" decoding="async"' + window.EB_IMG_ERR_ATTR + ' /></div>'; }).join('')}
        </div>
        ${imgs.length > 1 ? '<button class="grid-gallery-arrow prev" aria-label="Vorheriges Bild" data-gallery-id="' + listing.id + '" data-dir="-1"><span class="material-icons-round">chevron_left</span></button><button class="grid-gallery-arrow next" aria-label="Nächstes Bild" data-gallery-id="' + listing.id + '" data-dir="1"><span class="material-icons-round">chevron_right</span></button><div class="grid-gallery-dots" id="gridGalleryDots_' + listing.id + '" role="group" aria-label="Bildauswahl">' + imgs.map(function(_, i) { return '<button class="grid-gallery-dot' + (i === 0 ? ' active' : '') + '" data-gallery-id="' + listing.id + '" data-idx="' + i + '" aria-label="Bild ' + (i + 1) + ' von ' + imgs.length + ' anzeigen"></button>'; }).join('') + '</div>' : ''}
        <button class="listing-fav ${isFav ? 'liked' : ''}" aria-label="Zu Favoriten hinzufügen" aria-pressed="${isFav ? 'true' : 'false'}" onclick="event.stopPropagation(); toggleFavorite(${listing.id}, this)">
          <span class="material-icons-round">${isFav ? 'favorite' : 'favorite_border'}</span>
        </button>
        ${listing.badge ? '<span class="listing-badge">' + _escHtml(listing.badge) + '</span>' : ''}
        ${_boardStatusBadgeHtml(listing.id, 'bsb-on-card')}
        ${_aiMediaWatermarkHtml(listing)}
        ${_aiTextDisclosureHtml(listing)}
      </div>
      <div class="listing-card-body">
        <div class="listing-card-top">
          <span class="listing-card-title">${_escHtml(listing.title)}</span>
          <span class="listing-card-rating">
            <span class="material-icons-round">star</span> ${listing.rating || 0}
          </span>
        </div>
        <div class="listing-card-category">${_escHtml(listing.categoryLabel)}</div>
        <div class="listing-card-location">
          <span class="material-icons-round">location_on</span> ${_escHtml(listing.location)}
        </div>
        <div class="listing-card-price">${_escHtml(listing.priceLabel)}</div>
      </div>
    </div>
  `;
}

// ========== HOME PAGE ==========

// ── Marquee animation state ──────────────────────────────
var _marqueeRAFs = [];

function _stopAllMarquees() {
  _marqueeRAFs.forEach(function(id) { cancelAnimationFrame(id); });
  _marqueeRAFs = [];
}

function renderHeroMarquees() {
  _stopAllMarquees();

  var topContainers = Array.from(document.querySelectorAll('.hero-marquee-above'));
  var bottomContainers = Array.from(document.querySelectorAll('.hero-marquee-below'));
  var topTracks = topContainers.map(function(c) { return c.querySelector('.hero-marquee-track'); }).filter(Boolean);
  var bottomTracks = bottomContainers.map(function(c) { return c.querySelector('.hero-marquee-track'); }).filter(Boolean);

  if (!topTracks.length && !bottomTracks.length) return;

  var visible;
  try {
    visible = getHeroListings();
    if (!Array.isArray(visible) || visible.length === 0) visible = Array.isArray(LISTINGS) ? LISTINGS : [];
  } catch (err) {
    visible = Array.isArray(LISTINGS) ? LISTINGS : [];
  }

  [topContainers, bottomContainers].reduce(function(a,b){ return a.concat(b); }, []).forEach(function(c) {
    c.style.display = 'block';
    c.style.visibility = 'visible';
    c.style.opacity = '1';
    c.style.pointerEvents = 'auto';
    c.style.zIndex = '30';
  });

  if (!Array.isArray(visible) || visible.length === 0) {
    var emptyHtml = '<div class="hero-marquee-empty">Noch keine Angebote gefunden.</div>';
    topTracks.concat(bottomTracks).forEach(function(t) { t.innerHTML = emptyHtml; });
    return;
  }

  function cardHTML(l) {
    return '<a class="hero-marquee-card"' + _aiDisclosureAttrs(l) + ' href="#" onclick="navigateTo(\'detail\',' + l.id + ');return false;">' +
      '<img src="' + _escHtml(l.image) + '" alt="' + _escHtml(l.title) + '" loading="eager"' + window.EB_IMG_ERR_ATTR + ' />' +
      _aiMediaWatermarkHtml(l) + _aiTextDisclosureHtml(l) +
      '<div class="hero-marquee-card-info">' +
        '<h4>' + _escHtml(l.title) + '</h4>' +
        '<span>' + _escHtml(l.priceLabel) + ' · ★ ' + (l.rating || 0) + '</span>' +
      '</div></a>';
  }

  var cardsHtml = visible.map(cardHTML).join('');
  // Duplicate 3× to guarantee seamless wrap on wide screens
  var tripleHtml = cardsHtml + cardsHtml + cardsHtml;

  topTracks.concat(bottomTracks).forEach(function(track) {
    track.innerHTML = tripleHtml;
    track.style.animation = 'none';
    track.style.transform = 'translateX(0)';
    track.style.willChange = 'transform';
    track.querySelectorAll('.hero-marquee-card img').forEach(detectWideBannerImg);
  });

  // Start rAF-based animation once images in the first set are loaded (or after 1s fallback)
  function startMarquee(track, speed) {
    var offset = 0;
    var paused = false;
    var half = 0;

    function measureHalf() {
      // half = width of one set of cards (total / 3)
      half = track.scrollWidth / 3;
      if (half < 10) half = track.scrollWidth / 2; // fallback
    }

    measureHalf();

    // Re-measure after images load
    var imgs = track.querySelectorAll('img');
    var loaded = 0;
    var total = imgs.length;
    function onImgReady() {
      loaded++;
      if (loaded >= total / 3) measureHalf(); // measure after first set loaded
    }
    imgs.forEach(function(img) {
      if (img.complete) { onImgReady(); }
      else { img.addEventListener('load', onImgReady); img.addEventListener('error', onImgReady); }
    });
    // Fallback re-measure
    setTimeout(measureHalf, 1200);

    var lastTime = 0;
    function tick(now) {
      if (!document.body.contains(track)) return; // track removed from DOM
      var id = requestAnimationFrame(tick);
      _marqueeRAFs.push(id);
      if (paused || half < 10) { lastTime = now; return; }
      if (!lastTime) { lastTime = now; return; }
      var dt = Math.min(now - lastTime, 50); // cap to avoid big jumps
      lastTime = now;
      offset -= speed * dt / 1000;
      if (offset <= -half) offset += half;
      if (offset > 0) offset -= half;
      track.style.transform = 'translateX(' + offset.toFixed(1) + 'px)';
    }

    var rafId = requestAnimationFrame(tick);
    _marqueeRAFs.push(rafId);

    // ── Pause on hover (desktop) ──
    track.parentElement.addEventListener('mouseenter', function() { paused = true; });
    track.parentElement.addEventListener('mouseleave', function() { paused = false; });

    // ── Prevent click after drag/swipe (threshold 8px) ──
    var wasDragged = false;
    track.addEventListener('click', function(e) {
      if (wasDragged) {
        e.preventDefault();
        e.stopPropagation();
        wasDragged = false;
      }
    }, true);

    // ── Touch: pause while touching, allow drag ──
    var touchStartX = 0, touchStartY = 0, touchStartOffset = 0, touching = false;
    track.addEventListener('touchstart', function(e) {
      paused = true;
      touching = true;
      wasDragged = false;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartOffset = offset;
    }, { passive: true });

    track.addEventListener('touchmove', function(e) {
      if (!touching) return;
      var dx = e.touches[0].clientX - touchStartX;
      if (Math.abs(dx) > 8) wasDragged = true;
      offset = touchStartOffset + dx;
      if (half > 10) {
        while (offset > 0) offset -= half;
        while (offset <= -half) offset += half;
      }
      track.style.transform = 'translateX(' + offset.toFixed(1) + 'px)';
    }, { passive: true });

    track.addEventListener('touchend', function() {
      touching = false;
      paused = false;
      lastTime = 0;
    }, { passive: true });

    // ── Desktop mouse drag ──
    var dragging = false, dragStartX = 0, dragStartOffset = 0;
    track.style.cursor = 'grab';

    track.addEventListener('mousedown', function(e) {
      if (e.button !== 0) return;
      dragging = true;
      wasDragged = false;
      paused = true;
      dragStartX = e.clientX;
      dragStartOffset = offset;
      track.style.cursor = 'grabbing';
      e.preventDefault();
    });
    document.addEventListener('mousemove', function(e) {
      if (!dragging) return;
      var dx = e.clientX - dragStartX;
      if (Math.abs(dx) > 8) wasDragged = true;
      offset = dragStartOffset + dx;
      if (half > 10) {
        while (offset > 0) offset -= half;
        while (offset <= -half) offset += half;
      }
      track.style.transform = 'translateX(' + offset.toFixed(1) + 'px)';
    });
    document.addEventListener('mouseup', function() {
      if (!dragging) return;
      dragging = false;
      paused = false;
      lastTime = 0;
      track.style.cursor = 'grab';
    });
  }

  // Start with different speeds + direction
  topTracks.forEach(function(track) { startMarquee(track, 40); });   // 40px/s → right-to-left
  bottomTracks.forEach(function(track) { startMarquee(track, 35); }); // 35px/s → right-to-left
}

// ========== EXPLORE PAGE (Instagram-Style) ==========
function renderExploreGrid(filter) {
  const grid = document.getElementById('exploreGrid');
  if (!grid) return;
  const query = filter || (document.getElementById('exploreSearch')?.value || '').trim().toLowerCase();
  // Collect all images from all listings
  let items = [];
  filterDemos(LISTINGS).forEach(l => {
    // Main image
    items.push({ image: l.image, listingId: l.id, title: l.title, provider: l.providerName, price: l.priceLabel, aiTextDisclosure: l.aiTextDisclosure, aiMediaDisclosure: l.aiMediaDisclosure });
    // Additional images
    if (l.images) {
      l.images.slice(1).forEach(img => {
        items.push({ image: img, listingId: l.id, title: l.title, provider: l.providerName, price: l.priceLabel, aiTextDisclosure: l.aiTextDisclosure, aiMediaDisclosure: l.aiMediaDisclosure });
      });
    }
  });
  if (query) {
    items = items.filter(it => it.title.toLowerCase().includes(query) || it.provider.toLowerCase().includes(query));
  }
  grid.innerHTML = items.map((it, i) => {
    const sizeClass = (i % 7 === 0) ? 'explore-item-large' : '';
    return `<a href="#" class="explore-item ${sizeClass}"${_aiDisclosureAttrs(it)} onclick="navigateTo('detail',${it.listingId});return false;" style="background-image:url('${_escHtml(it.image)}')">
      <img src="${_escHtml(it.image)}" alt="${_escHtml(it.title)}" loading="lazy" onload="_fitExploreImg(this)" onerror="this.onerror=null;this.src=window.EB_IMG_FALLBACK" />
      ${_aiMediaWatermarkHtml(it)}${_aiTextDisclosureHtml(it)}
      <div class="explore-item-overlay">
        <span class="explore-item-title">${_escHtml(it.title)}</span>
        <span class="explore-item-price">${_escHtml(it.price)}</span>
      </div>
    </a>`;
  }).join('');
}

function filterExploreGrid() {
  renderExploreGrid();
}

// ========== AKTUELLES FEED ==========
function timeAgo(dateStr) {
  if (!dateStr) return '';
  var now = Date.now();
  var then = new Date(dateStr.replace(' ', 'T') + (dateStr.includes('T') || dateStr.includes('+') ? '' : 'Z'));
  var minutes = Math.max(0, Math.floor((now - then.getTime()) / 60000));
  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return 'vor ' + minutes + ' Min.';
  var hours = Math.floor(minutes / 60);
  if (hours < 24) return 'vor ' + hours + ' Std.';
  var days = Math.floor(hours / 24);
  if (days === 1) return 'Gestern';
  if (days < 7) return 'vor ' + days + ' Tagen';
  if (days < 30) return 'vor ' + Math.floor(days / 7) + ' Wo.';
  if (days < 365) return 'vor ' + Math.floor(days / 30) + ' Mon.';
  return 'vor ' + Math.floor(days / 365) + (Math.floor(days / 365) === 1 ? ' Jahr' : ' Jahren');
}

// Absoluter Erstellzeitpunkt (deutsches Format) — als Tooltip auf den
// relativen Zeitangaben, damit der genaue Zeitpunkt der Erstellung sichtbar
// ist (wie bei Instagram beim Hovern). Robust ggü. MySQL- und ISO-Format.
function _absTime(dateStr) {
  if (!dateStr) return '';
  var s = String(dateStr);
  var d = new Date(s.replace(' ', 'T') + (s.indexOf('T') !== -1 || s.indexOf('+') !== -1 ? '' : 'Z'));
  if (isNaN(d.getTime())) return '';
  try {
    return d.toLocaleString('de-DE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' Uhr';
  } catch (e) {
    return d.toLocaleString();
  }
}

function renderFeed(tab) {
  const list = document.getElementById('feedList');
  if (!list) return;
  // Deduplicate LISTINGS by id (keep first occurrence)
  const seen = new Set();
  let items = getHeroListings().filter(function(l) {
    if (seen.has(l.id)) return false;
    seen.add(l.id);
    return true;
  });
  items = [...items];
  if (tab === 'newest') {
    items = items.sort((a, b) => b.id - a.id);
  } else if (tab === 'popular') {
    items = items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else {
    // "Für dich" — mix: shuffle with slight preference for higher rated
    items = items.sort(() => Math.random() - 0.5);
  }

  list.innerHTML = items.map((l, i) => {
    const avatar = _resolveAvatar(l.providerImg || l.providerAvatar, l.providerName);
    const categoryLabel = l.category ? l.category.charAt(0).toUpperCase() + l.category.slice(1) : 'Service';
    const isFav = favorites.has(l.id);
    const desc = l.description || l.title;
    const tags = l.features ? l.features.slice(0, 3) : [];
    return `<div class="feed-card"${_aiDisclosureAttrs(l)}>
      <div class="feed-card-header">
        <img class="feed-card-avatar" src="${_escHtml(avatar)}" alt="${_escHtml(l.providerName)}" onclick="navigateTo('provider',${l.providerId || l.id})" />
        <div class="feed-card-meta">
          <span class="feed-card-provider" onclick="navigateTo('provider',${l.providerId || l.id})">${_escHtml(l.providerName)}</span>
          <span class="feed-card-time"><span class="material-icons-round">schedule</span> ${timeAgo(l.createdAt)}</span>
        </div>
        <span class="feed-card-category">${_escHtml(categoryLabel)}</span>
      </div>
      <div class="feed-card-media"><img class="feed-card-image" src="${_escHtml(l.image)}" alt="${_escHtml(l.title)}" onclick="navigateTo('detail',${l.id})" loading="lazy" onerror="this.onerror=null;this.src=window.EB_IMG_FALLBACK" />${_aiMediaWatermarkHtml(l)}${_aiTextDisclosureHtml(l)}</div>
      <div class="feed-card-body">
        <div class="feed-card-title" onclick="navigateTo('detail',${l.id})">${_escHtml(l.title)}</div>
        <div class="feed-card-desc">${_escHtml(_stripHtml(desc))}</div>
      </div>
      ${l.location ? '<div class="feed-card-location"><span class="material-icons-round">location_on</span> ' + _escHtml(l.location) + '</div>' : ''}
      ${tags.length ? '<div class="feed-card-tags">' + tags.map(t => '<span class="feed-card-tag">' + _escHtml(t) + '</span>').join('') + '</div>' : ''}
      <div class="feed-card-footer">
        <span class="feed-card-price">${_escHtml(l.priceLabel)}</span>
        <div class="feed-card-actions">
          <button class="feed-card-action ${isFav ? 'active' : ''}" aria-label="Zu Favoriten hinzufügen" aria-pressed="${isFav ? 'true' : 'false'}" onclick="toggleFeedFav(this,${l.id})">
            <span class="material-icons-round">${isFav ? 'favorite' : 'favorite_border'}</span>
          </button>
          <button class="feed-card-action" aria-label="Details ansehen" onclick="navigateTo('detail',${l.id})">
            <span class="material-icons-round">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function switchFeedTab(btn) {
  document.querySelectorAll('.feed-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderFeed(btn.dataset.feed);
}

function toggleFeedFav(btn, id) {
  if (favorites.has(id)) {
    favorites.delete(id);
    btn.classList.remove('active');
    btn.querySelector('.material-icons-round').textContent = 'favorite_border';
    showToast('Von Favoriten entfernt', 'favorite_border');
  } else {
    favorites.add(id);
    btn.classList.add('active');
    btn.querySelector('.material-icons-round').textContent = 'favorite';
    showToast('Zu Favoriten hinzugefügt! ❤️', 'favorite');
  }
  if (btn) btn.setAttribute('aria-pressed', btn.classList.contains('active') ? 'true' : 'false');
  _saveFavoritesToStorage();
  // Sync with API if logged in (only for real DB listings)
  if (isLoggedIn) {
    var listing = LISTINGS.find(function(l) { return l.id === id; });
    if (listing && listing._fromDb) {
      var dbId = listing._dbId || (id - 10000);
      fetch(_apiUrl('favorites/' + dbId), {
        method: 'POST', credentials: 'same-origin', headers: _apiHeaders()
      }).catch(function(){});
    }
  }
}

function detectWideBannerCards(container) {
  if (!container) return;
  container.querySelectorAll('.listing-card-img img').forEach(detectWideBannerImg);
}

function detectWideBannerImg(img) {
  if (!img) return;
  function check() {
    if (img.naturalWidth && img.naturalHeight) {
      var r = img.naturalWidth / img.naturalHeight;
      if (r > 2.2) {
        img.style.setProperty('object-fit', 'contain', 'important');
        img.style.background = '#fff';
      }
    }
  }
  if (img.complete) check();
  else img.addEventListener('load', check);
}

// ========== SHARED GRID INIT (click + swipe for all listing grids) ==========
var _galleryUid = 0;
function _initGridCards(grid) {
  grid.querySelectorAll('.listing-card').forEach(function(card) {
    // Assign unique gallery IDs to avoid collisions between grids
    var uid = 'g' + (++_galleryUid);
    var track = card.querySelector('.grid-gallery-track');
    if (track) {
      track.id = 'gridGallery_' + uid;
      var dots = card.querySelector('.grid-gallery-dots');
      if (dots) dots.id = 'gridGalleryDots_' + uid;
      card.querySelectorAll('.grid-gallery-arrow').forEach(function(a) {
        a.setAttribute('data-gallery-id', uid);
      });
      card.querySelectorAll('.grid-gallery-dot').forEach(function(d) {
        d.setAttribute('data-gallery-id', uid);
      });
      _initGridGallerySwipe(uid);
    }
    // Click on card body → open detail
    card.addEventListener('click', function(e) {
      if (_gridGalleryDragged) return;
      if (e.target.closest('.grid-gallery-arrow') || e.target.closest('.grid-gallery-dot') || e.target.closest('.listing-fav')) return;
      var id = card.getAttribute('data-listing-id');
      if (id) navigateTo('detail', Number(id));
    });
  });
  detectWideBannerCards(grid);
}

function renderFeaturedGrid() {
  const grid = document.getElementById('featuredGrid');
  var visible = getHeroListings();
  grid.innerHTML = visible.map(renderListingCard).join('');
  _initGridCards(grid);
}
// ========== GRID GALLERY CAROUSEL ==========
var _gridGalleryIdx = {};
var _gridGalleryDragged = false; // global flag: was the last interaction a drag?
var _gridDragState = { dragging: false, startX: 0, startScrollLeft: 0, track: null, listingId: null, lastX: 0, lastTime: 0, velocity: 0 };

// Smooth animated scroll (Apple-like easeOutCubic)
function _gridGalleryAnimateTo(track, targetScroll, duration, listingId) {
  if (track._animFrame) cancelAnimationFrame(track._animFrame);
  var startScroll = track.scrollLeft;
  var dist = targetScroll - startScroll;
  if (Math.abs(dist) < 1) { track.scrollLeft = targetScroll; return; }
  var startTime = performance.now();
  duration = duration || 420;
  function step(now) {
    var t = Math.min((now - startTime) / duration, 1);
    // easeOutCubic
    var ease = 1 - Math.pow(1 - t, 3);
    track.scrollLeft = startScroll + dist * ease;
    if (t < 1) {
      track._animFrame = requestAnimationFrame(step);
    } else {
      track.scrollLeft = targetScroll;
      track._animFrame = null;
      if (listingId != null) _updateGridGalleryUI(listingId);
    }
  }
  track._animFrame = requestAnimationFrame(step);
}

// Single document-level listeners for all grid galleries (prevents listener leaks)
document.addEventListener('mousemove', function(e) {
  if (!_gridDragState.dragging || !_gridDragState.track) return;
  var now = performance.now();
  var dx = e.clientX - _gridDragState.startX;
  // Track velocity (px/ms)
  var dt = now - _gridDragState.lastTime;
  if (dt > 0) {
    _gridDragState.velocity = (e.clientX - _gridDragState.lastX) / dt;
  }
  _gridDragState.lastX = e.clientX;
  _gridDragState.lastTime = now;
  if (Math.abs(dx) > 2) _gridGalleryDragged = true;
  _gridDragState.track.scrollLeft = _gridDragState.startScrollLeft - dx;
});
document.addEventListener('mouseup', function() {
  if (!_gridDragState.dragging || !_gridDragState.track) return;
  _gridDragState.dragging = false;
  var track = _gridDragState.track;
  var listingId = _gridDragState.listingId;
  var velocity = _gridDragState.velocity; // px/ms, negative = swiped left
  var slideW = track.offsetWidth;
  if (slideW > 0) {
    var currentScroll = track.scrollLeft;
    var currentIdx = currentScroll / slideW;
    var baseIdx = Math.floor(currentIdx);
    var frac = currentIdx - baseIdx;
    var idx;
    // Velocity-based decision (Apple-like flick)
    if (Math.abs(velocity) > 0.3) {
      // Fast flick: commit to direction regardless of position
      idx = velocity < 0 ? Math.ceil(currentIdx) : Math.floor(currentIdx);
    } else if (Math.abs(velocity) > 0.1) {
      // Medium flick: lower threshold (20%)
      if (velocity < 0) {
        idx = frac > 0.2 ? baseIdx + 1 : baseIdx;
      } else {
        idx = frac < 0.8 ? baseIdx : baseIdx + 1;
      }
    } else {
      // Slow drag: snap to nearest at 50%
      idx = Math.round(currentIdx);
    }
    idx = Math.max(0, Math.min(track.children.length - 1, idx));
    _gridGalleryIdx[listingId] = idx;
    // Animate smoothly — duration based on distance
    var targetScroll = idx * slideW;
    var dist = Math.abs(targetScroll - currentScroll);
    var duration = Math.max(200, Math.min(500, dist * 1.2));
    track.style.scrollSnapType = 'none';
    track.style.scrollBehavior = 'auto';
    _gridGalleryAnimateTo(track, targetScroll, duration, listingId);
    // Re-enable snap after animation
    setTimeout(function() { track.style.scrollSnapType = 'x mandatory'; }, duration + 20);
  }
  _gridDragState.track = null;
  // Reset dragged flag after a short delay so click handlers can check it
  setTimeout(function() { _gridGalleryDragged = false; }, 50);
});

function _initGridGallerySwipe(listingId) {
  var track = document.getElementById('gridGallery_' + listingId);
  if (!track) return;
  if (track._galleryInit) return;
  track._galleryInit = true;
  _gridGalleryIdx[listingId] = 0;

  // Direct event listeners on arrows and dots (most reliable, works in iframes/Simple Browser)
  var container = track.parentElement;
  if (container) {
    container.querySelectorAll('.grid-gallery-arrow').forEach(function(arrow) {
      arrow.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        var dir = Number(arrow.getAttribute('data-dir'));
        gridGalleryNav(listingId, dir);
      });
      // Prevent mousedown from bubbling to track (would start drag)
      arrow.addEventListener('mousedown', function(e) {
        e.stopPropagation();
      });
    });
    container.querySelectorAll('.grid-gallery-dot').forEach(function(dot) {
      dot.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        var idx = Number(dot.getAttribute('data-idx'));
        gridGalleryGoTo(listingId, idx);
      });
      dot.addEventListener('mousedown', function(e) {
        e.stopPropagation();
      });
    });
  }

  // Mouse drag (desktop)
  track.addEventListener('mousedown', function(e) {
    // Only start drag if clicking directly on track/slides, not on arrows/dots
    if (e.target.closest('.grid-gallery-arrow') || e.target.closest('.grid-gallery-dot')) return;
    e.preventDefault();
    if (track._animFrame) { cancelAnimationFrame(track._animFrame); track._animFrame = null; }
    _gridDragState.dragging = true;
    _gridDragState.startX = e.clientX;
    _gridDragState.startScrollLeft = track.scrollLeft;
    _gridDragState.track = track;
    _gridDragState.listingId = listingId;
    _gridDragState.lastX = e.clientX;
    _gridDragState.lastTime = performance.now();
    _gridDragState.velocity = 0;
    _gridGalleryDragged = false;
    track.style.scrollBehavior = 'auto';
    track.style.scrollSnapType = 'none';
  });

  // Native CSS scroll-snap handles touch swiping - just sync the index/dots
  var scrollTimer;
  track.addEventListener('scroll', function() {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function() {
      var slideW = track.offsetWidth;
      if (slideW <= 0) return;
      var idx = Math.round(track.scrollLeft / slideW);
      idx = Math.max(0, Math.min(track.children.length - 1, idx));
      if (_gridGalleryIdx[listingId] !== idx) {
        _gridGalleryIdx[listingId] = idx;
        _updateGridGalleryUI(listingId);
      }
    }, 30);
  }, { passive: true });
}
function _updateGridGalleryUI(listingId) {
  var dots = document.querySelectorAll(`#gridGalleryDots_${listingId} .grid-gallery-dot`);
  dots.forEach(function(d, i) {
    d.classList.toggle('active', i === _gridGalleryIdx[listingId]);
  });
}
function gridGalleryNav(listingId, dir) {
  var track = document.getElementById('gridGallery_' + listingId);
  if (!track) return;
  var total = track.children.length;
  var slideW = track.offsetWidth;
  if (slideW <= 0) return;
  var currentIdx = Math.round(track.scrollLeft / slideW);
  _gridGalleryIdx[listingId] = Math.max(0, Math.min(total - 1, currentIdx + dir));
  track.style.scrollSnapType = 'none';
  track.style.scrollBehavior = 'auto';
  _gridGalleryAnimateTo(track, _gridGalleryIdx[listingId] * slideW, 380, listingId);
  setTimeout(function() { track.style.scrollSnapType = 'x mandatory'; }, 400);
}
function gridGalleryGoTo(listingId, idx) {
  var track = document.getElementById('gridGallery_' + listingId);
  if (!track) return;
  var slideW = track.offsetWidth;
  if (slideW <= 0) return;
  _gridGalleryIdx[listingId] = idx;
  track.style.scrollSnapType = 'none';
  track.style.scrollBehavior = 'auto';
  _gridGalleryAnimateTo(track, idx * slideW, 380, listingId);
  setTimeout(function() { track.style.scrollSnapType = 'x mandatory'; }, 400);
}

// Event delegation for gallery arrows and dots (avoids inline onclick blocked by CSP)
document.addEventListener('click', function(e) {
  var arrow = e.target.closest('.grid-gallery-arrow');
  if (arrow) {
    e.stopPropagation();
    var gid = arrow.getAttribute('data-gallery-id');
    var dir = Number(arrow.getAttribute('data-dir'));
    if (gid && dir) gridGalleryNav(gid, dir);
    return;
  }
  var dot = e.target.closest('.grid-gallery-dot');
  if (dot) {
    e.stopPropagation();
    var gid2 = dot.getAttribute('data-gallery-id');
    var idx2 = Number(dot.getAttribute('data-idx'));
    if (gid2 && !isNaN(idx2)) gridGalleryGoTo(gid2, idx2);
    return;
  }
});

function filterCategory(btn, category) {
  document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  var visible = getHeroListings();
  const filtered = category === 'alle' ? visible : visible.filter(l => l.category === category);
  const grid = document.getElementById('featuredGrid');
  grid.innerHTML = filtered.map(renderListingCard).join('');
  _initGridCards(grid);
}

// Event-type to tag mapping (hero select values → listing tag names)
const EVENT_TYPE_MAP = {
  'hochzeit': 'Hochzeit', 'geburtstag': 'Geburtstag', 'party': 'Party',
  'firmen': 'Firmen-Event', 'jubilaeum': 'Jubiläum', 'messe': 'Messe',
};

// City coordinates for proximity calculation
const CITY_PROXIMITY = {
  'Berlin':     { lat: 52.52, lng: 13.405 },
  'Hamburg':    { lat: 53.55, lng: 9.993 },
  'München':    { lat: 48.14, lng: 11.582 },
  'Frankfurt':  { lat: 50.11, lng: 8.682 },
  'Düsseldorf': { lat: 51.23, lng: 6.774 },
  'Starnberg':  { lat: 47.99, lng: 11.341 },
  'Köln':       { lat: 50.94, lng: 6.960 },
  'Stuttgart':  { lat: 48.78, lng: 9.183 },
  'Bonn':       { lat: 50.74, lng: 7.10  },
  'Bremen':     { lat: 53.08, lng: 8.802 },
  'Hannover':   { lat: 52.37, lng: 9.74  },
  'Leipzig':    { lat: 51.34, lng: 12.37 },
  'Dresden':    { lat: 51.05, lng: 13.74 },
  'Nürnberg':   { lat: 49.45, lng: 11.08 },
  'Essen':      { lat: 51.46, lng: 7.01  },
  'Dortmund':   { lat: 51.51, lng: 7.47  },
  'Mannheim':   { lat: 49.49, lng: 8.47  },
  'Karlsruhe':  { lat: 49.01, lng: 8.40  },
  'Münster':    { lat: 51.96, lng: 7.63  },
  'Augsburg':   { lat: 48.37, lng: 10.90 },
  'Wiesbaden':  { lat: 50.08, lng: 8.24  },
  'Mainz':      { lat: 50.00, lng: 8.27  },
  'Aachen':     { lat: 50.78, lng: 6.08  },
  'Freiburg':   { lat: 47.99, lng: 7.85  },
  'Heidelberg': { lat: 49.40, lng: 8.67  },
  'Regensburg': { lat: 49.02, lng: 12.10 },
  'Würzburg':   { lat: 49.79, lng: 9.93  },
  'Kiel':       { lat: 54.32, lng: 10.13 },
  'Lübeck':     { lat: 53.87, lng: 10.69 },
  'Rostock':    { lat: 54.09, lng: 12.14 },
  'Potsdam':    { lat: 52.40, lng: 13.06 },
  'Erfurt':     { lat: 50.98, lng: 11.03 },
  'Halle':      { lat: 51.48, lng: 11.97 },
  'Magdeburg':  { lat: 52.13, lng: 11.63 },
  'Saarbrücken':{ lat: 49.24, lng: 6.99  },
  'Chemnitz':   { lat: 50.83, lng: 12.92 },
};

// Detect a known German city inside a free-text query (case-insensitive,
// matches whole-word boundaries). Returns canonical city name or '' .
function _ebDetectCityInText(text) {
  if (!text) return '';
  var hay = String(text).toLowerCase();
  // Exact word/substring match against canonical city list
  var keys = Object.keys(CITY_PROXIMITY);
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i].toLowerCase();
    var re = new RegExp('(^|[^a-zäöüß])' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-zäöüß]|$)', 'i');
    if (re.test(hay)) return keys[i];
  }
  return '';
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
