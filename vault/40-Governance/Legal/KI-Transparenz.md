---
tags: [layer/L4, domain/governance, share/internal]
layer: L4
domain: governance
share: internal
---

# KI-Transparenz

> Was die Kennzeichnung „KI-generierter Inhalt" auf eventbörse.de rechtlich bedeutet,
> wer sie setzt und was sie **nicht** behauptet.

Die Kennzeichnung existiert seit dem 14.08.2026 im Code (`_aiDisclosureLabelsHtml()` in
`js/modules/core/00-basis.js`, Tests in `tests/e2e/ki-transparenz.spec.js`). Diese Notiz
schließt die Lücke, dass eine Rechtsaussage nur im Quelltext stand.

## Rechtsrahmen

| Rahmen | Was er verlangt |
|---|---|
| **EU AI Act Art. 50 Abs. 2, 4** (VO EU 2024/1689) | Künstlich erzeugte oder manipulierte Bild-, Ton- und Textinhalte müssen als solche erkennbar sein |
| **DSA Art. 14, 16** | Klare Angaben zu Inhalten auf Hosting-Plattformen, Melde- und Abhilfeverfahren |
| **UWG § 5 / § 5a** | Irreführung durch Verschweigen — ein KI-erzeugtes Referenzfoto ohne Hinweis kann eine geschäftliche Fehlvorstellung erzeugen |
| **UrhG** | KI-Ausgaben sind regelmäßig nicht urheberrechtlich geschützt; für Eingaben in KI-Systeme gelten die Rechte am Ausgangsmaterial |

Die Fristen des AI Act laufen gestaffelt; Art. 50 gilt ab **02.08.2026**. Die Plattform
hat die Kennzeichnung vorher eingeführt — die Pflicht ist also erfüllt, nicht knapp
verfehlt.

## Die vier Zustände

Deklariert wird getrennt nach **Text** und **Medien** (`aiTextDisclosure`,
`aiMediaDisclosure`, jeweils auch verschachtelt unter `aiDisclosure`):

| Zustand | Bedeutung | Anzeige |
|---|---|---|
| `none` | ohne KI erstellt | kein Etikett |
| `assisted` | mit KI überarbeitet, inhaltlich vom Menschen verantwortet | „KI-unterstützter Inhalt" |
| `generated` | überwiegend von KI erzeugt | „KI-generierter Inhalt" |
| `undeclared` | nicht deklariert | „KI-Status offen" |

Zwei Entwurfsentscheidungen mit rechtlicher Wirkung:

1. **Der ungünstigste Zustand gewinnt.** Ist der Text `none`, das Bild aber `generated`,
   zeigt der Beitrag „KI-generierter Inhalt". Ein Beitrag darf nicht sauberer aussehen,
   als sein schwächster Teil ist.
2. **Fehlt die Angabe, gilt sie als offen — nicht als „ohne KI".** Der Altbestand vor dem
   14.08.2026 hat kein Feld; er wird als `undeclared` mit dem Hinweis „Altbestand: noch
   nicht nachdeklariert" geführt. Das ist der Fail-Safe: eine fehlende Deklaration
   stillschweigend als „menschlich" zu lesen wäre genau die Irreführung, die § 5a UWG meint.

## Wer deklariert

**Die einstellende Person, nicht die Plattform.** Beim Anlegen eines Inserats oder
Beitrags wird gefragt (`ai-disclosure-picker`). Das Etikett trägt darum den Titel „Von der
einstellenden Person deklariert".

Das ist eine bewusste Grenze: Eventbörse **prüft nicht nach**, ob ein Bild KI-erzeugt ist.
Eine automatische Erkennung wäre unzuverlässig, und ein Etikett „geprüft" wäre eine
Zusage, die die Plattform nicht halten kann. Ein Hinweis, der mehr verspricht als er
hält, schafft Haftung statt sie zu mindern.

Daraus folgt die Rollenverteilung:

- **Nutzer**: verantwortlich für die Richtigkeit der eigenen Deklaration.
- **Plattform**: verantwortlich dafür, dass gefragt wird, dass die Antwort sichtbar ist
  und dass eine falsche Deklaration gemeldet werden kann (DSA Art. 16, `/dsa`).

## Wo die Kennzeichnung erscheint

Überall dort, wo ein Inhalt für sich stehen kann — sonst wäre sie an der Stelle wirkungslos,
an der jemand die Entscheidung trifft:

`ai-disclosure-card` (Inserate-Karten) · `-detail` (Detailseite) · `-feed` und `-social`
(Feed) · `-marquee` (Startseite) · `-radar-popup` und `-radar-result` (Umkreissuche) ·
`-admin` (Verwaltung) · `-picker` (beim Anlegen)

`scripts/recht.mjs --check` misst, dass die Kennzeichnung im Code existiert und dass diese
Notiz sie beschreibt. Sie misst **nicht**, ob jede Ansicht sie einbindet — das prüft
`tests/e2e/ki-transparenz.spec.js`.

## KI im Betrieb — was Nutzer nicht sehen

Getrennt davon setzt die Plattform KI intern ein (HQ-Mitarbeiter, Autopilot, QA-Bot,
Planungs-Assistent). Rechtlich relevant daran:

- **Der QA-Bot und der Board-Assistent antworten ausschließlich aus freigegebenem Wissen**
  (`assets/eb-knowledge.json`, nur `share: public`). Kein internes Dokument kann austreten;
  das prüft die Wissensbasis-Suite.
- **Der Planungs-Assistent** speichert Gesprächsverläufe lokal → siehe
  [[40-Governance/Legal/Cookie-Liste]] (`eb_ai_chat_v1_*`).
- **Der Autopilot** ändert Code, nie Rechtstexte. Der freigegebene Rahmen
  (`scripts/lib/sichere-dateien.mjs`) enthält keine Datei aus `vault/40-Governance/`,
  keine Zahlungs- und keine Auth-Datei. **Ein Modell schreibt bei Eventbörse keine
  Rechtstexte** — das ist keine technische Begrenzung, sondern eine gewollte.
- Erzeugt der Autopilot Nutzertexte oder Bilder, gälte Art. 50 auch für ihn. Derzeit tut
  er das nicht.

## Offen

- [ ] Deklaration auch für **Profiltexte** von Dienstleistern (heute nur Inserate/Beiträge)
- [ ] Nachdeklaration des Altbestands: heute „KI-Status offen", ohne Weg für den Nutzer,
      das nachzuholen
- [ ] Der Meldeweg für eine **falsche** Deklaration ist `/dsa` allgemein, kein eigener Grund
- [ ] Aufnahme der Kennzeichnung in die AGB (heute nur in der Oberfläche)

## Verknüpft

- [[40-Governance/Legal/Compliance-Overview]]
- [[40-Governance/Legal/Rechtliche-Lage]]
- [[40-Governance/Legal/Cookie-Liste]]
- [[30-Betrieb/Verbindungen]]
