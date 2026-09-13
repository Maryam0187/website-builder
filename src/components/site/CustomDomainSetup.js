"use client";

import { useState, useEffect } from "react";

const inputClass =
  "w-full rounded-lg border border-white/15 bg-[#040b1a] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 disabled:opacity-60";

function DnsRecordRow({ record }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2 rounded-lg border border-white/10 bg-[#040b1a]/50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-cyan-200 uppercase">{record.type} Record</p>
          <p className="mt-1 text-xs text-blue-200/70">{record.description}</p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-semibold tracking-wider text-white/40 uppercase">Name / Host</p>
          <div className="mt-1 flex items-center gap-1">
            <code className="flex-1 truncate rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-white">
              {record.name}
            </code>
            <button
              type="button"
              onClick={() => handleCopy(record.name)}
              className="shrink-0 rounded px-2 py-1 text-[10px] text-cyan-200 hover:bg-cyan-500/10"
              title="Copy"
            >
              {copied ? "✓" : "Copy"}
            </button>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-semibold tracking-wider text-white/40 uppercase">Value / Points to</p>
          <div className="mt-1 flex items-center gap-1">
            <code className="flex-1 truncate rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-white">
              {record.value}
            </code>
            <button
              type="button"
              onClick={() => handleCopy(record.value)}
              className="shrink-0 rounded px-2 py-1 text-[10px] text-cyan-200 hover:bg-cyan-500/10"
              title="Copy"
            >
              {copied ? "✓" : "Copy"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CustomDomainSetup({
  siteId,
  currentDomain,
  domainStatus = "none",
  canEdit = true,
  onUpdate,
}) {
  const [domain, setDomain] = useState(currentDomain || "");
  const [dnsRecords, setDnsRecords] = useState([]);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [verificationResult, setVerificationResult] = useState(null);

  useEffect(() => {
    setDomain(currentDomain || "");
    if (currentDomain && domainStatus === "pending") {
      loadDnsRecords(currentDomain);
    }
  }, [currentDomain, domainStatus]);

  useEffect(() => {
    // Auto-verify if domain is pending
    if (currentDomain && domainStatus === "pending") {
      const timer = setTimeout(() => {
        checkDns();
      }, 5000); // Check after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [currentDomain, domainStatus]);

  const loadDnsRecords = async (domainName) => {
    try {
      const res = await fetch(
        `/api/site/address?action=get-dns-records&domain=${encodeURIComponent(domainName)}`
      );
      if (res.ok) {
        const data = await res.json();
        setDnsRecords(data.records || []);
      }
    } catch (err) {
      console.error("Failed to load DNS records:", err);
    }
  };

  const handleDomainChange = (e) => {
    const cleaned = e.target.value
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "")
      .trim();
    setDomain(cleaned);
    setError("");
    setSuccess("");
    setVerificationResult(null);
  };

  const handleSetDomain = async () => {
    const trimmed = domain.trim();
    if (!trimmed) {
      setError("Please enter your domain");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    setDnsRecords([]);

    try {
      const res = await fetch("/api/site/address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set-custom-domain",
          siteId,
          domain: trimmed,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not set domain");
        return;
      }

      setSuccess(data.message || "Domain added successfully");
      setDnsRecords(data.dnsRecords || []);
      if (onUpdate) onUpdate(data);
    } catch (err) {
      setError("Failed to set domain");
    } finally {
      setSaving(false);
    }
  };

  const checkDns = async () => {
    if (!currentDomain) return;

    setVerifying(true);
    setError("");
    setVerificationResult(null);

    try {
      const res = await fetch("/api/site/address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify-domain",
          siteId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "DNS verification failed");
        return;
      }

      setVerificationResult(data);
      if (data.verified) {
        setSuccess("DNS verified! Your domain is ready.");
        if (onUpdate) onUpdate(data);
      } else {
        setError(data.message || "DNS not ready yet");
      }
    } catch (err) {
      setError("Failed to verify DNS");
    } finally {
      setVerifying(false);
    }
  };

  const handleRemoveDomain = async () => {
    if (!window.confirm("Remove this domain? You can add it again later.")) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/site/address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove-domain",
          siteId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not remove domain");
        return;
      }

      setDomain("");
      setDnsRecords([]);
      setVerificationResult(null);
      setSuccess("Domain removed");
      if (onUpdate) onUpdate(data);
    } catch (err) {
      setError("Failed to remove domain");
    } finally {
      setSaving(false);
    }
  };

  const statusColor =
    domainStatus === "verified"
      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
      : domainStatus === "pending"
        ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
        : "border-white/10 bg-white/5 text-blue-100";

  return (
    <div className="space-y-4">
      {!currentDomain || domainStatus === "none" ? (
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-blue-100">
              Enter your domain
            </label>
            <input
              type="text"
              className={inputClass}
              value={domain}
              onChange={handleDomainChange}
              placeholder="example.com or www.example.com"
              disabled={!canEdit || saving}
            />
            <p className="mt-1.5 text-xs text-blue-200/70">
              Don't include https:// — just the domain name
            </p>
          </div>

          <button
            type="button"
            onClick={handleSetDomain}
            disabled={!domain.trim() || saving}
            className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold transition hover:from-cyan-400 hover:to-blue-500 disabled:opacity-60"
          >
            {saving ? "Adding domain…" : "Add domain"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className={`rounded-lg border px-4 py-3 ${statusColor}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold tracking-wide uppercase opacity-80">
                  {domainStatus === "verified"
                    ? "Connected domain"
                    : domainStatus === "pending"
                      ? "Pending verification"
                      : "Custom domain"}
                </p>
                <p className="mt-1 break-all text-sm font-medium">{currentDomain}</p>
              </div>
              {canEdit ? (
                <button
                  type="button"
                  onClick={handleRemoveDomain}
                  disabled={saving}
                  className="shrink-0 text-xs text-white/70 hover:text-white disabled:opacity-50"
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>

          {domainStatus === "pending" && dnsRecords.length > 0 ? (
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-white">Configure DNS records</h4>
                <p className="mt-1 text-xs text-blue-200/70">
                  Add these records at your domain registrar (Namecheap, GoDaddy, etc.). DNS
                  changes can take a few minutes to propagate.
                </p>
              </div>

              <div className="space-y-2">
                {dnsRecords.map((record, index) => (
                  <DnsRecordRow key={index} record={record} />
                ))}
              </div>

              <button
                type="button"
                onClick={checkDns}
                disabled={verifying}
                className="rounded-full border border-cyan-400/40 bg-cyan-500/15 px-5 py-2.5 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/25 disabled:opacity-60"
              >
                {verifying ? "Checking DNS…" : "Verify DNS"}
              </button>
            </div>
          ) : null}

          {domainStatus === "verified" ? (
            <div className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-4 py-3">
              <p className="text-sm text-emerald-200">
                ✓ DNS verified · SSL active · Your site is live at https://{currentDomain}
              </p>
            </div>
          ) : null}
        </div>
      )}

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
    </div>
  );
}
