---
layer: L4
domain: governance
share: internal
tags: [layer/L4, domain/governance, share/internal]
---

# Legal & Compliance — Übersicht

> Stand: V11 (Mai 2026), geprüft am 15.08.2026.
>
> **Was hier steht, wird gemessen.** `node scripts/recht.mjs --check` vergleicht die
> Pflichtseiten-Tabelle unten mit den Routen in `functions.php` und die Cookie-Liste mit
> dem Quelltext. Der PR-Check bricht ab, sobald beides auseinanderläuft. Die gemessene
> Fassung: [[40-Governance/Legal/Rechtliche-Lage]].
>
> Am 15.08.2026 ergab die erste Messung: alle 15 Pflichtseiten haben eine Route, aber die
> Cookie-Liste beschrieb 11 Schlüssel, die es nicht gab, und übersah 23, die gesetzt
> werden. Der Satz „alle Pflichtseiten sind verfügbar" stimmte — er stand nur neben
> Angaben, die niemand nachgerechnet hatte.

## Geltende Rechtsrahmen

| Rahmen | Was es regelt |
|---|---|
| **DSGVO** (VO EU 2016/679) | Personenbezogene Daten allgemein |
| **TDDDG / DDG** (§§ 5, 7–10, 25) | Telemedien, Cookies, Anbieterkennzeichnung |
| **DSA** (VO EU 2022/2065) | Hosting-Plattformen, Notice-and-Action, Transparenz |
| **P2B** (VO EU 2019/1150) | Verhältnis Plattform ↔ gewerbliche Nutzer |
| **BFSG / BFSGV** | Barrierefreiheit ab Mitte 2025 |
| **VSBG § 36** | Hinweis auf Verbraucherschlichtungsstelle |
| **UWG § 5b** | Wettbewerbsrecht, Preisangaben |
| **BGB § 312g, § 356** | Widerrufsrecht im Fernabsatz |
| **MStV § 18** | Medienstaatsvertrag (für Inhalte mit Reichweite) |
| **GmbHG / AktG** | Pflichten der Rechtsform (UG i. G.) |

## Pflichtseiten (Slugs in `index.html` + REWRITE in `functions.php`)

| Slug | Inhalt | Rechtliche Basis |
|---|---|---|
| `/agb` | AGB B2C (Verbraucher) | BGB |
| `/agb-b2b` | AGB B2B (Unternehmer) | HGB, BGB |
| `/agb-dienstleister` | Dienstleister-Bedingungen | P2B |
| `/datenschutz` | Datenschutzerklärung | DSGVO Art. 13/14 |
| `/impressum` | Anbieterkennzeichnung | DDG § 5, MStV § 18 |
| `/cookies` | Cookie-Richtlinie | TDDDG § 25 |
| `/widerruf` | Widerrufsbelehrung | BGB § 356 |
| `/marktplatz` | Marktplatz-Regeln | DSA Art. 14 |
| `/community` | Community-Richtlinien | DSA |
| `/bewertungen` | Bewertungsregeln | UWG, DSA |
| `/upload` | Upload-Regeln | UrhG, DSA |
| `/dsa` | DSA-Beschwerdemechanismus | DSA Art. 16, 20 |
| `/p2b` | P2B-Informationsblatt | P2B Art. 3, 8, 9 |
| `/barrierefreiheit` | Erklärung zur Barrierefreiheit | BFSGV |
| `/vsbg` | Verbraucherschlichtung | VSBG § 36 |

## Dynamische Compliance-Bausteine

### Cookie-Consent
- localStorage-Key `eb_cookie_consent`
- Default = nichts gesetzt → Consent-Banner zeigen
- Granular: technisch-notwendig (immer), Analytics (opt-in), Marketing (opt-in)
- Consent-Reset via Footer-Link „Cookie-Einstellungen"

### Beta-Banner
- localStorage-Key `eb_beta_banner_dismissed`
- Sticky orange Hinweis: „Vorgründungsphase", solange UG nicht eingetragen

### Newsletter-Double-Opt-In
- DSGVO + UWG § 7 Abs. 2 Nr. 3
- E-Mail bestätigen via Token-Link, sonst keine Werbe-Mails

### Datenschutz-Anfragen
- E-Mail: `datenschutz@…` (Platzhalter)
- API-Endpoint geplant: `POST /wp-json/eventboerse/v1/dsgvo/request`
- 30-Tage-Frist nach DSGVO Art. 12

### DSA-Meldungen
- E-Mail: `dsa-meldung@…`
- Rechtsweg-Hinweis bei Inhaltslöschung
- Statistik-Pflicht (anonymisierte Anzahl Meldungen / Jahr)

## Auftragsverarbeiter (DSGVO Art. 28)

| Anbieter | Zweck | DPA |
|---|---|---|
| Hosting-Provider | Hosting + DB | erforderlich |
| Stripe Payments Europe Ltd. (IE) | Zahlungen | DPF + SCC |
| (zukünftig) Analytics | Statistik | abhängig vom Anbieter |

## Drittlandtransfer

Aktiv minimiert:
- Avatare: self-hosted (kein DiceBear-US mehr)
- Fonts: lokal hostbar (Roadmap; aktuell Google Fonts mit `gstatic.com`)
- Maps: OSM-Tiles (EU-basiert)
- Stripe: USA mit DPF + SCC abgedeckt

## KI-Einsatz

Die Kennzeichnungspflicht für KI-Inhalte (**EU AI Act Art. 50**, seit 02.08.2026) ist seit
dem 14.08.2026 umgesetzt. Was die Etiketten bedeuten, wer sie setzt und was sie **nicht**
behaupten: [[40-Governance/Legal/KI-Transparenz]].

## Roadmap

- [ ] **Einwilligung wirksam machen** — heute wird sie erhoben und von keiner Schreibstelle
      gelesen (gemessen; siehe [[40-Governance/Legal/Cookie-Liste]]). Rechtlich der
      dringendste offene Punkt, weil das Banner die erkannte Pflicht belegt.
- [ ] Standort (`eb_radar_ort`) und Präferenzprofil (`eb_taste_v1`) in die
      Datenschutzerklärung aufnehmen — sie stehen seit dem 15.08.2026 in der Cookie-Liste,
      aber noch nicht im Text für Nutzer
- [ ] Löschweg für den Gesprächsverlauf des Planungs-Assistenten (`eb_ai_chat_v1_*`)
- [ ] Google Fonts → self-hosted via `@font-face`
- [ ] Cookie-Banner: Mehrsprachigkeit (DE/EN)
- [ ] DSGVO-Selfservice-Export im User-Profil (`/profile/data-export`)
- [ ] DSA-Transparenzbericht-Generator (jährlich)

Siehe [[40-Governance/Security/2026-05-02-Security-Hardening]], [[50-Evolution/Roadmap/App-Store-Readiness]].
