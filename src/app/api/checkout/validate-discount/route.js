import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getFoundingOffer,
  getCouponByCode,
  validateDiscountApplicability,
  calculateDiscountAmount,
  chooseBestDiscount,
} from "@/lib/discounts";
import { getRegionPricingAsync } from "@/lib/pricing";

/**
 * POST /api/checkout/validate-discount
 * Validate a coupon code and return pricing preview with discount applied
 */
export async function POST(request) {
  try {
    const user = await requireUser(["owner"]);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { code, planId, billingInterval = 'monthly' } = body;

    if (!planId) {
      return NextResponse.json({ error: "planId required" }, { status: 400 });
    }

    const userRegion = user.region || "usa";
    
    // Get base pricing
    const pricing = await getRegionPricingAsync(userRegion, planId, billingInterval);
    
    if (!pricing.firstSite) {
      return NextResponse.json({ error: "Plan not available" }, { status: 400 });
    }

    const originalAmount = pricing.firstSite;

    // Get founding offer (always check, auto-applies if available)
    const foundingOffer = await getFoundingOffer();
    
    // Get coupon if code provided
    let coupon = null;
    if (code && code.trim()) {
      coupon = await getCouponByCode(code.trim());
      
      if (!coupon) {
        return NextResponse.json({
          valid: false,
          error: "Invalid or expired coupon code",
        });
      }
      
      // Validate applicability
      if (!validateDiscountApplicability(coupon, planId, billingInterval)) {
        return NextResponse.json({
          valid: false,
          error: "This coupon is not applicable to the selected plan or billing interval",
        });
      }
    }

    // Validate founding offer applicability
    let applicableFoundingOffer = null;
    if (foundingOffer && validateDiscountApplicability(foundingOffer, planId, billingInterval)) {
      applicableFoundingOffer = foundingOffer;
    }

    // Choose best discount (founding vs coupon, don't stack)
    const bestDiscount = chooseBestDiscount(applicableFoundingOffer, coupon, originalAmount);

    if (!bestDiscount && code) {
      return NextResponse.json({
        valid: true,
        discount: null,
        message: "Founding offer gives better savings",
      });
    }

    if (!bestDiscount) {
      return NextResponse.json({
        valid: false,
        originalAmount,
        finalAmount: originalAmount,
        discount: null,
      });
    }

    const discountAmount = calculateDiscountAmount(bestDiscount, originalAmount);
    const finalAmount = originalAmount - discountAmount;

    return NextResponse.json({
      valid: true,
      originalAmount,
      discountAmount,
      finalAmount,
      discount: {
        id: bestDiscount.id,
        type: bestDiscount.type,
        name: bestDiscount.name,
        code: bestDiscount.code,
        valueType: bestDiscount.value_type,
        valueAmount: bestDiscount.value_amount,
        durationType: bestDiscount.duration_type,
        durationMonths: bestDiscount.duration_months,
        spotsRemaining: bestDiscount.max_redemptions 
          ? bestDiscount.max_redemptions - bestDiscount.used_count 
          : null,
      },
    });
    
  } catch (error) {
    console.error("POST /api/checkout/validate-discount error:", error);
    return NextResponse.json(
      { error: error.message || "Validation failed" },
      { status: 500 }
    );
  }
}
