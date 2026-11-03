import { NextResponse } from "next/server";
import { changePassword, getCurrentUser, getUserById, publicUser } from "@/lib/auth";
import { rateLimiters, applyRateLimit } from "@/lib/rate-limit";

export async function POST(request) {
  const user = await getCurrentUser();
  
  // Rate limit: 5 requests per minute per user
  if (user) {
    const rateCheck = await applyRateLimit(request, rateLimiters.auth, 'change-password', user.id);
    if (rateCheck.limited) return rateCheck.response;
  }
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");
  const confirmPassword = String(body.confirmPassword || "");

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Current password and new password are required" },
      { status: 400 },
    );
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: "New passwords do not match" }, { status: 400 });
  }

  try {
    await changePassword(user.id, currentPassword, newPassword);
    const fresh = await getUserById(user.id);
    return NextResponse.json({
      ok: true,
      user: publicUser(fresh),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to change password" }, { status: 400 });
  }
}
