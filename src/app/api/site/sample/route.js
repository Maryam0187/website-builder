import { NextResponse } from "next/server";
import { addMessage, createSampleSiteForGuest } from "@/lib/store-actions";

export async function POST(request) {
  const body = await request.json();
  const accessToken = String(body.token || "").trim();
  const brandName = String(body.brandName || "").trim();
  const address = String(body.address || "").trim();
  const layout = "one-page";

  if (!accessToken) {
    return NextResponse.json({ error: "Chat token is required" }, { status: 400 });
  }
  if (!brandName) {
    return NextResponse.json({ error: "Business name is required" }, { status: 400 });
  }

  try {
    const draft = await createSampleSiteForGuest({
      accessToken,
      brandName,
      layout,
      address,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    await addMessage({
      conversationId: draft.conversationId,
      sender: "admin",
      body: [
        `Your sample website is ready to try.`,
        ``,
        `Login: ${appUrl}/login`,
        `Email: ${draft.ownerEmail}`,
        `Temporary password: ${draft.ownerPassword}`,
        ``,
        `On first login you’ll choose a new password.`,
        ``,
        `Preview: ${appUrl}/site/${draft.slug}`,
        `Edit: ${appUrl}/edit`,
        ``,
        `Your sample site is one page — sections scroll together and show in the menu.`,
        `Change text and photos yourself. Message us here if you want a custom design or another navbar section.`,
      ].join("\n"),
      system: true,
    });

    return NextResponse.json({
      draft: {
        siteId: draft.siteId,
        slug: draft.slug,
        ownerEmail: draft.ownerEmail,
        ownerPassword: draft.ownerPassword,
        layout: draft.layout,
        previewUrl: `${appUrl}/site/${draft.slug}`,
        loginUrl: `${appUrl}/login`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to create sample site" },
      { status: 400 },
    );
  }
}
