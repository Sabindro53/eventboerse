# Stripe Webhook aktivieren — Status und Testlauf

Stand: Der Stripe-Testmodus ist aktiv und der Test-Webhook ist im Stripe-Dashboard registriert.

---

## Was bereits funktioniert ✅

| Was | Status |
|-----|--------|
| Payment Intent erstellen mit `on_behalf_of` + `transfer_data` | ✅ |
| Dienstleister-Onboarding-Code (Express Account + Account Link) | ✅ |
| Stripe-Connect-Plattform im Stripe-Dashboard aktiv | ⏳ extern prüfen |
| Zahlung im Frontend (Stripe Elements Modal) | ✅ |
| Server-seitige Verifikation (`verify-payment`) | ✅ |
| Board-Karte wechselt zu "Bezahlt" | ✅ |
| `account.updated` Handler (Onboarding-Abschluss sofort erkannt) | ✅ neu |
| `transfer.created` Handler (Audit-Log) | ✅ neu |

## Was noch zu prüfen ist

`EB_STRIPE_TEST_WEBHOOK_SECRET` muss nach jedem Secret-Wechsel neu deployed werden,
damit GitHub Actions den Wert in `wp-config.php` injiziert. Danach muss ein echtes
Stripe-Testevent mit `200 OK` ankommen.

---

## Einmalige Einrichtung

### Schritt 1 — Stripe Dashboard öffnen (Test-Modus!)

Geh zu: **[Stripe Dashboard → Entwickler → Webhooks](https://dashboard.stripe.com/test/webhooks)**

⚠️ Oben rechts sicherstellen: **Testmodus ist aktiv** (gelbes "Test"-Banner)

---

### Schritt 2 — Webhook-Endpoint registrieren

Klick auf **"Endpoint hinzufügen"** und trage ein:

**Endpoint-URL:**
```
https://xn--eventbrse-57a.de/wp-json/eventboerse/v1/stripe/webhook
```

**Events auswählen**:
```
payment_intent.succeeded
payment_intent.payment_failed
checkout.session.completed
account.updated
transfer.created
```

→ Auf **"Endpoint hinzufügen"** klicken

---

### Schritt 3 — Webhook-Secret kopieren

Nach dem Anlegen auf den neuen Endpoint klicken.
Unter **"Signing secret"** auf **"Enthüllen"** klicken.

Den Wert kopieren — er fängt mit `whsec_` an:
```
whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### Schritt 4 — GitHub Secret setzen

Geh zu: **GitHub → eventboerse → Settings → Secrets and variables → Actions**

Klick **"New repository secret"**:
- Name: `EB_STRIPE_TEST_WEBHOOK_SECRET`
- Value: `whsec_...` (der Wert aus Schritt 3)

→ **"Add secret"** klicken

---

### Schritt 5 — Deploy triggern

Mach einen leeren Commit oder push eine kleine Änderung:

```bash
git commit --allow-empty -m "chore: trigger deploy for Stripe webhook secret"
git push
```

Die GitHub Action läuft dann und schreibt automatisch:
```php
define('EB_STRIPE_TEST_WEBHOOK_SECRET', 'whsec_...');
```
in die `wp-config.php` auf dem IONOS-Server.

---

## Test danach

### A) Stripe CLI Test (empfohlen)
```bash
# Im Terminal auf dem Mac:
/opt/homebrew/bin/stripe trigger payment_intent.succeeded
```
→ In Stripe Dashboard unter Webhooks → letzter Event sollte "200 OK" zeigen

### B) Manuelle Test-Zahlung
0. Falls Stripe meldet, dass Connect noch nicht aktiviert ist: im Stripe-Dashboard Connect aktivieren
1. Als Dienstleister in Eventbörse einloggen → Einstellungen → Stripe-Konto verbinden
2. Das Express-Onboarding abschließen (Test-Daten verwenden)
3. Als Event-Planer (anderer Account) ein Listing des Dienstleisters öffnen
4. Buchen → Zahlung mit Testkarte `4242 4242 4242 4242` durchführen
5. Board-Karte sollte sofort auf "Bezahlt" springen

### Testkarten (Stripe Test-Modus)
| Karte | Ergebnis |
|-------|----------|
| `4242 4242 4242 4242` | Zahlung erfolgreich |
| `4000 0000 0000 3220` | 3D Secure erforderlich |
| `4000 0000 0000 9995` | Zahlung fehlgeschlagen |
Ablaufdatum: beliebig in der Zukunft, CVC: beliebig 3 Ziffern

---

## Warum "Transaktion nicht gefunden" (erklärt für immer)

**Das ist kein Bug.** Es ist die korrekte Stripe-Architektur:

```
Kunde zahlt 100 €
       ↓
Platform-Account (Eventbörse)
  → Payment Intent: pi_xxx  ← hier sieht man es!
  → Application Fee: 3 €
       ↓ automatischer Transfer
Dienstleister-Account
  → Transfer: tr_xxx  ← hier sieht man es!
  → Erhält: 97 € (vor Stripe-Gebühren)
```

- **Platform-Dashboard → Zahlungen**: zeigt `pi_xxx` ✅
- **Connected Account → Zahlungen → pi_xxx suchen**: nicht gefunden ← das ist normal!
- **Connected Account → Guthaben → Transfers**: zeigt `tr_xxx` ✅

Der Dienstleister sieht seinen Eingang unter **Guthaben → Transfers**, nicht unter Zahlungen.

---

## Dateien die geändert wurden (2026-06-04)

| Datei | Änderung |
|-------|----------|
| `functions.php` | `account.updated` und `transfer.created` Webhook-Handler hinzugefügt |
| `includes/security/stripe-webhook.php` | Neutralisiert (war totes Code, hätte doppelten Endpoint erzeugt) |

---
*Erstellt: 2026-06-04*
