import { query } from "@/lib/db";
import { isSiteLive } from "@/lib/store-actions";
import SiteTemplate from "@/components/template/SiteTemplate";
import { notFound } from "next/navigation";
import { normalizeSiteContent } from "@/lib/site-defaults";

async function getSiteByCustomDomain(domain) {
  const { rows } = await query(
    `SELECT * FROM sites WHERE lower(custom_domain) = lower($1) LIMIT 1`,
    [domain]
  );
  
  if (rows.length === 0) return null;
  
  const row = rows[0];
  const content = typeof row.content === "string" ? JSON.parse(row.content) : row.content || {};
  
  return {
    id: Number(row.id),
    slug: row.slug,
    subdomain: row.subdomain || null,
    customDomain: row.custom_domain || null,
    domainStatus: row.domain_status || "none",
    domainVerifiedAt: row.domain_verified_at || null,
    conversationId: row.conversation_id == null ? null : Number(row.conversation_id),
    ownerId: row.owner_id == null ? null : Number(row.owner_id),
    status: row.status,
    content: normalizeSiteContent(content),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export default async function CustomDomainSitePage({ params }) {
  const domain = params.domain;
  const pagePath = params.slug ? params.slug.join("/") : "";

  const site = await getSiteByCustomDomain(domain);

  if (!site) {
    notFound();
  }

  // Only show live sites with verified domains
  if (!isSiteLive(site) || site.domainStatus !== "verified") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {site.domainStatus === "pending" 
              ? "Domain Configuration In Progress" 
              : "Site Not Published"}
          </h1>
          <p className="mt-2 text-gray-600">
            {site.domainStatus === "pending"
              ? "This domain is being configured. DNS records may still be propagating."
              : "This website is not yet published. Check back later."}
          </p>
        </div>
      </div>
    );
  }

  return <SiteTemplate site={site} currentPage={pagePath || "home"} />;
}

export async function generateMetadata({ params }) {
  const domain = params.domain;
  const site = await getSiteByCustomDomain(domain);

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
