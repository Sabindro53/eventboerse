---
layer: L4
domain: governance
share: internal
tags: [layer/L4, domain/governance, share/internal]
---

# Rechtliche Lage — gemessen

> **Erzeugt von `scripts/recht.mjs`. Nicht von Hand bearbeiten.**
> Stand: 2026-09-04 03:30 UTC · 24 Frontend-Module geprüft.

Diese Notiz vergleicht, was der Vault über die Plattform behauptet, mit dem,
was der Code tut. Sie ersetzt keine Rechtsberatung: sie prüft nur, ob
Beschreibung und Software dasselbe sagen.

## Lage in einem Satz

Beschreibung und Code sagen dasselbe.



## Speicherschlüssel im Frontend (TDDDG § 25)

24 Schlüssel im Code, 24 in der Cookie-Liste beschrieben.

| Schlüssel | Speicher | Modul |
|---|---|---|
| `eb_accepted_bookings` | localStorage | chat/20-chat-nachrichten.js |
| `eb_ai_chat_v1_<dynamisch>` | localStorage | ai/50-planungs-assistent.js |
| `eb_board_projects` | localStorage | board/40-board-kanban.js |
| `eb_board_projects_<dynamisch>` | localStorage | board/40-board-kanban.js |
| `eb_board_tombstones_<dynamisch>` | localStorage | board/40-board-kanban.js |
| `eb_cookie_consent` | localStorage | ui/32-consent-init-map.js |
| `eb_dark_mode` | localStorage | ui/23-darkmode-staedte-picker.js |
| `eb_demo_passkeys` | localStorage | core/30-auth.js |
| `eb_demo_session` | localStorage | core/30-auth.js |
| `eb_demo_users` | localStorage | core/30-auth.js |
| `eb_favs_<dynamisch>` | localStorage | core/02-router-navigation.js |
| `eb_favs_guest` | localStorage | core/02-router-navigation.js |
| `eb_kb_misses` | localStorage | ui/31-modals-toast-qabot.js |
| `eb_liked_posts` | localStorage | board/42-guide-social-feed.js |
| `eb_nav_search` | localStorage | board/42-guide-social-feed.js |
| `eb_passkey_prompt_dismissed_<dynamisch>` | localStorage | core/30-auth.js, ui/22-inserat-settings-uploads.js |
| `eb_pending_payment` | localStorage | board/41-flow-zahlung.js |
| `eb_post_comments` | localStorage | board/42-guide-social-feed.js |
| `eb_radar_ort` | localStorage | search/13-event-radar.js |
| `eb_social_posts` | localStorage | board/42-guide-social-feed.js |
| `eb_stripe_onboarding_prompt_<dynamisch>` | localStorage | core/30-auth.js |
| `eb_taste_v1` | localStorage | search/11-suche-ki.js |
| `eb_user` | localStorage | board/42-guide-social-feed.js |
| `eventboerse_pending_login_otp` | sessionStorage | core/30-auth.js |

> Alle Aufrufe waren auflösbar — die Liste ist vollständig.

## Einwilligung (TDDDG § 25 Abs. 1)

| Frage | Messung |
|---|---|
| Wo wird die Antwort gesetzt? | js/modules/ui/32-consent-init-map.js |
| Dateien, die Speicher schreiben | 4 |
| davon prüfen die Antwort | **1** |

Mindestens eine Schreibstelle richtet sich nach der Antwort.

## Pflichtseiten

15 gefordert, 0 ohne Route.

| Slug | Rechtsgrundlage | Route |
|---|---|---|
| `/agb` | BGB | vorhanden |
| `/agb-b2b` | HGB, BGB | vorhanden |
| `/agb-dienstleister` | P2B | vorhanden |
| `/datenschutz` | DSGVO Art. 13/14 | vorhanden |
| `/impressum` | DDG § 5, MStV § 18 | vorhanden |
| `/cookies` | TDDDG § 25 | vorhanden |
| `/widerruf` | BGB § 356 | vorhanden |
| `/marktplatz` | DSA Art. 14 | vorhanden |
| `/community` | DSA | vorhanden |
| `/bewertungen` | UWG, DSA | vorhanden |
| `/upload` | UrhG, DSA | vorhanden |
| `/dsa` | DSA Art. 16, 20 | vorhanden |
| `/p2b` | P2B Art. 3, 8, 9 | vorhanden |
| `/barrierefreiheit` | BFSGV | vorhanden |
| `/vsbg` | VSBG § 36 | vorhanden |

## KI-Transparenz (EU AI Act Art. 50, DSA, UWG § 5)

| Frage | Messung |
|---|---|
| Kennzeichnet der Code KI-Inhalte? | ja |
| Deklarationszustände | `assisted`, `generated`, `open` |
| Beschreibt der Vault sie? | ja → [[40-Governance/Legal/KI-Transparenz]] |

## Drittanbieter im Auslieferungspfad (DSGVO Art. 13 Abs. 1 lit. f)

Jeder Host, den `wp_enqueue_*` wirklich einbindet — nicht der, an den man sich
erinnert. Beim Abruf erfährt der Betreiber die IP des Besuchers.

| Host | In der Datenschutzerklärung |
|---|---|
| `js.stripe.com` | genannt |

## Verknüpft

- [[40-Governance/Legal/Compliance-Overview]]
- [[40-Governance/Legal/Cookie-Liste]]
- [[40-Governance/Legal/KI-Transparenz]]
- [[40-Governance/Legal/Auftragsverarbeiter]]
