"use client";

import Reveal from "./Reveal";
import SiteContactForm from "./SiteContactForm";
import DineOsSection from "./DineOsSection";
import { bookMeetingLabel, getBookMeetingHref } from "@/lib/booking";
import { DEFAULT_SITE_CONTACT_EMAIL } from "@/lib/site-defaults";
import { textStyle } from "./template-helpers";

export function ContactSection({
  page,
  pageId,
  theme,
  content,
  editable,
  handle,
  editMode,
  siteSlug = "",
  variant = "photo",
}) {
  const base = `pages.${pageId}`;
  const email = page.email || DEFAULT_SITE_CONTACT_EMAIL;
  const brandName = content?.brand?.name || "";
  const calendlyUrl = getBookMeetingHref();
  const light = variant === "light";

  return (
    <section
      id={pageId}
      className={`relative overflow-hidden ${light ? "min-h-[70svh]" : "min-h-[80svh]"}`}
    >
      {light ? (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 20% 0%, ${theme.primary}22, transparent 50%), linear-gradient(180deg, ${theme.accent}, ${theme.accent})`,
          }}
        />
      ) : page.image ? (
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={page.image} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/60 to-black/35" />
        </div>
      ) : (
        <div className="absolute inset-0" style={{ background: theme.primary }} />
      )}
      <div
        className={`relative mx-auto flex min-h-[inherit] max-w-5xl flex-col justify-end px-6 py-20 ${
          light ? "" : "text-white"
        }`}
        style={light ? { color: theme.text, minHeight: "70svh" } : { minHeight: "80svh" }}
      >
        <Reveal>
          <h1
            className={`font-[family-name:var(--font-display)] text-4xl font-semibold md:text-5xl ${editable()}`}
            style={textStyle(content, `${base}.title`, light ? theme.text : "#ffffff")}
            onClick={() =>
              handle(`${base}.title`, "Contact title", "text", light ? theme.text : "#ffffff")
            }
          >
            {page.title || "Get in touch"}
          </h1>
          <div
            className={`mt-6 grid max-w-xl gap-2 text-lg ${light ? "" : "text-white/90"}`}
            style={light ? { color: theme.muted } : undefined}
          >
            <p>
              Email{" "}
              <a
                href={`mailto:${email}`}
                className={`font-semibold underline underline-offset-4 ${editable()}`}
                style={light ? { color: theme.primary } : undefined}
                onClick={(e) => {
                  if (editMode) {
                    e.preventDefault();
                    handle(`${base}.email`, "Contact email", "text", light ? theme.text : "#ffffff");
                  }
                }}
              >
                {email}
              </a>
            </p>
            {(page.address || editMode) && (
              <p
                className={editable()}
                onClick={() =>
                  handle(`${base}.address`, "Address", "text", light ? theme.text : "#ffffff")
                }
              >
                {page.address || "Add your address (optional)"}
              </p>
            )}
            {(page.hours || editMode) && (
              <p
                className={editable()}
                onClick={() =>
                  handle(`${base}.hours`, "Hours", "text", light ? theme.text : "#ffffff")
                }
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
              className={`inline-flex rounded-full border px-6 py-3 text-sm font-semibold transition ${
                light
                  ? "border-black/15 bg-white/70 hover:bg-white"
                  : "border-white/45 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
              }`}
              style={light ? { color: theme.text } : undefined}
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
                className={`rounded-full border px-4 py-2 text-sm ${
                  light ? "border-black/20" : "border-white/40 text-white"
                }`}
                onClick={() =>
                  handle(`${base}.email`, "Contact email", "text", light ? theme.text : "#ffffff")
                }
              >
                Edit contact email
              </button>
              <button
                type="button"
                className={`rounded-full border px-4 py-2 text-sm ${
                  light ? "border-black/20" : "border-white/40 text-white"
                }`}
                onClick={() => handle(`${base}.image`, "Contact background image URL", "image")}
              >
                Change contact background
              </button>
              <button
                type="button"
                className={`rounded-full border px-4 py-2 text-sm ${
                  light ? "border-black/20" : "border-white/40 text-white"
                }`}
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

export function ServicesSection({ page, pageId, theme, content, editable, handle }) {
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

export function FaqSection({ page, pageId, theme, content, editable, handle }) {
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

export function PricingSection({ page, pageId, theme, content, editable, handle }) {
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
            className="border p-6"
            style={{ borderColor: `${theme.primary}33`, background: "rgba(255,255,255,0.04)" }}
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

export function ContentSection({ page, pageId, theme, content, editable, handle }) {
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

export function fallbackSection(pageType, props) {
  if (pageType === "dineos") {
    const light =
      props.content?.template === "bakery" || props.theme?.accent?.startsWith("#e");
    return <DineOsSection {...props} variant={light ? "light" : "dark"} />;
  }
  if (pageType === "contact") return <ContactSection {...props} />;
  if (pageType === "services") return <ServicesSection {...props} />;
  if (pageType === "faq") return <FaqSection {...props} />;
  if (pageType === "pricing") return <PricingSection {...props} />;
  return <ContentSection {...props} />;
}
