---
layer: L2
domain: system
share: internal
tags: [layer/L2, domain/system, share/internal, design-system]
---

# Design-System: was gilt und was daneben wächst

> Gemessen am **gerenderten Bild** (393 px, echter Browser), nicht an der CSS.
> Was in der Datei steht, sagt nichts darüber, was gleichzeitig auf einem
> Bildschirm erscheint.

## Der Token, den es nie gab (15.09.2026)

Vom Inhaber gemeldet: die vier Kacheln unter `/profile` standen **weiß** auf
`#121212`.

```css
.journey-actions button { background: var(--white, #fff); }
```

**`--white` war im ganzen Projekt nirgends definiert.** Der Rückfallwert `#fff`
galt damit in **beiden** Farbmodi — Titel `#CCCCCC` darauf ergab **1,61 : 1**.

**Die Regel, die daraus folgt:**

| Schreibweise | Wirkung, wenn das Token fehlt |
|---|---|
| `var(--x, #fff)` | Literal gilt **in beiden Farbmodi** — die Fläche kann dem Modus nie folgen |
| `var(--x)` | Deklaration *invalid at computed-value time* → Fläche wird **transparent**, fehlt also ganz |

Beides sieht im Diff aus wie Design-System und ist keins. Ein Rückfallwert ist
bei einer **Länge** eine bewusste Vorgabe und bei einer **Farbe** der Fehler.

**Betroffen waren sieben Namen**, fünf davon in `styles.css`:
`--white` (journeys, discovery), `--bg-card`, `--card-bg`, `--bg-light`,
`--bg-soft`, `--primary-ultralight`, `--danger`, `--pp-runden`.

`--pp-runden` ist der lehrreichste: der Kommentar bei `.ai-popper` sagt, die
Rundenzahl stehe „an EINER Stelle für alle vier Animationen" — sie stand
**viermal** als Rückfallwert da. Die Aussage stimmt erst, seit das Token
existiert.

### Der Wächter existierte und konnte die Datei nicht sehen

`design-system.spec.js` prüft seit dem 01.08.2026 genau das. Er war grün, aus
zwei Gründen — **beide sind die Klasse, die dieser Vault sonst bekämpft**:

1. Seine Dateiliste war **von Hand aufgezählt** (`styles.css`,
   `ui-enhancements.css`, `eb-hq-evolution.css`). `journeys.css` und
   `discovery.css` waren nie Subjekt. Sie wird jetzt aus den Auslieferwegen
   **abgeleitet**.
2. Ein Rückfallwert **entschuldigte**. Deshalb kamen auch die fünf Fälle in
   `styles.css` durch, obwohl diese Datei gelesen wurde.

### Vor dem Umstellen die Textfarben ansehen

`.sa-modal` trug `var(--card-bg, #1e1e2e)` — ein **dunkles** Literal, und jedes
Kind setzt `color:#fff` fest. Ein modusfolgendes Token hätte dort weiße Schrift
auf weißen Grund gesetzt. Eine eingefrorene Farbe ist nicht automatisch ein
Fehler; sie ist einer, wenn der Text ihr nicht folgt.

Ebenso: `.akt-karte` und `.legal-table th` hatten längst eigene
`body.dark-mode`-Regeln. Ich hatte sie zuerst als Fund gezählt — die Messung
hat das widerlegt.

## Das System trägt — und wird daneben umgangen

| | |
|---|---:|
| `var(--…)`-Verweise in `styles.css` | **2331** |
| verschiedene Hex-Literale daneben | **294** |
| `style="` im Markup von `app-shell.html` | **94** |
| `style="` in Markup-Zeichenketten der Module | **265** |
| `el.style.X = …` in den Modulen | 370 |

2331 Token-Verweise sind kein Zufall — das System existiert und wird benutzt.
Die 294 Literale und die 265 ins Markup geschriebenen Stile sind das, was
**daneben** wächst.

**Die 370 `el.style.X =` sind bewusst nicht als Verstoß gezählt.** Das meiste
davon ist Verhalten, nicht Gestaltung: ein-/ausblenden, `transform`, Höhe einer
Ausklappfläche. Wer sie mitzählt, bekommt eine große Zahl und keinen Befund —
dieselbe Klasse wie ein Muster, das den erklärenden Kommentar trifft.

### Die Wirkung ist messbar, nicht theoretisch

Die zwei unsichtbaren Texte aus [[30-Betrieb/Barrierefreiheit-Abdeckung]]
stammen genau daher: eine Fläche mit fest geschriebener Farbe, die den
Farbmodus nicht mitmacht, und ein Text darauf, der sein Token nimmt.

```
auftraege dunkel      #000000 auf #121212   = 1,12 : 1
create-listing dunkel #e8e8e8 auf #fff8e8   = 1,15 : 1
```

Wer den Dunkelmodus ändert, ändert ein fest geschriebenes `#fff8e8` nicht mit.
**Ein Literal im Markup ist kein Stilfehler, es ist ein Farbmodus weniger.**

## Streuung: was gleichzeitig sichtbar ist

Gezählt werden nur Elemente mit eigenem Textknoten, sichtbar, auf der aktiven
Seite (393 × 852):

| Seite | Schriftgrößen | Textfarben | Radien | Schatten |
|---|---:|---:|---:|---:|
| `browse` (Landeseite) | **41** | **28** | **19** | **21** |
| `create-listing` | 30 | 9 | 11 | 3 |
| `business` | 19 | 8 | 8 | 5 |
| `aktuelles` (Feed) | 14 | 10 | 7 | 1 |
| `board` | 12 | 8 | 4 | 1 |
| `auftraege` | **10** | **5** | **2** | **0** |

Die Größen sind dabei nicht einmal gerundet: `10,4 · 10,56 · 10,88 · 9,28 ·
9,92 px`. Solche Werte entstehen nicht aus einer Skala, sondern aus
`em`-Ketten, die sich übereinander multiplizieren. Eine gewollte Typo-Skala hat
sechs bis acht Stufen.

**`auftraege` ist der Gegenbeweis, und das ist der eigentliche Fund.** Dieselbe
Anwendung, dieselbe CSS-Datei, dieselben Token — und eine Seite kommt mit zehn
Schriftgrößen, fünf Textfarben, zwei Radien und **null** Schatten aus. Die
Landeseite ist nicht reicher gestaltet als sie, sie ist ungeordneter. Der
Rückbau ist damit keine Erfindung einer neuen Skala, sondern die Anwendung
einer bereits vorhandenen.

## Text unter 11 px

Die Marquee-Attrappen (`.ebm-*`) sind **ausgenommen**: das ist eine gezeichnete
Oberfläche im Hero-Bild, kein bedienbarer Text. Sie taten in der ersten
Messung so, als sei die Anwendung voller Winzschrift — ein Prüfer, der sein
Subjekt nicht abgrenzt, meldet die Illustration als Befund.

Was bleibt, ist echte Oberfläche:

| Text | Klasse | Größe |
|---|---|---:|
| „Profil", „Suche" (Mobilleiste) | `.mobile-nav` Beschriftung | **8,32 px** |
| „NEU" | `.feed-tab-badge` | 8,8 px |
| „©" | `.ai-hero-cr` | 8,96 px |
| **„KI-generierter Inhalt"** | `.ai-content-label` (Radar/Picker) | **9 px** |
| „optional" | `.cl-optional` | 9,92 px |
| „Pflichtangabe" | — | 10 px |
| „KI-generierter Inhalt" | `.ai-content-label` (Regelfall) | 10 px |

Zwei davon sind mehr als Kosmetik:

- **Die Mobilleiste bei 8,32 px** beschriftet die Hauptnavigation der
  Anwendung am Telefon.
- **`.ai-content-label` bei 9–10 px** ist die Kennzeichnung nach EU AI Act
  Art. 50. Sie ist damit der kleinste Text der Anwendung — und sie ist eine
  Pflichtangabe, deren Zweck das Gelesenwerden ist. `recht.mjs` prüft, **dass**
  sie dasteht; wie groß sie ist, prüft niemand.

„Pflichtangabe" und „optional" sind zugleich die kleinsten Texte im
Inserats-Formular und sagen genau das, was jemand wissen muss, um es richtig
auszufüllen.

## Wie hier gemessen wird

Damit die nächste Messung vergleichbar ist und nicht wieder am falschen
Subjekt landet:

1. **Am gerenderten Bild, nicht an der CSS.** 17 787 Zeilen CSS sagen nichts
   darüber, was gleichzeitig auf einem Bildschirm steht.
2. **Nur die aktive Seite** (`.page.active *`) und nur sichtbare Elemente —
   `.page` ist per Vorgabe `display: none`, sonst zählt man alle 34 Seiten.
3. **Nachsehen, welche Seite wirklich aktiv wurde.** Abgemeldet fallen
   `auftraege`, `business` und `my-listings` auf die Landeseite zurück; drei
   „verschiedene" Seiten liefern dann identische Zahlen. Genau daran ist die
   erste Fassung dieser Messung gescheitert.
4. **Nur Elemente mit eigenem Textknoten** für Größen und Farben — sonst erbt
   jeder Container die Angaben seines Kindes mit.
5. **Dekoration abgrenzen.** `.ebm-*` ist ein Bild von einer Oberfläche.

## Verknüpft

- [[30-Betrieb/Barrierefreiheit-Abdeckung]] — dieselbe Ursache, messbare Folge
- [[20-System/Frontend/UI-Patterns]]
