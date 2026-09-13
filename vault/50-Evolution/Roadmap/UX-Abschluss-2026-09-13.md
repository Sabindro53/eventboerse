---
layer: L5
domain: evolution
share: internal
tags: [layer/L5, domain/evolution, share/internal, ux, booking]
---

# Eventbörse: zusammenhängende Nutzerwege

Stand: 13. September 2026. Arbeitszweig `codex/event-platform-ux`, aufgebaut auf
`8bf3d8e`, zusammengeführt mit Hauptzweig `a927b4e`. Die ältere Arbeitskopie bleibt mit ihren vorhandenen Änderungen erhalten.

## Umgesetzt

- Feed/„Jetzt“ und Radar verwenden gemeinsame Orts-, Zeit- und Kategorienfilter.
  Das Radar berücksichtigt externe Aktivitäten und echte Plattformangebote.
  Zeitlich abgelaufene Termine erscheinen nicht als aktuelle Vorschläge.
  Nicht erfasste Regionen, Ladefehler und tatsächlich leere Ergebnisse haben
  unterschiedliche Meldungen und nächste Schritte.
- Der aktualisierte Sammler hat 954 echte Einträge geliefert: 154 Sporttermine und
  800 Orte in Köln, Düsseldorf, Dortmund, Berlin, Hamburg, München, Frankfurt
  und Stuttgart samt Umgebung. Alle 954 Datensätze bestehen die Quellenprüfung.
  Quellen und externe Weiterleitung sind sichtbar.
- „Mit Freunden planen“ führt zur Gruppe mit Namens-/Datumsvorgabe, Freundesauswahl
  und echtem gespeichertem Plan. Aktivitätsquelle und Termin werden übernommen.
  Freunde sind per Handle auffindbar; Einladungen lassen sich annehmen oder über
  einen kopierbaren Link teilen. Einladungslinks treten einer Gruppe nicht automatisch bei.
- Das persönliche Board startet mit Projekten und Planungsübersicht. Der Assistent
  bleibt optional. Hochzeit: 18 auswählbare Bausteine, individuelle Ergänzungen,
  Budget, Notizen, Leistungen, Gästezahl und Checkliste. Bestehende Buchungskarten
  bleiben erhalten. Beim ersten gemeinsamen Weiterplanen werden Planungsansätze
  in einen Gruppenplan kopiert. Danach öffnet derselbe Einstieg diese Gruppe.
  Persönlicher und gemeinsamer Plan sind keine automatisch synchronisierten Kopien.
- Eigene Profile bieten rollenabhängige Wege zu Planung/Merkliste oder
  Aufträgen/Einnahmen/Angeboten, außerdem Freunde und Nachrichten.
- Chat und Zahlung gehören zum jeweiligen Inserat. Preis und angenommenes Angebot
  werden serverseitig geprüft; kein frei vom Browser bestimmbarer Buchungspreis.
  Wiederholtes Bezahlen wird über Zahlungszuordnung und Idempotenz abgefangen.
  Änderungen am Angebot und Zahlungsbeginn verwenden dieselbe Datenbanksperre.
  Bezahlte Vereinbarungen lassen sich nicht einfach zurückziehen oder löschen.
- Kontaktfilter blockiert erkannte externe Kontaktangaben und erlaubt normale
  Datumsangaben. Der veröffentlichte Veranstaltungsort bleibt besprechbar.
- Anbieter/Support können vollständige Erstattungen mit Grund auslösen. Käufer
  können keine eigenmächtigen Rückzahlungen starten. Statusdialog und signierte
  Webhooks unterscheiden ausstehende, bestätigte und fehlgeschlagene Erstattungen.
  Verspätete Pending-Webhooks überschreiben keinen bestätigten Endstatus.
  Bei Connect werden Transfer und Plattformgebühr zurückgeführt.

## Prüfung

Der zusammengeführte Prüfstand umfasst 1061 Tests in 68 Suiten. Neue Fälle prüfen Radar-Konsistenz,
Planung/Speicherung, Freunde/Einladungen, Kontowechsel, Centbeträge sowie die
serverseitigen Grenzen von Angeboten und Erstattungen. PHP wird in diesen
Grenztests ausgeführt; WordPress/Stripe werden dafür kontrolliert ersetzt.
Ergebnis: Im Gesamtlauf bestanden zunächst 1019 von 1036 Fällen (10,8 Minuten).
Alle zunächst fehlgeschlagenen Bereiche wurden anschließend gezielt erneut geprüft:
20/20 (Buchungsgrenzen, CSS, Gruppenwege, Planung), 5/5 im Release-Bereich,
6/6 Gruppen-/Routingfälle, 26/26 Smoke-Fälle und 46/46 für Sprache/WebP.
Der zusätzliche WordPress-Routingfall erhöht den Bestand auf 1037 Tests.
Der vollständige zusammengeführte Lauf ergab 1053/1055 bestandene Fälle (9,4 Minuten).
Die zwei Befunde waren die Sprint-Dokumentationsreihenfolge und eine zeitabhängige
Loader-Gegenprobe. Beide wurden korrigiert; 116/116 Fälle der betroffenen Suiten
bestanden in der Nachprüfung. Die Loader-Gegenprobe prüft nun das ausgelieferte
HTML, weil der Loader nach dem Browser-Ladeereignis bereits korrekt entfernt sein
kann. Das anschließende Verschwinden bleibt am laufenden DOM geprüft.
Ein isolierter Mutationstest schaltete die Erstattungsberechtigung absichtlich aus:
der zugehörige Test schlug wie erwartet fehl (HTTP 200 statt 403). Der Produktcode
blieb dabei unverändert.

Die Nachprüfungen behoben auch vorhandene Prüfstandsfehler: Ein Negationszeichen
fehlte bei der großen Bildspeicherprobe; das Speicherlimit wird nun explizit
vorgegeben. PHP-Warnungen bleiben auf stderr sichtbar und beschädigen kein JSON.
Die Mikrofonprobe wartet auf den tatsächlichen Aufnahmestart und verwendet denselben
konfigurierten Browser wie die übrige Suite. Der Radar-Test grenzt seinen aktiven
Radiusknopf gegen die nun ebenfalls vorhandenen Zeitfilter ab.

Build-/Wissens-Gate, Icon-Abdeckung, Kontextabgleich, PHP-Syntax und Diff-Prüfung
werden separat ausgeführt. Die lokale npm/npx-Verknüpfung war defekt; Wiederholungen
verwenden temporäre Wrapper auf die bereits installierte npm-Distribution.

## Noch keine Produktionsabnahme

- Keine Live-Zahlung, kein echter Anbietertransfer, keine echte Erstattung,
  kein Deployment in dieser Änderung. WordPress-Datenbank und Stripe-Testkonten
  müssen den vollständigen Ablauf einschließlich doppelter Requests,
  verzögerter Webhooks, fehlendem Guthaben und Supportfall gemeinsam durchlaufen.
- Ein sofortiger Transfer ist keine Treuhandabsicherung oder garantierte Erstattung.
  Stripe beschreibt Plattformbelastung und Transferrückführung bei
  [Destination Charges](https://docs.stripe.com/connect/destination-charges).
  Ein belastbares Kundenschutzprodukt braucht eine eigene finanzielle Deckung und
  Betriebsprozesse; dafür wird im Interface keine neue Garantie erfunden.
- Die vorhandene Vorgründungs-/Testmodus-Sperre bleibt aktiv. Nationale
  Quellenabdeckung, Meta/Facebook-Zugang und zusätzliche Veranstaltungspartner
  sind nicht durch diese acht Regionen ersetzt. Ein regelmäßiger erfolgreicher
  Datenabruf muss im Betrieb überwacht werden.
- Kontaktfilter sind keine lückenlose Umgehungserkennung (z. B. Bilder oder
  absichtlich verschleierte Angaben). Durchsetzung braucht zusätzliche Moderation.
- Responsive Web wurde geprüft; ein nativer App-Store-Build wurde nicht erstellt.

## Live-Prüfung mit bereitgestellter Admin-Sitzung

Die angemeldete Live-Seite wurde über die Oberfläche geprüft: Suche, Feed/Jetzt,
Radar, Freunde/Gruppen, Board, eigenes Profil, Nachrichten und Admin-Bereich.
Nutzerverwaltung und Gesprächsliste laden. Es wurden keine Nachrichten gesendet,
keine Nutzer verändert und keine Zahlungen ausgelöst.

Bestätigte Unterschiede zum neuen Stand:

- „Jetzt“ meldet live weiterhin „Noch nichts abgerufen“.
- Der Board-Einstieg öffnet live weiterhin den Planungsassistenten.
- Gruppen existieren, der Aktivitätseinstieg bereitet jedoch keinen Gruppenplan vor.
- Ein direkt geladener `/freunde`-Link liefert live eine Fehlerseite. Im Code fehlte
  diese Route im WordPress-Routing; `freunde`, `business`, `my-listings` und
  `auftraege` wurden ergänzt. Die parallel auf main ergänzte Routenfassung erneuert die
  gespeicherten Rewrite-Regeln bei Änderungen einmalig und ersetzt unseren
  vorläufigen Fallback. Sie deckt außerdem notifications und home ab.
  Die sieben zugehörigen Tests ersetzen unseren einzelnen Fallback-Test.
- Profile behaupten auch ohne Inserat Verfügbarkeit und Antwortgeschwindigkeit.
  Die pauschalen Behauptungen wurden entfernt; tatsächliche Profilangaben bleiben.
- Der Live-Radar bezeichnet auch Gesuche als Dienstleister. Der überarbeitete
  gemeinsame Filter schließt Gesuche aus den buchbaren Anbietern aus.

Die Live-Prüfung validiert den Ausgangszustand. Sie ersetzt keine Abnahme der
noch nicht veröffentlichten Änderungen am produktiven WordPress-System.

## Auslieferung und Rückfallplan

Verantwortlich: Codex in diesem Auftrag. Nächster Schritt: PR-Prüfungen und
regulärer Merge mit anschließendem IONOS-Deploy. Die bestehenden Testmodus- und
Vorgründungssperren bleiben aktiv. Diese Änderung erhöht keine Datenbankversion.
Bei PHP-Fehlern, defektem Login oder nicht erreichbaren Kernseiten nach dem Deploy
wird der Auslieferungscommit regulär zurückgenommen und erneut deployt; keine
Datenbanklöschung und kein Umschreiben der Historie. Erstellte Pläne bleiben erhalten.
