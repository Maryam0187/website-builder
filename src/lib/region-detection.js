/**
 * Region detection and management utilities
 * 
 * Regions:
 * - usa, canada, europe, middle-east: USD pricing, Stripe checkout
 * - pakistan: PKR pricing, contact-us activation
 */

export const REGIONS = {
  USA: { id: 'usa', name: 'United States', currency: 'USD', stripe: true },
  CANADA: { id: 'canada', name: 'Canada', currency: 'USD', stripe: true },
  EUROPE: { id: 'europe', name: 'Europe', currency: 'USD', stripe: true },
  MIDDLE_EAST: { id: 'middle-east', name: 'Middle East', currency: 'USD', stripe: true },
  PAKISTAN: { id: 'pakistan', name: 'Pakistan', currency: 'PKR', stripe: false },
};

export const ALL_REGIONS = Object.values(REGIONS);

// Country to region mapping
const COUNTRY_TO_REGION = {
  // North America
  US: 'usa',
  CA: 'canada',
  
  // Europe
  GB: 'europe', IE: 'europe', FR: 'europe', DE: 'europe', ES: 'europe',
  IT: 'europe', NL: 'europe', BE: 'europe', SE: 'europe', NO: 'europe',
  DK: 'europe', FI: 'europe', AT: 'europe', CH: 'europe', PT: 'europe',
  PL: 'europe', GR: 'europe', CZ: 'europe', RO: 'europe', HU: 'europe',
  
  // Middle East
  AE: 'middle-east', SA: 'middle-east', QA: 'middle-east', KW: 'middle-east',
  OM: 'middle-east', BH: 'middle-east', JO: 'middle-east', LB: 'middle-east',
  IL: 'middle-east', TR: 'middle-east',
  
  // Pakistan
  PK: 'pakistan',
};

/**
 * Detect region from request headers
 * Checks Cloudflare, Vercel, and Accept-Language headers
 */
export function detectRegionFromHeaders(request) {
  const headers = request.headers;
  
  // Try Cloudflare country header
  const cfCountry = headers.get('cf-ipcountry');
  if (cfCountry && COUNTRY_TO_REGION[cfCountry]) {
    return COUNTRY_TO_REGION[cfCountry];
  }
  
  // Try Vercel country header
  const vercelCountry = headers.get('x-vercel-ip-country');
  if (vercelCountry && COUNTRY_TO_REGION[vercelCountry]) {
    return COUNTRY_TO_REGION[vercelCountry];
  }
  
  // Try Accept-Language header
  const acceptLanguage = headers.get('accept-language') || '';
  const languages = acceptLanguage.split(',').map(l => l.split(';')[0].trim());
  
  for (const lang of languages) {
    const country = lang.split('-')[1]?.toUpperCase();
    if (country && COUNTRY_TO_REGION[country]) {
      return COUNTRY_TO_REGION[country];
    }
  }
  
  // Default to USA
  return 'usa';
}

/**
 * Get region from user object, cookie, or detection
 */
export function getUserRegion(user, cookies, request) {
  // 1. User profile (if logged in)
  if (user?.region) {
    return user.region;
  }
  
  // 2. Cookie
  if (cookies?.region && REGIONS[cookies.region.toUpperCase()]) {
    return cookies.region;
  }
  
  // 3. Detect from headers
  if (request) {
    return detectRegionFromHeaders(request);
  }
  
  // 4. Default
  return 'usa';
}

/**
 * Check if region supports Stripe
 */
export function supportsStripe(regionId) {
  const region = ALL_REGIONS.find(r => r.id === regionId);
  return region?.stripe ?? false;
}

/**
 * Get region display name
 */
export function getRegionName(regionId) {
  const region = ALL_REGIONS.find(r => r.id === regionId);
  return region?.name || regionId;
}

/**
 * Get currency for region
 */
export function getRegionCurrency(regionId) {
  const region = ALL_REGIONS.find(r => r.id === regionId);
  return region?.currency || 'USD';
}

/**
 * Validate that user's region can access Stripe
 * Returns error response if not allowed
 */
export function validateStripeAccess(user, regionOverride = null) {
  const region = regionOverride || user?.region || 'usa';
  
  if (!supportsStripe(region)) {
    return {
      allowed: false,
      error: `Stripe payments are not available in ${getRegionName(region)}. Please contact us for payment options.`,
      region,
    };
  }
  
  return { allowed: true, region };
}
