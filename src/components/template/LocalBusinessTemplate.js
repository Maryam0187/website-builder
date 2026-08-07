"use client";

import { useState } from "react";
import SiteNav from "./SiteNav";
import CommerceContactModal from "./CommerceContactModal";
import Reveal from "./Reveal";
import SiteContactForm from "./SiteContactForm";
import { bookMeetingLabel, getBookMeetingHref } from "@/lib/booking";
import {
  DEFAULT_SITE_CONTACT_EMAIL,
  isOnePageLayout,
  normalizeSiteContent,
  resolvePageId,
} from "@/lib/site-defaults";
import { getTemplate } from "@/lib/templates";
import DineOsSection from "./DineOsSection";

function getPath(obj, path) {
  return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function textStyle(content, path, fallbackColor) {
  const style = content?.styles?.[path] || {};
  return {
    color: style.color || fallbackColor,
    fontSize: style.fontSize || undefined,
    fontWeight: style.fontWeight || undefined,
  };
}

function renderPageSection({
  pageType,
  page,
  pageId,
  theme,
  content,
  editMode,
  editable,
  handle,
  contactHref,
  onCommerceClick,
  heroVariant,
  siteSlug = "",
}) {
  if (pageType === "home") {
    return (
      <HomePage
        key={pageId}
        page={page}
        theme={theme}
        content={content}
        editMode={editMode}
        editable={editable}
        handle={handle}
        textStyle={textStyle}
        contactHref={contactHref}
        heroVariant={heroVariant}
        onCommerceClick={onCommerceClick}
      />
    );
  }
  if (pageType === "about") {
    return (
      <AboutPage
        key={pageId}
        page={page}
        pageId={pageId}
        theme={theme}
        content={content}
        editable={editable}
        handle={handle}
        textStyle={textStyle}
        editMode={editMode}
      />
    );
  }
  if (pageType === "contact") {
    return (
      <ContactPage
        key={pageId}
        page={page}
        pageId={pageId}
        theme={theme}
        content={content}
        editable={editable}
        handle={handle}
        textStyle={textStyle}
        editMode={editMode}
        siteSlug={siteSlug}
      />
    );
  }
  if (pageType === "services") {
    return (
      <ServicesPage
        key={pageId}
        page={page}
        pageId={pageId}
        theme={theme}
        content={content}
        editable={editable}
        handle={handle}
        textStyle={textStyle}
      />
    );
  }
  if (pageType === "menu") {
    return (
      <MenuPage
        key={pageId}
        page={page}
        pageId={pageId}
        theme={theme}
        content={content}
        editable={editable}
        handle={handle}
        textStyle={textStyle}
        editMode={editMode}
        contactHref={contactHref}
        onCommerceClick={onCommerceClick}
      />
    );
  }
  if (pageType === "gallery") {
    return (
      <GalleryPage
        key={pageId}
        page={page}
        pageId={pageId}
        theme={theme}
        content={content}
        editable={editable}
        handle={handle}
        textStyle={textStyle}
        editMode={editMode}
      />
    );
  }
  if (pageType === "dineos") {
    return (
      <DineOsSection
        key={pageId}
        page={page}
        pageId={pageId}
        theme={theme}
        content={content}
        editable={editable}
        handle={handle}
        editMode={editMode}
        variant="dark"
      />
    );
  }
  if (pageType === "faq") {
    return (
      <FaqPage
        key={pageId}
        page={page}
        pageId={pageId}
        theme={theme}
        content={content}
        editable={editable}
        handle={handle}
        textStyle={textStyle}
      />
    );
  }
  if (pageType === "pricing") {
    return (
      <PricingPage
        key={pageId}
        page={page}
        pageId={pageId}
        theme={theme}
        content={content}
        editable={editable}
        handle={handle}
        textStyle={textStyle}
      />
    );
  }
  return (
    <ContentPage
      key={pageId}
      page={page}
      pageId={pageId}
      theme={theme}
      content={content}
      editable={editable}
      handle={handle}
      textStyle={textStyle}
    />
  );
}

export default function LocalBusinessTemplate({
  content,
  pageId: pageIdProp = "home",
  slug = "",
  basePath,
  editMode = false,
  onEdit,
  onPageChange,
}) {
  const [commerceOpen, setCommerceOpen] = useState(false);
  const normalized = normalizeSiteContent(content);
  const theme = normalized.theme || {};
  const brand = normalized.brand || {};
  const templateDef = getTemplate(normalized.template);
  // Default bleed layout uses full-bleed photo hero (legacy heroVariant still honored)
  const heroVariant = templateDef.heroVariant || "bleed";
  const onePage = isOnePageLayout(normalized);
  const pageId = resolvePageId(normalized, pageIdProp);
  const page = normalized.pages?.[pageId] || normalized.pages?.home || {};
  const pageType = page.type || pageId;
  const root = basePath || (slug ? `/site/${slug}` : "");

  const handle = (path, label, type = "text", fallbackColor) => {
    if (!editMode || !onEdit) return;
    const style = normalized?.styles?.[path] || {};
    onEdit({
      path,
      label,
      type,
      value: getPath(normalized, path),
      color: style.color || fallbackColor || "",
      fontSize: style.fontSize || "",
      fontWeight: style.fontWeight || "",
    });
  };

  const editable = () =>
    editMode
      ? "cursor-pointer outline outline-2 outline-transparent transition hover:outline-[#c4a574]/70 rounded-sm"
      : "";

  const contactHref = onePage ? "#contact" : root ? `${root}/contact` : "#contact";

  const navOrder = (normalized.nav || [])
    .map((item) => item.pageId)
    .filter((id) => normalized.pages?.[id]);

  const sectionProps = {
    theme,
    content: normalized,
    editMode,
    editable,
    handle,
    contactHref,
    onCommerceClick: () => setCommerceOpen(true),
    heroVariant,
    siteSlug: slug || "",
  };

  const overlayNav = heroVariant === "bleed";

  return (
    <div
      className="min-h-screen"
      data-template={normalized.template || "other"}
      style={{
        background: theme.accent || "#0a1410",
        color: theme.text || "#14201c",
        ["--primary"]: theme.primary || "#1a5f4a",
      }}
    >
      <div
        className={`z-40 w-full ${
          overlayNav
            ? "sticky top-0 bg-gradient-to-b from-black/55 via-black/25 to-transparent backdrop-blur-[2px]"
            : "relative"
        }`}
      >
        <SiteNav
          content={normalized}
          slug={slug}
          basePath={basePath}
          pageId={pageId}
          editMode={editMode}
          onPageChange={onPageChange}
          onEditBrand={handle}
          showCart={Boolean(normalized.features?.commerce)}
          onCartClick={() => setCommerceOpen(true)}
          overlay={overlayNav}
        />
      </div>

      {onePage
        ? navOrder.map((id) => {
            const section = normalized.pages[id];
            const type = section.type || id;
            return renderPageSection({
              pageType: type,
              page: section,
              pageId: id,
              ...sectionProps,
            });
          })
        : renderPageSection({
            pageType,
            page,
            pageId,
            ...sectionProps,
          })}

      <footer className="border-t border-white/10 px-6 py-8 text-center text-sm text-white/70">
        © {new Date().getFullYear()} {brand.name} · Powered by Technonaire
        {normalized.features?.commerce ? (
          <span className="mt-2 block text-xs text-white/55">
            Cart & checkout: contact us to enable full online ordering.
          </span>
        ) : null}
      </footer>

      <CommerceContactModal
        open={commerceOpen}
        onClose={() => setCommerceOpen(false)}
        contactHref={contactHref}
      />
    </div>
  );
}

function HomePage({
  page,
  theme,
  content,
  editMode,
  editable,
  handle,
  textStyle,
  contactHref,
  heroVariant,
  onCommerceClick,
}) {
  const hero = page.hero || {};
  const bleed = heroVariant === "bleed" || !heroVariant;

  if (bleed) {
    return (
      <section id="home" className="relative -mt-[5.5rem] min-h-[100svh] overflow-hidden">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={hero.image} alt="" className="template-hero-zoom h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/25" />
        </div>
        <div className="relative mx-auto flex min-h-[100svh] max-w-5xl flex-col justify-end px-6 pb-20 pt-32 text-white">
          <p className="tpl-fade-up mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-white/75">
            Welcome
          </p>
          <h1
            className={`tpl-fade-up tpl-fade-up-delay-1 max-w-3xl font-[family-name:var(--font-display)] text-5xl leading-[1.05] font-semibold tracking-tight md:text-7xl ${editable()}`}
            style={textStyle(content, "pages.home.hero.headline", "#ffffff")}
            onClick={() => handle("pages.home.hero.headline", "Hero headline", "text", "#ffffff")}
          >
            {hero.headline}
          </h1>
          <p
            className={`tpl-fade-up tpl-fade-up-delay-2 mt-6 max-w-xl text-lg leading-8 text-white/90 md:text-xl ${editable()}`}
            onClick={() =>
              handle("pages.home.hero.subheadline", "Hero subheadline", "text", "#ffffff")
            }
          >
            {hero.subheadline}
          </p>
          <div className="tpl-fade-up tpl-fade-up-delay-3 mt-10 flex flex-wrap gap-3">
            <a
              href={contactHref}
              className={`tpl-cta-glow inline-flex rounded-full px-7 py-3.5 text-sm font-semibold text-white transition hover:brightness-110 ${editable()}`}
              style={{ background: theme.primary }}
              onClick={(e) => {
                if (editMode) {
                  e.preventDefault();
                  handle("pages.home.hero.cta", "Button text", "text", "#ffffff");
                }
              }}
            >
              {hero.cta}
            </a>
            {content?.features?.commerce && (
              <button
                type="button"
                onClick={onCommerceClick}
                className="inline-flex rounded-full border border-white/55 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                Cart / order
              </button>
            )}
          </div>
          {editMode && (
            <button
              type="button"
              className="mt-5 text-left text-xs text-white/80 underline"
              onClick={() => handle("pages.home.hero.image", "Hero image URL", "image")}
            >
              Change hero background image
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section
      id="home"
      className="relative mx-auto grid max-w-5xl gap-10 px-6 pb-16 pt-4 md:grid-cols-[1.1fr_0.9fr] md:items-center"
    >
      <div>
        <h1
          className={`font-[family-name:var(--font-display)] text-4xl leading-tight font-semibold md:text-5xl ${editable()}`}
          style={textStyle(content, "pages.home.hero.headline", theme.text)}
          onClick={() => handle("pages.home.hero.headline", "Hero headline", "text", theme.text)}
        >
          {hero.headline}
        </h1>
        <p
          className={`mt-5 max-w-xl text-lg leading-8 ${editable()}`}
          style={textStyle(content, "pages.home.hero.subheadline", theme.muted)}
          onClick={() =>
            handle("pages.home.hero.subheadline", "Hero subheadline", "text", theme.muted)
          }
        >
          {hero.subheadline}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={contactHref}
            className={`inline-flex rounded-full px-6 py-3 text-sm font-semibold text-white ${editable()}`}
            style={{
              background: theme.primary,
              ...textStyle(content, "pages.home.hero.cta"),
              color: content?.styles?.["pages.home.hero.cta"]?.color || "#ffffff",
            }}
            onClick={(e) => {
              if (editMode) {
                e.preventDefault();
                handle("pages.home.hero.cta", "Button text", "text", "#ffffff");
              }
            }}
          >
            {hero.cta}
          </a>
        </div>
      </div>
      <button
        type="button"
        className={`relative aspect-[4/5] overflow-hidden ${editable()}`}
        onClick={() => handle("pages.home.hero.image", "Hero image URL", "image")}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={hero.image} alt="" className="h-full w-full object-cover" />
      </button>
    </section>
  );
}

function MenuPage({
  page,
  pageId,
  theme,
  content,
  editable,
  handle,
  textStyle,
  editMode,
  contactHref,
  onCommerceClick,
}) {
  const base = `pages.${pageId}`;
  const items = page.items || [];
  const commerce = page.commerce || content?.features?.commerce;

  return (
    <section id={pageId} className="relative px-6 py-20 text-white">
      <div className="mx-auto max-w-5xl">
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
          {commerce && (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
              {page.contactNote ||
                "Full cart and checkout need to be enabled for your business — contact us."}
            </p>
          )}
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {items.map((item, index) => (
            <Reveal key={index} delay={index * 90}>
              <article className="tpl-card flex flex-col overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm">
                <button
                  type="button"
                  className={`group aspect-[4/3] w-full overflow-hidden ${editable()}`}
                  onClick={() => handle(`${base}.items.${index}.image`, "Item image URL", "image")}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image} alt="" className="tpl-img-zoom h-full w-full object-cover" />
                </button>
                <div className="flex flex-1 flex-col p-5">
                  <h2
                    className={`text-lg font-semibold text-white ${editable()}`}
                    onClick={() =>
                      handle(`${base}.items.${index}.title`, "Item title", "text", "#ffffff")
                    }
                  >
                    {item.title}
                  </h2>
                  <p
                    className={`mt-2 flex-1 text-sm text-white/75 ${editable()}`}
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
                      className="mt-4 rounded-full border border-white/25 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                      Add to cart
                    </button>
                  )}
                  {commerce && editMode && (
                    <p className="mt-3 text-xs text-white/55">
                      “Add to cart” asks visitors to contact you for full checkout.
                    </p>
                  )}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
        {commerce && (
          <p className="mt-10 text-center text-sm text-white/75">
            <a href={contactHref} className="font-semibold text-white underline">
              Contact us
            </a>{" "}
            to enable full cart &amp; checkout.
          </p>
        )}
      </div>
    </section>
  );
}

function AboutPage({ page, pageId, theme, content, editable, handle, textStyle, editMode }) {
  const base = `pages.${pageId}`;
  if (page.image) {
    return (
      <section id={pageId} className="relative min-h-[85svh] overflow-hidden">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={page.image} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-black/30" />
        </div>
        <div className="relative mx-auto flex min-h-[85svh] max-w-5xl items-center px-6 py-24">
          <Reveal className="max-w-2xl text-white">
            <h1
              className={`font-[family-name:var(--font-display)] text-4xl font-semibold md:text-5xl ${editable()}`}
              style={textStyle(content, `${base}.title`, "#ffffff")}
              onClick={() => handle(`${base}.title`, "About title", "text", "#ffffff")}
            >
              {page.title}
            </h1>
            <p
              className={`mt-6 text-lg leading-8 text-white/90 md:text-xl ${editable()}`}
              onClick={() => handle(`${base}.body`, "About text", "textarea", "#ffffff")}
            >
              {page.body}
            </p>
            {editMode && (
              <button
                type="button"
                className="mt-6 text-xs text-white/80 underline"
                onClick={() => handle(`${base}.image`, "About background image URL", "image")}
              >
                Change about background image
              </button>
            )}
          </Reveal>
        </div>
      </section>
    );
  }

  return (
    <section id={pageId} className="mx-auto max-w-5xl px-6 py-20 text-white">
      <h1
        className={`font-[family-name:var(--font-display)] text-4xl font-semibold ${editable()}`}
        style={textStyle(content, `${base}.title`, "#ffffff")}
        onClick={() => handle(`${base}.title`, "About title", "text", "#ffffff")}
      >
        {page.title}
      </h1>
      <p
        className={`mt-5 max-w-3xl text-lg leading-8 text-white/80 ${editable()}`}
        onClick={() => handle(`${base}.body`, "About text", "textarea", "#ffffff")}
      >
        {page.body}
      </p>
    </section>
  );
}

function ContactPage({
  page,
  pageId,
  theme,
  content,
  editable,
  handle,
  textStyle,
  editMode,
  siteSlug = "",
}) {
  const base = `pages.${pageId}`;
  const email = page.email || DEFAULT_SITE_CONTACT_EMAIL;
  const brandName = content?.brand?.name || "";
  const calendlyUrl = getBookMeetingHref();

  return (
    <section id={pageId} className="relative min-h-[80svh] overflow-hidden">
      {page.image ? (
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={page.image} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/60 to-black/35" />
        </div>
      ) : (
        <div className="absolute inset-0" style={{ background: theme.primary }} />
      )}
      <div className="relative mx-auto flex min-h-[80svh] max-w-5xl flex-col justify-end px-6 py-20 text-white">
        <Reveal>
          <h1
            className={`font-[family-name:var(--font-display)] text-4xl font-semibold md:text-5xl ${editable()}`}
            style={textStyle(content, `${base}.title`, "#ffffff")}
            onClick={() => handle(`${base}.title`, "Contact title", "text", "#ffffff")}
          >
            {page.title || "Get in touch"}
          </h1>
          <div className="mt-6 grid max-w-xl gap-2 text-lg text-white/90">
            <p>
              Email{" "}
              <a
                href={`mailto:${email}`}
                className={`font-semibold underline underline-offset-4 ${editable()}`}
                onClick={(e) => {
                  if (editMode) {
                    e.preventDefault();
                    handle(`${base}.email`, "Contact email", "text", "#ffffff");
                  }
                }}
              >
                {email}
              </a>
            </p>
            {(page.address || editMode) && (
              <p
                className={editable()}
                onClick={() => handle(`${base}.address`, "Address", "text", "#ffffff")}
              >
                {page.address || "Add your address (optional)"}
              </p>
            )}
            {(page.hours || editMode) && (
              <p
                className={editable()}
                onClick={() => handle(`${base}.hours`, "Hours", "text", "#ffffff")}
              >
                {page.hours || "Add hours (optional)"}
              </p>
            )}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={calendlyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-full px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
              style={{ background: theme.primary }}
            >
              {bookMeetingLabel}
            </a>
            <a
              href={`mailto:${email}`}
              className="inline-flex rounded-full border border-white/45 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              Email us
            </a>
          </div>
          {!editMode && page.showForm !== false ? (
            <SiteContactForm
              theme={theme}
              siteName={brandName}
              siteSlug={siteSlug}
              toEmail={email}
            />
          ) : null}
          {editMode && (
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-full border border-white/40 px-4 py-2 text-sm text-white"
                onClick={() => handle(`${base}.email`, "Contact email", "text", "#ffffff")}
              >
                Edit contact email
              </button>
              <button
                type="button"
                className="rounded-full border border-white/40 px-4 py-2 text-sm text-white"
                onClick={() => handle(`${base}.image`, "Contact background image URL", "image")}
              >
                Change contact background
              </button>
              <button
                type="button"
                className="rounded-full border border-white/40 px-4 py-2 text-sm text-white"
                onClick={() => handle("theme.primary", "Primary color", "color")}
              >
                Edit primary color
              </button>
            </div>
          )}
        </Reveal>
      </div>
    </section>
  );
}

function ServicesPage({ page, pageId, theme, content, editable, handle, textStyle }) {
  const base = `pages.${pageId}`;
  const items = page.items || [];
  return (
    <section id={pageId} className="mx-auto max-w-5xl px-6 py-16">
      <h1
        className={`font-[family-name:var(--font-display)] text-4xl font-semibold ${editable()}`}
        style={textStyle(content, `${base}.title`, theme.text)}
        onClick={() => handle(`${base}.title`, "Services title", "text", theme.text)}
      >
        {page.title}
      </h1>
      <div className="mt-10 grid gap-8 md:grid-cols-3">
        {items.map((service, index) => (
          <article key={index} className="space-y-3">
            <button
              type="button"
              className={`aspect-[4/3] w-full overflow-hidden ${editable()}`}
              onClick={() => handle(`${base}.items.${index}.image`, "Service image URL", "image")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={service.image} alt="" className="h-full w-full object-cover" />
            </button>
            <h2
              className={`text-xl font-semibold ${editable()}`}
              style={textStyle(content, `${base}.items.${index}.title`, theme.text)}
              onClick={() =>
                handle(`${base}.items.${index}.title`, "Service title", "text", theme.text)
              }
            >
              {service.title}
            </h2>
            <p
              className={editable()}
              style={textStyle(content, `${base}.items.${index}.description`, theme.muted)}
              onClick={() =>
                handle(
                  `${base}.items.${index}.description`,
                  "Service description",
                  "textarea",
                  theme.muted,
                )
              }
            >
              {service.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function GalleryPage({ page, pageId, theme, content, editable, handle, textStyle, editMode }) {
  const base = `pages.${pageId}`;
  const items = page.items || [];
  return (
    <section id={pageId} className="relative px-6 py-20 text-white">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">Photos</p>
          <h1
            className={`mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold md:text-5xl ${editable()}`}
            style={textStyle(content, `${base}.title`, "#ffffff")}
            onClick={() => handle(`${base}.title`, "Gallery title", "text", "#ffffff")}
          >
            {page.title}
          </h1>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-5">
          {items.map((item, index) => (
            <Reveal key={index} delay={index * 70} className="tpl-gallery-tile">
              <figure className="tpl-card group overflow-hidden border border-white/10 bg-white/5">
                <button
                  type="button"
                  className={`relative aspect-[4/5] w-full overflow-hidden sm:aspect-[4/3] ${editable()}`}
                  onClick={() =>
                    handle(`${base}.items.${index}.image`, "Gallery image URL", "image")
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt=""
                    className="tpl-img-zoom h-full w-full object-cover"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-80 transition group-hover:opacity-95" />
                  <figcaption
                    className={`absolute bottom-0 left-0 right-0 p-4 text-left text-sm font-medium text-white ${editable()}`}
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

function FaqPage({ page, pageId, theme, content, editable, handle, textStyle }) {
  const base = `pages.${pageId}`;
  const items = page.items || [];
  return (
    <section id={pageId} className="mx-auto max-w-3xl px-6 py-16">
      <h1
        className={`font-[family-name:var(--font-display)] text-4xl font-semibold ${editable()}`}
        style={textStyle(content, `${base}.title`, theme.text)}
        onClick={() => handle(`${base}.title`, "FAQ title", "text", theme.text)}
      >
        {page.title}
      </h1>
      <div className="mt-10 space-y-8">
        {items.map((item, index) => (
          <div key={index}>
            <h2
              className={`text-xl font-semibold ${editable()}`}
              style={textStyle(content, `${base}.items.${index}.question`, theme.text)}
              onClick={() =>
                handle(`${base}.items.${index}.question`, "Question", "text", theme.text)
              }
            >
              {item.question}
            </h2>
            <p
              className={`mt-2 leading-7 ${editable()}`}
              style={textStyle(content, `${base}.items.${index}.answer`, theme.muted)}
              onClick={() =>
                handle(`${base}.items.${index}.answer`, "Answer", "textarea", theme.muted)
              }
            >
              {item.answer}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PricingPage({ page, pageId, theme, content, editable, handle, textStyle }) {
  const base = `pages.${pageId}`;
  const items = page.items || [];
  return (
    <section id={pageId} className="mx-auto max-w-5xl px-6 py-16">
      <h1
        className={`font-[family-name:var(--font-display)] text-4xl font-semibold ${editable()}`}
        style={textStyle(content, `${base}.title`, theme.text)}
        onClick={() => handle(`${base}.title`, "Pricing title", "text", theme.text)}
      >
        {page.title}
      </h1>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {items.map((item, index) => (
          <article
            key={index}
            className="border border-black/10 bg-white/50 p-6"
            style={{ borderColor: `${theme.primary}33` }}
          >
            <h2
              className={`text-xl font-semibold ${editable()}`}
              style={textStyle(content, `${base}.items.${index}.name`, theme.text)}
              onClick={() => handle(`${base}.items.${index}.name`, "Plan name", "text", theme.text)}
            >
              {item.name}
            </h2>
            <p
              className={`mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold ${editable()}`}
              style={textStyle(content, `${base}.items.${index}.price`, theme.primary)}
              onClick={() => handle(`${base}.items.${index}.price`, "Price", "text", theme.primary)}
            >
              {item.price}
            </p>
            <p
              className={`mt-3 leading-7 ${editable()}`}
              style={textStyle(content, `${base}.items.${index}.description`, theme.muted)}
              onClick={() =>
                handle(
                  `${base}.items.${index}.description`,
                  "Plan description",
                  "textarea",
                  theme.muted,
                )
              }
            >
              {item.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ContentPage({ page, pageId, theme, content, editable, handle, textStyle }) {
  const base = `pages.${pageId}`;
  return (
    <section
      id={pageId}
      className="mx-auto grid max-w-5xl gap-10 px-6 py-16 md:grid-cols-[1.1fr_0.9fr] md:items-start"
    >
      <div>
        <h1
          className={`font-[family-name:var(--font-display)] text-4xl font-semibold ${editable()}`}
          style={textStyle(content, `${base}.title`, theme.text)}
          onClick={() => handle(`${base}.title`, "Page title", "text", theme.text)}
        >
          {page.title}
        </h1>
        <p
          className={`mt-5 max-w-3xl text-lg leading-8 ${editable()}`}
          style={textStyle(content, `${base}.body`, theme.muted)}
          onClick={() => handle(`${base}.body`, "Page text", "textarea", theme.muted)}
        >
          {page.body}
        </p>
      </div>
      {page.image && (
        <button
          type="button"
          className={`aspect-[4/3] overflow-hidden ${editable()}`}
          onClick={() => handle(`${base}.image`, "Page image URL", "image")}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={page.image} alt="" className="h-full w-full object-cover" />
        </button>
      )}
    </section>
  );
}
