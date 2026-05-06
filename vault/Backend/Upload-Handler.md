# Backend: Upload-Handler

**Endpoint:** `POST /wp-json/eventboerse/v1/upload`
**Auth:** `is_user_logged_in()` (Capability-Layer schützt nicht — JEDER eingeloggte User darf hochladen)
**Rate-Limit:** empfohlen 20 Uploads/Stunde/User

## Request

`multipart/form-data` mit Feld `file`.

## Response

```json
{ "id": 123, "url": "https://…/wp-content/uploads/…/datei.jpg" }
```

## Error-Codes

| HTTP | Message | Bedingung |
|---|---|---|
| 400 | "Keine Datei hochgeladen." | `$files['file']` leer |
| 400 | "Upload-Fehler. Bitte erneut versuchen." | `$file['error'] !== 0` |
| 400 | "Datei zu groß. Max. 5MB." | `> 5 MB` |
| 400 | "Ungültiger Upload." | `is_uploaded_file()` false |
| 400 | "Ungültiger Dateityp. Erlaubt: JPG, PNG, WebP, GIF." | Magic-Bytes nicht in Allowlist |
| 400 | "Dateiname enthält unerlaubte Endung." | Doppel-Extension wie `*.php.jpg` |
| 400 | "Datei wurde abgelehnt (Inhalt entspricht keiner gültigen Bilddatei)." | `wp_check_filetype_and_ext` failed |
| 400 | "Datei ist kein gültiges Bild." | `getimagesize()` failed (Polyglot-Detection) |
| 500 | (`$upload['error']`) | WordPress-Upload selbst fehlgeschlagen |

## Code-Pfad

```
eb_handle_upload(WP_REST_Request $request)
  └── Validierung (siehe Security/Upload-Hardening)
  └── wp_handle_upload mit mimes-Override
  └── getimagesize() Re-Check
  └── wp_insert_attachment
  └── wp_generate_attachment_metadata
  └── return WP_REST_Response { id, url }
```

## Speicherort

`wp-content/uploads/YYYY/MM/{sanitized_filename}.jpg`

Apache blockiert Skript-Ausführung in diesem Verzeichnis (siehe [[Security/Upload-Hardening]]).

## Frontend-Integration

`app.js` → `_uploadImage(file)`:
- vor Upload Client-side-Resize via Canvas auf max 2000 px Breite
- `FormData` mit `file`-Feld
- Progress-Bar via `XMLHttpRequest.upload.onprogress`

Siehe [[Backend/API-Endpoints]], [[Security/Upload-Hardening]].
