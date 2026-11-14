// Transactions page (task C2). Client Component because it keeps state
// (filters, expanded rows) and polls the API from the browser.
"use client";

import { useEffect, useRef, useState } from "react";
import PageHeader from "@/components/PageHeader";
import TransactionRow from "@/components/TransactionRow";
import { getTransactions } from "@/lib/api";
import { categoryLabel, longDate, money } from "@/lib/format";
import { CATEGORIES, type Category, type FeedEntry } from "@/lib/types";

const POLL_MS = 3000; // how often to re-fetch, so a Back Tap receipt shows up live
const FRESH_MS = 4000; // how long a newly arrived row stays highlighted

type TypeFilter = "" | "card" | "cash";

export default function TransactionsPage() {
  const [category, setCategory] = useState<Category | "">("");
  const [type, setType] = useState<TypeFilter>("");

  const [rows, setRows] = useState<FeedEntry[] | null>(null); // null = first load still running
  const [error, setError] = useState<string | null>(null);

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
        const data = await getTransactions({ category: category || undefined, type: type || undefined });
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
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-800"
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {categoryLabel(c)}
            </option>
          ))}
        </select>

        <div className="inline-flex rounded-md border border-neutral-300 bg-white p-0.5 text-sm" role="group" aria-label="Filter by payment type">
          {(["", "card", "cash"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              aria-pressed={type === t}
              className={`rounded px-3 py-1 font-medium ${
                type === t ? "bg-neutral-900 text-white" : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              {t === "" ? "All" : t === "card" ? "Card" : "Cash"}
            </button>
          ))}
        </div>
      </div>

      {/* An error after data loaded: keep showing the old rows with a warning */}
      {error && rows && (
        <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Couldn&apos;t refresh ({error}). Showing the last data we got.
        </p>
      )}

      {rows === null ? (
        error ? <LoadError message={error} /> : <Skeleton />
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 bg-white px-4 py-10 text-center text-sm text-neutral-500">
          No transactions match these filters.
        </p>
      ) : (
        <div className="space-y-6">
          {groupByDate(rows).map(([date, dayRows]) => (
            <section key={date}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">{longDate(date)}</h2>
              <ul className="divide-y divide-neutral-100 overflow-hidden rounded-lg border border-neutral-200 bg-white">
                {dayRows.map((entry) => (
                  <TransactionRow
                    key={entry.id}
                    entry={entry}
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
    <span className="flex items-center gap-2 text-xs text-neutral-500">
      <span className={`h-2 w-2 rounded-full ${error ? "bg-amber-500" : "animate-pulse bg-emerald-500"}`} />
      {error ? "Reconnecting" : "Live"}
    </span>
  );
}

function Skeleton() {
  return (
    <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white" aria-busy="true">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="flex items-center gap-4 px-4 py-4">
          <div className="h-4 flex-1 animate-pulse rounded bg-neutral-100" />
          <div className="h-4 w-16 animate-pulse rounded bg-neutral-100" />
        </li>
      ))}
    </ul>
  );
}

function LoadError({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800">
      <p className="font-medium">Couldn&apos;t load transactions.</p>
      <p className="mt-1">{message}</p>
      <p className="mt-2 text-red-700">
        Check that the backend is running and that NEXT_PUBLIC_API_URL in .env.local points at it.
      </p>
    </div>
  );
}
