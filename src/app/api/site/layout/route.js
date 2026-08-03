import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { addMessage, setSiteLayout } from "@/lib/store-actions";

export async function POST(request) {
  const user = await requireUser(["admin"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const siteId = body.siteId;
  const layout = body.layout === "one-page" ? "one-page" : "multi-page";
  const notify = body.notify !== false;

  if (!siteId) {
    return NextResponse.json({ error: "siteId is required" }, { status: 400 });
  }

  try {
    const site = await setSiteLayout(siteId, layout);
    const layoutLabel = layout === "one-page" ? "one-page (scroll)" : "multi-page";

    if (notify && site.conversationId) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const note =
        layout === "one-page"
          ? `Your site is now one page — Home, About, Contact (and any other sections) scroll together. Use the menu to jump to a section.`
          : `Your site is now multi-page — each menu item opens its own page. Use the menu to switch pages.`;

      await addMessage({
        conversationId: site.conversationId,
        sender: "admin",
        body: [
          `We updated your site layout to ${layoutLabel}, as requested.`,
          ``,
          note,
          ``,
          `Preview: ${appUrl}/site/${site.slug}`,
          `Edit: ${appUrl}/edit`,
          ``,
          `Message us if you want to switch back or need other changes.`,
        ].join("\n"),
        system: true,
      });
    }

    return NextResponse.json({ site, layout });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to update layout" }, { status: 400 });
  }
}
