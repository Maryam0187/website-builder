import { query } from "./db";

/**
 * Check if user is admin based on ADMIN_EMAILS environment variable
 * Format: ADMIN_EMAILS=admin@example.com,other@example.com
 */
export function isAdmin(user) {
  if (!user?.email) return false;
  
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  
  if (adminEmails.length === 0) return false;
  
  return adminEmails.includes(user.email.toLowerCase());
}

/**
 * Require admin access for API routes
 */
export function requireAdmin(user) {
  if (!user) {
    throw new Error("Authentication required");
  }
  
  if (!isAdmin(user)) {
    throw new Error("Admin access required");
  }
  
  return user;
}

/**
 * Get admin user info (for audit logs)
 */
export async function getAdminUserInfo(userId) {
  const result = await query(
    `SELECT id, email, name FROM users WHERE id = $1`,
    [userId]
  );
  
  return result.rows[0] || null;
}
