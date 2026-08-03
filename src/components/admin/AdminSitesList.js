"use client";

import { useState } from "react";
import Link from "next/link";
import AdminAddPageForm from "./AdminAddPageForm";

export default function AdminSitesList({ initialSites = [] }) {
  const [sites, setSites] = useState(initialSites);
  const [openId, setOpenId] = useState(null);
  const [busy, setBusy] = useState(null); // { id, action }
  const [status, setStatus] = useState("");

  function isBusy(siteId, action) {
    return busy?.id === siteId && (!action || busy.action === action);
  }

  function handleAdded(siteId, updatedSite) {
    setSites((prev) => prev.map((s) => (s.id === siteId ? updatedSite : s)));
  }

  async function handleDelete(site) {
    const name = site.content?.brand?.name || site.slug;
    const ok = window.confirm(
      `Delete site “${name}” (/${site.slug})?\n\nThis removes the site and the owner login. The conversation stays so you can create a new draft.`,
    );
    if (!ok) return;

    setBusy({ id: site.id, action: "delete" });
    setStatus("");
    try {
      const res = await fetch(`/api/site?id=${encodeURIComponent(site.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      setSites((prev) => prev.filter((s) => s.id !== site.id));
      if (openId === site.id) setOpenId(null);
      setStatus(`Deleted “${name}”`);
    } catch (err) {
      setStatus(err.message || "Delete failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleLayoutSwitch(site) {
    const name = site.content?.brand?.name || site.slug;
    const current = site.content?.layout === "one-page" ? "one-page" : "multi-page";
    const next = current === "one-page" ? "multi-page" : "one-page";
    const nextLabel = next === "one-page" ? "one-page (scroll)" : "multi-page";
    const ok = window.confirm(
      `Switch “${name}” to ${nextLabel}?\n\nA note will be posted in their chat.`,
    );
    if (!ok) return;

    setBusy({ id: site.id, action: "layout" });
    setStatus("");
    try {
      const res = await fetch("/api/site/layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: site.id, layout: next, notify: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Layout update failed");
      setSites((prev) => prev.map((s) => (s.id === site.id ? data.site : s)));
      setStatus(`Updated “${name}” to ${nextLabel} — notified in chat`);
    } catch (err) {
      setStatus(err.message || "Layout update failed");
    } finally {
      setBusy(null);
    }
  }

  if (sites.length === 0) {
    return (
      <p className="p-6 text-sm text-blue-100">Create a draft from a conversation to see sites here.</p>
    );
  }

  return (
    <div>
      {status && (
        <p className="border-b border-white/10 px-6 py-2 text-xs text-cyan-200">{status}</p>
      )}
      <ul>
        {sites.slice(0, 8).map((site) => {
          const pageIds = Object.keys(site.content?.pages || {});
          const navLabels = (site.content?.nav || []).map((n) => n.label).join(" · ");
          return (
            <li key={site.id} className="border-b border-white/5 px-6 py-4 last:border-0">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{site.content?.brand?.name || site.slug}</p>
                  <p className="text-sm text-blue-100">/{site.slug}</p>
                  <p className="mt-1 truncate text-xs text-blue-200/80">
                    {site.content?.layout === "one-page" ? "One page · " : "Multi-page · "}
                    {navLabels || "Home"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                  <Link
                    href={`/site/${site.slug}`}
                    className="rounded-full border border-white/15 px-3 py-1.5 text-xs hover:bg-white/5"
                  >
                    Preview
                  </Link>
                  <button
                    type="button"
                    disabled={Boolean(busy?.id === site.id)}
                    onClick={() => handleLayoutSwitch(site)}
                    className="rounded-full border border-cyan-400/35 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/15 disabled:opacity-60"
                  >
                    {isBusy(site.id, "layout")
                      ? "Updating…"
                      : site.content?.layout === "one-page"
                        ? "→ Multi-page"
                        : "→ One page"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenId((id) => (id === site.id ? null : site.id))}
                    className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/15"
                  >
                    {openId === site.id ? "Close" : "Add page"}
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(busy?.id === site.id)}
                    onClick={() => handleDelete(site)}
                    className="rounded-full border border-rose-400/40 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/15 disabled:opacity-60"
                  >
                    {isBusy(site.id, "delete") ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
              {openId === site.id && (
                <AdminAddPageForm
                  siteId={site.id}
                  siteSlug={site.slug}
                  existingPageIds={pageIds}
                  onAdded={(updated) => handleAdded(site.id, updated)}
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
