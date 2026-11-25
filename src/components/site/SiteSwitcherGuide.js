"use client";

export default function SiteSwitcherGuide({ open, onClose }) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
      >
        <div
          className="w-full max-w-md rounded-2xl border border-white/10 bg-[#040b1a] p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3">
            <h2
              id="guide-title"
              className="text-xl font-semibold text-white"
            >
              Switching Between Websites
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mt-4 space-y-4 text-sm text-blue-100">
            <p>
              You now have multiple websites in your account. Here's how to work with them:
            </p>
            
            <div className="space-y-3">
              <div className="rounded-lg border border-cyan-400/20 bg-cyan-500/5 p-3">
                <p className="font-semibold text-cyan-200">
                  1. Return to Editor
                </p>
                <p className="mt-1 text-xs text-blue-100/90">
                  Click "Editor" in the top right to go back. You'll see your active website.
                </p>
              </div>

              <div className="rounded-lg border border-cyan-400/20 bg-cyan-500/5 p-3">
                <p className="font-semibold text-cyan-200">
                  2. Switch Sites
                </p>
                <p className="mt-1 text-xs text-blue-100/90">
                  In the editor, look for the site name at the top. Click it to open the
                  site switcher and choose a different website to work on.
                </p>
              </div>

              <div className="rounded-lg border border-cyan-400/20 bg-cyan-500/5 p-3">
                <p className="font-semibold text-cyan-200">
                  3. Manage All Sites
                </p>
                <p className="mt-1 text-xs text-blue-100/90">
                  Visit Profile → Websites to see all your sites, rename them, publish/unpublish,
                  and manage each site's plan and settings.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-xs text-blue-200/80">
                <span className="font-semibold">Tip:</span> Each website can have its own plan,
                domain, and design. They're completely independent from each other.
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold transition hover:from-cyan-400 hover:to-blue-500"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
