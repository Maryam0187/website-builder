"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import SiteTemplate from "@/components/template/SiteTemplate";
import EditPanel from "@/components/editor/EditPanel";
import TemplateChangeDialog from "@/components/editor/TemplateChangeDialog";
import BrandLogo from "@/components/BrandLogo";
import { getNavItems, isOnePageLayout, resolvePageId } from "@/lib/site-defaults";
import { getTemplate, listTemplates } from "@/lib/templates";

function setPath(obj, path, value) {
  const clone = structuredClone(obj);
  const parts = path.split(".");
  let cur = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (cur[key] == null) {
      cur[key] = /^\d+$/.test(parts[i + 1]) ? [] : {};
    }
    cur = cur[key];
  }
  cur[parts[parts.length - 1]] = value;
  return clone;
}

export default function EditPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState(null);
  const [site, setSite] = useState(null);
  const [sites, setSites] = useState([]);
  const [draft, setDraft] = useState(null);
  const [status, setStatus] = useState("");
  const [pageId, setPageId] = useState("home");
  const [templates, setTemplates] = useState(() => listTemplates());
  const [templateBusy, setTemplateBusy] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState(null);
  const [switchBusy, setSwitchBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const authRes = await fetch("/api/auth");
      const auth = await authRes.json();
      if (!auth.user) {
        router.replace("/login");
        return;
      }
      if (auth.user.mustChangePassword) {
        router.replace("/change-password?next=/edit");
        return;
      }
      if (auth.user.role === "admin") {
        router.replace("/admin");
        return;
      }
      setUser(auth.user);

      const [siteRes, listRes, tplRes] = await Promise.all([
        fetch(`/api/site?id=${auth.user.siteId}`),
        fetch("/api/site"),
        fetch("/api/site/template"),
      ]);
      const siteData = await siteRes.json();
      if (!siteRes.ok) {
        setStatus(siteData.error || "Site not found");
        return;
      }
      setSite(siteData.site);
      if (listRes.ok) {
        const listData = await listRes.json();
        if (Array.isArray(listData.sites)) setSites(listData.sites);
      }
      if (tplRes.ok) {
        const tplData = await tplRes.json();
        if (Array.isArray(tplData.templates)) setTemplates(tplData.templates);
      }
      const fromQuery = searchParams.get("page") || "home";
      setPageId(resolvePageId(siteData.site.content, fromQuery));
    })();
  }, [router, searchParams]);

  const navItems = useMemo(() => (site ? getNavItems(site.content) : []), [site]);
  const onePage = useMemo(() => (site ? isOnePageLayout(site.content) : false), [site]);

  function changePage(nextId) {
    setPageId(nextId);
    setDraft(null);
    if (onePage) {
      router.replace("/edit");
      requestAnimationFrame(() => {
        document.getElementById(nextId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }
    const url = nextId === "home" ? "/edit" : `/edit?page=${nextId}`;
    router.replace(url);
  }

  async function switchSite(nextSiteId) {
    const id = Number(nextSiteId);
    if (!id || !site || id === Number(site.id) || switchBusy) return;
    setSwitchBusy(true);
    setStatus("Switching website…");
    try {
      const res = await fetch("/api/site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "switch-site", siteId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not switch website");
      if (data.user) setUser(data.user);
      if (Array.isArray(data.sites)) setSites(data.sites);
      if (data.site) {
        setSite(data.site);
        setDraft(null);
        setPageId(resolvePageId(data.site.content, "home"));
      }
      const tplRes = await fetch("/api/site/template");
      if (tplRes.ok) {
        const tplData = await tplRes.json();
        if (Array.isArray(tplData.templates)) setTemplates(tplData.templates);
      }
      router.replace("/edit");
      setStatus("Switched website");
      setTimeout(() => setStatus(""), 2500);
    } catch (err) {
      setStatus(err.message || "Could not switch website");
      setTimeout(() => setStatus(""), 3500);
    } finally {
      setSwitchBusy(false);
    }
  }

  async function saveField(payload) {
    let nextContent = structuredClone(site.content);

    if (payload.styled) {
      nextContent = setPath(nextContent, payload.path, payload.value);
      if (!nextContent.styles) nextContent.styles = {};
      const current = { ...(nextContent.styles[payload.path] || {}) };
      if (payload.color) current.color = payload.color;
      else delete current.color;
      if (payload.fontSize) current.fontSize = payload.fontSize;
      else delete current.fontSize;
      if (payload.fontWeight) current.fontWeight = payload.fontWeight;
      else delete current.fontWeight;
      if (Object.keys(current).length) nextContent.styles[payload.path] = current;
      else delete nextContent.styles[payload.path];
    } else {
      nextContent = setPath(nextContent, payload.path, payload.value);
    }

    const res = await fetch("/api/site", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId: site.id, content: nextContent }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Save failed");
    setSite(data.site);
    setDraft(null);
    setStatus("Saved");
    setTimeout(() => setStatus(""), 1500);
  }

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  }

  function requestTemplateChange(templateId) {
    if (!site || templateId === (site.content?.template || "other")) return;
    const meta = templates.find((t) => t.id === templateId);
    if (meta?.locked) {
      setStatus(meta.lockReason || "Template locked — check your plan in Profile");
      setTimeout(() => setStatus(""), 3500);
      return;
    }
    setPendingTemplateId(templateId);
  }

  function cancelTemplateChange() {
    if (templateBusy) return;
    setPendingTemplateId(null);
  }

  async function confirmTemplateChange() {
    if (!site || !pendingTemplateId) return;
    setTemplateBusy(true);
    setStatus("");
    try {
      const res = await fetch("/api/site/template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: site.id, template: pendingTemplateId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "TEMPLATE_LOCKED") {
          setPendingTemplateId(null);
          throw new Error(data.error || "Subscribe to unlock this template");
        }
        throw new Error(data.error || "Failed to change template");
      }
      setSite(data.site);
      if (Array.isArray(data.templates)) setTemplates(data.templates);
      setPageId("home");
      setDraft(null);
      setPendingTemplateId(null);
      setStatus(`Template: ${getTemplate(data.site.content?.template || pendingTemplateId).label}`);
      setTimeout(() => setStatus(""), 2000);
    } catch (err) {
      setStatus(err.message || "Template change failed");
    } finally {
      setTemplateBusy(false);
    }
  }

  if (!site) {
    return (
      <div className="min-h-screen bg-[#070f1f] text-blue-100">
        <div className="border-b border-white/10 bg-[#040b1a]/95 px-4 py-3">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <BrandLogo href="/edit" subtitle="Owner editor" compact />
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/profile"
                className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/5"
              >
                Profile
              </Link>
              <button
                type="button"
                onClick={logout}
                className="rounded-full px-3 py-2 text-sm text-blue-100 hover:bg-white/5"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
        <div className="flex min-h-[60vh] items-center justify-center px-4 text-center">
          {status || "Loading your editor…"}
        </div>
      </div>
    );
  }

  const previewHref = onePage
    ? `/site/${site.slug}`
    : pageId === "home"
      ? `/site/${site.slug}`
      : `/site/${site.slug}/${pageId}`;

  const siteIsLive =
    String(site.status || "").toLowerCase() === "live" ||
    String(site.status || "").toLowerCase() === "published";

  return (
    <div className="relative min-h-screen bg-zinc-100">
      <div className="sticky top-0 z-40 border-b border-white/10 bg-[#040b1a]/95 text-white backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <BrandLogo href="/edit" subtitle="Owner editor" compact />
            <p className="mt-2 font-[family-name:var(--font-display)] text-lg font-semibold">
              {site.content?.brand?.name || "Your site"}
              {siteIsLive ? (
                <span className="ml-2 rounded-full bg-emerald-400/20 px-2 py-0.5 text-xs font-semibold text-emerald-200">
                  Live
                </span>
              ) : (
                <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-blue-100">
                  Draft
                </span>
              )}
            </p>
            <p className="text-xs text-blue-100">
              {user?.email ? `Signed in as ${user.email} · ` : ""}
              Click any text, image, or color to edit. Text also has size and color.
            </p>
            {sites.length > 1 ? (
              <label className="mt-2 flex flex-wrap items-center gap-2 text-xs text-blue-100">
                <span className="font-semibold tracking-wide text-cyan-200/90 uppercase">
                  Website
                </span>
                <select
                  className="rounded-lg border border-white/20 bg-[#07122a] px-2 py-1.5 text-sm text-white outline-none ring-cyan-400/30 focus:ring-2"
                  value={site.id}
                  disabled={switchBusy}
                  onChange={(e) => switchSite(e.target.value)}
                >
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.content?.brand?.name || s.slug}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {status && (
              <span className="rounded-full bg-emerald-400/15 px-3 py-1.5 text-sm text-emerald-200">
                {status}
              </span>
            )}
            <Link
              href="/profile"
              className="rounded-full border border-cyan-300/40 bg-cyan-400/15 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-400/25"
            >
              Profile
            </Link>
            <Link
              href={previewHref}
              target="_blank"
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium hover:bg-white/5"
            >
              Preview
            </Link>
            <button
              type="button"
              onClick={logout}
              className="rounded-full px-3 py-2 text-sm text-blue-100 hover:bg-white/5"
            >
              Log out
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-zinc-200 bg-white px-4 py-2">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            {onePage ? "Section" : "Page"}
          </span>
          {navItems.map((item) => (
            <button
              key={item.pageId}
              type="button"
              onClick={() => changePage(item.pageId)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                pageId === item.pageId
                  ? "bg-[#040b1a] text-white"
                  : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {item.label}
            </button>
          ))}
          <label className="ml-auto flex items-center gap-2 text-xs text-zinc-600">
            <span className="font-semibold tracking-wide uppercase">Template</span>
            <select
              disabled={templateBusy}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 outline-none ring-cyan-400/30 focus:ring-2 disabled:opacity-60"
              value={site.content?.template || "other"}
              onChange={(e) => requestTemplateChange(e.target.value)}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id} disabled={Boolean(t.locked)}>
                  {t.label}
                  {t.locked ? " · Locked" : ""}
                  {t.commerce ? " (cart via contact)" : ""}
                </option>
              ))}
            </select>
          </label>
          {onePage && (
            <span className="text-xs text-zinc-500">One-page · menu jumps to sections</span>
          )}
        </div>
      </div>

      <TemplateChangeDialog
        open={Boolean(pendingTemplateId)}
        fromLabel={getTemplate(site.content?.template || "other").label}
        toLabel={pendingTemplateId ? getTemplate(pendingTemplateId).label : ""}
        busy={templateBusy}
        onCancel={cancelTemplateChange}
        onConfirm={confirmTemplateChange}
      />

      <SiteTemplate
        content={site.content}
        pageId={pageId}
        slug={site.slug}
        editMode
        onEdit={(payload) => setDraft(payload)}
        onPageChange={changePage}
      />

      <EditPanel draft={draft} onClose={() => setDraft(null)} onSave={saveField} />
    </div>
  );
}
