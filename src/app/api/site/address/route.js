import { NextResponse } from "next/server";
import { requireUser, denyIfMustChangePassword, getUserById } from "@/lib/auth";
import {
  checkSubdomainAvailability,
  claimSubdomainForSite,
  updateSubdomainForSite,
  setCustomDomainForSite,
  verifyDnsForDomain,
  removeCustomDomain,
  validateCustomDomain,
} from "@/lib/site-address";
import { getSiteById, ownerOwnsSite, sitePublicUrl } from "@/lib/store-actions";
import { resolveActivePlan, planFeatures } from "@/lib/billing";

/**
 * GET /api/site/address
 * 
 * Actions:
 * - check-subdomain: Check if a subdomain is available
 * - check-domain-dns: Verify DNS records for a custom domain
 * - get-dns-records: Get required DNS records for a domain
 */
export async function GET(request) {
  const user = await requireUser(["owner"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const blocked = denyIfMustChangePassword(user);
  if (blocked) return blocked;

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const subdomain = searchParams.get("subdomain");
  const domain = searchParams.get("domain");
  const siteId = searchParams.get("siteId");

  try {
    if (action === "check-subdomain") {
      if (!subdomain) {
        return NextResponse.json({ error: "subdomain parameter required" }, { status: 400 });
      }

      const result = await checkSubdomainAvailability(subdomain);
      return NextResponse.json(result);
    }

    if (action === "check-domain-dns") {
      if (!domain) {
        return NextResponse.json({ error: "domain parameter required" }, { status: 400 });
      }

      const result = await verifyDnsForDomain(domain);
      return NextResponse.json(result);
    }

    if (action === "get-dns-records") {
      if (!domain) {
        return NextResponse.json({ error: "domain parameter required" }, { status: 400 });
      }

      const validation = validateCustomDomain(domain);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.reason }, { status: 400 });
      }

      const records = getRequiredDnsRecords(validation.normalized);
      return NextResponse.json({ records, domain: validation.normalized });
    }

    if (action === "get-site-address") {
      if (!siteId) {
        return NextResponse.json({ error: "siteId parameter required" }, { status: 400 });
      }

      const site = await getSiteById(siteId);
      if (!site || !ownerOwnsSite(user, site)) {
        return NextResponse.json({ error: "Site not found" }, { status: 404 });
      }

      const plan = resolveActivePlan(user);
      const features = planFeatures(user);

      return NextResponse.json({
        siteId: site.id,
        subdomain: site.subdomain,
        customDomain: site.customDomain,
        domainStatus: site.domainStatus,
        domainVerifiedAt: site.domainVerifiedAt,
        liveUrl: sitePublicUrl(site),
        canChooseSubdomain: features.technonaireAddress === "chosen",
        canUseCustomDomain: features.domain === true,
        planId: plan.id,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Address check failed" },
      { status: 400 }
    );
  }
}

/**
 * POST /api/site/address
 * 
 * Actions:
 * - claim-subdomain: Claim a chosen subdomain for Custom plan
 * - update-subdomain: Update/change the subdomain
 * - set-custom-domain: Set a custom domain for Domain plan
 * - verify-domain: Trigger DNS verification
 * - remove-domain: Remove custom domain
 */
export async function POST(request) {
  const user = await requireUser(["owner"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const blocked = denyIfMustChangePassword(user);
  if (blocked) return blocked;

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "").trim();
  const siteId = body.siteId;

  if (!siteId) {
    return NextResponse.json({ error: "siteId required" }, { status: 400 });
  }

  try {
    const site = await getSiteById(siteId);
    if (!site || !ownerOwnsSite(user, site)) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const plan = resolveActivePlan(user);
    const features = planFeatures(user);

    if (action === "claim-subdomain" || action === "update-subdomain") {
      // Check if user has Custom+ plan
      if (features.technonaireAddress !== "chosen") {
        return NextResponse.json(
          { error: "Custom plan or higher required to choose your Technonaire address" },
          { status: 403 }
        );
      }

      const subdomain = String(body.subdomain || "").trim();
      if (!subdomain) {
        return NextResponse.json({ error: "subdomain required" }, { status: 400 });
      }

      const result = action === "update-subdomain"
        ? await updateSubdomainForSite(siteId, subdomain, user.id)
        : await claimSubdomainForSite(siteId, subdomain, user.id);

      const updated = await getSiteById(siteId);
      return NextResponse.json({
        success: true,
        subdomain: result.subdomain,
        liveUrl: sitePublicUrl(updated),
        site: {
          ...updated,
          cfValidationRecords: updated.cfValidationRecords,
          cfSslStatus: updated.cfSslStatus
        },
        message: action === "update-subdomain"
          ? `Address updated to ${result.subdomain}.technonaire.site`
          : `Claimed ${result.subdomain}.technonaire.site for your website`,
      });
    }

    if (action === "set-custom-domain") {
      // Check if user has Domain+ plan
      if (!features.domain) {
        return NextResponse.json(
          { error: "Domain plan required to use your own domain" },
          { status: 403 }
        );
      }

      const domain = String(body.domain || "").trim();
      if (!domain) {
        return NextResponse.json({ error: "domain required" }, { status: 400 });
      }

      const result = await setCustomDomainForSite(siteId, domain, user.id);
      const updated = await getSiteById(siteId);

      return NextResponse.json({
        success: true,
        customDomain: result.customDomain,
        domainStatus: result.domainStatus,
        validationRecords: result.validationRecords,
        dnsRecords: result.validationRecords, // For backwards compat
        site: {
          ...updated,
          cfValidationRecords: updated.cfValidationRecords,
          cfSslStatus: updated.cfSslStatus
        },
        message: `We'll connect ${result.customDomain} and www.${result.customDomain}. Follow the steps to complete setup.`,
      });
    }

    if (action === "verify-domain") {
      if (!site.customDomain) {
        return NextResponse.json({ error: "No custom domain set for this site" }, { status: 400 });
      }

      const verification = await verifyDnsForDomain(site.customDomain);
      const updated = await getSiteById(siteId);

      // Translate technical messages to user-friendly ones
      let friendlyMessage = verification.message;
      if (verification.verified) {
        friendlyMessage = "Your website is connected and ready!";
      } else if (verification.status === "pending") {
        friendlyMessage = "Still waiting for your domain settings to update. This usually takes 5-30 minutes.";
      } else if (verification.status === "error") {
        friendlyMessage = "We couldn't verify your domain. Please check that you added the records correctly.";
      }

      return NextResponse.json({
        ...verification,
        message: friendlyMessage,
        site: {
          ...updated,
          cfValidationRecords: updated.cfValidationRecords,
          cfSslStatus: updated.cfSslStatus
        },
        liveUrl: verification.verified ? `https://${site.customDomain}` : null,
      });
    }

    if (action === "remove-domain") {
      const updated = await removeCustomDomain(siteId, user.id);
      return NextResponse.json({
        success: true,
        site: updated,
        message: "Custom domain removed",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Address action failed" },
      { status: 400 }
    );
  }
}
