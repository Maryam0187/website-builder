/**
 * Cloudflare Worker for Technonaire Website Builder
 * 
 * Proxies custom domain traffic to Railway origin while preserving
 * the original Host header via X-Forwarded-Host.
 * 
 * This solves the Railway 404 issue where Railway doesn't recognize
 * custom domains or *.technonairebuilder.com hosts.
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const hostname = url.hostname;
    
    // Railway origin - your builder app
    // This should match your Railway default URL or custom Railway domain
    const RAILWAY_ORIGIN = env.RAILWAY_ORIGIN || "website-builder-production-0175.up.railway.app";
    
    // Create new request to Railway origin
    const originUrl = new URL(url.pathname + url.search, `https://${RAILWAY_ORIGIN}`);
    
    // Clone headers and add X-Forwarded-Host with the original hostname
    const modifiedHeaders = new Headers(request.headers);
    modifiedHeaders.set("X-Forwarded-Host", hostname);
    modifiedHeaders.set("X-Forwarded-Proto", url.protocol.replace(":", ""));
    
    // Don't override Host header - let it go to Railway origin
    // Railway needs to see its own hostname in Host header to accept the request
    
    // Create new request
    const modifiedRequest = new Request(originUrl.toString(), {
      method: request.method,
      headers: modifiedHeaders,
      body: request.body,
      redirect: "manual",
    });
    
    // Fetch from Railway
    const response = await fetch(modifiedRequest);
    
    // Return response with CORS headers if needed
    const modifiedResponse = new Response(response.body, response);
    
    // Optional: Add security headers
    modifiedResponse.headers.set("X-Content-Type-Options", "nosniff");
    modifiedResponse.headers.set("X-Frame-Options", "SAMEORIGIN");
    modifiedResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    
    return modifiedResponse;
  },
};
