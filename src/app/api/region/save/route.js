import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { getBillingRegion } from "@/lib/billing-regions";

/**
 * POST /api/region/save
 * Save user's selected region
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { region } = body;
    
    // Validate region
    const regionRow = region ? await getBillingRegion(region) : null;
    if (!regionRow || !regionRow.enabled) {
      return NextResponse.json(
        { error: "Invalid region" },
        { status: 400 }
      );
    }
    
    // Save to user profile if logged in
    const user = await getCurrentUser();
    if (user) {
      if (user.regionLocked && user.region !== region) {
        return NextResponse.json(
          { error: "Region is locked after the first subscription. Contact support to change it." },
          { status: 400 }
        );
      }
      await query(
        `UPDATE users SET region = $1, region_confirmed = true WHERE id = $2`,
        [region, user.id]
      );
    }
    
    // Set cookie for non-logged-in users
    const response = NextResponse.json({ success: true, region });
    response.cookies.set('region', region, {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
      sameSite: 'lax',
    });
    
    return response;
  } catch (error) {
    console.error("Region save error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
