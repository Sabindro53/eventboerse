---
name: "🔒 Sicherheitsbefund (automatischer Scan)"
about: "Vorlage für Sicherheitsbefunde aus automatisierten Security-Scans"
title: "[Security] "
labels: ["security", "automated-scan"]
assignees: ["Sabindro53"]
---

## 🔒 Sicherheitsbefund

### Art des Befunds

<!-- Zutreffendes bitte ankreuzen: -->
- [ ] 🔑 Hardcodiertes Secret / API-Key (Gitleaks)
- [ ] 🐛 Code-Sicherheitslücke (CodeQL)
- [ ] 📦 Verwundbare Abhängigkeit (Trivy / npm audit)
- [ ] 🦠 Malware-Verdacht (ClamAV / PHP-Pattern)
- [ ] 🌐 Fehlender Security-Header
- [ ] 🔐 SSL-Zertifikat-Problem
- [ ] 🕒 Uptime-Problem
- [ ] ⚠️ Sonstiges

### Betroffene Datei(en)

```
# Beispiel: functions.php, Zeile 42
```

### Beschreibung des Befunds

<!-- Was wurde gefunden? Welches Sicherheitsrisiko besteht? -->

### Workflow / Scan-Tool

<!-- Welcher automatisierte Scan hat den Befund entdeckt? -->
- **Workflow:** 
- **Job:** 
- **Scan-Tool:** 

### Link zum Workflow-Run

<!-- GitHub Actions Run-URL einfügen -->
- [Workflow-Log]()

### Schweregrad

<!-- Zutreffendes bitte ankreuzen: -->
- [ ] 🔴 **Kritisch** – Sofortiger Handlungsbedarf
- [ ] 🟠 **Hoch** – Beheben innerhalb 24 Stunden
- [ ] 🟡 **Mittel** – Beheben innerhalb 1 Woche
- [ ] 🟢 **Niedrig** – Beheben im nächsten Release

### Empfohlene Maßnahmen

<!-- Was sollte getan werden, um das Problem zu beheben? -->

1. 
2. 
3. 

### Zusätzliche Informationen

<!-- Screenshots, Logs, oder andere relevante Informationen -->

---

> **Hinweis:** Sicherheitslücken mit hohem Schweregrad bitte **nicht** in öffentlichen Issues melden, sondern über [GitHub Security Advisories](../../security/advisories/new) oder per E-Mail an den Repository-Inhaber.
