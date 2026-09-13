import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSiteBySubdomain, isSiteLive } from "@/lib/store-actions";
import { getUserById } from "@/lib/auth";
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

function OfflineSite() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#040b1a] px-6 text-center text-white">
      <BrandLogo href="/" />
      <h1 className="mt-8 font-[family-name:var(--font-display)] text-2xl font-semibold">
        Website offline
      </h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-blue-100">
        This Technonaire site is not live right now. Check back later or contact the site owner.
      </p>
      <Link
        href="https://technonaire.com"
        className="mt-6 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold"
      >
        Technonaire
      </Link>
    </div>
  );
}

export default async function LiveSiteView({ subdomain, pageParam = "home" }) {
  const site = await getSiteBySubdomain(subdomain);
  if (!site) notFound();

  const liveOk = isSiteLive(site) && (await ownerCanHostLive(site.ownerId));
  if (!liveOk) return <OfflineSite />;

  const pageId = resolvePageId(site.content, pageParam);
  if (isOnePageLayout(site.content) && pageParam && pageParam !== "home") {
    redirect(`/#${pageParam}`);
  }
  if (pageParam && pageParam !== "home" && pageId !== pageParam) {
    notFound();
  }

  return (
    <SiteTemplate content={site.content} pageId={pageId} slug={site.slug} basePath="" />
  );
}
