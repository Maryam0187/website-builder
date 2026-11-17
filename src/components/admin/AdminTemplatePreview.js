import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createDefaultSiteContent, resolvePageId } from "@/lib/site-defaults";
import { getTemplate, TEMPLATE_IDS } from "@/lib/templates";
import SiteTemplate from "@/components/template/SiteTemplate";
import ApplyTemplateButton from "@/components/template/ApplyTemplateButton";
import SettingsFrame from "@/components/settings/SettingsFrame";

const SAMPLE_NAMES = {
  bakery: "Sunrise Bakery",
  clinic: "Harbor Wellness",
  restaurant: "Cedar Table",
  shop: "Northside Goods",
  services: "Bright Path Consulting",
  portfolio: "Aria Studio",
  realestate: "Harbor Homes",
  coaching: "Northstar Coaching",
  events: "Afterglow Venue",
  nonprofit: "Open Hands Project",
  company: "Pulse Labs",
  perfume: "Maison Lumière",
  other: "Neighborhood Co.",
};

export default async function AdminTemplatePreview({
  templateId,
  pageParam = "home",
  roles = ["admin"],
  pathPrefix = "/admin/templates",
}) {
  const user = await requireUser(roles);
  const previewPath =
    pageParam && pageParam !== "home"
      ? `${pathPrefix}/${templateId}/${pageParam}`
      : `${pathPrefix}/${templateId}`;
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(previewPath)}`);
  }

  const id = String(templateId || "").toLowerCase();
  if (!TEMPLATE_IDS.includes(id)) notFound();

  const meta = getTemplate(id);
  const content = createDefaultSiteContent({
    brandName: SAMPLE_NAMES[id] || meta.label,
    template: id,
    layout: "one-page",
  });
  const pageId = resolvePageId(content, pageParam);
  if (pageParam && pageParam !== "home" && pageId !== pageParam) notFound();

  const basePath = `${pathPrefix}/${id}`;
  const showApply = user.role === "owner";
  const index = TEMPLATE_IDS.indexOf(id);
  const previousId = index > 0 ? TEMPLATE_IDS[index - 1] : null;
  const nextId = index < TEMPLATE_IDS.length - 1 ? TEMPLATE_IDS[index + 1] : null;
  const stepClass =
    "rounded-full border border-white/15 px-4 py-1.5 text-xs font-semibold text-white hover:bg-white/5";

  return (
    <SettingsFrame user={{ email: user.email, role: user.role }} activeHref="#templates">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#040b1a] px-4 py-3 sm:px-6">
        <Link
          href="/profile#templates"
          className="inline-flex min-w-0 items-center gap-2 rounded-full px-1 py-1 text-white hover:text-cyan-100"
        >
          <span aria-hidden="true" className="text-lg leading-none">←</span>
          <span className="truncate font-semibold">{meta.label}</span>
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {previousId ? (
            <Link href={`${pathPrefix}/${previousId}`} className={stepClass}>
              Back
            </Link>
          ) : (
            <span className={`${stepClass} opacity-40`}>Back</span>
          )}
          {showApply ? (
            <ApplyTemplateButton templateId={id} templateLabel={meta.label} />
          ) : null}
          {nextId ? (
            <Link href={`${pathPrefix}/${nextId}`} className={stepClass}>
              Next
            </Link>
          ) : (
            <span className={`${stepClass} opacity-40`}>Next</span>
          )}
        </div>
      </div>

      <SiteTemplate content={content} pageId={pageId} basePath={basePath} />
    </SettingsFrame>
  );
}
