```javascript
/**
 * app-utils.js — Shared Utilities
 *
 * This file is loaded BEFORE app.js.
 * Provides API helpers, avatar generator, formatters.
 *
 * Migration status: SCAFFOLD
 * Target: move _apiUrl(), _apiHeaders(), ebAvatar(), formatters from app.js here.
 * Current locations in app.js: ~line 8631 (_apiUrl/_apiHeaders), various.
 *
 * HOW TO MIGRATE:
 * 1. Copy each function from app.js into this file
 * 2. Expose on window (for backward compat)
 * 3. Remove from app.js
 */

(function() {
  'use strict';

  // ─── API Helpers ─────────────────────────────────────────────────────────

  /**
   * Build a full REST API URL.
   * Falls back to relative path if eventboerseApi.restUrl is not set.
   * Mirrors _apiUrl() from app.js ~line 8631.
   *
   * NOTE: This stub will be OVERWRITTEN by app.js _apiUrl() until migration.
   * Once migrated: remove _apiUrl() from app.js.
   *
   * @param {string} endpoint — e.g. 'listings' or 'listings/123'
   * @returns {string}
   */
  window._apiUrl = window._apiUrl || function(endpoint) {
    var base = (typeof eventboerseApi !== 'undefined' && eventboerseApi.restUrl)
      ? eventboerseApi.restUrl
      : '/wp-json/eventboerse/v1/';

    // Ensure trailing slash on base, no leading slash on endpoint
    if (base.slice(-1) !== '/') base += '/';
    if (endpoint.charAt(0) === '/') endpoint = endpoint.slice(1);

    return base + endpoint;
  };

  /**
   * Build fetch headers including WP Nonce for auth.
   * Mirrors _apiHeaders() from app.js.
   *
   * @param {boolean} [withContentType=true]
   * @returns {Object}
   */
  window._apiHeaders = window._apiHeaders || function(withContentType) {
    var headers = {
      'X-WP-Nonce': (typeof eventboerseApi !== 'undefined' && eventboerseApi.nonce)
        ? eventboerseApi.nonce
        : '',
    };
    if (withContentType !== false) {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  };

  // ─── Date / Time Formatters ───────────────────────────────────────────────

  /**
   * Format a date string to German locale.
   * @param {string|Date} date
   * @returns {string}
   */
  window.ebFormatDate = window.ebFormatDate || function(date) {
    if (!date) return '';
    try {
      return new Date(date).toLocaleDateString('