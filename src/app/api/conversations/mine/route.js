import { NextResponse } from "next/server";
import { denyIfMustChangePassword, requireUser } from "@/lib/auth";
import { ensureOwnerConversation } from "@/lib/store-actions";

function withoutAccessToken(data) {
  if (!data?.conversation) return data;
  const { accessToken: _omit, ...conversation } = data.conversation;
  return { ...data, conversation };
}

/** Owner support chat used by Profile → Plan → Contact us. */
export async function GET() {
  const user = await requireUser(["owner"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const blocked = denyIfMustChangePassword(user);
  if (blocked) return blocked;

  try {
    const data = await ensureOwnerConversation(user);
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(withoutAccessToken(data));
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Could not open chat" },
      { status: 400 },
    );
  }
}
