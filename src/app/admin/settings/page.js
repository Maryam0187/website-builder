"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import RegionPricingPanel from "@/components/admin/RegionPricingPanel";
import DiscountsPanel from "@/components/admin/DiscountsPanel";
import AdminTwoFactor from "@/components/admin/AdminTwoFactor";
import AdminTemplatesGallery from "@/components/admin/AdminTemplatesGallery";

const panelClass = "rounded-2xl border border-white/10 bg-[#07122a]/70 p-6 md:p-8";

const NAV = [
  { href: "#pricing", label: "Region pricing" },
  { href: "#2fa", label: "2FA" },
  { href: "#discounts", label: "Discounts" },
  { href: "#templates", label: "Templates" },
];

function normalizeAdminHash(hash) {
  const first = String(hash || "")
    .toLowerCase()
    .split("#")
    .map((part) => part.trim())
    .filter(Boolean)[0];
  const next = first ? `#${first}` : "";
  if (next === "#region" || next === "#regions" || next === "#region-pricing") return "#pricing";
  if (next === "#authenticator" || next === "#security" || next === "#totp") return "#2fa";
  if (next === "#coupons" || next === "#coupon") return "#discounts";
  if (next === "#template") return "#templates";
  if (NAV.some((item) => item.href === next)) return next;
  return "#pricing";
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [activeHash, setActiveHash] = useState("#pricing");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/profile");
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.user) {
        router.replace("/login?next=/admin/settings");
        return;
      }
      if (data.user.mustChangePassword) {
        router.replace("/change-password?next=/admin/settings");
        return;
      }
      if (data.user.role !== "admin") {
        router.replace("/profile");
        return;
      }
      if (!cancelled) setUser(data.user);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    function syncHash() {
      const raw = window.location.hash;
      const next = normalizeAdminHash(raw);
      setActiveHash(next);
      if (raw !== next) {
        window.history.replaceState(null, "", `/admin/settings${next}`);
      }
    }
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#040b1a] text-blue-100">
        Loading settings…
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#070b16] text-white lg:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-white/10 bg-[#0b1222] lg:h-full lg:w-56 lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{user.email}</p>
            <p className="text-xs capitalize text-white/40">{user.role}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1 lg:hidden">
            <Link href="/admin" className="rounded-md px-2 py-1 text-xs text-blue-100 hover:bg-white/5">
              Dashboard
            </Link>
            <button type="button" onClick={logout} className="rounded-md px-2 py-1 text-xs text-blue-100 hover:bg-white/5">
              Log out
            </button>
          </div>
        </div>

        <nav
          className="flex gap-1 overflow-x-auto px-2 pb-3 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:px-2 lg:pb-2"
          aria-label="Admin settings"
        >
          {NAV.map((item) => {
            const active = activeHash === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                className={`relative whitespace-nowrap rounded-md px-3 py-2 text-sm transition ${
                  active
                    ? "bg-white/10 text-white before:absolute before:top-1.5 before:bottom-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-cyan-400"
                    : "text-blue-100/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="mt-auto hidden border-t border-white/10 p-3 lg:block">
          <Link
            href="/admin"
            className="block rounded-md px-3 py-2 text-sm text-blue-100/80 hover:bg-white/5 hover:text-white"
          >
            Dashboard
          </Link>
          <button
            type="button"
            onClick={logout}
            className="block w-full rounded-md px-3 py-2 text-left text-sm text-blue-100/80 hover:bg-white/5 hover:text-white"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-white/10 bg-[#040b1a]">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <BrandLogo href="/admin" subtitle="Settings" compact />
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/admin"
                className="rounded-full border border-cyan-300/40 bg-cyan-400/15 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-400/25"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={logout}
                className="rounded-full px-3 py-2 text-sm text-blue-100 hover:bg-white/5"
              >
                Log out
              </button>
            </div>
          </div>
        </header>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8 lg:px-10 lg:py-8">
          {activeHash === "#pricing" ? (
            <section id="pricing" className={panelClass}>
              <RegionPricingPanel />
            </section>
          ) : null}
          {activeHash === "#2fa" ? (
            <section id="2fa" className={panelClass}>
              <AdminTwoFactor />
            </section>
          ) : null}
          {activeHash === "#discounts" ? (
            <section id="discounts" className={panelClass}>
              <DiscountsPanel />
            </section>
          ) : null}
          {activeHash === "#templates" ? (
            <section id="templates" className={panelClass}>
              <AdminTemplatesGallery framed={false} />
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}
