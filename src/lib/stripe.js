import Stripe from "stripe";

let stripeClient = null;

// Pin to a specific Stripe API version for consistent behavior
const STRIPE_API_VERSION = "2024-12-18.acacia"; // Latest stable version

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
