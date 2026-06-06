# Backend: Admin API

**Datei:** `functions.php` | **Base:** `/wp-json/eventboerse/v1/admin/`
**Zugriff:** Nur `administrator` Rolle

## Endpoints

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| GET | `/admin/users` | Alle registrierten Nutzer |
| GET/PUT | `/admin/user-tags` | Tags eines Nutzers |
| GET | `/admin/all-tags` | Alle vergebenen Tags |
| DELETE | `/admin/delete-user/{id}` | Nutzer löschen |
| POST | `/admin/make-admin` | Admin-Rolle vergeben |
| GET | `/admin/list-admins` | Alle Admins |
| POST | `/admin/init` | System initialisieren |
| POST | `/admin/change-role` | Nutzer-Rolle ändern |
| POST | `/admin/revoke-admin` | Admin-Rechte entziehen |
| POST | `/admin/toggle-active` | Account sperren/entsperren |
| GET/POST | `/admin/smtp` | SMTP-Konfiguration lesen/schreiben |
| GET/POST | `/admin/hide-demo` | Demo-Daten global ein-/ausblenden |
| POST | `/admin/toggle-demo` | Legacy-Demo-Toggle |
| POST | `/admin/seed-test-listing` | Test-Listing erzeugen |
| POST | `/admin/reset` | Testdaten zurücksetzen |
| GET | `/diagnostics` | System-Status (DB, Mail, API) |
| POST | `/diagnostics/test-mail` | Test-E-Mail senden |

## Abgleich 2026-06-06

Die ältere Doku/Produktanforderung für `POST /admin/listings/{id}/hide` ist fachlich weiterhin relevant, aber im aktuellen `functions.php` nicht als REST-Route registriert. Vor dem nächsten Admin-Moderations-Fix zuerst Code und Live-UI prüfen, dann Route/Creator-Historie gezielt wiederherstellen.

## Verknüpfte Notizen
- [[Features/Admin]] — Frontend Admin-Panel
- [[Features/Authentication]] — Rollen-System
- [[Backend/API-Endpoints]] — Alle Endpoints
