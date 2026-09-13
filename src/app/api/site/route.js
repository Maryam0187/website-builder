import { NextResponse } from "next/server";
import {
  denyIfMustChangePassword,
  getUserById,
  publicUser,
  requireUser,
} from "@/lib/auth";
import {
  createDraftFromConversation,
  createOwnerSite,
  addMessage,
  deleteSite,
  getSiteById,
  listSites,
  listSitesByOwner,
  ownerOwnsSite,
  setActiveSiteForOwner,
  sitePublicUrl,
  updateSiteContent,
} from "@/lib/store-actions";
import { setOwnerSiteLive } from "@/lib/billing";

function withLiveUrl(site) {
  if (!site) return site;
  return { 
    ...site, 
    liveUrl: sitePublicUrl(site),
    // Include domain fields for UI
    customDomain: site.customDomain || null,
    domainStatus: site.domainStatus || "none",
    domainVerifiedAt: site.domainVerifiedAt || null,
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("id");
  const slug = searchParams.get("slug");

  if (slug) {
    const user = await requireUser(["admin", "owner"]);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const blocked = denyIfMustChangePassword(user);
    if (blocked) return blocked;

    const { getSiteBySlug } = await import("@/lib/store-actions");
    const site = await getSiteBySlug(slug);
    if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (user.role === "owner" && !ownerOwnsSite(user, site)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ site: withLiveUrl(site) });
  }

  const user = await requireUser(["admin", "owner"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const blocked = denyIfMustChangePassword(user);
  if (blocked) return blocked;

  if (siteId) {
    const site = await getSiteById(siteId);
    if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (user.role === "owner" && !ownerOwnsSite(user, site)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ site: withLiveUrl(site) });
  }

  if (user.role === "admin") {
    return NextResponse.json({ sites: await listSites() });
  }

  const sites = (await listSitesByOwner(user.id)).map(withLiveUrl);
  return NextResponse.json({
    sites,
    activeSiteId: user.siteId || null,
  });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "").trim();

  // Owner: create / switch / go-live / take-offline
  if (
    action === "create-site" ||
    action === "switch-site" ||
    action === "go-live" ||
    action === "take-offline" ||
    action === "rename-site"
  ) {
    const user = await requireUser(["owner"]);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const blocked = denyIfMustChangePassword(user);
    if (blocked) return blocked;

    try {
      if (action === "create-site") {
        const site = await createOwnerSite(user.id, {
          brandName: body.brandName,
          template: body.template,
          planId: body.planId || "free",
        });
        const fresh = publicUser(await getUserById(user.id));
        const sites = await listSitesByOwner(user.id);
        return NextResponse.json({
          site,
          user: fresh,
          sites,
          message: "New website created. You can switch templates on this site anytime.",
        });
      }

      if (action === "go-live" || action === "take-offline") {
        const siteId = body.siteId;
        if (!siteId) {
          return NextResponse.json({ error: "siteId required" }, { status: 400 });
        }
        const result = await setOwnerSiteLive(user.id, siteId, action === "go-live");
        const sites = (await listSitesByOwner(user.id)).map(withLiveUrl);
        return NextResponse.json({
          ...result,
          site: withLiveUrl(result.site),
          sites,
        });
      }

      if (action === "rename-site") {
        const siteId = body.siteId;
        const brandName = String(body.brandName || body.name || "").trim();
        if (!siteId) {
          return NextResponse.json({ error: "siteId required" }, { status: 400 });
        }
        if (!brandName || brandName.length < 2) {
          return NextResponse.json({ error: "Website name must be at least 2 characters" }, { status: 400 });
        }
        const site = await getSiteById(siteId);
        if (!site || !ownerOwnsSite(user, site)) {
          return NextResponse.json({ error: "Site not found" }, { status: 404 });
        }
        const content = structuredClone(site.content || {});
        if (!content.brand || typeof content.brand !== "object") content.brand = {};
        content.brand.name = brandName;
        const updated = await updateSiteContent(siteId, content);
        const sites = await listSitesByOwner(user.id);
        return NextResponse.json({
          site: updated,
          sites,
          message: "Website name updated",
        });
      }

      const siteId = body.siteId;
      if (!siteId) {
        return NextResponse.json({ error: "siteId required" }, { status: 400 });
      }
      const site = await setActiveSiteForOwner(user.id, siteId);
      const fresh = publicUser(await getUserById(user.id));
      const sites = await listSitesByOwner(user.id);
      return NextResponse.json({ site, user: fresh, sites, message: "Switched website." });
    } catch (error) {
      return NextResponse.json(
        { error: error.message || "Site action failed" },
        { status: 400 },
      );
    }
  }

  const user = await requireUser(["admin"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversationId = body.conversationId;
  const brandName = String(body.brandName || "").trim();
  const ownerEmail = String(body.ownerEmail || "").trim();
  const ownerPassword = String(body.ownerPassword || "").trim();
  const phone = String(body.phone || "").trim();
  const address = String(body.address || "").trim();
  // Local + niche drafts are one-page; admin can still switch layout later if needed
  const layout = "one-page";
  const template = body.template ? String(body.template).trim() : undefined;
  const businessType = body.businessType ? String(body.businessType).trim() : undefined;

  if (!conversationId || !brandName || !ownerEmail || !ownerPassword) {
    return NextResponse.json(
      { error: "conversationId, brandName, ownerEmail, and ownerPassword are required" },
      { status: 400 },
    );
  }

  try {
    const draft = await createDraftFromConversation({
      conversationId,
      brandName,
      ownerEmail,
      ownerPassword,
      phone,
      address,
      layout,
      template,
      businessType,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteBody = [
      `Your first draft is ready.`,
      ``,
      `Login (required for preview and edit): ${appUrl}/login`,
      `Email: ${draft.ownerEmail}`,
      `Temporary password: ${draft.ownerPassword}`,
      ``,
      `On first login you’ll be asked to choose a new password.`,
      ``,
      `After that:`,
      `• Preview: ${appUrl}/site/${draft.slug}`,
      `• Edit: ${appUrl}/edit`,
      ``,
      `Your site is one page — Home, About, and other sections scroll together. The menu jumps to each section.`,
      `Change text and photos yourself. Message us here if you want another navbar section or design/UI changes.`,
    ].join("\n");

    await addMessage({
      conversationId,
      sender: "admin",
      body: inviteBody,
      system: true,
    });

    return NextResponse.json({ draft });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to create draft" }, { status: 400 });
  }
}

export async function PUT(request) {
  const user = await requireUser(["admin", "owner"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const blocked = denyIfMustChangePassword(user);
  if (blocked) return blocked;

  const body = await request.json();
  const siteId = body.siteId;
  const content = body.content;

  if (!siteId || !content) {
    return NextResponse.json({ error: "siteId and content required" }, { status: 400 });
  }

  const site = await getSiteById(siteId);
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role === "owner" && !ownerOwnsSite(user, site)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await updateSiteContent(siteId, content);
  return NextResponse.json({ site: updated });
}

export async function DELETE(request) {
  const user = await requireUser(["admin"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  let siteId = searchParams.get("id");

  if (!siteId) {
    try {
      const body = await request.json();
      siteId = body.siteId;
    } catch {
      // no body
    }
  }

  if (!siteId) {
    return NextResponse.json({ error: "siteId required" }, { status: 400 });
  }

  try {
    const deleted = await deleteSite(siteId);
    return NextResponse.json({ ok: true, deleted });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to delete site" }, { status: 400 });
  }
}
