import { NextResponse } from "next/server";
import {
  createConversation,
  listConversations,
  getConversationByToken,
  markConversationEmailVerified,
} from "@/lib/store-actions";
import { requireUser } from "@/lib/auth";
import { sendChatLinkEmail } from "@/lib/mail";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (token) {
    const data = await getConversationByToken(token);
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await markConversationEmailVerified(token);
    const refreshed = await getConversationByToken(token);
    return NextResponse.json(refreshed);
  }

  const user = await requireUser(["admin"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversations = await listConversations();
  return NextResponse.json({ conversations });
}

export async function POST(request) {
  const body = await request.json();
  const name = String(body.name || "").trim();
  const email = String(body.email || "").toLowerCase().trim();
  const websiteName = String(body.websiteName || "").trim();
  const message = String(body.message || "").trim();
  const phone = String(body.phone || "").trim();
  const businessType = String(body.businessType || "").trim();
  const images = Array.isArray(body.images) ? body.images.slice(0, 8) : [];

  if (!name || !email || !websiteName || !message) {
    return NextResponse.json(
      { error: "Name, email, website name, and message are required" },
      { status: 400 },
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const result = await createConversation({
    name,
    email,
    websiteName,
    phone,
    businessType,
    message,
    images,
  });

  let emailSent = false;
  let emailMocked = false;
  try {
    const sent = await sendChatLinkEmail({
      to: email,
      name,
      accessToken: result.accessToken,
    });
    emailSent = true;
    emailMocked = Boolean(sent.mocked);
  } catch (error) {
    return NextResponse.json(
      {
        error: error.message || "Could not send chat link email. Try again.",
        conversationId: result.conversationId,
      },
      { status: 502 },
    );
  }

  // Do not return accessToken — guest must open the emailed link to verify email.
  return NextResponse.json({
    conversationId: result.conversationId,
    email: result.email,
    emailSent,
    emailMocked,
  });
}
