const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function sendEmail({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || "Technonaire Easy Website <onboarding@resend.dev>";
  const isProd = process.env.NODE_ENV === "production";

  if (!apiKey) {
    if (isProd) {
      throw new Error(
        "Email is not configured. Set RESEND_API_KEY (and MAIL_FROM) on the server.",
      );
    }
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

const COMPANY_NAME = "Technonaire";
const COMPANY_TAGLINE =
  "Websites, CRM & growth systems — built for you, without the technical headache.";
const AGENCY_URL = () => process.env.NEXT_PUBLIC_TECHNONAIRE_URL || "https://technonaire.com";

/** Guest verification: send the same chat token link by email. */
export async function sendChatLinkEmail({ to, name, accessToken }) {
  const base = appUrl();
  const chatUrl = `${base}/messages?token=${encodeURIComponent(accessToken)}`;
  const logoUrl = `${base}/email-logo.png`;
  const siteUrl = AGENCY_URL();
  const subject = "Your Technonaire chat link — open to continue";
  const greetingName = escapeHtml(name || "there");

  const text = [
    `Hi ${name || "there"},`,
    ``,
    `Thanks for messaging Technonaire Easy Website.`,
    `Open this private chat link to continue (and to verify your email):`,
    ``,
    chatUrl,
    ``,
    `Keep this email — the same link is how you return to your conversation.`,
    ``,
    `— ${COMPANY_NAME}`,
    COMPANY_TAGLINE,
    siteUrl,
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#eef2f7;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef2f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 28px rgba(4,11,26,0.08);">
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#0891b2,#2563eb);font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:36px 36px 28px;font-family:Georgia,'Times New Roman',serif;color:#14201c;">
              <p style="margin:0 0 6px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#0b3d91;font-weight:700;">
                Easy Website
              </p>
              <h1 style="margin:0 0 20px;font-size:26px;line-height:1.25;font-weight:700;color:#040b1a;">
                Your private chat link
              </h1>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.65;color:#1a2a24;">
                Hi ${greetingName},
              </p>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.65;color:#33443d;">
                Thanks for messaging us. Open the link below to continue your chat and verify your email.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
                <tr>
                  <td style="border-radius:999px;background:#0b3d91;">
                    <a href="${chatUrl}" style="display:inline-block;padding:14px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Open my chat
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;line-height:1.5;color:#7a8a83;word-break:break-all;">
                Or paste this link:<br />
                <a href="${chatUrl}" style="color:#0b3d91;text-decoration:underline;">${chatUrl}</a>
              </p>
              <p style="margin:20px 0 0;font-size:14px;line-height:1.55;color:#5c6b64;">
                Keep this email — the same link is how you return to your conversation.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 36px;">
              <div style="border-top:1px solid #e4eaf1;font-size:0;line-height:0;">&nbsp;</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 36px 36px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 0 14px;">
                    <a href="${siteUrl}" style="text-decoration:none;">
                      <img src="${logoUrl}" alt="Technonaire" width="140" height="76" style="display:block;border:0;outline:none;width:140px;height:auto;max-width:140px;" />
                    </a>
                  </td>
                </tr>
                <tr>
                  <td>
                    <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#040b1a;letter-spacing:-0.01em;">
                      ${COMPANY_NAME}
                    </p>
                    <p style="margin:0 0 10px;font-size:13px;line-height:1.5;color:#5c6b64;max-width:360px;">
                      ${COMPANY_TAGLINE}
                    </p>
                    <p style="margin:0;">
                      <a href="${siteUrl}" style="font-size:13px;font-weight:600;color:#0b3d91;text-decoration:none;">
                        technonaire.com →
                      </a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <p style="margin:20px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:11px;line-height:1.5;color:#8a97a3;">
          You’re receiving this because you started a chat with Technonaire Easy Website.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
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
