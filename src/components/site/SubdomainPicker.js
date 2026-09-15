"use client";

import { useState, useEffect } from "react";

const inputClass =
  "w-full rounded-lg border border-white/15 bg-[#040b1a] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 disabled:opacity-60";

export default function SubdomainPicker({
  siteId,
  currentSubdomain,
  canEdit = true,
  onUpdate,
}) {
  const [subdomain, setSubdomain] = useState(currentSubdomain || "");
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availability, setAvailability] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setSubdomain(currentSubdomain || "");
  }, [currentSubdomain]);

  const normalizeInput = (value) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .replace(/^-+|-+$/g, "")
      .slice(0, 63);
  };

  const handleInputChange = (e) => {
    const normalized = normalizeInput(e.target.value);
    setSubdomain(normalized);
    setAvailability(null);
    setError("");
    setSuccess("");
  };

  const checkAvailability = async () => {
    const trimmed = subdomain.trim();
    if (!trimmed) {
      setError("Please enter a subdomain");
      return;
    }

    if (trimmed === currentSubdomain) {
      setError("This is your current address");
      return;
    }

    setChecking(true);
    setError("");
    setAvailability(null);

    try {
      const res = await fetch(
        `/api/site/address?action=check-subdomain&subdomain=${encodeURIComponent(trimmed)}`
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not check availability");
        return;
      }

      setAvailability(data);
      if (data.normalized && data.normalized !== trimmed) {
        setSubdomain(data.normalized);
      }
    } catch (err) {
      setError("Failed to check availability");
    } finally {
      setChecking(false);
    }
  };

  const handleClaim = async () => {
    if (!availability?.available) {
      setError("Please check availability first");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const action = currentSubdomain ? "update-subdomain" : "claim-subdomain";
      const res = await fetch("/api/site/address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          siteId,
          subdomain: availability.normalized,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not claim subdomain");
        return;
      }

      setSuccess(data.message || "Subdomain claimed successfully");
      setAvailability(null);
      if (onUpdate) onUpdate(data);
    } catch (err) {
      setError("Failed to claim subdomain");
    } finally {
      setSaving(false);
    }
  };

  const hasChanged = subdomain && subdomain !== currentSubdomain;
  const canCheck = hasChanged && subdomain.length >= 3 && !checking && !saving;
  const canClaim = availability?.available && !saving;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium text-blue-100">
              Choose your Technonaire address
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                className={inputClass}
                value={subdomain}
                onChange={handleInputChange}
                placeholder="my-business"
                disabled={!canEdit || saving}
                minLength={3}
                maxLength={63}
              />
              <span className="shrink-0 text-sm text-blue-200/70">.technonaire.site</span>
            </div>
          </div>
          {canCheck ? (
            <button
              type="button"
              onClick={checkAvailability}
              disabled={checking}
              className="shrink-0 rounded-lg border border-cyan-400/40 bg-cyan-500/15 px-4 py-2.5 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/25 disabled:opacity-60"
            >
              {checking ? "Checking…" : "Check"}
            </button>
          ) : null}
        </div>
        <p className="mt-1.5 text-xs text-blue-200/70">
          3-63 characters · letters, numbers, hyphens · no spaces
        </p>
      </div>

      {availability ? (
        <div
          className={`rounded-lg border px-4 py-3 ${
            availability.available
              ? "border-emerald-400/30 bg-emerald-500/10"
              : "border-amber-400/30 bg-amber-500/10"
          }`}
        >
          <p
            className={`text-sm font-medium ${
              availability.available ? "text-emerald-200" : "text-amber-200"
            }`}
          >
            {availability.available
              ? `✓ ${availability.normalized}.technonaire.site is available`
              : `✗ ${availability.reason || "Not available"}`}
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-3">
          <p className="text-sm text-rose-200">{error}</p>
        </div>
      ) : null}

      {success ? (
        <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-3">
          <p className="text-sm text-emerald-200">{success}</p>
        </div>
      ) : null}

      {canClaim ? (
        <button
          type="button"
          onClick={handleClaim}
          disabled={saving}
          className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold transition hover:from-cyan-400 hover:to-blue-500 disabled:opacity-60"
        >
          {saving
            ? currentSubdomain
              ? "Updating…"
              : "Claiming…"
            : currentSubdomain
              ? "Update address"
              : "Claim this address"}
        </button>
      ) : null}
    </div>
  );
}
