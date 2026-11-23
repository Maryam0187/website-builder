"use client";

import { useState, useEffect, useCallback, useRef } from "react";

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

function MessageUsButton({ onClick }) {
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onClick}
        className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
      >
        Message us
      </button>
      <p className="text-xs text-blue-200/60">
        Opens support chat and sends your domain details for you.
      </p>
    </div>
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

const PROVIDERS = [
  {
    id: "godaddy",
    label: "GoDaddy",
    oneClick: true,
    steps: "Sign in at GoDaddy, open your domain, then DNS. Add each record below using the Type, Name, and Value shown.",
  },
  {
    id: "namecheap",
    label: "Namecheap",
    oneClick: true,
    steps: "Sign in at Namecheap, open Domain List, choose Manage, then Advanced DNS. Add each record below.",
  },
  {
    id: "cloudflare",
    label: "Cloudflare",
    oneClick: true,
    steps: "Open your domain in Cloudflare, then DNS, then Add record. Paste each record below and leave the cloud grey so it stays DNS only.",
  },
  {
    id: "websouls",
    label: "WebSouls",
    oneClick: false,
    steps: "A domain-only WebSouls account cannot add these records in the client area. Message us and we will connect it. If you have hosting, open Plesk, then Hosting & DNS, then DNS Settings, add the records below, and click Update.",
  },
  {
    id: "google",
    label: "Google Domains",
    oneClick: false,
    steps: "Open the place you manage this domain, go to DNS, and add each record below.",
  },
  {
    id: "other",
    label: "Somewhere else",
    oneClick: false,
    steps: "Open the DNS settings where you bought the domain and add each record below.",
  },
];

function entriHost(name, domain) {
  const host = String(name || "").trim().replace(/\.$/, "");
  if (!host || host === "@" || host.toLowerCase() === String(domain || "").toLowerCase()) return "@";
  const suffix = `.${String(domain || "").toLowerCase()}`;
  if (host.toLowerCase().endsWith(suffix)) return host.slice(0, -suffix.length);
  return host;
}

function toEntriRecords(records, domain) {
  return (records || [])
    .filter((record) => record?.type && record?.value)
    .map((record) => ({
      type: String(record.type).toUpperCase(),
      host: entriHost(record.name, domain),
      value: String(record.value).trim(),
      ttl: 300,
    }));
}

function helpMessage(domain, providerLabel, records) {
  const lines = [
    "Please connect my domain. I could not connect it automatically.",
    "",
    `Domain: ${domain}`,
  ];
  if (providerLabel) lines.push(`Bought at: ${providerLabel}`);
  lines.push("");
  for (const record of records || []) {
    if (!record?.type || !record?.value) continue;
    lines.push(String(record.type).toUpperCase());
    lines.push(`Name: ${record.name || "@"}`);
    lines.push(`Value: ${record.value}`);
    lines.push("");
  }
  return lines.join("\n").trim();
}

function loadEntri() {
  if (typeof window === "undefined") return Promise.reject(new Error("Unavailable"));
  if (window.entri) return Promise.resolve(window.entri);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-entri]");
    const finish = () => (window.entri ? resolve(window.entri) : reject(new Error("Connect window did not load")));
    if (existing) {
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener("error", () => reject(new Error("Connect window did not load")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.goentri.com/entri.js";
    script.async = true;
    script.dataset.entri = "1";
    script.onload = finish;
    script.onerror = () => reject(new Error("Connect window did not load"));
    document.body.appendChild(script);
  });
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
  onMessageUs,
}) {
  const [domain, setDomain] = useState(currentDomain || "");
  const [dnsRecords, setDnsRecords] = useState(cfValidationRecords || []);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sslStatus, setSslStatus] = useState(cfSslStatus || null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [assist, setAssist] = useState("auto");
  const [providerId, setProviderId] = useState("");
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    setDomain(currentDomain || "");
    setSslStatus(cfSslStatus || null);
    if (cfValidationRecords && Array.isArray(cfValidationRecords)) {
      setDnsRecords(cfValidationRecords);
    }
  }, [currentDomain, domainStatus, cfValidationRecords, cfSslStatus]);

  useEffect(() => {
    setAssist("auto");
    setProviderId("");
  }, [currentDomain]);

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

  const checkConnection = useCallback(async ({ quiet = false } = {}) => {
    if (!currentDomain) return;

    if (!quiet) {
      setVerifying(true);
      setError("");
    }

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
        if (!quiet) setError(data.error || "Could not check connection");
        return;
      }

      if (data.verified) {
        setSuccess("Your website is connected and ready!");
        setError("");
        onUpdateRef.current?.(data);
      } else if (!quiet) {
        setError(data.message || "Still waiting for your domain settings to update");
      }
    } catch (err) {
      if (!quiet) setError("Could not check connection. Please try again.");
    } finally {
      if (!quiet) setVerifying(false);
    }
  }, [currentDomain, siteId]);

  useEffect(() => {
    if (!currentDomain || domainStatus !== "pending") return;
    const first = setTimeout(() => checkConnection({ quiet: true }), 10000);
    const interval = setInterval(() => checkConnection({ quiet: true }), 60000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [currentDomain, domainStatus, checkConnection]);

  const connectAutomatically = async () => {
    if (!currentDomain || connecting) return;
    setConnecting(true);
    setError("");
    try {
      const res = await fetch("/api/site/domain-connect", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.available || !data.token || !data.applicationId) {
        setAssist("pick");
        return;
      }

      const entri = await loadEntri();
      const launch = entri.connectDomain || entri.showEntri || entri.showUnify;
      if (typeof launch !== "function") {
        setAssist("pick");
        return;
      }

      const detail = await new Promise((resolve, reject) => {
        function onClose(event) {
          window.removeEventListener("onEntriClose", onClose);
          resolve(event?.detail || {});
        }
        window.addEventListener("onEntriClose", onClose);
        try {
          const opened = launch.call(entri, {
            applicationId: data.applicationId,
            token: data.token,
            prefilledDomain: currentDomain,
            dnsRecords: toEntriRecords(dnsRecords, currentDomain),
            userId: siteId,
          });
          if (opened && typeof opened.then === "function") {
            opened.catch((err) => {
              window.removeEventListener("onEntriClose", onClose);
              reject(err);
            });
          }
        } catch (err) {
          window.removeEventListener("onEntriClose", onClose);
          reject(err);
        }
      });

      if (detail.success) {
        await checkConnection({ quiet: false });
      } else {
        setAssist("pick");
      }
    } catch {
      setAssist("pick");
    } finally {
      setConnecting(false);
    }
  };

  const sendHelp = () => {
    if (!currentDomain || !onMessageUs) return;
    const provider = PROVIDERS.find((item) => item.id === providerId);
    onMessageUs({
      onceKey: `${siteId}:${currentDomain}`,
      body: helpMessage(currentDomain, provider?.label, dnsRecords),
    });
  };

  const provider = PROVIDERS.find((item) => item.id === providerId);

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

          {domainStatus === "pending" ? (
            <div className="space-y-4">
              {assist === "auto" ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4">
                    <p className="text-sm font-semibold text-cyan-100">
                      Step 2: Connect automatically
                    </p>
                    <p className="mt-1 text-xs text-blue-200/70">
                      Works if you bought the domain at GoDaddy, Namecheap, or Cloudflare. You sign in there, and we add the settings.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={connectAutomatically}
                    disabled={connecting}
                    className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-semibold transition hover:from-cyan-400 hover:to-blue-500 disabled:opacity-60"
                  >
                    {connecting ? "Opening connect…" : "Connect automatically"}
                  </button>
                </div>
              ) : null}

              {assist === "pick" ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-4">
                    <p className="text-sm font-semibold text-amber-100">
                      We couldn&apos;t connect it automatically
                    </p>
                    <p className="mt-1 text-xs text-blue-200/70">
                      Where did you buy this domain?
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {PROVIDERS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setProviderId(item.id);
                          setAssist("guide");
                          setError("");
                        }}
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-medium text-white hover:border-cyan-400/40 hover:bg-cyan-500/10"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <MessageUsButton onClick={sendHelp} />
                </div>
              ) : null}

              {assist === "guide" && provider ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-4">
                    <p className="text-sm font-semibold text-amber-100">{provider.label}</p>
                    <p className="mt-1 text-xs text-blue-200/70">{provider.steps}</p>
                  </div>
                  {provider.oneClick ? (
                    <button
                      type="button"
                      onClick={connectAutomatically}
                      disabled={connecting}
                      className="rounded-full border border-cyan-400/40 bg-cyan-500/15 px-5 py-2.5 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/25 disabled:opacity-60"
                    >
                      {connecting ? "Opening connect…" : "Try connect again"}
                    </button>
                  ) : null}
                  {dnsRecords.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-xs text-blue-200/70">
                        Paste these values exactly as shown. Changes usually take a few minutes.
                      </p>
                      {dnsRecords.map((record, index) => (
                        <DnsRecordCard key={index} record={record} index={index} />
                      ))}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-3">
                    <MessageUsButton onClick={sendHelp} />
                    <button
                      type="button"
                      onClick={() => setAssist("pick")}
                      className="text-sm text-white/60 hover:text-white"
                    >
                      Choose a different provider
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="space-y-3">
                <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4">
                  <p className="text-sm font-semibold text-cyan-100">
                    Step 3: Check your connection
                  </p>
                  <p className="mt-1 text-xs text-blue-200/70">
                    After the settings are saved, we check every minute. You can also check now.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => checkConnection({ quiet: false })}
                  disabled={verifying}
                  className="rounded-full border border-cyan-400/40 bg-cyan-500/15 px-6 py-3 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/25 disabled:opacity-60"
                >
                  {verifying ? "Checking…" : "Check connection"}
                </button>
                <p className="text-xs text-blue-200/60">
                  Changes usually take a few minutes.
                </p>
              </div>
            </div>
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
