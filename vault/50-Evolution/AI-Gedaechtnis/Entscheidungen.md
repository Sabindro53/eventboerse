---
layer: L5
domain: evolution
share: internal
tags: [layer/L5, domain/evolution, share/internal]
---

# Architektur-Entscheidungen

> Warum was so gebaut wurde. Hilft zu verstehen was nicht geändert werden soll.

## Vanilla JS statt React/Vue

**Entscheidung:** Kein JavaScript-Framework.

**Warum:** Einfaches Deployment via SFTP ohne Build-Pipeline. Keine `node_modules`, kein Webpack, kein Vite. Jede Änderung sofort live ohne Build-Schritt.

**Konsequenz:** `app.js` ist ein ~21.000-Zeilen-Monolith. Das ist bewusst akzeptiert.

## WordPress als API-Backend

**Entscheidung:** WordPress nicht als CMS nutzen, sondern als Headless API.

**Warum:** WordPress liefert gratis: User-System, Auth, Datenbank, SMTP, Media-Upload, Hosting-Kompatibilität. Kein eigenes Backend aufbauen nötig.

**Konsequenz:** `index.php` rendert die gleiche SPA wie `index.html`, aber mit WordPress-Kontext und eingeloggtem User.

## Shared Hosting + SFTP statt Vercel/Netlify

**Entscheidung:** Klassisches Shared WordPress-Hosting statt moderner Cloud-Plattform.

**Warum:** Günstiger (bereits vorhanden), WordPress läuft dort nativ, kein DevOps-Aufwand.

**Konsequenz:** Kein Serverless, kein Edge-Computing, kein CDN für dynamische Inhalte.

## Polling statt WebSockets

**Entscheidung:** Messaging nutzt Polling (alle 3 Sekunden) statt WebSockets.

**Warum:** Shared Hosting erlaubt keine persistenten Verbindungen (WebSockets erfordern eigenen Server-Prozess).

**Konsequenz:** 3s Latenz bei Nachrichten, höhere Server-Last. WebSockets/SSE ist eine bekannte P1-Aufgabe.

## WebAuthn ohne Composer

**Entscheidung:** Passkey-Implementierung ohne externe PHP-Libraries.

**Warum:** Shared Hosting ohne Shell-Zugriff für Composer.

**Konsequenz:** Eigene CBOR-Decoder und Base64URL-Helpers in `webauthn.php`.

## Verknüpfte Notizen
- [[20-System/Architecture/Overview]] — Technischer Überblick
- [[50-Evolution/AI-Gedaechtnis/Claude-Kontext]] — Bekannte Schwächen
- [[50-Evolution/AI-Gedaechtnis/Code-Beziehungen]] — Modul-Abhängigkeiten
- [[50-Evolution/AI-Gedaechtnis/Code-Stats]] — Aktuelle Metriken
- [[50-Evolution/Roadmap/Current-Sprint]] — Was als nächstes kommt
