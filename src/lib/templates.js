/**
 * Business-type website templates.
 * Default look: one-page scroll, full-bleed photo sections with text over images.
 * Cart/checkout is not built-in — commerce templates prompt clients to contact us.
 */

export const TEMPLATE_IDS = [
  "bakery",
  "clinic",
  "restaurant",
  "shop",
  "services",
  "other",
];

/** Map onboarding business_type values → template id */
export const BUSINESS_TYPE_TO_TEMPLATE = {
  bakery: "bakery",
  clinic: "clinic",
  restaurant: "restaurant",
  shop: "shop",
  services: "services",
  other: "other",
};

const img = (id, w = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=85`;

export const TEMPLATE_CATALOG = {
  bakery: {
    id: "bakery",
    label: "Bakery / cafe",
    description: "Warm bakery look with pastry, bread, and coffee photography.",
    commerce: false,
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
    heroVariant: "bleed",
  },
  clinic: {
    id: "clinic",
    label: "Clinic / salon",
    description: "Calm clinic look with serene treatment and spa photography.",
    commerce: false,
    theme: {
      primary: "#1f5c57",
      accent: "#0c1a19",
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
    heroVariant: "bleed",
  },
  restaurant: {
    id: "restaurant",
    label: "Restaurant",
    description: "Food-first dining look with plated dishes and ambience photos.",
    commerce: true,
    theme: {
      primary: "#b45309",
      accent: "#140c08",
      text: "#1c1917",
      muted: "#78716c",
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
    heroVariant: "bleed",
  },
  shop: {
    id: "shop",
    label: "Shop / store",
    description: "Retail look with product and storefront photography.",
    commerce: true,
    theme: {
      primary: "#1d4ed8",
      accent: "#0a1020",
      text: "#0f172a",
      muted: "#64748b",
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
    heroVariant: "bleed",
  },
  services: {
    id: "services",
    label: "Professional services",
    description: "Polished look with workspace and team photography.",
    commerce: false,
    theme: {
      primary: "#0f3d5c",
      accent: "#081018",
      text: "#0f172a",
      muted: "#64748b",
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
    heroVariant: "bleed",
  },
  other: {
    id: "other",
    label: "Other / general",
    description: "Stylish starter with warm neighborhood and workspace photos.",
    commerce: false,
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
    heroVariant: "bleed",
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

export function listTemplates() {
  return TEMPLATE_IDS.map((id) => {
    const t = TEMPLATE_CATALOG[id];
    return {
      id: t.id,
      label: t.label,
      description: t.description,
      commerce: t.commerce,
      theme: t.theme,
      heroImage: typeof t.hero?.image === "string" ? t.hero.image : "",
      tagline: t.tagline,
    };
  });
}
