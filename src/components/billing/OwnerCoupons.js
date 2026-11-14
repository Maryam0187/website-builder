"use client";

import { useEffect, useState } from "react";
import CouponStatusTabs from "@/components/billing/CouponStatusTabs";
import { discountBuckets } from "@/lib/discount-buckets";

function offerParts(coupon) {
  if (coupon.valueType === "percent") {
    return { amount: `${coupon.valueAmount}%`, unit: "off" };
  }
  return { amount: `$${((Number(coupon.valueAmount) || 0) / 100).toFixed(0)}`, unit: "off" };
}

function durationLabel(coupon) {
  if (coupon.durationType === "once") return "One-time";
  if (coupon.durationType === "forever") return "Forever";
  return `${coupon.durationMonths || 1} months`;
}

function plansLabel(coupon) {
  if (!coupon.applicablePlans?.length) return "All plans";
  return coupon.applicablePlans
    .map((id) => id.charAt(0).toUpperCase() + id.slice(1))
    .join(", ");
}

function billingLabel(coupon) {
  if (coupon.billingInterval === "monthly") return "Monthly";
  if (coupon.billingInterval === "yearly") return "Yearly";
  return "Monthly and yearly";
}

function usesLabel(coupon) {
  const used = Number(coupon.usedCount) || 0;
  if (coupon.maxRedemptions != null) {
    return used === 0 ? `None of ${coupon.maxRedemptions}` : `${used} of ${coupon.maxRedemptions}`;
  }
  if (used === 0) return "Not used yet";
  return used === 1 ? "1 time" : `${used} times`;
}

function endsLabel(coupon) {
  if (!coupon.expiryDate) return "No end date";
  const date = new Date(coupon.expiryDate);
  if (Number.isNaN(date.getTime())) return "No end date";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const EMPTY = {
  available: "No coupons are available right now.",
  used: "No coupons have been used yet.",
  expired: "No coupons have expired.",
};

const STUB = {
  available: "border-cyan-400/30 bg-cyan-400/10 text-cyan-100",
  used: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100",
  expired: "border-white/10 bg-white/5 text-blue-100/70",
};

export default function OwnerCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [tab, setTab] = useState("available");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/coupons");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Could not load coupons");
        if (!cancelled) setCoupons(data.coupons || []);
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load coupons");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = coupons.filter((coupon) => discountBuckets(coupon)[tab]);

  return (
    <div className="mt-6">
      {loading ? <p className="text-sm text-blue-100">Loading coupons…</p> : null}
      {error ? (
        <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      ) : null}
      {!loading && !error ? (
        <>
          <CouponStatusTabs discounts={coupons} active={tab} onChange={setTab} align="start" />
          {visible.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/15 px-4 py-10 text-center text-sm text-blue-200/70">
              {EMPTY[tab]}
            </p>
          ) : (
            <ul className="grid gap-3">
              {visible.map((coupon) => {
                const offer = offerParts(coupon);
                const facts = [
                  ["Duration", durationLabel(coupon)],
                  ["Plans", plansLabel(coupon)],
                  ["Billing", billingLabel(coupon)],
                  ["Redeemed", usesLabel(coupon)],
                  ["Ends", endsLabel(coupon)],
                ];
                return (
                  <li
                    key={coupon.id}
                    className="flex overflow-hidden rounded-2xl border border-white/10 bg-[#07122a]/80"
                  >
                    <div
                      className={`flex w-28 shrink-0 flex-col items-center justify-center border-r border-dashed px-3 text-center ${STUB[tab]}`}
                    >
                      <p className="font-[family-name:var(--font-display)] text-3xl font-semibold leading-none">
                        {offer.amount}
                      </p>
                      <p className="mt-2 text-xs font-semibold tracking-[0.14em] uppercase">{offer.unit}</p>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-4 px-5 py-4 lg:flex-row lg:items-center">
                      <div className="min-w-0 lg:w-56 lg:shrink-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-mono text-lg font-semibold tracking-[0.08em] text-white">
                            {coupon.code || "Launch offer"}
                          </p>
                          <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold tracking-wide text-blue-100 uppercase">
                            {coupon.type === "promotion" ? "Offer" : "Coupon"}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-base text-blue-100">{coupon.name}</p>
                      </div>
                      <dl className="grid min-w-0 flex-1 grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
                        {facts.map(([label, value]) => (
                          <div key={label} className="min-w-0">
                            <dt className="text-xs font-semibold tracking-[0.08em] text-blue-200/55 uppercase">
                              {label}
                            </dt>
                            <dd className="mt-1 truncate text-sm text-blue-50">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : null}
    </div>
  );
}
