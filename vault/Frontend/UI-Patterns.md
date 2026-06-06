# UI-Patterns

Wiederkehrende UI-Bausteine, damit neue Seiten konsistent gebaut werden.

## Sektion-Struktur

```html
<section id="page-X" class="page">
  <div class="page-header">
    <h1>Titel</h1>
    <p class="page-subtitle">Beschreibung</p>
  </div>
  <div class="page-content">
    <!-- Inhalt -->
  </div>
</section>
```

`.page` ist `display:none` per Default, `.page.active` macht sie sichtbar.

## Banner-System

| Banner | Bedingung | Storage-Key |
|---|---|---|
| Beta-Banner | nicht dismissed | `eb_beta_banner_dismissed` |
| Cookie-Consent | kein Consent gespeichert | `eb_cookie_consent` |
| Maintenance-Banner | Server liefert `503` oder Heartbeat-Fail | (kein Storage) |

Alle drei sind sticky am oberen Rand und respektieren die Reihenfolge: Cookie > Maintenance > Beta.

## Modale

Alle Modale teilen sich `.modal-backdrop` + `.modal`. Öffnen via `openModal('#xyz')`, Schließen über ESC, Klick auf Backdrop, oder Close-Button. Body wird `overflow:hidden` solange Modal offen ist.

## Toast-Notifications

```js
showToast('Gespeichert', 'success');  // success | error | info | warning
```

Auto-dismiss nach 3 s, max. 3 gleichzeitig sichtbar.

## QA-Support-Bot

Stand 2026-06-06:

- Markup in `index.php`: `#qaBot`, `#qaPanel`, `#qaLauncher`.
- Styling in `styles.css`: `.eb-qa-*`.
- Logik in `app.js`: regelbasierte `QA_TOPICS`, keine KI-Token.
- Position: rechts über der Bottom-Navigation, auch mobil.
- Launcher: transparentes Roboter/Support-Agent-Icon mit Partyhut, Headset, Mikro. Keine Card, kein Status-Dot, keine UA-Button-Reste.
- Pflichtprüfung nach Änderungen: Panel öffnet, Fokus/Click funktioniert, Cookie-Banner/Bottom-Nav überdecken den Button nicht.

## Skeleton-Loader

Pro Karten-Layout existiert ein zugehöriger Skeleton (`.skeleton-card`, `.skeleton-list-item`). Wird gerendert, solange `await fetchAPI(...)` läuft.

## Empty-States

Konsistentes Pattern: `<div class="empty-state">` mit Icon + Headline + CTA.

## Form-Validierung

Inline-Errors per `.field-error` unterhalb des Inputs. Submit ist disabled solange `<form>` `:invalid`.

## Card-System

| Klasse | Verwendung |
|---|---|
| `.listing-card` | Inserat-Übersicht |
| `.review-card` | Bewertung |
| `.kanban-card` | Board-Card |
| `.tl-card` | Timeline-Card |

Alle Cards: 16 px Radius, Shadow Level 1, Hover Level 2, Click-Region = ganze Card.

## Farb-System

CSS-Variables in `:root`:

```css
--brand-primary: #FF385C;
--text: #222;
--text-light: #717171;
--surface: #fff;
--surface-2: #f7f7f7;
--border: #e5e5e5;
```

Dark-Mode überschreibt diese in `[data-theme="dark"]`.

## Responsive-Breakpoints

| Name | Min-Width |
|---|---|
| `sm` | 480 px |
| `md` | 768 px |
| `lg` | 1024 px |
| `xl` | 1280 px |

Mobile-First: alles default für Mobile, `@media (min-width: …)` ergänzt Desktop-Layout.

## Bildlade-Strategie

- Statische `<img>`: `loading="lazy" decoding="async"`
- Dynamisch eingefügte `<img>`: ein `MutationObserver` in `app.js` setzt diese Attribute automatisch
- Hero-Bilder: `fetchpriority="high"`, kein `loading="lazy"`

Siehe [[Frontend/app-js-module]], [[Frontend/Loading-Overlay]], [[Frontend/Avatar-System]].
