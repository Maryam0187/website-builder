"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = String(searchParams.get("token") || "").trim();

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    if (!token) {
      setChecking(false);
      setValid(false);
      setError("Missing reset token. Request a new link from Forgot password.");
      return;
    }
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setValid(false);
          setError(data.error || "This reset link is invalid or has expired.");
          return;
        }
        setValid(true);
        setEmail(data.email || "");
      })
      .catch(() => {
        setValid(false);
        setError("Could not verify reset link.");
      })
      .finally(() => setChecking(false));
  }, [token]);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");
      router.replace(`/login?reset=1&email=${encodeURIComponent(data.email || email)}`);
    } catch (err) {
      setError(err.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return <div className="text-blue-100">Checking reset link…</div>;
  }

  if (!valid) {
    return (
      <div className="w-full max-w-md space-y-4 rounded-3xl border border-white/10 bg-white/5 p-8">
        <BrandLogo href="/" className="mb-4" />
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Link expired</h1>
        <p className="text-sm text-red-300">{error}</p>
        <Link
          href="/forgot-password"
          className="inline-flex rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md space-y-4 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/40 backdrop-blur"
    >
      <div>
        <BrandLogo href="/" className="mb-6" />
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl">Reset password</h1>
        <p className="mt-2 text-sm leading-6 text-blue-100">
          Choose a new password for <span className="text-white">{email}</span>.
        </p>
      </div>
      <div>
        <label className="mb-1 block text-sm text-blue-100">New password</label>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-xl border border-white/15 bg-[#07122a] px-3 py-2.5 outline-none ring-cyan-400/40 focus:ring-2"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <p className="mt-1 text-xs text-blue-200/70">At least 8 characters</p>
      </div>
      <div>
        <label className="mb-1 block text-sm text-blue-100">Confirm new password</label>
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-xl border border-white/15 bg-[#07122a] px-3 py-2.5 outline-none ring-cyan-400/40 focus:ring-2"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 font-semibold disabled:opacity-60"
      >
        {loading ? "Saving…" : "Save new password"}
      </button>
      <p className="text-center text-sm text-blue-100">
        <Link href="/login" className="text-cyan-200 underline">
          Back to login
        </Link>
      </p>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#040b1a] px-6 text-white">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 50% at 50% -20%, rgba(34,211,238,0.2), transparent), radial-gradient(ellipse 50% 40% at 100% 100%, rgba(37,99,235,0.18), transparent)",
        }}
      />
      <Suspense fallback={<div className="text-blue-100">Loading…</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}