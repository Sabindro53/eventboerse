# Operations: Incident-Response

> Playbook für Vorfälle. Reihenfolge wichtig — DSGVO-Fristen laufen ab Erkenntnis-Zeitpunkt.

## Klassifizierung

| Schwere | Beispiel | Reaktionszeit |
|---|---|---|
| **P0 – Outage** | Site offline, DB down, Stripe Webhook bricht | sofort |
| **P1 – Datenleck** | unbefugter Zugriff, Datenexfiltration, RCE | sofort + DSGVO-Frist |
| **P2 – Funktionsfehler** | Feature kaputt für viele User | < 4 h |
| **P3 – Cosmetic** | UI-Bug, Tippfehler | nächster Sprint |

## Sofort-Maßnahmen P0

```
1. Maintenance-Banner aktivieren
   (server-side: Option `eb_maintenance_mode = 1`)
2. Hosting-Provider-Status prüfen
3. wp-admin erreichbar? -> nein -> SFTP nutzen
4. db-error.php aktiv? -> "Wartungsarbeiten"-Seite live
5. Stripe-Dashboard prüfen, ob Webhooks queued sind
6. Bei nicht behebbar in 30 min: Code-Rollback via Git
```

## Sofort-Maßnahmen P1 (Datenleck)

```
1. Beweissicherung: Logs sichern, Snapshots machen, NICHTS löschen
2. Angriffsvektor isolieren (Account sperren, Rate-Limit verschärfen, IP blocken)
3. Patch deployen, Cache invalidieren
4. Passwort-Reset für betroffene User erzwingen
5. DSGVO Art. 33: 72-Std-Frist Aufsichtsbehörde (LDI NRW)
6. DSGVO Art. 34: Betroffene direkt benachrichtigen wenn hohes Risiko
7. Stripe / Hosting-Provider informieren falls relevant
8. Post-Mortem schreiben (siehe Template unten)
```

## Code-Rollback

```bash
# Letzten guten Commit identifizieren
git log --oneline -20

# Branch erstellen + Force-Deploy auslösen
git checkout -b hotfix/rollback-YYYY-MM-DD <commit-sha>
git push origin hotfix/rollback-YYYY-MM-DD

# GitHub-Action manuell triggern auf diesem Branch
# → SFTP überschreibt Dateien auf Live
```

## DB-Restore

Über Hosting-Provider-Backup-Konsole:
1. Wartungsmodus aktivieren
2. Backup auswählen (täglich vorhanden)
3. Restore in Staging-DB testen, dann Live
4. Wartungsmodus aus

## Stripe-Webhook-Recovery

Webhook-Events sind in Stripe-Dashboard verfügbar:
1. Stripe-Dashboard → Webhooks → Logs
2. Failed Events „Resend" einzeln oder bulk
3. Idempotenz: unser Handler verarbeitet das gleiche Event mehrfach ohne Schaden

## Post-Mortem-Template

```markdown
# Post-Mortem: <Kurzbeschreibung> (YYYY-MM-DD)

## Zeitleiste
- HH:MM Erkennung
- HH:MM Erste Reaktion
- HH:MM Gefixt
- HH:MM Verifiziert

## Was ist passiert?
[neutrale Sachschilderung]

## Auswirkung
- Anzahl betroffener User
- Datenkategorien (falls P1)
- Downtime-Dauer

## Root-Cause
[5-Whys-Analyse]

## Was hat gut funktioniert?

## Was hat nicht funktioniert?

## Maßnahmen
- [ ] Sofort: ...
- [ ] Mittelfristig: ...
- [ ] Langfristig: ...
```

Speicherort: `vault/Operations/Incidents/YYYY-MM-DD-<slug>.md`

## Nicht-tun-Liste

- ❌ Keine Live-DB im laufenden Incident löschen/truncieren
- ❌ Kein `git push --force` auf `main`
- ❌ Keine Logs vorzeitig rotieren (Beweissicherung)
- ❌ Nicht öffentlich kommunizieren bevor LDI/Stripe informiert sind (P1)

Siehe [[Operations/Monitoring]], [[Legal/Compliance-Overview]].
