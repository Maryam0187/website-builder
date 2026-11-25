/**
 * Cloudflare Worker for Technonaire Website Builder
 *
 * Proxies customer hosts to the Railway app. Railway only accepts its own
 * hostname and replaces X-Forwarded-Host, so the visitor host is encoded in
 * the path the app already serves:
 *   {label}.technonairebuilder.com/about -> /live/{label}/about
 *   mybusiness.com/about -> /site/custom-domain/mybusiness.com/about
 */

const SITE_ROOT = "technonairebuilder.com";

const RESERVED_SUBDOMAINS = new Set([
  "www",
  "app",
  "builder",
  "api",
  "admin",
  "mail",
  "static",
  "cdn",
  "edit",
  "login",
  "profile",
  "invoice",
  "site",
  "live",
  "uploads",
  "support",
  "help",
  "status",
  "docs",
  "fallback",
  "customers",
]);

function subdomainLabel(hostname) {
  const host = String(hostname || "").toLowerCase();
  if (!host.endsWith(`.${SITE_ROOT}`)) return null;
  const label = host.slice(0, -(SITE_ROOT.length + 1));
  if (!label || label.includes(".")) return null;
  if (label.length < 3 || label.length > 63) return null;
  if (label.startsWith("-") || label.endsWith("-")) return null;
  if (!/^[a-z0-9-]+$/.test(label)) return null;
  if (RESERVED_SUBDOMAINS.has(label)) return null;
  return label;
}

function isPassthroughPath(pathname) {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/uploads/") ||
    pathname === "/favicon.ico"
  );
}

function originPath(hostname, pathname, search) {
  if (isPassthroughPath(pathname)) return `${pathname}${search}`;

  const suffix = pathname === "/" ? "" : pathname;
  const label = subdomainLabel(hostname);
  if (label) {
    if (pathname === `/live/${label}` || pathname.startsWith(`/live/${label}/`)) {
      return `${pathname}${search}`;
    }
    return `/live/${label}${suffix}${search}`;
  }

  const host = String(hostname || "").toLowerCase();
  if (host && host !== SITE_ROOT && !host.endsWith(`.${SITE_ROOT}`)) {
    if (pathname === `/site/custom-domain/${host}` || pathname.startsWith(`/site/custom-domain/${host}/`)) {
      return `${pathname}${search}`;
    }
    return `/site/custom-domain/${host}${suffix}${search}`;
  }

  return `${pathname}${search}`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const hostname = url.hostname;
    // builder.technonaire.com is the hostname Railway and the app both accept.
    // The *.up.railway.app host is rewritten to a custom-domain lookup, which 404s.
    const originHost = env.RAILWAY_ORIGIN || "builder.technonaire.com";
    const originUrl = new URL(originPath(hostname, url.pathname, url.search), `https://${originHost}`);

    const modifiedHeaders = new Headers(request.headers);
    modifiedHeaders.delete("host");
    // Drop forwarded-host so the app serves the rewritten path as-is.
    modifiedHeaders.delete("x-forwarded-host");
    modifiedHeaders.delete("x-tn-forwarded-host");
    modifiedHeaders.set("X-Forwarded-Proto", url.protocol.replace(":", ""));

    const method = request.method.toUpperCase();
    const modifiedRequest = new Request(originUrl.toString(), {
      method: request.method,
      headers: modifiedHeaders,
      body: method === "GET" || method === "HEAD" ? undefined : request.body,
      redirect: "manual",
    });

    const response = await fetch(modifiedRequest);
    const modifiedResponse = new Response(response.body, response);
    modifiedResponse.headers.set("X-Content-Type-Options", "nosniff");
    modifiedResponse.headers.set("X-Frame-Options", "SAMEORIGIN");
    modifiedResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    return modifiedResponse;
  },
};
