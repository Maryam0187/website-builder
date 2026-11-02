"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
const stripePromise = PUBLISHABLE_KEY ? loadStripe(PUBLISHABLE_KEY) : null;

function CheckoutForm({ planId, slotPlanId, mode, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError("");

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message);
        setProcessing(false);
        return;
      }

      // Confirm the payment/setup
      const { error: confirmError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success?planId=${planId}${slotPlanId ? `&slotPlanId=${slotPlanId}` : ""}&mode=${mode}`,
        },
      });

      if (confirmError) {
        setError(confirmError.message);
        onError?.(confirmError);
      }
    } catch (err) {
      setError(err.message || "Payment failed");
      onError?.(err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />

      {error && (
        <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-3">
          <p className="text-sm text-rose-200">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 font-semibold transition hover:from-cyan-400 hover:to-blue-500 disabled:opacity-60"
      >
        {processing ? "Processing..." : "Complete Payment"}
      </button>

      <p className="text-xs text-center text-blue-200/60">
        Secured by Stripe · Your card will be saved for future charges
      </p>
    </form>
  );
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [clientSecret, setClientSecret] = useState("");
  const [planDetails, setPlanDetails] = useState(null);
  const [error, setError] = useState("");

  const planId = searchParams.get("planId") || "starter";
  const slotPlanId = searchParams.get("slotPlanId");
  const mode = searchParams.get("mode") || "subscribe"; // subscribe | buy-slot

  useEffect(() => {
    async function initCheckout() {
      try {
        // Fetch plan details and create payment intent
        const res = await fetch("/api/billing/checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planId: slotPlanId || planId,
            mode,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to initialize checkout");
        }

        setClientSecret(data.clientSecret);
        setPlanDetails(data.plan);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (PUBLISHABLE_KEY) {
      initCheckout();
    } else {
      setLoading(false);
      setError("Stripe is not configured. Contact support.");
    }
  }, [planId, slotPlanId, mode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#040b1a] via-[#071227] to-[#0a1a35]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-cyan-400 border-r-transparent"></div>
          <p className="mt-4 text-blue-100">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#040b1a] via-[#071227] to-[#0a1a35] p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-6 py-4">
            <p className="text-rose-200">{error}</p>
          </div>
          <button
            onClick={() => router.push("/profile#plan")}
            className="rounded-full border border-cyan-400/40 bg-cyan-500/15 px-6 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/25"
          >
            Return to Profile
          </button>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#040b1a] via-[#071227] to-[#0a1a35]">
        <p className="text-blue-100">Initializing payment...</p>
      </div>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: "night",
      variables: {
        colorPrimary: "#22d3ee",
        colorBackground: "#040b1a",
        colorText: "#e0f2fe",
        colorDanger: "#f43f5e",
        fontFamily: "system-ui, sans-serif",
        borderRadius: "0.75rem",
      },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#040b1a] via-[#071227] to-[#0a1a35] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">Complete Your Order</h1>
          <p className="mt-2 text-blue-100/85">Secure payment powered by Stripe</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Order Summary */}
          <div className="rounded-2xl border border-white/10 bg-[#07122a]/80 p-6 h-fit">
            <h2 className="text-lg font-semibold text-white mb-4">Order Summary</h2>
            
            {planDetails && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-blue-200/70">Plan</p>
                  <p className="text-lg font-semibold text-white">{planDetails.name}</p>
                </div>

                <div>
                  <p className="text-sm text-blue-200/70">
                    {mode === "buy-slot" ? "Additional Website" : "First Website"}
                  </p>
                  <p className="text-2xl font-bold text-cyan-200">{planDetails.priceLabel}</p>
                  {mode === "buy-slot" && planDetails.additionalPriceLabel && (
                    <p className="text-xs text-blue-200/60 mt-1">
                      Additional sites: {planDetails.additionalPriceLabel}
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs text-blue-200/70 mb-2">Includes:</p>
                  <ul className="text-xs text-blue-100 space-y-1">
                    {planDetails.highlights?.map((item, i) => (
                      <li key={i}>· {item}</li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-200/70">Billing</span>
                    <span className="text-white">Monthly</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-blue-200/70">Due Today</span>
                    <span className="font-semibold text-white">{planDetails.priceLabel}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payment Form */}
          <div className="rounded-2xl border border-white/10 bg-[#07122a]/80 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Payment Details</h2>
            
            <Elements stripe={stripePromise} options={options}>
              <CheckoutForm
                planId={planId}
                slotPlanId={slotPlanId}
                mode={mode}
                onSuccess={() => {
                  // Redirect handled by confirmPayment return_url
                }}
                onError={(err) => {
                  console.error("Payment error:", err);
                }}
              />
            </Elements>
          </div>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => router.push("/profile#plan")}
            className="text-sm text-blue-200/70 hover:text-white transition"
          >
            ← Back to Plans
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  if (!PUBLISHABLE_KEY) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#040b1a] via-[#071227] to-[#0a1a35] p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="rounded-full bg-rose-500/10 border border-rose-400/30 w-20 h-20 mx-auto flex items-center justify-center">
            <svg className="w-10 h-10 text-rose-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Payment Configuration Error</h1>
            <p className="mt-2 text-blue-100/85">
              Stripe publishable key is not configured. Please contact an administrator.
            </p>
          </div>
          <a
            href="/profile#plan"
            className="inline-block rounded-full border border-cyan-400/40 bg-cyan-500/15 px-6 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/25"
          >
            Return to Profile
          </a>
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#040b1a] via-[#071227] to-[#0a1a35]">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-cyan-400 border-r-transparent"></div>
            <p className="mt-4 text-blue-100">Loading...</p>
          </div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
