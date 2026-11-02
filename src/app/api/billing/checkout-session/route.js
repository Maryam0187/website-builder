import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { getPlan } from "@/lib/billing";
import { getUserById } from "@/lib/auth";

/**
 * POST /api/billing/checkout-session
 * 
 * Creates a PaymentIntent for on-site checkout using Payment Element
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
    const planId = String(body.planId || "starter").trim();
    const mode = String(body.mode || "subscribe").trim(); // subscribe | buy-slot

    const plan = getPlan(planId);
    if (!plan || !plan.priceCents || plan.priceCents <= 0) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const stripe = getStripe();
    const freshUser = await getUserById(user.id);

    // Get or create Stripe customer
    let customerId = freshUser.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: freshUser.email,
        name: freshUser.name || undefined,
        metadata: { userId: String(freshUser.id) },
      });
      customerId = customer.id;
      
      // Update user with customer ID
      const { query } = await import("@/lib/db");
      await query(
        `UPDATE users SET stripe_customer_id = $1 WHERE id = $2`,
        [customerId, freshUser.id]
      );
    }

    // Determine amount (first site vs additional site)
    const amount = mode === "buy-slot" && plan.additionalPriceCents
      ? plan.additionalPriceCents
      : plan.priceCents;

    // Create subscription with payment_behavior=default_incomplete
    // This creates a subscription in 'incomplete' status with an attached payment intent
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{
        price_data: {
          currency: "usd",
          unit_amount: amount,
          recurring: { interval: "month" },
          product_data: {
            name: mode === "buy-slot"
              ? `${plan.name} — additional website`
              : `Easy Website — ${plan.name}`,
            description: mode === "buy-slot"
              ? `Additional website on your ${plan.name} plan. ${plan.additionalPriceLabel || plan.priceLabel} per month.`
              : `${plan.description}`,
            tax_code: "txcd_10103001",
          },
        },
      }],
      payment_behavior: "default_incomplete",
      payment_settings: {
        payment_method_types: ["card"],
        save_default_payment_method: "on_subscription",
      },
      expand: ["latest_invoice.payment_intent"],
      metadata: {
        userId: String(freshUser.id),
        planId: plan.id,
        mode,
      },
    });

    const paymentIntent = subscription.latest_invoice.payment_intent;

    if (!paymentIntent || !paymentIntent.client_secret) {
      return NextResponse.json(
        { error: "Failed to create payment intent" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      subscriptionId: subscription.id,
      plan: {
        id: plan.id,
        name: plan.name,
        priceCents: plan.priceCents,
        priceLabel: plan.priceLabel,
        additionalPriceCents: plan.additionalPriceCents,
        additionalPriceLabel: plan.additionalPriceLabel,
        highlights: plan.highlights,
      },
      mode,
    });
  } catch (error) {
    console.error("Checkout session creation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
