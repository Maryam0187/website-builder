import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { getPlan } from "@/lib/billing";

/**
 * POST /api/billing/verify-payment
 * 
 * Verifies PaymentIntent status and creates subscription
 */
export async function POST(request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const user = await requireUser(["owner"]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const paymentIntentId = String(body.paymentIntent || "").trim();
    const planId = String(body.planId || "starter").trim();
    const mode = String(body.mode || "subscribe").trim();

    if (!paymentIntentId) {
      return NextResponse.json({ error: "Missing payment intent ID" }, { status: 400 });
    }

    const stripe = getStripe();
    const plan = getPlan(planId);

    if (!plan || !plan.priceCents || plan.priceCents <= 0) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Verify PaymentIntent status
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json(
        { error: `Payment ${paymentIntent.status}. Please try again.` },
        { status: 400 }
      );
    }

    // Get the payment method used
    const paymentMethodId = paymentIntent.payment_method;
    const customerId = paymentIntent.customer;

    if (!customerId || !paymentMethodId) {
      return NextResponse.json(
        { error: "Payment details incomplete" },
        { status: 400 }
      );
    }

    // Set this payment method as default for future charges
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // The subscription webhooks will handle activating the plan
    // (invoice.paid, customer.subscription.created)
    // The subscription was already created in checkout-session with payment_behavior=default_incomplete

    return NextResponse.json({
      success: true,
      message: mode === "buy-slot"
        ? "Additional website slot added successfully"
        : "Your subscription is now active",
      plan: {
        id: plan.id,
        name: plan.name,
        priceLabel: plan.priceLabel,
      },
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify payment" },
      { status: 500 }
    );
  }
}
