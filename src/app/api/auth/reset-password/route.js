import { NextResponse } from "next/server";
import { getValidPasswordResetToken, resetPasswordWithToken } from "@/lib/auth";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const reset = await getValidPasswordResetToken(token);
  if (!reset) {
    return NextResponse.json(
      { valid: false, error: "This reset link is invalid or has expired." },
      { status: 400 },
    );
  }
  return NextResponse.json({
    valid: true,
    email: reset.email,
  });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const token = String(body.token || "").trim();
  const newPassword = String(body.newPassword || "");
  const confirmPassword = String(body.confirmPassword || "");

  if (!token) {
    return NextResponse.json({ error: "Reset token is required" }, { status: 400 });
  }
  if (!newPassword) {
    return NextResponse.json({ error: "New password is required" }, { status: 400 });
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
  }

  try {
    const result = await resetPasswordWithToken(token, newPassword);
    return NextResponse.json({
      ok: true,
      message: "Password updated. You can sign in with your new password.",
      email: result.email,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Reset failed" }, { status: 400 });
  }
}
