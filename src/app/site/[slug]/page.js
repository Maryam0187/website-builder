import SitePreview from "@/components/site/SitePreview";

export const dynamic = "force-dynamic";

export default async function SiteHomePreviewPage({ params }) {
  const { slug } = await params;
  return <SitePreview slug={slug} pageParam="home" />;
}
