"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminDiscountsPage() {
  const router = useRouter();
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(getDefaultFormData());
  const [saving, setSaving] = useState(false);

  function getDefaultFormData() {
    return {
      type: 'coupon',
      code: '',
      name: '',
      valueType: 'percent',
      valueAmount: 10,
      durationType: 'repeating',
      durationMonths: 3,
      maxRedemptions: null,
      applicablePlans: [],
      billingInterval: null,
      expiryDate: null,
      createStripeCoupon: true,
    };
  }

  useEffect(() => {
    fetchDiscounts();
  }, []);

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
      durationType: discount.duration_type,
      durationMonths: discount.duration_months || 3,
      maxRedemptions: discount.max_redemptions,
      applicablePlans: discount.applicable_plans || [],
      billingInterval: discount.billing_interval,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-gray-600">Loading discounts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
            <button
              onClick={fetchDiscounts}
              className="mt-2 text-red-600 hover:text-red-700 underline"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Discount Management</h1>
            <p className="mt-2 text-gray-600">
              Manage founding customer offers, coupon codes, and promotions
            </p>
          </div>
          <button
            onClick={startCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Create Discount
          </button>
        </div>

        {showCreateForm && (
          <div className="mb-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">
              {editingId ? 'Edit Discount' : 'Create New Discount'}
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  disabled={editingId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="founding">Founding Offer</option>
                  <option value="coupon">Coupon Code</option>
                </select>
              </div>

              {formData.type === 'coupon' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    disabled={editingId}
                    placeholder="SAVE50"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="50% Off Promotion"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Type
                </label>
                <select
                  value={formData.valueType}
                  onChange={(e) => setFormData({ ...formData, valueType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="percent">Percentage</option>
                  <option value="fixed">Fixed Amount (cents)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.valueType === 'percent' ? 'Percentage (%)' : 'Amount (cents)'}
                </label>
                <input
                  type="number"
                  value={formData.valueAmount}
                  onChange={(e) => setFormData({ ...formData, valueAmount: parseInt(e.target.value) || 0 })}
                  min="0"
                  max={formData.valueType === 'percent' ? 100 : undefined}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration
                </label>
                <select
                  value={formData.durationType}
                  onChange={(e) => setFormData({ ...formData, durationType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="once">One-time</option>
                  <option value="repeating">Repeating (N months)</option>
                  <option value="forever">Forever</option>
                </select>
              </div>

              {formData.durationType === 'repeating' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (months)
                  </label>
                  <input
                    type="number"
                    value={formData.durationMonths}
                    onChange={(e) => setFormData({ ...formData, durationMonths: parseInt(e.target.value) || 1 })}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Redemptions (optional)
                </label>
                <input
                  type="number"
                  value={formData.maxRedemptions || ''}
                  onChange={(e) => setFormData({ ...formData, maxRedemptions: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Unlimited"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date (optional)
                </label>
                <input
                  type="date"
                  value={formData.expiryDate || ''}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              {!editingId && (
                <div className="col-span-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.createStripeCoupon}
                      onChange={(e) => setFormData({ ...formData, createStripeCoupon: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">
                      Create Stripe coupon automatically
                    </span>
                  </label>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={saveDiscount}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </button>
              <button
                onClick={cancelForm}
                disabled={saving}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code/Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Redemptions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {discounts.map((discount) => (
                <tr key={discount.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      discount.type === 'founding' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {discount.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {discount.code && <div className="font-mono font-bold">{discount.code}</div>}
                    <div className="text-gray-600">{discount.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {discount.value_type === 'percent' 
                      ? `${discount.value_amount}%` 
                      : `$${(discount.value_amount / 100).toFixed(2)}`
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {discount.duration_type === 'once' && 'One-time'}
                    {discount.duration_type === 'repeating' && `${discount.duration_months} months`}
                    {discount.duration_type === 'forever' && 'Forever'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {discount.used_count} {discount.max_redemptions ? `/ ${discount.max_redemptions}` : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => toggleActive(discount.id, discount.active)}
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        discount.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {discount.active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => startEdit(discount)}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {discounts.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No discounts created yet. Click "Create Discount" to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
