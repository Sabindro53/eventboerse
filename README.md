# Eventbörse – Dein Event-Marktplatz

Eventbörse.de ist eine moderne Event-Marktplatz-Plattform, die Veranstalter und Event-Dienstleister zusammenbringt. Nutzer können Events erstellen, Services entdecken, Preise verhandeln und direkt über die Plattform zusammenarbeiten.

## Features

- **Benutzerkonten** – Registrierung, Login, Profilbearbeitung mit Foto & Galerie
- **Event-Inserate** – Inserate erstellen mit Titel, Beschreibung, Standort, Datum, Budget, Kategorie und Bildern
- **Service-Marktplatz** – Dienstleister bieten DJ, Catering, Fotografie, Floristik, Locations und mehr an
- **Messaging & Preisverhandlung** – Chat-System mit Angeboten, Gegenangeboten und Verhandlungsstatus
- **Suche & Entdeckung** – Filter nach Kategorie, Standort, Event-Typ, Preis und Bewertung; interaktive Kartenansicht
- **Bewertungssystem** – 1–5 Sterne mit schriftlichem Feedback für Vertrauensbildung
- **Dashboard** – Inserate verwalten, Nachrichten, Verhandlungen und Buchungen im Blick behalten
- **Meine Inserate** – Eigene Inserate ansehen, bearbeiten und löschen
- **Favoriten** – Services speichern und später wiederfinden

## Tech-Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (SPA-Architektur)
- **Karten:** Leaflet.js (interaktive Kartenansicht)
- **Fonts:** Google Fonts (Inter, Material Icons)
- **Avatare:** DiceBear Avatars API
- **WordPress:** Integration als WordPress-Theme
- **SEO:** sitemap.xml, robots.txt, Meta-Tags, OpenGraph

## Projektstruktur

```
├── index.html        # Haupt-HTML (SPA mit allen Seiten)
├── styles.css        # Responsive CSS (Mobile-First)
├── app.js            # Anwendungslogik (Routing, Chat, Inserate, Auth, Reviews)
├── index.php         # WordPress-Theme-Template
├── functions.php     # WordPress-Theme-Funktionen
├── header.php        # WordPress-Header
├── footer.php        # WordPress-Footer
├── style.css         # WordPress-Theme-Metadaten
├── .htaccess         # Apache-Konfiguration (HTTPS, Caching, Security)
├── .github/workflows/
│   ├── ionos-deploy.yml  # IONOS FTP Deployment
│   └── site-monitor.yml  # Uptime-Monitor (Keep-Alive Agent)
├── robots.txt        # SEO-Robots
├── sitemap.xml       # XML-Sitemap
└── README.md         # Projektdokumentation
```

## Lokale Entwicklung

Die Anwendung besteht aus statischen Dateien und kann direkt in einem Browser geöffnet werden:

```bash
# Option 1: Datei direkt öffnen
open index.html

# Option 2: Lokaler Server (z.B. mit Python)
python3 -m http.server 8000

# Option 3: Lokaler Server (z.B. mit Node.js)
npx serve .
```

## Deployment auf IONOS

Die Anwendung wird bei jedem Push auf `main` automatisch per FTP auf IONOS deployed.

### Schritt 1 – FTP-Zugangsdaten in IONOS finden

1. Öffne [login.ionos.de](https://login.ionos.de) und melde dich an
2. Klicke im Menü oben auf **Hosting**
3. Wähle deinen Vertrag **Hosting für WordPress Grow** (Vertrag 111017108)
4. Klicke links im Menü auf **SFTP & SSH**
5. Dort findest du:
   - **Server (Host):** z.B. `access123456789.webspace-data.io`
   - **Benutzername:** z.B. `u12345678`
   - **Passwort:** das Passwort, das du bei IONOS festgelegt hast (kann dort auch zurückgesetzt werden)

> **Tipp:** Falls du dein FTP-Passwort nicht kennst, kannst du es unter **SFTP & SSH** → **Passwort ändern** neu setzen.

### Schritt 2 – GitHub Secrets anlegen

1. Öffne dein Repository auf GitHub
2. Klicke oben auf **Settings** (Zahnrad-Symbol)
3. Klicke links im Menü auf **Secrets and variables** → **Actions**
4. Klicke auf den grünen Button **New repository secret**
5. Lege nacheinander diese 4 Secrets an:

| Secret | Was eintragen | Beispiel |
|--------|--------------|----------|
| `IONOS_FTP_SERVER` | Server/Host aus IONOS SFTP-Seite | `access123456789.webspace-data.io` |
| `IONOS_FTP_USERNAME` | Benutzername aus IONOS SFTP-Seite | `u12345678` |
| `IONOS_FTP_PASSWORD` | Dein IONOS FTP-Passwort | *(dein Passwort)* |
| `IONOS_FTP_REMOTE_DIR` | Zielordner auf dem Server | `/` |

> **Hinweis:** Für `IONOS_FTP_REMOTE_DIR` trage `/` ein, wenn die Dateien direkt ins Hauptverzeichnis sollen. Falls IONOS ein Unterverzeichnis nutzt (z.B. `/htdocs/`), trage dieses ein.

### Schritt 3 – Deployment testen

Nachdem du alle 4 Secrets angelegt hast:

1. Gehe im Repository auf **Actions** → **Deploy to IONOS**
2. Klicke auf **Run workflow**
3. Wähle den `main`-Branch und klicke auf den grünen **Run workflow**-Button
4. Warte bis der Workflow grün wird (✅) – dann ist die Seite auf IONOS live!

Ab jetzt wird bei jedem Push auf `main` automatisch deployed.

## Site Monitor – Keep-Alive Agent

Ein GitHub-Actions-Workflow (`.github/workflows/site-monitor.yml`) überwacht die Seite automatisch alle **30 Minuten**:

- ✅ **Site erreichbar (HTTPS)** – wenn ein offenes „site-down"-Issue existiert, wird es automatisch geschlossen
- ⚠️ **Nur HTTP erreichbar** – meldet, dass HTTPS Probleme hat (z.B. Zertifikatsfehler)
- 🚨 **Site nicht erreichbar** – erstellt automatisch ein GitHub-Issue mit Diagnosehinweisen

### Manuell starten

1. Gehe im Repository auf **Actions** → **Site Monitor – Keep Alive**
2. Klicke auf **Run workflow** → **Run workflow**

### SSL-Zertifikat reparieren

Falls die Seite den Fehler `NET::ERR_CERT_COMMON_NAME_INVALID` zeigt (siehe Screenshot im Issue):

1. Öffne [login.ionos.de](https://login.ionos.de)
2. Gehe zu **Hosting** → dein Vertrag
3. Klicke links auf **SSL-Zertifikate**
4. Stelle sicher, dass ein gültiges SSL-Zertifikat für `eventboerse.de` **und** `www.eventboerse.de` aktiviert ist
5. Falls kein Zertifikat vorhanden ist: Aktiviere das kostenlose **SSL Starter (Let's Encrypt)** Wildcard-Zertifikat
6. Warte 10–30 Minuten, bis das Zertifikat aktiv ist

> **Hinweis:** Der Fehler `NET::ERR_CERT_COMMON_NAME_INVALID` bedeutet, dass das SSL-Zertifikat nicht zur Domain passt. Dies muss direkt bei IONOS behoben werden.

## Lizenz

MIT License – siehe [LICENSE](LICENSE)