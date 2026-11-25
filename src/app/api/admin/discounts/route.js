import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-auth";
import { rateLimiters, applyRateLimit } from "@/lib/rate-limit";
import {
  listDiscounts,
  createDiscount,
  updateDiscount,
  deleteDiscount,
  getDiscountRedemptions,
  getCouponByCode,
  searchCustomersByEmail,
  findCustomer,
} from "@/lib/discounts";
import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

async function resolveAssignedCustomers(body) {
  const raw = Array.isArray(body.assignedUserIds)
    ? body.assignedUserIds
    : Array.isArray(body.assignedCustomers)
      ? body.assignedCustomers.map((person) => person?.id)
      : body.assignedUserId
        ? [body.assignedUserId]
        : [];
  const ids = [];
  for (const value of raw) {
    if (value == null || value === "") continue;
    const customer = await findCustomer(value);
    if (!customer) return { error: "No customer with that email" };
    if (!ids.some((id) => String(id) === String(customer.id))) ids.push(customer.id);
  }
  return { ids };
}

/**
 * GET /api/admin/discounts
 * List all discounts or get redemptions for a specific discount
 */
export async function GET(request) {
  try {
    const user = await requireUser(["admin"]);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    requireAdmin(user);

    // Rate limit: 100 requests per minute per admin
    const rateCheck = await applyRateLimit(request, rateLimiters.admin, 'admin-discounts-get', user.id);
    if (rateCheck.limited) return rateCheck.response;
    
    const { searchParams } = new URL(request.url);
    const discountId = searchParams.get('discountId');
    const action = searchParams.get('action');
    
    if (action === 'redemptions' && discountId) {
      const redemptions = await getDiscountRedemptions(discountId, 100);
      return NextResponse.json({ redemptions });
    }

    if (action === "search-users") {
      const users = await searchCustomersByEmail(searchParams.get("q"));
      return NextResponse.json({
        users: users.map((row) => ({ id: row.id, email: row.email, name: row.name })),
      });
    }
    
    const discounts = await listDiscounts();
    return NextResponse.json({ discounts });
    
  } catch (error) {
    console.error("GET /api/admin/discounts error:", error);
    
    if (error.message === "Authentication required") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error.message === "Admin access required") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: "Failed to fetch discounts" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/discounts
 * Create or update a discount
 */
export async function POST(request) {
  try {
    const user = await requireUser(["admin"]);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    requireAdmin(user);
    
    // Rate limit: 100 requests per minute per admin
    const rateCheck = await applyRateLimit(request, rateLimiters.admin, 'admin-discounts-post', user.id);
    if (rateCheck.limited) return rateCheck.response;

    const body = await request.json();
    const { action, discountId } = body;
    
    if (action === 'create') {
      const {
        type,
        code,
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
        createStripeCoupon,
      } = body;
      
      // Validate inputs
      if (!type || !name || !valueType || !valueAmount || !durationType) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 }
        );
      }
      
      if (valueType === 'percent' && (valueAmount < 1 || valueAmount > 100)) {
        return NextResponse.json(
          { error: "Percent discount must be between 1 and 100" },
          { status: 400 }
        );
      }
      const yearlyAmount = yearlyValueAmount == null || yearlyValueAmount === ""
        ? null
        : Number(yearlyValueAmount);
      if (yearlyAmount != null && valueType === "percent" && (yearlyAmount < 1 || yearlyAmount > 100)) {
        return NextResponse.json(
          { error: "Yearly percent discount must be between 1 and 100" },
          { status: 400 }
        );
      }
      
      let stripeCouponId = null;
      let stripeCouponYearlyId = null;
      let stripePromoCodeId = null;
      
      // Create Stripe coupon if requested and Stripe is configured
      if (createStripeCoupon && stripe) {
        try {
          const couponParams = {
            name,
            currency: 'usd',
          };
          
          if (valueType === 'percent') {
            couponParams.percent_off = valueAmount;
          } else {
            couponParams.amount_off = valueAmount;
          }
          
          if (durationType === 'once') {
            couponParams.duration = 'once';
          } else if (durationType === 'repeating') {
            couponParams.duration = 'repeating';
            couponParams.duration_in_months = durationMonths;
          } else {
            couponParams.duration = 'forever';
          }
          
          if (maxRedemptions) {
            couponParams.max_redemptions = maxRedemptions;
          }
          
          const stripeCoupon = await stripe.coupons.create(couponParams);
          stripeCouponId = stripeCoupon.id;
          if (yearlyAmount != null) {
            const yearlyParams = { ...couponParams, name: `${name} yearly` };
            if (valueType === "percent") yearlyParams.percent_off = yearlyAmount;
            else yearlyParams.amount_off = yearlyAmount;
            const yearlyCoupon = await stripe.coupons.create(yearlyParams);
            stripeCouponYearlyId = yearlyCoupon.id;
          }
          
          // Create promotion code if this is a coupon with a code
          if (type === 'coupon' && code) {
            const promoCode = await stripe.promotionCodes.create({
              coupon: stripeCouponId,
              code: code.toUpperCase(),
              active: true,
            });
            stripePromoCodeId = promoCode.id;
          }
        } catch (stripeError) {
          console.error("Stripe coupon creation failed:", stripeError);
          // Continue anyway - we'll store discount in DB even if Stripe fails
        }
      }
      
      const assigned = await resolveAssignedCustomers(body);
      if (assigned.error) {
        return NextResponse.json({ error: assigned.error }, { status: 400 });
      }

      const discount = await createDiscount({
        type,
        code: code ? code.toUpperCase() : null,
        name,
        valueType,
        valueAmount,
        yearlyValueAmount: billingInterval ? null : yearlyAmount,
        durationType,
        durationMonths: durationType === 'repeating' ? durationMonths : null,
        maxRedemptions: maxRedemptions || null,
        applicablePlans: applicablePlans || null,
        billingInterval: billingInterval || null,
        expiryDate: expiryDate || null,
        assignedUserIds: type === "coupon" ? assigned.ids : [],
        active: true,
      }, user.id);
      
      // Update with Stripe IDs if created
      if (stripeCouponId || stripeCouponYearlyId) {
        const { query } = await import("@/lib/db");
        await query(`
          UPDATE discounts 
          SET stripe_coupon_id = COALESCE($1, stripe_coupon_id),
              stripe_coupon_yearly_id = COALESCE($2, stripe_coupon_yearly_id),
              stripe_promo_code_id = COALESCE($3, stripe_promo_code_id)
          WHERE id = $4
        `, [stripeCouponId, stripeCouponYearlyId, stripePromoCodeId, discount.id]);
        discount.stripe_coupon_id = stripeCouponId;
        discount.stripe_coupon_yearly_id = stripeCouponYearlyId;
        discount.stripe_promo_code_id = stripePromoCodeId;
      }
      
      return NextResponse.json({ discount, created: true });
    }
    
    if (action === 'update') {
      if (!discountId) {
        return NextResponse.json({ error: "discountId required" }, { status: 400 });
      }
      
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
      } = body;
      if (
        valueType === "percent"
        && yearlyValueAmount != null
        && yearlyValueAmount !== ""
        && (Number(yearlyValueAmount) < 1 || Number(yearlyValueAmount) > 100)
      ) {
        return NextResponse.json(
          { error: "Yearly percent discount must be between 1 and 100" },
          { status: 400 }
        );
      }
      const updates = {
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
      };
      if (Object.prototype.hasOwnProperty.call(body, "yearlyValueAmount")) {
        updates.yearlyValueAmount = billingInterval || yearlyValueAmount == null || yearlyValueAmount === ""
          ? null
          : Number(yearlyValueAmount);
      }
      if (
        Array.isArray(body.assignedCustomers)
        || Array.isArray(body.assignedUserIds)
        || Object.prototype.hasOwnProperty.call(body, "assignedUserId")
      ) {
        const assigned = await resolveAssignedCustomers(body);
        if (assigned.error) {
          return NextResponse.json({ error: assigned.error }, { status: 400 });
        }
        updates.assignedUserIds = body.type === "promotion" ? [] : assigned.ids;
      }
      
      const discount = await updateDiscount(discountId, updates);
      
      return NextResponse.json({ discount, updated: true });
    }

    if (action === "delete") {
      if (!discountId) {
        return NextResponse.json({ error: "discountId required" }, { status: 400 });
      }
      const removed = await deleteDiscount(discountId);
      if (!removed) {
        return NextResponse.json({ error: "Discount not found" }, { status: 404 });
      }
      if (stripe) {
        if (removed.stripe_promo_code_id) {
          try {
            await stripe.promotionCodes.update(removed.stripe_promo_code_id, { active: false });
          } catch (stripeError) {
            console.error("Stripe promotion code disable failed:", stripeError);
          }
        }
        for (const couponId of [removed.stripe_coupon_id, removed.stripe_coupon_yearly_id]) {
          if (!couponId) continue;
          try {
            await stripe.coupons.del(couponId);
          } catch (stripeError) {
            console.error("Stripe coupon delete failed:", stripeError);
          }
        }
      }
      return NextResponse.json({ deleted: true });
    }
    
    if (action === 'validate-code') {
      const { code } = body;
      
      if (!code) {
        return NextResponse.json({ valid: false, error: "Code required" }, { status: 400 });
      }
      
      const coupon = await getCouponByCode(code);
      
      if (!coupon) {
        return NextResponse.json({ valid: false, error: "Invalid or expired code" });
      }
      
      return NextResponse.json({
        valid: true,
        discount: {
          id: coupon.id,
          name: coupon.name,
          valueType: coupon.value_type,
          valueAmount: coupon.value_amount,
          durationType: coupon.duration_type,
          durationMonths: coupon.duration_months,
          spotsRemaining: coupon.max_redemptions 
            ? coupon.max_redemptions - coupon.used_count 
            : null,
        },
      });
    }
    
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    
  } catch (error) {
    console.error("POST /api/admin/discounts error:", error);
    
    if (error.message === "Authentication required") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error.message === "Admin access required") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: error.message || "Discount operation failed" },
      { status: 500 }
    );
  }
}
