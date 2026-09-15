# Urgent Bugfix Summary - September 14, 2026

## ✅ All Three Critical Bugs FIXED

### 🐛 Bug #1: All websites showing last bought plan
**Status:** ✅ **FIXED**

**Root Cause:**
- `mapOwnerSite()` function in `/src/app/api/profile/route.js` was missing the `planId` field
- When profile API returned the list of user's sites, each site object didn't include its `plan_id`
- Profile page tried to display `item.planId` but it was undefined, falling back to account plan or free

**Fix Applied:**
```javascript
// src/app/api/profile/route.js line 21-34
function mapOwnerSite(s) {
  return {
    id: s.id,
    slug: s.slug,
    // ... other fields ...
    planId: s.planId || "free", // ← ADDED THIS LINE
  };
}
```

**Impact:**
- ✅ Each website card now displays its own stored `plan_id`
- ✅ Starter site stays Starter even if user later buys Custom for site 2
- ✅ Plan badges show correct plan per site, not account plan

**Files Changed:**
- `src/app/api/profile/route.js` (1 line added)

---

### 🐛 Bug #2: Still redirecting to Stripe Checkout
**Status:** ✅ **FIXED**

**Root Cause:**
- "Add another website" flow in PackageFlow didn't check for saved card
- After user selected a plan, it always called `onAction("buy-site-slot")` which went through `/api/billing` → Stripe Checkout redirect
- On-site payment flow (saved card or Payment Element) was never used for additional websites

**Fix Applied:**
1. **Check for card on file before showing confirmation** (lines 410-437):
```javascript
// src/components/billing/PackageFlow.js
onClick={() => {
  setShowSlotPicker(false);
  const card = billing?.cardOnFile;
  const hasCard = Boolean(billing?.hasCardOnFile && card?.label);
  
  if (!hasCard) {
    // No card → show AddPaymentMethodDialog
    setPendingPurchase({ 
      action: "buy-site-slot", 
      slotPlanId: slot.id, 
      slotName: slot.name,
      slotPrice: slot.price
    });
    setShowAddPaymentDialog(true);
    return;
  }
  
  // Has card → show confirmation with card details
  setPlanChangePrompt({
    mode: "buy-slot",
    slotPlanId: slot.id,
    title: `Add website on ${slot.name}?`,
    description: `Confirm to charge ${slot.price} now on your saved card...`,
    confirmLabel: `Charge ${slot.price} & add website`,
    requireChargeConfirm: true,
    chargeConfirmLabel: `I confirm charging ${slot.price} to ${card.label}`,
    cardLabel: card.label,
  });
}}
```

2. **Use on-site API for buy-slot** (line 623):
```javascript
// Changed from:
if (slotPlanId) onAction("buy-site-slot", slotPlanId);

// To:
if (slotPlanId) onAction("buy-site-slot-onsite", slotPlanId);
```

3. **Updated description text** (line 385):
```javascript
// Changed: "You'll be charged via Stripe"
// To: "You'll be charged on-site"
```

**Impact:**
- ✅ Subscribe with saved card → confirm dialog → charge on-site
- ✅ Subscribe without card → AddPaymentMethodDialog → save card → charge on-site
- ✅ Buy extra site with saved card → confirm dialog → charge on-site  
- ✅ Buy extra site without card → AddPaymentMethodDialog → save card → charge on-site
- ✅ ONLY "Update card" button may redirect to Stripe Customer Portal

**Files Changed:**
- `src/components/billing/PackageFlow.js` (~30 lines modified)

---

### 🐛 Bug #3: Additional website flow broken
**Status:** ✅ **FIXED**

**Root Cause:**
- Combination of bugs #1 and #2
- Even when slotPlanId was passed through payment, it wasn't being used correctly:
  - Profile page tried to read site's planId but API didn't return it (Bug #1)
  - Payment flow redirected to Stripe instead of staying on-site (Bug #2)
  - Result: flow broke before site could be created with correct plan

**Fix Applied:**
Bugs #1 and #2 fixes combined solve this issue. The complete flow now works:

1. **User clicks "Add another website"** → Shows plan picker
2. **User selects plan (e.g., Custom)** → Checks for saved card
   - Has card → Confirmation dialog
   - No card → AddPaymentMethodDialog
3. **Payment processed** → `/api/billing/charge-on-site` with `slotPlanId: "custom"`
4. **Response received** → `{ slotPlanId: "custom", promptCreateSite: true }`
5. **Profile page stores** → `setNewSitePlanId("custom")`
6. **User names site** → SiteNameDialog appears
7. **Site created** → `createOwnerSite(userId, { planId: "custom" })`
8. **Database stores** → `INSERT INTO sites (plan_id) VALUES ('custom')`
9. **Profile refreshes** → `mapOwnerSite()` includes `planId: "custom"`
10. **UI displays** → Site card shows "Custom" badge (not account plan)

**Impact:**
- ✅ Pick plan → pay on-site → invoice/continue → name site
- ✅ Site created with correct plan_id stored in database
- ✅ Plan badge displays correct plan (not account plan)
- ✅ Site switcher guide shows correctly
- ✅ Each site restricted to its own plan's capabilities

**Files Changed:**
- `src/app/api/profile/route.js` (bug #1 fix)
- `src/components/billing/PackageFlow.js` (bug #2 fix)

---

## 🧪 Test Coverage

### New Test File: `tests/bugfix-regression.test.js`
**Status:** ✅ All tests passing

**Test Suites:**
1. ✅ **Test 1:** Each website shows its own plan
   - Verifies mapOwnerSite includes planId
   - Verifies each site badge displays correct plan

2. ✅ **Test 2:** On-site payment flow (no redirect)
   - Subscribe with/without card → on-site flow
   - Buy extra site with/without card → on-site flow
   - Upgrade with card → on-site flow

3. ✅ **Test 3:** Additional website flow end-to-end
   - 8 steps from "Add website" button to correct plan badge display
   - Covers both has-card and no-card paths

4. ✅ **Test 4:** slotPlanId preservation
   - Tracks slotPlanId through entire 12-step flow
   - From user selection to database storage to UI display

5. ✅ **Test 5:** No Stripe Checkout redirect
   - Verifies primary purchase paths stay on-site
   - Confirms only "Update card" may redirect

### Existing Tests
- ✅ `tests/domain-ux.test.js` - All 34 tests passing
- ✅ `tests/website-slots.test.js` - All tests passing
- ❌ `tests/site-address.test.js` - Pre-existing module import error (unrelated to our changes)

---

## 📝 Commit Details

**Branch:** `cursor/custom-and-domain-plans-5fbd`
**Commit SHA:** `fd4c39c58acdde71a6085d67e0ce748af531c3a6`
**Commit Message:** "fix: critical bugs in website plan display, payment flow, and additional website creation"

**Files Changed:**
1. `src/app/api/profile/route.js` (+1 line)
2. `src/components/billing/PackageFlow.js` (~30 lines modified)
3. `tests/bugfix-regression.test.js` (+276 lines, new file)

**Remote Status:** ✅ Pushed to `origin/cursor/custom-and-domain-plans-5fbd`

---

## 🔄 Pull Request Updated

**PR #1:** https://github.com/Maryam0187/website-builder/pull/1
**Status:** Updated with bugfix summary at top of description

The PR description now includes:
- ⚠️ Critical Bugfixes section at the top
- Detailed root cause analysis for each bug
- Fix implementation details
- Impact statements
- Test coverage summary

---

## ✅ Manual Verification Steps

### Bug #1 Verification: Plan badges show correct plans
**Expected Result:** Each website displays its own plan, not account plan

**Steps:**
1. Create user account with 2+ websites
2. Set site 1 to Starter plan (`plan_id = 'starter'`)
3. Set site 2 to Custom plan (`plan_id = 'custom'`)
4. Go to Profile → Websites tab
5. **Verify:** Site 1 badge shows "Starter"
6. **Verify:** Site 2 badge shows "Custom"
7. **Verify:** Badges don't change even if user account plan is different

### Bug #2 Verification: On-site payment (no redirect)
**Expected Result:** Payment stays on Technonaire, no Stripe Checkout redirect

**Path 1: Has saved card**
1. User with saved card clicks "Add another website"
2. Selects plan (e.g., Custom $15/mo)
3. **Verify:** Shows confirmation dialog with card info ("Card •••• 4242")
4. **Verify:** Has checkbox: "I confirm charging $15/mo to Card •••• 4242"
5. User checks box and clicks "Charge $15/mo & add website"
6. **Verify:** Stays on Technonaire (no redirect to Stripe)
7. **Verify:** Shows success overlay with invoice link
8. **Verify:** Prompts to create new website

**Path 2: No saved card**
1. User without card clicks "Add another website"
2. Selects plan (e.g., Custom $15/mo)
3. **Verify:** Shows AddPaymentMethodDialog with embedded Stripe Payment Element
4. User enters test card 4242 4242 4242 4242
5. **Verify:** Card saved, then automatically charges for website slot
6. **Verify:** Never redirected to Stripe (stays on Technonaire)
7. **Verify:** Shows success overlay with invoice link
8. **Verify:** Prompts to create new website

### Bug #3 Verification: Additional website with correct plan
**Expected Result:** New website created with selected plan, displays correct badge

**Steps:**
1. User with saved card clicks "Add another website"
2. Selects "Domain" plan ($24/mo)
3. Confirms charge on saved card
4. **Verify:** Payment succeeds, invoice created
5. Names new website "My Shop"
6. **Verify:** Site created in database with `plan_id = 'domain'`
7. Go to Profile → Websites tab
8. **Verify:** "My Shop" card displays "Domain" badge
9. **Verify:** Badge shows "Domain", not user's account plan
10. **Verify:** Site switcher guide appears (if this is 2nd site)

---

## 🎯 Root Cause Summary

| Bug | Root Cause | Fix Location | Lines Changed |
|-----|-----------|--------------|---------------|
| #1: Wrong plan badges | API not returning planId | `src/app/api/profile/route.js` | +1 |
| #2: Stripe redirect | PackageFlow not checking for card | `src/components/billing/PackageFlow.js` | ~30 |
| #3: Broken flow | Combination of #1 and #2 | Both files above | +31 total |

---

## 📊 Impact Assessment

### Fixed Issues
1. ✅ Each website displays and uses ONLY its own stored `plan_id`
2. ✅ Primary purchase paths stay on Technonaire (subscribe, upgrade, buy extra site)
3. ✅ Additional website flow works end-to-end
4. ✅ slotPlanId preserved through entire payment → creation → display flow
5. ✅ Plan badges show correct plan per site
6. ✅ No unexpected Stripe Checkout redirects

### Preserved Functionality
- ✅ Existing plan catalog (Free, Starter, Custom, Domain, Pro)
- ✅ Invoice generation and tracking
- ✅ Sandbox/test mode compatibility
- ✅ Customer Portal for card management (still redirects, as expected)
- ✅ All other existing features unchanged

### Breaking Changes
- **None** - All changes are bug fixes, no breaking changes to API or behavior

---

## 🚀 Deployment Notes

### Prerequisites
- No database migrations required (plan_id column already exists)
- No environment variable changes required
- No dependency updates required

### Deployment Steps
1. Pull latest from `cursor/custom-and-domain-plans-5fbd` branch
2. Run `npm install` (no new packages, just safety check)
3. Run `npm run build` to verify build succeeds
4. Deploy to production
5. Verify with manual testing steps above

### Rollback Plan
If issues occur, revert to commit `27a5de6` (before bugfixes):
```bash
git checkout cursor/custom-and-domain-plans-5fbd
git revert fd4c39c
git push origin cursor/custom-and-domain-plans-5fbd
```

---

## 📞 Support

If any issues arise after deployment:
1. Check `/invoice/{id}` pages to verify slotPlanId is stored correctly
2. Check Profile → Websites tab to verify plan badges display correctly
3. Test "Add another website" flow with and without saved card
4. Review Stripe Customer Portal to ensure cards are saved correctly
5. Check test output: `npm run test:all`

---

**Prepared by:** Cursor Cloud Agent  
**Date:** September 14, 2026  
**Status:** ✅ Ready for Deployment
