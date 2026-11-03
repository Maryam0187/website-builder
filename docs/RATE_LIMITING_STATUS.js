/**
 * Batch Rate Limiting Application
 * 
 * This document tracks which routes have rate limiting applied
 * and which still need it.
 */

export const rateLimitingStatus = {
  // ✅ DONE
  'POST /api/auth': 'DONE - 5/min per IP',
  
  // 🔨 HIGH PRIORITY (apply next)
  'POST /api/auth/forgot-password': {
    status: 'TODO',
    limit: '3 per 5 minutes per IP',
    limiter: 'rateLimiters.contact',
  },
  'POST /api/auth/reset-password': {
    status: 'TODO',
    limit: '5 per minute per IP',
    limiter: 'rateLimiters.auth',
  },
  'POST /api/billing/payment-request': {
    status: 'TODO',
    limit: '3 per 5 minutes per IP+email',
    limiter: 'rateLimiters.contact',
  },
  'POST /api/site/contact': {
    status: 'TODO',
    limit: '3 per 5 minutes per IP',
    limiter: 'rateLimiters.contact',
  },
  'POST /api/checkout/validate-discount': {
    status: 'TODO',
    limit: '20 per minute per IP',
    limiter: 'rateLimiters.public',
  },
  'POST /api/billing/checkout-session': {
    status: 'TODO',
    limit: '10 per minute per user',
    limiter: 'rateLimiters.checkout',
  },
  'POST /api/site/address': {
    status: 'TODO',
    limit: '10 per minute per user',
    limiter: 'rateLimiters.api',
  },
  
  // 📊 MEDIUM PRIORITY
  'POST /api/admin/pricing': {
    status: 'TODO',
    limit: '100 per minute per admin',
    limiter: 'rateLimiters.admin',
  },
  'POST /api/admin/discounts': {
    status: 'TODO',
    limit: '100 per minute per admin',
    limiter: 'rateLimiters.admin',
  },
  'GET /api/admin/pricing': {
    status: 'TODO',
    limit: '100 per minute per admin',
    limiter: 'rateLimiters.admin',
  },
  'GET /api/admin/discounts': {
    status: 'TODO',
    limit: '100 per minute per admin',
    limiter: 'rateLimiters.admin',
  },
};

/**
 * Application template:
 * 
 * 1. Import at top:
 *    import { rateLimiters, applyRateLimit } from "@/lib/rate-limit";
 * 
 * 2. Add at start of handler:
 *    const rateCheck = await applyRateLimit(request, rateLimiters.XXX, 'identifier', userId);
 *    if (rateCheck.limited) return rateCheck.response;
 */
