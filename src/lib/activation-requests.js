import { query } from "./db";

/**
 * Schema for activation_requests table:
 * 
 * CREATE TABLE IF NOT EXISTS activation_requests (
 *   id BIGSERIAL PRIMARY KEY,
 *   user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
 *   plan_id TEXT NOT NULL,
 *   site_id BIGINT NULL REFERENCES sites(id) ON DELETE SET NULL,
 *   region TEXT NOT NULL,
 *   name TEXT NOT NULL,
 *   email TEXT NOT NULL,
 *   phone TEXT NOT NULL,
 *   whatsapp TEXT NULL,
 *   message TEXT NULL,
 *   status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'activated', 'rejected')),
 *   activated_by_user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
 *   activated_at TIMESTAMPTZ NULL,
 *   created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 *   updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
 * );
 */

/**
 * Create activation request
 */
export async function createActivationRequest({
  userId = null,
  planId,
  siteId = null,
  region,
  name,
  email,
  phone,
  whatsapp = null,
  message = null,
}) {
  const result = await query(
    `INSERT INTO activation_requests 
     (user_id, plan_id, site_id, region, name, email, phone, whatsapp, message, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
     RETURNING *`,
    [userId, planId, siteId, region, name, email, phone, whatsapp, message]
  );
  
  return result.rows[0];
}

/**
 * List activation requests (admin)
 */
export async function listActivationRequests({ status = null, limit = 50, offset = 0 } = {}) {
  let sql = `
    SELECT 
      ar.*,
      u.email as user_email,
      u.name as user_name,
      s.subdomain as site_subdomain,
      activated_by.email as activated_by_email,
      activated_by.name as activated_by_name
    FROM activation_requests ar
    LEFT JOIN users u ON ar.user_id = u.id
    LEFT JOIN sites s ON ar.site_id = s.id
    LEFT JOIN users activated_by ON ar.activated_by_user_id = activated_by.id
  `;
  
  const params = [];
  if (status) {
    sql += ` WHERE ar.status = $1`;
    params.push(status);
    sql += ` ORDER BY ar.created_at DESC LIMIT $2 OFFSET $3`;
    params.push(limit, offset);
  } else {
    sql += ` ORDER BY ar.created_at DESC LIMIT $1 OFFSET $2`;
    params.push(limit, offset);
  }
  
  const result = await query(sql, params);
  return result.rows;
}

/**
 * Get activation request by ID
 */
export async function getActivationRequest(id) {
  const result = await query(
    `SELECT 
      ar.*,
      u.email as user_email,
      u.name as user_name,
      s.subdomain as site_subdomain
    FROM activation_requests ar
    LEFT JOIN users u ON ar.user_id = u.id
    LEFT JOIN sites s ON ar.site_id = s.id
    WHERE ar.id = $1`,
    [id]
  );
  
  return result.rows[0];
}

/**
 * Update activation request status
 */
export async function updateActivationRequestStatus(id, status, activatedByUserId = null) {
  const result = await query(
    `UPDATE activation_requests 
     SET status = $1, 
         activated_by_user_id = $2,
         activated_at = CASE WHEN $1 = 'activated' THEN now() ELSE activated_at END,
         updated_at = now()
     WHERE id = $3
     RETURNING *`,
    [status, activatedByUserId, id]
  );
  
  return result.rows[0];
}
