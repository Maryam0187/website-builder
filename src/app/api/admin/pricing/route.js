import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-auth";
import { query } from "@/lib/db";
import { getAllPricingConfigs, getPricingHistory, invalidatePricingCache } from "@/lib/pricing-cache";
import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

/**
 * GET /api/admin/pricing
 * List all pricing configs
 */
export async function GET(request) {
  try {
    const user = await getUser(request);
    requireAdmin(user);
    
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('configId');
    
    if (configId) {
      // Get history for specific config
      const history = await getPricingHistory(configId, 50);
      return NextResponse.json({ history });
    }
    
    // Get all configs
    const configs = await getAllPricingConfigs();
    return NextResponse.json({ configs });
    
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
    const user = await getUser(request);
    requireAdmin(user);
    
    const body = await request.json();
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
    
    if (stripe && region !== 'pakistan' && active) {
      try {
        // Create new price for first site
        if (firstSiteCents > 0) {
          const firstSitePrice = await stripe.prices.create({
            currency: currency.toLowerCase(),
            unit_amount: firstSiteCents,
            recurring: { interval: 'month' },
            product_data: {
              name: `${planId.toUpperCase()} Plan - First Site (${region.toUpperCase()})`,
            },
            metadata: {
              region,
              planId,
              type: 'first_site',
              configId: id,
            },
          });
          stripeFirstSitePriceId = firstSitePrice.id;
          
          // Archive old price
          if (oldConfig.stripe_first_site_price_id && oldConfig.stripe_first_site_price_id !== stripeFirstSitePriceId) {
            await stripe.prices.update(oldConfig.stripe_first_site_price_id, { active: false });
          }
        }
        
        // Create new price for extra site
        if (extraSiteCents > 0) {
          const extraSitePrice = await stripe.prices.create({
            currency: currency.toLowerCase(),
            unit_amount: extraSiteCents,
            recurring: { interval: 'month' },
            product_data: {
              name: `${planId.toUpperCase()} Plan - Additional Site (${region.toUpperCase()})`,
            },
            metadata: {
              region,
              planId,
              type: 'extra_site',
              configId: id,
            },
          });
          stripeExtraSitePriceId = extraSitePrice.id;
          
          // Archive old price
          if (oldConfig.stripe_extra_site_price_id && oldConfig.stripe_extra_site_price_id !== stripeExtraSitePriceId) {
            await stripe.prices.update(oldConfig.stripe_extra_site_price_id, { active: false });
          }
        }
      } catch (stripeError) {
        console.error("Stripe price creation failed:", stripeError);
        return NextResponse.json(
          { error: `Stripe error: ${stripeError.message}` },
          { status: 500 }
        );
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
        stripe_extra_site_price_id = $5,
        updated_at = CURRENT_TIMESTAMP
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
      (pricing_config_id, changed_by_user_id, first_site_cents, extra_site_cents, active, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      id,
      user.id,
      firstSiteCents,
      extraSiteCents,
      active,
      `Updated via admin UI. Previous: ${oldConfig.first_site_cents}/${oldConfig.extra_site_cents}`,
    ]);
    
    // Invalidate cache
    invalidatePricingCache();
    
    return NextResponse.json({
      success: true,
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
    
    return NextResponse.json(
      { error: "Failed to update pricing" },
      { status: 500 }
    );
  }
}
