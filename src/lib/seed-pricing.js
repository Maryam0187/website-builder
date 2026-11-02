import { query } from "./db";
import { REGIONS, PRICING } from "./pricing";

/**
 * Seed pricing_configs table from default pricing on first run
 * Call this during app initialization (e.g., in ensureAdminUser)
 */
export async function seedDefaultPricing() {
  try {
    // Check if already seeded
    const existing = await query(`SELECT COUNT(*) FROM pricing_configs`);
    const count = parseInt(existing.rows[0].count, 10);
    
    if (count > 0) {
      console.log("Pricing already seeded, skipping...");
      return;
    }
    
    console.log("Seeding default pricing configurations...");
    
    // Seed each region's pricing
    for (const [regionKey, regionConfig] of Object.entries(REGIONS)) {
      const regionId = regionConfig.id;
      const pricing = PRICING[regionId];
      
      if (!pricing) {
        console.warn(`No pricing found for region: ${regionId}`);
        continue;
      }
      
      for (const [planId, planPricing] of Object.entries(pricing)) {
        const firstSite = planPricing.firstSite ?? 0;
        const extraSite = planPricing.extraSite ?? 0;
        const active = firstSite !== null; // null = contact-only
        
        await query(`
          INSERT INTO pricing_configs 
          (region, plan_id, currency, first_site_cents, extra_site_cents, active)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          regionId,
          planId,
          regionConfig.currency,
          firstSite,
          extraSite,
          active,
        ]);
        
        console.log(`  Seeded ${regionId}/${planId}: ${firstSite}/${extraSite} ${regionConfig.currency}`);
      }
    }
    
    console.log("Pricing seeding complete!");
  } catch (error) {
    console.error("Error seeding pricing:", error);
    throw error;
  }
}
