# Features: Zahlungen (Stripe)

## Überblick

Stripe-Integration für sichere Zahlungsabwicklung zwischen Event-Planern und Dienstleistern.

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
Zahlung abgeschlossen
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
| `/stripe/create-payment-intent` | Payment Intent |
| `/stripe/verify-payment` | Zahlung bestätigen |
| `/stripe/webhook` | Stripe Webhooks (HMAC verifiziert) |
| `/stripe/reconcile` | Offene Zahlungen abgleichen |
| `/send-invoice` | Rechnung per E-Mail |

## Invoice-System

- Automatische Rechnungsgenerierung
- E-Mail-Versand via IONOS SMTP
- PDF-Anhang (geplant)
- Rechnungsnummer-System

## Sicherheit

- Stripe Webhook-Signatur-Verifizierung (HMAC)
- PCI-DSS Compliance via Stripe Payment Element
- Kein direkter Kartenumgang
- Payment Intent für 3D Secure Support

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
- **Backend:** `functions.php` (/stripe/* Endpoints)

## Verknüpfte Notizen
- [[Backend/Payment-API]] - API Endpoints
- [[Features/Messaging]] - Invoice aus Chat heraus
- [[Architecture/Overview]] - System-Übersicht
- [[Features/Reviews]] — Bewertung nach Zahlung
