# Stripe Discount Setup Guide

## Overview

The discount system integrates with Stripe Coupons and Promotion Codes to apply discounts at checkout and during subscription creation.

## Automatic Stripe Coupon Creation

When creating a discount in the admin panel, you can optionally create a Stripe Coupon automatically. This is handled by the system when you check "Create Stripe coupon automatically" during discount creation.

### What Gets Created

1. **Stripe Coupon**: The core discount object with amount/percentage and duration
2. **Stripe Promotion Code** (for coupon codes): A customer-facing code that references the coupon

The system stores the Stripe Coupon ID and Promotion Code ID in the database for reference.

## Manual Stripe Setup

If you prefer to create Stripe coupons manually or the automatic creation fails, follow these steps:

### Creating a Coupon in Stripe Dashboard

1. Log into [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Products → Coupons**
3. Click **Create coupon**

#### Coupon Configuration

**For Founding Offer (50% off for 3 months):**
```
Name: Founding Customer Offer
Discount: 50% off
Duration: Repeating (3 months)
Max Redemptions: 100 (or your limit)
Currency: USD
```

**For General Coupon Code (e.g., SAVE20):**
```
Name: Save 20%
Discount: 20% off
Duration: Once / Repeating / Forever (as desired)
Max Redemptions: Optional
Currency: USD
```

### Creating a Promotion Code

After creating a coupon:

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

### Automatic Application (Founding Offer)

Founding offers are automatically checked during checkout validation. If available and applicable, they are applied without customer input.

```javascript
// Checkout flow automatically checks:
const foundingOffer = await getFoundingOffer();
if (foundingOffer && validateApplicability(foundingOffer, planId)) {
  applyDiscount(foundingOffer);
}
```

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

### Issue: Coupon Not Applying

**Check:**
- Is the coupon active in Stripe?
- Has max redemptions been reached?
- Is expiry date passed?
- Does the coupon currency match the subscription currency?

### Issue: Stacking Discounts

**Expected Behavior:** Discounts do NOT stack. The system automatically chooses the best discount (highest savings) and applies only that one.

**Why:** This prevents abuse and keeps pricing logic simple.

### Issue: Founding Offer Limit Exceeded

**Atomic Increment:** The system uses database row locking (`FOR UPDATE`) to ensure the founding offer limit cannot be exceeded, even under concurrent requests.

**If limit reached:** New checkouts will not see the founding offer, even if someone abandons their checkout.

## Monitoring

### Discount Usage

Query discount redemptions:

```sql
SELECT 
  d.name,
  d.code,
  d.used_count,
  d.max_redemptions,
  COUNT(dr.id) as actual_redemptions
FROM discounts d
LEFT JOIN discount_redemptions dr ON d.id = dr.discount_id
GROUP BY d.id;
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
