// ========== MY LISTINGS ==========
function renderMyListings() {
  var grid = document.getElementById('myListingsGrid');
  var emptyState = document.getElementById('myListingsEmpty');
  var header = document.querySelector('#page-my-listings .my-listings-header h1');
  var createBtn = document.querySelector('#page-my-listings .my-listings-header .btn-primary');
  var emptyTitle = document.querySelector('#myListingsEmpty h3');
  var emptyText = document.querySelector('#myListingsEmpty p');
  var emptyBtn = document.querySelector('#myListingsEmpty .btn-primary');

  if (isEventPlaner()) {
    // === EVENT-PLANER VIEW ===
    if (header) header.textContent = 'Meine Events';
    if (createBtn) createBtn.innerHTML = '<span class="material-icons-round">event</span> Neues Event';
    if (emptyTitle) emptyTitle.textContent = 'Noch keine Events';
    if (emptyText) emptyText.textContent = 'Erstelle dein erstes Event und finde die besten Dienstleister.';
    if (emptyBtn) {
      emptyBtn.innerHTML = '<span class="material-icons-round">event</span> Jetzt Event erstellen';
      emptyBtn.setAttribute('onclick', "navigateTo('create-listing')");
    }

    // Preview banner
    var previewBannerEP = document.getElementById('myListingsPreviewBanner');

    if (isLoggedIn) {
      if (previewBannerEP) previewBannerEP.style.display = 'none';
      fetch(_apiUrl('my-listings'), { credentials: 'same-origin', headers: _apiHeaders() })
        .then(function(r) {
          if (!r.ok) throw new Error('API ' + r.status);
          return r.json();
        })
        .then(function(data) {
          if (!Array.isArray(data)) { renderEventGrid([]); return; }
          _mergeDbListingsIntoCache(data);
          var myEvents = data.map(function(l) {
            return {
              id: l.id + 10000,
              _dbId: l.id,
              _fromDb: true,
              providerId: l.providerId,
              userId: l.providerId,
              status: l.status || 'active',
              isHidden: !!l.isHidden,
              moderationAction: l.moderationAction || '',
              moderationReason: l.moderationReason || '',
              moderationCreatedAt: l.moderationCreatedAt || '',
              title: l.title,
              category: l.category,
              categoryLabel: l.categoryLabel || l.category,
              image: (l.images && l.images[0]) || '',
              images: l.images || [],
              location: l.location,
              price: l.price,
              priceLabel: l.priceLabel || (l.price + ' €'),
              rating: parseFloat(l.rating) || 0,
              reviewCount: parseInt(l.reviews) || 0,
              description: l.description,
              providerName: l.providerName,
              providerImg: l.providerImg,
              providerSince: l.providerSince,
              providerRole: l.providerRole,
              baseRole: l.baseRole
            };
          });
          renderEventGrid(myEvents);
        })
        .catch(function(err) {
          showToast('Events konnten nicht geladen werden. Bitte Seite neu laden.', 'error');
          renderEventGrid([]);
        });
    } else {
      if (demoVisible()) {
        if (previewBannerEP) previewBannerEP.style.display = 'flex';
        renderEventGrid(DEMO_EVENTS);
      } else {
        if (previewBannerEP) previewBannerEP.style.display = 'none';
        renderEventGrid([]);
      }
    }

    function renderEventGrid(events) {
      if (events.length === 0) {
        grid.style.display = 'none';
        emptyState.style.display = 'flex';
      } else {
        grid.style.display = '';
        emptyState.style.display = 'none';
        grid.innerHTML = events.map(function(evt) {
          // DB events from API
          if (evt._fromDb) {
            return '<div class="my-listing-card">' +
              '<div class="my-listing-img">' +
                '<img src="' + _escHtml(evt.image) + '" alt="' + _escHtml(evt.title) + '" />' +
                '<span class="status-badge status-active">Aktiv</span>' +
              '</div>' +
              '<div class="my-listing-info">' +
                '<h3>' + _escHtml(evt.title) + '</h3>' +
                '<p>' + _escHtml(evt.categoryLabel) + ' · ' + _escHtml(evt.location) + '</p>' +
                '<p class="my-listing-price">' + _escHtml(evt.priceLabel) + '</p>' +
                '<div class="my-listing-stats">' +
                  '<span><span class="material-icons-round">star</span> ' + (evt.rating || 0).toFixed(1) + '/5</span>' +
                  '<span><span class="material-icons-round">rate_review</span> ' + (evt.reviewCount || 0) + ' Bewertungen</span>' +
                '</div>' +
              '</div>' +
              '<div class="my-listing-actions">' +
                '<button class="btn-outline btn-sm" onclick="navigateTo(\'detail\', ' + evt.id + ')">' +
                  '<span class="material-icons-round">visibility</span> Ansehen' +
                '</button>' +
                '<button class="btn-outline btn-sm" onclick="editListing(' + evt.id + ')">' +
                  '<span class="material-icons-round">edit</span> Bearbeiten' +
                '</button>' +
                '<button class="btn-outline btn-sm btn-danger-outline" onclick="deleteListing(' + evt.id + ')">' +
                  '<span class="material-icons-round">delete</span> Löschen' +
                '</button>' +
              '</div>' +
            '</div>';
          }
          // Demo events (logged out preview)
          var statusClass = evt.status === 'In Planung' ? 'status-active' : (evt.status === 'Offen' ? 'status-pending' : 'status-completed');
          var servicesHTML = (evt.bookedServices || []).map(function(s) {
            var sClass = s.status === 'Bestätigt' ? 'status-completed' : (s.status === 'In Verhandlung' ? 'status-pending' : 'status-active');
            return '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:0.85rem;">' +
              '<span>' + s.name + ' <small style="color:var(--text-light)">(' + s.category + ')</small></span>' +
              '<span class="status-badge ' + sClass + '" style="font-size:0.7rem;">' + s.status + '</span>' +
            '</div>';
          }).join('');
          return '<div class="my-listing-card">' +
            '<div class="my-listing-img">' +
              '<img src="' + evt.image + '" alt="' + evt.title + '" />' +
              '<span class="status-badge ' + statusClass + '">' + evt.status + '</span>' +
            '</div>' +
            '<div class="my-listing-info">' +
              '<h3>' + evt.title + '</h3>' +
              '<p>' + evt.type + ' · ' + evt.location + '</p>' +
              '<p class="my-listing-price"><span class="material-icons-round" style="font-size:16px;vertical-align:middle;">event</span> ' + evt.date + ' · ' + evt.guests + ' Gäste</p>' +
              '<p style="font-size:0.85rem;color:var(--text-light);margin-top:2px;">Budget: ' + evt.budget + '</p>' +
              (servicesHTML ? '<div style="margin-top:8px;border-top:1px solid var(--border-light);padding-top:8px;">' +
                '<strong style="font-size:0.78rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--dark);">Gebuchte Services</strong>' +
                servicesHTML +
              '</div>' : '') +
            '</div>' +
            '<div class="my-listing-actions">' +
              '<button class="btn-outline btn-sm" onclick="navigateTo(\'browse\')">' +
                '<span class="material-icons-round">search</span> Services finden' +
              '</button>' +
              '<button class="btn-outline btn-sm" onclick="showToast(\'Event bearbeiten kommt bald!\',\'edit\')">' +
                '<span class="material-icons-round">edit</span> Bearbeiten' +
              '</button>' +
            '</div>' +
          '</div>';
        }).join('');
      }
    }
  } else {
    // === DIENSTLEISTER VIEW ===
    if (header) header.textContent = 'Meine Inserate';
    if (createBtn) createBtn.innerHTML = '<span class="material-icons-round">add_circle</span> Neues Inserat';
    if (emptyTitle) emptyTitle.textContent = 'Noch keine Inserate';
    if (emptyText) emptyText.textContent = 'Erstelle dein erstes Inserat und erreiche tausende potenzielle Kunden.';
    if (emptyBtn) emptyBtn.innerHTML = '<span class="material-icons-round">add_circle</span> Jetzt Inserat erstellen';

    function renderMyGrid(myListings) {
      if (myListings.length === 0) {
        grid.style.display = 'none';
        emptyState.style.display = 'flex';
      } else {
        grid.style.display = '';
        emptyState.style.display = 'none';
        grid.innerHTML = myListings.map(function(l) {
          var rating = l.rating || 0;
          var reviewCount = l.reviewCount || 0;
          return '<div class="my-listing-card">' +
            '<div class="my-listing-img">' +
              '<img src="' + _escHtml(l.image) + '" alt="' + _escHtml(l.title) + '" />' +
              '<span class="status-badge status-active">Aktiv</span>' +
            '</div>' +
            '<div class="my-listing-info">' +
              '<h3>' + _escHtml(l.title) + '</h3>' +
              '<p>' + _escHtml(l.categoryLabel) + ' · ' + _escHtml(l.location) + '</p>' +
              '<p class="my-listing-price">' + _escHtml(l.priceLabel) + '</p>' +
              '<div class="my-listing-stats">' +
                '<span><span class="material-icons-round">star</span> ' + rating.toFixed(1) + '/5</span>' +
                '<span><span class="material-icons-round">rate_review</span> ' + reviewCount + ' Bewertungen</span>' +
              '</div>' +
            '</div>' +
            '<div class="my-listing-actions">' +
              '<button class="btn-outline btn-sm" onclick="navigateTo(\'detail\', ' + l.id + ')">' +
                '<span class="material-icons-round">visibility</span> Ansehen' +
              '</button>' +
              '<button class="btn-outline btn-sm" onclick="editListing(' + l.id + ')">' +
                '<span class="material-icons-round">edit</span> Bearbeiten' +
              '</button>' +
              '<button class="btn-outline btn-sm" onclick="openAvailabilityModal(' + (l._dbId || l.id) + ')">' +
                '<span class="material-icons-round">event_busy</span> Verfügbarkeit' +
              '</button>' +
              '<button class="btn-outline btn-sm btn-danger-outline" onclick="deleteListing(' + l.id + ')">' +
                '<span class="material-icons-round">delete</span> Löschen' +
              '</button>' +
            '</div>' +
          '</div>';
        }).join('');
      }
    }

    // Preview banner
    var previewBanner = document.getElementById('myListingsPreviewBanner');

    // Load my listings from API
    if (isLoggedIn) {
      if (previewBanner) previewBanner.style.display = 'none';
      fetch(_apiUrl('my-listings'), { credentials: 'same-origin', headers: _apiHeaders() })
        .then(function(r) {
          if (!r.ok) throw new Error('API ' + r.status);
          return r.json();
        })
        .then(function(data) {
          if (!Array.isArray(data)) { renderMyGrid([]); return; }
          _mergeDbListingsIntoCache(data);
          var myListings = data.map(function(l) {
            return {
              id: l.id + 10000,
              _dbId: l.id,
              _fromDb: true,
              providerId: l.providerId,
              userId: l.providerId,
              status: l.status || 'active',
              isHidden: !!l.isHidden,
              moderationAction: l.moderationAction || '',
              moderationReason: l.moderationReason || '',
              moderationCreatedAt: l.moderationCreatedAt || '',
              title: l.title,
              category: l.category,
              categoryLabel: l.categoryLabel || l.category,
              image: (l.images && l.images[0]) || '',
              images: l.images || [],
              location: l.location,
              price: l.price,
              priceLabel: l.priceLabel || (l.price + ' €'),
              rating: parseFloat(l.rating) || 0,
              reviewCount: parseInt(l.reviews) || 0,
              description: l.description,
              providerName: l.providerName,
              providerImg: l.providerImg,
              providerSince: l.providerSince,
              providerRole: l.providerRole,
              baseRole: l.baseRole
            };
          });
          renderMyGrid(myListings);
        })
        .catch(function(err) {
          showToast('Inserate konnten nicht geladen werden. Bitte Seite neu laden.', 'error');
          renderMyGrid([]);
        });
    } else {
      // Show demo listings as preview for non-logged-in users
      if (previewBanner) previewBanner.style.display = 'flex';
      var demoListings = LISTINGS.slice(0, 3).map(function(l) {
        return {
          id: l.id,
          title: l.title,
          category: l.category,
          categoryLabel: l.categoryLabel || l.category,
          image: l.image,
          location: l.location,
          price: l.price,
          priceLabel: l.priceLabel,
          rating: l.rating || 0,
          reviewCount: l.reviewCount || 0
        };
      });
      renderMyGrid(demoListings);
    }
  }
}

function editListing(listingId) {
  var listing = LISTINGS.find(function(l) { return l.id === listingId; });
  if (!listing) return;

  // Store editing state and navigate
  window._editingListingId = listingId;
  window._isEditNavigation = true;
  navigateTo('create-listing');
  window._isEditNavigation = false;

  // Update heading & submit button to edit mode
  var heading = document.querySelector('#page-create-listing .create-title');
  if (heading) heading.textContent = isEventPlaner() ? 'Event bearbeiten' : 'Inserat bearbeiten';
  var submitBtn = document.querySelector('#step3 .btn-primary');
  if (submitBtn) submitBtn.innerHTML = '<span class="material-icons-round">save</span> Änderungen speichern';

  // Typ (Biete/Suche) aus dem Inserat übernehmen
  try { _clSetType(listing.listingType === 'search' ? 'search' : 'offer'); } catch (e) {}
  // Verfügbarkeitskalender mit bestehenden Block-Tagen vorbefüllen
  try { _clAvailPrefill(listing); } catch (e) {}

  // === Step 1: Basics ===
  document.getElementById('createTitle').value = listing.title || '';
  document.getElementById('createCategory').value = listing.category || '';
  document.getElementById('createDescription').value = (listing.description || '').replace(/<\/?p>/g, '\n').replace(/<\/?h3>/g, '').trim();
  document.getElementById('createPrice').value = listing.price || '';
  var pmaxEl = document.getElementById('createPriceMax');
  if (pmaxEl) pmaxEl.value = listing.priceMax || '';
  document.getElementById('createPriceModel').value = listing.priceModel || 'Pro Event';

  // === Step 2: Details ===
  document.getElementById('createRegion').value = listing.region || listing.location || '';
  document.getElementById('createRegionValue').value = listing.region || listing.location || '';

  // Dates via Flatpickr
  var fromEl = document.getElementById('createDateFrom');
  var toEl = document.getElementById('createDateTo');
  if (fromEl && fromEl._flatpickr) {
    fromEl._flatpickr.set('minDate', null);
    if (listing.dateFrom) fromEl._flatpickr.setDate(listing.dateFrom, true);
    else fromEl._flatpickr.clear();
  }
  if (toEl && toEl._flatpickr) {
    toEl._flatpickr.set('minDate', null);
    if (listing.dateTo) toEl._flatpickr.setDate(listing.dateTo, true);
    else toEl._flatpickr.clear();
  }

  // Time fields
  if (listing.timeFrom) {
    var tf = listing.timeFrom.split(':');
    document.getElementById('createTimeFromH').value = parseInt(tf[0]) || 0;
    document.getElementById('createTimeFromM').value = tf[1] || '00';
  }
  if (listing.timeTo) {
    var tt = listing.timeTo.split(':');
    document.getElementById('createTimeToH').value = parseInt(tt[0]) || 0;
    document.getElementById('createTimeToM').value = tt[1] || '00';
  }

  // Duration
  document.getElementById('createDuration').value = listing.duration || 4;

  // Sofortbuchung + Wochentage
  var ibEl = document.getElementById('createInstantBook');
  if (ibEl) ibEl.checked = !!listing.instantBook;
  var _wdSet = (listing.availableWeekdays || []).map(Number);
  document.querySelectorAll('#createWeekdayPicker .weekday-pill').forEach(function(btn) {
    var d = parseInt(btn.getAttribute('data-day'), 10);
    btn.classList.toggle('selected', _wdSet.indexOf(d) !== -1);
  });

  // Tags checkboxes
  var tagCheckboxes = document.querySelectorAll('#createTags input[type=checkbox]');
  tagCheckboxes.forEach(function(cb) {
    cb.checked = listing.tags && listing.tags.indexOf(cb.value) !== -1;
  });

  // Feature tags — match built-in and add custom
  document.querySelectorAll('#createFeatureTags .feature-tag-custom-item').forEach(function(t) { t.remove(); });
  var featureBtns = document.querySelectorAll('#createFeatureTags .feature-tag');
  var matchedFeatures = [];
  featureBtns.forEach(function(btn) {
    btn.classList.remove('selected');
    if (listing.features && listing.features.indexOf(btn.textContent.trim()) !== -1) {
      btn.classList.add('selected');
      matchedFeatures.push(btn.textContent.trim());
    }
  });
  // Add custom features that weren't in the built-in list
  if (listing.features) {
    var grid = document.getElementById('createFeatureTags');
    listing.features.forEach(function(f) {
      if (matchedFeatures.indexOf(f) === -1) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'feature-tag selected feature-tag-custom-item';
        btn.onclick = function() { toggleFeatureTag(btn); };
        btn.textContent = f;
        grid.appendChild(btn);
      }
    });
  }

  // === Step 3: Images ===
  var preview = document.getElementById('uploadPreview');
  preview.innerHTML = '';
  if (listing.images && listing.images.length > 0) {
    listing.images.forEach(function(url) {
      if (!url) return;
      _addListingPreviewItem(url, null);
    });
  }

  // Einseitige Maske: nach oben scrollen
  window.scrollTo(0, 0);

  showToast('Inserat wird bearbeitet – passe es an und speichere es.', 'edit');
}

function deleteListing(listingId) {
  if (!confirm('Möchtest du dieses Inserat wirklich löschen?')) return;

  var listing = LISTINGS.find(function(l) { return l.id === listingId; });
  var dbId = listing && listing._dbId ? listing._dbId : (listing && listing._fromDb ? listingId - 10000 : null);

  if (dbId) {
    fetch(_apiUrl('listings/' + dbId), {
      method: 'DELETE', credentials: 'same-origin', headers: _apiHeaders()
    }).then(function(r) {
      if (r.ok) {
        var idx = LISTINGS.findIndex(function(l) { return l.id === listingId; });
        if (idx !== -1) LISTINGS.splice(idx, 1);
        renderMyListings();
        showToast('Inserat gelöscht.', 'delete');
      } else {
        showToast('Löschen fehlgeschlagen', 'error');
      }
    }).catch(function() {
      showToast('Löschen fehlgeschlagen', 'error');
    });
  } else {
    var idx = LISTINGS.findIndex(function(l) { return l.id === listingId; });
    if (idx !== -1) {
      LISTINGS.splice(idx, 1);
      renderMyListings();
      showToast('Inserat gelöscht.', 'delete');
    }
  }
}

function adminDeleteListing(listingId) {
  if (!currentUser || !currentUser.isAdmin) return;
  if (!confirm('Als Admin: Dieses Inserat wirklich löschen?')) return;
  var listing = LISTINGS.find(function(l) { return l.id === listingId; });
  var dbId = listing && listing._dbId ? listing._dbId : (listing && listing._fromDb ? listingId - 10000 : null);
  if (!dbId) return showToast('Nur DB-Inserate löschbar', 'error');
  fetch(_apiUrl('listings/' + dbId), {
    method: 'DELETE', credentials: 'same-origin', headers: _apiHeaders()
  }).then(function(r) {
    _refreshNonce(r);
    if (r.ok) {
      var idx = LISTINGS.findIndex(function(l) { return l.id === listingId; });
      if (idx !== -1) LISTINGS.splice(idx, 1);
      showToast('Inserat als Admin gelöscht.', 'delete');
      navigateTo('browse');
    } else { showToast('Löschen fehlgeschlagen', 'error'); }
  }).catch(function() { showToast('Löschen fehlgeschlagen', 'error'); });
}

function adminDeleteUser(userId) {
  if (!currentUser || !currentUser.isAdmin) return;
  if (!confirm('Als Admin: Diesen Nutzer und alle seine Inhalte wirklich löschen?')) return;
  fetch(_apiUrl('admin/delete-user/' + userId), {
    method: 'DELETE', credentials: 'same-origin', headers: _apiHeaders()
  }).then(function(r) {
    _refreshNonce(r);
    if (r.ok) {
      showToast('Nutzer und alle Inhalte gelöscht.', 'delete');
      // Reload admin user list if on admin page
      if (currentPage === 'admin') {
        loadAdminUsers();
      } else {
        loadDbListings().then(function() { navigateTo('browse'); });
      }
    } else {
      r.json().then(function(d) { showToast(d.message || 'Fehler', 'error'); });
    }
  }).catch(function() { showToast('Löschen fehlgeschlagen', 'error'); });
}

// ========== ADMIN PANEL ==========
var _adminUsers = [];

function loadAdminUsers(searchTerm) {
  var url = 'admin/users';
  if (searchTerm) url += '?search=' + encodeURIComponent(searchTerm);
  var list = document.getElementById('adminUserList');
  if (list) list.innerHTML = '<div class="admin-loading"><span class="material-icons-round spin">sync</span> Lade Benutzer…</div>';

  fetch(_apiUrl(url), { credentials: 'same-origin', headers: _apiHeaders() })
    .then(function(r) {
      _refreshNonce(r);
      if (!r.ok) throw new Error(r.status);
      return r.json();
    })
    .then(function(users) {
      if (!Array.isArray(users)) throw new Error('bad payload');
      _adminUsers = users;
      renderAdminStats(_adminUsers);
      renderAdminUserList(_adminUsers);
    })
    .catch(function() {
      if (list) list.innerHTML = '<p class="admin-error">Fehler beim Laden der Benutzer.</p>';
    });
}

function renderAdminStats(users) {
  var el = document.getElementById('adminStats');
  if (!el) return;
  var total = users.length;
  var admins = users.filter(function(u) { return u.isAdmin; }).length;
  var listings = users.reduce(function(s, u) { return s + (u.listings || 0); }, 0);
  var reviews = users.reduce(function(s, u) { return s + (u.reviews || 0); }, 0);
  el.innerHTML =
    '<div class="admin-stat"><span class="material-icons-round">people</span><strong>' + total + '</strong><span>Benutzer</span></div>' +
    '<div class="admin-stat"><span class="material-icons-round">shield</span><strong>' + admins + '</strong><span>Admins</span></div>' +
    '<div class="admin-stat"><span class="material-icons-round">storefront</span><strong>' + listings + '</strong><span>Inserate</span></div>' +
    '<div class="admin-stat"><span class="material-icons-round">rate_review</span><strong>' + reviews + '</strong><span>Bewertungen</span></div>';

  renderAdminHideDemoToggle();
}

/** Render Demo-Toggle (Bot-Inserate sitewide ein-/ausblenden). */
function renderAdminHideDemoToggle() {
  var host = document.getElementById('adminHideDemoBox');
  if (!host) return;
  var on = !!window.EB_HIDE_DEMO;
  var idCount = (window.EB_DEMO_PROVIDER_IDS || []).length;
  host.innerHTML =
    '<div class="admin-toggle-info">' +
      '<span class="material-icons-round" style="color:var(--primary)">science</span>' +
      '<div>' +
        '<strong>Test-/Bot-Inserate</strong>' +
        '<p>' + idCount + ' als Demo markierte Nutzer (Bots 90001–90009 + manuell markierte Konten) werden in Marquee, Browse, Explore, Feed und Karte ' +
          (on ? '<u>aktuell ausgeblendet</u>' : '<u>aktuell sichtbar</u>') + '.</p>' +
      '</div>' +
    '</div>' +
    '<button class="admin-toggle-btn ' + (on ? 'is-on' : '') + '" onclick="adminToggleHideDemo()">' +
      '<span class="material-icons-round">' + (on ? 'visibility_off' : 'visibility') + '</span>' +
      (on ? 'Testdaten einblenden' : 'Testdaten ausblenden') +
    '</button>';
}

/** Toggle hide-demo-Flag — ruft Backend, aktualisiert window-Flag, re-rendert alle Listen. */
function adminToggleHideDemo() {
  var next = !window.EB_HIDE_DEMO;
  fetch(_apiUrl('admin/hide-demo'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: _apiHeaders(),
    body: JSON.stringify({ hide: next })
  }).then(function(r) {
    _refreshNonce(r);
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }).then(function(d) {
    window.EB_HIDE_DEMO = !!d.hide;
    showToast(window.EB_HIDE_DEMO ? 'Testdaten ausgeblendet' : 'Testdaten eingeblendet', 'success');
    renderAdminHideDemoToggle();
    // alle sichtbaren Listen neu rendern
    try { renderHeroMarquees(); } catch(e) {}
    try { renderBrowseGrid(LISTINGS); } catch(e) {}
    try { updateHeroStats(); } catch(e) {}
    try { renderExploreGrid(); } catch(e) {}
    try { if (document.getElementById('feedList')) renderFeed('foryou'); } catch(e) {}
  }).catch(function() {
    showToast('Umschalten fehlgeschlagen', 'error');
  });
}

function renderAdminUserList(users) {
  var list = document.getElementById('adminUserList');
  if (!list) return;
  if (!users || !users.length) {
    list.innerHTML = '<p class="admin-empty">Keine Benutzer gefunden.</p>';
    return;
  }
  var html = '';
  users.forEach(function(u) {
    var avatarSrc = u.avatar || ebAvatar(u.login || 'user', u.login);
    var regDate = u.registered ? new Date(u.registered).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }) : '–';
    var baseRole = u.baseRole || u.role || 'Event-Planer';
    var roleBadge = u.isAdmin
      ? '<span class="admin-role-badge admin-role-admin">Admin</span>'
      : '';
    var tagBadges = '';
    if (u.tags && u.tags.length) {
      u.tags.forEach(function(tag) {
        tagBadges += ' <span class="admin-tag-badge">' + _escHtml(tag) +
          '<span class="material-icons-round admin-tag-remove" onclick="adminRemoveTag(' + u.id + ',\'' + _escHtml(tag).replace(/'/g, "\\'") + '\')" title="Tag entfernen">close</span>' +
        '</span>';
      });
    }
    tagBadges += '<span class="admin-tag-wrapper">' +
      '<button class="admin-tag-add-btn" onclick="adminToggleTagDropdown(event,' + u.id + ')" title="Tag hinzufügen"><span class="material-icons-round" style="font-size:16px">add</span></button>' +
      '<div class="admin-tag-dropdown" id="tagDrop' + u.id + '">' +
        '<input type="text" placeholder="Neuer Tag..." onkeydown="adminTagInputKey(event,' + u.id + ')" oninput="adminFilterTagSuggestions(event,' + u.id + ')" />' +
        '<div class="admin-tag-suggestions" id="tagSug' + u.id + '"></div>' +
      '</div>' +
    '</span>';
    var isActive = u.isActive !== false;
    var isDemoUser = !!u.isDemo;
    var isSelf = currentUser && currentUser.id === u.id;
    var activeBadge = !isActive ? ' <span class="admin-role-badge admin-role-deactivated">Deaktiviert</span>' : '';
    var demoBadge = isDemoUser ? ' <span class="admin-role-badge admin-role-demo" title="Test-/Bot-Account">Demo</span>' : '';
    var cardClass = 'admin-user-card' + (u.isAdmin ? ' is-admin' : '') + (!isActive ? ' is-deactivated' : '') + (isDemoUser ? ' is-demo' : '');

    // Display name + username
    var realName = '';
    if (u.firstName && u.lastName) realName = u.firstName + ' ' + u.lastName;
    else if (u.firstName) realName = u.firstName;
    else if (u.lastName) realName = u.lastName;
    else realName = u.name || u.login;
    var displayName = _escHtml(realName);

    // Role switch buttons (Dienstleister / Event-Planer)
    var roleSwitcher = '';
    {
      var isDL = baseRole === 'Dienstleister';
      var isEP = baseRole === 'Event-Planer';
      roleSwitcher = '<div class="admin-role-switcher">' +
        '<button class="admin-role-btn ep' + (isEP ? ' active' : '') + '" onclick="adminChangeRole(' + u.id + ',\'event_planer\')" title="Als Event-Planer setzen">' +
          '<span class="material-icons-round">celebration</span> Event-Planer' +
        '</button>' +
        '<button class="admin-role-btn dl' + (isDL ? ' active' : '') + '" onclick="adminChangeRole(' + u.id + ',\'dienstleister\')" title="Als Dienstleister setzen">' +
          '<span class="material-icons-round">storefront</span> Dienstleister' +
        '</button>' +
      '</div>';
    }

    // Build action buttons
    var actionBtns = '';
    if (!isSelf) {
      // Activate / Deactivate toggle
      if (!u.isAdmin) {
        if (isActive) {
          actionBtns += '<button class="btn-outline btn-sm admin-deactivate-btn" onclick="adminToggleActive(' + u.id + ')" title="Benutzer deaktivieren">' +
            '<span class="material-icons-round">block</span> Deaktivieren' +
          '</button>';
        } else {
          actionBtns += '<button class="btn-outline btn-sm admin-activate-btn" onclick="adminToggleActive(' + u.id + ')" title="Benutzer aktivieren">' +
            '<span class="material-icons-round">check_circle</span> Aktivieren' +
          '</button>';
        }
      }
      // Demo-/Bot-Markierung (nicht für hardcoded Bot-IDs 90001–90009 — die sind permanent)
      var _isHardcodedBot = window.EB_DEMO_PROVIDER_IDS && window.EB_DEMO_PROVIDER_IDS.indexOf(+u.id) !== -1;
      if (!u.isAdmin && !_isHardcodedBot) {
        if (isDemoUser) {
          actionBtns += '<button class="btn-outline btn-sm admin-undemo-btn" onclick="adminToggleDemoUser(' + u.id + ',false)" title="Demo-Markierung entfernen">' +
            '<span class="material-icons-round">verified_user</span> Echter Nutzer' +
          '</button>';
        } else {
          actionBtns += '<button class="btn-outline btn-sm admin-makedemo-btn" onclick="adminToggleDemoUser(' + u.id + ',true)" title="Als Test-/Bot-Account markieren">' +
            '<span class="material-icons-round">science</span> Als Testnutzer' +
          '</button>';
        }
      }
      // Admin promote / demote
      if (u.isAdmin) {
        actionBtns += '<button class="btn-outline btn-sm admin-revoke-btn" onclick="adminRevokeAdmin(' + u.id + ')" title="Admin-Rechte entziehen">' +
          '<span class="material-icons-round">remove_moderator</span> Admin entziehen' +
        '</button>';
      } else {
        actionBtns += '<button class="btn-outline btn-sm admin-promote-btn" onclick="adminMakeAdmin(' + u.id + ')" title="Zum Admin ernennen">' +
          '<span class="material-icons-round">admin_panel_settings</span> Zum Admin' +
        '</button>';
      }
      // Delete (only non-admins)
      if (!u.isAdmin) {
        actionBtns += '<button class="btn-outline btn-sm admin-delete-btn" onclick="adminDeleteUser(' + u.id + ')">' +
          '<span class="material-icons-round">delete_forever</span> Löschen' +
        '</button>';
      }
    }

    html += '<div class="' + cardClass + '" data-uid="' + u.id + '">' +
      '<div class="admin-user-avatar" onclick="navigateTo(\'provider\',' + u.id + ')">' +
        '<img src="' + _escHtml(avatarSrc) + '" alt="">' +
      '</div>' +
      '<div class="admin-user-info">' +
        '<div class="admin-user-name">' + displayName + ' ' + roleBadge + tagBadges + activeBadge + demoBadge + '</div>' +
        '<div class="admin-user-meta">' +
          '<span>' + _escHtml(u.email) + '</span>' +
          (u.company ? ' · <span>' + _escHtml(u.company) + '</span>' : '') +
        '</div>' +
        '<div class="admin-user-counts">' +
          '<span><span class="material-icons-round">storefront</span> ' + (u.listings || 0) + '</span>' +
          '<span><span class="material-icons-round">rate_review</span> ' + (u.reviews || 0) + '</span>' +
          '<span><span class="material-icons-round">calendar_today</span> ' + regDate + '</span>' +
        '</div>' +
        roleSwitcher +
      '</div>' +
      '<div class="admin-user-actions">' + actionBtns + '</div>' +
    '</div>';
  });
  list.innerHTML = html;
}

var _allAdminTags = [];

function adminLoadAllTags(cb) {
  fetch('/wp-json/eventboerse/v1/admin/all-tags', { credentials: 'same-origin', headers: { 'X-WP-Nonce': wpNonce } })
    .then(function(r) { return r.json(); })
    .then(function(d) { _allAdminTags = d.tags || []; if (cb) cb(); });
}

function adminToggleTagDropdown(ev, userId) {
  ev.stopPropagation();
  var drop = document.getElementById('tagDrop' + userId);
  if (!drop) return;
  var wasOpen = drop.classList.contains('show');
  // Close all dropdowns
  document.querySelectorAll('.admin-tag-dropdown.show').forEach(function(d) { d.classList.remove('show'); });
  if (wasOpen) return;
  adminLoadAllTags(function() {
    adminRenderTagSuggestions(userId, '');
    drop.classList.add('show');
    var inp = drop.querySelector('input');
    if (inp) { inp.value = ''; inp.focus(); }
  });
}

function adminRenderTagSuggestions(userId, filter) {
  var sug = document.getElementById('tagSug' + userId);
  if (!sug) return;
  // Find current tags for this user
  var card = sug.closest('.admin-user-card');
  var currentTags = [];
  if (card) card.querySelectorAll('.admin-tag-badge').forEach(function(b) {
    var t = b.childNodes[0];
    if (t) currentTags.push(t.textContent.trim());
  });
  var html = '';
  _allAdminTags.forEach(function(tag) {
    if (currentTags.indexOf(tag) !== -1) return;
    if (filter && tag.toLowerCase().indexOf(filter.toLowerCase()) === -1) return;
    html += '<div class="admin-tag-suggestion" onclick="adminAddTag(' + userId + ',\'' + _escHtml(tag).replace(/'/g, "\\'") + '\')">' + _escHtml(tag) + '</div>';
  });
  sug.innerHTML = html;
}

function adminFilterTagSuggestions(ev, userId) {
  adminRenderTagSuggestions(userId, ev.target.value.trim());
}

function adminTagInputKey(ev, userId) {
  if (ev.key === 'Enter') {
    ev.preventDefault();
    var val = ev.target.value.trim();
    if (val) adminAddTag(userId, val);
  }
}

function adminAddTag(userId, tag) {
  // Collect current tags
  var card = document.querySelector('.admin-user-card[data-uid="' + userId + '"]');
  if (!card) return;
  var currentTags = [];
  card.querySelectorAll('.admin-tag-badge').forEach(function(b) {
    var t = b.childNodes[0];
    if (t) currentTags.push(t.textContent.trim());
  });
  if (currentTags.indexOf(tag) !== -1) return;
  currentTags.push(tag);
  adminSaveTags(userId, currentTags);
}

function adminRemoveTag(userId, tag) {
  var card = document.querySelector('.admin-user-card[data-uid="' + userId + '"]');
  if (!card) return;
  var currentTags = [];
  card.querySelectorAll('.admin-tag-badge').forEach(function(b) {
    var t = b.childNodes[0];
    if (t) currentTags.push(t.textContent.trim());
  });
  currentTags = currentTags.filter(function(t) { return t !== tag; });
  adminSaveTags(userId, currentTags);
}

function adminSaveTags(userId, tags) {
  fetch('/wp-json/eventboerse/v1/admin/user-tags', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': wpNonce },
    body: JSON.stringify({ user_id: userId, tags: tags })
  })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (d.tags) {
        if (_adminUsers) {
          _adminUsers.forEach(function(u) {
            if (u.id === userId) u.tags = d.tags;
          });
          renderAdminUserList(_adminUsers);
        }
      }
    });
}

// Close tag dropdowns on outside click
document.addEventListener('click', function() {
  document.querySelectorAll('.admin-tag-dropdown.show').forEach(function(d) { d.classList.remove('show'); });
});

var _adminSearchTimeout = null;
function adminSearchUsers(val) {
  clearTimeout(_adminSearchTimeout);
  _adminSearchTimeout = setTimeout(function() {
    loadAdminUsers(val.trim());
  }, 350);
}

function adminToggleActive(userId) {
  if (!currentUser || !currentUser.isAdmin) return;
  var user = _adminUsers.find(function(u) { return u.id === userId; });
  var isActive = user ? user.isActive !== false : true;
  var action = isActive ? 'deaktivieren' : 'aktivieren';
  if (!confirm('Diesen Benutzer wirklich ' + action + '?')) return;
  fetch(_apiUrl('admin/toggle-active'), {
    method: 'POST', credentials: 'same-origin',
    headers: _apiHeaders(),
    body: JSON.stringify({ user_id: userId })
  }).then(function(r) {
    _refreshNonce(r);
    if (r.ok) return r.json();
    return r.json().then(function(d) { throw new Error(d.message || 'Fehler'); });
  }).then(function(d) {
    showToast('Benutzer ' + (d.isActive ? 'aktiviert' : 'deaktiviert') + '.', d.isActive ? 'success' : 'warning');
    loadAdminUsers();
  }).catch(function(e) { showToast(e.message || 'Fehler beim Umschalten', 'error'); });
}

/**
 * Markiert einen User als Test-/Bot-Account oder hebt die Markierung auf.
 * Nach Erfolg: Admin-Liste neu laden UND Demo-IDs/Listings refreshen,
 * damit der globale Hide-Demo-Filter sofort greift.
 */
function adminToggleDemoUser(userId, makeDemo) {
  if (!currentUser || !currentUser.isAdmin) return;
  var msg = makeDemo
    ? 'Diesen Nutzer als Test-/Bot-Account markieren? Seine Inserate werden bei aktiviertem Demo-Filter sitewide ausgeblendet.'
    : 'Demo-Markierung wirklich entfernen? Inserate dieses Nutzers werden wieder als echt behandelt.';
  if (!confirm(msg)) return;
  fetch(_apiUrl('admin/toggle-demo'), {
    method: 'POST', credentials: 'same-origin',
    headers: _apiHeaders(),
    body: JSON.stringify({ user_id: userId, is_demo: !!makeDemo })
  }).then(function(r) {
    _refreshNonce(r);
    if (r.ok) return r.json();
    return r.json().then(function(d) { throw new Error(d.message || 'Fehler'); });
  }).then(function(d) {
    // Demo-ID-Liste lokal nachziehen, damit Filter ohne Reload greift
    var ids = window.EB_DEMO_PROVIDER_IDS || [];
    var i = ids.indexOf(+userId);
    if (d.is_demo && i === -1) ids.push(+userId);
    if (!d.is_demo && i !== -1) ids.splice(i, 1);
    window.EB_DEMO_PROVIDER_IDS = ids;
    showToast(d.is_demo ? 'Nutzer als Testaccount markiert' : 'Demo-Markierung entfernt', 'success');
    loadAdminUsers();
    // DB-Listings frisch holen (Server filtert bei aktivem Toggle bereits selbst)
    _dbListingsLoaded = false;
    if (typeof loadDbListings === 'function') {
      loadDbListings().then(function() {
        try { renderHeroMarquees(); } catch(e) {}
        try { renderBrowseGrid(LISTINGS); } catch(e) {}
        try { renderExploreGrid(); } catch(e) {}
        try { if (document.getElementById('feedList')) renderFeed('foryou'); } catch(e) {}
      });
    }
  }).catch(function(e) { showToast(e.message || 'Fehler', 'error'); });
}

function adminMakeAdmin(userId) {
  if (!currentUser || !currentUser.isAdmin) return;
  if (!confirm('Diesen Benutzer wirklich zum Admin ernennen?')) return;
  fetch(_apiUrl('admin/make-admin'), {
    method: 'POST', credentials: 'same-origin',
    headers: _apiHeaders(),
    body: JSON.stringify({ user_id: userId })
  }).then(function(r) {
    _refreshNonce(r);
    if (r.ok) return r.json();
    return r.json().then(function(d) { throw new Error(d.message || 'Fehler'); });
  }).then(function(d) {
    showToast(d.name + ' ist jetzt Admin.', 'success');
    loadAdminUsers();
  }).catch(function(e) { showToast(e.message || 'Fehler', 'error'); });
}

function adminRevokeAdmin(userId) {
  if (!currentUser || !currentUser.isAdmin) return;
  if (!confirm('Diesem Benutzer wirklich die Admin-Rechte entziehen?')) return;
  fetch(_apiUrl('admin/revoke-admin'), {
    method: 'POST', credentials: 'same-origin',
    headers: _apiHeaders(),
    body: JSON.stringify({ user_id: userId })
  }).then(function(r) {
    _refreshNonce(r);
    if (r.ok) return r.json();
    return r.json().then(function(d) { throw new Error(d.message || 'Fehler'); });
  }).then(function(d) {
    showToast(d.name + ' ist kein Admin mehr.', 'warning');
    loadAdminUsers();
  }).catch(function(e) { showToast(e.message || 'Fehler', 'error'); });
}

function adminChangeRole(userId, role) {
  if (!currentUser || !currentUser.isAdmin) return;
  var label = role === 'dienstleister' ? 'Dienstleister' : 'Event-Planer';
  fetch(_apiUrl('admin/change-role'), {
    method: 'POST', credentials: 'same-origin',
    headers: _apiHeaders(),
    body: JSON.stringify({ user_id: userId, role: role })
  }).then(function(r) {
    _refreshNonce(r);
    if (r.ok) return r.json();
    return r.json().then(function(d) { throw new Error(d.message || 'Fehler'); });
  }).then(function(d) {
    showToast(d.name + ' ist jetzt ' + label + '.', 'success');
    // Wenn der aktuelle User selbst betroffen ist, Rolle im Frontend aktualisieren
    if (currentUser && currentUser.id === userId) {
      currentUser.role = d.role;
      updateCreateFormForRole();
    }
    loadAdminUsers();
  }).catch(function(e) { showToast(e.message || 'Rollenwechsel fehlgeschlagen', 'error'); });
}

