import { id, readStore, updateStore } from "./db";
import {
  addPageToContent,
  createDefaultSiteContent,
  normalizeSiteContent,
  slugify,
} from "./site-defaults";
import { hashPassword } from "./auth";

function withNormalizedContent(site) {
  if (!site) return null;
  return { ...site, content: normalizeSiteContent(site.content) };
}

export async function listConversations() {
  const store = await readStore();
  return store.conversations
    .map((c) => {
      const msgs = store.messages.filter((m) => m.conversationId === c.id);
      const last = msgs[msgs.length - 1] || null;
      return {
        ...c,
        messageCount: msgs.length,
        lastMessage: last,
        unreadForAdmin: msgs.filter((m) => m.sender === "guest" || m.sender === "owner").filter((m) => !m.readByAdmin).length,
      };
    })
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export async function getConversation(conversationId) {
  const store = await readStore();
  const conversation = store.conversations.find((c) => c.id === conversationId);
  if (!conversation) return null;
  const messages = store.messages
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  return { conversation, messages };
}

export async function getConversationByToken(token) {
  const store = await readStore();
  const conversation = store.conversations.find((c) => c.accessToken === token);
  if (!conversation) return null;
  const messages = store.messages
    .filter((m) => m.conversationId === conversation.id)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  return { conversation, messages };
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
  const now = new Date().toISOString();
  const conversationId = id("conv");
  const accessToken = id("tok");
  const normalizedEmail = String(email || "").toLowerCase().trim();
  const siteName = String(websiteName || "").trim();

  await updateStore((store) => {
    store.conversations.push({
      id: conversationId,
      name,
      email: normalizedEmail,
      websiteName: siteName,
      phone: phone || "",
      businessType: businessType || "",
      accessToken,
      emailVerified: false,
      siteId: null,
      status: "open",
      createdAt: now,
      updatedAt: now,
    });
    store.messages.push({
      id: id("msg"),
      conversationId,
      sender: "guest",
      body: message,
      images,
      readByAdmin: false,
      createdAt: now,
    });
    return store;
  });

  return { conversationId, accessToken, email: normalizedEmail, websiteName: siteName };
}

export async function markConversationEmailVerified(accessToken) {
  let verified = false;
  await updateStore((store) => {
    const conversation = store.conversations.find((c) => c.accessToken === accessToken);
    if (!conversation) return store;
    if (!conversation.emailVerified) {
      conversation.emailVerified = true;
      conversation.emailVerifiedAt = new Date().toISOString();
      conversation.updatedAt = new Date().toISOString();
      verified = true;
    }
    return store;
  });
  return verified;
}

export async function addMessage({ conversationId, sender, body, images = [], system = false }) {
  const now = new Date().toISOString();
  const message = {
    id: id("msg"),
    conversationId,
    sender,
    body,
    images,
    system,
    readByAdmin: sender === "admin",
    createdAt: now,
  };

  await updateStore((store) => {
    const conversation = store.conversations.find((c) => c.id === conversationId);
    if (!conversation) throw new Error("Conversation not found");
    conversation.updatedAt = now;
    store.messages.push(message);
    return store;
  });

  return message;
}

export async function markConversationRead(conversationId) {
  await updateStore((store) => {
    store.messages.forEach((m) => {
      if (m.conversationId === conversationId) m.readByAdmin = true;
    });
    return store;
  });
}

export async function getSiteById(siteId) {
  const store = await readStore();
  return withNormalizedContent(store.sites.find((s) => s.id === siteId) || null);
}

export async function getSiteBySlug(slug) {
  const store = await readStore();
  return withNormalizedContent(store.sites.find((s) => s.slug === slug) || null);
}

export async function updateSiteContent(siteId, content) {
  await updateStore((store) => {
    const site = store.sites.find((s) => s.id === siteId);
    if (!site) throw new Error("Site not found");
    site.content = normalizeSiteContent(content);
    site.updatedAt = new Date().toISOString();
    return store;
  });
  return getSiteById(siteId);
}

export async function addSitePage(siteId, { type, label, pageId } = {}) {
  let updatedContent;
  await updateStore((store) => {
    const site = store.sites.find((s) => s.id === siteId);
    if (!site) throw new Error("Site not found");
    updatedContent = addPageToContent(site.content, { type, label, pageId });
    site.content = updatedContent;
    site.updatedAt = new Date().toISOString();
    return store;
  });
  return getSiteById(siteId);
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
  const store = await readStore();
  const conversation = store.conversations.find((c) => c.id === conversationId);
  if (!conversation) throw new Error("Conversation not found");

  const baseSlug = slugify(brandName || conversation.name || "business");
  let slug = baseSlug;
  let i = 1;
  while (store.sites.some((s) => s.slug === slug)) {
    slug = `${baseSlug}-${i++}`;
  }

  const siteId = id("site");
  const userId = id("user");
  const now = new Date().toISOString();
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
  const email = ownerEmail.toLowerCase();

  await updateStore((s) => {
    if (s.users.some((u) => u.email === email)) {
      throw new Error("Owner email already exists");
    }

    s.sites.push({
      id: siteId,
      slug,
      conversationId,
      ownerId: userId,
      status: "draft",
      content,
      createdAt: now,
      updatedAt: now,
    });

    s.users.push({
      id: userId,
      email,
      name: brandName || conversation.name || "Site owner",
      role: "owner",
      siteId,
      passwordHash,
      mustChangePassword: true,
      createdAt: now,
    });

    const conv = s.conversations.find((c) => c.id === conversationId);
    conv.siteId = siteId;
    conv.updatedAt = now;

    return s;
  });

  return { siteId, slug, ownerEmail: email, ownerPassword, layout: resolvedLayout };
}

export async function listSites() {
  const store = await readStore();
  return store.sites
    .map((site) => withNormalizedContent(site))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

/**
 * Admin: delete a site, its owner login(s), and unlink the conversation
 * so a new draft can be created from the same chat.
 */
export async function deleteSite(siteId) {
  let deleted = null;
  await updateStore((store) => {
    const site = store.sites.find((s) => s.id === siteId);
    if (!site) throw new Error("Site not found");
    deleted = { id: site.id, slug: site.slug, conversationId: site.conversationId };

    const ownerIds = store.users
      .filter((u) => u.siteId === siteId || u.id === site.ownerId)
      .map((u) => u.id);

    store.sites = store.sites.filter((s) => s.id !== siteId);
    store.users = store.users.filter((u) => !ownerIds.includes(u.id));
    store.sessions = store.sessions.filter((s) => !ownerIds.includes(s.userId));

    store.conversations.forEach((c) => {
      if (c.siteId === siteId) {
        c.siteId = null;
        c.updatedAt = new Date().toISOString();
      }
    });

    return store;
  });
  return deleted;
}
