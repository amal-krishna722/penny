// Insights page (task C5). Uses GET /subscriptions.
// Shows the monthly total of recurring charges at the top and one card per
// subscription, soonest renewal first. Add more sections here only if the
// backend adds endpoints for them.
"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Amount, EmptyState, Notice } from "@/components/ui";
import { getSubscriptions, isMocked } from "@/lib/api";
import { daysUntil, shortDate } from "@/lib/format";
import type { Subscription, SubscriptionsResponse } from "@/lib/types";

export default function InsightsPage() {
  const [data, setData] = useState<SubscriptionsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Subscriptions only change when the bank syncs, so one load is enough
  // (no polling like the Overview page).
  useEffect(() => {
    let stopped = false;
    getSubscriptions()
      .then((d) => !stopped && setData(d))
      .catch((e) => !stopped && setError(String(e?.message ?? e)));
    return () => {
      stopped = true;
    };
  }, []);

  // Sort a copy so the soonest renewal is first. ISO dates sort correctly as strings.
  const subs = data ? [...data.subscriptions].sort((a, b) => a.next_expected.localeCompare(b.next_expected)) : [];
  const next = subs[0];

  return (
    <>
      <PageHeader title="Insights" subtitle="Recurring charges we found in your bank history" />

      {isMocked("subscriptions") && (
        <Notice tone="info">Sample data: the backend doesn&apos;t have /subscriptions yet.</Notice>
      )}

      {error && (
        <Notice tone="error">Couldn&apos;t load subscriptions ({error}). Check that the backend is running.</Notice>
      )}

      {data === null ? (
        error ? null : <Skeleton />
      ) : (
        <div className="space-y-6">
          {/* Totals strip */}
          <section className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Subscriptions per month"
              value={data.total_monthly}
              note={`${subs.length} active ${subs.length === 1 ? "subscription" : "subscriptions"}`}
            />
            <StatCard label="Per year" value={data.total_monthly * 12} note="if nothing changes" />
            <StatCard
              label="Next charge"
              value={next ? next.amount : null}
              note={next ? `${next.merchant}, ${renewsIn(next.next_expected)}` : "Nothing upcoming"}
            />
          </section>

          {/* One card per subscription */}
          <section>
            <h2 className="mb-3 text-lg">Subscriptions</h2>
            {subs.length === 0 ? (
              <div className="card">
                <EmptyState title="No recurring charges found yet.">
                  We need to see the same charge at least twice, about a month apart.
                </EmptyState>
              </div>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {subs.map((s) => (
                  <SubscriptionCard key={s.merchant} sub={s} totalMonthly={data.total_monthly} />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </>
  );
}

function SubscriptionCard({ sub, totalMonthly }: { sub: Subscription; totalMonthly: number }) {
  // This subscription's share of the monthly total, for the small bar.
  const share = totalMonthly > 0 ? (sub.amount / totalMonthly) * 100 : 0;
  const days = daysUntil(sub.next_expected);

  return (
    <li className="card flex flex-col p-5">
      <div className="flex items-start gap-3">
        {/* Letter avatar: no logos needed */}
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent-ink">
          {sub.merchant.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-text">{sub.merchant}</p>
          <p className="text-xs text-text-muted">
            Seen {sub.times_seen} {sub.times_seen === 1 ? "time" : "times"}
          </p>
        </div>
        <p className="text-right">
          <Amount value={sub.amount} className="text-lg font-semibold text-text" />
          <span className="block text-xs text-text-muted">/ month</span>
        </p>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-alt" title={`${share.toFixed(0)}% of monthly total`}>
        <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, share)}%` }} />
      </div>

      <dl className="mt-3 flex justify-between text-xs">
        <div>
          <dt className="text-text-muted">Last charged</dt>
          <dd className="font-semibold text-text">{shortDate(sub.last_charged)}</dd>
        </div>
        <div className="text-right">
          <dt className="text-text-muted">Next expected</dt>
          <dd className={days >= 0 && days <= 3 ? "font-semibold text-warning-ink" : "font-semibold text-text"}>
            {shortDate(sub.next_expected)} · {renewsIn(sub.next_expected)}
          </dd>
        </div>
      </dl>
    </li>
  );
}

/** "today", "tomorrow", "in 17 days", or "3 days ago" if the charge is late. */
function renewsIn(iso: string): string {
  const d = daysUntil(iso);
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  if (d > 1) return `in ${d} days`;
  return `${-d} ${d === -1 ? "day" : "days"} ago`;
}

function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: number | null; // null shows a dash
  note?: string;
}) {
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold">
        {value === null ? <span className="text-text-muted">—</span> : <Amount value={value} big />}
      </p>
      {note && <p className="mt-1 truncate text-xs text-text-muted">{note}</p>}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="skeleton h-28" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton h-40" />
        ))}
      </div>
    </div>
  );
}
