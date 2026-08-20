---
tags: [layer/L4, domain/governance, share/internal]
layer: L4
domain: governance
share: internal
---

# Cookie- & Storage-Liste

> Auflistung aller Cookies und localStorage/sessionStorage-Keys gemäß **TDDDG § 25**
> (Einwilligung für nicht-essenzielle Speicherung) und **DSGVO Art. 13**. Quelle der
> Wahrheit für [[40-Governance/Legal/Compliance-Overview]] und die Cookie-Richtlinie B03.

**Diese Liste wird geprüft, nicht geglaubt.** `node scripts/recht.mjs --check` vergleicht
sie mit dem Quelltext und bricht ab, sobald ein Schlüssel gesetzt wird, der hier fehlt.
Die gemessene Lage steht in [[40-Governance/Legal/Rechtliche-Lage]].

> **Stand 15.08.2026 — was die Prüfung ergeben hat:** Die vorige Fassung dieser Liste
> beschrieb 12 Schlüssel, von denen **11 im Code nicht existierten**, und übersah **23
> Schlüssel, die wirklich gesetzt werden** — darunter Standortdaten und ein
> Präferenzprofil. Sie stammte aus Mai 2026 und war nie nachgeführt worden. Die Tabellen
> unten sind die gemessene Fassung.

## Klassifizierung

- **Essenziell**: ohne diese funktioniert die Plattform nicht (Anmeldung, Sicherheit,
  laufende Zahlung) oder sie speichern die Einwilligung selbst. Keine Einwilligung nötig
  (TDDDG § 25 Abs. 2 Nr. 2).
- **Funktional**: Komfort und Inhalte, die der Nutzer selbst angelegt hat.
  Einwilligungspflichtig, sobald sie nicht für einen ausdrücklich gewünschten Dienst
  unbedingt erforderlich sind.
- **Profilbildend**: leitet aus dem Verhalten Vorlieben ab. **Immer einwilligungspflichtig.**

> Die Zuordnung unten ist die **Einschätzung des Betreibers**, keine Rechtsberatung. Vor
> Verlassen der Vorgründungsphase gehört sie anwaltlich geprüft — besonders die Zeilen,
> die als „funktional" geführt sind und Nutzerinhalte enthalten.

## localStorage

| Key | Klasse | Inhalt | Modul |
|---|---|---|---|
| `eb_cookie_consent` | essenziell | Antwort auf das Banner (die Einwilligung selbst) | `ui/32-consent-init-map.js` |
| `eb_user` | essenziell | angemeldeter Nutzer (Demo-Sitzung) | `board/42-guide-social-feed.js` |
| `eb_demo_session` | essenziell | Sitzung des Demo-Betriebs | `core/30-auth.js` |
| `eb_demo_users` | essenziell | Demo-Konten (kein echter Personenbezug) | `core/30-auth.js` |
| `eb_demo_passkeys` | essenziell | Passkeys des Demo-Betriebs | `core/30-auth.js` |
| `eb_pending_payment` | essenziell | laufender Zahlungsvorgang über Stripe | `board/41-flow-zahlung.js` |
| `eb_dark_mode` | funktional | Farbmodus | `ui/23-darkmode-staedte-picker.js` |
| `eb_favs_<userId>` | funktional | Favoriten eines angemeldeten Nutzers | `core/02-router-navigation.js` |
| `eb_favs_guest` | funktional | Favoriten ohne Konto | `core/02-router-navigation.js` |
| `eb_board_projects` | funktional | Planungsboard, Altbestand ohne Nutzerbindung | `board/40-board-kanban.js` |
| `eb_board_projects_<userId>` | funktional | Planungsboard eines Nutzers | `board/40-board-kanban.js` |
| `eb_board_tombstones_<userId>` | funktional | gelöschte Projekte, damit der Sync sie nicht zurückholt | `board/40-board-kanban.js` |
| `eb_accepted_bookings` | funktional | angenommene Buchungsanfragen | `chat/20-chat-nachrichten.js` |
| `eb_social_posts` | funktional | eigene Beiträge im Feed | `board/42-guide-social-feed.js` |
| `eb_post_comments` | funktional | eigene Kommentare | `board/42-guide-social-feed.js` |
| `eb_liked_posts` | funktional | Gefällt-mir-Markierungen | `board/42-guide-social-feed.js` |
| `eb_nav_search` | funktional | zuletzt gesuchte Begriffe | `board/42-guide-social-feed.js` |
| `eb_passkey_prompt_dismissed_<userId>` | funktional | „Passkey einrichten" weggeklickt | `core/30-auth.js`, `ui/22-inserat-settings-uploads.js` |
| `eb_stripe_onboarding_prompt_<kontext>_<userId>` | funktional | Stripe-Hinweis weggeklickt | `core/30-auth.js` |
| `eb_ai_chat_v1_<userId\|gast>` | funktional | **Gesprächsverlauf** mit dem Planungs-Assistenten, letzte 60 Nachrichten | `ai/50-planungs-assistent.js` |
| `eb_radar_ort` | funktional | **Standort** (Koordinaten + Herkunft: Geolocation oder Adresse) | `search/13-event-radar.js` |
| `eb_kb_misses` | profilbildend | unbeantwortete Fragen an den KI-Bot; Export von Hand über das HQ | `ui/31-modals-toast-qabot.js` |
| `eb_taste_v1` | profilbildend | **abgeleitetes Präferenzprofil** aus Such- und Klickverhalten | `search/11-suche-ki.js` |

### Die drei Zeilen mit erhöhtem Gewicht

- **`eb_radar_ort`** speichert den Standort. Er verlässt das Gerät nicht (die Umkreissuche
  rechnet lokal), aber er ist ein personenbezogenes Datum im Sinne der DSGVO und gehört
  darum in die Datenschutzerklärung, nicht nur hierhin. `radarStandortVergessen()` löscht
  ihn; dass diese Zeile nicht wegpatchbar ist, sichert der Löschwächter in
  `scripts/openrouter-agents.mjs`.
- **`eb_taste_v1`** bildet ein Profil. Das ist die Kategorie, für die TDDDG § 25 gemacht
  wurde — hier ist eine wirksame Einwilligung nicht Auslegungssache.
- **`eb_ai_chat_v1_*`** enthält, was Nutzer dem Assistenten geschrieben haben. Inhalt, den
  der Nutzer selbst erzeugt hat, aber unbegrenzt liegend und ohne Löschweg in der Oberfläche.

## sessionStorage

| Key | Klasse | Inhalt | Modul |
|---|---|---|---|
| `eventboerse_pending_login_otp` | essenziell | Einmalcode während der Anmeldung | `core/30-auth.js` |

## HTTP-Cookies

| Name | Klasse | TTL | HttpOnly | Secure | SameSite | Zweck |
|---|---|---|---|---|---|---|
| `wordpress_logged_in_*` | essenziell | Session | ✓ | ✓ | Lax | WP-Auth |
| `wordpress_sec_*` | essenziell | Session | ✓ | ✓ | Lax | WP-Auth-Hash |
| `wp-settings-*` | funktional | 1 Jahr | – | ✓ | Lax | WP-Admin-UI-State |

> **Keine Tracking-Cookies, kein Google Analytics, kein Facebook-Pixel.**
>
> Die früher hier geführten `eb_csrf` und `eb_consent_v` sind gestrichen: sie werden weder
> in `functions.php` noch in `webauthn.php` noch im Frontend gesetzt. Sie standen als Plan
> in der Liste und lasen sich wie Bestand. Der CSRF-Schutz läuft über den
> WordPress-Nonce (`X-WP-Nonce`), nicht über ein eigenes Cookie.

## IndexedDB

Nicht eingesetzt.

## Service-Worker / Cache-Storage

Nicht eingesetzt (bewusste Entscheidung — siehe [[20-System/Architecture/Performance]]).

## Drittanbieter

| Anbieter | Wann geladen | Cookies |
|---|---|---|
| **Stripe** (`js.stripe.com`) | nur im Checkout-Flow | `__stripe_mid`, `__stripe_sid` — essenziell für die Zahlung |
| **OpenStreetMap-Tiles** | Karten-Modul | keine Cookies (Tiles sind statisch), aber IP-Übertragung |
| **Leaflet** (`unpkg.com`) | Karten-Modul | keine Cookies, IP-Übertragung an den CDN |
| **Google Fonts** | aktuell remote (geplant: self-host) | keine Cookies, aber IP-Übertragung |

## Cookie-Banner: Soll und Ist

**Soll:**

```
1. Erstbesuch → Banner mit "Akzeptieren / Ablehnen / Einstellungen"
2. Vor Klick: NUR essenzielle Schlüssel werden gesetzt
3. "Ablehnen" → funktionale und profilbildende Schlüssel bleiben aus
4. "Akzeptieren" → eb_cookie_consent wird geschrieben, alle freigegeben
5. Im Footer "Cookie-Einstellungen" jederzeit widerrufbar
```

**Ist (gemessen, 20.08.2026): alle fünf Schritte laufen.**

Bis zum 20.08. liefen nur 1 und 4. `eb_cookie_consent` wurde gesetzt und danach von
**keiner** schreibenden Stelle gelesen — und der Banner hatte überhaupt nur einen Knopf
(„Verstanden"), also gar keine Wahl. Dazu behaupteten Banner, Cookie-Richtlinie und
Datenschutzerklärung übereinstimmend „ausschließlich technisch notwendige Cookies",
während `eb_taste_v1` ein Präferenzprofil und `eb_radar_ort` den Standort ablegte. Das
war nicht nur eine wirkungslose Einwilligung, sondern eine **Falschaussage in drei
Rechtstexten**.

Seitdem entscheidet die Antwort wirklich: `ebSpeichern()` in
`js/modules/core/00-basis.js` prüft vor jedem nicht-essenziellen Schreibvorgang, alle 20
betroffenen Schreibstellen laufen darüber, und ein Widerruf löscht das bereits
Gespeicherte (`ebSpeicherAufraeumen()`, Art. 7 Abs. 3 DSGVO). Die Klassentabelle
`EB_SPEICHER_KLASSEN` ist die Codeseite dieser Notiz; `recht.mjs --check` vergleicht
beide und bricht bei Abweichung ab.

**Weiterhin anwaltlich zu prüfen:** die Einordnung einzelner Zeilen als „funktional"
statt „profilbildend" — besonders `eb_ai_chat_v1_*` und `eb_radar_ort`.

Das ist rechtlich ungünstiger als gar kein Banner: das Banner belegt, dass die
Einwilligungspflicht erkannt wurde, und die Software hält sie nicht ein. Die Behebung
ändert sichtbares Verhalten (abgelehnte Einwilligung = kein gemerkter Farbmodus, keine
gespeicherte Suche, kein Präferenzprofil) und ist deshalb eine **Entscheidung des
Inhabers**, kein automatischer Patch. `scripts/recht.mjs` meldet den Zustand bei jedem
Lauf, blockiert aber nicht — ein Tor, das jeden PR sperrt, bis eine Produktentscheidung
gefallen ist, wird abgeschaltet und prüft danach gar nichts mehr.

## Pflichten gegenüber Nutzern

- Cookie-Richtlinie ([[40-Governance/Legal/Compliance-Overview]] B03) listet **diese Tabelle**.
- Bei Änderungen: `eb_cookie_consent.v` erhöhen → Banner erscheint erneut.
- DSGVO Art. 7(3): Widerruf so einfach wie Erteilung — Footer-Link „Einstellungen".
- **Neuer Schlüssel = neue Zeile hier.** Sonst bricht `recht.mjs --check` den PR ab.

## Verknüpft

- [[40-Governance/Legal/Rechtliche-Lage]] — die gemessene Fassung
- [[40-Governance/Legal/Compliance-Overview]]
- [[40-Governance/Legal/KI-Transparenz]]
- [[20-System/Frontend/State-Management]]
- [[40-Governance/Security/CSP-Headers]]
