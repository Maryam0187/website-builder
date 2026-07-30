"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MessageThread from "@/components/messaging/MessageThread";
import MessageComposer from "@/components/messaging/MessageComposer";
import BrandLogo from "@/components/BrandLogo";

export default function AdminInboxPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [thread, setThread] = useState(null);
  const [showDraft, setShowDraft] = useState(false);
  const [draftForm, setDraftForm] = useState({
    brandName: "",
    ownerEmail: "",
    ownerPassword: "",
    phone: "",
    address: "",
    layout: "multi-page",
  });
  const [status, setStatus] = useState("");

  const loadList = useCallback(async () => {
    const auth = await fetch("/api/auth").then((r) => r.json());
    if (!auth.user || auth.user.role !== "admin") {
      router.replace("/login");
      return;
    }
    const res = await fetch("/api/conversations");
    const data = await res.json();
    if (res.ok) setConversations(data.conversations || []);
  }, [router]);

  const loadThread = useCallback(async (id) => {
    const res = await fetch(`/api/conversations/${id}`);
    const data = await res.json();
    if (res.ok) {
      setThread(data);
      setDraftForm((prev) => ({
        ...prev,
        brandName: prev.brandName || data.conversation.websiteName || data.conversation.name || "",
        phone: prev.phone || data.conversation.phone || "",
      }));
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (activeId) loadThread(activeId);
  }, [activeId, loadThread]);

  async function send({ body, images }) {
    const res = await fetch(`/api/conversations/${activeId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, images }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed");
    await loadThread(activeId);
    await loadList();
  }

  async function createDraft(e) {
    e.preventDefault();
    setStatus("Creating draft…");
    const res = await fetch("/api/site", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: activeId, ...draftForm }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || "Failed");
      return;
    }
    setStatus(`Draft created: /site/${data.draft.slug} — invite posted in chat`);
    setShowDraft(false);
    await loadThread(activeId);
    await loadList();
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#070f1f] text-zinc-900 md:flex-row">
      <aside className="flex w-full flex-col border-b border-white/10 bg-[#040b1a] text-white md:w-84 md:max-w-sm md:border-r md:border-b-0 md:w-[22rem]">
        <div className="border-b border-white/10 px-5 py-4">
          <BrandLogo href="/admin" subtitle="Inbox" compact />
          <Link href="/admin" className="mt-3 inline-block text-xs font-medium text-cyan-200 hover:underline">
            ← Dashboard
          </Link>
          <p className="mt-2 text-xs text-blue-100">Guest chats and design screenshots</p>
        </div>
        <ul className="max-h-[38vh] flex-1 overflow-y-auto md:max-h-none">
          {conversations.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  setActiveId(c.id);
                  setStatus("");
                  setDraftForm({
                    brandName: c.websiteName || c.name || "",
                    ownerEmail: c.email || "",
                    ownerPassword: "",
                    phone: c.phone || "",
                    address: "",
                    layout: "multi-page",
                  });
                }}
                className={`w-full border-b border-white/5 px-5 py-4 text-left transition hover:bg-white/5 ${
                  activeId === c.id ? "bg-white/10" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{c.websiteName || c.name}</p>
                  {c.unreadForAdmin > 0 && (
                    <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-[#04101f]">
                      {c.unreadForAdmin}
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-xs text-blue-100">
                  {c.name}
                  {c.businessType ? ` · ${c.businessType}` : ""}
                  {c.lastMessage?.body ? ` · ${c.lastMessage.body}` : ""}
                </p>
                {c.siteId && (
                  <span className="mt-2 inline-flex rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                    Draft linked
                  </span>
                )}
              </button>
            </li>
          ))}
          {conversations.length === 0 && (
            <p className="p-5 text-sm text-blue-100">No conversations yet.</p>
          )}
        </ul>
      </aside>

      <section className="flex min-h-[60vh] flex-1 flex-col bg-white">
        {!activeId || !thread ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="font-[family-name:var(--font-display)] text-2xl text-zinc-800">Select a conversation</p>
            <p className="max-w-sm text-sm text-zinc-500">
              Reply to the guest, then create a draft and send invite credentials in chat.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">
                  {thread.conversation.websiteName || thread.conversation.name}
                </h2>
                <p className="text-xs text-zinc-500">
                  Contact: {thread.conversation.name}
                  {thread.conversation.email ? ` · ${thread.conversation.email}` : " · No email"}
                  {thread.conversation.emailVerified ? " · verified" : " · awaiting email open"}
                  {thread.conversation.businessType ? ` · ${thread.conversation.businessType}` : ""}
                  {thread.conversation.phone ? ` · ${thread.conversation.phone}` : ""}
                </p>
              </div>
              {!thread.conversation.siteId ? (
                <button
                  type="button"
                  onClick={() => setShowDraft(true)}
                  className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/20"
                >
                  Create draft + invite
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200">
                    Draft already created
                  </span>
                  <Link
                    href="/admin"
                    className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Add page on dashboard
                  </Link>
                </div>
              )}
            </div>
            <div className="min-h-0 flex-1 bg-[#f8fafc]">
              <MessageThread messages={thread.messages} />
            </div>
            <MessageComposer onSend={send} placeholder="Reply to the client…" />
            {status && (
              <p className="border-t border-emerald-100 bg-emerald-50 px-5 py-3 text-sm text-emerald-800">
                {status}
              </p>
            )}
          </>
        )}
      </section>

      {showDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#040b1a]/70 p-4 backdrop-blur-sm">
          <form
            onSubmit={createDraft}
            className="w-full max-w-md space-y-3 rounded-3xl border border-white/10 bg-white p-6 shadow-2xl"
          >
            <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold text-zinc-900">
              Create first draft
            </h3>
            <p className="text-sm leading-6 text-zinc-500">
              Ask the client: everything on one page, or separate About / Contact pages? Then create
              the draft and send login credentials in this chat.
            </p>
            <div>
              <p className="mb-2 text-sm font-medium text-zinc-800">Site layout</p>
              <div className="grid gap-2">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 px-3 py-3 hover:bg-zinc-50">
                  <input
                    type="radio"
                    name="layout"
                    className="mt-1"
                    checked={draftForm.layout === "one-page"}
                    onChange={() => setDraftForm((prev) => ({ ...prev, layout: "one-page" }))}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-zinc-900">One page</span>
                    <span className="text-xs leading-5 text-zinc-500">
                      Home, About, and Contact scroll on a single page (menu jumps to sections).
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 px-3 py-3 hover:bg-zinc-50">
                  <input
                    type="radio"
                    name="layout"
                    className="mt-1"
                    checked={draftForm.layout === "multi-page"}
                    onChange={() => setDraftForm((prev) => ({ ...prev, layout: "multi-page" }))}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-zinc-900">Multiple pages</span>
                    <span className="text-xs leading-5 text-zinc-500">
                      Separate Home, About, and Contact pages. Add more later if they ask.
                    </span>
                  </span>
                </label>
              </div>
            </div>
            {[
              ["brandName", "Business name"],
              ["ownerEmail", "Owner email (login)"],
              ["ownerPassword", "Temporary password"],
              ["phone", "Phone"],
              ["address", "Address"],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="mb-1 block text-sm text-zinc-700">{label}</label>
                <input
                  required={key !== "phone" && key !== "address"}
                  type={key === "ownerPassword" ? "text" : key === "ownerEmail" ? "email" : "text"}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none ring-cyan-400/30 focus:ring-2"
                  value={draftForm[key]}
                  onChange={(e) => setDraftForm((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDraft(false)}
                className="rounded-full px-4 py-2 text-sm text-zinc-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white"
              >
                Create & send invite
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
