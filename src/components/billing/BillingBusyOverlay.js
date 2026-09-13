"use client";

/** Full-page busy overlay for Stripe checkout / card charge. */
export default function BillingBusyOverlay({
  open,
  message = "Loading…",
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-[#07122a] px-8 py-7 shadow-2xl">
        <span
          className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-400/25 border-t-cyan-300"
          aria-hidden
        />
        <p className="text-sm font-medium text-blue-100">{message}</p>
      </div>
    </div>
  );
}
