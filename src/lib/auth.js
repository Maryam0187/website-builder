import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { createHmac, timingSafeEqual } from "crypto";
import { id, readStore, updateStore } from "./db";

const COOKIE_NAME = "tn_builder_session";
const SESSION_DAYS = 14;

function secret() {
  return process.env.SESSION_SECRET || "dev-only-session-secret-change-me";
}

function sign(value) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

function packToken(sessionId) {
  const sig = sign(sessionId);
  return `${sessionId}.${sig}`;
}

function unpackToken(token) {
  if (!token || !token.includes(".")) return null;
  const [sessionId, sig] = token.split(".");
  const expected = sign(sessionId);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return sessionId;
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export async function ensureAdminUser() {
  const email = (process.env.ADMIN_EMAIL || "admin@technonaire.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "changeme123";

  return updateStore(async (store) => {
    let admin = store.users.find((u) => u.role === "admin");
    if (!admin) {
      admin = {
        id: id("user"),
        email,
        name: "Technonaire Admin",
        role: "admin",
        passwordHash: await hashPassword(password),
        mustChangePassword: false,
        createdAt: new Date().toISOString(),
      };
      store.users.push(admin);
    }
    return store;
  });
}

export async function createSession(userId) {
  const sessionId = id("sess");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  await updateStore((store) => {
    store.sessions = store.sessions.filter((s) => s.userId !== userId);
    store.sessions.push({ id: sessionId, userId, expiresAt });
    return store;
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, packToken(sessionId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });

  return sessionId;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const sessionId = unpackToken(token);

  if (sessionId) {
    await updateStore((store) => {
      store.sessions = store.sessions.filter((s) => s.id !== sessionId);
      return store;
    });
  }

  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentUser() {
  await ensureAdminUser();
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const sessionId = unpackToken(token);
  if (!sessionId) return null;

  const store = await readStore();
  const session = store.sessions.find((s) => s.id === sessionId);
  if (!session) return null;
  if (new Date(session.expiresAt) < new Date()) return null;

  const user = store.users.find((u) => u.id === session.userId);
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    siteId: user.siteId || null,
    mustChangePassword: Boolean(user.mustChangePassword),
  };
}

export async function requireUser(roles = []) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (roles.length && !roles.includes(user.role)) return null;
  return user;
}
