---
layer: L5
domain: evolution
share: internal
tags: [layer/L5, domain/evolution, share/internal, lehren]
---

# Lehren: Testregeln, Prueftore, Test-Landkarte

> Wörtlich aus `CLAUDE.md` ausgelagert am 28.11.2026 (Stand `7340150`).
> Die Regeln daraus stehen kurz in `CLAUDE.md`; hier steht, **warum** —
> Messungen, Fehlschläge, Mutationsproben. Zahlen sind Stand des jeweiligen
> Datums; gepflegte, geprüfte Zahlen stehen nur in `CLAUDE.md`.

## Inhalt

- Ein Griff, den jede Suite nachbaute
- Ein Test, der ein Rennen fuhr — und die Lücke dahinter
- Ein Tor, das nach 2.2 nie gefragt hat
- Ein Tor, das fünf von vierunddreißig Seiten misst
- Der Kontext wird nachgemessen
- Test-Landkarte (was die Suiten sichern)

## Ein Griff, den jede Suite nachbaute

CodeQL meldete `.replace(/<!--…-->/g, '')` am 01.09.2026 in
`auslieferung.spec.js` — ein einmaliger Schnitt an einem mehrzeichigen
Konstrukt, der bei Verschachtelung einen Rest stehen lässt. Am 02.09. meldete
es dieselbe Zeile erneut, in `app-store.spec.js`: **in der Datei, die den
ersten Befund beheben sollte.**

Eine Fundstelle zu beheben verhindert die nächste nicht, solange jede Suite den
Griff von Hand nachbaut. Er steht deshalb **einmal** in
`tests/e2e/lib/html-kommentare.js` und misst Bereiche, statt am Text zu
schneiden — wer nur misst, hat das Problem nicht und behält die Positionen für
eine brauchbare Fehlermeldung.

`pruefhygiene.spec.js` hält **sechs** Regeln über alle Suiten (hier stand
„zwei", während schon drei aufgezählt waren — eine Zahl, die ihre eigene Liste
nicht mehr trifft, ist der Anfang derselben Drift, die diese Datei sonst
bekämpft):

- **keine schneidet HTML-Kommentare selbst heraus** (der gemeinsame Griff ist da),
- **keine baut den JS-Kommentar-Entferner selbst nach** — `lib/js-code.js`.
  Diese Regel fehlte bis zum 13.09.2026, und zwar weil der Entferner als
  lokale Kopie **in dieser Datei selbst** stand: die Regel gegen Kopien hatte
  eine Kopie. Sie fand beim ersten Lauf sofort eine zweite — in
  `verbindungen.spec.js` einen Ausdruck, der alles ab einem Doppelslash bis
  zum Zeilenende wegschnitt, also auch mitten aus `'https://api.stripe.com/…'`.
- **keine überspringt sich** (`test.skip`/`test.fixme`) — ein übersprungener
  Test zählt in keiner Bilanz als Fehler,
- **keine fragt einen Host per Teilstring ab** — `lib/url-host.js` vergleicht
  den Hostnamen. `https://boese.example/?ref=js.stripe.com` enthält die
  Zeichenfolge und geht nicht an Stripe; `https://js.stripe.com.boese.example/`
  erst recht nicht.
- **keine verlässt sich auf Playwrights `reducedMotion`-Option** — sie erreicht
  die Seite nicht (gemessen, siehe oben). Der Weg, der trägt, ist
  `page.emulateMedia()` vor dem `goto`, und eine Gegenprobe hält fest, dass er
  weiter wirkt: sonst prüfte niemand mehr Bewegungsreduktion, und alles wäre
  grün.
- **keine baut sich einen Pfad in `os.tmpdir()` selbst** — erlaubt ist
  ausschliesslich `fs.mkdtempSync(path.join(os.tmpdir(), …))`. Dazu der
  Abschnitt unten.

### Acht vorhersagbare Pfade in /tmp, und CodeQL sah genau einen

Am 26.09.2026 meldete CodeQL *„Insecure creation of file in the os temp dir"*
(high) an einer **neuen** Zeile in `steuernummer-deploy.spec.js`: ein aus PID
und Zeitstempel selbst gebauter Name in `os.tmpdir()`. Das gemeinsame
Temp-Verzeichnis ist für alle schreibbar — ein vorhersagbarer Pfad lässt sich
vorbelegen, notfalls als Symlink auf eine Datei, die der Test dann
überschreibt.

**Beim Beheben gezählt: 24 Fundstellen, 16 davon schon sicher, acht nicht** —
`upload` (zweimal), `kern`, `totp`, `gebuehren`, `css-minify`, `radar`
(zweimal). CodeQL sah sie nicht, weil sie nicht im Diff standen. **Das machte
sie nicht sicherer, nur unsichtbar** — dieselbe Mechanik wie bei jedem Prüfer,
dessen Subjekt nur ein Ausschnitt ist.

Vierter Befund dieser Klasse an eigenem Testcode, und wieder gilt der Satz von
oben: eine Fundstelle zu beheben verhindert die nächste nicht, solange jede
Suite den Griff von Hand nachbaut.

**Kein eigener Helfer.** `fs.mkdtempSync()` legt das Verzeichnis atomar mit
0700 und zufälligem Namen an, steht in der Standardbibliothek und war hier
schon an 16 Stellen in Gebrauch. Ein drittes Verfahren daneben wäre selbst die
Drift, gegen die diese Datei gebaut ist. Aufgeräumt wird jetzt das
**Verzeichnis** (`rmSync` rekursiv) statt nur die Datei — vorher blieb bei
`radar` je Lauf ein Paar Dateien liegen.

**Zwei Stellen mussten dabei nachgemessen werden, nicht nur umgeschrieben:**
`radar.spec.js` setzt im erzeugten PHP `define('ABSPATH', __DIR__ . '/')` —
ein anderes Verzeichnis ändert also `__DIR__`; und `kern.spec.js` schiebt den
Pfad in einen **Shell**-Block, der hineinschreibt. Beide laufen weiter (188
Tests der sechs Suiten grün), aber das war eine Messung und keine Annahme.

**Der erklärende Kommentar trägt hier die Regel mit.** Zwei der umgestellten
Stellen nennen `os.tmpdir()` im Kommentar — genau die Form, an der in diesem
Projekt schon viermal eine Prüfung gescheitert ist. Deshalb ist der
Kommentarabzug an dieser Regel nicht Vorsichtsmaßnahme, sondern belegt: die
Mutation „zieht die Kommentare nicht mehr ab" macht sie rot.

Fünf Mutationen, jede macht die Suite rot: `css-minify` zurück auf den selbst
gebauten Pfad · `upload` ebenso · der Kommentarabzug entfernt · die Wache
umgedreht · das Suchmuster trifft nichts mehr (dann greift die **Gegenprobe**,
die verlangt, dass überhaupt Fundstellen gesehen werden — sonst erfüllte man
die Regel, indem man die Messung entfernt).

Geprüft wird **nach Abzug der JS-Kommentare**, zeichenweise statt per
Ausdruck: ein regulärer Ausdruck über Kommentargrenzen wäre genau der Griff,
den die Datei verbietet. Genau daran fielen an einem Tag **vier** Prüfungen —
sie trafen das erklärende Wort im Kommentar statt die Zeile im Code.

Die Wächterdatei ist von ihren eigenen Regeln ausgenommen: ihre Suchmuster
*sind* Code und fänden sich sonst selbst. Die Ausnahme gilt für genau diese
eine Datei; eine Ausnahmeliste, die wachsen kann, wäre der Anfang vom Ende der
Regel.

**Ein 404 steht noch drin:** `/assets/showcase/dj-hero.jpg`.


## Ein Test, der ein Rennen fuhr — und die Lücke dahinter

PR #250 fiel in CI durch: `topbar.spec.js` meldete *„am oberen Rand liegt
`appLoadingOverlay` statt der Navigationsleiste"*. Lokal waren dieselben
955 Tests grün.

**Der Test war seit jeher ein Rennen.** `page.goto()` wartet auf `load`;
`#appLoadingOverlay` liegt auf `z-index: 99999` und verschwindet erst, wenn
Daten und sichtbare Bilder da sind — plus 450 ms Mindestdauer. Lokal war er
zum Messzeitpunkt schon `is-hidden` (gemessen: 2009 ms bis `load`), auf dem
langsameren Runner nicht. Gewonnen hat der Test das Rennen immer, bis ein
weiteres Modul `app.js` etwas länger machte.

**Ein Prüfer, der einen Zwischenzustand misst, prüft die Seite nicht** —
dieselbe Lehre wie bei `leerlauf.spec.js`, nur beim Start statt im Leerlauf.
`warteAufAppBereit()` in `tests/e2e/helpers.js` ist der gemeinsame Griff;
wer misst, was der Nutzer *anfasst*, ruft ihn vorher.

**Die eigentliche Lücke lag daneben.** Beim Nachsehen fiel auf: dass der
Ladeschleier auf der **echten** Seite je verschwindet, prüfte niemand.
`bild-laden.spec.js` misst seine Logik an einer **nachgebauten** Seite —
richtig für die Logik, blind für den Start.

Bleibt er stehen, sieht der Besucher dauerhaft „Eventbörse wird geladen…":
kein Statuscode, kein Page-Error, keine leere Liste. **955 Tests hätten es
nicht bemerkt.** Genau die Schadensart, die hier schon dreimal teuer war —
die Seite sieht heil aus und tut nichts.

Der neue Test misst deshalb am echten Start, mit Gegenprobe (*der Schleier
ist überhaupt da*) und ohne sich mit `opacity` abspeisen zu lassen: was am
oberen Rand liegt, muss danach die Leiste sein. Mutation `__hideAppLoader`
auf „tut nichts" → **8 von 10 Tests rot**.


## Ein Tor, das nach 2.2 nie gefragt hat

Am 10.09.2026 beim Durchgehen der Nutzerpfade am Telefon gemessen. Der erste
Blick war zu grob und musste korrigiert werden — das gehört zur Lehre:

**Falscher Maßstab, falscher Befund.** Gezählt wurden zuerst „16 zu kleine
Bedienelemente" auf dem Board, gemessen an Apples 44 pt. Am **bindenden**
Maßstab (WCAG 2.2 SC 2.5.8: 24×24 px) ist das Board sauber; das kleinste
Element dort misst 31 px und verfehlt nur eine Richtlinie, keine Norm. Ein
Prüfer, der sich im Maßstab irrt, ist gefährlicher als keiner.

**Die echte Fundstelle lag auf der Landeseite:** 25 Galerie-Punkte auf den
Inseratskarten mit **7×7 px** Trefferfläche. axe meldet sie als `target-size`,
Schweregrad `serious` — und es war der einzige WCAG-2.2-Verstoß **auf den fünf
Seiten, die dieses Tor misst**.

**Hier stand „der einzige Verstoß der gesamten Anwendung", und das war
falsch.** Der Satz deckte 34 Seiten, die Messung deckte fünf. Am 15.09.2026
über die übrigen gemessen: **40 verstoßende Knoten, 20 davon `critical`** —
siehe den Abschnitt „Ein Tor, das fünf von vierunddreißig Seiten misst" weiter
unten. Der alte Satz bleibt hier als Protokoll stehen, weil eine
stillschweigend korrigierte Entwarnung aussieht, als hätte sie nie anders
gelautet.

**Die Abstands-Ausnahme greift ausgerechnet hier nicht.** SC 2.5.8 erlaubt
kleinere Flächen, wenn 24-px-Kreise um die Mitten sich nicht schneiden. Bei
12 px Mittenabstand tun sie das. Beide Wege der Norm laufen also auf denselben
Mindestabstand hinaus.

Behoben, ohne das Aussehen zu ändern: der Knopf trägt die Fläche, `::before`
den Punkt. Nachgemessen — Trefferfläche 24×24, sichtbarer Punkt weiter 7×7,
Position 14 px statt 13,5 px vom Kartenrand, Reihe 120 px in einer 363 px
breiten Karte, kein Querscroll.

**Der teurere Befund war das Tor selbst.** `barrierefreiheit.spec.js` fragte
`wcag2a`, `wcag2aa`, `wcag21aa` — die Kriterien der Fassung **2.2** konnte es
damit gar nicht sehen. Nicht falsch gemessen, sondern nie gefragt. Die
Mutationsprobe zeigt es: mit der alten 7-px-Fläche **und** der alten
Kennungsliste laufen alle Tests grün durch, über einen `serious`-Verstoß
hinweg. Genau der Zustand vor der Messung.

Das ist nicht nur Höflichkeit: das **Barrierefreiheitsstärkungsgesetz** gilt
seit dem 28.06.2025 für den elektronischen Geschäftsverkehr und verweist über
EN 301 549 auf den jeweils geltenden WCAG-Stand.

**Neue Kennungsliste → auch der Test dazu.** Ein eigener Test hält fest, dass
`wcag22aa` in `withTags` steht; ohne ihn fiele die Fassung 2.2 beim nächsten
Umbau still heraus, und nichts würde rot. Dazu die Gegenprobe, dass der
sichtbare Punkt **nicht** mitwächst — sonst wäre die Regel dadurch erfüllt,
dass jemand die Punkte aufbläst und die Karten aussehen wie eine Perlenkette.

```bash
npx playwright test tests/e2e/barrierefreiheit.spec.js   # Testzahl: siehe CLAUDE.md · axe über 32 Seiten
```


## Ein Tor, das fünf von vierunddreißig Seiten misst

Am 15.09.2026 bei einer Prüfung von Nutzerfreundlichkeit und Gestaltung
gefunden. `barrierefreiheit.spec.js` führt seine Seiten als Handliste — fünf
Routen, und zwar **abgemeldet**, also `board` und `freunde` in ihrem
Ausgeloggt-Zustand. `app-shell.html` trägt **34** Seiten.

**Die Abdeckung stand an vier Stellen und war viermal verschieden:**

| Stelle | behauptet |
|---|---|
| Kopfkommentar der Suite | „× 6 Kernseiten" |
| `Claude-Kontext.md` | „× 6 Kernseiten" |
| `Testing.md` | „× 4 Seiten" |
| CLAUDE.md (oben) | „der gesamten Anwendung" |
| **gemessen** | **5** |

Keine davon richtig, und die vierte war die teuerste — sie hat aus einer
Messung über ein Sechstel der Anwendung eine Aussage über das Ganze gemacht.
**Dieselbe Klasse wie der tote Gitleaks-Scan:** ein Prüfer, dessen Subjekt nur
ein Ausschnitt ist, gibt eine Entwarnung, die er nicht decken kann. Über
EN 301 549 ist das zugleich ein BFSG-Thema.

Gemessen mit `wcag2a, wcag2aa, wcag21aa, wcag22aa`, beiden Farbmodi,
angemeldet in der Rolle der jeweiligen Seite — 26 der 29 offenen Seiten
(`admin` braucht echte Rechte, `home` und `profile` sind Weiterleitungen):

| | |
|---|---|
| verstoßende Knoten | **40** |
| davon `critical` | **20** |
| betroffene Seiten | 6 — `settings`, `create-listing`, `auftraege`, `business`, `notifications`, `contact` |
| je Regel | `select-name` 14 · `label` 6 · `color-contrast` 20 |

**Alle zwanzig kritischen haben EINE Ursache:** `<label>` steht neben seinem
Feld statt mit ihm verbunden. Am Bildschirm ist alles beschriftet; ein
Screenreader sagt auf `create-listing` sechsmal „Kombinationsfeld" ohne Namen —
auf der Seite, auf der ein Dienstleister sein Inserat anlegt. Einer der sechs
ist `#settings2faToggle`, der Schalter für die Zwei-Faktor-Anmeldung.

**Zwei Texte sind im Dunkelmodus unsichtbar**, beide aus derselben Ursache:
eine Fläche mit fest geschriebener Farbe, die den Farbmodus nicht mitmacht,
und ein Text darauf, der sein Token nimmt.

```
auftraege       #000000 auf #121212  = 1,12 : 1   .btn-link „Erneut versuchen"
create-listing  #e8e8e8 auf #fff8e8  = 1,15 : 1   .create-payout-title
```

Der erste ist der **Ausweg aus einer Störung** — er erscheint nur, wenn das
Laden der Storno-Anträge fehlschlug. Wer ihn braucht, sieht ihn nicht.

**Die Markenfarbe als Text ist der größte Einzelposten:** `#FF385C` auf Weiß
ergibt 3,51 : 1 an sieben Knoten. Die Gegenregel steht seit dem 01.08.2026 in
dieser Datei und wird 23× befolgt — `--primary-text` / `--accent-text` für
Text, `#FF385C` für Flächen und Icons. Es fehlt kein Token, nur seine Anwendung.

**Was axe strukturell nicht sieht:** über einem Verlauf oder Bild meldet es
`incomplete`, nicht `violation`. Genau dort liegen die drei Einstiege der
Landeseite (`rgba(255,255,255,.14)` + `blur(8px)`, also kein eigener Grund) —
bis die Marquee-Bilder da sind, steht Weiß auf Hell. Kein Tor wird das je
melden; es steht deshalb im Vault und nicht in einer Testdatei.

**Der Handgriff am Tor:** `SEITEN` aus den `id="page-…"` ableiten statt
aufzählen. Zwei Dinge gehören dazu, beide teuer gelernt — **angemeldet messen**
(abgemeldet fallen `auftraege`, `business` und `my-listings` auf die Landeseite
zurück) und **nachsehen, welche Seite wirklich aktiv wurde**. Ohne die
Gegenprobe zählt man dieselbe Seite mehrfach und hält das für Abdeckung; genau
daran war die erste Fassung dieser Messung mit **46** statt 40 Knoten falsch.

### Ausgeführt — und die Zahl wurde beim Weiten größer, nicht kleiner

Am selben Tag umgesetzt. Das Tor misst jetzt **32 der 34 Seiten** in beiden
Farbmodi; die zwei übrigen sind nachgewiesene Weiterleitungen (`home` →
`browse`, `profile` → `provider`), deren Ziel selbst gemessen wird. **`admin`
ist dabei** — die Annahme darüber, es brauche „echte Rechte", war falsch:
`isAdmin: true` am Messkonto genügt, nachgemessen.

Und genau das hat die Zahl bewegt. Gemessen wurden **58** Knoten statt 40:

| | |
|---|---|
| 20 `critical` | zehn Bedienelemente ohne Namen (in beiden Modi gezählt) |
| 16 | Weiß auf `#FF385C` am Feed-Kontaktknopf, 3,51 : 1 bei 12 px |
| 3 | im Dunkelmodus unlesbar (1,12 · 1,15 · **1,51**) |
| 9 | Markenfarbe als Text auf hell |
| 10 | Statusfarben ohne Dunkelwert |

Der Unterschied ist **kein Widerspruch, sondern der Subjektwechsel**: vorher
in der Rolle der jeweiligen Seite, jetzt auf JEDER Seite angemeldet — und mit
`isAdmin`. Erst dadurch rendern der Feed-Kontaktknopf und drei
Admin-Bedienelemente, die alle drei kaputt waren. **Eine Abdeckung, die man
weitet, findet mehr; eine Zahl, die dabei sinkt, wäre das verdächtige
Ergebnis.**

Drei Befunde daneben, jeder für sich die bekannte Klasse:

- **`.btn-link` war in KEINER Stylesheet-Datei definiert.** Der Knopf „Erneut
  versuchen" bekam also die Browservorgabe `color: buttontext` = #000. Ein
  Klassenname ist keine Gestaltung — dieselbe Klasse wie `escHtml`, den es
  nicht gab.
- **`release-vision.css` trug einen Dunkelmodus für `[data-theme="dark"]`.**
  Dieses Projekt schaltet über `body.dark-mode`; `data-theme` wird **nirgends**
  gesetzt. Zwei Zeilen mit fertigen, richtigen Dunkelfarben, die nie ein
  einziges Mal gegriffen haben. Zwei Zeilen darüber führen beide Selektoren —
  es war ein Vergessen, kein Entwurf.
- **37 statt 10 Beschriftungen.** axe meldete zehn, weil es bei `<input>` einen
  `placeholder` als Notnamen durchgehen lässt und bei `<select>` nicht. Ein
  Platzhalter verschwindet beim Tippen — genau dann braucht ihn jemand.
  Gemessen wird jetzt die **Bedingung** (jede Formularbeschriftung nennt ihr
  Feld), nicht die zehn Fälle, die axe zufällig sieht.

**Und vier Icon-Ligaturen wären durch die Reparatur erst gefährlich
geworden.** `<label><span class="material-icons-round">auto_awesome</span>
Suche</label>` hat als Textinhalt „auto_awesome Suche". Solange kein `for=`
dastand, kam der Name vom Platzhalter; mit `for=` liest ein Screenreader die
Ligatur vor. `aria-hidden="true"` an genau diesen vier Spans — eine Reparatur,
die man zu Ende messen muss, statt sie zu beschließen.

**Elf Mutationen, neun rot.** `.btn-link` weg · Dunkel-Statusfarben weg ·
zurück auf den toten `[data-theme]` · abgemeldet gemessen · Handliste statt
Ableitung · Ableitung gekürzt · erfundene Weiterleitung · ein `for=` weg ·
`aria-labelledby` am 2FA-Schalter weg.

Zwei überleben, **beide legitim und beide belegt**:

1. **Die drei Dunkelflächen von `create-payout` sind ein Satz.**
   `body.dark-mode .create-payout-notice` (0,2,1) schlägt
   `.create-payout-notice.is-warning` (0,2,0) — jede Zeile einzeln zu
   entfernen ändert nichts, alle drei zusammen machen die Suite rot. Wer die
   erste löscht, weil die anderen dastehen, holt den Befund zurück.
2. **Die Gegenprobe auf die aktive Seite kann sich nicht selbst prüfen.**
   Entfernt man sie *und* misst abgemeldet, ist die Suite grün — über 32
   Seiten, die alle dieselbe Landeseite sind. Mit Gegenprobe ist derselbe
   Zustand rot. Das Paar ist der Beleg, nicht die einzelne Mutation.

**Und die Mutationsprobe selbst hat einmal Schaden angerichtet.** Der erste
Läufer setzte mit `git checkout --` zurück — bei noch nicht committeter Arbeit
löscht das die Arbeit. Die neun Proben danach liefen gegen den alten Stand und
meldeten Unsinn (unter anderem „rot", weil der `-g`-Filter ins Leere lief und
Playwright deshalb mit 1 endet). Gesichert wird jetzt per **Kopie**, der
Läufer prüft am Ende, dass der Baum byte-identisch zurück ist, und ein
Lauf ohne getroffenen Test gilt als **ungültig**, nicht als Treffer.
Dieselbe Lehre wie beim Messgerät, das sein Subjekt verändert.

Vollständig mit allen Kontrastwerten: [[30-Betrieb/Barrierefreiheit-Abdeckung]]
und [[20-System/Frontend/Design-System-Drift]].


## Der Kontext wird nachgemessen

```bash
node scripts/kontext.mjs           # Behauptung und Messung nebeneinander
node scripts/kontext.mjs --check   # CI-Tor (pr-check.yml)
```

Diese Datei ist das erste, was jede Sitzung liest — und war die einzige, die
niemand nachmisst. Am 22.08.2026 waren vier Angaben veraltet: 22 statt 24
Module, 86 statt 101 Routen, „~16 300 Zeilen CSS" statt 17 100, und beim
Messaging „alle 3s" für ein Polling, das längst bei 5 s beginnt.

Die letzte war die teuerste: sie beschrieb eine **Schwäche, die es nicht mehr
gibt**. Wer sie liest, sucht ein behobenes Problem. Ein veraltetes
Steuerungsdokument kostet mehr als gar keins, weil es Vertrauen genießt.

**Findet der Prüfer eine Aussage nicht mehr, ist das ein Fehler — kein
bestandener Test.** Ein Tor, das bei umformuliertem Text stillschweigend
durchwinkt, prüft nichts mehr und sieht dabei grün aus. Wer eine geprüfte
Angabe umformuliert, passt das Muster in `scripts/kontext.mjs` mit an.

### Die Testzahl verglich zwei Notizen miteinander

Am 10.09.2026 aufgefallen, im Prüfer selbst. Sechs Angaben maß er gegen den
Code — die siebte, die **Testzahl**, verglich er zwischen CLAUDE.md und
`Current-Sprint.md` und meldete dann `✓ Testzahl einig`. Zwei Zahlen, beide
von Hand gepflegt, die einander bestätigen. **Nennen beide dieselbe falsche
Zahl, war das Tor grün** — eine Entwarnung über eine Suite, in die es nie
gesehen hat. Dieselbe Klasse wie der tote Gitleaks-Scan, nur im Prüfer, dessen
Aufgabe das Nachmessen ist.

Der Beleg lag schon in der Datei: die Zeilen mit den Suitengrößen sind
**gar nicht** geprüft worden, und zwei davon waren falsch — `social.spec.js`
war mit `44` ausgewiesen bei echten 43, `aasa.spec.js` mit `14` bei echten 18.
Monatelang, mit grünem Haken daneben.

**Gefragt wird jetzt Playwright, nicht die Nachbarnotiz.** `--list` liefert die
Gesamtzahl und die je Datei; beide Dokumente werden dagegen gemessen, und
**jede** `# N Tests`-Zeile in CLAUDE.md ebenso. Der Aufruf kostet 1,4 s und
steht im PR-Check unmittelbar vor `npx playwright test` — die Installation ist
dort ohnehin da.

**Nicht gezählt, sondern gefragt.** Am selben Tag gemessen: ein Ausdruck über
`test(` ergibt 902, Playwright meldet 956. Die Differenz sind Fälle, die in
einer Schleife entstehen
(`topbar.spec.js` fährt denselben über zwei Bildschirmbreiten). Ein Prüfer mit
dieser Zahl läge bei jedem Lauf um 54 daneben — und ein Prüfer, der sich irrt,
ist gefährlicher als keiner.

**Ist die Suite nicht befragbar, ist das Exit 1.** Nicht messen ist kein
Bestehen; sonst gälten wieder stillschweigend die Handzahlen. Hergestellt wird
der Fall an einem **gespiegelten Baum ohne `node_modules`** — Verzeichnisse
echt, Dateien verlinkt, denn ein Verzeichnis-Symlink meldet
`isDirectory() === false` und der PHP-Durchlauf fiele mit „16 Routen zu wenig"
durch: rot aus dem falschen Grund. `node_modules/@playwright` kurz umzubenennen
wäre der bequemere Weg und träfe die parallel startenden Playwright-Arbeiter.

**Kein `npx` — die Lehre vom 03.09.2026 gilt auch hier.** Der erste Entwurf
rief `npx playwright …`; damals blieb der Deploy zweimal über sechs Minuten
stehen, weil `npx` zur Laufzeit **nachfragt**. Aufgerufen wird deshalb die
installierte Datei über den eigenen Node-Prozess.

Das braucht einen **eigenen** Test, und der Grund ist gemessen: der Fehlermodus
von `npx` ist das *Hängen*, nicht das Fehlschlagen — mit `npx` an dieser Stelle
bleiben alle anderen Tests der Datei grün. Gesucht wird die **Aufrufstelle**,
nicht das Wort: der Kommentar daneben schreibt „npx" mehrfach aus, und ein
Muster, das den erklärenden Text trifft statt der Zeile, ist hier schon
mehrfach teuer gewesen. Dazu die Gegenprobe, dass überhaupt noch gemessen wird
— sonst erfüllte man die Regel, indem man die Messung entfernt.

Mutationsgeprüft sind alle fünf Eigenschaften: der Rückfall auf den
Dokumentenabgleich, die ungeprüften Suitenzahlen, das stille Überspringen bei
fehlender Messung, die Rückkehr von `npx` und der Wegfall der Messung selbst.


## Test-Landkarte (was die Suiten sichern)

[Testzahl: siehe CLAUDE.md]: Smoke (alle Routen, 0 Page-Errors), Suche (natürliche
Sätze), Gebühren (centgenau, JS↔PHP-Parität), Wissensbasis (Antworten +
Leckage-Schutz), Zufluss (Quarantäne-Tor + Demo-Feed-Ehrlichkeit),
Verbindungen (HQ-Zugang + Connector-Katalog), Auftragsstrom (Herkunft +
Sicherheitsrahmen), **Recht** (Speicherschlüssel ↔ Cookie-Liste, Einwilligung,
Pflichtseiten, KI-Transparenz), KI-Transparenz (Kennzeichnung in jeder
Ansicht), **Stimme** (Serverstimme, hörbarer Rückfall, HUD-Ringe),
**HQ-Puls** (der Ensemble-Lauf überlebt eine unlesbare Laufzeitspur; ein
Schicht-Ausfall landet wirklich im Journal),
**Autopilot-Guthaben** (ein leeres OpenRouter-Konto stoppt den Lauf tokenfrei,
statt ihn 34-mal in Folge rot zu machen — gemessen an der echten 402-Meldung
aus dem Lauf-Log; ein einzelnes 402 neben einem Schemafehler bleibt ein Defekt,
das Kontoguthaben bindet gegen ein offenes Schlüssel-Limit, und „unbekannt"
sieht nicht aus wie „in Ordnung"),
**Antwortgrenze** (Auftrag und Token-Budget aus einer Zahl),
**Ersatzkette** (eine schweigende Rolle verliert ihre Schicht nicht),
**Auto-Merge** (erst die Prüfungen des PRs, dann der Merge),
**Verbesserungs-Routine** (die Recherche-Schleuse wird für den Agenten gar
nicht ausgecheckt und erscheint im PR trotzdem nicht als Löschung),
**Recherche-Schleuse** (das Tor der Recherche-Routine sieht auch neue,
unverfolgte Dateien und verschobene; das freie Thema erreicht den
Shell-Quelltext nicht; der Agent darf genau einen Bash-Befehl),
**Geheimnisse** (ein gepflanzter Schlüssel fällt auf — im Baum und in der
Historie; ein Verweis auf eine Umgebungsvariable nicht),
**Phantom-Workflows** (was GitHub als aktiv führt, hat auch eine Datei),
**CSP-Nonce** (jedes Inline-Skript trägt eins; die beobachtende Fassung ist
abgeleitet, nicht abgeschrieben; im echten Browser gemessen: ein Nonce ohne
`script-src-attr` legt jeden Knopf still, und die neue Direktive ändert an der
durchgesetzten Fassung nichts), **Auslieferung** (Brotli ergänzt gzip, jede
vorgezogene Schrift wird auch geladen, kein Stylesheet kommt auf zwei Wegen,
eigene Bibliotheken tragen eigene Handles, abbestellt wird nur was nichts
gestaltet),
**Leerlauf** (keine Dauer-Animation läuft auf einem unsichtbaren Element —
gemessen an der gerenderten Startseite, nicht am Zustand nach dem Laden; das
geöffnete Overlay animiert wieder — gedrosselt, nicht gelöscht; die
Schreibmaschine hört nach einer Runde auf; Deko ausserhalb des Bildes hält
an und läuft danach **weiter**, statt von vorn zu beginnen; der Hauptthread
kommt zur Ruhe, wenn niemand etwas tut; **Bewegungsreduktion kostet nie mehr
als der Normalfall** — der Marquee steht dann still, hält keine eigene Ebene
mehr und läuft nach der Rücknahme ohne Neuladen wieder an, und wer die Seite
mit der Einstellung LÄDT, bekommt keine Dauerschleife),
**Site-Monitor** (der Monitor unterscheidet „antwortet“ von „funktioniert“ —
und nennt seit dem 01.10.2026 den ausgelieferten Stand, ohne daraus ein Urteil
zu machen: ein Vergleich gegen `main` ginge bei jedem Push los),
**Live-Stand** (der Deploy prueft, ob die Seite den hochgeladenen Stand
wirklich ausliefert — der Schritt wird aus dem Workflow geschnitten und mit
`bash -eo pipefail` gefahren: ein abweichender Marker nennt beide Staende, ein
fehlender bekommt eine eigene Diagnose, zwoelf Hex-Zeichen irgendwo im Rumpf
sind keiner, nach fuenf Anlaeufen ist Schluss, und bei fehlender
`app-shell.html` wird KEINE Stand-Abweichung behauptet; der Fingerabdruck ist
`sha256` ueber die Huelle und kommt aus derselben Lesung, die sie ausliefert),
**WebP** (an echten Bilddateien: ein Foto wird kleiner, Transparenz überlebt
auch bei einem Paletten-PNG, ein größeres WebP wird gelöscht und vermerkt,
Apache liefert nur bei passendem `Accept` und vorhandener Datei um),
**App Store** (Privacy-Manifest und Vault-Tabelle nennen dieselben Datenarten;
jeder Klickpfad für App Store Connect gibt es bei Apple wirklich; die
Alkoholfrage ist nicht mit „keine" beantwortet, solange die Merkmalsliste
Cocktail-Bar und Bier-Zapfanlage führt; „Age Assurance" bleibt nein, solange
die Registrierung kein Altersfeld hat; die Umstellung des Händlerstatus vor
der EU-Listung bleibt vermerkt, und der Cowork-Auftrag hält bei persönlichen
Daten an; `viewport-fit` und die safe-area-Abstände sind gekoppelt; die
Kontolöschung nach 5.1.1(v) ist noch da),
**Prüfhygiene** (keine Suite schneidet HTML-Kommentare selbst heraus, keine
überspringt sich, keine verlässt sich auf Playwrights `reducedMotion`-Option —
sie erreicht die Seite nicht, und `page.emulateMedia()` tut es; und keine baut
sich einen vorhersagbaren Pfad in `os.tmpdir()` — CodeQL meldete eine von acht
Fundstellen, die übrigen sah es nur nicht),
**Zusammenarbeit** (der Rahmen für zwei Modelle zeigt auf nichts, das es nicht
gibt; er nennt die Bau-Schritte so, wie die Skripte heissen; und er führt
keine Zahl ein zweites Mal, die `kontext.mjs` ohnehin gegen den Code misst),
**Apple-Zuordnung** (ohne gültige Team-ID wird nichts ausgeliefert; das HQ ist
vor dem Auffangmuster ausgeschlossen; die Bundle-ID stimmt mit Capacitor),
**Zahlung laden** (beim blossen Besuch geht nichts an Stripe — im echten
Browser gemessen; der Lader hängt genau ein Skript ein und sperrt die Kasse
nach einem Fehler nicht),
**TestFlight** (die Zwecktexte kommen aus einer Quelle und das Mikrofon
nicht mit; beide Associated Domains, Punycode statt Umlaut; das
Einrichtungsskript liest die erzeugte Info.plist zurueck, statt Erfolg zu
behaupten),
**Topbar** (was auch immer oben steht, die Navigationsleiste liegt darüber —
gemessen an `elementFromPoint`, nicht an `position: fixed`; kein Loch
darunter, auch nicht beim Wiederkommen nach dem Schliessen),
**Rechnungs-Empfänger** (der Mailtext verspricht keinen Empfänger, den
`$recipients` nicht enthält; ein abbestellter Empfänger wird nirgends mehr
zugesagt — auch nicht in der Zahlungs-Vorschau),
**Proxy-Rate-Limits** (eine private Adresse in `REMOTE_ADDR` bezeichnet
niemanden — IP-Eimer werden geweitet, kontogebundene nie),
**Einstiege** (die Landeseite bedient mehr als eine Absicht — jeder Weg
wird geklickt, nicht im Markup gesucht; der Anbieter-Einstieg endet in der
Registrierung, nicht in der Anmeldung),
**Deko** (was ausgeliefert wird, erscheint auch — kein Popper steckt mehr
hinter einem `display: none`, an fünf Breiten gemessen; das Konfetti läuft aus
statt endlos zu kreisen, läuft aber überhaupt erst einmal; die Rundenzahl
steht an einer Stelle, und jeder Konfetti-Punkt hat seinen Streifen),
**Demnächst** (die Seitenleiste zeigt echte Termine aus dem Aktivitäten-Bestand
oder gar keine — ein vergangener Termin steht nie unter „Demnächst", die drei
leeren Fälle sagen Verschiedenes, und fremde Titel kommen als Text an),
**Gebührensatz** (der Provisionssatz kommt vom Server, nicht aus dem Code — bei
einem geänderten Satz stimmen Rechnung UND Text, ein unsinniger Wert wird
abgewiesen, und keine zweite Definition überschreibt ihn),
**Hochzeit aus Bausteinen** (der Baustein-Knopf öffnet die Anbieter-Auswahl
vorgefiltert, und die angelegte Karte landet wirklich AM Baustein — im echten
Browser geklickt, im Projekt nachgesehen; der gewöhnliche Weg verknüpft nichts,
eine abgebrochene Auswahl hinterlässt keine Notiz, und die Herkunft gilt nur
für ihr eigenes Vorhaben),
**Assistent-Kategorie** (eine Zuordnung statt **neun**: die Chips der Suche
sind genau das, was ein Anbieter im Formular wählen kann, und Knöpfe, Icons,
Akkusativ und alle drei Erkenner sind daraus ABGELEITET statt abgeschrieben —
die achte Fassung trug `wellness`, eine Kategorie, die kein Inserat tragen
kann, und beide Fehler, die am Vormittag an den anderen behoben wurden;
64 getippte Sätze treffen ihre Kategorie und 17 harmlose Fragen keine, wobei
jeder Durchlass-Satz begründet, warum ein Wort DRAUSSEN blieb; „pyrotechnik"
ist Pyrotechnik und nicht Technik, „Beschallung für den Saal" ist Technik und
nicht der Saal, „die Lichter funkeln" ist kein Feuerwerk und eine Hostess
kein Moderator; ein unbekannter Key ergibt `null` statt eines erfundenen
Eintrags, und eine erfundene Kategorie aus dem localStorage-Geschmacksprofil
erreicht weder Vorschlag noch Chip; und der Weg hinein wird geklickt —
`navigateTo('browse','dj')` filtert wirklich, ein unbekannter Wert lässt
keinen Chip markiert zurückstehen, und der Knopf nennt die GANZE Zahl, nicht
die drei gezeigten),
**QA-Bot-Kategorie** (der Assistent auf der Landeseite gibt die gefragte
Kategorie an die Suche weiter — geklickt wird der echte Knopf der echten
Antwort und im gefilterten Raster nachgesehen, nicht im Markup: nur `browse`
bekommt sie, ein eigener Unterkanal wird nicht überschrieben, die geteilte
Vorlage wird nicht vergiftet, und die Wissensnotiz nennt genau die Kategorien,
die ein Inserat wirklich tragen kann),
**Assistent-Stimme** (Sprachausgabe und Spracherkennung im echten PHP
ausgeführt, nicht gelesen: eine offene Sprachroute gibt es nicht, der Deckel
hängt am Konto und greift je Minute UND je Tag, zwei Konten teilen ihn nicht,
base64 wird `strict` dekodiert und die Länge VOR dem Dekodieren geprüft, der
Ton wird nie zur Datei, ein Whisper-Phantom wird verworfen — auch mit
grossgeschriebenem Umlaut —, und der Fehlertext der Gegenstelle bleibt drin;
im Browser: beide Knöpfe sind da und bedienbar, die Ausgabe ist AUS bis
jemand sie einschaltet, der Schalter schaltet auch ohne Cookie-Einwilligung
ohne dabei etwas zu speichern, der Vorlesetext ist Prosa statt
Knopfbeschriftung, und es gibt genau EINEN Weg vom Mikrofon in die Antwort),
**Dienstleister-Termine** (das Auftragsboard beantwortet auch das WANN: der
nächste Auftrag steht oben, bei gleichem Tag die frühere Uhrzeit zuerst, und
die Zeit kommt aus `card.times` statt aus dem Spiegel — zwei Einsätze sind
zwei Einsätze, ein offenes Ende bleibt offen; kein Auftrag fällt dabei heraus,
auch keiner ohne Datum, Vergangenes steht getrennt und zuletzt und trägt
weiter seine Knöpfe, und „heute" ist der lokale Tag, nicht der UTC-Tag),
**Aktivität weiterleiten** (aus einem gefundenen Eintrag wird ein gemeinsames
Vorhaben, ohne dass unterwegs etwas verfällt: der Anlass kommt aus der
Kategorie des Bestands statt aus einer zweiten Tabelle, der Ort landet im
Startposten, weil die Gruppe keine Ortsspalte hat, und die Quell-Adresse wird
davon nicht verdrängt — gemessen mit gestellter Sozial-API, ohne die es das
Formular gar nicht gäbe),
**Storno** (der Planer beantragt mit Frist und Begründung, der Dienstleister
entscheidet — im echten PHP ausgeführt: nur der Zahler beantragt und nur bei
bezahlter Buchung, entschieden wird nach DERSELBEN Regel wie erstattet, ein
entschiedener Antrag wird nicht noch einmal entschieden, und die Frist bewegt
kein Geld), **Storno-Ansicht** (der Weg hinein existiert wirklich: Platz in
der Shell, Modul in der Verkettung, Funktionen im echten Browser erreichbar;
die Ansicht entscheidet nichts und maskiert fremden Text erneut),
**Erstattung** (die Rechteprüfung auf dem Geldweg wird im echten PHP
ausgeführt, nicht gelesen: der zahlende Kunde kann seine eigene Zahlung NICHT
einseitig zurückholen, der Anbieter und Admins schon; ein leeres Konto trifft
nie auf ein leeres Ziel; und der Handler ruft die Regel wirklich — gemessen
nach Abzug der Kommentare),
**Kontaktschutz** (der Filter im Chat wird an einem Korpus gemessen, nicht
gelesen: 22 Nachrichten mit Kontaktdaten werden alle geblockt, 32 ehrliche
Verhandlungssätze kommen alle durch — Rechnungs-, Bestell- und Kundennummer
eingeschlossen; fremde Ziffernschriften werden vorher auf ASCII gebracht; und
der Filter wird im Nachrichtenweg wirklich gerufen),
**Seitenrouten** (jede Seite mit `id="page-…"` wird von einer Rewrite-Regel
wirklich getroffen, nicht nur in einer Liste geführt — sonst endet ihr
geteilter Link auf `404.php`; das Untersegment trägt den Einladungslink; die
Regeln sind kein Auffangmuster; und die Regel-Fassung ist aus der Slug-Liste
abgeleitet, damit ein neuer Slug den Flush selbst auslöst),
**Freunde & Gruppen** (die Rechteprüfungen werden im echten PHP ausgeführt,
nicht gelesen: ein Fremder erfährt nicht einmal, dass es die Gruppe gibt; ein
Eingeladener bekommt die Mitgliederliste nicht; der Gesperrte erfährt nichts
und kommt nicht zurück; „owner" ist nicht vergebbar; die Deckel hängen am
Konto, nicht an der Leitung),
**Freunde-Ansicht** (Störung, leer und „nicht angemeldet" sagen drei
verschiedene Sätze; die Oberfläche erfindet keinen Einladungscode),
**Feed-Reiter** (der Radar ist von „Entdecken“ aus erreichbar; Reiter und
Inhalt laufen nicht mehr um die Wette), **Such-Icons** (keine Emojis mehr,
wo Markup möglich ist),
**Icons** (jedes benutzte Symbol löst sich im echten Browser zu einem Glyph
auf), TOTP (RFC-6238-Vektoren, Wiederverwendung, Zeitangriff), **Board-Sync**
(Zusammenführung lokal ↔ Server, Grabsteine), **Board-Zeiten** (Mehrfachzeiten
je Position, Anlegen/Bearbeiten/Ablauf), **Pflichtchecks** (Selbstbuchungs-
schutz, Demo-Toggle, Board-Picker, Listings), Radar (Umkreis, lokale Position,
Migrations-Verhalten), Vision-Release, Kern
(Impuls-Ehrlichkeit + Autonomie + offenes Ensemble), **Barrierefreiheit**
(axe über beide Farbmodi und seit dem 15.09.2026 über **32 der 34 Seiten**,
angemeldet und mit `isAdmin` — die zwei übrigen sind nachgewiesene
Weiterleitungen, deren Ziel selbst gemessen wird; die Seitenliste kommt aus
der Shell, und auf jeder Seite wird nachgesehen, welche wirklich aktiv wurde;
seit dem 10.09.2026 auch WCAG **2.2**; jede Formularbeschriftung nennt ihr
Feld, statt nur daneben zu stehen; die Galerie-Punkte sind 24 px breit und
sehen weiter aus wie 7 px), Design-System,
CSS-Minify. `pr-check.yml` blockiert PRs bei
Fehlern. Die Rechtsablage-Suite prüft zusätzlich private Speicherung,
Versionshistorie, Aufgabenstatus und den amtlichen Quellenmonitor.

**Die Suite läuft ohne Netzzugang vollständig durch.** Bis zum 21.08.2026
schlugen vier Radar-Tests fehl, weil Leaflet von `unpkg.com` kam; seit dem
Self-Hosting liegen alle Bibliotheken im Theme.
