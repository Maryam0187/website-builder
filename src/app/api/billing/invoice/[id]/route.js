import { NextResponse } from "next/server";
import { getUserById, publicUser, requireUser } from "@/lib/auth";
import { getAddon, getInvoiceById, getPlan } from "@/lib/billing";
import { isStripeConfigured } from "@/lib/stripe";

export async function GET(_request, { params }) {
  const user = await requireUser(["admin", "owner"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const invoice = await getInvoiceById(id);
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  if (user.role !== "admin" && Number(invoice.userId) !== Number(user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const owner = publicUser(await getUserById(invoice.userId));
  const addon = invoice.addonId ? getAddon(invoice.addonId) : null;
  const plan = getPlan(invoice.planId);

  return NextResponse.json({
    invoice,
    owner: owner
      ? { id: owner.id, name: owner.name, email: owner.email }
      : null,
    addon: addon
      ? {
          id: addon.id,
          name: addon.name,
          priceLabel: addon.priceLabel,
          billingType: addon.billingType,
          highlights: addon.highlights,
        }
      : null,
    plan: addon
      ? null
      : {
          id: plan.id,
          name: plan.name,
          priceLabel: plan.priceLabel,
          highlights: plan.highlights,
        },
    stripeEnabled: isStripeConfigured(),
  });
}
