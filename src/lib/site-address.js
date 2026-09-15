import { query } from "./db";
import { normalizeSubdomain, isReservedSubdomain } from "./site-host";
import {
  isCloudflareConfigured,
  createCustomHostnamesForDomain,
  checkCustomHostnamesStatus,
  getMockVerificationRecords,
  mapCloudflareStatus,
  mapCloudflareSslStatus,
  isApexDomain
} from "./cloudflare-client";

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
 * Validates format, checks if domain is already in use, and creates Cloudflare custom hostnames.
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

  // Check verification mode
  const verifyMode = process.env.DOMAIN_VERIFY_MODE || (isCloudflareConfigured() ? 'cloudflare' : 'mock');
  
  let cfHostnameId = null;
  let cfHostnameStatus = null;
  let cfSslStatus = null;
  let cfValidationRecords = null;
  let cfMetadata = null;

  if (verifyMode === 'cloudflare' && isCloudflareConfigured()) {
    try {
      // Create custom hostnames via Cloudflare (may create both apex and www)
      const hostnames = await createCustomHostnamesForDomain(normalized);
      
      if (hostnames.length === 0) {
        throw new Error("Failed to create custom hostname in Cloudflare");
      }

      // Use the primary hostname (what user entered)
      const primary = hostnames[0];
      cfHostnameId = primary.id;
      cfHostnameStatus = primary.status;
      cfSslStatus = primary.sslStatus;
      cfValidationRecords = primary.validationRecords;
      
      // Store metadata about all created hostnames (including www if applicable)
      cfMetadata = {
        hostnames: hostnames.map(h => ({
          type: h.type,
          hostname: h.hostname,
          id: h.id
        })),
        createdAt: new Date().toISOString()
      };

    } catch (error) {
      console.error("Cloudflare custom hostname creation failed:", error);
      throw new Error(`Could not configure domain with Cloudflare: ${error.message}`);
    }
  } else {
    // Mock mode for local development
    cfValidationRecords = getMockVerificationRecords(normalized);
    cfHostnameStatus = 'pending_validation';
    cfSslStatus = 'pending_validation';
    cfMetadata = {
      mode: 'mock',
      note: 'Mock verification mode - set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID for production'
    };
  }

  // Update the site with the custom domain and Cloudflare data
  const { rows, rowCount } = await query(
    `UPDATE sites
     SET custom_domain = $2, 
         domain_status = 'pending',
         cf_hostname_id = $4,
         cf_hostname_status = $5,
         cf_ssl_status = $6,
         cf_validation_records = $7,
         cf_metadata = $8,
         updated_at = now()
     WHERE id = $1 AND owner_id = $3
     RETURNING *`,
    [
      siteId,
      normalized,
      userId,
      cfHostnameId,
      cfHostnameStatus,
      cfSslStatus,
      JSON.stringify(cfValidationRecords),
      JSON.stringify(cfMetadata)
    ]
  );

  if (rowCount === 0) {
    throw new Error("Site not found");
  }

  return {
    customDomain: normalized,
    domainStatus: 'pending',
    cfHostnameId,
    cfHostnameStatus,
    cfSslStatus,
    validationRecords: cfValidationRecords,
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
 * Verify DNS configuration for a custom domain via Cloudflare Custom Hostnames API.
 * Replaces the simulated 30s verification with real Cloudflare status checks.
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

  // Get the site with this domain
  const { rows } = await query(
    `SELECT id, custom_domain, domain_status, domain_verified_at, updated_at,
            cf_hostname_id, cf_hostname_status, cf_ssl_status, 
            cf_validation_records, cf_metadata
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
  const verifyMode = process.env.DOMAIN_VERIFY_MODE || (isCloudflareConfigured() ? 'cloudflare' : 'mock');

  // Parse stored validation records
  let validationRecords = [];
  try {
    validationRecords = site.cf_validation_records ? JSON.parse(site.cf_validation_records) : [];
  } catch (e) {
    console.warn("Failed to parse cf_validation_records:", e);
  }

  // If already verified and active, return success
  if (site.domain_verified_at && site.domain_status === 'verified') {
    return {
      verified: true,
      status: "verified",
      message: "Domain connected and SSL active",
      verifiedAt: site.domain_verified_at,
      sslStatus: site.cf_ssl_status || 'active',
      records: validationRecords
    };
  }

  // Cloudflare mode - check real status
  if (verifyMode === 'cloudflare' && isCloudflareConfigured() && site.cf_hostname_id) {
    try {
      // Get metadata to find all hostname IDs (including www)
      let metadata = {};
      try {
        metadata = site.cf_metadata ? JSON.parse(site.cf_metadata) : {};
      } catch (e) {
        console.warn("Failed to parse cf_metadata:", e);
      }

      const hostnameIds = metadata.hostnames 
        ? metadata.hostnames.map(h => h.id)
        : [site.cf_hostname_id];

      // Check status of all hostnames
      const statuses = await checkCustomHostnamesStatus(hostnameIds);
      
      // Primary hostname is the first one (what user entered)
      const primaryStatus = statuses[0];

      if (!primaryStatus || primaryStatus.status === 'error') {
        return {
          verified: false,
          status: "error",
          message: primaryStatus?.error || "Could not check domain status with Cloudflare",
          records: validationRecords
        };
      }

      // Update database with latest Cloudflare status
      const mappedStatus = mapCloudflareStatus(primaryStatus.status);
      const isVerified = primaryStatus.verified;

      await query(
        `UPDATE sites
         SET cf_hostname_status = $2,
             cf_ssl_status = $3,
             domain_status = $4,
             domain_verified_at = CASE WHEN $5 THEN COALESCE(domain_verified_at, now()) ELSE domain_verified_at END,
             cf_validation_records = $6,
             updated_at = now()
         WHERE id = $1`,
        [
          site.id,
          primaryStatus.status,
          primaryStatus.sslStatus,
          mappedStatus,
          isVerified,
          JSON.stringify(primaryStatus.validationRecords || validationRecords)
        ]
      );

      if (isVerified) {
        return {
          verified: true,
          status: "verified",
          message: "Domain connected and SSL active",
          verifiedAt: site.domain_verified_at || new Date().toISOString(),
          sslStatus: primaryStatus.sslStatus,
          cfStatus: primaryStatus.status,
          records: primaryStatus.validationRecords || validationRecords,
          allHostnames: statuses.map(s => ({
            hostname: s.hostname,
            status: s.status,
            sslStatus: s.sslStatus
          }))
        };
      }

      // Not verified yet - return pending with current status
      let message = "Waiting for DNS records to be configured";
      if (primaryStatus.status === 'pending_validation') {
        message = "Waiting for DNS records to propagate - this can take a few minutes";
      } else if (primaryStatus.status === 'active') {
        message = "Domain routing active - waiting for SSL certificate";
      }

      return {
        verified: false,
        status: mappedStatus,
        message,
        cfStatus: primaryStatus.status,
        sslStatus: primaryStatus.sslStatus,
        records: primaryStatus.validationRecords || validationRecords,
        allHostnames: statuses.map(s => ({
          hostname: s.hostname,
          status: s.status,
          sslStatus: s.sslStatus
        }))
      };

    } catch (error) {
      console.error("Cloudflare verification check failed:", error);
      return {
        verified: false,
        status: "error",
        message: `Verification check failed: ${error.message}`,
        records: validationRecords
      };
    }
  }

  // Mock mode - simulate verification after 30 seconds (for local dev)
  if (verifyMode === 'mock') {
    const domainAge = Date.now() - new Date(site.updated_at).getTime();
    const autoVerifyDelay = 30000; // 30 seconds for mock

    if (domainAge > autoVerifyDelay) {
      await query(
        `UPDATE sites 
         SET domain_status = 'verified', 
             domain_verified_at = now(),
             cf_hostname_status = 'active',
             cf_ssl_status = 'active',
             updated_at = now()
         WHERE id = $1`,
        [site.id]
      );

      return {
        verified: true,
        status: "verified",
        message: "Domain connected (mock mode)",
        verifiedAt: new Date().toISOString(),
        sslStatus: 'active',
        mode: 'mock',
        records: validationRecords
      };
    }

    return {
      verified: false,
      status: "pending",
      message: "Mock verification - waiting 30 seconds (set CLOUDFLARE_API_TOKEN for production)",
      mode: 'mock',
      records: validationRecords
    };
  }

  // No Cloudflare configured and not in mock mode
  return {
    verified: false,
    status: "not_configured",
    message: "Domain verification not configured. Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID.",
    records: validationRecords
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
 * Remove custom domain from a site and clean up Cloudflare hostnames.
 */
export async function removeCustomDomain(siteId, userId) {
  // Get the site first to retrieve Cloudflare hostname IDs
  const { rows: siteRows } = await query(
    `SELECT id, cf_hostname_id, cf_metadata FROM sites WHERE id = $1 AND owner_id = $2`,
    [siteId, userId]
  );

  if (siteRows.length === 0) {
    throw new Error("Site not found");
  }

  const site = siteRows[0];

  // Delete Cloudflare hostnames if configured
  if (isCloudflareConfigured() && site.cf_metadata) {
    try {
      const metadata = JSON.parse(site.cf_metadata);
      if (metadata.hostnames && Array.isArray(metadata.hostnames)) {
        // Delete all hostnames (apex and www if both exist)
        const deleteCustomHostname = (await import("./cloudflare-client.js")).deleteCustomHostname;
        await Promise.allSettled(
          metadata.hostnames.map(h => deleteCustomHostname(h.id))
        );
      } else if (site.cf_hostname_id) {
        // Fallback - delete primary hostname only
        const deleteCustomHostname = (await import("./cloudflare-client.js")).deleteCustomHostname;
        await deleteCustomHostname(site.cf_hostname_id);
      }
    } catch (error) {
      console.warn("Failed to delete Cloudflare hostnames:", error);
      // Continue with database cleanup even if Cloudflare delete fails
    }
  }

  // Clear domain from database
  const { rows, rowCount } = await query(
    `UPDATE sites
     SET custom_domain = NULL,
         domain_status = 'none',
         domain_verified_at = NULL,
         cf_hostname_id = NULL,
         cf_hostname_status = NULL,
         cf_ssl_status = NULL,
         cf_validation_records = NULL,
         cf_metadata = NULL,
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
