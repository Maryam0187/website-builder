import { nanoid } from "nanoid";
import { query } from "./db";
import { getUserById, publicUser } from "./auth";
import { getTemplate, resolveTemplateId } from "./templates";
import { appBaseUrl, getStripe, isStripeConfigured } from "./stripe";
import {
  countLiveSitesByOwner,
  countSitesByOwner,
  getSiteById,
  isSiteLive,
  ownerOwnsSite,
  setSiteLiveStatus,
} from "./store-actions";

export const TRIAL_DAYS = 14;
export const BILLING_PERIOD_DAYS = 30;
export const BILLING_CURRENCY = "usd";

/** Templates available without an active subscription/trial. */
export const FREE_TEMPLATE_IDS = new Set([
  "bakery",
  "clinic",
  "restaurant",
  "shop",
  "services",
  "other",
]);

/**
 * USD packages. Paid via Stripe Checkout when configured.
 * Free is the default plan — 1 website, all templates, switch anytime.
 * Extra website: one-time +1 slot after successful payment (max 2 sites).
 */
/** 1 included + 1 extra after a paid add-on. */
export const MAX_SITE_SLOTS = 2;

export const PLANS = {
  free: {
    id: "free",
    name: "Free",
    priceCents: 0,
    priceLabel: "$0",
    additionalPriceCents: 500,
    additionalPriceLabel: "$5/month",
    description:
      "1 website · all templates · switch anytime. Add a 2nd website for $5/month. Publish when you pick a paid plan.",
    features: {
      live: false,
      hosting: false,
      domain: false,
      pwa: false,
      technonaireAddress: null,
      premiumTemplates: true,
      templateSwitch: true,
    },
    highlights: [
      "1 website included",
      "All templates · switch anytime",
      "Add 2nd website · $5/month",
      "Draft only · no card needed",
    ],
  },
  starter: {
    id: "starter",
    name: "Starter",
    priceCents: 900,
    priceLabel: "$9/month",
    additionalPriceCents: 700,
    additionalPriceLabel: "$7/month",
    description:
      "Publish and host on an automatic Technonaire address. Additional websites $7/month each.",
    features: {
      live: true,
      hosting: true,
      domain: false,
      pwa: false,
      technonaireAddress: "random",
      premiumTemplates: true,
      templateSwitch: true,
    },
    highlights: [
      "Live website + hosting",
      "Automatic Technonaire address",
      "$9 first site · $7 each additional",
      "Switch templates anytime",
    ],
  },
  custom: {
    id: "custom",
    name: "Custom",
    priceCents: 1900,
    priceLabel: "$19/month",
    additionalPriceCents: 1500,
    additionalPriceLabel: "$15/month",
    description:
      "Publish on a Technonaire address you choose. Additional websites $15/month each.",
    features: {
      live: true,
      hosting: true,
      domain: false,
      pwa: false,
      technonaireAddress: "chosen",
      premiumTemplates: true,
      templateSwitch: true,
    },
    highlights: [
      "Everything in Starter",
      "Customer-selected Technonaire address",
      "$19 first site · $15 each additional",
      "Switch templates anytime",
    ],
  },
  domain: {
    id: "domain",
    name: "Domain",
    priceCents: 2900,
    priceLabel: "$29/month",
    additionalPriceCents: 2400,
    additionalPriceLabel: "$24/month",
    description:
      "Live site + hosting on your own domain. Additional websites $24/month each.",
    features: {
      live: true,
      hosting: true,
      domain: true,
      pwa: false,
      technonaireAddress: "chosen",
      premiumTemplates: true,
      templateSwitch: true,
    },
    highlights: [
      "Everything in Custom",
      "Your own domain",
      "$29 first site · $24 each additional",
      "Self-serve DNS guide",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro + PWA",
    priceCents: 3900,
    priceLabel: "$39/month",
    additionalPriceCents: 3400,
    additionalPriceLabel: "$34/month",
    description:
      "Custom domain plus installable PWA. Additional websites $34/month each.",
    features: {
      live: true,
      hosting: true,
      domain: true,
      pwa: true,
      technonaireAddress: "chosen",
      premiumTemplates: true,
      templateSwitch: true,
    },
    highlights: [
      "Everything in Domain",
      "Installable PWA",
      "$39 first site · $34 each additional",
      "Priority support",
    ],
  },
};

export const DEFAULT_PLAN_ID = "free";
export const TRIAL_PLAN_ID = "starter";

/** Higher number = higher tier (for upgrade / downgrade UI). */
export const PLAN_RANK = {
  free: 0,
  starter: 1,
  custom: 2,
  /** @deprecated Alias of custom — kept for existing subscribers / Stripe metadata */
  live: 2,
  domain: 3,
  pro: 4,
};

/** Map legacy plan ids to current catalog ids. */
export function normalizePlanId(planId) {
  const id = String(planId || "").toLowerCase().trim();
  if (id === "live") return "custom";
  return id;
}

export function planRank(planId) {
  return PLAN_RANK[normalizePlanId(planId)] || 0;
}

export function listPlans() {
  return Object.values(PLANS).map((p) => ({
    id: p.id,
    name: p.name,
    priceCents: p.priceCents,
    priceLabel: p.priceLabel,
    additionalPriceCents: p.additionalPriceCents,
    additionalPriceLabel: p.additionalPriceLabel,
    description: p.description,
    features: p.features,
    highlights: p.highlights,
    rank: PLAN_RANK[p.id] || 0,
  }));
}

export function getPlan(planId) {
  const id = normalizePlanId(planId);
  return PLANS[id] || PLANS[DEFAULT_PLAN_ID];
}

/** Add-ons: legacy only. Extra websites are billed monthly via plan quantity (Stripe). */
export const ADDONS = {
  site_plus_1: {
    id: "site_plus_1",
    name: "Additional website",
    priceCents: 700,
    priceLabel: "from $7/month",
    billingType: "monthly",
    category: "slot",
    siteSlots: 1,
    description:
      "Additional websites are billed monthly as part of your plan. Starter +$7/mo · Custom +$15/mo · Domain +$24/mo · Pro +$34/mo.",
    highlights: [
      "Priced by your plan",
      "Starter +$7 · Custom +$15 · Domain +$24 · Pro +$34",
      "Managed through your subscription",
    ],
  },
  // Kept for old invoices; not offered for new purchases.
  service_live: {
    id: "service_live",
    name: "Make live",
    priceCents: 9900,
    priceLabel: "$99 once",
    billingType: "one_time",
    category: "service",
    siteSlots: 0,
    description: "Legacy add-on. Publishing is included in paid plans.",
    highlights: ["Legacy"],
  },
  service_domain: {
    id: "service_domain",
    name: "Domain setup",
    priceCents: 7900,
    priceLabel: "$79 once",
    billingType: "one_time",
    category: "service",
    siteSlots: 0,
    description:
      "Legacy add-on. Phase 1 uses self-serve DNS on the Domain plan — not done-for-you setup.",
    highlights: ["Legacy"],
  },
  service_pwa: {
    id: "service_pwa",
    name: "PWA setup",
    priceCents: 9900,
    priceLabel: "$99 once",
    billingType: "one_time",
    category: "service",
    siteSlots: 0,
    description:
      "Legacy add-on. Phase 1 Pro + PWA will generate the PWA automatically.",
    highlights: ["Legacy"],
  },
  // Kept for old invoices; not offered for new purchases.
  site_plus_2: {
    id: "site_plus_2",
    name: "+2 Websites",
    priceCents: 8900,
    priceLabel: "$89 once",
    billingType: "one_time",
    category: "slot",
    siteSlots: 2,
    description: "Legacy add-on. New purchases are limited to one extra website.",
    highlights: ["Legacy"],
  },
};

/** Public shop: no one-time add-ons. Additional sites are monthly via plan quantity. */
const PUBLIC_ADDON_IDS = [];

function serializeAddon(a) {
  return {
    id: a.id,
    name: a.name,
    priceCents: a.priceCents,
    priceLabel: a.priceLabel,
    billingType: a.billingType,
    category: a.category || "service",
    siteSlots: a.siteSlots || 0,
    description: a.description,
    highlights: a.highlights,
    kind: "addon",
  };
}

export function listAddons() {
  return PUBLIC_ADDON_IDS.map((id) => serializeAddon(ADDONS[id]));
}

export function getAddon(addonId) {
  const id = String(addonId || "").toLowerCase().trim();
  return ADDONS[id] || null;
}

export function listShopPackages() {
  return [
    {
      id: "free",
      kind: "plan",
      billingType: "included",
      name: "Free",
      priceCents: 0,
      priceLabel: "$0",
      additionalPriceLabel: "—",
      description:
        "Default package. 1 website, all templates, switch anytime. No live hosting.",
      highlights: [
        "Included by default",
        "1 website · all templates",
        "Switch templates anytime",
      ],
    },
    {
      id: "starter",
      kind: "plan",
      billingType: "monthly",
      name: PLANS.starter.name,
      priceCents: PLANS.starter.priceCents,
      priceLabel: PLANS.starter.priceLabel,
      additionalPriceCents: PLANS.starter.additionalPriceCents,
      additionalPriceLabel: PLANS.starter.additionalPriceLabel,
      description: PLANS.starter.description,
      highlights: PLANS.starter.highlights,
    },
    {
      id: "custom",
      kind: "plan",
      billingType: "monthly",
      name: PLANS.custom.name,
      priceCents: PLANS.custom.priceCents,
      priceLabel: PLANS.custom.priceLabel,
      additionalPriceCents: PLANS.custom.additionalPriceCents,
      additionalPriceLabel: PLANS.custom.additionalPriceLabel,
      description: PLANS.custom.description,
      highlights: PLANS.custom.highlights,
    },
    {
      id: "domain",
      kind: "plan",
      billingType: "monthly",
      name: PLANS.domain.name,
      priceCents: PLANS.domain.priceCents,
      priceLabel: PLANS.domain.priceLabel,
      additionalPriceCents: PLANS.domain.additionalPriceCents,
      additionalPriceLabel: PLANS.domain.additionalPriceLabel,
      description: PLANS.domain.description,
      highlights: PLANS.domain.highlights,
    },
    {
      id: "pro",
      kind: "plan",
      billingType: "monthly",
      name: PLANS.pro.name,
      priceCents: PLANS.pro.priceCents,
      priceLabel: PLANS.pro.priceLabel,
      additionalPriceCents: PLANS.pro.additionalPriceCents,
      additionalPriceLabel: PLANS.pro.additionalPriceLabel,
      description: PLANS.pro.description,
      highlights: PLANS.pro.highlights,
    },
  ];
}

/** One-time add-ons: extra slot + done-for-you services (domain, PWA). */
export function listShopAddons() {
  return listAddons();
}

export function isPremiumTemplate(templateId) {
  const id = resolveTemplateId(templateId);
  const t = getTemplate(id);
  if (typeof t.premium === "boolean") return t.premium;
  return !FREE_TEMPLATE_IDS.has(id);
}

function stillInWindow(dateValue) {
  if (!dateValue) return false;
  const ends = new Date(dateValue).getTime();
  return Number.isFinite(ends) && ends > Date.now();
}

export function isSubscriptionActive(user) {
  if (!user) return false;
  if (user.role === "admin") return true;
  const status = String(user.subscriptionStatus || "none").toLowerCase();
  if (status === "active") return stillInWindow(user.currentPeriodEnd) || !user.currentPeriodEnd;
  if (status === "canceled") return stillInWindow(user.currentPeriodEnd);
  return false;
}

export function resolveActivePlan(user) {
  if (!user) return getPlan("free");
  if (user.role === "admin") return getPlan("pro");
  if (!isSubscriptionActive(user)) return getPlan("free");
  return getPlan(user.planId || DEFAULT_PLAN_ID);
}

export function planFeatures(user) {
  const plan = resolveActivePlan(user);
  return {
    live: false,
    hosting: false,
    domain: false,
    pwa: false,
    technonaireAddress: null,
    premiumTemplates: true,
    templateSwitch: true,
    ...(plan?.features || {}),
  };
}

/** Free and paid: all templates allowed. Site count is limited by site_slots. */
export function canUseTemplate(user, templateId) {
  if (user?.role === "admin") return true;
  const features = planFeatures(user);
  if (features.premiumTemplates) return true;
  if (!isPremiumTemplate(templateId)) return true;
  return false;
}

export function canChangeTemplate(user, currentTemplateId, nextTemplateId) {
  if (user?.role === "admin") return true;
  const next = resolveTemplateId(nextTemplateId);
  if (!canUseTemplate(user, next)) return false;
  // Free may switch templates on the one website; multi-site needs purchased slots
  if (planFeatures(user).templateSwitch) return true;
  const current = resolveTemplateId(currentTemplateId);
  if (!current || current === next) return true;
  return false;
}

export function billingPublicFields(user, { sitesUsed, liveSites, purchasedAddonIds } = {}) {
  if (!user) return null;
  const active = isSubscriptionActive(user);
  const status = user.subscriptionStatus || "none";
  const plan = resolveActivePlan(user);
  const stripe = isStripeConfigured();
  const features = planFeatures(user);
  const siteSlots = Math.min(MAX_SITE_SLOTS, Math.max(1, Number(user.siteSlots) || 1));
  const used = Number.isFinite(sitesUsed) ? Number(sitesUsed) : null;
  const live =
    Number.isFinite(liveSites) ? Math.max(0, Number(liveSites) || 0) : null;
  const unitCents = plan.id === "free" ? 0 : plan.priceCents;
  const estimatedMonthlyCents =
    active && unitCents > 0
      ? unitCents * Math.max(1, live == null ? 1 : live || 1)
      : 0;
  const bought = Array.isArray(purchasedAddonIds)
    ? purchasedAddonIds.map((id) => String(id))
    : [];
  return {
    currency: BILLING_CURRENCY,
    plans: listPlans(),
    paidPlans: listPlans().filter((p) => p.id !== "free"),
    addons: listAddons(),
    shopPackages: listShopPackages(),
    shopAddons: listShopAddons(),
    purchasedAddonIds: bought,
    planId: plan.id,
    planName: plan.name,
    priceLabel: plan.priceLabel,
    priceCents: plan.priceCents,
    additionalPriceLabel: plan.additionalPriceLabel,
    additionalPriceCents: plan.additionalPriceCents,
    trialDays: TRIAL_DAYS,
    trialPlanId: TRIAL_PLAN_ID,
    subscriptionStatus: status,
    subscriptionActive: active,
    isFreePlan: plan.id === "free",
    trialEndsAt: user.trialEndsAt || null,
    currentPeriodEnd: user.currentPeriodEnd || null,
    trialUsed: Boolean(user.trialUsed),
    features,
    siteSlots,
    sitesUsed: used,
    liveSites: live,
    liveUnitPriceCents: unitCents,
    estimatedMonthlyCents,
    canCreateSite: used == null ? null : used < siteSlots,
    canBuyAddon: siteSlots < MAX_SITE_SLOTS,
    maxSiteSlots: MAX_SITE_SLOTS,
    canGoLive: Boolean(features.live) && (user.role === "owner" || user.role === "admin"),
    canStartTrial: false,
    canSubscribe: user.role === "owner",
    canAccessPremiumTemplates: Boolean(features.premiumTemplates) || user.role === "admin",
    canSwitchTemplates: Boolean(features.templateSwitch) || user.role === "admin",
    stripeEnabled: stripe,
    hasStripeCustomer: Boolean(user.stripeCustomerId),
    paymentMethodsNote: stripe
      ? "Pay securely with Stripe (card). Use test card 4242 4242 4242 4242 in sandbox."
      : "Add STRIPE_SECRET_KEY to enable Stripe Checkout.",
    provider: stripe ? "stripe" : "manual",
  };
}

/** Stripe subscription quantity = max(1, live sites) while subscribed. */
export async function syncStripeLiveQuantity(userId) {
  if (!isStripeConfigured()) return null;
  const user = await getUserById(userId);
  if (!user?.stripeSubscriptionId) return null;
  if (!isSubscriptionActive(user)) return null;

  const liveCount = await countLiveSitesByOwner(userId);
  const quantity = Math.max(1, liveCount);

  const stripe = getStripe();
  const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
  const itemId = sub.items?.data?.[0]?.id;
  if (!itemId) return null;

  await stripe.subscriptions.update(user.stripeSubscriptionId, {
    items: [{ id: itemId, quantity }],
    proration_behavior: "create_prorations",
    metadata: {
      ...(sub.metadata || {}),
      userId: String(user.id),
      planId: user.planId || DEFAULT_PLAN_ID,
      liveQuantity: String(quantity),
    },
  });

  return { quantity, liveCount };
}

/**
 * Mark a site live or draft. Requires a paid Starter / Custom / Domain / Pro plan.
 * Syncs Stripe quantity to match live site count.
 */
export async function setOwnerSiteLive(userId, siteId, live) {
  const user = await getUserById(userId);
  if (!user || user.role !== "owner") throw new Error("Only owners can change live status");

  const site = await getSiteById(siteId);
  if (!site || !ownerOwnsSite(user, site)) throw new Error("Site not found");

  const features = planFeatures(user);
  if (live) {
    if (!features.live) {
      throw new Error(
        "Subscribe to Starter, Custom, Domain, or Pro to make a website live.",
      );
    }
    const slots = Math.min(MAX_SITE_SLOTS, Math.max(1, Number(user.siteSlots) || 1));
    const currentlyLive = await countLiveSitesByOwner(userId);
    if (!isSiteLive(site) && currentlyLive >= slots) {
      throw new Error(
        `You can only have ${slots} live website${slots === 1 ? "" : "s"} with your current slots. Buy more website slots in Profile.`,
      );
    }
  }

  const updated = await setSiteLiveStatus(site.id, Boolean(live));
  let stripeSync = null;
  try {
    stripeSync = await syncStripeLiveQuantity(userId);
  } catch (err) {
    console.warn("Could not sync Stripe live quantity:", err.message);
  }

  const fresh = publicUser(await getUserById(userId));
  const liveSites = await countLiveSitesByOwner(userId);
  const sitesUsed = await countSitesByOwner(userId);
  const billing = billingPublicFields(fresh, { sitesUsed, liveSites });
  return {
    site: updated,
    user: fresh,
    billing,
    stripeSync,
    message: live
      ? `Website is live${
          billing.estimatedMonthlyCents
            ? ` · about $${(billing.estimatedMonthlyCents / 100).toFixed(0)}/mo for ${Math.max(1, liveSites)} live site${liveSites === 1 ? "" : "s"}`
            : ""
        }.`
      : "Website taken offline (draft). Live billing quantity updated.",
  };
}

export async function updateUserBilling(
  userId,
  {
    subscriptionStatus,
    trialEndsAt,
    currentPeriodEnd,
    trialUsed,
    planId,
    stripeCustomerId,
    stripeSubscriptionId,
    clearTrialEnds = false,
    clearPeriodEnd = false,
    clearStripeSubscription = false,
  } = {},
) {
  const id = Number(userId);
  if (!Number.isFinite(id)) throw new Error("User not found");

  const { rows: existingRows } = await query(`SELECT * FROM users WHERE id = $1`, [id]);
  if (!existingRows[0]) throw new Error("User not found");

  const status = subscriptionStatus ?? existingRows[0].subscription_status ?? "none";
  const plan = getPlan(planId ?? existingRows[0].plan_id ?? DEFAULT_PLAN_ID);
  const paymentStatus =
    status === "active" || status === "trialing"
      ? "paid"
      : status === "canceled" || status === "none"
        ? "unpaid"
        : existingRows[0].payment_status;

  await query(
    `UPDATE users SET
       subscription_status = $2,
       trial_ends_at = CASE WHEN $6 THEN NULL ELSE COALESCE($3, trial_ends_at) END,
       current_period_end = CASE WHEN $7 THEN NULL ELSE COALESCE($4, current_period_end) END,
       trial_used = COALESCE($5, trial_used),
       plan_id = $8,
       payment_status = $9,
       payment_plan = $10,
       payment_amount = $11,
       payment_updated_at = now(),
       stripe_customer_id = COALESCE($12, stripe_customer_id),
       stripe_subscription_id = CASE
         WHEN $14 THEN NULL
         ELSE COALESCE($13, stripe_subscription_id)
       END
     WHERE id = $1`,
    [
      id,
      status,
      trialEndsAt ?? null,
      currentPeriodEnd ?? null,
      typeof trialUsed === "boolean" ? trialUsed : null,
      clearTrialEnds,
      clearPeriodEnd,
      plan.id,
      paymentStatus,
      plan.name,
      plan.priceLabel,
      stripeCustomerId ?? null,
      stripeSubscriptionId ?? null,
      clearStripeSubscription,
    ],
  );

  return publicUser(await getUserById(id));
}

export async function startTrial() {
  throw new Error("Free trial is not available. Subscribe to Starter, Custom, Domain, or Pro to go live.");
}

export async function createInvoice(
  userId,
  { planId = DEFAULT_PLAN_ID, addonId = null, amountCents, note = "", stripeSessionId = null } = {},
) {
  const id = Number(userId);
  const addon = addonId ? getAddon(addonId) : null;
  const plan = getPlan(planId);
  const number = `INV-${new Date().getFullYear()}-${nanoid(8).toUpperCase()}`;
  const due = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const cents = Number.isFinite(amountCents)
    ? amountCents
    : addon
      ? addon.priceCents
      : plan.priceCents;
  const { rows } = await query(
    `INSERT INTO invoices (user_id, number, amount_cents, currency, status, due_at, note, plan_id, stripe_session_id, addon_id)
     VALUES ($1, $2, $3, $4, 'open', $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      id,
      number,
      cents,
      BILLING_CURRENCY,
      due.toISOString(),
      note ||
        (addon
          ? `${addon.name} (${addon.priceLabel}) — Stripe one-time. Invoice ${number}.`
          : `${plan.name} (${plan.priceLabel}) — Stripe Checkout. Invoice ${number}.`),
      addon ? "free" : plan.id,
      stripeSessionId,
      addon?.id || null,
    ],
  );
  return mapInvoice(rows[0]);
}

export async function incrementSiteSlots(userId, slots) {
  const add = Math.max(0, Number(slots) || 0);
  if (!add) return publicUser(await getUserById(userId));
  await query(
    `UPDATE users SET site_slots = LEAST($3, GREATEST(1, COALESCE(site_slots, 1) + $2)), payment_updated_at = now()
     WHERE id = $1`,
    [Number(userId), add, MAX_SITE_SLOTS],
  );
  return publicUser(await getUserById(userId));
}

export async function grantAddonPurchase(invoiceId) {
  const { rows } = await query(
    `UPDATE invoices
     SET status = 'paid', paid_at = now(), updated_at = now()
     WHERE id = $1 AND status <> 'paid'
     RETURNING *`,
    [Number(invoiceId)],
  );
  if (!rows[0]) {
    const existing = await getInvoiceById(invoiceId);
    if (!existing) throw new Error("Invoice not found");
    return { invoice: existing, user: publicUser(await getUserById(existing.userId)) };
  }
  const invoice = mapInvoice(rows[0]);
  const addon = getAddon(invoice.addonId);
  if (addon?.siteSlots) {
    await incrementSiteSlots(invoice.userId, 1);
  }
  return { invoice, user: publicUser(await getUserById(invoice.userId)) };
}

export async function listPaidAddonIds(userId) {
  const { rows } = await query(
    `SELECT DISTINCT addon_id FROM invoices
     WHERE user_id = $1 AND status = 'paid' AND addon_id IS NOT NULL AND addon_id <> ''`,
    [Number(userId)],
  );
  return rows.map((r) => String(r.addon_id));
}

export async function listInvoicesForUser(userId) {
  const { rows } = await query(
    `SELECT * FROM invoices WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [Number(userId)],
  );
  return rows.map(mapInvoice);
}

/** Drop leftover unpaid Checkout invoices so they don't look like a real bill. */
export async function voidOpenCheckoutInvoices(userId, exceptInvoiceId = null) {
  const id = Number(userId);
  if (!Number.isFinite(id)) return 0;
  const params = exceptInvoiceId != null ? [id, Number(exceptInvoiceId)] : [id];
  const { rowCount } = await query(
    exceptInvoiceId != null
      ? `UPDATE invoices
         SET status = 'void', note = CASE
           WHEN note LIKE '%voided%' THEN note
           ELSE TRIM(note || ' (voided — leftover unpaid checkout)')
         END, updated_at = now()
         WHERE user_id = $1 AND status = 'open' AND id <> $2`
      : `UPDATE invoices
         SET status = 'void', note = CASE
           WHEN note LIKE '%voided%' THEN note
           ELSE TRIM(note || ' (voided — leftover unpaid checkout)')
         END, updated_at = now()
         WHERE user_id = $1 AND status = 'open'`,
    params,
  );
  return rowCount || 0;
}

export async function getInvoiceById(invoiceId) {
  const { rows } = await query(`SELECT * FROM invoices WHERE id = $1 LIMIT 1`, [
    Number(invoiceId),
  ]);
  return mapInvoice(rows[0]);
}

export async function getInvoiceByStripeSession(sessionId) {
  const { rows } = await query(
    `SELECT * FROM invoices WHERE stripe_session_id = $1 LIMIT 1`,
    [String(sessionId || "")],
  );
  return mapInvoice(rows[0]);
}

export async function markInvoicePaid(invoiceId, { adminUserId, planId } = {}) {
  const { rows: check } = await query(`SELECT * FROM invoices WHERE id = $1`, [Number(invoiceId)]);
  if (!check[0]) throw new Error("Invoice not found");
  if (check[0].addon_id) {
    const result = await grantAddonPurchase(invoiceId);
    return { invoice: result.invoice, activatedBy: adminUserId || null, kind: "addon" };
  }

  const { rows } = await query(
    `UPDATE invoices
     SET status = 'paid', paid_at = now(), updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [Number(invoiceId)],
  );
  if (!rows[0]) throw new Error("Invoice not found");
  const invoice = mapInvoice(rows[0]);
  const plan = getPlan(planId || invoice.planId || DEFAULT_PLAN_ID);

  const periodEnd = new Date(Date.now() + BILLING_PERIOD_DAYS * 24 * 60 * 60 * 1000);
  await updateUserBilling(invoice.userId, {
    subscriptionStatus: "active",
    currentPeriodEnd: periodEnd.toISOString(),
    clearTrialEnds: true,
    planId: plan.id,
    trialUsed: true,
  });

  return { invoice, activatedBy: adminUserId || null, kind: "subscription" };
}

/** Owner picks a USD package: open invoice + activate (manual offline payment). */
export async function subscribeManual(userId, planId = DEFAULT_PLAN_ID) {
  const user = await getUserById(userId);
  if (!user) throw new Error("User not found");
  if (user.role !== "owner") throw new Error("Only site owners can subscribe");

  const plan = getPlan(planId);
  const invoice = await createInvoice(userId, {
    planId: plan.id,
    note: `${plan.name} — $${(plan.priceCents / 100).toFixed(0)}/mo USD. Pay with Stripe Checkout.`,
  });

  const periodEnd = new Date(Date.now() + BILLING_PERIOD_DAYS * 24 * 60 * 60 * 1000);
  const updated = await updateUserBilling(userId, {
    subscriptionStatus: "active",
    currentPeriodEnd: periodEnd.toISOString(),
    clearTrialEnds: true,
    trialUsed: true,
    planId: plan.id,
  });

  return { user: updated, invoice, plan: listPlans().find((p) => p.id === plan.id) };
}

function moneyLabel(cents) {
  return `$${((Number(cents) || 0) / 100).toFixed(0)}`;
}

export function upgradeDifferenceCents(fromPlanId, toPlanId, quantity = 1) {
  const from = getPlan(fromPlanId);
  const to = getPlan(toPlanId);
  const qty = Math.max(1, Number(quantity) || 1);
  return Math.max(0, (to.priceCents - from.priceCents) * qty);
}

async function ensureCustomerPaymentMethod(stripe, customerId, subscription) {
  const subPm = subscription?.default_payment_method;
  let pmId = typeof subPm === "string" ? subPm : subPm?.id || null;
  if (!pmId) {
    const cards = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
      limit: 1,
    });
    pmId = cards.data[0]?.id || null;
  }
  if (!pmId) {
    throw new Error(
      "No card on file for this upgrade. Open Billing → Update card, then try again.",
    );
  }
  const customer = await stripe.customers.retrieve(customerId);
  const existing = customer?.invoice_settings?.default_payment_method;
  const existingId = typeof existing === "string" ? existing : existing?.id;
  if (existingId) return existingId;
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: pmId },
  });
  return pmId;
}

async function getUsableStripeSubscription(user) {
  if (!user?.stripeSubscriptionId || !isStripeConfigured()) return null;
  try {
    const sub = await getStripe().subscriptions.retrieve(user.stripeSubscriptionId);
    const ended =
      !sub ||
      sub.status === "canceled" ||
      sub.status === "incomplete_expired" ||
      sub.status === "unpaid";
    return ended ? null : sub;
  } catch {
    return null;
  }
}

export async function resumeStripeSubscription(userId) {
  if (!isStripeConfigured()) throw new Error("Stripe is not configured");
  const user = await getUserById(userId);
  if (!user) throw new Error("User not found");
  if (user.role !== "owner") throw new Error("Only site owners can subscribe");

  const sub = await getUsableStripeSubscription(user);
  if (!sub) throw new Error("No active subscription to keep. Subscribe again from Plan.");

  const stripe = getStripe();
  const updatedSub = await stripe.subscriptions.update(sub.id, {
    cancel_at_period_end: false,
  });

  const periodEndSec =
    updatedSub.current_period_end ||
    Math.floor(Date.now() / 1000) + BILLING_PERIOD_DAYS * 24 * 60 * 60;
  const plan = getPlan(user.planId);
  const updatedUser = await updateUserBilling(userId, {
    subscriptionStatus: "active",
    currentPeriodEnd: new Date(periodEndSec * 1000).toISOString(),
    clearTrialEnds: true,
    trialUsed: true,
    planId: plan.id,
    stripeCustomerId: String(updatedSub.customer || user.stripeCustomerId || ""),
    stripeSubscriptionId: updatedSub.id,
  });

  const sitesUsed = await countSitesByOwner(userId);
  const liveSites = await countLiveSitesByOwner(userId);
  await voidOpenCheckoutInvoices(userId);
  return {
    url: null,
    differenceCents: 0,
    user: updatedUser,
    billing: billingPublicFields(updatedUser, { sitesUsed, liveSites }),
    invoice: null,
    plan: listPlans().find((p) => p.id === plan.id),
    message: `Cancellation stopped. You stay on ${plan.name}. Next bill is ${plan.priceLabel}.`,
  };
}
export async function upgradeStripeSubscription(userId, planId) {
  if (!isStripeConfigured()) throw new Error("Stripe is not configured");

  const user = await getUserById(userId);
  if (!user) throw new Error("User not found");
  if (user.role !== "owner") throw new Error("Only site owners can subscribe");

  const sub = await getUsableStripeSubscription(user);
  if (!sub) {
    throw new Error(
      "This subscription has already ended. Subscribe again from Plan to start a new monthly package.",
    );
  }

  const current = getPlan(user.planId);
  const plan = getPlan(planId);
  if (plan.id === "free" || plan.priceCents <= 0) {
    throw new Error("Choose a paid package to upgrade to");
  }
  if (planRank(plan.id) <= planRank(current.id)) {
    throw new Error("Pick a higher package to upgrade");
  }

  const liveCount = await countLiveSitesByOwner(userId);
  const quantity = Math.max(1, liveCount);
  const differenceCents = upgradeDifferenceCents(current.id, plan.id, quantity);

  const stripe = getStripe();
  const itemId = sub.items?.data?.[0]?.id;
  if (!itemId) throw new Error("Could not find your Stripe subscription item");

  const customerId = String(sub.customer || user.stripeCustomerId || "");
  if (!customerId) throw new Error("No Stripe customer on this account");

  await ensureCustomerPaymentMethod(stripe, customerId, sub);

  if (differenceCents > 0) {
    await stripe.invoiceItems.create({
      customer: customerId,
      amount: differenceCents,
      currency: BILLING_CURRENCY,
      description: `Upgrade ${current.name} → ${plan.name} — difference now; full ${plan.priceLabel} next month`,
    });
    let stripeInvoice = await stripe.invoices.create({
      customer: customerId,
      collection_method: "charge_automatically",
      pending_invoice_items_behavior: "include",
    });
    stripeInvoice = await stripe.invoices.finalizeInvoice(stripeInvoice.id);
    if (stripeInvoice.status !== "paid") {
      try {
        stripeInvoice = await stripe.invoices.pay(stripeInvoice.id);
      } catch (err) {
        throw new Error(
          err?.message ||
            "Could not charge the upgrade difference. Update your card in Billing, then try again.",
        );
      }
    }
    if (stripeInvoice.status !== "paid") {
      throw new Error("Upgrade payment did not complete. Update your card in Billing.");
    }
  }

  const price = await stripe.prices.create({
    currency: BILLING_CURRENCY,
    unit_amount: plan.priceCents,
    recurring: { interval: "month" },
    product_data: {
      name: `Easy Website — ${plan.name}`,
      metadata: { planId: plan.id },
    },
  });

  const updatedSub = await stripe.subscriptions.update(sub.id, {
    items: [{ id: itemId, price: price.id, quantity }],
    proration_behavior: "none",
    cancel_at_period_end: false,
    metadata: {
      ...(sub.metadata || {}),
      userId: String(user.id),
      planId: plan.id,
      liveQuantity: String(quantity),
    },
  });

  const periodEndSec =
    updatedSub.current_period_end ||
    Math.floor(Date.now() / 1000) + BILLING_PERIOD_DAYS * 24 * 60 * 60;
  const periodEnd = new Date(periodEndSec * 1000).toISOString();

  const invoice = await createInvoice(userId, {
    planId: plan.id,
    amountCents: differenceCents,
    note: `Upgraded ${current.name} → ${plan.name}. Charged ${moneyLabel(differenceCents)} now (difference). Next month: ${plan.priceLabel} × ${quantity} live site${quantity === 1 ? "" : "s"}.`,
  });
  await query(
    `UPDATE invoices SET status = 'paid', paid_at = now(), updated_at = now() WHERE id = $1`,
    [invoice.id],
  );

  const updatedUser = await updateUserBilling(userId, {
    subscriptionStatus: "active",
    currentPeriodEnd: periodEnd,
    clearTrialEnds: true,
    trialUsed: true,
    planId: plan.id,
    stripeCustomerId: customerId,
    stripeSubscriptionId: updatedSub.id,
  });

  const sitesUsed = await countSitesByOwner(userId);
  const liveSites = await countLiveSitesByOwner(userId);
  return {
    upgraded: true,
    url: null,
    differenceCents,
    user: updatedUser,
    billing: billingPublicFields(updatedUser, { sitesUsed, liveSites }),
    invoice: await getInvoiceById(invoice.id),
    plan: listPlans().find((p) => p.id === plan.id),
    message: `Upgraded to ${plan.name}. Charged ${moneyLabel(differenceCents)} now (the difference). Starting next month you’ll pay ${plan.priceLabel}${plan.additionalPriceLabel ? ` (additional sites ${plan.additionalPriceLabel})` : ""}.`,
  };
}

/** Create Stripe Checkout session for a plan (sandbox or live). */
export async function createStripeCheckout(userId, planId = "starter") {
  if (!isStripeConfigured()) throw new Error("Stripe is not configured");

  const user = await getUserById(userId);
  if (!user) throw new Error("User not found");
  if (user.role !== "owner") throw new Error("Only site owners can subscribe");

  const plan = getPlan(planId);
  if (plan.id === "free" || plan.priceCents <= 0) {
    throw new Error("Choose a paid package to checkout with Stripe");
  }

  const existingSub = await getUsableStripeSubscription(user);
  if (existingSub && isSubscriptionActive(user)) {
    if (planRank(plan.id) > planRank(user.planId || "free")) {
      return upgradeStripeSubscription(userId, plan.id);
    }
    if (plan.id === normalizePlanId(user.planId)) {
      return resumeStripeSubscription(userId);
    }
  }

  const stripe = getStripe();
  const base = appBaseUrl();

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name || undefined,
      metadata: { userId: String(user.id) },
    });
    customerId = customer.id;
    await updateUserBilling(user.id, { stripeCustomerId: customerId });
  }

  await voidOpenCheckoutInvoices(userId);

  const previousSubscriptionId = user.stripeSubscriptionId || "";
  const changeKind =
    previousSubscriptionId && user.planId && planRank(plan.id) > planRank(user.planId)
      ? "upgrade"
      : previousSubscriptionId && user.planId && planRank(plan.id) < planRank(user.planId)
        ? "downgrade"
        : "subscribe";

  const liveCount = await countLiveSitesByOwner(userId);
  const quantity = Math.max(1, liveCount);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: String(user.id),
    success_url: `${base}/profile?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/profile?checkout=cancel`,
    // Sandbox / standard Checkout — Managed Payments requires extra tax setup
    managed_payments: { enabled: false },
    line_items: [
      {
        quantity,
        price_data: {
          currency: BILLING_CURRENCY,
          unit_amount: plan.priceCents,
          recurring: { interval: "month" },
          product_data: {
            name: `Easy Website — ${plan.name}`,
            description: `${plan.description} Qty = live websites (min 1).`,
            // SaaS / electronically supplied services
            tax_code: "txcd_10103001",
          },
        },
      },
    ],
    metadata: {
      userId: String(user.id),
      planId: plan.id,
      previousSubscriptionId,
      changeKind,
      liveQuantity: String(quantity),
    },
    subscription_data: {
      metadata: {
        userId: String(user.id),
        planId: plan.id,
        liveQuantity: String(quantity),
      },
    },
  });

  return {
    url: session.url,
    sessionId: session.id,
    invoice: null,
    plan: listPlans().find((p) => p.id === plan.id),
  };
}

/**
 * Stripe Checkout (payment mode) to buy a second website slot.
 * Charges the plan's additionalPriceCents (monthly rate) as a one-time payment,
 * then grants +1 site_slots on webhook / sync-checkout.
 */
export async function buyExtraSiteSlot(userId, slotPlanId) {
  if (!isStripeConfigured()) throw new Error("Stripe is not configured");
  const user = await getUserById(userId);
  if (!user) throw new Error("User not found");
  if (user.role !== "owner") throw new Error("Only site owners can buy extra slots");

  // If a specific plan is requested for the slot, use that plan's pricing.
  // Otherwise fall back to the user's current plan.
  const plan = slotPlanId ? getPlan(slotPlanId) : resolveActivePlan(user);
  if (!plan.additionalPriceCents || plan.additionalPriceCents <= 0) {
    throw new Error("The selected plan does not have a valid additional site price.");
  }

  const currentSlots = Math.min(MAX_SITE_SLOTS, Math.max(1, Number(user.siteSlots) || 1));
  if (currentSlots >= MAX_SITE_SLOTS) {
    throw new Error("You already have the maximum number of website slots.");
  }

  const stripe = getStripe();
  const base = appBaseUrl();

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name || undefined,
      metadata: { userId: String(user.id) },
    });
    customerId = customer.id;
    await updateUserBilling(user.id, { stripeCustomerId: customerId });
  }

  const isFreePlan = plan.id === "free";
  const slotLabel = isFreePlan
    ? "Additional website slot (Free plan · $5/month)"
    : `Additional website slot (${plan.name} · ${plan.additionalPriceLabel})`;

  // Create a pending invoice so we can grant the slot via sync-checkout
  const invoice = await createInvoice(user.id, {
    addonId: "site_plus_1",
    note: slotLabel,
  });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    client_reference_id: String(user.id),
    success_url: `${base}/profile?checkout=success&session_id={CHECKOUT_SESSION_ID}#websites`,
    cancel_url: `${base}/profile?checkout=cancel#plan`,
    managed_payments: { enabled: false },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: BILLING_CURRENCY,
          unit_amount: plan.additionalPriceCents,
          product_data: {
            name: isFreePlan
              ? "Additional website (Free plan)"
              : `${plan.name} — additional website`,
            description: isFreePlan
              ? "Second website slot on the Free plan. $5/month."
              : `Second website slot on your ${plan.name} plan. ${plan.additionalPriceLabel} per month.`,
            tax_code: "txcd_10103001",
          },
        },
      },
    ],
    metadata: {
      userId: String(user.id),
      addonId: "site_plus_1",
      invoiceId: String(invoice.id),
      planId: plan.id,
      kind: "addon",
    },
  });

  return { url: session.url, sessionId: session.id };
}

/** One-time Stripe Checkout for website slot add-ons. */
export async function createStripeAddonCheckout(userId, addonId) {
  if (!isStripeConfigured()) throw new Error("Stripe is not configured");
  const user = await getUserById(userId);
  if (!user) throw new Error("User not found");
  if (user.role !== "owner") throw new Error("Only site owners can buy add-ons");

  const addon = getAddon(addonId);
  if (!addon || !PUBLIC_ADDON_IDS.includes(addon.id)) throw new Error("Unknown add-on");

  if (addon.id === "site_plus_1") {
    const slots = Math.min(MAX_SITE_SLOTS, Math.max(1, Number(user.siteSlots) || 1));
    if (slots >= MAX_SITE_SLOTS) {
      throw new Error(
        "You already unlocked one extra website. Create it from Profile, or it is already in use.",
      );
    }
  } else {
    const paid = await listPaidAddonIds(user.id);
    if (paid.includes(addon.id)) {
      throw new Error(`${addon.name} is already paid. Technonaire will complete this service for you.`);
    }
  }

  const stripe = getStripe();
  const base = appBaseUrl();

  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name || undefined,
      metadata: { userId: String(user.id) },
    });
    customerId = customer.id;
    await updateUserBilling(user.id, { stripeCustomerId: customerId });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    client_reference_id: String(user.id),
    success_url: `${base}/profile?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/profile?checkout=cancel`,
    managed_payments: { enabled: false },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: BILLING_CURRENCY,
          unit_amount: addon.priceCents,
          product_data: {
            name: `Easy Website — ${addon.name}`,
            description: addon.description,
            tax_code: "txcd_10103001",
          },
        },
      },
    ],
    metadata: {
      userId: String(user.id),
      addonId: addon.id,
      kind: "addon",
    },
  });

  return {
    url: session.url,
    sessionId: session.id,
    invoice: null,
    addon: listAddons().find((a) => a.id === addon.id),
  };
}

export async function syncCheckoutSession(sessionId) {
  if (!isStripeConfigured()) throw new Error("Stripe is not configured");
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(String(sessionId), {
    expand: ["subscription"],
  });
  if (session.payment_status !== "paid" && session.status !== "complete") {
    return { ok: false, reason: "not_paid" };
  }
  if (session.mode === "payment" || session.metadata?.kind === "addon") {
    await applyAddonCheckoutSession(session);
  } else {
    await applyCheckoutSession(session);
  }
  const userId = Number(session.metadata?.userId || session.client_reference_id);
  const user = publicUser(await getUserById(userId));
  const sitesUsed = await countSitesByOwner(userId);
  const liveSites = await countLiveSitesByOwner(userId);
  return {
    ok: true,
    user,
    billing: billingPublicFields(user, { sitesUsed, liveSites }),
    invoices: await listInvoicesForUser(userId),
    kind: session.metadata?.kind || session.mode,
  };
}

export async function applyAddonCheckoutSession(session) {
  const userId = Number(session.metadata?.userId || session.client_reference_id);
  const addonId = session.metadata?.addonId;
  const invoiceId = session.metadata?.invoiceId;
  if (!Number.isFinite(userId)) throw new Error("Missing user on Stripe session");

  const addon = getAddon(addonId);
  if (!addon) throw new Error("Unknown add-on on Stripe session");

  if (typeof session.customer === "string") {
    await updateUserBilling(userId, { stripeCustomerId: session.customer });
  }

  if (invoiceId) {
    const inv = await getInvoiceById(invoiceId);
    if (inv && inv.status !== "paid") {
      await grantAddonPurchase(invoiceId);
    } else if (!inv) {
      const created = await createInvoice(userId, {
        addonId: addon.id,
        note: `${addon.name} — paid via Stripe`,
        stripeSessionId: session.id,
      });
      await grantAddonPurchase(created.id);
    }
  } else {
    const existing = await getInvoiceByStripeSession(session.id);
    if (existing && existing.status !== "paid") {
      await grantAddonPurchase(existing.id);
    } else if (!existing) {
      const created = await createInvoice(userId, {
        addonId: addon.id,
        note: `${addon.name} — paid via Stripe`,
        stripeSessionId: session.id,
      });
      await grantAddonPurchase(created.id);
    }
  }

  return publicUser(await getUserById(userId));
}

export async function applyCheckoutSession(session) {
  const userId = Number(session.metadata?.userId || session.client_reference_id);
  const planId = session.metadata?.planId || DEFAULT_PLAN_ID;
  const invoiceId = session.metadata?.invoiceId;
  if (!Number.isFinite(userId)) throw new Error("Missing user on Stripe session");

  const plan = getPlan(planId);
  let subscription = session.subscription;
  if (typeof subscription === "string") {
    subscription = await getStripe().subscriptions.retrieve(subscription);
  }

  const periodEndSec =
    subscription?.current_period_end ||
    Math.floor(Date.now() / 1000) + BILLING_PERIOD_DAYS * 24 * 60 * 60;
  const periodEnd = new Date(periodEndSec * 1000).toISOString();
  const newSubId = typeof subscription === "object" ? subscription?.id : subscription;
  const previousSubscriptionId = String(session.metadata?.previousSubscriptionId || "").trim();

  // Upgrade/downgrade: stop the old Stripe subscription so only the new plan bills
  if (
    previousSubscriptionId &&
    newSubId &&
    previousSubscriptionId !== newSubId &&
    isStripeConfigured()
  ) {
    try {
      await getStripe().subscriptions.cancel(previousSubscriptionId);
    } catch (err) {
      console.warn("Could not cancel previous Stripe subscription:", err.message);
    }
  }

  await updateUserBilling(userId, {
    subscriptionStatus: "active",
    currentPeriodEnd: periodEnd,
    clearTrialEnds: true,
    trialUsed: true,
    planId: plan.id,
    stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
    stripeSubscriptionId: newSubId,
  });

  if (invoiceId) {
    await query(
      `UPDATE invoices
       SET status = 'paid', paid_at = now(), updated_at = now(), stripe_session_id = COALESCE(stripe_session_id, $2)
       WHERE id = $1`,
      [Number(invoiceId), session.id],
    );
  } else {
    const existing = await getInvoiceByStripeSession(session.id);
    if (existing && existing.status !== "paid") {
      await markInvoicePaid(existing.id, { planId: plan.id });
    } else if (!existing) {
      const inv = await createInvoice(userId, {
        planId: plan.id,
        note: `${plan.name} — paid via Stripe`,
        stripeSessionId: session.id,
      });
      await markInvoicePaid(inv.id, { planId: plan.id });
    }
  }

  return publicUser(await getUserById(userId));
}

export async function applyStripeSubscription(subscription) {
  const userId = Number(subscription.metadata?.userId);
  const planId = subscription.metadata?.planId || DEFAULT_PLAN_ID;

  let resolvedUserId = userId;
  if (!Number.isFinite(resolvedUserId)) {
    const { rows } = await query(
      `SELECT id FROM users WHERE stripe_customer_id = $1 LIMIT 1`,
      [subscription.customer],
    );
    if (!rows[0]) return null;
    resolvedUserId = Number(rows[0].id);
  }

  const status = subscription.status;
  if (status === "active" || status === "trialing") {
    const periodEnd = new Date((subscription.current_period_end || 0) * 1000).toISOString();
    return updateUserBilling(resolvedUserId, {
      subscriptionStatus: status === "trialing" ? "trialing" : "active",
      currentPeriodEnd: periodEnd,
      planId,
      stripeCustomerId: String(subscription.customer),
      stripeSubscriptionId: subscription.id,
      trialUsed: true,
      clearTrialEnds: status !== "trialing",
    });
  }

  if (status === "canceled" || status === "unpaid" || status === "incomplete_expired") {
    return updateUserBilling(resolvedUserId, {
      subscriptionStatus: "canceled",
      clearTrialEnds: true,
      stripeSubscriptionId: subscription.id,
      clearStripeSubscription: status === "canceled",
    });
  }

  return publicUser(await getUserById(resolvedUserId));
}

export async function createBillingPortal(userId) {
  if (!isStripeConfigured()) throw new Error("Stripe is not configured");
  const user = await getUserById(userId);
  if (!user?.stripeCustomerId) throw new Error("No Stripe customer on this account");
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${appBaseUrl()}/profile`,
  });
  return { url: session.url };
}

export async function cancelSubscription(userId) {
  const user = await getUserById(userId);
  if (!user) throw new Error("User not found");
  if (user.role !== "owner") throw new Error("Only site owners can cancel");

  if (isStripeConfigured() && user.stripeSubscriptionId) {
    const stripe = getStripe();
    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
  }

  return updateUserBilling(userId, {
    subscriptionStatus: "canceled",
    clearTrialEnds: true,
  });
}

function mapInvoice(row) {
  if (!row) return null;
  const addon = row.addon_id ? getAddon(row.addon_id) : null;
  const plan = getPlan(row.plan_id || DEFAULT_PLAN_ID);
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    number: row.number,
    amountCents: Number(row.amount_cents),
    currency: row.currency || BILLING_CURRENCY,
    status: row.status,
    dueAt: row.due_at,
    paidAt: row.paid_at,
    note: row.note || "",
    planId: plan.id,
    planName: addon ? addon.name : plan.name,
    addonId: addon?.id || null,
    stripeSessionId: row.stripe_session_id || null,
    createdAt: row.created_at,
  };
}
