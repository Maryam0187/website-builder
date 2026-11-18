/**
 * Wipe local Postgres data, then seed only admin + one owner.
 *
 * Usage:
 *   npm run db:reset-local
 *
 * Safety: refuses non-local DATABASE_URL unless ALLOW_REMOTE_SEED=1.
 *
 * Credentials (from .env.local or defaults):
 *   ADMIN_EMAIL / ADMIN_PASSWORD
 *   OWNER_EMAIL / OWNER_PASSWORD
 */
import pg from "pg";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { spawnSync } from "child_process";

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
  console.error(
    "Refusing to reset a non-local DATABASE_URL. Set ALLOW_REMOTE_SEED=1 to override.",
  );
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === "false" || isLocal ? false : { rejectUnauthorized: false },
});

try {
  console.log("Resetting local database…");

  await pool.query(`
    TRUNCATE TABLE
      password_reset_tokens,
      site_versions,
      invoices,
      messages,
      sessions,
      sites,
      conversations,
      users
    RESTART IDENTITY CASCADE
  `);

  console.log("All tables truncated.\n");
} catch (error) {
  console.error("Reset failed:", error.message);
  process.exit(1);
} finally {
  await pool.end();
}

const seed = spawnSync(process.execPath, [join(__dirname, "seed-local-users.mjs")], {
  cwd: join(__dirname, ".."),
  env: process.env,
  encoding: "utf8",
  stdio: "inherit",
});

if (seed.status !== 0) {
  process.exit(seed.status || 1);
}

console.log("\nLocal DB reset complete (admin + one owner only).");
