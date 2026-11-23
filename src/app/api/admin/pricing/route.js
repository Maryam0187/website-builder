import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-auth";
import { rateLimiters, applyRateLimit } from "@/lib/rate-limit";
import { query } from "@/lib/db";
import { getAllPricingConfigs, getPricingHistory, invalidatePricingCache } from "@/lib/pricing-cache";
import {
  addBillingRegion,
  copyUsaPrices,
  deleteBillingRegion,
  listBillingRegions,
  setBillingRegionEnabled,
} from "@/lib/billing-regions";
import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

async function syncCopiedStripePrices(plan) {
  if (!stripe) return null;

  async function replacePrice(name, cents, type, oldId) {
    if (!(cents > 0)) {
      if (oldId) await stripe.prices.update(oldId, { active: false });
      return null;
    }
    const product = await stripe.products.create({
      name,
      metadata: {
        region: plan.regionId,
        planId: plan.planId,
        type,
        configId: plan.configId ? String(plan.configId) : "",
      },
    });
    const price = await stripe.prices.create({
      currency: "usd",
      unit_amount: cents,
      recurring: { interval: "month" },
      product: product.id,
      metadata: {
        region: plan.regionId,
        planId: plan.planId,
        type,
        configId: plan.configId ? String(plan.configId) : "",
      },
    });
    if (oldId && oldId !== price.id) {
      await stripe.prices.update(oldId, { active: false });
    }
    return price.id;
  }

  const next = {};
  if (plan.active && plan.firstChanged) {
    next.first = await replacePrice(
      `${plan.planId.toUpperCase()} Plan - First Site (${plan.regionId.toUpperCase()})`,
      plan.firstSiteCents,
      "first_site",
      plan.oldFirst
    );
  }
  if (plan.active && plan.extraChanged) {
    next.extra = await replacePrice(
      `${plan.planId.toUpperCase()} Plan - Additional Site (${plan.regionId.toUpperCase()})`,
      plan.extraSiteCents,
      "extra_site",
      plan.oldExtra
    );
  }
  return next;
}

/**
 * GET /api/admin/pricing
 * List all pricing configs
 */
export async function GET(request) {
  try {
    const user = await requireUser(["admin"]);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    requireAdmin(user);

    // Rate limit: 100 requests per minute per admin
    const rateCheck = await applyRateLimit(request, rateLimiters.admin, 'admin-pricing-get', user.id);
    if (rateCheck.limited) return rateCheck.response;
    
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('configId');
    
    if (configId) {
      // Get history for specific config
      const history = await getPricingHistory(configId, 50);
      return NextResponse.json({ history });
    }
    
    const [configs, regions] = await Promise.all([
      getAllPricingConfigs(),
      listBillingRegions(),
    ]);
    return NextResponse.json({ configs, regions });
    
  } catch (error) {
    console.error("GET /api/admin/pricing error:", error);
    
    if (error.message === "Authentication required") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error.message === "Admin access required") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: "Failed to fetch pricing" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/pricing
 * Update a pricing config
 */
export async function POST(request) {
  try {
    const user = await requireUser(["admin"]);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    requireAdmin(user);
    
    // Rate limit: 100 requests per minute per admin
    const rateCheck = await applyRateLimit(request, rateLimiters.admin, 'admin-pricing-post', user.id);
    if (rateCheck.limited) return rateCheck.response;

    const body = await request.json();
    const action = String(body.action || "save").trim();

    if (action === "add-region") {
      const region = await addBillingRegion(body);
      return NextResponse.json({ success: true, region });
    }
    if (action === "set-region-enabled") {
      const region = await setBillingRegionEnabled(body.id, body.enabled);
      return NextResponse.json({ success: true, region });
    }
    if (action === "delete-region") {
      await deleteBillingRegion(String(body.id || ""));
      return NextResponse.json({ success: true });
    }
    if (action === "copy-usa-prices") {
      const result = await copyUsaPrices(body.id, {
        userId: user.id,
        applyStripe: (plan) => syncCopiedStripePrices(plan),
      });
      return NextResponse.json({ success: true, region: result.region, warning: result.warning });
    }

    const {
      id,
      region,
      planId,
      currency,
      firstSiteCents,
      extraSiteCents,
      active,
    } = body;
    
    // Validate inputs
    if (!id) {
      return NextResponse.json({ error: "Config ID required" }, { status: 400 });
    }
    
    if (firstSiteCents < 0 || extraSiteCents < 0) {
      return NextResponse.json({ error: "Prices cannot be negative" }, { status: 400 });
    }
    
    // Get existing config
    const existing = await query(
      `SELECT * FROM pricing_configs WHERE id = $1`,
      [id]
    );
    
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: "Config not found" }, { status: 404 });
    }
    
    const oldConfig = existing.rows[0];
    
    // Create new Stripe Price objects if Stripe is configured and region uses Stripe
    let stripeFirstSitePriceId = oldConfig.stripe_first_site_price_id;
    let stripeExtraSitePriceId = oldConfig.stripe_extra_site_price_id;
    
    let stripeWarning = null;
    if (stripe && String(currency || "").toLowerCase() === "usd" && active) {
      try {
        async function createRecurringPrice(name, cents, type, interval) {
          const product = await stripe.products.create({
            name,
            metadata: { region, planId, type, configId: String(id) },
          });
          const price = await stripe.prices.create({
            currency: "usd",
            unit_amount: cents,
            recurring: { interval },
            product: product.id,
            metadata: { region, planId, type, configId: String(id) },
          });
          return price.id;
        }

        if (firstSiteCents > 0) {
          const nextId = await createRecurringPrice(
            `${planId.toUpperCase()} Plan - First Site (${region.toUpperCase()})`,
            firstSiteCents,
            "first_site",
            "month"
          );
          if (oldConfig.stripe_first_site_price_id && oldConfig.stripe_first_site_price_id !== nextId) {
            await stripe.prices.update(oldConfig.stripe_first_site_price_id, { active: false });
          }
          stripeFirstSitePriceId = nextId;
        }

        if (extraSiteCents > 0) {
          const nextId = await createRecurringPrice(
            `${planId.toUpperCase()} Plan - Additional Site (${region.toUpperCase()})`,
            extraSiteCents,
            "extra_site",
            "month"
          );
          if (oldConfig.stripe_extra_site_price_id && oldConfig.stripe_extra_site_price_id !== nextId) {
            await stripe.prices.update(oldConfig.stripe_extra_site_price_id, { active: false });
          }
          stripeExtraSitePriceId = nextId;
        }
      } catch (stripeError) {
        console.error("Stripe price creation failed:", stripeError);
        stripeWarning = "Saved the catalog price. Stripe price update failed, so new checkouts will create a price from this amount.";
      }
    }
    
    // Update config
    await query(`
      UPDATE pricing_configs
      SET 
        first_site_cents = $1,
        extra_site_cents = $2,
        active = $3,
        stripe_first_site_price_id = $4,
        stripe_extra_site_price_id = $5
      WHERE id = $6
    `, [
      firstSiteCents,
      extraSiteCents,
      active,
      stripeFirstSitePriceId,
      stripeExtraSitePriceId,
      id,
    ]);
    
    // Log to history
    await query(`
      INSERT INTO pricing_history
      (pricing_config_id, region, plan_id, currency, first_site_cents, extra_site_cents, active,
       stripe_first_site_price_id, stripe_extra_site_price_id, changed_by_user_id, change_reason)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      id,
      oldConfig.region,
      oldConfig.plan_id,
      oldConfig.currency,
      firstSiteCents,
      extraSiteCents,
      active,
      stripeFirstSitePriceId,
      stripeExtraSitePriceId,
      user.id,
      `Updated via admin UI. Previous: ${oldConfig.first_site_cents}/${oldConfig.extra_site_cents}`,
    ]);
    
    // Invalidate cache
    invalidatePricingCache();
    
    return NextResponse.json({
      success: true,
      warning: stripeWarning,
      config: {
        id,
        region,
        planId,
        firstSiteCents,
        extraSiteCents,
        active,
        stripeFirstSitePriceId,
        stripeExtraSitePriceId,
      },
    });
    
  } catch (error) {
    console.error("POST /api/admin/pricing error:", error);
    
    if (error.message === "Authentication required") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error.message === "Admin access required") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    
    const message = String(error.message || "");
    const safe = message && message.length < 180 && !/select |insert |update |relation /i.test(message);
    return NextResponse.json(
      { error: safe ? message : "Failed to update pricing" },
      { status: safe ? 400 : 500 }
    );
  }
}
