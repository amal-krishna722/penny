// The data shapes from docs/SPEC.md sections 3 and 4, as TypeScript types.
// These mirror backend/app/models.py field for field. If the backend changes
// a shape, change it here too so the compiler points at every page it breaks.

// Dates are "YYYY-MM-DD" strings. Money is a positive number in dollars.

export const CATEGORIES = [
  "groceries",
  "dining",
  "transport",
  "shopping",
  "entertainment",
  "subscriptions",
  "utilities",
  "health",
  "education",
  "other",
] as const;

// `typeof CATEGORIES[number]` turns the list above into the union type
// "groceries" | "dining" | ... so we only have to write the list once.
export type Category = (typeof CATEGORIES)[number];

// ---------- SPEC section 3: data ----------

export interface LineItem {
  name: string;
  price: number;
  quantity: number;
  category: Category;
}

export interface Receipt {
  id: string;
  user_id: string;
  merchant: string;
  date: string;
  subtotal: number | null;
  tax: number | null;
  tip: number | null;
  total: number;
  category: Category;
  items: LineItem[];
  source: "shortcut" | "web_upload";
  matched_transaction_id: string | null;
  match_confidence: number | null;
  is_cash: boolean;
  created_at: string;
}

/** One row on the Transactions page (GET /transactions). */
export interface FeedEntry {
  id: string;
  type: "card" | "cash";
  merchant: string;
  date: string;
  amount: number;
  category: Category;
  items: LineItem[];
  receipt_id: string | null;
  transaction_id: string | null;
  is_subscription: boolean;
  /** The bank's own name on card rows ("CHIPOTLE 2741 AMHERST"); null for cash. Optional in SPEC. */
  bank_merchant?: string | null;
}

// ---------- SPEC section 4: request and response bodies ----------

/** POST /receipt */
export interface ReceiptResponse {
  receipt: Receipt;
  summary: string;
}

export interface CategoryAmount {
  category: Category;
  amount: number;
  pct: number;
}

export interface DailyAmount {
  date: string;
  amount: number;
}

export interface MerchantAmount {
  merchant: string;
  amount: number;
  count: number;
}

/** GET /summary */
export interface Summary {
  start: string;
  end: string;
  total_spent: number;
  card_spent: number;
  cash_spent: number;
  receipt_coverage_pct: number;
  by_category: CategoryAmount[];
  daily: DailyAmount[];
  top_merchants: MerchantAmount[];
}

/** GET /bank/account */
export interface Account {
  nickname: string;
  balance: number;
}

export interface Subscription {
  merchant: string;
  amount: number;
  last_charged: string;
  next_expected: string;
  times_seen: number;
}

/** GET /subscriptions */
export interface SubscriptionsResponse {
  total_monthly: number;
  subscriptions: Subscription[];
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

/** POST /ask */
export interface AskResponse {
  answer: string;
  tools_used: ToolCall[];
}

// ---------- Query filters (all optional) ----------

export interface TransactionFilters {
  start?: string;
  end?: string;
  category?: Category;
  type?: "card" | "cash";
}

export interface DateRange {
  start?: string;
  end?: string;
}
