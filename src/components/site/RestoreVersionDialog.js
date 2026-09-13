"use client";

export default function RestoreVersionDialog({
  open,
  siteName = "this website",
  versionLabel = "this snapshot",
  versionDate = null,
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
        aria-labelledby="restore-version-title"
        aria-describedby="restore-version-desc"
        className="w-full max-w-md rounded-3xl border border-white/10 bg-[#07122a] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-bold tracking-[0.14em] text-cyan-300/90 uppercase">
          Version history
        </p>
        <h3
          id="restore-version-title"
          className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold text-white"
        >
          Restore this version?
        </h3>
        <p id="restore-version-desc" className="mt-3 text-sm leading-6 text-blue-100/85">
          Restore{" "}
          <span className="font-medium text-white">{versionLabel}</span>
          {versionDate ? (
            <>
              {" "}
              from <span className="font-medium text-cyan-200">{versionDate}</span>
            </>
          ) : null}{" "}
          for <span className="font-medium text-white">{siteName}</span>.
        </p>
        <ul className="mt-4 space-y-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-3 text-xs leading-5 text-cyan-100/90">
          <li>Your current content will be saved as a snapshot first.</li>
          <li>Re-open the editor to see the restored changes.</li>
        </ul>
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
            className="rounded-full border border-cyan-400/40 bg-cyan-500/20 px-5 py-2.5 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-60"
          >
            {busy ? "Restoring…" : "Restore version"}
          </button>
        </div>
      </div>
    </div>
  );
}
