"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [processing, setProcessing] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const planId = searchParams.get("planId");
  const slotPlanId = searchParams.get("slotPlanId");
  const mode = searchParams.get("mode");
  const paymentIntent = searchParams.get("payment_intent");
  const paymentIntentClientSecret = searchParams.get("payment_intent_client_secret");

  useEffect(() => {
    async function processPayment() {
      if (!paymentIntent) {
        setError("Missing payment information");
        setProcessing(false);
        return;
      }

      try {
        // Verify payment intent status with Stripe
        const verifyRes = await fetch("/api/billing/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentIntent,
            planId: slotPlanId || planId,
            mode,
          }),
        });

        const data = await verifyRes.json();

        if (!verifyRes.ok) {
          throw new Error(data.error || "Payment verification failed");
        }

        setResult(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setProcessing(false);
      }
    }

    processPayment();
  }, [paymentIntent, planId, slotPlanId, mode]);

  if (processing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#040b1a] via-[#071227] to-[#0a1a35]">
        <div className="text-center space-y-4">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-cyan-400 border-r-transparent"></div>
          <p className="text-lg text-blue-100">Processing your payment...</p>
          <p className="text-sm text-blue-200/70">Please wait, this may take a moment</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#040b1a] via-[#071227] to-[#0a1a35] p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="rounded-full bg-rose-500/10 border border-rose-400/30 w-20 h-20 mx-auto flex items-center justify-center">
            <svg className="w-10 h-10 text-rose-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Payment Failed</h1>
            <p className="mt-2 text-blue-100/85">{error}</p>
          </div>
          <div className="space-y-3">
            <Link
              href="/checkout"
              className="block w-full rounded-full bg-cyan-500/20 border border-cyan-400/40 px-6 py-3 font-semibold text-cyan-100 hover:bg-cyan-500/30 transition"
            >
              Try Again
            </Link>
            <Link
              href="/profile#plan"
              className="block text-sm text-blue-200/70 hover:text-white transition"
            >
              Return to Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#040b1a] via-[#071227] to-[#0a1a35] p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="rounded-full bg-emerald-500/10 border border-emerald-400/30 w-20 h-20 mx-auto flex items-center justify-center">
          <svg className="w-10 h-10 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <div>
          <h1 className="text-3xl font-bold text-white">Payment Successful!</h1>
          <p className="mt-2 text-blue-100/85">
            {result?.message || "Your subscription has been activated."}
          </p>
        </div>

        {result?.plan && (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-6 text-left">
            <p className="text-sm text-emerald-200/70 mb-2">Subscribed to:</p>
            <p className="text-xl font-semibold text-white">{result.plan.name}</p>
            <p className="text-sm text-emerald-200 mt-1">{result.plan.priceLabel}/month</p>
          </div>
        )}

        <div className="space-y-3">
          <Link
            href="/profile#websites"
            className="block w-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 font-semibold transition hover:from-cyan-400 hover:to-blue-500"
          >
            {mode === "buy-slot" ? "Create Your Website" : "Go to Dashboard"}
          </Link>
          <p className="text-xs text-blue-200/60">
            A confirmation email has been sent to your inbox
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#040b1a] via-[#071227] to-[#0a1a35]">
          <div className="text-center space-y-4">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-cyan-400 border-r-transparent"></div>
            <p className="text-lg text-blue-100">Processing your payment...</p>
            <p className="text-sm text-blue-200/70">Please wait, this may take a moment</p>
          </div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
