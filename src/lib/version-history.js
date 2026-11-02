import { query } from "./db";

const MAX_VERSIONS = 30;
const AUTOSAVE_THROTTLE_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Save a new version of a conversation
 */
export async function saveConversationVersion(
  conversationId,
  content,
  userId,
  options = {}
) {
  const { label = null, isAutosave = false, isSnapshot = false } = options;

  // Get current version count
  const countResult = await query(
    `SELECT COUNT(*) as count FROM conversation_versions WHERE conversation_id = $1`,
    [conversationId]
  );
  const versionCount = parseInt(countResult.rows[0].count, 10);

  // Get highest version number
  const maxResult = await query(
    `SELECT COALESCE(MAX(version_number), 0) as max_version FROM conversation_versions WHERE conversation_id = $1`,
    [conversationId]
  );
  const nextVersion = parseInt(maxResult.rows[0].max_version, 10) + 1;

  // If at max capacity, delete oldest autosave (never delete snapshots)
  if (versionCount >= MAX_VERSIONS) {
    await query(
      `DELETE FROM conversation_versions 
       WHERE id IN (
         SELECT id FROM conversation_versions 
         WHERE conversation_id = $1 AND is_autosave = true 
         ORDER BY created_at ASC 
         LIMIT 1
       )`,
      [conversationId]
    );
  }

  // Insert new version
  const result = await query(
    `INSERT INTO conversation_versions 
     (conversation_id, version_number, content, created_by_user_id, label, is_autosave, is_snapshot)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [conversationId, nextVersion, JSON.stringify(content), userId, label, isAutosave, isSnapshot]
  );

  return result.rows[0];
}

/**
 * Check if autosave is throttled (last autosave < 10 min ago)
 */
export async function shouldThrottleAutosave(conversationId) {
  const result = await query(
    `SELECT created_at FROM conversation_versions 
     WHERE conversation_id = $1 AND is_autosave = true 
     ORDER BY created_at DESC 
     LIMIT 1`,
    [conversationId]
  );

  if (result.rows.length === 0) {
    return false; // No autosaves yet, allow
  }

  const lastAutosave = new Date(result.rows[0].created_at);
  const now = new Date();
  const elapsed = now - lastAutosave;

  return elapsed < AUTOSAVE_THROTTLE_MS;
}

/**
 * Auto-save a version (throttled to 10 minutes)
 */
export async function autoSaveVersion(conversationId, content, userId) {
  if (await shouldThrottleAutosave(conversationId)) {
    return null; // Throttled, skip
  }

  return await saveConversationVersion(conversationId, content, userId, {
    isAutosave: true,
  });
}

/**
 * Save a snapshot version (explicit user action, e.g., "Publish")
 */
export async function saveSnapshot(conversationId, content, userId, label = null) {
  return await saveConversationVersion(conversationId, content, userId, {
    isSnapshot: true,
    label: label || `Snapshot ${new Date().toISOString()}`,
  });
}

/**
 * List all versions for a conversation
 */
export async function listVersions(conversationId, limit = 30) {
  const result = await query(
    `SELECT 
       cv.id,
       cv.version_number,
       cv.created_at,
       cv.label,
       cv.is_autosave,
       cv.is_snapshot,
       u.email as created_by_email,
       u.name as created_by_name
     FROM conversation_versions cv
     LEFT JOIN users u ON cv.created_by_user_id = u.id
     WHERE cv.conversation_id = $1
     ORDER BY cv.created_at DESC
     LIMIT $2`,
    [conversationId, limit]
  );

  return result.rows;
}

/**
 * Get a specific version by ID
 */
export async function getVersion(versionId) {
  const result = await query(
    `SELECT * FROM conversation_versions WHERE id = $1`,
    [versionId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Restore a version (updates the conversation's content)
 */
export async function restoreVersion(conversationId, versionId, userId) {
  // Get the version
  const version = await getVersion(versionId);
  if (!version || version.conversation_id !== conversationId) {
    throw new Error("Version not found or does not belong to this conversation");
  }

  // Update the conversation with the version's content
  await query(
    `UPDATE conversations SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [version.content, conversationId]
  );

  // Create a new snapshot marking the restore
  await saveConversationVersion(conversationId, JSON.parse(version.content), userId, {
    isSnapshot: true,
    label: `Restored from v${version.version_number}`,
  });

  return { conversationId, restored: true };
}

/**
 * Delete a version (only autosaves can be deleted by users)
 */
export async function deleteVersion(versionId, userId) {
  const version = await getVersion(versionId);
  if (!version) {
    throw new Error("Version not found");
  }

  if (version.is_snapshot) {
    throw new Error("Cannot delete snapshot versions");
  }

  await query(`DELETE FROM conversation_versions WHERE id = $1`, [versionId]);
  return { deleted: true };
}
