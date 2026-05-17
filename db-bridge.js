```javascript
/**
 * db-bridge.js
 * Replaces hardcoded demo data (LISTINGS, REVIEWS, CHATS) with real DB calls.
 * Loaded after app.js. Overrides the global arrays and re-triggers renders.
 * 
 * Strategy:
 *  - LISTINGS: fetched from GET /listings, replaces global array
 *  - REVIEWS:  fetched per listing from GET /listings/{id}/reviews (lazy, on detail open)
 *  - CHATS:    fetched from GET /conversations (on messages page open)
 */

(function() {
  'use strict';

  // ── Helpers (mirrors what app.js already has) ───────────────────────────────

  function _apiBase() {
    if (window.eventboerseApi && window.eventboerseApi.restUrl) {
      return window.eventboerseApi.restUrl.replace(/\/$/, '');
    }
    return '/wp-json/eventboerse/v1';
  }

  function _apiHeaders() {
    var headers = { 'Content-Type': 'application/json' };
    if (window.eventboerseApi && window.eventboerseApi.nonce) {
      headers['X-WP-Nonce'] = window.eventboerseApi.nonce;
    }
    return headers;
  }

  function _get(endpoint) {
    return fetch(_apiBase() + endpoint, {
      method: 'GET',
      credentials: 'include',
      headers: _apiHeaders()
    }).then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status + ' on ' + endpoint);
      return r.json();
    });
  }

  // ── 1. LISTINGS ─────────────────────────────────────────────────────────────

  /**
   * Loads all active listings from DB and replaces the global LISTINGS array.
   * Then re-triggers browse render if browse page is currently active.
   */
  function loadDbListings(opts) {
    opts = opts || {};
    var qs = '';
    if (opts.category) qs += '&category=' + encodeURIComponent(opts.category);
    if (opts.location)  qs += '&location='  + encodeURIComponent(opts.location);
    if (opts.search)    qs += '&search='    + encodeURIComponent(opts.search);
    if (opts.per_page)  qs += '&per_page='  + encodeURIComponent(opts.per_page);
    if (opts.page)      qs += '&page='      + encodeURIComponent(opts.page);
    if (qs) qs = '?' + qs.slice(1);

    return _get('/listings' + qs).then(function(data) {
      var listings = Array.isArray(data) ? data : (data.listings || data.items || []);

      // Normalise to the shape the rest of app.js expects
      listings = listings.map(_normaliseListing);

      // Replace global array (app.js declares: var LISTINGS = [...])
      if (typeof window.LISTINGS !== 'undefined') {
        window.LISTINGS.length = 0;
        listings.forEach(function(l) { window.LISTINGS.push(l); });
      } else {
        window.LISTINGS = listings;
      }

      return listings;
    });
  }

  /**
   * Normalise a DB listing object to the shape hardcoded demo data had.
   * Keeps all extra fields, just guarantees the minimum set.
   */
  function _normaliseListing(l) {
    return {
      id:           l.id          || l.ID,
      title:        l.title       || '',
      description:  l.description || l.desc || '',
      category:     l.category    || '',
      categoryLabel:l.category_label || l.categoryLabel || l.category || '',
      price:        l.price       || l.base_price || 0,
      priceModel:   l.price_model || l.priceModel || 'pauschal',
      priceLabel:   l.price_label || l.priceLabel || '',
      location:     l.location    || '',
      region:       l.region      || '',
      images:       Array.isArray(l.images) ? l.images : (l.images ? [l.images] : []),
      features:     Array.isArray(l.features) ? l.features : [],
      tags:         Array.isArray(l.tags) ? l.tags : [],
      rating:       parseFloat(l.avg_rating  || l.rating  || 0),
      reviewCount:  parseInt(l.review_count  || l.reviewCount || 0, 10),
      userId:       l.user_id     || l.userId || null,
      providerName: l.provider_name || l.providerName || '',
      providerPhoto:l.provider_photo || l.providerPhoto || '',
      status:       l.status      || 'active',
      dateFrom:     l.date_from   || l.dateFrom || null,
      dateTo:       l.date_to     || l.dateTo   || null,
      createdAt:    l.created_at  || l.createdAt || null,
      // keep raw original for any field we missed
      _raw: l
    };
  }

  // ── 2. REVIEWS (lazy, per listing) ──────────────────────────────────────────

  var _reviewCache = {};

  /**
   * Load reviews for a specific listing.
   * Returns a Promise<Array> and caches the result.
   * app.js detail-page can call: window.loadListingReviews(id).then(...)
   */
  function loadListingReviews(listingId) {
    if (_reviewCache[listingId]) {
      return Promise.resolve(_reviewCache[listingId]);
    }
    return _get('/listings/' + listingId + '/reviews').then(function(data) {
      var reviews = Array.isArray(data) ? data : (data.reviews || []);
      reviews = reviews.map(function(r) {
        return {
          id:         r.id,
          listingId:  r.listing_id  || r.listingId  || listingId,
          authorId:   r.author_id   || r.authorId,
          authorName: r.author_name || r.authorName || 'Unbekannt',
          authorPhoto:r.author_photo|| r.authorPhoto|| '',
          rating:     parseInt(r.rating, 10),
          comment:    r.comment     || '',
          createdAt:  r.created_at  || r.createdAt  || ''
        };
      });
      _reviewCache[listingId] = reviews;
      return reviews;
    });
  }

  /** Invalidate review cache for a listing (call after submitting new review) */
  function invalidateReviewCache(listingId) {
    delete _reviewCache[listingId];
  }

  // ── 3. CONVERSATIONS / CHATS ────────────────────────────────────────────────

  /**
   * Load all conversations for the current user.
   * Returns Promise<Array> in the shape app.js chat expects.
   */
  function loadConversations() {
    return _get('/conversations').then(function(data) {
      var convos = Array.isArray(data) ? data : (data.conversations || []);
      return convos.map(function(c) {
        return {
          id:              c.id,
          listingId:       c.listing_id    || c.listingId    || null,
          listingTitle:    c.listing_title || c.listingTitle || '',
          otherUserId:     c.other_user_id || c.otherUserId  || null,
          otherUserName:   c.other_user_name || c.otherUserName || 'Unbekannt',
          otherUserPhoto:  c.other_user_photo|| c.otherUserPhoto|| '',
          lastMessage:     c.last_message  || c.lastMessage  || '',
          lastMessageAt:   c.last_message_at|| c.lastMessageAt|| null,
          unreadCount:     parseInt(c.unread_count || c.unreadCount || 0, 10),
          status:          c.status        || 'active',
          _raw: c
        };
      });
    });
  }

  /**
   * Load messages for a specific conversation.
   * Returns Promise<Array>.
   */
  function loadConversationMessages(conversationId) {
    return _get('/conversations/' + conversationId + '/messages').then(function(data) {
      var messages = Array.isArray(data) ? data : (data.messages || []);
      return messages.map(function(m)