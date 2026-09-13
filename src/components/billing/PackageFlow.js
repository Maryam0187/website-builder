"use client";

import { useState } from "react";
import Link from "next/link";
import PlanChangeDialog from "@/components/billing/PlanChangeDialog";

function formatMoney(cents) {
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

function featureList(features) {
  const address =
    features?.technonaireAddress === "random"
      ? "Random Technonaire address"
      : features?.technonaireAddress === "chosen"
        ? "Choose your .technonaire.site address"
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
      <p className="mt-1 text-2xl font-semibold text-cyan-200">{item.priceLabel}</p>
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
  view = "all",
}) {
  const [showSlotPicker, setShowSlotPicker] = useState(false);
  const [planChangePrompt, setPlanChangePrompt] = useState(null);
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
  const shopPackages =
    billing?.shopPackages?.length > 0
      ? billing.shopPackages
      : allPlans.filter((p) => p.id === "free" || monthlyPlanIds.has(p.id));
  const planRankById = { starter: 1, custom: 2, live: 2, domain: 3, pro: 4 };

  const statusLabel = canceling ? "Cancels soon" : paidActive ? "Active" : "Free";
  const paidInvoices = invoices.filter((inv) => inv.status === "paid");

  return (
    <div className="space-y-6">
      {showPlan ? (
        <>
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
                      ? `${billing?.priceLabel || ""} · Next period ${formatDate(billing?.currentPeriodEnd)}`
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

          {showPlan && message && !showBilling ? (
            <p className="text-sm text-cyan-200">{message}</p>
          ) : null}

          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-semibold text-white">Packages</h3>
              <p className="mt-1 text-sm text-blue-100">
                Everyone starts on Free. Subscribe to Starter ($9), Custom ($19), Domain ($29), or
                Pro + PWA ($39) to publish and host. Already subscribed? Upgrade charges only the
                difference on your saved card. Downgrade switches plans with no charge now — the
                lower price starts next month. Additional websites available at discounted monthly prices.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
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
                const isCurrent = paidActive && currentPlanId === item.id;
                const itemRank = planRankById[item.id] || 0;
                const isUpgrade = paidActive && itemRank > currentRank;
                const isDowngrade = paidActive && itemRank < currentRank;
                const liveQty = Math.max(1, Number(billing?.liveSites) || 1);
                const currentCents = Number(currentPlan?.priceCents) || 0;
                const itemCents = Number(item.priceCents) || 0;
                const differenceCents = Math.max(0, (itemCents - currentCents) * liveQty);
                let actionLabel = null;
                if (stripe) {
                  if (isCurrent && canceling) {
                    actionLabel = "Keep this plan";
                  } else if (isUpgrade) {
                    actionLabel = `Upgrade · +${formatMoney(differenceCents)} now`;
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
                    badge={isUpgrade ? "Upgrade" : isDowngrade ? "Downgrade" : "Monthly"}
                    current={isCurrent && !canceling}
                    actionLabel={actionLabel}
                    busy={busy}
                    disabled={!stripe}
                    onAction={() => {
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
                        if (!hasCard) {
                          setPlanChangePrompt({
                            planId: item.id,
                            mode: "upgrade-need-card",
                            title: `Upgrade to ${item.name}?`,
                            description: `To charge the ${formatMoney(differenceCents)} difference without Checkout, add a card first. You can update your payment method in Stripe, then come back and upgrade.`,
                            confirmLabel: "Add or change card",
                            requireChargeConfirm: false,
                            cardLabel: null,
                            changeCardOnly: true,
                          });
                          return;
                        }
                        setPlanChangePrompt({
                          planId: item.id,
                          mode: "upgrade",
                          title: `Upgrade to ${item.name}?`,
                          description: canceling
                            ? `We’ll stop the cancellation. Confirm to charge ${formatMoney(differenceCents)} now on your saved card (the difference). Starting next month you’ll be billed ${item.priceLabel} (additional sites ${item.additionalPriceLabel || "discounted"}).`
                            : `Confirm to charge ${formatMoney(differenceCents)} now on your saved card (the difference). Starting next month you’ll be billed ${item.priceLabel} (additional sites ${item.additionalPriceLabel || "discounted"}).`,
                          confirmLabel: `Charge ${formatMoney(differenceCents)} & upgrade`,
                          requireChargeConfirm: true,
                          chargeConfirmLabel: `I confirm charging ${formatMoney(differenceCents)} to ${card.label}`,
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
                      onAction("subscribe", item.id);
                    }}
                  />
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Additional websites</h3>
              <p className="mt-1 text-sm text-blue-100">
                Each plan includes 1 website. You can add a second website on any plan.
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
                Create your extra website
              </button>
            ) : sitesUsed != null && sitesUsed >= siteSlots && siteSlots >= 2 ? (
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
                    + Add second website
                  </button>
                ) : (
                  /* Step 2 — inline plan picker */
                  <div className="rounded-2xl border border-white/10 bg-[#07122a]/80 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-white">Choose a plan for your second website</p>
                        <p className="mt-0.5 text-xs text-blue-200/70">
                          Each site can have its own plan. You&apos;ll be charged via Stripe.
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
                        { id: "free",    name: "Free",      price: "$5/mo",  hint: "Draft only · no hosting" },
                        { id: "starter", name: "Starter",   price: "$7/mo",  hint: "Live · auto Technonaire address" },
                        { id: "custom",  name: "Custom",    price: "$15/mo", hint: "Live · chosen Technonaire address" },
                        { id: "domain",  name: "Domain",    price: "$24/mo", hint: "Live · your own domain" },
                        { id: "pro",     name: "Pro + PWA", price: "$34/mo", hint: "Live · domain + installable PWA" },
                      ].map((slot) => {
                        const isCurrent = currentPlanId === slot.id;
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              setShowSlotPicker(false);
                              setPlanChangePrompt({
                                mode: "buy-slot",
                                slotPlanId: slot.id,
                                title: `Add a second website on ${slot.name}?`,
                                description: `You’ll pay ${slot.price} via Stripe for one extra website slot (${slot.hint}). After payment you can name and create the new site.`,
                                confirmLabel: `Continue to pay · ${slot.price}`,
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
                                    your plan
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
          if (planChangePrompt?.mode === "buy-slot") {
            const slotPlanId = planChangePrompt.slotPlanId;
            setPlanChangePrompt(null);
            if (slotPlanId) onAction("buy-site-slot", slotPlanId);
            return;
          }
          const planId = planChangePrompt?.planId;
          setPlanChangePrompt(null);
          if (planId) onAction("subscribe", planId);
        }}
      />
    </div>
  );
}

