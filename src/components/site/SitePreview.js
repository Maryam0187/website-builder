import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSiteBySlug } from "@/lib/store-actions";
import { requireUser } from "@/lib/auth";
import { isOnePageLayout, resolvePageId } from "@/lib/site-defaults";
import SiteTemplate from "@/components/template/SiteTemplate";
import BrandLogo from "@/components/BrandLogo";

async function loadPreview(slug, pageParam) {
  const user = await requireUser(["admin", "owner"]);

  const next =
    pageParam && pageParam !== "home" ? `/site/${slug}/${pageParam}` : `/site/${slug}`;

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  if (user.mustChangePassword) {
    redirect(`/change-password?next=${encodeURIComponent(next)}`);
  }

  const site = await getSiteBySlug(slug);
  if (!site) notFound();

  if (user.role === "owner" && Number(site.id) !== Number(user.siteId)) {
    return { forbidden: true, user, site: null, pageId: "home" };
  }

  const pageId = resolvePageId(site.content, pageParam);
  if (isOnePageLayout(site.content) && pageParam && pageParam !== "home") {
    redirect(`/site/${slug}#${pageParam}`);
  }
  if (pageParam && pageParam !== "home" && pageId !== pageParam) {
    notFound();
  }

  return { forbidden: false, user, site, pageId };
}

function ForbiddenPreview() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#040b1a] px-6 text-center text-white">
      <BrandLogo href="/edit" />
      <h1 className="mt-8 font-[family-name:var(--font-display)] text-2xl font-semibold">
        Preview not available
      </h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-blue-100">
        You can only preview your own website. Open your editor or ask Technonaire if you need help.
      </p>
      <Link
        href="/edit"
        className="mt-6 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold"
      >
        Go to editor
      </Link>
    </div>
  );
}

export default async function SitePreview({ slug, pageParam = "home" }) {
  const result = await loadPreview(slug, pageParam);
  if (result.forbidden) return <ForbiddenPreview />;

  const { site, pageId } = result;
  return <SiteTemplate content={site.content} pageId={pageId} slug={site.slug} />;
}
