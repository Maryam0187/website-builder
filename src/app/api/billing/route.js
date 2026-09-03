import { NextResponse } from "next/server";
import {
  denyIfMustChangePassword,
  getUserById,
  publicUser,
  requireUser,
} from "@/lib/auth";
import {
  billingPublicFields,
  buyExtraSiteSlot,
  cancelSubscription,
  createBillingPortal,
  createStripeAddonCheckout,
  createStripeCheckout,
  listInvoicesForUser,
  listPaidAddonIds,
  markInvoicePaid,
  subscribeManual,
  syncCheckoutSession,
} from "@/lib/billing";
import { isStripeConfigured } from "@/lib/stripe";
import { countLiveSitesByOwner, countSitesByOwner } from "@/lib/store-actions";

async function billingForUser(user) {
  const fresh = publicUser(await getUserById(user.id));
  const sitesUsed = user.role === "owner" ? await countSitesByOwner(user.id) : 0;
  const liveSites = user.role === "owner" ? await countLiveSitesByOwner(user.id) : 0;
  const purchasedAddonIds = user.role === "owner" ? await listPaidAddonIds(user.id) : [];
  return {
    user: fresh,
    billing: billingPublicFields(fresh, { sitesUsed, liveSites, purchasedAddonIds }),
  };
}

export async function GET() {
  const user = await requireUser(["admin", "owner"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { user: fresh, billing } = await billingForUser(user);
  return NextResponse.json({
    user: fresh,
    billing,
    invoices: await listInvoicesForUser(user.id),
  });
}

export async function POST(request) {
  const user = await requireUser(["admin", "owner"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const blocked = denyIfMustChangePassword(user);
  if (blocked) return blocked;

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "").trim();

  try {
    if (action === "start-trial") {
      return NextResponse.json(
        { error: "Free trial is not available. Subscribe to Starter, Custom, Domain, or Pro to go live." },
        { status: 400 },
      );
    }

    if (action === "subscribe" || action === "checkout") {
      if (user.role !== "owner") {
        return NextResponse.json({ error: "Only owners can subscribe" }, { status: 403 });
      }
      const planId = String(body.planId || "starter").trim();

      if (isStripeConfigured()) {
        const result = await createStripeCheckout(user.id, planId);
        if (result.upgraded) {
          return NextResponse.json({
            upgraded: true,
            user: result.user,
            billing: result.billing,
            invoice: result.invoice,
            plan: result.plan,
            differenceCents: result.differenceCents,
            invoices: await listInvoicesForUser(user.id),
            message: result.message,
          });
        }
        return NextResponse.json({
          checkoutUrl: result.url,
          sessionId: result.sessionId,
          invoice: result.invoice,
          plan: result.plan,
          invoices: await listInvoicesForUser(user.id),
          message: "Redirecting to Stripe Checkout…",
        });
      }

      const result = await subscribeManual(user.id, planId);
      return NextResponse.json({
        user: result.user,
        billing: billingPublicFields(result.user),
        invoice: result.invoice,
        plan: result.plan,
        invoices: await listInvoicesForUser(user.id),
        message: `${result.plan?.name || "Plan"} started (USD). Open your invoice to pay.`,
        invoiceUrl: result.invoice?.id ? `/invoice/${result.invoice.id}` : null,
      });
    }

    if (action === "buy-site-slot") {
      if (user.role !== "owner") {
        return NextResponse.json({ error: "Only owners can buy extra slots" }, { status: 403 });
      }
      if (!isStripeConfigured()) {
        return NextResponse.json({ error: "Stripe is not configured" }, { status: 400 });
      }
      const slotPlanId = body.slotPlanId ? String(body.slotPlanId).trim() : null;
      const result = await buyExtraSiteSlot(user.id, slotPlanId);
      return NextResponse.json({
        checkoutUrl: result.url,
        sessionId: result.sessionId,
        message: "Redirecting to Stripe to add your second website…",
      });
    }

    if (action === "buy-addon") {
      if (user.role !== "owner") {
        return NextResponse.json({ error: "Only owners can buy add-ons" }, { status: 403 });
      }
      const addonId = String(body.addonId || "").trim();
      if (!isStripeConfigured()) {
        return NextResponse.json({ error: "Stripe is not configured" }, { status: 400 });
      }
      const result = await createStripeAddonCheckout(user.id, addonId);
      return NextResponse.json({
        checkoutUrl: result.url,
        sessionId: result.sessionId,
        invoice: result.invoice,
        addon: result.addon,
        invoices: await listInvoicesForUser(user.id),
        message: "Redirecting to Stripe for one-time payment…",
      });
    }

    if (action === "sync-checkout") {
      if (user.role !== "owner") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const sessionId = String(body.sessionId || "").trim();
      if (!sessionId) {
        return NextResponse.json({ error: "sessionId required" }, { status: 400 });
      }
      const result = await syncCheckoutSession(sessionId);
      if (!result.ok) {
        return NextResponse.json({ error: "Payment not completed yet" }, { status: 400 });
      }
      const sitesUsed = await countSitesByOwner(user.id);
      const liveSites = await countLiveSitesByOwner(user.id);
      return NextResponse.json({
        user: result.user,
        billing: billingPublicFields(result.user, { sitesUsed, liveSites }),
        invoices: result.invoices,
        message:
          result.kind === "addon" || result.kind === "payment"
            ? "Payment confirmed — website slots added."
            : "Payment confirmed — package activated.",
      });
    }

    if (action === "portal") {
      if (user.role !== "owner") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const result = await createBillingPortal(user.id);
      return NextResponse.json({ portalUrl: result.url });
    }

    if (action === "cancel") {
      if (user.role !== "owner") {
        return NextResponse.json({ error: "Only owners can cancel" }, { status: 403 });
      }
      const updated = await cancelSubscription(user.id);
      return NextResponse.json({
        user: updated,
        billing: billingPublicFields(updated),
        invoices: await listInvoicesForUser(user.id),
        message: "Subscription will cancel at period end. You keep access until then.",
      });
    }

    if (action === "mark-invoice-paid") {
      if (user.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const invoiceId = body.invoiceId;
      if (!invoiceId) {
        return NextResponse.json({ error: "invoiceId required" }, { status: 400 });
      }
      const result = await markInvoicePaid(invoiceId, { adminUserId: user.id });
      const owner = publicUser(await getUserById(result.invoice.userId));
      return NextResponse.json({
        invoice: result.invoice,
        user: owner,
        billing: billingPublicFields(owner),
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Billing action failed" }, { status: 400 });
  }
}
