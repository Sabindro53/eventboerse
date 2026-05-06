---
tags: [legal, dsgvo, art28, avv]
---

# Auftragsverarbeiter (DSGVO Art. 28)

> Liste aller Subdienstleister mit Datenfluss, AVV-Status, Drittlandtransfer-Mechanismus. Spiegelbild zu Dokument **C06** (Word-Vorlage).

## Prinzipien

- AVV-Vertrag muss **vor** Datenübermittlung unterschrieben sein.
- Drittland-Transfers nur mit Standardvertragsklauseln (SCC 2021) oder Angemessenheitsbeschluss.
- Liste muss in der Datenschutzerklärung (B02) öffentlich gemacht werden.

## Aktive Auftragsverarbeiter

| Anbieter | Zweck | Datenkategorien | Standort | Mechanismus | AVV |
|---|---|---|---|---|---|
| **Hosting-Provider** | Webhosting, DB, SMTP-Versand | alle Plattform-Daten | EU (DE) | EU-intern, kein Drittland | ✓ |
| **Stripe Payments Europe Ltd.** | Zahlungsabwicklung | Name, E-Mail, Beträge, Karten-Token | IE / US (Stripe Inc.) | SCC + ergänzende Maßnahmen | ✓ |
| **GitHub Inc.** | Quellcode-Hosting, CI | Quellcode (keine Plattform-User-Daten), Workflow-Logs | US | SCC | ✓ |
| **Google LLC (Fonts)** | Webfonts (geplant: self-host) | IP-Adresse beim Font-Abruf | US | SCC | offen — Roadmap: self-hosting |
| **OpenStreetMap Foundation** | Karten-Tiles | IP-Adresse beim Tile-Abruf | UK / EU | Angemessenheit (UK), EU-intern | nicht erforderlich (kein AV-Verhältnis) |

## Geplante / in Prüfung

| Anbieter | Zweck | Status |
|---|---|---|
| Postmark / Sendgrid | Transaktionsmail-Backup | Evaluation, EU-Region erforderlich |
| Sentry self-hosted | Error-Tracking | Evaluation, on-premise bevorzugt |

## Nicht eingesetzt (aktive Entscheidung)

- **Google Analytics / Tag Manager** — DSGVO-Risiko, kein Bedarf
- **Facebook Pixel** — kein Marketing-Tracking
- **HubSpot / Mailchimp** — kein CRM extern
- **Cloudflare** — aktuell nicht zwischen User und Origin (siehe Roadmap)

## Drittland-Bewertung

### Stripe (US)
- SCC + ergänzende technische Maßnahmen (TLS, Token statt Klartext-PAN)
- Datenkategorien minimiert: Name, E-Mail, Betrag — keine Adressdaten ohne Notwendigkeit
- Angemessenheitsbeschluss EU-US Data Privacy Framework relevant

### GitHub (US)
- Nur Quellcode + Workflow-Logs — **keine** Plattform-User-Daten
- Secrets verschlüsselt at-rest in GitHub Actions
- SCC abgeschlossen via GitHub Customer DPA

### Google Fonts (US)
- IP-Übertragung beim Font-Abruf
- **Mitigation auf Roadmap**: Self-Hosting der drei Schriften (`Inter`, `Plus Jakarta Sans`) im Theme
- Bis dahin in Datenschutzerklärung explizit ausgewiesen

## Pflichten

- Jährliche Überprüfung der AVV-Liste
- Bei Änderungen: Datenschutzerklärung (B02) anpassen
- Verzeichnis Art. 30 DSGVO (Dokument C01) konsistent halten
- Datenpannen beim Subdienstleister: 72-h-Frist trotzdem an unsere Aufsichtsbehörde

## Verknüpft

- [[Legal/Compliance-Overview]]
- [[Architecture/Tech-Stack]]
- [[Legal/Loeschkonzept]]
