# Architektur-Entscheidungen

> Warum was so gebaut wurde. Hilft zu verstehen was nicht geändert werden soll.

## Vanilla JS statt React/Vue

**Entscheidung:** Kein JavaScript-Framework.

**Warum:** Einfaches Deployment via SFTP ohne Build-Pipeline. Keine `node_modules`, kein Webpack, kein Vite. Jede Änderung sofort live ohne Build-Schritt.

**Konsequenz:** `app.js` ist ein 14.700-Zeilen-Monolith. Das ist bewusst akzeptiert.

## WordPress als API-Backend

**Entscheidung:** WordPress nicht als CMS nutzen, sondern als Headless API.

**Warum:** WordPress liefert gratis: User-System, Auth, Datenbank, SMTP, Media-Upload, Hosting-Kompatibilität (IONOS). Kein eigenes Backend aufbauen nötig.

**Konsequenz:** `index.php` rendert die gleiche SPA wie `index.html`, aber mit WordPress-Kontext und eingeloggtem User.

## IONOS + SFTP statt Vercel/Netlify

**Entscheidung:** Shared Hosting auf IONOS statt moderner Cloud-Plattform.

**Warum:** Günstiger (bereits vorhanden), WordPress läuft dort nativ, kein DevOps-Aufwand.

**Konsequenz:** Kein Serverless, kein Edge-Computing, kein CDN für dynamische Inhalte.

## Polling statt WebSockets

**Entscheidung:** Messaging nutzt Polling (alle 3 Sekunden) statt WebSockets.

**Warum:** Shared Hosting erlaubt keine persistenten Verbindungen (WebSockets erfordern eigenen Server-Prozess).

**Konsequenz:** 3s Latenz bei Nachrichten, höhere Server-Last. WebSockets/SSE ist eine bekannte P1-Aufgabe.

## WebAuthn ohne Composer

**Entscheidung:** Passkey-Implementierung ohne externe PHP-Libraries.

**Warum:** Shared Hosting auf IONOS ohne Shell-Zugriff für Composer.

**Konsequenz:** Eigene CBOR-Decoder und Base64URL-Helpers in `webauthn.php`.

## Verknüpfte Notizen
- [[Architecture/Overview]] — Technischer Überblick
- [[AI-Gedaechtnis/Claude-Kontext]] — Bekannte Schwächen
- [[Roadmap/Current-Sprint]] — Was als nächstes kommt
