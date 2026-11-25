import Stripe from "stripe";

let stripeClient = null;

// Pin to a specific Stripe API version for consistent behavior
const STRIPE_API_VERSION = "2024-12-18.acacia"; // Latest stable version
// wallet_options.link.display was added in this version. Checkout calls opt into it
// so live Checkout does not add Link or bank methods from the Dashboard.
const CHECKOUT_SESSION_API_VERSION = "2025-04-30.basil";

export function cardOnlyCheckoutParams() {
  return {
    payment_method_types: ["card"],
    wallet_options: { link: { display: "never" } },
  };
}

export function cardOnlyCheckoutRequestOptions() {
  return { apiVersion: CHECKOUT_SESSION_API_VERSION };
}

export function isStripeConfigured() {
  return Boolean(String(process.env.STRIPE_SECRET_KEY || "").trim());
}

export function getStripe() {
  const key = String(process.env.STRIPE_SECRET_KEY || "").trim();
  if (!key) {
    throw new Error("Stripe is not configured. Add STRIPE_SECRET_KEY to .env.local");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      apiVersion: STRIPE_API_VERSION,
    });
  }
  return stripeClient;
}

export function getStripeApiVersion() {
  return STRIPE_API_VERSION;
}

export function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}
