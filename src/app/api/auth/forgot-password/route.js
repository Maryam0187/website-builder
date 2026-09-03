import { NextResponse } from "next/server";
import { createPasswordResetToken } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/mail";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "")
    .toLowerCase()
    .trim();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Always return a generic success message to avoid email enumeration
  const generic = {
    ok: true,
    message:
      "If that email is registered, we’ve sent a password reset link. Check your inbox (and spam).",
  };

  try {
    const reset = await createPasswordResetToken(email);
    if (!reset) {
      return NextResponse.json(generic);
    }

    const mailResult = await sendPasswordResetEmail({
      to: reset.user.email,
      name: reset.user.name,
      resetUrl: reset.resetUrl,
    });

    // Local/dev without Resend: surface the link so you can reset without email
    if (mailResult?.mocked) {
      return NextResponse.json({
        ...generic,
        message:
          "Email isn’t configured locally — use the reset link below (also printed in the server console).",
        devResetUrl: reset.resetUrl,
      });
    }

    return NextResponse.json(generic);
  } catch (error) {
    console.error("forgot-password:", error.message);
    return NextResponse.json(
      { error: error.message || "Could not start password reset" },
      { status: 500 },
    );
  }
}
