"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";

function formatMoney(cents) {
  return `$${((Number(cents) || 0) / 100).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function InvoicePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [payBusy, setPayBusy] = useState(false);
  const [payMsg, setPayMsg] = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/billing/invoice/${encodeURIComponent(id)}`);
        const json = await res.json();
        if (res.status === 401) {
          router.replace(`/login?next=/invoice/${id}`);
          return;
        }
        if (!res.ok) throw new Error(json.error || "Failed to load invoice");
        setData(json);
      } catch (err) {
        setError(err.message || "Failed to load invoice");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  async function payWithStripe() {
    const inv = data?.invoice;
    if (!inv) return;
    setPayBusy(true);
    setPayMsg("");
    try {
      const body = inv.addonId
        ? { action: "buy-addon", addonId: inv.addonId }
        : { action: "checkout", planId: inv.planId };

      if (!inv.addonId && (!inv.planId || inv.planId === "free")) {
        throw new Error("This invoice is not a paid package. Choose Starter, Custom, Domain, or Pro in Profile.");
      }

      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not start Stripe Checkout");
      if (json.checkoutUrl) {
        window.location.href = json.checkoutUrl;
        return;
      }
      throw new Error("Stripe Checkout URL missing — check STRIPE_SECRET_KEY");
    } catch (err) {
      setPayMsg(err.message || "Payment failed to start");
      setPayBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070f1f] text-blue-100">
        Loading invoice…
      </div>
    );
  }

  if (error || !data?.invoice) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#070f1f] px-6 text-center text-blue-100">
        <p className="text-red-300">{error || "Invoice not found"}</p>
        <Link href="/profile" className="text-cyan-200 underline">
          Back to Profile
        </Link>
      </div>
    );
  }

  const { invoice, owner, plan, addon, stripeEnabled } = data;
  const paid = invoice.status === "paid";
  const isAddon = Boolean(invoice.addonId || addon);
  const itemName = addon?.name || plan?.name || invoice.planName || "Package";
  const itemPriceLabel = addon?.priceLabel || plan?.priceLabel || "";
  const itemKind = isAddon ? "One-time add-on (USD)" : "Monthly subscription (USD)";

  return (
    <div className="min-h-screen bg-[#070f1f] text-white print:bg-white print:text-black">
      <header className="border-b border-white/10 bg-[#040b1a]/85 print:hidden">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 px-6 py-5">
          <BrandLogo href="/profile" subtitle="Invoice" compact />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-full border border-white/15 px-4 py-2 text-sm hover:bg-white/5"
            >
              Print / Save PDF
            </button>
            <Link
              href="/profile"
              className="rounded-full border border-white/15 px-4 py-2 text-sm hover:bg-white/5"
            >
              Profile
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">
        <article className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8 print:border-gray-300 print:bg-white print:shadow-none">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-blue-200/70 print:text-gray-500">
                Technonaire Easy Website
              </p>
              <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold">
                Invoice
              </h1>
              <p className="mt-1 text-sm text-blue-100 print:text-gray-600">{invoice.number}</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                paid
                  ? "bg-emerald-400/20 text-emerald-200 print:bg-green-100 print:text-green-800"
                  : "bg-amber-400/20 text-amber-100 print:bg-amber-100 print:text-amber-900"
              }`}
            >
              {invoice.status}
            </span>
          </div>

          <div className="mt-8 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-blue-200/70 print:text-gray-500">Bill to</p>
              <p className="mt-1 font-medium text-white print:text-black">{owner?.name || "—"}</p>
              <p className="text-blue-100 print:text-gray-700">{owner?.email || ""}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-blue-200/70 print:text-gray-500">Dates</p>
              <p className="mt-1 text-blue-100 print:text-gray-700">
                Issued {formatDate(invoice.createdAt)}
              </p>
              <p className="text-blue-100 print:text-gray-700">Due {formatDate(invoice.dueAt)}</p>
              {paid ? (
                <p className="text-emerald-200 print:text-green-700">
                  Paid {formatDate(invoice.paidAt)}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 print:border-gray-300">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-blue-200/80 print:bg-gray-100 print:text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-white/10 print:border-gray-200">
                  <td className="px-4 py-4">
                    <p className="font-medium text-white print:text-black">
                      {itemName}
                    </p>
                    <p className="mt-1 text-xs text-blue-100 print:text-gray-600">
                      {itemPriceLabel ? `${itemPriceLabel} · ` : ""}
                      {itemKind}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-right font-semibold text-white print:text-black">
                    {formatMoney(invoice.amountCents)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end">
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-blue-200/70 print:text-gray-500">
                Total due
              </p>
              <p className="mt-1 text-3xl font-semibold text-cyan-200 print:text-black">
                {formatMoney(invoice.amountCents)}{" "}
                <span className="text-base font-medium uppercase">{invoice.currency || "usd"}</span>
              </p>
            </div>
          </div>

          {!paid ? (
            <div className="mt-8 rounded-2xl border border-cyan-400/25 bg-cyan-500/10 p-5 text-sm text-blue-100 print:hidden">
              <p className="font-semibold text-white">Pay with Stripe</p>
              <p className="mt-2 text-sm text-blue-100">
                {isAddon
                  ? "Secure one-time card payment for website slots. After checkout you’ll return to Profile with slots added."
                  : "Secure card payment. After checkout you’ll return to Profile with this package activated."}
              </p>
              {stripeEnabled ? (
                <button
                  type="button"
                  disabled={payBusy}
                  onClick={payWithStripe}
                  className="mt-4 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
                >
                  {payBusy ? "Opening Stripe…" : `Pay ${formatMoney(invoice.amountCents)} with Stripe`}
                </button>
              ) : (
                <p className="mt-3 text-amber-200">
                  Stripe is not configured. Add <code className="text-white">STRIPE_SECRET_KEY</code>{" "}
                  to <code className="text-white">.env.local</code> and restart the server.
                </p>
              )}
              {payMsg ? <p className="mt-3 text-sm text-red-300">{payMsg}</p> : null}
            </div>
          ) : (
            <p className="mt-8 text-sm text-emerald-200">This invoice is paid. Thank you.</p>
          )}
        </article>
      </main>
    </div>
  );
}
