/**
 * Apply schema.sql and seed admin user.
 * Usage: node scripts/migrate.mjs
 */
import pg from "pg";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, "../src/lib/schema.sql");
const sql = readFileSync(schemaPath, "utf8");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is missing — cannot migrate.");
  process.exit(1);
}

if (connectionString.includes("localhost") || connectionString.includes("127.0.0.1")) {
  console.warn(
    "WARNING: DATABASE_URL points at localhost. On Railway use ${{Postgres.DATABASE_URL}}.",
  );
}

const isLocal =
  connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

const pool = new pg.Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === "false" || isLocal ? false : { rejectUnauthorized: false },
});

try {
  await pool.query(sql);

  const adminEmail = (process.env.ADMIN_EMAIL || "admin@technonaire.com").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "changeme123";

  const existing = await pool.query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
  if (!existing.rows.length) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await pool.query(
      `INSERT INTO users (email, name, role, password_hash, must_change_password)
       VALUES ($1, $2, 'admin', $3, false)`,
      [adminEmail, "Technonaire Admin", passwordHash],
    );
    console.log(`Admin user seeded: ${adminEmail}`);
  } else {
    console.log("Admin user already exists.");
  }

  const { rows } = await pool.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
  );
  console.log(
    "Postgres migrate OK. Tables:",
    rows.map((r) => r.tablename).join(", ") || "(none)",
  );
  process.exit(0);
} catch (error) {
  console.error("Postgres migrate failed:", error.message);
  process.exit(1);
} finally {
  await pool.end();
}
