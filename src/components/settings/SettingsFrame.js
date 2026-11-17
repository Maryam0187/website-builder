"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import SupportChatSidebar from "@/components/messaging/SupportChatSidebar";

export default function SettingsFrame({ user, activeHref = "#templates", children }) {
  const router = useRouter();
  const [showChat, setShowChat] = useState(false);
  const role = user?.role === "admin" ? "admin" : "owner";
  const homeHref = role === "admin" ? "/admin" : "/edit";
  const navItems = [
    { href: "/profile#account", hash: "#account", label: "Account" },
    ...(role === "owner" ? [{ href: "/profile#websites", hash: "#websites", label: "Websites" }] : []),
    { href: "/profile#templates", hash: "#templates", label: "Templates" },
    { href: "/profile#security", hash: "#security", label: "Security" },
    { href: "/profile#plan", hash: "#plan", label: "Plan" },
    ...(role === "owner" ? [{ href: "/profile#billing", hash: "#billing", label: "Billing" }] : []),
  ];

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#070b16] text-white lg:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-white/10 bg-[#0b1222] lg:h-full lg:w-56 lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{user?.email}</p>
            <p className="text-xs capitalize text-white/40">{role}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1 lg:hidden">
            <Link href={homeHref} className="rounded-md px-2 py-1 text-xs text-blue-100 hover:bg-white/5">
              {role === "admin" ? "Dashboard" : "Editor"}
            </Link>
            <button type="button" onClick={logout} className="rounded-md px-2 py-1 text-xs text-blue-100 hover:bg-white/5">
              Log out
            </button>
          </div>
        </div>

        <nav
          className="flex gap-1 overflow-x-auto px-2 pb-3 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:px-2 lg:pb-2"
          aria-label="Settings"
        >
          {navItems.map((item) => {
            const active = item.hash === activeHref;
            return (
              <Link
                key={item.hash}
                href={item.href}
                className={`relative whitespace-nowrap rounded-md px-3 py-2 text-sm transition ${
                  active
                    ? "bg-white/10 text-white before:absolute before:top-1.5 before:bottom-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-cyan-400"
                    : "text-blue-100/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          {role === "owner" ? (
            <button
              type="button"
              onClick={() => setShowChat(true)}
              className="whitespace-nowrap rounded-md px-3 py-2 text-left text-sm text-blue-100/70 transition hover:bg-white/5 hover:text-white"
            >
              Contact us
            </button>
          ) : null}
        </nav>

        <div className="mt-auto hidden border-t border-white/10 p-3 lg:block">
          <Link
            href={homeHref}
            className="block rounded-md px-3 py-2 text-sm text-blue-100/80 hover:bg-white/5 hover:text-white"
          >
            {role === "admin" ? "Dashboard" : "Editor"}
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
            <BrandLogo href={homeHref} subtitle={role === "admin" ? "Admin" : "Settings"} compact />
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={homeHref}
                className="rounded-full border border-cyan-300/40 bg-cyan-400/15 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-400/25"
              >
                {role === "admin" ? "Dashboard" : "Editor"}
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
        <main data-settings-scroll className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>

      {role === "owner" ? <SupportChatSidebar open={showChat} onClose={() => setShowChat(false)} /> : null}
    </div>
  );
}
