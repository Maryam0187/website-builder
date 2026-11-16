"use client";

import { useState } from "react";
import { ALL_REGIONS } from "@/lib/region-detection";

export default function RegionSelector({ 
  selectedRegion, 
  onRegionChange, 
  regions = null,
  className = "" 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const source = regions?.length ? regions : ALL_REGIONS;
  const choices = source.filter((region) => region.enabled !== false || region.id === selectedRegion);
  const currentRegion = choices.find(r => r.id === selectedRegion) || source.find(r => r.id === selectedRegion) || choices[0];

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-white/15 bg-[#040b1a] px-4 py-2 text-white transition-colors hover:border-cyan-400/50"
      >
        <svg className="h-5 w-5 text-cyan-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="font-medium text-white">{currentRegion.name}</span>
        <svg className={`h-4 w-4 text-cyan-200 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 z-20 mt-2 w-64 rounded-lg border border-white/15 bg-[#040b1a] shadow-lg">
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-blue-200/70">
                Select your region
              </div>
              {choices.map((region) => (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => {
                    onRegionChange(region.id);
                    setIsOpen(false);
                  }}
                  className={`w-full rounded-md px-3 py-2 text-left transition-colors hover:bg-white/10 ${
                    region.id === selectedRegion ? "bg-cyan-500/15 text-cyan-100" : "text-white"
                  }`}
                >
                  <div className="font-medium text-inherit">{region.name}</div>
                  <div className={`text-xs ${region.id === selectedRegion ? "text-cyan-200/80" : "text-blue-200/70"}`}>
                    {region.currency} • {region.stripe ? "Card payment" : "Contact us"}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function RegionBanner({ region, onChangeRegion }) {
  const regionInfo = ALL_REGIONS.find(r => r.id === region);
  if (!regionInfo) return null;

  const isPakistan = region === "pakistan";

  return (
    <div className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border px-5 py-4 ${
      isPakistan
        ? "border-amber-400/25 bg-amber-500/10"
        : "border-white/10 bg-[#07122a]/80"
    }`}>
      <div className="flex min-w-0 items-start gap-3">
        <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          isPakistan ? "bg-amber-400/15 text-amber-200" : "bg-cyan-400/15 text-cyan-200"
        }`}>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12h18M12 3c2.2 2.4 3.4 5.5 3.4 9s-1.2 6.6-3.4 9c-2.2-2.4-3.4-5.5-3.4-9s1.2-6.6 3.4-9z" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
            {regionInfo.name}
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
              isPakistan ? "bg-amber-400/20 text-amber-100" : "bg-white/10 text-cyan-100"
            }`}>
              {regionInfo.currency}
            </span>
          </p>
          <p className={`mt-1 text-sm ${isPakistan ? "text-amber-100/80" : "text-blue-100/75"}`}>
            {isPakistan
              ? "Contact us to activate your plan with a local payment method."
              : "Pay securely with card. Your subscription starts as soon as payment goes through."}
          </p>
        </div>
      </div>
      {onChangeRegion ? (
        <button
          type="button"
          onClick={onChangeRegion}
          className="shrink-0 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-white/5"
        >
          Change region
        </button>
      ) : null}
    </div>
  );
}
