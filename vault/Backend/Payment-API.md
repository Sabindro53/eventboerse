# Backend: Payment API (Stripe)

**Datei:** `functions.php` | **Base:** `/wp-json/eventboerse/v1/stripe/`

## Endpoints

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| POST | `/stripe/create-checkout` | Stripe Checkout Session erstellen |
| GET | `/stripe/public-key` | Publishable Key für Frontend |
| GET | `/stripe/fee-quote` | Gebühren-/Auszahlungs-Vorschau |
| POST | `/stripe/create-payment-intent` | Payment Intent erstellen |
| POST | `/stripe/create-payment-intent-admin` | Admin-/Test-Payment Intent |
| POST | `/stripe/verify-payment` | Zahlung serverseitig verifizieren |
| POST | `/stripe/webhook` | Stripe Webhooks empfangen (HMAC-verifiziert) |
| POST | `/stripe/reconcile` | Offene Zahlungen abgleichen |
| POST | `/stripe/connect/onboard` | Stripe Connect Express Onboarding starten |
| GET | `/stripe/connect/status` | Auszahlungskonto-Status lesen |
| GET | `/stripe/connect/diagnostics` | Connect-/Key-Konfiguration prüfen |
| POST | `/stripe/payment-domain/register` | Payment Domain für Stripe registrieren |
| POST | `/stripe/connect/disconnect` | Verbundenes Stripe-Konto trennen |
| POST | `/send-invoice` | Rechnung per E-Mail senden |

## Zahlungs-Status

`pending` → `processing` → `succeeded` / `failed` / `refunded`

## Sicherheit

- Webhook-Signatur via HMAC (Stripe-Secret)
- PCI-DSS: kein direkter Kartenzugriff (alles via Stripe Elements)
- 3D Secure via Payment Intent

## Status (2026-06-06)

Grundgerüst, Payment Intent, Webhook, Reconcile und Connect-Onboarding sind implementiert. Buchungen sollen über Stripe Connect Express/Destination Charges laufen; Dienstleister müssen dafür ihr Auszahlungskonto aktivieren. E2E-Test im Stripe-Testmodus bleibt P0/P1, bevor echte Zahlungswege freigegeben werden.

## Guardrails

- Eventbörse speichert keine IBAN/Bankdaten; Stripe sammelt KYC und Auszahlungskonto.
- Provider-Buchung blockieren, wenn `requires_connect_onboarding`/Auszahlungen nicht aktiv sind.
- Gebühren endgültig serverseitig/Stripe-seitig behandeln, nicht allein clientseitig berechnen.
- Webhook- und Reconcile-Pfade idempotent halten.

## Verknüpfte Notizen
- [[Features/Payments]] — Frontend Zahlungs-Flow
- [[Features/Messaging]] — Rechnung aus Chat
- [[Backend/API-Endpoints]] — Alle Endpoints
