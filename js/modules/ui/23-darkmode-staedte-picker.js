// ========== DARK MODE ==========
function initDarkMode() {
  var isDark = localStorage.getItem('eb_dark_mode') !== '0';
  _applyDarkMode(isDark);
  var toggle = document.getElementById('darkModeToggle');
  if (toggle) toggle.checked = isDark;
}

function toggleDarkMode(on) {
  ebSpeichern('eb_dark_mode', on ? '1' : '0');
  _applyDarkMode(on);
  var icon = document.getElementById('darkModeIcon');
  var label = document.getElementById('darkModeLabel');
  if (icon) icon.textContent = on ? 'light_mode' : 'dark_mode';
  if (label) label.textContent = on ? 'Hellmodus' : 'Dunkelmodus';
}

function _applyDarkMode(on) {
  document.body.classList.toggle('dark-mode', on);
  document.documentElement.classList.remove('dark-early');
  var icon = document.getElementById('darkModeIcon');
  var label = document.getElementById('darkModeLabel');
  if (icon) icon.textContent = on ? 'light_mode' : 'dark_mode';
  if (label) label.textContent = on ? 'Hellmodus' : 'Dunkelmodus';
  // Update theme-color meta for mobile browser chrome
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.appendChild(meta); }
  meta.content = on ? '#1A1A1A' : '#FFFFFF';
}

// Init drag & drop after DOM loaded
document.addEventListener('DOMContentLoaded', function() {
  initDarkMode();
  registerEventboerseServiceWorker();
  setupDragDrop();
  initAiSearch();
  restoreSession();
  updatePasskeyLoginUi();
  initPasswordFields();
  initDragScroll();
  initDatePickers();

  // Wochentag-Pill-Toggle für Sofortbuchung im Inserat-Formular
  var _wdPicker = document.getElementById('createWeekdayPicker');
  if (_wdPicker) {
    _wdPicker.addEventListener('click', function(e) {
      var pill = e.target.closest('.weekday-pill');
      if (!pill) return;
      e.preventDefault();
      pill.classList.toggle('selected');
    });
  }
  initCityAutocomplete();
  initProfileCityAutocomplete();
  initTimePickers();
  initFeatureSearch();

  // Clear all browse filters on fresh page load (prevent browser form restoration)
  var _clearBrowseFilters = function(){
    ['browseSearch','browseCategory','browseEventType','browseLocation','browsePrice','browseRating'].forEach(function(id){
      var el = document.getElementById(id); if(el) el.value = '';
    });
  };
  _clearBrowseFilters();
  // Some browsers restore form values AFTER DOMContentLoaded – clear again after a tick
  setTimeout(_clearBrowseFilters, 0);

  // Handle initial route (deep links, clean URLs, legacy hash)
  var initRoute = _readSpaRoute();
  var initPage = initRoute.page;
  var initData = initRoute.data;
  if (initPage === 'home') initPage = 'browse';
  // Clean up legacy hash if present
  if (window.location.hash) {
    window.history.replaceState({ page: initPage, data: initData }, '', _spaPath(initPage, initData));
  } else {
    window.history.replaceState({ page: initPage, data: initData }, '', _spaPath(initPage, initData));
  }
  var initialPageReady;
  if (initPage && initPage !== 'browse') {
    initialPageReady = navigateTo(initPage, initData, true);
  } else {
    initialPageReady = navigateTo('browse', null, true);
  }

  // Erst Daten rendern, dann die wichtigen sichtbaren Bilder dekodieren.
  // Der Loader selbst besitzt einen 15-s-Failsafe für langsame Verbindungen.
  Promise.resolve(initialPageReady).catch(function(){}).then(function(){
    if (typeof window.__finishAppLoading === 'function') return window.__finishAppLoading();
    if (typeof window.__hideAppLoader === 'function') window.__hideAppLoader();
  });

  // Performance: alle dynamisch eingefügten <img>-Tags automatisch lazy-loaden.
  // Spart bei langen Listen (Browse, Gallery, Chat-Avatare) massiv Bandbreite.
  try {
    var _imgObserver = new MutationObserver(function(muts){
      muts.forEach(function(m){
        m.addedNodes && m.addedNodes.forEach(function(node){
          if (node.nodeType !== 1) return;
          var imgs = node.tagName === 'IMG' ? [node] : node.querySelectorAll ? node.querySelectorAll('img') : [];
          for (var i = 0; i < imgs.length; i++) {
            var img = imgs[i];
            if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');
            if (!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
          }
        });
      });
    });
    _imgObserver.observe(document.body, { childList: true, subtree: true });
  } catch (e) { /* MutationObserver nicht verfügbar – egal */ }

// Handle browser back/forward
  window.addEventListener('popstate', function(e) {
    // Always restore scrolling when navigating back/forward
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    if (e.state && e.state.page) {
      navigateTo(e.state.page, e.state.data, true);
    }
  });

  initVisualMotion();
});

// ========== PAGE MOTION (subtle Apple-like interactivity) ==========
var _visualMotionRAF = 0;
function initVisualMotion() {
  const hero = document.querySelector('.hero');
  const heroBg = document.querySelector('.hero-bg');
  const sections = document.querySelectorAll('main .section, .hero-content, .hero-marquee');

  if (hero) hero.classList.add('hero-float');

  // Use scroll event instead of perpetual RAF loop
  var _vmTicking = false;
  var lastScroll = 0;
  window.addEventListener('scroll', function() {
    if (_vmTicking) return;
    _vmTicking = true;
    requestAnimationFrame(function() {
      var scrollY = window.scrollY;
      if (heroBg) {
        var strength = Math.min(50, scrollY / 10);
        heroBg.style.transform = 'translate3d(0,' + strength + 'px,0) scale(1.04)';
      }
      if (hero) {
        var tilt = Math.min(18, Math.max(-18, (scrollY - lastScroll) * 0.15));
        hero.style.transform = 'perspective(1000px) translateZ(0) rotateX(' + tilt + 'deg)';
        lastScroll = scrollY;
      }
      _vmTicking = false;
    });
  }, { passive: true });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.25 });

  sections.forEach(el => {
    el.classList.add('animated-entry');
    observer.observe(el);
  });
}

// ========== DATE PICKERS (Flatpickr) ==========
function setupYearDropdown(fp) {
  const yearInput = fp.calendarContainer.querySelector('input.cur-year');
  if (!yearInput) return;
  yearInput.readOnly = true;
  const wrapper = yearInput.closest('.numInputWrapper');
  wrapper.addEventListener('click', function(e) {
    e.stopPropagation();
    e.preventDefault();
    const existing = wrapper.querySelector('.year-dropdown');
    if (existing) { existing.remove(); return; }
    const currentYear = fp.currentYear;
    const minYear = new Date().getFullYear();
    const maxYear = minYear + 6;
    const dropdown = document.createElement('div');
    dropdown.className = 'year-dropdown';
    for (let y = minYear; y <= maxYear; y++) {
      const item = document.createElement('div');
      item.className = 'year-dropdown-item' + (y === currentYear ? ' active' : '');
      item.textContent = y;
      item.addEventListener('click', function(ev) {
        ev.stopPropagation();
        fp.changeYear(y);
        dropdown.remove();
      });
      dropdown.appendChild(item);
    }
    wrapper.appendChild(dropdown);
    const activeItem = dropdown.querySelector('.active');
    if (activeItem) {
      dropdown.scrollTop = activeItem.offsetTop - dropdown.offsetHeight / 2 + activeItem.offsetHeight / 2;
    }
    setTimeout(function() {
      function closeYearDd(ev) {
        if (!dropdown.contains(ev.target) && !wrapper.contains(ev.target)) {
          dropdown.remove();
          document.removeEventListener('click', closeYearDd);
        }
      }
      document.addEventListener('click', closeYearDd);
    }, 0);
  });
}

function initDatePickers() {
  if (typeof flatpickr === 'undefined') return;
  const fpConfig = {
    locale: 'de',
    dateFormat: 'Y-m-d',
    altInput: true,
    altFormat: 'd.m.Y',
    allowInput: true,
    disableMobile: true,
    minDate: 'today',
    onReady: function(selectedDates, dateStr, instance) {
      setupYearDropdown(instance);
    }
  };
  const fromPicker = flatpickr('#createDateFrom', {
    ...fpConfig,
    onChange: function(selectedDates) {
      if (selectedDates[0] && toPicker) {
        toPicker.set('minDate', selectedDates[0]);
      }
    }
  });
  const toPicker = flatpickr('#createDateTo', fpConfig);

  // Booking date on detail page
  flatpickr('#bookingDate', fpConfig);

  // Negotiation date in modal
  flatpickr('#negDate', fpConfig);
}

// Einheitlicher deutscher Datumspicker (TT.MM.JJJJ) mit Kalender – für
// dynamisch eingefügte Modals (z.B. Board-Projekt-Erstellen, Event bearbeiten).
// Liefert stets ISO-Werte (YYYY-MM-DD) im Input zurück, damit bestehender
// Auslesecode (.value) unverändert funktioniert. Fallback: natives date-Feld,
// falls flatpickr (noch) nicht geladen ist.
function _attachGermanDatePicker(selector, extraOptions) {
  var el = typeof selector === 'string' ? document.querySelector(selector) : selector;
  if (!el) return null;
  // Bereits initialisiert? Dann nichts doppeltes anhängen.
  if (el._flatpickr) return el._flatpickr;
  if (typeof flatpickr === 'undefined') {
    // Fallback: nativer date-Picker, damit der Nutzer trotzdem einen Kalender
    // bekommt. Anzeige ist dann je nach Browser/Locale.
    try { el.type = 'date'; } catch (_) {}
    return null;
  }
  var opts = {
    locale: (typeof flatpickr !== 'undefined' && flatpickr.l10ns && flatpickr.l10ns.de) ? 'de' : undefined,
    dateFormat: 'Y-m-d',   // Wert im Input (ISO) – kompatibel mit bestehender Logik
    altInput: true,
    altFormat: 'd.m.Y',    // Anzeige im sichtbaren Feld (TT.MM.JJJJ)
    allowInput: true,
    disableMobile: true,
    onReady: function(selectedDates, dateStr, instance) {
      try { if (typeof setupYearDropdown === 'function') setupYearDropdown(instance); } catch (_) {}
    }
  };
  if (extraOptions && typeof extraOptions === 'object') {
    Object.keys(extraOptions).forEach(function(k){ opts[k] = extraOptions[k]; });
  }
  try { return flatpickr(el, opts); } catch (_) {
    try { el.type = 'date'; } catch (_) {}
    return null;
  }
}

// ========== GERMAN CITIES ==========
const GERMAN_CITIES = [
  {name:'Berlin',state:'Berlin'},{name:'Hamburg',state:'Hamburg'},{name:'München',state:'Bayern'},
  {name:'Köln',state:'NRW'},{name:'Frankfurt am Main',state:'Hessen'},{name:'Stuttgart',state:'Baden-Württemberg'},
  {name:'Düsseldorf',state:'NRW'},{name:'Leipzig',state:'Sachsen'},{name:'Dortmund',state:'NRW'},
  {name:'Essen',state:'NRW'},{name:'Bremen',state:'Bremen'},{name:'Dresden',state:'Sachsen'},
  {name:'Hannover',state:'Niedersachsen'},{name:'Nürnberg',state:'Bayern'},{name:'Duisburg',state:'NRW'},
  {name:'Bochum',state:'NRW'},{name:'Wuppertal',state:'NRW'},{name:'Bielefeld',state:'NRW'},
  {name:'Bonn',state:'NRW'},{name:'Münster',state:'NRW'},{name:'Mannheim',state:'Baden-Württemberg'},
  {name:'Karlsruhe',state:'Baden-Württemberg'},{name:'Augsburg',state:'Bayern'},{name:'Wiesbaden',state:'Hessen'},
  {name:'Mönchengladbach',state:'NRW'},{name:'Gelsenkirchen',state:'NRW'},{name:'Aachen',state:'NRW'},
  {name:'Braunschweig',state:'Niedersachsen'},{name:'Kiel',state:'Schleswig-Holstein'},{name:'Chemnitz',state:'Sachsen'},
  {name:'Halle (Saale)',state:'Sachsen-Anhalt'},{name:'Magdeburg',state:'Sachsen-Anhalt'},{name:'Freiburg',state:'Baden-Württemberg'},
  {name:'Krefeld',state:'NRW'},{name:'Mainz',state:'Rheinland-Pfalz'},{name:'Lübeck',state:'Schleswig-Holstein'},
  {name:'Erfurt',state:'Thüringen'},{name:'Oberhausen',state:'NRW'},{name:'Rostock',state:'Mecklenburg-Vorpommern'},
  {name:'Kassel',state:'Hessen'},{name:'Hagen',state:'NRW'},{name:'Potsdam',state:'Brandenburg'},
  {name:'Saarbrücken',state:'Saarland'},{name:'Hamm',state:'NRW'},{name:'Ludwigshafen',state:'Rheinland-Pfalz'},
  {name:'Oldenburg',state:'Niedersachsen'},{name:'Osnabrück',state:'Niedersachsen'},{name:'Leverkusen',state:'NRW'},
  {name:'Heidelberg',state:'Baden-Württemberg'},{name:'Darmstadt',state:'Hessen'},{name:'Solingen',state:'NRW'},
  {name:'Regensburg',state:'Bayern'},{name:'Herne',state:'NRW'},{name:'Paderborn',state:'NRW'},
  {name:'Neuss',state:'NRW'},{name:'Ingolstadt',state:'Bayern'},{name:'Offenbach',state:'Hessen'},
  {name:'Würzburg',state:'Bayern'},{name:'Ulm',state:'Baden-Württemberg'},{name:'Heilbronn',state:'Baden-Württemberg'},
  {name:'Pforzheim',state:'Baden-Württemberg'},{name:'Wolfsburg',state:'Niedersachsen'},{name:'Göttingen',state:'Niedersachsen'},
  {name:'Bottrop',state:'NRW'},{name:'Reutlingen',state:'Baden-Württemberg'},{name:'Koblenz',state:'Rheinland-Pfalz'},
  {name:'Bremerhaven',state:'Bremen'},{name:'Bergisch Gladbach',state:'NRW'},{name:'Jena',state:'Thüringen'},
  {name:'Erlangen',state:'Bayern'},{name:'Trier',state:'Rheinland-Pfalz'},{name:'Remscheid',state:'NRW'},
  {name:'Salzgitter',state:'Niedersachsen'},{name:'Siegen',state:'NRW'},{name:'Cottbus',state:'Brandenburg'},
  {name:'Hildesheim',state:'Niedersachsen'},{name:'Gera',state:'Thüringen'},{name:'Schwerin',state:'Mecklenburg-Vorpommern'},
  {name:'Gütersloh',state:'NRW'},{name:'Konstanz',state:'Baden-Württemberg'},{name:'Bamberg',state:'Bayern'},
  {name:'Bayreuth',state:'Bayern'},{name:'Lüneburg',state:'Niedersachsen'},{name:'Marburg',state:'Hessen'},
  {name:'Hanau',state:'Hessen'},{name:'Flensburg',state:'Schleswig-Holstein'},{name:'Wilhelmshaven',state:'Niedersachsen'},
  {name:'Schwäbisch Gmünd',state:'Baden-Württemberg'},{name:'Friedrichshafen',state:'Baden-Württemberg'},
  {name:'Esslingen',state:'Baden-Württemberg'},{name:'Görlitz',state:'Sachsen'},{name:'Passau',state:'Bayern'},
  {name:'Stralsund',state:'Mecklenburg-Vorpommern'},{name:'Greifswald',state:'Mecklenburg-Vorpommern'},
  {name:'Zwickau',state:'Sachsen'},{name:'Plauen',state:'Sachsen'},{name:'Fulda',state:'Hessen'},
  {name:'Landshut',state:'Bayern'},{name:'Ravensburg',state:'Baden-Württemberg'},{name:'Baden-Baden',state:'Baden-Württemberg'},
  {name:'Weimar',state:'Thüringen'},{name:'Aschaffenburg',state:'Bayern'},{name:'Minden',state:'NRW'},
  {name:'Detmold',state:'NRW'},{name:'Worms',state:'Rheinland-Pfalz'},{name:'Speyer',state:'Rheinland-Pfalz'}
];

function initCityAutocomplete() {
  const input = document.getElementById('createRegion');
  const hidden = document.getElementById('createRegionValue');
  const list = document.getElementById('cityAutocompleteList');
  if (!input || !list) return;
  let activeIdx = -1;

  input.addEventListener('input', function() {
    const q = this.value.trim().toLowerCase();
    hidden.value = '';
    if (q.length < 1) { list.classList.remove('open'); list.innerHTML = ''; return; }
    const matches = GERMAN_CITIES.filter(c => c.name.toLowerCase().startsWith(q)).slice(0, 8);
    if (matches.length === 0) { list.classList.remove('open'); list.innerHTML = ''; return; }
    activeIdx = -1;
    list.innerHTML = matches.map((c, i) =>
      `<li data-city="${c.name}" data-state="${c.state}">${c.name}<span class="city-state">${c.state}</span></li>`
    ).join('');
    list.classList.add('open');
  });

  list.addEventListener('click', function(e) {
    const li = e.target.closest('li');
    if (!li) return;
    input.value = li.dataset.city;
    hidden.value = li.dataset.city;
    list.classList.remove('open');
  });

  input.addEventListener('keydown', function(e) {
    const items = list.querySelectorAll('li');
    if (!items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = Math.min(activeIdx + 1, items.length - 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx = Math.max(activeIdx - 1, 0); }
    else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); items[activeIdx].click(); return; }
    else return;
    items.forEach((it, i) => it.classList.toggle('active', i === activeIdx));
  });

  document.addEventListener('click', function(e) {
    if (!e.target.closest('.city-autocomplete-wrap')) {
      list.classList.remove('open');
      var pList = document.getElementById('profileCityList');
      if (pList) pList.classList.remove('open');
    }
  });
}

function initProfileCityAutocomplete() {
  var input = document.getElementById('profileLocation');
  var list = document.getElementById('profileCityList');
  if (!input || !list) return;
  var activeIdx = -1;

  input.addEventListener('input', function() {
    var q = this.value.trim().toLowerCase();
    if (q.length < 1) { list.classList.remove('open'); list.innerHTML = ''; return; }
    var matches = GERMAN_CITIES.filter(function(c) { return c.name.toLowerCase().startsWith(q); }).slice(0, 8);
    if (matches.length === 0) { list.classList.remove('open'); list.innerHTML = ''; return; }
    activeIdx = -1;
    list.innerHTML = matches.map(function(c) {
      return '<li data-city="' + c.name + '" data-state="' + c.state + '">' + c.name + '<span class="city-state">' + c.state + '</span></li>';
    }).join('');
    list.classList.add('open');
  });

  list.addEventListener('click', function(e) {
    var li = e.target.closest('li');
    if (!li) return;
    input.value = li.dataset.city;
    list.classList.remove('open');
  });

  input.addEventListener('keydown', function(e) {
    var items = list.querySelectorAll('li');
    if (!items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = Math.min(activeIdx + 1, items.length - 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx = Math.max(activeIdx - 1, 0); }
    else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); items[activeIdx].click(); return; }
    else return;
    items.forEach(function(it, i) { it.classList.toggle('active', i === activeIdx); });
  });
}

// ========== TIME PICKER HELPERS ==========
function getTime24(prefix) {
  const h = parseInt(document.getElementById(prefix + 'H').value);
  const m = parseInt(document.getElementById(prefix + 'M').value);
  return { h, m, total: h * 60 + m };
}

function getTimeISO(prefix) {
  const t = getTime24(prefix);
  return String(t.h).padStart(2, '0') + ':' + String(t.m).padStart(2, '0');
}

function calcDuration() {
  const from = getTime24('createTimeFrom');
  const to = getTime24('createTimeTo');
  let diff = to.total - from.total;
  if (diff <= 0) diff += 1440;
  const hours = diff / 60;
  const durInput = document.getElementById('createDuration');
  if (!durInput) return;
  const formatted = hours % 1 === 0 ? hours : hours.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  durInput.value = formatted;
  durInput.dataset.max = hours;
  flashDuration();
}

function flashDuration() {
  var el = document.getElementById('createDuration');
  if (!el) return;
  el.classList.remove('flash');
  void el.offsetWidth;
  el.classList.add('flash');
}

function parseDuration(raw) {
  var s = String(raw).trim();
  // "3:30" or "3,30" → treat as h:mm
  var hm = s.match(/^(\d+)\s*[:,]\s*(\d+)$/);
  if (hm) {
    var h = parseInt(hm[1]);
    var mins = parseInt(hm[2]);
    if (mins >= 60) mins = 59;
    return h + mins / 60;
  }
  // Plain number (allow comma as decimal sep)
  var n = parseFloat(s.replace(',', '.'));
  return isNaN(n) ? null : n;
}

function snapDuration(v) {
  return Math.round(v * 2) / 2; // snap to nearest 0.5
}

function formatDuration(v) {
  return v % 1 === 0 ? String(v) : v.toFixed(1);
}

function clampAndFormat() {
  var durInput = document.getElementById('createDuration');
  if (!durInput) return;
  var maxH = parseFloat(durInput.dataset.max) || 24;
  var parsed = parseDuration(durInput.value);
  if (parsed === null || parsed < 0.5) parsed = 0.5;
  parsed = snapDuration(parsed);
  if (parsed > maxH) parsed = maxH;
  if (parsed < 0.5) parsed = 0.5;
  durInput.value = formatDuration(parsed);
  flashDuration();
}

function initTimePickers() {
  ['createTimeFromH','createTimeFromM',
   'createTimeToH','createTimeToM'].forEach(id => {
    var el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', calcDuration);
      el.addEventListener('input', calcDuration);
    }
  });
  var durInput = document.getElementById('createDuration');
  if (durInput) {
    durInput.addEventListener('blur', clampAndFormat);
    durInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); clampAndFormat(); durInput.blur(); return; }
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      var maxH = parseFloat(durInput.dataset.max) || 24;
      var cur = parseDuration(durInput.value);
      if (cur === null) cur = 0.5;
      cur = snapDuration(cur);
      if (e.key === 'ArrowUp') cur += 0.5;
      else cur -= 0.5;
      if (cur < 0.5) cur = 0.5;
      if (cur > maxH) cur = maxH;
      durInput.value = formatDuration(cur);
      flashDuration();
    });
  }
  // Stepper buttons
  var durUp = document.getElementById('durUp');
  var durDown = document.getElementById('durDown');
  function stepDuration(dir) {
    var maxH = parseFloat(durInput.dataset.max) || 24;
    var cur = parseDuration(durInput.value);
    if (cur === null) cur = 0.5;
    cur = snapDuration(cur) + dir * 0.5;
    if (cur < 0.5) cur = 0.5;
    if (cur > maxH) cur = maxH;
    durInput.value = formatDuration(cur);
    flashDuration();
  }
  if (durUp) durUp.addEventListener('click', function() { stepDuration(1); });
  if (durDown) durDown.addEventListener('click', function() { stepDuration(-1); });
  calcDuration();
}

// ========== FAVORITES ==========
function toggleFavorite(listingId, btn) {
  if (favorites.has(listingId)) {
    favorites.delete(listingId);
    btn.classList.remove('liked');
    btn.querySelector('.material-icons-round').textContent = 'favorite_border';
    showToast('Von Favoriten entfernt', 'favorite_border');
  } else {
    favorites.add(listingId);
    btn.classList.add('liked');
    btn.querySelector('.material-icons-round').textContent = 'favorite';
    showToast('Zu Favoriten hinzugefügt! ❤️', 'favorite');
    // Lernsignal: Favorit ist ein starkes Interesse (lokal)
    try {
      var _fl = getHeroListings().find(function(l) { return l && l.id === listingId; });
      if (_fl) _ebTasteSignal('fav', { category: _fl.category, location: _fl.location });
    } catch (e) {}
  }
  if (btn) btn.setAttribute('aria-pressed', btn.classList.contains('liked') ? 'true' : 'false');
  _saveFavoritesToStorage();
  // Sync with API if logged in (only for real DB listings)
  if (isLoggedIn) {
    var listing = LISTINGS.find(function(l) { return l.id === listingId; });
    if (listing && listing._fromDb) {
      var dbId = listing._dbId || (listingId - 10000);
      fetch(_apiUrl('favorites/' + dbId), {
        method: 'POST', credentials: 'same-origin', headers: _apiHeaders()
      }).catch(function(){});
    }
  }
  // If on favorites page, re-render the grid immediately
  var favPage = document.getElementById('page-favorites');
  if (favPage && favPage.classList.contains('active')) {
    var grid = document.getElementById('favoritesGrid');
    var emptyState = document.getElementById('favoritesEmpty');
    var favListings = LISTINGS.filter(function(l) { return favorites.has(l.id); });
    if (favListings.length === 0) {
      grid.style.display = 'none';
      emptyState.style.display = 'flex';
    } else {
      grid.style.display = '';
      emptyState.style.display = 'none';
      grid.innerHTML = favListings.map(renderListingCard).join('');
      _initGridCards(grid);
    }
  }
}

function renderFavorites() {
  const grid = document.getElementById('favoritesGrid');
  const emptyState = document.getElementById('favoritesEmpty');

  function doRender() {
    const favListings = LISTINGS.filter(l => favorites.has(l.id));
    if (favListings.length === 0) {
      grid.style.display = 'none';
      emptyState.style.display = 'flex';
    } else {
      grid.style.display = '';
      emptyState.style.display = 'none';
      grid.innerHTML = favListings.map(renderListingCard).join('');
      _initGridCards(grid);
    }
  }

  if (!_dbListingsLoaded) {
    loadDbListings().then(function() {
      return _favoritesLoaded ? Promise.resolve() : loadFavorites();
    }).then(doRender).catch(doRender);
  } else if (isLoggedIn && !_favoritesLoaded) {
    loadFavorites().then(doRender).catch(doRender);
  } else {
    doRender();
  }
}
