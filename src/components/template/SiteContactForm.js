"use client";

import { useState } from "react";
import { bookMeetingLabel, getBookMeetingHref } from "@/lib/booking";

const DEFAULT_EMAIL = "info@technonaire.com";

export default function SiteContactForm({
  theme = {},
  siteName = "",
  siteSlug = "",
  toEmail = DEFAULT_EMAIL,
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [bookMeeting, setBookMeeting] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const calendlyUrl = getBookMeetingHref();

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      const res = await fetch("/api/site/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          message,
          bookMeeting,
          siteName,
          siteSlug,
          toEmail: toEmail || DEFAULT_EMAIL,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send message");
      setStatus(
        bookMeeting
          ? "Message sent — opening Calendly to book a meeting…"
          : "Message sent — thank you!",
      );
      if (bookMeeting && typeof window !== "undefined") {
        window.open(calendlyUrl, "_blank", "noopener,noreferrer");
      }
      setName("");
      setEmail("");
      setMessage("");
      setBookMeeting(false);
    } catch (err) {
      setStatus(err.message || "Could not send message");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/50 outline-none transition focus:border-white/45 focus:bg-white/15";

  return (
    <form onSubmit={handleSubmit} className="mt-8 max-w-xl space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          required
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className={inputClass}
          disabled={busy}
        />
        <input
          required
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email"
          className={inputClass}
          disabled={busy}
        />
      </div>
      <textarea
        required
        name="message"
        rows={4}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={bookMeeting ? "Tell us when you’d like to meet…" : "How can we help?"}
        className={`${inputClass} resize-y`}
        disabled={busy}
      />
      <label className="flex cursor-pointer items-center gap-2 text-sm text-white/85">
        <input
          type="checkbox"
          checked={bookMeeting}
          onChange={(e) => setBookMeeting(e.target.checked)}
          className="h-4 w-4 rounded border-white/30"
          disabled={busy}
        />
        {bookMeetingLabel} (Calendly)
      </label>
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={busy}
          className="rounded-full px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
          style={{ background: theme.primary || "#14532d" }}
        >
          {busy ? "Sending…" : bookMeeting ? "Send & open Calendly" : "Send message"}
        </button>
        <a
          href={calendlyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-white/90 underline underline-offset-4"
        >
          Or {bookMeetingLabel.toLowerCase()}
        </a>
        <a
          href={`mailto:${toEmail || DEFAULT_EMAIL}`}
          className="text-sm font-semibold text-white/90 underline underline-offset-4"
        >
          {toEmail || DEFAULT_EMAIL}
        </a>
      </div>
      {status ? <p className="text-sm text-white/85">{status}</p> : null}
    </form>
  );
}
