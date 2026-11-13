"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ActivationRequestForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    planId: searchParams.get("planId") || "starter",
    name: "",
    email: "",
    phone: "",
    whatsapp: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#040b1a] via-[#071227] to-[#0a1a35] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="rounded-full w-16 h-16 bg-green-500/20 border-2 border-green-400 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <div className="text-white space-y-2">
            <h2 className="text-2xl font-bold">Request Submitted!</h2>
            <p className="text-blue-100">
              We've received your activation request. Our team will contact you within 24 hours to set up payment via JazzCash or EasyPaisa.
            </p>
          </div>
          
          <button
            onClick={() => router.push("/profile")}
            className="w-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 font-semibold transition hover:from-cyan-400 hover:to-blue-500"
          >
            Return to Profile
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/activation-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          region: "pakistan",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit request");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#040b1a] via-[#071227] to-[#0a1a35] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">Activate Your {formData.planId} Plan</h1>
          <p className="mt-2 text-blue-100/85">We'll contact you to set up local payment</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-[#07122a]/80 p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-blue-100 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-lg border border-white/15 bg-[#040b1a] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-100 mb-2">
              Email *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-lg border border-white/15 bg-[#040b1a] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-100 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full rounded-lg border border-white/15 bg-[#040b1a] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30"
              placeholder="+92 XXX XXXXXXX"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-100 mb-2">
              WhatsApp Number (optional)
            </label>
            <input
              type="tel"
              value={formData.whatsapp}
              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
              className="w-full rounded-lg border border-white/15 bg-[#040b1a] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30"
              placeholder="+92 XXX XXXXXXX"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-100 mb-2">
              Message (optional)
            </label>
            <textarea
              rows={4}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full rounded-lg border border-white/15 bg-[#040b1a] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30"
              placeholder="Any additional information..."
            />
          </div>

          {error && (
            <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-3">
              <p className="text-sm text-rose-200">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 font-semibold transition hover:from-cyan-400 hover:to-blue-500 disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit Request"}
          </button>

          <p className="text-xs text-center text-blue-200/60">
            We'll contact you within 24 hours to set up payment via JazzCash or EasyPaisa
          </p>
        </form>
      </div>
    </div>
  );
}

export default function ActivationRequestPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-[#040b1a] via-[#071227] to-[#0a1a35] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-cyan-400 border-r-transparent"></div>
        </div>
      </div>
    }>
      <ActivationRequestForm />
    </Suspense>
  );
}
