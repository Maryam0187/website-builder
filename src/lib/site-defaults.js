import { DINEOS_DEFAULTS, getDineOsUrl, templateIncludesDineOs } from "./dineos";
import { getTemplate, resolveTemplateId } from "./templates";

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
  { type: "menu", label: "Menu / products", defaultTitle: "Menu" },
  { type: "gallery", label: "Gallery", defaultTitle: "Gallery" },
  { type: "faq", label: "FAQ", defaultTitle: "Frequently asked questions" },
  { type: "pricing", label: "Pricing", defaultTitle: "Pricing" },
  { type: "content", label: "Custom page", defaultTitle: "New page" },
];

function createHomePage(brandName, templateDef) {
  const hero = templateDef?.hero;
  return {
    type: "home",
    hero: {
      headline: hero ? hero.headline(brandName) : brandName,
      subheadline: hero
        ? hero.subheadline
        : "A simple, beautiful place online where customers learn what you offer and how to reach you.",
      cta: hero?.cta || "Contact us",
      image:
        hero?.image ||
        "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=2000&q=85",
    },
  };
}

function createAboutPage(brandName, templateDef) {
  return {
    type: "about",
    title: `About ${brandName}`,
    body: templateDef
      ? templateDef.aboutBody(brandName)
      : "Tell your story here. Share what makes your business special, how long you have served customers, and why people trust you.",
    image:
      templateDef?.aboutImage ||
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=2000&q=85",
  };
}

function createMenuPage(templateDef) {
  const fallbackImage =
    "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1200&q=85";
  const items = (templateDef?.menuItems || []).map((item) => ({
    title: item.name,
    description: [item.note, item.price].filter(Boolean).join(" · ") || "Add details",
    price: item.price || "",
    image: item.image || fallbackImage,
  }));
  return {
    type: "menu",
    title: templateDef?.menuLabel || "Menu",
    commerce: Boolean(templateDef?.commerce),
    contactNote:
      "Full cart and checkout are not included on the sample site. Contact us to enable online ordering.",
    items:
      items.length > 0
        ? items
        : [
            {
              title: "Item one",
              description: "Describe this item",
              price: "",
              image: fallbackImage,
            },
          ],
  };
}

function createGalleryPage(templateDefOrTitle = "Gallery") {
  if (typeof templateDefOrTitle === "string") {
    return {
      type: "gallery",
      title: templateDefOrTitle,
      items: [
        {
          image:
            "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=85",
          caption: "Photo one",
        },
        {
          image:
            "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1200&q=85",
          caption: "Photo two",
        },
        {
          image:
            "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1200&q=85",
          caption: "Photo three",
        },
      ],
    };
  }

  const templateDef = templateDefOrTitle || {};
  const items = (templateDef.galleryImages || []).map((item) => ({
    caption: item.caption || "",
    image: item.image,
  }));
  return {
    type: "gallery",
    title: templateDef.galleryLabel || "Gallery",
    items:
      items.length > 0
        ? items
        : [
            {
              caption: "Add a photo",
              image:
                "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=85",
            },
          ],
  };
}

export const DEFAULT_SITE_CONTACT_EMAIL = "info@technonaire.com";

function createContactPage({ address = "", email, image } = {}) {
  return {
    type: "contact",
    title: "Get in touch",
    address: address || "",
    hours: "Mon–Sat · 9am–7pm",
    email: email || DEFAULT_SITE_CONTACT_EMAIL,
    showForm: true,
    image:
      image ||
      "https://images.unsplash.com/photo-1423666639041-f56000c27a9a?auto=format&fit=crop&w=2000&q=85",
  };
}

function createDineOsPage() {
  return {
    type: "dineos",
    title: DINEOS_DEFAULTS.title,
    body: DINEOS_DEFAULTS.body,
    cta: DINEOS_DEFAULTS.cta,
    eyebrow: DINEOS_DEFAULTS.eyebrow,
    href: getDineOsUrl(),
    points: DINEOS_DEFAULTS.points.map((p) => ({ ...p })),
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
    case "menu":
      return createMenuPage({ menuLabel: pageTitle, menuItems: [], commerce: true });
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
    case "dineos":
      return createDineOsPage();
    case "content":
    default:
      return createContentPage(pageTitle);
  }
}

export function createDefaultSiteContent({
  brandName = "Your Business",
  tagline,
  address = "",
  email = DEFAULT_SITE_CONTACT_EMAIL,
  layout = "one-page",
  template = "other",
  businessType,
} = {}) {
  const templateId = resolveTemplateId(template || businessType || "other");
  const templateDef = getTemplate(templateId);
  // Default is one-page (single scroll); only multi-page when explicitly requested
  const resolvedLayout = layout === "multi-page" ? "multi-page" : "one-page";
  const menuPage = createMenuPage(templateDef);
  const galleryPage = createGalleryPage(templateDef);
  const includeDineOs = templateIncludesDineOs(templateId);
  const dineOsPage = includeDineOs ? createDineOsPage() : null;

  const nav = [
    { label: "Home", pageId: "home" },
    { label: "About", pageId: "about" },
    { label: galleryPage.title, pageId: "gallery" },
    { label: menuPage.title, pageId: "menu" },
  ];
  if (includeDineOs) {
    nav.push({ label: "DineOS", pageId: "dineos" });
  }
  nav.push({ label: "Contact", pageId: "contact" });

  const pages = {
    home: createHomePage(brandName, templateDef),
    about: createAboutPage(brandName, templateDef),
    gallery: galleryPage,
    menu: menuPage,
    contact: createContactPage({
      address,
      email,
      image: templateDef.contactImage,
    }),
  };
  if (dineOsPage) {
    pages.dineos = dineOsPage;
  }

  return {
    layout: resolvedLayout,
    template: templateId,
    brand: {
      name: brandName,
      tagline: tagline || templateDef.tagline,
    },
    theme: { ...DEFAULT_THEME, ...templateDef.theme },
    features: {
      pwa: false,
      notifications: false,
      commerce: Boolean(templateDef.commerce),
      dineOs: includeDineOs,
    },
    styles: {},
    nav,
    pages,
  };
}

/** Switch template; keep brand name, layout, contact where possible. */
export function applyTemplateToContent(content, templateId) {
  const normalized = normalizeSiteContent(content);
  const nextId = resolveTemplateId(templateId);
  const templateDef = getTemplate(nextId);
  const brandName = normalized.brand?.name || "Your Business";
  const address = normalized.pages?.contact?.address || "";
  const email = normalized.pages?.contact?.email || DEFAULT_SITE_CONTACT_EMAIL;
  // Niche templates are designed as single-page scroll experiences
  const fresh = createDefaultSiteContent({
    brandName,
    address,
    email,
    layout: "one-page",
    template: nextId,
  });

  // Preserve owner edits on brand name; refresh theme + starter pages for new look
  return normalizeSiteContent({
    ...fresh,
    brand: {
      ...fresh.brand,
      name: brandName,
      tagline: normalized.brand?.tagline || fresh.brand.tagline,
    },
    styles: normalized.styles || {},
    features: {
      ...fresh.features,
      commerce: Boolean(templateDef.commerce),
    },
  });
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
    const template = resolveTemplateId(content.template || "other");
    const pages = { ...content.pages };
    if (pages.contact && typeof pages.contact === "object") {
      const { phone: _removedPhone, ...contactRest } = pages.contact;
      pages.contact = {
        ...contactRest,
        type: "contact",
        title: contactRest.title === "Visit or call" ? "Get in touch" : contactRest.title || "Get in touch",
        email: contactRest.email || DEFAULT_SITE_CONTACT_EMAIL,
        showForm: contactRest.showForm !== false,
      };
    }
    const includeDineOs = templateIncludesDineOs(template);
    // Hide DineOS from nav while the section is disabled (page data can remain)
    const filteredNav = includeDineOs
      ? nav
      : nav.filter((item) => item.pageId !== "dineos");
    return {
      ...content,
      pages,
      template,
      layout: content.layout === "multi-page" ? "multi-page" : "one-page",
      nav: filteredNav,
      styles: content.styles || {},
      theme: { ...DEFAULT_THEME, ...(content.theme || {}) },
      features: {
        pwa: false,
        notifications: false,
        commerce: Boolean(getTemplate(template).commerce),
        ...(content.features || {}),
        dineOs: includeDineOs,
      },
    };
  }

  const brandName = content.brand?.name || "Your Business";
  // Legacy flat sites were single-scroll → one-page
  const migrated = createDefaultSiteContent({
    brandName,
    tagline: content.brand?.tagline || "Welcome — we are glad you are here",
    address: content.contact?.address || "",
    email: content.contact?.email || DEFAULT_SITE_CONTACT_EMAIL,
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
    const { phone: _phone, ...contactRest } = content.contact;
    migrated.pages.contact = {
      ...migrated.pages.contact,
      ...contactRest,
      type: "contact",
      email: contactRest.email || DEFAULT_SITE_CONTACT_EMAIL,
      showForm: contactRest.showForm !== false,
    };
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
  // Local + niche sites stay one-page: new pages are scroll sections in the navbar
  if (next.layout !== "multi-page") {
    next.layout = "one-page";
  }
  return next;
}

export function isOnePageLayout(content) {
  return normalizeSiteContent(content).layout === "one-page";
}

/** Switch between one-page (scroll sections) and multi-page (separate routes). */
export function setLayoutOnContent(content, layout) {
  const next = normalizeSiteContent(structuredClone(content));
  const resolved = layout === "one-page" ? "one-page" : "multi-page";
  next.layout = resolved;
  return next;
}
