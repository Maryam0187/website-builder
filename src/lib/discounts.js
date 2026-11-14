import { query, getPool } from "./db";

/**
 * Get active launch promotion (if active, not expired, and spots available)
 * Launch promotions are time-based with optional redemption caps
 */
export async function getLaunchPromotion() {
  const result = await query(`
    SELECT * FROM discounts 
    WHERE type = 'promotion' 
      AND active = true 
      AND (expiry_date IS NULL OR expiry_date > CURRENT_TIMESTAMP)
      AND (max_redemptions IS NULL OR used_count < max_redemptions)
    ORDER BY created_at DESC
    LIMIT 1
  `);
  
  return result.rows[0] || null;
}

/**
 * Get coupon by code (if active and not expired)
 */
export async function getCouponByCode(code) {
  const result = await query(`
    SELECT * FROM discounts 
    WHERE code = $1 
      AND type = 'coupon' 
      AND active = true 
      AND (max_redemptions IS NULL OR used_count < max_redemptions)
      AND (expiry_date IS NULL OR expiry_date > CURRENT_TIMESTAMP)
  `, [code.toUpperCase()]);
  
  return result.rows[0] || null;
}

/**
 * Validate if discount applies to a plan/interval
 */
export function validateDiscountApplicability(discount, planId, billingInterval) {
  if (!discount) return false;
  
  // Check plan restriction
  if (discount.applicable_plans && discount.applicable_plans.length > 0) {
    if (!discount.applicable_plans.includes(planId)) {
      return false;
    }
  }
  
  // Check billing interval restriction
  if (discount.billing_interval && discount.billing_interval !== billingInterval) {
    return false;
  }
  
  return true;
}

/**
 * Calculate discount amount
 */
export function calculateDiscountAmount(discount, originalAmount) {
  if (!discount) return 0;
  
  if (discount.value_type === 'percent') {
    return Math.floor((originalAmount * discount.value_amount) / 100);
  } else if (discount.value_type === 'fixed') {
    return Math.min(discount.value_amount, originalAmount);
  }
  
  return 0;
}

/**
 * Choose best discount (promotion vs coupon)
 * Returns the discount that gives the largest savings
 */
export function chooseBestDiscount(promotion, coupon, amount) {
  if (!promotion && !coupon) return null;
  if (!promotion) return coupon;
  if (!coupon) return promotion;
  
  const promotionSavings = calculateDiscountAmount(promotion, amount);
  const couponSavings = calculateDiscountAmount(coupon, amount);
  
  return promotionSavings >= couponSavings ? promotion : coupon;
}

/** Fields the plan page can show. Amounts stay in cents. */
export function publicOffer(discount) {
  if (!discount) return null;
  let daysRemaining = null;
  if (discount.expiry_date) {
    const ms = new Date(discount.expiry_date).getTime() - Date.now();
    daysRemaining = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  }
  return {
    id: discount.id,
    name: discount.name,
    code: discount.code || null,
    valueType: discount.value_type,
    valueAmount: discount.value_amount,
    durationType: discount.duration_type,
    durationMonths: discount.duration_months,
    applicablePlans: discount.applicable_plans || [],
    billingInterval: discount.billing_interval || null,
    daysRemaining,
    spotsRemaining: discount.max_redemptions != null
      ? Math.max(0, discount.max_redemptions - discount.used_count)
      : null,
    totalSpots: discount.max_redemptions,
  };
}

/**
 * Launch offer and an optional coupon. The larger saving wins.
 * A bad coupon code is reported and not applied.
 */
export async function quoteBestDiscount({ planId, billingInterval = "monthly", code, amountCents }) {
  const interval = billingInterval === "yearly" ? "yearly" : "monthly";
  const promotion = await getLaunchPromotion();
  let coupon = null;
  let couponError = null;
  const entered = String(code || "").trim();
  if (entered) {
    coupon = await getCouponByCode(entered);
    if (!coupon) {
      couponError = "Invalid or expired coupon code";
    } else if (!validateDiscountApplicability(coupon, planId, interval)) {
      couponError = "This coupon does not apply to this plan or billing period";
      coupon = null;
    }
  }
  const applicablePromotion = promotion && validateDiscountApplicability(promotion, planId, interval)
    ? promotion
    : null;
  const best = chooseBestDiscount(applicablePromotion, coupon, amountCents);
  const discountAmount = calculateDiscountAmount(best, amountCents);
  return {
    discount: best,
    discountAmount,
    finalAmount: Math.max(0, (Number(amountCents) || 0) - discountAmount),
    couponError,
  };
}

/** Create the Stripe coupon once and keep its id on the discount row. */
export async function ensureStripeCoupon(discount) {
  if (!discount) return null;
  if (discount.stripe_coupon_id) return discount.stripe_coupon_id;
  const { getStripe, isStripeConfigured } = await import("./stripe");
  if (!isStripeConfigured()) return null;
  const stripe = getStripe();
  const params = { name: discount.name || "Discount" };
  if (discount.value_type === "percent") {
    params.percent_off = discount.value_amount;
  } else {
    params.amount_off = discount.value_amount;
    params.currency = "usd";
  }
  if (discount.duration_type === "once") {
    params.duration = "once";
  } else if (discount.duration_type === "repeating") {
    params.duration = "repeating";
    params.duration_in_months = discount.duration_months || 1;
  } else {
    params.duration = "forever";
  }
  const created = await stripe.coupons.create(params);
  await query(
    `UPDATE discounts SET stripe_coupon_id = $1 WHERE id = $2`,
    [created.id, discount.id]
  );
  discount.stripe_coupon_id = created.id;
  return created.id;
}

export async function redeemDiscount(discountId, userId, subscriptionId = null) {
  const client = await getPool().connect();
  
  try {
    await client.query('BEGIN');
    
    // Lock the discount row and check limits
    const lockResult = await client.query(`
      SELECT * FROM discounts 
      WHERE id = $1 
      FOR UPDATE
    `, [discountId]);
    
    if (lockResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Discount not found' };
    }
    
    const discount = lockResult.rows[0];
    
    // Check if limit reached
    if (discount.max_redemptions && discount.used_count >= discount.max_redemptions) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Discount limit reached' };
    }
    
    if (subscriptionId) {
      const duplicate = await client.query(`
        SELECT id FROM discount_redemptions
        WHERE discount_id = $1 AND user_id = $2 AND subscription_id = $3
      `, [discountId, userId, subscriptionId]);
      if (duplicate.rows.length > 0) {
        await client.query('ROLLBACK');
        return { success: true, already: true, discount };
      }
    }

    // Check if user already redeemed (for promotions)
    if (discount.type === 'promotion') {
      const existingResult = await client.query(`
        SELECT id FROM discount_redemptions 
        WHERE discount_id = $1 AND user_id = $2
      `, [discountId, userId]);
      
      if (existingResult.rows.length > 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'Already redeemed' };
      }
    }
    
    // Increment used_count
    await client.query(`
      UPDATE discounts 
      SET used_count = used_count + 1 
      WHERE id = $1
    `, [discountId]);
    
    // Record redemption
    await client.query(`
      INSERT INTO discount_redemptions (discount_id, user_id, subscription_id)
      VALUES ($1, $2, $3)
    `, [discountId, userId, subscriptionId]);
    
    // Update user's applied discount
    await client.query(`
      UPDATE users 
      SET applied_discount_id = $1 
      WHERE id = $2
    `, [discountId, userId]);
    
    await client.query('COMMIT');
    return { success: true, discount };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get all discounts (admin only)
 */
export async function listDiscounts() {
  const result = await query(`
    SELECT 
      d.*,
      u.email as created_by_email,
      u.name as created_by_name,
      (SELECT COUNT(*) FROM discount_redemptions WHERE discount_id = d.id) as redemption_count
    FROM discounts d
    LEFT JOIN users u ON d.created_by_user_id = u.id
    ORDER BY d.created_at DESC
  `);
  
  return result.rows;
}

/**
 * Create discount (admin only)
 */
export async function createDiscount(discountData, createdByUserId) {
  const {
    type,
    code,
    name,
    valueType,
    valueAmount,
    durationType,
    durationMonths,
    maxRedemptions,
    applicablePlans,
    billingInterval,
    expiryDate,
    active = true,
  } = discountData;
  
  // Validate
  if (type === 'coupon' && !code) {
    throw new Error('Coupon code required');
  }
  
  if (durationType === 'repeating' && !durationMonths) {
    throw new Error('Duration months required for repeating discounts');
  }
  
  const result = await query(`
    INSERT INTO discounts (
      type, code, name, value_type, value_amount, duration_type, duration_months,
      max_redemptions, applicable_plans, billing_interval, expiry_date, active, created_by_user_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *
  `, [
    type,
    code ? code.toUpperCase() : null,
    name,
    valueType,
    valueAmount,
    durationType,
    durationMonths,
    maxRedemptions,
    applicablePlans,
    billingInterval,
    expiryDate,
    active,
    createdByUserId,
  ]);
  
  return result.rows[0];
}

/**
 * Update discount (admin only)
 */
export async function updateDiscount(discountId, updates) {
  const {
    name,
    valueType,
    valueAmount,
    durationType,
    durationMonths,
    maxRedemptions,
    applicablePlans,
    billingInterval,
    expiryDate,
    active,
  } = updates;
  
  const result = await query(`
    UPDATE discounts SET
      name = COALESCE($1, name),
      value_type = COALESCE($2, value_type),
      value_amount = COALESCE($3, value_amount),
      duration_type = COALESCE($4, duration_type),
      duration_months = COALESCE($5, duration_months),
      max_redemptions = COALESCE($6, max_redemptions),
      applicable_plans = COALESCE($7, applicable_plans),
      billing_interval = COALESCE($8, billing_interval),
      expiry_date = COALESCE($9, expiry_date),
      active = COALESCE($10, active),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $11
    RETURNING *
  `, [
    name,
    valueType,
    valueAmount,
    durationType,
    durationMonths,
    maxRedemptions,
    applicablePlans,
    billingInterval,
    expiryDate,
    active,
    discountId,
  ]);
  
  return result.rows[0];
}

/**
 * Get discount redemptions
 */
export async function getDiscountRedemptions(discountId, limit = 100) {
  const result = await query(`
    SELECT 
      dr.*,
      u.email as user_email,
      u.name as user_name
    FROM discount_redemptions dr
    LEFT JOIN users u ON dr.user_id = u.id
    WHERE dr.discount_id = $1
    ORDER BY dr.redeemed_at DESC
    LIMIT $2
  `, [discountId, limit]);
  
  return result.rows;
}
