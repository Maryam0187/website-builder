#!/bin/bash
set -e

FILE="src/components/billing/PackageFlow.js"

# 1. Add import
sed -i 's|import PlanChangeDialog from "@/components/billing/PlanChangeDialog";|import PlanChangeDialog from "@/components/billing/PlanChangeDialog";\nimport AddPaymentMethodDialog from "@/components/billing/AddPaymentMethodDialog";|' "$FILE"

# 2. Add state variables after planChangePrompt
sed -i 's|const \[planChangePrompt, setPlanChangePrompt\] = useState(null);|const [planChangePrompt, setPlanChangePrompt] = useState(null);\n  const [showAddPaymentDialog, setShowAddPaymentDialog] = useState(false);\n  const [pendingPurchase, setPendingPurchase] = useState(null);|' "$FILE"

# 3. Replace the upgrade "need card" logic (line ~280-290) - replace the whole setPlanChangePrompt block
# This is complex so we'll use a marker-based approach
# First add a marker before the problematic section
sed -i '/if (!hasCard) {/{N;s/if (!hasCard) {\n *setPlanChangePrompt/if (!hasCard) {\n                          \/\/ MARKER_UPGRADE_NO_CARD\n                          setPlanChangePrompt/}' "$FILE"

# Now replace from marker to the end of that block
python3 - "$FILE" << 'PYTHON_EOF'
import sys
import re

with open(sys.argv[1], 'r') as f:
    content = f.read()

# Replace the upgrade no-card section
old_pattern = r'// MARKER_UPGRADE_NO_CARD\n\s+setPlanChangePrompt\(\{[^}]+planId: item\.id,[^}]+mode: "upgrade-need-card"[^}]+\}\);\s+return;\s+\}'
new_code = '''setPendingPurchase({ action: "subscribe", planId: item.id, planName: item.name });
                          setShowAddPaymentDialog(true);
                          return;
                        }'''
content = re.sub(old_pattern, new_code, content, flags=re.DOTALL)

# Replace the final onAction("subscribe", item.id) with card check
old_subscribe = r'onAction\("subscribe", item\.id\);'
new_subscribe = '''// For initial subscribe, check if user has card
                      const card = billing?.cardOnFile;
                      const hasCard = Boolean(billing?.hasCardOnFile && card?.label);
                      if (!hasCard) {
                        setPendingPurchase({ action: "subscribe", planId: item.id, planName: item.name });
                        setShowAddPaymentDialog(true);
                        return;
                      }
                      // Has card, show confirmation
                      setPlanChangePrompt({
                        planId: item.id,
                        mode: "subscribe",
                        title: `Subscribe to ${item.name}?`,
                        description: `Confirm to charge ${item.priceLabel} now on your saved card. You'll be billed monthly.`,
                        confirmLabel: `Subscribe · ${item.priceLabel}`,
                        requireChargeConfirm: true,
                        chargeConfirmLabel: `I confirm charging ${item.priceLabel} to ${card.label}`,
                        cardLabel: card.label,
                        changeCardOnly: false,
                      });'''
content = re.sub(old_subscribe, new_subscribe, content)

with open(sys.argv[1], 'w') as f:
    f.write(content)

print("Python replacements done", file=sys.stderr)
PYTHON_EOF

echo "Basic patches applied"
