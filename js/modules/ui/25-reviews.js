// ========== REVIEW SYSTEM ==========
var selectedRating = 0;
// Store user reviews per listing (listingId → array of reviews)
var userReviews = {};

var MONTH_NAMES = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

var RATING_LABELS = {
  1: 'Schlecht',
  2: 'Geht so',
  3: 'Okay',
  4: 'Gut',
  5: 'Ausgezeichnet'
};

function openReviewModal() {
  if (!isLoggedIn) {
    showToast('Bitte melde dich an, um eine Bewertung zu schreiben.', 'warning');
    openModal('loginModal');
    return;
  }
  if (!currentListing) return;

  selectedRating = 0;
  document.getElementById('reviewText').value = '';
  document.getElementById('starRatingLabel').textContent = 'Klicke auf einen Stern';
  var stars = document.querySelectorAll('#starRatingPicker .star-pick');
  stars.forEach(function(s) { s.textContent = '☆'; s.classList.remove('active'); });
  document.getElementById('reviewModalSubtitle').textContent = 'Bewerte „' + currentListing.title + '"';

  openModal('reviewModal');
}

function setRating(value) {
  selectedRating = value;
  var stars = document.querySelectorAll('#starRatingPicker .star-pick');
  stars.forEach(function(s) {
    var v = parseInt(s.getAttribute('data-value'));
    s.textContent = v <= value ? '★' : '☆';
    s.classList.toggle('active', v <= value);
  });
  document.getElementById('starRatingLabel').textContent = RATING_LABELS[value] || '';
}

function hoverRating(value) {
  var stars = document.querySelectorAll('#starRatingPicker .star-pick');
  stars.forEach(function(s) {
    var v = parseInt(s.getAttribute('data-value'));
    s.textContent = v <= value ? '★' : '☆';
  });
}

function resetRatingHover() {
  var stars = document.querySelectorAll('#starRatingPicker .star-pick');
  stars.forEach(function(s) {
    var v = parseInt(s.getAttribute('data-value'));
    s.textContent = v <= selectedRating ? '★' : '☆';
  });
}

function submitReview(e) {
  e.preventDefault();

  if (selectedRating === 0) {
    showToast('Bitte wähle eine Sternbewertung.', 'warning');
    return;
  }

  var text = document.getElementById('reviewText').value.trim();
  if (!text) {
    showToast('Bitte schreibe einen Bewertungstext.', 'warning');
    return;
  }

  if (!currentListing) return;

  var dbId = currentListing._dbId || (currentListing._fromDb ? currentListing.id - 10000 : currentListing.id);

  fetch(_apiUrl('listings/' + dbId + '/reviews'), {
    method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
    body: JSON.stringify({ rating: selectedRating, comment: text })
  })
    .then(function(r) {
      if (!r.ok) return r.json().then(function(d) { throw new Error(d.message || 'Fehler'); });
      return r.json();
    })
    .then(function(data) {
      // Update listing data with server-calculated values
      if (currentListing && data) {
        if (data.rating_avg !== undefined) currentListing.rating = Math.round(data.rating_avg * 10) / 10;
        if (data.review_count !== undefined) currentListing.reviews = data.review_count;
      }
      // Reload reviews from API
      loadDetailReviews(dbId);
      closeModal('reviewModal');
      showToast('Bewertung veröffentlicht! ⭐', 'star');
    })
    .catch(function(err) {
      showToast(err.message || 'Bewertung fehlgeschlagen', 'error');
    });
}

function loadDetailReviews(dbListingId) {
  var url = _apiUrl('listings/' + dbListingId + '/reviews');
  url += (url.indexOf('?') > -1 ? '&' : '?') + '_t=' + Date.now();
  fetch(url, { credentials: 'same-origin', headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' } })
    .then(function(r) {
      if (!r.ok) throw new Error('API error ' + r.status);
      return r.json();
    })
    .then(function(reviews) {
      if (!Array.isArray(reviews)) return; // API returned error object, keep existing data
      var container = document.getElementById('detailReviews');
      if (reviews.length === 0) {
        container.innerHTML =
          '<div style="text-align:center; padding: 40px 20px; color: var(--text-light);">' +
            '<span class="material-icons-round" style="font-size: 48px; margin-bottom: 12px; opacity: 0.4;">rate_review</span>' +
            '<p style="font-size: 1.05rem; font-weight: 600; color: var(--dark); margin-bottom: 6px;">Noch keine Bewertungen</p>' +
            '<p style="font-size: 0.9rem;">Sei der Erste, der eine Bewertung schreibt!</p>' +
          '</div>';
        if (currentListing) {
          currentListing.reviews = 0;
          currentListing.rating = 0;
          document.getElementById('detailRating').textContent = '0';
          document.getElementById('detailReviewCount').textContent = '(0 Bewertungen)';
        }
      } else {
        container.innerHTML = reviews.map(function(r) {
          var avatar = r.photo_url || r.avatar || ebAvatar(r.author_name || r.name || 'user', r.author_name || r.name);
          var displayName = r.author_name || r.name || 'Anonym';
          var date = r.date || (r.created_at ? new Date(r.created_at).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
          var rating = parseInt(r.rating) || 0;
          var isOwnReview = currentUser && r.user_id && _sameUserId(r.user_id, currentUser.id);
          var isListingOwner = _isCurrentUserListingOwner(currentListing);
          var canDelete = isOwnReview || isListingOwner || (currentUser && currentUser.isAdmin);
          var deleteBtn = canDelete ? '<button onclick="deleteReview(' + r.id + ')" class="review-delete-btn" title="Bewertung löschen" aria-label="Bewertung löschen"><span class="material-icons-round">close</span></button>' : '';
          return '<div class="review-card">' +
            '<img src="' + _escHtml(avatar) + '" alt="' + _escHtml(displayName) + '" class="review-avatar"' + (r.user_id ? ' style="cursor:pointer" onclick="navigateTo(\'provider\',' + r.user_id + ')"' : '') + ' />' +
            '<div class="review-content">' +
              '<div class="review-top">' +
                '<strong' + (r.user_id ? ' style="cursor:pointer" onclick="navigateTo(\'provider\',' + r.user_id + ')"' : '') + '>' + _escHtml(displayName) + '</strong>' +
                deleteBtn +
              '</div>' +
              '<div class="review-stars">' + _renderStars(rating) + '</div>' +
              '<p class="review-text">' + _escHtml(r.comment || r.text || '') + '</p>' +
              '<span class="review-date">' + _escHtml(date) + '</span>' +
            '</div>' +
          '</div>';
        }).join('');
        if (currentListing) {
          currentListing.reviews = reviews.length;
          var avg = reviews.reduce(function(s, r) { return s + parseInt(r.rating); }, 0) / reviews.length;
          currentListing.rating = Math.round(avg * 10) / 10;
          document.getElementById('detailRating').textContent = currentListing.rating;
          document.getElementById('detailReviewCount').textContent = '(' + reviews.length + ' Bewertungen)';
        }
      }
    })
    .catch(function() { /* API failed — keep existing listing data, don't override */ });
}

function deleteReview(reviewId) {
  _showConfirmDialog('Bewertung löschen', 'Möchtest du diese Bewertung wirklich löschen? Das kann nicht rückgängig gemacht werden.', 'Löschen', function() {
    fetch(_apiUrl('reviews/' + reviewId), {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: _apiHeaders()
    })
    .then(function(r) { return r.json().then(function(d) { return { ok: r.ok, data: d }; }); })
    .then(function(res) {
      if (!res.ok) { showToast(res.data.message || 'Löschen fehlgeschlagen', 'error'); return; }
      showToast('Bewertung gelöscht', 'success');
      // Refresh reviews on current page
      if (currentListing) {
        var dbId = currentListing._dbId || (currentListing._fromDb ? currentListing.id - 10000 : null);
        if (dbId) loadDetailReviews(dbId);
      }
      // Refresh provider page reviews if visible
      var provPage = document.getElementById('page-provider');
      if (provPage && provPage.classList.contains('active')) {
        var puidEl = document.getElementById('providerUserId');
        if (puidEl && puidEl.value) loadProvider(parseInt(puidEl.value));
      }
    })
    .catch(function() { showToast('Löschen fehlgeschlagen', 'error'); });
  });
}

function _showConfirmDialog(title, message, confirmText, onConfirm) {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML =
    '<div style="background:var(--bg);border-radius:var(--radius-lg);padding:28px;max-width:380px;width:90%;box-shadow:var(--shadow-xl);">' +
      '<h3 style="font-size:1.1rem;color:var(--dark);margin-bottom:8px;">' + _escHtml(title) + '</h3>' +
      '<p style="font-size:0.9rem;color:var(--text-light);line-height:1.5;margin-bottom:20px;">' + _escHtml(message) + '</p>' +
      '<div style="display:flex;gap:12px;justify-content:flex-end;">' +
        '<button id="_confirmCancel" style="padding:10px 20px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg);color:var(--text);cursor:pointer;font-size:0.9rem;">Abbrechen</button>' +
        '<button id="_confirmOk" style="padding:10px 20px;border:none;border-radius:var(--radius-sm);background:var(--primary);color:#fff;cursor:pointer;font-size:0.9rem;font-weight:600;">' + _escHtml(confirmText) + '</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  overlay.querySelector('#_confirmCancel').onclick = function() { overlay.remove(); };
  overlay.querySelector('#_confirmOk').onclick = function() { overlay.remove(); onConfirm(); };
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
}

function getAllReviewsForListing(listingId) {
  var reviews = DEMO_REVIEWS.slice();
  if (userReviews[listingId]) {
    reviews = userReviews[listingId].concat(reviews);
  }
  return reviews;
}

function renderDetailReviews(listing) {
  // Try to load from API first for DB listings
  var dbId = listing._dbId || (listing._fromDb ? listing.id - 10000 : null);
  if (dbId) {
    loadDetailReviews(dbId);
    return;
  }
  // Fallback for demo listings
  var container = document.getElementById('detailReviews');
  if (listing.reviews === 0) {
    container.innerHTML =
      '<div style="text-align:center; padding: 40px 20px; color: var(--text-light);">' +
        '<span class="material-icons-round" style="font-size: 48px; margin-bottom: 12px; opacity: 0.4;">rate_review</span>' +
        '<p style="font-size: 1.05rem; font-weight: 600; color: var(--dark); margin-bottom: 6px;">Noch keine Bewertungen</p>' +
        '<p style="font-size: 0.9rem;">Dieser Anbieter ist neu auf Eventbörse. Sei der Erste, der eine Bewertung schreibt!</p>' +
      '</div>';
  } else {
    var allReviews = getAllReviewsForListing(listing.id);
    container.innerHTML = allReviews.map(function(r) {
      return '<div class="review-card">' +
        '<img src="' + _escHtml(ebAvatar(r.avatar || r.name || 'user', r.name)) + '" alt="' + _escHtml(r.name) + '" class="review-avatar" />' +
        '<div class="review-content">' +
          '<div class="review-top">' +
            '<strong>' + _escHtml(r.name) + '</strong>' +
          '</div>' +
          '<div class="review-stars">' + _renderStars(r.rating) + '</div>' +
          '<p class="review-text">' + _escHtml(r.text) + '</p>' +
          '<span class="review-date">' + _escHtml(r.date) + '</span>' +
        '</div>' +
      '</div>';
    }).join('');
    // Sync displayed count with actual reviews
    document.getElementById('detailReviewCount').textContent = '(' + allReviews.length + ' Bewertungen)';
  }
}

