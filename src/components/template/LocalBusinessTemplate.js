"use client";

import SiteNav from "./SiteNav";
import { isOnePageLayout, normalizeSiteContent, resolvePageId } from "@/lib/site-defaults";

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
  slug,
  editMode = false,
  onEdit,
  onPageChange,
}) {
  const normalized = normalizeSiteContent(content);
  const theme = normalized.theme || {};
  const brand = normalized.brand || {};
  const onePage = isOnePageLayout(normalized);
  const pageId = resolvePageId(normalized, pageIdProp);
  const page = normalized.pages?.[pageId] || normalized.pages?.home || {};
  const pageType = page.type || pageId;

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

  const contactHref = onePage
    ? "#contact"
    : slug
      ? `/site/${slug}/contact`
      : "#contact";

  const navOrder = (normalized.nav || [])
    .map((item) => item.pageId)
    .filter((id) => normalized.pages?.[id]);

  return (
    <div
      className="min-h-screen"
      style={{
        background: `linear-gradient(180deg, ${theme.accent || "#f3efe6"} 0%, #fff 42%, ${theme.accent || "#f3efe6"} 100%)`,
        color: theme.text || "#14201c",
        ["--primary"]: theme.primary || "#1a5f4a",
      }}
    >
      <SiteNav
        content={normalized}
        slug={slug}
        pageId={pageId}
        editMode={editMode}
        onPageChange={onPageChange}
        onEditBrand={handle}
      />

      {onePage
        ? navOrder.map((id) => {
            const section = normalized.pages[id];
            const type = section.type || id;
            return renderPageSection({
              pageType: type,
              page: section,
              pageId: id,
              theme,
              content: normalized,
              editMode,
              editable,
              handle,
              contactHref,
            });
          })
        : renderPageSection({
            pageType,
            page,
            pageId,
            theme,
            content: normalized,
            editMode,
            editable,
            handle,
            contactHref,
          })}

      <footer
        className="border-t border-black/5 px-6 py-8 text-center text-sm"
        style={{ color: theme.muted }}
      >
        © {new Date().getFullYear()} {brand.name} · Powered by Technonaire
      </footer>
    </div>
  );
}

function HomePage({ page, theme, content, editMode, editable, handle, textStyle, contactHref }) {
  const hero = page.hero || {};
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
        <a
          href={contactHref}
          className={`mt-8 inline-flex rounded-full px-6 py-3 text-sm font-semibold text-white ${editable()}`}
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

function AboutPage({ page, pageId, theme, content, editable, handle, textStyle }) {
  const base = `pages.${pageId}`;
  return (
    <section
      id={pageId}
      className="mx-auto grid max-w-5xl gap-10 px-6 py-12 md:grid-cols-[1fr_0.9fr] md:items-start"
    >
      <div>
        <h1
          className={`font-[family-name:var(--font-display)] text-4xl font-semibold ${editable()}`}
          style={textStyle(content, `${base}.title`, theme.text)}
          onClick={() => handle(`${base}.title`, "About title", "text", theme.text)}
        >
          {page.title}
        </h1>
        <p
          className={`mt-5 max-w-3xl text-lg leading-8 ${editable()}`}
          style={textStyle(content, `${base}.body`, theme.muted)}
          onClick={() => handle(`${base}.body`, "About text", "textarea", theme.muted)}
        >
          {page.body}
        </p>
      </div>
      {page.image && (
        <button
          type="button"
          className={`aspect-[4/3] overflow-hidden ${editable()}`}
          onClick={() => handle(`${base}.image`, "About image URL", "image")}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={page.image} alt="" className="h-full w-full object-cover" />
        </button>
      )}
    </section>
  );
}

function ContactPage({ page, pageId, theme, content, editable, handle, textStyle, editMode }) {
  const base = `pages.${pageId}`;
  return (
    <section id={pageId} className="mx-auto max-w-5xl px-6 py-16">
      <h1
        className={`font-[family-name:var(--font-display)] text-4xl font-semibold ${editable()}`}
        style={textStyle(content, `${base}.title`, theme.text)}
        onClick={() => handle(`${base}.title`, "Contact title", "text", theme.text)}
      >
        {page.title || "Visit or call"}
      </h1>
      <div className="mt-8 grid gap-3 text-lg">
        <p
          className={editable()}
          style={textStyle(content, `${base}.phone`, theme.muted)}
          onClick={() => handle(`${base}.phone`, "Phone", "text", theme.muted)}
        >
          {page.phone || "Add your phone"}
        </p>
        <p
          className={editable()}
          style={textStyle(content, `${base}.address`, theme.muted)}
          onClick={() => handle(`${base}.address`, "Address", "text", theme.muted)}
        >
          {page.address || "Add your address"}
        </p>
        <p
          className={editable()}
          style={textStyle(content, `${base}.hours`, theme.muted)}
          onClick={() => handle(`${base}.hours`, "Hours", "text", theme.muted)}
        >
          {page.hours}
        </p>
        <p
          className={editable()}
          style={textStyle(content, `${base}.email`, theme.muted)}
          onClick={() => handle(`${base}.email`, "Email", "text", theme.muted)}
        >
          {page.email || "Add your email"}
        </p>
      </div>
      {editMode && (
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-full border border-black/15 px-4 py-2 text-sm"
            onClick={() => handle("theme.primary", "Primary color", "color")}
          >
            Edit primary color
          </button>
          <button
            type="button"
            className="rounded-full border border-black/15 px-4 py-2 text-sm"
            onClick={() => handle("theme.accent", "Background accent", "color")}
          >
            Edit accent color
          </button>
        </div>
      )}
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

function GalleryPage({ page, pageId, theme, content, editable, handle, textStyle }) {
  const base = `pages.${pageId}`;
  const items = page.items || [];
  return (
    <section id={pageId} className="mx-auto max-w-5xl px-6 py-16">
      <h1
        className={`font-[family-name:var(--font-display)] text-4xl font-semibold ${editable()}`}
        style={textStyle(content, `${base}.title`, theme.text)}
        onClick={() => handle(`${base}.title`, "Gallery title", "text", theme.text)}
      >
        {page.title}
      </h1>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
        {items.map((item, index) => (
          <figure key={index} className="space-y-2">
            <button
              type="button"
              className={`aspect-[4/3] w-full overflow-hidden ${editable()}`}
              onClick={() => handle(`${base}.items.${index}.image`, "Gallery image URL", "image")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.image} alt="" className="h-full w-full object-cover" />
            </button>
            <figcaption
              className={`text-sm ${editable()}`}
              style={textStyle(content, `${base}.items.${index}.caption`, theme.muted)}
              onClick={() =>
                handle(`${base}.items.${index}.caption`, "Caption", "text", theme.muted)
              }
            >
              {item.caption}
            </figcaption>
          </figure>
        ))}
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
