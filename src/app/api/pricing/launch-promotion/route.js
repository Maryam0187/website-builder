import { NextResponse } from "next/server";
import { getLaunchPromotion } from "@/lib/discounts";

/**
 * GET /api/pricing/launch-promotion
 * Public endpoint to get launch promotion status (for pricing page countdown/counter)
 */
export async function GET() {
  try {
    const promotion = await getLaunchPromotion();
    
    if (!promotion) {
      return NextResponse.json({
        available: false,
        countdown: null,
        spotsRemaining: null,
        totalSpots: null,
      });
    }

    // Calculate time remaining
    let countdown = null;
    if (promotion.expiry_date) {
      const now = new Date();
      const expiryDate = new Date(promotion.expiry_date);
      const msRemaining = expiryDate - now;
      const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
      
      countdown = {
        expiryDate: promotion.expiry_date,
        daysRemaining: Math.max(0, daysRemaining),
        hoursRemaining: Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60))),
      };
    }

    // Spots remaining (only if max_redemptions is set)
    let spotsRemaining = null;
    let totalSpots = null;
    if (promotion.max_redemptions) {
      spotsRemaining = promotion.max_redemptions - promotion.used_count;
      totalSpots = promotion.max_redemptions;
    }

    return NextResponse.json({
      available: true,
      countdown,
      spotsRemaining,
      totalSpots,
      discount: {
        name: promotion.name,
        valueType: promotion.value_type,
        valueAmount: promotion.value_amount,
        durationMonths: promotion.duration_months,
      },
    });
    
  } catch (error) {
    console.error("GET /api/pricing/launch-promotion error:", error);
    return NextResponse.json(
      { available: false, error: "Failed to fetch launch promotion" },
      { status: 500 }
    );
  }
}
