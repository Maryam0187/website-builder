"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import BillingBusyOverlay from "@/components/billing/BillingBusyOverlay";

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
  const [invoiceUrl, setInvoiceUrl] = useState("");

  useEffect(() => {
    if (!id) return;
    setInvoiceUrl(`${window.location.origin}/invoice/${id}`);
  }, [id]);

  useEffect(() => {
    const number = data?.invoice?.number;
    const pageTitle = number ? `Invoice ${number}` : "Invoice";
    const previousTitle = document.title;
    document.title = pageTitle;

    const clearPrintTitle = () => {
      document.title = "\u00A0";
    };
    const restoreTitle = () => {
      document.title = pageTitle;
    };

    window.addEventListener("beforeprint", clearPrintTitle);
    window.addEventListener("afterprint", restoreTitle);
    return () => {
      window.removeEventListener("beforeprint", clearPrintTitle);
      window.removeEventListener("afterprint", restoreTitle);
      document.title = previousTitle;
    };
  }, [data?.invoice?.number]);

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
        body: JSON.stringify({ ...body, returnTo: "billing" }),
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
        <a href="/profile#billing" className="text-cyan-200 underline">
          Back to Billing
        </a>
      </div>
    );
  }

  const { invoice, owner, plan, addon, stripeEnabled } = data;
  const paid = invoice.status === "paid";
  const isAddon = Boolean(invoice.addonId || addon);
  const itemName = addon?.name || plan?.name || invoice.planName || "Package";
  const itemPriceLabel = addon?.priceLabel || plan?.priceLabel || "";
  const itemKind = isAddon ? "One-time add-on (USD)" : "Monthly subscription (USD)";
  const invoicePath = `/invoice/${invoice.id}`;
  const displayUrl = invoiceUrl || invoicePath;

  return (
    <div className="invoice-print-root min-h-screen bg-[#070f1f] text-white print:bg-white print:text-black">
      <style>{`
        @media print {
          @page { size: A4; margin: 14mm 18mm 14mm 18mm; }
          html, body {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            background: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          /* Prevent blank second page from full-viewport wrappers */
          .invoice-print-root,
          .invoice-print-main {
            min-height: 0 !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .invoice-sheet {
            position: relative !important;
            min-height: 0 !important;
            height: auto !important;
            border: none !important;
            padding: 0 6mm !important;
            background: #fff !important;
            overflow: visible !important;
            break-inside: auto;
            page-break-inside: auto;
          }
          .invoice-brand-mark,
          .invoice-letterhead-watermark {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Fixed to the printed page so it centers without stretching the sheet */
          .invoice-watermark-layer {
            display: flex !important;
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100% !important;
            height: 100% !important;
            align-items: center !important;
            justify-content: center !important;
            pointer-events: none !important;
            z-index: 0 !important;
          }
          .invoice-letterhead-watermark {
            display: block !important;
            position: static !important;
            width: 240px !important;
            height: 240px !important;
            margin: 0 !important;
            transform: none !important;
            opacity: 0.1 !important;
            object-fit: contain !important;
          }
          .invoice-sheet-body {
            position: relative;
            z-index: 1;
            min-height: 0 !important;
          }
          .invoice-letterhead {
            border-bottom: 2.5px solid #0ea5e9;
            padding-bottom: 14px;
            margin-bottom: 18px;
          }
          .invoice-letterhead-footer {
            display: flex !important;
            margin-top: 28px !important;
            padding-top: 14px;
            border-top: 1px solid #d1d5db;
            color: #6b7280;
            font-size: 10px;
          }
        }
      `}</style>

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
            <a
              href="/profile#billing"
              className="rounded-full border border-cyan-400/40 bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/25"
            >
              Back to Billing
            </a>
          </div>
        </div>
      </header>

      <main className="invoice-print-main mx-auto max-w-2xl px-6 py-10 print:max-w-none print:px-0 print:py-0">
        <div className="mb-4 rounded-2xl border border-white/10 bg-[#040b1a]/70 px-4 py-3 print:hidden">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-white/40 uppercase">
            Invoice link
          </p>
          <p className="mt-1 break-all font-mono text-sm text-cyan-200">{displayUrl}</p>
          <p className="mt-1 text-xs text-blue-100/70">
            {invoice.number}
            {paid ? " · Paid" : " · Unpaid"} — open or share this page anytime from Billing.
          </p>
        </div>

        <article className="invoice-sheet relative flex flex-col rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8 print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none">
          {/* Letterhead watermark — centered on printable page */}
          <div className="invoice-watermark-layer pointer-events-none absolute inset-0 hidden items-center justify-center print:flex" aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/technonaire-mark.png"
              alt=""
              className="invoice-letterhead-watermark h-64 w-64 object-contain opacity-10"
            />
          </div>

          <div className="invoice-sheet-body relative z-[1] flex flex-1 flex-col">
            <div className="invoice-letterhead flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4 print:border-b-[2.5px] print:border-[#0ea5e9] print:pb-4">
              <div className="inline-flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/technonaire-mark.png"
                  alt="Technonaire"
                  className="invoice-brand-mark h-10 w-10 object-contain print:h-12 print:w-12"
                />
                <span className="leading-tight">
                  <span className="block text-xs font-bold tracking-[0.16em] text-cyan-200 uppercase print:text-[11px] print:tracking-[0.2em] print:text-[#0284c7]">
                    Technonaire
                  </span>
                  <span className="block font-[family-name:var(--font-display)] text-sm font-semibold text-white print:text-base print:text-gray-900">
                    Easy Website
                  </span>
                  <span className="mt-0.5 hidden text-[10px] text-gray-500 print:block">
                    Invoice · Billing statement
                  </span>
                </span>
              </div>
              <div className="text-right">
                <span
                  className={`inline-block rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                    paid
                      ? "bg-emerald-400/20 text-emerald-200 print:bg-green-100 print:text-green-800"
                      : "bg-amber-400/20 text-amber-100 print:bg-amber-100 print:text-amber-900"
                  }`}
                >
                  {invoice.status}
                </span>
                <p className="mt-2 hidden text-[10px] text-gray-500 print:block">
                  technonaire.com
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-end justify-between gap-3 print:mt-2">
              <div>
                <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold print:text-2xl print:text-black">
                  Invoice
                </h1>
                <p className="mt-0.5 text-sm text-blue-100 print:text-gray-600">{invoice.number}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 print:mt-6 print:gap-4">
              <div>
                <p className="text-blue-200/70 print:text-gray-500">Bill to</p>
                <p className="mt-0.5 font-medium text-white print:text-black">{owner?.name || "—"}</p>
                <p className="text-blue-100 print:text-gray-700">{owner?.email || ""}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-blue-200/70 print:text-gray-500">Dates</p>
                <p className="mt-0.5 text-blue-100 print:text-gray-700">
                  Issued {formatDate(invoice.createdAt)}
                </p>
                {paid ? (
                  <p className="text-emerald-200 print:text-green-700">
                    Paid {formatDate(invoice.paidAt)}
                  </p>
                ) : (
                  <p className="text-blue-100 print:text-gray-700">Due {formatDate(invoice.dueAt)}</p>
                )}
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-white/10 print:mt-6 print:rounded-md print:border-gray-300">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-blue-200/80 print:bg-gray-100 print:text-gray-600">
                  <tr>
                    <th className="px-3 py-2 font-medium print:px-4 print:py-3">Description</th>
                    <th className="px-3 py-2 text-right font-medium print:px-4 print:py-3">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-white/10 print:border-gray-200">
                    <td className="px-3 py-3 print:px-4 print:py-4">
                      <p className="font-medium text-white print:text-black">{itemName}</p>
                      <p className="mt-0.5 text-xs text-blue-100 print:text-gray-600">
                        {itemPriceLabel ? `${itemPriceLabel} · ` : ""}
                        {itemKind}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-white print:px-4 print:py-4 print:text-black">
                      {formatMoney(invoice.amountCents)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex justify-end print:mt-5">
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-wide text-blue-200/70 print:text-gray-500">
                  Total due
                </p>
                <p className="mt-0.5 text-2xl font-semibold text-cyan-200 print:mt-1 print:text-2xl print:text-black">
                  {formatMoney(invoice.amountCents)}{" "}
                  <span className="text-sm font-medium uppercase">{invoice.currency || "usd"}</span>
                </p>
              </div>
            </div>

            {!paid ? (
              <div className="mt-5 rounded-2xl border border-cyan-400/25 bg-cyan-500/10 p-4 text-sm text-blue-100 print:hidden">
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
                    {`Pay ${formatMoney(invoice.amountCents)} with Stripe`}
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
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-3 print:mt-6 print:gap-4 print:border-green-700 print:bg-green-50 print:px-4 print:py-4">
                <div className="min-w-0 text-left">
                  <p className="text-sm font-semibold text-emerald-100 print:text-green-900">
                    This invoice is paid. Thank you.
                  </p>
                  <p className="mt-0.5 text-xs text-emerald-100/85 print:mt-1 print:text-green-800">
                    Paid securely through Stripe
                    {invoice.paidAt ? ` on ${formatDate(invoice.paidAt)}` : ""}.
                  </p>
                </div>
                <div
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#635BFF] px-2.5 py-1.5 text-white print:px-3 print:py-2 print:shadow-none"
                  title="Secured by Stripe"
                >
                  <svg
                    className="h-3.5 w-3.5 shrink-0"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M5.5 5.2V4a2.5 2.5 0 0 1 5 0v1.2H12a1.5 1.5 0 0 1 1.5 1.5v6A1.5 1.5 0 0 1 12 14H4a1.5 1.5 0 0 1-1.5-1.5v-6A1.5 1.5 0 0 1 4 5.2h1.5zM7 4a1 1 0 1 1 2 0v1.2H7V4zm1 5.25a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5z" />
                  </svg>
                  <span className="text-[11px] font-bold tracking-wide whitespace-nowrap">
                    Secured by Stripe
                  </span>
                </div>
              </div>
            )}

            <div className="invoice-letterhead-footer mt-6 hidden items-center justify-between gap-3 print:flex">
              <div className="inline-flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/technonaire-mark.png"
                  alt=""
                  aria-hidden
                  className="invoice-brand-mark h-5 w-5 object-contain opacity-70"
                />
                <span>Technonaire Easy Website</span>
              </div>
              <span>{invoice.number}</span>
            </div>
          </div>
        </article>
      </main>

      <BillingBusyOverlay open={payBusy} message="Loading…" />
    </div>
  );
}
