import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  adminClearPasswordGate,
  adminDisableAuthenticator,
  adminSetSiteSlots,
  adminSetTemporaryPassword,
  adminUnlockRegion,
  getOwnerSupportDetail,
} from "@/lib/admin-users";

async function adminOnly() {
  const user = await requireUser(["admin"]);
  if (!user) return null;
  return user;
}

export async function GET(_request, { params }) {
  if (!(await adminOnly())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const detail = await getOwnerSupportDetail(id);
    return NextResponse.json(detail);
  } catch (err) {
    const message = err.message || "Owner not found";
    const status = message === "Owner not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request, { params }) {
  if (!(await adminOnly())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const action = String(body.action || "");

  try {
    if (action === "set-temp-password") {
      const detail = await adminSetTemporaryPassword(id, body.password);
      return NextResponse.json({
        ...detail,
        temporaryPassword: String(body.password || ""),
        notice: "Temporary password saved. They must change it at next sign-in.",
      });
    }
    if (action === "clear-password-gate") {
      return NextResponse.json(await adminClearPasswordGate(id));
    }
    if (action === "disable-authenticator") {
      return NextResponse.json(await adminDisableAuthenticator(id));
    }
    if (action === "unlock-region") {
      return NextResponse.json(await adminUnlockRegion(id));
    }
    if (action === "set-site-slots") {
      return NextResponse.json(await adminSetSiteSlots(id, body.siteSlots));
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    const message = err.message || "Update failed";
    const status = message === "Owner not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
