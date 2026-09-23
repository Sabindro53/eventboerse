---
layer: L4
domain: legal
share: internal
tags: [ug, gruendung, launch, befund, steuern, pstg]
---

# Launch-Befund: die UG und was der Code dazu sagt

**Gemessen am 22.09.2026.** Dies ist ein **technischer Befund**, keine
Rechtsberatung: verglichen wurden die Aussagen unserer Rechtsseiten mit dem
Code, der sie einlösen soll. Was ein Notar, ein Steuerberater oder ein Anwalt
entscheiden muss, steht unten getrennt und ist als solches benannt.

## Stand nach der Umsetzung (23.09.2026, abends)

| Fund | Stand |
|---|---|
| 1 · Impressum nannte ein fremdes Zahlungsmodell | **behoben**, Tor hält es |
| 2 · PStTG/DAC7 kam nicht vor | **erhoben und geprüft**; Meldung bleibt beim Steuerberater |
| 3 · Provision ohne Rechnung | **gebaut**, wartet auf die Steuernummer |
| 4 · Preisangabe ohne Gesamtpreis | **behoben** |
| 5 · Vier Platzhalter im Impressum | **offen — und vor der Eintragung nicht schließbar** |
| 6 · Stripe-Webhook hörte auf 2 von 10 Ereignissen | **behoben am 23.09.**, Tor misst es täglich |

Alles ist am **23.09.2026** mit PR #283 (`1482814`) auf `main` gelandet und
live ausgeliefert; `site-monitor.yml` bestätigt den Stand am gemergten Commit.

**Die Reihenfolge ist keine Prioritätenliste, sondern eine Abhängigkeit.**
Fund 3 und die drei Platzhalter aus Fund 5 lassen sich erst schließen, wenn
die UG eingetragen ist und ihre Nummern hat.

### Fund 6 · Der Webhook hörte auf zwei von zehn Ereignissen

Erst möglich, nachdem der Stripe-Konnektor freigeschaltet war — vorher stand
diese Messung im PR ausdrücklich als *„nicht belegt"*.

`eb_stripe_webhook()` behandelt **zehn** Ereignisse, der Live-Endpunkt sendete
**zwei**. Acht `case`-Zweige unerreichbar, darunter
`eb_booking_record_refund()`, das ausdrücklich für signierte Webhooks gebaut
ist. **Eine Erstattung aus dem Stripe-Dashboard bewegte Geld und erreichte das
Buchungsboard nie.** Der Storno-Weg aus der App war nicht betroffen — der bucht
synchron.

Gesetzt am 23.09.: `charge.updated`, `refund.created`, `refund.updated`,
`refund.failed`, `transfer.created`. Rücklesewert über die API: **sieben**,
`url`, `status` und `api_version` unverändert.

Bewusst **nicht** gesetzt: `payment_intent.payment_failed` und `.canceled`
(NOOP-Zweige) sowie `account.updated` — letzteres erreicht uns nur über einen
Endpunkt mit Connect-Geltungsbereich, und der bräuchte erst ein zweites
Signaturgeheimnis im Code.

**Die API ersetzt, die Oberfläche ergänzt.** `enabled_events` per API ist ein
Ersetzen: mit nur den fünf neuen wären die zwei Zahlungsereignisse gelöscht und
**keine Buchung mehr erfasst worden**. Der Schreibweg bleibt gesperrt
(`webhook_write` ist dem Konnektor bewusst nicht erteilt).

### Was am Stripe-Konto darüber hinaus gemessen wurde

Diese drei sind **keine** Rechtstext-Funde, aber sie stehen vor dem Release:

- **`business_type: individual`** — das Konto läuft auf eine natürliche Person,
  während Impressum und Provisionsrechnung die UG i. G. als Aussteller führen.
  Spätestens mit der Eintragung müssen beide dieselbe Person sein.
- **Null verbundene Konten.** Ohne ein aktives Connect-Konto lehnt der
  Buchungspfad mit 409 ab — **heute ist keine Buchung bezahlbar**, und der
  Onboarding-Weg wurde live nie durchlaufen.
- **Chargebacks hatten keinen Empfänger** — behoben am 23.09.2026. Der
  Vorgang wird jetzt festgehalten und einmal an den Betreiber gemeldet, samt
  Beweisfrist, **ohne einen Cent zu bewegen**. Bei einer Destination Charge
  zieht Stripe vom Plattformkonto ein, der Anbieter behält seine Auszahlung.
  **Ob er dafür einsteht, steht in keiner AGB dieser Plattform** — deshalb
  wird es nicht im Code entschieden. Zwei Dinge fehlen: die AGB-Klausel und
  drei Haken im Stripe-Dashboard.

### Was beim Umsetzen dazugekommen ist

**Die Bagatellgrenze gilt nicht für uns.** Beim Nachschlagen am 22.09.2026:
§ 4 Abs. 5 Nr. 4 PStTG (unter 30 Fälle **und** unter 2.000 €) betrifft
ausschließlich den **Verkauf von Waren**. Wir vermitteln persönliche
Dienstleistungen nach § 5 Abs. 1 Nr. 2 — gemeldet wird **ab dem ersten
Euro**. Der ursprüngliche Befund war damit schärfer, als er hier stand.

**§ 19 UStG ist seit dem 01.01.2025 reformiert.** Die Grenzen liegen bei
25.000 € (Vorjahr) und 100.000 € (laufendes Jahr), **netto** gerechnet. Und
der Wechsel in die Regelbesteuerung tritt beim Überschreiten **sofort** ein,
nicht erst im Folgejahr. Der Inhaber hat sich am 22.09.2026 für die
**Regelbesteuerung** entschieden; der Code rechnet entsprechend mit 19 %.

**Eine eigene Regel hätte rechtmäßige Eingaben abgewiesen.** Die erste
Fassung der Steuer-ID-Prüfung verbot eine führende Null — eine Regel, die in
mehreren Quellen steht und falsch ist: die amtliche Beispielnummer
`02476291358` beginnt mit einer Null. Sie hätte Dienstleister von ihrer
Auszahlung abgehalten. Gefunden hat es der eigene Prüfstand, nicht das Lesen.

Die Anordnung folgt der Regel dieses Projekts: **gemessen, nicht behauptet.**
Jeder Befund nennt seine Fundstelle.

---

## 1 · Das Impressum nennt ein Zahlungsmodell, das der Code nicht fährt

Das ist der schwerste Fund, und er ist es aus einem Grund, der nichts mit
Wortklauberei zu tun hat.

`app-shell.html`, Impressum:

> Die Eventbörse UG (haftungsbeschränkt) erbringt keine erlaubnispflichtigen
> Tätigkeiten im Sinne des Zahlungsdiensteaufsichtsgesetzes (ZAG) … Zahlungen
> werden über den lizenzierten Zahlungsdienstleister Stripe Payments Europe
> Ltd., Irland, abgewickelt (**Direct-Charges-Modell**).

Was der Code wirklich tut, `functions.php:8891`:

```php
// Stripe Connect: Destination Charge + on_behalf_of.
$fields['application_fee_amount']     = $fee_cents;
$fields['transfer_data[destination]'] = $connect_id;
$fields['on_behalf_of']               = $connect_id;
```

und `functions.php:8157`:

```php
'fee_model' => 'destination_charge_application_fee_incl_processing'
```

Der **einzige** Direct-Charge-Pfad im Projekt steht bei `functions.php:8980`
und trägt `'description' => '[ADMIN-TEST] ' . $title` — eine Testroute, kein
Kundenweg.

**Warum das mehr ist als ein falsches Wort.** Der Satz im Impressum ist kein
Schmuck: er ist die **Begründung** dafür, dass wir keine ZAG-Erlaubnis
brauchen. Diese Begründung hängt daran, wer die Zahlung entgegennimmt. Bei
Direct Charges entsteht die Zahlung auf dem Konto des Dienstleisters; bei
Destination Charges entsteht sie auf **unserem** Konto und wird
weitergeleitet. Das sind zwei verschiedene Sachverhalte, und wir tragen den
einen im Code und den anderen im Impressum vor.

Ob die ZAG-Einordnung im Ergebnis trotzdem trägt — `on_behalf_of` setzt den
Dienstleister als Settlement-Merchant, und Stripe ist in beiden Fällen der
lizenzierte Dienstleister — ist **eine Frage für einen Anwalt**, nicht für
mich. Was ich sagen kann: die Seite begründet sie derzeit mit einem
Sachverhalt, den es hier nicht gibt.

**Unsere eigenen AGB sagen es richtig** (`app-shell.html:2669`):

> Zahlungsmodell: Stripe Connect Express mit **Destination Charges und
> Application Fee**

Zwei Rechtstexte derselben Plattform beschreiben denselben Geldweg
verschieden, und nur einer trifft den Code. **Zwei gepflegte Fassungen
derselben Sache driften immer** — diese ist bereits gedriftet.

---

## 2 · PStTG (DAC7) kommt im ganzen Projekt nicht vor

Gezählt über `app-shell.html`, `vault/` und alle PHP-Dateien:

| Suchbegriff | Fundstellen |
|---|---:|
| PStTG / Plattformen-Steuertransparenzgesetz | **0** |
| DAC7 | **0** |
| § 25e UStG / Marktplatzhaftung | **0** |

Das PStTG gilt seit dem **01.01.2023** und trifft Betreiber digitaler
Plattformen, über die *relevante Tätigkeiten* vermittelt werden. Dazu zählen
ausdrücklich **persönliche Dienstleistungen** — also genau das, was hier
vermittelt wird (DJ, Catering, Fotografie).

Die Pflicht ist keine Fußnote: sie verlangt, dass wir die Anbieter
**identifizieren**, ihre Daten erheben, sie auf Plausibilität prüfen und sie
bis zum **31. Januar** des Folgejahres an das Bundeszentralamt für Steuern
melden. Ein Verstoß ist eine Ordnungswidrigkeit.

**Der Code erhebt die verlangten Daten nicht.** Gemessen am
Registrierungsformular und am Stripe-Onboarding:

| Feld | vorhanden |
|---|---|
| Firmierung (`regCompany`) | ja |
| USt-IdNr. (`regVatId`) | ja, **optional** |
| Gewerbe-Kennzeichen (`regGewerbe`) | ja, Kästchen |
| Vor-/Nachname, E-Mail, Website | ja |
| **Geburtsdatum** | **nein** |
| **Steueridentifikationsnummer** | **nein** |
| **Handelsregisternummer + Registergericht** | **nein** |
| **Ansässigkeitsstaat** | **nein** |

§ 14 PStTG verlangt für natürliche Personen Name, Anschrift, **Geburtsdatum**
und Steuer-ID; für Rechtsträger zusätzlich Handelsregisternummer.

**Was davon Stripe liefert, ist offen.** Stripe Connect erhebt im Onboarding
Identitätsdaten und bietet für manche Regionen eine DAC7-Unterstützung an.
Ob das für unseren Aufbau die Meldepflicht abdeckt, kann ich von hier aus
**nicht** feststellen — der Stripe-Zugang dieser Sitzung ist nicht
autorisiert. Das ist eine Frage an Stripe und an den Steuerberater, und sie
gehört **vor** den Launch, nicht nach dem ersten Meldejahr.

---

## 3 · Die Provision wird abgebucht, aber nie in Rechnung gestellt

Gemessen: eine Rechnung der **Plattform an den Dienstleister** über die
Vermittlungsprovision gibt es im Projekt nicht.

- `eb_send_invoice()` (`functions.php:7777`) ist die **Buchungsbestätigung**
  an Kunde und Dienstleister über die Eventleistung — nicht über unsere
  Provision.
- `downloadBusinessInvoice()` (`js/modules/ui/52-release-vision.js`) erzeugt
  eine **Zahlungs- und Steuerübersicht**, die der Dienstleister sich selbst
  herunterlädt. Sie führt die Zeile
  `'Eventboerse Provision (' + ebProvisionText() + '): -' + _rvMoney(platform)`
  — also einen **Abzug**, keine Rechnung. Das Dokument sagt selbst
  „keine Steuerberatung".

Der Geldfluss läuft über `application_fee_amount`: Stripe zieht die Provision
ab und leitet sie an uns weiter. **Es fließt also Geld für eine Leistung, für
die kein Beleg existiert.**

Das berührt zwei Dinge:

1. **§ 14 UStG.** Eine sonstige Leistung an einen Unternehmer ist mit
   Rechnung abzurechnen. Ohne sie kann der Dienstleister die Provision nicht
   als Vorsteuer geltend machen — und wir haben für unsere eigene
   Buchhaltung keinen Ausgangsbeleg.
2. **Die Umsatzsteuer auf die Provision selbst.** Gemessen: das Wort
   „Provision" steht nirgends in diesem Projekt in einem Satz mit „USt",
   „Umsatzsteuer", „netto", „brutto", „zzgl." oder „inkl." — **null
   Fundstellen**. Die Provision ist steuerlich nirgends eingeordnet.

**Für eine neue UG ist das eine Gründungsentscheidung**, keine Codefrage:
Kleinunternehmerregelung nach § 19 UStG oder Regelbesteuerung. Sie steht im
Fragebogen zur steuerlichen Erfassung, und sie bindet fünf Jahre, wenn man
zur Regelbesteuerung optiert. Der Code muss ihr danach folgen — heute tut er
weder das eine noch das andere.

Bemerkenswert: **für den Dienstleister ist die Frage im Produkt gelöst.**
`52-release-vision.js` bietet ihm „Kleinunternehmer (§ 19 UStG)" oder
„Umsatzsteuer ausweisen" zur Wahl. Für **uns selbst** gibt es das nicht.

---

## 4 · Der B2B-AGB verspricht eine Preisangabe, die das Formular nicht kennt

`app-shell.html`, AGB B2B § 5:

> Preise werden vom Dienstleister angegeben (**Brutto, USt ausgewiesen**,
> Reverse-Charge-Hinweise im B2B-Verhältnis nach § 13b UStG).

Das Inseratsformular (`app-shell.html:2167`) bietet:

> Preisspanne (€) — Mindestpreis ist Pflicht. „Bis"-Wert ist optional.

**Es gibt kein Feld für Brutto/Netto, keines für den USt-Satz und keinen
Reverse-Charge-Hinweis.** Gemessen: „inkl. USt" / „zzgl. USt" kommt in
`app-shell.html` und in allen Frontend-Modulen **nicht** vor.

Damit stehen zwei Dinge offen:

- **PAngV.** Gegenüber Verbrauchern ist der **Gesamtpreis** anzugeben, also
  einschließlich Umsatzsteuer. Ob unsere Preise das sind, weiß niemand — der
  Dienstleister trägt eine Zahl ein, und nichts sagt ihm, welche.
- **Der AGB-Satz ist derzeit unwahr.** Er beschreibt eine Eingabe, die es
  nicht gibt. Dieselbe Klasse wie Fund 1: ein Rechtstext, der einen
  Sachverhalt behauptet, den der Code nicht herstellt.

---

## 5 · Vier Platzhalter im Impressum

Ein Durchlauf über alle 15 Pflichtseiten: **nur das Impressum** trägt
unausgefüllte Platzhalter.

| Platzhalter | woher der Wert kommt |
|---|---|
| `[TELEFON-GESCHÄFTLICH]` | eigene Entscheidung |
| `HRB [HR-NUMMER]` | Amtsgericht Bonn, nach Eintragung |
| `[USt-IdNr.]` | BZSt, nach steuerlicher Erfassung |
| `[W-IdNr.]` | Wirtschafts-Identifikationsnummer |

Drei davon **kann es vor der Eintragung gar nicht geben** — sie sind kein
Versäumnis, sondern der ehrliche Zustand „i. G.". Der vierte
(`[TELEFON-GESCHÄFTLICH]`) ist heute schon füllbar; § 5 TMG verlangt Angaben,
die eine **unmittelbare** Kommunikation ermöglichen.

**Der gefährliche Teil kommt danach.** Das Impressum wird in dem Moment
unvollständig, in dem die UG eingetragen ist — ohne dass jemand etwas ändert
und ohne dass irgendwo eine Warnung erscheint. Dieselbe Sorte wie die
Händlerstatus-Erklärung bei Apple: eine **fehlende** Angabe blockiert und
fällt auf, eine **stillschweigend falsch gewordene** nicht.

---

## Was bereits richtig ist

Damit der Befund nicht nach mehr Baustelle aussieht, als er ist:

- **Die Plattformrolle ist sauber getrennt.** AGB § 2: *„Die Plattform ist
  ausschließlich Vermittler. Sie wird nicht selbst Vertragspartner der
  Eventleistung."* Das passt zum Code — wir bewegen Geld, wir erbringen die
  Leistung nicht.
- **Die Vermittlung ist gegenüber dem Privatkunden unentgeltlich**, und die
  Provision kommt vom Dienstleister. Das ist konsistent mit der
  `application_fee` und macht den B2C-Teil einfacher.
- **Der Widerruf deckt den Dienstleistungsfall.** § 356 Abs. 4 BGB steht
  drin, samt vorzeitigem Erlöschen — der Fall, an dem Marktplätze für
  Dienstleistungen regelmäßig scheitern.
- **15 Pflichtseiten sind da und haben alle eine Route** (`recht.mjs`).
- **Die Provision ist seit dem 14.09. serverseitig gesteuert**
  (`EB_PLATFORM_FEE_RATE`), Rechnungstext und Zahl stimmen überein.
- **Die Kontolöschung** nach Apple 5.1.1(v) ist gebaut.

---

## Wem was gehört

**Mir (Code / Konsistenz), sobald der Inhaber entscheidet:**

- Impressum und AGB auf **ein** Zahlungsmodell bringen. Ich schreibe hier
  keine Rechtstexte (stehende Projektregel) — aber sobald der Wortlaut
  feststeht, ziehe ich ihn ein und baue ein Tor, das die beiden Seiten
  künftig gegen `fee_model` im Code misst. Dann ist es derselbe Mechanismus,
  der schon das Privacy-Manifest gegen die Vault-Tabelle hält.
- Die PStTG-Felder im Registrierungs- und Onboarding-Weg erheben, sobald
  feststeht, **welche** davon Stripe schon liefert.
- Ein Brutto/Netto-Feld am Inserat plus Preisauszeichnung, sobald die
  USt-Entscheidung der UG gefallen ist.
- Eine Provisionsrechnung (oder Gutschrift im Sinne des § 14 Abs. 2 UStG)
  an den Dienstleister.

**Nicht mir:**

- Notartermin, Gesellschaftsvertrag, Stammkapital, Handelsregister.
- Fragebogen zur steuerlichen Erfassung — insbesondere **§ 19 UStG oder
  Regelbesteuerung**. Diese eine Entscheidung steuert vier der obigen Punkte.
- Die ZAG-Einordnung unter Destination Charges.
- Ob Stripes DAC7-Unterstützung unsere PStTG-Meldepflicht abdeckt.
- Gewerbeanmeldung, IHK, Berufshaftpflicht.

**Ein Satz zur Einordnung:** nichts davon hindert die *Gründung*. Die Punkte
1 bis 4 hindern den **Launch mit echten Zahlungen**, weil sie Aussagen
betreffen, die im Moment des Bezahlens gegenüber Kunden und Dienstleistern
abgegeben werden — und drei davon stimmen heute nicht.
