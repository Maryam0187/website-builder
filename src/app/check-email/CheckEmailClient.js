"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";

export default function CheckEmailClient() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "your email";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#040b1a] px-6 text-white">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 50% at 50% -20%, rgba(34,211,238,0.2), transparent)",
        }}
      />
      <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
        <BrandLogo href="/" className="mb-6" />
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold">
          Check your email
        </h1>
        <p className="mt-4 text-base leading-7 text-blue-100">
          We sent your private chat link to <strong className="text-white">{email}</strong>.
        </p>
        <p className="mt-3 text-sm leading-6 text-blue-100">
          Open that link to verify your email and continue the conversation. It is the same token
          link as before — keep the email so you can return anytime.
        </p>
        <ul className="mt-6 space-y-2 text-sm text-blue-100">
          <li>• Check spam / promotions if you do not see it</li>
          <li>• In local dev without Resend, the link is printed in the server console</li>
        </ul>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium hover:bg-white/5"
          >
            Back home
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-medium hover:bg-white/15"
          >
            Owner / Admin login
          </Link>
        </div>
      </div>
    </div>
  );
}
