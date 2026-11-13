import { NextResponse } from "next/server";
import { detectRegionFromHeaders } from "@/lib/region-detection";

/**
 * GET /api/region/detect
 * Detect user's region from request headers
 */
export async function GET(request) {
  try {
    const detectedRegion = detectRegionFromHeaders(request);
    
    return NextResponse.json({
      region: detectedRegion,
      detected: true,
    });
  } catch (error) {
    console.error("Region detection error:", error);
    return NextResponse.json(
      { region: 'usa', detected: false, error: error.message },
      { status: 200 } // Still return a region, just mark as undetected
    );
  }
}
