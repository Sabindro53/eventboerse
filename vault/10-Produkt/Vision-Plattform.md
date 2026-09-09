---
layer: L1
domain: produkt
share: internal
tags: [layer/L1, domain/produkt, share/internal, typ/strategie]
---

# Die Vision: eine Plattform für jedes Event und jede Aktivität

> **Sicher, Einfach, Transparent.** Wer nicht weiss, was er heute tun soll,
> findet es hier. Wer etwas plant, bringt es hier zu Ende — ohne ein zweites
> Programm und ohne das Risiko, sein Geld zu verlieren.

Formuliert am 09.09.2026 nach der Vorgabe des Inhabers. Diese Notiz ist der
**Bauplan**, nicht der Stand: was schon läuft, ist als solches markiert.

---

## 1. Die eine Bewegung, die alles zusammenhält

Heute ist Eventbörse ein **Marktplatz für Dienstleister**. Man kommt her, wenn
man schon weiss, dass man einen DJ braucht. Das ist ein Zielgruppenproblem:
Hochzeiten plant man einmal, vielleicht zweimal im Leben.

Die Vision dreht den Einstieg um:

```
   ENTDECKEN            ENTSCHEIDEN           BUCHEN            ABSICHERN
   „Was ist heute   →   „Das mache ich"  →   ein Klick,    →   Geld fliesst
    in meiner Nähe?"                          ein Vertrag        bei Erfüllung
   ─────────────────────────────────────────────────────────────────────────
   kostet uns Geld,     hier entsteht         hier verdienen wir
   bringt Besucher      die Absicht           (3 % App Fee)
```

**Entdecken ist der Verkehr, Buchen ist der Umsatz.** Wer nur den Marktplatz
baut, wartet auf Menschen mit einem Anlass. Wer nur die Entdeckung baut, ist
ein Veranstaltungskalender ohne Geschäftsmodell. Der Wert liegt darin, dass
**beides dieselbe Oberfläche ist**: der Escape-Room am Samstag und die
Hochzeit im Juni laufen über dieselbe Buchung, dieselbe Absicherung, dasselbe
Konto.

Das ist auch das Argument gegen die Konkurrenz. Eventim verkauft Tickets,
Google zeigt Orte, Instagram zeigt Bilder. **Niemand begleitet einen Menschen
von „mir ist langweilig" bis „es hat stattgefunden und alle wurden bezahlt".**

---

## 2. Entdecken: was ist jetzt in meiner Nähe los

**Ziel:** Umkreis 50 km, heute/dieses Wochenende, alles was ein Erlebnis ist —
Escape-Room, Freibad, Kino, FC-Köln-Heimspiel, Open-Air, Stadtfest, Museum,
Kletterhalle, Konzert.

### Die Quellenfrage — und eine Korrektur zur Ausgangsidee

Die Vorgabe nannte **Facebook** und **Google Maps** als Quellen. Beide tragen
so nicht, und das muss vor dem Bauen feststehen:

| Quelle | Realität |
|---|---|
| **Facebook Events** | Meta hat die öffentliche Events-API **2018 abgeschaltet**. Es gibt keinen legalen Weg, öffentliche Veranstaltungen abzurufen. Scraping verstösst gegen die Nutzungsbedingungen, ist technisch fragil und wäre bei unserer Grösse ein vermeidbares Risiko. **Nicht verwenden.** |
| **Google Places** | Liefert **Orte, keine Termine**. Die Lizenz verbietet, die Daten zu speichern und daraus eine eigene Datenbank zu bauen. Als Anreicherung mit Quellenangabe brauchbar, als Bestand nicht. |
| **Google Events** | Keine öffentliche Schnittstelle. |

Das ist keine schlechte Nachricht, sondern eine bessere Landkarte. Es gibt
reichlich **saubere** Quellen, und die meisten sind kostenlos:

| Quelle | Was sie liefert | Lizenz |
|---|---|---|
| **OpenLigaDB** | Bundesliga-Spielpläne — genau der „FC Köln"-Fall | frei |
| **Ticketmaster Discovery API** | Konzerte, Shows, Sport; Deutschland abgedeckt | kostenlose Stufe |
| **Eventbrite API** | öffentliche Veranstaltungen | frei mit Konto |
| **OpenStreetMap / Overpass** | Orte: Kinos, Escape-Rooms, Stadien, Bäder, Kletterhallen | ODbL, Namensnennung |
| **Offene Daten der Städte** | Stadtfeste, Museen, Märkte (Köln, Bonn, Düsseldorf haben Portale) | meist CC-BY |
| **iCal-/RSS-Feeds der Häuser** | Theater, Kinos, Clubs veröffentlichen sie selbst | je Haus |
| **Partner direkt** | **die einzige Quelle, die Geld bringt** | Vertrag |

**Der Bestand ist der Köder, die Partner sind das Geschäft.** Ein
aggregierter Kinotermin verdient nichts — er bringt jemanden auf die Seite.
Der Escape-Room, der bei uns buchbar ist, verdient 3 %.

### Was uns von einem Veranstaltungskalender unterscheidet

Ein Kalender listet. Wir müssen **entscheiden helfen** — das ist der Teil, den
niemand kopieren kann, weil er auf unseren eigenen Daten beruht:

- **„Für heute Abend, zu zweit, unter 50 €, 20 Minuten entfernt."** Der
  Radar (`/aktuelles/radar`) und die natürlichsprachliche Suche sind bereits
  gebaut — sie brauchen nur den neuen Bestand.
- **Wetterabhängig.** Regen am Samstag → Freibad runter, Escape-Room hoch.
- **Aus dem Verhalten gelernt.** `eb_taste_v1` gibt es schon und ist als
  profilbildend deklariert (siehe `Cookie-Liste.md`) — die
  Datenschutzgrundlage steht bereits.
- **Der Sprung von Aktivität zu Planung.** „Das Stadtfest ist am 12. — willst
  du daraus etwas Eigenes machen?" führt in den Event-Planer.

---

## 3. Buchen: eine Plattform statt fünf Programme

Der heutige Stand kann mehr, als die Vision voraussetzt:

**Schon gebaut:** Inserate, Suche, Chat, Event-Planer-Board mit
Mehrfachzeiten, Stripe-Zahlung mit 3 % Provision, Bewertungen, Favoriten,
Radar mit Umkreis, KI-Assistent, Rechtsablage, 15 Pflichtseiten.

**Was zur „end-to-end"-Plattform fehlt:**

- **Verfügbarkeit in Echtzeit** statt Anfrage-und-Warten. Ohne sie bleibt
  jede Buchung ein Briefwechsel.
- **Ein Vertrag, den beide Seiten sehen.** Heute ist die Leistung eine
  Chat-Absprache. Ein Angebot mit Leistungsumfang, Zeit, Ort, Preis und
  Stornoregel — angenommen mit einem Klick — ist die Grundlage für alles,
  was danach kommt.
- **Die Aktivitäten-Buchung**, die anders funktioniert als die
  Dienstleister-Buchung: Kino und Escape-Room haben Kontingente, keine
  Angebote.
- **Ein Bündel.** „Junggesellenabschied Köln": Escape-Room + Restaurant +
  Übernachtung, ein Warenkorb, eine Zahlung, mehrere Empfänger. Stripe kann
  das (mehrere Transfers auf eine Zahlung) — es ist die stärkste Idee im
  ganzen Entwurf, weil es genau das ist, was heute fünf Programme braucht.

---

## 4. Absichern: der Kern des Vertrauens

Die Vorgabe: bei Buchung zahlen, bei Nichterfüllung anfechten können, bei
Erfüllung fliesst das Geld — und wir zeichnen als Partner auf.

**Das ist richtig gedacht, und es ist der schwierigste Teil.** Zwei Dinge sind
vor dem Bauen zu klären.

### 4.1 Treuhand ist in Deutschland erlaubnispflichtig

Wer fremdes Geld entgegennimmt und später weiterleitet, erbringt einen
**Zahlungsdienst** nach dem ZAG. Das braucht eine BaFin-Erlaubnis — Jahre,
Eigenkapital, laufende Aufsicht. Wer es ohne macht, betreibt ein unerlaubtes
Geschäft; das ist kein Formfehler, sondern strafbewehrt.

**Der gangbare Weg:** Stripe ist das lizenzierte Institut, nicht wir.
Stripe Connect kennt genau dieses Muster („separate charges and transfers"):

```
  Buchung        Kunde zahlt  ──►  Guthaben bei Stripe
                                    (Plattform-Konto, NICHT unser Bankkonto)
  Event findet statt
  Freigabe       ──────────────►  Transfer an den Dienstleister
                                    abzüglich 3 % + Zahlungsgebühr
  Streitfall     ──────────────►  Rückerstattung an den Kunden
```

Wir halten zu keinem Zeitpunkt Geld. **Das ist der Unterschied zwischen
zulässig und nicht zulässig, und er hängt an einer technischen Entscheidung.**

Heute läuft die Zahlung als **Destination Charge**: das Geld geht sofort an
den Dienstleister. Für die Absicherung muss der Transfer **abgekoppelt**
werden. Das ist ein überschaubarer Umbau — aber einer, der ohne
Rechtsberatung nicht live gehen darf. **Diese Beratung ist die erste
Ausgabe, die diese Vision erfordert.**

Kartenautorisierungen („manual capture") lösen es übrigens nicht: sie
verfallen nach etwa sieben Tagen. Eine Hochzeit wird acht Monate vorher
gebucht.

### 4.2 Smart Contracts lösen dieses Problem nicht

Die Idee dahinter ist richtig; die Technik dazu ist die falsche.

- **Das Geld sind Euro auf einem Bankkonto.** Eine Blockchain kann sie nicht
  bewegen. Wer sie in Kryptowerte tauscht, braucht MiCA-Erlaubnisse — mehr
  Aufsicht, nicht weniger.
- **Die entscheidende Tatsache steht nicht in der Kette.** „War der DJ da?"
  weiss nur die Wirklichkeit. Ein Vertrag auf der Kette bräuchte ein Orakel,
  und das Orakel wären wir. **Die Vertrauensannahme bleibt also genau
  dieselbe** — es kommt nur Komplexität dazu.

**Was Sie wirklich wollen, sind zwei Eigenschaften**, und beide gibt es ohne
Kette:

1. **Bedingte Auszahlung** → Stripe-Transfer nach Freigabe (oben).
2. **Ein Protokoll, das niemand nachträglich ändern kann** → eine
   **verkettete Prüfsumme**: jeder Eintrag enthält den Hash des vorherigen.
   Wer einen Eintrag ändert, bricht die Kette sichtbar. Das ist die
   Fälschungssicherheit der Blockchain, ohne Blockchain — und es passt zum
   bestehenden Journal.

### 4.3 Der Streitfall, konkret

| Schritt | Regel |
|---|---|
| Nach dem Termin | beide bestätigen. Beide ja → sofort Auszahlung. |
| Keine Reaktion | nach **7 Tagen** automatische Freigabe. Ohne Frist bliebe Geld ewig liegen. |
| Kunde widerspricht | Frist läuft nicht weiter; beide reichen Belege ein. |
| Belege | Vertragsfassung, Chatverlauf, Check-in (Zeit + Ort), Fotos — alles bereits vorhanden oder leicht ergänzbar. |
| Entscheidung | durch uns, **begründet und protokolliert**. |

Als Online-Plattform sind wir dabei ohnehin gebunden: **DSA Art. 20** verlangt
ein internes Beschwerdemanagement, **Art. 21** den Zugang zu einer
aussergerichtlichen Streitbeilegung. Was hier als Produktmerkmal steht, ist
zur Hälfte gesetzliche Pflicht — das spricht dafür, es gut zu machen.

---

## 5. Verdienen: 3 %, und was dabei ehrlich gesagt werden muss

**Die Provision existiert bereits** (`EB_PLATFORM_FEE_RATE`, Standard 0.03) und
läuft als `application_fee_amount` auf der Stripe-Zahlung.

### Ein Befund, der vor der Umsetzung zu klären ist

Die Vorgabe lautet: *„Dienstleister kriegen bei Angaben von Preisen dann
gesagt — 3 % App Fee."* Der Code rechnet aber (`eb_stripe_calculate_fee_quote`):

```
Application Fee = 3 % Provision + geschätzte Stripe-Gebühr
Auszahlung      = Bruttobetrag − Application Fee
```

Der Dienstleister trägt also **beides**. Bei 1 000 € sind das nicht 30 €,
sondern rund **30 € + 15 € + 0,25 €**. Steht in der Maske „3 % App Fee" und
auf der Abrechnung ein anderer Betrag, ist die erste Erfahrung mit unserer
Transparenz eine Enttäuschung — bei einem Versprechen, das „Transparent"
heisst, ist das der teuerste Ort für eine Ungenauigkeit.

**Zwei saubere Auswege**, beide vertretbar:

- **Beides nennen:** „3 % Eventbörse + ~1,5 % Zahlungsgebühr → Sie erhalten
  954,75 €." Ehrlich und erklärt, warum.
- **Die Zahlungsgebühr übernehmen:** dann stimmt „3 %" wörtlich, und die
  Marge sinkt auf ~1,5 %. Eine Preisentscheidung, keine technische.

Was nicht geht, ist „3 %" zu sagen und 4,5 % abzuziehen.

### Partner, Nicht-Partner, Premium — mit einer Auflage

Die Idee (Partner weiter oben, Nicht-Partner im Bestand, Premium
verkaufbar) ist tragfähig und üblich. Sie hat eine gesetzliche Auflage:

- **DSA Art. 26/27** und die **P2B-Verordnung Art. 5** verlangen, dass die
  **Hauptparameter des Rankings offengelegt** werden — und ausdrücklich, ob
  und wie **Bezahlung die Platzierung beeinflusst**.
- Bezahlte Platzierung muss als **Werbung erkennbar** sein.

Das ist kein Hindernis, sondern das Versprechen „Transparent" in Gesetzesform.
Ein sichtbares „Anzeige" und eine Seite „Wie wir sortieren" erfüllen es.

**Nicht verhandelbar:** Bewertungen dürfen sich nicht kaufen lassen. Ein
Marktplatz, dem man das einmal nachweist, verliert die Grundlage, auf der alles
andere steht.

---

## 6. Reihenfolge

Gebaut wird nach **Risiko**, nicht nach Reiz. Jede Stufe ist für sich nützlich.

| | | Warum zuerst |
|---|---|---|
| **1** | **Rechtsberatung Treuhand** (ZAG/Stripe-Modell) | Alles unter 4. hängt daran. Eine Woche Klarheit spart ein Jahr Rückbau. |
| **2** | **Gebührenanzeige ehrlich machen** | Kleiner Eingriff, betrifft jeden Dienstleister, und der Fehler wächst mit dem Umsatz. |
| **3** | ~~**Aktivitäten-Bestand, eine Quelle** — OpenLigaDB + OSM für Köln~~ **gebaut 09.09.2026** | Beweist die Entdeckung an echten Daten, ohne Vertrag und ohne Kosten. |
| **4** | **Angebot als Vertrag** (Umfang, Zeit, Preis, Storno) | Vorbedingung für Absicherung *und* für Bündel. |
| **5** | **Bedingte Auszahlung + Streitfall** | Der eigentliche Burggraben. |
| **6** | **Verkettetes Protokoll** | Macht die Aufzeichnung überprüfbar statt behauptet. |
| **7** | **Bündel-Buchung** | Das Merkmal, das fünf Programme ersetzt. |
| **8** | **Weitere Quellen, Partner-Aufnahme, Premium** | Skalierung — erst wenn 1–7 tragen. |

### 6.1 Schritt 3, gebaut am 09.09.2026

`scripts/aktivitaeten.mjs` → `assets/eb-aktivitaeten.json`, zwei Quellen für
50 km um Köln: **OpenLigaDB** (Heimspiele 1. FC Köln) und
**OpenStreetMap/Overpass** (Kino, Escape-Room, Kletterhalle, Erlebnisbad,
Museum, Zoo, Theater). Beide frei, beide ohne Vertrag, beide ohne Schlüssel.
21 Tests, zehn Mutationen rot. Die Datei ist öffentlich ausgeliefert.

**Was der Schritt ausdrücklich noch nicht ist:** eine Ansicht. Der Bestand
liegt als Datei vor und ist abrufbar; die Oberfläche „was ist gerade in
meiner Nähe los" baut darauf auf und ist der nächste Schritt. Diese Trennung
ist Absicht — eine Ansicht über einem Bestand, der sich noch ändert, wird
zweimal gebaut.

**Der erste echte Abruf steht noch aus.** Die ausgelieferte Datei trägt
`stand: null` — *nie abgerufen*, nicht *nichts gefunden*. Gefüllt wird sie
vom nächsten Lauf der Tagesroutine (03:17 UTC), weil nur dort Netzzugang zu
den beiden APIs besteht. Bis dahin ist der Bestand leer, und das steht auch
so darin.

**Zwei Eigenschaften der Quellen, die den Ausbau bestimmen:** OpenLigaDB
liefert **17 Heimspiele pro Saison** — verlässlich, aber dünn. Der Bestand
lebt von den OSM-Orten, und die haben *keinen Termin*. Für „was ist **jetzt**
los" fehlt damit weiter eine Quelle mit Veranstaltungsterminen; die
Kandidaten stehen in Abschnitt 2 (städtische Open-Data-Portale, iCal/RSS der
Veranstalter, Ticketmaster). Das ist Schritt 8, nicht Schritt 3.

---

## 7. Was diese Vision gefährdet

Ehrlich benannt, damit es niemand später herleiten muss:

- **Der Bestand ohne Partner ist ein Kalender.** Wenn Schritt 3 Besucher
  bringt, aber niemand bucht, haben wir Kosten und keinen Umsatz. Messbar
  machen, bevor ausgebaut wird.
- **Treuhand ohne Erlaubnis ist kein Formfehler.** Siehe 4.1.
- **Fremde Datenquellen brechen.** Jede API kann morgen schliessen — genau
  das ist Facebook 2018 passiert. Kein Kernmerkmal darf an einer einzelnen
  fremden Quelle hängen.
- **Der Streitfall kostet Menschen.** Er lässt sich nicht automatisieren, und
  er wird bei jedem Wachstumsschritt teurer. Früh die Regeln festlegen, sonst
  entscheidet jeder Fall anders.
- **DSA-Pflichten wachsen mit der Grösse.** Ab 45 Mio. Nutzern in der EU
  gelten die scharfen Regeln — davon sind wir weit entfernt, aber die
  Grundpflichten (Beschwerde, Ranking-Transparenz, Händlerangaben) gelten
  **ab dem ersten Tag**.

---

## Verwandte Notizen

- `vault/40-Governance/Legal/App-Store.md` — Apple-Seite, Händlerstatus
- `vault/40-Governance/Legal/Rechtliche-Lage.md` — was gemessen wird
- `vault/50-Evolution/Roadmap/Current-Sprint.md` — was gerade gebaut wird
- `vault/30-Betrieb/Cowork-Auftraege.md` — was Cowork abarbeiten kann
