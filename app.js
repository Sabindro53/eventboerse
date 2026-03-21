/* ============================================
   Eventbörse – Event Marketplace Application
   SPA Router, Chat, Negotiation, Listings, Auth
   ============================================ */

// ========== DEMO DATA ==========
const LISTINGS = [
  {
    id: 1, providerId: 90001,
    title: 'DJ SoundMaster Berlin',
    category: 'dj', categoryLabel: 'DJ & Musik',
    location: 'Berlin', region: 'Berlin & Brandenburg',
    price: 450, priceLabel: 'ab 450€ / Event',
    rating: 4.9, reviews: 127,
    image: 'https://images.pexels.com/photos/2111015/pexels-photo-2111015.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
    images: [
      'https://images.pexels.com/photos/2111015/pexels-photo-2111015.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&dpr=1',
      'https://images.pexels.com/photos/2034851/pexels-photo-2034851.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/1540406/pexels-photo-1540406.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
    ],
    providerName: 'Max Beats',
    providerImg: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dj1',
    providerSince: '2021',
    description: `<p>Hey! Ich bin Max, professioneller DJ mit über 10 Jahren Erfahrung in der Berliner Eventszene. Ob Hochzeit, Geburtstag oder Firmen-Gala – ich bringe die perfekte Stimmung für jedes Event.</p>
    <h3>Was mich auszeichnet</h3>
    <p>Ich mixe alle Genres – von Charts über House bis hin zu 80er Classics. Dazu bringe ich meine eigene Premium-Soundanlage und ein atmosphärisches Lichtsetup mit. Jede Playlist wird individuell auf euer Event abgestimmt.</p>`,
    features: ['Premium Pioneer-Equipment', 'LED-Lichtanlage inklusive', 'Individuelle Playlist-Abstimmung', 'Auf- und Abbau', 'Nebelmaschine auf Wunsch', 'Moderation möglich'],
    tags: ['Hochzeit', 'Party', 'Club'],
    badge: 'Superhost',
    negotiable: true
  },
  {
    id: 2, providerId: 90002,
    title: 'Gourmet Catering Hamburg',
    category: 'catering', categoryLabel: 'Catering',
    location: 'Hamburg', region: 'Hamburg & Norddeutschland',
    price: 35, priceLabel: 'ab 35€ / Person',
    rating: 4.8, reviews: 89,
    image: 'https://images.pexels.com/photos/587741/pexels-photo-587741.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
    images: [
      'https://images.pexels.com/photos/587741/pexels-photo-587741.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&dpr=1',
      'https://images.pexels.com/photos/5638732/pexels-photo-5638732.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/1199957/pexels-photo-1199957.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
    ],
    providerName: 'Elena Schmitt',
    providerImg: 'https://api.dicebear.com/7.x/avataaars/svg?seed=elena',
    providerSince: '2019',
    description: `<p>Wir kreieren unvergessliche kulinarische Erlebnisse für Ihr Event. Von feinen Canapés über Flying Buffets bis hin zu mehrgängigen Menüs – alles aus frischen, regionalen Zutaten.</p>
    <h3>Unser Versprechen</h3>
    <p>Jedes Menü wird individuell auf Ihre Wünsche und das Event abgestimmt. Wir bieten auch vegane, vegetarische und allergiegerechte Optionen an.</p>`,
    features: ['Individuelle Menüplanung', 'Regionale Bio-Zutaten', 'Vegane Optionen', 'Service-Personal inklusive', 'Geschirr & Besteck', 'Kostenlose Verkostung'],
    tags: ['Hochzeit', 'Firmen-Event', 'Gala'],
    badge: 'Top-Bewertet',
    negotiable: true
  },
  {
    id: 3, providerId: 90003,
    title: 'Blumenträume München',
    category: 'florist', categoryLabel: 'Floristik',
    location: 'München', region: 'München & Oberbayern',
    price: 800, priceLabel: 'ab 800€ / Event',
    rating: 5.0, reviews: 64,
    image: 'https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
    images: [
      'https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&dpr=1',
      'https://images.pexels.com/photos/1697912/pexels-photo-1697912.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/36764/marguerite-daisy-beautiful-beauty.jpg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/1408221/pexels-photo-1408221.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/2307040/pexels-photo-2307040.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
    ],
    providerName: 'Lisa Blumen',
    providerImg: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lisa',
    providerSince: '2020',
    description: `<p>Wir verwandeln jeden Raum in ein florales Paradies. Unsere Blumenarrangements werden mit Liebe zum Detail und einem Gespür für aktuelle Trends gestaltet.</p>
    <h3>Unser Service</h3>
    <p>Von der Brautstraußgestaltung über Tischdekorationen bis hin zu großflächigen Blumeninstallationen – wir machen Ihr Event unvergesslich.</p>`,
    features: ['Brautsträuße', 'Tischdekorationen', 'Blumenbögen', 'Raumdekoration', 'Ansteckblumen', 'Kostenlose Beratung'],
    tags: ['Hochzeit', 'Gala', 'Jubiläum'],
    badge: '★ Top-Pick',
    negotiable: true
  },
  {
    id: 4, providerId: 90004,
    title: 'LightFX Eventtechnik',
    category: 'licht', categoryLabel: 'Licht & Technik',
    location: 'Frankfurt', region: 'Rhein-Main',
    price: 1200, priceLabel: 'ab 1.200€ / Event',
    rating: 4.7, reviews: 53,
    image: 'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
    images: [
      'https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&dpr=1',
      'https://images.pexels.com/photos/3052361/pexels-photo-3052361.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/1190298/pexels-photo-1190298.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/2747446/pexels-photo-2747446.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/2263436/pexels-photo-2263436.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
    ],
    providerName: 'Timo Licht',
    providerImg: 'https://api.dicebear.com/7.x/avataaars/svg?seed=timo',
    providerSince: '2018',
    description: `<p>Professionelle Licht- und Tontechnik für Events jeder Größe. Wir schaffen Atmosphäre mit modernster LED-Technik, Moving Heads und intelligenter Steuerung.</p>`,
    features: ['LED-Beleuchtung', 'Moving Heads', 'Nebelmaschinen', 'Soundsystem', 'DMX-Steuerung', 'Techniker vor Ort'],
    tags: ['Party', 'Firmen-Event', 'Konzert'],
    badge: 'Verifiziert',
    negotiable: true
  },
  {
    id: 5, providerId: 90005,
    title: 'Pyroshock Feuerwerk',
    category: 'pyro', categoryLabel: 'Pyrotechnik',
    location: 'Düsseldorf', region: 'NRW',
    price: 2500, priceLabel: 'ab 2.500€ / Show',
    rating: 4.9, reviews: 41,
    image: 'https://images.pexels.com/photos/1387577/pexels-photo-1387577.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
    images: [
      'https://images.pexels.com/photos/1387577/pexels-photo-1387577.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&dpr=1',
      'https://images.pexels.com/photos/2526105/pexels-photo-2526105.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/1573225/pexels-photo-1573225.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/63332/firework-sparks-light-fireworks-63332.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/1071882/pexels-photo-1071882.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
    ],
    providerName: 'Oliver Pyro',
    providerImg: 'https://api.dicebear.com/7.x/avataaars/svg?seed=oliver',
    providerSince: '2017',
    description: `<p>Spektakuläre Feuerwerke und Pyrotechnik-Shows für unvergessliche Momente. Von Hochzeitsfeuerwerken bis zu Großveranstaltungen – wir setzen Ihr Event in Szene.</p>`,
    features: ['Höhenfeuerwerk', 'Bühnen-Pyro', 'Kalte Funken', 'Indoor-Pyro', 'Flammeneffekte', 'Choreografie'],
    tags: ['Hochzeit', 'Silvester', 'Firmen-Event'],
    badge: 'Premium',
    negotiable: true
  },
  {
    id: 6, providerId: 90006,
    title: 'Fotokunst Berlin',
    category: 'foto', categoryLabel: 'Fotografie',
    location: 'Berlin', region: 'Berlin & Brandenburg',
    price: 950, priceLabel: 'ab 950€ / Event',
    rating: 4.8, reviews: 92,
    image: 'https://images.pexels.com/photos/1983037/pexels-photo-1983037.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
    images: [
      'https://images.pexels.com/photos/1983037/pexels-photo-1983037.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&dpr=1',
      'https://images.pexels.com/photos/3408744/pexels-photo-3408744.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/212372/pexels-photo-212372.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/1264210/pexels-photo-1264210.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/1787235/pexels-photo-1787235.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
    ],
    providerName: 'Anna Foto',
    providerImg: 'https://api.dicebear.com/7.x/avataaars/svg?seed=anna',
    providerSince: '2019',
    description: `<p>Emotionale und authentische Event-Fotografie. Ich halte die besonderen Momente eures Events in einzigartigen Bildern fest – natürlich und ungestellt.</p>`,
    features: ['Reportage-Stil', 'Paar-Shooting', 'Fotobox-Option', 'Online-Galerie', 'Alle Bilder bearbeitet', 'Print-Optionen'],
    tags: ['Hochzeit', 'Geburtstag', 'Business'],
    badge: 'Superhost',
    negotiable: true
  },
  {
    id: 7, providerId: 90007,
    title: 'EventLocation Schloss am See',
    category: 'location', categoryLabel: 'Location',
    location: 'Starnberg', region: 'München & Oberbayern',
    price: 3500, priceLabel: 'ab 3.500€ / Event',
    rating: 4.9, reviews: 38,
    image: 'https://images.pexels.com/photos/169198/pexels-photo-169198.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
    images: [
      'https://images.pexels.com/photos/169198/pexels-photo-169198.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&dpr=1',
      'https://images.pexels.com/photos/265920/pexels-photo-265920.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/1114425/pexels-photo-1114425.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/260922/pexels-photo-260922.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/1488267/pexels-photo-1488267.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
    ],
    providerName: 'Schloss Management',
    providerImg: 'https://api.dicebear.com/7.x/avataaars/svg?seed=schloss',
    providerSince: '2016',
    description: `<p>Feiern Sie Ihr Event in einem traumhaften Schloss direkt am See. Unsere Location bietet den perfekten Rahmen für Hochzeiten, Galas und exklusive Veranstaltungen.</p>`,
    features: ['Bis 200 Gäste', 'Außenbereich mit Seeblick', 'Brautsuite', 'Eigene Küche', 'Parkplätze', 'Barrierefreiheit'],
    tags: ['Hochzeit', 'Gala', 'Exklusiv'],
    badge: 'Premium',
    negotiable: true
  },
  {
    id: 8, providerId: 90008,
    title: 'DekoTraum Eventdesign',
    category: 'deko', categoryLabel: 'Dekoration',
    location: 'Köln', region: 'NRW',
    price: 600, priceLabel: 'ab 600€ / Event',
    rating: 4.6, reviews: 47,
    image: 'https://images.pexels.com/photos/1729797/pexels-photo-1729797.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
    images: [
      'https://images.pexels.com/photos/1729797/pexels-photo-1729797.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&dpr=1',
      'https://images.pexels.com/photos/2072175/pexels-photo-2072175.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/2306281/pexels-photo-2306281.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/3171837/pexels-photo-3171837.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/1405528/pexels-photo-1405528.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
    ],
    providerName: 'Sophie Deko',
    providerImg: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sophie',
    providerSince: '2020',
    description: `<p>Kreative Event-Dekoration die begeistert. Von Ballongirlanden über Tischdeko bis hin zu kompletten Raumkonzepten – wir machen euer Event unvergesslich schön.</p>`,
    features: ['Balloon-Installationen', 'Tischdekorationen', 'Backdrop-Design', 'Candy-Bar', 'Licht-Elemente', 'Auf- und Abbau'],
    tags: ['Geburtstag', 'Hochzeit', 'Babyshower'],
    badge: 'Neu',
    negotiable: true
  },
  {
    id: 9, providerId: 90009,
    title: 'Eventplanung Meier & Co.',
    category: 'planung', categoryLabel: 'Eventplanung',
    location: 'Stuttgart', region: 'Baden-Württemberg',
    price: 1500, priceLabel: 'ab 1.500€ / Event',
    rating: 4.8, reviews: 73,
    image: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
    images: [
      'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&dpr=1',
      'https://images.pexels.com/photos/2833037/pexels-photo-2833037.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/416405/pexels-photo-416405.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/5676744/pexels-photo-5676744.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
    ],
    providerName: 'Thomas Meier',
    providerImg: 'https://api.dicebear.com/7.x/avataaars/svg?seed=thomas',
    providerSince: '2015',
    description: `<p>Full-Service Eventplanung für Ihr perfektes Event. Wir kümmern uns um alles – von der Konzeption über die Koordination bis zur Durchführung.</p>`,
    features: ['Konzeptentwicklung', 'Vendor-Management', 'Budget-Planung', 'Tag-Koordination', 'Timeline-Erstellung', 'Notfall-Management'],
    tags: ['Firmen-Event', 'Hochzeit', 'Konferenz'],
    badge: 'Verifiziert',
    negotiable: true
  },
  {
    id: 10, providerId: 90010,
    title: 'MC Stefan – Moderation',
    category: 'moderation', categoryLabel: 'Moderation',
    location: 'München', region: 'Bayern',
    price: 700, priceLabel: 'ab 700€ / Event',
    rating: 4.7, reviews: 56,
    image: 'https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
    images: [
      'https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&dpr=1',
      'https://images.pexels.com/photos/3321793/pexels-photo-3321793.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/2608517/pexels-photo-2608517.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/7648480/pexels-photo-7648480.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/6953868/pexels-photo-6953868.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
    ],
    providerName: 'Stefan MC',
    providerImg: 'https://api.dicebear.com/7.x/avataaars/svg?seed=stefan',
    providerSince: '2018',
    description: `<p>Charmante und professionelle Moderation für jedes Event. Ob Hochzeit, Firmenfeier oder Gala – ich führe souverän durch den Abend.</p>`,
    features: ['Hochzeitsmoderation', 'Firmen-Moderation', 'Gala-Moderation', 'Zweisprachig DE/EN', 'Spielemoderation', 'Musikwünsche'],
    tags: ['Hochzeit', 'Firmen-Event', 'Gala'],
    badge: 'Superhost',
    negotiable: true
  },
  {
    id: 11, providerId: 90011,
    title: 'Pärchen Spa Abend',
    category: 'wellness', categoryLabel: 'Wellness & Spa',
    location: 'Düsseldorf', region: 'Nordrhein-Westfalen',
    price: 189, priceLabel: 'ab 189€ / Paar',
    rating: 4.9, reviews: 74,
    image: 'https://images.pexels.com/photos/3757942/pexels-photo-3757942.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
    images: [
      'https://images.pexels.com/photos/3757942/pexels-photo-3757942.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&dpr=1',
      'https://images.pexels.com/photos/3188/love-romantic-bath-candlelight.jpg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/3865676/pexels-photo-3865676.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/3997993/pexels-photo-3997993.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/3757952/pexels-photo-3757952.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
    ],
    providerName: 'Lisa & Tom Wellness',
    providerImg: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lisaspa',
    providerSince: '2022',
    description: `<p>Gönnt euch als Paar einen unvergesslichen Spa-Abend! Unser exklusives Wellness-Paket verwöhnt euch mit wohltuenden Massagen, aromatischen Bädern und einer Atmosphäre zum Entspannen und Genießen.</p>
    <h3>Euer Spa-Erlebnis</h3>
    <p>Wir kommen direkt zu euch nach Hause oder arrangieren den perfekten Abend in einer unserer Partner-Locations. Jedes Paket wird individuell auf eure Wünsche abgestimmt – ob romantischer Jahrestag, Verlobungsfeier oder einfach Quality Time zu zweit.</p>`,
    features: ['Paarmassage (60 Min.)', 'Aromabad mit Rosenblüten', 'Sekt & Snack-Platte', 'Kerzen & Deko inklusive', 'Mobile Spa – wir kommen zu euch', 'Individuelle Duftauswahl'],
    tags: ['Jahrestag', 'Valentinstag', 'Geburtstag'],
    badge: '★ Top-Pick',
    negotiable: true
  }
];

const DEMO_REVIEWS = [
  { name: 'Sarah L.', avatar: 'sarah2', rating: 5, date: 'Februar 2026', text: 'Absolut fantastisch! Max hat unsere Hochzeitsfeier unvergesslich gemacht. Die Musikauswahl war perfekt!' },
  { name: 'Markus W.', avatar: 'markus', rating: 5, date: 'Januar 2026', text: 'Professionell, zuverlässig und eine geniale Stimmung. Jederzeit wieder!' },
  { name: 'Julia K.', avatar: 'julia2', rating: 4, date: 'Dezember 2025', text: 'Tolle Musik und super Lichtshow. Das Equipment war top. Kleine Abzüge für die Anfahrtskosten.' },
  { name: 'Tim B.', avatar: 'tim', rating: 5, date: 'November 2025', text: 'Der beste DJ den wir je hatten. Unsere Firmenfeier war ein voller Erfolg!' },
];

const DEMO_CHATS = [
  {
    id: 1,
    name: 'Max Beats',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dj1',
    lastMsg: 'Klar, ich kann den Preis auf 420€ reduzieren!',
    time: '14:32',
    unread: 2,
    online: true,
    negotiation: { active: true, yourOffer: 380, counterOffer: 420, status: 'counter' },
    messages: [
      { type: 'system', text: 'Gespräch gestartet über "DJ SoundMaster Berlin"' },
      { type: 'sent', text: 'Hallo Max! Ich plane meine Hochzeit am 15. Juni und suche einen DJ. Dein Profil sieht super aus!', time: '10:15' },
      { type: 'received', text: 'Hey! Vielen Dank für die Anfrage! Ich würde mich freuen, bei eurer Hochzeit aufzulegen. Was für Musikgeschmack habt ihr so? 🎵', time: '10:22' },
      { type: 'sent', text: 'Wir mögen eine Mischung aus Charts, 80er und etwas House. Insgesamt werden es ca. 120 Gäste.', time: '10:30' },
      { type: 'received', text: 'Perfekte Combo! Damit kann ich definitiv was machen. Ich bringe auch meine LED-Lichtanlage mit, die passt super zu Hochzeiten.', time: '10:35' },
      { type: 'offer', label: 'Dein Angebot', amount: '380€', status: 'pending', statusLabel: 'Angebot gesendet' },
      { type: 'received', text: 'Danke für das Angebot! 380€ ist leider etwas unter meinem Mindestpreis. Wie wäre es mit 420€? Da ist die Lichtanlage dann inklusive.', time: '14:30' },
      { type: 'offer', label: 'Gegenangebot von Max', amount: '420€', status: 'pending', statusLabel: 'Wartet auf deine Antwort' },
      { type: 'received', text: 'Klar, ich kann den Preis auf 420€ reduzieren!', time: '14:32' },
    ]
  },
  {
    id: 2,
    name: 'Elena Schmitt',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=elena',
    lastMsg: 'Das Menü können wir gerne besprechen!',
    time: '12:15',
    unread: 1,
    online: false,
    negotiation: null,
    messages: [
      { type: 'system', text: 'Gespräch gestartet über "Gourmet Catering Hamburg"' },
      { type: 'sent', text: 'Hallo Elena! Wir planen eine Geburtstagsfeier für 50 Personen. Habt ihr noch Kapazität im April?', time: '11:00' },
      { type: 'received', text: 'Hallo! Ja, im April haben wir noch Termine frei. Was für eine Art Menü schwebt Ihnen vor?', time: '11:30' },
      { type: 'received', text: 'Das Menü können wir gerne besprechen!', time: '12:15' },
    ]
  },
  {
    id: 3,
    name: 'Lisa Blumen',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lisa',
    lastMsg: 'Die Brautsträuße werden wunderschön!',
    time: 'Gestern',
    unread: 0,
    online: true,
    negotiation: { active: true, yourOffer: 750, counterOffer: null, status: 'sent' },
    messages: [
      { type: 'system', text: 'Gespräch gestartet über "Blumenträume München"' },
      { type: 'sent', text: 'Hallo Lisa! Eure Blumenarrangements sind wirklich bezaubernd. Wir heiraten im September.', time: '15:00' },
      { type: 'received', text: 'Oh wie schön, herzlichen Glückwunsch! September ist eine wunderbare Zeit für Blumen. Was schwebt euch vor?', time: '15:20' },
      { type: 'sent', text: 'Brautstrauß, 10 Tischdekorationen und einen Blumenbogen.', time: '15:25' },
      { type: 'offer', label: 'Dein Angebot', amount: '750€', status: 'pending', statusLabel: 'Wartet auf Antwort' },
      { type: 'received', text: 'Die Brautsträuße werden wunderschön!', time: '16:00' },
    ]
  }
];

// ========== DEMO EVENTS (for Event-Planer role) ==========
const DEMO_EVENTS = [
  {
    id: 'evt1',
    title: 'Hochzeit von Anna & Tom',
    type: 'Hochzeit',
    date: '15. Juni 2026',
    location: 'Berlin',
    guests: 120,
    budget: '8.500€',
    status: 'In Planung',
    description: 'Unsere Traumhochzeit im Schloss am See mit 120 Gästen.',
    image: 'https://images.pexels.com/photos/169198/pexels-photo-169198.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
    bookedServices: [
      { name: 'DJ SoundMaster Berlin', category: 'DJ & Musik', status: 'Bestätigt' },
      { name: 'Gourmet Catering Hamburg', category: 'Catering', status: 'In Verhandlung' },
      { name: 'Blumenträume München', category: 'Floristik', status: 'Bestätigt' }
    ]
  },
  {
    id: 'evt2',
    title: 'Firmen-Sommerfest 2026',
    type: 'Firmen-Event',
    date: '20. Juli 2026',
    location: 'München',
    guests: 200,
    budget: '15.000€',
    status: 'In Planung',
    description: 'Großes Sommerfest für die gesamte Belegschaft mit Live-Musik und Catering.',
    image: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
    bookedServices: [
      { name: 'LightFX Eventtechnik', category: 'Licht & Technik', status: 'Bestätigt' },
      { name: 'Eventplanung Meier & Co.', category: 'Eventplanung', status: 'Bestätigt' }
    ]
  },
  {
    id: 'evt3',
    title: 'Lauras 30. Geburtstag',
    type: 'Geburtstag',
    date: '10. August 2026',
    location: 'Köln',
    guests: 50,
    budget: '3.000€',
    status: 'Offen',
    description: 'Überraschungsparty im Loft mit DJ, Deko und Fotobox.',
    image: 'https://images.pexels.com/photos/1729797/pexels-photo-1729797.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
    bookedServices: [
      { name: 'DekoTraum Eventdesign', category: 'Dekoration', status: 'Angefragt' }
    ]
  }
];

// ========== STATE ==========
let currentPage = 'home';
let currentListing = null;
let currentChat = null;
let isLoggedIn = false;
let favorites = new Set();
let _dbListingsLoaded = false;
let _favoritesLoaded = false;

function _saveFavoritesToStorage() {
  var key = currentUser ? 'eb_favs_' + currentUser.id : 'eb_favs_guest';
  try { localStorage.setItem(key, JSON.stringify([...favorites])); } catch(e) {}
}

function _loadFavoritesFromStorage() {
  var key = currentUser ? 'eb_favs_' + currentUser.id : 'eb_favs_guest';
  try {
    var stored = localStorage.getItem(key);
    if (stored) {
      JSON.parse(stored).forEach(function(id) { favorites.add(id); });
    }
  } catch(e) {}
}

// ========== FILE UPLOAD HELPER ==========
async function uploadFile(file, _attempt) {
  var attempt = _attempt || 1;
  var maxRetries = 3;
  var formData = new FormData();
  formData.append('file', file);
  var headers = {};
  if (_wpNonce) headers['X-WP-Nonce'] = _wpNonce;
  var resp;
  try {
    resp = await fetch(_apiUrl('upload'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: headers,
      body: formData
    });
  } catch (networkErr) {
    if (attempt < maxRetries) {
      await new Promise(function(r) { setTimeout(r, 1000 * attempt); });
      return uploadFile(file, attempt + 1);
    }
    throw new Error('Netzwerkfehler beim Upload – bitte erneut versuchen.');
  }
  if (resp.status === 503 || resp.status === 502 || resp.status === 504) {
    if (attempt < maxRetries) {
      await new Promise(function(r) { setTimeout(r, 1500 * attempt); });
      return uploadFile(file, attempt + 1);
    }
    throw new Error('Server vorübergehend nicht erreichbar (503). Bitte versuche es in einer Minute erneut.');
  }
  if (!resp.ok) {
    var err = {};
    try { err = await resp.json(); } catch(e) {}
    throw new Error(err.message || 'Upload fehlgeschlagen (Status ' + resp.status + ')');
  }
  return await resp.json();
}

// Load database listings into LISTINGS array (merged with demo data)
async function loadDbListings() {
  if (_dbListingsLoaded) return;
  try {
    var resp = await fetch(_apiUrl('listings?per_page=50&_t=' + Date.now()), { credentials: 'same-origin', headers: _apiHeaders() });
    if (!resp.ok) return;
    var data = await resp.json();
    if (data.listings && data.listings.length > 0) {
      // Assign high IDs to avoid collision with demo data
      data.listings.forEach(function(l) {
        l.id = l.id + 10000; // offset DB IDs
        l._fromDb = true;
        l._dbId = l.id - 10000;
        // Don't add duplicates (check both offset ID and raw DB ID)
        if (!LISTINGS.find(function(ex) { return ex.id === l.id || ex._dbId === l._dbId; })) {
          LISTINGS.unshift(l);
        }
      });
    }
    _dbListingsLoaded = true;
  } catch(e) { /* API not available yet */ }
}

// Load user's favorites from backend
async function loadFavorites() {
  if (!isLoggedIn) return;
  try {
    var resp = await fetch(_apiUrl('favorites'), { credentials: 'same-origin', headers: _apiHeaders() });
    if (!resp.ok) return;
    var data = await resp.json();
    // Merge API favorites into local Set (don't clear — keeps local/demo favs intact)
    data.forEach(function(l) {
      favorites.add(l.id + 10000);
    });
    _favoritesLoaded = true;
    _saveFavoritesToStorage();
  } catch(e) {}
}

// ========== BLOCKED DATA PATTERNS ==========
const BLOCKED_PATTERNS = [
  /(\+?\d{1,4}[\s-]?\(?\d{1,4}\)?[\s-]?\d{2,4}[\s-]?\d{2,4}[\s-]?\d{0,4})/,   // phone
  /[\w._%+-]+@[\w.-]+\.[a-zA-Z]{2,}/,                                              // email
  /\b\d{5}\b\s+\w+/,                                                                // zip+city
  /(whatsapp|telegram|signal|viber|facebook|instagram\s*@|snapchat)/i,              // social
];

// ========== VISIBLE LISTINGS ==========
function _visibleListings() {
  if (!isLoggedIn) return LISTINGS;
  var dbItems = LISTINGS.filter(function(l) { return l._fromDb; });
  return dbItems.length > 0 ? dbItems : LISTINGS;
}

// ========== NAVIGATION ==========
function navigateTo(page, data, skipHistory) {
  // Pages that require login — redirect to login modal immediately
  var loginRequired = ['create-listing', 'messages', 'profile', 'edit-profile', 'settings', 'admin'];
  if (!isLoggedIn && loginRequired.indexOf(page) !== -1) {
    openModal('loginModal');
    showToast('Bitte melde dich an, um diese Funktion zu nutzen.', 'info');
    return;
  }

  // Hide user menu
  document.getElementById('userMenu').classList.remove('show');

  // Push browser history state (unless triggered by popstate or explicit skip)
  if (!skipHistory) {
    window.history.pushState({ page: page, data: data || null }, '', '#' + page + (data ? '/' + data : ''));
  }

  // Deactivate all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  _stopChatPoll();
  // Reset provider edit mode if leaving
  if (_providerEditMode) {
    _providerEditMode = false;
    var provPage = document.getElementById('page-provider');
    if (provPage) provPage.classList.remove('provider-edit-mode');
  }

  // Activate target page
  var targetId = page;
  if (page === 'edit-profile') targetId = 'profile';
  const target = document.getElementById('page-' + targetId);
  if (target) {
    target.classList.add('active');
    currentPage = page;
  }

  // Update mobile nav
  document.querySelectorAll('.mobile-nav button').forEach(b => {
    b.classList.toggle('active', b.dataset.page === page);
  });

  // Scroll to top
  window.scrollTo(0, 0);

  // Page-specific logic
  switch (page) {
    case 'browse':
      loadDbListings().then(function() { renderBrowseGrid(LISTINGS); });
      break;
    case 'explore':
      loadDbListings().then(function() { renderExploreGrid(); });
      break;
    case 'aktuelles':
      loadDbListings().then(function() { renderFeed('foryou'); });
      break;
    case 'detail':
      loadDbListings().then(function() { loadDetail(data); });
      break;
    case 'provider':
      loadDbListings().then(function() { loadProvider(data); });
      break;
    case 'messages':
      renderChatList();
      break;
    case 'profile':
      if (currentUser) {
        // Show provider page for own profile (same nice layout)
        document.getElementById('page-profile').classList.remove('active');
        var provPage = document.getElementById('page-provider');
        if (provPage) { provPage.classList.add('active'); currentPage = 'provider'; }
        loadDbListings().then(function() { loadProvider(currentUser.id); });
        // Highlight mobile nav profile button
        document.querySelectorAll('.mobile-nav button').forEach(b => b.classList.remove('active'));
        var profBtn = document.querySelector('.mobile-nav button[data-page="profile"]');
        if (profBtn) profBtn.classList.add('active');
      }
      break;
    case 'create-listing':
      if (!window._isEditNavigation) {
        window._editingListingId = null;
        document.getElementById('createListingForm').reset();
        document.getElementById('uploadPreview').innerHTML = '';
        document.querySelectorAll('#createFeatureTags .feature-tag').forEach(function(t) { t.classList.remove('selected'); });
        document.querySelectorAll('#createFeatureTags .feature-tag-custom-item').forEach(function(t) { t.remove(); });
        document.querySelectorAll('.form-step').forEach(function(s) { s.classList.remove('active'); });
        document.getElementById('step1').classList.add('active');
        // Clear Flatpickr dates
        var dfEl = document.getElementById('createDateFrom');
        var dtEl = document.getElementById('createDateTo');
        if (dfEl && dfEl._flatpickr) dfEl._flatpickr.clear();
        if (dtEl && dtEl._flatpickr) dtEl._flatpickr.clear();
      }
      updateCreateFormForRole();
      break;
    case 'dashboard':
      navigateTo('profile');
      return;
    case 'my-listings':
      renderMyListings();
      break;
    case 'favorites':
      renderFavorites();
      break;
    case 'edit-profile':
      renderDashboard();
      break;
    case 'settings':
      loadSettings();
      break;
    case 'agb':
    case 'datenschutz':
      break;
    case 'admin':
      if (!currentUser || !currentUser.isAdmin) {
        showToast('Kein Zugriff – nur für Admins.', 'error');
        navigateTo('home');
        return;
      }
      loadAdminUsers();
      break;
  }
}

// ========== LISTING CARD RENDERER ==========
function renderListingCard(listing) {
  const isFav = favorites.has(listing.id);
  return `
    <div class="listing-card" onclick="navigateTo('detail', ${listing.id})">
      <div class="listing-card-img">
        <img src="${_escHtml(listing.image)}" alt="${_escHtml(listing.title)}" loading="lazy" />
        <button class="listing-fav ${isFav ? 'liked' : ''}" onclick="event.stopPropagation(); toggleFavorite(${listing.id}, this)">
          <span class="material-icons-round">${isFav ? 'favorite' : 'favorite_border'}</span>
        </button>
        ${listing.badge ? `<span class="listing-badge">${_escHtml(listing.badge)}</span>` : ''}
      </div>
      <div class="listing-card-body">
        <div class="listing-card-top">
          <span class="listing-card-title">${_escHtml(listing.title)}</span>
          <span class="listing-card-rating">
            <span class="material-icons-round">star</span> ${listing.rating || 0}
          </span>
        </div>
        <div class="listing-card-category">${_escHtml(listing.categoryLabel)}</div>
        <div class="listing-card-location">
          <span class="material-icons-round">location_on</span> ${_escHtml(listing.location)}
        </div>
        <div class="listing-card-price">${_escHtml(listing.priceLabel)}</div>
        <div class="listing-card-tags">
          ${(listing.tags || []).map(t => `<span class="listing-tag">${_escHtml(t)}</span>`).join('')}
        </div>
      </div>
    </div>
  `;
}

// ========== HOME PAGE ==========

function renderHeroMarquees() {
  const leftTrack = document.querySelector('#heroMarqueeLeft .hero-marquee-track');
  const rightTrack = document.querySelector('#heroMarqueeRight .hero-marquee-track');
  if (!leftTrack || !rightTrack) return;

  var visible = _visibleListings();
  const leftListings = visible.slice(0, 5);
  const rightListings = visible.length > 5
    ? visible.slice(5, 10)
    : visible.slice(0, 5).slice().reverse();

  function cardHTML(l) {
    return `<a class="hero-marquee-card" href="#" onclick="navigateTo('detail',${l.id});return false;">
      <img src="${_escHtml(l.image)}" alt="${_escHtml(l.title)}" loading="lazy" />
      <div class="hero-marquee-card-info">
        <h4>${_escHtml(l.title)}</h4>
        <span>${_escHtml(l.priceLabel)} · ★ ${l.rating}</span>
      </div>
    </a>`;
  }

  // Duplicate items for seamless infinite scroll
  const leftHTML = leftListings.map(cardHTML).join('');
  const rightHTML = rightListings.map(cardHTML).join('');
  leftTrack.innerHTML = leftHTML + leftHTML;
  rightTrack.innerHTML = rightHTML + rightHTML;

  // Detect very wide images and switch to contain
  [leftTrack, rightTrack].forEach(track => {
    track.querySelectorAll('.hero-marquee-card img').forEach(img => {
      img.onload = () => {
        if (img.naturalWidth / img.naturalHeight > 2.2) {
          img.style.objectFit = 'contain';
          img.style.background = '#fff';
        }
      };
      if (img.complete && img.naturalWidth) {
        if (img.naturalWidth / img.naturalHeight > 2.2) {
          img.style.objectFit = 'contain';
          img.style.background = '#fff';
        }
      }
    });
  });
}

// ========== EXPLORE PAGE (Instagram-Style) ==========
function renderExploreGrid(filter) {
  const grid = document.getElementById('exploreGrid');
  if (!grid) return;
  const query = filter || (document.getElementById('exploreSearch')?.value || '').trim().toLowerCase();
  // Collect all images from all listings
  let items = [];
  LISTINGS.forEach(l => {
    // Main image
    items.push({ image: l.image, listingId: l.id, title: l.title, provider: l.providerName, price: l.priceLabel });
    // Additional images
    if (l.images) {
      l.images.slice(1).forEach(img => {
        items.push({ image: img, listingId: l.id, title: l.title, provider: l.providerName, price: l.priceLabel });
      });
    }
  });
  if (query) {
    items = items.filter(it => it.title.toLowerCase().includes(query) || it.provider.toLowerCase().includes(query));
  }
  grid.innerHTML = items.map((it, i) => {
    const sizeClass = (i % 7 === 0) ? 'explore-item-large' : '';
    return `<a href="#" class="explore-item ${sizeClass}" onclick="navigateTo('detail',${it.listingId});return false;">
      <img src="${_escHtml(it.image)}" alt="${_escHtml(it.title)}" loading="lazy" />
      <div class="explore-item-overlay">
        <span class="explore-item-title">${_escHtml(it.title)}</span>
        <span class="explore-item-price">${_escHtml(it.price)}</span>
      </div>
    </a>`;
  }).join('');
}

function filterExploreGrid() {
  renderExploreGrid();
}

// ========== AKTUELLES FEED ==========
function timeAgo(dateStr) {
  if (!dateStr) return '';
  var now = Date.now();
  var then = new Date(dateStr.replace(' ', 'T') + (dateStr.includes('T') || dateStr.includes('+') ? '' : 'Z'));
  var minutes = Math.max(0, Math.floor((now - then.getTime()) / 60000));
  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return 'vor ' + minutes + ' Min.';
  var hours = Math.floor(minutes / 60);
  if (hours < 24) return 'vor ' + hours + ' Std.';
  var days = Math.floor(hours / 24);
  if (days === 1) return 'Gestern';
  if (days < 7) return 'vor ' + days + ' Tagen';
  if (days < 30) return 'vor ' + Math.floor(days / 7) + ' Wo.';
  if (days < 365) return 'vor ' + Math.floor(days / 30) + ' Mon.';
  return 'vor ' + Math.floor(days / 365) + (Math.floor(days / 365) === 1 ? ' Jahr' : ' Jahren');
}

function renderFeed(tab) {
  const list = document.getElementById('feedList');
  if (!list) return;
  // Deduplicate LISTINGS by id (keep first occurrence)
  const seen = new Set();
  let items = _visibleListings().filter(function(l) {
    if (seen.has(l.id)) return false;
    seen.add(l.id);
    return true;
  });
  items = [...items];
  if (tab === 'newest') {
    items = items.sort((a, b) => b.id - a.id);
  } else if (tab === 'popular') {
    items = items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else {
    // "Für dich" — mix: shuffle with slight preference for higher rated
    items = items.sort(() => Math.random() - 0.5);
  }

  list.innerHTML = items.map((l, i) => {
    const avatar = l.providerImg || l.providerAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(l.providerName);
    const categoryLabel = l.category ? l.category.charAt(0).toUpperCase() + l.category.slice(1) : 'Service';
    const isFav = favorites.has(l.id);
    const desc = l.description || l.title;
    const tags = l.features ? l.features.slice(0, 3) : [];
    return `<div class="feed-card">
      <div class="feed-card-header">
        <img class="feed-card-avatar" src="${_escHtml(avatar)}" alt="${_escHtml(l.providerName)}" onclick="navigateTo('provider',${l.providerId || l.id})" />
        <div class="feed-card-meta">
          <span class="feed-card-provider" onclick="navigateTo('provider',${l.providerId || l.id})">${_escHtml(l.providerName)}</span>
          <span class="feed-card-time"><span class="material-icons-round">schedule</span> ${timeAgo(l.createdAt)}</span>
        </div>
        <span class="feed-card-category">${_escHtml(categoryLabel)}</span>
      </div>
      <img class="feed-card-image" src="${_escHtml(l.image)}" alt="${_escHtml(l.title)}" onclick="navigateTo('detail',${l.id})" loading="lazy" />
      <div class="feed-card-body">
        <div class="feed-card-title" onclick="navigateTo('detail',${l.id})">${_escHtml(l.title)}</div>
        <div class="feed-card-desc">${_escHtml(_stripHtml(desc))}</div>
      </div>
      ${l.location ? '<div class="feed-card-location"><span class="material-icons-round">location_on</span> ' + _escHtml(l.location) + '</div>' : ''}
      ${tags.length ? '<div class="feed-card-tags">' + tags.map(t => '<span class="feed-card-tag">' + _escHtml(t) + '</span>').join('') + '</div>' : ''}
      <div class="feed-card-footer">
        <span class="feed-card-price">${_escHtml(l.priceLabel)}</span>
        <div class="feed-card-actions">
          <button class="feed-card-action ${isFav ? 'active' : ''}" onclick="toggleFeedFav(this,${l.id})">
            <span class="material-icons-round">${isFav ? 'favorite' : 'favorite_border'}</span>
          </button>
          <button class="feed-card-action" onclick="navigateTo('detail',${l.id})">
            <span class="material-icons-round">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function switchFeedTab(btn) {
  document.querySelectorAll('.feed-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderFeed(btn.dataset.feed);
}

function toggleFeedFav(btn, id) {
  if (favorites.has(id)) {
    favorites.delete(id);
    btn.classList.remove('active');
    btn.querySelector('.material-icons-round').textContent = 'favorite_border';
    showToast('Von Favoriten entfernt', 'favorite_border');
  } else {
    favorites.add(id);
    btn.classList.add('active');
    btn.querySelector('.material-icons-round').textContent = 'favorite';
    showToast('Zu Favoriten hinzugefügt! ❤️', 'favorite');
  }
  _saveFavoritesToStorage();
  // Sync with API if logged in (only for real DB listings)
  if (isLoggedIn) {
    var listing = LISTINGS.find(function(l) { return l.id === id; });
    if (listing && listing._fromDb) {
      var dbId = listing._dbId || (id - 10000);
      fetch(_apiUrl('favorites/' + dbId), {
        method: 'POST', credentials: 'same-origin', headers: _apiHeaders()
      }).catch(function(){});
    }
  }
}

function detectWideBannerCards(container) {
  container.querySelectorAll('.listing-card-img img').forEach(detectWideBannerImg);
}

function detectWideBannerImg(img) {
  if (!img) return;
  const check = () => {
    if (img.naturalWidth / img.naturalHeight > 2.2) {
      img.style.objectFit = 'contain';
      img.style.background = '#fff';
    }
  };
  if (img.complete && img.naturalWidth) check();
  else img.onload = check;
}

function renderFeaturedGrid() {
  const grid = document.getElementById('featuredGrid');
  var visible = _visibleListings();
  grid.innerHTML = visible.slice(0, 8).map(renderListingCard).join('');
  detectWideBannerCards(grid);
}

function filterCategory(btn, category) {
  document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  var visible = _visibleListings();
  const filtered = category === 'alle' ? visible : visible.filter(l => l.category === category);
  const grid = document.getElementById('featuredGrid');
  grid.innerHTML = filtered.map(renderListingCard).join('');
  detectWideBannerCards(grid);
}

// Event-type to tag mapping (hero select values → listing tag names)
const EVENT_TYPE_MAP = {
  'hochzeit': 'Hochzeit', 'geburtstag': 'Geburtstag', 'party': 'Party',
  'firmen': 'Firmen-Event', 'jubilaeum': 'Jubiläum', 'messe': 'Messe',
};

// City coordinates for proximity calculation
const CITY_PROXIMITY = {
  'Berlin':     { lat: 52.52, lng: 13.405 },
  'Hamburg':    { lat: 53.55, lng: 9.993 },
  'München':    { lat: 48.14, lng: 11.582 },
  'Frankfurt':  { lat: 50.11, lng: 8.682 },
  'Düsseldorf': { lat: 51.23, lng: 6.774 },
  'Starnberg':  { lat: 47.99, lng: 11.341 },
  'Köln':       { lat: 50.94, lng: 6.960 },
  'Stuttgart':  { lat: 48.78, lng: 9.183 },
};

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ========== KI-SUCHE ==========
const AI_KEYWORDS = {
  'dj': { term: 'DJ', category: 'dj', emoji: '🎧', hint: 'DJ & Musik für dein Event' },
  'musik': { term: 'DJ', category: 'dj', emoji: '🎧', hint: 'Musiker & DJs' },
  'sound': { term: 'DJ', category: 'dj', emoji: '🎧', hint: 'Sound & DJ-Service' },
  'party': { term: 'DJ', category: 'dj', emoji: '🎧', hint: 'Party-DJ buchen' },
  'beats': { term: 'DJ', category: 'dj', emoji: '🎧', hint: 'DJ & Beats' },
  'auflegen': { term: 'DJ', category: 'dj', emoji: '🎧', hint: 'DJ zum Auflegen' },
  'catering': { term: 'Catering', category: 'catering', emoji: '🍽️', hint: 'Catering-Service' },
  'essen': { term: 'Catering', category: 'catering', emoji: '🍽️', hint: 'Essen & Catering' },
  'buffet': { term: 'Catering', category: 'catering', emoji: '🍽️', hint: 'Buffet-Catering' },
  'koch': { term: 'Catering', category: 'catering', emoji: '🍽️', hint: 'Koch & Catering' },
  'gourmet': { term: 'Catering', category: 'catering', emoji: '🍽️', hint: 'Gourmet-Catering' },
  'foto': { term: 'Fotografie', category: 'foto', emoji: '📷', hint: 'Event-Fotografie' },
  'fotograf': { term: 'Fotografie', category: 'foto', emoji: '📷', hint: 'Fotograf buchen' },
  'kamera': { term: 'Fotografie', category: 'foto', emoji: '📷', hint: 'Fotograf & Kamera' },
  'bilder': { term: 'Fotografie', category: 'foto', emoji: '📷', hint: 'Fotos & Bilder' },
  'blumen': { term: 'Floristik', category: 'florist', emoji: '🌸', hint: 'Blumen & Floristik' },
  'florist': { term: 'Floristik', category: 'florist', emoji: '🌸', hint: 'Floristik-Service' },
  'deko': { term: 'Dekoration', category: 'deko', emoji: '🎈', hint: 'Event-Dekoration' },
  'dekoration': { term: 'Dekoration', category: 'deko', emoji: '🎈', hint: 'Dekoration & Design' },
  'schmuck': { term: 'Dekoration', category: 'deko', emoji: '🎈', hint: 'Deko & Schmuck' },
  'licht': { term: 'Licht & Technik', category: 'licht', emoji: '💡', hint: 'Licht & Technik' },
  'technik': { term: 'Licht & Technik', category: 'licht', emoji: '💡', hint: 'Eventtechnik' },
  'beleuchtung': { term: 'Licht & Technik', category: 'licht', emoji: '💡', hint: 'Beleuchtung & Licht' },
  'feuerwerk': { term: 'Pyrotechnik', category: 'pyro', emoji: '🎆', hint: 'Feuerwerk & Pyro' },
  'pyro': { term: 'Pyrotechnik', category: 'pyro', emoji: '🎆', hint: 'Pyrotechnik-Show' },
  'location': { term: 'Location', category: 'location', emoji: '🏰', hint: 'Event-Location finden' },
  'räume': { term: 'Location', category: 'location', emoji: '🏰', hint: 'Räume & Locations' },
  'saal': { term: 'Location', category: 'location', emoji: '🏰', hint: 'Festsaal & Location' },
  'schloss': { term: 'Location', category: 'location', emoji: '🏰', hint: 'Schloss-Location' },
  'planung': { term: 'Eventplanung', category: 'planung', emoji: '📋', hint: 'Event-Planung' },
  'planer': { term: 'Eventplanung', category: 'planung', emoji: '📋', hint: 'Eventplaner buchen' },
  'organisieren': { term: 'Eventplanung', category: 'planung', emoji: '📋', hint: 'Event organisieren' },
  'moderator': { term: 'Moderation', category: 'moderation', emoji: '🎤', hint: 'Moderator buchen' },
  'moderation': { term: 'Moderation', category: 'moderation', emoji: '🎤', hint: 'Event-Moderation' },
  'hochzeit': { term: 'Hochzeit', category: '', emoji: '💍', hint: 'Alles für die Hochzeit' },
  'heiraten': { term: 'Hochzeit', category: '', emoji: '💍', hint: 'Hochzeits-Services' },
  'geburtstag': { term: 'Geburtstag', category: '', emoji: '🎂', hint: 'Geburtstags-Services' },
  'firmen': { term: 'Firmen-Event', category: '', emoji: '🏢', hint: 'Firmen-Events' },
  'messe': { term: 'Messe', category: '', emoji: '🎪', hint: 'Messe-Services' },
};

// Typo / fuzzy matching – Levenshtein distance
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({length: m + 1}, (_, i) => {
    const row = new Array(n + 1);
    row[0] = i;
    return row;
  });
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a[i-1] !== b[j-1] ? 1 : 0));
  return d[m][n];
}

function aiMatchKeyword(input) {
  input = input.toLowerCase().trim();
  if (!input) return [];

  const words = input.split(/\s+/);
  const matches = new Map();

  words.forEach(word => {
    if (word.length < 2) return;
    Object.entries(AI_KEYWORDS).forEach(([key, val]) => {
      // Exact prefix or contains
      if (key.startsWith(word) || word.startsWith(key)) {
        matches.set(val.hint, { ...val, score: 0 });
        return;
      }
      // Fuzzy – allow 1-2 typos depending on word length
      const maxDist = word.length <= 3 ? 1 : 2;
      const dist = levenshtein(word, key);
      if (dist <= maxDist) {
        const existing = matches.get(val.hint);
        if (!existing || dist < existing.score) {
          matches.set(val.hint, { ...val, score: dist });
        }
      }
    });
  });

  // Also try matching against listing titles directly
  const listingMatches = _visibleListings().filter(l => {
    const haystack = `${l.title} ${l.categoryLabel} ${l.tags.join(' ')} ${l.providerName}`.toLowerCase();
    return words.some(w => w.length >= 2 && haystack.includes(w));
  }).slice(0, 2);

  listingMatches.forEach(l => {
    const emoji = CATEGORY_EMOJI[l.category] || '📌';
    matches.set('listing_' + l.id, {
      term: l.title,
      category: l.category,
      emoji: emoji,
      hint: `${l.categoryLabel} · ${l.location}`,
      listingId: l.id,
      score: 1
    });
  });

  return Array.from(matches.values())
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);
}

const AI_CATEGORIES = [
  { key: 'dj', label: 'DJ & Musik', emoji: '🎧' },
  { key: 'catering', label: 'Catering', emoji: '🍽️' },
  { key: 'foto', label: 'Fotografie', emoji: '📷' },
  { key: 'florist', label: 'Floristik', emoji: '🌸' },
  { key: 'deko', label: 'Dekoration', emoji: '🎈' },
  { key: 'licht', label: 'Licht & Technik', emoji: '💡' },
  { key: 'planung', label: 'Planung', emoji: '📋' },
  { key: 'moderation', label: 'Moderation', emoji: '🎤' },
  { key: 'pyro', label: 'Pyrotechnik', emoji: '🎆' },
  { key: 'location', label: 'Location', emoji: '🏰' },
];
let selectedCategories = new Set();
let aiDebounce = null;

function renderCategoryPicker() {
  const list = document.getElementById('aiSuggestionsList');
  list.innerHTML = AI_CATEGORIES.map(c => `
    <div class="ai-cat-chip${selectedCategories.has(c.key) ? ' selected' : ''}" onclick="toggleCategory('${c.key}')">
      <span class="ai-cat-emoji">${c.emoji}</span>
      <span class="ai-cat-label">${c.label}</span>
    </div>
  `).join('');
}

function toggleCategory(key) {
  if (selectedCategories.has(key)) {
    selectedCategories.delete(key);
  } else {
    selectedCategories.add(key);
  }
  renderCategoryPicker();
  renderSelectedTags();
}

function renderSelectedTags() {
  const container = document.getElementById('aiSelectedTags');
  if (!selectedCategories.size) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = Array.from(selectedCategories).map(key => {
    const cat = AI_CATEGORIES.find(c => c.key === key);
    return `<span class="ai-tag" onclick="toggleCategory('${key}')">
      ${cat.emoji} ${cat.label}
      <span class="material-icons-round">close</span>
    </span>`;
  }).join('');
}

function initAiSearch() {
  const input = document.getElementById('heroSearchInput');
  const box = document.getElementById('aiSuggestions');
  const field = input.closest('.hero-field-ai');

  input.addEventListener('focus', () => {
    field.classList.add('focused');
    renderCategoryPicker();
    box.classList.add('show');
  });

  input.addEventListener('input', () => {
    const val = input.value.trim();
    clearTimeout(aiDebounce);

    if (!val) {
      renderCategoryPicker();
      box.classList.add('show');
      return;
    }

    // Keep category picker open so user can select manually
    renderCategoryPicker();
    box.classList.add('show');
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.hero-search')) {
      box.classList.remove('show');
      field.classList.remove('focused');
    }
  });

  // Enter key → search
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      box.classList.remove('show');
      field.classList.remove('focused');
      performSearch();
    }
  });
}

// ========== CUSTOM CALENDAR (WANN) ==========
var calMonth = new Date().getMonth();
var calYear = new Date().getFullYear();
var calSelected = null;

var CAL_MONTHS_DE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

function toggleCalendar(e) {
  e.stopPropagation();
  var dd = document.getElementById('calDropdown');
  if (dd.classList.contains('show')) {
    dd.classList.remove('show');
  } else {
    renderCalendar();
    dd.classList.add('show');
  }
}

function renderCalendar() {
  var title = document.getElementById('calTitle');
  var grid = document.getElementById('calGrid');
  title.textContent = CAL_MONTHS_DE[calMonth] + ' ' + calYear;

  var firstDay = new Date(calYear, calMonth, 1).getDay();
  var startIdx = firstDay === 0 ? 6 : firstDay - 1; // Monday-based
  var daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  var daysInPrev = new Date(calYear, calMonth, 0).getDate();
  var today = new Date();
  today.setHours(0,0,0,0);

  var html = '';
  // Previous month trailing days
  for (var i = startIdx - 1; i >= 0; i--) {
    html += '<button type="button" class="cal-day other-month disabled">' + (daysInPrev - i) + '</button>';
  }

  // Current month days
  for (var d = 1; d <= daysInMonth; d++) {
    var date = new Date(calYear, calMonth, d);
    date.setHours(0,0,0,0);
    var isPast = date < today;
    var isToday = date.getTime() === today.getTime();
    var isSelected = calSelected && date.getTime() === calSelected.getTime();
    var cls = 'cal-day';
    if (isPast) cls += ' disabled';
    if (isToday) cls += ' today';
    if (isSelected) cls += ' selected';
    html += '<button type="button" class="' + cls + '"' + (isPast ? '' : ' onclick="calSelect(event,' + d + ')"') + '>' + d + '</button>';
  }

  // Next month leading days
  var totalCells = startIdx + daysInMonth;
  var remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (var n = 1; n <= remaining; n++) {
    html += '<button type="button" class="cal-day other-month disabled">' + n + '</button>';
  }

  grid.innerHTML = html;
}

function calNav(e, dir) {
  e.stopPropagation();
  calMonth += dir;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendar();
}

function calSelect(e, day) {
  e.stopPropagation();
  calSelected = new Date(calYear, calMonth, day);
  calSelected.setHours(0,0,0,0);
  var display = document.getElementById('heroDateDisplay');
  var input = document.getElementById('heroDate');
  var dd = calSelected.getDate();
  var mm = calSelected.getMonth() + 1;
  display.textContent = dd + '. ' + CAL_MONTHS_DE[calSelected.getMonth()] + ' ' + calSelected.getFullYear();
  display.classList.add('has-value');
  input.value = calSelected.getFullYear() + '-' + String(mm).padStart(2,'0') + '-' + String(dd).padStart(2,'0');
  document.getElementById('calDropdown').classList.remove('show');
  renderCalendar();
}

function calToday(e) {
  e.stopPropagation();
  var now = new Date();
  calMonth = now.getMonth();
  calYear = now.getFullYear();
  calSelect(e, now.getDate());
}

function calClear(e) {
  e.stopPropagation();
  calSelected = null;
  document.getElementById('heroDateDisplay').textContent = 'Datum wählen';
  document.getElementById('heroDateDisplay').classList.remove('has-value');
  document.getElementById('heroDate').value = '';
  document.getElementById('calDropdown').classList.remove('show');
}

// Close calendar on outside click
document.addEventListener('click', function(e) {
  var dd = document.getElementById('calDropdown');
  if (dd && !e.target.closest('.hero-field-date')) {
    dd.classList.remove('show');
  }
});

function performSearch() {
  navigateTo('browse');

  // Transfer hero values → browse filters
  const searchVal = document.getElementById('heroSearchInput').value;
  const eventType = document.getElementById('heroEventType').value;
  const locationVal = document.getElementById('heroLocation').value;

  if (searchVal) document.getElementById('browseSearch').value = searchVal;
  if (locationVal) document.getElementById('browseLocation').value = locationVal;

  // If categories selected, set the first one in browse filter (multi handled in filterListings)
  if (selectedCategories.size) {
    const browseCat = document.getElementById('browseCategory');
    if (browseCat) browseCat.value = '';
  }

  // Map hero event type to browse event type
  const browseET = document.getElementById('browseEventType');
  if (eventType && browseET) {
    browseET.value = EVENT_TYPE_MAP[eventType] || '';
  }

  filterListings();
}

// ========== BROWSE PAGE ==========
function renderBrowseGrid(listings) {
  const grid = document.getElementById('browseGrid');
  grid.innerHTML = listings.map(renderListingCard).join('');
  detectWideBannerCards(grid);
  document.getElementById('browseResultCount').textContent = `${listings.length} Services gefunden`;
}

function filterListings() {
  const search = document.getElementById('browseSearch').value.toLowerCase().trim();
  const category = document.getElementById('browseCategory').value;
  const eventType = document.getElementById('browseEventType')?.value || '';
  const location = document.getElementById('browseLocation').value.toLowerCase().trim();
  const priceRange = document.getElementById('browsePrice')?.value || '';
  const minRating = document.getElementById('browseRating')?.value || '';

  let filtered = _visibleListings().filter(l => {
    // Text search: title, category label, tags, provider
    if (search) {
      const haystack = `${l.title} ${l.categoryLabel} ${l.tags.join(' ')} ${l.providerName}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    if (category && l.category !== category) return false;
    // Multi-category filter from hero picker
    if (selectedCategories.size && !selectedCategories.has(l.category)) return false;
    // Event type → check listing tags
    if (eventType && !l.tags.some(t => t.toLowerCase() === eventType.toLowerCase())) return false;
    if (location && !l.location.toLowerCase().includes(location) && !l.region.toLowerCase().includes(location)) return false;
    // Price range
    if (priceRange) {
      if (priceRange === '2500+') { if (l.price < 2500) return false; }
      else {
        const [min, max] = priceRange.split('-').map(Number);
        if (l.price < min || l.price > max) return false;
      }
    }
    if (minRating && l.rating < parseFloat(minRating)) return false;
    return true;
  });

  // Sort
  const sort = document.getElementById('browseSort').value;
  switch (sort) {
    case 'preis-asc': filtered.sort((a, b) => a.price - b.price); break;
    case 'preis-desc': filtered.sort((a, b) => b.price - a.price); break;
    case 'rating': filtered.sort((a, b) => b.rating - a.rating); break;
    case 'neu': filtered.sort((a, b) => b.id - a.id); break;
  }

  // Render active filter tags
  renderActiveFilters(search, category, eventType, location, priceRange, minRating);

  // Show results or no-results with alternatives
  const noResultsEl = document.getElementById('noResultsContainer');
  const gridEl = document.getElementById('browseGrid');

  if (filtered.length > 0) {
    gridEl.style.display = '';
    noResultsEl.style.display = 'none';
    renderBrowseGrid(filtered);
  } else {
    gridEl.style.display = 'none';
    noResultsEl.style.display = 'block';
    document.getElementById('browseResultCount').textContent = '0 Services gefunden';
    showNoResultsWithAlternatives(search, category, eventType, location);
  }
}

function showNoResultsWithAlternatives(search, category, eventType, location) {
  // Build descriptive "no results" message
  const parts = [];
  if (eventType) parts.push(`„${eventType}"`);
  if (search) parts.push(`„${search}"`);
  if (location) parts.push(`in „${location.charAt(0).toUpperCase() + location.slice(1)}"`);
  if (category) {
    const catLabel = LISTINGS.find(l => l.category === category)?.categoryLabel || category;
    parts.push(`(${catLabel})`);
  }
  const desc = parts.length > 0 ? parts.join(' ') : 'deine Suche';
  document.getElementById('noResultsText').textContent =
    `Für ${desc} konnten wir leider keine passenden Services finden.`;

  // Detect category from search text (e.g. "dj" → dj, "foto" → foto, "catering hamburg" → catering)
  let detectedCategory = category || '';
  if (!detectedCategory && search) {
    const searchLower = search.toLowerCase();
    // Check against category keys and labels
    for (const [key, label] of Object.entries(CATEGORY_LABELS)) {
      if (searchLower.includes(key) || searchLower.includes(label.toLowerCase())) {
        detectedCategory = key;
        break;
      }
    }
    // Also check broader terms
    const categoryAliases = {
      'musik': 'dj', 'disc': 'dj', 'sound': 'dj',
      'essen': 'catering', 'buffet': 'catering', 'kochen': 'catering', 'küche': 'catering',
      'blumen': 'florist', 'blume': 'florist', 'strauß': 'florist',
      'technik': 'licht', 'beleuchtung': 'licht', 'ton': 'licht', 'sound': 'licht',
      'feuerwerk': 'pyro', 'feuer': 'pyro',
      'fotograf': 'foto', 'kamera': 'foto', 'video': 'foto', 'bild': 'foto',
      'raum': 'location', 'saal': 'location', 'halle': 'location', 'venue': 'location',
      'schmuck': 'deko', 'dekoration': 'deko', 'dekoration': 'deko',
      'planer': 'planung', 'organisation': 'planung', 'koordination': 'planung',
      'moderator': 'moderation', 'sprecher': 'moderation', 'entertainer': 'moderation',
    };
    if (!detectedCategory) {
      for (const [alias, cat] of Object.entries(categoryAliases)) {
        if (searchLower.includes(alias)) {
          detectedCategory = cat;
          break;
        }
      }
    }
  }

  // Find alternatives by relaxing filters progressively
  let alternatives = [];
  var _vis = _visibleListings();

  // 1. Same category (detected from search or filter), any location
  if (detectedCategory) {
    alternatives = _vis.filter(l => l.category === detectedCategory);
  }

  // 2. Same event type, any location
  if (alternatives.length === 0 && eventType) {
    alternatives = _vis.filter(l => l.tags.some(t => t.toLowerCase() === eventType.toLowerCase()));
  }

  // 3. Same location/region, any category
  if (alternatives.length === 0 && location) {
    alternatives = _vis.filter(l =>
      l.location.toLowerCase().includes(location) || l.region.toLowerCase().includes(location)
    );
  }

  // 4. Fuzzy text match: search term in title, tags, description
  if (alternatives.length === 0 && search) {
    const words = search.split(/\s+/).filter(w => w.length >= 2);
    alternatives = _vis.filter(l => {
      const hay = `${l.title} ${l.categoryLabel} ${l.tags.join(' ')} ${l.description} ${l.providerName}`.toLowerCase();
      return words.some(w => hay.includes(w));
    });
  }

  // 5. Fallback: all listings sorted by rating
  if (alternatives.length === 0) {
    alternatives = [...LISTINGS];
  }

  // Sort by proximity to searched location
  const searchCity = location
    ? Object.keys(CITY_PROXIMITY).find(c => c.toLowerCase().includes(location))
    : null;

  if (searchCity) {
    const ref = CITY_PROXIMITY[searchCity];
    alternatives = alternatives.map(a => {
      const dest = CITY_PROXIMITY[a.location];
      const d = dest ? Math.round(haversineKm(ref.lat, ref.lng, dest.lat, dest.lng)) : 9999;
      return { ...a, _distKm: d };
    }).sort((a, b) => a._distKm - b._distKm);
  } else {
    // No city match — sort by rating
    alternatives = alternatives.map(a => ({ ...a, _distKm: null })).sort((a, b) => b.rating - a.rating);
  }

  // Limit to 6
  alternatives = alternatives.slice(0, 6);

  const altSection = document.getElementById('alternativesSection');
  const altGrid = document.getElementById('alternativesGrid');

  if (alternatives.length > 0) {
    altSection.style.display = '';
    let heading;
    if (searchCity) {
      heading = `<span class="material-icons-round">lightbulb</span> Alternativen in der Nähe von ${_escHtml(searchCity)}`;
    } else if (detectedCategory) {
      const catLabel = CATEGORY_LABELS[detectedCategory] || detectedCategory;
      heading = `<span class="material-icons-round">lightbulb</span> Ähnliche Angebote in der Kategorie „${_escHtml(catLabel)}"`;
    } else {
      heading = `<span class="material-icons-round">lightbulb</span> Das könnte dich auch interessieren`;
    }
    altSection.querySelector('h3').innerHTML = heading;

    altGrid.innerHTML = alternatives.map(l => {
      const distBadge = l._distKm != null && l._distKm > 0
        ? `<span class="alt-distance-badge"><span class="material-icons-round">near_me</span> ~${l._distKm} km</span>`
        : '';
      return `
        <div class="listing-card" onclick="navigateTo('detail', ${l.id})">
          <div class="listing-card-img">
            <img src="${_escHtml(l.image)}" alt="${_escHtml(l.title)}" loading="lazy" />
            <button class="listing-fav" onclick="event.stopPropagation(); toggleFavorite(${l.id}, this)">
              <span class="material-icons-round">favorite_border</span>
            </button>
            ${l.badge ? `<span class="listing-badge">${_escHtml(l.badge)}</span>` : ''}
          </div>
          <div class="listing-card-body">
            <div class="listing-card-top">
              <span class="listing-card-title">${_escHtml(l.title)}</span>
              <span class="listing-card-rating">
                <span class="material-icons-round">star</span> ${l.rating}
              </span>
            </div>
            <div class="listing-card-category">${_escHtml(l.categoryLabel)}</div>
            <div class="listing-card-location">
              <span class="material-icons-round">location_on</span> ${_escHtml(l.location)} ${distBadge}
            </div>
            <div class="listing-card-price">${_escHtml(l.priceLabel)}</div>
            <div class="listing-card-tags">
              ${l.tags.map(t => `<span class="listing-tag">${_escHtml(t)}</span>`).join('')}
            </div>
          </div>
        </div>`;
    }).join('');
  } else {
    altSection.style.display = 'none';
  }
}

function renderActiveFilters(search, category, eventType, location, priceRange, minRating) {
  const container = document.getElementById('activeFilters');
  const tags = [];

  if (search) tags.push({ label: `Suche: ${search}`, field: 'browseSearch' });
  if (category) {
    const catLabel = LISTINGS.find(l => l.category === category)?.categoryLabel || category;
    tags.push({ label: catLabel, field: 'browseCategory' });
  }
  if (eventType) tags.push({ label: `Event: ${eventType}`, field: 'browseEventType' });
  if (location) tags.push({ label: `Region: ${location}`, field: 'browseLocation' });
  if (priceRange) tags.push({ label: priceRange === '2500+' ? 'Über 2.500€' : priceRange.replace('-', '€ – ') + '€', field: 'browsePrice' });
  if (minRating) tags.push({ label: `★ ${minRating}+`, field: 'browseRating' });

  if (tags.length === 0) { container.innerHTML = ''; return; }

  container.innerHTML = tags.map(t =>
    `<span class="filter-tag">${_escHtml(t.label)}<button onclick="document.getElementById('${t.field}').value=''; filterListings();"><span class="material-icons-round">close</span></button></span>`
  ).join('') + `<button class="filter-tag-clear-all" onclick="clearAllFilters()">Alle Filter löschen</button>`;
}

function clearAllFilters() {
  ['browseSearch', 'browseCategory', 'browseEventType', 'browseLocation', 'browsePrice', 'browseRating'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  filterListings();
}

function setView(view) {
  document.getElementById('gridViewBtn').classList.toggle('active', view === 'grid');
  document.getElementById('listViewBtn').classList.toggle('active', view === 'list');
  const grid = document.getElementById('browseGrid');
  if (view === 'list') {
    grid.style.gridTemplateColumns = '1fr';
  } else {
    grid.style.gridTemplateColumns = '';
  }
}

// ========== DETAIL PAGE ==========
function loadDetail(listingId) {
  const listing = LISTINGS.find(l => l.id === listingId);
  if (!listing) return;
  currentListing = listing;

  // Gallery
  const gallery = document.getElementById('detailGallery');
  const heroImg = document.getElementById('detailHeroImg');

  // Hero image for mobile (first image, shown prominently)
  if (listing.images.length > 0) {
    heroImg.innerHTML = `<img src="${_escHtml(listing.images[0])}" alt="${_escHtml(listing.title)}" class="detail-hero-photo" />`;
  }

  // Swipeable gallery carousel
  var imgs = listing.images;
  gallery.innerHTML = '<div class="detail-gallery-track" id="detailGalleryTrack">' +
    imgs.map(function(img, i) {
      return '<div class="detail-gallery-slide"><img src="' + _escHtml(img) + '" alt="' + _escHtml(listing.title) + '" /></div>';
    }).join('') +
    '</div>' +
    (imgs.length > 1 ? '<button class="detail-gallery-arrow prev" onclick="detailGalleryNav(-1)"><span class="material-icons-round">chevron_left</span></button>' +
    '<button class="detail-gallery-arrow next" onclick="detailGalleryNav(1)"><span class="material-icons-round">chevron_right</span></button>' +
    '<div class="detail-gallery-dots" id="detailGalleryDots">' +
    imgs.map(function(_, i) { return '<button class="detail-gallery-dot' + (i === 0 ? ' active' : '') + '" onclick="detailGalleryGoTo(' + i + ')"></button>'; }).join('') +
    '</div>' +
    '<div class="detail-gallery-counter" id="detailGalleryCounter">1 / ' + imgs.length + '</div>' : '');
  _initDetailGallerySwipe();
  // Detect wide banners for hero + gallery
  detectWideBannerImg(heroImg.querySelector('img'));
  gallery.querySelectorAll('.detail-gallery-slide img').forEach(detectWideBannerImg);
  // Cinematic preview on load
  if (imgs.length > 1) {
    _startCinemaPreview(gallery, imgs, listing.title);
  }

  // Info
  document.getElementById('detailCategory').textContent = listing.categoryLabel;
  document.getElementById('detailTitle').textContent = listing.title;
  // Review count: show stored DB values initially, loadDetailReviews will update with live data
  document.getElementById('detailRating').textContent = listing.rating || '0';
  document.getElementById('detailReviewCount').textContent = '(' + (listing.reviews || 0) + ' Bewertungen)';
  document.getElementById('detailLocation').textContent = listing.region;
  document.getElementById('detailProviderImg').src = listing.providerImg;
  document.getElementById('detailProviderName').textContent = listing.providerName;
  document.getElementById('detailProviderTag').textContent = `Superhost · Seit ${listing.providerSince} auf Eventbörse`;

  // Show edit button only for own listings
  var editBtn = document.getElementById('detailEditBtn');
  if (editBtn) editBtn.style.display = (currentUser && listing.providerId === currentUser.id) ? '' : 'none';

  // Admin delete button for listing
  var existingAdminDel = document.getElementById('detailAdminDeleteBtn');
  if (existingAdminDel) existingAdminDel.remove();
  if (currentUser && currentUser.isAdmin && listing.providerId !== currentUser.id) {
    var adminDelBtn = document.createElement('button');
    adminDelBtn.id = 'detailAdminDeleteBtn';
    adminDelBtn.className = 'btn-outline btn-sm btn-danger-outline';
    adminDelBtn.innerHTML = '<span class="material-icons-round">delete</span> Inserat löschen';
    adminDelBtn.onclick = function() { adminDeleteListing(listing.id); };
    var provRow = document.querySelector('.detail-provider-row');
    if (provRow) provRow.appendChild(adminDelBtn);
  }

  document.getElementById('detailDescription').innerHTML = _sanitizeHtml(listing.description);
  document.getElementById('detailPrice').textContent = listing.priceLabel.split('/')[0];

  // Features
  document.getElementById('detailFeatures').innerHTML = listing.features.map(f =>
    `<div class="feature-item"><span class="material-icons-round">check_circle</span><span>${_escHtml(f)}</span></div>`
  ).join('');

  // Reviews
  renderDetailReviews(listing);

  // Negotiation price
  document.getElementById('negOriginalPrice').value = listing.priceLabel;
}

// ========== PROVIDER PROFILE ==========
let providerImages = [];
let lightboxIndex = 0;

function loadProvider(providerId) {
  var pid = providerId || currentListing?.providerId;
  // DB listings always take priority over demo data
  var dbListings = LISTINGS.filter(l => l._fromDb && l.providerId === pid);
  var providerListings;
  if (dbListings.length > 0) {
    // Real provider from database
    providerListings = dbListings;
  } else {
    // Fall back to demo data
    var demoListings = LISTINGS.filter(l => !l._fromDb && l.providerId === pid);
    if (demoListings.length > 0) {
      providerListings = demoListings;
    } else {
      providerListings = [];
    }
  }
  var isDemoProvider = providerListings.length > 0 && !providerListings[0]._fromDb;

  // If no listings found locally, fetch provider from API — but NOT for demo providers
  if (providerListings.length === 0 && pid && !isDemoProvider) {
    fetch(_apiUrl('provider/' + pid) + '?_t=' + Date.now(), { credentials: 'same-origin', headers: _apiHeaders() })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!data || data.message) return;
        if (data.listings && data.listings.length > 0) {
          data.listings.forEach(function(l) {
            l._fromDb = true;
            if (!LISTINGS.some(function(ex) { return ex.id === l.id; })) {
              LISTINGS.push(l);
            }
          });
        } else {
          LISTINGS.push({
            id: 'profile-' + pid,
            _fromDb: true,
            providerId: pid,
            providerName: data.name || 'Anbieter',
            providerImg: data.photoUrl || ('https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(data.name || 'user')),
            providerSince: data.since || '',
            description: data.bio || '',
            location: data.location || '',
            categoryLabel: data.role || 'Anbieter',
            priceLabel: '',
            images: data.gallery || [],
            features: [],
            tags: [],
            rating: 0,
            reviews: 0,
            badge: ''
          });
        }
        loadProvider(pid);
      })
      .catch(function() {});
    return;
  }

  const mainListing = providerListings[0] || LISTINGS[0];
  providerImages = providerListings.flatMap(l => l.images || []);

  // Cover Gallery — full-width animated scroll rows
  buildGalleryRows(providerImages);

  // Profile Card
  document.getElementById('providerAvatar').src = mainListing.providerImg;
  document.getElementById('providerName').textContent = mainListing.providerName;
  document.getElementById('providerTagline').textContent = `${mainListing.categoryLabel} · ${mainListing.location}`;
  document.getElementById('providerListingCount').textContent = providerListings.length;
  // Provider rating/reviews from aggregated DB data — filled after API call below
  var providerRating = mainListing.rating;
  var providerReviewCount = mainListing.reviews;
  if (dbListings.length > 1) {
    var totalR = 0, countR = 0;
    dbListings.forEach(function(l) { if (l.rating > 0) { totalR += l.rating * (l.reviews || 1); countR += (l.reviews || 1); } });
    providerRating = countR > 0 ? Math.round(totalR / countR * 10) / 10 : 0;
    providerReviewCount = dbListings.reduce(function(s, l) { return s + (l.reviews || 0); }, 0);
  }
  document.getElementById('providerRating').textContent = providerRating || '–';
  document.getElementById('providerReviews').textContent = providerReviewCount || 0;

  // Store provider user ID for chat
  var puidEl = document.getElementById('providerUserId');
  if (!puidEl) {
    puidEl = document.createElement('input');
    puidEl.type = 'hidden';
    puidEl.id = 'providerUserId';
    document.getElementById('page-provider').appendChild(puidEl);
  }
  puidEl.value = mainListing.providerId || '';

  // Badges
  const badgesEl = document.getElementById('providerBadges');
  let badgesHtml = '';
  if (mainListing.categoryLabel === 'Admin') {
    badgesHtml += '<span class="ppc-badge admin-badge"><span class="material-icons-round">shield</span> Admin</span>';
  }
  if (mainListing.badge === 'Superhost') {
    badgesHtml += '<span class="ppc-badge ppc-badge-super"><span class="material-icons-round">workspace_premium</span> Superhost</span>';
  }
  badgesHtml += `<span class="ppc-badge"><span class="material-icons-round">schedule</span> Mitglied seit ${_escHtml(mainListing.providerSince)}</span>`;
  badgesHtml += '<span class="ppc-badge"><span class="material-icons-round">bolt</span> Antwortet schnell</span>';
  badgesEl.innerHTML = badgesHtml;

  // Bio with read-more
  const bioEl = document.getElementById('providerBio');
  bioEl.innerHTML = _sanitizeHtml(mainListing.description);
  bioEl.classList.remove('bio-collapsed');
  const existingToggle = bioEl.parentElement.querySelector('.bio-toggle');
  if (existingToggle) existingToggle.remove();
  requestAnimationFrame(() => {
    if (bioEl.scrollHeight > 140) {
      bioEl.classList.add('bio-collapsed');
      const toggle = document.createElement('button');
      toggle.className = 'bio-toggle';
      toggle.innerHTML = '<span class="material-icons-round" style="font-size:16px">expand_more</span> Mehr anzeigen';
      toggle.onclick = () => {
        const collapsed = bioEl.classList.toggle('bio-collapsed');
        toggle.innerHTML = collapsed
          ? '<span class="material-icons-round" style="font-size:16px">expand_more</span> Mehr anzeigen'
          : '<span class="material-icons-round" style="font-size:16px">expand_less</span> Weniger anzeigen';
      };
      bioEl.parentElement.appendChild(toggle);
    }
  });

  // Highlights
  const icons = ['check_circle', 'music_note', 'lightbulb', 'handshake', 'auto_awesome', 'mic'];
  document.getElementById('providerHighlights').innerHTML = (mainListing.features || []).map((f, i) =>
    `<div class="prov-highlight"><span class="material-icons-round">${icons[i % icons.length]}</span> ${_escHtml(f)}</div>`
  ).join('');

  // Portfolio
  const portfolioEl = document.getElementById('providerPortfolio');
  portfolioEl.innerHTML = providerImages.map((img, i) =>
    `<img src="${_escHtml(img)}" alt="Portfolio" loading="lazy" onclick="openProviderLightbox(${i})" />`
  ).join('');
  portfolioEl.querySelectorAll('img').forEach(detectWideBannerImg);

  // Sidebar Facts
  document.getElementById('providerFacts').innerHTML = `
    <li><span class="material-icons-round">location_on</span> <span>${_escHtml(mainListing.location)}, Deutschland</span></li>
    <li><span class="material-icons-round">category</span> <span>${_escHtml(mainListing.categoryLabel)}</span></li>
    <li><span class="material-icons-round">euro</span> <span>${_escHtml(mainListing.priceLabel)}</span></li>
    <li><span class="material-icons-round">event_available</span> <span>Verfügbar</span></li>
    <li><span class="material-icons-round">speed</span> <span>Antwortet innerhalb von 1 Std.</span></li>
  `;

  // Spec Tags
  document.getElementById('providerSpecTags').innerHTML = (mainListing.tags || []).map(t =>
    `<span class="provider-spec-tag">${_escHtml(t)}</span>`
  ).join('');

  // Listings tab
  document.getElementById('providerListings').innerHTML = providerListings.map(renderListingCard).join('');
  detectWideBannerCards(document.getElementById('providerListings'));

  // Reviews tab — load from API
  var providerDbId = pid;
  if (providerDbId && mainListing._fromDb) {
    document.getElementById('providerReviewsList').innerHTML = '<div style="text-align:center; padding:20px;"><div class="spinner"></div></div>';
    fetch(_apiUrl('provider/' + providerDbId) + '?_t=' + Date.now(), { credentials: 'same-origin', headers: _apiHeaders() })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var reviews = data.reviews || [];
        if (reviews.length === 0) {
          document.getElementById('providerReviewsList').innerHTML =
            '<div style="text-align:center; padding: 40px 20px; color: var(--text-light);">' +
              '<span class="material-icons-round" style="font-size: 48px; margin-bottom: 12px; opacity: 0.4;">rate_review</span>' +
              '<p style="font-size: 1.05rem; font-weight: 600; color: var(--dark); margin-bottom: 6px;">Noch keine Bewertungen</p>' +
              '<p style="font-size: 0.9rem;">Dieser Anbieter ist neu auf Eventbörse.</p>' +
            '</div>';
        } else {
          document.getElementById('providerReviewsList').innerHTML = reviews.map(function(r) {
            var avatar = r.avatar || ('https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(r.name || 'user'));
            var rating = parseInt(r.rating) || 0;
            var ltHtml = r.listingTitle ? '<div style="font-size:0.8rem;color:var(--text-light);margin-top:2px;">zu: ' + _escHtml(r.listingTitle) + '</div>' : '';
            var isOwnReview = currentUser && r.user_id && r.user_id === currentUser.id;
            var isProviderOwner = currentUser && pid && pid === currentUser.id;
            var canDelete = isOwnReview || isProviderOwner || (currentUser && currentUser.isAdmin);
            var deleteBtn = canDelete ? '<button onclick="deleteReview(' + r.id + ')" class="review-delete-btn" title="Bewertung löschen"><span class="material-icons-round">close</span></button>' : '';
            return '<div class="review-card">' +
              '<img src="' + _escHtml(avatar) + '" alt="' + _escHtml(r.name || 'Anonym') + '" class="review-avatar"' + (r.user_id ? ' style="cursor:pointer" onclick="navigateTo(\'provider\',' + r.user_id + ')"' : '') + ' />' +
              '<div class="review-content">' +
                '<div class="review-top"><strong' + (r.user_id ? ' style="cursor:pointer" onclick="navigateTo(\'provider\',' + r.user_id + ')"' : '') + '>' + _escHtml(r.name || 'Anonym') + '</strong>' + deleteBtn + '</div>' +
                '<div class="review-stars">' + _renderStars(rating) + '</div>' +
                ltHtml +
                '<p class="review-text">' + _escHtml(r.text || '') + '</p>' +
                '<span class="review-date">' + _escHtml(r.date || '') + '</span>' +
              '</div></div>';
          }).join('');
          // Update provider stats with real data
          var totalRating = reviews.reduce(function(s, r) { return s + (parseInt(r.rating) || 0); }, 0);
          var avgRating = Math.round(totalRating / reviews.length * 10) / 10;
          document.getElementById('providerRating').textContent = avgRating;
          document.getElementById('providerReviews').textContent = reviews.length;
        }
      })
      .catch(function() {});
  } else {
    document.getElementById('providerReviewsList').innerHTML =
      '<div style="text-align:center; padding: 40px 20px; color: var(--text-light);">' +
        '<span class="material-icons-round" style="font-size: 48px; margin-bottom: 12px; opacity: 0.4;">rate_review</span>' +
        '<p style="font-size: 1.05rem; font-weight: 600; color: var(--dark); margin-bottom: 6px;">Noch keine Bewertungen</p>' +
        '<p style="font-size: 0.9rem;">Dieser Anbieter ist neu auf Eventbörse.</p>' +
      '</div>';
  }

  // Action bar: show edit buttons for own profile, else message/follow
  var isOwnProviderProfile = currentUser && pid === currentUser.id;
  var actionBar = document.querySelector('.provider-action-bar');
  if (actionBar) {
    if (isOwnProviderProfile) {
      actionBar.innerHTML =
        '<button class="btn-primary" onclick="toggleProviderEditMode()">' +
          '<span class="material-icons-round">edit</span> Profil bearbeiten' +
        '</button>' +
        '<button class="btn-outline" onclick="shareProvider()">' +
          '<span class="material-icons-round">share</span> Teilen' +
        '</button>';
    } else {
      var adminBtns = '';
      if (currentUser && currentUser.isAdmin) {
        adminBtns = '<button class="btn-outline btn-sm btn-danger-outline" onclick="adminDeleteUser(' + pid + ')">' +
          '<span class="material-icons-round">person_remove</span> Nutzer löschen' +
        '</button>';
      }
      actionBar.innerHTML =
        '<button class="btn-primary" onclick="startChatWithProvider()">' +
          '<span class="material-icons-round">chat</span> Nachricht senden' +
        '</button>' +
        '<button class="btn-outline" onclick="toggleFollow()">' +
          '<span class="material-icons-round" id="followIcon">person_add</span> <span id="followLabel">Folgen</span>' +
        '</button>' +
        '<button class="btn-outline" onclick="shareProvider()">' +
          '<span class="material-icons-round">share</span> Teilen' +
        '</button>' + adminBtns;
    }
  }

  // Reset to first tab
  switchProviderTab(document.querySelector('.provider-tabs .tab'), 'inserate');
}

function switchProviderTab(btn, tab) {
  document.querySelectorAll('.provider-tabs .tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.provider-tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById('provider-tab-' + tab).classList.add('active');
}

/* ====== INLINE PROVIDER EDIT MODE ====== */
var _providerEditMode = false;

function toggleProviderEditMode() {
  _providerEditMode = !_providerEditMode;
  var page = document.getElementById('page-provider');
  if (!page) return;

  if (_providerEditMode) {
    page.classList.add('provider-edit-mode');
    _enterProviderEdit();
  } else {
    page.classList.remove('provider-edit-mode');
    _exitProviderEdit();
  }
}

function _enterProviderEdit() {
  var actionBar = document.querySelector('.provider-action-bar');
  if (actionBar) {
    actionBar.innerHTML =
      '<button class="btn-primary" onclick="toggleProviderEditMode()">' +
        '<span class="material-icons-round">check</span> Fertig' +
      '</button>' +
      '<button class="btn-outline" onclick="shareProvider()">' +
        '<span class="material-icons-round">share</span> Teilen' +
      '</button>';
  }

  // --- Avatar edit overlay ---
  var avatarImg = document.getElementById('providerAvatar');
  if (avatarImg && !avatarImg.parentElement.querySelector('.prov-edit-avatar-overlay')) {
    var overlay = document.createElement('div');
    overlay.className = 'prov-edit-avatar-overlay';
    overlay.innerHTML = '<span class="material-icons-round">photo_camera</span>';
    overlay.onclick = function() { document.getElementById('provEditAvatarInput').click(); };
    avatarImg.parentElement.style.position = 'relative';
    avatarImg.parentElement.appendChild(overlay);
    // Hidden file input
    if (!document.getElementById('provEditAvatarInput')) {
      var inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/*'; inp.id = 'provEditAvatarInput';
      inp.style.display = 'none';
      inp.onchange = function() { _provEditAvatar(this); };
      document.getElementById('page-provider').appendChild(inp);
    }
  }

  // --- Cover gallery edit overlay ---
  var coverGallery = document.getElementById('providerCoverGallery');
  if (coverGallery && !coverGallery.querySelector('.prov-edit-cover-overlay')) {
    var covOverlay = document.createElement('div');
    covOverlay.className = 'prov-edit-cover-overlay';
    covOverlay.innerHTML =
      '<button class="prov-edit-cover-btn" onclick="document.getElementById(\'provEditGalleryInput\').click()">' +
        '<span class="material-icons-round">add_photo_alternate</span> Bilder hinzufügen' +
      '</button>';
    coverGallery.appendChild(covOverlay);
    if (!document.getElementById('provEditGalleryInput')) {
      var ginp = document.createElement('input');
      ginp.type = 'file'; ginp.accept = 'image/*'; ginp.multiple = true;
      ginp.id = 'provEditGalleryInput'; ginp.style.display = 'none';
      ginp.onchange = function() { _provEditAddGalleryImages(this); };
      document.getElementById('page-provider').appendChild(ginp);
    }
  }

  // --- Name inline edit ---
  var nameEl = document.getElementById('providerName');
  if (nameEl && !nameEl.querySelector('.prov-edit-icon')) {
    nameEl.setAttribute('contenteditable', 'true');
    nameEl.classList.add('prov-editable');
    var editIcon = document.createElement('span');
    editIcon.className = 'material-icons-round prov-edit-icon';
    editIcon.textContent = 'edit';
    nameEl.appendChild(editIcon);
    nameEl.addEventListener('blur', _provSaveName);
    nameEl.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); nameEl.blur(); } });
  }

  // --- Tagline inline edit ---
  var tagEl = document.getElementById('providerTagline');
  if (tagEl && !tagEl.querySelector('.prov-edit-icon')) {
    tagEl.setAttribute('contenteditable', 'true');
    tagEl.classList.add('prov-editable');
    var tIcon = document.createElement('span');
    tIcon.className = 'material-icons-round prov-edit-icon';
    tIcon.textContent = 'edit';
    tagEl.appendChild(tIcon);
    tagEl.addEventListener('blur', _provSaveTagline);
    tagEl.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); tagEl.blur(); } });
  }

  // --- Bio inline edit ---
  var bioEl = document.getElementById('providerBio');
  if (bioEl) {
    bioEl.classList.remove('bio-collapsed');
    var bioToggle = bioEl.parentElement.querySelector('.bio-toggle');
    if (bioToggle) bioToggle.style.display = 'none';
    if (!bioEl.querySelector('.prov-edit-bio-area')) {
      var bioText = bioEl.innerText.trim();
      var editWrap = document.createElement('div');
      editWrap.className = 'prov-edit-bio-area';
      editWrap.innerHTML =
        '<textarea class="prov-edit-textarea" id="provEditBioText" rows="5" placeholder="Erzähle etwas über dich...">' +
          _escHtml(bioText) +
        '</textarea>' +
        '<button class="prov-edit-save-btn" onclick="_provSaveBio()">' +
          '<span class="material-icons-round">check</span> Speichern' +
        '</button>';
      bioEl.innerHTML = '';
      bioEl.appendChild(editWrap);
    }
  }

  // --- Portfolio edit mode: add remove/crop buttons on each image ---
  var portfolioEl = document.getElementById('providerPortfolio');
  if (portfolioEl) {
    var imgs = portfolioEl.querySelectorAll('img');
    imgs.forEach(function(img, i) {
      if (img.parentElement.classList.contains('prov-portfolio-edit-wrap')) return;
      var wrap = document.createElement('div');
      wrap.className = 'prov-portfolio-edit-wrap';
      wrap.setAttribute('data-url', img.src);
      img.parentNode.insertBefore(wrap, img);
      wrap.appendChild(img);
      // Remove button
      var removeBtn = document.createElement('button');
      removeBtn.className = 'prov-portfolio-remove';
      removeBtn.innerHTML = '<span class="material-icons-round">close</span>';
      removeBtn.onclick = function(e) { e.stopPropagation(); _provRemovePortfolioImage(wrap); };
      wrap.appendChild(removeBtn);
      // Crop button
      var cropBtn = document.createElement('button');
      cropBtn.className = 'prov-portfolio-crop';
      cropBtn.innerHTML = '<span class="material-icons-round">crop</span>';
      cropBtn.onclick = function(e) { e.stopPropagation(); _provCropPortfolioImage(wrap); };
      wrap.appendChild(cropBtn);
      // Remove old onclick
      img.removeAttribute('onclick');
      img.style.cursor = 'default';
    });
    // Add button for more images
    if (!portfolioEl.querySelector('.prov-portfolio-add')) {
      var addBtn = document.createElement('div');
      addBtn.className = 'prov-portfolio-add';
      addBtn.innerHTML = '<span class="material-icons-round">add_photo_alternate</span><span>Bild hinzufügen</span>';
      addBtn.onclick = function() { document.getElementById('provEditGalleryInput').click(); };
      portfolioEl.appendChild(addBtn);
    }
  }
}

function _exitProviderEdit() {
  var actionBar = document.querySelector('.provider-action-bar');
  if (actionBar) {
    actionBar.innerHTML =
      '<button class="btn-primary" onclick="toggleProviderEditMode()">' +
        '<span class="material-icons-round">edit</span> Profil bearbeiten' +
      '</button>' +
      '<button class="btn-outline" onclick="shareProvider()">' +
        '<span class="material-icons-round">share</span> Teilen' +
      '</button>';
  }
  // Remove avatar overlay
  var avatarOverlay = document.querySelector('.prov-edit-avatar-overlay');
  if (avatarOverlay) avatarOverlay.remove();

  // Remove cover overlay
  var covOverlay = document.querySelector('.prov-edit-cover-overlay');
  if (covOverlay) covOverlay.remove();

  // Restore name
  var nameEl = document.getElementById('providerName');
  if (nameEl) {
    nameEl.removeAttribute('contenteditable');
    nameEl.classList.remove('prov-editable');
    var icon = nameEl.querySelector('.prov-edit-icon');
    if (icon) icon.remove();
    nameEl.removeEventListener('blur', _provSaveName);
    // Clean text
    nameEl.textContent = nameEl.textContent.trim();
  }

  // Restore tagline
  var tagEl = document.getElementById('providerTagline');
  if (tagEl) {
    tagEl.removeAttribute('contenteditable');
    tagEl.classList.remove('prov-editable');
    var icon2 = tagEl.querySelector('.prov-edit-icon');
    if (icon2) icon2.remove();
    tagEl.removeEventListener('blur', _provSaveTagline);
    tagEl.textContent = tagEl.textContent.trim();
  }

  // Restore bio
  var bioEl = document.getElementById('providerBio');
  if (bioEl) {
    var bioArea = bioEl.querySelector('.prov-edit-bio-area');
    if (bioArea) {
      var bioText = currentUser ? (currentUser.bio || '') : '';
      bioEl.innerHTML = _sanitizeHtml(bioText);
    }
    var bioToggle = bioEl.parentElement.querySelector('.bio-toggle');
    if (bioToggle) bioToggle.style.display = '';
  }

  // Restore portfolio
  var portfolioEl = document.getElementById('providerPortfolio');
  if (portfolioEl) {
    // Remove add button
    var addBtn = portfolioEl.querySelector('.prov-portfolio-add');
    if (addBtn) addBtn.remove();
    // Unwrap images
    portfolioEl.querySelectorAll('.prov-portfolio-edit-wrap').forEach(function(wrap) {
      var img = wrap.querySelector('img');
      if (img) {
        img.style.cursor = 'pointer';
        var idx = Array.from(portfolioEl.querySelectorAll('.prov-portfolio-edit-wrap')).indexOf(wrap);
        img.setAttribute('onclick', 'openProviderLightbox(' + idx + ')');
        wrap.parentNode.insertBefore(img, wrap);
      }
      wrap.remove();
    });
  }

  // Reload to show fresh data
  if (currentUser) loadProvider(currentUser.id);
}

function _provEditAvatar(input) {
  if (!input.files || !input.files[0]) return;
  var file = input.files[0];
  if (file.size > 5 * 1024 * 1024) { showToast('Bild zu groß! Max. 5MB', 'error'); input.value = ''; return; }
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      _cropImg = img;
      _cropX = 0; _cropY = 0;
      document.getElementById('cropZoom').value = 1;
      openModal('avatarCropModal');
      setTimeout(function() { cropDraw(); cropBindEvents(); }, 50);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  input.value = '';
}

function _provSaveName() {
  var nameEl = document.getElementById('providerName');
  if (!nameEl || !currentUser) return;
  var newName = nameEl.textContent.replace(/edit$/i, '').trim();
  if (!newName || newName === currentUser.name) return;
  currentUser.name = newName;
  // Update nav avatar name
  var navName = document.querySelector('.dropdown-name');
  if (navName) navName.textContent = newName;
  fetch(_apiUrl('profile'), {
    method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
    body: JSON.stringify({ name: newName })
  }).then(function() { showToast('Name gespeichert!', 'check_circle'); })
    .catch(function() { showToast('Fehler beim Speichern', 'error'); });
}

function _provSaveTagline() {
  var tagEl = document.getElementById('providerTagline');
  if (!tagEl || !currentUser) return;
  var parts = tagEl.textContent.replace(/edit$/i, '').trim();
  // Tagline format: "Category · Location" — save as tagline
  currentUser.tagline = parts;
  fetch(_apiUrl('profile'), {
    method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
    body: JSON.stringify({ tagline: parts })
  }).then(function() { showToast('Tagline gespeichert!', 'check_circle'); })
    .catch(function() { showToast('Fehler beim Speichern', 'error'); });
}

function _provSaveBio() {
  var textarea = document.getElementById('provEditBioText');
  if (!textarea || !currentUser) return;
  var bioText = textarea.value.trim();
  currentUser.bio = bioText;
  fetch(_apiUrl('profile'), {
    method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
    body: JSON.stringify({ bio: bioText })
  }).then(function() { showToast('Bio gespeichert!', 'check_circle'); })
    .catch(function() { showToast('Fehler beim Speichern', 'error'); });
}

function _provRemovePortfolioImage(wrap) {
  var url = wrap.getAttribute('data-url');
  wrap.remove();
  // Update gallery in currentUser
  if (currentUser && currentUser.gallery) {
    currentUser.gallery = currentUser.gallery.filter(function(g) { return g !== url; });
    _provSaveGallery();
  }
  // Also update providerImages
  var idx = providerImages.indexOf(url);
  if (idx > -1) providerImages.splice(idx, 1);
  showToast('Bild entfernt', 'delete');
}

function _provCropPortfolioImage(wrap) {
  var img = wrap.querySelector('img');
  if (!img) return;
  var imgObj = new Image();
  imgObj.crossOrigin = 'anonymous';
  imgObj.onload = function() {
    _lcropImg = imgObj;
    _lcropX = 0; _lcropY = 0;
    _lcropEditTarget = wrap;
    _lcropMode = 'provider-portfolio';
    _lcropQueue = []; _lcropQueueIdx = 0;
    document.getElementById('lcropZoom').value = 1;
    openModal('listingCropModal');
    setTimeout(function() { lcropDraw(); lcropBindEvents(); }, 50);
  };
  imgObj.src = img.src;
}

function _provEditAddGalleryImages(input) {
  if (!input.files || input.files.length === 0) return;
  var maxTotal = 12;
  var currentCount = (currentUser && currentUser.gallery) ? currentUser.gallery.length : 0;
  var files = Array.from(input.files);
  if (currentCount + files.length > maxTotal) {
    showToast('Maximal ' + maxTotal + ' Galerie-Bilder erlaubt!', 'error');
    files = files.slice(0, maxTotal - currentCount);
  }
  input.value = '';
  // Open crop modal for each image
  _lcropMode = 'provider-portfolio';
  _lcropEditTarget = null;
  _lcropQueue = files;
  _lcropQueueIdx = 0;
  if (files.length > 0) _lcropProcessNext();
}

function _provSaveGallery() {
  if (!currentUser) return;
  var gallery = currentUser.gallery || [];
  fetch(_apiUrl('profile'), {
    method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
    body: JSON.stringify({ gallery: gallery })
  }).catch(function() { showToast('Fehler beim Speichern', 'error'); });
}

function _provAddPortfolioItem(url) {
  if (!currentUser) return;
  if (!currentUser.gallery) currentUser.gallery = [];
  currentUser.gallery.push(url);
  providerImages.push(url);
  _provSaveGallery();
  // Add to portfolio grid if in edit mode
  var portfolioEl = document.getElementById('providerPortfolio');
  if (portfolioEl && _providerEditMode) {
    var addBtn = portfolioEl.querySelector('.prov-portfolio-add');
    var wrap = document.createElement('div');
    wrap.className = 'prov-portfolio-edit-wrap';
    wrap.setAttribute('data-url', url);
    var img = document.createElement('img');
    img.src = url; img.alt = 'Portfolio'; img.loading = 'lazy';
    img.style.cursor = 'default';
    wrap.appendChild(img);
    var removeBtn = document.createElement('button');
    removeBtn.className = 'prov-portfolio-remove';
    removeBtn.innerHTML = '<span class="material-icons-round">close</span>';
    removeBtn.onclick = function(e) { e.stopPropagation(); _provRemovePortfolioImage(wrap); };
    wrap.appendChild(removeBtn);
    var cropBtn = document.createElement('button');
    cropBtn.className = 'prov-portfolio-crop';
    cropBtn.innerHTML = '<span class="material-icons-round">crop</span>';
    cropBtn.onclick = function(e) { e.stopPropagation(); _provCropPortfolioImage(wrap); };
    wrap.appendChild(cropBtn);
    portfolioEl.insertBefore(wrap, addBtn);
    detectWideBannerImg(img);
  }
}

/* ── Gallery Lightbox ── */
var _galleryLightboxImages = [];
var _galleryLightboxIndex = 0;

function openGalleryLightbox(index) {
  var gallery = document.getElementById('profileGalleryDisplay');
  _galleryLightboxImages = Array.from(gallery.querySelectorAll('img')).map(function(img) { return img.src; });
  if (_galleryLightboxImages.length === 0) return;
  _galleryLightboxIndex = index;
  document.getElementById('galleryLightboxImg').src = _galleryLightboxImages[_galleryLightboxIndex];
  document.getElementById('galleryLightboxCounter').textContent = (_galleryLightboxIndex + 1) + ' / ' + _galleryLightboxImages.length;
  document.getElementById('galleryLightbox').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeGalleryLightbox(e) {
  if (e && e.target && e.target.tagName === 'IMG') return;
  if (e && e.target && e.target.closest('.plb-nav')) return;
  document.getElementById('galleryLightbox').classList.remove('show');
  document.body.style.overflow = '';
}

function galleryLightboxNav(dir) {
  _galleryLightboxIndex = (_galleryLightboxIndex + dir + _galleryLightboxImages.length) % _galleryLightboxImages.length;
  document.getElementById('galleryLightboxImg').src = _galleryLightboxImages[_galleryLightboxIndex];
  document.getElementById('galleryLightboxCounter').textContent = (_galleryLightboxIndex + 1) + ' / ' + _galleryLightboxImages.length;
}

/* ── Cover Fullscreen Lightbox ── */
function openCoverLightbox() {
  const cover = document.getElementById('profileCover');
  const bg = cover.style.backgroundImage;
  const url = bg ? bg.replace(/url\(["']?/, '').replace(/["']?\)/, '') : '';
  if (!url) return;
  document.getElementById('coverLightboxImg').src = url;
  document.getElementById('coverLightbox').classList.add('show');
  document.body.style.overflow = 'hidden';
}
function closeCoverLightbox(e) {
  if (e && e.target && e.target.tagName === 'IMG') return;
  document.getElementById('coverLightbox').classList.remove('show');
  document.body.style.overflow = '';
}

/* --- Animated Gallery Rows --- */
let galleryRAFs = [];

function buildGalleryRows(images) {
  const gallery = document.getElementById('providerCoverGallery');
  const area = document.getElementById('pcgScrollArea');
  if (!area || !gallery) return;
  area.innerHTML = '';
  galleryRAFs.forEach(id => cancelAnimationFrame(id));
  galleryRAFs = [];

  var provPage = document.getElementById('page-provider');
  if (!images.length) {
    gallery.style.display = 'none';
    if (provPage) provPage.style.paddingTop = 'var(--nav-height)';
    return;
  }
  gallery.style.display = '';
  if (provPage) provPage.style.paddingTop = '0';

  // Row count: 1-9 → 1 row, 10-14 → 2 rows, 15+ → 3 rows
  const rowCount = images.length >= 15 ? 3 : images.length >= 10 ? 2 : 1;

  // Compute explicit pixel heights from container
  const gap = 6;
  const pad = 8; // padding top+bottom on scroll area
  const availH = gallery.offsetHeight - pad * 2;
  const totalGaps = (rowCount - 1) * gap;
  const thumbH = Math.floor((availH - totalGaps) / rowCount);
  const thumbW = Math.round(thumbH * 1.5); // landscape ratio
  const itemW = thumbW + gap;

  for (let r = 0; r < rowCount; r++) {
    const rowImages = [];
    for (let i = r; i < images.length; i += rowCount) {
      rowImages.push({ src: images[i], globalIdx: i });
    }
    if (!rowImages.length) continue;

    const wrap = document.createElement('div');
    wrap.className = 'pcg-row-wrap';
    wrap.style.height = thumbH + 'px';
    const row = document.createElement('div');
    row.className = 'pcg-row';
    row.style.height = thumbH + 'px';

    // Triple the set for seamless infinite scroll
    const tripled = [...rowImages, ...rowImages, ...rowImages];
    tripled.forEach(item => {
      const t = document.createElement('div');
      t.className = 'pcg-thumb';
      t.style.backgroundImage = `url(${item.src})`;
      t.style.width = thumbW + 'px';
      t.style.height = thumbH + 'px';
      // Detect portrait or extreme-wide images and adjust
      const img = new Image();
      img.onload = () => {
        const ratio = img.naturalWidth / img.naturalHeight;
        if (ratio < 1) {
          // Portrait: adjust width to image proportions
          const portraitW = Math.round(thumbH * ratio);
          t.style.width = portraitW + 'px';
          t.classList.add('pcg-contain');
        } else if (ratio > 2.2) {
          // Very wide banner: contain so full text/logo is visible
          t.classList.add('pcg-contain');
        }
      };
      img.src = item.src;
      t.addEventListener('click', () => openProviderLightbox(item.globalIdx));
      row.appendChild(t);
    });

    wrap.appendChild(row);
    area.appendChild(wrap);

    const segW = rowImages.length * itemW;
    const dir = r % 2 === 0 ? -1 : 1;
    const speed = 0.3 + r * 0.1;
    startRowAnimation(row, segW, dir, speed, wrap, itemW);
  }
}

function startRowAnimation(row, segW, dir, baseSpeed, wrap, itemW) {
  let pos = dir === -1 ? 0 : -segW;
  let velocity = baseSpeed * dir;
  let dragging = false;
  let dragStartX = 0;
  let dragStartPos = 0;
  let lastDragX = 0;
  let dragVelocity = 0;
  let lastTime = 0;

  function normalizePos() {
    // Keep pos within [-2*segW, 0] for seamless looping
    while (pos < -2 * segW) pos += segW;
    while (pos > 0) pos -= segW;
  }

  function tick(ts) {
    if (!lastTime) lastTime = ts;
    const dt = Math.min(ts - lastTime, 32); // Cap at ~30fps minimum
    lastTime = ts;

    if (!dragging) {
      // If we have residual drag velocity, blend it back to auto
      if (Math.abs(dragVelocity) > 0.1) {
        pos += dragVelocity * (dt / 16);
        // Decay drag velocity toward auto speed
        dragVelocity *= 0.95;
        if (Math.abs(dragVelocity) < Math.abs(velocity)) dragVelocity = 0;
      } else {
        dragVelocity = 0;
        pos += velocity * (dt / 16);
      }
    }

    normalizePos();
    row.style.transform = `translateX(${pos}px)`;
    const id = requestAnimationFrame(tick);
    galleryRAFs.push(id);
  }

  const id = requestAnimationFrame(tick);
  galleryRAFs.push(id);

  // --- Touch/Mouse drag ---
  const onStart = (x) => {
    dragging = true;
    dragStartX = x;
    dragStartPos = pos;
    lastDragX = x;
    dragVelocity = 0;
  };

  const onMove = (x) => {
    if (!dragging) return;
    const dx = x - dragStartX;
    pos = dragStartPos + dx;
    // Track velocity from last move
    dragVelocity = (x - lastDragX) * 0.5;
    lastDragX = x;
  };

  const onEnd = () => {
    if (!dragging) return;
    dragging = false;
    // dragVelocity carries momentum, will decay in tick()
  };

  wrap.addEventListener('mousedown', e => { e.preventDefault(); onStart(e.clientX); });
  wrap.addEventListener('mousemove', e => { if (dragging) { e.preventDefault(); onMove(e.clientX); } });
  wrap.addEventListener('mouseup', onEnd);
  wrap.addEventListener('mouseleave', onEnd);

  wrap.addEventListener('touchstart', e => { onStart(e.touches[0].clientX); }, { passive: true });
  wrap.addEventListener('touchmove', e => {
    if (dragging) {
      e.preventDefault();
      onMove(e.touches[0].clientX);
    }
  }, { passive: false });
  wrap.addEventListener('touchend', onEnd);
  wrap.addEventListener('touchcancel', onEnd);
}

function openProviderLightbox(index) {
  lightboxIndex = index;
  const lb = document.getElementById('providerLightbox');
  document.getElementById('plbImage').src = providerImages[lightboxIndex];
  document.getElementById('plbCounter').textContent = `${lightboxIndex + 1} / ${providerImages.length}`;
  lb.classList.add('show');
  document.body.style.overflow = 'hidden';
  document.body.style.touchAction = 'none';
}

function closeProviderLightbox(e) {
  document.getElementById('providerLightbox').classList.remove('show');
  document.body.style.overflow = '';
  document.body.style.touchAction = '';
}

function lightboxNav(dir) {
  lightboxIndex = (lightboxIndex + dir + providerImages.length) % providerImages.length;
  document.getElementById('plbImage').src = providerImages[lightboxIndex];
  document.getElementById('plbCounter').textContent = `${lightboxIndex + 1} / ${providerImages.length}`;
}

// Touch swipe for lightbox
(function() {
  var lb = document.getElementById('providerLightbox');
  if (!lb) return;
  var startX = 0, startY = 0, tracking = false;

  // Direct touch handlers for buttons (iOS ignores onclick with touch-action:none)
  var closeBtn = lb.querySelector('.plb-close');
  var prevBtn = lb.querySelector('.plb-prev');
  var nextBtn = lb.querySelector('.plb-next');
  if (closeBtn) closeBtn.addEventListener('touchend', function(e) {
    e.stopPropagation(); e.preventDefault(); closeProviderLightbox();
  });
  if (prevBtn) prevBtn.addEventListener('touchend', function(e) {
    e.stopPropagation(); e.preventDefault(); lightboxNav(-1);
  });
  if (nextBtn) nextBtn.addEventListener('touchend', function(e) {
    e.stopPropagation(); e.preventDefault(); lightboxNav(1);
  });

  lb.addEventListener('touchstart', function(e) {
    if (e.target.closest('button')) return;
    if (e.touches.length === 1) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
    }
  }, { passive: true });
  lb.addEventListener('touchmove', function(e) {
    if (tracking) e.preventDefault();
  }, { passive: false });
  lb.addEventListener('touchend', function(e) {
    if (!tracking) return;
    tracking = false;
    var endX = e.changedTouches[0].clientX;
    var endY = e.changedTouches[0].clientY;
    var dx = endX - startX;
    var dy = endY - startY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      lightboxNav(dx < 0 ? 1 : -1);
    } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      closeProviderLightbox();
    }
  });
  lb.addEventListener('wheel', function(e) { e.preventDefault(); }, { passive: false });
})();

function toggleFollow() {
  const icon = document.getElementById('followIcon');
  const label = document.getElementById('followLabel');
  const following = icon.textContent.trim() === 'person_add';
  icon.textContent = following ? 'person_remove' : 'person_add';
  label.textContent = following ? 'Entfolgen' : 'Folgen';
  showToast(following ? 'Du folgst jetzt diesem Anbieter!' : 'Du folgst nicht mehr.', following ? 'person_add' : 'person_remove');
}

function shareProvider() {
  if (navigator.share) {
    navigator.share({ title: document.getElementById('providerName').textContent, url: window.location.href });
  } else {
    navigator.clipboard.writeText(window.location.href);
    showToast('Link kopiert!', 'content_copy');
  }
}

// ========== CHAT / MESSAGES ==========
function updateMsgBadge(count) {
  var badge = document.getElementById('msgBadge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = 'flex';
  } else {
    badge.textContent = '';
    badge.style.display = 'none';
  }
}

// ──── Heartbeat: send alive signal every 30s ────
var _heartbeatTimer = null;
function _startHeartbeat() {
  _stopHeartbeat();
  _sendHeartbeat();
  _heartbeatTimer = setInterval(_sendHeartbeat, 30000);
  // Send offline beacon when leaving the page
  window.addEventListener('beforeunload', _sendOfflineBeacon);
}
function _stopHeartbeat() {
  if (_heartbeatTimer) { clearInterval(_heartbeatTimer); _heartbeatTimer = null; }
  window.removeEventListener('beforeunload', _sendOfflineBeacon);
}
function _sendHeartbeat() {
  if (!isLoggedIn) return;
  fetch(_apiUrl('heartbeat'), { method: 'POST', credentials: 'same-origin', headers: _apiHeaders() }).catch(function(){});
}
function _sendOfflineBeacon() {
  var url = _apiUrl('offline');
  if (_wpNonce) url += (url.indexOf('?') === -1 ? '?' : '&') + '_wpnonce=' + encodeURIComponent(_wpNonce);
  if (navigator.sendBeacon) {
    var blob = new Blob([JSON.stringify({})], { type: 'application/json' });
    navigator.sendBeacon(url, blob);
  }
}

// ──── Update chat header online/offline status ────
function _updateChatStatus(userId) {
  if (!userId) return;
  fetch(_apiUrl('user-status/' + userId), { credentials: 'same-origin', headers: _apiHeaders() })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var el = document.getElementById('chatStatus');
      if (!el) return;
      var on = data && data.online;
      el.textContent = on ? 'Online' : 'Offline';
      el.className = on ? 'chat-status online' : 'chat-status offline';
    })
    .catch(function(){});
}

// Live polling for new messages
var _chatPollTimer = null;
function _startChatPoll() {
  _stopChatPoll();
  _chatPollTimer = setInterval(function() {
    if (!currentChat || !currentChat.id) { _stopChatPoll(); return; }
    // Also refresh online status of chat partner
    if (currentChat.otherId) _updateChatStatus(currentChat.otherId);
    fetch(_apiUrl('conversations/' + currentChat.id + '/messages'), { credentials: 'same-origin', headers: _apiHeaders() })
      .then(function(r) { return r.json(); })
      .then(function(messages) {
        if (!currentChat) return;
        var oldCount = currentChat.messages ? currentChat.messages.length : 0;
        var newCount = (messages || []).length;
        // Always keep negotiation banner in sync
        var lastPendingOffer = null;
        (messages || []).forEach(function(msg) {
          if (msg.type === 'offer' && msg.status === 'pending' && msg.label !== 'Dein Angebot') {
            lastPendingOffer = msg;
          }
        });
        var banner = document.getElementById('negotiationBanner');
        if (lastPendingOffer) {
          document.getElementById('negDetails').textContent = lastPendingOffer.label + ': ' + lastPendingOffer.amount;
          banner.style.display = 'flex';
          banner.dataset.offerId = lastPendingOffer.id;
        } else {
          banner.style.display = 'none';
        }
        // Always refresh sidebar (online status dots)
        renderChatList();
        if (newCount <= oldCount) return;
        // New messages arrived — update
        currentChat.messages = messages;
        var msgContainer = document.getElementById('chatMessages');
        var wasAtBottom = msgContainer.scrollHeight - msgContainer.scrollTop - msgContainer.clientHeight < 80;
        msgContainer.innerHTML = (messages || []).map(function(msg) {
          if (msg.type === 'system') {
            return '<div class="msg msg-system">' + _escHtml(msg.text || msg.content || '') + '</div>';
          } else if (msg.type === 'offer') {
            var offerClass = msg.label === 'Dein Angebot' ? 'msg-offer offer-mine' : 'msg-offer offer-theirs';
            var actionBtn = '';
            if (msg.label === 'Dein Angebot' && msg.status === 'pending') {
              actionBtn = '<button class="btn-sm btn-decline offer-revoke-btn" onclick="withdrawOwnOffer(' + msg.id + ')">' +
                '<span class="material-icons-round">undo</span> Zur\u00fcckziehen</button>';
            } else if (msg.label !== 'Dein Angebot' && msg.status === 'accepted') {
              actionBtn = '<button class="btn-sm btn-decline offer-revoke-btn" onclick="revokeAcceptedOffer(' + msg.id + ')">' +
                '<span class="material-icons-round">undo</span> Doch ablehnen</button>';
            }
            return '<div class="msg ' + offerClass + '">' +
              '<div class="offer-label">' + _escHtml(msg.label || 'Angebot') + '</div>' +
              '<div class="offer-amount">' + _escHtml(msg.amount || msg.text || '') + '</div>' +
              '<div class="offer-status ' + (msg.status || 'pending') + '">' + _escHtml(msg.statusLabel || 'Gesendet') + '</div>' +
              actionBtn +
            '</div>';
          } else {
            var cls = msg.type === 'sent' ? 'msg-sent' : 'msg-received';
            var time = msg.time || '';
            return '<div class="msg ' + cls + '">' + _escHtml(msg.text || msg.content || '') + '<span class="msg-time">' + time + '</span></div>';
          }
        }).join('');
        if (wasAtBottom) setTimeout(function() { msgContainer.scrollTop = msgContainer.scrollHeight; }, 50);
      })
      .catch(function() {});
  }, 5000);
}
function _stopChatPoll() {
  if (_chatPollTimer) { clearInterval(_chatPollTimer); _chatPollTimer = null; }
}

function renderChatList() {
  const list = document.getElementById('chatList');
  if (!isLoggedIn) {
    // Show demo chats for non-logged-in users
    list.innerHTML = DEMO_CHATS.map(function(c) {
      return '<div class="chat-item" onclick="openDemoChat(' + c.id + ')">' +
        '<img src="' + _escHtml(c.avatar) + '" alt="' + _escHtml(c.name) + '" />' +
        '<div class="chat-item-info">' +
          '<strong>' + _escHtml(c.name) + '</strong>' +
          '<p>' + _escHtml(c.lastMsg) + '</p>' +
        '</div>' +
        '<div class="chat-item-meta">' +
          '<span>' + _escHtml(c.time) + '</span>' +
          (c.unread > 0 ? '<span class="chat-item-unread">' + c.unread + '</span>' : '') +
        '</div>' +
      '</div>';
    }).join('');
    return;
  }
  fetch(_apiUrl('conversations'), { credentials: 'same-origin', headers: _apiHeaders() })
    .then(function(r) { return r.json(); })
    .then(function(convos) {
      window._conversations = convos || [];
      if (convos.length === 0) {
        list.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-light);">Noch keine Nachrichten.</div>';
        return;
      }
      list.innerHTML = convos.map(function(c) {
        var avatar = c.other_photo || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';
        var name = c.other_name || 'Unbekannt';
        var lastMsg = c.last_message || '';
        if (lastMsg.length > 40) lastMsg = lastMsg.substring(0, 40) + '…';
        var time = c.updated_at ? new Date(c.updated_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '';
        var unread = parseInt(c.unread_count) || 0;
        var activeClass = currentChat && currentChat.id === c.id ? 'active' : '';
        return '<div class="chat-item ' + activeClass + '" onclick="openChat(' + c.id + ')">' +
          '<div class="chat-item-avatar-wrap">' +
            '<img src="' + _escHtml(avatar) + '" alt="' + _escHtml(name) + '" />' +
            '<span class="chat-item-dot ' + (c.online ? 'online' : 'offline') + '"></span>' +
          '</div>' +
          '<div class="chat-item-info">' +
            '<strong>' + _escHtml(name) + '</strong>' +
            '<p>' + _escHtml(lastMsg) + '</p>' +
          '</div>' +
          '<div class="chat-item-meta">' +
            '<span>' + _escHtml(time) + '</span>' +
            (unread > 0 ? '<span class="chat-item-unread">' + unread + '</span>' : '') +
          '</div>' +
        '</div>';
      }).join('');
    })
    .catch(function() {
      list.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-light);">Fehler beim Laden.</div>';
    });
}

function openChat(chatId) {
  fetch(_apiUrl('conversations/' + chatId + '/messages'), { credentials: 'same-origin', headers: _apiHeaders() })
    .then(function(r) { return r.json(); })
    .then(function(messages) {
      var convo = (window._conversations || []).find(function(c) { return c.id === chatId; });
      currentChat = {
        id: chatId,
        name: convo ? convo.other_name : 'Chat',
        avatar: convo ? (convo.other_photo || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default') : 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
        otherId: convo ? convo.otherId : null,
        online: false,
        messages: messages || []
      };

      // On mobile: hide sidebar, show chat
      if (window.innerWidth <= 768) {
        document.getElementById('chatSidebar').classList.add('hidden');
        document.getElementById('chatMain').classList.remove('hidden');
      }

      document.getElementById('chatEmpty').style.display = 'none';
      document.getElementById('chatActive').style.display = 'flex';

      document.getElementById('chatAvatar').src = currentChat.avatar;
      document.getElementById('chatName').textContent = currentChat.name;
      // Fetch real online status
      _updateChatStatus(currentChat.otherId);

      // Find last pending offer from the other user
      var lastPendingOffer = null;
      (messages || []).forEach(function(msg) {
        if (msg.type === 'offer' && msg.status === 'pending' && msg.label !== 'Dein Angebot') {
          lastPendingOffer = msg;
        }
      });

      // Show or hide negotiation banner
      var banner = document.getElementById('negotiationBanner');
      if (lastPendingOffer) {
        document.getElementById('negDetails').textContent = lastPendingOffer.label + ': ' + lastPendingOffer.amount;
        banner.style.display = 'flex';
        banner.dataset.offerId = lastPendingOffer.id;
      } else {
        banner.style.display = 'none';
      }

      // Render messages
      var msgContainer = document.getElementById('chatMessages');
      msgContainer.innerHTML = (messages || []).map(function(msg) {
        if (msg.type === 'system') {
          return '<div class="msg msg-system">' + _escHtml(msg.text || msg.content || '') + '</div>';
        } else if (msg.type === 'offer') {
          var offerClass = msg.label === 'Dein Angebot' ? 'msg-offer offer-mine' : 'msg-offer offer-theirs';
          var actionBtn = '';
          if (msg.label === 'Dein Angebot' && msg.status === 'pending') {
            actionBtn = '<button class="btn-sm btn-decline offer-revoke-btn" onclick="withdrawOwnOffer(' + msg.id + ')">' +
              '<span class="material-icons-round">undo</span> Zur\u00fcckziehen</button>';
          } else if (msg.label !== 'Dein Angebot' && msg.status === 'accepted') {
            actionBtn = '<button class="btn-sm btn-decline offer-revoke-btn" onclick="revokeAcceptedOffer(' + msg.id + ')">' +
              '<span class="material-icons-round">undo</span> Doch ablehnen</button>';
          }
          return '<div class="msg ' + offerClass + '">' +
            '<div class="offer-label">' + _escHtml(msg.label || 'Angebot') + '</div>' +
            '<div class="offer-amount">' + _escHtml(msg.amount || msg.text || '') + '</div>' +
            '<div class="offer-status ' + (msg.status || 'pending') + '">' + _escHtml(msg.statusLabel || 'Gesendet') + '</div>' +
            actionBtn +
          '</div>';
        } else {
          var cls = msg.type === 'sent' ? 'msg-sent' : 'msg-received';
          var time = msg.time || '';
          return '<div class="msg ' + cls + '">' + _escHtml(msg.text || msg.content || '') + '<span class="msg-time">' + time + '</span></div>';
        }
      }).join('');
      // Scroll to bottom after render
      setTimeout(function() { msgContainer.scrollTop = msgContainer.scrollHeight; }, 50);

      // Update chat list and start live polling
      renderChatList();
      _startChatPoll();
    })
    .catch(function() {
      showToast('Chat konnte nicht geladen werden', 'error');
    });
}

function closeChatView() {
  _stopChatPoll();
  if (window.innerWidth <= 768) {
    document.getElementById('chatSidebar').classList.remove('hidden');
    document.getElementById('chatMain').classList.add('hidden');
  }
}

function sendMessage() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text || !currentChat) return;

  // Check for blocked patterns (contact data)
  const hasBlockedContent = BLOCKED_PATTERNS.some(pattern => pattern.test(text));
  if (hasBlockedContent) {
    document.getElementById('commWarning').style.display = 'flex';
    return;
  }

  input.value = '';

  // Send to API
  fetch(_apiUrl('conversations/' + currentChat.id + '/messages'), {
    method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
    body: JSON.stringify({ content: text, type: 'message' })
  })
    .then(function(r) { return r.json(); })
    .then(function(msg) {
      // Append the sent message
      var time = msg.time || '';
      var msgContainer = document.getElementById('chatMessages');
      msgContainer.innerHTML += '<div class="msg msg-sent">' + _escHtml(msg.text || msg.content || text) + '<span class="msg-time">' + time + '</span></div>';
      setTimeout(function() { msgContainer.scrollTop = msgContainer.scrollHeight; }, 50);
    })
    .catch(function() {
      showToast('Nachricht senden fehlgeschlagen', 'error');
    });
}

function handleChatKeypress(e) {
  if (e.key === 'Enter') sendMessage();
}

function openDemoChat(chatId) {
  var chat = DEMO_CHATS.find(function(c) { return c.id === chatId; });
  if (!chat) return;

  // On mobile: hide sidebar, show chat
  if (window.innerWidth <= 768) {
    document.getElementById('chatSidebar').classList.add('hidden');
    document.getElementById('chatMain').classList.remove('hidden');
  }

  document.getElementById('chatEmpty').style.display = 'none';
  document.getElementById('chatActive').style.display = 'flex';

  document.getElementById('chatAvatar').src = chat.avatar;
  document.getElementById('chatName').textContent = chat.name;
  document.getElementById('chatStatus').textContent = chat.online ? 'Online' : 'Offline';
  document.getElementById('chatStatus').className = chat.online ? 'chat-status online' : 'chat-status offline';

  // Negotiation banner
  var negBanner = document.getElementById('negotiationBanner');
  if (chat.negotiation && chat.negotiation.active) {
    negBanner.style.display = 'flex';
    var details = 'Dein Angebot: ' + chat.negotiation.yourOffer + '€';
    if (chat.negotiation.counterOffer) details += ' · Gegenangebot: ' + chat.negotiation.counterOffer + '€';
    document.getElementById('negDetails').textContent = details;
  } else {
    negBanner.style.display = 'none';
  }

  // Render messages
  var msgContainer = document.getElementById('chatMessages');
  msgContainer.innerHTML = chat.messages.map(function(msg) {
    if (msg.type === 'system') {
      return '<div class="msg msg-system">' + _escHtml(msg.text) + '</div>';
    } else if (msg.type === 'offer') {
      return '<div class="msg msg-offer">' +
        '<div class="offer-label">' + _escHtml(msg.label) + '</div>' +
        '<div class="offer-amount">' + _escHtml(msg.amount) + '</div>' +
        '<div class="offer-status ' + _escHtml(msg.status || '') + '">' + _escHtml(msg.statusLabel) + '</div>' +
      '</div>';
    } else {
      var cls = msg.type === 'sent' ? 'msg-sent' : 'msg-received';
      return '<div class="msg ' + cls + '">' + _escHtml(msg.text) + '<span class="msg-time">' + _escHtml(msg.time) + '</span></div>';
    }
  }).join('');
  msgContainer.scrollTop = msgContainer.scrollHeight;

  // Mark active in list
  document.querySelectorAll('#chatList .chat-item').forEach(function(el) { el.classList.remove('active'); });
  var items = document.querySelectorAll('#chatList .chat-item');
  items.forEach(function(el) {
    if (el.getAttribute('onclick') === 'openDemoChat(' + chatId + ')') el.classList.add('active');
  });
}

function goToChatProfile() {
  if (currentChat && currentChat.otherId) {
    navigateTo('provider', currentChat.otherId);
  }
}

function startChat() {
  if (!isLoggedIn) {
    showToast('Bitte melde dich an, um eine Nachricht zu senden.', 'warning');
    openModal('loginModal');
    return;
  }
  if (!currentListing || !currentListing.providerId) return;
  // Create or find conversation with provider
  fetch(_apiUrl('conversations'), {
    method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
    body: JSON.stringify({ other_user_id: currentListing.providerId, listing_id: currentListing._dbId || currentListing.id })
  })
    .then(function(r) { return r.json(); })
    .then(function(convo) {
      navigateTo('messages');
      setTimeout(function() { openChat(convo.id); }, 200);
    })
    .catch(function() {
      showToast('Chat konnte nicht gestartet werden', 'error');
    });
}

function startChatWithProvider() {
  if (!isLoggedIn) {
    showToast('Bitte melde dich an, um eine Nachricht zu senden.', 'warning');
    openModal('loginModal');
    return;
  }
  var providerIdEl = document.getElementById('providerUserId');
  var providerId = providerIdEl ? parseInt(providerIdEl.value) : null;
  if (!providerId) {
    showToast('Anbieter nicht gefunden', 'error');
    return;
  }
  fetch(_apiUrl('conversations'), {
    method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
    body: JSON.stringify({ other_user_id: providerId })
  })
    .then(function(r) { return r.json(); })
    .then(function(convo) {
      navigateTo('messages');
      setTimeout(function() { openChat(convo.id); }, 200);
    })
    .catch(function() {
      showToast('Chat konnte nicht gestartet werden', 'error');
    });
}

// ========== NEGOTIATION ==========
function openNegotiation() {
  if (!currentListing) return;

  document.getElementById('negListingInfo').innerHTML =
    '<img src="' + _escHtml(currentListing.image || '') + '" alt="' + _escHtml(currentListing.title || '') + '" />' +
    '<div>' +
      '<strong>' + _escHtml(currentListing.title || '') + '</strong>' +
      '<span>' + _escHtml(currentListing.categoryLabel || '') + ' · ' + _escHtml(currentListing.location || '') + '</span>' +
    '</div>';
  document.getElementById('negOriginalPrice').value = currentListing.priceLabel;

  openModal('negotiationModal');
}

function submitNegotiation(e) {
  e.preventDefault();
  var rawPrice = document.getElementById('negOfferPrice').value;
  var price = _parseMoneyValue(rawPrice);
  if (price <= 0) { showToast('Bitte gültigen Betrag eingeben', 'error'); return; }
  const message = document.getElementById('negMessage').value;

  closeModal('negotiationModal');
  showToast(`Angebot über ${price}€ wurde gesendet!`, 'gavel');

  if (!isLoggedIn || !currentListing || !currentListing.providerId) return;

  // Create conversation and send offer
  fetch(_apiUrl('conversations'), {
    method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
    body: JSON.stringify({ other_user_id: currentListing.providerId, listing_id: currentListing._dbId || currentListing.id })
  })
    .then(function(r) { return r.json(); })
    .then(function(convo) {
      // Send offer message
      fetch(_apiUrl('conversations/' + convo.id + '/messages'), {
        method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
        body: JSON.stringify({ content: price + '€', type: 'offer', amount: parseFloat(price) || 0 })
      }).catch(function(){});
      // Send text message if any
      if (message) {
        fetch(_apiUrl('conversations/' + convo.id + '/messages'), {
          method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
          body: JSON.stringify({ content: message, type: 'message' })
        }).catch(function(){});
      }
    })
    .catch(function(){});
}

function openNegotiationInChat() {
  openModal('counterOfferModal');
}

function _parseMoneyValue(str) {
  var cleaned = (str || '').replace(/[^0-9.,]/g, '').replace(',', '.');
  var val = parseFloat(cleaned) || 0;
  return Math.max(0, Math.round(val * 100) / 100);
}

function moneyChipAdd(inputId, amount) {
  var el = document.getElementById(inputId);
  var current = _parseMoneyValue(el.value);
  var newVal = current + amount;
  el.value = newVal % 1 === 0 ? newVal.toString() : newVal.toFixed(2).replace('.', ',');
  el.focus();
}

function moneyInputFilter(el) {
  el.value = el.value.replace(/[^0-9.,]/g, '');
}

function openCounterOffer() {
  openModal('counterOfferModal');
}

function respondToOffer(msgId, status) {
  if (!currentChat) return;
  fetch(_apiUrl('messages/' + msgId + '/offer-status'), {
    method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
    body: JSON.stringify({ status: status })
  }).then(function(r) {
    if (!r.ok) throw new Error('fail');
    return r.json();
  }).then(function() {
    document.getElementById('negotiationBanner').style.display = 'none';
    showToast(status === 'accepted' ? 'Angebot angenommen!' : 'Angebot abgelehnt.', status === 'accepted' ? 'check_circle' : 'cancel');
    openChat(currentChat.id);
  }).catch(function() {
    showToast('Fehler beim Aktualisieren des Angebots', 'error');
  });
}

function acceptOffer() {
  var banner = document.getElementById('negotiationBanner');
  var offerId = banner.dataset.offerId;
  if (offerId) {
    respondToOffer(parseInt(offerId), 'accepted');
  }
}

function declineOffer() {
  var banner = document.getElementById('negotiationBanner');
  var offerId = banner.dataset.offerId;
  if (offerId) {
    respondToOffer(parseInt(offerId), 'declined');
  }
}

function revokeAcceptedOffer(msgId) {
  if (!confirm('Annahme wirklich widerrufen und Angebot ablehnen?')) return;
  respondToOffer(msgId, 'declined');
}

function withdrawOwnOffer(msgId) {
  if (!confirm('Angebot wirklich zurückziehen?')) return;
  respondToOffer(msgId, 'declined');
}

function submitCounterOffer(e) {
  e.preventDefault();
  var rawAmount = document.getElementById('counterOfferAmount').value;
  var amount = _parseMoneyValue(rawAmount);
  if (amount <= 0) { showToast('Bitte gültigen Betrag eingeben', 'error'); return; }
  const msg = document.getElementById('counterOfferMsg').value;

  closeModal('counterOfferModal');

  if (currentChat) {
    // Backend auto-declines all other pending offers when sending a new offer
    document.getElementById('negotiationBanner').style.display = 'none';

    fetch(_apiUrl('conversations/' + currentChat.id + '/messages'), {
      method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
      body: JSON.stringify({ content: amount + '€', type: 'offer', amount: parseFloat(amount) || 0 })
    }).then(function() {
      if (msg) {
        return fetch(_apiUrl('conversations/' + currentChat.id + '/messages'), {
          method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
          body: JSON.stringify({ content: msg, type: 'message' })
        });
      }
    }).then(function() {
      openChat(currentChat.id);
    }).catch(function(){});
  }

  showToast(`Gegenangebot über ${amount}€ gesendet!`, 'gavel');
}

// ========== PROFILAUFTRITT ==========
function renderDashboard() {
  if (!currentUser) return;

  // Close any open edit fields
  document.querySelectorAll('#page-profile .profile-edit-field').forEach(function(el) { el.style.display = 'none'; });

  // --- Cover ---
  var coverEl = document.getElementById('profileCover');
  if (currentUser.coverUrl) {
    coverEl.style.backgroundImage = 'url(' + currentUser.coverUrl + ')';
    var posY = currentUser.coverPosY != null ? currentUser.coverPosY : 50;
    coverEl.style.backgroundPosition = 'center ' + posY + '%';
  } else {
    coverEl.style.backgroundImage = 'none';
    coverEl.style.backgroundPosition = '';
  }

  // --- Avatar ---
  var avatarUrl = currentUser.photoUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(currentUser.name || 'user');
  document.getElementById('profileAvatar').src = avatarUrl;
  var navAvatar = document.querySelector('#avatarBtn img');
  if (navAvatar) navAvatar.src = avatarUrl;

  // --- Name, Company, Tagline, Location ---
  document.getElementById('profileDisplayName').textContent = currentUser.name || 'Dein Name';
  var companyEl = document.getElementById('profileDisplayCompany');
  if (currentUser.company) {
    companyEl.textContent = currentUser.company;
    companyEl.style.display = '';
  } else {
    companyEl.style.display = 'none';
  }
  document.getElementById('profileDisplayTagline').textContent = currentUser.tagline || 'Füge einen Slogan hinzu';

  // Input fields
  document.getElementById('profileName').value = currentUser.name || '';
  document.getElementById('profileCompany').value = currentUser.company || '';
  document.getElementById('profileTagline').value = currentUser.tagline || '';
  document.getElementById('profileLocation').value = currentUser.location || '';
  document.getElementById('profileBio').value = currentUser.bio || '';
  document.getElementById('profileEmail').value = currentUser.email || '';
  document.getElementById('profileRole').value = currentUser.role || '';

  // --- Role & Location badges ---
  var roleIcon = currentUser.isAdmin ? 'shield' : 'badge';
  var roleClass = currentUser.isAdmin ? ' admin-badge' : '';
  document.getElementById('profileDisplayRole').innerHTML =
    '<span class="material-icons-round">' + roleIcon + '</span> ' + _escHtml(currentUser.role || 'Mitglied');
  if (currentUser.isAdmin) document.getElementById('profileDisplayRole').classList.add('admin-badge');
  else document.getElementById('profileDisplayRole').classList.remove('admin-badge');
  document.getElementById('profileDisplayLocation').innerHTML =
    '<span class="material-icons-round">location_on</span> ' + _escHtml(currentUser.location || 'Nicht angegeben');

  // --- Bio ---
  var bioText = currentUser.bio || 'Erzähle potenziellen Kunden etwas über dich, deine Erfahrung und was dich besonders macht...';
  document.getElementById('profileDisplayBio').textContent = bioText;

  // --- Stats (echte Daten vom Backend) ---
  document.getElementById('profileStatViews').textContent = '–';
  document.getElementById('profileStatListings').textContent = '–';
  document.getElementById('profileStatBookings').textContent = '–';
  document.getElementById('profileStatRating').textContent = '–';

  fetch(_apiUrl('profile'), { credentials: 'same-origin', headers: _apiHeaders() })
    .then(function(r) { return r.json(); })
    .then(function(profile) {
      var s = profile.stats || {};
      document.getElementById('profileStatViews').textContent = (s.views || 0).toLocaleString('de-DE');
      document.getElementById('profileStatListings').textContent = s.listings || 0;
      document.getElementById('profileStatBookings').textContent = s.bookings || 0;
      if (s.rating) {
        document.getElementById('profileStatRating').innerHTML = s.rating.toFixed(1) + ' ' + _renderStars(s.rating);
      } else {
        document.getElementById('profileStatRating').textContent = '–';
      }

      // Reviews vom Backend
      var reviewsDisplay = document.getElementById('profileReviewsDisplay');
      if (profile.reviews && profile.reviews.length > 0) {
        reviewsDisplay.innerHTML = profile.reviews.slice(0, 4).map(function(r) {
          var isOwnReview = currentUser && r.user_id && r.user_id === currentUser.id;
          var isProfileOwner = true; // Profile page = own profile, always owner
          var canDelete = isOwnReview || isProfileOwner || (currentUser && currentUser.isAdmin);
          var deleteBtn = canDelete ? '<button onclick="deleteReview(' + r.id + ')" class="review-delete-btn" title="Bewertung löschen"><span class="material-icons-round">close</span></button>' : '';
          return '<div class="review-card">' +
            '<img src="https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(r.avatar || r.name) + '" alt="' + _escHtml(r.name || '') + '" class="review-avatar"' + (r.user_id ? ' style="cursor:pointer" onclick="navigateTo(\'provider\',' + r.user_id + ')"' : '') + ' />' +
            '<div class="review-content">' +
              '<div class="review-top"><strong' + (r.user_id ? ' style="cursor:pointer" onclick="navigateTo(\'provider\',' + r.user_id + ')"' : '') + '>' + _escHtml(r.name || '') + '</strong>' + deleteBtn + '</div>' +
              '<div class="review-stars">' + _renderStars(r.rating || 0) + '</div>' +
              '<p class="review-text">' + _escHtml(r.text || '') + '</p>' +
              '<span class="review-date">' + _escHtml(r.date || '') + '</span>' +
            '</div></div>';
        }).join('');
      }
    })
    .catch(function() { /* Fallback bleibt "–" */ });

  // --- Services (user listings vom Backend) ---
  var servicesGrid = document.getElementById('profileServicesGrid');
  var servicesEmpty = document.getElementById('profileServicesEmpty');
  servicesGrid.innerHTML = '';
  if (servicesEmpty) servicesEmpty.style.display = 'block';

  // --- Gallery ---
  var galleryDisplay = document.getElementById('profileGalleryDisplay');
  var galleryEmpty = document.getElementById('profileGalleryEmpty');
  if (currentUser.gallery && currentUser.gallery.length > 0) {
    if (galleryEmpty) galleryEmpty.style.display = 'none';
    var imgs = currentUser.gallery.map(function(src, idx) {
      return '<img src="' + src + '" alt="Galerie" loading="lazy" onclick="openGalleryLightbox(' + idx + ')" />';
    }).join('');
    galleryDisplay.innerHTML = imgs;
  } else {
    galleryDisplay.innerHTML = '';
    if (galleryEmpty) {
      galleryDisplay.appendChild(galleryEmpty);
      galleryEmpty.style.display = 'block';
    }
  }

  // --- Gallery edit preview ---
  var galleryPreview = document.getElementById('galleryPreview');
  if (galleryPreview) {
    galleryPreview.innerHTML = '';
    if (currentUser.gallery && currentUser.gallery.length > 0) {
      currentUser.gallery.forEach(function(src) {
        var div = document.createElement('div');
        div.className = 'upload-preview-item';
        div.setAttribute('data-url', src);
        div.innerHTML = '<img src="' + src + '" alt="Galerie" />' +
          '<div class="upload-preview-actions">' +
            '<button type="button" class="upload-act-crop" title="Zuschneiden"><span class="material-icons-round">crop</span></button>' +
            '<button type="button" class="upload-act-remove" title="Entfernen"><span class="material-icons-round">close</span></button>' +
          '</div>';
        // Crop button
        div.querySelector('.upload-act-crop').onclick = function(e) {
          e.stopPropagation();
          var imgSrc = div.querySelector('img').src;
          var img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = function() {
            _lcropImg = img;
            _lcropX = 0; _lcropY = 0;
            _lcropEditTarget = div;
            _lcropMode = 'gallery';
            _lcropQueue = []; _lcropQueueIdx = 0;
            document.getElementById('lcropZoom').value = 1;
            openModal('listingCropModal');
            setTimeout(function() { lcropDraw(); lcropBindEvents(); }, 50);
          };
          img.src = imgSrc;
        };
        // Remove button
        div.querySelector('.upload-act-remove').onclick = function(e) {
          e.stopPropagation();
          div.remove();
          updateGalleryCount();
        };
        galleryPreview.appendChild(div);
      });
    }
  }

  setupDragDrop();
}

// Inline profile editing
function toggleProfileEdit(field) {
  var editEl = document.getElementById('edit' + field.charAt(0).toUpperCase() + field.slice(1));
  if (!editEl) return;
  var isVisible = editEl.style.display !== 'none';
  editEl.style.display = isVisible ? 'none' : 'flex';
  if (!isVisible && field === 'bio') {
    editEl.style.display = 'block';
  }
}

function cancelFieldInline(field) {
  var editEl = document.getElementById('edit' + field.charAt(0).toUpperCase() + field.slice(1));
  if (editEl) editEl.style.display = 'none';
  // Restore original values
  if (currentUser) {
    if (field === 'name') {
      document.getElementById('profileName').value = currentUser.name || '';
      document.getElementById('profileCompany').value = currentUser.company || '';
    }
    if (field === 'tagline') {
      document.getElementById('profileTagline').value = currentUser.tagline || '';
      document.getElementById('profileLocation').value = currentUser.location || '';
    }
    if (field === 'bio') document.getElementById('profileBio').value = currentUser.bio || '';
  }
}

function saveFieldInline(field) {
  if (!currentUser) return;
  var payload = {};
  switch (field) {
    case 'name':
      currentUser.name = document.getElementById('profileName').value.trim();
      currentUser.company = document.getElementById('profileCompany').value.trim();
      payload.name = currentUser.name;
      payload.company = currentUser.company;
      break;
    case 'tagline':
      var locVal = document.getElementById('profileLocation').value.trim();
      if (locVal && !GERMAN_CITIES.find(function(c) { return c.name.toLowerCase() === locVal.toLowerCase(); })) {
        showToast('Bitte wähle eine gültige Stadt aus der Liste', 'warning');
        return;
      }
      currentUser.tagline = document.getElementById('profileTagline').value.trim();
      currentUser.location = locVal;
      payload.tagline = currentUser.tagline;
      payload.location = currentUser.location;
      break;
    case 'bio':
      currentUser.bio = document.getElementById('profileBio').value.trim();
      payload.bio = currentUser.bio;
      break;
    case 'gallery':
      var galleryItems = document.querySelectorAll('#galleryPreview .upload-preview-item');
      currentUser.gallery = Array.from(galleryItems).map(function(item) {
        return item.getAttribute('data-url') || item.querySelector('img').src;
      });
      payload.gallery = currentUser.gallery;
      break;
    case 'services':
      break;
  }
  var editEl = document.getElementById('edit' + field.charAt(0).toUpperCase() + field.slice(1));
  if (editEl) editEl.style.display = 'none';
  renderDashboard();

  // An Backend persistieren
  fetch(_apiUrl('profile'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: _apiHeaders(),
    body: JSON.stringify(payload)
  }).then(function() {
    showToast('Gespeichert! ✅', 'check_circle');
  }).catch(function() {
    showToast('Speichern fehlgeschlagen', 'error');
  });
}

// ========== CREATE LISTING ==========
function updateCreateFormForRole() {
  var title = document.querySelector('#page-create-listing .create-title');
  var subtitle = document.querySelector('#page-create-listing .create-subtitle');
  var titleInput = document.getElementById('createTitle');
  var titleLabel = titleInput ? titleInput.closest('.form-group').querySelector('label') : null;
  var descTextarea = document.getElementById('createDescription');
  var descLabel = descTextarea ? descTextarea.closest('.form-group').querySelector('label') : null;
  var priceInput = document.getElementById('createPrice');
  var priceLabel = priceInput ? priceInput.closest('.form-group').querySelector('label') : null;
  var submitBtn = document.querySelector('#step3 .btn-primary');
  var step3Title = document.querySelector('#step3 h2');
  var uploadZoneH3 = document.querySelector('#uploadZone h3');
  var uploadZoneP = document.querySelector('#uploadZone > p:not(.upload-hint)');

  if (isEventPlaner()) {
    if (title) title.textContent = 'Event erstellen';
    if (subtitle) subtitle.textContent = 'Beschreibe dein Event und finde die passenden Dienstleister.';
    if (titleLabel) titleLabel.textContent = 'Name deines Events';
    if (titleInput) titleInput.placeholder = 'z.B. Hochzeit von Anna & Tom, Firmen-Sommerfest...';
    if (descLabel) descLabel.textContent = 'Event-Beschreibung';
    if (descTextarea) descTextarea.placeholder = 'Beschreibe dein Event detailliert \u2013 was planst du, wie viele G\u00e4ste, welche Atmosph\u00e4re...';
    if (priceLabel) priceLabel.textContent = 'Budget (\u20ac)';
    if (priceInput) priceInput.placeholder = 'z.B. 5000';
    if (step3Title) step3Title.textContent = 'Fotos & Inspiration';
    if (uploadZoneH3) uploadZoneH3.textContent = 'Event-Bilder hochladen';
    if (uploadZoneP) uploadZoneP.textContent = 'Lade Bilder oder Inspirationen f\u00fcr dein Event hoch';
    if (submitBtn) submitBtn.innerHTML = '<span class="material-icons-round">event_available</span> Event ver\u00f6ffentlichen';
  } else {
    if (title) title.textContent = 'Inserat erstellen';
    if (subtitle) subtitle.textContent = 'Pr\u00e4sentiere deinen Service und erreiche tausende potenzielle Kunden.';
    if (titleLabel) titleLabel.textContent = 'Titel deines Services';
    if (titleInput) titleInput.placeholder = 'z.B. Professionelle DJ-Services f\u00fcr jedes Event';
    if (descLabel) descLabel.textContent = 'Beschreibung';
    if (descTextarea) descTextarea.placeholder = 'Beschreibe deinen Service detailliert...';
    if (priceLabel) priceLabel.textContent = 'Preis ab (\u20ac)';
    if (priceInput) priceInput.placeholder = 'z.B. 450';
    if (step3Title) step3Title.textContent = 'Fotos & Galerie';
    if (uploadZoneH3) uploadZoneH3.textContent = 'Bilder hochladen';
    if (uploadZoneP) uploadZoneP.textContent = 'Ziehe Bilder hierher oder klicke zum Ausw\u00e4hlen';
    if (submitBtn) submitBtn.innerHTML = '<span class="material-icons-round">publish</span> Inserat ver\u00f6ffentlichen';
  }

}

// ========== SETTINGS ==========
function loadSettings() {
  if (!currentUser) return;
  var parts = (currentUser.name || '').split(' ');
  document.getElementById('settingsFirstName').value = parts[0] || '';
  document.getElementById('settingsLastName').value = parts.slice(1).join(' ') || '';
  document.getElementById('settingsEmail').value = currentUser.email || '';
  document.getElementById('settingsPhone').value = currentUser.phone || '';
  var companyField = document.getElementById('settingsCompanyField');
  var companyInput = document.getElementById('settingsCompany');
  if (companyField && companyInput) {
    if (currentUser.role === 'Dienstleister') {
      companyField.style.display = '';
      companyInput.value = currentUser.company || '';
    } else {
      companyField.style.display = 'none';
    }
  }
  document.getElementById('settingsRoleDisplay').textContent = currentUser.role || 'Mitglied';
  document.getElementById('settingsSinceDisplay').textContent = currentUser.since || '–';

  // Admin-Button entfernt – Admins werden nur noch manuell vergeben
  var existingAdminBtn = document.getElementById('settingsMakeAdminBtn');
  if (existingAdminBtn) existingAdminBtn.remove();

  // Clear password fields
  document.getElementById('settingsCurrentPw').value = '';
  document.getElementById('settingsNewPw').value = '';
  document.getElementById('settingsConfirmPw').value = '';
  renderPasskeySettings(null);
  refreshPasskeySettings();
}

function renderPasskeySettings(data) {
  var statusEl = document.getElementById('settingsPasskeyStatus');
  var countEl = document.getElementById('settingsPasskeyCount');
  var listEl = document.getElementById('settingsPasskeyList');
  var noteEl = document.getElementById('settingsPasskeySupportNote');
  var addBtn = document.getElementById('settingsAddPasskeyBtn');
  if (!statusEl || !countEl || !listEl || !noteEl || !addBtn) return;

  if (!isWebAuthnAvailable()) {
    addBtn.disabled = true;
    noteEl.classList.add('is-warning');
    noteEl.textContent = 'Auf diesem Gerät können keine Passkeys eingerichtet werden. Der Login per E-Mail und zusätzlichem Code bleibt möglich.';
  } else {
    addBtn.disabled = false;
    noteEl.classList.remove('is-warning');
    noteEl.textContent = 'Dieses Gerät unterstützt Passkeys. Du kannst zusätzliche biometrische Anmeldungen direkt hier verwalten.';
  }

  if (!data) {
    statusEl.textContent = currentUser && currentUser.hasPasskey ? 'Aktiv' : 'Noch nicht eingerichtet';
    statusEl.className = 'settings-info-value ' + ((currentUser && currentUser.hasPasskey) ? 'settings-status-passkey-on' : 'settings-status-passkey-off');
    countEl.textContent = currentUser && currentUser.passkeyCount ? String(currentUser.passkeyCount) : '0';
    listEl.innerHTML = '<div class="settings-passkey-empty">Passkeys werden geladen …</div>';
    return;
  }

  var credentials = Array.isArray(data.credentials) ? data.credentials : [];
  var hasPasskey = !!data.hasPasskey;
  var passkeyCount = typeof data.passkeyCount === 'number' ? data.passkeyCount : credentials.length;

  if (currentUser) {
    currentUser.hasPasskey = hasPasskey;
    currentUser.passkeyCount = passkeyCount;
  }

  statusEl.textContent = hasPasskey ? 'Aktiv' : 'Noch nicht eingerichtet';
  statusEl.className = 'settings-info-value ' + (hasPasskey ? 'settings-status-passkey-on' : 'settings-status-passkey-off');
  countEl.textContent = String(passkeyCount || 0);

  if (!credentials.length) {
    listEl.innerHTML = '<div class="settings-passkey-empty">Noch kein Passkey gespeichert. Richte hier Face ID, Fingerabdruck oder Geräte-PIN als Anmeldung ein.</div>';
    return;
  }

  listEl.innerHTML = credentials.map(function(credential) {
    var title = _escHtml(credential.label || 'Passkey');
    var created = credential.created_at ? _escHtml(credential.created_at) : 'unbekannt';
    var lastUsed = credential.last_used_at ? _escHtml(credential.last_used_at) : 'noch nicht verwendet';
    var transports = Array.isArray(credential.transports) && credential.transports.length ? _escHtml(credential.transports.join(', ')) : 'nicht angegeben';
    return '' +
      '<div class="settings-passkey-item">' +
        '<div class="settings-passkey-item-main">' +
          '<div class="settings-passkey-item-title">' + title + '</div>' +
          '<div class="settings-passkey-item-meta">Hinzugefügt: ' + created + '<br>Zuletzt verwendet: ' + lastUsed + '<br>Transport: ' + transports + '</div>' +
        '</div>' +
        '<button type="button" class="btn-outline btn-sm settings-passkey-remove" onclick="removePasskeyFromSettings(\'' + String(credential.credential_id).replace(/'/g, '\\&#39;') + '\', this)">Entfernen</button>' +
      '</div>';
  }).join('');
}

function refreshPasskeySettings() {
  if (!currentUser) return Promise.resolve();
  return loadPasskeyCredentials()
    .then(function(data) {
      renderPasskeySettings(data);
      return data;
    })
    .catch(function(err) {
      var listEl = document.getElementById('settingsPasskeyList');
      if (listEl) {
        listEl.innerHTML = '<div class="settings-passkey-empty">Passkeys konnten nicht geladen werden.</div>';
      }
      showToast(err && err.message ? err.message : 'Passkeys konnten nicht geladen werden.', 'error');
    });
}

async function addPasskeyFromSettings(btn) {
  try {
    if (btn) _setBtnLoading(btn, true);
    await registerPasskey('Zusätzliches Gerät');
    var storageKey = _passkeyPromptStorageKey();
    if (storageKey) localStorage.removeItem(storageKey);
    await refreshPasskeySettings();
    showToast('Neuer Passkey hinzugefügt', 'fingerprint');
  } catch (err) {
    showToast(err && err.message ? err.message : 'Passkey konnte nicht hinzugefügt werden.', 'error');
  } finally {
    if (btn) _setBtnLoading(btn, false);
  }
}

async function removePasskeyFromSettings(credentialId, btn) {
  if (!credentialId) return;
  if (!confirm('Diesen Passkey wirklich entfernen?')) return;

  try {
    if (btn) _setBtnLoading(btn, true);
    await deletePasskeyCredential(credentialId);
    await refreshPasskeySettings();
    showToast('Passkey entfernt', 'delete');
  } catch (err) {
    showToast(err && err.message ? err.message : 'Passkey konnte nicht entfernt werden.', 'error');
  } finally {
    if (btn) _setBtnLoading(btn, false);
  }
}

function toggleSettingsPw(inputId, btn) {
  var inp = document.getElementById(inputId);
  var icon = btn.querySelector('.material-icons-round');
  if (inp.type === 'password') {
    inp.type = 'text';
    icon.textContent = 'visibility';
  } else {
    inp.type = 'password';
    icon.textContent = 'visibility_off';
  }
}

function savePersonalSettings() {
  if (!currentUser) return;
  var firstName = document.getElementById('settingsFirstName').value.trim();
  var lastName = document.getElementById('settingsLastName').value.trim();
  var email = document.getElementById('settingsEmail').value.trim();
  var phone = document.getElementById('settingsPhone').value.trim();
  var companyInput = document.getElementById('settingsCompany');
  var company = companyInput ? companyInput.value.trim() : '';

  if (!firstName) { showToast('Vorname ist erforderlich', 'warning'); return; }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast('Bitte gib eine gültige E-Mail ein', 'warning'); return; }

  fetch(_apiUrl('settings'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: _apiHeaders(),
    body: JSON.stringify({ first_name: firstName, last_name: lastName, email: email, phone: phone, company: company })
  })
    .then(function(r) { return r.json().then(function(d) { return { ok: r.ok, data: d }; }); })
    .then(function(res) {
      if (!res.ok) { showToast(res.data.message || 'Fehler beim Speichern', 'error'); return; }
      currentUser.name = (firstName + ' ' + lastName).trim();
      currentUser.email = email;
      currentUser.phone = phone;
      currentUser.company = company;
      showToast('Daten gespeichert ✓', 'success');
    })
    .catch(function() { showToast('Netzwerkfehler', 'error'); });
}

function savePasswordSettings() {
  var current = document.getElementById('settingsCurrentPw').value;
  var newPw = document.getElementById('settingsNewPw').value;
  var confirm = document.getElementById('settingsConfirmPw').value;

  if (!current) { showToast('Aktuelles Passwort eingeben', 'warning'); return; }
  if (newPw.length < 8) { showToast('Neues Passwort muss mind. 8 Zeichen haben', 'warning'); return; }
  if (newPw !== confirm) { showToast('Passwörter stimmen nicht überein', 'warning'); return; }

  fetch(_apiUrl('settings/password'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: _apiHeaders(),
    body: JSON.stringify({ current_password: current, new_password: newPw })
  })
    .then(function(r) { return r.json().then(function(d) { return { ok: r.ok, data: d }; }); })
    .then(function(res) {
      if (!res.ok) { showToast(res.data.message || 'Fehler beim Ändern', 'error'); return; }
      document.getElementById('settingsCurrentPw').value = '';
      document.getElementById('settingsNewPw').value = '';
      document.getElementById('settingsConfirmPw').value = '';
      showToast('Passwort geändert ✓', 'success');
    })
    .catch(function() { showToast('Netzwerkfehler', 'error'); });
}

function confirmDeleteAccount() {
  var password = prompt('Bitte gib dein Passwort ein, um dein Konto endgültig zu löschen:');
  if (!password) return;
  if (!confirm('Wirklich? Alle deine Daten, Inserate und Nachrichten werden unwiderruflich gelöscht.')) return;

  fetch(_apiUrl('settings/delete-account'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: _apiHeaders(),
    body: JSON.stringify({ password: password })
  })
    .then(function(r) { return r.json().then(function(d) { return { ok: r.ok, data: d }; }); })
    .then(function(res) {
      if (!res.ok) { showToast(res.data.message || 'Fehler', 'error'); return; }
      showToast('Konto gelöscht', 'success');
      setTimeout(function() { window.location.reload(); }, 1500);
    })
    .catch(function() { showToast('Netzwerkfehler', 'error'); });
}

function nextStep(step) {
  document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
  document.getElementById('step' + step).classList.add('active');
  window.scrollTo(0, 0);
}

function toggleFeatureTag(btn) {
  btn.classList.toggle('selected');
}

function addCustomFeature() {
  var input = document.getElementById('customFeatureInput');
  var text = input.value.trim();
  if (!text) return;
  var grid = document.getElementById('createFeatureTags');
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'feature-tag selected';
  btn.onclick = function() { toggleFeatureTag(btn); };
  btn.textContent = '✏️ ' + text;
  grid.appendChild(btn);
  input.value = '';
  showToast('Leistung hinzugefügt!', 'add_circle');
}

// ========== LEISTUNGEN SEARCH ==========
const ALL_FEATURES = [
  // Musik & DJ
  '🎵 Professionelle Ausrüstung','🎧 Wunschmusik-Absprache','🔊 Sound-System','🎶 Live-Band',
  '🎹 Pianist','🎷 Saxophonist','🎸 Gitarrist','🎻 Streichquartett','🥁 Schlagzeuger',
  '🎤 Sänger / Sängerin','🎙️ DJ-Set','🎚️ Mischpult & Equipment','📀 Playlist-Erstellung',
  '🪗 Akkordeon-Spieler','🎺 Trompeter','🪕 Banjo-Spieler',
  // Moderation & Entertainment
  '🎤 Moderation','🎭 Showeinlage','🤹 Zauberer / Magier','🎪 Bühne & Technik',
  '🎬 Unterhaltungsprogramm','🎯 Spiele & Aktivitäten','🃏 Karikaturist',
  '🎰 Casino-Tische','🧩 Quiz & Rätsel','🗣️ Comedian / Stand-Up','💃 Tanzshow',
  '🪩 Discokugel & Partybeleuchtung','🎊 Konfetti & Effekte','🫧 Seifenblasen-Show',
  '🤖 Roboter-Show','🧑‍🎤 Tribute-Band','🎠 Karussell / Fahrgeschäfte',
  // Foto & Video
  '📸 Foto-Dokumentation','🎥 Video-Produktion','📷 Fotograf','🎞️ Drohnenaufnahmen',
  '📹 Livestream','🖼️ Sofortbild-Station','📽️ Beamer & Leinwand','🤳 Selfie-Spiegel',
  '📓 Fotoalbum / Fotobuch','🎞️ After-Movie','🖨️ Sofortdruck vor Ort',
  // Licht & Technik
  '💡 Lichtanlage inklusive','✨ Spezialeffekte','🔥 Feuerwerkshow','🎆 Pyrotechnik',
  '💨 Nebelmaschine','🌈 LED-Beleuchtung','🔦 Spotlights & Moving Heads',
  '📺 LED-Wand / Bildschirme','🪞 Spiegelkugel','💜 UV-Schwarzlicht',
  '🕯️ Kerzen & Windlichter','🧊 Trockeneis-Effekte',
  // Catering & Essen
  '🍽️ Menü-Auswahl','🥂 Getränke-Service','👨‍🍳 Live-Cooking','🎂 Torte & Desserts',
  '🍕 Pizza-Station','🍣 Sushi-Bar','🥩 BBQ / Grill-Station','🍦 Eis-Bar',
  '🧁 Cupcake-Bar','🍿 Popcorn-Maschine','🥤 Cocktail-Bar','🍺 Bier-Zapfanlage',
  '☕ Kaffee-Bar / Barista','🫕 Fondue-Station','🧀 Käse-Platte',
  '🍫 Schokoladen-Brunnen','🥗 Veganes / Vegetarisches Menü','🌮 Food-Truck',
  '🍰 Candy-Bar','🧃 Alkoholfreie Cocktails','🥐 Brunch-Buffet',
  '🫖 Tee-Zeremonie','🍷 Wein-Verkostung','🥨 Brezel-Bar',
  // Blumen & Dekoration
  '🌸 Blumen-Arrangement','🎈 Dekoration','🌺 Brautstrauß','🕊️ Tauben',
  '🏵️ Tischdekoration','🎀 Stuhlhussen & Schleifen','🪴 Pflanzen-Deko',
  '🎋 Bambus-Deko','🌿 Greenery / Eukalyptus','🌹 Rosenbogen',
  '🪷 Lichterketten & Lampions','🎍 Themendekoration','🧵 Wandbehänge / Drapes',
  // Planung & Organisation
  '📋 Individuelle Planung','🏠 Location-Beratung','🗓️ Termin-Flexibilität',
  '⏰ Kurzfristig buchbar','📜 Kostenvoranschlag','🤝 Persönliche Beratung',
  '📑 Ablaufplanung','🗺️ Sitzplan-Erstellung','📊 Budget-Beratung',
  '📝 Verträge & Dokumente','🔄 Koordination aller Dienstleister',
  '🏗️ Komplett-Planung','📆 Save-the-Date Karten',
  // Transport & Logistik
  '🚗 Anfahrt inklusive','🔧 Auf- & Abbau','🚐 Shuttle-Service',
  '🏎️ Limousinen-Service','🐴 Kutsche','🚌 Bus-Transfer',
  '🚁 Helikopter-Transfer','🛶 Boots-Transfer','🧳 Equipment-Transport',
  // Beauty & Styling
  '👗 Styling & Outfit','💄 Make-up & Frisur','💅 Nageldesign',
  '👰 Braut-Styling','🪮 Barber-Service','🧖 Wellness-Bereich',
  '💆 Massage-Station','🎨 Bodypainting','✂️ Friseur vor Ort',
  // Kinder & Familie
  '🧒 Kinder-Programm','🎠 Hüpfburg','🎨 Kinderschminken',
  '🧸 Kinderbetreuung','🎪 Puppet-Show','🎈 Ballontiere',
  '🦸 Superhelden-Auftritt','👸 Prinzessinnen-Besuch','🧙 Zauberer für Kinder',
  // Sonstiges
  '🎁 Gastgeschenke','🌍 Mehrsprachig','♿ Barrierefreiheit',
  '🐾 Haustierfreundlich','🛡️ Security / Sicherheit','🅿️ Parkplatz-Service',
  '🧹 Reinigung danach','🏕️ Outdoor-Ausstattung','☂️ Regen-Plan B',
  '📢 Einlass-Management','🎟️ Ticket-System','🪑 Mobiliar-Verleih',
  '🍾 Champagner-Empfang','🔐 Garderobe','🚻 Mobile Toiletten',
  '📍 Wegweiser / Beschilderung','🧊 Kühlwagen','🔌 Stromversorgung',
  '🌡️ Heizstrahler / Klimaanlage','🎗️ Wohltätigkeits-Integration',
  '📖 Gästebuch','🖊️ Kalligraphie','💐 Trockenblumen-Deko',
  '🪄 Sand-Zeremonie','🕺 Tanzlehrer / Erster Tanz','🎼 Hochzeitslied',
  '🧲 Teambuilding-Aktivitäten','🏆 Award-Zeremonien','🎓 Abschlussfeier-Package',
  '📣 Social-Media Betreuung','🖥️ Technik-Support','🌐 WLAN-Bereitstellung'
];

function initFeatureSearch() {
  const input = document.getElementById('featureSearchInput');
  const list = document.getElementById('featureSearchList');
  const grid = document.getElementById('createFeatureTags');
  if (!input || !list || !grid) return;

  function getSelectedTexts() {
    const set = new Set();
    grid.querySelectorAll('.feature-tag').forEach(btn => {
      set.add(btn.textContent.trim());
    });
    return set;
  }

  function addFeatureTag(text) {
    const existing = grid.querySelectorAll('.feature-tag');
    for (const btn of existing) {
      if (btn.textContent.trim() === text) {
        btn.classList.add('selected');
        btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }
    }
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'feature-tag selected';
    btn.textContent = text;
    btn.onclick = function() { toggleFeatureTag(btn); };
    grid.appendChild(btn);
  }

  input.addEventListener('input', function() {
    const q = this.value.trim().toLowerCase();
    list.innerHTML = '';
    if (!q) { list.style.display = 'none'; return; }

    const inGrid = getSelectedTexts();
    const matches = ALL_FEATURES.filter(f => {
      const label = f.replace(/^.+?\s/, '').toLowerCase();
      return label.includes(q) || f.toLowerCase().includes(q);
    }).slice(0, 8);

    if (!matches.length) {
      const li = document.createElement('li');
      li.className = 'feature-search-item feature-search-custom';
      li.textContent = '✏️ „' + this.value.trim() + '" als eigene Leistung hinzufügen';
      li.addEventListener('mousedown', function(e) {
        e.preventDefault();
        addFeatureTag('✏️ ' + input.value.trim());
        input.value = '';
        list.style.display = 'none';
        showToast('Leistung hinzugefügt!', 'add_circle');
      });
      list.appendChild(li);
      list.style.display = 'block';
      return;
    }

    matches.forEach(f => {
      const li = document.createElement('li');
      li.className = 'feature-search-item';
      if (inGrid.has(f)) li.classList.add('already');
      li.textContent = f;
      li.addEventListener('mousedown', function(e) {
        e.preventDefault();
        addFeatureTag(f);
        input.value = '';
        list.style.display = 'none';
      });
      list.appendChild(li);
    });
    list.style.display = 'block';
  });

  input.addEventListener('blur', function() {
    setTimeout(() => { list.style.display = 'none'; }, 120);
  });
  input.addEventListener('focus', function() {
    if (this.value.trim()) this.dispatchEvent(new Event('input'));
  });

  input.addEventListener('keydown', function(e) {
    const items = list.querySelectorAll('.feature-search-item');
    if (!items.length) return;
    let active = list.querySelector('.feature-search-item.active');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!active) { items[0].classList.add('active'); }
      else { active.classList.remove('active'); const next = active.nextElementSibling; if (next) next.classList.add('active'); else items[0].classList.add('active'); }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!active) { items[items.length - 1].classList.add('active'); }
      else { active.classList.remove('active'); const prev = active.previousElementSibling; if (prev) prev.classList.add('active'); else items[items.length - 1].classList.add('active'); }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active) active.dispatchEvent(new MouseEvent('mousedown'));
      else if (items[0]) items[0].dispatchEvent(new MouseEvent('mousedown'));
    }
  });

  // Mobile collapse / expand
  var toggle = document.getElementById('featureTagsToggle');
  if (toggle && window.innerWidth <= 768) {
    grid.classList.add('collapsed');
    toggle.addEventListener('click', function() {
      var isCollapsed = grid.classList.toggle('collapsed');
      toggle.textContent = isCollapsed ? 'Mehr anzeigen ▾' : 'Weniger anzeigen ▴';
    });
  }
}

// Category → label mapping
const CATEGORY_LABELS = {
  dj: 'DJ & Musik', catering: 'Catering', foto: 'Fotografie',
  florist: 'Floristik', location: 'Location', licht: 'Licht & Technik',
  pyro: 'Pyrotechnik', deko: 'Dekoration', planung: 'Eventplanung',
  moderation: 'Moderation'
};

function submitListing(e) {
  if (e && e.preventDefault) e.preventDefault();

  if (!isLoggedIn) {
    showToast('Bitte melde dich an, um ein Inserat zu erstellen.', 'warning');
    openModal('loginModal');
    return;
  }

  // Read form values with validation
  const title = document.getElementById('createTitle').value.trim();
  const category = document.getElementById('createCategory').value;
  const description = document.getElementById('createDescription').value.trim();
  const price = parseInt(document.getElementById('createPrice').value) || 0;
  const priceModel = document.getElementById('createPriceModel').value;

  // Basic validation
  if (!title) { showToast('Bitte gib einen Titel ein', 'warning'); nextStep(1); return; }
  if (!category) { showToast('Bitte wähle eine Kategorie', 'warning'); nextStep(1); return; }
  if (!description) { showToast('Bitte gib eine Beschreibung ein', 'warning'); nextStep(1); return; }
  if (!price) { showToast('Bitte gib einen Preis ein', 'warning'); nextStep(1); return; }
  const region = document.getElementById('createRegionValue').value.trim()
    || document.getElementById('createRegion').value.trim() || 'Deutschland';
  const dateFrom = document.getElementById('createDateFrom').value;
  const dateTo = document.getElementById('createDateTo').value;
  const timeFrom = getTimeISO('createTimeFrom');
  const timeTo = getTimeISO('createTimeTo');
  const duration = parseFloat(document.getElementById('createDuration').value) || 0;
  const selectedTags = document.querySelectorAll('#createFeatureTags .feature-tag.selected');
  const features = selectedTags.length > 0
    ? Array.from(selectedTags).map(function(btn) { return btn.textContent.trim(); })
    : ['Individuelle Absprache'];

  // Tags from checkboxes
  const tagEls = document.querySelectorAll('#createTags input[type=checkbox]:checked');
  const tags = Array.from(tagEls).map(el => el.value);

  // Extract city from region
  const city = region.split(/[,&·–-]/)[0].trim();

  // Build price label
  const priceLabel = price > 0 ? `ab ${price}€ / ${priceModel.replace('Pro ','').replace('Pauschal','Pauschal')}` : 'Auf Anfrage';

  // Collect image files from upload preview
  const previewDivs = document.querySelectorAll('#uploadPreview .upload-preview-item');
  const imgEntries = Array.from(previewDivs).map(function(div) {
    var img = div.querySelector('img');
    return { src: img ? img.src : '', blob: div._croppedBlob || null };
  });

  // Show loading
  var submitBtn = document.querySelector('#step3 .btn-primary');
  _setBtnLoading(submitBtn, true);
  showToast('Wird gespeichert...', 'sync');

  // Upload images: cropped blobs first, then data URLs, keep existing URLs
  var uploadPromises = imgEntries.map(function(entry) {
    if (entry.blob) {
      var file = new File([entry.blob], 'listing-' + Date.now() + '-' + Math.random().toString(36).slice(2,6) + '.jpg', { type: 'image/jpeg' });
      return uploadFile(file).then(function(r) { return r.url; });
    }
    if (entry.src.startsWith('data:')) {
      var arr = entry.src.split(','), mime = arr[0].match(/:(.*?);/)[1];
      var bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
      while (n--) u8arr[n] = bstr.charCodeAt(n);
      var file = new File([u8arr], 'listing-' + Date.now() + '.' + mime.split('/')[1], { type: mime });
      return uploadFile(file).then(function(r) { return r.url; });
    }
    return Promise.resolve(entry.src);
  });

  Promise.all(uploadPromises).then(function(imageUrls) {
    // Require at least one image
    if (imageUrls.length === 0) {
      showToast('Bitte lade mindestens ein Bild hoch', 'warning');
      _setBtnLoading(submitBtn, false);
      nextStep(2);
      return;
    }

    var payload = {
      title: title,
      category: category,
      categoryLabel: CATEGORY_LABELS[category] || category,
      description: '<p>' + description.replace(/\n/g, '</p><p>') + '</p>',
      price: price,
      priceModel: priceModel,
      priceLabel: priceLabel,
      location: city,
      region: region,
      features: features,
      tags: tags.length > 0 ? tags : ['Party'],
      images: imageUrls,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      timeFrom: timeFrom || null,
      timeTo: timeTo || null,
      duration: duration,
      negotiable: true
    };

    var method = 'POST';
    var url = _apiUrl('listings');
    var editingDbId = null;

    // If editing an existing DB listing
    if (window._editingListingId) {
      var editListing = LISTINGS.find(function(l) { return l.id === window._editingListingId; });
      if (editListing && editListing._fromDb) {
        editingDbId = editListing._dbId;
        method = 'PUT';
        url = _apiUrl('listings/' + editingDbId);
      }
    }

    return fetch(url, {
      method: method,
      credentials: 'same-origin',
      headers: _apiHeaders(),
      body: JSON.stringify(payload)
    }).then(function(resp) {
      if (!resp.ok) {
        return resp.json().catch(function() { return {}; }).then(function(err) {
          throw new Error(err.message || err.db_error || 'Speichern fehlgeschlagen (Status ' + resp.status + ')');
        });
      }
      return resp.json();
    }).then(function(saved) {
      // Remove old from LISTINGS array if editing
      if (window._editingListingId) {
        var editIdx = LISTINGS.findIndex(function(l) { return l.id === window._editingListingId; });
        if (editIdx !== -1) LISTINGS.splice(editIdx, 1);
        window._editingListingId = null;
      }

      // Add to local array
      saved.id = saved.id + 10000;
      saved._fromDb = true;
      saved._dbId = saved.id - 10000;
      LISTINGS.unshift(saved);

      // Reset the form
      document.getElementById('createListingForm').reset();
      document.getElementById('uploadPreview').innerHTML = '';
      document.querySelectorAll('#createFeatureTags .feature-tag').forEach(function(t) { t.classList.remove('selected'); });
      document.querySelectorAll('#createFeatureTags .feature-tag-custom-item').forEach(function(t) { t.remove(); });
      document.querySelectorAll('.form-step').forEach(function(s) { s.classList.remove('active'); });
      document.getElementById('step1').classList.add('active');

      // Force reload from DB on next navigation
      _dbListingsLoaded = false;

      var successMsg = isEventPlaner() ? 'Event erfolgreich veröffentlicht! 🎉' : 'Inserat erfolgreich veröffentlicht! 🎉';
      showToast(successMsg, 'check_circle');
      _setBtnLoading(submitBtn, false);
      setTimeout(function() { navigateTo('detail', saved.id); }, 800);
    });
  }).catch(function(err) {
    _setBtnLoading(submitBtn, false);
    showToast('Fehler beim Speichern: ' + err.message, 'error');
  });
}

function handleUpload(input) {
  const preview = document.getElementById('uploadPreview');
  const files = input.files;
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const maxSize = 5 * 1024 * 1024; // 5 MB
  const maxImages = 10;
  const existing = preview.querySelectorAll('.upload-preview-item').length;

  let queue = [];
  for (let file of files) {
    if (!allowedTypes.includes(file.type)) { showToast('Nur JPG, PNG, WebP oder GIF erlaubt', 'error'); continue; }
    if (file.size > maxSize) { showToast('Bild zu groß! Max. 5 MB', 'error'); continue; }
    if (existing + queue.length >= maxImages) { showToast('Max. ' + maxImages + ' Bilder erlaubt', 'warning'); break; }
    queue.push(file);
  }
  input.value = '';

  // Open crop modal for each image sequentially
  _lcropMode = 'listing';
  _lcropQueue = queue;
  _lcropQueueIdx = 0;
  if (queue.length > 0) _lcropProcessNext();
}

// ---- Listing Crop State ----
var _lcropImg = null;
var _lcropX = 0, _lcropY = 0, _lcropDragStart = null;
var _lcropQueue = [];
var _lcropQueueIdx = 0;
var _lcropEditTarget = null; // when re-cropping an existing preview item
var _lcropMode = 'listing'; // 'listing' or 'gallery'

function _lcropProcessNext() {
  if (_lcropQueueIdx >= _lcropQueue.length) { _lcropQueue = []; return; }
  var file = _lcropQueue[_lcropQueueIdx];
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      _lcropImg = img;
      _lcropX = 0; _lcropY = 0;
      _lcropEditTarget = null;
      document.getElementById('lcropZoom').value = 1;
      openModal('listingCropModal');
      setTimeout(function() { lcropDraw(); lcropBindEvents(); }, 50);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function lcropDraw() {
  var canvas = document.getElementById('lcropCanvas');
  var cont = document.getElementById('lcropContainer');
  if (!canvas || !_lcropImg) return;
  var w = cont.offsetWidth;
  var h = Math.round(w * 3 / 4); // 4:3 aspect
  canvas.width = w; canvas.height = h;
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);

  var zoom = parseFloat(document.getElementById('lcropZoom').value) || 1;
  var imgAspect = _lcropImg.width / _lcropImg.height;
  var drawW, drawH;
  // Cover: fill the 4:3 frame
  var frameAspect = w / h;
  if (imgAspect > frameAspect) {
    drawH = h * zoom;
    drawW = drawH * imgAspect;
  } else {
    drawW = w * zoom;
    drawH = drawW / imgAspect;
  }

  // Clamp offsets so image covers the frame
  var maxOffX = Math.max(0, (drawW - w) / 2);
  var maxOffY = Math.max(0, (drawH - h) / 2);
  _lcropX = Math.max(-maxOffX, Math.min(maxOffX, _lcropX));
  _lcropY = Math.max(-maxOffY, Math.min(maxOffY, _lcropY));

  var dx = (w - drawW) / 2 + _lcropX;
  var dy = (h - drawH) / 2 + _lcropY;
  ctx.drawImage(_lcropImg, dx, dy, drawW, drawH);
}

function lcropBindEvents() {
  var cont = document.getElementById('lcropContainer');
  if (cont._lcropBound) return;
  cont._lcropBound = true;

  function startDrag(x, y) { _lcropDragStart = { x: x, y: y, ox: _lcropX, oy: _lcropY }; }
  function moveDrag(x, y) {
    if (!_lcropDragStart) return;
    _lcropX = _lcropDragStart.ox + (x - _lcropDragStart.x);
    _lcropY = _lcropDragStart.oy + (y - _lcropDragStart.y);
    lcropDraw();
  }
  function endDrag() { _lcropDragStart = null; }

  cont.addEventListener('mousedown', function(e) { e.preventDefault(); startDrag(e.clientX, e.clientY); });
  window.addEventListener('mousemove', function(e) { if (_lcropDragStart) moveDrag(e.clientX, e.clientY); });
  window.addEventListener('mouseup', function() { if (_lcropDragStart) endDrag(); });
  cont.addEventListener('touchstart', function(e) { e.preventDefault(); var t = e.touches[0]; startDrag(t.clientX, t.clientY); }, { passive: false });
  window.addEventListener('touchmove', function(e) { if (_lcropDragStart) { var t = e.touches[0]; moveDrag(t.clientX, t.clientY); } });
  window.addEventListener('touchend', function() { if (_lcropDragStart) endDrag(); });
  cont.addEventListener('wheel', function(e) {
    e.preventDefault();
    var slider = document.getElementById('lcropZoom');
    var v = parseFloat(slider.value) + (e.deltaY < 0 ? 0.05 : -0.05);
    slider.value = Math.max(1, Math.min(3, v));
    lcropDraw();
  }, { passive: false });
}

function lcropConfirm() {
  var canvas = document.getElementById('lcropCanvas');
  if (!canvas || !_lcropImg) return;
  var w = canvas.width, h = canvas.height;

  // Render cropped image at high resolution
  var out = document.createElement('canvas');
  var outW = 1200, outH = 900; // 4:3
  out.width = outW; out.height = outH;
  var octx = out.getContext('2d');

  var zoom = parseFloat(document.getElementById('lcropZoom').value) || 1;
  var imgAspect = _lcropImg.width / _lcropImg.height;
  var frameAspect = w / h;
  var drawW, drawH;
  if (imgAspect > frameAspect) {
    drawH = h * zoom;
    drawW = drawH * imgAspect;
  } else {
    drawW = w * zoom;
    drawH = drawW / imgAspect;
  }

  var scaleX = outW / w, scaleY = outH / h;
  var dx = ((w - drawW) / 2 + _lcropX) * scaleX;
  var dy = ((h - drawH) / 2 + _lcropY) * scaleY;
  octx.drawImage(_lcropImg, dx, dy, drawW * scaleX, drawH * scaleY);

  out.toBlob(function(blob) {
    if (!blob) return;
    closeModal('listingCropModal');
    var previewUrl = URL.createObjectURL(blob);

    if (_lcropEditTarget) {
      // Re-crop: update existing preview item
      var img = _lcropEditTarget.querySelector('img');
      if (img) img.src = previewUrl;
      _lcropEditTarget._croppedBlob = blob;
      var editTarget = _lcropEditTarget;
      _lcropEditTarget = null;
      if (_lcropMode === 'listing') _updateListingLivePreview();
      if (_lcropMode === 'gallery') {
        // Upload cropped gallery image to server
        uploadFile(blob).then(function(data) {
          // Find the item we just updated (by previewUrl)
          var items = document.querySelectorAll('#galleryPreview .upload-preview-item');
          items.forEach(function(item) {
            var im = item.querySelector('img');
            if (im && im.src === previewUrl) {
              im.src = data.url;
              item.setAttribute('data-url', data.url);
            }
          });
        }).catch(function() { showToast('Upload fehlgeschlagen', 'error'); });
      }
      if (_lcropMode === 'provider-portfolio') {
        // Re-crop portfolio image - upload and update
        var oldUrl = editTarget.getAttribute('data-url');
        uploadFile(blob).then(function(data) {
          editTarget.querySelector('img').src = data.url;
          editTarget.setAttribute('data-url', data.url);
          // Update gallery array
          if (currentUser && currentUser.gallery) {
            var gIdx = currentUser.gallery.indexOf(oldUrl);
            if (gIdx > -1) currentUser.gallery[gIdx] = data.url;
            _provSaveGallery();
          }
          showToast('Bild zugeschnitten!', 'crop');
        }).catch(function() { showToast('Upload fehlgeschlagen', 'error'); });
      }
    } else if (_lcropMode === 'provider-portfolio') {
      // New portfolio image from crop
      uploadFile(blob).then(function(data) {
        _provAddPortfolioItem(data.url);
        showToast('Bild hinzugefügt!', 'add_photo_alternate');
      }).catch(function() { showToast('Upload fehlgeschlagen', 'error'); });
    } else if (_lcropMode === 'gallery') {
      // New gallery image: add preview item and upload
      _addGalleryPreviewItem(previewUrl, blob);
    } else {
      // New listing image: add preview item
      _addListingPreviewItem(previewUrl, blob);
    }

    // Process next image in queue
    _lcropQueueIdx++;
    _lcropProcessNext();
  }, 'image/jpeg', 0.92);
}

function _addListingPreviewItem(src, blob) {
  var preview = document.getElementById('uploadPreview');
  var div = document.createElement('div');
  div.className = 'upload-preview-item';
  div.draggable = true;
  if (blob) div._croppedBlob = blob;
  var isFirst = preview.querySelectorAll('.upload-preview-item').length === 0;

  div.innerHTML =
    '<img src="' + _escHtml(src) + '" alt="Preview" />' +
    '<div class="upload-preview-actions">' +
      '<button type="button" class="upload-act-crop" title="Zuschneiden"><span class="material-icons-round">crop</span></button>' +
      '<button type="button" class="upload-act-remove" title="Entfernen"><span class="material-icons-round">close</span></button>' +
    '</div>' +
    (isFirst ? '<span class="upload-preview-badge">Titelbild</span>' : '');

  // Crop button
  div.querySelector('.upload-act-crop').onclick = function(e) {
    e.stopPropagation();
    var imgSrc = div.querySelector('img').src;
    var img = new Image();
    img.onload = function() {
      _lcropImg = img;
      _lcropX = 0; _lcropY = 0;
      _lcropEditTarget = div;
      _lcropMode = 'listing';
      _lcropQueue = []; _lcropQueueIdx = 0;
      document.getElementById('lcropZoom').value = 1;
      openModal('listingCropModal');
      setTimeout(function() { lcropDraw(); lcropBindEvents(); }, 50);
    };
    img.src = imgSrc;
  };

  // Remove button
  div.querySelector('.upload-act-remove').onclick = function(e) {
    e.stopPropagation();
    div.remove();
    _updateListingPreviewBadges();
  };

  // Drag&Drop reorder
  div.addEventListener('dragstart', function(e) {
    div.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  div.addEventListener('dragend', function() {
    div.classList.remove('dragging');
    _updateListingPreviewBadges();
  });
  div.addEventListener('dragover', function(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    var dragging = preview.querySelector('.dragging');
    if (dragging && dragging !== div) {
      var rect = div.getBoundingClientRect();
      var mid = rect.left + rect.width / 2;
      if (e.clientX < mid) {
        preview.insertBefore(dragging, div);
      } else {
        preview.insertBefore(dragging, div.nextSibling);
      }
    }
  });

  preview.appendChild(div);
  _updateListingLivePreview();
}

function _updateListingPreviewBadges() {
  var items = document.querySelectorAll('#uploadPreview .upload-preview-item');
  items.forEach(function(item, idx) {
    var badge = item.querySelector('.upload-preview-badge');
    if (idx === 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'upload-preview-badge';
        badge.textContent = 'Titelbild';
        item.appendChild(badge);
      }
    } else {
      if (badge) badge.remove();
    }
  });
  _updateListingLivePreview();
}

// ---- Live Gallery Preview ----
var _livePreviewIdx = 0;

function _updateListingLivePreview() {
  var container = document.getElementById('listingLivePreview');
  var track = document.getElementById('livePreviewTrack');
  var dots = document.getElementById('livePreviewDots');
  var counter = document.getElementById('livePreviewCounter');
  if (!container || !track) return;

  var items = document.querySelectorAll('#uploadPreview .upload-preview-item img');
  if (items.length === 0) {
    container.style.display = 'none';
    return;
  }
  container.style.display = '';

  // Build slides
  track.innerHTML = '';
  items.forEach(function(img) {
    var slide = document.createElement('div');
    slide.className = 'listing-live-preview-slide';
    var slideImg = document.createElement('img');
    slideImg.src = img.src;
    slideImg.alt = 'Vorschau';
    slide.appendChild(slideImg);
    track.appendChild(slide);
  });

  // Build dots
  dots.innerHTML = '';
  items.forEach(function(_, i) {
    var dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'listing-live-preview-dot' + (i === 0 ? ' active' : '');
    dot.onclick = function() { livePreviewGoTo(i); };
    dots.appendChild(dot);
  });

  _livePreviewIdx = 0;
  _updateLivePreviewUI();

  // Init scroll-snap listener
  track.onscroll = function() {
    var w = track.offsetWidth;
    if (w === 0) return;
    var idx = Math.round(track.scrollLeft / w);
    if (idx !== _livePreviewIdx) {
      _livePreviewIdx = idx;
      _updateLivePreviewUI();
    }
  };
}

function _updateLivePreviewUI() {
  var dots = document.querySelectorAll('#livePreviewDots .listing-live-preview-dot');
  var counter = document.getElementById('livePreviewCounter');
  dots.forEach(function(d, i) {
    d.classList.toggle('active', i === _livePreviewIdx);
  });
  if (counter) counter.textContent = (_livePreviewIdx + 1) + ' / ' + dots.length;
}

function livePreviewNav(dir) {
  var track = document.getElementById('livePreviewTrack');
  if (!track) return;
  var total = track.querySelectorAll('.listing-live-preview-slide').length;
  var next = _livePreviewIdx + dir;
  if (next < 0 || next >= total) return;
  livePreviewGoTo(next);
}

function livePreviewGoTo(idx) {
  var track = document.getElementById('livePreviewTrack');
  if (!track) return;
  var slides = track.querySelectorAll('.listing-live-preview-slide');
  if (slides[idx]) slides[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  _livePreviewIdx = idx;
  _updateLivePreviewUI();
}

// ========== PROFILE UPLOADS ==========
var _cropImg = null;
var _cropX = 0, _cropY = 0, _cropDragStart = null;

function handleProfilePhoto(input) {
  if (!input.files || !input.files[0]) return;
  var file = input.files[0];
  if (file.size > 5 * 1024 * 1024) {
    showToast('Bild zu groß! Max. 5MB', 'error');
    input.value = '';
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      _cropImg = img;
      _cropX = 0; _cropY = 0;
      document.getElementById('cropZoom').value = 1;
      openModal('avatarCropModal');
      setTimeout(function() { cropDraw(); cropBindEvents(); }, 50);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  input.value = '';
}

function cropDraw() {
  var canvas = document.getElementById('cropCanvas');
  var cont = document.getElementById('cropContainer');
  if (!canvas || !_cropImg) return;
  var size = cont.offsetWidth;
  canvas.width = size; canvas.height = size;
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);

  var zoom = parseFloat(document.getElementById('cropZoom').value) || 1;
  var imgAspect = _cropImg.width / _cropImg.height;
  var drawW, drawH;
  if (imgAspect > 1) {
    drawH = size * zoom;
    drawW = drawH * imgAspect;
  } else {
    drawW = size * zoom;
    drawH = drawW / imgAspect;
  }
  // Clamp offsets so image covers the circle area
  var circleR = size * 0.34;
  var minX = -(drawW - size) / 2 - (drawW / 2 - circleR - size / 2);
  var maxX = (drawW - size) / 2 + (drawW / 2 - circleR - size / 2);
  var minY = -(drawH - size) / 2 - (drawH / 2 - circleR - size / 2);
  var maxY = (drawH - size) / 2 + (drawH / 2 - circleR - size / 2);
  if (minX > maxX) { minX = 0; maxX = 0; }
  if (minY > maxY) { minY = 0; maxY = 0; }
  _cropX = Math.max(minX, Math.min(maxX, _cropX));
  _cropY = Math.max(minY, Math.min(maxY, _cropY));

  var dx = (size - drawW) / 2 + _cropX;
  var dy = (size - drawH) / 2 + _cropY;
  ctx.drawImage(_cropImg, dx, dy, drawW, drawH);
}

function cropBindEvents() {
  var cont = document.getElementById('cropContainer');
  if (cont._cropBound) return;
  cont._cropBound = true;

  function startDrag(x, y) {
    _cropDragStart = { x: x, y: y, ox: _cropX, oy: _cropY };
  }
  function moveDrag(x, y) {
    if (!_cropDragStart) return;
    _cropX = _cropDragStart.ox + (x - _cropDragStart.x);
    _cropY = _cropDragStart.oy + (y - _cropDragStart.y);
    cropDraw();
  }
  function endDrag() { _cropDragStart = null; }

  cont.addEventListener('mousedown', function(e) { e.preventDefault(); startDrag(e.clientX, e.clientY); });
  window.addEventListener('mousemove', function(e) { moveDrag(e.clientX, e.clientY); });
  window.addEventListener('mouseup', endDrag);
  cont.addEventListener('touchstart', function(e) { e.preventDefault(); var t = e.touches[0]; startDrag(t.clientX, t.clientY); }, { passive: false });
  window.addEventListener('touchmove', function(e) { if (_cropDragStart) { var t = e.touches[0]; moveDrag(t.clientX, t.clientY); } });
  window.addEventListener('touchend', endDrag);

  cont.addEventListener('wheel', function(e) {
    e.preventDefault();
    var slider = document.getElementById('cropZoom');
    var v = parseFloat(slider.value) + (e.deltaY < 0 ? 0.05 : -0.05);
    slider.value = Math.max(1, Math.min(3, v));
    cropDraw();
  }, { passive: false });
}

function cropConfirm() {
  var canvas = document.getElementById('cropCanvas');
  if (!canvas || !_cropImg) return;
  var size = canvas.width;
  var circleR = size * 0.34;
  var cx = size / 2, cy = size / 2;

  // Draw cropped circle onto an output canvas
  var out = document.createElement('canvas');
  var outSize = 512;
  out.width = outSize; out.height = outSize;
  var octx = out.getContext('2d');

  // Clip to circle
  octx.beginPath();
  octx.arc(outSize / 2, outSize / 2, outSize / 2, 0, Math.PI * 2);
  octx.closePath();
  octx.clip();

  // Re-draw image at output resolution
  var zoom = parseFloat(document.getElementById('cropZoom').value) || 1;
  var imgAspect = _cropImg.width / _cropImg.height;
  var drawW, drawH;
  if (imgAspect > 1) {
    drawH = size * zoom;
    drawW = drawH * imgAspect;
  } else {
    drawW = size * zoom;
    drawH = drawW / imgAspect;
  }
  var scale = outSize / (circleR * 2);
  var srcX = (size - drawW) / 2 + _cropX - (cx - circleR);
  var srcY = (size - drawH) / 2 + _cropY - (cy - circleR);

  octx.drawImage(_cropImg, srcX * scale, srcY * scale, drawW * scale, drawH * scale);

  out.toBlob(function(blob) {
    if (!blob) return;
    closeModal('avatarCropModal');
    var previewUrl = URL.createObjectURL(blob);
    var profileAv = document.getElementById('profileAvatar');
    if (profileAv) profileAv.src = previewUrl;
    var providerAv = document.getElementById('providerAvatar');
    if (providerAv) providerAv.src = previewUrl;
    var navAvatar = document.querySelector('#avatarBtn img');
    if (navAvatar) navAvatar.src = previewUrl;

    var croppedFile = new File([blob], 'avatar.png', { type: 'image/png' });
    uploadFile(croppedFile).then(function(data) {
      if (currentUser) currentUser.photoUrl = data.url;
      if (profileAv) profileAv.src = data.url;
      if (providerAv) providerAv.src = data.url;
      if (navAvatar) navAvatar.src = data.url;
      fetch(_apiUrl('profile'), {
        method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
        body: JSON.stringify({ photoUrl: data.url })
      }).catch(function(){});
      showToast('Profilbild aktualisiert!', 'camera_alt');
    }).catch(function() {
      showToast('Upload fehlgeschlagen', 'error');
    });
  }, 'image/png');
}

function handleCoverUpload(input) {
  if (!input.files || !input.files[0]) return;
  var file = input.files[0];
  if (file.size > 5 * 1024 * 1024) {
    showToast('Bild zu groß! Max. 5MB', 'error');
    return;
  }
  // Show preview immediately
  var reader = new FileReader();
  reader.onload = function(e) {
    var cover = document.querySelector('.profile-cover');
    if (cover) {
      cover.style.backgroundImage = 'url(' + e.target.result + ')';
      cover.style.backgroundPosition = 'center 50%';
    }
  };
  reader.readAsDataURL(file);
  // Upload to server
  uploadFile(file).then(function(data) {
    if (currentUser) {
      currentUser.coverUrl = data.url;
      currentUser.coverPosY = 50;
    }
    var cover = document.querySelector('.profile-cover');
    if (cover) cover.style.backgroundImage = 'url(' + data.url + ')';
    fetch(_apiUrl('profile'), {
      method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
      body: JSON.stringify({ coverUrl: data.url, coverPosY: 50 })
    }).catch(function(){});
    showToast('Cover-Bild hochgeladen! Sichtbereich anpassen mit ↔', 'panorama');
  }).catch(function() {
    showToast('Upload fehlgeschlagen', 'error');
  });
}

// --- Cover Reposition (Drag to adjust visible area) ---
var _coverDrag = { active: false, startY: 0, startPosY: 50, currentPosY: 50, savedPosY: 50 };

function startCoverReposition() {
  var cover = document.querySelector('.profile-cover');
  if (!cover || !cover.style.backgroundImage || cover.style.backgroundImage === 'none') return;
  _coverDrag.savedPosY = currentUser?.coverPosY ?? 50;
  _coverDrag.currentPosY = _coverDrag.savedPosY;
  cover.classList.add('repositioning');

  cover.addEventListener('mousedown', onCoverDragStart);
  cover.addEventListener('touchstart', onCoverDragStart, { passive: false });
  document.addEventListener('mousemove', onCoverDragMove);
  document.addEventListener('touchmove', onCoverDragMove, { passive: false });
  document.addEventListener('mouseup', onCoverDragEnd);
  document.addEventListener('touchend', onCoverDragEnd);
}

function onCoverDragStart(e) {
  // Don't drag from buttons
  if (e.target.closest('button') || e.target.closest('.cover-reposition-actions')) return;
  e.preventDefault();
  _coverDrag.active = true;
  _coverDrag.startY = e.touches ? e.touches[0].clientY : e.clientY;
  _coverDrag.startPosY = _coverDrag.currentPosY;
}

function onCoverDragMove(e) {
  if (!_coverDrag.active) return;
  e.preventDefault();
  var clientY = e.touches ? e.touches[0].clientY : e.clientY;
  var cover = document.querySelector('.profile-cover');
  var coverHeight = cover ? cover.offsetHeight : 280;
  var deltaY = clientY - _coverDrag.startY;
  // Convert pixel delta to percentage (invert: drag down = move image down = lower %)
  var deltaPct = (deltaY / coverHeight) * 100;
  _coverDrag.currentPosY = Math.max(0, Math.min(100, _coverDrag.startPosY + deltaPct));
  if (cover) cover.style.backgroundPosition = 'center ' + _coverDrag.currentPosY + '%';
}

function onCoverDragEnd() {
  _coverDrag.active = false;
}

function saveCoverPosition() {
  var cover = document.querySelector('.profile-cover');
  if (cover) cover.classList.remove('repositioning');
  cleanupCoverDrag();
  if (currentUser) currentUser.coverPosY = _coverDrag.currentPosY;
  // Persist to backend
  fetch(_apiUrl('profile'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: _apiHeaders(),
    body: JSON.stringify({ coverPosY: _coverDrag.currentPosY })
  }).catch(function() {});
  showToast('Sichtbereich gespeichert! ✅', 'check_circle');
}

function cancelCoverReposition() {
  var cover = document.querySelector('.profile-cover');
  if (cover) {
    cover.classList.remove('repositioning');
    cover.style.backgroundPosition = 'center ' + _coverDrag.savedPosY + '%';
  }
  _coverDrag.currentPosY = _coverDrag.savedPosY;
  cleanupCoverDrag();
}

function cleanupCoverDrag() {
  var cover = document.querySelector('.profile-cover');
  if (cover) {
    cover.removeEventListener('mousedown', onCoverDragStart);
    cover.removeEventListener('touchstart', onCoverDragStart);
  }
  document.removeEventListener('mousemove', onCoverDragMove);
  document.removeEventListener('touchmove', onCoverDragMove);
  document.removeEventListener('mouseup', onCoverDragEnd);
  document.removeEventListener('touchend', onCoverDragEnd);
  _coverDrag.active = false;
}

function removeCover() {
  var cover = document.querySelector('.profile-cover');
  if (cover) cover.style.backgroundImage = '';
  document.getElementById('coverInput').value = '';
  if (currentUser) currentUser.coverUrl = '';
  showToast('Cover-Bild entfernt', 'delete');
}

function handleGalleryUpload(input) {
  var preview = document.getElementById('galleryPreview');
  var existingCount = preview.querySelectorAll('.upload-preview-item').length;
  var files = input.files;

  if (existingCount + files.length > 12) {
    showToast('Maximal 12 Galerie-Bilder erlaubt!', 'error');
    return;
  }

  var queue = [];
  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    if (file.size > 5 * 1024 * 1024) {
      showToast(file.name + ' ist zu groß (max. 5MB)', 'error');
      continue;
    }
    queue.push(file);
  }
  input.value = '';

  // Open crop modal for each image sequentially
  _lcropMode = 'gallery';
  _lcropQueue = queue;
  _lcropQueueIdx = 0;
  if (queue.length > 0) _lcropProcessNext();
}

function _addGalleryPreviewItem(src, blob) {
  var preview = document.getElementById('galleryPreview');
  var div = document.createElement('div');
  div.className = 'upload-preview-item';
  div.innerHTML = '<img src="' + _escHtml(src) + '" alt="Galerie" />' +
    '<div class="upload-preview-actions">' +
      '<button type="button" class="upload-act-crop" title="Zuschneiden"><span class="material-icons-round">crop</span></button>' +
      '<button type="button" class="upload-act-remove" title="Entfernen"><span class="material-icons-round">close</span></button>' +
    '</div>';

  // Crop button
  div.querySelector('.upload-act-crop').onclick = function(e) {
    e.stopPropagation();
    var imgSrc = div.querySelector('img').src;
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
      _lcropImg = img;
      _lcropX = 0; _lcropY = 0;
      _lcropEditTarget = div;
      _lcropMode = 'gallery';
      _lcropQueue = []; _lcropQueueIdx = 0;
      document.getElementById('lcropZoom').value = 1;
      openModal('listingCropModal');
      setTimeout(function() { lcropDraw(); lcropBindEvents(); }, 50);
    };
    img.src = imgSrc;
  };

  // Remove button
  div.querySelector('.upload-act-remove').onclick = function(e) {
    e.stopPropagation();
    div.remove();
    updateGalleryCount();
  };

  preview.appendChild(div);
  updateGalleryCount();

  // Upload cropped blob to server
  if (blob) {
    uploadFile(blob).then(function(data) {
      div.querySelector('img').src = data.url;
      div.setAttribute('data-url', data.url);
    }).catch(function() {
      showToast('Upload fehlgeschlagen', 'error');
    });
  }
}

function removeGalleryItem(btn) {
  btn.parentElement.remove();
  updateGalleryCount();
}

function updateGalleryCount() {
  var count = document.querySelectorAll('#galleryPreview .upload-preview-item').length;
  var zone = document.getElementById('galleryUploadZone');
  if (zone) {
    var p = zone.querySelector('p');
    if (count > 0) {
      p.textContent = count + ' Bild' + (count > 1 ? 'er' : '') + ' – weitere hinzufügen';
    } else {
      p.textContent = 'Galerie-Bilder hochladen';
    }
  }
}

// Drag & Drop support
function setupDragDrop() {
  var zones = document.querySelectorAll('.upload-zone');
  zones.forEach(function(zone) {
    zone.addEventListener('dragover', function(e) {
      e.preventDefault();
      zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', function(e) {
      e.preventDefault();
      zone.classList.remove('dragover');
    });
    zone.addEventListener('drop', function(e) {
      e.preventDefault();
      zone.classList.remove('dragover');
      var fileInput = zone.querySelector('input[type="file"]');
      if (fileInput && e.dataTransfer.files.length > 0) {
        fileInput.files = e.dataTransfer.files;
        fileInput.dispatchEvent(new Event('change'));
      }
    });
  });
}

// ======== DRAG-SCROLL for horizontal scroll containers ========
function initDragScroll() {
  document.querySelectorAll('.category-scroll').forEach(function(el) {
    var isDown = false, startX, scrollLeft;
    el.addEventListener('mousedown', function(e) {
      isDown = true;
      el.classList.add('dragging');
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    });
    el.addEventListener('mouseleave', function() {
      isDown = false;
      el.classList.remove('dragging');
    });
    el.addEventListener('mouseup', function() {
      isDown = false;
      el.classList.remove('dragging');
    });
    el.addEventListener('mousemove', function(e) {
      if (!isDown) return;
      e.preventDefault();
      var x = e.pageX - el.offsetLeft;
      el.scrollLeft = scrollLeft - (x - startX);
    });
  });
}

// Init drag & drop after DOM loaded
document.addEventListener('DOMContentLoaded', function() {
  setupDragDrop();
  initAiSearch();
  restoreSession();
  updatePasskeyLoginUi();
  initConditionalPasskeyLogin();
  initPasswordFields();
  initDragScroll();
  initDatePickers();
  initCityAutocomplete();
  initProfileCityAutocomplete();
  initTimePickers();
  initFeatureSearch();

  // Handle initial hash route (deep links)
  var hash = window.location.hash.replace('#', '');
  if (hash && hash !== 'home') {
    var parts = hash.split('/');
    var initPage = parts[0];
    var initData = parts[1] ? (isNaN(parts[1]) ? parts[1] : parseInt(parts[1])) : null;
    window.history.replaceState({ page: initPage, data: initData }, '', '#' + hash);
    navigateTo(initPage, initData, true);
  } else {
    window.history.replaceState({ page: 'home', data: null }, '', '#home');
  }

  // Show update notification once per version
  showUpdateNotification();

  // Handle browser back/forward
  window.addEventListener('popstate', function(e) {
    if (e.state && e.state.page) {
      navigateTo(e.state.page, e.state.data, true);
    }
  });
});

// ========== DATE PICKERS (Flatpickr) ==========
function setupYearDropdown(fp) {
  const yearInput = fp.calendarContainer.querySelector('input.cur-year');
  if (!yearInput) return;
  yearInput.readOnly = true;
  const wrapper = yearInput.closest('.numInputWrapper');
  wrapper.addEventListener('click', function(e) {
    e.stopPropagation();
    e.preventDefault();
    const existing = wrapper.querySelector('.year-dropdown');
    if (existing) { existing.remove(); return; }
    const currentYear = fp.currentYear;
    const minYear = new Date().getFullYear();
    const maxYear = minYear + 6;
    const dropdown = document.createElement('div');
    dropdown.className = 'year-dropdown';
    for (let y = minYear; y <= maxYear; y++) {
      const item = document.createElement('div');
      item.className = 'year-dropdown-item' + (y === currentYear ? ' active' : '');
      item.textContent = y;
      item.addEventListener('click', function(ev) {
        ev.stopPropagation();
        fp.changeYear(y);
        dropdown.remove();
      });
      dropdown.appendChild(item);
    }
    wrapper.appendChild(dropdown);
    const activeItem = dropdown.querySelector('.active');
    if (activeItem) {
      dropdown.scrollTop = activeItem.offsetTop - dropdown.offsetHeight / 2 + activeItem.offsetHeight / 2;
    }
    setTimeout(function() {
      function closeYearDd(ev) {
        if (!dropdown.contains(ev.target) && !wrapper.contains(ev.target)) {
          dropdown.remove();
          document.removeEventListener('click', closeYearDd);
        }
      }
      document.addEventListener('click', closeYearDd);
    }, 0);
  });
}

function initDatePickers() {
  if (typeof flatpickr === 'undefined') return;
  const fpConfig = {
    locale: 'de',
    dateFormat: 'Y-m-d',
    altInput: true,
    altFormat: 'd.m.Y',
    allowInput: true,
    disableMobile: true,
    minDate: 'today',
    onReady: function(selectedDates, dateStr, instance) {
      setupYearDropdown(instance);
    }
  };
  const fromPicker = flatpickr('#createDateFrom', {
    ...fpConfig,
    onChange: function(selectedDates) {
      if (selectedDates[0] && toPicker) {
        toPicker.set('minDate', selectedDates[0]);
      }
    }
  });
  const toPicker = flatpickr('#createDateTo', fpConfig);

  // Booking date on detail page
  flatpickr('#bookingDate', fpConfig);

  // Negotiation date in modal
  flatpickr('#negDate', fpConfig);
}

// ========== GERMAN CITIES ==========
const GERMAN_CITIES = [
  {name:'Berlin',state:'Berlin'},{name:'Hamburg',state:'Hamburg'},{name:'München',state:'Bayern'},
  {name:'Köln',state:'NRW'},{name:'Frankfurt am Main',state:'Hessen'},{name:'Stuttgart',state:'Baden-Württemberg'},
  {name:'Düsseldorf',state:'NRW'},{name:'Leipzig',state:'Sachsen'},{name:'Dortmund',state:'NRW'},
  {name:'Essen',state:'NRW'},{name:'Bremen',state:'Bremen'},{name:'Dresden',state:'Sachsen'},
  {name:'Hannover',state:'Niedersachsen'},{name:'Nürnberg',state:'Bayern'},{name:'Duisburg',state:'NRW'},
  {name:'Bochum',state:'NRW'},{name:'Wuppertal',state:'NRW'},{name:'Bielefeld',state:'NRW'},
  {name:'Bonn',state:'NRW'},{name:'Münster',state:'NRW'},{name:'Mannheim',state:'Baden-Württemberg'},
  {name:'Karlsruhe',state:'Baden-Württemberg'},{name:'Augsburg',state:'Bayern'},{name:'Wiesbaden',state:'Hessen'},
  {name:'Mönchengladbach',state:'NRW'},{name:'Gelsenkirchen',state:'NRW'},{name:'Aachen',state:'NRW'},
  {name:'Braunschweig',state:'Niedersachsen'},{name:'Kiel',state:'Schleswig-Holstein'},{name:'Chemnitz',state:'Sachsen'},
  {name:'Halle (Saale)',state:'Sachsen-Anhalt'},{name:'Magdeburg',state:'Sachsen-Anhalt'},{name:'Freiburg',state:'Baden-Württemberg'},
  {name:'Krefeld',state:'NRW'},{name:'Mainz',state:'Rheinland-Pfalz'},{name:'Lübeck',state:'Schleswig-Holstein'},
  {name:'Erfurt',state:'Thüringen'},{name:'Oberhausen',state:'NRW'},{name:'Rostock',state:'Mecklenburg-Vorpommern'},
  {name:'Kassel',state:'Hessen'},{name:'Hagen',state:'NRW'},{name:'Potsdam',state:'Brandenburg'},
  {name:'Saarbrücken',state:'Saarland'},{name:'Hamm',state:'NRW'},{name:'Ludwigshafen',state:'Rheinland-Pfalz'},
  {name:'Oldenburg',state:'Niedersachsen'},{name:'Osnabrück',state:'Niedersachsen'},{name:'Leverkusen',state:'NRW'},
  {name:'Heidelberg',state:'Baden-Württemberg'},{name:'Darmstadt',state:'Hessen'},{name:'Solingen',state:'NRW'},
  {name:'Regensburg',state:'Bayern'},{name:'Herne',state:'NRW'},{name:'Paderborn',state:'NRW'},
  {name:'Neuss',state:'NRW'},{name:'Ingolstadt',state:'Bayern'},{name:'Offenbach',state:'Hessen'},
  {name:'Würzburg',state:'Bayern'},{name:'Ulm',state:'Baden-Württemberg'},{name:'Heilbronn',state:'Baden-Württemberg'},
  {name:'Pforzheim',state:'Baden-Württemberg'},{name:'Wolfsburg',state:'Niedersachsen'},{name:'Göttingen',state:'Niedersachsen'},
  {name:'Bottrop',state:'NRW'},{name:'Reutlingen',state:'Baden-Württemberg'},{name:'Koblenz',state:'Rheinland-Pfalz'},
  {name:'Bremerhaven',state:'Bremen'},{name:'Bergisch Gladbach',state:'NRW'},{name:'Jena',state:'Thüringen'},
  {name:'Erlangen',state:'Bayern'},{name:'Trier',state:'Rheinland-Pfalz'},{name:'Remscheid',state:'NRW'},
  {name:'Salzgitter',state:'Niedersachsen'},{name:'Siegen',state:'NRW'},{name:'Cottbus',state:'Brandenburg'},
  {name:'Hildesheim',state:'Niedersachsen'},{name:'Gera',state:'Thüringen'},{name:'Schwerin',state:'Mecklenburg-Vorpommern'},
  {name:'Gütersloh',state:'NRW'},{name:'Konstanz',state:'Baden-Württemberg'},{name:'Bamberg',state:'Bayern'},
  {name:'Bayreuth',state:'Bayern'},{name:'Lüneburg',state:'Niedersachsen'},{name:'Marburg',state:'Hessen'},
  {name:'Hanau',state:'Hessen'},{name:'Flensburg',state:'Schleswig-Holstein'},{name:'Wilhelmshaven',state:'Niedersachsen'},
  {name:'Schwäbisch Gmünd',state:'Baden-Württemberg'},{name:'Friedrichshafen',state:'Baden-Württemberg'},
  {name:'Esslingen',state:'Baden-Württemberg'},{name:'Görlitz',state:'Sachsen'},{name:'Passau',state:'Bayern'},
  {name:'Stralsund',state:'Mecklenburg-Vorpommern'},{name:'Greifswald',state:'Mecklenburg-Vorpommern'},
  {name:'Zwickau',state:'Sachsen'},{name:'Plauen',state:'Sachsen'},{name:'Fulda',state:'Hessen'},
  {name:'Landshut',state:'Bayern'},{name:'Ravensburg',state:'Baden-Württemberg'},{name:'Baden-Baden',state:'Baden-Württemberg'},
  {name:'Weimar',state:'Thüringen'},{name:'Aschaffenburg',state:'Bayern'},{name:'Minden',state:'NRW'},
  {name:'Detmold',state:'NRW'},{name:'Worms',state:'Rheinland-Pfalz'},{name:'Speyer',state:'Rheinland-Pfalz'}
];

function initCityAutocomplete() {
  const input = document.getElementById('createRegion');
  const hidden = document.getElementById('createRegionValue');
  const list = document.getElementById('cityAutocompleteList');
  if (!input || !list) return;
  let activeIdx = -1;

  input.addEventListener('input', function() {
    const q = this.value.trim().toLowerCase();
    hidden.value = '';
    if (q.length < 1) { list.classList.remove('open'); list.innerHTML = ''; return; }
    const matches = GERMAN_CITIES.filter(c => c.name.toLowerCase().startsWith(q)).slice(0, 8);
    if (matches.length === 0) { list.classList.remove('open'); list.innerHTML = ''; return; }
    activeIdx = -1;
    list.innerHTML = matches.map((c, i) =>
      `<li data-city="${c.name}" data-state="${c.state}">${c.name}<span class="city-state">${c.state}</span></li>`
    ).join('');
    list.classList.add('open');
  });

  list.addEventListener('click', function(e) {
    const li = e.target.closest('li');
    if (!li) return;
    input.value = li.dataset.city;
    hidden.value = li.dataset.city;
    list.classList.remove('open');
  });

  input.addEventListener('keydown', function(e) {
    const items = list.querySelectorAll('li');
    if (!items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = Math.min(activeIdx + 1, items.length - 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx = Math.max(activeIdx - 1, 0); }
    else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); items[activeIdx].click(); return; }
    else return;
    items.forEach((it, i) => it.classList.toggle('active', i === activeIdx));
  });

  document.addEventListener('click', function(e) {
    if (!e.target.closest('.city-autocomplete-wrap')) {
      list.classList.remove('open');
      var pList = document.getElementById('profileCityList');
      if (pList) pList.classList.remove('open');
    }
  });
}

function initProfileCityAutocomplete() {
  var input = document.getElementById('profileLocation');
  var list = document.getElementById('profileCityList');
  if (!input || !list) return;
  var activeIdx = -1;

  input.addEventListener('input', function() {
    var q = this.value.trim().toLowerCase();
    if (q.length < 1) { list.classList.remove('open'); list.innerHTML = ''; return; }
    var matches = GERMAN_CITIES.filter(function(c) { return c.name.toLowerCase().startsWith(q); }).slice(0, 8);
    if (matches.length === 0) { list.classList.remove('open'); list.innerHTML = ''; return; }
    activeIdx = -1;
    list.innerHTML = matches.map(function(c) {
      return '<li data-city="' + c.name + '" data-state="' + c.state + '">' + c.name + '<span class="city-state">' + c.state + '</span></li>';
    }).join('');
    list.classList.add('open');
  });

  list.addEventListener('click', function(e) {
    var li = e.target.closest('li');
    if (!li) return;
    input.value = li.dataset.city;
    list.classList.remove('open');
  });

  input.addEventListener('keydown', function(e) {
    var items = list.querySelectorAll('li');
    if (!items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = Math.min(activeIdx + 1, items.length - 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx = Math.max(activeIdx - 1, 0); }
    else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); items[activeIdx].click(); return; }
    else return;
    items.forEach(function(it, i) { it.classList.toggle('active', i === activeIdx); });
  });
}

// ========== TIME PICKER HELPERS ==========
function getTime24(prefix) {
  const h = parseInt(document.getElementById(prefix + 'H').value);
  const m = parseInt(document.getElementById(prefix + 'M').value);
  return { h, m, total: h * 60 + m };
}

function getTimeISO(prefix) {
  const t = getTime24(prefix);
  return String(t.h).padStart(2, '0') + ':' + String(t.m).padStart(2, '0');
}

function calcDuration() {
  const from = getTime24('createTimeFrom');
  const to = getTime24('createTimeTo');
  let diff = to.total - from.total;
  if (diff <= 0) diff += 1440;
  const hours = diff / 60;
  const durInput = document.getElementById('createDuration');
  if (!durInput) return;
  const formatted = hours % 1 === 0 ? hours : hours.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  durInput.value = formatted;
  durInput.dataset.max = hours;
  flashDuration();
}

function flashDuration() {
  var el = document.getElementById('createDuration');
  if (!el) return;
  el.classList.remove('flash');
  void el.offsetWidth;
  el.classList.add('flash');
}

function parseDuration(raw) {
  var s = String(raw).trim();
  // "3:30" or "3,30" → treat as h:mm
  var hm = s.match(/^(\d+)\s*[:,]\s*(\d+)$/);
  if (hm) {
    var h = parseInt(hm[1]);
    var mins = parseInt(hm[2]);
    if (mins >= 60) mins = 59;
    return h + mins / 60;
  }
  // Plain number (allow comma as decimal sep)
  var n = parseFloat(s.replace(',', '.'));
  return isNaN(n) ? null : n;
}

function snapDuration(v) {
  return Math.round(v * 2) / 2; // snap to nearest 0.5
}

function formatDuration(v) {
  return v % 1 === 0 ? String(v) : v.toFixed(1);
}

function clampAndFormat() {
  var durInput = document.getElementById('createDuration');
  if (!durInput) return;
  var maxH = parseFloat(durInput.dataset.max) || 24;
  var parsed = parseDuration(durInput.value);
  if (parsed === null || parsed < 0.5) parsed = 0.5;
  parsed = snapDuration(parsed);
  if (parsed > maxH) parsed = maxH;
  if (parsed < 0.5) parsed = 0.5;
  durInput.value = formatDuration(parsed);
  flashDuration();
}

function initTimePickers() {
  ['createTimeFromH','createTimeFromM',
   'createTimeToH','createTimeToM'].forEach(id => {
    var el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', calcDuration);
      el.addEventListener('input', calcDuration);
    }
  });
  var durInput = document.getElementById('createDuration');
  if (durInput) {
    durInput.addEventListener('blur', clampAndFormat);
    durInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); clampAndFormat(); durInput.blur(); return; }
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      var maxH = parseFloat(durInput.dataset.max) || 24;
      var cur = parseDuration(durInput.value);
      if (cur === null) cur = 0.5;
      cur = snapDuration(cur);
      if (e.key === 'ArrowUp') cur += 0.5;
      else cur -= 0.5;
      if (cur < 0.5) cur = 0.5;
      if (cur > maxH) cur = maxH;
      durInput.value = formatDuration(cur);
      flashDuration();
    });
  }
  // Stepper buttons
  var durUp = document.getElementById('durUp');
  var durDown = document.getElementById('durDown');
  function stepDuration(dir) {
    var maxH = parseFloat(durInput.dataset.max) || 24;
    var cur = parseDuration(durInput.value);
    if (cur === null) cur = 0.5;
    cur = snapDuration(cur) + dir * 0.5;
    if (cur < 0.5) cur = 0.5;
    if (cur > maxH) cur = maxH;
    durInput.value = formatDuration(cur);
    flashDuration();
  }
  if (durUp) durUp.addEventListener('click', function() { stepDuration(1); });
  if (durDown) durDown.addEventListener('click', function() { stepDuration(-1); });
  calcDuration();
}

// ========== FAVORITES ==========
function toggleFavorite(listingId, btn) {
  if (favorites.has(listingId)) {
    favorites.delete(listingId);
    btn.classList.remove('liked');
    btn.querySelector('.material-icons-round').textContent = 'favorite_border';
    showToast('Von Favoriten entfernt', 'favorite_border');
  } else {
    favorites.add(listingId);
    btn.classList.add('liked');
    btn.querySelector('.material-icons-round').textContent = 'favorite';
    showToast('Zu Favoriten hinzugefügt! ❤️', 'favorite');
  }
  _saveFavoritesToStorage();
  // Sync with API if logged in (only for real DB listings)
  if (isLoggedIn) {
    var listing = LISTINGS.find(function(l) { return l.id === listingId; });
    if (listing && listing._fromDb) {
      var dbId = listing._dbId || (listingId - 10000);
      fetch(_apiUrl('favorites/' + dbId), {
        method: 'POST', credentials: 'same-origin', headers: _apiHeaders()
      }).catch(function(){});
    }
  }
  // If on favorites page, re-render the grid immediately
  var favPage = document.getElementById('page-favorites');
  if (favPage && favPage.classList.contains('active')) {
    var grid = document.getElementById('favoritesGrid');
    var emptyState = document.getElementById('favoritesEmpty');
    var favListings = LISTINGS.filter(function(l) { return favorites.has(l.id); });
    if (favListings.length === 0) {
      grid.style.display = 'none';
      emptyState.style.display = 'flex';
    } else {
      grid.style.display = '';
      emptyState.style.display = 'none';
      grid.innerHTML = favListings.map(renderListingCard).join('');
      detectWideBannerCards(grid);
    }
  }
}

function renderFavorites() {
  const grid = document.getElementById('favoritesGrid');
  const emptyState = document.getElementById('favoritesEmpty');

  function doRender() {
    const favListings = LISTINGS.filter(l => favorites.has(l.id));
    if (favListings.length === 0) {
      grid.style.display = 'none';
      emptyState.style.display = 'flex';
    } else {
      grid.style.display = '';
      emptyState.style.display = 'none';
      grid.innerHTML = favListings.map(renderListingCard).join('');
      detectWideBannerCards(grid);
    }
  }

  if (!_dbListingsLoaded) {
    loadDbListings().then(function() {
      return _favoritesLoaded ? Promise.resolve() : loadFavorites();
    }).then(doRender).catch(doRender);
  } else if (isLoggedIn && !_favoritesLoaded) {
    loadFavorites().then(doRender).catch(doRender);
  } else {
    doRender();
  }
}

// ========== MY LISTINGS ==========
function renderMyListings() {
  var grid = document.getElementById('myListingsGrid');
  var emptyState = document.getElementById('myListingsEmpty');
  var header = document.querySelector('#page-my-listings .my-listings-header h1');
  var createBtn = document.querySelector('#page-my-listings .my-listings-header .btn-primary');
  var emptyTitle = document.querySelector('#myListingsEmpty h3');
  var emptyText = document.querySelector('#myListingsEmpty p');
  var emptyBtn = document.querySelector('#myListingsEmpty .btn-primary');

  if (isEventPlaner()) {
    // === EVENT-PLANER VIEW ===
    if (header) header.textContent = 'Meine Events';
    if (createBtn) createBtn.innerHTML = '<span class="material-icons-round">event</span> Neues Event';
    if (emptyTitle) emptyTitle.textContent = 'Noch keine Events';
    if (emptyText) emptyText.textContent = 'Erstelle dein erstes Event und finde die besten Dienstleister.';
    if (emptyBtn) {
      emptyBtn.innerHTML = '<span class="material-icons-round">event</span> Jetzt Event erstellen';
      emptyBtn.setAttribute('onclick', "navigateTo('create-listing')");
    }

    // Preview banner
    var previewBannerEP = document.getElementById('myListingsPreviewBanner');

    if (isLoggedIn) {
      if (previewBannerEP) previewBannerEP.style.display = 'none';
      fetch(_apiUrl('my-listings'), { credentials: 'same-origin', headers: _apiHeaders() })
        .then(function(r) {
          if (!r.ok) throw new Error('API ' + r.status);
          return r.json();
        })
        .then(function(data) {
          if (!Array.isArray(data)) { renderEventGrid([]); return; }
          var myEvents = data.map(function(l) {
            return {
              id: l.id + 10000,
              _dbId: l.id,
              _fromDb: true,
              title: l.title,
              category: l.category,
              categoryLabel: l.categoryLabel || l.category,
              image: (l.images && l.images[0]) || '',
              images: l.images || [],
              location: l.location,
              price: l.price,
              priceLabel: l.priceLabel || (l.price + ' €'),
              rating: parseFloat(l.rating) || 0,
              reviewCount: parseInt(l.reviews) || 0,
              description: l.description,
              providerName: l.providerName
            };
          });
          renderEventGrid(myEvents);
        })
        .catch(function(err) {
          showToast('Events konnten nicht geladen werden. Bitte Seite neu laden.', 'error');
          renderEventGrid([]);
        });
    } else {
      if (previewBannerEP) previewBannerEP.style.display = 'flex';
      var events = DEMO_EVENTS;
      renderEventGrid(events);
    }

    function renderEventGrid(events) {
      if (events.length === 0) {
        grid.style.display = 'none';
        emptyState.style.display = 'flex';
      } else {
        grid.style.display = '';
        emptyState.style.display = 'none';
        grid.innerHTML = events.map(function(evt) {
          // DB events from API
          if (evt._fromDb) {
            return '<div class="my-listing-card">' +
              '<div class="my-listing-img">' +
                '<img src="' + _escHtml(evt.image) + '" alt="' + _escHtml(evt.title) + '" />' +
                '<span class="status-badge status-active">Aktiv</span>' +
              '</div>' +
              '<div class="my-listing-info">' +
                '<h3>' + _escHtml(evt.title) + '</h3>' +
                '<p>' + _escHtml(evt.categoryLabel) + ' · ' + _escHtml(evt.location) + '</p>' +
                '<p class="my-listing-price">' + _escHtml(evt.priceLabel) + '</p>' +
                '<div class="my-listing-stats">' +
                  '<span><span class="material-icons-round">star</span> ' + (evt.rating || 0).toFixed(1) + '/5</span>' +
                  '<span><span class="material-icons-round">rate_review</span> ' + (evt.reviewCount || 0) + ' Bewertungen</span>' +
                '</div>' +
              '</div>' +
              '<div class="my-listing-actions">' +
                '<button class="btn-outline btn-sm" onclick="navigateTo(\'detail\', ' + evt.id + ')">' +
                  '<span class="material-icons-round">visibility</span> Ansehen' +
                '</button>' +
                '<button class="btn-outline btn-sm" onclick="editListing(' + evt.id + ')">' +
                  '<span class="material-icons-round">edit</span> Bearbeiten' +
                '</button>' +
                '<button class="btn-outline btn-sm btn-danger-outline" onclick="deleteListing(' + evt.id + ')">' +
                  '<span class="material-icons-round">delete</span> Löschen' +
                '</button>' +
              '</div>' +
            '</div>';
          }
          // Demo events (logged out preview)
          var statusClass = evt.status === 'In Planung' ? 'status-active' : (evt.status === 'Offen' ? 'status-pending' : 'status-completed');
          var servicesHTML = (evt.bookedServices || []).map(function(s) {
            var sClass = s.status === 'Bestätigt' ? 'status-completed' : (s.status === 'In Verhandlung' ? 'status-pending' : 'status-active');
            return '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:0.85rem;">' +
              '<span>' + s.name + ' <small style="color:var(--text-light)">(' + s.category + ')</small></span>' +
              '<span class="status-badge ' + sClass + '" style="font-size:0.7rem;">' + s.status + '</span>' +
            '</div>';
          }).join('');
          return '<div class="my-listing-card">' +
            '<div class="my-listing-img">' +
              '<img src="' + evt.image + '" alt="' + evt.title + '" />' +
              '<span class="status-badge ' + statusClass + '">' + evt.status + '</span>' +
            '</div>' +
            '<div class="my-listing-info">' +
              '<h3>' + evt.title + '</h3>' +
              '<p>' + evt.type + ' · ' + evt.location + '</p>' +
              '<p class="my-listing-price"><span class="material-icons-round" style="font-size:16px;vertical-align:middle;">event</span> ' + evt.date + ' · ' + evt.guests + ' Gäste</p>' +
              '<p style="font-size:0.85rem;color:var(--text-light);margin-top:2px;">Budget: ' + evt.budget + '</p>' +
              (servicesHTML ? '<div style="margin-top:8px;border-top:1px solid var(--border-light);padding-top:8px;">' +
                '<strong style="font-size:0.78rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--dark);">Gebuchte Services</strong>' +
                servicesHTML +
              '</div>' : '') +
            '</div>' +
            '<div class="my-listing-actions">' +
              '<button class="btn-outline btn-sm" onclick="navigateTo(\'browse\')">' +
                '<span class="material-icons-round">search</span> Services finden' +
              '</button>' +
              '<button class="btn-outline btn-sm" onclick="showToast(\'Event bearbeiten kommt bald!\',\'edit\')">' +
                '<span class="material-icons-round">edit</span> Bearbeiten' +
              '</button>' +
            '</div>' +
          '</div>';
        }).join('');
      }
    }
  } else {
    // === DIENSTLEISTER VIEW ===
    if (header) header.textContent = 'Meine Inserate';
    if (createBtn) createBtn.innerHTML = '<span class="material-icons-round">add_circle</span> Neues Inserat';
    if (emptyTitle) emptyTitle.textContent = 'Noch keine Inserate';
    if (emptyText) emptyText.textContent = 'Erstelle dein erstes Inserat und erreiche tausende potenzielle Kunden.';
    if (emptyBtn) emptyBtn.innerHTML = '<span class="material-icons-round">add_circle</span> Jetzt Inserat erstellen';

    function renderMyGrid(myListings) {
      if (myListings.length === 0) {
        grid.style.display = 'none';
        emptyState.style.display = 'flex';
      } else {
        grid.style.display = '';
        emptyState.style.display = 'none';
        grid.innerHTML = myListings.map(function(l) {
          var rating = l.rating || 0;
          var reviewCount = l.reviewCount || 0;
          return '<div class="my-listing-card">' +
            '<div class="my-listing-img">' +
              '<img src="' + _escHtml(l.image) + '" alt="' + _escHtml(l.title) + '" />' +
              '<span class="status-badge status-active">Aktiv</span>' +
            '</div>' +
            '<div class="my-listing-info">' +
              '<h3>' + _escHtml(l.title) + '</h3>' +
              '<p>' + _escHtml(l.categoryLabel) + ' · ' + _escHtml(l.location) + '</p>' +
              '<p class="my-listing-price">' + _escHtml(l.priceLabel) + '</p>' +
              '<div class="my-listing-stats">' +
                '<span><span class="material-icons-round">star</span> ' + rating.toFixed(1) + '/5</span>' +
                '<span><span class="material-icons-round">rate_review</span> ' + reviewCount + ' Bewertungen</span>' +
              '</div>' +
            '</div>' +
            '<div class="my-listing-actions">' +
              '<button class="btn-outline btn-sm" onclick="navigateTo(\'detail\', ' + l.id + ')">' +
                '<span class="material-icons-round">visibility</span> Ansehen' +
              '</button>' +
              '<button class="btn-outline btn-sm" onclick="editListing(' + l.id + ')">' +
                '<span class="material-icons-round">edit</span> Bearbeiten' +
              '</button>' +
              '<button class="btn-outline btn-sm btn-danger-outline" onclick="deleteListing(' + l.id + ')">' +
                '<span class="material-icons-round">delete</span> Löschen' +
              '</button>' +
            '</div>' +
          '</div>';
        }).join('');
      }
    }

    // Preview banner
    var previewBanner = document.getElementById('myListingsPreviewBanner');

    // Load my listings from API
    if (isLoggedIn) {
      if (previewBanner) previewBanner.style.display = 'none';
      fetch(_apiUrl('my-listings'), { credentials: 'same-origin', headers: _apiHeaders() })
        .then(function(r) {
          if (!r.ok) throw new Error('API ' + r.status);
          return r.json();
        })
        .then(function(data) {
          if (!Array.isArray(data)) { renderMyGrid([]); return; }
          var myListings = data.map(function(l) {
            return {
              id: l.id + 10000,
              _dbId: l.id,
              _fromDb: true,
              title: l.title,
              category: l.category,
              categoryLabel: l.categoryLabel || l.category,
              image: (l.images && l.images[0]) || '',
              images: l.images || [],
              location: l.location,
              price: l.price,
              priceLabel: l.priceLabel || (l.price + ' €'),
              rating: parseFloat(l.rating) || 0,
              reviewCount: parseInt(l.reviews) || 0,
              description: l.description,
              providerName: l.providerName
            };
          });
          renderMyGrid(myListings);
        })
        .catch(function(err) {
          showToast('Inserate konnten nicht geladen werden. Bitte Seite neu laden.', 'error');
          renderMyGrid([]);
        });
    } else {
      // Show demo listings as preview for non-logged-in users
      if (previewBanner) previewBanner.style.display = 'flex';
      var demoListings = LISTINGS.slice(0, 3).map(function(l) {
        return {
          id: l.id,
          title: l.title,
          category: l.category,
          categoryLabel: l.categoryLabel || l.category,
          image: l.image,
          location: l.location,
          price: l.price,
          priceLabel: l.priceLabel,
          rating: l.rating || 0,
          reviewCount: l.reviewCount || 0
        };
      });
      renderMyGrid(demoListings);
    }
  }
}

function editListing(listingId) {
  var listing = LISTINGS.find(function(l) { return l.id === listingId; });
  if (!listing) return;

  // Store editing state and navigate
  window._editingListingId = listingId;
  window._isEditNavigation = true;
  navigateTo('create-listing');
  window._isEditNavigation = false;

  // Update heading & submit button to edit mode
  var heading = document.querySelector('#page-create-listing .create-title');
  if (heading) heading.textContent = isEventPlaner() ? 'Event bearbeiten' : 'Inserat bearbeiten';
  var submitBtn = document.querySelector('#step3 .btn-primary');
  if (submitBtn) submitBtn.innerHTML = '<span class="material-icons-round">save</span> Änderungen speichern';

  // === Step 1: Basics ===
  document.getElementById('createTitle').value = listing.title || '';
  document.getElementById('createCategory').value = listing.category || '';
  document.getElementById('createDescription').value = (listing.description || '').replace(/<\/?p>/g, '\n').replace(/<\/?h3>/g, '').trim();
  document.getElementById('createPrice').value = listing.price || '';
  document.getElementById('createPriceModel').value = listing.priceModel || 'Pro Event';

  // === Step 2: Details ===
  document.getElementById('createRegion').value = listing.region || listing.location || '';
  document.getElementById('createRegionValue').value = listing.region || listing.location || '';

  // Dates via Flatpickr
  var fromEl = document.getElementById('createDateFrom');
  var toEl = document.getElementById('createDateTo');
  if (fromEl && fromEl._flatpickr) {
    fromEl._flatpickr.set('minDate', null);
    if (listing.dateFrom) fromEl._flatpickr.setDate(listing.dateFrom, true);
    else fromEl._flatpickr.clear();
  }
  if (toEl && toEl._flatpickr) {
    toEl._flatpickr.set('minDate', null);
    if (listing.dateTo) toEl._flatpickr.setDate(listing.dateTo, true);
    else toEl._flatpickr.clear();
  }

  // Time fields
  if (listing.timeFrom) {
    var tf = listing.timeFrom.split(':');
    document.getElementById('createTimeFromH').value = parseInt(tf[0]) || 0;
    document.getElementById('createTimeFromM').value = tf[1] || '00';
  }
  if (listing.timeTo) {
    var tt = listing.timeTo.split(':');
    document.getElementById('createTimeToH').value = parseInt(tt[0]) || 0;
    document.getElementById('createTimeToM').value = tt[1] || '00';
  }

  // Duration
  document.getElementById('createDuration').value = listing.duration || 4;

  // Tags checkboxes
  var tagCheckboxes = document.querySelectorAll('#createTags input[type=checkbox]');
  tagCheckboxes.forEach(function(cb) {
    cb.checked = listing.tags && listing.tags.indexOf(cb.value) !== -1;
  });

  // Feature tags — match built-in and add custom
  document.querySelectorAll('#createFeatureTags .feature-tag-custom-item').forEach(function(t) { t.remove(); });
  var featureBtns = document.querySelectorAll('#createFeatureTags .feature-tag');
  var matchedFeatures = [];
  featureBtns.forEach(function(btn) {
    btn.classList.remove('selected');
    if (listing.features && listing.features.indexOf(btn.textContent.trim()) !== -1) {
      btn.classList.add('selected');
      matchedFeatures.push(btn.textContent.trim());
    }
  });
  // Add custom features that weren't in the built-in list
  if (listing.features) {
    var grid = document.getElementById('createFeatureTags');
    listing.features.forEach(function(f) {
      if (matchedFeatures.indexOf(f) === -1) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'feature-tag selected feature-tag-custom-item';
        btn.onclick = function() { toggleFeatureTag(btn); };
        btn.textContent = f;
        grid.appendChild(btn);
      }
    });
  }

  // === Step 3: Images ===
  var preview = document.getElementById('uploadPreview');
  preview.innerHTML = '';
  if (listing.images && listing.images.length > 0) {
    listing.images.forEach(function(url) {
      if (!url) return;
      _addListingPreviewItem(url, null);
    });
  }

  // Show step 1
  document.querySelectorAll('.form-step').forEach(function(s) { s.classList.remove('active'); });
  document.getElementById('step1').classList.add('active');

  showToast('Inserat wird bearbeitet – passe es an und speichere es.', 'edit');
}

function deleteListing(listingId) {
  if (!confirm('Möchtest du dieses Inserat wirklich löschen?')) return;

  var listing = LISTINGS.find(function(l) { return l.id === listingId; });
  var dbId = listing && listing._dbId ? listing._dbId : (listing && listing._fromDb ? listingId - 10000 : null);

  if (dbId) {
    fetch(_apiUrl('listings/' + dbId), {
      method: 'DELETE', credentials: 'same-origin', headers: _apiHeaders()
    }).then(function(r) {
      if (r.ok) {
        var idx = LISTINGS.findIndex(function(l) { return l.id === listingId; });
        if (idx !== -1) LISTINGS.splice(idx, 1);
        renderMyListings();
        showToast('Inserat gelöscht.', 'delete');
      } else {
        showToast('Löschen fehlgeschlagen', 'error');
      }
    }).catch(function() {
      showToast('Löschen fehlgeschlagen', 'error');
    });
  } else {
    var idx = LISTINGS.findIndex(function(l) { return l.id === listingId; });
    if (idx !== -1) {
      LISTINGS.splice(idx, 1);
      renderMyListings();
      showToast('Inserat gelöscht.', 'delete');
    }
  }
}

function adminDeleteListing(listingId) {
  if (!currentUser || !currentUser.isAdmin) return;
  if (!confirm('Als Admin: Dieses Inserat wirklich löschen?')) return;
  var listing = LISTINGS.find(function(l) { return l.id === listingId; });
  var dbId = listing && listing._dbId ? listing._dbId : (listing && listing._fromDb ? listingId - 10000 : null);
  if (!dbId) return showToast('Nur DB-Inserate löschbar', 'error');
  fetch(_apiUrl('listings/' + dbId), {
    method: 'DELETE', credentials: 'same-origin', headers: _apiHeaders()
  }).then(function(r) {
    if (r.ok) {
      var idx = LISTINGS.findIndex(function(l) { return l.id === listingId; });
      if (idx !== -1) LISTINGS.splice(idx, 1);
      showToast('Inserat als Admin gelöscht.', 'delete');
      navigateTo('browse');
    } else { showToast('Löschen fehlgeschlagen', 'error'); }
  }).catch(function() { showToast('Löschen fehlgeschlagen', 'error'); });
}

function adminDeleteUser(userId) {
  if (!currentUser || !currentUser.isAdmin) return;
  if (!confirm('Als Admin: Diesen Nutzer und alle seine Inhalte wirklich löschen?')) return;
  fetch(_apiUrl('admin/delete-user/' + userId), {
    method: 'DELETE', credentials: 'same-origin', headers: _apiHeaders()
  }).then(function(r) {
    _refreshNonce(r);
    if (r.ok) {
      showToast('Nutzer und alle Inhalte gelöscht.', 'delete');
      // Reload admin user list if on admin page
      if (currentPage === 'admin') {
        loadAdminUsers();
      } else {
        loadDbListings().then(function() { navigateTo('browse'); });
      }
    } else {
      r.json().then(function(d) { showToast(d.message || 'Fehler', 'error'); });
    }
  }).catch(function() { showToast('Löschen fehlgeschlagen', 'error'); });
}

// ========== ADMIN PANEL ==========
var _adminUsers = [];

function loadAdminUsers(searchTerm) {
  var url = 'admin/users';
  if (searchTerm) url += '?search=' + encodeURIComponent(searchTerm);
  var list = document.getElementById('adminUserList');
  if (list) list.innerHTML = '<div class="admin-loading"><span class="material-icons-round spin">sync</span> Lade Benutzer…</div>';

  fetch(_apiUrl(url), { credentials: 'same-origin', headers: _apiHeaders() })
    .then(function(r) { _refreshNonce(r); return r.json(); })
    .then(function(users) {
      _adminUsers = users || [];
      renderAdminStats(_adminUsers);
      renderAdminUserList(_adminUsers);
    })
    .catch(function() {
      if (list) list.innerHTML = '<p class="admin-error">Fehler beim Laden der Benutzer.</p>';
    });
}

function renderAdminStats(users) {
  var el = document.getElementById('adminStats');
  if (!el) return;
  var total = users.length;
  var admins = users.filter(function(u) { return u.isAdmin; }).length;
  var listings = users.reduce(function(s, u) { return s + (u.listings || 0); }, 0);
  var reviews = users.reduce(function(s, u) { return s + (u.reviews || 0); }, 0);
  el.innerHTML =
    '<div class="admin-stat"><span class="material-icons-round">people</span><strong>' + total + '</strong><span>Benutzer</span></div>' +
    '<div class="admin-stat"><span class="material-icons-round">shield</span><strong>' + admins + '</strong><span>Admins</span></div>' +
    '<div class="admin-stat"><span class="material-icons-round">storefront</span><strong>' + listings + '</strong><span>Inserate</span></div>' +
    '<div class="admin-stat"><span class="material-icons-round">rate_review</span><strong>' + reviews + '</strong><span>Bewertungen</span></div>';
}

function renderAdminUserList(users) {
  var list = document.getElementById('adminUserList');
  if (!list) return;
  if (!users || !users.length) {
    list.innerHTML = '<p class="admin-empty">Keine Benutzer gefunden.</p>';
    return;
  }
  var html = '';
  users.forEach(function(u) {
    var avatarSrc = u.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(u.login);
    var regDate = u.registered ? new Date(u.registered).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }) : '–';
    var baseRole = u.baseRole || u.role || 'Event-Planer';
    var roleBadge = u.isAdmin
      ? '<span class="admin-role-badge admin-role-admin">Admin</span> <span class="admin-role-badge">' + _escHtml(baseRole) + '</span>'
      : '<span class="admin-role-badge">' + _escHtml(u.role || 'Mitglied') + '</span>';
    var isActive = u.isActive !== false;
    var isSelf = currentUser && currentUser.id === u.id;
    var activeBadge = !isActive ? ' <span class="admin-role-badge admin-role-deactivated">Deaktiviert</span>' : '';
    var cardClass = 'admin-user-card' + (u.isAdmin ? ' is-admin' : '') + (!isActive ? ' is-deactivated' : '');

    // Display name + username
    var realName = '';
    if (u.firstName && u.lastName) realName = u.firstName + ' ' + u.lastName;
    else if (u.firstName) realName = u.firstName;
    else if (u.lastName) realName = u.lastName;
    else realName = u.name || u.login;
    var displayName = _escHtml(realName);
    var loginName = ' <span class="admin-user-login">@' + _escHtml(u.login) + '</span>';

    // Role switch buttons (Dienstleister / Event-Planer)
    var roleSwitcher = '';
    {
      var isDL = baseRole === 'Dienstleister';
      var isEP = baseRole === 'Event-Planer';
      roleSwitcher = '<div class="admin-role-switcher">' +
        '<button class="admin-role-btn' + (isEP ? ' active' : '') + '" onclick="adminChangeRole(' + u.id + ',\'event_planer\')" title="Als Event-Planer setzen">' +
          '<span class="material-icons-round">celebration</span> Event-Planer' +
        '</button>' +
        '<button class="admin-role-btn' + (isDL ? ' active' : '') + '" onclick="adminChangeRole(' + u.id + ',\'dienstleister\')" title="Als Dienstleister setzen">' +
          '<span class="material-icons-round">storefront</span> Dienstleister' +
        '</button>' +
      '</div>';
    }

    // Build action buttons
    var actionBtns = '';
    if (!isSelf) {
      // Activate / Deactivate toggle
      if (!u.isAdmin) {
        if (isActive) {
          actionBtns += '<button class="btn-outline btn-sm admin-deactivate-btn" onclick="adminToggleActive(' + u.id + ')" title="Benutzer deaktivieren">' +
            '<span class="material-icons-round">block</span> Deaktivieren' +
          '</button>';
        } else {
          actionBtns += '<button class="btn-outline btn-sm admin-activate-btn" onclick="adminToggleActive(' + u.id + ')" title="Benutzer aktivieren">' +
            '<span class="material-icons-round">check_circle</span> Aktivieren' +
          '</button>';
        }
      }
      // Admin promote / demote
      if (u.isAdmin) {
        actionBtns += '<button class="btn-outline btn-sm admin-revoke-btn" onclick="adminRevokeAdmin(' + u.id + ')" title="Admin-Rechte entziehen">' +
          '<span class="material-icons-round">remove_moderator</span> Admin entziehen' +
        '</button>';
      } else {
        actionBtns += '<button class="btn-outline btn-sm admin-promote-btn" onclick="adminMakeAdmin(' + u.id + ')" title="Zum Admin ernennen">' +
          '<span class="material-icons-round">admin_panel_settings</span> Zum Admin' +
        '</button>';
      }
      // Delete (only non-admins)
      if (!u.isAdmin) {
        actionBtns += '<button class="btn-outline btn-sm admin-delete-btn" onclick="adminDeleteUser(' + u.id + ')">' +
          '<span class="material-icons-round">delete_forever</span> Löschen' +
        '</button>';
      }
    }

    html += '<div class="' + cardClass + '">' +
      '<div class="admin-user-avatar" onclick="navigateTo(\'provider\',' + u.id + ')">' +
        '<img src="' + _escHtml(avatarSrc) + '" alt="">' +
      '</div>' +
      '<div class="admin-user-info">' +
        '<div class="admin-user-name">' + displayName + loginName + ' ' + roleBadge + activeBadge + '</div>' +
        '<div class="admin-user-meta">' +
          '<span>' + _escHtml(u.email) + '</span>' +
          (u.company ? ' · <span>' + _escHtml(u.company) + '</span>' : '') +
        '</div>' +
        '<div class="admin-user-counts">' +
          '<span><span class="material-icons-round">storefront</span> ' + (u.listings || 0) + '</span>' +
          '<span><span class="material-icons-round">rate_review</span> ' + (u.reviews || 0) + '</span>' +
          '<span><span class="material-icons-round">calendar_today</span> ' + regDate + '</span>' +
        '</div>' +
        roleSwitcher +
      '</div>' +
      '<div class="admin-user-actions">' + actionBtns + '</div>' +
    '</div>';
  });
  list.innerHTML = html;
}

var _adminSearchTimeout = null;
function adminSearchUsers(val) {
  clearTimeout(_adminSearchTimeout);
  _adminSearchTimeout = setTimeout(function() {
    loadAdminUsers(val.trim());
  }, 350);
}

function adminToggleActive(userId) {
  if (!currentUser || !currentUser.isAdmin) return;
  var user = _adminUsers.find(function(u) { return u.id === userId; });
  var isActive = user ? user.isActive !== false : true;
  var action = isActive ? 'deaktivieren' : 'aktivieren';
  if (!confirm('Diesen Benutzer wirklich ' + action + '?')) return;
  fetch(_apiUrl('admin/toggle-active'), {
    method: 'POST', credentials: 'same-origin',
    headers: _apiHeaders(),
    body: JSON.stringify({ user_id: userId })
  }).then(function(r) {
    _refreshNonce(r);
    if (r.ok) return r.json();
    return r.json().then(function(d) { throw new Error(d.message || 'Fehler'); });
  }).then(function(d) {
    showToast('Benutzer ' + (d.isActive ? 'aktiviert' : 'deaktiviert') + '.', d.isActive ? 'success' : 'warning');
    loadAdminUsers();
  }).catch(function(e) { showToast(e.message || 'Fehler beim Umschalten', 'error'); });
}

function adminMakeAdmin(userId) {
  if (!currentUser || !currentUser.isAdmin) return;
  if (!confirm('Diesen Benutzer wirklich zum Admin ernennen?')) return;
  fetch(_apiUrl('admin/make-admin'), {
    method: 'POST', credentials: 'same-origin',
    headers: _apiHeaders(),
    body: JSON.stringify({ user_id: userId })
  }).then(function(r) {
    _refreshNonce(r);
    if (r.ok) return r.json();
    return r.json().then(function(d) { throw new Error(d.message || 'Fehler'); });
  }).then(function(d) {
    showToast(d.name + ' ist jetzt Admin.', 'success');
    loadAdminUsers();
  }).catch(function(e) { showToast(e.message || 'Fehler', 'error'); });
}

function adminRevokeAdmin(userId) {
  if (!currentUser || !currentUser.isAdmin) return;
  if (!confirm('Diesem Benutzer wirklich die Admin-Rechte entziehen?')) return;
  fetch(_apiUrl('admin/revoke-admin'), {
    method: 'POST', credentials: 'same-origin',
    headers: _apiHeaders(),
    body: JSON.stringify({ user_id: userId })
  }).then(function(r) {
    _refreshNonce(r);
    if (r.ok) return r.json();
    return r.json().then(function(d) { throw new Error(d.message || 'Fehler'); });
  }).then(function(d) {
    showToast(d.name + ' ist kein Admin mehr.', 'warning');
    loadAdminUsers();
  }).catch(function(e) { showToast(e.message || 'Fehler', 'error'); });
}

function adminChangeRole(userId, role) {
  if (!currentUser || !currentUser.isAdmin) return;
  var label = role === 'dienstleister' ? 'Dienstleister' : 'Event-Planer';
  fetch(_apiUrl('admin/change-role'), {
    method: 'POST', credentials: 'same-origin',
    headers: _apiHeaders(),
    body: JSON.stringify({ user_id: userId, role: role })
  }).then(function(r) {
    _refreshNonce(r);
    if (r.ok) return r.json();
    return r.json().then(function(d) { throw new Error(d.message || 'Fehler'); });
  }).then(function(d) {
    showToast(d.name + ' ist jetzt ' + label + '.', 'success');
    loadAdminUsers();
  }).catch(function(e) { showToast(e.message || 'Rollenwechsel fehlgeschlagen', 'error'); });
}

// ========== REVIEW SYSTEM ==========
var selectedRating = 0;
// Store user reviews per listing (listingId → array of reviews)
var userReviews = {};

var MONTH_NAMES = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

var RATING_LABELS = {
  1: 'Schlecht',
  2: 'Geht so',
  3: 'Okay',
  4: 'Gut',
  5: 'Ausgezeichnet'
};

function openReviewModal() {
  if (!isLoggedIn) {
    showToast('Bitte melde dich an, um eine Bewertung zu schreiben.', 'warning');
    openModal('loginModal');
    return;
  }
  if (!currentListing) return;

  selectedRating = 0;
  document.getElementById('reviewText').value = '';
  document.getElementById('starRatingLabel').textContent = 'Klicke auf einen Stern';
  var stars = document.querySelectorAll('#starRatingPicker .star-pick');
  stars.forEach(function(s) { s.textContent = '☆'; s.classList.remove('active'); });
  document.getElementById('reviewModalSubtitle').textContent = 'Bewerte „' + currentListing.title + '"';

  openModal('reviewModal');
}

function setRating(value) {
  selectedRating = value;
  var stars = document.querySelectorAll('#starRatingPicker .star-pick');
  stars.forEach(function(s) {
    var v = parseInt(s.getAttribute('data-value'));
    s.textContent = v <= value ? '★' : '☆';
    s.classList.toggle('active', v <= value);
  });
  document.getElementById('starRatingLabel').textContent = RATING_LABELS[value] || '';
}

function hoverRating(value) {
  var stars = document.querySelectorAll('#starRatingPicker .star-pick');
  stars.forEach(function(s) {
    var v = parseInt(s.getAttribute('data-value'));
    s.textContent = v <= value ? '★' : '☆';
  });
}

function resetRatingHover() {
  var stars = document.querySelectorAll('#starRatingPicker .star-pick');
  stars.forEach(function(s) {
    var v = parseInt(s.getAttribute('data-value'));
    s.textContent = v <= selectedRating ? '★' : '☆';
  });
}

function submitReview(e) {
  e.preventDefault();

  if (selectedRating === 0) {
    showToast('Bitte wähle eine Sternbewertung.', 'warning');
    return;
  }

  var text = document.getElementById('reviewText').value.trim();
  if (!text) {
    showToast('Bitte schreibe einen Bewertungstext.', 'warning');
    return;
  }

  if (!currentListing) return;

  var dbId = currentListing._dbId || (currentListing._fromDb ? currentListing.id - 10000 : currentListing.id);

  fetch(_apiUrl('listings/' + dbId + '/reviews'), {
    method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
    body: JSON.stringify({ rating: selectedRating, comment: text })
  })
    .then(function(r) {
      if (!r.ok) return r.json().then(function(d) { throw new Error(d.message || 'Fehler'); });
      return r.json();
    })
    .then(function(data) {
      // Update listing data with server-calculated values
      if (currentListing && data) {
        if (data.rating_avg !== undefined) currentListing.rating = Math.round(data.rating_avg * 10) / 10;
        if (data.review_count !== undefined) currentListing.reviews = data.review_count;
      }
      // Reload reviews from API
      loadDetailReviews(dbId);
      closeModal('reviewModal');
      showToast('Bewertung veröffentlicht! ⭐', 'star');
    })
    .catch(function(err) {
      showToast(err.message || 'Bewertung fehlgeschlagen', 'error');
    });
}

function loadDetailReviews(dbListingId) {
  var url = _apiUrl('listings/' + dbListingId + '/reviews');
  url += (url.indexOf('?') > -1 ? '&' : '?') + '_t=' + Date.now();
  fetch(url, { credentials: 'same-origin', headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' } })
    .then(function(r) {
      if (!r.ok) throw new Error('API error ' + r.status);
      return r.json();
    })
    .then(function(reviews) {
      if (!Array.isArray(reviews)) return; // API returned error object, keep existing data
      var container = document.getElementById('detailReviews');
      if (reviews.length === 0) {
        container.innerHTML =
          '<div style="text-align:center; padding: 40px 20px; color: var(--text-light);">' +
            '<span class="material-icons-round" style="font-size: 48px; margin-bottom: 12px; opacity: 0.4;">rate_review</span>' +
            '<p style="font-size: 1.05rem; font-weight: 600; color: var(--dark); margin-bottom: 6px;">Noch keine Bewertungen</p>' +
            '<p style="font-size: 0.9rem;">Sei der Erste, der eine Bewertung schreibt!</p>' +
          '</div>';
        if (currentListing) {
          currentListing.reviews = 0;
          currentListing.rating = 0;
          document.getElementById('detailRating').textContent = '0';
          document.getElementById('detailReviewCount').textContent = '(0 Bewertungen)';
        }
      } else {
        container.innerHTML = reviews.map(function(r) {
          var avatar = r.photo_url || r.avatar || ('https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(r.author_name || r.name || 'user'));
          var displayName = r.author_name || r.name || 'Anonym';
          var date = r.date || (r.created_at ? new Date(r.created_at).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
          var rating = parseInt(r.rating) || 0;
          var isOwnReview = currentUser && r.user_id && r.user_id === currentUser.id;
          var isListingOwner = currentUser && currentListing && currentListing.providerId === currentUser.id;
          var canDelete = isOwnReview || isListingOwner || (currentUser && currentUser.isAdmin);
          var deleteBtn = canDelete ? '<button onclick="deleteReview(' + r.id + ')" class="review-delete-btn" title="Bewertung löschen"><span class="material-icons-round">close</span></button>' : '';
          return '<div class="review-card">' +
            '<img src="' + _escHtml(avatar) + '" alt="' + _escHtml(displayName) + '" class="review-avatar"' + (r.user_id ? ' style="cursor:pointer" onclick="navigateTo(\'provider\',' + r.user_id + ')"' : '') + ' />' +
            '<div class="review-content">' +
              '<div class="review-top">' +
                '<strong' + (r.user_id ? ' style="cursor:pointer" onclick="navigateTo(\'provider\',' + r.user_id + ')"' : '') + '>' + _escHtml(displayName) + '</strong>' +
                deleteBtn +
              '</div>' +
              '<div class="review-stars">' + _renderStars(rating) + '</div>' +
              '<p class="review-text">' + _escHtml(r.comment || r.text || '') + '</p>' +
              '<span class="review-date">' + _escHtml(date) + '</span>' +
            '</div>' +
          '</div>';
        }).join('');
        if (currentListing) {
          currentListing.reviews = reviews.length;
          var avg = reviews.reduce(function(s, r) { return s + parseInt(r.rating); }, 0) / reviews.length;
          currentListing.rating = Math.round(avg * 10) / 10;
          document.getElementById('detailRating').textContent = currentListing.rating;
          document.getElementById('detailReviewCount').textContent = '(' + reviews.length + ' Bewertungen)';
        }
      }
    })
    .catch(function() { /* API failed — keep existing listing data, don't override */ });
}

function deleteReview(reviewId) {
  _showConfirmDialog('Bewertung löschen', 'Möchtest du diese Bewertung wirklich löschen? Das kann nicht rückgängig gemacht werden.', 'Löschen', function() {
    fetch(_apiUrl('reviews/' + reviewId), {
      method: 'DELETE',
      credentials: 'same-origin',
      headers: _apiHeaders()
    })
    .then(function(r) { return r.json().then(function(d) { return { ok: r.ok, data: d }; }); })
    .then(function(res) {
      if (!res.ok) { showToast(res.data.message || 'Löschen fehlgeschlagen', 'error'); return; }
      showToast('Bewertung gelöscht', 'success');
      // Refresh reviews on current page
      if (currentListing) {
        var dbId = currentListing._dbId || (currentListing._fromDb ? currentListing.id - 10000 : null);
        if (dbId) loadDetailReviews(dbId);
      }
      // Refresh provider page reviews if visible
      var provPage = document.getElementById('page-provider');
      if (provPage && provPage.classList.contains('active')) {
        var puidEl = document.getElementById('providerUserId');
        if (puidEl && puidEl.value) loadProvider(parseInt(puidEl.value));
      }
    })
    .catch(function() { showToast('Löschen fehlgeschlagen', 'error'); });
  });
}

function _showConfirmDialog(title, message, confirmText, onConfirm) {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML =
    '<div style="background:var(--bg);border-radius:var(--radius-lg);padding:28px;max-width:380px;width:90%;box-shadow:var(--shadow-xl);">' +
      '<h3 style="font-size:1.1rem;color:var(--dark);margin-bottom:8px;">' + _escHtml(title) + '</h3>' +
      '<p style="font-size:0.9rem;color:var(--text-light);line-height:1.5;margin-bottom:20px;">' + _escHtml(message) + '</p>' +
      '<div style="display:flex;gap:12px;justify-content:flex-end;">' +
        '<button id="_confirmCancel" style="padding:10px 20px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg);color:var(--text);cursor:pointer;font-size:0.9rem;">Abbrechen</button>' +
        '<button id="_confirmOk" style="padding:10px 20px;border:none;border-radius:var(--radius-sm);background:var(--primary);color:#fff;cursor:pointer;font-size:0.9rem;font-weight:600;">' + _escHtml(confirmText) + '</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  overlay.querySelector('#_confirmCancel').onclick = function() { overlay.remove(); };
  overlay.querySelector('#_confirmOk').onclick = function() { overlay.remove(); onConfirm(); };
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
}

function getAllReviewsForListing(listingId) {
  var reviews = DEMO_REVIEWS.slice();
  if (userReviews[listingId]) {
    reviews = userReviews[listingId].concat(reviews);
  }
  return reviews;
}

function renderDetailReviews(listing) {
  // Try to load from API first for DB listings
  var dbId = listing._dbId || (listing._fromDb ? listing.id - 10000 : null);
  if (dbId) {
    loadDetailReviews(dbId);
    return;
  }
  // Fallback for demo listings
  var container = document.getElementById('detailReviews');
  if (listing.reviews === 0) {
    container.innerHTML =
      '<div style="text-align:center; padding: 40px 20px; color: var(--text-light);">' +
        '<span class="material-icons-round" style="font-size: 48px; margin-bottom: 12px; opacity: 0.4;">rate_review</span>' +
        '<p style="font-size: 1.05rem; font-weight: 600; color: var(--dark); margin-bottom: 6px;">Noch keine Bewertungen</p>' +
        '<p style="font-size: 0.9rem;">Dieser Anbieter ist neu auf Eventbörse. Sei der Erste, der eine Bewertung schreibt!</p>' +
      '</div>';
  } else {
    var allReviews = getAllReviewsForListing(listing.id);
    container.innerHTML = allReviews.map(function(r) {
      return '<div class="review-card">' +
        '<img src="https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(r.avatar) + '" alt="' + _escHtml(r.name) + '" class="review-avatar" />' +
        '<div class="review-content">' +
          '<div class="review-top">' +
            '<strong>' + _escHtml(r.name) + '</strong>' +
          '</div>' +
          '<div class="review-stars">' + _renderStars(r.rating) + '</div>' +
          '<p class="review-text">' + _escHtml(r.text) + '</p>' +
          '<span class="review-date">' + _escHtml(r.date) + '</span>' +
        '</div>' +
      '</div>';
    }).join('');
    // Sync displayed count with actual reviews
    document.getElementById('detailReviewCount').textContent = '(' + allReviews.length + ' Bewertungen)';
  }
}

// ========== AUTH ==========
var currentUser = null;
var _wpNonce = (typeof eventboerseApi !== 'undefined') ? eventboerseApi.nonce : '';
var _pendingOtpLogin = null;
var _conditionalAbort = null;

function _refreshNonce(response) {
  var n = response.headers.get('X-WP-Nonce');
  if (n) _wpNonce = n;
  return response;
}

function _normalizeUserPayload(data, fallback) {
  data = data || {};
  fallback = fallback || {};

  var firstName = data.first_name || fallback.first_name || '';
  var lastName = data.last_name || fallback.last_name || '';
  var fullName = ((firstName || '') + ' ' + (lastName || '')).trim();

  if (!fullName) {
    fullName = data.name || fallback.name || '';
  }

  return {
    id: data.user_id || data.id || fallback.user_id || fallback.id || null,
    name: fullName,
    email: data.email || fallback.email || '',
    role: data.role || fallback.role || 'Event-Planer',
    isAdmin: (data.role === 'Admin') || (fallback.role === 'Admin') || false,
    tagline: data.tagline || fallback.tagline || '',
    location: data.location || fallback.location || '',
    bio: data.bio || fallback.bio || '',
    company: data.company || fallback.company || '',
    gallery: data.gallery || fallback.gallery || [],
    coverUrl: data.coverUrl || fallback.coverUrl || '',
    coverPosY: data.coverPosY || fallback.coverPosY || 50,
    photoUrl: data.photoUrl || fallback.photoUrl || '',
    phone: data.phone || fallback.phone || '',
    since: data.since || fallback.since || '',
    emailVerified: typeof data.emailVerified === 'boolean' ? data.emailVerified : (typeof fallback.emailVerified === 'boolean' ? fallback.emailVerified : true),
    hasPasskey: typeof data.hasPasskey === 'boolean' ? data.hasPasskey : (typeof fallback.hasPasskey === 'boolean' ? fallback.hasPasskey : false),
    passkeyCount: typeof data.passkeyCount === 'number' ? data.passkeyCount : (typeof fallback.passkeyCount === 'number' ? fallback.passkeyCount : 0)
  };
}

function _applyAuthenticatedUser(data, fallback) {
  _wpNonce = data && data.nonce ? data.nonce : _wpNonce;
  currentUser = _normalizeUserPayload(data, fallback);
  return currentUser;
}

function _base64UrlToArrayBuffer(value) {
  if (!value) return new ArrayBuffer(0);
  var normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  while (normalized.length % 4) normalized += '=';
  var binary = atob(normalized);
  var bytes = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function _arrayBufferToBase64Url(buffer) {
  var bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  var binary = '';
  for (var i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function _publicKeyCredentialToJSON(credential) {
  if (credential instanceof ArrayBuffer) {
    return _arrayBufferToBase64Url(credential);
  }
  if (credential instanceof Uint8Array) {
    return _arrayBufferToBase64Url(credential);
  }
  if (Array.isArray(credential)) {
    return credential.map(_publicKeyCredentialToJSON);
  }
  if (credential && typeof credential === 'object') {
    // PublicKeyCredential properties are on the prototype – use getters explicitly
    if (typeof PublicKeyCredential !== 'undefined' && credential instanceof PublicKeyCredential) {
      var obj = {
        id: credential.id,
        rawId: _arrayBufferToBase64Url(credential.rawId),
        type: credential.type
      };
      if (credential.response) {
        obj.response = {};
        if (credential.response.clientDataJSON)
          obj.response.clientDataJSON = _arrayBufferToBase64Url(credential.response.clientDataJSON);
        if (credential.response.attestationObject)
          obj.response.attestationObject = _arrayBufferToBase64Url(credential.response.attestationObject);
        if (credential.response.authenticatorData)
          obj.response.authenticatorData = _arrayBufferToBase64Url(credential.response.authenticatorData);
        if (credential.response.signature)
          obj.response.signature = _arrayBufferToBase64Url(credential.response.signature);
        if (credential.response.userHandle)
          obj.response.userHandle = _arrayBufferToBase64Url(credential.response.userHandle);
        if (typeof credential.response.getTransports === 'function') {
          obj.response.transports = credential.response.getTransports();
        }
      }
      if (credential.authenticatorAttachment)
        obj.authenticatorAttachment = credential.authenticatorAttachment;
      return obj;
    }
    var result = {};
    Object.keys(credential).forEach(function(key) {
      result[key] = _publicKeyCredentialToJSON(credential[key]);
    });
    return result;
  }
  return credential;
}

function _preparePublicKeyOptions(publicKey) {
  var prepared = JSON.parse(JSON.stringify(publicKey || {}));

  if (prepared.challenge) {
    prepared.challenge = _base64UrlToArrayBuffer(prepared.challenge);
  }
  if (prepared.user && prepared.user.id) {
    prepared.user.id = _base64UrlToArrayBuffer(prepared.user.id);
  }
  if (Array.isArray(prepared.excludeCredentials)) {
    prepared.excludeCredentials = prepared.excludeCredentials.map(function(item) {
      return Object.assign({}, item, { id: _base64UrlToArrayBuffer(item.id) });
    });
  }
  if (Array.isArray(prepared.allowCredentials)) {
    prepared.allowCredentials = prepared.allowCredentials.map(function(item) {
      return Object.assign({}, item, { id: _base64UrlToArrayBuffer(item.id) });
    });
  }

  return prepared;
}

function isWebAuthnAvailable() {
  return !!(window.PublicKeyCredential && navigator.credentials && typeof navigator.credentials.create === 'function' && typeof navigator.credentials.get === 'function');
}

function getBiometricLoginLabel() {
  var ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'Mit Face ID anmelden';
  if (/Android/i.test(ua)) return 'Mit Biometrie anmelden';
  return 'Mit Passkey anmelden';
}

function updatePasskeyLoginUi() {
  var btn = document.getElementById('loginPasskeyBtn');
  var text = document.getElementById('loginPasskeyBtnText');
  var hint = document.getElementById('loginPasskeyHint');
  if (!btn || !text || !hint) return;

  text.textContent = getBiometricLoginLabel();

  if (isWebAuthnAvailable()) {
    btn.disabled = false;
    hint.classList.remove('is-disabled');
    hint.textContent = 'Nutze Face ID, Fingerabdruck oder die Geräte-PIN, wenn dein Gerät Passkeys unterstützt.';
  } else {
    btn.disabled = true;
    hint.classList.add('is-disabled');
    hint.textContent = 'Auf diesem Gerät ist kein Passkey-Login verfügbar. Nutze E-Mail, Passwort und den zusätzlichen E-Mail-Code.';
  }
}

// -- Conditional UI: auto-prompt Face ID / biometric via autofill --
async function initConditionalPasskeyLogin() {
  if (isLoggedIn) return;
  if (!isWebAuthnAvailable()) return;
  if (!window.PublicKeyCredential ||
      typeof PublicKeyCredential.isConditionalMediationAvailable !== 'function') return;

  var supported = false;
  try { supported = await PublicKeyCredential.isConditionalMediationAvailable(); } catch (e) {}
  if (!supported) return;

  try {
    var optionsData = await getPasskeyLoginOptions('');

    _conditionalAbort = new AbortController();
    var credential = await navigator.credentials.get({
      publicKey: _preparePublicKeyOptions(optionsData.publicKey),
      mediation: 'conditional',
      signal: _conditionalAbort.signal
    });
    _conditionalAbort = null;

    var response = await fetch(_apiUrl('webauthn/login'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: _apiHeaders(),
      body: JSON.stringify({
        requestId: optionsData.requestId,
        credential: _publicKeyCredentialToJSON(credential)
      })
    });
    _refreshNonce(response);
    var data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Passkey-Anmeldung fehlgeschlagen.');

    _applyAuthenticatedUser(data);
    closeModal('loginModal');
    applyLogin();
    showToast('Willkommen zurück!', 'fingerprint');
  } catch (err) {
    _conditionalAbort = null;
    if (err && err.name !== 'AbortError') {
      // Silently ignore – user may have dismissed or has no passkeys
    }
  }
}

function _passkeyPromptStorageKey() {
  if (!currentUser || !currentUser.id) return '';
  return 'eb_passkey_prompt_dismissed_' + currentUser.id;
}

function shouldPromptPasskeySetup() {
  if (!currentUser) return false;
  if (!currentUser.emailVerified) return false;
  if (currentUser.hasPasskey || (currentUser.passkeyCount || 0) > 0) return false;
  if (!isWebAuthnAvailable()) return false;
  var storageKey = _passkeyPromptStorageKey();
  if (storageKey && localStorage.getItem(storageKey) === '1') return false;
  return true;
}

function maybePromptPasskeySetup() {
  if (!shouldPromptPasskeySetup()) return;
  setTimeout(function() {
    openModal('passkeySetupModal');
  }, 350);
}

function dismissPasskeySetupPrompt() {
  var storageKey = _passkeyPromptStorageKey();
  if (storageKey) localStorage.setItem(storageKey, '1');
  closeModal('passkeySetupModal');
}

async function handlePromptPasskeySetup(btn) {
  try {
    if (btn) _setBtnLoading(btn, true);
    await registerPasskey('Standardgerät');
    var storageKey = _passkeyPromptStorageKey();
    if (storageKey) localStorage.removeItem(storageKey);
    closeModal('passkeySetupModal');
    showToast('Passkey erfolgreich eingerichtet', 'fingerprint');
  } catch (err) {
    showToast(err && err.message ? err.message : 'Passkey konnte nicht eingerichtet werden.', 'error');
  } finally {
    if (btn) _setBtnLoading(btn, false);
  }
}

async function getPasskeyRegisterOptions() {
  var response = await fetch(_apiUrl('webauthn/register-options'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: _apiHeaders()
  });
  _refreshNonce(response);
  var data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Passkey-Optionen konnten nicht geladen werden.');
  return data;
}

async function registerPasskey(label) {
  if (!isWebAuthnAvailable()) throw new Error('Dieses Gerät unterstützt keine Passkeys.');

  var optionsData = await getPasskeyRegisterOptions();
  var credential = await navigator.credentials.create({
    publicKey: _preparePublicKeyOptions(optionsData.publicKey)
  });

  var response = await fetch(_apiUrl('webauthn/register'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: _apiHeaders(),
    body: JSON.stringify({
      label: label || '',
      credential: _publicKeyCredentialToJSON(credential)
    })
  });
  _refreshNonce(response);
  var data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Passkey konnte nicht gespeichert werden.');

  if (currentUser) {
    currentUser.hasPasskey = !!data.hasPasskey;
    currentUser.passkeyCount = data.passkeyCount || 0;
  }

  return data;
}

async function getPasskeyLoginOptions(email) {
  var response = await fetch(_apiUrl('webauthn/login-options'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: _apiHeaders(),
    body: JSON.stringify({ email: (email || '').trim() })
  });
  _refreshNonce(response);
  var data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Passkey-Login konnte nicht vorbereitet werden.');
  return data;
}

async function loginWithPasskey(email) {
  if (!isWebAuthnAvailable()) throw new Error('Dieses Gerät unterstützt keine Passkeys.');

  var optionsData = await getPasskeyLoginOptions(email);
  var credential = await navigator.credentials.get({
    publicKey: _preparePublicKeyOptions(optionsData.publicKey)
  });

  var response = await fetch(_apiUrl('webauthn/login'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: _apiHeaders(),
    body: JSON.stringify({
      requestId: optionsData.requestId,
      credential: _publicKeyCredentialToJSON(credential)
    })
  });
  _refreshNonce(response);
  var data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Passkey-Anmeldung fehlgeschlagen.');

  _applyAuthenticatedUser(data);
  return data;
}

async function handleLoginWithPasskey(btn) {
  if (btn && btn.disabled) return;

  // Cancel conditional mediation if active
  if (_conditionalAbort) {
    _conditionalAbort.abort();
    _conditionalAbort = null;
  }

  try {
    if (btn) _setBtnLoading(btn, true);
    var emailField = document.getElementById('loginEmail');
    var email = emailField ? emailField.value.trim() : '';
    await loginWithPasskey(email);

    closeModal('loginModal');
    var form = document.querySelector('#loginModal .modal-form');
    if (form) form.reset();
    applyLogin();
    showToast('Passkey-Anmeldung erfolgreich', 'fingerprint');
  } catch (err) {
    showToast(err && err.message ? err.message : 'Passkey-Anmeldung fehlgeschlagen.', 'error');
  } finally {
    if (btn) _setBtnLoading(btn, false);
  }
}

async function sendEmailOtp(email, password) {
  var payload = {
    email: (email || '').trim()
  };

  if (password) payload.password = password;

  var response = await fetch(_apiUrl('otp/send'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: _apiHeaders(),
    body: JSON.stringify(payload)
  });
  var data = await response.json();
  if (!response.ok) throw new Error(data.message || 'E-Mail-Code konnte nicht gesendet werden.');
  return data;
}

async function resendEmailOtp(email, resendToken) {
  var response = await fetch(_apiUrl('otp/send'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: _apiHeaders(),
    body: JSON.stringify({
      email: (email || '').trim(),
      resend: true,
      resend_token: resendToken || ''
    })
  });
  var data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Code konnte nicht erneut gesendet werden.');
  return data;
}

async function verifyEmailOtp(email, code) {
  var response = await fetch(_apiUrl('otp/verify'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: _apiHeaders(),
    body: JSON.stringify({
      email: (email || '').trim(),
      code: (code || '').trim()
    })
  });
  var data = await response.json();
  if (!response.ok) throw new Error(data.message || 'E-Mail-Code ist ungültig.');

  _applyAuthenticatedUser(data);
  return data;
}

function openLoginOtpModal(email, password) {
  _pendingOtpLogin = {
    email: (email || '').trim(),
    resendToken: password && typeof password === 'object' ? password.resendToken || '' : ''
  };

  var emailText = document.getElementById('loginOtpEmailText');
  var codeInput = document.getElementById('loginOtpCode');
  if (emailText) emailText.textContent = _pendingOtpLogin.email || 'deine E-Mail';
  if (codeInput) codeInput.value = '';
  closeModal('loginModal');
  openModal('loginOtpModal');
}

function cancelLoginOtpFlow() {
  _pendingOtpLogin = null;
  closeModal('loginOtpModal');
}

async function resendLoginOtp(btn) {
  if (!_pendingOtpLogin || !_pendingOtpLogin.email || !_pendingOtpLogin.resendToken) {
    showToast('Bitte starte die Anmeldung erneut.', 'warning');
    cancelLoginOtpFlow();
    openModal('loginModal');
    return;
  }

  try {
    if (btn) _setBtnLoading(btn, true);
    var data = await resendEmailOtp(_pendingOtpLogin.email, _pendingOtpLogin.resendToken);
    _pendingOtpLogin.resendToken = data.resendToken || _pendingOtpLogin.resendToken;
    showToast('Neuer E-Mail-Code wurde gesendet.', 'mark_email_read');
  } catch (err) {
    showToast(err && err.message ? err.message : 'Code konnte nicht erneut gesendet werden.', 'error');
  } finally {
    if (btn) _setBtnLoading(btn, false);
  }
}

async function handleLoginOtpVerify(e) {
  e.preventDefault();
  var form = e.target;
  _clearFieldErrors(form);

  if (!_pendingOtpLogin || !_pendingOtpLogin.email) {
    showToast('Bitte starte die Anmeldung erneut.', 'warning');
    cancelLoginOtpFlow();
    openModal('loginModal');
    return;
  }

  var code = document.getElementById('loginOtpCode').value.trim();
  var submitBtn = form.querySelector('button[type="submit"]');

  if (!/^\d{6}$/.test(code)) {
    _setFieldError('loginOtpCode', 'Bitte gib den 6-stelligen Code ein.');
    return;
  }

  try {
    _setBtnLoading(submitBtn, true);
    await verifyEmailOtp(_pendingOtpLogin.email, code);
    _pendingOtpLogin = null;
    closeModal('loginOtpModal');
    form.reset();
    applyLogin();
    showToast('Anmeldung erfolgreich bestätigt', 'mark_email_read');
    maybePromptPasskeySetup();
  } catch (err) {
    _setFieldError('loginOtpCode', err && err.message ? err.message : 'Code ist ungültig.');
  } finally {
    _setBtnLoading(submitBtn, false);
  }
}

async function loadPasskeyCredentials() {
  var response = await fetch(_apiUrl('webauthn/credentials'), {
    method: 'GET',
    credentials: 'same-origin',
    headers: _apiHeaders()
  });
  _refreshNonce(response);
  var data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Passkeys konnten nicht geladen werden.');

  if (currentUser) {
    currentUser.hasPasskey = !!data.hasPasskey;
    currentUser.passkeyCount = data.passkeyCount || 0;
  }

  return data;
}

async function deletePasskeyCredential(credentialId) {
  var response = await fetch(_apiUrl('webauthn/credentials/' + encodeURIComponent(credentialId)), {
    method: 'DELETE',
    credentials: 'same-origin',
    headers: _apiHeaders()
  });
  _refreshNonce(response);
  var data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Passkey konnte nicht gelöscht werden.');

  if (currentUser) {
    currentUser.hasPasskey = !!data.hasPasskey;
    currentUser.passkeyCount = data.passkeyCount || 0;
  }

  return data;
}

function _apiUrl(endpoint) {
  if (typeof eventboerseApi !== 'undefined' && eventboerseApi.restUrl) {
    return eventboerseApi.restUrl + endpoint;
  }
  return '/wp-json/eventboerse/v1/' + endpoint;
}

function _apiHeaders() {
  var h = { 'Content-Type': 'application/json' };
  if (_wpNonce) h['X-WP-Nonce'] = _wpNonce;
  return h;
}

function _renderStars(rating) {
  var r = Math.max(0, Math.min(5, parseFloat(rating) || 0));
  var full = Math.floor(r);
  var half = (r - full) >= 0.25 && (r - full) < 0.75 ? 1 : 0;
  if ((r - full) >= 0.75) { full++; half = 0; }
  var empty = 5 - full - half;
  var html = '';
  for (var i = 0; i < full; i++) html += '<span class="material-icons-round" style="font-size:inherit;vertical-align:middle">star</span>';
  if (half) html += '<span class="material-icons-round" style="font-size:inherit;vertical-align:middle">star_half</span>';
  for (var j = 0; j < empty; j++) html += '<span class="material-icons-round" style="font-size:inherit;vertical-align:middle">star_border</span>';
  return html;
}

function _escHtml(str) {
  var d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function _stripHtml(str) {
  if (!str) return '';
  var doc = new DOMParser().parseFromString(str, 'text/html');
  return doc.body.textContent || '';
}

function _sanitizeHtml(str) {
  if (!str) return '';
  var allowed = ['P','BR','B','STRONG','I','EM','U','UL','OL','LI','H1','H2','H3','H4','H5','H6','A','BLOCKQUOTE','SPAN','DIV','HR'];
  var doc = new DOMParser().parseFromString(str, 'text/html');
  function clean(parent) {
    Array.from(parent.childNodes).forEach(function(n) {
      if (n.nodeType === 3) return;
      if (n.nodeType !== 1) { n.remove(); return; }
      if (allowed.indexOf(n.tagName) === -1) { n.remove(); return; }
      Array.from(n.attributes).forEach(function(a) {
        if (n.tagName === 'A' && (a.name === 'href' || a.name === 'target' || a.name === 'rel')) return;
        n.removeAttribute(a.name);
      });
      if (n.tagName === 'A') {
        n.setAttribute('rel', 'noopener noreferrer');
        n.setAttribute('target', '_blank');
      }
      clean(n);
    });
  }
  clean(doc.body);
  return doc.body.innerHTML;
}

function isEventPlaner() {
  return currentUser && currentUser.role === 'Event-Planer';
}

function applyLogin() {
  isLoggedIn = true;
  document.getElementById('loggedOutMenu').style.display = 'none';
  document.getElementById('loggedInMenu').style.display = 'block';
  if (currentUser) {
    var avatarUrl = currentUser.photoUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(currentUser.name);
    var navAvatar = document.querySelector('#avatarBtn img');
    if (navAvatar) navAvatar.src = avatarUrl;
    var adminLabel = document.getElementById('navAdminLabel');
    if (adminLabel) adminLabel.style.display = currentUser.isAdmin ? 'block' : 'none';
    var adminMenuBtn = document.getElementById('adminMenuBtn');
    if (adminMenuBtn) adminMenuBtn.style.display = currentUser.isAdmin ? 'flex' : 'none';
  }
  var createPage = document.getElementById('page-create-listing');
  if (createPage && createPage.classList.contains('active')) updateCreateFormForRole();
  var menuCreateBtn = document.querySelector('#loggedInMenu button[onclick*="create-listing"]');
  var menuMyListBtn = document.querySelector('#loggedInMenu button[onclick*="my-listings"]');
  if (isEventPlaner()) {
    if (menuCreateBtn) menuCreateBtn.innerHTML = '<span class="material-icons-round">event</span> Event erstellen';
    if (menuMyListBtn) menuMyListBtn.innerHTML = '<span class="material-icons-round">event_note</span> Meine Events';
  } else {
    if (menuCreateBtn) menuCreateBtn.innerHTML = '<span class="material-icons-round">add_circle</span> Inserat erstellen';
    if (menuMyListBtn) menuMyListBtn.innerHTML = '<span class="material-icons-round">storefront</span> Meine Inserate';
  }
  // Update mobile nav labels for role
  var mobileCreateBtn = document.querySelector('#mobileNav button[data-page="create-listing"]');
  if (mobileCreateBtn) {
    var mobileLabel = mobileCreateBtn.querySelector('span:last-child');
    var mobileIcon = mobileCreateBtn.querySelector('.material-icons-round');
    if (isEventPlaner()) {
      if (mobileIcon) mobileIcon.textContent = 'event';
      if (mobileLabel) mobileLabel.textContent = 'Event';
    } else {
      if (mobileIcon) mobileIcon.textContent = 'add_circle';
      if (mobileLabel) mobileLabel.textContent = 'Inserieren';
    }
  }
  // Restore favorites from localStorage first (instant), then merge API data
  _loadFavoritesFromStorage();
  loadFavorites().catch(function(){});
  loadDbListings().then(function() {
    renderFeaturedGrid();
    renderHeroMarquees();
  }).catch(function(){});
  // Update message badge from API
  fetch(_apiUrl('conversations'), { credentials: 'same-origin', headers: _apiHeaders() })
    .then(function(r) { return r.json(); })
    .then(function(convos) {
      var total = (convos || []).reduce(function(sum, c) { return sum + (parseInt(c.unread_count) || 0); }, 0);
      updateMsgBadge(total);
    })
    .catch(function() { updateMsgBadge(0); });
  // Start presence heartbeat
  _startHeartbeat();
}

function applyLogout() {
  isLoggedIn = false;
  currentUser = null;
  _stopHeartbeat();
  _dbListingsLoaded = false;
  _favoritesLoaded = false;
  favorites.clear();
  // Don't clear localStorage — favorites persist for next login
  updateMsgBadge(0);
  document.getElementById('loggedOutMenu').style.display = 'block';
  document.getElementById('loggedInMenu').style.display = 'none';
  document.getElementById('userMenu').classList.remove('show');
  var navAvatar = document.querySelector('#avatarBtn img');
  if (navAvatar) navAvatar.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1';
  var adminLabel = document.getElementById('navAdminLabel');
  if (adminLabel) adminLabel.style.display = 'none';
  var adminMenuBtn = document.getElementById('adminMenuBtn');
  if (adminMenuBtn) adminMenuBtn.style.display = 'none';
  // Reset mobile nav labels
  var mobileCreateBtn = document.querySelector('#mobileNav button[data-page="create-listing"]');
  if (mobileCreateBtn) {
    var mobileIcon = mobileCreateBtn.querySelector('.material-icons-round');
    var mobileLabel = mobileCreateBtn.querySelector('span:last-child');
    if (mobileIcon) mobileIcon.textContent = 'add_circle';
    if (mobileLabel) mobileLabel.textContent = 'Inserieren';
  }
}

// -- Hilfsfunktionen für Formular-Feedback --
function _setFieldError(inputId, msg) {
  var input = document.getElementById(inputId);
  if (!input) return;
  var group = input.closest('.form-group');
  if (!group) return;
  group.classList.add('has-error');
  var existing = group.querySelector('.field-error');
  if (existing) existing.remove();
  if (msg) {
    var el = document.createElement('span');
    el.className = 'field-error';
    el.textContent = msg;
    group.appendChild(el);
  }
}

function _clearFieldErrors(formEl) {
  if (!formEl) return;
  formEl.querySelectorAll('.has-error').forEach(function(g) { g.classList.remove('has-error'); });
  formEl.querySelectorAll('.field-error').forEach(function(e) { e.remove(); });
}

function _setBtnLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.dataset.origText = btn.innerHTML;
    btn.disabled = true;
    btn.classList.add('btn-loading');
    btn.innerHTML = '<span class="material-icons-round btn-spinner">sync</span>';
  } else {
    btn.disabled = false;
    btn.classList.remove('btn-loading');
    btn.innerHTML = btn.dataset.origText || btn.innerHTML;
  }
}

// -- PASSWORD STRENGTH --
function checkPasswordStrength(pw) {
  var score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 'weak', label: 'Schwach', pct: 20 };
  if (score <= 2) return { level: 'fair', label: 'Mittel', pct: 40 };
  if (score <= 3) return { level: 'good', label: 'Gut', pct: 70 };
  return { level: 'strong', label: 'Stark', pct: 100 };
}

function initPasswordFields() {
  // Passwort-Sichtbarkeit-Toggle
  document.querySelectorAll('.password-wrapper').forEach(function(wrapper) {
    var input = wrapper.querySelector('input');
    var toggle = wrapper.querySelector('.password-toggle');
    if (toggle && input) {
      toggle.addEventListener('click', function() {
        var isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        toggle.querySelector('.material-icons-round').textContent = isPassword ? 'visibility_off' : 'visibility';
      });
    }
  });
  // Passwortstärke-Anzeige
  var regPw = document.getElementById('regPassword');
  if (regPw) {
    regPw.addEventListener('input', function() {
      var bar = document.getElementById('passwordStrength');
      if (!bar) return;
      if (!regPw.value) { bar.style.display = 'none'; return; }
      bar.style.display = 'flex';
      var s = checkPasswordStrength(regPw.value);
      bar.querySelector('.pw-bar-fill').style.width = s.pct + '%';
      bar.querySelector('.pw-bar-fill').className = 'pw-bar-fill pw-' + s.level;
      bar.querySelector('.pw-label').textContent = s.label;
    });
  }
}

// ---- SESSION RESTORE (bei Seitenaufruf) ----
function restoreSession() {
  // Sofort aus wp_localize_script lesen
  if (typeof eventboerseApi !== 'undefined' && eventboerseApi.isLoggedIn && eventboerseApi.user) {
    currentUser = _normalizeUserPayload(eventboerseApi.user);
    applyLogin();
    return;
  }
  // Fallback: REST /me prüfen (z. B. wenn aus Cache geladen)
  fetch(_apiUrl('me'), { credentials: 'same-origin', headers: _apiHeaders() })
    .then(function(r) { _refreshNonce(r); return r.json(); })
    .then(function(data) {
      if (data && data.loggedIn) {
        _applyAuthenticatedUser(data);
        applyLogin();
      }
    })
    .catch(function() { /* kein Backend – Seite bleibt abgemeldet */ });
}

// ---- LOGIN ----
async function handleLogin(e) {
  e.preventDefault();
  var form = e.target;
  _clearFieldErrors(form);

  var email = document.getElementById('loginEmail').value.trim();
  var password = document.getElementById('loginPassword').value.trim();
  var submitBtn = form.querySelector('button[type="submit"]');

  // Client-Validierung
  var hasError = false;
  if (!email) { _setFieldError('loginEmail', 'E-Mail ist erforderlich'); hasError = true; }
  if (!password) { _setFieldError('loginPassword', 'Passwort ist erforderlich'); hasError = true; }
  if (hasError) return;

  _setBtnLoading(submitBtn, true);

  try {
    var otpData = await sendEmailOtp(email, password);
    _setBtnLoading(submitBtn, false);
    form.reset();
    openLoginOtpModal(email, otpData);
    showToast('Wir haben dir einen E-Mail-Code gesendet.', 'mark_email_unread');
  } catch (err) {
    _setBtnLoading(submitBtn, false);
    var msg = err && err.message ? err.message : 'Verbindungsfehler – bitte versuche es erneut.';
    if (msg.toLowerCase().indexOf('bestätige') >= 0 || msg.toLowerCase().indexOf('postfach') >= 0) {
      _setFieldError('loginPassword', msg);
      var errSpan = form.querySelector('#loginPassword').closest('.form-group').querySelector('.field-error');
      if (errSpan) {
        errSpan.textContent = msg + ' ';
        var resendLink = document.createElement('a');
        resendLink.href = '#';
        resendLink.style.cssText = 'color:var(--primary);font-weight:600';
        resendLink.textContent = 'Bestätigungs-E-Mail erneut senden';
        resendLink.onclick = function(ev) { ev.preventDefault(); resendVerification(email); };
        errSpan.appendChild(document.createElement('br'));
        errSpan.appendChild(resendLink);
      }
    } else {
      _setFieldError('loginPassword', msg);
    }
  }
}

// ---- REGISTRIERUNG ----
async function handleRegister(e) {
  e.preventDefault();
  var form = e.target;
  _clearFieldErrors(form);

  var firstName = document.getElementById('regFirstName').value.trim();
  var lastName = document.getElementById('regLastName').value.trim();
  var email = document.getElementById('regEmail').value.trim();
  var password = document.getElementById('regPassword').value.trim();
  var activeRole = document.querySelector('.role-btn.active');
  var role = activeRole ? (activeRole.textContent.trim().indexOf('Dienstleister') >= 0 ? 'provider' : 'user') : 'user';
  var termsBox = form.querySelector('.terms input[type="checkbox"]');
  var submitBtn = form.querySelector('button[type="submit"]');

  // Client-Validierung
  var hasError = false;
  if (!firstName) { _setFieldError('regFirstName', 'Vorname ist erforderlich'); hasError = true; }
  if (!lastName) { _setFieldError('regLastName', 'Nachname ist erforderlich'); hasError = true; }
  if (!email) { _setFieldError('regEmail', 'E-Mail ist erforderlich'); hasError = true; }
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { _setFieldError('regEmail', 'Ungültige E-Mail-Adresse'); hasError = true; }
  if (!password || password.length < 8) { _setFieldError('regPassword', 'Min. 8 Zeichen erforderlich'); hasError = true; }
  if (termsBox && !termsBox.checked) {
    var termsLabel = form.querySelector('.terms');
    if (termsLabel) { termsLabel.classList.add('has-error'); }
    hasError = true;
  }
  var gewerbeBox = document.getElementById('regGewerbe');
  if (role === 'provider' && gewerbeBox && !gewerbeBox.checked) {
    var gewerbeLabel = document.getElementById('regGewerbeLabel');
    if (gewerbeLabel) { gewerbeLabel.classList.add('has-error'); }
    hasError = true;
  }
  if (hasError) return;

  _setBtnLoading(submitBtn, true);

  try {
    var response = await fetch(_apiUrl('register'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: _apiHeaders(),
      body: JSON.stringify({
        email: email,
        password: password,
        role: role,
        first_name: firstName,
        last_name: lastName
      })
    });
    var data = await response.json();

    if (response.ok) {
      _setBtnLoading(submitBtn, false);

      // E-Mail-Verifizierung erforderlich
      if (data.pending_verification) {
        closeModal('registerModal');
        form.reset();
        var strengthBar = document.getElementById('passwordStrength');
        if (strengthBar) strengthBar.style.display = 'none';
        // Passkey-Verifizierung anbieten
        _pendingVerifyToken = data.verify_token || null;
        if (_pendingVerifyToken && isWebAuthnAvailable()) {
          openModal('verifyModal');
        } else {
          showToast('Bitte überprüfe dein E-Mail-Postfach und bestätige deine E-Mail-Adresse.', 'mark_email_read');
        }
        return;
      }

      _applyAuthenticatedUser(data, {
        first_name: firstName,
        last_name: lastName,
        email: email,
        role: role === 'provider' ? 'Dienstleister' : 'Event-Planer'
      });
      closeModal('registerModal');
      form.reset();
      var strengthBar = document.getElementById('passwordStrength');
      if (strengthBar) strengthBar.style.display = 'none';
      applyLogin();
      showToast('Willkommen bei Eventbörse, ' + firstName + '!', 'celebration');
    } else {
      _setBtnLoading(submitBtn, false);
      var msg = data.message || 'Registrierung fehlgeschlagen.';
      // Versuche Fehler dem richtigen Feld zuzuordnen
      if (msg.toLowerCase().indexOf('e-mail') >= 0 || msg.toLowerCase().indexOf('email') >= 0) {
        _setFieldError('regEmail', msg);
      } else if (msg.toLowerCase().indexOf('passwort') >= 0 || msg.toLowerCase().indexOf('password') >= 0) {
        _setFieldError('regPassword', msg);
      } else {
        _setFieldError('regEmail', msg);
      }
    }
  } catch (err) {
    _setBtnLoading(submitBtn, false);
    _setFieldError('regEmail', 'Verbindungsfehler – bitte versuche es erneut.');
  }
}

// ---- PASSKEY-VERIFIZIERUNG NACH REGISTRIERUNG ----
var _pendingVerifyToken = null;

async function verifyWithPasskey() {
  if (!_pendingVerifyToken) {
    showToast('Verifizierungstoken fehlt. Bitte melde dich mit E-Mail-Code an.', 'error');
    closeModal('verifyModal');
    return;
  }

  var btn = document.getElementById('verifyWithPasskeyBtn');
  try {
    if (btn) _setBtnLoading(btn, true);

    // 1. Optionen holen
    var optResp = await fetch(_apiUrl('webauthn/verify-options'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verify_token: _pendingVerifyToken })
    });
    var optData = await optResp.json();
    if (!optResp.ok) throw new Error(optData.message || 'Passkey-Optionen konnten nicht geladen werden.');

    // 2. Passkey erstellen (Browser-Dialog)
    var credential = await navigator.credentials.create({
      publicKey: _preparePublicKeyOptions(optData.publicKey)
    });

    // 3. Registrierung + Verifizierung abschließen
    var regResp = await fetch(_apiUrl('webauthn/verify-register'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verify_token: _pendingVerifyToken,
        credential: _publicKeyCredentialToJSON(credential)
      })
    });
    _refreshNonce(regResp);
    var regData = await regResp.json();
    if (!regResp.ok) throw new Error(regData.message || 'Verifizierung fehlgeschlagen.');

    // Erfolg – einloggen
    _pendingVerifyToken = null;
    _applyAuthenticatedUser(regData);
    closeModal('verifyModal');
    applyLogin();
    showToast('Konto verifiziert – willkommen bei Eventbörse!', 'verified');
  } catch (err) {
    if (btn) _setBtnLoading(btn, false);
    var msg = err && err.message ? err.message : 'Passkey-Verifizierung fehlgeschlagen.';
    if (msg.indexOf('denied') >= 0 || msg.indexOf('cancel') >= 0 || msg.indexOf('abort') >= 0 || msg.indexOf('NotAllowed') >= 0) {
      showToast('Passkey-Vorgang abgebrochen.', 'info');
    } else {
      showToast(msg, 'error');
    }
  }
}

// ---- BESTÄTIGUNGS-E-MAIL ERNEUT SENDEN ----
async function resendVerification(email) {
  try {
    var response = await fetch(_apiUrl('resend-verification'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: _apiHeaders(),
      body: JSON.stringify({ email: email })
    });
    var data = await response.json();
    showToast(data.message || 'Bestätigungs-E-Mail wurde erneut gesendet.', 'mark_email_read');
  } catch (err) {
    showToast('Fehler beim Senden. Bitte versuche es später erneut.', 'error');
  }
}

// ---- E-MAIL-VERIFIZIERUNG: URL-PARAMETER PRÜFEN ----
// ---- PASSWORT-RESET: URL-PARAMETER PRÜFEN ----
(function checkUrlParams() {
  var params = new URLSearchParams(window.location.search);

  // E-Mail verifiziert
  if (params.get('email_verified') === '1') {
    var verifiedEmail = params.get('verified_email') || '';
    var url = new URL(window.location);
    url.searchParams.delete('email_verified');
    url.searchParams.delete('verified_email');
    window.history.replaceState({}, '', url.pathname + url.search);
    setTimeout(function() {
      showToast('E-Mail erfolgreich bestätigt. Melde dich jetzt an, danach kannst du direkt deinen Passkey einrichten.', 'check_circle');
      openModal('loginModal');
      if (verifiedEmail) {
        var loginEmail = document.getElementById('loginEmail');
        if (loginEmail) {
          loginEmail.value = decodeURIComponent(verifiedEmail);
          loginEmail.focus();
        }
      }
    }, 500);
  }

  // Passwort-Reset-Link aus E-Mail
  if (params.get('reset_password') === '1') {
    var token = params.get('token') || '';
    var uid = params.get('uid') || '';
    // Parameter aus URL entfernen
    var url2 = new URL(window.location);
    url2.searchParams.delete('reset_password');
    url2.searchParams.delete('token');
    url2.searchParams.delete('uid');
    window.history.replaceState({}, '', url2.pathname + url2.search);
    // Token + UID im Modal speichern
    window._resetToken = token;
    window._resetUid = uid;
    setTimeout(function() {
      openModal('resetPasswordModal');
    }, 500);
  }
})();

// ---- NEUES PASSWORT SETZEN ----
async function handleResetPassword(e) {
  e.preventDefault();
  var form = e.target;
  _clearFieldErrors(form);

  var password = document.getElementById('resetNewPassword').value.trim();
  var confirm = document.getElementById('resetConfirmPassword').value.trim();
  var submitBtn = form.querySelector('button[type="submit"]');
  var successMsg = document.getElementById('resetSuccess');

  var hasError = false;
  if (!password || password.length < 8) { _setFieldError('resetNewPassword', 'Min. 8 Zeichen erforderlich'); hasError = true; }
  if (password !== confirm) { _setFieldError('resetConfirmPassword', 'Passwörter stimmen nicht überein'); hasError = true; }
  if (hasError) return;

  if (!window._resetToken || !window._resetUid) {
    _setFieldError('resetNewPassword', 'Ungültiger Reset-Link. Bitte fordere einen neuen an.');
    return;
  }

  _setBtnLoading(submitBtn, true);

  try {
    var response = await fetch(_apiUrl('reset-password'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: _apiHeaders(),
      body: JSON.stringify({
        token: window._resetToken,
        uid: parseInt(window._resetUid),
        password: password
      })
    });
    var data = await response.json();
    _setBtnLoading(submitBtn, false);

    if (response.ok) {
      if (successMsg) {
        successMsg.style.display = 'block';
        successMsg.textContent = data.message || 'Passwort erfolgreich geändert!';
      }
      submitBtn.style.display = 'none';
      form.querySelectorAll('.form-group').forEach(function(g) { g.style.display = 'none'; });
      window._resetToken = null;
      window._resetUid = null;
      // Nach 2 Sekunden zum Login weiterleiten
      setTimeout(function() {
        closeModal('resetPasswordModal');
        openModal('loginModal');
      }, 2000);
    } else {
      _setFieldError('resetNewPassword', data.message || 'Fehler beim Zurücksetzen.');
    }
  } catch (err) {
    _setBtnLoading(submitBtn, false);
    _setFieldError('resetNewPassword', 'Verbindungsfehler – bitte versuche es erneut.');
  }
}

// ---- PASSWORT VERGESSEN ----
async function handleForgotPassword(e) {
  e.preventDefault();
  var form = e.target;
  _clearFieldErrors(form);

  var email = document.getElementById('forgotEmail').value.trim();
  var submitBtn = form.querySelector('button[type="submit"]');
  var successMsg = document.getElementById('forgotSuccess');

  if (!email) { _setFieldError('forgotEmail', 'E-Mail ist erforderlich'); return; }

  _setBtnLoading(submitBtn, true);

  try {
    var response = await fetch(_apiUrl('forgot-password'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: _apiHeaders(),
      body: JSON.stringify({ email: email })
    });
    var data = await response.json();
    _setBtnLoading(submitBtn, false);

    // Immer Erfolg zeigen (aus Sicherheitsgründen)
    if (successMsg) {
      successMsg.style.display = 'block';
      successMsg.textContent = data.message || 'Falls ein Konto mit dieser E-Mail existiert, erhältst du eine E-Mail zum Zurücksetzen.';
    }
    submitBtn.style.display = 'none';
    form.querySelector('.form-group').style.display = 'none';
  } catch (err) {
    _setBtnLoading(submitBtn, false);
    _setFieldError('forgotEmail', 'Verbindungsfehler – bitte versuche es erneut.');
  }
}

// ---- SOCIAL LOGIN (vorerst Hinweis anzeigen) ----
function socialLogin(provider) {
  showToast(provider + '-Anmeldung kommt bald!', 'info');
}

function loadProfile() {
  // Now merged into renderDashboard (Profilauftritt)
  renderDashboard();
}

function saveProfile() {
  if (!currentUser) return;
  currentUser.name = document.getElementById('profileName').value.trim();
  currentUser.company = document.getElementById('profileCompany').value.trim();
  currentUser.tagline = document.getElementById('profileTagline').value.trim();
  currentUser.location = document.getElementById('profileLocation').value.trim();
  currentUser.bio = document.getElementById('profileBio').value.trim();
  var galleryImgs = document.querySelectorAll('#galleryPreview .upload-preview-item img');
  currentUser.gallery = Array.from(galleryImgs).map(function(img) { return img.src; });
  var avatarSrc = document.getElementById('profileAvatar').src;
  var navAvatar = document.querySelector('#avatarBtn img');
  if (navAvatar) navAvatar.src = avatarSrc;
  renderDashboard();

  fetch(_apiUrl('profile'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: _apiHeaders(),
    body: JSON.stringify({
      name: currentUser.name,
      tagline: currentUser.tagline,
      location: currentUser.location,
      bio: currentUser.bio,
      gallery: currentUser.gallery
    })
  }).then(function() {
    showToast('Profil gespeichert! ✅', 'check_circle');
  }).catch(function() {
    showToast('Speichern fehlgeschlagen', 'error');
  });
}

function logout() {
  fetch(_apiUrl('logout'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: _apiHeaders()
  }).catch(function() {});
  applyLogout();
  showToast('Abgemeldet. Bis bald!', 'logout');
  navigateTo('home');
}

function selectRole(btn, role) {
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  var gl = document.getElementById('regGewerbeLabel');
  if (gl) { gl.style.display = role === 'provider' ? '' : 'none'; gl.classList.remove('has-error'); }
}

// ========== MODALS ==========
function openModal(id) {
  var modal = document.getElementById(id);
  // Reset-Zustand bei Forgot-Modal
  if (id === 'forgotModal') {
    var fg = modal.querySelector('.form-group');
    var sb = modal.querySelector('button[type="submit"]');
    var sc = document.getElementById('forgotSuccess');
    if (fg) fg.style.display = '';
    if (sb) sb.style.display = '';
    if (sc) sc.style.display = 'none';
  }
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  var el = document.getElementById(id);
  el.classList.remove('show');
  document.body.style.overflow = '';
  // Fehler-Anzeigen zurücksetzen
  _clearFieldErrors(el);
}

function closeModalOnOverlay(e) {
  if (e.target.classList.contains('modal-overlay')) {
    closeModal(e.target.id);
  }
}

// ========== USER MENU ==========
function toggleUserMenu() {
  const menu = document.getElementById('userMenu');
  menu.classList.toggle('show');
}

// Close menu on outside click
document.addEventListener('click', (e) => {
  const menu = document.getElementById('userMenu');
  const avatar = document.getElementById('avatarBtn');
  if (!menu.contains(e.target) && !avatar.contains(e.target)) {
    menu.classList.remove('show');
  }
});

// ========== TOAST ==========
function showToast(message, icon = 'check_circle') {
  const toast = document.getElementById('toast');
  document.getElementById('toastMessage').textContent = message;
  document.getElementById('toastIcon').textContent = icon;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ========== COOKIE CONSENT ==========
function _getCookieConsent() {
  try {
    var raw = localStorage.getItem('eb_cookie_consent');
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function _saveCookieConsent(analytics, marketing) {
  localStorage.setItem('eb_cookie_consent', JSON.stringify({
    necessary: true,
    analytics: !!analytics,
    marketing: !!marketing,
    timestamp: new Date().toISOString()
  }));
  var banner = document.getElementById('cookieBanner');
  if (banner) banner.classList.remove('show');
}

function initCookieConsent() {
  var consent = _getCookieConsent();
  if (consent) return; // already answered

  var banner = document.getElementById('cookieBanner');
  if (!banner) return;

  // Show banner with slight delay for smooth entry
  setTimeout(function() { banner.classList.add('show'); }, 400);

  var analyticsBox = document.getElementById('cookieAnalytics');
  var marketingBox = document.getElementById('cookieMarketing');

  document.getElementById('cookieAcceptAll').addEventListener('click', function() {
    if (analyticsBox) analyticsBox.checked = true;
    if (marketingBox) marketingBox.checked = true;
    _saveCookieConsent(true, true);
  });

  document.getElementById('cookieRejectOptional').addEventListener('click', function() {
    _saveCookieConsent(false, false);
  });

  document.getElementById('cookieSaveChoice').addEventListener('click', function() {
    _saveCookieConsent(
      analyticsBox ? analyticsBox.checked : false,
      marketingBox ? marketingBox.checked : false
    );
  });
}

// ========== UPDATE NOTIFICATION ==========
var _EB_VERSION = '107';

// ========== CINEMATIC PREVIEW ==========
var _cinemaTimer = null;
function _startCinemaPreview(gallery, imgs, title) {
  // Hide carousel controls during preview
  gallery.querySelectorAll('.detail-gallery-arrow, .detail-gallery-dots, .detail-gallery-counter').forEach(function(el) {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.4s';
  });

  // Build cinema overlay
  var cinema = document.createElement('div');
  cinema.className = 'dg-cinema';
  var imgEls = [];
  imgs.forEach(function(src) {
    var im = document.createElement('img');
    im.className = 'dg-cinema-img';
    im.src = src;
    im.alt = title;
    cinema.appendChild(im);
    imgEls.push(im);
  });
  // Progress bar
  var prog = document.createElement('div');
  prog.className = 'dg-cinema-progress';
  cinema.appendChild(prog);
  // Counter
  var ctr = document.createElement('div');
  ctr.className = 'dg-cinema-counter';
  cinema.appendChild(ctr);
  gallery.appendChild(cinema);

  var current = 0;
  var total = imgs.length;
  var interval = 800;

  function showImage(idx) {
    imgEls.forEach(function(el, i) { el.classList.toggle('active', i === idx); });
    prog.style.width = (((idx + 1) / total) * 100) + '%';
    ctr.textContent = (idx + 1) + ' / ' + total;
  }

  function endCinema(landIdx) {
    if (_cinemaTimer) { clearInterval(_cinemaTimer); _cinemaTimer = null; }
    _detailGalleryIdx = landIdx;
    var track = document.getElementById('detailGalleryTrack');
    if (track) {
      track.style.scrollBehavior = 'auto';
      if (track.children[landIdx]) track.children[landIdx].scrollIntoView({ block: 'nearest', inline: 'start' });
      track.style.scrollBehavior = 'smooth';
    }
    _updateDetailGalleryUI();
    cinema.classList.add('fade-out');
    gallery.querySelectorAll('.detail-gallery-arrow, .detail-gallery-dots, .detail-gallery-counter').forEach(function(el) {
      el.style.opacity = '';
    });
    setTimeout(function() {
      if (cinema.parentNode) cinema.parentNode.removeChild(cinema);
    }, 650);
  }

  showImage(0);

  _cinemaTimer = setInterval(function() {
    current++;
    if (current >= total) {
      endCinema(0);
      return;
    }
    showImage(current);
  }, interval);

  cinema.addEventListener('click', function() {
    endCinema(current);
  });
}

// ========== DETAIL GALLERY CAROUSEL ==========
var _detailGalleryIdx = 0;
function _initDetailGallerySwipe() {
  var track = document.getElementById('detailGalleryTrack');
  if (!track) return;
  _detailGalleryIdx = 0;
  var startX = 0, startY = 0, dragging = false, moved = false;

  track.addEventListener('scroll', function() {
    var slideW = track.offsetWidth;
    if (slideW <= 0) return;
    var idx = Math.round(track.scrollLeft / slideW);
    if (idx !== _detailGalleryIdx) {
      _detailGalleryIdx = idx;
      _updateDetailGalleryUI();
    }
  });

  // Mouse drag
  track.addEventListener('mousedown', function(e) {
    dragging = true; moved = false;
    startX = e.clientX;
    track.style.scrollBehavior = 'auto';
    track.style.cursor = 'grabbing';
  });
  document.addEventListener('mousemove', function(e) {
    if (!dragging) return;
    var dx = e.clientX - startX;
    if (Math.abs(dx) > 5) moved = true;
    track.scrollLeft -= (e.clientX - startX);
    startX = e.clientX;
  });
  document.addEventListener('mouseup', function() {
    if (!dragging) return;
    dragging = false;
    track.style.scrollBehavior = 'smooth';
    track.style.cursor = '';
    // Snap to nearest
    var slideW = track.offsetWidth;
    var target = Math.round(track.scrollLeft / slideW) * slideW;
    track.scrollLeft = target;
  });
}

function _updateDetailGalleryUI() {
  var dots = document.querySelectorAll('#detailGalleryDots .detail-gallery-dot');
  dots.forEach(function(d, i) {
    d.classList.toggle('active', i === _detailGalleryIdx);
  });
  var counter = document.getElementById('detailGalleryCounter');
  if (counter) counter.textContent = (_detailGalleryIdx + 1) + ' / ' + dots.length;
}

function detailGalleryNav(dir) {
  var track = document.getElementById('detailGalleryTrack');
  if (!track) return;
  var total = track.children.length;
  _detailGalleryIdx = Math.max(0, Math.min(total - 1, _detailGalleryIdx + dir));
  track.children[_detailGalleryIdx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  _updateDetailGalleryUI();
}

function detailGalleryGoTo(idx) {
  var track = document.getElementById('detailGalleryTrack');
  if (!track) return;
  _detailGalleryIdx = idx;
  track.children[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
  _updateDetailGalleryUI();
}
function showUpdateNotification() {
  var lastVersion = localStorage.getItem('eb_last_version');
  if (lastVersion === _EB_VERSION) return;
  localStorage.setItem('eb_last_version', _EB_VERSION);
  if (!lastVersion) return; // first visit ever, don't show
  var el = document.getElementById('updateToast');
  if (!el) return;
  setTimeout(function() { el.classList.add('show'); }, 600);
  setTimeout(function() { el.classList.remove('show'); }, 4600);
}

// ========== NAVBAR SCROLL EFFECT ==========
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (window.scrollY > 10) {
    nav.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)';
  } else {
    nav.style.boxShadow = 'none';
  }
});

// ========== FOOTER LOGO SCROLL ANIMATION ==========
function initFooterLogoAnimation() {
  const logo = document.querySelector('.footer-logo');
  if (!logo) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        logo.classList.add('visible');
        observer.unobserve(logo);
      }
    });
  }, { threshold: 0.3 });
  observer.observe(logo);
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
  renderFeaturedGrid();
  renderHeroMarquees();
  initFooterLogoAnimation();
  initCookieConsent();

  // Passkey-Verifizierung Button
  var vpkBtn = document.getElementById('verifyWithPasskeyBtn');
  if (vpkBtn) vpkBtn.addEventListener('click', verifyWithPasskey);

  // Set min date for date inputs to today
  const today = new Date().toISOString().split('T')[0];
  document.querySelectorAll('input[type="date"]').forEach(input => {
    input.min = today;
  });

  // Lightbox keyboard navigation
  document.addEventListener('keydown', (e) => {
    const lb = document.getElementById('providerLightbox');
    if (lb && lb.classList.contains('show')) {
      if (e.key === 'Escape') closeProviderLightbox();
      if (e.key === 'ArrowLeft') lightboxNav(-1);
      if (e.key === 'ArrowRight') lightboxNav(1);
      return;
    }
    const clb = document.getElementById('coverLightbox');
    if (clb && clb.classList.contains('show') && e.key === 'Escape') closeCoverLightbox();
  });
});

// ========== INTERACTIVE MAP (Leaflet) ==========
var CITY_COORDS = {
  'Berlin':      [52.5200, 13.4050],
  'Hamburg':     [53.5511,  9.9937],
  'München':     [48.1351, 11.5820],
  'Frankfurt':   [50.1109,  8.6821],
  'Düsseldorf':  [51.2277,  6.7735],
  'Starnberg':   [47.9983, 11.3408],
  'Köln':        [50.9375,  6.9603],
  'Stuttgart':   [48.7758,  9.1829],
};

const CATEGORY_EMOJI = {
  dj: '🎧', catering: '🍽️', florist: '🌸', licht: '💡',
  pyro: '🎆', foto: '📷', location: '🏰', deko: '🎈',
  planung: '📋', moderation: '🎤'
};

let leafletMap = null;
let mapMarkers = [];
let mapInitialized = false;

function toggleMapOverlay() {
  const overlay = document.getElementById('mapOverlay');
  const backdrop = document.getElementById('mapBackdrop');
  const isOpen = overlay.classList.contains('show');

  if (isOpen) {
    closeMapOverlay();
    return;
  }

  overlay.classList.add('show');
  backdrop.classList.add('show');
  document.body.style.overflow = 'hidden';

  if (!mapInitialized) {
    setTimeout(() => initLeafletMap(), 100);
    mapInitialized = true;
  } else {
    setTimeout(() => leafletMap.invalidateSize(), 100);
  }

  renderLocationsList(LISTINGS);
}

function closeMapOverlay() {
  document.getElementById('mapOverlay').classList.remove('show');
  document.getElementById('mapBackdrop').classList.remove('show');
  document.body.style.overflow = '';
}

function initLeafletMap() {
  leafletMap = L.map('mapContainer', {
    zoomControl: false,
    attributionControl: false
  }).setView([51.1657, 10.4515], 6);

  L.control.zoom({ position: 'topright' }).addTo(leafletMap);

  L.tileLayer('https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
  }).addTo(leafletMap);

  addListingMarkers(LISTINGS);
}

function createPriceIcon(listing) {
  const priceText = listing.price >= 1000
    ? (listing.price / 1000).toFixed(listing.price % 1000 === 0 ? 0 : 1) + 'k€'
    : listing.price + '€';

  return L.divIcon({
    className: 'map-marker-wrapper',
    html: `<div class="map-marker-custom">${priceText}</div>`,
    iconSize: [70, 30],
    iconAnchor: [35, 15],
    popupAnchor: [0, -18]
  });
}

function addListingMarkers(listings) {
  // Clear existing markers
  mapMarkers.forEach(m => leafletMap.removeLayer(m));
  mapMarkers = [];

  listings.forEach(listing => {
    const coords = CITY_COORDS[listing.location];
    if (!coords) return;

    // Slight random offset so overlapping markers spread
    const jitter = () => (Math.random() - 0.5) * 0.015;
    const pos = [coords[0] + jitter(), coords[1] + jitter()];

    const marker = L.marker(pos, { icon: createPriceIcon(listing) })
      .addTo(leafletMap);

    const popupContent = `
      <div class="map-popup-card">
        <img src="${listing.image}" alt="${listing.title}" loading="lazy"/>
        <h4>${listing.title}</h4>
        <div class="popup-meta">
          <span class="material-icons-round" style="font-size:14px;vertical-align:middle">location_on</span>
          ${listing.location} · ${listing.categoryLabel}
        </div>
        <div class="popup-meta">★ ${listing.rating} (${listing.reviews} Bewertungen)</div>
        <div class="popup-price">${listing.priceLabel}</div>
        <button class="popup-btn" onclick="closeMapOverlay(); navigateTo('detail', ${listing.id});">
          Details ansehen
        </button>
      </div>`;

    marker.bindPopup(popupContent, { maxWidth: 260, closeButton: true });

    marker.listingId = listing.id;
    mapMarkers.push(marker);
  });
}

function renderLocationsList(listings) {
  const list = document.getElementById('mapLocationsList');
  list.innerHTML = listings.map(l => {
    return `
      <div class="map-loc-item" data-id="${l.id}" onclick="focusMapMarker(${l.id})">
        <img class="map-loc-img" src="${l.image}" alt="${l.title}" loading="lazy" />
        <div class="map-loc-info">
          <strong>${l.title}</strong>
          <span>${l.location} · ${l.categoryLabel}</span>
        </div>
        <div class="map-loc-price">${l.priceLabel}</div>
      </div>`;
  }).join('');
}

function focusMapMarker(listingId) {
  const listing = LISTINGS.find(l => l.id === listingId);
  if (!listing) return;

  const coords = CITY_COORDS[listing.location];
  if (!coords) return;

  leafletMap.flyTo(coords, 12, { duration: 0.8 });

  // Highlight sidebar item
  document.querySelectorAll('.map-loc-item').forEach(el => el.classList.remove('active'));
  const activeItem = document.querySelector(`.map-loc-item[data-id="${listingId}"]`);
  if (activeItem) {
    activeItem.classList.add('active');
    activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Activate marker styles & open popup
  mapMarkers.forEach(m => {
    const el = m.getElement();
    if (el) el.querySelector('.map-marker-custom')?.classList.remove('active');
  });
  const marker = mapMarkers.find(m => m.listingId === listingId);
  if (marker) {
    const el = marker.getElement();
    if (el) el.querySelector('.map-marker-custom')?.classList.add('active');
    marker.openPopup();
  }
}

function filterMapMarkers() {
  const query = document.getElementById('mapSearchInput').value.toLowerCase().trim();

  const filtered = LISTINGS.filter(l => {
    const haystack = `${l.title} ${l.location} ${l.region} ${l.categoryLabel} ${l.tags.join(' ')}`.toLowerCase();
    return !query || haystack.includes(query);
  });

  // Update map markers
  if (leafletMap) {
    addListingMarkers(filtered);
    if (filtered.length > 0 && query) {
      const bounds = L.latLngBounds(filtered.map(l => CITY_COORDS[l.location]).filter(Boolean));
      leafletMap.flyToBounds(bounds, { padding: [40, 40], maxZoom: 11, duration: 0.6 });
    }
  }

  // Update sidebar list
  renderLocationsList(filtered);

  // Update the "Wo?" nav value text
  const navValue = document.getElementById('navWoValue');
  if (navValue) {
    navValue.textContent = query ? (filtered.length > 0 ? filtered[0].location : 'Keine Ergebnisse') : 'Wo?';
  }
}
