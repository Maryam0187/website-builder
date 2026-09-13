const DEFAULT_HOST_ROOT = "technonaire.site";

export const RESERVED_SUBDOMAINS = new Set([
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
]);

export function siteHostRoot() {
  return (
    process.env.SITE_HOST_ROOT ||
    process.env.NEXT_PUBLIC_SITE_HOST_ROOT ||
    DEFAULT_HOST_ROOT
  )
    .trim()
    .toLowerCase()
    .replace(/^\.+|\.+$/g, "");
}

export function publicSiteHostRoot() {
  return (
    process.env.NEXT_PUBLIC_SITE_HOST_ROOT ||
    process.env.SITE_HOST_ROOT ||
    DEFAULT_HOST_ROOT
  )
    .trim()
    .toLowerCase()
    .replace(/^\.+|\.+$/g, "");
}

export function normalizeSubdomain(value) {
  const label = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
  if (!label || label.length < 3 || label.length > 63) return null;
  if (label.startsWith("-") || label.endsWith("-")) return null;
  if (RESERVED_SUBDOMAINS.has(label)) return null;
  return label;
}

export function isReservedSubdomain(label) {
  return RESERVED_SUBDOMAINS.has(String(label || "").trim().toLowerCase());
}

export function publicHostForSubdomain(subdomain, root = publicSiteHostRoot()) {
  const label = normalizeSubdomain(subdomain);
  if (!label || !root) return null;
  return `${label}.${root}`;
}

export function publicUrlForSubdomain(subdomain, { path = "", root = publicSiteHostRoot() } = {}) {
  const host = publicHostForSubdomain(subdomain, root);
  if (!host) return null;
  const suffix = path && path !== "/" ? (path.startsWith("/") ? path : `/${path}`) : "";
  return `https://${host}${suffix}`;
}

/**
 * Parse customer-site subdomain from a Host header.
 * Returns null for apex, www, or non-matching hosts.
 */
export function subdomainFromHost(hostHeader, root = siteHostRoot()) {
  const host = String(hostHeader || "")
    .split(":")[0]
    .trim()
    .toLowerCase();
  if (!host || !root) return null;
  if (host === root || host === `www.${root}`) return null;
  if (!host.endsWith(`.${root}`)) return null;
  const label = host.slice(0, -(root.length + 1));
  if (!label || label.includes(".")) return null;
  return normalizeSubdomain(label);
}
