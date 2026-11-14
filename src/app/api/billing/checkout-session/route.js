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

  // Rate limit: 10 requests per minute per user
  const { rateLimiters, applyRateLimit } = await import("@/lib/rate-limit");
  const rateCheck = await applyRateLimit(request, rateLimiters.checkout, 'checkout-session', user.id);
  if (rateCheck.limited) return rateCheck.response;

  const { getBillingRegion, regionAllowsStripe } = await import("@/lib/billing-regions");
  const { getRegionName } = await import("@/lib/region-detection");
  const userRegion = user.region || "usa";
  const regionRow = await getBillingRegion(userRegion);
  if (!(await regionAllowsStripe(userRegion))) {
    const name = regionRow?.name || getRegionName(userRegion);
    return NextResponse.json({
      error: regionRow && !regionRow.enabled
        ? `${name} is not available for checkout.`
        : `Stripe payments are not available in ${name}. Please contact us for payment options.`,
      region: userRegion,
      requiresContact: true,
    }, { status: 403 });
  }

  try {
    const body = await request.json();
    const planId = String(body.planId || "starter").trim();
    const mode = String(body.mode || "subscribe").trim(); // subscribe | buy-slot
    const billingInterval = body.billingInterval === "yearly" ? "yearly" : "monthly";
    const couponCode = String(body.couponCode || "").trim();

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

    const { quotePlanCharge } = await import("@/lib/checkout-quote");
    const { formatRegionAmount } = await import("@/lib/plan-price-label");
    const quoted = await quotePlanCharge({
      region: userRegion,
      planId,
      mode,
      billingInterval,
      couponCode,
      fallbackCents: mode === "buy-slot" ? plan.additionalPriceCents : plan.priceCents,
    });
    if (quoted.couponError) {
      return NextResponse.json({ error: quoted.couponError }, { status: 400 });
    }
    if (quoted.originalAmount == null || quoted.originalAmount < 0) {
      return NextResponse.json({ error: "This plan has no price for that billing period" }, { status: 400 });
    }
    if (quoted.discount && !quoted.stripeCouponId) {
      return NextResponse.json(
        { error: "Could not apply the discount in Stripe. Try again." },
        { status: 502 }
      );
    }

    const amount = quoted.originalAmount;
    const priceCurrency = quoted.currency || "usd";
    const period = quoted.interval === "yearly" ? "year" : "month";
    let priceId = quoted.stripePriceId;

    // If no stored Price ID, create Product and Price on-demand
    if (!priceId) {
      const productName = mode === "buy-slot"
        ? `${plan.name} — Additional Website`
        : `Easy Website — ${plan.name}`;
      
      // Create Product first
      const product = await stripe.products.create({
        name: productName,
        description: mode === "buy-slot"
          ? `Additional website on your ${plan.name} plan.`
          : plan.description,
        tax_code: "txcd_10103001",
        metadata: { 
          planId: plan.id,
          mode: mode === "buy-slot" ? "extra" : "first"
        },
      });

      // Create Price with Product ID (NOT product_data)
      const price = await stripe.prices.create({
        currency: priceCurrency,
        unit_amount: amount,
        recurring: { interval: period },
        product: product.id,
        metadata: {
          planId: plan.id,
          mode: mode === "buy-slot" ? "extra" : "first",
          billingInterval: quoted.interval,
        },
      });

      priceId = price.id;
    }

    if (body.replaceSubscriptionId) {
      try {
        const previous = await stripe.subscriptions.retrieve(String(body.replaceSubscriptionId));
        const previousCustomer = typeof previous.customer === "string" ? previous.customer : previous.customer?.id;
        if (
          previousCustomer === customerId
          && (previous.status === "incomplete" || previous.status === "incomplete_expired")
        ) {
          await stripe.subscriptions.cancel(previous.id);
        }
      } catch (replaceError) {
        console.warn("Could not replace the previous checkout:", replaceError.message);
      }
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      discounts: quoted.stripeCouponId ? [{ coupon: quoted.stripeCouponId }] : undefined,
      payment_behavior: "default_incomplete",
      payment_settings: {
        payment_method_types: ["card"],
        save_default_payment_method: "on_subscription",
      },
      expand: ["latest_invoice"],
      metadata: {
        userId: String(freshUser.id),
        planId: plan.id,
        mode,
        billingInterval: quoted.interval,
        discountId: quoted.discount?.id ? String(quoted.discount.id) : "",
      },
    });

    // Extract client secret - handle both old and new Stripe API versions
    let clientSecret = null;
    const latestInvoice = subscription.latest_invoice;

    if (!latestInvoice) {
      console.error("Checkout session error: No latest_invoice on subscription", {
        subscriptionId: subscription.id,
        status: subscription.status,
      });
      return NextResponse.json(
        { error: "Subscription created but no invoice generated" },
        { status: 500 }
      );
    }

    const dueLabel = formatRegionAmount(quoted.finalAmount, priceCurrency.toUpperCase(), {
      per: quoted.finalAmount > 0 ? period : null,
    });
    const fullLabel = formatRegionAmount(quoted.originalAmount, priceCurrency.toUpperCase(), {
      per: quoted.originalAmount > 0 ? period : null,
    });
    const planPayload = {
      id: plan.id,
      name: plan.name,
      priceCents: quoted.finalAmount,
      priceLabel: dueLabel,
      compareAtLabel: quoted.discount ? fullLabel : null,
      additionalPriceCents: plan.additionalPriceCents,
      additionalPriceLabel: plan.additionalPriceLabel,
      highlights: plan.highlights,
    };
    const charge = {
      billingInterval: quoted.interval,
      currency: priceCurrency,
      originalAmount: quoted.originalAmount,
      finalAmount: quoted.finalAmount,
      discount: quoted.discount
        ? {
            id: quoted.discount.id,
            name: quoted.discount.name,
            code: quoted.discount.code,
            valueType: quoted.discount.value_type,
            valueAmount: quoted.discount.value_amount,
          }
        : null,
    };

    const paymentIntentId = typeof latestInvoice.payment_intent === "string"
      ? latestInvoice.payment_intent
      : latestInvoice.payment_intent?.id;
    if (paymentIntentId && quoted.discount?.id) {
      try {
        await stripe.paymentIntents.update(paymentIntentId, {
          metadata: {
            discountId: String(quoted.discount.id),
            subscriptionId: subscription.id,
            userId: String(freshUser.id),
          },
        });
      } catch (metaError) {
        console.warn("Could not store discount on the payment:", metaError.message);
      }
    }

    // Handle $0 invoices (100% discount, trial, etc.)
    if (latestInvoice.total === 0 || latestInvoice.amount_due === 0) {
      console.log("Checkout session: $0 invoice, no payment needed", {
        subscriptionId: subscription.id,
        invoiceId: latestInvoice.id,
      });
      
      // For $0 invoices, check if there's a setup intent
      if (latestInvoice.setup_intent) {
        const setupIntent = await stripe.setupIntents.retrieve(latestInvoice.setup_intent);
        clientSecret = setupIntent.client_secret;
      } else {
        if (quoted.discount?.id) {
          const { redeemDiscount } = await import("@/lib/discounts");
          await redeemDiscount(quoted.discount.id, freshUser.id, subscription.id).catch((err) => {
            console.error("Discount redemption failed:", err);
          });
        }
        return NextResponse.json({
          clientSecret: null,
          subscriptionId: subscription.id,
          requiresPayment: false,
          plan: planPayload,
          charge,
          mode,
        });
      }
    } else {
      // Normal paid invoice - get client secret
      // Try confirmation_secret first (2024+ API)
      if (latestInvoice.confirmation_secret) {
        // confirmation_secret is an OBJECT: {client_secret, type}
        clientSecret = typeof latestInvoice.confirmation_secret === 'object'
          ? latestInvoice.confirmation_secret.client_secret
          : latestInvoice.confirmation_secret;
      }
      // Fall back to payment_intent.client_secret (pre-2024 API)
      else if (latestInvoice.payment_intent) {
        const paymentIntent = typeof latestInvoice.payment_intent === 'string'
          ? await stripe.paymentIntents.retrieve(latestInvoice.payment_intent)
          : latestInvoice.payment_intent;
        clientSecret = paymentIntent.client_secret;
      }
    }

    if (!clientSecret) {
      console.error("Checkout session error: No client secret found", {
        subscriptionId: subscription.id,
        invoiceId: latestInvoice.id,
        invoiceTotal: latestInvoice.total,
        invoiceAmountDue: latestInvoice.amount_due,
        invoiceStatus: latestInvoice.status,
        hasConfirmationSecret: !!latestInvoice.confirmation_secret,
        confirmationSecretType: typeof latestInvoice.confirmation_secret,
        hasPaymentIntent: !!latestInvoice.payment_intent,
        hasSetupIntent: !!latestInvoice.setup_intent,
      });
      return NextResponse.json(
        { error: "Failed to create payment intent - no client secret available" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      clientSecret,
      subscriptionId: subscription.id,
      plan: planPayload,
      charge,
      mode,
    });
  } catch (error) {
    // Log detailed Stripe error for debugging
    console.error("Checkout session creation error:", {
      type: error.type,
      code: error.code,
      message: error.message,
      param: error.param,
      statusCode: error.statusCode,
      requestId: error.requestId,
    });
    
    // Return the actual Stripe error message to help debug
    const errorMessage = error.message || "Failed to create checkout session";
    const debugInfo = process.env.NODE_ENV === "development" ? {
      type: error.type,
      code: error.code,
      param: error.param,
    } : {};
    
    return NextResponse.json(
      { error: errorMessage, ...debugInfo },
      { status: error.statusCode || 500 }
    );
  }
}
