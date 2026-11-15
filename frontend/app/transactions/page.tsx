// Transactions page (task C2). Client Component because it keeps state
// (filters, expanded rows) and polls the API from the browser.
"use client";

import { useEffect, useRef, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { EmptyState, Notice } from "@/components/ui";
import TransactionRow from "@/components/TransactionRow";
import { getReceipts, getTransactions } from "@/lib/api";
import { categoryLabel, longDate, money } from "@/lib/format";
import { CATEGORIES, type Category, type FeedEntry, type Receipt } from "@/lib/types";

const POLL_MS = 3000; // how often to re-fetch, so a Back Tap receipt shows up live
const FRESH_MS = 4000; // how long a newly arrived row stays highlighted

type TypeFilter = "" | "card" | "cash";

export default function TransactionsPage() {
  const [category, setCategory] = useState<Category | "">("");
  const [type, setType] = useState<TypeFilter>("");

  const [rows, setRows] = useState<FeedEntry[] | null>(null); // null = first load still running
  const [error, setError] = useState<string | null>(null);
  // Receipts by id, for the "How Penny matched this" panel in expanded rows.
  const [receipts, setReceipts] = useState<Map<string, Receipt>>(new Map());

  // Expanded rows are tracked by id, not by position, so they stay open
  // when a poll brings in new rows above them.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Rows that just appeared (e.g. right after a double tap), for the highlight.
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const seenIds = useRef<Set<string>>(new Set());

  // Polling. Runs again from scratch whenever a filter changes.
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let firstLoad = true;

    async function load() {
      try {
        // Both requests run at the same time; we wait for both.
        const [data, receiptList] = await Promise.all([
          getTransactions({ category: category || undefined, type: type || undefined }),
          getReceipts(),
        ]);
        if (stopped) return; // the page or filters changed while we waited

        // After the first load, anything we haven't seen before is new.
        if (firstLoad) {
          seenIds.current = new Set(data.map((r) => r.id));
          firstLoad = false;
        } else {
          const newIds = data.map((r) => r.id).filter((id) => !seenIds.current.has(id));
          if (newIds.length > 0) {
            newIds.forEach((id) => seenIds.current.add(id));
            setFreshIds(new Set(newIds));
            setTimeout(() => setFreshIds(new Set()), FRESH_MS);
          }
        }

        setRows(data);
        setReceipts(new Map(receiptList.map((r) => [r.id, r])));
        setError(null);
      } catch (e) {
        if (!stopped) setError(e instanceof Error ? e.message : String(e));
      }
      // Schedule the next poll only after this one finishes. setInterval
      // could pile up overlapping requests if the backend is slow.
      if (!stopped) timer = setTimeout(load, POLL_MS);
    }

    load();

    // Cleanup: React runs this when the user leaves the page or a filter
    // changes, so the old polling loop stops instead of running forever.
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [category, type]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const total = rows?.reduce((sum, r) => sum + r.amount, 0) ?? 0;

  return (
    <>
      <PageHeader
        title="Transactions"
        subtitle={rows ? `${rows.length} purchases · ${money(total)}` : "Loading…"}
      >
        <LiveDot error={!!error} />
      </PageHeader>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category | "")}
          className="field py-1.5"
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {categoryLabel(c)}
            </option>
          ))}
        </select>

        <div className="reeded-md inline-flex bg-surface-alt p-0.5 text-sm" role="group" aria-label="Filter by payment type">
          {(["", "card", "cash"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              aria-pressed={type === t}
              className={`rounded-lg px-3 py-1 font-medium ${
                type === t ? "bg-primary text-on-primary" : "text-text-muted hover:text-text"
              }`}
            >
              {t === "" ? "All" : t === "card" ? "Card" : "Cash"}
            </button>
          ))}
        </div>
      </div>

      {/* An error after data loaded: keep showing the old rows with a warning */}
      {error && rows && (
        <Notice tone="error">Couldn&apos;t refresh ({error}). Showing the last data we got.</Notice>
      )}

      {rows === null ? (
        error ? <LoadError message={error} /> : <Skeleton />
      ) : rows.length === 0 ? (
        <div className="card">
          {category || type ? (
            <EmptyState title="Nothing matches these filters.">Try another category, or show both card and cash.</EmptyState>
          ) : (
            <EmptyState title="No purchases yet.">Snap a receipt with the Shortcut, or drop one on the Upload page.</EmptyState>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {groupByDate(rows).map(([date, dayRows]) => (
            <section key={date}>
              <h2 className="mb-2 text-sm text-text-muted">{longDate(date)}</h2>
              <ul className="card divide-y divide-border overflow-hidden">
                {dayRows.map((entry) => (
                  <TransactionRow
                    key={entry.id}
                    entry={entry}
                    receipt={entry.receipt_id ? receipts.get(entry.receipt_id) : undefined}
                    expanded={expanded.has(entry.id)}
                    fresh={freshIds.has(entry.id)}
                    onToggle={() => toggle(entry.id)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

// [["2026-11-14", [rows...]], ["2026-11-13", [rows...]], ...] keeping the
// newest-first order from the API.
function groupByDate(rows: FeedEntry[]): [string, FeedEntry[]][] {
  const groups = new Map<string, FeedEntry[]>();
  for (const row of rows) {
    if (!groups.has(row.date)) groups.set(row.date, []);
    groups.get(row.date)!.push(row);
  }
  return [...groups];
}

function LiveDot({ error }: { error: boolean }) {
  return (
    <span className="flex items-center gap-2 text-xs text-text-muted">
      <span className={`h-2 w-2 rounded-full ${error ? "bg-warning" : "animate-pulse bg-success"}`} />
      {error ? "Reconnecting" : "Live"}
    </span>
  );
}

function Skeleton() {
  return (
    <ul className="card divide-y divide-border" aria-busy="true">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="flex items-center gap-4 px-4 py-4">
          <div className="skeleton h-4 flex-1 rounded" />
          <div className="skeleton h-4 w-16 rounded" />
        </li>
      ))}
    </ul>
  );
}

function LoadError({ message }: { message: string }) {
  return (
    <div role="alert" className="reeded bg-danger/10 px-4 py-4 text-sm text-danger">
      <p className="font-semibold">Couldn&apos;t load transactions.</p>
      <p className="mt-1">{message}</p>
      <p className="mt-2">
        Check that the backend is running and that NEXT_PUBLIC_API_URL in .env.local points at it.
      </p>
    </div>
  );
}
