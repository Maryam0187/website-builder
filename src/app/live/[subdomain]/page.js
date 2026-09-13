import LiveSiteView from "@/components/site/LiveSiteView";

export const dynamic = "force-dynamic";

export default async function LiveHomePage({ params }) {
  const { subdomain } = await params;
  return <LiveSiteView subdomain={subdomain} pageParam="home" />;
}
