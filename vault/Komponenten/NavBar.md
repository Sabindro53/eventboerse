# Komponente: NavBar

**Datei:** `app.js`, `index.html` | **Typ:** Globale Navigation

## Was sie macht

- Logo + Brand-Name (links)
- Kategorie-Dropdown (`toggleNavCategoryDropdown`)
- KI-Suchfeld (`openNavAiSearch`, `onNavAiInput`)
- Standort-Picker
- Nutzer-Menü (`toggleUserMenu`) — Login/Profil/Logout
- Benachrichtigungs-Badge (ungelesene Nachrichten)

## Wichtige Funktionen

| Funktion | Zeile | Beschreibung |
|----------|-------|--------------|
| `toggleNavCategoryDropdown(e)` | ~14626 | Kategorie-Menü öffnen |
| `selectNavCategory(key, label, emoji)` | ~14643 | Kategorie wählen |
| `performNavSearch()` | ~14660 | Suche auslösen → navigateTo('browse') |
| `openNavAiSearch()` | ~14416 | KI-Suche Panel öffnen |
| `closeNavAiSearch()` | ~14427 | KI-Suche schließen |
| `toggleUserMenu()` | ~9626 | Nutzer-Dropdown |

## Scroll-Verhalten

Navbar bekommt `scrolled`-Klasse wenn > 50px gescrollt (Schatten, Hintergrund).
`app.js` ~9874 — `NAVBAR SCROLL EFFECT`.

## Verknüpfte Notizen
- [[UserFlows/Suche-und-Entdeckung]] — Suchleiste
- [[UserFlows/Registrierung-und-Login]] — Login-Button
- [[Features/Authentication]] — Nutzer-Status
- [[Frontend/app-js-module]] — Übersicht
