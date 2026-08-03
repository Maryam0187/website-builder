"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

function safeNextPath(next) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

function redirectAfterLogin(router, user, nextPath) {
  if (user.mustChangePassword) {
    const qs = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
    router.replace(`/change-password${qs}`);
    return;
  }
  if (nextPath) {
    router.replace(nextPath);
    return;
  }
  router.replace(user.role === "admin" ? "/admin" : "/edit");
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((data) => {
        if (!data.user) return;
        redirectAfterLogin(router, data.user, nextPath);
      })
      .catch(() => {});
  }, [router, nextPath]);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      redirectAfterLogin(router, data.user, nextPath);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative w-full max-w-md space-y-4">
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/40 backdrop-blur"
      >
        <div>
          <BrandLogo href="/" className="mb-6" />
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl">Owner / Admin login</h1>
          <p className="mt-2 text-sm leading-6 text-blue-100">
            Login is required to preview and edit your website. Use the email and temporary password
            from your Technonaire chat invite — you’ll set a new password on first login.
          </p>
        </div>
        <div>
          <label className="mb-1 block text-sm text-blue-100">Email</label>
          <input
            type="email"
            required
            className="w-full rounded-xl border border-white/15 bg-[#07122a] px-3 py-2.5 outline-none ring-cyan-400/40 focus:ring-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-blue-100">Password</label>
          <input
            type="password"
            required
            className="w-full rounded-xl border border-white/15 bg-[#07122a] px-3 py-2.5 outline-none ring-cyan-400/40 focus:ring-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-300">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 font-semibold disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm leading-6 text-blue-100">
        <p className="font-semibold text-white">Guest? No password needed</p>
        <p className="mt-1">
          Start with{" "}
          <Link href="/#message" className="font-medium text-cyan-200 underline">
            Message us
          </Link>
          . Open the chat link from your email until we send owner login.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
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
        <LoginForm />
      </Suspense>
    </div>
  );
}
