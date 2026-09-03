import { NextResponse } from "next/server";
import {
  beginTotpSetup,
  confirmTotpSetup,
  denyIfMustChangePassword,
  disableTotp,
  requireUser,
  updateTotpAskLife,
} from "@/lib/auth";

export async function POST(request) {
  const user = await requireUser(["admin", "owner"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const blocked = denyIfMustChangePassword(user);
  if (blocked) return blocked;

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "").trim();

  try {
    if (action === "setup") {
      const setup = await beginTotpSetup(user.id);
      return NextResponse.json({
        secret: setup.secret,
        otpauth: setup.otpauth,
        qrDataUrl: setup.qrDataUrl,
        message: "Scan this QR code with Google Authenticator, then enter the 6-digit code.",
      });
    }

    if (action === "enable") {
      const updated = await confirmTotpSetup(user.id, body.code, body.askLife);
      const when =
        updated.totpAskLife === "week"
          ? "once a week"
          : updated.totpAskLife === "days30"
            ? "every 30 days"
            : "on every login";
      return NextResponse.json({
        user: updated,
        message: `Authenticator is on. We’ll ask for a code ${when}.`,
      });
    }

    if (action === "ask-life") {
      const updated = await updateTotpAskLife(user.id, body.askLife);
      const when =
        updated.totpAskLife === "week"
          ? "once a week"
          : updated.totpAskLife === "days30"
            ? "every 30 days"
            : "on every login";
      return NextResponse.json({
        user: updated,
        message: `Saved. We’ll ask for a code ${when}.`,
      });
    }

    if (action === "disable") {
      const updated = await disableTotp(user.id, {
        password: body.password,
        code: body.code,
      });
      return NextResponse.json({
        user: updated,
        message: "Authenticator turned off.",
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Authenticator update failed" }, { status: 400 });
  }
}
