import { query, getPool } from "./db";

/**
 * Get active launch promotion (if active, not expired, and spots available)
 * Launch promotions are time-based with optional redemption caps
 */
export async function listLaunchPromotions() {
  const result = await query(`
    SELECT * FROM discounts 
    WHERE type = 'promotion' 
      AND active = true 
      AND (expiry_date IS NULL OR expiry_date > CURRENT_TIMESTAMP)
      AND (max_redemptions IS NULL OR used_count < max_redemptions)
    ORDER BY created_at DESC
  `);
  return result.rows;
}

export async function getLaunchPromotion() {
  const rows = await listLaunchPromotions();
  return rows[0] || null;
}

/**
 * The launch offer for this plan and billing period.
 * A monthly offer and a yearly offer can both be active. An offer with no
 * billing period is the fallback when that period has no offer of its own.
 */
export async function selectLaunchPromotion({ planId, billingInterval, amountCents = 0, userId = null }) {
  const interval = billingInterval === "yearly" ? "yearly" : "monthly";
  const rows = await listLaunchPromotions();
  const matching = [];
  for (const promotion of rows) {
    if (userId && await userRedeemedDiscount(promotion.id, userId)) continue;
    if (!validateDiscountApplicability(promotion, planId, interval)) continue;
    matching.push(promotion);
  }
  const adjusted = matching.map((promotion) => discountForInterval(promotion, interval));
  const specific = adjusted.filter((promotion) => promotion.billing_interval === interval);
  const pool = specific.length ? specific : adjusted;
  return pool.reduce((best, promotion) => {
    if (!best) return promotion;
    return calculateDiscountAmount(promotion, amountCents) > calculateDiscountAmount(best, amountCents)
      ? promotion
      : best;
  }, null);
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
  
  const row = result.rows[0];
  if (!row) return null;
  return attachAssignees(row);
}

/** No assigned customers means anyone with the code can use it. */
export function assignedUserIds(discount) {
  const listed = Array.isArray(discount?.assigned_user_ids) ? discount.assigned_user_ids : [];
  const ids = listed.map((id) => Number(id)).filter((id) => Number.isFinite(id));
  if (!ids.length && discount?.assigned_user_id) ids.push(Number(discount.assigned_user_id));
  return [...new Set(ids)];
}

export function couponIsForUser(discount, userId) {
  const ids = assignedUserIds(discount);
  if (!ids.length) return true;
  return userId != null && ids.some((id) => String(id) === String(userId));
}

async function attachAssignees(discount) {
  if (!discount?.id) return discount;
  const result = await query(
    `SELECT user_id FROM discount_assignees WHERE discount_id = $1`,
    [discount.id],
  );
  const ids = result.rows.map((row) => row.user_id);
  return { ...discount, assigned_user_ids: ids.length ? ids : assignedUserIds(discount) };
}

export async function setDiscountAssignees(discountId, userIds) {
  const ids = [...new Set((userIds || []).map((id) => Number(id)).filter((id) => Number.isFinite(id)))];
  await query(`DELETE FROM discount_assignees WHERE discount_id = $1`, [discountId]);
  if (ids.length) {
    await query(
      `INSERT INTO discount_assignees (discount_id, user_id)
       SELECT $1, unnest($2::bigint[])
       ON CONFLICT DO NOTHING`,
      [discountId, ids],
    );
  }
  await query(`UPDATE discounts SET assigned_user_id = NULL WHERE id = $1`, [discountId]);
}

export async function listAssignedCoupons(userId) {
  if (!userId) return [];
  const result = await query(`
    SELECT * FROM discounts
    WHERE type = 'coupon'
      AND active = true
      AND (max_redemptions IS NULL OR used_count < max_redemptions)
      AND (expiry_date IS NULL OR expiry_date > CURRENT_TIMESTAMP)
      AND (
        EXISTS (
          SELECT 1 FROM discount_assignees
          WHERE discount_id = discounts.id AND user_id = $1
        )
        OR assigned_user_id = $1
      )
      AND NOT EXISTS (
        SELECT 1 FROM discount_redemptions
        WHERE discount_id = discounts.id AND user_id = $1
      )
    ORDER BY created_at DESC
  `, [userId]);
  return result.rows;
}

export async function searchCustomersByEmail(raw) {
  const q = String(raw || "").trim();
  if (q.length < 2) return [];
  const escaped = q.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  const result = await query(
    `SELECT id, email, name FROM users
     WHERE email ILIKE $1 ESCAPE '\\'
     ORDER BY email ASC
     LIMIT 8`,
    [`%${escaped}%`],
  );
  return result.rows;
}

export async function findCustomer(userId) {
  if (!userId) return null;
  const result = await query(`SELECT id, email, name FROM users WHERE id = $1`, [userId]);
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
export function amountForInterval(discount, billingInterval) {
  if (!discount) return 0;
  const interval = billingInterval === "yearly" ? "yearly" : "monthly";
  const yearly = discount.yearly_value_amount ?? discount.yearlyValueAmount;
  if (interval === "yearly" && yearly != null && yearly !== "") return Number(yearly);
  return Number(discount.value_amount ?? discount.valueAmount) || 0;
}

export function discountForInterval(discount, billingInterval) {
  if (!discount) return null;
  const amount = amountForInterval(discount, billingInterval);
  return { ...discount, value_amount: amount, valueAmount: amount };
}

export function calculateDiscountAmount(discount, originalAmount, billingInterval = null) {
  if (!discount) return 0;
  const interval = billingInterval || discount.billing_interval || discount.billingInterval || "monthly";
  const amount = billingInterval ? amountForInterval(discount, interval) : Number(discount.value_amount ?? discount.valueAmount) || 0;
  const valueType = discount.value_type || discount.valueType;
  if (valueType === "percent") return Math.floor((originalAmount * amount) / 100);
  if (valueType === "fixed") return Math.min(amount, originalAmount);
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
    yearlyValueAmount: discount.yearly_value_amount ?? null,
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
export async function userRedeemedDiscount(discountId, userId) {
  if (!discountId || !userId) return false;
  const result = await query(
    `SELECT id FROM discount_redemptions WHERE discount_id = $1 AND user_id = $2 LIMIT 1`,
    [discountId, userId],
  );
  return result.rows.length > 0;
}

export async function quoteBestDiscount({ planId, billingInterval = "monthly", code, amountCents, userId = null }) {
  const interval = billingInterval === "yearly" ? "yearly" : "monthly";
  const promotion = await selectLaunchPromotion({
    planId,
    billingInterval: interval,
    amountCents,
    userId,
  });
  let coupon = null;
  let couponError = null;
  const entered = String(code || "").trim();
  if (entered) {
    coupon = await getCouponByCode(entered);
    if (!coupon) {
      couponError = "Invalid or expired coupon code";
    } else if (!couponIsForUser(coupon, userId)) {
      couponError = "This coupon is not available";
      coupon = null;
    } else if (!validateDiscountApplicability(coupon, planId, interval)) {
      couponError = "This coupon does not apply to this plan or billing period";
      coupon = null;
    } else {
      coupon = discountForInterval(coupon, interval);
    }
  }
  const applicablePromotion = promotion;
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
export async function ensureStripeCoupon(discount, billingInterval = "monthly") {
  if (!discount) return null;
  const interval = billingInterval === "yearly" ? "yearly" : "monthly";
  const yearlySeparate = interval === "yearly" && discount.yearly_value_amount != null;
  const existingId = yearlySeparate ? discount.stripe_coupon_yearly_id : discount.stripe_coupon_id;
  if (existingId) return existingId;
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
  if (yearlySeparate) {
    await query(
      `UPDATE discounts SET stripe_coupon_yearly_id = $1 WHERE id = $2`,
      [created.id, discount.id],
    );
    discount.stripe_coupon_yearly_id = created.id;
  } else {
    await query(
      `UPDATE discounts SET stripe_coupon_id = $1 WHERE id = $2`,
      [created.id, discount.id],
    );
    discount.stripe_coupon_id = created.id;
  }
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
    const assigned = await client.query(
      `SELECT user_id FROM discount_assignees WHERE discount_id = $1`,
      [discountId],
    );
    discount.assigned_user_ids = assigned.rows.map((row) => row.user_id);

    if (!couponIsForUser(discount, userId)) {
      await client.query("ROLLBACK");
      return { success: false, error: "This coupon is not available" };
    }
    
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
      a.email as assigned_email,
      a.name as assigned_name,
      COALESCE((
        SELECT json_agg(json_build_object('id', au.id, 'email', au.email, 'name', au.name) ORDER BY au.email)
        FROM discount_assignees da
        JOIN users au ON au.id = da.user_id
        WHERE da.discount_id = d.id
      ), '[]'::json) AS assigned_customers,
      (SELECT COUNT(*) FROM discount_redemptions WHERE discount_id = d.id) as redemption_count
    FROM discounts d
    LEFT JOIN users u ON d.created_by_user_id = u.id
    LEFT JOIN users a ON d.assigned_user_id = a.id
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
    yearlyValueAmount = null,
    durationType,
    durationMonths,
    maxRedemptions,
    applicablePlans,
    billingInterval,
    expiryDate,
    assignedUserIds = null,
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
      type, code, name, value_type, value_amount, yearly_value_amount, duration_type, duration_months,
      max_redemptions, applicable_plans, billing_interval, expiry_date, active, assigned_user_id, created_by_user_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *
  `, [
    type,
    code ? code.toUpperCase() : null,
    name,
    valueType,
    valueAmount,
    yearlyValueAmount,
    durationType,
    durationMonths,
    maxRedemptions,
    applicablePlans,
    billingInterval,
    expiryDate,
    active,
    null,
    createdByUserId,
  ]);

  const created = result.rows[0];
  if (created && type === "coupon") {
    await setDiscountAssignees(created.id, assignedUserIds || []);
  }
  return created;
}

/**
 * Update discount (admin only)
 */
export async function updateDiscount(discountId, updates) {
  const {
    name,
    valueType,
    valueAmount,
    yearlyValueAmount,
    durationType,
    durationMonths,
    maxRedemptions,
    applicablePlans,
    billingInterval,
    expiryDate,
    active,
    assignedUserIds,
  } = updates;
  const setYearly = Object.prototype.hasOwnProperty.call(updates, "yearlyValueAmount");
  const setAssigned = Object.prototype.hasOwnProperty.call(updates, "assignedUserIds");
  
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
      yearly_value_amount = CASE WHEN $11::boolean THEN $12::int ELSE yearly_value_amount END,
      stripe_coupon_id = CASE WHEN $3::int IS NOT NULL THEN NULL ELSE stripe_coupon_id END,
      stripe_coupon_yearly_id = CASE WHEN $11::boolean THEN NULL ELSE stripe_coupon_yearly_id END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $13
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
    setYearly,
    yearlyValueAmount,
    discountId,
  ]);

  if (setAssigned) await setDiscountAssignees(discountId, assignedUserIds || []);
  return result.rows[0];
}

/** Remove a discount. Redemptions are removed with it. */
export async function deleteDiscount(discountId) {
  const existing = await query(`SELECT * FROM discounts WHERE id = $1`, [discountId]);
  const row = existing.rows[0];
  if (!row) return null;
  await query(`DELETE FROM discounts WHERE id = $1`, [discountId]);
  return row;
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
