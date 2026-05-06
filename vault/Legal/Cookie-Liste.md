---
tags: [legal, dsgvo, cookies, tddg]
---

# Cookie- & Storage-Liste

> Vollständige Auflistung aller Cookies und localStorage/sessionStorage-Keys gemäß **TDDDG § 25** (Einwilligung für nicht-essenzielle Speicherung) und **DSGVO Art. 13**. Quelle der Wahrheit für [[Legal/Compliance-Overview]] und die Cookie-Richtlinie B03.

## Klassifizierung

- **Essenziell**: ohne diese funktioniert die Plattform nicht (Login, Sicherheit). Keine Einwilligung nötig.
- **Funktional**: Komfort (Theme, Banner-Status). Opt-out-fähig.
- **Statistik / Marketing**: aktuell **keine** im Einsatz.

## HTTP-Cookies

| Name | Klasse | TTL | HttpOnly | Secure | SameSite | Zweck |
|---|---|---|---|---|---|---|
| `wordpress_logged_in_*` | essenziell | Session | ✓ | ✓ | Lax | WP-Auth |
| `wordpress_sec_*` | essenziell | Session | ✓ | ✓ | Lax | WP-Auth-Hash |
| `wp-settings-*` | funktional | 1 Jahr | – | ✓ | Lax | WP-Admin-UI-State |
| `eb_csrf` | essenziell | Session | ✓ | ✓ | Strict | Doppelter CSRF-Schutz |
| `eb_consent_v` | funktional | 12 Mo | – | ✓ | Lax | Cookie-Consent-Version |

> **Keine Tracking-Cookies, kein Google Analytics, kein Facebook-Pixel.**

## localStorage

| Key | Klasse | Inhalt | TTL |
|---|---|---|---|
| `eb_cookie_consent` | funktional | `{ "v": 1, "ts": …, "essential": true, "functional": true }` | 12 Mo |
| `eb_beta_banner_dismissed` | funktional | `"1"` | unbegrenzt |
| `eb_theme` | funktional | `"dark"\|"light"\|"system"` | unbegrenzt |
| `eb_recent_searches` | funktional | Array, max 10 Einträge | unbegrenzt |
| `eb_draft_listing_<userId>` | funktional | unfertiges Listing | bis Submit |
| `eb_last_route` | funktional | letzter besuchter Hash | Session-ähnlich |
| `eb_2fa_remember_<userId>` | essenziell | „2FA für 30 Tage merken" Flag | 30 Tage |

## sessionStorage

| Key | Klasse | Inhalt |
|---|---|---|
| `eb_msg_unread_seen` | funktional | gelesen-Marker pro Tab |
| `eb_payment_intent_id` | essenziell | Stripe-PI während Checkout |
| `eb_webauthn_challenge` | essenziell | WebAuthn-Challenge (single-use) |

## IndexedDB

Nicht eingesetzt.

## Service-Worker / Cache-Storage

Nicht eingesetzt (bewusste Entscheidung — siehe [[Architecture/Performance]]).

## Drittanbieter

| Anbieter | Wann geladen | Cookies |
|---|---|---|
| **Stripe** (`js.stripe.com`) | nur in Checkout-Flow | `__stripe_mid`, `__stripe_sid`, m | essenziell für Payment |
| **OpenStreetMap-Tiles** | Karten-Modul | keine Cookies (Tiles sind static) |
| **Google Fonts** | aktuell remote (geplant: self-host) | keine Cookies, aber IP-Übertragung — Roadmap |

## Cookie-Banner-Logik

```
1. Erstbesuch → Banner mit "Akzeptieren / Ablehnen / Einstellungen"
2. Vor Klick: NUR essenzielle Cookies und localStorage werden gesetzt
3. "Ablehnen" → funktionale Keys bleiben aus, Theme/Search-History deaktiviert
4. "Akzeptieren" → eb_cookie_consent wird geschrieben, alle funktionalen aktiviert
5. Im Footer-Link "Cookie-Einstellungen" jederzeit widerrufbar
```

## Pflichten gegenüber Nutzern

- Cookie-Richtlinie ([[Legal/Compliance-Overview]] B03) listet **diese Tabelle**.
- Bei Änderungen: `eb_cookie_consent.v` inkrementieren → Banner zeigt sich erneut.
- DSGVO Art. 7(3): Widerruf so einfach wie Erteilung — Footer-Link „Einstellungen".

## Verknüpft

- [[Legal/Compliance-Overview]]
- [[Frontend/State-Management]]
- [[Security/CSP-Headers]]
