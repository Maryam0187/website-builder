export function discountBuckets(discount) {
  const expiryValue = discount?.expiry_date || discount?.expiryDate || null;
  const expiry = expiryValue ? new Date(expiryValue) : null;
  const expired = Boolean(expiry && !Number.isNaN(expiry.getTime()) && expiry.getTime() < Date.now());
  const inactive = discount?.active === false;
  const usedCount = Number(discount?.used_count ?? discount?.usedCount ?? 0);
  const maxRedemptions = discount?.max_redemptions ?? discount?.maxRedemptions;
  const usedUp = maxRedemptions != null && usedCount >= Number(maxRedemptions);
  return {
    available: !expired && !inactive && !usedUp,
    used: usedCount > 0 || usedUp,
    expired: expired || inactive,
  };
}
