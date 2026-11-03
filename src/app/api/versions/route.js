import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import {
  listVersions,
  getVersion,
  restoreVersion,
  saveSnapshot,
  autoSaveVersion,
  deleteVersion,
} from "@/lib/version-history";

/**
 * GET /api/versions?conversationId=123
 * List all versions for a conversation
 */
export async function GET(request) {
  try {
    const user = await requireUser(["owner", "admin"]);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId required" }, { status: 400 });
    }

    // Verify ownership
    const siteResult = await query(
      `SELECT owner_id FROM conversations WHERE id = $1`,
      [conversationId]
    );

    if (siteResult.rows.length === 0) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    if (siteResult.rows[0].owner_id !== user.id && user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const versions = await listVersions(conversationId, 30);

    return NextResponse.json({ versions });
  } catch (error) {
    console.error("GET /api/versions error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch versions" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/versions
 * Create a new version (snapshot or autosave) or restore a version
 */
export async function POST(request) {
  try {
    const user = await requireUser(["owner", "admin"]);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, conversationId, versionId, content, label } = body;

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId required" }, { status: 400 });
    }

    // Verify ownership through site
    const siteResult = await query(
      `SELECT s.owner_id 
       FROM conversations c
       JOIN sites s ON c.site_id = s.id
       WHERE c.id = $1`,
      [conversationId]
    );

    if (siteResult.rows.length === 0) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    if (siteResult.rows[0].owner_id !== user.id && user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (action === "snapshot") {
      if (!content) {
        return NextResponse.json({ error: "content required" }, { status: 400 });
      }

      const version = await saveSnapshot(conversationId, content, user.id, label);
      return NextResponse.json({ version, saved: true });
    }

    if (action === "autosave") {
      if (!content) {
        return NextResponse.json({ error: "content required" }, { status: 400 });
      }

      const version = await autoSaveVersion(conversationId, content, user.id);
      
      if (!version) {
        return NextResponse.json({ throttled: true, saved: false });
      }

      return NextResponse.json({ version, saved: true });
    }

    if (action === "restore") {
      if (!versionId) {
        return NextResponse.json({ error: "versionId required" }, { status: 400 });
      }

      const result = await restoreVersion(conversationId, versionId, user.id);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/versions error:", error);
    return NextResponse.json(
      { error: error.message || "Version operation failed" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/versions/:id
 * Delete an autosave version
 */
export async function DELETE(request) {
  try {
    const user = await requireUser(["owner", "admin"]);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const versionId = searchParams.get("id");

    if (!versionId) {
      return NextResponse.json({ error: "versionId required" }, { status: 400 });
    }

    // Get version and verify ownership
    const version = await getVersion(versionId);
    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    const siteResult = await query(
      `SELECT s.owner_id 
       FROM conversations c
       JOIN sites s ON c.site_id = s.id
       WHERE c.id = $1`,
      [version.conversation_id]
    );

    if (siteResult.rows.length === 0) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    if (siteResult.rows[0].owner_id !== user.id && user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await deleteVersion(versionId, user.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("DELETE /api/versions error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete version" },
      { status: 500 }
    );
  }
}
