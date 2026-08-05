"use client";

import { useState } from "react";

export default function ChatOnboarding({ prompt, token, onAnswered, busy }) {
  const [phone, setPhone] = useState("");
  const [localBusy, setLocalBusy] = useState(false);
  const [error, setError] = useState("");

  if (!prompt) return null;

  const submitting = busy || localBusy;

  async function submit({ value, text }) {
    setLocalBusy(true);
    setError("");
    try {
      const res = await fetch("/api/conversations/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, value, text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      onAnswered?.(data);
    } catch (err) {
      setError(err.message || "Failed");
    } finally {
      setLocalBusy(false);
    }
  }

  return (
    <div className="border-t border-cyan-100 bg-cyan-50/80 px-4 py-4">
      <p className="text-[11px] font-bold tracking-[0.14em] text-cyan-800 uppercase">Assistant</p>
      <h3 className="mt-1 text-base font-semibold text-zinc-900">{prompt.title}</h3>
      {prompt.hint && <p className="mt-1 text-sm text-zinc-600">{prompt.hint}</p>}
      {prompt.explanation && (
        <p className="mt-3 whitespace-pre-wrap rounded-xl bg-white/80 px-3 py-3 text-sm leading-6 text-zinc-700 ring-1 ring-cyan-100">
          {prompt.explanation}
        </p>
      )}

      {prompt.input === "phone" && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            type="tel"
            className="w-full flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none ring-cyan-400/30 focus:ring-2"
            placeholder="e.g. +1 555 123 4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={submitting}
          />
          <button
            type="button"
            disabled={submitting || phone.trim().length < 5}
            onClick={() => submit({ value: "phone", text: phone.trim() })}
            className="rounded-full bg-[#0b3d91] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Save phone
          </button>
        </div>
      )}

      <div className="mt-4 grid gap-2">
        {prompt.options?.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={submitting}
            onClick={() => submit({ value: opt.value })}
            className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left transition hover:border-cyan-400 hover:bg-cyan-50/50 disabled:opacity-50"
          >
            <span className="block text-sm font-semibold text-zinc-900">{opt.label}</span>
            {opt.description && (
              <span className="mt-1 block text-xs leading-5 text-zinc-500">{opt.description}</span>
            )}
          </button>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {submitting && <p className="mt-2 text-xs text-cyan-800">Saving…</p>}
    </div>
  );
}
