"use client";

/**
 * Full-screen payment success with green tick.
 * Stays open until the user chooses View invoice or Continue to Billing.
 */
export default function PaymentSuccessOverlay({
  open,
  message = "Payment successful",
  continueLabel = "Continue to Billing",
  invoiceUrl = null,
  onContinue,
  onViewInvoice,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-success-title"
    >
      <div className="flex w-full max-w-sm flex-col items-center rounded-3xl border border-emerald-400/25 bg-[#07122a] px-8 py-9 text-center shadow-2xl">
        <div className="pay-ok-pop relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15">
          <svg
            className="h-11 w-11 text-emerald-300"
            viewBox="0 0 52 52"
            fill="none"
            aria-hidden
          >
            <circle
              className="pay-ok-circle"
              cx="26"
              cy="26"
              r="24"
              stroke="currentColor"
              strokeWidth="2.5"
              opacity="0.35"
            />
            <path
              className="pay-ok-check"
              d="M14 27.5 L22.5 35.5 L38 17"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <p className="mt-5 text-xs font-bold tracking-[0.16em] text-emerald-300/90 uppercase">
          Success
        </p>
        <h2
          id="payment-success-title"
          className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold text-white"
        >
          Payment confirmed
        </h2>
        <p className="mt-3 text-sm leading-6 text-blue-100/85">{message}</p>

        <div className="mt-7 flex w-full flex-col gap-2">
          {invoiceUrl ? (
            <button
              type="button"
              onClick={() => onViewInvoice?.(invoiceUrl)}
              className="w-full rounded-full border border-emerald-400/40 bg-emerald-500/20 px-5 py-2.5 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/30"
            >
              View invoice
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onContinue?.()}
            className={`w-full rounded-full px-5 py-2.5 text-sm font-semibold ${
              invoiceUrl
                ? "border border-white/15 text-blue-100 hover:bg-white/5"
                : "border border-emerald-400/40 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30"
            }`}
          >
            {continueLabel}
          </button>
        </div>
      </div>

      <style>{`
        .pay-ok-circle {
          stroke-dasharray: 150;
          stroke-dashoffset: 150;
          animation: pay-ok-circle 0.55s ease forwards;
        }
        .pay-ok-check {
          stroke-dasharray: 48;
          stroke-dashoffset: 48;
          animation: pay-ok-check 0.4s ease 0.35s forwards;
        }
        .pay-ok-pop {
          animation: pay-ok-pop 0.45s ease both;
        }
        @keyframes pay-ok-circle {
          to { stroke-dashoffset: 0; }
        }
        @keyframes pay-ok-check {
          to { stroke-dashoffset: 0; }
        }
        @keyframes pay-ok-pop {
          0% { transform: scale(0.6); opacity: 0; }
          70% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
