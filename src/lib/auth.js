import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createHmac, timingSafeEqual, randomBytes } from "crypto";
import { query } from "./db";
import {
  decryptTotpSecret,
  encryptTotpSecret,
  generateTotpSecret,
  totpOtpauthUrl,
  totpQrDataUrl,
  verifyTotpCode,
} from "./totp";

const COOKIE_NAME = "tn_builder_session";
const TOTP_REMEMBER_COOKIE = "tn_builder_totp_ok";
const SESSION_DAYS = 14;
const TOTP_ASK_LIVES = new Set(["every", "week", "days30"]);

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
    paymentStatus: row.payment_status || "unpaid",
    paymentPlan: row.payment_plan || "Easy Website",
    paymentAmount: row.payment_amount || "",
    paymentNote: row.payment_note || "",
    paymentUpdatedAt: row.payment_updated_at || null,
    subscriptionStatus: row.subscription_status || "none",
    trialEndsAt: row.trial_ends_at || null,
    currentPeriodEnd: row.current_period_end || null,
    trialUsed: Boolean(row.trial_used),
    planId: row.plan_id || "free",
    stripeCustomerId: row.stripe_customer_id || null,
    stripeSubscriptionId: row.stripe_subscription_id || null,
    siteSlots: Math.max(1, Number(row.site_slots) || 1),
    totpEnabled: Boolean(row.totp_enabled),
    totpSecret: row.totp_secret || null,
    totpPendingSecret: row.totp_pending_secret || null,
    totpAskLife: normalizeTotpAskLife(row.totp_ask_life),
    createdAt: row.created_at,
  };
}

export function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    siteId: user.siteId || null,
    mustChangePassword: Boolean(user.mustChangePassword),
    paymentStatus: user.paymentStatus || "unpaid",
    paymentPlan: user.paymentPlan || "Easy Website",
    paymentAmount: user.paymentAmount || "",
    paymentNote: user.paymentNote || "",
    paymentUpdatedAt: user.paymentUpdatedAt || null,
    subscriptionStatus: user.subscriptionStatus || "none",
    trialEndsAt: user.trialEndsAt || null,
    currentPeriodEnd: user.currentPeriodEnd || null,
    trialUsed: Boolean(user.trialUsed),
    planId: user.planId || "free",
    stripeCustomerId: user.stripeCustomerId || null,
    stripeSubscriptionId: user.stripeSubscriptionId || null,
    siteSlots: Math.max(1, Number(user.siteSlots) || 1),
    totpEnabled: Boolean(user.totpEnabled),
    totpAskLife: normalizeTotpAskLife(user.totpAskLife),
  };
}

export function normalizeTotpAskLife(value) {
  const life = String(value || "").trim();
  return TOTP_ASK_LIVES.has(life) ? life : "every";
}

function totpAskLifeMs(life) {
  const value = normalizeTotpAskLife(life);
  if (value === "week") return 7 * 24 * 60 * 60 * 1000;
  if (value === "days30") return 30 * 24 * 60 * 60 * 1000;
  return 0;
}

export async function setTotpRememberCookie(userId, askLife) {
  const cookieStore = await cookies();
  const ms = totpAskLifeMs(askLife);
  if (!ms) {
    cookieStore.delete(TOTP_REMEMBER_COOKIE);
    return;
  }
  const exp = Date.now() + ms;
  cookieStore.set(TOTP_REMEMBER_COOKIE, packToken(`${Number(userId)}:${exp}`), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(exp),
  });
}

export async function clearTotpRememberCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(TOTP_REMEMBER_COOKIE);
}

export async function isTotpRemembered(userId) {
  const cookieStore = await cookies();
  const payload = unpackToken(cookieStore.get(TOTP_REMEMBER_COOKIE)?.value);
  if (!payload || !payload.includes(":")) return false;
  const [id, exp] = payload.split(":");
  if (Number(id) !== Number(userId)) return false;
  return Number.isFinite(Number(exp)) && Date.now() <= Number(exp);
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

  return publicUser(user);
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
    throw new Error("New password must be different from your current password");
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

export async function updateUserProfile(userId, { name } = {}) {
  const id = Number(userId);
  if (!Number.isFinite(id)) throw new Error("User not found");

  const nextName = String(name || "").trim();
  if (!nextName) throw new Error("Name is required");

  await query(`UPDATE users SET name = $2 WHERE id = $1`, [id, nextName]);
  const { rows } = await query(`SELECT * FROM users WHERE id = $1`, [id]);
  return publicUser(mapUser(rows[0]));
}

export async function updateUserPayment(
  userId,
  { paymentStatus, paymentPlan, paymentAmount, paymentNote } = {},
) {
  const id = Number(userId);
  if (!Number.isFinite(id)) throw new Error("User not found");

  const { rows: existingRows } = await query(`SELECT * FROM users WHERE id = $1`, [id]);
  const existing = mapUser(existingRows[0]);
  if (!existing) throw new Error("User not found");

  const status = paymentStatus
    ? String(paymentStatus).toLowerCase().trim()
    : existing.paymentStatus;
  if (!["unpaid", "pending", "paid"].includes(status)) {
    throw new Error("Payment status must be unpaid, pending, or paid");
  }

  const plan =
    paymentPlan != null ? String(paymentPlan).trim() || "Easy Website" : existing.paymentPlan;
  const amount =
    paymentAmount != null ? String(paymentAmount).trim() : existing.paymentAmount;
  const note = paymentNote != null ? String(paymentNote).trim() : existing.paymentNote;

  await query(
    `UPDATE users
     SET payment_status = $2,
         payment_plan = $3,
         payment_amount = $4,
         payment_note = $5,
         payment_updated_at = now()
     WHERE id = $1`,
    [id, status, plan, amount, note],
  );

  const { rows } = await query(`SELECT * FROM users WHERE id = $1`, [id]);
  return publicUser(mapUser(rows[0]));
}

export async function getUserById(userId) {
  const id = Number(userId);
  if (!Number.isFinite(id)) return null;
  const { rows } = await query(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [id]);
  return mapUser(rows[0]);
}

const RESET_TOKEN_HOURS = 2;

/** Create a one-time password reset token for an email. Returns null if user missing. */
export async function createPasswordResetToken(email) {
  const user = await getUserByEmail(email);
  if (!user) return null;

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + RESET_TOKEN_HOURS * 60 * 60 * 1000);

  // Invalidate previous unused tokens for this user
  await query(
    `UPDATE password_reset_tokens
     SET used_at = now()
     WHERE user_id = $1 AND used_at IS NULL`,
    [user.id],
  );

  await query(
    `INSERT INTO password_reset_tokens (user_id, token, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, token, expiresAt.toISOString()],
  );

  return {
    user: publicUser(user),
    token,
    expiresAt,
    resetUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${encodeURIComponent(token)}`,
  };
}

export async function getValidPasswordResetToken(token) {
  const value = String(token || "").trim();
  if (!value) return null;

  const { rows } = await query(
    `SELECT t.*, u.email, u.name, u.role
     FROM password_reset_tokens t
     JOIN users u ON u.id = t.user_id
     WHERE t.token = $1
       AND t.used_at IS NULL
       AND t.expires_at > now()
     LIMIT 1`,
    [value],
  );
  if (!rows[0]) return null;
  return {
    id: Number(rows[0].id),
    userId: Number(rows[0].user_id),
    email: rows[0].email,
    name: rows[0].name,
    role: rows[0].role,
  };
}

export async function resetPasswordWithToken(token, newPassword) {
  const next = String(newPassword || "");
  if (next.length < 8) {
    throw new Error("New password must be at least 8 characters");
  }

  const reset = await getValidPasswordResetToken(token);
  if (!reset) {
    throw new Error("This reset link is invalid or has expired. Request a new one.");
  }

  const passwordHash = await hashPassword(next);
  await query(
    `UPDATE users
     SET password_hash = $2, must_change_password = false
     WHERE id = $1`,
    [reset.userId, passwordHash],
  );
  await query(`UPDATE password_reset_tokens SET used_at = now() WHERE id = $1`, [reset.id]);
  await query(`DELETE FROM sessions WHERE user_id = $1`, [reset.userId]);

  return { ok: true, email: reset.email };
}

export function createTotpLoginToken(userId) {
  const exp = Date.now() + 5 * 60 * 1000;
  const payload = `${Number(userId)}:${exp}:${randomBytes(8).toString("hex")}`;
  return packToken(payload);
}

export function readTotpLoginToken(token) {
  const payload = unpackToken(token);
  if (!payload || !payload.includes(":")) return null;
  const [userId, exp] = payload.split(":");
  if (!Number.isFinite(Number(exp)) || Date.now() > Number(exp)) return null;
  const id = Number(userId);
  return Number.isFinite(id) ? id : null;
}

export async function beginTotpSetup(userId) {
  const user = await getUserById(userId);
  if (!user) throw new Error("User not found");
  if (user.totpEnabled) throw new Error("Authenticator is already enabled");

  const secret = generateTotpSecret();
  const otpauth = totpOtpauthUrl(user.email, secret);
  await query(`UPDATE users SET totp_pending_secret = $2 WHERE id = $1`, [
    user.id,
    encryptTotpSecret(secret),
  ]);
  return {
    secret,
    otpauth,
    qrDataUrl: await totpQrDataUrl(otpauth),
  };
}

export async function confirmTotpSetup(userId, code, askLife) {
  const user = await getUserById(userId);
  if (!user) throw new Error("User not found");
  if (!user.totpPendingSecret) throw new Error("Start authenticator setup first");

  const secret = decryptTotpSecret(user.totpPendingSecret);
  if (!verifyTotpCode(secret, code)) {
    throw new Error("That code is incorrect or expired. Try the next code from the app.");
  }

  const life = normalizeTotpAskLife(askLife);
  await query(
    `UPDATE users
     SET totp_secret = $2, totp_enabled = true, totp_pending_secret = NULL, totp_ask_life = $3
     WHERE id = $1`,
    [user.id, encryptTotpSecret(secret), life],
  );
  await setTotpRememberCookie(user.id, life);
  return publicUser(await getUserById(user.id));
}

export async function disableTotp(userId, { password, code } = {}) {
  const user = await getUserById(userId);
  if (!user) throw new Error("User not found");
  if (!user.totpEnabled || !user.totpSecret) {
    throw new Error("Authenticator is not enabled");
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    throw new Error("Current password is incorrect");
  }
  const secret = decryptTotpSecret(user.totpSecret);
  if (!verifyTotpCode(secret, code)) {
    throw new Error("That authenticator code is incorrect");
  }
  await query(
    `UPDATE users
     SET totp_enabled = false, totp_secret = NULL, totp_pending_secret = NULL, totp_ask_life = 'every'
     WHERE id = $1`,
    [user.id],
  );
  await clearTotpRememberCookie();
  return publicUser(await getUserById(user.id));
}

export async function updateTotpAskLife(userId, askLife) {
  const user = await getUserById(userId);
  if (!user) throw new Error("User not found");
  if (!user.totpEnabled) throw new Error("Turn on authenticator first");

  const life = normalizeTotpAskLife(askLife);
  await query(`UPDATE users SET totp_ask_life = $2 WHERE id = $1`, [user.id, life]);
  await setTotpRememberCookie(user.id, life);
  return publicUser(await getUserById(user.id));
}

export async function completeTotpLogin(totpToken, code) {
  const userId = readTotpLoginToken(totpToken);
  if (!userId) throw new Error("This sign-in step expired. Enter your password again.");

  const user = await getUserById(userId);
  if (!user?.totpEnabled || !user.totpSecret) {
    throw new Error("Authenticator is not enabled on this account");
  }
  const secret = decryptTotpSecret(user.totpSecret);
  if (!verifyTotpCode(secret, code)) {
    throw new Error("That authenticator code is incorrect");
  }
  await createSession(user.id);
  await setTotpRememberCookie(user.id, user.totpAskLife);
  return publicUser(user);
}
