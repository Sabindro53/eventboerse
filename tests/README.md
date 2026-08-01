# Smoke-Tests

Regression-Schutz gegen Listings-/Board-Bugs. Adressiert Sprint-P0
„Listings-/Board-Regressionen ausschließen".

## Was wird geprüft

- SPA lädt fehlerfrei (kein Konsolen-`error`).
- Home-Route rendert Hero + Suchvorschläge.
- Suche mit Mock-Listings zeigt Treffer statt „keine Treffer".
- Browse-Route rendert Listing-Karten aus den gemockten Daten.
- Board-Route ist erreichbar und crasht nicht.

Alle API-Calls (`/wp-json/eventboerse/v1/…`) werden **gemockt**. Es wird kein
echter WordPress-Server benötigt — die Tests laufen offline gegen eine
statische Python-Serve.

## Lokal ausführen

```bash
npm install
npx playwright install chromium
npm run test:smoke
```

Report: `npm run test:smoke:report`.

## CI

`.github/workflows/smoke-tests.yml` startet die Suite bei Push/PR gegen `main`.
