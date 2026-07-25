---
layer: L1
domain: produkt
share: public
tags: [layer/L1, domain/produkt, share/public]
---

# User Flow: Registrierung & Login

## Registrierung (neu)

```
Startseite → "Registrieren"
       ↓
Formular: Name, E-Mail, Passwort, Rolle
(event_planer oder dienstleister)
       ↓
POST /register
→ "Bitte E-Mail bestätigen"
       ↓
Klick auf Link in E-Mail
POST /register/verify?token=...
       ↓
Account aktiv → automatischer Login
navigateTo('profile') → Profil ausfüllen
```

## Login (klassisch)

```
POST /login
→ Erfolg: Session-Token, navigateTo('home')
→ 2FA aktiv: "Code gesendet"
       ↓
POST /otp/verify → Login abgeschlossen
```

## Login (Passkey / WebAuthn)

```
"Mit Passkey anmelden" klicken
POST /webauthn/login-options → Challenge
       ↓
Browser: Fingerprint / Face ID
       ↓
POST /webauthn/login → Session-Token
navigateTo('home')
```

## Passwort vergessen

```
POST /forgot-password → Reset-Link per E-Mail
POST /reset-password?token=... → neues Passwort
```

## Verknüpfte Notizen
- [[10-Produkt/Features/Authentication]] — Technische Details
- [[20-System/Backend/Auth-API]] — Alle Auth-Endpoints
- [[20-System/Backend/WebAuthn-API]] — Passkey-Flow
- [[20-System/Komponenten/NavBar]] — Login-Button
