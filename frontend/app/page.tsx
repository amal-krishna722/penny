// Overview page (task C4). Uses GET /summary, GET /bank/account and
// GET /transactions (for the "Recent purchases" list).
// Client Component because it fetches from the browser and re-polls, so a
// receipt scanned during the demo updates the totals without a refresh.
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/Logo";
import PageHeader from "@/components/PageHeader";
import { CategoryDonut, CoverageRing, DailyBars, Sparkline } from "@/components/OverviewCharts";
import { Amount, EmptyState, Notice } from "@/components/ui";
import { getAccount, getSummary, getTransactions, isMocked } from "@/lib/api";
import { CATEGORY_STYLES, categoryLabel, shortDate } from "@/lib/format";
import type { Account, FeedEntry, Summary } from "@/lib/types";

const POLL_MS = 5000;
const RECENT_COUNT = 6;

export default function OverviewPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [recent, setRecent] = useState<FeedEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    async function load() {
      // allSettled instead of all: if one endpoint isn't ready yet, the
      // others still show (the missing parts show "—" or stay empty).
      const results = await Promise.allSettled([getSummary(), getAccount(), getTransactions()]);
      if (stopped) return;
      const [s, a, t] = results;
      if (s.status === "fulfilled") setSummary(s.value);
      if (a.status === "fulfilled") setAccount(a.value);
      if (t.status === "fulfilled") setRecent(t.value.slice(0, RECENT_COUNT)); // feed is newest first
      const failed = results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
      setError(failed ? String(failed.reason?.message ?? failed.reason) : null);
      timer = setTimeout(load, POLL_MS);
    }

    load();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, []);

  const subtitle = summary ? `${shortDate(summary.start)} – ${shortDate(summary.end)}` : "Your last 30 days at a glance";
  // Names of the endpoints on this page that still return fake data, for the banner.
  const mocked = (["summary", "account", "transactions"] as const).filter((e) => isMocked(e));

  return (
    <>
      {/* Shown here only while loading; once loaded they sit under the page title */}
      {summary === null && <Notices mocked={mocked} error={error} />}

      {summary === null ? (
        error ? null : <Skeleton />
      ) : (
        // Two columns on wide screens: the main dashboard, and a side panel on the right
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-8">
            <div>
              <PageHeader title="Overview" subtitle={subtitle} />
              <Notices mocked={mocked} error={error} />
              <StatCards summary={summary} account={account} />
            </div>

            <section className="card p-5 sm:p-6">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="text-lg">Daily spending</h2>
                  <p className="mt-1 text-sm text-text-muted">
                    <Amount
                      value={summary.daily.length ? summary.total_spent / summary.daily.length : 0}
                      className="font-semibold text-text"
                    />{" "}
                    average per day
                  </p>
                </div>
                <Link href="/transactions" className="link text-sm">
                  See all transactions
                </Link>
              </div>
              <DailyBars daily={summary.daily} />
            </section>

            <TopMerchants summary={summary} />
          </div>

          <SidePanel summary={summary} recent={recent} />
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Stat cards
// ---------------------------------------------------------------------------

function StatCards({ summary, account }: { summary: Summary; account: Account | null }) {
  // Running total per day, so the sparkline climbs smoothly instead of spiking.
  const cumulative: number[] = [];
  summary.daily.reduce((sum, d) => {
    cumulative.push(sum + d.amount);
    return sum + d.amount;
  }, 0);

  const total = summary.card_spent + summary.cash_spent;
  const cardPct = total > 0 ? (summary.card_spent / total) * 100 : 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="card flex flex-col p-5">
        <StatLabel>Total spent</StatLabel>
        <Amount value={summary.total_spent} big className="mt-2 text-3xl font-semibold" />
        <div className="mt-auto pt-2">
          <Sparkline values={cumulative} />
        </div>
      </div>

      <div className="card flex flex-col p-5">
        <StatLabel>Balance</StatLabel>
        {account ? (
          <Amount value={account.balance} big className="mt-2 text-3xl font-semibold" />
        ) : (
          <span className="mt-2 text-3xl font-semibold text-text-muted">—</span>
        )}
        <p className="mt-1 text-xs text-text-muted">{account?.nickname ?? "Checking"}</p>
        {/* Card vs cash split: cocoa for card, copper for cash */}
        <div className="mt-auto pt-4">
          <div className="flex h-2 overflow-hidden rounded-full bg-accent" title={`${cardPct.toFixed(0)}% card`}>
            <div className="bg-primary" style={{ width: `${cardPct}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-xs text-text-muted">
            <span>
              Card <Amount value={summary.card_spent} className="font-semibold text-text" />
            </span>
            <span>
              Cash <Amount value={summary.cash_spent} className="font-semibold text-text" />
            </span>
          </div>
        </div>
      </div>

      <div className="card flex items-center gap-4 p-5">
        <CoverageRing pct={summary.receipt_coverage_pct} />
        <div className="min-w-0">
          <StatLabel>Receipt coverage</StatLabel>
          <p className="mt-1 text-sm text-text-muted">of purchases itemized</p>
          <Link href="/upload" className="btn-primary mt-3 px-3 py-1.5 text-xs">
            Scan a receipt
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{children}</p>;
}

// ---------------------------------------------------------------------------
// Top merchants
// ---------------------------------------------------------------------------

function TopMerchants({ summary }: { summary: Summary }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="mb-3 text-lg">Top merchants</h2>
      {summary.top_merchants.length === 0 ? (
        <EmptyState title="No purchases yet.">Your biggest merchants will show up here.</EmptyState>
      ) : (
        <ol className="divide-y divide-border">
          {summary.top_merchants.map((m, i) => {
            const share = summary.total_spent > 0 ? (m.amount / summary.total_spent) * 100 : 0;
            return (
              <li
                key={m.merchant}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-4 py-3 text-sm sm:grid-cols-[auto_1fr_90px_120px_100px]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-alt text-xs font-semibold tabular-nums text-text">
                  {i + 1}
                </span>
                <span className="truncate font-semibold text-text">{m.merchant}</span>
                <span className="hidden text-text-muted sm:block">
                  {m.count} {m.count === 1 ? "visit" : "visits"}
                </span>
                <span className="hidden text-text-muted sm:block">{share.toFixed(1)}% of spend</span>
                <Amount value={m.amount} className="text-right font-semibold text-text" />
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Right-hand panel: category donut over recent purchases
// ---------------------------------------------------------------------------

function SidePanel({ summary, recent }: { summary: Summary; recent: FeedEntry[] | null }) {
  return (
    <aside className="card self-start overflow-hidden">
      <div className="p-6">
        <h2 className="text-lg">By category</h2>
        <p className="mt-1 text-sm text-text-muted">Where your money went</p>

        {summary.by_category.length === 0 ? (
          <EmptyState title="No spending yet." />
        ) : (
          <>
            <div className="mt-6">
              <CategoryDonut byCategory={summary.by_category} total={summary.total_spent} />
            </div>
            {/* Legend: colored dot, name, amount and share */}
            <ul className="mt-6 space-y-2.5 text-sm">
              {summary.by_category.map((c) => (
                <li key={c.category} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CATEGORY_STYLES[c.category].color }} />
                  <span className="flex-1 text-text">{categoryLabel(c.category)}</span>
                  <Amount value={c.amount} className="font-semibold text-text" />
                  <span className="w-9 text-right text-xs tabular-nums text-text-muted">{c.pct.toFixed(0)}%</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="border-t border-border p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg">Recent purchases</h2>
          <Link href="/transactions" className="link text-sm">
            See all
          </Link>
        </div>

        {recent === null ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="skeleton h-12 rounded-[10px]" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <EmptyState title="No receipts yet.">Snap one with the Shortcut.</EmptyState>
        ) : (
          <ul className="-mx-2">
            {recent.map((e) => (
              <li key={e.id} className="flex items-center gap-3 rounded-[10px] px-2 py-2 hover:bg-surface-alt">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CATEGORY_STYLES[e.category].color }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text">{e.merchant}</p>
                  <p className="truncate text-xs text-text-muted">
                    {shortDate(e.date)} · {e.type === "cash" ? "Cash" : categoryLabel(e.category)}
                    {e.receipt_id && " · Itemized"}
                  </p>
                </div>
                <Amount value={e.amount} className="text-sm font-semibold text-text" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------

function Notices({ mocked, error }: { mocked: readonly string[]; error: string | null }) {
  return (
    <>
      {mocked.length > 0 && (
        <Notice tone="info">
          Some numbers are sample data until the backend adds {mocked.map((e) => `/${e}`).join(", ")}.
        </Notice>
      )}
      {error && <Notice tone="error">Couldn&apos;t load some data ({error}). Check that the backend is running.</Notice>}
    </>
  );
}

function Skeleton() {
  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_340px]" aria-busy="true">
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <LogoMark size={28} className="animate-pulse opacity-40" />
          <div className="skeleton h-8 w-40" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="skeleton h-36" />
          ))}
        </div>
        <div className="skeleton h-80" />
        <div className="skeleton h-56" />
      </div>
      <div className="skeleton h-[640px]" />
    </div>
  );
}
