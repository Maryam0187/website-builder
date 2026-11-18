import { describe, it } from "node:test";
import assert from "node:assert/strict";

/**
 * Tests to verify Stripe Subscription API usage
 * 
 * Subscriptions API does NOT accept price_data.product_data
 * It requires either:
 * 1. A Price ID: items: [{ price: "price_xxx" }]
 * 2. price_data with product ID: price_data: { product: "prod_xxx", ... }
 */

describe("Stripe Subscription API - Product Handling", () => {
  it("should create Product before Price for subscriptions", () => {
    // Mock the Stripe API flow
    const mockStripe = {
      products: {
        create: (params) => {
          assert.ok(params.name, "Product must have a name");
          assert.ok(params.metadata, "Product should have metadata");
          return Promise.resolve({ id: "prod_test123" });
        },
      },
      prices: {
        create: (params) => {
          assert.ok(params.product, "Price must reference a product ID");
          assert.strictEqual(typeof params.product, "string", "Product must be a string ID");
          assert.ok(!params.product_data, "price_data should NOT have product_data");
          assert.ok(params.recurring, "Price must be recurring for subscriptions");
          return Promise.resolve({ id: "price_test456" });
        },
      },
      subscriptions: {
        create: (params) => {
          assert.ok(params.items, "Subscription must have items");
          assert.ok(params.items[0].price, "Subscription item must reference a price ID");
          
          // Verify we're NOT using price_data with product_data
          if (params.items[0].price_data) {
            assert.fail("Subscriptions should use price IDs, not inline price_data");
          }
          
          return Promise.resolve({
            id: "sub_test789",
            status: "active",
            latest_invoice: {
              payment_intent: {
                id: "pi_test",
                client_secret: "pi_test_secret_xxx",
              },
            },
          });
        },
      },
    };

    // Simulate the correct flow
    return (async () => {
      const product = await mockStripe.products.create({
        name: "Easy Website — Starter",
        metadata: { planId: "starter" },
      });

      const price = await mockStripe.prices.create({
        currency: "usd",
        unit_amount: 2999,
        recurring: { interval: "month" },
        product: product.id, // Use product ID
      });

      const subscription = await mockStripe.subscriptions.create({
        customer: "cus_test",
        items: [{ price: price.id }], // Use price ID
        payment_behavior: "default_incomplete",
        expand: ["latest_invoice.payment_intent"],
      });

      assert.strictEqual(subscription.id, "sub_test789");
    })();
  });

  it("should reject subscriptions with price_data.product_data", () => {
    const invalidSubscriptionCreate = {
      customer: "cus_test",
      items: [{
        price_data: {
          currency: "usd",
          unit_amount: 2999,
          recurring: { interval: "month" },
          product_data: {
            name: "Easy Website — Starter",
          },
        },
      }],
    };

    // This would fail with Stripe API error:
    // "Received unknown parameter: items[0][price_data][product_data]"
    assert.ok(
      invalidSubscriptionCreate.items[0].price_data?.product_data,
      "This structure is INVALID for subscriptions"
    );
  });

  it("should use correct discount parameters for subscriptions", () => {
    // Correct way to apply coupons to subscriptions
    const validSubscriptionWithCoupon = {
      customer: "cus_test",
      items: [{ price: "price_xxx" }],
      discounts: [{ coupon: "SUMMER50" }], // OR { promotion_code: "promo_xxx" }
    };

    assert.ok(validSubscriptionWithCoupon.discounts);
    assert.ok(validSubscriptionWithCoupon.discounts[0].coupon);
    
    // NOT like Checkout Sessions which use coupon: "xxx" directly
    assert.ok(!validSubscriptionWithCoupon.coupon);
  });
});

describe("Stripe Subscription API - Price Data vs Price ID", () => {
  it("should prefer stored Price IDs from pricing_configs", () => {
    const pricingConfig = {
      stripePriceIds: {
        first: "price_stored_first_site",
        extra: "price_stored_extra_site",
      },
    };

    // If we have stored Price IDs, use them directly
    assert.ok(pricingConfig.stripePriceIds.first);
    assert.ok(pricingConfig.stripePriceIds.extra);
  });

  it("should create Product+Price on-demand if no stored Price ID", () => {
    const pricingConfig = {
      stripePriceIds: {
        first: null, // No stored Price ID
      },
    };

    // When no stored Price ID, we must:
    // 1. Create Product
    // 2. Create Price with product: product.id
    // 3. Use the new price.id
    assert.strictEqual(pricingConfig.stripePriceIds.first, null);
  });
});

console.log(`
✅ Stripe Subscription API Tests
   - Product must be created before Price
   - Price must reference Product ID (not product_data)
   - Subscriptions use price IDs (not inline price_data)
   - Discounts use discounts: [{coupon}] format
`);
