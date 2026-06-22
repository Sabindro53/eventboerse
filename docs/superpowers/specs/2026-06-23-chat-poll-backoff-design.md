# Design: Chat-Poll auf adaptiven Backoff + Hidden-Pause (#8)

**Datum:** 2026-06-23 · **Katalog-Bezug:** #8 (Polling-Last, kurzfristiger Pfad) · **Status:** Entwurf zur Freigabe

## Problem

Jeder Poll = voller WordPress-Bootstrap auf IONOS-Shared-Hosting. Der **Chat-Poll** läuft
fix alle **5 s** (`setInterval`, app.js ~4545) — **auch wenn der Tab im Hintergrund ist** und
**auch wenn seit Minuten keine neue Nachricht kam**. Bei wachsender Nutzerzahl skaliert das
schlecht.

**Schon optimiert (kein Handlungsbedarf):**
- **Board-Sync** (8 s) pausiert bereits bei `document.hidden` (`visibilityState`-Check im
  Poll) und synct bei Rückkehr via `visibilitychange`/`focus`/`online`.
- **Inactivity-Check** (30 s) ist client-seitig, hat `visibilitychange`.

**Lücke:** Der Chat-Poll hat **weder** Hidden-Pause **noch** Backoff. (Sekundär: der
**Heartbeat** (30 s) sendet auch bei Hidden-Tab.)

## Ziel

Der Chat-Poll belastet den Server nur so viel wie nötig: schnell bei aktivem Chatten,
langsamer bei Inaktivität, **gar nicht** bei Hintergrund-Tab — ohne spürbare Latenz, wenn
der User zurückkehrt oder selbst schreibt.

## Nicht-Ziele

- SSE/WebSockets (langfristiger Pfad, separat).
- Board-Sync (schon optimiert) — unangetastet.
- Inactivity-Logik — unangetastet.

## Design

### Chat-Poll: `setInterval` → rekursives `setTimeout` mit Backoff

State:
```js
var _CHAT_POLL_BASE = 5000;   // schnelle Basis
var _CHAT_POLL_CAP  = 20000;  // langsamste Frequenz
var _chatPollDelay  = _CHAT_POLL_BASE;
var _chatPollTimer  = null;   // jetzt setTimeout-Handle
```

Ablauf pro Tick (`_chatPollTick`):
1. Kein `currentChat` → Poll stoppen (wie bisher).
2. `document.hidden` → **kein Fetch**; Timer NICHT neu planen (vollständige Pause; der
   visibilitychange-Listener startet neu).
3. Sonst: bestehende Fetch-/Render-Logik ausführen. Danach:
   - **Neue Nachricht** (`newCount > oldCount`) → `_chatPollDelay = _CHAT_POLL_BASE` (Reset).
   - **Keine neue** → `_chatPollDelay = Math.min(Math.round(_chatPollDelay * 1.6), _CHAT_POLL_CAP)`
     (Kurve: 5 → 8 → 12,8 → 20 s, dann Cap 20 s).
4. `_scheduleChatPoll()` plant den nächsten Tick mit `_chatPollDelay`.

`_startChatPoll()` setzt `_chatPollDelay = BASE` und ruft `_scheduleChatPoll()`.
`_stopChatPoll()` macht `clearTimeout(_chatPollTimer)`.

### Reset-Trigger (zurück auf schnelle Basis + sofort pollen)

- **Tab wird sichtbar** (`visibilitychange`, nur wenn Chat-Poll aktiv): `_chatPollDelay = BASE`,
  sofortiger Tick.
- **User sendet** (`sendMessage`): nach dem Senden `_chatPollDelay = BASE` + sofortiger Tick
  (clearTimeout, dann `_chatPollTick()` direkt).

### Heartbeat: Hidden-Pause

In `_sendHeartbeat`: bei `document.hidden` früh `return` (kein Netzwerk-Call). Der 30-s-Timer
läuft weiter, sendet aber erst wieder, wenn der Tab sichtbar ist. (Minimaler Eingriff, kein
Timer-Umbau.)

## Datenfluss

```
sichtbar + aktiv chatten     → 5 s Polls
sichtbar, keine neuen Msgs   → 5→8→13→20 s (Backoff)
neue Msg / User sendet       → Reset auf 5 s + sofort-Poll
Tab versteckt                → Chat-Poll pausiert, Heartbeat pausiert
Tab wieder sichtbar          → Reset auf 5 s + sofort-Poll
```

## Edge Cases

- **Hidden während Backoff:** Timer wird nicht neu geplant → Pause. visibilitychange→sichtbar
  startet sauber mit BASE.
- **Chat geschlossen während Hidden:** `currentChat` ist null → Tick stoppt ohnehin.
- **Doppelte Timer:** `_startChatPoll` ruft immer zuerst `_stopChatPoll` (clearTimeout),
  visibilitychange-Listener nur **einmal** registrieren (Guard-Flag wie beim Board).
- **sendMessage ohne aktiven Poll:** Sofort-Tick nur, wenn `currentChat` gesetzt — sonst no-op.

## Verifikation

Kein Test-Harness. Stattdessen:
1. `~/node-v22/bin/node --check app.js`.
2. Lokal/Live im Browser, DevTools → Network: im offenen Chat ~5 s-Polls; nach ~1 min ohne
   Nachricht Intervall sichtbar gewachsen (~20 s); Tab in den Hintergrund → Polls stoppen;
   zurück → sofort ein Poll, danach wieder 5 s; eigene Nachricht → sofort-Poll + Reset.
3. Heartbeat: bei Hintergrund-Tab keine `/heartbeat`-Requests mehr.

## Offene Punkte

Keine — Kurve (5→20 s ×1,6), Reset-Trigger und Heartbeat-Pause festgelegt.
