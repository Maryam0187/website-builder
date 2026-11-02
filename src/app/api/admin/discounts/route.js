import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-auth";
import {
  listDiscounts,
  createDiscount,
  updateDiscount,
  getDiscountRedemptions,
  getCouponByCode,
} from "@/lib/discounts";
import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

/**
 * GET /api/admin/discounts
 * List all discounts or get redemptions for a specific discount
 */
export async function GET(request) {
  try {
    const user = await getUser(request);
    requireAdmin(user);
    
    const { searchParams } = new URL(request.url);
    const discountId = searchParams.get('discountId');
    const action = searchParams.get('action');
    
    if (action === 'redemptions' && discountId) {
      const redemptions = await getDiscountRedemptions(discountId, 100);
      return NextResponse.json({ redemptions });
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
    const user = await getUser(request);
    requireAdmin(user);
    
    const body = await request.json();
    const { action, discountId } = body;
    
    if (action === 'create') {
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
      
      let stripeCouponId = null;
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
      
      const discount = await createDiscount({
        type,
        code: code ? code.toUpperCase() : null,
        name,
        valueType,
        valueAmount,
        durationType,
        durationMonths: durationType === 'repeating' ? durationMonths : null,
        maxRedemptions: maxRedemptions || null,
        applicablePlans: applicablePlans || null,
        billingInterval: billingInterval || null,
        expiryDate: expiryDate || null,
        active: true,
      }, user.id);
      
      // Update with Stripe IDs if created
      if (stripeCouponId) {
        const { query } = await import("@/lib/db");
        await query(`
          UPDATE discounts 
          SET stripe_coupon_id = $1, stripe_promo_code_id = $2 
          WHERE id = $3
        `, [stripeCouponId, stripePromoCodeId, discount.id]);
        discount.stripe_coupon_id = stripeCouponId;
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
        durationType,
        durationMonths,
        maxRedemptions,
        applicablePlans,
        billingInterval,
        expiryDate,
        active,
      } = body;
      
      const discount = await updateDiscount(discountId, {
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
      });
      
      return NextResponse.json({ discount, updated: true });
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
