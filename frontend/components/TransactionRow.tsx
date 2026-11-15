import { ChevronRight, ReceiptText } from "lucide-react";
import { Amount } from "@/components/ui";
import { CATEGORY_STYLES, categoryLabel, money, shortDate } from "@/lib/format";
import MatchExplanation from "@/components/MatchExplanation";
import type { Category, FeedEntry, Receipt } from "@/lib/types";

/** Category badge: 15% tint of the category color with darker text. */
export function CategoryChip({ category }: { category: Category }) {
  return <span className={`pill ${CATEGORY_STYLES[category].badge}`}>{categoryLabel(category)}</span>;
}

export default function TransactionRow({
  entry,
  receipt,
  expanded,
  fresh,
  onToggle,
}: {
  entry: FeedEntry;
  receipt?: Receipt; // the scanned receipt behind this row, from GET /receipts

  expanded: boolean;
  fresh: boolean; // true for a few seconds after the row first appears
  onToggle: () => void;
}) {
  const hasItems = entry.items.length > 0;
  const hasReceipt = entry.receipt_id !== null;
  // Rows open when there's something to show: line items or the match explanation.
  const canExpand = hasItems || !!receipt;

  return (
    <li className={`transition-colors duration-1000 ${fresh ? "bg-accent-soft" : "bg-surface"}`}>
      <button
        type="button"
        onClick={onToggle}
        disabled={!canExpand}
        aria-expanded={canExpand ? expanded : undefined}
        className="flex w-full items-center gap-3 px-4 py-3 text-left enabled:cursor-pointer enabled:hover:bg-surface-alt"
      >
        {/* Chevron only for rows that can open; a spacer keeps others aligned */}
        <span className="w-4 text-text-faint">
          {canExpand && (
            <ChevronRight size={16} className={`transition-transform ${expanded ? "rotate-90" : ""}`} aria-hidden="true" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold text-text">{entry.merchant}</span>
            {/* "Itemized": a card charge we matched to a scanned receipt */}
            {hasReceipt && entry.type === "card" && (
              <span className="pill gap-1 bg-success/15 text-success-ink">
                <ReceiptText size={13} aria-hidden="true" />
                Itemized
              </span>
            )}
            {hasReceipt && entry.type === "cash" && (
              <ReceiptText size={15} className="shrink-0 text-success" aria-label="Receipt" />
            )}
            {entry.is_subscription && <span className="pill bg-accent-soft text-accent-ink">Subscription</span>}
          </div>
          <p className="mt-0.5 text-xs text-text-muted">
            {shortDate(entry.date)}
            {hasItems && ` · ${entry.items.length} ${entry.items.length === 1 ? "item" : "items"}`}
            {/* A card charge we have no receipt for: nudge the user to scan one */}
            {entry.type === "card" && !hasReceipt && <span className="text-warning-ink"> · No receipt</span>}
          </p>
        </div>

        <span className="hidden sm:block">
          <CategoryChip category={entry.category} />
        </span>
        <span className="pill hidden bg-surface-alt text-text-muted sm:inline-flex">
          {entry.type === "cash" ? "Cash" : "Card"}
        </span>
        <Amount value={entry.amount} className="w-24 text-right text-sm font-semibold text-text" />
      </button>

      {expanded && canExpand && <LineItems entry={entry} receipt={receipt} />}
    </li>
  );
}

// What's between the items and the amount actually paid, split up:
// tax as printed on the receipt, the tip (printed, or the extra the card was
// charged on top of the receipt total), anything left over, then the total.
function Extras({ entry, receipt, itemsTotal }: { entry: FeedEntry; receipt: Receipt; itemsTotal: number }) {
  const tax = receipt.tax ?? 0;
  // A tip added on the card after printing shows up as charge minus receipt total.
  const cardTip = entry.type === "card" ? entry.amount - receipt.total : 0;
  const tip = receipt.tip ?? 0;
  const addedTip = cardTip > 0.005 ? cardTip : 0;
  const other = entry.amount - itemsTotal - tax - tip - addedTip;

  return (
    <>
      {tax > 0.005 && <ExtraLine label="Tax (from the receipt)" amount={tax} />}
      {tip > 0.005 && <ExtraLine label="Tip (from the receipt)" amount={tip} />}
      {addedTip > 0 && <ExtraLine label="Tip (added on the card)" amount={addedTip} />}
      {Math.abs(other) > 0.005 && <ExtraLine label={other > 0 ? "Fees" : "Discounts"} amount={other} />}
      <li className="flex items-center gap-3 py-1.5 font-semibold">
        <span className="flex-1">{entry.type === "card" ? "Charged to your card" : "Paid in cash"}</span>
        <span className="w-20 text-right tabular-nums">{money(entry.amount)}</span>
      </li>
    </>
  );
}

function ExtraLine({ label, amount }: { label: string; amount: number }) {
  return (
    <li className="flex items-center gap-3 py-1.5 italic">
      <span className="flex-1">{label}</span>
      <span className="w-20 text-right tabular-nums">{money(amount)}</span>
    </li>
  );
}

// The expanded part: every line item, a per-category split when the receipt
// spans more than one category (the Amazon example), and the gap between the
// items and the charged amount (tax and tip).
function LineItems({ entry, receipt }: { entry: FeedEntry; receipt?: Receipt }) {
  const itemsTotal = entry.items.reduce((sum, item) => sum + item.price, 0);
  const extra = entry.amount - itemsTotal;

  const byCategory = new Map<Category, number>();
  for (const item of entry.items) {
    byCategory.set(item.category, (byCategory.get(item.category) ?? 0) + item.price);
  }

  return (
    <div className="border-t border-border bg-surface-alt px-4 py-3 pl-11">
      {receipt && <MatchExplanation entry={entry} receipt={receipt} />}

      {byCategory.size > 1 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-text">
          <span className="font-semibold">Split:</span>
          {[...byCategory].map(([category, amount]) => (
            <span key={category} className="flex items-center gap-1">
              <CategoryChip category={category} />
              <span className="tabular-nums">{money(amount)}</span>
            </span>
          ))}
        </div>
      )}

      {/* --text here, not --text-muted: muted text is too faint on the beige surface-alt */}
      <ul className="divide-y divide-border text-sm text-text">
        {entry.items.map((item, i) => (
          <li key={i} className="flex items-center gap-3 py-1.5">
            <span className="min-w-0 flex-1 truncate">
              {item.name}
              {item.quantity > 1 && <span> × {item.quantity}</span>}
            </span>
            {byCategory.size > 1 && <CategoryChip category={item.category} />}
            <span className="w-20 text-right tabular-nums">{money(item.price)}</span>
          </li>
        ))}
        {entry.items.length > 0 &&
          (receipt ? (
            <Extras entry={entry} receipt={receipt} itemsTotal={itemsTotal} />
          ) : (
            // No receipt details loaded (yet): show the gap as one line.
            // Half a cent of slack so rounding never shows a "$0.00" row.
            extra > 0.005 && <ExtraLine label="Tax, tip and fees" amount={extra} />
          ))}
      </ul>
    </div>
  );
}
