import { NextResponse } from "next/server";
import { rateLimiters, applyRateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";

/**
 * POST /api/billing/payment-request
 * 
 * For regions without Stripe support (e.g. Pakistan), users submit a payment request
 * to be contacted about activation via local payment methods
 */
export async function POST(request) {
  const user = await requireUser(["owner"]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 3 requests per 5 minutes per user
  const rateCheck = await applyRateLimit(request, rateLimiters.contact, 'payment-request', user.id);
  if (rateCheck.limited) return rateCheck.response;

  try {
    const body = await request.json();
    const name = String(body.name || user.name || "").trim();
    const email = String(body.email || user.email || "").trim();
    const message = String(body.message || "").trim();
    const region = String(body.region || user.region || "usa").trim();
    const planId = String(body.planId || "starter").trim();
    const mode = String(body.mode || "subscribe").trim();

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    // Insert payment request
    await query(
      `INSERT INTO payment_requests (user_id, name, email, message, region, plan_id, mode, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'new', now(), now())`,
      [user.id, name, email, message, region, planId, mode]
    );

    return NextResponse.json({
      success: true,
      message: "Payment request received. Our team will contact you shortly to complete activation.",
    });
  } catch (error) {
    console.error("Payment request error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit payment request" },
      { status: 500 }
    );
  }
}
