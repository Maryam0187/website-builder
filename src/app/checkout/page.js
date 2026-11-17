"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { RegionBanner } from "@/components/RegionSelector";
import { formatRegionAmount, offerFits, offerPhrase } from "@/lib/plan-price-label";

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
    <form onSubmit={handleSubmit} className="flex h-full flex-1 flex-col">
      <PaymentElement />

      {error && (
        <div className="mt-4 rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-3">
          <p className="text-sm text-rose-200">{error}</p>
        </div>
      )}

      <div className="mt-auto pt-6">
        <button
          type="submit"
          disabled={!stripe || processing}
          className="w-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 font-semibold transition hover:from-cyan-400 hover:to-blue-500 disabled:opacity-60"
        >
          {processing ? "Processing..." : "Complete Payment"}
        </button>
        <p className="mt-3 text-center text-xs text-blue-200/60">
          Secured by Stripe · Your card will be saved for future charges
        </p>
      </div>
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
  const [region, setRegion] = useState("usa");
  const [requiresContact, setRequiresContact] = useState(false);
  const [charge, setCharge] = useState(null);
  const [subscriptionId, setSubscriptionId] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCode, setAppliedCode] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [personalCoupons, setPersonalCoupons] = useState([]);
  const [personalReady, setPersonalReady] = useState(false);
  const checkoutReady = useRef(false);
  const personalDismissed = useRef(false);

  const planId = searchParams.get("planId") || "starter";
  const slotPlanId = searchParams.get("slotPlanId");
  const mode = searchParams.get("mode") || "subscribe"; // subscribe | buy-slot
  const billingInterval = searchParams.get("interval") === "yearly" ? "yearly" : "monthly";
  const urlCode = searchParams.get("code") || "";

  useEffect(() => {
    setCouponInput(urlCode);
    setAppliedCode(urlCode);
  }, [urlCode]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/checkout/my-coupons")
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })).catch(() => ({ ok: false, data: {} })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        const coupons = ok && Array.isArray(data.coupons) ? data.coupons : [];
        const fit = coupons.find((coupon) => offerFits(coupon, slotPlanId || planId, billingInterval));
        setPersonalCoupons(coupons);
        if (!urlCode && fit?.code && !personalDismissed.current) {
          setAppliedCode((current) => current || fit.code);
          setCouponInput((current) => current || fit.code);
        }
        setPersonalReady(true);
      })
      .catch(() => {
        if (!cancelled) setPersonalReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [planId, slotPlanId, billingInterval, urlCode]);

  useEffect(() => {
    let cancelled = false;

    async function initCheckout() {
      if (appliedCode == null || !personalReady) return;
      const refreshing = checkoutReady.current;
      try {
        if (refreshing) setCouponBusy(true);
        else setLoading(true);
        if (!refreshing) setError("");
        const profileRes = await fetch("/api/profile");
        const profile = await profileRes.json().catch(() => ({}));
        if (!profileRes.ok) {
          throw new Error(profile.error || "Sign in to continue");
        }

        const savedRegion = profile.user?.region || "usa";
        if (cancelled) return;
        setRegion(savedRegion);

        if (savedRegion === "pakistan") {
          setRequiresContact(true);
          return;
        }

        if (!PUBLISHABLE_KEY) {
          setError("Stripe is not configured. Contact support.");
          return;
        }

        const res = await fetch("/api/billing/checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planId: slotPlanId || planId,
            mode,
            billingInterval,
            couponCode: appliedCode,
            replaceSubscriptionId: subscriptionId || undefined,
          }),
        });
        const data = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          if (data.requiresContact || data.region === "pakistan") {
            setRegion(data.region || savedRegion);
            setRequiresContact(true);
            return;
          }
          if (refreshing || subscriptionId) {
            setCouponError(data.error || "That code could not be applied");
            return;
          }
          throw new Error(data.error || "Failed to initialize checkout");
        }

        setClientSecret(data.clientSecret || "");
        checkoutReady.current = true;
        setPlanDetails(data.plan);
        setCharge(data.charge || null);
        setSubscriptionId(data.subscriptionId || "");
        setCouponError("");
      } catch (err) {
        if (!cancelled && !refreshing) setError(err.message);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setCouponBusy(false);
        }
      }
    }

    initCheckout();
    return () => {
      cancelled = true;
    };
  }, [planId, slotPlanId, mode, billingInterval, appliedCode, personalReady]);

  function applyCoupon(code) {
    const next = String(code || "").trim().toUpperCase();
    if (!next || couponBusy || next === appliedCode) return;
    setCouponError("");
    setCouponInput(next);
    setAppliedCode(next);
  }

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

  if (requiresContact) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#040b1a] via-[#071227] to-[#0a1a35] py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-white">Activation Required</h1>
            <p className="mt-2 text-blue-100/85">Contact us to activate your plan</p>
          </div>

          <RegionBanner region={region} />

          <div className="mt-8 rounded-2xl border border-white/10 bg-[#07122a]/80 p-8">
            <p className="text-blue-100 mb-6">
              Stripe payments are not available in Pakistan. We&apos;ll help you activate your {planId} plan with local payment methods like JazzCash or EasyPaisa.
            </p>

            <button
              onClick={() => router.push(`/activation-request?planId=${planId}`)}
              className="w-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 font-semibold transition hover:from-cyan-400 hover:to-blue-500"
            >
              Submit Activation Request
            </button>

            <button
              onClick={() => router.push("/profile#plan")}
              className="w-full mt-4 rounded-full border border-cyan-400/40 bg-cyan-500/15 px-6 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/25"
            >
              Return to Plan
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!clientSecret && charge) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#040b1a] via-[#071227] to-[#0a1a35] p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">Nothing to pay today</h1>
          <p className="text-blue-100">
            {planDetails?.name} is covered{charge.discount?.name ? ` by ${charge.discount.name}` : ""}.
          </p>
          <button
            onClick={() => router.push("/profile#plan")}
            className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-semibold"
          >
            Back to your plan
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
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-white">Complete Your Order</h1>
          <p className="mt-2 text-blue-100/85">Secure payment powered by Stripe</p>
        </div>
        
        <div className="mx-auto mb-6 w-full max-w-4xl">
          <RegionBanner region={region} onChangeRegion={() => router.push("/profile#plan")} />
        </div>

        <div className="mx-auto grid w-full max-w-4xl items-stretch gap-6 md:grid-cols-[minmax(0,1.25fr)_minmax(16rem,1fr)]">
          {/* Order Summary */}
          <div className="order-2 flex h-full flex-col rounded-2xl border border-white/10 bg-[#07122a]/80 p-6 md:p-7">
            <h2 className="text-lg font-semibold text-white">Order Summary</h2>
            
            {planDetails && (
              <div className="mt-5 flex flex-1 flex-col">
                <div>
                  <p className="text-xs font-semibold tracking-[0.08em] text-blue-200/50 uppercase">Plan</p>
                  <p className="mt-1 text-xl font-semibold text-white">{planDetails.name}</p>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-semibold tracking-[0.08em] text-blue-200/50 uppercase">
                    This website
                  </p>
                  {planDetails.compareAtLabel ? (
                    <p className="mt-1 text-sm text-blue-200/50 line-through">{planDetails.compareAtLabel}</p>
                  ) : null}
                  <p className="mt-1 text-3xl font-bold text-cyan-200">{planDetails.priceLabel}</p>
                </div>

                <div className="mt-5 border-t border-white/10 pt-4">
                  <p className="text-xs font-semibold tracking-[0.08em] text-blue-200/50 uppercase">Includes</p>
                  <ul className="mt-2 space-y-1.5 text-sm text-blue-100">
                    {planDetails.highlights?.map((item, i) => (
                      <li key={i}>· {item}</li>
                    ))}
                  </ul>
                </div>

                <div className="mt-auto border-t border-white/10 pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-200/70">Billing</span>
                    <span className="inline-flex items-center gap-2 text-white">
                      {billingInterval === "yearly" ? "Yearly" : "Monthly"}
                      {billingInterval === "yearly" ? (
                        <span className="rounded-full bg-cyan-400 px-2 py-0.5 text-xs font-bold text-[#041018]">
                          2 months free
                        </span>
                      ) : null}
                    </span>
                  </div>
                  {charge?.discount ? (
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-blue-200/70">Discount</span>
                      <span className="text-cyan-100">{charge.discount.name}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-blue-200/70">Due Today</span>
                    <span className="font-semibold text-white">
                      {charge
                        ? formatRegionAmount(charge.finalAmount, String(charge.currency || "usd").toUpperCase())
                        : planDetails.priceLabel}
                    </span>
                  </div>
                </div>

                <form
                  className="border-t border-white/10 pt-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    applyCoupon(couponInput);
                  }}
                >
                  <p className="text-sm font-semibold text-white">Coupon</p>
                  <p className="mt-0.5 text-xs text-blue-200/60">
                    {appliedCode && !couponError && !couponBusy && charge?.discount
                      ? offerPhrase(charge.discount) || charge.discount.name
                      : personalCoupons.length
                        ? "Your coupon is below. A special offer still applies on its own."
                        : "A special offer is applied on its own. Have a private code? Enter it here."}
                  </p>
                  {personalCoupons.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {personalCoupons.map((coupon) => {
                        const applied = appliedCode === coupon.code && !couponError && !couponBusy;
                        return (
                          <div
                            key={coupon.id}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-cyan-300/30 bg-gradient-to-r from-cyan-500/20 via-[#0c3a5a] to-blue-600/20 px-4 py-3"
                          >
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold tracking-[0.14em] text-cyan-200 uppercase">Your coupon</p>
                              <p className="mt-0.5 text-sm font-semibold text-white">{offerPhrase(coupon) || coupon.name}</p>
                              <p className="truncate text-xs font-bold tracking-[0.12em] text-cyan-100">{coupon.code}</p>
                            </div>
                            {applied ? (
                              <button
                                type="button"
                                onClick={() => {
                                  personalDismissed.current = true;
                                  setCouponInput("");
                                  setCouponError("");
                                  setAppliedCode("");
                                }}
                                className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
                              >
                                Remove
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => applyCoupon(coupon.code)}
                                disabled={couponBusy}
                                className="shrink-0 rounded-full bg-cyan-400 px-3 py-1.5 text-xs font-bold text-[#041018] hover:bg-cyan-300 disabled:opacity-50"
                              >
                                Apply
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                  {appliedCode && !couponError && !couponBusy ? (
                    personalCoupons.some((coupon) => coupon.code === appliedCode) ? null : (
                    <div className="mt-3 flex items-center justify-between gap-3 rounded-full border border-emerald-400/35 bg-emerald-500/15 py-1.5 pl-4 pr-1.5">
                      <span className="truncate text-sm font-bold tracking-[0.12em] text-emerald-100">{appliedCode}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setCouponInput("");
                          setCouponError("");
                          setAppliedCode("");
                        }}
                        className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
                      >
                        Remove
                      </button>
                    </div>
                    )
                  ) : (
                    <div className="mt-3 flex">
                      <input
                        value={couponInput}
                        onChange={(event) => {
                          setCouponInput(event.target.value.toUpperCase());
                          setCouponError("");
                        }}
                        placeholder="Enter code"
                        aria-label="Coupon code"
                        className="min-w-0 flex-1 rounded-l-full border border-white/15 border-r-0 bg-[#040b1a] px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.12em] text-white outline-none placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-blue-200/40 focus:border-cyan-400/60"
                      />
                      <button
                        type="submit"
                        disabled={couponBusy || !couponInput.trim()}
                        className="shrink-0 rounded-r-full bg-cyan-400 px-5 py-2.5 text-sm font-bold text-[#041018] hover:bg-cyan-300 disabled:opacity-50"
                      >
                        {couponBusy ? "Applying…" : "Apply"}
                      </button>
                    </div>
                  )}
                  {couponError ? (
                    <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                      {couponError}
                    </p>
                  ) : null}
                </form>
              </div>
            )}
          </div>

          {/* Payment Form */}
          <div className="order-1 flex h-full flex-col rounded-2xl border border-white/10 bg-[#07122a]/80 p-6 md:p-7">
            <h2 className="mb-5 text-lg font-semibold text-white">Payment Details</h2>
            <div className="flex min-h-0 flex-1 flex-col">
              <Elements key={clientSecret || "no-secret"} stripe={stripePromise} options={options}>
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
