"use client";

export default function GoLiveDialog({
  open,
  siteName = "this website",
  liveUrlHint = null,
  busy = false,
  onCancel,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={busy ? undefined : onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="go-live-title"
        aria-describedby="go-live-desc"
        className="w-full max-w-md rounded-3xl border border-white/10 bg-[#07122a] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-bold tracking-[0.14em] text-emerald-300/90 uppercase">
          Publish
        </p>
        <h3
          id="go-live-title"
          className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold text-white"
        >
          Make {siteName} live?
        </h3>
        <p id="go-live-desc" className="mt-3 text-sm leading-6 text-blue-100/85">
          Your site will be public on a Technonaire address
          {liveUrlHint ? (
            <>
              {" "}
              like{" "}
              <span className="font-medium text-cyan-200">{liveUrlHint}</span>
            </>
          ) : (
            " (*.technonaire.site)"
          )}
          . Anyone with the link can open it.
        </p>
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
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="rounded-full border border-emerald-400/40 bg-emerald-500/20 px-5 py-2.5 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/30 disabled:opacity-60"
          >
            {busy ? "Going live…" : "Go live"}
          </button>
        </div>
      </div>
    </div>
  );
}
