# App-Loading-Overlay (Party-Popper)

> Sichtbar bevor `app.js` ausgeführt wurde. Verhindert FOUC (Flash of Unstyled Content) und gibt dem User sofort visuelles Feedback.

## Was es löst

- Auf Shared-Hosting + Cold-Start kann `app.js` (~16 k Zeilen) bei nicht aufgewärmtem PHP-Cache mehrere Sekunden brauchen
- Ohne Overlay sah der User eine weiße Seite → Eindruck „kaputt"
- Die SPA rendert erst, wenn `init_<page>()` durch ist → Brücke nötig

## Markup (`index.html`)

```html
<div id="appLoadingOverlay" aria-hidden="true">
  <div class="app-loading-inner">
    <div class="app-loading-emoji" aria-hidden="true">🎉</div>
    <div class="app-loading-confetti">…</div>
    <div class="app-loading-bar"><span></span></div>
    <p class="app-loading-text">Lade Plattform…</p>
  </div>
</div>
```

Sitzt direkt nach `<body>`, **vor** allen anderen Inhalten. Der Browser zeigt es, bevor irgend ein Skript läuft.

## CSS (`styles.css`)

- `position: fixed; inset: 0; z-index: 99999`
- Branded Gradient als Hintergrund
- 3 Animationen:
  - `appPopperShake` (1.4 s) — wackelnder Party-Popper
  - `appConfetti` (2.2 s) — Konfetti-Bahnen
  - `appLoadingSlide` — Progress-Bar
- `@media (prefers-reduced-motion: reduce)` → Animationen aus, statisch

## Hide-Logik

Globale Funktion in `app.js`:

```js
window.__hideAppLoader = function() {
  var el = document.getElementById('appLoadingOverlay');
  if (!el) return;
  el.classList.add('app-loading-hidden');
  setTimeout(function(){ el.remove(); }, 400);
};
```

Aufgerufen:
1. Nach erstem erfolgreichen `navigateTo()`-Render via `requestAnimationFrame(requestAnimationFrame(__hideAppLoader))`
2. **Failsafe**: nach 8 s wird das Overlay zwangs-entfernt — der User sieht im Notfall die SPA, auch wenn `init_*` gehängt ist

## Accessibility

- `aria-hidden="true"` während sichtbar (Screenreader ignorieren das Visual)
- Hauptinhalt bleibt im DOM, nicht durch `display:none` blockiert
- `prefers-reduced-motion` respektiert

Siehe [[Frontend/app-js-module]].
