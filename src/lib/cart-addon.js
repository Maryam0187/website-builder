import { query } from "./db";
import { getUserById } from "./auth";

export const CART_ADDON_ID = "cart";

export async function ownerHasCartAddon(userId) {
  const id = Number(userId);
  if (!Number.isFinite(id)) return false;
  const user = await getUserById(id);
  if (!user) return false;
  if (user.role === "admin") return true;
  const { rows } = await query(
    `SELECT 1 FROM invoices
     WHERE user_id = $1 AND status = 'paid' AND addon_id = $2
     LIMIT 1`,
    [id, CART_ADDON_ID],
  );
  return Boolean(rows[0]);
}

/** Apply cart add-on flag onto site content for preview / live / editor. */
export function applyCartAddonToContent(content, enabled) {
  const base =
    content && typeof content === "object" ? structuredClone(content) : {};
  const features = { ...(base.features || {}) };
  features.commerce = Boolean(enabled);
  base.features = features;
  if (base.pages && typeof base.pages === "object") {
    for (const page of Object.values(base.pages)) {
      if (page && typeof page === "object" && "commerce" in page) {
        page.commerce = Boolean(enabled);
      }
    }
  }
  return base;
}

export async function withCartAddonGate(site) {
  if (!site) return null;
  const enabled = site.ownerId ? await ownerHasCartAddon(site.ownerId) : false;
  return {
    ...site,
    content: applyCartAddonToContent(site.content, enabled),
  };
}
