# Chat-Poll Backoff (#8) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chat-Poll von fixem `setInterval(5s)` auf rekursives `setTimeout` mit adaptivem Backoff (5→20s) + Hidden-Pause umstellen; Heartbeat bei Hidden-Tab pausieren.

**Architecture:** `_chatPollTick` als benannte Funktion (statt anonymer setInterval-Body); `_scheduleChatPoll` plant nächsten Tick mit `_chatPollDelay`. Backoff-Anpassung anhand `newCount/oldCount`. Reset auf Basis bei neuer Nachricht / `sendMessage` / Tab-sichtbar. Nur `app.js` betroffen (kein index.html-Rebuild).

**Tech Stack:** Vanilla-JS (`app.js`). **Kein Test-Harness** → `~/node-v22/bin/node --check`, Deploy, Browser-DevTools-Network-Stichprobe.

**Spec:** `docs/superpowers/specs/2026-06-23-chat-poll-backoff-design.md`

**Sicherheitsnetz:** `git branch backup/poll-backoff-2026-06-23` vor Task 1.

---

### Task 0: Backup

- [ ] **Step 1**

```bash
cd ~/Documents/eventboerse
git branch backup/poll-backoff-2026-06-23
```

---

### Task 1: Chat-Poll → setTimeout + Backoff + Hidden-Pause

**Files:** Modify `app.js`

- [ ] **Step 1: Poll-Start/Scheduler/Tick-Kopf (Edit A)**

Finde:

```js
function _startChatPoll() {
  _stopChatPoll();
  _chatPollTimer = setInterval(function() {
    if (!currentChat || !currentChat.id) { _stopChatPoll(); return; }
```

Ersetze durch:

```js
var _CHAT_POLL_BASE = 5000;
var _CHAT_POLL_CAP = 20000;
var _chatPollDelay = _CHAT_POLL_BASE;
function _scheduleChatPoll() {
  _chatPollTimer = setTimeout(_chatPollTick, _chatPollDelay);
}
function _startChatPoll() {
  _stopChatPoll();
  _chatPollDelay = _CHAT_POLL_BASE;
  _scheduleChatPoll();
}
function _chatPollTick() {
  if (!currentChat || !currentChat.id) { _stopChatPoll(); return; }
  if (document.hidden) { _chatPollTimer = null; return; } // Hidden-Pause: kein Fetch/Reschedule
```

- [ ] **Step 2: Backoff-Anpassung (Edit B)**

Finde:

```js
        var oldCount = currentChat.messages ? currentChat.messages.length : 0;
        var newCount = (messages || []).length;
```

Ersetze durch:

```js
        var oldCount = currentChat.messages ? currentChat.messages.length : 0;
        var newCount = (messages || []).length;
        // #8 Backoff: neue Nachricht → schnelle Basis, sonst Intervall erhöhen (Cap 20s)
        if (newCount > oldCount) { _chatPollDelay = _CHAT_POLL_BASE; }
        else { _chatPollDelay = Math.min(Math.round(_chatPollDelay * 1.6), _CHAT_POLL_CAP); }
```

- [ ] **Step 3: Tick-Ende + Reschedule + clearTimeout + visibilitychange (Edit C)**

Finde:

```js
      });
  }, 5000);
}
function _stopChatPoll() {
  if (_chatPollTimer) { clearInterval(_chatPollTimer); _chatPollTimer = null; }
}
```

Ersetze durch:

```js
      })
      .catch(function(){})
      .then(_scheduleChatPoll);
}
function _stopChatPoll() {
  if (_chatPollTimer) { clearTimeout(_chatPollTimer); _chatPollTimer = null; }
}
// #8: Tab wieder sichtbar → wenn Chat-Poll pausiert war, sofort pollen + Backoff-Reset
document.addEventListener('visibilitychange', function() {
  if (!document.hidden && currentChat && currentChat.id && _chatPollTimer === null) {
    _chatPollDelay = _CHAT_POLL_BASE;
    _chatPollTick();
  }
});
```

- [ ] **Step 4: Syntax**

```bash
~/node-v22/bin/node --check app.js && echo "JS OK"
```

- [ ] **Step 5: Struktur-Check**

```bash
grep -c '_chatPollTick\|_scheduleChatPoll' app.js   # ≥ 5 (Defs + Aufrufe)
grep -c 'setInterval.*5000\|}, 5000)' app.js         # 0 für den alten Chat-Poll
```

- [ ] **Step 6: Commit**

```bash
git add app.js
git commit -m "#8 Chat-Poll: setTimeout + adaptiver Backoff (5→20s) + Hidden-Pause

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Reset bei eigenem Senden (`sendMessage`)

**Files:** Modify `app.js`

- [ ] **Step 1: Reset einfügen**

Finde in `sendMessage` (nach dem Leeren des Eingabefelds):

```js
  const text = _sanitizeOutgoingMessage(input.value, '', { enforceFormalSignature: false });
```

…und die zugehörige Zeile `input.value = '';`. Füge **direkt nach** `input.value = '';` ein:

```js
  // #8: nach eigenem Senden Backoff zurücksetzen + zeitnah pollen
  _chatPollDelay = _CHAT_POLL_BASE;
  if (currentChat && currentChat.id && !document.hidden) { clearTimeout(_chatPollTimer); _chatPollTick(); }
```

(Falls `input.value = '';` mehrfach vorkommt: die Instanz **innerhalb `sendMessage`** wählen — direkt vor dem `fetch(_apiUrl('conversations/' + currentChat.id + '/messages')`.)

- [ ] **Step 2: Syntax**

```bash
~/node-v22/bin/node --check app.js && echo "JS OK"
```

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "#8 sendMessage: Backoff-Reset + Sofort-Poll nach eigenem Senden

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Heartbeat Hidden-Pause

**Files:** Modify `app.js`

- [ ] **Step 1: Guard einfügen**

Finde:

```js
function _sendHeartbeat() {
  if (!isLoggedIn) return;
```

Ersetze durch:

```js
function _sendHeartbeat() {
  if (!isLoggedIn) return;
  if (document.hidden) return; // #8: kein Heartbeat bei Hintergrund-Tab
```

- [ ] **Step 2: Syntax**

```bash
~/node-v22/bin/node --check app.js && echo "JS OK"
```

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "#8 Heartbeat pausiert bei Hidden-Tab

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Verifikation + Deploy

**Files:** keine

- [ ] **Step 1: Finaler Syntax-Check**

```bash
~/node-v22/bin/node --check app.js && echo "JS OK"
```

- [ ] **Step 2: Rebase + Deploy**

```bash
git fetch origin && git log --oneline HEAD..origin/main   # leer? sonst rebase
~/node-v22/bin/node --check app.js
git push origin main
```

- [ ] **Step 3: Deployte app.js prüfen**

```bash
for i in $(seq 1 12); do curl -s "https://xn--eventbrse-57a.de/wp-content/themes/eventboerse/app.js?cb=$(date +%s)" | grep -q '_CHAT_POLL_CAP' && { echo live; break; }; sleep 15; done
curl -s "https://xn--eventbrse-57a.de/wp-content/themes/eventboerse/app.js?cb=$(date +%s)" | grep -oE '_CHAT_POLL_(BASE|CAP)|_scheduleChatPoll|if \(document.hidden\) return; // #8' | sort | uniq -c
```
Expected: `_CHAT_POLL_BASE/CAP`, `_scheduleChatPoll`, Heartbeat-Guard im ausgelieferten Bundle.

- [ ] **Step 4: Browser-Verhalten (manuell, durch Nutzer)**

DevTools → Network, eingeloggt, offener Chat:
- ~5 s-Polls auf `…/messages`; nach ~1 min ohne neue Nachricht Intervall sichtbar gewachsen (~20 s).
- Tab in Hintergrund → `…/messages`- und `…/heartbeat`-Requests **stoppen**.
- Zurück in den Vordergrund → sofort ein Poll, danach wieder ~5 s.
- Eigene Nachricht senden → sofortiger Poll + Reset auf 5 s.

---

## Self-Review

**Spec-Coverage:**
- setInterval→setTimeout + Backoff 5→20s ×1,6 → Task 1 Step 1–3 ✓
- Hidden-Pause (kein Fetch/Reschedule, _chatPollTimer=null) → Task 1 Step 1 ✓
- visibilitychange-Resume (Reset + Sofort-Poll) → Task 1 Step 3 ✓
- Reset bei neuer Nachricht (newCount>oldCount) → Task 1 Step 2 ✓
- Reset bei sendMessage → Task 2 ✓
- Heartbeat Hidden-Pause → Task 3 ✓
- Board-Sync/Inactivity unangetastet → kein Task ✓
- Backup → Task 0 ✓

**Placeholder-Scan:** Alle Edits zeigen vollständigen Code; keine TBD.

**Typ-/Namens-Konsistenz:** `_chatPollTimer` jetzt setTimeout-Handle (clearTimeout in `_stopChatPoll`). `_chatPollTick`/`_scheduleChatPoll`/`_chatPollDelay`/`_CHAT_POLL_BASE`/`_CHAT_POLL_CAP` durchgängig identisch. `_chatPollTick` wird vor erster Nutzung definiert (Funktions-Hoisting greift; Aufrufe zur Laufzeit). visibilitychange-Listener prüft `_chatPollTimer === null` (= pausiert/gestoppt) + aktiver `currentChat`.
