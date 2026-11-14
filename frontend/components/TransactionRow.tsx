import type { Category, FeedEntry } from "@/lib/types";
import { CATEGORY_STYLES, categoryLabel, money } from "@/lib/format";

export function CategoryChip({ category }: { category: Category }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${CATEGORY_STYLES[category].chip}`}
    >
      {categoryLabel(category)}
    </span>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${className}`}>{children}</span>;
}

export default function TransactionRow({
  entry,
  expanded,
  fresh,
  onToggle,
}: {
  entry: FeedEntry;
  expanded: boolean;
  fresh: boolean; // true for a few seconds after the row first appears
  onToggle: () => void;
}) {
  const hasItems = entry.items.length > 0;

  return (
    <li className={`transition-colors duration-1000 ${fresh ? "bg-emerald-50" : "bg-white"}`}>
      <button
        type="button"
        onClick={onToggle}
        disabled={!hasItems}
        aria-expanded={hasItems ? expanded : undefined}
        className="flex w-full items-center gap-3 px-4 py-3 text-left enabled:cursor-pointer enabled:hover:bg-neutral-50"
      >
        {/* Chevron only for rows with line items; a spacer keeps others aligned */}
        <span className={`w-3 text-xs text-neutral-400 transition-transform ${expanded ? "rotate-90" : ""}`}>
          {hasItems ? "▶" : ""}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium text-neutral-900">{entry.merchant}</span>
            {entry.type === "cash" && <Badge className="bg-amber-100 text-amber-800">Cash</Badge>}
            {entry.receipt_id && <Badge className="bg-emerald-100 text-emerald-800">Itemized</Badge>}
            {entry.is_subscription && <Badge className="bg-indigo-100 text-indigo-800">Subscription</Badge>}
          </div>
          {hasItems && (
            <p className="mt-0.5 text-xs text-neutral-500">
              {entry.items.length} {entry.items.length === 1 ? "item" : "items"}
            </p>
          )}
        </div>

        <span className="hidden sm:block">
          <CategoryChip category={entry.category} />
        </span>
        <span className="w-24 text-right font-mono text-sm tabular-nums text-neutral-900">{money(entry.amount)}</span>
      </button>

      {expanded && hasItems && <LineItems entry={entry} />}
    </li>
  );
}

// The expanded part: every line item, a per-category split when the receipt
// spans more than one category (the Amazon example), and the gap between the
// items and the charged amount (tax and tip).
function LineItems({ entry }: { entry: FeedEntry }) {
  const itemsTotal = entry.items.reduce((sum, item) => sum + item.price, 0);
  const extra = entry.amount - itemsTotal;

  const byCategory = new Map<Category, number>();
  for (const item of entry.items) {
    byCategory.set(item.category, (byCategory.get(item.category) ?? 0) + item.price);
  }

  return (
    <div className="border-t border-neutral-100 bg-neutral-50 px-4 py-3 pl-10">
      {byCategory.size > 1 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-neutral-600">
          <span className="font-medium">Split:</span>
          {[...byCategory].map(([category, amount]) => (
            <span key={category} className="flex items-center gap-1">
              <CategoryChip category={category} />
              <span className="font-mono tabular-nums">{money(amount)}</span>
            </span>
          ))}
        </div>
      )}

      <ul className="divide-y divide-neutral-200/70 text-sm">
        {entry.items.map((item, i) => (
          <li key={i} className="flex items-center gap-3 py-1.5">
            <span className="min-w-0 flex-1 truncate text-neutral-800">
              {item.name}
              {item.quantity > 1 && <span className="text-neutral-400"> × {item.quantity}</span>}
            </span>
            {byCategory.size > 1 && <CategoryChip category={item.category} />}
            <span className="w-20 text-right font-mono tabular-nums text-neutral-700">{money(item.price)}</span>
          </li>
        ))}
        {/* Half a cent of slack so rounding never shows a "$0.00" row */}
        {extra > 0.005 && (
          <li className="flex items-center gap-3 py-1.5 text-neutral-500">
            <span className="flex-1">Tax, tip and fees</span>
            <span className="w-20 text-right font-mono tabular-nums">{money(extra)}</span>
          </li>
        )}
      </ul>
    </div>
  );
}
