import { NextResponse } from "next/server";
import { subdomainFromHost, siteHostRoot } from "@/lib/site-host";

function firstHostname(value) {
  return String(value || "")
    .split(",")[0]
    .split(":")[0]
    .trim()
    .toLowerCase();
}

function forwardedHostname(request) {
  // X-TN-Forwarded-Host is set by the Cloudflare worker and is not replaced
  // by Railway. X-Forwarded-Host remains as a fallback.
  return (
    request.headers.get("x-tn-forwarded-host") ||
    request.headers.get("x-forwarded-host") ||
    ""
  );
}

function requestHostname(request) {
  const forwardedHost = forwardedHostname(request);
  if (forwardedHost) return firstHostname(forwardedHost);
  return firstHostname(request.headers.get("host") || "");
}

function appHostnames() {
  const hosts = new Set(["localhost", "127.0.0.1"]);
  const appHostname = (process.env.APP_HOSTNAME || "").split(":")[0].trim().toLowerCase();
  if (appHostname) hosts.add(appHostname);
  
  // Add Railway default hostname
  const railwayAppDomain = process.env.RAILWAY_PUBLIC_DOMAIN || process.env.RAILWAY_STATIC_URL;
  if (railwayAppDomain) {
    try {
      const host = railwayAppDomain.replace(/^https?:\/\//, "").split("/")[0].toLowerCase();
      if (host) hosts.add(host);
    } catch {}
  }
  
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
 * - *.SITE_HOST_ROOT → /live/[subdomain]/...
 * - custom domain → /site/custom-domain/[domain]/...
 */
export function proxy(request) {
  const host = forwardedHostname(request) || request.headers.get("host") || "";
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
