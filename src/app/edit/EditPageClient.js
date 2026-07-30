"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import LocalBusinessTemplate from "@/components/template/LocalBusinessTemplate";
import EditPanel from "@/components/editor/EditPanel";
import MessageThread from "@/components/messaging/MessageThread";
import MessageComposer from "@/components/messaging/MessageComposer";
import BrandLogo from "@/components/BrandLogo";
import { getNavItems, isOnePageLayout, resolvePageId } from "@/lib/site-defaults";

function setPath(obj, path, value) {
  const clone = structuredClone(obj);
  const parts = path.split(".");
  let cur = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (cur[key] == null) {
      cur[key] = /^\d+$/.test(parts[i + 1]) ? [] : {};
    }
    cur = cur[key];
  }
  cur[parts[parts.length - 1]] = value;
  return clone;
}

export default function EditPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState(null);
  const [site, setSite] = useState(null);
  const [draft, setDraft] = useState(null);
  const [showMessages, setShowMessages] = useState(false);
  const [thread, setThread] = useState(null);
  const [status, setStatus] = useState("");
  const [pageId, setPageId] = useState("home");

  const loadThread = useCallback(async (conversationId) => {
    if (!conversationId) return;
    const res = await fetch(`/api/conversations/${conversationId}`);
    if (res.ok) {
      setThread(await res.json());
    }
  }, []);

  useEffect(() => {
    (async () => {
      const authRes = await fetch("/api/auth");
      const auth = await authRes.json();
      if (!auth.user) {
        router.replace("/login");
        return;
      }
      if (auth.user.role === "admin") {
        router.replace("/admin");
        return;
      }
      setUser(auth.user);

      const siteRes = await fetch(`/api/site?id=${auth.user.siteId}`);
      const siteData = await siteRes.json();
      if (!siteRes.ok) {
        setStatus(siteData.error || "Site not found");
        return;
      }
      setSite(siteData.site);
      const fromQuery = searchParams.get("page") || "home";
      setPageId(resolvePageId(siteData.site.content, fromQuery));
      if (siteData.site.conversationId) {
        await loadThread(siteData.site.conversationId);
      }
    })();
  }, [router, loadThread, searchParams]);

  const navItems = useMemo(() => (site ? getNavItems(site.content) : []), [site]);
  const onePage = useMemo(() => (site ? isOnePageLayout(site.content) : false), [site]);

  function changePage(nextId) {
    setPageId(nextId);
    setDraft(null);
    if (onePage) {
      router.replace("/edit");
      requestAnimationFrame(() => {
        document.getElementById(nextId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }
    const url = nextId === "home" ? "/edit" : `/edit?page=${nextId}`;
    router.replace(url);
  }

  async function saveField(payload) {
    let nextContent = structuredClone(site.content);

    if (payload.styled) {
      nextContent = setPath(nextContent, payload.path, payload.value);
      if (!nextContent.styles) nextContent.styles = {};
      const current = { ...(nextContent.styles[payload.path] || {}) };
      if (payload.color) current.color = payload.color;
      else delete current.color;
      if (payload.fontSize) current.fontSize = payload.fontSize;
      else delete current.fontSize;
      if (payload.fontWeight) current.fontWeight = payload.fontWeight;
      else delete current.fontWeight;
      if (Object.keys(current).length) nextContent.styles[payload.path] = current;
      else delete nextContent.styles[payload.path];
    } else {
      nextContent = setPath(nextContent, payload.path, payload.value);
    }

    const res = await fetch("/api/site", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId: site.id, content: nextContent }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Save failed");
    setSite(data.site);
    setDraft(null);
    setStatus("Saved");
    setTimeout(() => setStatus(""), 1500);
  }

  async function sendMessage({ body, images }) {
    const res = await fetch(`/api/conversations/${site.conversationId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, images }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed");
    await loadThread(site.conversationId);
  }

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  }

  if (!site) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070f1f] text-blue-100">
        {status || "Loading your editor…"}
      </div>
    );
  }

  const previewHref = onePage
    ? `/site/${site.slug}`
    : pageId === "home"
      ? `/site/${site.slug}`
      : `/site/${site.slug}/${pageId}`;

  return (
    <div className="relative min-h-screen bg-zinc-100">
      <div className="sticky top-0 z-40 border-b border-white/10 bg-[#040b1a]/95 text-white backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <BrandLogo href="/edit" subtitle="Owner editor" compact />
            <p className="mt-2 font-[family-name:var(--font-display)] text-lg font-semibold">
              {site.content?.brand?.name || "Your site"}
            </p>
            <p className="text-xs text-blue-100">
              {user?.email ? `Signed in as ${user.email} · ` : ""}
              Click any text, image, or color to edit. Text also has size and color.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {status && (
              <span className="rounded-full bg-emerald-400/15 px-3 py-1.5 text-sm text-emerald-200">
                {status}
              </span>
            )}
            <Link
              href={previewHref}
              target="_blank"
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium hover:bg-white/5"
            >
              Preview
            </Link>
            <button
              type="button"
              onClick={() => setShowMessages((v) => !v)}
              className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold"
            >
              {showMessages ? "Hide messages" : "Ask for UI changes"}
            </button>
            <button
              type="button"
              onClick={logout}
              className="rounded-full px-3 py-2 text-sm text-blue-100 hover:bg-white/5"
            >
              Log out
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-zinc-200 bg-white px-4 py-2">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            {onePage ? "Section" : "Page"}
          </span>
          {navItems.map((item) => (
            <button
              key={item.pageId}
              type="button"
              onClick={() => changePage(item.pageId)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                pageId === item.pageId
                  ? "bg-[#040b1a] text-white"
                  : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {item.label}
            </button>
          ))}
          {onePage && (
            <span className="ml-auto text-xs text-zinc-500">One-page site · menu jumps to sections</span>
          )}
        </div>
      </div>

      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950">
        Tip: change words and photos yourself.{" "}
        {onePage
          ? "Want separate pages instead of one scroll? "
          : "Need another page (Services, Gallery, etc.)? "}
        Open{" "}
        <button type="button" className="font-semibold underline" onClick={() => setShowMessages(true)}>
          Ask for UI changes
        </button>{" "}
        and tell us — we&apos;ll help.
      </div>

      <LocalBusinessTemplate
        content={site.content}
        pageId={pageId}
        slug={site.slug}
        editMode
        onEdit={(payload) => setDraft(payload)}
        onPageChange={changePage}
      />

      <EditPanel draft={draft} onClose={() => setDraft(null)} onSave={saveField} />

      {showMessages && (
        <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-zinc-200 bg-white shadow-2xl">
          <div className="border-b border-zinc-200 bg-[#040b1a] px-4 py-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold tracking-wide text-cyan-200 uppercase">Messages</p>
                <h2 className="font-semibold">Talk to Technonaire</h2>
              </div>
              <button type="button" className="text-sm text-blue-100" onClick={() => setShowMessages(false)}>
                Close
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 bg-[#f8fafc]">
            <MessageThread messages={thread?.messages || []} />
          </div>
          <MessageComposer
            onSend={sendMessage}
            placeholder="Ask for a new page, UI change, or upload a screenshot…"
          />
        </div>
      )}
    </div>
  );
}
