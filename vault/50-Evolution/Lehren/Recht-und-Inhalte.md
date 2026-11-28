---
layer: L5
domain: evolution
share: internal
tags: [layer/L5, domain/evolution, share/internal, lehren]
---

# Lehren: Rechtliche Pruefung, Rechtstexte, Werbeaussagen

> Wörtlich aus `CLAUDE.md` ausgelagert am 28.11.2026 (Stand `7340150`).
> Die Regeln daraus stehen kurz in `CLAUDE.md`; hier steht, **warum** —
> Messungen, Fehlschläge, Mutationsproben. Zahlen sind Stand des jeweiligen
> Datums; gepflegte, geprüfte Zahlen stehen nur in `CLAUDE.md`.

## Inhalt

- Rechtliches — gemessen, nicht behauptet
- „150+ Dienstleister · 4.8★" — eine Werbeaussage über Demo-Daten
- Vier Rechtstexte, die etwas anderes sagten als der Code

## Rechtliches — gemessen, nicht behauptet

```bash
node scripts/recht.mjs           # vault/40-Governance/Legal/Rechtliche-Lage.md
node scripts/recht.mjs --check   # CI-Tor (pr-check.yml), täglich in der Tagesroutine
```

Vergleicht fünf Aussagen des Vaults mit dem Code: **Speicherschlüssel** (jeder
localStorage-/sessionStorage-Key muss in `Cookie-Liste.md` stehen — TDDDG § 25,
DSGVO Art. 13), **Einwilligung** (liest überhaupt eine Schreibstelle die
Antwort?), **Pflichtseiten** (jeder Slug der Compliance-Übersicht braucht eine
Route in `functions.php`), **KI-Transparenz** (EU AI Act Art. 50) und
**Drittanbieter** (jeder Host, den `wp_enqueue_*` wirklich einbindet, muss in
der Datenschutzerklärung stehen — DSGVO Art. 13 Abs. 1 lit. f).

Ein **unbekannter** Host blockiert ebenfalls: er ist ein neuer Datenfluss an
einen Dritten, also der gefährlichste Fall, nicht der harmloseste. Neuer CDN →
Eintrag in `DRITTANBIETER_NAMEN` **und** in die Datenschutzerklärung.

Blockierend ist nur, was derselbe Commit beheben kann.

**Die Einwilligung wirkt seit dem 20.08.** `ebSpeichern()` in
`js/modules/core/00-basis.js` prüft vor jedem nicht-essenziellen Schreibvorgang;
alle 20 betroffenen Schreibstellen laufen darüber. Die Klassentabelle
`EB_SPEICHER_KLASSEN` ist die Codeseite der Cookie-Liste — `recht.mjs` prüft,
dass **jeder** Schlüssel eine Klasse hat und beide Seiten dieselbe nennen.
Essenzielles (Anmeldung, laufende Zahlung, die Antwort selbst) schreibt weiter
direkt; ein unbekannter Schlüssel gilt als profilbildend, nicht als essenziell.

**Neue nicht-essenzielle Schreibstelle → `ebSpeichern()`, nicht
`localStorage.setItem()`.** Sonst ist die Einwilligung dort wirkungslos, und
`recht.spec.js` bricht ab.

**Neuer Speicherschlüssel = neue Zeile in `Cookie-Liste.md`,** sonst bricht der
PR-Check ab. Der Prüfer löst Konstanten, Hilfsfunktionen (auch über
Modulgrenzen — `app.js` ist eine Verkettung) und `'prefix' + id` auf; was er
nicht auflösen kann, meldet er, statt es als sauber zu verbuchen.

**Ein Modell schreibt bei Eventbörse keine Rechtstexte.** `vault/40-Governance/`
liegt außerhalb des Autopilot-Rahmens — gewollt, nicht technisch bedingt.


## „150+ Dienstleister · 4.8★" — eine Werbeaussage über Demo-Daten

Am 08.10.2026 beim Bau des IHK-Pitches gefunden: der Screenshot der Startseite
zeigte *„150+ Dienstleister · Sofort kontaktierbar · Top bewertet"* und
darunter *„150+ Dienstleister · 4.8★ Ø Bewertung · 12 Kategorien"* — in einer
Beta mit Demo-Daten, deren eigener Banner sagt, dass noch nichts buchbar ist.

**Drei Ursachen, alle gemessen:**

- **„150+", „4.8★" und „Top bewertet" waren Platzhalter im Markup.** Sie
  standen da, bis `updateHeroStats()` lief, und blieben stehen, wenn das Laden
  der Inserate scheiterte. In der Dev-Shell ist genau das der Normalfall.
- **`updateHeroStats()` zählte das sichtbare Set.** Blendet der Admin-Switch
  Demo-Inserate ein, wurden Demo-Anbieter und Demo-Bewertungen zur
  Werbeaussage auf der Startseite. Das ist eine Angabe ohne Deckung (UWG), und
  sie steht vor jedem Besucher.
- **„12 Kategorien" stimmte nie.** Ein Inserat kann zehn tragen
  (`AI_CATEGORIES`).

**Die Zeile zählt jetzt ausschliesslich echte Inserate**, unabhängig vom
Demo-Switch, und bleibt **verborgen**, solange es keines gibt — „0
Dienstleister" wäre die ehrliche, aber schlechtere Auskunft. Die
Kategorienzahl kommt aus `AI_CATEGORIES`. Die Unterzeile trägt keine Zahl
mehr: *„Dienstleister finden · Direkt anfragen · Gemeinsam planen"*.

**`.ai-hero-stats[hidden] { display: none }` ist Pflicht** — die Zeile hat eine
eigene `display`-Angabe, ohne die Regel stünde sie leer und sichtbar da.

Mutation „Demo-Inserate zählen wieder mit" → **3 von 5 rot**.

```bash
npx playwright test tests/e2e/hero-zahlen.spec.js   # Testzahl: siehe CLAUDE.md
```


## Vier Rechtstexte, die etwas anderes sagten als der Code

Am 22.09.2026 auf Wunsch des Inhabers geprüft: *„damit alles Kriterien für
eine UG in Deutschland zu gründen klappt."* Vollständiger Befund:
`vault/40-Governance/Legal/Launch-Befund-UG.md`.

**Das Impressum begründete die ZAG-Freiheit mit einem fremden Sachverhalt.**
Es nannte ein *„Direct-Charges-Modell"*; `functions.php:8891` fährt
`transfer_data[destination]` + `on_behalf_of` + `application_fee_amount`. Der
einzige Direct-Charge-Pfad trägt `[ADMIN-TEST]`.

Das ist kein falsches Wort: **dieser Satz ist die Begründung** dafür, dass wir
keine ZAG-Erlaubnis brauchen, und sie hängt daran, auf wessen Konto die
Zahlung entsteht. Unsere **eigenen AGB sagten es richtig** — zwei Rechtstexte
derselben Plattform, ein Geldweg, zwei Beschreibungen.

`zahlungsmodell.spec.js` misst jetzt den **Code**, nicht eine Konstante:
welche Felder an Stripe gehen, entscheidet das Modell. Ein Konstantenname
lässt sich umbenennen, ohne dass jemand an die Datei denkt.

**Die Mutation „Erkennung gibt immer destination" überlebte zuerst** — die
übrigen Tests prüfen die Felder ohnehin direkt. Eine Wache ohne beobachtbare
Wirkung ist eine Behauptung; dieselbe Klasse wie `ebAuftragSchluessel()`
hinter seiner Gruppierung. Sie nimmt den Rumpf jetzt als Argument.

### PStTG: keine Bagatellgrenze für Dienstleistungen

```bash
npx playwright test tests/e2e/psttg.spec.js   # Testzahl: siehe CLAUDE.md · 6 Mutationen
```

PStTG/DAC7 kam im ganzen Projekt **null Mal** vor. Nachgeschlagen statt
angenommen: die Grenze des § 4 Abs. 5 Nr. 4 (unter 30 Fälle **und** unter
2.000 €) gilt nur für den **Verkauf von Waren**. Für vermittelte persönliche
Dienstleistungen — § 5 Abs. 1 Nr. 2, also DJ, Catering, Fotografie — meldet
man **ab dem ersten Euro**, bis zum 31. Januar des Folgejahres. Ein Verstoß
ist eine Ordnungswidrigkeit.

**Erhoben wird beim Auszahlungsweg, nicht bei der Registrierung.** Das ist
die wichtigste Entscheidung darin, und sie ist **datenschutz**rechtlich
begründet: meldepflichtig ist nur, wer Vergütung erhält (§ 4 Abs. 4) — ein
Eventplaner nie. Geburtsdatum und Steuer-ID von jedem Registrierten
einzusammeln wäre eine Erhebung auf Vorrat gegen Art. 5 Abs. 1 lit. c DSGVO.
Ein Test hält die Registrierung davon frei.

**Nichts wird halb gespeichert.** Fällt ein Feld durch, wird gar nichts
geschrieben — sonst stünde ein Anbieter mit gültiger Steuer-ID und
unsinnigem Geburtsdatum da, und die Vollständigkeitsprüfung meldete „fertig".

**Und die eigene Zusatzregel hätte rechtmäßige Eingaben abgewiesen.** Die
erste Fassung verbot eine führende Null in der Steuer-ID — die amtliche
Beispielnummer `02476291358` hat eine. Sie hätte Dienstleister von ihrer
Auszahlung abgehalten, also genau der Fehlalarm, vor dem der Kommentar
daneben **im selben Commit** warnte. Die Prüfziffer nach ISO/IEC 7064
MOD 11,10 trägt die Erkennung allein.

### Die Provision floss ohne Beleg

```bash
npx playwright test tests/e2e/provisionsrechnung.spec.js   # Testzahl: siehe CLAUDE.md · 8 Mutationen
```

`application_fee_amount` zog bei jeder Buchung ab, und es gab **keine
Rechnung** von uns an den Dienstleister (§ 14 UStG). Er konnte die Provision
nicht als Vorsteuer ziehen, wir hatten keinen Ausgangsbeleg.

**Die Steuer wird herausgerechnet, nicht aufgeschlagen.** Stripe zieht die
Fee vom Zahlbetrag ab — sie **ist** der Bruttobetrag unserer Leistung. Wer
19 % aufschlägt, stellt mehr in Rechnung, als eingenommen wurde.

**Ohne Steuernummer entsteht kein Beleg.** § 14 Abs. 4 Nr. 2 verlangt sie;
eine UG in Gründung hat sie nicht. Ein Beleg ohne sie berechtigt nicht zum
Vorsteuerabzug und müsste berichtigt werden. Opt-in über `EB_STEUERNUMMER`
bzw. `EB_UST_ID` in `wp-config.php`.

##### „Derselbe Weg wie `EB_APPLE_TEAM_ID`" — den gab es nicht

Genau das stand hier, und es war falsch. Am 26.09.2026 nachgemessen:
`ionos-deploy.yml` schrieb SMTP, Stripe, die Apple-Team-ID und die
KI-Schlüssel nach `wp-config.php` — **für die Steuerangaben gab es keinen
Schritt.** Wer dem Satz folgte, setzte ein GitHub-Secret, das nichts liest,
und wartete auf eine Rechnung, die nie entsteht.

**Dieselbe Klasse wie der tote Gitleaks-Scan, eine Ebene höher:** die Notiz,
die jede Sitzung zuerst liest, beschrieb einen Mechanismus, den niemand
gebaut hatte. Aufgefallen ist es beim Schreiben der Cowork-Anleitung — also
erst, als jemand danach handeln sollte.

Den Schritt gibt es jetzt, und er misst das Verhalten, nicht die
Schreibweise: `steuernummer-deploy.spec.js` schneidet ihn aus dem Workflow,
stellt `lftp` als Attrappe (sie liest den Pfad aus dem **echten** Aufruf)
und fährt ihn mit `bash -eo pipefail`.

**Zwei Werte, zwei verschiedene Prüfungen — und die eine ist bewusst lose.**
Die USt-IdNr wird gegen `^DE[0-9]{9}$` geprüft, dieselbe Form wie in
`eb_provision_absender()`; driften die beiden, schriebe der Deploy einen
Wert, den PHP anschliessend verwirft, und meldete dabei Erfolg. Die
**Steuernummer hat kein bundeseinheitliches Format** (Länderschema 10 oder
11 Ziffern, vereinheitlichtes Schema 13), also wird nur die Gestalt geprüft:
Ziffern mit Trennern, 10 bis 13 Ziffern. Eine engere eigene Regel wiese
rechtmäßige Nummern ab — genau das ist bei der Steuer-ID schon einmal
passiert, an der führenden Null der amtlichen Beispielnummer.

Gemessen wird die Richtung, auf die es ankommt: **was der Deploy durchlässt,
muss PHP annehmen.** Strenger sein darf er — das scheitert laut im Lauf,
nicht still im Betrieb. Eine Gegenprobe hält fest, dass überhaupt etwas
durchkommt; sonst bestünde „lehnt alles ab" jede einzelne Zusicherung.

**Geschrieben wird nur, was gesetzt ist.** Ein leeres `define('EB_UST_ID',
'')` wäre für PHP dasselbe wie keines — in der Datei sähe es aus wie
eingerichtet, und „nicht eingerichtet" muss anders aussehen.

**Und die Mutationsprobe war zuerst aus dem falschen Grund rot.** Die
Mutation „Format driftet von PHP weg" ersetzte `'^DE[0-9]{9}$'` per
`String.replace` mit einer **Zeichenkette** — und `$'` ist dort das
Sonderzeichen für „alles nach dem Treffer". Der halbe Workflow stand danach
doppelt in der Datei; acht Tests fielen durch statt zwei. Ein Messgerät, das
sein Subjekt verändert, misst sich selbst — dieselbe Lehre wie beim
`git checkout --` des Barrierefreiheits-Läufers, nur in der Ersetzung statt
in der Sicherung. Mutiert wird jetzt mit einer Funktion als Ersatz.

Neun Mutationen, jede macht die Suite rot: Opt-in entfernt · die
USt-IdNr-Prüfung entfernt · das Format driftet von PHP weg · das leere
Gegenstück wird mitgeschrieben · die alte Zeile wird nicht mehr gelöscht
(zwei `define()` gleichen Namens) · die Ziffernzahl wird nicht mehr geprüft ·
die Obergrenze zu eng (13-stellige Nummern fallen durch) · der ganze Schritt
entfernt (**11 rot**) · die geholte `wp-config.php` bleibt auf dem Runner
liegen.

```bash
npx playwright test tests/e2e/steuernummer-deploy.spec.js   # Testzahl: siehe CLAUDE.md · 9 Mutationen
```

**Der Frühausstieg verbraucht keine Rechnungsnummer.** Jede Wache steht
**vor** dem Hochzählen — sonst risse jeder abgewiesene Aufruf eine Lücke in
die Folge, und Lücken muss man bei einer Prüfung erklären können.
Hochgezählt wird in **einem** Statement: `get_option` + `update_option` hätte
das Rennen, bei dem zwei Buchungen dieselbe Nummer bekommen.

**Ein unklarer Steuerfall wird gemeldet, nicht geraten.** Drittland, fehlende
oder fremde USt-IdNr → der Posten geht an einen Menschen. Eine zu Unrecht
angewandte Reverse-Charge-Regel schuldet die Steuer trotzdem.

### Die Platzhalter, die nach der Eintragung unwahr werden

```bash
npx playwright test tests/e2e/impressum.spec.js   # Testzahl: siehe CLAUDE.md · 4 Mutationen
```

Nur das Impressum trägt unausgefüllte Platzhalter. **Drei davon kann es vor
der Eintragung nicht geben** — Registernummer, USt-IdNr und W-IdNr vergeben
Amtsgericht und BZSt. Sie sind der ehrliche Zustand „i. G.".

**Die Gefahr ist das stille Falschwerden danach**: mit der Eintragung wird
das Impressum unvollständig, ohne dass jemand etwas ändert. Dieselbe Sorte
wie Apples Händlerstatus. Das Tor hält deshalb das **Paar** — Platzhalter und
Zusatz „i. G." müssen zusammen da sein und zusammen verschwinden.

**Der erste Entwurf war selbst ein Prüfer ohne Subjekt, und alle drei
Mutationen überlebten ihn.** Jede zeigte einen eigenen Fehler: `textAusHtml()`
lässt **Entities** stehen, also trifft `/i\.\s*G\./` niemals `i.&nbsp;G.` ·
die Erkennung hing ersatzweise am Wort **„Vorgründung"**, dem Marketing-Banner
derselben Seite · und die Pflichtangaben wurden am **Etikett** gemessen statt
am Wert, sodass „gelöscht statt gefüllt" durchkam — der gefährlichste Ausgang.

**Und das Etikett traf zuerst die Prosa.** „Handelsregister" steht auf der
Seite zuerst im erklärenden Satz und erst hundert Zeichen später in der
Datenzeile; `search()` mass die Erklärung. Zehnte Fundstelle dieser Klasse.
Gemessen wird jetzt **jede** Fundstelle, und das Etikett ist das der
Datenzeile (`Registernummer:`), nicht das Wort daneben.

### „inkl. MwSt." ist nicht immer wahr

```bash
npx playwright test tests/e2e/preisangabe.spec.js   # Testzahl: siehe CLAUDE.md · 5 Mutationen
```

Die B2B-AGB versprachen *„Brutto, USt ausgewiesen"*, das Formular bot
„Preisspanne (€)". „inkl./zzgl. USt" kam im ganzen Frontend **nicht** vor
(§ 3 PAngV verlangt den Gesamtpreis).

**Der Zusatz gilt nur, wo er stimmt.** Ein Kleinunternehmer nach § 19 UStG
weist keine Umsatzsteuer aus; ihm „inkl. MwSt." unterzuschieben wäre eine
Falschaussage auf **seinem** Angebot. `ebPreisHinweis()` sagt deshalb
„Gesamtpreis" — wahr in beiden Fällen — und ergänzt „inkl. USt." nur bei
`smallBusiness === false`, also wenn er es ausdrücklich gesagt hat.
