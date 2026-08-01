---
layer: L0
domain: kern
share: internal
tags: [layer/L0, domain/kern, share/internal, typ/auftrag]
---

# Fable 5 — Auftrag & Arbeitsteilung

> **Zweck dieser Notiz:** Sie enthält (a) die Analyse, wo Fable 5 wirklich
> gebraucht wird, (b) die Arbeitsteilung Opus 5 ↔ Fable 5 und (c) den
> fertigen Prompt zum Kopieren.
> **Grundregel der Teilung:** Opus 5 arbeitet chirurgisch an bekannten
> Stellen. Fable 5 hat 1 Mio Token Kontext — es bekommt alles, wofür man
> **die ganze Codebasis gleichzeitig im Kopf haben muss**.

## 1 · Analyse: Wo steht die Plattform?

| Datei | Zeilen | Bewertung |
|-------|--------|-----------|
| `app.js` | ~24.900 | **Monolith.** Alles in einer Datei: Router, 12+ Feature-Module, KI-Engines, State. Größtes Risiko der Codebasis. |
| `styles.css` | ~17.000 | Gewachsen, mehrfach überschreibende Regeln (zuletzt: Feuerwerk-Positionen doppelt definiert). |
| `functions.php` | ~8.400 | 87 REST-Routen, Stripe-Abrechnung, WebAuthn. Sicherheitskritisch. |
| `app-shell.html` | ~4.000 | Einzige Quelle des SPA-Bodys. |
| **Tests** | **0** | **Keine automatisierte Testsuite.** Jede Regression fällt erst im Browser auf — oder beim Nutzer. |

**Kernbefund:** Die Plattform ist funktional weit, aber strukturell ungesichert.
Die letzten Fehler (Verlaufsschrift nach Minify, Suche ohne Treffer, doppelte
Feuerwerk-Regeln) waren **alle** Regressionen, die eine Testsuite gefangen hätte.

## 2 · Arbeitsteilung

### Opus 5 (diese Sitzung) — chirurgisch, verifiziert
Bugfixes an bekannter Stelle · einzelne Features · Vault-Pflege · Wissensbasis ·
Deploy-Überwachung · alles, was mit klarer Hypothese und Messung endet.

### Fable 5 — alles, was den ganzen Kontext braucht
1. **Testsuite von null aufbauen** (höchste Priorität)
2. **`app.js` modularisieren** — braucht die komplette Datei im Kontext
3. **Vollständiges Sicherheits-Audit** über `functions.php` + `app.js` gemeinsam
4. **Design-System vereinheitlichen** — 17.000 Zeilen CSS auf Tokens normalisieren
5. **Barrierefreiheit** end-to-end (Fokus, ARIA, Kontrast, Tastatur)

**Faustregel:** Muss man *drei Dateien gleichzeitig* verstehen → Fable 5.
Kennt man die Zeile schon → Opus 5.

## 3 · Der Prompt für Fable 5

> Kopiere ab hier. Er ist bewusst als Auftrag mit Reihenfolge, Leitplanken
> und Abnahmekriterien formuliert — nicht als Wunschliste.

```text
Du arbeitest an „Eventbörse" (eventbörse.de), einem deutschen Marktplatz für
Events: Planer finden Dienstleister (DJ, Catering, Fotograf, Location …),
Dienstleister finden Aufträge. Stack: WordPress als REST-Backend
(functions.php) + Vanilla-JS-SPA (app.js), kein Framework, kein Build-Schritt.
Deploy: Push auf main → GitHub Actions → SFTP zu IONOS.

DEIN VORTEIL: 1 Mio Token Kontext. Lies app.js (~24.900 Z.), styles.css
(~17.000 Z.), functions.php (~8.400 Z.) und app-shell.html (~4.000 Z.)
VOLLSTÄNDIG ein, bevor du etwas änderst. Genau dafür bist du hier.

LIES ZUERST (Pflicht):
  CLAUDE.md
  vault/00-Kern/Layer-Modell.md, Wissensstroeme.md,
  vault/00-Kern/Sicherheits-Klassifikation.md, Synergie-Pipeline.md
  vault/50-Evolution/AI-Gedaechtnis/Claude-Kontext.md
  vault/50-Evolution/Roadmap/Current-Sprint.md

AUFTRAG — in dieser Reihenfolge, jeder Schritt einzeln committen:

1) TESTSUITE (Priorität 1, alles andere hängt daran)
   Es gibt KEINE Tests. Die letzten Produktionsfehler wären alle
   auffindbar gewesen. Baue mit Playwright (bereits vorhanden,
   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers, NICHT neu installieren):
   - Smoke: jede SPA-Route rendert, 0 Page-Errors
   - Suche: natürliche Sätze liefern Treffer ("Ich suche einen DJ für
     meine Hochzeit"), Unsinn liefert 0
   - Gebühren: Brutto = Provision + Stripe-Gebühr + Auszahlung, centgenau
   - Wissensbasis: Fachfragen beantwortet, Off-Topic abgelehnt, keine
     Leckage aus nicht-öffentlichen Vault-Ebenen
   - Visuelle Regression gegen MINIFIZIERTES CSS (siehe Leitplanke 3)
   Verdrahte sie in .github/workflows/pr-check.yml als blockierendes Gate.

2) SICHERHEITS-AUDIT (functions.php + app.js gemeinsam)
   Prüfe alle 87 REST-Routen auf: permission_callback vorhanden und
   korrekt, Nonce-Prüfung, Rechteprüfung pro Objekt (IDOR), Eingabe-
   Sanitisierung, SQL-Vorbereitung, Datei-Uploads, Rate-Limits.
   Prüfe im Frontend jeden innerHTML-Pfad auf ungeescapte Nutzerdaten.
   Ergebnis: Bericht + Fixes, sortiert nach Ausnutzbarkeit.
   Sicherheitsnotizen gehören nach vault/40-Governance/Security/ mit
   `share: secret` — sie dürfen NIE in die Wissensbasis gelangen.

3) app.js MODULARISIEREN (der eigentliche Grund für dein Kontextfenster)
   Zerlege in ES-Module (search/, board/, chat/, payments/, ai/, core/).
   Harte Bedingung: KEIN Build-Schritt, keine Bundler-Abhängigkeit —
   entweder native ES-Module mit type="module" oder eine Konkatenation im
   Deploy. Nach jedem Teilschritt muss die Seite vollständig funktionieren.
   Bei Zweifel: lieber kleinere Schritte.

4) DESIGN-SYSTEM
   styles.css auf Design-Tokens normalisieren (Farbe, Abstand, Radius,
   Schatten, Typo). Doppelte und einander überschreibende Regeln
   auflösen — es gab bereits Fälle, in denen eine spätere Regel eine
   frühere still ausgehebelt hat. Dark- und Light-Mode gleichwertig.

5) BARRIEREFREIHEIT
   Tastaturbedienbarkeit überall, sichtbarer Fokus, ARIA für Modals/
   Dropdowns/Toasts, Kontraste ≥ WCAG AA, prefers-reduced-motion
   respektieren. Ziel: Lighthouse Accessibility ≥ 95.

LEITPLANKEN (nicht verhandelbar):
1. SPA-Body NUR in app-shell.html ändern, danach ./build-index-html.sh
   ausführen und index.html mitcommitten. index.html nie von Hand.
2. Nach Änderungen an `share: public`-Notizen:
   node scripts/build-knowledge.mjs --report, JSON mitcommitten.
3. CSS IMMER gegen das minifizierte Ergebnis prüfen:
   npx csso-cli@4.0.2 --no-restructure styles.css -o /tmp/min.css
   Grund: csso hat schon einmal die `background`-Kurzform hinter
   `background-clip: text` geschoben und damit Verlaufsschrift in
   massive Farbblöcke verwandelt — lokal unsichtbar, live kaputt.
   Nutze `background-image`, nie die Kurzform, bei Verlaufsschrift.
4. Geld-Code (Stripe, Provision, Auszahlung) nur mit Tests anfassen.
   Modell: Kunde zahlt brutto; Provision 3 % UND Stripe-Gebühr trägt der
   Dienstleister; nach Zahlungseingang wird gegen die echte
   Balance-Transaction centgenau nachjustiert.
5. Personalisierung bleibt LOKAL im Browser. Keine Suchbegriffe, keine
   Profile an den Server. Kontakt-/Zahlungsdaten werden nie gelernt.
6. Jede Änderung verifizieren, bevor du sie als fertig meldest —
   headless im Browser, mit Zahlen. Keine Behauptungen ohne Messung.
7. Deutsch für alle Nutzertexte, Commits und Vault-Notizen.

ABNAHMEKRITERIEN:
- Testsuite läuft grün in CI und blockiert PRs bei Fehlern
- Sicherheitsbericht liegt vor, kritische Funde behoben
- app.js modularisiert, Seite unverändert funktionsfähig, 0 Page-Errors
- Lighthouse: Accessibility ≥ 95, Best Practices ≥ 95
- Vault ist um das dokumentiert, was du geändert hast

ARBEITSWEISE: Ein Thema pro Commit, deutsche Commit-Nachricht mit
Begründung. Nach jedem Thema kurz berichten: was, warum, wie verifiziert.
Wenn etwas riskant ist, sag es und schlag den kleineren Schritt vor.
```

## 4 · Was Opus 5 parallel weiterführt

- Produkt-Features und Bugfixes an bekannter Stelle
- Vault-Pflege, Wissensbasis, Freigabe-Bilanz
- Event-Universum weiter ausbauen (neue Event-Arten, Synonyme)
- Deploy-Überwachung

## Verwandt
- [[00-Kern/Layer-Modell]] · [[00-Kern/Synergie-Pipeline]] · [[00-Kern/Sicherheits-Klassifikation]]
- [[50-Evolution/Roadmap/Current-Sprint]]
