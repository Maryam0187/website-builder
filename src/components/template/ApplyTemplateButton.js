"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

export default function ApplyTemplateButton({ templateId, templateLabel }) {
  const [sites, setSites] = useState([]);
  const [ready, setReady] = useState(false);
  const [siteId, setSiteId] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [appliedId, setAppliedId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data.sites) ? data.sites : [];
        setSites(list);
        const current = list.find((site) => String(site.id) === String(data.site?.id)) || list[0];
        if (current) setSiteId(String(current.id));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = sites.find((site) => String(site.id) === siteId);
  const already = selected && (selected.template === templateId || String(appliedId) === String(selected.id));

  async function apply() {
    if (!selected || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/site/template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: selected.id, template: templateId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not apply this template");
      setAppliedId(selected.id);
      setSites((current) =>
        current.map((site) =>
          String(site.id) === String(selected.id)
            ? { ...site, template: templateId, templateLabel }
            : site,
        ),
      );
      setOpen(false);
    } catch (err) {
      setError(err.message || "Could not apply this template");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={!ready}
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        className="rounded-full bg-cyan-400 px-4 py-1.5 text-xs font-bold text-[#041018] hover:bg-cyan-300 disabled:opacity-60"
      >
        Apply
      </button>
      {open
        ? createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
          onClick={busy ? undefined : () => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-3xl border border-white/10 bg-[#07122a] p-6 text-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-xs font-bold tracking-wide text-cyan-200 uppercase">Template</p>
            <h2 className="mt-1 text-xl font-semibold">Apply {templateLabel}?</h2>
            <p className="mt-3 text-sm leading-6 text-blue-100/80">
              This replaces the current layout, photos, and colors on the website you choose. The business name stays.
            </p>
            {!sites.length ? (
              <p className="mt-4 text-sm text-blue-100">
                Create a website first, then apply this template.{" "}
                <Link href="/profile#websites" className="font-semibold text-cyan-200 underline-offset-2 hover:underline">
                  Go to Websites
                </Link>
              </p>
            ) : sites.length > 1 ? (
              <label className="mt-4 block text-sm">
                <span className="mb-1 block text-blue-100">Website</span>
                <select
                  value={siteId}
                  onChange={(event) => setSiteId(event.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-[#040b1a] px-3 py-2 text-sm text-white outline-none"
                >
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                      {site.template === templateId ? " · already using this" : ""}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="mt-4 text-sm text-blue-100">Website: {selected?.name}</p>
            )}
            {error ? <p className="mt-3 text-sm text-amber-200">{error}</p> : null}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setOpen(false)}
                className="rounded-full px-4 py-2 text-sm text-blue-100 hover:bg-white/5 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !selected || already}
                onClick={apply}
                className="rounded-full bg-cyan-400 px-5 py-2 text-sm font-bold text-[#041018] hover:bg-cyan-300 disabled:opacity-50"
              >
                {busy ? "Applying…" : already ? "Already applied" : "Apply"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )
        : null}
    </>
  );
}
