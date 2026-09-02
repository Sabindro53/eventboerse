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

## Offen

- **`/.well-known/apple-app-site-association`** ausliefern — ohne diese Datei
  funktionieren Passkeys in der nativen App nicht. Serverseitig, noch nicht
  gemacht.
- **Zwecktexte in `Info.plist`** (Standort, Kamera, Fotos). Apple lehnt leere
  oder nichtssagende Begründungen ab; sie müssen den konkreten Zweck nennen.
- **APNs-Schlüssel** für Push.
- **PR #46** — enthält eine Browser-Umleitung auf der widerlegten Annahme.

## Bei jeder neuen erhobenen Datenart

Drei Orte, alle oder keiner:

1. diese Tabelle,
2. `native/PrivacyInfo.xcprivacy`,
3. App Store Connect.

Dazu die Datenschutzerklärung und — bei einem neuen Speicherschlüssel —
`Cookie-Liste.md`, sonst bricht `scripts/recht.mjs --check` ab.
