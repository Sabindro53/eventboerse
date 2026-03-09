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

## Lizenz

MIT License – siehe [LICENSE](LICENSE)