"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PlanChangeDialog from "@/components/billing/PlanChangeDialog";
import AddPaymentMethodDialog from "@/components/billing/AddPaymentMethodDialog";
import ProContactDialog from "@/components/billing/ProContactDialog";
import RegionSelector from "@/components/RegionSelector";
import { ALL_REGIONS } from "@/lib/region-detection";
import {
  formatPkr,
  formatRegionAmount,
  offerPhrase,
  pickOffer,
  savingsFor,
  withRegionPricing,
} from "@/lib/plan-price-label";

function formatMoney(cents, regionId = "usa") {
  if (regionId === "pakistan") return formatPkr(cents);
  return `$${((Number(cents) || 0) / 100).toFixed(0)}`;
}

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

const SITE_HOST_ROOT = process.env.NEXT_PUBLIC_SITE_HOST_ROOT || "technonairebuilder.com";

function featureList(features) {
  const address =
    features?.technonaireAddress === "random"
      ? "Random Technonaire address"
      : features?.technonaireAddress === "chosen"
        ? `Choose your .${SITE_HOST_ROOT} address`
        : null;
  return [
    features?.live ? "Publishing" : null,
    features?.hosting ? "Hosting + SSL" : null,
    address,
    features?.domain ? "Your own domain (DNS setup)" : null,
    features?.pwa ? "PWA app" : null,
    features?.premiumTemplates ? "All templates" : null,
    features?.templateSwitch ? "Editor · switch templates" : null,
    features?.versionHistory ? "Version history" : null,
  ].filter(Boolean);
}

function planRank(plan) {
  return Number(plan?.rank) || 0;
}

function normalizeCurrentPlanId(planId) {
  const id = String(planId || "").toLowerCase();
  if (id === "live") return "custom";
  return id;
}

const CONTACT_EMAIL = "info@technonaire.com";

function AddonCard({ item, badge, actionLabel, actionHref, onAction, busy, disabled, current }) {
  const actionClassName =
    "mt-5 whitespace-nowrap rounded-full border border-cyan-400/40 bg-cyan-500/15 px-3 py-2.5 text-center text-sm font-semibold text-cyan-100 hover:bg-cyan-500/25 disabled:opacity-50";

  return (
    <div
      className={`flex flex-col rounded-2xl border p-5 ${
        current
          ? "border-emerald-400/40 bg-emerald-500/10"
          : "border-white/10 bg-[#07122a]/80"
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-blue-200/70">{badge}</p>
      <h4 className="mt-2 text-lg font-semibold text-white">{item.name}</h4>
      {item.compareAtLabel ? (
        <p className="mt-1 text-sm text-blue-200/60 line-through">{item.compareAtLabel}</p>
      ) : null}
      <p className="mt-1 text-2xl font-semibold text-cyan-200">{item.priceLabel}</p>
      {item.yearlyNote ? (
        <p className="mt-2 inline-flex w-fit rounded-full bg-cyan-400 px-3 py-1 text-sm font-bold text-[#041018]">
          {item.yearlyNote}
        </p>
      ) : null}
      {item.offerNote ? (
        <p className="mt-1 text-xs font-medium text-cyan-200">{item.offerNote}</p>
      ) : null}
      {item.additionalPriceLabel && item.additionalPriceLabel !== "—" ? (
        <p className="mt-1 text-xs text-blue-200/80">
          Additional website · {item.additionalPriceLabel}
        </p>
      ) : null}
      <p className="mt-2 text-xs text-blue-100">{item.description}</p>
      <ul className="mt-4 flex-1 space-y-1.5 text-xs text-blue-100">
        {(item.highlights || []).map((line) => (
          <li key={line}>· {line}</li>
        ))}
      </ul>
      {current && !actionLabel ? (
        <p className="mt-5 whitespace-nowrap rounded-full border border-emerald-400/30 px-4 py-2.5 text-center text-sm font-semibold text-emerald-200">
          {item?.id === "free"
            ? "Current · default"
            : item?.category === "service"
              ? "Paid · we’ll handle it"
              : "Active"}
        </p>
      ) : actionHref && actionLabel ? (
        <a href={actionHref} className={actionClassName}>
          {actionLabel}
        </a>
      ) : actionLabel ? (
        <button
          type="button"
          disabled={busy || disabled}
          onClick={onAction}
          className={actionClassName}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export default function PackageFlow({
  billing,
  invoices = [],
  busy,
  message,
  onAction,
  onContactUs,
  onCreateSiteRequest,
  onRegionConfirmed,
  region = "usa",
  regionLocked = false,
  regionPrices = null,
  regions = null,
  view = "all",
}) {
  const [draftRegion, setDraftRegion] = useState(region || "usa");
  const [regionConfirmed, setRegionConfirmed] = useState(Boolean(regionLocked));
  const [regionBusy, setRegionBusy] = useState(false);
  const [regionNotice, setRegionNotice] = useState("");
  const [showSlotPicker, setShowSlotPicker] = useState(false);
  const [planChangePrompt, setPlanChangePrompt] = useState(null);
  const [showAddPaymentDialog, setShowAddPaymentDialog] = useState(false);
  const [showProContactDialog, setShowProContactDialog] = useState(false);
  const [pendingPurchase, setPendingPurchase] = useState(null);
  const [billingInterval, setBillingInterval] = useState("yearly");
  const [launchOffer, setLaunchOffer] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/pricing/launch-promotion")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setLaunchOffer(data.offer || null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setDraftRegion(region || "usa");
  }, [region]);

  useEffect(() => {
    if (regionLocked) setRegionConfirmed(true);
  }, [regionLocked]);

  function requireConfirmedRegion() {
    if (regionLocked || regionConfirmed) return true;
    setRegionNotice("Confirm your region above before choosing a plan.");
    document.getElementById("plan-region")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return false;
  }

  async function confirmRegion() {
    setRegionBusy(true);
    setRegionNotice("");
    try {
      const res = await fetch("/api/region/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region: draftRegion }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save region");
      setRegionConfirmed(true);
      onRegionConfirmed?.(draftRegion);
      setRegionNotice(
        draftRegion === "pakistan"
          ? "Pakistan confirmed. Choose a plan to request activation."
          : "Region confirmed. Choose a plan below."
      );
    } catch (err) {
      setRegionConfirmed(false);
      setRegionNotice(err.message || "Could not save region");
    } finally {
      setRegionBusy(false);
    }
  }

  const subStatus = billing?.subscriptionStatus || "none";
  const paidActive = Boolean(billing?.subscriptionActive);
  const allPlans = billing?.plans || [];
  const siteSlots = Math.max(1, Number(billing?.siteSlots) || 1);
  const sitesUsed =
    billing?.sitesUsed == null ? null : Math.max(0, Number(billing.sitesUsed) || 0);
  const canCreateSite = Boolean(billing?.canCreateSite);
  const canBuyAddon = billing?.canBuyAddon !== false && siteSlots < 2;
  const stripe = Boolean(billing?.stripeEnabled);
  const canceling = subStatus === "canceled" && paidActive;
  const showPlan = view === "all" || view === "plan";
  const showBilling = view === "all" || view === "billing";

  const currentPlanId = paidActive
    ? normalizeCurrentPlanId(billing?.planId)
    : "free";

  const currentPlan =
    allPlans.find((p) => p.id === currentPlanId) || allPlans.find((p) => p.id === "free");
  const currentRank = planRank(currentPlan);
  const monthlyPlanIds = new Set(["starter", "custom", "domain", "pro"]);
  const purchaseExtra = {
    billingInterval,
    couponCode: "",
  };
  const shopPackages = (
    billing?.shopPackages?.length > 0
      ? billing.shopPackages
      : allPlans.filter((p) => p.id === "free" || monthlyPlanIds.has(p.id))
  ).map((plan) => {
    const priced = withRegionPricing(plan, draftRegion, regionPrices, billingInterval);
    if (!priced || priced.priceLabel === "Contact us" || !(Number(priced.priceCents) > 0)) return priced;
    const offer = pickOffer(launchOffer, null, priced.id, billingInterval, priced.priceCents);
    const saved = savingsFor(priced.priceCents, offer);
    if (!offer || saved <= 0) return priced;
    const finalCents = Math.max(0, priced.priceCents - saved);
    const period = billingInterval === "yearly" ? "year" : "month";
    return {
      ...priced,
      compareAtLabel: priced.priceLabel,
      priceCents: finalCents,
      priceLabel: formatRegionAmount(finalCents, priced.currency || "USD", {
        per: finalCents > 0 ? period : null,
      }),
      offerNote: offerPhrase(offer),
    };
  });
  const pricedCurrentPlan = withRegionPricing(currentPlan, draftRegion, regionPrices);
  const pakistanPricing = draftRegion === "pakistan";
  const planRankById = { starter: 1, custom: 2, live: 2, domain: 3, pro: 4 };

  const statusLabel = canceling ? "Cancels soon" : paidActive ? "Active" : "Free";
  const paidInvoices = invoices.filter((inv) => inv.status === "paid");

  return (
    <div className="space-y-6">
      {showPlan ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
          <div id="plan-region" className="rounded-2xl border border-white/10 bg-[#07122a]/80 p-5">
            <p className="text-xs uppercase tracking-wide text-blue-200/70">Step 1</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Confirm your region</h3>
            <p className="mt-1 text-sm text-blue-100">
              Payment and pricing use this region. Confirm it, then choose a package.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {regionLocked ? (
                <p className="rounded-lg border border-white/15 bg-white px-4 py-2 text-sm font-medium text-gray-900">
                  {(regions?.length ? regions : ALL_REGIONS).find((item) => item.id === draftRegion)?.name || draftRegion}
                </p>
              ) : (
                <RegionSelector
                  selectedRegion={draftRegion}
                  regions={regions}
                  onRegionChange={(nextRegion) => {
                    setDraftRegion(nextRegion);
                    setRegionConfirmed(false);
                    setRegionNotice("");
                  }}
                />
              )}
              {regionLocked ? (
                <p className="text-sm text-blue-200/80">Locked after your first subscription.</p>
              ) : (
                <button
                  type="button"
                  disabled={regionBusy || regionConfirmed}
                  onClick={confirmRegion}
                  className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
                >
                  {regionBusy ? "Saving…" : regionConfirmed ? "Region confirmed" : "Confirm region"}
                </button>
              )}
            </div>
            {regionNotice ? (
              <p className={`mt-3 text-sm ${regionConfirmed ? "text-cyan-100" : "text-amber-200"}`}>
                {regionNotice}
              </p>
            ) : null}
          </div>

          <div
            className={`rounded-2xl border p-5 ${
              paidActive
                ? "border-emerald-400/30 bg-emerald-500/10"
                : "border-white/10 bg-[#07122a]/80"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-blue-200/70">Current plan</p>
                <p className="mt-1 text-xl font-semibold text-white">
                  {paidActive
                    ? currentPlan?.name || billing?.planName
                    : "Free"}
                </p>
                <p className="mt-1 text-sm text-blue-100">
                  {canceling
                    ? `Keeps working until ${formatDate(billing?.currentPeriodEnd)}, then Free.`
                    : paidActive
                      ? `${pricedCurrentPlan?.priceLabel || billing?.priceLabel || ""} · Next period ${formatDate(billing?.currentPeriodEnd)}`
                      : pakistanPricing
                        ? "Default package · Rs 0 · 1 website · all templates · switch anytime. Cart & checkout is an add-on — contact us."
                        : "Default package · $0 · 1 website · all templates · switch anytime. Cart & checkout is an add-on — contact us."}
                </p>
                <p className="mt-2 text-xs text-blue-200/80">
                  Includes: {featureList(billing?.features).join(" · ") || "Free editor"}
                </p>
                {sitesUsed != null ? (
                  <p className="mt-2 text-sm text-cyan-100">
                    Using {sitesUsed} of {siteSlots} website slot{siteSlots === 1 ? "" : "s"}
                    {billing?.liveSites != null
                      ? ` · ${billing.liveSites} live${
                          billing.estimatedMonthlyCents
                            ? ` · ~$${(billing.estimatedMonthlyCents / 100).toFixed(0)}/mo`
                            : ""
                        }`
                      : ""}
                  </p>
                ) : null}
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  canceling
                    ? "bg-amber-400/20 text-amber-100"
                    : paidActive
                      ? "bg-emerald-400/20 text-emerald-200"
                      : "bg-white/10 text-blue-100"
                }`}
              >
                {statusLabel}
              </span>
            </div>
          </div>
          </div>

          {showPlan && message && !showBilling ? (
            <p className="text-sm text-cyan-200">{message}</p>
          ) : null}

          <div>
            <div className="max-w-xl">
              <h3 className="text-lg font-semibold text-white">Packages</h3>
              <p className="mt-1 text-sm leading-6 text-blue-100/75">
                {pakistanPricing
                  ? "Everyone starts on Free. Prices are in PKR and Pakistan plans are activated with local payment. Pro + PWA is contact us."
                  : "Everyone starts on Free. Prices are on each plan below. Pro + PWA is contact us."}
              </p>
            </div>
            <div className="mt-5 flex flex-col items-center">
              <div
                role="group"
                aria-label="Billing period"
                className="inline-flex h-10 items-center rounded-full border border-white/10 bg-[#040b1a] p-1"
              >
                <button
                  type="button"
                  onClick={() => setBillingInterval("monthly")}
                  className={`h-8 rounded-full px-4 text-sm font-semibold leading-none ${
                    billingInterval === "monthly" ? "bg-white text-[#041018]" : "text-blue-100 hover:text-white"
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingInterval("yearly")}
                  className={`inline-flex h-8 items-center gap-2 rounded-full px-4 text-sm font-semibold leading-none ${
                    billingInterval === "yearly" ? "bg-white text-[#041018]" : "text-blue-100 hover:text-white"
                  }`}
                >
                  Yearly
                  <span
                    className={`text-[10px] font-bold leading-none tracking-wide whitespace-nowrap ${
                      billingInterval === "yearly" ? "text-cyan-700" : "text-cyan-300"
                    }`}
                  >
                    2 months free
                  </span>
                </button>
              </div>
              <p className="mt-2 h-4 text-xs leading-4 text-cyan-200/80">
                {billingInterval === "yearly" ? "Pay for 10 months and get the full year." : ""}
              </p>
            </div>
            {launchOffer?.valueType ? (
              <div className="mt-4 max-w-xl rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-50">
                <p className="font-semibold">{launchOffer.name}</p>
                <p className="mt-1 text-cyan-100">
                  {offerPhrase(launchOffer)}
                  {launchOffer.daysRemaining != null
                    ? ` · Offer ends in ${launchOffer.daysRemaining} day${launchOffer.daysRemaining === 1 ? "" : "s"}`
                    : ""}
                  {launchOffer.spotsRemaining != null
                    ? ` · ${launchOffer.spotsRemaining} of ${launchOffer.totalSpots} left`
                    : ""}
                  {launchOffer.billingInterval
                    ? ` · ${launchOffer.billingInterval} billing`
                    : ""}
                </p>
              </div>
            ) : null}
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {shopPackages.map((item) => {
                if (item.id === "free" || item.billingType === "included") {
                  const onFree = !paidActive;
                  return (
                    <AddonCard
                      key={item.id}
                      item={item}
                      badge="Default"
                      current={onFree}
                      actionLabel={null}
                    />
                  );
                }
                
                // Pro plan is contact-only
                if (item.id === "pro" || item.contactOnly) {
                  return (
                    <AddonCard
                      key={item.id}
                      item={item}
                      badge="Enterprise"
                      current={false}
                      actionLabel="Contact us"
                      busy={busy}
                      disabled={false}
                      onAction={() => setShowProContactDialog(true)}
                    />
                  );
                }
                
                const isCurrent = paidActive && currentPlanId === item.id;
                const itemRank = planRankById[item.id] || 0;
                const isUpgrade = paidActive && itemRank > currentRank;
                const isDowngrade = paidActive && itemRank < currentRank;
                const liveQty = Math.max(1, Number(billing?.liveSites) || 1);
                const currentCents = Number(pricedCurrentPlan?.priceCents) || 0;
                const itemCents = Number(item.priceCents) || 0;
                const differenceCents = Math.max(0, (itemCents - currentCents) * liveQty);
                let actionLabel = null;
                if (stripe) {
                  if (isCurrent && canceling) {
                    actionLabel = "Keep this plan";
                  } else if (isUpgrade) {
                    actionLabel = `Upgrade · +${formatMoney(differenceCents, draftRegion)} now`;
                  } else if (!isCurrent && !canceling) {
                    actionLabel = isDowngrade
                      ? `Switch · ${item.priceLabel}`
                      : `Subscribe · ${item.priceLabel}`;
                  }
                }
                return (
                  <AddonCard
                    key={item.id}
                    item={item}
                    badge={isUpgrade ? "Upgrade" : isDowngrade ? "Downgrade" : billingInterval === "yearly" ? "Yearly" : "Monthly"}
                    current={isCurrent && !canceling}
                    actionLabel={actionLabel}
                    busy={busy}
                    disabled={!stripe}
                    onAction={() => {
                      if (!requireConfirmedRegion()) return;
                      if (isCurrent && canceling) {
                        setPlanChangePrompt({
                          planId: item.id,
                          title: `Keep ${item.name}?`,
                          description:
                            "We’ll stop the cancellation. Billing continues on this plan.",
                          confirmLabel: "Keep this plan",
                        });
                        return;
                      }
                      if (isUpgrade) {
                        const card = billing?.cardOnFile;
                        const hasCard = Boolean(billing?.hasCardOnFile && card?.label);
                        if (!hasCard || billingInterval === "yearly") {
                          onAction(billingInterval === "yearly" && hasCard ? "subscribe" : "checkout", item.id, purchaseExtra);
                          return;
                        }
                        setPlanChangePrompt({
                          planId: item.id,
                          mode: "upgrade",
                          title: `Upgrade to ${item.name}?`,
                          description: canceling
                            ? `We’ll stop the cancellation. Confirm to charge ${formatMoney(differenceCents, draftRegion)} now on your saved card (the difference). Starting next month you’ll be billed ${item.priceLabel} (additional sites ${item.additionalPriceLabel || "discounted"}).`
                            : `Confirm to charge ${formatMoney(differenceCents, draftRegion)} now on your saved card (the difference). Starting next month you’ll be billed ${item.priceLabel} (additional sites ${item.additionalPriceLabel || "discounted"}).`,
                          confirmLabel: `Charge ${formatMoney(differenceCents, draftRegion)} & upgrade`,
                          requireChargeConfirm: true,
                          chargeConfirmLabel: `I confirm charging ${formatMoney(differenceCents, draftRegion)} to ${card.label}`,
                          cardLabel: card.label,
                          changeCardOnly: false,
                        });
                        return;
                      }
                      if (isDowngrade) {
                        setPlanChangePrompt({
                          planId: item.id,
                          title: `Switch to ${item.name}?`,
                          description: `No charge now. Your plan switches to ${item.name} and starting next month you’ll be billed ${item.priceLabel} (additional sites ${item.additionalPriceLabel || "discounted"}).`,
                          confirmLabel: `Switch to ${item.name}`,
                        });
                        return;
                      }
                      // For initial subscribe, check if user has card
                      const card = billing?.cardOnFile;
                      const hasCard = Boolean(billing?.hasCardOnFile && card?.label);
                      if (!hasCard) {
                        onAction("checkout", item.id, purchaseExtra);
                        return;
                      }
                      const periodWord = billingInterval === "yearly" ? "yearly" : "monthly";
                      setPlanChangePrompt({
                        planId: item.id,
                        mode: "subscribe",
                        title: `Subscribe to ${item.name}?`,
                        description: `Confirm to charge ${item.priceLabel} now on your saved card. You'll be billed ${periodWord}.`,
                        confirmLabel: `Subscribe · ${item.priceLabel}`,
                        requireChargeConfirm: true,
                        chargeConfirmLabel: `I confirm charging ${item.priceLabel} to ${card.label}`,
                        cardLabel: card.label,
                        changeCardOnly: false,
                      });
                    }}
                  />
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Add another website</h3>
              <p className="mt-1 text-sm text-blue-100">
                Each plan includes 1 website. You can add more websites — each gets its own plan and price.
              </p>
            </div>

            {canCreateSite ? (
              /* Slot already bought — just let them create the site */
              <button
                type="button"
                disabled={busy}
                onClick={() => onCreateSiteRequest?.()}
                className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
              >
                Create your additional website
              </button>
            ) : sitesUsed != null && sitesUsed >= siteSlots && siteSlots >= (billing?.maxWebsiteSlots || 10) ? (
              <p className="text-sm text-emerald-200">
                Extra website already created ({sitesUsed} of {siteSlots}).
              </p>
            ) : stripe ? (
              <div className="space-y-4">
                {/* Step 1 — trigger button */}
                {!showSlotPicker ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setShowSlotPicker(true)}
                    className="rounded-full border border-cyan-400/40 bg-cyan-500/15 px-5 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/25 disabled:opacity-60"
                  >
                    + Add another website
                  </button>
                ) : (
                  /* Step 2 — inline plan picker */
                  <div className="rounded-2xl border border-white/10 bg-[#07122a]/80 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-white">Step 1: Choose a plan for your new website</p>
                        <p className="mt-0.5 text-xs text-blue-200/70">
                          Each site can have its own plan. You&apos;ll be charged on-site.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowSlotPicker(false)}
                        className="text-xs text-blue-200/60 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {[
                        { id: "free",    name: "Free",      price: shopPackages.find((plan) => plan.id === "free")?.additionalPriceLabel || "$5/mo",  hint: "Draft only · no live hosting" },
                        { id: "starter", name: "Starter",   price: shopPackages.find((plan) => plan.id === "starter")?.additionalPriceLabel || "$7/mo",  hint: "Live · auto Technonaire address" },
                        { id: "custom",  name: "Custom",    price: shopPackages.find((plan) => plan.id === "custom")?.additionalPriceLabel || "$15/mo", hint: "Live · chosen Technonaire address" },
                        { id: "domain",  name: "Domain",    price: shopPackages.find((plan) => plan.id === "domain")?.additionalPriceLabel || "$24/mo", hint: "Live · use your own domain" },
                      ].map((slot) => {
                        const isCurrent = currentPlanId === slot.id;
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              if (!requireConfirmedRegion()) return;
                              setShowSlotPicker(false);
                              const card = billing?.cardOnFile;
                              const hasCard = Boolean(billing?.hasCardOnFile && card?.label);
                              
                              if (!hasCard) {
                                // No card → always redirect to Stripe Checkout
                                onAction("buy-site-slot", slot.id);
                                return;
                              }
                              
                              setPlanChangePrompt({
                                mode: "buy-slot",
                                slotPlanId: slot.id,
                                slotName: slot.name,
                                title: `Add website on ${slot.name}?`,
                                description: `Confirm to charge ${slot.price} now on your saved card for one extra website slot (${slot.hint}). After payment you can name and create the new site.`,
                                confirmLabel: `Charge ${slot.price} & add website`,
                                requireChargeConfirm: true,
                                chargeConfirmLabel: `I confirm charging ${slot.price} to ${card.label}`,
                                cardLabel: card.label,
                                changeCardOnly: false,
                              });
                            }}
                            className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition disabled:opacity-60 ${
                              isCurrent
                                ? "border-cyan-400/50 bg-cyan-500/15 hover:bg-cyan-500/25"
                                : "border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10"
                            }`}
                          >
                            <span>
                              <span className="block font-semibold text-white">
                                {slot.name}
                                {isCurrent ? (
                                  <span className="ml-1.5 text-[10px] font-bold text-cyan-300 uppercase">
                                    your current plan
                                  </span>
                                ) : null}
                              </span>
                              <span className="text-xs text-blue-200/70">{slot.hint}</span>
                            </span>
                            <span className="ml-4 shrink-0 font-bold text-cyan-200">{slot.price}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold text-white">Add-ons</h3>
                <p className="mt-1 text-sm text-blue-100">
                  Optional extras. Cart is not included in templates — contact us to add it.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {(billing?.shopAddons || billing?.contactAddons || []).map((item) => {
                  const hasCart =
                    item.id === "cart" &&
                    (billing?.hasCartAddon ||
                      (billing?.purchasedAddonIds || []).includes("cart"));
                  return (
                    <AddonCard
                      key={item.id}
                      item={item}
                      badge={hasCart ? "Enabled" : "Add-on"}
                      current={hasCart}
                      actionLabel={hasCart ? null : "Contact us"}
                      onAction={hasCart ? undefined : () => onContactUs?.()}
                    />
                  );
                })}
                <AddonCard
                  item={{
                    name: "Any other service",
                    priceLabel: "Custom",
                    description:
                      "Need extra sites, integrations, copy, design, or something we don't list? Tell us what you need.",
                    highlights: [
                      "Custom quote",
                      "Opens support chat in the sidebar",
                      `Or email ${CONTACT_EMAIL}`,
                      "No checkout until we agree",
                    ],
                  }}
                  badge="Contact us"
                  actionLabel="Contact us"
                  onAction={() => onContactUs?.()}
                />
              </div>
            </div>
          </div>
        </>
      ) : null}

      {showBilling ? (
        <>
          {message ? <p className="text-sm text-cyan-200">{message}</p> : null}

          {paidActive ? (
            <div className="flex flex-wrap gap-2">
              {billing?.hasStripeCustomer ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onAction("portal")}
                  className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium hover:bg-white/5 disabled:opacity-60"
                >
                  Update card
                </button>
              ) : null}
              {!canceling ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Cancel at period end (${formatDate(billing?.currentPeriodEnd)})? You keep access until then, then return to Free.`,
                      )
                    ) {
                      onAction("cancel");
                    }
                  }}
                  className="rounded-full border border-rose-400/40 px-4 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-500/10 disabled:opacity-60"
                >
                  Cancel plan
                </button>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-blue-100">
              No monthly subscription yet. Choose Starter, Custom, Domain, or Pro in the Plan section.
            </p>
          )}

          <div>
            <h3 className="text-sm font-semibold tracking-wide text-cyan-200 uppercase">
              Payment history
              {paidInvoices.length ? ` (${paidInvoices.length})` : ""}
            </h3>
            {paidInvoices.length === 0 ? (
              <p className="mt-3 text-sm text-blue-100">No payments yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-white/10 rounded-2xl border border-white/10">
                {paidInvoices.map((inv) => (
                  <li key={inv.id}>
                    <Link
                      href={`/invoice/${inv.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm transition hover:bg-white/5"
                    >
                      <div>
                        <p className="font-medium text-white">{inv.number}</p>
                        <p className="text-xs text-blue-200/70">
                          {formatDate(inv.createdAt)} · {inv.planName || "Package"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatMoney(inv.amountCents)} USD</p>
                        <p
                          className={`text-xs capitalize ${
                            inv.status === "paid" ? "text-emerald-300" : "text-amber-200"
                          }`}
                        >
                          {inv.status}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}

      <PlanChangeDialog
        open={Boolean(planChangePrompt)}
        eyebrow={
          planChangePrompt?.mode === "buy-slot" ? "Add another website" : "Plan"
        }
        title={planChangePrompt?.title || ""}
        description={planChangePrompt?.description || ""}
        confirmLabel={planChangePrompt?.confirmLabel || "Continue"}
        busy={busy}
        requireChargeConfirm={Boolean(planChangePrompt?.requireChargeConfirm)}
        chargeConfirmLabel={planChangePrompt?.chargeConfirmLabel}
        cardLabel={planChangePrompt?.cardLabel || null}
        changeCardLabel="Change card"
        onChangeCard={
          billing?.hasStripeCustomer || planChangePrompt?.changeCardOnly
            ? () => {
                setPlanChangePrompt(null);
                onAction("portal");
              }
            : undefined
        }
        onCancel={() => {
          if (!busy) setPlanChangePrompt(null);
        }}
        onConfirm={() => {
          if (planChangePrompt?.changeCardOnly) {
            setPlanChangePrompt(null);
            onAction("portal");
            return;
          }
          if (!requireConfirmedRegion()) return;
          if (planChangePrompt?.mode === "buy-slot") {
            const slotPlanId = planChangePrompt.slotPlanId;
            setPlanChangePrompt(null);
            if (slotPlanId) onAction("buy-site-slot-onsite", slotPlanId);
            return;
          }
          const planId = planChangePrompt?.planId;
          setPlanChangePrompt(null);
          if (planId) onAction("subscribe", planId, purchaseExtra);
        }}
      />

      <AddPaymentMethodDialog
        open={showAddPaymentDialog}
        title="Add payment method"
        description={
          pendingPurchase?.planName
            ? `Add a card to subscribe to ${pendingPurchase.planName} on-site.`
            : pendingPurchase?.slotName
              ? `Add a card to purchase an additional website slot for ${pendingPurchase.slotPrice}.`
              : "Add a card to complete your purchase on-site without redirecting to Stripe Checkout."
        }
        busy={busy}
        onSuccess={() => {
          setShowAddPaymentDialog(false);
          if (!requireConfirmedRegion()) return;
          // After card is added, automatically retry the purchase
          if (pendingPurchase?.action === "subscribe") {
            onAction("subscribe-onsite", pendingPurchase.planId, purchaseExtra);
          } else if (pendingPurchase?.action === "buy-site-slot") {
            onAction("buy-site-slot-onsite", pendingPurchase.slotPlanId);
          }
          setPendingPurchase(null);
        }}
        onCancel={() => {
          if (!busy) {
            setShowAddPaymentDialog(false);
            setPendingPurchase(null);
          }
        }}
        onError={(err) => {
          console.error("Payment method error:", err);
        }}
      />

      <ProContactDialog
        open={showProContactDialog}
        onClose={() => setShowProContactDialog(false)}
      />
    </div>
  );
}

