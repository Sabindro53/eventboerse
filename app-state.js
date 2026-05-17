```javascript
/**
 * app-state.js — Global State & Constants
 * 
 * This file is loaded BEFORE app.js.
 * All variables declared here are available globally.
 * 
 * Migration status: SCAFFOLD
 * When app.js state vars are moved here, remove them from app.js.
 */

(function() {
  'use strict';

  // ─── Version / Cache-Buster ───────────────────────────────────────────────
  window.EB_VERSION = '1.0.0';

  // ─── State Container ─────────────────────────────────────────────────────
  // Will be populated by app.js on init until full migration is done.
  // Target: move currentUser, currentChat etc. here from app.js ~line 539.
  window.EBState = window.EBState || {
    currentUser: null,
    currentChat: null,
    currentListing: null,
    currentPage: null,
    _pollingInterval: null,
    _boardProjects: [],
    _activeBoardId: null,
  };

  // ─── Config ───────────────────────────────────────────────────────────────
  window.EBConfig = window.EBConfig || {
    pollingInterval: 3000,
    avatarColors: [
      '#e74c3c','#e67e22','#f39c12','#27ae60',
      '#16a085','#2980b9','#8e44ad','#c0392b'
    ],
  };

  // ─── Category Map ─────────────────────────────────────────────────────────
  // Extracted from app.js — safe to centralize early.
  window.EB_CATEGORIES = window.EB_CATEGORIES || {
    dj:          { label: 'DJ',           icon: '🎧' },
    catering:    { label: 'Catering',     icon: '🍽️' },
    fotografie:  { label: 'Fotografie',   icon: '📸' },
    video:       { label: 'Video',        icon: '🎬' },
    location:    { label: 'Location',     icon: '🏛️' },
    moderation:  { label: 'Moderation',   icon: '🎤' },
    musik:       { label: 'Musik',        icon: '🎵' },
    dekoration:  { label: 'Dekoration',   icon: '🌸' },
    floristik:   { label: 'Floristik',    icon: '💐' },
    security:    { label: 'Security',     icon: '🔒' },
    transport:   { label: 'Transport',    icon: '🚌' },
    technik:     { label: 'Technik',      icon: '🔊' },
  };

  // ─── Event Types ──────────────────────────────────────────────────────────
  window.EB_EVENT_TYPES = window.EB_EVENT_TYPES || [
    'Hochzeit', 'Geburtstag', 'Firmenfeier', 'Kongress',
    'Messe', 'Konzert', 'Sportsveranstaltung', 'Privatfeier',
    'Jubiläum', 'Taufe', 'Abiturfeier', 'Weihnachtsfeier',
  ];

  // ─── Regions ──────────────────────────────────────────────────────────────
  window.EB_REGIONS = window.EB_REGIONS || [
    'Bundesweit',
    'Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg',
    'Bremen', 'Hamburg', 'Hessen', 'Mecklenburg-Vorpommern',
    'Niedersachsen', 'Nordrhein-Westfalen', 'Rheinland-Pfalz',
    'Saarland', 'Sachsen', 'Sachsen-Anhalt',
    'Schleswig-Holstein', 'Thüringen',
  ];

  console.debug('[EB] app-state.js loaded');

})();
```

---