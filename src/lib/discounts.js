import { query } from "./db";

/**
 * Get founding offer discount (if active and spots available)
 */
export async function getFoundingOffer() {
  const result = await query(`
    SELECT * FROM discounts 
    WHERE type = 'founding' 
      AND active = true 
      AND (max_redemptions IS NULL OR used_count < max_redemptions)
      AND (expiry_date IS NULL OR expiry_date > CURRENT_TIMESTAMP)
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
 * Choose best discount (founding vs coupon)
 * Returns the discount that gives the largest savings
 */
export function chooseBestDiscount(foundingOffer, coupon, amount) {
  if (!foundingOffer && !coupon) return null;
  if (!foundingOffer) return coupon;
  if (!coupon) return foundingOffer;
  
  const foundingSavings = calculateDiscountAmount(foundingOffer, amount);
  const couponSavings = calculateDiscountAmount(coupon, amount);
  
  return foundingSavings >= couponSavings ? foundingOffer : coupon;
}

/**
 * Atomically redeem a discount (increment used_count)
 * Returns true if successfully redeemed, false if limit reached
 */
export async function redeemDiscount(discountId, userId, subscriptionId = null) {
  const client = await query.pool.connect();
  
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
    
    // Check if user already redeemed (for founding offer)
    if (discount.type === 'founding') {
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
