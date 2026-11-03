#!/usr/bin/env node

/**
 * Tenant Isolation & Rate Limiting Audit Script
 * 
 * This script tracks which routes need:
 * 1. Tenant isolation checks (owner_id verification)
 * 2. Rate limiting
 * 3. Tests
 */

const routes = {
  // Auth routes
  'POST /api/auth': {
    rateLimit: 'DONE',
    tenantIsolation: 'N/A',
    test: 'TODO',
  },
  'POST /api/auth/forgot-password': {
    rateLimit: 'TODO',
    tenantIsolation: 'N/A',
    test: 'TODO',
  },
  'POST /api/auth/reset-password': {
    rateLimit: 'TODO',
    tenantIsolation: 'N/A',
    test: 'TODO',
  },
  'POST /api/auth/password': {
    rateLimit: 'TODO',
    tenantIsolation: 'CHECK',
    test: 'TODO',
  },
  
  // Billing routes (critical for tenant isolation)
  'GET /api/billing': {
    rateLimit: 'TODO',
    tenantIsolation: 'CHECK',
    test: 'TODO',
  },
  'POST /api/billing': {
    rateLimit: 'TODO',
    tenantIsolation: 'CHECK',
    test: 'TODO',
  },
  'POST /api/billing/checkout-session': {
    rateLimit: 'TODO',
    tenantIsolation: 'CHECK',
    test: 'TODO',
  },
  'GET /api/billing/invoice/[id]': {
    rateLimit: 'N/A',
    tenantIsolation: 'CHECK',
    test: 'TODO',
  },
  'POST /api/billing/payment-request': {
    rateLimit: 'TODO',
    tenantIsolation: 'CHECK',
    test: 'TODO',
  },
  
  // Conversations/Sites (critical for tenant isolation)
  'GET /api/conversations': {
    rateLimit: 'N/A',
    tenantIsolation: 'CHECK',
    test: 'TODO',
  },
  'GET /api/conversations/[id]': {
    rateLimit: 'N/A',
    tenantIsolation: 'CHECK',
    test: 'TODO',
  },
  'PUT /api/conversations/[id]': {
    rateLimit: 'N/A',
    tenantIsolation: 'CHECK',
    test: 'TODO',
  },
  'DELETE /api/conversations/[id]': {
    rateLimit: 'N/A',
    tenantIsolation: 'CHECK',
    test: 'TODO',
  },
  
  // Site operations
  'POST /api/site/address': {
    rateLimit: 'TODO',
    tenantIsolation: 'CHECK',
    test: 'TODO',
  },
  'POST /api/site/contact': {
    rateLimit: 'TODO',
    tenantIsolation: 'N/A',
    test: 'TODO',
  },
  
  // Versions
  'GET /api/versions': {
    rateLimit: 'N/A',
    tenantIsolation: 'CHECK',
    test: 'TODO',
  },
  'POST /api/versions': {
    rateLimit: 'N/A',
    tenantIsolation: 'CHECK',
    test: 'TODO',
  },
  
  // Admin routes (must check ADMIN_EMAILS)
  'GET /api/admin/pricing': {
    rateLimit: 'TODO',
    tenantIsolation: 'ADMIN',
    test: 'TODO',
  },
  'POST /api/admin/pricing': {
    rateLimit: 'TODO',
    tenantIsolation: 'ADMIN',
    test: 'TODO',
  },
  'GET /api/admin/discounts': {
    rateLimit: 'TODO',
    tenantIsolation: 'ADMIN',
    test: 'TODO',
  },
  'POST /api/admin/discounts': {
    rateLimit: 'TODO',
    tenantIsolation: 'ADMIN',
    test: 'TODO',
  },
  'POST /api/admin/backup': {
    rateLimit: 'N/A',
    tenantIsolation: 'SECRET',
    test: 'TODO',
  },
  
  // Discount/coupon validation
  'POST /api/checkout/validate-discount': {
    rateLimit: 'TODO',
    tenantIsolation: 'CHECK',
    test: 'TODO',
  },
};

// Priority order for implementation
const priorities = {
  CRITICAL: [
    'GET /api/conversations/[id]',
    'PUT /api/conversations/[id]',
    'DELETE /api/conversations/[id]',
    'GET /api/billing/invoice/[id]',
    'GET /api/versions',
    'POST /api/versions',
  ],
  HIGH: [
    'POST /api/auth/forgot-password',
    'POST /api/auth/reset-password',
    'POST /api/billing/checkout-session',
    'POST /api/billing/payment-request',
    'POST /api/site/contact',
    'POST /api/checkout/validate-discount',
  ],
  MEDIUM: [
    'POST /api/admin/pricing',
    'POST /api/admin/discounts',
    'POST /api/site/address',
  ],
};

console.log('Tenant Isolation & Rate Limiting Audit\n');
console.log('Priority Implementation Order:');
console.log('\nCRITICAL (Tenant Isolation):');
priorities.CRITICAL.forEach(route => console.log(`  - ${route}`));
console.log('\nHIGH (Rate Limiting + Isolation):');
priorities.HIGH.forEach(route => console.log(`  - ${route}`));
console.log('\nMEDIUM:');
priorities.MEDIUM.forEach(route => console.log(`  - ${route}`));
