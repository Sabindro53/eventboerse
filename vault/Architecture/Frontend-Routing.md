# Frontend-Routing

Die SPA nutzt **keinen** History-Router-Library. Alles läuft über `navigateTo()` in `app.js`.

## Konzept

- Jede „Seite" ist ein `<section id="page-X" class="page">` in `index.html`.
- `navigateTo(name, ...args)` schaltet die `.active`-Klasse um und ruft eine `init`-Funktion auf.
- Die URL wird via `history.pushState({ page })` synchron gehalten.
- WordPress-`functions.php` definiert serverseitige Rewrites für die SEO-relevanten Slugs, sodass jede Route auch direkt aufrufbar ist (Bookmark/Share).

## Routen-Übersicht

### Public
| Route | Slug | Init |
|---|---|---|
| `home` | `/` | Hero, Featured-Listings |
| `browse` | `/browse` | Listings-Grid + Filter |
| `detail` | `/listing/{id}` | Listing-Detail |
| `provider` | `/provider/{id}` | Provider-Profil |
| `category` | `/kategorie/{slug}` | Kategorie-Filter |

### Auth
| Route | Slug | Hinweis |
|---|---|---|
| `login`, `register`, `forgot-password`, `reset-password`, `verify-email` | `/login` etc. | Modal-basiert + Standalone-Seiten |

### Eingeloggt
| Route | Slug |
|---|---|
| `messages` | `/messages` |
| `chat` | `/chat/{user}` |
| `profile` | `/profile` |
| `settings` | `/settings` |
| `favorites` | `/favoriten` |
| `board` | `/board` |
| `create-listing` | `/inserat-erstellen` |
| `my-listings` | `/meine-inserate` |

### Admin
| Route | Slug |
|---|---|
| `admin` | `/admin` |

### Legal (V11-Compliance)
Alle als statische SPA-Sektionen, durch `functions.php`-Rewrites direkt erreichbar:

`/agb`, `/agb-b2b`, `/agb-dienstleister`, `/datenschutz`, `/impressum`, `/cookies`, `/widerruf`, `/community`, `/bewertungen`, `/upload`, `/dsa`, `/p2b`, `/marktplatz`, `/barrierefreiheit`, `/vsbg`.

## `navigateTo()`-Vertrag

```js
navigateTo('detail', listingId);
// 1. ruft optional vorhandenes onLeave_<currentPage>() auf
// 2. setzt history.pushState
// 3. blendet alle .page aus, .page-detail ein
// 4. ruft init_<name>(args) auf
// 5. scrollt nach oben (außer flag noScroll)
// 6. ruft window.__hideAppLoader() falls noch sichtbar
```

## SEO + Server-Rewrites

`functions.php` enthält ein `$spa_pages = [...]`-Array. Für jeden Slug gibt es eine Rewrite-Regel, die `index.php` mit dem entsprechenden Page-State liefert. So kann jeder Crawler die Routen einzeln erreichen.

## Hash-Routing-Fallback

Falls `pushState` nicht greift (alte Browser): `#/browse`, `#/listing/123` werden beim `DOMContentLoaded` ausgewertet.

Siehe [[Frontend/app-js-module]], [[Architecture/Overview]].
