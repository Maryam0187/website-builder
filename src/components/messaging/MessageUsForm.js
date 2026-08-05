"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MessageUsForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    websiteName: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      const params = new URLSearchParams({
        email: data.email || form.email,
      });
      if (data.existing) params.set("existing", "1");
      router.push(`/check-email?${params.toString()}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <div>
        <label className="mb-1 block text-sm text-blue-100">Your name</label>
        <input
          required
          className="w-full rounded-xl border border-white/15 bg-[#07122a] px-3 py-2.5 text-white"
          value={form.name}
          onChange={(e) => setField("name", e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-blue-100">Email</label>
        <input
          type="email"
          required
          className="w-full rounded-xl border border-white/15 bg-[#07122a] px-3 py-2.5 text-white"
          value={form.email}
          onChange={(e) => setField("email", e.target.value)}
          placeholder="We send your private chat link here"
        />
        <p className="mt-1 text-xs text-blue-100/80">
          We email a chat link. When you open it, our assistant asks a few questions and creates your
          sample site.
        </p>
      </div>
      <div>
        <label className="mb-1 block text-sm text-blue-100">Website name</label>
        <input
          required
          className="w-full rounded-xl border border-white/15 bg-[#07122a] px-3 py-2.5 text-white"
          value={form.websiteName}
          onChange={(e) => setField("websiteName", e.target.value)}
          placeholder="e.g. Rose Bakery, Ali Clinic"
        />
      </div>
      {error && <p className="text-sm text-red-300">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-60"
      >
        {loading ? "Sending chat link…" : "Get chat link by email"}
      </button>
    </form>
  );
}
