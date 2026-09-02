# Compliance-Prüfung für den iOS-Start

Diese Arbeitsprüfung unterstützt die Veröffentlichung, ersetzt aber keine Rechtsberatung. Die finalen Betreiber- und Vertragstexte sollten vor öffentlicher Freigabe durch eine qualifizierte Rechtsberatung geprüft werden.

## Ergebnis

**Öffentliche Einreichung nur unter Bedingungen.** Ein interner TestFlight-Upload ist nach Aktivierung der Apple-Mitgliedschaft sinnvoll. Für den öffentlichen App Store müssen Beta-/Entwurfsstatus, redaktionelle Demo-Inhalte und der gewählte Betreiberstatus vorher final geklärt werden.

## Relevante Regeln

| Regelwerk | Relevanz | Stand |
| --- | --- | --- |
| Apple App Review 1.2 | Öffentliche Beiträge, Profile, Chat und Inserate benötigen Filterung, Meldung, Blockierung und erreichbaren Support. | Melden, Blockieren, Regeln und Moderationswege sind vorhanden; Review-Konto noch offen. |
| Apple App Review 2.2 | Betas und unfertige Produkte gehören zu TestFlight, nicht in die öffentliche Store-Ausgabe. | Live-Oberfläche nennt sich derzeit Beta/Testbetrieb; öffentlich blockierend. |
| Apple App Review 3.1.3(e) | Externe Bezahlung ist für reale, außerhalb der App erbrachte Dienstleistungen zulässig. | Geschäftsmodell passt grundsätzlich; Stripe bleibt bis zur Produktivfreigabe deaktiviert. |
| Apple App Review 4.2 | Eine App muss mehr als eine neu verpackte Website bieten. | Native Teilen-, Haptik-, Netzwerk-, Browser- und Aktualisierungsfunktionen ergänzt; Restrisiko bleibt. |
| DSGVO | Konten, Profile, Nachrichten, Bilder, Standort, Support- und Buchungsdaten sind personenbezogen. | Datenschutzerklärung, Einwilligungssteuerung und Kontolöschung vorhanden; finaler Verantwortlicher und AV-Verträge prüfen. |
| Digital Services Act | Inserate und öffentliche Nutzerinhalte benötigen ein zugängliches Notice-and-Action-Verfahren. | In-App-Meldung, DSA-Kontakt und dokumentierter Moderationsweg vorhanden; operative Reaktionsfähigkeit sicherstellen. |

## Vor öffentlicher Freigabe erforderlich

1. Betreiberform festlegen: Start als Sandro Salvaggio oder nach Eintragung als Eventbörse UG.
2. Beta-/Entwurfskennzeichnungen und widersprüchliche Vertragsaussagen erst nach Rechtsprüfung finalisieren.
3. Demo-Inhalte eindeutig als redaktionelle Beispiele kennzeichnen oder ersetzen.
4. Review-Konto ohne persönliche OTP-Unterstützung bereitstellen.
5. Löschung, Meldung, Blockierung, Support und externe Links im signierten TestFlight-Build prüfen.
6. App-Store-Datenschutzangaben mit `PrivacyInfo.xcprivacy` und der öffentlichen Datenschutzerklärung abgleichen.
7. Verfahren für Betroffenenanfragen, Sicherheitsvorfälle und DSA-Meldungen im laufenden Betrieb festlegen.

## Quellen

- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Apple App Privacy: https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/
- EU-Kommission, DSGVO-Pflichten: https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/obligations_en
- DSA-Verordnung, insbesondere Art. 16: https://eur-lex.europa.eu/eli/reg/2022/2065/oj
- EU-Kommission, Notice-and-Action: https://digital-strategy.ec.europa.eu/en/policies/dsa-notice-and-action-mechanism
