import { NextResponse } from "next/server";
import {
  completeTotpLogin,
  createSession,
  createTotpLoginToken,
  destroySession,
  ensureAdminUser,
  getCurrentUser,
  getUserByEmail,
  isTotpRemembered,
  publicUser,
  verifyPassword,
} from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({ user });
}

export async function POST(request) {
  await ensureAdminUser();
  const body = await request.json().catch(() => ({}));

  if (body.totpToken && body.code) {
    try {
      const user = await completeTotpLogin(body.totpToken, body.code);
      return NextResponse.json({ user });
    } catch (error) {
      return NextResponse.json({ error: error.message || "Invalid authenticator code" }, { status: 401 });
    }
  }

  const email = String(body.email || "").toLowerCase().trim();
  const password = String(body.password || "");

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const user = await getUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if (user.totpEnabled && user.totpSecret) {
    if (user.totpAskLife !== "every" && (await isTotpRemembered(user.id))) {
      await createSession(user.id);
      return NextResponse.json({ user: publicUser(user) });
    }
    return NextResponse.json({
      requires2fa: true,
      totpToken: createTotpLoginToken(user.id),
      message: "Enter the 6-digit code from Google Authenticator.",
    });
  }

  await createSession(user.id);
  return NextResponse.json({
    user: publicUser(user),
  });
}

export async function DELETE() {
  await destroySession();
  return NextResponse.json({ ok: true });
}
