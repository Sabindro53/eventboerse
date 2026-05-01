# Backend: Payment API (Stripe)

**Datei:** `functions.php` | **Base:** `/wp-json/eventboerse/v1/stripe/`

## Endpoints

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| POST | `/stripe/create-checkout` | Stripe Checkout Session erstellen |
| GET | `/stripe/public-key` | Publishable Key für Frontend |
| POST | `/stripe/create-payment-intent` | Payment Intent erstellen |
| POST | `/stripe/verify-payment` | Zahlung serverseitig verifizieren |
| POST | `/stripe/webhook` | Stripe Webhooks empfangen (HMAC-verifiziert) |
| POST | `/stripe/reconcile` | Offene Zahlungen abgleichen |
| POST | `/send-invoice` | Rechnung per E-Mail senden |

## Zahlungs-Status

`pending` → `processing` → `succeeded` / `failed` / `refunded`

## Sicherheit

- Webhook-Signatur via HMAC (Stripe-Secret)
- PCI-DSS: kein direkter Kartenzugriff (alles via Stripe Elements)
- 3D Secure via Payment Intent

## Status (2026-04-30)

Grundgerüst implementiert. Checkout + Webhook funktionieren. Reconciliation und vollständige Board-Integration noch in Entwicklung.

## Verknüpfte Notizen
- [[Features/Payments]] — Frontend Zahlungs-Flow
- [[Features/Messaging]] — Rechnung aus Chat
- [[Backend/API-Endpoints]] — Alle Endpoints
