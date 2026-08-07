"use client";

import { useState } from "react";
import SiteNav from "./SiteNav";
import CommerceContactModal from "./CommerceContactModal";
import { createTemplateHandlers } from "./template-helpers";
import {
  isOnePageLayout,
  normalizeSiteContent,
  resolvePageId,
} from "@/lib/site-defaults";
import { getTemplate } from "@/lib/templates";

/**
 * Shared shell: theme root, nav, one-page section loop, footer, commerce modal.
 * `renderSection` receives section props and returns JSX for that page type.
 */
export default function TemplateChrome({
  content,
  pageId: pageIdProp = "home",
  slug = "",
  basePath,
  editMode = false,
  onEdit,
  onPageChange,
  overlayNav = true,
  lightNav = false,
  navWide = false,
  footerClassName = "border-t border-white/10 px-6 py-8 text-center text-sm text-white/70",
  rootClassName = "min-h-screen",
  renderSection,
}) {
  const [commerceOpen, setCommerceOpen] = useState(false);
  const normalized = normalizeSiteContent(content);
  const theme = normalized.theme || {};
  const brand = normalized.brand || {};
  const templateDef = getTemplate(normalized.template);
  const onePage = isOnePageLayout(normalized);
  const pageId = resolvePageId(normalized, pageIdProp);
  const page = normalized.pages?.[pageId] || normalized.pages?.home || {};
  const pageType = page.type || pageId;
  const root = basePath || (slug ? `/site/${slug}` : "");
  const { handle, editable } = createTemplateHandlers({
    content: normalized,
    editMode,
    onEdit,
  });
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
    siteSlug: slug || "",
    templateDef,
  };

  return (
    <div
      className={rootClassName}
      data-template={normalized.template || "other"}
      data-layout={templateDef.layoutStyle || "bleed"}
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
            : lightNav
              ? "sticky top-0 border-b border-black/5 bg-white/80 backdrop-blur-md"
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
          wide={navWide}
        />
      </div>

      {onePage
        ? navOrder.map((id) => {
            const section = normalized.pages[id];
            const type = section.type || id;
            return renderSection({
              pageType: type,
              page: section,
              pageId: id,
              ...sectionProps,
            });
          })
        : renderSection({
            pageType,
            page,
            pageId,
            ...sectionProps,
          })}

      <footer className={footerClassName}>
        © {new Date().getFullYear()} {brand.name} · Powered by Technonaire
        {normalized.features?.commerce ? (
          <span className="mt-2 block text-xs opacity-70">
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
