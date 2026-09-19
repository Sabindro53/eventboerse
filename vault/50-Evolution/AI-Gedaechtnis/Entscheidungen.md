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

**Konsequenz:** `app.js` ist eine ~30.700-Zeilen-Datei. **Kein Monolith mehr** — sie wird seit 2026-08 aus **31 Modulen** unter `js/modules/**` verkettet (`./build-app-js.sh`, Reihenfolge in `modules.list`). Reines `cat`, kein Bundler: die Leitplanke „kein Build-Schritt" bleibt gewahrt, die Quelle ist trotzdem geteilt. Wer `app.js` von Hand editiert, verliert die Änderung beim nächsten Bau — CI bricht bei Drift ab.

## WordPress als API-Backend

**Entscheidung:** WordPress nicht als CMS nutzen, sondern als Headless API.

**Warum:** WordPress liefert gratis: User-System, Auth, Datenbank, SMTP, Media-Upload, Hosting-Kompatibilität. Kein eigenes Backend aufbauen nötig.

**Konsequenz:** `index.php` rendert die gleiche SPA wie `index.html`, aber mit WordPress-Kontext und eingeloggtem User.

## Shared Hosting + SFTP statt Vercel/Netlify

**Entscheidung:** Klassisches Shared WordPress-Hosting statt moderner Cloud-Plattform.

**Warum:** Günstiger (bereits vorhanden), WordPress läuft dort nativ, kein DevOps-Aufwand.

**Konsequenz:** Kein Serverless, kein Edge-Computing, kein CDN für dynamische Inhalte.

## Polling statt WebSockets

**Entscheidung:** Messaging nutzt Polling statt WebSockets.

**Warum:** Shared Hosting erlaubt keine persistenten Verbindungen (WebSockets erfordern eigenen Server-Prozess). Auf dem kleinen PHP-Pool von IONOS wäre echtes SSE sogar die **schlechtere** Wahl — eine offene Verbindung belegt einen Worker dauerhaft, und genau daran hing die Website am 22.08.2026.

**Konsequenz:** Latenz statt Echtzeit. **Nicht „alle 3 Sekunden"** — hier stand das bis zum 15.09.2026 und war seit Monaten falsch: der Takt beginnt bei 5 s, fällt ohne neue Nachricht um Faktor 1,6 bis auf 20 s zurück und pausiert bei verstecktem Tab ganz. Eine Notiz, die eine behobene Schwäche konserviert, kostet mehr als keine — wer sie liest, sucht ein Problem, das es nicht mehr gibt.

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
