---
layer: L3
domain: betrieb
share: internal
tags: [layer/L3, domain/betrieb, share/internal, typ/architektur]
---

# Systeme & KI-Verbindungen — die Integrationsschicht des HQ

Umsetzung von HQ 3A. Ziel: neue Schnittstellen als Modul ergänzen, statt sie
in den Agenten einzubauen. Der Kern ist eine Trennung, die alles andere trägt.

## Katalog ist nicht Zustand

| | Katalog | Zustand |
|---|---|---|
| Wo | `assets/eb-connectors.json` (versioniert) | nur im Browser, zur Laufzeit |
| Was | Was es gibt, wie man verbindet, welche Rechte nötig sind, wohin die offiziellen Seiten führen | Verbunden oder nicht, letzte Prüfung, letzter Fehler, Kontingent |
| Quelle | `scripts/connectors.mjs` | echte HTTP-Aufrufe |

**Warum getrennt:** Ein Katalog, der „verbunden" mitliefert, behauptet etwas,
das niemand geprüft hat. Der Prüfer (`--check`) lehnt deshalb jeden Eintrag ab,
der `status`, `letzteSynchronisierung` oder `letzterFehler` enthält.

Jede Karte startet auf **getrennt** und wird erst grün, wenn ein Aufruf
tatsächlich zurückkam. Ein Test fährt die Seite mit blockierter GitHub-API und
besteht nur, wenn dann nichts „verbunden" behauptet.

## Die drei Fähigkeitswerte

Jeder Connector deklariert alle 15 HQ-Funktionen (`connect`, `healthCheck`,
`getQuota`, … ) mit genau einem von drei Werten:

- **ja** — der Anbieter kann es, und das HQ kann es von hier aus aufrufen
- **proxy** — der Anbieter kann es, das HQ nicht aus dem Browser heraus.
  Entweder CORS, oder der Schlüssel läge im Seitenkontext. Braucht eine
  Serverseite, die es noch nicht gibt
- **nein** — gibt es beim Anbieter nicht

Ein fehlender Eintrag ist ein Fehler, keine Auslassung — sonst schleicht sich
später ein „ja" in die Lücke.

## Was ehrlich nicht geht

**Copilot-Restkontingent.** Persönlich nicht als Schnittstelle vorgesehen (die
Metrics-API ist Organisations- und Enterprise-Ebene). Die Karte zeigt den
vorgegebenen Wortlaut statt einer geschätzten Zahl.

**Verbrauch bei OpenAI und Anthropic.** Ein API-Schlüssel im Browser wäre ein
Schlüssel für jeden, der die Seite öffnet. Der Anthropic-Schlüssel liegt als
GitHub-Secret; das HQ prüft, **ob** er hinterlegt ist — GitHub gibt nur Namen
heraus, nie Werte. Das ist eine echte Prüfung ohne Preisgabe.

**Abonnement ≠ API-Guthaben.** Weder ein ChatGPT- noch ein Claude-Abo ist ein
API-Kontingent. Beide Karten weisen das getrennt aus.

## Zugang zum HQ

Seit 2026-08-02 prüft `eb_serve_hq()` in `functions.php` serverseitig auf
`manage_options`, bevor ein Byte das Haus verlässt. Wer nicht berechtigt ist,
bekommt **404** statt 403 — eine Seite, deren Existenz man nicht bestätigt,
wird auch nicht gezielt angegriffen.

Vorher lief die Prüfung im Browser gegen eine im HTML mitgelieferte
Schlüsselliste (`HQ_KEYS`). Wer den Quelltext las, kam rein. Eine Prüfung, die
der Prüfling selbst ausführt, ist keine.

Der direkte Theme-Pfad `/wp-content/themes/…/hq.html` ist zusätzlich in
`.htaccess` gesperrt: dort liefert Apache aus, ohne PHP je zu fragen — ohne die
Sperre wäre die Rechteprüfung schlicht umgehbar.

## Datendateien unter kurzem Pfad

Das HQ läuft unter `/hq`, die Datendateien liegen im Theme-Verzeichnis. Ein
relativer `fetch` zeigt von dort ins Leere — daran scheiterten Connector-Katalog,
Wissensbasis und Selbstcheck gleichzeitig („Connector-Katalog nicht ladbar").
Bei einem Tieflink wie `/hq/connections/github` wäre es sogar eine Ebene weiter
danebengegangen.

Zwei Hälften, beide nötig:

- `functions.php` bedient `/assets/*.json` und `/audit/*.json`
- `hqAsset()` in `hq.html` löst die Pfade absolut auf (relativ nur, wenn die
  Datei direkt als `…/hq.html` geöffnet wird — lokal und über `file://`)

Die Route ist bewusst eng: nur diese zwei Ordner, nur `.json`, kein
Schrägstrich im Dateinamen, kein führender Punkt, und `realpath()` muss
innerhalb des Zielordners landen. Geprüft gegen echte Angriffsmuster
(`../`, `..%2f`, `....//`, Unterordner, `.php`, fremde Ordner) — alle abgewiesen.

Sicherheitlich ändert sich nichts: die Dateien waren über den Theme-Pfad
ohnehin öffentlich lesbar.

## CSP: warum das HQ mit GitHub sprechen darf

Neun von zehn Karten meldeten „Failed to fetch", obwohl Route und Token in
Ordnung waren. Ursache: `connect-src` erlaubte `api.github.com` nicht — der
Browser ließ die Anfragen gar nicht erst raus. Ein abgelehnter Token hätte
401 mit JSON geliefert; „Failed to fetch" ohne Status ist die Signatur eines
CSP-Verstoßes.

`eb_hq_csp_erweitern()` liest den bereits gesetzten Header aus und ergänzt
`connect-src` um `api.github.com` und `raw.githubusercontent.com` — **nur für
die `/hq`-Antwort**. Die öffentliche Seite spricht nie mit GitHub, und was sie
nicht braucht, soll ihr auch nicht offenstehen.

Erweitert statt zusätzlich gesendet: zwei CSP-Header wertet der Browser als
**Schnittmenge** aus. Ein zweiter Header hätte also nichts erlaubt, sondern nur
weiter eingeschränkt.

**Warum die Testsuite das nicht fand:** `verbindungen.spec.js` blockiert
`api.github.com` absichtlich, um zu prüfen, dass dann nichts „verbunden"
behauptet. Ein CSP-Verstoß sieht für den Test genauso aus. Deshalb rechnet
`tests/e2e/csp-hq.php` den Header jetzt separat in PHP durch — gegen die echte
Direktivenliste, mit Zusicherung, dass nur `connect-src` sich ändert.

Die CSP wird ausschließlich in `functions.php` gesetzt; `.htaccess` setzt zwar
andere Sicherheitsheader, aber keine CSP. Es gibt also keine zweite Stelle, die
den Wert überschreiben könnte.

## Zwischengespeicherte Stände

`renderFromCache()` zeigt sofort den letzten bekannten Stand, damit die Seite
nicht leer startet. Scheitert danach der frische Abruf — ohne GitHub-Token
greift das Limit bei 60 Anfragen pro Stunde —, blieb der alte Wert **unmarkiert**
stehen. Im Header stand dann ein Commit-SHA, der längst überholt war, und las
sich wie der aktuelle.

Jetzt trägt jeder aus dem Zwischenspeicher gerenderte Stand den Zusatz
*zwischengespeichert*, bis `loadAll()` ihn durch echte Daten ersetzt. Ein alter
Wert darf angezeigt werden — aber nicht als frischer.

Dasselbe gilt für den Selbstcheck: `audit/latest.json` lag zwei Wochen still
und meldete „Keine automatisierten Tests", während die Playwright-Suite längst
stand. Ein Befund über einen alten Code-Stand ist schlimmer als keiner — man
handelt danach. Zwei Änderungen:

- die **Tagesroutine** (`tagesroutine.yml`, 03:17 UTC) erneuert den Selbstcheck
  zusammen mit dem Demo-Feed und committet, wenn sich etwas geändert hat
- ist der Stand älter als sieben Tage, schreibt das HQ es dazu, statt ihn nur
  zu datieren

## Serverseiten-Proxy für die KI-Anbieter

`/wp-json/eventboerse/v1/hq/probe/{anthropic|openai}`, nur für Administratoren.
Der Aufruf läuft auf dem Server, die Antwort enthält ausschließlich Zahlen und
Zeitpunkte — der Schlüssel erreicht den Browser nie.

| Funktion | Geht? | Wie |
|---|---|---|
| `healthCheck` | ✅ | ein minimaler Aufruf (`/v1/models`) beweist, dass der Schlüssel gilt |
| `getQuota` | ✅ | Rate-Limit-Kopfzeilen, die beide Anbieter bei **jeder** Antwort mitschicken |
| `getResetTime` | ✅ | dito |
| `getUsage` (Verbrauch, Guthaben) | ❌ | verlangt bei beiden Anbietern einen **gesonderten Admin-Schlüssel** |

Der letzte Punkt bleibt ehrlich offen: ein Proxy schafft die Zahl nicht herbei,
die es ohne Admin-Schlüssel nicht gibt.

**Opt-in.** Die Route arbeitet nur, wenn `EB_ANTHROPIC_API_KEY` bzw.
`EB_OPENAI_API_KEY` als Server-Konstante gesetzt sind; der Deploy legt sie nur
an, wenn die passenden GitHub-Secrets existieren. Ohne sie meldet die Karte
„nicht hinterlegt" — kein Schlüssel wandert stillschweigend an einen weiteren
Ort. Wer sie setzt, entscheidet bewusst: der Schlüssel liegt danach auf dem
Webserver und ist bei einer Server-Kompromittierung mit betroffen. Dafür kann
das HQ Gültigkeit und Kontingent prüfen, ohne ihn je auszuliefern.

### WordPress-REST-Nonce: warum der gültige Schlüssel rot war

Die Probe-Routen verlangen `manage_options`. Eine angemeldete Browser-Sitzung
reicht für WordPress-Cookie-Authentifizierung an der REST-API nicht: Fehlt der
`X-WP-Nonce`-Header, setzt WordPress den aktuellen Nutzer für den REST-Aufruf
auf 0. Das HQ sah deshalb bei Anthropic, OpenAI und OpenRouter 401/403
„Serverseite verweigert den Zugriff", obwohl Anmeldung, Route und Schlüssel in
Ordnung waren.

`eb_serve_hq()` liest die statische HQ-Datei jetzt serverseitig, ersetzt genau
einen Platzhalter durch `wp_create_nonce('wp_rest')`, und die Proxy-Prüfung
sendet ihn als `X-WP-Nonce`. Die Antwort ist admin-only sowie `private,
no-store`; der direkte Theme-Pfad bleibt gesperrt.

## OpenRouter-Autopilot

`openrouter-autopilot.yml` ist seit 2026-08-04 die geplante KI-Routine. Ein
Lauf nutzt vier voneinander getrennte Rollen und strukturierte JSON-Ausgaben:

| Rolle | Primärmodell | Aufgabe |
|---|---|---|
| Scout | Gemma 3 12B | genau eine kleine, sichtbare Verbesserung auswählen |
| Architektur | Llama 3.3 70B | Scope, Invarianten und Abnahme festlegen oder stoppen |
| Implementierung | Qwen3 Coder 30B | kleinen Unified-Diff schreiben |
| Review | DeepSeek V4 Flash | unabhängig ablehnen oder mit ≥ 86 % freigeben |

OpenRouter übernimmt Provider- und Modell-Fallbacks. Der Request verlangt
Provider ohne Datenweitergabe (`data_collection: deny`) und Unterstützung aller
verwendeten Parameter. Jeder Wochenlauf ist auf 0,35 USD begrenzt. Hat der Key
ein eigenes Limit, startet er unter 1 USD Rest nicht; OpenRouters `null` bei
einem Key ohne eigenes Limit darf dabei nicht als 0 USD interpretiert werden.
Formal erfolgreiche, aber leere/nicht parsebare Antworten lösen zusätzlich
einen rollenweisen Modell-Fallback aus; auch solche Versuche zählen zum selben
0,35-USD-Laufbudget und werden nie als Patch weitergereicht.
Das Provider-Schema enthält nur portable Structured-Output-Schlüssel. Alle
feineren Längen-, Mengen-, Datei- und Risikogrenzen laufen anschließend als
deterministischer Code und können vom Modell nicht abgeschwächt werden.

**Doppelte technische Grenze:** Das Agentenskript lässt nur eine feste Liste
kleiner Frontend-Dateien zu und blockiert unter anderem Auth, Payment, Backend,
Workflows, Netzwerk, Cookies, Storage, neue Dateien und mehr als 260
Diff-Zeilen. Nach dem Patch laufen Reproduzierbarkeits-Gate und die komplette
Testsuite. Der Auto-Merge-Workflow liest die PR-Dateiliste anschließend neu,
akzeptiert nur den exakt zum erfolgreichen Autopilot-Lauf gehörenden,
vertrauenswürdigen Branch und merged ihn per Squash. Weil GitHubs eingebauter
`GITHUB_TOKEN` absichtlich keine Folge-Workflows durch PR oder Push auslöst,
startet der Wächter den bestehenden IONOS-Deploy danach explizit auf `main`.

Die früher geplanten Anthropic-Routinen bleiben manuell als Legacy-Fallback,
haben aber keinen Cron mehr. So laufen nicht zwei autonome Systeme mit
getrennter Abrechnung gegeneinander.

## Nicht jede Datendatei ist öffentlich

Die Route `/assets/*.json` war anfangs offen für alle. Das war zu weit:

| Datei | Sichtbar für | Warum |
|---|---|---|
| `eb-knowledge.json` | jeden | der Website-Bot befragt sie, sie enthält nur `share: public` |
| `eb-demo-feed.json` | jeden | Demo-Inhalte für jeden Besucher |
| `eb-connectors.json` | Administratoren | nennt Berechtigungen, interne Endpunkte, Schlüssel-Ablagen |
| `audit/latest.json` | Administratoren | listet die Schwachstellen der eigenen Codebasis |

Keine Geheimhaltung um ihrer selbst willen — beides ist schlicht eine
Landkarte, die man Angreifern nicht mitgibt. Nicht-öffentliche Dateien gehen
mit `Cache-Control: private, no-store` raus, damit kein geteilter
Zwischenspeicher sie für einen anderen Abrufer aufhebt.

## Wo Geheimnisse liegen

| Ablage | Was | Erreichbar für |
|---|---|---|
| GitHub Secrets | `EB_ANTHROPIC_API_KEY`, `EB_OPENAI_API_KEY`, `EB_OPENROUTER_API_KEY`, `IONOS_FTP_*`, `EB_SMTP_*`, `EB_STRIPE_*` | nur Actions-Läufe |
| `wp-config.php` | zur Laufzeit injizierte Konstanten | nur der Server |
| `sessionStorage` | GitHub-Token, von Hand eingegeben | nur dieser Tab, dieser Rechner |
| Server-Konstanten | `EB_ANTHROPIC_API_KEY`, `EB_OPENAI_API_KEY` (opt-in) | nur der Server, nie die Antwort |
| Repo / Vault / Katalog | **nichts** | — |

Der Katalog-Prüfer scannt jeden Eintrag gegen die Verbotsmuster aus
`scripts/lib/verbotsmuster.mjs`.

## Einen Connector ergänzen

1. Eintrag in `CONNECTORS` in `scripts/connectors.mjs` — alle 15 Fähigkeiten
   deklarieren, Methode, Rechte, Grenzen, offizielle Links
2. `node scripts/connectors.mjs` und die erzeugte JSON mitcommitten
3. Falls prüfbar: Eintrag in `CONN_PRUEFUNG` in `hq.html` — die Prüfung muss
   einen echten Aufruf machen und im Fehlerfall den Fehler zeigen, nicht
   schweigen
4. `npm run gate`

Ohne Schritt 3 bleibt die Karte grau. Das ist der gewollte Standardfall: lieber
ehrlich grau als unbelegt grün.

## Neuronaler Kern & Modell-Ensemble

Das HQ hat seit 2026-08-03 einen anderen Mittelpunkt. Statt Spiel-HUD oben und
QA-Bot unten rechts steht jetzt der **neuronale Kern** an der Spitze: sechs
Bereichsknoten im Ring, in der Mitte der KI-Kreis.

**Die eine Regel, die alles trägt:** ein Impuls auf einer Bahn entspricht
**einem echten Ereignis**. Keine Dauer-Animation, kein dekoratives Pulsieren.
Ein System, das nichts tut, sieht hier auch so aus — sonst wäre die Anzeige
genau dann wertlos, wenn man sich auf sie verlässt. `ebImpuls(bereich, art)`
wird ausschließlich dort aufgerufen, wo tatsächlich etwas zurückkam:
Verbindungsprüfung, geladener Selbstcheck, frische Commits. Ein Test prüft,
dass nach 1,4 Sekunden wieder null Impulse im DOM stehen.

### Sechs Bereiche, drei Autonomiestufen

Das Kriterium ist **Reversibilität**, nicht Vorsicht.

| Stufe | Bereiche | Warum |
|---|---|---|
| handelt selbst | Architektur, Betrieb, Intelligence | Draft-PR, Rollback in einer Minute, Quarantäne davor |
| stoppt vor dem Senden | Community, Sales | ein Beitrag unter unserem Namen steht im Netz; eine Zusage bindet |
| bereitet nur vor | Finance | eine Überweisung ist nicht rückholbar |

Jede Grenze trägt ihre Begründung sichtbar im HQ unter „Wartet auf dich" —
nicht als stille Sperre. Der Prüfer lehnt jeden Bereich ab, dessen Begründung
kürzer als 40 Zeichen ist: eine Grenze ohne Grund wird irgendwann verschoben,
weil niemand mehr weiß, warum sie da war.

### Drei Ebenen im Kern

Die erste Fassung hatte nur einen Ring aus sechs Bereichen — zu wenig, um zu
zeigen, wer woran arbeitet. Jetzt drei konzentrische Ebenen:

| Ebene | Was | Woher |
|---|---|---|
| Mitte | **Wissenskern** — ein Punkt je Abschnitt der Wissensbasis | `eb-knowledge.json` |
| Ring 1 | die sechs **Bereiche** mit ihrer Autonomiestufe | `eb-models.json` |
| Ring 2 | zehn **KI-Mitarbeiter** mit Namen, Rolle und Arbeitsstand | `eb-models.json` + Actions-API |
| Ring 3 | die **Werkzeuge**, die sie benutzen | `eb-connectors.json` |

Ein Klick auf einen Bereich klappt ihn als **Baum** auf: der Bereich unten,
seine Mitarbeiter darüber, deren Werkzeuge ganz oben. Eine Hierarchie liest man
von unten nach oben — ein zweiter Ring hätte nur wie eine kleinere Übersicht
ausgesehen.

Die Punkte im Kern sind nicht beliebig: ihre Zahl folgt der tatsächlichen
Größe der Wissensbasis. Ein dichter Kern bei leerem Vault wäre Dekoration.

### Mitarbeiter statt Modelle

Jede Rolle hat einen **Namen** (Ada Brenner, Kito Sarr, Nils Falk …), damit man
über sie reden kann. Der Name verdeckt nie das Modell — beides steht immer
zusammen auf der Karte, und der Prüfer lehnt einen Namen ab, der dem
Modellnamen gleicht.

Dazu pro Stelle:

- **Auslöser** — wann sie arbeitet („bei jedem Pull Request")
- **Schicht** — welcher echte Workflow sie ausführt; der Prüfer verlangt, dass
  die Datei in `.github/workflows/` existiert
- **Arbeitsstand** — aus echten Läufen der Actions-API: *arbeitet gerade*,
  *zuletzt vor 3 Std.*, *fehlgeschlagen* oder *unbekannt — kein Token*. Ohne
  Token gibt es keine Läufe, und dann steht dort „unbekannt", nicht „bereit"
- **Gehaltsvergleich** — was dieselbe Aufgabe als menschliche Stelle kostet.
  Ausdrücklich ein Vergleichswert, keine Behauptung, dass ein Modell jemanden
  ersetzt. Er macht den Umfang sichtbar: 482 000 € über acht besetzte Stellen

Der Arbeits-Puls am Knoten ist neben dem Hör-Ring die **einzige** zweite
Dauer-Animation im Kern — und er läuft nur, solange ein Workflow tatsächlich
`in_progress` ist.

### Die Mitarbeiter arbeiten wirklich

Bis 2026-08-04 waren die Rollen beschrieben, aber niemand rief sie auf — der
Unterschied zwischen einem Organigramm und einem Betrieb.

`scripts/agent.mjs` lässt eine Rolle ihre Schicht arbeiten: Kontext einsammeln,
das Modell über OpenRouter aufrufen, Ergebnis ins **Arbeitsjournal**
(`assets/eb-arbeit.json`) schreiben.

| Wo | Wer | Wann |
|---|---|---|
| `tagesroutine.yml` | Lagemelder (Nils Falk) | täglich, fasst den Betriebszustand zusammen |
| `tagesroutine.yml` | Sortierer (Ela Voss) | täglich, ordnet die Wissenslücken |
| `pr-check.yml` | Code-Prüfer (Kito Sarr) | bei jedem PR, kommentiert den Diff |

Drei Eigenschaften, die das Ganze tragfähig machen:

**Ohne Schlüssel fällt die Schicht aus, statt zu lügen.** Der Lauf endet mit 0 —
eine Routine soll nicht rot werden, weil ein optionaler Schlüssel fehlt. Aber
der Ausfall steht als `uebersprungen` im Journal. Ein Journal, das nur Erfolge
führt, sieht aus wie ein Betrieb ohne Ausfälle.

**Geheimnisse verlassen den Betrieb nicht.** Vor jedem Aufruf wird der Kontext
gegen die Verbotsmuster gescannt. Ein Treffer bricht ab und wird notiert —
lieber gar nicht arbeiten als einen Schlüssel an einen fremden Dienst schicken.

**Die Grenze steht im Auftrag, nicht nur im Dashboard.** Der Entwurfsschreiber
liest „wird NICHT gesendet", der Anfragen-Sichter „mache keine Zusage", der
Abweichungs-Melder „löse nichts aus". Ein Modell, das seine Schranke erst
nachgelagert erfährt, hat sie schon überschritten.

Der Code-Prüfer **kommentiert nur** — der PR wird von ihm nie rot. Ein
Hinweis, kein Gate.

### Der Kreis führt ein Gespräch

`/wp-json/eventboerse/v1/hq/chat` schickt die Frage zusammen mit den lokal
gefundenen Abschnitten an ein offenes Modell (Mistral Small 3). Vorher
beantwortete der Circle Fragen über Stichwort-Treffer — das reicht für „Wie
hoch ist die Provision?" und scheitert an jeder anders formulierten Frage.

Zwei Grenzen stehen im Systemauftrag selbst:

- Es wird **ausschließlich** aus dem mitgelieferten Wissen geantwortet. Was
  nicht dasteht, wird als „weiß ich nicht" beantwortet — ein erfundener
  Provisionssatz wäre schlimmer als keine Antwort.
- Die Route **liest nur**. Sie löst nichts aus, ändert nichts, deployt nichts.

Die Auswahl des Wissens bleibt im Browser (`topTreffer()`); der Server bekommt
nur, was ohnehin freigegeben ist, und nie die ganze Wissensbasis. Ohne
Schlüssel fällt der Kreis auf die Stichwortsuche zurück — schwächer, aber sie
erfindet nichts.

### Das Ensemble

`assets/eb-models.json` (aus `scripts/models.mjs`) führt zehn Modelle mit je
**genau einer** Rolle. Ein Allrounder wäre im Betrieb nicht nachvollziehbar:
fällt er aus, weiß niemand, was fehlt.

Aufnahmebedingung ist `offen: true` — freie Gewichte. Was heute über
OpenRouter läuft, muss morgen auf eigener Hardware laufen können, ohne dass
eine Zeile Aufgabenlogik sich ändert. Deshalb steht in jedem Eintrag die
**Rolle vor dem Namen**; der Anbieter ist die austauschbare Stelle.

Der Aufruf läuft über `/wp-json/eventboerse/v1/hq/probe/openrouter` —
serverseitig, opt-in wie die anderen Schlüssel. OpenRouter ist der einzige
Anbieter, der Verbrauch ohne gesonderten Admin-Schlüssel herausgibt; das darf
die Antwort auch sagen.

### Stimme

Der sprechbare Text ist die **Datenquelle**, nicht die Oberfläche. Heute
spricht die Web-Speech-API des Browsers — kostenlos, lokal, nichts verlässt
den Rechner. Der Wechsel zu Kokoro oder Whisper kostet genau eine Funktion;
beide stehen bereits als Rolle im Ensemble.

Ein Klick auf die Mitte **startet die Stimme**: Oberfläche auf und Mikrofon an,
in einem Griff. Vorher öffnete der Kreis nur den Chat in der Ecke — das ist die
Bedienung eines Eingabefelds, nicht einer Stimme. Wer auf einen sprechenden
Kreis tippt, will reden.

Der Kreis in der Ecke bleibt als Nebeneingang, kleiner und ruhiger. Beide Wege
führen zur selben Oberfläche: das Zentrum ist der Ort, an dem man ihn sucht,
die Ecke der schnelle Griff beim Scrollen.

## Verwandt
- [[30-Betrieb/MCP-Architektur]] — MCP als gemeinsame Verbindungsschicht
- [[00-Kern/Sicherheits-Klassifikation]] — was den Vault verlässt
- [[50-Evolution/Recherche/_Schleuse]] — externer Zufluss
