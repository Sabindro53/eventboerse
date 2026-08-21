---
tags: [layer/L4, domain/governance, share/internal]
layer: L4
domain: governance
share: internal
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
| **OpenStreetMap Foundation** | Karten-Tiles | IP-Adresse beim Tile-Abruf | UK / EU | Angemessenheit (UK), EU-intern | nicht erforderlich (kein AV-Verhältnis) |

**Seit dem 21.08.2026 gestrichen, weil selbst gehostet:** Google (Schriften und
Symbole), unpkg/Cloudflare (Leaflet), jsDelivr (Flatpickr). Alle drei Dateien
liegen im Theme; beim Seitenaufruf entsteht keine Verbindung mehr zu ihnen.

### Nur im HQ — keine Besucherdaten

Diese drei berühren **ausschließlich** angemeldete Betreiber und Mitarbeiter im HQ.
Ein Besucher der Website löst hier nie einen Aufruf aus (belegt unten).

| Anbieter | Zweck | Datenkategorien | Standort | Mechanismus | AVV |
|---|---|---|---|---|---|
| **OpenAI, L.L.C.** | Sprachausgabe des HQ (`gpt-4o-mini-tts`) | Antworttext des HQ (Betriebsdaten, keine Kundendaten) | US | SCC / DPF | **offen — erforderlich** |
| **OpenAI, L.L.C.** | Spracherkennung des HQ (Whisper) | **Sprachaufnahme** des Sprechers | US | SCC / DPF | **offen — erforderlich** |
| **OpenRouter, Inc.** | Gespräch des HQ-Circle, Modell-Ensemble | Frage des Mitarbeiters + Betriebskontext (Commits, Journal, Selbstcheck) | US | SCC | **offen — erforderlich** |

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

### OpenAI (US) — Stimme und Gehör des HQ

Seit dem 21.08.2026 spricht und hört das HQ serverseitig über OpenAI. Beides ist
**Opt-in**: ohne `EB_OPENAI_API_KEY` findet keine Übermittlung statt, und die
Oberfläche fällt hörbar auf die Stimmen des Browsers zurück.

**Was übermittelt wird:**

- **Ausgabe** (`/hq/stimme`): der Antworttext des HQ, auf 1200 Zeichen begrenzt.
  Das sind Betriebsdaten — Lagebericht, Journal, Kennzahlen. Kundendaten der
  Plattform gehören nicht hinein und kommen dort auch nicht vor.
- **Eingabe** (`/hq/gehoer`): die **Sprachaufnahme** der sprechenden Person,
  höchstens 4 MB. Eine Stimmaufnahme ist ein personenbezogenes Datum; sie lässt
  Rückschlüsse auf die Person zu, auch wenn kein Name fällt.

**Was nicht passiert:** Der Ton wird zu keinem Zeitpunkt auf eine Platte
geschrieben — weder als Datei noch im Upload-Verzeichnis. Er existiert im
Arbeitsspeicher für die Dauer des Aufrufs. Der API-Schlüssel erreicht den
Browser nie.

**Betroffene:** ausschließlich der Betreiber und Mitarbeiter mit `eb_hq_access`.
Derzeit zwei Personen.

**Offen:** Der AVV mit OpenAI ist **nicht abgeschlossen**. Er gehört vor die
weitere Nutzung — nach Anbieterangabe werden API-Daten nicht zum Training
verwendet und nur befristet zur Missbrauchserkennung vorgehalten, aber eine
Anbieterangabe ersetzt keinen Vertrag nach Art. 28.

### OpenRouter (US) — Gespräch und Modell-Ensemble

Das HQ-Gespräch (`/hq/circle`) und die Schichten der KI-Mitarbeiter laufen über
OpenRouter. Übermittelt werden die Frage des Mitarbeiters und ein
Betriebskontext aus Commits, Arbeitsjournal und Selbstcheck.

**Betroffene:** dieselben zwei Personen. Auch hier ist der **AVV offen**.

### Warum Besucher davon nicht betroffen sind — gemessen, nicht behauptet

Der QA-Bot und der Board-Assistent der Website beantworten Fragen **lokal** aus
`assets/eb-knowledge.json`, die vom eigenen Server geladen wird
(`fetch(url, { credentials: 'same-origin' })` in `js/modules/ui/31-modals-toast-qabot.js`).
Es gibt in den besucherseitigen KI-Modulen **keinen** Aufruf an einen
Sprachdienst. Eine Besucherfrage verlässt die Plattform nicht.

Bleibt es dabei, ist das eine bewusste Eigenschaft und keine Zufälligkeit —
sobald ein besucherseitiges Feature ein Modell anspräche, änderte sich die
Rechtslage grundlegend, weil dann Kundendaten an einen US-Dienst gingen.

### Erledigt am 21.08.2026: Schriften und Bibliotheken aus dem eigenen Haus

Google Fonts, unpkg (Leaflet) und jsDelivr (Flatpickr) sind **keine Empfänger
mehr**. Alle Dateien liegen im Theme:

| | |
|---|---|
| `assets/fonts/inter-latin-wght-normal.woff2` | Inter als **variable** Schrift — 48 KB für alle Gewichte statt 168 KB in sieben Dateien |
| `assets/fonts/material-icons-round.woff2` | Material Icons Round |
| `assets/lib/leaflet/` | Leaflet 1.9.4 samt `images/` für die Marker |
| `assets/lib/flatpickr/` | Flatpickr 4.6.13 mit deutscher Lokalisierung |

Drei Wirkungen über den Datenschutz hinaus:

1. **Die CSP wurde enger.** `unpkg.com` und `cdn.jsdelivr.net` sind aus
   `script-src` gestrichen. Solange sie dort standen, durfte ein fremder Host
   beliebiges Skript in die Seite liefern — eine Kompromittierung dort wäre
   eine Kompromittierung hier gewesen.
2. **Die Version steckt in der Datei, nicht in einer URL.** Ein Austausch unter
   derselben Adresse ist ausgeschlossen. Die lokale Entwicklungs-Shell zog
   Flatpickr sogar **ohne Versionsangabe** (`npm/flatpickr`) — also jeweils die
   neueste Fassung.
3. **Die Seite hängt nicht mehr an fremder Erreichbarkeit.** Vorher blieb die
   Karte leer, wenn ein CDN ausfiel oder blockiert war. Konkret messbar: vier
   Radar-Tests schlugen in Umgebungen ohne Netzzugang wochenlang fehl. Seit dem
   Self-Hosting laufen alle 50 durch.

Nachgehalten wird das von `scripts/recht.mjs`: jeder Host, den `wp_enqueue_*`
wirklich einbindet, muss in der Datenschutzerklärung stehen. Stand jetzt ist
`js.stripe.com` der einzige.

## Pflichten

- Jährliche Überprüfung der AVV-Liste
- Bei Änderungen: Datenschutzerklärung (B02) anpassen
- Verzeichnis Art. 30 DSGVO (Dokument C01) konsistent halten
- Datenpannen beim Subdienstleister: 72-h-Frist trotzdem an unsere Aufsichtsbehörde

## Verknüpft

- [[40-Governance/Legal/Compliance-Overview]]
- [[20-System/Architecture/Tech-Stack]]
- [[40-Governance/Legal/Loeschkonzept]]
