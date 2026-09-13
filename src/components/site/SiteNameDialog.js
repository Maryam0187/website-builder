"use client";

import { useEffect, useState } from "react";

export default function SiteNameDialog({
  open,
  title = "Name for the new website?",
  description = "This name appears in your profile and editor. You can change it later.",
  initialName = "My second website",
  confirmLabel = "Create website",
  busyLabel = "Creating…",
  busy = false,
  onCancel,
  onConfirm,
}) {
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (open) setName(initialName || "");
  }, [open, initialName]);

  if (!open) return null;

  function submit(e) {
    e.preventDefault();
    const next = String(name || "").trim();
    if (!next || busy) return;
    onConfirm(next);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={busy ? undefined : onCancel}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="site-name-title"
        className="w-full max-w-md rounded-3xl border border-white/10 bg-[#07122a] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <p className="text-xs font-bold tracking-[0.14em] text-cyan-300/90 uppercase">
          New website
        </p>
        <h3
          id="site-name-title"
          className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold text-white"
        >
          {title}
        </h3>
        <p className="mt-3 text-sm leading-6 text-blue-100/85">{description}</p>
        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-medium text-blue-100">Website name</span>
          <input
            autoFocus
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. My second website"
            className="w-full rounded-lg border border-white/15 bg-[#040b1a] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30"
          />
        </label>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-full px-4 py-2.5 text-sm font-medium text-blue-100 hover:bg-white/5 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !String(name || "").trim()}
            className="rounded-full border border-cyan-400/40 bg-cyan-500/20 px-5 py-2.5 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-60"
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
