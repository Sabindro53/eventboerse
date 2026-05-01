# AI-Gedächtnis: Claude Kontext

> Diese Datei ist die **erste Quelle** die Claude Code liest. Sie enthält alles Wichtige über Projekt, Präferenzen und offene Aufgaben.

## Projekt-Essenz

**Eventbörse** ist ein deutscher Marktplatz der Event-Planer mit Dienstleistern (DJs, Catering, Fotografen, Locations etc.) verbindet. Ziel: beste und funktionalste Eventplattform in Deutschland.

→ [[Architecture/Overview]] | [[Backend/API-Endpoints]] | [[CI-CD/Deployment]]

## Nutzer-Präferenzen

- **Sprache:** Deutsch in Konversation, Englisch in Code-Kommentaren
- **Stil:** Direkt umsetzen, nicht zu viel fragen — wenn etwas unklar ist, kurz nachfragen dann sofort handeln
- **Kein Over-Engineering:** Keine Abstraktionen die nicht gebraucht werden, keine Tests für unmögliche Szenarien
- **Vanilla JS bleibt:** Bewusste Entscheidung gegen React/Vue — keine Framework-Migration vorschlagen

## Technische Realität

| Was | Details |
|-----|---------|
| Frontend | `app.js` ~14 700 Zeilen, Vanilla JS SPA |
| Backend | `functions.php` ~4 429 Zeilen, WordPress REST API (67 Endpoints) |
| Styling | `styles.css` ~11 000 Zeilen, mobile-first |
| Hosting | IONOS WordPress Grow, automatisches Deployment via GitHub Actions |
| Auth | Login/Register + 2FA (OTP per E-Mail) + WebAuthn/Passkeys |
| Zahlungen | Stripe (teilweise integriert, in Entwicklung) |

→ [[Frontend/app-js-module]] | [[Features/Authentication]] | [[Features/Payments]]

## Architektur-Stärken (nicht anfassen)

- Einfaches SFTP-Deployment (kein Build-Schritt)
- WordPress als bewährter Auth/DB-Layer
- WebAuthn schon implementiert (selten bei kleinen Projekten)
- Stripe-Grundgerüst vorhanden

## Bekannte Schwächen (Prioritätsliste)

### P0 — Kritisch
- [ ] **Demo-Daten ersetzen** — `LISTINGS`/`REVIEWS`/`CHATS` Arrays in `app.js` (Zeilen ~7–500) durch echte DB-Calls ersetzen. Backend-Endpoint `GET /listings` existiert schon.

### P1 — Wichtig
- [ ] **Echtzeit-Messaging** — aktuell Polling alle 3s, WebSockets/SSE wäre besser
- [ ] **Volltextsuche** — echte MySQL FULLTEXT statt client-seitiger Filterung
- [ ] **Review-System** — Bewertungen nach Buchungsabschluss anzeigen
- [ ] **Stripe vollständig** — Checkout + Webhook + Reconciliation fertigstellen

→ [[Features/Messaging]] | [[Features/Payments]] | [[Roadmap/Current-Sprint]]

### P2 — Nice-to-Have
- [ ] PWA + Service Worker (Push-Benachrichtigungen, App-Installation)
- [ ] SEO-Pre-rendering (aktuell reines SPA, schlecht für Google)
- [ ] Analytics-Dashboard

## Code-Beziehungs-Map

```
app.js ──liest──→ /wp-json/eventboerse/v1/* (functions.php)
       ──nutzt──→ Stripe.js (Zahlungen)
       ──nutzt──→ Leaflet.js (Karten)
       ──ruft──→ DiceBear API (Avatare)
       ──ruft──→ _apiUrl() → _apiHeaders() (Nonce-Auth)

functions.php ──nutzt──→ WordPress User Meta (DB)
              ──sendet──→ SMTP E-Mail (IONOS)
              ──ruft──→ Stripe API (PHP SDK)
              ──inkludiert──→ webauthn.php (Passkeys)
```

→ [[AI-Gedaechtnis/Code-Beziehungen]]

## SPA-Router Cheatsheet

```javascript
navigateTo('home')          // Startseite
navigateTo('browse')        // Listings-Übersicht
navigateTo('detail', id)    // Listing-Detail
navigateTo('chat', userId)  // Chat öffnen
navigateTo('board')         // Event-Planer Board
navigateTo('profile')       // Eigenes Profil
navigateTo('settings')      // Einstellungen
navigateTo('admin')         // Admin-Panel
```

## Wichtige app.js Sektionen

| Zeile | Inhalt |
|-------|--------|
| ~7 | Demo-Daten `LISTINGS` Array (hardcoded) |
| ~453 | Demo-Events Array |
| ~505 | SPA Path Helpers |
| ~539 | Global State (`currentUser`, `currentChat` etc.) |
| ~718 | `navigateTo()` — Haupt-Router |
| ~8631 | `_apiUrl()` / `_apiHeaders()` |
| ~9890 | App-Init / DOMContentLoaded |
| ~10128 | Event-Planer Board |
| ~11601 | Stripe Return Handler |

## Lernpunkte aus vergangenen Gesprächen

*(Claude trägt hier neue Erkenntnisse ein)*

---
*Zuletzt aktualisiert: 2026-04-30*
