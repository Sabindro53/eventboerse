---
layer: L5
domain: evolution
share: internal
tags: [layer/L5, domain/evolution, share/internal, lehren]
---

# Lehren: Suche, Kategorien, Aktivitaeten, Radar, Landeseite

> Wörtlich aus `CLAUDE.md` ausgelagert am 28.11.2026 (Stand `7340150`).
> Die Regeln daraus stehen kurz in `CLAUDE.md`; hier steht, **warum** —
> Messungen, Fehlschläge, Mutationsproben. Zahlen sind Stand des jeweiligen
> Datums; gepflegte, geprüfte Zahlen stehen nur in `CLAUDE.md`.

## Inhalt

- Was ist in meiner Nähe los — der Aktivitäten-Bestand
- Die Datei sagt, worüber sie etwas sagt
- Vier Fassungen einer Zuordnung — und die Kette war zweimal durchtrennt
- Die Landeseite bediente eine Absicht von dreien
- Gesuche sahen aus wie Angebote — und die Migration dafür lief nie
- Suchergebnisse lassen sich wieder einklappen
- Eine Adresse, die mit der Route wanderte
- Der Radar auf „Entdecken“ — und ein Wettlauf

## Was ist in meiner Nähe los — der Aktivitäten-Bestand

```bash
node scripts/aktivitaeten.mjs --holen        # abrufen (braucht Netz, läuft in der Tagesroutine)
node scripts/aktivitaeten.mjs --aus roh.json # aus gespeicherten Rohdaten erzeugen
node scripts/aktivitaeten.mjs --check        # CI-Tor (pr-check.yml + Tagesroutine)
```

Schritt 3 der Vision (`vault/10-Produkt/Vision-Plattform.md`): die
Entdeckungs-Ebene an echten Daten beweisen, ohne Vertrag und ohne Kosten.
Zwei Quellen für den Umkreis von 50 km um **acht Städte** (Köln,
Düsseldorf, Dortmund, Berlin, Hamburg, München, Frankfurt, Stuttgart),
beide frei und ohne Schlüssel: **OpenLigaDB** (Heimspiele der ersten und
zweiten Liga, je Stadt über ihren Verein zugeordnet) und
**OpenStreetMap/Overpass** (Kino, Escape-Room, Kletterhalle, Erlebnisbad,
Museum, Zoo, Theater). Ergebnis: `assets/eb-aktivitaeten.json`.


## Die Datei sagt, worüber sie etwas sagt

Bis zum 09.09.2026 kannte der Bestand **einen** Punkt: Köln. Die Ansicht
meldete jedem Besucher ausserhalb dieses Kreises *„im Umkreis von 50 km ist
gerade nichts eingetragen"* — eine **Aussage über die Gegend**, abgegeben
über eine Gegend, in die wir nie gesehen hatten. Wer in Berlin stand, bekam
die Auskunft, in Berlin sei nichts los.

**Dieselbe Fehlerklasse wie der tote Gitleaks-Scan**, nur an der Oberfläche:
eine Entwarnung, die der Prüfer nicht decken kann. Hier ist sie sogar teurer,
weil sie beim Besucher landet und nicht im Log.

`gebiete` in der Datei führt deshalb die Städte, für die **wirklich eine
Antwort vorlag** — nicht die, die wir abfragen wollten. Eine
Absichtserklärung an dieser Stelle wäre wieder eine Entwarnung ohne Deckung.
Ein geplantes Gebiet ohne Overpass-Antwort ist **nicht erfasst**, und seine
Heimspiele fallen mit heraus.

**Eine ausgefallene Stadt schrumpft die Abdeckung nicht.** Overpass antwortet
nicht immer. Fällt der Abruf für Berlin aus, wäre die neue Datei für alle
anderen Gebiete richtig — und für Berlin hiesse sie ab sofort „noch nicht
erfasst". Ein Besucher dort bekäme die Auskunft, wir hätten nie hingesehen,
weil ein fremder Server eine Minute überlastet war. `schreibVerweigert()`
lehnt das ab, genau wie den leeren Abruf: ein Quellenausfall darf keine
Aussage über die Welt werden.

**Ein Ort kann in zwei Antworten stehen.** Köln und Düsseldorf liegen 35 km
auseinander, ihre 50-km-Kreise überlappen. Ohne Entdoppelung bräche
`bestandBauen` mit „doppelte Kennung" ab; ohne die Wahl des **näheren**
Gebiets entschiede die Reihenfolge der Städteliste, welcher Stadt ein Ort
zugeschlagen wird.

**Ein Spiel trägt jetzt die Mitte SEINES Gebiets**, nicht `null`. Vorher fiel
die Ansicht auf die Mitte der ganzen Datei zurück — bei einem Gebiet richtig,
bei acht falsch: ein Heimspiel in München landete im Kölner Umkreis. Die
Koordinate ist mit `ungefaehr: true` gekennzeichnet, sonst sähe eine
Stadtmitte aus wie eine Messung.

**Je Gebiet eine Abfrage, mit Pause.** Acht Städte × sieben Ortsarten in
einem Aufruf wären eine Abfrage, die Overpass zu Recht abweist — und ein
einziger `out`-Deckel über allem schnitte willkürlich ab: die Städte am Ende
der Liste kämen nie vor. Gedeckelt wird stattdessen je Gebiet
(`MAX_JE_GEBIET`, 100, nach Entfernung), denn die Datei geht als Ganzes an
den Browser.

**Facebook und Google Maps stehen bewusst nicht dabei.** Meta hat die
öffentliche Events-API 2018 abgeschaltet — es gibt keinen legalen Weg
dorthin. Google Places liefert Orte *ohne Termine* und verbietet in der
Lizenz ausdrücklich, daraus eine eigene Datenbank zu bauen. Beide standen in
der ursprünglichen Idee; beide tragen nicht.

**Das Skript ist zweigeteilt, und das ist die Lehre aus einer Leiche.**
`scripts/localize-demo-images.mjs` ist fertig, richtig — und **nie gelaufen**,
weil es Netzzugang braucht, den die Agent-Umgebung nicht hat. Hier braucht
nur das **Holen** Netz und läuft in der Tagesroutine; **Umwandeln und
Prüfen** läuft überall, und `--aus` erzeugt aus einer gespeicherten
Rohantwort dieselbe Ausgabe wie der echte Abruf. Die ganze Logik ist damit an
`tests/fixtures/aktivitaeten-roh.json` prüfbar, ohne einen einzigen
Netzaufruf. **Ein Test hält fest, dass die Tagesroutine den Abruf wirklich
ruft** — ohne ihn wäre dies wieder ein Skript, das niemand startet.

**`stand: null` heißt NIE ABGERUFEN**, nicht „nichts gefunden". Der Bericht
sagt es in Worten, und die Erfolgsmeldung nennt die Zahl der geprüften
Einträge: „alles in Ordnung" bei null Einträgen ist keine Entwarnung, sondern
eine leere Liste.

**Ein abgelaufener Termin blockiert nicht.** Er entsteht dadurch, dass die
Tagesroutine eine Weile nicht lief — nicht durch den Diff, in dem der Check
rot würde. Als Beanstandung geführt, machte er den PR eines Unbeteiligten rot
mit einer Meldung, die niemand in seinem Diff wiederfindet; nach dem dritten
Mal wäre das Tor abgeschaltet, und mit ihm die Prüfung auf fehlende Herkunft.
Blockierend ist nur, was derselbe Commit beheben kann — dieselbe Regel wie in
`recht.mjs`. Gemeldet wird er trotzdem.

**Ein leerer Abruf überschreibt keinen gefüllten Bestand.** Eine Antwort mit
200 und ohne Inhalt ist ein Quellenausfall; geschrieben sähe sie auf der
Seite aus wie „heute ist nichts los" — ein leerer Bildschirm, den niemand als
Fehler erkennt. Der Lauf endet dann rot, der alte Stand bleibt.

**Fremder Text ist Daten, nie Markup.** Titel und Ortsnamen kommen von
Fremden und landen in unserer Oberfläche; spitze Klammern und Steuerzeichen
werden entschärft (nicht der Eintrag verworfen), die Länge bei 120 Zeichen
gekappt. Und der Bestand erreicht **die Wissensbasis nie**: `eb-knowledge.json`
speist den KI-Bot, ein OSM-Name darin wäre eine Einladung zur
Prompt-Injektion. `build-knowledge.mjs` liest ausschließlich aus `vault/`,
und ein Test hält beide Richtungen fest.

**Die Datei ist öffentlich** — als dritte neben `eb-knowledge.json` und
`eb-demo-feed.json`. Sie *ist* die Entdeckungs-Ebene; sie zu sperren hieße,
die Funktion zu sperren. Inhalt sind Spielansetzungen und Namen von Kinos aus
zwei öffentlichen Quellen, kein Nutzerbezug, kein Betriebswissen. Die
Freigabeliste wird jetzt **vollständig aufgezählt** geprüft, nicht
stichprobenartig: wer eine vierte Datei öffentlich macht, scheitert an einem
Test und muss die Freigabe begründen.

**Die ODbL verlangt Namensnennung.** Jeder Eintrag führt Quelle, Adresse und
Lizenz mit; das ist Lizenzbedingung, keine Höflichkeit — und zugleich der
Schutz davor, dass ein Eintrag ohne Herkunft erfunden aussieht.

### Ein Versuch je Stadt war einer zu wenig

Der offene Posten hiess *„München und Stuttgart fehlen"*. Am 13.09.2026
nachgemessen, an vier aufeinanderfolgenden Tagesständen — und die Messung hat
die Aufgabenstellung widerlegt:

| Tagesstand | erfasst | fehlt |
|---|---:|---|
| 10.09. | 6/8 | Dortmund, Stuttgart |
| 11.09. | 5/8 | Dortmund, **Berlin**, Stuttgart |
| 12.09. | 7/8 | **Berlin** |
| 13.09. | 6/8 | München, Stuttgart |

**An keinem einzigen Tag waren alle acht da**, und welche fehlten, wechselte
täglich. Der Ausfall ist also **vorübergehend, nicht stadtspezifisch** —
Overpass ist ein gespendeter Dienst und weist unter Last ab (429) oder läuft
in seine eigene Abfragezeit (504).

**Die Wirkung war schlimmer als ein Loch.** *„Diese Gegend ist noch nicht
erfasst"* wanderte von Tag zu Tag durch Deutschland: wer am 12. in Berlin
stand, sah nichts, am 13. plötzlich alles. Eine Aussage über die Welt, die
sich täglich ändert, ohne dass sich an der Welt etwas geändert hat.

Drei Ursachen im Abruf, alle behoben:

- **Genau ein Anlauf je Stadt.** Jetzt `ABRUF_VERSUCHE` (3), mit **wachsender**
  Pause (`ABRUF_PAUSEN_MS`, 5 s → 15 s). Nach einem 429 sofort wieder
  anzuklopfen ist genau das, was den 429 ausgelöst hat.
- **Kein Zeitlimit am Client.** Die Abfrage sagt Overpass
  `[out:json][timeout:90]` — das bindet den Server, nicht uns. Ohne
  `AbortSignal.timeout()` hält ein hängender Aufruf die ganze Tagesroutine
  fest, ohne Fehlermeldung. Dieselbe Fehlerart wie beim Deploy am 03.09.2026.
- **Kein Deckel über den Wiederholungen.** Drei Anläufe × 120 s × acht Städte
  wären fast eine Stunde — eine Behebung, die eine zweite Störung einbaut.
  `ABRUF_BUDGET_MS` (8 min) kürzt deshalb **nur die Wiederholungen**; den
  **ersten** Anlauf verliert keine Stadt.

**Ein 400 wird NICHT wiederholt.** Das ist unsere Abfrage, nicht deren Last.
Sie dreimal zu schicken wäre dreimal derselbe Fehler und dreimal dieselbe
Last für einen Dienst, der sie uns schenkt.

**Die Regel weicht nicht auf.** Ein Gebiet, das nach allen Anläufen keine
Antwort liefert, bleibt „nicht erfasst" — Wiederholen erhöht die Chance, es
ersetzt keine Antwort. Genau das trennt diese Behebung von einer, die den
leeren Fall stillschweigend füllt; die Mutation „leere Liste statt Scheitern"
fällt deshalb durch.

**Der Grund bleibt im Log, nicht in der Datei.** `eb-aktivitaeten.json` geht
an jeden Besucher; eine Fehlermeldung eines fremden Dienstes hat dort nichts
zu suchen. Die Datei sagt weiterhin nur „nicht erfasst" — wahr für jeden
dieser Fälle.

**Geprüft wird das Verhalten, nicht die Konstante.** Ein Test auf
`ABRUF_VERSUCHE === 3` wäre grün, während die Schleife den Wert gar nicht
benutzt. Jeder der sieben Tests zählt echte Aufrufe an einem gestellten
`holer`; `holer` und `warten` sind die einzigen Nähte, und ohne sie müsste
der Prüfstand zwanzig Sekunden schlafen und das echte Overpass befragen.

Sechs Mutationen, jede macht die Suite rot: zurück auf einen Anlauf · auch
ein 400 wird wiederholt · Zeitlimit entfernt · leere Liste statt Scheitern ·
Pause wächst nicht mehr · gar keine Pause.

**Ob es reicht, zeigt der nächste Tagesstand.** Overpass von hier aus
anzufragen ist nicht möglich (der Proxy dieser Umgebung lässt den Host nicht
durch), und drei Anläufe sind eine bessere Chance, keine Garantie. Die Zahl
der erfassten Gebiete steht in jedem Lauf im Bericht.

```bash
npx playwright test tests/e2e/aktivitaeten.spec.js   # Testzahl: siehe CLAUDE.md · an Prüfstücken
```

### Die Ansicht: Reiter „⚡ Jetzt"

`js/modules/search/14-aktivitaeten.js` zeigt den Bestand unter
`/aktuelles/jetzt` — **Demnächst** (Termine, nach Zeit) und **Jederzeit**
(Orte, nach Entfernung). Standort, Umkreis und Stadtwahl kommen aus dem
Radar (`13-event-radar.js`); sie dort ein zweites Mal nachzubauen hiesse,
zwei Fassungen derselben Sache zu pflegen.

**Vier leere Zustände, vier Aussagen.** Das ist der ganze Punkt der
Ansicht — die Sorgfalt des Bestands ist wertlos, wenn hier alles als
leere Liste erscheint:

| Zustand | Was dasteht |
|---|---|
| Abruf fehlgeschlagen | „Die Liste konnte nicht geladen werden" — **Störung**, mit Knopf zum Erneutversuchen |
| `stand: null` | „Noch nichts abgerufen" — kein Fehler, aber auch keine Aussage über die Gegend |
| ausserhalb aller `gebiete` | „Diese Gegend ist noch nicht erfasst" — **Wissenslücke**, mit der Liste der erfassten Städte und einem Knopf in die nächstgelegene |
| erfasst, aber nichts im Umkreis | „Im Umkreis von N km ist gerade nichts eingetragen" — **das** ist die Aussage über die Gegend, plus Angebot, den Umkreis zu weiten |

Der dritte kam am 09.09.2026 dazu und ist der teuerste: vorher stand dort
der vierte, also eine Auskunft über eine Gegend ohne einen einzigen Abruf.

Ein Test misst die **Verschiedenheit** der vier Texte, nicht nur ihr
Vorhandensein: wer sie zusammenlegt, besteht sonst die Einzeltests
weiter, sobald einer den anderen enthält. Gemessen wird dabei die
**Meldung**, nicht die ganze Liste — deren Kopfzeile trägt den Ortsnamen
(„…im Umkreis von Berlin" gegen „…von Köln"), und daran hat die Mutation
„Zweig entfernt" prompt überlebt: beide Fälle sagten dasselbe, der Test
war grün, weil die Überschrift sich unterschied.

**Der Rückfall auf `mitte` zeigt sich nur in der Ferne.** Eine Datei ohne
`gebiete` (vor der Umstellung) bekommt ihre Abdeckung aus `mitte` und
`umkreisKm`. Der erste Test dafür prüfte, dass eine alte Datei **in Köln**
weiter funktioniert — und überlebte das Entfernen des Rückfalls, weil bei
gefüllter Liste die Leermeldung nie gerufen wird und der Standardort
ohnehin Köln ist. Gemessen wird jetzt ausserhalb, wo der Rückfall etwas
ändert.

**Vergangenes filtert die Ansicht, nicht das Tor.** Das Tor lässt einen
alten Abruf durch (er entsteht durch eine ausgefallene Tagesroutine,
nicht durch einen Commit). Ein Spiel von gestern als „was ist jetzt los"
anzubieten wäre trotzdem schlimmer als eine kurze Liste.

**Ein Spiel hat keine Koordinaten** — OpenLigaDB liefert Stadion und
Stadt, nicht Lat/Lon. Gerechnet wird ab der Mitte **seines Gebiets**, und
genau das steht dann dran (`ab Stadtmitte`), wie im Radar. Weglassen wäre
falsch, als Messung ausgeben auch.

**Der Weg zum eigenen Vorhaben steht IMMER da**, nicht nur im leeren Fall.
Der Wunsch hinter dieser Ansicht endet nicht bei einer Liste: *„der Nutzer
weiss nicht, WAS er machen will, sondern DASS er etwas machen will."* Eine
Ansicht, die nur im Scheitern einen Ausweg anbietet, hat ihn als
Trostpflaster gebaut.

**Der Stadt-Knopf spricht über den INDEX, nicht über den Namen.** Der Name
kommt aus einer geladenen Datei und stünde sonst in einem
`onclick`-Attribut — dieselbe Begründung, aus der eine Quell-Adresse nur
bei `https://` verlinkt wird. Und `radarPositionSetzen()` ist der
unterstützte Weg hinein: `_radarPos` selbst zu beschreiben vergisst
`_radarMerken`, und dann ist die Wahl nach dem Neuladen weg.

**Fremder Text wird zweimal entschärft.** Der Generator maskiert, die
Ansicht maskiert erneut — eine ausgelieferte Datei kann veraltet oder
verfälscht sein. Eine Quell-Adresse wird **nur bei `https://`** verlinkt;
ein `javascript:`-href wäre genau die Stelle, an der aus Daten Code wird.

**Markierung und Inhalt müssen übereinstimmen.** Der erste Entwurf des
Deep-Link-Tests prüfte nur URL und Reiter — beide setzt der Router. Nimmt
man `renderFeed()` die Weiche, bleibt der Reiter markiert und darunter
stehen die Inserate von „Für dich": grüner Test, falsche Seite. Das ist
der Fehler vom 31.08.2026 eine Ebene höher.

```bash
npx playwright test tests/e2e/jetzt-ansicht.spec.js   # Testzahl: siehe CLAUDE.md · echter Browser
```

### „Demnächst" nannte drei Termine, die es nie gab

Am 14.09.2026 in der Feed-Seitenleiste gefunden. `renderSidebarUpcoming()`
lieferte eine **fest verdrahtete** Liste unter der Überschrift
*„Demnächst"*:

```
🎸 Rock Festival Berlin  · 12. Sep 2026
💒 Hochzeitsmesse Köln   · 20. Sep 2026
🎉 Oktoberfest Opening   · 19. Okt 2026
```

Gemessen: die Funktion wird bei **jedem** Feed-Rendern gerufen,
`#sidebarUpcoming` steht in der Shell — und **der erste Eintrag lag an
diesem Tag bereits in der Vergangenheit.**

Das ist die Fehlerklasse mit einer Zutat mehr: **eine Liste, die mit der
Zeit unwahr wird, ohne dass jemand etwas ändert.** Ein toter Prüfer
bleibt immerhin gleich falsch; dieser Block verschlechtert sich von
selbst, und niemand bekommt eine Meldung.

**Der Bestand lag die ganze Zeit daneben.** `assets/eb-aktivitaeten.json`
führt 954 Einträge aus acht Gebieten, täglich erneuert, mit Datum, Ort und
Quelle — gebaut, geprüft, ausgeliefert. Es fehlte allein die Verbindung.

**Die Funktion steht jetzt in `search/14-aktivitaeten.js`**, nicht mehr in
`board/42-guide-social-feed.js`: dort liegt der Bestand. Ein zweiter Lader
wäre eine zweite Wahrheit, und `ebAktivitaetenImUmkreis()` wirft
Vergangenes und Abgesagtes ohnehin heraus. Die alte Stelle trägt jetzt den
Befund statt der Liste — **und eine Warnung**: wer sie dort neu anlegt,
gewinnt in der Verkettung, und die erfundene Liste wäre zurück.

**Die Karte ist schmal, die Meldungen sind kurz — aber verschieden.**
„noch nicht abgerufen", „Gegend nicht erfasst" und „nichts im Umkreis"
sind drei Aussagen, nicht eine. Sie zusammenzuziehen macht die Sorgfalt
des Bestands wieder unsichtbar: *„nichts eingetragen"* behauptet, wir
hätten nachgesehen.

**Diese Karte LIEST den Radar, sie steuert ihn nicht.** Der erste
Entwurf rief `radarPositionSetzen()`, wenn noch keine Position bekannt
war — abgeschrieben aus `renderFeedJetzt()`, wo genau das richtig ist.
Hier ist es falsch: `renderFeed()` ruft die Seitenleiste **vor** der
Radar-Ansicht, und der Radar ist geteilter Zustand.

**Gemeldet hat es ein fremder Test.** *„Marker-Popups bleiben im Dark
Mode deutlich lesbar"* in `radar.spec.js` fiel in **zwei von drei**
Läufen aus, weil `feedRadarFocus(0)` danach auf einen anderen Marker
zielte. Nachgemessen auf `main`: derselbe Test dreimal grün. Eine
Nebenwirkung, die als Flackern eines fremden Tests auftritt, ist die
unauffälligste Sorte Schaden — und die naheliegende Erklärung („Flake")
wäre hier falsch gewesen.

Ohne bekannte Position rechnet die Karte deshalb **lokal** ab dem ersten
erfassten Gebiet und schreibt nichts zurück.

Sechs Mutationen, jede macht die Suite rot: die erfundene Liste kehrt als
zweite Definition zurück (**alle sieben rot**) · der Vergangenheitsfilter
fällt weg · kein Deckel bei drei · fremder Titel unmaskiert · alle leeren
Fälle sagen dasselbe · die Seitenleiste setzt den Radar wieder.

**Und die sechste Kommentar-Falle des Tages war vorhergesehen.** Der Test
„die drei erfundenen Termine sind aus dem Code verschwunden" sucht genau
die Namen, die der Befund oben im Kommentar nennt. Gemessen wird deshalb
von vornherein nach Abzug der Kommentare — an diesem Tag war das der
sechste Fall, und der erste, bei dem der Griff vor dem Schaden kam.

```bash
npx playwright test tests/e2e/seitenleiste-termine.spec.js   # Testzahl: siehe CLAUDE.md · 6 Mutationen
```


## Vier Fassungen einer Zuordnung — und die Kette war zweimal durchtrennt

Gemeldet am 01.10.2026: *„wenn ich dj suche, und über die Verlinkung Suche gehe
dann sollen dj Erscheinen, oder wenn ich nach Locations suche soll dann auch im
Filter Location finden lassen."* Im echten Browser nachgemessen war die Kette an
**zwei** Stellen durchtrennt, und keine der beiden war an der Oberfläche
sichtbar:

| | |
|---|---|
| der Knopf des Assistenten | `onclick="navigateTo('browse')"` — **ohne Argument** |
| der Router | `case 'browse':` las `data` **gar nicht** |
| gemessen nach `navigateTo('browse','dj')` | kein Chip markiert, **alle 15** Inserate |

Beide Hälften sahen für sich vollständig aus. Der Knopf führte in die Suche, die
Suche funktionierte — nur ging zwischen ihnen nichts über, und der Nutzer klickte
die Kategorie ein zweites Mal an. Genau den Weg hatte er sich gerade gespart.

**Dahinter lagen VIER gepflegte Fassungen derselben Zuordnung**, und die Messung
hat gezeigt, dass sie nicht ineinander enthalten waren:

| Fassung | Einträge | Korpus (45 Sätze) |
|---|---:|---:|
| `AI_CATEGORIES` (Chips der Suche) | 10 | — |
| `_AI_CATS` (Knöpfe des Assistenten) | **8** | — |
| `_aiCatFromText` (getippter Text) | 8 Ausdrücke | **32/45**, 1 Fehlalarm |
| `_GUIDE_CAT_RULES` (Inseratstext) | 10 Ausdrücke | **35/45**, 0 Fehlalarme |

**Jeder verfehlte etwas, das der andere kannte.** Im Assistenten liefen
„getränke", „torte", „venue", „gelände", „strom", „livestream", „feuerwerk" und
„koordinator" ins Leere — am Inserat wurden sie erkannt. Und `pyro` und `planung`
fehlten in den Knöpfen ganz: **nach Pyrotechnik zu fragen war unmöglich**, während
die Suche daneben einen Chip dafür anbot.

Nach der Vereinheitlichung: **45/45 in beiden Erkennern, 0 Fehlalarme.**

**Die autoritative Quelle ist das Formular, nicht die längste Liste.** Gefragt
wurde nicht „welche Zuordnung ist die beste", sondern „was kann ein Anbieter
überhaupt wählen" — `#createCategory` bietet genau zehn Werte. Ein Chip ohne
Formular-Gegenstück filtert auf eine Kategorie, die kein Inserat tragen kann; ein
Formularwert ohne Chip ist unsuchbar. Der Test verlangt deshalb **Gleichheit**,
nicht „mindestens".

**Die Reihenfolge der Tabelle IST die Logik.** „pyrotechnik" enthält „technik" —
vor dem 01.10. gewann `licht` in **beiden** Erkennern. `pyro` steht jetzt davor,
und ein eigener Test hält die Stellung fest: beim nächsten alphabetischen
Aufräumen ginge das sonst still wieder kaputt.

**Ein Fehlalarm war die teurere Hälfte.** „wer hilft beim aufräumen" ergab
`location`, weil `/räum/` unverankert war. Der Assistent beantwortete damit eine
Frage, die niemand gestellt hat. `\br[äa]um` hält den Wortanfang.

### Und eine fünfte Fassung war seit jeher unerreichbar

Beim Bauen des Tests gefunden: `_getNavAiCategories()` in
`board/42-guide-social-feed.js` trug

```js
return (typeof AI_CATEGORIES !== 'undefined') ? AI_CATEGORIES : [ …elf Einträge… ];
```

**Der Schutz greift nie.** `AI_CATEGORIES` ist `const` im selben verketteten
Skript; ist es noch nicht initialisiert, **wirft** `typeof` (TDZ), statt
`'undefined'` zu liefern. Der Ersatzzweig war toter Code — und war schon
auseinandergelaufen: Floristik trug 🌸 statt 💐, und `wellness` stand darin, eine
Kategorie, die **kein Inserat tragen kann**. Wäre der Zweig je gelaufen, hätte die
Leistensuche einen Filter angeboten, der garantiert nichts findet.

Dieselbe Klasse wie die drei Konfetti-Popper hinter `display: none`: etwas ist da,
sieht aus, als täte es etwas, und tut nichts. Deshalb steht nirgends mehr ein
`typeof` auf dieser Tabelle. Bricht die Reihenfolge in `modules.list`, **soll**
`app.js` laut beim Laden scheitern — der Smoke-Test fährt jede Route auf 0
Page-Errors. Ein Schutz, der im Ernstfall nicht greift, ist schlimmer als keiner,
weil er einen vortäuscht.

### Die Weitergabe steht NACH dem Grundaufbau

`ebSucheKategorieSetzen(data)` läuft im `.then` von `loadDbListings()`, **hinter**
`renderBrowseGrid(LISTINGS)`. Andersherum überschreibt der Grundaufbau das
gefilterte Ergebnis, der Chip bleibt markiert, und darunter stehen alle Inserate —
dieselbe Falle wie bei `feedTabAktivieren()` am 31.08.2026. Gemessen wird die
**Reihenfolge im Code**, weil sie am Ergebnis nur sichtbar ist, wenn
`loadDbListings()` langsam genug ist.

**Und `/browse/dj` ist teilbar.** `_spaPath` trägt die Kategorie als Segment; ohne
es wäre `/dj` von der **Seite** `dj` nicht zu unterscheiden, und ein geteilter Link
endete auf `404.php`. Die Regel `^browse/([^/]+)/?$` stand in `functions.php`
längst — es gab nur nichts, was sie benutzt hätte.

### Die Frühabweisung hinterliess den schlimmsten Zustand

`ebSucheKategorieSetzen()` begann mit `if (!ebKategorieBekannt(key)) return false`.
Gemessen: `/browse/quatsch` direkt nach `/browse/location` zeigte den
**Location-Chip markiert über der ungefilterten Liste** — Markierung und Inhalt
widersprachen sich, lautlos. Zwei Zeilen darüber stand mein eigener Kommentar, der
genau davor warnt.

Jetzt wird **zuerst geleert, dann geprüft**: ein unbekannter Wert heisst „keine
Kategorie", und das sieht man.

**Das `try/catch` darin war ebenfalls falsch** — „defensiv" begründet, und es
hätte den einen Fall verschluckt, auf den es ankommt: scheitert
`filterListings()`, steht ein markierter Chip über der ungefilterten Liste.

### Der Knopf nennt die ganze Zahl

Die Antwort zeigt drei Karten und sagt „Alle 7 in der Suche". Gezählt wird
**vor** `.slice(0, 3)` — danach stünde dort 3, und der Nutzer hielte die Liste für
vollständig. Diese Eigenschaft hat ein eigenes Subjekt bekommen (ein Test stellt
sieben Inserate), denn mit den Demo-Daten allein ist sie nicht beobachtbar, und
eine Wache ohne Subjekt ist eine Behauptung — dieselbe Lehre wie bei
`ebAuftragSchluessel()`.

**Der Key landet in einem `onclick`-Attribut.** Der Knopf entsteht deshalb nur für
einen Key aus der Tabelle (`ebKategorieBekannt`) — eine Weissliste ist dort die
einzige Form, die auch bei einem erfundenen Argument trägt. Dieselbe Begründung wie
beim `pi_…`-Knopf des Stornos.

**Der leere Zweig trägt die Kategorie ebenfalls.** Der Assistent sieht
`_visibleListings()`, die Suche lädt aus der Datenbank — „schau mal in der Suche
vorbei" ohne Filter war die schlechtere Auskunft.

Dreizehn Mutationen, jede macht die Suite rot: `_AI_CATS` wieder als Handliste
(**3 rot**) · `_GUIDE_CAT_RULES` wieder eigene Liste (4) · `pyro` nach `licht` (4) ·
Wortanfang bei `r[äa]um` entfernt · `typeof`-Schutz zurück · Weitergabe vor dem
Grundaufbau · Weitergabe ganz entfernt (3) · `_spaPath` wirft die Kategorie weg ·
Frühabweisung zurück · Assistent gibt die Kategorie nicht mit (2) · Weissliste
entfernt · erst abschneiden, dann zählen · tote Ersatzliste mit `wellness` zurück.

```bash
npx playwright test tests/e2e/assistent-kategorie.spec.js   # Testzahl: siehe CLAUDE.md · 47 Mutationen
```

### Es waren NEUN Fassungen, nicht vier — zwei standen in derselben Datei

Am Abend des 01.10.2026 nachgezählt. Über der autoritativen Tabelle, in
**derselben** Datei, standen noch zwei:

| Fassung | Einträge | wofür |
|---|---:|---|
| `_EB_CAT_GRAMMAR` | **11** | Satz-Vervollständigung: Artikel, Label, Icon, eigenes Muster |
| `EB_KATEGORIE_ICON` | **11** | nur Icons — reine Kopie der Icon-Spalte |

Beide waren beim ersten Durchgang nicht mitgezählt, weil sie **vor**
`AI_CATEGORIES` stehen und mit ihr nie verglichen wurden. Am erweiterten
Korpus gemessen:

| | Treffer (64) | Fehlalarme |
|---|---:|---:|
| achte Fassung | 49 | **1** |
| `AI_CATEGORIES` | 48 | 0 |
| **zusammengeführt** | **64** | **0** |

**Wieder nicht ineinander enthalten** — und die achte trug **beide** Fehler,
die am Vormittag desselben Tages an den anderen behoben wurden:
`pyrotechnik` → **licht** (weil `technik` vor `pyro` stand) und
`wer hilft beim aufräumen` → **location** (weil `/r[äa]um/` unverankert war).
*Eine Fundstelle zu beheben verhindert die nächste nicht, solange jede
Oberfläche ihre eigene Kopie pflegt.*

**Der elfte Eintrag war `wellness` — eine Kategorie, die kein Inserat tragen
kann.** `#createCategory` bietet sie nicht an. Wer „massage" tippte, bekam
den fertigen Satz *„Ich suche ein Wellness-Angebot für meine Hochzeit in
Köln"* vorgeschlagen und danach garantiert null Treffer.

**Und sie blieb.** `_ebTasteBump('cats', …)` schrieb den Schlüssel ins
Geschmacksprofil im `localStorage`; von dort war er die **Vorgabe für jede
weitere Vervollständigung**, auch für unverwandte Suchen. Eine Suche
vergiftete alle folgenden — und das Profil überlebt die Behebung, weshalb
die Vorschläge jetzt gegen die Tabelle prüfen, statt dem Profil zu glauben.

**`akk` zieht in die Tabelle, nicht in eine Nebentabelle.** Der Akkusativ
(„einen DJ", „ein Catering") war die einzige **echte** eigene Information
der achten Fassung — und damit ihre ganze Begründung. Er gehört zur
Kategorie; eine Nebentabelle dafür bringt neun weitere Spalten mit, die
niemand gegen das Original misst.

**Abgeleitet wird LAZY, im Funktionsrumpf.** `AI_CATEGORIES` ist ein `const`
weiter unten in derselben Datei: eine Ableitung an der alten Zeile greift
beim Laden in die TDZ und zerlegt die Datei. `typeof` hilft dort nicht — es
wirft selbst. `ebKategorieIcon()` leitet beim ersten Aufruf ab und merkt es.

**Drei Wörter blieben DRAUSSEN, jedes mit gemessenem Grund** — und jedes
steht als Durchlass-Satz im Korpus, nicht als Absatz:

| Wort | hätte getroffen | Folge |
|---|---|---|
| `ausstattung` → deko | „technische Ausstattung" | `deko` steht vor `licht` |
| `film` → foto | „was ist mit dem Filmabend" | ein Event-Typ, keine Kategorie |
| bares `hof` → location | „wir treffen uns am Bahnhof" | die echten Orte stehen ausgeschrieben |

Dazu zwei Formfragen: **`funken`, nicht `funke`** (letzteres trifft
„funkeln", und `pyro` steht vor `licht` — „die Lichter funkeln" wäre ein
Feuerwerk geworden) und **`\bhost\b`, nicht `host`** (sonst ist eine
Hostess ein Moderator).

**Zwei Reihenfolge-Bedingungen, nicht eine.** Neben `pyro` vor `licht` trägt
jetzt `licht` vor `location`: „Beschallung für den Saal" nennt Technik **und**
Ort, und vor dem 01.10.2026 ergab der Satz in **beiden** Fassungen
`location` — der Fragende bekam Schlösser für eine Tonanlage. Beide
Bedingungen haben einen eigenen Test mit einem konkreten Satz, weil sie beim
nächsten alphabetischen Aufräumen still kaputtgehen.

**Vier Mutationen überlebten den ersten Durchgang, drei waren Lücken in den
Tests.** `\bhost\b` hatte keinen Durchlass-Satz mit „Hostess"; der
`null`-Zweig von `ebKategorieEintrag()` hat an der Oberfläche **kein
Subjekt** (jeder Aufrufer nimmt seinen Key aus der Tabelle oder fragt vorher
`ebKategorieBekannt()`) und misst jetzt die **Ausgabe** des Helfers, wie
`ebAuftragSchluessel()` hinter seiner Gruppierung; und den Kategorie-Chip des
Planungs-Assistenten prüfte niemand.

**Die vierte überlebt weiterhin, und das steht im Test.** Der Kommentarabzug
im Icon-Test ist dort **Vorsorge ohne Subjekt**: die Erklärung, die
`wellness: 'spa'` wörtlich nennt, liegt ausserhalb des geschnittenen Blocks.
Er bleibt, weil ein breiterer Schnitt sonst still den Kommentar misst — aber
er behauptet keine Wirkung, die er beim heutigen Schnitt nicht hat.

Siebzehn Mutationen, sechzehn machen die Suite rot: achte Fassung zurück
(**4 rot**) · neunte Fassung zurück (2) · `akk` fällt aus der Tabelle (3) ·
`ebKategorieIcon` leitet nicht ab (3) · `pyro` nach `licht` (2) · `licht`
nach `location` (2) · `ebKategorieEintrag` erfindet einen Eintrag (2) ·
Vokabular weg bei licht (2) · `funken` → `funke` · `host` ohne Wortgrenze ·
bares `hof` · `ausstattung` in deko · `film` in foto · Vokabular weg bei
catering · die Wache am Geschmacksprofil weg · der Chip fragt die Tabelle
nicht.

**Nicht angefasst:** die Merkmalsliste der Inserate führt weiter
`🧖 Wellness-Bereich` — das ist eine **Eigenschaft einer Location**, keine
Kategorie, und völlig in Ordnung. Mitgezogen wurde nur die Begründung in
`vault/40-Governance/Legal/App-Store.md`: sie nannte „die Kategorie
`wellness`" als Grund für ein „keine" und zeigte damit auf etwas, das es
nicht gibt. Die **Antwort** ändert sich nicht.

```bash
npx playwright test tests/e2e/such-icons.spec.js   # Testzahl: siehe CLAUDE.md
```

### Fünf Trending-Links, die an der Reparatur vorbeiliefen

Am Abend des 01.10.2026 beim Durchgehen der Leiste gefunden. Die
Feed-Seitenleiste führt fünf Links, und alle fünf standen so da:

```html
<a onclick="navigateTo('browse');
   setTimeout(()=>{browseCategory.value='dj';filterListings();},100)">
```

**Zwei Fehler in einer Zeile.** Das `setTimeout(…, 100)` ist ein Rennen gegen
`loadDbListings()` — dieselbe Falle wie bei `feedTabAktivieren()` am
31.08.2026, und `navigateTo('browse', key)` tut es seit demselben Tag richtig
und in der richtigen Reihenfolge.

**Und `#Hochzeit` filterte auf nichts.** Es setzte
`browseCategory.value = 'hochzeit'`; diese Option gibt es dort nicht —
„Hochzeit" ist ein **Anlass**, kein Gewerk, und steht in
`#browseEventType`. Ein `<select>` nimmt einen unbekannten Wert
stillschweigend nicht an: `value` bleibt leer, `selectedIndex` wird −1.
Gemessen zeigte der Link danach **alle 15 Inserate**. Lautlos.

Der Router nimmt jetzt beides: Kategorie zuerst, dann Event-Typ
(`if (data && !ebSucheKategorieSetzen(data)) ebSucheEventTypSetzen(data)`).
Die Keys kollidieren nicht — Gewerke sind klein, Anlässe gross geschrieben.
Nachher: **13 Services**, Chip „💍 Hochzeit".

### Und zwei Kategoriefilter schlossen sich aus

Beim Bauen dazu gemessen, und es ist der schwerere Fund.
`filterListings()` liest **zwei** Kategoriefilter und verknüpft sie mit UND:
die Chips (`selectedCategories`) und das Auswahlfeld `#browseCategory`.
`ebSucheKategorieSetzen()` räumte nur die Chips. Stand im Feld noch `dj` und
kam der Assistent mit `location`, sagte die Seite:

```
0 Services gefunden
„Für (DJ & Musik) konnten wir leider keine passenden Services finden"
„Ähnliche Angebote in der Kategorie DJ & Musik"
```

**während der markierte Chip „Location" sagte.** Der Text nennt also die
falsche Kategorie — genau der Fall, vor dem der Kommentar dieser Funktion
seit dem Vormittag warnt (*„Bliebe ein alter Filter stehen, stünde am Ende
eine leere Liste da — und die sähe aus wie ‚es gibt keine DJs'"*), nur mit
einer selbstbewusst falschen Begründung obendrauf.

`ebSucheAltfilterLeeren()` räumt beide Nicht-Chip-Filter und zieht die
**Chip-Beschriftung** mit nach: sie hängt am `change`-Ereignis, und eine
Zuweisung per Skript löst keines aus. Ohne den Aufruf stünde am Chip weiter
„DJ & Musik" über einer Liste, die etwas anderes zeigt.

**Zwei Messfehler von mir gehören hierher.** Beim ersten Versuch zählte ich
Karten mit `querySelectorAll` — bei null Treffern wird `#browseGrid` aber auf
`display: none` gesetzt und behält seine alten Karten im DOM. Ich habe also
versteckte Knoten gezählt und daraus geschlossen, das Produkt zeige das alte
Ergebnis weiter. Es zeigt richtig das „keine Treffer"-Panel. Der Zähler der
Suite misst jetzt **sichtbare** Karten. Und beim zweiten Versuch las ich den
Zustand synchron nach `navigateTo()` — das rendert erst im `.then` von
`loadDbListings()`, also war zweimal „nicht gesetzt" meine Messung und nicht
der Code.

**Die zehnte Fassung war eine Beschriftungsfrage.** `#browseCategory` und
`#createCategory` führen ihre Labels von Hand: die Keys stimmten, die Wörter
nicht — *Locations* gegen *Location*, *Licht & Tech* gegen *Licht & Technik*,
*Eventplanung* gegen *Planung*. Der Inhaber hat in seiner eigenen Meldung
**beide** Wörter benutzt (*„wenn ich nach Locations suche soll dann auch im
Filter Location finden lassen"*). Angeglichen, und ein Test verlangt, dass
jedes Auswahlfeld die Kategorie so nennt wie die Tabelle.

### Die Hülle zeigte auf ein Foto, das es nie gegeben hat

`app-shell.html` trug genau **zwei** lokale Verweise, und einer war kaputt:

```html
<img src="assets/showcase/dj-hero.jpg" … onerror="this.remove()">
```

Die Datei hat es nie gegeben. Der Gradient darunter war als „Fallback"
beschriftet und **ist** die Gestaltung. Jeder Besucher, der so weit scrollte,
löste eine 404 aus, und im Markup sah es aus wie ein Foto-Hintergrund —
dieselbe Klasse wie die drei Konfetti-Popper hinter `display: none`. Das
`onerror` war nebenbei einer der 459 Inline-Handler, die beim CSP-Schritt 2
im Weg stehen: einer weniger, ohne Gegenleistung.

**Und ein `javascript:`-href von 69.** Die anderen 68 `<a onclick>` tragen
`href="#"`. Das ist nicht nur Stil: ein `javascript:`-URL fällt unter
`script-src`, **nicht** unter `script-src-attr`. Mit dem Nonce aus Schritt 2
wird er blockiert — die Aktion im `onclick` läuft weiter, aber **jeder Klick**
erzeugt eine Verstoßmeldung, und der Sammler deckelt bei 25 verschiedenen.
Eine laute wiederkehrende verdrängt die eine, auf die es ankommt.

Gemessen wird die **Bedingung**: jede lokale Datei, auf die die Hülle zeigt,
existiert — nach Abzug der HTML-Kommentare, denn die Erklärung an der alten
Stelle nennt den toten Pfad wörtlich.

### Drei Mutationen überlebten, und eine entlarvte eigene Zeremonie

- **„der Hochzeit-Link schreibt wieder klein"** überlebte, weil der Test
  `navigateTo('browse','Hochzeit')` **selbst rief** statt den Link zu
  klicken. Das Argument des Links war nie Subjekt — ein Prüfer, der die
  Kette hinter dem Knopf misst und den Knopf überspringt, deckt genau den
  gemeldeten Fehler nicht. Jetzt wird geklickt.
- **„die Chip-Beschriftung wird nicht nachgezogen"** überlebte, weil der
  Test den Alt-Filter per `.value` setzte, ohne `change` — die Beschriftung
  sagte also nie „DJ & Musik", und es gab nichts nachzuziehen. Jetzt
  entsteht der Filter wie im Betrieb, mit einer Gegenprobe auf die
  Beschriftung **vorher**.
- **„der Event-Typ-Setzer prüft die Option nicht"** überlebte zu Recht: er
  hatte eine Schleife über alle Optionen, und die tat exakt das, was
  `sel.value = x` ohnehin tut. **Die Mutation hat meine eigene Zeremonie
  gefunden** — die Schleife ist weg, nicht der Test dazugekommen. Der
  Rückgabewert hat sein Subjekt jetzt in der Ausgabe des Helfers, wie bei
  `ebKategorieEintrag()`.

Siebzehn Mutationen, **alle** machen ihre Suite rot: Trending-Links wieder
mit `setTimeout` · der Hochzeit-Link klein geschrieben · der Hochzeit-Link
gibt nichts mit · der Router versucht den Event-Typ nicht · der Event-Typ
vor dem Grundaufbau · der Alt-Filter wird nicht geräumt (3 rot) · nur die
Kategorie geräumt, der Anlass bleibt · die Chip-Beschriftung nicht
nachgezogen (beim Räumen und beim Setzen) · der Setzer filtert nicht · der
Setzer meldet immer Erfolg · zwei Labels driften wieder · der tote
Foto-Verweis zurück (2 rot) · der `javascript:`-href zurück · die Fläche
unter der Stage verschwindet (Gegenprobe).

### Und der ZWEITE Assistent hatte dieselbe Lücke

Am 01.10.2026 vom Inhaber gemeldet, mit Bild: *„Wenn ich dem Assistenten die
Aufgabe gebe ‚Suche alle DJs', dann soll, wenn er danach die Suche vorschlägt,
auch die DJs anzeigen — und nicht nur die Suche leer lassen und auf der
Startseite spawnen."*

**Repariert war am Vormittag der falsche Assistent.** Die Kategorie-Weitergabe
oben betraf `ai/50-planungs-assistent.js` — den Chat im Board. Das Overlay auf
der Landeseite ist `ui/31-modals-toast-qabot.js`, ein eigenes Modul mit eigenen
Antworten und eigenen Knöpfen. Eine Fundstelle zu beheben verhindert die
nächste nicht.

Im echten Browser gemessen, vor der Behebung:

| | |
|---|---|
| `_guideCategoryFor('Zeige alle DJ auf')` | **`dj`** — der Erkenner wusste es |
| Knopf „Suche öffnen" | `target: browse`, `data` **leer** |
| nach dem Klick | **15 Inserate**, kein Chip, Pfad `/` |

`browse` **ist** die Landeseite — der Fragende stand danach genau dort, wo er
vorher war. Und die ganze Kette war fertig: `runQaAction` reicht `daten` seit
dem 15.09. an `navigateTo` weiter (für den Radar), und `navigateTo('browse',
'dj')` filtert seit dem Vormittag wirklich. **Es fehlte allein die
Verbindung** — dieselbe Klasse wie die Hochzeit-Bausteine, der
Aktivitäten-Bestand neben der erfundenen Terminliste und der Storno ohne Knopf.

Nachher, geklickt statt behauptet: **15 → 2 Inserate**, `selectedCategories:
['dj']`, Pfad `/browse/dj`.

**Fünf Entscheidungen, jede mutationsgeprüft:**

- **Nur `browse`.** `aktuelles` nimmt einen Kanal, `board` ein Projekt — eine
  Kategorie dorthin zu reichen wäre ein Knopf, der woandershin führt, als er
  verspricht.
- **Nur ohne eigenes `data`.** „Radar öffnen" trägt seinen Unterkanal schon.
- **Eine Kopie, nie das Original.** `topic.actions` sind modulweite
  Konstanten, die JEDE spätere Antwort wiederverwendet; wer sie beschreibt,
  hängt den DJ-Filter an die nächste Frage nach dem Impressum.
- **Beschriftung und Ziel wandern zusammen** — der Knopf heißt „DJ & Musik
  suchen", und das Wort kommt aus `AI_CATEGORIES`, nicht aus einer zweiten
  Liste.
- **An EINER Stelle angewandt**, nicht an jedem der vier Antwortwege. Dieselbe
  Begründung wie `defaults: run: shell: bash` am Job statt je Schritt.

**Zwei Mutationen überlebten zuerst — und beide zeigten einen Fehler im
TEST.** „Jedes Ziel bekommt die Kategorie" macht aus allen drei Knöpfen einen
`browse`-Knopf; die Schleife, die non-browse-Knöpfe prüft, lief danach
**nullmal** durch und war grün, ohne etwas zu belegen. Ein Prüfer ohne Subjekt,
diesmal als leere Schleife. Und die Wache gegen das Überschreiben eines
eigenen `data` hat an der Oberfläche **heute kein Subjekt** (kein Thema trägt
einen `browse`-Knopf mit `data`) — sie misst jetzt die **Ausgabe des Helfers**,
wie `ebAuftragSchluessel()` hinter seiner Gruppierung.

**Und die erste Klick-Messung verfehlte ihr Subjekt.** `#qaMessages
.eb-qa-action` *first* traf den **Anmelden**-Knopf der Begrüssung ganz oben,
nicht die Antwort — gemessen „15 Inserate, nicht gefiltert", während die Kette
längst trug. *Ein Messgerät, das sein Subjekt nicht trifft, meldet Entwarnung*
— dieselbe Lehre wie bei der `clamp()`-Mutation, nur andersherum.

### Die siebte Fassung derselben Zuordnung stand in der Wissensbasis

Die gemeldete Antwort kam **nicht aus Code**, sondern aus
`vault/10-Produkt/Wissen/Suchen-und-Finden.md` — und sie nannte zehn
Kategorien, von denen eine falsch war:

| | |
|---|---|
| `#createCategory` (was ein Anbieter wählen kann) | 10 Werte |
| die Notiz nannte | **Wellness** — nicht wählbar, nie findbar |
| die Notiz verschwieg | **Pyrotechnik** |
| ausserdem | „Eventplanung" statt des echten Labels „Planung" |

Wer nach Wellness suchte, fand garantiert nichts; wer Pyrotechnik suchte,
erfuhr nicht, dass es sie gibt. **Dieselbe Drift wie bei den vier
Code-Fassungen, nur in Prosa** — und diese stand vor jedem Besucher.

Daneben lag eine **achte**: `_EB_CAT_GRAMMAR` in `11-suche-ki.js`, elf
Einträge mit eigenen Ausdrücken, `wellness` darunter. Sie bediente die
Satz-Vervollständigung, nicht den Filter — ein Umbau der Vorschlagsgrammatik
war eine eigene Messung und keine Beifracht, also stand sie zunächst als
Befund da. **Sie ist am Abend desselben Tages gemessen und zusammengeführt
worden**, und mit ihr eine neunte (`EB_KATEGORIE_ICON`): siehe den Abschnitt
„Es waren NEUN Fassungen, nicht vier" weiter oben.

**Die Notiz bekommt ihr Subjekt.** Ein Test leitet die Labels aus
`#createCategory` **und** `AI_CATEGORIES` ab und verlangt, dass der Abschnitt
jedes nennt und keines erfindet. Dazu die Gegenprobe, dass
`assets/eb-knowledge.json` denselben Stand trägt — wer die Notiz ändert und
`build-knowledge.mjs` vergisst, repariert einen Text, den der Bot nie sagt.

Elf Mutationen, jede macht die Suite rot: Kategorie gar nicht angewandt
(**5 rot**) · der Erkenner wird nicht gefragt (5) · das Original beschrieben
statt kopiert (2) · jedes Ziel bekommt die Kategorie (2) · ein eigener
Unterkanal wird überschrieben · die Weissliste fällt weg · die Beschriftung
bleibt generisch · eine tote `typeof`-Wache kehrt zurück · die Kategorie wird
je Antwortweg wiederholt · die Notiz nennt wieder Wellness (2) · die Notiz
verschweigt Pyrotechnik.

```bash
npx playwright test tests/e2e/qabot-kategorie.spec.js   # Testzahl: siehe CLAUDE.md · 11 Mutationen
```


## Die Landeseite bediente eine Absicht von dreien

Beim Durchgehen der Nutzerpfade am 09.09.2026 gemessen: die Landeseite ist
`#page-browse` — eine **Suchmaske**. Sie bedient genau einen Nutzer, den, der
schon weiss, wonach er sucht.

Zwei andere Absichten hatten von dort aus **keinen sichtbaren Weg**:

| Absicht | Ziel | Warum unerreichbar |
|---|---|---|
| „Ich weiss nicht *was*, nur *dass*" | Reiter „⚡ Jetzt" | existiert nur auf `#page-aktuelles` und `#page-explore` |
| „Ich biete etwas an" | Inserat erstellen | „Inserieren" stand allein in der oberen Leiste |

**Beide Ziele gab es, beide waren erreichbar** — nur nicht von dort, wo der
Besucher steht. Derselbe Unterschied wie zwischen einem vorhandenen Prüfer
und einem, der wirklich läuft.

Behoben mit `.ai-hero-wege` unter der Suchleiste: drei Knöpfe, drei
Absichten. **Gemessen wird der Klick, nicht das Markup** — ein Knopf, der auf
eine Seite führt, die nicht aktiv wird, sieht im Markup vollständig richtig
aus.

**Der Anbieter-Einstieg endet in der REGISTRIERUNG, nicht in der Anmeldung.**
`navigateTo('create-listing')` schickt Abgemeldete in die Anmeldung, mit
*„Bitte melde dich an, um diese Funktion zu nutzen."* Richtig für jemanden
mit Konto — und die falsche Auskunft für den, der gerade zum ersten Mal
überlegt, hier etwas anzubieten: der liest den Satz als Absage. Die
Registrierung ist von der Anmeldung aus erreichbar, aber ein Weg, den man
erst suchen muss, ist an einem Einstieg genau der Weg zu viel.
`ebAnbieterEinstieg()` hält die Weiche; angemeldet bleibt alles wie bisher.

**Ein Test hält den Befund fest, nicht nur die Behebung.** Er misst, dass die
Landeseite **keinen** eigenen Jetzt-Reiter trägt — verschwindet er, ist die
einzige Stelle weg, an der steht, warum die Reihe existiert.

### Und die halbe Marktseite hatte gar keinen

Am 10.09.2026 nachgemessen, diesmal für den **Dienstleister**. Angemeldet,
auf der Landeseite stehend, im echten Browser:

| Ziel | im Markup | **sichtbar** |
|---|---:|---:|
| `my-listings` | 2 | **0** |
| `auftraege` | 1 | **0** |
| `business` | 1 | **0** |
| `create-listing` | 7 | 3 |

Alle drei lagen hinter dem Ausklappmenü. Der einzige sichtbare Weg für die
halbe Marktseite führte also zu *„noch ein Inserat anlegen"* — dem Einzigen,
was ein Anbieter schon getan hat. Seine Tagesfrage ist eine andere: **hat mich
jemand angefragt, was muss ich liefern.**

**Der dritte Weg schaltet jetzt um.** Für angemeldete Dienstleister heißt er
„Mein Geschäft" und führt nach `my-listings`; für alle anderen bleibt alles
wie bisher. **Beschriftung und Ziel wandern zusammen** (`_applyRoleNav()` und
`ebAnbieterEinstieg()` fragen dieselbe Rolle) — ein Weg, der woandershin
führt, als er verspricht, ist schlimmer als einer, den es nicht gibt. Das
Inserat bleibt von dort einen Klick entfernt; `renderMyListings()` trägt den
Knopf und im leeren Fall auch die Aufforderung.

### Und die gemeinsame Planung war vom Board aus unerreichbar

Gemeldet am 13.09.2026: *„event mit freunden planen ist fehlerhaft und man
wird dann zum board gebracht, aber dann beim KI-Talk, statt ein Planungsboard
zu erhalten wo man seine Freunde hinzufügen kann."*

Im echten Browser nachgemessen, und der Befund war schärfer als die Meldung.
Über **jedes** `onclick` der Board-Seite gezählt, ergaben Freunde, Gruppen und
Einladungen zusammen:

```
boardFreundeWege: []
```

**Null.** Freunde, Gruppen (09.09.) und der gemeinsame Plan (10.09.) sind
gebaut und geprüft — und von genau der Stelle, an die „Vorhaben planen"
schickt, gab es **keinen einzigen** Weg dorthin. Dieselbe Klasse wie der
Dienstleister-Einstieg einen Abschnitt weiter oben: das Ziel existiert, es hat
nur keinen Weg von dort, wo der Besucher steht.

`ebGemeinsamPlanen()` ist die Brücke. **Der Reiter wird VOR dem Wechsel
gesetzt**, nicht danach — `renderFreundePage()` liest `_sozialReiter`, und wer
erst navigiert und dann umschaltet, zeichnet die Seite sichtbar zweimal. Ziel
ist der **Gruppen**-Reiter: ein gemeinsames Vorhaben gehört einer Gruppe, nicht
einer Freundschaft.

**Abgemeldet bleibt alles wie bisher.** `/freunde` erklärt selbst, warum es ein
Konto braucht; ein Anmeldedialog, der ohne Erklärung aufgeht, liest sich als
Absage. Ein eigener Test hält das fest — sonst wäre „öffne den Anmeldedialog"
der bequemste Weg zu einem grünen Test.

**Der Untertitel des Boards hat mitgewandert.** Er lautete *„Plane dein Event
im Chat mit deinem Assistenten"* und beschrieb damit ein Board, das Projekte,
Kategorien **und** einen Assistenten trägt. Wer „Vorhaben planen" geklickt
hatte, las das als falsches Ziel. Der Chat ist ein Teil des Boards, nicht das
Board — dieselbe Regel wie beim Anbieter-Einstieg: Beschriftung und Ziel
wandern zusammen.

Vier Mutationen, jede macht die Suite rot: Knopf entfernt · Reiter nicht
gesetzt · Untertitel zurück auf reinen Chat · Anmeldedialog statt Erklärung.

**Die Mobilleiste war bewusst NICHT angefasst — bis zum 15.10.2026.** Ihr
Board-Slot führte zum Planungs-Board, *„das Auftragsboard erreichen
Dienstleister über das Menü"*. Sie umzuwidmen war eine Produktentscheidung
des Inhabers; er hat sie mit dem Überarbeitungsauftrag getroffen. Seitdem
heißt der dritte Platz für Dienstleister **„Aufträge"**, für alle anderen
**„Planen"** (siehe „Navigation je Rolle" unten und `PRODUCT_REDESIGN.md`).
Der Absatz bleibt stehen, damit niemand die alte Begründung für noch gültig
hält.

**Zwei tote Blöcke sind dabei herausgefallen.** `applyLogin()` und
`applyLogout()` setzten Symbol und Text auf
`#mobileNav button[data-page="create-listing"]` — diesen Knopf gibt es in der
Mobilleiste **nicht** (sie trägt Feed, Suche, Board, Chat, Profil). Zwanzig
Zeilen, die nie etwas getan haben und im Diff aussahen wie rollenabhängige
Navigation. Dieselbe Klasse wie ein Prüfer ohne Subjekt, nur an der
Oberfläche. Geprüft wird jetzt die **Bedingung**: jeder Mobilleisten-Selektor
in `30-auth.js` muss auch etwas treffen.

```bash
npx playwright test tests/e2e/einstiege.spec.js   # Testzahl: siehe CLAUDE.md · echte Klicks
```


## Gesuche sahen aus wie Angebote — und die Migration dafür lief nie

Befunde F01–F03 des Live-Audits vom 15.10.2026, am 16.10.2026 gemessen. An
der öffentlichen Inserate-Route der Live-Seite tragen *„Suche DJ für 28.
Geburtstag"* und *„Klavierspieler für Events gesucht"* beide
`listingType: "offer"`, `priceLabel: "ab … € / Event"` und `rating: 0`.

**Zwei Ursachen, und keine davon liegt beim Anlegen.**

1. **Die Nachmarkierung aus Migration 2.3 konnte nie laufen.** Sie steht in
   `if ( ! $tcol )` — aber `eb_create_tables()` legt die Spalte
   `listing_type` unmittelbar davor per dbDelta selbst an. Die Frage „fehlt
   die Spalte?" ist also immer schon mit Nein beantwortet, und jede alte
   Zeile trägt den Vorgabewert `'offer'`. Beide Gesuche stammen aus dem März,
   die Migration aus dem Juli. **Dieselbe Klasse wie bei 2.8:** ein Zweig,
   den die eigene Vorbereitung unerreichbar macht.
2. **Keine Karte las den Typ.** Suche, Laufband und „Meine Inserate" zeigten
   Stern, Bewertung, Anbieterpreis und „Verfügbarkeit" für alles.
   `listingType` wurde an genau drei Stellen gelesen, zwei davon mit je
   eigener Erkennung — und die Abbildung unter „Meine Inserate" warf das
   Feld beim Übernehmen sogar weg.

**Behoben in der Darstellung, nicht in den Daten** (Entscheidung Q3 des
Inhabers). `ebIstGesuch()` in `core/00-basis.js` ist die **eine** Erkennung;
`listingType: 'offer'` gilt dort nicht als Aussage, weil es der Vorgabewert
ist, und die Titelregel der Migration bleibt als Rückfall. Ein Test verbietet
eine zweite Fassung der Regel in irgendeinem Modul.

Ein Gesuch zeigt **„Gesuch" statt Stern** und **„Budget: …" statt „ab …"**;
ein schon als Budget gespeicherter Text bleibt. Unter „Meine Inserate" fallen
Bewertung und „Verfügbarkeit" weg. **Gesuche bleiben in der Suche** —
Dienstleister sollen sie finden; ein eigener Kanal gehört zu Stufe 2.

**Offen:** F01, das Profil eines Planers mit Anbieter-Spezialisierung, liegt
in der Profilansicht und ist hier nicht angefasst. Die Migration 2.3 selbst
bleibt kaputt; sie zu reparieren hiesse, echte Zeilen umzuschreiben.

**Eine Mutation überlebte zuerst**, und der Grund ist lehrreich: der
Maskierungstest gab dem Gesuch einen Preistext mit Markup — den der
Gesuch-Zweig gar nicht zeigt, weil er alte Texte durch das Budget ersetzt.
Die Probe bestand, ohne die Maskierung je zu erreichen.

```bash
npx playwright test tests/e2e/gesuch-darstellung.spec.js   # Testzahl: siehe CLAUDE.md · 10 Mutationen
```


## Suchergebnisse lassen sich wieder einklappen

Aus der Besprechung vom 15.10.2026 (`PRODUCT_REDESIGN.md` 6.1). Mit „Mehr
anzeigen" ließen sich Treffer nur aufklappen; zurück ging es allein durch
Hochscrollen. „Weniger anzeigen" setzt auf die **Startmenge** zurück, die
`renderBrowseGrid()` beim ersten Zeichnen wählt (`_browseGridPaging.start`).
Eine feste Zahl wäre falsch, weil die Startmenge an der Spaltenzahl hängt.

**`.browse-load-more-btn` trägt `display: inline-flex`** und ignoriert
`[hidden]` deshalb ohne eigene Regel. Ohne sie stünde „Weniger anzeigen"
auch im eingeklappten Zustand da. Es ist dieselbe Falle wie beim Warnkasten
der Mehrfachzeiten.

**Der Fokus geht auf „Mehr anzeigen".** Der gedrückte Knopf verschwindet
beim Einklappen, und ohne neues Ziel fiele der Fokus auf `<body>`.

**Die Startmenge sind genau 9 Treffer** (`EB_BROWSE_START`, Entscheidung des
Inhabers vom 16.10.2026). Vorher waren es fünf volle Reihen, also je nach
Bildschirm 15, 20 oder 25: auf jedem Gerät eine andere Seite. „Mehr anzeigen"
richtet die folgenden Schritte weiter an den Reihen aus.

**Die Begrenzung hat einen fremden Test entwertet, nicht kaputtgemacht.**
`assistent-kategorie.spec.js` belegte „#Hochzeit filtert wirklich" mit
*weniger sichtbaren Karten*. Bei 9 Startkarten stehen ungefiltert und
gefiltert beide Male 9 da, und der Test wurde rot, obwohl der Filter wirkt.
Gemessen wird jetzt die Trefferzahl („N Services gefunden"). Die Gegenprobe
gehört dazu: Mit abgeschaltetem Anlass-Filter wird genau diese Zusicherung
rot.

**Der Prüfstand muss auf `navigateTo('browse')` warten.** Der Router zeichnet
nach `loadDbListings()` selbst; wer vorher sein Raster stellt, wird
überschrieben und misst das Standardraster. So fiel der erste Lauf mit 15
statt 3 Karten durch, aus einem Grund, der nichts mit dem Code zu tun hatte.

```bash
npx playwright test tests/e2e/weniger-anzeigen.spec.js   # Testzahl: siehe CLAUDE.md · 9 Mutationen
```


## Eine Adresse, die mit der Route wanderte

Aufgefallen am 09.09.2026 beim Durchgehen der Nutzerpfade: die Jetzt-Ansicht
meldete in der Dev-Shell „Die Liste konnte nicht geladen werden" — auf genau
der Route, auf der sie lebt.

**Drei Module rechneten ihre Asset-Adresse selbst aus**, jedes mit derselben
Kopie:

```js
var tag = document.querySelector('script[src*="app.js"]');
if (tag) base = String(tag.src).replace(/\/app\.js.*$/, '');
```

**`tag.src` ist eine aufgelöste Adresse.** Der Browser rechnet das Attribut
bei **jedem Zugriff** gegen `document.baseURI` — und `history.pushState`
verschiebt den. Derselbe Script-Tag liefert deshalb je nach Route etwas
anderes:

| Route | errechnete Adresse |
|---|---|
| `/` | `…/assets/eb-aktivitaeten.json` ✅ |
| `/aktuelles/jetzt` | `…/aktuelles/assets/eb-aktivitaeten.json` **404** |

Betroffen waren die **Wissensbasis des KI-Bots**, der **Demo-Feed** und der
**Aktivitäten-Bestand**. Der Kommentar an der ältesten Fundstelle behauptete
dabei das Gegenteil — „funktioniert auch auf Unterrouten wie /detail/10010".
Die Absicht war richtig, die Umsetzung nicht, und auf `/detail/10010` stand
der Bot ohne Wissen da.

**Live griff der Fehler nicht.** WordPress setzt `eventboerseApi.themeUrl`
(`functions.php:811`), und die wird zuerst gefragt. Getroffen war der
**Rückfall** — also die Dev-Shell, in der entwickelt und geprüft wird. Ein
Fehler, der sich genau dort versteckt, wo man ihn suchen würde.

Behoben mit `EB_THEME_BASIS` in `core/00-basis.js`: **einmal beim Laden**
aufgelöst, bevor der Router die erste Adresse verschieben kann (`app.js`
läuft mit `defer`, das DOM steht, `pushState` war noch nicht). Alle drei
Stellen holen ihre Adresse jetzt über `ebAssetUrl()`.

**Der eigene Prüfstand hatte den Fehler verdeckt.** `jetzt-ansicht.spec.js`
stellt die Antwort mit `page.route()` und dem Muster `**/assets/…` — und das
trifft die **falsche** Adresse genauso. Vierzehn Tests waren grün, während
die echte Anfrage im 404 landete. Ein gestellter Prüfstand kann eine kaputte
Adresse nicht finden.

`asset-adressen.spec.js` misst deshalb den **echten** Abruf, ohne Route und
ohne Prüfstück, und hält zusätzlich die Regel: **kein Modul rechnet die Basis
mehr selbst aus.** Ausgenommen ist genau `core/00-basis.js`, wo sie definiert
wird — plus eine Gegenprobe, dass sie dort wirklich steht.

```bash
npx playwright test tests/e2e/asset-adressen.spec.js   # Testzahl: siehe CLAUDE.md · echter Abruf
```


## Der Radar auf „Entdecken“ — und ein Wettlauf

Gemeldet am 31.08.2026: „bei Entdecken verschwindet der Radar“. Er war nicht
kaputt, er hatte dort **keinen Einstieg** — die Reiterleiste auf
`#page-aktuelles` trug einen Radar-Knopf, die auf `#page-explore` nicht.

Beim Nachsehen kam ein älterer Fehler mit heraus. Die Entdecken-Reiter führen
auf eine andere Seite und taten das mit
`navigateTo('aktuelles'); setTimeout(() => switchFeedTab(k), 80)`. Aber
`navigateTo('aktuelles')` rendert erst **nach** `loadDbListings()` — dauert
das länger als 80 ms, überschreibt `foryou` den gewählten Kanal, während der
Reiter markiert bleibt. Der Inhalt passt dann nicht zur Markierung, und das
sieht nicht nach einem Fehler aus, sondern nach einer Seite, die einen nicht
versteht.

**Kanal → `navigateTo('aktuelles', kanal)`.** Der Router rendert ihn nach dem
Laden, `feedTabAktivieren()` markiert den Reiter. Als Zugabe funktioniert
`/aktuelles/radar` als Deep-Link — `_spaPath` und `_readSpaRoute` reichen das
zweite Segment ohnehin durch.

**Zwei tote Doppelgänger entfernt.** `renderFeed()` und `switchFeedTab()`
standen je **zweimal** im Projekt: in `search/10-karten-home-feed.js` und in
`board/42-guide-social-feed.js`. `app.js` ist eine Verkettung — bei zwei
gleichnamigen Funktionsdeklarationen gewinnt die spätere. Die Fassung in
Modul 10, die man zuerst sucht, war seit jeher wirkungslos und kannte
ausserdem weder `radar` noch `gesuche` noch `events`.

**`_fetchWithTimeout()` stand ebenfalls doppelt** — behoben am 02.09.2026. Die
beiden Fassungen waren **nicht identisch**, und die spätere (Auth) gewann für
alle Aufrufer: Standard-Zeitlimit 15 s statt 30 s, kein Rückfall ohne
`AbortController`, und sie **veränderte das `options`-Objekt des Aufrufers**
statt es zu kopieren.

Aktiv kaputt war nichts: alle vier Aufrufer geben ihr Zeitlimit ausdrücklich
an (12/15/30/35 s) und übergeben ein frisches Objektliteral. Es waren zwei
geladene Fallen — wer das Zeitlimit wegliesse, bekäme die Hälfte der
dokumentierten Zeit; wer ein `options`-Objekt wiederverwendete, schickte beim
zweiten Aufruf ein bereits abgebrochenes Signal mit.

**Der Test zählt jetzt nicht mehr Namen auf.** Er prüft *jede* Funktion auf
oberster Ebene über alle 24 Module — 932 Stück, und `_fetchWithTimeout` war
der letzte Doppelgänger. Ein Test, der die bekannten Fälle aufzählt, findet
nie einen neuen.
