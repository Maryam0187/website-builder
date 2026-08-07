import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createDefaultSiteContent, resolvePageId } from "@/lib/site-defaults";
import { getTemplate, listTemplates, TEMPLATE_IDS } from "@/lib/templates";
import SiteTemplate from "@/components/template/SiteTemplate";

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
  other: "Neighborhood Co.",
};

export default async function AdminTemplatePreview({ templateId, pageParam = "home" }) {
  const user = await requireUser(["admin"]);
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        pageParam && pageParam !== "home"
          ? `/admin/templates/${templateId}/${pageParam}`
          : `/admin/templates/${templateId}`,
      )}`,
    );
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

  const basePath = `/admin/templates/${id}`;
  const templates = listTemplates();

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-40 border-b border-white/10 bg-[#040b1a]/95 text-white backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-cyan-200">Template preview</p>
            <p className="truncate font-semibold">{meta.label}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {templates.map((t) => (
              <Link
                key={t.id}
                href={`/admin/templates/${t.id}`}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  t.id === id
                    ? "bg-cyan-500 text-[#04101f]"
                    : "border border-white/15 text-blue-100 hover:bg-white/5"
                }`}
              >
                {t.label.split(" / ")[0]}
              </Link>
            ))}
            <Link
              href="/admin"
              className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/5"
            >
              ← Admin
            </Link>
          </div>
        </div>
      </div>

      <SiteTemplate content={content} pageId={pageId} basePath={basePath} />
    </div>
  );
}
