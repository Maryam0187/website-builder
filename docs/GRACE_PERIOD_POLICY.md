# Payment Grace Period and Unpublish Policy

## Overview

When a customer's payment fails, we implement a **7-day grace period** before unpublishing their sites. If payment remains unpaid for **30 days**, custom subdomains and domains are released for others to claim.

## Grace Period Flow

### 1. Payment Failure (Day 0)
When Stripe reports a payment failure via webhook:
- `invoice.payment_failed` event received
- `payment_failed_at` timestamp set to now
- `grace_period_ends_at` set to now + 7 days
- `subscription_status` set to `past_due`
- User sees banner: "Payment failed - update your card within 7 days to keep sites live"

### 2. Grace Period (Days 1-7)
During the grace period:
- **Sites remain LIVE** and accessible
- User can still access the builder and edit sites
- Dashboard shows prominent banner with:
  - Days remaining in grace period
  - Link to update payment method
  - Warning that sites will be unpublished if not resolved
- Email sent daily (optional - not implemented in code yet) reminding user

### 3. Payment Success (Any time during grace)
When payment succeeds:
- `invoice.payment_succeeded` event received
- `clearGracePeriod(userId)` called
- `payment_failed_at` and `grace_period_ends_at` cleared
- `subscription_status` set to `active`
- Banner removed, sites stay live

### 4. Grace Period Expires (Day 7+)
If grace period expires without payment:
- Automated cron job runs `enforceGracePeriods()`
- All user's live sites unpublished:
  - `status` changed from `published` to `draft`
  - `unpublished_at` timestamp set
  - `unpublish_reason` set to `grace_period_expired`
- `subscription_status` set to `unpaid`
- Sites redirect to "Site Paused" page showing payment issue

### 5. Site Paused State
When visiting an unpublished site:
- Shows friendly "Site Temporarily Paused" page
- Explains payment issue to site owner
- Provides sign-in link to restore site
- Shows support email for help

### 6. Domain Release (Day 30+)
If payment remains unpaid for 30 days:
- Automated cron job runs `releaseStaleDomains()`
- Custom subdomains cleared (available for others to claim)
- Custom domains disconnected:
  - Cloudflare Custom Hostnames deleted
  - `custom_domain` cleared from database
  - DNS records remain (user's responsibility)
- User must reconfigure domain if they return

### 7. Restoration
When user pays after unpublishing:
- Sites remain unpublished (must be manually republished)
- Subdomains and domains (if within 30 days) are restored
- User can republish sites from dashboard
- Version history preserved throughout

## Database Schema

### Users Table
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_failed_at TIMESTAMPTZ NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMPTZ NULL;
```

### Sites Table
```sql
ALTER TABLE sites ADD COLUMN IF NOT EXISTS unpublished_at TIMESTAMPTZ NULL;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS unpublish_reason TEXT NULL;
```

## Functions

### `startGracePeriod(userId)`
Called when payment fails. Sets grace period end date and marks subscription as past_due.

### `clearGracePeriod(userId)`
Called when payment succeeds. Clears grace period timestamps.

### `unpublishUserSites(userId, reason)`
Unpublishes all live sites for a user. Sets unpublish reason.

### `enforceGracePeriods()`
**Cron job function** - Run daily to check and enforce expired grace periods.
- Finds users with `grace_period_ends_at < now()`
- Unpublishes their sites
- Sets `subscription_status` to `unpaid`

### `releaseStaleDomains()`
**Cron job function** - Run daily to release stale domains.
- Finds sites unpublished 30+ days ago with unpaid subscriptions
- Clears subdomains and custom domains
- Deletes Cloudflare Custom Hostnames (if applicable)

## Webhook Events Handled

### `invoice.payment_succeeded`
- Clears grace period
- Subscription remains/becomes active
- Sites stay live

### `invoice.payment_failed`
- Starts grace period
- Sets past_due status
- Sites remain live during grace period

### `payment_intent.payment_failed`
- Starts grace period (if part of subscription)
- Similar to invoice failure handling

### Existing Events (unchanged)
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## Manual Steps Required

### 1. Set up Cron Jobs
Add to your hosting platform (Railway, Heroku, etc.):

**Daily grace period enforcement:**
```bash
# Railway: Add to cron schedule
0 3 * * * curl -X POST https://your-app.com/api/billing/enforce-grace-periods
```

**Daily domain release:**
```bash
# Railway: Add to cron schedule
0 4 * * * curl -X POST https://your-app.com/api/billing/release-stale-domains
```

**Or use Railway's built-in cron jobs:**
1. Create `/api/billing/enforce-grace-periods/route.js`
2. Create `/api/billing/release-stale-domains/route.js`
3. Call those endpoints from Railway Cron

### 2. Stripe Webhook Configuration
Enable these webhook events in Stripe Dashboard:
1. Go to Developers → Webhooks
2. Add endpoint: `https://your-app.com/api/billing/webhook`
3. Select events:
   - `invoice.payment_succeeded` ✓ (was already enabled)
   - `invoice.payment_failed` ✓ **(newly added)**
   - `payment_intent.payment_failed` ✓ **(newly added)**
   - `checkout.session.completed` ✓ (already enabled)
   - `customer.subscription.*` ✓ (already enabled)

### 3. Update Environment Variables
No new env vars needed - uses existing Stripe and Cloudflare configuration.

### 4. Email Notifications (Optional - Not Implemented)
Consider adding email notifications at:
- Payment failure (immediate)
- 3 days before grace period expires
- 1 day before grace period expires
- Day of unpublishing
- 7 days before domain release
- Day of domain release

Use the Resend API (already configured) with templates.

## Testing

### Manual Test Flow
1. **Trigger payment failure:**
   - Use Stripe test mode
   - Create subscription with card `4000000000000341` (always fails)
   - Or manually call `startGracePeriod(userId)` in Node REPL

2. **Verify grace period:**
   - Check `users` table: `payment_failed_at`, `grace_period_ends_at` set
   - Check dashboard shows banner (if banner UI implemented)
   - Sites should remain live

3. **Test payment success:**
   - Update payment method to `4242424242424242`
   - Trigger payment
   - Verify `clearGracePeriod()` clears timestamps
   - Sites stay live

4. **Test grace period expiry:**
   - Manually set `grace_period_ends_at` to past date
   - Run `enforceGracePeriods()` manually
   - Verify sites unpublished
   - Visit site, should see "Site Paused" page

5. **Test domain release:**
   - Manually set `unpublished_at` to 31 days ago
   - Set user `subscription_status` to `unpaid`
   - Run `releaseStaleDomains()` manually
   - Verify subdomain/domain cleared

### Automated Tests
Run: `npm test tests/pro-plan-grace-period.test.js`

Tests cover:
- Grace period date calculations
- Payment failure/success state transitions
- Site unpublishing logic
- Plan feature gating

## What's NOT Tested Live

1. **Actual Stripe webhook delivery** - Must test in Stripe test mode
2. **Cron job execution** - Must set up and test cron endpoints
3. **Email notifications** - Not implemented (optional)
4. **Dashboard banner UI** - Grace period banner not implemented in UI
5. **Cloudflare hostname deletion** - Must test with real Cloudflare account
6. **Site paused page rendering** - Must test by visiting unpublished site

## Security Considerations

- Grace period functions check user ownership before modifying
- Webhook signature verification required (Stripe)
- Cron endpoints should be secured (API key or internal only)
- Domain release only affects sites with unpaid status for 30+ days

## Rollback Plan

If issues occur:
1. **Stop cron jobs** immediately
2. **Restore sites:** `UPDATE sites SET status = 'published', unpublished_at = NULL WHERE unpublish_reason = 'grace_period_expired'`
3. **Clear grace periods:** `UPDATE users SET payment_failed_at = NULL, grace_period_ends_at = NULL WHERE subscription_status = 'past_due'`
4. **Fix code and redeploy**
