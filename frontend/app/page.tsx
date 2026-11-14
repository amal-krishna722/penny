// Overview page (task C4). Uses GET /summary, GET /bank/account and
// GET /transactions (for the "Recent purchases" list).
// Client Component because it fetches from the browser and re-polls, so a
// receipt scanned during the demo updates the totals without a refresh.
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { CategoryDonut, DailyBars, Sparkline } from "@/components/OverviewCharts";
import { getAccount, getSummary, getTransactions, isMocked } from "@/lib/api";
import { CATEGORY_STYLES, categoryLabel, money, shortDate } from "@/lib/format";
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
          <div className="min-w-0 space-y-10">
            <div>
              <PageHeader title="Overview" subtitle={subtitle} />
              <Notices mocked={mocked} error={error} />
              <StatCards summary={summary} account={account} />
            </div>

            <section>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">Daily spending</h2>
                  <p className="mt-1 text-3xl font-bold tabular-nums">
                    {money(summary.daily.length ? summary.total_spent / summary.daily.length : 0)}
                    <span className="ml-2 text-sm font-medium text-muted">average per day</span>
                  </p>
                </div>
                <Link href="/transactions" className="text-sm text-muted hover:text-foreground">
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
// Pastel stat cards
// ---------------------------------------------------------------------------

function StatCards({ summary, account }: { summary: Summary; account: Account | null }) {
  // Running total per day, so the sparkline climbs smoothly instead of spiking.
  const cumulative: number[] = [];
  summary.daily.reduce((sum, d) => {
    cumulative.push(sum + d.amount);
    return sum + d.amount;
  }, 0);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <PastelCard
        className="bg-sage"
        chipClass="bg-sage-deep"
        icon="$"
        label="Total spent"
        chip="30 days"
        value={money(summary.total_spent)}
      >
        <Sparkline values={cumulative} color="#7f9270" />
      </PastelCard>

      <PastelCard
        className="bg-butter"
        chipClass="bg-butter-deep"
        icon="▤"
        label="Balance"
        chip="Checking"
        value={account ? money(account.balance) : "—"}
      >
        <SplitBar card={summary.card_spent} cash={summary.cash_spent} />
      </PastelCard>

      {/* Lavender card: receipt coverage, with a shortcut to upload one */}
      <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-3xl bg-lavender p-5 text-center text-white">
        {/* Decorative soft circle in the corner, like the reference design */}
        <span className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-white/10" />
        <p className="text-3xl font-bold tabular-nums">{summary.receipt_coverage_pct.toFixed(0)}%</p>
        <p className="mt-1 text-sm text-white/85">of purchases itemized</p>
        <Link
          href="/upload"
          className="relative mt-4 rounded-xl bg-lavender-deep px-5 py-2 text-sm font-semibold transition-colors hover:bg-[#6f6cd9]"
        >
          Scan a receipt
        </Link>
      </div>
    </div>
  );
}

function PastelCard({
  className,
  chipClass,
  icon,
  label,
  chip,
  value,
  children,
}: {
  className: string; // background color class
  chipClass: string; // darker shade for the icon and chip
  icon: string;
  label: string;
  chip: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col rounded-3xl p-5 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold">
          <span className={`flex h-6 w-6 items-center justify-center rounded-md text-xs text-white ${chipClass}`}>{icon}</span>
          {label}
        </span>
        <span className={`whitespace-nowrap rounded-lg px-2 py-1 text-xs font-medium text-white ${chipClass}`}>{chip}</span>
      </div>
      <p className="mt-3 text-[1.75rem] font-bold tracking-tight tabular-nums">{value}</p>
      {children && <div className="mt-auto pt-2">{children}</div>}
    </div>
  );
}

// Card vs cash as one bar, with labels underneath.
function SplitBar({ card, cash }: { card: number; cash: number }) {
  const total = card + cash;
  const cardPct = total > 0 ? (card / total) * 100 : 0;
  return (
    <div className="pt-3">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-white/60">
        <div className="rounded-full bg-ink" style={{ width: `${cardPct}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-xs font-medium text-foreground/70">
        <span>Card {money(card)}</span>
        <span>Cash {money(cash)}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top merchants, styled like the "Last Orders" rows
// ---------------------------------------------------------------------------

function TopMerchants({ summary }: { summary: Summary }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Top merchants</h2>
      {summary.top_merchants.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">No purchases yet.</p>
      ) : (
        <ol>
          {summary.top_merchants.map((m, i) => {
            const share = summary.total_spent > 0 ? (m.amount / summary.total_spent) * 100 : 0;
            return (
              // Rows have no background until hovered, when they lift into a white pill
              <li
                key={m.merchant}
                className="-mx-4 grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-2xl px-4 py-3 text-sm transition hover:bg-surface hover:shadow-[0_8px_24px_-12px_rgb(35_35_35/0.15)] sm:grid-cols-[auto_1fr_90px_140px_100px]"
              >
                <Avatar name={m.merchant} color={i === 0 ? "#2b2b2b" : "#c9c3b5"} />
                <span className="truncate font-semibold">{m.merchant}</span>
                <span className="hidden text-muted sm:block">
                  {m.count} {m.count === 1 ? "visit" : "visits"}
                </span>
                <span className="hidden items-center gap-2 text-muted sm:flex">
                  <span className="h-2.5 w-2.5 rounded-sm bg-lavender" />
                  {share.toFixed(1)}% of spend
                </span>
                <span className="text-right font-semibold tabular-nums">{money(m.amount)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Right-hand panel: category donut (white) over recent purchases (beige)
// ---------------------------------------------------------------------------

function SidePanel({ summary, recent }: { summary: Summary; recent: FeedEntry[] | null }) {
  return (
    <aside className="card overflow-hidden self-start p-0">
      <div className="p-6">
        <h2 className="text-lg font-semibold">By category</h2>
        <p className="mt-1 text-sm text-muted">Where your money went</p>

        {summary.by_category.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">No spending yet.</p>
        ) : (
          <>
            <div className="mt-6">
              <CategoryDonut byCategory={summary.by_category} total={summary.total_spent} />
            </div>
            {/* Legend: each category with a thin bar showing its share */}
            <ul className="mt-6 space-y-3">
              {summary.by_category.map((c) => (
                <li key={c.category}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-muted">{categoryLabel(c.category)}</span>
                    <span className="font-semibold tabular-nums">
                      {money(c.amount)} <span className="ml-1 text-xs font-medium text-muted">{c.pct.toFixed(0)}%</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-track">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${c.pct}%`, background: CATEGORY_STYLES[c.category].hex }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="bg-sand p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent purchases</h2>
          <Link href="/transactions" className="text-sm text-muted hover:text-foreground">
            See all
          </Link>
        </div>

        {recent === null ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="skeleton h-16 rounded-2xl" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No purchases yet. Scan a receipt to start.</p>
        ) : (
          <ul className="space-y-3">
            {recent.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-3 rounded-2xl bg-white/60 px-4 py-3 transition hover:bg-surface hover:shadow-[0_8px_24px_-12px_rgb(35_35_35/0.15)]"
              >
                <Avatar name={e.merchant} color={CATEGORY_STYLES[e.category].hex} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{e.merchant}</p>
                  <p className="truncate text-xs text-muted">
                    {shortDate(e.date)} · {e.type === "cash" ? "Cash" : categoryLabel(e.category)}
                    {e.receipt_id && " · Itemized"}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums">{money(e.amount)}</span>
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

// Round badge with the merchant's first letter (stands in for a logo).
function Avatar({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
      style={{ background: color }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

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

// Colored banner for "sample data" and error messages.
function Notice({ tone, children }: { tone: "info" | "error"; children: React.ReactNode }) {
  const styles = tone === "error" ? "bg-red-50 text-red-800" : "bg-butter/40 text-foreground/80";
  return <p className={`mb-6 rounded-2xl px-4 py-2.5 text-sm ${styles}`}>{children}</p>;
}

function Skeleton() {
  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_340px]" aria-busy="true">
      <div className="space-y-10">
        <div className="skeleton h-12 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="skeleton h-36" />
          ))}
        </div>
        <div className="skeleton h-72" />
        <div className="skeleton h-56" />
      </div>
      <div className="skeleton h-[640px]" />
    </div>
  );
}
