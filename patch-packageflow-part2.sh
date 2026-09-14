#!/bin/bash
set -e

FILE="src/components/billing/PackageFlow.js"

# Update the slot picker onClick to check for card first
python3 - "$FILE" << 'PYTHON_EOF'
import sys
import re

with open(sys.argv[1], 'r') as f:
    content = f.read()

# Replace the slot picker onClick
old_slot_onclick = r'''onClick=\(\(\) => \{
\s+setShowSlotPicker\(false\);
\s+setPlanChangePrompt\(\{
\s+mode: "buy-slot",
\s+slotPlanId: slot\.id,
\s+title: `Add website on \$\{slot\.name\}\?`,
\s+description: `You'll pay \$\{slot\.price\} via Stripe for one extra website slot \(\$\{slot\.hint\}\)\. After payment you can name and create the new site\.`,
\s+confirmLabel: `Continue to payment · \$\{slot\.price\}`,
\s+\}\);
\s+\}\)'''

new_slot_onclick = '''onClick={() => {
                              setShowSlotPicker(false);
                              const card = billing?.cardOnFile;
                              const hasCard = Boolean(billing?.hasCardOnFile && card?.label);
                              if (!hasCard) {
                                setPendingPurchase({ action: "buy-site-slot", slotPlanId: slot.id, slotName: slot.name, slotPrice: slot.price });
                                setShowAddPaymentDialog(true);
                                return;
                              }
                              setPlanChangePrompt({
                                mode: "buy-slot",
                                slotPlanId: slot.id,
                                title: `Add website on ${slot.name}?`,
                                description: `You'll pay ${slot.price} for one extra website slot (${slot.hint}). After payment you can name and create the new site.`,
                                confirmLabel: `Charge ${slot.price}`,
                                requireChargeConfirm: true,
                                chargeConfirmLabel: `I confirm charging ${slot.price} to ${card.label}`,
                                cardLabel: card.label,
                              });
                            }}'''

content = re.sub(old_slot_onclick, new_slot_onclick, content, flags=re.DOTALL)

# Update the onConfirm handler
old_onconfirm = r'''onConfirm=\(\(\) => \{
\s+if \(planChangePrompt\?\.changeCardOnly\) \{
\s+setPlanChangePrompt\(null\);
\s+onAction\("portal"\);
\s+return;
\s+\}
\s+if \(planChangePrompt\?\.mode === "buy-slot"\) \{
\s+const slotPlanId = planChangePrompt\.slotPlanId;
\s+setPlanChangePrompt\(null\);
\s+if \(slotPlanId\) onAction\("buy-site-slot", slotPlanId\);
\s+return;
\s+\}
\s+const planId = planChangePrompt\?\.planId;
\s+setPlanChangePrompt\(null\);
\s+if \(planId\) onAction\("subscribe", planId\);
\s+\}\)'''

new_onconfirm = '''onConfirm={() => {
          if (planChangePrompt?.changeCardOnly) {
            setPlanChangePrompt(null);
            onAction("portal");
            return;
          }
          if (planChangePrompt?.mode === "buy-slot") {
            const slotPlanId = planChangePrompt.slotPlanId;
            setPlanChangePrompt(null);
            if (slotPlanId) onAction("buy-site-slot-onsite", slotPlanId);
            return;
          }
          const planId = planChangePrompt?.planId;
          const mode = planChangePrompt?.mode;
          setPlanChangePrompt(null);
          if (planId) {
            // Use on-site charge if mode is subscribe/upgrade and has card
            if (mode === "subscribe" || mode === "upgrade") {
              onAction("subscribe-onsite", planId);
            } else {
              onAction("subscribe", planId);
            }
          }
        }}'''

content = re.sub(old_onconfirm, new_onconfirm, content, flags=re.DOTALL)

with open(sys.argv[1], 'w') as f:
    f.write(content)

print("Part 2 replacements done", file=sys.stderr)
PYTHON_EOF

# Add the AddPaymentMethodDialog before the closing </div> at the end
python3 - "$FILE" << 'PYTHON_EOF2'
import sys

with open(sys.argv[1], 'r') as f:
    content = f.read()

# Find the last </PlanChangeDialog> and add AddPaymentMethodDialog after it
dialog_addition = '''
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
          // After card is added, automatically retry the purchase
          if (pendingPurchase?.action === "subscribe") {
            onAction("subscribe-onsite", pendingPurchase.planId);
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
      />'''

# Insert before the final </div> and closing brace
content = content.replace('      />\n    </div>\n  );\n}\n', f'      />\n{dialog_addition}\n    </div>\n  );\n}}\n')

with open(sys.argv[1], 'w') as f:
    f.write(content)

print("Dialog added", file=sys.stderr)
PYTHON_EOF2

echo "Part 2 patches applied"
