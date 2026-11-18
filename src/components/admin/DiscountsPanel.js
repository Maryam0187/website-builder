"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import CouponStatusTabs from "@/components/billing/CouponStatusTabs";
import { discountBuckets } from "@/lib/discount-buckets";

const fieldClass =
  "w-full rounded-lg border border-white/15 bg-[#040b1a] px-3 py-2 text-sm text-white outline-none [color-scheme:dark] focus:border-cyan-400/50 disabled:opacity-60";
const labelClass = "mb-1 block text-sm font-medium text-blue-100";
const hintClass = "mt-1 text-xs text-blue-200/70";

function customersOnDiscount(discount) {
  let people = discount?.assigned_customers;
  if (typeof people === "string") {
    try {
      people = JSON.parse(people);
    } catch {
      people = [];
    }
  }
  if (!Array.isArray(people)) people = [];
  const fromList = people.filter((person) => person?.id && person.email);
  if (fromList.length) return fromList;
  if (discount?.assigned_user_id && discount.assigned_email) {
    return [{ id: discount.assigned_user_id, email: discount.assigned_email, name: discount.assigned_name || "" }];
  }
  return [];
}

const PLAN_OPTIONS = [
  { id: "free", name: "Free" },
  { id: "starter", name: "Starter" },
  { id: "custom", name: "Custom" },
  { id: "domain", name: "Domain" },
  { id: "pro", name: "Pro" },
];

export default function DiscountsPanel() {
  const router = useRouter();
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(getDefaultFormData());
  const [saving, setSaving] = useState(false);
  const [couponTab, setCouponTab] = useState("available");
  const [userQuery, setUserQuery] = useState("");
  const [userMatches, setUserMatches] = useState([]);
  const [userSearchBusy, setUserSearchBusy] = useState(false);

  function getDefaultFormData() {
    return {
      type: 'coupon',
      code: '',
      name: '',
      valueType: 'percent',
      valueAmount: 10,
      yearlyValueAmount: null,
      durationType: 'repeating',
      durationMonths: 3,
      maxRedemptions: null,
      applicablePlans: [],
      billingInterval: null,
      expiryDate: null,
      assignedCustomers: [],
      createStripeCoupon: true,
    };
  }

  useEffect(() => {
    fetchDiscounts();
  }, []);

  useEffect(() => {
    if (formData.type !== "coupon") return undefined;
    const q = userQuery.trim();
    if (q.length < 2) {
      setUserMatches([]);
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setUserSearchBusy(true);
      try {
        const res = await fetch(`/api/admin/discounts?action=search-users&q=${encodeURIComponent(q)}`);
        const data = await res.json().catch(() => ({}));
        if (!cancelled) setUserMatches(data.users || []);
      } finally {
        if (!cancelled) setUserSearchBusy(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [userQuery, formData.type]);

  async function fetchDiscounts() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/discounts");
      
      if (res.status === 401 || res.status === 403) {
        router.push("/login");
        return;
      }
      
      if (!res.ok) {
        throw new Error("Failed to fetch discounts");
      }
      
      const data = await res.json();
      setDiscounts(data.discounts || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function startCreate() {
    setFormData(getDefaultFormData());
    setUserQuery("");
    setUserMatches([]);
    setEditingId(null);
    setShowCreateForm(true);
  }

  function startEdit(discount) {
    setFormData({
      type: discount.type,
      code: discount.code || '',
      name: discount.name,
      valueType: discount.value_type,
      valueAmount: discount.value_amount,
      yearlyValueAmount: discount.yearly_value_amount ?? null,
      durationType: discount.duration_type,
      durationMonths: discount.duration_months || 3,
      maxRedemptions: discount.max_redemptions,
      applicablePlans: discount.applicable_plans || [],
      billingInterval: discount.billing_interval,
      assignedCustomers: customersOnDiscount(discount),
      expiryDate: discount.expiry_date ? discount.expiry_date.split('T')[0] : null,
      active: discount.active,
      createStripeCoupon: false,
    });
    setEditingId(discount.id);
    setShowCreateForm(true);
  }

  function cancelForm() {
    setShowCreateForm(false);
    setEditingId(null);
    setUserQuery("");
    setUserMatches([]);
    setFormData(getDefaultFormData());
  }

  async function saveDiscount() {
    try {
      setSaving(true);
      
      const payload = {
        action: editingId ? 'update' : 'create',
        discountId: editingId,
        ...formData,
      };
      
      const res = await fetch("/api/admin/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save discount");
      }
      
      await fetchDiscounts();
      cancelForm();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(discountId, currentActive) {
    try {
      const res = await fetch("/api/admin/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: 'update',
          discountId,
          active: !currentActive,
        }),
      });
      
      if (!res.ok) {
        throw new Error("Failed to toggle discount");
      }
      
      await fetchDiscounts();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  }

  async function deleteDiscountRow(discount) {
    const label = discount.code || discount.name;
    if (!window.confirm(`Delete ${label}? Customers will no longer be able to use it.`)) return;
    try {
      const res = await fetch("/api/admin/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          discountId: discount.id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not delete the discount");
      await fetchDiscounts();
    } catch (err) {
      alert(err.message || "Could not delete the discount");
    }
  }

  if (loading) {
    return <p className="text-sm text-blue-100">Loading discounts…</p>;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-5">
        <p className="text-rose-200">{error}</p>
        <button
          onClick={fetchDiscounts}
          className="mt-3 text-sm font-semibold text-cyan-200 underline-offset-2 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">Discounts</h1>
            <p className="mt-2 text-sm text-blue-100">
              Special offers apply on their own while they are active. Coupon codes are entered by the customer.
            </p>
          </div>
          <button
            onClick={startCreate}
            className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold"
          >
            Create discount
          </button>
        </div>

        {showCreateForm && (
          <div className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-6">
            <h2 className="mb-4 text-xl font-semibold">
              {editingId ? "Edit discount" : "Create discount"}
            </h2>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>Type</label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value,
                      assignedCustomers: e.target.value === "coupon" ? formData.assignedCustomers : [],
                    })
                  }
                  disabled={editingId}
                  className={fieldClass}
                >
                  <option value="promotion">Special offer (auto-applied)</option>
                  <option value="coupon">Coupon code (customer enters)</option>
                </select>
                <p className={hintClass}>
                  {formData.type === "promotion"
                    ? "Applied to new subscriptions while it is active and not expired."
                    : "The customer enters this code at checkout. Assigning an email is optional."}
                </p>
              </div>

              {formData.type === "coupon" && (
                <div>
                  <label className={labelClass}>Code</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    disabled={editingId}
                    placeholder="SAVE50"
                    className={fieldClass}
                  />
                </div>
              )}

              {formData.type === "coupon" ? (
                <div className="md:col-span-2">
                  <label className={labelClass}>Customer emails (optional)</label>
                  {(formData.assignedCustomers || []).length > 0 ? (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {formData.assignedCustomers.map((person) => (
                        <span
                          key={person.id}
                          className="inline-flex max-w-full items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 py-1 pl-3 pr-1 text-sm text-white"
                        >
                          <span className="truncate">{person.email}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                assignedCustomers: formData.assignedCustomers.filter((item) => item.id !== person.id),
                              })
                            }
                            className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold text-cyan-100 hover:bg-white/10"
                          >
                            Remove
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <input
                    type="email"
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder="Search by email and add another"
                    className={fieldClass}
                  />
                  {userSearchBusy ? <p className={hintClass}>Searching…</p> : null}
                  {userMatches.filter((person) => !(formData.assignedCustomers || []).some((item) => String(item.id) === String(person.id))).length > 0 ? (
                    <ul className="mt-2 overflow-hidden rounded-xl border border-white/10">
                      {userMatches
                        .filter((person) => !(formData.assignedCustomers || []).some((item) => String(item.id) === String(person.id)))
                        .map((person) => (
                          <li key={person.id} className="border-t border-white/10 first:border-t-0">
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  assignedCustomers: [
                                    ...(formData.assignedCustomers || []),
                                    { id: person.id, email: person.email, name: person.name },
                                  ],
                                });
                                setUserQuery("");
                                setUserMatches([]);
                              }}
                              className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-white/5"
                            >
                              <span className="truncate text-white">{person.email}</span>
                              {person.name ? <span className="shrink-0 text-blue-200/70">{person.name}</span> : null}
                            </button>
                          </li>
                        ))}
                    </ul>
                  ) : null}
                  <p className={hintClass}>
                    Leave this blank and anyone with the code can use it. Add one or more customers and only they see this coupon at checkout.
                  </p>
                </div>
              ) : null}

              <div>
                <label className={labelClass}>Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="50% off this month"
                  className={fieldClass}
                />
              </div>

              <div>
                <label className={labelClass}>Discount type</label>
                <select
                  value={formData.valueType}
                  onChange={(e) => setFormData({ ...formData, valueType: e.target.value })}
                  className={fieldClass}
                >
                  <option value="percent">Percentage</option>
                  <option value="fixed">Fixed amount (cents)</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>
                  {formData.valueType === "percent" ? "Percentage (%)" : "Amount (cents)"}
                  {!formData.billingInterval && formData.yearlyValueAmount != null ? " · monthly" : ""}
                  {formData.billingInterval === "yearly" ? " · yearly" : ""}
                </label>
                <input
                  type="number"
                  value={formData.valueAmount}
                  onChange={(e) => setFormData({ ...formData, valueAmount: parseInt(e.target.value) || 0 })}
                  min="0"
                  max={formData.valueType === "percent" ? 100 : undefined}
                  className={fieldClass}
                />
                {!formData.billingInterval && formData.yearlyValueAmount == null ? (
                  <p className={hintClass}>Used for both monthly and yearly billing.</p>
                ) : null}
              </div>

              {!formData.billingInterval ? (
                <div className="md:col-span-2">
                  <label className="flex items-center text-sm text-blue-100">
                    <input
                      type="checkbox"
                      checked={formData.yearlyValueAmount != null}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          yearlyValueAmount: e.target.checked ? formData.valueAmount : null,
                        })
                      }
                      className="mr-2 accent-cyan-400"
                    />
                    Use a different discount for yearly billing
                  </label>
                  {formData.yearlyValueAmount != null ? (
                    <div className="mt-3 max-w-xs">
                      <label className={labelClass}>
                        {formData.valueType === "percent" ? "Yearly percentage (%)" : "Yearly amount (cents)"}
                      </label>
                      <input
                        type="number"
                        value={formData.yearlyValueAmount}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            yearlyValueAmount: e.target.value === "" ? 0 : parseInt(e.target.value) || 0,
                          })
                        }
                        min="0"
                        max={formData.valueType === "percent" ? 100 : undefined}
                        className={fieldClass}
                      />
                      <p className={hintClass}>Yearly billing uses this amount. Monthly billing uses the amount above.</p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div>
                <label className={labelClass}>Duration</label>
                <select
                  value={formData.durationType}
                  onChange={(e) => setFormData({ ...formData, durationType: e.target.value })}
                  className={fieldClass}
                >
                  <option value="once">One-time</option>
                  <option value="repeating">Repeating (N months)</option>
                  <option value="forever">Forever</option>
                </select>
              </div>

              {formData.durationType === "repeating" && (
                <div>
                  <label className={labelClass}>Duration (months)</label>
                  <input
                    type="number"
                    value={formData.durationMonths}
                    onChange={(e) => setFormData({ ...formData, durationMonths: parseInt(e.target.value) || 1 })}
                    min="1"
                    className={fieldClass}
                  />
                </div>
              )}

              <div>
                <label className={labelClass}>
                  Max redemptions {formData.type === "promotion" ? "(blank for unlimited)" : "(optional)"}
                </label>
                <input
                  type="number"
                  value={formData.maxRedemptions || ""}
                  onChange={(e) => setFormData({ ...formData, maxRedemptions: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Unlimited"
                  min="1"
                  className={fieldClass}
                />
                {formData.type === "promotion" && (
                  <p className={hintClass}>
                    A cap shows remaining spots. Leave it blank to count down by the end date.
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>
                  {formData.type === "promotion" ? "Active until" : "Expiry date (optional)"}
                </label>
                <input
                  type="datetime-local"
                  value={formData.expiryDate ? formData.expiryDate.slice(0, 16) : ""}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value || null })}
                  className={fieldClass}
                  required={formData.type === "promotion"}
                />
                {formData.type === "promotion" && (
                  <p className={hintClass}>
                    The offer stops applying after this date.
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Plans</label>
                <div className="flex flex-wrap gap-2">
                  {PLAN_OPTIONS.map((plan) => {
                    const selected = (formData.applicablePlans || []).includes(plan.id);
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => {
                          const current = formData.applicablePlans || [];
                          const next = selected
                            ? current.filter((id) => id !== plan.id)
                            : [...current, plan.id];
                          setFormData({ ...formData, applicablePlans: next });
                        }}
                        className={`rounded-full border px-3 py-1.5 text-sm ${
                          selected
                            ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-100"
                            : "border-white/15 text-blue-100 hover:bg-white/5"
                        }`}
                      >
                        {plan.name}
                      </button>
                    );
                  })}
                </div>
                <p className={hintClass}>Leave every plan off to cover all of them.</p>
              </div>

              <div>
                <label className={labelClass}>Billing</label>
                <select
                  value={formData.billingInterval || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      billingInterval: e.target.value || null,
                      yearlyValueAmount: e.target.value ? null : formData.yearlyValueAmount,
                    })
                  }
                  className={fieldClass}
                >
                  <option value="">Monthly and yearly</option>
                  <option value="monthly">Monthly only</option>
                  <option value="yearly">Yearly only</option>
                </select>
              </div>

              {!editingId && (
                <div className="md:col-span-2">
                  <label className="flex items-center text-sm text-blue-100">
                    <input
                      type="checkbox"
                      checked={formData.createStripeCoupon}
                      onChange={(e) => setFormData({ ...formData, createStripeCoupon: e.target.checked })}
                      className="mr-2 accent-cyan-400"
                    />
                    Create the matching Stripe coupon
                  </label>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={saveDiscount}
                disabled={saving}
                className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                {saving ? "Saving…" : editingId ? "Update" : "Create"}
              </button>
              <button
                onClick={cancelForm}
                disabled={saving}
                className="rounded-full border border-white/15 px-5 py-2.5 text-sm text-blue-100 hover:bg-white/5 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <CouponStatusTabs
          discounts={discounts}
          active={couponTab}
          onChange={setCouponTab}
        />

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
          <table className="min-w-full divide-y divide-white/10">
            <thead className="bg-white/5">
              <tr>
                {["Type", "Code / name", "Discount", "Duration", "Redemptions", "Status", "Actions"].map((heading) => (
                  <th key={heading} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-blue-200/70">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {discounts.filter((discount) => discountBuckets(discount)[couponTab]).map((discount) => (
                <tr key={discount.id} className="hover:bg-white/5">
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      discount.type === "promotion"
                        ? "border border-violet-400/30 bg-violet-500/15 text-violet-200"
                        : "border border-cyan-400/30 bg-cyan-500/15 text-cyan-100"
                    }`}>
                      {discount.type === "promotion" ? "Special offer" : "Coupon"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {discount.code ? <div className="font-mono font-semibold text-white">{discount.code}</div> : null}
                    <div className="text-blue-100">{discount.name}</div>
                    {customersOnDiscount(discount).length > 0 ? (
                      <div className="mt-1 text-xs text-cyan-100">
                        For {customersOnDiscount(discount).map((person) => person.email).join(", ")}
                      </div>
                    ) : null}
                    {discount.expiry_date ? (
                      <div className="mt-1 text-xs text-blue-200/70">
                        Expires {new Date(discount.expiry_date).toLocaleString()}
                      </div>
                    ) : null}
                    {discount.applicable_plans?.length || discount.billing_interval ? (
                      <div className="mt-1 text-xs text-blue-200/70">
                        {[
                          discount.applicable_plans?.length
                            ? discount.applicable_plans.join(", ")
                            : null,
                          discount.billing_interval,
                        ].filter(Boolean).join(" · ")}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-cyan-100">
                    {discount.value_type === "percent"
                      ? `${discount.value_amount}%`
                      : `$${(discount.value_amount / 100).toFixed(2)}`}
                    {discount.yearly_value_amount != null
                      ? discount.value_type === "percent"
                        ? ` / ${discount.yearly_value_amount}% yearly`
                        : ` / $${(discount.yearly_value_amount / 100).toFixed(2)} yearly`
                      : ""}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-100">
                    {discount.duration_type === "once" && "One-time"}
                    {discount.duration_type === "repeating" && `${discount.duration_months} months`}
                    {discount.duration_type === "forever" && "Forever"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-100">
                    {discount.used_count} {discount.max_redemptions ? `/ ${discount.max_redemptions}` : "(unlimited)"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      discount.active
                        ? "border border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
                        : "border border-white/15 bg-white/5 text-blue-200"
                    }`}>
                      {discount.active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => startEdit(discount)}
                        className="font-semibold text-cyan-200 hover:text-cyan-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleActive(discount.id, discount.active)}
                        className="font-semibold text-blue-100 hover:text-white"
                      >
                        {discount.active ? "Disable" : "Enable"}
                      </button>
                      <button
                        onClick={() => deleteDiscountRow(discount)}
                        className="font-semibold text-rose-200 hover:text-rose-100"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {discounts.filter((discount) => discountBuckets(discount)[couponTab]).length === 0 && (
            <div className="py-12 text-center text-sm text-blue-200/80">
              {couponTab === "available"
                ? "No available coupons."
                : couponTab === "used"
                  ? "No used coupons."
                  : "No expired coupons."}
            </div>
          )}
        </div>
    </div>
  );
}
