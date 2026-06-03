# Stripe Sandbox + Connect Runbook

Ziel: Eventbörse kann Stripe Connect, Checkout und Webhooks im Testmodus prüfen,
ohne Live-Zahlungen oder echte Auszahlungen auszulösen.

## Lokale CLI

Stripe CLI ist auf dem Mac per Homebrew installierbar:

```bash
/opt/homebrew/bin/brew install stripe
/opt/homebrew/bin/stripe version
```

Login ist bewusst manuell, weil Stripe dafür Browser- oder API-Key-Freigabe
braucht:

```bash
/opt/homebrew/bin/stripe login
```

## GitHub Secrets

Für Sandbox/Testmodus diese Secrets setzen:

```text
EB_STRIPE_MODE=test
EB_STRIPE_TEST_PUBLIC_KEY=pk_test_...
EB_STRIPE_TEST_SECRET_KEY=sk_test_...
EB_STRIPE_TEST_WEBHOOK_SECRET=whsec_...
```

Live-Keys bleiben separat:

```text
EB_STRIPE_PUBLIC_KEY=pk_live_...
EB_STRIPE_SECRET_KEY=sk_live_... oder rk_live_...
EB_STRIPE_WEBHOOK_SECRET=whsec_...
```

Wichtig: Wenn `EB_STRIPE_MODE=test` aktiv ist, akzeptiert Eventbörse keine
Live-Keys als Fallback. Fehlen Test-Keys, blockt die Stripe-Konfiguration.

## Connect Sandbox aktivieren

1. In Stripe Dashboard in den Test-/Sandbox-Modus wechseln.
2. Connect im Plattformkonto aktivieren.
3. Danach in Eventbörse als Dienstleister:
   Einstellungen -> Auszahlungs-Konto -> Stripe-Konto verbinden.
4. Stripe führt durch das Test-Onboarding.
5. Nach Abschluss kommt Stripe zurück nach:
   `/settings?stripe_connect=return`.

Wenn ein Onboarding-Link abläuft, kommt Stripe zurück nach:
`/settings?stripe_connect=refresh`.

## Webhooks lokal testen

Für lokale Entwicklung:

```bash
/opt/homebrew/bin/stripe listen --forward-to http://localhost:8000/wp-json/eventboerse/v1/stripe/webhook
```

Für die Live-/Testdomain:

```bash
/opt/homebrew/bin/stripe listen --forward-to https://eventbörse.de/wp-json/eventboerse/v1/stripe/webhook
```

Den angezeigten `whsec_...`-Wert als passendes Webhook-Secret setzen.

## Testfälle

- Dienstleister erstellt Test-Auszahlungskonto.
- Eventplaner zahlt 1 EUR im Testmodus.
- Webhook bestätigt die Zahlung.
- Board-Karte wechselt auf bezahlt.
- Fee-Quote bleibt nachvollziehbar:
  Plattformprovision 3%, Dienstleister-Anteil vor Stripe-Gebühren 97%.

## Referenzen

- Stripe CLI: https://docs.stripe.com/stripe-cli
- Stripe Connect testen: https://docs.stripe.com/connect/testing
