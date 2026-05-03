---
tags: [security, p0, frontend, session, localStorage]
date: 2026-05-02
---

# EBSession

Frontend-Wrapper fuer Auth-Token mit harter Expiry. Behebt P0.5 aus [[2026-05-02-Security-Hardening|Audit]].

## Datei

`assets/js/security/session.js` · PR #17 · globaler Namespace `window.EBSession`

## API

```js
EBSession.set(token, user, ttlMs?)   // Default-TTL: 24h
EBSession.get()                       // null wenn abgelaufen
EBSession.getToken()
EBSession.getUser()
EBSession.clear()
EBSession.refresh(ttlMs?)             // verlaengert
EBSession.onExpire(handler)
```

## Storage

Ein Eintrag `eb_session` mit `{v, token, user, iat, exp}`. Bei `get()` wird abgelaufene Session geloescht und `eb:session:expired` event gefeuert. `storage`-Event sorgt fuer Cross-Tab-Sync.

## Verbindung zu

- [[2026-05-02-Security-Hardening|Hardening-Index]]
- [[app-js-module]] — alle bisherigen `localStorage.setItem("eb_token")` migrieren
- [[Authentication]] — Login-Response geht durch `EBSession.set`
- [[Rate-Limit]] — erfolgreicher Login triggert `reset_rate_limit`
- [[EBSafeHTML]] — zusammen Frontend-Cluster

## TODOs

- `<script src="/assets/js/security/session.js">` VOR app.js in [[index.html]]/[[header.php]]
- `app.js` Migration: alle `localStorage`-Tokens in einem Folge-PR
- Optional: `window.addEventListener("eb:session:expired", () => navigateTo("/login"))`
