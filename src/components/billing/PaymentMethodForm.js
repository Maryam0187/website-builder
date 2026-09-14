"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

function PaymentElementForm({ onSuccess, onCancel, onError, busy: externalBusy }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isProcessing = busy || externalBusy;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!stripe || !elements || isProcessing) return;

    setBusy(true);
    setError("");

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message || "Card information is invalid");
        setBusy(false);
        return;
      }

      const { error: confirmError } = await stripe.confirmSetup({
        elements,
        redirect: "if_required",
        confirmParams: {
          return_url: `${window.location.origin}/profile`,
        },
      });

      if (confirmError) {
        setError(confirmError.message || "Could not save payment method");
        setBusy(false);
        if (onError) onError(confirmError);
        return;
      }

      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || "An error occurred");
      setBusy(false);
      if (onError) onError(err);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border border-white/15 bg-[#040b1a] p-4">
        <PaymentElement />
      </div>

      {error ? (
        <p className="text-sm text-rose-300">{error}</p>
      ) : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {isProcessing ? "Saving..." : "Save card"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/5 disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function PaymentMethodForm({ 
  clientSecret, 
  onSuccess, 
  onCancel,
  onError,
  busy = false 
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (clientSecret) setReady(true);
  }, [clientSecret]);

  // If Stripe.js cannot be loaded (no publishable key), show error
  if (!stripePromise) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-rose-300">
          Stripe publishable key is not configured. Payment Element cannot be displayed.
          Please use Stripe Checkout redirect instead.
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="w-full rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/5"
        >
          Close
        </button>
      </div>
    );
  }

  if (!clientSecret || !ready) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-3">
          <div className="h-10 rounded-lg bg-white/5"></div>
          <div className="h-10 rounded-lg bg-white/5"></div>
          <div className="h-10 rounded-lg bg-white/5"></div>
        </div>
        <p className="text-center text-sm text-blue-200/70">Loading payment form...</p>
      </div>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: "night",
      variables: {
        colorPrimary: "#06b6d4",
        colorBackground: "#040b1a",
        colorText: "#ffffff",
        colorDanger: "#fb7185",
        fontFamily: "system-ui, sans-serif",
        borderRadius: "8px",
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentElementForm 
        onSuccess={onSuccess} 
        onCancel={onCancel}
        onError={onError}
        busy={busy}
      />
    </Elements>
  );
}
