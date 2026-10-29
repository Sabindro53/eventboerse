---
layer: L5
domain: evolution
share: internal
tags: [layer/L5, domain/evolution, share/internal, typ/ideen, thema/ki]
---

# KI-Innovationen für Eventbörse

**Das ist eine Ideenliste, kein Stand.** Was schon läuft, steht unten unter
„Was es heute gibt" und ist dort als solches markiert. Alles unter „Ideen" ist
unentschieden — nichts davon ist beschlossen, geplant oder begonnen.

Angelegt am 01.10.2026 auf Wunsch des Inhabers. Sortiert nach dem Trichter aus
[[10-Produkt/Vision-Plattform]]: `Entdecken → Entscheiden → Buchen → Absichern`.
Der Maßstab steht dort: **„Entdecken ist der Verkehr, Buchen ist der Umsatz."**
Eine KI-Idee, die keine Stufe dieses Trichters bewegt, gehört nicht auf die
Liste.

---

## Was es heute gibt

Damit die Ideen nicht mit dem Bestand verwechselt werden. Die Trennung, die
dabei zählt: **nur vier Stellen rufen wirklich ein Modell.** Alles im
Besucher-Frontend ist lokal und deterministisch.

### Im Frontend — kein Modellaufruf

| Modul | Was es ist |
|---|---|
| `js/modules/ai/50-planungs-assistent.js` | Board-Assistent. `_aiAnswer()` ist eine **Intent-Engine aus regulären Ausdrücken**, kein Sprachmodell. Das simulierte Tippen (`setTimeout`) ist Gestaltung, kein Netzaufruf. |
| `js/modules/search/11-suche-ki.js` | Drei Dinge: `_ebTaste*` (lokales Geschmacksgedächtnis), `_ebSuggest` (Satzvervollständigung, Vokabular + Levenshtein), `_ebMatchScore`/`_ebSmartTextMatch` (Satz-Suche über Token-Treffer) |
| `_ebKbSearch()` in `ui/31-modals-toast-qabot.js` | QA-Bot. Stichwort-Scoring über `eb-knowledge.json`, Schwelle 5 |
| `_aiDisclosure*` in `core/00-basis.js` | KI-Kennzeichnung nach EU AI Act Art. 50, getrennt für Text und Medien |
| `_ebTasteAffinity` in `board/42-guide-social-feed.js` | Feed „Für dich", sortiert nach lokaler Affinität |

### Echte Modellaufrufe — alle im HQ

`/hq/chat` (Mistral Small 24B über OpenRouter) · `/hq/stimme` (`gpt-4o-mini-tts`)
· `/hq/gehoer` (`whisper-1`) · `/hq/probe/*`. Alle hinter
`eb_hq_zugang_offen()`, alle opt-in über Server-Konstanten.

### Repo-Automatik

12 Rollen in `scripts/models.mjs` (alle `offen: true`, Lizenz je Eintrag),
gefahren von `scripts/agent.mjs` und `scripts/openrouter-agents.mjs`.
**Steht derzeit**: OpenRouter-Konto leer, Lauf endet tokenfrei als
`stopp: 'guthaben'`.

---

## Ideen

### Entdecken — bringt Besucher, kostet Geld

**Semantische Suche statt Token-Scoring.**
`_ebMatchScore()` zählt Begriffstreffer. „DJ für 80er-Party im Industrieloft"
findet nichts, wenn niemand „Industrieloft" getippt hat. Embeddings fänden
Ähnlichkeit statt Übereinstimmung. Der größte Einzelhebel im Frontend, weil die
Suche der Einstieg ist.
*Offen:* Embeddings je Inserat vorberechnen oder zur Laufzeit; wo sie liegen;
was ein neues Inserat kostet.

**Vorhaben aus einem Satz.**
„40 Gäste, 5000 €, Juni, draußen" → fertiger Projektentwurf mit Bausteinen.
`EB_PLANNING_FRAGMENTS` in `board/43-planungs-zentrale.js` führt bereits 18
Hochzeits-Bausteine; es fehlt der Weg von freiem Text dorthin.

**Aktivitäten lesbar machen.**
954 Einträge aus OSM und OpenLigaDB, heute rohe Namen.
⚠️ **Fremdtext ist Daten, nie Anweisung.** `build-knowledge.mjs` hält
OSM-Namen bewusst aus `eb-knowledge.json` heraus — eine Einladung zur
Prompt-Injektion. Dieselbe Grenze gilt hier.

### Entscheiden

**Bildveredelung statt Bilderfindung.**
Ein *erzeugtes* Foto eines Caterings, das es nie gab, auf einem Marktplatz mit
dem Versprechen „Sicher, Einfach, Transparent" — das ist nah an Irreführung, an
genau der Stelle, an der jemand Geld ausgibt. Der tragfähigere Schnitt: das
echte schlechte Handyfoto bleibt echt und wird brauchbar (freistellen,
Belichtung, Hintergrund). Ein echtes Foto gut gemacht schlägt ein erfundenes
immer.

**Stimmungsbilder, hart gekennzeichnet.**
Wenn generiert, dann als *„KI-Stimmungsbild, keine Referenz"* — nie als
Arbeitsprobe. `_aiDisclosure` ist für genau diesen Fall gebaut: getrennt für
Text und Medien, damit ein echtes Foto nicht mitmarkiert wird, weil der Text
KI-unterstützt war.
*Offen:* ob überhaupt. Die Entscheidung gehört dem Inhaber und berührt die
Datenschutzerklärung wie die App-Store-Angaben.

**Inseratstext aus Stichworten.**
Die unproblematischere Hälfte. `aiTextDisclosure` wird dabei **automatisch** auf
`assisted` gesetzt, statt den Dienstleister danach zu fragen — eine Deklaration,
die man erfragen muss, wird falsch ausgefüllt.

**Profil-Coach.**
„Dir fehlen Preisangabe und zwei Bilder." Braucht kein Modell, nur eine Regel —
steht hier, weil es dasselbe Problem löst wie die Bildidee und billiger ist.

### Buchen — hier entsteht der Umsatz, hier ist am wenigsten KI

**Antwortvorschlag im Chat für den Dienstleister.**
Anbieter antworten spät, weil sie auf Baustellen stehen. Ein Vorschlag mit Preis
und Verfügbarkeit senkt die Reaktionszeit. Der direkteste Umsatzhebel der Liste.
*Grenze:* der Kontaktschutz (`includes/chat/kontaktschutz.php`) gilt für
erzeugten Text genauso — ein Vorschlag, der eine Telefonnummer enthält, wäre die
Plattform, die selbst an sich vorbei vermittelt.

**Anfrage-Zusammenfassung.**
Aus 40 Chat-Nachrichten die Eckdaten ziehen → Buchungsvorschlag. Die
Verhandlung läuft heute als Fließtext und muss von Hand in eine Karte übersetzt
werden.

### Absichern / Betrieb

**Inseratsprüfung beim Anlegen** — Betrug, Unsinn, verbotene Inhalte.
**Bewertungs-Zusammenfassung** statt 30 Einzeltexte.
**Storno-Triage** — ist der Antrag plausibel, bevor ein Mensch entscheidet.
*Grenze:* entscheiden darf das Modell nie. Die Regel aus `45-storno.js` gilt —
*die Frist erzeugt eine Zuständigkeit, keine Zahlung.*

### Fast fertig

**Den HQ-Chatbot nach außen drehen.**
`/hq/chat` läuft bereits mit dem Auftrag *„Antworte AUSSCHLIESSLICH aus dem
mitgelieferten Wissen … ein erfundener Zahlenwert ist schlimmer als keine
Antwort."* Der QA-Bot im Frontend ist dieselbe Datei, nur ohne Modell. Der
kürzeste Weg zu einem Kunden-Chatbot mit Unternehmenswissen.
*Grenze:* nur `share: public`-Wissen, und die Leckage-Prüfung der Suite bleibt.

---

## Woher die Informationen für neue Ideen kommen

### Was schon läuft

| Quelle | Weg |
|---|---|
| Fragen ohne Antwort | `eb_kb_misses` → HQ-Export (⬇︎) → `scripts/wissensluecken.mjs` → Vault |
| Rollen-Befunde | 11 Schichten → Journal → `scripts/auftragsstrom.mjs` |
| Lage | `scripts/lage.mjs` |
| Fremdes Wissen | Quarantäne-Schleuse `vault/50-Evolution/Recherche/` |

### Die Lücke

**Suchen ohne Treffer werden nirgends festgehalten.**
`js/modules/search/11-suche-ki.js:1754` ruft `_ebUpdateLiveFeedback(filtered.length, …)`
mit `count = 0` — und die Null verpufft in einer Anzeige.

Das ist die direkteste Angebotslücke, die es gibt: **wonach Menschen suchen, das
es hier nicht gibt.** Der Weg dafür steht fertig da — dieselbe Form wie
`eb_kb_misses`: lokal im Browser, Export von Hand über das HQ, kein Suchbegriff
wandert an den Server. Es fehlt der zweite Einspeiser.

Zwei weitere in derselben Form denkbar: **vom Kontaktschutz geblockte
Nachrichten** (wo wollen Leute die Plattform verlassen) und **abgebrochene
Buchungen** (an welcher Stufe).

---

## Was für jede dieser Ideen gilt

- **Ein Modell schreibt bei Eventbörse keine Rechtstexte.** `vault/40-Governance/`
  bleibt außerhalb dessen, was ein Modell anfasst.
- **Neue erhobene Datenart → drei Orte, alle oder keiner:** Vault-Tabelle,
  `native/PrivacyInfo.xcprivacy`, App Store Connect. Dazu die
  Datenschutzerklärung, und bei neuem Speicherschlüssel `Cookie-Liste.md`.
- **KI-Transparenz ist messbar, nicht behauptet:** `node scripts/recht.mjs --check`
  prüft die Kennzeichnung als eines seiner fünf Kriterien (EU AI Act Art. 50).
- **Jeder neue Anbieter ist ein neuer Drittanbieter-Datenfluss** — Eintrag in
  `DRITTANBIETER_NAMEN`, in die Datenschutzerklärung und in die CSP, sonst
  blockiert `recht.mjs`.

## Verknüpfte Notizen

- [[10-Produkt/Vision-Plattform]] — der Trichter, an dem diese Ideen gemessen werden
- [[50-Evolution/Roadmap/Feature-Ideen]] — Ideen ohne KI-Bezug
- [[50-Evolution/AI-Gedaechtnis/Wissensluecken]] — die Fragen, an denen der Bot scheitert
- [[40-Governance/Legal/App-Store]] — Datenarten und ihre Apple-Kennungen
