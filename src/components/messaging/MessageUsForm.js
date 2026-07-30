"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadImages } from "./MessageComposer";

export default function MessageUsForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    websiteName: "",
    phone: "",
    businessType: "",
    message: "",
  });
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onFiles(e) {
    try {
      const urls = await uploadImages(e.target.files);
      setImages((prev) => [...prev, ...urls].slice(0, 8));
    } catch (err) {
      setError(err.message);
    } finally {
      e.target.value = "";
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, images }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      router.push(`/check-email?email=${encodeURIComponent(data.email || form.email)}`);
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
          Opening the emailed link verifies your email and opens your chat.
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
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-blue-100">Phone / WhatsApp</label>
          <input
            className="w-full rounded-xl border border-white/15 bg-[#07122a] px-3 py-2.5 text-white"
            value={form.phone}
            onChange={(e) => setField("phone", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-blue-100">Business type</label>
          <input
            placeholder="Salon, clinic, shop…"
            className="w-full rounded-xl border border-white/15 bg-[#07122a] px-3 py-2.5 text-white"
            value={form.businessType}
            onChange={(e) => setField("businessType", e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm text-blue-100">Tell us about your business</label>
        <textarea
          required
          className="min-h-32 w-full rounded-xl border border-white/15 bg-[#07122a] px-3 py-2.5 text-white"
          value={form.message}
          onChange={(e) => setField("message", e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-blue-100">
          Design screenshots (ChatGPT, Claude, Gemini, etc.)
        </label>
        <input type="file" accept="image/*" multiple onChange={onFiles} className="text-sm text-blue-100" />
        {images.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {images.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt="" className="h-16 w-16 rounded-lg object-cover" />
            ))}
          </div>
        )}
      </div>
      {error && <p className="text-sm text-red-300">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-60"
      >
        {loading ? "Sending chat link…" : "Send message & get chat link by email"}
      </button>
    </form>
  );
}
