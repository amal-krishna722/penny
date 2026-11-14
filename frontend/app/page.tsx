// Overview page (task C4). Uses GET /summary and GET /bank/account.
// Client Component because it fetches from the browser and re-polls, so a
// receipt scanned during the demo updates the totals without a refresh.
"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { CategoryDonut, DailyChart } from "@/components/OverviewCharts";
import { getAccount, getSummary, isMocked } from "@/lib/api";
import { money, shortDate } from "@/lib/format";
import type { Account, Summary } from "@/lib/types";

const POLL_MS = 5000;

export default function OverviewPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    async function load() {
      // allSettled instead of all: if /bank/account isn't ready yet, the
      // summary still shows (and the balance card just says "—").
      const [s, a] = await Promise.allSettled([getSummary(), getAccount()]);
      if (stopped) return;
      if (s.status === "fulfilled") setSummary(s.value);
      if (a.status === "fulfilled") setAccount(a.value);
      const failed = [s, a].find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
      setError(failed ? String(failed.reason?.message ?? failed.reason) : null);
      timer = setTimeout(load, POLL_MS);
    }

    load();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, []);

  const subtitle = summary
    ? `${shortDate(summary.start)} – ${shortDate(summary.end)}`
    : "Your last 30 days at a glance";

  return (
    <>
      <PageHeader title="Overview" subtitle={subtitle} />

      {(isMocked("summary") || isMocked("account")) && (
        <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Sample data: the backend isn&apos;t connected for this page yet.
        </p>
      )}

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          Couldn&apos;t load some data ({error}). Check that the backend is running.
        </p>
      )}

      {summary === null ? (
        error ? null : <Skeleton />
      ) : (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Total spent" value={money(summary.total_spent)} />
            <StatCard
              label="Balance"
              value={account ? money(account.balance) : "—"}
              note={account?.nickname}
            />
            <StatCard
              label="Card vs cash"
              value={money(summary.card_spent)}
              note={`${money(summary.cash_spent)} cash`}
            >
              <SplitBar card={summary.card_spent} cash={summary.cash_spent} />
            </StatCard>
            <StatCard
              label="Receipt coverage"
              value={`${summary.receipt_coverage_pct.toFixed(0)}%`}
              note="of purchases itemized"
            >
              <Meter pct={summary.receipt_coverage_pct} />
            </StatCard>
          </div>

          <Card title="Daily spending">
            <DailyChart daily={summary.daily} />
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="By category">
              <CategoryDonut byCategory={summary.by_category} total={summary.total_spent} />
            </Card>

            <Card title="Top merchants">
              {summary.top_merchants.length === 0 ? (
                <p className="py-10 text-center text-sm text-neutral-500">No purchases yet.</p>
              ) : (
                <ol className="divide-y divide-neutral-100 text-sm">
                  {summary.top_merchants.map((m, i) => (
                    <li key={m.merchant} className="flex items-center gap-3 py-2.5">
                      <span className="w-5 text-xs tabular-nums text-neutral-400">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate font-medium text-neutral-900">{m.merchant}</span>
                      <span className="text-xs text-neutral-500">
                        {m.count} {m.count === 1 ? "visit" : "visits"}
                      </span>
                      <span className="w-24 text-right font-mono tabular-nums text-neutral-900">{money(m.amount)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4 sm:p-5">
      <h2 className="mb-4 text-sm font-semibold text-neutral-900">{title}</h2>
      {children}
    </section>
  );
}

function StatCard({
  label,
  value,
  note,
  children,
}: {
  label: string;
  value: string;
  note?: string;
  children?: React.ReactNode; // optional small visual under the number
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-neutral-900 sm:text-2xl">{value}</p>
      {note && <p className="mt-0.5 truncate text-xs text-neutral-500">{note}</p>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

// Card share vs cash share as one horizontal bar.
function SplitBar({ card, cash }: { card: number; cash: number }) {
  const total = card + cash;
  const cardPct = total > 0 ? (card / total) * 100 : 0;
  return (
    <div className="flex h-1.5 overflow-hidden rounded-full bg-amber-400" title={`${cardPct.toFixed(0)}% card`}>
      <div className="bg-neutral-900" style={{ width: `${cardPct}%` }} />
    </div>
  );
}

function Meter({ pct }: { pct: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100">
      <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-neutral-100" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-lg bg-neutral-100" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-lg bg-neutral-100" />
        <div className="h-64 animate-pulse rounded-lg bg-neutral-100" />
      </div>
    </div>
  );
}
