"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import PackageFlow from "@/components/billing/PackageFlow";
import SupportChatSidebar from "@/components/messaging/SupportChatSidebar";
import GoLiveDialog from "@/components/site/GoLiveDialog";
import RestoreVersionDialog from "@/components/site/RestoreVersionDialog";
import VersionNameDialog from "@/components/site/VersionNameDialog";
import DeleteVersionDialog from "@/components/site/DeleteVersionDialog";
import SiteNameDialog from "@/components/site/SiteNameDialog";
import BillingBusyOverlay from "@/components/billing/BillingBusyOverlay";
import PaymentSuccessOverlay from "@/components/billing/PaymentSuccessOverlay";

const MAX_SITE_VERSIONS = 5;

function normalizeSettingsHash(hash) {
  // Collapse accidental doubles like "#billing#billing" from Next.js hash links.
  const first = String(hash || "")
    .toLowerCase()
    .split("#")
    .map((p) => p.trim())
    .filter(Boolean)[0];
  const h = first ? `#${first}` : "";
  if (!h || h === "#" || h === "#profile") return "#account";
  if (h === "#password" || h === "#2fa") return "#security";
  return h;
}

function profileSectionFromReturn(value, fallback = "#plan") {
  const next = normalizeSettingsHash(`#${String(value || "").replace(/^#/, "")}`);
  if (["#plan", "#billing", "#websites", "#account", "#security"].includes(next)) return next;
  return normalizeSettingsHash(fallback);
}

function replaceProfileLocation(hash, { keepSearch = false } = {}) {
  const next = normalizeSettingsHash(hash);
  const qs = keepSearch ? window.location.search || "" : "";
  window.history.replaceState(null, "", `/profile${qs}${next}`);
  return next;
}

const inputClass =
  "w-full rounded-lg border border-white/15 bg-[#040b1a] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30";

const panelClass = "rounded-2xl border border-white/10 bg-[#07122a]/70 p-6 md:p-8";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [site, setSite] = useState(null);
  const [sites, setSites] = useState([]);
  const [billing, setBilling] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [billingMsg, setBillingMsg] = useState("");
  const [billingBusy, setBillingBusy] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(null);
  const [activeHash, setActiveHash] = useState("#account");
  const [siteNames, setSiteNames] = useState({});
  const [siteNameBusy, setSiteNameBusy] = useState({});
  const [siteNameStatus, setSiteNameStatus] = useState({});
  const [siteLiveBusy, setSiteLiveBusy] = useState({});
  const [siteLiveStatus, setSiteLiveStatus] = useState({});
  const [goLivePrompt, setGoLivePrompt] = useState(null);
  const [restorePrompt, setRestorePrompt] = useState(null);
  const [versionNamePrompt, setVersionNamePrompt] = useState(null);
  const [deleteVersionPrompt, setDeleteVersionPrompt] = useState(null);
  const [createSitePrompt, setCreateSitePrompt] = useState(false);
  const [siteVersions, setSiteVersions] = useState({});
  const [versionsBusy, setVersionsBusy] = useState({});
  const [versionsStatus, setVersionsStatus] = useState({});
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [totpSetup, setTotpSetup] = useState(null);
  const [totpCode, setTotpCode] = useState("");
  const [totpPassword, setTotpPassword] = useState("");
  const [totpStatus, setTotpStatus] = useState("");
  const [totpBusy, setTotpBusy] = useState(false);
  const [totpAskLife, setTotpAskLife] = useState("every");
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    const sessionId = params.get("session_id");
    const fromParam = params.get("from");

    (async () => {
      const res = await fetch("/api/profile");
      const data = await res.json();
      if (!res.ok || !data.user) {
        router.replace("/login?next=/profile");
        return;
      }
      if (data.user.mustChangePassword) {
        router.replace("/change-password?next=/profile");
        return;
      }
      setUser(data.user);
      setTotpAskLife(data.user.totpAskLife || "every");
      setSite(data.site || null);
      setSites(data.sites || []);
      setSiteNames(
        Object.fromEntries((data.sites || []).map((item) => [item.id, item.name || ""])),
      );
      setBilling(data.billing || null);
      setInvoices(data.invoices || []);

      if (checkout === "cancel") {
        setBillingMsg("Checkout canceled — no charge was made.");
        setActiveHash(replaceProfileLocation(profileSectionFromReturn(fromParam, "#plan")));
        return;
      }

      if (checkout === "success" && sessionId) {
        setBillingBusy(true);
        try {
          const syncRes = await fetch("/api/billing", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "sync-checkout", sessionId }),
          });
          const syncData = await syncRes.json();
          if (syncRes.ok) {
            if (syncData.user) setUser(syncData.user);
            if (syncData.billing) setBilling(syncData.billing);
            if (syncData.invoices) setInvoices(syncData.invoices);
            const msg = syncData.message || "Payment confirmed — package activated.";
            setBillingMsg(msg);
            if (syncData.promptCreateSite) {
              setCreateSitePrompt(true);
              setPaymentSuccess({
                message: msg,
                nextHash: "#plan",
                continueLabel: "Continue",
                invoiceUrl: syncData.invoiceUrl || null,
              });
            } else {
              setPaymentSuccess({
                message: msg,
                nextHash: "#billing",
                continueLabel: "Continue to Billing",
                invoiceUrl: syncData.invoiceUrl || null,
              });
            }
            window.history.replaceState(null, "", "/profile");
          } else {
            setBillingMsg(syncData.error || "Payment received — refreshing…");
            setActiveHash(replaceProfileLocation(profileSectionFromReturn(fromParam, "#plan")));
          }
        } catch {
          setBillingMsg("Payment may have succeeded — refresh if status looks wrong.");
          setActiveHash(replaceProfileLocation(profileSectionFromReturn(fromParam, "#plan")));
        } finally {
          setBillingBusy(false);
        }
      }
    })();
  }, [router]);

  useEffect(() => {
    function syncHash() {
      const raw = window.location.hash;
      const next = normalizeSettingsHash(raw);
      setActiveHash(next);
      // Keep ?checkout=&from= query intact; also rewrite doubled hashes (#billing#billing).
      if (raw !== next) {
        replaceProfileLocation(next, { keepSearch: true });
      }
    }
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  useEffect(() => {
    if (activeHash !== "#websites" || !sites.length) return;
    sites.forEach((item) => {
      if (siteVersions[item.id] == null) loadSiteVersions(item.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per site when opening Websites
  }, [activeHash, sites]);

  async function saveSiteName(siteId) {
    const brandName = String(siteNames[siteId] || "").trim();
    if (brandName.length < 2) {
      setSiteNameStatus((prev) => ({ ...prev, [siteId]: "Name must be at least 2 characters" }));
      return;
    }
    setSiteNameBusy((prev) => ({ ...prev, [siteId]: true }));
    setSiteNameStatus((prev) => ({ ...prev, [siteId]: "" }));
    try {
      const res = await fetch("/api/site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rename-site", siteId, brandName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save website name");
      const nextName = data.site?.content?.brand?.name || brandName;
      setSites((prev) =>
        prev.map((item) => (item.id === siteId ? { ...item, name: nextName } : item)),
      );
      if (site?.id === siteId) {
        setSite((prev) => (prev ? { ...prev, name: nextName } : prev));
      }
      setSiteNames((prev) => ({ ...prev, [siteId]: nextName }));
      setSiteNameStatus((prev) => ({ ...prev, [siteId]: "Saved" }));
    } catch (err) {
      setSiteNameStatus((prev) => ({
        ...prev,
        [siteId]: err.message || "Failed to save website name",
      }));
    } finally {
      setSiteNameBusy((prev) => ({ ...prev, [siteId]: false }));
    }
  }

  function applySitesFromResponse(data, siteId) {
    if (Array.isArray(data.sites)) {
      setSites((prev) =>
        data.sites.map((s) => {
          const existing = prev.find((p) => p.id === s.id);
          return {
            id: s.id,
            slug: s.slug,
            subdomain: s.subdomain || null,
            liveUrl: s.liveUrl || null,
            name: s.content?.brand?.name || s.slug,
            status: s.status,
            template: s.content?.template || existing?.template || "other",
            templateLabel: existing?.templateLabel || "Other",
          };
        }),
      );
    } else if (data.site) {
      setSites((prev) =>
        prev.map((item) =>
          item.id === data.site.id
            ? {
                ...item,
                status: data.site.status,
                subdomain: data.site.subdomain || item.subdomain || null,
                liveUrl: data.liveUrl || item.liveUrl || null,
                name: data.site.content?.brand?.name || item.name,
              }
            : item,
        ),
      );
    }
    if (data.billing) setBilling(data.billing);
    if (site?.id === siteId && data.site) {
      setSite((prev) =>
        prev
          ? {
              ...prev,
              status: data.site.status,
              subdomain: data.site.subdomain || prev.subdomain || null,
              liveUrl: data.liveUrl || prev.liveUrl || null,
              name: data.site.content?.brand?.name || prev.name,
            }
          : prev,
      );
    }
  }

  async function toggleSiteLive(siteId, currentStatus) {
    const currentlyLive = ["live", "published"].includes(
      String(currentStatus || "").toLowerCase(),
    );
    const makeLive = !currentlyLive;
    if (makeLive) {
      const target = sites.find((s) => s.id === siteId);
      setGoLivePrompt({
        siteId,
        name: target?.name || "this website",
        liveUrlHint: target?.liveUrl
          ? String(target.liveUrl).replace(/^https?:\/\//, "")
          : "*.technonaire.site",
      });
      return;
    }
    await applySiteLive(siteId, false);
  }

  async function applySiteLive(siteId, makeLive) {
    setSiteLiveBusy((prev) => ({ ...prev, [siteId]: true }));
    setSiteLiveStatus((prev) => ({ ...prev, [siteId]: "" }));
    try {
      const res = await fetch("/api/site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: makeLive ? "go-live" : "take-offline",
          siteId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update live status");
      applySitesFromResponse(data, siteId);
      setSiteLiveStatus((prev) => ({
        ...prev,
        [siteId]: data.message || (makeLive ? "Website is live" : "Website offline"),
      }));
      if (makeLive) await loadSiteVersions(siteId);
    } catch (err) {
      setSiteLiveStatus((prev) => ({
        ...prev,
        [siteId]: err.message || "Could not update live status",
      }));
    } finally {
      setSiteLiveBusy((prev) => ({ ...prev, [siteId]: false }));
      setGoLivePrompt(null);
    }
  }

  async function loadSiteVersions(siteId) {
    if (!siteId) return;
    try {
      const res = await fetch(`/api/site/versions?siteId=${siteId}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.versions)) {
        setSiteVersions((prev) => ({ ...prev, [siteId]: data.versions }));
      }
    } catch {
      /* ignore */
    }
  }

  async function saveSiteVersion(siteId) {
    const existing = siteVersions[siteId] || [];
    if (existing.length >= MAX_SITE_VERSIONS) return;
    const target = sites.find((s) => s.id === siteId);
    setVersionNamePrompt({
      mode: "save",
      siteId,
      siteName: target?.name || "this website",
      initialLabel: `version-${existing.length + 1}`,
    });
  }

  async function confirmVersionName(label) {
    if (!versionNamePrompt?.siteId) return;
    const { mode, siteId, versionId } = versionNamePrompt;
    setVersionsBusy((prev) => ({ ...prev, [siteId]: true }));
    setVersionsStatus((prev) => ({ ...prev, [siteId]: "" }));
    try {
      const res = await fetch("/api/site/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "rename"
            ? { action: "rename", siteId, versionId, label }
            : { action: "snapshot", siteId, label },
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error || (mode === "rename" ? "Could not rename version" : "Could not save version"),
        );
      }
      if (Array.isArray(data.versions)) {
        setSiteVersions((prev) => ({ ...prev, [siteId]: data.versions }));
      }
      setVersionsStatus((prev) => ({
        ...prev,
        [siteId]:
          data.message || (mode === "rename" ? "Version renamed" : "Version saved"),
      }));
    } catch (err) {
      setVersionsStatus((prev) => ({
        ...prev,
        [siteId]: err.message || "Version update failed",
      }));
    } finally {
      setVersionsBusy((prev) => ({ ...prev, [siteId]: false }));
      setVersionNamePrompt(null);
    }
  }

  function requestRenameVersion(siteId, version) {
    const target = sites.find((s) => s.id === siteId);
    setVersionNamePrompt({
      mode: "rename",
      siteId,
      versionId: version.id,
      siteName: target?.name || "this website",
      initialLabel: version.label || "Snapshot",
    });
  }

  function requestDeleteVersion(siteId, version) {
    setDeleteVersionPrompt({
      siteId,
      versionId: version.id,
      versionLabel: version.label || "Snapshot",
    });
  }

  async function confirmDeleteVersion() {
    if (!deleteVersionPrompt?.siteId || !deleteVersionPrompt?.versionId) return;
    const { siteId, versionId } = deleteVersionPrompt;
    setVersionsBusy((prev) => ({ ...prev, [siteId]: true }));
    setVersionsStatus((prev) => ({ ...prev, [siteId]: "" }));
    try {
      const res = await fetch("/api/site/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", siteId, versionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete version");
      if (Array.isArray(data.versions)) {
        setSiteVersions((prev) => ({ ...prev, [siteId]: data.versions }));
      }
      setVersionsStatus((prev) => ({
        ...prev,
        [siteId]: data.message || "Version deleted",
      }));
    } catch (err) {
      setVersionsStatus((prev) => ({
        ...prev,
        [siteId]: err.message || "Could not delete version",
      }));
    } finally {
      setVersionsBusy((prev) => ({ ...prev, [siteId]: false }));
      setDeleteVersionPrompt(null);
    }
  }

  function requestRestoreVersion(siteId, version) {
    const target = sites.find((s) => s.id === siteId);
    setRestorePrompt({
      siteId,
      versionId: version.id,
      siteName: target?.name || "this website",
      versionLabel: version.label || "Snapshot",
      versionDate: version.createdAt
        ? new Date(version.createdAt).toLocaleString()
        : null,
    });
  }

  async function confirmRestoreVersion() {
    if (!restorePrompt?.siteId || !restorePrompt?.versionId) return;
    const { siteId, versionId } = restorePrompt;
    setVersionsBusy((prev) => ({ ...prev, [siteId]: true }));
    setVersionsStatus((prev) => ({ ...prev, [siteId]: "" }));
    try {
      const res = await fetch("/api/site/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", siteId, versionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not restore version");
      if (Array.isArray(data.versions)) {
        setSiteVersions((prev) => ({ ...prev, [siteId]: data.versions }));
      }
      setVersionsStatus((prev) => ({
        ...prev,
        [siteId]: data.message || "Version restored",
      }));
    } catch (err) {
      setVersionsStatus((prev) => ({
        ...prev,
        [siteId]: err.message || "Could not restore version",
      }));
    } finally {
      setVersionsBusy((prev) => ({ ...prev, [siteId]: false }));
      setRestorePrompt(null);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    setPasswordBusy(true);
    setPasswordStatus("");
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change password");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordStatus("Password updated");
    } catch (err) {
      setPasswordStatus(err.message || "Failed to change password");
    } finally {
      setPasswordBusy(false);
    }
  }

  async function totpAction(action, nextAskLife) {
    const askLife = nextAskLife || totpAskLife;
    setTotpBusy(true);
    setTotpStatus("");
    try {
      const res = await fetch("/api/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          code: totpCode,
          password: totpPassword,
          askLife,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Authenticator update failed");
      if (data.user) {
        setUser(data.user);
        setTotpAskLife(data.user.totpAskLife || "every");
      }
      if (action === "setup") {
        setTotpSetup({
          secret: data.secret,
          qrDataUrl: data.qrDataUrl,
        });
        setTotpCode("");
      } else if (action !== "ask-life") {
        setTotpSetup(null);
        setTotpCode("");
        setTotpPassword("");
      }
      setTotpStatus(data.message || "Updated");
    } catch (err) {
      setTotpStatus(err.message || "Authenticator update failed");
    } finally {
      setTotpBusy(false);
    }
  }

  async function billingAction(action, id, extra = {}) {
    setBillingBusy(true);
    setBillingMsg("");
    try {
      if (action === "create-site") {
        const res = await fetch("/api/site", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create-site",
            brandName: extra.brandName || "My second website",
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not create website");
        setCreateSitePrompt(false);
        if (data.user) setUser(data.user);
        if (Array.isArray(data.sites)) {
          applySitesFromResponse(data, data.site?.id);
        }
        if (data.site) {
          const nextName = data.site.content?.brand?.name || data.site.slug;
          setSite({
            id: data.site.id,
            slug: data.site.slug,
            name: nextName,
            status: data.site.status,
          });
          setSiteNames((prev) => ({ ...prev, [data.site.id]: nextName }));
        }
        const billRes = await fetch("/api/billing");
        if (billRes.ok) {
          const billData = await billRes.json();
          if (billData.billing) setBilling(billData.billing);
          if (billData.invoices) setInvoices(billData.invoices);
        }
        setBillingMsg(data.message || "New website created — opening the editor…");
        router.push("/edit");
        return;
      }

      const body = { action, ...extra };
      if (action === "subscribe" || action === "checkout") body.planId = id;
      if (action === "buy-addon") body.addonId = id;
      if (action === "buy-site-slot" && id) body.slotPlanId = id;
      if (
        action === "subscribe" ||
        action === "checkout" ||
        action === "buy-addon" ||
        action === "buy-site-slot"
      ) {
        body.returnTo =
          String(extra.returnTo || window.location.hash || activeHash || "#plan")
            .replace(/^#/, "")
            .trim() || "plan";
      }

      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Billing action failed");
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      if (data.portalUrl) {
        window.location.href = data.portalUrl;
        return;
      }
      if (data.user) setUser(data.user);
      if (data.billing) setBilling(data.billing);
      if (data.invoices) setInvoices(data.invoices);
      const msg =
        data.message ||
        (data.upgraded
          ? "Upgraded — you paid the difference now."
          : data.downgraded
            ? "Switched to a lower package — no charge now."
            : action === "cancel"
              ? "Subscription set to cancel at period end. You keep access until then."
              : "Updated");
      setBillingMsg(msg);
      if (
        action !== "cancel" &&
        action !== "portal" &&
        (data.upgraded || data.downgraded || data.changed || data.invoiceUrl)
      ) {
        setPaymentSuccess({
          message: msg,
          nextHash: "#billing",
          continueLabel: "Continue to Billing",
          invoiceUrl: data.invoiceUrl || null,
        });
        return;
      }
    } catch (err) {
      setBillingMsg(err.message || "Billing action failed");
    } finally {
      setBillingBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#040b1a] text-blue-100">
        Loading settings…
      </div>
    );
  }

  const homeHref = user.role === "admin" ? "/admin" : "/edit";
  const planName = billing?.subscriptionActive
    ? billing?.planName || "Paid"
    : "Free";
  const billingLabel = billing?.subscriptionActive
    ? billing?.subscriptionStatus === "canceled"
      ? "Cancels soon"
      : "Active"
    : "No subscription";
  const formatSiteStatus = (value) =>
    ["live", "published"].includes(String(value || "").toLowerCase())
      ? "Published"
      : value
        ? String(value).charAt(0).toUpperCase() + String(value).slice(1)
        : "Draft";
  const canGoLive = Boolean(billing?.canGoLive);

  const navItems = [
    { href: "#account", label: "Account" },
    ...(user.role === "owner" ? [{ href: "#websites", label: "Websites" }] : []),
    { href: "#security", label: "Security" },
    { href: "#plan", label: "Plan" },
    ...(user.role === "owner" ? [{ href: "#billing", label: "Billing" }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#040b1a] text-white">
      <header className="border-b border-white/10 bg-[#040b1a]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLogo href={homeHref} subtitle="Settings" compact />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={homeHref}
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white/90 transition hover:border-cyan-300/40 hover:bg-white/5"
            >
              {user.role === "admin" ? "Dashboard" : "Editor"}
            </Link>
            <button
              type="button"
              onClick={logout}
              className="rounded-full px-3 py-2 text-sm text-blue-100 transition hover:bg-white/5 hover:text-white"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8 lg:flex-row lg:items-start lg:gap-10 lg:py-10">
        <aside className="lg:sticky lg:top-6 lg:w-56 lg:shrink-0">
          <p className="mb-3 hidden text-xs font-semibold tracking-[0.16em] text-white/40 uppercase lg:block">
            Settings
          </p>
          <nav
            className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
            aria-label="Settings"
          >
            {navItems.map((item) => {
              const active = activeHash === item.href;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-white/10 text-white"
                      : "text-blue-100/80 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
            {user.role === "owner" ? (
              <button
                type="button"
                onClick={() => setShowChat(true)}
                className="whitespace-nowrap rounded-lg px-3 py-2.5 text-left text-sm font-medium text-cyan-100/90 transition hover:bg-cyan-500/10 hover:text-cyan-50"
              >
                Contact us
              </button>
            ) : null}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          {activeHash === "#account" ? (
            <section id="account" className={panelClass}>
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                  <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
                    Account
                  </h1>
                  <p className="mt-1 text-sm text-blue-100/80">
                    Your profile details for this Easy Website account.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                    {planName}
                  </span>
                  <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-blue-100">
                    {billingLabel}
                  </span>
                </div>
              </div>

              <div className="mt-6 max-w-xl space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-blue-100">Email</label>
                  <input className={inputClass} value={user.email} disabled readOnly />
                  <p className="mt-1.5 text-xs text-white/40">Email can’t be changed here.</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-1.5 text-sm font-medium text-blue-100">Role</p>
                    <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm capitalize text-white">
                      {user.role}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1.5 text-sm font-medium text-blue-100">Current plan</p>
                    <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white">
                      {planName}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {activeHash === "#websites" && user.role === "owner" ? (
            <section id="websites" className={panelClass}>
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-6">
                <div>
                  <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
                    Websites
                  </h1>
                  <p className="mt-1 text-sm text-blue-100/80">
                    Manage your websites, names, publishing, live address, and version history.
                  </p>
                </div>
                <div className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-blue-100">
                  {sites.length} website{sites.length === 1 ? "" : "s"}
                </div>
              </div>

              {site ? (
                <div className="mt-6 rounded-xl border border-cyan-300/20 bg-cyan-300/5 p-4">
                  <p className="text-xs font-semibold tracking-[0.14em] text-cyan-100/80 uppercase">
                    Active in editor
                  </p>
                  <p className="mt-2 text-sm font-medium text-white">
                    {site.name} <span className="text-white/45">· /{site.slug}</span>
                  </p>
                </div>
              ) : null}

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {sites.length > 0 ? (
                  sites.map((item) => {
                    const current = site?.id === item.id;
                    const status = formatSiteStatus(item.status);
                    const draftName = siteNames[item.id] ?? item.name ?? "";
                    const nameChanged = draftName.trim() !== (item.name || "").trim();
                    const nameBusy = Boolean(siteNameBusy[item.id]);
                    const nameStatus = siteNameStatus[item.id];
                    const published = status === "Published";
                    const liveBusy = Boolean(siteLiveBusy[item.id]);
                    const liveStatus = siteLiveStatus[item.id];
                    const showLiveControls = canGoLive || published;
                    const versionCount = (siteVersions[item.id] || []).length;
                    const atVersionLimit = versionCount >= MAX_SITE_VERSIONS;
                    return (
                      <div
                        key={item.id}
                        className={`rounded-xl border p-4 ${
                          current
                            ? "border-cyan-300/30 bg-cyan-300/5"
                            : "border-white/10 bg-white/5"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <label
                              htmlFor={`site-name-${item.id}`}
                              className="text-[11px] font-semibold tracking-[0.14em] text-white/40 uppercase"
                            >
                              Website name
                            </label>
                            <input
                              id={`site-name-${item.id}`}
                              className={`${inputClass} mt-1.5`}
                              value={draftName}
                              onChange={(e) =>
                                setSiteNames((prev) => ({ ...prev, [item.id]: e.target.value }))
                              }
                              placeholder="Your business name"
                            />
                            <p className="mt-1.5 text-xs text-blue-100/70">/{item.slug}</p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              status === "Published"
                                ? "border border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
                                : "border border-white/10 bg-white/5 text-blue-100"
                            }`}
                          >
                            {status}
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            disabled={nameBusy || !nameChanged}
                            onClick={() => saveSiteName(item.id)}
                            className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-semibold transition hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50"
                          >
                            {nameBusy ? "Saving…" : "Save name"}
                          </button>
                          {nameStatus ? (
                            <p
                              className={`text-xs ${
                                nameStatus === "Saved" ? "text-emerald-300" : "text-cyan-200"
                              }`}
                            >
                              {nameStatus}
                            </p>
                          ) : null}
                        </div>

                        {showLiveControls ? (
                          <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                            <div className="flex flex-wrap items-center gap-3">
                              <button
                                type="button"
                                disabled={liveBusy}
                                onClick={() => toggleSiteLive(item.id, item.status)}
                                className={`rounded-full px-4 py-2 text-xs font-semibold disabled:opacity-60 ${
                                  published
                                    ? "border border-amber-400/40 text-amber-100 hover:bg-amber-500/10"
                                    : "border border-emerald-400/40 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25"
                                }`}
                              >
                                {liveBusy ? "Updating…" : published ? "Take offline" : "Go live"}
                              </button>
                              {liveStatus ? (
                                <p className="text-xs text-cyan-200">{liveStatus}</p>
                              ) : null}
                            </div>
                            {item.liveUrl ? (
                              <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/5 px-3 py-2">
                                <p className="text-[11px] font-semibold tracking-[0.14em] text-emerald-200/80 uppercase">
                                  Live address
                                </p>
                                <a
                                  href={item.liveUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-1 block break-all text-sm font-medium text-emerald-100 underline-offset-2 hover:underline"
                                >
                                  {item.liveUrl.replace(/^https?:\/\//, "")}
                                </a>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <div className="mt-4 border-t border-white/10 pt-4">
                            <p className="text-xs text-blue-100/70">
                              Subscribe to Starter to publish on a random.technonaire.site address.
                            </p>
                            <a
                              href="#plan"
                              className="mt-2 inline-flex rounded-full border border-cyan-400/40 bg-cyan-500/15 px-4 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/25"
                            >
                              Upgrade to Starter
                            </a>
                          </div>
                        )}

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div>
                            <p className="text-[11px] font-semibold tracking-[0.14em] text-white/40 uppercase">
                              Template
                            </p>
                            <p className="mt-1 text-sm text-white">{item.templateLabel || "Other"}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold tracking-[0.14em] text-white/40 uppercase">
                              Template id
                            </p>
                            <p className="mt-1 text-sm text-blue-100/80">{item.template || "other"}</p>
                          </div>
                        </div>

                        <div className="mt-4 border-t border-white/10 pt-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-[11px] font-semibold tracking-[0.14em] text-white/40 uppercase">
                              Version history
                            </p>
                            <button
                              type="button"
                              disabled={
                                Boolean(versionsBusy[item.id]) || !canGoLive || atVersionLimit
                              }
                              onClick={() => saveSiteVersion(item.id)}
                              className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-semibold text-blue-100 hover:bg-white/5 disabled:opacity-50"
                              title={
                                !canGoLive
                                  ? "Available on paid plans"
                                  : atVersionLimit
                                    ? `Limit of ${MAX_SITE_VERSIONS} versions reached — delete one to save another`
                                    : "Save a snapshot of the current site"
                              }
                            >
                              {versionsBusy[item.id] ? "Saving…" : "Save version"}
                            </button>
                          </div>
                          <p className="mt-1 text-xs text-blue-100/60">
                            {atVersionLimit
                              ? `${MAX_SITE_VERSIONS} versions saved — delete one to save another.`
                              : `Keeps up to ${MAX_SITE_VERSIONS} versions. Going live also saves a snapshot.`}
                          </p>
                          {versionsStatus[item.id] ? (
                            <p className="mt-2 text-xs text-cyan-200">{versionsStatus[item.id]}</p>
                          ) : null}
                          {!canGoLive ? (
                            <p className="mt-2 text-xs text-blue-100/70">
                              Upgrade to Starter to save and restore versions.
                            </p>
                          ) : (siteVersions[item.id] || []).length === 0 ? (
                            <p className="mt-2 text-xs text-blue-100/70">No versions yet.</p>
                          ) : (
                            <ul className="mt-3 space-y-2">
                              {(siteVersions[item.id] || []).map((v) => (
                                <li
                                  key={v.id}
                                  className="rounded-lg border border-white/10 bg-[#040b1a]/50 px-3 py-2"
                                >
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-white">
                                      {v.label || "Snapshot"}
                                    </p>
                                    <p className="text-[11px] text-blue-100/60">
                                      {v.createdAt
                                        ? new Date(v.createdAt).toLocaleString()
                                        : "—"}
                                    </p>
                                  </div>
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <button
                                      type="button"
                                      disabled={Boolean(versionsBusy[item.id])}
                                      onClick={() => requestRestoreVersion(item.id, v)}
                                      className="rounded-full border border-cyan-400/30 px-3 py-1.5 text-[11px] font-semibold text-cyan-100 hover:bg-cyan-500/10 disabled:opacity-50"
                                    >
                                      Restore
                                    </button>
                                    <button
                                      type="button"
                                      disabled={Boolean(versionsBusy[item.id])}
                                      onClick={() => requestRenameVersion(item.id, v)}
                                      className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-semibold text-blue-100 hover:bg-white/5 disabled:opacity-50"
                                    >
                                      Rename
                                    </button>
                                    <button
                                      type="button"
                                      disabled={Boolean(versionsBusy[item.id])}
                                      onClick={() => requestDeleteVersion(item.id, v)}
                                      className="rounded-full border border-rose-400/30 px-3 py-1.5 text-[11px] font-semibold text-rose-200 hover:bg-rose-500/10 disabled:opacity-50"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        {current ? (
                          <p className="mt-4 text-xs text-cyan-100/80">Currently open in the editor</p>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-blue-100/80">
                    No websites yet.
                  </div>
                )}
              </div>
            </section>
          ) : null}

          {activeHash === "#security" ? (
            <section id="security" className="space-y-6">
              <div className={panelClass}>
                <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
                  Security
                </h1>
                <p className="mt-1 text-sm text-blue-100/80">
                  Password and optional two-factor authentication.
                </p>

                <div className="mt-8 border-t border-white/10 pt-6">
                  <h2 className="text-lg font-semibold text-white">Password</h2>
                  <p className="mt-1 text-sm text-blue-100/70">
                    Use at least 8 characters.{" "}
                    <Link href="/forgot-password" className="text-cyan-200 hover:underline">
                      Forgot password?
                    </Link>
                  </p>
                  <form onSubmit={savePassword} className="mt-5 max-w-xl space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-blue-100">
                        Current password
                      </label>
                      <input
                        type="password"
                        required
                        autoComplete="current-password"
                        className={inputClass}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-blue-100">
                        New password
                      </label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        autoComplete="new-password"
                        className={inputClass}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-blue-100">
                        Confirm new password
                      </label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        autoComplete="new-password"
                        className={inputClass}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                    {passwordStatus ? (
                      <p
                        className={`text-sm ${
                          passwordStatus.includes("updated") ? "text-emerald-300" : "text-red-300"
                        }`}
                      >
                        {passwordStatus}
                      </p>
                    ) : null}
                    <button
                      type="submit"
                      disabled={passwordBusy}
                      className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold transition hover:from-cyan-400 hover:to-blue-500 disabled:opacity-60"
                    >
                      {passwordBusy ? "Updating…" : "Update password"}
                    </button>
                  </form>
                </div>
              </div>

              <div className={panelClass}>
                <h2 className="text-lg font-semibold text-white">Authenticator (2FA)</h2>
                <p className="mt-1 text-sm text-blue-100/70">
                  Optional. Sign-in stays password-only until you finish setup with Google
                  Authenticator.
                </p>

                {user.totpEnabled && !totpSetup ? (
                  <div className="mt-5 max-w-xl space-y-4">
                    <p className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                      Authenticator is on for this account.
                    </p>
                    <TotpAskLifePicker
                      value={totpAskLife}
                      disabled={totpBusy}
                      onChange={(life) => {
                        setTotpAskLife(life);
                        totpAction("ask-life", life);
                      }}
                    />
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-blue-100">
                        Current password
                      </label>
                      <input
                        type="password"
                        autoComplete="current-password"
                        className={inputClass}
                        value={totpPassword}
                        onChange={(e) => setTotpPassword(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-blue-100">
                        Authenticator code
                      </label>
                      <input
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        className={`${inputClass} tracking-[0.3em]`}
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      />
                    </div>
                    {totpStatus ? <p className="text-sm text-cyan-200">{totpStatus}</p> : null}
                    <button
                      type="button"
                      disabled={totpBusy}
                      onClick={() => totpAction("disable")}
                      className="rounded-full border border-rose-400/40 px-5 py-2.5 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/10 disabled:opacity-60"
                    >
                      {totpBusy ? "Turning off…" : "Turn off authenticator"}
                    </button>
                  </div>
                ) : (
                  <div className="mt-5 max-w-xl space-y-4">
                    {!totpSetup ? (
                      <button
                        type="button"
                        disabled={totpBusy}
                        onClick={() => totpAction("setup")}
                        className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
                      >
                        {totpBusy ? "Preparing…" : "Set up authenticator"}
                      </button>
                    ) : (
                      <>
                        <p className="text-sm text-blue-100/80">
                          Scan this QR in Google Authenticator, then enter the 6-digit code.
                        </p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={totpSetup.qrDataUrl}
                          alt="Authenticator QR code"
                          className="h-48 w-48 rounded-xl border border-white/10 bg-white p-2"
                        />
                        <p className="text-xs text-blue-200/70">
                          Can’t scan? Key:{" "}
                          <span className="font-mono text-cyan-200">{totpSetup.secret}</span>
                        </p>
                        <TotpAskLifePicker
                          value={totpAskLife}
                          disabled={totpBusy}
                          onChange={setTotpAskLife}
                        />
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-blue-100">
                            6-digit code
                          </label>
                          <input
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            className={`${inputClass} tracking-[0.3em]`}
                            value={totpCode}
                            onChange={(e) =>
                              setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                            }
                          />
                        </div>
                        <button
                          type="button"
                          disabled={totpBusy}
                          onClick={() => totpAction("enable")}
                          className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
                        >
                          {totpBusy ? "Verifying…" : "Turn on authenticator"}
                        </button>
                      </>
                    )}
                    {totpStatus ? <p className="text-sm text-cyan-200">{totpStatus}</p> : null}
                  </div>
                )}
              </div>
            </section>
          ) : null}

          {activeHash === "#plan" ? (
            <section id="plan" className={panelClass}>
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">Plan</h1>
              <p className="mt-1 text-sm text-blue-100/80">
                {user.role === "admin"
                  ? "Admins are not billed. Manage client invoices from the sites list."
                  : "Choose or change your package. Starter $9 · Custom $19 · Domain $29 · Pro + PWA $39."}
              </p>

              {user.role === "owner" ? (
                <div className="mt-6">
                  <PackageFlow
                    view="plan"
                    billing={billing}
                    invoices={invoices}
                    busy={billingBusy}
                    message={billingMsg}
                    onAction={(action, id, extra = {}) =>
                      billingAction(action, id, { ...extra, returnTo: "plan" })
                    }
                    onCreateSiteRequest={() => setCreateSitePrompt(true)}
                    onContactUs={() => setShowChat(true)}
                  />
                </div>
              ) : (
                <p className="mt-6 text-sm text-blue-100">
                  Open a site → <span className="text-white">Payment</span> to manage that
                  owner&apos;s offline invoices.
                </p>
              )}
            </section>
          ) : null}

          {activeHash === "#billing" && user.role === "owner" ? (
            <section id="billing" className={panelClass}>
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
                Billing
              </h1>
              <p className="mt-1 text-sm text-blue-100/80">
                Invoices, payment method, and subscription cancellation.
              </p>
              <div className="mt-6">
                <PackageFlow
                  view="billing"
                  billing={billing}
                  invoices={invoices}
                  busy={billingBusy}
                  message={billingMsg}
                  onAction={(action, id, extra = {}) =>
                    billingAction(action, id, { ...extra, returnTo: "billing" })
                  }
                />
              </div>
            </section>
          ) : null}
        </main>
      </div>

      {user.role === "owner" ? (
        <SupportChatSidebar open={showChat} onClose={() => setShowChat(false)} />
      ) : null}

      <GoLiveDialog
        open={Boolean(goLivePrompt)}
        siteName={goLivePrompt?.name || "this website"}
        liveUrlHint={goLivePrompt?.liveUrlHint || null}
        busy={Boolean(goLivePrompt && siteLiveBusy[goLivePrompt.siteId])}
        onCancel={() => setGoLivePrompt(null)}
        onConfirm={() => {
          if (!goLivePrompt?.siteId) return;
          applySiteLive(goLivePrompt.siteId, true);
        }}
      />

      <RestoreVersionDialog
        open={Boolean(restorePrompt)}
        siteName={restorePrompt?.siteName || "this website"}
        versionLabel={restorePrompt?.versionLabel || "Snapshot"}
        versionDate={restorePrompt?.versionDate || null}
        busy={Boolean(restorePrompt && versionsBusy[restorePrompt.siteId])}
        onCancel={() => setRestorePrompt(null)}
        onConfirm={confirmRestoreVersion}
      />

      <VersionNameDialog
        open={Boolean(versionNamePrompt)}
        title={versionNamePrompt?.mode === "rename" ? "Rename version" : "Save version"}
        description={
          versionNamePrompt?.mode === "rename"
            ? `Update the name for this snapshot of ${versionNamePrompt?.siteName || "your website"}.`
            : `Name this snapshot of ${versionNamePrompt?.siteName || "your website"} so you can find it later.`
        }
        initialLabel={versionNamePrompt?.initialLabel || ""}
        confirmLabel={versionNamePrompt?.mode === "rename" ? "Rename" : "Save version"}
        busyLabel={versionNamePrompt?.mode === "rename" ? "Renaming…" : "Saving…"}
        busy={Boolean(versionNamePrompt && versionsBusy[versionNamePrompt.siteId])}
        onCancel={() => setVersionNamePrompt(null)}
        onConfirm={confirmVersionName}
      />

      <DeleteVersionDialog
        open={Boolean(deleteVersionPrompt)}
        versionLabel={deleteVersionPrompt?.versionLabel || "this version"}
        busy={Boolean(deleteVersionPrompt && versionsBusy[deleteVersionPrompt.siteId])}
        onCancel={() => setDeleteVersionPrompt(null)}
        onConfirm={confirmDeleteVersion}
      />

      <SiteNameDialog
        open={createSitePrompt}
        busy={billingBusy}
        onCancel={() => {
          if (!billingBusy) setCreateSitePrompt(false);
        }}
        onConfirm={(brandName) => billingAction("create-site", null, { brandName })}
      />

      <BillingBusyOverlay open={billingBusy && !paymentSuccess} message="Loading…" />

      <PaymentSuccessOverlay
        open={Boolean(paymentSuccess)}
        message={paymentSuccess?.message || "Payment successful"}
        continueLabel={paymentSuccess?.continueLabel || "Continue to Billing"}
        invoiceUrl={paymentSuccess?.invoiceUrl || null}
        onViewInvoice={(url) => {
          setPaymentSuccess(null);
          window.location.assign(url);
        }}
        onContinue={() => {
          const next = profileSectionFromReturn(paymentSuccess?.nextHash, "#billing");
          setPaymentSuccess(null);
          setActiveHash(replaceProfileLocation(next));
        }}
      />
    </div>
  );
}

const TOTP_ASK_LIFE_OPTIONS = [
  { id: "every", label: "Every login", hint: "Ask for a code each time you sign in." },
  { id: "week", label: "Per week", hint: "Remember this device for 7 days." },
  { id: "days30", label: "Every 30 days", hint: "Remember this device for 30 days." },
];

function TotpAskLifePicker({ value, onChange, disabled }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-white">Ask for the code</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {TOTP_ASK_LIFE_OPTIONS.map((option) => {
          const selected = value === option.id;
          return (
            <label
              key={option.id}
              className={`cursor-pointer rounded-xl border px-3 py-3 text-sm transition ${
                selected
                  ? "border-cyan-400/50 bg-cyan-500/10"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              } ${disabled ? "opacity-60" : ""}`}
            >
              <input
                type="radio"
                name="totp-ask-life"
                className="sr-only"
                checked={selected}
                disabled={disabled}
                onChange={() => onChange(option.id)}
              />
              <span className="block font-semibold text-white">{option.label}</span>
              <span className="mt-1 block text-xs leading-5 text-blue-200/70">{option.hint}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
