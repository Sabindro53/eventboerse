---
layer: L0
domain: kern
share: internal
tags: [layer/L0, domain/kern, share/internal, typ/meta]
---

# Wissensströme — Die Impulse im Netz

> Ein Brain ist nicht die Summe seiner Notizen, sondern die Summe seiner **Ströme**.
> Hier sind die sechs Impulse, die zwischen Mensch, Claude, Vault und Website fließen.
> Jeder Impuls hat eine Richtung, einen Auslöser und ein Ziel.

## Übersicht: Der Kreislauf

```mermaid
graph LR
  subgraph MENSCH[" 👤 Mensch "]
    U[Wunsch / Bug / Idee]
  end
  subgraph CLAUDE[" 🧠 Claude "]
    C[Analyse & Umsetzung]
  end
  subgraph BRAIN[" 🗄️ Vault (Brain) "]
    L5[L5 Evolution]
    L2[L2 System]
    L1[L1 Produkt]
    L4[L4 Governance]
  end
  subgraph SITE[" 🌐 Website "]
    KB[(Knowledge Base<br/>nur share:public)]
    BOT[KI-Bot + Board-Assistent]
    N[Nutzerfrage]
  end

  U -->|Impuls 1: Auftrag| C
  C -->|Impuls 2: Code| SITE
  C -->|Impuls 3: Gedächtnis| L5
  L5 -->|Impuls 4: Absinken| L2
  L2 --> L1
  L1 -->|Impuls 5: Freigabe| KB
  L4 -.->|Veto / Filter| KB
  KB --> BOT
  N --> BOT
  BOT -->|Impuls 6: Lücke| L5

  classDef human fill:#22c55e,stroke:#16a34a,color:#fff
  classDef ai fill:#a855f7,stroke:#9333ea,color:#fff
  classDef brain fill:#3b82f6,stroke:#2563eb,color:#fff
  classDef site fill:#f97316,stroke:#ea580c,color:#fff
  classDef gov fill:#ef4444,stroke:#dc2626,color:#fff
  class U human
  class C ai
  class L5,L2,L1 brain
  class L4 gov
  class KB,BOT,N site
```

## Die sechs Impulse im Detail

### ⚡ Impuls 1 — Auftrag (Mensch → Claude)
**Auslöser:** Du schreibst einen Wunsch, meldest einen Bug, schickst einen Screenshot.
**Wirkung:** Claude liest zuerst `L5 · Current-Sprint` + `L5 · Claude-Kontext`, versteht den Stand
und arbeitet nicht gegen frühere Entscheidungen.
**Nicht-Ziel:** Kein Impuls startet direkt in L2 — Kontext kommt immer zuerst.

### ⚡ Impuls 2 — Code (Claude → Website)
**Auslöser:** Umsetzung ist verifiziert.
**Wirkung:** Push auf `main` → GitHub Actions → IONOS. Siehe [[30-Betrieb/CI-CD/Deployment]].
**Kontrolle:** Kein Deploy ohne grünen Run.

### ⚡ Impuls 3 — Gedächtnis (Claude → L5)
**Auslöser:** Nach jeder relevanten Änderung.
**Wirkung:** `Current-Sprint` und `Claude-Kontext` werden fortgeschrieben.
So beginnt die nächste Session nicht bei null — **das ist die eigentliche Synergie.**

### ⚡ Impuls 4 — Absinken (L5 → L2/L1)
**Auslöser:** Ein Sprint-Thema ist stabil geworden.
**Wirkung:** Aus „gerade gebaut" wird „so ist es gebaut" — die Notiz wandert von Evolution
in System/Produkt. Verhindert, dass L5 zur Müllhalde wird.

### ⚡ Impuls 5 — Freigabe (L1 → Knowledge Base → Website)
**Auslöser:** Build-Schritt `scripts/build-knowledge.mjs`.
**Wirkung:** **Nur** Notizen mit `share: public` werden zu `assets/eb-knowledge.json` verdichtet
und von KI-Bot & Board-Assistent beantwortet.
**Veto:** L4 · Governance filtert mit — `share: secret` verlässt den Vault nie.
Details: [[00-Kern/Synergie-Pipeline]].

### ⚡ Impuls 6 — Lücke (Website → L5)
**Auslöser:** Der Bot findet keine gute Antwort (Fallback-Treffer).
**Wirkung:** Die Frage ist ein Signal: hier fehlt Wissen. Sie gehört als Notiz nach
`L5 · Feature-Ideen` bzw. als neue `share: public`-Notiz nach L1.
**So schließt sich der Kreis** — das Netz lernt aus dem, was es nicht wusste.

## Abfrage-Strom: Was passiert bei einer Nutzerfrage?

```mermaid
sequenceDiagram
  participant N as 👤 Nutzer
  participant B as 🤖 Bot (lokal)
  participant K as 📚 Knowledge Base
  participant V as 🗄️ Vault
  N->>B: "Wie funktioniert die Auszahlung?"
  B->>B: 1. Intent-Muster prüfen (schnell)
  B->>K: 2. Retrieval über public-Wissen
  K-->>B: Treffer + Score + Quelle
  alt Score hoch
    B-->>N: Antwort + Quelle + Aktion
  else kein Treffer
    B-->>N: Ehrlicher Fallback + nächste Schritte
    B->>V: Impuls 6 — Wissenslücke notieren
  end
  Note over K,V: K enthält NUR share:public.<br/>secret/internal bleiben im Vault.
```

## Warum das kein Deko-Diagramm ist

Jeder Impuls hat eine echte Entsprechung im Repo:

| Impuls | Technische Entsprechung |
|--------|-------------------------|
| 1 | `CLAUDE.md` → Vault-Lesepflicht zu Session-Beginn |
| 2 | `.github/workflows/ionos-deploy.yml` |
| 3 | `50-Evolution/AI-Gedaechtnis/Claude-Kontext.md` |
| 4 | Layer-Regeln in [[00-Kern/Layer-Modell]] |
| 5 | `scripts/build-knowledge.mjs` → `assets/eb-knowledge.json` |
| 6 | Fallback-Logging im Bot (`_ebKbMiss`) |

## Verwandt
- [[00-Kern/Neural-Map]] · [[00-Kern/Layer-Modell]] · [[00-Kern/Synergie-Pipeline]] · [[00-Kern/Sicherheits-Klassifikation]]
