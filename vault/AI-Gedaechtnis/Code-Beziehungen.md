# AI-Gedächtnis: Code-Beziehungen

## Modul-Abhängigkeiten

```
┌─────────────────────────────────────────────────────────┐
│                    app.js (Frontend)                    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Auth Module ←──────────────────────────→ Listings     │
│       ↓                                       ↓         │
│  User Profile ←──────────────────────→ Chat/Messages   │
│       ↓                                       ↓         │
│  Settings ←──────────────────────────→ Payments        │
│       ↓                                       ↓         │
│  Admin Panel ←──────────────────────→ Reviews          │
│                                                          │
└──────────────────────────────────────────────────────────┘
         ↕ REST API (/wp-json/eventboerse/v1/)
┌─────────────────────────────────────────────────────────┐
│                functions.php (Backend)                   │
├──────────────────────────────────────────────────────────┤
│  Auth Routes │ Listing Routes │ Message Routes           │
│  Payment Routes │ Admin Routes │ WebAuthn Routes         │
└─────────────────────────────────────────────────────────┘
         ↕
┌─────────────────────────────────────────────────────────┐
│              WordPress / MySQL Datenbank                 │
│  wp_users │ wp_usermeta │ Transients (OTP, Challenges)  │
└─────────────────────────────────────────────────────────┘
```

## Frontend → Backend Calls

### Auth-Flow Calls
| Frontend-Aktion | Backend-Endpoint |
|-----------------|-----------------|
| Registrieren Button | `POST /register` |
| Login Button | `POST /login` |
| OTP eingeben | `POST /otp/verify` |
| Passkey Button | `POST /webauthn/login` |

### Listing-Flow Calls
| Frontend-Aktion | Backend-Endpoint |
|-----------------|-----------------|
| Browse öffnen | `GET /listings` |
| Listing Detail | `GET /listings/{id}` |
| Listing erstellen | `POST /listings` |
| Foto hochladen | `POST /upload` |
| Favorit hinzufügen | `POST /favorites/{id}` |

### Chat-Flow Calls
| Frontend-Aktion | Backend-Endpoint |
|-----------------|-----------------|
| "Kontakt aufnehmen" | `POST /conversations` |
| Nachrichten laden | `GET /conversations/{id}/messages` |
| Nachricht senden | `POST /conversations/{id}/messages` |
| Angebot senden | `POST /messages/{id}` (type=offer) |
| Angebot annehmen | `PUT /messages/{id}/offer-status` |

### Zahlungs-Flow Calls
| Frontend-Aktion | Backend-Endpoint |
|-----------------|-----------------|
| "Jetzt bezahlen" | `POST /stripe/create-checkout` |
| Zahlung bestätigt | `POST /stripe/verify-payment` |
| Rechnung senden | `POST /send-invoice` |

## Externe Service-Integrationen

| Service | Zweck | Wie eingebunden |
|---------|-------|-----------------|
| Stripe | Zahlungen | Stripe.js (Frontend) + Stripe PHP SDK (Backend) |
| Leaflet.js | Karten | CDN, Tiles via OpenStreetMap |
| DiceBear | Avatare | REST API Call |
| Google Fonts | Inter Font | CSS @import |
| Material Icons | Icons | CSS @import |
| IONOS SMTP | E-Mail | PHP mail() / WordPress wp_mail() |

## Datenfluss bei Buchung

```
Event-Planer findet Dienstleister
    ↓
Konversation erstellen (POST /conversations)
    ↓
Nachrichten austauschen (Polling alle 3s)
    ↓
Dienstleister sendet Angebot (offer message)
    ↓
Event-Planer akzeptiert (PUT /messages/{id}/offer-status)
    ↓
Dienstleister sendet Rechnung (POST /send-invoice)
    ↓
Event-Planer bezahlt (Stripe Checkout)
    ↓
Webhook empfangen (POST /stripe/webhook)
    ↓
Status Update → Board: "Bezahlt"
    ↓
Event stattgefunden → Board: "Erfüllt"
    ↓
Event-Planer schreibt Bewertung (POST /reviews/{id})
```

## Verknüpfte Notizen
- [[AI-Gedaechtnis/Claude-Kontext]] — Gesamtkontext & Präferenzen
- [[AI-Gedaechtnis/Code-Stats]] — Aktuelle Code-Metriken
- [[AI-Gedaechtnis/Entscheidungen]] — Warum was so gebaut wurde
- [[Frontend/app-js-module]] — Frontend Module
- [[Backend/API-Endpoints]] — Alle REST Endpoints
