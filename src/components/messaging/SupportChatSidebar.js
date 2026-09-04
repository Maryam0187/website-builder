"use client";

import { useCallback, useEffect, useState } from "react";
import MessageThread from "@/components/messaging/MessageThread";
import MessageComposer from "@/components/messaging/MessageComposer";

export default function SupportChatSidebar({ open, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/conversations/mine");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not open chat");
      setData(json);
    } catch (err) {
      setError(err.message || "Could not open chat");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    load();
    const timer = setInterval(load, 8000);
    return () => clearInterval(timer);
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function send({ body, images }) {
    if (!data?.conversation?.id) throw new Error("Chat not ready");
    const res = await fetch(`/api/conversations/${data.conversation.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, images }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to send");
    await load();
  }

  if (!open) return null;

  const title = data?.conversation?.websiteName || data?.conversation?.name || "Support";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close chat"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside
        className="relative flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#07122a] shadow-2xl shadow-black/50"
        role="dialog"
        aria-modal="true"
        aria-label="Support chat"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-4 text-white">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-cyan-200/80 uppercase">
              Support chat
            </p>
            <h2 className="mt-1 truncate text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-xs text-blue-100/80">
              Ask about custom services, plans, or anything not listed.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/15 px-3 py-1.5 text-sm text-blue-100 hover:bg-white/5 hover:text-white"
          >
            Close
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col bg-white text-zinc-900">
          {loading && !data ? (
            <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
              Opening chat…
            </div>
          ) : error ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-sm text-red-600">{error}</p>
              <button
                type="button"
                onClick={load}
                className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <MessageThread messages={data?.messages || []} />
              </div>
              <MessageComposer
                onSend={send}
                placeholder="Tell us what you need — custom quote, extra sites, design help…"
              />
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
