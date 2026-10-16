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
- Bei der Inventur sah es so aus, als öffne die Inserat-Maske für Planer immer auf „Ich biete" — der Router setzt beim Öffnen `_clSetType('offer')`. **Widerlegt:** `updateCreateFormForRole()` läuft danach und stellt Planer bereits auf „Ich suche". Ein Test hält das jetzt fest. Die Ursache von F01–F03 (Gesuche mit Anbieterpreis in der Dienstleistersuche) liegt also **nicht** hier — siehe 1.4.
- Was wirklich fehlte: eine **ausdrückliche** Wahl über den Weg. Ein Dienstleister, der selbst ein Gesuch aufgeben will, landete auf „Ich biete".

### 1.4 Ursache von F01–F03 (gemessen am 16.10.2026)

- **Daten:** Die öffentliche Inserate-Route der Live-Seite liefert beide Gesuche aus F02 mit `listingType: "offer"`, „ab … € / Event" und Bewertung 0. Angelegt im März, vor Migration 2.3 (Juli). Deren Nachmarkierung über den Titel lief nie: sie steht in `if ( ! $tcol )`, und `eb_create_tables()` legt die Spalte vorher per dbDelta selbst an.
- **Darstellung:** Keine Karte (Suche, Laufband, Meine Inserate) las den Typ; `listingType` wurde nur in Board-Auswahl, Assistent und Bearbeiten gelesen.
- **Umgesetzt (Q3: nur Darstellung):** eine Erkennung `ebIstGesuch()` mit der Titelregel als Rückfall; Gesuche zeigen „Gesuch" und „Budget: …", unter „Meine Inserate" ohne Bewertung und ohne „Verfügbarkeit". Gesuche bleiben in der Suche; ein eigener Kanal ist Stufe 2.
- **Offen:** F01 (Planer-Profil mit Anbieter-Spezialisierung) liegt in der Profilansicht. Die Migration bleibt kaputt; sie zu reparieren hieße, echte Zeilen umzuschreiben (Entscheidung des Inhabers).

### 1.5 F01 — das Profil eines Planers (gemessen am 16.10.2026, Vorschlag)

**Messung.** Ein Profil, dessen beide Inserate die zwei Gesuche aus F02 sind, im echten Browser geöffnet (Dev-Shell, API-Antwort in der Gestalt der Live-Route `provider/1`):

| Bereich | angezeigt | Herkunft |
|---|---|---|
| Unterzeile im Kopf | „DJ & Musik · Köln" | Kategorie und Ort des **ersten Inserats** |
| Kennzahlen | 2 Inserate · Bewertung „–" · 0 Reviews | Inserate |
| Auf einen Blick | „ab 200€ / Event", „Termin und Verfügbarkeit im Chat klären" | Preis des ersten Inserats |
| Highlights / Spezialisierungen | „Individuelle Absprache" / Hochzeit, Geburtstag, Firmenfeier | `features` / `tags` des ersten Inserats |
| Reiter | Inserate · Bewertungen · „Arbeitet zusammen mit" | fest im Markup |
| Bewertungen leer | „Dieser Anbieter ist neu auf Eventbörse." | fest im Code |
| Inserat-Karten | „Gesuch" und „Budget: …" | seit `2af8195` richtig |

**Ursache.** `loadProvider()` (`search/12-detail-provider.js`) kennt keine Profilart. Den Kopf baut es aus dem **ersten Inserat**: Unterzeile, Preis, Highlights und Spezialisierungen sind dessen Felder. Hat jemand nur Gesuche, sieht sein Profil aus wie das eines Anbieters. Die Rolle hilft dabei nicht: Das Konto aus F01 hat live die Rolle **„Admin"**, nicht „Event-Planer". Eine Weiche nur über die Rolle würde es verfehlen. Messbar ist dagegen: **jedes Inserat dieses Profils ist ein Gesuch.**

**Nebenbefund 1: eine Eingabe, die nie erscheint.** Der Inhaber eines Profils kann die Unterzeile direkt bearbeiten (`_provSaveTagline()`); der Text wird als `tagline` gespeichert, und die API liefert ihn aus. Angezeigt wird er auf dem Profil **nie**. Sobald es ein Inserat gibt, überschreibt Zeile 509 die Unterzeile mit Kategorie und Ort. Gespeichert und gemeldet („Tagline gespeichert!") wird also eine Angabe, die nach dem Neuladen verschwunden ist.

**Nebenbefund 2: Sicherheit, nicht Gestaltung.** Die öffentliche Route `provider/{id}` nennt ohne Anmeldung die Rolle `Admin`. Damit ist von außen abfragbar, welche Nutzer-ID Verwaltungsrechte hat. Das gehört nicht in diese Überarbeitung, sondern ist eine eigene Entscheidung des Inhabers (Auth-Nähe, `AGENTS.md` Abschnitt 6).

**Vorschlag (nicht umgesetzt).**

1. **Profilart aus den Inhalten, mit der Rolle als Zusatz.** *Anbieterprofil*, wenn das Konto mindestens ein Angebot hat (`ebIstGesuch()` ist falsch) oder die Rolle „Dienstleister" ist; sonst *Mitgliedsprofil*. Damit werden das Admin-Konto aus F01 und jeder Planer richtig eingeordnet, ohne Datenänderung.
2. **Der Kopf liest das Profil, nicht ein Inserat.** Die Unterzeile ist die gespeicherte `tagline`. Ist keine gesetzt, gilt für Anbieter wie heute Kategorie · Ort, aber aus dem ersten **Angebot**, nie aus einem Gesuch; für Mitglieder nur der Ort.
3. **Das Mitgliedsprofil zeigt, was ein Planer hat:** Avatar, Name, Unterzeile, „Mitglied seit", Über mich und einen Reiter **„Gesuche"** mit den Gesuch-Karten. **Ohne** Bewertungs-Kennzahlen, Preis, „Termin und Verfügbarkeit", Highlights, Spezialisierungen und Portfolio. Der Reiter „Arbeitet zusammen mit" fällt ebenfalls weg, denn er ist eine Liste von Dienstleister zu Dienstleister. Aktionen bleiben: Nachricht senden, Folgen, Teilen.
4. **Mischkonten** (ein Dienstleister mit eigenen Gesuchen) bleiben Anbieterprofile. Kopf, Preis und Spezialisierungen kommen nur aus Angeboten; Gesuche stehen in einem zweiten Reiter „Gesuche" statt zwischen den Angeboten.
5. **Texte:** Der Leerzustand der Bewertungen sagt „Dieses Profil ist neu …" statt „Dieser Anbieter ist neu …".

**Was dabei nicht wegfällt:** Für Anbieterprofile ändert sich nur die Unterzeile, und auch die nur, wenn eine `tagline` gespeichert ist (Punkt 2). Kein Bereich verschwindet für Anbieter, und kein Inserat wird irgendwo ausgeblendet.

**Messbar machen, bevor gebaut wird:** Ein Test öffnet je ein Profil der drei Arten (nur Gesuche, nur Angebote, gemischt) und prüft je Bereich, ob er da ist oder fehlt. Dazu kommt ein Test, der die gespeicherte `tagline` nach dem Neuladen wiederfindet.

**Fragen an den Inhaber**
- P1: Gilt das Kriterium „Inhalte, Rolle als Zusatz" (Punkt 1)?
- P2: Soll die gespeicherte Unterzeile auch bei **Anbietern** den Kopf bestimmen? Das ändert das Aussehen bestehender Anbieterprofile, sofern sie eine gesetzt haben.
- P3: Mischkonten mit zwei Reitern (Punkt 4): ja oder nein?
- P4 (getrennt, Sicherheit): Soll die öffentliche Profil-Route die Rolle „Admin" weiter preisgeben?

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
| `explore`, `aktuelles`, `browse`, `home` | Entdecken | **unverändert in dieser Stufe** — Zusammenlegung zu „Entdecken" ist Stufe 2 (entschieden, Q1) |
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

**Fragen an den Inhaber — entschieden am 15.10.2026**
- Q1 — Sollen `explore` und `aktuelles` zusammengelegt werden (Stufe 2)? Welcher Name?
  → **Ja, zusammenlegen; der Name ist „Entdecken".** Auch „Feed" in der Mobilleiste wird „Entdecken".
- Q2 — „Favoriten" oder „Merkliste"?
  → **„Merkliste" gilt überall**, auch im Menü und im Seitentitel, wo heute „Favoriten" steht.
- Q3 — Sollen bestehende Gesuche, die als „Angebot" gespeichert sind, umgestellt werden?
  → **Nein.** Es gibt keinen Eingriff in echte Daten. Zuerst wird die Ursache von F01–F03 gemessen; eine Korrektur, falls nötig, erfolgt nur in der Darstellung.
- Q4 — 3D: nach Stufe 2 ein Prototyp mit Messbudget, oder ganz verzichten?
  → **Prototyp nach Stufe 2**, als Ersatz der Startseiten-Bühne und mit dem Budget aus Abschnitt 7. Vorher wird nichts gebaut.

## Quellen der Befunde F01–F32

Live-Audit vom 15.10.2026 (Codex), Datei `docs/ux-audit-2026-10-15/AUDIT-UND-ABDECKUNG.md`
im Arbeitsbereich des Audits. Sie ist **nicht** im Repository, weil sie das
Konto des Inhabers namentlich nennt und das Repository öffentlich ist.
