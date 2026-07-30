"use client";

import { useRef, useState } from "react";

export async function uploadImages(fileList) {
  const form = new FormData();
  Array.from(fileList).forEach((file) => form.append("files", file));
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data.urls || [];
}

export default function MessageComposer({ onSend, placeholder = "Write a message…" }) {
  const [body, setBody] = useState("");
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  async function onFiles(e) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    setError("");
    try {
      const urls = await uploadImages(files);
      setImages((prev) => [...prev, ...urls].slice(0, 8));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (!body.trim() && images.length === 0) return;
    setSending(true);
    setError("");
    try {
      await onSend({ body: body.trim(), images });
      setBody("");
      setImages([]);
    } catch (err) {
      setError(err.message || "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 border-t border-zinc-200 bg-white p-4">
      <p className="text-xs text-zinc-500">
        Got a design from ChatGPT, Claude, or Gemini? Upload the screenshot here.
      </p>
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((url) => (
            <div key={url} className="relative h-16 w-16 overflow-hidden rounded-lg border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                className="absolute right-0.5 top-0.5 rounded bg-black/60 px-1 text-[10px] text-white"
                onClick={() => setImages((prev) => prev.filter((u) => u !== url))}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <textarea
        className="min-h-24 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
        placeholder={placeholder}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center justify-between gap-3">
        <div>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onFiles} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            {uploading ? "Uploading…" : "Attach images"}
          </button>
        </div>
        <button
          type="submit"
          disabled={sending}
          className="rounded-full bg-[#0b3d91] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </form>
  );
}
