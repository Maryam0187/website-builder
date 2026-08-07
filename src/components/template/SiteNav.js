"use client";

import Link from "next/link";
import { getNavItems, isOnePageLayout } from "@/lib/site-defaults";

/**
 * Shared site header nav.
 * - multi-page preview: /site/[slug] and /site/[slug]/[page]
 * - one-page preview: #section anchors on the same page
 * - editMode: onPageChange(pageId) — scroll (one-page) or switch page (multi)
 */
export default function SiteNav({
  content,
  slug,
  /** When set (e.g. /admin/templates/bakery), nav links use this instead of /site/[slug] */
  basePath,
  pageId = "home",
  editMode = false,
  onPageChange,
  onEditBrand,
  showCart = false,
  onCartClick,
  /** Light text over photo hero */
  overlay = false,
}) {
  const theme = content?.theme || {};
  const brand = content?.brand || {};
  const nav = getNavItems(content);
  const onePage = isOnePageLayout(content);
  const root = basePath || (slug ? `/site/${slug}` : "");
  const nameColor = overlay
    ? content?.styles?.["brand.name"]?.color || "#ffffff"
    : content?.styles?.["brand.name"]?.color || theme.text;
  const tagColor = overlay
    ? content?.styles?.["brand.tagline"]?.color || "rgba(255,255,255,0.82)"
    : content?.styles?.["brand.tagline"]?.color || theme.muted;
  const linkColor = overlay ? "#ffffff" : theme.text;

  function hrefFor(id) {
    if (onePage) {
      if (!root) return `#${id}`;
      return id === "home" ? `${root}#home` : `${root}#${id}`;
    }
    if (!root) return "#";
    return id === "home" ? root : `${root}/${id}`;
  }

  const linkClass = (id) =>
    `text-sm font-medium transition ${
      id === pageId ? "underline underline-offset-4" : "opacity-80 hover:opacity-100"
    }`;

  return (
    <header
      className={`mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-5 ${
        overlay ? "w-full" : ""
      }`}
    >
      <div>
        <p
          className={`font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight ${
            editMode
              ? "cursor-pointer outline outline-2 outline-transparent transition hover:outline-white/50 rounded-sm"
              : ""
          }`}
          style={{ color: nameColor }}
          onClick={() => onEditBrand?.("brand.name", "Business name", "text", nameColor)}
        >
          {brand.name}
        </p>
        {brand.tagline ? (
          <p
            className={`mt-1 text-sm ${
              editMode
                ? "cursor-pointer outline outline-2 outline-transparent transition hover:outline-white/50 rounded-sm"
                : ""
            }`}
            style={{ color: tagColor }}
            onClick={() => onEditBrand?.("brand.tagline", "Tagline", "text", tagColor)}
          >
            {brand.tagline}
          </p>
        ) : null}
      </div>

      <nav className="flex flex-wrap items-center gap-4" aria-label="Site pages">
        {nav.map((item) =>
          editMode ? (
            <button
              key={item.pageId}
              type="button"
              className={linkClass(item.pageId)}
              style={{ color: linkColor }}
              onClick={() => onPageChange?.(item.pageId)}
            >
              {item.label}
            </button>
          ) : (
            <Link
              key={item.pageId}
              href={hrefFor(item.pageId)}
              className={linkClass(item.pageId)}
              style={{ color: linkColor }}
            >
              {item.label}
            </Link>
          ),
        )}
        {showCart && (
          <button
            type="button"
            onClick={onCartClick}
            className="rounded-full px-3 py-1.5 text-sm font-semibold text-white"
            style={{ background: theme.primary }}
            title="Cart & checkout — contact us to enable"
          >
            Cart
          </button>
        )}
      </nav>
    </header>
  );
}
