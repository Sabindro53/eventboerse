# Integration: Stripe

**Typ:** Zahlungsabwicklung | **Status:** Grundgerüst implementiert, in Entwicklung

## Wie eingebunden

| Schicht | Datei | Was |
|---------|-------|-----|
| Frontend | `app.js` ~11601 | `_handleStripeReturn()`, `_reconcileStripePayments()`, `_openStripePaymentModal()` |
| Frontend | `index.html` | `<script src="https://js.stripe.com/v3/">` |
| Backend | `functions.php` | 7 REST-Endpoints unter `/stripe/*` |
| Secrets | `wp-config.php` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |

## Zahlungs-Flow

```
app.js: _openStripePaymentModal()
       ↓
POST /stripe/create-checkout → Session ID
       ↓
Stripe hosted page (oder Payment Element)
       ↓
?stripe=success&card_id=&session_id= (Return URL)
       ↓
app.js: _handleStripeReturn() liest URL-Params
       ↓
POST /stripe/verify-payment
       ↓
POST /stripe/webhook (Stripe → Server, async)
```

## Was funktioniert / was fehlt

| Feature | Status |
|---------|--------|
| Checkout Session erstellen | ✅ |
| Return URL auslesen | ✅ |
| Webhook empfangen | ✅ |
| Board-Status nach Zahlung updaten | ⚠️ teilweise |
| Reconciliation | ⚠️ in Entwicklung |
| Rückerstattungen | ❌ nicht implementiert |

## Verknüpfte Notizen
- [[Features/Payments]] — Zahlungs-Feature
- [[Backend/Payment-API]] — Backend-Endpoints
- [[UserFlows/Event-Planer-Bucht-DJ]] — Kontext im Flow
