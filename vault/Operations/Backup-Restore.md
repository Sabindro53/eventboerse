---
tags: [operations, backup]
---

# Backup & Restore

> RPO 24h, RTO 4h Zielwerte. Drei Backup-Ebenen, getrennte Restore-Pfade.

## Backup-Ebenen

| Ebene | Wer | Frequenz | Retention | Wo |
|---|---|---|---|---|
| **Hosting-Provider Auto-Backup** | Provider | täglich | 30 Tage rolling | Provider-Konsole |
| **DB-Snapshot vor jedem Deploy** | GitHub Action (geplant) | bei Push | letzte 10 | S3-kompatibler Bucket (geplant) |
| **Code-Repo** | GitHub | bei jedem Commit | unbegrenzt | github.com |

> **Heute:** nur Provider-Auto-Backup aktiv. Pre-Deploy-DB-Snapshot ist auf der Roadmap, siehe [[Roadmap/Feature-Ideen]].

## Was wird gesichert

- DB-Tabellen (alle `wp_*` inkl. `wp_eb_*`)
- `wp-content/uploads/` (User-Uploads)
- `wp-config.php` (mit SMTP-Konstanten)
- Theme-Verzeichnis (redundant, da im Repo)

## Was NICHT gesichert wird

- Logs > 30 Tage (rotation by design)
- Object-Cache / Transients (regeneriert sich)
- `node_modules`, `vault/` (gehören nicht auf den Server)

## Restore-Szenarien

### A) Komplette Site-Wiederherstellung

```
1. Hosting-Provider-Konsole → Backup-Tab
2. Snapshot wählen (Datum + Uhrzeit)
3. Restore-Ziel: Live oder Staging
4. ~10–30 min Downtime
5. wp-config.php SMTP-Konstanten verifizieren
6. Smoke-Test ([[Testing]])
```

### B) Einzelne DB-Tabelle wiederherstellen

```bash
# Snapshot als SQL-Dump exportieren (Provider-Tool)
# Dann lokal:
mysql -u … -p … < backup.sql --one-database staging_db

# Tabelle einzeln transferieren:
mysqldump … staging_db wp_eb_listings > listings.sql
mysql … live_db < listings.sql
```

> ⚠️ AUTO_INCREMENT-Konflikte beachten — neue IDs > alte IDs.

### C) Datei aus Backup ziehen

Provider-Konsole → File-Browser → Snapshot mounten → einzelne Datei downloaden → SFTP zurück.

### D) User-Upload versehentlich gelöscht

`wp-content/uploads/` ist im Provider-Backup. Restore wie unter C).

## Restore üben (Disaster-Drill)

Geplant einmal pro Quartal:
1. Backup auf Staging einspielen
2. Smoke-Test
3. Datum + Dauer in `vault/Operations/Drills/YYYY-Q.md` dokumentieren

## Verknüpft

- [[Operations/Monitoring]]
- [[Operations/Incident-Response#DB-Restore]]
- [[Legal/Loeschkonzept]]
