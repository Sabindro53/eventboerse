# Eventbörse — Produktstruktur und Überarbeitung

Stand: 15.10.2026 · Branch `claude/plattform-redesign` · Grundlage: Code-Inventur
dieses Repositorys (`app-shell.html`, `js/modules/**`) und das Live-Audit vom
15.10.2026 (Befund-Kennungen **F01–F32**, siehe Abschnitt 8).

> **Wie dieses Dokument zu lesen ist.** Es beschreibt, was es gibt, wohin es
> gehört und was davon umgesetzt ist. Es enthält **keine** Nutzerzahlen,
> Nutzungsdaten oder Nutzerforschung — es gibt im Repository keine. Wo etwas
> vermutet statt gemessen ist, steht **Annahme** davor. Gestaltungs- und
> Strukturentscheidungen sind **Vorschläge** an den Inhaber (`AGENTS.md`:
> Claude trifft Gestaltungsentscheidungen nicht allein); umgesetzt ist nur, was
> unter „Umgesetzt" steht, und es ist so gebaut, dass es sich zurücknehmen lässt.

---

## 1 · Bestandsaufnahme

### 1.1 Seiten

`app-shell.html` trägt **34 Seiten** (`id="page-…"`). Nach Zweck gruppiert:

| Gruppe | Seiten |
|---|---|
| Entdecken & Suchen | `browse` (Landeseite mit Suchmaske), `home` (leitet auf `browse`), `explore` (Entdecken), `aktuelles` (Feed mit Reitern: Für dich, Radar, Jetzt, Gesuche, Events …), `detail` (Inserat), `provider` (öffentliches Profil), `bewertungen` |
| Planen (Planer) | `board` (Planungs-Board: Projekte, Bausteine, Kanban, Ablauf, Zahlung, Storno), `favorites`, `freunde` (Freunde, Gruppen, gemeinsamer Plan) |
| Geschäft (Dienstleister) | `my-listings`, `create-listing` (Biete **und** Suche), `auftraege` (Auftragsboard + Storno-Entscheidungen), `business` (Cockpit: Umsatz, Steuer, Belege, Media Studio) |
| Kommunikation | `messages`, `notifications` |
| Konto | `profile`, `settings` (inkl. Nickname seit #328), `upload` |
| Verwaltung | `admin` |
| Hilfe & Recht | `contact`, `community`, `agb`, `agb-dienstleister`, `marktplatz`, `cookies`, `widerruf`, `dsa`, `barrierefreiheit`, `vsbg`, `datenschutz`, `impressum` |

### 1.2 Navigationswege (vor der Überarbeitung)

| Weg | Inhalt | Rollenabhängig? |
|---|---|---|
| **Topbar** | Logo → `browse`, Suchleiste (Assistent, Kategorie, Region), Textlink **„Inserieren"**, Symbole Freunde · Nachrichten · Benachrichtigungen, Avatar | nein |
| **Benutzermenü** (Avatar) | 14 Einträge in **einer** flachen Liste: Profil, Nachrichten, Planungs-Board, Freunde, Inserat erstellen, Meine Inserate, Auftragsboard\*, Business-Cockpit\*, Benachrichtigungen, Favoriten, Einstellungen, Kontakt, Admin\*\*, Abmelden | nur \* (Dienstleister) und \*\* (Admin) ein-/ausgeblendet |
| **Mobilleiste** | Feed · Suche · Board · Chat · Profil | nein — Dienstleister landen im Planungs-Board |
| **Landeseite** | drei Absichten (`.ai-hero-wege`): suchen · „was ist los" · anbieten (für Dienstleister „Mein Geschäft") | ja |

### 1.3 Befunde aus der Inventur

**Doppelte Einstiege**
- Vier Wege zum Entdecken: `browse`, `home`→`browse`, `explore`, `aktuelles`. `explore` leitet für seine Reiter ohnehin auf `aktuelles` weiter.
- Nachrichten, Benachrichtigungen und Freunde stehen in der Topbar **und** im Menü (das ist auf dem Telefon sinnvoll, auf dem Schreibtisch doppelt).
- „Inserat erstellen" steht in Topbar, Menü und Landeseite; für Planer heißt dieselbe Maske „Event erstellen" (F10, F15).
- Mehrere „Gemeinsam planen"-Einstiege neben Event-Projekten und Gruppen-Plänen (F18).

**Unklare Bezeichnungen**
- „Board" meint für Planer das Planungs-Board, für Dienstleister gibt es zusätzlich das **Auftragsboard** — zwei Boards, ein Wort.
- „Inserieren" in der Topbar ist für einen Planer die falsche Einladung: er inseriert nichts, er sucht (F02, F15).
- „Feed" (Mobilleiste) und „Aktuelles" (Seitentitel) sind dieselbe Seite.
- „Favoriten" vs. „Merkliste" (Profil-Schnellzugriff) — zwei Namen.

**Überladene Bereiche**
- Benutzermenü: 14 gleichrangige Einträge ohne Gruppierung — Geschäft, Planung und Konto vermischt.
- Business-Cockpit: Finanzen und Media Studio in einem Bereich (F09).
- Projektansicht: Übersicht/Prozess/Ablauf/Kanban/Checkliste parallel (F12, F13).

**Schwer auffindbare Funktionen**
- Für Dienstleister liegen **alle** Arbeitsbereiche (Aufträge, Inserate, Cockpit) im Ausklappmenü; die Mobilleiste führt sie ins Planungs-Board (F06).
- Storno-Entscheidungen mit 72-h-Frist stehen auf `auftraege` — erreichbar nur über das Menü.

**Ein vermuteter Fehler, der keiner war**
- Bei der Inventur sah es so aus, als öffne die Inserat-Maske für Planer immer auf „Ich biete" — der Router setzt beim Öffnen `_clSetType('offer')`. **Widerlegt:** `updateCreateFormForRole()` läuft danach und stellt Planer bereits auf „Ich suche". Ein Test hält das jetzt fest. Die Ursache von F01–F03 (Gesuche mit Anbieterpreis in der Dienstleistersuche) liegt also **nicht** hier und ist weiter offen — vermutlich in der Darstellung von Gesuchen in Suche und Profil, nicht beim Anlegen.
- Was wirklich fehlte: eine **ausdrückliche** Wahl über den Weg. Ein Dienstleister, der selbst ein Gesuch aufgeben will, landete auf „Ich biete".

---

## 2 · Die zwei Abläufe

### 2.1 Eventplaner

| Schritt | heute | Reibung |
|---|---|---|
| Inspiration / Suche | `browse` (Suchmaske, Assistent), `aktuelles` (Feed, Radar, „⚡ Jetzt"), `explore` | vier Einstiege, gleiche Absicht |
| Finden & vergleichen | Trefferliste → `detail` → `provider`; Merken über ♥ → `favorites` | Preise in verschiedenen Einheiten (F04, F23), „0.0/5" statt „noch keine Bewertungen" (F20) |
| Kontaktieren / buchen | Chat aus `detail`; Buchung/Zahlung aus dem Board (Stripe, lädt erst an der Kasse) | „zum Board hinzufügen" ist keine Buchung — das erklärt das Board richtig |
| Event organisieren | `board` (Projekte, Bausteine, Budget, Ablauf), `freunde` (Gruppen, gemeinsamer Plan) | zwei Planungswelten (Projekt vs. Gruppen-Plan, F18), viele gleichrangige Ansichten (F13) |
| **Gesuch aufgeben** (Alternative zur Suche) | `create-listing` → „Ich suche" | Typ stand auf „Ich biete" (behoben, s. o.) |

### 2.2 Dienstleister

| Schritt | heute | Reibung |
|---|---|---|
| Profil einrichten | Registrierung als Dienstleister → `profile`, `settings`, Connect-Auszahlung | Visitenkarte und Arbeitsplatz vermischt (F19) |
| Leistungen präsentieren | `create-listing` → `my-listings` | Kalender-Leerzustand wirkt wie „immer verfügbar" (F05) |
| Anfragen bearbeiten | `messages` (Anfragen + Verhandlung), `notifications` | Anfragen und bestätigte Aufträge nicht klar getrennt (F07) |
| Angebot / Buchung abschließen | `auftraege` (nächster Termin oben, Storno-Entscheidungen), `business` (Umsatz, Belege) | Arbeitsplatz nur über das Menü erreichbar (F06) |

---

## 3 · Vorgeschlagene Struktur

Ein Grundsatz: **gemeinsame Ebene für alle, ein Arbeitsbereich je Rolle, ein Konto-Bereich.** Wer beide Rollen hat (ein Dienstleister plant auch eigene Events), sieht beide Arbeitsbereiche.

```
Eventbörse
├── Entdecken (für alle)          browse · aktuelles (Feed/Radar/Jetzt/Gesuche) · detail · provider
├── Mein Event (Planer)           Planungs-Board · Gesuch aufgeben · Meine Gesuche · Favoriten · Freunde & Gruppen
├── Mein Geschäft (Dienstleister) Aufträge · Meine Inserate · Inserat erstellen · Business-Cockpit
├── Nachrichten & Mitteilungen    messages · notifications
├── Konto                         Profil · Einstellungen (inkl. Nickname) · Hilfe & Kontakt · Abmelden
├── Verwaltung (nur Admin)        admin
└── Hilfe & Recht (Fußzeile)      contact · community · AGB … Impressum
```

### 3.1 Navigation je Rolle

| | abgemeldet | Planer | Dienstleister |
|---|---|---|---|
| **Topbar-Hauptlink** | „Für Dienstleister" → Registrierung als Anbieter | „Mein Event" → Planungs-Board | „Mein Geschäft" → Meine Inserate |
| **Menü** | Anmelden · Registrieren · Für Dienstleister | Abschnitte *Mein Event* · *Konto* | Abschnitte *Mein Geschäft* · *Mein Event* · *Konto* |
| **Mobilleiste, 3. Platz** | Planen → Board | **Planen** → Board | **Aufträge** → Auftragsboard |

---

## 4 · Zuordnung „bisher → neuer Platz"

Nichts fällt weg. Jede Zeile ist entweder unverändert erreichbar oder an einem gleichwertigen, sichtbareren Platz.

| Bisher | Funktion | Neuer Platz |
|---|---|---|
| Topbar „Inserieren" | Inserat/Gesuch anlegen | Menü *Mein Event* → „Gesuch aufgeben" (Typ „Ich suche"), Menü *Mein Geschäft* → „Inserat erstellen" (Typ „Ich biete"). Abgemeldet: Topbar „Für Dienstleister" |
| Menü „Profil" | eigenes Profil | Menü *Konto* |
| Menü „Nachrichten" | Chats, Anfragen | Topbar-Symbol, Mobilleiste „Chat", Menü *Konto* (unverändert) |
| Menü „Planungs-Board" | Projekte, Bausteine, Zahlung | Topbar-Hauptlink (Planer), Menü *Mein Event*, Mobilleiste „Planen" |
| Menü „Freunde & Gruppen" | Freunde, Gruppen, gemeinsamer Plan | Menü *Mein Event*, Topbar-Symbol (unverändert) |
| Menü „Inserat erstellen" | Anlegen | Menü *Mein Geschäft* (Dienstleister) bzw. „Gesuch aufgeben" (Planer) |
| Menü „Meine Inserate" | eigene Inserate/Gesuche | *Mein Geschäft* → „Meine Inserate"; *Mein Event* → „Meine Gesuche" (dieselbe Seite) |
| Menü „Auftragsboard" | Termine, Storno-Entscheidungen | Menü *Mein Geschäft* → „Aufträge", Mobilleiste „Aufträge" (neu sichtbar); Seite heißt jetzt ebenfalls „Aufträge" |
| Menü „Business-Cockpit" | Umsatz, Steuer, Belege, Media | Menü *Mein Geschäft* |
| Menü „Benachrichtigungen" | Mitteilungen | Topbar-Glocke, Menü *Konto* |
| Menü „Favoriten" | Merkliste | Menü *Mein Event* |
| Menü „Einstellungen" | Konto, Sicherheit, Nickname | Menü *Konto* |
| Menü „Kontakt & Support" | Hilfe | Menü *Konto* → „Hilfe & Kontakt" |
| Menü „Admin-Bereich" | Verwaltung | eigener Abschnitt, nur Admin (unverändert) |
| Mobilleiste „Board" | Planungs-Board | „Planen" (Planer) bzw. „Aufträge" (Dienstleister); Planungs-Board für Dienstleister im Menü *Mein Event* |
| `explore`, `aktuelles`, `browse`, `home` | Entdecken | **unverändert in dieser Stufe** — Zusammenlegung ist Stufe 2 und braucht eine Entscheidung (s. offene Fragen) |
| alle Rechtsseiten | Pflichtangaben | unverändert (Fußzeile, Routen) — die Pflichtseiten-Prüfung (`recht.mjs`) bleibt Maßstab |

---

## 5 · Umgesetzt (Stufe 1 — Navigation und Kernablauf)

1. **Rollenabhängiger Topbar-Hauptlink** statt „Inserieren" für alle.
2. **Benutzermenü in Abschnitte gegliedert** (*Mein Geschäft* · *Mein Event* · *Konto*), jeder Abschnitt mit sichtbarer Überschrift; Einträge nur umsortiert und umbenannt, keiner entfernt.
3. **Mobilleiste nach Rolle**: Dienstleister erreichen ihre Aufträge mit einem Tipp; „Board" heißt „Planen". Damit ist die frühere Festlegung in `CLAUDE.md` („Mobilleiste bewusst nicht angefasst … Produktentscheidung des Inhabers") durch diesen Auftrag ersetzt — sie stand dort, weil die Entscheidung beim Inhaber lag.
4. **„Gesuch aufgeben" öffnet die Maske mit „Ich suche"** — auch für Dienstleister (`/create-listing/suche`, teilbar). Die bestehende Rollen-Voreinstellung (Planer „Ich suche", Dienstleister „Ich biete") bleibt, die ausdrückliche Wahl schlägt sie. Der Schalter bleibt bedienbar.
5. **Benennung**: „Auftragsboard" heißt sichtbar überall „Aufträge" (Menü, Mobilleiste, Seitentitel, Assistent, Zahlungsbestätigung) — ein Board-Wort weniger.
6. **Tastatur und Screenreader im Menü**: `aria-expanded`, Fokus auf den ersten sichtbaren Eintrag, Escape schließt und gibt den Fokus zurück; Symbole in Menü und Mobilleiste sind `aria-hidden` (vorher las ein Screenreader „view_kanban Planungs-Board"). Auf kleinen Bildschirmen scrollt das Menü in sich, statt unter den Rand zu ragen.

Alle sind mit Browser-Tests abgesichert (`navigation-rollen.spec.js`), einschließlich eines Tests, der prüft, dass **jedes** bisherige Menüziel für mindestens eine Rolle erreichbar bleibt.

## 6 · Weitere Stufen (Vorschlag, nicht umgesetzt)

| Stufe | Inhalt | Befunde |
|---|---|---|
| 2 · Entdecken bündeln | `explore` in `aktuelles` aufgehen lassen, „Feed" → „Entdecken", eine Ergebnisansicht mit Gesuchen als eigenem Kanal | F02, F22–F24 |
| 3 · Planer-Event | eine Event-Erstellung mit Vorlage, Kanban als Nebenansicht, Ladezustand ≠ Leerzustand | F10–F14, F18 |
| 4 · Dienstleister-Arbeitsplatz | Anfragen ≠ Aufträge, zustandsgerechte Leerzustände (Auszahlung einrichten), Cockpit nur Finanzen | F05, F07–F09, F19 |
| 5 · Einheitliche Bausteine | „Noch keine Bewertungen", Preis mit Einheit, Vertrauensabzeichen nur bei belegten Kriterien | F04, F20, F21 |
| 6 · App-Shell | kompakte Fußzeile auf Arbeitsseiten, echte `href` statt `href="#"` | F25, F26 |

## 7 · 3D-Szene — Bewertung

**Empfehlung: jetzt nicht.** Gründe, alle aus Messungen in `CLAUDE.md`, nicht vermutet:

- Die Startseite brauchte am 04.09.2026 mobil **5,9 s bis LCP und 6,1 s bis zur Bedienbarkeit**; der Hauptthread ist im Leerlauf bereits durch **105 Dauer-Animationen** und den Marquee belegt. Eine WebGL-Szene käme oben drauf.
- „Bewegungsreduktion kostete das Doppelte" — schon die vorhandene Deko hat die Gruppe, die Bewegung meiden will, teurer bedient. Eine Scroll-Szene braucht von Anfang an einen eigenen, gemessenen Ruhe-Pfad.
- Die Struktur ist erst in Stufe 1 klar. Eine Szene „Location → DJ → Catering → Deko → Suche" erklärt den Ablauf nur, wenn die Suche, in die sie führt, schon die gebündelte aus Stufe 2 ist.

**Wann sie sich lohnen könnte:** nach Stufe 2, als *ersetzende* (nicht zusätzliche) Startseiten-Bühne, mit Budget: kein Einfluss auf LCP (nachgeladen per `IntersectionObserver`), statisches Bild als Ersatz ohne WebGL und bei `prefers-reduced-motion`, Assets < 300 KB (glTF/Draco). Three.js und GSAP sind **nicht** im Stack; beide wären neue Abhängigkeiten im Theme (`assets/lib/`, `eb-`-Handle, CSP).

## 8 · Annahmen und offene Fragen

**Annahmen**
- A1 — Die Rollen „Event-Planer" und „Dienstleister" aus `currentUser.role`/`baseRole` sind die richtige Trennlinie; ein Dienstleister plant gelegentlich selbst.
- A2 — Dienstleister öffnen die App unterwegs vor allem für Aufträge und Termine, nicht zum Planen. (**Nicht gemessen** — es gibt keine Nutzungsdaten im Repo.)
- A3 — (zurückgezogen) Die Gesuche mit Anbieterpreis entstanden **nicht** über den voreingestellten Typ — die Rollen-Voreinstellung war schon richtig (siehe 1.3).

**Offene Fragen an den Inhaber**
- Q1 — Sollen `explore` und `aktuelles` zusammengelegt werden (Stufe 2)? Welcher Name: „Entdecken" oder „Feed"?
- Q2 — „Favoriten" oder „Merkliste" — welcher Begriff gilt überall?
- Q3 — Sollen bestehende Gesuche, die als „Angebot" gespeichert sind, umgestellt werden? Das wäre ein Eingriff in echte Daten und ist **nicht** Teil dieser Arbeit.
- Q4 — 3D: nach Stufe 2 ein Prototyp mit Messbudget, oder ganz verzichten?

## Quellen der Befunde F01–F32

Live-Audit vom 15.10.2026 (Codex), Datei `docs/ux-audit-2026-10-15/AUDIT-UND-ABDECKUNG.md`
im Arbeitsbereich des Audits. Sie ist **nicht** im Repository, weil sie das
Konto des Inhabers namentlich nennt und das Repository öffentlich ist.
