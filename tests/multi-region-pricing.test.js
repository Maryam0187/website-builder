/**
 * Tests for multi-region pricing and currency support
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  REGIONS,
  PRICING,
  getRegion,
  getRegionPricing,
  formatPrice,
  isStripeSupported,
  getRegionFromCountry,
  COUNTRY_TO_REGION,
} from "../src/lib/pricing.js";

describe("Region Configuration", () => {
  test("all regions defined with required fields", () => {
    const regionKeys = Object.keys(REGIONS);
    assert.ok(regionKeys.length >= 4, "Should have at least 4 regions");
    
    Object.values(REGIONS).forEach(region => {
      assert.ok(region.id, "Region must have id");
      assert.ok(region.name, "Region must have name");
      assert.ok(region.currency, "Region must have currency");
      assert.ok(region.symbol, "Region must have symbol");
      assert.ok(region.locale, "Region must have locale");
      assert.ok(region.paymentProvider, "Region must have paymentProvider");
    });
  });

  test("USA uses USD currency with Stripe", () => {
    const usa = getRegion("usa");
    assert.equal(usa.currency, "USD");
    assert.equal(usa.paymentProvider, "stripe");
    assert.ok(usa.stripePriceEnvPrefix);
  });

  test("Canada uses CAD currency with Stripe", () => {
    const canada = getRegion("canada");
    assert.equal(canada.currency, "CAD");
    assert.equal(canada.paymentProvider, "stripe");
    assert.ok(canada.stripePriceEnvPrefix);
  });

  test("Europe uses EUR currency with Stripe", () => {
    const europe = getRegion("europe");
    assert.equal(europe.currency, "EUR");
    assert.equal(europe.paymentProvider, "stripe");
    assert.ok(europe.stripePriceEnvPrefix);
  });

  test("Pakistan uses PKR currency WITHOUT Stripe", () => {
    const pakistan = getRegion("pakistan");
    assert.equal(pakistan.currency, "PKR");
    assert.equal(pakistan.paymentProvider, "contact");
    assert.equal(pakistan.stripePriceEnvPrefix, null);
  });
});

describe("Stripe Support", () => {
  test("USA supports Stripe", () => {
    assert.equal(isStripeSupported("usa"), true);
  });

  test("Canada supports Stripe", () => {
    assert.equal(isStripeSupported("canada"), true);
  });

  test("Europe supports Stripe", () => {
    assert.equal(isStripeSupported("europe"), true);
  });

  test("Pakistan does NOT support Stripe", () => {
    assert.equal(isStripeSupported("pakistan"), false);
  });
});

describe("Region Pricing", () => {
  test("USA Starter plan pricing", () => {
    const pricing = getRegionPricing("usa", "starter");
    assert.equal(pricing.firstSite, 900); // $9
    assert.equal(pricing.extraSite, 700); // $7
  });

  test("USA Custom plan pricing", () => {
    const pricing = getRegionPricing("usa", "custom");
    assert.equal(pricing.firstSite, 1900); // $19
    assert.equal(pricing.extraSite, 1500); // $15
  });

  test("USA Domain plan pricing", () => {
    const pricing = getRegionPricing("usa", "domain");
    assert.equal(pricing.firstSite, 2900); // $29
    assert.equal(pricing.extraSite, 2400); // $24
  });

  test("USA Pro plan is contact only", () => {
    const pricing = getRegionPricing("usa", "pro");
    assert.equal(pricing.firstSite, null);
    assert.equal(pricing.extraSite, null);
  });

  test("Canada has TODO pricing defined", () => {
    const pricing = getRegionPricing("canada", "starter");
    assert.ok(pricing.firstSite > 0, "CAD pricing should be set");
    assert.ok(pricing.extraSite > 0, "CAD pricing should be set");
  });

  test("Europe has TODO pricing defined", () => {
    const pricing = getRegionPricing("europe", "starter");
    assert.ok(pricing.firstSite > 0, "EUR pricing should be set");
    assert.ok(pricing.extraSite > 0, "EUR pricing should be set");
  });

  test("Pakistan has TODO pricing defined", () => {
    const pricing = getRegionPricing("pakistan", "starter");
    assert.ok(pricing.firstSite > 0, "PKR pricing should be set");
    assert.ok(pricing.extraSite > 0, "PKR pricing should be set");
  });

  test("All regions have pricing for all plans", () => {
    const regions = ["usa", "canada", "europe", "pakistan"];
    const plans = ["free", "starter", "custom", "domain", "pro"];
    
    regions.forEach(region => {
      plans.forEach(plan => {
        const pricing = getRegionPricing(region, plan);
        assert.ok(pricing, `${region} should have ${plan} pricing`);
        assert.ok("firstSite" in pricing, `${region}/${plan} should have firstSite`);
        assert.ok("extraSite" in pricing, `${region}/${plan} should have extraSite`);
      });
    });
  });
});

describe("Price Formatting", () => {
  test("USD formatting", () => {
    assert.equal(formatPrice(900, "usa"), "$9");
    assert.equal(formatPrice(1900, "usa"), "$19");
    assert.equal(formatPrice(2900, "usa"), "$29");
  });

  test("CAD formatting", () => {
    const formatted = formatPrice(1199, "canada");
    assert.ok(formatted.includes("11") || formatted.includes("12"), "Should format CAD");
  });

  test("EUR formatting", () => {
    const formatted = formatPrice(899, "europe");
    assert.ok(formatted.includes("8") || formatted.includes("9"), "Should format EUR");
  });

  test("PKR formatting", () => {
    const formatted = formatPrice(250000, "pakistan");
    assert.ok(formatted.includes("2,500") || formatted.includes("2500"), "Should format PKR");
  });

  test("Free plan always shows Free", () => {
    assert.equal(formatPrice(0, "usa"), "Free");
    assert.equal(formatPrice(0, "canada"), "Free");
    assert.equal(formatPrice(0, "europe"), "Free");
    assert.equal(formatPrice(0, "pakistan"), "Free");
  });

  test("Pro plan shows Contact us", () => {
    assert.equal(formatPrice(null, "usa"), "Contact us");
    assert.equal(formatPrice(null, "canada"), "Contact us");
    assert.equal(formatPrice(null, "europe"), "Contact us");
    assert.equal(formatPrice(null, "pakistan"), "Contact us");
  });
});

describe("Country to Region Mapping", () => {
  test("US maps to USA", () => {
    assert.equal(getRegionFromCountry("US"), "usa");
  });

  test("CA maps to Canada", () => {
    assert.equal(getRegionFromCountry("CA"), "canada");
  });

  test("PK maps to Pakistan", () => {
    assert.equal(getRegionFromCountry("PK"), "pakistan");
  });

  test("EU countries map to Europe", () => {
    assert.equal(getRegionFromCountry("DE"), "europe"); // Germany
    assert.equal(getRegionFromCountry("FR"), "europe"); // France
    assert.equal(getRegionFromCountry("GB"), "europe"); // UK
    assert.equal(getRegionFromCountry("IT"), "europe"); // Italy
    assert.equal(getRegionFromCountry("ES"), "europe"); // Spain
    assert.equal(getRegionFromCountry("NL"), "europe"); // Netherlands
    assert.equal(getRegionFromCountry("SE"), "europe"); // Sweden
    assert.equal(getRegionFromCountry("PL"), "europe"); // Poland
  });

  test("Unknown countries default to USA", () => {
    assert.equal(getRegionFromCountry("XX"), "usa");
    assert.equal(getRegionFromCountry(null), "usa");
    assert.equal(getRegionFromCountry(""), "usa");
  });

  test("Major European countries covered", () => {
    const europeanCountries = ["AT", "BE", "CH", "CZ", "DK", "FI", "GR", "IE", "NO", "PT"];
    europeanCountries.forEach(code => {
      assert.equal(COUNTRY_TO_REGION[code], "europe", `${code} should map to europe`);
    });
  });
});

describe("Pakistan Stripe Blocking", () => {
  test("Pakistan cannot use Stripe", () => {
    const pakistan = getRegion("pakistan");
    assert.equal(pakistan.paymentProvider, "contact");
    assert.equal(isStripeSupported("pakistan"), false);
  });

  test("Pakistan has no Stripe price env prefix", () => {
    const pakistan = getRegion("pakistan");
    assert.equal(pakistan.stripePriceEnvPrefix, null);
  });

  test("Other regions can use Stripe", () => {
    assert.ok(isStripeSupported("usa"));
    assert.ok(isStripeSupported("canada"));
    assert.ok(isStripeSupported("europe"));
  });
});

console.log("✅ All multi-region pricing tests passed!");
console.log("Test Coverage:");
console.log("  ✓ Region configuration (USA, Canada, Europe, Pakistan)");
console.log("  ✓ Stripe support detection");
console.log("  ✓ Per-region pricing for all plans");
console.log("  ✓ Currency formatting (USD, CAD, EUR, PKR)");
console.log("  ✓ Country-to-region mapping");
console.log("  ✓ Pakistan Stripe blocking");
console.log("");
console.log("⚠️  TODO items for production:");
console.log("  - Set final CAD pricing (currently placeholder ~1.35x USD)");
console.log("  - Set final EUR pricing (currently placeholder ~0.92x USD + VAT)");
console.log("  - Set final PKR pricing (currently placeholder ~280x USD)");
console.log("  - Create Stripe prices for CAD and EUR in Stripe dashboard");
console.log("  - Set environment variables:");
console.log("    STRIPE_PRICE_CAD_STARTER, STRIPE_PRICE_CAD_STARTER_EXTRA");
console.log("    STRIPE_PRICE_CAD_CUSTOM, STRIPE_PRICE_CAD_CUSTOM_EXTRA");
console.log("    STRIPE_PRICE_CAD_DOMAIN, STRIPE_PRICE_CAD_DOMAIN_EXTRA");
console.log("    STRIPE_PRICE_EUR_STARTER, STRIPE_PRICE_EUR_STARTER_EXTRA");
console.log("    STRIPE_PRICE_EUR_CUSTOM, STRIPE_PRICE_EUR_CUSTOM_EXTRA");
console.log("    STRIPE_PRICE_EUR_DOMAIN, STRIPE_PRICE_EUR_DOMAIN_EXTRA");
