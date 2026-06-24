# Chat-Tipp-Indikator (Piggyback) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** „{Name} schreibt…"-Indikator im offenen Chat, ohne neue Dauer-Poll-Last: gedrosseltes Sender-Signal (Transient) + Partner-Typing-Header im bestehenden Nachrichten-Poll.

**Architecture:** Server: `POST …/typing` setzt Transient (6 s); `eb_messages_list` liest das Partner-Transient → Header `X-EB-Partner-Typing`. Client: `oninput` sendet gedrosselt (4 s); Poll liest den Header → Indikator + Poll-Reset.

**Tech Stack:** PHP (`functions.php`), Vanilla-JS (`app.js`), app-shell.html + styles.css (UI). **Verifikation:** `php -l`, `node --check`, Server-Live, eingeloggter Browser-Check (Nutzer, 2 Konten).

**Spec:** `docs/superpowers/specs/2026-06-24-chat-typing-indicator-design.md`

**Sicherheitsnetz:** `git branch backup/chat-typing-2026-06-24` vor Task 1.

---

### Task 1: Server — Typing-Endpoint + Partner-Header

**Files:** Modify `functions.php`

- [ ] **Step 1: Route registrieren**

Finde den messages-Route-Block:

```php
    register_rest_route( 'eventboerse/v1', '/conversations/(?P<id>\d+)/messages', array(
```

Füge **direkt vor** diesem `register_rest_route(... '/messages' ...)` den typing-Block ein:

```php
    register_rest_route( 'eventboerse/v1', '/conversations/(?P<id>\d+)/typing', array(
        'methods'             => 'POST',
        'callback'            => 'eb_typing_set',
        'permission_callback' => 'is_user_logged_in',
    ) );
```

- [ ] **Step 2: Handler (neben eb_messages_list)**

Direkt **vor** `function eb_messages_list(` einfügen:

```php
function eb_typing_set( WP_REST_Request $request ) {
    global $wpdb;
    $conv_id = absint( $request['id'] );
    $uid     = get_current_user_id();
    $conv = $wpdb->get_row( $wpdb->prepare(
        "SELECT user_a, user_b FROM {$wpdb->prefix}eb_conversations WHERE id = %d AND (user_a = %d OR user_b = %d)",
        $conv_id, $uid, $uid
    ) );
    if ( ! $conv ) {
        return new WP_REST_Response( array( 'message' => 'Nicht autorisiert.' ), 403 );
    }
    set_transient( 'eb_typing_' . $conv_id . '_' . $uid, 1, 6 );
    return new WP_REST_Response( null, 204 );
}
```

- [ ] **Step 3: Partner-Typing-Header in eb_messages_list**

Finde (der #8-Cursor-Block am Ende von `eb_messages_list`):

```php
    if ( $cursor ) { $resp->header( 'X-EB-Cursor', $cursor ); }
    return $resp;
```

Ersetze durch:

```php
    if ( $cursor ) { $resp->header( 'X-EB-Cursor', $cursor ); }
    // Tipp-Indikator: tippt der Partner gerade? (Transient, piggyback)
    $partner_uid = ( (int) $conv->user_a === $uid ) ? (int) $conv->user_b : (int) $conv->user_a;
    if ( $partner_uid && get_transient( 'eb_typing_' . $conv_id . '_' . $partner_uid ) ) {
        $resp->header( 'X-EB-Partner-Typing', '1' );
    }
    return $resp;
```

- [ ] **Step 4: Lint + Commit**

```bash
php -l functions.php
git add functions.php
git commit -m "#typing Server: /typing-Endpoint (Transient) + X-EB-Partner-Typing-Header

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Client — Senden, Lesen, Anzeigen

**Files:** Modify `app.js`

- [ ] **Step 1: Throttled Ping + Indikator-Funktionen**

Direkt **vor** `function sendMessage()` einfügen:

```js
var _lastTypingPing = 0;
function _onChatInput() {
  if (!currentChat || !currentChat.id || document.hidden) return;
  var now = Date.now();
  if (now - _lastTypingPing < 4000) return; // Drossel: max 1×/4s
  _lastTypingPing = now;
  fetch(_apiUrl('conversations/' + currentChat.id + '/typing'), {
    method: 'POST', credentials: 'same-origin', headers: _apiHeaders()
  }).catch(function(){});
}
function _showTypingIndicator() {
  var el = document.getElementById('chatTypingIndicator');
  if (!el || !currentChat) return;
  var nameEl = document.getElementById('chatTypingName');
  if (nameEl) nameEl.textContent = (currentChat.name || 'Jemand');
  el.style.display = '';
}
function _hideTypingIndicator() {
  var el = document.getElementById('chatTypingIndicator');
  if (el) el.style.display = 'none';
}
```

- [ ] **Step 2: Header im Poll lesen**

Finde (Poll-Fetch in `_chatPollTick`):

```js
      .then(function(r) { var _cur = r.headers.get('X-EB-Cursor'); return r.json().then(function(m){ return { delta: m, cursor: _cur }; }); })
```

Ersetze durch:

```js
      .then(function(r) { var _cur = r.headers.get('X-EB-Cursor'); var _typ = r.headers.get('X-EB-Partner-Typing'); return r.json().then(function(m){ return { delta: m, cursor: _cur, typing: _typ }; }); })
```

- [ ] **Step 3: Indikator schalten + Poll-Reset (im Merge-Handler)**

Finde (im Poll-`.then(function(res){…}`, nach `var hadDelta = delta.length > 0;`):

```js
        var hadDelta = delta.length > 0;
```

Füge **direkt darunter** ein:

```js
        if (res.typing === '1') { _showTypingIndicator(); _chatPollDelay = _CHAT_POLL_BASE; }
        else { _hideTypingIndicator(); }
```

- [ ] **Step 4: Syntax + Commit**

```bash
~/node-v22/bin/node --check app.js && echo OK
git add app.js
git commit -m "#typing Client: gedrosseltes Ping + X-EB-Partner-Typing lesen + Indikator schalten

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: UI — Markup + CSS

**Files:** Modify `app-shell.html`, `styles.css`; regenerate `index.html`

- [ ] **Step 1: Indikator-Markup (app-shell.html)**

Finde:

```html
            <div class="chat-input-bar" id="chatInputBar">
```

Füge **direkt davor** ein:

```html
            <div class="chat-typing-indicator" id="chatTypingIndicator" style="display:none" aria-live="polite">
              <span id="chatTypingName">Jemand</span> schreibt
              <span class="cti-dots" aria-hidden="true"><i></i><i></i><i></i></span>
            </div>
```

- [ ] **Step 2: `oninput` am Chat-Eingabefeld**

Finde:

```html
              <input type="text" id="chatInput" placeholder="Nachricht schreiben..." onkeypress="handleChatKeypress(event)" />
```

Ersetze durch:

```html
              <input type="text" id="chatInput" placeholder="Nachricht schreiben..." onkeypress="handleChatKeypress(event)" oninput="_onChatInput()" />
```

- [ ] **Step 3: CSS (ans Ende von styles.css, vor dem #12-Reduced-Motion-Block)**

```css
/* Chat-Tipp-Indikator (#typing) */
.chat-typing-indicator {
  display: flex; align-items: center; gap: 6px;
  padding: 4px 16px 6px; font-size: 13px; color: var(--text-light, #717171);
}
.cti-dots { display: inline-flex; gap: 3px; }
.cti-dots i {
  width: 5px; height: 5px; border-radius: 50%; background: currentColor;
  opacity: .35; animation: ctiPulse 1.2s ease-in-out infinite;
}
.cti-dots i:nth-child(2) { animation-delay: .2s; }
.cti-dots i:nth-child(3) { animation-delay: .4s; }
@keyframes ctiPulse { 0%, 100% { opacity: .3; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-2px); } }
```

- [ ] **Step 4: index.html bauen + Lints + Commit**

```bash
cd ~/Documents/eventboerse
./build-index-html.sh
~/node-v22/bin/node --check app.js && php -l index.php
git add app-shell.html styles.css index.html
git commit -m "#typing UI: Indikator-Markup + oninput + Punkte-Animation

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Deploy + Verifikation

- [ ] **Step 1: Lints + Rebase + Push**

```bash
php -l functions.php && ~/node-v22/bin/node --check app.js
git fetch origin && git log --oneline HEAD..origin/main   # leer? sonst rebase
git push origin main
```

- [ ] **Step 2: Deploy abwarten + Server-Smoke**

```bash
D=https://xn--eventbrse-57a.de
for i in $(seq 1 12); do curl -s "$D/wp-content/themes/eventboerse/app.js?cb=$(date +%s)" | grep -q 'X-EB-Partner-Typing' && { echo live; break; }; sleep 15; done
# typing-Endpoint existiert & kein 500 (unauth → 401)
curl -s -o /dev/null -w "typing unauth: HTTP %{http_code}\n" -X POST "$D/wp-json/eventboerse/v1/conversations/1/typing"
curl -s -o /dev/null -w "homepage: HTTP %{http_code}\n" "$D/"
```
Expected: `X-EB-Partner-Typing` im Bundle; typing-Endpoint 401 (kein 500); Homepage 200.

- [ ] **Step 3: Browser-Verifikation (Nutzer, 2 Konten)**

A tippt im Chat → B sieht „A schreibt…" innerhalb ~5 s; verschwindet nach Tippende/Nachricht.
DevTools-Network: nur gedrosselte `…/typing`-Pings (max ~1/4 s) + normale Polls — keine Last-Spitzen.

---

## Self-Review

**Spec-Coverage:** typing-Endpoint + Header (Task 1) ✓; Ping/Lesen/Anzeigen (Task 2) ✓; UI/CSS (Task 3) ✓; Verifikation (Task 4) ✓. Hidden-Guard + Throttle + Poll-Reset enthalten.

**Placeholder-Scan:** Vollständiger Code je Step; keine TBD.

**Konsistenz:** Header-Name `X-EB-Partner-Typing` identisch Server (Task 1) ↔ Client (Task 2). Transient-Key `eb_typing_{conv}_{uid}` identisch Setzen (Handler) ↔ Lesen (messages_list, Partner-UID). `_chatPollDelay`/`_CHAT_POLL_BASE` aus #8 wiederverwendet. `currentChat.name` als Anzeigename (von openChat gesetzt).
