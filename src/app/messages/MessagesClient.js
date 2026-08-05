"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import MessageThread from "@/components/messaging/MessageThread";
import MessageComposer from "@/components/messaging/MessageComposer";
import ChatOnboarding from "@/components/messaging/ChatOnboarding";
import BrandLogo from "@/components/BrandLogo";

const GUEST_TOKEN_KEY = "tn_guest_chat_token";

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [data, setData] = useState(null);
  const [onboarding, setOnboarding] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!token) {
      setError("Missing conversation link. Start from Message us on the home page.");
      return;
    }
    try {
      localStorage.setItem(GUEST_TOKEN_KEY, token);
    } catch {
      /* ignore */
    }
    const res = await fetch(`/api/conversations?token=${encodeURIComponent(token)}`);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Could not load conversation");
      return;
    }
    setData(json);
    setOnboarding(json.onboarding || null);
  }, [token]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 8000);
    return () => clearInterval(timer);
  }, [load]);

  async function send({ body, images }) {
    const res = await fetch(`/api/conversations/${data.conversation.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, images, token }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to send");
    await load();
  }

  function handleOnboardingAnswer(result) {
    setData(result);
    setOnboarding(result.onboarding || null);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#040b1a] px-6 text-white">
        <div className="max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-red-300">{error}</p>
          <Link href="/" className="mt-4 inline-block text-cyan-200 underline">
            Go home
          </Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07122a] text-blue-100">
        Loading your chat…
      </div>
    );
  }

  const showOnboarding = Boolean(onboarding);

  return (
    <div className="flex min-h-screen flex-col bg-[#07122a] text-zinc-900">
      <header className="border-b border-white/10 bg-[#040b1a] px-4 py-4 text-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
          <div>
            <BrandLogo href="/" subtitle="Guest chat" compact />
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-xl font-semibold">
              {data.conversation.websiteName || data.conversation.name}
            </h1>
            <p className="mt-1 text-xs text-blue-100">
              {data.conversation.emailVerified ? "Email verified · " : ""}
              {showOnboarding
                ? "Answer the assistant questions below — then your sample draft is created."
                : data.conversation.siteId
                  ? "Your sample site login is in this chat. Bookmark this link."
                  : "Bookmark this link or keep the email."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.conversation.siteId && (
              <Link
                href="/login"
                className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold"
              >
                Login to edit site
              </Link>
            )}
            <button
              type="button"
              onClick={copyLink}
              className="rounded-full border border-white/20 px-4 py-2 text-sm hover:bg-white/5"
            >
              {copied ? "Link copied" : "Copy chat link"}
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden bg-white shadow-2xl shadow-black/30 md:my-6 md:rounded-3xl md:border md:border-zinc-200">
        <MessageThread messages={data.messages} />
        {showOnboarding ? (
          <ChatOnboarding prompt={onboarding} token={token} onAnswered={handleOnboardingAnswer} />
        ) : (
          <MessageComposer
            onSend={send}
            placeholder="Message us anytime about design or changes…"
          />
        )}
      </div>
    </div>
  );
}
