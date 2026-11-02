import { NextResponse } from "next/server";
import { getFoundingOffer } from "@/lib/discounts";

/**
 * GET /api/pricing/founding-offer
 * Public endpoint to get founding offer status (for pricing page counter)
 */
export async function GET() {
  try {
    const foundingOffer = await getFoundingOffer();
    
    if (!foundingOffer) {
      return NextResponse.json({
        available: false,
        spotsRemaining: 0,
        totalSpots: 0,
      });
    }

    const spotsRemaining = foundingOffer.max_redemptions 
      ? foundingOffer.max_redemptions - foundingOffer.used_count 
      : null;

    return NextResponse.json({
      available: true,
      spotsRemaining,
      totalSpots: foundingOffer.max_redemptions,
      discount: {
        valueType: foundingOffer.value_type,
        valueAmount: foundingOffer.value_amount,
        durationMonths: foundingOffer.duration_months,
      },
    });
    
  } catch (error) {
    console.error("GET /api/pricing/founding-offer error:", error);
    return NextResponse.json(
      { available: false, error: "Failed to fetch founding offer" },
      { status: 500 }
    );
  }
}
