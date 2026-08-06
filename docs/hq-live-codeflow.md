# HQ Live-Codeflow

## Ziel

Das HQ unterscheidet belegbar zwischen zwei Arten von Arbeit:

- Das Operationsensemble liefert Analyse-, Sicherheits-, Produkt- und Supportsignale.
- Der OpenRouter-Autopilot darf mit vier getrennten Rollen kleine Repository-Änderungen liefern.

Eine Modellantwort wird niemals als Codeänderung dargestellt. Als Repository-Arbeit zählt erst ein konkreter Dateiscope beziehungsweise ein angewendeter Diff.

## Datenfluss

```text
Roadmap + Audit + Git-Historie + nummerierte Quellzeilen
            │
            ▼
Ela / Scout ── Ziel + Zieldateien + wortgetreue Repo-Belege
            ▼
Ada / Architektur ── Invarianten + Prüfplan
            ▼
Timo / Umsetzung ── kleiner Unified-Diff
            ▼
Kito / Review ── unabhängige Freigabe
            ▼
Syntax + Build + Playwright
            ▼
Branch-Push → Pull Request → Scope-Wächter → Squash-Merge → IONOS-Deploy
```

Nach jeder Modellphase schreibt `scripts/openrouter-agents.mjs` den aktuellen Zustand nach `.ai-run/codeflow.json`. Der Workflow veröffentlicht nur diese Telemetrie per SFTP als `assets/eb-codeflow.json`. Das HQ lädt sie im Fünf-Sekunden-Takt und kombiniert sie mit echten GitHub-Daten zu PR, Dateien, Merge und Deploy.

## Sicherheitsgrenzen

- Die Telemetrie enthält Ziel, Dateinamen, Diff-Statistik, Review und Kosten, aber niemals Patchinhalt, Prompts oder Geheimnisse.
- Der Scout bekommt fokusabhängige, nummerierte Zeilen aus der Whitelist und wählt nur kurze Beleg-IDs. Datei, Zeile und wortgetreuer Auszug werden danach ausschließlich vom System aus dem geprüften Katalog gesetzt.
- Der Autopilot darf höchstens zwei explizit freigegebene Frontend-Quelldateien ändern; generierte `app.js` ist nur als Buildfolge erlaubt.
- Neue Dateien, Löschungen, Umbenennungen, Netzwerk-, Storage-, Auth- und Payment-Pfade sind blockiert.
- Jede Änderung braucht strukturiertes Vier-Augen-Review, vollständige Gates und eine zweite Scope-Prüfung im Auto-Merge-Workflow.
- Verbindliche Kommunikation, Zahlungen und rechtliche Freigaben bleiben außerhalb der autonomen Änderungsfläche.

## Fehler- und Aktualitätsmodell

- Scheitert ein Modell oder eine Prüfung, schreibt der Codeflow `fehler` und der Lauf endet ohne PR.
- Gibt es keinen sicheren Patch, wird `ohne_aenderung` statt eines erfundenen Fortschritts gezeigt.
- Schlägt die Live-Veröffentlichung fehl, schlägt auch der Autopilot-Lauf fehl; unsichtbare Änderungen werden nicht weiter ausgeliefert.
- Normale Code-Deploys überschreiben die Laufzeitdatei nicht. Der nächste echte Autopilot-Lauf ersetzt sie vollständig.

## Spätere Skalierung

Wenn mehrere Autopilot-Läufe parallel erlaubt werden, sollte die einzelne Laufzeitdatei durch eine kleine Ereignis-API mit Run-ID, Sequenznummer und begrenzter Historie ersetzt werden. Bis dahin verhindert die Workflow-Concurrency konkurrierende Schreiber.
