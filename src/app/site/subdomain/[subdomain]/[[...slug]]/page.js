import { getSiteBySubdomain, isSiteLive } from "@/lib/store-actions";
import SiteTemplate from "@/components/template/SiteTemplate";
import { notFound } from "next/navigation";

export default async function SubdomainSitePage({ params }) {
  const subdomain = params.subdomain;
  const pagePath = params.slug ? params.slug.join("/") : "";

  const site = await getSiteBySubdomain(subdomain);

  if (!site) {
    notFound();
  }

  // Only show live sites on public subdomains
  if (!isSiteLive(site)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-900">Site Not Published</h1>
          <p className="mt-2 text-gray-600">
            This website is not yet published. Check back later.
          </p>
        </div>
      </div>
    );
  }

  return <SiteTemplate site={site} currentPage={pagePath || "home"} />;
}

export async function generateMetadata({ params }) {
  const subdomain = params.subdomain;
  const site = await getSiteBySubdomain(subdomain);

  if (!site) {
    return {
      title: "Site Not Found",
    };
  }

  const brandName = site.content?.brand?.name || site.slug;
  const description = site.content?.brand?.tagline || `Welcome to ${brandName}`;

  return {
    title: brandName,
    description,
  };
}
