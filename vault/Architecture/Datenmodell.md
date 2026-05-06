# Datenmodell

Wo welche Daten leben. Quelle: WordPress-DB (`wp_*`-Präfix) + eigene Custom-Tables (`wp_eb_*`).

## WordPress-Standard-Tabellen

### `wp_users`
- Klassischer WP-User. `ID` = Plattform-User-ID.
- Login-relevante Felder: `user_email`, `user_pass` (bcrypt), `user_registered`.

### `wp_usermeta`
Pro User-ID viele Key-Value-Paare. Ausgewählte eigene Keys:

| Meta-Key | Typ | Zweck |
|---|---|---|
| `eb_role` | string | `Event-Planer` \| `Dienstleister` \| `Admin` |
| `eb_phone` | string | Telefonnummer |
| `eb_company` | string | Firmenname (bei Dienstleister) |
| `eb_bio` | wp_kses_post | Bio-Text (HTML, sanitisiert) |
| `eb_photo_url` | URL | Profilbild |
| `eb_cover_url` | URL | Cover-Bild |
| `eb_2fa_enabled` | bool | 2FA aktiviert |
| `eb_2fa_secret` | string | OTP-Secret (optional, OTP läuft per Mail) |
| `eb_webauthn_credentials` | JSON | Liste registrierter Passkeys |
| `eb_email_verified` | bool | Mail bestätigt? |
| `eb_email_verify_token` | string | Einmal-Token + TTL |
| `eb_password_reset_token` | string | Einmal-Token + TTL |
| `eb_stripe_account_id` | string | Stripe Connect-ID (Express) |
| `eb_stripe_onboarded` | bool | Onboarding abgeschlossen |
| `eb_settings` | JSON | UI-/Notification-Präferenzen |

## Eigene Tabellen (`wp_eb_*`)

### `wp_eb_listings`
| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | BIGINT PK | Listing-ID |
| `user_id` | BIGINT | Provider |
| `title`, `description` | TEXT | Inhalt (description = `wp_kses_post`) |
| `category`, `category_label` | VARCHAR | z. B. `dj`, `catering` |
| `price_model`, `price_label` | VARCHAR | `pauschal` \| `pro_stunde` \| `paket` |
| `location`, `region` | VARCHAR | Stadt + Bundesland |
| `features` | JSON | Array Feature-Strings |
| `tags` | JSON | Array Tag-Strings |
| `images` | JSON | URL-Array |
| `date_from`, `date_to` | DATE | Verfügbarkeit |
| `time_from`, `time_to` | TIME | Tageszeit-Slot |
| `status` | ENUM | `active` \| `inactive` \| `pending` |
| `created_at`, `updated_at` | DATETIME | |

### `wp_eb_reviews`
| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | BIGINT PK | |
| `listing_id` | BIGINT | FK → `wp_eb_listings.id` |
| `author_id` | BIGINT | FK → `wp_users.ID` |
| `rating` | TINYINT | 1–5 |
| `comment` | TEXT | sanitisiert via `sanitize_textarea_field` |
| `created_at` | DATETIME | |

### `wp_eb_conversations`
| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | BIGINT PK | |
| `user_a`, `user_b` | BIGINT | Sortiertes Paar |
| `listing_id` | BIGINT | optionaler Listing-Bezug |
| `last_message_at` | DATETIME | Indiziert für Inbox-Sort |

### `wp_eb_messages`
| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | BIGINT PK | |
| `conversation_id` | BIGINT | FK |
| `sender_id` | BIGINT | FK |
| `body` | TEXT | `sanitize_textarea_field` |
| `msg_type` | ENUM | `text` \| `offer` \| `booking` \| `system` \| `deleted` |
| `meta` | JSON | Offer-Status, Buchungs-Snapshot |
| `created_at` | DATETIME | |

### `wp_eb_board_projects`
Pro Event-Planer mehrere Projekte. Komplette Board-State serialisiert als JSON — bewusste Entscheidung gegen normalisierte Cards-Tabelle (siehe [[AI-Gedaechtnis/Entscheidungen]]).

| Spalte | Typ | Beschreibung |
|---|---|---|
| `id` | BIGINT PK | |
| `user_id` | BIGINT | |
| `name`, `event_date` | VARCHAR/DATE | |
| `data` | LONGTEXT (JSON) | `{ cards, columns, view, … }` |
| `updated_at` | DATETIME | |

### `wp_eb_favorites`
Many-to-Many User ↔ Listing.

### `wp_eb_registrations`
Eventregistrierungen / Buchungen + Zahlungs-Status.

### `wp_eb_rate_limits`
Transient-Fallback-Tabelle für Rate-Limiter (Schlüssel + Counter + Reset-Timestamp).

## Daten-Flüsse

```
Frontend
  │ apiCall('/listings')   ← GET (öffentlich, gecacht 5min)
  │ apiCall('/messages')   ← POST (auth, rate-limited)
  ▼
functions.php
  │ sanitize_*  →  $wpdb->prepare()  →  MySQL
  │ wp_kses_post (für Bio/Description)
  │ esc_url_raw (für URLs in JSON-Spalten)
  ▼
DB (UTF8MB4)
```

Siehe [[Backend/API-Endpoints]], [[Security/Permissions]], [[Security/EBSafeHTML]].
