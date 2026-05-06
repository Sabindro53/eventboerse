---
tags: [frontend, state]
---

# Frontend State-Management

> Die SPA hat **keinen Redux/MobX-Store**. State lebt in vier Ebenen — diese Hierarchie ist Konvention, nicht erzwungen.

## Vier State-Ebenen

```
1. Server-State    → REST-API, source of truth
2. Session-State   → in-memory JS-Variablen (verschwinden bei Reload)
3. Persistenz      → localStorage / sessionStorage
4. URL-State       → Routing-Parameter, Filter
```

## Server-State

- Quelle der Wahrheit für: User, Listings, Conversations, Messages, Reviews, Bookings, Board-Daten
- Zugriff ausschließlich über `apiCall()` Wrapper in `app.js` (zentrale Fehlerbehandlung, Auth-Header)
- **Cache:** kurzfristig im Modul-Scope (`window._cachedListings`), invalidiert bei Mutationen oder Tab-Wechsel
- **Pessimistic Updates:** UI wartet auf Server-Antwort, dann re-render. Optimistic nur bei Like/Favorite/Read-Markers.

## Session-State (in-memory)

| Variable | Typ | Inhalt |
|---|---|---|
| `currentUser` | `Object \| null` | aktuelles User-Objekt nach Login |
| `currentRoute` | `string` | letzter `navigateTo`-Hash |
| `_msgPollers` | `Map` | aktive Conversation-Polling-Timer |
| `_listingDraft` | `Object` | unvollständiges Listing während Erstellung |

Verschwinden bei Reload — nicht für sicherheitsrelevante Daten verwenden.

## Persistenz (localStorage / sessionStorage)

Vollständige Liste in [[Legal/Cookie-Liste]]. Hier nur die wichtigsten:

| Key | Storage | TTL | Zweck |
|---|---|---|---|
| `eb_cookie_consent` | localStorage | 12 Mo | Cookie-Banner-Status |
| `eb_beta_banner_dismissed` | localStorage | unbegrenzt | Beta-Banner schließen |
| `eb_theme` | localStorage | unbegrenzt | dark/light/system |
| `eb_recent_searches` | localStorage | unbegrenzt | Suche-Verlauf (max 10) |
| `eb_draft_listing_<userId>` | localStorage | bis Submit | Listing-Entwurf |
| `eb_msg_unread_seen` | sessionStorage | tab | gelesen-Marker pro Tab |

> ⚠️ **Niemals** Auth-Token oder personenbezogene Daten in localStorage. Auth läuft über HttpOnly-Cookies.

## URL-State (Routing)

- Hash-basiert: `#listings?cat=catering&plz=10115`
- Reload-stabil, teilbar, browserhistorie-freundlich
- Routing-Tabelle: [[Architecture/Frontend-Routing]]

## Daten-Fluss-Beispiel: „Listing speichern"

```
User-Klick „Speichern"
  ↓
1. Frontend validiert Pflichtfelder (in-memory)
2. apiCall('POST', '/listings', payload)
3. Backend validiert, schreibt in wp_eb_listings
4. Response mit listing.id zurück
5. Frontend invalidiert _cachedListings
6. navigateTo('listing-detail', { id })
7. Detail-Seite holt sich Listing frisch via apiCall
```

## Race-Conditions vermeiden

- **Doppelte Submits:** Submit-Button beim Klick auf `disabled` setzen, erst nach Response wieder freigeben.
- **Polling vs. Push:** Conversation-Polling stoppen, wenn Tab nicht sichtbar (`document.hidden`).
- **Stale-State:** Bei Re-Login muss `currentUser` und alle Caches geleert werden — `eb_resetState()`.

Siehe auch: [[Frontend/app-js-module]], [[Architecture/Frontend-Routing]].
