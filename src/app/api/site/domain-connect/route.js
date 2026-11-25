import { NextResponse } from "next/server";
import { denyIfMustChangePassword, requireUser } from "@/lib/auth";

/**
 * One-click DNS (Entri) session for GoDaddy, Namecheap, and Cloudflare.
 * The secret stays on the server. When Entri is not configured, the
 * domain screen falls through to the provider list.
 */
export async function POST() {
  const user = await requireUser(["owner"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const blocked = denyIfMustChangePassword(user);
  if (blocked) return blocked;

  const applicationId = process.env.ENTRI_APPLICATION_ID;
  const secret = process.env.ENTRI_SECRET;
  if (!applicationId || !secret) {
    return NextResponse.json({ available: false });
  }

  try {
    const response = await fetch("https://api.goentri.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId, secret }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.auth_token) {
      return NextResponse.json({ available: false });
    }
    return NextResponse.json({
      available: true,
      applicationId,
      token: data.auth_token,
    });
  } catch {
    return NextResponse.json({ available: false });
  }
}
