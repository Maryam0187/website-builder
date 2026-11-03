"use client";

import { useState } from "react";

/**
 * Confirmation dialog for subscription actions (cancel/downgrade)
 */
export function SubscriptionConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  action, 
  planName,
  periodEnd 
}) {
  const [confirming, setConfirming] = useState(false);

  if (!isOpen) return null;

  const actionLabels = {
    cancel: {
      title: "Cancel Subscription?",
      message: `Your ${planName} subscription will remain active until ${periodEnd}. After that, your sites will be unpublished and domains will be released 30 days later.`,
      confirmButton: "Confirm Cancellation",
      cancelButton: "Keep Subscription",
    },
    downgrade: {
      title: "Downgrade Plan?",
      message: `You'll switch to a lower plan at the end of your current billing period (${periodEnd}). If your sites exceed the new plan's limits, they may be unpublished.`,
      confirmButton: "Confirm Downgrade",
      cancelButton: "Keep Current Plan",
    },
  };

  const labels = actionLabels[action] || actionLabels.cancel;

  async function handleConfirm() {
    setConfirming(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error("Confirmation error:", error);
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {labels.title}
          </h2>
          
          <p className="text-gray-700 mb-6">
            {labels.message}
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-amber-900 mb-2">What happens next:</h3>
            <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
              {action === "cancel" && (
                <>
                  <li>Access continues until period end</li>
                  <li>Sites unpublished after period ends</li>
                  <li>Custom domains released after 30 days</li>
                  <li>You can resubscribe anytime</li>
                </>
              )}
              {action === "downgrade" && (
                <>
                  <li>Plan changes at period end</li>
                  <li>Pro-rated credit applied if applicable</li>
                  <li>Sites may be unpublished if limits exceeded</li>
                  <li>You can upgrade again anytime</li>
                </>
              )}
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={confirming}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 font-medium"
            >
              {labels.cancelButton}
            </button>
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
            >
              {confirming ? "Processing..." : labels.confirmButton}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
