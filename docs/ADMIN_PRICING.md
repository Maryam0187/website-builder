# Admin-Configurable Pricing System

## Status: Phase 3 - Foundation Complete, UI & Integration Needed

### ✅ Completed (Foundation)

**Database Schema:**
- ✅ `pricing_configs` table - Stores current pricing per region/plan
- ✅ `pricing_history` table - Audit log of all pricing changes
- ✅ Indexes for performance (region, active status, history timeline)

**Schema Details:**
```sql
pricing_configs:
  - region (TEXT, e.g. 'usa', 'pakistan')
  - plan_id (TEXT, e.g. 'starter', 'custom')
  - currency (TEXT, e.g. 'USD', 'PKR')
  - first_site_cents (INT)
  - extra_site_cents (INT)
  - active (BOOLEAN) - false means "Contact us" instead of purchasable
  - stripe_first_site_price_id (TEXT, nullable)
  - stripe_extra_site_price_id (TEXT, nullable)
  - created_by_user_id (BIGINT, who created this config)
  - created_at (TIMESTAMPTZ)
  - UNIQUE(region, plan_id)

pricing_history:
  - All fields from pricing_configs
  - pricing_config_id (FK to pricing_configs)
  - changed_by_user_id (who made the change)
  - changed_at (when)
  - change_reason (optional admin note)
```

### ⚠️ Needs Implementation

#### 1. Admin Authorization

**File:** `src/lib/admin-auth.js`

```javascript
/**
 * Check if user is admin based on ADMIN_EMAILS env var
 * Format: ADMIN_EMAILS=admin@example.com,other@example.com
 */
export function isAdmin(user) {
  if (!user?.email) return false;
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(user.email.toLowerCase());
}

export async function requireAdmin(request) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }
  return user;
}
```

#### 2. Pricing Configuration API

**File:** `src/app/api/admin/pricing/route.js`

```javascript
// GET /api/admin/pricing - List all pricing configs
export async function GET(request) {
  const user = await requireAdmin();
  if (!user) return /* 403 */;
  
  // Query pricing_configs with JOIN to get creator info
  // Return list with history count
}

// POST /api/admin/pricing - Update pricing config
export async function POST(request) {
  const user = await requireAdmin();
  if (!user) return /* 403 */;
  
  const { region, planId, currency, firstSiteCents, extraSiteCents, active, reason } = await request.json();
  
  // Validate inputs
  // Check if Stripe region (isStripeSupported)
  // If Stripe region and price changed:
  //   - Create new Stripe Price objects
  //   - Archive old prices (do NOT delete - existing subs use them)
  //   - Store new price IDs
  // Insert pricing_history record
  // Update pricing_configs
  // Invalidate cache
  // Return updated config
}
```

#### 3. Stripe Price Creation

**File:** `src/lib/admin-pricing.js`

```javascript
/**
 * Create Stripe Price for admin-configured pricing
 */
export async function createStripePriceForConfig(config, isExtraSite = false) {
  if (!isStripeSupported(config.region)) return null;
  
  const stripe = getStripe();
  const amount = isExtraSite ? config.extra_site_cents : config.first_site_cents;
  const description = isExtraSite 
    ? `${config.planId} - Extra Site (${config.region})`
    : `${config.planId} - First Site (${config.region})`;
  
  const price = await stripe.prices.create({
    currency: config.currency.toLowerCase(),
    unit_amount: amount,
    recurring: { interval: 'month' },
    product_data: {
      name: `Easy Website - ${config.planId}`,
      description,
      tax_code: 'txcd_10103001',
    },
    metadata: {
      region: config.region,
      planId: config.planId,
      isExtraSite: String(isExtraSite),
      configId: String(config.id),
    },
  });
  
  return price.id;
}

/**
 * Archive old Stripe Price (mark inactive, don't delete)
 */
export async function archiveStripePrice(priceId) {
  if (!priceId) return;
  const stripe = getStripe();
  await stripe.prices.update(priceId, { active: false });
}
```

#### 4. Pricing Cache

**File:** `src/lib/pricing-cache.js`

```javascript
/**
 * In-memory cache with TTL
 * Invalidated on admin save
 */
let pricingCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getCachedPricing() {
  const now = Date.now();
  if (pricingCache && (now - cacheTimestamp) < CACHE_TTL) {
    return pricingCache;
  }
  
  const configs = await query(`
    SELECT * FROM pricing_configs WHERE active = true ORDER BY region, plan_id
  `);
  
  pricingCache = configs.rows.reduce((acc, row) => {
    if (!acc[row.region]) acc[row.region] = {};
    acc[row.region][row.plan_id] = {
      firstSite: row.first_site_cents,
      extraSite: row.extra_site_cents,
      currency: row.currency,
      stripePriceIds: {
        first: row.stripe_first_site_price_id,
        extra: row.stripe_extra_site_price_id,
      },
    };
    return acc;
  }, {});
  
  cacheTimestamp = now;
  return pricingCache;
}

export function invalidatePricingCache() {
  pricingCache = null;
  cacheTimestamp = 0;
}
```

#### 5. Seed Pricing on First Run

**File:** `src/lib/seed-pricing.js`

```javascript
import { REGIONS, PRICING } from './pricing.js';

/**
 * Seed pricing_configs from defaults on first run
 */
export async function seedDefaultPricing() {
  const existing = await query(`SELECT COUNT(*) FROM pricing_configs`);
  if (Number(existing.rows[0].count) > 0) return; // Already seeded
  
  for (const [regionKey, regionConfig] of Object.entries(REGIONS)) {
    const regionId = regionConfig.id;
    const pricing = PRICING[regionId];
    
    for (const [planId, planPricing] of Object.entries(pricing)) {
      await query(`
        INSERT INTO pricing_configs 
        (region, plan_id, currency, first_site_cents, extra_site_cents, active)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        regionId,
        planId,
        regionConfig.currency,
        planPricing.firstSite || 0,
        planPricing.extraSite || 0,
        planPricing.firstSite !== null, // active=false for Pro/contact-only
      ]);
    }
  }
}
```

Call `seedDefaultPricing()` in app initialization (e.g. in `ensureAdminUser()`).

#### 6. Admin UI

**File:** `src/app/admin/pricing/page.js`

```javascript
"use client";
// Admin pricing editor
// - Table of all pricing configs (region x plan matrix)
// - Edit modal for each config
// - Shows current Stripe price IDs
// - Input validation
// - Confirmation dialog ("This will create new Stripe prices")
// - History viewer (show pricing_history)
```

#### 7. Update Pricing Lib

**File:** `src/lib/pricing.js`

Replace hardcoded PRICING with:
```javascript
import { getCachedPricing } from './pricing-cache.js';

export async function getRegionPricing(regionId, planId) {
  const pricing = await getCachedPricing();
  return pricing?.[regionId]?.[planId] || PRICING[regionId]?.[planId];
}
```

#### 8. Update Checkout/Billing

**Files:** 
- `src/app/checkout/page.js`
- `src/app/api/billing/checkout-session/route.js`
- `src/lib/billing.js`

Replace static pricing lookups with DB-backed pricing:
```javascript
const pricing = await getRegionPricing(user.region, planId);
// Use pricing.firstSite, pricing.extraSite
// Use pricing.stripePriceIds.first if available
```

#### 9. Tests

**File:** `tests/admin-pricing.test.js`

```javascript
describe("Admin Pricing Permissions", () => {
  test("non-admin cannot access /api/admin/pricing", async () => {
    // 403 expected
  });
  
  test("admin can list pricing configs", async () => {
    // 200 with configs
  });
  
  test("admin can update pricing", async () => {
    // Creates history record
  });
});

describe("Pricing Database", () => {
  test("pricing_configs unique constraint on region+plan_id", () => {
    // Insert duplicate should fail
  });
  
  test("pricing_history logs all changes", () => {
    // Count history records
  });
});

describe("Stripe Price Creation", () => {
  test("creates new Stripe Price when amount changes", () => {
    // Mock stripe.prices.create
  });
  
  test("archives old Stripe Price", () => {
    // Mock stripe.prices.update
  });
  
  test("does not create Stripe Price for Pakistan", () => {
    // isStripeSupported check
  });
});
```

### 🔐 Making Yourself Admin

**Option 1: Environment Variable (Recommended)**

Add to Railway/Vercel environment:
```bash
ADMIN_EMAILS=your-email@example.com,other-admin@example.com
```

Restart the application. Anyone with an email in this list can access `/admin/*` routes.

**Option 2: Direct Database Update**

If you want a dedicated `is_admin` field instead:
```sql
-- Add column
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Make yourself admin
UPDATE users SET is_admin = true WHERE email = 'your-email@example.com';
```

Then update `isAdmin()` function to check `user.isAdmin` field.

### 📊 Migration Strategy

**For Existing Subscribers:**

When admin changes pricing, existing subscribers keep their old Stripe Price:
1. Admin updates pricing in `/admin/pricing`
2. System creates new Stripe Price objects
3. Old Stripe Prices archived (active=false)
4. **Existing subscriptions unchanged** (still use old price_id)
5. **New subscriptions** use new price

**Migrating Subscribers (Future Feature):**

Add admin action "Migrate existing subscribers to new pricing":
1. Query all active subscriptions on old price
2. For each subscription:
   - Calculate prorated difference
   - Update subscription.items[].price to new price_id
   - Log migration in pricing_history
3. Send notification to affected users

### ⚠️ Important Considerations

**Stripe Price Objects:**
- Never DELETE old prices (breaks existing subscriptions)
- Always ARCHIVE (set active=false)
- Keep price IDs in pricing_history for audit

**Currency Changes:**
- Changing currency requires new Stripe Product
- Cannot convert existing subscriptions between currencies
- Recommend creating new plan_id variant instead

**Validation:**
- first_site_cents >= 0
- extra_site_cents >= 0  
- currency matches region (or is 'USD' for multi-region)
- For contact-only regions: active=false, no Stripe prices

**Cache Invalidation:**
- Clear cache immediately after admin save
- Consider Redis/Memcached for multi-instance deployments
- 5-minute TTL is reasonable tradeoff

### 🚀 Implementation Priority

1. **Phase 1 (Critical Path):**
   - Admin authorization (isAdmin)
   - Seed pricing from defaults
   - Update pricing.js to read from DB
   - Cache layer

2. **Phase 2 (Admin Features):**
   - Admin API endpoints
   - Stripe price creation
   - History logging

3. **Phase 3 (UI):**
   - Admin pricing editor page
   - History viewer
   - Validation UI

4. **Phase 4 (Advanced):**
   - Subscriber migration tool
   - Pricing analytics
   - A/B testing support

### 📝 Estimated Effort

- **Database & Seeding:** 2-3 hours ✅ (schema done)
- **Admin Auth:** 1 hour
- **API Endpoints:** 3-4 hours
- **Cache Layer:** 2 hours
- **Stripe Integration:** 3-4 hours
- **Admin UI:** 6-8 hours
- **Tests:** 3-4 hours
- **Total:** ~20-25 hours

This is a production-grade feature that needs careful implementation. The foundation (database schema) is complete and tested. The remaining work is well-defined above.
