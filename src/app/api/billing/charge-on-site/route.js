import { NextResponse } from "next/server";
import { requireUser, denyIfMustChangePassword, getUserById, publicUser } from "@/lib/auth";
import { 
  subscribeWithSavedCard, 
  buyExtraSiteSlotOnSite,
  billingPublicFields,
  listInvoicesForUser,
  fetchCardOnFile,
  listPaidAddonIds
} from "@/lib/billing";
import { countSitesByOwner, countLiveSitesByOwner } from "@/lib/store-actions";

export const runtime = "nodejs";

export async function POST(request) {
  const user = await requireUser(["owner"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const blocked = denyIfMustChangePassword(user);
  if (blocked) return blocked;

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "").trim();

  try {
    if (action === "subscribe") {
      const planId = String(body.planId || "starter").trim();
      const result = await subscribeWithSavedCard(user.id, planId);
      
      return NextResponse.json({
        user: result.user,
        billing: result.billing,
        invoice: result.invoice,
        invoiceUrl: result.invoice?.id ? `/invoice/${result.invoice.id}` : null,
        plan: result.plan,
        invoices: await listInvoicesForUser(user.id),
        message: result.message,
      });
    }

    if (action === "buy-site-slot") {
      const slotPlanId = body.slotPlanId ? String(body.slotPlanId).trim() : null;
      const result = await buyExtraSiteSlotOnSite(user.id, slotPlanId);
      
      const fresh = publicUser(await getUserById(user.id));
      const sitesUsed = await countSitesByOwner(user.id);
      const liveSites = await countLiveSitesByOwner(user.id);
      const purchasedAddonIds = await listPaidAddonIds(user.id);
      const cardOnFile = await fetchCardOnFile(fresh);
      const billing = billingPublicFields(fresh, { sitesUsed, liveSites, purchasedAddonIds, cardOnFile });
      
      return NextResponse.json({
        user: fresh,
        billing,
        invoice: result.invoice,
        invoiceUrl: result.invoice?.id ? `/invoice/${result.invoice.id}` : null,
        slotPlanId: result.slotPlanId,
        invoices: await listInvoicesForUser(user.id),
        promptCreateSite: Boolean(billing?.canCreateSite),
        message: result.message,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Charge failed" }, { status: 400 });
  }
}
