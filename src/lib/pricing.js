/**
 * Multi-region pricing configuration
 * 
 * Each region has its own currency and pricing for all plans.
 * Stripe is supported in USA, Canada, and Europe.
 * Pakistan uses local payment methods (contact-based for now).
 */

export const REGIONS = {
  USA: {
    id: "usa",
    name: "United States",
    currency: "USD",
    symbol: "$",
    locale: "en-US",
    paymentProvider: "stripe",
    stripePriceEnvPrefix: "STRIPE_PRICE_USD", // e.g. STRIPE_PRICE_USD_STARTER
  },
  CANADA: {
    id: "canada",
    name: "Canada",
    currency: "CAD",
    symbol: "CA$",
    locale: "en-CA",
    paymentProvider: "stripe",
    stripePriceEnvPrefix: "STRIPE_PRICE_CAD",
  },
  EUROPE: {
    id: "europe",
    name: "Europe",
    currency: "EUR",
    symbol: "€",
    locale: "en-GB",
    paymentProvider: "stripe",
    stripePriceEnvPrefix: "STRIPE_PRICE_EUR",
  },
  PAKISTAN: {
    id: "pakistan",
    name: "Pakistan",
    currency: "PKR",
    symbol: "Rs",
    locale: "en-PK",
    paymentProvider: "contact", // No Stripe, contact-based payment
    stripePriceEnvPrefix: null,
  },
};

/**
 * Pricing per region per plan (in cents/smallest currency unit)
 * 
 * USD prices are the source of truth.
 * CAD, EUR, PKR prices are marked TODO for the owner to set based on:
 * - Exchange rates
 * - Local market conditions
 * - Payment processing costs
 * - Tax considerations
 */
export const PRICING = {
  usa: {
    free: {
      firstSite: 0,
      extraSite: 500, // $5
    },
    starter: {
      firstSite: 900, // $9
      extraSite: 700, // $7
    },
    custom: {
      firstSite: 1900, // $19
      extraSite: 1500, // $15
    },
    domain: {
      firstSite: 2900, // $29
      extraSite: 2400, // $24
    },
    pro: {
      firstSite: null, // Contact only
      extraSite: null,
    },
  },
  
  canada: {
    // TODO: Set CAD prices based on exchange rate + market
    // Current USD to CAD: ~1.35x (as of Nov 2024)
    // Suggested: round to friendly numbers
    free: {
      firstSite: 0,
      extraSite: 699, // ~$6.99 CAD (TODO: adjust)
    },
    starter: {
      firstSite: 1199, // ~$11.99 CAD (TODO: adjust)
      extraSite: 949, // ~$9.49 CAD (TODO: adjust)
    },
    custom: {
      firstSite: 2549, // ~$25.49 CAD (TODO: adjust)
      extraSite: 1999, // ~$19.99 CAD (TODO: adjust)
    },
    domain: {
      firstSite: 3899, // ~$38.99 CAD (TODO: adjust)
      extraSite: 3199, // ~$31.99 CAD (TODO: adjust)
    },
    pro: {
      firstSite: null,
      extraSite: null,
    },
  },
  
  europe: {
    // TODO: Set EUR prices based on exchange rate + VAT
    // Current USD to EUR: ~0.92x (as of Nov 2024)
    // Note: VAT varies by country (15-27%), consider inclusive pricing
    free: {
      firstSite: 0,
      extraSite: 499, // ~€4.99 (TODO: adjust for VAT)
    },
    starter: {
      firstSite: 899, // ~€8.99 (TODO: adjust for VAT)
      extraSite: 699, // ~€6.99 (TODO: adjust for VAT)
    },
    custom: {
      firstSite: 1899, // ~€18.99 (TODO: adjust for VAT)
      extraSite: 1499, // ~€14.99 (TODO: adjust for VAT)
    },
    domain: {
      firstSite: 2899, // ~€28.99 (TODO: adjust for VAT)
      extraSite: 2399, // ~€23.99 (TODO: adjust for VAT)
    },
    pro: {
      firstSite: null,
      extraSite: null,
    },
  },
  
  pakistan: {
    // TODO: Set PKR prices based on exchange rate + local market
    // Current USD to PKR: ~280x (as of Nov 2024)
    // Note: Local payment gateways may have higher fees
    free: {
      firstSite: 0,
      extraSite: 140000, // ~Rs 1,400 (TODO: adjust)
    },
    starter: {
      firstSite: 250000, // ~Rs 2,500 (TODO: adjust)
      extraSite: 200000, // ~Rs 2,000 (TODO: adjust)
    },
    custom: {
      firstSite: 530000, // ~Rs 5,300 (TODO: adjust)
      extraSite: 420000, // ~Rs 4,200 (TODO: adjust)
    },
    domain: {
      firstSite: 810000, // ~Rs 8,100 (TODO: adjust)
      extraSite: 670000, // ~Rs 6,700 (TODO: adjust)
    },
    pro: {
      firstSite: null,
      extraSite: null,
    },
  },
};

/**
 * Map country codes to regions
 * Uses ISO 3166-1 alpha-2 codes from cf-ipcountry / x-vercel-ip-country
 */
export const COUNTRY_TO_REGION = {
  // USA
  US: "usa",
  
  // Canada
  CA: "canada",
  
  // Europe (EU + EEA + UK + CH)
  AT: "europe", // Austria
  BE: "europe", // Belgium
  BG: "europe", // Bulgaria
  HR: "europe", // Croatia
  CY: "europe", // Cyprus
  CZ: "europe", // Czech Republic
  DK: "europe", // Denmark
  EE: "europe", // Estonia
  FI: "europe", // Finland
  FR: "europe", // France
  DE: "europe", // Germany
  GR: "europe", // Greece
  HU: "europe", // Hungary
  IS: "europe", // Iceland
  IE: "europe", // Ireland
  IT: "europe", // Italy
  LV: "europe", // Latvia
  LI: "europe", // Liechtenstein
  LT: "europe", // Lithuania
  LU: "europe", // Luxembourg
  MT: "europe", // Malta
  NL: "europe", // Netherlands
  NO: "europe", // Norway
  PL: "europe", // Poland
  PT: "europe", // Portugal
  RO: "europe", // Romania
  SK: "europe", // Slovakia
  SI: "europe", // Slovenia
  ES: "europe", // Spain
  SE: "europe", // Sweden
  CH: "europe", // Switzerland
  GB: "europe", // United Kingdom
  
  // Pakistan
  PK: "pakistan",
};

/**
 * Get region from country code
 */
export function getRegionFromCountry(countryCode) {
  if (!countryCode) return "usa"; // Default to USA
  const code = String(countryCode).toUpperCase().trim();
  return COUNTRY_TO_REGION[code] || "usa";
}

/**
 * Get region config
 */
export function getRegion(regionId) {
  const id = String(regionId || "usa").toLowerCase();
  switch (id) {
    case "canada":
      return REGIONS.CANADA;
    case "europe":
      return REGIONS.EUROPE;
    case "pakistan":
      return REGIONS.PAKISTAN;
    default:
      return REGIONS.USA;
  }
}

/**
 * Get pricing for a region and plan
 */
export function getRegionPricing(regionId, planId) {
  const region = String(regionId || "usa").toLowerCase();
  const plan = String(planId || "free").toLowerCase();
  
  const regionPricing = PRICING[region] || PRICING.usa;
  const planPricing = regionPricing[plan] || regionPricing.free;
  
  return planPricing;
}

/**
 * Format price in region's currency
 */
export function formatPrice(cents, regionId) {
  const region = getRegion(regionId);
  
  if (cents === null || cents === undefined) {
    return "Contact us";
  }
  
  if (cents === 0) {
    return "Free";
  }
  
  const amount = cents / 100;
  
  try {
    return new Intl.NumberFormat(region.locale, {
      style: "currency",
      currency: region.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback for unsupported locales
    return `${region.symbol}${amount.toFixed(2)}`;
  }
}

/**
 * Check if region supports Stripe
 */
export function isStripeSupported(regionId) {
  const region = getRegion(regionId);
  return region.paymentProvider === "stripe";
}

/**
 * Get all supported regions
 */
export function getAllRegions() {
  return Object.values(REGIONS);
}

/**
 * Detect region from request headers (Cloudflare or Vercel)
 */
export function detectRegionFromHeaders(headers) {
  // Try Cloudflare header first
  const cfCountry = headers.get("cf-ipcountry");
  if (cfCountry) {
    return getRegionFromCountry(cfCountry);
  }
  
  // Try Vercel header
  const vercelCountry = headers.get("x-vercel-ip-country");
  if (vercelCountry) {
    return getRegionFromCountry(vercelCountry);
  }
  
  // Default to USA
  return "usa";
}

/**
 * Get Stripe price ID for a region and plan
 * Price IDs come from environment variables
 * 
 * Expected env var format:
 * - STRIPE_PRICE_USD_STARTER=price_xxx
 * - STRIPE_PRICE_USD_STARTER_EXTRA=price_xxx
 * - STRIPE_PRICE_CAD_CUSTOM=price_xxx
 * - etc.
 */
export function getStripePriceId(regionId, planId, isExtraSite = false) {
  const region = getRegion(regionId);
  
  if (!region.stripePriceEnvPrefix) {
    return null; // No Stripe support for this region
  }
  
  const plan = String(planId).toUpperCase();
  const suffix = isExtraSite ? "_EXTRA" : "";
  const envVar = `${region.stripePriceEnvPrefix}_${plan}${suffix}`;
  
  return process.env[envVar] || null;
}
