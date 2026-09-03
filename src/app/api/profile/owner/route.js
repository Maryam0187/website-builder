import { NextResponse } from "next/server";
import { getUserById, publicUser, requireUser } from "@/lib/auth";
import { billingPublicFields, listInvoicesForUser } from "@/lib/billing";

/** Admin: load an owner’s subscription + invoices. */
export async function GET(request) {
  const user = await requireUser(["admin"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const owner = await getUserById(userId);
  if (!owner || owner.role !== "owner") {
    return NextResponse.json({ error: "Owner not found" }, { status: 404 });
  }

  const pub = publicUser(owner);
  return NextResponse.json({
    user: pub,
    billing: billingPublicFields(pub),
    invoices: await listInvoicesForUser(owner.id),
  });
}
