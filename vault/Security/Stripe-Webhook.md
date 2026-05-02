---
tags: [security, p0, stripe, payments, webhook]
date: 2026-05-02
---

# Stripe-Webhook

Sicher signaturverifizierter Stripe-Endpoint. Behebt P0.3 aus [[2026-05-02-Security-Hardening|Audit]].

## Datei

`includes/security/stripe-webhook.php` · PR #16

## Endpoint

```
POST /wp-json/eventboerse/v1/stripe/webhook
```

## Was es tut

- HMAC-SHA256-Verifikation des `Stripe-Signature` Headers (pure-PHP, kein SDK)
- 5-Minuten-Timestamp-Tolerance gegen Replay
- Idempotenz via WP-Transient mit Stripe-Event-ID (24h)
- Dispatch via `do_action("eventboerse_stripe_event_{type}", $event)`

## Verbindung zu

- [[2026-05-02-Security-Hardening|Hardening-Index]]
- [[Payments]] — Buchungs-Flows die Stripe-Events ausloesen
- [[API-Endpoints]] — Endpoint-Map
- Configuration: WP-Option `eventboerse_stripe_webhook_secret`

## TODOs

- Webhook-URL im Stripe-Dashboard eintragen
- `eventboerse_stripe_webhook_secret` setzen (per `wp option update`)
- Listener-Funktionen fuer payment_intent.succeeded etc. schreiben (Folge-PR)
