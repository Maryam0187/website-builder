import { query } from "./db";
import { normalizeSubdomain, isReservedSubdomain } from "./site-host";

/**
 * Check if a chosen Technonaire subdomain is available for reservation.
 * Returns { available: boolean, normalized: string|null, reason: string|null }
 */
export async function checkSubdomainAvailability(desiredSubdomain) {
  const normalized = normalizeSubdomain(desiredSubdomain);
  
  if (!normalized) {
    const raw = String(desiredSubdomain || "").trim();
    if (!raw) {
      return { available: false, normalized: null, reason: "Subdomain cannot be empty" };
    }
    if (raw.length < 3) {
      return { available: false, normalized: null, reason: "Subdomain must be at least 3 characters" };
    }
    if (raw.length > 63) {
      return { available: false, normalized: null, reason: "Subdomain must be at most 63 characters" };
    }
    if (raw.startsWith("-") || raw.endsWith("-")) {
      return { available: false, normalized: null, reason: "Subdomain cannot start or end with a hyphen" };
    }
    return { available: false, normalized: null, reason: "Subdomain can only contain letters, numbers, and hyphens" };
  }

  if (isReservedSubdomain(normalized)) {
    return { 
      available: false, 
      normalized, 
      reason: "This subdomain is reserved for system use" 
    };
  }

  // Check if already taken by another site
  const { rows } = await query(
    `SELECT id, owner_id FROM sites WHERE lower(subdomain) = lower($1) LIMIT 1`,
    [normalized]
  );

  if (rows.length > 0) {
    return { 
      available: false, 
      normalized, 
      reason: "This subdomain is already taken" 
    };
  }

  return { available: true, normalized, reason: null };
}

/**
 * Reserve/claim a chosen subdomain for a Custom plan site.
 * Requires the site owner to have an active Custom+ plan.
 */
export async function claimSubdomainForSite(siteId, desiredSubdomain, userId) {
  const availability = await checkSubdomainAvailability(desiredSubdomain);
  
  if (!availability.available) {
    throw new Error(availability.reason || "Subdomain not available");
  }

  const normalized = availability.normalized;

  // Double-check with a race-safe update
  const { rows, rowCount } = await query(
    `UPDATE sites
     SET subdomain = $2, updated_at = now()
     WHERE id = $1 
       AND owner_id = $3
       AND (subdomain IS NULL OR subdomain = $2)
     RETURNING *`,
    [siteId, normalized, userId]
  );

  if (rowCount === 0) {
    // Either site not found, wrong owner, or subdomain already set to something else
    const { rows: checkRows } = await query(
      `SELECT id, subdomain FROM sites WHERE lower(subdomain) = lower($1) AND id <> $2 LIMIT 1`,
      [normalized, siteId]
    );
    
    if (checkRows.length > 0) {
      throw new Error("This subdomain was just taken by another site");
    }
    throw new Error("Could not claim subdomain - site not found or already has a different address");
  }

  return { 
    subdomain: normalized,
    site: rows[0]
  };
}

/**
 * Change/update the chosen subdomain for a Custom plan site.
 * Only allowed if the site doesn't have a custom domain (Domain plan).
 */
export async function updateSubdomainForSite(siteId, newSubdomain, userId) {
  // Check if site has custom domain
  const { rows: siteRows } = await query(
    `SELECT id, subdomain, custom_domain FROM sites WHERE id = $1 AND owner_id = $2`,
    [siteId, userId]
  );

  if (siteRows.length === 0) {
    throw new Error("Site not found");
  }

  const site = siteRows[0];
  if (site.custom_domain) {
    throw new Error("Cannot change subdomain - this site uses a custom domain (Domain plan)");
  }

  return claimSubdomainForSite(siteId, newSubdomain, userId);
}

/**
 * Validate a custom domain format.
 * Returns { valid: boolean, normalized: string|null, reason: string|null }
 */
export function validateCustomDomain(domain) {
  const raw = String(domain || "").trim().toLowerCase();
  
  if (!raw) {
    return { valid: false, normalized: null, reason: "Domain cannot be empty" };
  }

  // Remove protocol if provided
  const withoutProtocol = raw.replace(/^https?:\/\//, "");
  
  // Remove trailing slash
  const cleaned = withoutProtocol.replace(/\/$/, "");
  
  // Basic domain validation
  const domainRegex = /^[a-z0-9]+([-.]?[a-z0-9]+)*\.[a-z]{2,}$/;
  if (!domainRegex.test(cleaned)) {
    return { 
      valid: false, 
      normalized: null, 
      reason: "Invalid domain format - use example.com or www.example.com" 
    };
  }

  // Don't allow technonaire.site subdomains as custom domains
  if (cleaned.endsWith(".technonaire.site")) {
    return { 
      valid: false, 
      normalized: null, 
      reason: "Use the Custom plan for Technonaire addresses" 
    };
  }

  // Length checks
  if (cleaned.length > 253) {
    return { valid: false, normalized: null, reason: "Domain name is too long" };
  }

  const parts = cleaned.split(".");
  if (parts.some(part => part.length > 63)) {
    return { valid: false, normalized: null, reason: "Domain label is too long" };
  }

  return { valid: true, normalized: cleaned, reason: null };
}

/**
 * Set a custom domain for a Domain plan site.
 * Validates format and checks if domain is already in use.
 */
export async function setCustomDomainForSite(siteId, domain, userId) {
  const validation = validateCustomDomain(domain);
  
  if (!validation.valid) {
    throw new Error(validation.reason || "Invalid domain");
  }

  const normalized = validation.normalized;

  // Check if domain is already in use by another site
  const { rows: existingRows } = await query(
    `SELECT id, owner_id FROM sites 
     WHERE lower(custom_domain) = lower($1) AND id <> $2 
     LIMIT 1`,
    [normalized, siteId]
  );

  if (existingRows.length > 0) {
    throw new Error("This domain is already connected to another website");
  }

  // Update the site with the custom domain
  const { rows, rowCount } = await query(
    `UPDATE sites
     SET custom_domain = $2, 
         domain_status = 'pending',
         updated_at = now()
     WHERE id = $1 AND owner_id = $3
     RETURNING *`,
    [siteId, normalized, userId]
  );

  if (rowCount === 0) {
    throw new Error("Site not found");
  }

  return {
    customDomain: normalized,
    domainStatus: 'pending',
    site: rows[0]
  };
}

/**
 * Get required DNS records for a custom domain.
 */
export function getRequiredDnsRecords(domain, appHostname = "builder.technonaire.com") {
  const isApex = !domain.includes("www.") && domain.split(".").length === 2;
  
  if (isApex) {
    // Apex domain - needs A record or ALIAS/ANAME
    return [
      {
        type: "A",
        name: "@",
        value: "Your hosting provider's IP",
        ttl: 3600,
        description: "Point apex domain to hosting (ask your host for the IP)"
      },
      {
        type: "CNAME",
        name: "www",
        value: domain,
        ttl: 3600,
        description: "Redirect www to apex domain"
      }
    ];
  }
  
  // Subdomain (including www) - CNAME is fine
  const subdomain = domain.split(".")[0];
  return [
    {
      type: "CNAME",
      name: subdomain,
      value: appHostname,
      ttl: 3600,
      description: `Point ${domain} to Technonaire hosting`
    }
  ];
}

/**
 * Verify DNS configuration for a custom domain.
 * In a production app, this would do actual DNS lookups.
 * For Phase 1, we simulate/stub the verification.
 */
export async function verifyDnsForDomain(domain) {
  const validation = validateCustomDomain(domain);
  if (!validation.valid) {
    return {
      verified: false,
      status: "invalid",
      message: validation.reason,
      records: []
    };
  }

  // TODO: In production, perform actual DNS lookups here using dns.promises.resolve()
  // For now, we'll use a simple time-based check to simulate DNS propagation
  
  // Get the site with this domain
  const { rows } = await query(
    `SELECT id, custom_domain, domain_verified_at, updated_at 
     FROM sites 
     WHERE lower(custom_domain) = lower($1)
     LIMIT 1`,
    [validation.normalized]
  );

  if (rows.length === 0) {
    return {
      verified: false,
      status: "not_configured",
      message: "Domain not found in system",
      records: []
    };
  }

  const site = rows[0];
  
  // If already verified, stay verified
  if (site.domain_verified_at) {
    return {
      verified: true,
      status: "verified",
      message: "DNS records verified successfully",
      verifiedAt: site.domain_verified_at,
      records: getRequiredDnsRecords(validation.normalized)
    };
  }

  // Simulate DNS propagation delay - in production, do actual DNS lookup
  // For sandbox/demo: auto-verify after 30 seconds
  const domainAge = Date.now() - new Date(site.updated_at).getTime();
  const autoVerifyDelay = 30000; // 30 seconds for demo

  if (domainAge > autoVerifyDelay) {
    // Mark as verified
    await query(
      `UPDATE sites 
       SET domain_status = 'verified', 
           domain_verified_at = now(),
           updated_at = now()
       WHERE id = $1`,
      [site.id]
    );

    return {
      verified: true,
      status: "verified",
      message: "DNS records verified successfully",
      verifiedAt: new Date().toISOString(),
      records: getRequiredDnsRecords(validation.normalized)
    };
  }

  return {
    verified: false,
    status: "pending",
    message: "Waiting for DNS records to propagate - this can take a few minutes",
    records: getRequiredDnsRecords(validation.normalized)
  };
}

/**
 * Mark a domain as connected/verified (for admin/manual verification).
 */
export async function markDomainVerified(siteId) {
  const { rows } = await query(
    `UPDATE sites
     SET domain_status = 'verified',
         domain_verified_at = COALESCE(domain_verified_at, now()),
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [siteId]
  );

  if (rows.length === 0) {
    throw new Error("Site not found");
  }

  return rows[0];
}

/**
 * Remove custom domain from a site.
 */
export async function removeCustomDomain(siteId, userId) {
  const { rows, rowCount } = await query(
    `UPDATE sites
     SET custom_domain = NULL,
         domain_status = 'none',
         domain_verified_at = NULL,
         updated_at = now()
     WHERE id = $1 AND owner_id = $2
     RETURNING *`,
    [siteId, userId]
  );

  if (rowCount === 0) {
    throw new Error("Site not found");
  }

  return rows[0];
}
