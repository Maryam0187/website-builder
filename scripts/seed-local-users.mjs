/**
 * Seed local admin + demo owner (no Resend / email needed).
 *
 * Usage:
 *   node scripts/seed-local-users.mjs
 *
 * Defaults (override with env):
 *   ADMIN_EMAIL / ADMIN_PASSWORD
 *   OWNER_EMAIL=owner@local.test
 *   OWNER_PASSWORD=owner12345
 *   OWNER_BRAND=Local Demo Shop
 *   OWNER_TEMPLATE=perfume
 */
import pg from "pg";
import bcrypt from "bcryptjs";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { randomBytes } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = value;
  }
}

loadEnvFile(join(__dirname, "../.env.local"));
loadEnvFile(join(__dirname, "../.env"));

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is missing.");
  process.exit(1);
}

const isLocal =
  connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
if (!isLocal && process.env.ALLOW_REMOTE_SEED !== "1") {
  console.error("Refusing to seed a non-local DATABASE_URL. Set ALLOW_REMOTE_SEED=1 to override.");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === "false" || isLocal ? false : { rejectUnauthorized: false },
});

const schemaSql = readFileSync(join(__dirname, "../src/lib/schema.sql"), "utf8");

// Minimal default site content (one-page) — app normalize will flesh it out on load
function defaultContent(brandName, template = "other") {
  return {
    layout: "one-page",
    template,
    brand: { name: brandName, tagline: "Local demo site" },
    theme: {
      primary: "#c4a574",
      accent: "#0c0a09",
      text: "#f5f0e8",
      muted: "#a8a29e",
    },
    features: { pwa: false, notifications: false, commerce: true, dineOs: false },
    styles: {},
    nav: [
      { label: "Home", pageId: "home" },
      { label: "About", pageId: "about" },
      { label: "Contact", pageId: "contact" },
    ],
    pages: {
      home: {
        type: "home",
        hero: {
          headline: brandName,
          subheadline: "Local demo — edit text and photos after login.",
          cta: "Contact us",
          image:
            "https://images.unsplash.com/photo-1774682060992-46c7e9f2e50b?auto=format&fit=crop&w=2000&q=85",
        },
      },
      about: {
        type: "about",
        title: "About",
        body: `${brandName} is a local demo site created without email verification.`,
        image:
          "https://images.unsplash.com/photo-1774682060910-ba9a26f958ad?auto=format&fit=crop&w=2000&q=85",
      },
      contact: {
        type: "contact",
        title: "Get in touch",
        email: "info@technonaire.com",
        address: "",
        showForm: true,
        image:
          "https://images.unsplash.com/photo-1557170334-a9632e77c6e4?auto=format&fit=crop&w=2000&q=85",
      },
    },
  };
}

function slugify(value) {
  return String(value || "demo")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "demo";
}

try {
  await pool.query(schemaSql);

  const adminEmail = (process.env.ADMIN_EMAIL || "admin@technonaire.com").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "changeme123";
  const ownerEmail = (process.env.OWNER_EMAIL || "owner@local.test").toLowerCase();
  const ownerPassword = process.env.OWNER_PASSWORD || "owner12345";
  const brandName = process.env.OWNER_BRAND || "Local Demo Shop";
  const template = process.env.OWNER_TEMPLATE || "perfume";

  // Admin
  const adminExisting = await pool.query(`SELECT id, email FROM users WHERE role = 'admin' LIMIT 1`);
  if (!adminExisting.rows.length) {
    const hash = await bcrypt.hash(adminPassword, 10);
    await pool.query(
      `INSERT INTO users (email, name, role, password_hash, must_change_password)
       VALUES ($1, $2, 'admin', $3, false)`,
      [adminEmail, "Technonaire Admin", hash],
    );
    console.log(`Admin created: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log(`Admin already exists: ${adminExisting.rows[0].email}`);
  }

  // Owner + conversation + site
  const ownerExisting = await pool.query(`SELECT id, site_id FROM users WHERE email = $1`, [
    ownerEmail,
  ]);
  if (ownerExisting.rows.length) {
    console.log(`Owner already exists: ${ownerEmail}`);
    console.log(`  Login: ${ownerEmail} / ${ownerPassword} (password unchanged if already seeded)`);
  } else {
    const accessToken = randomBytes(18).toString("hex");
    const conv = await pool.query(
      `INSERT INTO conversations
         (name, email, website_name, phone, business_type, access_token, email_verified, email_verified_at, bot_onboarded, bot_step, status)
       VALUES ($1, $2, $3, '', $4, $5, true, now(), true, 'done', 'open')
       RETURNING id`,
      [brandName, ownerEmail, brandName, template, accessToken],
    );
    const conversationId = conv.rows[0].id;

    let slug = slugify(brandName);
    let i = 1;
    while (true) {
      const check = await pool.query(`SELECT id FROM sites WHERE slug = $1`, [slug]);
      if (!check.rows.length) break;
      slug = `${slugify(brandName)}-${i++}`;
    }

    const content = defaultContent(brandName, template);
    const siteRes = await pool.query(
      `INSERT INTO sites (slug, conversation_id, owner_id, status, content)
       VALUES ($1, $2, NULL, 'draft', $3::jsonb)
       RETURNING id`,
      [slug, conversationId, JSON.stringify(content)],
    );
    const siteId = siteRes.rows[0].id;

    const passwordHash = await bcrypt.hash(ownerPassword, 10);
    const userRes = await pool.query(
      `INSERT INTO users (email, name, role, site_id, password_hash, must_change_password, payment_status, payment_plan)
       VALUES ($1, $2, 'owner', $3, $4, false, 'unpaid', 'Easy Website')
       RETURNING id`,
      [ownerEmail, brandName, siteId, passwordHash],
    );
    const ownerId = userRes.rows[0].id;

    await pool.query(`UPDATE sites SET owner_id = $2, updated_at = now() WHERE id = $1`, [
      siteId,
      ownerId,
    ]);
    await pool.query(`UPDATE conversations SET site_id = $2, updated_at = now() WHERE id = $1`, [
      conversationId,
      siteId,
    ]);
    await pool.query(
      `INSERT INTO messages (conversation_id, sender, body, images, system, read_by_admin)
       VALUES ($1, 'bot', $2, '[]'::jsonb, true, true)`,
      [
        conversationId,
        `Local demo ready (no email).\n\nLogin: ${ownerEmail}\nPassword: ${ownerPassword}\nPreview: /site/${slug}\nEdit: /edit\nProfile: /profile`,
      ],
    );

    console.log("Owner created:");
    console.log(`  Email:    ${ownerEmail}`);
    console.log(`  Password: ${ownerPassword}`);
    console.log(`  Site:     /site/${slug}`);
    console.log(`  Edit:     /edit`);
    console.log(`  Profile:  /profile`);
  }

  console.log("\nAdmin login (from .env.local if set):");
  console.log(`  Email:    ${adminEmail}`);
  console.log(`  Password: ${adminPassword}`);
  process.exit(0);
} catch (error) {
  console.error("Seed failed:", error.message);
  process.exit(1);
} finally {
  await pool.end();
}
