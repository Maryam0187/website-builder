import { NextResponse } from "next/server";

/**
 * Middleware to handle custom domain and subdomain routing.
 * 
 * Routes:
 * 1. Custom domain (Domain plan) → fetch site by custom_domain
 * 2. Technonaire subdomain (Starter/Custom plan) → fetch site by subdomain
 * 3. App routes (builder) → pass through normally
 */
export async function middleware(request) {
  const { pathname, host } = new URL(request.url);
  
  // Skip middleware for:
  // - API routes
  // - Static files (_next/static)
  // - Image optimization (_next/image)
  // - Favicon
  // - Uploads
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/uploads/") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const hostname = host.split(":")[0];
  const siteHostRoot = process.env.SITE_HOST_ROOT || process.env.NEXT_PUBLIC_SITE_HOST_ROOT || "technonaire.site";
  const appHostname = process.env.APP_HOSTNAME || "localhost";

  // Check if this is the builder app itself (not a customer site)
  if (hostname === appHostname || hostname === "localhost" || hostname.startsWith("localhost:")) {
    return NextResponse.next();
  }

  // Check if this is a Technonaire subdomain
  if (hostname.endsWith(`.${siteHostRoot}`)) {
    const subdomain = hostname.slice(0, -(siteHostRoot.length + 1));
    
    // Skip if this is the builder subdomain itself
    if (subdomain === "builder" || subdomain === "app" || subdomain === "www") {
      return NextResponse.next();
    }

    // Rewrite to /site/[slug] route with subdomain parameter
    const url = request.nextUrl.clone();
    url.pathname = `/site/subdomain/${subdomain}${pathname}`;
    return NextResponse.rewrite(url);
  }

  // Check if this is a custom domain (Domain plan)
  // We'll rewrite to a special route that fetches by custom_domain
  // Only do this if the hostname doesn't match the app hostname
  if (hostname !== appHostname && !hostname.endsWith(`.${siteHostRoot}`)) {
    const url = request.nextUrl.clone();
    url.pathname = `/site/custom-domain/${hostname}${pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - API routes (/api/*)
     * - Static files (/_next/static, /_next/image, /favicon.ico)
     * - Uploads (/uploads/*)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|uploads).*)",
  ],
};
