"use client";

import { useState, useEffect } from "react";

const inputClass =
  "w-full rounded-lg border border-white/15 bg-[#040b1a] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 disabled:opacity-60";

function CopyButton({ text, label = "Copy" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold transition hover:from-cyan-400 hover:to-blue-500"
    >
      {copied ? "✓ Copied!" : label}
    </button>
  );
}

function DnsRecordCard({ record, index }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#040b1a]/50 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">
            Record {index + 1} {record.note && <span className="text-xs font-normal text-blue-200/70">({record.note})</span>}
          </p>
          {record.description && (
            <p className="mt-1 text-xs text-blue-200/70">{record.description}</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="mb-1.5 text-xs font-medium text-blue-200/80">Type</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <code className="text-sm text-white">{record.type}</code>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-blue-200/80">Host / Name</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <code className="break-all text-sm text-white">{record.name}</code>
            </div>
            <CopyButton text={record.name} label="Copy" />
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-blue-200/80">Points to / Value</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <code className="break-all text-sm text-white">{record.value}</code>
            </div>
            <CopyButton text={record.value} label="Copy" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, sslStatus }) {
  let color, icon, text;

  if (status === "verified") {
    color = "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
    icon = "✓";
    text = "Connected";
  } else if (status === "pending") {
    color = "border-amber-400/30 bg-amber-500/10 text-amber-200";
    icon = "⏳";
    text = "Waiting for setup";
  } else if (status === "error" || status === "failed") {
    color = "border-rose-400/30 bg-rose-500/10 text-rose-200";
    icon = "⚠";
    text = "Needs attention";
  } else {
    color = "border-white/10 bg-white/5 text-blue-100";
    icon = "○";
    text = "Not set up";
  }

  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${color}`}>
      <span>{icon}</span>
      <span>{text}</span>
    </div>
  );
}

export default function CustomDomainSetup({
  siteId,
  currentDomain,
  domainStatus = "none",
  cfValidationRecords = null,
  cfSslStatus = null,
  canEdit = true,
  onUpdate,
}) {
  const [domain, setDomain] = useState(currentDomain || "");
  const [dnsRecords, setDnsRecords] = useState(cfValidationRecords || []);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sslStatus, setSslStatus] = useState(cfSslStatus || null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    setDomain(currentDomain || "");
    setSslStatus(cfSslStatus || null);
    if (cfValidationRecords && Array.isArray(cfValidationRecords)) {
      setDnsRecords(cfValidationRecords);
    }
  }, [currentDomain, domainStatus, cfValidationRecords, cfSslStatus]);

  useEffect(() => {
    // Auto-verify if domain is pending
    if (currentDomain && domainStatus === "pending") {
      const timer = setTimeout(() => {
        checkConnection();
      }, 10000); // Check after 10 seconds
      return () => clearTimeout(timer);
    }
  }, [currentDomain, domainStatus]);

  const handleDomainChange = (e) => {
    const cleaned = e.target.value
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "") // Remove www - we'll handle it automatically
      .replace(/\/$/, "")
      .trim();
    setDomain(cleaned);
    setError("");
    setSuccess("");
  };

  const handleConnect = async () => {
    const trimmed = domain.trim();
    if (!trimmed) {
      setError("Please enter your website address");
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
        setError(data.error || "Could not set up domain");
        return;
      }

      setSuccess("Domain set up! Follow the steps below to connect it.");
      setDnsRecords(data.validationRecords || data.dnsRecords || []);
      if (onUpdate) onUpdate(data);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const checkConnection = async () => {
    if (!currentDomain) return;

    setVerifying(true);
    setError("");

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
        setError(data.error || "Could not check connection");
        return;
      }

      if (data.verified) {
        setSuccess("Your website is connected and ready!");
        if (onUpdate) onUpdate(data);
      } else {
        const msg = data.message || "Still waiting for your domain settings to update";
        setError(msg);
      }
    } catch (err) {
      setError("Could not check connection. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const handleRemove = async () => {
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
      setSuccess("Domain removed");
      if (onUpdate) onUpdate(data);
    } catch (err) {
      setError("Could not remove domain. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const isApex = currentDomain && !currentDomain.includes("www.") && currentDomain.split(".").length === 2;

  return (
    <div className="space-y-6">
      {!currentDomain || domainStatus === "none" ? (
        // Step 1: Enter domain
        <div className="space-y-4">
          <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4">
            <p className="text-sm font-semibold text-cyan-100">
              Step 1: Enter your website address
            </p>
            <p className="mt-1 text-xs text-blue-200/70">
              Example: mybusiness.com or yourbrand.com
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-blue-100">
              Your website address
            </label>
            <input
              type="text"
              className={inputClass}
              value={domain}
              onChange={handleDomainChange}
              placeholder="mybusiness.com"
              disabled={!canEdit || saving}
            />
            <p className="mt-2 text-xs text-blue-200/70">
              Don't include www or https:// — just your main address
            </p>
          </div>

          <button
            type="button"
            onClick={handleConnect}
            disabled={!domain.trim() || saving}
            className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-semibold transition hover:from-cyan-400 hover:to-blue-500 disabled:opacity-60"
          >
            {saving ? "Setting up…" : "Continue"}
          </button>
        </div>
      ) : (
        // Steps 2-4: DNS setup and verification
        <div className="space-y-6">
          {/* Header with domain and status */}
          <div className="rounded-xl border border-white/10 bg-[#07122a]/70 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold tracking-wide text-blue-200/70 uppercase">
                  Your website address
                </p>
                <p className="mt-1 break-all text-lg font-semibold text-white">
                  {currentDomain}
                </p>
                {isApex && (
                  <p className="mt-1 text-xs text-blue-200/70">
                    We'll connect both {currentDomain} and www.{currentDomain}
                  </p>
                )}
                <div className="mt-3">
                  <StatusBadge status={domainStatus} sslStatus={sslStatus} />
                </div>
              </div>
              {canEdit && domainStatus !== "verified" ? (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={saving}
                  className="shrink-0 text-xs text-white/50 hover:text-white disabled:opacity-50"
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>

          {domainStatus === "pending" && dnsRecords.length > 0 ? (
            <>
              {/* Step 2: Add DNS records */}
              <div className="space-y-4">
                <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-4">
                  <p className="text-sm font-semibold text-amber-100">
                    Step 2: Add these records at your domain provider
                  </p>
                  <p className="mt-1 text-xs text-blue-200/70">
                    Go to the website where you bought your domain (GoDaddy, Namecheap, Google Domains, etc.) and find the DNS or Domain Settings page.
                  </p>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-blue-200/80">
                    💡 Paste these values exactly as shown. Changes usually take 5-30 minutes, but can take up to 24 hours.
                  </p>
                </div>

                <div className="space-y-3">
                  {dnsRecords.map((record, index) => (
                    <DnsRecordCard key={index} record={record} index={index} />
                  ))}
                </div>
              </div>

              {/* Step 3: Check connection */}
              <div className="space-y-4">
                <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4">
                  <p className="text-sm font-semibold text-cyan-100">
                    Step 3: Check your connection
                  </p>
                  <p className="mt-1 text-xs text-blue-200/70">
                    After adding the records, click below to check if everything is connected.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={checkConnection}
                  disabled={verifying}
                  className="rounded-full border border-cyan-400/40 bg-cyan-500/15 px-6 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/25 disabled:opacity-60"
                >
                  {verifying ? "Checking…" : "Check connection"}
                </button>

                <p className="text-xs text-blue-200/60">
                  We'll check automatically every minute. You can also click this button anytime.
                </p>
              </div>
            </>
          ) : null}

          {domainStatus === "verified" ? (
            // Step 4: Connected!
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-5">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">✓</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-emerald-100">
                      Your website is connected!
                    </p>
                    <p className="mt-1 text-xs text-emerald-200/80">
                      Your website is now live at https://{currentDomain}
                      {isApex && ` and https://www.${currentDomain}`}
                    </p>
                    <p className="mt-2 text-xs text-blue-200/70">
                      You can now publish your website and it will appear at your custom address.
                    </p>
                  </div>
                </div>
              </div>

              {canEdit ? (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={saving}
                  className="text-sm text-white/60 hover:text-white disabled:opacity-50"
                >
                  Remove this domain
                </button>
              ) : null}
            </div>
          ) : null}

          {/* Advanced details (optional) */}
          {showAdvanced && (
            <div className="rounded-lg border border-white/10 bg-[#040b1a]/50 p-4">
              <p className="text-xs font-semibold text-white">Technical Details</p>
              <div className="mt-3 space-y-2 text-xs text-blue-200/70">
                <p>Status: {domainStatus}</p>
                {sslStatus && <p>Security: {sslStatus === 'active' ? 'Secure (SSL active)' : 'Setting up security…'}</p>}
                {cfSslStatus && <p>Raw SSL status: {cfSslStatus}</p>}
              </div>
            </div>
          )}

          {!showAdvanced && domainStatus !== "verified" && (
            <button
              type="button"
              onClick={() => setShowAdvanced(true)}
              className="text-xs text-blue-200/60 hover:text-blue-200"
            >
              Show technical details
            </button>
          )}
        </div>
      )}

      {/* Error messages */}
      {error ? (
        <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-3">
          <p className="text-sm text-rose-200">{error}</p>
          {error.includes("waiting") || error.includes("propagate") ? (
            <p className="mt-2 text-xs text-rose-200/70">
              This is normal — DNS changes take time. Try checking again in a few minutes.
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Success messages */}
      {success ? (
        <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-3">
          <p className="text-sm text-emerald-200">{success}</p>
        </div>
      ) : null}
    </div>
  );
}
