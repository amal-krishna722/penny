// The backend's plain rules, copied here ONLY so the UI can explain its
// decisions in words ("allowed: within 2 days"). The frontend never decides
// anything with these: matching and subscription detection run on the server.
// If Amal changes a number in the files below, change it here too.

/** backend/app/bank/matching.py */
export const MATCH_RULES = {
  maxDaysApart: 2, // find_candidates: card charges post up to 2 days after the purchase
  tipMaxPct: 30, // TIP_MAX = 1.30: a dining charge may be up to 30% above the receipt
  minNameSimilarityPct: 60, // MIN_MERCHANT = 0.6
};

/** backend/app/insights/subscriptions.py */
export const SUBSCRIPTION_RULES = {
  maxPriceChangePct: 5, // PRICE_TOLERANCE = 0.05
  minGapDays: 26, // MIN_GAP_DAYS
  maxGapDays: 35, // MAX_GAP_DAYS
};

/** Whole days from one "YYYY-MM-DD" date to another (positive if `to` is later). */
export function daysBetween(from: string, to: string): number {
  // Parse as UTC midnight so daylight-saving changes can't make a day 23 hours.
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}
