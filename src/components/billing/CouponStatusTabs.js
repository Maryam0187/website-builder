"use client";

import { discountBuckets } from "@/lib/discount-buckets";

export default function CouponStatusTabs({ discounts, active, onChange, align = "center" }) {
  const tabs = [
    { id: "available", label: "Available" },
    { id: "used", label: "Used" },
    { id: "expired", label: "Expired" },
  ];
  return (
    <div className={`mb-4 flex ${align === "start" ? "justify-start" : "justify-center"}`}>
      <div
        role="tablist"
        aria-label="Coupon status"
        className="inline-flex h-10 items-center rounded-full border border-white/10 bg-[#040b1a] p-1"
      >
        {tabs.map((tab) => {
          const count = discounts.filter((discount) => discountBuckets(discount)[tab.id]).length;
          const selected = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(tab.id)}
              className={`inline-flex h-8 items-center gap-2 rounded-full px-4 text-sm font-semibold leading-none ${
                selected ? "bg-white text-[#041018]" : "text-blue-100 hover:text-white"
              }`}
            >
              {tab.label}
              <span className={`text-[10px] font-bold leading-none ${selected ? "text-cyan-700" : "text-cyan-300"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
