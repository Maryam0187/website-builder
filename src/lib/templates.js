/**
 * Business-type website templates.
 * Each template has a distinct visual layoutStyle (single-page scroll).
 * Cart/checkout is not built-in — commerce templates prompt clients to contact us.
 */

export const TEMPLATE_IDS = [
  "bakery",
  "clinic",
  "restaurant",
  "shop",
  "services",
  "portfolio",
  "realestate",
  "coaching",
  "events",
  "nonprofit",
  "company",
  "perfume",
  "other",
];

/** Map onboarding business_type values → template id */
export const BUSINESS_TYPE_TO_TEMPLATE = {
  bakery: "bakery",
  clinic: "clinic",
  restaurant: "restaurant",
  shop: "shop",
  services: "services",
  portfolio: "portfolio",
  realestate: "realestate",
  "real-estate": "realestate",
  coaching: "coaching",
  events: "events",
  nonprofit: "nonprofit",
  company: "company",
  perfume: "perfume",
  fragrance: "perfume",
  other: "other",
};

const img = (id, w = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=85`;

export const TEMPLATE_CATALOG = {
  bakery: {
    id: "bakery",
    label: "Bakery / cafe",
    description: "Editorial bakery look — oversized type and stacked photo bands.",
    commerce: false,
    dineOs: true,
    layoutStyle: "editorial",
    theme: {
      primary: "#6b3a1f",
      accent: "#1a120c",
      text: "#2c1810",
      muted: "#6b5344",
    },
    tagline: "Fresh baked daily",
    hero: {
      headline: (name) => name,
      subheadline:
        "Artisan breads, pastries, and coffee — stop by or message us for today’s specials.",
      cta: "See our menu",
      image: img("photo-1509440159596-0249088772ff", 2000),
    },
    aboutImage: img("photo-1555507036-ab1f4038808a", 2000),
    contactImage: img("photo-1495474472287-4d71bcdd2085", 2000),
    aboutBody: (name) =>
      `${name} is your neighborhood bakery. We bake from scratch and love serving regulars and first-time visitors alike.`,
    menuLabel: "Menu",
    menuItems: [
      {
        name: "Sourdough loaf",
        price: "$6",
        note: "Daily bake",
        image: img("photo-1549931319-a545dcf3bc73"),
      },
      {
        name: "Croissant",
        price: "$3.50",
        note: "Butter & almond",
        image: img("photo-1555507036-ab1f4038808a"),
      },
      {
        name: "Latte",
        price: "$4",
        note: "Hot or iced",
        image: img("photo-1495474472287-4d71bcdd2085"),
      },
    ],
    galleryLabel: "From the oven",
    galleryImages: [
      { caption: "Morning pastry case", image: img("photo-1558961363-fa8fdf82db35") },
      { caption: "Fresh baguettes", image: img("photo-1509440159596-0249088772ff") },
      { caption: "Coffee & cake", image: img("photo-1486427944299-d1955d23e34d") },
      { caption: "Cinnamon rolls", image: img("photo-1509365465985-25d11c17e812") },
      { caption: "Open kitchen", image: img("photo-1464349095431-e9a21285b5f3") },
      { caption: "Neighborhood favorite", image: img("photo-1578985545062-69928b1d9587") },
    ],
  },
  clinic: {
    id: "clinic",
    label: "Clinic / salon",
    description: "Calm split-panel clinic look with soft light and breathing room.",
    commerce: false,
    layoutStyle: "serene",
    theme: {
      primary: "#1f5c57",
      accent: "#e8f2f0",
      text: "#14302e",
      muted: "#5a736f",
    },
    tagline: "Care that feels personal",
    hero: {
      headline: (name) => name,
      subheadline:
        "Professional care in a calm space. View treatments and get in touch to book your next visit.",
      cta: "Book a meeting",
      image: img("photo-1560066984-138dadb4c035", 2000),
    },
    aboutImage: img("photo-1519494026892-80bbd2d6fd0d", 2000),
    contactImage: img("photo-1579684385127-1ef15d508118", 2000),
    aboutBody: (name) =>
      `${name} focuses on quality care and a welcoming experience. Tell clients your story and specialties here.`,
    menuLabel: "Services",
    menuItems: [
      {
        name: "Consultation",
        price: "From $40",
        note: "30 min",
        image: img("photo-1570172619644-dfd03ed5d881"),
      },
      {
        name: "Signature treatment",
        price: "From $80",
        note: "Most popular",
        image: img("photo-1540555700478-4be289fbecef"),
      },
      {
        name: "Follow-up visit",
        price: "From $50",
        note: "As needed",
        image: img("photo-1512290923902-8a9f81dc236c"),
      },
    ],
    galleryLabel: "Our space",
    galleryImages: [
      { caption: "Treatment room", image: img("photo-1519494026892-80bbd2d6fd0d") },
      { caption: "Calm waiting area", image: img("photo-1629909613654-28e377c37b09") },
      { caption: "Skincare ritual", image: img("photo-1570172619644-dfd03ed5d881") },
      { caption: "Fresh towels", image: img("photo-1540555700478-4be289fbecef") },
      { caption: "Natural light", image: img("photo-1512290923902-8a9f81dc236c") },
      { caption: "Detail care", image: img("photo-1487412947147-5cebf100ffc2") },
    ],
  },
  restaurant: {
    id: "restaurant",
    label: "Restaurant",
    description: "Dark dining theater — centered type and a dramatic menu list.",
    commerce: true,
    dineOs: true,
    layoutStyle: "theater",
    theme: {
      primary: "#c45c26",
      accent: "#0c0a09",
      text: "#f5f0eb",
      muted: "#a8a29e",
    },
    tagline: "Good food, good company",
    hero: {
      headline: (name) => name,
      subheadline:
        "Seasonal dishes and favorites. Browse the menu — contact us to enable full online ordering.",
      cta: "View menu",
      image: img("photo-1517248135467-4c7edcad34c4", 2000),
    },
    aboutImage: img("photo-1414235077428-338989a2e8c0", 2000),
    contactImage: img("photo-1559339352-11d035aa65de", 2000),
    aboutBody: (name) =>
      `${name} serves memorable meals with care. Share your chef’s story, hours, and what makes your kitchen special.`,
    menuLabel: "Menu",
    menuItems: [
      {
        name: "Chef’s special",
        price: "$18",
        note: "Today",
        image: img("photo-1546069901-ba9599a7e63c"),
      },
      {
        name: "House salad",
        price: "$12",
        note: "Vegetarian",
        image: img("photo-1512621776951-a57141f2eefd"),
      },
      {
        name: "Dessert plate",
        price: "$9",
        note: "Ask server",
        image: img("photo-1551024601-bec78aea704b"),
      },
    ],
    galleryLabel: "On the table",
    galleryImages: [
      { caption: "Tonight’s plating", image: img("photo-1414235077428-338989a2e8c0") },
      { caption: "Dining room", image: img("photo-1517248135467-4c7edcad34c4") },
      { caption: "Fresh ingredients", image: img("photo-1546069901-ba9599a7e63c") },
      { caption: "Dessert finish", image: img("photo-1551024601-bec78aea704b") },
      { caption: "Wine & share", image: img("photo-1559339352-11d035aa65de") },
      { caption: "Kitchen fire", image: img("photo-1556910103-1c02745aae4d") },
    ],
  },
  shop: {
    id: "shop",
    label: "Shop / store",
    description: "Retail-first layout with bold product grid and storefront energy.",
    commerce: true,
    layoutStyle: "retail",
    theme: {
      primary: "#0d9488",
      accent: "#0b1220",
      text: "#e2e8f0",
      muted: "#94a3b8",
    },
    tagline: "Find what you need",
    hero: {
      headline: (name) => name,
      subheadline:
        "Browse featured products below. Full shopping cart and checkout can be enabled — contact us to set it up.",
      cta: "Browse products",
      image: img("photo-1441986300917-64674bd600d8", 2000),
    },
    aboutImage: img("photo-1556740738-b6a63e27c4df", 2000),
    contactImage: img("photo-1528698827591-e19ccd7bc23d", 2000),
    aboutBody: (name) =>
      `${name} brings you products you can trust. Update this story with your brand promise and what you sell.`,
    menuLabel: "Products",
    menuItems: [
      {
        name: "Featured item",
        price: "$24",
        note: "Best seller",
        image: img("photo-1523275335684-37898b6baf30"),
      },
      {
        name: "Starter pack",
        price: "$39",
        note: "Great gift",
        image: img("photo-1483985988355-763728e1935b"),
      },
      {
        name: "Essentials kit",
        price: "$55",
        note: "Bundle",
        image: img("photo-1441984904996-e0b6ba687e04"),
      },
    ],
    galleryLabel: "In store",
    galleryImages: [
      { caption: "Front of house", image: img("photo-1441986300917-64674bd600d8") },
      { caption: "Shelf details", image: img("photo-1441984904996-e0b6ba687e04") },
      { caption: "Gift picks", image: img("photo-1483985988355-763728e1935b") },
      { caption: "Checkout moment", image: img("photo-1556740738-b6a63e27c4df") },
      { caption: "New arrivals", image: img("photo-1523275335684-37898b6baf30") },
      { caption: "Local finds", image: img("photo-1528698827591-e19ccd7bc23d") },
    ],
  },
  services: {
    id: "services",
    label: "Professional services",
    description: "Process-rail layout with numbered offers and polished workspace photos.",
    commerce: false,
    layoutStyle: "process",
    theme: {
      primary: "#2563eb",
      accent: "#0f172a",
      text: "#e2e8f0",
      muted: "#94a3b8",
    },
    tagline: "Clear expertise. Practical results.",
    hero: {
      headline: (name) => name,
      subheadline:
        "Professional services for clients who want clarity and results. Get in touch to start a conversation.",
      cta: "Get in touch",
      image: img("photo-1521737711867-e3b97375f902", 2000),
    },
    aboutImage: img("photo-1497366216548-37526070297c", 2000),
    contactImage: img("photo-1556761175-5973dc0f32e7", 2000),
    aboutBody: (name) =>
      `${name} helps clients solve real problems. Use this space for your credentials, process, and who you serve.`,
    menuLabel: "Services",
    menuItems: [
      {
        name: "Strategy session",
        price: "Custom",
        note: "Intro call",
        image: img("photo-1552664730-d307ca884978"),
      },
      {
        name: "Core package",
        price: "Custom",
        note: "Most clients",
        image: img("photo-1600880292203-757bb62b4baf"),
      },
      {
        name: "Retainer",
        price: "Custom",
        note: "Ongoing",
        image: img("photo-1454165804606-c3d57bc86b40"),
      },
    ],
    galleryLabel: "How we work",
    galleryImages: [
      { caption: "Workshop", image: img("photo-1552664730-d307ca884978") },
      { caption: "Client meeting", image: img("photo-1600880292203-757bb62b4baf") },
      { caption: "Focus time", image: img("photo-1454165804606-c3d57bc86b40") },
      { caption: "Studio desk", image: img("photo-1497366216548-37526070297c") },
      { caption: "Team sync", image: img("photo-1521737711867-e3b97375f902") },
      { caption: "Handshake", image: img("photo-1556761175-5973dc0f32e7") },
    ],
  },
  portfolio: {
    id: "portfolio",
    label: "Portfolio / freelancer",
    description: "Asymmetric folio layout — name-forward with a bento work grid.",
    commerce: false,
    layoutStyle: "folio",
    theme: {
      primary: "#84cc16",
      accent: "#0a0a0a",
      text: "#f4f4f5",
      muted: "#a1a1aa",
    },
    tagline: "Selected work & collaborations",
    hero: {
      headline: (name) => name,
      subheadline:
        "Designer, maker, or creative — show your best work and make it easy for clients to reach you.",
      cta: "View work",
      image: img("photo-1618005182384-a83a8bd57fbe", 2000),
    },
    aboutImage: img("photo-1558655146-d09347e92766", 2000),
    contactImage: img("photo-1517245386807-bb43f82c33c4", 2000),
    aboutBody: (name) =>
      `${name} is a creative practice focused on clear ideas and craft. Share your background, tools, and the kind of projects you love.`,
    menuLabel: "Services",
    menuItems: [
      {
        name: "Brand identity",
        price: "Project",
        note: "Logo & system",
        image: img("photo-1634942537034-2531766767d1"),
      },
      {
        name: "Web design",
        price: "Project",
        note: "Sites & product",
        image: img("photo-1460925895917-afdab827c52f"),
      },
      {
        name: "Creative direction",
        price: "Retainer",
        note: "Ongoing",
        image: img("photo-1558655146-9f40138edfeb"),
      },
    ],
    galleryLabel: "Selected work",
    galleryImages: [
      { caption: "Campaign system", image: img("photo-1618005182384-a83a8bd57fbe") },
      { caption: "Editorial layout", image: img("photo-1558655146-d09347e92766") },
      { caption: "Product UI", image: img("photo-1460925895917-afdab827c52f") },
      { caption: "Identity mark", image: img("photo-1634942537034-2531766767d1") },
      { caption: "Motion still", image: img("photo-1558655146-9f40138edfeb") },
      { caption: "Studio desk", image: img("photo-1517245386807-bb43f82c33c4") },
    ],
  },
  realestate: {
    id: "realestate",
    label: "Real estate",
    description: "Cinematic property showcase with parallax hero and listing cards.",
    commerce: false,
    layoutStyle: "estate",
    theme: {
      primary: "#c9a227",
      accent: "#0b1426",
      text: "#f1f5f9",
      muted: "#94a3b8",
    },
    tagline: "Homes with presence",
    hero: {
      headline: (name) => name,
      subheadline:
        "Find your next home or list with confidence. Browse featured properties and book a private showing.",
      cta: "See listings",
      image: img("photo-1600596542815-ffad4c1539a9", 2000),
    },
    aboutImage: img("photo-1560518883-ce09059eeffa", 2000),
    contactImage: img("photo-1600585154340-be6161a56a0c", 2000),
    aboutBody: (name) =>
      `${name} helps buyers and sellers move with clarity. Share your market focus, neighborhoods, and how you guide clients.`,
    menuLabel: "Featured homes",
    menuItems: [
      {
        name: "Garden terrace home",
        price: "$620k",
        note: "3 bed · city edge",
        image: img("photo-1600585154340-be6161a56a0c"),
      },
      {
        name: "Light-filled loft",
        price: "$485k",
        note: "2 bed · downtown",
        image: img("photo-1502672260266-1c1ef2d93688"),
      },
      {
        name: "Quiet family villa",
        price: "$890k",
        note: "4 bed · suburbs",
        image: img("photo-1600596542815-ffad4c1539a9"),
      },
    ],
    galleryLabel: "Neighborhoods",
    galleryImages: [
      { caption: "Tree-lined streets", image: img("photo-1560518883-ce09059eeffa") },
      { caption: "Evening facade", image: img("photo-1600585154340-be6161a56a0c") },
      { caption: "Open living", image: img("photo-1502672260266-1c1ef2d93688") },
      { caption: "Kitchen light", image: img("photo-1484154218962-a197022b5858") },
      { caption: "City skyline", image: img("photo-1449824913935-59a10b8d2000") },
      { caption: "Quiet courtyard", image: img("photo-1600566753190-17f0baa2a6c3") },
    ],
  },
  coaching: {
    id: "coaching",
    label: "Coaching / courses",
    description: "Mentor-focus layout with portrait hero and program rows.",
    commerce: false,
    layoutStyle: "mentor",
    theme: {
      primary: "#0f766e",
      accent: "#10201c",
      text: "#ecfdf5",
      muted: "#99b3a8",
    },
    tagline: "Clarity, momentum, results",
    hero: {
      headline: (name) => name,
      subheadline:
        "One-to-one coaching and practical programs that help people move forward with confidence.",
      cta: "Explore programs",
      image: img("photo-1573496359142-b8d87734a5a2", 2000),
    },
    aboutImage: img("photo-1522202176988-66273c2fd55f", 2000),
    contactImage: img("photo-1515187029135-18ee286d815b", 2000),
    aboutBody: (name) =>
      `${name} coaches people who want practical change. Share your method, who you serve, and what transformation looks like.`,
    menuLabel: "Programs",
    menuItems: [
      {
        name: "Discovery call",
        price: "Free",
        note: "30 min",
        image: img("photo-1515187029135-18ee286d815b"),
      },
      {
        name: "6-week intensive",
        price: "Apply",
        note: "Most popular",
        image: img("photo-1522202176988-66273c2fd55f"),
      },
      {
        name: "Group cohort",
        price: "Seasonal",
        note: "Limited seats",
        image: img("photo-1552664730-d307ca884978"),
      },
    ],
    galleryLabel: "Moments from the work",
    galleryImages: [
      { caption: "Deep focus session", image: img("photo-1573496359142-b8d87734a5a2") },
      { caption: "Workshop circle", image: img("photo-1522202176988-66273c2fd55f") },
      { caption: "Notebook planning", image: img("photo-1434030216411-0b793f4b4173") },
      { caption: "Quiet reflection", image: img("photo-1499750310107-5fef28a66643") },
      { caption: "Team breakthrough", image: img("photo-1552664730-d307ca884978") },
      { caption: "Celebration", image: img("photo-1515187029135-18ee286d815b") },
    ],
  },
  events: {
    id: "events",
    label: "Events / venues",
    description: "Night marquee energy with a schedule-style offer list.",
    commerce: true,
    layoutStyle: "marquee",
    theme: {
      primary: "#fb7185",
      accent: "#09090b",
      text: "#fafafa",
      muted: "#a1a1aa",
    },
    tagline: "Nights worth showing up for",
    hero: {
      headline: (name) => name,
      subheadline:
        "Venue, nightlife, or productions — show the atmosphere, the lineup, and how to book.",
      cta: "See what’s on",
      image: img("photo-1470229722913-7c0e2dbbafd3", 2000),
    },
    aboutImage: img("photo-1514525253161-7a46d19cd819", 2000),
    contactImage: img("photo-1492684223066-81342ee5ff30", 2000),
    aboutBody: (name) =>
      `${name} creates unforgettable nights. Share your vibe, capacity, and what makes guests come back.`,
    menuLabel: "Experiences",
    menuItems: [
      {
        name: "Private hire",
        price: "Quote",
        note: "Full venue",
        image: img("photo-1514525253161-7a46d19cd819"),
      },
      {
        name: "Ticketed night",
        price: "From $25",
        note: "Doors 9pm",
        image: img("photo-1470229722913-7c0e2dbbafd3"),
      },
      {
        name: "Daytime event",
        price: "Custom",
        note: "Brand / launch",
        image: img("photo-1492684223066-81342ee5ff30"),
      },
    ],
    galleryLabel: "Atmosphere",
    galleryImages: [
      { caption: "Main floor", image: img("photo-1470229722913-7c0e2dbbafd3") },
      { caption: "Stage lights", image: img("photo-1514525253161-7a46d19cd819") },
      { caption: "Crowd energy", image: img("photo-1492684223066-81342ee5ff30") },
      { caption: "VIP lounge", image: img("photo-1566737236500-c8ac43014a67") },
      { caption: "Detail set", image: img("photo-1501281668745-f7f57925c3b4") },
      { caption: "Afterglow", image: img("photo-1429962714451-bb934ecdc4ec") },
    ],
  },
  nonprofit: {
    id: "nonprofit",
    label: "Nonprofit / cause",
    description: "Story-band cause layout with warm impact photography.",
    commerce: false,
    layoutStyle: "cause",
    theme: {
      primary: "#0e7490",
      accent: "#f0f9ff",
      text: "#0c4a6e",
      muted: "#64748b",
    },
    tagline: "People first. Progress together.",
    hero: {
      headline: (name) => name,
      subheadline:
        "A clear home for your mission — who you help, how to join, and how supporters can take part.",
      cta: "Get involved",
      image: img("photo-1488521787991-ed7bbaae773c", 2000),
    },
    aboutImage: img("photo-1469571486292-0ba58a3f068b", 2000),
    contactImage: img("photo-1559027615-cd4628902d4a", 2000),
    aboutBody: (name) =>
      `${name} exists to create real change in the community. Share your mission, the people you serve, and how donations or volunteers help.`,
    menuLabel: "Ways to help",
    menuItems: [
      {
        name: "Volunteer",
        price: "Join",
        note: "Hands-on",
        image: img("photo-1559027615-cd4628902d4a"),
      },
      {
        name: "Donate",
        price: "Any amount",
        note: "Fuel the work",
        image: img("photo-1532629345422-7515f3d16bb6"),
      },
      {
        name: "Partner",
        price: "Talk to us",
        note: "Orgs & sponsors",
        image: img("photo-1469571486292-0ba58a3f068b"),
      },
    ],
    galleryLabel: "Impact in pictures",
    galleryImages: [
      { caption: "Community day", image: img("photo-1488521787991-ed7bbaae773c") },
      { caption: "Volunteer crew", image: img("photo-1559027615-cd4628902d4a") },
      { caption: "Workshop circle", image: img("photo-1469571486292-0ba58a3f068b") },
      { caption: "Care packages", image: img("photo-1532629345422-7515f3d16bb6") },
      { caption: "Youth program", image: img("photo-1509062522246-3755977927d7") },
      { caption: "Shared meal", image: img("photo-1469571486292-0ba58a3f068b") },
    ],
  },
  company: {
    id: "company",
    label: "Company / landing",
    description: "Modern launch landing — alternating feature bands and crisp CTAs.",
    commerce: false,
    layoutStyle: "launch",
    theme: {
      primary: "#0891b2",
      accent: "#020617",
      text: "#e2e8f0",
      muted: "#94a3b8",
    },
    tagline: "Built for what’s next",
    hero: {
      headline: (name) => name,
      subheadline:
        "A sharp single-page home for your product or company — clear offer, proof moments, and a direct contact path.",
      cta: "Talk to us",
      image: img("photo-1497366216548-37526070297c", 2000),
    },
    aboutImage: img("photo-1522071820081-009f0129c71c", 2000),
    contactImage: img("photo-1556761175-5973dc0f32e7", 2000),
    aboutBody: (name) =>
      `${name} helps teams move faster with less friction. Use this space for your product story, values, and who you build for.`,
    menuLabel: "What we offer",
    menuItems: [
      {
        name: "Core product",
        price: "Demo",
        note: "Start here",
        image: img("photo-1460925895917-afdab827c52f"),
      },
      {
        name: "Implementation",
        price: "Custom",
        note: "Guided setup",
        image: img("photo-1552664730-d307ca884978"),
      },
      {
        name: "Support plan",
        price: "Monthly",
        note: "Ongoing",
        image: img("photo-1600880292203-757bb62b4baf"),
      },
    ],
    galleryLabel: "Product & team",
    galleryImages: [
      { caption: "Workspace", image: img("photo-1497366216548-37526070297c") },
      { caption: "Team huddle", image: img("photo-1522071820081-009f0129c71c") },
      { caption: "Product screen", image: img("photo-1460925895917-afdab827c52f") },
      { caption: "Workshop", image: img("photo-1552664730-d307ca884978") },
      { caption: "Client call", image: img("photo-1600880292203-757bb62b4baf") },
      { caption: "Launch board", image: img("photo-1454165804606-c3d57bc86b40") },
    ],
  },
  perfume: {
    id: "perfume",
    label: "Perfume / fragrance",
    description: "Premium atelier layout — dark champagne tones and scent-story sections.",
    commerce: true,
    layoutStyle: "atelier",
    theme: {
      primary: "#c4a574",
      accent: "#0c0a09",
      text: "#f5f0e8",
      muted: "#a8a29e",
    },
    tagline: "Scent as signature",
    hero: {
      headline: (name) => name,
      subheadline:
        "Discover refined fragrances crafted for lasting presence — explore the collection or book a private scent consultation.",
      cta: "Explore scents",
      image: img("photo-1774682060992-46c7e9f2e50b", 2000),
    },
    aboutImage: img("photo-1774682060910-ba9a26f958ad", 2000),
    contactImage: img("photo-1557170334-a9632e77c6e4", 2000),
    aboutBody: (name) =>
      `${name} is a fragrance house for those who choose scent with intention. Share your craft story, signature notes, and how clients discover their next bottle.`,
    menuLabel: "Collection",
    menuItems: [
      {
        name: "Noir Velvet",
        price: "$148",
        note: "Amber · oud · soft musk",
        image: img("photo-1595425970377-c9703cf48b6d"),
      },
      {
        name: "Citrus Atelier",
        price: "$128",
        note: "Bergamot · neroli · cedar",
        image: img("photo-1547887538-e3a2f32cb1cc"),
      },
      {
        name: "Silk Garden",
        price: "$158",
        note: "Rose · iris · white tea",
        image: img("photo-1571875257727-256c39da42af"),
      },
    ],
    galleryLabel: "Mood & craft",
    galleryImages: [
      { caption: "Glass on dark", image: img("photo-1774682060992-46c7e9f2e50b") },
      { caption: "Quiet bottle", image: img("photo-1774682060910-ba9a26f958ad") },
      { caption: "Soft gold", image: img("photo-1595425970377-c9703cf48b6d") },
      { caption: "Evening pour", image: img("photo-1557170334-a9632e77c6e4") },
      { caption: "Studio light", image: img("photo-1547887538-e3a2f32cb1cc") },
      { caption: "Signature set", image: img("photo-1585386959984-a4155224a1ad") },
    ],
  },
  other: {
    id: "other",
    label: "Other / general",
    description: "Full-bleed photo scroll — a stylish all-purpose starter.",
    commerce: false,
    layoutStyle: "bleed",
    theme: {
      primary: "#14532d",
      accent: "#0a1410",
      text: "#14201c",
      muted: "#5c6b64",
    },
    tagline: "Welcome — we are glad you are here",
    hero: {
      headline: (name) => name,
      subheadline:
        "A simple, beautiful place online where customers learn what you offer and how to reach you.",
      cta: "Contact us",
      image: img("photo-1497366811353-6870744d04b2", 2000),
    },
    aboutImage: img("photo-1522071820081-009f0129c71c", 2000),
    contactImage: img("photo-1423666639041-f56000c27a9a", 2000),
    aboutBody: (name) =>
      `Tell your story here. Share what makes ${name} special, how long you have served customers, and why people trust you.`,
    menuLabel: "Highlights",
    menuItems: [
      {
        name: "What we offer",
        price: "",
        note: "Add details",
        image: img("photo-1497366216548-37526070297c"),
      },
      {
        name: "Why choose us",
        price: "",
        note: "Add details",
        image: img("photo-1522071820081-009f0129c71c"),
      },
      {
        name: "Get started",
        price: "",
        note: "Contact",
        image: img("photo-1423666639041-f56000c27a9a"),
      },
    ],
    galleryLabel: "Moments",
    galleryImages: [
      { caption: "Our space", image: img("photo-1497366811353-6870744d04b2") },
      { caption: "People first", image: img("photo-1522071820081-009f0129c71c") },
      { caption: "Everyday work", image: img("photo-1497366216548-37526070297c") },
      { caption: "Details matter", image: img("photo-1486312338219-ce68d2c6f44d") },
      { caption: "Community", image: img("photo-1529156069898-49953e39b3ac") },
      { caption: "Say hello", image: img("photo-1423666639041-f56000c27a9a") },
    ],
  },
};

export function resolveTemplateId(templateOrBusinessType) {
  const key = String(templateOrBusinessType || "other").toLowerCase().trim();
  if (TEMPLATE_CATALOG[key]) return key;
  return BUSINESS_TYPE_TO_TEMPLATE[key] || "other";
}

export function getTemplate(templateOrBusinessType) {
  return TEMPLATE_CATALOG[resolveTemplateId(templateOrBusinessType)] || TEMPLATE_CATALOG.other;
}

export function getLayoutStyle(templateOrBusinessType) {
  return getTemplate(templateOrBusinessType).layoutStyle || "bleed";
}

export function listTemplates() {
  return TEMPLATE_IDS.map((id) => {
    const t = TEMPLATE_CATALOG[id];
    return {
      id: t.id,
      label: t.label,
      description: t.description,
      commerce: t.commerce,
      dineOs: Boolean(t.dineOs),
      layoutStyle: t.layoutStyle,
      theme: t.theme,
      heroImage: typeof t.hero?.image === "string" ? t.hero.image : "",
      tagline: t.tagline,
    };
  });
}
