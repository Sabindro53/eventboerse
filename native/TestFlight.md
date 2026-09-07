# TestFlight — der Weg zum Kollegen

Ziel: eine Fassung, die ein Kollege auf seinem iPhone installieren und benutzen
kann. Nicht die öffentliche Listung — die kommt danach und hat andere Hürden.

---

## Die eine Entscheidung, die alles verkürzt: intern oder extern

Apple kennt zwei Sorten Tester, und der Unterschied ist der ganze Zeitplan.

| | **Intern** | **Extern** |
|---|---|---|
| Wie viele | bis 100 | bis 10 000 |
| Was der Tester braucht | einen **App-Store-Connect-Zugang** in Ihrem Team (Rolle: Admin, App Manager, Developer oder Marketing) | nur eine E-Mail-Adresse |
| **Beta App Review** | **nein** | **ja**, beim ersten Build je Version |
| Prüfkonten nötig | nein | ja |
| 4.2-Begründung nötig | nein | ja |

**Für einen Kollegen ist „intern" der richtige Weg.** Sie laden ihn einmal als
Benutzer in App Store Connect ein, dann kann er jeden hochgeladenen Build
sofort installieren — ohne Review, ohne Wartezeit, ohne dass die Prüfkonten
oder die Guideline-4.2-Argumentation schon fertig sein müssen.

Der externe Weg ist erst dann nötig, wenn Menschen außerhalb Ihres Teams
testen sollen. Dann greift die Beta App Review, und dafür braucht es dieselben
Unterlagen wie für die Einreichung: zwei Prüfkonten mit Inhalt und die
Begründung, warum die App mehr ist als eine Website-Hülle
(siehe `README.md`).

---

## Der Händlerstatus blockiert hier nichts

Bis zum 06.09.2026 stand in unseren Unterlagen, der Händlerstatus nach DSA
Art. 30/31 sei „Pflicht für jede App im EU-App-Store, ohne ihn keine
Listung" — und er führte die Startreihenfolge an. Für die **Listung** stimmt
das. Als Vorbedingung für TestFlight stimmt es nicht. Apple:

> *„If you don't distribute apps on the App Store in the EU (for example you
> only distribute apps through alternative distribution, or TestFlight, or on
> the App Store only outside the EU), you're not acting as a trader on the App
> Store."*

**Erklären** muss man den Status trotzdem immer — *„Even if you don't
distribute apps in the EU, you'll still need to declare a trader status."* Die
**Verifikation** (Postfach, Telefon, E-Mail, je mit zweitem Faktor) hängt an
der öffentlichen EU-Listung und läuft parallel zum Testen.

Quelle: [App Store Connect Help — EU DSA trader requirements](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/)

---

## Reihenfolge

### Vorher, im Entwicklerkonto (kein Mac nötig)

**Am 06.09.2026 erledigt** — Kennungen stehen in
[`vault/40-Governance/Legal/App-Store.md`](../vault/40-Governance/Legal/App-Store.md):

- ~~Program License Agreement~~
- ~~**App-ID** `de.eventboerse.app`, Capabilities **Push Notifications** und
  **Associated Domains**~~ (In-App Purchase setzt Apple bei jeder neuen App-ID
  selbst dazu — ausgegraut, nicht abwählbar, ungenutzt und unschädlich)
- ~~**App-Eintrag** in App Store Connect~~ — Apple-ID **6809211333**
- ~~Store-Metadaten~~ — Support-URL `…/contact`, **nicht** `/kontakt`; die
  deutsche Schreibweise gibt es im Router nicht, und eine Support-URL auf eine
  404 ist ein Ablehnungsgrund

**Noch offen:**

1. **APNs-Schlüssel** erzeugen (.p8, lädt sich **genau einmal** herunter).
2. **Händlerstatus erklären** — Angabe genügt, Verifikation kann warten.
3. **Den Kollegen einladen**: App Store Connect → Users and Access →
   Einladung mit Rolle *Developer* oder *App Manager*. Er muss sie annehmen,
   sonst taucht er unter „Internal Testing" nicht auf.

**Alle drei sind Browser-Arbeit im Apple-Konto** und damit Cowork-Aufträge —
ausformuliert samt Grenzen (kein Geheimnis durch den Chat, keine erfundenen
Rechtsangaben, nichts Unwiderrufliches ohne Rückfrage) in
[`vault/30-Betrieb/Cowork-Auftraege.md`](../vault/30-Betrieb/Cowork-Auftraege.md).

**Die Altersfreigabe ist 16+, nicht 17+.** Die Stufe 17+ gibt es seit Apples
Umstellung 2025 nicht mehr; das Raster lautet 4+, 9+, 13+, 16+, 18+. Für uns
greift **16+**, weil `limitsNavigationsToAppBoundDomains: false` in
`capacitor.config.json` steht und Apple das als *unrestricted web access*
führt. Begründung und Quellen: derselbe Vault-Abschnitt.

**Parallel ausfüllbar, blockiert hier nichts:** die beiden Fragebögen in App
Store Connect — **App Privacy** (zehn Datenarten, je drei Fragen) und
**Altersfreigabe** (rund zwanzig Fragen). Beide Antwortsätze stehen fertig im
Vault, jeder am Code belegt:
[`App-Store.md`](../vault/40-Governance/Legal/App-Store.md) — Abschnitte
„Erhobene Daten" und „Der Fragebogen, Zeile für Zeile".

**Die Stufe ist das Ergebnis, nicht die Eingabe.** Wer nur „16+" weiß und die
zwanzig Einzelfragen aus dem Kopf beantwortet, rät zwanzigmal. Zwei Antworten
sind dabei nicht offensichtlich: Alkoholbezüge gibt es (*Cocktail-Bar*,
*Bier-Zapfanlage* in der Merkmalsliste), und eine Alterskontrolle gibt es
**nicht** — die 18 Jahre aus den AGB sind eine Klausel, kein Feld im
Registrierungsformular.

### Auf dem Mac

```bash
git pull
./native/ios-einrichten.sh
```

Das Skript installiert Capacitor, legt `ios/` an, übernimmt Privacy-Manifest
und Entitlements, trägt die Zwecktexte ein, schreibt die englischen Fassungen —
und **liest am Ende aus der erzeugten `Info.plist` zurück**, was wirklich
darin steht. Es meldet nicht „fertig", es zeigt den Stand.

Danach in Xcode die fünf Handgriffe, die das Skript am Ende nennt (Team,
Push-Capability, Associated Domains, Entitlements verknüpfen, `en.lproj`
hinzufügen), dann:

```bash
npx cap sync ios
open ios/App/App.xcworkspace
```

In Xcode: **Product → Archive → Distribute App → TestFlight**.

### Danach in App Store Connect

TestFlight → **Internal Testing** → Gruppe anlegen → den Kollegen hinzufügen →
Build zuweisen. Er bekommt eine Einladung und installiert über die
TestFlight-App. **Keine Review dazwischen.**

---

## Was beim Testen auffallen wird — und kein Fehler ist

- **Die App lädt die Website** (`server.url` in `capacitor.config.json`). Kein
  Offline-Betrieb. Der Grund steht in `README.md`: die REST-API authentifiziert
  über WordPress-Cookie plus `X-WP-Nonce`; ein gebündeltes Frontend liefe
  cross-site und bräuchte ein zweites Anmeldeverfahren für alle 106 Routen.
- **Die Zahlung geht bis zur echten Karte.** `EB_STRIPE_MODE` schaltet global,
  nicht je Konto. Zum Durchspielen vorher auf `test` stellen und die Testkarte
  `4242 4242 4242 4242` benutzen — dann nimmt die Seite aber von **niemandem**
  Geld an, also nur kurz und bewusst.
- **Passkeys brauchen die Associated Domains.** Fehlt `webcredentials:` in den
  Entitlements, bietet iOS den gespeicherten Passkey der Domain nicht an, und
  die Anmeldung wirkt kaputt. Die Zuordnungsdatei auf dem Server liefert seit
  dem 04.09.2026 `200 application/json`.
- **Push kommt erst mit dem APNs-Schlüssel.** Ohne ihn ist die Capability da
  und es passiert nichts.

## Was noch fehlt, bevor es öffentlich gehen kann

Nichts davon blockiert TestFlight-Tests mit dem Kollegen:

- Zwei Prüfkonten mit Inhalt (Guideline 2.1) — siehe `README.md`
- Guideline-4.2-Funktionen: Push, Kamera, Passkeys, Standort
- Händlerstatus **verifiziert**, nicht nur erklärt
- Verifizierte Angaben erscheinen öffentlich auf der Produktseite → Postfach
