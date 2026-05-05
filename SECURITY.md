# Security Policy – eventbörse.de

## Sicherheitslücken melden

Wir nehmen die Sicherheit von eventbörse.de ernst. Falls du eine Sicherheitslücke gefunden hast, bitten wir dich, diese verantwortungsvoll zu melden.

### 🔒 Vertrauliche Meldungen (bevorzugt)

Für **schwerwiegende Sicherheitslücken** (z.B. Remote Code Execution, SQL Injection, Authentication Bypass, Datenlecks) nutze bitte **GitHub Security Advisories**:

**[→ Sicherheitslücke privat melden](../../security/advisories/new)**

Dies stellt sicher, dass die Schwachstelle **nicht öffentlich sichtbar** ist, bevor sie behoben wurde.

### 📧 Alternative: Direkte Kontaktaufnahme

Falls du GitHub Security Advisories nicht nutzen möchtest, wende dich direkt an den Repository-Inhaber über die auf dem GitHub-Profil angegebenen Kontaktdaten.

**Bitte NICHT** über öffentliche Issues melden, wenn die Lücke noch nicht behoben ist.

---

## Was wir erwarten

Bitte gib bei deiner Meldung folgende Informationen an:

- **Typ der Schwachstelle** (z.B. XSS, SQL-Injection, CSRF, etc.)
- **Betroffene Datei(en)** und Zeilennummern (falls bekannt)
- **Beschreibung** des Problems und wie es ausgenutzt werden könnte
- **Schritte zur Reproduktion** (wenn möglich)
- **Mögliche Auswirkungen** auf Nutzer oder Daten

---

## Unser Prozess

1. **Eingangsbestätigung** innerhalb von 48 Stunden
2. **Erstbewertung** innerhalb von 5 Werktagen
3. **Behebung** je nach Schweregrad: Kritisch = 24h, Hoch = 7 Tage, Mittel = 30 Tage
4. **Credit** – Mit deiner Erlaubnis nennen wir dich als Finder der Schwachstelle

---

## Bekannte Sicherheitsmaßnahmen

Folgende automatisierte Security-Checks laufen in diesem Repository:

| Check | Tool | Häufigkeit |
|-------|------|-----------|
| Code-Analyse | GitHub CodeQL | Wöchentlich + bei Push |
| Secret-Scan | Gitleaks | Täglich + bei Push |
| PHP-Syntax | php -l + PHPCS | Bei PHP-Änderungen |
| Dependency-Scan | Trivy + npm audit | Täglich |
| Malware-Scan | ClamAV | Wöchentlich |
| Uptime-Monitor | curl | Alle 30 Minuten |
| Security-Header | curl | Täglich |
| SSL-Zertifikat | openssl | Täglich |

---

## Scope

Diese Security Policy gilt für:
- Den Quellcode in diesem Repository
- Die Website `https://xn--eventbrse-57a.de` (eventbörse.de)
- GitHub Actions Workflows

**Nicht im Scope:**
- Drittanbieter-Dienste (IONOS Hosting, WordPress Core)
- Social Engineering
- Physische Sicherheit
