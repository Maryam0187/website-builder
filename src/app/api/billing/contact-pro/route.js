import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";

/**
 * POST /api/billing/contact-pro
 * 
 * Submits a contact request for Pro plan inquiries
 */
export async function POST(request) {
  try {
    const user = await requireUser(["owner"]);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const message = String(body.message || "").trim();
    const websiteCount = Math.max(1, Number(body.websiteCount) || 1);

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required" },
        { status: 400 }
      );
    }

    // Store the contact request
    const { rows } = await query(
      `INSERT INTO pro_contact_requests 
       (user_id, name, email, message, website_count, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'new', now(), now())
       RETURNING *`,
      [user.id, name, email, message, websiteCount]
    );

    return NextResponse.json({
      success: true,
      message: "Thank you! We'll contact you at " + email + " within 1 business day.",
      request: {
        id: rows[0].id,
        createdAt: rows[0].created_at,
      },
    });
  } catch (error) {
    console.error("Pro contact request error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit contact request" },
      { status: 500 }
    );
  }
}
