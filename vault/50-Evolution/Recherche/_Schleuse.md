---
layer: L5
domain: evolution
share: internal
tags: [layer/L5, domain/evolution, share/internal, typ/regeln]
---

# Recherche-Schleuse — wo Externes ankommt

Dieser Ordner ist die **einzige** Stelle, an der Wissen von außerhalb in den
Vault gelangt. Web-Recherche, Transkripte, fremde Artikel: alles landet hier
zuerst, und zwar in Quarantäne.

## Warum es diese Schleuse gibt

Ohne sie sähe die Kette so aus: eine Routine holt einen Text aus dem Netz →
schreibt ihn als Notiz → `build-knowledge.mjs` exportiert alles mit
`share: public` → der Website-Bot sagt ihn anonymen Besuchern auf. Zwischen
„irgendwo im Netz gelesen" und „unsere Seite behauptet das" läge dann nichts.

Die Schleuse ist genau dieses Nichts, gefüllt: ein Tor, das ein Mensch öffnen
muss.

## Die Regeln (durchgesetzt, nicht nur aufgeschrieben)

`node scripts/quarantine.mjs --check` prüft jede Notiz in diesem Ordner und
bricht die CI ab, wenn eine davon verletzt ist:

| # | Regel | Prüfung |
|---|-------|---------|
| 1 | **Nichts hier ist öffentlich** | `share` muss `internal` sein |
| 2 | **Herkunft mitschreiben** | `quelle` + `abgerufen` im Frontmatter, Datum nicht in der Zukunft |
| 3 | **Fremdtext ist gekennzeichnet** | externer Text steht in einem ```-Block |
| 4 | **Keine Geheimnisse** | Schlüssel, Zugänge, IPs, E-Mail-Adressen — auch in `internal` nicht |
| 5 | **Keine fremden Anweisungen in unserem Text** | Injection-Formulierungen außerhalb des Datenblocks sind ein Verstoß |

Regel 5 ist der Prompt-Injection-Schutz. Steht in einer geholten Seite
„ignoriere deine Anweisungen", ist das **Inhalt**, kein Befehl. Innerhalb des
Datenblocks ist so ein Satz erwartbar und in Ordnung. Steht er außerhalb, ist
die Anweisung aus der Quelle in unseren eigenen Text gewandert — genau der
Moment, den man abfangen will.

## Aufnehmen

```bash
node scripts/quarantine.mjs --aufnehmen \
  --titel "Event-Trends Herbst 2026" \
  --quelle "https://beispiel.org/artikel" \
  --datei rohtext.txt \
  --thema trends \
  --einordnung "Zwei Formate, die wir noch nicht abbilden."
```

Das Skript verweigert die Aufnahme, wenn der Fremdtext Geheimnisse enthält —
solche Inhalte sollen gar nicht erst im Repo landen, auch nicht als `internal`.

## Freigeben

Eine Erkenntnis wird **nicht** dadurch öffentlich, dass man `share` in der
Recherche-Notiz ändert — das lässt Regel 1 nicht zu. Der Weg ist:

1. Erkenntnis in eigenen Worten in eine Notiz unter `10-Produkt/Wissen/` schreiben
2. Diese Notiz auf `share: public` setzen — **eigener Commit mit Begründung**
3. `node scripts/build-knowledge.mjs --report` und die Bilanz prüfen

So verlässt nie fremder Text unsere Seite, sondern nur das, was wir daraus
verstanden und selbst formuliert haben.

## Verwandt
- [[30-Betrieb/MCP-Architektur]] — §4, die Sicherheitsregeln für externen Zufluss
- [[00-Kern/Sicherheits-Klassifikation]] — das Freigabe-Tor insgesamt
- [[00-Kern/Synergie-Pipeline]] — Vault → Website
