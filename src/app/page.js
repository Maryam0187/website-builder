"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import MessageUsForm from "@/components/messaging/MessageUsForm";
import BrandLogo from "@/components/BrandLogo";

const technonaireUrl = process.env.NEXT_PUBLIC_TECHNONAIRE_URL || "https://technonaire.com";
const GUEST_TOKEN_KEY = "tn_guest_chat_token";

const ideas = [
  {
    title: "Local bakery",
    note: "Warm hero, menu highlights, WhatsApp order button",
    image:
      "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Clinic / salon",
    note: "Clean services grid, hours, map, call CTA",
    image:
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Restaurant",
    note: "Full-bleed food photography, specials, reservations",
    image:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Shop / store",
    note: "Product story, featured items, contact & location",
    image:
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Tuition / coaching",
    note: "Courses, results, enrollment form, trust section",
    image:
      "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Professional services",
    note: "About, expertise, case highlights, booking CTA",
    image:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=900&q=80",
  },
];

const steps = [
  {
    title: "Enter a few details",
    body: "Share your name, email, and website name — that’s enough to start.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM4 20a8 8 0 0116 0" />
      </svg>
    ),
  },
  {
    title: "Open AI chat from email",
    body: "We email a private chat link. Open it to verify your email and answer a few quick questions with the AI assistant.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: "Get temporary login",
    body: "The assistant creates your sample draft and posts temporary credentials in the same chat.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    ),
  },
  {
    title: "Set your password",
    body: "Log in with the temp password, choose your own, then open the editor.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    title: "Templates & editing",
    body: "Switch between templates anytime, then click text and photos to edit your site yourself.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M4 20h4.5L19.5 9l-4.5-4.5L4 15.5V20z" />
      </svg>
    ),
  },
];

const editIdeas = [
  {
    title: "Words & headlines",
    body: "Update your business name, tagline, about story, and service descriptions anytime.",
  },
  {
    title: "Photos",
    body: "Swap hero and service images for your own shop photos or stock you prefer.",
  },
  {
    title: "Brand colors",
    body: "Tune primary and accent colors so the site feels like your brand, not a template.",
  },
  {
    title: "Contact details",
    body: "Keep phone, address, hours, and email accurate so customers can reach you.",
  },
];

const editFlow = [
  {
    label: "Log in to the editor",
    detail: "Use your new password and open your draft site.",
  },
  {
    label: "Switch templates",
    detail: "Try different looks until one fits your business.",
  },
  {
    label: "Click to edit",
    detail: "Change headlines, text, colors, and photos in a simple panel.",
  },
  {
    label: "Save & go live",
    detail: "Save changes when you’re happy — your site stays under your control.",
  },
];

function BrowserChrome({ children, title = "yoursite.technonaire.com/edit" }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/15 bg-[#07122a] shadow-2xl shadow-black/40">
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        <div className="ml-3 flex-1 truncate rounded-md bg-black/30 px-3 py-1 text-[11px] text-white/50">
          {title}
        </div>
      </div>
      {children}
    </div>
  );
}

function EditPathVisual() {
  return (
    <div className="grid items-stretch gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <BrowserChrome>
        <div className="relative min-h-[320px] bg-gradient-to-br from-[#0a1a36] via-[#0c2348] to-[#071736] p-6 md:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div className="h-3 w-24 rounded-full bg-cyan-300/40" />
            <div className="flex gap-2">
              <div className="h-2.5 w-10 rounded-full bg-white/20" />
              <div className="h-2.5 w-10 rounded-full bg-white/20" />
              <div className="h-2.5 w-10 rounded-full bg-white/20" />
            </div>
          </div>

          <div className="relative inline-block max-w-md">
            <p className="text-xs font-semibold tracking-wide text-cyan-200/80 uppercase">
              Your homepage
            </p>
            <h3 className="mt-3 rounded-lg border-2 border-dashed border-cyan-300/70 bg-cyan-300/10 px-3 py-2 font-[family-name:var(--font-display)] text-2xl font-semibold leading-snug text-white md:text-3xl">
              We Help Local Businesses Grow Online
            </h3>
            <div className="absolute -right-3 -bottom-3 flex items-center gap-2 rounded-full border border-cyan-300/40 bg-[#040b1a] px-3 py-1.5 text-xs font-semibold text-cyan-100 shadow-lg">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300" />
              </span>
              Click to edit
            </div>
          </div>

          <p className="mt-8 max-w-sm text-sm leading-6 text-blue-100/70">
            Fast websites for owners who want to change words and photos themselves — without learning a
            complicated builder.
          </p>

          <div className="mt-8 flex gap-3">
            <div className="rounded-full bg-white px-5 py-2 text-xs font-semibold text-[#082f79]">
              Book a call
            </div>
            <div className="rounded-full border border-white/30 px-5 py-2 text-xs font-semibold text-white/80">
              Our services
            </div>
          </div>

          <div className="absolute right-6 bottom-6 hidden w-36 overflow-hidden rounded-xl border-2 border-dashed border-cyan-300/50 shadow-lg md:block">
            <div
              className="h-24 bg-cover bg-center"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=400&q=80')",
              }}
            />
            <div className="bg-[#040b1a]/95 px-2 py-1.5 text-center text-[10px] font-semibold text-cyan-100">
              Click photo to replace
            </div>
          </div>
        </div>
      </BrowserChrome>

      <div className="flex flex-col gap-4">
        <div className="flex-1 overflow-hidden rounded-2xl border border-cyan-300/25 bg-[#07122a] shadow-2xl shadow-cyan-900/20">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <p className="text-xs font-bold tracking-wide text-cyan-200 uppercase">Edit panel</p>
              <p className="mt-0.5 text-sm text-white/60">Headline text</p>
            </div>
            <span className="rounded-full bg-cyan-300/15 px-2.5 py-1 text-[10px] font-bold text-cyan-100">
              LIVE PREVIEW
            </span>
          </div>
          <div className="space-y-5 p-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-blue-100/80">Text</label>
              <div className="rounded-lg border border-white/15 bg-white px-3 py-2.5 text-sm font-medium text-zinc-800">
                We Help Local Businesses Grow Online
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-blue-100/80">Color</label>
                <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2">
                  <span className="h-6 w-6 rounded-md bg-cyan-300" />
                  <span className="text-xs text-white/70">#67E8F9</span>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-blue-100/80">Size</label>
                <div className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/70">
                  Large
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <div className="flex-1 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 py-2.5 text-center text-sm font-semibold">
                Save changes
              </div>
              <div className="rounded-full border border-white/20 px-4 py-2.5 text-sm text-white/70">
                Cancel
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-semibold text-cyan-100">No code. No drag-and-drop maze.</p>
          <p className="mt-1 text-sm leading-6 text-blue-100/80">
            Click what you want to change. Save. Done.
          </p>
        </div>
      </div>
    </div>
  );
}

function useReveal() {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const nodes = root.querySelectorAll("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return ref;
}

export default function HomePage() {
  const [guestToken, setGuestToken] = useState("");
  const pageRef = useReveal();

  useEffect(() => {
    try {
      setGuestToken(localStorage.getItem(GUEST_TOKEN_KEY) || "");
    } catch {
      setGuestToken("");
    }
  }, []);

  return (
    <div ref={pageRef} className="min-h-screen overflow-x-hidden bg-[#040b1a] text-white">
      <header className="absolute inset-x-0 top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="home-fade-in">
            <BrandLogo />
          </div>
          <div className="home-fade-in flex items-center gap-3 text-sm" style={{ animationDelay: "0.15s" }}>
            {guestToken && (
              <Link
                href={`/messages?token=${guestToken}`}
                className="rounded-full border border-cyan-300/40 bg-cyan-300/10 px-4 py-2 text-cyan-100 transition hover:bg-cyan-300/20"
              >
                Continue chat
              </Link>
            )}
            <Link
              href="/login"
              className="rounded-full border border-white/20 px-4 py-2 transition hover:bg-white/5"
            >
              Owner / Admin login
            </Link>
            <a
              href={technonaireUrl}
              className="hidden rounded-full bg-white/10 px-4 py-2 transition hover:bg-white/15 sm:inline-flex"
            >
              Technonaire
            </a>
          </div>
        </div>
      </header>

      {/* Hero — one composition */}
      <section className="relative min-h-[100svh] overflow-hidden">
        <div
          className="absolute inset-0 scale-105 home-fade-in"
          style={{
            backgroundImage:
              "linear-gradient(105deg, rgba(4,11,26,0.92) 0%, rgba(4,11,26,0.72) 42%, rgba(4,11,26,0.35) 100%), url('https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=2000&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-6 pb-16 pt-28 md:justify-center md:pb-24">
          <p className="home-fade-up text-xs font-bold tracking-[0.22em] text-cyan-200 uppercase">
            Technonaire Easy Website
          </p>
          <h1 className="home-fade-up home-fade-up-delay-1 mt-4 max-w-3xl font-[family-name:var(--font-display)] text-4xl leading-[1.08] font-semibold md:text-6xl">
            A beautiful site for your business — without learning a builder.
          </h1>
          <p className="home-fade-up home-fade-up-delay-2 mt-6 max-w-xl text-lg leading-8 text-blue-100 md:text-xl">
            Start with a few details. Get an AI chat link by email, receive temporary login, set your
            password, then switch templates and edit your site yourself.
          </p>
          <div className="home-fade-up home-fade-up-delay-3 mt-8 flex flex-wrap gap-3">
            <a
              href="#message"
              className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-[#082f79] transition hover:bg-cyan-50"
            >
              Start with a message
            </a>
            <a
              href="#ideas"
              className="rounded-full border border-white/40 px-7 py-3 text-sm font-semibold transition hover:bg-white/10"
            >
              See site ideas
            </a>
          </div>
        </div>
      </section>

      {/* Ideas strip */}
      <section id="ideas" className="border-y border-white/10 bg-[#07122a] py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="home-reveal" data-reveal>
            <p className="text-xs font-bold tracking-[0.18em] text-cyan-200 uppercase">Ideas for your business</p>
            <h2 className="mt-3 max-w-2xl font-[family-name:var(--font-display)] text-3xl font-semibold md:text-4xl">
              Imagine a site that already looks like it belongs to you.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-blue-100">
              These are the kinds of local-business looks we start from. Share screenshots of anything
              you love — we use them as reference when drafting yours.
            </p>
          </div>
        </div>
        <div className="mt-10 overflow-hidden">
          <div className="home-idea-track px-6">
            {[...ideas, ...ideas].map((idea, index) => (
              <article
                key={`${idea.title}-${index}`}
                className="home-float w-[280px] shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5"
                style={{ animationDelay: `${(index % 6) * 0.4}s` }}
              >
                <div className="aspect-[4/3] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={idea.image}
                    alt=""
                    className="h-full w-full object-cover transition duration-700 hover:scale-105"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-white">{idea.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-blue-100">{idea.note}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — same layout as Technonaire Easy Website */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:py-24">
        <div className="home-reveal" data-reveal>
          <p className="inline-flex rounded-full border border-cyan-300/40 bg-cyan-300/10 px-4 py-1 text-xs font-bold tracking-[0.15em] text-cyan-100 uppercase">
            How it works
          </p>
          <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold md:text-4xl">
            Simple path for non-tech owners
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-blue-100 md:text-lg">
            From signup to templates and editing — five clear steps in Phase 1.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {steps.map((step, i) => (
            <article
              key={step.title}
              className="home-reveal relative rounded-2xl border border-white/15 bg-white/5 p-6"
              data-reveal
              style={{ transitionDelay: `${i * 90}ms` }}
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-300/10 text-cyan-200">
                  {step.icon}
                </div>
                <span className="text-sm font-bold tracking-wide text-cyan-200 uppercase">
                  Step {i + 1}
                </span>
              </div>
              <h3 className="text-xl font-bold">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-blue-100">{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Edit pathflow visuals */}
      <section className="border-y border-white/10 bg-[#071736]/60 py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="home-reveal max-w-2xl" data-reveal>
            <p className="text-xs font-bold tracking-[0.18em] text-cyan-200 uppercase">Edit pathflow</p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold md:text-4xl">
              See how easy editing feels
            </h2>
            <p className="mt-4 text-base leading-7 text-blue-100">
              After you set your password, switch templates and click what you want to change.
            </p>
          </div>

          <ol className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {editFlow.map((item, i) => (
              <li
                key={item.label}
                className="home-reveal flex gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
                data-reveal
                style={{ transitionDelay: `${i * 70}ms` }}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-400 text-sm font-bold text-[#040b1a]">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-white">{item.label}</p>
                  <p className="mt-1 text-sm leading-6 text-blue-100/80">{item.detail}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="home-reveal mt-12" data-reveal style={{ transitionDelay: "120ms" }}>
            <EditPathVisual />
          </div>
        </div>
      </section>

      {/* What you can change */}
      <section className="relative overflow-hidden border-y border-white/10 py-20 md:py-24">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 50% 60% at 80% 40%, rgba(34,211,238,0.15), transparent)",
          }}
        />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="home-reveal" data-reveal>
            <p className="text-xs font-bold tracking-[0.18em] text-cyan-200 uppercase">Made for non-tech owners</p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold md:text-4xl">
              After the draft, editing feels like clicking on the page.
            </h2>
            <p className="mt-4 text-base leading-7 text-blue-100">
              No drag-and-drop canvas. No block menus. Click what you want to change — we handle the
              hard design work when you ask in chat.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {editIdeas.map((item, i) => (
              <div
                key={item.title}
                className="home-reveal rounded-2xl border border-white/10 bg-[#07122a]/80 p-5 backdrop-blur"
                data-reveal
                style={{ transitionDelay: `${i * 70}ms` }}
              >
                <h3 className="font-semibold text-cyan-100">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-blue-100">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Message CTA */}
      <section id="message" className="mx-auto grid max-w-6xl gap-10 px-6 py-20 lg:grid-cols-2 lg:items-start md:py-24">
        <div className="home-reveal" data-reveal>
          <p className="text-xs font-bold tracking-[0.18em] text-cyan-200 uppercase">Start here</p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold md:text-4xl">
            Start with a chat link.
          </h2>
          <p className="mt-4 text-base leading-7 text-blue-100">
            Just your name, email, and website name. Open the chat — our assistant asks a few
            questions, then creates your sample draft.
          </p>
          <ul className="mt-8 space-y-3 text-sm leading-6 text-blue-100">
            <li className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
              AI chat link by email first
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
              Assistant questions → sample draft + temporary login in chat
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
              Set your password, then switch templates and edit
            </li>
          </ul>
        </div>
        <div className="home-reveal" data-reveal style={{ transitionDelay: "100ms" }}>
          <MessageUsForm />
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-sm text-blue-100/80">
        <p>
          Technonaire Easy Website ·{" "}
          <a href={technonaireUrl} className="text-cyan-200 hover:underline">
            Technonaire
          </a>
        </p>
      </footer>
    </div>
  );
}
