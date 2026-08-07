"use client";

export default function TemplateChangeDialog({
  open,
  fromLabel,
  toLabel,
  busy = false,
  onCancel,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={busy ? undefined : onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-change-title"
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-bold tracking-wide text-cyan-700 uppercase">Template</p>
        <h3
          id="template-change-title"
          className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold text-zinc-900"
        >
          Switch to {toLabel}?
        </h3>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          Your site will refresh with the <span className="font-medium text-zinc-800">{toLabel}</span>{" "}
          starter layout, photos, and colors
          {fromLabel ? (
            <>
              {" "}
              (replacing <span className="font-medium text-zinc-800">{fromLabel}</span>)
            </>
          ) : null}
          . Your business name is kept. Edits to pages and text for the old look will be replaced.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-full px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="rounded-full bg-[#040b1a] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0a1628] disabled:opacity-60"
          >
            {busy ? "Switching…" : "Switch template"}
          </button>
        </div>
      </div>
    </div>
  );
}
