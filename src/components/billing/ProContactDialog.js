"use client";

import { useState } from "react";

const inputClass =
  "w-full rounded-lg border border-white/15 bg-[#040b1a] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30";

export default function ProContactDialog({ open, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
    websiteCount: "1",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const res = await fetch("/api/billing/contact-pro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to submit request");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onClose?.();
        setSuccess(false);
        setFormData({ name: "", email: "", message: "", websiteCount: "1" });
      }, 2000);
    } catch (err) {
      setError("Network error. Please try again or email hello@technonaire.com");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={busy ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-3xl border border-white/10 bg-[#07122a] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-bold tracking-[0.14em] text-cyan-300/90 uppercase">
          Pro + PWA
        </p>
        <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold text-white">
          Contact us about Pro + PWA
        </h3>
        
        {success ? (
          <div className="mt-6">
            <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-3">
              <p className="text-sm font-medium text-emerald-200">
                ✓ Thank you! We'll contact you within 1 business day.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <p className="text-sm leading-6 text-blue-100/85">
              Pro + PWA includes everything in Domain plan plus installable Progressive Web App capabilities. 
              Let us know what you need.
            </p>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-blue-100">
                Your name
              </label>
              <input
                type="text"
                className={inputClass}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={busy}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-blue-100">
                Email
              </label>
              <input
                type="email"
                className={inputClass}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={busy}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-blue-100">
                Number of websites
              </label>
              <select
                className={inputClass}
                value={formData.websiteCount}
                onChange={(e) => setFormData({ ...formData, websiteCount: e.target.value })}
                required
                disabled={busy}
              >
                <option value="1">1 website</option>
                <option value="2">2 websites</option>
                <option value="3">3 websites</option>
                <option value="4">4 websites</option>
                <option value="5+">5+ websites</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-blue-100">
                Tell us about your needs
              </label>
              <textarea
                className={inputClass}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={4}
                required
                disabled={busy}
                placeholder="What features are you looking for? When do you need it?"
              />
            </div>

            {error ? (
              <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-3">
                <p className="text-sm text-rose-200">{error}</p>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={onClose}
                className="rounded-full px-4 py-2.5 text-sm font-medium text-blue-100 hover:bg-white/5 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-full border border-cyan-400/40 bg-cyan-500/20 px-5 py-2.5 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-60"
              >
                {busy ? "Sending…" : "Send inquiry"}
              </button>
            </div>

            <p className="text-xs text-blue-200/70 text-center">
              Or email us directly at{" "}
              <a
                href="mailto:hello@technonaire.com?subject=Pro%20Plan%20Inquiry"
                className="text-cyan-300 hover:underline"
              >
                hello@technonaire.com
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
