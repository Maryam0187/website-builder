import { query } from "./db";

/**
 * In-memory cache for pricing configs
 * Invalidated on admin updates
 */
let pricingCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get all active pricing configs (cached)
 */
export async function getCachedPricing() {
  const now = Date.now();
  
  if (pricingCache && (now - cacheTimestamp) < CACHE_TTL) {
    return pricingCache;
  }
  
  const result = await query(`
    SELECT 
      region,
      plan_id,
      currency,
      first_site_cents,
      extra_site_cents,
      first_site_cents_yearly,
      extra_site_cents_yearly,
      active,
      stripe_first_site_price_id,
      stripe_extra_site_price_id,
      stripe_first_site_price_id_yearly,
      stripe_extra_site_price_id_yearly
    FROM pricing_configs
    ORDER BY region, plan_id
  `);
  
  // Build nested structure: { region: { plan_id: { ...config } } }
  pricingCache = result.rows.reduce((acc, row) => {
    if (!acc[row.region]) {
      acc[row.region] = {};
    }
    acc[row.region][row.plan_id] = {
      firstSite: row.first_site_cents,
      extraSite: row.extra_site_cents,
      firstSiteYearly: row.first_site_cents_yearly,
      extraSiteYearly: row.extra_site_cents_yearly,
      currency: row.currency,
      active: row.active,
      stripePriceIds: {
        first: row.stripe_first_site_price_id,
        extra: row.stripe_extra_site_price_id,
      },
      stripePriceIdsYearly: {
        first: row.stripe_first_site_price_id_yearly,
        extra: row.stripe_extra_site_price_id_yearly,
      },
    };
    return acc;
  }, {});
  
  cacheTimestamp = now;
  return pricingCache;
}

/**
 * Get pricing for a specific region and plan
 */
export async function getPricingFromDB(region, planId) {
  const cached = await getCachedPricing();
  return cached[region]?.[planId] || null;
}

/**
 * Invalidate the pricing cache (call after admin updates)
 */
export function invalidatePricingCache() {
  pricingCache = null;
  cacheTimestamp = 0;
}

/**
 * Get all pricing configs with metadata
 */
export async function getAllPricingConfigs() {
  const result = await query(`
    SELECT 
      pc.*,
      u.email as created_by_email,
      u.name as created_by_name,
      (SELECT COUNT(*) FROM pricing_history WHERE pricing_config_id = pc.id) as history_count
    FROM pricing_configs pc
    LEFT JOIN users u ON pc.created_by_user_id = u.id
    ORDER BY pc.region, pc.plan_id
  `);
  
  return result.rows;
}

/**
 * Get pricing history for a config
 */
export async function getPricingHistory(configId, limit = 50) {
  const result = await query(`
    SELECT 
      ph.*,
      u.email as changed_by_email,
      u.name as changed_by_name
    FROM pricing_history ph
    LEFT JOIN users u ON ph.changed_by_user_id = u.id
    WHERE ph.pricing_config_id = $1
    ORDER BY ph.changed_at DESC
    LIMIT $2
  `, [configId, limit]);
  
  return result.rows;
}
