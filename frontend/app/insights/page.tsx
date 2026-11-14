// Insights page (task C5). Uses GET /subscriptions.
// Shows the monthly total of recurring charges at the top and one card per
// subscription, soonest renewal first. Add more sections here only if the
// backend adds endpoints for them.
"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { getSubscriptions, isMocked } from "@/lib/api";
import { daysUntil, money, shortDate } from "@/lib/format";
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
        <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Sample data: the backend isn&apos;t connected for this page yet.
        </p>
      )}

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          Couldn&apos;t load subscriptions ({error}). Check that the backend is running.
        </p>
      )}

      {data === null ? (
        error ? null : <Skeleton />
      ) : (
        <div className="space-y-6">
          {/* Totals strip */}
          <section className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label="Subscriptions per month"
              value={money(data.total_monthly)}
              note={`${subs.length} active ${subs.length === 1 ? "subscription" : "subscriptions"}`}
              highlight
            />
            <StatCard label="Per year" value={money(data.total_monthly * 12)} note="if nothing changes" />
            <StatCard
              label="Next charge"
              value={next ? money(next.amount) : "—"}
              note={next ? `${next.merchant}, ${renewsIn(next.next_expected)}` : "Nothing upcoming"}
            />
          </section>

          {/* One card per subscription */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-neutral-900">Subscriptions</h2>
            {subs.length === 0 ? (
              <p className="rounded-lg border border-dashed border-neutral-300 bg-white py-12 text-center text-sm text-neutral-500">
                No recurring charges found yet. We need to see the same charge at least twice, about a month apart.
              </p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
    <li className="flex flex-col rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex items-start gap-3">
        {/* Letter avatar: no logos needed */}
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-sm font-semibold text-indigo-700">
          {sub.merchant.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-neutral-900">{sub.merchant}</p>
          <p className="text-xs text-neutral-500">
            Seen {sub.times_seen} {sub.times_seen === 1 ? "time" : "times"}
          </p>
        </div>
        <p className="text-right">
          <span className="font-mono text-lg font-semibold tabular-nums text-neutral-900">{money(sub.amount)}</span>
          <span className="block text-xs text-neutral-500">/ month</span>
        </p>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-neutral-100" title={`${share.toFixed(0)}% of monthly total`}>
        <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, share)}%` }} />
      </div>

      <dl className="mt-3 flex justify-between text-xs">
        <div>
          <dt className="text-neutral-500">Last charged</dt>
          <dd className="font-medium text-neutral-900">{shortDate(sub.last_charged)}</dd>
        </div>
        <div className="text-right">
          <dt className="text-neutral-500">Next expected</dt>
          <dd className={days >= 0 && days <= 3 ? "font-medium text-amber-700" : "font-medium text-neutral-900"}>
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
  highlight = false,
}: {
  label: string;
  value: string;
  note?: string;
  highlight?: boolean; // dark card for the main number
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-lg bg-neutral-900 p-4 text-white"
          : "rounded-lg border border-neutral-200 bg-white p-4"
      }
    >
      <p className={`text-xs font-medium uppercase tracking-wide ${highlight ? "text-neutral-400" : "text-neutral-500"}`}>
        {label}
      </p>
      <p className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${highlight ? "text-white" : "text-neutral-900"}`}>
        {value}
      </p>
      {note && <p className={`mt-0.5 truncate text-xs ${highlight ? "text-neutral-400" : "text-neutral-500"}`}>{note}</p>}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-neutral-100" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-lg bg-neutral-100" />
        ))}
      </div>
    </div>
  );
}
