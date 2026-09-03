import Stripe from "stripe";

let stripeClient = null;

export function isStripeConfigured() {
  return Boolean(String(process.env.STRIPE_SECRET_KEY || "").trim());
}

export function getStripe() {
  const key = String(process.env.STRIPE_SECRET_KEY || "").trim();
  if (!key) {
    throw new Error("Stripe is not configured. Add STRIPE_SECRET_KEY to .env.local");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}
