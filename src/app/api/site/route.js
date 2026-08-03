import { NextResponse } from "next/server";
import { denyIfMustChangePassword, requireUser } from "@/lib/auth";
import {
  createDraftFromConversation,
  addMessage,
  deleteSite,
  getSiteById,
  listSites,
  updateSiteContent,
} from "@/lib/store-actions";

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
    if (user.role === "owner" && site.id !== user.siteId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ site });
  }

  const user = await requireUser(["admin", "owner"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const blocked = denyIfMustChangePassword(user);
  if (blocked) return blocked;

  if (siteId) {
    const site = await getSiteById(siteId);
    if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (user.role === "owner" && site.id !== user.siteId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ site });
  }

  if (user.role === "admin") {
    return NextResponse.json({ sites: await listSites() });
  }

  const site = await getSiteById(user.siteId);
  return NextResponse.json({ sites: site ? [site] : [] });
}

export async function POST(request) {
  const user = await requireUser(["admin"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const conversationId = body.conversationId;
  const brandName = String(body.brandName || "").trim();
  const ownerEmail = String(body.ownerEmail || "").trim();
  const ownerPassword = String(body.ownerPassword || "").trim();
  const phone = String(body.phone || "").trim();
  const address = String(body.address || "").trim();
  const layout = body.layout === "one-page" ? "one-page" : "multi-page";

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
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const layoutNote =
      layout === "one-page"
        ? `Your site is one page — Home, About, and Contact scroll together. Use the menu to jump to a section.`
        : `Your site has separate pages: Home, About, and Contact. Use the menu to switch pages.`;
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
      layoutNote,
      `Change text and photos yourself. Message us here if you want more pages or design/UI changes.`,
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
  if (user.role === "owner" && site.id !== user.siteId) {
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
