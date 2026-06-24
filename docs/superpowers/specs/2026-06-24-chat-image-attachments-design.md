# Design: Bild-Anhänge im Chat

**Datum:** 2026-06-24 · **Bezug:** Chat-Ausbau · **Status:** Freigegeben (`type:'image'`)

## Ziel

Den vorhandenen „Anhang"-Button (`chat-attach-btn`, aktuell Stub) funktional machen: ein **Bild**
im Chat senden und als Vorschau anzeigen (Klick → Lightbox). Nur Bilder — der gehärtete
`/upload`-Endpoint akzeptiert ausschließlich Bilder.

## Reuse (vorhanden)

- **`/upload`** (`eb_handle_upload`): jpeg/png/webp/gif, 5 MB, `wp_check_filetype_and_ext`
  (Magic-Bytes), mimes-Override-Allowlist. Liefert die Bild-URL.
- **Client `uploadFile(file)`** (app.js ~1038): FormData-Upload → URL.
- **Lightbox** (`openGalleryLightbox` / `galleryLightbox`-Markup) zur Vergrößerung.

## Nachrichtenformat

`POST …/messages { content:<bild-url>, type:'image' }`. `body` = reine Bild-URL (kein JSON).
Render & Mail erkennen `msg_type === 'image'`.

## Komponenten

### 1. Senden (Client)

- Verstecktes `<input type="file" accept="image/*" id="chatImageInput">` (app-shell, im Chat).
- `chat-attach-btn` `onclick` → `chatImageInput.click()`.
- `onchange` → `_sendChatImage(file)`:
  - Optimistischer Platzhalter im Chat („Bild wird gesendet…", Spinner).
  - `uploadFile(file)` → URL. Bei Erfolg: `POST …/messages {content:url, type:'image'}`,
    Platzhalter durch das echte Bild ersetzen (oder Poll rendert es).
  - Bei Fehler (Upload 400/timeout): Platzhalter weg + Fehler-Toast.
  - Input-Value zurücksetzen (erneuter gleicher Upload möglich).

### 2. Server (`eb_messages_send`)

- Für `type:'image'`: `body` muss eine **URL aus dem eigenen Upload-Origin** sein
  (beginnt mit `home_url()` und enthält `/wp-content/uploads/`), sonst 400 („Ungültiger
  Bild-Anhang.") — verhindert Hotlinking beliebiger URLs.
- Sonst Speicherung wie eine normale Nachricht (kein offer-/inquiry-Pfad).
- `eb_messages_list` gibt `msg_type` bereits aus → Client kennt den Typ.

### 3. Render (Chat)

Im Nachrichten-Render (beide Map-Kopien: `openChat` ~5114 **und** Poll ~4603) **vor** dem
Default-Text-Zweig: wenn `msg.msg_type === 'image'` (oder `msg.type === 'image'`) →
Bild-Bubble:
```html
<div class="msg msg-sent|msg-received chat-img-msg">
  <img class="chat-image" src="<url>" alt="Bild" loading="lazy" onclick="openChatImage('<url>')" />
  <span class="msg-time">…</span>
</div>
```
`openChatImage(url)` zeigt das Bild in der Lightbox (einfaches Single-Bild-Overlay; nutzt
`galleryLightbox` mit einem Bild oder ein dediziertes Overlay).

### 4. E-Mail

In `eb_messages_send`: ist die gesendete Nachricht `type:'image'` → Mail zeigt „📷 Bild" +
kleine Vorschau (`<img src=url width=240>`) + Deep-Link in den Chat, statt der rohen URL als Text.

## CSS

`.chat-image` (max-width ~220px, border-radius, cursor:pointer, display:block); Platzhalter
`.chat-img-uploading` (Spinner). Reduced-motion respektiert (globaler #12-Block).

## Edge Cases / Sicherheit

- **Upload-Härtung** bleibt der Gatekeeper (Typ/Größe/Magic-Bytes server-seitig).
- **URL-Origin-Check** server-seitig für `type:'image'` (kein fremdes Hotlinking).
- **Fehler:** Upload schlägt fehl → Platzhalter entfernen + Toast; kein hängender „wird gesendet".
- **Race:** mehrere schnelle Uploads → jeder eigener Platzhalter (eindeutige temp-ID).
- **Abwärtskompat:** unbekannter Typ rendert als Text (bestehend); alte Clients zeigen die URL als Text (akzeptabel).

## Verifikation

- `php -l functions.php`, `~/node-v22/bin/node --check app.js`, Rebuild `index.html` (app-shell).
- Server live (von mir): `messages`-Endpoint kein 500; `type:'image'` mit Fremd-URL → 400.
- **Eingeloggter Browser-Check (Nutzer):** Bild im Chat senden → Vorschau erscheint bei beiden,
  Klick öffnet Lightbox; Empfänger-Mail zeigt Vorschau + Link; zu großes/falsches Bild → klare Fehlermeldung.

## Offene Punkte

Keine — Bilder-only, `type:'image'`+URL, Origin-Check, Lightbox-Reuse festgelegt.
