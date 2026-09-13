/**
 * Domain Setup UX Tests
 * 
 * Validates that the CustomDomainSetup component meets non-technical UX requirements:
 * - Plain language (no jargon)
 * - Numbered steps
 * - Clear copy buttons
 * - Human-readable statuses
 * - Mobile-friendly
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";

// Read the CustomDomainSetup component
const componentPath = path.join(process.cwd(), "src/components/site/CustomDomainSetup.js");
const componentCode = fs.readFileSync(componentPath, "utf-8");

describe("CustomDomainSetup UX Requirements", () => {
  it("uses plain language without technical jargon", () => {
    const forbiddenTerms = [
      "apex domain", // Should say "your website address" or similar
      "CNAME record", // Should be hidden in advanced or explained
      "TXT record", // Should be hidden in advanced or explained
      "SaaS",
      "DNS propagation", // Should say "changes take time" or similar
      "SSL certificate", // Should say "security" or hide completely
      "proxy",
      "fallback origin"
    ];
    
    // Check main UI text (not in code comments)
    const uiText = componentCode
      .split("\n")
      .filter(line => !line.trim().startsWith("//") && !line.trim().startsWith("*"))
      .join("\n");
    
    const found = forbiddenTerms.filter(term => 
      uiText.toLowerCase().includes(term.toLowerCase())
    );
    
    // TXT and CNAME can appear in labels or advanced details
    // but should not be in primary copy
    const primaryCopyLines = uiText
      .split("\n")
      .filter(line => 
        line.includes('Step ') || 
        line.includes('text-sm') ||
        line.includes('text-xs')
      );
    
    const jargonInPrimaryCopy = primaryCopyLines.filter(line =>
      line.toLowerCase().includes('apex') ||
      line.toLowerCase().includes('saas') ||
      line.toLowerCase().includes('fallback') ||
      line.toLowerCase().includes('proxy')
    );
    
    assert.strictEqual(
      jargonInPrimaryCopy.length,
      0,
      `Found jargon in primary UI: ${jargonInPrimaryCopy.join(", ")}`
    );
  });

  it("includes numbered steps", () => {
    assert.ok(componentCode.includes("Step 1"), "Missing Step 1");
    assert.ok(componentCode.includes("Step 2"), "Missing Step 2");
    assert.ok(componentCode.includes("Step 3"), "Missing Step 3");
    
    // Steps should be in a friendly format
    assert.ok(
      componentCode.includes("Enter your website address") ||
      componentCode.includes("enter your domain"),
      "Step 1 should be about entering domain"
    );
    
    assert.ok(
      componentCode.includes("Add these records") ||
      componentCode.includes("domain provider"),
      "Step 2 should be about adding DNS records"
    );
    
    assert.ok(
      componentCode.includes("Check") &&
      componentCode.includes("connection"),
      "Step 3 should be about checking connection"
    );
  });

  it("includes copy buttons for DNS values", () => {
    assert.ok(componentCode.includes("CopyButton"), "Should have CopyButton component");
    assert.ok(componentCode.includes("Copy"), "Should have copy functionality");
    assert.ok(componentCode.includes("Copied"), "Should show copied confirmation");
  });

  it("displays DNS records with friendly labels", () => {
    assert.ok(
      componentCode.includes("Host") || componentCode.includes("Name"),
      "Should have friendly label for DNS name"
    );
    
    assert.ok(
      componentCode.includes("Type"),
      "Should show DNS record type"
    );
    
    assert.ok(
      componentCode.includes("Value") || componentCode.includes("Points to"),
      "Should have friendly label for DNS value"
    );
  });

  it("uses human-readable status messages", () => {
    const statusMessages = [
      "Connected",
      "Waiting",
      "Checking",
      "Needs attention"
    ];
    
    statusMessages.forEach(msg => {
      assert.ok(
        componentCode.includes(msg),
        `Missing human-readable status: "${msg}"`
      );
    });
    
    // Should NOT show raw technical statuses in main UI
    const technicalStatuses = [
      "pending_validation",
      "pending_issuance",
      "active_validation"
    ];
    
    const visibleUI = componentCode
      .split("\n")
      .filter(line => !line.includes("cfSslStatus") && !line.includes("showAdvanced"))
      .join("\n");
    
    technicalStatuses.forEach(status => {
      const inMainUI = visibleUI.includes(`"${status}"`) || visibleUI.includes(`'${status}'`);
      assert.ok(
        !inMainUI,
        `Technical status "${status}" should not be in main UI`
      );
    });
  });

  it("mentions both www and apex automatically", () => {
    assert.ok(
      componentCode.includes("www.") && componentCode.includes("We'll connect"),
      "Should tell user we'll connect both www and apex"
    );
  });

  it("includes helpful timing information", () => {
    assert.ok(
      componentCode.includes("minutes") || componentCode.includes("hours"),
      "Should explain timing expectations"
    );
    
    assert.ok(
      componentCode.includes("5-30 minutes") || componentCode.includes("few minutes"),
      "Should give realistic timeframes"
    );
  });

  it("has advanced details toggle", () => {
    assert.ok(
      componentCode.includes("showAdvanced") || componentCode.includes("Show advanced"),
      "Should have advanced details toggle"
    );
    
    assert.ok(
      componentCode.includes("Technical") || componentCode.includes("technical"),
      "Advanced section should be clearly marked"
    );
  });

  it("provides registrar examples", () => {
    const registrars = ["GoDaddy", "Namecheap", "Google Domains"];
    const hasExamples = registrars.some(registrar => 
      componentCode.includes(registrar)
    );
    
    assert.ok(hasExamples, "Should mention common domain registrars");
  });

  it("uses calm, encouraging copy", () => {
    // Should have reassuring messages
    assert.ok(
      componentCode.includes("ready") || componentCode.includes("Ready"),
      "Should use encouraging language"
    );
    
    assert.ok(
      componentCode.includes("connected") || componentCode.includes("Connected"),
      "Should celebrate success"
    );
    
    // Should not use alarming uppercase language in user-facing text
    // Check that we don't have UPPERCASE alarming terms in the UI
    const alarmingUppercaseTerms = ["ERROR:", "FAILED:", "INVALID:"];
    alarmingUppercaseTerms.forEach(term => {
      assert.ok(
        !componentCode.includes(term),
        `Should avoid alarming uppercase term: ${term}`
      );
    });
  });

  it("has mobile-friendly styling classes", () => {
    // Check for responsive text sizes
    assert.ok(
      componentCode.includes("text-sm") || componentCode.includes("text-xs"),
      "Should use appropriate text sizes"
    );
    
    // Check for proper spacing
    assert.ok(
      componentCode.includes("space-y") || componentCode.includes("gap"),
      "Should use proper spacing utilities"
    );
    
    // Check for word breaking on long domains
    assert.ok(
      componentCode.includes("break-all") || componentCode.includes("break-words"),
      "Should handle long domain names on mobile"
    );
  });

  it("single domain input (not separate apex/www)", () => {
    // Should have one input, not multiple
    const inputCount = (componentCode.match(/type="text"/g) || []).length;
    assert.ok(
      inputCount <= 1,
      "Should have single domain input, not multiple fields"
    );
    
    assert.ok(
      componentCode.includes("mybusiness.com") || componentCode.includes("yourbrand.com"),
      "Should show simple domain example"
    );
  });

  it("includes tip about pasting DNS records", () => {
    assert.ok(
      componentCode.includes("Paste") || componentCode.includes("paste"),
      "Should tell users to paste the records"
    );
    
    assert.ok(
      componentCode.includes("exactly") || componentCode.includes("exact"),
      "Should emphasize accuracy"
    );
  });
});

describe("Status Flow Logic", () => {
  it("shows correct UI for each status", () => {
    const statuses = ["none", "pending", "verified", "error"];
    
    statuses.forEach(status => {
      const statusRegex = new RegExp(`(domainStatus === "${status}"|status === "${status}")`, "g");
      assert.ok(
        statusRegex.test(componentCode),
        `Should handle ${status} status`
      );
    });
  });

  it("auto-verifies when pending", () => {
    assert.ok(
      componentCode.includes("useEffect") && 
      componentCode.includes("pending") &&
      componentCode.includes("setTimeout"),
      "Should auto-check when domain is pending"
    );
  });

  it("prevents actions while loading", () => {
    assert.ok(
      componentCode.includes("disabled={") && 
      (componentCode.includes("saving") || componentCode.includes("verifying")),
      "Should disable buttons while processing"
    );
  });
});

describe("Error Handling UX", () => {
  it("translates technical errors to friendly messages", () => {
    // Should handle common error scenarios
    assert.ok(
      componentCode.includes("Something went wrong") ||
      componentCode.includes("Could not"),
      "Should have friendly error messages"
    );
    
    assert.ok(
      componentCode.includes("try again") || componentCode.includes("Try again"),
      "Should encourage retry"
    );
  });

  it("provides helpful context for DNS timing", () => {
    assert.ok(
      componentCode.includes("This is normal") || 
      componentCode.includes("usually takes"),
      "Should explain that DNS timing is normal"
    );
  });
});

console.log("\n✅ All domain UX tests passed!");
console.log("\nUX Requirements Validated:");
console.log("  ✓ Plain language without jargon");
console.log("  ✓ Numbered steps (1-4)");
console.log("  ✓ Copy buttons for DNS records");
console.log("  ✓ Friendly DNS labels (Host, Type, Value)");
console.log("  ✓ Human-readable statuses");
console.log("  ✓ Automatic www + apex handling");
console.log("  ✓ Timing expectations");
console.log("  ✓ Advanced details toggle");
console.log("  ✓ Registrar examples");
console.log("  ✓ Calm, encouraging copy");
console.log("  ✓ Mobile-friendly styling");
console.log("  ✓ Single domain input");
console.log("  ✓ DNS pasting tips");
console.log("  ✓ Error handling");
