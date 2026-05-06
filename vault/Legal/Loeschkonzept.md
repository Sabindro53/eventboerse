---
tags: [legal, dsgvo, loeschkonzept, art17]
---

# Löschkonzept (DSGVO Art. 5 lit. e, Art. 17)

> Datenkategorien, Aufbewahrungsfristen und Löschpfade. Spiegelbild zu Dokument **C03** (Word-Vorlage).

## Prinzipien

1. **Datensparsamkeit** — Felder, die nicht erhoben werden müssen, werden weggelassen.
2. **Zweckbindung** — Daten werden gelöscht, sobald der Erhebungszweck entfällt.
3. **Gesetzliche Aufbewahrung schlägt Löschpflicht** — § 257 HGB (6/10 Jahre), § 147 AO (10 Jahre).
4. **Soft-Delete + Hard-Delete-Cron** — Sofort logisch entfernt, physisch nach Frist.

## Datenkategorien

| Kategorie | Beispiel | Aufbewahrungsfrist | Begründung |
|---|---|---|---|
| **Stammdaten Account** | Name, E-Mail, Passwort-Hash | bis Löschantrag, max 24 Mo nach Inaktivität | Vertragsdurchführung |
| **Profildaten Provider** | Beschreibung, Bilder, Kategorien | wie Account | Marktplatz-Funktion |
| **Buchungs- / Rechnungsdaten** | Stripe-IDs, Beträge, Rechnungsnummer | **10 Jahre** | § 147 AO, § 257 HGB |
| **Kommunikation (Chats)** | Konversationen | 24 Mo nach letzter Aktivität | berechtigtes Interesse, Beweissicherung |
| **Bewertungen** | Rating, Text | bis Account-Löschung; danach anonymisiert dauerhaft | öffentliches Marktinteresse |
| **Audit-Log Sicherheit** | Login-IP, Aktionen | 12 Mo | IT-Sicherheit Art. 32 DSGVO |
| **Rate-Limit-Counter** | IP-Hash, Counter | 24 h | technisch flüchtig |
| **Cookie-Consent** | Wahl, Zeitstempel | 12 Mo, dann erneuter Banner | Nachweis Art. 7 |
| **Newsletter-Anmeldung** | E-Mail, Bestätigung | bis Abmeldung | Einwilligung |
| **DSA-Notice/Beschwerden** | Meldung, Bearbeitung | 5 Jahre | Art. 24 DSA-VO |
| **Backups (Provider)** | DB-Snapshots | 30 Tage rolling | technisch zwingend, dann automatisch weg |

## Lösch-Trigger

| Trigger | Ablauf |
|---|---|
| **User klickt „Account löschen"** | Sofort Soft-Delete → Anonymisierung gemäß [[Operations/Runbooks#dsgvo-loeschung-art-17]] → 30 Tage Backup-Frist |
| **24 Mo Inaktivität** | Mail-Reminder → 60 Tage Frist → bei keiner Reaktion: Soft-Delete |
| **Beendigung der Plattform** | Komplettes Lösch- und Migrations-Konzept gemäß C03 |
| **Aufsichtsbehörde / Gerichtsbeschluss** | individuelle Bewertung, Dokumentation |

## Aufbewahrungsausnahmen

Auch nach Löschantrag bleiben **anonymisiert oder gehasht**:
- Rechnungsdaten (10 J., § 147 AO) — User-Bezug entfernt, nur Beträge/Steuerdaten
- Audit-Log relevant für laufende Sicherheitsuntersuchungen (max +6 Mo)
- DSA-Beschwerden mit anhängigen Verfahren

## Anonymisierung statt Löschung (wo möglich)

Bei Reviews und öffentlichen Beiträgen:
- `author_id` → `0` (System-User „Ehemaliges Mitglied")
- Avatar → generischer Placeholder
- IP-Hash gelöscht
- Inhalte bleiben für Marktplatz-Integrität

## Cron-Jobs (geplant)

| Job | Frequenz | Was |
|---|---|---|
| `eb_cron_purge_inactive` | täglich | Mail-Reminder bei 22 Mo, Soft-Delete bei 24 Mo |
| `eb_cron_purge_chats` | wöchentlich | Konversationen ohne Aktivität > 24 Mo löschen |
| `eb_cron_purge_audit` | täglich | Audit-Log > 12 Mo löschen |
| `eb_cron_purge_ratelimit` | stündlich | `wp_eb_rate_limits` > 24 h |

> Status heute: `eb_cron_purge_ratelimit` aktiv. Andere Cron-Jobs auf der Roadmap.

## Verknüpft

- [[Legal/Compliance-Overview]]
- [[Operations/Runbooks]]
- [[Architecture/Datenmodell]]
