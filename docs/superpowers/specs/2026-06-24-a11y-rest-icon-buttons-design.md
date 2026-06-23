# Design: A11y Rest — verbleibende icon-only Buttons (#13 Rest)

**Datum:** 2026-06-24 · **Katalog-Bezug:** #13 (A11y, Rest außerhalb der Kern-Flows) · **Status:** Freigegeben (Mapping abgenommen)

## Problem

Nach dem priorisierten #13-Pass bleiben **55 icon-only Buttons ohne `aria-label`**
(app-shell.html 29, app.js 26) — die ohne `title` außerhalb der damaligen Kern-Flows. Screenreader
kündigen sie nur als „Schaltfläche" an.

## Ziel

Alle 55 bekommen ein aussagekräftiges `aria-label`. Rein mechanisches Label-Setzen — **kein**
visuelles/funktionales Verhalten ändert sich, strukturell verifizierbar (Bundle gegen-greppen),
kein Login nötig.

## Mapping

### Dominanter Fall: `.modal-close` → „Schließen"

Alle `<button class="modal-close" …>` (≈29, app-shell + app.js) bekommen `aria-label="Schließen"`.
Mechanisch via Skript: in jedes `class="modal-close"`-Button-Tag ohne `aria-label` einfügen.

### Spezifische Labels

| Button (Klasse/onclick/data) | Quelle | `aria-label` |
|------------------------------|--------|--------------|
| `.settings-pw-toggle`, `.password-toggle` | app-shell | „Passwort anzeigen" |
| `.dur-down` (id durDown) | app-shell | „Verringern" |
| `.dur-up` (id durUp) | app-shell | „Erhöhen" |
| `.listing-live-preview-arrow prev` (`livePreviewNav(-1)`) | app-shell | „Vorheriges Bild" |
| `.listing-live-preview-arrow next` (`livePreviewNav(1)`) | app-shell | „Nächstes Bild" |
| `#aiLiveFeedback` | app-shell | „Zu den Ergebnissen" |
| `commWarning`-Schließen (`commWarning…display='none'`) | app-shell | „Hinweis schließen" |
| `data-act="pin"` | app.js | „Anpinnen" |
| `data-act="mute"` | app.js | „Stummschalten" |
| `data-act="archive"` | app.js | „Archivieren" |
| `data-act="block"` (`.chat-menu-danger`) | app.js | „Blockieren" |
| Filter-Clear (`…value=''; filterListings()`) | app.js | „Eingabe löschen" |
| `.pec-delete` (`_deleteEventConnection`) | app.js | „Verknüpfung entfernen" |
| `navigateTo('detail', card.listingId)` | app.js | „Details ansehen" |
| `editBoardCard(...)` | app.js | „Karte bearbeiten" |
| `.kc-del` / `deleteBoardCard(...)` | app.js | „Karte löschen" |
| `.cal-nav` (`_postCalNav(event,-1)`) | app.js | „Voriger Monat" |
| `.cal-nav` (`_postCalNav(event,1)`) | app.js | „Nächster Monat" |
| `.post-img-remove` (`_removePostImage`) | app.js | „Bild entfernen" |
| `.sa-submit` (id saSubmitBtn) | app.js | „Absenden" |
| `.btn-primary` (`_copyFlowShareUrl`) | app.js | „Link kopieren" |

## Nicht-Ziele

- Buttons mit sichtbarem Text (brauchen kein aria-label).
- Tieferer A11y-Audit (Fokus-Traps, aria-live) — separat.

## Architektur

Body-Buttons in `app-shell.html` (Single-Source #7) editieren → danach `./build-index-html.sh`.
Dynamische Buttons in `app.js`. `.modal-close` mechanisch per Skript (idempotent: nur ohne
vorhandenes `aria-label`), spezifische Labels per gezielter Edits.

## Verifikation

1. `~/node-v22/bin/node --check app.js`; `app-shell.html` rebuild → `index.html`.
2. Re-Scan: icon-only Buttons ohne aria-label → **0** (bzw. nur noch bewusst ausgelassene).
3. Keine doppelten `aria-label` pro Button.
4. Nach Deploy: `aria-label="Schließen"` im ausgelieferten HTML/Bundle vorhanden.

## Offene Punkte

Keine — Mapping vollständig festgelegt.
