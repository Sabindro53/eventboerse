# Features: Zahlungen (Stripe)

## Überblick

Stripe-Integration für sichere Zahlungsabwicklung zwischen Event-Planern und Dienstleistern. Stand 2026-06-06: Payment Intent, Webhook/Reconcile und Stripe Connect Express für Dienstleister-Auszahlungen sind im Code vorhanden; E2E-Test im Stripe-Testmodus bleibt Pflicht vor echten Zahlungswegen.

## Zahlungs-Flow

```
Chat: Einigung auf Preis
       ↓
Dienstleister sendet Rechnung (POST /send-invoice)
       ↓
Event-Planer erhält Zahlungslink per E-Mail
       ↓
POST /stripe/create-checkout → Checkout Session
       ↓
Stripe Payment Element (PCI-konform)
       ↓
Destination Charge: Zahlung an Dienstleister, Plattformprovision als Application Fee
       ↓
POST /stripe/webhook → Bestätigung
       ↓
POST /stripe/verify-payment → Status Update
```

## Stripe Endpoints

| Endpoint | Beschreibung |
|----------|--------------|
| `/stripe/create-checkout` | Checkout Session erstellen |
| `/stripe/public-key` | Public Key für Frontend |
| `/stripe/fee-quote` | Gebühren-/Auszahlungs-Vorschau |
| `/stripe/create-payment-intent` | Payment Intent |
| `/stripe/create-payment-intent-admin` | Admin-/Test-Payment Intent |
| `/stripe/verify-payment` | Zahlung bestätigen |
| `/stripe/webhook` | Stripe Webhooks (HMAC verifiziert) |
| `/stripe/reconcile` | Offene Zahlungen abgleichen |
| `/stripe/connect/onboard` | Connect Express Onboarding |
| `/stripe/connect/status` | Auszahlungskonto-Status |
| `/stripe/connect/diagnostics` | Connect-Konfiguration prüfen |
| `/stripe/payment-domain/register` | Payment Domain registrieren |
| `/stripe/connect/disconnect` | Connect-Verbindung trennen |
| `/send-invoice` | Rechnung per E-Mail |

## Invoice-System

- Automatische Rechnungsgenerierung
- E-Mail-Versand via Hosting-Provider SMTP
- PDF-Anhang (geplant)
- Rechnungsnummer-System

## Sicherheit

- Stripe Webhook-Signatur-Verifizierung (HMAC)
- PCI-DSS Compliance via Stripe Payment Element
- Kein direkter Kartenumgang
- Keine Speicherung von IBAN/Bankdaten in Eventbörse; Stripe sammelt KYC/Bankdaten.
- Payment Intent für 3D Secure Support
- Connect-Onboarding als Pflicht für Dienstleister vor Live-Buchung/Auszahlung.

## Zahlungs-Status

| Status | Beschreibung |
|--------|--------------|
| `pending` | Zahlung ausstehend |
| `processing` | Wird verarbeitet |
| `succeeded` | Zahlung erfolgreich |
| `failed` | Zahlung fehlgeschlagen |
| `refunded` | Rückerstattung |

## Betroffene Dateien

- **Frontend:** `app.js` (Stripe.js Payment Element)
- **Backend:** `functions.php` (`/stripe/*` Endpoints)
- **UI:** `index.php` Einstellungen → Auszahlungs-Konto

## Verknüpfte Notizen
- [[Backend/Payment-API]] - API Endpoints
- [[Features/Messaging]] - Invoice aus Chat heraus
- [[Architecture/Overview]] - System-Übersicht
- [[Features/Reviews]] — Bewertung nach Zahlung
