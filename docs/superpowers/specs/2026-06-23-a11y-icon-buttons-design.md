# Design: Accessibility — aria-labels für icon-only Buttons (#13)

**Datum:** 2026-06-23 · **Katalog-Bezug:** #13 · **Status:** Entwurf zur Freigabe

## Problem

Icon-only Buttons (nur ein `material-icons`-Glyph, kein sichtbarer Text) ohne `aria-label`
werden von Screenreadern entweder gar nicht oder nur als „Schaltfläche" angekündigt. Aktueller
Stand: ~**108 icon-only Buttons ohne `aria-label`** über `app-shell.html` (Body-Quelle) und
`app.js` (dynamische Templates). Der Katalog nennt explizit **Favoriten-Herz** und
**Galerie-Pfeile**. `title` ist teils vorhanden, wird von Screenreadern aber unzuverlässig
vorgelesen — `aria-label` ist der korrekte Mechanismus.

(`<img>`-Elemente haben bereits durchgehend `alt` — kein Handlungsbedarf.)

## Ziel

Die **wichtigsten Flows** sind für Screenreader bedienbar: jeder icon-only Button in diesen
Flows hat ein aussagekräftiges `aria-label`; Toggle-Buttons (Favorit) zusätzlich `aria-pressed`.

## Scope (priorisiert)

### Regel A — Buttons mit `title` (mechanisch, sicher)

Jeder icon-only Button mit `title="X"` bekommt zusätzlich `aria-label="X"`. Distinct-Titel
(29), gelten in `app-shell.html` und `app.js`:

`Alle Fotos`, `An Bildschirm anpassen`, `Anhang`, `Ansicht zurücksetzen`, `Auswahl löschen`,
`Bearbeiten`, `Bewertung löschen`, `Cover ändern`, `Dienstleister hinzufügen`, `Entfernen`,
`Foto ändern`, `Galerie bearbeiten`, `Links bearbeiten`, `Löschen`, `Mehr Optionen`,
`Nachrichten`, `Name bearbeiten`, `Preisverhandlung`, `Projekt bearbeiten`,
`Rückgängig (Ctrl+Z)`, `Services bearbeiten`, `Sichtbereich anpassen`, `Slogan bearbeiten`,
`Struktur neu anordnen`, `Teilen`, `Vergrößern (Ctrl + +)`, `Verkleinern (Ctrl + -)`,
`Wiederherstellen (Ctrl+Y)`, `Zuschneiden`.

### Regel B — Kern-Flow-Buttons ohne `title` (explizite Labels)

| Button (Klasse/Kontext) | Quelle | `aria-label` |
|--------------------------|--------|--------------|
| `nav-search-btn` (performNavSearch) | app-shell | „Suchen" |
| `nav-ai-close` (closeNavAiSearch) | app-shell | „Suche schließen" |
| `map-close-btn` (closeMapOverlay) | app-shell | „Karte schließen" |
| `gridViewBtn` (setView grid) | app-shell | „Rasteransicht" |
| `listViewBtn` (setView list) | app-shell | „Listenansicht" |
| `provider-back-btn` (history.back) | app-shell | „Zurück" |
| `plb-close` (alle Lightboxen: provider/cover/gallery) | app-shell | „Galerie schließen" |
| `plb-nav plb-prev` | app-shell | „Vorheriges Bild" |
| `plb-nav plb-next` | app-shell | „Nächstes Bild" |
| `chat-back-btn` (closeChatView) | app-shell | „Zurück zu den Chats" |
| `chat-send-btn` (sendMessage) | app-shell | „Nachricht senden" |
| `grid-gallery-arrow prev` | app.js | „Vorheriges Bild" |
| `grid-gallery-arrow next` | app.js | „Nächstes Bild" |
| `detail-gallery-arrow prev` | app.js | „Vorheriges Bild" |
| `detail-gallery-arrow next` | app.js | „Nächstes Bild" |
| `feed-card-action` (navigateTo detail) | app.js | „Details ansehen" |

### Regel C — Favoriten-Toggle (Zustand)

`listing-fav` und `feed-card-action`-Favoriten-Buttons (`toggleFavorite` / `toggleFeedFav`):
- Initial `aria-label="Zu Favoriten hinzufügen"` und `aria-pressed="false"` (bzw. `true`,
  wenn schon favorisiert — die Templates kennen `isFav`).
- In `toggleFavorite` / `toggleFeedFav` beim Umschalten `aria-pressed` auf den neuen Zustand
  setzen (`el.setAttribute('aria-pressed', ...)`).

## Nicht-Ziele

- Buttons mit sichtbarem Text (brauchen kein aria-label).
- Vollständiger A11y-Audit (Fokus-Management in Modals, Tastatur-Traps, aria-live für
  dynamische Listen) — separater, größerer Punkt.
- Buttons außerhalb der genannten Flows ohne `title` (z.B. einzelne Board-/Admin-Buttons) —
  nicht in diesem priorisierten Pass.

## Architektur / Datenfluss

Reine Markup-Anreicherung. Body-Buttons in **`app-shell.html`** editieren (Single-Source aus
#7), danach `./build-index-html.sh`. Dynamische Buttons in **`app.js`**-Templates. `aria-pressed`
für Favoriten zusätzlich in den `toggleFavorite`/`toggleFeedFav`-Handlern.

## Edge Cases

- Doppelte Lightbox-`plb-close` (provider/cover/gallery) — alle bekommen „Galerie schließen".
- Favoriten-Button erscheint mehrfach (Karte, Feed) — beide Templates abdecken.
- `title` bleibt erhalten (Tooltip für Maus-Nutzer); `aria-label` kommt zusätzlich dazu.

## Verifikation

Kein Test-Harness. Stattdessen:

1. `~/node-v22/bin/node --check app.js`; `app-shell.html` rebuild → `index.html`.
2. Re-Scan: Anzahl icon-only Buttons OHNE aria-label muss deutlich sinken (Ziel: alle aus
   Regel A/B/C = 0 verbleibend in diesen Flows).
3. Kein doppeltes `aria-label` pro Button; Markup valide (Button-Anzahl unverändert).
4. Nach Deploy live: Stichprobe im Browser (Screenreader/DevTools-Accessibility-Tree) auf
   Favoriten-Herz + Galerie-Pfeile.

## Offene Punkte

Keine — Labels in Regel A/B/C festgelegt.
