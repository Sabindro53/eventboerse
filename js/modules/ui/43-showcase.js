// ========== SHOWCASE (Startseite): How-to-Demo + 3D-Geräte ==========
// Apple-Style-Sektion unten auf der Startseite: auto-abspielende
// How-to-Szenen ("Video"), ein iPhone das sich beim Scrollen von der
// Rückseite nach vorn dreht, und ein MacBook dessen Deckel sich öffnet.
// Performance: Scroll-Berechnung nur wenn die Sektion sichtbar ist
// (IntersectionObserver) und rAF-gedrosselt. prefers-reduced-motion →
// statische Endzustände, Szenen nur per Klick.
function _initEbShowcase() {
  var section = document.getElementById('ebShowcase');
  if (!section || section._ebscInit) return;
  section._ebscInit = true;

  var reduceMotion = false;
  try { reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  /* --- A) How-to-Demo: Szenen-Rotation --- */
  var demo = document.getElementById('ebscDemo');
  var scenes = demo ? Array.prototype.slice.call(demo.querySelectorAll('.ebsc-scene')) : [];
  var dots = demo ? Array.prototype.slice.call(demo.querySelectorAll('.ebsc-progress button')) : [];
  var sceneIdx = 0, sceneTimer = null, demoVisible = false;
  var SCENE_MS = 4200;

  function showScene(i) {
    sceneIdx = ((i % scenes.length) + scenes.length) % scenes.length;
    scenes.forEach(function(s, k) { s.classList.toggle('active', k === sceneIdx); });
    dots.forEach(function(d, k) {
      d.classList.toggle('active', k === sceneIdx);
      d.classList.toggle('played', k < sceneIdx);
    });
    // Journey-Band ("DJ gesucht › Inserat erstellen › …") mitführen
    if (demo) demo.querySelectorAll('.ebsc-journey span').forEach(function(sp) {
      var j = parseInt(sp.getAttribute('data-j'), 10);
      sp.classList.toggle('active', j === sceneIdx);
      sp.classList.toggle('done', j < sceneIdx);
    });
  }
  function startDemo() {
    if (sceneTimer || reduceMotion || !scenes.length) return;
    sceneTimer = setInterval(function() {
      if (document.hidden || !demoVisible) return;
      showScene(sceneIdx + 1);
    }, SCENE_MS);
  }
  function stopDemo() {
    if (sceneTimer) { clearInterval(sceneTimer); sceneTimer = null; }
  }
  dots.forEach(function(d) {
    d.addEventListener('click', function() {
      showScene(parseInt(d.getAttribute('data-goto'), 10) || 0);
      // Timer neu starten, damit die gewählte Szene volle Zeit bekommt
      stopDemo(); startDemo();
    });
  });
  if (demo && 'IntersectionObserver' in window) {
    new IntersectionObserver(function(entries) {
      demoVisible = entries[0].isIntersecting;
      if (demoVisible) startDemo(); else stopDemo();
    }, { threshold: 0.25 }).observe(demo);
  } else { demoVisible = true; startDemo(); }

  /* --- B/C) Scroll-getriebene 3D-Geräte ---
   * Butterweich auf allen Geräten: statt Scroll-Events + CSS-Transitions
   * (die auf iOS/Touch ruckeln, weil Events sporadisch kommen und jede
   * Transition neu startet) läuft ein durchgehender rAF-Loop, solange die
   * Geräte im Viewport sind. Pro Frame wird der Ziel-Wert aus der
   * Scroll-Position gelesen und der Ist-Wert per Lerp geglättet — das
   * ergibt auch bei Momentum-Scroll (Safari) eine flüssige Drehung.
   * Wichtig: Es wird NIE geschrieben, solange die Section display:none
   * ist (rect.height 0) — sonst friert ein falscher Endzustand ein. */
  var phone = document.getElementById('ebPhone3d');
  var mac = document.getElementById('ebMac3d');
  var fxActive = false, fxRaf = null;
  // Ist-Werte; Startwerte = CSS-Defaults (Rückseite, Deckel zu)
  var fxCur = { ry: 180, rot: 180, lid: -92, fl: 0 };

  // Fortschritt 0→1, während das Element durch den Viewport wandert.
  function scrollProgress(el) {
    var r = el.getBoundingClientRect();
    var vh = window.innerHeight || 800;
    var p = (vh - r.top) / (vh * 0.75 + r.height * 0.5);
    return Math.max(0, Math.min(1, p));
  }
  function fxLerp(key, target) {
    var d = target - fxCur[key];
    fxCur[key] = Math.abs(d) < 0.04 ? target : fxCur[key] + d * 0.16;
  }
  function fxFrame() {
    fxRaf = null;
    if (phone && phone.getBoundingClientRect().height > 0) {
      // 180° (Rückseite) → 0° (Front), mit sanftem Ease-out
      var p = scrollProgress(phone);
      var eased = 1 - Math.pow(1 - p, 2);
      fxLerp('ry', 180 - eased * 180);
      phone.style.setProperty('--eb-ry', fxCur.ry.toFixed(2) + 'deg');
    }
    if (mac && mac.getBoundingClientRect().height > 0) {
      // Phase 1 (0→0.55): dreht von der Rückseite (rotateY 180°→0°),
      //   Deckel bleibt fast zu — man sieht erst das Logo hinten.
      // Phase 2 (ab 0.4): Deckel klappt drehend auf (-92°→-8°),
      //   dazu sanftes Schweben (Sinus, max ~10px).
      var m = scrollProgress(mac);
      var lidP = Math.max(0, (m - 0.4) / 0.6);
      fxLerp('rot', 180 * (1 - Math.min(1, m / 0.55)));
      fxLerp('lid', -92 + (1 - Math.pow(1 - lidP, 2)) * 84);
      fxLerp('fl', -Math.sin(Math.min(1, m) * Math.PI) * 10);
      mac.style.setProperty('--eb-mrot', fxCur.rot.toFixed(2) + 'deg');
      mac.style.setProperty('--eb-lid', fxCur.lid.toFixed(2) + 'deg');
      mac.style.setProperty('--eb-float', fxCur.fl.toFixed(2) + 'px');
    }
    if (fxActive) fxRaf = requestAnimationFrame(fxFrame);
  }
  function fxStart() {
    if (fxRaf === null) fxRaf = requestAnimationFrame(fxFrame);
  }
  function fxStop() {
    if (fxRaf !== null) { cancelAnimationFrame(fxRaf); fxRaf = null; }
  }

  if (reduceMotion) {
    // Statische Endzustände, keine Scroll-Kopplung
    if (phone) phone.style.setProperty('--eb-ry', '0deg');
    if (mac) { mac.style.setProperty('--eb-lid', '-8deg'); mac.style.setProperty('--eb-mrot', '0deg'); mac.style.setProperty('--eb-float', '0px'); }
    showScene(0);
    return;
  }

  if ('IntersectionObserver' in window && (phone || mac)) {
    var fxVisible = {};
    var fxIo = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) { fxVisible[e.target.id] = e.isIntersecting; });
      fxActive = Object.keys(fxVisible).some(function(k) { return fxVisible[k]; });
      if (fxActive) fxStart(); else fxStop();
    }, { rootMargin: '30% 0px 30% 0px' });
    if (phone) fxIo.observe(phone);
    if (mac) fxIo.observe(mac);
  } else {
    // Fallback ohne IO: Endzustände setzen
    if (phone) phone.style.setProperty('--eb-ry', '0deg');
    if (mac) { mac.style.setProperty('--eb-lid', '-8deg'); mac.style.setProperty('--eb-mrot', '0deg'); mac.style.setProperty('--eb-float', '0px'); }
  }
}

document.addEventListener('DOMContentLoaded', function() {
  try { _initEbShowcase(); } catch (e) { /* Showcase optional */ }
});

