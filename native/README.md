# Die App für den App Store

Stand 02.09.2026. Diese Mappe enthält alles, was **ohne macOS** entstehen
kann. Das Xcode-Projekt selbst erzeugt `npx cap add ios`, und das läuft nur
auf einem Mac — deshalb liegt es nicht im Repo.

---

## Die wichtigste Korrektur zuerst: Apple will hier keine Provision

Der Ausgangsgedanke war, die Zahlung in den Browser umzuleiten, damit Apple
keine 30 % auf In-App-Käufe nimmt. **Das ist bei diesem Geschäft nicht nötig
und der riskantere Weg.** Guideline 3.1.3(e), im Wortlaut:

> *„If your app enables people to purchase physical goods or services that
> will be consumed **outside of the app**, you must use purchase methods
> other than in-app purchase to collect those payments, such as Apple Pay or
> traditional credit card entry."*

Einen DJ, ein Catering oder eine Location zu buchen ist genau das: eine
Leistung, die außerhalb der App erbracht wird. Für solche Apps ist In-App-Kauf
nicht bloß unnötig, sondern **verboten**. Apple nimmt **0 %**.

Umgekehrt verbietet Guideline 3.1.1(a) außerhalb des US-Storefronts Knöpfe und
Links, die auf externe Zahlwege führen — das gilt für Apps, die IAP benutzen
*müssen*, und ist genau der Bereich, in dem eine Browser-Umleitung Ärger macht.

**Also: Stripe direkt in der App, so wie im Web.** Keine Sonderbehandlung,
kein zweiter Zahlungspfad, keine Provision.

> PR #46 enthält eine ausgebaute Browser-Umleitung auf der alten Annahme. Sie
> gehört auf diesen Stand gebracht oder geschlossen, bevor sie gemergt wird.

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

- `Info.plist`: `NSLocationWhenInUseUsageDescription`,
  `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription` — jeweils mit
  einem Satz, der den Zweck nennt. Apple lehnt leere oder nichtssagende
  Begründungen ab.
- Push-Capability + APNs-Schlüssel.
- Associated Domains für Passkeys: `webcredentials:xn--eventbrse-57a.de`.
  Dazu muss `/.well-known/apple-app-site-association` ausgeliefert werden —
  **das ist eine Server-Aufgabe und noch offen.**

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
