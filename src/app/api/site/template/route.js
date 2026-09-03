import { NextResponse } from "next/server";
import { denyIfMustChangePassword, getUserById, publicUser, requireUser } from "@/lib/auth";
import {
  billingPublicFields,
  canChangeTemplate,
  canUseTemplate,
} from "@/lib/billing";
import { getSiteById, ownerOwnsSite, setSiteTemplate } from "@/lib/store-actions";
import { listTemplates } from "@/lib/templates";

function mapTemplatesForUser(user, currentTemplateId) {
  const fresh = user;
  return listTemplates().map((t) => {
    const allowed = !fresh || fresh.role !== "owner" || canUseTemplate(fresh, t.id);
    const canSwitch =
      !fresh ||
      fresh.role !== "owner" ||
      canChangeTemplate(fresh, currentTemplateId, t.id);
    return {
      ...t,
      locked: Boolean(fresh?.role === "owner" && (!allowed || !canSwitch)),
      lockReason:
        fresh?.role === "owner" && !allowed
          ? "Upgrade to use this template"
          : null,
    };
  });
}

export async function GET() {
  const user = await requireUser(["admin", "owner"]);
  const fresh = user ? publicUser(await getUserById(user.id)) : null;
  let currentTemplateId = null;
  if (fresh?.siteId) {
    const site = await getSiteById(fresh.siteId);
    currentTemplateId = site?.content?.template || null;
  }
  const billing = billingPublicFields(fresh);
  return NextResponse.json({
    templates: mapTemplatesForUser(fresh, currentTemplateId),
    billing,
  });
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
  if (user.role === "owner" && !ownerOwnsSite(user, site)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const fresh = publicUser(await getUserById(user.id));
  const currentTemplate = site.content?.template;

  if (user.role === "owner" && !canUseTemplate(fresh, template)) {
    return NextResponse.json(
      {
        error: "This template is not available on your plan. Upgrade in Profile.",
        code: "TEMPLATE_LOCKED",
        billing: billingPublicFields(fresh),
      },
      { status: 402 },
    );
  }

  if (user.role === "owner" && !canChangeTemplate(fresh, currentTemplate, template)) {
    return NextResponse.json(
      {
        error: "You cannot change to this template on your current plan.",
        code: "TEMPLATE_SWITCH_LOCKED",
        billing: billingPublicFields(fresh),
      },
      { status: 402 },
    );
  }

  try {
    const updated = await setSiteTemplate(siteId, template);
    return NextResponse.json({
      site: updated,
      templates: mapTemplatesForUser(fresh, template),
      billing: billingPublicFields(fresh),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to change template" }, { status: 400 });
  }
}
