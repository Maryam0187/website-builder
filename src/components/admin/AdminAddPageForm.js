"use client";

import { useState } from "react";
import Link from "next/link";
import { ADDABLE_PAGE_TYPES } from "@/lib/site-defaults";

export default function AdminAddPageForm({ siteId, siteSlug, existingPageIds = [], onAdded }) {
  const [type, setType] = useState("services");
  const [label, setLabel] = useState("Services");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  function onTypeChange(nextType) {
    setType(nextType);
    const preset = ADDABLE_PAGE_TYPES.find((p) => p.type === nextType);
    if (preset && nextType !== "content") {
      setLabel(preset.label);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setStatus("Adding page…");
    try {
      const res = await fetch("/api/site/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, type, label }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setStatus(`Added “${data.page?.label || label}”`);
      onAdded?.(data.site);
    } catch (err) {
      setStatus(err.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  const available = ADDABLE_PAGE_TYPES.filter((p) => {
    if (p.type === "content") return true;
    // Allow duplicate custom pages; block duplicate preset ids by label slug match
    return !existingPageIds.includes(p.type);
  });

  return (
    <form onSubmit={submit} className="mt-3 space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3">
      <p className="text-xs font-semibold tracking-wide text-cyan-200 uppercase">Add page</p>
      <div className="flex flex-wrap gap-2">
        <select
          className="rounded-lg border border-white/15 bg-[#0b1528] px-3 py-2 text-sm text-white"
          value={type}
          onChange={(e) => onTypeChange(e.target.value)}
        >
          {available.map((p) => (
            <option key={p.type} value={p.type}>
              {p.label}
            </option>
          ))}
        </select>
        <input
          className="min-w-[8rem] flex-1 rounded-lg border border-white/15 bg-[#0b1528] px-3 py-2 text-sm text-white"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Nav label"
          required
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold disabled:opacity-60"
        >
          {busy ? "Adding…" : "Add"}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-blue-100">
        {status && <span>{status}</span>}
        <Link href={`/site/${siteSlug}`} className="underline hover:text-white">
          Preview site
        </Link>
      </div>
    </form>
  );
}
