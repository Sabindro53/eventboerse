# Design: Web-Push-Benachrichtigungen für neue Nachrichten (selbst-gehostet, VAPID)

**Datum:** 2026-06-24 · **Bezug:** Chat-Ausbau · **Status:** Freigegeben (Ansatz A, selbst-gehostet)

## Ziel

Erhält ein Nutzer eine neue Chat-Nachricht und hat die App nicht offen/fokussiert, bekommt er
eine **System-Push-Benachrichtigung** (Absender + Vorschau, Klick → öffnet den Chat). Komplett
**selbst-gehostet** (VAPID / RFC 8291), keine Fremddienste, kein Composer.

## Machbarkeit (geprüft)

PHP 8.4 auf der Maschine: `hash_hkdf`, `openssl_pkey_derive` (ECDH P-256), `aes-128-gcm`,
ES256-Signatur **vorhanden**. EC-Keygen lokal nur durch fehlende `openssl.cnf` (macOS) blockiert
— auf Linux/IONOS praktisch immer ok. **Task 0 (Probe) bestätigt es live**, bevor die Krypto
fest verbaut wird.

## Architektur / Pipeline

```
Settings-Toggle → permission + pushManager.subscribe(VAPID-pub)
  → POST /push/subscribe {endpoint,p256dh,auth} → user_meta eb_push_subs[]
Neue Nachricht (eb_messages_send)
  → Empfänger-Subs laden → je Sub: VAPID-JWT + RFC-8291-Verschlüsselung → wp_remote_post(endpoint)
  → 404/410 → Sub löschen (Cleanup)
sw.js push → (kein fokussierter Tab?) showNotification ; notificationclick → /#chat/{id}
```

## Komponenten

### Task 0 — Capability-Probe (live, admin-only)

REST-Endpoint `GET /push/selftest` (admin-only): erzeugt EC-P-256-Keypair, leitet einen
ECDH-Schlüssel ab, führt einen `aes-128-gcm`-Roundtrip + `hash_hkdf` aus → JSON
`{ ec_keygen, ecdh, aesgcm, hkdf, php }`. Grün = Ansatz A tragfähig auf IONOS.

### VAPID-Setup

Einmalig: EC-P-256-Keypair erzeugen, in `wp_options` (`eb_vapid_pub`, `eb_vapid_priv` als PEM)
ablegen (lazy beim ersten Bedarf, mit Lock). Public Key (uncompressed point, base64url) an den
Client via `GET /push/vapid-public` oder im `eventboerseApi`-Inline-Config-Objekt.

### Subscription (Client + Server)

- **Client:** `eb_enablePush()` (vom Settings-Toggle): `Notification.requestPermission()` →
  `registration.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey:<vapid-pub> })`
  → `POST /push/subscribe { endpoint, keys:{p256dh,auth} }`. `eb_disablePush()`:
  `subscription.unsubscribe()` + `POST /push/unsubscribe { endpoint }`.
- **Server:** `eb_push_subscribe` speichert die Subscription in user_meta `eb_push_subs`
  (JSON-Array, dedupliziert per endpoint; mehrere Geräte möglich). `eb_push_unsubscribe` entfernt sie.

### Service Worker (sw.js)

- `addEventListener('push', …)`: Payload (JSON: title, body, convId, icon) entschlüsselt der
  Browser bereits → `event.waitUntil(self.registration.showNotification(title, {body, data:{convId}, icon, tag}))`.
  **Unterdrückung:** vorher `clients.matchAll({type:'window'})` — ist ein Fenster **fokussiert**,
  keine Notification (App ist offen).
- `addEventListener('notificationclick', …)`: Fenster fokussieren/öffnen auf `/#chat/{convId}`.

### Senden (Server-Krypto)

- Helper `eb_webpush_send( $sub, $payload_json )`:
  - **VAPID-JWT** (ES256): Header `{typ:JWT,alg:ES256}`, Claims `{aud:<origin(endpoint)>, exp:now+12h, sub:mailto:…}`; `openssl_sign` SHA256 → DER→raw R||S (64 B) → base64url.
  - **RFC 8291 (`aes128gcm`):** ephemerales EC-P-256-Keypair; ECDH mit `p256dh`; `salt`(16 rand);
    IKM = HKDF(auth, ecdh, "WebPush: info\0"+ua_pub+as_pub, 32); CEK = HKDF(salt, IKM, "Content-Encoding: aes128gcm\0", 16); nonce = HKDF(salt, IKM, "Content-Encoding: nonce\0", 12);
    Body = `salt | rs(4=4096) | idlen(1=65) | as_pub(65) | AES128GCM(plaintext+0x02)`.
  - `wp_remote_post($endpoint, headers:{Authorization:"vapid t=…,k=…", Content-Encoding:"aes128gcm", TTL:…, Content-Type:"application/octet-stream"}, body)`.
- **Aufruf** in `eb_messages_send` (nach erfolgreichem Insert, nur für Nicht-System-Nachrichten):
  Empfänger bestimmen; **Last-Gate:** überspringen, wenn Empfänger-Heartbeat < ~45 s alt (App
  vermutlich offen — SW würde ohnehin unterdrücken); sonst je Sub `eb_webpush_send`. Bei
  HTTP **404/410** die Subscription aus user_meta entfernen.
- **Payload:** `{ title:"<Absender>", body:"<kurze Vorschau / '📷 Bild'>", convId, icon }`. Keine
  sensiblen Details über die Vorschau hinaus.

### UI

- Settings-Seite: Toggle „Push-Benachrichtigungen" (`#settingsPushToggle`), Zustand aus
  `Notification.permission` + ob eine aktive Subscription existiert. An → `eb_enablePush()`,
  aus → `eb_disablePush()`. Hinweis bei iOS (nur als installierte PWA).

## Edge Cases / Sicherheit / Privacy

- **Doppel-Ping vermeiden:** SW unterdrückt bei fokussiertem Fenster; Server-Heartbeat-Gate.
- **iOS:** Push nur als Home-Screen-PWA (iOS 16.4+) — im UI-Hinweis dokumentiert.
- **Mehrere Geräte:** user_meta-Array; pro Gerät eine Sub.
- **Abgelaufene Subs:** 404/410 → Cleanup.
- **Self-Push** nie (nur Empfänger).
- **E2E:** Payload ist verschlüsselt (Push-Service kann nicht mitlesen); VAPID authentifiziert den Absender.
- **Krypto-Risiko (ehrlich):** RFC-8291-Verschlüsselung von Hand; **headless nicht verifizierbar**.
  Absicherung: Task-0-Probe + aussagekräftiges Logging der Push-Service-Antwort + dein echter Geräte-Test.

## Verifikation

- `php -l`, `node --check`, Rebuild `index.html` (Settings-Toggle).
- Live (von mir): `/push/selftest` (admin) grün; `/push/subscribe` unauth → 401 (kein 500);
  `/push/vapid-public` liefert Key.
- **Geräte-Test (Nutzer):** Push aktivieren (Desktop-Chrome/Android), App schließen/Tab unfokussiert,
  von zweitem Konto Nachricht senden → System-Push erscheint, Klick öffnet den Chat. Push-Service-
  Antworten (201/4xx) im Server-Log prüfen.

## Offene Punkte

- `sub`-Mailto für VAPID-Claims (Kontakt-Adresse) — `kontakt@eventbörse.de` (im Plan fixieren).
- Genaue Settings-Toggle-Platzierung → im Plan via Audit der Settings-Seite.
