import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { addSitePage, addMessage } from "@/lib/store-actions";
import { ADDABLE_PAGE_TYPES } from "@/lib/site-defaults";

export async function GET() {
  const user = await requireUser(["admin"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ types: ADDABLE_PAGE_TYPES });
}

export async function POST(request) {
  const user = await requireUser(["admin"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const siteId = body.siteId;
  const type = String(body.type || "content").trim();
  const label = String(body.label || "").trim();
  const pageId = body.pageId ? String(body.pageId).trim() : undefined;
  const notify = body.notify !== false;

  if (!siteId || !type) {
    return NextResponse.json({ error: "siteId and type are required" }, { status: 400 });
  }

  try {
    const site = await addSitePage(siteId, { type, label, pageId });
    const added = site.content.nav[site.content.nav.length - 1];

    if (notify && site.conversationId && added) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const previewPath =
        added.pageId === "home"
          ? `${appUrl}/site/${site.slug}`
          : `${appUrl}/site/${site.slug}/${added.pageId}`;
      await addMessage({
        conversationId: site.conversationId,
        sender: "admin",
        body: [
          `We added a new page: ${added.label}.`,
          ``,
          `Preview: ${previewPath}`,
          `Edit: ${appUrl}/edit?page=${added.pageId}`,
          ``,
          `You can update the text and photos yourself. Message us if you want more pages or layout changes.`,
        ].join("\n"),
        system: true,
      });
    }

    return NextResponse.json({ site, page: added });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to add page" }, { status: 400 });
  }
}
