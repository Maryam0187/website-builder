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
    n: "01",
    title: "Enter name, email & website name",
    body: "Three fields only. We email you a private chat link.",
  },
  {
    n: "02",
    title: "Open chat — tap answer options",
    body: "Opening the link verifies your email. The assistant asks your business type and style — sites start as one scrolling page.",
  },
  {
    n: "03",
    title: "Sample draft is created",
    body: "After your answers, we create a one-page template draft, generate a temporary password, and post login details in the chat.",
  },
  {
    n: "04",
    title: "Edit — or ask for design changes",
    body: "Log in, set your password, click to edit. Need another menu section? Message us and we’ll add it to your navbar.",
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
            We craft the first draft. You click to change words and photos. Message us for design
            changes.
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

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:py-24">
        <div className="home-reveal max-w-2xl" data-reveal>
          <p className="text-xs font-bold tracking-[0.18em] text-cyan-200 uppercase">How it works</p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold md:text-4xl">
            Four simple steps from idea to live-looking draft.
          </h2>
        </div>
        <ol className="mt-12 grid gap-6 md:grid-cols-2">
          {steps.map((step, i) => (
            <li
              key={step.n}
              className="home-reveal rounded-3xl border border-white/10 bg-gradient-to-b from-white/8 to-transparent p-6 md:p-8"
              data-reveal
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <p className="font-[family-name:var(--font-display)] text-3xl text-cyan-200/80">{step.n}</p>
              <h3 className="mt-3 text-xl font-semibold">{step.title}</h3>
              <p className="mt-3 text-sm leading-7 text-blue-100 md:text-base">{step.body}</p>
            </li>
          ))}
        </ol>
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
              Chat link by email first
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
              Assistant questions → then sample draft + login in chat
            </li>
            <li className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
              Message us anytime for custom design
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
