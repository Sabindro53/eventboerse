---
layer: L5
domain: evolution
share: internal
tags: [layer/L5, domain/evolution, share/internal, lehren]
---

# Lehren: Board, Gruppen, Freunde, Profil, Assistent

> Wörtlich aus `CLAUDE.md` ausgelagert am 28.11.2026 (Stand `7340150`).
> Die Regeln daraus stehen kurz in `CLAUDE.md`; hier steht, **warum** —
> Messungen, Fehlschläge, Mutationsproben. Zahlen sind Stand des jeweiligen
> Datums; gepflegte, geprüfte Zahlen stehen nur in `CLAUDE.md`.

## Inhalt

- Freunde und Gruppen — gemeinsame Vorhaben
- Der gemeinsame Plan — das Vorhaben selbst
- Die Hochzeit aus Bausteinen — und das letzte Glied, das fehlte
- Der Assistent spricht — mit einer Fassung, nicht zwei
- Der Dienstleister sah, WAS er liefern muss — nicht, WANN
- Navigation je Rolle — Stufe 1 der Überarbeitung
- Profilarten — das Profil las sein erstes Inserat
- Der Assistent hat ein Gesicht — wählbar, statt des Roboters
- Einladen ohne Konto — ein Link, den man versteht
- Mehrfachzeiten je Paketposition

## Freunde und Gruppen — gemeinsame Vorhaben

Gebaut am 09.09.2026, nachdem das Durchgehen der Nutzerpfade ergab: **es gab
davon nichts.** Was danach aussah, war es nicht — `'musikgruppe'` ist eine
Kategorie, `_feedRadarGruppen` ist Karten-Clustering, und `/collaborations`
(`eb_collaborations_v1` im `user_meta`) ist eine Referenzliste
Dienstleister→Dienstleister, keine gemeinsame Planung.

```bash
npx playwright test tests/e2e/social.spec.js           # Testzahl: siehe CLAUDE.md · PHP wirklich ausgefuehrt
npx playwright test tests/e2e/freunde-ansicht.spec.js  # Testzahl: siehe CLAUDE.md · echter Browser
```

**Eigene Tabellen, nicht das Board.** `eb_board_projects` ist EIN JSON-Blob je
Nutzer, den der Besitzer als Ganzes zurückschreibt (`update_user_meta`). Zwei
Personen am selben Projekt überschreiben sich gegenseitig — der letzte
Schreibvorgang gewinnt, die Arbeit des anderen ist weg, und niemand bekommt
eine Meldung. Ein „geteiltes" Projekt in diesem Speicher wäre keine
Zusammenarbeit, sondern ein Datenverlust mit Einladung.

Drei Tabellen (mit `EB_DB_VERSION` 2.8 eingeführt): `eb_friendships`, `eb_groups`,
`eb_group_members`. Das SQL steht **bei der Logik** in
`includes/social/freunde-gruppen.php`, nicht im Installer — eine
Tabellendefinition, die getrennt von ihrem Code gepflegt wird, driftet, und
diese driftet unbemerkt bis zum ersten Schreibversuch im Betrieb.

**`user_low`/`user_high` statt `requester`/`addressee`.** Eine Freundschaft ist
symmetrisch; mit zwei Spalten in beliebiger Reihenfolge stünde dasselbe Paar
zweimal da, mit womöglich widersprüchlichem Status. Wer angefragt hat, steht
in `requester_id`.

**Die Migration prüft ihre eigenen Tabellen nach — abgeleitet, nicht
aufgezählt.** `eb_maybe_create_tables()` setzt `eb_db_version` erst, wenn alles
wirklich angelegt ist; die Erfolgsprüfung baute ihre Liste `$fehlt` aber aus
einer **von Hand aufgezählten** Aufstellung von Spalten und Tabellen, und die
drei neuen standen nicht darin. `dbDelta` gibt keinen Fehler zurück — die
Version wäre also auf 2.8 gesprungen, während die Tabellen fehlen, und die
Migration liefe **nie wieder an**. Der Kommentar zwanzig Zeilen darüber warnt
wörtlich davor: *„Die Datenbank waere kaputt und die Anzeige gruen."*

Die Prüfung liest die Tabellennamen jetzt aus demselben SQL, das sie erzeugt
(`eb_social_tabellen_sql()`) — wer eine vierte Tabelle hinzufügt, ändert damit
nicht die Nachweispflicht.

**Der Fix allein hätte die Live-Datenbank nie erreicht.** 2.8 war zum Zeitpunkt
des Befunds bereits ausgeliefert — und der Block wird bei erreichter Version
**gar nicht mehr betreten**. Stünde `eb_db_version` live auf 2.8 bei fehlender
Tabelle, könnte die verbesserte Prüfung das nie nachholen: ein Fehler, der
sich selbst den Weg zur Reparatur zumauert. Ob es wirklich schiefging, ist von
hier aus nicht feststellbar; **genau das ist der Punkt**. Deshalb **2.9 ohne
jede Schema-Änderung** — die Hochzählung lässt den Block ein einziges Mal
erneut laufen, damit der Nachweis am echten Bestand geführt wird. Sie ist
billig: jedes `ALTER` ist durch ein vorheriges `SHOW COLUMNS` gedeckt, die
`UPDATE`s sind idempotent, und der 2.7-Backfill hängt an
`eb_ai_disclosure_backfill_27` — ein zweiter Lauf überschreibt also keine
spätere Korrektur des Betreibers.

**Belegt wird das Verhalten, nicht die Schreibweise.** Der Migrations-Prüfstand
in `radar.spec.js` führt `eb_maybe_create_tables()` gegen eine erfundene
Datenbank wirklich aus und bindet dafür `freunde-gruppen.php` **im Original**
ein; er lässt eine Social-Tabelle fehlen und misst, dass `eb_db_version`
stehenbleibt. Zwei Fälle, weil einer zu wenig ist: die **erste** Tabelle
fehlt, und die **letzte** — eine Ableitung, die nach dem ersten Eintrag
aufhört, besteht sonst weiter. Ein Test auf „steht da ein `foreach`" wäre
wieder nur eine zweite Liste, diesmal in Regex-Form.

**Auch der Prüfstand zählte eine Tabelle von Hand auf.** Sein `SHOW TABLES`
kannte genau einen Namen und lag beim Hinzufügen der drei prompt daneben. Er
antwortet jetzt für jede Tabelle; **ob** eine fehlen darf, entscheidet der
Testfall, nicht eine Aufzählung in der Attrappe.

### Vier Entscheidungen, an denen die Sicherheit hängt

**1 · Keine Nutzer-Aufzählung.** Gesucht wird ausschliesslich nach einem
selbstgewählten **Handle**, und nur wer einen gesetzt hat, ist auffindbar. Das
Setzen IST die Einwilligung, und sie ist zurücknehmbar (leerer Handle →
wieder unauffindbar). Eine Suche nach E-Mail wäre ein Orakel: *„gibt es hier
ein Konto zu dieser Adresse"* ist genau die Frage, die ein Angreifer stellt,
und bei einem Marktplatz ist die Antwort besonders wertvoll. Eine Suche nach
Anzeigenamen wäre dasselbe eine Stufe unschärfer — jeder hat einen, und
niemand hat ihm zugestimmt, gefunden zu werden.

**2 · Nie ohne Zustimmung.** Eine Freundschaft entsteht durch Annehmen, nie
durch Anfragen; eine Gruppenmitgliedschaft ebenso. **Die eigene Anfrage kann
man nicht annehmen** — sonst schriebe sich der Anfragende selbst in fremde
Freundeslisten. Die **Gegenanfrage ist die Zustimmung**: wer angefragt wird
und selbst anfragt, hat zugestimmt.

**3 · Eine Sperre ist eine Grenze, keine Bitte.** Sie wirkt in beide
Richtungen, überlebt eine erneute Anfrage, blendet den Sperrenden aus der
Suche des Gesperrten aus — und **der Gesperrte erfährt nichts**. Die Anfrage
sieht für ihn aus wie gesendet; eine sichtbare Sperre wäre eine Nachricht, und
genau die wollte der Sperrende nicht senden. Nur wer gesperrt hat, kann
entsperren.

**4 · Gedeckelt am KONTO, nicht an der IP.** Anfragen sind ein Spam-Weg.
Hinter einem Proxy meint `REMOTE_ADDR` alle Besucher gemeinsam — ein
IP-gebundener Deckel wäre dort entweder wirkungslos oder er sperrte
Unbeteiligte. Alle vier Eimer (`social_suche`, `social_anfrage`,
`social_gruppe`, `social_beitritt`) hängen an `'u' . $user_id`.

### Der Nachtrag hebt Entscheidung 1 auf — deshalb ist er opt-in

Seit dem 15.09.2026 ist der Nickname bei der Registrierung Pflicht, und
bestehende Konten sollen auf Wunsch des Inhabers „einfach einen passenden"
bekommen. `eb_handles_nachtragen()` tut das — und **hebt damit genau die
Einwilligung auf, auf der Entscheidung 1 steht.** Ein Bestandskonto wird
auffindbar, ohne dass irgendjemand etwas gesetzt hat.

Das ist keine Aufräumarbeit, sondern eine **Aussage in der
Datenschutzerklärung**, und sie gehört dorthin, bevor sie zutrifft. Der
Nachtrag läuft deshalb nur mit einer Konstante in `wp-config.php`:

```php
define( 'EB_HANDLE_NACHTRAG', true );
```

Derselbe Opt-in-Weg wie bei `EB_APPLE_TEAM_ID`: **ohne sie bleibt alles, wie
es ist**, und „nicht eingerichtet" sieht anders aus als „eingerichtet". Der
Code ist fertig und wartet; er ist nicht abgeschaltet. Der Schalter wird in
demselben Augenblick gesetzt, in dem die Datenschutzerklärung den Nachtrag
nennt — dieselbe Hand, derselbe Moment.

**Ein Modell schreibt hier keinen Rechtstext.** Der Entwurf für den Absatz
liegt beim Inhaber; `vault/40-Governance/` bleibt außerhalb dessen, was ein
Modell anfasst.

##### `strtolower()` hat jeden führenden Umlaut gefressen

Beim Ausführen des Nachtrags am Prüfstand gefunden — nicht beim Lesen:

```
„Änne Großmann"  ->  nne.grossmann      (das Ä fehlt ganz)
„Bo Ötzi"        ->  bo.tzi
```

`eb_handle_vorschlag()` schrieb **zuerst klein** und übersetzte danach.
`strtolower()` arbeitet aber **byteweise**: „Ä" sind zwei UTF-8-Bytes, keines
davon ein ASCII-Großbuchstabe. Der Umlaut erreichte also unverändert eine
Tabelle, die nur „ä" kannte, und fiel eine Zeile später dem
`[^a-z0-9._]`-Filter zum Opfer.

Das traf **jeden** Namen, der mit einem Umlaut beginnt — und der Handle ist
genau das, wonach andere diese Person suchen. Umgeschrieben wird jetzt vor dem
Kleinschreiben, mit beiden Schreibweisen in der Tabelle.

**`mb_strtolower` wäre der kürzere Weg und der unsicherere:** mbstring ist
keine Voraussetzung, die WordPress garantiert — dieselbe Begründung wie beim
Kontaktschutz, wo dieselbe Falle schon einmal stand.

**Gefunden hat es der Prüfstand, nicht der Diff.** Vier Tests in
`social.spec.js` führen den Nachtrag wirklich aus: einmal ohne die Konstante
(0 Handles), einmal mit (die zwei Konten bekommen ihren), und ein zweiter Lauf
tut nichts mehr. Vier Mutationen, jede macht die Suite rot: Riegel entfernt ·
Umschrift wieder nach dem Kleinschreiben · Abschluss-Marke nie gesetzt · der
Nachtrag setzt nie einen Handle.

### Nickname für alle — die Zustimmung steht jetzt daneben

Am 15.10.2026 umgesetzt, Auftrag des Inhabers über das UX-Briefing (Codex):
*jedes* Konto bekommt einen Nickname, bei der Registrierung frei wählbar, in
den Einstellungen änderbar. Das kollidierte frontal mit Entscheidung 1 —
der Handle-Kasten versprach jedem ohne Namen wörtlich „nicht auffindbar".

**Nickname und Auffindbarkeit sind deshalb zwei Angaben.**
`eb_handle_auffindbar()` liest `eb_handle_auffindbar` neben `eb_handle`:
`'0'` verborgen, `'1'` ausdrücklich auffindbar, **fehlt = auffindbar**. Der
Rückfall ist kein Versehen: jeder Bestandshandle wurde vom Nutzer SELBST
gesetzt, und genau das war die Einwilligung. Ein Rückfall auf „verborgen"
machte über Nacht alle bisherigen Nutzer unsichtbar.

**Der Nachtrag vergibt Namen VERBORGEN.** Damit hebt er Entscheidung 1 nicht
mehr auf — die Begründung für den Riegel `EB_HANDLE_NACHTRAG` (eine
Datenschutz-Aussage, die vor dem Schalter stehen muss) ist dadurch
**schwächer geworden, aber nicht entfallen**: ein vergebener Name ist über
die offene Prüfroute als „vergeben" erkennbar. Der Schalter bleibt beim
Inhaber; umgelegt wurde nichts.

**Die Suche zeigt Verborgene auch beim genauen Namen nicht.** Wer den vollen
Namen eines verborgenen Kontos eintippt, erfährt nichts. Der genaue Treffer
eines Auffindbaren steht dagegen immer vorn — vorher fiel er bei zehn
Teiltreffern genau dann heraus, wenn jemand den vollen Namen kannte.

**Ein Schreibweg, unter einer Sperre.** `eb_handle_beanspruchen()` ist der
einzige Ort, der `eb_handle` schreibt — Route, Registrierung und Nachtrag
gehen hindurch. Vorher stand „erst prüfen, dann schreiben": zwei
gleichzeitige Registrierungen sahen beide „frei", und danach hießen zwei
Konten gleich. `usermeta` hat keinen eindeutigen Index (und eine
WordPress-Kerntabelle baut man nicht um), also ordnet MySQLs `GET_LOCK` die
Anfragen hintereinander. **Antwortet die Datenbank nicht, ist das 503
„gerade nicht prüfbar", nie 409 „vergeben"** — wer eine Störung als Konflikt
meldet, schickt Menschen auf die Suche nach einem anderen Namen, obwohl ihrer
frei ist.

**Offen und live zu belegen:** ob `GET_LOCK` auf dem IONOS-MySQL antwortet.
Auf einem Galera-Cluster täte es das nicht, und dann schlüge **jedes**
Setzen mit 503 fehl — sichtbar und ohne Datenverlust, aber vollständig. Ein
einziger Nickname-Wechsel nach dem Deploy klärt es.

**Genau eine offene Route:** `GET /social/handle/frei` — die Registrierung
prüft, bevor es ein Konto gibt. Sie schreibt nichts und nennt nie einen
Besitzer (`status` und `vorschlaege`, sonst nichts), gedeckelt an der
Leitung. `social.spec.js` führt sie als **festen** Eintrag in `OFFEN`; eine
zweite offene Route fällt durch. Was sie verrät, ist dasselbe wie jeder
Namensraum mit eindeutigen Namen: dass ein Name vergeben ist.

**Bremse nur auf den Namenswechsel** (`social_handle`, 10 je Tag und
Konto). Den Schalter umzulegen kostet nichts — wer sich unsichtbar machen
will, darf nicht an einem Deckel scheitern, den er mit Tippfehlern
verbraucht hat. Und ein Namenswechsel ohne `auffindbar` im Rumpf lässt die
Zustimmung, wie sie war: ein neuer Name macht niemanden still sichtbar.

**Reserviert sind jetzt auch Varianten** (`eventboerse.support`,
`admin_team`), aber nur beim Beanspruchen, nicht rückwirkend. Ein Name, aus
dem sich nichts Freies machen lässt, bekommt im Nachtrag `eventfan.<id>`,
sonst bliebe genau dieses Konto für immer ohne Nickname.

**Die Oberfläche:** derselbe Kasten auf `/freunde` und in den Einstellungen
(`[data-nickname-kasten]`), eine Quelle (`_sozialNick`). „Speichern" schickt
nur bei einer gültigen Änderung. Die Registrierung prüft entprellt (350 ms)
und blockiert das Absenden **nur** bei sicherem „vergeben"/„reserviert" —
eine Störung ist keine Absage. Scheitert der Nickname nach dem Anlegen,
steht es jetzt da; vorher wurde das verschluckt, und das Konto blieb
namenlos, ohne dass es jemand erfuhr.

**Der Probelauf steht vor dem Schalter** (Briefing N01): `GET /hq/nicknames`,
nur Verwaltung (`eb_hq_verwaltung_darf`), ruft `eb_handles_probelauf()`. Er
zählt jedes Konto in genau eine Spalte (gültig · fehlt · geleert ·
ungültig), benennt doppelte und ungültige Altlasten mit Konto-Kennung und
plant die Vergabe — gegen den Bestand **und** die eigenen Vorschläge: er
schreibt nichts, also stünden seine Planungen sonst nirgends, und zwei „Max
Mustermann" bekämen denselben Namen. Der Test vergleicht den **gesamten**
Zustand vorher und nachher (Meta, Optionen, Sperren). Keine Anzeigenamen im
Bericht, Vorschau auf 20 gedeckelt.

**Dabei gefunden: der Rückzug war keiner.** Der Nachtrag sucht Konten, bei
denen `eb_handle` **fehlt**, und sein Kommentar versprach seit dem
15.09.2026, ein bewusst geleerter Name werde nie überschrieben. Die Route
**löschte** den Schlüssel aber beim Leeren — für den Nachtrag sah das aus wie
„hatte nie einen". Jetzt wird `''` geschrieben. Der Prüfstand hatte es nicht
sehen können: seine `NOT EXISTS`-Nachbildung behandelte einen leeren Wert wie
einen fehlenden Schlüssel, also genau wie die Route falsch herum. Ein
Stellvertreter, der denselben Irrtum hat wie sein Subjekt, bestätigt ihn nur.

**Im HQ unter „@ Nickname-Probelauf"** (nur Administratoren). Er läuft
**erst auf Klick**, nicht beim Öffnen — er geht über alle Konten, und ein
Blick ins HQ soll den PHP-Pool nicht jedes Mal so belasten. Der Bericht
zeigt Bestand, Plan, Vorschau, Altlasten und den Schalterstand, alles über
`textContent`. **Gehen die Spalten nicht auf, steht eine Warnung da statt
„fertig"** — ebenso bei einem abgeschnittenen Lauf und bei einer Antwort, die
sich nicht als Probelauf ausweist. Der Test schneidet Markup UND Skript aus
`hq.html`, statt ein Gerüst nachzubauen; eine umbenannte Kennung bliebe sonst
grün, und der echte Knopf wäre tot.

**Noch nicht gebaut:** Suche nach öffentlichem Anzeigenamen, der Hinweis „Dein Nickname ist @…"
beim nächsten Besuch, Profil-Links per Nickname.

Fünfzig Mutationen über Server, Probelauf, HQ und Oberfläche, jede macht ihre
Suite rot. Eine überlebte zuerst und hat ein Loch im Prüfstand gezeigt: die
Besitzerprüfung der Vorschläge hatte kein Subjekt, weil der erste Vorschlag
ohnehin frei war. Eine zweite war im ersten Lauf **scheinbar** rot — ein
Ausreißer unter Last; einzeln gefahren überlebte sie, und erst ein Test mit
bösartigem Vorschlag im Registrierungsformular machte sie wirklich rot.
Mutationen laufen deshalb zweimal.

```bash
npx playwright test tests/e2e/nickname-ansicht.spec.js  # Testzahl: siehe CLAUDE.md · echter Browser
npx playwright test tests/e2e/hq-nickname.spec.js       # Testzahl: siehe CLAUDE.md · echter Browser
```

### Die Rollen und was sie sehen

| Rolle | Sieht | Darf |
|---|---|---|
| `invited` | Name, Anlass, Datum, **Personenzahl** | annehmen, ablehnen |
| `member` | zusätzlich die Mitgliederliste | verlassen |
| `admin` | zusätzlich den **Einladungscode** | einladen, umbenennen, entfernen |
| `owner` | dasselbe | zusätzlich Rollen vergeben |

**`invited` ist die heikle Stufe.** Ein Eingeladener bekommt die
Mitgliederliste **nicht**. Sonst wäre eine Einladung ein Weg, die Freundesliste
eines Fremden auszulesen: einladen, Liste abholen, wieder ausladen — und
niemand hat je zugestimmt. Die Personenzahl bekommt er trotzdem, sonst kann er
nicht entscheiden.

**Einladen geht nur an Freunde.** Ohne diese Grenze wäre eine Gruppe der Weg
um die Freundschaftsanfrage herum: Fremde einladen, bis einer aus Versehen
zustimmt. Der Beitritt über den **Code** ist der zweite Weg, und dort ist der
Code die Zustimmung — wer ihn eintippt, hat sich selbst entschieden.

**`owner` ist nicht vergebbar.** Sonst gäbe es einen Weg, sich selbst zum
Eigentümer zu machen, und der müsste dann seinerseits bewacht werden. Die
Eigentümerschaft wechselt nur durch Verlassen: sie geht an das dienstälteste
verbliebene Mitglied über (Verwaltung zuerst). **Eine Gruppe ohne Leitung
liesse sich nie wieder verwalten** und stünde für immer in den Listen aller
Beteiligten. Geht der Letzte, wird sie samt Mitgliederzeilen gelöscht.

**Ein Nein sagt nicht, warum.** „Gruppe nicht gefunden" gilt auch für eine
Gruppe, die es gibt und die den Fragenden nichts angeht — wer 404 von 403
unterscheiden kann, kann Gruppen zählen. Ebenso beim Einladungscode: falsch
und abgelaufen sagen dasselbe.

**Der Code kommt aus `random_bytes()`, nicht aus `wp_create_nonce()`.**
Letzteres ist aus Nutzer, Aktion und Tageszeit **abgeleitet** und damit
vorhersagbar, sobald man die Eingänge kennt. Dieselbe Begründung wie beim
CSP-Nonce. Er gilt 14 Tage und lässt sich jederzeit neu ziehen — der alte gilt
dann nicht mehr.

### Der Prüfstand führt PHP wirklich aus

`tests/e2e/social.php` bindet den echten Quelltext ein, stellt WordPress und
`$wpdb`, und lässt die Handler laufen — dieselbe Anordnung wie
`ratelimit-proxy.php`, `csp-nonce.php` und `aasa.php`.

**Eine Rechteprüfung, die nur GELESEN wird, ist nicht geprüft.** Der teure
Fehler ist nicht der Syntaxfehler, sondern der Handler, der eine Prüfung
vergisst — und der sieht im Diff genauso aus wie einer, der sie hat.
15 Mutationen sind geprüft; jede macht die Suite rot.

**Die gestellte Datenbank bricht bei einer unbekannten Abfrage ab.** Ein
Prüfstand, der eine unverstandene Abfrage mit `null` beantwortet, gibt
Entwarnung für Code, den er nie ausgeführt hat.

**Drei Fehler hat der Prüfstand an sich selbst gefunden**, und alle drei sind
die hier bekannte Klasse:

1. `get_var()` gab für `SELECT role FROM …` das **erste Feld der Zeile**
   zurück, nicht `role`. Die Rolle des Eigentümers lautete „1", die
   Mitgliederliste kam leer, und beim Verlassen hielt sich die Gruppe für
   verwaist und löschte sich. Vier erfundene Fehler — und ein Test auf
   „members ist leer" wäre grün gewesen und hätte das für die Regel gehalten.
2. Der Handle-Konflikt-Fall kam durch, weil ein Fall darüber den Handle
   stillschweigend geändert hatte: der geprüfte Name war frei, und der Test
   belegte das Gegenteil dessen, was er behauptete.
3. Der Fremde lud beim „ein Fremder kann nicht einladen"-Fall **sich selbst**
   ein — das scheitert schon eine Zeile vor der Rechteprüfung. Die Mutation
   „Rechteprüfung entfernt" überlebte, und die Zusicherung war unbelegt.

### Die Oberfläche entscheidet nichts

`js/modules/social/60-freunde-gruppen.js`, Seite `/freunde`. Sie blendet aus,
was der Server ohnehin ablehnen würde — das ist **Höflichkeit, kein Schutz**,
und der Unterschied steht im Modulkopf, damit ihn niemand verwechselt.

**Den Einladungscode erfindet sie nicht.** Er wird gezeigt, wenn der Server ihn
schickt, und sonst nicht. Wer ihn aus der Rolle ableitete, zeigte ihn
irgendwann jemandem, dem der Server ihn bewusst vorenthalten hat.

**Drei Zustände, drei Meldungen** — dieselbe Regel wie bei der Jetzt-Ansicht:
*nicht angemeldet* (es gibt niemanden, dem Freunde gehören könnten), *Störung*
(der Abruf schlug fehl) und *leer* (abgerufen, und es sind wirklich keine da).
„Du hast keine Freunde" bei einem Netzfehler wäre eine Falschaussage.

**Der Zähler am Reiter ist kein Schmuck.** Eine Einladung, die man erst nach
dem Umschalten sieht, wird übersehen — und dann wartet jemand vergeblich auf
eine Antwort.


## Der gemeinsame Plan — das Vorhaben selbst

Am 10.09.2026 gebaut. Bis dahin gab es Gruppen, aber nichts, woran sie
gemeinsam arbeiten konnten; der Knopf „Vorhaben planen" führte ins Board und
sagte ehrlich, dass darin bis auf Weiteres **eine** Person plant.

```bash
npx playwright test tests/e2e/plan.spec.js          # Testzahl: siehe CLAUDE.md · PHP wirklich ausgefuehrt
npx playwright test tests/e2e/plan-ansicht.spec.js  # Testzahl: siehe CLAUDE.md · echter Browser
```

**Zeilen, kein JSON-Feld.** Ein `plan`-Feld an der Gruppe wäre dieselbe Falle
wie `eb_board_projects`: Lesen, Ändern, Zurückschreiben — zwei Personen
überschreiben sich, der letzte gewinnt, und niemand bekommt eine Meldung.
Mit Zeilen (`eb_group_plan_items`, `EB_DB_VERSION` 3.0) arbitriert die
Datenbank statt des zuletzt Angekommenen.

**Drei Arten von Konflikt, drei Antworten** — und nur eine davon braucht
optimistisches Sperren:

| Fall | Antwort | Warum |
|---|---|---|
| **Hinzufügen** | gar keine | Zwei INSERTs sind zwei Posten. Wer hier sperrt, löst ein Problem, das es nicht gibt |
| **Übernehmen** | bedingtes `UPDATE … WHERE zustaendig_id = 0` | Ein Wettlauf um EINEN Platz. Die Bedingung steht in der Abfrage, nicht in einem vorherigen `if` — optimistisches Sperren wäre hier **schwächer**, weil es genau das Lesen voraussetzt, in dem das Rennen entsteht |
| **Bearbeiten** | Revision in der `WHERE`-Bedingung | Echtes Lesen-Ändern-Schreiben. Die einzige Stelle, an der die Revision trägt |

**Die Absage trägt den aktuellen Stand.** Bei 409 schickt der Server den
Posten mit, wie er jetzt ist, und die Ansicht setzt ihn sofort ein. Eine
Ablehnung ohne ihn zwingt zu einem zweiten Abruf, und bis dahin sieht der
Nutzer auf falsche Daten und klickt weiter darauf. „Bitte neu laden" wäre hier
die schlechteste Auskunft — er hat nichts falsch gemacht, und nach dem
Neuladen ist seine Eingabe weg.

**Ein Eingeladener bekommt den Plan nicht.** Er ist der Inhalt der Gruppe;
bekäme ihn schon, wer nur eingeladen ist, wäre eine Einladung ein Weg, ihn
abzuholen und danach abzulehnen. Dieselbe Grenze wie bei der Mitgliederliste,
aus demselben Grund — und `eb_plan_darf()` fragt deshalb ausdrücklich
`eb_gruppe_ist_mitglied()`, nicht `eb_gruppe_darf_sehen()`.

**Schreiben darf jedes Mitglied, löschen nur der Urheber** (oder die
Verwaltung). Ein gemeinsames Vorhaben, an dem nur der Eigentümer arbeiten
darf, ist keins; eine Liste, aus der jeder alles entfernen kann, auch nicht.

**Ein Inserat wird geprüft, nicht geglaubt.** `listing_id` wird gegen
`eb_listings` nachgesehen — ohne die Probe zeigte der Plan eine Karte, hinter
der nichts steht, und der Fehler fiele erst dem auf, der darauf klickt. Der
Test misst **beide** Richtungen: ein Prüfer, der nur das Ablehnen zeigt, ließe
„lehnt immer ab" als Erklärung zu.

**Löst sich die Gruppe auf, geht der Plan mit.** Das Auflösen löschte Gruppe
und Mitgliederzeilen — die Posten nicht. Zurück blieben Bezeichnungen, freie
Notizen und die Angabe, wer sich um was kümmern wollte: persönliche Daten,
deren Zusammenhang weg ist und die niemand mehr erreichen kann. **Aufgefallen
ist das beim Schreiben von Abschnitt 10a der Datenschutzerklärung** — der Satz
über die Löschung wäre unwahr gewesen. Der Code folgt dem Text nicht; hier hat
der Text den Code geprüft.

**Elf Mutationen am Backend, sechs an der Ansicht**, jede macht die Suite rot.
Zwei davon haben Fehler in den Tests selbst gefunden: der Prüfstand meldete
`zustaendig_id` als fehlend (die Spalte hing am Datenbank-Standard —
ausgerechnet die, auf der das bedingte UPDATE steht), und „der Plan lädt erst,
wenn ihn jemand sehen will" war ein Rennen gegen `fetch`. Gemessen wird jetzt
die **Reihenfolge** statt des Zeitpunkts: eine Marke in der Anfrageliste, und
davor darf keine Plan-Anfrage stehen.

**Die Ansicht entscheidet nichts** — dieselbe Regel wie im Nachbarmodul. Sie
blendet aus, was der Server ohnehin ablehnt; ob er es wirklich ablehnt, prüft
`plan.spec.js`.

**`_sozialStand` trägt jetzt die eigene Personenkarte** (`ich`). Ohne sie
konnte niemand seine **eigene** Zusage zurücknehmen: der Knopf „Doch nicht"
prüft `zustaendig.id === meine`, und `meine` war immer 0. Ein fehlender Knopf
fällt in keinem Test auf, der ihn nicht sucht.

**Datenschutz: keine neue Apple-Datenart, aber ein neuer Abschnitt.** Der
soziale Graph fällt unter *Identifiers › User ID* (der Handle) und *User
Content › Other User Content* (Gruppen und Mitgliedschaften); beide Zeilen in
`vault/40-Governance/Legal/App-Store.md` nennen die neue Quelle jetzt.
**„Contacts" bleibt NEIN** — das ist Apples Adressbuch des Geräts, und genau
deshalb geht die Suche nur über den Handle. Die Datenschutzerklärung hat
Abschnitt **10a**. Kein neuer Speicherschlüssel, also keine Änderung an
`Cookie-Liste.md`.


## Die Hochzeit aus Bausteinen — und das letzte Glied, das fehlte

Codex/Astra hat die Bausteine mit #268 gebaut: `EB_PLANNING_FRAGMENTS` in
`js/modules/board/43-planungs-zentrale.js` führt **achtzehn** Fragmente
für eine Hochzeit — Location, Trauung, Catering, DJ, Fotos, Floristik,
Torte, Ringe, Shuttle, Kinderbetreuung, Wetterplan — jedes mit einer
Dienstleister-Kategorie und einem Knopf „*Kategorie* finden". Das ist
genau der Auftrag: **ein Vorhaben aus Teilen zusammensetzen, statt
vierzehn Einzelsuchen zu führen.**

Die Arbeit ist gut und vollständig verdrahtet — am 14.09.2026
nachgezählt: zwölf Funktionen, **keine ohne Aufrufer**, Modul in
`modules.list`. Genau die Fehlerklasse, an der dieses Projekt sonst
hängenbleibt, ist hier vermieden.

**Ein Glied fehlte trotzdem, und es war das letzte.** `fragment.cardId`
wurde im ganzen Frontend an **genau einer** Stelle geschrieben: von Hand,
über das Dropdown „Leistung im Board". Der Knopf „DJ finden" öffnete die
Anbieter-Auswahl vorgefiltert — und merkte sich **nicht**, für welchen
Baustein.

Die Folge für den Planer:

| | |
|---|---|
| Karte auf dem Board | **ist da** |
| Baustein | zeigt weiter „noch offen" |
| Restbudget | rechnet den gebuchten Posten **weiter mit** |

Das ist die vertraute Schadensart: es sieht heil aus und tut nur das
halbe. Aufgefallen wäre es nie über einen Fehler, sondern erst über eine
Budgetzahl, der niemand glaubt.

**Die Herkunft steht am Dialog, nicht in einer Modulvariablen.** Der
Knopf schreibt `data-planning-fragment` und `data-planning-project` an
das offene `#addProviderModal`; `_addProviderCard()` liest sie, bevor es
den Dialog entfernt. Eine Modulvariable wäre der bequemere Weg und der
gefährlichere: wer „DJ finden" öffnet, es sich anders überlegt und später
etwas ganz anderes einträgt, bekäme eine **falsche** Verknüpfung —
lautlos, im Markup unauffällig. Am Dialog stirbt die Notiz mit ihm.

**Die Projekt-Kennung wird mitgeprüft.** Beide Hochzeiten tragen dieselben
Baustein-Kennungen (`music`, `venue`, …); ohne die Wache landete eine
Karte am gleichnamigen Baustein eines **fremden** Vorhabens. Über die
Oberfläche ist das heute nicht erreichbar — ein Wächter ohne Test ist
aber eine Behauptung, und der Fall steht deshalb als eigener Test da.

**Die Liste wird festgeschrieben, bevor hineingeschrieben wird.**
`planningFragments()` **leitet** sie ab, solange das Projekt keine eigene
hat — bei jedem Aufruf neu. Eine Verknüpfung ohne das vorherige
`project.fragments = planningFragments(project)` landete in einer Kopie:
für einen Augenblick sichtbar, beim nächsten Lesen weg. Alt-Projekte von
vor #268 sind genau dieser Fall.

**Gemessen wird die Wirkung, nicht das Markup.** Geklickt wird der echte
Knopf, abgeschickt das echte Formular, nachgesehen wird im Projekt — und
zusätzlich im Bild: das `<select>` des Bausteins muss die Karte tragen,
sonst überlebt die Mutation „verknüpfen, aber nicht neu zeichnen".

**Der Prüfstand stellte sich zuerst selbst das Bein.** Die erste Fassung
setzte `_boardProjects` und `_activeBoardId` von Hand und navigierte
danach — das Board lädt seine Projekte beim Rendern aber selbst nach und
überschreibt beides. Alle sechs Tests scheiterten daran, dass die
Vorbereitung ihre eigene Voraussetzung wegräumte. Gestellt wird jetzt
über den **Speicher** (`eb_board_projects_<id>`), geöffnet über den
echten Knopf „Plan öffnen".

**Und eine Mutation traf die falsche Funktion.** „Die Liste wird nicht
festgeschrieben" überlebte im ersten Anlauf — die gesuchte Zeichenfolge
steht auch in `planningSaveFragment()`, und `replace(…, 1)` nimmt die
erste. Mutiert wurde also eine Funktion, um die es gar nicht ging. Wer
mutiert, verankert im Rumpf der gemeinten Funktion; sonst misst die Probe
etwas anderes und meldet Entwarnung. Dieselbe Klasse wie ein Muster, das
den erklärenden Kommentar trifft.

Fünf Mutationen, jede macht die Suite rot: der Verknüpfungs-Aufruf
entfernt (3 rot) · der Dialog merkt sich die Herkunft nicht (3 rot) · die
Projekt-Wache entfernt · die Liste nicht festgeschrieben · verknüpft,
aber die Übersicht nicht neu gezeichnet.

**Noch nicht verknüpft wird über die Zahlung.** Wer eine Karte im Board
bezahlt, ändert am Baustein nichts — er hängt an der Karte, und die
bleibt dieselbe. Das ist richtig so; eine zweite Verknüpfungsstelle auf
einem Geldweg wäre eine zweite Wahrheit.

```bash
npx playwright test tests/e2e/hochzeit-bausteine.spec.js   # Testzahl: siehe CLAUDE.md · 5 Mutationen
```

### Zwei Angaben verfielen auf dem Weg ins gemeinsame Vorhaben

Beim Nachmessen der Weiterleitung am 14.09.2026 gefunden — und der
erste Anlauf hat dabei **den falschen Befund gemeldet**, was hierher
gehört.

`ebAktivitaetPlanen()` baut aus einem Eintrag des Bestands einen
Entwurf und übergibt ihn an die gemeinsame Planung. Gemessen kamen
Titel, Datum und Quell-Adresse an — **Anlass und Ort nicht**:

| | |
|---|---|
| `sozGruppeTyp` | **leer**, obwohl der Bestand die Kategorie führt |
| Ort | im Entwurf vorhanden, **nirgends abgelegt** |

Der Planer hatte gerade „Museum" in Köln angeklickt und tippte im
nächsten Bild beides noch einmal ab.

**Die Kategorie braucht keine Tabelle.** Am echten Bestand gezählt
kennt `art` genau **zwei** Werte: `sport` (154) und `ort` (800). „Ort"
ist kein Anlass — das brauchbare Wort steht bei den Orten in
`kategorie` und ist dort schon deutsch (Museum, Kino, Theater,
Escape-Room, Zoo, Erlebnisbad). Eine Zuordnung, die „Museum" auf
„Museum" abbildet, wäre eine zweite Wahrheit ohne Nutzen; sie könnte
nur driften. Der Ausdruck stand bereits **einmal** da (im Filter) und
steht jetzt in `ebAktivitaetKategorie()` — von beiden Stellen gerufen,
statt abgeschrieben.

**Der Ort kommt in den Startposten, nicht an die Gruppe.**
`eb_groups` hat keine Ortsspalte und das Formular kein Ortsfeld. Eine
Spalte wäre eine Schema-Änderung mit Versionssprung — für eine Angabe,
die am einzelnen Vorhaben mehr sagt als an der Gruppe, und eine
Migration ist hier schon einmal beinahe teuer geworden (siehe 2.8).
Der Posten hat ein Notiz- **und** ein Kategorie-Feld; beide werden
jetzt gefüllt.

**Kein „Ort: " ohne Ort.** Eine leere Beschriftung ist schlimmer als
keine — sie sieht aus wie ein Datenverlust. Und der Ort verdrängt die
Quelle nicht: die Quellennennung ist Lizenzbedingung der ODbL, nicht
Zierrat.

##### Der erste Anlauf maß den Prüfstand statt des Produkts

Gemeldet wurde zunächst, die Aktivität komme **gar nicht** an. Das war
falsch. Ohne Antwort auf `social/freunde|gruppen|ich` steht `/freunde`
zu Recht auf *„Das konnte nicht geladen werden"* — dann existiert
`#sozGruppeName` gar nicht, und eine Vorbefüllung kann nicht
ausbleiben, weil sie kein Feld hat.

Ein Prüfer, der aus dem falschen Grund rot meldet, kostet mehr als
keiner: er hätte hier einen Umbau an einer Stelle ausgelöst, die
funktioniert. Die Suite stellt deshalb die drei Antworten und wartet
**sichtbar** auf `#sozGruppeName`, bevor sie etwas behauptet.

Neun Mutationen, jede macht die Suite rot: `eventType` nicht
mitgegeben · Kategorie fällt auf die Art zurück („Ort" statt
„Museum", **4 rot**) · Sport nicht mehr übersetzt · der Ort kommt
nicht in die Notiz · der Ort verdrängt die Quelle · leerer Ort wird
trotzdem beschriftet · der Posten trägt keine Kategorie · die
`https`-Wache fällt weg · der Filter baut den Ausdruck wieder selbst.

**Eine dritte Aktivitätsart bricht den Test.** Der Helfer stützt sich
darauf, dass `art` nur `sport` und `ort` führt; kommt eine dazu, muss
jemand entscheiden, wie sie heißt — statt sie still als leeren Anlass
durchzureichen.

```bash
npx playwright test tests/e2e/aktivitaet-weiterleiten.spec.js   # Testzahl: siehe CLAUDE.md · 9 Mutationen
```


## Der Assistent spricht — mit einer Fassung, nicht zwei

Gefordert am 01.10.2026: *„unserer Assistent braucht ein Spracheingabe und Ausgabe
mit Menschlicher Stimme der dann im Chat zu sehen ist die konversation."*

Das HQ sprach seit August — serverseitig über `/hq/stimme` (OpenAI TTS) und
`/hq/gehoer` (Whisper), rund 160 Zeilen in `functions.php`. Für die Website gab es
davon **nichts**.

**Den Assistenten mit einer Kopie zu bedienen wäre der kürzere Weg gewesen.** In
diesem Projekt sind so schon eine Sicherheitsliste, eine Testzahl, eine
Icon-Liste, ein Privacy-Manifest und — einen Abschnitt weiter oben — eine
Kategorientabelle auseinandergelaufen. Eine Kopie einer **Grenzwertliste** driftet
auch, und die Frage ist nur, in welche Richtung. Die Mechanik liegt deshalb in
`includes/stimme/sprachdienst.php`; HQ und Assistent geben nur noch ihren **Rahmen**
mit. Was sie unterscheidet, sind fünf Zahlen und ein Eimername — nicht die Logik.

### Der Unterschied ist nicht die Logik, sondern wer davorsteht

| | HQ | Assistent |
|---|---|---|
| davor | Administratoren mit zweitem Faktor | **jeder angemeldete Nutzer** |
| Eimer | IP (vom Proxy-Faktor geweitet) | **Konto** (`'u' . user_id`, nie geweitet) |
| je Minute | 30 | 20 |
| **je Tag** | 1000 | **200** |
| Ausgabe | 1200 Zeichen | 600 |
| Aufnahme | 4 MB | 1 MB |

**Nur angemeldet.** Eine offene Sprachroute ist ein Kostenverstärker: wer sie ohne
Konto in eine Schleife legt, schreibt eine Rechnung auf meinen OpenAI-Schlüssel,
und es gibt niemanden, den man dafür deckeln könnte. Der Preis ist ehrlich benannt
— ein Besucher ohne Konto kann den Assistenten nicht besprechen, und die
Oberfläche **sagt das**, statt das Mikrofon wortlos auszublenden.

**Gedeckelt am Konto, nicht an der IP.** Hinter einem Reverse-Proxy bezeichnet
`REMOTE_ADDR` alle Besucher gemeinsam. Die Gegenprobe gehört zum Test: ein Deckel,
der **alle** sperrt, bestünde „der zweite Aufruf wird abgewiesen" ebenso — und
wäre an einem Starttag eine kaputte Seite.

**Je Minute UND je Tag.** Zwanzig pro Minute allein sind 28 800 am Tag. Der
Tagesdeckel ist der eigentliche Kostenschutz, der Minutendeckel hält nur die
Schleife auf. **Das HQ hatte bis dahin nur einen Minutendeckel** — für zwei
Berechtigte kein praktisches Risiko, aber auch keine Grenze; und beim Teilen wäre
die Lücke mitgewandert. Ein Deckel, der erst beim zweiten Nutzer gebraucht wird,
gehört beim ersten eingebaut.

**Ein fehlender Deckel im Rahmen gilt als der strengste, nicht als keiner.** Eine
fehlende Grenze ist keine Erlaubnis.

### Kein dauerhaft offenes Mikrofon — die Klasse gibt es hier nicht

Ein Druck ist **eine** Aufnahme: sie endet bei Stille (900 ms), nach 15 s oder beim
zweiten Druck. Das HQ hatte am 22.08.2026 die andere Bauart — das Mikrofon ging
120 ms nach der Sprachausgabe von selbst wieder auf, hörte seinen eigenen Nachhall
und antwortete darauf. Gemeldet wurde es als *„redet einfach so, ohne dass ich was
frage"*, und es brauchte danach eine Echo-Erkennung, eine Runden-Grenze und eine
Pegel-Eichung, um den Zustand wieder einzufangen.

**Hier gibt es die Klasse nicht, weil es die Schleife nicht gibt.** Ein Test hält
fest, dass kein `setTimeout` das Mikrofon neu startet.

**Die Pegelschwelle ist trotzdem geeicht** (Ruhepegel der ersten 600 ms × 3,5): eine
feste Zahl ist auf dem einen Gerät taub und auf dem anderen ein Dauerauslöser.
Ohne `AudioContext` gilt der Laut als gegeben — lieber ein Aufruf zu viel als ein
Mikrofon, das grundsätzlich nichts liefert.

**Das Mikrofon wird in jedem Ausgang freigegeben.** `ebMikroAbbauen()` ist die
eine Stelle: Zeitgeber, Recorder, AudioContext, dann die Spuren. Solange eine Spur
lebt, leuchtet die Aufnahme-Anzeige des Browsers, und für den Nutzer hört das
Gerät weiter zu. Dieselbe Regel wie im HQ: neue Stelle, die beendet → diese
Funktion rufen.

### Die Konversation steht im Chat

Das Gesprochene läuft durch `_aiUserSays()` — **denselben Weg wie das Getippte**:
eigene Sprechblase, Antwort darunter, im Verlauf gespeichert. Ein zweiter Pfad für
Sprache wäre eine zweite Wahrheit, und das Gesagte stünde nicht im Chat. Nur so
ist hinterher zu sehen, ob falsch **verstanden** oder falsch **geantwortet** wurde.

**Vorgelesen wird an EINER Stelle** — in `_aiPushMsg`, nicht an den fünfzehn
Stellen, die es rufen. Eine Vorlese-Zeile je Antwortstelle müsste man an jeder
neuen wiederholen, und dann schweigt genau die nächste. Dieselbe Begründung wie
`defaults: run: shell: bash` am Job statt je Schritt.

**Gesprochen wird nur auf Wunsch.** Der Schalter ist aus, bis ihn jemand
einschaltet. Ein Assistent, der unaufgefordert zu sprechen anfängt, ist in einem
Büro oder einer Bahn ein Übergriff — und er kostet Geld für eine Ausgabe, die
niemand wollte.

### Der Schalter schaltete nicht, und zwar für die Vorsichtigen

Gemessen am 01.10.2026: `ebStimmeAn()` las **nur** `localStorage`. Ohne
Cookie-Einwilligung verweigert `ebSpeichern()` den nicht-essenziellen Schlüssel —
richtig —, also blieb der Speicher leer, der Knopf blieb aus, und der Druck tat
**nichts**. „Sieht heil aus und tut nichts", die teuerste Schadensart dieses
Projekts, und sie traf genau die Nutzer, die Speicherung abgelehnt haben.

Jetzt trägt der Wunsch die Sitzung, und `ebSpeichern()` entscheidet nur noch, ob er
das Neuladen **überlebt**. Genau das bedeutet „keine Speicherung" — nicht „keine
Funktion". Die Gegenprobe gehört dazu: ohne Einwilligung darf auch wirklich nichts
liegen bleiben.

### Der Vorlesetext ist Prosa, nicht Oberfläche

Gemessen las die erste Fassung *„Max Beats 4.9 · 450–700€ / Event **Ansehen +
Board**"* vor — die Beschriftungen der Schaltflächen. **Eine Stimme kann nicht
klicken**, und eine Aufforderung zum Drücken, die man nur hört, ist eine
Sackgasse. Die Knöpfe bleiben im Chat sichtbar; das ist ihr Platz.

**Die Icon-Ligaturen müssen ebenfalls raus.**
`<span class="material-icons-round">search</span>` hat den Textinhalt „search" —
vorgelesen sagte der Assistent mitten im Satz „search". Genau diese Falle stand am
15.09.2026 in der Barrierefreiheit, als vier Icon-Spans von einem Screenreader
mitgelesen wurden, nachdem die Beschriftungen repariert waren.

**Die Satzgrenzen entstehen von innen nach aussen.** `querySelectorAll` liefert
Dokumentreihenfolge, also den Umschlag **vor** seinen Karten — der Umschlag sah
dann noch keinen Punkt, hängte einen an, und der landete hinter dem der letzten
Karte: „… Event. .". Umgedreht sieht jeder Elternknoten die fertigen Kinder. Und
das Trennzeichen steht **davor** wie danach, sonst wird aus „…für DJ & Musik:" plus
Kartenliste ein „MusikMax Beats".

Geschnitten wird über einen abgetrennten DOM-Baum, nicht mit einem Ausdruck über
`<[^>]*>` — ein Ausdruck trifft auch ein `<` im Text und wirft den Rest weg.

### Der Rückfall ist hörbar, der Ausweichweg sichtbar

Fehlt der Serverschlüssel, ist das Konto abgemeldet oder greift der Tagesdeckel,
spricht `speechSynthesis` des Betriebssystems. Eine Sprachausgabe, die still
bleibt, ist für den Nutzer von einem Absturz nicht zu unterscheiden.

**Ein 429 wird nicht gemerkt.** Nur *„nicht hinterlegt"* schreibt den Server für
die Sitzung ab — ein gemerkter vorübergehender Fehler kostete bei einer Minute
Deckel die ganze Sitzung. Dieselbe Lehre wie beim gemerkten abgelehnten
Versprechen im Stripe-Lader.

**Die Tonfall-Anweisung ist dokumentiert, nicht gemessen.**
`gpt-4o-mini-tts` nimmt neben dem Text eine Anweisung zur Sprechweise an; von hier
aus ist das nicht prüfbar (kein Schlüssel, `api.openai.com` nicht erreichbar).
Deshalb ist der Ausfall **eingebaut statt vorausgesetzt**: lehnt die Gegenstelle mit
400 ab, läuft die Anfrage **ein** zweites Mal ohne Anweisung, und die Antwort trägt
`ohne_anweisung: true`. Ein unbekanntes Feld kann den Assistenten damit nicht
verstummen lassen. **Jeder andere Code und jeder zweite Versuch sind endgültig** —
eine Schleife, die alles wiederholt, verdreifacht die Last und schleift echte
Fehler weg.

**Wie die Stimme klingt, steht hier nicht.** `nova` ist bei OpenAI als warm und
natürlich beschrieben; hören kann das aus dieser Umgebung niemand. Die Wahl steht an
**einer** Zeile (`EB_STIMME_STIMME`) und ist eine Entscheidung des Inhabers. Eine
Behauptung über den Klang stünde ohne Deckung da.

### Was der Ton nie wird: eine Datei

Die Aufnahme existiert nur für die Dauer des Aufrufs — kein `file_put_contents`,
kein `tmpnam`, kein Upload. Ein gespeicherter Mitschnitt wäre ein
personenbezogenes Datum mit unklarer Löschfrist. Was gesprochen wurde, landet als
**Text** im Gesprächsverlauf, also unter denselben Bedingungen wie das Getippte.
`eb_assistent_stimme_v1` hält ausschliesslich `'1'` oder `'0'` — in
`Cookie-Liste.md` als funktional geführt.

**base64 wird `strict` dekodiert, und die Länge VOR dem Dekodieren geprüft.** Ohne
`strict` schluckt PHP Müll und liefert Bytes, die kein Ton sind — die Gegenstelle
bekäme sie und rechnete dafür ab. Die Vorprüfung ist an der Antwort **nicht**
beobachtbar (die zweite Längenprüfung liefert dasselbe 413), und die Mutation
„Vorprüfung entfernt" hat den ersten Test prompt überlebt. Sie hat ihr Subjekt
jetzt in der Stellung im Code — dieselbe Lehre wie bei `ebAuftragSchluessel()`.

**Whisper erfindet bei Stille Text**, und das filtert jetzt der **Server**: jeder
Whisper-Aufruf geht durch `eb_sprachdienst_hoeren()`, HQ und Assistent gemeinsam.
Ein Filter, an den jeder neue Aufrufer denken muss, wird beim zweiten vergessen.
`istPhantom()` im HQ-Browser ist dazu **keine Kopie, sondern ein anderes Subjekt**:
es bewacht den Rückfall auf `SpeechRecognition`, der den Server nie anfasst.

**Normiert wird vor dem Kleinschreiben.** `strtolower()` arbeitet byteweise — „Ü"
sind zwei UTF-8-Bytes, keines ein ASCII-Grossbuchstabe. Ein Muster mit Umlaut
träfe nie, und der Filter wäre still wirkungslos: genau der Fehler, an dem
`eb_handle_vorschlag()` jeden führenden Umlaut gefressen hat. `mb_strtolower` wäre
der kürzere Weg und der unsicherere, weil mbstring keine garantierte Voraussetzung
ist. Die Liste bleibt **eng** — „Brauchen wir Untertitel für den Livestream?" ist
bei einem Event-Marktplatz eine naheliegende Frage.

**Der Fehlertext der Gegenstelle wird nicht durchgereicht.** Er nennt
Organisationsnamen und Kontodetails.

Zwanzig Mutationen, jede macht die Suite rot: Sprachroute ohne Anmeldung · Eimer
wieder an der IP · Tagesdeckel entfernt · base64 nicht `strict` · Grösse erst nach
dem Dekodieren · Phantom nicht verworfen · Umlaut-Normierung entfernt · jeder
Fehlercode wird wiederholt (2) · Fehlertext durchgereicht · Zeichenschnitt
byteweise · fehlender Deckel gilt als unbegrenzt · der Ton landet auf der Platte ·
die Antwort wird nicht vorgelesen · Schalterzustand nur aus `localStorage` (2) ·
Icons und Knöpfe im Vorlesetext · Satzgrenzen von aussen nach innen · Mikrofon
nicht freigegeben · Zeitlimit entfernt · abgemeldet tut das Mikrofon nichts ·
Rückfall auf die Systemstimme entfernt.

```bash
npx playwright test tests/e2e/assistent-stimme.spec.js   # Testzahl: siehe CLAUDE.md · 20 Mutationen
```


## Der Dienstleister sah, WAS er liefern muss — nicht, WANN

Am 14.09.2026 im echten Browser gemessen. `/auftraege` ist die Tagesseite
des Dienstleisters; drei Aufträge gestellt (24.12., 20.09., 05.10.) und
nachgesehen, was dort wirklich steht:

| | |
|---|---|
| Reihenfolge der Karten | **24.12. → 20.09. → 05.10.** |
| Uhrzeit auf der Seite | **nirgends** |
| Wege zu einer Tagesansicht in der **ganzen** Anwendung | **0** |

Die Reihenfolge war die, in der die Projekte zufällig im Board-Blob
liegen — **der nächste Termin stand in der Mitte, Heiligabend oben.** Bei
drei Aufträgen sortiert man im Kopf; bei fünfzehn nicht mehr, und dann
übersieht jemand den von übermorgen. Das ist kein Schönheitsfehler: die
Tagesfrage des Anbieters lautet *„hat mich jemand angefragt, was muss ich
liefern"* — und die Hälfte davon, **wann**, war nicht beantwortbar.

**Die Zeit lag die ganze Zeit vor.** `card.times` trägt sie seit den
Mehrfachzeiten — Fotograf zur Trauung **und** zur Party. Das Board zeigt
sie, der Ablauf zeigt sie, und ausgerechnet der Mensch, der hinfahren
muss, sah nur ein Datum. Dieselbe Klasse wie der Aktivitäten-Bestand, der
neben einer erfundenen Terminliste lag: gebaut, geprüft, ausgeliefert —
es fehlte allein die Verbindung.

**Keine eigene Seite `/termine`.** Sie wäre eine zweite Liste derselben
Aufträge und damit eine zweite Wahrheit; zwei gepflegte Fassungen
derselben Sache driften immer. Dieselbe Begründung, aus der die
Seitenleiste den Bestand liest, statt einen zweiten Lader zu bauen. Die
Tagesansicht **ist** das Auftragsboard, richtig geordnet — und spart
nebenbei Route, Rewrite-Regel und Navigationsplatz.

Drei Regeln tragen die Richtigkeit, jede mutationsgeprüft:

- **Kein Auftrag fällt heraus** — auch keiner ohne Datum. Ein Auftrag,
  den eine Gruppierung verschluckt, ist schlimmer als eine schlechte
  Reihenfolge: er ist weg, es gibt keine Meldung, und der Dienstleister
  erfährt vom Termin gar nicht mehr. „Ohne Datum" hat deshalb eine
  eigene Gruppe.
- **Vergangenes wird getrennt, nicht geworfen.** Ein Auftrag von gestern
  trägt weiter Knöpfe — Erbringung bestätigen, Zahlung, Storno.
  Wegzufiltern nähme dem Dienstleister genau die Arbeit, die jetzt
  ansteht; er gehört nur nicht unter „als Nächstes". Ein Test misst
  deshalb auch, dass die letzte Karte noch einen Knopf hat.
- **„Heute" wird lokal gerechnet.** `toISOString()` wäre der kürzere Weg
  und der falsche: in Deutschland liegt der Umschlag ein bis zwei Stunden
  vor Mitternacht, wer um 01:30 nachsieht, bekäme den Vortag als „heute".
  Der Test fährt unter `Europe/Berlin` und prüft **zuerst die
  Gegenprobe**, dass sich Ortszeit und UTC im Prüfstand überhaupt
  unterscheiden — in einem UTC-Browser wäre er sonst grün, ohne etwas zu
  belegen.

**Gelesen wird über `ebKartenZeiten()`, nie über `card.startTime`.** Der
Spiegel trägt nur die erste Zeit; wer ihn liest, zeigt dem Fotografen die
Trauung und verschweigt ihm die Party. Ein offenes Ende bleibt offen
(*„ab 20:00"*) — `20:00 – 20:00` wäre erfunden, und danach plant jemand.

### Die Mutation, die überlebte, hat eine tote Wache gefunden

`ebAuftragSchluessel()` gibt Aufträgen ohne Datum absichtlich einen
Schlüssel, der hinten einsortiert. Die Mutation „ohne Datum sortiert nach
vorn" **überlebte** den Test an der gerenderten Seite — und das war
richtig so: `ebAuftraegeGruppieren()` legt Datumslose ohnehin in eine
eigene Gruppe ganz hinten, der Sortierschlüssel entscheidet dort nichts
mehr.

Die Wache war an der Oberfläche also **nicht beobachtbar**. Eine Wache
ohne Subjekt ist eine Behauptung — genau die Klasse, an der dieses
Projekt sonst hängenbleibt. Sie hat jetzt ihr Subjekt: der Helfer ist
global und sortiert auch für jeden künftigen Aufrufer, der nicht
gruppiert; gemessen wird seine **Ausgabe**, nicht seine Schreibweise.

Einen Test zu erfinden, der die Wache an der Seite sichtbar macht, wäre
der bequemere Weg gewesen und hätte eine Wirkung behauptet, die es dort
nicht gibt.

Elf Mutationen, jede macht die Suite rot: Gruppierung entfernt (**6
rot**) · Sortierung entfernt (3) · Auftrag ohne Datum fällt heraus (2) ·
Vergangenes weggefiltert (2) · Zeit aus dem Spiegel statt aus der Liste ·
offenes Ende wird zur Spanne · Tag nach UTC statt Ortszeit · ohne Datum
sortiert nach vorn · Vergangenes nicht zuletzt · keine Tagesüberschrift
(3) · Uhrzeit nicht auf der Karte (3).

**Die Tagesüberschrift klebt beim Scrollen oben an.** Ein Datum, das man
beim Weiterscrollen aus den Augen verliert, macht die Gruppierung wieder
wertlos — man weiß dann nicht, zu welchem Tag die Karte gehört, die man
gerade liest.

```bash
npx playwright test tests/e2e/dienstleister-termine.spec.js   # Testzahl: siehe CLAUDE.md · 11 Mutationen
```


## Navigation je Rolle — Stufe 1 der Überarbeitung

Am 15.10.2026 auf Auftrag des Inhabers umgebaut. Konzept, Bestandsaufnahme
und die Zuordnung „bisher → neuer Platz" stehen in **`PRODUCT_REDESIGN.md`**;
hier nur, was beim Weiterbauen nicht vergessen werden darf.

**Rollenweiche ist `_applyRoleNav()`, sonst nichts.** Hauptlink der Leiste
(„Für Dienstleister" / „Mein Event" / „Mein Geschäft"), Menüabschnitte und
dritter Platz der Mobilleiste werden dort gesetzt; `ebNavHauptweg()` fragt
dieselbe Rolle. Beschriftung und Ziel wandern zusammen.

**Kein Menüziel darf still verschwinden.** `navigation-rollen.spec.js`
führt die Ziele von vor dem Umbau als feste Liste und verlangt, dass jedes
für mindestens eine Rolle **sichtbar** erreichbar bleibt.

**Ein versteckter Abschnitt ist kein Fokusziel.** Der erste Entwurf
fokussierte beim Öffnen den ersten Knopf im DOM — beim Planer liegt der im
versteckten „Mein Geschäft", und der Fokus blieb still am Avatar. Gefunden
erst im Bildschirmfoto, nicht im Test; jetzt mutationsgeprüft.

**Ein vermuteter Fehler, der keiner war.** Bei der Inventur sah es aus, als
öffne die Inserat-Maske für Planer auf „Ich biete" — der Router setzt beim
Öffnen `offer`. Aber `updateCreateFormForRole()` läuft danach und setzt
Planer auf „Ich suche". Wer nur die eine Zeile liest, „behebt" etwas, das
funktioniert. Neu ist nur die **ausdrückliche** Wahl über den Weg
(`/create-listing/suche`), die nach der Rollen-Voreinstellung greift.

**Symbole in Menü und Mobilleiste sind `aria-hidden`.** Vorher hieß jeder
Knopf für einen Screenreader „view_kanban Planungs-Board".

**Mutationsproben sichern AUSSERHALB des Projektordners.** Beim ersten
Lauf verschwand eine Sicherungskopie (`*.mutbak`) mitten im Lauf aus dem
Worktree auf dem Schreibtisch; eine Mutation blieb stehen und wurde erst am
Abbruch bemerkt. Ursache nicht belegt (Vermutung: Schreibtisch-Synchronisierung).
Seitdem liegen Sicherungen im Scratchpad, und der Lauf endet mit
`git status --porcelain` gegen den Commit statt mit einem Dateivergleich.

```bash
npx playwright test tests/e2e/navigation-rollen.spec.js   # Testzahl: siehe CLAUDE.md · 14 Mutationen
```


## Profilarten — das Profil las sein erstes Inserat

F01 des Live-Audits, gebaut am 16.10.2026 nach den Entscheidungen P1–P3 des
Inhabers (`PRODUCT_REDESIGN.md` 1.5). `loadProvider()` kannte keine
Profilart: Unterzeile, Preis, Highlights und Spezialisierungen kamen aus dem
**ersten Inserat**. Wer nur Gesuche hatte, bekam ein Anbieterprofil mit
„DJ & Musik · Köln" und „ab 200€ / Event". Das Konto aus F01 heißt live
**„Admin"** — eine Weiche nur über die Rolle hätte es verfehlt.

**Die Art kommt aus den Inhalten, die Rolle ist Zusatz** (`ebProfilArt()`):
Anbieterprofil bei mindestens einem Angebot ODER Rolle Dienstleister, sonst
Mitgliedsprofil. Kopf, Preis, Highlights und Spezialisierungen kommen nur
aus einem **Angebot**, nie aus einem Gesuch. Das Mitgliedsprofil zeigt
Unterzeile, Ort, Über mich und den Reiter „Gesuche" — ohne Bewertung,
Portfolio und Partnerschaften. Mischkonten bekommen einen zweiten Reiter.

**Eine Eingabe, die nie erschien.** Die Unterzeile lässt sich im eigenen
Profil bearbeiten, wird als `tagline` gespeichert und mit „Tagline
gespeichert!" quittiert — angezeigt wurde sie nie, das erste Inserat
überschrieb sie beim nächsten Laden. Sie gilt jetzt für alle Profile (P2).

**Die Rolle kommt spät.** Bei Inseraten im Speicher wird der Kopf gezeichnet,
bevor die Profil-Route antwortet; `_profilAnsichtZeichnen()` läuft deshalb
ein zweites Mal mit Rolle, Ort und Unterzeile aus der Antwort. Eine Antwort
für ein schon verlassenes Profil darf nicht hineinzeichnen
(`_profilKontext`).

**Gemessen wird, was ein Besucher sieht** (`offsetParent`), nicht das
Markup. `.stat-ring` und `.tab` tragen eigene `display`-Angaben und
ignorierten `[hidden]` — `#page-provider [hidden]` hält das; ohne die Regel
werden fünf Tests rot.

**Drei Mutationen überlebten die erste Fassung der Tests**, und jede zeigte
eine Lücke: kein Konto mit Angebot, aber ohne Rolle Dienstleister · kein
Dienstleister mit nur Gesuchen (die Rolle kommt dann allein aus der späten
Antwort) · kein schneller Wechsel zwischen zwei Profilen. Alle drei Fälle
haben jetzt einen Test.

**Und eine Mutation blieb im Code stehen.** Ein abgebrochener Mutationslauf
hinterließ „Kopf aus dem ersten Inserat" im uncommitteten Arbeitsstand; der
nächste Lauf maß gegen diesen Stand und lieferte falsche Zahlen. Gefunden
erst, weil ein Anker nicht mehr passte. Das Mutationsskript prüft seitdem
**vor** dem Lauf, dass der Grundstand grün ist, und **nach** jeder Probe
per Prüfsumme, dass die Datei wieder das Original ist. Ein abgebrochener
Lauf ist nicht „nie gelaufen".

```bash
npx playwright test tests/e2e/profil-arten.spec.js   # Testzahl: siehe CLAUDE.md · 15 Mutationen
```


## Der Assistent hat ein Gesicht — wählbar, statt des Roboters

Auftrag des Inhabers vom 16.10.2026. Zehn Event-Assistenten-Figuren
(`assets/avatare/avatar-01.webp` … `-10`) ersetzen den gezeichneten Roboter;
beim ersten Öffnen erscheint „Wähle deinen Event-Assistenten", Vorgabe ist
Figur 1, gewechselt wird jederzeit über „face" im Kopf des Panels.
**Nutzungsrechte vom Inhaber am 16.10.2026 bestätigt** — das Bildpaket selbst
nannte weder Urheber noch Lizenz (`assets/avatare/README.md`).

**Ausgeliefert werden 160 × 240 px, je 5–8 KB**, nicht die freigestellten
512 × 768 px (45–53 KB): der Knopf ist 64 × 80 px groß. Beim Start lädt nur
die gewählte Figur, die übrigen erst mit der Auswahl (`loading="lazy"`).
Archiv, Übersichtsbild und Arbeitsnotizen bleiben draußen; ein Test lässt im
Ordner nur die zehn Bilder und die README zu.

**Die Adresse setzt das Modul**, nicht das Markup: `ebAssetUrl()` kennt die
Theme-Basis, ein relativer Pfad wäre live falsch. Ein gespeicherter Wert wird
gegen die Liste `01`–`10` geprüft und nie in eine Adresse eingesetzt.

**Gespeichert nur mit Einwilligung** (`eb_assistent_figur_v1`, funktional,
Cookie-Liste) — ohne sie gilt die Wahl für die Sitzung. Dieselbe Lehre wie
beim Sprachschalter.

**Drei Funde beim Einbau, zwei davon nur im Bild:**
- Das Panel war ein Raster mit **vier festen Zeilen**. Die Auswahl als
  fünftes Kind schob den Nachrichtenbereich über „Später" — der Knopf war
  nicht klickbar. Jetzt eine Flex-Spalte, in der nur die Nachrichten
  nachgeben.
- Danach stauchte die offene Auswahl die Vorschlagsleiste; die Knöpfe waren
  unten abgeschnitten. **Gesehen im Bildschirmfoto, kein Test hatte es
  bemerkt** — jetzt misst einer die volle Höhe.
- Der Knopf nahm bei `:focus-visible` den Fokusrahmen weg. Wer mit der
  Tastatur bedient, sah nicht, wo er steht.

**Gestaucht wird nur auf kleinen Telefonen.** Der Test dazu lief zuerst bei
390 × 844 px und überlebte die Mutation „Stauchen erlaubt": dort reicht der
Platz für alles. Gemessen wird jetzt bei 375 × 667 px.

**Zwei Wachen sind ein Paar:** die Prüfung des gespeicherten Werts und die der
Adresse. Jede einzeln entfernt überlebt, weil die andere den Fall noch fängt;
beide zusammen machen die Suite rot.

**Die volle Suite fand zwei Fehler, die die eigene nicht sah:** ein
erfundenes Token (`var(--bg-gray, #f4f4f6)` auf einer Fläche, `design-system.spec.js`
— der Rückfallwert hätte in beiden Farbmodi gegolten) und die erzeugte
`eb-rechtsunterlagen.json`, die die Modulzahl mitträgt (32 → 33,
`node scripts/rechtsunterlagen.mjs`). Ein neues Modul heißt: diese Datei neu
erzeugen.

**N02: beim Herunterscrollen weg, beim Hochscrollen wieder da**
(Entscheidung des Inhabers vom 17.10.2026). Ein erster Versuch reservierte
unten Platz für den Knopf — unter jeder Seite steht aber die Fußzeile, die
Überdeckung passiert beim Scrollen mittendrin. Die Regel erzeugte nur
Weißraum, die Mutation „Abstand weg" überlebte, sie ist wieder draußen.

Ausgeblendet wird mit `visibility: hidden`, nicht nur `opacity`: ein
unsichtbarer Knopf darf weder Finger noch Tastaturfokus fangen. Er bleibt
ganz oben, bei offenem Panel und solange er selbst den Fokus hat; kleine
Bewegungen unter 8 px zählen nicht. Gerechnet wird nur bei einem
Scroll-Ereignis, einmal je Frame, mit passivem Horcher — kein Dauerlauf.

**Gemessen wird, was der Finger trifft** (`elementFromPoint`). Der erste
Test maß auf „Einstellungen" — abgemeldet öffnet die das Anmeldefenster, und
getroffen wurde dessen Formular. Jetzt eine lange öffentliche Seite, mit
Gegenprobe, dass kein Fenster offen ist.

**Bewegungsreduktion ändert nur das Gleiten.** Die globale Regel setzt jede
Übergangsdauer auf `0.01ms` (der Browser meldet `1e-05s`); eine eigene Regel
wäre doppelt und ohne Wirkung gewesen und ist deshalb nicht da. Der Test prüft
das Ergebnis — höchstens 1 ms — und die Gegenprobe, dass ohne Reduktion
wirklich geglitten wird.

**Und der gemeinsame Prüfstand gibt keine Einwilligung, obwohl er so
aussieht.** `openApp()` in `tests/e2e/helpers.js` schreibt vor jedem Laden
`{essential: true, functional: true}` — das Format von vor August. Die App
liest `funktional`/`profil`; für sie hat damit **niemand** zugestimmt. Der
Banner verschwindet trotzdem, weil überhaupt ein Wert dasteht. Die Suite läuft
also ohne funktionale Einwilligung, und der Kommentar im Helfer legt das
Gegenteil nahe. Gefunden, weil dieser Test seine Einwilligung vor `openApp()`
registrierte und vom Helfer überschrieben wurde — einmal in rund zwanzig
Läufen, je nach Ablauf. **Offen:** den Helfer auf das gültige Format heben;
das betrifft jede Suite und gehört in einen eigenen Schritt mit voller Suite.

```bash
npx playwright test tests/e2e/assistent-figur.spec.js   # Testzahl: siehe CLAUDE.md · 22 Mutationen
```


## Einladen ohne Konto — ein Link, den man versteht

Gemessen am 16.10.2026, gebaut nach `PRODUCT_REDESIGN.md` 6.2 (Teil A). Den
Einladungslink (`/freunde/einladung?einladung=CODE`) gab es schon. Wer ihn
**ohne Konto** öffnete, sah „Dafür brauchst du ein Konto." und „Anmelden":
keinen Hinweis, dass er eingeladen ist, und keine Registrierung, obwohl
Eingeladene meist neu sind. Nach der Anmeldung musste er Code-Feld und
„Beitreten" selbst finden.

**Jetzt:** Der Einladende teilt über **WhatsApp, E-Mail, SMS, Link kopieren**
und auf dem Telefon über „Teilen …". Die eingeladene Person sieht **„Du
bist eingeladen!"** mit „Kostenlos registrieren" (auf Eventplaner
voreingestellt) und „Ich habe schon ein Konto". Nach der Anmeldung steht
eine Bestätigung „Gruppe beitreten", danach öffnet sich der gemeinsame Plan.

**Eventbörse verschickt nichts.** `wa.me`, `mailto:` und `sms:` öffnen die
App des Einladenden; Nummer oder Adresse der eingeladenen Person erreichen
den Server nie. Damit verarbeiten wir keine Daten Dritter und verschicken
keine Werbe-E-Mails. Ein Test hält fest, dass beim Teilen keine Anfrage an
unsere API geht. Wer das ändern will, braucht vorher einen Absatz in der
Datenschutzerklärung.

**Gruppendaten erst nach der Anmeldung** (Entscheidung E2 des Inhabers):
Die Ansicht für Gäste nennt keine Gruppe. Deshalb gibt es **keinen neuen
unauthentifizierten Lesepunkt**.

**Kein stilles Beitreten.** Erst der Klick schickt den Code, wie beim Code-Feld
bisher. Falsch und abgelaufen sagen dasselbe; der Code verschwindet danach
aus der Adresse, damit ein Neuladen nicht dieselbe Absage wiederholt.

**Der Code lebt nur in der Adresse**, es gibt keinen neuen Speicherschlüssel und
damit keine Änderung an der Cookie-Liste. Das trägt, weil ein geöffneter Link
mit `navigateTo(…, true)` startet und die Adresse nicht neu schreibt.

**Drei Prüfstandsfehler, alle an derselben Stelle gelernt:**
- Ohne das dritte Argument von `navigateTo()` ersetzt `pushState` den Pfad
  **samt Code**. Der Test mäße einen Weg, den kein Besucher nimmt.
- **Der Cookie-Banner trägt `role="dialog"`.** Wer „den Dialog" zählt, zählt
  ihn mit; gesucht wird deshalb über den Namen.
- „Der Fokus kehrt zurück" prüfte den Text des aktiven Elements. Fällt der
  Fokus auf `<body>`, steht der Text dort auch, und die Mutation
  „Fokus nicht zurückgeben" überlebte. Geprüft wird jetzt das Element.

```bash
npx playwright test tests/e2e/einladung.spec.js   # Testzahl: siehe CLAUDE.md · 14 Mutationen
```

### Und der geteilte Link auf genau diese Seite endete auf der Fehlerseite

Gemeldet am 13.09.2026 aus einer Live-Prüfung: *„Freunde funktionieren über
die interne Navigation, aber ein direkt geöffneter Link auf `/freunde` endet
auf einer Fehlerseite."* Nachgemessen — und der Befund war **größer** als die
Meldung. `app-shell.html` trägt 34 Seiten, `$spa_pages` in `functions.php`
kannte 31 Slugs:

| ohne Rewrite-Regel | erreichbar über |
|---|---|
| `/freunde` | Einladungslink in eine Gruppe, „Gemeinsam planen" |
| `/auftraege` | Dienstleister-Menü |
| `/business` | Business-Cockpit |
| `/my-listings` | „Mein Geschäft" auf der Landeseite |
| `/notifications` | Glocke in der Leiste |
| `/home` | alte Links (die App schreibt ihn selbst nie) |

**Innerhalb der App merkt das niemand.** `navigateTo()` ruft `_spaPath()` und
schiebt die Adresse per `pushState` in die Leiste — es wird nie eine Anfrage
gestellt. Der Pfad sieht richtig aus, er ist teilbar, und **geteilt ist er
kaputt**: WordPress fand keine Regel, keine Seite mit diesem Slug, und
lieferte `404.php` — *„Diese Adresse gibt es nicht — vielleicht ist der Link
veraltet."*

Das traf ausgerechnet `/freunde`. Weitergeben ist der **einzige** Grund, aus
dem es einen Einladungslink gibt, und genau das Weitergeben fiel aus. Die
Freunde, Gruppen (09.09.) und der gemeinsame Plan (10.09.) waren gebaut und
geprüft; die SPA war bereit (`_readSpaRoute()` liest den Pfad,
`navigateTo(initPage, initData, true)` stellt die Seite her). Es fehlte allein
die Regel, die die Anfrage bis dorthin bringt.

**Warum 1033 grüne Tests das durchgelassen haben.** `smoke.spec.js` führt
`freunde` in seiner Routenliste und war grün. Der Grund steht in `helpers.js`:

```js
await page.evaluate(([r, d]) => window.navigateTo(r, d || null), …)
```

Das ist eine Navigation **im Browser**. Für den Zweck des Smoke-Tests ist das
richtig — er prüft, dass die Seite ohne Page-Errors rendert. Als Nachweis der
**Erreichbarkeit** ist es untauglich: der Test fragt den Server nie. Ein
Prüfer, dessen Subjekt ein anderes ist als das vermutete, gibt eine
Entwarnung, die er nicht decken kann — dieselbe Klasse wie der tote
Gitleaks-Scan, hier an der Routenliste.

**Die Dev-Shell kann es auch nicht finden.** Sie läuft unter
`python3 -m http.server`; dort löst `/freunde` ebenso wenig auf. Es gibt in
dieser Umgebung keinen Weg, den echten Rewrite zu fahren — deshalb misst
`seitenrouten.spec.js` die **Regeln** statt der Navigation, und liest ihre
Muster aus `functions.php`, statt sie abzuschreiben.

**Die Liste zu ergänzen hätte nicht gereicht.** `add_rewrite_rule()` trägt nur
in den Speicher ein; zur Laufzeit gefragt wird die Option `rewrite_rules`.
Geflusht wurde ausschließlich bei `after_switch_theme` — und ein SFTP-Deploy
schaltet kein Theme um. Die neuen Slugs stünden im Code, die Seite bliebe bei
404, und der Diff sähe vollständig richtig aus. **Dieselbe Klasse wie die
vierzehn Routine-PRs**, eine Ebene tiefer: die Arbeit ist getan und erreicht
die Seite nicht.

**Die Fassung ist deshalb aus der Liste abgeleitet**
(`md5( implode( ',', $spa_pages ) )`), nicht von Hand gepflegt. Eine Handzahl,
die man beim Ergänzen hochzählen muss, wird beim nächsten Mal vergessen — und
dann ist genau dieser Fehler still wieder da. Geflusht wird **weich**
(`false`): diese Regeln wertet PHP aus, es muss keine Apache-Direktive
geschrieben werden; ein harter Flush fasste die `.htaccess` der Installation
an, im laufenden Betrieb, für nichts.

**Die Gegenprobe gehört dazu.** Wäre die Regel ein Auffangmuster, träfe sie
jeden Pfad, der Nachweis oben wäre wertlos — und WordPress lieferte für jede
Adresse die SPA statt einer ehrlichen 404. Ein Test hält deshalb fest, dass
`/gibt-es-nicht`, `/wp-login.php` und `/hq` **nicht** getroffen werden.

Sechs Mutationen, jede macht die Suite rot: `freunde` aus der Liste · das
Untersegment `/freunde/gruppen` entfernt · gar kein Flush · Fassung
festgeschrieben statt abgeleitet · harter statt weicher Flush · die Regel als
Auffangmuster.

```bash
npx playwright test tests/e2e/seitenrouten.spec.js   # Testzahl: siehe CLAUDE.md · 6 Mutationen
```


## Mehrfachzeiten je Paketposition

Eine Position kann am Eventtag mehrfach stattfinden — Fotograf zur Trauung und
zur Party, Catering mittags und abends. **`card.times`** (`[{start, end}, …]`)
ist die Wahrheit; `card.startTime`/`card.endTime` bleiben als **Spiegel der
ersten Zeit** erhalten, damit Server und jede ungelesene Codestelle weiter eine
gültige Zeit sehen.

**Es gibt bewusst keine Migration.** Bestehende Karten tragen weiter nur
`startTime`; `ebKartenZeiten()` leitet beim Lesen ab. Ein Durchlauf über alle
Karten ist genau die Sorte Eingriff, die am 22.08. Zahlungsdaten hätte löschen
können.

**Zeit lesen → `ebKartenZeiten(card)`. Zeit setzen → `ebKartenZeitenSetzen()`.**
Wer `card.startTime` direkt schreibt, lässt Liste und Spiegel auseinanderlaufen,
und dann zeigt die eine Ansicht etwas anderes als die andere.

Ungültige Einträge fallen beim Lesen weg, statt die Ansicht zu zerlegen; die
Liste ist sortiert, entdoppelt und bei `EB_MAX_ZEITEN` (8) gedeckelt. Im Ablauf
erscheint eine Position **je Zeit einmal** mit Zähler „2/3" — ein Ablauf, der
die zweite Zeit verschweigt, ist keiner.

`ebZeitUeberschneidungen()` warnt bei sich überlappenden Zeiten — **live im
Formular und als Markierung auf der Karte, aber nie blockierend**: Aufbau und
Service dürfen sich überlappen. Zwei Regeln halten die Warnung glaubwürdig:
ein **offenes Ende warnt nicht** (sonst kollidierte fast jedes Paar), und
**Berührung ist kein Konflikt** (14–16 und 16–18 ist ein Ablauf). Über
Mitternacht wird gerechnet — die Nacht-Vorauswahl erzeugt „22:00 – 02:00", und
ein Textvergleich hielte 02:00 für früher als 23:00.

**Ein `[hidden]`-Element mit eigener `display`-Angabe braucht
`[hidden] { display: none }`** — sonst steht der leere Warnkasten sichtbar da.
Genau das passierte beim Bauen und fiel nur auf, weil ein Test auf
`toBeHidden()` prüfte.
