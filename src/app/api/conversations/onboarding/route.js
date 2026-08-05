import { NextResponse } from "next/server";
import { answerChatBotOnboarding } from "@/lib/store-actions";

export async function POST(request) {
  const body = await request.json();
  const token = String(body.token || "").trim();
  const value = body.value != null ? String(body.value) : "";
  const text = body.text != null ? String(body.text) : "";

  if (!token) {
    return NextResponse.json({ error: "Chat token is required" }, { status: 400 });
  }

  try {
    const result = await answerChatBotOnboarding(token, { value, text });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message || "Could not save answer" }, { status: 400 });
  }
}
