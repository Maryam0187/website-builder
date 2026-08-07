import { NextResponse } from "next/server";
import { denyIfMustChangePassword, requireUser } from "@/lib/auth";
import { getSiteById, setSiteTemplate } from "@/lib/store-actions";
import { listTemplates } from "@/lib/templates";

export async function GET() {
  return NextResponse.json({ templates: listTemplates() });
}

export async function POST(request) {
  const user = await requireUser(["admin", "owner"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const blocked = denyIfMustChangePassword(user);
  if (blocked) return blocked;

  const body = await request.json();
  const siteId = body.siteId;
  const template = String(body.template || "").trim();

  if (!siteId || !template) {
    return NextResponse.json({ error: "siteId and template are required" }, { status: 400 });
  }

  const site = await getSiteById(siteId);
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role === "owner" && Number(site.id) !== Number(user.siteId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const updated = await setSiteTemplate(siteId, template);
    return NextResponse.json({ site: updated, templates: listTemplates() });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to change template" }, { status: 400 });
  }
}
