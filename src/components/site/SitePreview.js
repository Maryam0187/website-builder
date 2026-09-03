import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  getSiteBySlug,
  isSiteLive,
  ownerOwnsSite,
} from "@/lib/store-actions";
import { getCurrentUser, getUserById } from "@/lib/auth";
import { planFeatures } from "@/lib/billing";
import { isOnePageLayout, resolvePageId } from "@/lib/site-defaults";
import SiteTemplate from "@/components/template/SiteTemplate";
import BrandLogo from "@/components/BrandLogo";

async function ownerCanHostLive(ownerId) {
  if (!ownerId) return false;
  const owner = await getUserById(ownerId);
  if (!owner) return false;
  if (owner.role === "admin") return true;
  return Boolean(planFeatures(owner).live);
}

async function loadPreview(slug, pageParam) {
  const next =
    pageParam && pageParam !== "home" ? `/site/${slug}/${pageParam}` : `/site/${slug}`;

  const site = await getSiteBySlug(slug);
  if (!site) notFound();

  const user = await getCurrentUser();

  // Owner/admin of this site: always preview (draft or live)
  if (user && (user.role === "admin" || ownerOwnsSite(user, site))) {
    if (user.mustChangePassword) {
      redirect(`/change-password?next=${encodeURIComponent(next)}`);
    }
    const pageId = resolvePageId(site.content, pageParam);
    if (isOnePageLayout(site.content) && pageParam && pageParam !== "home") {
      redirect(`/site/${slug}#${pageParam}`);
    }
    if (pageParam && pageParam !== "home" && pageId !== pageParam) {
      notFound();
    }
    return { forbidden: false, offline: false, user, site, pageId, publicView: false };
  }

  // Public / other users: only live sites with an active live plan on the owner
  const liveOk = isSiteLive(site) && (await ownerCanHostLive(site.ownerId));
  if (!liveOk) {
    if (!user) {
      redirect(`/login?next=${encodeURIComponent(next)}`);
    }
    return { forbidden: true, offline: false, user, site: null, pageId: "home" };
  }

  const pageId = resolvePageId(site.content, pageParam);
  if (isOnePageLayout(site.content) && pageParam && pageParam !== "home") {
    redirect(`/site/${slug}#${pageParam}`);
  }
  if (pageParam && pageParam !== "home" && pageId !== pageParam) {
    notFound();
  }

  return { forbidden: false, offline: false, user, site, pageId, publicView: true };
}

function ForbiddenPreview() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#040b1a] px-6 text-center text-white">
      <BrandLogo href="/edit" />
      <h1 className="mt-8 font-[family-name:var(--font-display)] text-2xl font-semibold">
        Preview not available
      </h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-blue-100">
        You can only preview your own website, or public live sites. Open your editor or ask
        Technonaire if you need help.
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
