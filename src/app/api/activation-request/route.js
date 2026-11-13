import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createActivationRequest } from "@/lib/activation-requests";
import { Resend } from "resend";
import { rateLimiters, applyRateLimit } from "@/lib/rate-limit";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * POST /api/activation-request
 * Create activation request for Pakistan region
 */
export async function POST(request) {
  try {
    // Rate limit: 3 requests per 10 minutes per IP
    const rateCheck = await applyRateLimit(request, rateLimiters.contact, 'activation-request');
    if (rateCheck.limited) return rateCheck.response;

    const user = await getCurrentUser();
    const body = await request.json();
    
    const { planId, siteId, region, name, email, phone, whatsapp, message } = body;
    
    // Validate required fields
    if (!planId || !region || !name || !email || !phone) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Create activation request
    const activationRequest = await createActivationRequest({
      userId: user?.id,
      planId,
      siteId: siteId || null,
      region,
      name,
      email,
      phone,
      whatsapp: whatsapp || null,
      message: message || null,
    });
    
    // Send email to admin
    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map(e => e.trim())
      .filter(Boolean);
    
    if (resend && adminEmails.length > 0) {
      try {
        await resend.emails.send({
          from: process.env.FROM_EMAIL || 'noreply@technonaire.com',
          to: adminEmails,
          subject: `New Activation Request from ${region.toUpperCase()}: ${planId}`,
          html: `
            <h2>New Activation Request</h2>
            <p><strong>Region:</strong> ${region.toUpperCase()}</p>
            <p><strong>Plan:</strong> ${planId}</p>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone}</p>
            ${whatsapp ? `<p><strong>WhatsApp:</strong> ${whatsapp}</p>` : ''}
            ${user ? `<p><strong>User ID:</strong> ${user.id} (${user.email})</p>` : ''}
            ${siteId ? `<p><strong>Site ID:</strong> ${siteId}</p>` : ''}
            ${message ? `<p><strong>Message:</strong><br>${message}</p>` : ''}
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin/activation-requests">View in Admin</a></p>
          `,
        });
      } catch (emailError) {
        console.error("Failed to send activation request email:", emailError);
        // Don't fail the request if email fails
      }
    }
    
    return NextResponse.json({
      success: true,
      id: activationRequest.id,
      message: "Activation request submitted successfully",
    });
  } catch (error) {
    console.error("Activation request error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit activation request" },
      { status: 500 }
    );
  }
}
