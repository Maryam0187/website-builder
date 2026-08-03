"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";

function safeNextPath(next) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  if (next.startsWith("/change-password")) return null;
  return next;
}

function ChangePasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((data) => {
        if (!data.user) {
          router.replace("/login");
          return;
        }
        if (!data.user.mustChangePassword) {
          if (nextPath) {
            router.replace(nextPath);
            return;
          }
          router.replace(data.user.role === "admin" ? "/admin" : "/edit");
          return;
        }
        setUser(data.user);
      })
      .catch(() => router.replace("/login"));
  }, [router, nextPath]);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change password");

      if (nextPath) {
        router.push(nextPath);
        return;
      }
      router.push(data.user.role === "admin" ? "/admin" : "/edit");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return <div className="text-blue-100">Loading…</div>;
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md space-y-4 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/40 backdrop-blur"
    >
      <div>
        <BrandLogo href="/" className="mb-6" />
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl">
          Choose a new password
        </h1>
        <p className="mt-2 text-sm leading-6 text-blue-100">
          You’re signed in with a temporary invite password. Set your own password to continue
          editing and previewing your site.
        </p>
        <p className="mt-2 text-xs text-blue-200/80">{user.email}</p>
      </div>
      <div>
        <label className="mb-1 block text-sm text-blue-100">Temporary password</label>
        <input
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-xl border border-white/15 bg-[#07122a] px-3 py-2.5 outline-none ring-cyan-400/40 focus:ring-2"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
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
      {error && <p className="text-sm text-red-300">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 font-semibold disabled:opacity-60"
      >
        {loading ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}

export default function ChangePasswordPage() {
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
        <ChangePasswordForm />
      </Suspense>
    </div>
  );
}
