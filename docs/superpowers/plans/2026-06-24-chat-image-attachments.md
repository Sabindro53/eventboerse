# Bild-Anhänge im Chat — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bilder im Chat senden + anzeigen (Klick → Lightbox), via gehärtetem `/upload` + `uploadFile()`; Nachricht `type:'image'`, body=URL.

**Architecture:** Client lädt Bild hoch (reuse) → sendet `type:'image'`-Nachricht (body=URL). Server validiert URL-Origin. Render-Dispatch (3 Maps) bekommt einen Image-Zweig → Bild-Bubble + Lightbox. E-Mail zeigt Vorschau.

**Tech Stack:** PHP (`functions.php`), Vanilla-JS (`app.js`), app-shell.html + styles.css. **Verifikation:** `php -l`, `node --check`, Server-Live, eingeloggter Browser-Check.

**Spec:** `docs/superpowers/specs/2026-06-24-chat-image-attachments-design.md`

**Sicherheitsnetz:** `git branch backup/chat-img-2026-06-24` vor Task 1.

---

### Task 1: Senden (Client + app-shell)

**Files:** Modify `app.js`, `app-shell.html`

- [ ] **Step 1: Verstecktes File-Input + Button-Wiring (app-shell)**

Finde:

```html
              <button class="chat-attach-btn" title="Anhang" aria-label="Anhang">
                <span class="material-icons-round">attach_file</span>
              </button>
```

Ersetze durch:

```html
              <input type="file" id="chatImageInput" accept="image/*" style="display:none" onchange="_sendChatImage(this)" />
              <button class="chat-attach-btn" title="Bild anhängen" aria-label="Bild anhängen" onclick="document.getElementById('chatImageInput').click()">
                <span class="material-icons-round">attach_file</span>
              </button>
```

- [ ] **Step 2: `_sendChatImage` (app.js, vor `sendMessage`)**

Direkt **vor** `function sendMessage()` einfügen:

```js
function _sendChatImage(input) {
  var file = input && input.files && input.files[0];
  if (input) input.value = '';
  if (!file || !currentChat || !currentChat.id) return;
  if (file.size > 5 * 1024 * 1024) { showToast('Bild zu groß! Max. 5 MB', 'error'); return; }
  showToast('Bild wird gesendet…', 'image');
  uploadFile(file).then(function(r) {
    var url = r && r.url;
    if (!url) throw new Error('Upload fehlgeschlagen.');
    return fetch(_apiUrl('conversations/' + currentChat.id + '/messages'), {
      method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
      body: JSON.stringify({ content: url, type: 'image' })
    });
  }).then(function() {
    // Sofort pollen, damit das Bild gleich erscheint (#8-Mechanik)
    _chatPollDelay = _CHAT_POLL_BASE;
    if (currentChat && currentChat.id && !document.hidden && typeof _chatPollTick === 'function') {
      clearTimeout(_chatPollTimer); _chatPollTick();
    }
  }).catch(function(err) {
    showToast((err && err.message) || 'Bild konnte nicht gesendet werden.', 'error');
  });
}
```

- [ ] **Step 3: Syntax + Commit**

```bash
~/node-v22/bin/node --check app.js && echo OK
git add app.js app-shell.html
git commit -m "#img Senden: File-Input am Anhang-Button + _sendChatImage (upload → type:'image')

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Server — Origin-Check + E-Mail

**Files:** Modify `functions.php` (`eb_messages_send`)

- [ ] **Step 1: URL-Origin-Validierung für `type:'image'`**

Finde:

```php
    $msg_type = sanitize_text_field( $params['type'] ?? 'text' );
```

Füge **direkt darunter** ein:

```php
    if ( $msg_type === 'image' ) {
        $up_base = wp_upload_dir()['baseurl'];
        if ( ! $body || strpos( $body, $up_base ) !== 0 ) {
            return new WP_REST_Response( array( 'message' => 'Ungültiger Bild-Anhang.' ), 400 );
        }
    }
```

- [ ] **Step 2: E-Mail-Zweig für Bild**

Im E-Mail-Abschnitt von `eb_messages_send` (wo `$is_offer`/`$inquiry`/generisch unterschieden wird):
für `$msg_type === 'image'` eine Bild-Mail statt der rohen URL. Konkret — finde den
generischen E-Mail-Zweig (Vorschau-Block mit `$preview`) und ergänze **davor** eine
`if ( $msg_type === 'image' )`-Verzweigung:

```php
        if ( $msg_type === 'image' ) {
            $subject = '📷 Neues Bild auf Eventbörse';
            $message  = '<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#222">';
            $message .= '<h2 style="margin:0 0 8px">📷 Neues Bild von ' . esc_html( $sender_name ) . '</h2>';
            $message .= '<img src="' . esc_url( $body ) . '" alt="Bild" style="max-width:100%;border-radius:10px;margin:12px 0" />';
            $message .= '<p style="margin:18px 0 0"><a href="' . esc_url( $chat_url ) . '" style="display:inline-block;background:#FF385C;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Im Chat ansehen</a></p>';
            $message .= '</div>';
        } else { /* bestehender generischer Zweig … */ }
```
(Exakte Verschachtelung beim Ausführen anhand des bestehenden if/else-Mailblocks wählen — der
generische Zweig wird zum `else`.)

- [ ] **Step 3: Lint + Commit**

```bash
php -l functions.php
git add functions.php
git commit -m "#img Server: Origin-Check für type:'image' + Bild-E-Mail

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Render + Lightbox (app.js)

**Files:** Modify `app.js`

- [ ] **Step 1: Helper `_renderChatImageMsg` + `openChatImage` (vor `_renderBookingCard`)**

```js
function _renderChatImageMsg(msg) {
  var cls = msg.type === 'sent' ? 'msg-sent' : 'msg-received';
  var url = msg.text || msg.content || '';
  var time = msg.time || '';
  return '<div class="msg ' + cls + ' chat-img-msg">' +
    '<img class="chat-image" src="' + _escHtml(url) + '" alt="Bild" loading="lazy" decoding="async" onclick="openChatImage(\'' + _escHtml(url) + '\')" />' +
    '<span class="msg-time">' + _escHtml(time) + '</span></div>';
}
function openChatImage(url) {
  if (typeof _galleryLightboxImages !== 'undefined') { _galleryLightboxImages = [url]; _galleryLightboxIndex = 0; }
  var img = document.getElementById('galleryLightboxImg'); if (img) img.src = url;
  var c = document.getElementById('galleryLightboxCounter'); if (c) c.textContent = '1 / 1';
  var lb = document.getElementById('galleryLightbox'); if (lb) lb.classList.add('show');
}
```

- [ ] **Step 2: Image-Zweig in ALLE drei Render-Maps**

In jeder der drei Dispatch-Ketten (Zeilen ~4643 Poll, ~5160 openChat, ~5425) — **vor** dem
finalen `} else {`-Text-Zweig (also nach dem `_isStatusMessage`-`else if`) einfügen:

```js
          } else if (msg.msg_type === 'image' || msg.type === 'image') {
            return _renderChatImageMsg(msg);
```

(Einrückung an die jeweilige Map anpassen. Anker je Map: die Zeile
`return '<div class="msg msg-system">' + _escHtml(msg.text || msg.content || '') + '</div>';`
des `_isStatusMessage`-Zweigs, direkt danach.)

- [ ] **Step 3: Syntax + Commit**

```bash
~/node-v22/bin/node --check app.js && echo OK
grep -c '_renderChatImageMsg' app.js   # ≥ 4 (1 Def + 3 Aufrufe)
git add app.js
git commit -m "#img Render: Bild-Bubble in allen 3 Maps + openChatImage-Lightbox

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: CSS + Build + Deploy + Verify

**Files:** Modify `styles.css`; regenerate `index.html`

- [ ] **Step 1: CSS (ans Ende von styles.css, vor dem #12-Block)**

```css
/* Chat-Bild-Anhänge (#img) */
.chat-img-msg { padding: 4px !important; }
.chat-image {
  display: block; max-width: 220px; max-height: 260px; width: auto; height: auto;
  border-radius: 12px; cursor: pointer; object-fit: cover;
}
```

- [ ] **Step 2: Build + Lints**

```bash
cd ~/Documents/eventboerse
./build-index-html.sh
~/node-v22/bin/node --check app.js && php -l index.php && php -l functions.php
```

- [ ] **Step 3: Commit + Rebase + Push**

```bash
git add styles.css index.html
git commit -m "#img CSS Bild-Bubble + index.html neu gebaut

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git fetch origin && git log --oneline HEAD..origin/main   # leer? sonst rebase
git push origin main
```

- [ ] **Step 4: Deploy + Server-Smoke**

```bash
D=https://xn--eventbrse-57a.de
for i in $(seq 1 12); do curl -s "$D/wp-content/themes/eventboerse/app.js?cb=$(date +%s)" | grep -q '_renderChatImageMsg' && { echo live; break; }; sleep 15; done
curl -s -o /dev/null -w "messages unauth: HTTP %{http_code} (kein 500)\n" -X POST "$D/wp-json/eventboerse/v1/conversations/1/messages" -H "Content-Type: application/json" -d '{"type":"image","content":"https://evil.example/x.jpg"}'
curl -s -o /dev/null -w "homepage: HTTP %{http_code}\n" "$D/"
```
Expected: `_renderChatImageMsg` im Bundle; messages-Endpoint kein 500 (401 unauth); Homepage 200.

- [ ] **Step 5: Browser-Verifikation (Nutzer)**

Bild im Chat anhängen → erscheint als Vorschau bei beiden, Klick öffnet Lightbox; Empfänger-Mail
zeigt Bild-Vorschau + „Im Chat ansehen"; zu großes/falsches Bild → klare Fehlermeldung;
Fremd-URL als `type:'image'` → Server-400.

---

## Self-Review

**Spec-Coverage:** Senden (Task 1) ✓; Origin-Check + Mail (Task 2) ✓; Render+Lightbox (Task 3) ✓; CSS/Build/Deploy (Task 4) ✓.

**Placeholder-Hinweis:** Task 2 Step 2 und Task 3 Step 2 verweisen für die *exakte Verschachtelung/Einrückung* auf den bestehenden Mailblock bzw. die drei Dispatch-Ketten — Code vollständig vorgegeben, nur die Einfügezeile wird zur Laufzeit fixiert.

**Konsistenz:** `type:'image'`/`msg_type:'image'` identisch in Senden (Task 1), Server (Task 2), Render (Task 3). `r.url` aus `uploadFile` (verifiziert: Endpoint gibt `{id,url}`). `_chatPollTick`/`_chatPollTimer`/`_CHAT_POLL_BASE` aus #8 reused. Lightbox-IDs `galleryLightbox*` aus bestehendem Markup.
