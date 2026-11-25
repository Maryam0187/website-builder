/**
 * Client-safe plan labels.
 * Admin-saved region prices (from pricing_configs) win.
 * Pakistan fallback amounts match src/lib/pricing.js (paisa).
 */
const PAKISTAN_PRICING = {
  free: { firstSite: 0, extraSite: 140000 },
  starter: { firstSite: 250000, extraSite: 200000 },
  custom: { firstSite: 530000, extraSite: 420000 },
  domain: { firstSite: 810000, extraSite: 670000 },
  pro: { firstSite: null, extraSite: null },
};

function localeFor(currency) {
  return String(currency || "USD").toUpperCase() === "PKR" ? "en-PK" : "en-US";
}

export function formatRegionAmount(cents, currency = "USD", { perMonth = false, per = null } = {}) {
  const code = String(currency || "USD").toUpperCase();
  const period = per || (perMonth ? "month" : null);
  if (cents == null) return "Contact us";
  if (cents === 0) {
    const base = code === "PKR" ? "Rs 0" : "$0";
    return period ? `${base}/${period}` : base;
  }
  const whole = Number.isInteger(Number(cents) / 100);
  const formatted = new Intl.NumberFormat(localeFor(code), {
    style: "currency",
    currency: code,
    minimumFractionDigits: code === "PKR" || whole ? 0 : 2,
    maximumFractionDigits: code === "PKR" ? 0 : 2,
  }).format(cents / 100);
  return period ? `${formatted}/${period}` : formatted;
}

/** Yearly is always 10 months of the monthly price (2 months free). */
export function yearlyCents(monthlyCents) {
  if (monthlyCents == null || monthlyCents === "") return null;
  return Number(monthlyCents) * 10;
}

export function catalogCents(row, kind, interval = "monthly") {
  if (!row) return null;
  const monthly = kind === "extra" ? row.extraSite : row.firstSite;
  if (interval !== "yearly") return monthly == null ? null : Number(monthly);
  return yearlyCents(monthly);
}

export function savingsFor(cents, offer) {
  const amount = Number(cents) || 0;
  if (!offer || amount <= 0) return 0;
  if (offer.valueType === "percent") return Math.floor((amount * Number(offer.valueAmount)) / 100);
  if (offer.valueType === "fixed") return Math.min(Number(offer.valueAmount) || 0, amount);
  return 0;
}

export function offerFits(offer, planId, interval) {
  if (!offer?.valueType) return false;
  const plans = offer.applicablePlans || [];
  if (plans.length && !plans.includes(planId)) return false;
  if (offer.billingInterval && offer.billingInterval !== interval) return false;
  return true;
}

export function pickOffer(launchOffer, coupon, planId, interval, cents) {
  const launch = offerFits(launchOffer, planId, interval) ? launchOffer : null;
  const code = offerFits(coupon, planId, interval) ? coupon : null;
  if (!launch) return code;
  if (!code) return launch;
  return savingsFor(cents, launch) >= savingsFor(cents, code) ? launch : code;
}

export function offerPhrase(offer) {
  if (!offer) return "";
  const value = offer.valueType === "percent" ? `${offer.valueAmount}% off` : "Amount off";
  if (offer.durationType === "repeating" && offer.durationMonths) {
    return `${value} for ${offer.durationMonths} months`;
  }
  if (offer.durationType === "once") return `${value} on the first payment`;
  if (offer.durationType === "forever") return `${value}, ongoing`;
  return value;
}

export function formatPkr(cents, options) {
  return formatRegionAmount(cents, "PKR", options);
}

export function withRegionPricing(plan, regionId, regionPrices, billingInterval = "monthly") {
  if (!plan) return plan;
  const region = String(regionId || "usa").toLowerCase();
  const interval = billingInterval === "yearly" ? "yearly" : "monthly";
  const row = regionPrices?.[region]?.[plan.id];
  const fallback = region === "pakistan" ? PAKISTAN_PRICING[plan.id] : null;
  if (!row && !fallback) return plan;

  const currency = row?.currency || (region === "pakistan" ? "PKR" : "USD");
  const source = row || fallback;
  const firstSite = catalogCents(source, "first", interval);
  const extraSite = catalogCents(source, "extra", interval);
  const period = interval === "yearly" ? "year" : "month";
  const contactOnly = plan.id === "pro" && !(Number(firstSite) > 0);

  if (contactOnly || firstSite == null) {
    return {
      ...plan,
      priceCents: null,
      additionalPriceCents: extraSite,
      priceLabel: "Contact us",
      additionalPriceLabel: extraSite == null ? "Contact us" : formatRegionAmount(extraSite, currency, { per: period }),
      currency,
      billingInterval: interval,
    };
  }

  const priceLabel = formatRegionAmount(firstSite, currency, {
    per: Number(firstSite) !== 0 ? period : null,
  });
  const yearlyNote = interval === "yearly" && Number(firstSite) > 0 ? "2 months free" : null;
  const additionalPriceLabel = formatRegionAmount(extraSite, currency, { per: period });
  const plainFirst = formatRegionAmount(firstSite, currency);
  const highlights = Array.isArray(plan.highlights)
    ? plan.highlights.map((line) => {
        if (!String(line).includes("$") && !String(line).includes("Rs")) return line;
        if (Number(firstSite) === 0) return "Add more websites on any plan";
        return `${plainFirst} per website`;
      })
    : plan.highlights;

  let description = plan.description;
  if (plan.id === "free") {
    description = "1 website · all templates · switch anytime. Add more websites on Free or on a paid plan.";
  } else if (plan.id === "custom") {
    description = "Publish on a Technonaire address you choose. Each website is billed at this plan's price.";
  } else if (plan.id === "domain") {
    description = "Live site + hosting on your own domain. Each website is billed at this plan's price.";
  }

  return {
    ...plan,
    priceCents: firstSite,
    additionalPriceCents: extraSite,
    priceLabel,
    additionalPriceLabel,
    yearlyNote,
    highlights,
    description,
    currency,
    billingInterval: interval,
  };
}
