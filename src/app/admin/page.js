import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser, destroySession } from "@/lib/auth";
import { listConversations } from "@/lib/store-actions";
import { adminAccountStats } from "@/lib/admin-users";
import BrandLogo from "@/components/BrandLogo";
import AdminUsersTable from "@/components/admin/AdminUsersTable";

export const dynamic = "force-dynamic";

async function logoutAction() {
  "use server";
  await destroySession();
  redirect("/login");
}

export default async function AdminHomePage({ searchParams }) {
  const user = await requireUser(["admin"]);
  if (!user) redirect("/login");

  const params = await searchParams;
  const stuckOnly = params?.stuck === "1";
  const [stats, conversations] = await Promise.all([
    adminAccountStats(),
    listConversations(),
  ]);
  const unread = stats.unread;

  return (
    <div className="min-h-screen bg-[#070f1f] text-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 60% at 10% 0%, rgba(34,211,238,0.16), transparent), radial-gradient(ellipse 60% 50% at 90% 0%, rgba(37,99,235,0.18), transparent)",
        }}
      />

      <header className="relative border-b border-white/10 bg-[#040b1a]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <BrandLogo href="/admin" subtitle="Admin dashboard" compact />
            <p className="mt-2 text-sm text-blue-100">Signed in as {user.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/inbox"
              className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold"
            >
              Open inbox
            </Link>
            <Link
              href="/admin/settings"
              className="rounded-full border border-white/15 px-4 py-2 text-sm hover:bg-white/5"
            >
              Settings
            </Link>
            <Link href="/" className="hidden rounded-full border border-white/15 px-4 py-2 text-sm sm:inline-flex">
              Product home
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-full border border-white/15 px-4 py-2 text-sm text-blue-100 hover:bg-white/5"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl space-y-8 px-6 py-10">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <a
            href="#users"
            className="rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:border-cyan-300/30"
          >
            <p className="text-sm text-blue-100">All users</p>
            <p className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold">
              {stats.users}
            </p>
            <p className="mt-2 text-sm text-blue-100">Owner accounts</p>
          </a>
          <Link
            href="/admin/inbox"
            className="rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:border-cyan-300/30"
          >
            <p className="text-sm text-blue-100">Inbox</p>
            <p className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold">
              {stats.conversations}
            </p>
            <p className="mt-2 text-sm text-amber-200">
              {unread > 0 ? `${unread} unread message${unread === 1 ? "" : "s"}` : "All caught up"}
            </p>
          </Link>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-blue-100">Websites</p>
            <p className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold">
              {stats.sites}
            </p>
            <p className="mt-2 text-sm text-blue-100">{stats.liveSites} live</p>
          </div>
          <Link
            href="/admin?stuck=1#users"
            className="rounded-3xl border border-amber-300/25 bg-gradient-to-br from-amber-400/15 to-orange-500/10 p-6 transition hover:border-amber-200/50"
          >
            <p className="text-sm text-amber-100">Needs help</p>
            <p className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold">
              {stats.stuck}
            </p>
            <p className="mt-2 text-sm text-amber-100">Open a user to unstick them</p>
          </Link>
        </section>

        <section id="users" className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
          <div className="border-b border-white/10 px-6 py-4">
            <h2 className="font-semibold">All users</h2>
            <p className="mt-1 text-xs text-blue-200/80">
              Open an account to reset a password, turn off an authenticator, unlock a region, or fix a stuck website.
            </p>
          </div>
          <AdminUsersTable users={stats.owners} initialStuckOnly={stuckOnly} />
        </section>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <h2 className="font-semibold">Inbox</h2>
            <Link href="/admin/inbox" className="text-sm text-cyan-200 hover:underline">
              View all
            </Link>
          </div>
          {conversations.length === 0 ? (
            <p className="p-6 text-sm text-blue-100">No guest messages yet.</p>
          ) : (
            <ul>
              {conversations.slice(0, 8).map((c) => (
                <li key={c.id} className="border-b border-white/5 last:border-0">
                  <Link
                    href={`/admin/inbox?c=${c.id}`}
                    className="flex items-center justify-between gap-3 px-6 py-4 hover:bg-white/5"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.websiteName || c.name}</p>
                      <p className="truncate text-sm text-blue-100">
                        {c.name}
                        {c.lastMessage?.body ? ` · ${c.lastMessage.body}` : ""}
                      </p>
                    </div>
                    {c.unreadForAdmin > 0 && (
                      <span className="rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-[#04101f]">
                        {c.unreadForAdmin}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
