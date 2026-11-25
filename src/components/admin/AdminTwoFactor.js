"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const inputClass =
  "w-full rounded-lg border border-white/15 bg-[#040b1a] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30";

const TOTP_ASK_LIFE_OPTIONS = [
  { id: "every", label: "Every login", hint: "Ask for a code each time you sign in." },
  { id: "week", label: "Per week", hint: "Remember this device for 7 days." },
  { id: "days30", label: "Every 30 days", hint: "Remember this device for 30 days." },
];

function TotpAskLifePicker({ value, onChange, disabled }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-white">Ask for the code</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {TOTP_ASK_LIFE_OPTIONS.map((option) => {
          const selected = value === option.id;
          return (
            <label
              key={option.id}
              className={`cursor-pointer rounded-xl border px-3 py-3 text-sm transition ${
                selected
                  ? "border-cyan-400/50 bg-cyan-500/10"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              } ${disabled ? "opacity-60" : ""}`}
            >
              <input
                type="radio"
                name="admin-totp-ask-life"
                className="sr-only"
                checked={selected}
                disabled={disabled}
                onChange={() => onChange(option.id)}
              />
              <span className="block font-semibold text-white">{option.label}</span>
              <span className="mt-1 block text-xs leading-5 text-blue-200/70">{option.hint}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function AdminTwoFactor() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totpSetup, setTotpSetup] = useState(null);
  const [totpCode, setTotpCode] = useState("");
  const [totpPassword, setTotpPassword] = useState("");
  const [totpStatus, setTotpStatus] = useState("");
  const [totpBusy, setTotpBusy] = useState(false);
  const [totpAskLife, setTotpAskLife] = useState("every");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/profile");
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) {
        router.push("/login");
        return;
      }
      if (!cancelled && data.user) {
        setUser(data.user);
        setTotpAskLife(data.user.totpAskLife || "every");
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function totpAction(action, nextAskLife) {
    const askLife = nextAskLife || totpAskLife;
    setTotpBusy(true);
    setTotpStatus("");
    try {
      const res = await fetch("/api/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          code: totpCode,
          password: totpPassword,
          askLife,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Authenticator update failed");
      if (data.user) {
        setUser(data.user);
        setTotpAskLife(data.user.totpAskLife || "every");
      }
      if (action === "setup") {
        setTotpSetup({
          secret: data.secret,
          qrDataUrl: data.qrDataUrl,
        });
        setTotpCode("");
      } else if (action !== "ask-life") {
        setTotpSetup(null);
        setTotpCode("");
        setTotpPassword("");
      }
      setTotpStatus(data.message || "Updated");
    } catch (err) {
      setTotpStatus(err.message || "Authenticator update failed");
    } finally {
      setTotpBusy(false);
    }
  }

  if (loading || !user) {
    return <p className="text-sm text-blue-100">Loading authenticator…</p>;
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">2FA</h1>
      <p className="mt-1 text-sm text-blue-100/80">
        Optional. Sign-in stays password-only until you finish setup with Google Authenticator.
      </p>

      {user.totpEnabled && !totpSetup ? (
        <div className="mt-6 space-y-4">
          <p className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            Authenticator is on for this account.
          </p>
          <TotpAskLifePicker
            value={totpAskLife}
            disabled={totpBusy}
            onChange={(life) => {
              setTotpAskLife(life);
              totpAction("ask-life", life);
            }}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-blue-100">Current password</label>
            <input
              type="password"
              autoComplete="current-password"
              className={inputClass}
              value={totpPassword}
              onChange={(e) => setTotpPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-blue-100">Authenticator code</label>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className={`${inputClass} tracking-[0.3em]`}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </div>
          {totpStatus ? <p className="text-sm text-cyan-200">{totpStatus}</p> : null}
          <button
            type="button"
            disabled={totpBusy}
            onClick={() => totpAction("disable")}
            className="rounded-full border border-rose-400/40 px-5 py-2.5 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/10 disabled:opacity-60"
          >
            {totpBusy ? "Turning off…" : "Turn off authenticator"}
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {!totpSetup ? (
            <button
              type="button"
              disabled={totpBusy}
              onClick={() => totpAction("setup")}
              className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
            >
              {totpBusy ? "Preparing…" : "Set up authenticator"}
            </button>
          ) : (
            <>
              <p className="text-sm text-blue-100/80">
                Scan this QR in Google Authenticator, then enter the 6-digit code.
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={totpSetup.qrDataUrl}
                alt="Authenticator QR code"
                className="h-48 w-48 rounded-xl border border-white/10 bg-white p-2"
              />
              <p className="text-xs text-blue-200/70">
                Can’t scan? Key: <span className="font-mono text-cyan-200">{totpSetup.secret}</span>
              </p>
              <TotpAskLifePicker
                value={totpAskLife}
                disabled={totpBusy}
                onChange={setTotpAskLife}
              />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-blue-100">6-digit code</label>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  className={`${inputClass} tracking-[0.3em]`}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
              </div>
              <button
                type="button"
                disabled={totpBusy}
                onClick={() => totpAction("enable")}
                className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
              >
                {totpBusy ? "Verifying…" : "Turn on authenticator"}
              </button>
            </>
          )}
          {totpStatus ? <p className="text-sm text-cyan-200">{totpStatus}</p> : null}
        </div>
      )}
    </div>
  );
}
