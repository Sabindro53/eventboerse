# App-Store-Startklarheit

Stand: 2. September 2026

## Erledigt

- iPhone-App mit Bundle-ID `de.eventboerse.app` angelegt.
- Build mit Xcode 26.5 und iOS-26.5-SDK erfolgreich.
- Neues Eventbörse-Logo als mittiges, deckendes 1024×1024-App-Icon eingebaut.
- Startbildschirm im selben Markenbild erstellt.
- Privacy Manifest ohne Tracking hinterlegt.
- Konto-Löschung ist direkt in den Einstellungen vorhanden.
- Native Funktionen für Teilen, Haptik, Netzwerkstatus, externen Browser und Pull-to-Refresh ergänzt.
- Nicht funktionsfähige Social-Login-Platzhalter werden in iOS entfernt.
- Volljährigkeitsbestätigung technisch ergänzt; ein nicht tatsächlich erhobenes Geburtsdatum aus dem Datenschutzhinweis entfernt.
- Projekt-Gate und 25 Kern-Smoke-Tests bestanden.
- App erfolgreich auf iPhone 17 Pro Max Simulator gestartet.

## Externe Blocker

1. Apple Developer Program ist für das angemeldete Konto noch nicht aktiv. App Store Connect meldet `invalidUser`.
2. Mitgliedschaft, Identitätsprüfung, Vertrag und Jahresgebühr müssen vom Kontoinhaber erledigt werden.
3. Danach fehlen Team-ID, automatische Signierung, App-Datensatz und Upload des signierten Archivs.

## Produkt-/Review-Blocker

1. Die Live-App zeigt „Beta- und Vorgründungsphase“, Stripe-Testmodus und nicht verbindliche Buchungen. Eine öffentliche App-Store-Einreichung sollte erst mit einer fertigen Produktivpositionierung erfolgen; Beta-Verteilung gehört zu TestFlight.
2. Rechtstexte sind als Entwürfe bis zur Eintragung der UG bezeichnet. Vor öffentlicher Einreichung juristisch finalisieren.
3. Demo-Dienstleister und redaktionelle Beispielinhalte für Reviewer klar kennzeichnen oder durch echte Startinhalte ersetzen.
4. Dauerhaftes Review-Konto anlegen, das ohne persönliche OTP-Hilfe zugänglich ist.
5. Finale App-Store-Screenshots nach Produktivumschaltung aufnehmen.
6. Risiko nach App-Review-Regel 4.2 bleibt zu prüfen, weil die Kernoberfläche vom eigenen Webdienst geladen wird. Die ergänzten nativen Funktionen senken das Risiko, beseitigen es aber nicht vollständig.

## Nächster sicherer Meilenstein

Nach Aktivierung der Apple-Mitgliedschaft: signiertes Archiv erzeugen, in App Store Connect hochladen und zunächst intern über TestFlight prüfen. Die öffentliche Review-Einreichung erfolgt erst nach Auflösung der Produkt-/Rechtsblocker und ausdrücklicher Bestätigung des Kontoinhabers.

## Apple-Referenzen

- Review-Richtlinien: https://developer.apple.com/app-store/review/guidelines/
- Build hochladen: https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/
- App einreichen: https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app
- Konto-Löschung: https://developer.apple.com/support/offering-account-deletion-in-your-app/
