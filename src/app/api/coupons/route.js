import { NextResponse } from "next/server";
import { denyIfMustChangePassword, requireUser } from "@/lib/auth";
import { listDiscounts } from "@/lib/discounts";

export async function GET() {
  const user = await requireUser(["admin"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const blocked = denyIfMustChangePassword(user);
  if (blocked) return blocked;

  const rows = await listDiscounts();
  const coupons = rows.map((row) => ({
    id: row.id,
    type: row.type,
    code: row.code || null,
    name: row.name,
    valueType: row.value_type,
    valueAmount: row.value_amount,
    durationType: row.duration_type,
    durationMonths: row.duration_months,
    maxRedemptions: row.max_redemptions,
    usedCount: row.used_count,
    applicablePlans: row.applicable_plans || [],
    billingInterval: row.billing_interval || null,
    expiryDate: row.expiry_date,
    active: row.active,
  }));

  return NextResponse.json({ coupons });
}
