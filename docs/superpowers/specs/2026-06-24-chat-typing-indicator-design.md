# Design: Chat-Tipp-Indikator (Piggyback)

**Datum:** 2026-06-24 · **Bezug:** Chat-Ausbau · **Status:** Freigegeben (Architektur Piggyback)

## Ziel

Im offenen Chat sehen, wenn der Gesprächspartner gerade eine Antwort tippt („{Name} schreibt…"),
**ohne** neue Dauer-Poll-Last einzuführen (im Geiste von #8 Backoff).

## Architektur — Piggyback

Der Tipp-Status reist im **bestehenden** Nachrichten-Poll mit; nur das Sender-Signal ist ein
neuer, gedrosselter Mini-Write. Kein dedizierter Typing-Poll. Granularität ~5 s (Basis-Poll) —
bewusst als Hinweis „antwortet gerade", nicht als Echtzeit.

Kein DB-Schema: Tipp-Status lebt in **WordPress-Transients** (kurze TTL), wie die Login-Rate-Limits.

## Komponenten

### 1. Server — Typing-Signal & Header

**Neuer Endpoint** `POST /conversations/(?P<id>\d+)/typing`:
- `permission_callback`: `is_user_logged_in`.
- Teilnehmer-Check (User ist `user_a`/`user_b` der Konversation), sonst 403.
- `set_transient( 'eb_typing_' . $conv_id . '_' . $uid, 1, 6 )` (6 s TTL).
- Antwort: 204/200, leer. Bewusst billig (nur ein Transient-Write).

**`eb_messages_list` erweitern:** Partner-UID bestimmen (der *andere* Teilnehmer) und
`get_transient( 'eb_typing_' . $conv_id . '_' . $partner_uid )` lesen → Response-Header
`X-EB-Partner-Typing: 1` (nur wenn gesetzt). Array-Body bleibt unverändert (abwärtskompatibel,
wie `X-EB-Cursor` aus #8).

### 2. Client — Senden & Lesen

**Senden (gedrosselt):** Am Chat-Eingabefeld (`#chatInput`) bei `input` ein `POST …/typing`
auslösen — **max. 1×/4 s** (Throttle-Zeitstempel `_lastTypingPing`), nur wenn `currentChat`
gesetzt und `!document.hidden`. Kein Senden bei leerer Eingabe-Löschung.

**Lesen (im Poll):** `_chatPollTick` liest zusätzlich `X-EB-Partner-Typing` aus der Response.
- Header `1` → `_showTypingIndicator()` **und** Poll-Reset (`_chatPollDelay = _CHAT_POLL_BASE`),
  damit der Indikator frisch bleibt.
- Header fehlt/`0` → `_hideTypingIndicator()`.
- Bei eingehendem Delta mit neuer Partner-Nachricht → Indikator ausblenden (sie haben gesendet).

### 3. UI / CSS

- Indikator-Element unter der Nachrichtenliste (im Chat-Bereich, app-shell.html): `#chatTypingIndicator`,
  initial `hidden`, Inhalt „{Name} schreibt" + drei animierte Punkte.
- `_showTypingIndicator()` setzt den Namen (`currentChat.name`) und zeigt es; `_hide…` versteckt.
- CSS (styles.css): drei pulsierende Punkte (`@keyframes`), respektiert `prefers-reduced-motion`
  (der globale #12-Block neutralisiert die Animation ohnehin).

## Datenfluss

```
Partner tippt (input) ──drossel 4s──► POST /conversations/{id}/typing ──► transient(6s)
Du pollst (bestehend) ◄── X-EB-Partner-Typing: 1 ◄── eb_messages_list liest Partner-Transient
   → Indikator zeigen + Poll auf 5s; bei 0/neue Nachricht → verbergen
```

## Edge Cases / Sicherheit

- **Eigenes Tippen** nie als Indikator (Header nur für Partner-Transient).
- **Hidden-Tab:** kein Ping (Guard); Empfänger-Poll pausiert ohnehin (#8) → kein Geister-Indikator.
- **Abklingen:** kein Ping mehr → Transient nach 6 s weg → nächster Poll Header 0 → Indikator weg
  (~6–11 s nach Tippende). Akzeptiert.
- **Last:** Ping-Throttle 4 s + winziger Transient-Write; Lesen ist piggyback (0 Zusatz-Requests).
- **Teilnehmer-Check** server-seitig (kein Typing in fremde Konversationen).
- **Abwärtskompat:** fehlt der Header (alte Server) → Client zeigt nie Typing (kein Bruch).

## Verifikation

- `php -l functions.php`, `~/node-v22/bin/node --check app.js`, Rebuild `index.html` (app-shell + Indikator-Markup).
- Server live (von mir): `typing`-Endpoint unauth → 401/403 (kein 500); `messages`-Endpoint kein 500.
- **Eingeloggter Browser-Check (Nutzer, zwei Konten):** Während A tippt, sieht B „A schreibt…"
  (innerhalb ~5 s); verschwindet nach Tippende/Nachricht; keine Last-Spitzen (Network: nur
  gedrosselte typing-Pings + normale Polls).

## Offene Punkte

Keine — Piggyback, Transient-TTL 6 s, Ping-Throttle 4 s, Poll-Reset bei Typing festgelegt.
