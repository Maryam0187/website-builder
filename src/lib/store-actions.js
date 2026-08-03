import { query, token, toInt, withTransaction } from "./db";
import {
  addPageToContent,
  createDefaultSiteContent,
  normalizeSiteContent,
  slugify,
} from "./site-defaults";
import { hashPassword } from "./auth";

function mapConversation(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    websiteName: row.website_name || "",
    phone: row.phone || "",
    businessType: row.business_type || "",
    accessToken: row.access_token,
    emailVerified: Boolean(row.email_verified),
    emailVerifiedAt: row.email_verified_at || null,
    siteId: row.site_id == null ? null : Number(row.site_id),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMessage(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    conversationId: Number(row.conversation_id),
    sender: row.sender,
    body: row.body,
    images: Array.isArray(row.images) ? row.images : row.images || [],
    system: Boolean(row.system),
    readByAdmin: Boolean(row.read_by_admin),
    createdAt: row.created_at,
  };
}

function mapSite(row) {
  if (!row) return null;
  const content =
    typeof row.content === "string" ? JSON.parse(row.content) : row.content || {};
  return {
    id: Number(row.id),
    slug: row.slug,
    conversationId: row.conversation_id == null ? null : Number(row.conversation_id),
    ownerId: row.owner_id == null ? null : Number(row.owner_id),
    status: row.status,
    content: normalizeSiteContent(content),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function withNormalizedContent(site) {
  return site;
}

export async function listConversations() {
  const { rows } = await query(
    `SELECT
       c.*,
       COUNT(m.id)::int AS message_count,
       COUNT(m.id) FILTER (
         WHERE m.read_by_admin = false AND m.sender IN ('guest', 'owner')
       )::int AS unread_for_admin,
       (
         SELECT json_build_object(
           'id', lm.id,
           'conversationId', lm.conversation_id,
           'sender', lm.sender,
           'body', lm.body,
           'images', lm.images,
           'system', lm.system,
           'readByAdmin', lm.read_by_admin,
           'createdAt', lm.created_at
         )
         FROM messages lm
         WHERE lm.conversation_id = c.id
         ORDER BY lm.created_at DESC
         LIMIT 1
       ) AS last_message
     FROM conversations c
     LEFT JOIN messages m ON m.conversation_id = c.id
     GROUP BY c.id
     ORDER BY c.updated_at DESC`,
  );

  return rows.map((row) => ({
    ...mapConversation(row),
    messageCount: row.message_count || 0,
    lastMessage: row.last_message || null,
    unreadForAdmin: row.unread_for_admin || 0,
  }));
}

export async function getConversation(conversationId) {
  const id = toInt(conversationId);
  if (id == null) return null;

  const convRes = await query(`SELECT * FROM conversations WHERE id = $1`, [id]);
  const conversation = mapConversation(convRes.rows[0]);
  if (!conversation) return null;

  const msgRes = await query(
    `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
    [id],
  );

  return {
    conversation,
    messages: msgRes.rows.map(mapMessage),
  };
}

export async function getConversationByToken(accessToken) {
  const { rows } = await query(`SELECT * FROM conversations WHERE access_token = $1`, [
    accessToken,
  ]);
  const conversation = mapConversation(rows[0]);
  if (!conversation) return null;

  const msgRes = await query(
    `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
    [conversation.id],
  );

  return {
    conversation,
    messages: msgRes.rows.map(mapMessage),
  };
}

export async function getConversationByEmail(email) {
  const normalizedEmail = String(email || "").toLowerCase().trim();
  if (!normalizedEmail) return null;
  const { rows } = await query(
    `SELECT * FROM conversations WHERE lower(email) = lower($1) LIMIT 1`,
    [normalizedEmail],
  );
  return mapConversation(rows[0]);
}

/**
 * One chat per email. If email exists, append message and return existing token.
 * If new, create conversation.
 */
export async function createOrContinueConversation({
  name,
  email,
  websiteName,
  phone,
  businessType,
  message,
  images = [],
}) {
  const normalizedEmail = String(email || "").toLowerCase().trim();
  const siteName = String(websiteName || "").trim();
  const existing = await getConversationByEmail(normalizedEmail);

  if (existing) {
    await addMessage({
      conversationId: existing.id,
      sender: "guest",
      body: message,
      images,
    });
    // Refresh profile fields on the existing conversation
    await query(
      `UPDATE conversations
       SET name = COALESCE(NULLIF($2, ''), name),
           website_name = COALESCE(NULLIF($3, ''), website_name),
           phone = COALESCE(NULLIF($4, ''), phone),
           business_type = COALESCE(NULLIF($5, ''), business_type),
           updated_at = now()
       WHERE id = $1`,
      [existing.id, name, siteName, phone || "", businessType || ""],
    );
    return {
      conversationId: existing.id,
      accessToken: existing.accessToken,
      email: normalizedEmail,
      websiteName: siteName || existing.websiteName,
      existing: true,
    };
  }

  return createConversation({
    name,
    email: normalizedEmail,
    websiteName: siteName,
    phone,
    businessType,
    message,
    images,
  });
}

export async function createConversation({
  name,
  email,
  websiteName,
  phone,
  businessType,
  message,
  images = [],
}) {
  const normalizedEmail = String(email || "").toLowerCase().trim();
  const siteName = String(websiteName || "").trim();
  const accessToken = token("tok");

  return withTransaction(async (client) => {
    const existing = await client.query(
      `SELECT id FROM conversations WHERE lower(email) = lower($1) LIMIT 1`,
      [normalizedEmail],
    );
    if (existing.rows.length) {
      throw new Error("This email already has a conversation. Use the chat link from your email.");
    }

    const convRes = await client.query(
      `INSERT INTO conversations
        (name, email, website_name, phone, business_type, access_token, email_verified, status)
       VALUES ($1, $2, $3, $4, $5, $6, false, 'open')
       RETURNING *`,
      [name, normalizedEmail, siteName, phone || "", businessType || "", accessToken],
    );
    const conversation = mapConversation(convRes.rows[0]);

    await client.query(
      `INSERT INTO messages (conversation_id, sender, body, images, system, read_by_admin)
       VALUES ($1, 'guest', $2, $3::jsonb, false, false)`,
      [conversation.id, message, JSON.stringify(images || [])],
    );

    return {
      conversationId: conversation.id,
      accessToken,
      email: normalizedEmail,
      websiteName: siteName,
      existing: false,
    };
  });
}

export async function markConversationEmailVerified(accessToken) {
  const { rowCount } = await query(
    `UPDATE conversations
     SET email_verified = true,
         email_verified_at = COALESCE(email_verified_at, now()),
         updated_at = now()
     WHERE access_token = $1 AND email_verified = false`,
    [accessToken],
  );
  return rowCount > 0;
}

export async function addMessage({ conversationId, sender, body, images = [], system = false }) {
  const id = toInt(conversationId);
  if (id == null) throw new Error("Conversation not found");

  return withTransaction(async (client) => {
    const exists = await client.query(`SELECT id FROM conversations WHERE id = $1`, [id]);
    if (!exists.rows.length) throw new Error("Conversation not found");

    const msgRes = await client.query(
      `INSERT INTO messages (conversation_id, sender, body, images, system, read_by_admin)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6)
       RETURNING *`,
      [
        id,
        sender,
        body,
        JSON.stringify(images || []),
        Boolean(system),
        sender === "admin",
      ],
    );

    await client.query(`UPDATE conversations SET updated_at = now() WHERE id = $1`, [id]);
    return mapMessage(msgRes.rows[0]);
  });
}

export async function markConversationRead(conversationId) {
  const id = toInt(conversationId);
  if (id == null) return;
  await query(`UPDATE messages SET read_by_admin = true WHERE conversation_id = $1`, [id]);
}

export async function getSiteById(siteId) {
  const id = toInt(siteId);
  if (id == null) return null;
  const { rows } = await query(`SELECT * FROM sites WHERE id = $1`, [id]);
  return withNormalizedContent(mapSite(rows[0]));
}

export async function getSiteBySlug(slug) {
  const { rows } = await query(`SELECT * FROM sites WHERE slug = $1`, [slug]);
  return withNormalizedContent(mapSite(rows[0]));
}

export async function updateSiteContent(siteId, content) {
  const id = toInt(siteId);
  if (id == null) throw new Error("Site not found");
  const normalized = normalizeSiteContent(content);
  const { rowCount } = await query(
    `UPDATE sites SET content = $2::jsonb, updated_at = now() WHERE id = $1`,
    [id, JSON.stringify(normalized)],
  );
  if (!rowCount) throw new Error("Site not found");
  return getSiteById(id);
}

export async function addSitePage(siteId, { type, label, pageId } = {}) {
  const id = toInt(siteId);
  if (id == null) throw new Error("Site not found");

  const site = await getSiteById(id);
  if (!site) throw new Error("Site not found");

  const nextContent = addPageToContent(site.content, { type, label, pageId });
  await query(`UPDATE sites SET content = $2::jsonb, updated_at = now() WHERE id = $1`, [
    id,
    JSON.stringify(nextContent),
  ]);
  return getSiteById(id);
}

export async function createDraftFromConversation({
  conversationId,
  brandName,
  ownerEmail,
  ownerPassword,
  phone,
  address,
  layout = "multi-page",
  contentOverrides,
}) {
  const convId = toInt(conversationId);
  if (convId == null) throw new Error("Conversation not found");

  const convRes = await query(`SELECT * FROM conversations WHERE id = $1`, [convId]);
  const conversation = mapConversation(convRes.rows[0]);
  if (!conversation) throw new Error("Conversation not found");

  const email = String(ownerEmail || "").toLowerCase().trim();
  const existingUser = await query(`SELECT id FROM users WHERE email = $1`, [email]);
  if (existingUser.rows.length) throw new Error("Owner email already exists");

  const baseSlug = slugify(brandName || conversation.name || "business");
  let slug = baseSlug;
  let i = 1;
  while (true) {
    const slugCheck = await query(`SELECT id FROM sites WHERE slug = $1`, [slug]);
    if (!slugCheck.rows.length) break;
    slug = `${baseSlug}-${i++}`;
  }

  const resolvedLayout = layout === "one-page" ? "one-page" : "multi-page";
  const content = normalizeSiteContent({
    ...createDefaultSiteContent({
      brandName: brandName || conversation.name || "Your Business",
      phone: phone || conversation.phone || "",
      address: address || "",
      layout: resolvedLayout,
    }),
    ...(contentOverrides || {}),
    layout: resolvedLayout,
  });

  const passwordHash = await hashPassword(ownerPassword);

  return withTransaction(async (client) => {
    const siteRes = await client.query(
      `INSERT INTO sites (slug, conversation_id, owner_id, status, content)
       VALUES ($1, $2, NULL, 'draft', $3::jsonb)
       RETURNING *`,
      [slug, convId, JSON.stringify(content)],
    );
    const site = mapSite(siteRes.rows[0]);

    const userRes = await client.query(
      `INSERT INTO users (email, name, role, site_id, password_hash, must_change_password)
       VALUES ($1, $2, 'owner', $3, $4, true)
       RETURNING *`,
      [email, brandName || conversation.name || "Site owner", site.id, passwordHash],
    );
    const ownerId = Number(userRes.rows[0].id);

    await client.query(`UPDATE sites SET owner_id = $2, updated_at = now() WHERE id = $1`, [
      site.id,
      ownerId,
    ]);
    await client.query(
      `UPDATE conversations SET site_id = $2, updated_at = now() WHERE id = $1`,
      [convId, site.id],
    );

    return {
      siteId: site.id,
      slug,
      ownerEmail: email,
      ownerPassword,
      layout: resolvedLayout,
    };
  });
}

export async function listSites() {
  const { rows } = await query(`SELECT * FROM sites ORDER BY updated_at DESC`);
  return rows.map((row) => withNormalizedContent(mapSite(row)));
}

export async function deleteSite(siteId) {
  const id = toInt(siteId);
  if (id == null) throw new Error("Site not found");

  return withTransaction(async (client) => {
    const siteRes = await client.query(`SELECT * FROM sites WHERE id = $1`, [id]);
    const site = mapSite(siteRes.rows[0]);
    if (!site) throw new Error("Site not found");

    await client.query(
      `UPDATE conversations SET site_id = NULL, updated_at = now() WHERE site_id = $1`,
      [id],
    );

    // Delete owner login(s); sessions cascade via FK
    await client.query(
      `DELETE FROM users WHERE role = 'owner' AND (id = $1 OR site_id = $2)`,
      [site.ownerId, id],
    );

    await client.query(`DELETE FROM sites WHERE id = $1`, [id]);

    return {
      id: site.id,
      slug: site.slug,
      conversationId: site.conversationId,
    };
  });
}
