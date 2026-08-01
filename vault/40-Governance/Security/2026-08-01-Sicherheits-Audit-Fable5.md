---
tags: [layer/L4, domain/governance, share/secret]
date: 2026-08-01
layer: L4
domain: governance
share: secret
---

# Sicherheits-Audit 2026-08-01 (Fable 5, vollständige Codebasis)

> Auftrag: alle 86 REST-Routen (functions.php) + alle 237 innerHTML-Pfade
> (app.js) gemeinsam prüfen. Methodik: Routen-Inventar mit permission_callback,
> Handler-Review auf Objekt-Rechte (IDOR), SQL-Präparierung, Upload-Kette,
> Rate-Limits; Frontend per Heuristik-Scanner ([tests/audit/xss-scan.js](../../../tests/audit/xss-scan.js))
> plus manueller Verifikation jedes Kandidaten.

## Ergebnis in einem Satz

**Die Härtung vom 2026-06-26 trägt.** Ein mittlerer Fund (Wissensbasis-Leckage),
zwei Low-Risk-XSS-Stellen, drei Beobachtungen — alle Funde behoben.

## Funde

### F1 · MITTEL — Wissensbasis exportierte Webhook-Abwehrwissen (BEHOBEN)

- `10-Produkt/Features/Payments.md` (share: public) nannte „Stripe
  Webhook-Signatur-Verifizierung (HMAC)" → landete in `assets/eb-knowledge.json`
  und war damit von beiden Website-Bots abrufbar.
- Laut [[00-Kern/Sicherheits-Klassifikation]] ist Webhook-Signaturlogik
  explizites Verbotsmuster (Angriffsfläche).
- **Fix:** Zeile durch nutzergerechte Formulierung ersetzt; `build-knowledge.mjs`
  um Verbotsmuster `webhook-signatur`, `rate-limit`, `nonce` ergänzt (der Filter
  fängt die Klasse jetzt automatisch); Leckage-Test in der E2E-Suite
  ([tests/e2e/wissensbasis.spec.js](../../../tests/e2e/wissensbasis.spec.js)) schlägt künftig an.

### F2 · NIEDRIG — Galerie-Preview ohne Attribut-Escaping (BEHOBEN)

- `app.js` Profil-Galerie-Preview: `'<img src="' + src + '"'` ohne `_escHtml`.
  Nur eigene Daten (Self-XSS), Server sanitisiert beim Speichern mit
  `esc_url_raw` — Restrisiko Attribut-Injection über nicht-persistierte Werte.
- **Fix:** `_escHtml(src)`.

### F3 · NIEDRIG — Selbstaudit-Modal: Kartenname ungeescapt (BEHOBEN)

- Board-Selbstaudit-Overlay interpolierte `card.name` (nutzerkontrolliert,
  eigener Scope) ohne Escaping in `innerHTML`.
- **Fix:** `_escHtml(card.name || 'Karte')`.

## Beobachtungen (kein Handlungsbedarf, dokumentiert)

- **B1** `/admin/seed-test-listing` + `/admin/bot-accept-inquiry` verlangen nur
  `is_user_logged_in` — Handler-interne Guards sind korrekt (idempotent,
  Konversations-Teilnahme + Demo-Bot-Prüfung). Spam-Potenzial minimal.
- **B2** `/user-status/{id}` erlaubt jedem Eingeloggten Online-Abfragen
  beliebiger User-IDs (Präsenz-Enumeration). Feature-Entscheidung wie bei
  Messengern; bei Bedarf auf Konversations-Partner einschränken.
- **B3** `/webauthn/verify-options` + `/verify-register` sind `__return_true`,
  aber Token-gated (Transient `eb_verify_pk_*`, 300 s Challenge-TTL) — sauber.

## Geprüft & für gut befunden

| Bereich | Befund |
|---------|--------|
| permission_callbacks | Alle 86 Routen haben einen; Admin-Routen prüfen `eb_is_admin_user()`/`manage_options` |
| IDOR | Listings update/delete, Reviews delete, Messages list/send/delete, Offer-Status, Registrations, Settlement: alle mit Objekt-Rechteprüfung (Owner/Teilnehmer/Admin) |
| SQL | Durchgängig `$wpdb->prepare`; IN-Klauseln über `array_map('intval')`; Tabellennamen esc_sql |
| Upload | 7-stufige Kette: Fehlercode → 5-MB-Limit → Magic-Bytes (finfo) → Doppel-Endungen-Blocklist (inkl. .svg/.html/.js) → `wp_check_filetype_and_ext` → mimes-Allowlist → `getimagesize`-Re-Check |
| Stripe-Webhook | HMAC-Verifikation mit `hash_equals` + 300-s-Toleranz; ohne Secret → 500 statt still-OK |
| Settlement | Objekt-Rechte: Admin ∨ Käufer (eb_stripe_paid) ∨ Ziel-Connect-Konto |
| Rate-Limits | register/login/forgot/reset/otp_send/otp_verify verdrahtet, Reset-on-Success |
| Frontend-XSS | 237 innerHTML/insertAdjacentHTML-Statements gescannt; Chat-, Detail-, Filter-, KB-Rendering escapen konsistent (`_escHtml` inkl. Quotes, `_sanitizeHtml` als DOM-Whitelist mit URL-Schema-Filter) |
| Header | CSP (ohne unsafe-eval), HSTS, X-Frame-Options DENY |

## Werkzeug

Der Scanner [tests/audit/xss-scan.js](../../../tests/audit/xss-scan.js) bleibt im Repo — bei
künftigen Audits `node tests/audit/xss-scan.js` laufen lassen und jede
Meldung manuell verifizieren (bewusst überempfindlich).

## Verwandt

- [[40-Governance/Security/Permissions]] · [[40-Governance/Security/Upload-Hardening]]
- [[40-Governance/Security/Stripe-Webhook]] · [[40-Governance/Security/Rate-Limit]]
- [[00-Kern/Sicherheits-Klassifikation]]
