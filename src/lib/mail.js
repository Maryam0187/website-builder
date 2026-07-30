const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function sendEmail({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || "Technonaire Easy Website <onboarding@resend.dev>";

  if (!apiKey) {
    console.log("\n========== EMAIL (dev — set RESEND_API_KEY to send) ==========");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log(text || html);
    console.log("============================================================\n");
    return { ok: true, mocked: true };
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from,
    to: [to],
    subject,
    html,
    text,
  });

  if (result.error) {
    throw new Error(result.error.message || "Failed to send email");
  }

  return { ok: true, id: result.data?.id };
}

/** Guest verification: send the same chat token link by email. */
export async function sendChatLinkEmail({ to, name, accessToken }) {
  const base = appUrl();
  const chatUrl = `${base}/messages?token=${encodeURIComponent(accessToken)}`;
  const subject = "Your Technonaire chat link — open to continue";

  const text = [
    `Hi ${name || "there"},`,
    ``,
    `Thanks for messaging Technonaire Easy Website.`,
    `Open this private chat link to continue (and to verify your email):`,
    ``,
    chatUrl,
    ``,
    `Bookmark it or keep this email — you will need it to return to your conversation.`,
    ``,
    `— Technonaire`,
  ].join("\n");

  const html = `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#14201c;line-height:1.6">
      <p style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#0b3d91;font-weight:700">Technonaire</p>
      <h1 style="font-size:24px;margin:8px 0 16px">Your private chat link</h1>
      <p>Hi ${escapeHtml(name || "there")},</p>
      <p>Thanks for messaging us. Open the link below to continue your chat and verify your email.</p>
      <p>
        <a href="${chatUrl}" style="display:inline-block;background:#0b3d91;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:600">
          Open my chat
        </a>
      </p>
      <p style="font-size:13px;color:#5c6b64;word-break:break-all">${chatUrl}</p>
      <p style="color:#5c6b64;font-size:14px">Keep this email — the same link is how you return to your conversation.</p>
    </div>
  `;

  return sendEmail({ to, subject, html, text });
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
