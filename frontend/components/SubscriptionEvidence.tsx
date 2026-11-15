// "Why is this a subscription?": the actual bank charges behind a
// subscription card, with the gap between them and any price change.
// The server decided these are recurring (backend/app/insights/subscriptions.py)
// and flagged them with is_subscription; this only shows that evidence.
"use client";

import { ArrowDown, Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { money, shortDate } from "@/lib/format";
import { SUBSCRIPTION_RULES, daysBetween } from "@/lib/rules";
import type { FeedEntry, Subscription } from "@/lib/types";

/**
 * The flagged charges for one subscription, oldest first.
 * GET /subscriptions has no transaction ids, so we find its latest charge
 * (same date and amount as last_charged) and take every flagged charge with
 * that same bank name.
 */
export function chargesFor(sub: Subscription, feed: FeedEntry[]): FeedEntry[] {
  const latest = feed.find(
    (e) => e.is_subscription && e.date === sub.last_charged && Math.abs(e.amount - sub.amount) < 0.005,
  );
  if (!latest) return [];
  return feed
    .filter((e) => e.is_subscription && e.merchant === latest.merchant)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export default function SubscriptionEvidence({ charges }: { charges: FeedEntry[] }) {
  const [open, setOpen] = useState(false);
  if (charges.length < 2) return null; // nothing to explain (or the charges weren't found)

  return (
    <div className="mt-4 border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-xs font-semibold text-accent-ink hover:text-text"
      >
        Why is this a subscription?
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div className="mt-3 text-xs text-text">
          <ol>
            {charges.map((c, i) => {
              const prev = charges[i - 1];
              return (
                <li key={c.id}>
                  {/* Between two charges: how far apart and whether the price moved */}
                  {prev && <Gap prev={prev} next={c} />}
                  <div className="flex items-center gap-2 rounded-lg bg-surface-alt px-2.5 py-1.5">
                    <span className="w-12 shrink-0 font-semibold">{shortDate(c.date)}</span>
                    <span className="min-w-0 flex-1 truncate font-mono text-[11px]">{c.merchant}</span>
                    <span className="tabular-nums font-semibold">{money(c.amount)}</span>
                  </div>
                </li>
              );
            })}
          </ol>

          <ul className="mt-3 space-y-1">
            <Rule>Same store every time</Rule>
            <Rule>Price changes by {SUBSCRIPTION_RULES.maxPriceChangePct}% or less</Rule>
            <Rule>
              {SUBSCRIPTION_RULES.minGapDays} to {SUBSCRIPTION_RULES.maxGapDays} days apart (about a month)
            </Rule>
            <Rule>Seen at least twice ({charges.length} times here)</Rule>
          </ul>
          <p className="mt-2 text-text-muted">Found by plain rules over your bank history, no AI.</p>
        </div>
      )}
    </div>
  );
}

function Gap({ prev, next }: { prev: FeedEntry; next: FeedEntry }) {
  const days = daysBetween(prev.date, next.date);
  const changePct = ((next.amount - prev.amount) / prev.amount) * 100;
  const priceText =
    Math.abs(changePct) < 0.05 ? "same price" : `price ${changePct > 0 ? "+" : ""}${changePct.toFixed(1)}%`;
  return (
    <p className="flex items-center gap-1.5 py-1 pl-3 text-text-muted">
      <ArrowDown size={12} aria-hidden="true" />
      {days} days later · {priceText}
    </p>
  );
}

function Rule({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-1.5">
      <Check size={13} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}
