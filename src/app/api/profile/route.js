import { NextResponse } from "next/server";
import {
  denyIfMustChangePassword,
  getCurrentUser,
  getUserById,
  publicUser,
  requireUser,
  updateUserPayment,
  updateUserProfile,
} from "@/lib/auth";
import { billingPublicFields, fetchCardOnFile, listInvoicesForUser, listPaidAddonIds } from "@/lib/billing";
import {
  countLiveSitesByOwner,
  countSitesByOwner,
  getSiteById,
  listSitesByOwner,
  sitePublicUrl,
} from "@/lib/store-actions";
import { getTemplate } from "@/lib/templates";
import { REGIONS, detectRegionFromHeaders } from "@/lib/pricing";

function mapOwnerSite(s) {
  return {
    id: s.id,
    slug: s.slug,
    subdomain: s.subdomain || null,
    customDomain: s.customDomain || null,
    domainStatus: s.domainStatus || "none",
    domainVerifiedAt: s.domainVerifiedAt || null,
    liveUrl: sitePublicUrl(s),
    name: s.content?.brand?.name || s.slug,
    status: s.status,
    template: s.content?.template || "other",
    templateLabel: getTemplate(s.content?.template || "other").label,
    planId: s.planId || "free",
  };
}

export async function GET(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let fresh = publicUser(await getUserById(user.id));
  
  // Auto-detect and set region on first load if not already set
  if (!fresh.region) {
    const detectedRegion = detectRegionFromHeaders(request.headers);
    if (detectedRegion && detectedRegion !== 'usa') {
      const { query } = await import("@/lib/db");
      await query(
        `UPDATE users SET region = $1 WHERE id = $2`,
        [detectedRegion, user.id]
      );
      fresh.region = detectedRegion;
    } else {
      fresh.region = 'usa'; // default
    }
  }
  
  let site = null;
  if (user.siteId) {
    site = await getSiteById(user.siteId);
  }

  const sitesUsed = user.role === "owner" ? await countSitesByOwner(user.id) : 0;
  const liveSites = user.role === "owner" ? await countLiveSitesByOwner(user.id) : 0;
  const purchasedAddonIds = user.role === "owner" ? await listPaidAddonIds(user.id) : [];
  const cardOnFile = user.role === "owner" ? await fetchCardOnFile(fresh) : null;
  const ownerSites =
    user.role === "owner"
      ? (await listSitesByOwner(user.id)).map(mapOwnerSite)
      : [];

  return NextResponse.json({
    user: fresh,
    billing: billingPublicFields(fresh, { sitesUsed, liveSites, purchasedAddonIds, cardOnFile }),
    invoices: await listInvoicesForUser(user.id),
    sites: ownerSites,
    site: site ? mapOwnerSite(site) : null,
  });
}

export async function PATCH(request) {
  const user = await requireUser(["admin", "owner"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const blocked = denyIfMustChangePassword(user);
  if (blocked) return blocked;

  const body = await request.json();
  const action = String(body.action || "profile").trim();

  try {
    if (action === "profile") {
      const updated = await updateUserProfile(user.id, { name: body.name });
      return NextResponse.json({ user: updated });
    }

    if (action === "update-region") {
      // Allow region change only if not locked
      const fresh = await getUserById(user.id);
      if (fresh.regionLocked) {
        return NextResponse.json(
          { error: "Region is locked after first subscription. Contact support to change." },
          { status: 400 }
        );
      }
      
      const newRegion = String(body.region || "").toLowerCase().trim();
      if (!REGIONS[newRegion.toUpperCase()]) {
        return NextResponse.json({ error: "Invalid region" }, { status: 400 });
      }
      
      const { query } = await import("@/lib/db");
      await query(
        `UPDATE users SET region = $1 WHERE id = $2`,
        [newRegion, user.id]
      );
      
      const updated = publicUser(await getUserById(user.id));
      return NextResponse.json({ user: updated });
    }

    if (action === "payment-note") {
      // Owner requests invoice / marks payment in progress
      const note = String(body.paymentNote || "").trim();
      if (!note) {
        return NextResponse.json({ error: "Add a short payment note" }, { status: 400 });
      }
      const updated = await updateUserPayment(user.id, {
        paymentStatus: user.paymentStatus === "paid" ? "paid" : "pending",
        paymentNote: note,
      });
      return NextResponse.json({ user: updated });
    }

    if (action === "payment-admin") {
      if (user.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const targetId = body.userId;
      if (!targetId) {
        return NextResponse.json({ error: "userId is required" }, { status: 400 });
      }
      const target = await getUserById(targetId);
      if (!target || target.role !== "owner") {
        return NextResponse.json({ error: "Owner not found" }, { status: 404 });
      }
      const updated = await updateUserPayment(target.id, {
        paymentStatus: body.paymentStatus,
        paymentPlan: body.paymentPlan,
        paymentAmount: body.paymentAmount,
        paymentNote: body.paymentNote,
      });
      return NextResponse.json({ user: updated });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Update failed" }, { status: 400 });
  }
}
