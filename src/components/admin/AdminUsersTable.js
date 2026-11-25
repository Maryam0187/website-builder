"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export default function AdminUsersTable({ users = [], initialStuckOnly = false }) {
  const [query, setQuery] = useState("");
  const [stuckOnly, setStuckOnly] = useState(initialStuckOnly);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users.filter((user) => {
      if (stuckOnly && !(user.stuck || []).length) return false;
      if (!needle) return true;
      return (
        String(user.name || "").toLowerCase().includes(needle) ||
        String(user.email || "").toLowerCase().includes(needle)
      );
    });
  }, [users, query, stuckOnly]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-6 py-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or email"
          className="min-w-[12rem] flex-1 rounded-full border border-white/15 bg-[#07122a] px-4 py-2 text-sm text-white outline-none placeholder:text-blue-200/50"
        />
        <button
          type="button"
          onClick={() => setStuckOnly((on) => !on)}
          className={`rounded-full px-4 py-2 text-sm font-medium ${
            stuckOnly
              ? "bg-amber-400 text-[#04101f]"
              : "border border-white/15 text-blue-100 hover:bg-white/5"
          }`}
        >
          Needs help
        </button>
      </div>
      {visible.length === 0 ? (
        <p className="p-6 text-sm text-blue-100">No users match that filter.</p>
      ) : (
        <ul>
          {visible.map((user) => {
            const stuck = user.stuck || [];
            return (
              <li key={user.id} className="border-b border-white/5 last:border-0">
                <Link
                  href={`/admin/users/${user.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 hover:bg-white/5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{user.name || user.email}</p>
                    <p className="truncate text-sm text-blue-100">{user.email}</p>
                    <p className="mt-1 text-xs text-blue-200/80">
                      {user.planId || "free"} · {user.subscriptionStatus || "none"} ·{" "}
                      {user.liveCount || 0} live / {user.siteCount || 0} sites
                      {user.totpEnabled ? " · authenticator on" : ""}
                    </p>
                    {stuck.length > 0 && (
                      <p className="mt-2 text-xs text-amber-200">
                        {stuck.map((item) => item.label).join(" · ")}
                      </p>
                    )}
                  </div>
                  <span className="rounded-full border border-cyan-300/40 px-3 py-1.5 text-xs font-semibold text-cyan-100">
                    Open
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
