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

export function RegionBanner({ region }) {
  const regionInfo = ALL_REGIONS.find(r => r.id === region);
  if (!regionInfo) return null;

  const isPakistan = region === 'pakistan';

  return (
    <div className={`rounded-lg p-4 ${isPakistan ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border border-blue-200'}`}>
      <div className="flex items-start gap-3">
        <svg className={`w-5 h-5 mt-0.5 ${isPakistan ? 'text-amber-600' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="flex-1">
          <div className={`font-medium ${isPakistan ? 'text-amber-900' : 'text-blue-900'}`}>
            {isPakistan ? 'Pakistan Region' : `${regionInfo.name} Region`}
          </div>
          <div className={`text-sm mt-1 ${isPakistan ? 'text-amber-700' : 'text-blue-700'}`}>
            {isPakistan 
              ? 'Contact us to activate your plan with local payment methods.'
              : `Pay securely with card (${regionInfo.currency}). Start your subscription instantly.`
            }
          </div>
        </div>
      </div>
    </div>
  );
}
