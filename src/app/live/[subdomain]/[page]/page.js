import LiveSiteView from "@/components/site/LiveSiteView";

export const dynamic = "force-dynamic";

export default async function LivePageRoute({ params }) {
  const { subdomain, page } = await params;
  return <LiveSiteView subdomain={subdomain} pageParam={page || "home"} />;
}
