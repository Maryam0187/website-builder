"use client";

import { useEffect, useState } from "react";

export default function PlanChangeDialog({
  open,
  eyebrow = "Plan",
  title,
  description,
  confirmLabel = "Continue",
  busy = false,
  /** When set, user must check this before confirming (upgrade charge). */
  requireChargeConfirm = false,
  chargeConfirmLabel = "I confirm charging my saved card",
  cardLabel = null,
  changeCardLabel = "Change card",
  onChangeCard,
  onCancel,
  onConfirm,
}) {
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (open) setConfirmed(false);
  }, [open]);

  if (!open) return null;

  const canConfirm = !requireChargeConfirm || confirmed;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={busy ? undefined : onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-change-title"
        aria-describedby="plan-change-desc"
        className="w-full max-w-md rounded-3xl border border-white/10 bg-[#07122a] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-bold tracking-[0.14em] text-cyan-300/90 uppercase">
          {eyebrow}
        </p>
        <h3
          id="plan-change-title"
          className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold text-white"
        >
          {title}
        </h3>
        <p id="plan-change-desc" className="mt-3 text-sm leading-6 text-blue-100/85">
          {description}
        </p>

        {cardLabel ? (
          <div className="mt-4 rounded-xl border border-white/10 bg-[#040b1a]/80 px-3 py-3">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-white/40 uppercase">
              Card on file
            </p>
            <p className="mt-1 text-sm font-medium text-white">{cardLabel}</p>
          </div>
        ) : null}

        {requireChargeConfirm ? (
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-3 py-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/30 bg-[#040b1a] text-cyan-500 focus:ring-cyan-400/40"
              checked={confirmed}
              disabled={busy}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            <span className="text-sm leading-5 text-cyan-50/95">{chargeConfirmLabel}</span>
          </label>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
          <div>
            {onChangeCard ? (
              <button
                type="button"
                disabled={busy}
                onClick={onChangeCard}
                className="rounded-full px-4 py-2.5 text-sm font-medium text-blue-100 underline-offset-2 hover:bg-white/5 hover:underline disabled:opacity-50"
              >
                {changeCardLabel}
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
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
              disabled={busy || !canConfirm}
              onClick={onConfirm}
              className="rounded-full border border-cyan-400/40 bg-cyan-500/20 px-5 py-2.5 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-60"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
