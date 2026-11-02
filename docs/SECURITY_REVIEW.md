# Security & Tenant Isolation Review

**Last Updated:** 2026-11-02  
**Status:** IN PROGRESS

## Overview

This document reviews the tenant isolation and security posture of the Easy Website Builder SaaS application.

## Tenant Isolation Architecture

### Data Model
- **Primary tenant key:** `owner_id` (user ID of the account owner)
- **Resources owned by tenants:**
  - Websites (conversations table)
  - Invoices
  - Subscriptions
  - Custom domains
  - Payment methods

### Authentication & Authorization

**User Roles:**
- `admin`: Full system access
- `owner`: Can manage their own websites, billing, and account
- `editor`: (if implemented) Limited access to specific sites

**Session Management:**
- JWT-based sessions via `jose` library
- HttpOnly cookies for token storage
- Token contains: `userId`, `email`, `role`, `siteId`

## Route-by-Route Security Audit

### ✅ Secure Routes (Properly Isolated)

| Route | Protection | Notes |
|-------|-----------|-------|
| `/api/profile` | `getCurrentUser()` + filters by `user.id` | ✅ |
| `/api/billing` | `requireUser()` + operations scoped to `user.id` | ✅ |
| `/api/billing/checkout-session` | `requireUser()` + creates resources for authenticated user only | ✅ |
| `/api/store/[id]` | Public read-only (published sites) | ✅ Intentional |
| `/api/draft` | `requireUser()` + `owner_id = user.id` filter | ✅ |

### ⚠️ Routes Requiring Review

| Route | Risk | Recommendation |
|-------|------|----------------|
| `/api/store` | Need to verify all mutations check `owner_id` | Add explicit tests |
| `/api/admin/*` | Admin-only routes must validate `ADMIN_EMAILS` | Already protected via `requireAdmin()` |
| `/api/billing/webhook` | Stripe signature verification | ✅ Already implemented |

### 🔴 Critical Checks Needed

1. **Website Access Control**
   - ✅ Creating websites: Automatically sets `owner_id` to authenticated user
   - ⚠️ Updating websites: Need to verify `owner_id` check in all mutations
   - ⚠️ Deleting websites: Need to verify `owner_id` check
   - ⚠️ Publishing websites: Need to verify only owner can publish their site

2. **Billing Resource Access**
   - ✅ Viewing invoices: Filtered by `user_id`
   - ✅ Stripe customer creation: Linked to user ID
   - ✅ Subscriptions: Metadata includes `userId`
   - ⚠️ Invoice marking as paid: Need to verify only owner can mark their invoices

3. **Custom Domain Verification**
   - ⚠️ Need to ensure one user cannot hijack another's domain verification

4. **Cross-Tenant Tests**
   - ❌ **MISSING:** No tests exist that verify User A cannot access User B's resources

## Rate Limiting

**Current Status:** ❌ NOT IMPLEMENTED

**Recommendations:**
- Implement rate limiting on:
  - `/api/auth/*` (login, register) - 5 requests/min per IP
  - `/api/billing/*` - 20 requests/min per user
  - `/api/store` (mutations) - 30 requests/min per user
  - `/api/admin/*` - 60 requests/min per admin

**Suggested Implementation:**
- Use `@upstash/ratelimit` with Redis/Upstash
- Or implement simple in-memory rate limiting for MVP

## Client Secret Safety

**Stripe Client Secrets:**
- ✅ Never logged or exposed in error messages
- ✅ Generated server-side only
- ✅ Returned via secure API endpoints
- ✅ Short-lived (expire after payment)

**Session Secrets:**
- ✅ JWT secret stored in `JWT_SECRET` env var
- ✅ HttpOnly cookies prevent XSS access

## Input Validation

**Current Approach:**
- Basic type coercion (`String(input)`, `parseInt()`)
- SQL parameterization via PostgreSQL `query($1, $2, ...)` ✅

**Recommendations:**
- Add Zod or Yup schema validation for complex inputs
- Sanitize user-provided HTML/CSS in website content
- Validate domain names against regex before DNS operations

## Secrets Management

**Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Session signing key
- `STRIPE_SECRET_KEY` - Stripe API key
- `STRIPE_WEBHOOK_SECRET` - Webhook signature verification
- `ADMIN_EMAILS` - Admin user whitelist
- `SENTRY_DSN` - (Optional) Error tracking

**Best Practices:**
- ✅ All secrets via environment variables
- ✅ No secrets in code or git history
- ⚠️ Rotation policy: Not documented (recommend 90-day rotation for JWT_SECRET)

## Multi-Region Considerations

**Region Data:**
- Region stored per user (`users.region`)
- Region locked after first subscription (`users.region_locked`)
- Pakistan blocked from Stripe server-side

**Risks:**
- ⚠️ IP spoofing: Geo-detection is a convenience, not a security control
- ⚠️ VPN users: Might be detected as wrong region initially
- ✅ Mitigation: Manual region selection allowed before region lock

## Action Items

### High Priority
1. ❌ **Add cross-tenant access tests**
   - Test User A cannot read/update/delete User B's websites
   - Test User A cannot view User B's invoices
   - Test User A cannot trigger billing actions for User B

2. ❌ **Audit all `/api/store` mutations**
   - Verify `owner_id` check in create/update/delete
   - Add explicit `WHERE owner_id = $userId` in all queries

3. ❌ **Implement rate limiting**
   - At minimum: login, billing, admin routes

### Medium Priority
4. ❌ **Add Zod schema validation**
   - Billing API inputs
   - Admin API inputs
   - Website content validation

5. ⚠️ **Document secret rotation policy**
6. ⚠️ **Add automated security scanning (Snyk, npm audit)**

### Low Priority
7. ⚠️ **Add CSP headers** for XSS protection
8. ⚠️ **Add CSRF tokens** for state-changing operations

## Conclusion

**Overall Security Posture:** ⚠️ MODERATE

The application has good foundational security with proper authentication, SQL parameterization, and basic tenant isolation. However, critical gaps remain:
- No cross-tenant access tests
- No rate limiting
- Insufficient audit of mutation endpoints

**Recommended Next Steps:**
1. Complete action items in High Priority section
2. Run penetration testing focused on tenant isolation
3. Implement rate limiting before public launch
