# Stripe Discount Setup Guide

## Overview

The discount system integrates with Stripe Coupons and Promotion Codes to apply discounts at checkout and during subscription creation. It supports two types of discounts:

1. **Launch Promotions** - Time-based, auto-applied discounts with optional redemption caps
2. **Coupon Codes** - Customer-entered codes with flexible rules

## Launch Promotions vs Coupon Codes

### Launch Promotions
- **Auto-applied** at checkout while active
- **Time-based** with "active until" date
- **No code required** from customer
- Optional redemption cap (unlimited by default)
- Shows countdown timer on pricing page
- Perfect for: launch offers, seasonal sales, limited-time promotions

### Coupon Codes
- **Customer enters code** at checkout
- Can have expiry date or be ongoing
- Required: unique code (e.g., SAVE20)
- Optional redemption cap
- Perfect for: partnerships, referrals, targeted campaigns

## Creating a Launch Promotion

### Via Admin UI (Recommended)

1. Log into admin panel
2. Visit `/admin/discounts`
3. Click "Create Discount"
4. Select **Type: Launch Promotion**
5. Configure:
   - **Name**: "Launch Week Sale" (internal)
   - **Discount**: 50% (or fixed amount in cents)
   - **Duration**: 3 months (how many billing cycles discount lasts)
   - **Active Until**: 2026-12-31 23:59 (promotion stops auto-applying after this date/time)
   - **Max Redemptions**: Leave blank for unlimited, or set cap (e.g., 100)
6. Check "Create Stripe coupon automatically" (recommended)
7. Save

**Result:**
- Promotion auto-applies to all new subscriptions until end date
- Pricing page shows "Offer ends in X days"
- If max redemptions set, also shows "Y spots remaining"

### Example: Black Friday Sale

```
Type: Launch Promotion
Name: Black Friday Sale
Discount: 40% off
Duration: 1 month
Active Until: 2026-11-30 23:59:59
Max Redemptions: (blank = unlimited)
```

**Customer sees:**
- "40% off your first month - offer ends in 3 days"
- Discount automatically applied at checkout

---

## Creating Coupon Codes

1. Click **Create promotion code** on the coupon detail page
2. Enter the customer-facing code (e.g., `SAVE20`, `LAUNCH50`)
3. Set active status
4. Save

### Linking to Database

After manually creating a Stripe coupon/promo code:

1. Copy the Coupon ID (e.g., `coup_1234567890`)
2. Copy the Promotion Code ID (e.g., `promo_1234567890`)
3. Update the discount record in your database:

```sql
UPDATE discounts 
SET 
  stripe_coupon_id = 'coup_1234567890',
  stripe_promo_code_id = 'promo_1234567890'
WHERE id = <your_discount_id>;
```

## Applying Discounts at Checkout

### Automatic Application (Launch Promotions)

Launch promotions are automatically checked during checkout validation. If a promotion is active (before expiry date) and has spots remaining, it's applied without customer input.

```javascript
// Checkout flow automatically checks:
const promotion = await getLaunchPromotion();
if (promotion && validateApplicability(promotion, planId)) {
  applyDiscount(promotion);
}
```

**Time-Based Auto-Expiry:**
- Promotion stops applying automatically after "active until" date
- No manual intervention needed
- Admin can also disable manually if needed

**Redemption Tracking:**
- Each redemption atomically increments counter
- Can't exceed max_redemptions even under concurrent requests
- Shows real-time countdown/counter on pricing page

### Customer-Entered Coupon Codes

Customers can enter coupon codes during checkout. The system:

1. Validates the code exists and is active
2. Checks applicability (plan, billing interval restrictions)
3. Compares with founding offer (best one wins)
4. Shows price preview with discount applied

### Stripe Subscription Creation with Coupon

When creating a Stripe subscription with a discount:

```javascript
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: priceId }],
  coupon: stripeCouponId, // Apply discount
  // ... other params
});
```

Or using promotion code:

```javascript
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: priceId }],
  promotion_code: stripePromoCodeId, // Apply discount via code
  // ... other params
});
```

## Testing Discounts

### Test Mode

All discount testing should be done in Stripe Test Mode first.

1. Use Stripe Test API keys
2. Create test coupons
3. Test redemption flow with test card `4242 4242 4242 4242`

### Testing Launch Promotions

1. Create a promotion with near-future expiry (e.g., 1 hour from now)
2. Visit pricing page - verify countdown displays
3. Start checkout - verify discount auto-applies
4. Wait for expiry - verify promotion stops applying
5. Check redemption count in admin panel

### Testing Time-Based Expiry

```sql
-- Manually set expiry to past for testing
UPDATE discounts 
SET expiry_date = NOW() - INTERVAL '1 hour'
WHERE type = 'promotion';

-- Verify API returns no promotion
-- Then reset expiry for production
UPDATE discounts 
SET expiry_date = '2026-12-31 23:59:59'
WHERE type = 'promotion';
```

### Verifying Discount Application

After checkout:

1. Check the subscription in Stripe Dashboard
2. Verify the discount is listed under the subscription
3. Confirm the invoice shows the discounted amount
4. Check the database `discount_redemptions` table for the record

## Regional Considerations

### Pakistan (Non-Stripe Regions)

Pakistan uses contact-based payment requests and does not use Stripe. However, discounts are still stored in the database for future use when a payment provider is integrated.

**Design Decisions:**
- Discount records are provider-agnostic
- `stripe_coupon_id` and `stripe_promo_code_id` are nullable
- Future payment providers can reference the same discount records
- Pakistan users see discount info in payment request form

## Annual Billing with Discounts

### Yearly Prices

For annual billing, create separate Stripe Prices for yearly subscriptions:

```javascript
// Monthly price
const monthlyPrice = await stripe.prices.create({
  currency: 'usd',
  unit_amount: 2999, // $29.99/month
  recurring: { interval: 'month' },
  product: productId,
});

// Yearly price (10 months, 2 free)
const yearlyPrice = await stripe.prices.create({
  currency: 'usd',
  unit_amount: 29990, // $299.90/year
  recurring: { interval: 'year' },
  product: productId,
});
```

### Discounts on Yearly Plans

Discounts can be restricted to specific billing intervals:

```sql
UPDATE discounts 
SET billing_interval = 'yearly' 
WHERE code = 'ANNUALSAVE';
```

This ensures the discount only applies to yearly subscriptions.

## Common Issues and Solutions

### Issue: Promotion Not Auto-Applying

**Check:**
- Is the promotion active in admin panel?
- Has the "active until" date passed?
- Has max redemptions been reached (if set)?
- Does the promotion apply to the selected plan?
- Is the promotion's billing_interval restriction matching?

**Debug:**
```bash
# Check promotion status
curl https://your-app.com/api/pricing/launch-promotion

# Response should include:
# - available: true/false
# - countdown: { daysRemaining, hoursRemaining }
# - spotsRemaining: number (if max_redemptions set)
```

### Issue: Stacking Discounts

**Expected Behavior:** Discounts do NOT stack. The system automatically chooses the best discount (highest savings) and applies only that one.

**Priority Order:**
1. Compare launch promotion vs entered coupon code
2. Calculate savings for each
3. Apply whichever gives higher discount
4. If tied, promotion wins (auto-applied first)

**Why:** This prevents abuse and keeps pricing logic simple while maximizing customer savings.

### Issue: Promotion Limit Exceeded

**Atomic Increment:** The system uses database row locking (`FOR UPDATE`) to ensure the promotion limit cannot be exceeded, even under concurrent requests.

**If limit reached:** 
- New checkouts will not see the promotion
- Countdown changes to "All spots claimed!"
- Admin can increase limit or create new promotion

## Monitoring

### Promotion Performance

Track promotion effectiveness in admin panel:
- View redemption count
- Monitor time-to-expiry
- Check spots remaining
- See which plans redeemed most

### Query Discount Usage

```sql
-- Active promotions with stats
SELECT 
  d.name,
  d.value_amount,
  d.duration_months,
  d.expiry_date,
  d.used_count,
  d.max_redemptions,
  (d.max_redemptions - d.used_count) as spots_remaining
FROM discounts d
WHERE d.type = 'promotion' 
  AND d.active = true
  AND (d.expiry_date IS NULL OR d.expiry_date > NOW());

-- Redemption velocity (last 24 hours)
SELECT 
  d.name,
  COUNT(dr.id) as redemptions_24h
FROM discounts d
LEFT JOIN discount_redemptions dr ON d.id = dr.discount_id
WHERE dr.redeemed_at > NOW() - INTERVAL '24 hours'
GROUP BY d.id, d.name;
```

### Stripe Dashboard

Monitor coupon usage in Stripe:
- Dashboard → Products → Coupons
- View each coupon's redemption count
- Check subscription list for applied coupons

## Security Considerations

1. **Admin-only discount creation**: Only users in `ADMIN_EMAILS` can create/edit discounts
2. **Coupon code validation**: Case-insensitive, trimmed, must exist in DB
3. **Expiry enforcement**: SQL-level expiry check prevents expired codes
4. **Max redemptions**: Database transaction ensures atomic increment
5. **No client-side discount logic**: All validation server-side

## Future Enhancements

- [ ] Add discount analytics dashboard
- [ ] Support multiple currencies per discount
- [ ] Add discount categories (student, nonprofit, etc.)
- [ ] Implement referral discounts
- [ ] Add A/B testing for discount effectiveness
