# App-Store-Datenschutzangaben

Arbeitsgrundlage für „App-Datenschutz“ in App Store Connect. Die Angaben müssen bei jeder Funktions- oder Anbieteränderung erneut geprüft werden.

## Tracking

- Daten für Tracking verwendet: `Nein`
- Daten mit Datenmaklern geteilt: `Nein`
- Drittanbieter-Werbung: `Nein`
- Entwicklerwerbung/Marketing: `Nein`

## Mit der Identität verknüpfte Daten

Alle folgenden Angaben dienen ausschließlich der App-Funktionalität:

| Apple-Kategorie | Datentyp | Verwendung |
| --- | --- | --- |
| Kontaktinformationen | Name | Konto, Profil, Anfragen und Verträge |
| Kontaktinformationen | E-Mail-Adresse | Konto, Anmeldung, Benachrichtigungen und Support |
| Kontaktinformationen | Telefonnummer | optionales Profil und Kontakt |
| Kontaktinformationen | Anschrift | optionales Anbieter-/Abrechnungsprofil |
| Standort | Ungefährer Standort | optionale Umkreissuche |
| Benutzerinhalte | Fotos oder Videos | Profil- und Inseratbilder |
| Benutzerinhalte | E-Mails oder Textnachrichten | internes Messaging |
| Benutzerinhalte | Sonstige Benutzerinhalte | Inserate, Bewertungen, Projekte und Meldungen |
| Benutzerinhalte | Kundensupport | Kontakt- und Supportanfragen |
| Kennungen | Benutzer-ID | Konto und serverseitige Zuordnung |
| Käufe | Kaufhistorie | Buchungs- und Transaktionsstatus realer Dienstleistungen |
| Sonstige Daten | Sonstige Datentypen | Volljährigkeitsbestätigung und sicherheitsbezogene Serverprotokolle |

## Nicht als erhoben angeben

- Genaue Standortdaten werden nicht benötigt.
- Zahlungs- oder Kreditkartendaten werden von Stripe verarbeitet und von Eventbörse nicht gespeichert.
- Such- und Klickpräferenzen liegen laut Datenschutzerklärung nur lokal auf dem Gerät und werden nicht an Eventbörse übertragen.
- Biometrische Passkey-Daten verlassen das Gerät nicht.

## Referenzen

- Apple: https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/
- Öffentliche Datenschutzerklärung: https://xn--eventbrse-57a.de/datenschutz/
- Native Deklaration: `ios/App/App/PrivacyInfo.xcprivacy`
