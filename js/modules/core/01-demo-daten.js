// ========== DEMO DATA ==========
const LISTINGS = [
  {
    id: 1, providerId: 90001,
    title: 'DJ SoundMaster Berlin',
    category: 'dj', categoryLabel: 'DJ & Musik',
    location: 'Berlin', stadtteil: 'Kreuzberg', koordinaten: [52.4987, 13.418], region: 'Berlin & Brandenburg',
    price: 450, priceLabel: 'ab 450€ / Event',
    rating: 4.9, reviews: 127,
    image: 'https://images.pexels.com/photos/2111015/pexels-photo-2111015.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
    images: [
      'https://images.pexels.com/photos/2111015/pexels-photo-2111015.jpeg?auto=compress&cs=tinysrgb&w=800&h=500&dpr=1',
      'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/1540406/pexels-photo-1540406.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
      'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1',
    ],
    providerName: 'Max Beats',
    providerImg: ebAvatar('dj1', 'Max Beats'),
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
    location: 'Hamburg', stadtteil: 'St. Pauli', koordinaten: [53.557, 9.964], region: 'Hamburg & Norddeutschland',
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
    providerImg: ebAvatar('elena', 'Elena Schmitt'),
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
    location: 'Düsseldorf', stadtteil: 'Altstadt', koordinaten: [51.226, 6.7724], region: 'NRW',
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
    providerImg: ebAvatar('sabine', 'Sabine Rhein'),
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
    location: 'München', stadtteil: 'Schwabing', koordinaten: [48.165, 11.586], region: 'München & Oberbayern',
    price: 800, priceLabel: 'ab 800€ / Event',
    rating: 5.0, reviews: 64,
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&h=400&q=80',
    images: [
      'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&h=500&q=80',
      'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=600&h=400&q=80',
      'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=600&h=400&q=80',
      'https://images.unsplash.com/photo-1530977875151-aacc6116c9c8?auto=format&fit=crop&w=600&h=400&q=80',
      'https://images.unsplash.com/photo-1561128290-005859246c0a?auto=format&fit=crop&w=600&h=400&q=80',
    ],
    providerName: 'Lisa Blumen',
    providerImg: ebAvatar('lisa', 'Lisa Blumen'),
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
    location: 'Frankfurt', stadtteil: 'Sachsenhausen', koordinaten: [50.1, 8.685], region: 'Rhein-Main',
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
    providerImg: ebAvatar('timo', 'Timo Licht'),
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
    location: 'Düsseldorf', stadtteil: 'Oberkassel', koordinaten: [51.233, 6.753], region: 'NRW',
    price: 2500, priceLabel: 'ab 2.500€ / Show',
    rating: 4.9, reviews: 41,
    image: 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?auto=format&fit=crop&w=600&h=400&q=80',
    images: [
      'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?auto=format&fit=crop&w=800&h=500&q=80',
      'https://images.unsplash.com/photo-1481931715705-36f5f6ee6b73?auto=format&fit=crop&w=600&h=400&q=80',
      'https://images.unsplash.com/photo-1514912885225-5c9ec3a31eed?auto=format&fit=crop&w=600&h=400&q=80',
      'https://images.unsplash.com/photo-1546268060-2592ff93ee24?auto=format&fit=crop&w=600&h=400&q=80',
      'https://images.unsplash.com/photo-1517816743773-6e0fd518b4a6?auto=format&fit=crop&w=600&h=400&q=80',
    ],
    providerName: 'Oliver Pyro',
    providerImg: ebAvatar('oliver', 'Oliver Pyro'),
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
    location: 'Berlin', stadtteil: 'Prenzlauer Berg', koordinaten: [52.5389, 13.4244], region: 'Berlin & Brandenburg',
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
    providerImg: ebAvatar('anna', 'Anna Foto'),
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
    location: 'Starnberg', stadtteil: 'Zentrum', koordinaten: [47.9983, 11.3408], region: 'München & Oberbayern',
    price: 3500, priceLabel: 'ab 3.500€ / Event',
    rating: 4.9, reviews: 38,
    image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=600&h=400&q=80',
    images: [
      'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&h=500&q=80',
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&h=400&q=80',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&h=400&q=80',
      'https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?auto=format&fit=crop&w=600&h=400&q=80',
      'https://images.unsplash.com/photo-1542665952-14513db15293?auto=format&fit=crop&w=600&h=400&q=80',
    ],
    providerName: 'Schloss Management',
    providerImg: ebAvatar('schloss', 'Schloss Management'),
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
    location: 'Köln', stadtteil: 'Ehrenfeld', koordinaten: [50.952, 6.918], region: 'NRW',
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
    providerImg: ebAvatar('sophie', 'Sophie Deko'),
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
    location: 'Stuttgart', stadtteil: 'Bad Cannstatt', koordinaten: [48.806, 9.217], region: 'Baden-Württemberg',
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
    providerImg: ebAvatar('thomas', 'Thomas Meier'),
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
    location: 'München', stadtteil: 'Haidhausen', koordinaten: [48.13, 11.596], region: 'Bayern',
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
    providerImg: ebAvatar('stefan', 'Stefan MC'),
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
    location: 'Düsseldorf', stadtteil: 'Flingern', koordinaten: [51.229, 6.806], region: 'Nordrhein-Westfalen',
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
    providerImg: ebAvatar('lisaspa', 'Lisa & Tom Wellness'),
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
    location: 'Köln', stadtteil: 'Südstadt', koordinaten: [50.923, 6.954], region: 'NRW',
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
    providerImg: ebAvatar('niko', 'Niko & Band'),
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
    location: 'Frankfurt', stadtteil: 'Bockenheim', koordinaten: [50.123, 8.642], region: 'Rhein-Main',
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
    providerImg: ebAvatar('julian', 'Julian Film'),
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
    location: 'Leipzig', stadtteil: 'Plagwitz', koordinaten: [51.328, 12.33], region: 'Sachsen',
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
    providerImg: ebAvatar('garten', 'Gartenpark Team'),
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

// Die redaktionellen Demo-Inserate wurden mit generativer KI erstellt. Die
// Angabe sitzt als dezenter Text am Inserat; die Bilder selbst bleiben frei.
LISTINGS.forEach(function(listing) {
  listing.aiTextDisclosure = 'generated';
  listing.aiMediaDisclosure = 'generated';
});

// Auto-Inject logical price ranges (priceMax) for demo listings + rebuild priceLabel as range.
// Multiplikator pro Preismodell: realistische Spannen für DE-Eventmarkt.
(function injectDemoPriceRanges(){
  try {
    if (!Array.isArray(LISTINGS)) return;
    var multByModel = {
      'Pro Event':   1.7,
      'Pro Stunde':  1.6,
      'Pro Person':  1.8,
      'Pauschal':    1.5,
      'Auf Anfrage': 1.6
    };
    LISTINGS.forEach(function(l){
      if (!l || !l.price || l.priceMax) return;
      var pm = (l.priceLabel || '').match(/\/\s*(.+)$/);
      var model = pm ? pm[1].trim() : (l.priceModel || 'Event');
      var mult = 1.7;
      Object.keys(multByModel).forEach(function(k){
        if (model.indexOf(k.replace('Pro ','').replace('Pauschal','')) !== -1 || model === k) mult = multByModel[k];
      });
      // Round to nice numbers
      var raw = l.price * mult;
      var step = raw < 100 ? 5 : raw < 500 ? 25 : raw < 2000 ? 50 : 100;
      var max = Math.round(raw / step) * step;
      l.priceMax = max;
      // Format with German thousand separators
      var fmt = function(n){ return n.toLocaleString('de-DE'); };
      l.priceLabel = fmt(l.price) + '–' + fmt(max) + '€ / ' + model;
    });
  } catch(e) { console.warn('priceRange inject failed', e); }
})();

// Auto-Sync: Alle Demo-Provider-IDs aus LISTINGS in die Filter-Liste übernehmen,
// damit jedes hardcodierte Demo-Inserat (Bot-Account) automatisch ausgeblendet wird,
// wenn EB_HIDE_DEMO aktiv ist. So muss die Liste nie manuell gepflegt werden.
(function syncDemoProviderIdsFromListings(){
  try {
    if (!Array.isArray(LISTINGS)) return;
    var ids = Array.isArray(window.EB_DEMO_PROVIDER_IDS) ? window.EB_DEMO_PROVIDER_IDS.slice() : [];
    LISTINGS.forEach(function(l){
      var pid = l && (l.providerId != null ? l.providerId : (l.provider && l.provider.id));
      if (pid != null && !isNaN(+pid) && ids.indexOf(+pid) === -1) ids.push(+pid);
    });
    window.EB_DEMO_PROVIDER_IDS = ids;
  } catch(e) { /* fail-safe: kein Block, falls LISTINGS noch nicht da */ }
})();

// Vom Admin gelöschte Bilder aus den Demo-Listings entfernen (Reload-fest).
(function applyDemoImageBlocklist(){
  try { if (Array.isArray(LISTINGS)) _applyImageBlocklist(LISTINGS); } catch(e) {}
})();

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
    avatar: ebAvatar('dj1', 'DJ SoundMaster'),
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
    avatar: ebAvatar('elena', 'Elena'),
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
    avatar: ebAvatar('lisa', 'Lisa'),
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
    location: 'Berlin', stadtteil: 'Mitte', koordinaten: [52.52, 13.405],
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
    location: 'München', stadtteil: 'Sendling', koordinaten: [48.118, 11.542],
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
    location: 'Köln', stadtteil: 'Deutz', koordinaten: [50.938, 6.974],
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
