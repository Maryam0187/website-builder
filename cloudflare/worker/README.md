# Cloudflare Worker for Custom Domain Proxy

This Cloudflare Worker proxies custom domain traffic to the Railway-hosted builder app while preserving the original hostname via the `X-Forwarded-Host` header.

## Why This Is Needed

Railway may return 404 for hosts it doesn't recognize (custom domains and `*.technonairebuilder.com` arriving via Cloudflare). The Worker proxies requests to Railway with the original hostname in `X-Forwarded-Host` so the Next.js middleware can route them correctly.

## Setup

### 1. Install Wrangler (if not already installed)

```bash
npm install -g wrangler
```

### 2. Authenticate with Cloudflare

```bash
wrangler login
```

### 3. Update Configuration

Edit `wrangler.toml`:

```toml
[vars]
RAILWAY_ORIGIN = "website-builder-production-0175.up.railway.app"
```

Replace with your actual Railway default URL (find it in Railway → Settings → Domains).

### 4. Deploy

```bash
cd cloudflare/worker
npx wrangler deploy
```

### 5. Configure Custom Hostnames Fallback

In Cloudflare dashboard for `technonairebuilder.com` zone:

1. **SSL/TLS** → **Custom Hostnames**
2. Find the **Fallback Origin** setting
3. Set fallback origin to: `fallback.technonairebuilder.com`
4. Go to **DNS** and add:
   - `fallback` CNAME → `<worker-name>.<your-subdomain>.workers.dev` (your worker URL)
   - `customers` CNAME → `fallback.technonairebuilder.com`

OR route traffic directly through the worker by setting up routes in `wrangler.toml`.

### 6. Update Railway Environment Variables

Make sure these are set in Railway:

```bash
APP_HOSTNAME=builder.technonaire.com
SITE_HOST_ROOT=technonairebuilder.com
CLOUDFLARE_CNAME_TARGET=customers.technonairebuilder.com
```

## How It Works

1. Customer visits `mybusiness.com` (configured as a Cloudflare Custom Hostname)
2. Cloudflare Custom Hostname routes to fallback origin (`fallback.technonairebuilder.com`)
3. DNS points `fallback` → Worker
4. Worker proxies to Railway origin with `X-Forwarded-Host: mybusiness.com`
5. Next.js middleware reads `X-Forwarded-Host` and routes to `/site/custom-domain/mybusiness.com`
6. Site is rendered and returned

## Alternative: Direct Worker Routes

Instead of using fallback origin, you can route specific domains through the worker by adding them to `wrangler.toml`:

```toml
routes = [
  { pattern = "mybusiness.com/*", custom_domain = true },
  { pattern = "www.mybusiness.com/*", custom_domain = true },
]
```

This requires updating the worker config every time a new customer domain is added, so the fallback origin approach is recommended for scale.

## Testing Locally

You can test the worker locally with:

```bash
npx wrangler dev
```

Then visit `http://localhost:8787` to test.

## Monitoring

View worker logs and analytics in the Cloudflare dashboard:

1. Go to **Workers & Pages**
2. Select your worker
3. Click **Logs** or **Metrics**

## Troubleshooting

### Worker not routing correctly

- Verify `RAILWAY_ORIGIN` is set correctly in `wrangler.toml`
- Check that Railway accepts requests from the worker's IP range
- Ensure Railway environment has `APP_HOSTNAME` set

### 404 errors

- Confirm Next.js middleware is reading `X-Forwarded-Host`
- Check Railway logs to see what Host header is received
- Verify the site exists in the database with correct `custom_domain`

### SSL issues

- Ensure Cloudflare Custom Hostnames are verified (status = active)
- Check SSL certificate provisioning status in Cloudflare dashboard
- Verify DNS records point correctly to `customers.technonairebuilder.com`
