# Roadmap: Aktueller Sprint

> Ziel: Die beste und funktionalste Eventplattform für jedermann

## In Arbeit

- [ ] Obsidian-Vault Einrichtung ✓ (gerade fertiggestellt)
- [ ] Claude Memory System aufbauen ✓

## Nächste Prioritäten

### P0 - Kritisch
- [ ] **Demo-Daten ersetzen** - LISTINGS/REVIEWS/CHATS Arrays durch echte DB-Abfragen ersetzen
  - Betrifft: app.js (Zeile ~100-500 ca.)
  - Backend: GET /listings schon vorhanden, aber wird es genutzt?

### P1 - Wichtig
- [ ] **Echtzeit-Nachrichten** - Polling durch WebSockets/SSE ersetzen
- [ ] **Suchfunktion verbessern** - Echte DB-Volltextsuche (MySQL FULLTEXT)
- [ ] **Review-System** - Bewertungen werden nach Buchungsabschluss angezeigt
- [ ] **Mobile Optimierung** - Responsive Design verbessern

### P2 - Nice-to-Have
- [ ] **PWA / App-Installation** - Service Worker + manifest.json
- [ ] **Push-Benachrichtigungen** - Neue Nachrichten als Browser-Push
- [ ] **Analytics** - Wer schaut welche Listings an
- [ ] **SEO** - Server-Side-Rendering oder Pre-rendering für Google

## Bekannte Bugs

Werden hier dokumentiert wenn sie gemeldet werden.

## Fertiggestellt

- [x] Stripe Zahlungsintegration
- [x] WebAuthn/Passkeys Authentifizierung
- [x] 2FA mit OTP
- [x] **Event-Planungs-Board (Herzstück)**
  - [x] Multi-Projekt-Management + Vorlagen (Hochzeit, Firmenfeier, ...)
  - [x] Auto-Befüllung mit Kategorie-Karten bei Projekterstellung
  - [x] Kanban / Flow / Zeitplan / Checkliste-Ansichten
  - [x] Gästeanzahl & Countdown auf Projektkarten
  - [x] „Zum Board hinzufügen“-Button auf Detail-Seiten
  - [x] Cloud-Sync (geräteübergreifend, Tombstone-Merge)
  - [x] Dienstleister-Aufträge-Ansicht
- [x] Uptime-Monitoring (GitHub Actions alle 30 Min)
- [x] Automatisches Deployment auf den Hosting-Provider
- [x] Obsidian Vault + Claude Memory System

---
*Zuletzt aktualisiert: 2026-04-29*

## Verknüpfte Notizen
- [[Roadmap/Feature-Ideen]] — Ideen-Sammlung
- [[Roadmap/Bekannte-Bugs]] — Offene Bugs
- [[AI-Gedaechtnis/Claude-Kontext]] — Prioritätsliste P0/P1
