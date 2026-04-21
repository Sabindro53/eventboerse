
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
  // --- Düsseldorf Dummy Inserat ---
  {
    id: 12, providerId: 90012,
    title: 'RheinGourmet Catering Düsseldorf',
    category: 'catering', categoryLabel: 'Catering',
    location: 'Düsseldorf', region: 'NRW',
    price: 42, priceLabel: 'ab 42€ / Person',
    rating: 4.9, reviews: 61,
    image: 'https://images.pexels.com/photos/461382/pexels-photo-461382.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
    images: [
      'https://images.pexels.com/photos/461382/pexels-photo-461382.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&dpr=1',
      'https://images.pexels.com/photos/3184188/pexels-photo-3184188.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/5779784/pexels-photo-5779784.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/5908226/pexels-photo-5908226.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/2788792/pexels-photo-2788792.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
    ],
    providerName: 'Sabine Rhein',
    providerImg: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sabine',
    providerSince: '2023',
    description: `<p>Modernes Catering aus Düsseldorf für Events jeder Größe. Ob Business-Lunch, Hochzeit oder private Feier – wir liefern kreative Menüs und besten Service direkt an den Rhein.</p>
    <h3>Unser Angebot</h3>
    <p>Fingerfood, Buffets, Live-Cooking und individuelle Menüwünsche. Nachhaltig, regional und immer frisch zubereitet.</p>`,
    features: ['Live-Cooking-Station', 'Vegane & vegetarische Optionen', 'Servicepersonal', 'Buffet & Fingerfood', 'Getränkepauschale möglich', 'Lieferung in ganz NRW'],
    tags: ['Business', 'Hochzeit', 'Party'],
    badge: 'Empfohlen',
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
      'https://images.pexels.com/photos/7648022/pexels-photo-7648022.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
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
    image: 'https://images.pexels.com/photos/29708277/pexels-photo-29708277.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
    images: [
      'https://images.pexels.com/photos/29708277/pexels-photo-29708277.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&dpr=1',
      'https://images.pexels.com/photos/8348626/pexels-photo-8348626.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/29708270/pexels-photo-29708270.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/64057/pexels-photo-64057.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/8827060/pexels-photo-8827060.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
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
  },
  {
    id: 13, providerId: 90013,
    title: 'SoundVibes Live Band',
    category: 'dj', categoryLabel: 'DJ & Musik',
    location: 'Köln', region: 'NRW',
    price: 1800, priceLabel: 'ab 1.800€ / Event',
    rating: 4.9, reviews: 45,
    image: 'https://images.pexels.com/photos/7803632/pexels-photo-7803632.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
    images: [
      'https://images.pexels.com/photos/7803632/pexels-photo-7803632.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&dpr=1',
      'https://images.pexels.com/photos/9008834/pexels-photo-9008834.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/3984822/pexels-photo-3984822.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/7803636/pexels-photo-7803636.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/9009587/pexels-photo-9009587.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
    ],
    providerName: 'Niko & Band',
    providerImg: 'https://api.dicebear.com/7.x/avataaars/svg?seed=niko',
    providerSince: '2019',
    description: `<p>Live-Musik, die unter die Haut geht! Unsere 5-köpfige Band spielt von Pop über Soul bis Rock – perfekt für Hochzeiten, Firmenfeiern und Galas.</p>
    <h3>Unser Sound</h3>
    <p>Von akustischen Sets für die Trauung bis zur fetten Party-Show am Abend – wir passen unser Repertoire individuell an euer Event an. Professionelles Equipment bringen wir selbst mit.</p>`,
    features: ['5-köpfige Live-Band', 'Akustik-Set für Trauung', 'Party-Set mit Hits', 'Eigene PA-Anlage', 'LED-Bühnenbeleuchtung', 'Bis zu 4 Stunden live'],
    tags: ['Hochzeit', 'Firmen-Event', 'Gala'],
    badge: 'Premium',
    negotiable: true
  },
  {
    id: 14, providerId: 90014,
    title: 'FilmMomente Videoproduktion',
    category: 'foto', categoryLabel: 'Fotografie',
    location: 'Frankfurt', region: 'Rhein-Main',
    price: 1200, priceLabel: 'ab 1.200€ / Event',
    rating: 4.8, reviews: 38,
    image: 'https://images.pexels.com/photos/2883160/pexels-photo-2883160.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
    images: [
      'https://images.pexels.com/photos/2883160/pexels-photo-2883160.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&dpr=1',
      'https://images.pexels.com/photos/5599289/pexels-photo-5599289.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/1408984/pexels-photo-1408984.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/5460711/pexels-photo-5460711.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/4882162/pexels-photo-4882162.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
    ],
    providerName: 'Julian Film',
    providerImg: 'https://api.dicebear.com/7.x/avataaars/svg?seed=julian',
    providerSince: '2020',
    description: `<p>Wir halten eure schönsten Momente in cineastischen Videos fest. Von emotionalen Hochzeitsfilmen bis zu dynamischen Event-Trailern – wir erzählen eure Geschichte.</p>
    <h3>Unser Angebot</h3>
    <p>Professionelle Videoproduktion mit modernster Kamera- und Drohnentechnik. Jedes Video wird individuell geschnitten, farbkorrigiert und mit passender Musik unterlegt.</p>`,
    features: ['Cinematic Highlight-Film', 'Drohnenaufnahmen', '4K-Qualität', 'Farbkorrektur & Grading', 'Lizenzfreie Musik', 'Express-Lieferung möglich'],
    tags: ['Hochzeit', 'Firmen-Event', 'Geburtstag'],
    badge: 'Neu',
    negotiable: true
  },
  {
    id: 15, providerId: 90015,
    title: 'Gartenfest Location Leipzig',
    category: 'location', categoryLabel: 'Location',
    location: 'Leipzig', region: 'Sachsen',
    price: 2200, priceLabel: 'ab 2.200€ / Event',
    rating: 4.7, reviews: 29,
    image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=600&h=400&fit=crop&auto=format',
    images: [
      'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&h=500&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=600&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1478146059778-26028b07395a?w=600&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&h=400&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1510076857177-7470076d4098?w=600&h=400&fit=crop&auto=format',
    ],
    providerName: 'Gartenpark Team',
    providerImg: 'https://api.dicebear.com/7.x/avataaars/svg?seed=garten',
    providerSince: '2021',
    description: `<p>Feiern unter freiem Himmel in unserem wunderschönen Gartenpark! Die perfekte Location für Sommerfeste, Gartenpartys und romantische Trauungen im Grünen.</p>
    <h3>Die Location</h3>
    <p>Weitläufiger Garten mit altem Baumbestand, elegante Pavillon-Terrasse und ein stimmungsvoller Innenbereich als Regen-Alternative. Platz für bis zu 150 Gäste.</p>`,
    features: ['Bis 150 Gäste', 'Außenbereich mit Pavillon', 'Regen-Alternative innen', 'Eigene Bar & Küche', 'Freie Trauung möglich', 'Parkplätze vorhanden'],
    tags: ['Hochzeit', 'Sommerfest', 'Firmen-Event'],
    badge: 'Empfohlen',
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

// ========== SPA PATH HELPERS ==========
var _spaBase = (typeof eventboerseApi !== 'undefined' && eventboerseApi.siteUrl)
  ? new URL(eventboerseApi.siteUrl).pathname.replace(/\/+$/, '')
  : '';

function _spaPath(page, data) {
  if (!page || page === 'browse') return _spaBase + '/';
  return _spaBase + '/' + page + (data ? '/' + data : '');
}

function _readSpaRoute() {
  // First check for legacy hash routes and convert them
  var hash = window.location.hash.replace(/^#/, '');
  if (hash) {
    var parts = hash.split('/');
    return { page: parts[0] || 'browse', data: parts[1] ? (isNaN(parts[1]) ? parts[1] : parseInt(parts[1])) : null };
  }
  // Read from pathname
  var path = window.location.pathname;
  if (_spaBase) path = path.replace(new RegExp('^' + _spaBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '');
  path = path.replace(/^\/+|\/+$/g, '');
  if (!path) return { page: 'browse', data: null };
  var parts = path.split('/');
  var pg = parts[0] || 'browse';
  var dt = parts[1] ? (isNaN(parts[1]) ? parts[1] : parseInt(parts[1])) : null;
  return { page: pg, data: dt };
}

// Prevent href="#" from appending "#" to clean URLs
document.addEventListener('click', function(e) {
  var link = e.target.closest('a[href="#"]');
  if (link) e.preventDefault();
});

// ========== STATE ==========
let currentPage = 'browse';
let currentListing = null;
let currentChat = null;
let isLoggedIn = false;
let favorites = new Set();

// Startseite immer auf Suche umleiten (ohne Reload):
(function() {
  var route = _readSpaRoute();
  if (route.page === 'home' || route.page === 'browse') {
    window.history.replaceState({ page: 'browse', data: null }, '', _spaPath('browse'));
    currentPage = 'browse';
  }
})();
let _dbListingsLoaded = false;
let _favoritesLoaded = false;

function forceBrowsePage() {
  // In manchen Umgebungen bleibt page-home trotzdem aktiv (z.B. WP-Theme-Initialzustand)
  var home = document.getElementById('page-home');
  var browse = document.getElementById('page-browse');
  if (!browse) return;

  var route = _readSpaRoute();
  if (route.page === 'home' || route.page === 'browse' || !route.page) {
    history.replaceState({ page: 'browse', data: null }, '', _spaPath('browse'));
  }

  if (home) home.classList.remove('active');
  if (!browse) return;
  browse.classList.add('active');
  currentPage = 'browse';

  console.log('[forceBrowsePage]', window.location.pathname, 'state', {
    home: home ? home.className : null,
    browse: browse.className,
    currentPage
  });

  try {
    renderHeroMarquees();
  } catch (e) {
    console.warn('forceBrowsePage: renderHeroMarquees failed', e);
  }
}

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
  var filename = (file instanceof File && file.name) ? file.name : 'upload-' + Date.now() + '.jpg';
  formData.append('file', file, filename);
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
    try { renderHeroMarquees(); } catch (err) { console.error('Fehler beim Rendern der Hero-Marquee nach Daten-Ladung', err); }
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

function getHeroListings() {
  var all = Array.isArray(LISTINGS) ? LISTINGS.slice() : [];
  if (!isLoggedIn) return all;

  try {
    var dbItems = _visibleListings() || [];
    if (!Array.isArray(dbItems)) dbItems = [];
    var ids = new Set(all.map(function(l){ return l && l.id != null ? l.id : null; }));
    dbItems.forEach(function(l){
      if (!l || l.id == null) return;
      if (!ids.has(l.id)) {
        ids.add(l.id);
        all.push(l);
      }
    });
  } catch (e) {
    console.warn('getHeroListings: Fehler beim Zusammenführen der Listings', e);
  }

  return all;
}

// ========== NAVIGATION ==========
function navigateTo(page, data, skipHistory) {
  // Make home an alias for browse, so es nur eine Suchseite zu pflegen gibt.
  if (page === 'home') {
    page = 'browse';
  }

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
    window.history.pushState({ page: page, data: data || null }, '', _spaPath(page, data));
  }

  // Deactivate all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  _stopChatPoll();

  // ── Always restore scrolling (modal/lightbox might have locked it) ──
  document.body.style.overflow = '';
  document.body.style.touchAction = '';
  // Close any open lightboxes/modals silently (except auth modals)
  var _authModals = ['loginModal','registerModal','forgotModal','resetPasswordModal','loginOtpModal','registerOtpModal','verifyModal','passkeySetupModal'];
  document.querySelectorAll('.modal-overlay.show, .provider-lightbox.show, .gallery-lightbox.show, .cover-lightbox.show').forEach(function(el) {
    if (_authModals.indexOf(el.id) === -1) el.classList.remove('show');
  });
  // Clear cinema preview if running
  if (_cinemaTimer) { clearInterval(_cinemaTimer); _cinemaTimer = null; }
  // Stop gallery row animations when leaving provider page
  if (typeof galleryRAFs !== 'undefined' && galleryRAFs.length) {
    galleryRAFs.forEach(function(r) { if (r && r.cancel) r.cancel(); else cancelAnimationFrame(r); });
    galleryRAFs = [];
  }
  // Clean up detail gallery swipe listeners
  if (_detailSwipeCleanup) { _detailSwipeCleanup(); _detailSwipeCleanup = null; }

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

  // Init scroll-triggered animations for the newly visible page
  setTimeout(_initAnimatedEntries, 80);

  // Page-specific logic
  switch (page) {
    case 'browse':
      _initAiPlaceholder();
      // Pre-fill location from user profile (only if it looks like a real city, not an email)
      if (currentUser && currentUser.location && !/[@.]com|[@.]de|[@.]net/i.test(currentUser.location) && !currentUser.location.includes('@')) {
        var locInput = document.getElementById('browseLocation');
        if (locInput && !locInput.value) locInput.value = currentUser.location;
      }
      loadDbListings().then(function() {
        renderBrowseGrid(LISTINGS);
        try { renderHeroMarquees(); } catch (err) { console.error('Fehler renderHeroMarquees in navigateTo(browse)', err); }
        _initCategoryScrollHint();
      });
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
    case 'impressum':
      break;
    case 'admin':
      if (!currentUser || !currentUser.isAdmin) {
        showToast('Kein Zugriff – nur für Admins.', 'error');
        navigateTo('home');
        return;
      }
      loadAdminUsers();
      break;
    case 'board':
      if (currentUser) { _migrateBoardProjects(); _loadBoardProjects(); } else { _boardProjects = []; }
      renderBoardPage();
      break;
    case 'contact':
      break;
    case 'home':
      try { renderHeroMarquees(); } catch (err) { console.error('Fehler renderHeroMarquees in navigateTo(home)', err); }
      break;
  }

  // Hide footer on messages page, show on all others
  var gf = document.getElementById('globalFooter');
  if (gf) gf.style.display = (page === 'messages') ? 'none' : '';
}

// ========== LISTING CARD RENDERER ==========
function renderListingCard(listing) {
  const isFav = favorites.has(listing.id);
  var imgs = Array.isArray(listing.images) && listing.images.length ? listing.images : [listing.image];
  var galleryId = 'gridGallery_' + listing.id;
  return `
    <div class="listing-card" data-listing-id="${listing.id}">
      <div class="listing-card-img">
        <div class="grid-gallery-track" id="${galleryId}">
          ${imgs.map(function(img, i) { return '<div class="grid-gallery-slide"><img src="' + _escHtml(img) + '" alt="' + _escHtml(listing.title) + '"' + (i > 0 ? ' loading="lazy"' : '') + ' /></div>'; }).join('')}
        </div>
        ${imgs.length > 1 ? '<button class="grid-gallery-arrow prev" data-gallery-id="' + listing.id + '" data-dir="-1"><span class="material-icons-round">chevron_left</span></button><button class="grid-gallery-arrow next" data-gallery-id="' + listing.id + '" data-dir="1"><span class="material-icons-round">chevron_right</span></button><div class="grid-gallery-dots" id="gridGalleryDots_' + listing.id + '">' + imgs.map(function(_, i) { return '<button class="grid-gallery-dot' + (i === 0 ? ' active' : '') + '" data-gallery-id="' + listing.id + '" data-idx="' + i + '"></button>'; }).join('') + '</div>' : ''}
        <button class="listing-fav ${isFav ? 'liked' : ''}" onclick="event.stopPropagation(); toggleFavorite(${listing.id}, this)">
          <span class="material-icons-round">${isFav ? 'favorite' : 'favorite_border'}</span>
        </button>
        ${listing.badge ? '<span class="listing-badge">' + _escHtml(listing.badge) + '</span>' : ''}
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
      </div>
    </div>
  `;
}

// ========== HOME PAGE ==========

// ── Marquee animation state ──────────────────────────────
var _marqueeRAFs = [];

function _stopAllMarquees() {
  _marqueeRAFs.forEach(function(id) { cancelAnimationFrame(id); });
  _marqueeRAFs = [];
}

function renderHeroMarquees() {
  _stopAllMarquees();

  var topContainers = Array.from(document.querySelectorAll('.hero-marquee-above'));
  var bottomContainers = Array.from(document.querySelectorAll('.hero-marquee-below'));
  var topTracks = topContainers.map(function(c) { return c.querySelector('.hero-marquee-track'); }).filter(Boolean);
  var bottomTracks = bottomContainers.map(function(c) { return c.querySelector('.hero-marquee-track'); }).filter(Boolean);

  if (!topTracks.length && !bottomTracks.length) return;

  var visible;
  try {
    visible = getHeroListings();
    if (!Array.isArray(visible) || visible.length === 0) visible = Array.isArray(LISTINGS) ? LISTINGS : [];
  } catch (err) {
    visible = Array.isArray(LISTINGS) ? LISTINGS : [];
  }

  [topContainers, bottomContainers].reduce(function(a,b){ return a.concat(b); }, []).forEach(function(c) {
    c.style.display = 'block';
    c.style.visibility = 'visible';
    c.style.opacity = '1';
    c.style.pointerEvents = 'auto';
    c.style.zIndex = '30';
  });

  if (!Array.isArray(visible) || visible.length === 0) {
    var emptyHtml = '<div class="hero-marquee-empty">Noch keine Angebote gefunden.</div>';
    topTracks.concat(bottomTracks).forEach(function(t) { t.innerHTML = emptyHtml; });
    return;
  }

  function cardHTML(l) {
    return '<a class="hero-marquee-card" href="#" onclick="navigateTo(\'detail\',' + l.id + ');return false;">' +
      '<img src="' + _escHtml(l.image) + '" alt="' + _escHtml(l.title) + '" loading="eager" />' +
      '<div class="hero-marquee-card-info">' +
        '<h4>' + _escHtml(l.title) + '</h4>' +
        '<span>' + _escHtml(l.priceLabel) + ' · ★ ' + (l.rating || 0) + '</span>' +
      '</div></a>';
  }

  var cardsHtml = visible.map(cardHTML).join('');
  // Duplicate 3× to guarantee seamless wrap on wide screens
  var tripleHtml = cardsHtml + cardsHtml + cardsHtml;

  topTracks.concat(bottomTracks).forEach(function(track) {
    track.innerHTML = tripleHtml;
    track.style.animation = 'none';
    track.style.transform = 'translateX(0)';
    track.style.willChange = 'transform';
    track.querySelectorAll('.hero-marquee-card img').forEach(detectWideBannerImg);
  });

  // Start rAF-based animation once images in the first set are loaded (or after 1s fallback)
  function startMarquee(track, speed) {
    var offset = 0;
    var paused = false;
    var half = 0;

    function measureHalf() {
      // half = width of one set of cards (total / 3)
      half = track.scrollWidth / 3;
      if (half < 10) half = track.scrollWidth / 2; // fallback
    }

    measureHalf();

    // Re-measure after images load
    var imgs = track.querySelectorAll('img');
    var loaded = 0;
    var total = imgs.length;
    function onImgReady() {
      loaded++;
      if (loaded >= total / 3) measureHalf(); // measure after first set loaded
    }
    imgs.forEach(function(img) {
      if (img.complete) { onImgReady(); }
      else { img.addEventListener('load', onImgReady); img.addEventListener('error', onImgReady); }
    });
    // Fallback re-measure
    setTimeout(measureHalf, 1200);

    var lastTime = 0;
    function tick(now) {
      if (!document.body.contains(track)) return; // track removed from DOM
      var id = requestAnimationFrame(tick);
      _marqueeRAFs.push(id);
      if (paused || half < 10) { lastTime = now; return; }
      if (!lastTime) { lastTime = now; return; }
      var dt = Math.min(now - lastTime, 50); // cap to avoid big jumps
      lastTime = now;
      offset -= speed * dt / 1000;
      if (offset <= -half) offset += half;
      if (offset > 0) offset -= half;
      track.style.transform = 'translateX(' + offset.toFixed(1) + 'px)';
    }

    var rafId = requestAnimationFrame(tick);
    _marqueeRAFs.push(rafId);

    // ── Pause on hover (desktop) ──
    track.parentElement.addEventListener('mouseenter', function() { paused = true; });
    track.parentElement.addEventListener('mouseleave', function() { paused = false; });

    // ── Prevent click after drag/swipe (threshold 8px) ──
    var wasDragged = false;
    track.addEventListener('click', function(e) {
      if (wasDragged) {
        e.preventDefault();
        e.stopPropagation();
        wasDragged = false;
      }
    }, true);

    // ── Touch: pause while touching, allow drag ──
    var touchStartX = 0, touchStartY = 0, touchStartOffset = 0, touching = false;
    track.addEventListener('touchstart', function(e) {
      paused = true;
      touching = true;
      wasDragged = false;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartOffset = offset;
    }, { passive: true });

    track.addEventListener('touchmove', function(e) {
      if (!touching) return;
      var dx = e.touches[0].clientX - touchStartX;
      if (Math.abs(dx) > 8) wasDragged = true;
      offset = touchStartOffset + dx;
      if (half > 10) {
        while (offset > 0) offset -= half;
        while (offset <= -half) offset += half;
      }
      track.style.transform = 'translateX(' + offset.toFixed(1) + 'px)';
    }, { passive: true });

    track.addEventListener('touchend', function() {
      touching = false;
      paused = false;
      lastTime = 0;
    }, { passive: true });

    // ── Desktop mouse drag ──
    var dragging = false, dragStartX = 0, dragStartOffset = 0;
    track.style.cursor = 'grab';

    track.addEventListener('mousedown', function(e) {
      if (e.button !== 0) return;
      dragging = true;
      wasDragged = false;
      paused = true;
      dragStartX = e.clientX;
      dragStartOffset = offset;
      track.style.cursor = 'grabbing';
      e.preventDefault();
    });
    document.addEventListener('mousemove', function(e) {
      if (!dragging) return;
      var dx = e.clientX - dragStartX;
      if (Math.abs(dx) > 8) wasDragged = true;
      offset = dragStartOffset + dx;
      if (half > 10) {
        while (offset > 0) offset -= half;
        while (offset <= -half) offset += half;
      }
      track.style.transform = 'translateX(' + offset.toFixed(1) + 'px)';
    });
    document.addEventListener('mouseup', function() {
      if (!dragging) return;
      dragging = false;
      paused = false;
      lastTime = 0;
      track.style.cursor = 'grab';
    });
  }

  // Start with different speeds + direction
  topTracks.forEach(function(track) { startMarquee(track, 40); });   // 40px/s → right-to-left
  bottomTracks.forEach(function(track) { startMarquee(track, 35); }); // 35px/s → right-to-left
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
  let items = getHeroListings().filter(function(l) {
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
  if (!container) return;
  container.querySelectorAll('.listing-card-img img').forEach(detectWideBannerImg);
}

function detectWideBannerImg(img) {
  if (!img) return;
  function check() {
    if (img.naturalWidth && img.naturalHeight) {
      var r = img.naturalWidth / img.naturalHeight;
      if (r > 2.2) {
        img.style.setProperty('object-fit', 'contain', 'important');
        img.style.background = '#fff';
      }
    }
  }
  if (img.complete) check();
  else img.addEventListener('load', check);
}

// ========== SHARED GRID INIT (click + swipe for all listing grids) ==========
var _galleryUid = 0;
function _initGridCards(grid) {
  grid.querySelectorAll('.listing-card').forEach(function(card) {
    // Assign unique gallery IDs to avoid collisions between grids
    var uid = 'g' + (++_galleryUid);
    var track = card.querySelector('.grid-gallery-track');
    if (track) {
      track.id = 'gridGallery_' + uid;
      var dots = card.querySelector('.grid-gallery-dots');
      if (dots) dots.id = 'gridGalleryDots_' + uid;
      card.querySelectorAll('.grid-gallery-arrow').forEach(function(a) {
        a.setAttribute('data-gallery-id', uid);
      });
      card.querySelectorAll('.grid-gallery-dot').forEach(function(d) {
        d.setAttribute('data-gallery-id', uid);
      });
      _initGridGallerySwipe(uid);
    }
    // Click on card body → open detail
    card.addEventListener('click', function(e) {
      if (_gridGalleryDragged) return;
      if (e.target.closest('.grid-gallery-arrow') || e.target.closest('.grid-gallery-dot') || e.target.closest('.listing-fav')) return;
      var id = card.getAttribute('data-listing-id');
      if (id) navigateTo('detail', Number(id));
    });
  });
  detectWideBannerCards(grid);
}

function renderFeaturedGrid() {
  const grid = document.getElementById('featuredGrid');
  var visible = getHeroListings();
  grid.innerHTML = visible.map(renderListingCard).join('');
  _initGridCards(grid);
}
// ========== GRID GALLERY CAROUSEL ==========
var _gridGalleryIdx = {};
var _gridGalleryDragged = false; // global flag: was the last interaction a drag?
var _gridDragState = { dragging: false, startX: 0, startScrollLeft: 0, track: null, listingId: null, lastX: 0, lastTime: 0, velocity: 0 };

// Smooth animated scroll (Apple-like easeOutCubic)
function _gridGalleryAnimateTo(track, targetScroll, duration, listingId) {
  if (track._animFrame) cancelAnimationFrame(track._animFrame);
  var startScroll = track.scrollLeft;
  var dist = targetScroll - startScroll;
  if (Math.abs(dist) < 1) { track.scrollLeft = targetScroll; return; }
  var startTime = performance.now();
  duration = duration || 420;
  function step(now) {
    var t = Math.min((now - startTime) / duration, 1);
    // easeOutCubic
    var ease = 1 - Math.pow(1 - t, 3);
    track.scrollLeft = startScroll + dist * ease;
    if (t < 1) {
      track._animFrame = requestAnimationFrame(step);
    } else {
      track.scrollLeft = targetScroll;
      track._animFrame = null;
      if (listingId != null) _updateGridGalleryUI(listingId);
    }
  }
  track._animFrame = requestAnimationFrame(step);
}

// Single document-level listeners for all grid galleries (prevents listener leaks)
document.addEventListener('mousemove', function(e) {
  if (!_gridDragState.dragging || !_gridDragState.track) return;
  var now = performance.now();
  var dx = e.clientX - _gridDragState.startX;
  // Track velocity (px/ms)
  var dt = now - _gridDragState.lastTime;
  if (dt > 0) {
    _gridDragState.velocity = (e.clientX - _gridDragState.lastX) / dt;
  }
  _gridDragState.lastX = e.clientX;
  _gridDragState.lastTime = now;
  if (Math.abs(dx) > 2) _gridGalleryDragged = true;
  _gridDragState.track.scrollLeft = _gridDragState.startScrollLeft - dx;
});
document.addEventListener('mouseup', function() {
  if (!_gridDragState.dragging || !_gridDragState.track) return;
  _gridDragState.dragging = false;
  var track = _gridDragState.track;
  var listingId = _gridDragState.listingId;
  var velocity = _gridDragState.velocity; // px/ms, negative = swiped left
  var slideW = track.offsetWidth;
  if (slideW > 0) {
    var currentScroll = track.scrollLeft;
    var currentIdx = currentScroll / slideW;
    var baseIdx = Math.floor(currentIdx);
    var frac = currentIdx - baseIdx;
    var idx;
    // Velocity-based decision (Apple-like flick)
    if (Math.abs(velocity) > 0.3) {
      // Fast flick: commit to direction regardless of position
      idx = velocity < 0 ? Math.ceil(currentIdx) : Math.floor(currentIdx);
    } else if (Math.abs(velocity) > 0.1) {
      // Medium flick: lower threshold (20%)
      if (velocity < 0) {
        idx = frac > 0.2 ? baseIdx + 1 : baseIdx;
      } else {
        idx = frac < 0.8 ? baseIdx : baseIdx + 1;
      }
    } else {
      // Slow drag: snap to nearest at 50%
      idx = Math.round(currentIdx);
    }
    idx = Math.max(0, Math.min(track.children.length - 1, idx));
    _gridGalleryIdx[listingId] = idx;
    // Animate smoothly — duration based on distance
    var targetScroll = idx * slideW;
    var dist = Math.abs(targetScroll - currentScroll);
    var duration = Math.max(200, Math.min(500, dist * 1.2));
    track.style.scrollSnapType = 'none';
    track.style.scrollBehavior = 'auto';
    _gridGalleryAnimateTo(track, targetScroll, duration, listingId);
    // Re-enable snap after animation
    setTimeout(function() { track.style.scrollSnapType = 'x mandatory'; }, duration + 20);
  }
  _gridDragState.track = null;
  // Reset dragged flag after a short delay so click handlers can check it
  setTimeout(function() { _gridGalleryDragged = false; }, 50);
});

function _initGridGallerySwipe(listingId) {
  var track = document.getElementById('gridGallery_' + listingId);
  if (!track) return;
  if (track._galleryInit) return;
  track._galleryInit = true;
  _gridGalleryIdx[listingId] = 0;

  // Direct event listeners on arrows and dots (most reliable, works in iframes/Simple Browser)
  var container = track.parentElement;
  if (container) {
    container.querySelectorAll('.grid-gallery-arrow').forEach(function(arrow) {
      arrow.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        var dir = Number(arrow.getAttribute('data-dir'));
        gridGalleryNav(listingId, dir);
      });
      // Prevent mousedown from bubbling to track (would start drag)
      arrow.addEventListener('mousedown', function(e) {
        e.stopPropagation();
      });
    });
    container.querySelectorAll('.grid-gallery-dot').forEach(function(dot) {
      dot.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        var idx = Number(dot.getAttribute('data-idx'));
        gridGalleryGoTo(listingId, idx);
      });
      dot.addEventListener('mousedown', function(e) {
        e.stopPropagation();
      });
    });
  }

  // Mouse drag (desktop)
  track.addEventListener('mousedown', function(e) {
    // Only start drag if clicking directly on track/slides, not on arrows/dots
    if (e.target.closest('.grid-gallery-arrow') || e.target.closest('.grid-gallery-dot')) return;
    e.preventDefault();
    if (track._animFrame) { cancelAnimationFrame(track._animFrame); track._animFrame = null; }
    _gridDragState.dragging = true;
    _gridDragState.startX = e.clientX;
    _gridDragState.startScrollLeft = track.scrollLeft;
    _gridDragState.track = track;
    _gridDragState.listingId = listingId;
    _gridDragState.lastX = e.clientX;
    _gridDragState.lastTime = performance.now();
    _gridDragState.velocity = 0;
    _gridGalleryDragged = false;
    track.style.scrollBehavior = 'auto';
    track.style.scrollSnapType = 'none';
  });

  // Native CSS scroll-snap handles touch swiping - just sync the index/dots
  var scrollTimer;
  track.addEventListener('scroll', function() {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function() {
      var slideW = track.offsetWidth;
      if (slideW <= 0) return;
      var idx = Math.round(track.scrollLeft / slideW);
      idx = Math.max(0, Math.min(track.children.length - 1, idx));
      if (_gridGalleryIdx[listingId] !== idx) {
        _gridGalleryIdx[listingId] = idx;
        _updateGridGalleryUI(listingId);
      }
    }, 30);
  }, { passive: true });
}
function _updateGridGalleryUI(listingId) {
  var dots = document.querySelectorAll(`#gridGalleryDots_${listingId} .grid-gallery-dot`);
  dots.forEach(function(d, i) {
    d.classList.toggle('active', i === _gridGalleryIdx[listingId]);
  });
}
function gridGalleryNav(listingId, dir) {
  var track = document.getElementById('gridGallery_' + listingId);
  if (!track) return;
  var total = track.children.length;
  var slideW = track.offsetWidth;
  if (slideW <= 0) return;
  var currentIdx = Math.round(track.scrollLeft / slideW);
  _gridGalleryIdx[listingId] = Math.max(0, Math.min(total - 1, currentIdx + dir));
  track.style.scrollSnapType = 'none';
  track.style.scrollBehavior = 'auto';
  _gridGalleryAnimateTo(track, _gridGalleryIdx[listingId] * slideW, 380, listingId);
  setTimeout(function() { track.style.scrollSnapType = 'x mandatory'; }, 400);
}
function gridGalleryGoTo(listingId, idx) {
  var track = document.getElementById('gridGallery_' + listingId);
  if (!track) return;
  var slideW = track.offsetWidth;
  if (slideW <= 0) return;
  _gridGalleryIdx[listingId] = idx;
  track.style.scrollSnapType = 'none';
  track.style.scrollBehavior = 'auto';
  _gridGalleryAnimateTo(track, idx * slideW, 380, listingId);
  setTimeout(function() { track.style.scrollSnapType = 'x mandatory'; }, 400);
}

// Event delegation for gallery arrows and dots (avoids inline onclick blocked by CSP)
document.addEventListener('click', function(e) {
  var arrow = e.target.closest('.grid-gallery-arrow');
  if (arrow) {
    e.stopPropagation();
    var gid = arrow.getAttribute('data-gallery-id');
    var dir = Number(arrow.getAttribute('data-dir'));
    if (gid && dir) gridGalleryNav(gid, dir);
    return;
  }
  var dot = e.target.closest('.grid-gallery-dot');
  if (dot) {
    e.stopPropagation();
    var gid2 = dot.getAttribute('data-gallery-id');
    var idx2 = Number(dot.getAttribute('data-idx'));
    if (gid2 && !isNaN(idx2)) gridGalleryGoTo(gid2, idx2);
    return;
  }
});

function filterCategory(btn, category) {
  document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  var visible = getHeroListings();
  const filtered = category === 'alle' ? visible : visible.filter(l => l.category === category);
  const grid = document.getElementById('featuredGrid');
  grid.innerHTML = filtered.map(renderListingCard).join('');
  _initGridCards(grid);
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
  const listingMatches = getHeroListings().filter(l => {
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

  try {
    renderHeroMarquees();
  } catch (err) {
    console.error('Fehler renderHeroMarquees in performSearch', err);
  }
}

// ========== BROWSE PAGE ==========
function renderBrowseGrid(listings) {
  const grid = document.getElementById('browseGrid');
  grid.innerHTML = listings.map(renderListingCard).join('');
  _initGridCards(grid);
  document.getElementById('browseResultCount').textContent = `${listings.length} Services gefunden`;
}

// ===== AI Search Hero helpers =====
function setQuickSearch(term) {
  var input = document.getElementById('browseSearch');
  if (!input) return;
  input.value = term;
  _aiPlaceholderHideOnInput(input);
  filterListings();
  var grid = document.getElementById('browseGrid');
  if (grid) setTimeout(function() { window.scrollTo({ top: grid.getBoundingClientRect().top + window.pageYOffset - 100, behavior: 'smooth' }); }, 120);
}
function _aiPlaceholderHideOnInput(input) {
  var el = document.getElementById('aiPlaceholder');
  if (!el) return;
  el.style.opacity = input.value ? '0' : '1';
}
var _aiPlaceholderTimer = null;
function _initAiPlaceholder() {
  var el = document.getElementById('aiPlaceholder');
  var input = document.getElementById('browseSearch');
  if (!el || !input) return;
  var examples = [
    'DJ für Hochzeit in Berlin…',
    'Catering für 80 Personen…',
    'Fotograf für Geburtstagsfeier…',
    'Location für Firmen-Event…',
    'Pyrotechnik für Open-Air…',
    'Florist für Hochzeit in München…',
    'Moderation für Gala-Dinner…',
    'Licht & Technik für Party…',
  ];
  var idx = 0;
  if (_aiPlaceholderTimer) clearInterval(_aiPlaceholderTimer);
  el.textContent = examples[0];
  el.style.opacity = input.value ? '0' : '1';
  _aiPlaceholderTimer = setInterval(function() {
    if (input.value) return;
    el.style.opacity = '0';
    setTimeout(function() {
      idx = (idx + 1) % examples.length;
      el.textContent = examples[idx];
      if (!input.value) el.style.opacity = '1';
    }, 350);
  }, 3200);
}

// ── Category bar scroll hint arrow ──
function _initCategoryScrollHint() {
  var bar = document.querySelector('.browse-categories-bar');
  var inner = document.querySelector('.browse-categories-inner');
  if (!bar || !inner) return;

  // Remove old arrow if re-init
  var old = bar.querySelector('.scroll-hint-arrow');
  if (old) old.remove();

  // Create arrow button
  var arrow = document.createElement('button');
  arrow.className = 'scroll-hint-arrow';
  arrow.setAttribute('aria-label', 'Mehr Kategorien');
  arrow.innerHTML = '<span class="material-icons-round">chevron_right</span>';
  bar.style.position = 'sticky';
  bar.appendChild(arrow);

  function checkScroll() {
    var maxScroll = inner.scrollWidth - inner.clientWidth;
    if (maxScroll <= 10) {
      // Everything fits, hide arrow + fade
      arrow.classList.add('hidden');
      bar.style.setProperty('--after-opacity', '0');
    } else if (inner.scrollLeft >= maxScroll - 10) {
      // Scrolled to end
      arrow.classList.add('hidden');
    } else {
      arrow.classList.remove('hidden');
    }
  }

  arrow.addEventListener('click', function() {
    inner.scrollBy({ left: 200, behavior: 'smooth' });
  });

  inner.addEventListener('scroll', checkScroll, { passive: true });
  checkScroll();
}

function filterByCategory(btn, cat) {
  // On mobile: if "Alle" is tapped, open category picker sheet
  if (cat === '' && window.innerWidth <= 768) {
    openMobileCatPicker();
    return;
  }
  // Toggle active state on category buttons
  document.querySelectorAll('.cat-icon-btn').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  // Sync mobile picker active state
  document.querySelectorAll('.mobile-cat-option').forEach(function(o) {
    o.classList.toggle('active', o.getAttribute('data-cat') === (cat || ''));
  });
  // Set the category dropdown to match (empty string = all)
  var sel = document.getElementById('browseCategory');
  if (sel) sel.value = cat || '';
  filterListings();
  // Scroll results into view
  var grid = document.getElementById('browseGrid');
  if (grid) window.scrollTo({ top: grid.getBoundingClientRect().top + window.pageYOffset - 100, behavior: 'smooth' });
}

// ========== MOBILE CATEGORY PICKER ==========
function openMobileCatPicker() {
  var overlay = document.getElementById('mobileCatOverlay');
  var sheet = document.getElementById('mobileCatSheet');
  if (!overlay || !sheet) return;
  overlay.classList.add('open');
  sheet.classList.add('open');
  // Force reflow for animation
  sheet.offsetHeight;
  document.body.style.overflow = 'hidden';
}
function closeMobileCatPicker() {
  var overlay = document.getElementById('mobileCatOverlay');
  var sheet = document.getElementById('mobileCatSheet');
  if (!overlay || !sheet) return;
  overlay.classList.remove('open');
  sheet.classList.remove('open');
  document.body.style.overflow = '';
}
function selectMobileCategory(btn, cat) {
  // Update mobile picker active state
  document.querySelectorAll('.mobile-cat-option').forEach(function(o) { o.classList.remove('active'); });
  btn.classList.add('active');
  // Sync category bar buttons
  document.querySelectorAll('.cat-icon-btn').forEach(function(b) { b.classList.remove('active'); });
  document.querySelectorAll('.cat-icon-btn').forEach(function(b) {
    var btnCat = b.getAttribute('onclick');
    if (cat === '' && btnCat && btnCat.indexOf("''") !== -1) b.classList.add('active');
    else if (cat && btnCat && btnCat.indexOf("'" + cat + "'") !== -1) b.classList.add('active');
  });
  // Set the category dropdown
  var sel = document.getElementById('browseCategory');
  if (sel) sel.value = cat || '';
  closeMobileCatPicker();
  filterListings();
  // Scroll results into view
  var grid = document.getElementById('browseGrid');
  if (grid) {
    setTimeout(function() {
      window.scrollTo({ top: grid.getBoundingClientRect().top + window.pageYOffset - 100, behavior: 'smooth' });
    }, 100);
  }
}

function updateChipLabel(sel) {
  const lbl = sel.parentElement.querySelector('.chip-label');
  if (!lbl) return;
  lbl.textContent = sel.value ? sel.options[sel.selectedIndex].text : (lbl.dataset.default || '');
}

function filterListings() {
  const search = document.getElementById('browseSearch').value.toLowerCase().trim();
  const category = document.getElementById('browseCategory').value;
  const eventType = document.getElementById('browseEventType')?.value || '';
  const location = document.getElementById('browseLocation').value.toLowerCase().trim();
  const priceRange = document.getElementById('browsePrice')?.value || '';
  const minRating = document.getElementById('browseRating')?.value || '';

  let filtered = getHeroListings().filter(l => {
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
  var _vis = getHeroListings();

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
  // Clean up previous cinema before starting new one
  if (_cinemaTimer) { clearInterval(_cinemaTimer); _cinemaTimer = null; }
  var oldCinema = gallery.querySelector('.dg-cinema');
  if (oldCinema && oldCinema.parentNode) oldCinema.parentNode.removeChild(oldCinema);
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
    // For own profile without listings, build from currentUser data
    if (currentUser && pid === currentUser.id) {
      providerListings = [{
        id: 'profile-' + pid,
        _ownProfile: true,
        providerId: pid,
        providerName: currentUser.name || 'Mein Profil',
        providerImg: currentUser.photoUrl || ('https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(currentUser.name || 'user')),
        providerSince: currentUser.since || new Date().getFullYear().toString(),
        description: currentUser.bio || '',
        location: currentUser.location || '',
        categoryLabel: currentUser.role || 'Mitglied',
        priceLabel: '',
        images: currentUser.gallery || [],
        features: [],
        tags: [],
        rating: 0,
        reviews: 0,
        badge: ''
      }];
    } else {
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
  }

  const mainListing = providerListings[0] || LISTINGS[0];
  providerImages = providerListings.flatMap(l => l.images || []);
  // For own profile: if currentUser.gallery is non-empty, it is the saved portfolio
  // (may differ from listing images after edits — always prefer saved gallery)
  if (currentUser && pid === currentUser.id && currentUser.gallery && currentUser.gallery.length > 0) {
    providerImages = currentUser.gallery.slice();
  }

  // Cover Gallery — full-width animated scroll rows
  buildGalleryRows(providerImages);

  // Profile Card
  document.getElementById('providerAvatar').src = mainListing.providerImg;
  document.getElementById('providerName').textContent = mainListing.providerName;
  document.getElementById('providerTagline').textContent = `${mainListing.categoryLabel} · ${mainListing.location}`;
  document.getElementById('providerListingCount').textContent = (providerListings.length === 1 && providerListings[0]._ownProfile) ? 0 : providerListings.length;
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
  var hasOnlySynthetic = providerListings.length === 1 && providerListings[0]._ownProfile;
  if (hasOnlySynthetic) {
    document.getElementById('providerListings').innerHTML =
      '<div class="provider-add-listing" onclick="navigateTo(\'create-listing\')" style="' +
        'display:flex;flex-direction:column;align-items:center;justify-content:center;' +
        'border:2px dashed var(--border);border-radius:var(--radius-lg);' +
        'padding:48px 24px;cursor:pointer;transition:all .2s ease;' +
        'min-height:200px;color:var(--text-light);text-align:center;">' +
        '<span class="material-icons-round" style="font-size:56px;margin-bottom:12px;color:var(--primary);">add_circle_outline</span>' +
        '<span style="font-size:1.05rem;font-weight:600;color:var(--dark);">Erstes Inserat erstellen</span>' +
        '<span style="font-size:0.85rem;margin-top:4px;">Zeig der Community was du anbietest</span>' +
      '</div>';
  } else {
    var plGrid = document.getElementById('providerListings');
    plGrid.innerHTML = providerListings.map(renderListingCard).join('');
    _initGridCards(plGrid);
  }

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
      '<button class="btn-primary" onclick="_provSaveAndExit()">' +
        '<span class="material-icons-round">save</span> Speichern' +
      '</button>' +
      '<button class="btn-outline" onclick="shareProvider()">' +
        '<span class="material-icons-round">share</span> Teilen' +
      '</button>';
  }

  // --- Avatar edit overlay ---

  // Sync currentUser.gallery with all images currently shown in portfolio
  // (providerImages may come from listing data, not currentUser.gallery)
  if (currentUser && providerImages.length > 0) {
    currentUser.gallery = providerImages.slice();
  }
  var avatarImg = document.getElementById('providerAvatar');
  if (avatarImg && !avatarImg.parentElement.querySelector('.prov-edit-avatar-overlay')) {
    // Wrap avatar in a relative container if not already wrapped
    var avatarWrapper = avatarImg.parentElement;
    if (!avatarWrapper.classList.contains('prov-avatar-wrapper')) {
      avatarWrapper = document.createElement('div');
      avatarWrapper.className = 'prov-avatar-wrapper';
      avatarImg.parentNode.insertBefore(avatarWrapper, avatarImg);
      avatarWrapper.appendChild(avatarImg);
    }
    var overlay = document.createElement('div');
    overlay.className = 'prov-edit-avatar-overlay';
    overlay.innerHTML = '<span class="material-icons-round">photo_camera</span>';
    overlay.onclick = function() { document.getElementById('provEditAvatarInput').click(); };
    avatarWrapper.appendChild(overlay);
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
        '</textarea>';
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

  // Sync providerImages from the live DOM (avoids LISTINGS cache reverting cropped URLs)
  if (portfolioEl) {
    providerImages = Array.from(portfolioEl.querySelectorAll('img')).map(function(img) { return img.src; });
  }
  // Rebuild cover gallery with final providerImages
  buildGalleryRows(providerImages);
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

function _provSaveAll() {
  if (!currentUser) return Promise.reject();
  var payload = {};
  // Bio
  var bioTextarea = document.getElementById('provEditBioText');
  if (bioTextarea) {
    var bioText = bioTextarea.value.trim();
    currentUser.bio = bioText;
    payload.bio = bioText;
  }
  // Gallery — read from DOM wraps (source of truth; includes adds/removes/crops)
  var gallery = [];
  var portfolioEl = document.getElementById('providerPortfolio');
  if (portfolioEl) {
    portfolioEl.querySelectorAll('.prov-portfolio-edit-wrap').forEach(function(wrap) {
      var url = wrap.getAttribute('data-url');
      // skip blob: URLs (upload in progress, not yet persisted)
      if (url && !url.startsWith('blob:')) gallery.push(url);
    });
  }
  if (gallery.length === 0) gallery = currentUser.gallery || [];
  currentUser.gallery = gallery;
  payload.gallery = gallery;
  // Also update LISTINGS cache so loadProvider won't revert on re-render
  LISTINGS.forEach(function(l) {
    if (l.providerId === currentUser.id) l.images = gallery.slice();
  });
  providerImages = gallery.slice();
  return fetch(_apiUrl('profile'), {
    method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
    body: JSON.stringify(payload)
  }).then(function(resp) {
    if (!resp.ok) {
      showToast('Fehler beim Speichern (Status ' + resp.status + ')', 'error');
      return Promise.reject();
    }
    return resp;
  }).catch(function() { showToast('Fehler beim Speichern', 'error'); return Promise.reject(); });
}

function _provSaveAndExit() {
  _provSaveAll().then(function() {
    toggleProviderEditMode();
    showToast('Profil gespeichert!', 'check_circle');
  }).catch(function() { /* error toast already shown */ });
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
  // Rebuild cover gallery to reflect removal immediately
  buildGalleryRows(providerImages);
}

function _provCropPortfolioImage(wrap) {
  var img = wrap.querySelector('img');
  if (!img) return;
  var imgObj = new Image();
  // Same-origin images: crossOrigin not needed, canvas won't be tainted
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
  imgObj.onerror = function() { showToast('Bild konnte nicht geladen werden', 'error'); };
  imgObj.src = img.src;
}

function _provEditAddGalleryImages(input) {
  if (!input.files || input.files.length === 0) return;
  var maxTotal = 50;
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
  return fetch(_apiUrl('profile'), {
    method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
    body: JSON.stringify({ gallery: gallery })
  }).then(function(resp) {
    if (!resp.ok) showToast('Fehler beim Speichern der Galerie (Status ' + resp.status + ')', 'error');
    return resp;
  }).catch(function() { showToast('Fehler beim Speichern', 'error'); });
}

function _provAddPortfolioItem(url) {
  if (!currentUser) return;
  if (!currentUser.gallery) currentUser.gallery = [];
  currentUser.gallery.push(url);
  providerImages.push(url);
  _provSaveGallery();
  // Rebuild cover gallery to reflect the new image immediately
  buildGalleryRows(providerImages);
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
  galleryRAFs.forEach(function(r) { if (r && r.cancel) r.cancel(); else cancelAnimationFrame(r); });
  galleryRAFs = [];

  var provPage = document.getElementById('page-provider');
  if (!images.length) {
    // In edit mode: keep gallery visible so the upload button overlay is accessible
    var isEditMode = !!(document.getElementById('page-provider') || {}).classList && document.getElementById('page-provider').classList.contains('provider-edit-mode');
    if (!isEditMode) {
      gallery.style.display = 'none';
      if (provPage) provPage.style.setProperty('padding-top', 'calc(var(--nav-height) + 48px)', 'important');
    } else {
      gallery.style.display = '';
      if (provPage) provPage.style.setProperty('padding-top', '0', 'important');
    }
    return;
  }
  gallery.style.display = '';
  if (provPage) provPage.style.setProperty('padding-top', '0', 'important');

  // === Single image: static full-cover display, no animation ===
  if (images.length === 1) {
    area.style.padding = '0';
    const t = document.createElement('div');
    t.className = 'pcg-thumb';
    t.style.cssText = 'width:100%;height:100%;flex:1;background-size:cover;background-position:center;';
    t.style.backgroundImage = `url(${images[0]})`;
    t.addEventListener('click', () => openProviderLightbox(0));
    area.appendChild(t);
    return;
  }
  area.style.padding = '';

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
  const viewW = gallery.offsetWidth || window.innerWidth;

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

    // Calculate enough copies to fill the viewport for seamless looping:
    // strip must be >= 2*segW + viewW so pos range [-2*segW, 0] never shows blank space
    const segW = rowImages.length * itemW;
    const copies = Math.max(3, Math.ceil(viewW / segW) + 2);
    const repeated = [];
    for (let c = 0; c < copies; c++) { rowImages.forEach(item => repeated.push(item)); }

    repeated.forEach(item => {
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

  let _rafId = 0;
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
    _rafId = requestAnimationFrame(tick);
  }

  _rafId = requestAnimationFrame(tick);
  galleryRAFs.push({ cancel: function() { cancelAnimationFrame(_rafId); } });

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

// ──── Inactivity auto-logout (15 min) ────
// Uses timestamp comparison instead of raw setTimeout so that
// Safari (which freezes timers when tabs are backgrounded) doesn't
// fire the callback immediately after the tab is foregrounded.
var _inactivityTimer = null;
var _lastActivity = 0;
var _INACTIVITY_MS = 15 * 60 * 1000;

function _touchActivity() {
  _lastActivity = Date.now();
}

function _checkInactivity() {
  if (!isLoggedIn) return;
  var elapsed = Date.now() - _lastActivity;
  if (elapsed >= _INACTIVITY_MS) {
    logout();
    showToast('Du wurdest wegen Inaktivität abgemeldet.', 'timer_off');
  }
}

function _startInactivityWatch() {
  _touchActivity();
  var events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
  events.forEach(function(evt) {
    document.addEventListener(evt, _touchActivity, { passive: true });
  });
  // Check every 30 s (aligns with heartbeat)
  _inactivityTimer = setInterval(_checkInactivity, 30000);
  // Also check when Safari un-freezes the tab
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) _checkInactivity();
  });
}

function _stopInactivityWatch() {
  if (_inactivityTimer) { clearInterval(_inactivityTimer); _inactivityTimer = null; }
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
          } else if (msg.type === 'booking' || _isBookingContent(msg.text || msg.content)) {
            return _renderBookingCard(msg);
          } else if (_isStatusMessage(msg.text || msg.content)) {
            return '<div class="msg msg-system">' + _escHtml(msg.text || msg.content || '') + '</div>';
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

function _isBookingContent(text) {
  if (!text) return false;
  try { var d = JSON.parse(text); if (d && d.listing) return true; } catch(e) {}
  if (/^Anfrage\n/.test(text)) return true;
  return false;
}

function _isStatusMessage(text) {
  if (!text) return false;
  return /Angebot\s+.{1,30}\s+(zur\u00fcckgezogen|angenommen|abgelehnt)/i.test(text);
}

function _parseOldBookingText(raw) {
  var lines = raw.split('\n');
  var data = {};
  lines.forEach(function(line) {
    var m;
    if ((m = line.match(/^Listing:\s*(.+)/))) data.listing = m[1];
    else if ((m = line.match(/^Datum:\s*(.+)/))) data.date = m[1];
    else if ((m = line.match(/^Event-Typ:\s*(.+)/))) data.eventType = m[1];
    else if ((m = line.match(/^Gäste:\s*(.+)/))) data.guests = m[1];
    else if ((m = line.match(/^Preis:\s*(.+)/))) data.price = m[1];
    else if ((m = line.match(/^Nachricht:\s*(.+)/))) data.message = m[1];
  });
  return data.listing ? data : null;
}

function _renderBookingCard(msg) {
  var raw = msg.text || msg.content || '';
  var side = msg.type === 'sent' ? 'sent' : 'received';
  var time = msg.time || '';
  var data;
  try { data = JSON.parse(raw); } catch (e) { data = null; }
  if (!data) data = _parseOldBookingText(raw);
  if (!data) {
    return '<div class="cbc cbc-' + side + '">' +
      '<div class="cbc-bubble"><p>' + _escHtml(raw).replace(/\n/g, '<br>') + '</p></div>' +
      (time ? '<span class="cbc-ts">' + _escHtml(time) + '</span>' : '') + '</div>';
  }
  var fmtDate = data.date || '';
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      var d = new Date(data.date + 'T00:00:00');
      fmtDate = d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  } catch (e) {}

  var intro = side === 'sent'
    ? 'Du hast eine Anfrage gesendet'
    : 'Hat dein Inserat gesehen und möchte buchen';

  var html = '<div class="cbc cbc-' + side + '">';

  // --- image banner ---
  if (data.image) {
    html += '<div class="cbc-banner"><img src="' + _escHtml(data.image) + '" alt="" /></div>';
  }

  // --- content ---
  html += '<div class="cbc-content">';
  html += '<div class="cbc-label"><span class="material-icons-round">event_available</span> Anfrage</div>';
  html += '<p class="cbc-intro">' + _escHtml(intro) + '</p>';

  if (data.listing) {
    html += '<div class="cbc-listing">' + _escHtml(data.listing) + '</div>';
  }

  // detail chips
  var chips = '';
  if (fmtDate) chips += '<span class="cbc-chip"><span class="material-icons-round">calendar_today</span>' + _escHtml(fmtDate) + '</span>';
  if (data.eventType) chips += '<span class="cbc-chip"><span class="material-icons-round">celebration</span>' + _escHtml(data.eventType) + '</span>';
  if (data.guests) chips += '<span class="cbc-chip"><span class="material-icons-round">group</span>' + _escHtml(data.guests) + ' Gäste</span>';
  if (data.price) chips += '<span class="cbc-chip"><span class="material-icons-round">sell</span>' + _escHtml(data.price) + '</span>';
  if (chips) html += '<div class="cbc-chips">' + chips + '</div>';

  // personal message
  if (data.message) {
    html += '<div class="cbc-msg">„' + _escHtml(data.message) + '"</div>';
  }

  // action buttons (only for received booking inquiries)
  if (side === 'received') {
    html += '<div class="cbc-actions">' +
      '<button class="cbc-btn cbc-btn-primary" onclick="openNegotiationInChat()"><span class="material-icons-round">gavel</span> Gegenangebot</button>' +
      '<button class="cbc-btn cbc-btn-accept" onclick="acceptBookingFromChat()"><span class="material-icons-round">check_circle</span> Annehmen</button>' +
      '</div>';
  } else {
    html += '<div class="cbc-status"><span class="material-icons-round">check</span> Gesendet</div>';
  }

  html += '</div>'; // cbc-content

  // timestamp
  if (time) html += '<span class="cbc-ts">' + _escHtml(time) + '</span>';

  html += '</div>'; // cbc
  return html;
}

function acceptBookingFromChat() {
  showToast('Anfrage angenommen! Der Kunde wird benachrichtigt.', 'check_circle');
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
        // Pretty-print booking messages in sidebar preview
        if (_isBookingContent(lastMsg)) {
          try { var bd = JSON.parse(lastMsg); lastMsg = '📋 Anfrage: ' + (bd.listing || 'Buchung'); } catch(e) { lastMsg = '📋 Anfrage'; }
        }
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
        } else if (msg.type === 'booking' || _isBookingContent(msg.text || msg.content)) {
          return _renderBookingCard(msg);
        } else if (_isStatusMessage(msg.text || msg.content)) {
          return '<div class="msg msg-system">' + _escHtml(msg.text || msg.content || '') + '</div>';
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
      var content = msg.text || msg.content || text;
      if (_isStatusMessage(content)) {
        msgContainer.innerHTML += '<div class="msg msg-system">' + _escHtml(content) + '</div>';
      } else {
        msgContainer.innerHTML += '<div class="msg msg-sent">' + _escHtml(content) + '<span class="msg-time">' + time + '</span></div>';
      }
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
    } else if (msg.type === 'booking' || _isBookingContent(msg.text || msg.content)) {
      return _renderBookingCard(msg);
    } else if (_isStatusMessage(msg.text)) {
      return '<div class="msg msg-system">' + _escHtml(msg.text) + '</div>';
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
  if (currentUser && currentListing.providerId === currentUser.id) {
    showToast('Du kannst dir nicht selbst schreiben.', 'info');
    return;
  }
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

// ========== BOOKING ==========
function bookListing() {
  if (!isLoggedIn) {
    showToast('Bitte melde dich an, um eine Anfrage zu senden.', 'warning');
    openModal('loginModal');
    return;
  }
  if (!currentListing || !currentListing.providerId) return;
  if (currentUser && currentListing.providerId === currentUser.id) {
    showToast('Du kannst dein eigenes Inserat nicht anfragen.', 'info');
    return;
  }
  var date = document.getElementById('bookingDate').value;
  if (!date) { showToast('Bitte wähle ein Event-Datum.', 'warning'); return; }
  var eventType = document.getElementById('bookingEventType').value;
  var guests = document.getElementById('bookingGuests').value;
  var message = document.getElementById('bookingMessage').value;

  // Create conversation and send booking request
  fetch(_apiUrl('conversations'), {
    method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
    body: JSON.stringify({ other_user_id: currentListing.providerId, listing_id: currentListing._dbId || currentListing.id })
  })
    .then(function(r) { return r.json(); })
    .then(function(convo) {
      var bookingText = JSON.stringify({
        listing: currentListing.title || '',
        date: date,
        eventType: eventType,
        guests: guests || '',
        price: currentListing.priceLabel || '',
        message: message || '',
        image: currentListing.image || ''
      });
      fetch(_apiUrl('conversations/' + convo.id + '/messages'), {
        method: 'POST', credentials: 'same-origin', headers: _apiHeaders(),
        body: JSON.stringify({ content: bookingText, type: 'booking' })
      }).catch(function(){});
      showToast('Anfrage gesendet!', 'event_available');
      navigateTo('messages');
      setTimeout(function() { openChat(convo.id); }, 200);
    })
    .catch(function() {
      showToast('Anfrage konnte nicht gesendet werden', 'error');
    });
}

// ========== NEGOTIATION ==========
function openNegotiation() {
  if (!currentListing) return;
  if (!isLoggedIn) {
    showToast('Bitte melde dich an.', 'warning');
    openModal('loginModal');
    return;
  }
  if (currentUser && currentListing.providerId === currentUser.id) {
    showToast('Du kannst bei deinem eigenen Inserat kein Gegenangebot machen.', 'info');
    return;
  }

  document.getElementById('negListingInfo').innerHTML =
    '<img src="' + _escHtml(currentListing.image || '') + '" alt="' + _escHtml(currentListing.title || '') + '" />' +
    '<div>' +
      '<strong>' + _escHtml(currentListing.title || '') + '</strong>' +
      '<span>' + _escHtml(currentListing.categoryLabel || '') + ' · ' + _escHtml(currentListing.location || '') + '</span>' +
    '</div>';
  document.getElementById('negOriginalPrice').value = currentListing.priceLabel;

  // Pre-fill from booking form so user doesn't have to enter twice
  var bDate = document.getElementById('bookingDate');
  var bMsg = document.getElementById('bookingMessage');
  var nDate = document.getElementById('negDate');
  var nMsg = document.getElementById('negMessage');
  if (bDate && nDate && bDate.value) nDate.value = bDate.value;
  if (bMsg && nMsg && bMsg.value) nMsg.value = bMsg.value;
  // Sync flatpickr if active
  if (nDate && nDate._flatpickr && bDate && bDate.value) nDate._flatpickr.setDate(bDate.value, true);

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
  var roleText = currentUser.role || 'Mitglied';
  if (currentUser.subRole && currentUser.role === 'Event-Planer') {
    roleText += ' (' + (currentUser.subRole === 'unternehmen' ? 'Unternehmen' : 'Privatperson') + ')';
  }
  document.getElementById('profileDisplayRole').innerHTML =
    '<span class="material-icons-round">' + roleIcon + '</span> ' + _escHtml(roleText);
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

  // --- Social Links ---
  _renderProfileSocialLinks();

  // --- Event Connections ---
  _renderProfileEventConnections();
}

function _renderProfileSocialLinks() {
  if (!currentUser) return;
  var displayEl = document.getElementById('profileSocialLinksDisplay');
  var emptyEl = document.getElementById('profileSocialEmpty');
  var links = currentUser.socialLinks || {};
  var html = '';
  if (links.instagram) {
    html += '<a href="' + _escHtml(links.instagram) + '" target="_blank" rel="noopener noreferrer" class="profile-social-link"><span class="material-icons-round" style="color:#E1306C">photo_camera</span> Instagram</a>';
  }
  if (links.linkedin) {
    html += '<a href="' + _escHtml(links.linkedin) + '" target="_blank" rel="noopener noreferrer" class="profile-social-link"><span class="material-icons-round" style="color:#0077B5">business</span> LinkedIn</a>';
  }
  if (links.website) {
    html += '<a href="' + _escHtml(links.website) + '" target="_blank" rel="noopener noreferrer" class="profile-social-link"><span class="material-icons-round">language</span> Website</a>';
  }
  if (displayEl) {
    if (html) {
      displayEl.innerHTML = '<div class="profile-social-links-row">' + html + '</div>';
      if (emptyEl) emptyEl.style.display = 'none';
    } else {
      displayEl.innerHTML = '<p class="profile-social-empty" style="color:var(--text-light);font-size:14px">Noch keine sozialen Links angegeben.</p>';
    }
  }
  // Pre-fill edit fields
  var igEl = document.getElementById('profileInstagram');
  var liEl = document.getElementById('profileLinkedin');
  var wsEl = document.getElementById('profileWebsite');
  if (igEl) igEl.value = links.instagram || '';
  if (liEl) liEl.value = links.linkedin || '';
  if (wsEl) wsEl.value = links.website || '';
}

function _renderProfileEventConnections() {
  var listEl = document.getElementById('profileEventsList');
  if (!listEl || !currentUser) return;
  var events = currentUser.eventConnections || [];
  if (events.length === 0) {
    listEl.innerHTML = '<div class="profile-events-empty" style="text-align:center;padding:24px;color:var(--text-light)"><span class="material-icons-round" style="font-size:36px;opacity:0.3;display:block;margin-bottom:8px">celebration</span><p>Noch keine Events eingetragen. Teile welche Events du erlebt hast!</p></div>';
    return;
  }
  listEl.innerHTML = events.map(function(ev) {
    return '<div class="profile-event-connection-card">' +
      '<div class="pec-icon"><span class="material-icons-round">celebration</span></div>' +
      '<div class="pec-info">' +
        '<strong>' + _escHtml(ev.eventName) + '</strong>' +
        '<span>' + _escHtml(ev.date || '') + (ev.location ? ' · ' + _escHtml(ev.location) : '') + '</span>' +
        (ev.metPerson ? '<div class="pec-met"><span class="material-icons-round">people</span> Kennengelernt: <em>' + _escHtml(ev.metPerson) + '</em></div>' : '') +
      '</div>' +
      '<button class="pec-delete" onclick="_deleteEventConnection(\'' + ev.id + '\')"><span class="material-icons-round">close</span></button>' +
    '</div>';
  }).join('');
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
    case 'socialLinks':
      currentUser.socialLinks = currentUser.socialLinks || {};
      var igEl = document.getElementById('profileInstagram');
      var liEl = document.getElementById('profileLinkedin');
      var wsEl = document.getElementById('profileWebsite');
      if (igEl) currentUser.socialLinks.instagram = igEl.value.trim();
      if (liEl) currentUser.socialLinks.linkedin = liEl.value.trim();
      if (wsEl) currentUser.socialLinks.website = wsEl.value.trim();
      payload.socialLinks = currentUser.socialLinks;
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
  var settingsRole = currentUser.role || 'Mitglied';
  if (currentUser.subRole && currentUser.role === 'Event-Planer') {
    settingsRole += ' (' + (currentUser.subRole === 'unternehmen' ? 'Unternehmen' : 'Privatperson') + ')';
  }
  document.getElementById('settingsRoleDisplay').textContent = settingsRole;
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

  // 2FA toggle
  var twoFaToggle = document.getElementById('settings2faToggle');
  var twoFaStatus = document.getElementById('settings2faStatus');
  if (twoFaToggle) twoFaToggle.checked = !!(currentUser && currentUser.twoFA);
  if (twoFaStatus) twoFaStatus.textContent = (currentUser && currentUser.twoFA) ? 'Aktiviert – Bei jedem Login wird ein E-Mail-Code angefordert.' : 'Deaktiviert – Login nur mit Passwort.';
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

function toggle2faSetting(checkbox) {
  var enabled = checkbox.checked;
  var statusEl = document.getElementById('settings2faStatus');

  fetch(_apiUrl('settings/2fa'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: _apiHeaders(),
    body: JSON.stringify({ enabled: enabled })
  })
    .then(function(r) { _refreshNonce(r); return r.json().then(function(d) { return { ok: r.ok, data: d }; }); })
    .then(function(res) {
      if (!res.ok) {
        checkbox.checked = !enabled;
        showToast(res.data.message || 'Fehler beim Speichern', 'error');
        return;
      }
      if (currentUser) currentUser.twoFA = !!res.data.twoFA;
      if (statusEl) statusEl.textContent = res.data.twoFA ? 'Aktiviert – Bei jedem Login wird ein E-Mail-Code angefordert.' : 'Deaktiviert – Login nur mit Passwort.';
      showToast(res.data.twoFA ? 'E-Mail-2FA aktiviert' : 'E-Mail-2FA deaktiviert', res.data.twoFA ? 'verified_user' : 'shield');
    })
    .catch(function() {
      checkbox.checked = !enabled;
      showToast('Netzwerkfehler', 'error');
    });
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
      // Falls Rolle geändert wurde, UI aktualisieren
      if (res.data && res.data.role && res.data.role !== currentUser.role) {
        currentUser.role = res.data.role;
        updateCreateFormForRole();
      }
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

  var slider = document.getElementById('lcropZoom');
  var imgAspect = _lcropImg.width / _lcropImg.height;
  var frameAspect = w / h;
  // Minimum zoom = fit whole image within frame
  var minZoom = imgAspect > frameAspect ? frameAspect / imgAspect : imgAspect / frameAspect;
  minZoom = Math.round(minZoom * 100) / 100;
  slider.min = minZoom;
  var zoom = Math.max(minZoom, parseFloat(slider.value) || 1);
  var drawW, drawH;
  // Cover: fill the 4:3 frame
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
    slider.value = Math.max(parseFloat(slider.min), Math.min(3, v));
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
    if (!blob) { showToast('Zuschneiden fehlgeschlagen – bitte erneut versuchen', 'error'); return; }
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
          // Update gallery in memory
          if (currentUser) {
            if (!currentUser.gallery) currentUser.gallery = [];
            var gIdx = currentUser.gallery.indexOf(oldUrl);
            if (gIdx > -1) {
              currentUser.gallery[gIdx] = data.url;
            } else {
              // listing image not yet in gallery — add new URL, remove old if present
              currentUser.gallery.push(data.url);
            }
          }
          // Update providerImages in memory (keeps lightbox in sync)
          var pIdx = providerImages.indexOf(oldUrl);
          if (pIdx > -1) providerImages[pIdx] = data.url;
          // Update LISTINGS cache so loadProvider won't revert
          LISTINGS.forEach(function(l) {
            if (l.images) {
              var lIdx = l.images.indexOf(oldUrl);
              if (lIdx > -1) l.images[lIdx] = data.url;
            }
          });
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

// ======== UNIVERSAL DRAG/SWIPE-SCROLL for horizontal containers ========
function _makeDraggable(el) {
  if (!el || el._dragInit) return;
  el._dragInit = true;

  var isDown = false, startX = 0, scrollLeft = 0, lastX = 0, lastTime = 0, velocity = 0, moved = false;
  var rafId = null;

  // ── Mouse drag (desktop) ──
  el.addEventListener('mousedown', function(e) {
    if (e.button !== 0) return;
    isDown = true; moved = false;
    el.classList.add('dragging');
    startX = e.pageX;
    scrollLeft = el.scrollLeft;
    lastX = e.pageX; lastTime = performance.now(); velocity = 0;
    e.preventDefault();
  });

  document.addEventListener('mousemove', function(e) {
    if (!isDown) return;
    var dx = e.pageX - startX;
    if (Math.abs(dx) > 3) moved = true;
    var now = performance.now();
    var dt = now - lastTime;
    if (dt > 0) velocity = (e.pageX - lastX) / dt;
    lastX = e.pageX; lastTime = now;
    el.scrollLeft = scrollLeft - dx;
  });

  document.addEventListener('mouseup', function() {
    if (!isDown) return;
    isDown = false;
    el.classList.remove('dragging');
    // Momentum coast
    if (Math.abs(velocity) > 0.5) {
      _momentumScroll(el, velocity);
    }
  });

  // Prevent click when dragged
  el.addEventListener('click', function(e) {
    if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
  }, true);

  // ── Touch (mobile) – native scrolling is fine, but add momentum feel ──
  var touchStartX = 0, touchScrollLeft = 0;
  el.addEventListener('touchstart', function(e) {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    touchStartX = e.touches[0].pageX;
    touchScrollLeft = el.scrollLeft;
    velocity = 0; lastX = touchStartX; lastTime = performance.now();
    el.classList.add('dragging');
  }, { passive: true });

  el.addEventListener('touchmove', function(e) {
    var now = performance.now();
    var dt = now - lastTime;
    if (dt > 0) velocity = (e.touches[0].pageX - lastX) / dt;
    lastX = e.touches[0].pageX; lastTime = now;
  }, { passive: true });

  el.addEventListener('touchend', function() {
    el.classList.remove('dragging');
    if (Math.abs(velocity) > 0.4) {
      _momentumScroll(el, velocity);
    }
  }, { passive: true });

  function _momentumScroll(container, vel) {
    var speed = vel * 12;
    var decel = 0.95;
    function step() {
      if (Math.abs(speed) < 0.5) return;
      container.scrollLeft -= speed;
      speed *= decel;
      rafId = requestAnimationFrame(step);
    }
    rafId = requestAnimationFrame(step);
  }
}

function initDragScroll() {
  // Apply to ALL horizontal-scroll containers
  var selectors = [
    '.category-scroll',
    '.browse-categories-inner',
    '.chip-group',

    '.testimonials-scroll',
    '.browse-filter-pills',
  ];
  selectors.forEach(function(sel) {
    document.querySelectorAll(sel).forEach(_makeDraggable);
  });
}

// ========== DARK MODE ==========
function initDarkMode() {
  var isDark = localStorage.getItem('eb_dark_mode') === '1';
  _applyDarkMode(isDark);
  var toggle = document.getElementById('darkModeToggle');
  if (toggle) toggle.checked = isDark;
}

function toggleDarkMode(on) {
  localStorage.setItem('eb_dark_mode', on ? '1' : '0');
  _applyDarkMode(on);
  var icon = document.getElementById('darkModeIcon');
  var label = document.getElementById('darkModeLabel');
  if (icon) icon.textContent = on ? 'light_mode' : 'dark_mode';
  if (label) label.textContent = on ? 'Hellmodus' : 'Dunkelmodus';
}

function _applyDarkMode(on) {
  document.body.classList.toggle('dark-mode', on);
  document.documentElement.classList.remove('dark-early');
  var icon = document.getElementById('darkModeIcon');
  var label = document.getElementById('darkModeLabel');
  if (icon) icon.textContent = on ? 'light_mode' : 'dark_mode';
  if (label) label.textContent = on ? 'Hellmodus' : 'Dunkelmodus';
  // Update theme-color meta for mobile browser chrome
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.appendChild(meta); }
  meta.content = on ? '#1A1A1A' : '#FFFFFF';
}

// Init drag & drop after DOM loaded
document.addEventListener('DOMContentLoaded', function() {
  initDarkMode();
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

  // Clear all browse filters on fresh page load (prevent browser form restoration)
  var _clearBrowseFilters = function(){
    ['browseSearch','browseCategory','browseEventType','browseLocation','browsePrice','browseRating'].forEach(function(id){
      var el = document.getElementById(id); if(el) el.value = '';
    });
  };
  _clearBrowseFilters();
  // Some browsers restore form values AFTER DOMContentLoaded – clear again after a tick
  setTimeout(_clearBrowseFilters, 0);

  // Handle initial route (deep links, clean URLs, legacy hash)
  var initRoute = _readSpaRoute();
  var initPage = initRoute.page;
  var initData = initRoute.data;
  if (initPage === 'home') initPage = 'browse';
  // Clean up legacy hash if present
  if (window.location.hash) {
    window.history.replaceState({ page: initPage, data: initData }, '', _spaPath(initPage, initData));
  } else {
    window.history.replaceState({ page: initPage, data: initData }, '', _spaPath(initPage, initData));
  }
  if (initPage && initPage !== 'browse') {
    navigateTo(initPage, initData, true);
  } else {
    navigateTo('browse', null, true);
  }

// Handle browser back/forward
  window.addEventListener('popstate', function(e) {
    // Always restore scrolling when navigating back/forward
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    if (e.state && e.state.page) {
      navigateTo(e.state.page, e.state.data, true);
    }
  });

  initVisualMotion();
});

// ========== PAGE MOTION (subtle Apple-like interactivity) ==========
var _visualMotionRAF = 0;
function initVisualMotion() {
  const hero = document.querySelector('.hero');
  const heroBg = document.querySelector('.hero-bg');
  const sections = document.querySelectorAll('main .section, .hero-content, .hero-marquee');

  if (hero) hero.classList.add('hero-float');

  // Use scroll event instead of perpetual RAF loop
  var _vmTicking = false;
  var lastScroll = 0;
  window.addEventListener('scroll', function() {
    if (_vmTicking) return;
    _vmTicking = true;
    requestAnimationFrame(function() {
      var scrollY = window.scrollY;
      if (heroBg) {
        var strength = Math.min(50, scrollY / 10);
        heroBg.style.transform = 'translate3d(0,' + strength + 'px,0) scale(1.04)';
      }
      if (hero) {
        var tilt = Math.min(18, Math.max(-18, (scrollY - lastScroll) * 0.15));
        hero.style.transform = 'perspective(1000px) translateZ(0) rotateX(' + tilt + 'deg)';
        lastScroll = scrollY;
      }
      _vmTicking = false;
    });
  }, { passive: true });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.25 });

  sections.forEach(el => {
    el.classList.add('animated-entry');
    observer.observe(el);
  });
}

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
      _initGridCards(grid);
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
      _initGridCards(grid);
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
    _refreshNonce(r);
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
    .then(function(r) {
      _refreshNonce(r);
      if (!r.ok) throw new Error(r.status);
      return r.json();
    })
    .then(function(users) {
      if (!Array.isArray(users)) throw new Error('bad payload');
      _adminUsers = users;
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
      ? '<span class="admin-role-badge admin-role-admin">Admin</span>'
      : '';
    var tagBadges = '';
    if (u.tags && u.tags.length) {
      u.tags.forEach(function(tag) {
        tagBadges += ' <span class="admin-tag-badge">' + _escHtml(tag) +
          '<span class="material-icons-round admin-tag-remove" onclick="adminRemoveTag(' + u.id + ',\'' + _escHtml(tag).replace(/'/g, "\\'") + '\')" title="Tag entfernen">close</span>' +
        '</span>';
      });
    }
    tagBadges += '<span class="admin-tag-wrapper">' +
      '<button class="admin-tag-add-btn" onclick="adminToggleTagDropdown(event,' + u.id + ')" title="Tag hinzufügen"><span class="material-icons-round" style="font-size:16px">add</span></button>' +
      '<div class="admin-tag-dropdown" id="tagDrop' + u.id + '">' +
        '<input type="text" placeholder="Neuer Tag..." onkeydown="adminTagInputKey(event,' + u.id + ')" oninput="adminFilterTagSuggestions(event,' + u.id + ')" />' +
        '<div class="admin-tag-suggestions" id="tagSug' + u.id + '"></div>' +
      '</div>' +
    '</span>';
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

    // Role switch buttons (Dienstleister / Event-Planer)
    var roleSwitcher = '';
    {
      var isDL = baseRole === 'Dienstleister';
      var isEP = baseRole === 'Event-Planer';
      roleSwitcher = '<div class="admin-role-switcher">' +
        '<button class="admin-role-btn ep' + (isEP ? ' active' : '') + '" onclick="adminChangeRole(' + u.id + ',\'event_planer\')" title="Als Event-Planer setzen">' +
          '<span class="material-icons-round">celebration</span> Event-Planer' +
        '</button>' +
        '<button class="admin-role-btn dl' + (isDL ? ' active' : '') + '" onclick="adminChangeRole(' + u.id + ',\'dienstleister\')" title="Als Dienstleister setzen">' +
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

    html += '<div class="' + cardClass + '" data-uid="' + u.id + '">' +
      '<div class="admin-user-avatar" onclick="navigateTo(\'provider\',' + u.id + ')">' +
        '<img src="' + _escHtml(avatarSrc) + '" alt="">' +
      '</div>' +
      '<div class="admin-user-info">' +
        '<div class="admin-user-name">' + displayName + ' ' + roleBadge + tagBadges + activeBadge + '</div>' +
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

var _allAdminTags = [];

function adminLoadAllTags(cb) {
  fetch('/wp-json/eventboerse/v1/admin/all-tags', { credentials: 'same-origin', headers: { 'X-WP-Nonce': wpNonce } })
    .then(function(r) { return r.json(); })
    .then(function(d) { _allAdminTags = d.tags || []; if (cb) cb(); });
}

function adminToggleTagDropdown(ev, userId) {
  ev.stopPropagation();
  var drop = document.getElementById('tagDrop' + userId);
  if (!drop) return;
  var wasOpen = drop.classList.contains('show');
  // Close all dropdowns
  document.querySelectorAll('.admin-tag-dropdown.show').forEach(function(d) { d.classList.remove('show'); });
  if (wasOpen) return;
  adminLoadAllTags(function() {
    adminRenderTagSuggestions(userId, '');
    drop.classList.add('show');
    var inp = drop.querySelector('input');
    if (inp) { inp.value = ''; inp.focus(); }
  });
}

function adminRenderTagSuggestions(userId, filter) {
  var sug = document.getElementById('tagSug' + userId);
  if (!sug) return;
  // Find current tags for this user
  var card = sug.closest('.admin-user-card');
  var currentTags = [];
  if (card) card.querySelectorAll('.admin-tag-badge').forEach(function(b) {
    var t = b.childNodes[0];
    if (t) currentTags.push(t.textContent.trim());
  });
  var html = '';
  _allAdminTags.forEach(function(tag) {
    if (currentTags.indexOf(tag) !== -1) return;
    if (filter && tag.toLowerCase().indexOf(filter.toLowerCase()) === -1) return;
    html += '<div class="admin-tag-suggestion" onclick="adminAddTag(' + userId + ',\'' + _escHtml(tag).replace(/'/g, "\\'") + '\')">' + _escHtml(tag) + '</div>';
  });
  sug.innerHTML = html;
}

function adminFilterTagSuggestions(ev, userId) {
  adminRenderTagSuggestions(userId, ev.target.value.trim());
}

function adminTagInputKey(ev, userId) {
  if (ev.key === 'Enter') {
    ev.preventDefault();
    var val = ev.target.value.trim();
    if (val) adminAddTag(userId, val);
  }
}

function adminAddTag(userId, tag) {
  // Collect current tags
  var card = document.querySelector('.admin-user-card[data-uid="' + userId + '"]');
  if (!card) return;
  var currentTags = [];
  card.querySelectorAll('.admin-tag-badge').forEach(function(b) {
    var t = b.childNodes[0];
    if (t) currentTags.push(t.textContent.trim());
  });
  if (currentTags.indexOf(tag) !== -1) return;
  currentTags.push(tag);
  adminSaveTags(userId, currentTags);
}

function adminRemoveTag(userId, tag) {
  var card = document.querySelector('.admin-user-card[data-uid="' + userId + '"]');
  if (!card) return;
  var currentTags = [];
  card.querySelectorAll('.admin-tag-badge').forEach(function(b) {
    var t = b.childNodes[0];
    if (t) currentTags.push(t.textContent.trim());
  });
  currentTags = currentTags.filter(function(t) { return t !== tag; });
  adminSaveTags(userId, currentTags);
}

function adminSaveTags(userId, tags) {
  fetch('/wp-json/eventboerse/v1/admin/user-tags', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': wpNonce },
    body: JSON.stringify({ user_id: userId, tags: tags })
  })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (d.tags) {
        if (_adminUsers) {
          _adminUsers.forEach(function(u) {
            if (u.id === userId) u.tags = d.tags;
          });
          renderAdminUserList(_adminUsers);
        }
      }
    });
}

// Close tag dropdowns on outside click
document.addEventListener('click', function() {
  document.querySelectorAll('.admin-tag-dropdown.show').forEach(function(d) { d.classList.remove('show'); });
});

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
    // Wenn der aktuelle User selbst betroffen ist, Rolle im Frontend aktualisieren
    if (currentUser && currentUser.id === userId) {
      currentUser.role = d.role;
      updateCreateFormForRole();
    }
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
var _pendingRegOtp = null;
var _conditionalAbort = null;
var _backendAvailable = null; // null = not checked, true/false after check

// ── Offline / Demo Auth (localStorage-based) ──────────────
function _demoUsers() {
  try { return JSON.parse(localStorage.getItem('eb_demo_users') || '[]'); } catch(e) { return []; }
}
function _saveDemoUsers(users) {
  localStorage.setItem('eb_demo_users', JSON.stringify(users));
}
function _demoSession() {
  try { return JSON.parse(localStorage.getItem('eb_demo_session') || 'null'); } catch(e) { return null; }
}
function _saveDemoSession(user) {
  localStorage.setItem('eb_demo_session', user ? JSON.stringify(user) : 'null');
}

// Check backend availability (cached for 60s)
var _backendCheckedAt = 0;
async function _checkBackend() {
  if (_backendAvailable !== null && (Date.now() - _backendCheckedAt < 60000)) return _backendAvailable;
  try {
    var controller = new AbortController();
    var timer = setTimeout(function() { controller.abort(); }, 3000);
    var r = await fetch(_apiUrl('me'), {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timer);
    _backendAvailable = true;
    _backendCheckedAt = Date.now();
    return true;
  } catch(e) {
    _backendAvailable = false;
    _backendCheckedAt = Date.now();
    return false;
  }
}

// Demo-mode: local login
function _demoLogin(email, password) {
  var users = _demoUsers();
  var user = users.find(function(u) { return u.email.toLowerCase() === email.toLowerCase(); });
  if (!user) return { ok: false, message: 'Kein Konto mit dieser E-Mail gefunden.' };
  if (user.password !== password) return { ok: false, message: 'Falsches Passwort.' };
  _saveDemoSession(user);
  return { ok: true, user: user };
}

// Demo-mode: local register
function _demoRegister(email, password, firstName, lastName, role, subRole, company, vatId) {
  var users = _demoUsers();
  if (users.find(function(u) { return u.email.toLowerCase() === email.toLowerCase(); })) {
    return { ok: false, message: 'Diese E-Mail-Adresse wird bereits verwendet.' };
  }
  var displayRole = role === 'provider' ? 'Dienstleister' : 'Event-Planer';
  var user = {
    user_id: Date.now(),
    id: Date.now(),
    email: email,
    password: password,
    first_name: firstName,
    last_name: lastName,
    name: (firstName + ' ' + lastName).trim(),
    role: displayRole,
    subRole: role === 'user' ? (subRole || 'privat') : '',
    isAdmin: false,
    emailVerified: true,
    hasPasskey: false,
    passkeyCount: 0,
    twoFA: false,
    since: new Date().toISOString().split('T')[0],
    tagline: '', location: '', bio: '',
    company: company || '', vatId: vatId || '',
    gallery: [],
    coverUrl: '', coverPosY: 50, photoUrl: '', phone: ''
  };
  users.push(user);
  _saveDemoUsers(users);
  _saveDemoSession(user);
  return { ok: true, user: user };
}

// Demo-mode: passkey (WebAuthn)
function _demoPasskeyCredentials() {
  try { return JSON.parse(localStorage.getItem('eb_demo_passkeys') || '[]'); } catch(e) { return []; }
}
function _saveDemoPasskeys(creds) {
  localStorage.setItem('eb_demo_passkeys', JSON.stringify(creds));
}

async function _demoPasskeyRegister(label) {
  if (!isWebAuthnAvailable()) throw new Error('Dieses Gerät unterstützt keine Passkeys.');
  if (!currentUser) throw new Error('Bitte zuerst anmelden.');

  var userId = new Uint8Array(16);
  crypto.getRandomValues(userId);
  var challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  var publicKey = {
    challenge: challenge.buffer,
    rp: { name: 'Eventbörse', id: window.location.hostname },
    user: {
      id: userId.buffer,
      name: currentUser.email,
      displayName: currentUser.name
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },
      { alg: -257, type: 'public-key' }
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      residentKey: 'required',
      userVerification: 'required'
    },
    timeout: 60000,
    attestation: 'none'
  };

  var credential = await navigator.credentials.create({ publicKey: publicKey });
  var creds = _demoPasskeyCredentials();
  creds.push({
    credId: _arrayBufferToBase64Url(credential.rawId),
    userId: currentUser.id || currentUser.user_id,
    email: currentUser.email,
    label: label || 'Passkey',
    created: new Date().toISOString()
  });
  _saveDemoPasskeys(creds);
  currentUser.hasPasskey = true;
  currentUser.passkeyCount = creds.filter(function(c) { return c.userId === (currentUser.id || currentUser.user_id); }).length;
  return { success: true, hasPasskey: true, passkeyCount: currentUser.passkeyCount };
}

async function _demoPasskeyLogin(email) {
  if (!isWebAuthnAvailable()) throw new Error('Dieses Gerät unterstützt keine Passkeys.');

  var creds = _demoPasskeyCredentials();
  var allowCredentials = creds;
  if (email) {
    allowCredentials = creds.filter(function(c) { return c.email.toLowerCase() === email.toLowerCase(); });
  }
  if (allowCredentials.length === 0) throw new Error('Keine Passkeys gefunden. Bitte richte zuerst einen Passkey ein.');

  var challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  var publicKey = {
    challenge: challenge.buffer,
    rpId: window.location.hostname,
    allowCredentials: allowCredentials.map(function(c) {
      return { id: _base64UrlToArrayBuffer(c.credId), type: 'public-key' };
    }),
    userVerification: 'required',
    timeout: 60000
  };

  var assertion = await navigator.credentials.get({ publicKey: publicKey });
  var usedCredId = _arrayBufferToBase64Url(assertion.rawId);
  var matched = creds.find(function(c) { return c.credId === usedCredId; });
  if (!matched) throw new Error('Passkey nicht erkannt.');

  // Find the user
  var users = _demoUsers();
  var user = users.find(function(u) { return (u.id || u.user_id) === matched.userId || u.email.toLowerCase() === matched.email.toLowerCase(); });
  if (!user) throw new Error('Benutzer nicht gefunden.');

  _saveDemoSession(user);
  return { ok: true, user: user };
}

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
    subRole: data.subRole || data.sub_role || fallback.subRole || fallback.sub_role || '',
    isAdmin: (data.role === 'Admin') || (fallback.role === 'Admin') || false,
    tagline: data.tagline || fallback.tagline || '',
    location: data.location || fallback.location || '',
    bio: data.bio || fallback.bio || '',
    company: data.company || fallback.company || '',
    vatId: data.vatId || data.vat_id || fallback.vatId || fallback.vat_id || '',
    gallery: data.gallery || fallback.gallery || [],
    coverUrl: data.coverUrl || fallback.coverUrl || '',
    coverPosY: data.coverPosY || fallback.coverPosY || 50,
    photoUrl: data.photoUrl || fallback.photoUrl || '',
    phone: data.phone || fallback.phone || '',
    since: data.since || fallback.since || '',
    emailVerified: typeof data.emailVerified === 'boolean' ? data.emailVerified : (typeof fallback.emailVerified === 'boolean' ? fallback.emailVerified : true),
    hasPasskey: typeof data.hasPasskey === 'boolean' ? data.hasPasskey : (typeof fallback.hasPasskey === 'boolean' ? fallback.hasPasskey : false),
    passkeyCount: typeof data.passkeyCount === 'number' ? data.passkeyCount : (typeof fallback.passkeyCount === 'number' ? fallback.passkeyCount : 0),
    twoFA: typeof data.twoFA === 'boolean' ? data.twoFA : (typeof fallback.twoFA === 'boolean' ? fallback.twoFA : false)
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

  // Demo/offline mode
  if (_backendAvailable === false) {
    return await _demoPasskeyRegister(label);
  }

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

    var online = await _checkBackend();

    if (!online) {
      // Demo/offline passkey login
      var demoResult = await _demoPasskeyLogin(email);
      _applyAuthenticatedUser(demoResult.user);
      closeModal('loginModal');
      var form = document.querySelector('#loginModal .modal-form');
      if (form) form.reset();
      applyLogin();
      showToast('Passkey-Anmeldung erfolgreich (Offline-Modus)', 'fingerprint');
    } else {
      await loginWithPasskey(email);
      closeModal('loginModal');
      var form = document.querySelector('#loginModal .modal-form');
      if (form) form.reset();
      applyLogin();
      showToast('Passkey-Anmeldung erfolgreich', 'fingerprint');
    }
    maybePromptPasskeySetup();
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
  // Demo/offline mode
  if (_backendAvailable === false) {
    var creds = _demoPasskeyCredentials();
    var uid = currentUser ? (currentUser.id || currentUser.user_id) : null;
    var userCreds = creds.filter(function(c) { return c.userId === uid; });
    return {
      hasPasskey: userCreds.length > 0,
      passkeyCount: userCreds.length,
      credentials: userCreds.map(function(c) {
        return { credential_id: c.credId, label: c.label, created_at: c.created ? c.created.split('T')[0] : 'unbekannt', last_used_at: 'n/a', transports: ['internal'] };
      })
    };
  }

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
  // Demo/offline mode
  if (_backendAvailable === false) {
    var creds = _demoPasskeyCredentials();
    creds = creds.filter(function(c) { return c.credId !== credentialId; });
    _saveDemoPasskeys(creds);
    var uid = currentUser ? (currentUser.id || currentUser.user_id) : null;
    var remaining = creds.filter(function(c) { return c.userId === uid; });
    if (currentUser) {
      currentUser.hasPasskey = remaining.length > 0;
      currentUser.passkeyCount = remaining.length;
    }
    return { hasPasskey: remaining.length > 0, passkeyCount: remaining.length };
  }

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
    .then(function(r) { _refreshNonce(r); return r.json(); })
    .then(function(convos) {
      var total = (convos || []).reduce(function(sum, c) { return sum + (parseInt(c.unread_count) || 0); }, 0);
      updateMsgBadge(total);
    })
    .catch(function() { updateMsgBadge(0); });
  // Start presence heartbeat
  _startHeartbeat();
  // Start inactivity auto-logout watch
  _startInactivityWatch();
  // Re-render board if currently visible (session restored after initial render)
  if (document.getElementById('page-board') && document.getElementById('page-board').classList.contains('active')) {
    _migrateBoardProjects();
    _loadBoardProjects();
    renderBoardPage();
  }
}

function applyLogout() {
  isLoggedIn = false;
  currentUser = null;
  _stopHeartbeat();
  _stopInactivityWatch();
  _dbListingsLoaded = false;
  _favoritesLoaded = false;
  favorites.clear();
  // Don't clear localStorage — favorites persist for next login
  _boardProjects = [];
  _activeBoardId = null;
  // Re-render board if currently visible so projects disappear
  if (document.getElementById('page-board') && document.getElementById('page-board').classList.contains('active')) {
    renderBoardPage();
  }
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
  // Sofort aus wp_localize_script lesen (frisch gerenderte Seite)
  if (typeof eventboerseApi !== 'undefined' && eventboerseApi.isLoggedIn && eventboerseApi.user) {
    currentUser = _normalizeUserPayload(eventboerseApi.user);
    applyLogin();
    return;
  }
  // Fallback: REST /me prüfen (z. B. Safari-Cache oder Service Worker)
  fetch(_apiUrl('me'), { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' } })
    .then(function(r) {
      _refreshNonce(r);
      if (!r.ok) throw new Error(r.status);
      return r.json();
    })
    .then(function(data) {
      if (data && data.loggedIn) {
        _applyAuthenticatedUser(data);
        applyLogin();
      }
    })
    .catch(function() {
      // Backend nicht erreichbar — Demo-Session wiederherstellen
      _backendAvailable = false;
      var demoUser = _demoSession();
      if (demoUser) {
        _applyAuthenticatedUser(demoUser);
        applyLogin();
      }
    });
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

  var online = await _checkBackend();

  // ── Offline / Demo fallback ──
  if (!online) {
    var demoResult = _demoLogin(email, password);
    _setBtnLoading(submitBtn, false);
    if (!demoResult.ok) {
      _setFieldError('loginPassword', demoResult.message);
      return;
    }
    _applyAuthenticatedUser(demoResult.user);
    closeModal('loginModal');
    form.reset();
    applyLogin();
    showToast('Willkommen zurück! (Offline-Modus)', 'login');
    return;
  }

  try {
    /* Step 1: Try direct login (validates password, checks 2FA) */
    var loginResp = await fetch(_apiUrl('login'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: _apiHeaders(),
      body: JSON.stringify({ email: email, password: password })
    });
    var loginData = await loginResp.json();

    if (!loginResp.ok) {
      _setBtnLoading(submitBtn, false);
      var msg = loginData.message || 'Verbindungsfehler – bitte versuche es erneut.';
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
      return;
    }

    /* Step 2a: 2FA required → open OTP flow */
    if (loginData.requires2fa) {
      try {
        var otpData = await sendEmailOtp(email, password);
        _setBtnLoading(submitBtn, false);
        form.reset();
        openLoginOtpModal(email, otpData);
        showToast('Wir haben dir einen E-Mail-Code gesendet.', 'mark_email_unread');
      } catch (otpErr) {
        _setBtnLoading(submitBtn, false);
        _setFieldError('loginPassword', otpErr && otpErr.message ? otpErr.message : 'E-Mail-Code konnte nicht gesendet werden.');
      }
      return;
    }

    /* Step 2b: No 2FA → logged in directly */
    _applyAuthenticatedUser(loginData);
    _setBtnLoading(submitBtn, false);
    closeModal('loginModal');
    form.reset();
    applyLogin();
    showToast('Willkommen zurück!', 'login');
    maybePromptPasskeySetup();
  } catch (err) {
    _setBtnLoading(submitBtn, false);
    _setFieldError('loginPassword', 'Verbindungsfehler – bitte versuche es erneut.');
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
  var activeRole = document.querySelector('.role-toggle:not(.role-toggle-sub) > .role-btn.active');
  var role = activeRole ? (activeRole.dataset.role === 'provider' ? 'provider' : 'user') : 'user';
  var subRole = '';
  var company = '';
  var vatId = '';
  if (role === 'user') {
    var activeSub = document.querySelector('.role-toggle-sub .role-btn-sub.active');
    subRole = activeSub ? (activeSub.dataset.subrole || 'privat') : 'privat';
  }
  var needsCompanyFields = (role === 'provider') || (role === 'user' && subRole === 'unternehmen');
  if (needsCompanyFields) {
    company = (document.getElementById('regCompany') || {}).value || '';
    company = company.trim();
    vatId = (document.getElementById('regVatId') || {}).value || '';
    vatId = vatId.trim();
  }
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
  if (needsCompanyFields && gewerbeBox && !gewerbeBox.checked) {
    var gewerbeLabel = document.getElementById('regGewerbeLabel');
    if (gewerbeLabel) { gewerbeLabel.classList.add('has-error'); }
    hasError = true;
  }
  if (needsCompanyFields && !company) { _setFieldError('regCompany', 'Firmenname ist erforderlich'); hasError = true; }
  if (hasError) return;

  _setBtnLoading(submitBtn, true);

  var online = await _checkBackend();

  // ── Offline / Demo fallback ──
  if (!online) {
    var demoResult = _demoRegister(email, password, firstName, lastName, role, subRole, company, vatId);
    _setBtnLoading(submitBtn, false);
    if (!demoResult.ok) {
      _setFieldError('regEmail', demoResult.message);
      return;
    }
    _applyAuthenticatedUser(demoResult.user);
    closeModal('registerModal');
    form.reset();
    var strengthBar = document.getElementById('passwordStrength');
    if (strengthBar) strengthBar.style.display = 'none';
    applyLogin();
    showToast('Willkommen bei Eventbörse, ' + firstName + '! (Offline-Modus)', 'celebration');
    return;
  }

  try {
    var response = await fetch(_apiUrl('register'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: _apiHeaders(),
      body: JSON.stringify({
        email: email,
        password: password,
        role: role,
        sub_role: subRole || '',
        first_name: firstName,
        last_name: lastName,
        company: company || '',
        vat_id: vatId || ''
      })
    });
    var data = await response.json();

    if (response.ok) {
      _setBtnLoading(submitBtn, false);

      if (data.requiresOtp) {
        closeModal('registerModal');
        form.reset();
        var strengthBar = document.getElementById('passwordStrength');
        if (strengthBar) strengthBar.style.display = 'none';
        openRegisterOtpModal(email, data);
        showToast('Wir haben dir einen Bestätigungscode per E-Mail gesendet.', 'mark_email_unread');
        return;
      }

      _applyAuthenticatedUser(data);
      closeModal('registerModal');
      form.reset();
      var strengthBar = document.getElementById('passwordStrength');
      if (strengthBar) strengthBar.style.display = 'none';
      applyLogin();
      showToast('Willkommen bei Eventbörse, ' + firstName + '!', 'celebration');
    } else {
      _setBtnLoading(submitBtn, false);
      var msg = data.message || 'Registrierung fehlgeschlagen.';
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

// ---- REGISTRIERUNG OTP-VERIFIZIERUNG ----
function openRegisterOtpModal(email, data) {
  _pendingRegOtp = {
    email: (email || '').trim(),
    resendToken: data && data.resendToken ? data.resendToken : ''
  };
  var emailText = document.getElementById('regOtpEmailText');
  var codeInput = document.getElementById('regOtpCode');
  if (emailText) emailText.textContent = _pendingRegOtp.email || 'deine E-Mail';
  if (codeInput) codeInput.value = '';
  openModal('registerOtpModal');
}

function cancelRegisterOtpFlow() {
  _pendingRegOtp = null;
  closeModal('registerOtpModal');
}

async function resendRegisterOtp(btn) {
  if (!_pendingRegOtp || !_pendingRegOtp.email || !_pendingRegOtp.resendToken) {
    showToast('Bitte starte die Registrierung erneut.', 'warning');
    cancelRegisterOtpFlow();
    openModal('registerModal');
    return;
  }
  try {
    if (btn) _setBtnLoading(btn, true);
    var response = await fetch(_apiUrl('register/resend'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: _apiHeaders(),
      body: JSON.stringify({
        email: _pendingRegOtp.email,
        resend_token: _pendingRegOtp.resendToken
      })
    });
    var data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Code konnte nicht erneut gesendet werden.');
    _pendingRegOtp.resendToken = data.resendToken || _pendingRegOtp.resendToken;
    showToast('Neuer Bestätigungscode wurde gesendet.', 'mark_email_read');
  } catch (err) {
    showToast(err && err.message ? err.message : 'Code konnte nicht erneut gesendet werden.', 'error');
  } finally {
    if (btn) _setBtnLoading(btn, false);
  }
}

async function handleRegisterOtpVerify(e) {
  e.preventDefault();
  var form = e.target;
  _clearFieldErrors(form);

  if (!_pendingRegOtp || !_pendingRegOtp.email) {
    showToast('Bitte starte die Registrierung erneut.', 'warning');
    cancelRegisterOtpFlow();
    openModal('registerModal');
    return;
  }

  var code = document.getElementById('regOtpCode').value.trim();
  var submitBtn = form.querySelector('button[type="submit"]');

  if (!/^\d{6}$/.test(code)) {
    _setFieldError('regOtpCode', 'Bitte gib den 6-stelligen Code ein.');
    return;
  }

  try {
    _setBtnLoading(submitBtn, true);
    var response = await fetch(_apiUrl('register/verify'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: _apiHeaders(),
      body: JSON.stringify({
        email: _pendingRegOtp.email,
        code: code
      })
    });
    _refreshNonce(response);
    var data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Code ist ungültig.');

    _pendingRegOtp = null;
    _applyAuthenticatedUser(data);
    closeModal('registerOtpModal');
    form.reset();
    applyLogin();
    showToast('Willkommen bei Eventbörse! Dein Konto ist verifiziert.', 'celebration');
  } catch (err) {
    _setFieldError('regOtpCode', err && err.message ? err.message : 'Code ist ungültig.');
  } finally {
    _setBtnLoading(submitBtn, false);
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
  _saveDemoSession(null);
  applyLogout();
  showToast('Abgemeldet. Bis bald!', 'logout');
  navigateTo('home');
}

function selectRole(btn, role) {
  document.querySelectorAll('.role-toggle:not(.role-toggle-sub) > .role-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  var subGroup = document.getElementById('regSubRoleGroup');
  if (subGroup) { subGroup.classList.toggle('reg-collapsed', role !== 'user'); }
  var providerFields = document.getElementById('regProviderFields');
  if (role === 'provider') {
    if (providerFields) { providerFields.classList.remove('reg-collapsed'); }
  } else {
    // Bei Eventplaner: nur zeigen wenn Unternehmen ausgewählt
    var activeSubBtn = document.querySelector('.role-btn-sub.active');
    var isUnternehmen = activeSubBtn && activeSubBtn.getAttribute('data-subrole') === 'unternehmen';
    if (providerFields) { providerFields.classList.toggle('reg-collapsed', !isUnternehmen); }
  }
}

function selectSubRole(btn, subRole) {
  document.querySelectorAll('.role-toggle-sub .role-btn-sub').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  var providerFields = document.getElementById('regProviderFields');
  if (providerFields) { providerFields.classList.toggle('reg-collapsed', subRole !== 'unternehmen'); }
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
var _EB_VERSION = '2026-04-04-1'; // Nur erhöhen bei echten neuen Features für Nutzer

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
var _detailSwipeCleanup = null;
function _initDetailGallerySwipe() {
  // Clean up previous listeners to avoid leaks
  if (_detailSwipeCleanup) { _detailSwipeCleanup(); _detailSwipeCleanup = null; }
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
  function _docMouseMove(e) {
    if (!dragging) return;
    var dx = e.clientX - startX;
    if (Math.abs(dx) > 5) moved = true;
    track.scrollLeft -= (e.clientX - startX);
    startX = e.clientX;
  }
  function _docMouseUp() {
    if (!dragging) return;
    dragging = false;
    track.style.scrollBehavior = 'smooth';
    track.style.cursor = '';
    // Snap to nearest
    var slideW = track.offsetWidth;
    var target = Math.round(track.scrollLeft / slideW) * slideW;
    track.scrollLeft = target;
  }
  document.addEventListener('mousemove', _docMouseMove);
  document.addEventListener('mouseup', _docMouseUp);
  _detailSwipeCleanup = function() {
    document.removeEventListener('mousemove', _docMouseMove);
    document.removeEventListener('mouseup', _docMouseUp);
  };
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
// ========== NAVBAR SCROLL EFFECT ==========
(function() {
  var _navShadowOn = false;
  var _scrollTicking = false;
  window.addEventListener('scroll', function() {
    if (_scrollTicking) return;
    _scrollTicking = true;
    requestAnimationFrame(function() {
      var shouldShadow = window.scrollY > 10;
      if (shouldShadow !== _navShadowOn) {
        _navShadowOn = shouldShadow;
        document.getElementById('navbar').style.boxShadow = shouldShadow ? '0 2px 12px rgba(0,0,0,0.08)' : 'none';
      }
      _scrollTicking = false;
    });
  }, { passive: true });
})();

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
  try {
    renderHeroMarquees();
  } catch (err) {
    console.error('Fehler beim Rendern der Hero-Marquee', err);
  }
  window.addEventListener('load', function() {
    try {
      renderHeroMarquees();
    } catch (err) {
      console.error('Fehler beim Rendern der Hero-Marquee (load)', err);
    }
  });
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

// =========================================================
// ===================== EVENT-PLANER BOARD ================
// =========================================================

var _boardProjects = [];
var _activeBoardId = null;

function _boardStorageKey() {
  return currentUser ? 'eb_board_projects_' + currentUser.id : null;
}

function _migrateBoardProjects() {
  if (!currentUser) return;
  var newKey = 'eb_board_projects_' + currentUser.id;
  // If user has no data under new key but old global key exists, migrate it
  if (!localStorage.getItem(newKey)) {
    var old = localStorage.getItem('eb_board_projects');
    if (old && old !== '[]') {
      localStorage.setItem(newKey, old);
    }
  }
  // Clean up old global key
  localStorage.removeItem('eb_board_projects');
}

function _loadBoardProjects() {
  var key = _boardStorageKey();
  // 1) Schneller Cache: lokal geladene Projekte sofort anzeigen
  _boardProjects = key ? JSON.parse(localStorage.getItem(key) || '[]') : [];
  // 2) Vom Server nachladen (account-gebunden, geräteübergreifend)
  if (currentUser) {
    _syncBoardFromServer({ initial: true });
    _ensureBoardSyncListeners();
  }
}

// Merge-Strategie: pro Projekt-ID gewinnt die Version mit dem neuesten updatedAt.
// Auf dem Server vorhandene Projekte, die lokal fehlen, werden übernommen.
// Lokale Projekte, die auf dem Server fehlen, werden hochgeladen (Migration / Offline-Sync).
function _mergeBoardProjects(serverArr, localArr) {
  var byId = {};
  function ts(p) {
    if (!p) return 0;
    var v = p.updatedAt || p.createdAt || 0;
    var t = typeof v === 'number' ? v : Date.parse(v);
    return isNaN(t) ? 0 : t;
  }
  (serverArr || []).forEach(function(p) {
    if (p && p.id) byId[p.id] = { project: p, source: 'server' };
  });
  var uploadNeeded = false;
  (localArr || []).forEach(function(p) {
    if (!p || !p.id) return;
    var existing = byId[p.id];
    if (!existing) {
      byId[p.id] = { project: p, source: 'local-only' };
      uploadNeeded = true;
    } else if (ts(p) > ts(existing.project)) {
      // Lokale Version ist neuer → verwenden und später pushen
      byId[p.id] = { project: p, source: 'local-newer' };
      uploadNeeded = true;
    }
  });
  var merged = Object.keys(byId).map(function(k){ return byId[k].project; });
  // Sortieren: neueste zuerst
  merged.sort(function(a, b){ return ts(b) - ts(a); });
  return { merged: merged, uploadNeeded: uploadNeeded };
}

var _boardSyncInFlight = false;
var _boardCloudAvailable = null; // null = noch nicht geprüft, true/false = Ergebnis
function _syncBoardFromServer(opts) {
  opts = opts || {};
  if (!currentUser) return Promise.resolve();
  if (_boardSyncInFlight) return Promise.resolve();
  _boardSyncInFlight = true;
  var key = _boardStorageKey();
  return fetch(_apiUrl('board-projects'), { credentials: 'same-origin', headers: _apiHeaders(), cache: 'no-store' })
    .then(function(r) {
      _refreshNonce(r);
      if (!r.ok) {
        _boardCloudAvailable = false;
        _boardLastSyncError = 'HTTP ' + r.status + (r.status === 404 ? ' – API-Route fehlt (Server-Update nötig)' : '');
        console.warn('[Board] Laden vom Server fehlgeschlagen: HTTP ' + r.status);
        if (opts.initial && r.status === 404) {
          showToast('Cloud-Sync nicht verfügbar (API 404). Bitte Theme-Update auf Server prüfen.', 'error');
        } else if (opts.initial && (r.status === 401 || r.status === 403)) {
          showToast('Cloud-Sync: Session abgelaufen. Bitte neu anmelden.', 'error');
        } else if (opts.showError) {
          showToast('Cloud-Sync fehlgeschlagen (HTTP ' + r.status + ')', 'error');
        }
        _updateBoardSyncIndicator();
        return null;
      }
      _boardCloudAvailable = true;
      _boardLastSyncError = null;
      return r.json();
    })
    .then(function(data) {
      if (!data || !Array.isArray(data.projects)) return;
      var serverProjects = data.projects;
      var localProjects = key ? JSON.parse(localStorage.getItem(key) || '[]') : [];
      var res = _mergeBoardProjects(serverProjects, localProjects);
      _boardProjects = res.merged;
      if (key) {
        try { localStorage.setItem(key, JSON.stringify(_boardProjects)); } catch(e) {}
      }
      if (res.uploadNeeded) {
        console.info('[Board] Lokale Änderungen werden zum Server synchronisiert.');
        _saveBoardProjects({ immediate: true });
      }
      _boardLastSyncAt = Date.now();
      _updateBoardSyncIndicator();
      if (opts.initial) {
        console.info('[Board] Cloud-Sync OK – ' + serverProjects.length + ' Projekt(e) vom Server geladen.');
      }
      // Ansicht neu rendern, falls Board-Seite aktiv ist
      var boardPage = document.getElementById('page-board');
      if (boardPage && boardPage.classList.contains('active')) {
        if (_activeBoardId) {
          var p = _boardProjects.find(function(x){ return x.id === _activeBoardId; });
          if (p) {
            _updateBoardStats(p);
            var currentView = document.querySelector('.board-view-btn.active');
            if (currentView && currentView.dataset.view) switchBoardView(currentView.dataset.view);
          } else {
            showBoardProjects();
          }
        } else {
          renderBoardPage();
        }
      }
    })
    .catch(function(err){
      _boardCloudAvailable = false;
      _boardLastSyncError = 'Server nicht erreichbar';
      console.warn('[Board] Server nicht erreichbar, verwende lokalen Cache.', err);
      if (opts.initial) showToast('Cloud-Sync: Server nicht erreichbar – arbeite offline.', 'error');
      else if (opts.showError) showToast('Cloud-Sync: Server nicht erreichbar.', 'error');
      _updateBoardSyncIndicator();
    })
    .then(function(){ _boardSyncInFlight = false; _updateBoardSyncIndicator(); });
}

// Automatischer Resync: beim Tab-Wechsel zurück zum Tab + periodisch alle 30 s
var _boardSyncListenersAttached = false;
var _boardSyncPollTimer = null;
var _boardLastSyncAt = 0; // Zeitstempel des letzten erfolgreichen Sync
var _boardLastSyncError = null; // Kurztext, falls letzter Sync fehlschlug

function _formatAgo(ts) {
  if (!ts) return 'noch nie';
  var diff = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (diff < 5)   return 'gerade eben';
  if (diff < 60)  return 'vor ' + diff + ' Sek.';
  if (diff < 3600) return 'vor ' + Math.round(diff / 60) + ' Min.';
  if (diff < 86400) return 'vor ' + Math.round(diff / 3600) + ' Std.';
  return 'vor ' + Math.round(diff / 86400) + ' Tagen';
}

function _updateBoardSyncIndicator() {
  var btn   = document.getElementById('btnBoardSync');
  var icon  = document.getElementById('btnBoardSyncIcon');
  var label = document.getElementById('btnBoardSyncLabel');
  if (!btn || !icon || !label) return;
  btn.style.display = currentUser ? '' : 'none';
  if (!currentUser) return;
  var status, tooltip, iconName, color;
  if (_boardSaveInflight || _boardSyncInFlight) {
    status = 'Synchronisiert…'; iconName = 'sync'; color = ''; tooltip = 'Synchronisiert gerade…';
  } else if (_boardCloudAvailable === false) {
    status = 'Offline'; iconName = 'cloud_off'; color = '#e0603a';
    tooltip = _boardLastSyncError || 'Cloud nicht erreichbar – Änderungen bleiben lokal, bis die Verbindung wieder da ist.';
  } else if (_boardDirty) {
    status = 'Ungespeichert'; iconName = 'cloud_upload'; color = '#e0a43a';
    tooltip = 'Lokale Änderungen warten auf Upload.';
  } else if (_boardLastSyncAt) {
    status = _formatAgo(_boardLastSyncAt); iconName = 'cloud_done'; color = 'var(--accent)';
    tooltip = 'Zuletzt synchronisiert ' + _formatAgo(_boardLastSyncAt) + '. Klick für manuellen Sync.';
  } else {
    status = 'Sync'; iconName = 'cloud_sync'; color = '';
    tooltip = 'Jetzt mit Cloud synchronisieren.';
  }
  icon.textContent = iconName;
  label.textContent = status;
  btn.title = tooltip;
  btn.style.borderColor = color || '';
  btn.style.color = color || '';
}

// Periodisch die „vor X Sek." Anzeige auffrischen
setInterval(_updateBoardSyncIndicator, 15000);

function _ensureBoardSyncListeners() {
  if (_boardSyncListenersAttached) return;
  _boardSyncListenersAttached = true;
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible' && currentUser) {
      _syncBoardFromServer();
    }
  });
  window.addEventListener('focus', function() {
    if (currentUser) _syncBoardFromServer();
  });
  window.addEventListener('online', function() {
    if (currentUser) {
      _syncBoardFromServer();
      if (_boardDirty) _pushBoardToServer();
    }
  });
  if (_boardSyncPollTimer) clearInterval(_boardSyncPollTimer);
  _boardSyncPollTimer = setInterval(function() {
    if (currentUser && document.visibilityState === 'visible' && !_boardSaveInflight && !_boardDirty) {
      _syncBoardFromServer();
    }
  }, 30000);
}

// Button-Handler: Manueller Cloud-Sync (optimistisch: erst push, dann pull)
function forceBoardSync() {
  if (!currentUser) { showToast('Bitte anmelden, um mit der Cloud zu synchronisieren.', 'error'); return; }
  var btn = document.getElementById('btnBoardSync');
  if (btn) { btn.disabled = true; btn.classList.add('is-loading'); }
  _updateBoardSyncIndicator();
  var pushPromise = _boardDirty ? _pushBoardToServer() : Promise.resolve();
  pushPromise
    .then(function(){ return _syncBoardFromServer({ showError: true, manual: true }); })
    .then(function(){
      if (_boardCloudAvailable !== false) showToast('Mit Cloud synchronisiert.', 'cloud_done');
    })
    .catch(function(){ /* Fehler wird bereits per Toast gemeldet */ })
    .then(function(){
      if (btn) { btn.disabled = false; btn.classList.remove('is-loading'); }
      _updateBoardSyncIndicator();
    });
}
window.forceBoardSync = forceBoardSync;

var _boardSaveTimer = null;
var _boardSaveInflight = false;
var _boardDirty = false; // ungespeicherte Änderungen vorhanden?

function _pushBoardToServer() {
  if (!currentUser) return Promise.resolve();
  _boardSaveInflight = true;
  _boardDirty = true;
  var payload = JSON.stringify({ projects: _boardProjects });
  return fetch(_apiUrl('board-projects'), {
    method: 'POST',
    credentials: 'same-origin',
    headers: _apiHeaders(),
    body: payload,
    keepalive: true
  })
    .then(function(r) {
      _refreshNonce(r);
      if (!r.ok) {
        console.warn('[Board] Server-Speicherung fehlgeschlagen: HTTP ' + r.status);
        if (r.status === 404) {
          showToast('Cloud-Speicherung fehlgeschlagen: API nicht verfügbar (404). Server-Update nötig.', 'error');
          _boardCloudAvailable = false;
        } else if (r.status === 401 || r.status === 403) {
          showToast('Cloud-Sync: Session abgelaufen, bitte neu anmelden.', 'error');
        } else if (r.status === 413) {
          showToast('Projekt zu groß für Cloud-Speicherung (>2 MB).', 'error');
        } else {
          showToast('Cloud-Speicherung fehlgeschlagen (HTTP ' + r.status + ')', 'error');
        }
        return null;
      }
      _boardDirty = false;
      _boardCloudAvailable = true;
      _boardLastSyncAt = Date.now();
      _boardLastSyncError = null;
      _updateBoardSyncIndicator();
      return r.json();
    })
    .catch(function(err){
      _boardCloudAvailable = false;
      _boardLastSyncError = 'Server nicht erreichbar';
      _updateBoardSyncIndicator();
      console.warn('[Board] Server-Speicherung Netzwerkfehler – wird erneut versucht.', err);
    })
    .then(function(res){
      _boardSaveInflight = false;
      // Falls während des Uploads weiter geändert wurde, direkt erneut pushen
      if (_boardDirty) {
        if (_boardSaveTimer) clearTimeout(_boardSaveTimer);
        _boardSaveTimer = setTimeout(function(){ _boardSaveTimer = null; _pushBoardToServer(); }, 400);
      }
      return res;
    });
}

function _saveBoardProjects(opts) {
  opts = opts || {};
  // Jede Speicherung bekommt einen Timestamp, damit Merge-by-Newest funktioniert
  var now = Date.now();
  if (Array.isArray(_boardProjects)) {
    // Wir markieren das aktive Projekt (oder alle, wenn keins aktiv ist) als aktualisiert
    if (_activeBoardId) {
      _boardProjects.forEach(function(p){ if (p && p.id === _activeBoardId) p.updatedAt = now; });
    } else {
      _boardProjects.forEach(function(p){ if (p && !p.updatedAt) p.updatedAt = now; });
    }
  }
  var key = _boardStorageKey();
  if (key) {
    try { localStorage.setItem(key, JSON.stringify(_boardProjects)); } catch(e) {}
  }
  if (!currentUser) return;
  _boardDirty = true;
  _updateBoardSyncIndicator();

  if (opts.immediate) {
    if (_boardSaveTimer) { clearTimeout(_boardSaveTimer); _boardSaveTimer = null; }
    if (!_boardSaveInflight) _pushBoardToServer();
    return;
  }

  // Debounced Push an den Server
  if (_boardSaveTimer) clearTimeout(_boardSaveTimer);
  _boardSaveTimer = setTimeout(function() {
    _boardSaveTimer = null;
    if (_boardSaveInflight) {
      _boardSaveTimer = setTimeout(_saveBoardProjects, 400);
      return;
    }
    _pushBoardToServer();
  }, 600);
}

// Beim Verlassen der Seite ungespeicherte Änderungen garantiert mitsenden
window.addEventListener('pagehide', function() {
  if (!_boardDirty || !currentUser) return;
  try {
    var url = _apiUrl('board-projects');
    var payload = JSON.stringify({ projects: _boardProjects });
    if (_wpNonce) url += (url.indexOf('?') === -1 ? '?' : '&') + '_wpnonce=' + encodeURIComponent(_wpNonce);
    if (navigator.sendBeacon) {
      var blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
    } else {
      fetch(url, { method: 'POST', credentials: 'same-origin', headers: _apiHeaders(), body: payload, keepalive: true });
    }
  } catch(e) {}
});

function renderBoardPage() {
  _activeBoardId = null;
  var projectsEl = document.getElementById('boardProjects');
  var boardViewEl = document.getElementById('boardView');
  var btnAllBoards = document.getElementById('btnAllBoards');
  var headerNewBtn = document.querySelector('.board-page-header-actions .board-new-btn');
  if (!projectsEl) return;
  boardViewEl && (boardViewEl.style.display = 'none');
  projectsEl.style.display = '';
  btnAllBoards && (btnAllBoards.style.display = 'none');

  // Hide/show header "new project" button based on login
  if (headerNewBtn) headerNewBtn.style.display = currentUser ? '' : 'none';
  var btnSync = document.getElementById('btnBoardSync');
  if (btnSync) btnSync.style.display = currentUser ? '' : 'none';
  _updateBoardSyncIndicator();

  if (!currentUser) { _boardProjects = []; }
  if (_boardProjects.length === 0) {
    projectsEl.innerHTML = `
      <div class="board-empty-state">
        <span class="material-icons-round">view_kanban</span>
        <h3>Noch kein Event-Projekt</h3>
        <p>${!currentUser ? 'Melde dich an, um dein Planungs-Board zu nutzen und Dienstleister für dein Event zu organisieren.' : 'Erstelle dein erstes Planungs-Board und organisiere alle Dienstleister für dein Event.'}</p>
        ${currentUser ? `<button class="btn-primary board-new-btn" onclick="openCreateBoardModal()">
          <span class="material-icons-round">add</span> Erstes Projekt erstellen
        </button>` : `<button class="btn-primary board-new-btn" onclick="openModal('loginModal')">
          <span class="material-icons-round">login</span> Jetzt anmelden
        </button>`}
      </div>`;
    return;
  }

  projectsEl.innerHTML = _boardProjects.map(function(p) {
    var total = (p.cards || []).length;
    var confirmed = (p.cards || []).filter(function(c) { return c.stage === 'bestaetigt' || c.stage === 'abgeschlossen'; }).length;
    var budgetSum = (p.cards || []).reduce(function(s, c) { return s + (parseFloat(c.price) || 0); }, 0);
    return `
      <div class="board-project-card animated-entry" onclick="openBoardProject('${p.id}')">
        <h3>${_escHtml(p.name)}</h3>
        <div class="bpc-date"><span class="material-icons-round">event</span>${_escHtml(p.date || 'Datum noch offen')}</div>
        <div class="board-project-progress">
          ${['geplant','kontaktiert','angebot','bestaetigt','abgeschlossen'].map(function(stage) {
            var cnt = (p.cards || []).filter(function(c) { return c.stage === stage; }).length;
            return '<div class="bpp-stage' + (cnt > 0 ? ' filled stage-' + stage : '') + '" title="' + stage + ': ' + cnt + '"></div>';
          }).join('')}
        </div>
        <div class="board-project-footer">
          <span class="bpf-count"><span class="material-icons-round">group</span>${total} Dienstleister</span>
          ${p.budget ? `<span class="bpf-count"><span class="material-icons-round">savings</span>${parseFloat(p.budget).toLocaleString('de-DE')} € Budget</span>` : `<span class="bpf-count"><span class="material-icons-round">euro</span>${budgetSum.toFixed(0)} €</span>`}
          <span class="bpf-count" style="color:var(--accent)"><span class="material-icons-round">check_circle</span>${confirmed} Best.</span>
        </div>
      </div>`;
  }).join('');
  _initAnimatedEntries();
}

function showBoardProjects() {
  _activeBoardId = null;
  var boardViewEl = document.getElementById('boardView');
  var projectsEl = document.getElementById('boardProjects');
  var btnAllBoards = document.getElementById('btnAllBoards');
  boardViewEl && (boardViewEl.style.display = 'none');
  projectsEl && (projectsEl.style.display = '');
  btnAllBoards && (btnAllBoards.style.display = 'none');
  renderBoardPage();
}

function openBoardProject(projectId) {
  var project = _boardProjects.find(function(p) { return p.id === projectId; });
  if (!project) return;
  _activeBoardId = projectId;

  // Ensure board page is the active page
  var boardPage = document.getElementById('page-board');
  if (boardPage && !boardPage.classList.contains('active')) {
    document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
    boardPage.classList.add('active');
    currentPage = 'board';
  }

  var projectsEl = document.getElementById('boardProjects');
  var boardViewEl = document.getElementById('boardView');
  var btnAllBoards = document.getElementById('btnAllBoards');
  projectsEl && (projectsEl.style.display = 'none');
  boardViewEl && (boardViewEl.style.display = '');
  btnAllBoards && (btnAllBoards.style.display = '');

  var nameEl = document.getElementById('boardEventName');
  var dateEl = document.getElementById('boardEventDate');
  if (nameEl) nameEl.textContent = project.name;
  if (dateEl) dateEl.textContent = project.date || 'Datum noch offen';

  switchBoardView('flow');
  _updateBoardStats(project);
}

function renderKanban(project) {
  var stages = ['geplant','kontaktiert','angebot','bestaetigt','abgeschlossen'];
  stages.forEach(function(stage) {
    var colEl = document.getElementById('cards' + stage.charAt(0).toUpperCase() + stage.slice(1));
    if (!colEl) return;
    var cards = (project.cards || []).filter(function(c) { return c.stage === stage; });
    colEl.innerHTML = cards.map(function(card) { return renderKanbanCard(card); }).join('');
    _initCardDrag(colEl);
    var cntEl = document.getElementById('cnt' + stage.charAt(0).toUpperCase() + stage.slice(1));
    if (cntEl) cntEl.textContent = cards.length;
  });
}

function renderKanbanCard(card) {
  var avatar = card.avatar || ('https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(card.name));
  return `<div class="kanban-card" draggable="true" data-card-id="${card.id}" ondragstart="dragCard(event,'${card.id}')" onclick="event.stopPropagation()">
    <div class="kc-header">
      <img class="kc-avatar" src="${_escHtml(avatar)}" alt="${_escHtml(card.name)}" onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=fallback'" />
      <div>
        <div class="kc-name">${_escHtml(card.name)}</div>
        <div class="kc-category">${_escHtml(card.category || '')}</div>
      </div>
    </div>
    ${card.price ? '<div class="kc-price">€ ' + _escHtml(String(card.price)) + '</div>' : ''}
    ${card.note ? '<div class="kc-note">' + _escHtml(card.note) + '</div>' : ''}
    <div class="kc-actions">
      ${card.listingId ? '<button onclick="navigateTo(\'detail\',' + card.listingId + ')"><span class="material-icons-round">open_in_new</span></button>' : ''}
      <button onclick="editBoardCard('${card.id}')"><span class="material-icons-round">edit</span></button>
      <button class="kc-del" onclick="deleteBoardCard('${card.id}')"><span class="material-icons-round">delete</span></button>
    </div>
  </div>`;
}

function _updateBoardStats(project) {
  var confirmed = (project.cards || []).filter(function(c) { return c.stage === 'bestaetigt'; }).length;
  var budget = parseFloat(project.budget) || 0;
  var pending = (project.cards || []).filter(function(c) { return c.stage === 'kontaktiert' || c.stage === 'angebot'; }).length;
  var statC = document.getElementById('statConfirmed');
  var statB = document.getElementById('statBudget');
  var statP = document.getElementById('statPending');
  if (statC) statC.textContent = confirmed;
  if (statB) statB.textContent = budget.toLocaleString('de-DE') + ' €';
  if (statP) statP.textContent = pending;
}

// Drag & Drop
var _dragCardId = null;
function dragCard(event, cardId) {
  _dragCardId = cardId;
  event.currentTarget.classList.add('dragging');
}
function allowDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.add('drag-over');
}
function dropCard(event, toStage) {
  event.preventDefault();
  event.currentTarget.classList.remove('drag-over');
  if (!_dragCardId || !_activeBoardId) return;
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;
  var card = (project.cards || []).find(function(c) { return c.id === _dragCardId; });
  if (card) {
    card.stage = toStage;
    _saveBoardProjects();
    renderKanban(project);
    _updateBoardStats(project);
  }
  _dragCardId = null;
  document.querySelectorAll('.kanban-card.dragging').forEach(function(el) { el.classList.remove('dragging'); });
}
function _initCardDrag(colEl) {
  colEl.addEventListener('dragleave', function() { colEl.classList.remove('drag-over'); });
}

// View Toggle
function switchBoardView(view) {
  var kanban   = document.getElementById('boardKanban');
  var timeline = document.getElementById('boardTimelineView');
  var flow     = document.getElementById('boardFlowView');
  var btnK = document.getElementById('btnKanbanView');
  var btnT = document.getElementById('btnTimelineView');
  var btnF = document.getElementById('btnFlowView');

  // reset all
  kanban   && (kanban.style.display   = 'none');
  timeline && (timeline.style.display = 'none');
  flow     && (flow.style.display     = 'none');
  btnK && btnK.classList.remove('active');
  btnT && btnT.classList.remove('active');
  btnF && btnF.classList.remove('active');

  if (view === 'kanban') {
    kanban && (kanban.style.display = '');
    btnK && btnK.classList.add('active');
  } else if (view === 'timeline') {
    timeline && (timeline.style.display = '');
    btnT && btnT.classList.add('active');
    renderBoardTimeline();
  } else if (view === 'flow') {
    flow && (flow.style.display = '');
    btnF && btnF.classList.add('active');
    renderBoardFlow();
  }
}

function renderBoardTimeline() {
  if (!_activeBoardId) return;
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;
  var chain = document.getElementById('timelineChain');
  if (!chain) return;
  var confirmed = (project.cards || []).filter(function(c) { return c.stage === 'bestaetigt' || c.stage === 'abgeschlossen'; });
  if (confirmed.length === 0) {
    chain.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-light)"><span class="material-icons-round" style="font-size:40px;opacity:0.3;display:block;margin-bottom:12px">timeline</span>Noch keine bestätigten Dienstleister im Ablauf</div>';
    return;
  }
  chain.innerHTML = confirmed.map(function(card, i) {
    var avatar = card.avatar || ('https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(card.name));
    var timeStr = card.startTime || ('0' + (8 + i * 2) + ':00').slice(-5);
    var connector = i < confirmed.length - 1 ? '<div class="tl-connector"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 10h10M12 7l3 3-3 3"/></svg></div>' : '';
    return '<div class="tl-card animated-entry">' +
      '<div class="tl-time">' + _escHtml(timeStr) + '</div>' +
      '<img src="' + _escHtml(avatar) + '" alt="' + _escHtml(card.name) + '" onerror="this.src=\'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback\'" />' +
      '<h4>' + _escHtml(card.name) + '</h4>' +
      '<small>' + _escHtml(card.category || '') + '</small>' +
      '</div>' + connector;
  }).join('');
  _initAnimatedEntries();
}

/* ─── n8n-style Process Flow ─────────────────────────────── */
function renderBoardFlow() {
  if (!_activeBoardId) return;
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;
  var container = document.getElementById('boardFlowView');
  if (!container) return;

  var stagesMeta = [
    { id: 'geplant',       label: 'Geplant',        color: '#9E9E9E', icon: 'schedule'     },
    { id: 'kontaktiert',   label: 'Kontaktiert',     color: '#FF9800', icon: 'mail'         },
    { id: 'angebot',       label: 'Angebot',         color: '#2196F3', icon: 'description'  },
    { id: 'bestaetigt',    label: 'Bestätigt',       color: '#00A699', icon: 'check_circle' },
    { id: 'abgeschlossen', label: 'Abgeschlossen',   color: '#FF385C', icon: 'celebration'  }
  ];

  var cards = project.cards || [];
  var esc = _escHtml;
  var budget = parseFloat(project.budget) || 0;
  var spent  = cards.reduce(function(s, c) { return s + (parseFloat(c.price) || 0); }, 0);
  var pct    = budget > 0 ? Math.min(100, Math.round(spent / budget * 100)) : 0;
  var budgetColor = pct >= 100 ? '#FF385C' : pct >= 80 ? '#FF9800' : '#00A699';

  // Overall progress: % of cards confirmed or completed
  var confirmedCount = cards.filter(function(c){ return c.stage==='bestaetigt' || c.stage==='abgeschlossen'; }).length;
  var progressPct = cards.length > 0 ? Math.round(confirmedCount / cards.length * 100) : 0;

  // Default layout: responsive sizes based on viewport
  var storedLayout = project.flowLayout || {};
  var _vw = window.innerWidth || 1200;
  var _isMobile = _vw <= 600;
  var _isTablet = _vw <= 900;
  var _GAP = _isMobile ? 24 : _isTablet ? 36 : 64;
  var _TW  = _isMobile ? 110 : _isTablet ? 136 : 168;
  var _NW  = _isMobile ? 160 : _isTablet ? 190 : 236;
  var _PAD = _isMobile ? 16 : _isTablet ? 30 : 60;
  var _defLayout;
  if (_isMobile) {
    // Handy-Layout: Stages UNTEREINANDER (vertikal gestackt),
    // Dienstleister rechts vom Stage-Header (horizontal)
    var _ROWH = 340; // Höhe pro Stage-Zeile (deckt Provider-Karte mit Banner+Buttons ab)
    _defLayout = {
      'start':         { x: _PAD, y: _PAD + 0*_ROWH },
      'geplant':       { x: _PAD, y: _PAD + 1*_ROWH },
      'kontaktiert':   { x: _PAD, y: _PAD + 2*_ROWH },
      'angebot':       { x: _PAD, y: _PAD + 3*_ROWH },
      'bestaetigt':    { x: _PAD, y: _PAD + 4*_ROWH },
      'abgeschlossen': { x: _PAD, y: _PAD + 5*_ROWH },
      'end':           { x: _PAD, y: _PAD + 6*_ROWH }
    };
  } else {
    _defLayout = {
      'start':         { x: _PAD,                                   y: _PAD },
      'geplant':       { x: _PAD + _TW + _GAP,                     y: _PAD },
      'kontaktiert':   { x: _PAD + _TW + _GAP + 1*(_NW+_GAP),     y: _PAD },
      'angebot':       { x: _PAD + _TW + _GAP + 2*(_NW+_GAP),     y: _PAD },
      'bestaetigt':    { x: _PAD + _TW + _GAP + 3*(_NW+_GAP),     y: _PAD },
      'abgeschlossen': { x: _PAD + _TW + _GAP + 4*(_NW+_GAP),     y: _PAD },
      'end':           { x: _PAD + _TW + _GAP + 5*(_NW+_GAP),     y: _PAD }
    };
  }
  function colStyle(id) {
    var p = storedLayout[id] || _defLayout[id] || { x: 60, y: 60 };
    return 'left:' + p.x + 'px;top:' + p.y + 'px';
  }

  var isPublic = !!project.isPublic;
  var html = '';

  // ── Toolbar ──────────────────────────────────────────────
  html += '<div class="flow-toolbar">';
  html += '<button class="flow-tbtn" onclick="flowZoom(-0.15)" title="Verkleinern (Ctrl + -)"><span class="material-icons-round">remove</span></button>';
  html += '<span class="flow-zoom-pct" id="flowZoomPct">100%</span>';
  html += '<button class="flow-tbtn" onclick="flowZoom(0.15)" title="Vergrößern (Ctrl + +)"><span class="material-icons-round">add</span></button>';
  html += '<div class="flow-tb-divider"></div>';
  html += '<button class="flow-tbtn" onclick="flowFitToScreen()" title="An Bildschirm anpassen"><span class="material-icons-round">fit_screen</span></button>';
  html += '<button class="flow-tbtn" onclick="flowResetView()" title="Ansicht zurücksetzen"><span class="material-icons-round">center_focus_strong</span></button>';
  html += '<button class="flow-tbtn" id="flowFullscreenBtn" onclick="toggleFlowFullscreen()" title="Vollbild"><span class="material-icons-round" id="flowFullscreenIcon">fullscreen</span></button>';
  html += '<div class="flow-tb-divider"></div>';
  // Progress ring
  var circ = 2 * Math.PI * 15;
  var off  = circ * (1 - progressPct / 100);
  html += '<div class="flow-progress-ring" title="' + confirmedCount + '/' + cards.length + ' bestätigt (' + progressPct + '%)">';
  html += '<svg viewBox="0 0 40 40"><circle class="fpr-bg" cx="20" cy="20" r="15" fill="none" stroke-width="4"/>';
  html += '<circle class="fpr-fill" cx="20" cy="20" r="15" fill="none" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + circ.toFixed(2) + '" stroke-dashoffset="' + off.toFixed(2) + '"/></svg>';
  html += '<span class="fpr-label">' + progressPct + '%</span>';
  html += '</div>';
  html += '<div class="flow-tb-divider"></div>';
  html += '<button class="flow-visibility-pill' + (isPublic ? ' is-public' : '') + '" onclick="toggleFlowVisibility()" title="Sichtbarkeit umschalten">';
  html += '<span class="material-icons-round">' + (isPublic ? 'public' : 'lock') + '</span>' + (isPublic ? 'Öffentlich' : 'Privat');
  html += '</button>';
  if (isPublic) {
    html += '<button class="flow-tbtn" onclick="openFlowShareModal()" title="Teilen"><span class="material-icons-round">ios_share</span></button>';
  }
  html += '<button class="flow-tbtn" onclick="openAddProviderModalFlow(\'geplant\')" title="Dienstleister hinzufügen" style="background:rgba(255,56,92,0.18);border-color:rgba(255,56,92,0.4);color:#fff"><span class="material-icons-round">add</span></button>';
  html += '</div>';

  // ── Budget Overview Bar ──────────────────────────────────
  html += '<div class="flow-budget-bar">';
  html += '<div class="flow-budget-left">';
  html += '<span class="material-icons-round" style="color:' + budgetColor + '">account_balance_wallet</span>';
  html += '<div>';
  html += '<div class="flow-budget-title">Budget</div>';
  html += '<div class="flow-budget-num"><span style="color:' + budgetColor + '">' + spent.toLocaleString('de-DE') + ' €</span>';
  if (budget > 0) html += ' <span class="flow-budget-of">von ' + budget.toLocaleString('de-DE') + ' €</span>';
  html += '</div></div></div>';
  if (budget > 0) {
    html += '<div class="flow-budget-track"><div class="flow-budget-fill" style="width:' + pct + '%;background:' + budgetColor + '"></div></div>';
    html += '<div class="flow-budget-pct" style="color:' + budgetColor + '">' + pct + '%</div>';
  }
  html += '<button class="flow-budget-edit-btn" onclick="openFlowBudgetModal()" title="Budget bearbeiten">';
  html += '<span class="material-icons-round">edit</span></button>';
  html += '</div>';

  // ── Canvas (scroll container) + World (zoom target) ─────
  html += '<div class="flow-canvas" id="flowCanvas">';
  html += '<div class="flow-world" id="flowWorld">';
  html += '<svg class="flow-svg" id="flowSvg" xmlns="http://www.w3.org/2000/svg"></svg>';

  // Trigger node
  html += '<div class="flow-col flow-drag-handle" data-col-id="start" style="' + colStyle('start') + '">';
  html += '<div class="flow-node flow-node-trigger" data-nid="start" onclick="if(!_flowDragJustEnded)openFlowProjectModal();_flowDragJustEnded=false">';
  html += '<span class="material-icons-round" style="color:#FF385C;font-size:32px">celebration</span>';
  html += '<strong>' + esc(project.name || 'Event') + '</strong>';
  if (project.date) html += '<small>' + esc(project.date) + '</small>';
  html += '<span class="flow-node-edit-hint"><span class="material-icons-round" style="font-size:10px;vertical-align:middle">drag_indicator</span> Ziehen &nbsp;<span class="material-icons-round" style="font-size:10px;vertical-align:middle">edit</span> Klicken</span>';
  html += '</div>';
  html += '</div>';

  // Stage columns
  stagesMeta.forEach(function(stage) {
    var stageCards = cards.filter(function(c) { return c.stage === stage.id; });
    var stageBudget = stageCards.reduce(function(s, c) { return s + (parseFloat(c.price) || 0); }, 0);
    html += '<div class="flow-col" data-col-id="' + stage.id + '" style="' + colStyle(stage.id) + '">';

    // Stage header node
    html += '<div class="flow-node flow-node-stage" data-nid="stage-' + stage.id + '">';
    html += '<div class="flow-node-hdr flow-drag-handle" style="background:' + stage.color + ';border-radius:12px 12px 0 0">';
    html += '<span class="material-icons-round">' + stage.icon + '</span>';
    html += '<span>' + stage.label + '</span>';
    if (stageCards.length) html += '<span class="flow-node-badge">' + stageCards.length + '</span>';
    html += '<span class="material-icons-round flow-drag-icon">drag_indicator</span>';
    html += '</div>';
    html += '<div class="flow-node-body">';
    if (stageCards.length) {
      html += '<div class="flow-node-cnt">' + stageCards.length + ' Dienstleister</div>';
      if (stageBudget > 0) html += '<div class="flow-node-budget-hint">Gesamt: ' + stageBudget.toLocaleString('de-DE') + ' €</div>';
    } else {
      html += '<span class="flow-node-empty">Noch leer</span>';
    }
    html += '<button class="flow-node-add-btn" onclick="openAddProviderModalFlow(\'' + stage.id + '\')">';
    html += '<span class="material-icons-round">add</span> Hinzufügen</button>';
    html += '</div>';
    html += '</div>';

    // Provider nodes
    stageCards.forEach(function(card) {
      var avatar = card.avatar || ('https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(card.name));
      var isConfirmed = !!card.confirmedByProvider;
      html += '<div class="flow-col-connector"></div>';
      html += '<div class="flow-node flow-node-provider' + (isConfirmed ? ' is-confirmed' : '') + '" data-nid="card-' + esc(card.id) + '" onclick="openFlowCardModal(\'' + card.id + '\')">';
      if (isConfirmed) {
        html += '<span class="flow-confirm-badge confirmed"><span class="material-icons-round">verified</span>Bestätigt</span>';
      } else if (card.stage === 'kontaktiert' || card.stage === 'angebot') {
        html += '<span class="flow-confirm-badge pending"><span class="material-icons-round">hourglass_top</span>Offen</span>';
      }
      if (card.listingImage) {
        html += '<div class="flow-prov-banner" style="background-image:url(\''+esc(card.listingImage)+'\')"></div>';
        if (card.listingTitle) {
          html += '<div class="flow-prov-listing-title">' + esc(card.listingTitle) + '</div>';
        }
      }
      html += '<div class="flow-provider-inner">';
      html += '<img class="flow-prov-avatar" src="' + esc(avatar) + '" onerror="this.src=\'https://api.dicebear.com/7.x/avataaars/svg?seed=x\'" alt="" />';
      html += '<div class="flow-prov-info">';
      html += '<strong>' + esc(card.name) + '</strong>';
      html += '<small>' + esc(card.category || '') + '</small>';
      if (card.price) html += '<span class="flow-prov-price">' + parseFloat(card.price).toLocaleString('de-DE') + ' €</span>';
      if (card.startTime) html += '<span class="flow-prov-time"><span class="material-icons-round" style="font-size:11px">schedule</span>' + esc(card.startTime) + (card.endTime ? ' – ' + esc(card.endTime) : '') + '</span>';
      html += '</div>';
      html += '<div class="flow-prov-actions">';
      var _saLabels = {geplant:'Kontaktieren',kontaktiert:'Angebot einholen',angebot:'Bestätigen',bestaetigt:'Abschließen'};
      var _saIcons  = {geplant:'call',kontaktiert:'request_quote',angebot:'handshake',bestaetigt:'task_alt'};
      var _saColors = {geplant:'#42a5f5',kontaktiert:'#ffa726',angebot:'#ab47bc',bestaetigt:'#66bb6a'};
      if (_saLabels[stage.id]) {
        html += '<button class="flow-prov-action-btn" style="--sa-clr:' + _saColors[stage.id] + '" onclick="event.stopPropagation();openStageAdvanceModal(\'' + card.id + '\',\'' + stage.id + '\')">';
        html += '<span class="material-icons-round">' + _saIcons[stage.id] + '</span> ' + _saLabels[stage.id];
        html += '</button>';
      }
      html += '<button class="flow-prov-btn flow-prov-del" onclick="event.stopPropagation();deleteBoardCard(\'' + card.id + '\');renderBoardFlow()" title="Löschen"><span class="material-icons-round">close</span> Löschen</button>';
      html += '</div>';
      html += '</div></div>';
    });

    html += '</div>'; // end flow-col
  });

  // End node
  html += '<div class="flow-col flow-drag-handle" data-col-id="end" style="' + colStyle('end') + '">';
  html += '<div class="flow-node flow-node-end" data-nid="end">';
  html += '<span class="material-icons-round" style="color:#4CAF50;font-size:32px">check_circle</span>';
  html += '<strong>Event fertig!</strong>';
  html += '<small>' + cards.filter(function(c){ return c.stage==='abgeschlossen'; }).length + ' abgeschlossen</small>';
  html += '</div>';
  html += '</div>';

  html += '</div>'; // end flow-world
  html += '</div>'; // end flow-canvas
  container.innerHTML = html;

  // Calc world size (max extents of all cols)
  var worldW = _defLayout['end'].x + _TW + _PAD;
  var worldH = _PAD * 2 + 200;
  Object.keys(storedLayout).forEach(function(k) {
    var p = storedLayout[k];
    if (p && typeof p.x === 'number') worldW = Math.max(worldW, p.x + _NW + _PAD);
    if (p && typeof p.y === 'number') worldH = Math.max(worldH, p.y + 200);
  });
  // Also account for stacked/horizontal provider cards per column
  stagesMeta.forEach(function(stage) {
    var cnt = cards.filter(function(c){ return c.stage===stage.id; }).length;
    var base = (storedLayout[stage.id] || _defLayout[stage.id]);
    if (_isMobile) {
      // Provider nodes fließen horizontal rechts vom Stage-Header
      worldW = Math.max(worldW, base.x + _TW + 16 + cnt * (_NW + 14) + _PAD);
      worldH = Math.max(worldH, base.y + 330);
    } else {
      worldH = Math.max(worldH, base.y + 100 + cnt * 90 + _PAD);
    }
  });
  // End-Node unten auf Mobile berücksichtigen
  if (_isMobile) {
    worldH = Math.max(worldH, _defLayout['end'].y + 180);
  }

  var worldEl = document.getElementById('flowWorld');
  if (worldEl) {
    worldEl.style.width  = worldW + 'px';
    worldEl.style.height = worldH + 'px';
    worldEl.dataset.worldW = worldW;
    worldEl.dataset.worldH = worldH;
  }
  // Apply current zoom (preserves user's zoom across re-renders)
  _flowApplyZoom(_flowZoom, true);

  requestAnimationFrame(function() { _drawFlowConnections(); _initFlowDrag(); _initFlowZoomPan(); });
}

/* ─── Flow view extra modals ─────────────────────────────── */
function openFlowProjectModal() {
  if (_flowDragJustEnded) { _flowDragJustEnded = false; return; }
  if (!_activeBoardId) return;
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;
  var html = '<div class="modal-overlay show" id="flowProjectModal" onclick="closeModalOnOverlay(event)" style="z-index:2000">' +
    '<div class="modal modal-sm" onclick="event.stopPropagation()">' +
    '<button class="modal-close" onclick="document.getElementById(\'flowProjectModal\').remove()"><span class="material-icons-round">close</span></button>' +
    '<div class="modal-header"><span class="material-icons-round modal-icon" style="color:var(--primary)">celebration</span>' +
    '<h2>Event bearbeiten</h2></div>' +
    '<form class="modal-form" onsubmit="_saveFlowProject(event)">' +
    '<div class="form-group"><label>Event-Name</label><input type="text" id="fpName" value="' + _escHtml(project.name) + '" required /></div>' +
    '<div class="form-group"><label>Datum</label><input type="text" id="fpDate" value="' + _escHtml(project.date || '') + '" placeholder="z.B. 15. August 2026" /></div>' +
    '<div class="form-group"><label>Budget (€)</label><input type="number" id="fpBudget" value="' + (project.budget || '') + '" min="0" step="100" /></div>' +
    '<button type="submit" class="btn-primary btn-block"><span class="material-icons-round">save</span> Speichern</button>' +
    '<button type="button" class="btn-outline btn-block" style="margin-top:8px;border-color:#f44336;color:#f44336" onclick="_deleteFlowProject()">' +
    '<span class="material-icons-round">delete</span> Projekt löschen</button>' +
    '</form></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}
function _saveFlowProject(event) {
  event.preventDefault();
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;
  project.name   = document.getElementById('fpName').value.trim() || project.name;
  project.date   = document.getElementById('fpDate').value.trim();
  project.budget = parseFloat(document.getElementById('fpBudget').value) || 0;
  _saveBoardProjects();
  document.getElementById('flowProjectModal') && document.getElementById('flowProjectModal').remove();
  renderBoardFlow();
  document.getElementById('boardEventName') && (document.getElementById('boardEventName').textContent = project.name);
  document.getElementById('boardEventDate') && (document.getElementById('boardEventDate').textContent = project.date || 'Datum noch offen');
  document.getElementById('statBudget') && (document.getElementById('statBudget').textContent = (project.budget || 0).toLocaleString('de-DE') + ' €');
}
function _deleteFlowProject() {
  if (!_activeBoardId) return;
  if (!confirm('Projekt wirklich löschen?')) return;
  _boardProjects = _boardProjects.filter(function(p) { return p.id !== _activeBoardId; });
  _saveBoardProjects({ immediate: true });
  document.getElementById('flowProjectModal') && document.getElementById('flowProjectModal').remove();
  showBoardProjects();
}

function openFlowBudgetModal() {
  if (!_activeBoardId) return;
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;
  var cards = project.cards || [];
  var budget = parseFloat(project.budget) || 0;
  var spent  = cards.reduce(function(s, c) { return s + (parseFloat(c.price) || 0); }, 0);
  var remaining = budget - spent;

  // Per-stage breakdown
  var stagesMeta = [
    { id: 'geplant', label: 'Geplant', color: '#9E9E9E' },
    { id: 'kontaktiert', label: 'Kontaktiert', color: '#FF9800' },
    { id: 'angebot', label: 'Angebot', color: '#2196F3' },
    { id: 'bestaetigt', label: 'Bestätigt', color: '#00A699' },
    { id: 'abgeschlossen', label: 'Abgeschlossen', color: '#FF385C' }
  ];

  var breakdown = stagesMeta.map(function(s) {
    var sc = cards.filter(function(c) { return c.stage === s.id; });
    var sum = sc.reduce(function(a, c) { return a + (parseFloat(c.price) || 0); }, 0);
    if (!sc.length) return '';
    var bPct = budget > 0 ? Math.min(100, Math.round(sum / budget * 100)) : 0;
    return '<div class="flow-bm-row">' +
      '<span class="flow-bm-dot" style="background:' + s.color + '"></span>' +
      '<span class="flow-bm-label">' + s.label + '</span>' +
      '<div class="flow-bm-track"><div class="flow-bm-fill" style="width:' + bPct + '%;background:' + s.color + '"></div></div>' +
      '<span class="flow-bm-val">' + sum.toLocaleString('de-DE') + ' €</span>' +
      '</div>';
  }).join('');

  var cardRows = cards.map(function(c) {
    return '<div class="flow-bm-card-row">' +
      '<span class="flow-bm-card-name">' + _escHtml(c.name) + '</span>' +
      '<span class="flow-bm-card-cat">' + _escHtml(c.category || '') + '</span>' +
      '<input class="flow-bm-card-price" type="number" value="' + (c.price || 0) + '" min="0" step="1" data-cid="' + c.id + '" oninput="_liveUpdateBudget()" />' +
      '<span class="flow-bm-eur">€</span>' +
      '</div>';
  }).join('') || '<div style="color:var(--text-light);font-style:italic;text-align:center;padding:12px">Noch keine Dienstleister in diesem Projekt</div>';

  var pct = budget > 0 ? Math.min(100, Math.round(spent / budget * 100)) : 0;
  var col = pct >= 100 ? '#FF385C' : pct >= 80 ? '#FF9800' : '#00A699';

  var html = '<div class="modal-overlay show" id="flowBudgetModal" onclick="closeModalOnOverlay(event)" style="z-index:2000">' +
    '<div class="modal" onclick="event.stopPropagation()" style="max-width:520px">' +
    '<button class="modal-close" onclick="document.getElementById(\'flowBudgetModal\').remove()"><span class="material-icons-round">close</span></button>' +
    '<div class="modal-header"><span class="material-icons-round modal-icon" style="color:' + col + '">account_balance_wallet</span>' +
    '<h2>Budget-Übersicht</h2></div>' +
    '<div class="flow-bm-summary">' +
    '<div class="flow-bm-big"><span class="flow-bm-spent" style="color:' + col + '">' + spent.toLocaleString('de-DE') + ' €</span>' +
    '<span class="flow-bm-divider">/</span>' +
    '<input class="flow-bm-total-input" type="number" id="bmTotalBudget" value="' + (budget || '') + '" min="0" step="100" placeholder="Budget festlegen" oninput="_liveUpdateBudget()" />' +
    '<span class="flow-bm-eur2">€ gesamt</span></div>' +
    '<div class="flow-bm-bar"><div class="flow-bm-bar-fill" id="bmBarFill" style="width:' + pct + '%;background:' + col + '"></div></div>' +
    '<div class="flow-bm-labels"><span style="color:' + col + '">' + pct + '% genutzt</span>' +
    (budget > 0 ? '<span>' + (remaining >= 0 ? remaining.toLocaleString('de-DE') + ' € verbleibend' : Math.abs(remaining).toLocaleString('de-DE') + ' € überzogen') + '</span>' : '') +
    '</div></div>' +
    (breakdown ? '<div class="flow-bm-breakdown">' + breakdown + '</div>' : '') +
    '<div class="flow-bm-cards">' +
    '<div class="flow-bm-cards-title"><span class="material-icons-round">format_list_bulleted</span> Einzelne Posten bearbeiten</div>' +
    cardRows +
    '</div>' +
    '<div style="display:flex;gap:10px;margin-top:16px">' +
    '<button class="btn-primary btn-block" onclick="_saveBudgetModal()"><span class="material-icons-round">save</span> Speichern</button>' +
    '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}

function _liveUpdateBudget() {
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;
  // update individual card prices inline
  document.querySelectorAll('.flow-bm-card-price').forEach(function(inp) {
    var cid = inp.dataset.cid;
    var card = (project.cards || []).find(function(c) { return c.id === cid; });
    if (card) card.price = parseFloat(inp.value) || 0;
  });
  var budget = parseFloat(document.getElementById('bmTotalBudget') ? document.getElementById('bmTotalBudget').value : 0) || 0;
  var spent  = (project.cards || []).reduce(function(s,c) { return s + (parseFloat(c.price)||0); }, 0);
  var pct = budget > 0 ? Math.min(100, Math.round(spent / budget * 100)) : 0;
  var col = pct >= 100 ? '#FF385C' : pct >= 80 ? '#FF9800' : '#00A699';
  var fill = document.getElementById('bmBarFill');
  if (fill) { fill.style.width = pct + '%'; fill.style.background = col; }
}

function _saveBudgetModal() {
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;
  // save card prices
  document.querySelectorAll('.flow-bm-card-price').forEach(function(inp) {
    var cid = inp.dataset.cid;
    var card = (project.cards || []).find(function(c) { return c.id === cid; });
    if (card) card.price = parseFloat(inp.value) || 0;
  });
  var budgetInput = document.getElementById('bmTotalBudget');
  if (budgetInput) project.budget = parseFloat(budgetInput.value) || 0;
  _saveBoardProjects();
  document.getElementById('flowBudgetModal') && document.getElementById('flowBudgetModal').remove();
  renderBoardFlow();
  _updateBoardStats(project);
  showToast('Budget gespeichert!', 'check_circle');
}

// ============= Zeit-Picker (Zeitraum + Presets + Stepper) =============
window._buildTimePicker = function(startId, endId, startVal, endVal) {
  var sv = startVal || '10:00';
  var ev = endVal || '';
  var presets = [
    { key:'morning',   icon:'wb_twilight',   label:'Vormittag',   hint:'09–12',  s:'09:00', e:'12:00' },
    { key:'afternoon', icon:'light_mode',    label:'Nachmittag',  hint:'13–17',  s:'13:00', e:'17:00' },
    { key:'evening',   icon:'nights_stay',   label:'Abend',       hint:'18–22',  s:'18:00', e:'22:00' },
    { key:'night',     icon:'dark_mode',     label:'Nacht',       hint:'22–02',  s:'22:00', e:'02:00' },
    { key:'allday',    icon:'event_available',label:'Ganztags',   hint:'10–22',  s:'10:00', e:'22:00' }
  ];
  var presetsHtml = presets.map(function(p){
    return '<button type="button" class="eb-tp-preset" data-s="'+p.s+'" data-e="'+p.e+'" onclick="_tpApplyPreset(\''+startId+'\',\''+endId+'\',\''+p.s+'\',\''+p.e+'\',this)">' +
      '<span class="material-icons-round">'+p.icon+'</span>' +
      '<span class="eb-tp-preset-lbl">'+p.label+'</span>' +
      '<span class="eb-tp-preset-hint">'+p.hint+'</span>' +
    '</button>';
  }).join('');
  return '<div class="eb-tp">' +
    '<div class="eb-tp-presets">' + presetsHtml + '</div>' +
    '<div class="eb-tp-range">' +
      '<div class="eb-tp-field">' +
        '<span class="eb-tp-lbl"><span class="material-icons-round">play_arrow</span>Start</span>' +
        '<div class="eb-tp-iw">' +
          '<button type="button" class="eb-tp-step" aria-label="-30 Min" onclick="_tpStep(\''+startId+'\',-30,\''+startId+'\',\''+endId+'\')">−</button>' +
          '<input type="time" id="'+startId+'" class="eb-tp-time" value="'+sv+'" oninput="_tpUpdateDur(\''+startId+'\',\''+endId+'\')" />' +
          '<button type="button" class="eb-tp-step" aria-label="+30 Min" onclick="_tpStep(\''+startId+'\',30,\''+startId+'\',\''+endId+'\')">+</button>' +
        '</div>' +
      '</div>' +
      '<span class="eb-tp-arrow material-icons-round">arrow_right_alt</span>' +
      '<div class="eb-tp-field">' +
        '<span class="eb-tp-lbl"><span class="material-icons-round">stop</span>Ende <em>(optional)</em></span>' +
        '<div class="eb-tp-iw">' +
          '<button type="button" class="eb-tp-step" aria-label="-30 Min" onclick="_tpStep(\''+endId+'\',-30,\''+startId+'\',\''+endId+'\')">−</button>' +
          '<input type="time" id="'+endId+'" class="eb-tp-time" value="'+ev+'" placeholder="--:--" oninput="_tpUpdateDur(\''+startId+'\',\''+endId+'\')" />' +
          '<button type="button" class="eb-tp-step" aria-label="+30 Min" onclick="_tpStep(\''+endId+'\',30,\''+startId+'\',\''+endId+'\')">+</button>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="eb-tp-dur" id="'+startId+'_dur"><span class="material-icons-round">hourglass_empty</span><span>Kein Endzeitpunkt</span></div>' +
  '</div>';
};

window._tpApplyPreset = function(sId, eId, s, e, btn) {
  var si = document.getElementById(sId), ei = document.getElementById(eId);
  if (si) si.value = s;
  if (ei) ei.value = e;
  // visual active state
  if (btn) {
    var grp = btn.parentElement;
    if (grp) grp.querySelectorAll('.eb-tp-preset').forEach(function(b){ b.classList.remove('is-active'); });
    btn.classList.add('is-active');
  }
  _tpUpdateDur(sId, eId);
};

window._tpStep = function(id, minutes, sId, eId) {
  var el = document.getElementById(id);
  if (!el) return;
  var v = el.value || '10:00';
  var parts = v.split(':');
  var total = (parseInt(parts[0],10)||0)*60 + (parseInt(parts[1],10)||0) + minutes;
  total = ((total % (24*60)) + (24*60)) % (24*60);
  var hh = Math.floor(total/60), mm = total%60;
  el.value = (hh<10?'0':'')+hh + ':' + (mm<10?'0':'')+mm;
  _tpUpdateDur(sId || id, eId || '');
  // clear preset highlight
  var tp = el.closest('.eb-tp');
  if (tp) tp.querySelectorAll('.eb-tp-preset.is-active').forEach(function(b){ b.classList.remove('is-active'); });
};

window._tpUpdateDur = function(sId, eId) {
  var dur = document.getElementById(sId+'_dur');
  if (!dur) return;
  var si = document.getElementById(sId), ei = document.getElementById(eId);
  var sv = si ? si.value : '', ev = ei ? ei.value : '';
  if (!sv || !ev) {
    dur.innerHTML = '<span class="material-icons-round">hourglass_empty</span><span>Kein Endzeitpunkt</span>';
    dur.classList.remove('is-set');
    return;
  }
  var sp = sv.split(':'), ep = ev.split(':');
  var sm = (+sp[0])*60 + (+sp[1]);
  var em = (+ep[0])*60 + (+ep[1]);
  var diff = em - sm;
  if (diff <= 0) diff += 24*60; // wrap past midnight
  var h = Math.floor(diff/60), m = diff%60;
  var txt = (h?h+' Std ':'') + (m?m+' Min':(h?'':'0 Min'));
  dur.innerHTML = '<span class="material-icons-round">schedule</span><span>Dauer: <strong>'+txt+'</strong></span>';
  dur.classList.add('is-set');
};

function openFlowCardModal(cardId) {
  if (!_activeBoardId) return;
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;
  var card = (project.cards || []).find(function(c) { return c.id === cardId; });
  if (!card) return;

  var stageOptions = [
    { id: 'geplant', label: 'Geplant' }, { id: 'kontaktiert', label: 'Kontaktiert' },
    { id: 'angebot', label: 'Angebot' }, { id: 'bestaetigt', label: 'Bestätigt' },
    { id: 'abgeschlossen', label: 'Abgeschlossen' }
  ].map(function(s) {
    return '<option value="' + s.id + '"' + (s.id === card.stage ? ' selected' : '') + '>' + s.label + '</option>';
  }).join('');

  var html = '<div class="modal-overlay show" id="flowCardModal" onclick="closeModalOnOverlay(event)" style="z-index:2000">' +
    '<div class="modal modal-sm" onclick="event.stopPropagation()">' +
    '<button class="modal-close" onclick="document.getElementById(\'flowCardModal\').remove()"><span class="material-icons-round">close</span></button>' +
    '<div class="modal-header"><span class="material-icons-round modal-icon">edit</span><h2>' + _escHtml(card.name) + '</h2></div>' +
    '<form class="modal-form" onsubmit="_saveFlowCard(event,\'' + cardId + '\')">' +
    '<div class="form-group"><label>Name</label><input type="text" id="fcName" value="' + _escHtml(card.name) + '" required /></div>' +
    '<div class="form-group"><label>Kategorie</label><input type="text" id="fcCat" value="' + _escHtml(card.category || '') + '" /></div>' +
    '<div class="form-group"><label>Preis (€)</label><input type="number" id="fcPrice" value="' + (card.price || '') + '" min="0" step="1" /></div>' +
    '<div class="form-group"><label>Uhrzeit am Eventtag</label>' + window._buildTimePicker('fcTime','fcTimeEnd', card.startTime || '10:00', card.endTime || '') + '</div>' +
    '<div class="form-group"><label>Status / Stage</label><select id="fcStage">' + stageOptions + '</select></div>' +
    '<div class="form-group"><label>Notiz</label><textarea id="fcNote" rows="3">' + _escHtml(card.note || '') + '</textarea></div>' +
    '<button type="submit" class="btn-primary btn-block"><span class="material-icons-round">save</span> Speichern</button>' +
    '<button type="button" class="btn-outline btn-block" style="margin-top:8px;color:#f44336;border-color:#f44336" onclick="deleteBoardCard(\'' + cardId + '\');renderBoardFlow();document.getElementById(\'flowCardModal\').remove()">' +
    '<span class="material-icons-round">delete</span> Dienstleister entfernen</button>' +
    '</form></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}

function _saveFlowCard(event, cardId) {
  event.preventDefault();
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;
  var card = (project.cards || []).find(function(c) { return c.id === cardId; });
  if (!card) return;
  card.name      = document.getElementById('fcName').value.trim();
  card.category  = document.getElementById('fcCat').value.trim();
  card.price     = parseFloat(document.getElementById('fcPrice').value) || 0;
  card.startTime = document.getElementById('fcTime').value;
  card.endTime   = document.getElementById('fcTimeEnd') ? document.getElementById('fcTimeEnd').value : '';
  card.stage     = document.getElementById('fcStage').value;
  card.note      = document.getElementById('fcNote').value.trim();
  _saveBoardProjects();
  document.getElementById('flowCardModal') && document.getElementById('flowCardModal').remove();
  renderBoardFlow();
  renderKanban(project);
  _updateBoardStats(project);
}

function openAddProviderModalFlow(stage) {
  openAddProviderModal(stage);
  // patch the submit handler to also refresh the flow view
  var originalForm = document.querySelector('#addProviderModal form');
  if (originalForm) {
    var origSubmit = originalForm.onsubmit;
    originalForm.onsubmit = function(e) {
      var result = origSubmit ? origSubmit.call(this, e) : null;
      setTimeout(function() { if (document.getElementById('boardFlowView') && document.getElementById('boardFlowView').style.display !== 'none') renderBoardFlow(); }, 50);
      return result;
    };
  }
}

function moveBoardCardStage(cardId, currentStage) {
  var stagesOrder = ['geplant','kontaktiert','angebot','bestaetigt','abgeschlossen'];
  var idx = stagesOrder.indexOf(currentStage);
  var nextStage = stagesOrder[(idx + 1) % stagesOrder.length];
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;
  var card = (project.cards || []).find(function(c) { return c.id === cardId; });
  if (!card) return;
  card.stage = nextStage;
  _saveBoardProjects();
  renderBoardFlow();
  renderKanban(project);
  _updateBoardStats(project);
}

/* ── Stage Advance Modal ── */
function openStageAdvanceModal(cardId, currentStage) {
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;
  var card = (project.cards || []).find(function(c) { return c.id === cardId; });
  if (!card) return;

  var titles = {geplant:'Kontaktieren',kontaktiert:'Angebot einholen',angebot:'Bestätigen',bestaetigt:'Abschließen'};
  var icons  = {geplant:'call',kontaktiert:'request_quote',angebot:'handshake',bestaetigt:'task_alt'};
  var title  = titles[currentStage] || 'Weiter';
  var icon   = icons[currentStage] || 'arrow_forward';

  var fieldsHtml = '';
  // Look up provider contact info from listing + user
  var _listing = card.listingId ? (LISTINGS || []).find(function(l){ return l.id === card.listingId; }) : null;
  var _provPhone = (_listing && _listing.phone) || '';
  var _provEmail = (_listing && _listing.email) || '';
  var _provName  = card.name || (_listing && _listing.providerName) || 'Anbieter';
  var _provWhatsapp = (_listing && _listing.whatsapp) || '';
  // Also check provider user record
  if (_listing && _listing.providerId) {
    var _dUsers = _demoUsers();
    var _pu = _dUsers.find(function(u){ return u.id === _listing.providerId; });
    if (_pu) {
      if (!_provPhone && _pu.phone) _provPhone = _pu.phone;
      if (!_provEmail && _pu.email) _provEmail = _pu.email;
    }
  }
  var _hasPhone = !!_provPhone;
  var _hasWhatsapp = !!(_provWhatsapp || _provPhone);
  var _hasEmail = !!_provEmail;
  // Clean phone for tel/wa links
  var _cleanPhone = (_provWhatsapp || _provPhone || '').replace(/[\s\-\(\)]/g, '');
  if (_cleanPhone && !_cleanPhone.startsWith('+')) _cleanPhone = '+49' + _cleanPhone.replace(/^0/, '');
  // Project info for pre-filled messages
  var _projectName = project.name || 'mein Event';
  var _projectDate = project.date ? new Date(project.date).toLocaleDateString('de-DE', {day:'numeric',month:'long',year:'numeric'}) : '';
  var _senderName = (typeof currentUser !== 'undefined' && currentUser) ? ((currentUser.first_name || '') + ' ' + (currentUser.last_name || '')).trim() || currentUser.email || '' : '';

  if (currentStage === 'geplant') {
    // Build pre-filled message
    var _defaultMsg = 'Hallo ' + _provName + ',\\n\\nich plane ' + _projectName +
      (_projectDate ? ' am ' + _projectDate : '') +
      ' und bin an Ihrem Angebot „' + (_listing ? _listing.title || '' : card.name || '') + '" interessiert.' +
      '\\n\\nKönnten wir die Details besprechen?' +
      (_senderName ? '\\n\\nMit freundlichen Grüßen\\n' + _senderName : '\\n\\nMit freundlichen Grüßen');
    var _defaultMsgClean = _defaultMsg.replace(/\\n/g, '\n');

    fieldsHtml = '' +
      '<label class="sa-label">Nachricht anpassen</label>' +
      '<textarea id="saMessage" class="sa-input" rows="6">' + _defaultMsgClean + '</textarea>' +
      '<label class="sa-label" style="margin-top:8px">Kontaktweg wählen & direkt kontaktieren</label>' +
      '<div class="sa-action-buttons">' +
        // TELEFON
        '<button type="button" class="sa-action-btn sa-action-phone' + (_hasPhone ? '' : ' sa-action-disabled') + '" id="saDoPhone">' +
          '<span class="sa-action-icon"><span class="material-icons-round">call</span></span>' +
          '<span class="sa-action-text">' +
            '<strong>Anrufen</strong>' +
            '<small>' + (_hasPhone ? _provPhone : 'Nicht verfügbar') + '</small>' +
          '</span>' +
          '<span class="material-icons-round sa-action-arrow">arrow_forward</span>' +
        '</button>' +
        // E-MAIL
        '<button type="button" class="sa-action-btn sa-action-email" id="saDoEmail">' +
          '<span class="sa-action-icon"><span class="material-icons-round">email</span></span>' +
          '<span class="sa-action-text">' +
            '<strong>E-Mail senden</strong>' +
            '<small>' + (_hasEmail ? _provEmail : 'Adresse wird abgefragt') + '</small>' +
          '</span>' +
          '<span class="material-icons-round sa-action-arrow">arrow_forward</span>' +
        '</button>' +
        // WHATSAPP
        '<button type="button" class="sa-action-btn sa-action-whatsapp' + (_hasWhatsapp ? '' : ' sa-action-disabled') + '" id="saDoWhatsapp">' +
          '<span class="sa-action-icon"><span class="material-icons-round">chat</span></span>' +
          '<span class="sa-action-text">' +
            '<strong>WhatsApp</strong>' +
            '<small>' + (_hasWhatsapp ? (_provWhatsapp || _provPhone) : 'Nicht verfügbar') + '</small>' +
          '</span>' +
          '<span class="material-icons-round sa-action-arrow">arrow_forward</span>' +
        '</button>' +
      '</div>' +
      '<input type="hidden" id="saContactMethod" value="">' +
      '<input type="hidden" id="saProvPhone" value="' + _escHtml(_cleanPhone) + '">' +
      '<input type="hidden" id="saProvEmail" value="' + _escHtml(_provEmail) + '">' +
      '<input type="hidden" id="saProjectName" value="' + _escHtml(_projectName) + '">';
  } else if (currentStage === 'kontaktiert') {
    fieldsHtml = '' +
      '<label class="sa-label">Angefragter Preis (€)</label>' +
      '<input id="saPrice" type="number" class="sa-input" step="1" min="0" placeholder="z.B. 500" value="' + (card.price || '') + '">' +
      '<label class="sa-label">Deadline für Angebot</label>' +
      '<input id="saDeadline" type="date" class="sa-input">' +
      '<label class="sa-label">Notizen</label>' +
      '<textarea id="saNotes" class="sa-input" rows="3" placeholder="Besondere Anforderungen…"></textarea>';
  } else if (currentStage === 'angebot') {
    fieldsHtml = '' +
      '<label class="sa-label">Finaler Preis (€)</label>' +
      '<input id="saFinalPrice" type="number" class="sa-input" step="1" min="0" placeholder="z.B. 450" value="' + (card.price || '') + '">' +
      '<label class="sa-label">Bedingungen</label>' +
      '<textarea id="saTerms" class="sa-input" rows="2" placeholder="Zahlungsbedingungen, Storno…"></textarea>' +
      '<label class="sa-chip sa-confirm-check"><input type="checkbox" id="saConfirmed"><span>Anbieter hat bestätigt</span></label>';
  } else if (currentStage === 'bestaetigt') {
    fieldsHtml = '' +
      '<label class="sa-label">Bezahlung</label>' +
      '<div class="sa-chips">' +
        '<label class="sa-chip"><input type="radio" name="saPayment" value="Offen" checked><span>⏳ Offen</span></label>' +
        '<label class="sa-chip"><input type="radio" name="saPayment" value="Bezahlt"><span>✅ Bezahlt</span></label>' +
        '<label class="sa-chip"><input type="radio" name="saPayment" value="Teilzahlung"><span>💳 Teilzahlung</span></label>' +
      '</div>' +
      '<label class="sa-label">Bewertung <small>(optional)</small></label>' +
      '<div class="sa-stars" id="saStars">' +
        '<span onclick="document.querySelectorAll(\'#saStars span\').forEach(function(s,i){s.textContent=i<1?\'star\':\'star_border\'});document.getElementById(\'saRating\').value=1" class="material-icons-round">star_border</span>' +
        '<span onclick="document.querySelectorAll(\'#saStars span\').forEach(function(s,i){s.textContent=i<2?\'star\':\'star_border\'});document.getElementById(\'saRating\').value=2" class="material-icons-round">star_border</span>' +
        '<span onclick="document.querySelectorAll(\'#saStars span\').forEach(function(s,i){s.textContent=i<3?\'star\':\'star_border\'});document.getElementById(\'saRating\').value=3" class="material-icons-round">star_border</span>' +
        '<span onclick="document.querySelectorAll(\'#saStars span\').forEach(function(s,i){s.textContent=i<4?\'star\':\'star_border\'});document.getElementById(\'saRating\').value=4" class="material-icons-round">star_border</span>' +
        '<span onclick="document.querySelectorAll(\'#saStars span\').forEach(function(s,i){s.textContent=i<5?\'star\':\'star_border\'});document.getElementById(\'saRating\').value=5" class="material-icons-round">star_border</span>' +
      '</div>' +
      '<input type="hidden" id="saRating" value="0">' +
      '<label class="sa-label">Kommentar</label>' +
      '<textarea id="saComment" class="sa-input" rows="2" placeholder="Wie war die Zusammenarbeit?"></textarea>';
  }

  var overlay = document.createElement('div');
  overlay.className = 'sa-overlay';
  overlay.innerHTML = '' +
    '<div class="sa-modal">' +
      '<div class="sa-header"><span class="material-icons-round">' + icon + '</span> ' + title + ' – ' + (card.name || 'Karte') + '</div>' +
      '<div class="sa-body">' + fieldsHtml + '</div>' +
      '<div class="sa-footer">' +
        '<button class="sa-cancel" onclick="this.closest(\'.sa-overlay\').remove()">Abbrechen</button>' +
        '<button class="sa-submit" id="saSubmitBtn"><span class="material-icons-round">' + icon + '</span> ' + title + '</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  requestAnimationFrame(function(){ overlay.classList.add('sa-visible'); });

  // Close on backdrop click
  overlay.addEventListener('click', function(e){ if(e.target===overlay) overlay.remove(); });

  // ── Contact action buttons (geplant stage) ──
  if (currentStage === 'geplant') {
    var _saMsg = function(){ return (document.getElementById('saMessage') || {}).value || ''; };
    var _saSetMethod = function(m){ var el = document.getElementById('saContactMethod'); if(el) el.value = m; };

    // Phone
    var phoneBtn = document.getElementById('saDoPhone');
    if (phoneBtn) phoneBtn.addEventListener('click', function() {
      var phone = (document.getElementById('saProvPhone') || {}).value;
      if (!phone) { showToast('Keine Telefonnummer verfügbar', 'error'); return; }
      _saSetMethod('Telefon');
      window.open('tel:' + phone, '_self');
      // Mark as contacted after a short delay
      phoneBtn.innerHTML = '<span class="sa-action-icon" style="background:#66bb6a"><span class="material-icons-round">check</span></span><span class="sa-action-text"><strong>Anruf gestartet</strong><small>Wurde als kontaktiert markiert</small></span>';
      phoneBtn.classList.add('sa-action-done');
    });

    // Email
    var emailBtn = document.getElementById('saDoEmail');
    if (emailBtn) emailBtn.addEventListener('click', function() {
      var email = (document.getElementById('saProvEmail') || {}).value;
      var msg = _saMsg();
      var projName = (document.getElementById('saProjectName') || {}).value || 'Event';
      var subject = encodeURIComponent('Anfrage für ' + projName + ' – Eventbörse');
      var body = encodeURIComponent(msg);
      if (email) {
        window.open('mailto:' + email + '?subject=' + subject + '&body=' + body, '_self');
      } else {
        // No email known – open mailto with empty to, user can fill in
        window.open('mailto:?subject=' + subject + '&body=' + body, '_self');
      }
      _saSetMethod('E-Mail');
      emailBtn.innerHTML = '<span class="sa-action-icon" style="background:#66bb6a"><span class="material-icons-round">check</span></span><span class="sa-action-text"><strong>E-Mail geöffnet</strong><small>Wurde als kontaktiert markiert</small></span>';
      emailBtn.classList.add('sa-action-done');
    });

    // WhatsApp
    var waBtn = document.getElementById('saDoWhatsapp');
    if (waBtn) waBtn.addEventListener('click', function() {
      var phone = (document.getElementById('saProvPhone') || {}).value;
      if (!phone) { showToast('Keine Nummer für WhatsApp verfügbar', 'error'); return; }
      var msg = _saMsg();
      var waUrl = 'https://wa.me/' + phone.replace('+', '') + '?text=' + encodeURIComponent(msg);
      window.open(waUrl, '_blank');
      _saSetMethod('WhatsApp');
      waBtn.innerHTML = '<span class="sa-action-icon" style="background:#66bb6a"><span class="material-icons-round">check</span></span><span class="sa-action-text"><strong>WhatsApp geöffnet</strong><small>Wurde als kontaktiert markiert</small></span>';
      waBtn.classList.add('sa-action-done');
    });
  }

  // Submit
  document.getElementById('saSubmitBtn').addEventListener('click', function() {
    if (currentStage === 'geplant') {
      var method = (document.getElementById('saContactMethod') || {}).value || 'E-Mail';
      card.contactMethod = method;
      card.contactMessage = (document.getElementById('saMessage') || {}).value || '';
      card.contactDate = new Date().toISOString().slice(0,10);
    } else if (currentStage === 'kontaktiert') {
      var p = (document.getElementById('saPrice') || {}).value;
      if (p) card.requestedPrice = parseFloat(p);
      card.offerDeadline = (document.getElementById('saDeadline') || {}).value || '';
      card.offerNotes = (document.getElementById('saNotes') || {}).value || '';
    } else if (currentStage === 'angebot') {
      var fp = (document.getElementById('saFinalPrice') || {}).value;
      if (fp) card.price = parseFloat(fp);
      card.terms = (document.getElementById('saTerms') || {}).value || '';
      card.confirmedByProvider = !!(document.getElementById('saConfirmed') || {}).checked;
    } else if (currentStage === 'bestaetigt') {
      card.paymentStatus = (document.querySelector('input[name=saPayment]:checked') || {}).value || '';
      card.rating = parseInt((document.getElementById('saRating') || {}).value) || 0;
      card.reviewComment = (document.getElementById('saComment') || {}).value || '';
    }

    // Advance stage
    var stagesOrder = ['geplant','kontaktiert','angebot','bestaetigt','abgeschlossen'];
    var idx = stagesOrder.indexOf(currentStage);
    if (idx >= 0 && idx < stagesOrder.length - 1) card.stage = stagesOrder[idx + 1];

    _saveBoardProjects();
    overlay.remove();
    renderBoardFlow();
    renderKanban(project);
    _updateBoardStats(project);
  });
}

function _drawFlowConnections() {
  var canvas = document.getElementById('flowCanvas');
  var world  = document.getElementById('flowWorld');
  var svg    = document.getElementById('flowSvg');
  if (!canvas || !svg) return;

  var host = world || canvas;
  var W = Math.max(host.scrollWidth || 2400, host.offsetWidth || 2400);
  var H = Math.max(host.scrollHeight || 700, host.offsetHeight || 700, 700);
  svg.setAttribute('width',  W);
  svg.setAttribute('height', H);
  svg.style.width  = W + 'px';
  svg.style.height = H + 'px';

  // Use col.style.left/top (canvas-relative) + el.offsetLeft/Top (col-relative)
  // This approach is immune to container scroll since it uses document-layout values.
  function nodeBounds(nid) {
    var el = canvas.querySelector('[data-nid="' + nid + '"]');
    if (!el) return null;
    var col = el.closest('[data-col-id]');
    if (!col) return null;
    var colX = parseFloat(col.style.left) || 0;
    var colY = parseFloat(col.style.top)  || 0;
    // el.offsetLeft/Top are relative to col (col is position:absolute = offsetParent)
    return {
      left:  colX + el.offsetLeft,
      right: colX + el.offsetLeft + el.offsetWidth,
      midY:  colY + el.offsetTop  + el.offsetHeight / 2
    };
  }

  var nodeIds = ['start', 'stage-geplant', 'stage-kontaktiert', 'stage-angebot', 'stage-bestaetigt', 'stage-abgeschlossen', 'end'];
  var defs = '<defs><marker id="flarrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="rgba(255,255,255,0.4)"/></marker></defs>';
  var paths = '';

  for (var i = 0; i < nodeIds.length - 1; i++) {
    var from = nodeBounds(nodeIds[i]);
    var to   = nodeBounds(nodeIds[i + 1]);
    if (!from || !to) continue;
    var cx = (from.right + to.left) / 2;
    paths += '<path d="M' + from.right + ',' + from.midY +
             ' C' + cx + ',' + from.midY +
             ' ' + cx + ',' + to.midY +
             ' ' + to.left + ',' + to.midY +
             '" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="2" stroke-linecap="round" marker-end="url(#flarrow)"/>';
  }

  svg.innerHTML = defs + paths;
}

/* ─── Flow drag-to-reposition ───────────────────────────── */
var _flowDrag = null;
var _flowDragJustEnded = false;
var _flowDragWinHandlers = null;

function _initFlowDrag() {
  // Remove stale window listeners from previous render
  if (_flowDragWinHandlers) {
    window.removeEventListener('mousemove', _flowDragWinHandlers.move);
    window.removeEventListener('mouseup',   _flowDragWinHandlers.up);
    _flowDragWinHandlers = null;
  }
  var canvas = document.getElementById('flowCanvas');
  if (!canvas) return;

  canvas.addEventListener('mousedown', function(e) {
    if (e.button !== 0) return;
    if (e.target.closest('button,input,select,textarea')) return;
    var handle = e.target.closest('.flow-drag-handle');
    if (!handle) return;
    var col = handle.closest('[data-col-id]');
    if (!col) return;
    e.preventDefault();
    _flowDrag = {
      col:          col,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startLeft:    parseFloat(col.style.left) || 0,
      startTop:     parseFloat(col.style.top)  || 0,
      moved:        false
    };
    col.style.zIndex     = '50';
    col.style.transition = 'none';
  });

  function onMove(e) {
    if (!_flowDrag) return;
    var z = _flowZoom || 1;
    var dx = (e.clientX - _flowDrag.startClientX) / z;
    var dy = (e.clientY - _flowDrag.startClientY) / z;
    if (!_flowDrag.moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
      _flowDrag.moved = true;
      _flowDrag.col.classList.add('is-dragging');
    }
    if (!_flowDrag.moved) return;
    _flowDrag.col.style.left = Math.max(0, _flowDrag.startLeft + dx) + 'px';
    _flowDrag.col.style.top  = Math.max(0, _flowDrag.startTop  + dy) + 'px';
    _drawFlowConnections();
  }

  function onUp() {
    if (!_flowDrag) return;
    _flowDrag.col.classList.remove('is-dragging');
    _flowDrag.col.style.zIndex     = '';
    _flowDrag.col.style.transition = '';
    if (_flowDrag.moved) {
      _flowDragJustEnded = true;
      setTimeout(function() { _flowDragJustEnded = false; }, 200);
      _saveFlowColPosition(_flowDrag.col);
    }
    _flowDrag = null;
  }

  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup',   onUp);
  _flowDragWinHandlers = { move: onMove, up: onUp };

  // Touch support
  canvas.addEventListener('touchstart', function(e) {
    if (e.target.closest('button')) return;
    var handle = e.target.closest('.flow-drag-handle');
    if (!handle) return;
    var col = handle.closest('[data-col-id]');
    if (!col) return;
    var t = e.touches[0];
    _flowDrag = {
      col:          col,
      startClientX: t.clientX,
      startClientY: t.clientY,
      startLeft:    parseFloat(col.style.left) || 0,
      startTop:     parseFloat(col.style.top)  || 0,
      moved:        false
    };
    col.style.zIndex = '50';
  }, { passive: true });

  canvas.addEventListener('touchmove', function(e) {
    if (!_flowDrag) return;
    var t = e.touches[0];
    var z = _flowZoom || 1;
    var dx = (t.clientX - _flowDrag.startClientX) / z;
    var dy = (t.clientY - _flowDrag.startClientY) / z;
    if (!_flowDrag.moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
      _flowDrag.moved = true;
      _flowDrag.col.classList.add('is-dragging');
    }
    if (!_flowDrag.moved) return;
    e.preventDefault();
    _flowDrag.col.style.left = Math.max(0, _flowDrag.startLeft + dx) + 'px';
    _flowDrag.col.style.top  = Math.max(0, _flowDrag.startTop  + dy) + 'px';
    _drawFlowConnections();
  }, { passive: false });

  canvas.addEventListener('touchend', function() {
    if (!_flowDrag) return;
    _flowDrag.col.classList.remove('is-dragging');
    _flowDrag.col.style.zIndex = '';
    if (_flowDrag.moved) {
      _flowDragJustEnded = true;
      setTimeout(function() { _flowDragJustEnded = false; }, 200);
      _saveFlowColPosition(_flowDrag.col);
    }
    _flowDrag = null;
  });
}

function _saveFlowColPosition(col) {
  if (!_activeBoardId) return;
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;
  var colId = col.dataset.colId;
  if (!colId) return;
  if (!project.flowLayout) project.flowLayout = {};
  project.flowLayout[colId] = {
    x: Math.round(parseFloat(col.style.left) || 0),
    y: Math.round(parseFloat(col.style.top)  || 0)
  };
  _saveBoardProjects();
}

/* ─── Flow Zoom / Pan ─────────────────────────────────── */
var _flowZoom = 1;
var _flowMinZoom = 0.25;
var _flowMaxZoom = 2;
var _flowPanInit = false;
var _flowPanWinHandlers = null;

function _flowApplyZoom(z, immediate) {
  z = Math.max(_flowMinZoom, Math.min(_flowMaxZoom, z));
  _flowZoom = z;
  var world = document.getElementById('flowWorld');
  var canvas = document.getElementById('flowCanvas');
  if (!world || !canvas) return;
  if (immediate) world.classList.add('no-transition');
  world.style.transform = 'scale(' + z + ')';
  // Size the scroll container to match scaled world
  var wW = parseFloat(world.dataset.worldW) || world.offsetWidth;
  var wH = parseFloat(world.dataset.worldH) || world.offsetHeight;
  canvas.style.minWidth  = (wW * z) + 'px';
  canvas.style.minHeight = (wH * z) + 'px';
  if (immediate) requestAnimationFrame(function(){ world.classList.remove('no-transition'); });
  var lbl = document.getElementById('flowZoomPct');
  if (lbl) lbl.textContent = Math.round(z * 100) + '%';
}

function flowZoom(delta) {
  var canvas = document.getElementById('flowCanvas');
  if (!canvas) return;
  var oldZ = _flowZoom;
  var newZ = Math.max(_flowMinZoom, Math.min(_flowMaxZoom, oldZ + delta));
  if (newZ === oldZ) return;
  // Zoom toward center of current viewport
  var cx = canvas.scrollLeft + canvas.clientWidth / 2;
  var cy = canvas.scrollTop + canvas.clientHeight / 2;
  var ratio = newZ / oldZ;
  _flowApplyZoom(newZ);
  canvas.scrollLeft = cx * ratio - canvas.clientWidth / 2;
  canvas.scrollTop  = cy * ratio - canvas.clientHeight / 2;
}

function flowFitToScreen() {
  var canvas = document.getElementById('flowCanvas');
  var world  = document.getElementById('flowWorld');
  if (!canvas || !world) return;
  var wW = parseFloat(world.dataset.worldW) || world.offsetWidth;
  var wH = parseFloat(world.dataset.worldH) || world.offsetHeight;
  var availW = canvas.clientWidth - 16;
  var availH = canvas.clientHeight - 16;
  var fitZ = Math.min(availW / wW, availH / wH, 1);
  fitZ = Math.max(_flowMinZoom, fitZ);
  _flowApplyZoom(fitZ);
  setTimeout(function() {
    canvas.scrollLeft = 0;
    canvas.scrollTop  = 0;
  }, 50);
}

function flowResetView() {
  _flowApplyZoom(1);
  var canvas = document.getElementById('flowCanvas');
  if (canvas) { canvas.scrollLeft = 0; canvas.scrollTop = 0; }
}

function toggleFlowFullscreen() {
  var view = document.getElementById('boardFlowView');
  if (!view) return;
  var doc = document;
  var isFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement);
  // Pseudo-Fullscreen-Toggle (iOS)
  if (view.classList.contains('is-pseudo-fullscreen')) {
    view.classList.remove('is-pseudo-fullscreen');
    document.body.classList.remove('has-pseudo-fullscreen');
    _updateFlowFullscreenBtn(false);
    // Modals zurück zum Body
    view.querySelectorAll(':scope > .modal-overlay, :scope > .toast, :scope > .toast-container').forEach(function(el) {
      try { document.body.appendChild(el); } catch(_) {}
    });
    return;
  }
  if (isFs) {
    if (doc.exitFullscreen) doc.exitFullscreen();
    else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
    else if (doc.msExitFullscreen) doc.msExitFullscreen();
  } else {
    var req = view.requestFullscreen || view.webkitRequestFullscreen || view.msRequestFullscreen;
    if (req) {
      try { req.call(view); } catch(_) {}
    } else {
      // Fallback: CSS-Vollbild für iOS Safari (kein echtes Fullscreen-API)
      view.classList.add('is-pseudo-fullscreen');
      document.body.classList.add('has-pseudo-fullscreen');
      _updateFlowFullscreenBtn(true);
      // Existierende Modals/Toasts in den Pseudo-Fullscreen umhängen
      document.querySelectorAll('body > .modal-overlay, body > .toast, body > .toast-container').forEach(function(el) {
        try { view.appendChild(el); } catch(_) {}
      });
      setTimeout(flowFitToScreen, 80);
      return;
    }
  }
}
function _updateFlowFullscreenBtn(isFs) {
  var icon = document.getElementById('flowFullscreenIcon');
  var btn  = document.getElementById('flowFullscreenBtn');
  if (icon) icon.textContent = isFs ? 'fullscreen_exit' : 'fullscreen';
  if (btn)  btn.title = isFs ? 'Vollbild verlassen' : 'Vollbild';
}
// Fullscreen-API Events → Button-Icon aktualisieren + Fit-to-Screen beim Entern
if (!window._flowFullscreenBound) {
  window._flowFullscreenBound = true;
  // Helper: aktives Fullscreen-Target (Board-Flow-View) ermitteln
  function _flowFsTarget() {
    var view = document.getElementById('boardFlowView');
    var real = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
    if (real === view) return view;
    if (view && view.classList.contains('is-pseudo-fullscreen')) return view;
    return null;
  }
  // MutationObserver: Modals/Toasts/Dropdowns, die an <body> angehängt werden,
  // während das Board im Vollbild ist, in den Fullscreen-Container umhängen,
  // sonst sind sie nicht sichtbar/bedienbar.
  var _flowFsObserver = new MutationObserver(function(muts) {
    var target = _flowFsTarget();
    if (!target) return;
    muts.forEach(function(m) {
      m.addedNodes && m.addedNodes.forEach(function(node) {
        if (node.nodeType !== 1) return;
        if (node.parentNode !== document.body) return;
        if (node === target) return;
        // Alles Overlay-artige umhängen
        if (node.classList && (
          node.classList.contains('modal-overlay') ||
          node.classList.contains('toast') ||
          node.classList.contains('toast-container') ||
          node.classList.contains('dropdown-portal') ||
          node.classList.contains('popup-portal')
        )) {
          try { target.appendChild(node); } catch(_) {}
        }
      });
    });
  });
  _flowFsObserver.observe(document.body, { childList: true });

  var _fsHandler = function() {
    var isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
    _updateFlowFullscreenBtn(isFs);
    if (isFs) {
      // Bereits existierende Modals/Toasts ins Fullscreen-Target umhängen
      var target = _flowFsTarget();
      if (target) {
        document.querySelectorAll('body > .modal-overlay, body > .toast, body > .toast-container').forEach(function(el) {
          try { target.appendChild(el); } catch(_) {}
        });
      }
      setTimeout(flowFitToScreen, 120);
    } else {
      // Beim Verlassen: Modals zurück an den Body, damit normale z-index-Regeln greifen
      var view = document.getElementById('boardFlowView');
      if (view) {
        view.querySelectorAll(':scope > .modal-overlay, :scope > .toast, :scope > .toast-container').forEach(function(el) {
          try { document.body.appendChild(el); } catch(_) {}
        });
      }
    }
  };
  document.addEventListener('fullscreenchange', _fsHandler);
  document.addEventListener('webkitfullscreenchange', _fsHandler);
  // ESC aus Pseudo-Fullscreen (iOS)
  document.addEventListener('keydown', function(e) {
    if (e.key !== 'Escape') return;
    var view = document.getElementById('boardFlowView');
    if (view && view.classList.contains('is-pseudo-fullscreen')) {
      view.classList.remove('is-pseudo-fullscreen');
      document.body.classList.remove('has-pseudo-fullscreen');
      _updateFlowFullscreenBtn(false);
      // Modals zurück ins body
      view.querySelectorAll(':scope > .modal-overlay, :scope > .toast, :scope > .toast-container').forEach(function(el) {
        try { document.body.appendChild(el); } catch(_) {}
      });
    }
  });
}

function _initFlowZoomPan() {
  var canvas = document.getElementById('flowCanvas');
  if (!canvas) return;
  // Prevent double-bind
  if (canvas._zoomInit) return;
  canvas._zoomInit = true;

  // Cleanup previous window listeners from a prior render
  if (_flowPanWinHandlers) {
    window.removeEventListener('mousemove', _flowPanWinHandlers.move);
    window.removeEventListener('mouseup',   _flowPanWinHandlers.up);
    _flowPanWinHandlers = null;
  }

  // Ctrl+wheel = zoom, plain wheel = scroll
  canvas.addEventListener('wheel', function(e) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      var delta = -Math.sign(e.deltaY) * 0.12;
      var rect = canvas.getBoundingClientRect();
      var cx = e.clientX - rect.left + canvas.scrollLeft;
      var cy = e.clientY - rect.top + canvas.scrollTop;
      var oldZ = _flowZoom;
      var newZ = Math.max(_flowMinZoom, Math.min(_flowMaxZoom, oldZ + delta));
      if (newZ === oldZ) return;
      var ratio = newZ / oldZ;
      _flowApplyZoom(newZ);
      canvas.scrollLeft = cx * ratio - (e.clientX - rect.left);
      canvas.scrollTop  = cy * ratio - (e.clientY - rect.top);
    }
  }, { passive: false });

  // Background pan (drag on empty area)
  var panState = null;
  canvas.addEventListener('mousedown', function(e) {
    if (e.button !== 0) return;
    if (e.target.closest('.flow-col, button, a, input, select, textarea')) return;
    panState = {
      sx: e.clientX, sy: e.clientY,
      scrollLeft: canvas.scrollLeft, scrollTop: canvas.scrollTop
    };
    canvas.classList.add('is-panning');
  });
  function panMove(e) {
    if (!panState) return;
    canvas.scrollLeft = panState.scrollLeft - (e.clientX - panState.sx);
    canvas.scrollTop  = panState.scrollTop  - (e.clientY - panState.sy);
  }
  function panUp() {
    if (!panState) return;
    panState = null;
    canvas.classList.remove('is-panning');
  }
  window.addEventListener('mousemove', panMove);
  window.addEventListener('mouseup', panUp);
  _flowPanWinHandlers = { move: panMove, up: panUp };

  // Touch: 1 finger = pan (überall, auch auf Nodes – mit Bewegungs-Schwelle);
  //        2 Finger = Pinch-Zoom
  var touchState = null;
  var TAP_THRESHOLD = 8; // px – darunter = Tap/Klick, darüber = Pan
  canvas.addEventListener('touchstart', function(e) {
    if (e.touches.length === 2) {
      var t1 = e.touches[0], t2 = e.touches[1];
      var dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      touchState = { mode: 'pinch', startDist: dist, startZoom: _flowZoom,
                     cx: (t1.clientX + t2.clientX) / 2, cy: (t1.clientY + t2.clientY) / 2 };
    } else if (e.touches.length === 1) {
      var t = e.touches[0];
      // Interaktive Elemente niemals übersteuern (Buttons, Links, Inputs, Drag-Handles)
      var isInteractive = !!e.target.closest('button, a, input, select, textarea, .flow-drag-handle');
      touchState = {
        mode: isInteractive ? null : 'maybe-pan',
        sx: t.clientX, sy: t.clientY,
        scrollLeft: canvas.scrollLeft, scrollTop: canvas.scrollTop,
        moved: false
      };
    }
  }, { passive: true });
  canvas.addEventListener('touchmove', function(e) {
    if (!touchState) return;
    if (touchState.mode === 'pinch' && e.touches.length === 2) {
      e.preventDefault();
      var t1 = e.touches[0], t2 = e.touches[1];
      var dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      var scale = dist / touchState.startDist;
      var newZ = Math.max(_flowMinZoom, Math.min(_flowMaxZoom, touchState.startZoom * scale));
      var oldZ = _flowZoom;
      var ratio = newZ / oldZ;
      _flowApplyZoom(newZ);
      var rect = canvas.getBoundingClientRect();
      var cx = touchState.cx - rect.left + canvas.scrollLeft;
      var cy = touchState.cy - rect.top + canvas.scrollTop;
      canvas.scrollLeft = cx * ratio - (touchState.cx - rect.left);
      canvas.scrollTop  = cy * ratio - (touchState.cy - rect.top);
    } else if (e.touches.length === 1 && (touchState.mode === 'pan' || touchState.mode === 'maybe-pan')) {
      var tt = e.touches[0];
      var dx = tt.clientX - touchState.sx;
      var dy = tt.clientY - touchState.sy;
      if (touchState.mode === 'maybe-pan') {
        if (Math.abs(dx) > TAP_THRESHOLD || Math.abs(dy) > TAP_THRESHOLD) {
          touchState.mode = 'pan';
          canvas.classList.add('is-panning');
        }
      }
      if (touchState.mode === 'pan') {
        e.preventDefault();
        touchState.moved = true;
        canvas.scrollLeft = touchState.scrollLeft - dx;
        canvas.scrollTop  = touchState.scrollTop  - dy;
      }
    }
  }, { passive: false });
  canvas.addEventListener('touchend', function(e) {
    if (touchState && touchState.moved) {
      // Verhindere, dass nach einem Swipe ein Klick/Tap auf eine Karte auslöst
      var blocker = function(ev) { ev.stopPropagation(); ev.preventDefault(); };
      canvas.addEventListener('click', blocker, { capture: true, once: true });
      setTimeout(function(){ try { canvas.removeEventListener('click', blocker, { capture: true }); } catch(_){} }, 350);
    }
    canvas.classList.remove('is-panning');
    if (e.touches.length === 0) touchState = null;
  });

  // Keyboard shortcuts
  if (!_flowPanInit) {
    _flowPanInit = true;
    document.addEventListener('keydown', function(e) {
      var view = document.getElementById('boardFlowView');
      if (!view || view.style.display === 'none') return;
      if (e.target && ['INPUT','TEXTAREA','SELECT'].indexOf(e.target.tagName) > -1) return;
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) { e.preventDefault(); flowZoom(0.15); }
      else if ((e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); flowZoom(-0.15); }
      else if ((e.ctrlKey || e.metaKey) && e.key === '0') { e.preventDefault(); flowResetView(); }
      else if (e.key === 'f' || e.key === 'F') { flowFitToScreen(); }
    });
  }
}

/* ─── Public / Private Toggle ─────────────────────────── */
function toggleFlowVisibility() {
  if (!_activeBoardId) return;
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;
  project.isPublic = !project.isPublic;
  _saveBoardProjects();
  renderBoardFlow();
  showToast(project.isPublic ? 'Projekt ist jetzt öffentlich teilbar' : 'Projekt ist jetzt privat', project.isPublic ? 'public' : 'lock');
}

function openFlowShareModal() {
  if (!_activeBoardId) return;
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project || !project.isPublic) return;
  var url = window.location.origin + window.location.pathname + '?board=' + encodeURIComponent(project.id);
  var html = '<div class="modal-overlay show" id="flowShareModal" onclick="closeModalOnOverlay(event)" style="z-index:2200">' +
    '<div class="modal modal-sm" onclick="event.stopPropagation()">' +
    '<button class="modal-close" onclick="document.getElementById(\'flowShareModal\').remove()"><span class="material-icons-round">close</span></button>' +
    '<div class="modal-header"><span class="material-icons-round modal-icon">ios_share</span><h2>Projekt teilen</h2><p>Teile diesen Link mit Freunden, Familie oder Dienstleistern</p></div>' +
    '<div class="modal-form">' +
    '<div class="flow-share-row"><input type="text" readonly id="flowShareUrl" value="' + _escHtml(url) + '" onclick="this.select()" />' +
    '<button type="button" class="btn-primary" onclick="_copyFlowShareUrl()"><span class="material-icons-round">content_copy</span></button></div>' +
    '<p style="font-size:12px;color:var(--text-light);margin-top:10px">Dienstleister können über diesen Link ihre Zustimmung bestätigen.</p>' +
    '</div></div></div>';
  document.body.insertAdjacentHTML('beforeend', html);
}
function _copyFlowShareUrl() {
  var inp = document.getElementById('flowShareUrl');
  if (!inp) return;
  inp.select();
  try {
    if (navigator.clipboard) navigator.clipboard.writeText(inp.value);
    else document.execCommand('copy');
    showToast('Link kopiert!', 'content_copy');
  } catch(e) { document.execCommand('copy'); }
}

/* ─── Provider confirmation simulation ────────────────── */
function toggleFlowCardConfirm(cardId) {
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;
  var card = (project.cards || []).find(function(c) { return c.id === cardId; });
  if (!card) return;
  card.confirmedByProvider = !card.confirmedByProvider;
  if (card.confirmedByProvider) {
    // Auto-advance stage when confirmed
    if (card.stage === 'geplant' || card.stage === 'kontaktiert' || card.stage === 'angebot') {
      card.stage = 'bestaetigt';
    }
  }
  _saveBoardProjects();
  var modal = document.getElementById('flowCardModal');
  if (modal) modal.remove();
  renderBoardFlow();
  _updateBoardStats(project);
  showToast(card.confirmedByProvider ? card.name + ' hat zugestimmt!' : 'Bestätigung entfernt', card.confirmedByProvider ? 'verified' : 'undo');
}

// Modals for Board
function openCreateBoardModal() {
  var templates = [
    { id: 'wedding',   emoji: '💍', label: 'Hochzeit',    suggested: ['DJ','Fotograf','Catering','Location','Floristik','Torte'] },
    { id: 'birthday',  emoji: '🎂', label: 'Geburtstag',  suggested: ['DJ','Catering','Dekoration','Fotograf'] },
    { id: 'corporate', emoji: '🏢', label: 'Firmenfeier', suggested: ['Catering','Technik','Location','Fotograf','Moderation'] },
    { id: 'festival',  emoji: '🎪', label: 'Festival',    suggested: ['Bühnentechnik','DJ','Sicherheit','Catering','Toiletten'] },
    { id: 'conference',emoji: '🎤', label: 'Konferenz',   suggested: ['Location','Technik','Catering','Fotograf'] },
    { id: 'baptism',   emoji: '⛪', label: 'Taufe/Feier', suggested: ['Catering','Location','Fotograf','Floristik'] },
    { id: 'kids',      emoji: '🎈', label: 'Kinderfest',  suggested: ['Animation','Catering','Dekoration'] },
    { id: 'private',   emoji: '🏡', label: 'Privatfeier', suggested: ['Catering','DJ','Dekoration'] },
    { id: 'custom',    emoji: '✨', label: 'Eigenes',     suggested: [] }
  ];
  var tmplHtml = templates.map(function(t, i) {
    return '<div class="tmpl-card' + (i===0?' is-selected':'') + '" data-tmpl="' + t.id + '" onclick="_selectBoardTmpl(this)">' +
      '<span class="tmpl-emoji">' + t.emoji + '</span><span class="tmpl-label">' + t.label + '</span></div>';
  }).join('');
  window._boardTemplates = templates;

  var html = `<div class="modal-overlay show" id="createBoardModal" onclick="closeModalOnOverlay(event)" style="z-index:2000">
    <div class="modal modal-sm" onclick="event.stopPropagation()">
      <button class="modal-close" onclick="document.getElementById('createBoardModal').remove()"><span class="material-icons-round">close</span></button>
      <div class="modal-header">
        <span class="material-icons-round modal-icon">view_kanban</span>
        <h2>Neues Event-Projekt</h2>
        <p>Wähle einen Event-Typ und starte direkt mit passenden Kategorien</p>
      </div>
      <form class="modal-form" onsubmit="_createBoardProject(event)">
        <div class="form-group">
          <label>Event-Typ</label>
          <div class="tmpl-grid">${tmplHtml}</div>
          <input type="hidden" id="newBoardTmpl" value="wedding" />
        </div>
        <div class="form-group">
          <label>Event-Name</label>
          <input type="text" id="newBoardName" placeholder="z.B. Hochzeit Julia & Mark" required autofocus />
        </div>
        <div class="form-group">
          <label>Event-Datum</label>
          <input type="text" id="newBoardDate" placeholder="z.B. 15. August 2026" />
        </div>
        <div class="form-group">
          <label>Budget (€, optional)</label>
          <input type="number" id="newBoardBudget" placeholder="z.B. 5000" min="0" step="100" />
        </div>
        <div class="form-group" style="display:flex;align-items:center;gap:10px;background:var(--bg-alt);padding:10px 12px;border-radius:10px">
          <span class="material-icons-round" style="color:var(--text-light)">public</span>
          <label for="newBoardPublic" style="margin:0;flex:1;font-size:13px;cursor:pointer">Öffentlich teilbar (Dienstleister können bestätigen)</label>
          <input type="checkbox" id="newBoardPublic" style="width:18px;height:18px;cursor:pointer" />
        </div>
        <button type="submit" class="btn-primary btn-block"><span class="material-icons-round">add</span> Projekt erstellen</button>
      </form>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

function _selectBoardTmpl(el) {
  document.querySelectorAll('#createBoardModal .tmpl-card').forEach(function(c){ c.classList.remove('is-selected'); });
  el.classList.add('is-selected');
  var id = el.dataset.tmpl;
  document.getElementById('newBoardTmpl').value = id;
  // Auto-fill name placeholder
  var nameInp = document.getElementById('newBoardName');
  var tmpl = (window._boardTemplates || []).find(function(t){ return t.id === id; });
  if (nameInp && tmpl && id !== 'custom') {
    nameInp.placeholder = 'z.B. ' + tmpl.label + ' 2026';
  }
}

function _createBoardProject(event) {
  event.preventDefault();
  var name = document.getElementById('newBoardName').value.trim();
  var date = document.getElementById('newBoardDate').value.trim();
  var budget = document.getElementById('newBoardBudget').value.trim();
  var tmplId = (document.getElementById('newBoardTmpl') || {}).value || 'custom';
  var isPublic = !!(document.getElementById('newBoardPublic') && document.getElementById('newBoardPublic').checked);
  if (!name) return;
  var tmpl = (window._boardTemplates || []).find(function(t){ return t.id === tmplId; });
  var cards = [];
  var project = {
    id: 'bp_' + Date.now(),
    name: name,
    date: date || '',
    budget: parseFloat(budget) || 0,
    template: tmplId,
    isPublic: isPublic,
    cards: cards,
    createdAt: new Date().toISOString(),
    updatedAt: Date.now()
  };
  _boardProjects.unshift(project);
  _saveBoardProjects({ immediate: true });
  document.getElementById('createBoardModal') && document.getElementById('createBoardModal').remove();
  openBoardProject(project.id);
  showToast('Event-Projekt "' + name + '" wurde erstellt!', 'check_circle');
}

function openAddProviderModal(defaultStage) {
  defaultStage = defaultStage || 'geplant';
  var _listings = (LISTINGS || []).slice(0, 30);
  var listingCardsHtml = _listings.map(function(l) {
    var img = l.image || l.providerImg || '';
    var price = l.priceLabel || (l.price ? ('ab ' + l.price + ' €') : '');
    return '<button type="button" class="eb-lpick-card" data-id="' + l.id +
      '" data-name="' + _escHtml(l.providerName || l.title || '') + '"' +
      ' data-category="' + _escHtml(l.categoryLabel || l.category || '') + '"' +
      ' data-price="' + (l.price || '') + '"' +
      ' data-avatar="' + _escHtml(img) + '"' +
      ' data-image="' + _escHtml(l.image || img) + '"' +
      ' data-title="' + _escHtml(l.title || '') + '"' +
      ' onclick="_selectListingCard(this)">' +
      '<span class="eb-lpick-thumb" style="background-image:url(\'' + _escHtml(img) + '\')"></span>' +
      '<span class="eb-lpick-body">' +
        '<span class="eb-lpick-title">' + _escHtml(l.title || '') + '</span>' +
        '<span class="eb-lpick-meta">' +
          '<span class="eb-lpick-cat">' + _escHtml(l.categoryLabel || l.category || '') + '</span>' +
          (price ? '<span class="eb-lpick-price">' + _escHtml(price) + '</span>' : '') +
        '</span>' +
      '</span>' +
      '<span class="eb-lpick-check material-icons-round">check_circle</span>' +
    '</button>';
  }).join('');

  var html = `<div class="modal-overlay show" id="addProviderModal" onclick="closeModalOnOverlay(event)" style="z-index:2000">
    <div class="modal" onclick="event.stopPropagation()">
      <button class="modal-close" onclick="document.getElementById('addProviderModal').remove()"><span class="material-icons-round">close</span></button>
      <div class="modal-header">
        <span class="material-icons-round modal-icon">person_add</span>
        <h2>Dienstleister hinzufügen</h2>
        <p>Aus bestehenden Inseraten wählen oder manuell eingeben</p>
      </div>
      <form class="modal-form" onsubmit="_addProviderCard(event,'${defaultStage}')">
        <div class="form-group">
          <label>Aus Inseraten wählen <span style="font-weight:400;color:var(--text-light);font-size:12px">(optional)</span></label>
          <div class="eb-lpick-search">
            <span class="material-icons-round">search</span>
            <input type="text" id="lpickSearch" placeholder="Nach Name, Kategorie oder Ort suchen…" oninput="_filterListingPicker(this.value)" />
            <button type="button" class="eb-lpick-clear" onclick="_clearListingPick()" title="Auswahl löschen"><span class="material-icons-round">close</span></button>
          </div>
          <div class="eb-lpick-grid" id="lpickGrid">
            ${listingCardsHtml}
          </div>
          <input type="hidden" id="cardListingId" value="" />
          <input type="hidden" id="cardListingImage" value="" />
          <input type="hidden" id="cardListingTitle" value="" />
        </div>
        <div class="form-group">
          <label>Name / Firma</label>
          <input type="text" id="cardName" placeholder="DJ Max, Catering König, ..." required />
        </div>
        <div class="form-group">
          <label>Kategorie</label>
          <input type="text" id="cardCategory" placeholder="DJ, Catering, Fotografie, ..." />
        </div>
        <div class="form-group">
          <label>Preis (€)</label>
          <input type="number" id="cardPrice" placeholder="0" min="0" step="1" />
        </div>
        <div class="form-group">
          <label>Uhrzeit am Eventtag</label>
          <div id="cardTimePickerHost">${window._buildTimePicker('cardStartTime','cardEndTime','10:00','')}</div>
        </div>
        <div class="form-group">
          <label>Notiz</label>
          <textarea id="cardNote" rows="2" placeholder="Bespreche noch einen Rabatt, Technik muss vorher aufgebaut sein, ..."></textarea>
        </div>
        <button type="submit" class="btn-primary btn-block">
          <span class="material-icons-round">add</span> Zum Board hinzufügen
        </button>
      </form>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

window._selectListingCard = function(btn) {
  var grid = btn.parentElement;
  var wasActive = btn.classList.contains('is-active');
  if (grid) grid.querySelectorAll('.eb-lpick-card').forEach(function(b){ b.classList.remove('is-active'); });
  if (wasActive) {
    _clearListingPick();
    return;
  }
  btn.classList.add('is-active');
  var hid = document.getElementById('cardListingId');
  if (hid) hid.value = btn.dataset.id || '';
  var nameEl = document.getElementById('cardName');
  var catEl = document.getElementById('cardCategory');
  var priceEl = document.getElementById('cardPrice');
  if (nameEl) { nameEl.value = btn.dataset.name || ''; nameEl.dispatchEvent(new Event('input')); }
  if (catEl) { catEl.value = btn.dataset.category || ''; catEl.dispatchEvent(new Event('input')); }
  if (priceEl && btn.dataset.price) { priceEl.value = btn.dataset.price; priceEl.dispatchEvent(new Event('input')); }
  var imgHid = document.getElementById('cardListingImage'); if (imgHid) imgHid.value = btn.dataset.image || '';
  var titleHid = document.getElementById('cardListingTitle'); if (titleHid) titleHid.value = btn.dataset.title || '';
  // Scroll to filled fields
  if (nameEl) nameEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

window._clearListingPick = function() {
  var grid = document.getElementById('lpickGrid');
  if (grid) grid.querySelectorAll('.eb-lpick-card.is-active').forEach(function(b){ b.classList.remove('is-active'); });
  var hid = document.getElementById('cardListingId'); if (hid) hid.value = '';
  var imgHid2 = document.getElementById('cardListingImage'); if (imgHid2) imgHid2.value = '';
  var titleHid2 = document.getElementById('cardListingTitle'); if (titleHid2) titleHid2.value = '';
  var search = document.getElementById('lpickSearch'); if (search) { search.value = ''; _filterListingPicker(''); }
};

window._filterListingPicker = function(q) {
  q = (q || '').toLowerCase().trim();
  var grid = document.getElementById('lpickGrid');
  if (!grid) return;
  grid.querySelectorAll('.eb-lpick-card').forEach(function(b){
    var text = (b.textContent || '').toLowerCase();
    b.style.display = (!q || text.indexOf(q) !== -1) ? '' : 'none';
  });
};

function _autoFillProviderFromListing(select) {
  var opt = select.options[select.selectedIndex];
  if (!opt.value) return;
  var nameEl = document.getElementById('cardName');
  var catEl = document.getElementById('cardCategory');
  var priceEl = document.getElementById('cardPrice');
  if (nameEl) nameEl.value = opt.dataset.name || '';
  if (catEl) catEl.value = opt.dataset.category || '';
  if (priceEl && opt.dataset.price) {
    priceEl.value = parseFloat(String(opt.dataset.price).replace(/[^\d.,]/g,'').replace(',','.')) || '';
  }
}

function _addProviderCard(event, stage) {
  event.preventDefault();
  if (!_activeBoardId) return;
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;

  var listingId = document.getElementById('cardListingId') ? parseInt(document.getElementById('cardListingId').value) || null : null;
  var name = document.getElementById('cardName').value.trim();
  var category = document.getElementById('cardCategory').value.trim();
  var price = parseFloat(document.getElementById('cardPrice').value) || 0;
  var note = document.getElementById('cardNote').value.trim();
  var startTime = document.getElementById('cardStartTime').value || '';
  var endTime = (document.getElementById('cardEndTime') || {}).value || '';

  var listing = listingId ? (LISTINGS || []).find(function(l) { return l.id === listingId; }) : null;
  var avatar = listing ? (listing.providerImg || listing.providerAvatar || null) : null;
  var listingImage = (document.getElementById('cardListingImage') || {}).value || (listing ? (listing.image || '') : '');
  var listingTitle = (document.getElementById('cardListingTitle') || {}).value || (listing ? (listing.title || '') : '');

  var card = {
    id: 'card_' + Date.now(),
    name: name,
    category: category,
    price: price,
    note: note,
    startTime: startTime,
    endTime: endTime,
    stage: stage,
    listingId: listingId,
    avatar: avatar,
    listingImage: listingImage || '',
    listingTitle: listingTitle || '',
    createdAt: new Date().toISOString()
  };

  if (!project.cards) project.cards = [];
  project.cards.push(card);
  _saveBoardProjects();
  document.getElementById('addProviderModal') && document.getElementById('addProviderModal').remove();
  renderKanban(project);
  _updateBoardStats(project);
  if (document.getElementById('boardFlowView') && document.getElementById('boardFlowView').style.display !== 'none') {
    renderBoardFlow();
  }
  showToast(name + ' wurde zum Board hinzugefügt!', 'check_circle');
}

function deleteBoardCard(cardId) {
  if (!_activeBoardId) return;
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;
  project.cards = (project.cards || []).filter(function(c) { return c.id !== cardId; });
  _saveBoardProjects();
  renderKanban(project);
  _updateBoardStats(project);
}

function editBoardCard(cardId) {
  if (!_activeBoardId) return;
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;
  var card = (project.cards || []).find(function(c) { return c.id === cardId; });
  if (!card) return;

  var html = `<div class="modal-overlay show" id="editCardModal" onclick="closeModalOnOverlay(event)" style="z-index:2000">
    <div class="modal modal-sm" onclick="event.stopPropagation()">
      <button class="modal-close" onclick="document.getElementById('editCardModal').remove()"><span class="material-icons-round">close</span></button>
      <div class="modal-header"><span class="material-icons-round modal-icon">edit</span><h2>Karte bearbeiten</h2></div>
      <form class="modal-form" onsubmit="_saveCardEdit(event,'${cardId}')">
        <div class="form-group"><label>Name</label><input type="text" id="editCardName" value="${_escHtml(card.name)}" required /></div>
        <div class="form-group"><label>Kategorie</label><input type="text" id="editCardCategory" value="${_escHtml(card.category || '')}" /></div>
        <div class="form-group"><label>Preis (€)</label><input type="number" id="editCardPrice" value="${card.price || ''}" min="0" step="1" /></div>
        <div class="form-group"><label>Uhrzeit</label><div id="editCardTimeHost"></div></div>
        <div class="form-group"><label>Notiz</label><textarea id="editCardNote" rows="2">${_escHtml(card.note || '')}</textarea></div>
        <button type="submit" class="btn-primary btn-block"><span class="material-icons-round">save</span> Speichern</button>
      </form>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  var ecHost = document.getElementById('editCardTimeHost');
  if (ecHost) ecHost.innerHTML = window._buildTimePicker('editCardTime','editCardTimeEnd', card.startTime || '10:00', card.endTime || '');
}

function _saveCardEdit(event, cardId) {
  event.preventDefault();
  if (!_activeBoardId) return;
  var project = _boardProjects.find(function(p) { return p.id === _activeBoardId; });
  if (!project) return;
  var card = (project.cards || []).find(function(c) { return c.id === cardId; });
  if (!card) return;
  card.name = document.getElementById('editCardName').value.trim();
  card.category = document.getElementById('editCardCategory').value.trim();
  card.price = parseFloat(document.getElementById('editCardPrice').value) || 0;
  card.startTime = document.getElementById('editCardTime').value || '';
  card.endTime = (document.getElementById('editCardTimeEnd') || {}).value || '';
  card.note = document.getElementById('editCardNote').value.trim();
  _saveBoardProjects();
  document.getElementById('editCardModal') && document.getElementById('editCardModal').remove();
  renderKanban(project);
  _updateBoardStats(project);
  if (document.getElementById('boardFlowView') && document.getElementById('boardFlowView').style.display !== 'none') {
    renderBoardFlow();
  }
  showToast('Gespeichert!', 'check_circle');
}


// =========================================================
// =================== SOCIAL FEED ENHANCED ================
// =========================================================

var _socialPosts = (function() {
  var stored = JSON.parse(localStorage.getItem('eb_social_posts') || 'null');
  // Regenerate if old format (no suche- types)
  if (stored && stored.length && !stored.some(function(p) { return (p.type || '').indexOf('suche') === 0; })) {
    stored = null;
    localStorage.removeItem('eb_social_posts');
  }
  return stored || _generateDemoSocialPosts();
})();
var _likedPosts = new Set(JSON.parse(localStorage.getItem('eb_liked_posts') || '[]'));

function _saveSocialData() {
  localStorage.setItem('eb_social_posts', JSON.stringify(_socialPosts));
  localStorage.setItem('eb_liked_posts', JSON.stringify([..._likedPosts]));
}

function _generateDemoSocialPosts() {
  return [
    {
      id: 'sp1',
      type: 'suche-dienstleister',
      author: 'Julia & Mark',
      authorId: 1001,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=julia',
      title: 'DJ für Hochzeit gesucht',
      category: 'DJ',
      location: 'Schloss Rheinsberg',
      date: '15. August 2026',
      budget: 'bis 800€',
      content: 'Wir suchen einen erfahrenen DJ für unsere Hochzeit! Circa 120 Gäste, Mix aus Charts, 80er und ein bisschen Techno zum Schluss. Eigene Anlage sollte vorhanden sein. #Hochzeit #DJ #Berlin',
      image: null,
      time: new Date(Date.now() - 1800000).toISOString(),
      likes: 12,
      comments: 5,
      metAt: null
    },
    {
      id: 'sp2',
      type: 'suche-events',
      author: 'DJ Max Beat',
      authorId: 1002,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=djmax',
      title: 'Erfahrener DJ sucht Aufträge in Hamburg',
      category: 'DJ',
      location: 'Hamburg & Umgebung',
      date: 'Flexibel',
      budget: 'ab 400€',
      content: 'Professioneller Event-DJ mit 8 Jahren Erfahrung sucht neue Aufträge! Hochzeiten, Firmenevents, Geburtstage. Eigene PA-Anlage & Lichtshow. #DJLife #EventDJ #Hamburg',
      image: 'https://images.pexels.com/photos/32589034/pexels-photo-32589034.jpeg?auto=compress&cs=tinysrgb&w=600',
      time: new Date(Date.now() - 7200000).toISOString(),
      likes: 83,
      comments: 7,
      metAt: null
    },
    {
      id: 'sp3',
      type: 'met',
      author: 'Sophia K.',
      authorId: 1003,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sophia',
      content: 'Durch die Firmenfeier mit Top Catering wirklich tolle Menschen kennengelernt. Das Essen war phantastisch! #Catering #Firmenevent',
      image: 'https://images.pexels.com/photos/2291367/pexels-photo-2291367.jpeg?auto=compress&cs=tinysrgb&w=600',
      time: new Date(Date.now() - 86400000).toISOString(),
      likes: 31,
      comments: 4,
      metAt: { eventName: 'Sommerfest Tech GmbH', date: '2026-06-20' }
    },
    {
      id: 'sp4',
      type: 'suche-dienstleister',
      author: 'Anna Berger',
      authorId: 1004,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=anna',
      title: 'Fotograf für Firmen-Sommerfest',
      category: 'Fotograf',
      location: 'München',
      date: '20. Juli 2026',
      budget: 'Verhandlungsbasis',
      content: 'Wir suchen einen Fotografen für unser Firmen-Sommerfest (ca. 200 Mitarbeiter). Mindestens 4 Stunden, am besten mit Erfahrung bei Firmenevents. Gerne Portfolio mitschicken! #Fotografie #Firmenevent #München',
      image: null,
      time: new Date(Date.now() - 172800000).toISOString(),
      likes: 24,
      comments: 9,
      metAt: null
    },
    {
      id: 'sp5',
      type: 'ankuendigung',
      author: 'BlumenZauber GmbH',
      authorId: 1005,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=blumen',
      content: 'Neue Kollektion Frühjahr/Sommer! Exklusive Tischdekoration und Brautsträuße für euren unvergesslichen Tag. Jetzt anfragen! #Floristik #Hochzeit #Dekoration',
      image: 'https://images.pexels.com/photos/1045541/pexels-photo-1045541.jpeg?auto=compress&cs=tinysrgb&w=600',
      time: new Date(Date.now() - 259200000).toISOString(),
      likes: 56,
      comments: 8,
      metAt: null
    },
    {
      id: 'sp6',
      type: 'suche-events',
      author: 'Catering Deluxe',
      authorId: 1006,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=catering',
      title: 'Catering-Service sucht Sommer-Events',
      category: 'Catering',
      location: 'NRW & Umgebung',
      date: 'Juni–September 2026',
      budget: 'ab 25€ p.P.',
      content: 'Wir haben noch freie Kapazitäten für Sommer-Events! Buffets, Flying Dinner, BBQ – alles möglich. Bio & regional. Gerne auch größere Events ab 50 Personen. #Catering #Sommer #Events',
      image: null,
      time: new Date(Date.now() - 345600000).toISOString(),
      likes: 38,
      comments: 11,
      metAt: null
    }
  ];
}

function renderFeed(tab) {
  var list = document.getElementById('feedList');
  if (!list) return;

  renderSidebarUpcoming();

  if (tab === 'events') {
    var eventPosts = _socialPosts.filter(function(p) { return p.type === 'event' || p.type === 'ankuendigung'; });
    list.innerHTML = eventPosts.length ? eventPosts.map(function(p) { return renderSocialPostCard(p); }).join('') :
      '<div style="text-align:center;padding:40px;color:var(--text-light)">Noch keine Events oder Ankündigungen</div>';
    return;
  }

  if (tab === 'gesuche') {
    var searchPosts = _socialPosts.filter(function(p) { return p.type === 'suche-dienstleister' || p.type === 'suche-events'; });
    list.innerHTML = searchPosts.length ? searchPosts.map(function(p) { return renderSocialPostCard(p); }).join('') :
      '<div style="text-align:center;padding:40px;color:var(--text-light)">Noch keine Gesuche – erstelle das erste!</div>';
    return;
  }

  // For foryou/newest/popular: mix social posts + listing cards
  var seen = new Set();
  var listings = getHeroListings().filter(function(l) {
    if (seen.has(l.id)) return false;
    seen.add(l.id);
    return true;
  });

  if (tab === 'newest') {
    listings = listings.sort(function(a, b) { return b.id - a.id; });
    var allItems = _socialPosts.slice(0, 2).map(function(p) { return { _social: true, post: p }; })
      .concat(listings.slice(0, 8).map(function(l) { return { _listing: true, listing: l }; }));
    list.innerHTML = allItems.map(function(item) {
      return item._social ? renderSocialPostCard(item.post) : renderListingFeedCard(item.listing);
    }).join('');
  } else if (tab === 'popular') {
    listings = listings.sort(function(a, b) { return (b.rating || 0) - (a.rating || 0); });
    var popPosts = _socialPosts.sort(function(a, b) { return (b.likes || 0) - (a.likes || 0); });
    var allItems2 = [];
    var li = 0, pi = 0;
    while (li < Math.min(listings.length, 8) || pi < popPosts.length) {
      if (pi < popPosts.length && (li % 3 === 0)) { allItems2.push({ _social: true, post: popPosts[pi++] }); }
      else if (li < listings.length) { allItems2.push({ _listing: true, listing: listings[li++] }); }
      else if (pi < popPosts.length) { allItems2.push({ _social: true, post: popPosts[pi++] }); }
      else break;
    }
    list.innerHTML = allItems2.map(function(item) {
      return item._social ? renderSocialPostCard(item.post) : renderListingFeedCard(item.listing);
    }).join('');
  } else {
    // foryou — interleaved
    var shuffled = listings.slice().sort(function() { return Math.random() - 0.5; });
    var mixed = [];
    var sIdx = 0;
    shuffled.slice(0, 8).forEach(function(l, i) {
      if (i > 0 && i % 2 === 0 && sIdx < _socialPosts.length) {
        mixed.push(renderSocialPostCard(_socialPosts[sIdx++]));
      }
      mixed.push(renderListingFeedCard(l));
    });
    while (sIdx < _socialPosts.length) {
      mixed.push(renderSocialPostCard(_socialPosts[sIdx++]));
    }
    list.innerHTML = mixed.join('');
  }
}

function renderSocialPostCard(post) {
  var isLiked = _likedPosts.has(post.id);
  var typeBadge = '';
  var isSearch = (post.type === 'suche-dienstleister' || post.type === 'suche-events');

  if (post.type === 'suche-dienstleister') {
    typeBadge = '<span class="search-badge"><span class="material-icons-round">person_search</span>Sucht Dienstleister</span>';
  } else if (post.type === 'suche-events') {
    typeBadge = '<span class="search-badge search-badge-offer"><span class="material-icons-round">event_available</span>Sucht Events</span>';
  } else if (post.type === 'event') {
    typeBadge = '<span class="event-badge"><span class="material-icons-round">celebration</span>Event</span>';
  } else if (post.type === 'met') {
    typeBadge = '<span class="met-badge"><span class="material-icons-round">people</span>Verbindung</span>';
  } else if (post.type === 'ankuendigung') {
    typeBadge = '<span class="service-badge"><span class="material-icons-round">campaign</span>Ankündigung</span>';
  } else {
    typeBadge = '<span class="service-badge"><span class="material-icons-round">storefront</span>Service</span>';
  }

  var content = _escHtml(post.content || '');
  content = content.replace(/(#\w+)/g, '<span class="feed-hashtag">$1</span>');

  // Build search inserat details chips
  var searchInfo = '';
  if (isSearch && (post.title || post.category || post.location || post.date || post.budget)) {
    searchInfo = '<div class="feed-search-info">';
    if (post.title) {
      searchInfo += '<div class="feed-search-title"><span class="material-icons-round">' +
        (post.type === 'suche-dienstleister' ? 'person_search' : 'event_available') +
        '</span> ' + _escHtml(post.title) + '</div>';
    }
    var chips = '';
    if (post.category) chips += '<span class="feed-chip"><span class="material-icons-round">category</span>' + _escHtml(post.category) + '</span>';
    if (post.location) chips += '<span class="feed-chip"><span class="material-icons-round">location_on</span>' + _escHtml(post.location) + '</span>';
    if (post.date) chips += '<span class="feed-chip"><span class="material-icons-round">event</span>' + _escHtml(post.dateDisplay || post.date) + '</span>';
    if (post.budget) chips += '<span class="feed-chip"><span class="material-icons-round">payments</span>' + _escHtml(post.budget) + '</span>';
    if (chips) searchInfo += '<div class="feed-chips">' + chips + '</div>';
    searchInfo += '</div>';
  }

  // Legacy event info
  var eventInfo = '';
  if (post.type === 'event' && post.eventName) {
    eventInfo = '<div class="feed-event-info">' +
      '<span class="material-icons-round">celebration</span>' +
      '<span><strong>' + _escHtml(post.eventName) + '</strong>' + (post.eventDate ? ' · ' + _escHtml(post.eventDate) : '') + (post.eventLocation ? ' · ' + _escHtml(post.eventLocation) : '') + '</span>' +
      '</div>';
  }

  var metBanner = '';
  if (post.metAt) {
    metBanner = '<div class="met-at-banner"><span class="material-icons-round">people</span>' +
      'Kennengelernt bei <strong>' + _escHtml(post.metAt.eventName) + '</strong>' +
      (post.metAt.date ? ' am ' + _escHtml(post.metAt.date) : '') +
      '</div>';
  }

  var imgBlock = post.image ? '<img class="feed-post-image" src="' + _escHtml(post.image) + '" alt="Post Bild" loading="lazy" />' : '';

  // Contact button for search posts — only visible to Dienstleister
  var isProvider = currentUser && currentUser.role === 'Dienstleister';
  var contactBtn = (isSearch && isProvider) ? '<button class="feed-contact-btn" onclick="showToast(\'Kontakt-Anfrage gesendet!\',\'check_circle\')"><span class="material-icons-round">mail_outline</span> Angebot stellen</button>' : '';

  return '<div class="feed-post-card' + (isSearch && !post.image ? ' feed-search-card' : '') + '">' +
    '<div class="feed-post-header">' +
      '<img class="feed-post-avatar" src="' + _escHtml(post.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user') + '" alt="' + _escHtml(post.author) + '" onerror="this.src=\'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback\'" />' +
      '<div class="feed-post-author">' +
        '<strong>' + _escHtml(post.author) + '</strong>' +
        '<div class="feed-post-meta">' + typeBadge + ' <span>' + timeAgo(post.time) + '</span></div>' +
      '</div>' +
      '<button class="feed-more-btn"><span class="material-icons-round">more_horiz</span></button>' +
    '</div>' +
    imgBlock +
    searchInfo +
    eventInfo +
    '<div class="feed-post-content">' + content + '</div>' +
    metBanner +
    '<div class="feed-action-bar">' +
      '<div class="feed-actions">' +
        '<button class="feed-action-btn' + (isLiked ? ' liked' : '') + '" onclick="togglePostLike(this,\'' + post.id + '\')">' +
          '<span class="material-icons-round">' + (isLiked ? 'favorite' : 'favorite_border') + '</span> ' +
          '<span class="like-count">' + (post.likes || 0) + '</span>' +
        '</button>' +
        '<button class="feed-action-btn" onclick="openPostComments(\'' + post.id + '\')">' +
          '<span class="material-icons-round">chat_bubble_outline</span> ' + (post.comments || 0) +
        '</button>' +
      '</div>' +
      contactBtn +
      '<button class="feed-share-btn" onclick="sharePost(\'' + post.id + '\')">' +
        '<span class="material-icons-round">share</span> Teilen' +
      '</button>' +
    '</div>' +
  '</div>';
}

function renderListingFeedCard(l) {
  var avatar = l.providerImg || l.providerAvatar || ('https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(l.providerName));
  var isFav = favorites.has(l.id);
  return '<div class="feed-post-card">' +
    '<div class="feed-post-header">' +
      '<img class="feed-post-avatar" src="' + _escHtml(avatar) + '" alt="' + _escHtml(l.providerName) + '" onerror="this.src=\'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback\'" onclick="navigateTo(\'provider\',' + (l.providerId || l.id) + ')" />' +
      '<div class="feed-post-author">' +
        '<strong onclick="navigateTo(\'provider\',' + (l.providerId || l.id) + ')">' + _escHtml(l.providerName) + '</strong>' +
        '<div class="feed-post-meta"><span class="service-badge"><span class="material-icons-round">storefront</span>' + _escHtml(l.categoryLabel || 'Service') + '</span> <span>' + timeAgo(l.createdAt) + '</span></div>' +
      '</div>' +
      '<button class="feed-more-btn"><span class="material-icons-round">more_horiz</span></button>' +
    '</div>' +
    '<img class="feed-post-image" src="' + _escHtml(l.image) + '" alt="' + _escHtml(l.title) + '" loading="lazy" onclick="navigateTo(\'detail\',' + l.id + ')" />' +
    '<div class="feed-post-content">' + _escHtml(l.title) + (l.location ? '<br><small style="color:var(--text-light)"><span class=\"material-icons-round\" style=\"font-size:12px;vertical-align:middle\">location_on</span>' + _escHtml(l.location) + '</small>' : '') + '</div>' +
    '<div class="feed-action-bar">' +
      '<div class="feed-actions">' +
        '<button class="feed-action-btn' + (isFav ? ' liked' : '') + '" onclick="toggleFeedFav(this,' + l.id + ')">' +
          '<span class="material-icons-round">' + (isFav ? 'favorite' : 'favorite_border') + '</span>' +
        '</button>' +
        '<button class="feed-action-btn" onclick="navigateTo(\'detail\',' + l.id + ')">' +
          '<span class="material-icons-round">open_in_new</span> Ansehen' +
        '</button>' +
      '</div>' +
      '<span style="font-size:14px;font-weight:700;color:var(--primary)">' + _escHtml(l.priceLabel || '') + '</span>' +
    '</div>' +
  '</div>';
}

function togglePostLike(btn, postId) {
  var post = _socialPosts.find(function(p) { return p.id === postId; });
  if (!post) return;
  if (_likedPosts.has(postId)) {
    _likedPosts.delete(postId);
    post.likes = Math.max(0, (post.likes || 1) - 1);
    btn.classList.remove('liked');
    btn.querySelector('.material-icons-round').textContent = 'favorite_border';
  } else {
    _likedPosts.add(postId);
    post.likes = (post.likes || 0) + 1;
    btn.classList.add('liked');
    btn.querySelector('.material-icons-round').textContent = 'favorite';
  }
  var countEl = btn.querySelector('.like-count');
  if (countEl) countEl.textContent = post.likes;
  _saveSocialData();
}

function openPostComments(postId) {
  showToast('Kommentare kommen bald!', 'chat_bubble_outline');
}

function sharePost(postId) {
  if (navigator.share) {
    navigator.share({ title: 'Eventbörse Post', url: window.location.href })
      .catch(function() {});
  } else {
    try { navigator.clipboard.writeText(window.location.href); } catch(e) {}
    showToast('Link kopiert!', 'link');
  }
}

function switchFeedTab(btn) {
  document.querySelectorAll('.feed-tab').forEach(function(t) { t.classList.remove('active'); });
  btn.classList.add('active');
  renderFeed(btn.dataset.feed);
}

function renderSidebarUpcoming() {
  var el = document.getElementById('sidebarUpcoming');
  if (!el) return;
  var upcoming = [
    { emoji: '🎸', name: 'Rock Festival Berlin', date: '12. Sep 2026' },
    { emoji: '💒', name: 'Hochzeitsmesse Köln', date: '20. Sep 2026' },
    { emoji: '🎉', name: 'Oktoberfest Opening', date: '19. Okt 2026' },
  ];
  el.innerHTML = upcoming.map(function(u) {
    return '<div class="sidebar-event-item">' +
      '<div class="sidebar-event-dot">' + u.emoji + '</div>' +
      '<div><strong>' + _escHtml(u.name) + '</strong><span>' + _escHtml(u.date) + '</span></div>' +
    '</div>';
  }).join('');
}

function openCreatePostModal() {
  if (!isLoggedIn) { openModal('loginModal'); return; }
  var html = `<div class="modal-overlay show" id="createPostModal" onclick="closeModalOnOverlay(event)" style="z-index:2000">
    <div class="modal modal-lg" onclick="event.stopPropagation()">
      <button class="modal-close" onclick="document.getElementById('createPostModal').remove()"><span class="material-icons-round">close</span></button>
      <div class="modal-header">
        <span class="material-icons-round modal-icon">campaign</span>
        <h2>Inserat erstellen</h2>
        <p>Finde Dienstleister, Events oder teile dein Erlebnis</p>
      </div>
      <form class="modal-form" onsubmit="_createSocialPost(event)">

        <!-- Typ-Auswahl als Kacheln -->
        <div class="post-type-grid" id="postTypeGrid">
          <button type="button" class="post-type-tile active" data-type="suche-dienstleister" onclick="_selectPostType(this)">
            <span class="material-icons-round">person_search</span>
            <strong>Dienstleister gesucht</strong>
            <small>Du planst ein Event</small>
          </button>
          <button type="button" class="post-type-tile" data-type="suche-events" onclick="_selectPostType(this)">
            <span class="material-icons-round">event_available</span>
            <strong>Events gesucht</strong>
            <small>Du bietest einen Service</small>
          </button>
          <button type="button" class="post-type-tile" data-type="ankuendigung" onclick="_selectPostType(this)">
            <span class="material-icons-round">campaign</span>
            <strong>Ankündigung</strong>
            <small>News, Angebote, Updates</small>
          </button>
          <button type="button" class="post-type-tile" data-type="met" onclick="_selectPostType(this)">
            <span class="material-icons-round">people</span>
            <strong>Verbindung</strong>
            <small>Kennengelernt bei Event</small>
          </button>
        </div>
        <input type="hidden" id="postType" value="suche-dienstleister" />

        <!-- Suchinserat-Felder (Dienstleister / Events gesucht) -->
        <div id="postSearchFields">
          <div class="form-row">
            <div class="form-group form-half">
              <label>Titel</label>
              <input type="text" id="postTitle" placeholder="z.B. DJ für Hochzeit gesucht" />
            </div>
            <div class="form-group form-half">
              <label>Kategorie</label>
              <select id="postCategory">
                <option value="">Auswählen…</option>
                <option value="DJ">DJ</option>
                <option value="Fotograf">Fotograf</option>
                <option value="Videograf">Videograf</option>
                <option value="Catering">Catering</option>
                <option value="Floristik">Floristik</option>
                <option value="Location">Location</option>
                <option value="Band / Musik">Band / Musik</option>
                <option value="Moderation">Moderation</option>
                <option value="Dekoration">Dekoration</option>
                <option value="Planung">Planung / Koordination</option>
                <option value="Sonstiges">Sonstiges</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group form-half">
              <label><span class="material-icons-round" style="font-size:16px;vertical-align:-3px;margin-right:4px">location_on</span>Ort</label>
              <div class="city-autocomplete-wrap">
                <input type="text" id="postLocation" placeholder="Stadt eingeben…" autocomplete="off" />
                <ul class="city-autocomplete-list" id="postCityList"></ul>
              </div>
            </div>
            <div class="form-group form-half">
              <label><span class="material-icons-round" style="font-size:16px;vertical-align:-3px;margin-right:4px">event</span>Datum</label>
              <div class="post-cal-wrap" id="postCalWrap">
                <div class="post-cal-display" id="postDateDisplay" onclick="_togglePostCalendar(event)">
                  <span class="material-icons-round" style="font-size:18px">calendar_today</span>
                  <span id="postDateText">Datum wählen</span>
                </div>
                <input type="hidden" id="postDate" value="" />
                <div class="post-cal-dropdown" id="postCalDropdown">
                  <div class="cal-header">
                    <button type="button" class="cal-nav" onclick="_postCalNav(event,-1)"><span class="material-icons-round">chevron_left</span></button>
                    <span class="cal-title" id="postCalTitle"></span>
                    <button type="button" class="cal-nav" onclick="_postCalNav(event,1)"><span class="material-icons-round">chevron_right</span></button>
                  </div>
                  <div class="cal-weekdays"><span>Mo</span><span>Di</span><span>Mi</span><span>Do</span><span>Fr</span><span>Sa</span><span>So</span></div>
                  <div class="cal-grid" id="postCalGrid"></div>
                  <div class="cal-footer">
                    <button type="button" class="cal-footer-btn" onclick="_postCalToday(event)">Heute</button>
                    <button type="button" class="cal-footer-btn" onclick="_postCalClear(event)">Löschen</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="form-group">
            <label>Budget <small style="color:var(--text-light)">(optional)</small></label>
            <div class="post-budget-wrap">
              <div class="post-budget-input-wrap">
                <input type="number" id="postBudget" placeholder="0" min="0" step="1" />
                <span class="post-budget-currency">€</span>
              </div>
              <label class="post-vb-label">
                <input type="checkbox" id="postBudgetVB" onchange="document.getElementById('postBudget').disabled=this.checked" />
                <span>VB (Verhandlungsbasis)</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Met-Felder -->
        <div id="postMetFields" style="display:none">
          <div class="form-group">
            <label>Event, bei dem ihr euch kennengelernt habt</label>
            <input type="text" id="postMetEvent" placeholder="z.B. Sommerfest 2026" />
          </div>
        </div>

        <!-- Beschreibung -->
        <div class="form-group">
          <label>Beschreibung</label>
          <textarea id="postContent" rows="3" placeholder="Beschreibe genau, was du suchst oder teilen möchtest… #Hashtags willkommen!" required></textarea>
        </div>

        <!-- Bild Upload -->
        <div class="form-group">
          <label>Bilder <small style="color:var(--text-light)">(optional)</small></label>
          <div class="post-img-upload" id="postImgUpload" onclick="document.getElementById('postImgInput').click()">
            <span class="material-icons-round">add_photo_alternate</span>
            <span>Bild hinzufügen oder hierher ziehen</span>
          </div>
          <input type="file" id="postImgInput" accept="image/*" style="display:none" onchange="_handlePostImage(this)" />
          <div class="post-img-preview" id="postImgPreview" style="display:none">
            <img id="postImgThumb" />
            <button type="button" class="post-img-remove" onclick="_removePostImage()"><span class="material-icons-round">close</span></button>
          </div>
        </div>

        <button type="submit" class="btn-primary btn-block"><span class="material-icons-round">send</span> Veröffentlichen</button>
      </form>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);

  // Drag & drop for image
  var dropZone = document.getElementById('postImgUpload');
  if (dropZone) {
    dropZone.addEventListener('dragover', function(e) { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', function() { dropZone.classList.remove('dragover'); });
    dropZone.addEventListener('drop', function(e) {
      e.preventDefault(); dropZone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        document.getElementById('postImgInput').files = e.dataTransfer.files;
        _handlePostImage(document.getElementById('postImgInput'));
      }
    });
  }

  // Init city autocomplete for location field
  _initPostCityAutocomplete();

  // Init calendar state
  _postCalMonth = new Date().getMonth();
  _postCalYear = new Date().getFullYear();
  _postCalSelected = null;
}

/* ---- Post Location City Autocomplete ---- */
function _initPostCityAutocomplete() {
  var input = document.getElementById('postLocation');
  var list = document.getElementById('postCityList');
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

/* ---- Post Calendar (independent from hero calendar) ---- */
var _postCalMonth = new Date().getMonth();
var _postCalYear = new Date().getFullYear();
var _postCalSelected = null;

function _togglePostCalendar(e) {
  e.stopPropagation();
  var dd = document.getElementById('postCalDropdown');
  if (!dd) return;
  if (dd.classList.contains('show')) {
    dd.classList.remove('show');
  } else {
    _renderPostCalendar();
    dd.classList.add('show');
  }
}

function _renderPostCalendar() {
  var title = document.getElementById('postCalTitle');
  var grid = document.getElementById('postCalGrid');
  if (!title || !grid) return;
  title.textContent = CAL_MONTHS_DE[_postCalMonth] + ' ' + _postCalYear;

  var firstDay = new Date(_postCalYear, _postCalMonth, 1).getDay();
  var startIdx = firstDay === 0 ? 6 : firstDay - 1;
  var daysInMonth = new Date(_postCalYear, _postCalMonth + 1, 0).getDate();
  var daysInPrev = new Date(_postCalYear, _postCalMonth, 0).getDate();
  var today = new Date(); today.setHours(0,0,0,0);

  var html = '';
  for (var i = startIdx - 1; i >= 0; i--) {
    html += '<button type="button" class="cal-day other-month disabled">' + (daysInPrev - i) + '</button>';
  }
  for (var d = 1; d <= daysInMonth; d++) {
    var date = new Date(_postCalYear, _postCalMonth, d); date.setHours(0,0,0,0);
    var isPast = date < today;
    var isToday = date.getTime() === today.getTime();
    var isSelected = _postCalSelected && date.getTime() === _postCalSelected.getTime();
    var cls = 'cal-day';
    if (isPast) cls += ' disabled';
    if (isToday) cls += ' today';
    if (isSelected) cls += ' selected';
    html += '<button type="button" class="' + cls + '"' + (isPast ? '' : ' onclick="_postCalSelect(event,' + d + ')"') + '>' + d + '</button>';
  }
  var totalCells = startIdx + daysInMonth;
  var remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (var n = 1; n <= remaining; n++) {
    html += '<button type="button" class="cal-day other-month disabled">' + n + '</button>';
  }
  grid.innerHTML = html;
}

function _postCalNav(e, dir) {
  e.stopPropagation();
  _postCalMonth += dir;
  if (_postCalMonth > 11) { _postCalMonth = 0; _postCalYear++; }
  if (_postCalMonth < 0) { _postCalMonth = 11; _postCalYear--; }
  _renderPostCalendar();
}

function _postCalSelect(e, day) {
  e.stopPropagation();
  _postCalSelected = new Date(_postCalYear, _postCalMonth, day); _postCalSelected.setHours(0,0,0,0);
  var dd = _postCalSelected.getDate();
  var mm = _postCalSelected.getMonth() + 1;
  var displayText = dd + '. ' + CAL_MONTHS_DE[_postCalSelected.getMonth()] + ' ' + _postCalSelected.getFullYear();
  var dateText = document.getElementById('postDateText');
  var dateInput = document.getElementById('postDate');
  var displayEl = document.getElementById('postDateDisplay');
  if (dateText) dateText.textContent = displayText;
  if (dateInput) dateInput.value = _postCalSelected.getFullYear() + '-' + String(mm).padStart(2,'0') + '-' + String(dd).padStart(2,'0');
  if (displayEl) displayEl.classList.add('has-value');
  var dropdown = document.getElementById('postCalDropdown');
  if (dropdown) dropdown.classList.remove('show');
  _renderPostCalendar();
}

function _postCalToday(e) {
  e.stopPropagation();
  var now = new Date();
  _postCalMonth = now.getMonth();
  _postCalYear = now.getFullYear();
  _postCalSelect(e, now.getDate());
}

function _postCalClear(e) {
  e.stopPropagation();
  _postCalSelected = null;
  var dateText = document.getElementById('postDateText');
  var dateInput = document.getElementById('postDate');
  var displayEl = document.getElementById('postDateDisplay');
  if (dateText) dateText.textContent = 'Datum wählen';
  if (dateInput) dateInput.value = '';
  if (displayEl) displayEl.classList.remove('has-value');
  var dropdown = document.getElementById('postCalDropdown');
  if (dropdown) dropdown.classList.remove('show');
}

// Close post calendar on outside click
document.addEventListener('click', function(e) {
  if (!e.target.closest('.post-cal-wrap')) {
    var dd = document.getElementById('postCalDropdown');
    if (dd) dd.classList.remove('show');
  }
  if (!e.target.closest('.city-autocomplete-wrap')) {
    var pl = document.getElementById('postCityList');
    if (pl) pl.classList.remove('open');
  }
});

function _selectPostType(btn) {
  document.querySelectorAll('.post-type-tile').forEach(function(t) { t.classList.remove('active'); });
  btn.classList.add('active');
  var type = btn.dataset.type;
  document.getElementById('postType').value = type;

  var searchFields = document.getElementById('postSearchFields');
  var metFields = document.getElementById('postMetFields');
  var titleInput = document.getElementById('postTitle');
  var contentArea = document.getElementById('postContent');

  // Show/hide fields based on type
  if (type === 'suche-dienstleister') {
    searchFields.style.display = '';
    metFields.style.display = 'none';
    if (titleInput) titleInput.placeholder = 'z.B. DJ für Hochzeit gesucht';
    if (contentArea) contentArea.placeholder = 'Beschreibe, was du genau suchst… #Hashtags willkommen!';
  } else if (type === 'suche-events') {
    searchFields.style.display = '';
    metFields.style.display = 'none';
    if (titleInput) titleInput.placeholder = 'z.B. Erfahrener Fotograf sucht Aufträge';
    if (contentArea) contentArea.placeholder = 'Beschreibe dein Angebot und was für Events du suchst…';
  } else if (type === 'ankuendigung') {
    searchFields.style.display = 'none';
    metFields.style.display = 'none';
    if (contentArea) contentArea.placeholder = 'Teile deine Neuigkeiten mit der Community… #Hashtags willkommen!';
  } else if (type === 'met') {
    searchFields.style.display = 'none';
    metFields.style.display = '';
    if (contentArea) contentArea.placeholder = 'Erzähle von deiner Erfahrung…';
  }
}

var _postImageData = null;

function _handlePostImage(input) {
  if (!input.files || !input.files[0]) return;
  var file = input.files[0];
  if (file.size > 5 * 1024 * 1024) { showToast('Bild max. 5 MB', 'error'); return; }
  var reader = new FileReader();
  reader.onload = function(e) {
    _postImageData = e.target.result;
    var preview = document.getElementById('postImgPreview');
    var upload = document.getElementById('postImgUpload');
    document.getElementById('postImgThumb').src = _postImageData;
    if (preview) preview.style.display = '';
    if (upload) upload.style.display = 'none';
  };
  reader.readAsDataURL(file);
}

function _removePostImage() {
  _postImageData = null;
  var preview = document.getElementById('postImgPreview');
  var upload = document.getElementById('postImgUpload');
  if (preview) preview.style.display = 'none';
  if (upload) upload.style.display = '';
  var input = document.getElementById('postImgInput');
  if (input) input.value = '';
}

function _createSocialPost(event) {
  event.preventDefault();
  var type = document.getElementById('postType').value;
  var content = document.getElementById('postContent').value.trim();
  if (!content) { showToast('Bitte Beschreibung eingeben', 'warning'); return; }

  var post = {
    id: 'sp_' + Date.now(),
    type: type,
    author: currentUser ? (currentUser.name || 'Du') : 'Du',
    authorId: currentUser ? currentUser.id : 0,
    avatar: currentUser ? (currentUser.photoUrl || ('https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(currentUser.name || 'user'))) : 'https://api.dicebear.com/7.x/avataaars/svg?seed=newuser',
    content: content,
    image: _postImageData || null,
    time: new Date().toISOString(),
    likes: 0,
    comments: 0,
    metAt: null,
    title: null,
    category: null,
    location: null,
    date: null,
    budget: null
  };

  if (type === 'suche-dienstleister' || type === 'suche-events') {
    var ti = document.getElementById('postTitle');
    var ca = document.getElementById('postCategory');
    var lo = document.getElementById('postLocation');
    var da = document.getElementById('postDate');
    var bu = document.getElementById('postBudget');
    var vb = document.getElementById('postBudgetVB');
    post.title = ti ? ti.value.trim() : '';
    post.category = ca ? ca.value : '';
    post.location = lo ? lo.value.trim() : '';
    // Date: stored as YYYY-MM-DD from hidden input, display as readable text
    post.date = da && da.value ? da.value : '';
    if (post.date && _postCalSelected) {
      post.dateDisplay = _postCalSelected.getDate() + '. ' + CAL_MONTHS_DE[_postCalSelected.getMonth()] + ' ' + _postCalSelected.getFullYear();
    }
    // Budget: number + VB flag
    if (vb && vb.checked) {
      post.budget = 'VB';
    } else if (bu && bu.value) {
      post.budget = bu.value + '€';
    } else {
      post.budget = '';
    }
  } else if (type === 'met') {
    var me = document.getElementById('postMetEvent');
    post.metAt = me && me.value.trim() ? { eventName: me.value.trim(), date: '' } : null;
  }

  _postImageData = null;
  _socialPosts.unshift(post);
  _saveSocialData();
  document.getElementById('createPostModal') && document.getElementById('createPostModal').remove();

  // Switch to the matching tab so the new post is visible at the top
  var targetTab = (type === 'suche-dienstleister' || type === 'suche-events') ? 'gesuche' : 'foryou';
  document.querySelectorAll('.feed-tab').forEach(function(t) {
    t.classList.toggle('active', t.dataset.feed === targetTab);
  });
  renderFeed(targetTab);

  // Scroll feed list to top so the new post is immediately visible
  var feedList = document.getElementById('feedList');
  if (feedList) feedList.scrollIntoView({ behavior: 'smooth', block: 'start' });

  showToast('Inserat veröffentlicht!', 'check_circle');
}


// =========================================================
// =================== CONTACT FORM ========================
// =========================================================

function sendContactMessage(event) {
  event.preventDefault();
  var name = document.getElementById('contactName').value.trim();
  var email = document.getElementById('contactEmail').value.trim();
  var subject = document.getElementById('contactSubject').value;
  var message = document.getElementById('contactMessage').value.trim();

  if (!name || !email || !message) return;

  // Simple email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast('Bitte eine gültige E-Mail-Adresse eingeben.', 'error');
    return;
  }

  // Build mailto link (since we have no backend, we use mailto as fallback)
  var mailtoSubject = encodeURIComponent('[Eventbörse Support] ' + subject + ' – ' + name);
  var mailtoBody = encodeURIComponent('Von: ' + name + ' (' + email + ')\nBetreff: ' + subject + '\n\n' + message);
  var mailtoLink = 'mailto:Kontakt@Eventb%C3%B6rse.de?subject=' + mailtoSubject + '&body=' + mailtoBody;

  // Show success and open mail client
  var successEl = document.getElementById('contactSuccess');
  if (successEl) {
    successEl.style.display = '';
    setTimeout(function() { successEl.style.display = 'none'; }, 6000);
  }

  // Try to open mail client
  window.location.href = mailtoLink;

  // Reset form
  event.target.reset();
  showToast('Danke! Deine Nachricht wurde vorbereitet.', 'email');
}


// =========================================================
// =================== COUNT-UP ANIMATION ==================
// =========================================================
function _animateCountUp() {
  var els = document.querySelectorAll('.browse-hero-stats [data-count]');
  els.forEach(function(el) {
    if (el._counted) return;
    el._counted = true;
    var target = parseFloat(el.dataset.count);
    var suffix = el.dataset.suffix || '';
    var dec = parseInt(el.dataset.decimal) || 0;
    var duration = 1200;
    var start = performance.now();
    function tick(now) {
      var p = Math.min((now - start) / duration, 1);
      // ease-out cubic
      var ease = 1 - Math.pow(1 - p, 3);
      var val = (target * ease);
      el.textContent = (dec ? val.toFixed(dec) : Math.round(val)) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

// =========================================================
// =================== ANIMATIONS (IntersectionObserver) ===
// =========================================================

function _initAnimatedEntries() {
  if (!window.IntersectionObserver) return;
  var entries = document.querySelectorAll('.animated-entry:not(.visible)');
  var observer = new IntersectionObserver(function(records) {
    records.forEach(function(r) {
      if (r.isIntersecting) {
        r.target.classList.add('visible');
        observer.unobserve(r.target);
      }
    });
  }, { threshold: 0.12 });
  entries.forEach(function(el) { observer.observe(el); });
}

// Init on each page navigate
(function() {
  var _origNav = window.navigateTo;
  // We hook into navigateTo to init animations after every navigation
  // (Already added _initAnimatedEntries calls in board/feed)
})();

// =========================================================
// ========= EVENT CONNECTIONS (Profile) ===================
// =========================================================

function openAddEventConnectionModal() {
  if (!isLoggedIn) { openModal('loginModal'); return; }
  var html = `<div class="modal-overlay show" id="addEventConnModal" onclick="closeModalOnOverlay(event)" style="z-index:2000">
    <div class="modal modal-sm" onclick="event.stopPropagation()">
      <button class="modal-close" onclick="document.getElementById('addEventConnModal').remove()"><span class="material-icons-round">close</span></button>
      <div class="modal-header">
        <span class="material-icons-round modal-icon">celebration</span>
        <h2>Event hinzufügen</h2>
        <p>Trage ein Event ein, das du erlebt hast – und wen du dabei kennengelernt hast</p>
      </div>
      <form class="modal-form" onsubmit="_saveEventConnection(event)">
        <div class="form-group">
          <label>Event-Name</label>
          <input type="text" id="connEventName" placeholder="z.B. Sommerhochzeit 2026" required autofocus />
        </div>
        <div class="form-group">
          <label>Datum (optional)</label>
          <input type="text" id="connEventDate" placeholder="z.B. 15. August 2026" />
        </div>
        <div class="form-group">
          <label>Ort (optional)</label>
          <input type="text" id="connEventLocation" placeholder="z.B. Hamburg" />
        </div>
        <div class="form-group">
          <label>Kennengelernt (optional)</label>
          <input type="text" id="connMetPerson" placeholder="z.B. DJ Max, Fotograf Peter, ..." />
        </div>
        <button type="submit" class="btn-primary btn-block">
          <span class="material-icons-round">add</span> Hinzufügen
        </button>
      </form>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

function _saveEventConnection(event) {
  event.preventDefault();
  if (!currentUser) return;
  var name = document.getElementById('connEventName').value.trim();
  var date = document.getElementById('connEventDate').value.trim();
  var location = document.getElementById('connEventLocation').value.trim();
  var metPerson = document.getElementById('connMetPerson').value.trim();
  if (!name) return;

  if (!currentUser.eventConnections) currentUser.eventConnections = [];
  currentUser.eventConnections.unshift({
    id: 'ec_' + Date.now(),
    eventName: name,
    date: date,
    location: location,
    metPerson: metPerson,
    addedAt: new Date().toISOString()
  });

  // Persist
  var stored = JSON.parse(localStorage.getItem('eb_user') || 'null') || {};
  stored.eventConnections = currentUser.eventConnections;
  localStorage.setItem('eb_user', JSON.stringify(stored));

  document.getElementById('addEventConnModal') && document.getElementById('addEventConnModal').remove();
  _renderProfileEventConnections();
  showToast('Event "' + name + '" wurde hinzugefügt!', 'check_circle');
}

function _deleteEventConnection(ecId) {
  if (!currentUser || !currentUser.eventConnections) return;
  currentUser.eventConnections = currentUser.eventConnections.filter(function(ev) { return ev.id !== ecId; });
  var stored = JSON.parse(localStorage.getItem('eb_user') || 'null') || {};
  stored.eventConnections = currentUser.eventConnections;
  localStorage.setItem('eb_user', JSON.stringify(stored));
  _renderProfileEventConnections();
}

// ══════════════════════════════════════════════════════════════
//  NAV AI SEARCH OVERLAY & CATEGORY DROPDOWN (v2)
// ══════════════════════════════════════════════════════════════

var _navAiTypingTimer = null;
var _navSelectedCategory = '';
var _navAiCatSelection = new Set();

// ── Helpers ──
function _getNavAiCategories() {
  return (typeof AI_CATEGORIES !== 'undefined') ? AI_CATEGORIES : [
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
    { key: 'wellness', label: 'Wellness & Spa', emoji: '💆' },
  ];
}

var _NAV_AI_POPULAR = [
  { text: 'DJ für Hochzeit in Berlin', cat: 'DJ & Musik' },
  { text: 'Catering für 80 Personen', cat: 'Catering' },
  { text: 'Fotograf für Firmenfeier', cat: 'Fotografie' },
  { text: 'Location für Geburtstag', cat: 'Location' },
  { text: 'Florist für Hochzeit', cat: 'Floristik' },
  { text: 'Licht & Technik für Party', cat: 'Technik' },
];

// ── Open / Close ──
function openNavAiSearch() {
  var overlay = document.getElementById('navAiOverlay');
  if (!overlay) return;
  overlay.classList.add('show');
  var inp = document.getElementById('navAiInput');
  if (inp) { inp.value = ''; }
  _navAiCatSelection.clear();
  _renderNavAiBody('');
  setTimeout(function() { if (inp) inp.focus(); }, 350);
}

function closeNavAiSearch() {
  var overlay = document.getElementById('navAiOverlay');
  if (overlay) overlay.classList.remove('show');
}

// ── Render body based on input ──
function _renderNavAiBody(query) {
  var body = document.getElementById('navAiBody');
  if (!body) return;
  var q = query.toLowerCase().trim();
  var html = '';

  if (!q) {
    // Show categories + popular searches
    var cats = _getNavAiCategories();
    html += '<div class="nav-ai-section-title"><span class="material-icons-round">category</span> Kategorien</div>';
    html += '<div class="nav-ai-cat-grid">';
    cats.forEach(function(c) {
      var sel = _navAiCatSelection.has(c.key) ? ' selected' : '';
      html += '<button class="nav-ai-cat-card' + sel + '" onclick="toggleNavAiCat(\'' + c.key + '\')">' +
        '<span class="nav-ai-cat-emoji">' + c.emoji + '</span>' + c.label + '</button>';
    });
    html += '</div>';

    html += '<div class="nav-ai-section-title"><span class="material-icons-round">trending_up</span> Beliebte Suchen</div>';
    html += '<div class="nav-ai-popular-list">';
    _NAV_AI_POPULAR.forEach(function(p) {
      html += '<button class="nav-ai-popular-item" onclick="navAiFillAndSearch(\'' + p.text.replace(/'/g, "\\'") + '\')">' +
        '<span class="material-icons-round">search</span>' +
        '<span class="nav-ai-pop-text">' + p.text + '</span>' +
        '<span class="nav-ai-pop-cat">' + p.cat + '</span>' +
        '</button>';
    });
    html += '</div>';
  } else {
    // Live search results from LISTINGS
    var listings = (typeof getHeroListings === 'function') ? getHeroListings() : (typeof LISTINGS !== 'undefined' ? LISTINGS : []);
    var results = listings.filter(function(l) {
      var haystack = (l.title + ' ' + l.categoryLabel + ' ' + l.tags.join(' ') + ' ' + l.providerName + ' ' + l.location).toLowerCase();
      return haystack.includes(q);
    }).slice(0, 6);

    // Also show matching categories
    var cats = _getNavAiCategories();
    var matchedCats = cats.filter(function(c) { return c.label.toLowerCase().includes(q) || c.key.includes(q); });
    if (matchedCats.length > 0) {
      html += '<div class="nav-ai-section-title"><span class="material-icons-round">category</span> Kategorien</div>';
      html += '<div class="nav-ai-cat-grid">';
      matchedCats.forEach(function(c) {
        var sel = _navAiCatSelection.has(c.key) ? ' selected' : '';
        html += '<button class="nav-ai-cat-card' + sel + '" onclick="toggleNavAiCat(\'' + c.key + '\')">' +
          '<span class="nav-ai-cat-emoji">' + c.emoji + '</span>' + c.label + '</button>';
      });
      html += '</div>';
    }

    if (results.length > 0) {
      html += '<div class="nav-ai-section-title"><span class="material-icons-round">auto_awesome</span> Ergebnisse</div>';
      html += '<div class="nav-ai-results">';
      results.forEach(function(l) {
        var img = (l.images && l.images[0]) ? l.images[0] : '';
        var stars = '★'.repeat(Math.round(l.rating)) + '☆'.repeat(5 - Math.round(l.rating));
        html += '<button class="nav-ai-result-card" onclick="closeNavAiSearch();navigateTo(\'provider\',{id:' + l.id + '})">' +
          '<img class="nav-ai-result-img" src="' + img + '" alt="" onerror="this.style.display=\'none\'" />' +
          '<div class="nav-ai-result-info">' +
            '<div class="nav-ai-result-name">' + l.title + '</div>' +
            '<div class="nav-ai-result-meta">' +
              '<span class="nav-ai-result-rating">' + stars.substring(0,5) + ' ' + l.rating + '</span>' +
              '<span>·</span><span>' + l.location + '</span>' +
            '</div>' +
          '</div>' +
          '<span class="nav-ai-result-price">ab ' + l.price + '€</span>' +
          '</button>';
      });
      html += '</div>';
    }

    // Matching popular searches
    var matchedPop = _NAV_AI_POPULAR.filter(function(p) { return p.text.toLowerCase().includes(q); });
    if (matchedPop.length > 0) {
      html += '<div class="nav-ai-section-title"><span class="material-icons-round">trending_up</span> Vorschläge</div>';
      html += '<div class="nav-ai-popular-list">';
      matchedPop.forEach(function(p) {
        html += '<button class="nav-ai-popular-item" onclick="navAiFillAndSearch(\'' + p.text.replace(/'/g, "\\'") + '\')">' +
          '<span class="material-icons-round">search</span>' +
          '<span class="nav-ai-pop-text">' + p.text + '</span>' +
          '<span class="nav-ai-pop-cat">' + p.cat + '</span>' +
          '</button>';
      });
      html += '</div>';
    }

    if (results.length === 0 && matchedCats.length === 0 && matchedPop.length === 0) {
      html += '<div class="nav-ai-empty"><span class="material-icons-round">search_off</span>Keine Ergebnisse für „' + q + '"<br><small>Suche anpassen oder Kategorie wählen</small></div>';
    }
  }

  body.innerHTML = html;
}

function onNavAiInput() {
  var inp = document.getElementById('navAiInput');
  _renderNavAiBody(inp ? inp.value : '');
}

function toggleNavAiCat(key) {
  if (_navAiCatSelection.has(key)) {
    _navAiCatSelection.delete(key);
  } else {
    _navAiCatSelection.add(key);
  }
  var inp = document.getElementById('navAiInput');
  _renderNavAiBody(inp ? inp.value : '');
}

function navAiFillAndSearch(text) {
  var inp = document.getElementById('navAiInput');
  if (inp) inp.value = text;
  submitNavAiSearch();
}

function submitNavAiSearch() {
  var inp = document.getElementById('navAiInput');
  var query = inp ? inp.value.trim() : '';
  closeNavAiSearch();

  // Transfer category selections
  if (typeof selectedCategories !== 'undefined') {
    selectedCategories.clear();
    _navAiCatSelection.forEach(function(k) { selectedCategories.add(k); });
  }

  navigateTo('browse');
  setTimeout(function() {
    var heroInput = document.getElementById('heroSearchInput');
    if (heroInput && query) {
      heroInput.value = query;
      heroInput.dispatchEvent(new Event('input'));
    }
    var browseInput = document.getElementById('browseSearch');
    if (browseInput && query) {
      browseInput.value = query;
      _aiPlaceholderHideOnInput(browseInput);
    }
    if (typeof filterListings === 'function') filterListings();
    // Scroll to results
    setTimeout(function() {
      var grid = document.getElementById('browseGrid');
      if (grid) window.scrollTo({ top: grid.getBoundingClientRect().top + window.pageYOffset - 110, behavior: 'smooth' });
    }, 150);
  }, 250);
}

// ── Typing animation for nav AI button ──
function _initNavAiTyping() {
  var el = document.getElementById('navAiTyping');
  if (!el) return;
  var phrases = [
    'Beschreib dein Event…',
    'DJ für Hochzeit…',
    'Catering für 80 Gäste…',
    'Fotograf gesucht…',
    'Location finden…',
  ];
  var phraseIdx = 0, charIdx = 0, isDeleting = false;
  if (_navAiTypingTimer) clearInterval(_navAiTypingTimer);

  function tick() {
    var phrase = phrases[phraseIdx];
    if (!isDeleting) {
      charIdx++;
      el.textContent = phrase.substring(0, charIdx);
      if (charIdx >= phrase.length) {
        isDeleting = true;
        clearInterval(_navAiTypingTimer);
        _navAiTypingTimer = setTimeout(function() {
          _navAiTypingTimer = setInterval(tick, 35);
        }, 2400);
        return;
      }
    } else {
      charIdx--;
      el.textContent = phrase.substring(0, charIdx) || '\u00A0';
      if (charIdx <= 0) {
        isDeleting = false;
        phraseIdx = (phraseIdx + 1) % phrases.length;
        clearInterval(_navAiTypingTimer);
        _navAiTypingTimer = setTimeout(function() {
          _navAiTypingTimer = setInterval(tick, 60);
        }, 400);
        return;
      }
    }
  }
  el.textContent = '\u00A0';
  _navAiTypingTimer = setInterval(tick, 60);
}

// ── Category Dropdown ──
function toggleNavCategoryDropdown(e) {
  if (e) e.stopPropagation();
  var dd = document.getElementById('navCatDropdown');
  if (!dd) return;
  if (dd.classList.contains('show')) {
    dd.classList.remove('show');
    return;
  }
  var cats = _getNavAiCategories();
  dd.innerHTML = cats.map(function(c) {
    var sel = _navSelectedCategory === c.key ? ' selected' : '';
    return '<button class="nav-cat-item' + sel + '" onclick="selectNavCategory(\'' + c.key + '\',\'' + c.label + '\',\'' + c.emoji + '\')">' +
      '<span class="nav-cat-emoji">' + c.emoji + '</span>' + c.label + '</button>';
  }).join('');
  dd.classList.add('show');
}

function selectNavCategory(key, label, emoji) {
  var dd = document.getElementById('navCatDropdown');
  var valEl = document.getElementById('navCatValue');
  if (_navSelectedCategory === key) {
    _navSelectedCategory = '';
    if (valEl) valEl.textContent = 'Kategorie';
  } else {
    _navSelectedCategory = key;
    if (valEl) valEl.textContent = emoji + ' ' + label;
  }
  if (dd) dd.classList.remove('show');
  if (typeof selectedCategories !== 'undefined') {
    selectedCategories.clear();
    if (_navSelectedCategory) selectedCategories.add(_navSelectedCategory);
  }
}

function performNavSearch() {
  var dd = document.getElementById('navCatDropdown');
  if (dd) dd.classList.remove('show');
  navigateTo('browse');
  setTimeout(function() {
    if (typeof filterListings === 'function') filterListings();
  }, 200);
}

// Close dropdowns on outside click
document.addEventListener('click', function(e) {
  if (!e.target.closest('.nav-search-segment-wrap')) {
    var dd = document.getElementById('navCatDropdown');
    if (dd) dd.classList.remove('show');
  }
  if (!e.target.closest('.nav-ai-overlay-inner') && !e.target.closest('.nav-search-ai')) {
    closeNavAiSearch();
  }
});

// Escape key closes overlay
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeNavAiSearch();
});

// Init typing on load
document.addEventListener('DOMContentLoaded', function() {
  _initNavAiTyping();
});
