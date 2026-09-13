import { NextResponse } from "next/server";
import { subdomainFromHost, siteHostRoot } from "@/lib/site-host";

/**
 * Rewrite customer hosts (*.technonaire.site) to /live/[subdomain]/...
 * Builder app host is left unchanged.
 */
export function proxy(request) {
  const host = request.headers.get("host") || "";
  const label = subdomainFromHost(host, siteHostRoot());
  if (!label) return NextResponse.next();

  const url = request.nextUrl.clone();
  const rest = url.pathname === "/" ? "" : url.pathname;
  url.pathname = `/live/${label}${rest}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    /*
     * Match all paths except Next internals and common static assets.
     * Host-based customer sites still need rewrites for page routes.
     */
    "/((?!_next/static|_next/image|favicon.ico|uploads/).*)",
  ],
};
