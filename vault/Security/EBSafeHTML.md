---
tags: [security, p0, frontend, xss, sanitize]
date: 2026-05-02
---

# EBSafeHTML

Sichere Alternative zu `innerHTML`. Behebt P0.2 aus [[2026-05-02-Security-Hardening|Audit]].

## Datei

`assets/js/security/sanitize.js` · PR #19 · globaler Namespace `window.EBSafeHTML`

## API

```js
EBSafeHTML.sanitize(html, opts?)   // bereinigter String
EBSafeHTML.set(el, html, opts?)    // ersetzt innerHTML sicher
EBSafeHTML.text(el, str)           // Shortcut fuer textContent
```

## Schutz

- Allow-List fuer Tags (a/abbr/b/em/strong/p/br/ul/ol/li/code/pre/h1-h6/img/figure/blockquote/table-Familie)
- Keine `script`/`iframe`/`form` und keine `on*`-Event-Handler
- URL-Schemes: nur `https?:`/`mailto:`/`tel:`/Anker/relativ — `data:`/`javascript:`/`vbscript:` werden hart verworfen
- `target="_blank"` bekommt automatisch `rel="noopener noreferrer"`
- Wenn DOMPurify global geladen ist, wird das stattdessen verwendet

## Verbindung zu

- [[2026-05-02-Security-Hardening|Hardening-Index]]
- [[app-js-module]] — alle `innerHTML = userInput` migrieren
- [[Listings]] / [[Reviews]] / [[Messaging]] — die drei Render-Pfade fuer User-Inhalte
- [[EBSession]] — zusammen Frontend-Cluster

## TODOs

- `<script src="/assets/js/security/sanitize.js">` vor app.js in [[index.html]]/[[header.php]]
- Optional DOMPurify CDN einbinden fuer Profi-Schutz
- Migration der ~50+ `innerHTML`-Stellen in [[app-js-module]] (Folge-PR)
- WICHTIG: serverseitig zusaetzlich `wp_kses_post()` beim Speichern verwenden
