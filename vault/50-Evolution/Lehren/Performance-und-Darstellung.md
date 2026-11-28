---
layer: L5
domain: evolution
share: internal
tags: [layer/L5, domain/evolution, share/internal, lehren]
---

# Lehren: Ladezeit, Leerlauf, Animationen, Bilder, Schriften, Layout

> Wörtlich aus `CLAUDE.md` ausgelagert am 28.11.2026 (Stand `7340150`).
> Die Regeln daraus stehen kurz in `CLAUDE.md`; hier steht, **warum** —
> Messungen, Fehlschläge, Mutationsproben. Zahlen sind Stand des jeweiligen
> Datums; gepflegte, geprüfte Zahlen stehen nur in `CLAUDE.md`.

## Inhalt

- Was der Besucher wirklich lädt
- Was der Besucher wirklich erlebt — am 04.09.2026 live gemessen
- „Fühlt sich nicht liquid an" — der Hauptthread kam nie zur Ruhe
- Die Maßnahme gegen Bewegung machte die Seite teurer
- Drei Popper, die nie jemand gesehen hat — und was Anhalten nicht bringt
- Bilder: das Format, nicht die Größe
- Die Leiste war nicht kaputt, sie war verdeckt
- Ein Stylesheet auf zwei Wegen
- Die Parole wurde länger, und `nowrap` stand noch da
- Schriften und Bibliotheken liegen im Theme
- Was nichts gestaltet, wird abbestellt
- Bilder: Upload und Demo-Bestand
- Bilder und Ladezeit
- Icons statt Emojis in der Suche

## Was der Besucher wirklich lädt

Gemessen am 29.08.2026, minifiziert wie im Deploy:

| | roh | minifiziert | gzip | brotli |
|---|---|---|---|---|
| `app.js` | 1234 KB | 791 KB | 212 KB | **163 KB** |
| `styles.css` | 521 KB | 408 KB | 71 KB | **56 KB** |

**Brotli spart 64 KB je Erstbesuch**, ohne dass sich am Code etwas ändert. Es
steht **neben** `mod_deflate`, nicht an seiner Stelle: `<IfModule>` entscheidet
beim Start, nicht zur Laufzeit — fehlt das Modul auf dem IONOS-Pool, muss gzip
weiter greifen. Dazu `Vary: Accept-Encoding`, sonst darf ein Zwischenspeicher
eine Brotli-Antwort an einen Browser geben, der nur gzip kann.

**Beide Schriften werden vorgezogen.** Ohne Preload ist die Kette drei Runden
lang (HTML → `fonts.css` → parsen → Schriftdatei). Bei Material Icons ist das
mehr als Verzögerung: die Familie steht auf `font-display: block`, ihre
Glyphen sind bis zum Laden **unsichtbar** — jeder Knopf mit Symbol bleibt leer.
`crossorigin` ist Pflicht, auch bei eigener Herkunft; ohne das Attribut lädt
der Browser die Schrift ein zweites Mal, statt den Preload zu benutzen.

**Die Board-Module sind 148 KB, nicht 455 KB.** Die frühere Angabe („455 KB von
1234 KB, 37 %") war nach *Verzeichnis* gruppiert und zählte Module mit, die auch
außerhalb des Boards laufen. Nach Funktion gemessen bleiben 148 KB roh und
**16 KB brotli** — der Aufwand eines Nachlade-Umbaus steht dazu in keinem
Verhältnis, denn die Module teilen globalen Zustand über `var`. Zurückgestellt,
ausdrückliche Entscheidung des Inhabers am 31.08.2026.


## Was der Besucher wirklich erlebt — am 04.09.2026 live gemessen

Die Tabelle oben zählt Bytes. Sie sagt nicht, wie lange jemand auf eine leere
Fläche sieht. Der Lighthouse-Lauf gegen **die Live-Seite** sagt es:

| | 31.08. | **04.09.** | Bedeutung |
|---|---:|---:|---|
| First Contentful Paint | 2,8 s | **2,2 s** | erstes Pixel |
| **Largest Contentful Paint** | 8,5 s | **5,9 s** | die Seite sieht fertig aus |
| Speed Index | 10,0 s | **6,0 s** | |
| **Time to Interactive** | 10,4 s | **6,1 s** | ein Druck bewirkt etwas |
| Total Blocking Time | 1760 ms | **460 ms** | Hauptthread blockiert |
| Server-Antwortzeit | 1260 ms | **150 ms** | IONOS, vor jedem Byte |
| **Performance** | **35** | **60** | |

Barrierefreiheit 95, SEO 85, Best Practices 75 — unverändert. Gedrosseltes
Mobilprofil, der Regelfall unserer Besucher, nicht der günstigste.

**Eine Messung unmittelbar nach dem Deploy misst den Deploy, nicht die Seite.**
Der erste Lauf am 04.09. startete **80 Sekunden** nach dem SFTP-Upload und
meldete Performance **35** bei einer Server-Antwortzeit von **4140 ms** — also
scheinbar dreimal schlechter als vorher. Fünf Minuten später, am selben
Commit: **60** und **150 ms**. Ein SFTP-Deploy ersetzt jede PHP-Datei und macht
damit den Opcode-Zwischenspeicher für alle ungültig; `functions.php` allein
sind über 7000 Zeilen, die PHP beim ersten Treffer neu übersetzt. Wer den
ersten Lauf für bare Münze nimmt, sucht einen Fehler, den es nicht gibt — und
wer ihn für den neuen Normalzustand hält, meldet einen Rückschritt, den es
auch nicht gibt.

**Deshalb bleibt die Lighthouse-Schranke bei 25.** Der gemessene Abstand
zwischen kalt und warm beträgt am selben Commit **25 Punkte**; eine Schranke
nahe dem Bestwert löste bei jedem Deploy aus und wäre in zwei Wochen
abgeschaltet.

**Was davon nachweislich uns gehört**, weil es Zählwerte sind und nicht
schwankt: **1795 KB statt 2189 KB** und **54 statt 64 Anfragen**, `styles.css`
und `fonts.css` je **einmal** statt zweimal, **keine** Anfrage mehr an
`js.stripe.com` beim blossen Besuch, keine Gutenberg-Stile. Alle vier am
Bericht des Laufs nachgeprüft, nicht angenommen.

**Was vermutlich nicht uns gehört:** die Server-Antwortzeit. 1260 ms → 150 ms
ist zu viel für Änderungen, die den Server nicht anfassen — plausibler ist,
dass schon die 1260 ms vom 31.08. ein ungünstiger Moment waren. TBT
1760 ms → 460 ms dagegen hat einen sauberen Weg: 250 KB Stripe.js, 70 KB
doppelte Stylesheets und 18 KB Gutenberg-CSS weniger zu parsen.

**Das ist der „Ausfall" vom 01.09.2026.** Gemeldet wurde „die Seite ist down".
Der Monitor stand auf 200, Lighthouse zeigt eine vollständig gerenderte
Startseite. Beides stimmt: wer auf dem Telefon zehn Sekunden lang auf etwas
drückt, das nicht reagiert, hat eine kaputte Seite vor sich — und liegt damit
richtig. Ein Statuscode kann diese Sorte Ausfall nicht sehen. Mit 6,1 s bis
zur Bedienbarkeit ist das nicht behoben, aber halbiert.

**Der Hauptthread ist nicht durch JavaScript belegt.** Am 31.08. gemessen:
Script Evaluation 1501 ms, aber Style & Layout **3655 ms** und „Other"
5451 ms. Bei 17 200 Zeilen CSS und 191 Bild-Elementen auf der Startseite ist
das Layout die teure Arbeit, nicht der Code. **Wer hier zuerst am JavaScript
spart, spart an der falschen Stelle.**

**Das LCP-Element ist kein Foto.** Es ist `<div class="ai-hero-shot">` mit
einem Inline-SVG als Hintergrund — ein Element ohne Netzanfrage. Das LCP hängt
also an TTFB, aufbaublockierendem CSS und der Ausführung von `app.js`, nicht am
Bilddownload. Wer die Bilder optimiert, um das LCP zu senken, optimiert am Ziel
vorbei; Bilder sind ein Bandbreiten-, kein LCP-Posten.

**Der grösste verbliebene Einzelposten ist WebP: 660 KB.** Die Route dafür ist
seit dem 04.09. live, die Nachrüstung läuft im HQ über den 🗜️-Knopf. Erledigt
sind dagegen Stripe.js, die doppelten Stylesheets und das Gutenberg-CSS.


## „Fühlt sich nicht liquid an" — der Hauptthread kam nie zur Ruhe

Gemeldet am 08.09.2026. Das ist **kein Ladezeit-Befund**: die Seite war
fertig geladen und fühlte sich trotzdem zäh an. Gemessen im echten Chromium,
**vier Sekunden Leerlauf** auf der Startseite, ohne jede Interaktion:

| | Hauptthread | Stil-Neuberechnungen |
|---|---:|---:|
| vorher | **492 ms** | **237** |
| nachher | **73 ms** | **37** |

237 Neuberechnungen in vier Sekunden sind **60 pro Sekunde** — die Seite
rechnete durch, als würde jemand scrollen. Beim echten Scrollen verdreifachte
sich die Arbeit dadurch (60 ms statt 21 ms für dieselbe Geste). Genau das
fühlt man: jede Berührung konkurriert mit einer Dauerlast.

**Die Ursache lief in einem geschlossenen Dropdown.** `.nav-ai-overlay` steht
auf `opacity: 0`, sein `::before` trug `animation: navAiGradient 3s linear
infinite` — unbedingt. **`opacity: 0` heisst für den Browser nicht „weg",
sondern „gerendert und durchsichtig"**: die Animation lief weiter, für einen
Farbverlauf, den niemand sieht. Nur `display: none` nimmt eine Animation
wirklich aus dem Lauf, und das kann das Overlay nicht benutzen — es braucht
`opacity` für sein Ein- und Ausblenden.

Behoben, indem die Regel hinter `.nav-ai-overlay.show` wandert. **Optisch
ändert sich nichts**: beim Öffnen laufen wieder alle vier Animationen.

**Jede Animation wurde einzeln gemessen**, bevor etwas angefasst wurde
(4 s Leerlauf, Grundrauschen 66 ms): `navAiSparkle` 84 ms, `navGlowPulse`
177 ms, **`navAiGradient` 287 ms** — und nur letztere erzeugte die
frameweisen Neuberechnungen. Ein pauschales „alle Animationen raus" hätte
Gestaltung gekostet und den Hauptteil des Gewinns nicht gebracht.

**`will-change` machte es schlechter, nicht besser.** Die naheliegende
Ebenen-Beförderung für die zwei verbliebenen, sichtbaren Animationen ergab
97 ms statt 73 ms. Sie ist nicht eingebaut — eine Optimierung auf Verdacht
wäre hier eine Verschlechterung gewesen.

**`prefers-reduced-motion` senkte diese Kosten nicht.** Am kaputten Zustand
gemessen: 240 Neuberechnungen mit `reduce`, 241 ohne. Der globale Block setzt
nur die **Dauer** auf ~0; die Animation läuft weiter und rechnet weiter jeden
Frame neu. Wer Bewegungsreduktion einschaltete, zahlte denselben Preis und
sah die Bewegung bloss nicht.

**Das gilt seit dem 10.09.2026 nicht mehr — und war zwischendurch schlimmer,
als hier stand.** Die gezielten Regeln in `styles.css` halten inzwischen
wirklich an: im Ruhe-Modus laufen **null** Endlos-Animationen statt 105. Der
Hauptthread arbeitete danach aber **doppelt so viel**, nicht weniger. Der
ganze Vorgang steht unten unter „Die Maßnahme gegen Bewegung machte die Seite
teurer".

**Warum 827 grüne Tests das durchgelassen haben:** keiner hat je den Leerlauf
gemessen. Jeder prüfte, was nach einer Handlung passiert — und die Kosten
entstehen, wenn nichts passiert. `leerlauf.spec.js` schliesst die Lücke und
prüft die **Klasse**, nicht den Einzelfall: keine endlos laufende Animation
darf auf einem unsichtbaren Element laufen. Dazu eine Gegenprobe, dass das
geöffnete Overlay wieder animiert — sonst wäre „einfach löschen" der
bequemste Weg zu einem grünen Test.

**Am 09.09.2026 kam der zweite Teil.** Der erste Befund betraf die Leiste;
gemessen wurde damals aber der Zustand **direkt nach dem Laden**. Nach einem
`navigateTo('home')` sind es nicht 4 Dauer-Animationen, sondern **58** — der
Hero rendert sie selbst. Ein Prüfer, der einen Zwischenzustand misst, prüft
die Seite nicht.

Zwei weitere Ursachen, beide gemessen:

**Die Schreibmaschine in der Leiste lief endlos.** `_initNavAiTyping()`
schrieb alle 35–60 ms `el.textContent` neu — jeder Schreibvorgang zieht Stil-
Neuberechnung und Layout nach sich, und die Leiste steht auf **jeder** Seite.
Nach allen fünf Beispielsätzen ist gesagt, was der Effekt sagen soll; jetzt
bleibt der letzte Satz stehen und die Zeitgeber hören auf.

**Der Browser hält Animationen ausserhalb des Sichtfelds nicht an.** Weit
unten auf der Startseite waren **56 von 58** nicht im Bild und kosteten
trotzdem rund 250 ms Hauptthread je drei Sekunden. `ebDekoRuhenLassen()`
setzt über einen IntersectionObserver `.eb-deko-ruht`; die CSS-Regel hält mit
`animation-play-state: paused` an. Gemessen, weit unten:

| | vorher | jetzt |
|---|---:|---:|
| laufende Dauer-Animationen | 58 | **4** |
| Stil-Neuberechnung / 3 s | 137 ms | **54 ms** |

**`paused`, nicht `animation: none`.** Letzteres beendet und setzt zurück —
das Feuerwerk liefe bei jedem Hochscrollen von vorn los. Der Test misst
deshalb die **Laufzeit** einer Probe-Animation, nicht nur ihre Anzahl: nach
dem Zurückscrollen muss die Uhr weiterlaufen, wo sie stehengeblieben ist.
Ohne diese Prüfung überlebte die Mutation `paused → none`.

**Der Selektor braucht die Pseudo-Elemente.** `.eb-deko-ruht *` trifft
**keine** `::before`/`::after` — und genau dort sitzen die Feuerwerke
(`.hero-fw::after`). Ohne `*::before, *::after` pausierten nur 45 von 58, und
die teuersten liefen weiter. Fiel erst auf, weil die Probe-Animation trotz
gesetzter Klasse `running` blieb.

**Hier stand ein offener Posten, und er war falsch herum.** Wörtlich: *„eine
Grundlast von rund 400 ms je drei Sekunden, die auch mit allen Animationen
abgeschaltet bleibt. Sie kommt nicht von der Deko."* Am 10.09.2026
nachgemessen, Landeseite im Leerlauf, Hauptthread je drei Sekunden:

| Zustand | `TaskDuration` | Stil-Neuberechnungen |
|---|---:|---:|
| alles wie heute | 495 / 540 ms | 90 / 88 |
| Intervalle gelöscht (Schreibmaschine) | 543 / 523 ms | 95 / 88 |
| zusätzlich Marquee-rAF still | 423 / 379 ms | 88 / 93 |
| zusätzlich Animationen **angehalten** | **0 / 0 ms** | **0 / 0** |

**Es gibt keine unerklärte Grundlast.** Bei angehaltenen Animationen, totem
rAF und gelöschten Intervallen macht der Hauptthread exakt nichts. Rund drei
Viertel der Last sind die Deko — also genau das, was der Posten ausschloss.

**Der Irrtum steckte im Instrument.** Die frühere Messung schaltete die
Animationen mit `animation: none` ab. Das macht die Last **schlechter**, nicht
kleiner: heute gemessen stieg `Layerize` dabei von 306 auf **1487 ms**, weil
das Entfernen der Eigenschaft die Ebenen-Beförderung aufhebt und den
Ebenenbaum neu erzwingt. Nur `animation-play-state: paused` misst, was
Anhalten kostet. Ein Prüfer, der sein Subjekt verändert, misst sich selbst —
dieselbe Klasse wie ein Muster, das den erklärenden Kommentar trifft.

**Zwei Verdächtige der alten Liste sind ausdrücklich erledigt:** die
Schreibmaschine hört nach ihrer einen Runde wirklich auf (das Löschen aller
Intervalle brachte **keinen** messbaren Gewinn), und die rund 30
`requestAnimationFrame`-Aufrufe je Sekunde haben genau **eine** Quelle
(`scheduleFrame < tick`, der Hero-Marquee) und kosten im Normalbetrieb rund
64 ms — nicht 400.

**Was bleibt, ist eine Gestaltungsfrage, kein Fehler:** 105 endlos laufende
Deko-Animationen auf der Landeseite, alle im oder am Bild. Sie anzuhalten
spart gemessen **257 ms** (Median aus drei verschachtelten Runden: 646 → 389
ms). Das ist der Preis des heutigen Aussehens und eine Entscheidung des
Inhabers, keine Aufräumarbeit.


## Die Maßnahme gegen Bewegung machte die Seite teurer

Beim Nachmessen des Postens oben aufgefallen. Landeseite im Leerlauf, drei
Runden verschachtelt, Hauptthread je drei Sekunden:

| | Lauf 1 | Lauf 2 | Lauf 3 |
|---|---:|---:|---:|
| normal | 542 | 590 | 501 ms |
| **`prefers-reduced-motion: reduce`** | **1132** | **1085** | **1169 ms** |

**Wer Bewegungsreduktion einschaltete, zahlte das Doppelte** — und sah nichts
davon. Das trifft ausgerechnet die Gruppe, die sie am ehesten braucht, und es
ist über EN 301 549 auch ein BFSG-Thema.

Der Posten war `Layerize: 914 ms`, der Treiber der **Hero-Marquee**: derselbe
Zustand ohne seine rAF-Schleife ergab 158 / 400 ms. Er war zugleich das
einzige bewegte Element, das die Einstellung **gar nicht beachtet** hat — ein
dauerhaft laufendes Karussell ist genau die Bewegung, um die es dabei geht.

**Der Mechanismus ist der Grund, warum die Maßnahme sich umkehrte.** Laufende
Deko-Animationen halten ihre Elemente auf eigenen Compositor-Ebenen. Im
Ruhe-Modus sind sie aus, die Beförderung fällt weg — und jeder Marquee-Frame
erzwingt danach einen ungleich größeren Ebenenbaum. Dieselbe Mechanik wie beim
`animation: none` oben, nur ausgelöst durch eine Einstellung des Nutzers.

Behoben: `ebBewegungReduziert()` in `core/00-basis.js` ist der gemeinsame
Griff, und `startMarquee()` fragt ihn. Nachher: **331 / 289 / 51 ms**, der
Normalfall unverändert (600 / 559 / 505). Die Karten bleiben stehen, nicht
weg — der Inhalt ist die Sache, das Laufen nur die Darbietung.

**Live gefragt, nicht einmal gemerkt.** Die Einstellung ist im Betriebssystem
umschaltbar, während die Seite offen ist. `ebBewegungBeobachten()` hält den
Marquee nach; wer sie zurücknimmt, muss nicht neu laden. Und wer sein Ziel
verwirft, meldet den Horcher mit `ebBewegungVergessen()` wieder ab — der
Marquee baut sich bei jedem Rendern der Startseite neu auf, sonst wüchse die
Liste bei jedem Aufbau.

**`will-change: transform` steht nur, solange etwas läuft.** Eine Spur, die
stillsteht, hält sonst eine eigene Ebene für eine Bewegung, die es nicht gibt.

**Vier Module fragten die Medienabfrage je selbst ab**, der Marquee als
einziges bewegtes Element gar nicht. Sie laufen jetzt alle über den einen
Griff; ein Test hält die Regel und misst dabei die **Aufrufstelle**, nicht das
Wort — die Kommentare daneben nennen `prefers-reduced-motion` mehrfach.

### Und die Testvorgabe kam nie an

Beim Bauen der Tests dazu gemessen: `playwright.config.js` trug
`reducedMotion: 'reduce'` mit der Begründung *„Animationen beruhigen → stabile
Tests"*, und `leerlauf.spec.js` überschrieb sie mit `'no-preference'`.
**Beides war wirkungslos.** In einem Test ohne jedes `test.use` meldete
`matchMedia('(prefers-reduced-motion: reduce)').matches` **false** —
unmittelbar danach, im selben Browser auf derselben Seite, ergab
`page.emulateMedia({ reducedMotion: 'reduce' })` **true**.

Die Suite lief also immer mit vollen Animationen, und zwei Zeilen lasen sich,
als wäre das geregelt. Dieselbe Klasse wie der tote Gitleaks-Scan, diesmal in
der eigenen Testkonfiguration. Beide Zeilen sind weg, der Befund steht an
ihrer Stelle, und `pruefhygiene.spec.js` hält die Regel samt Gegenprobe: dass
`page.emulateMedia()` überhaupt noch wirkt — sonst prüfte niemand mehr etwas
und alles wäre grün.

**Der erste eigene Test dazu war selbst falsch.** Er schaltete die Einstellung
**um** und mass danach. Beim Umschalten ruft der Horcher aber ohnehin
`stopFrame()` — die Mutation „beide Wachen entfernt" überlebte deshalb alle
vier Tests. Ein Besucher schaltet nicht um: er hat die Einstellung stehen und
**lädt** die Seite damit, und dann tragen nur der Anfangswert und die Wachen.
Ein Prüfer, der einen Übergang misst, prüft den Zustand nicht — dieselbe Lehre
wie bei `topbar.spec.js` und beim Hero.

```bash
npx playwright test tests/e2e/leerlauf.spec.js   # Testzahl: siehe CLAUDE.md · echter Browser
```


## Drei Popper, die nie jemand gesehen hat — und was Anhalten nicht bringt

Am 13.09.2026 auf Wunsch des Inhabers angefasst: *„die animationen
reduzieren"*. Die Messung hat dabei zwei Dinge ergeben, und das zweite ist
das wichtigere.

**`app-shell.html` trug FÜNF Konfetti-Popper. Gerendert wurden immer zwei.**
Eine Regel `.ai-popper.pop-3, .pop-4, .pop-5 { display: none }` legte die
anderen still, mit dem Kommentar *„genau ZWEI — wie gewünscht"*. An fünf
Breiten gemessen (390 / 720 / 900 / 1280 / 1600 px) erschien keiner von ihnen
je. **78 Zeilen SVG gingen an jeden Besucher und zeigten nichts** — dazu drei
Layout-Regelblöcke, die ebenfalls nie griffen.

Dieselbe Klasse wie ein Prüfer ohne Subjekt, nur an der Oberfläche: etwas ist
da, sieht aus, als täte es etwas, und tut nichts. Stillgelegt wurde per CSS
statt entfernt — und eine CSS-Regel überlebt jeden Umbau, eine Markup-Leiche
auch. Markup und Regeln sind jetzt weg; wer einen dritten Popper will, legt
ihn an, statt einen versteckten zu entsperren.

### Und die erwarteten 107 ms gibt es nicht

Gemessen auf der Landeseite, Hauptthread je 3 s, verschachtelt mit Medianen:

| Zustand | |
|---|---:|
| alles läuft | 530 ms |
| alle Animationen **angehalten** | 389 ms |
| nur das Konfetti **angehalten** | 423 ms — **−107 ms** |
| Konfetti natürlich **ausgelaufen** | 472 ms — **−10 ms, also nichts** |

**Eine angehaltene Animation behält ihre Compositor-Ebene, eine beendete gibt
sie ab** — und der Ebenenbaum kostet zurück, was die Animation gespart hätte.
Dieselbe Mechanik wie `animation: none` gegen `animation-play-state: paused`,
diesmal nicht im Messgerät, sondern in der Änderung selbst. **Wer die 107 ms
erwartet, weil das Anhalten sie zeigt, bekommt sie nicht.**

`will-change` zu entfernen macht es ebenfalls schlechter, nicht besser:
466 ms mit, 493 ms ohne. Auch das ist eine Optimierung auf Verdacht, die hier
schon einmal danebenlag.

### Was bleibt, und was davon belegt ist

Zwei Änderungen, beide ehrlich beschriftet:

- **Weniger Teile:** drei Streifen-Punkt-Paare je Popper statt sechs. Der
  gemessene Gewinn ist **klein und verrauscht** — zwei Läufe ergaben −41 ms
  und −14 ms bei überlappenden Streuungen. Deshalb steht als Zusicherung
  keine Zahl im Test, sondern die Bedingung.
- **Endliche Laufzeit:** zwei Runden statt endlos. Auf dem Hauptthread
  **kein messbarer Gewinn** (siehe oben); begründet ist es anders — ein
  Popper ist ein Gruss, kein Dauerzustand, und endlos stand er von 72 % bis
  100 % jedes 11-Sekunden-Zyklus auf `opacity: 0`, während seine
  Unteranimationen weiterliefen. Nach 27 s laufen **null** Konfetti-
  Animationen statt 28. Derselbe Weg wie bei der Schreibmaschine in der
  Leiste.

**Die Rundenzahl steht an einer Stelle** (`--pp-runden`). Hülle, Kegel,
Streifen und Punkte müssen zusammen aufhören; vier Zahlen, die zusammen
stimmen müssen, driften — und dann kreisen die Punkte weiter, während die
Hülle stillsteht.

**Die Teile sind Paare.** Jeder Streifen endet in einem Punkt. Einen ohne den
anderen zu entfernen lässt einen Punkt im Nichts stehen: im Markup
unauffällig, im Bild ein Fehler. Ein Test zählt beide.

### Der grössere Posten liegt woanders

Bei derselben Gelegenheit gemessen, Landeseite im Leerlauf (Runden 2–3, die
erste Runde jeder Bedingung ist durch das Nachlaufen des Seitenaufbaus
verfälscht):

| | Hauptthread je 3 s |
|---|---:|
| alles an | ~320 ms |
| nur Animationen aus | ~175 ms |
| nur Marquee-rAF aus | ~241 ms |
| **beides aus** | **~31 ms** |

Mit beidem aus macht der Hauptthread fast nichts — die Leerlauflast ist
vollständig erklärt. Die Deko trägt rund 145 ms, der **Marquee-rAF rund
80 ms**. Wer nach der nächsten Reduktion sucht, findet sie dort, nicht bei
noch weniger Konfetti.

```bash
npx playwright test tests/e2e/deko.spec.js   # Testzahl: siehe CLAUDE.md · 5 Mutationen
```


## Bilder: das Format, nicht die Größe

**`srcset` bringt hier nichts, und das ist gemessen.**
`uses-responsive-images` meldet **0 Bytes** Einsparung — die Bilder werden
ungefähr so ausgeliefert, wie sie angezeigt werden. `modern-image-formats`
meldet dagegen **675 KB**. Eine frühere Notiz in dieser Datei empfahl
„Bildgrößen (`srcset`/WebP)"; die `srcset`-Hälfte war falsch und hätte viel
Mechanik für keinen Gewinn erzeugt.

**Der Weg geht über Apache, nicht über die Datenbank.** `eb_listings.images`
hält blanke URLs als JSON, ohne Attachment-ID. Diese URLs umzuschreiben wäre
ein Durchlauf über echte Nutzerdaten — genau die Sorte Eingriff, die hier
schon einmal Zahlungsdaten hätte löschen können. Stattdessen liegt
`foo.jpg.webp` **neben** `foo.jpg`, und `.htaccess` entscheidet je Anfrage.

Ausfallsicher in jede Richtung: fehlt die `.webp`-Datei (`-f` schlägt fehl),
fehlt `mod_rewrite`, oder schickt der Browser kein `Accept: image/webp`, kommt
unverändert das Original. **Es gibt keinen Zustand, in dem ein Bild fehlt** —
deshalb ist dieser Weg vertretbar und ein Umschreiben der Datenbank nicht.

**`Vary: Accept` ist Pflicht, nicht Kür.** Ohne den Kopf darf ein
Zwischenspeicher die WebP-Antwort an einen Client weitergeben, der kein WebP
annimmt; der bekäme unter einer `.jpg`-Adresse Bytes, die er nicht dekodieren
kann. Dieselbe Mechanik wie bei `Accept-Encoding` und Brotli.

**Der angehängte Name ist Absicht.** `foo.jpg.webp`, nicht `foo.webp` — ein
Nutzer darf `foo.webp` hochladen, ohne die Umsetzung von `foo.jpg` zu
überschreiben.

**Der Merkzettel ist der Ausstieg, kein Schönheitsfehler.** Ein Bild, dessen
WebP größer ausfällt, bekommt keine `.webp`-Datei — es bliebe damit Kandidat
und stünde bei jedem Lauf wieder vorn. Nach ein paar solchen Dateien käme die
Nachrüstung nie an den Rest. Deshalb hinterlässt **jeder** Ausgang außer
`erzeugt` und `vorhanden` eine leere `foo.jpg.webp.aus`, und `offen` rechnet
schlicht `vorher − geprüft`. Wer erneut versuchen will, löscht die Marker.

**Ausnahme: fehlendes `imagewebp()` schreibt keinen Marker.** Das liegt an der
Installation, nicht an der Datei — sonst wären nach einem GD-Nachbau alle
Bilder dauerhaft ausgeschlossen, und niemand wüsste, warum die Nachrüstung
nichts mehr findet.

**`imagepalettetotruecolor()` ist nicht kosmetisch.** Bei einem 8-Bit-PNG mit
transparentem Farbindex — dem verbreitetsten PNG aus Grafikprogrammen —
schreibt GD ohne die Zeile eine Datei, die `imagecreatefromwebp` **nicht mehr
öffnen kann**. Sie ist da, sie ist kleiner, der Rückgabewert lautet `erzeugt`,
und Apache lieferte sie aus: im Browser bliebe das Bild leer. Ein truecolor-PNG
kommt auch ohne die Zeile durch — daran überlebte die erste Mutationsprobe,
und der Test sah dabei grün aus.

Bedient wird das im HQ unter **🗜️ Bilder als WebP** (nur Administratoren; die
Sperre bleibt die Route `/hq/webp`). `GET` zeigt den Stand ohne zu schreiben,
`POST` setzt eine Runde um — gedeckelt bei 40 Bildern **und** 20 Sekunden,
denn ein Durchlauf, der ins PHP-Zeitlimit läuft, wird mitten in der Arbeit
abgeschnitten. Gemessen am Prüfstand: 227 KB → 86 KB, **62 %**.

```bash
npx playwright test tests/e2e/webp.spec.js   # Testzahl: siehe CLAUDE.md · echte Bilddateien
```


## Die Leiste war nicht kaputt, sie war verdeckt

Gemeldet am 06.09.2026: „die obere topbar ist nicht fixiert und da war ein
Rand". Beides stimmte, und beides kam aus **einer** Ursache. Gemessen auf
393×852, vor der Reparatur:

| | Lage | Stapel |
|---|---|---|
| `#navbar` | `fixed`, 0–104 | z-index **1000** |
| `#betaBanner` | `sticky; top: 0`, 0–**135** | z-index **9999** |
| `#page-browse` | ab 135, dazu `padding-top: 104px` | |

Der Banner lag **exakt über** der Leiste und war höher als sie. Am
Seitenanfang sah man von der Navigation also nichts; sie „erschien" erst beim
Scrollen, wenn der Banner weglief. Das liest sich wie „nicht fixiert", war
aber eine Überdeckung — `position: fixed` hat nie ausgesetzt.

Der zweite Teil der Meldung war eine **Lücke von 104 px**: `.page` reserviert
`padding-top: var(--nav-height)` für die Leiste, stand hier aber schon unter
dem Banner. Der Platz wurde zweimal genommen und einmal nicht gebraucht.

**Der Banner klebt nicht mehr.** Ein einmaliger Hinweis mit Schließknopf muss
das nicht: `position: static` plus `margin-top: var(--nav-height)` setzt ihn
in den Fluss unter die Leiste, und er scrollt mit. Die doppelte Reservierung
nimmt `body:has(#betaBanner:not([hidden])) .page { padding-top: 0 }` heraus.

**Das Schließen setzt `hidden`, nicht `style.display`.** Daran hängt die
`:has()`-Regel. Wer auf `display` zurückstellt, lässt die Seite ihre
Reservierung verlieren — und zwar **genau für die Besucher, die den Hinweis
weggeklickt haben**, also mit der Zeit für alle. Dieser Fall überlebte den
ersten Mutationsdurchgang und hat einen eigenen Test bekommen.

**Der erste Mutationsdurchgang war selbst fehlerhaft**, und das gehört zur
Lehre: die Suite misst `index.html`, und die wird aus `app-shell.html`
**erzeugt**. Eine Mutation an der Quelle ohne `./build-index-html.sh` erreicht
die geprüfte Seite nie und sieht aus wie ein überlebender Mutant. Wer hier
mutiert, baut vorher.

**Gemessen wird, was der Nutzer anfasst** — `document.elementFromPoint(20, 3)`
muss die Leiste treffen. Eine Prüfung auf `position: fixed` hätte diesen
Fehler nicht gefunden: die Angabe stimmte ja.


## Ein Stylesheet auf zwei Wegen

Derselbe Lauf zeigte vier Anfragen, die zwei hätten sein sollen:

```
styles.css?v=2.5.1          68 KB      fonts.css?v=2.5.1          1 KB
styles.css?ver=1787748136   68 KB      fonts.css?ver=1787748126   1 KB
```

`index.php` band beide Dateien fest per `<link>` ein, `functions.php` zusätzlich
per `wp_enqueue_style()`. Verschiedene Query-Strings sind für den Browser
verschiedene Adressen: er lädt beide, und beide blockieren den Aufbau. **70 KB
je Erstbesuch** — mehr, als Brotli einspart.

Für die Schriften war genau das am 21.08.2026 schon einmal behoben worden. Der
erklärende Kommentar blieb stehen, die Zeile darunter auch.

Die feste Kopie war zudem die schlechtere: `$asset_ver` ist eine von Hand
gepflegte Nummer, die seit `2.5.1` niemand hochgezählt hat — nach einem Deploy
liefert sie den alten Stand aus dem Zwischenspeicher, während die eingebundene
Fassung über `filemtime` frisch kommt. An der Kaskade ändert das Entfernen
nichts: die eingebundene Fassung kam schon vorher zuletzt.

**Neues Stylesheet → entweder `<link>` in `index.php` oder `wp_enqueue_style()`,
nie beides.** `ui-enhancements.css` und `release-vision.css` laufen bewusst nur
über den festen Weg. Geprüft wird die Bedingung, nicht der Einzelfall
(`tests/e2e/auslieferung.spec.js`): ein Test auf „styles.css steht nicht mehr in
index.php" wäre beim nächsten Doppelgänger wieder blind.


## Die Parole wurde länger, und `nowrap` stand noch da

Am 01.10.2026 auf Wunsch des Inhabers: aus *„EVENTBÖRSE, finde dein Event ©"*
wurde **„EVENTBÖRSE, PLANE DEIN PERFEKTES EVENT."**

**Das war nicht nur ein Austausch von Text.** `.ai-hero-line2` trug
`white-space: nowrap` — gesetzt, damit das frühere `©` nicht von seinem Wort
abbricht. Die neue Zeile ist **27 Zeichen in Grossbuchstaben statt 16
gemischt**: bei 390 px und `font-size: 2rem` passt sie nicht in eine Zeile.
Mit `nowrap` wäre sie aus dem Bild gelaufen und hätte **die ganze Landeseite
querscrollbar** gemacht — jede Wischgeste auf dem Telefon unsauber, und zwar
ohne Fehlermeldung.

Das ist die vertraute Klasse an einer neuen Stelle: eine CSS-Eigenschaft, die
für den alten Inhalt richtig war und für den neuen falsch ist. Wer nur den Text
tauscht, ändert die Bedingung, unter der die Regel galt.

**`inline-block` bleibt, `nowrap` geht.** Der Kasten hält den Verlauf über
beide Zeilen zusammen; umbrechen darf er trotzdem.

**Das `©` ist mit seiner Parole gegangen**, und `.ai-hero-cr` mit ihm. Eine
CSS-Regel ohne Subjekt überlebt jeden Umbau — dieselbe Klasse wie die drei
Konfetti-Popper hinter `display: none`. Soll die Marke auf die neue Zeile,
kommt sie samt Regel zurück; das ist eine Entscheidung des Inhabers, keine
Aufräumarbeit.

**Gemessen wird die Wirkung an drei Breiten** (390 / 768 / 1280), nicht das
Markup: ein Test auf „der Text steht da" wäre bei einer abgeschnittenen Zeile
grün. Geprüft werden `scrollWidth > clientWidth` an der Zeile, ihr rechter Rand
gegen das Fenster **und** `document.documentElement` — ein einziges zu breites
Element macht die ganze Seite querscrollbar.

**Die Gegenprobe gehört dazu:** „kein Überlauf" wäre auch erfüllt, wenn jemand
die Überschrift auf 10 px schrumpfte. Ein zweiter Test verlangt deshalb volle
Schriftgrösse **und** mehr als eine Zeile bei 390 px.

**Und die Mutationsprobe war zuerst aus dem falschen Grund grün.** Die Mutation
„Schrift kleingerechnet" setzte `clamp(2rem, 5.5vw, 3.6rem)` auf
`clamp(0.7rem, …)` — und überlebte. Bei 390 px bindet die untere Schranke
nämlich gar nicht: dort gilt die Mobil-Regel `.ai-hero-h1 { font-size: 2rem }`.
Mutiert wurde also eine Deklaration, die am Messpunkt nichts entscheidet. *Ein
Messgerät, das sein Subjekt nicht trifft, meldet Entwarnung* — dieselbe Lehre
wie bei der Mutation, die `planningSaveFragment()` statt der gemeinten Funktion
traf.

Fünf Mutationen, jede macht die Suite rot: `nowrap` zurück (**4 rot**) · alte
Parole zurück · Schrift kleingerechnet · der `background-clip: text` entfernt ·
`index.html` nicht neu gebaut (**3 rot**).

```bash
npx playwright test tests/e2e/hero-headline.spec.js   # Testzahl: siehe CLAUDE.md · 5 Mutationen
```

**Am 08.10.2026 nicht mehr in Grossbuchstaben**, ebenfalls auf Wunsch des
Inhabers: die Parole heisst jetzt **„Plane dein perfektes Event."**, die Marke
davor bleibt `EVENTBÖRSE`. Gemessen wird der **gerenderte** Text samt
`text-transform` — ein `uppercase` an Zeile oder Überschrift machte aus dem
Markup wieder Grossbuchstaben, und ein Test auf das Markup bliebe grün.


## Schriften und Bibliotheken liegen im Theme

`assets/fonts/` (Inter als **variable** Schrift, 48 KB für alle Gewichte;
Material Icons Round) und `assets/lib/` (Leaflet 1.9.4 mit `images/`,
Flatpickr 4.6.13 + `de`). Google, unpkg und jsDelivr sind **keine Empfänger
mehr** — weder in `functions.php`, noch in `index.php`, noch in der Dev-Shell.

Die CSP ist entsprechend eng: `script-src` erlaubt nur noch `js.stripe.com`,
`font-src` gar keinen fremden Host. **Wer eine Bibliothek wieder von außen
holt, muss beides bewusst aufmachen** — und `recht.mjs` verlangt dann einen
Eintrag in der Datenschutzerklärung.

Achtung beim Ablegen neuer Dateien: `.gitignore` enthält ein nicht verankertes
`vendor/`, das auch `assets/vendor/` verschluckt. Deshalb `assets/lib/`.

**Ein Handle ist ein globaler Name — deshalb `eb-`.** Bis zum 02.09.2026
hießen die Einbindungen schlicht `leaflet` und `flatpickr`. Das war nicht bloß
unsauber, es war **kaputt**, und der Lighthouse-Lauf gegen die Live-Seite hat
es gezeigt:

```
/wp-content/plugins/elementor/assets/lib/flatpickr/flatpickr.min.css?ver=4.6.13
/wp-content/plugins/elementor/assets/lib/flatpickr/flatpickr.min.js?ver=4.6.13
```

Die eigenen Dateien kamen **nicht vor**. Elementor registriert den Handle
`flatpickr` früher, und `wp_enqueue_style()` mit einem bereits registrierten
Handle verwirft `src` und `version` stillschweigend — erkennbar allein am
`?ver=4.6.13` statt des `filemtime`.

Die Folge: der **Datumswähler der Buchung** lief über die Kopie eines Plugins,
das dieses Theme nirgends anfordert, und `flatpickr-de.js` band sich an dessen
Build. Das ging gut, weil dort zufällig dieselbe Version liegt. Zieht Elementor
auf Flatpickr 5, bricht die Buchung — ohne dass hier eine Zeile geändert wurde.

Die Aussage „liegt im Theme" war für die Datei richtig und für die
**Auslieferung** falsch. Das ist der Unterschied zwischen einer Ablage und
einer Einbindung, und er fällt nur in einer Messung am Live-System auf.

**Neue Bibliothek → Handle mit `eb-` davor.** `auslieferung.spec.js` prüft das
für jede Einbindung aus `$vendor`, nicht für die drei bekannten Namen.


## Was nichts gestaltet, wird abbestellt

`index.php` ruft **nie `the_content()`** — es gibt die SPA-Hülle aus. Der
Inhalt einer WordPress-Seite wird im Frontend also nirgends gerendert, und
damit gestaltet Gutenbergs Block-Bibliothek garantiert nichts: 18 KB,
aufbaublockierend, für Markup das nicht existiert.

`eb_fremde_stile_abbestellen()` nimmt sie heraus, **nur im Frontend** (im
Blockeditor wird dieselbe Vorlage gebraucht) und bei **Priorität 100** — bei
der Standardpriorität liefe das Abbestellen vor den Registrierungen von
WordPress und griffe ins Leere, grün und wirkungslos.

**Die Bedingung ist getestet, nicht die Maßnahme.** Wer `the_content()` wieder
einbaut, macht das Abbestellen falsch — und genau darauf prüft der Test. Das
ist der Unterschied zu einer Optimierung auf Verdacht.

**Bewusst nicht angefasst:** Elementors Flatpickr (ein Skript, an dem
Fremdcode hängen könnte — seit den `eb-`-Handles lädt unsere Fassung ohnehin,
die Kopie ist Ballast ohne Risiko) und jQuery (welches Plugin es braucht, ist
von hier nicht feststellbar).


## Bilder: Upload und Demo-Bestand

**Nutzer-Uploads liegen bereits richtig.** `POST /upload` → `wp_handle_upload()`
→ `wp_insert_attachment()`: die Datei landet in `wp-content/uploads` auf IONOS
und bekommt einen Mediathek-Eintrag mit Besitzer (`_eb_owner_id`). Sieben
Prüfschichten davor, unter anderem MIME aus den **Magic Bytes** (nie aus
`$file['type']` — das schickt der Browser) und eine Gegenprobe mit
`getimagesize()`; was durchfällt, wird gelöscht. Festgehalten in
`tests/e2e/upload.spec.js`.

**Die hardcodierten Demo-Daten hotlinken dagegen auf Pexels.** Sie holt
`POST /hq/demo-bilder` (nur angemeldeter Administrator) in dieselbe Mediathek —
**auf dem Server**, weil nur der Netzzugang zu Pexels hat. Der Aufruf ist
wiederholbar und holt höchstens 15 Bilder je Lauf; ein Import, der ins
PHP-Zeitlimit läuft, hinterließe sonst einen halben Zustand. Die Antwort nennt
`offen` — erst bei 0 geht nichts mehr an den Fremdhost.

Bedient wird das im HQ unter **🖼️ Demo-Bilder** (nur für Administratoren
sichtbar; die Sperre bleibt die Route). `GET` auf denselben Pfad zeigt den
Stand, **ohne** zu laden oder zu schreiben — ein Blick mit Nebenwirkungen wird
seltener geworfen, als er sollte. Der Knopf ruft in Runden auf und hört bei
`offen = 0` **und** bei einer Runde ohne Fortschritt auf: eine Schleife, die nur
ein Ziel kennt und keinen Ausstieg, stößt bei einem nicht erreichbaren
Fremdhost zehnmal umsonst an.

`offen` zählt die **Schnittmenge** aus Adressen und Zuordnung, nie die Einträge
der Zuordnung. Nach einem neuen Demo-Feed stehen alte Adressen weiter darin;
wer Einträge zählt, meldet dann zu wenig Offene — im schlimmsten Fall eine 0,
während noch Bilder an Pexels gehen.

Die Zuordnung liegt in der Option `eb_demo_bilder_map`, wird über
`eventboerseApi.demoBilder` ausgeliefert und **einmal beim Start** angewandt
(`ebDemoBilderUmschreiben`, aufgerufen am Ende von `ui/52-release-vision.js`).
Nicht bei jedem Rendern: das wären 191-mal dieselbe Arbeit. **Was nicht in der
Zuordnung steht, bleibt unverändert** — ein stillschweigend ersetztes Bild wäre
schlimmer als eines, das weiter von außen kommt.


## Bilder und Ladezeit

Die Demo-Bilder kommen von **Pexels**, bis der Import im HQ gelaufen ist (siehe
oben). `scripts/localize-demo-images.mjs` ist der **überholte** Weg dorthin: es
schreibt die URLs auf lokale Theme-Pfade um, braucht Netzzugang zu Pexels — den
die Agent-Umgebung nicht hat — und ist nie gelaufen. Der Weg über die
WordPress-Mediathek ist der richtige, weil die Bilder dort dieselbe Behandlung
bekommen wie ein Nutzer-Upload. **Das Skript nicht mehr benutzen.**

**Die Icon-Schrift ist zugeschnitten.** Material Icons Round trug 2200 Symbole
und 170 KB; benutzt werden 403. Die ausgelieferte Datei ist **34 KB**, die
Quelle liegt unter `scripts/lib/` und wird nie ausgeliefert (`^scripts/` ist im
Deploy ausgeschlossen).

```bash
node scripts/icons.mjs           # Auswahl aus dem Code sammeln
python3 scripts/icons-subset.py  # zuschneiden (pip install fonttools brotli)
node scripts/icons.mjs --check   # CI-Tor: benutzt der Code ein fehlendes Icon?
```

Gesammelt wird **rückwärts**: von den 2200 möglichen Namen bleibt jeder, der im
Code als eigenständiges Wort vorkommt. Ein guter Teil der Icons steht nämlich
nicht im Markup, sondern in einer Variablen (`'…>' + stage.icon + '<…'`) — eine
Sammlung, die nur `>name<` liest, verlöre genau diese. Zu viel mitzunehmen
kostet Bytes, zu wenig einen leeren Kasten in der Oberfläche.

**Neues Icon → `node scripts/icons.mjs && python3 scripts/icons-subset.py`.**
Sonst bricht der PR-Check ab, und ohne ihn wäre das Symbol im Betrieb leer.

**Das Tor mass bis zum 09.09.2026 die falsche Datei.** `--check` verglich
die benutzten Icons gegen `material-icons-benutzt.txt` — eine Liste, die
`icons.mjs` **selbst schreibt**. Wer die Liste erneuerte und den Zuschnitt
vergass, bekam ein grünes Tor bei veralteter Schrift; die neuen Symbole
wären im Betrieb leere Kästen gewesen. Die Meldung sagte „in der
ausgelieferten Schrift" und meinte „in der Wunschliste".

Aufgefallen beim Bauen der Jetzt-Ansicht: acht neue Icons, `icons.mjs`
gelaufen, `--check` **grün** — und die Schrift unverändert bei 386
Symbolen. Der Prüfer hatte sich mit sich selbst verglichen.

Behoben: `icons-subset.py` liest die fertige Schrift ohnehin zurück
(die Ligatur-Gegenprobe) und schreibt das Ergebnis jetzt nach
`material-icons-in-schrift.txt`. Diese Datei entsteht **nur beim
Zuschneiden** und kann der Schrift deshalb nicht vorauseilen; `--check`
misst gegen sie. Fehlt sie, ist das Exit 1 — nicht messen ist kein
Bestehen.

Mutationsgeprüft: ein Symbol aus dem Verzeichnis entfernt → rot;
Verzeichnis gelöscht → rot; heiler Zustand → grün. Und die Gegenprobe,
die den Befund belegt: dasselbe Symbol steht weiterhin in der
**Auswahlliste** — der alte Weg wäre also grün geblieben.

Zwei Fallen, beide still, beide durch `tests/e2e/icons.spec.js` am gerenderten
Ergebnis abgesichert: die Ligaturen liegen unter **`rlig`**, nicht `liga` (wer
nur `liga` behält, bekommt eine Schrift, die in jedem Knopf den Iconnamen als
Wort zeigt), und ohne **`layout_closure = False`** zieht der Subsetter über die
Ligaturregeln fast alle 2200 Symbole zurück — 157 KB statt 32 KB, technisch
korrekt und nutzlos.

**Anfragen zählen, nicht Elemente.** Die Startseite trägt 191 Bild-Elemente,
löst aber nur ~11 eindeutige Anfragen aus: die 180 Marquee-Karten teilen sich
dieselbe Adresse, und der Browser fasst gleiche URLs zusammen. Eine Optimierung,
die Elemente zählt, optimiert hier das Falsche — der Test in
`tests/e2e/bild-laden.spec.js` prüft deshalb das Verhältnis von Elementen zu
Anfragen.

`EB_IMG_LAZY_ATTR` und `EB_IMG_EAGER_ATTR` in `core/00-basis.js` stehen an einer
Stelle. **Das grosse Bild oben nie verzögern** — ein verzögertes LCP-Element
macht die Seite langsamer. `loading` muss im Markup stehen, bevor das Bild ins
Dokument kommt; nachträglich gesetzt ist es wirkungslos.


## Icons statt Emojis in der Suche

Ein Emoji zeichnet die Schrift des **Systems**: auf Android anders als auf
iOS, auf Windows anders als auf beiden, in mancher Linux-Umgebung gar nicht.
Es lässt sich nicht einfärben und im Dunkelmodus nicht abdunkeln.

`EB_KATEGORIE_ICON` in `search/11-suche-ki.js` ist **eine** Zuordnung für vier
Ausgabestellen. Vorher trug jede Liste ihre eigenen Emojis — Floristik hatte
in `CATEGORY_EMOJI` ein anderes Zeichen als im Suchvokabular, dieselbe
Kategorie mit zwei Symbolen. `CATEGORY_EMOJI` ist ersatzlos entfallen.

**Die Event-Auswahl behält ihre Emojis, mit Absicht:** sie rendert in ein
`<option>`, und dort erlaubt kein Browser Markup — ein `<span>` erschiene als
Text oder verschwände. Ein Test, der dort Icons verlangte, erzwänge einen
kaputten Zustand.

**Neues Icon → `node scripts/icons.mjs && python3 scripts/icons-subset.py`.**
Sonst fehlt der Glyph im Zuschnitt und der Knopf bleibt leer.
