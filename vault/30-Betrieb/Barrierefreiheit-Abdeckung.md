---
layer: L3
domain: betrieb
share: internal
tags: [layer/L3, domain/betrieb, share/internal, a11y, bfsg]
---

# Barrierefreiheit: die Abdeckung des Tors

> ## Stand 24.09.2026 — behoben, nachgemessen
>
> `barrierefreiheit.spec.js` misst **32 der 34 Seiten** in **beiden
> Farbmodi**, angemeldet und mit `isAdmin`, und meldet **0 Verstöße**
> (10/10 Tests). Die Seitenliste kommt aus den `id="page-…"` der Shell, und
> auf jeder Seite wird nachgesehen, welche wirklich aktiv wurde. Die zwei
> übrigen sind nachgewiesene Weiterleitungen (`home` → `browse`,
> `profile` → `provider`), deren Ziel selbst gemessen wird.
>
> **Alles darunter ist der Befund vom 15.09.2026 und seine Umsetzung** — also
> Protokoll, nicht Ist-Stand. Es steht hier, weil eine stillschweigend
> abgehakte Warnung aussieht, als hätte es sie nie gegeben; und weil die
> Lehre bleibt: *ein Prüfer, dessen Subjekt nur ein Ausschnitt ist, gibt eine
> Entwarnung, die er nicht decken kann.*
>
> **Was kein Tor je melden wird**, steht weiter unten und gilt unverändert:
> die drei Einstiege der Landeseite liegen über einem Verlauf, und axe meldet
> dort `incomplete`, nicht `violation`.

> **Der Befund vom 15.09.2026:** `barrierefreiheit.spec.js` prüfte **5 von 34
> Seiten** — und drei Notizen haben daraus „0 Verstöße in der gesamten
> Anwendung" gemacht. Über die übrigen Seiten gemessen: **40 verstoßende
> Knoten, 20 davon `critical`.**

## Was das Tor wirklich misst

`tests/e2e/barrierefreiheit.spec.js` führt seine Seiten als Handliste:

```js
const SEITEN = [
  ['browse', null], ['detail', 1], ['board', null],
  ['aktuelles', null], ['freunde', null],
];
```

Fünf Routen — und zwar **abgemeldet**. `board` und `freunde` werden damit in
ihrem Ausgeloggt-Zustand geprüft, nicht in dem, in dem jemand damit arbeitet.
`app-shell.html` trägt **34** Seiten.

**Dieselbe Fehlerklasse wie der tote Gitleaks-Scan:** ein Prüfer, dessen
Subjekt nur ein Ausschnitt ist, gibt eine Entwarnung, die er nicht decken kann.
Hier war sie besonders teuer, weil sie sich fortgepflanzt hat — die Zahl der
geprüften Seiten stand an vier Stellen und war **viermal verschieden**:

| Stelle | behauptete Abdeckung |
|---|---|
| `barrierefreiheit.spec.js` (Kopfkommentar) | „× 6 Kernseiten" |
| `Claude-Kontext.md`, Stand 2026-08-01 | „× 6 Kernseiten" |
| `Testing.md`, Suiten-Tabelle | „× 4 Seiten" |
| `CLAUDE.md`, Abschnitt WCAG 2.2 | „der einzige Verstoß der **gesamten Anwendung**" |
| **gemessen** | **5** |

Vier gepflegte Fassungen derselben Zahl, keine davon richtig. Genau die Drift,
gegen die dieses Projekt sonst Tore baut.

## Die Messung vom 15.09.2026

Chromium, axe-core mit `wcag2a, wcag2aa, wcag21aa, wcag22aa`, **beide
Farbmodi**, angemeldet in der jeweils passenden Rolle.

Von den 29 nicht abgedeckten Seiten sind **26 wirklich gemessen**:
`admin` braucht echte Administratorrechte; `home` und `profile` sind
Weiterleitungen auf `browse` bzw. `provider` — was dort aktiv wird, ist
nachgesehen, nicht angenommen. Ein Prüfer, der eine Seite misst, die
zurückgefallen ist, misst die Landeseite dreimal und meldet drei Ergebnisse.

| | |
|---|---|
| verstoßende Knoten | **40** |
| davon `critical` | **20** |
| betroffene Seiten | **6** — `settings`, `create-listing`, `auftraege`, `business`, `notifications`, `contact` |
| je Regel | `select-name` 14 · `label` 6 · `color-contrast` 20 |

## Alle 20 kritischen haben EINE Ursache

`<label>` steht **neben** seinem Feld statt mit ihm verbunden:

```html
<label>Kategorie</label>   <select id="createCategory">     ← kein for=
<label>Betreff</label>     <select id="contactSubject">     ← kein for=
<label class="toggle-switch"><input id="settings2faToggle"> ← Label ohne Text
```

Ein sehender Nutzer merkt nichts — am Bildschirm ist alles beschriftet. Ein
Screenreader sagt auf `create-listing` **sechsmal hintereinander**
„Kombinationsfeld" ohne Namen, und das ist die Seite, auf der ein Dienstleister
sein Inserat anlegt: der einzige Weg, auf dem hier Angebot entsteht.

Betroffen sind acht Bedienelemente: `createCategory`, `createPriceModel`,
`createTimeFromH/M`, `createTimeToH/M`, `createDuration`, `createInstantBook`,
`contactSubject`, `settings2faToggle`.

`#settings2faToggle` ist der Schalter für die **Zwei-Faktor-Anmeldung**. Wer
ihn nicht sehen kann, erfährt nicht, was er umlegt.

**Handgriff:** ein `for="…"` je sichtbarem Label, ein `aria-label` für die zwei
Schalter. Vierzehn Attribute in einer Datei.

## Kontrast: zwei unsichtbare Texte, und die Marke selbst

Gemessen mit den Werten, die axe mitliefert:

| Seite / Modus | Verhältnis | Farben | Element |
|---|---:|---|---|
| `auftraege` dunkel | **1,12** | `#000000` auf `#121212` | `.btn-link` „Erneut versuchen" |
| `create-listing` dunkel | **1,15** | `#e8e8e8` auf `#fff8e8` | `.create-payout-title` |
| `create-listing` dunkel | **1,51** | `#cccccc` auf `#fff8e8` | `.create-payout-text` |
| `settings` dunkel | 3,31 | `#b45309` auf `#1e1e1e` | Passkey-Status |
| `settings` dunkel | 3,94 | `#e53935` auf `#1e1e1e` | Konto löschen |
| `business` dunkel | 3,14 / 3,23 | Warn- / Erfolgston | `.release-status`, `.release-beta` |
| `create-listing` hell | 2,86 | `#939393` auf `#f7f7f7` | `.upload-hint-soft` |

**Die zwei unsichtbaren Fälle sind derselbe Fehler in zwei Richtungen.** Beide
Male trägt eine Fläche eine **fest geschriebene** Farbe, die den Farbmodus
nicht mitmacht, während der Text darauf sein Token nimmt:

- `auftraege`: der Text bleibt schwarz, der Grund wird dunkel.
- `create-listing`: der Grund bleibt hell (`#fff8e8`), der Text wird hell.

Der erste ist besonders bitter — er ist der **Ausweg aus einer Störung**: der
Knopf erscheint nur, wenn das Laden der Storno-Anträge fehlgeschlagen ist. Wer
ihn braucht, sieht ihn nicht. Er stammt aus eigener Arbeit am Storno-Vorgang.

### Die Markenfarbe als Text ist der größte Einzelposten

`#FF385C` auf Weiß ergibt **3,51 : 1** — gefordert sind 4,5. Sieben Knoten:
vier `.release-kicker` auf `business`, `.contact-kicker` und die Links auf
**AGB** und **Datenschutz** im Kontaktformular.

**Die Regel dagegen steht seit dem 01.08.2026 im Vault** und wird an 23
Stellen in `styles.css` befolgt:

> Neue Text-Tokens `--primary-text` / `--accent-text` für WCAG-AA-Text auf
> hellem/dunklem Grund — Markenfarbe `#FF385C` bleibt für Flächen/Icons.

Es fehlt also keine Entscheidung und kein Token. Es fehlt die Anwendung an
sieben Stellen. Eine Regel, die zu 23 von 30 Stellen gilt, sieht im Code aus
wie eine geltende Regel.

## Was axe strukturell NICHT finden kann

Über einem Verlauf oder Bild meldet axe `incomplete`, nicht `violation` — die
Prüfung bleibt grün. Genau dort liegt der Zustand der drei Einstiege auf der
Landeseite (`.ai-hero-wege`): `rgba(255,255,255,0.14)` mit weißer Schrift und
`backdrop-filter: blur(8px)`, also **kein eigener Hintergrund**.

Gemessen am Ausschnitt der echten Seite: bei **1,6 s** liegt dahinter der helle
Verlauf und Weiß steht auf nahezu Weiß; bei **3,5 s** sind die Marquee-Bilder
geladen, der Grund ist dunkel, alles liest sich tadellos.

Ein automatisches Tor wird diesen Fall nie melden. Er gehört deshalb hierher
und nicht in eine Testdatei.

## Warum das ein BFSG-Thema ist

Das Barrierefreiheitsstärkungsgesetz gilt seit dem 28.06.2025 für den
elektronischen Geschäftsverkehr und verweist über EN 301 549 auf den geltenden
WCAG-Stand. Eine Entwarnung über „die gesamte Anwendung", die auf fünf Seiten
beruht, ist damit nicht nur ungenau, sondern eine Aussage mit Rechtsfolge.

## Der Handgriff am Tor selbst

`SEITEN` aus den `id="page-…"` von `app-shell.html` **ableiten** statt
aufzuzählen — dann bringt jede neue Seite ihre Prüfung mit. Genau so ist es bei
[[30-Betrieb/Testing]] für `seitenrouten.spec.js` und für die Tabellen-Nachweise
schon gelöst.

Zwei Dinge gehören zur Ableitung dazu, beide aus dieser Messung gelernt:

1. **Angemeldet messen, in der Rolle der Seite.** `auftraege`, `business` und
   `my-listings` schicken Abgemeldete weg; abgemeldet misst man die Landeseite.
2. **Nachsehen, welche Seite wirklich aktiv wurde.** `home` wird `browse`,
   `profile` wird `provider` (letzteres laut Router-Kommentar ausdrücklich
   gewollt). Ohne diese Gegenprobe zählt man dieselbe Seite mehrfach und hält
   das für Abdeckung.

## Verknüpft

- [[20-System/Frontend/Design-System-Drift]] — dieselbe Ursache, andere Wirkung
- [[30-Betrieb/Testing]]
- [[40-Governance/Legal/Compliance-Overview]]
