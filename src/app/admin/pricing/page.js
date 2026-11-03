"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminPricingPage() {
  const router = useRouter();
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfigs();
  }, []);

  async function fetchConfigs() {
    try {
      setLoading(true);
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
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(config) {
    setEditingId(config.id);
    setFormData({
      id: config.id,
      region: config.region,
      planId: config.plan_id,
      currency: config.currency,
      firstSiteCents: config.first_site_cents,
      extraSiteCents: config.extra_site_cents,
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
      const res = await fetch("/api/admin/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      
      await fetchConfigs();
      setEditingId(null);
      setFormData({});
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  function formatCurrency(cents, currency) {
    const amount = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-gray-600">Loading pricing configurations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
            <button
              onClick={fetchConfigs}
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
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Pricing Configuration</h1>
          <p className="mt-2 text-gray-600">
            Manage pricing for all regions and plans. Changes create new Stripe Price objects and archive old ones.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Region
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  First Site
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Extra Site
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {configs.map((config) => {
                const isEditing = editingId === config.id;
                
                return (
                  <tr key={config.id} className={isEditing ? "bg-blue-50" : ""}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {config.region.toUpperCase()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {config.plan_id.toUpperCase()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {isEditing ? (
                        <input
                          type="number"
                          value={formData.firstSiteCents}
                          onChange={(e) => setFormData({
                            ...formData,
                            firstSiteCents: parseInt(e.target.value, 10) || 0,
                          })}
                          className="w-24 px-2 py-1 border border-gray-300 rounded"
                          placeholder="Cents"
                        />
                      ) : (
                        formatCurrency(config.first_site_cents, config.currency)
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {isEditing ? (
                        <input
                          type="number"
                          value={formData.extraSiteCents}
                          onChange={(e) => setFormData({
                            ...formData,
                            extraSiteCents: parseInt(e.target.value, 10) || 0,
                          })}
                          className="w-24 px-2 py-1 border border-gray-300 rounded"
                          placeholder="Cents"
                        />
                      ) : (
                        formatCurrency(config.extra_site_cents, config.currency)
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {isEditing ? (
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.active}
                            onChange={(e) => setFormData({
                              ...formData,
                              active: e.target.checked,
                            })}
                            className="mr-2"
                          />
                          Active
                        </label>
                      ) : (
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          config.active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}>
                          {config.active ? "Active" : "Contact Only"}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <button
                            onClick={saveEdit}
                            disabled={saving}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                          >
                            {saving ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={saving}
                            className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(config)}
                          className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 text-sm text-gray-600">
          <p className="font-semibold">Notes:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Prices are in cents. Example: 2999 = $29.99</li>
            <li>Changing prices creates new Stripe Price IDs and archives old ones</li>
            <li>Existing subscriptions continue using their original price</li>
            <li>Set Active to false for contact-only plans</li>
            <li>Pakistan region does not use Stripe (always contact-only)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
