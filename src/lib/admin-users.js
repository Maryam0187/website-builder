import { randomBytes } from "crypto";
import { query, toInt } from "./db";
import { getUserById, hashPassword, publicUser } from "./auth";
import { MAX_WEBSITE_SLOTS } from "./billing";
import { getConversationByEmail, listSitesByOwner } from "./store-actions";

const BILLING_STUCK = new Set(["past_due", "unpaid", "incomplete"]);

function asList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function iso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function ownerStuckReasons(user, { siteCount = 0, domainIssues = [] } = {}) {
  if (!user || user.role !== "owner") return [];
  const reasons = [];
  if (user.mustChangePassword) {
    reasons.push({
      id: "password",
      label: "Stuck on the temporary password screen",
    });
  }
  if (user.regionLocked) {
    reasons.push({ id: "region", label: "Region is locked" });
  }
  const subscription = String(user.subscriptionStatus || "none").toLowerCase();
  if (BILLING_STUCK.has(subscription)) {
    reasons.push({
      id: "billing",
      label: `Billing is ${subscription.replaceAll("_", " ")}`,
    });
  }
  if (!siteCount) {
    reasons.push({ id: "no-site", label: "No website on this account" });
  }
  for (const issue of domainIssues) {
    reasons.push({
      id: `domain-${issue.id}`,
      label: `${issue.slug} domain ${issue.domainStatus}`,
    });
  }
  return reasons;
}

function summaryFromRow(row) {
  const user = publicUser({
    id: Number(row.id),
    email: row.email,
    name: row.name,
    role: row.role,
    siteId: row.site_id == null ? null : Number(row.site_id),
    mustChangePassword: Boolean(row.must_change_password),
    paymentStatus: row.payment_status || "unpaid",
    paymentPlan: row.payment_plan || "Easy Website",
    paymentAmount: row.payment_amount || "",
    paymentNote: row.payment_note || "",
    paymentUpdatedAt: row.payment_updated_at || null,
    subscriptionStatus: row.subscription_status || "none",
    trialEndsAt: row.trial_ends_at || null,
    currentPeriodEnd: row.current_period_end || null,
    trialUsed: Boolean(row.trial_used),
    planId: row.plan_id || "free",
    stripeCustomerId: row.stripe_customer_id || null,
    stripeSubscriptionId: row.stripe_subscription_id || null,
    siteSlots: Math.max(1, Number(row.site_slots) || 1),
    region: row.region || "usa",
    regionLocked: Boolean(row.region_locked),
    totpEnabled: Boolean(row.totp_enabled),
    totpAskLife: row.totp_ask_life,
    createdAt: row.created_at,
  });
  const siteCount = Number(row.site_count) || 0;
  const liveCount = Number(row.live_count) || 0;
  const domainIssues = asList(row.domain_issues);
  return {
    ...user,
    createdAt: iso(row.created_at),
    siteCount,
    liveCount,
    totpEnabled: Boolean(row.totp_enabled),
    stuck: ownerStuckReasons(user, { siteCount, domainIssues }),
  };
}

export async function listOwnerAccounts() {
  const { rows } = await query(
    `SELECT
       u.*,
       (SELECT COUNT(*)::int FROM sites s WHERE s.owner_id = u.id) AS site_count,
       (
         SELECT COUNT(*)::int
         FROM sites s
         WHERE s.owner_id = u.id AND lower(s.status) IN ('live', 'published')
       ) AS live_count,
       COALESCE(
         (
           SELECT json_agg(json_build_object(
             'id', s.id,
             'slug', s.slug,
             'domainStatus', s.domain_status
           ))
           FROM sites s
           WHERE s.owner_id = u.id AND s.domain_status = 'failed'
         ),
         '[]'::json
       ) AS domain_issues
     FROM users u
     WHERE u.role = 'owner'
     ORDER BY u.created_at DESC, u.id DESC`,
  );
  return rows.map(summaryFromRow);
}

export async function adminAccountStats() {
  const [owners, sites, inbox] = await Promise.all([
    listOwnerAccounts(),
    query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE lower(status) IN ('live', 'published'))::int AS live
       FROM sites`,
    ),
    query(
      `SELECT
         (SELECT COUNT(*)::int FROM conversations) AS conversations,
         (
           SELECT COUNT(*)::int
           FROM messages
           WHERE read_by_admin = false AND sender IN ('guest', 'owner')
         ) AS unread`,
    ),
  ]);
  const siteRow = sites.rows[0] || {};
  const inboxRow = inbox.rows[0] || {};
  return {
    users: owners.length,
    stuck: owners.filter((owner) => owner.stuck.length > 0).length,
    sites: Number(siteRow.total) || 0,
    liveSites: Number(siteRow.live) || 0,
    conversations: Number(inboxRow.conversations) || 0,
    unread: Number(inboxRow.unread) || 0,
    owners,
  };
}

async function requireOwner(userId) {
  const id = toInt(userId);
  if (id == null) throw new Error("Owner not found");
  const user = await getUserById(id);
  if (!user || user.role !== "owner") throw new Error("Owner not found");
  return user;
}

export async function getOwnerSupportDetail(userId) {
  const user = await requireOwner(userId);
  const [sites, conversation] = await Promise.all([
    listSitesByOwner(user.id),
    getConversationByEmail(user.email),
  ]);
  const domainIssues = sites
    .filter((site) => site.domainStatus === "failed")
    .map((site) => ({
      id: site.id,
      slug: site.slug,
      domainStatus: site.domainStatus,
    }));
  const pub = publicUser(user);
  return {
    user: {
      ...pub,
      createdAt: iso(user.createdAt),
      stuck: ownerStuckReasons(pub, { siteCount: sites.length, domainIssues }),
    },
    sites,
    conversation: conversation
      ? {
          id: conversation.id,
          name: conversation.name,
          email: conversation.email,
          websiteName: conversation.websiteName,
          businessType: conversation.businessType,
          status: conversation.status,
          botOnboarded: conversation.botOnboarded,
          botStep: conversation.botStep,
        }
      : null,
    maxWebsiteSlots: MAX_WEBSITE_SLOTS,
  };
}

export function generateTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(12);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export async function adminSetTemporaryPassword(userId, password) {
  const user = await requireOwner(userId);
  const next = String(password || "").trim();
  if (next.length < 8) {
    throw new Error("Temporary password must be at least 8 characters");
  }
  const passwordHash = await hashPassword(next);
  await query(
    `UPDATE users
     SET password_hash = $2, must_change_password = true
     WHERE id = $1 AND role = 'owner'`,
    [user.id, passwordHash],
  );
  await query(`DELETE FROM sessions WHERE user_id = $1`, [user.id]);
  return getOwnerSupportDetail(user.id);
}

export async function adminClearPasswordGate(userId) {
  const user = await requireOwner(userId);
  await query(
    `UPDATE users SET must_change_password = false WHERE id = $1 AND role = 'owner'`,
    [user.id],
  );
  return getOwnerSupportDetail(user.id);
}

export async function adminDisableAuthenticator(userId) {
  const user = await requireOwner(userId);
  await query(
    `UPDATE users
     SET totp_enabled = false,
         totp_secret = NULL,
         totp_pending_secret = NULL,
         totp_ask_life = 'every'
     WHERE id = $1 AND role = 'owner'`,
    [user.id],
  );
  await query(`DELETE FROM sessions WHERE user_id = $1`, [user.id]);
  return getOwnerSupportDetail(user.id);
}

export async function adminUnlockRegion(userId) {
  const user = await requireOwner(userId);
  await query(
    `UPDATE users SET region_locked = false WHERE id = $1 AND role = 'owner'`,
    [user.id],
  );
  return getOwnerSupportDetail(user.id);
}

export async function adminSetSiteSlots(userId, siteSlots) {
  const user = await requireOwner(userId);
  const slots = Number(siteSlots);
  if (!Number.isInteger(slots) || slots < 1 || slots > MAX_WEBSITE_SLOTS) {
    throw new Error(`Website slots must be between 1 and ${MAX_WEBSITE_SLOTS}`);
  }
  await query(`UPDATE users SET site_slots = $2 WHERE id = $1 AND role = 'owner'`, [
    user.id,
    slots,
  ]);
  return getOwnerSupportDetail(user.id);
}
