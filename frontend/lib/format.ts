// Small display helpers shared by every page.

import type { Category } from "./types";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** 27.4 → "$27.40" */
export function money(amount: number): string {
  return usd.format(amount);
}

// Build the Date from its parts instead of `new Date("2026-11-14")`.
// That string form is read as midnight UTC, which is still Nov 13 on the
// US east coast, so every date would show one day early.
function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** "2026-11-14" → "Nov 14" */
export function shortDate(iso: string): string {
  return parseDate(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** "2026-11-14" → "Saturday, November 14" */
export function longDate(iso: string): string {
  return parseDate(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

/** Whole days from today to `iso`. Negative if it's in the past. */
export function daysUntil(iso: string): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Math.round absorbs the 1-hour difference on daylight-saving change days.
  return Math.round((parseDate(iso).getTime() - today.getTime()) / 86_400_000);
}

/** "groceries" → "Groceries" */
export function categoryLabel(category: Category): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

// One color per category, from the --cat-* tokens in app/globals.css.
// `badge` is Tailwind classes (15% tint background, darker "ink" text so it
// passes contrast). `color` is for Recharts and dots, which need a CSS color
// value rather than a class name.
// Class names are written out in full because Tailwind only generates
// classes it can find as complete strings in the source code.
export const CATEGORY_STYLES: Record<Category, { badge: string; color: string }> = {
  groceries: { badge: "bg-cat-groceries/15 text-cat-groceries-ink", color: "var(--cat-groceries)" },
  dining: { badge: "bg-cat-dining/15 text-cat-dining-ink", color: "var(--cat-dining)" },
  transport: { badge: "bg-cat-transport/15 text-cat-transport-ink", color: "var(--cat-transport)" },
  shopping: { badge: "bg-cat-shopping/15 text-cat-shopping-ink", color: "var(--cat-shopping)" },
  entertainment: { badge: "bg-cat-entertainment/15 text-cat-entertainment-ink", color: "var(--cat-entertainment)" },
  subscriptions: { badge: "bg-cat-subscriptions/15 text-cat-subscriptions-ink", color: "var(--cat-subscriptions)" },
  utilities: { badge: "bg-cat-utilities/15 text-cat-utilities-ink", color: "var(--cat-utilities)" },
  health: { badge: "bg-cat-health/15 text-cat-health-ink", color: "var(--cat-health)" },
  education: { badge: "bg-cat-education/15 text-cat-education-ink", color: "var(--cat-education)" },
  other: { badge: "bg-cat-other/15 text-cat-other-ink", color: "var(--cat-other)" },
};
