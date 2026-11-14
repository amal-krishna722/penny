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

// One color per category. `chip` is Tailwind classes for badges, `hex` is for
// Recharts and the Overview avatars (soft pastels to match the dashboard look) (charts need real color values, not class names).
// Class names are written out in full because Tailwind only generates
// classes it can find as complete strings in the source code.
export const CATEGORY_STYLES: Record<Category, { chip: string; hex: string }> = {
  groceries: { chip: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", hex: "#a9b89a" },
  dining: { chip: "bg-orange-50 text-orange-700 ring-orange-600/20", hex: "#e9a27f" },
  transport: { chip: "bg-sky-50 text-sky-700 ring-sky-600/20", hex: "#8fc1d9" },
  shopping: { chip: "bg-violet-50 text-violet-700 ring-violet-600/20", hex: "#a9a7f5" },
  entertainment: { chip: "bg-pink-50 text-pink-700 ring-pink-600/20", hex: "#e8a1b8" },
  subscriptions: { chip: "bg-indigo-50 text-indigo-700 ring-indigo-600/20", hex: "#4a4a4a" },
  utilities: { chip: "bg-amber-50 text-amber-700 ring-amber-600/20", hex: "#f2cf6f" },
  health: { chip: "bg-rose-50 text-rose-700 ring-rose-600/20", hex: "#d98880" },
  education: { chip: "bg-teal-50 text-teal-700 ring-teal-600/20", hex: "#86c2b4" },
  other: { chip: "bg-neutral-100 text-neutral-700 ring-neutral-500/20", hex: "#c9c3b5" },
};
