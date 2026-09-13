/**
 * Cloudflare for SaaS (Custom Hostnames) Client
 * 
 * Manages custom domains via Cloudflare's Custom Hostnames API.
 * Supports both www subdomains and apex domains.
 * 
 * Docs: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/
 */

/**
 * Check if Cloudflare is configured
 */
export function isCloudflareConfigured() {
  return Boolean(
    process.env.CLOUDFLARE_API_TOKEN &&
    process.env.CLOUDFLARE_ZONE_ID
  );
}

/**
 * Get Cloudflare configuration
 */
function getCloudflareConfig() {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const fallbackOrigin = process.env.CLOUDFLARE_SAAS_FALLBACK_ORIGIN || process.env.APP_HOSTNAME || "your-railway-app.up.railway.app";

  if (!apiToken || !zoneId) {
    throw new Error("Cloudflare not configured. Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID environment variables.");
  }

  return {
    apiToken,
    zoneId,
    fallbackOrigin,
    apiBase: "https://api.cloudflare.com/client/v4"
  };
}

/**
 * Make a request to Cloudflare API
 */
async function cloudflareRequest(endpoint, options = {}) {
  const config = getCloudflareConfig();
  const url = `${config.apiBase}${endpoint}`;
  
  const headers = {
    "Authorization": `Bearer ${config.apiToken}`,
    "Content-Type": "application/json",
    ...options.headers
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    const errors = data.errors || [];
    const errorMsg = errors.map(e => e.message).join(", ") || "Cloudflare API request failed";
    throw new Error(errorMsg);
  }

  return data.result;
}

/**
 * Determine if a domain is an apex domain
 */
export function isApexDomain(domain) {
  const parts = domain.split(".");
  return parts.length === 2; // e.g., example.com (not www.example.com or blog.example.com)
}

/**
 * Get www version of a domain
 */
export function getWwwDomain(domain) {
  if (domain.startsWith("www.")) {
    return domain;
  }
  return `www.${domain}`;
}

/**
 * Get apex version of a domain (remove www)
 */
export function getApexDomain(domain) {
  if (domain.startsWith("www.")) {
    return domain.substring(4);
  }
  return domain;
}

/**
 * Create a custom hostname in Cloudflare
 * 
 * @param {string} hostname - The domain to create (e.g., example.com or www.example.com)
 * @param {object} options - Additional options
 * @returns {Promise<object>} Custom hostname details
 */
export async function createCustomHostname(hostname, options = {}) {
  if (!isCloudflareConfigured()) {
    throw new Error("Cloudflare is not configured");
  }

  const config = getCloudflareConfig();
  
  const payload = {
    hostname,
    ssl: {
      method: "http",
      type: "dv",
      settings: {
        http2: "on",
        min_tls_version: "1.2",
        tls_1_3: "on"
      }
    },
    ...options
  };

  const result = await cloudflareRequest(
    `/zones/${config.zoneId}/custom_hostnames`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );

  return result;
}

/**
 * Get custom hostname details from Cloudflare
 */
export async function getCustomHostname(hostnameId) {
  if (!isCloudflareConfigured()) {
    throw new Error("Cloudflare is not configured");
  }

  const config = getCloudflareConfig();
  
  const result = await cloudflareRequest(
    `/zones/${config.zoneId}/custom_hostnames/${hostnameId}`
  );

  return result;
}

/**
 * Delete a custom hostname from Cloudflare
 */
export async function deleteCustomHostname(hostnameId) {
  if (!isCloudflareConfigured()) {
    throw new Error("Cloudflare is not configured");
  }

  const config = getCloudflareConfig();
  
  const result = await cloudflareRequest(
    `/zones/${config.zoneId}/custom_hostnames/${hostnameId}`,
    {
      method: "DELETE"
    }
  );

  return result;
}

/**
 * Map Cloudflare hostname status to our domain status
 */
export function mapCloudflareStatus(cfStatus) {
  const statusMap = {
    'pending': 'pending',
    'pending_validation': 'pending',
    'active': 'verified',
    'moved': 'failed',
    'deleted': 'failed',
    'blocked': 'failed'
  };
  
  return statusMap[cfStatus] || 'pending';
}

/**
 * Map Cloudflare SSL status to our SSL status
 */
export function mapCloudflareSslStatus(cfSslStatus) {
  const statusMap = {
    'pending_validation': 'pending',
    'active_validation': 'active',
    'initializing': 'pending',
    'active': 'active',
    'pending_issuance': 'pending',
    'pending_deployment': 'pending'
  };
  
  return statusMap[cfSslStatus] || 'pending';
}

/**
 * Extract DNS validation records from Cloudflare custom hostname response
 */
export function extractValidationRecords(cfHostname) {
  const records = [];
  
  if (!cfHostname || !cfHostname.ownership_verification) {
    return records;
  }

  const verification = cfHostname.ownership_verification;
  
  // HTTP verification (optional)
  if (verification.type === 'http' && verification.http_url && verification.http_body) {
    records.push({
      type: 'HTTP',
      name: verification.http_url,
      value: verification.http_body,
      description: 'HTTP verification file (optional - CNAME is preferred)'
    });
  }

  // TXT verification for ownership
  if (verification.type === 'txt' && verification.name && verification.value) {
    records.push({
      type: 'TXT',
      name: verification.name,
      value: verification.value,
      description: 'Ownership verification (required)'
    });
  }

  // CNAME pointing to fallback origin (required for routing)
  let config;
  try {
    config = getCloudflareConfig();
  } catch (err) {
    // Cloudflare not configured - return what we have so far
    return records;
  }
  const hostname = cfHostname.hostname;
  
  if (isApexDomain(hostname)) {
    // Apex domain - recommend CNAME flattening or A record
    records.push({
      type: 'CNAME',
      name: '@',
      value: config.fallbackOrigin,
      description: `Point apex to ${config.fallbackOrigin} (use CNAME flattening if your DNS supports it, or A record with the origin IP)`,
      note: 'Some DNS providers require A record for apex. Contact us if you need help.'
    });
  } else {
    // Subdomain - standard CNAME
    const subdomain = hostname.split('.')[0];
    records.push({
      type: 'CNAME',
      name: subdomain,
      value: config.fallbackOrigin,
      description: `Point ${hostname} to ${config.fallbackOrigin}`
    });
  }

  return records;
}

/**
 * Create custom hostnames for both www and apex (if applicable)
 * Returns array of created hostnames
 */
export async function createCustomHostnamesForDomain(domain) {
  const hostnames = [];
  
  // Always create the primary hostname (what user entered)
  const primary = await createCustomHostname(domain);
  hostnames.push({
    type: isApexDomain(domain) ? 'apex' : 'www',
    hostname: domain,
    id: primary.id,
    status: primary.status,
    sslStatus: primary.ssl?.status,
    validationRecords: extractValidationRecords(primary)
  });

  // If user entered apex, also create www
  if (isApexDomain(domain)) {
    try {
      const wwwDomain = getWwwDomain(domain);
      const www = await createCustomHostname(wwwDomain);
      hostnames.push({
        type: 'www',
        hostname: wwwDomain,
        id: www.id,
        status: www.status,
        sslStatus: www.ssl?.status,
        validationRecords: extractValidationRecords(www)
      });
    } catch (error) {
      console.warn(`Could not create www hostname for ${domain}:`, error.message);
      // Don't fail if www creation fails - apex is the primary
    }
  }

  return hostnames;
}

/**
 * Check status of multiple custom hostnames
 */
export async function checkCustomHostnamesStatus(hostnameIds) {
  if (!Array.isArray(hostnameIds) || hostnameIds.length === 0) {
    return [];
  }

  const results = await Promise.allSettled(
    hostnameIds.map(id => getCustomHostname(id))
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      const cfHostname = result.value;
      return {
        id: hostnameIds[index],
        hostname: cfHostname.hostname,
        status: cfHostname.status,
        sslStatus: cfHostname.ssl?.status,
        mappedStatus: mapCloudflareStatus(cfHostname.status),
        mappedSslStatus: mapCloudflareSslStatus(cfHostname.ssl?.status),
        validationRecords: extractValidationRecords(cfHostname),
        verified: cfHostname.status === 'active'
      };
    } else {
      return {
        id: hostnameIds[index],
        status: 'error',
        error: result.reason?.message || 'Failed to fetch status'
      };
    }
  });
}

/**
 * Get mock/dev mode verification (for local development without Cloudflare)
 */
export function getMockVerificationRecords(domain) {
  const isApex = isApexDomain(domain);
  const fallbackOrigin = process.env.APP_HOSTNAME || "your-app.railway.app";
  
  const records = [
    {
      type: 'TXT',
      name: isApex ? '@' : domain.split('.')[0],
      value: `_cf-custom-hostname=${Math.random().toString(36).substring(7)}`,
      description: 'Ownership verification (mock)'
    },
    {
      type: 'CNAME',
      name: isApex ? '@' : domain.split('.')[0],
      value: fallbackOrigin,
      description: `Point ${domain} to ${fallbackOrigin} (mock)`,
      note: isApex ? 'Apex domains may require A record instead of CNAME' : undefined
    }
  ];

  return records;
}
