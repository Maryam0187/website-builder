import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createHmac, timingSafeEqual, randomBytes } from "crypto";
import { query } from "./db";

const COOKIE_NAME = "tn_builder_session";
const SESSION_DAYS = 14;

function secret() {
  return process.env.SESSION_SECRET || "dev-only-session-secret-change-me";
}

function sign(value) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

function packToken(sessionToken) {
  const sig = sign(sessionToken);
  return `${sessionToken}.${sig}`;
}

function unpackToken(cookieValue) {
  if (!cookieValue || !cookieValue.includes(".")) return null;
  const [sessionToken, sig] = cookieValue.split(".");
  const expected = sign(sessionToken);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return sessionToken;
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function mapUser(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    email: row.email,
    name: row.name,
    role: row.role,
    siteId: row.site_id == null ? null : Number(row.site_id),
    passwordHash: row.password_hash,
    mustChangePassword: Boolean(row.must_change_password),
    createdAt: row.created_at,
  };
}

export async function getUserByEmail(email) {
  const { rows } = await query(`SELECT * FROM users WHERE email = $1 LIMIT 1`, [
    String(email || "").toLowerCase().trim(),
  ]);
  return mapUser(rows[0]);
}

export async function ensureAdminUser() {
  const email = (process.env.ADMIN_EMAIL || "admin@technonaire.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "changeme123";

  const existing = await query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
  if (existing.rows.length) return;

  const passwordHash = await hashPassword(password);
  await query(
    `INSERT INTO users (email, name, role, password_hash, must_change_password)
     VALUES ($1, $2, 'admin', $3, false)`,
    [email, "Technonaire Admin", passwordHash],
  );
}

export async function createSession(userId) {
  const sessionToken = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await query(`DELETE FROM sessions WHERE user_id = $1`, [userId]);
  await query(`INSERT INTO sessions (user_id, token, expires_at) VALUES ($1, $2, $3)`, [
    userId,
    sessionToken,
    expiresAt.toISOString(),
  ]);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, packToken(sessionToken), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return sessionToken;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(COOKIE_NAME)?.value;
  const sessionToken = unpackToken(cookieValue);

  if (sessionToken) {
    await query(`DELETE FROM sessions WHERE token = $1`, [sessionToken]);
  }

  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentUser() {
  await ensureAdminUser();
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(COOKIE_NAME)?.value;
  const sessionToken = unpackToken(cookieValue);
  if (!sessionToken) return null;

  const { rows } = await query(
    `SELECT u.*
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = $1 AND s.expires_at > now()
     LIMIT 1`,
    [sessionToken],
  );

  const user = mapUser(rows[0]);
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    siteId: user.siteId,
    mustChangePassword: user.mustChangePassword,
  };
}

export async function requireUser(roles = []) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (roles.length && !roles.includes(user.role)) return null;
  return user;
}

/** API helper: block owners who still have the invite temporary password. */
export function denyIfMustChangePassword(user) {
  if (!user?.mustChangePassword) return null;
  return NextResponse.json(
    {
      error: "You must change your temporary password before continuing.",
      code: "MUST_CHANGE_PASSWORD",
    },
    { status: 403 },
  );
}

export async function changePassword(userId, currentPassword, newPassword) {
  const id = Number(userId);
  if (!Number.isFinite(id)) throw new Error("User not found");

  const next = String(newPassword || "");
  if (next.length < 8) {
    throw new Error("New password must be at least 8 characters");
  }

  const { rows } = await query(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [id]);
  const user = mapUser(rows[0]);
  if (!user) throw new Error("User not found");

  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new Error("Current password is incorrect");
  }

  if (await verifyPassword(next, user.passwordHash)) {
    throw new Error("New password must be different from your temporary password");
  }

  const passwordHash = await hashPassword(next);
  await query(
    `UPDATE users
     SET password_hash = $2, must_change_password = false
     WHERE id = $1`,
    [id, passwordHash],
  );

  return { ok: true };
}
