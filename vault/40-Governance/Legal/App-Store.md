---
tags: [layer/L4, domain/governance, share/internal]
layer: L4
domain: governance
share: internal
---

# App Store: Datenangaben und Freigabe-Hürden

Stand 02.09.2026. Grundlage für die Angaben in App Store Connect und für
`native/PrivacyInfo.xcprivacy`. **Beide müssen übereinstimmen** — Apple prüft
sie gegeneinander, und ein Widerspruch führt zur Ablehnung.

Jede Zeile hier ist am Code belegt. Eine Datenart anzugeben, die nicht erhoben
wird, ist so falsch wie eine wegzulassen.

## Registrierte Kennungen

Angelegt am 06.09.2026. Hier, damit niemand sie erneut herleitet oder rät —
eine Kennung, die man sucht statt nachschlägt, wird irgendwann falsch geraten.

| | |
|---|---|
| Team-ID | `8FSV5273YG` (auch als GitHub-Secret `EB_APPLE_TEAM_ID`) |
| Bundle-ID | `de.eventboerse.app` |
| **Apple-ID der App** | **6809211333** |
| SKU | `eventboerse-ios-001` |
| Name im Store | Eventbörse (war frei) |
| Primärsprache | Deutsch |
| Kategorien | Wirtschaft / Lifestyle |
| Support-URL | `…/contact` |
| Copyright | 2026 Sandro Salvaggio |

**Capabilities auf der App-ID:** Associated Domains, Push Notifications.

**In-App Purchase steht ebenfalls aktiv** — das setzt Apple bei **jeder** neuen
App-ID selbst, ausgegraut und nicht abwählbar. Benutzt wird es nicht (3.1.3(e),
siehe unten), und eine aktivierte, ungenutzte Fähigkeit ist unschädlich. Wer
das später sieht und für einen Fehler hält, sucht an der falschen Stelle.

**Die Support-URL heißt `/contact`, nicht `/kontakt`.** Die deutsche
Schreibweise gibt es im Router nicht (`functions.php`, Slug-Liste). Eine
Support-URL auf eine 404 ist ein Ablehnungsgrund — und sie fällt niemandem
auf, weil sie im Store steht und nicht in der App.

## Provision: keine

Guideline **3.1.3(e)**, im Wortlaut:

> *„If your app enables people to purchase physical goods or services that will
> be consumed outside of the app, you must use purchase methods other than
> in-app purchase to collect those payments."*

Eine gebuchte Leistung — DJ, Catering, Location — wird außerhalb der App
erbracht. In-App-Kauf ist hier **verboten**, nicht bloß entbehrlich. Apple
nimmt **0 %**. Stripe läuft in der App genauso wie im Web.

**Die Browser-Umleitung ist erlaubt und trotzdem falsch.** Hier stand bis zum
02.09.2026, Guideline **3.1.1(a)** verbiete sie außerhalb des US-Storefronts.
Das war zu stark: die Verbote in 3.1.1 gelten Apps mit **digitalen Inhalten**,
die IAP benutzen müssen. Wir fallen unter 3.1.3(e) und liegen außerhalb dieses
Regelwerks.

Der Einwand ist also kein regulatorischer, sondern ein geschäftlicher. **Es
gibt nichts, worum herumzuleiten wäre:** Apple nimmt bei realen Leistungen 0 %,
auf beiden Wegen. Und die Plattformprovision hängt nicht an Apple, sondern an
Stripe — `application_fee_amount` auf einer Destination-Charge, die Stripe vom
Zahlbetrag abzieht und weiterleitet (`functions.php`, `eb_stripe_fee_quote`).
In der App identisch mit dem Browser; Apple sieht dieses Geld nie.

Was die Umleitung kostet: den Kunden mitten in der Buchung aus der App zu
werfen, an genau der Stelle, an der Geld fließt.

## Erhobene Daten — Zuordnung zum Code

Die Spalte **Kennung** ist der Wert, der wörtlich in
`native/PrivacyInfo.xcprivacy` steht. Sie ist nicht Zierde: `app-store.spec.js`
vergleicht diese Tabelle mit dem Manifest und bricht ab, sobald eine Seite eine
Datenart führt, die der anderen fehlt. Ohne eine maschinell vergleichbare
Kennung wären es zwei gepflegte Listen derselben Sache — und die driften immer.

| Apple-Datenart | Kennung | Was | Beleg im Code | Verknüpft | Zweck |
|---|---|---|---|---|---|
| Name | `NSPrivacyCollectedDataTypeName` | Vor-/Nachname, Firma | Profilfelder `company`, `company_name` | ja | Funktion |
| E-Mail-Adresse | `NSPrivacyCollectedDataTypeEmailAddress` | Anmeldung, Benachrichtigung | Registrierung | ja | Funktion |
| Telefonnummer | `NSPrivacyCollectedDataTypePhoneNumber` | Kontakt für Buchungen | Profilfeld `phone` | ja | Funktion |
| Physische Adresse | `NSPrivacyCollectedDataTypePhysicalAddress` | Rechnungs-/Leistungsort | Profilfeld `address`, `vat_id` | ja | Funktion |
| **Genauer Standort** | `NSPrivacyCollectedDataTypePreciseLocation` | Umkreissuche | `search/13-event-radar.js`, `getCurrentPosition`; Schlüssel `eb_radar_ort` | ja | Funktion |
| Fotos | `NSPrivacyCollectedDataTypePhotosorVideos` | Inseratsbilder | `POST /upload` → `wp_handle_upload` | ja | Funktion |
| Sonstige Nutzerinhalte | `NSPrivacyCollectedDataTypeOtherUserContent` | Nachrichten, Beiträge, Kommentare, Bewertungen | Messaging-/Reviews-Routen | ja | Funktion |
| Kaufverlauf | `NSPrivacyCollectedDataTypePurchaseHistory` | gebuchte Leistungen | `eb_payment_ledger` | ja | Funktion |
| Nutzer-ID | `NSPrivacyCollectedDataTypeUserID` | Kontobezug | WordPress-Nutzer-ID | ja | Funktion |
| **Produktinteraktion** | `NSPrivacyCollectedDataTypeProductInteraction` | abgeleitetes Präferenzprofil | Schlüssel `eb_taste_v1`, in `Cookie-Liste.md` als *profilbildend* geführt | ja | **Personalisierung** + Funktion |

**Kartendaten stehen bewusst nicht in der Tabelle.** Sie erreichen unseren
Server nie — Stripe erhebt sie direkt im Payment Element. In App Store Connect
gehören sie folglich nicht zu *unseren* erhobenen Daten. Das ist eine Aussage
über den Datenfluss, nicht über die Zuständigkeit: verantwortlich im Sinne der
DSGVO bleiben wir, und Stripe steht in der Datenschutzerklärung.

**`eb_taste_v1` ist der heikelste Eintrag.** Es wäre bequem, ihn unter
„App-Funktionalität" zu führen. Richtig ist **Personalisierung**: das Profil
wird aus Such- und Klickverhalten *abgeleitet*, und genau diese Einstufung
entscheidet, ob die Apple-Angabe zur eigenen Datenschutzerklärung passt. Wer
hier abrundet, erzeugt einen Widerspruch, den Apple findet.

## Kein Tracking

`NSPrivacyTracking` steht auf `false`. Das ist eine Tatsache über den Code,
keine Absichtserklärung: kein Werbe-SDK, kein IDFA, kein Fremd-Analytics. Die
einzigen Drittempfänger sind Stripe und der Kartendienst — beide in der
Datenschutzerklärung, beide von `scripts/recht.mjs` überwacht.

Stünde hier `true`, verlangte iOS zusätzlich den
App-Tracking-Transparency-Dialog.

## Erfüllte Freigabe-Hürden

| Richtlinie | Verlangt | Stand |
|---|---|---|
| **5.1.1(v)** | Kontolöschung **in der App** | ✅ `/settings/delete-account`, Knopf in den Einstellungen |
| **3.1.3(e)** | Kein IAP für externe Leistungen | ✅ Stripe, 0 % |
| **5.1.1** | Datenschutzerklärung erreichbar | ✅ 15 Pflichtseiten, `recht.mjs --check` |
| Privacy-Manifest | seit 2024 Pflicht | ✅ `native/PrivacyInfo.xcprivacy` |
| **ITMS-91053** | Begründung für UserDefaults | ✅ `CA92.1` im Manifest |

## Altersfreigabe: 16+, und der Grund steht in einer Konfigurationszeile

**Die Stufe 17+ gibt es nicht mehr.** Apple hat das Raster 2025 umgestellt;
heute gilt **4+, 9+, 13+, 16+, 18+**. Eine Einschätzung „17+" rechnet nach dem
alten System — die Zahl lässt sich im Fragebogen gar nicht mehr auswählen.

Nach Apples eigenen Definitionen:

> **Unrestricted Web Access:** Users can navigate to any webpage within the app
> or freely browse the web. *May include: embedded browser functionality or
> browser app.*

Das steht **nur in der Stufe 16+**. Und es trifft auf uns zu, aus einem Grund,
der in `native/capacitor.config.json` steht:

```json
"limitsNavigationsToAppBoundDomains": false
```

Die App lädt die Website in einem WebView und beschränkt die Navigation
**nicht** auf die eigene Domain. Damit ist „unrestricted web access" keine
Auslegungsfrage, sondern die Beschreibung unserer Konfiguration.

**Das ist eine bewusste Einstellung, keine Nachlässigkeit.** Auf `true`
gesetzt würde WKWebView die Navigation auf die in `WKAppBoundDomains`
gelisteten Hosts begrenzen — und damit die Stripe-Weiterleitung und jeden
externen Link brechen. Der Preis dafür ist die Stufe 16+.

Der Feed („Aktuelles") erfüllt zusätzlich **Social Media** — „redistribution,
amplification, or interaction with user-generated content through a social
feed" — was für sich genommen 13+ ergäbe. 16+ ist die höhere und damit die
maßgebliche Stufe.

**16+ ist die ehrliche Einstufung, keine Panne.** Wer sie drücken will, muss
die Konfiguration ändern, nicht den Fragebogen.

Quelle: [Age ratings values and
definitions](https://developer.apple.com/help/app-store-connect/reference/age-ratings-values-and-definitions/)
· [Updated age ratings in App Store
Connect](https://developer.apple.com/news/?id=ks775ehf)

## Offen

Erledigt am 06.09.2026 und deshalb **nicht** mehr hier: App-ID mit beiden
Capabilities, App-Eintrag (Apple-ID 6809211333), Store-Metadaten. Siehe
„Registrierte Kennungen" oben.

### Für TestFlight mit einem Kollegen — nur diese drei

Alles andere in diesem Abschnitt betrifft die **öffentliche Listung** und
blockiert das Testen nicht. Interne Tester brauchen keine Beta App Review,
keine Prüfkonten und keine 4.2-Begründung (Einzelheiten:
`native/TestFlight.md`).

1. **APNs-Schlüssel** (.p8) erzeugen — lädt sich **genau einmal** herunter.
2. **Kollege als App-Store-Connect-Benutzer** einladen (Rolle *Developer* oder
   *App Manager*). Er muss die Einladung **annehmen**, sonst erscheint er
   unter „Internal Testing" nicht.
3. **Build vom Mac** — `./native/ios-einrichten.sh`, dann Xcode →
   Product → Archive → Distribute App → TestFlight.

**Der Händlerstatus muss dafür nur *erklärt*, nicht verifiziert sein.**

### Für die öffentliche Listung

- **Händlerstatus nach DSA Art. 30/31** — für die **öffentliche Listung**,
  nicht für TestFlight.

  Hier stand bis zum 06.09.2026 „Pflicht für **jede** App im EU-App-Store,
  ohne ihn keine Listung", und der Punkt führte die Startreihenfolge an. Für
  die Listung stimmt der Satz; als Vorbedingung für alles davor stimmt er
  nicht. Apple:

  > *„If you don't distribute apps on the App Store in the EU (for example you
  > only distribute apps through alternative distribution, or TestFlight, or
  > on the App Store only outside the EU), you're not acting as a trader on
  > the App Store."*

  **Erklären** muss man ihn immer, **verifizieren** nur für die EU-Listung.
  Bauen, hochladen und an Tester verteilen geht ohne; die Verifikation
  (Postfach, Telefon, E-Mail, je mit zweitem Faktor) läuft parallel.

  Für die Listung selbst bleibt es dabei: als **natürliche Person** erfüllbar
  (Adresse **oder Postfach**), eine UG oder GmbH verlangt Apple dafür nicht.
  Apple veröffentlicht die verifizierten Angaben auf der Produktseite — das
  Postfach ist deshalb die überlegtere Wahl. Ein späterer Wechsel von
  Individual auf Organization ist kein Schalter: er braucht eine
  D-U-N-S-Nummer und einen App-Transfer.

  Quelle: [App Store Connect Help, EU DSA trader
  requirements](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/)
- **Zwei Prüfkonten mit Inhalt** (Guideline 2.1). Die Rolle steht bei der
  Registrierung fest, ein Konto kann nicht Planer **und** Anbieter sein — der
  Prüfer sähe sonst die Hälfte. Ein leerer Bildschirm gilt als unfertige App
  und ist der häufigste Ablehnungsgrund überhaupt. Adressen auf
  `eventbörse.de`, nicht auf `eventboerse.de`. Einzelheiten und der Wortlaut
  für die Review-Notes: `native/README.md`.
- **APNs-Schlüssel** für Push.
- **Xcode-Projekt** erzeugen (`npx cap add ios`) und die Zwecktexte aus
  `native/Info.plist-zwecktexte.md` übernehmen.
- **Entscheidung `EB_STRIPE_MODE`** für die Prüfung. Der Schalter gilt global,
  nicht je Konto: entweder der Prüfer sieht die Buchungsstrecke, ohne sie
  abzuschliessen (richtig nach 3.1.3(e) — vermittelt werden reale Leistungen),
  oder die Seite steht kurzzeitig auf Testschlüsseln und nimmt so lange von
  **niemandem** Geld an.

Erledigt und nicht mehr offen:

- Zuordnungsdatei ausgeliefert (14 Tests, `aasa.spec.js`).
- Zwecktexte formuliert, inklusive der vier, die **nicht** eingetragen werden
  dürfen — eine erbetene und nie genutzte Berechtigung ist kein neutraler
  Zustand.
- **PR #46** ist gegenstandslos: er baut auf der Annahme auf, Apple wolle bei
  realen Leistungen mitverdienen. Schließen.

## Bei jeder neuen erhobenen Datenart

Drei Orte, alle oder keiner:

1. diese Tabelle,
2. `native/PrivacyInfo.xcprivacy`,
3. App Store Connect.

Dazu die Datenschutzerklärung und — bei einem neuen Speicherschlüssel —
`Cookie-Liste.md`, sonst bricht `scripts/recht.mjs --check` ab.
