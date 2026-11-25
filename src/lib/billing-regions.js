import { query } from "./db";
import { supportsStripe } from "./region-detection";
import { invalidatePricingCache } from "./pricing-cache";

export const PLAN_ORDER = ["starter", "custom", "domain", "free", "pro"];

const DEFAULT_REGIONS = [
  { id: "usa", name: "United States", currency: "USD", stripe: true, sort: 1 },
  { id: "canada", name: "Canada", currency: "USD", stripe: true, sort: 2 },
  { id: "europe", name: "Europe", currency: "USD", stripe: true, sort: 3 },
  { id: "middle-east", name: "Middle East", currency: "USD", stripe: true, sort: 4 },
  { id: "pakistan", name: "Pakistan", currency: "PKR", stripe: false, sort: 5 },
];

export function publicRegion(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    currency: row.currency,
    stripe: Boolean(row.stripe),
    enabled: Boolean(row.enabled),
    sortOrder: row.sort_order,
  };
}

export async function ensureBillingRegions() {
  for (const region of DEFAULT_REGIONS) {
    await query(
      `INSERT INTO billing_regions (id, name, currency, stripe, enabled, sort_order)
       VALUES ($1, $2, $3, $4, true, $5)
       ON CONFLICT (id) DO NOTHING`,
      [region.id, region.name, region.currency, region.stripe, region.sort]
    );
  }
}

export async function listBillingRegions() {
  await ensureBillingRegions();
  const result = await query(
    `SELECT * FROM billing_regions ORDER BY sort_order, name`
  );
  return result.rows.map(publicRegion);
}

export async function getBillingRegion(id) {
  await ensureBillingRegions();
  const result = await query(`SELECT * FROM billing_regions WHERE id = $1`, [id]);
  return publicRegion(result.rows[0]);
}

export async function regionAllowsStripe(regionId) {
  const region = await getBillingRegion(regionId);
  if (region) return Boolean(region.enabled && region.stripe);
  return supportsStripe(regionId);
}

export async function addBillingRegion({ id, name, currency, stripe }) {
  const slug = String(id || "").trim().toLowerCase();
  const label = String(name || "").trim();
  const code = String(currency || "USD").trim().toUpperCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Use a short id such as australia or new-zealand.");
  }
  if (!label) throw new Error("Region name is required.");
  if (!/^[A-Z]{3}$/.test(code)) throw new Error("Currency must be a 3-letter code.");
  const card = code === "USD" && Boolean(stripe);

  await ensureBillingRegions();
  const existing = await query(`SELECT id FROM billing_regions WHERE id = $1`, [slug]);
  if (existing.rows.length) throw new Error("That region already exists.");

  const source = code === "PKR" ? "pakistan" : "usa";
  const sourcePlans = await query(`SELECT * FROM pricing_configs WHERE region = $1`, [source]);
  const order = await query(`SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM billing_regions`);
  const sort = Number(order.rows[0].next) || 10;

  await query(
    `INSERT INTO billing_regions (id, name, currency, stripe, enabled, sort_order)
     VALUES ($1, $2, $3, $4, true, $5)`,
    [slug, label, code, card, sort]
  );

  for (const planId of PLAN_ORDER) {
    const src = sourcePlans.rows.find((row) => row.plan_id === planId);
    await query(
      `INSERT INTO pricing_configs
        (region, plan_id, currency, first_site_cents, extra_site_cents, first_site_cents_yearly, extra_site_cents_yearly, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (region, plan_id) DO NOTHING`,
      [
        slug,
        planId,
        code,
        src?.first_site_cents ?? 0,
        src?.extra_site_cents ?? 0,
        src?.first_site_cents_yearly ?? null,
        src?.extra_site_cents_yearly ?? null,
        src ? src.active : planId !== "pro",
      ]
    );
  }

  invalidatePricingCache();
  return getBillingRegion(slug);
}

export async function setBillingRegionEnabled(id, enabled) {
  await ensureBillingRegions();
  const result = await query(
    `UPDATE billing_regions SET enabled = $2 WHERE id = $1 RETURNING *`,
    [id, Boolean(enabled)]
  );
  if (!result.rows.length) throw new Error("Region not found.");
  return publicRegion(result.rows[0]);
}

/**
 * Copy United States plan prices onto another region.
 * The region's own currency stays in place. Amounts are copied as numbers.
 */
export async function copyUsaPrices(regionId, { userId, applyStripe } = {}) {
  const id = String(regionId || "").trim().toLowerCase();
  if (!id || id === "usa") throw new Error("Pick a region other than the United States.");
  await ensureBillingRegions();
  const region = await getBillingRegion(id);
  if (!region) throw new Error("Region not found.");

  const usaPlans = await query(
    `SELECT * FROM pricing_configs WHERE region = 'usa' ORDER BY plan_id`
  );
  if (!usaPlans.rows.length) throw new Error("United States prices are not set yet.");

  let stripeWarning = null;

  for (const src of usaPlans.rows) {
    const current = await query(
      `SELECT * FROM pricing_configs WHERE region = $1 AND plan_id = $2`,
      [id, src.plan_id]
    );
    let row = current.rows[0];
    const firstSiteCents = Number(src.first_site_cents) || 0;
    const extraSiteCents = Number(src.extra_site_cents) || 0;
    const active = Boolean(src.active);
    const firstChanged = !row || Number(row.first_site_cents) !== firstSiteCents;
    const extraChanged = !row || Number(row.extra_site_cents) !== extraSiteCents;

    let stripeFirst = region.stripe ? row?.stripe_first_site_price_id || null : null;
    let stripeExtra = region.stripe ? row?.stripe_extra_site_price_id || null : null;

    if (region.stripe && typeof applyStripe === "function") {
      try {
        const synced = await applyStripe({
          regionId: id,
          planId: src.plan_id,
          configId: row?.id || null,
          active,
          firstSiteCents,
          extraSiteCents,
          oldFirst: row?.stripe_first_site_price_id || null,
          oldExtra: row?.stripe_extra_site_price_id || null,
          firstChanged,
          extraChanged,
        });
        if (!synced) {
          if (firstChanged) stripeFirst = null;
          if (extraChanged) stripeExtra = null;
        } else {
          if (synced.first !== undefined) stripeFirst = synced.first;
          if (synced.extra !== undefined) stripeExtra = synced.extra;
          if (synced.warning) stripeWarning = synced.warning;
        }
      } catch (error) {
        console.error("Stripe price copy failed:", error);
        stripeWarning = "Saved the catalog prices. Stripe price update failed, so new checkouts will create a price from these amounts.";
        if (firstChanged) stripeFirst = null;
        if (extraChanged) stripeExtra = null;
      }
    } else if (region.stripe) {
      if (firstChanged) stripeFirst = null;
      if (extraChanged) stripeExtra = null;
    }

    if (!row) {
      const inserted = await query(
        `INSERT INTO pricing_configs
          (region, plan_id, currency, first_site_cents, extra_site_cents, first_site_cents_yearly, extra_site_cents_yearly, active,
           stripe_first_site_price_id, stripe_extra_site_price_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [
          id,
          src.plan_id,
          region.currency,
          firstSiteCents,
          extraSiteCents,
          src.first_site_cents_yearly ?? null,
          src.extra_site_cents_yearly ?? null,
          active,
          stripeFirst,
          stripeExtra,
        ]
      );
      row = { id: inserted.rows[0].id };
    } else {
      await query(
        `UPDATE pricing_configs
         SET first_site_cents = $1,
             extra_site_cents = $2,
             first_site_cents_yearly = $3,
             extra_site_cents_yearly = $4,
             active = $5,
             stripe_first_site_price_id = $6,
             stripe_extra_site_price_id = $7
         WHERE id = $8`,
        [
          firstSiteCents,
          extraSiteCents,
          src.first_site_cents_yearly ?? null,
          src.extra_site_cents_yearly ?? null,
          active,
          stripeFirst,
          stripeExtra,
          row.id,
        ]
      );
    }

    await query(
      `INSERT INTO pricing_history
        (pricing_config_id, region, plan_id, currency, first_site_cents, extra_site_cents, active,
         stripe_first_site_price_id, stripe_extra_site_price_id, changed_by_user_id, change_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        row.id,
        id,
        src.plan_id,
        region.currency,
        firstSiteCents,
        extraSiteCents,
        active,
        stripeFirst,
        stripeExtra,
        userId || null,
        "Matched United States prices",
      ]
    );
  }

  invalidatePricingCache();
  return { region, warning: stripeWarning };
}

export async function deleteBillingRegion(id) {
  if (id === "usa") throw new Error("The United States region can't be deleted.");
  await ensureBillingRegions();
  const users = await query(`SELECT COUNT(*)::int AS count FROM users WHERE region = $1`, [id]);
  if (Number(users.rows[0]?.count) > 0) {
    throw new Error("Customers are still on this region. Disable it instead.");
  }
  await query(`DELETE FROM pricing_configs WHERE region = $1`, [id]);
  const result = await query(`DELETE FROM billing_regions WHERE id = $1 RETURNING id`, [id]);
  if (!result.rows.length) throw new Error("Region not found.");
  invalidatePricingCache();
}
