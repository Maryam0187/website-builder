"use client";

import { useState, useEffect } from "react";
import { ALL_REGIONS } from "@/lib/region-detection";

export default function RegionSelector({ 
  selectedRegion, 
  onRegionChange, 
  className = "" 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const currentRegion = ALL_REGIONS.find(r => r.id === selectedRegion) || ALL_REGIONS[0];

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
      >
        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="font-medium">{currentRegion.name}</span>
        <svg className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                Select Your Region
              </div>
              {ALL_REGIONS.map((region) => (
                <button
                  key={region.id}
                  onClick={() => {
                    onRegionChange(region.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 transition-colors ${
                    region.id === selectedRegion ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  <div className="font-medium">{region.name}</div>
                  <div className="text-xs text-gray-500">
                    {region.currency} • {region.stripe ? 'Card payment' : 'Contact us'}
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
