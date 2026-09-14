import { NextResponse } from "next/server";
import { requireUser, denyIfMustChangePassword } from "@/lib/auth";
import { createSetupIntent } from "@/lib/billing";

export const runtime = "nodejs";

export async function POST() {
  const user = await requireUser(["owner"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const blocked = denyIfMustChangePassword(user);
  if (blocked) return blocked;

  try {
    const result = await createSetupIntent(user.id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to create setup intent" }, { status: 400 });
  }
}
