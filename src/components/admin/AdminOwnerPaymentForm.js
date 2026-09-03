"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

function formatMoney(cents) {
  return `$${((Number(cents) || 0) / 100).toFixed(0)}`;
}

export default function AdminOwnerPaymentForm({ ownerId }) {
  const [billing, setBilling] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    if (!ownerId) return;
    setLoaded(false);
    try {
      const res = await fetch(`/api/profile/owner?userId=${encodeURIComponent(ownerId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setOwnerEmail(data.user.email || "");
      setBilling(data.billing || null);
      setInvoices(data.invoices || []);
      setLoaded(true);
    } catch (err) {
      setStatus(err.message || "Failed to load payment");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId]);

  async function markPaid(invoiceId) {
    setBusy(true);
    setStatus("");
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark-invoice-paid", invoiceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setStatus(`Marked ${data.invoice?.number || "invoice"} paid — subscription active`);
      await load();
    } catch (err) {
      setStatus(err.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (!ownerId) {
    return <p className="mt-3 text-xs text-blue-200/80">No owner linked to this site.</p>;
  }

  return (
    <div className="mt-3 space-y-3 rounded-2xl border border-white/10 bg-black/20 p-3">
      <p className="text-xs font-semibold tracking-wide text-cyan-200 uppercase">
        Owner subscription
      </p>
      {!loaded && !status ? (
        <p className="text-xs text-blue-100">Loading…</p>
      ) : (
        <>
          <p className="text-xs text-blue-100">
            {ownerEmail} · {billing?.planName || "No plan"} ({billing?.priceLabel || "—"}) ·{" "}
            {billing?.subscriptionStatus || "none"}
            {billing?.subscriptionActive ? " · active" : ""}
          </p>
          <ul className="space-y-2">
            {invoices.length === 0 ? (
              <li className="text-xs text-blue-200/80">No invoices yet for this owner.</li>
            ) : (
              invoices.map((inv) => (
                <li
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs"
                >
                  <div>
                    <p className="font-semibold text-white">
                      {inv.number} · {formatMoney(inv.amountCents)}
                    </p>
                    <p className="text-blue-200/70 capitalize">{inv.status}</p>
                    <Link
                      href={`/invoice/${inv.id}`}
                      className="mt-1 inline-block text-cyan-200 underline"
                    >
                      Open invoice
                    </Link>
                  </div>
                  {inv.status !== "paid" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => markPaid(inv.id)}
                      className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-1.5 font-semibold disabled:opacity-60"
                    >
                      Mark paid
                    </button>
                  ) : (
                    <span className="text-emerald-300">Paid</span>
                  )}
                </li>
              ))
            )}
          </ul>
          {status ? <p className="text-xs text-cyan-200">{status}</p> : null}
        </>
      )}
    </div>
  );
}
