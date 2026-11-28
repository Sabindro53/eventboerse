---
layer: L5
domain: evolution
share: internal
tags: [layer/L5, domain/evolution, share/internal, lehren]
---

# Lehren: CI-Tore, Workflows, Deploy, Merge

> Wörtlich aus `CLAUDE.md` ausgelagert am 28.11.2026 (Stand `7340150`).
> Die Regeln daraus stehen kurz in `CLAUDE.md`; hier steht, **warum** —
> Messungen, Fehlschläge, Mutationsproben. Zahlen sind Stand des jeweiligen
> Datums; gepflegte, geprüfte Zahlen stehen nur in `CLAUDE.md`.

## Inhalt

- Workflows, die es nur scheinbar gibt
- Sechs Tore, die nicht blockieren konnten
- Der Deploy hing an einem Fragezeichen
- Der Deploy meldete Erfolg für den Upload, nicht für die Seite
- Lighthouse war neunmal rot — und hat neunmal gemessen
- Der Auto-Merge wartet — und reicht nach
- Vierzehn PRs, und die Seite blieb dunkel
- Zwei Modelle an einer Website

## Workflows, die es nur scheinbar gibt

```bash
node scripts/workflows.mjs           # Bericht (Tagesroutine, braucht Token)
node scripts/workflows.mjs --check   # Tor: Exit 1 bei einem Phantom
```

GitHub registriert einen Workflow, sobald seine Datei auf **irgendeinem** Zweig
einmal gepusht wurde. Wird der Zweig nie gemergt, bleibt der Eintrag stehen:
`state: active`, ein Link auf `blob/main/…`, der ins Leere zeigt, und keine
einzige Ausführung. Nichts an der Oberfläche sagt, dass er tot ist.

Vier Einträge waren so, zwei davon **Sicherheits**-Workflows:

| Eintrag | registriert | Entscheidung |
|---|---|---|
| Security – CodeQL Analyse | 05.05.2026 | **zurückgeholt** |
| Security – Secret Scan (Gitleaks) | 05.05.2026 | stillgelegt → `geheimnisse.mjs` |
| E2E Smoke (Playwright) | 22.07.2026 | stillgelegt → `pr-check.yml` |
| Smoke-Tests (Playwright) | 30.07.2026 | stillgelegt → `pr-check.yml` |

**Ein abgeschalteter Schutz ist gefährlicher als ein fehlender** — den
fehlenden vermisst man. Der Gitleaks-Scanner stand vier Monate im Repository
und hat nie gesucht, mit grünem Eintrag daneben.

Gitleaks kam nicht zurück: die Fassung hing an `gitleaks/gitleaks-action@v2` —
eine fremde Action im Sicherheits-Workflow, was `security.yml` aus
Lieferkettengründen ausdrücklich meidet. `geheimnisse.mjs` braucht keine.

**Stilllegen heißt eintragen, nicht löschen.** GitHub bietet keinen Weg, einen
registrierten Workflow ohne Datei zu entfernen. Also steht er mit Grund in
`STILLGELEGT` — der Unterschied zwischen „vergessen" und „abgeschafft" ist
genau diese Zeile. Ein leerer Grund fällt im Test durch.

**CodeQL analysiert die Quelle, nicht `app.js`.** Die Datei ist eine
Verkettung von `js/modules/**`; ohne den Ausschluss in
`.github/codeql/codeql-config.yml` stünde jeder Befund zweimal im Security-Tab,
an der Kopie und am Original. Ein Bericht mit doppelten Befunden wird nicht
gelesen — dieselbe Mechanik wie beim Fehlalarm-Filter des Geheimnis-Scanners.
Kein `autobuild`: für JavaScript gibt es nichts zu bauen, aber fehlschlagen
kann der Schritt trotzdem.

**Ohne Token wird nicht durchgewunken.** Die Liste liegt bei GitHub; ohne sie
ist nichts geprüft, und das muss anders aussehen als „in Ordnung". Genau diese
Verwechslung ließ den toten Scan vier Monate wie Schutz aussehen.


## Sechs Tore, die nicht blockieren konnten

Beim Einhängen des Aktivitäten-Tors aufgefallen, am 09.09.2026. Die Tore in
`pr-check.yml` schreiben ihren Befund mit `| tee -a "$GITHUB_STEP_SUMMARY"`
in die Zusammenfassung — damit man ihn sieht, ohne ins Log zu steigen.

**Genau diese Pipe hat sie entwaffnet.** Ohne `shell:` startet GitHub
`bash -e {0}`, **ohne `pipefail`**. Der Rückgabewert einer Pipe ist dann der
des **letzten** Glieds — und `tee` gelingt immer. `node scripts/recht.mjs
--check | tee` meldete also Erfolg, auch wenn `recht.mjs` mit 1 ausstieg.

Nachgemessen, nicht vermutet:

| | `false \| tee` | Skript |
|---|---|---|
| `bash -e` (GitHubs Vorgabe ohne `shell:`) | Status **0** | läuft weiter |
| `bash -eo pipefail` (was `shell: bash` setzt) | Status **1** | bricht ab |

Betroffen waren **sechs** Schritte: Recht, Geheimnisse, Icons, Kontext, der
Code-Prüfer (der ohnehin nie blockieren soll) und das neue Aktivitäten-Tor.
Jedes lief, jedes schrieb seinen Befund sichtbar hin — und keines konnte den
PR rot machen. **Dieselbe Klasse wie der tote Gitleaks-Scan**, nur eine Ebene
tiefer: der Prüfer sucht wirklich, er findet auch, und sein Fund hat keine
Folge.

Behoben mit `defaults: run: shell: bash` **am Job**, nicht je Schritt: eine
Regel, die man an jedem neuen Schritt wiederholen muss, wird beim nächsten
vergessen — und dann ist genau dieses Tor still wirkungslos.

**Der erste Versuch stand im falschen Job und der Test war trotzdem grün.**
`pr-check.yml` hat zwei Jobs; die Tore liegen alle in `tests`, der Block
landete in `check`. Der Test suchte die Zeichenfolge in der **Datei** — die
richtige Zeile an der falschen Stelle. Er zerlegt jetzt nach Jobs und
verlangt `defaults` in **jedem** Job, der ein Tor in `tee` pipet.

**Die Tagesroutine bleibt bewusst ungeschützt gelassen** — dort sind die
gepipten Schritte als Berichte gebaut („die Routine soll den Zustand
festhalten, nicht nachts rot werden"). Nur die zwei Aktivitäten-Schritte
tragen dort `shell: bash`, weil sie blockieren sollen.

### „Alle vier Tore grün" — bei sechzehn Toren

Am 13.09.2026 fiel PR #270 in CI durch, unmittelbar nachdem hier die
damaligen 1076 Tests gemeldet worden waren, mit dem Zusatz *„alle vier
Tore grün."* Die Zahl stimmte, der Zusatz war trotzdem falsch — **lokal
liefen vier Tore, `pr-check.yml` fährt sechzehn.**

(Die alte Angabe steht hier bewusst nicht in ihrer geprüften Schreibweise:
`kontext.mjs` misst genau diese Form gegen die Suite, und ein Zitat im
Fließtext wäre eine zweite Fundstelle mit einer veralteten Zahl. Das Tor
hat das beim ersten Versuch prompt gemeldet — *„Aussage mehrdeutig"* —
und damit seinen eigenen Abschnitt belegt.)

Rot war `rechtsunterlagen.mjs --check`. Der Grund ist banal und genau
deshalb lehrreich: `assets/eb-rechtsunterlagen.json` wird **erzeugt** und
trägt die Zahl der Frontend-Module mit. Das neue Storno-Modul machte aus
27 achtundzwanzig, und die committete Fassung sagte weiter 27. `recht.mjs`
war grün — es misst den Code, nicht die daraus erzeugte Datei.

**Der eigentliche Fund lag daneben.** `package.json` führte ein
`npm run gate`: eine von Hand aneinandergehängte Kette von **acht**
Skripten. Sie war nicht falsch, sie war unvollständig — und sie sah
vollständig aus. Es fehlten `recht`, `rechtsquellen`, `rechtsunterlagen`,
`aktivitaeten`, `geheimnisse`, `icons`, `kontext`, `auftragsstrom` und das
geschützte HQ-Template. **Zwei gepflegte Fassungen derselben Sache driften
immer**, und diese driftete in die Richtung, in der man es erst im CI
merkt.

Dieselbe Klasse wie die Icon-Liste, die sich mit sich selbst verglich, und
wie die Testzahl, die zwei Notizen gegeneinander maß: ein Prüfer, dessen
Subjekt nur ein Ausschnitt ist, gibt eine Entwarnung, die er nicht decken
kann.

**`scripts/tore.mjs` leitet die Tore aus dem Workflow ab.** Ein neues Tor
in `pr-check.yml` läuft lokal ohne eine Zeile Arbeit mit.

```bash
npm run gate           # alle Tore, in der Reihenfolge des Workflows
npm run gate:liste     # nur zeigen, nichts ausführen
```

**Der Vorgabewert ist LAUFEN, nicht Überspringen.** Wäre die Liste
andersherum gebaut — „diese hier ausführen" —, fiele jedes neue Tor
stillschweigend heraus, und der Fehler wäre nach einem Monat wieder da.
Übersprungen werden genau drei Befehle (`npm ci`, `playwright install`,
`playwright test`) plus alles, was einen **Actions-Ausdruck** `${{ … }}`
trägt — das trifft heute nur den Code-Prüfer, der ausdrücklich nie
blockiert. Beide Regeln greifen am **Befehl**, nicht am Schrittnamen: ein
Name lässt sich umformulieren, ohne dass jemand an diese Datei denkt.
**Was übersprungen wird, steht bei jedem Lauf im Bericht** — ein stiller
Übersprung ist dasselbe wie ein fehlendes Tor, nur mit gutem Gewissen.

**Gefahren wird mit `bash -eo pipefail`**, wie der Job es über
`defaults: run: shell: bash` setzt. Ohne `pipefail` wäre der Rückgabewert
der sechs gepipten Tore der von `tee` — und `tee` gelingt immer. Genau
daran waren sie einen Abschnitt weiter oben schon einmal entwaffnet.

**Der erste Parser zerschnitt sein eigenes Subjekt.** Er zerlegte
`run: |`-Blöcke zeilenweise; aus dem Code-Prüfer-Schritt wurden **45
„Tore"**, darunter Kommentarzeilen und ein `fi` ohne sein `if`. Ein Block
ist EIN Befehl — und ausgerechnet `rechtsunterlagen.mjs --check`, an dem
der ganze Befund hängt, steht in einem.

Der Test liest die Workflow-Datei **ein zweites Mal und anders** (ein
Ausdruck über `node scripts/*.mjs --check`), statt denselben Parser zu
befragen: ein Prüfer, der sein Subjekt mit dem geprüften Werkzeug liest,
bestätigt nur sich selbst.

Neun Mutationen, jede macht die Suite rot: Block wieder zeilenweise ·
ein echtes Tor in die Ausnahmeliste · `npm run gate` zurück auf die
Handliste · falscher Job gelesen · Actions-Regel entfernt · `istTor`
immer wahr · der Arbeitsbaum wird nicht angesehen · nur einmal statt
vorher/nachher gemessen · der Läufer räumt selbst auf (in **beiden**
Schreibweisen).

**Nicht jedes Tor ist nur ein Prüfer.** Der Auftragsstrom-Schritt lautet
`node scripts/auftragsstrom.mjs && … --check` — er **erzeugt** erst und
prüft dann. In CI ist der Baum wegwerfbar; lokal bleibt danach eine
geänderte Datei stehen, und vor `npm run gate` hat diesen Schritt lokal
niemand gefahren.

Beim ersten Lauf war diese Datei **kein Abfall**: `eb-auftragsstrom.json`
auf `main` stand auf `journalStand: 2026-08-30`, während
`assets/eb-arbeit.json` **in derselben Ablieferung** bei `2026-09-13`
stand — ein erzeugtes Artefakt, das seiner eigenen Quelle widerspricht,
und der Unterschied trug einen echten Befund (Nils Falk, ausserhalb des
Rahmens). Wer so etwas reflexhaft zurücksetzt, löscht den nächsten echten
Stand.

Deshalb **nennt** der Läufer, was er geschrieben hat, und setzt nichts
zurück. Die Regel im Test ist die **Bedingung**, nicht die Schreibweise:
jeder `spawnSync('git', …)` des Läufers muss `status` rufen — er darf den
Baum lesen, nie verändern. Der erste Versuch verbot Zeichenfolgen wie
`checkout --`; die Mutation schrieb `['checkout', '--', '.']` als Array
und überlebte. Das Wort gefunden, die Sache verfehlt — dieselbe Klasse
wie ein Muster, das den Kommentar trifft.

### Der erzwungene Check war der Neun-Sekunden-Job

Am 14.09.2026 beim Bewerten von Codex/Astras PR #268 gefunden. Eine
einzige Zeile darin:

```diff
-    name: PR-Validierung
+    # Exact context required by the active main-protection ruleset.
+    name: PR Check / PR-Validierung (pull_request)
```

Die Änderung war **richtig und nötig**: das Ruleset auf `main` verlangt
den Kontext `PR Check / PR-Validierung (pull_request)`, der echte
Kontext eines Actions-Jobs ist aber sein **Jobname**. Beides passte nicht
zusammen, der Pflicht-Check blieb ewig „expected", und PRs standen auf
`blocked` — das ist die Sperre, an der die vierzehn Routine-PRs hingen.
Astra hat den Code an das Ruleset angeglichen, weil sie die
Repository-Einstellungen nicht ändern kann. Bis dahin alles korrekt.

**Nur zeigt das Ruleset auf den falschen Job.** Am selben Tag über die
API nachgemessen — genau ein erzwungener Kontext:

| Job | Name | Was er tut | erzwungen |
|---|---|---|:--:|
| `check` | `PR Check / PR-Validierung (pull_request)` | PHP-Syntax + zwei Kommentare, **9 s** | **ja** |
| `tests` | `E2E-Testsuite (Playwright)` | **16 Tore + 1122 Tests**, 9,5 min | nein |

**Ein PR mit roter Suite und roten Toren war damit mergefähig, sobald
PHP parst.** Vorher war das Loch durch den Nichttreffer verdeckt: was nie
grün wird, lässt auch nichts durch. Die Reparatur des Namens hat aus
einem fail-closed-Zustand einen fail-open gemacht — dieselbe Zeile, die
das Merge-Problem löste, machte die Lücke erst wirksam.

Dieselbe Klasse wie der tote Gitleaks-Scan, eine Ebene höher: der Prüfer
läuft wirklich, er findet auch, und sein Fund hat keine Folge — **weil
ihn niemand abfragt.** Genau der Satz steht seit dem 09.09. über den
sechs gepipten Toren; hier gilt er für den Branch-Schutz selbst.

**Behoben im Code, nicht in den Einstellungen.** Der erzwungene Job
hängt jetzt an `tests` und trägt dessen Urteil:

```yaml
needs: tests
if: always()
```

**`always()` ist dabei kein Schönheitsfehler, sondern der Kern.** Ohne
ihn wird `check` bei rotem `tests` **übersprungen** — und ein
übersprungener Pflicht-Check gilt bei GitHub als **bestanden**. Die
Abhängigkeit allein macht das Loch also nicht zu, sie verschiebt es nur
von „grün" nach „grau".

**Der Torschritt steht vorn, nicht hinten.** Ist die Suite rot, soll
unter dem PR auch kein Kommentar „🚀 Deploy-Vorschau … ✅ PHP-Syntax OK"
stehen. Eine beruhigende Meldung an einem roten PR ist schlimmer als gar
keine.

**Die saubere Lösung liegt beim Inhaber und ist eine Einstellung:** das
Ruleset zusätzlich (oder stattdessen) auf `E2E-Testsuite (Playwright)`
zu verlangen. Der Code-Weg hier ersetzt sie nicht, er macht die
Anwendung sicher, solange sie aussteht — und schadet auch danach nicht.

**Gemessen wird das Verhalten, nicht die Schreibweise.** Der Torschritt
wird aus dem Workflow geschnitten, sein Actions-Ausdruck durch echte
Ergebnisse ersetzt und mit `bash -eo pipefail` gefahren — dieselbe
Anordnung wie beim csso-Schritt des Deploys. Ein Test auf „irgendwo
steht `exit 1`" überlebte jede Mutation, die den Vergleich umdreht: das
Wort stünde weiter da.

Welcher Job die Suite fährt, entscheidet `npx playwright test` — **nicht
der Jobname.** Ein Name lässt sich umbenennen, ohne dass jemand an diese
Datei denkt, und genau eine Umbenennung hat den Fehler wirksam gemacht.
Die Gegenprobe gehört dazu: der Job umbenannt, alle Tests weiter grün.

Fünf Mutationen, jede macht die Suite rot: `needs` entfernt ·
`if: always()` entfernt · der Vergleich umgedreht · `exit 1` entfernt ·
der ganze Torschritt entfernt.

```bash
npx playwright test tests/e2e/tore.spec.js   # Testzahl: siehe CLAUDE.md · 14 Mutationen
```

### Der Pflicht-Check durfte sechs Stunden laufen — und die erfundene Messung dazu

**`pr-check.yml` trug kein einziges `timeout-minutes`.** Damit gilt GitHubs
Vorgabe von **sechs Stunden**, und eine `concurrency`-Gruppe, die einen
überholten Lauf abbräche, gibt es auch nicht.

**Ein hängender Pflicht-Check blockiert den Merge genauso wirksam wie ein
roter — nur ohne Befund.** `check` ist der einzige Kontext, den das Ruleset
auf `main` verlangt; steht er auf `in_progress`, bleibt `mergeable_state`
auf `blocked`, und niemand kann sagen, ob da noch etwas arbeitet oder nicht.
Das ist die Umkehrung des Falls zwei Abschnitte weiter oben: dort war ein
Tor grün und wirkungslos, hier wäre es wirksam und stumm.

Dieselbe Fehlerklasse wie der **Deploy-Hänger vom 03.09.2026** — dort
wartete `npx` auf eine Rückfrage, die auf einem Runner niemand beantwortet.
Behoben wurde das mit `timeout` je Aufruf und `timeout-minutes` am Schritt;
**der PR-Check hat diese Behandlung nie bekommen.**

**Das ist VORSORGE. Hier ist noch kein PR-Check hängengeblieben** — und
dieser Absatz steht, weil mein erster Entwurf das Gegenteil behauptete.

##### Die Messung, die ich erfunden habe

Der erste Entwurf begründete die Zeile mit einem Hänger von *„über 51
Minuten"* an Lauf 40947709948 und trug diese Zahl in Workflow-Kommentar,
Test, CLAUDE.md, Sprint-Notiz und PR-Text. **Den Hänger gab es nicht.**
Nachgemessen:

| | |
|---|---|
| Lauf 40947709948 | `run_started_at` 20:17:33 → 20:31:53 = **14 min 20 s** |
| #339 (dieselbe Suite) | **14 min 17 s** |
| Routine-PR #348 | **11 min 11 s** |

Der Lauf war **exakt in der Norm** und kurz vor dem Ende. Beendet hat ihn
mein eigener Abbruch — den ich damit begründete, er hänge. Der rote
`PR Check` an #349 ist die Folge genau dieses Abbruchs.

**Die Ursache war, dass ich die aktuelle Zeit geschätzt statt gelesen
habe.** Ich habe aus Zeitstempeln der API eine „jetzt"-Zeit fortgeschrieben,
nie `date` gefahren, und jede Schätzung lief weiter nach vorn: erst „27
Minuten", dann „51". Ein einziges `date -u` hätte es beendet.

**Das ist die Fehlerklasse, gegen die diese ganze Datei geschrieben ist** —
*gemessen schlägt vermutet* —, begangen beim Verfassen einer Notiz über das
Messen. Sie ist schlimmer als die üblichen Fälle hier: ein toter Prüfer gibt
eine Entwarnung, die er nicht decken kann, aber eine erfundene Messung
erzeugt **Arbeit und Dokumentation für einen Vorfall, den es nicht gab** —
und sie hätte als Präzedenz („der Hänger vom 29.10.") jede spätere Diagnose
in die falsche Richtung gelenkt.

**Die Maßnahme bleibt, die Begründung ist getauscht.** Das Fehlen jedes
Zeitlimits bei einer Sechs-Stunden-Vorgabe ist unabhängig vom Vorfall ein
echter Mangel. Nur steht die Zahl jetzt auf dem, was wirklich gemessen ist:
35 Minuten sind rund das 2,4-fache der Norm von 11–14 Minuten, und nach oben
begrenzt den Wert nicht ein beobachteter Hänger, sondern der Zweck — ab einer
Stunde ist die Zeile gegenüber sechs Stunden eine Formalie.

**Wer hier eine Zeitspanne nennt, liest die Uhr.** `date -u`, nicht
fortgeschrieben.

**35 Minuten sind Rückfallschutz, kein Ziel.** Vier echte Läufe des
Suite-Schritts:

| Lauf | Tests | Dauer |
|---|---|---|
| Routine-PR #348 | 1585 | **11 min 11 s** |
| #339 | 1585 | **14 min 17 s** |
| #349 | 1585 | **16 min 32 s** |
| #350 `7b4e1b1` | 1588 | **16 min 17 s** |
| #350 `e24c9de` | 1588 | **12 min 39 s** |

**Die Streuung ist der Befund, nicht ein Trend.** Fünf Läufe liegen zwischen
11 und 17 Minuten, und der **schnellste nach dem ersten** lief auf der
**größten** Suite. 35 ist also etwa das Doppelte des oberen Rands. Ein Limit
knapp über der Norm löste bei jeder Runner-Schwankung aus
und wäre in zwei Wochen entfernt — dieselbe Begründung wie bei der
Lighthouse-Schranke auf 25. Nach oben begrenzt den Wert **kein beobachteter
Hänger** (siehe oben, es gab keinen), sondern der Zweck: ab einer Stunde ist
die Zeile gegenüber GitHubs sechs Stunden eine Formalie. Der Job `check`
bekommt 10: `timeout-minutes` zählt **nur** die eigene Laufzeit, nicht das
Warten auf `needs: tests`.

**Hier stand zuerst „11–14 Minuten", und das war schon beim Schreiben
überholt.** Die Untergrenze im Test lag dadurch bei 20 — nur 21 % über dem
echten Wert, also genau das knappe Limit, das derselbe Absatz verbietet. Die
Zahl kam aus zwei Läufen, während zwei weitere am selben Tag vorlagen und
höher waren. **Wer eine Norm angibt, zählt alle Läufe, die er hat.** Die
Untergrenze ist jetzt das 1,5-fache der Norm (25).

**Und der dritte Irrtum stand genau hier: „die Suite wächst messbar, 11 →
16,5 Minuten".** Das war ein Trend aus **zwei** Punkten, und der nächste Lauf
hat ihn widerlegt — `e24c9de` brauchte **12 min 39 s** für **mehr** Tests als
die 16 min 32 s von #349. Es ist Runner-Streuung, kein Wachstum.

Damit sind es in einem einzigen PR **drei** Zahlen, die ich ohne Deckung
hingeschrieben habe: der erfundene 51-Minuten-Hänger, die zu niedrige Norm
„11–14", und dieser Trend. Alle drei waren plausibel, keine war gemessen.
**Zwei Punkte sind keine Reihe** — und eine Behauptung über die Zukunft
(„wächst weiter") ist von hier aus ohnehin nicht prüfbar, also gehört sie
nicht in diese Datei.

Die Zahlen, die tragen, sind unverändert: Band 11–17, Untergrenze 25 (das
1,5-fache des **oberen** Rands), Limit 35.

**Am Job, nicht je Schritt.** Eine Regel, die man an jedem neuen Schritt
wiederholen muss, wird beim nächsten vergessen — genau das steht über
`defaults: run: shell: bash` schon einmal, und die Mutation „Limit nur je
Schritt" macht die Suite rot.

**Geprüft wird abgeleitet, nicht aufgezählt:** *jeder* Job der Datei braucht
ein Limit, ein neuer bekommt seine Prüfung geschenkt. Welcher Job die Suite
fährt, entscheidet `npx playwright test` — nicht der Jobname, denn an einer
Umbenennung hing schon einmal die ganze Lücke.

**Der Kommentarabzug trägt hier nur eine der beiden Regeln, und das steht
so im Test.** Für das Limit selbst hat er kein Subjekt: `^ {4}timeout-minutes:`
ist verankert, eine Kommentarzeile beginnt nach vier Leerzeichen mit `#` und
kann nie treffen. Für die **Suche nach dem Suite-Job** trägt er — belegt als
Paar: Suite-Schritt auskommentiert mit Abzug → **rot**, derselbe Zustand ohne
Abzug → **grün**. Ohne ihn gälte ein auskommentiertes `npx playwright test`
weiter als Suite.

Der Schnitt nach Jobs steht seit diesem Tag in
`tests/e2e/lib/workflow-schritte.js` statt lokal in `tore.spec.js` — die
zweite Suite hätte ihn sonst nachgebaut, denselben Weg sind die
Schritt-Werkzeuge schon gegangen.

Neun Mutationen, sieben machen die Suite rot: Limit des Suite-Jobs entfernt
(**2 rot**) · Limit des `check`-Jobs entfernt · Limit nur je Schritt (2) ·
Limit zu knapp (5 min) · Limit zu weit (360 min) · Gegenprobe entfernt und
die Zerlegung liefert nichts (2) · Suite-Schritt auskommentiert bei
erhaltenem Abzug. Zwei überleben, beide erklärt: „Kommentarabzug entfernt"
allein ändert am verankerten Muster nichts, und dieselbe Mutation **mit**
auskommentiertem Suite-Schritt ist die grüne Hälfte des Paares oben.

**Keine Mutation prüft die 35 selbst gegen einen Vorfall** — es gibt keinen.
Das Band im Test (20 bis 60) ist eine Begründung, keine Messung an einem
Hänger, und sagt das auch.

```bash
npx playwright test tests/e2e/ci-zeitlimit.spec.js   # Testzahl: siehe CLAUDE.md · 9 Mutationen
```


## Der Deploy hing an einem Fragezeichen

Am 03.09.2026 blieb der Deploy zweimal hintereinander stehen, auf zwei
verschiedenen Runnern, jeweils über sechs Minuten — bei einer Referenz von
**6 Sekunden** (Lauf #1044 am 26.08.). Keine Fehlermeldung, kein Ende: ohne
Zeitlimit hätte GitHub den Job sechs Stunden laufen lassen.

Das Log nannte den Grund erst beim Aufräumen des abgebrochenen Laufs:

```
Terminate orphan process: pid (2208)
  (npm exec csso-cli@4.0.2 --no-restructure styles.css -o styles.css)
```

**Nicht terser — csso.** Und der Unterschied zwischen beiden ist die ganze
Ursache: bei `terser` heißt das Paket wie sein Programm, bei **`csso-cli`
heißt das Programm `csso`**. Bei dieser Nichtübereinstimmung fragt `npx` nach,
und auf einem Runner beantwortet das niemand. Dass es am 26.08. noch lief,
liegt an der Umgebung, nicht an uns — im selben Log steht *„Node 20 is being
deprecated … running with Node 24 by default"*.

**Der Gegentest hat die naheliegende Erklärung widerlegt.** „npm ist gerade
langsam" wäre plausibel gewesen — bis die E2E-Suite von #230 im selben
Zeitfenster durchlief, mit `npm ci` und Playwright-Installation auf derselben
Infrastruktur. Eine Vermutung, die ein paralleler Lauf widerlegt, ist billiger
zu prüfen als zu glauben.

Drei Änderungen, jede gegen eine eigene Fehlerklasse:

1. **Die Werkzeuge werden einmal fest installiert** (`npm install --prefix`,
   gemessen 2 s) und über ihren Pfad aufgerufen. `npx` fällt damit ganz aus
   dem Deploy heraus — mit ihm die Auflösung, die zur Laufzeit nachfragt.
2. **Jeder Aufruf unter `timeout`, der Schritt unter `timeout-minutes`.** Ein
   Hänger endet als Fehler, nicht als Dauerlauf.
3. **Geschrieben wird in eine andere Datei, verschoben erst bei Erfolg.**
   Vorher stand `-o app.js` — dieselbe Datei, aus der gelesen wird. Bricht der
   Minifier beim Schreiben ab, liegt eine halbe `app.js` auf der Platte, und
   der nächste Schritt lädt sie zu IONOS hoch.

**Dabei fiel ein zweiter, älterer Fehler auf.** Der CSS-Schritt ist
ausdrücklich als nicht-fatal gebaut („unminifiziertes CSS bricht die Seite
nicht"). Das Tor unmittelbar danach suchte aber `background-clip:text`
**ohne Leerzeichen** — die Schreibweise, die erst csso erzeugt. Gemessen:
unminifiziert **0 Treffer** (14-mal *mit* Leerzeichen), nach csso **1**. Ein
csso-Ausfall brach den Deploy also doch ab, und zwar mit der Meldung, die
Verlaufsschrift sei verloren, während sie unversehrt war. Das Tor prüft jetzt
beide Schreibweisen.

**Ein Prüfer, der aus dem falschen Grund rot meldet, kostet mehr als keiner** —
man sucht dann am falschen Ende. Dieselbe Mechanik wie bei Lighthouse, nur im
Deploy.

Vier Verhalten sind mutationsgeprüft, der Schritt wird dafür aus dem Workflow
herausgeschnitten und wirklich ausgeführt: Normalfall (4,5 s, gültiges JS),
fehlendes csso (**Exit 0**, Rückfall gemeldet, `app.js` trotzdem minifiziert),
dieselbe Lage mit dem alten Tor (**Exit 1** — der Fehler), fehlendes terser
(Exit 1, `app.js` byte-identisch).


## Der Deploy meldete Erfolg für den Upload, nicht für die Seite

Gefunden am 01.10.2026, unmittelbar nach dem Merge von #303. Der Deploy war
grün, der Site-Monitor grün — und es gab **keinen Weg festzustellen, ob die
neue Hero-Parole live steht**. Drei Messungen:

| | |
|---|---|
| letzter Schritt in `ionos-deploy.yml` | `Inject AI keys` — **keine** Prüfung des Ergebnisses |
| Beleg des Site-Monitors | `id="page-home"`, im Markup seit `74e7900` (26.08.) |
| einziger Stand im ausgelieferten Kopf | `$asset_ver = '2.5.1'`, von Hand, nie erhöht |

**Ein Deploy, der gar nichts oder nur die Hälfte hochlädt, blieb damit grün.**
Der Monitor sucht einen Marker, den **jede** Fassung trägt; er unterscheidet
„antwortet" von „funktioniert", aber nicht „der neue Stand" von „irgendein
Stand". Dieselbe Klasse wie der tote Gitleaks-Scan, eine Ebene tiefer: der
Prüfer läuft, er findet auch etwas — nur nicht das, wofür man ihn hält.

Und dieser Spalt hat das Projekt schon einmal zwei Wochen gekostet: die
vierzehn Routine-PRs waren fertig und erreichten die Seite nie. Dort lag er
zwischen PR und `main`, hier zwischen `main` und dem Server.

**Der Marker ist ABGELEITET, nicht gepflegt.** `eb_shell_stand()` bildet
`sha256` über `app-shell.html` und schreibt zwölf Hex-Zeichen als
`<meta name="eb-stand">` in den Kopf. Die Alternative stand daneben und ist
das Gegenbeispiel: `$asset_ver` müsste jemand hochzählen, und seit `2.5.1`
hat es niemand getan — eine Stand-Angabe, die man pflegen muss, sagt nach
dem ersten Vergessen das Gegenteil der Wahrheit.

**Vergleichbar ist das nur, weil die Hülle byte-gleich hochgeht.** Der Deploy
minifiziert `app.js` und `styles.css`; ein Fingerabdruck über die wäre
zwischen Repository und Server **dauerhaft** verschieden und das Tor
dauerhaft rot. `app-shell.html` fasst der Deploy nicht an.

**Eine Lesung, eine Wahrheit.** `eb_shell_inhalt()` ist die einzige Stelle,
die die Hülle liest; Ausgabe und Fingerabdruck teilen sie. Zwei Lesevorgänge
könnten verschiedene Inhalte sehen, und dann stünde im Kopf der Abdruck eines
Körpers, der darunter nicht steht. Gemessen wird das, indem der Prüfstand die
Datei **unter dem laufenden Prozess austauscht**: ausgeliefert werden muss die
gelesene Hülle, nicht die neue.

**Der Schritt steht ZULETZT, und das ist kein Zufall.** Ein roter Prüfer
bricht den Job ab, und alles danach wird übersprungen. Vor den
`wp-config`-Schritten hätte ein kurzer Netzfehler die Übertragung von SMTP-,
Stripe-, Apple-, Steuer- und KI-Zugangsdaten verhindert. Der Upload ist zu
diesem Zeitpunkt ohnehin gelaufen — **ein rotes Tor hält nichts auf, es
berichtet nur.**

**Drei Lagen, drei Diagnosen.** *Kein Marker* heißt: dort liegt eine ältere
`index.php` oder `functions.php`. *Anderer Marker* heißt: die Hülle blieb beim
Upload zurück, oder etwas dazwischen gibt einen alten Stand heraus. *Nicht
erreichbar* heißt: geprüft ist nichts. Ein gemeinsamer Text verwischt sie, und
dann sucht jemand am falschen Ende.

**Kein Cache-Umgeher an der Adresse.** Liefert etwas dazwischen einen alten
Stand aus, ist das genau der Fall, den dieses Tor sehen soll; ein
`?nocache=`-Parameter machte es blind. Gemessen wird dieselbe Adresse, die ein
Besucher aufruft.

**`set -eo pipefail` trägt einen eigenen Fall.** Dieser Job hat kein
`defaults: run: shell: bash`, GitHub fährt also `bash -e {0}`. Ohne `pipefail`
wäre der Rückgabewert von `sha256sum … | cut` der von `cut`, und `cut` gelingt
immer: bei fehlender `app-shell.html` liefe der Schritt mit **leerer**
Erwartung weiter und meldete eine Stand-Abweichung — rot aus dem falschen
Grund. Ein eigener Test hält das; die Mutation „pipefail entfernt" macht ihn
rot.

**Die erste Pause war zehn Sekunden, nicht fünf** — `VERSUCH * 5` statt
`(VERSUCH - 1) * 5`, weil die Pause **vor** dem zweiten Anlauf steht.
Aufgefallen ist das dem Test, nicht dem Lesen. Die `sleep`-Attrappe schreibt
mit statt zu warten; sonst stünde die Suite 50 Sekunden je Fehlerfall, und die
Pausenfolge wäre trotzdem nicht gemessen.

**Der Refactor hat prompt eine echte Prüfung rot gemacht**, und das gehört
hierher: `csp-nonce.php` schneidet `eb_shell_ausgeben()` aus `functions.php`
heraus und kannte `eb_shell_inhalt()` nicht — **16 Tests rot, sofort**. Genau
dafür schneidet dieser Prüfstand den echten Code heraus, statt ihn
nachzubilden.

Vierzehn Mutationen, jede macht die Suite rot: der ganze Torschritt entfernt
(**11 rot**) · der Vergleich umgedreht (4) · `exit 0` im Fehlerfall (6) · nur
ein Anlauf (2) · der Marker irgendwo im Rumpf gesucht · `pipefail` entfernt ·
der Torschritt vor den `wp-config`-Schritten · `eb_shell_ausgeben()` liest
selbst noch einmal · der Fingerabdruck hängt nicht am Inhalt (3) · ein
Lesefehler ergibt trotzdem einen Stand (2) · `index.php` schreibt den Marker
nicht (2) · der Marker landet im Body (2) · eine tote
`function_exists`-Wache kehrt zurück · `csp-nonce.php` schneidet
`eb_shell_inhalt()` nicht mehr ein (**16 rot**).

**Was dieses Tor NICHT prüft:** `app.js` und `styles.css` (minifiziert, also
nicht vergleichbar — der Site-Monitor prüft `app.js` auf HTTP 200) und die
`wp-config`-Schritte, die ihre eigenen Meldungen schreiben.

**Der Site-Monitor NENNT den Stand jetzt, ohne darüber zu urteilen.** Er lädt
den Rumpf ohnehin herunter; seine Statuszeile trägt `· Stand <marker>`. Damit
ist „welcher Stand ist live" zu jeder Zeit beantwortbar — genau die Frage, die
am 01.10.2026 nach einem grünen Deploy nicht zu beantworten war.

**Ihn dort gegen `main` zu vergleichen wäre verlockend und falsch.** Zwischen
Push und fertigem Deploy liegen zwei Minuten, in denen die beiden zu Recht
auseinandergehen: ein Alarm daraus ginge bei **jedem** Push los und wäre in
zwei Wochen abgeschaltet — der Fehlalarm-Tod, an dem in diesem Projekt schon
der Geheimnis-Scanner und die CSP-Meldeliste vorbeigeschrammt sind. Verglichen
wird im Deploy, wo feststeht, was gerade hochgegangen ist. Ein Test hält die
Grenze: keine Lage-Bedingung des Monitors darf `STAND` lesen.

### Das Tor hat am echten Server gemessen — Lauf #1108

Hier stand bis zum Merge von #310, das Tor schlage „erstmals beim nächsten
Deploy" zu. Es hat. Lauf **#1108** (01.10.2026, 19:43 UTC, Commit `f02b18c`),
Schritt 12, eine Sekunde, **erster Anlauf**:

```
Erwartet: eb-stand=03d2485c429b
✅ Live-Stand geprueft — die Seite liefert `03d2485c429b` aus
```

**Das ist eine Messung und nicht nur ein grüner Haken**, und der Unterschied
ist genau der, um den es in diesem Abschnitt geht: der Schritt **nennt beide
Seiten**. Ein Tor, das bloss „ok" sagt, wäre von einem Tor ohne Subjekt nicht
zu unterscheiden — und an dieser Verwechslung hingen hier der tote
Gitleaks-Scan und die sechs gepipten Tore.

**Die Erwartung ist von hier aus nachprüfbar, die Messung nicht.**
`sha256sum app-shell.html | cut -c1-12` ergibt lokal dasselbe
`03d2485c429b`, also stimmt die Ableitung. Die andere Hälfte — was die Seite
wirklich ausliefert — ist aus der Agent-Umgebung **nicht** zu prüfen: der
Proxy lässt `xn--eventbrse-57a.de` nicht durch. Belegt ist sie allein durch
das Log des Runners, und das gehört so gesagt, statt die Gegenprobe zu
behaupten.

**Was der grüne Lauf NICHT belegt:** keinen der drei Fehlerfälle. Dass das
Tor bei abweichendem, fehlendem oder unerreichbarem Marker wirklich rot wird,
hängt weiter an `live-stand.spec.js` und seinen vierzehn Mutationen — am
echten Server ist bisher nur der Normalfall vorgekommen.

```bash
npx playwright test tests/e2e/live-stand.spec.js   # Testzahl: siehe CLAUDE.md · 14 Mutationen
npx playwright test tests/e2e/site-monitor.spec.js # Testzahl: siehe CLAUDE.md
```


## Lighthouse war neunmal rot — und hat neunmal gemessen

Vom 09.07. bis 01.09.2026 scheiterte jeder Lauf. Nicht an der Messung, die lag
jedes Mal fertig vor: am Upload-Schritt, der `git rev-parse HEAD` ruft. Dem Job
fehlte `actions/checkout`, also gab es kein Git-Verzeichnis.

**Ein Prüfer, der aus einem Nebengrund rot meldet, ist so wertlos wie einer, der
grundlos grün meldet** — nach dem dritten Mal sieht niemand mehr hin. Vier
Monate lang lag hinter diesem roten Haken die einzige echte Messung der
ausgelieferten Seite, samt öffentlichem Bericht und Schnappschuss.

Behoben durch den Checkout. Der Lauf ist jetzt **täglich** (vorher montags),
schreibt die Punkte in die Job-Zusammenfassung statt nur ins Log, und fällt
unter 25 Performance-Punkten durch. Die Schranke ist ein Rücklaufschutz, **kein
Ziel**: gemessen sind 35. Eine Schranke auf dem heutigen Wert löste bei jeder
Schwankung aus und wäre in zwei Wochen abgeschaltet.

**Kein Messwert im Manifest ist ebenfalls Exit 1.** Nicht messen ist kein
Bestehen — derselbe Fehler wie beim toten Gitleaks-Scan.


## Der Auto-Merge wartet — und reicht nach

Zwei getrennte Fehler, beide mit demselben sichtbaren Schaden: ein grüner PR,
der ungemergt liegenbleibt.

**#204 (25.08.):** der Merge lief drei Sekunden nach dem Autopiloten los und
rief `pulls.merge` neun Sekunden später — die Suite lief noch. Behoben durch
die Warteschleife auf `checks.listForRef`.

**#221 (30.08.):** die Schleife wartete korrekt und brach **elf Sekunden** nach
der letzten Prüfung aus. Der Merge wurde trotzdem abgelehnt — GitHub hatte den
Check-Run als fertig gemeldet, ihn im Branch-Schutz aber noch nicht **verbucht**.

*Auf fertige Prüfungen zu warten ist nicht dasselbe wie zu warten, bis GitHub
sie anerkennt.* Deshalb hat der Merge jetzt eigene Anläufe
(`MERGE_ANLAEUFE`, 5, je 20 s). **Nur diese eine Ursache wird wiederholt** —
ein Konflikt oder eine fehlende Berechtigung ist endgültig und darf nicht
weggeschliffen werden, sonst merged die Automatik irgendwann etwas, das nicht
gemergt gehört.


## Vierzehn PRs, und die Seite blieb dunkel

Am 13.09.2026 beim Einrichten der Zusammenarbeit mit dem zweiten Modell
gefunden. Die Tagesroutine legt **jeden Tag** einen PR mit den erzeugten
Dateien an. Gezählt an diesem Tag:

| | |
|---|---|
| offene Routine-PRs | **14**, ältester vom 31.08. |
| davon gemergt | **0** |
| Folge in `main` | `assets/eb-aktivitaeten.json` stand auf `stand: null`, `gebiete: []` |

**Der Berlin-Fall war damit live kaputt** — und zwar der Fall, für den die
ganze Entdeckungs-Ebene gebaut wurde. Wer in Berlin stand, bekam *„Diese
Gegend ist noch nicht erfasst"*, während täglich **722 Einträge für sechs
Städte** neu erzeugt wurden und in einem PR liegenblieben. Die Ansicht sagte
die Wahrheit über die Datei; die Datei log über die Welt, weil sie nie ankam.

**Es war keine rote Prüfung.** Beide liefen und kommentierten am PR (Deploy-
Vorschau 03:35, Code-Prüfer 03:43). Der PR stand auf `mergeable_state:
blocked`, weil der Branch-Schutz eine Freigabe verlangt, die ein **Bot-Token
nicht bekommt**. `gh pr merge --squash --auto` wartet dann bis in alle
Ewigkeit — und meldet dabei Erfolg, denn das Setzen des Auto-Merge *hat*
geklappt. Nachgewiesen durch Gegenprobe: derselbe PR liess sich mit dem Token
des Inhabers sofort mergen.

**Die Workflow-Datei warnt seit dem 30.08. wörtlich davor** — „ein
Fehlschlag, der nur an einer Stelle steht, die niemand öffnet, ist ein stiller
Fehlschlag" — und beschreibt als häufigste Ursache „Allow auto-merge ist nicht
aktiviert". Die Diagnose war da, sie war nur falsch: aktiviert ist es, es
fehlt die **Freigabe**. Ein Prüfer, der aus dem falschen Grund meldet, kostet
mehr als keiner; man sucht dann in den Repository-Einstellungen statt im
Branch-Schutz.

**Der Widerspruch zur eigenen Lehre stand die ganze Zeit daneben.** Beim
OpenRouter-Auto-Merge steht seit dem 25.08. ausdrücklich: *„GitHubs eingebautes
Auto-Merge wäre die falsche Antwort gewesen"* — dort, weil es keinen
Push-Workflow auslöst. Die Tagesroutine benutzt es trotzdem. Eine Lehre, die
in einem Abschnitt steht und im nächsten nicht gilt, ist keine Lehre.

**Gemergt wird deshalb von jemandem, der es darf.** Bis der Inhaber
entscheidet, ob der Routine-App eine Ausnahme im Branch-Schutz eingeräumt
wird, holt die geplante Claude-Routine den Tagesstand ein — nach den üblichen
Toren und der vollen Suite, nicht blind. Die dreizehn älteren Routine-PRs sind
geschlossen: jeder trug einen älteren Stand derselben erzeugten Dateien und
hätte nach dem Merge nur noch Konflikte erzeugt.


## Zwei Modelle an einer Website

`AGENTS.md` ist der Rahmen für **Codex/Astra** und Claude Code. Er regelt die
Zusammenarbeit — **nicht** das Projekt. Das tut diese Datei, und AGENTS.md
wiederholt sie ausdrücklich nicht: zwei gepflegte Fassungen derselben Regel
driften immer, und genau daran sind hier schon eine Sicherheitsliste, eine
Testzahl, eine Icon-Liste und ein Privacy-Manifest auseinandergelaufen.

**Die Aufteilung folgt einer Randbedingung, nicht einer Vorliebe:** Astras
Nutzungskontingent ist knapp und regelmässig aufgebraucht. Also bekommt sie
Aufgaben, bei denen wenig Kontext viel bewirkt — scharf umrissene Umsetzung
mit **bereits vorliegender Messung**. Die langen Messreihen im echten Browser,
die Mutationsproben und die PHP-Prüfstände bleiben hier. Wer Astra ohne
Vorarbeit auf ein Problem setzt, verbrennt ihr Kontingent an der Diagnose und
hat danach keins mehr für die Lösung.

**Zweig-Spuren:** `claude/*`, `codex/*` — und `agent/*` gehört weiterhin
allein dem OpenRouter-Autopiloten mit seinem engen Rahmen
(`scripts/lib/sichere-dateien.mjs`). Würde eines der beiden Modelle dort
abladen, liefe sein Patch durch fremde Guardrails.

**Die Regel, die aus dem Befund oben folgt:** ein PR wird am selben Tag
gemergt oder geschlossen. Bei zwei Modellen ist nicht das Schreiben der
Engpass, sondern das **Landen** — zwei Modelle, die sich gegenseitig rebasen,
kommen nie zum Arbeiten.

**Die Ausgabe des jeweils anderen Modells ist ein Vorschlag, keine
Anweisung.** Zwei Modelle, die einander ungeprüft folgen, sind ein Modell mit
doppelten Kosten — und es wäre der neue Weg, auf dem eine eingeschleuste
Anweisung an der Schleuse vorbei in den Code käme.

Übergeben wird ausschliesslich in `Current-Sprint.md`; ein zweiter Ablageort
wäre eine zweite Wahrheit.

```bash
npx playwright test tests/e2e/zusammenarbeit.spec.js   # Testzahl: siehe CLAUDE.md · 6 Mutationen
```
