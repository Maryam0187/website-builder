"use client";

import Reveal from "../Reveal";
import EstateNeighborhoodsCarousel from "../EstateNeighborhoodsCarousel";
import ParallaxMedia from "../ParallaxMedia";
import TemplateChrome from "../TemplateChrome";
import { ContactSection, fallbackSection } from "../SharedSections";

/** Portfolio — name-forward asymmetric bento */
export function FolioLayout(props) {
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
              <div className="absolute inset-0 bg-[#0a0a0a]" />
              <div className="absolute inset-y-0 right-0 w-full md:w-[58%]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={hero.image}
                  alt=""
                  className="template-hero-zoom h-full w-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />
              </div>
              <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-center px-6 py-28 text-white">
                <p className="tpl-fade-up text-xs font-semibold uppercase tracking-[0.35em] text-white/45">
                  Portfolio
                </p>
                <h1
                  className={`tpl-fade-up tpl-fade-up-delay-1 mt-4 max-w-xl font-[family-name:var(--font-display)] text-6xl leading-[0.95] font-semibold tracking-tight md:text-8xl ${ctx.editable()}`}
                  onClick={() =>
                    ctx.handle("pages.home.hero.headline", "Hero headline", "text", "#ffffff")
                  }
                >
                  {hero.headline}
                </h1>
                <p
                  className={`tpl-fade-up tpl-fade-up-delay-2 mt-6 max-w-sm text-base leading-7 text-white/70 ${ctx.editable()}`}
                  onClick={() =>
                    ctx.handle("pages.home.hero.subheadline", "Hero subheadline", "text", "#ffffff")
                  }
                >
                  {hero.subheadline}
                </p>
                <a
                  href="#gallery"
                  className="tpl-fade-up tpl-fade-up-delay-3 mt-10 inline-flex w-fit items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em]"
                  style={{ color: ctx.theme.primary }}
                  onClick={(e) => {
                    if (ctx.editMode) {
                      e.preventDefault();
                      ctx.handle("pages.home.hero.cta", "Button text", "text", "#ffffff");
                    }
                  }}
                >
                  {hero.cta} →
                </a>
                {ctx.editMode && (
                  <button
                    type="button"
                    className="mt-5 text-left text-xs text-white/80 underline"
                    onClick={() => ctx.handle("pages.home.hero.image", "Hero image URL", "image")}
                  >
                    Change hero image
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
              <div className="mx-auto max-w-3xl">
                <Reveal>
                  <h1
                    className={`font-[family-name:var(--font-display)] text-4xl font-semibold md:text-5xl ${ctx.editable()}`}
                    onClick={() => ctx.handle(`${base}.title`, "About title", "text", "#ffffff")}
                  >
                    {page.title}
                  </h1>
                  <p
                    className={`mt-8 text-xl leading-9 text-white/75 ${ctx.editable()}`}
                    onClick={() => ctx.handle(`${base}.body`, "About text", "textarea", "#ffffff")}
                  >
                    {page.body}
                  </p>
                </Reveal>
              </div>
            </section>
          );
        }
        if (pageType === "menu") {
          const base = `pages.${pageId}`;
          const items = page.items || [];
          return (
            <section id={pageId} className="px-6 py-20 text-white">
              <div className="mx-auto max-w-6xl">
                <Reveal>
                  <h1
                    className={`font-[family-name:var(--font-display)] text-4xl font-semibold ${ctx.editable()}`}
                    onClick={() => ctx.handle(`${base}.title`, "Services title", "text", "#ffffff")}
                  >
                    {page.title}
                  </h1>
                </Reveal>
                <div className="mt-12 grid gap-4 md:grid-cols-3">
                  {items.map((item, index) => (
                    <Reveal key={index} delay={index * 80}>
                      <article className="border border-white/10 p-6 transition hover:border-white/30">
                        <h2
                          className={`text-xl font-semibold ${ctx.editable()}`}
                          onClick={() =>
                            ctx.handle(
                              `${base}.items.${index}.title`,
                              "Item title",
                              "text",
                              "#ffffff",
                            )
                          }
                        >
                          {item.title}
                        </h2>
                        <p
                          className={`mt-3 text-sm text-white/60 ${ctx.editable()}`}
                          onClick={() =>
                            ctx.handle(
                              `${base}.items.${index}.description`,
                              "Item description",
                              "textarea",
                              "#ffffff",
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
            <section id={pageId} className="px-6 py-20 text-white">
              <div className="mx-auto max-w-6xl">
                <Reveal>
                  <h1
                    className={`mb-10 font-[family-name:var(--font-display)] text-4xl font-semibold ${ctx.editable()}`}
                    onClick={() => ctx.handle(`${base}.title`, "Gallery title", "text", "#ffffff")}
                  >
                    {page.title}
                  </h1>
                </Reveal>
                <div className="grid auto-rows-[180px] grid-cols-2 gap-3 md:auto-rows-[220px] md:grid-cols-4 md:gap-4">
                  {items.map((item, index) => {
                    const wide = index % 5 === 0;
                    const tall = index % 5 === 2;
                    return (
                      <button
                        key={index}
                        type="button"
                        className={`group relative overflow-hidden ${ctx.editable()} ${
                          wide ? "col-span-2" : ""
                        } ${tall ? "row-span-2" : ""}`}
                        onClick={() =>
                          ctx.handle(`${base}.items.${index}.image`, "Gallery image URL", "image")
                        }
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.image}
                          alt=""
                          className="tpl-img-zoom h-full w-full object-cover"
                        />
                        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-left text-xs text-white opacity-0 transition group-hover:opacity-100">
                          {item.caption}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        }
        if (pageType === "contact")
          return <ContactSection page={page} pageId={pageId} {...ctx} />;
        return fallbackSection(pageType, { page, pageId, ...ctx });
      }}
    />
  );
}

/** Real estate — cinematic property showcase */
export function EstateLayout(props) {
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
              <ParallaxMedia
                src={hero.image}
                strength={0.32}
                className="absolute inset-0"
                imgClassName="tpl-parallax-hero"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b1426] via-[#0b1426]/50 to-transparent" />
              <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-6 pb-20 pt-32 text-white">
                <p
                  className="tpl-fade-up text-xs font-semibold uppercase tracking-[0.3em]"
                  style={{ color: ctx.theme.primary }}
                >
                  Featured properties
                </p>
                <h1
                  className={`tpl-fade-up tpl-fade-up-delay-1 mt-3 max-w-3xl font-[family-name:var(--font-display)] text-5xl font-semibold tracking-tight md:text-7xl ${ctx.editable()}`}
                  onClick={() =>
                    ctx.handle("pages.home.hero.headline", "Hero headline", "text", "#ffffff")
                  }
                >
                  {hero.headline}
                </h1>
                <p
                  className={`tpl-fade-up tpl-fade-up-delay-2 mt-5 max-w-xl text-lg text-white/85 ${ctx.editable()}`}
                  onClick={() =>
                    ctx.handle("pages.home.hero.subheadline", "Hero subheadline", "text", "#ffffff")
                  }
                >
                  {hero.subheadline}
                </p>
                <a
                  href="#menu"
                  className="tpl-fade-up tpl-fade-up-delay-3 mt-8 inline-flex w-fit rounded-sm px-8 py-3.5 text-sm font-semibold text-[#0b1426]"
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
              <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-2 md:items-center">
                <button
                  type="button"
                  className={`aspect-[16/11] overflow-hidden ${ctx.editable()}`}
                  onClick={() => ctx.handle(`${base}.image`, "About image URL", "image")}
                >
                  <ParallaxMedia src={page.image} strength={0.18} className="h-full w-full" />
                </button>
                <Reveal>
                  <h1
                    className={`font-[family-name:var(--font-display)] text-4xl font-semibold ${ctx.editable()}`}
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
              </div>
            </section>
          );
        }
        if (pageType === "menu") {
          const base = `pages.${pageId}`;
          const items = page.items || [];
          return (
            <section id={pageId} className="px-6 py-20 text-white">
              <div className="mx-auto max-w-6xl">
                <Reveal>
                  <h1
                    className={`font-[family-name:var(--font-display)] text-4xl font-semibold md:text-5xl ${ctx.editable()}`}
                    onClick={() => ctx.handle(`${base}.title`, "Listings title", "text", "#ffffff")}
                  >
                    {page.title}
                  </h1>
                </Reveal>
                <div className="mt-12 grid gap-6 md:grid-cols-3">
                  {items.map((item, index) => (
                    <Reveal key={index} delay={index * 90}>
                      <article className="overflow-hidden bg-white/5">
                        <button
                          type="button"
                          className={`aspect-[4/3] w-full overflow-hidden ${ctx.editable()}`}
                          onClick={() =>
                            ctx.handle(`${base}.items.${index}.image`, "Listing image", "image")
                          }
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.image}
                            alt=""
                            className="tpl-img-zoom h-full w-full object-cover"
                          />
                        </button>
                        <div className="space-y-2 p-5">
                          <p
                            className="text-sm font-semibold uppercase tracking-wider"
                            style={{ color: ctx.theme.primary }}
                          >
                            {item.description?.split("·")[0] || "Listing"}
                          </p>
                          <h2
                            className={`text-xl font-semibold ${ctx.editable()}`}
                            onClick={() =>
                              ctx.handle(
                                `${base}.items.${index}.title`,
                                "Listing title",
                                "text",
                                "#ffffff",
                              )
                            }
                          >
                            {item.title}
                          </h2>
                          <p
                            className={`font-[family-name:var(--font-display)] text-2xl ${ctx.editable()}`}
                            onClick={() =>
                              ctx.handle(
                                `${base}.items.${index}.description`,
                                "Listing details",
                                "textarea",
                                "#ffffff",
                              )
                            }
                          >
                            {item.description}
                          </p>
                        </div>
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
            <section id={pageId} className="px-6 py-20 text-white">
              <div className="mx-auto max-w-6xl">
                <Reveal>
                  <h1
                    className={`font-[family-name:var(--font-display)] text-4xl font-semibold ${ctx.editable()}`}
                    onClick={() => ctx.handle(`${base}.title`, "Gallery title", "text", "#ffffff")}
                  >
                    {page.title}
                  </h1>
                </Reveal>
                <EstateNeighborhoodsCarousel
                  items={items}
                  base={base}
                  theme={ctx.theme}
                  editable={ctx.editable}
                  handle={ctx.handle}
                />
              </div>
            </section>
          );
        }
        if (pageType === "contact")
          return <ContactSection page={page} pageId={pageId} {...ctx} />;
        return fallbackSection(pageType, { page, pageId, ...ctx });
      }}
    />
  );
}

/** Coaching — portrait mentor focus + program rows */
export function MentorLayout(props) {
  return (
    <TemplateChrome
      {...props}
      overlayNav={false}
      renderSection={({ pageType, page, pageId, ...ctx }) => {
        if (pageType === "home") {
          const hero = page.hero || {};
          return (
            <section
              id="home"
              className="relative grid min-h-[100svh] md:grid-cols-2"
              style={{ background: ctx.theme.accent }}
            >
              <button
                type="button"
                className={`relative min-h-[50svh] overflow-hidden md:min-h-[100svh] ${ctx.editable()}`}
                onClick={() => ctx.handle("pages.home.hero.image", "Hero image URL", "image")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={hero.image}
                  alt=""
                  className="template-hero-zoom h-full w-full object-cover"
                />
              </button>
              <div className="flex flex-col justify-center px-8 py-16 text-white md:px-14">
                <p className="tpl-fade-up text-xs font-semibold uppercase tracking-[0.28em] text-white/50">
                  Coaching
                </p>
                <h1
                  className={`tpl-fade-up tpl-fade-up-delay-1 mt-4 font-[family-name:var(--font-display)] text-5xl font-semibold tracking-tight md:text-6xl ${ctx.editable()}`}
                  onClick={() =>
                    ctx.handle("pages.home.hero.headline", "Hero headline", "text", "#ffffff")
                  }
                >
                  {hero.headline}
                </h1>
                <p
                  className={`tpl-fade-up tpl-fade-up-delay-2 mt-6 max-w-md text-lg leading-8 text-white/75 ${ctx.editable()}`}
                  onClick={() =>
                    ctx.handle("pages.home.hero.subheadline", "Hero subheadline", "text", "#ffffff")
                  }
                >
                  {hero.subheadline}
                </p>
                <a
                  href="#menu"
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
              </div>
            </section>
          );
        }
        if (pageType === "about") {
          const base = `pages.${pageId}`;
          return (
            <section id={pageId} className="px-6 py-24 text-white">
              <div className="mx-auto max-w-3xl text-center">
                <Reveal>
                  <h1
                    className={`font-[family-name:var(--font-display)] text-4xl font-semibold md:text-5xl ${ctx.editable()}`}
                    onClick={() => ctx.handle(`${base}.title`, "About title", "text", "#ffffff")}
                  >
                    {page.title}
                  </h1>
                  <p
                    className={`mx-auto mt-8 max-w-2xl text-lg leading-9 text-white/75 ${ctx.editable()}`}
                    onClick={() => ctx.handle(`${base}.body`, "About text", "textarea", "#ffffff")}
                  >
                    {page.body}
                  </p>
                </Reveal>
              </div>
            </section>
          );
        }
        if (pageType === "menu") {
          const base = `pages.${pageId}`;
          const items = page.items || [];
          return (
            <section id={pageId} className="px-6 py-20 text-white">
              <div className="mx-auto max-w-4xl">
                <Reveal>
                  <h1
                    className={`font-[family-name:var(--font-display)] text-4xl font-semibold ${ctx.editable()}`}
                    onClick={() => ctx.handle(`${base}.title`, "Programs title", "text", "#ffffff")}
                  >
                    {page.title}
                  </h1>
                </Reveal>
                <div className="mt-12 space-y-6">
                  {items.map((item, index) => (
                    <Reveal key={index} delay={index * 80}>
                      <article className="grid items-center gap-6 border border-white/10 p-4 md:grid-cols-[140px_1fr_auto] md:p-5">
                        <button
                          type="button"
                          className={`aspect-square overflow-hidden ${ctx.editable()}`}
                          onClick={() =>
                            ctx.handle(`${base}.items.${index}.image`, "Program image", "image")
                          }
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.image} alt="" className="h-full w-full object-cover" />
                        </button>
                        <div>
                          <h2
                            className={`text-2xl font-semibold ${ctx.editable()}`}
                            onClick={() =>
                              ctx.handle(
                                `${base}.items.${index}.title`,
                                "Program title",
                                "text",
                                "#ffffff",
                              )
                            }
                          >
                            {item.title}
                          </h2>
                          <p
                            className={`mt-2 text-sm text-white/65 ${ctx.editable()}`}
                            onClick={() =>
                              ctx.handle(
                                `${base}.items.${index}.description`,
                                "Program description",
                                "textarea",
                                "#ffffff",
                              )
                            }
                          >
                            {item.description}
                          </p>
                        </div>
                        <a
                          href={ctx.contactHref}
                          className="justify-self-start rounded-full px-5 py-2.5 text-sm font-semibold text-white md:justify-self-end"
                          style={{ background: ctx.theme.primary }}
                        >
                          Apply
                        </a>
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
            <section id={pageId} className="px-6 py-20 text-white">
              <div className="mx-auto max-w-5xl">
                <Reveal>
                  <h1
                    className={`font-[family-name:var(--font-display)] text-4xl font-semibold ${ctx.editable()}`}
                    onClick={() => ctx.handle(`${base}.title`, "Gallery title", "text", "#ffffff")}
                  >
                    {page.title}
                  </h1>
                </Reveal>
                <div className="mt-10 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {items.map((item, index) => (
                    <button
                      key={index}
                      type="button"
                      className={`aspect-[4/3] overflow-hidden ${ctx.editable()}`}
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
          return <ContactSection page={page} pageId={pageId} {...ctx} />;
        return fallbackSection(pageType, { page, pageId, ...ctx });
      }}
    />
  );
}

/** Events — night marquee + schedule list */
export function MarqueeLayout(props) {
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
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/30" />
              </div>
              <div className="relative mx-auto flex min-h-[100svh] max-w-5xl flex-col items-center justify-center px-6 text-center text-white">
                <p
                  className="tpl-fade-up text-xs font-semibold uppercase tracking-[0.4em]"
                  style={{ color: ctx.theme.primary }}
                >
                  Live · Tonight
                </p>
                <h1
                  className={`tpl-fade-up tpl-fade-up-delay-1 mt-5 font-[family-name:var(--font-display)] text-6xl font-semibold uppercase tracking-tight md:text-8xl ${ctx.editable()}`}
                  onClick={() =>
                    ctx.handle("pages.home.hero.headline", "Hero headline", "text", "#ffffff")
                  }
                >
                  {hero.headline}
                </h1>
                <p
                  className={`tpl-fade-up tpl-fade-up-delay-2 mt-6 max-w-lg text-base text-white/75 ${ctx.editable()}`}
                  onClick={() =>
                    ctx.handle("pages.home.hero.subheadline", "Hero subheadline", "text", "#ffffff")
                  }
                >
                  {hero.subheadline}
                </p>
                <a
                  href="#menu"
                  className="tpl-fade-up tpl-fade-up-delay-3 tpl-cta-glow mt-10 inline-flex rounded-full px-8 py-3.5 text-sm font-bold uppercase tracking-[0.2em] text-black"
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
            <section id={pageId} className="relative overflow-hidden px-6 py-28 text-white">
              <div
                className="pointer-events-none absolute -left-20 top-10 h-64 w-64 rounded-full opacity-30 blur-3xl"
                style={{ background: ctx.theme.primary }}
              />
              <div className="relative mx-auto max-w-3xl text-center">
                <Reveal>
                  <h1
                    className={`font-[family-name:var(--font-display)] text-4xl font-semibold uppercase tracking-tight md:text-5xl ${ctx.editable()}`}
                    onClick={() => ctx.handle(`${base}.title`, "About title", "text", "#ffffff")}
                  >
                    {page.title}
                  </h1>
                  <p
                    className={`mt-8 text-lg leading-8 text-white/75 ${ctx.editable()}`}
                    onClick={() => ctx.handle(`${base}.body`, "About text", "textarea", "#ffffff")}
                  >
                    {page.body}
                  </p>
                </Reveal>
              </div>
            </section>
          );
        }
        if (pageType === "menu") {
          const base = `pages.${pageId}`;
          const items = page.items || [];
          return (
            <section id={pageId} className="px-6 py-20 text-white">
              <div className="mx-auto max-w-3xl">
                <Reveal>
                  <h1
                    className={`text-center font-[family-name:var(--font-display)] text-4xl font-semibold uppercase ${ctx.editable()}`}
                    onClick={() => ctx.handle(`${base}.title`, "Experiences title", "text", "#ffffff")}
                  >
                    {page.title}
                  </h1>
                </Reveal>
                <div className="mt-12 space-y-0 border-t border-white/15">
                  {items.map((item, index) => (
                    <Reveal key={index} delay={index * 70}>
                      <article className="flex flex-wrap items-center justify-between gap-4 border-b border-white/15 py-7">
                        <div>
                          <h2
                            className={`text-2xl font-semibold ${ctx.editable()}`}
                            onClick={() =>
                              ctx.handle(
                                `${base}.items.${index}.title`,
                                "Item title",
                                "text",
                                "#ffffff",
                              )
                            }
                          >
                            {item.title}
                          </h2>
                          <p
                            className={`mt-1 text-sm text-white/55 ${ctx.editable()}`}
                            onClick={() =>
                              ctx.handle(
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
                        {ctx.content?.features?.commerce && !ctx.editMode && (
                          <button
                            type="button"
                            onClick={ctx.onCommerceClick}
                            className="rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider text-black"
                            style={{ background: ctx.theme.primary }}
                          >
                            Book
                          </button>
                        )}
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
            <section id={pageId} className="px-6 py-20 text-white">
              <div className="mx-auto max-w-6xl">
                <Reveal>
                  <h1
                    className={`font-[family-name:var(--font-display)] text-4xl font-semibold uppercase ${ctx.editable()}`}
                    onClick={() => ctx.handle(`${base}.title`, "Gallery title", "text", "#ffffff")}
                  >
                    {page.title}
                  </h1>
                </Reveal>
                <div className="mt-10 grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3">
                  {items.map((item, index) => (
                    <button
                      key={index}
                      type="button"
                      className={`aspect-[3/4] overflow-hidden ${ctx.editable()}`}
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
          return <ContactSection page={page} pageId={pageId} {...ctx} />;
        return fallbackSection(pageType, { page, pageId, ...ctx });
      }}
    />
  );
}

/** Nonprofit — soft story bands */
export function CauseLayout(props) {
  return (
    <TemplateChrome
      {...props}
      overlayNav={false}
      lightNav
      footerClassName="border-t border-black/5 px-6 py-8 text-center text-sm"
      renderSection={({ pageType, page, pageId, ...ctx }) => {
        if (pageType === "home") {
          const hero = page.hero || {};
          return (
            <section id="home" className="relative -mt-0 min-h-[90svh] overflow-hidden">
              <div className="absolute inset-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={hero.image}
                  alt=""
                  className="template-hero-zoom h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#f0f9ff]/95 via-[#f0f9ff]/75 to-[#f0f9ff]/20" />
              </div>
              <div
                className="relative mx-auto flex min-h-[90svh] max-w-6xl flex-col justify-center px-6 py-24"
                style={{ color: ctx.theme.text }}
              >
                <p
                  className="tpl-fade-up text-xs font-semibold uppercase tracking-[0.28em]"
                  style={{ color: ctx.theme.primary }}
                >
                  Our mission
                </p>
                <h1
                  className={`tpl-fade-up tpl-fade-up-delay-1 mt-4 max-w-2xl font-[family-name:var(--font-display)] text-5xl font-semibold tracking-tight md:text-6xl ${ctx.editable()}`}
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
                  href="#menu"
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
                    className="mt-5 text-left text-xs underline"
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
            <section id={pageId} className="bg-white px-6 py-24" style={{ color: ctx.theme.text }}>
              <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-2 md:items-center">
                <Reveal>
                  <h1
                    className={`font-[family-name:var(--font-display)] text-4xl font-semibold ${ctx.editable()}`}
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
        if (pageType === "menu") {
          const base = `pages.${pageId}`;
          const items = page.items || [];
          return (
            <section
              id={pageId}
              className="px-6 py-24"
              style={{
                color: ctx.theme.text,
                background: `linear-gradient(180deg, #e0f2fe, ${ctx.theme.accent})`,
              }}
            >
              <div className="mx-auto max-w-6xl">
                <Reveal>
                  <h1
                    className={`font-[family-name:var(--font-display)] text-4xl font-semibold ${ctx.editable()}`}
                    onClick={() =>
                      ctx.handle(`${base}.title`, "Ways to help title", "text", ctx.theme.text)
                    }
                  >
                    {page.title}
                  </h1>
                </Reveal>
                <div className="mt-12 grid gap-6 md:grid-cols-3">
                  {items.map((item, index) => (
                    <Reveal key={index} delay={index * 90}>
                      <article className="bg-white/80 p-6 shadow-sm">
                        <button
                          type="button"
                          className={`mb-5 aspect-[4/3] w-full overflow-hidden ${ctx.editable()}`}
                          onClick={() =>
                            ctx.handle(`${base}.items.${index}.image`, "Item image", "image")
                          }
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.image} alt="" className="h-full w-full object-cover" />
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
                          className={`mt-2 text-sm ${ctx.editable()}`}
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
                        <a
                          href={ctx.contactHref}
                          className="mt-5 inline-flex text-sm font-semibold underline underline-offset-4"
                          style={{ color: ctx.theme.primary }}
                        >
                          Learn more
                        </a>
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
            <section id={pageId} className="bg-white px-6 py-24" style={{ color: ctx.theme.text }}>
              <div className="mx-auto max-w-6xl">
                <Reveal>
                  <h1
                    className={`font-[family-name:var(--font-display)] text-4xl font-semibold ${ctx.editable()}`}
                    onClick={() =>
                      ctx.handle(`${base}.title`, "Gallery title", "text", ctx.theme.text)
                    }
                  >
                    {page.title}
                  </h1>
                </Reveal>
                <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {items.map((item, index) => (
                    <figure key={index}>
                      <button
                        type="button"
                        className={`aspect-[4/3] w-full overflow-hidden ${ctx.editable()}`}
                        onClick={() =>
                          ctx.handle(`${base}.items.${index}.image`, "Gallery image URL", "image")
                        }
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.image} alt="" className="tpl-img-zoom h-full w-full object-cover" />
                      </button>
                      <figcaption className="mt-2 text-sm" style={{ color: ctx.theme.muted }}>
                        {item.caption}
                      </figcaption>
                    </figure>
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

/** Company — modern launch landing with alternating bands */
export function LaunchLayout(props) {
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
                <div className="absolute inset-0 bg-gradient-to-br from-[#020617]/95 via-[#020617]/75 to-[#0891b2]/40" />
              </div>
              <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-center px-6 py-28 text-white">
                <p className="tpl-fade-up inline-flex w-fit rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200/90">
                  Product · Company
                </p>
                <h1
                  className={`tpl-fade-up tpl-fade-up-delay-1 mt-6 max-w-3xl font-[family-name:var(--font-display)] text-5xl font-semibold tracking-tight md:text-7xl ${ctx.editable()}`}
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
                <div className="tpl-fade-up tpl-fade-up-delay-3 mt-10 flex flex-wrap gap-3">
                  <a
                    href={ctx.contactHref}
                    className="inline-flex rounded-full px-7 py-3.5 text-sm font-semibold text-white"
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
                  <a
                    href="#menu"
                    className="inline-flex rounded-full border border-white/30 px-7 py-3.5 text-sm font-semibold text-white/90 hover:bg-white/5"
                  >
                    See offers
                  </a>
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
              <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
                <Reveal>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300/70">
                    Why us
                  </p>
                  <h1
                    className={`mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold md:text-5xl ${ctx.editable()}`}
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
        if (pageType === "menu") {
          const base = `pages.${pageId}`;
          const items = page.items || [];
          return (
            <section id={pageId} className="px-6 py-20 text-white">
              <div className="mx-auto max-w-6xl">
                <Reveal>
                  <h1
                    className={`font-[family-name:var(--font-display)] text-4xl font-semibold ${ctx.editable()}`}
                    onClick={() => ctx.handle(`${base}.title`, "Offers title", "text", "#ffffff")}
                  >
                    {page.title}
                  </h1>
                </Reveal>
                <div className="mt-14 space-y-16">
                  {items.map((item, index) => {
                    const reverse = index % 2 === 1;
                    return (
                      <Reveal key={index} delay={index * 60}>
                        <article
                          className={`grid items-center gap-8 md:grid-cols-2 ${
                            reverse ? "md:[&>div:first-child]:order-2" : ""
                          }`}
                        >
                          <button
                            type="button"
                            className={`aspect-[16/10] overflow-hidden ${ctx.editable()}`}
                            onClick={() =>
                              ctx.handle(`${base}.items.${index}.image`, "Offer image", "image")
                            }
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.image}
                              alt=""
                              className="tpl-img-zoom h-full w-full object-cover"
                            />
                          </button>
                          <div>
                            <h2
                              className={`font-[family-name:var(--font-display)] text-3xl font-semibold ${ctx.editable()}`}
                              onClick={() =>
                                ctx.handle(
                                  `${base}.items.${index}.title`,
                                  "Offer title",
                                  "text",
                                  "#ffffff",
                                )
                              }
                            >
                              {item.title}
                            </h2>
                            <p
                              className={`mt-4 text-base leading-7 text-white/70 ${ctx.editable()}`}
                              onClick={() =>
                                ctx.handle(
                                  `${base}.items.${index}.description`,
                                  "Offer description",
                                  "textarea",
                                  "#ffffff",
                                )
                              }
                            >
                              {item.description}
                            </p>
                            <a
                              href={ctx.contactHref}
                              className="mt-6 inline-flex text-sm font-semibold"
                              style={{ color: ctx.theme.primary }}
                            >
                              Learn more →
                            </a>
                          </div>
                        </article>
                      </Reveal>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        }
        if (pageType === "gallery") {
          const base = `pages.${pageId}`;
          const items = page.items || [];
          return (
            <section id={pageId} className="px-6 py-20 text-white">
              <div className="mx-auto max-w-6xl">
                <Reveal>
                  <h1
                    className={`font-[family-name:var(--font-display)] text-4xl font-semibold ${ctx.editable()}`}
                    onClick={() => ctx.handle(`${base}.title`, "Gallery title", "text", "#ffffff")}
                  >
                    {page.title}
                  </h1>
                </Reveal>
                <div className="mt-10 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {items.map((item, index) => (
                    <button
                      key={index}
                      type="button"
                      className={`aspect-[4/3] overflow-hidden ${ctx.editable()}`}
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
          return <ContactSection page={page} pageId={pageId} {...ctx} />;
        return fallbackSection(pageType, { page, pageId, ...ctx });
      }}
    />
  );
}
