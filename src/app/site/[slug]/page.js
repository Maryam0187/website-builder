import SitePreview from "@/components/site/SitePreview";

export default async function SiteHomePreviewPage({ params }) {
  const { slug } = await params;
  return <SitePreview slug={slug} pageParam="home" />;
}
