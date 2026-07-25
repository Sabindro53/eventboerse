---
layer: L0
domain: kern
share: internal
tags: [layer/L0, domain/kern, share/internal, typ/meta]
---

# Neural-Map — Das Netz sehen

> Öffne den Graphen (`Strg/Cmd + G`). Was du siehst, ist kein Ordnerbaum,
> sondern ein Netz aus sechs farbigen Schichten. Diese Seite erklärt,
> wie du es liest — und wie du zwischen drei Sichten umschaltest.

## Sicht 1 · Layer-Sicht (Standard)

Jede Notiz trägt ihre Ebene als Tag, der Graph färbt danach:

| Farbe | Layer | Bedeutung |
|-------|-------|-----------|
| ⚪️ Weiß-Silber | **L0 Kern** | Wissen über das Wissen — Karte, Ströme, Freigaben |
| 🟢 Grün | **L1 Produkt** | Was Nutzer erleben — Features, Flows, öffentliches Wissen |
| 🔵 Blau | **L2 System** | Wie es gebaut ist — Architektur, Frontend, Backend |
| 🟣 Violett | **L3 Betrieb** | Wie es läuft — Deploy, Monitoring, Integrationen |
| 🔴 Rot | **L4 Governance** | Was gilt — Security, Recht |
| 🟠 Orange | **L5 Evolution** | Wohin es geht — Sprint, Ideen, Gedächtnis |

**Was du daran ablesen kannst:**
- Ein grüner Knoten mit vielen blauen Nachbarn = ein Feature, das tief im System verankert ist.
- Ein oranger Knoten ohne Verbindungen = ein Gedanke, der noch nirgends angedockt hat.
- Rote Knoten am Rand sind normal — Governance hängt selten am Tagesgeschäft.

## Sicht 2 · Sicherheits-Sicht

Trage in die Graph-Suche ein:

```
tag:#share/public
```

Übrig bleibt exakt das Wissen, das die Website-KI kennt. **Was hier nicht leuchtet,
sieht kein Nutzer.** Diese Sicht ist dein Sicherheits-Audit in Bildform.

Weitere nützliche Abfragen:

| Abfrage | Zeigt |
|---------|-------|
| `tag:#share/secret` | Was den Vault niemals verlässt |
| `tag:#share/public` | Was die Bots beantworten dürfen |
| `tag:#layer/L5` | Alles in Bewegung (aktueller Sprint) |
| `tag:#layer/L1 tag:#share/public` | Das nutzerseitige Wissensnetz |
| `-tag:#share/public` | Das interne Gegenstück |

## Sicht 3 · Impuls-Sicht (Lokaler Graph)

Öffne eine Notiz und daneben den **lokalen Graphen** (`Strg/Cmd + P` → „Local graph").
Stelle die Tiefe auf 2. Jetzt siehst du nicht das ganze Netz, sondern **den Impuls um
eine Idee herum** — was sie speist und was sie auslöst.

Empfohlene Startpunkte:
- [[00-Kern/Wissensstroeme]] — die sechs Ströme
- [[50-Evolution/Roadmap/Current-Sprint]] — was gerade pulsiert
- [[10-Produkt/Features/Planungsboard]] — ein Feature quer durch alle Ebenen

## Wie das „neuronale" Aussehen entsteht

Drei Dinge greifen ineinander:

1. **`graph.json`** — Farbgruppen nach `tag:#layer/*`, große Knoten, lange Kanten,
   damit sich Cluster sichtbar trennen.
2. **`snippets/neural.css`** — Glow, Sättigung und ein sanfter Puls auf dem Graph-Canvas.
   Aktiviert über Einstellungen → Erscheinungsbild → CSS-Snippets → `neural`.
3. **Die Verlinkung selbst** — ein Netz entsteht nur, wenn Notizen aufeinander zeigen.
   Deshalb endet jede Notiz mit einem „Verwandt"-Block.

## Pflege des Netzes

- **Jede neue Notiz** bekommt Frontmatter (`layer`, `domain`, `share`) — sonst bleibt sie farblos.
- **Jede neue Notiz** verlinkt mindestens eine bestehende — sonst wird sie zur Waise.
- Waisen findest du im Graphen sofort: einzelne Punkte am Rand ohne Kante.

## Verwandt
- [[00-Kern/Layer-Modell]] — die Ebenen im Detail
- [[00-Kern/Wissensstroeme]] — die Impulse zwischen ihnen
- [[00-Kern/Synergie-Pipeline]] — der Weg zur Website
- [[00-Kern/Sicherheits-Klassifikation]] — die Freigabegrenze
