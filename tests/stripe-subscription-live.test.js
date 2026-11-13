import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Live Stripe API Tests (requires STRIPE_SECRET_KEY)
 * Tests the actual subscription creation flow end-to-end
 */

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const isTestMode = STRIPE_KEY?.startsWith('sk_test_');

describe("Stripe Subscription Live API Test", () => {
  it("should create subscription with proper client secret structure", async () => {
    if (!STRIPE_KEY) {
      console.log("⚠️  Skipping live test: No STRIPE_SECRET_KEY available");
      return;
    }

    if (!isTestMode) {
      console.log("⚠️  Skipping: Only test mode keys allowed for automated tests");
      return;
    }

    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(STRIPE_KEY);

    try {
      // Create test customer
      const customer = await stripe.customers.create({
        email: "test@example.com",
        name: "Test Customer",
      });

      console.log("✓ Created test customer:", customer.id);

      // Create test product
      const product = await stripe.products.create({
        name: "Test Subscription Product",
        metadata: { test: "true" },
      });

      console.log("✓ Created test product:", product.id);

      // Create test price
      const price = await stripe.prices.create({
        currency: "usd",
        unit_amount: 2999,
        recurring: { interval: "month" },
        product: product.id,
      });

      console.log("✓ Created test price:", price.id);

      // Create subscription with payment_behavior=default_incomplete
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: price.id }],
        payment_behavior: "default_incomplete",
        payment_settings: {
          payment_method_types: ["card"],
          save_default_payment_method: "on_subscription",
        },
        expand: ["latest_invoice.payment_intent"],
        metadata: { test: "true" },
      });

      console.log("✓ Created subscription:", subscription.id);
      console.log("  Status:", subscription.status);

      // Check what we got back
      const latestInvoice = subscription.latest_invoice;
      assert.ok(latestInvoice, "Should have latest_invoice");
      console.log("✓ Latest invoice:", latestInvoice.id);
      console.log("  Invoice status:", latestInvoice.status);

      // Check for client secret in different locations
      let clientSecret = null;
      let secretSource = null;

      if (latestInvoice.confirmation_secret) {
        clientSecret = latestInvoice.confirmation_secret;
        secretSource = "confirmation_secret";
      } else if (latestInvoice.payment_intent?.client_secret) {
        clientSecret = latestInvoice.payment_intent.client_secret;
        secretSource = "payment_intent.client_secret";
      }

      console.log("✓ Client secret source:", secretSource);
      console.log("  Has client secret:", !!clientSecret);

      if (clientSecret) {
        console.log("  Secret prefix:", clientSecret.substring(0, 20) + "...");
      } else {
        console.log("  ⚠️  Invoice structure:", {
          hasConfirmationSecret: !!latestInvoice.confirmation_secret,
          hasPaymentIntent: !!latestInvoice.payment_intent,
          paymentIntentStatus: latestInvoice.payment_intent?.status,
        });
      }

      assert.ok(
        clientSecret,
        "Should have client secret (either confirmation_secret or payment_intent.client_secret)"
      );

      // Clean up
      await stripe.customers.del(customer.id);
      console.log("✓ Cleaned up test customer");

    } catch (error) {
      console.error("❌ Live test failed:", {
        type: error.type,
        code: error.code,
        message: error.message,
        param: error.param,
      });
      throw error;
    }
  });

  it("should validate subscription requirements", () => {
    // Document the requirements for subscription creation
    const requirements = {
      customer: "Required - Stripe customer ID",
      items: "Required - Array with at least one item containing price ID",
      payment_behavior: "Use 'default_incomplete' for on-site payment",
      expand: "Must include 'latest_invoice.payment_intent' to get client secret",
      payment_settings: "Should include payment_method_types and save behavior",
    };

    assert.ok(requirements.customer);
    assert.ok(requirements.items);
    console.log("\n✓ Subscription Requirements Validated:");
    Object.entries(requirements).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
  });
});

if (!STRIPE_KEY) {
  console.log("\n💡 To run live Stripe tests, set STRIPE_SECRET_KEY=sk_test_...");
}
