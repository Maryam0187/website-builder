"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import AdminSitesList from "@/components/admin/AdminSitesList";

function generatePassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export default function AdminUserSupport({ initialDetail }) {
  const router = useRouter();
  const userId = initialDetail.user.id;
  const [detail, setDetail] = useState(initialDetail);
  const [password, setPassword] = useState("");
  const [slots, setSlots] = useState(String(initialDetail.user.siteSlots || 1));
  const [maxSlots, setMaxSlots] = useState(Number(initialDetail.maxWebsiteSlots) || 10);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(action, extra = {}) {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Update failed");
      setDetail(data);
      setSlots(String(data.user?.siteSlots || 1));
      if (data.maxWebsiteSlots) setMaxSlots(Number(data.maxWebsiteSlots));
      if (data.temporaryPassword) {
        setPassword(data.temporaryPassword);
        setStatus(
          `Temporary password saved: ${data.temporaryPassword}. Share it with them, then they must choose a new one.`,
        );
      } else {
        setStatus("Saved. Their account was updated.");
      }
    } catch (err) {
      setError(err.message || "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  }

  const user = detail.user;
  const stuck = user.stuck || [];

  return (
    <div className="min-h-screen bg-[#070f1f] text-white">
      <header className="border-b border-white/10 bg-[#040b1a]/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-5">
          <BrandLogo href="/admin" subtitle="User support" compact />
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin" className="rounded-full border border-white/15 px-4 py-2 text-sm hover:bg-white/5">
              Dashboard
            </Link>
            <Link href="/admin/inbox" className="rounded-full border border-white/15 px-4 py-2 text-sm hover:bg-white/5">
              Inbox
            </Link>
            <Link href="/admin/settings" className="rounded-full border border-white/15 px-4 py-2 text-sm hover:bg-white/5">
              Settings
            </Link>
            <button type="button" onClick={logout} className="rounded-full px-4 py-2 text-sm text-blue-100 hover:bg-white/5">
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-blue-100">Owner</p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold">
            {user.name || user.email}
          </h1>
          <p className="mt-2 text-sm text-blue-100">
            {user.email} · {user.planId || "free"} · {user.subscriptionStatus || "none"} ·{" "}
            {user.region || "usa"}
            {user.regionLocked ? " · region locked" : ""}
            {user.totpEnabled ? " · authenticator on" : ""}
          </p>
          <p className="mt-1 text-sm text-blue-200/80">
            {user.siteSlots} {user.siteSlots === 1 ? "website slot" : "website slots"} · active site{" "}
            {user.siteId || "none"}
          </p>
          {stuck.length > 0 ? (
            <ul className="mt-4 space-y-1 text-sm text-amber-200">
              {stuck.map((item) => (
                <li key={item.id}>{item.label}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-emerald-200">Nothing flagged as stuck.</p>
          )}
          {detail.conversation ? (
            <Link
              href={`/admin/inbox?c=${detail.conversation.id}`}
              className="mt-4 inline-flex rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold"
            >
              Open their inbox
            </Link>
          ) : (
            <p className="mt-4 text-sm text-blue-200/80">No inbox conversation for this email.</p>
          )}
        </section>

        {(status || error) && (
          <p className={`rounded-2xl px-4 py-3 text-sm ${error ? "bg-rose-500/15 text-rose-100" : "bg-emerald-500/15 text-emerald-100"}`}>
            {error || status}
          </p>
        )}

        <section className="grid gap-4 lg:grid-cols-2">
          <form
            className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-6"
            onSubmit={(e) => {
              e.preventDefault();
              if (!window.confirm("Set this temporary password and sign them out?")) return;
              run("set-temp-password", { password });
            }}
          >
            <h2 className="font-semibold">Password</h2>
            <p className="text-sm text-blue-100">
              Use this when they cannot sign in or are stuck on the temporary password screen.
            </p>
            <div className="flex gap-2">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
                className="min-w-0 flex-1 rounded-xl border border-white/15 bg-[#07122a] px-3 py-2 text-sm outline-none"
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                onClick={() => setPassword(generatePassword())}
                className="rounded-full border border-white/15 px-3 py-2 text-xs font-semibold hover:bg-white/5"
              >
                Generate
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#04101f] disabled:opacity-60"
              >
                Set temporary password
              </button>
              {user.mustChangePassword ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (!window.confirm("Let them skip the change-password screen?")) return;
                    run("clear-password-gate");
                  }}
                  className="rounded-full border border-white/15 px-4 py-2 text-sm hover:bg-white/5 disabled:opacity-60"
                >
                  Clear password gate
                </button>
              ) : null}
            </div>
          </form>

          <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6">
            <div>
              <h2 className="font-semibold">Sign-in and plan limits</h2>
              <p className="mt-1 text-sm text-blue-100">
                Turn off an authenticator they cannot access, unlock a wrong region, or raise the website limit.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || !user.totpEnabled}
                onClick={() => {
                  if (!window.confirm("Turn off their authenticator and sign them out?")) return;
                  run("disable-authenticator");
                }}
                className="rounded-full border border-white/15 px-4 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
              >
                {user.totpEnabled ? "Turn off authenticator" : "Authenticator is off"}
              </button>
              <button
                type="button"
                disabled={busy || !user.regionLocked}
                onClick={() => run("unlock-region")}
                className="rounded-full border border-white/15 px-4 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
              >
                {user.regionLocked ? "Unlock region" : "Region is unlocked"}
              </button>
            </div>
            <form
              className="flex flex-wrap items-center gap-2 pt-2"
              onSubmit={(e) => {
                e.preventDefault();
                run("set-site-slots", { siteSlots: Number(slots) });
              }}
            >
              <label className="text-sm text-blue-100" htmlFor="site-slots">
                Website slots
              </label>
              <input
                id="site-slots"
                type="number"
                min={1}
                max={maxSlots}
                value={slots}
                onChange={(e) => setSlots(e.target.value)}
                className="w-20 rounded-xl border border-white/15 bg-[#07122a] px-3 py-2 text-sm outline-none"
              />
              <button
                type="submit"
                disabled={busy}
                className="rounded-full border border-cyan-300/40 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/15 disabled:opacity-60"
              >
                Save slots
              </button>
            </form>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
          <div className="border-b border-white/10 px-6 py-4">
            <h2 className="font-semibold">Their websites</h2>
            <p className="mt-1 text-xs text-blue-200/80">
              Switch template or layout, add a section, or check payment if a site is stuck.
            </p>
          </div>
          <AdminSitesList initialSites={detail.sites || []} limit={50} />
        </section>
      </main>
    </div>
  );
}
