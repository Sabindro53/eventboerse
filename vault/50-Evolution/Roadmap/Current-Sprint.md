---
layer: L5
domain: evolution
share: internal
tags: [layer/L5, domain/evolution, share/internal]
---

# Roadmap: Aktueller Sprint

> Ziel: Die beste und funktionalste Eventplattform für jedermann

## Stand heute (2026-11-28)

Diese Zeilen sind der Ist-Stand; der Ensemble-Kontext liest genau diesen Abschnitt.

- **Playwright-Suite: 1595 Tests in 108 Suiten**, blockierendes Gate in `pr-check.yml`
  (Pflicht-Kontexte: PR-Validierung **und** E2E-Testsuite). Läuft ohne Netzzugang.
- **16 Tore** (`npm run gate`) grün; `kontext.mjs` misst die Zahlen in `CLAUDE.md`.
- **Live-Stand-Tor bewährt:** Deploy vergleicht den ausgelieferten `eb-stand` mit dem
  hochgeladenen (zuletzt `94d2228fa573`, 29.10.2026).
- **Release ist gesperrt** — alle Sperren liegen beim Inhaber (nächster Abschnitt).
- **Claude-Routinen laufen nicht** (`ACCESS_DENIED`, Kontoeinstellung der
  Organisation); `tagesroutine.yml` auf GitHub läuft weiter.
- **CLAUDE.md** ist seit 28.11.2026 ein Kern (305 Zeilen); Begründungen in
  `50-Evolution/Lehren/`, die alte Sprint-Historie in `50-Evolution/Archiv/`.
- **Blickfolge des Assistenten** (PR #354, `claude/avatar-blick`): Blender-Raster je
  Figur (`scripts/avatar-blick.py`), der Kopf dreht sich zu Maus und Finger. Offen:
  eigene Augenbewegung und Blinzeln — dafür bräuchte es echte 3D-Modelle.

## Was den Release sperrt (Inhaber)

Stand der letzten Messung **23.–26.09.2026**; seither von hier aus nicht neu geprüft.
Details: Archiv, Abschnitt „Release-Bereitschaft".

1. **Kein verbundenes Stripe-Connect-Konto** → jede Buchung endet mit 409. Der Code trägt
   (am 24.09. im Browser bis `POST /stripe/connect/onboard` gemessen); es fehlt nur der
   echte Onboarding-Durchlauf.
2. **`EB_STEUERNUMMER` / `EB_UST_ID`**: Secret-Weg über den Deploy ist gebaut, die Werte
   gibt es erst mit der Eintragung der UG. Vorher entsteht bewusst kein Provisionsbeleg.
3. **Impressum:** vier Platzhalter füllen, danach „i. G." entfernen (das Tor verlangt beides).
4. **Stripe-Konto** von `business_type: individual` auf die UG umstellen.
5. **Chargebacks:** werden festgehalten und gemeldet; offen ist die AGB-Klausel, ob der
   Dienstleister einsteht — erst danach ist eine Rückholung baubar.
6. **Rechtsfragen:** ZAG-Einordnung (Anwalt) · PStTG/DAC7 inkl. Abdeckung durch Stripe
   Connect (Steuerberater) · Datenschutzerklärung § 10a, danach `EB_HANDLE_NACHTRAG`.

## Weitere Entscheidungen des Inhabers

- [ ] **Claude-Routinen wieder freigeben:** API-Schlüssel für Routine-Sitzungen oder
      „Claude subscription access for Claude Code" in den Kontoeinstellungen (29.10.).
- [ ] **113 Branches ohne eigenen Inhalt** löschen (80 `routine/*`); gelistet, Löschung
      macht der Inhaber (29.10.).
- [ ] **WordPress-Testumgebung mit Rücksetzpunkt** vor jeder Live-Freigabe: `GET_LOCK` auf
      IONOS belegen, Rollenweg mit getrennten Testkonten (Codex, 21.10.).
- [ ] **Nickname-Probelauf** (`GET /hq/nicknames`) einmal live ansehen, **bevor**
      `EB_HANDLE_NACHTRAG` gesetzt wird.
- [ ] **Profil-Vorschlag F01** wartet auf die Antworten P1–P4 (`PRODUCT_REDESIGN.md` 1.5);
      Datenkorrektur nur nach Entscheidung.
- [ ] **Alte Arbeitskopien** nicht ohne vollständigen Vergleich entfernen; Juni-Patch nie
      blind über neuere Auth-/Migrationslogik legen.
- [ ] **Gestaltung:** die 105 Deko-Animationen (−257 ms Hauptthread) und die
      Oberflächenpunkte unten sind Gestaltungsentscheidungen.

## Technisch offen — nach Priorität

**P0**
- [ ] **Stripe Connect E2E im Testmodus:** Onboarding, PaymentIntent, Webhook, Reconcile,
      Refund/Dispute. Keine echte Buchung ohne aktives Auszahlungskonto.

**P1**
- [ ] Stripe-Flow härten (Reconcile, Return, Regressionsszenarien); API-Version pinnen nur
      mit Gegenprobe im Testmodus.
- [ ] Suche auf DB-Volltext (MySQL FULLTEXT).
- [ ] Echtzeit-Messaging — **Vorsicht:** SSE hält auf dem kleinen IONOS-PHP-Pool je
      Verbindung einen Worker (siehe `CLAUDE.md` · Bekannte Schwächen).
- [ ] CSP ohne `'unsafe-inline'` für Skripte: Nonce in die durchgesetzte `script-src-elem`,
      erst wenn `bereit` im HQ true ist (`Lehren/Sicherheit-und-Geheimnisse.md`).
- [ ] App-Store-Reste: APNs-Schlüssel, Zwecktexte in `Info.plist` (nur Xcode/Mac),
      Händlerstatus vor EU-Listung umstellen.
- [ ] `timeout-minutes` am Job auch für `tagesroutine.yml` und die übrigen Workflows
      (die Regel im Test gilt bisher nur für `pr-check.yml`).
- [ ] Nicknames: Suche nach öffentlichem Anzeigenamen, Hinweis beim nächsten Besuch,
      Profil-Links per Nickname.
- [ ] Seitenpakete aus dem UX-Briefing: Angebote/Gesuche, Rollen-Shell, Planerprojekt,
      Anbieterablauf.
- [ ] Recherche- und Verbesserungs-Routine laufen nur per Hand; ob die Action `--add-dir`
      und die Werkzeugliste annimmt, zeigt erst ein echter Lauf.

**Oberfläche (kein Tor kann es melden)**
- [ ] Die drei Einstiege der Landeseite auf eigenen Grund stellen (Weiß auf Hell, ~3,5 s).
- [ ] Landeseite auf die Schriftskala von `auftraege` zurückführen (41 vs. 10 Größen).
- [ ] Kennzeichnung „KI-generierter Inhalt" ist der kleinste Text (9–10 px).
- [ ] Mobilleisten-Beschriftung bei 8,32 px.

**Wartbarkeit** (Archify-Diagnose 28.11.2026, nur JavaScript gemessen)
- [ ] Sieben Module über 1500 Zeilen (Board 3180/3748/3083, Auth 2242, Suche 2263,
      Detail 1741, Inserat 1849); `openStageAdvanceModal` mit Verzweigungsgrad 259.
      Vor Änderungen dort zuerst Tests. Keine Import-Zyklen gefunden.

**Beobachten**
- [ ] `radar.spec.js` flackerte am 24.09. einmal; beim nächsten Auftreten die
      **Fehlermeldung** festhalten, nicht als „Flake" abhaken.

**P2:** PWA + Push · Analytics je Listing/Flow · SEO-Pre-Rendering für Landing/Browse.

## Übergaben

Format (`AGENTS.md` §7): **Befund** mit Zahl · **Nächster Schritt** mit Datei und
Fundstelle · **Wer** (`claude` oder `codex`). Neue Einträge oben; abgeschlossene wandern
ins Archiv.

### CLAUDE.md auf den Kern gebracht, Sprint aufgeräumt (28.11.2026)

**Wer:** claude, auf Wunsch des Inhabers. PR #384, Zweig `claude/claude-md-kern`.

**Befund:** `CLAUDE.md` hatte 7083 Zeilen (372 KB), diese Datei 1911 Zeilen — beide
werden in jeder Sitzung geladen. Der OpenRouter-Kontext las von dieser Datei nur die
ersten 22 000 Zeichen und erreichte die Prioritätenliste am Ende nie.

**Umgesetzt:** `CLAUDE.md` → 305 Zeilen; 77 Vorfall-Abschnitte wörtlich in
`50-Evolution/Lehren/`. Diese Datei → Ist-Stand, offene Punkte, Übergaben; die
vollständige Historie wörtlich in `50-Evolution/Archiv/Sprint-Protokoll-2026-05-bis-11.md`.
Offene Punkte aus allen Abschnitten hier zusammengeführt, jeweils mit Datum der letzten
Messung. `kontext.mjs --check` und alle 16 Tore grün.

**Nächster Schritt:** Inhaber prüft die Release-Sperren oben auf Aktualität (Stand
September); erledigte Punkte abhaken statt löschen.

## Verknüpfte Notizen

- [[50-Evolution/Archiv/Sprint-Protokoll-2026-05-bis-11]] — vollständige Sprint-Historie
- [[50-Evolution/Roadmap/Feature-Ideen]] — Ideen-Sammlung
- [[50-Evolution/Roadmap/Bekannte-Bugs]] — Offene Bugs
- [[50-Evolution/AI-Gedaechtnis/Claude-Kontext]] — Prioritätsliste P0/P1
