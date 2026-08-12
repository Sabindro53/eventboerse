---
layer: L0
domain: kern
share: internal
tags: [layer/L0, domain/kern, share/internal, typ/messung]
---

# ⚡ Impuls-Strom — der lebende Zustand

> **Automatisch erzeugt** von `scripts/pulse.mjs` · Stand: **2026-08-12**
> Nicht von Hand bearbeiten — jeder Lauf überschreibt die Datei.
> Diese Notiz misst, was im Netz tatsächlich fließt. Die Ströme selbst
> sind in [[00-Kern/Wissensstroeme]] beschrieben.

## 🧠 Schichtung des Brains

| Ebene | Notizen | Verteilung |
|-------|---------|------------|
| **L0** | 10 | `████████··············` |
| **L1** | 21 | `█████████████████·····` |
| **L2** | 28 | `██████████████████████` |
| **L3** | 13 | `██████████············` |
| **L4** | 14 | `███████████···········` |
| **L5** | 13 | `██████████············` |

**Gesamt: 99 Notizen**

## 🔒 Freigabe-Bilanz (Impuls 5 + L4-Veto)

| Klasse | Notizen | Bedeutung |
|--------|---------|-----------|
| 🟢 `public` | **10** | fließt zur Website-KI |
| 🟡 `internal` | 79 | bleibt im Vault |
| 🔴 `secret` | 10 | verlässt den Vault nie |
| ⚠️ fehlt | 0 | keine — sauber |

```mermaid
graph LR
  V["🗄️ Vault<br/>99 Notizen"] -->|"10 public"| K["📦 Wissensbasis<br/>89 Abschnitte"]
  V -->|"89 intern/secret"| X["🔒 bleibt drin"]
  K --> W["🌐 KI-Bot · Board · EB Circle"]
  W -.->|"Wissenslücke"| V
  classDef ok fill:#22c55e,stroke:#16a34a,color:#fff
  classDef block fill:#ef4444,stroke:#dc2626,color:#fff
  classDef sys fill:#3b82f6,stroke:#2563eb,color:#fff
  class K,W ok
  class X block
  class V sys
```

## 📚 Was die Website-KI weiß

- **89 Abschnitte** aus **10 Notizen**
- Themen: `Buchung & Zahlung` · `Event-Planung in der Praxis` · `Gebühren & Provision` · `Inserate erstellen & verwalten` · `Konto & Anmeldung` · `Nachrichten & Kontakt` · `Planungs-Board nutzen` · `Sicherheit & Vertrauen` · `Suchen & Dienstleister finden` · `Über Eventbörse`
- Quellordner: 10-Produkt/Wissen

## 🎉 Event-Abdeckung

**30 Event-Typen** in **7 Gruppen** — von der Hochzeit
bis zum Tabletop-Abend. Die Vision „jede Art von Event" misst sich hier.

## 🔁 Bewegung im Code

| Kennzahl | Wert |
|----------|------|
| Commits (7 Tage) | **26** |
| Commits (30 Tage) | 107 |
| Letzter Commit | `79cee61 · GitHub App statt Token — fuer Routine UND Autopilot` (2026-08-12) |

**Meistbewegte Dateien (30 Tage):**
```
34 app.js
     29 tests/e2e/kern.spec.js
     27 CLAUDE.md
     26 styles.css
     21 vault/30-Betrieb/Testing.md
```

**Codegröße:**
- `app.js` — 25.586 Zeilen
- `styles.css` — 16.991 Zeilen
- `functions.php` — 9.560 Zeilen
- `app-shell.html` — 4.011 Zeilen

## Verwandt
- [[00-Kern/Wissensstroeme]] — die sechs Impulse
- [[00-Kern/Synergie-Pipeline]] — der Weg zur Website
- [[00-Kern/Sicherheits-Klassifikation]] — warum 10 Notizen nie hinausgehen
- [[00-Kern/Neural-Map]] — dasselbe Netz visuell
