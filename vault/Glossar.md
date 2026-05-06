# Glossar & Anonymisierungs-Konventionen

> Dieser Vault liegt in einem öffentlichen Git-Repo. Alle personen-, firmen- und infrastrukturbezogenen Daten werden durch Platzhalter ersetzt.

## Platzhalter

| Platzhalter | Bedeutung |
|---|---|
| `{{DOMAIN}}` | Live-Domain der Plattform (Punycode + UTF-8) |
| `Owner` | Repository-Eigentümer / Geschäftsführer |
| `Hosting-Provider` | Shared WordPress-Hosting (SFTP-Deployment, MySQL, SMTP) |
| `Plattform` | Codename des Produkts (interner Vault-Sprachgebrauch) |
| `Plattform-Mail` | Adressen wie `kontakt@…`, `datenschutz@…` etc. |

## Begriffe

| Begriff | Bedeutung |
|---|---|
| **SPA** | Single Page Application; das gesamte Frontend ist `index.html` + `app.js` |
| **Listing** | Inserat eines Dienstleisters (DJ, Catering, Foto, Location, …) |
| **Service** | Synonym für Listing in Frontend-Strings |
| **Provider** | Anbieter / Dienstleister (User-Rolle) |
| **Event-Planer** | Käufer-Rolle, plant ein Event mit dem Board |
| **Board** | Kanban/Flow/Timeline/Checkliste-Werkzeug zur Eventplanung |
| **Card** | Eintrag im Board, repräsentiert eine angefragte/gebuchte Leistung |
| **Stage** | Status einer Card (`anfrage`, `verhandlung`, `bestaetigt`, `abgeschlossen`) |
| **Direct Charge** | Stripe-Modell: Provider erhält Geld direkt, Plattform behält Application Fee |
| **Application Fee** | 3 % Plattform-Anteil bei Stripe Direct Charge |

## Konventionen

- Code-Bezeichner (`ebAvatar()`, `_apiUrl()`, REST-Namespace `eventboerse/v1`) sind im Klartext aus den Quelldateien übernommen — das ist kein Leak, da sie aus jedem Browser-Network-Tab ablesbar sind.
- Konkrete Mail-Postfächer, Rechtsform, Adresse, HR-Nummer, USt-IdNr., Telefonnummern, Personennamen sind **nicht** im Vault.
