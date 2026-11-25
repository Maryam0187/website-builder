import { NextResponse } from "next/server";
import { query } from "@/lib/db";

/**
 * GET /api/health
 * Health check endpoint for monitoring and uptime services
 */
export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: "ok",
    database: "unknown",
    stripe: "unknown",
  };

  // Database connectivity check
  try {
    await query("SELECT 1");
    checks.database = "ok";
  } catch (error) {
    console.error("Health check: Database error", error);
    checks.database = "error";
    checks.status = "degraded";
  }

  // Stripe configuration check
  if (process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    checks.stripe = "configured";
  } else {
    checks.stripe = "not_configured";
  }

  const statusCode = checks.status === "ok" ? 200 : 503;
  
  return NextResponse.json(checks, { status: statusCode });
}
