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
  const [email, setEmail] = useState(() => searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [totpToken, setTotpToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fromQuery = searchParams.get("email");
    if (fromQuery) setEmail(fromQuery);
  }, [searchParams]);

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
        body: JSON.stringify(
          totpToken
            ? { totpToken, code }
            : { email, password },
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      if (data.requires2fa && data.totpToken) {
        setTotpToken(data.totpToken);
        setCode("");
        return;
      }
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
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl">
            {totpToken ? "Authenticator code" : "Owner / Admin login"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-blue-100">
            {totpToken
              ? "Open Google Authenticator and enter the 6-digit code for Technonaire."
              : "Login is required to preview and edit your website. Use the email and temporary password from your Technonaire chat invite — you’ll set a new password on first login."}
          </p>
        </div>
        {totpToken ? (
          <div>
            <label className="mb-1 block text-sm text-blue-100">6-digit code</label>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoFocus
              className="w-full rounded-xl border border-white/15 bg-[#07122a] px-3 py-2.5 tracking-[0.4em] outline-none ring-cyan-400/40 focus:ring-2"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </div>
        ) : (
          <>
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
          <div className="mb-1 flex items-center justify-between gap-2">
            <label className="block text-sm text-blue-100">Password</label>
            <Link href="/forgot-password" className="text-xs font-medium text-cyan-200 hover:underline">
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            required
            className="w-full rounded-xl border border-white/15 bg-[#07122a] px-3 py-2.5 outline-none ring-cyan-400/40 focus:ring-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
          </>
        )}
        {totpToken ? (
          <button
            type="button"
            className="text-xs text-cyan-200 hover:underline"
            onClick={() => {
              setTotpToken("");
              setCode("");
              setError("");
            }}
          >
            Back to password
          </button>
        ) : null}
        {searchParams.get("reset") === "1" ? (
          <p className="text-sm text-emerald-300">Password updated. Sign in with your new password.</p>
        ) : null}
        {error && <p className="text-sm text-red-300">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 font-semibold disabled:opacity-60"
        >
          {loading ? (totpToken ? "Checking…" : "Signing in…") : totpToken ? "Verify code" : "Sign in"}
        </button>
      </form>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm leading-6 text-blue-100">
        <p className="font-semibold text-white">Need a sample site?</p>
        <p className="mt-1">
          Start with{" "}
          <Link href="/#message" className="font-medium text-cyan-200 underline">
            name, email & website name
          </Link>
          . Open the chat link — the assistant creates your draft and posts the login there.
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
