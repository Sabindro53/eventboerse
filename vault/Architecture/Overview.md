# Architektur-Übersicht

## System-Design

```
┌─────────────────────────────────────────────────────┐
│                    BROWSER                          │
│  ┌─────────────────────────────────────────────┐   │
│  │           app.js (SPA Router)               │   │
│  │  /browse → Listings-Ansicht                │   │
│  │  /detail → Service-Detail                  │   │
│  │  /messages → Chat                          │   │
│  │  /profile → Nutzerprofil                   │   │
│  │  /settings → Einstellungen                 │   │
│  │  /admin → Admin-Panel                      │   │
│  └──────────────┬──────────────────────────────┘   │
└─────────────────│───────────────────────────────────┘
                  │ REST API Calls
                  │ /wp-json/eventboerse/v1/
                  ▼
┌─────────────────────────────────────────────────────┐
│        SHARED HOSTING (WordPress)                  │
│  ┌─────────────────────────────────────────────┐   │
│  │         functions.php (REST API)            │   │
│  │  67 Endpoints via register_rest_route()    │   │
│  └──────────────┬──────────────────────────────┘   │
│                  │                                   │
│  ┌───────────────┼──────────────────────────────┐   │
│  │   WordPress   │  Database    │  File System  │   │
│  │   User Meta   │  wp_usermeta │  Media Files  │   │
│  └───────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## Tech Stack

### Frontend
| Technologie | Zweck |
|-------------|-------|
| Vanilla JS | SPA Logik (kein React/Vue) |
| Leaflet.js | Karten für Standortsuche |
| Flatpickr | Datepicker (DE-Lokalisierung) |
| Stripe.js | Zahlungsformular |
| Material Icons | Icon-Set |
| self-hosted SVG | Dynamische Avatare (`ebAvatar()` / `eb_avatar_url()`) |

### Backend
| Technologie | Zweck |
|-------------|-------|
| WordPress | CMS + Auth + DB |
| PHP | REST API Endpoints |
| SMTP (Hosting-Provider) | E-Mail Versand |
| WebAuthn/FIDO2 | Passkey-Authentifizierung |

### Infrastruktur
| Technologie | Zweck |
|-------------|-------|
| Shared WordPress Hosting | Hosting |
| GitHub Actions | CI/CD Pipeline |
| SFTP/lftp | Deployment |
| Let's Encrypt | SSL/TLS |

## Datenfluss

```
Nutzer-Aktion (app.js)
       ↓
fetchAPI('/wp-json/eventboerse/v1/...')
       ↓
WordPress REST Endpoint (functions.php)
       ↓
Datenbankzugriff (wp_usermeta / wp_posts)
       ↓
JSON Response → App.js → UI Update
```

## Authentifizierung

```
Normaler Login:  email + password → JWT-ähnlich (Session)
2FA:             OTP per E-Mail
WebAuthn:        Fingerprint / Face ID (Passkeys)
```

## Verknüpfte Notizen
- [[Frontend/app-js-module]] - Frontend Module
- [[Backend/API-Endpoints]] - Alle Endpoints
- [[CI-CD/Deployment]] - Deployment Pipeline
