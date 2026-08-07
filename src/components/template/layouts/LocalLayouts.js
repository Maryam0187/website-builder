"use client";

import Reveal from "../Reveal";
import TemplateChrome from "../TemplateChrome";
import { ContactSection, fallbackSection } from "../SharedSections";
import { textStyle } from "../template-helpers";

function MenuGrid({
  page,
  pageId,
  theme,
  content,
  editable,
  handle,
  editMode,
  contactHref,
  onCommerceClick,
  variant = "cards",
}) {
  const base = `pages.${pageId}`;
  const items = page.items || [];
  const commerce = page.commerce || content?.features?.commerce;

  if (variant === "list") {
    return (
      <section id={pageId} className="relative px-6 py-24 text-white">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <h1
              className={`text-center font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight md:text-6xl ${editable()}`}
              style={textStyle(content, `${base}.title`, "#ffffff")}
              onClick={() => handle(`${base}.title`, "Menu title", "text", "#ffffff")}
            >
              {page.title}
            </h1>
          </Reveal>
          <div className="mt-14 space-y-0 divide-y divide-white/15 border-y border-white/15">
            {items.map((item, index) => (
              <Reveal key={index} delay={index * 80}>
                <article className="grid gap-4 py-8 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <h2
                      className={`font-[family-name:var(--font-display)] text-2xl ${editable()}`}
                      onClick={() =>
                        handle(`${base}.items.${index}.title`, "Item title", "text", "#ffffff")
                      }
                    >
                      {item.title}
                    </h2>
                    <p
                      className={`mt-2 text-sm text-white/65 ${editable()}`}
                      onClick={() =>
                        handle(
                          `${base}.items.${index}.description`,
                          "Item description",
                          "textarea",
                          "#ffffff",
                        )
                      }
                    >
                      {item.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {commerce && !editMode && (
                      <button
                        type="button"
                        onClick={onCommerceClick}
                        className="rounded-full border border-white/25 px-4 py-2 text-xs font-semibold uppercase tracking-wider"
                      >
                        Order
                      </button>
                    )}
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
          {commerce && (
            <p className="mt-10 text-center text-sm text-white/70">
              <a href={contactHref} className="underline">
                Contact us
              </a>{" "}
              to enable full cart &amp; checkout.
            </p>
          )}
        </div>
      </section>
    );
  }

  if (variant === "rail") {
    return (
      <section id={pageId} className="relative px-6 py-24 text-white">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/45">
              How we help
            </p>
            <h1
              className={`mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold md:text-5xl ${editable()}`}
              style={textStyle(content, `${base}.title`, "#ffffff")}
              onClick={() => handle(`${base}.title`, "Menu title", "text", "#ffffff")}
            >
              {page.title}
            </h1>
          </Reveal>
          <div className="mt-14 space-y-8">
            {items.map((item, index) => (
              <Reveal key={index} delay={index * 90}>
                <article className="grid items-center gap-6 border-l-2 border-white/20 pl-6 md:grid-cols-[auto_1.2fr_0.8fr] md:gap-10 md:border-l-0 md:pl-0">
                  <span
                    className="font-[family-name:var(--font-display)] text-5xl font-semibold tabular-nums opacity-35 md:text-6xl"
                    style={{ color: theme.primary }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h2
                      className={`text-2xl font-semibold ${editable()}`}
                      onClick={() =>
                        handle(`${base}.items.${index}.title`, "Item title", "text", "#ffffff")
                      }
                    >
                      {item.title}
                    </h2>
                    <p
                      className={`mt-3 text-base leading-7 text-white/70 ${editable()}`}
                      onClick={() =>
                        handle(
                          `${base}.items.${index}.description`,
                          "Item description",
                          "textarea",
                          "#ffffff",
                        )
                      }
                    >
                      {item.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`aspect-[4/3] overflow-hidden ${editable()}`}
                    onClick={() =>
                      handle(`${base}.items.${index}.image`, "Item image URL", "image")
                    }
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.image} alt="" className="tpl-img-zoom h-full w-full object-cover" />
                  </button>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id={pageId} className="relative px-6 py-20 text-white">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1
              className={`font-[family-name:var(--font-display)] text-4xl font-semibold md:text-5xl ${editable()}`}
              style={textStyle(content, `${base}.title`, "#ffffff")}
              onClick={() => handle(`${base}.title`, "Menu title", "text", "#ffffff")}
            >
              {page.title}
            </h1>
            {commerce && (
              <button
                type="button"
                onClick={onCommerceClick}
                className="rounded-full px-5 py-2.5 text-sm font-semibold text-white"
                style={{ background: theme.primary }}
              >
                View cart / checkout
              </button>
            )}
          </div>
        </Reveal>
        <div
          className={`mt-12 grid gap-5 ${
            variant === "dense" ? "sm:grid-cols-2 lg:grid-cols-3" : "md:grid-cols-3"
          }`}
        >
          {items.map((item, index) => (
            <Reveal key={index} delay={index * 80}>
              <article className="group overflow-hidden border border-white/10 bg-white/5">
                <button
                  type="button"
                  className={`aspect-[4/3] w-full overflow-hidden ${editable()}`}
                  onClick={() => handle(`${base}.items.${index}.image`, "Item image URL", "image")}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image} alt="" className="tpl-img-zoom h-full w-full object-cover" />
                </button>
                <div className="p-5">
                  <h2
                    className={`text-lg font-semibold ${editable()}`}
                    onClick={() =>
                      handle(`${base}.items.${index}.title`, "Item title", "text", "#ffffff")
                    }
                  >
                    {item.title}
                  </h2>
                  <p
                    className={`mt-2 text-sm text-white/70 ${editable()}`}
                    onClick={() =>
                      handle(
                        `${base}.items.${index}.description`,
                        "Item description",
                        "textarea",
                        "#ffffff",
                      )
                    }
                  >
                    {item.description}
                  </p>
                  {commerce && !editMode && (
                    <button
                      type="button"
                      onClick={onCommerceClick}
                      className="mt-4 text-sm font-semibold underline underline-offset-4"
                    >
                      Add to cart
                    </button>
                  )}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
        {commerce && (
          <p className="mt-10 text-center text-sm text-white/70">
            <a href={contactHref} className="underline">
              Contact us
            </a>{" "}
            to enable full cart &amp; checkout.
          </p>
        )}
      </div>
    </section>
  );
}

function GalleryMasonry({ page, pageId, content, editable, handle, editMode, staggered = true }) {
  const base = `pages.${pageId}`;
  const items = page.items || [];
  return (
    <section id={pageId} className="relative px-6 py-20 text-white">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <h1
            className={`font-[family-name:var(--font-display)] text-4xl font-semibold md:text-5xl ${editable()}`}
            style={textStyle(content, `${base}.title`, "#ffffff")}
            onClick={() => handle(`${base}.title`, "Gallery title", "text", "#ffffff")}
          >
            {page.title}
          </h1>
        </Reveal>
        <div className="mt-12 columns-1 gap-4 sm:columns-2 md:columns-3">
          {items.map((item, index) => (
            <Reveal
              key={index}
              delay={index * 60}
              className={`mb-4 break-inside-avoid ${staggered && index % 3 === 1 ? "md:mt-8" : ""}`}
            >
              <figure className="overflow-hidden">
                <button
                  type="button"
                  className={`relative w-full overflow-hidden ${editable()}`}
                  onClick={() =>
                    handle(`${base}.items.${index}.image`, "Gallery image URL", "image")
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt=""
                    className="tpl-img-zoom h-auto w-full object-cover"
                  />
                  <figcaption
                    className={`mt-2 text-sm text-white/75 ${editable()}`}
                    onClick={(e) => {
                      if (!editMode) return;
                      e.stopPropagation();
                      handle(`${base}.items.${index}.caption`, "Caption", "text", "#ffffff");
                    }}
                  >
                    {item.caption}
                  </figcaption>
                </button>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Bakery — oversized editorial type + stacked photo bands */
export function EditorialLayout(props) {
  return (
    <TemplateChrome
      {...props}
      overlayNav
      navWide
      renderSection={({ pageType, page, pageId, ...ctx }) => {
        if (pageType === "home") {
          const hero = page.hero || {};
          return (
            <section id="home" className="relative -mt-[5.5rem] min-h-[100svh] overflow-hidden">
              <div className="absolute inset-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={hero.image}
                  alt=""
                  className="template-hero-zoom h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-transparent" />
              </div>
              <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-center px-6 pb-16 pt-28 text-white">
                <p className="tpl-fade-up mb-4 max-w-xs text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
                  Neighborhood bakehouse
                </p>
                <h1
                  className={`tpl-fade-up tpl-fade-up-delay-1 max-w-3xl font-[family-name:var(--font-display)] text-[clamp(3.2rem,10vw,7.5rem)] leading-[0.92] font-semibold tracking-tight ${ctx.editable()}`}
                  style={textStyle(ctx.content, "pages.home.hero.headline", "#ffffff")}
                  onClick={() =>
                    ctx.handle("pages.home.hero.headline", "Hero headline", "text", "#ffffff")
                  }
                >
                  {hero.headline}
                </h1>
                <p
                  className={`tpl-fade-up tpl-fade-up-delay-2 mt-8 max-w-md text-lg leading-8 text-white/85 ${ctx.editable()}`}
                  onClick={() =>
                    ctx.handle("pages.home.hero.subheadline", "Hero subheadline", "text", "#ffffff")
                  }
                >
                  {hero.subheadline}
                </p>
                <a
                  href={ctx.contactHref}
                  className="tpl-fade-up tpl-fade-up-delay-3 tpl-cta-glow mt-10 inline-flex w-fit rounded-full px-8 py-3.5 text-sm font-semibold text-white"
                  style={{ background: ctx.theme.primary }}
                  onClick={(e) => {
                    if (ctx.editMode) {
                      e.preventDefault();
                      ctx.handle("pages.home.hero.cta", "Button text", "text", "#ffffff");
                    }
                  }}
                >
                  {hero.cta}
                </a>
                {ctx.editMode && (
                  <button
                    type="button"
                    className="mt-5 text-left text-xs text-white/80 underline"
                    onClick={() => ctx.handle("pages.home.hero.image", "Hero image URL", "image")}
                  >
                    Change hero background image
                  </button>
                )}
              </div>
            </section>
          );
        }
        if (pageType === "about") {
          const base = `pages.${pageId}`;
          return (
            <section id={pageId} className="grid md:grid-cols-2">
              <button
                type="button"
                className={`relative min-h-[55svh] overflow-hidden ${ctx.editable()}`}
                onClick={() => ctx.handle(`${base}.image`, "About image URL", "image")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={page.image} alt="" className="h-full w-full object-cover" />
              </button>
              <div className="flex items-center bg-[#24160f] px-8 py-16 text-white md:px-14">
                <Reveal>
                  <h1
                    className={`font-[family-name:var(--font-display)] text-4xl font-semibold md:text-5xl ${ctx.editable()}`}
                    onClick={() => ctx.handle(`${base}.title`, "About title", "text", "#ffffff")}
                  >
                    {page.title}
                  </h1>
                  <p
                    className={`mt-6 text-lg leading-8 text-white/80 ${ctx.editable()}`}
                    onClick={() => ctx.handle(`${base}.body`, "About text", "textarea", "#ffffff")}
                  >
                    {page.body}
                  </p>
                </Reveal>
              </div>
            </section>
          );
        }
        if (pageType === "menu") return <MenuGrid page={page} pageId={pageId} {...ctx} />;
        if (pageType === "gallery")
          return <GalleryMasonry page={page} pageId={pageId} {...ctx} staggered />;
        if (pageType === "contact")
          return <ContactSection page={page} pageId={pageId} {...ctx} />;
        return fallbackSection(pageType, { page, pageId, ...ctx });
      }}
    />
  );
}

/** Clinic — soft light, calm split panels */
export function SereneLayout(props) {
  return (
    <TemplateChrome
      {...props}
      overlayNav={false}
      lightNav
      footerClassName="border-t border-black/5 px-6 py-8 text-center text-sm"
      rootClassName="min-h-screen"
      renderSection={({ pageType, page, pageId, ...ctx }) => {
        if (pageType === "home") {
          const hero = page.hero || {};
          return (
            <section
              id="home"
              className="relative mx-auto grid min-h-[88svh] max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-2"
            >
              <div>
                <p
                  className="tpl-fade-up text-xs font-semibold uppercase tracking-[0.28em]"
                  style={{ color: ctx.theme.primary }}
                >
                  Welcome
                </p>
                <h1
                  className={`tpl-fade-up tpl-fade-up-delay-1 mt-4 font-[family-name:var(--font-display)] text-5xl leading-[1.05] font-semibold tracking-tight md:text-6xl ${ctx.editable()}`}
                  style={textStyle(ctx.content, "pages.home.hero.headline", ctx.theme.text)}
                  onClick={() =>
                    ctx.handle("pages.home.hero.headline", "Hero headline", "text", ctx.theme.text)
                  }
                >
                  {hero.headline}
                </h1>
                <p
                  className={`tpl-fade-up tpl-fade-up-delay-2 mt-6 max-w-md text-lg leading-8 ${ctx.editable()}`}
                  style={{ color: ctx.theme.muted }}
                  onClick={() =>
                    ctx.handle(
                      "pages.home.hero.subheadline",
                      "Hero subheadline",
                      "text",
                      ctx.theme.muted,
                    )
                  }
                >
                  {hero.subheadline}
                </p>
                <a
                  href={ctx.contactHref}
                  className="tpl-fade-up tpl-fade-up-delay-3 mt-10 inline-flex rounded-full px-7 py-3.5 text-sm font-semibold text-white"
                  style={{ background: ctx.theme.primary }}
                  onClick={(e) => {
                    if (ctx.editMode) {
                      e.preventDefault();
                      ctx.handle("pages.home.hero.cta", "Button text", "text", "#ffffff");
                    }
                  }}
                >
                  {hero.cta}
                </a>
              </div>
              <button
                type="button"
                className={`tpl-fade-up tpl-fade-up-delay-2 relative aspect-[4/5] overflow-hidden shadow-[0_30px_80px_rgba(20,48,46,0.18)] ${ctx.editable()}`}
                onClick={() => ctx.handle("pages.home.hero.image", "Hero image URL", "image")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={hero.image} alt="" className="template-hero-zoom h-full w-full object-cover" />
              </button>
            </section>
          );
        }
        if (pageType === "about") {
          const base = `pages.${pageId}`;
          return (
            <section id={pageId} className="bg-white/60 px-6 py-24">
              <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-[0.9fr_1.1fr]">
                <Reveal>
                  <h1
                    className={`font-[family-name:var(--font-display)] text-4xl font-semibold md:text-5xl ${ctx.editable()}`}
                    style={{ color: ctx.theme.text }}
                    onClick={() =>
                      ctx.handle(`${base}.title`, "About title", "text", ctx.theme.text)
                    }
                  >
                    {page.title}
                  </h1>
                  <p
                    className={`mt-6 text-lg leading-8 ${ctx.editable()}`}
                    style={{ color: ctx.theme.muted }}
                    onClick={() =>
                      ctx.handle(`${base}.body`, "About text", "textarea", ctx.theme.muted)
                    }
                  >
                    {page.body}
                  </p>
                </Reveal>
                <button
                  type="button"
                  className={`aspect-[5/4] overflow-hidden ${ctx.editable()}`}
                  onClick={() => ctx.handle(`${base}.image`, "About image URL", "image")}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={page.image} alt="" className="h-full w-full object-cover" />
                </button>
              </div>
            </section>
          );
        }
        if (pageType === "menu") {
          const base = `pages.${pageId}`;
          const items = page.items || [];
          return (
            <section id={pageId} className="px-6 py-24" style={{ color: ctx.theme.text }}>
              <div className="mx-auto max-w-6xl">
                <Reveal>
                  <h1
                    className={`font-[family-name:var(--font-display)] text-4xl font-semibold md:text-5xl ${ctx.editable()}`}
                    onClick={() =>
                      ctx.handle(`${base}.title`, "Services title", "text", ctx.theme.text)
                    }
                  >
                    {page.title}
                  </h1>
                </Reveal>
                <div className="mt-14 grid gap-8 md:grid-cols-3">
                  {items.map((item, index) => (
                    <Reveal key={index} delay={index * 90}>
                      <article className="space-y-4">
                        <button
                          type="button"
                          className={`aspect-[4/3] w-full overflow-hidden ${ctx.editable()}`}
                          onClick={() =>
                            ctx.handle(`${base}.items.${index}.image`, "Item image URL", "image")
                          }
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.image} alt="" className="tpl-img-zoom h-full w-full object-cover" />
                        </button>
                        <h2
                          className={`text-xl font-semibold ${ctx.editable()}`}
                          onClick={() =>
                            ctx.handle(
                              `${base}.items.${index}.title`,
                              "Item title",
                              "text",
                              ctx.theme.text,
                            )
                          }
                        >
                          {item.title}
                        </h2>
                        <p
                          className={`text-sm leading-6 ${ctx.editable()}`}
                          style={{ color: ctx.theme.muted }}
                          onClick={() =>
                            ctx.handle(
                              `${base}.items.${index}.description`,
                              "Item description",
                              "textarea",
                              ctx.theme.muted,
                            )
                          }
                        >
                          {item.description}
                        </p>
                      </article>
                    </Reveal>
                  ))}
                </div>
              </div>
            </section>
          );
        }
        if (pageType === "gallery") {
          const base = `pages.${pageId}`;
          const items = page.items || [];
          return (
            <section id={pageId} className="bg-white/40 px-6 py-24">
              <div className="mx-auto max-w-6xl">
                <Reveal>
                  <h1
                    className={`font-[family-name:var(--font-display)] text-4xl font-semibold ${ctx.editable()}`}
                    style={{ color: ctx.theme.text }}
                    onClick={() =>
                      ctx.handle(`${base}.title`, "Gallery title", "text", ctx.theme.text)
                    }
                  >
                    {page.title}
                  </h1>
                </Reveal>
                <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
                  {items.map((item, index) => (
                    <button
                      key={index}
                      type="button"
                      className={`aspect-square overflow-hidden ${ctx.editable()}`}
                      onClick={() =>
                        ctx.handle(`${base}.items.${index}.image`, "Gallery image URL", "image")
                      }
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image} alt="" className="tpl-img-zoom h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </section>
          );
        }
        if (pageType === "contact")
          return <ContactSection page={page} pageId={pageId} {...ctx} variant="light" />;
        return fallbackSection(pageType, { page, pageId, ...ctx });
      }}
    />
  );
}

/** Restaurant — dark theater, centered hero, list menu */
export function TheaterLayout(props) {
  return (
    <TemplateChrome
      {...props}
      overlayNav
      renderSection={({ pageType, page, pageId, ...ctx }) => {
        if (pageType === "home") {
          const hero = page.hero || {};
          return (
            <section id="home" className="relative -mt-[5.5rem] min-h-[100svh] overflow-hidden">
              <div className="absolute inset-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={hero.image}
                  alt=""
                  className="template-hero-zoom h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/65" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.55)_70%)]" />
              </div>
              <div className="relative mx-auto flex min-h-[100svh] max-w-3xl flex-col items-center justify-center px-6 text-center text-white">
                <div className="tpl-fade-up mb-6 h-px w-16 bg-white/50" />
                <h1
                  className={`tpl-fade-up tpl-fade-up-delay-1 font-[family-name:var(--font-display)] text-5xl leading-none font-semibold tracking-tight md:text-7xl ${ctx.editable()}`}
                  onClick={() =>
                    ctx.handle("pages.home.hero.headline", "Hero headline", "text", "#ffffff")
                  }
                >
                  {hero.headline}
                </h1>
                <p
                  className={`tpl-fade-up tpl-fade-up-delay-2 mt-8 max-w-lg text-base leading-8 text-white/80 md:text-lg ${ctx.editable()}`}
                  onClick={() =>
                    ctx.handle("pages.home.hero.subheadline", "Hero subheadline", "text", "#ffffff")
                  }
                >
                  {hero.subheadline}
                </p>
                <a
                  href="#menu"
                  className="tpl-fade-up tpl-fade-up-delay-3 mt-10 inline-flex rounded-full border border-white/40 px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white/10"
                  onClick={(e) => {
                    if (ctx.editMode) {
                      e.preventDefault();
                      ctx.handle("pages.home.hero.cta", "Button text", "text", "#ffffff");
                    }
                  }}
                >
                  {hero.cta}
                </a>
                {ctx.editMode && (
                  <button
                    type="button"
                    className="mt-5 text-xs text-white/80 underline"
                    onClick={() => ctx.handle("pages.home.hero.image", "Hero image URL", "image")}
                  >
                    Change hero background image
                  </button>
                )}
              </div>
            </section>
          );
        }
        if (pageType === "about") {
          const base = `pages.${pageId}`;
          return (
            <section id={pageId} className="relative min-h-[70svh] overflow-hidden">
              <div className="absolute inset-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={page.image} alt="" className="h-full w-full object-cover opacity-40" />
                <div className="absolute inset-0 bg-[#0c0a09]/80" />
              </div>
              <div className="relative mx-auto flex min-h-[70svh] max-w-2xl flex-col justify-center px-6 py-24 text-center text-white">
                <Reveal>
                  <h1
                    className={`font-[family-name:var(--font-display)] text-4xl font-semibold md:text-5xl ${ctx.editable()}`}
                    onClick={() => ctx.handle(`${base}.title`, "About title", "text", "#ffffff")}
                  >
                    {page.title}
                  </h1>
                  <p
                    className={`mt-8 text-lg leading-9 text-white/80 ${ctx.editable()}`}
                    onClick={() => ctx.handle(`${base}.body`, "About text", "textarea", "#ffffff")}
                  >
                    {page.body}
                  </p>
                </Reveal>
              </div>
            </section>
          );
        }
        if (pageType === "menu")
          return <MenuGrid page={page} pageId={pageId} {...ctx} variant="list" />;
        if (pageType === "gallery")
          return <GalleryMasonry page={page} pageId={pageId} {...ctx} staggered={false} />;
        if (pageType === "contact")
          return <ContactSection page={page} pageId={pageId} {...ctx} />;
        return fallbackSection(pageType, { page, pageId, ...ctx });
      }}
    />
  );
}

/** Shop — bold retail product-first */
export function RetailLayout(props) {
  return (
    <TemplateChrome
      {...props}
      overlayNav
      navWide
      renderSection={({ pageType, page, pageId, ...ctx }) => {
        if (pageType === "home") {
          const hero = page.hero || {};
          return (
            <section id="home" className="relative -mt-[5.5rem] min-h-[100svh] overflow-hidden">
              <div className="absolute inset-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={hero.image}
                  alt=""
                  className="template-hero-zoom h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b1220] via-[#0b1220]/55 to-[#0b1220]/25" />
              </div>
              <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-6 pb-16 pt-32 text-white">
                <div className="max-w-xl border-l-4 pl-6" style={{ borderColor: ctx.theme.primary }}>
                  <h1
                    className={`tpl-fade-up font-[family-name:var(--font-display)] text-5xl font-semibold tracking-tight md:text-7xl ${ctx.editable()}`}
                    onClick={() =>
                      ctx.handle("pages.home.hero.headline", "Hero headline", "text", "#ffffff")
                    }
                  >
                    {hero.headline}
                  </h1>
                  <p
                    className={`tpl-fade-up tpl-fade-up-delay-1 mt-5 text-lg text-white/85 ${ctx.editable()}`}
                    onClick={() =>
                      ctx.handle(
                        "pages.home.hero.subheadline",
                        "Hero subheadline",
                        "text",
                        "#ffffff",
                      )
                    }
                  >
                    {hero.subheadline}
                  </p>
                  <div className="tpl-fade-up tpl-fade-up-delay-2 mt-8 flex flex-wrap gap-3">
                    <a
                      href="#menu"
                      className="inline-flex rounded-full px-7 py-3.5 text-sm font-semibold text-[#0b1220]"
                      style={{ background: ctx.theme.primary }}
                      onClick={(e) => {
                        if (ctx.editMode) {
                          e.preventDefault();
                          ctx.handle("pages.home.hero.cta", "Button text", "text", "#ffffff");
                        }
                      }}
                    >
                      {hero.cta}
                    </a>
                    {ctx.content?.features?.commerce && (
                      <button
                        type="button"
                        onClick={ctx.onCommerceClick}
                        className="inline-flex rounded-full border border-white/40 px-7 py-3.5 text-sm font-semibold"
                      >
                        Cart / order
                      </button>
                    )}
                  </div>
                </div>
                {ctx.editMode && (
                  <button
                    type="button"
                    className="mt-5 text-left text-xs text-white/80 underline"
                    onClick={() => ctx.handle("pages.home.hero.image", "Hero image URL", "image")}
                  >
                    Change hero background image
                  </button>
                )}
              </div>
            </section>
          );
        }
        if (pageType === "about") {
          const base = `pages.${pageId}`;
          return (
            <section id={pageId} className="px-6 py-24 text-white">
              <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.2fr_0.8fr] md:items-end">
                <Reveal>
                  <h1
                    className={`font-[family-name:var(--font-display)] text-4xl font-semibold md:text-6xl ${ctx.editable()}`}
                    onClick={() => ctx.handle(`${base}.title`, "About title", "text", "#ffffff")}
                  >
                    {page.title}
                  </h1>
                  <p
                    className={`mt-6 max-w-xl text-lg leading-8 text-white/75 ${ctx.editable()}`}
                    onClick={() => ctx.handle(`${base}.body`, "About text", "textarea", "#ffffff")}
                  >
                    {page.body}
                  </p>
                </Reveal>
                <button
                  type="button"
                  className={`aspect-[4/5] overflow-hidden ${ctx.editable()}`}
                  onClick={() => ctx.handle(`${base}.image`, "About image URL", "image")}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={page.image} alt="" className="h-full w-full object-cover" />
                </button>
              </div>
            </section>
          );
        }
        if (pageType === "menu")
          return <MenuGrid page={page} pageId={pageId} {...ctx} variant="dense" />;
        if (pageType === "gallery")
          return <GalleryMasonry page={page} pageId={pageId} {...ctx} staggered={false} />;
        if (pageType === "contact")
          return <ContactSection page={page} pageId={pageId} {...ctx} />;
        return fallbackSection(pageType, { page, pageId, ...ctx });
      }}
    />
  );
}

/** Professional services — numbered process rail */
export function ProcessLayout(props) {
  return (
    <TemplateChrome
      {...props}
      overlayNav
      renderSection={({ pageType, page, pageId, ...ctx }) => {
        if (pageType === "home") {
          const hero = page.hero || {};
          return (
            <section id="home" className="relative -mt-[5.5rem] min-h-[100svh] overflow-hidden">
              <div className="absolute inset-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={hero.image}
                  alt=""
                  className="template-hero-zoom h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a]/95 via-[#0f172a]/70 to-[#2563eb]/35" />
              </div>
              <div className="relative mx-auto flex min-h-[100svh] max-w-5xl flex-col justify-center px-6 py-28 text-white">
                <p className="tpl-fade-up text-xs font-semibold uppercase tracking-[0.3em] text-blue-200/80">
                  Professional services
                </p>
                <h1
                  className={`tpl-fade-up tpl-fade-up-delay-1 mt-5 max-w-3xl font-[family-name:var(--font-display)] text-5xl font-semibold tracking-tight md:text-6xl ${ctx.editable()}`}
                  onClick={() =>
                    ctx.handle("pages.home.hero.headline", "Hero headline", "text", "#ffffff")
                  }
                >
                  {hero.headline}
                </h1>
                <p
                  className={`tpl-fade-up tpl-fade-up-delay-2 mt-6 max-w-xl text-lg leading-8 text-slate-200 ${ctx.editable()}`}
                  onClick={() =>
                    ctx.handle("pages.home.hero.subheadline", "Hero subheadline", "text", "#ffffff")
                  }
                >
                  {hero.subheadline}
                </p>
                <a
                  href={ctx.contactHref}
                  className="tpl-fade-up tpl-fade-up-delay-3 mt-10 inline-flex w-fit rounded-full px-7 py-3.5 text-sm font-semibold text-white"
                  style={{ background: ctx.theme.primary }}
                  onClick={(e) => {
                    if (ctx.editMode) {
                      e.preventDefault();
                      ctx.handle("pages.home.hero.cta", "Button text", "text", "#ffffff");
                    }
                  }}
                >
                  {hero.cta}
                </a>
                {ctx.editMode && (
                  <button
                    type="button"
                    className="mt-5 text-left text-xs text-white/80 underline"
                    onClick={() => ctx.handle("pages.home.hero.image", "Hero image URL", "image")}
                  >
                    Change hero background image
                  </button>
                )}
              </div>
            </section>
          );
        }
        if (pageType === "about") {
          const base = `pages.${pageId}`;
          return (
            <section id={pageId} className="px-6 py-24 text-white">
              <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-2 md:items-center">
                <Reveal>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/45">
                    About
                  </p>
                  <h1
                    className={`mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold ${ctx.editable()}`}
                    onClick={() => ctx.handle(`${base}.title`, "About title", "text", "#ffffff")}
                  >
                    {page.title}
                  </h1>
                  <p
                    className={`mt-6 text-lg leading-8 text-white/75 ${ctx.editable()}`}
                    onClick={() => ctx.handle(`${base}.body`, "About text", "textarea", "#ffffff")}
                  >
                    {page.body}
                  </p>
                </Reveal>
                <button
                  type="button"
                  className={`aspect-[4/3] overflow-hidden ${ctx.editable()}`}
                  onClick={() => ctx.handle(`${base}.image`, "About image URL", "image")}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={page.image} alt="" className="h-full w-full object-cover" />
                </button>
              </div>
            </section>
          );
        }
        if (pageType === "menu")
          return <MenuGrid page={page} pageId={pageId} {...ctx} variant="rail" />;
        if (pageType === "gallery")
          return <GalleryMasonry page={page} pageId={pageId} {...ctx} staggered={false} />;
        if (pageType === "contact")
          return <ContactSection page={page} pageId={pageId} {...ctx} />;
        return fallbackSection(pageType, { page, pageId, ...ctx });
      }}
    />
  );
}
