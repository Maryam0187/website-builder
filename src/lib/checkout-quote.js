import { getCachedPricing } from "./pricing-cache";
import { catalogCents } from "./plan-price-label";
import { quoteBestDiscount, ensureStripeCoupon } from "./discounts";

/**
 * Full catalog price for a region and plan, plus the one discount Stripe should apply.
 * The Stripe Price stays at the full amount. The coupon reduces the invoice.
 */
export async function quotePlanCharge({
  region,
  planId,
  mode = "subscribe",
  billingInterval = "monthly",
  couponCode = "",
  fallbackCents = null,
  userId = null,
}) {
  const interval = billingInterval === "yearly" ? "yearly" : "monthly";
  const pricing = await getCachedPricing();
  const row = pricing?.[region]?.[planId] || null;
  const kind = "first";
  let original = catalogCents(row, kind, interval);
  if (original == null && fallbackCents != null) {
    original = interval === "yearly" ? Number(fallbackCents) * 10 : Number(fallbackCents);
  }
  const currency = String(row?.currency || "usd").toLowerCase();
  const quote = await quoteBestDiscount({
    planId,
    billingInterval: interval,
    code: couponCode,
    amountCents: original,
    userId,
  });
  let stripeCouponId = null;
  if (quote.discount && currency === "usd") {
    stripeCouponId = await ensureStripeCoupon(quote.discount, interval);
  }
  const priceIds = interval === "yearly" ? null : row?.stripePriceIds;
  const stripePriceId = kind === "extra" ? priceIds?.extra || null : priceIds?.first || null;
  return {
    interval,
    originalAmount: original,
    finalAmount: quote.finalAmount,
    currency,
    discount: quote.discount,
    discountAmount: quote.discountAmount,
    couponError: quote.couponError,
    stripeCouponId,
    stripePriceId,
  };
}
