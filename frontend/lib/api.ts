// Every call to the backend goes through this file. Pages never call fetch()
// directly, so switching from fake data to the real API happens only here.

import type {
  Account,
  AskResponse,
  DateRange,
  FeedEntry,
  ReceiptResponse,
  Summary,
  SubscriptionsResponse,
  TransactionFilters,
} from "./types";

import mockTransactions from "@/mocks/transactions.json";
import mockSummary from "@/mocks/summary.json";
import mockAccount from "@/mocks/account.json";
import mockSubscriptions from "@/mocks/subscriptions.json";
import mockAsk from "@/mocks/ask.json";
import mockReceipt from "@/mocks/receipt.json";

// ---------------------------------------------------------------------------
// MOCK SWITCHES: one per endpoint. When a teammate says an endpoint works,
// flip its flag to false. Everything else keeps using the fake data.
// ---------------------------------------------------------------------------
const MOCK = {
  transactions: false, // GET /transactions   (Person A, A4) live
  summary: true, // GET /summary        (Person A, A6) not built yet
  account: false, // GET /bank/account   (Person B, B3) live
  subscriptions: true, // GET /subscriptions  (Person B, B5) not built yet
  ask: true, // POST /ask           (Person B, B6) not built yet
  receipt: false, // POST /receipt       (Person A, A2) live
};

/** True while an endpoint still returns fake data, so pages can say so. */
export function isMocked(endpoint: keyof typeof MOCK): boolean {
  return MOCK[endpoint];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API_SECRET = process.env.NEXT_PUBLIC_API_SECRET ?? "";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Wait 300 to 800 ms and return a copy of the data, so mocks behave like a
// real network call (loading states show) and pages can't edit the originals.
function fake<T>(data: T): Promise<T> {
  const ms = 300 + Math.random() * 500;
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(data)), ms));
}

// Turns {start: "2026-11-01", category: undefined} into "?start=2026-11-01".
// Empty values are skipped so the backend never sees "category=undefined".
function queryString(params: object): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") qs.set(key, String(value));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

// Shared fetch wrapper. Throws an Error with a readable message when the
// backend answers with an error status, so pages can show it.
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      // Free ngrok URLs return an HTML warning page to browsers unless this
      // header is present. Harmless when we're on localhost.
      "ngrok-skip-browser-warning": "true",
      ...init.headers,
    },
  });
  if (!res.ok) {
    // FastAPI puts error messages in {"detail": "..."}.
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (body?.detail) detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      // Body wasn't JSON. Keep the status text.
    }
    throw new Error(`${res.status}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Endpoints (docs/SPEC.md section 4)
// ---------------------------------------------------------------------------

/** GET /health: useful for checking CORS and the API URL. Never mocked. */
export function getHealth(): Promise<{ ok: boolean }> {
  return request("/health");
}

/** GET /transactions: the feed, newest first. */
export function getTransactions(filters: TransactionFilters = {}): Promise<FeedEntry[]> {
  if (MOCK.transactions) {
    // Apply the same filters the backend will, so the filter UI works on mocks.
    const rows = (mockTransactions as FeedEntry[]).filter(
      (e) =>
        (!filters.start || e.date >= filters.start) &&
        (!filters.end || e.date <= filters.end) &&
        (!filters.category || e.category === filters.category) &&
        (!filters.type || e.type === filters.type),
    );
    return fake(rows);
  }
  return request(`/transactions${queryString(filters)}`);
}

/** GET /summary: totals and chart data. Backend default is the last 30 days. */
export function getSummary(range: DateRange = {}): Promise<Summary> {
  if (MOCK.summary) return fake(mockSummary as Summary);
  return request(`/summary${queryString(range)}`);
}

/** GET /bank/account: account nickname and balance. */
export function getAccount(): Promise<Account> {
  if (MOCK.account) return fake(mockAccount as Account);
  return request("/bank/account");
}

/** GET /subscriptions */
export function getSubscriptions(): Promise<SubscriptionsResponse> {
  if (MOCK.subscriptions) return fake(mockSubscriptions as SubscriptionsResponse);
  return request("/subscriptions");
}

/** The suggested questions on the Ask AI page (they have canned mock answers). */
export const SUGGESTED_QUESTIONS: string[] = mockAsk.map((m) => m.question);

/** POST /ask */
export function ask(question: string): Promise<AskResponse> {
  if (MOCK.ask) {
    const hit = mockAsk.find((m) => m.question.toLowerCase() === question.trim().toLowerCase());
    return fake<AskResponse>(
      hit ?? {
        answer: "(Mock) Ask AI isn't connected yet. Try one of the suggested questions.",
        tools_used: [],
      },
    );
  }
  return request("/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
}

/** POST /receipt?source=web_upload: the backup upload from the browser. */
export function uploadReceipt(file: File): Promise<ReceiptResponse> {
  if (MOCK.receipt) return fake(mockReceipt as ReceiptResponse);
  const form = new FormData();
  form.append("file", file); // field name must be "file" (SPEC section 4)
  return request("/receipt?source=web_upload", {
    method: "POST",
    // No Content-Type here: the browser sets it, including the multipart boundary.
    headers: { "X-API-Key": API_SECRET },
    body: form,
  });
}
