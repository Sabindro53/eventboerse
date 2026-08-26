---
layer: L5
domain: evolution
share: internal
tags: [layer/L5, domain/evolution, share/internal]
---

# Roadmap: Aktueller Sprint

> Ziel: Die beste und funktionalste Eventplattform für jedermann

## Stand heute (2026-08-15)

Diese Zahlen gelten JETZT. Weiter unten stehen abgeschlossene Sprints mit den
Zahlen ihrer Zeit — die sind Historie, kein Ist-Stand. Der Ensemble-Kontext
liest diese Datei von oben; ein Modell, das „68 Tests" als aktuell meldet, hat
einen alten Abschnitt gelesen und nicht diesen.

- **Playwright-Suite: 567 Tests in 32 Suiten**, blockierendes Gate in `pr-check.yml`.
  Läuft seit dem Self-Hosting auch ohne Netzzugang vollständig durch
- Tore grün: Wissensbasis, Quarantäne, Demo-Feed, Connectors, Modell-Ensemble,
  Arbeitsjournal, app.js-Drift, **Recht**
- **Ensemble-Puls: alle 30 Min. angefordert** (`*/30`). GitHub plant geplante
  Läufe best-effort; gemessen lagen 31–82 Min. dazwischen (Median 41). Eigener
  Topf **$0,50/Tag** — Journal als echte Laufzeitspur per SFTP
- **Autopilot: eigener Topf $1,50/Tag**, zusammen mit dem Puls die freigegebene
  Obergrenze von $2,00. Er arbeitet bei **jedem erreichten Lauf**; das Zählwerk
  `GITHUB_RUN_NUMBER % 12` ist weg — es sollte „stündlich" heißen und hieß rund
  achtstündlich, weil der 5-Minuten-Cron real alle ~41 Min. feuert. Gebremst
  wird über das Tagesbudget, das OpenRouters `usage_daily` liest und **vor** dem
  ersten Modellaufruf greift
- **Befund → Arbeit steht.** `scripts/auftragsstrom.mjs` macht aus
  Journal-Befunden eine Warteschlange mit Herkunft, aus der der Scout zieht
- **Freigegebener Rahmen: 15 Dateien** (`scripts/lib/sichere-dateien.mjs`,
  geteilt von Autopilot und Auftragsstrom). Die Aufnahmekriterien stehen als
  Test: höchstens 1200 Zeilen, 8 Auth-, 20 Geld-, 12 Upload-Vorkommen — **im
  Code gemessen, nicht im Fließtext**. Nie aufnehmen: `board/`,
  `core/30-auth.js`, `payments/`
- **Ein Patch darf Schutzkonstrukte nicht wegnehmen.** Die Musterprüfung sah
  nur hinzugefügte Zeilen; `${escHtml(n)}` → `${n}` trifft dort nichts. Geprüft
  wird die Bilanz von acht schützenden Konstrukten
- **Rechtliches wird gemessen** (`scripts/recht.mjs`, Tor in `pr-check.yml`,
  täglich in der Tagesroutine). Vier Aussagen des Vaults werden gegen den Code
  geprüft: Speicherschlüssel ↔ Cookie-Liste, Wirksamkeit der Einwilligung,
  Pflichtseiten ↔ Routen, KI-Transparenz.
  **Erste Messung am 15.08.:** Die Cookie-Liste beschrieb 12 Schlüssel, von
  denen **11 nicht existierten**, und übersah **23 echte** — darunter
  `eb_radar_ort` (Standort) und `eb_taste_v1` (Präferenzprofil). Sie stammte aus
  Mai und war nie nachgeführt worden. Jetzt: 24 zu 24.
- **Die Einwilligung wirkt (20.08.).** Vorher wurde `eb_cookie_consent` gesetzt
  und von **keiner** der 11 schreibenden Dateien gelesen — und der Banner hatte
  nur einen Knopf, also gar keine Wahl. Dazu behaupteten Banner,
  Cookie-Richtlinie **und** Datenschutzerklärung „ausschließlich technisch
  notwendige Cookies", während `eb_taste_v1` ein Präferenzprofil und
  `eb_radar_ort` den Standort ablegte: eine Falschaussage in drei Rechtstexten.
  Jetzt: `ebSpeichern()` prüft vor jedem nicht-essenziellen Schreibvorgang,
  20 Schreibstellen laufen darüber, ein Widerruf löscht das bereits Gespeicherte,
  und `EB_SPEICHER_KLASSEN` wird gegen die Cookie-Liste geprüft
- **Zugänge vergibt man im HQ** (🔑-Abschnitt, nur für Administratoren sichtbar).
  Vorher ging das nur per API-Aufruf von Hand — eine Fähigkeit, die niemand
  bedienen kann, wird nicht benutzt, und dann bekommt der Kollege eben doch
  Adminrechte, weil das der einzige Knopf war
- Repo bleibt **bewusst public** (Entscheidung des Inhabers, Open Source als
  Ziel). Geprüft und belegt: die zehn `share: secret`-Notizen enthalten
  **Beschreibungen von Maßnahmen, keine Werte** — 0 Treffer für die
  `GEHEIMNISSE`-Muster, 0 Treffer für Zugangsdaten-Formate, auch über die
  gesamte Historie (`git log --all -p`). Keine Rotationspflicht. Was offenliegt,
  ist eine Landkarte der Angriffsfläche, kein Schlüsselbund — beim Schreiben
  neuer Security-Notizen bleibt genau das die Grenze.

### Vision Release (13.08., #144–#147) — nicht von mir, hier festgehalten

Zwischen 12:27 und 13:46 sind vier PRs eingegangen, die den Ist-Stand oben
mitbestimmen. Sie stehen hier, damit der Ensemble-Kontext sie kennt:

- **#144 Vision Release** — Business-Cockpit für Dienstleister (KPIs, Steuern,
  PDF, Media Studio), Radar als eigener Feed-Kanal mit Stadt und Radius,
  Vertrauensnetzwerk, HQ Voice. Neu: `js/modules/ui/52-release-vision.js`,
  `release-vision.css`, `tests/e2e/vision-release.spec.js`.
- **#145 Hotfix** — HQ statisch abgeschottet, Release-Styles laden.
  Neu: `scripts/build-protected-hq.mjs` erzeugt `hq-protected.php` mit
  vorgeschaltetem PHP-Wächter.
- **#146 Hotfix** — interne Wissens- und Markdown-Pfade werden aus
  Agententexten redigiert, bevor sie im HQ erscheinen.
- **#147** — der HQ-Kreis beendet sein Gespräch logisch, operative Antworten
  sind abgesichert.

Berührung mit meinen Änderungen: **keine.** Die vier PRs haben weder `vault/`
noch `assets/eb-knowledge.json` angefasst.

## Zuletzt ausgeliefert (August 2026)

- [x] **Die Antworten des EB Circle passen jetzt zur Frage.** Mit Beleg
  gemeldet: „Was sind denn die nächsten konkreten Verbesserungen?" → eine Notiz
  über Planungsfehler, allein wegen **„sind"** in deren Überschrift. „Kann ich
  eine Aufgabe an dir geben?" → Suchvorschläge, wegen **„an"** und **„dir"**.
  Kein inhaltstragendes Wort war beteiligt. Vier Ursachen: `ask()` nahm den
  Kontexttreffer (Schwelle 4) als Antwort statt den Antworttreffer (Schwelle 5);
  ein einzelnes Allerweltswort genügte; ein Präfix im Fließtext zählte wie ein
  Stichwort; und die deutsche Beugung verhinderte den richtigen Treffer
  („Registrierung" ↛ „Wie registriere ich mich?"), weshalb eine Notiz gewann,
  die das Wort zufällig als Stichwort führte. Dazu: die Antwort **greift die
  Frage auf**, und Fragen über den Kreis selbst werden endlich beantwortet.
  17 Mutationen; vier überlebten zunächst, drei davon wieder wegen ungetesteter
  Verdrahtung. **558 Tests in 31 Suiten.**

- [x] **Freihändiges Dazwischenreden.** Während der Kreis spricht, misst ein
  Mithörer den Pegel; wer anfängt zu reden, übernimmt ohne Knopfdruck. Das ist
  bewusst dieselbe Anordnung, die am 22.08. das Selbstgespräch erzeugt hat —
  ein offenes Mikrofon während der Ausgabe. Vertretbar nur durch drei
  Sicherungen: **geeicht** statt geraten (die ersten 600 ms messen Raumgeräusch
  plus Echo-Rest, die Schwelle liegt das 3,5-fache darüber), **gehalten** statt
  gezuckt (350 ms, sonst unterbricht jeder Türknall) und **selbstbegrenzend**
  (zwei Fehlalarme schalten es für die Sitzung ab, mit sichtbarem Hinweis).
  15 Mutationen; vier überlebten zunächst und deckten dabei zwei Schwächen in
  meinen eigenen Tests auf: der geprüfte Nachhall-Pegel lag unter der absoluten
  Untergrenze, sodass die Eichung gar nicht den Unterschied machte, und der
  Prüfstand las den Eichfaktor aus der Quelle — er änderte sich also mit der
  Mutation. **547 Tests in 31 Suiten.**

- [x] **Der EB Circle führt ein Gespräch statt eine Ansage.** Gemeldet: eine
  „komische Gegennachfrage" nach dem Lagebericht — *„Untertitel der
  Amara.org-Community"*. Das war keine Frage des Kreises, sondern eine
  **Whisper-Halluzination**: das Modell hat mit Untertiteldateien gelernt und
  füllt Stille mit deren Abspann. Der Kreis hielt das für eine Frage des
  Inhabers und beantwortete sie. Dazu drei weitere Punkte: ein Druck während
  der Antwort **beendete das ganze Gespräch**, statt zu unterbrechen — man
  konnte also nicht dazwischenreden; eine Rückfrage wie „und was heißt das?"
  ging an die Wissensbasis, die darauf irgendetwas Schwaches findet; und der
  Lagebericht meldete „Selbstcheck vom **ohne Datum**", weil er `erzeugt` las,
  während das Feld `generatedAt` heißt. 16 Mutationen; zwei überlebten
  zunächst — wieder, weil die Verdrahtung ungetestet war und nicht die Regel.
  **538 Tests in 31 Suiten.**

- [x] **Der EB Circle redet nicht mehr mit sich selbst.** Gemeldet vom Inhaber:
  „redet einfach so, ohne dass ich was frage" — und dabei andauernd „Wie füge
  ich einen Dienstleister hinzu?". Beide Symptome hatten **eine** Ursache: das
  Mikrofon ging 120 ms nach der Sprachausgabe wieder auf, hörte den Nachhall
  der eigenen Antwort, und ein einzelnes Wort daraus („Dienstleister") trifft
  die Überschrift der Board-Notiz — also las er sie erneut vor. Bei Stille
  öffnete es sich **endlos** neu, was auch ein Datenschutzproblem ist. Jetzt
  führt ein Weg vom Mikrofon zur Frage, mit Echo-Erkennung, Füllwortfilter,
  700 ms Abstand und einer Runden-Grenze. Zwei eigene Fehler beim Bauen
  gefunden: der Rundenzähler wurde in `toggleMic()` zurückgesetzt (also auch
  beim automatischen Nachhören — die Grenze wäre wirkungslos gewesen), und die
  Echo-Prüfung las einen Merker, den ich eine Zeile vorher gelöscht hatte.
  15 Mutationen; zwei überlebten zunächst, weil ich nur die Einzelregeln
  testete und nicht die Funktion, die sie verdrahtet.
  **525 Tests in 31 Suiten.**

- [x] **Die vier Pflicht-Checks laufen jetzt als Tests.** Der Sprint führte sie
  seit Langem als P0-Merkzettel „nach jedem Deploy" — und ein Merkzettel wird
  beim dritten Deploy nicht mehr abgearbeitet. Vorn steht der
  **Selbstbuchungsschutz**, eine Geld-Regel: wer sein eigenes Inserat bucht,
  schleust Geld im Kreis, erzeugt eine Provision auf sich selbst und
  verfälscht jede Kennzahl. Geschützt war er an vier Stellen, getestet an
  keiner. Zehn Tests, zehn Mutationen — zwei davon deckten **hohle Tests von
  mir** auf: der Buchungstest bestand, weil `bookListing()` mangels
  ausgefülltem Formular ohnehin abbrach (mein injiziertes Feld hatte dieselbe
  ID wie das echte aus `app-shell.html`, und `getElementById` nimmt den
  ersten), und der Demo-Toggle wurde an einer Ableitung statt an
  `filterDemos()` gemessen. **502 Tests in 29 Suiten.**

- [x] **Mehrfachzeiten je Paketposition.** Eine Position kann am Eventtag
  mehrfach stattfinden — Fotograf zur Trauung und zur Party, Catering mittags
  und abends. Bisher trug eine Karte genau eine Zeit, also legte man dieselbe
  Position zweimal an und buchte, bezahlte und bestätigte sie dann auch
  zweimal. `card.times` ist jetzt die Wahrheit, `startTime`/`endTime` bleiben
  **Spiegel der ersten Zeit**: der Server und jede ungelesene Codestelle sehen
  weiter eine gültige Zeit. **Keine Migration** — bestehende Karten werden beim
  Lesen abgeleitet, nicht umgeschrieben; ein Durchlauf über alle Karten ist
  genau die Sorte Eingriff, die heute Zahlungsdaten hätte löschen können. Im
  Ablauf erscheint eine Position je Zeit einmal, mit Zähler „2/3". 20 Tests,
  17 Mutationen einzeln geprüft — eine davon deckte auf, dass der **Anlege-Pfad**
  gar nicht getestet war: `times: []` dort kam durch alle anderen Tests, und
  der Nutzer hätte beim Hinzufügen Zeiten gesetzt und keine bekommen.

- [x] **Überschneidungswarnung.** Live im Formular, als Markierung auf der
  Karte, **nie blockierend** — Aufbau und Service dürfen sich überlappen. Zwei
  Regeln halten sie glaubwürdig: ein offenes Ende warnt nicht (sonst
  kollidierte fast jedes Paar mit offenem Ende), und Berührung ist kein
  Konflikt (14–16 und 16–18 ist ein Ablauf). Über Mitternacht wird gerechnet,
  weil die Nacht-Vorauswahl selbst „22:00 – 02:00" erzeugt und ein
  Textvergleich 02:00 für früher als 23:00 hielte. Beim Bauen einen echten
  Fehler gefangen: `display: flex` schlägt das eingebaute `[hidden]`, also
  stand ein leerer bernsteinfarbener Kasten unter jeder Zeitliste — gefunden
  nur, weil ein Test auf `toBeHidden()` prüfte. Zehn Mutationen; eine überlebt
  und ist als äquivalent vermerkt. **500 Tests in 29 Suiten.**

- [x] **Der QA-Bot trifft jetzt das richtige Thema.** Die Zuordnung entscheidet,
  welche Knöpfe der Nutzer bekommt — und war nie gegen echte Sätze gemessen.
  Von 16 realistischen Fragen landete eine falsch: „Wie schreibe ich einen
  Anbieter an?" ging an `listing`, also bekam der Fragende **„Inserat
  erstellen"** angeboten. Ursache war nicht ein fehlender Auslöser allein,
  sondern der **Stichentscheid**: bei Gleichstand gewann das Thema, das im
  Array weiter oben steht — also der Zufall der Sortierung. Jetzt gewinnt der
  längste wirklich getroffene Auslöser, das spezifischere Indiz. Dazu fehlende
  Stämme (`anschreib`, `kontaktier`) — Vollformen greifen nicht, weil der
  Auslöser IM Satz vorkommen muss. Fünf Tests: die Fragetabelle, eine
  Gegenprobe mit Kauderwelsch (sonst wäre „trifft immer" erfüllend), kein Thema
  ohne Aktion, kein neuer doppelter Auslöser. Vier Mutationen; eine überlebt
  und ist als verhaltensgleich vermerkt. **463 Tests in 27 Suiten.**

- [x] **Der Kontext wird nachgemessen.** `CLAUDE.md` ist das erste, was jede
  Sitzung liest — und war die einzige Datei, die niemand nachmisst. Vier
  Angaben waren veraltet: 22 statt 24 Module, 86 statt 101 Routen, „~16 300
  Zeilen CSS" statt 17 100, und beim Messaging „alle 3s" für ein Polling, das
  längst bei 5 s beginnt, bis 20 s zurückfällt und bei verstecktem Tab
  pausiert. Die letzte war die teuerste: sie beschrieb eine **Schwäche, die es
  nicht mehr gibt**. `scripts/kontext.mjs` prüft das jetzt im PR. Zwei Fallen
  beim Bauen selbst gefunden: mein erstes Muster für den Autopilot-Rahmen
  übersah die drei CSS-Dateien und hätte beinahe eine korrekte
  Sicherheitsgrenze kleiner geschrieben, als sie ist; und der eigene
  Dokumentationstext zitierte die alte CSS-Zahl, worauf das Muster zwei
  Stellen traf — seitdem ist **mehrdeutig** ebenso ein Fehler wie **nicht
  gefunden**. Sechs Tests, fünf Mutationen gegen den Prüfer selbst.
  **458 Tests in 26 Suiten.**

- [x] **Board-Sync: die Zusammenführung ist jetzt abgesichert.** Das Board liegt
  in `localStorage` UND auf dem Server; `_mergeBoardProjects()` entscheidet, welche
  Fassung überlebt. Ein Fehler dort verliert die Planung eines Nutzers oder lässt
  gelöschte Projekte wieder auftauchen — beides bemerkt man erst, wenn es passiert
  ist, und beides war ungeprüft. Neun Tests an der echten Funktion im Browser, nicht
  an einer Nachbildung: nur-lokale Projekte überleben, die neuere Fassung gewinnt in
  **beide** Richtungen (eine Richtung allein bestünde auch mit „immer Server"),
  `createdAt` springt ein, wenn `updatedAt` fehlt, Gelöschtes kehrt nicht zurück —
  eine Bearbeitung **nach** dem Löschen aber schon, sonst liesse sich eine ID nie
  wieder verwenden. Dazu die Grabsteine: das spätere Löschdatum gewinnt, alte
  verfallen nach 60 Tagen, und ein kaputter Speicherstand legt das Board nicht lahm.
  Zehn Mutationen einzeln geprüft.

- [x] **Die Stage-Migration darf keine Zahlung löschen.** Sie läuft bei jedem
  Laden über alle Karten und leert Zahlungsfelder — sie räumt einen alten,
  künstlichen „Bezahlt"-Marker weg, den die frühere Provider-Annahme ohne echte
  Stripe-Referenz gesetzt hatte. Geprüft war nur, dass sie ihn **wegräumt**;
  dass sie eine echte Zahlung **stehen lässt**, nicht. Eine Mutation, die
  `!card.paymentIntentId` aus der Bedingung nimmt, löscht jeden Zahlungsbeleg
  bei jedem Laden — und kam durch die gesamte Suite. Fünf Tests: echte Zahlung
  überlebt (Intent und Referenz), der künstliche Marker verschwindet, eine
  später erfasste Zahlung bleibt, der zweite Lauf ändert nichts, eine bereits
  migrierte Karte wird nicht erneut angefasst. Sechs Mutationen geprüft.
  **452 Tests in 25 Suiten.**

- [x] **Die Icon-Schrift ist zugeschnitten: 170 KB → 32 KB.** Material Icons
  Round trug 2200 Symbole aus, benutzt werden 384 — jeder Besucher lud den Rest
  mit. Gesammelt wird **rückwärts**: von allen möglichen Namen bleibt jeder, der
  im Code als eigenständiges Wort vorkommt. Nur `>name<` zu lesen hätte alle
  Icons verloren, die aus einer Variablen kommen (`'…>' + stage.icon + '<…'`) —
  und das wäre erst im Betrieb aufgefallen. Zu viel mitzunehmen kostet Bytes, zu
  wenig einen leeren Kasten. Zwei stille Fallen dabei gefunden: die Ligaturen
  liegen unter `rlig`, nicht `liga` (die Angabe in `fonts.css` war falsch und
  fiel nie auf, weil Browser `rlig` ohnehin immer einschalten — beim Zuschneiden
  wäre daraus eine Schrift geworden, die in jedem Knopf den Iconnamen als Wort
  zeigt), und ohne `layout_closure = False` holt der Subsetter über die
  Ligaturregeln fast alles zurück: 157 KB statt 32 KB, technisch korrekt und
  nutzlos. Der Wächter misst nicht Text, sondern das **gerenderte Ergebnis** im
  echten Browser: ein Symbol ist quadratisch, ein unaufgelöster Name breit. Dazu
  ein CI-Tor, das ein neu eingebautes Icon fängt, bevor es leer erscheint. Vier
  Mutationen einzeln geprüft — eine deckte einen hohlen Test von mir auf, der zu
  früh maß und die Ersatzschrift erwischte. **438 Tests in 24 Suiten.**

- [x] **Demo-Bilder: der Knopf, der den Import wirklich startet.** Die Route
  `POST /hq/demo-bilder` stand seit #182, bedienen konnte sie niemand — eine
  Fähigkeit, die nur per Hand-Request erreichbar ist, wird nicht ausgeführt,
  und die Demo-Daten hotlinken solange weiter auf Pexels. Jetzt ein Abschnitt
  **🖼️ Demo-Bilder** im HQ (nur für Administratoren sichtbar; die Sperre bleibt
  `eb_hq_verwaltung_darf`). Zwei Eigenschaften tragen ihn: `GET` zeigt den Stand
  **ohne** zu laden oder zu schreiben, und der Lauf hört bei `offen = 0` **und**
  bei einer Runde ohne Fortschritt auf. Ohne die zweite Bedingung stößt ein
  nicht erreichbarer Fremdhost den Server zehnmal umsonst an, während die
  Oberfläche aussieht, als arbeite sie. Dabei gefunden: `offen` zählte die
  Einträge der Zuordnung statt der Schnittmenge — nach einem neuen Demo-Feed
  hätte das zu wenig Offene gemeldet, im Grenzfall eine 0, während noch Bilder
  von außen kommen. Sechs Tests, fünf Mutationen einzeln geprüft; die
  PHP-Funktion wird dafür aus `functions.php` geschnitten und wirklich
  ausgeführt. **430 Tests in 23 Suiten.**

- [x] **Bild-Upload: 15 MB, Auto-Verkleinerung, verlässliches Drag & Drop.**
  Anlass war ein Nutzer, der ein Foto auf die Fläche zog und keine erkennbare
  Rückmeldung bekam. Das Limit stand vorher an neun Code-Stellen und in zwei
  Hinweistexten je einzeln als „5 MB"; jetzt gibt es eine Quelle der Wahrheit
  (`EB_MAX_IMAGE_BYTES` in `js/modules/core/00-basis.js`, gespiegelt als
  PHP-Konstante in `functions.php`) mit 15 MB. Größere JPG/PNG/WebP rechnet
  der Browser auf 2560 px herunter, statt sie abzulehnen — mit Toast, der
  Vorher/Nachher nennt. GIFs werden ehrlich abgelehnt, weil das Umzeichnen
  die Animation verlöre. Jeder Ausgang meldet sich; stiller Abbruch gilt als
  Bug. Am Drag & Drop drei Korrekturen: ein Zähler gegen das Flackern beim
  Wechsel auf Kind-Elemente, idempotente Bindung (`setupDragDrop()` läuft aus
  zwei Modulen — jedes Bild wurde bisher doppelt eingefügt) und ein globaler
  Fang für Drops neben die Fläche, die den Browser sonst zur Bilddatei
  navigieren ließen und das halb ausgefüllte Formular verwarfen. Serverseitig
  antwortet `eb_handle_upload()` jetzt mit 413 und nennt das tatsächliche
  Hosting-Limit, wenn PHP den Request schon vor dem Handler verwirft.
  Acht neue Regressionstests in `tests/e2e/bild-upload.spec.js`.

  **Offen (Hosting, nicht Code):** greift `upload_max_filesize` /
  `post_max_size` unter 16M/20M, bleibt das echte Limit darunter. Der
  `.htaccess`-Block wirkt nur unter mod_php; bei IONOS-FastCGI muss der Wert
  ins PHP-Panel oder nach `/public/.user.ini`.

- [x] **Kein Beitrag ohne Account:** Der Tages-Demo-Feed liefert nun 25 feste,
  klar gekennzeichnete Demo-Account-Profile mit stabilen IDs und Avataren.
  Autorname und Avatar öffnen das zugehörige Profil; derselbe Autor kann nicht
  mehr durch seine Feed-Position mehrere IDs erhalten (wie zuvor „Konfetti &
  Co."). Profil-Datensätze bleiben strikt außerhalb von `LISTINGS`, zeigen bei
  reinen Beitragsaccounts also 0 Inserate und können den früheren
  Profil-als-Inserat-Fehler nicht wiederholen. Eigene Beiträge werden nur noch
  mit gültiger Account-ID angelegt; verwaiste Datensätze rendert der Feed nicht.
  Zwei neue Regressionstests prüfen die Zuordnung und den vollständigen Weg
  „Team Nordlicht“ → Demo-Profil → 0 Inserate. Gesamtsuite 305/305 grün.
- [x] **KI-Transparenz fuer Inserate:** Beim Veröffentlichen sind Text und
  Medien getrennt und ohne Vorbelegung als ohne generative KI, wesentlich
  KI-unterstützt oder KI-generiert zu deklarieren. Die Oberfläche zeigt dafür
  nur eine kleine Textzeile „KI-generierter Inhalt" bei den Inseratdaten;
  Bilder und Bilddateien bleiben frei von Wasserzeichen. API und Markup führen
  den getrennten Status weiterhin maschinenlesbar. Der bestätigte Live-Bestand
  ist nachdeklariert: DJ Julian und Sandros Inserate sind ohne KI, die übrigen
  aktuellen Inserate sowie die redaktionellen Demo-Inserate KI-generiert.
  Direkt am Inserat nimmt ein begründeter DSA-Meldeweg falsche Kennzeichnung
  und Irreführung entgegen, speichert vor E-Mail-Versand, vergibt eine
  Vorgangsnummer und löscht Meldedaten nach drei Jahren (außer Legal Hold).
  Die Upload-Richtlinie bildet die dezente Darstellung auf Stand 15.08.2026 ab.
  Absicherung: 10 neue KI-Transparenztests, Gesamtsuite 303/303 grün.
- [x] **Die Belegschaft läuft wieder — und ihr Ausfall ist jetzt sichtbar.**
  Zwischen dem 07. und 11.08. sind **elf Läufe hintereinander fehlgeschlagen**
  (5× Tagesroutine, 6× Ensemble-Puls), ohne dass es jemand bemerkt hat. Vier
  Eigenschaften wirkten zusammen:
  1. **Falsche Aufgabenzuweisung.** `mistral-ops` bekam `ionos-deploy.yml` zu
     lesen; darin steht das SFTP-Ziel des Deploys, und das Verbotsmuster
     „Infrastruktur-Zugang" greift zu Recht. Der Filter hatte recht — die
     Zuweisung war falsch. Dieselbe Falle steckte in
     `nemotron-governance` (Sicherheits-Klassifikation.md fällt an der Regel
     durch, die sie beschreibt).
  2. **Kein Schutz um die Rollenschleife.** GitHub führt Schritte mit `bash -e`
     aus; `mistral-ops` steht an Stelle 3 von 11, also haben **acht Rollen seit
     dem 10.08. kein einziges Mal gearbeitet**.
  3. **Das Journal verlor genau die Fehler.** `agent.mjs` schreibt den Abbruch
     korrekt hinein, aber ohne `if: always()` lief der Upload danach nie —
     das HQ zeigte Leere statt elf Abbrüchen.
  4. **Keine Meldung.** Der Site-Monitor legt bei nicht erreichbarer Seite ein
     Issue an; für die Belegschaft gab es nichts Vergleichbares.
  Behoben: Zuweisungen korrigiert, Schleife rollenweise bewertet (nur ein
  Totalausfall macht rot), `if: always()` auf allen Journal-Schritten, Issue mit
  Selbstschließung in beiden Routinen, und in der Tagesroutine nimmt eine
  abgebrochene Schicht den Commit von Demo-Feed und Selbstcheck nicht mehr mit.
  **Die Sicherheitsregel wurde nicht angefasst.**
- [x] **Das Tor prüft jetzt, was die Laufzeit prüft.** `models.mjs --check` las
  bisher nur Pfad und Einstufung einer Aufgaben-Datei, `agent.mjs` zur Laufzeit
  aber zusätzlich den Inhalt gegen `GEHEIMNISSE`. Eine Aufgabe konnte damit das
  Tor passieren und nachts in der Schicht sterben. Beide benutzen jetzt
  dieselbe Prüfung auf demselben Ausschnitt (`AUFGABEN_AUSSCHNITT`), damit die
  Zahlen nicht wieder auseinanderlaufen.

- [x] **HQ-Zugang ohne WordPress-Admin:** TOTP nach RFC 6238 (gegen die offiziellen
  Testvektoren geprüft, inkl. 64-Bit-Schritt), Zeitschritt wird genau einmal
  verbraucht, `hash_equals`, 8 Versuche / 15 Min. `eb_serve_hq()` kennt jetzt drei
  Zustände: kein Recht → 404 wie bisher, Recht ohne Faktor → eigene Codeabfrage,
  Recht mit Faktor → HQ. Die Codeabfrage ist bewusst **keine** HQ-Seite mit Overlay —
  Connector-Katalog, Journal und Modellkatalog haben im Browser eines noch nicht
  Ausgewiesenen nichts verloren. `POST /hq/mitarbeiter` schaltet ein bestehendes
  Konto frei (kein Anlegen über API); Entzug schließt die laufende Sitzung sofort.
- [x] **Event-Radar:** Umkreis (10/25/50/100/250 km, Haversine) statt Stadtgrenze —
  vorher war ein Fotograf zwei Straßen hinter der Stadtgrenze unauffindbar. Position
  bleibt **lokal**, wird nie an den Server gesendet und nur auf 2 Nachkommastellen
  (≈ 1,1 km) gespeichert; 25 DACH-Städte zur Auswahl, damit GPS freiwillig bleibt.
- [x] **Radar ist jetzt wirklich eine Karte:** Der Radar-Kanal unter „Aktuelles“
  zeichnet den gewählten Kilometerkreis auf OpenStreetMap, lässt beim Öffnen einmal
  eine Scan-Welle vom Standort nach außen laufen und zeigt **alle** Treffer als
  verknüpfte Marker und Entfernungsliste. Identische Stadtmittelpunkte werden ehrlich
  gebündelt statt künstlich verteilt; schnelle Radiuswechsel brechen die Karte nicht.
- [x] **Echte Marker:** Die Karte streute vorher mit `Math.random()` um das Zentrum —
  die Marker logen bei jedem Neuzeichnen *anders*. Jetzt echte Koordinaten, und wo
  keine hinterlegt sind, sagt der Marker das, statt Genauigkeit vorzutäuschen.
- [x] **Adresseingabe mit Geocoding** (Nominatim) auf Knopfdruck, nicht pro
  Tastendruck — 1 Anfrage/s ist die Auflage, Suche-während-des-Tippens hätte sie um
  Größenordnungen gerissen. Harte Sperre 1100 ms + Cache. Der Test dafür stubbt
  `fetch`; ein Ratenbegrenzungs-Test, der selbst echte Anfragen feuert, wäre genau
  der Missbrauch, den er verhindern soll.
- [x] **Migration 2.5:** `stadtteil`, `lat`, `lng`, `idx_geo` auf `eb_listings`.
  Wichtiger als die Spalten ist die Korrektur am Verfahren: der Versionssprung lief
  bis dahin **unbedingt**. Scheiterte ein ALTER, galt die Migration trotzdem als
  erledigt und lief nie wieder an — Datenbank kaputt, Anzeige grün. Jetzt wird nach
  dem ALTER nachgelesen, die Version steigt nur bei vollständigem Ergebnis, und
  `/diagnostics` zeigt Soll, Ist, Fehlendes und Index-Zustand. `EB_DB_VERSION` ist
  die einzige Quelle des Sollstands.

## Zuletzt abgeschlossen (2026-08-05) — HQ Operations-Ensemble & Voice v2

- [x] **Vollständiges Betriebsbild:** zehn Hauptbereiche statt sechs — Produkt
  & Strategie, Engineering, Betrieb & Zuverlässigkeit, Sicherheit & Datenschutz,
  Intelligence & Daten, Community & Support, Sales & Wachstum, Finanzen & Risiko,
  Recht & Governance sowie Voice & UX. Mitarbeiter bleiben im neuronalen
  Gesamtbild verborgen und erscheinen erst im geöffneten Bereich.
- [x] **Echter Aufgabenstrom statt „kein Lauf":** 11 offene OpenRouter-Modelle
  haben je drei rotierende Tasks, eine feste Quote und eine kleine Antwortgrenze.
  `.github/workflows/hq-operations.yml` pulst tokenfrei alle fünf Minuten und
  lässt das Ensemble stündlich arbeiten. `scripts/agent.mjs` prüft vor jedem
  Aufruf Tagesbudget, Restlimit, Rollenquote, Geheimnisse und Providerpreis;
  nur echte Antworten/Stopps/Fehler gelangen ins Arbeitsjournal.
- [x] **Kontingent hart verteilt:** 100 % von maximal **$0,60/Tag**, rollenweise
  sichtbar. Preisrouting nutzt den günstigsten zulässigen Provider,
  `data_collection: deny` und feste Maximalpreise. Der autonome Lieferstrom
  (Scout → Architektur → Patch → Review → Gates → PR → Deploy) bleibt separat.
- [x] **Voice v2:** schneller Qwen-Flash-First-Router unter Preisdeckel,
  Gesprächsverlauf plus geöffneter Bereich/Tasks/letzte Lieferungen als Kontext,
  Erkennungsalternativen und Konfidenz bei undeutlicher Sprache, gezielte
  „Meinst du … oder …?"-Rückfragen, Vorschlags-Chips, Barge-in/Abbruch und
  schnelleres erneutes Zuhören aus dem zentralen Orb.

**Stand: HQ-Kern 32/32 Tests grün; Katalog-, Sicherheits- und Build-Gate grün.**

## Zuletzt abgeschlossen (2026-08-01) — Fable-5-Auftrag: Fundament gesichert

- [x] **Testsuite von null** (Priorität 1): 68 Playwright-Tests in 7 Suiten,
  blockierendes Gate in `pr-check.yml`. Smoke (alle Routen, 0 Page-Errors),
  Suche (natürliche Sätze ↔ Unsinn), Gebühren (centgenau, **JS↔PHP-Parität**
  gegen die echten functions.php-Funktionen), Wissensbasis (Antworten,
  Off-Topic, **0 Leckage**), CSS-Minify (Verlaufsschrift überlebt csso),
  Design-System (Konflikt-Ratsche), A11y (axe, beide Farbmodi).
- [x] **Sicherheits-Audit** über functions.php + app.js gemeinsam: 86 Routen
  (permission, IDOR, SQL, Upload, Webhook, Rate-Limits) + 237 innerHTML-Pfade.
  Juni-Härtung trägt. Behoben: KB-Leckage (Webhook-Signatur-Erwähnung in
  public-Notiz + Verbotsmuster-Filter erweitert), 2 Low-XSS (_escHtml).
  Bericht: 40-Governance/Security/2026-08-01-… (secret).
- [x] **app.js modularisiert**: 24.900 Zeilen → 22 Module (`js/modules/**`),
  `./build-app-js.sh` konkateniert (kein Bundler, byte-identisch verifiziert),
  Drift-Check in CI, Deploy-Artefakt bleibt app.js.
- [x] **Design-System**: --eb-*-Tokens konsolidiert (1 Definition statt 3
  überschreibenden), Live-Bug behoben („Beliebt:"-Chips unsichtbar durch
  Klassenkollision .ai-suggestions → .ai-sug-row), css-duplicates-Analyzer
  + Ratsche gegen neue stille Überschreibungen.
- [x] **Barrierefreiheit**: axe-Verstöße 97 Nodes → **0** (beide Modi × 6
  Seiten). Galerie-Karussells tastaturbedienbar + benannt, Selects/Suchfeld
  beschriftet, neue Text-Tokens --primary-text/--accent-text ≥ 4,5:1.
  Offen: Lighthouse-Score gegen die Live-Seite messen (CI-Umgebung hat
  keinen Zugriff auf eventbörse.de; lighthouse-audit.yml läuft wöchentlich).

## Zuletzt abgeschlossen (2026-08-01) — Event-Universum, EB Circle, Brain-Messung

- [x] **Offenes Event-Universum** — `EB_EVENT_UNIVERSE`: 30 Typen in 7 Gruppen
  statt 6 fixer Optionen. Enthält Tabletop/D&D, LAN & Gaming, Cosplay,
  Quiz, Escape/Krimidinner, Vernissage, Poetry Slam, Retreat, Saisonfeste,
  Trauerfeier; `custom` hält die Liste offen. Filter-Select wird gruppiert
  daraus befüllt, Vorschlags-Engine erkennt die Typen, 20 neue Synonym-Cluster
  machen sie auffindbar. Geprüft: „DJ für mein Dungeons and Dragons Event"
  → als Tabletop erkannt, 14 Treffer.
- [x] **EB Circle im HQ** — sprechender KI-Kreis: antwortet aus der
  Wissensbasis **mit Quellenangabe**, kennt den HQ-Livezustand, zeigt
  **Wissenslücken** (Impuls 6) gruppiert nach Häufigkeit. Voice in beide
  Richtungen über die Web-Speech-API (lokal, kein externer Dienst).
- [x] **Sicherheit: Leckage in der Wissensbasis geschlossen**
  `Features/Payments.md` exportierte „Stripe Webhook-Signatur-Verifizierung
  (HMAC)" und interne API-Routen an anonyme Chat-Nutzer. Ursache: die
  Erst-Migration stufte `Features/` und `UserFlows/` pauschal als `public`
  ein — das sind aber Entwickler-Notizen. **10 Notizen auf `internal`**;
  die Wissensbasis speist sich jetzt nur noch aus `10-Produkt/Wissen/`.
  Verifiziert: 0 Leckage, Abdeckung unverändert 17/17.
- [x] **Retrieval gehärtet (beide Engines)** — kurze Wörter zählen nur als
  ganzes Wort, Frage-Modifikatoren (hoch, viel, lange …) sind Stoppwörter.
  Vorher beantwortete „Wie hoch ist der Mond?" mit „Hochzeit".
- [x] **Impuls-Strom messbar** — `scripts/pulse.mjs` → [[00-Kern/Impuls-Strom]]:
  Schichtung, Freigabe-Bilanz, Wissensbasis, Event-Abdeckung, Code-Bewegung.
- [x] **MCP-Architektur dokumentiert** → [[30-Betrieb/MCP-Architektur]]:
  Ist-Stand, MCP-Bewertung nach Nutzen ÷ Risiko, Quarantäne-Tor für externen
  Zufluss, Empfehlung **gegen** einen Obsidian-MCP.
- [x] **Tages-Routine aktiv** (04:00 UTC): Gesundheitscheck → ein verifizierter
  Fortschritt → Vault fortschreiben → deployen.

## Zusammenführung (2026-08-01) — beide Stränge sind vereint

Fable 5s Arbeit lag zunächst nur lokal auf der VS-Code-Maschine; sie ist
inzwischen als `fable5-integration` im Remote und mit dem Opus-5-Strang
zusammengeführt. Was die Zusammenführung gekostet hat:

- **Zwei Konflikte**, beide inhaltlich aufgelöst statt weggeworfen:
  `Current-Sprint.md` behält **beide** Abschnitte; `assets/eb-knowledge.json`
  wurde neu gebaut statt von Hand gemischt (89 Abschnitte / 10 Notizen).
- **`app.js` neu aus den 22 Modulen erzeugt**, `index.html` aus der Shell —
  beide driftfrei. Alle Opus-5-Funktionen nachweislich enthalten
  (`EB_EVENT_UNIVERSE`, `_ebSuggest`, `_ebTasteSignal`, `_ebKbGoodHit`,
  `_ebHeroSceneSvg`, `_ebMatchScore`, `_ebEventTypeFromText`).
- **`playwright.config.js` umgebaut**: der Browser-Pfad wird jetzt erkannt
  statt angenommen (`PW_CHROMIUM_PATH` → `/opt/pw-browsers/chromium` →
  Playwright-Standard). Vorher fielen 58 Tests aus, weil die Umgebung eine
  andere Chromium-Revision vorhält als die Fixversion erwartet.
- **A11y-Nachzügler behoben**: Material-Icons sind Ligatur-**Text**, axe misst
  sie wie Schrift. Gold `#FFB400` (1,8:1), Akzent und Markenrot als Icon-Farbe
  fielen im Hellmodus durch. Neues Token `--star-text` (hell `#8F6400` 5,3:1,
  dunkel bleibt Gold 10,5:1); Icons in `.feature-item`, `.bai-side-foot`,
  `.feed-chip`, `.feed-location-badge`, `.detail-rating`, `.review-stars`,
  `.testimonial-stars` auf die Text-Token umgestellt.

**Stand: 68/68 Tests grün**, A11y 0 Verstöße über beide Farbmodi.

## Zuletzt abgeschlossen (2026-08-02) — HQ-Zugang und Verbindungszentrale

- [x] **Das HQ war faktisch offen.** Die Zugangsprüfung lief im Browser gegen
  eine im HTML mitgelieferte Schlüsselliste (`HQ_KEYS = ['eb-hq-2026', …]`) —
  wer den Quelltext las, kam rein. Jetzt prüft `eb_serve_hq()` serverseitig auf
  `manage_options`, bevor ein Byte das Haus verlässt; Unberechtigte bekommen
  **404** statt 403. Der direkte Theme-Pfad ist in `.htaccess` gesperrt, weil
  Apache dort ausliefert, ohne PHP je zu fragen — ohne diese Sperre wäre die
  Rechteprüfung schlicht umgehbar. Das Schein-Tor im HTML ist ersatzlos raus.
- [x] **Kurze Adresse:** `eventbörse.de/hq`, inklusive Unterpfaden
  (`/hq/connections/github`, `/connections/anthropic`).
- [x] **Systeme & KI-Verbindungen** (HQ 3A, erste Ausbaustufe) — 10 Connectors
  mit Berechtigungen, Fähigkeiten, Kontingent, Schlüssel-Ablage und den
  offiziellen Einrichtungslinks. Tragende Entscheidung: **Katalog ist nicht
  Zustand.** `assets/eb-connectors.json` beschreibt Möglichkeiten; ob etwas
  verbunden ist, entscheidet ausschließlich ein echter Aufruf zur Laufzeit.
  Der Prüfer lehnt jeden Katalogeintrag mit `status` ab.
- [x] **Ehrliche Prüfungen statt Dekoration** — GitHub (`/rate_limit` mit
  echtem Kontingent), Deploy und Monitoring (Actions-Läufe), Vault
  (Contents-API), Website (gleiche Herkunft). Für Anthropic wird geprüft,
  **ob** das Secret hinterlegt ist — GitHub gibt nur Namen heraus, nie Werte.
  Was nicht prüfbar ist, bleibt gelb mit Begründung: Copilot-Restkontingent
  (persönlich nicht als Schnittstelle vorgesehen), Verbrauch bei OpenAI und
  Anthropic (ein Schlüssel im Browser wäre ein Schlüssel für jeden Besucher).
- [x] **Abonnement ≠ API-Guthaben** wird auf beiden KI-Karten getrennt
  ausgewiesen — ein Test erzwingt das.

**Stand: 94/94 Tests in 9 Suiten grün** (`verbindungen.spec.js` neu, 14 Tests).
Ein Test fährt die Seite mit blockierter GitHub-API und besteht nur, wenn dann
nichts „verbunden" behauptet.

### Offen an 3A
Echte OAuth-2.1/PKCE-Flows, `getUsage`/`getQuota` für OpenAI und Anthropic
(beides braucht eine Serverseite als Proxy), anklickbare Impuls-Ströme rund um
den Orb, Connector-Assistent für neue Dienste.

## Zuletzt abgeschlossen (2026-08-01) — der Zufluss von außen

Die drei offenen Punkte aus [[30-Betrieb/MCP-Architektur]] §5 sind zu.
Gemeinsamer Nenner: an jeder Stelle, an der Inhalte ins System kommen, ohne
dass ein Mensch sie geschrieben hat, steht jetzt ein Tor.

- [x] **Quarantäne-Tor** (`scripts/quarantine.mjs`) — `vault/50-Evolution/Recherche/`
  ist die einzige Schleuse für externen Text. Fünf Regeln, in CI durchgesetzt:
  nichts darin ist `public`, Herkunft (`quelle` + `abgerufen`) ist Pflicht,
  Fremdtext steht im Datenblock, keine Geheimnisse (auch nicht in `internal`),
  **keine fremden Anweisungen in unserem eigenen Text**. Die letzte Regel ist
  der Prompt-Injection-Schutz: im Datenblock ist „ignoriere deine Anweisungen"
  erwartbarer Inhalt, außerhalb ein Befund. Aufnahme mit Geheimnis wird
  verweigert, statt sie als `internal` zu verstecken.
- [x] **Web-Recherche** (`recherche.yml`, Do 06:23 UTC) — schreibt
  ausschließlich über das Skript, öffnet einen **Draft-PR**, veröffentlicht
  nichts. Zwei Riegel im Workflow: jede Änderung außerhalb der Schleuse und
  jedes `+share: public` brechen den Lauf ab.
- [x] **Tages-Demo-Feed** (`demo-feed.yml`, 03:17 UTC) — erzeugt täglich
  9 Beiträge aus dem gesamten Event-Universum. Der feste Anker
  `EB_DEMO_ANCHOR_MS` alterte (nach Monaten stand überall „vor 6 Monaten");
  die naheliegende Abhilfe wäre eine Lüge gewesen. Jetzt: frischer Inhalt,
  Erstellzeiten aber **immer ≥ 10 Tage** zurück — der Browser prüft das beim
  Laden nach und verwirft einen Feed, der „gestern" behauptet.
- [x] **Feedback-Loop geschlossen** — der EB Circle im HQ exportiert die
  Wissenslücken (⬇︎), `scripts/wissensluecken.mjs` macht daraus
  [[50-Evolution/AI-Gedaechtnis/Wissensluecken]]. Bewusst über einen Menschen:
  die Fragen bleiben im Browser, bis jemand sie exportiert. Versehentlich
  eingetippte Zugangsdaten filtert das Skript heraus.
- [x] **Verbotsmuster vereinheitlicht** (`scripts/lib/verbotsmuster.mjs`) —
  getrennt in *Geheimnisse* (nirgends erlaubt, auch nicht in `internal`) und
  *Angriffsfläche* (nur im öffentlichen Export verboten). Vorher lag die Liste
  nur in `build-knowledge.mjs`; das Quarantäne-Tor hätte sonst eine zweite,
  driftende Kopie gebraucht.

**Stand: 80/80 Tests in 8 Suiten grün** (`zufluss.spec.js` neu, 12 Tests).

### Offen aus §5
Stripe-MCP lesend fürs HQ-Kostenbild · Vektor- statt Keyword-Suche ·
YouTube-Transkripte (das Tor steht, es fehlt nur der Abholer).

## Zuletzt abgeschlossen (2026-07-27) — Intelligente Suche & Hero

- [x] **Satz-Vervollständigung („Look & Feel AI") in Suche + Board**
  - `_ebSuggest(text)` erkennt Gewerk, Anlass, Ort, Gästezahl und Datum im
    angefangenen Satz und setzt ihn **in der Formulierung des Nutzers** fort.
    Grammatik über `_EB_CAT_GRAMMAR` (Akkusativ-Artikel) und `_EB_TYPE_GRAMMAR`.
  - Bindewort-Logik: „Fotograf für" + „für meine Hochzeit" wird zu
    „Fotograf **für meine Hochzeit**" (kein doppeltes „für"). Wer sein Event
    beschreibt, bekommt einen sauberen Anschluss („… — dafür suche ich einen DJ").
  - UI Suchseite: Inline-Ghost im Feld (grau) + Panel mit Primärvorschlag
    (**Tab** übernimmt) und **3 Alternativen** (anderer Anlass / passendes
    Zusatzgewerk / Ort bzw. Größe eingrenzen). Weiterschreiben bleibt möglich.
  - Board-Assistent nutzt dieselbe Engine live beim Tippen (`_aiInputSuggest`).
- [x] **Selbstlernendes Ranking (`_ebTaste`)**
  - Signale: Suche (1), Ansicht (1.5), Favorit (3), Board (4), Kontakt (6);
    Buckets cats/locs/types/terms, tägliches Decay (×0,92), gedeckelt.
  - Wirkt auf: Suchvorschläge, Standard-Sortierung der Treffer, Feed „Für dich",
    Board-Chips. Ohne Signale bleibt Verhalten wie bisher (keine Filterblase
    für Neulinge).
  - **Sicherheit:** rein lokal (localStorage), keine Übertragung; Blockliste
    gegen Kontakt-/Zahlungsdaten (`@`, Telefon, IBAN, URLs, lange Zahlen);
    max. 32 Zeichen/Token, 40 Begriffe; jede Ausgabe `_escHtml`;
    `_ebTasteReset()` direkt im Vorschlags-Panel verlinkt.
- [x] **Hero der Suchseite neu**
  - Headline **„EVENTBÖRSE, finde dein Event ©"**.
  - 10 generative Motive (`_ebHeroSceneSvg`, Data-URI, keine externen Requests):
    Montage in 2 s (200 ms/Bild), danach ruhiger 5-s-Wechsel;
    `prefers-reduced-motion` → Standbild. Lesbarkeits-Verlauf darüber.
  - Motive sind austauschbar: echte Foto-Renderings können in `_ebHeroShots()`
    eingesetzt werden, der Ablauf bleibt gleich.
  - Verifiziert: Ghost pixelgenau am Input (Versatz 0), Tab übernimmt,
    Weiterschreiben funktioniert, 10 Bilder self-hosted, 0 Page-Errors.

## Zuletzt abgeschlossen (2026-07-26) — Centgenaue Gebührenabrechnung

- [x] **Ist-Gebühren statt Schätzung: automatischer Abgleich gegen Stripe**
  - `eb_stripe_settlement_facts()` liest die echte **Balance-Transaction**
    (`expand=latest_charge.balance_transaction`) inkl. `fee_details`-Aufschlüsselung.
  - `eb_stripe_reconcile_payment()` vergleicht Ist gegen Schätzung und korrigiert:
    Δ > 0 → **Transfer-Reversal** (Differenz vom Dienstleister zurück),
    Δ < 0 → **Nachtransfer** (Differenz an den Dienstleister).
    Idempotent über Idempotency-Keys + `reconciled`-Flag.
  - Hooks: Webhook `payment_intent.succeeded` **und** `charge.updated` (dort liefert
    Stripe die Balance-Transaction meist erst), plus stündlicher Cron
    `eb_stripe_reconcile_cron` für Nachzügler (max. 12 Versuche, dann Aufgabe).
  - **Ledger** (`eb_payment_ledger`, 180 Tage): Brutto, Provision, Schätzung, Ist,
    Δ, Ausgleichsbuchung, Auszahlung, Plattform-Netto, Refunds.
  - Neue Endpoints: `GET /stripe/settlement/{pi}` (Käufer/Anbieter/Admin) und
    `GET /stripe/cost-report` (Admin: Summen, Ist-vs-Schätzung, Gebühren nach Typ,
    effektive Netto-Marge, offene Abgleiche).
  - Frontend: `fetchSettlement()` + `_settlementBreakdownHtml()` zeigen den
    **Ist-Betrag** mit Aufschlüsselung und „✓ Centgenau abgerechnet".
  - **Fail-Safe:** Schlägt die Ausgleichsbuchung fehl, bleibt es beim Schätzwert —
    die Differenz trägt dann die Plattform, nie der Dienstleister unbemerkt.
  - Verifiziert (6 Szenarien: EWR, Amex, SEPA, Nicht-EWR, 10 €, 25.000 €):
    Brutto = Provision + Ist-Gebühr + Auszahlung **centgenau**, Plattform behält
    in **allen** Fällen exakt 3 %. Idempotenz geprüft (zweiter Lauf ohne API-Calls).

## Zuletzt abgeschlossen (2026-07-25, Nachtrag)

- [x] **Gebührenmodell wirtschaftlich korrigiert: Stripe-Gebühr trägt der Dienstleister**
  - Vorher trug die **Plattform** die Stripe-Zahlungsgebühr (Application Fee = nur 3 %) —
    bei 1.000 € blieben der Plattform real nur ~1,5 % statt 3 %. Nicht tragfähig.
  - Jetzt: `application_fee_amount = Provision + geschätzte Stripe-Gebühr`.
    Stripe belastet bei Destination Charges das Plattformkonto; über die erhöhte
    Application Fee wird die Gebühr vom Auszahlungsbetrag einbehalten. Netto bleibt
    der Plattform die **volle Provision**.
  - Neue Konstanten (in wp-config überschreibbar): `EB_STRIPE_FEE_PERCENT` (0.015),
    `EB_STRIPE_FEE_FIXED_CENTS` (25) — Standard EWR-Karten.
  - Beispiel 1.000 €: Provision 30 € + Stripe 15,25 € → **Auszahlung 954,75 €**.
  - Frontend (`calculatePayout`, Aufschlüsselung, Auftrags-Texte) spiegelt das Modell
    centgenau; `stripe_fee_payer` ist jetzt `provider`.
  - Wissensbasis aktualisiert (Gebühren & Provision, Buchung & Zahlung, Über Eventbörse);
    Gebührenfragen werden nicht mehr vom Budget-Intent abgefangen.
  - **Offen/Hinweis:** Die Stripe-Gebühr ist ein *Schätzwert*. Weicht die reale Gebühr ab
    (Amex, Nicht-EWR-Karten, Wallets), trägt die Differenz die Plattform. Bei Bedarf die
    Konstanten je nach tatsächlichem Zahlungsmix nachziehen.

## Zuletzt abgeschlossen (2026-07-25)

- [x] **Board-Assistent führt durch die Projektanlage (Slot-Filling)**
  - Fehlende Eckdaten werden nacheinander erfragt: Datum → Gäste → Budget → Ort,
    jede Frage überspringbar („Weiß ich noch nicht"), Abbruch per „abbrechen".
  - Antworten werden dem **passenden** Slot zugeordnet, auch in falscher Reihenfolge
    (`_aiRouteSlot`). Blanke Jahreszahl ist kein Termin mehr, benennt nur das Projekt.
  - `location` wird im Projekt gespeichert; Abschluss zeigt eine Zusammenfassung.
- [x] **Beide Bots klären über alles Öffentliche auf**
  - Neue public-Notiz [[10-Produkt/Wissen/Gebuehren-und-Provision]] mit den echten
    Fakten aus `eb_stripe_platform_fee_rate()`: **3 % Provision** (Application Fee),
    Auszahlung 97 %, Stripe-Gebühren trägt die Plattform, keine Grundgebühr.
    Vage Gebührensätze in „Buchung & Zahlung" und „Über Eventbörse" korrigiert.
  - „Was kannst du erklären?" listet alle Themen (nur `10-Produkt/Wissen/`).
  - Fallback schlägt jetzt passende Fragen vor statt in der Sackgasse zu enden.
  - Retrieval gehärtet: Füllverben („funktioniert") als Stoppwörter, Komposita über
    Präfixe („Provisionsregelung" → „Provision"), Überschriften-Treffer stärker gewichtet.
  - `Glossar` und `Features/Admin` auf `internal` gesetzt (Entwickler-/Admin-Interna).
  - Verifiziert: **17/17** Fachfragen korrekt beantwortet, 2/2 Off-Topic abgelehnt,
    geführter Dialog liefert vollständigen Entwurf, 0 Leckage.

## Zuletzt abgeschlossen (2026-07-24)

- [x] **Brain-Umbau: 6-Layer-Vault + Synergie zur Website**
  - Vault in `00-Kern` … `50-Evolution` geschichtet, alle 92 Notizen mit Frontmatter
    (`layer`, `domain`, `share`) klassifiziert, alle Wiki-Links umgeschrieben (0 tote Links).
  - Graph färbt nach `tag:#layer/*`; `neural.css` mit Impuls-Puls und Layer-/Share-Badges.
  - Neue L0-Notizen: [[00-Kern/Layer-Modell]], [[00-Kern/Neural-Map]],
    [[00-Kern/Wissensstroeme]], [[00-Kern/Sicherheits-Klassifikation]],
    [[00-Kern/Synergie-Pipeline]].
  - Neuer öffentlicher Wissens-Layer `10-Produkt/Wissen/` (9 Notizen, nutzerseitige Fragen).
  - `scripts/build-knowledge.mjs` → `assets/eb-knowledge.json` (115 Abschnitte aus 21
    `share: public`-Notizen). Whitelist + Verbotsmuster-Scan; `secret`/`internal` bleiben drin.
  - `app.js`: `_ebKbLoad/_ebKbSearch/_ebKbGoodHit` — **QA-Bot und Board-Assistent**
    beantworten Inhaltsfragen aus dem Vault, Intents behalten Vorrang bei Navigation.
    Ohne Treffer: ehrlicher Fallback + Wissenslücke in `eb_kb_misses` (Impuls 6).
  - `functions.php`: `themeUrl` in `eventboerseApi` ergänzt (KB-URL auf Unterrouten).
  - Verifiziert: 10/11 Testfragen korrekt beantwortet, Off-Topic korrekt abgelehnt,
    0 Leckage aus Governance/System/Betrieb/Evolution.

## Aktiver Fokus (P0)

- [x] **Listings-/Board-Regressionen ausschließen** *(2026-08-22)*
  - Ziel: Keine verschwundenen Listings mehr in Board/Startseite/Map/Browse.
  - [x] Die vier Pflicht-Checks laufen als Tests statt als Merkzettel
    (`tests/e2e/pflichtchecks.spec.js`): Listings, Board-Picker, Demo-Toggle,
    Selbstbuchungsschutz. Eine Liste, die ein Mensch nach jedem Deploy
    abarbeiten soll, wird beim dritten Deploy nicht mehr abgearbeitet.
  - [x] Provider ohne Inserate bleiben reine Profile: Profil-Fallbacks landen
    nicht mehr in `LISTINGS`, zählen als 0 und erzeugen keine Inseratkarte.
    Ein Smoke-Test bildet den konkreten Fall „Maria Heilig, `listings: []`“ ab.
  - [x] Flow-Struktur ist unverrückbar: Prozessspalten ignorieren alte manuelle
    Koordinaten und können nicht mehr versehentlich auseinandergezogen werden;
    nur Dienstleisterkarten wechseln weiterhin die Stage. Die fachliche Abfolge
    endet jetzt mit „Erfüllt → Bezahlt“ und migriert bestehende Karten defensiv.
- [x] **KI-Änderungs-Guardrails operationalisieren** *(2026-08-04, OpenRouter-Autopilot)*
  - Vier getrennte Rollen: Scout → Architektur → Implementierung → unabhängiges Review.
  - Feste Whitelist kleiner Frontend-Dateien; max. 2 Dateien/260 Diff-Zeilen;
    Backend, Auth, Payment, Workflows, Netzwerk und Storage hart ausgeschlossen.
  - Kostenlimit 0,35 USD/Lauf; bei gesetztem Key-Limit Mindestrest 1 USD;
    Modell/Token/Kosten im PR.
  - Autonome Auslieferung nur nach Syntax-Gates, Reproduzierbarkeits-Gate,
    kompletter Playwright-Suite und erneuter Scope-Prüfung; danach explizit
    gestarteter, normaler Rollback-fähiger Deploy.
- [ ] **Stripe Connect E2E im Testmodus finalisieren**
  - Dienstleister-Onboarding, Payment Intent, Webhook, Reconcile, Refund/Dispute-Pfad prüfen.
  - Keine echte Buchung ohne aktives Auszahlungskonto des Dienstleisters.
- [x] **Admin-Moderation gegen aktuellen Code abgleichen** *(erledigt 2026-06-26, live)*
  - Admin-Bild-Löschen umgesetzt: Detailseite (`adminDeleteListingImage`) + Provider-Portfolio/Lightbox (`adminDeleteProfileImage`).
  - Backend `POST /admin/moderate-image` + persistente Blocklist (`eb_demo_image_blocklist`) → wirkt auch für hardcodierte Demo-Listings.
- [x] **Security-Härtung** *(erledigt 2026-06-26, live)*
  - XSS-Escaping (`_escHtml` inkl. Quotes), Brute-Force-Rate-Limiting (Login/OTP/Reset/Register), CSP ohne `'unsafe-eval'`, WP-User-Enumeration gesperrt, CDN gepinnt, CI-Security-Workflow + `SECURITY.md`.
  - Offen (User): `security@eventbörse.de`-Postfach; optional CDN-SRI; CSP ohne `'unsafe-inline'` (Inline-Handler-Refactor).

## Nächste Prioritäten (P1)

- [ ] **Echtzeit-Messaging** (Polling → SSE/WebSocket).
- [ ] **Suche auf DB-Volltext** umstellen (MySQL FULLTEXT).
- [ ] **Stripe-Flow weiter härten** (Reconcile, Return, Regression-Szenarien).
- [x] **Board-Sync-Tests** *(2026-08-22)* — die Zusammenführung von lokalem
  Stand und Server war ungeprüft: 50 Zeilen, die entscheiden, welche Fassung
  eines Projekts überlebt. Neun Tests, zehn Mutationen einzeln geprüft.
- [x] **Mehrfachzeiten pro Paketposition** *(2026-08-22)* — gebaut und
  abgesichert, 20 Tests, 17 Mutationen. Edit/Reload läuft über die
  Board-Sync-Tests.
- [x] **QA-Bot Wissensmuster erweitert** *(2026-08-22)* — an echten Sätzen
  gemessen statt an Auslöserlisten geraten. Ein Fehlgriff behoben, der
  Stichentscheid entschied vorher nach Array-Reihenfolge. Tokenfrei geblieben.

## Nice-to-Have (P2)

- [ ] PWA + Push-Benachrichtigungen.
- [ ] Analytics-Kennzahlen je Listing/Flow.
- [ ] SEO-Pre-Rendering für zentrale Landing-/Browse-Routen.

## Zuletzt ausgeliefert (Juli 2026)

- [x] Demo-Konten kontaktierbar (wie eBay): Nachricht landet im Chat, Benachrichtigungs-Mail geht an kontakt@eventbörse.de (Banner: Demo-Konto, Absender inkl. User-ID/E-Mail, Inserat, Conversation-Nr.). Server: eb_demo_provider_name-Verzeichnis, eb_ops_notify_address, Demo-IDs auf 90001–90015 vervollständigt.
- [x] Inserate-Erstellung als EINE Maske: Biete/Suche-Umschalter (listing_type in DB, Migration 2.3), optionaler einklappbarer Verfügbarkeitskalender (Häkchen = verfügbar, PUT availability nach dem Speichern), Rollen-Vorwahl (Planer→Suche).
- [x] Board→Chat-Kette repariert: providerId auf Karten, loadDbListings in Board-Route, Erfolgs-Button öffnet Konversation; Picker mit Browse-Parität (getHeroListings statt _visibleListings).
- [x] Showcase-Animationen butterweich: rAF-Loop + Lerp statt Scroll-Events/CSS-Transitions (iPhone-Einfrier-Bug behoben); „So funktioniert's" auf 4 Schritte gestrafft.
- [x] Planungs-Board im ChatGPT-Look: Sidebar links (Neues Projekt, Projekt-Liste mit Edit/Delete, 8 Dienstleister-Kategorien), rechts lokaler Planungs-Assistent (`_ai*` in app.js, `.bai-*` CSS). Regelbasiert, ohne KI-Token: legt Projekte aus Freitext an (Typ/Datum/Gäste/Budget-Parsing), empfiehlt Dienstleister je Kategorie („+ Board" → Karte in Geplant), beantwortet Budget/offene Schritte (Guide-Deadlines)/Countdown/Status. Chat-Verlauf in localStorage pro Nutzer; Auftragsboard für Dienstleister bleibt darunter.
- [x] Home-Showcase finalisiert: Mac dreht von Rückseite auf & schwebt, Demo-Szene + Widgets mit Inline-SVG-Illustrationen, Spacing/Mobile-Fixes, Board-Picker-Rollen (Planer sehen Angebote, Dienstleister alles).

## Zuletzt ausgeliefert (Mai/Juni 2026)

- [x] QA-Support-Bot rechts über Bottom-Navigation, tokenfrei, mit direkter Bereichs-Navigation.
- [x] QA-Bot Launcher auf transparentes Roboter/Headset/Partyhut-Icon reduziert (keine Card, kein Status-Dot).
- [x] Loader/Hero-Popper bereinigt: doppeltes Popper-Bild entfernt.
- [x] Login/IDN-E-Mail-Flow repariert.
- [x] Board Deep-Link `/board/<id>` + Projektkarte im neuen Tab.
- [x] Stripe Connect Onboarding/Status/Diagnose/Disconnect im Backend/Frontend vorhanden.
- [x] Board lädt alle Listings im Picker (kein künstlicher Cap).
- [x] Saubere Trennung Angebot vs. Gesuch in Board-Auswahl.
- [x] Eigene Angebote für Planer sichtbar, ohne Selbstbuchungslink.
- [x] Demo-Sichtbarkeit über Home/Browse/Map/Board vereinheitlicht.
- [x] Admin-Moderation: Ausblenden/Löschen inkl. Begründung + Verlauf.
- [x] Board-Planungsmodus ausgebaut:
  - [x] `Baustein` (Einzelposition)
  - [x] `Paket` (Mehrfachpositionen mit je eigener Zeit/Preis/Notiz)

---
*Zuletzt aktualisiert: 2026-08-15*

## Verknüpfte Notizen
- [[50-Evolution/Roadmap/Feature-Ideen]] — Ideen-Sammlung
- [[50-Evolution/Roadmap/Bekannte-Bugs]] — Offene Bugs
- [[50-Evolution/AI-Gedaechtnis/Claude-Kontext]] — Prioritätsliste P0/P1
