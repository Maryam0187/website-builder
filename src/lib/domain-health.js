/**
 * Domain Health Monitoring
 * 
 * Background jobs and health checks for custom domains.
 * In production, these would run as scheduled tasks (cron jobs).
 */

import { query } from "./db";
import { verifyDnsForDomain } from "./site-address";
import { provisionSslForDomain, checkSslStatus } from "./ssl-manager";

/**
 * Check health of all pending/verified custom domains.
 * Call this from a scheduled job (e.g., every 5-15 minutes).
 */
export async function checkAllDomainHealth() {
  const { rows } = await query(
    `SELECT id, custom_domain, domain_status, domain_verified_at, updated_at
     FROM sites
     WHERE custom_domain IS NOT NULL
       AND domain_status IN ('pending', 'verified')
     ORDER BY updated_at ASC
     LIMIT 100`
  );

  const results = {
    checked: 0,
    verified: 0,
    pending: 0,
    errors: 0,
    details: []
  };

  for (const site of rows) {
    try {
      results.checked++;
      
      if (site.domain_status === "pending") {
        // Try to verify pending domains
        const verification = await verifyDnsForDomain(site.custom_domain);
        
        if (verification.verified) {
          results.verified++;
          results.details.push({
            siteId: site.id,
            domain: site.custom_domain,
            status: "newly_verified",
            message: "DNS verified and SSL provisioned"
          });
        } else {
          results.pending++;
          results.details.push({
            siteId: site.id,
            domain: site.custom_domain,
            status: "still_pending",
            message: verification.message
          });
        }
      } else if (site.domain_status === "verified") {
        // Check SSL status for verified domains
        const sslStatus = await checkSslStatus(site.custom_domain);
        
        if (sslStatus.status === "active") {
          results.details.push({
            siteId: site.id,
            domain: site.custom_domain,
            status: "healthy",
            ssl: "active",
            expiresAt: sslStatus.expiresAt
          });
        } else {
          // SSL is missing or expired - try to provision
          await provisionSslForDomain(site.custom_domain, site.id);
          results.details.push({
            siteId: site.id,
            domain: site.custom_domain,
            status: "ssl_reprovisioned",
            message: "SSL certificate was reprovisioned"
          });
        }
      }
    } catch (error) {
      results.errors++;
      results.details.push({
        siteId: site.id,
        domain: site.custom_domain,
        status: "error",
        error: error.message
      });
      console.error(`Domain health check failed for ${site.custom_domain}:`, error);
    }
  }

  return results;
}

/**
 * Check health of a specific domain.
 * Returns detailed status including DNS and SSL.
 */
export async function checkDomainHealth(domain) {
  const { rows } = await query(
    `SELECT id, custom_domain, domain_status, domain_verified_at, updated_at, status
     FROM sites
     WHERE lower(custom_domain) = lower($1)
     LIMIT 1`,
    [domain]
  );

  if (rows.length === 0) {
    return {
      found: false,
      domain,
      message: "Domain not found in system"
    };
  }

  const site = rows[0];
  const health = {
    found: true,
    siteId: site.id,
    domain: site.custom_domain,
    domainStatus: site.domain_status,
    siteStatus: site.status,
    verifiedAt: site.domain_verified_at,
    checks: {
      dns: { status: "unknown" },
      ssl: { status: "unknown" }
    }
  };

  // Check DNS
  try {
    const dnsCheck = await verifyDnsForDomain(domain);
    health.checks.dns = {
      status: dnsCheck.verified ? "verified" : "pending",
      message: dnsCheck.message,
      verifiedAt: dnsCheck.verifiedAt
    };
  } catch (error) {
    health.checks.dns = {
      status: "error",
      error: error.message
    };
  }

  // Check SSL
  try {
    const sslCheck = await checkSslStatus(domain);
    health.checks.ssl = {
      status: sslCheck.status,
      message: sslCheck.message,
      expiresAt: sslCheck.expiresAt
    };
  } catch (error) {
    health.checks.ssl = {
      status: "error",
      error: error.message
    };
  }

  return health;
}

/**
 * Mark a domain as failed if verification never succeeds.
 * Call this for domains that have been pending for too long (e.g., > 7 days).
 */
export async function markStaleDomainsAsFailed() {
  const staleDays = 7;
  const { rows } = await query(
    `UPDATE sites
     SET domain_status = 'failed',
         updated_at = now()
     WHERE domain_status = 'pending'
       AND custom_domain IS NOT NULL
       AND updated_at < now() - interval '${staleDays} days'
     RETURNING id, custom_domain`,
  );

  return {
    marked: rows.length,
    domains: rows.map(r => ({ siteId: r.id, domain: r.custom_domain }))
  };
}
