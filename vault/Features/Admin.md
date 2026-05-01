# Features: Admin Panel

## Überblick

Vollständiges Admin-Panel für Nutzerverwaltung, System-Diagnostik und Konfiguration.

## Funktionen

| Funktion | Beschreibung |
|----------|--------------|
| Nutzerliste | Alle registrierten User einsehen |
| Nutzer löschen | Account entfernen |
| Rollen vergeben | Admin-Rechte geben/entziehen |
| Accounts sperren | Nutzer aktivieren/deaktivieren |
| SMTP-Konfiguration | E-Mail-Einstellungen |
| Diagnostics | System-Status prüfen |
| Mail-Test | Test-E-Mail versenden |
| System-Reset | Testdaten zurücksetzen |

## Zugriffsschutz

- Nur Nutzer mit Rolle `administrator`
- `navigateTo('admin')` prüft `currentUser.role === 'admin'`
- Backend: alle `/admin/*` Endpoints prüfen WP-Admin-Berechtigung

## Betroffene Dateien

- **Frontend:** `app.js` (Admin Panel Seite)
- **Backend:** `functions.php` (13 Admin-Endpoints)

## Verknüpfte Notizen
- [[Backend/API-Endpoints]] — Admin Endpoints
- [[Features/Authentication]] — Rollen-System
- [[Architecture/Overview]] — System-Übersicht
