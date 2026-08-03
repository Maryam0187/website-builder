import { NextResponse } from "next/server";
import {
  addMessage,
  getConversation,
  getConversationByToken,
  markConversationRead,
} from "@/lib/store-actions";
import { denyIfMustChangePassword, requireUser } from "@/lib/auth";
import { toInt } from "@/lib/db";

function sameId(a, b) {
  const left = toInt(a);
  const right = toInt(b);
  return left != null && right != null && left === right;
}

export async function GET(request, { params }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  const user = await requireUser(["admin", "owner"]);
  if (user?.role === "admin") {
    const data = await getConversation(id);
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await markConversationRead(id);
    return NextResponse.json(data);
  }

  if (token) {
    const data = await getConversationByToken(token);
    if (!data || !sameId(data.conversation.id, id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(data);
  }

  if (user?.role === "owner") {
    const blocked = denyIfMustChangePassword(user);
    if (blocked) return blocked;
    const data = await getConversation(id);
    if (!data || !sameId(data.conversation.siteId, user.siteId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(request, { params }) {
  const { id } = await params;
  const body = await request.json();
  const messageBody = String(body.body || "").trim();
  const images = Array.isArray(body.images) ? body.images.slice(0, 8) : [];
  const token = body.token || null;

  if (!messageBody && images.length === 0) {
    return NextResponse.json({ error: "Message or image required" }, { status: 400 });
  }

  const user = await requireUser(["admin", "owner"]);

  if (user?.role === "admin") {
    const data = await getConversation(id);
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const message = await addMessage({
      conversationId: id,
      sender: "admin",
      body: messageBody,
      images,
    });
    return NextResponse.json({ message });
  }

  if (user?.role === "owner") {
    const blocked = denyIfMustChangePassword(user);
    if (blocked) return blocked;
    const data = await getConversation(id);
    if (!data || !sameId(data.conversation.siteId, user.siteId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const message = await addMessage({
      conversationId: id,
      sender: "owner",
      body: messageBody,
      images,
    });
    return NextResponse.json({ message });
  }

  if (token) {
    const data = await getConversationByToken(token);
    if (!data || !sameId(data.conversation.id, id)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const message = await addMessage({
      conversationId: id,
      sender: "guest",
      body: messageBody,
      images,
    });
    return NextResponse.json({ message });
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
