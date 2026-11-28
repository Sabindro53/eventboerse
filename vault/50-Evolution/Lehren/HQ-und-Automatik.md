---
layer: L5
domain: evolution
share: internal
tags: [layer/L5, domain/evolution, share/internal, lehren]
---

# Lehren: HQ, Verbindungen, Autopilot, Auftragsstrom, Stimme

> Wörtlich aus `CLAUDE.md` ausgelagert am 28.11.2026 (Stand `7340150`).
> Die Regeln daraus stehen kurz in `CLAUDE.md`; hier steht, **warum** —
> Messungen, Fehlschläge, Mutationsproben. Zahlen sind Stand des jeweiligen
> Datums; gepflegte, geprüfte Zahlen stehen nur in `CLAUDE.md`.

## Inhalt

- Befund → Arbeit
- Demo-Inhalte & Wissenslücken
- HQ & Verbindungen
- Die Stimme des HQ
- Impuls-Strom messen
- Aufträge aus dem Gespräch
- OpenRouter-Autopilot

## Befund → Arbeit

Die elf Rollen erzeugen Befunde, der Autopilot erzeugt Arbeit. Verbunden sind
sie über den **Auftragsstrom**:

```bash
node scripts/auftragsstrom.mjs           # assets/eb-auftragsstrom.json aus dem Journal
node scripts/auftragsstrom.mjs --check   # Herkunft + Sicherheitsrahmen (CI-Tor)
```

**Erzeugt wird an zwei Stellen, und die zweite fehlte sechs Tage.**
`hq-operations.yml` baut den Strom alle 30 Minuten und lädt ihn per SFTP live
— aber **committet ihn nie**. Die Tagesroutine erneuerte und committete
`assets/eb-arbeit.json`, also die **Quelle**, und nannte den Strom an keiner
Stelle: auf `main` stand am 30.09.2026 eine Quelle vom 30.09. neben einem
daraus erzeugten Artefakt vom 24.09. Es entging dabei **keine Arbeit**
(`auftraege` war beidemal leer) — es entging die **Grenze**: drei Befunde
unter `ausserhalb` fehlten. Seitdem läuft der Schritt auch in der
Tagesroutine, **nach** dem Journal (er liest es) und **ohne `--check`** (die
Routine hält den Zustand fest und wird nicht nachts rot; der Commit kommt erst
danach, ein Tor dort nähme Feed, Selbstcheck und Rechtslage mit). Gemessen
wird die Aufrufstelle im Workflow nach Abzug der YAML-Kommentare
(`tests/e2e/lib/yaml-code.js`) — die wahrscheinlichste Gestalt des Rückfalls
ist „Schritt entfernt, erklärender Kommentar stehengelassen".

Jeder Auftrag nennt seinen Journaleintrag — ein Auftrag ohne Herkunft wäre
erfundene Arbeit. Der Strom kann den freigegebenen Rahmen **nie weiten**: er
führt ausschließlich Dateien aus `scripts/lib/sichere-dateien.mjs`, die sich
Autopilot und Strom teilen statt sie zu kopieren. Was nicht hineinkommt, steht
mit Grund unter `ausserhalb` — eine Schlange, die nur Aufnahmen führt, sieht
aus wie ein Haus ohne Grenzen.

**Stand:** 6 von 11 Schicht-Rollen arbeiten an Dateien innerhalb des
Rahmens. Die übrigen Befunde sind für Menschen, nicht für den Autopiloten.

Der Rahmen umfasst **14 Dateien** (`scripts/lib/sichere-dateien.mjs`). Die
Aufnahmekriterien stehen als Test, nicht als Absatz: höchstens 1200 Zeilen,
8 Auth-, 20 Geld- und 12 Upload-Vorkommen — **im Code gemessen, nicht im
Fließtext**. Eine Erweiterung ist eine Sicherheitsentscheidung des Inhabers.
Nie aufnehmen: `board/`, `core/30-auth.js`, `payments/`.


## Demo-Inhalte & Wissenslücken

```bash
node scripts/demo-feed.mjs              # assets/eb-demo-feed.json (täglich per Routine)
node scripts/demo-feed.mjs --check      # Ehrlichkeit + Reproduzierbarkeit
node scripts/wissensluecken.mjs --datei <hq-export.json>
```

Demo-Beiträge bekommen **nie** eine Erstellzeit unter 10 Tagen — es wurde
nichts gepostet, also darf auch nichts frisch aussehen. Die Wissenslücken
(`eb_kb_misses`) bleiben im Browser; der Export geschieht von Hand über den
EB Circle im HQ (⬇︎-Knopf).


## HQ & Verbindungen

Das HQ (`hq.html`) liegt unter **eventbörse.de/hq** und wird von
`eb_serve_hq()` in `functions.php` nur an Berechtigte ausgeliefert (sonst 404).
Der direkte Theme-Pfad ist in `.htaccess` gesperrt — dort läuft PHP nie.

Seite, Datendateien (`/assets/*.json`, `/audit/*.json`) und **alle** HQ-REST-Routen
fragen dieselbe Funktion **`eb_hq_zugang_offen()`**. Zwei Wege führen hinein:

| Weg | Bedingung | Zweiter Faktor |
|---|---|---|
| Administrator | `manage_options` | nur wenn selbst eingerichtet — dann Pflicht |
| Mitarbeiter | `eb_hq_access` | **immer** — ohne ihn nie |

**Kein zweites Geheimnis.** Wer angemeldet ist, ist ausgewiesen; die WordPress-Sitzung
läuft ohnehin. Vom 15.–20.08. gab es hier einen Generalzugang mit geteiltem Passwort —
wieder entfernt, weil nicht die Anmeldung fehlte, sondern der *Weg* dorthin. Den gibt es
jetzt: Admin-Leiste und Admin-Menü, beide hinter `eb_hq_grundrecht()`. Ein Menüpunkt, der
auf eine 404 führt, verrät nur, dass es `/hq` gibt.

`/hq/mitarbeiter` vergibt Zugänge und bleibt bei `eb_hq_verwaltung_darf` (angemeldeter
Administrator) — strenger als das HQ selbst. Details und die Begründung der Rücknahme:
`vault/40-Governance/Legal/HQ-Zugangswege.md`.

```bash
node scripts/connectors.mjs            # assets/eb-connectors.json (Katalog)
node scripts/connectors.mjs --check    # keine Geheimnisse, kein Zustand im Katalog
node scripts/models.mjs                # assets/eb-models.json (Bereiche + Ensemble)
node scripts/models.mjs --check        # nur offene Modelle, jede Grenze begründet
node scripts/agent.mjs --rolle <id>    # eine Schicht arbeiten lassen (OPENROUTER_API_KEY)
node scripts/agent.mjs --check         # Arbeitsjournal prüfen
```

Die **Mitarbeiter arbeiten wirklich**: `tagesroutine.yml` lässt Lagemelder und
Sortierer laufen, `pr-check.yml` den Code-Prüfer (kommentiert nur, blockiert
nie). Ohne `EB_OPENROUTER_API_KEY` fällt die Schicht aus **und steht als
`uebersprungen` im Journal** — ein Journal, das nur Erfolge führt, sieht aus
wie ein Betrieb ohne Ausfälle. `/hq/chat` lässt den Circle ein echtes Gespräch
führen, ausschließlich aus freigegebenem Wissen.

**Die Laufzeitspur kommt per SFTP, nie aus dem offenen Netz.** `hq-operations.yml`
holte `assets/eb-arbeit.json` per anonymem `curl` — eine Datei, die
`eb_hq_zugang_offen()` bewusst **nicht** herausgibt. Der Abruf konnte nie
gelingen, der Schritt brach hart ab, und weil der Rollen-Schritt kein
`if: always()` trägt, wurde er übersprungen. Vom 23. bis 26.08. hat deshalb
**keine einzige Schicht gearbeitet**, bei rund 50 roten Läufen am Tag.

Der Zustand konnte sich **nicht selbst heilen**: der Schritt, der eine gültige
Spur hochlädt, läuft nur bei geändertem Journal — was ohne Rollen nie geschieht.
Eine Automatik, die ihre eigene Vorbedingung erzeugt und daran scheitert, steht
für immer. Deshalb ist das Vorladen jetzt **nicht mehr tödlich**: ist die Spur
unlesbar, gilt der Stand aus dem Repository und der Lauf geht weiter — sichtbar
vermerkt (`tee`, also Log **und** Summary), nicht still.

**Wer eine geschützte Datei in einem Workflow braucht, nimmt den Weg, über den
sie geschrieben wird** — hier SFTP mit denselben Zugangsdaten. Ein zweiter,
offener Weg hinein wäre die eigentliche Gefahr.

**`mktemp` legt die Zieldatei an — lftps `get` überschreibt sie nicht.** Genau
daran scheiterte der Abruf in den Läufen 905, 906 und 908: alle drei endeten
bei 14 Journaleinträgen (3 aus dem Repo + 11 der Schicht), statt auf 25 zu
wachsen. Nicht Pfad, nicht Rechte, nicht Netz — dem Abruf lag ein Ziel im Weg,
das er nicht anfassen durfte. Behoben mit **`set xfer:clobber on`**; der
eindeutige Name von `mktemp` bleibt. Ein Test bildet die Clobber-Regel eines
echten lftp nach — eine Zeichenketten-Prüfung hätte den Fehler nie gefunden,
denn der Wortlaut war ja korrekt.

**Der Ausfall nennt seinen Grund, nicht nur sich selbst.** Die erste Fassung
meldete „nicht lesbar" und sonst nichts. In den Läufen 905 und 906 blieb das
Journal deshalb beide Male bei 14 Einträgen, statt auf 25 zu wachsen — der
Abruf scheiterte weiter, nur ohne Ursache. Der Schritt schreibt die
lftp-Ausgabe jetzt mit und trennt die zwei Diagnosen: **Abruf fehlgeschlagen**
gegen **geladen, aber kein gültiges Journal**. Das sind verschiedene
Handgriffe; ein gemeinsamer Text verwischt sie.

**Die Bilanz kommt aus dem Journal, nicht aus dem Exit-Code.** `agent.mjs`
steigt bei einer unbrauchbaren Antwort bewusst mit 0 aus, damit ein einzelner
Anbieter nicht die ganze Schicht mitreißt — die Schleife zählte das als
„gearbeitet". Lauf 905 meldete darum **„11 gearbeitet, 0 abgebrochen"**,
während fünf Rollen am Tokenlimit abgeschnitten waren; das Journal wusste es
richtig (9 fertig, 5 fehler). Gezählt wird über die **Zeit** des letzten
Eintrags vor der Schicht, nicht über eine Längendifferenz: das Journal ist bei
`MAX_EINTRAEGE` gedeckelt, und sobald der Deckel greift, wäre eine Differenz
schlicht falsch.

**Ein Exit-Code 0 heißt hier „sauber ausgestiegen", nicht „hat etwas
geliefert".** Wer das verwechselt, baut einen Bericht, der nur Erfolge führt.

### 55 Läufe rot — der Fund wurde gemeldet und trotzdem veröffentlicht

Vom 13.09.2026 02:06 bis zum 14.09. war **jeder** Lauf rot. Nicht weil
etwas ausfiel: **11 von 11 Rollen haben gearbeitet.** Rot war
`agent.mjs --check`, mit genau einer Zeile:

```
⛔ 1 Verstoß(e):
   ✗ Verbotsmuster im Journal: E-Mail-Adresse
```

**Drei Fehler, und sie greifen ineinander.**

**1 · Der Befund war nicht auffindbar.** Bei **400** Einträgen sagt „im
Journal" nichts. Die Stelle liess sich nur über das Rohlog der
Modellantworten finden — deshalb 55 Läufe ohne Behebung. Der Befund nennt
jetzt Rolle und Zeit des Eintrags und einen **maskierten** Ausschnitt
(sechs Zeichen und die Länge). Ausgeschrieben stünde der Fund im nächsten
Log, und Logs sind bei einem öffentlichen Repository öffentlich.

**2 · Die Ausnahme für die eigene Support-Adresse hat nie gegriffen.**
Sie stand als negativer Lookahead am Anfang eines **unverankerten**
Musters:

```js
/(?!kontakt@)[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/
```

Scheitert der Lookahead an Position 0, rückt die Maschine eine Stelle
weiter — und `ontakt@…` erfüllt ihn. Gemessen: die Adresse trifft **ab
Index 1**, im Satz ab 13, im `mailto:`-Link ab 18. Ausgenommen wird jetzt
am **Treffer**, nicht im Muster (`frei: /^kontakt@/i`): erst alles finden,
was wie eine Adresse aussieht, dann die eine erlaubte abziehen. Beide
Hälften sind für sich messbar; ein Ausdruck, der beides versucht, ist es
nicht.

**3 · Der Fund hatte keine Folge — und kam zurück.** Das ist der teure
Teil:

| Schritt | |
|---|---|
| 10 · Journal validieren | **rot** wegen der Adresse |
| 12 · Laufzeitspur veröffentlichen | `if: always()` → lädt **genau dieses Journal** auf den Server |
| nächster Lauf, Schritt 6 | lädt es von dort wieder vor |

Der Prüfer suchte wirklich, fand auch — und das Beanstandete wurde
trotzdem veröffentlicht und kam zurück. Dieselbe Klasse wie der tote
Gitleaks-Scan, hier in ihrer **selbsterhaltenden** Form: die Automatik
erzeugt ihre eigene Vorbedingung und scheitert daran, also steht sie für
immer. Genau das stand schon einmal in dieser Datei, für denselben Puls,
im August.

**Gefiltert wird jetzt im Schreibpfad**, und dort für das **ganze**
Journal — nur so heilt auch die bereits verseuchte Spur vom Server. Ein
beanstandeter Eintrag behält seine Buchhaltung (wer, wann, welches Modell,
was es kostete) und verliert seinen Inhalt; er steht als `gefiltert` da,
nicht als `fertig`. Als erledigte Arbeit gebucht zöge der Auftragsstrom
einen Auftrag aus einem Befund, den es nicht mehr gibt.

**Behalten wird über eine WEISSE Liste.** Eine schwarze müsste jedes
künftige Textfeld nachtragen, und das vergisst man genau einmal — dann
steht der Fund in einem Feld, an das niemand gedacht hat.

**Still filtern wäre dasselbe wie nicht filtern.** Jedes Entschärfen
steht im Log, mit Rolle und Grund, nie mit dem Fund.

**`--check` wird dadurch NICHT schwächer.** Es prüft weiter das rohe
Journal und bleibt der Rückhalt: **Verhindern ist grün, Verseuchung ist
rot.** Ein Tor, das rot wird, obwohl es den Austritt erfolgreich
verhindert hat, wird abgeschaltet — und dann schützt es gar nichts mehr.

**Der Auslöser war keine echte Adresse.** Gemessen: weder der Vault noch
die Wissensbasis enthalten eine Adresse, die das Muster trifft (die
Umlautform `eventbörse.de` trifft es ohnehin nicht). Es war eine vom
Modell **erfundene Beispieladresse** in einer Support-Antwort. Der Filter
hatte recht, dass dort ein `@` steht — und keine Möglichkeit, Prosa von
einem Austritt zu unterscheiden. Deshalb ist Verhindern die richtige
Antwort und Rotwerden die falsche.

**Ein früherer PR nannte die falsche Ursache.** #263 (13.09.) zitierte
einen Satz mit `@eb.de` als den Treffer. Nachgemessen: dieser Satz trifft
das Muster **gar nicht** — ohne Local-Part vor dem `@` greift es nicht.
Eine Diagnose, die plausibel aussieht und nicht nachgemessen wurde, kostet
hier mehr als keine; man sucht dann am falschen Ende.

**Am echten System nachgewiesen, nicht nur am Prüfstand.** Lauf **#1719**
(14.09., 08:06) ist der erste grüne seit dem 13.09. — und sein Log belegt
die Heilung, statt sie bloss nicht zu widerlegen:

```
⚠ Eintrag entschärft — Verbotsmuster: Lina Okafor (2026-09-13T20:05:00.439Z): E-Mail-Adresse
Einträge : 400 · fertig : 377 · uebersprungen : 22 · gefiltert : 1
```

**Die naheliegende Gegenerklärung war, dass der verseuchte Eintrag
einfach aus dem 400er-Deckel gefallen ist.** Sie ist ausgeschlossen, und
zwar zweifach: der Eintrag war noch da — er wird namentlich entschärft —
und zwischen dem letzten roten Lauf (#1718, 07:47) und dem ersten grünen
liegen **19 Minuten**, in denen das Journal um elf Einträge wächst. Bis
ein Eintrag vom Vorabend herausfällt, vergeht rund ein Tag.

Der Unterschied ist nicht akademisch: hielte man einen Eintrag, der von
selbst verschwindet, für eine Behebung, stünde beim nächsten erfundenen
`@` derselbe Dauerausfall wieder da — diesmal mit einem grünen Haken in
der Historie als Beleg, dass es „schon einmal behoben" war.

**Geheilt bleibt geheilt.** Der entschärfte Eintrag trägt seinen Text
nicht mehr; der nächste Lauf findet an ihm nichts zu entschärfen, und
`gefiltert : 1` bleibt als Buchung stehen. Der Test führt genau das aus:
nach **einem** Schreibvorgang ist `--check` grün.

Neun Mutationen, jede macht die Suite rot: Ausnahme entfernt · zurück auf
den kaputten Lookahead · `frei` wird ignoriert · Entschärfen tut nichts ·
nur der neue Eintrag statt des ganzen Journals · still filtern · der
Befund nennt den Eintrag nicht · der Fund im Klartext · `gefiltert` als
`fertig` gebucht.

```bash
npx playwright test tests/e2e/hq-puls.spec.js   # Testzahl: siehe CLAUDE.md · 9 Mutationen
```

### 34 rote Läufe, und die Meldung zeigte auf das Falsche

Am 23.09.2026 war **„🧠 Operationspuls · auto" 34 Läufe in Folge rot**, seit
15:18 UTC, alle fünf bis zehn Minuten einer. Der gemeldete Grund:

```
scout: kein Modell lieferte auswertbares strukturiertes JSON
  qwen3-30b …:       API OpenRouter 402: Insufficient credits
  mistral-small …:   API OpenRouter 402: Insufficient credits
  llama-3.3-70b …:   API OpenRouter 402: Insufficient credits
```

**Kein Modell hatte überhaupt geantwortet.** Die Meldung zeigte auf das
Schema, die Ursache lag auf dem Konto — wer ihr folgt, baut am Prompt herum,
während schlicht das Geld fehlt. *Ein Prüfer, der aus dem falschen Grund rot
meldet, kostet mehr als keiner.*

**Und die Vorprüfung hatte den Fall vorher durchgewunken.** Zwei Zeilen
darüber im selben Log: *„OpenRouter-Schluessel ohne eigenes Limit; Laufbudget
bleibt bei $0.12."* Die Bremse las `limit_remaining` aus `GET /api/v1/key` —
das **Limit dieses Schlüssels**, nicht das **Guthaben des Kontos**. Ohne
eigenes Limit steht dort `null`, und `null` galt als „keine Grenze,
weiterfahren".

Die Warnung stand seit dem 25.08. im Abschnitt darüber — *„`null` bedeutet
bei OpenRouter ‚kein Key-Limit', nicht ‚kein Guthaben'"* — und genau daran ist
die Vorprüfung gescheitert. **Dieselbe Klasse wie der tote Gitleaks-Scan:** ein
Prüfer, dessen Subjekt ein anderes ist als das vermutete, gibt eine Entwarnung,
die er nicht decken kann.

**Kein Geld ist ein Zustand, kein Defekt.** Beide Stellen enden jetzt
tokenfrei als `stopp: 'guthaben'` — derselbe Bau wie beim Tagesbudget, das
diesen Weg seit jeher geht. Bei einem Takt von fünf Minuten wären es sonst
über 140 rote Läufe am Tag, und ein roter Haken, der ohne neue Information
wiederkehrt, ist nach einem Tag niemandes Signal mehr. Sichtbar bleibt er als
`::warning` und im HQ als Budgetstopp.

**Die 402-Wache trägt die Behebung, die Guthabenabfrage ist nur der billige
frühe Ausstieg.** `openrouter.ai` ist aus der Agent-Umgebung nicht erreichbar
und der Schlüssel liegt nur als GitHub-Secret vor — die Antwort von
`/api/v1/credits` ist hier also **nicht gemessen**, sie folgt der Dokumentation.
Der Fehlertext dagegen **ist** gemessen: er steht wörtlich im Lauf-Log. Deshalb
hängt die Behebung an der Wache und nicht an der Abfrage; fällt `/credits` aus,
gilt das Guthaben als unbekannt und der Lauf geht weiter.

**„Unbekannt" darf nicht aussehen wie „in Ordnung".** Genau das tat die alte
Zeile: wahr und trotzdem eine Entwarnung ohne Deckung. Sie heisst jetzt
*„Guthaben UNBEKANNT"* und nennt den Grund des fehlgeschlagenen Abrufs.

**JEDER Fehlschlag muss ein Geldfehler sein, nicht irgendeiner.** Ein
einzelnes 402 neben einem echten Schemafehler bleibt ein Defekt und wird rot —
sonst wäre die Behebung ein Weg, jeden künftigen Fehler hinter einem beliebigen
402 verschwinden zu lassen. Und das Muster ist bewusst **eng**: ein Ausdruck
auf „credits" allein träfe auch einen Modellnamen und jede Prosa-Zeile.

**Der kleinere der beiden Werte bindet.** Ein Schlüssel mit $50 Limit auf einem
leeren Konto darf nichts ausgeben; ein volles Konto hilft einem Schlüssel mit
ausgeschöpftem Limit nicht.

**Offen beim Inhaber:** das OpenRouter-Konto aufladen. Bis dahin stoppt der
Autopilot sauber und arbeitet nicht.

```bash
npx playwright test tests/e2e/autopilot-guthaben.spec.js   # Testzahl: siehe CLAUDE.md · 12 Mutationen
npm run test:agents                                        # dieselben Regeln als schnelles Tor
```

**Der Auftrag darf nicht mehr verlangen, als das Budget hergibt.** Vier von elf
Rollen lieferten in jedem Lauf nichts: der Systemauftrag endet für **alle** mit
„in höchstens 90 Wörtern“, die Budgets lagen aber bei 180–300 Token — in zwei
Dateien gepflegt, ohne dass irgendetwas am Zuschnitt einer Rolle den
Unterschied begründete. Sechs konnten die Anweisung physisch nicht befolgen;
wer es versuchte, wurde abgeschnitten, und der Lauf bezahlte die vollen Token
für nichts.

Beide Zahlen kommen jetzt aus `scripts/lib/antwortgrenze.mjs`: Wortgrenze,
Faktor und abgeleitetes Mindestbudget (derzeit **315**). Der Faktor 3,5 ist der
**obere** Rand des Gemessenen — vier durchgekommene Antworten der Läufe
905/908/910 ergaben 2,61–3,45 Token je deutschem Wort, und **keine** kam über
77 Wörter. Eine knappe Schätzung erzeugte den Fehler unsichtbar neu:
abgeschnitten wird erst im Betrieb.

**Wortgrenze ändern heißt: nur diese eine Konstante ändern.** Ein Test prüft
die Abhängigkeit, nicht die Zahl — eine größere Wortgrenze muss ein größeres
Budget ergeben. Sonst überlebt die Ableitung als festgeschriebene Zahl, und
beim nächsten Verschieben zieht das Budget nicht mit.

**Auch die Obergrenze ist abgeleitet.** Vorher standen zwei unbegründete
Zahlen an zwei Orten: `kern.spec.js` verlangte höchstens 300, `models.mjs`
höchstens 400 — und die 300 lagen **unter** dem, was die 90 Wörter desselben
Auftrags kosten. Die Zusicherung „kleine Antwortgrenze" widersprach der
Anweisung also schon, bevor jemand etwas änderte; sichtbar wurde es erst, als
das Budget stieg. Jetzt gilt ein Viertel Luft über dem Bedarf
(`MAX_ANTWORT_TOKENS`, derzeit 394) — genug für Markdown, ein langes
Kompositum und eine Belegzeile, und wenig genug, dass es eine Grenze bleibt.

**Eine Schicht hat zwei Anläufe, nicht einen.** `agent.mjs` rief genau ein
Modell; bei leerer Antwort oder HTTP-Fehler war die Schicht verloren. Gemessen
an den Läufen 905/910/912 traf das **immer dieselben zwei Rollen**, aus
modellspezifischen Gründen: Timo Rast bekam 3 von 3 Mal eine leere Antwort,
Ben Oduya wurde 3 von 3 Mal abgeschnitten — auch noch bei 315 Token, also
nicht mehr am Budget. Rund 90 bezahlte Aufrufe am Tag ohne Ergebnis.

Der Autopilot wechselt in genau diesem Fall längst das Modell. Der Puls tut
es jetzt auch: eine Schleife über `[eigenes, …ersatzModelle]`, gedeckelt bei
`MAX_MODELLVERSUCHE` (2). Die **Ersatzkette ist eine Liste, nicht elf** — die
Rollen unterscheiden sich in der Aufgabe, nicht darin, wer einspringt.

**Die Kette greift nur in die eigene Belegschaft.** Beide Einträge stehen
ohnehin im Katalog und sind dort `offen` mit Lizenz; `models.mjs` weigert
sich zu schreiben, wenn ein Ersatzmodell fehlt, nicht im Katalog steht, nicht
offen ist oder auf das eigene Modell zeigt. Ein Ausweichweg, der nur im
Fehlerfall benutzt wird, wäre sonst die unauffälligste Hintertür an der
Governance vorbei.

**Ein Ausweichen ist nie unsichtbar.** Der Journaleintrag nennt das Modell,
das wirklich geantwortet hat, führt jeden Fehlversuch unter `versuche` und
bucht die Kosten **aller** Anläufe. Ein Eintrag, der nur den erfolgreichen
Aufruf zeigt, verschweigt, dass eine Rolle ihr Modell verloren hat.

Der Katalog beschreibt **Möglichkeiten**, nie den Verbindungszustand — ob etwas
verbunden ist, entscheidet ausschließlich eine echte Prüfung zur Laufzeit.

`eb_hq_csp_erweitern()` erlaubt `connect-src` GitHub **nur für die /hq-Antwort**.
Ohne das blockiert die CSP jeden GitHub-Aufruf des HQ. Die **Tagesroutine**
(`tagesroutine.yml`, 03:17 UTC) hält Demo-Feed und Selbstcheck
(`audit/latest.json`) frisch.

Der **neuronale Kern** ist die Startseite des HQ: sechs Bereichsknoten im Ring,
in der Mitte der KI-Kreis mit Sprache. Ein Impuls auf einer Bahn entspricht
**einem echten Ereignis** — keine Dauer-Animation, sonst sieht ein
stillstehendes System aus wie ein arbeitendes.


## Die Stimme des HQ

`/wp-json/eventboerse/v1/hq/stimme` erzeugt die Sprachausgabe **serverseitig**
(OpenAI TTS, `gpt-4o-mini-tts`) — der Schlüssel erreicht den Browser nie, es
gehen nur Text hin und fertiges Audio zurück. Opt-in über `EB_OPENAI_API_KEY`.

**Ohne Schlüssel fällt das HQ hörbar auf `speechSynthesis` zurück**, die Stimme
des Betriebssystems. Der Rückfall ist Absicht und muss hörbar bleiben: eine
Sprachausgabe, die still bleibt, ist für den Nutzer nicht von einem Absturz zu
unterscheiden. Das Ergebnis wird einmal gemerkt (`stimmeServer`), sonst kostet
jede Antwort einen Aufruf für einen Schlüssel, den es nicht gibt.

**Neue Stopp-Stelle → `stimmeStoppen()`, nicht `speechSynthesis.cancel()`.**
Sonst spricht die Serverstimme weiter, während das Mikrofon schon wieder zuhört.

Die **HUD-Ringe** am Sprech-Kreis (`.nn-hud-*`) drehen sich **dauerhaft**, im
Ruhezustand aber sehr langsam (34–90 s pro Umdrehung) und gedämpft; bei
`.hoert` drei- bis fünfmal schneller und hell. Das ist eine bewusste Abkehr von
der Regel für die Bahnen — sie trägt hier, weil der Kreis ein **Bedienelement**
ist und kein Zustandsanzeiger. Er behauptet nichts über laufende Arbeit; das
tun die Impulse und der Betriebsbericht.

**Der Unterschied zwischen Ruhe und Zuhören muss groß bleiben** (Faktor > 3) —
sonst wäre die Bewegung wieder das, was sie bei den Bahnen wäre: ein Signal,
das nichts bedeutet. Ein Test prüft genau dieses Verhältnis.

**Kein Mikrofon-Piktogramm in der Mitte** — es saß im Zielbereich, verdeckte
den Kern und doppelte den Knopf in der Kopfzeile.

**Neuer Ring → auch in die `prefers-reduced-motion`-Ausnahme eintragen.** Der
globale Block setzt nur die Dauer auf ~0; eine Endlosrotation steht damit nicht
still, sie flimmert. Genau das passierte den zwei Ringen, die beim Überarbeiten
dazukamen.

Der Fokus ist **rund** (`.nn-hud-fokus` bei `:focus-visible`), nicht der
rechteckige Standardrahmen des Browsers — der lag als blauer Block über der
ganzen SVG-Gruppe. `outline: none` allein wäre falsch: Tastaturnutzer müssen
sehen, wo sie stehen.

**Spracheingabe**: `/wp-json/eventboerse/v1/hq/gehoer` erkennt über Whisper —
ebenfalls serverseitig, ebenfalls Opt-in über denselben Schlüssel. Ohne ihn
greift wieder `SpeechRecognition` des Browsers, die es in Firefox und Safari
**gar nicht gibt**; dort war das Mikrofon vorher wirkungslos. Der Ton wird nie
auf die Platte geschrieben, `base64_decode` läuft `strict`, und die Länge wird
**vor** dem Dekodieren geprüft — base64 ist ein Drittel größer als der Inhalt.

Aufgenommen wird bis zur Stille (900 ms), höchstens 30 s. Wer gar nichts sagt,
bricht nach 6 s ab: 30 Sekunden Stille zu erkennen kostet und liefert nichts.

**Der Kreis darf nicht mit sich selbst reden.** Gemeldet am 22.08.: „redet
einfach so, ohne dass ich was frage" — und dabei immer wieder dieselbe
Board-Notiz. Eine Ursache, drei Verstärker: das Mikrofon ging 120 ms nach der
Sprachausgabe wieder auf (zu kurz für den eigenen Nachhall), es öffnete sich
bei Stille **endlos** neu, und ein einzelnes erkanntes Wort genügt der
Wissensbasis für einen Treffer.

Deshalb führt jetzt **ein** Weg vom Mikrofon zur Frage:
`aeusserungVerarbeiten()`. Sie verwirft den eigenen Nachhall
(`istSelbstgehoert()`, in automatisch geöffneten Runden schon bei einem
einzelnen Wort) und Füllwörter, und `nachhoeren()` hält die Runden-Grenze —
nach `MAX_LEERRUNDEN` wartet der Kreis auf einen Druck. **Nur ein Druck setzt
die Grenze zurück** (`vonHand()`); das in `toggleMic()` zu tun hebt sie auf,
weil das Nachhören dieselbe Funktion ruft.

**Die Antwort muss zur Frage passen.** Am 23.08. beantwortete der Kreis „Was
sind denn die nächsten konkreten Verbesserungen?" mit einer Notiz über
Planungsfehler — allein wegen des Wortes **„sind"** in deren Überschrift.
„Kann ich eine Aufgabe an dir geben?" traf die Suchvorschläge über „an" und
„dir". Vier Ursachen, alle behoben:

1. `ask()` nahm den Treffer aus `topTreffer()` (Schwelle 4, für **Kontext**)
   statt aus `search()` (Schwelle 5, für **Antworten**). Was zum Nachschlagen
   reicht, galt damit als Auskunft.
2. Ein einzelnes Allerweltswort trug eine Antwort. Jetzt braucht es zwei
   Treffer **oder** einen mit mindestens sechs Zeichen.
3. Ein Präfixtreffer im Fließtext zählte wie ein Stichwort (4 Punkte). Jetzt 1,
   und er zählt nicht als vollwertiger Treffer.
4. Deutsche Beugung: „Registrierung" steht nicht in „Wie registriere ich
   mich?". `stammImKopf()` fängt das — aber nur, wenn der Stamm **60 % des
   Wortes** ausmacht, sonst trifft „event-" die „Event-Planer".

**Die Antwort greift die Frage auf** („Ich verstehe das als …"). Vorher begann
sie wörtlich mit einer fremden Überschrift; liegt der Treffer daneben, sieht
man es jetzt sofort, statt es zu überlesen.

**Fragen über den Kreis selbst** („Was macht das HQ?", „Kann ich dir einen
Auftrag geben?") beantwortet `hqOperativeAntwort()`. Sie stehen in keiner
Notiz — die Wissensbasis suchte deshalb irgendetwas.

**Whisper erfindet bei Stille Text.** Es hat mit Untertiteldateien gelernt und
füllt eine leere Aufnahme mit deren Abspann — „Untertitel der
Amara.org-Community", „Vielen Dank fürs Zuschauen". Am 23.08. kam so ein
Phantom als angebliche Frage des Inhabers an und wurde beantwortet; es sah aus
wie eine Gegenfrage des Kreises. `istPhantom()` verwirft sie. Die Liste ist
bewusst **eng**: „Untertitel" pauschal zu sperren nähme eine echte Frage mit.

**Eine Rückfrage geht ans Modell, nicht an die Wissensbasis.** „Und was heißt
das?" trägt kein Stichwort; die Suche fände irgendetwas Schwaches, und die
Antwort passte nicht zur Frage. `istNachfrage()` erkennt solche Sätze — nur
wenn es einen Verlauf gibt — und gibt die letzte Antwort als Bezug mit.

**Freihändiges Dazwischenreden.** Während der Kreis spricht, misst
`mithoerenStarten()` den Pegel; anhaltendes Sprechen übernimmt ohne
Knopfdruck. Das ist dieselbe Anordnung, die am 22.08. das Selbstgespräch
erzeugt hat — offenes Mikrofon während der Ausgabe. Sie ist nur vertretbar
wegen drei Sicherungen: **geeicht** (die ersten 600 ms messen den Ruhepegel,
die Schwelle liegt das 3,5-fache darüber — eine feste Zahl wäre auf dem einen
Gerät taub und auf dem anderen ein Dauerauslöser), **gehalten** (350 ms über
der Schwelle, sonst unterbricht jeder Türknall) und **selbstbegrenzend** (zwei
Übernahmen ohne brauchbare Äußerung schalten es für die Sitzung ab, sichtbar).

Eine Übernahme ruft **nicht** `vonHand()` — das würde die schärfere Echo-Regel
abschalten, und genau dort ist die Echo-Gefahr am größten.

**Ein Druck während der Antwort unterbricht, er beendet nicht.** Vorher schloss
derselbe Druck das ganze Gespräch: man konnte nur warten oder wegwerfen. Der
Kreis heißt währenddessen „unterbrechen", und das Mikrofon läuft mit
`echoCancellation`.

**Neuer Sprachweg → über `aeusserungVerarbeiten()`, nie `setTimeout(toggleMic)`.**
Ein Test prüft, dass es keinen direkten Neustart mehr gibt.

**Neue Stelle, die das Gespräch beendet → `aufnahmeBeenden()` mit aufrufen.**
Ein Mikrofon, das nach dem Beenden weiterläuft, ist ein Datenschutzproblem und
kein Schönheitsfehler.

`/wp-json/eventboerse/v1/hq/probe/{anthropic|openai|openrouter}` prüft die KI-Schlüssel
**serverseitig** — Gültigkeit und Rate-Limit-Kontingent, ohne dass der Schlüssel
den Browser erreicht. Opt-in: nur aktiv, wenn die Server-Konstante gesetzt ist.
Die HQ-Antwort injiziert dafür einen `wp_rest`-Nonce; ohne `X-WP-Nonce` verwirft
WordPress trotz Admin-Cookie die Identität und die Route antwortet 401/403.
`eb-connectors.json` und `audit/latest.json` sind admin-only; öffentlich sind
nur `eb-knowledge.json` und `eb-demo-feed.json`.
Details: `vault/30-Betrieb/Verbindungen.md`.


## Impuls-Strom messen

```bash
node scripts/pulse.mjs   # schreibt vault/00-Kern/Impuls-Strom.md (Ist-Zustand)
```

Zeigt Schichtung, Freigabe-Bilanz, Wissensbasis-Größe, Event-Abdeckung und
Code-Bewegung. Die Notiz wird bei jedem Lauf überschrieben — nicht von Hand
bearbeiten. Architektur & MCP-Ausbau: `vault/30-Betrieb/MCP-Architektur.md`.

Die erzeugte `assets/eb-knowledge.json` **mitcommitten** — sie wird mit dem Theme
ausgeliefert und von `_ebKbSearch()` in `app.js` befragt (QA-Bot und Board-Assistent).
Nie von Hand editieren. Pipeline: `vault/00-Kern/Synergie-Pipeline.md`.


## Aufträge aus dem Gespräch

Ein gesprochener oder getippter Satz, der mit **„Auftrag:", „Aufgabe:",
„notiere", „trag ein"** o. ä. beginnt, wird im EB Circle als Auftrag erkannt
und als **GitHub-Issue** angelegt (Label `aus-dem-hq`, mit Herkunftsvermerk).

Drei Grenzen, alle mutationsgeprüft:

- **Nie ohne Rückfrage.** Spracherkennung verhört sich; ein verhörter Satz darf
  kein Ticket anlegen. Der Auftrag wird gezeigt, erst ein Klick legt ihn an.
- **Nur Issues.** Kein Commit, kein PR, kein Merge, kein Workflow-Start. Ein
  Sprachbefehl, der Code ändern kann, ist eine Angriffsfläche mit Mikrofon.
- **Ohne Token geht nichts verloren.** Der Auftrag steht dann als Text zum
  Kopieren da, mit Grund. Das Schreiben nutzt den PAT aus `sessionStorage`
  (`hq_pat`), den das HQ ohnehin für GitHub führt — keine neue Server-Route,
  kein neues Geheimnis.


## OpenRouter-Autopilot

`scripts/openrouter-agents.mjs` betreibt mittwochs vier getrennte Rollen über
OpenRouter: Scout → Architekt → Implementierer → Reviewer. Ein Lauf darf
höchstens zwei fest freigegebene, kleine Frontend-Dateien und 260 Diff-Zeilen
berühren; Backend, Auth, Zahlungen, Workflows, Netzwerk- und Storage-Pfade sind
hart ausgeschlossen. Kostenlimit: 0,35 USD pro Lauf; hat der verwendete Key
ein eigenes Limit, startet er unter 1 USD Rest nicht mehr. `null` bedeutet bei
OpenRouter „kein Key-Limit", nicht „kein Guthaben".
Eine leere oder nicht parsebare Antwort wird nie angewendet: dieselbe Rolle
wechselt kontrolliert zum nächsten freigegebenen Modell und bucht auch den
fehlgeschlagenen Versuch gegen dasselbe Laufbudget.
Ein Patch darf Schutzkonstrukte nicht **wegnehmen**: entfernte Maskierungen
(`escHtml`), Fehlerbehandlungen, Speicher-Aufräumzeilen, `noopener` oder
Identitätsprüfungen werden gezählt und müssen mindestens genauso oft
zurückkommen. Verschieben ist erlaubt, wegnehmen nicht — die alte Prüfung sah
nur hinzugefügte Zeilen, und `${escHtml(n)}` → `${n}` trifft dort kein
verbotenes Muster.
Das an Provider gesendete JSON-Schema nutzt nur den gemeinsamen Structured-
Output-Kern; feinere Längen-, Mengen- und Risikogrenzen werden danach lokal
deterministisch validiert und lösen bei Verstoß ebenfalls den Rollen-Fallback aus.
Eine Architekturentscheidung `skip` braucht einen substanziellen Grund, aber
keine erfundenen Implementierungsschritte; nur `implement` verlangt Plan,
Invarianten und Verifikation in voller Mindestmenge.
Findet bereits der Scout keinen klaren, risikoarmen Vorschlag, darf er eine
leere Dateiliste liefern. Das beendet den Lauf erfolgreich ohne Patch/PR;
sobald er Dateien nennt, gelten weiter exakt 1–2 Einträge der festen Whitelist.

**Der Auto-Merge wartet auf die Prüfungen des PRs.** Er startete drei
Sekunden nach dem Autopiloten und rief den Merge neun Sekunden später — die
Suite des PRs lief da noch, und GitHubs Branch-Schutz lehnte ab: *„Required
status check … is expected."* Es gab keinen zweiten Versuch, und der Grund
stand nur im Log. #204 lag deshalb **zehn Stunden grün und ungemergt** da.

**GitHubs eingebautes Auto-Merge wäre die falsche Antwort gewesen.** Dann
führt GitHub den Merge aus — und der löst keinen Push-Workflow aus. Der
Deploy, den dieser Workflow am Ende ausdrücklich anstößt, liefe nie: die
Änderung wäre gemergt und nie live. Stattdessen wartet der Workflow selbst,
höchstens 15 Minuten, und meldet den Grund **am PR**, nicht nur im Log.

**Strenger als der Branch-Schutz, mit Absicht:** eine rote Prüfung stoppt den
Merge auch dann, wenn die Regel sie nicht verlangt. Hier wird Code ohne
menschliche Durchsicht gemergt.

Der Autopilot führt Syntax-Gates, Reproduzierbarkeits-Gate und die komplette
Playwright-Suite aus und erstellt erst dann einen PR. `openrouter-auto-merge.yml`
reagiert nur auf einen vollständig erfolgreichen Autopilot-Lauf, ordnet den PR
über die Lauf-ID eindeutig zu und prüft die Dateiliste erneut. Nach dem
Squash-Merge startet er den bestehenden rückholbaren IONOS-Deploy explizit.
Guardrails lokal prüfen:

```bash
npm run test:agents
```
