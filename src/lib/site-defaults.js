export function slugify(text) {
  return String(text || "site")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

const DEFAULT_THEME = {
  primary: "#1a5f4a",
  accent: "#f3efe6",
  text: "#14201c",
  muted: "#5c6b64",
};

/** Page types admin can add when a client requests them. */
export const ADDABLE_PAGE_TYPES = [
  { type: "services", label: "Services", defaultTitle: "What we offer" },
  { type: "gallery", label: "Gallery", defaultTitle: "Gallery" },
  { type: "faq", label: "FAQ", defaultTitle: "Frequently asked questions" },
  { type: "pricing", label: "Pricing", defaultTitle: "Pricing" },
  { type: "content", label: "Custom page", defaultTitle: "New page" },
];

function createHomePage(brandName) {
  return {
    type: "home",
    hero: {
      headline: `${brandName} — crafted for your neighborhood`,
      subheadline:
        "A warm, simple place online where customers learn what you offer and how to reach you.",
      cta: "Contact us",
      image:
        "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80",
    },
  };
}

function createAboutPage(brandName) {
  return {
    type: "about",
    title: `About ${brandName}`,
    body: "Tell your story here. Share what makes your business special, how long you have served customers, and why people trust you.",
    image:
      "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1200&q=80",
  };
}

function createContactPage({ phone = "", address = "" } = {}) {
  return {
    type: "contact",
    title: "Visit or call",
    phone,
    address,
    hours: "Mon–Sat · 9am–7pm",
    email: "",
  };
}

function createServicesPage(title = "What we offer") {
  return {
    type: "services",
    title,
    items: [
      {
        title: "Service one",
        description: "Describe your main offer in a short, friendly sentence.",
        image:
          "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=800&q=80",
      },
      {
        title: "Service two",
        description: "Add another service customers often ask about.",
        image:
          "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=800&q=80",
      },
      {
        title: "Service three",
        description: "Keep it clear so visitors know how you can help.",
        image:
          "https://images.unsplash.com/photo-1556745757-8d76bdb6984b?auto=format&fit=crop&w=800&q=80",
      },
    ],
  };
}

function createGalleryPage(title = "Gallery") {
  return {
    type: "gallery",
    title,
    items: [
      {
        image:
          "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80",
        caption: "Photo one",
      },
      {
        image:
          "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=800&q=80",
        caption: "Photo two",
      },
      {
        image:
          "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=800&q=80",
        caption: "Photo three",
      },
    ],
  };
}

function createFaqPage(title = "Frequently asked questions") {
  return {
    type: "faq",
    title,
    items: [
      {
        question: "What areas do you serve?",
        answer: "Share the neighborhoods or cities you cover.",
      },
      {
        question: "How do I book?",
        answer: "Explain the simplest way for customers to reach you.",
      },
      {
        question: "What are your hours?",
        answer: "List when you are open for visits or calls.",
      },
    ],
  };
}

function createPricingPage(title = "Pricing") {
  return {
    type: "pricing",
    title,
    items: [
      {
        name: "Starter",
        price: "From $49",
        description: "A simple option for first-time customers.",
      },
      {
        name: "Popular",
        price: "From $99",
        description: "Our most requested package.",
      },
      {
        name: "Premium",
        price: "Custom",
        description: "For larger needs — message us for a quote.",
      },
    ],
  };
}

function createContentPage(title = "New page") {
  return {
    type: "content",
    title,
    body: "Add the main text for this page. Keep it clear and friendly.",
    image:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80",
  };
}

export function createPageByType(type, { label, title } = {}) {
  const preset = ADDABLE_PAGE_TYPES.find((p) => p.type === type);
  const pageTitle = title || label || preset?.defaultTitle || "New page";

  switch (type) {
    case "services":
      return createServicesPage(pageTitle);
    case "gallery":
      return createGalleryPage(pageTitle);
    case "faq":
      return createFaqPage(pageTitle);
    case "pricing":
      return createPricingPage(pageTitle);
    case "about":
      return createAboutPage(pageTitle.replace(/^About\s+/i, "") || "Your Business");
    case "contact":
      return createContactPage();
    case "home":
      return createHomePage(pageTitle);
    case "content":
    default:
      return createContentPage(pageTitle);
  }
}

export function createDefaultSiteContent({
  brandName = "Your Business",
  tagline = "Welcome — we are glad you are here",
  phone = "",
  address = "",
  layout = "multi-page",
} = {}) {
  const resolvedLayout = layout === "one-page" ? "one-page" : "multi-page";
  return {
    layout: resolvedLayout,
    brand: {
      name: brandName,
      tagline,
    },
    theme: { ...DEFAULT_THEME },
    features: {
      pwa: false,
      notifications: false,
    },
    styles: {},
    nav: [
      { label: "Home", pageId: "home" },
      { label: "About", pageId: "about" },
      { label: "Contact", pageId: "contact" },
    ],
    pages: {
      home: createHomePage(brandName),
      about: createAboutPage(brandName),
      contact: createContactPage({ phone, address }),
    },
  };
}

/**
 * Upgrade flat (legacy) single-page content into the multi-page shape.
 * Safe to call repeatedly on already-migrated content.
 */
export function normalizeSiteContent(content) {
  if (!content || typeof content !== "object") {
    return createDefaultSiteContent();
  }

  if (content.pages && typeof content.pages === "object") {
    const nav =
      Array.isArray(content.nav) && content.nav.length
        ? content.nav
        : Object.keys(content.pages).map((pageId) => ({
            label: pageId.charAt(0).toUpperCase() + pageId.slice(1),
            pageId,
          }));
    return {
      ...content,
      layout: content.layout === "one-page" ? "one-page" : "multi-page",
      nav,
      styles: content.styles || {},
      theme: { ...DEFAULT_THEME, ...(content.theme || {}) },
      features: content.features || { pwa: false, notifications: false },
    };
  }

  const brandName = content.brand?.name || "Your Business";
  // Legacy flat sites were single-scroll → one-page
  const migrated = createDefaultSiteContent({
    brandName,
    tagline: content.brand?.tagline || "Welcome — we are glad you are here",
    phone: content.contact?.phone || "",
    address: content.contact?.address || "",
    layout: "one-page",
  });

  if (content.theme) migrated.theme = { ...migrated.theme, ...content.theme };
  if (content.brand) migrated.brand = { ...migrated.brand, ...content.brand };
  if (content.features) migrated.features = { ...migrated.features, ...content.features };
  if (content.styles) migrated.styles = { ...content.styles };

  if (content.hero) {
    migrated.pages.home.hero = { ...migrated.pages.home.hero, ...content.hero };
  }
  if (content.about) {
    migrated.pages.about = { ...migrated.pages.about, ...content.about, type: "about" };
  }
  if (content.contact) {
    migrated.pages.contact = { ...migrated.pages.contact, ...content.contact, type: "contact" };
  }

  // Legacy single-page sites often had services on the home scroll —
  // keep them available as an optional page only if admin later adds Services.
  // Data preserved under pages._legacyServices if present, not in nav.
  if (Array.isArray(content.services) && content.services.length) {
    migrated._legacyServices = content.services;
  }

  return migrated;
}

export function resolvePageId(content, pageParam) {
  const normalized = normalizeSiteContent(content);
  const requested = String(pageParam || "home").toLowerCase();
  if (normalized.pages?.[requested]) return requested;
  return "home";
}

export function getNavItems(content) {
  const normalized = normalizeSiteContent(content);
  return (normalized.nav || []).filter((item) => normalized.pages?.[item.pageId]);
}

/**
 * Add a page to site content. Returns updated content or throws.
 */
export function addPageToContent(content, { type, label, pageId: requestedId } = {}) {
  const next = normalizeSiteContent(structuredClone(content));
  const preset = ADDABLE_PAGE_TYPES.find((p) => p.type === type);
  if (!preset && type !== "content") {
    throw new Error("Unknown page type");
  }

  const pageType = type || "content";
  const navLabel = String(label || preset?.label || "New page").trim() || "New page";
  let pageId = slugify(requestedId || navLabel);

  if (!pageId) pageId = pageType;
  if (pageId === "home") {
    throw new Error("Cannot replace the home page");
  }
  if (next.pages[pageId]) {
    throw new Error(`Page "${pageId}" already exists`);
  }

  next.pages[pageId] = createPageByType(pageType, { label: navLabel, title: navLabel });
  next.nav = [...(next.nav || []), { label: navLabel, pageId }];
  // Extra pages mean separate routes — switch off one-page scroll mode
  next.layout = "multi-page";
  return next;
}

export function isOnePageLayout(content) {
  return normalizeSiteContent(content).layout === "one-page";
}
