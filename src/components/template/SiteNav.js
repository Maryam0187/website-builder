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
  pageId = "home",
  editMode = false,
  onPageChange,
  onEditBrand,
}) {
  const theme = content?.theme || {};
  const brand = content?.brand || {};
  const nav = getNavItems(content);
  const onePage = isOnePageLayout(content);

  function hrefFor(id) {
    if (onePage) {
      if (!slug) return `#${id}`;
      return id === "home" ? `/site/${slug}#home` : `/site/${slug}#${id}`;
    }
    if (!slug) return "#";
    return id === "home" ? `/site/${slug}` : `/site/${slug}/${id}`;
  }

  const linkClass = (id) =>
    `text-sm font-medium transition ${
      id === pageId ? "underline underline-offset-4" : "opacity-80 hover:opacity-100"
    }`;

  return (
    <header className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-6">
      <div>
        <p
          className={`font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight ${
            editMode
              ? "cursor-pointer outline outline-2 outline-transparent transition hover:outline-[#c4a574]/70 rounded-sm"
              : ""
          }`}
          style={{ color: content?.styles?.["brand.name"]?.color || theme.text }}
          onClick={() => onEditBrand?.("brand.name", "Business name", "text", theme.text)}
        >
          {brand.name}
        </p>
        <p
          className={`mt-1 text-sm ${
            editMode
              ? "cursor-pointer outline outline-2 outline-transparent transition hover:outline-[#c4a574]/70 rounded-sm"
              : ""
          }`}
          style={{ color: content?.styles?.["brand.tagline"]?.color || theme.muted }}
          onClick={() => onEditBrand?.("brand.tagline", "Tagline", "text", theme.muted)}
        >
          {brand.tagline}
        </p>
      </div>

      <nav className="flex flex-wrap items-center gap-4" aria-label="Site pages">
        {nav.map((item) =>
          editMode ? (
            <button
              key={item.pageId}
              type="button"
              className={linkClass(item.pageId)}
              style={{ color: theme.text }}
              onClick={() => onPageChange?.(item.pageId)}
            >
              {item.label}
            </button>
          ) : (
            <Link
              key={item.pageId}
              href={hrefFor(item.pageId)}
              className={linkClass(item.pageId)}
              style={{ color: theme.text }}
            >
              {item.label}
            </Link>
          ),
        )}
      </nav>
    </header>
  );
}
