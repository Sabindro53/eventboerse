---
layer: L5
domain: evolution
share: internal
tags: [layer/L5, domain/evolution, share/internal, lehren]
---

# Lehren: Stripe, Rechnung, Erstattung, Storno, Webhook, Provision

> Wörtlich aus `CLAUDE.md` ausgelagert am 28.11.2026 (Stand `7340150`).
> Die Regeln daraus stehen kurz in `CLAUDE.md`; hier steht, **warum** —
> Messungen, Fehlschläge, Mutationsproben. Zahlen sind Stand des jeweiligen
> Datums; gepflegte, geprüfte Zahlen stehen nur in `CLAUDE.md`.

## Inhalt

- Stripe.js lädt erst an der Kasse
- Ein Empfänger, der seit drei Monaten nicht mehr mitliest
- Der Zahler durfte sich sein Geld selbst zurückholen
- Der Storno-Vorgang — ein Weg, kein Knopf auf fremdes Geld
- Der Webhook hörte auf zwei von zehn Ereignissen
- Ein Chargeback zog Geld ein, und niemand erfuhr davon
- Der Provisionssatz stand elfmal im Code — und einmal in wp-config.php

## Stripe.js lädt erst an der Kasse

Bis zum 02.09.2026 band `functions.php` `https://js.stripe.com/v3/` **unbedingt**
ein — auf der Startseite, im Impressum, überall. 250 KB, die drittgrößte
Übertragung der Startseite; und schwerer wiegend: bei **jedem** Seitenaufruf
ging die IP-Adresse des Besuchers an Stripe, auch wenn nie jemand zahlt.
Stripe.js setzt zur Betrugserkennung eigene Kennungen. Ein
Drittanbieter-Datenfluss ohne Bezug zur aufgerufenen Seite.

`ebStripeJsLaden()` in `board/41-flow-zahlung.js` holt die Bibliothek jetzt,
wenn der Zahlungsdialog aufgeht. Der Umbau war klein, weil `Stripe(…)` an
**einer** Stelle aufgerufen wird.

Drei Eigenschaften, jede mutationsgeprüft:

- **Das Versprechen wird gemerkt** — sonst hängt jeder Zahlungsversuch ein
  weiteres Skript ein.
- **Im Fehlerfall wird es geleert** — ein gemerktes *abgelehntes* Versprechen
  sperrte die Kasse für die ganze Sitzung; eine Netzstörung von zwei Sekunden
  kostete dann den Kauf.
- **Geladen ist nicht brauchbar.** Ein Zwischenspeicher kann eine leere 200
  liefern, `onload` feuert trotzdem. Ohne die Gegenprobe auf `window.Stripe`
  gäbe es `Stripe is not a function` mitten im Zahlungsdialog.

Der Fehlerfall ist **sichtbar**: schlägt das Laden fehl, steht es im Dialog.
Ein Zahlungsfenster, in dem nichts passiert und nichts dasteht, ist die
schlechteste Sorte Fehler an der Kasse.

Auch der `preconnect` ist weg — er wäre genau der Drittanbieter-Kontakt, den
die Umstellung beseitigt, nur ohne den Nutzen, den er vorher hatte. Und die
Dev-Shell lädt Stripe ebenfalls bedarfsgesteuert: liefe es lokal anders,
wäre der Unterschied genau dort unsichtbar, wo man ihn testet.

**Die CSP behält `js.stripe.com`.** Wer den Host herausnimmt, weil „wir laden
Stripe ja nicht mehr", legt die Zahlung still lahm.

**`recht.mjs` musste mitwachsen.** Es las nur `wp_enqueue_*` und meldete nach
der Umstellung **„0 geladen"** für eine Seite, die bei jeder Zahlung Stripe
kontaktiert. Eine Verbesserung, die einem Tor sein Subjekt wegnimmt, macht das
Tor still wertlos — dieselbe Mechanik wie beim toten Gitleaks-Scan. Der Prüfer
sieht jetzt auch `\.src = 'https://…'` in den Modulen: **wer den Ladeweg
ändert, ändert nicht die Meldepflicht.**

**Ein Riegel aus der alten Welt hatte die Kasse zugesperrt.**
`_openStripePaymentModal()` begann mit

```js
if (typeof Stripe === 'undefined') { showToast('… Bitte Seite neu laden.'); return; }
```

Solange js.stripe.com unbedingt eingebunden war, feuerte das **nie**. Seit die
Bibliothek bedarfsgesteuert lädt, ist `window.Stripe` vor dem **ersten**
Zahlungsversuch per Definition undefiniert — der Riegel wies also jeden Kunden
ab, hundert Zeilen bevor `ebStripeJsLaden()` überhaupt erreicht wurde. Alle
drei Einstiege: Board-Stage, Sofortbuchung, Chat-Buchung.

Schlimmer als „ein Klick tut nichts": alle drei rufen vorher
`_setPendingPayment()`, es blieb also ein Zahlungsvorgang im `localStorage`
stehen. Und „Bitte Seite neu laden" führte in die Irre — nach dem Neuladen ist
erst recht nichts vorgeladen.

Der Riegel war auch überflüssig: der Dialog erreicht auf **jedem** Weg
entweder `_initStripe()` oder zeigt den Fehler im offenen Fenster.

**Warum 777 grüne Tests das durchgelassen haben:** `zahlung-laden.spec.js`
prüfte den **Lader für sich allein**. Alles richtig, alles grün, und der Weg
**hinein** war zu. Ein Test, der einen Baustein prüft, sagt nichts über seine
Erreichbarkeit — dieselbe Lücke wie beim toten Gitleaks-Scan, nur eine Ebene
höher. Der neue Test öffnet den Dialog bei undefiniertem `window.Stripe` und
prüft, dass er **aufgeht**.

```bash
npx playwright test tests/e2e/zahlung-laden.spec.js   # Testzahl: siehe CLAUDE.md · echter Browser
```


## Ein Empfänger, der seit drei Monaten nicht mehr mitliest

Am 29.05.2026 wurde der Mitschnitt an `kontakt@` aus `eb_send_invoice`
genommen (Anti-Spam Patch C, „Buchungen sind im Admin-Dashboard sichtbar").
Die Zeile steht seither auskommentiert im Code. **Der Text blieb stehen** —
an zwei Stellen, beide vor dem Kunden:

- die **Buchungsbestätigung**: „sie geht zur vollen Transparenz an Kunde,
  Anbieter und **kontakt@eventbörse.de**";
- die **Zahlungs-Vorschau** im Board, also der Satz **vor** dem Bezahlen:
  „…automatisch an dich, den Anbieter und **eventbörse.de** gesendet".

Das ist keine Formulierungsfrage. Es ist eine Aussage darüber, wohin die
Buchungsdaten gehen, abgegeben im Moment der Zahlung — und sie stimmte drei
Monate lang nicht. Solche Sätze fallen nie auf: sie stehen in einer Mail, die
niemand gegen den Code liest, und Code wie Text sehen für sich richtig aus.

**Der Text folgt dem Code, nicht umgekehrt.** Den Mitschnitt wieder
einzuschalten wäre die bequemere Reparatur und würde eine bewusste
Entscheidung des Inhabers rückgängig machen.

`rechnung-empfaenger.spec.js` hält zwei Regeln, beide mutationsgeprüft:

1. **Jede im Mailtext zugesagte Adresse muss wirklich in `$recipients`
   landen** — das fängt einen neu erfundenen Empfänger.
2. **Ein auskommentierter Empfänger darf nirgends mehr zugesagt werden** —
   auch nicht als blosse Domain, denn genau so stand er in der Vorschau.

Gemessen wird **satzweise**, nicht am HTML-Block: „Bei Fragen:
kontakt@eventbörse.de" in der Fusszeile ist eine Kontaktadresse und völlig in
Ordnung, „sie geht an kontakt@…" ist eine Zusage. Wer am ganzen Block misst,
hält jede Adresse für eine Zusage und muss die Regel danach mit Ausnahmen
aufweichen.

**Verschwindet die auskommentierte Zeile, fällt der Test durch.** Sie ist das
Protokoll der Entscheidung; ohne sie hätte Regel 2 kein Subjekt mehr und
müsste still durchwinken — dieselbe Mechanik wie beim toten Gitleaks-Scan.

**Nicht betroffen: der Nachrichten-Weg.** `eb_messages_send` leitet Kontakte
zu Demo-Konten wirklich an `eb_ops_notify_address()` um, und sagt das auch.
Dort ist die Aussage richtig, und der Test misst deshalb nur den Rumpf von
`eb_send_invoice`.


## Der Zahler durfte sich sein Geld selbst zurückholen

Beim Messen des Zahlungswegs am 13.09.2026 gefunden. Der Auftrag lautete,
dem Planer *Zahlungssicherheit* zu geben — gefunden wurde das Gegenteil: er
hatte zu viel Macht, und der Dienstleister gar keine.

Die Kette, Schritt für Schritt am Code:

| | |
|---|---|
| `js/modules/board/41-flow-zahlung.js:1254` | der Planer bezahlt über `/stripe/create-payment-intent` |
| `functions.php` (`eb_stripe_create_payment_intent`) | dieser Handler setzt `metadata[user_id]` = **der angemeldete Zahler** |
| `functions.php` (Routen-Block) | `/stripe/refund` steht auf `permission_callback => 'is_user_logged_in'` |
| `eb_stripe_refund()` | `$owner_match = ( $owner_uid === $user->ID )` → **genau dieser Zahler war berechtigt** |
| dieselbe Funktion | die Erstattung setzt `reverse_transfer=true` |

**Ein angemeldeter Kunde konnte damit jederzeit und einseitig seine eigene
Zahlung in voller Höhe erstatten — auch nach erbrachter Leistung.** Das Geld
wird dabei aus dem **Connect-Konto des Dienstleisters** zurückgeholt; der hat
dann gearbeitet und bekommt nichts. Die `pi_…`-Kennung steht im
`client_secret`, das der Browser ohnehin erhält: es braucht ein Konto, eine
Buchung und die Entwicklerkonsole, sonst nichts.

**Aufgehalten hat das nur, dass es keinen Knopf dafür gibt.** Gemessen: null
Aufrufe von `/stripe/refund` in `js/modules/**`, null in `hq.html`, null
irgendwo im ausgelieferten Code. Eine REST-Route ist damit nicht
unerreichbar — sie ist nur unbeworben. **Schutz durch einen fehlenden Knopf
ist keiner**, und das ist in diesem Projekt die teuerste wiederkehrende
Fehlerklasse.

**Es war keine Absicht, sondern eine Drift.** Der Docblock derselben Funktion
nennt seit jeher genau zwei Berechtigte: *„der Anbieter, dem das Geld
zugeflossen ist"* und *„Plattform-Admins"*. Der Kommentar am `$owner_match`-
Zweig erklärte ihn mit *„falls die App den Owner dort hinterlegt hat"* —
gemeint war der **Anbieter**, geschrieben wird der **Zahler**. Zwei Stellen,
eine Annahme, auseinandergelaufen; diesmal auf einem Geldweg.

**Die Behebung ist ausschliesslich enger.** `eb_erstattung_darf()` in
`includes/payments/erstattung-rechte.php` stellt die Regel des Docblocks
wieder her: Admin oder Connect-Kontoinhaber, sonst nein. Es kommt kein Recht
hinzu. Und weil **kein Client die Route ruft**, kann dabei kein Nutzerweg
brechen — das ist gemessen, nicht angenommen.

**In eigener Datei, weil eine Rechteprüfung auf einem Geldweg AUSGEFÜHRT
gehört, nicht gelesen.** Der Prüfstand bindet sie ein, ohne WordPress zu
stellen; je mehr ein Prüfstand stellt, desto weniger prüft er.

**`hash_equals`, und zwei Wachen davor.** Ohne die frühen Rückgaben wäre
`'' === ''` ein Treffer: jeder Angemeldete ohne Connect-Konto dürfte jede
Zahlung ohne Ziel erstatten. Beim Lesen sieht das wie eine gewöhnliche
Gleichheitsprüfung aus.

**Stripe nennt das Konto an zwei Feldern und in zwei Formen** —
`transfer_data.destination` oder `on_behalf_of`, als Zeichenkette oder als
eingebettetes Objekt. Wer nur einen Fall liest, sperrt den Anbieter in den
übrigen aus: ein Nein aus dem falschen Grund, und der Weg, den der Auftrag
ausdrücklich verlangt (*„wenn er das nicht erfüllen kann, muss er Bescheid
geben und Geld zurückzahlen"*), wäre zu.

**Acht Mutationen, sechs rot.** Der Zahler darf wieder (3 rot) · `on_behalf_of`
wird nicht gelesen · das eingebettete Objekt nicht aufgelöst · der Handler
ruft die Regel nicht · die Einbindung entfernt · **beide** Leer-Wachen
entfernt.

**Zwei überleben legitim, und das gehört hierher:** jede Leer-Wache **allein**
zu entfernen ändert nichts, weil die andere den Fall bereits schliesst
(`hash_equals` mit einer gefüllten Seite ist immer falsch). Erst das Entfernen
beider öffnet das Loch. Die Zusicherung gilt also dem **Paar**, nicht der
einzelnen Zeile — dieselbe Lage wie bei der doppelten Wache im Marquee.

**Und meine eigene Prüfung fiel zuerst auf den Kommentar herein.** Der Test,
der festhält, dass `$owner_match` weg ist, fand den Namen im erklärenden
Kommentar wieder, den das Entfernen dort hinterlassen hat — so verlangt es
dieses Projekt ja. Gemessen wird jetzt **nach Abzug der Kommentare**, über
PHPs eigenen Tokenizer (`tests/e2e/lib/php-code.js`): ein regulärer Ausdruck
über `//` trifft auch das in `'https://api.stripe.com/…'` und wirft den Rest
der Zeile weg — samt Code, der dort stehen könnte.

**Was hier NICHT entschieden wird:** ob ein Eventplaner selbst stornieren
können soll. Wenn ja, dann als eigener Vorgang mit **Frist, Begründung und
Benachrichtigung des Dienstleisters** — nicht als stiller Vollzugriff auf
`POST /stripe/refund`. Ein Test hält deshalb fest, dass es weiterhin **keinen**
Weg aus der App in diese Route gibt: bekommt sie einen, fällt er durch und
zwingt zur Entscheidung, statt sie zu überspringen.

**Offen bleibt damit der Auftrag selbst.** Heute hat der Planer im Produkt
**gar keine** Zahlungssicherheit: keinen Weg zu einer Erstattung ausser über
den Dienstleister oder den Betreiber. Das „ähnlich wie bei Lieferando"
braucht einen Vorgang, den es noch nicht gibt — eine Produktentscheidung des
Inhabers.

```bash
npx playwright test tests/e2e/erstattung.spec.js   # Testzahl: siehe CLAUDE.md · 8 Mutationen
```


## Der Storno-Vorgang — ein Weg, kein Knopf auf fremdes Geld

Beauftragt am 13.09.2026: *„wenn er das nicht erfüllen kann, muss er Bescheid
geben und Geld zurückzahlen, ähnlich wie ein Pizzalieferant, der zu spät bei
Lieferando eine bestellung bekommt … das muss immer sauber ablaufen."*

**Vorher gab es dafür nichts.** Am selben Tag gemessen: der Planer hatte
keinen Weg zu einer Erstattung ausser über den Dienstleister persönlich oder
den Betreiber — und die eine Route, die es gab, war ein Loch (siehe „Der
Zahler durfte sich sein Geld selbst zurückholen").

### Es gibt keine Buchungstabelle

Beim Bauen gefunden: Buchungen liegen in `eb_board_projects` — **einem
JSON-Blob je Nutzer**, den sein Besitzer als Ganzes zurückschreibt. Ein
Storno ist aber **zweiseitig**: der Planer beantragt, der Dienstleister
entscheidet. Beide müssten in denselben Blob schreiben, der letzte
Schreibvorgang gewänne, und die Entscheidung des einen wäre weg — ohne
Meldung. Dieselbe Begründung, aus der Freunde, Gruppen und der gemeinsame
Plan eigene Tabellen bekommen haben. `eb_storno` ist die vierte.

### Die Entscheidung, an der alles hängt

**Ein Antrag erstattet nichts.** Er ist eine Bitte mit Frist
(`EB_STORNO_FRIST_STUNDEN`, 72). Erst die **Annahme durch den
Dienstleister** löst die Erstattung aus, und die läuft über die
**unveränderte** Route `eb_stripe_refund()` — es gibt genau eine Stelle, die
Geld bewegt. Hier wird kein zweiter Weg zu Stripe gebaut: zwei Wege auf
dasselbe Konto sind die Angriffsfläche, die man sich nicht ohne Not schafft,
und die Rechteregel wäre doppelt zu pflegen.

Der Planer bekommt damit einen **Vorgang**, keinen Knopf auf fremdes Geld.
Genau daran war die alte Fassung gescheitert: sie gab ihm den Knopf.

**Die Frist erstattet auch nicht automatisch.** Ein Antrag, der nach 72
Stunden von selbst Geld bewegt, wäre eine Geldentscheidung ohne einen
Menschen darin. Nach Ablauf steht er auf `abgelaufen` und ist damit für den
Betreiber sichtbar — der entscheidet. **Die Frist erzeugt eine Zuständigkeit,
keine Zahlung.** Ein Test hält fest, dass das Modul weder Stripe ruft noch
einen Zeitgeber startet.

**Der Zustand ist abgeleitet, nicht gespeichert.** Stünde `abgelaufen` in der
Datenbank, bräuchte es einen Zeitgeber, der Zeilen umschreibt — und derselbe
Antrag wäre je nach dessen Laufzeit mal offen und mal abgelaufen.

**Entschieden wird nach DERSELBEN Regel wie erstattet.**
`eb_storno_darf_entscheiden()` gibt die Frage an `eb_erstattung_darf()`
weiter. Zwei Fassungen derselben Rechteregel driften, und diese driftete
schon einmal auf einem Geldweg.

**Scheitert die Erstattung, bleibt der Antrag offen.** Ihn auf „angenommen"
zu setzen, während kein Geld geflossen ist, wäre die schlimmste Sorte
Falschaussage auf einem Geldweg.

**Ablehnen braucht eine Begründung.** Eine Absage ohne Grund ist für den
Planer dasselbe wie keine Antwort, nur endgültig.

### Anlegen und Nachprüfen kommen jetzt aus einer Liste

`eb_maybe_create_tables()` setzt `eb_db_version` erst, wenn jede Tabelle
wirklich da ist — und prüfte dafür eine Liste, die aus `eb_social_tabellen_
sql()` abgeleitet war. Eine neue Tabelle daneben zu legen hätte genau den
Fehler wiederholt, der bei 2.8 beinahe passiert wäre: die Version springt,
die Tabelle fehlt, **und die Migration läuft nie wieder an**.

`eb_zusatz_tabellen_sql()` ist deshalb die **eine** Quelle für beide Stellen.
Wer eine fünfte Tabelle anlegt, bekommt ihre Nachprüfung geschenkt.
`EB_DB_VERSION` steht auf **3.1**.

### Der Weg hinein wird geprüft, nicht angenommen

Der teuerste wiederkehrende Fehler dieses Projekts ist nicht das fehlende
Ziel, sondern der fehlende Weg: Freunde und Gruppen waren gebaut und vom
Board aus mit **null** Wegen erreichbar; die Erstattungsroute existierte und
wurde von **keinem** Client je gerufen. `storno-ansicht.spec.js` hält deshalb
die Kette fest — Platz in `app-shell.html`, Eintrag in `modules.list`,
Funktionen im **echten Browser** erreichbar.

**Und genau das ist trotzdem passiert, in diesem PR.** Die erste Fassung
war vollständig gebaut, PHP-seitig mutationsgeprüft, sieben Tests grün — und
nachgezählt:

| | Aufrufer |
|---|---:|
| `ebStornoBeantragen()` | **0** |
| `ebStornoLaden()` / `ebStornoAnsichtZeichnen()` | **0** |

Es gab **keinen Knopf**, und `#stornoListe` stand leer da, mit einem
Kommentar daneben, der versprach, `ebStornoAnsichtZeichnen()` fülle sie.
Der Vorgang war fertig und für niemanden erreichbar.

**Die Tests waren grün, weil sie die falsche Frage stellten:** *steht der
Platz da*, *sind die Funktionen definiert*. Beides ja. Ein Test, der einen
Baustein prüft, sagt nichts über seine Erreichbarkeit — dieselbe Lücke wie
beim Stripe-Lader, der geprüft war, während der Weg hinein zugesperrt war.

Gemessen wird jetzt die **Wirkung**: nach `navigateTo('board')` muss
`#stornoListe` wirklich `.storno-leer` oder `.storno-liste` tragen. Und ein
zweiter Test ruft `renderBoardPage()` **ein zweites Mal** — diese Funktion
steigt bei unverändertem Nutzer früh mit `return` aus, und ein Aufruf
dahinter liefe nur beim ersten Aufbau. Ein Weg, den es nur manchmal gibt,
ist schwerer zu finden als einer, den es nie gibt.

**Der Knopf steht im Bezahlt-Block der Karte**, also dort, wo der Planer
seine Buchung ansieht — und nur bei einer vollständig gültigen `pi_…`-Form,
nicht bei blossem Präfix: der Wert landet in einem `onclick`-Attribut und
stammt aus dem Board-Blob des Nutzers.

**Die Mutationsprobe dazu überlebte im ersten Anlauf** — zum vierten Mal an
derselben Ursache: das Muster zählte `ebStornoBeantragen(` im **erklärenden
Kommentar** neben dem Knopf mit. Gezählt wird jetzt nach Abzug der
Kommentare, über den gemeinsamen Griff `tests/e2e/lib/js-code.js`.

### `escHtml` gibt es nicht — und elf Tests haben es nicht gemerkt

Beim Bauen des Sichtbarkeits-Tests fiel es auf, weil er zum ersten Mal eine
Zeile **mit Daten** zeichnete: `ebStornoZeile()` rief `escHtml()`. Den
Helfer gibt es in diesem Projekt nicht — er heisst `_escHtml`, und das
Storno-Modul war die einzige Fundstelle ohne Unterstrich.

**Jede Zeile mit einem echten Antrag warf damit `ReferenceError`**, die
Liste blieb leer, und zwar ausgerechnet für die Nutzer, die einen Antrag
haben. Kein Fehler auf der Seite, keine Meldung — die vertraute
Schadensart: es sieht heil aus und tut nichts.

**Die Prüfung, die das decken sollte, war die Ursache.** Sie las den
Quelltext und suchte in der Zeile mit `storno-grund` nach `escHtml(`. Der
Aufruf stand dort. Ein Muster, das einen Aufruf findet, beweist nicht, dass
das Gerufene **existiert** — dieselbe Klasse wie der Kommentar-Treffer eine
Ebene höher, nur andersherum: dort war der Fund Prosa, hier war er ein
Aufruf ins Leere.

Alle elf Tests kamen nur bis zu den **leeren** Zuständen (abgemeldet,
Störung, nichts offen). Gemessen wird jetzt das gerenderte DOM mit echtem
fremdem Text: eine Zeile muss entstehen, `<img src=x onerror=…>` muss als
**Text** ankommen und nicht als Element, und der Gegenprobe-Test hält fest,
dass der eigene Antrag **keine** Entscheidungsknöpfe trägt — sonst wäre
„zeichne immer zwei Knöpfe" eine Erklärung, die beide besteht.

Die Mutation `_escHtml` → `escHtml` macht jetzt **drei** Tests rot.

### Die Frist lief auf einer Seite, die der Zuständige nicht öffnet

Der Planer arbeitet auf `/board`, der Dienstleister auf `/auftraege` —
seine Tagesseite, gebaut für „hat mich jemand angefragt, was muss ich
liefern". **Entscheiden** über einen Storno tut aber der Dienstleister, mit
**72 Stunden** Frist. Die Liste stand nur auf dem Board.

Das ist kein Schönheitsfehler: eine Frist läuft weiter, während der
Zuständige auf einer Seite arbeitet, die sie nicht zeigt. Nach Ablauf steht
der Antrag auf `abgelaufen` und wird zur Sache des Betreibers — für einen
Dienstleister, der nie erfahren hat, dass etwas offen war.

Gezeichnet wird jetzt in **jeden** Platz mit `[data-storno-liste]`; auf der
Aufträge-Seite steht er **vor** dem Auftragsboard, weil eine laufende Frist
dringender ist als die Liste offener Buchungen. Ein Zeichner, zwei Plätze —
eine zweite Fassung der Funktion würde driften.

**Und der erste Test dazu maß wieder den Zeichner statt des Weges.** Er
rief `ebStornoAnsichtZeichnen()` selbst auf; die Mutation
„`renderAuftraegePage()` ruft nicht mehr" überlebte ihn, alle vierzehn
Tests grün. Derselbe Fehler wie beim Board, eine Seite weiter und eine
Stunde später. Der zweite Test **navigiert nur** — und stellt dafür einen
angemeldeten Dienstleister, denn `/auftraege` schickt Abgemeldete auf
`home` und Event-Planer aufs Board; ohne das wäre er aus dem falschen Grund
rot gewesen. Eine Gegenprobe hält fest, dass die Seite wirklich offen ist.

**Und der erste eigene Test war dabei aus dem falschen Grund grün.** Er
setzte `window.isLoggedIn = true` — aber `isLoggedIn` ist in `app.js` per
`let` deklariert und damit **keine** `window`-Eigenschaft. Die Zuweisung
wirkte nie, die Funktion nahm den Abmelde-Zweig, und „die Anfrage ging nicht
an den Server" stimmte aus einem ganz anderen Grund als behauptet. Gesetzt
wird jetzt frei (`isLoggedIn = true`), wie in den übrigen Suiten.

Dreizehn Mutationen, jede macht die Suite rot: jeder darf beantragen
(2 rot) · unbezahlte Buchung stornierbar · die Frist läuft nie ab · ein
entschiedener Antrag erneut entscheidbar · Begründung nicht mehr Pflicht ·
spitze Klammern kommen durch · der Zahler darf entscheiden · Modul nicht
ausgeliefert (4 rot) · kein Platz in der Shell · fremder Text unmaskiert ·
**der Knopf entfernt** · **der Ladeaufruf hinter den frühen `return`
verschoben** · **der Ladeaufruf ganz entfernt** (2 rot).

**Nicht entschieden wird hier die Höhe.** Ein Storno ist immer der volle
Betrag; eine Teil-Erstattung (Anzahlung behalten, Rest zurück) ist eine
Geschäftsentscheidung mit AGB-Folgen und gehört dem Inhaber.

```bash
npx playwright test tests/e2e/storno.spec.js          # Testzahl: siehe CLAUDE.md · PHP wirklich ausgefuehrt
npx playwright test tests/e2e/storno-ansicht.spec.js  # Testzahl: siehe CLAUDE.md · echter Browser
```


## Der Webhook hörte auf zwei von zehn Ereignissen

Am 23.09.2026 am **Live-Konto** gemessen, nachdem der Stripe-Konnektor
freigeschaltet war — die Messung, die in PR #283 ausdrücklich als *„nicht
belegt"* ausgewiesen werden musste.

| | |
|---|---|
| Stripe sendet an `…/v1/stripe/webhook` | **2** Ereignisse |
| `eb_stripe_webhook()` behandelt | **10** |

Acht `case`-Zweige waren unerreichbar. **Dieselbe Klasse wie der tote
Gitleaks-Scan, diesmal auf dem Geldweg:** der Empfänger ist da, er ist
richtig, und sein Subjekt erreicht ihn nicht.

**Der teuerste davon belegt es in seinem eigenen Kommentar.**
`eb_booking_record_refund()` in `includes/booking.php` trägt die Zeile
*„signed webhooks refresh rather than invent settlement"* und verhindert
sorgfältig, dass ein verspätetes `refund.created` ein bestätigtes Ergebnis
auf `pending` zurückdreht. Er ist **für einen Webhook gebaut, den nie jemand
abonniert hat.**

**Die Wirkung ist enger als sie klingt, und das gehört dazu.** Der Storno-Weg
aus der App bucht die Erstattung **synchron** (`functions.php:9788`, direkt
nach dem Stripe-Aufruf). Kaputt war der Fall daneben: **eine Erstattung, die
im Stripe-Dashboard ausgelöst wird**, bewegt Geld und erreicht das Board nie.
Wer eine Diagnose stellt, ohne den synchronen Pfad zu sehen, meldet einen
gebrochenen Storno-Vorgang, den es nicht gibt — und sucht am falschen Ende.

Die Rangfolge, jede Zeile am Code gemessen:

| Ereignis | Empfänger | Folge des Fehlens |
|---|---|---|
| `refund.created/updated/failed` | `eb_booking_record_refund()` | Dashboard-Erstattung erreicht das Board nie |
| `charge.updated` | `eb_stripe_reconcile_payment()` | centgenauer Gebührenabgleich erst über den **Stundencron** (`eb_stripe_reconcile_cron`) |
| `transfer.created` | Audit-Log | Auszahlung ans Anbieterkonto unprotokolliert |
| `payment_intent.payment_failed/canceled` | **NOOP** | nichts — der Zweig tut ausdrücklich nichts |
| `account.updated` | `…handle_account_updated()` | nichts, solange live gepollt wird (s. u.) |

### Zwei Ereignisse werden BEWUSST nicht abonniert

**Die NOOP-Zweige bleiben aus.** Ein Abonnement erzeugte bei jedem
Fehlversuch einen Aufruf, der nichts tut. Verkehr ohne Wirkung anzufordern
ist dasselbe wie ein Prüfer ohne Subjekt, nur andersherum.

**`account.updated` wäre ein Tor gewesen, das nie auslöst.** Es erreicht uns
nur über einen Endpunkt mit **Connect-Geltungsbereich** (*„Events from →
Connected accounts"*) — am vorhandenen Konto-Endpunkt eingetragen käme es
nie an. Genau diesen Griff hätte ich fast getan; die Stripe-Dokumentation hat
ihn verhindert, nicht das Nachdenken.

**Und ein zweiter Endpunkt wäre aktiv schädlich gewesen.** Er trägt ein
**eigenes** Signaturgeheimnis, `eb_stripe_webhook()` kennt genau eines
(`eb_stripe_webhook_secret()`) — jede Connect-Lieferung fiele mit 400 durch,
bis Stripe den Endpunkt abschaltet. Reihenfolge also: **zweites Geheimnis im
Code, dann der Endpunkt.** Solange das aussteht, trägt der Fall ohnehin:
`eb_stripe_connect_state_for_user()` fragt Stripe bei **jeder** Buchung live
(`functions.php:8894`), der Status ist also nie veraltet, wenn es darauf
ankommt.

### Was NICHT kaputt war, und warum das hierher gehört

Die fünf Live-PaymentIntents tragen alle `transfer_data: null`,
`on_behalf_of: null`, `application_fee_amount: null` — also **keine**
Destination Charge. Das sah nach dem teuersten denkbaren Fund aus: Geld, das
zu 100 % auf dem Plattformkonto landet.

Es ist keiner. Nachgemessen an der Historie:

| | |
|---|---|
| Live-Zahlungen | 13.05. – **02.06.2026** |
| `transfer_data[destination]` im Code seit | **26.08.2026** (`74e7900`) |
| `metadata[offer_id]` seit | **14.09.2026** (#268) |

Ihre Metadaten tragen fünf Schlüssel, der heutige Buchungspfad setzt
vierzehn und der Admin-Pfad sechs — sie stammen aus **keinem** der beiden.
Es sind Zahlungen einer älteren Fassung. **Ein Prüfer, der aus dem falschen
Grund rot meldet, kostet mehr als keiner**; wer hier „repariert", baut an
einem Pfad um, der funktioniert.

### Der Konnektor darf lesen, nicht schreiben

`PostWebhookEndpointsWebhookEndpoint` → *„Your API key does not have the
required permissions."* Das Abonnement ist deshalb eine **Handlung des
Inhabers im Dashboard**, kein Commit. Auf einem Live-Konto werden
Schreibrechte auch nicht durchprobiert: jeder erfolgreiche Versuch wäre eine
echte Änderung.

**ERLEDIGT am 23.09.2026, 21:5x UTC.** Der Inhaber hat die fünf Ereignisse
über die Dashboard-Oberfläche gesetzt; nachgelesen über `GET
/v1/webhook_endpoints` steht der Endpunkt jetzt auf **sieben**, `url`,
`status: enabled` und `api_version: 2026-03-25.dahlia` unverändert, weiterhin
genau ein Endpunkt auf dem Konto. `vergleiche()` gegen diesen Stand:
`fehltAbo []`, `ohneEmpfaenger []` — **das Tor ist grün.**

**Das Formular war nicht der Beleg, der Rücklesewert war es.** Ein
gespeicherter Dialog sagt nur, dass er sich schließen liess.

**Die Dashboard-Oberfläche ist additiv, die API ersetzt.** Wer den Weg über
`enabled_events` nimmt, muss **alle sieben** senden — mit nur den fünf neuen
wären `payment_intent.succeeded` und `checkout.session.completed` gelöscht, und
danach würde **gar keine Buchung mehr erfasst**. Das ist der einzige Handgriff
an dieser Stelle, der live Geld unsichtbar macht.

**Zwei Namen haben Geschwister, die falsch sind.** Die Ereignissuche zeigt bei
`refund.created` auch `charge.refunded`, bei `refund.updated` auch
`charge.refund.updated`. Stripe verweist in beiden Beschreibungen selbst auf
die `refund.*`-Variante; angehakt ist keines der `charge.*`-Geschwister. Alle
fünf Namen existierten exakt wie im Code — **kein toter `case`.**

**`webhook_write` bleibt aus.** Der Schreibweg würde einem Agenten erlauben,
den Endpunkt still umzubiegen oder abzuschalten — der Ausfall, bei dem
Zahlungen weiterlaufen und nur das Board nichts mehr erfährt. Getragen wird
die Sache ohnehin vom **Lesen**: das Tor misst die Drift ab jetzt täglich, und
der Schreibvorgang war der erste seit Monaten.

**Damit es nicht wieder still verrottet, misst es jetzt ein Tor.**

```bash
node scripts/stripe-webhook.mjs           # Bericht (Tagesroutine)
node scripts/stripe-webhook.mjs --check   # Exit 1 bei Drift ODER ohne Schlüssel
```

Gebaut wie `workflows.mjs`, aus demselben Grund: **die Liste liegt bei
Stripe und in keiner Datei dieses Repositories.** Ohne Schlüssel wird nicht
durchgewunken — genau diese Verwechslung („nicht geprüft" sieht aus wie „in
Ordnung") ließ den toten Secret-Scanner vier Monate wie Schutz aussehen.

**Bevorzugt wird `EB_STRIPE_READ_KEY`**, ein eingeschränkter Schlüssel mit
Leserecht auf Webhook-Endpunkte; `EB_STRIPE_SECRET_KEY` ist der Rückfall,
damit das Tor sofort misst statt als Leiche dazuliegen. Der Schlüssel
erscheint **nie** in der Ausgabe — Logs sind bei einem öffentlichen
Repository öffentlich.

**Blockierend ist nur, was derselbe Commit beheben kann.** Ein fehlendes Abo
ist es (abonnieren *oder* mit Grund nach `OHNE_ABO`), ein überzähliges Abo
bei Stripe nicht — das wird gemeldet und quittiert ohnehin mit 200.

In der **Tagesroutine** läuft es als Bericht, nicht als Tor: dieselbe
Entscheidung wie bei den Nachbarschritten, die Routine soll den Zustand
festhalten und nicht nachts rot werden. Und ein Live-Schlüssel hat in einem
PR-Lauf über fremde Zweige nichts zu suchen.

Neun Mutationen, jede macht die Suite rot: Begründung geleert · Kommentare
nicht mehr abgezogen · fehlendes Abo nicht gemeldet · Abo ohne Empfänger
nicht gemeldet · veraltete Begründung nicht gemeldet · ohne Schlüssel still
grün · Rumpf nicht begrenzt · abgeschaltete Endpunkte zählen mit · der
Auszug liefert nichts (Gegenprobe, **4 rot**).

**Die elfte Kommentar-Falle war vorhergesehen.** Dieses Skript nennt
`case 'refund.created':` in seinem eigenen Kopfkommentar. Gemessen wird
deshalb von vornherein nach Abzug der Kommentare, über `phpOhneKommentare()`
— den Griff, der seit dem 13.09. genau dafür existiert.

```bash
npx playwright test tests/e2e/stripe-webhook.spec.js   # Testzahl: siehe CLAUDE.md · 9 Mutationen
```

### Was hier NICHT entschieden wird

- **Chargebacks hatten gar keinen Empfänger** — behoben am 23.09.2026, siehe
  den nächsten Abschnitt. Die **Rückholung** vom Dienstleister bleibt offen:
  das ist eine AGB-Frage, keine Aufräumarbeit.
- **Das Stripe-Konto ist `business_type: individual`.** Es läuft auf eine
  natürliche Person, während Impressum und Provisionsrechnung die **UG i. G.**
  als Aussteller führen. Spätestens mit der Eintragung müssen
  Rechnungsaussteller und Zahlungsempfänger dieselbe Person sein.
- **Null verbundene Konten** (`/v1/accounts` ist leer). Der Buchungspfad
  lehnt ohne aktives Connect-Konto mit 409 ab — heute ist also **keine
  Buchung bezahlbar**. Vor dem Start gehört dieser Weg einmal echt
  durchlaufen.
- **Die API-Version ist nirgends festgeschrieben.** Der Endpunkt steht auf
  `2026-03-25.dahlia`, unsere Aufrufe nehmen die Kontovorgabe. Das zu pinnen
  wäre richtig — aber es ändert die **Gestalt jeder Antwort**, die der Code
  liest, und ist ohne Gegenprobe im Testmodus genau die Sorte Änderung, die
  eine laufende Kasse stilllegt.


## Ein Chargeback zog Geld ein, und niemand erfuhr davon

Am 23.09.2026 gezählt, direkt nach der Webhook-Messung: `dispute`,
`charge.dispute` und `chargeback` kamen in PHP, JS und HTML zusammen
**null Mal** vor.

**Das ist teurer als es klingt.** Bei einer Destination Charge zieht Stripe
den strittigen Betrag vom **Plattformkonto** ein — der Dienstleister behält
seine Auszahlung. Der Betreiber trug den Verlust also bereits **und erfuhr
nichts davon**: keine Mail, kein Eintrag, nichts im Board. Die einzige Spur
lag im Stripe-Dashboard, in das man hineinsehen muss, um von ihr zu wissen.

Dazu läuft eine **Frist**. Wer die Beweise nicht rechtzeitig einreicht,
verliert ohne Verfahren — und ohne die Meldung weiß niemand, dass sie läuft.

### Festgehalten und gemeldet, nicht zurückgeholt

`eb_booking_record_dispute()` in `includes/booking.php` schreibt den Vorgang
mit und meldet ihn einmal an `eb_ops_notify_address()`. **Es bewegt keinen
Cent.**

Das ist keine Bequemlichkeit, sondern dieselbe Regel wie beim Storno: *die
Frist erzeugt eine Zuständigkeit, keine Zahlung.* Ob der Dienstleister für
einen Chargeback einstehen muss, steht in keiner AGB dieser Plattform — und
`reverse_transfer` automatisch zu setzen hieße, diese Frage im Code zu
beantworten. Ein Test hält deshalb fest, dass der Empfänger **kein**
`api.stripe.com`, `reverse_transfer`, `eb_stripe_api`, `curl_init` und
`refund_application_fee` enthält.

**Ein Dispute ist keine Erstattung.** Eigener Schlüssel
(`eb_booking_dispute_<pi>`), eigener Zweig in der Abrechnungsantwort. Ihn
unter die Refunds zu schreiben ließe das Board **„erstattet"** sagen, während
der Ausgang offen ist — und ein **gewonnener** Dispute bringt das Geld
zurück. Die Mutation „Dispute unter die Erstattungen" macht **5 Tests** rot.

**Ein geschlossener Ausgang wird nicht zurückgedreht.** Webhooks kommen nicht
in Reihenfolge; ein verspätetes `created` darf einen gewonnenen Fall nicht
wieder auf `needs_response` setzen. Die Gegenprobe gehört dazu: ein
Endzustand **darf** einen anderen ersetzen (`needs_response` → `lost`), sonst
bestünde „ändere nach dem ersten Ereignis nie wieder etwas" den Test ebenso.

**Genau eine Meldung je Dispute.** Ein Vorgang erzeugt mehrere
`.updated`-Ereignisse; eine Mail je Ereignis ist eine Mail, die nach dem
dritten Mal niemand mehr öffnet. **Scheitert die Zustellung, gilt er nicht
als gemeldet** — sonst verschluckt ein einzelner SMTP-Aussetzer die einzige
Meldung, die es je gibt.

**Die Beweisfrist steht in der Meldung.** Ohne sie sagt sie dem Betreiber
nicht, wie lange er Zeit hat, und nach Ablauf entscheidet die Bank ohne uns.

### Der Prüfstand steigt bei einer DB-Abfrage aus

`tests/e2e/dispute.php` bindet `booking.php` im Original ein; seine
`$wpdb`-Attrappe bricht bei **jeder** Abfrage mit Exit 3 ab. Der Empfänger
darf die Datenbank nicht anfassen — eine Attrappe, die jede Abfrage
beantwortet, gäbe Entwarnung für Code, den sie nie ausgeführt hat.

**Und der erste Lauf sah erfolgreich aus, weil er nichts tat.**
`booking.php` trägt `if ( ! defined( 'ABSPATH' ) ) exit;` — den Wächter gegen
den direkten Web-Aufruf. Der steigt **mit Status 0** aus: acht Tests fielen
durch, und zwar an einem unverständlichen JSON-Parse-Fehler statt an der
Ursache. Der Wächter bleibt, wo er ist; der Prüfstand setzt `ABSPATH`, und
`fahre()` verlangt jetzt ausdrücklich **Ausgabe**, nicht nur Exit 0.

Zehn Mutationen, jede macht die Suite rot: Endzustand-Wache entfernt ·
gemeldet trotz Mailfehler · Meldung bei jedem Ereignis · `payment_intent`-
Wache entfernt · Beweisfrist nicht in der Mail · Dispute unter die
Erstattungen (**5 rot**) · der Empfänger holt Geld zurück · Webhook-`case`
entfernt · Abrechnung ohne `disputes` · Gegenprobe, der Empfänger schreibt
nichts (**7 rot**).

```bash
npx playwright test tests/e2e/dispute.spec.js   # Testzahl: siehe CLAUDE.md · 10 Mutationen
```

### Ein Haken fehlt noch, und das Tor sagt es

Die drei Ereignisse sind bei Stripe **nicht abonniert**. `stripe-webhook.mjs`
meldet sie deshalb ab sofort unter `fehltAbo` — genau dafür ist es gebaut:
ein Empfänger ohne Ereignis ist ein toter Zweig.

**Dashboard → Webhooks → Endpunkt → Select events**, drei Haken dazu:

```
charge.dispute.created   charge.dispute.updated   charge.dispute.closed
```

Danach stehen dort **zehn** Ereignisse. Der Weg über die API bleibt gesperrt
und wäre ohnehin der falsche — dort ersetzt `enabled_events` die ganze Liste.

**Offen und ausdrücklich nicht gebaut:** die Rückholung vom Dienstleister.
Sie braucht zuerst eine AGB-Klausel; ohne sie wäre jede Automatik eine
Geldentscheidung ohne Rechtsgrund.


## Der Provisionssatz stand elfmal im Code — und einmal in wp-config.php

Am 14.09.2026 beim Durchgehen des Dienstleister-Bereichs gemessen.
`eb_stripe_platform_fee_rate()` liest die Konstante `EB_PLATFORM_FEE_RATE`
aus `wp-config.php`, klemmt sie auf 0–30 % und schickt das Ergebnis als
`application_fee_amount` an Stripe. **Der Satz ist ein Betriebsparameter,
kein Naturgesetz** — die Konstante existiert genau dafür.

Das Frontend trug ihn nach:

| | |
|---|---|
| **drei** feste Zahlen | `EB_PLATFORM_FEE_RATE` 0.03, `EB_STRIPE_FEE_RATE` 0.015, `EB_STRIPE_FEE_FIXED` 0.25 |
| **acht** Textstellen | „3%" ausgeschrieben |

Und die acht sind nicht Zierrat:

- `downloadBusinessInvoice()` schreibt *„Eventboerse Provision (3%)"* in
  einen **Abrechnungsbeleg** — ein Dokument für die Buchhaltung des
  Dienstleisters;
- zwei Stellen schreiben denselben Satz in **Nachrichten an den
  Dienstleister**;
- `app-shell.html` erklärt vor der Buchung: *„Eventbörse behält 3%
  Plattformprovision als Stripe Application Fee ein"*;
- das Business-Cockpit rechnet `paid * 0.03` und beschriftet die Kachel
  mit *„3 % auf bezahlte Aufträge"*.

**Hätte der Inhaber die Konstante gesetzt, wären alle acht in derselben
Sekunde falsch geworden** — ohne dass jemand eine Zeile anfasst, ohne
Fehlermeldung, und abgebucht würde trotzdem der neue Satz. Die Auszahlung
im Cockpit, die Rechnung, die Zusage im Chat: drei Geldaussagen, die sich
selbst überholen.

**Der Kommentar über der alten Definition beschrieb die Drift und tat
nichts dagegen.** Er lautete *„Gebührenmodell (Spiegel von
`eb_stripe_calculate_fee_quote` in functions.php)"*. Ein Spiegel, der
seinem Original nicht folgen kann, ist kein Spiegel, sondern ein Foto.

**Der Satz kommt jetzt über `eventboerseApi.gebuehren`**, denselben Weg
wie `themeUrl` und `demoBilder` — einmal beim Laden, alle drei Werte, aus
denselben PHP-Funktionen, die auch abrechnen.

**Geprüft, nicht geglaubt.** `ebGebuehrenWert()` nimmt einen Wert nur an,
wenn er endlich, nicht negativ und unterhalb derselben Grenze liegt, die
PHP setzt. Eine kaputte oder verfälschte Antwort darf keine Provision von
500 % erfinden; im Zweifel gilt der Regelsatz.

**Der Text wird gerechnet, nicht geschrieben.** `ebProvisionText()` bildet
„3 %", „4,5 %" — deutsches Dezimalkomma. Eine richtige Zahl neben einem
falschen Satz ist nicht halb richtig: genau so stand drei Monate lang ein
Empfänger in der Rechnungsmail, der längst nicht mehr mitlas.

**Markup kann nicht rechnen**, deshalb trägt die Shell-Erklärung
`data-eb-provision` mit dem Regelsatz als Inhalt — wer ohne JavaScript
liest, sieht den Normalfall — und `ebProvisionTexteFuellen()` tauscht ihn
einmal beim Start gegen die Wahrheit.

**Eine zweite Definition wäre die ganze Arbeit rückgängig.** `app.js` ist
eine Verkettung; bei zwei `var` gleichen Namens gewinnt die spätere
Zuweisung. Genau daran waren hier schon `renderFeed()` und
`_fetchWithTimeout()` tot. Ein Test zählt deshalb die Definitionen.

Sieben Mutationen, jede macht die Suite rot: Satz wieder fest verdrahtet ·
keine Prüfung, roher Wert · Obergrenze entfernt · Text wieder als feste
Zahl · PHP liefert die Sätze nicht mehr · zweite Definition im Board ·
der Shell-Text wird nicht gefüllt.

**Und die fünfte Kommentar-Falle des Tages steckte im eigenen Test.**
Die Mutation „PHP liefert die Sätze nicht mehr" überlebte zunächst: der
Test suchte `eb_stripe_platform_fee_rate()` im Localize-Block — und fand
den Namen im **erklärenden Kommentar**, den ich eine Zeile darüber selbst
geschrieben hatte. Gemessen wird jetzt über `lib/php-code.js`, den Griff,
der genau dafür seit dem 13.09. existiert und nach dem niemand gegriffen
hat.

```bash
npx playwright test tests/e2e/gebuehrensatz.spec.js   # Testzahl: siehe CLAUDE.md · 7 Mutationen
```
