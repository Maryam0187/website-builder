import { Pool } from "pg";
import { nanoid } from "nanoid";
import { SCHEMA_SQL } from "./schema-sql";

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

export async function ensureSchema() {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    await getPool().query(SCHEMA_SQL);
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
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
