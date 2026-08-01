import SitePreview from "@/components/site/SitePreview";

export const dynamic = "force-dynamic";

export default async function SitePagePreview({ params }) {
  const { slug, page } = await params;
  return <SitePreview slug={slug} pageParam={page} />;
}
