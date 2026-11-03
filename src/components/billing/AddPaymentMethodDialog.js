"use client";

import { useEffect, useState } from "react";
import PaymentMethodForm from "./PaymentMethodForm";

export default function AddPaymentMethodDialog({
  open,
  title = "Add payment method",
  description = "Add a card to complete your purchase on-site without redirecting to Stripe Checkout.",
  onSuccess,
  onCancel,
  onError,
  busy = false,
}) {
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setClientSecret(null);
      setError("");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    fetch("/api/billing/setup-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setError(data.error);
          setLoading(false);
          return;
        }
        setClientSecret(data.clientSecret);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Failed to load payment form");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={busy || loading ? undefined : onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-method-title"
        aria-describedby="payment-method-desc"
        className="w-full max-w-md rounded-3xl border border-white/10 bg-[#07122a] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-bold tracking-[0.14em] text-cyan-300/90 uppercase">
          Payment
        </p>
        <h3
          id="payment-method-title"
          className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold text-white"
        >
          {title}
        </h3>
        <p id="payment-method-desc" className="mt-3 text-sm leading-6 text-blue-100/85">
          {description}
        </p>

        <div className="mt-6">
          {loading ? (
            <div className="space-y-4">
              <div className="animate-pulse space-y-3">
                <div className="h-10 rounded-lg bg-white/5"></div>
                <div className="h-10 rounded-lg bg-white/5"></div>
                <div className="h-10 rounded-lg bg-white/5"></div>
              </div>
              <p className="text-center text-sm text-blue-200/70">Loading payment form...</p>
            </div>
          ) : error ? (
            <div className="space-y-4">
              <p className="text-sm text-rose-300">{error}</p>
              <button
                type="button"
                onClick={onCancel}
                className="w-full rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/5"
              >
                Close
              </button>
            </div>
          ) : clientSecret ? (
            <PaymentMethodForm
              clientSecret={clientSecret}
              onSuccess={onSuccess}
              onCancel={onCancel}
              onError={onError}
              busy={busy}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
