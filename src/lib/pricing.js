/**
 * Multi-region pricing configuration
 * 
 * For now: USA, Canada, Europe, and Middle East all use USD pricing with Stripe.
 * Pakistan: PKR display, contact-based (no Stripe).
 * 
 * Structure supports future per-region currencies (CAD, EUR, AED, etc.) when needed.
 */

export const REGIONS = {
  USA: {
    id: "usa",
    name: "United States",
    currency: "USD",
    symbol: "$",
    locale: "en-US",
    paymentProvider: "stripe",
  },
  CANADA: {
    id: "canada",
    name: "Canada",
    currency: "USD", // Using USD for now, can switch to CAD later
    symbol: "$",
    locale: "en-US",
    paymentProvider: "stripe",
  },
  EUROPE: {
    id: "europe",
    name: "Europe",
    currency: "USD", // Using USD for now, can switch to EUR later
    symbol: "$",
    locale: "en-US",
    paymentProvider: "stripe",
  },
  MIDDLE_EAST: {
    id: "middle-east",
    name: "Middle East",
    currency: "USD", // Using USD for now, can switch to AED/SAR later
    symbol: "$",
    locale: "en-US",
    paymentProvider: "stripe",
  },
  PAKISTAN: {
    id: "pakistan",
    name: "Pakistan",
    currency: "PKR",
    symbol: "Rs",
    locale: "en-PK",
    paymentProvider: "contact", // No Stripe, contact-based payment
  },
};

/**
 * Pricing per region per plan (in cents/smallest currency unit)
 * 
 * USA/Canada/Europe/Middle East: All use same USD pricing
 * Pakistan: PKR pricing (approximate conversions, adjust as needed)
 */

// USD pricing (used by USA, Canada, Europe, Middle East)
const USD_PRICING = {
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
};

export const PRICING = {
  usa: USD_PRICING,
  canada: USD_PRICING, // Same as USD for now
  europe: USD_PRICING, // Same as USD for now
  "middle-east": USD_PRICING, // Same as USD for now
  
  pakistan: {
    // TODO: Set final PKR pricing based on:
    // - Current exchange rate (~280 PKR = 1 USD as of Nov 2024)
    // - Local market conditions
    // - Payment processing costs
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
  
  // Middle East
  AE: "middle-east", // United Arab Emirates
  SA: "middle-east", // Saudi Arabia
  QA: "middle-east", // Qatar
  KW: "middle-east", // Kuwait
  BH: "middle-east", // Bahrain
  OM: "middle-east", // Oman
  JO: "middle-east", // Jordan
  LB: "middle-east", // Lebanon
  IQ: "middle-east", // Iraq
  YE: "middle-east", // Yemen
  SY: "middle-east", // Syria
  IL: "middle-east", // Israel
  PS: "middle-east", // Palestine
  TR: "middle-east", // Turkey
  EG: "middle-east", // Egypt
  
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
    case "middle-east":
      return REGIONS.MIDDLE_EAST;
    case "pakistan":
      return REGIONS.PAKISTAN;
    default:
      return REGIONS.USA;
  }
}

/**
 * Get pricing for a region and plan
 * First tries database (admin-configured), falls back to static config
 */
export async function getRegionPricingAsync(regionId, planId, billingInterval = 'monthly') {
  try {
    const { getPricingFromDB } = await import('./pricing-cache.js');
    const dbPricing = await getPricingFromDB(regionId, planId);
    
    if (dbPricing) {
      const isYearly = billingInterval === 'yearly';
      
      return {
        firstSite: isYearly ? dbPricing.firstSiteYearly : dbPricing.firstSite,
        extraSite: isYearly ? dbPricing.extraSiteYearly : dbPricing.extraSite,
        currency: dbPricing.currency,
        active: dbPricing.active,
        stripePriceIds: isYearly ? dbPricing.stripePriceIdsYearly : dbPricing.stripePriceIds,
      };
    }
  } catch (error) {
    // DB not available or not seeded yet, fall back to static
    console.warn('Pricing DB not available, using static pricing:', error.message);
  }
  
  // Fallback to static pricing
  const pricing = getRegionPricing(regionId, planId);
  
  // For yearly: 10x monthly (2 months free)
  if (billingInterval === 'yearly') {
    return {
      firstSite: pricing.firstSite ? pricing.firstSite * 10 : null,
      extraSite: pricing.extraSite ? pricing.extraSite * 10 : null,
      currency: pricing.currency,
      active: pricing.active,
      stripePriceIds: null, // Yearly prices must be configured in admin
    };
  }
  
  return pricing;
}

/**
 * Get pricing for a region and plan (synchronous, static only)
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
 * 
 * For now: USA, Canada, Europe, Middle East all use the same USD Stripe prices.
 * Price IDs can come from the existing plan configuration or environment variables.
 * 
 * Future: When CAD/EUR/AED pricing is added, this will look up per-currency price IDs
 * from environment variables like:
 * - STRIPE_PRICE_CAD_STARTER, STRIPE_PRICE_CAD_STARTER_EXTRA
 * - STRIPE_PRICE_EUR_CUSTOM, STRIPE_PRICE_EUR_CUSTOM_EXTRA
 */
export function getStripePriceId(regionId, planId, isExtraSite = false) {
  const region = getRegion(regionId);
  
  if (!isStripeSupported(regionId)) {
    return null; // No Stripe support for this region (e.g. Pakistan)
  }
  
  // For now, all Stripe regions use USD prices
  // Return null so billing logic uses existing plan.stripePriceId or creates with price_data
  return null;
}
