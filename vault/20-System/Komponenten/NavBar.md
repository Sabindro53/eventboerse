---
layer: L2
domain: system
share: internal
tags: [layer/L2, domain/system, share/internal]
---

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
- [[10-Produkt/UserFlows/Suche-und-Entdeckung]] — Suchleiste
- [[10-Produkt/UserFlows/Registrierung-und-Login]] — Login-Button
- [[10-Produkt/Features/Authentication]] — Nutzer-Status
- [[20-System/Frontend/app-js-module]] — Übersicht
