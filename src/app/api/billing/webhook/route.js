import { NextResponse } from "next/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import {
  applyAddonCheckoutSession,
  applyCheckoutSession,
  applyStripeSubscription,
} from "@/lib/billing";

export const runtime = "nodejs";

export async function POST(request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const webhookSecret = String(process.env.STRIPE_WEBHOOK_SECRET || "").trim();
  const stripe = getStripe();
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event;
  try {
    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else if (process.env.NODE_ENV !== "production") {
      // Local sandbox without webhook secret — parse JSON (not for production)
      event = JSON.parse(body);
    } else {
      return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 400 });
    }
  } catch (err) {
    console.error(
      "Stripe webhook signature error:",
      err.message,
      "| Update STRIPE_WEBHOOK_SECRET to the whsec_… printed by `stripe listen`, then restart next dev.",
    );
    return NextResponse.json(
      {
        error: `Webhook signature error: ${err.message}`,
        hint: "Locally, copy the whsec_ from `stripe listen` into STRIPE_WEBHOOK_SECRET and restart the app.",
      },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "payment" || session.metadata?.kind === "addon") {
          await applyAddonCheckoutSession(session);
        } else if (session.mode === "subscription") {
          await applyCheckoutSession(session);
        }
        break;
      }
      case "setup_intent.succeeded": {
        // SetupIntent succeeded - payment method is now available for future charges
        // No action needed here, the payment method is automatically attached to the customer
        console.log("SetupIntent succeeded:", event.data.object.id);
        break;
      }
      case "payment_intent.succeeded": {
        // PaymentIntent succeeded - one-time payment completed (e.g., extra site slot)
        console.log("PaymentIntent succeeded:", event.data.object.id);
        break;
      }
      case "payment_intent.payment_failed": {
        // PaymentIntent failed - log for debugging
        console.error("PaymentIntent failed:", event.data.object.id, event.data.object.last_payment_error);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await applyStripeSubscription(event.data.object);
        break;
      }
      default:
        console.log("Unhandled webhook event:", event.type);
        break;
    }
  } catch (err) {
    console.error("Stripe webhook handler error:", err);
    return NextResponse.json({ error: err.message || "Webhook failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
