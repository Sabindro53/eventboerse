```javascript
/**
 * mock-data.js — EventBörse Demo-Daten
 *
 * ZWECK: Hardcodierte Fallback-/Demo-Daten für Entwicklung und lokalen Betrieb
 *        ohne Live-Backend. Echte Daten kommen via loadDbListings() aus der API.
 *
 * NUTZUNG: Wird vor app.js geladen (index.html + index.php).
 *          Alle Variablen sind global (var) damit app.js direkt zugreift.
 *
 * MIGRATION: Sobald alle Endpoints produktiv sind, kann diese Datei
 *            entfernt werden. Checklist:
 *            [ ] GET /listings ersetzt LISTINGS
 *            [ ] GET /listings/{id}/reviews ersetzt DEMO_REVIEWS
 *            [ ] Board-Daten kommen via GET /board-projects
 */

/* ============================================================
   LISTINGS — Demo-Dienstleister-Inserate
   Echte Daten: GET /wp-json/eventboerse/v1/listings
   ============================================================ */
var LISTINGS = [
  {
    id: 1,
    title: "DJ Max – Dein Profi für jede Party",
    category: "dj",
    category_label: "DJ",
    description: "Über 15 Jahre Erfahrung auf Hochzeiten, Firmenfeiern und Clubevents. Moderne Anlage, Lichtshow inklusive.",
    price: 800,
    price_model: "pauschal",
    price_label: "Ab 800 € pauschal",
    location: "München",
    region: "Bayern",
    rating: 4.8,
    review_count: 124,
    images: ["https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800"],
    features: ["Lichtanlage inklusive", "Musikwünsche vorab", "Bis 6 Std.", "Auf- & Abbau inklusive"],
    tags: ["Hochzeit", "Firmenfeier", "Club"],
    user_id: 10,
    provider_name: "Max Müller",
    date_from: "2025-01-01",
    date_to: "2025-12-31",
    status: "active"
  },
  {
    id: 2,
    title: "Feinkost Catering München",
    category: "catering",
    category_label: "Catering",
    description: "Frisches, regionales Catering für Firmenevents und Privatfeiern. Buffet oder Service am Tisch.",
    price: 45,
    price_model: "pro_person",
    price_label: "Ab 45 € / Person",
    location: "München",
    region: "Bayern",
    rating: 4.6,
    review_count: 87,
    images: ["https://images.unsplash.com/photo-1555244162-803834f70033?w=800"],
    features: ["Bio-Zutaten", "Vegetarisch/Vegan möglich", "Geschirr & Besteck", "Aufbau & Abbau"],
    tags: ["Firmenfeier", "Hochzeit", "Geburtstag"],
    user_id: 11,
    provider_name: "Feinkost GmbH",
    date_from: "2025-01-01",
    date_to: "2025-12-31",
    status: "active"
  },
  {
    id: 3,
    title: "Fotostudio Lichtblick",
    category: "fotografie",
    category_label: "Fotografie",
    description: "Professionelle Event- und Hochzeitsfotografie. Reportage-Stil, schnelle Bildlieferung, digitales Album.",
    price: 1200,
    price_model: "pauschal",
    price_label: "Ab 1.200 € pauschal",
    location: "Hamburg",
    region: "Hamburg",
    rating: 4.9,
    review_count: 203,
    images: ["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800"],
    features: ["Ganztagesbegleitung", "Online-Galerie", "Bildbearbeitung", "Druck-Service optional"],
    tags: ["Hochzeit", "Portrait", "Reportage"],
    user_id: 12,
    provider_name: "Lena Fischer",
    date_from: "2025-01-01",
    date_to: "2025-12-31",
    status: "active"
  },
  {
    id: 4,
    title: "Eventlocation Stadtgarten",
    category: "location",
    category_label: "Location",
    description: "Exklusive Eventlocation im Herzen von Berlin. Kapazität 50–300 Personen, moderner Industrie-Chic.",
    price: 2500,
    price_model: "pauschal",
    price_label: "Ab 2.500 € / Tag",
    location: "Berlin",
    region: "Berlin",
    rating: 4.7,
    review_count: 61,
    images: ["https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800"],
    features: ["Bis 300 Personen", "Küche vorhanden", "Parkplätze", "Barrierefreiheit"],
    tags: ["Firmenfeier", "Hochzeit", "Messe"],
    user_id: 13,
    provider_name: "Stadtgarten Events GmbH",
    date_from: "2025-01-01",
    date_to: "2025-12-31",
    status: "active"
  },
  {
    id: 5,
    title: "Blumenwelt Rosengarten – Floristik & Deko",
    category: "floristik",
    category_label: "Floristik",
    description: "Handgemachte Blumenarrangements und Raumdekoration für jede Feier. Hochzeitsblumen unser Spezialgebiet.",
    price: 600,
    price_model: "ab",
    price_label: "Ab 600 € Ausstattung",
    location: "Köln",
    region: "Nordrhein-Westfalen",
    rating: 4.5,
    review_count: 45,
    images: ["https://images.unsplash.com/photo-1487530811015-780de58a7a5b?w=800"],
    features: ["Beratungsgespräch", "Probedekor möglich", "Auf- & Abbau", "Leihservice"],
    tags: ["Hochzeit", "Geburtstag", "Taufe"],
    user_id: 14,
    provider_name: "Rosengarten GbR",
    date_from: "2025-01-01",
    date_to: "2025-12-31",
    status: "active"
  },
  {
    id: 6,
    title: "Zaubershow für Kinder & Erwachsene",
    category: "entertainment",
    category_label: "Entertainment",
    description: "Professioneller Zauberkünstler für Kindergeburtstage, Firmenevents und Hochzeiten.",
    price: 400,
    price_model: "pauschal",
    price_label: "Ab 400 € / Auftritt",
    location: "Frankfurt",
    region: "Hessen",
    rating: 4.7,
    review_count: 38,
    images: ["https://images.unsplash.com/photo-1503095396549-807759245b35?w=800"],
    features: ["45–90 Min. Show", "Kindgerecht", "Interaktiv", "Reisekosten auf Anfrage"],
    tags: ["Geburtstag", "Firmenfeier", "Kinderfest"],
    user_id: 15,
    provider_name: "Zauberer Alex",
    date_from: "2025-01-01",
    date_to: "2025-12-31",
    status: "active"
  },
  {
    id: 7,
    title: "Eventbus & Transport-Service",
    category: "transport",
    category_label: "Transport",
    description: "Shuttle-Service für Hochzeiten und Firmenevents. Moderne Busse, professionelle Fahrer.",
    price: 350,
    price_model: "pro_fahrt",
    price_label: "Ab 350 € / Fahrt",
    location: "Stuttgart",
    region: "Baden-Württemberg",
    rating: 4.4,
    review_count: 29,
    images: ["https://images.unsplash.com/photo-1464219789935-c2d9d9aba644?w=800"],
    features: ["Bis 50 Personen", "Klimaanlage", "WLAN", "Fahrerservice"],
    tags: ["Hochzeit", "Firmenfeier", "Transfer"],
    user_id: 16,
    provider_name: "EventBus Stuttgart",
    date_from: "2025-01-01",
    date_to: "2025-12-31",
    status: "active"
  },
  {
    id: 8,
    title: "Profi-Moderator für Events & Galas",
    category: "moderation",
    category_label: "Moderation",
    description: "Erfahrener Moderator für Galas, Firmenjubiläen und Preisverleihungen.",
    price: 1500,
    price_model: "pauschal",
    price_label: "Ab 1.500 € / Event",
    location: "Düsseldorf",
    region: "Nordrhein-Westfalen",
    rating: 4.8,
    review_count: 72,
    images: ["https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800"],
    features: ["Vorgespräch inklusive", "Skript-Entwicklung", "Bis 8 Std.", "Teleprompter-Erfahrung"],
    tags: ["Firmenfeier", "Gala", "Preisverleihung"],
    user_id: 17,
    provider_name: "Thomas Weber",
    date_from: "2025-01-01",
    date_to: "2025-12-31",
    status: "active"
  }
];

/* ============================================================
   DEMO_EVENTS — Beispiel-Veranstaltungen (Event-Planer-Seite)
   Echte Daten: Board-Projekte via GET /board-projects
   ============================================================ */
var DEMO_EVENTS = [
  {
    id: "evt-001",
    title: "Hochzeit Müller & Schmidt",
    type: "Hochzeit",
    date: "2025-08-15",
    location: "München",
    guests: 120,
    budget: 15000,
    status: "in_planung",
    categories_needed: ["dj", "catering", "fotografie", "floristik", "location"]
  },
  {
    id: "evt-002",
    title: "Firmenjubiläum Tech AG",
    type: "Firmenfeier",
    date: "2025-06-20",
    location: "Berlin",
    guests: 250,
    budget: 30000,
    status: "angebote_eingeholt",
    categories_needed: ["catering", "location", "moderation", "entertainment"]
  },
  {
    id: "evt-003",
    title: "Geburtstag Sabrina – 30",
    type: "Geburtstag",
    date: "2025-05-10",
    location: "Hamburg",
    guests: 40,
    budget: 3000,
    status: "abgeschlossen",
    categories_needed: ["dj", "catering", "fotografie"]
  }
];

/* ============================================================
   DEMO_REVIEWS — Beispiel-Bewertungen
   Echte Daten: GET /listings/{id}/reviews
   ============================================================ */
var DEMO_REVIEWS = [
  {
    id: 101,
    listing_id: 1,
    author_name: "Sandra K.",
    author_avatar: null,
    rating: 5,
    comment: "DJ Max war absolut fantastisch! Die Musik war perfekt abgestimmt, alle Gäste haben getanzt. Sehr empfehlenswert!",
    created_at: "2024-11-20T18:30:00Z"
  },
  {
    id: 102,
    listing_id: 1,
    author_name: "Peter H.",
    author_avatar: null,
    rating: 5,
    comment: "Professionelle Beratung im Vorfeld, pünktlich und top ausgerüstet. Werden wir wieder buchen.",
    created_at: "2024-10-05T14:00:00Z"
  },
  {
    id: 103,
    listing_id: 2,
    author_name: "Maria L.",
    author_avatar: null,
    rating: 4,
    comment: "Sehr leckeres Essen, gute Präsentation. Service war freundlich und professionell.",
    created_at: "2024-09-15T12:00:00Z"
  },
  {
    id: