import { NextResponse } from "next/server";
import { subdomainFromHost, siteHostRoot } from "@/lib/site-host";

function requestHostname(request) {
  return (request.headers.get("host") || "").split(":")[0].trim().toLowerCase();
}

function appHostnames() {
  const hosts = new Set(["localhost", "127.0.0.1"]);
  const appHostname = (process.env.APP_HOSTNAME || "").split(":")[0].trim().toLowerCase();
  if (appHostname) hosts.add(appHostname);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  if (appUrl) {
    try {
      const host = new URL(appUrl).hostname.toLowerCase();
      if (host) hosts.add(host);
    } catch {
      // ignore invalid NEXT_PUBLIC_APP_URL
    }
  }
  return hosts;
}

/**
 * Rewrite customer hosts to in-app routes. Builder app host is unchanged.
 * - *.technonaire.site → /live/[subdomain]/...
 * - custom domain → /site/custom-domain/[domain]/...
 */
export function proxy(request) {
  const host = request.headers.get("host") || "";
  const hostname = requestHostname(request);
  const pathname = request.nextUrl.pathname;

  const label = subdomainFromHost(host, siteHostRoot());
  if (label) {
    const url = request.nextUrl.clone();
    url.pathname = `/live/${label}${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  if (appHostnames().has(hostname)) {
    return NextResponse.next();
  }

  const root = siteHostRoot();
  if (!hostname || !root || hostname === root || hostname.endsWith(`.${root}`)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/site/custom-domain/${hostname}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    /*
     * Match all paths except API, Next internals, and common static assets.
     * Host-based customer sites still need rewrites for page routes.
     */
    "/((?!api|_next/static|_next/image|_next/data|favicon.ico|uploads/).*)",
  ],
};
