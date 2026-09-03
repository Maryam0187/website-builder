"use client";

import { useState } from "react";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [devResetUrl, setDevResetUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    setDevResetUrl("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setMessage(data.message || "Check your email for a reset link.");
      if (data.devResetUrl) setDevResetUrl(data.devResetUrl);
    } catch (err) {
      setError(err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#040b1a] px-6 text-white">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 50% at 50% -20%, rgba(34,211,238,0.2), transparent), radial-gradient(ellipse 50% 40% at 100% 100%, rgba(37,99,235,0.18), transparent)",
        }}
      />
      <form
        onSubmit={onSubmit}
        className="relative w-full max-w-md space-y-4 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/40 backdrop-blur"
      >
        <div>
          <BrandLogo href="/" className="mb-6" />
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl">Forgot password</h1>
          <p className="mt-2 text-sm leading-6 text-blue-100">
            Enter the email for your owner or admin login. We’ll send a link to reset your password.
          </p>
        </div>
        <div>
          <label className="mb-1 block text-sm text-blue-100">Email</label>
          <input
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-xl border border-white/15 bg-[#07122a] px-3 py-2.5 outline-none ring-cyan-400/40 focus:ring-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
        {devResetUrl ? (
          <div className="rounded-xl border border-amber-300/30 bg-amber-400/10 p-3 text-sm text-amber-50">
            <p className="font-semibold">Local reset link</p>
            <Link href={devResetUrl} className="mt-2 block break-all text-cyan-200 underline">
              {devResetUrl}
            </Link>
          </div>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 font-semibold disabled:opacity-60"
        >
          {loading ? "Sending…" : "Send reset link"}
        </button>
        <p className="text-center text-sm text-blue-100">
          <Link href="/login" className="text-cyan-200 underline">
            Back to login
          </Link>
        </p>
      </form>
    </div>
  );
}
