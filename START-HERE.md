# Eventbörse: eine Plattform

Dieser Arbeitsbereich vereint den Produktzweig `claude/plattform-redesign`,
die dort noch offenen Assistenten-Korrekturen und den am 21.10.2026 lokal
bekannten Stand von `origin/main` (`e475b7f`). Arbeitszweig:
`codex/platform-unified`. Die Zusammenführung ist noch nicht veröffentlicht.

## Wo gearbeitet wird

Nur dieser Arbeitsbereich ist die gemeinsame Implementierungsbasis. Die alten
Documents-/Desktop-Kopien und deren Worktrees sind Vergleichsstände. Nicht
gleichzeitig dieselbe Funktion in mehreren Kopien ändern. Die Patches der
erreichbaren offenen Änderungen sind außerhalb des öffentlichen Repositorys
gesichert. Der Juni-Patch ist mit dem aktuellen Code nicht direkt kompatibel;
seine Auth-/Migrationsänderungen benötigen einen separaten fachlichen Abgleich.
Einige weitere alte Kopien sind wegen nicht verfügbarer Dateien noch ungeprüft.
Sie sind ausdrücklich nicht zum Löschen freigegeben.

## Produktkern

Ein Account kann planen und Leistungen anbieten. Ein Event-Projekt verbindet
beide Perspektiven: Planer besitzen Briefing, Budget, Ablauf, Raumplan und
Einladungen; Dienstleister besitzen Angebot, Verfügbarkeit, Ressourcen,
Leistungsumfang und Ausführung. Geteilt werden nur ausdrücklich freigegebene
Projektinformationen, Leistungsstände, Termine und Dokumentversionen.

Der Assistent ist ein Zugang zu denselben Funktionen, kein zweites Produkt und
keine zweite Datenhaltung. Die vorhandene Anwendung bleibt WordPress + Vanilla
JavaScript. Keine Neuentwicklung auf einem zusätzlichen Framework notwendig.

## Verbindliche Einstiege

- Projektregeln: `AGENTS.md`, dann `CLAUDE.md` und die dort genannten Vault-Notizen.
- Einziger operativer Übergabeort: `vault/50-Evolution/Roadmap/Current-Sprint.md`.
- Bestehende Produkterkenntnisse: `PRODUCT_REDESIGN.md`.
- Frontendquellen: `js/modules/**` und `app-shell.html`; `app.js` / `index.html` generieren.
- Ein Implementierungsauftrag pro Datei/Bereich, Prüfungen vor Zusammenführung.
- Zielbild und Journey sind als Konzept gekennzeichnet; keine erfundene Funktionsreife.

## Arbeitsfolge

1. Zusammengeführten Bestand prüfen, Abweichungen benennen, keine Tests abschalten.
2. Alte offene Änderungen fachlich abgleichen und überflüssige Kopien erst danach archivieren.
3. Planer- und Anbieter-Navigation um ein gemeinsames Projektmodell konsolidieren.
4. Raumplan, Ablauf und Budget an denselben Leistungspaketen ausrichten.
5. Buchung, Änderungen, Absage und Nachbereitung durchgehend in einer Testumgebung prüfen.
6. Blender-Begleiter als optionale Darstellung integrieren; Tastatur, Touch,
   Bewegungsreduktion und Leistung haben Vorrang vor Dekoration.

Die Mausfolge der bestehenden Figur ist eine kleine, separate Frontendänderung.
Das neue Blender-Modell bleibt zunächst ein überprüfbarer Gestaltungsprototyp.
