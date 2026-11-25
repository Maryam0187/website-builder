import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { listAssignedCoupons, publicOffer } from "@/lib/discounts";

/** Coupons assigned to the signed-in customer. Other people's codes stay hidden. */
export async function GET() {
  try {
    const user = await requireUser(["owner"]);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const rows = await listAssignedCoupons(user.id);
    return NextResponse.json({
      coupons: rows.map((row) => publicOffer(row)).filter(Boolean),
    });
  } catch (error) {
    console.error("GET /api/checkout/my-coupons error:", error);
    return NextResponse.json({ coupons: [] });
  }
}
