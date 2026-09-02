# Die App für den App Store

Stand 02.09.2026. Diese Mappe enthält alles, was **ohne macOS** entstehen
kann. Das Xcode-Projekt selbst erzeugt `npx cap add ios`, und das läuft nur
auf einem Mac — deshalb liegt es nicht im Repo.

---

## Die wichtigste Korrektur zuerst: Apple will hier keine Provision

Der Ausgangsgedanke war, die Zahlung in den Browser umzuleiten, damit Apple
keine 30 % auf In-App-Käufe nimmt. **Bei diesem Geschäft ist das gegenstandslos:
Apple nimmt ohnehin nichts.** Guideline 3.1.3(e), im Wortlaut:

> *„If your app enables people to purchase physical goods or services that
> will be consumed **outside of the app**, you must use purchase methods
> other than in-app purchase to collect those payments, such as Apple Pay or
> traditional credit card entry."*

Einen DJ, ein Catering oder eine Location zu buchen ist genau das: eine
Leistung, die außerhalb der App erbracht wird. Für solche Apps ist In-App-Kauf
nicht bloß unnötig, sondern **verboten**. Apple nimmt **0 %**.

### Die Browser-Umleitung ist nicht verboten — sie ist zwecklos

Hier stand bis zum 02.09.2026, Guideline 3.1.1(a) verbiete außerhalb des
US-Storefronts Verweise auf externe Zahlwege, und die Umleitung sei deshalb der
riskantere Weg. **Das war zu stark.** Die Verbote in 3.1.1 gelten Apps mit
**digitalen Inhalten**, die IAP benutzen müssen:

> *„In all other storefronts, except for the United States storefront, …
> apps and their metadata may not include buttons, external links, or other
> calls to action that direct customers to purchasing mechanisms other than
> in-app purchase."*

Ein Marktplatz für reale Leistungen fällt unter 3.1.3(e) und liegt damit
vollständig außerhalb dieses Regelwerks. Eine Umleitung wäre erlaubt.

Sie brächte nur nichts. **Es gibt nichts, worum herumzuleiten wäre:** Apple ist
schon draußen, in der App wie im Browser. Und die Plattformprovision hängt
nicht an Apple, sondern an Stripe — sie ist eine `application_fee_amount` auf
einer Destination-Charge, die Stripe vom Zahlbetrag abzieht und weiterleitet.
Auf beiden Wegen identisch. Apple sieht dieses Geld nie.

Was die Umleitung sehr wohl kostet: den Kunden mitten in der Buchung aus der
App in Safari zu werfen, an genau der Stelle, an der Geld fließt.

**Also: Stripe direkt in der App, so wie im Web.** Keine Sonderbehandlung,
kein zweiter Zahlungspfad.

> PR #46 enthält eine ausgebaute Browser-Umleitung auf der Annahme, Apple wolle
> hier mitverdienen. Er ist damit gegenstandslos — nicht gefährlich, nur ohne
> Nutzen. Schließen oder auf diesen Stand bringen.

---

## Warum die App die Website lädt und sie nicht mitbringt

`capacitor.config.json` setzt `server.url` auf die Live-Domain. Der Grund ist
nicht Bequemlichkeit, sondern die **Anmeldung**.

Die REST-API authentifiziert über das WordPress-Cookie plus `X-WP-Nonce`
(`_apiHeaders()` in `js/modules/core/`). Ein Capacitor-Bundle läuft unter der
Herkunft `capacitor://localhost`. Von dort ist jede Anfrage an
eventbörse.de **cross-site**: das Sitzungscookie wird nicht mitgeschickt, und
der Nonce, den `index.php` in die Seite schreibt, existiert gar nicht.

Ein mitgeliefertes Bundle bräuchte deshalb ein zweites Authentifizierungs­
verfahren im Backend — Token statt Cookie, für **alle 106 Routen**, parallel
zum bestehenden. Zwei Wege in dieselbe Anwendung hinein sind genau die Sorte
Angriffsfläche, die man sich nicht ohne Not baut, und der Umbau wäre größer
als die App.

Mit `server.url` lädt der WebView dieselbe Herkunft wie Safari. Cookies,
Nonces, Passkeys, Stripe — alles verhält sich unverändert.

**Was das kostet, ehrlich benannt:**

| | |
|---|---|
| Kein Offline-Betrieb | ohne Netz zeigt die App nichts |
| Guideline 4.2 | eine reine Website-Hülle wird abgelehnt (siehe unten) |
| Änderungen sofort live | Vorteil und Risiko: kein App-Store-Review als Bremse |

Der fehlende Offline-Betrieb ist bei einem Marktplatz vertretbar — Inserate,
Nachrichten und Buchungen sind ohnehin serverseitig.

---

## Guideline 4.2: warum das keine „Website in einem Rahmen" ist

Apple lehnt Apps ab, die nichts können, was der Browser nicht auch kann. Das
ist der wahrscheinlichste Ablehnungsgrund für diesen Aufbau, und er wird nicht
durch Argumente ausgeräumt, sondern durch Funktionen. Diese vier sind hier
nicht Kosmetik, sondern lösen echte Probleme:

1. **Push-Benachrichtigungen** — eine Buchungsanfrage muss den Dienstleister
   erreichen, wenn die App zu ist. Im Web gibt es dafür nichts Verlässliches:
   Safari liefert Web-Push nur an zum Homescreen hinzugefügte Seiten.
2. **Kamera** — ein Inserat entsteht mit Fotos. Direkt aufnehmen statt über
   den Datei-Dialog.
3. **Passkeys / Face ID** — `webauthn.php` ist da und funktioniert; nativ wird
   daraus eine biometrische Anmeldung.
4. **Standort** — der Radar. Nativ mit klarer Berechtigungsfrage statt der
   Browser-Abfrage.

**Ohne mindestens diese vier gar nicht erst einreichen.**

---

## Was noch fehlt (nur auf einem Mac zu machen)

```bash
npm i @capacitor/core @capacitor/cli @capacitor/ios
npx cap init                     # Werte aus capacitor.config.json übernehmen
npx cap add ios
cp native/PrivacyInfo.xcprivacy ios/App/App/PrivacyInfo.xcprivacy
```

Danach in Xcode:

- `Info.plist`: die Zwecktexte. Fertig formuliert in
  [`Info.plist-zwecktexte.md`](Info.plist-zwecktexte.md) — übernehmen, nicht
  neu erfinden. Apple lehnt leere oder nichtssagende Begründungen ab.
- Push-Capability + APNs-Schlüssel.
- Associated Domains: `webcredentials:xn--eventbrse-57a.de` und
  `applinks:xn--eventbrse-57a.de`.

## Die Serverseite der Passkeys ist fertig

`/.well-known/apple-app-site-association` wird ausgeliefert (`functions.php`,
`eb_apple_zuordnung_ausliefern`). **Es fehlt nur noch die Team-ID.**

Sobald das Entwicklerkonto steht, in `wp-config.php`:

```php
define( 'EB_APPLE_TEAM_ID', 'XXXXXXXXXX' );   // 10 Zeichen, aus App Store Connect
```

Vorher liefert die Route bewusst **404**. Eine Zuordnung mit Platzhalter wäre
schlimmer als keine: Apple holt die Datei einmal beim Installieren ab und merkt
sich das Ergebnis — der Fehler fiele erst beim Nutzer auf, und dann ist er
schon zwischengespeichert.

Danach prüfen (muss `application/json` liefern, ohne Weiterleitung):

```bash
curl -sSI https://xn--eventbrse-57a.de/.well-known/apple-app-site-association
```

---

## Für App Store Connect

Die Datenangaben stehen in
[`vault/40-Governance/Legal/App-Store.md`](../vault/40-Governance/Legal/App-Store.md),
jede einzeln am Code belegt. Sie müssen mit `PrivacyInfo.xcprivacy` in dieser
Mappe **übereinstimmen** — Apple prüft beides gegeneinander.

Bereits erfüllt, ohne dass etwas zu tun wäre:

- **5.1.1(v) Kontolöschung in der App** — `/settings/delete-account`, Knopf in
  den Einstellungen. Ohne das gibt es keine Freigabe.
- **Datenschutzerklärung, Impressum, AGB** — 15 Pflichtseiten, alle erreichbar
  (`node scripts/recht.mjs --check`).
