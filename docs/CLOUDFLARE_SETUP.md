# Cloudflare for SaaS Custom Domains Setup

This guide explains how to set up Cloudflare Custom Hostnames (Cloudflare for SaaS) to enable Domain plan customers to use their own domains with the Technonaire website builder.

## Overview

The Domain plan ($29/month first website, $24/month additional) allows customers to connect their own domain (e.g., `mybusiness.com`) to their website. This is implemented using Cloudflare's Custom Hostnames API, which handles:

- DNS verification
- SSL certificate provisioning and renewal (DV certificates via HTTP validation)
- Traffic routing via Cloudflare Worker proxy
- Both apex (`example.com`) and www (`www.example.com`) domains

## Pricing

**Good news:** Cloudflare Free plan works for this!

- **Free plan** includes first 100 Custom Hostnames at no cost
- After 100 hostnames: **$0.10/month per hostname** (very affordable)
- No Business or Enterprise plan required

## Architecture

```
Customer's Domain (mybusiness.com)
    ↓ (DNS points to customers.technonairebuilder.com)
Cloudflare Custom Hostname (SSL termination)
    ↓ (proxy to fallback origin)
Cloudflare Worker (adds X-Forwarded-Host header)
    ↓
Railway Application (reads X-Forwarded-Host, routes correctly)
```

## Required Environment Variables

Add these to your Railway environment (or `.env.local` for local development):

### Cloudflare API Credentials

```bash
# Required: Your Cloudflare API token with SSL and Certificates permissions
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token_here

# Required: The Zone ID of technonairebuilder.com
CLOUDFLARE_ZONE_ID=your_zone_id_here

# Required: The fallback origin hostname (proxies through Cloudflare Worker to Railway)
CLOUDFLARE_SAAS_FALLBACK_ORIGIN=fallback.technonairebuilder.com

# Required: CNAME target customers should point to (must resolve to Cloudflare)
CLOUDFLARE_CNAME_TARGET=customers.technonairebuilder.com
```

### Application Hostname

```bash
# Required: Your builder application's own hostname
# Railway default: website-builder-production-0175.up.railway.app
# Or custom: builder.technonaire.com
APP_HOSTNAME=builder.technonaire.com

# Required: Root domain for Technonaire subdomains (Starter/Custom plans)
SITE_HOST_ROOT=technonairebuilder.com
NEXT_PUBLIC_SITE_HOST_ROOT=technonairebuilder.com
```

## Cloudflare Setup Steps

### 1. DNS Records in technonairebuilder.com Zone

Add these DNS records (all **Proxied** 🟠):

| Type | Name | Target | Proxied |
|------|------|--------|---------|
| CNAME | `fallback` | `website-builder-production-0175.up.railway.app` | ✅ Yes |
| CNAME | `customers` | `fallback.technonairebuilder.com` | ✅ Yes |
| CNAME | `*` | `fallback.technonairebuilder.com` | ✅ Yes |

Replace `website-builder-production-0175.up.railway.app` with your actual Railway default URL.

### 2. Enable Cloudflare for SaaS

1. Log into your Cloudflare dashboard
2. Select the `technonairebuilder.com` zone
3. Go to **SSL/TLS** → **Custom Hostnames**
4. Click **Enable Cloudflare for SaaS** (if not already enabled)

### 3. Set Fallback Origin

In the Custom Hostnames section:

1. Click **Edit** next to Fallback Origin
2. Set to: `fallback.technonairebuilder.com`
3. Save

This routes all custom hostname traffic through your Worker.

### 4. Create a Cloudflare API Token

1. Go to **My Profile** → **API Tokens**
2. Click **Create Token**
3. Use the **Custom Token** template
4. Configure permissions:
   - **Zone** → **SSL and Certificates** → **Edit**
5. Set zone resources to: **Include** → **Specific zone** → `technonairebuilder.com`
6. Create the token and copy it to `CLOUDFLARE_API_TOKEN`

**Note:** You only need SSL and Certificates:Edit permission. The API documentation mentions Custom Hostnames permission but SSL and Certificates:Edit covers it.

### 5. Get Your Zone ID

1. Go to your Cloudflare zone overview for `technonairebuilder.com`
2. Scroll down to the **API** section on the right sidebar
3. Copy the **Zone ID** to `CLOUDFLARE_ZONE_ID`

### 6. Deploy Cloudflare Worker (IMPORTANT)

See `cloudflare/worker/README.md` for detailed instructions. Summary:

```bash
cd cloudflare/worker
# Edit wrangler.toml and set RAILWAY_ORIGIN to your Railway default URL
npx wrangler deploy
```

The Worker proxies requests to Railway with `X-Forwarded-Host` header so Railway knows the original hostname.

**Without this Worker, Railway will return 404 for custom domains.**

### 7. Railway Configuration

In your Railway project:

1. Add all environment variables listed above
2. Ensure your app accepts requests with `X-Forwarded-Host` header
3. Verify middleware routing logic reads `X-Forwarded-Host` first, then `Host`

## How It Works

### When a Customer Adds a Domain

1. **Domain Input**: Customer enters `mybusiness.com`
2. **Hostname Creation**: Backend calls `createCustomHostnamesForDomain()`
   - Creates Cloudflare Custom Hostname for `mybusiness.com`
   - Creates Cloudflare Custom Hostname for `www.mybusiness.com`
   - Uses SSL method `http` and type `dv` (Domain Validation)
   - Returns validation records
3. **Database Storage**: Stores Cloudflare hostname IDs, statuses, and validation records
4. **UI Display**: Shows DNS instructions with copy buttons

### DNS Instructions for Customers

Customers see these instructions:

**For apex domain:**
```
CNAME @ → customers.technonairebuilder.com
```
(Use CNAME flattening if supported, or ALIAS/ANAME record)

**For www subdomain:**
```
CNAME www → customers.technonairebuilder.com
```

**Note on apex domains:** Some DNS providers don't support CNAME for apex (root) domains. Recommend:
- Cloudflare (supports CNAME flattening automatically)
- Route 53 (use ALIAS record)
- DNSimple (use ALIAS record)
- For others: Customer may need to redirect apex → www at their registrar

### Verification Process

1. **Polling**: Backend calls `verifyDnsForDomain()` periodically
2. **Cloudflare Check**: Queries Cloudflare API for hostname status
3. **Status Mapping**:
   - `pending_validation` → "Waiting for DNS"
   - `active` → "Connected"
   - `moved`/`deleted`/`blocked` → "Needs attention"
4. **SSL Status**:
   - `pending_validation` → "Setting up security"
   - `active` → "Secure (SSL active)"
5. **Database Update**: Updates `domain_status`, `ssl_status`, and metadata

### Traffic Flow

Once verified:

1. Customer visits `mybusiness.com`
2. DNS resolves to `customers.technonairebuilder.com` (Cloudflare)
3. Cloudflare Custom Hostname matches the request
4. Cloudflare routes to fallback origin → Cloudflare Worker
5. Worker adds `X-Forwarded-Host: mybusiness.com` header
6. Worker proxies to Railway origin
7. Railway receives request with original hostname in `X-Forwarded-Host`
8. Next.js middleware reads `X-Forwarded-Host` and rewrites to `/site/custom-domain/mybusiness.com`
9. Dynamic route fetches site data and renders content

## Development Mode

For local development without Cloudflare credentials, set:

```bash
DOMAIN_VERIFY_MODE=mock
```

This enables a 30-second simulated verification with mock DNS records.

**⚠️ Important**: In production, omit `DOMAIN_VERIFY_MODE` or set it to `cloudflare`. The default is Cloudflare mode when credentials are present.

## Testing

Run the test suite:

```bash
npm test
```

This runs:
- **Cloudflare integration tests**: Domain utilities, status mapping, validation records, verification flow
- **UX tests**: Ensures the UI meets non-technical user requirements

The tests use mocked Cloudflare responses and don't require real credentials.

## Troubleshooting

### "Cloudflare not configured" Error

**Symptom**: Domain verification fails immediately with config error.

**Solution**: Verify all required env vars are set:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ZONE_ID`
- `CLOUDFLARE_SAAS_FALLBACK_ORIGIN`
- `CLOUDFLARE_CNAME_TARGET`

### Custom Hostnames Not Created

**Symptom**: API returns error when adding domain.

**Solutions**:
1. Check API token permissions (needs SSL and Certificates: Edit)
2. Verify zone has Cloudflare for SaaS enabled
3. Check zone ID is correct
4. Ensure API token isn't expired
5. Check rate limits (Cloudflare API has rate limits)

### DNS Records Not Verifying

**Symptom**: Domain stays in "pending" state after customer adds records.

**Solutions**:
1. Verify customer added CNAME to `customers.technonairebuilder.com` (NOT to Railway URL)
2. Wait 5-30 minutes for DNS propagation
3. Check Cloudflare dashboard for hostname status
4. Use `dig` or `nslookup` to verify DNS records propagate:
   ```bash
   dig mybusiness.com
   dig www.mybusiness.com
   ```

### SSL Certificate Not Provisioning

**Symptom**: Domain verifies but SSL stays pending.

**Solutions**:
1. Cloudflare auto-provisions DV SSL via HTTP validation - can take 5-15 minutes
2. Check Cloudflare dashboard Custom Hostnames section for SSL status
3. Ensure DNS points to `customers.technonairebuilder.com` (proxied through Cloudflare)
4. Verify HTTP validation is accessible (ssl.method = "http" in code)

### Railway Returns 404 for Custom Domains

**Symptom**: Domain is verified but visiting it returns 404 from Railway.

**Solution**: This means the Cloudflare Worker is not deployed or not configured correctly.

1. Deploy the Worker: `cd cloudflare/worker && npx wrangler deploy`
2. Verify fallback origin points to the Worker
3. Check Railway logs to see what Host header is received
4. Ensure middleware reads `X-Forwarded-Host` first

### Worker Not Proxying

**Symptom**: Worker deployed but still getting 404.

**Solutions**:
1. Check `RAILWAY_ORIGIN` in `wrangler.toml` matches Railway default URL
2. View Worker logs in Cloudflare dashboard
3. Test Worker directly at `https://<worker-name>.<subdomain>.workers.dev`
4. Ensure DNS `fallback` points to Worker URL

### Middleware Not Routing

**Symptom**: Request reaches Railway but renders wrong content.

**Solution**: Check middleware reads `X-Forwarded-Host`:

```javascript
// src/proxy.js should read X-Forwarded-Host first
const forwardedHost = request.headers.get("x-forwarded-host");
```

## Security Considerations

1. **API Token Rotation**: Rotate Cloudflare API tokens periodically
2. **Least Privilege**: Token should only have SSL and Certificates permissions
3. **Validation Records**: Never expose validation tokens in logs or client-side
4. **Rate Limiting**: Cloudflare API has rate limits - implement queuing for batch operations
5. **Worker Security**: Worker has access to all traffic - keep code minimal and audited

## Monitoring & Health Checks

### Check Domain Status

```javascript
// Backend: Check a single domain
import { verifyDnsForDomain } from '@/lib/site-address';
const result = await verifyDnsForDomain('mybusiness.com');
```

### Cloudflare API Status

```javascript
// Check if Cloudflare is configured
import { isCloudflareConfigured } from '@/lib/cloudflare-client';
if (!isCloudflareConfigured()) {
  console.warn('Cloudflare not configured - using mock mode');
}
```

## Summary of Railway Environment Variables

```bash
# App identification
APP_HOSTNAME=builder.technonaire.com
SITE_HOST_ROOT=technonairebuilder.com
NEXT_PUBLIC_SITE_HOST_ROOT=technonairebuilder.com

# Cloudflare for SaaS
CLOUDFLARE_API_TOKEN=your_token_here
CLOUDFLARE_ZONE_ID=your_zone_id_here
CLOUDFLARE_SAAS_FALLBACK_ORIGIN=fallback.technonairebuilder.com
CLOUDFLARE_CNAME_TARGET=customers.technonairebuilder.com
```

## Support & Resources

- [Cloudflare for SaaS Documentation](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/)
- [Custom Hostnames API Reference](https://developers.cloudflare.com/api/operations/custom-hostname-for-a-zone-create-custom-hostname)
- [SSL for SaaS](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/security/certificate-management/)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)

## Contact

For setup assistance or questions about the Domain plan implementation, contact the development team.
