"use client";

import { Fragment, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const inputClass =
  "w-28 rounded-lg border border-white/15 bg-[#040b1a] px-2 py-1.5 text-sm text-white outline-none focus:border-cyan-400/50";
const fieldClass =
  "w-full rounded-lg border border-white/15 bg-[#040b1a] px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/50";

const PLAN_ORDER = ["starter", "custom", "domain", "free", "pro"];
const PLAN_NAMES = {
  starter: "Starter",
  custom: "Custom",
  domain: "Domain",
  free: "Free",
  pro: "Pro",
};

export default function RegionPricingPanel() {
  const router = useRouter();
  const [configs, setConfigs] = useState([]);
  const [regions, setRegions] = useState([]);
  const [openRegion, setOpenRegion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", id: "", currency: "USD", stripe: true });
  const [matchTarget, setMatchTarget] = useState(null);

  useEffect(() => {
    fetchConfigs();
  }, []);

  async function fetchConfigs({ quiet = false } = {}) {
    try {
      if (!quiet) setLoading(true);
      const res = await fetch("/api/admin/pricing");
      
      if (res.status === 401 || res.status === 403) {
        router.push("/login");
        return;
      }
      
      if (!res.ok) {
        throw new Error("Failed to fetch pricing");
      }
      
      const data = await res.json();
      setConfigs(data.configs || []);
      setRegions(data.regions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      if (!quiet) setLoading(false);
    }
  }

  function startEdit(config) {
    setEditingId(config.id);
    setFormData({
      id: config.id,
      region: config.region,
      planId: config.plan_id,
      currency: config.currency,
      firstSiteAmount: (Number(config.first_site_cents) || 0) / 100,
      extraSiteAmount: (Number(config.extra_site_cents) || 0) / 100,
      active: config.active,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setFormData({});
  }

  async function saveEdit() {
    try {
      setSaving(true);
      const payload = {
        ...formData,
        firstSiteCents: Math.round(Number(formData.firstSiteAmount) * 100),
        extraSiteCents: Math.round(Number(formData.extraSiteAmount) * 100),
      };
      const res = await fetch("/api/admin/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to save");
      }
      if (data.warning) {
        alert(data.warning);
      }
      
      await fetchConfigs({ quiet: true });
      setEditingId(null);
      setFormData({});
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function regionAction(action, payload) {
    try {
      setSaving(true);
      const res = await fetch("/api/admin/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not update the region");
      await fetchConfigs({ quiet: true });
      if (action === "add-region") {
        setShowAdd(false);
        setAddForm({ name: "", id: "", currency: "USD", stripe: true });
        setOpenRegion(data.region?.id || null);
      }
      if (action === "delete-region") setOpenRegion(null);
      if (action === "copy-usa-prices") {
        setEditingId(null);
        setFormData({});
        setMatchTarget(null);
      }
      if (data.warning) alert(data.warning);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  function plansFor(regionId) {
    const rows = configs.filter((config) => config.region === regionId);
    return [...rows].sort((a, b) => {
      const left = PLAN_ORDER.indexOf(a.plan_id);
      const right = PLAN_ORDER.indexOf(b.plan_id);
      return (left === -1 ? 99 : left) - (right === -1 ? 99 : right);
    });
  }

  function formatCurrency(cents, currency) {
    if (cents == null || cents === "") return "—";
    const code = String(currency || "USD").toUpperCase();
    return new Intl.NumberFormat(code === "PKR" ? "en-PK" : "en-US", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: code === "PKR" ? 0 : 2,
    }).format((Number(cents) || 0) / 100);
  }

  if (loading) {
    return <p className="text-sm text-blue-100">Loading region pricing…</p>;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-5">
        <p className="text-rose-200">{error}</p>
        <button
          onClick={fetchConfigs}
          className="mt-3 text-sm font-semibold text-cyan-200 underline-offset-2 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
        <div className="mb-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">Region pricing</h1>
              <p className="mt-2 text-sm text-blue-100">
                Open a region to edit its plans. Order is Starter, Custom, Domain, Free, then Pro.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAdd((open) => !open)}
              className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold"
            >
              Add region
            </button>
          </div>
        </div>

        {showAdd ? (
          <form
            className="mb-6 grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              regionAction("add-region", addForm);
            }}
          >
            <label className="text-sm text-blue-100">
              Name
              <input
                value={addForm.name}
                onChange={(event) => {
                  const name = event.target.value;
                  const id = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
                  setAddForm({ ...addForm, name, id });
                }}
                className={`${fieldClass} mt-1`}
                placeholder="Australia"
                required
              />
            </label>
            <label className="text-sm text-blue-100">
              Id
              <input
                value={addForm.id}
                onChange={(event) => setAddForm({ ...addForm, id: event.target.value.toLowerCase() })}
                className={`${fieldClass} mt-1`}
                placeholder="australia"
                required
              />
            </label>
            <label className="text-sm text-blue-100">
              Currency
              <select
                value={addForm.currency}
                onChange={(event) => setAddForm({
                  ...addForm,
                  currency: event.target.value,
                  stripe: event.target.value === "USD",
                })}
                className={`${fieldClass} mt-1`}
              >
                <option value="USD">USD</option>
                <option value="PKR">PKR</option>
              </select>
            </label>
            <label className="flex items-end gap-2 pb-2 text-sm text-blue-100">
              <input
                type="checkbox"
                checked={addForm.stripe && addForm.currency === "USD"}
                disabled={addForm.currency !== "USD"}
                onChange={(event) => setAddForm({ ...addForm, stripe: event.target.checked })}
                className="accent-cyan-400"
              />
              Card payments
            </label>
            <div className="flex gap-3 md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2 text-sm font-semibold disabled:opacity-50"
              >
                {saving ? "Saving…" : "Create region"}
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="rounded-full border border-white/15 px-5 py-2 text-sm text-blue-100"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        <div className="overflow-x-auto rounded-3xl border border-white/10 bg-white/5">
          <table className="min-w-full divide-y divide-white/10">
            <thead className="bg-white/5">
              <tr>
                {["Region", "Currency", "Payment", "Plans", "Status", ""].map((heading) => (
                  <th key={heading || "actions"} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-blue-200/70">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {regions.map((region) => {
                const open = openRegion === region.id;
                const plans = plansFor(region.id);
                return (
                  <Fragment key={region.id}>
                    <tr className={open ? "bg-cyan-500/10" : "hover:bg-white/5"}>
                      <td className="px-6 py-4 text-sm font-medium text-white">
                        <button type="button" onClick={() => setOpenRegion(open ? null : region.id)} className="text-left">
                          <span className="mr-2 text-cyan-200">{open ? "▾" : "▸"}</span>
                          {region.name}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-blue-100">{region.currency}</td>
                      <td className="px-6 py-4 text-sm text-blue-100">{region.stripe ? "Card" : "Contact"}</td>
                      <td className="px-6 py-4 text-sm text-blue-100">{plans.length}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          region.enabled
                            ? "border border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
                            : "border border-rose-400/30 bg-rose-500/15 text-rose-200"
                        }`}>
                          {region.enabled ? "Enabled" : "Disabled"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => setOpenRegion(open ? null : region.id)}
                            className="font-semibold text-cyan-200"
                          >
                            Plans
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => regionAction("set-region-enabled", { id: region.id, enabled: !region.enabled })}
                            className="font-semibold text-blue-100"
                          >
                            {region.enabled ? "Disable" : "Enable"}
                          </button>
                          {region.id !== "usa" ? (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => setMatchTarget(region)}
                              className="font-semibold text-cyan-200 disabled:opacity-40"
                            >
                              Use USA prices
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={saving || region.id === "usa"}
                            onClick={() => {
                              if (window.confirm(`Delete ${region.name}? Its prices will be removed.`)) {
                                regionAction("delete-region", { id: region.id });
                              }
                            }}
                            className="font-semibold text-rose-200 disabled:opacity-40"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                    {open ? (
                      <tr className="bg-[#040b1a]/60">
                        <td colSpan={6} className="px-6 py-4">
                          <table className="min-w-full">
                            <thead>
                              <tr className="text-left text-xs uppercase tracking-wider text-blue-200/70">
                                <th className="px-3 py-2">Plan</th>
                                <th className="px-3 py-2">Price</th>
                                <th className="px-3 py-2">Status</th>
                                <th className="px-3 py-2"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {plans.map((config) => {
                                const isEditing = editingId === config.id;
                                const step = config.currency === "PKR" ? "1" : "0.01";
                                return (
                                  <tr key={config.id} className="border-t border-white/10">
                                    <td className="px-3 py-3 text-sm font-medium text-white">
                                      {PLAN_NAMES[config.plan_id] || config.plan_id}
                                    </td>
                                    <td className="px-3 py-3 text-sm text-cyan-100">
                                      {isEditing ? (
                                        <input
                                          type="number"
                                          min="0"
                                          step={step}
                                          value={formData.firstSiteAmount}
                                          onChange={(event) => setFormData({ ...formData, firstSiteAmount: event.target.value })}
                                          className={inputClass}
                                        />
                                      ) : (
                                        formatCurrency(config.first_site_cents, config.currency)
                                      )}
                                    </td>
                                    <td className="px-3 py-3 text-sm">
                                      {isEditing ? (
                                        <label className="flex items-center text-blue-100">
                                          <input
                                            type="checkbox"
                                            checked={formData.active}
                                            onChange={(event) => setFormData({ ...formData, active: event.target.checked })}
                                            className="mr-2 accent-cyan-400"
                                          />
                                          Active
                                        </label>
                                      ) : (
                                        <span className="text-blue-100">{config.active ? "Active" : "Contact only"}</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-3 text-sm">
                                      {isEditing ? (
                                        <div className="flex gap-2">
                                          <button type="button" onClick={saveEdit} disabled={saving} className="inline-flex items-center gap-2 font-semibold text-cyan-200 disabled:opacity-50">
                                            {saving ? (
                                              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-cyan-200/30 border-t-cyan-200" aria-hidden />
                                            ) : null}
                                            {saving ? "Saving…" : "Save"}
                                          </button>
                                          <button type="button" onClick={cancelEdit} disabled={saving} className="text-blue-100">
                                            Cancel
                                          </button>
                                        </div>
                                      ) : (
                                        <button type="button" onClick={() => startEdit(config)} className="font-semibold text-cyan-200">
                                          Edit
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {saving ? (
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-[#07122a] px-8 py-7 shadow-2xl">
              <span
                className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-400/25 border-t-cyan-300"
                aria-hidden
              />
              <p className="text-sm font-medium text-blue-100">
                {matchTarget ? `Updating ${matchTarget.name} prices…` : "Updating…"}
              </p>
            </div>
          </div>
        ) : null}

        {matchTarget ? (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
            role="presentation"
            onClick={saving ? undefined : () => setMatchTarget(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="match-usa-title"
              className="w-full max-w-md rounded-3xl border border-white/10 bg-[#07122a] p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="text-xs font-bold tracking-[0.14em] text-cyan-300/90 uppercase">
                Region pricing
              </p>
              <h3
                id="match-usa-title"
                className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold text-white"
              >
                Set {matchTarget.name} prices to match the United States?
              </h3>
              <p className="mt-3 text-sm leading-6 text-blue-100/85">
                {String(matchTarget.currency || "").toUpperCase() === "USD"
                  ? `Each plan on ${matchTarget.name} will use the United States prices.`
                  : `${matchTarget.name} uses ${matchTarget.currency}, so the numbers are copied without converting currency.`}
              </p>
              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setMatchTarget(null)}
                  className="rounded-full px-4 py-2.5 text-sm font-medium text-blue-100 hover:bg-white/5 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => regionAction("copy-usa-prices", { id: matchTarget.id })}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
                >
                  {saving ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
                  ) : null}
                  {saving ? "Updating…" : "Use USA prices"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-blue-100">
          <p className="font-semibold text-white">Notes</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Open a region to edit Starter, Custom, Domain, Free, and Pro.</li>
            <li>Use USA prices copies that region’s plans from the United States.</li>
            <li>Disable hides the region from the plan page. Delete is blocked while customers still use it.</li>
            <li>Yearly billing is always 10 months of the monthly price, so customers get 2 months free. Leave Pro at 0 to keep it as Contact us.</li>
            <li>Card payments are available for USD regions. Pakistan stays on local activation.</li>
          </ul>
        </div>
    </div>
  );
}
