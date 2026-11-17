import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listLaunchPromotions, publicOffer, userRedeemedDiscount } from "@/lib/discounts";

/**
 * GET /api/pricing/launch-promotion
 * Public endpoint to get launch promotion status (for pricing page countdown/counter)
 */
export async function GET() {
  try {
    const promotions = await listLaunchPromotions();
    const user = await getCurrentUser();
    const offers = [];
    for (const promotion of promotions) {
      if (user && await userRedeemedDiscount(promotion.id, user.id)) continue;
      const offer = publicOffer(promotion);
      if (offer) offers.push(offer);
    }
    const offer = offers[0] || null;
    return NextResponse.json({
      available: offers.length > 0,
      offer,
      offers,
    });
    
  } catch (error) {
    console.error("GET /api/pricing/launch-promotion error:", error);
    return NextResponse.json(
      { available: false, error: "Failed to fetch special offer" },
      { status: 500 }
    );
  }
}
