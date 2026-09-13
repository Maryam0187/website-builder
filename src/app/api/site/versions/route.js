import { NextResponse } from "next/server";
import { denyIfMustChangePassword, requireUser } from "@/lib/auth";
import {
  createSiteVersion,
  deleteSiteVersion,
  getSiteById,
  listSiteVersions,
  ownerOwnsSite,
  renameSiteVersion,
  restoreSiteVersion,
} from "@/lib/store-actions";
import { planFeatures } from "@/lib/billing";

async function requireOwnerSite(siteId) {
  const user = await requireUser(["owner", "admin"]);
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const blocked = denyIfMustChangePassword(user);
  if (blocked) return { error: blocked };

  const site = await getSiteById(siteId);
  if (!site) {
    return { error: NextResponse.json({ error: "Site not found" }, { status: 404 }) };
  }
  if (user.role === "owner" && !ownerOwnsSite(user, site)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, site };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("siteId");
  if (!siteId) {
    return NextResponse.json({ error: "siteId required" }, { status: 400 });
  }

  const result = await requireOwnerSite(siteId);
  if (result.error) return result.error;

  const versions = await listSiteVersions(result.site.id);
  return NextResponse.json({ versions });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "").trim();
  const siteId = body.siteId;
  if (!siteId) {
    return NextResponse.json({ error: "siteId required" }, { status: 400 });
  }

  const result = await requireOwnerSite(siteId);
  if (result.error) return result.error;
  const { user, site } = result;

  const features = planFeatures(user);
  if (user.role === "owner" && !features.versionHistory && !features.live) {
    return NextResponse.json(
      { error: "Version history is available on paid plans." },
      { status: 403 },
    );
  }

  try {
    if (action === "snapshot") {
      const version = await createSiteVersion(site.id, {
        label: body.label || "version-1",
        createdBy: user.id,
      });
      const versions = await listSiteVersions(site.id);
      return NextResponse.json({ version, versions, message: "Version saved" });
    }

    if (action === "rename") {
      const versionId = body.versionId;
      const label = String(body.label || "").trim();
      if (!versionId) {
        return NextResponse.json({ error: "versionId required" }, { status: 400 });
      }
      if (!label) {
        return NextResponse.json({ error: "Version name is required" }, { status: 400 });
      }
      const version = await renameSiteVersion(site.id, versionId, label);
      const versions = await listSiteVersions(site.id);
      return NextResponse.json({ version, versions, message: "Version renamed" });
    }

    if (action === "delete") {
      const versionId = body.versionId;
      if (!versionId) {
        return NextResponse.json({ error: "versionId required" }, { status: 400 });
      }
      await deleteSiteVersion(site.id, versionId);
      const versions = await listSiteVersions(site.id);
      return NextResponse.json({ versions, message: "Version deleted" });
    }

    if (action === "restore") {
      const versionId = body.versionId;
      if (!versionId) {
        return NextResponse.json({ error: "versionId required" }, { status: 400 });
      }
      const restored = await restoreSiteVersion(site.id, versionId, {
        createdBy: user.id,
      });
      const versions = await listSiteVersions(site.id);
      return NextResponse.json({
        site: restored.site,
        versions,
        message: "Version restored",
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Version action failed" },
      { status: 400 },
    );
  }
}
