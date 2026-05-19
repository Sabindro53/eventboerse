/* ux-improvements.js — KI-Worker duerfen diese Datei schreiben.
   Laedt NACH app.js, ergaenzt UX ohne bestehenden Code zu aendern. */

(function() {
  'use strict';

  /* ===== LAZY IMAGE FADE-IN ===== */
  function markLoadedImages() {
    document.querySelectorAll('img[loading="lazy"]:not(.loaded)').forEach(function(img) {
      if (img.complete && img.naturalWidth > 0) {
        img.classList.add('loaded');
      } else if (!img.dataset.ebBound) {
        img.dataset.ebBound = '1';
        img.addEventListener('load', function() { img.classList.add('loaded'); }, { once: true });
        img.addEventListener('error', function() { img.classList.add('loaded'); }, { once: true });
      }
    });
  }

  function initLazyImageFadeIn() {
    var observer = new MutationObserver(function() { markLoadedImages(); });
    observer.observe(document.body, { childList: true, subtree: true });
    markLoadedImages();
    setInterval(markLoadedImages, 1000);
  }

  /* ===== SCROLL-TO-TOP BUTTON ===== */
  function initScrollToTop() {
    var btn = document.createElement('button');
    btn.className = 'eb-scroll-top';
    btn.setAttribute('aria-label', 'Nach oben scrollen');
    btn.innerHTML = '<span class="material-icons-round" style="font-size:24px">keyboard_arrow_up</span>';
    btn.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9000;width:48px;height:48px;border-radius:50%;border:none;background:var(--brand-primary,#FF385C);color:#fff;cursor:pointer;opacity:0;pointer-events:none;transition:opacity .3s,transform .3s;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.2)';
    document.body.appendChild(btn);

    var visible = false;
    window.addEventListener('scroll', function() {
      var show = window.scrollY > 400;
      if (show !== visible) {
        visible = show;
        btn.style.opacity = show ? '1' : '0';
        btn.style.pointerEvents = show ? 'auto' : 'none';
        btn.style.transform = show ? 'scale(1)' : 'scale(0.8)';
      }
    }, { passive: true });

    btn.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ===== KEYBOARD NAVIGATION HINTS ===== */
  function initKeyboardNav() {
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        var modal = document.querySelector('.modal-backdrop:not([style*="display: none"]):not([style*="display:none"])');
        if (modal && typeof window.closeModal === 'function') {
          window.closeModal();
        }
      }
    });
  }

  /* ===== REDUCED MOTION RESPECT ===== */
  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* ===== INIT ===== */
  function init() {
    initLazyImageFadeIn();
    if (!prefersReducedMotion()) {
      initScrollToTop();
    }
    initKeyboardNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
