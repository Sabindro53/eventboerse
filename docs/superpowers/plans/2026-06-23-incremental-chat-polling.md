# Inkrementelles Chat-Polling (#8 langfristig) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chat-Poll überträgt nur neue/geänderte Nachrichten (`?since=<cursor>`) statt der ganzen Historie — DB-verwaltetes `updated_at`, abwärtskompatibler Endpoint, Client merged per ID.

**Architecture:** Gestaffelt & risikoarm. Server zuerst (Migration + `?since=`-Endpoint + `X-EB-Cursor`-Header) — abwärtskompatibel, der aktuelle Client läuft unverändert weiter (ohne `since` = volles Array). Dann Client (Render extrahieren, Delta-Merge, Cursor, Backoff). Bei fehlendem Cursor fällt der Poll auf Voll-Fetch zurück (graceful).

**Tech Stack:** WordPress/PHP (`functions.php`), MySQL (`ON UPDATE CURRENT_TIMESTAMP`), Vanilla-JS (`app.js`). **Kein Test-Harness; Client nur eingeloggt testbar** → Server verifiziere ich live (Migration/Backward-Compat), Client-Verhalten = Browser-Check des Nutzers.

**Spec:** `docs/superpowers/specs/2026-06-23-incremental-chat-polling-design.md`

**Sicherheitsnetz:** `git branch backup/incr-poll-2026-06-23` vor Task 1.

---

### Task 0: Backup

- [ ] `cd ~/Documents/eventboerse && git branch backup/incr-poll-2026-06-23`

---

### Task 1: Schema-Migration `updated_at` (functions.php)

**Files:** Modify `functions.php`

- [ ] **Step 1: Spalte in CREATE TABLE**

Finde (in `$sql_messages`):

```
        created_at datetime DEFAULT '0000-00-00 00:00:00',
```

Ersetze durch:

```
        created_at datetime DEFAULT '0000-00-00 00:00:00',
        updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
```

- [ ] **Step 2: Versions-Gate + explizite Migration**

Finde:

```php
function eb_maybe_create_tables() {
    if ( get_option( 'eb_db_version' ) !== '2.1' ) {
        eb_create_tables();
```

Ersetze `'2.1'` durch `'2.2'`. Dann finde:

```php
        update_option( 'eb_db_version', '2.1' );
    }
}
```

Ersetze durch:

```php
        // 2.2: updated_at für inkrementelles Chat-Polling (#8). Explizites ALTER,
        // da dbDelta Spalten-Adds an existierenden Tabellen unzuverlässig macht.
        $ucol = $wpdb->get_var( "SHOW COLUMNS FROM {$wpdb->prefix}eb_messages LIKE 'updated_at'" );
        if ( ! $ucol ) {
            $wpdb->query( "ALTER TABLE {$wpdb->prefix}eb_messages ADD COLUMN updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at" );
            // Backfill auf festes Vergangenheits-Literal (tz-sicher, < alle künftigen CURRENT_TIMESTAMP)
            $wpdb->query( "UPDATE {$wpdb->prefix}eb_messages SET updated_at = '2000-01-01 00:00:00'" );
        }
        update_option( 'eb_db_version', '2.2' );
    }
}
```

- [ ] **Step 3: Lint + Commit**

```bash
php -l functions.php
git add functions.php
git commit -m "#8 Schema: updated_at (ON UPDATE CURRENT_TIMESTAMP) + Migration 2.2 für eb_messages

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Endpoint `?since=` + Cursor-Header (functions.php)

**Files:** Modify `functions.php` (`eb_messages_list`, ~4356–4408)

- [ ] **Step 1: `since`-Param + bedingte WHERE + SELECT vor mark-read**

In `eb_messages_list`: die mark-read-`UPDATE`-Query (`SET is_read = 1 …`) steht aktuell **vor**
dem SELECT. Verschiebe sie **hinter** den SELECT (SELECT zuerst, dann mark-read), und ergänze
den `since`-Filter. Konkret — finde:

```php
    // Mark messages as read
    $wpdb->query( $wpdb->prepare(
        "UPDATE {$wpdb->prefix}eb_messages SET is_read = 1 WHERE conversation_id = %d AND sender_id != %d AND is_read = 0",
        $conv_id, $uid
    ) );

    $rows = $wpdb->get_results( $wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}eb_messages WHERE conversation_id = %d ORDER BY created_at ASC",
        $conv_id
    ) );
```

Ersetze durch:

```php
    // Delta-Cursor (#8): nur neue/geänderte Nachrichten seit ?since=
    $since = (string) $request->get_param( 'since' );
    if ( $since !== '' ) {
        $rows = $wpdb->get_results( $wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}eb_messages WHERE conversation_id = %d AND updated_at > %s ORDER BY created_at ASC",
            $conv_id, $since
        ) );
    } else {
        $rows = $wpdb->get_results( $wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}eb_messages WHERE conversation_id = %d ORDER BY created_at ASC",
            $conv_id
        ) );
    }

    // Mark messages as read (NACH dem SELECT, damit der Anfragende seine eigenen
    // gerade gelesenen Nachrichten nicht im Delta zurückbekommt)
    $wpdb->query( $wpdb->prepare(
        "UPDATE {$wpdb->prefix}eb_messages SET is_read = 1 WHERE conversation_id = %d AND sender_id != %d AND is_read = 0",
        $conv_id, $uid
    ) );
```

- [ ] **Step 2: Cursor-Header in der Response**

Finde:

```php
    return new WP_REST_Response( $messages, 200 );
```

Ersetze durch:

```php
    // Cursor = MAX(updated_at) der ganzen Konversation (rückt auch bei leerem Delta vor)
    $cursor = (string) $wpdb->get_var( $wpdb->prepare(
        "SELECT MAX(updated_at) FROM {$wpdb->prefix}eb_messages WHERE conversation_id = %d",
        $conv_id
    ) );
    $resp = new WP_REST_Response( $messages, 200 ); // Array bleibt (abwärtskompatibel)
    if ( $cursor ) { $resp->header( 'X-EB-Cursor', $cursor ); }
    return $resp;
```

- [ ] **Step 3: Lint + Commit + Server-Deploy**

```bash
php -l functions.php
git add functions.php
git commit -m "#8 eb_messages_list: ?since-Delta + X-EB-Cursor-Header (Array abwärtskompatibel)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git fetch origin && git log --oneline HEAD..origin/main   # leer? sonst rebase
git push origin main
```

- [ ] **Step 4: Server live verifizieren (Checkpoint vor Client)**

```bash
D=https://xn--eventbrse-57a.de
# Migration gelaufen? db_version = 2.2
for i in $(seq 1 12); do curl -s "$D/wp-json/eventboerse/v1/diagnostics?cb=$(date +%s)" | grep -q '"db_version":"2.2"' && { echo "db_version=2.2 ✓"; break; }; sleep 15; done
curl -s "$D/wp-json/eventboerse/v1/diagnostics?cb=$(date +%s)" | python3 -c "import sys,json; d=json.load(sys.stdin); print('db_version:', d.get('db_version'))"
# Backward-Compat: messages-Endpoint ohne since (unauth → 401/403, KEIN 500)
curl -s -o /dev/null -w "messages ohne since: HTTP %{http_code} (erwartet 401/403, nicht 500)\n" "$D/wp-json/eventboerse/v1/conversations/1/messages"
```
Expected: `db_version` = `2.2`; messages-Endpoint **nicht** 500. **Der alte Client läuft hier
unverändert weiter** (ohne `since` = volles Array). Bei Problemen STOP.

---

### Task 3: Render-Block extrahieren (app.js)

**Files:** Modify `app.js` (`openChat`, ~5115)

- [ ] **Step 1: Inline-Render in `_renderChatMessages()` auslagern**

In `openChat` steht `msgContainer.innerHTML = (messages || []).map(function(msg) { … }).join('')`.
Extrahiere die **map-Render-Logik** (msg → HTML) in eine wiederverwendbare Funktion, die aus
`currentChat.messages` rendert und die Scroll-Position erhält (Muster `wasAtBottom` wie im Poll):

```js
function _renderChatMessages() {
  var msgContainer = document.getElementById('chatMessages');
  if (!msgContainer || !currentChat) return;
  var wasAtBottom = (msgContainer.scrollHeight - msgContainer.scrollTop - msgContainer.clientHeight) < 60;
  msgContainer.innerHTML = (currentChat.messages || []).map(/* GLEICHE map-Funktion wie bisher in openChat */).join('');
  if (wasAtBottom) msgContainer.scrollTop = msgContainer.scrollHeight;
}
```

`openChat` ruft nach dem Setzen von `currentChat.messages` nun `_renderChatMessages()` auf
(statt des Inline-`innerHTML`). **Exakten map-Body** beim Ausführen aus dem bestehenden
`openChat`-Block übernehmen (1:1, nur Datenquelle `currentChat.messages`).

- [ ] **Step 2: Syntax + Commit**

```bash
~/node-v22/bin/node --check app.js && echo OK
git add app.js
git commit -m "#8 _renderChatMessages() aus openChat extrahiert (wiederverwendbar, scroll-erhaltend)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Poll inkrementell + Cursor + Merge (app.js)

**Files:** Modify `app.js` (`openChat` ~5063, `_chatPollTick` ~4555)

- [ ] **Step 1: Cursor bei Voll-Load lesen (`openChat`)**

`openChat`-Fetch liest den Header. Finde:

```js
function openChat(chatId) {
  fetch(_apiUrl('conversations/' + chatId + '/messages'), { credentials: 'same-origin', headers: _apiHeaders() })
    .then(function(r) { return r.json(); })
    .then(function(messages) {
```

Ersetze durch (Response-Objekt für Header behalten):

```js
function openChat(chatId) {
  fetch(_apiUrl('conversations/' + chatId + '/messages'), { credentials: 'same-origin', headers: _apiHeaders() })
    .then(function(r) { var _cur = r.headers.get('X-EB-Cursor'); return r.json().then(function(m){ return { messages: m, cursor: _cur }; }); })
    .then(function(res) {
      var messages = res.messages; var _cursor = res.cursor;
```

Und dort, wo `currentChat = { … }` gesetzt wird, ergänze `_cursor: _cursor,` als Feld
(Cursor am Chat-Objekt halten).

- [ ] **Step 2: Poll auf `?since=` + Merge umstellen (`_chatPollTick`)**

Im Poll-Fetch (`_chatPollTick`): URL um `?since=` ergänzen wenn `currentChat._cursor` gesetzt,
Header lesen, Delta **per ID mergen** statt voller Ersetzung, dann `_renderChatMessages()`.
Konkret — finde den Poll-Fetch:

```js
  fetch(_apiUrl('conversations/' + currentChat.id + '/messages'), { credentials: 'same-origin', headers: _apiHeaders() })
    .then(function(r) { return r.json(); })
    .then(function(messages) {
```

Ersetze durch:

```js
  var _q = currentChat._cursor ? ('?since=' + encodeURIComponent(currentChat._cursor)) : '';
  fetch(_apiUrl('conversations/' + currentChat.id + '/messages' + _q), { credentials: 'same-origin', headers: _apiHeaders() })
    .then(function(r) { var _cur = r.headers.get('X-EB-Cursor'); return r.json().then(function(m){ return { messages: m, cursor: _cur }; }); })
    .then(function(res) {
      if (!currentChat) return;
      var delta = res.messages || [];
      if (res.cursor) currentChat._cursor = res.cursor;
      // Merge per ID (Upsert): bestehende ersetzen, neue anhängen, nach created_at sortieren
      if (!Array.isArray(currentChat.messages)) currentChat.messages = [];
      var byId = {}; currentChat.messages.forEach(function(m){ byId[m.id] = m; });
      delta.forEach(function(m){ byId[m.id] = m; });
      currentChat.messages = Object.keys(byId).map(function(k){ return byId[k]; })
        .sort(function(a,b){ return (a.created_at||'') < (b.created_at||'') ? -1 : 1; });
      var messages = currentChat.messages; // bestehende Banner-/Render-Logik nutzt 'messages'
      var hadDelta = delta.length > 0;
```

Im weiteren Handler: die bisherige `oldCount/newCount`-Backoff-Logik durch `hadDelta` ersetzen
(`if (hadDelta) _chatPollDelay = _CHAT_POLL_BASE; else …`), das Rendern durch
`_renderChatMessages()` ersetzen, Banner-Sync läuft unverändert auf `messages`
(= volle gemergte Liste). **Exakte Anpassung beim Ausführen** anhand des bestehenden
Handler-Bodys (aus #8).

- [ ] **Step 3: Syntax + Struktur-Check**

```bash
~/node-v22/bin/node --check app.js && echo OK
grep -c '_renderChatMessages\|X-EB-Cursor\|_cursor' app.js   # mehrere Treffer
```

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "#8 Chat-Poll inkrementell: ?since-Cursor + ID-Merge + Render aus voller Liste

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Deploy + Verifikation

- [ ] **Step 1: Lints + Rebase + Push**

```bash
php -l functions.php && ~/node-v22/bin/node --check app.js
git fetch origin && git log --oneline HEAD..origin/main   # leer? sonst rebase
git push origin main
```

- [ ] **Step 2: Deploy abwarten + app.js live**

```bash
for i in $(seq 1 12); do curl -s "https://xn--eventbrse-57a.de/wp-content/themes/eventboerse/app.js?cb=$(date +%s)" | grep -q '_renderChatMessages' && { echo live; break; }; sleep 15; done
```

- [ ] **Step 3: Browser-Verifikation (Nutzer, eingeloggt)**

DevTools → Network, zwei Konten / zwei Tabs:
- Chat öffnen → ein Voll-Load, Header `X-EB-Cursor` gesetzt.
- Folge-Polls: `?since=…`-Requests mit **kleiner** Response (nur Delta), nicht die ganze Historie.
- Neue Nachricht vom Partner erscheint; **Angebot annehmen/ablehnen** und **Löschen** synct beim
  anderen (geänderte Zeile kommt im Delta). Scroll-Position bleibt erhalten, keine Dubletten.

---

## Self-Review

**Spec-Coverage:**
- Schema `updated_at` ON UPDATE CURRENT_TIMESTAMP + ALTER + Backfill + Gate 2.2 → Task 1 ✓
- Keine PHP-Schreibstellen-Edits (DB-verwaltet) → korrekt ausgelassen ✓
- Endpoint `?since` + SELECT vor mark-read + Cursor-Header (Array bleibt) → Task 2 ✓
- Client: Cursor bei Voll-Load + Poll-Merge per ID + Render aus voller Liste + Backoff via Delta → Task 3+4 ✓
- Abwärtskompat (ohne since = Array, alter Client läuft) → Task 2 + Checkpoint Task 2.4 ✓
- Verifikation Migration/Backward-Compat live + Client-Browser-Check → Task 2.4 + Task 5 ✓
- Backup → Task 0 ✓

**Placeholder-Hinweis:** Task 3 Step 1 und Task 4 Step 2 verweisen bewusst auf den
**bestehenden** map-/Handler-Body (1:1 zu übernehmen) statt ihn zu duplizieren — beim Ausführen
exakt aus dem aktuellen Code übernommen; die Transformation (Datenquelle `currentChat.messages`,
Backoff via `hadDelta`, Render via `_renderChatMessages`) ist eindeutig beschrieben.

**Risiko/Verifizierbarkeit:** Server-Teil (Task 1–2) ist live verifizierbar und abwärtskompatibel
→ kann eigenständig deployen, ohne den Client zu brechen. Client-Teil (Task 3–4) ist nur
eingeloggt voll testbar (Nutzer-Check); fällt bei fehlendem `_cursor` auf Voll-Fetch zurück.
