import { query } from "./db";

/**
 * Verify that a user owns a resource
 * Throws 403 error if not authorized
 */
export async function requireOwnership(userId, resourceType, resourceId) {
  if (!userId) {
    throw new Error("Authentication required");
  }

  let result;
  
  switch (resourceType) {
    case 'conversation':
    case 'site':
      result = await query(
        `SELECT owner_id FROM conversations WHERE id = $1`,
        [resourceId]
      );
      break;
      
    case 'invoice':
      result = await query(
        `SELECT user_id as owner_id FROM invoices WHERE id = $1`,
        [resourceId]
      );
      break;
      
    case 'discount_redemption':
      result = await query(
        `SELECT user_id as owner_id FROM discount_redemptions WHERE id = $1`,
        [resourceId]
      );
      break;
      
    case 'version':
      result = await query(`
        SELECT c.owner_id 
        FROM conversation_versions cv
        JOIN conversations c ON cv.conversation_id = c.id
        WHERE cv.id = $1
      `, [resourceId]);
      break;
      
    default:
      throw new Error(`Unknown resource type: ${resourceType}`);
  }

  if (result.rows.length === 0) {
    const error = new Error("Resource not found");
    error.statusCode = 404;
    throw error;
  }

  const ownerId = result.rows[0].owner_id;
  
  if (ownerId !== userId) {
    const error = new Error("Forbidden: You don't have access to this resource");
    error.statusCode = 403;
    throw error;
  }

  return true;
}

/**
 * Verify conversation/site ownership by ID
 */
export async function requireSiteOwnership(userId, siteId) {
  return requireOwnership(userId, 'conversation', siteId);
}

/**
 * Verify invoice ownership
 */
export async function requireInvoiceOwnership(userId, invoiceId) {
  return requireOwnership(userId, 'invoice', invoiceId);
}

/**
 * Verify version ownership (via parent conversation)
 */
export async function requireVersionOwnership(userId, versionId) {
  return requireOwnership(userId, 'version', versionId);
}

/**
 * Get conversation ID and verify ownership in one query
 */
export async function getOwnedConversation(userId, conversationId) {
  const result = await query(
    `SELECT * FROM conversations WHERE id = $1 AND owner_id = $2`,
    [conversationId, userId]
  );

  if (result.rows.length === 0) {
    const error = new Error("Site not found or access denied");
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
}

/**
 * Get invoice and verify ownership
 */
export async function getOwnedInvoice(userId, invoiceId) {
  const result = await query(
    `SELECT * FROM invoices WHERE id = $1 AND user_id = $2`,
    [invoiceId, userId]
  );

  if (result.rows.length === 0) {
    const error = new Error("Invoice not found or access denied");
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
}
