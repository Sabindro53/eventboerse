# Integration: DiceBear Avatars

**Typ:** Dynamische Avatar-Generierung | **Status:** Aktiv

## Wie eingebunden

Kein SDK, direkte REST-API-Aufrufe aus `app.js`:

```javascript
`https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
```

## Verwendung

- **Nutzer-Avatare:** Wenn kein Profilfoto hochgeladen wurde
- **Fallback:** `onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=fallback'"`
- **Seed:** Username oder Provider-Name → deterministisch (gleicher Name = gleicher Avatar)

## Varianten im Code

```javascript
// Provider-Avatar
'https://api.dicebear.com/7.x/avataaars/svg?seed=dj1'

// Fallback überall
onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=fallback'"
```

## Abhängigkeit

Externe API — bei Ausfall zeigen Avatare nicht. Kein Caching implementiert.

## Verknüpfte Notizen
- [[Features/Listings]] — Anbieter-Avatare
- [[Features/Messaging]] — Chat-Avatare
- [[Komponenten/ListingCard]] — Avatar in Karte
