import { NextResponse } from "next/server";
import { changePassword, getCurrentUser } from "@/lib/auth";

export async function POST(request) {
  const user = await getCurrentUser();
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
    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        siteId: user.siteId || null,
        mustChangePassword: false,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to change password" }, { status: 400 });
  }
}
