# Cloudflare for SaaS Custom Domains Setup

This guide explains how to set up Cloudflare Custom Hostnames (Cloudflare for SaaS) to enable Domain plan customers to use their own domains with the Technonaire website builder.

## Overview

The Domain plan ($29/month first website, $24/month additional) allows customers to connect their own domain (e.g., `mybusiness.com`) to their website. This is implemented using Cloudflare's Custom Hostnames API, which handles:

- DNS verification
- SSL certificate provisioning and renewal
- Traffic routing to your Railway-hosted application
- Both apex (`example.com`) and www (`www.example.com`) domains

## Architecture

```
Customer's Domain (mybusiness.com)
    ↓ (DNS points to Cloudflare)
Cloudflare Custom Hostname
    ↓ (proxy & SSL)
Cloudflare Fallback Origin
    ↓
Railway Application
```

## Required Environment Variables

Add these to your Railway environment (or `.env.local` for local development):

### Cloudflare API Credentials

```bash
# Required: Your Cloudflare API token with Custom Hostnames permissions
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token_here

# Required: The Zone ID of your Cloudflare zone that acts as the SaaS fallback
CLOUDFLARE_ZONE_ID=your_zone_id_here

# Optional: Account ID (required for some operations)
CLOUDFLARE_ACCOUNT_ID=your_account_id_here

# Required: The fallback origin hostname (your Railway app domain)
# Example: technonaire-website-builder.railway.app
CLOUDFLARE_SAAS_FALLBACK_ORIGIN=your-railway-app.railway.app
```

### Application Hostname

```bash
# Required: Your builder application's own hostname
# This prevents middleware from intercepting requests meant for the builder UI
# Example: builder.technonaire.com or your-app.railway.app
APP_HOSTNAME=builder.technonaire.com

# Required: Root domain for Technonaire subdomains
# Example: technonaire.site
SITE_HOST_ROOT=technonaire.site
```

## Cloudflare Setup Steps

### 1. Enable Cloudflare for SaaS

1. Log into your Cloudflare dashboard
2. Navigate to your zone (the domain that will act as the fallback origin)
3. Go to **SSL/TLS** → **Custom Hostnames**
4. Click **Enable Cloudflare for SaaS**

### 2. Create a Cloudflare API Token

1. Go to **My Profile** → **API Tokens**
2. Click **Create Token**
3. Use the **Custom Token** template
4. Configure permissions:
   - **Zone** → **SSL and Certificates** → **Edit**
   - **Zone** → **Custom Hostnames** → **Edit**
5. Set zone resources to include your SaaS zone
6. Create the token and copy it to `CLOUDFLARE_API_TOKEN`

### 3. Get Your Zone ID

1. Go to your Cloudflare zone overview
2. Scroll down to the **API** section on the right sidebar
3. Copy the **Zone ID** to `CLOUDFLARE_ZONE_ID`

### 4. Configure Fallback Origin

1. Set `CLOUDFLARE_SAAS_FALLBACK_ORIGIN` to your Railway application domain
2. Ensure this domain is pointed to Railway via DNS
3. Make sure your Railway app accepts requests from any hostname (no HOST header restrictions)

### 5. Railway Configuration

In your Railway project:

1. Add all environment variables listed above
2. Ensure your app domain is accessible via HTTPS
3. Verify the app can handle requests from custom domains
4. Test the middleware routing logic

## How It Works

### When a Customer Adds a Domain

1. **Domain Input**: Customer enters `mybusiness.com`
2. **Hostname Creation**: Backend calls `createCustomHostnamesForDomain()`
   - Creates Cloudflare Custom Hostname for `mybusiness.com`
   - Creates Cloudflare Custom Hostname for `www.mybusiness.com`
   - Returns validation records (TXT + CNAME)
3. **Database Storage**: Stores Cloudflare hostname IDs, statuses, and validation records
4. **UI Display**: Shows DNS records with copy buttons

### Customer Adds DNS Records

Customer goes to their domain registrar (GoDaddy, Namecheap, etc.) and adds:

**TXT Record** (for verification):
- Name: `_cf-custom-hostname.mybusiness.com`
- Value: `<random-verification-token>`

**CNAME Records** (for routing):
- Name: `@` (apex) → Value: `your-railway-app.railway.app`
- Name: `www` → Value: `your-railway-app.railway.app`

### Verification Process

1. **Polling**: Backend calls `verifyDnsForDomain()` periodically
2. **Cloudflare Check**: Queries Cloudflare API for hostname status
3. **Status Mapping**:
   - `pending` → "Waiting for DNS"
   - `active` → "Connected"
   - `moved`/`deleted`/`blocked` → "Needs attention"
4. **SSL Status**:
   - `pending_validation` → "Setting up security"
   - `active` → "Secure (SSL active)"
5. **Database Update**: Updates `domain_status`, `ssl_status`, and metadata

### Traffic Flow

Once verified:

1. Customer visits `mybusiness.com`
2. DNS resolves to Cloudflare
3. Cloudflare Custom Hostname matches the request
4. Cloudflare proxies to fallback origin (Railway)
5. Railway receives request with `Host: mybusiness.com`
6. Next.js middleware intercepts and rewrites to `/site/custom-domain/[domain]`
7. Dynamic route fetches site data and renders content

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

## Monitoring & Health Checks

### Check Domain Status

```javascript
// Backend: Check a single domain
import { verifyDnsForDomain } from '@/lib/site-address';
const result = await verifyDnsForDomain('mybusiness.com');
```

### Batch Health Check

```javascript
// Backend: Check all pending domains
import { checkAllDomainHealth } from '@/lib/domain-health';
await checkAllDomainHealth();
```

### Cloudflare API Status

```javascript
// Check if Cloudflare is configured
import { isCloudflareConfigured } from '@/lib/cloudflare-client';
if (!isCloudflareConfigured()) {
  console.warn('Cloudflare not configured - using mock mode');
}
```

## Troubleshooting

### "Cloudflare not configured" Error

**Symptom**: Domain verification fails immediately with config error.

**Solution**: Verify all required env vars are set:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ZONE_ID`
- `CLOUDFLARE_SAAS_FALLBACK_ORIGIN`

### Custom Hostnames Not Created

**Symptom**: API returns error when adding domain.

**Solutions**:
1. Check API token permissions (needs Custom Hostnames + SSL edit)
2. Verify zone has Cloudflare for SaaS enabled
3. Check zone ID is correct
4. Ensure API token isn't expired

### DNS Records Not Verifying

**Symptom**: Domain stays in "pending" state after customer adds records.

**Solutions**:
1. Verify customer added records correctly (exact values)
2. Wait 5-30 minutes for DNS propagation
3. Check Cloudflare dashboard for hostname status
4. Use `dig` or `nslookup` to verify DNS records are live

### SSL Certificate Not Provisioning

**Symptom**: Domain verifies but SSL stays pending.

**Solutions**:
1. Cloudflare auto-provisions SSL - can take 5-15 minutes
2. Check Cloudflare dashboard SSL/TLS settings
3. Ensure Universal SSL is enabled in your zone
4. Verify customer's DNS records are correct

### Middleware Conflicts

**Symptom**: Builder app itself returns 404 or custom domain pages.

**Solution**: Verify `APP_HOSTNAME` is set and matches your builder's actual domain. Middleware should skip requests to `APP_HOSTNAME`.

### Railway HOST Header Issues

**Symptom**: Railway returns wrong content for custom domains.

**Solution**: Ensure your Railway app accepts any hostname. Don't restrict by HOST header in Railway settings.

## Security Considerations

1. **API Token Rotation**: Rotate Cloudflare API tokens periodically
2. **Least Privilege**: Token should only have Custom Hostnames and SSL permissions
3. **Validation Records**: Never expose validation tokens in logs or client-side
4. **Rate Limiting**: Cloudflare API has rate limits - implement queuing for batch operations

## Pricing Notes

### Cloudflare Costs

Cloudflare for SaaS typically requires:
- **Business Plan or higher** ($200/month) for SaaS functionality
- **Custom Hostnames**: $2 per hostname per month (first 100 free on Enterprise)

### Recommended Plan

For production SaaS:
- **Cloudflare Enterprise**: Best pricing for high-volume custom hostnames
- Contact Cloudflare sales for pricing based on expected hostname count

### Alternative (if starting small)

- Use Cloudflare Business plan for initial testing
- Upgrade to Enterprise when you exceed 100 hostnames or need better pricing

## Support & Resources

- [Cloudflare for SaaS Documentation](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/)
- [Custom Hostnames API Reference](https://developers.cloudflare.com/api/operations/custom-hostname-for-a-zone-create-custom-hostname)
- [SSL for SaaS](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/security/certificate-management/)

## Contact

For setup assistance or questions about the Domain plan implementation, contact the development team.
