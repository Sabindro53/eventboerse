/* ============================================
   Eventbörse – Event Marketplace Application
   SPA Router, Chat, Negotiation, Listings, Auth
   ============================================ */

// ========== DEMO DATA ==========
const LISTINGS = [
  {
    id: 1, providerId: 1,
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
    id: 2, providerId: 2,
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
    id: 3, providerId: 3,
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
    id: 4, providerId: 4,
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
    id: 5, providerId: 5,
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
    id: 6, providerId: 6,
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
    id: 7, providerId: 7,
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
    id: 8, providerId: 8,
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
    id: 9, providerId: 9,
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
    id: 10, providerId: 10,
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

// ========== BLOCKED DATA PATTERNS ==========
const BLOCKED_PATTERNS = [
  /(\+?\d{1,4}[\s-]?\(?\d{1,4}\)?[\s-]?\d{2,4}[\s-]?\d{2,4}[\s-]?\d{0,4})/,   // phone
  /[\w._%+-]+@[\w.-]+\.[a-zA-Z]{2,}/,                                              // email
  /\b\d{5}\b\s+\w+/,                                                                // zip+city
  /(whatsapp|telegram|signal|viber|facebook|instagram\s*@|snapchat)/i,              // social
];

// ========== NAVIGATION ==========
function navigateTo(page, data) {
  // Hide user menu
  document.getElementById('userMenu').classList.remove('show');

  // Deactivate all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  // Activate target page
  const target = document.getElementById('page-' + page);
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
      renderBrowseGrid(LISTINGS);
      break;
    case 'explore':
      renderExploreGrid();
      break;
    case 'detail':
      loadDetail(data);
      break;
    case 'provider':
      loadProvider(data);
      break;
    case 'messages':
      renderChatList();
      break;
    case 'dashboard':
      renderDashboard();
      break;
    case 'create-listing':
      updateCreateFormForRole();
      break;
    case 'profile':
      navigateTo('dashboard');
      return;
    case 'my-listings':
      renderMyListings();
      break;
    case 'favorites':
      renderFavorites();
      break;
  }
}

// ========== LISTING CARD RENDERER ==========
function renderListingCard(listing) {
  const isFav = favorites.has(listing.id);
  return `
    <div class="listing-card" onclick="navigateTo('detail', ${listing.id})">
      <div class="listing-card-img">
        <img src="${listing.image}" alt="${listing.title}" loading="lazy" />
        <button class="listing-fav ${isFav ? 'liked' : ''}" onclick="event.stopPropagation(); toggleFavorite(${listing.id}, this)">
          <span class="material-icons-round">${isFav ? 'favorite' : 'favorite_border'}</span>
        </button>
        ${listing.badge ? `<span class="listing-badge">${listing.badge}</span>` : ''}
      </div>
      <div class="listing-card-body">
        <div class="listing-card-top">
          <span class="listing-card-title">${listing.title}</span>
          <span class="listing-card-rating">
            <span class="material-icons-round">star</span> ${listing.rating}
          </span>
        </div>
        <div class="listing-card-category">${listing.categoryLabel}</div>
        <div class="listing-card-location">
          <span class="material-icons-round">location_on</span> ${listing.location}
        </div>
        <div class="listing-card-price">${listing.priceLabel}</div>
        <div class="listing-card-tags">
          ${listing.tags.map(t => `<span class="listing-tag">${t}</span>`).join('')}
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

  const leftListings = LISTINGS.slice(0, 5);
  const rightListings = LISTINGS.slice(5, 10);

  function cardHTML(l) {
    return `<a class="hero-marquee-card" href="#" onclick="navigateTo('detail',${l.id});return false;">
      <img src="${l.image}" alt="${l.title}" loading="lazy" />
      <div class="hero-marquee-card-info">
        <h4>${l.title}</h4>
        <span>${l.priceLabel} · ★ ${l.rating}</span>
      </div>
    </a>`;
  }

  // Duplicate items for seamless infinite scroll
  const leftHTML = leftListings.map(cardHTML).join('');
  const rightHTML = rightListings.map(cardHTML).join('');
  leftTrack.innerHTML = leftHTML + leftHTML;
  rightTrack.innerHTML = rightHTML + rightHTML;
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
      <img src="${it.image}" alt="${it.title}" loading="lazy" />
      <div class="explore-item-overlay">
        <span class="explore-item-title">${it.title}</span>
        <span class="explore-item-price">${it.price}</span>
      </div>
    </a>`;
  }).join('');
}

function filterExploreGrid() {
  renderExploreGrid();
}

function renderFeaturedGrid() {
  const grid = document.getElementById('featuredGrid');
  grid.innerHTML = LISTINGS.slice(0, 8).map(renderListingCard).join('');
}

function filterCategory(btn, category) {
  document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  const filtered = category === 'alle' ? LISTINGS : LISTINGS.filter(l => l.category === category);
  document.getElementById('featuredGrid').innerHTML = filtered.map(renderListingCard).join('');
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
  const listingMatches = LISTINGS.filter(l => {
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

    // Highlight matching categories based on keyword input
    const matches = aiMatchKeyword(val);
    if (matches.length) {
      matches.forEach(m => {
        if (m.category) selectedCategories.add(m.category);
      });
      renderCategoryPicker();
      renderSelectedTags();
    }
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
  document.getElementById('browseResultCount').textContent = `${listings.length} Services gefunden`;
}

function filterListings() {
  const search = document.getElementById('browseSearch').value.toLowerCase().trim();
  const category = document.getElementById('browseCategory').value;
  const eventType = document.getElementById('browseEventType')?.value || '';
  const location = document.getElementById('browseLocation').value.toLowerCase().trim();
  const priceRange = document.getElementById('browsePrice')?.value || '';
  const minRating = document.getElementById('browseRating')?.value || '';

  let filtered = LISTINGS.filter(l => {
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

  // 1. Same category (detected from search or filter), any location
  if (detectedCategory) {
    alternatives = LISTINGS.filter(l => l.category === detectedCategory);
  }

  // 2. Same event type, any location
  if (alternatives.length === 0 && eventType) {
    alternatives = LISTINGS.filter(l => l.tags.some(t => t.toLowerCase() === eventType.toLowerCase()));
  }

  // 3. Same location/region, any category
  if (alternatives.length === 0 && location) {
    alternatives = LISTINGS.filter(l =>
      l.location.toLowerCase().includes(location) || l.region.toLowerCase().includes(location)
    );
  }

  // 4. Fuzzy text match: search term in title, tags, description
  if (alternatives.length === 0 && search) {
    const words = search.split(/\s+/).filter(w => w.length >= 2);
    alternatives = LISTINGS.filter(l => {
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
      heading = `<span class="material-icons-round">lightbulb</span> Alternativen in der Nähe von ${searchCity}`;
    } else if (detectedCategory) {
      const catLabel = CATEGORY_LABELS[detectedCategory] || detectedCategory;
      heading = `<span class="material-icons-round">lightbulb</span> Ähnliche Angebote in der Kategorie „${catLabel}"`;
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
            <img src="${l.image}" alt="${l.title}" loading="lazy" />
            <button class="listing-fav" onclick="event.stopPropagation(); toggleFavorite(${l.id}, this)">
              <span class="material-icons-round">favorite_border</span>
            </button>
            ${l.badge ? `<span class="listing-badge">${l.badge}</span>` : ''}
          </div>
          <div class="listing-card-body">
            <div class="listing-card-top">
              <span class="listing-card-title">${l.title}</span>
              <span class="listing-card-rating">
                <span class="material-icons-round">star</span> ${l.rating}
              </span>
            </div>
            <div class="listing-card-category">${l.categoryLabel}</div>
            <div class="listing-card-location">
              <span class="material-icons-round">location_on</span> ${l.location} ${distBadge}
            </div>
            <div class="listing-card-price">${l.priceLabel}</div>
            <div class="listing-card-tags">
              ${l.tags.map(t => `<span class="listing-tag">${t}</span>`).join('')}
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
    `<span class="filter-tag">${t.label}<button onclick="document.getElementById('${t.field}').value=''; filterListings();"><span class="material-icons-round">close</span></button></span>`
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
    heroImg.innerHTML = `<img src="${listing.images[0]}" alt="${listing.title}" class="detail-hero-photo" />`;
  }

  // Full gallery for desktop, remaining images on mobile (CSS hides first-child on mobile)
  gallery.innerHTML = listing.images.map(img =>
    `<img src="${img}" alt="${listing.title}" class="detail-gallery-img" />`
  ).join('');

  // Info
  document.getElementById('detailCategory').textContent = listing.categoryLabel;
  document.getElementById('detailTitle').textContent = listing.title;
  document.getElementById('detailRating').textContent = listing.reviews > 0 ? listing.rating : 'Neu';
  document.getElementById('detailReviewCount').textContent = listing.reviews > 0 ? `(${listing.reviews} Bewertungen)` : 'Noch keine Bewertungen';
  document.getElementById('detailLocation').textContent = listing.region;
  document.getElementById('detailProviderImg').src = listing.providerImg;
  document.getElementById('detailProviderName').textContent = listing.providerName;
  document.getElementById('detailProviderTag').textContent = `Superhost · Seit ${listing.providerSince} auf Eventbörse`;
  document.getElementById('detailDescription').innerHTML = listing.description;
  document.getElementById('detailPrice').textContent = listing.priceLabel.split('/')[0];

  // Features
  document.getElementById('detailFeatures').innerHTML = listing.features.map(f =>
    `<div class="feature-item"><span class="material-icons-round">check_circle</span><span>${f}</span></div>`
  ).join('');

  // Reviews
  renderDetailReviews(listing);

  // Negotiation price
  document.getElementById('negOriginalPrice').value = listing.priceLabel;
}

// ========== PROVIDER PROFILE ==========
function loadProvider(providerId) {
  const providerListings = LISTINGS.filter(l => l.providerId === (providerId || currentListing?.providerId));
  const mainListing = providerListings[0] || LISTINGS[0];

  document.getElementById('providerAvatar').src = mainListing.providerImg;
  document.getElementById('providerName').textContent = mainListing.providerName;
  document.getElementById('providerTagline').textContent = `${mainListing.categoryLabel} · ${mainListing.location}`;
  document.getElementById('providerListingCount').textContent = providerListings.length;
  document.getElementById('providerRating').textContent = 0;
  document.getElementById('providerReviews').textContent = 0;

  // Listings tab
  document.getElementById('providerListings').innerHTML = providerListings.map(renderListingCard).join('');

  // Gallery tab
  const allImages = providerListings.flatMap(l => l.images);
  document.getElementById('providerGallery').innerHTML = allImages.map(img =>
    `<img src="${img}" alt="Gallery" loading="lazy" />`
  ).join('');

  // Reviews tab
  if (mainListing.reviews === 0) {
    document.getElementById('providerReviewsList').innerHTML = `
      <div style="text-align:center; padding: 40px 20px; color: var(--text-light);">
        <span class="material-icons-round" style="font-size: 48px; margin-bottom: 12px; opacity: 0.4;">rate_review</span>
        <p style="font-size: 1.05rem; font-weight: 600; color: var(--dark); margin-bottom: 6px;">Noch keine Bewertungen</p>
        <p style="font-size: 0.9rem;">Dieser Anbieter ist neu auf Eventbörse.</p>
      </div>
    `;
  } else {
    document.getElementById('providerReviewsList').innerHTML = DEMO_REVIEWS.map(r => `
      <div class="review-card">
        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${r.avatar}" alt="${r.name}" class="review-avatar" />
        <div class="review-content">
          <div class="review-top"><strong>${r.name}</strong><span>${r.date}</span></div>
          <div class="review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
          <p class="review-text">${r.text}</p>
        </div>
      </div>
    `).join('');
  }
}

function switchProviderTab(btn, tab) {
  document.querySelectorAll('.provider-tabs .tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.provider-tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById('provider-tab-' + tab).classList.add('active');
}

function toggleFollow() {
  showToast('Du folgst jetzt diesem Anbieter!', 'person_add');
}

// ========== CHAT / MESSAGES ==========
function renderChatList() {
  const list = document.getElementById('chatList');
  list.innerHTML = DEMO_CHATS.map(chat => `
    <div class="chat-item ${currentChat?.id === chat.id ? 'active' : ''}" onclick="openChat(${chat.id})">
      <img src="${chat.avatar}" alt="${chat.name}" />
      <div class="chat-item-info">
        <strong>${chat.name}</strong>
        <p>${chat.lastMsg}</p>
      </div>
      <div class="chat-item-meta">
        <span>${chat.time}</span>
        ${chat.unread > 0 ? `<span class="chat-item-unread">${chat.unread}</span>` : ''}
      </div>
    </div>
  `).join('');
}

function openChat(chatId) {
  const chat = DEMO_CHATS.find(c => c.id === chatId);
  if (!chat) return;
  currentChat = chat;

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
  document.getElementById('chatStatus').className = chat.online ? 'online' : 'offline';

  // Negotiation banner
  const banner = document.getElementById('negotiationBanner');
  if (chat.negotiation?.active) {
    banner.style.display = 'flex';
    const neg = chat.negotiation;
    if (neg.counterOffer) {
      document.getElementById('negDetails').textContent = `Dein Angebot: ${neg.yourOffer}€ · Gegenangebot: ${neg.counterOffer}€`;
    } else {
      document.getElementById('negDetails').textContent = `Dein Angebot: ${neg.yourOffer}€ · Wartet auf Antwort`;
    }
  } else {
    banner.style.display = 'none';
  }

  // Messages
  const msgContainer = document.getElementById('chatMessages');
  msgContainer.innerHTML = chat.messages.map(renderMessage).join('');
  msgContainer.scrollTop = msgContainer.scrollHeight;

  // Update chat list
  renderChatList();
}

function renderMessage(msg) {
  switch (msg.type) {
    case 'sent':
      return `<div class="msg msg-sent">${msg.text}<span class="msg-time">${msg.time}</span></div>`;
    case 'received':
      return `<div class="msg msg-received">${msg.text}<span class="msg-time">${msg.time}</span></div>`;
    case 'system':
      return `<div class="msg msg-system">${msg.text}</div>`;
    case 'offer':
      return `
        <div class="msg msg-offer">
          <div class="offer-label">${msg.label}</div>
          <div class="offer-amount">${msg.amount}</div>
          <div class="offer-status ${msg.status}">${msg.statusLabel}</div>
        </div>
      `;
    default:
      return '';
  }
}

function closeChatView() {
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

  const now = new Date();
  const time = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

  currentChat.messages.push({ type: 'sent', text, time });
  currentChat.lastMsg = text;
  currentChat.time = time;

  input.value = '';

  // Re-render
  const msgContainer = document.getElementById('chatMessages');
  msgContainer.innerHTML = currentChat.messages.map(renderMessage).join('');
  msgContainer.scrollTop = msgContainer.scrollHeight;

  // Simulate reply after 2s
  setTimeout(() => {
    const replies = [
      'Danke für die Nachricht! Ich melde mich in Kürze.',
      'Klingt super! Lass uns die Details besprechen.',
      'Perfekt, ich schaue mir das an und sage dir Bescheid!',
      'Freut mich! Ich habe da ein paar tolle Ideen für euch.',
      'Sehr gerne! Wann wäre ein guter Zeitpunkt für ein Gespräch auf der Plattform?'
    ];
    const reply = replies[Math.floor(Math.random() * replies.length)];
    const replyTime = new Date();
    const rTime = replyTime.getHours().toString().padStart(2, '0') + ':' + replyTime.getMinutes().toString().padStart(2, '0');

    currentChat.messages.push({ type: 'received', text: reply, time: rTime });
    currentChat.lastMsg = reply;

    const mc = document.getElementById('chatMessages');
    mc.innerHTML = currentChat.messages.map(renderMessage).join('');
    mc.scrollTop = mc.scrollHeight;
  }, 2000);
}

function handleChatKeypress(e) {
  if (e.key === 'Enter') sendMessage();
}

function startChat() {
  if (!currentListing) return;
  navigateTo('messages');
  setTimeout(() => openChat(1), 100);
}

function startChatWithProvider() {
  navigateTo('messages');
  setTimeout(() => openChat(1), 100);
}

// ========== NEGOTIATION ==========
function openNegotiation() {
  if (!currentListing) return;

  document.getElementById('negListingInfo').innerHTML = `
    <img src="${currentListing.image}" alt="${currentListing.title}" />
    <div>
      <strong>${currentListing.title}</strong>
      <span>${currentListing.categoryLabel} · ${currentListing.location}</span>
    </div>
  `;
  document.getElementById('negOriginalPrice').value = currentListing.priceLabel;

  openModal('negotiationModal');
}

function submitNegotiation(e) {
  e.preventDefault();
  const price = document.getElementById('negOfferPrice').value;
  const message = document.getElementById('negMessage').value;

  closeModal('negotiationModal');
  showToast(`Angebot über ${price}€ wurde gesendet!`, 'gavel');

  // Add to chat
  if (DEMO_CHATS[0]) {
    DEMO_CHATS[0].messages.push(
      { type: 'offer', label: 'Dein Angebot', amount: price + '€', status: 'pending', statusLabel: 'Wartet auf Antwort' }
    );
    if (message) {
      const now = new Date();
      const time = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
      DEMO_CHATS[0].messages.push({ type: 'sent', text: message, time });
    }
    DEMO_CHATS[0].negotiation = { active: true, yourOffer: parseInt(price), counterOffer: null, status: 'sent' };
  }
}

function openNegotiationInChat() {
  openModal('counterOfferModal');
}

function openCounterOffer() {
  openModal('counterOfferModal');
}

function submitCounterOffer(e) {
  e.preventDefault();
  const amount = document.getElementById('counterOfferAmount').value;
  const msg = document.getElementById('counterOfferMsg').value;

  closeModal('counterOfferModal');

  if (currentChat) {
    const now = new Date();
    const time = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

    currentChat.messages.push(
      { type: 'offer', label: 'Dein Gegenangebot', amount: amount + '€', status: 'pending', statusLabel: 'Wartet auf Antwort' }
    );
    if (msg) {
      currentChat.messages.push({ type: 'sent', text: msg, time });
    }
    currentChat.negotiation.yourOffer = parseInt(amount);

    const mc = document.getElementById('chatMessages');
    mc.innerHTML = currentChat.messages.map(renderMessage).join('');
    mc.scrollTop = mc.scrollHeight;
  }

  showToast(`Gegenangebot über ${amount}€ gesendet!`, 'gavel');
}

function acceptOffer() {
  if (!currentChat) return;

  currentChat.messages.push(
    { type: 'system', text: '✅ Angebot angenommen! Der Preis wurde vereinbart.' }
  );
  currentChat.negotiation.active = false;
  document.getElementById('negotiationBanner').style.display = 'none';

  const mc = document.getElementById('chatMessages');
  mc.innerHTML = currentChat.messages.map(renderMessage).join('');
  mc.scrollTop = mc.scrollHeight;

  showToast('Angebot angenommen! 🎉', 'check_circle');
}

function declineOffer() {
  if (!currentChat) return;

  currentChat.messages.push(
    { type: 'system', text: '❌ Angebot abgelehnt.' }
  );
  currentChat.negotiation.active = false;
  document.getElementById('negotiationBanner').style.display = 'none';

  const mc = document.getElementById('chatMessages');
  mc.innerHTML = currentChat.messages.map(renderMessage).join('');
  mc.scrollTop = mc.scrollHeight;

  showToast('Angebot abgelehnt.', 'cancel');
}

// ========== PROFILAUFTRITT ==========
function renderDashboard() {
  if (!currentUser) return;

  // --- Cover ---
  var coverEl = document.getElementById('profileCover');
  if (currentUser.coverUrl) {
    coverEl.style.backgroundImage = 'url(' + currentUser.coverUrl + ')';
  } else {
    coverEl.style.backgroundImage = 'none';
  }

  // --- Avatar ---
  var avatarUrl = currentUser.photoUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(currentUser.name || 'user');
  document.getElementById('profileAvatar').src = avatarUrl;
  var navAvatar = document.querySelector('#avatarBtn img');
  if (navAvatar) navAvatar.src = avatarUrl;

  // --- Name, Tagline, Location ---
  document.getElementById('profileDisplayName').textContent = currentUser.name || 'Dein Name';
  var taglineParts = [];
  if (currentUser.tagline) taglineParts.push(currentUser.tagline);
  if (currentUser.location) taglineParts.push(currentUser.location);
  document.getElementById('profileDisplayTagline').textContent = taglineParts.join(' · ') || 'Füge einen Slogan hinzu';

  // Input fields
  document.getElementById('profileName').value = currentUser.name || '';
  document.getElementById('profileTagline').value = currentUser.tagline || '';
  document.getElementById('profileLocation').value = currentUser.location || '';
  document.getElementById('profileBio').value = currentUser.bio || '';
  document.getElementById('profileEmail').value = currentUser.email || '';
  document.getElementById('profileRole').value = currentUser.role || '';

  // --- Role & Location badges ---
  document.getElementById('profileDisplayRole').innerHTML =
    '<span class="material-icons-round">badge</span> ' + (currentUser.role || 'Mitglied');
  document.getElementById('profileDisplayLocation').innerHTML =
    '<span class="material-icons-round">location_on</span> ' + (currentUser.location || 'Nicht angegeben');

  // --- Bio ---
  var bioText = currentUser.bio || 'Erzähle potenziellen Kunden etwas über dich, deine Erfahrung und was dich besonders macht...';
  document.getElementById('profileDisplayBio').textContent = bioText;

  // --- Stats ---
  document.getElementById('profileStatViews').textContent = '1.240';
  var userListings = LISTINGS.filter(function(l) { return l.providerId === 1; });
  document.getElementById('profileStatListings').textContent = userListings.length;
  document.getElementById('profileStatBookings').textContent = '15';
  document.getElementById('profileStatRating').textContent = '4.8 ★';

  // --- Gallery ---
  var galleryDisplay = document.getElementById('profileGalleryDisplay');
  var galleryEmpty = document.getElementById('profileGalleryEmpty');
  if (currentUser.gallery && currentUser.gallery.length > 0) {
    if (galleryEmpty) galleryEmpty.style.display = 'none';
    var imgs = currentUser.gallery.map(function(src) {
      return '<img src="' + src + '" alt="Galerie" loading="lazy" />';
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
        div.innerHTML = '<img src="' + src + '" alt="Galerie" />' +
          '<button onclick="removeGalleryItem(this)"><span class="material-icons-round">close</span></button>';
        galleryPreview.appendChild(div);
      });
    }
  }

  // --- Services (from user listings) ---
  var servicesGrid = document.getElementById('profileServicesGrid');
  var servicesEmpty = document.getElementById('profileServicesEmpty');
  if (userListings.length > 0) {
    if (servicesEmpty) servicesEmpty.style.display = 'none';
    servicesGrid.innerHTML = userListings.map(function(l) {
      return '<div class="profile-service-card" onclick="navigateTo(\'detail\', ' + l.id + ')">' +
        '<h4>' + l.title + '</h4>' +
        '<div class="service-category">' + l.categoryLabel + ' · ' + l.location + '</div>' +
        '<div class="service-price">ab ' + l.price + '€ <span>/ ' + (l.priceModel || 'Pro Event') + '</span></div>' +
        '</div>';
    }).join('');
  } else {
    if (servicesEmpty) servicesEmpty.style.display = 'block';
    servicesGrid.innerHTML = '';
  }

  // --- Reviews ---
  var reviewsDisplay = document.getElementById('profileReviewsDisplay');
  if (DEMO_REVIEWS && DEMO_REVIEWS.length > 0) {
    reviewsDisplay.innerHTML = DEMO_REVIEWS.slice(0, 4).map(function(r) {
      return '<div class="review-card">' +
        '<img src="https://api.dicebear.com/7.x/avataaars/svg?seed=' + r.avatar + '" alt="' + r.name + '" class="review-avatar" />' +
        '<div class="review-content">' +
          '<div class="review-top"><strong>' + r.name + '</strong><span>' + r.date + '</span></div>' +
          '<div class="review-stars">' + '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating) + '</div>' +
          '<p class="review-text">' + r.text + '</p>' +
        '</div></div>';
    }).join('');
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
    if (field === 'name') document.getElementById('profileName').value = currentUser.name || '';
    if (field === 'tagline') {
      document.getElementById('profileTagline').value = currentUser.tagline || '';
      document.getElementById('profileLocation').value = currentUser.location || '';
    }
    if (field === 'bio') document.getElementById('profileBio').value = currentUser.bio || '';
  }
}

function saveFieldInline(field) {
  if (!currentUser) return;
  switch (field) {
    case 'name':
      currentUser.name = document.getElementById('profileName').value.trim();
      break;
    case 'tagline':
      currentUser.tagline = document.getElementById('profileTagline').value.trim();
      currentUser.location = document.getElementById('profileLocation').value.trim();
      break;
    case 'bio':
      currentUser.bio = document.getElementById('profileBio').value.trim();
      break;
    case 'gallery':
      var galleryImgs = document.querySelectorAll('#galleryPreview .upload-preview-item img');
      currentUser.gallery = Array.from(galleryImgs).map(function(img) { return img.src; });
      break;
    case 'services':
      break;
  }
  var editEl = document.getElementById('edit' + field.charAt(0).toUpperCase() + field.slice(1));
  if (editEl) editEl.style.display = 'none';
  renderDashboard();
  showToast('Gespeichert! ✅', 'check_circle');
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

  // Auto-calculate duration from time fields
  var timeFrom = document.getElementById('createTimeFrom');
  var timeTo = document.getElementById('createTimeTo');
  var durationInput = document.getElementById('createDuration');
  function calcDuration() {
    if (!timeFrom || !timeTo || !durationInput) return;
    var from = timeFrom.value, to = timeTo.value;
    if (!from || !to) return;
    var fParts = from.split(':'), tParts = to.split(':');
    var fMin = parseInt(fParts[0]) * 60 + parseInt(fParts[1]);
    var tMin = parseInt(tParts[0]) * 60 + parseInt(tParts[1]);
    var diff = tMin - fMin;
    if (diff <= 0) diff += 24 * 60;
    durationInput.value = Math.round(diff / 60 * 10) / 10;
  }
  if (timeFrom) timeFrom.addEventListener('change', calcDuration);
  if (timeTo) timeTo.addEventListener('change', calcDuration);
  calcDuration();
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

// Category → label mapping
const CATEGORY_LABELS = {
  dj: 'DJ & Musik', catering: 'Catering', foto: 'Fotografie',
  florist: 'Floristik', location: 'Location', licht: 'Licht & Technik',
  pyro: 'Pyrotechnik', deko: 'Dekoration', planung: 'Eventplanung',
  moderation: 'Moderation'
};

// Default placeholder images per category (Pexels)
const CATEGORY_DEFAULT_IMAGES = {
  dj:         ['2111015','2034851','1540406','1105666','2747449'],
  catering:   ['587741','5638732','1267320','958545','1199957'],
  florist:    ['931177','1697912','36764','1408221','2307040'],
  licht:      ['1763075','3052361','1190298','2747446','2263436'],
  pyro:       ['1387577','2526105','1573225','63332','1071882'],
  foto:       ['1983037','3408744','212372','1264210','1787235'],
  location:   ['169198','265920','1114425','260922','1488267'],
  deko:       ['1729797','2072175','2306281','3171837','1405528'],
  planung:    ['3184465','2833037','3184292','416405','5676744'],
  moderation: ['2774556','3321793','2608517','7648480','6953868']
};

function pexelsUrl(id, w, h) {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}&h=${h}&dpr=1`;
}

function submitListing(e) {
  if (e && e.preventDefault) e.preventDefault();

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
  const region = document.getElementById('createRegion').value.trim() || 'Deutschland';
  const selectedTags = document.querySelectorAll('#createFeatureTags .feature-tag.selected');
  const features = selectedTags.length > 0
    ? Array.from(selectedTags).map(function(btn) { return btn.textContent.trim(); })
    : ['Individuelle Absprache'];

  // Tags from checkboxes
  const tagEls = document.querySelectorAll('#createTags input[type=checkbox]:checked');
  const tags = Array.from(tagEls).map(el => el.value);

  // Uploaded images (data-URLs from preview) or default per category
  const uploadedImgs = Array.from(document.querySelectorAll('#uploadPreview .upload-preview-item img')).map(img => img.src);
  const catImgIds = CATEGORY_DEFAULT_IMAGES[category] || CATEGORY_DEFAULT_IMAGES['dj'];
  let mainImage, galleryImages;
  if (uploadedImgs.length > 0) {
    mainImage = uploadedImgs[0];
    galleryImages = uploadedImgs.length >= 2 ? uploadedImgs : [uploadedImgs[0], ...catImgIds.slice(1).map(id => pexelsUrl(id, 600, 400))];
  } else {
    mainImage = pexelsUrl(catImgIds[0], 600, 400);
    galleryImages = catImgIds.map(id => pexelsUrl(id, 600, 400));
  }

  // Extract city from region
  const city = region.split(/[,&·–-]/)[0].trim();

  // Build price label
  const priceLabel = price > 0 ? `ab ${price}€ / ${priceModel.replace('Pro ','').replace('Pauschal','Pauschal')}` : 'Auf Anfrage';

  // Generate unique ID
  const newId = Math.max(...LISTINGS.map(l => l.id)) + 1;

  const newListing = {
    id: newId,
    providerId: newId,
    title: title,
    category: category,
    categoryLabel: CATEGORY_LABELS[category] || category,
    location: city,
    region: region,
    price: price,
    priceLabel: priceLabel,
    rating: 5.0,
    reviews: 0,
    image: mainImage,
    images: galleryImages,
    providerName: (currentUser && currentUser.name) ? currentUser.name : 'Neuer Anbieter',
    providerImg: (currentUser && currentUser.photoUrl) ? currentUser.photoUrl : 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (currentUser ? encodeURIComponent(currentUser.name) : 'user' + newId),
    providerSince: new Date().getFullYear().toString(),
    description: `<p>${description.replace(/\n/g, '</p><p>')}</p>`,
    features: features,
    tags: tags.length > 0 ? tags : ['Party'],
    badge: 'Neu',
    negotiable: true
  };

  // If editing an existing listing, remove the old one before adding the updated version
  if (window._editingListingId) {
    var editIdx = LISTINGS.findIndex(function(l) { return l.id === window._editingListingId; });
    if (editIdx !== -1) LISTINGS.splice(editIdx, 1);
    window._editingListingId = null;
  }

  // Add to global listings array (at the beginning so it shows first)
  LISTINGS.unshift(newListing);

  // Also register in map coords if city is known
  try {
    if (typeof CITY_COORDS !== 'undefined' && CITY_COORDS[city]) {
      // already exists
    } else if (typeof CITY_PROXIMITY !== 'undefined' && CITY_PROXIMITY[city]) {
      CITY_COORDS[city] = CITY_PROXIMITY[city];
    }
  } catch(err) { /* coords not yet available */ }

  // Reset the form
  document.getElementById('createListingForm').reset();
  document.getElementById('uploadPreview').innerHTML = '';
  // Reset feature tags
  document.querySelectorAll('#createFeatureTags .feature-tag').forEach(function(t) { t.classList.remove('selected'); });
  // Remove custom-added tags
  document.querySelectorAll('#createFeatureTags .feature-tag-custom-item').forEach(function(t) { t.remove(); });
  // Reset to step 1
  document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
  document.getElementById('step1').classList.add('active');

  // Show success toast and navigate to the new listing detail
  var successMsg = isEventPlaner() ? 'Event erfolgreich veröffentlicht! 🎉' : 'Inserat erfolgreich veröffentlicht! 🎉';
  showToast(successMsg, 'check_circle');
  setTimeout(function() { navigateTo('detail', newId); }, 1200);
}

function handleUpload(input) {
  const preview = document.getElementById('uploadPreview');
  const files = input.files;

  for (let file of files) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const div = document.createElement('div');
      div.className = 'upload-preview-item';
      div.innerHTML = `
        <img src="${e.target.result}" alt="Preview" />
        <button onclick="this.parentElement.remove()">
          <span class="material-icons-round">close</span>
        </button>
      `;
      preview.appendChild(div);
    };
    reader.readAsDataURL(file);
  }
}

// ========== PROFILE UPLOADS ==========
function handleProfilePhoto(input) {
  if (!input.files || !input.files[0]) return;
  var file = input.files[0];
  if (file.size > 5 * 1024 * 1024) {
    showToast('Bild zu groß! Max. 5MB', 'error');
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    document.getElementById('profileAvatar').src = e.target.result;
    // Update nav avatar too
    var navAvatar = document.querySelector('#avatarBtn img');
    if (navAvatar) navAvatar.src = e.target.result;
    if (currentUser) currentUser.photoUrl = e.target.result;
    showToast('Profilbild aktualisiert! 📸', 'camera_alt');
  };
  reader.readAsDataURL(file);
}

function handleCoverUpload(input) {
  if (!input.files || !input.files[0]) return;
  var file = input.files[0];
  if (file.size > 5 * 1024 * 1024) {
    showToast('Bild zu groß! Max. 5MB', 'error');
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    var cover = document.querySelector('.profile-cover');
    if (cover) cover.style.backgroundImage = 'url(' + e.target.result + ')';
    if (currentUser) currentUser.coverUrl = e.target.result;
    showToast('Cover-Bild hochgeladen! 🖼️', 'panorama');
  };
  reader.readAsDataURL(file);
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

  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    if (file.size > 5 * 1024 * 1024) {
      showToast(file.name + ' ist zu groß (max. 5MB)', 'error');
      continue;
    }
    (function(f) {
      var reader = new FileReader();
      reader.onload = function(e) {
        var div = document.createElement('div');
        div.className = 'upload-preview-item';
        div.innerHTML = '<img src="' + e.target.result + '" alt="Galerie" />' +
          '<button onclick="removeGalleryItem(this)"><span class="material-icons-round">close</span></button>';
        preview.appendChild(div);
        updateGalleryCount();
      };
      reader.readAsDataURL(f);
    })(file);
  }
  // Reset input so same file can be selected again
  input.value = '';
  showToast('Bilder hochgeladen! 📸', 'add_photo_alternate');
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
  initPasswordFields();
  initDragScroll();
});

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
}

function renderFavorites() {
  const grid = document.getElementById('favoritesGrid');
  const emptyState = document.getElementById('favoritesEmpty');
  const favListings = LISTINGS.filter(l => favorites.has(l.id));

  if (favListings.length === 0) {
    grid.style.display = 'none';
    emptyState.style.display = 'flex';
  } else {
    grid.style.display = '';
    emptyState.style.display = 'none';
    grid.innerHTML = favListings.map(renderListingCard).join('');
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

    var events = DEMO_EVENTS;
    if (events.length === 0) {
      grid.style.display = 'none';
      emptyState.style.display = 'flex';
    } else {
      grid.style.display = '';
      emptyState.style.display = 'none';
      grid.innerHTML = events.map(function(evt) {
        var statusClass = evt.status === 'In Planung' ? 'status-active' : (evt.status === 'Offen' ? 'status-pending' : 'status-completed');
        var servicesHTML = evt.bookedServices.map(function(s) {
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
            '<div style="margin-top:8px;border-top:1px solid var(--border-light);padding-top:8px;">' +
              '<strong style="font-size:0.78rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--dark);">Gebuchte Services</strong>' +
              servicesHTML +
            '</div>' +
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
  } else {
    // === DIENSTLEISTER VIEW ===
    if (header) header.textContent = 'Meine Inserate';
    if (createBtn) createBtn.innerHTML = '<span class="material-icons-round">add_circle</span> Neues Inserat';
    if (emptyTitle) emptyTitle.textContent = 'Noch keine Inserate';
    if (emptyText) emptyText.textContent = 'Erstelle dein erstes Inserat und erreiche tausende potenzielle Kunden.';
    if (emptyBtn) emptyBtn.innerHTML = '<span class="material-icons-round">add_circle</span> Jetzt Inserat erstellen';

    var userName = currentUser ? currentUser.name : null;
    var myListings = userName
      ? LISTINGS.filter(function(l) { return l.providerName === userName; })
      : [];

    // If no user-created listings, show demo for logged-in users
    if (myListings.length === 0 && isLoggedIn) {
      myListings = LISTINGS.slice(0, 3);
    }

    if (myListings.length === 0) {
      grid.style.display = 'none';
      emptyState.style.display = 'flex';
    } else {
      grid.style.display = '';
      emptyState.style.display = 'none';
      grid.innerHTML = myListings.map(function(l) {
        return '<div class="my-listing-card">' +
          '<div class="my-listing-img">' +
            '<img src="' + l.image + '" alt="' + l.title + '" />' +
            '<span class="status-badge status-active">Aktiv</span>' +
          '</div>' +
          '<div class="my-listing-info">' +
            '<h3>' + l.title + '</h3>' +
            '<p>' + l.categoryLabel + ' · ' + l.location + '</p>' +
            '<p class="my-listing-price">' + l.priceLabel + '</p>' +
            '<div class="my-listing-stats">' +
              '<span><span class="material-icons-round">star</span> 0/5</span>' +
              '<span><span class="material-icons-round">rate_review</span> 0 Bewertungen</span>' +
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
}

function editListing(listingId) {
  var listing = LISTINGS.find(function(l) { return l.id === listingId; });
  if (!listing) return;

  // Store the ID of the listing being edited so submitListing can replace it
  window._editingListingId = listingId;

  // Navigate to create-listing form and prefill values
  navigateTo('create-listing');

  // Prefill form fields
  document.getElementById('createTitle').value = listing.title;
  document.getElementById('createCategory').value = listing.category;
  document.getElementById('createDescription').value = listing.description.replace(/<\/?p>/g, '\n').replace(/<\/?h3>/g, '').trim();
  document.getElementById('createPrice').value = listing.price;
  document.getElementById('createRegion').value = listing.region || listing.location;

  showToast('Inserat wird bearbeitet – speichere es erneut.', 'edit');
}

function deleteListing(listingId) {
  if (!confirm('Möchtest du dieses Inserat wirklich löschen?')) return;

  var idx = LISTINGS.findIndex(function(l) { return l.id === listingId; });
  if (idx !== -1) {
    LISTINGS.splice(idx, 1);
    renderMyListings();
    showToast('Inserat gelöscht.', 'delete');
  }
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

  var now = new Date();
  var dateStr = MONTH_NAMES[now.getMonth()] + ' ' + now.getFullYear();

  var reviewerName = currentUser ? currentUser.name : 'Anonym';
  var avatarSeed = currentUser ? encodeURIComponent(currentUser.name) : 'anon';

  var newReview = {
    name: reviewerName,
    avatar: avatarSeed,
    rating: selectedRating,
    date: dateStr,
    text: text
  };

  // Store the review
  if (!userReviews[currentListing.id]) {
    userReviews[currentListing.id] = [];
  }
  userReviews[currentListing.id].push(newReview);

  // Update listing review count and recalculate average rating
  currentListing.reviews += 1;
  var allReviews = getAllReviewsForListing(currentListing.id);
  var totalRating = allReviews.reduce(function(sum, r) { return sum + r.rating; }, 0);
  currentListing.rating = Math.round((totalRating / allReviews.length) * 10) / 10;

  // Re-render reviews on the detail page
  renderDetailReviews(currentListing);

  // Update meta info
  document.getElementById('detailRating').textContent = currentListing.rating;
  document.getElementById('detailReviewCount').textContent = '(' + currentListing.reviews + ' Bewertungen)';

  closeModal('reviewModal');
  showToast('Bewertung veröffentlicht! ⭐', 'star');
}

function getAllReviewsForListing(listingId) {
  var reviews = DEMO_REVIEWS.slice();
  if (userReviews[listingId]) {
    reviews = userReviews[listingId].concat(reviews);
  }
  return reviews;
}

function renderDetailReviews(listing) {
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
        '<img src="https://api.dicebear.com/7.x/avataaars/svg?seed=' + r.avatar + '" alt="' + r.name + '" class="review-avatar" />' +
        '<div class="review-content">' +
          '<div class="review-top">' +
            '<strong>' + r.name + '</strong>' +
            '<span>' + r.date + '</span>' +
          '</div>' +
          '<div class="review-stars">' + '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating) + '</div>' +
          '<p class="review-text">' + r.text + '</p>' +
        '</div>' +
      '</div>';
    }).join('');
  }
}

// ========== AUTH ==========
var currentUser = null;
var _wpNonce = (typeof eventboerseApi !== 'undefined') ? eventboerseApi.nonce : '';

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
}

function applyLogout() {
  isLoggedIn = false;
  currentUser = null;
  document.getElementById('loggedOutMenu').style.display = 'block';
  document.getElementById('loggedInMenu').style.display = 'none';
  document.getElementById('userMenu').classList.remove('show');
  var navAvatar = document.querySelector('#avatarBtn img');
  if (navAvatar) navAvatar.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1';
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
    var u = eventboerseApi.user;
    currentUser = {
      id: u.id,
      name: (u.first_name + ' ' + u.last_name).trim(),
      email: u.email,
      role: u.role || 'Event-Planer',
      tagline: '',
      location: '',
      bio: ''
    };
    applyLogin();
    return;
  }
  // Fallback: REST /me prüfen (z. B. wenn aus Cache geladen)
  fetch(_apiUrl('me'), { credentials: 'same-origin', headers: _apiHeaders() })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data && data.loggedIn) {
        _wpNonce = data.nonce || _wpNonce;
        currentUser = {
          id: data.user_id,
          name: (data.first_name + ' ' + data.last_name).trim(),
          email: data.email,
          role: data.role || 'Event-Planer',
          tagline: '',
          location: '',
          bio: ''
        };
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
    var response = await fetch(_apiUrl('login'), {
      method: 'POST',
      credentials: 'same-origin',
      headers: _apiHeaders(),
      body: JSON.stringify({ email: email, password: password })
    });
    var data = await response.json();

    if (response.ok) {
      _wpNonce = data.nonce || _wpNonce;
      currentUser = {
        id: data.user_id,
        name: ((data.first_name || '') + ' ' + (data.last_name || '')).trim(),
        email: data.email,
        role: data.role || 'Event-Planer',
        tagline: '',
        location: '',
        bio: ''
      };
      _setBtnLoading(submitBtn, false);
      closeModal('loginModal');
      form.reset();
      applyLogin();
      showToast('Willkommen zurück, ' + (data.first_name || currentUser.name) + '!', 'waving_hand');
    } else {
      _setBtnLoading(submitBtn, false);
      var msg = data.message || 'Login fehlgeschlagen.';
      // Zeige Fehler im Passwort-Feld-Bereich
      _setFieldError('loginPassword', msg);
    }
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
      _wpNonce = data.nonce || _wpNonce;
      currentUser = {
        id: data.user_id,
        name: (firstName + ' ' + lastName).trim(),
        email: email,
        role: data.role || (role === 'provider' ? 'Dienstleister' : 'Event-Planer'),
        tagline: '',
        location: '',
        bio: ''
      };
      _setBtnLoading(submitBtn, false);
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
  currentUser.tagline = document.getElementById('profileTagline').value.trim();
  currentUser.location = document.getElementById('profileLocation').value.trim();
  currentUser.bio = document.getElementById('profileBio').value.trim();
  var galleryImgs = document.querySelectorAll('#galleryPreview .upload-preview-item img');
  currentUser.gallery = Array.from(galleryImgs).map(function(img) { return img.src; });
  var avatarSrc = document.getElementById('profileAvatar').src;
  var navAvatar = document.querySelector('#avatarBtn img');
  if (navAvatar) navAvatar.src = avatarSrc;
  renderDashboard();
  showToast('Profil gespeichert! ✅', 'check_circle');
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

  // Set min date for date inputs to today
  const today = new Date().toISOString().split('T')[0];
  document.querySelectorAll('input[type="date"]').forEach(input => {
    input.min = today;
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
