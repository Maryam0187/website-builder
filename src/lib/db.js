import { Pool } from "pg";
import { promises as fs } from "fs";
import path from "path";
import { nanoid } from "nanoid";

let pool = null;
let schemaReady = null;

function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is required. Add a Postgres database (Railway) and set DATABASE_URL.",
    );
  }
  return url;
}

export function getPool() {
  if (!pool) {
    const connectionString = databaseUrl();
    const isLocal =
      connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
    pool = new Pool({
      connectionString,
      ssl:
        process.env.DATABASE_SSL === "false" || isLocal
          ? false
          : { rejectUnauthorized: false },
    });
  }
  return pool;
}

export async function query(text, params = []) {
  await ensureSchema();
  return getPool().query(text, params);
}

export async function withTransaction(fn) {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

let billingColumnsReady = null;

/** Additive columns — runs once per process after base schema (covers hot-reload gaps). */
async function ensureBillingColumns() {
  if (billingColumnsReady) return billingColumnsReady;
  billingColumnsReady = getPool()
    .query(
      `
    ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_id TEXT NOT NULL DEFAULT 'free';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'none';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_used BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS site_slots INT NOT NULL DEFAULT 1;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret TEXT NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_pending_secret TEXT NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_ask_life TEXT NOT NULL DEFAULT 'every';
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS plan_id TEXT NOT NULL DEFAULT 'domain';
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stripe_session_id TEXT NULL;
    ALTER TABLE invoices ADD COLUMN IF NOT EXISTS addon_id TEXT NULL;
    ALTER TABLE sites ADD COLUMN IF NOT EXISTS custom_domain TEXT NULL;
    ALTER TABLE sites ADD COLUMN IF NOT EXISTS domain_status TEXT NOT NULL DEFAULT 'none';
    ALTER TABLE sites ADD COLUMN IF NOT EXISTS domain_verified_at TIMESTAMPTZ NULL;
    ALTER TABLE sites ADD COLUMN IF NOT EXISTS cf_hostname_id TEXT NULL;
    ALTER TABLE sites ADD COLUMN IF NOT EXISTS cf_hostname_status TEXT NULL;
    ALTER TABLE sites ADD COLUMN IF NOT EXISTS cf_ssl_status TEXT NULL;
    ALTER TABLE sites ADD COLUMN IF NOT EXISTS cf_validation_records JSONB NULL;
    ALTER TABLE sites ADD COLUMN IF NOT EXISTS cf_metadata JSONB NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_custom_domain_unique
      ON sites (lower(custom_domain))
      WHERE custom_domain IS NOT NULL;
  `,
    )
    .catch((error) => {
      billingColumnsReady = null;
      throw error;
    });
  return billingColumnsReady;
}

/** Safety net if migrate wasn't run; source of truth is src/lib/schema.sql */
export async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const sqlPath = path.join(process.cwd(), "src/lib/schema.sql");
      const sql = await fs.readFile(sqlPath, "utf8");
      await getPool().query(sql);
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
  await ensureBillingColumns();
}

/** Random token for cookies / chat links (not a DB primary key). */
export function token(prefix = "") {
  return prefix ? `${prefix}_${nanoid(16)}` : nanoid(24);
}

export function toInt(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
