---
layer: L0
domain: kern
share: internal
tags: [layer/L0, domain/kern, share/internal, typ/meta]
---

# Layer-Modell — Wie dieses Brain aufgebaut ist

> Der Vault ist kein Ordnerhaufen, sondern ein **geschichtetes Gedächtnis**.
> Jede Notiz sitzt auf genau einer Ebene und trägt ihre Ebene im Frontmatter.
> Die Ebenen bestimmen Farbe im Graph, Freigabe nach außen und Pflegerhythmus.

## Die sechs Ebenen

| Layer | Ordner | Frage, die die Ebene beantwortet | Farbe | Puls |
|-------|--------|----------------------------------|-------|------|
| **L0 · Kern** | `00-Kern/` | Wie funktioniert das Wissen selbst? | ⚪️ Weiß | statisch |
| **L1 · Produkt** | `10-Produkt/` | Was kann das Produkt aus Nutzersicht? | 🟢 Grün | schnell |
| **L2 · System** | `20-System/` | Wie ist es technisch gebaut? | 🔵 Blau | mittel |
| **L3 · Betrieb** | `30-Betrieb/` | Wie läuft es im Alltag? | 🟣 Violett | mittel |
| **L4 · Governance** | `40-Governance/` | Was ist erlaubt, sicher, rechtens? | 🔴 Rot | langsam |
| **L5 · Evolution** | `50-Evolution/` | Wohin entwickelt es sich? | 🟠 Orange | sehr schnell |

**Leserichtung:** L1 sagt *was*, L2 sagt *wie*, L3 sagt *womit*, L4 sagt *ob erlaubt*, L5 sagt *als nächstes*.
**Schreibrichtung:** Neues Wissen entsteht fast immer in **L5** (Sprint/Entscheidung) und
sinkt nach Stabilisierung in **L1–L3** ab. L4 ändert sich am seltensten.

## Frontmatter-Vertrag

Jede Notiz beginnt mit:

```yaml
---
layer: L2                 # L0 … L5
domain: system            # kern | produkt | system | betrieb | governance | evolution
share: internal           # public | internal | secret  ← Sicherheitsklasse
tags: [layer/L2, domain/system, share/internal]
---
```

- `layer` steuert **Farbe & Gruppierung** im Graphen.
- `share` steuert, **was die Website-KI sehen darf** → [[00-Kern/Sicherheits-Klassifikation]].
- `tags` sind redundant zu den Feldern, damit Obsidians Graph-Filter (`tag:#layer/L2`) greifen.

## Pflegeregeln je Ebene

| Ebene | Wann anfassen | Wer schreibt |
|-------|---------------|--------------|
| L0 | Wenn sich die Wissensarchitektur ändert | Mensch |
| L1 | Bei jedem Feature-Release | Claude + Mensch |
| L2 | Bei Architektur-/API-Änderungen | Claude |
| L3 | Bei Deploy-, Monitoring-, Integrationsänderungen | Claude |
| L4 | Bei Security-Fixes, Rechtsänderungen | Mensch (Review-Pflicht) |
| L5 | Nach jedem Push | Claude |

## Verwandt

- [[00-Kern/Neural-Map]] — die visuelle Karte aller Ebenen
- [[00-Kern/Wissensstroeme]] — die Impulse zwischen den Ebenen
- [[00-Kern/Synergie-Pipeline]] — wie Wissen zur Website fließt
- [[00-Kern/Sicherheits-Klassifikation]] — was nach außen darf
