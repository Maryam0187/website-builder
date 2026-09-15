/**
 * Tests for subdomain and domain management
 * 
 * To run these tests (when test framework is set up):
 * npm test tests/site-address.test.js
 */

import {
  validateCustomDomain,
  getRequiredDnsRecords,
} from "../src/lib/site-address.js";
import { normalizeSubdomain, isReservedSubdomain } from "../src/lib/site-host.js";

// Test subdomain normalization
console.log("\n=== Subdomain Normalization Tests ===");

const subdomainTests = [
  { input: "my-business", expected: "my-business", valid: true },
  { input: "MyBusiness123", expected: "mybusiness123", valid: true },
  { input: "test_cafe", expected: "testcafe", valid: true },
  { input: "ab", expected: null, valid: false }, // too short
  { input: "a-b-c", expected: "a-b-c", valid: true },
  { input: "-start", expected: null, valid: false }, // starts with hyphen
  { input: "end-", expected: null, valid: false }, // ends with hyphen
  { input: "api", expected: null, valid: false }, // reserved
  { input: "www", expected: null, valid: false }, // reserved
  { input: "admin", expected: null, valid: false }, // reserved
];

subdomainTests.forEach(test => {
  const result = normalizeSubdomain(test.input);
  const reserved = test.input ? isReservedSubdomain(test.input.toLowerCase()) : false;
  const passed = test.valid 
    ? (result === test.expected && !reserved)
    : (result === null || reserved);
  
  console.log(
    passed ? "✓" : "✗",
    `"${test.input}" →`,
    result === null ? "invalid" : `"${result}"`,
    reserved ? "(reserved)" : ""
  );
});

// Test domain validation
console.log("\n=== Domain Validation Tests ===");

const domainTests = [
  { input: "example.com", valid: true },
  { input: "www.example.com", valid: true },
  { input: "sub.example.com", valid: true },
  { input: "my-site.com", valid: true },
  { input: "example.co.uk", valid: true },
  { input: "https://example.com", valid: true, normalized: "example.com" },
  { input: "example.com/", valid: true, normalized: "example.com" },
  { input: "invalid", valid: false },
  { input: "invalid..com", valid: false },
  { input: "sub.technonaire.site", valid: false }, // Technonaire subdomain not allowed
  { input: "", valid: false },
  { input: "example", valid: false },
];

domainTests.forEach(test => {
  const result = validateCustomDomain(test.input);
  const passed = result.valid === test.valid;
  const normalized = result.normalized || "invalid";
  const expected = test.normalized || test.input.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
  
  console.log(
    passed ? "✓" : "✗",
    `"${test.input}" →`,
    result.valid ? `valid: "${normalized}"` : `invalid: ${result.reason}`,
    test.normalized && normalized !== expected ? `(expected "${expected}")` : ""
  );
});

// Test DNS records generation
console.log("\n=== DNS Records Tests ===");

const dnsTests = [
  { domain: "example.com", isApex: true },
  { domain: "www.example.com", isApex: false },
  { domain: "blog.example.com", isApex: false },
];

dnsTests.forEach(test => {
  const records = getRequiredDnsRecords(test.domain);
  console.log(`\n${test.domain}${test.isApex ? " (apex)" : ""}:`);
  records.forEach(record => {
    console.log(`  ${record.type} ${record.name} → ${record.value}`);
  });
});

console.log("\n=== Tests Complete ===\n");
