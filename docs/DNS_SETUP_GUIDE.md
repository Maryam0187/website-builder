# Custom Domain DNS Setup Guide

This guide helps Domain plan users configure their custom domain to work with Technonaire hosting.

## Overview

To use your own domain (e.g., `mybusiness.com`) with your Technonaire website, you need to add DNS records at your domain registrar.

## What You'll Need

1. Access to your domain registrar's DNS management panel (Namecheap, GoDaddy, Cloudflare, etc.)
2. The DNS records provided in your Technonaire website settings
3. 5-30 minutes for DNS changes to propagate

## Step-by-Step Instructions

### 1. Access Your Domain's DNS Settings

Log in to your domain registrar:
- **Namecheap**: Domains → Manage → Advanced DNS
- **GoDaddy**: My Products → DNS → Manage Zones
- **Cloudflare**: DNS → Records
- **Google Domains**: DNS → Custom records
- **Other registrars**: Look for "DNS Settings", "DNS Management", or "Nameservers"

### 2. Add the Required DNS Records

Your Technonaire website settings will show specific records. Here are the common patterns:

#### For Apex Domains (example.com)

```
Type:  A
Name:  @ (or leave blank)
Value: [Your hosting IP - shown in settings]
TTL:   3600 (or Auto)

Type:  CNAME
Name:  www
Value: example.com
TTL:   3600
```

#### For Subdomains (www.example.com, blog.example.com)

```
Type:  CNAME
Name:  www (or your subdomain)
Value: builder.technonaire.com
TTL:   3600 (or Auto)
```

### 3. Save Your Changes

After adding the records:
1. Click "Save" or "Add Record" at your registrar
2. Wait for DNS propagation (typically 5-30 minutes, can be up to 48 hours)
3. Return to your Technonaire website settings
4. Click "Verify DNS" to check if your records are configured correctly

## Common Issues

### "DNS records not found" Error

**Solution**: DNS changes can take time. Wait 10-15 minutes and try verifying again.

### Multiple Existing Records

**Solution**: Remove old A or CNAME records for the same name before adding new ones. Most registrars don't allow duplicates.

### "CNAME already exists" Error

**Solution**: Check if there's already a CNAME record for this name. Delete the old one first.

### Registrar Doesn't Allow @ for A Records

**Solution**: Try leaving the Name field blank, or use your domain name (e.g., `example.com`).

## Verification

Once DNS propagates:
1. Your Technonaire website settings will show "DNS Verified ✓"
2. SSL certificate will be automatically provisioned
3. Your website will be accessible at your custom domain
4. Changes may take up to 30 minutes to fully propagate

## SSL Certificate

- Technonaire automatically provisions and manages SSL certificates
- Your site will be served over HTTPS
- Certificates renew automatically every 90 days
- No action required from you

## Need Help?

If you're having trouble:
1. Double-check that the records match exactly (including trailing dots if shown)
2. Try using your registrar's DNS checker tool
3. Contact us in the support chat with your domain name

## Registrar-Specific Guides

### Namecheap
1. Dashboard → Domain List → Manage
2. Advanced DNS tab
3. Add New Record → Choose type and fill in details

### GoDaddy
1. My Products → Domains
2. DNS → Manage Zones
3. Add → Select record type

### Cloudflare
1. Select your domain
2. DNS → Add record
3. Fill in type, name, and content
4. Turn off "Proxy status" (orange cloud) for DNS-only

### Google Domains
1. My domains → Manage
2. DNS → Custom resource records
3. Create new record

## Technical Details

For advanced users:
- TTL (Time To Live): How long DNS servers cache your records (3600 = 1 hour)
- A Record: Maps domain to IPv4 address
- CNAME Record: Maps domain to another domain name (alias)
- SSL: Let's Encrypt certificates via ACME HTTP-01 validation
