import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/mail";

const DEFAULT_TO = "info@technonaire.com";

export async function POST(request) {
  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const message = String(body.message || "").trim();
    const bookMeeting = Boolean(body.bookMeeting);
    const siteName = String(body.siteName || "").trim();
    const siteSlug = String(body.siteSlug || "").trim();
    const toEmail = String(body.toEmail || DEFAULT_TO).trim().toLowerCase() || DEFAULT_TO;

    if (!name || name.length < 2) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }
    if (!message || message.length < 5) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const kind = bookMeeting ? "Meeting request" : "Contact form";
    const subject = `${kind}: ${name}${siteName ? ` — ${siteName}` : ""}`;
    const text = [
      kind,
      ``,
      `From: ${name} <${email}>`,
      siteName ? `Website: ${siteName}` : null,
      siteSlug ? `Slug: /${siteSlug}` : null,
      ``,
      message,
    ]
      .filter(Boolean)
      .join("\n");

    const html = `
      <div style="font-family:system-ui,sans-serif;line-height:1.5;color:#14201c">
        <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#5c6b64">${kind}</p>
        <p style="margin:0 0 4px"><strong>${escapeHtml(name)}</strong> &lt;${escapeHtml(email)}&gt;</p>
        ${siteName ? `<p style="margin:0 0 4px">Website: ${escapeHtml(siteName)}</p>` : ""}
        ${siteSlug ? `<p style="margin:0 0 16px">Slug: /${escapeHtml(siteSlug)}</p>` : ""}
        <p style="margin:0;white-space:pre-wrap">${escapeHtml(message)}</p>
      </div>
    `;

    await sendEmail({
      to: toEmail,
      subject,
      text,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to send message" },
      { status: 500 },
    );
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
