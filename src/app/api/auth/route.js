import { NextResponse } from "next/server";
import { ensureAdminUser, verifyPassword, createSession, getCurrentUser, destroySession } from "@/lib/auth";
import { readStore } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({ user });
}

export async function POST(request) {
  await ensureAdminUser();
  const body = await request.json();
  const email = String(body.email || "").toLowerCase().trim();
  const password = String(body.password || "");

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const store = await readStore();
  const user = store.users.find((u) => u.email === email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  await createSession(user.id);
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      siteId: user.siteId || null,
    },
  });
}

export async function DELETE() {
  await destroySession();
  return NextResponse.json({ ok: true });
}
