# Design: Inkrementelles Chat-Polling mit `updated_at` (#8 langfristig)

**Datum:** 2026-06-23 · **Katalog-Bezug:** #8 (Polling-Last, langfristiger Pfad statt SSE) · **Status:** Freigegeben

## Kontext / Entscheidung gegen SSE

SSE wurde **verworfen**: auf IONOS-Shared-Hosting belegt jede offene SSE-Verbindung dauerhaft
einen PHP-FPM-Worker → Worker-Erschöpfung bei realer Nutzerzahl (schlimmer als Polling). Der
**Request-Anzahl-/Bootstrap-Last** wurde bereits durch den **Backoff (#8, ausgeliefert)**
adressiert. Dieser Schritt senkt zusätzlich **Payload + DB-Last pro Poll** (relevant bei
langen Chats, wo aktuell jeder Poll die ganze Historie überträgt) — hosting-sicher.

## Problem

`eb_messages_list` lädt bei **jedem** Poll **alle** Nachrichten der Konversation
(`SELECT * … ORDER BY created_at ASC`). Reines `since_id` reicht nicht: Löschen
(`msg_type='deleted'`) und Angebot-Status (`offer_status`) ändern **bestehende** Zeilen
(ID unverändert) — die würden verpasst. `eb_messages` hat nur `created_at`, kein `updated_at`.

## Ziel

Der Poll überträgt nur **neue oder geänderte** Nachrichten seit dem letzten Stand — inkl.
Status-Updates (Löschen, Offer-Accept/Decline, Lesebestätigung) — ohne Funktionsregression.

## Design

### 1. Schema-Migration (functions.php) — DB-verwaltetes `updated_at`

`updated_at` wird **von MySQL automatisch** gepflegt (kein PHP-Eingriff an Schreibstellen):
`datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`. MySQL setzt es bei jedem
INSERT und bumpt es bei jedem UPDATE, das mindestens eine Spalte ändert (mark-read 0→1,
Löschen, Offer-Status, Auto-Decline) — **keine vergessene Schreibstelle möglich**.

- `$sql_messages` CREATE TABLE um `updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`
  (nach `created_at`) ergänzen — für Frischinstallationen.
- Versions-Gate in `eb_maybe_create_tables()`: `!== '2.1'` → `!== '2.2'`,
  `update_option('eb_db_version', '2.2')`.
- **Explizites** `ALTER TABLE` (Muster wie `blocked_dates`; dbDelta ist bei Spalten-Adds an
  existierenden Tabellen unzuverlässig), idempotent via `SHOW COLUMNS … LIKE 'updated_at'`:
  ```php
  ALTER TABLE {prefix}eb_messages ADD COLUMN updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at
  ```
- **Backfill** der Bestandszeilen auf ein **festes Vergangenheits-Literal** (tz-sicher, da es
  garantiert vor allen künftigen `CURRENT_TIMESTAMP`-Werten liegt — unabhängig von der
  Server-Zeitzone):
  ```php
  UPDATE {prefix}eb_messages SET updated_at = '2000-01-01 00:00:00'
  ```
  (Altnachrichten werden beim ersten Chat-Öffnen ohnehin voll geladen; `updated_at` dient nur
  dem Delta-Cursor, nicht der Anzeige/Sortierung.) **MySQL-Version:** `ON UPDATE CURRENT_TIMESTAMP`
  braucht MySQL ≥5.6.5 / MariaDB ≥10 (auf IONOS gegeben); schlägt das ALTER fehl, wird es geloggt
  und die Migration bricht nicht den Rest (try/Catch um die einzelne Query).

### 2. Keine PHP-Schreibstellen-Änderungen

Entfällt bewusst — `updated_at` ist DB-verwaltet (siehe 1). Das eliminiert das Risiko, eine
der vielen Insert/Update-Stellen (Bot-Insert, Offer-Insert, mark-read, Auto-Decline,
Offer-Status, Löschen) zu vergessen.

### 3. Endpoint `eb_messages_list`

- Optionaler `?since=<cursor>` (datetime). Mit `since`:
  `WHERE conversation_id=%d AND updated_at > %s ORDER BY updated_at ASC, id ASC` → Delta.
  Ohne `since`: volle Liste (Erstladung, abwärtskompatibel).
- **Reihenfolge:** SELECT (Delta) **vor** dem mark-read-UPDATE ausführen, damit der Anfragende
  seine eigenen, gerade gelesenen Nachrichten nicht im Delta zurückbekommt.
- Response: `{ messages: [...], cursor: <MAX(updated_at) der ganzen Konversation> }` (eine
  billige MAX-Query, damit der Cursor auch bei leerem Delta korrekt vorrückt). Format bleibt
  ansonsten unverändert (Array bei fehlendem `since` für Abwärtskompatibilität — siehe unten).

**Abwärtskompatibilität:** Ohne `since` liefert der Endpoint weiterhin das **Array** wie bisher
(der bestehende Voll-Lade-Pfad im Client erwartet ein Array). Der `cursor` wird zusätzlich als
Response-Header `X-EB-Cursor` mitgegeben ODER der Client liest bei `since`-Anfragen die neue
Objekt-Form. **Festlegung:** Endpoint gibt IMMER das Array zurück (unverändert) **plus** den
Cursor als Header `X-EB-Cursor` → kein Bruch bestehender Konsumenten.

### 4. Client (app.js)

- **Erstladung** (Chat öffnen, Voll-Fetch): `currentChat._cursor` aus `X-EB-Cursor` speichern.
- **Poll** (`_chatPollTick`): `fetch(..messages?since=<_cursor>)`; aus der Response (Delta-Array)
  **per ID mergen** in `currentChat.messages` (Upsert: vorhandene ID ersetzen, neue anhängen),
  nach `created_at` sortieren; `_cursor` aus `X-EB-Cursor` aktualisieren.
- **Backoff:** Delta-Array nicht leer → Reset auf Basis (bestehende #8-Logik, jetzt auf
  Delta-Länge statt oldCount/newCount).
- Bestehende Render-/Verhandlungsbanner-Logik läuft **unverändert** auf der vollen gemergten
  `currentChat.messages`.

## Edge Cases

- **Cursor leer/initial:** ohne `since` → Voll-Liste; Client setzt `_cursor` aus Header.
- **Uhr-/Sekundengleichheit:** `updated_at > cursor` (strikt) könnte eine im selben Sekunden-Tick
  geschriebene Nachricht verpassen, wenn cursor == deren updated_at. Mitigation: Cursor =
  MAX(updated_at) **dieser Antwort**; da datetime Sekundenauflösung hat, ist das theoretisch
  möglich. Akzeptiert für MVP (nächster Poll holt sie, da cursor sich erst bei echtem Fortschritt
  erhöht) — alternativ `>=` + Client-Dedupe per ID (der Merge ist ohnehin idempotent per ID →
  **wir nutzen `>=` nicht, sondern `>` + idempotenten ID-Merge**, Doppel schadet nicht).
- **Gelöschte/abgelehnte Offer:** kommen als geänderte Zeile im Delta → Banner/Anzeige aktualisiert.

## Verifikation

- **Migration live:** nach Deploy `eb_db_version` = `2.2` (via `/diagnostics`-Endpoint, der
  `db_version` ausgibt). Spalte `updated_at` existiert.
- **Abwärtskompat:** `eb_messages_list` ohne `since` → kein 500, Array wie bisher.
- `php -l functions.php`, `node --check app.js`.
- **Volles inkrementelles Verhalten** (Delta-Merge, Status-Sync) → Browser-Check eingeloggt
  (Nutzer): Nachricht senden/empfangen, Angebot annehmen, Löschen — alles synct; DevTools-Network
  zeigt kleine `?since=`-Responses statt voller Historie.

## Offene Punkte

Keine — Cursor via Header `X-EB-Cursor` (kein Bruch), `>`-Filter + idempotenter ID-Merge,
explizite ALTER-Migration + Backfill festgelegt.
