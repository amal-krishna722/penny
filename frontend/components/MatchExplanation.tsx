// "How Penny matched this": shown when a row with a receipt is expanded.
// Everything here is read from the API (GET /receipts + the feed row). The
// match itself was decided on the server by backend/app/bank/matching.py;
// this panel only explains that decision so judges can check it themselves.
import { Check, Smartphone, Upload } from "lucide-react";
import { money, shortDate } from "@/lib/format";
import { MATCH_RULES, daysBetween } from "@/lib/rules";
import type { FeedEntry, Receipt } from "@/lib/types";

export default function MatchExplanation({ entry, receipt }: { entry: FeedEntry; receipt: Receipt }) {
  return (
    <div className="mb-3 rounded-[10px] border border-border bg-surface px-4 py-3 text-sm text-text">
      {entry.type === "card" ? <CardMatch entry={entry} receipt={receipt} /> : <CashReason receipt={receipt} />}
      <ScanSource receipt={receipt} />
    </div>
  );
}

function CardMatch({ entry, receipt }: { entry: FeedEntry; receipt: Receipt }) {
  // For a card row, entry.date and entry.amount are the bank's; receipt.* is what Gemini read.
  const diff = Math.round((entry.amount - receipt.total) * 100) / 100;
  const days = daysBetween(receipt.date, entry.date);

  let amountText: string;
  if (Math.abs(diff) <= 0.01) {
    amountText = `Exact match: ${money(receipt.total)} on both.`;
  } else if (diff > 0) {
    const pct = Math.round((diff / receipt.total) * 100);
    amountText = `The card was charged ${money(diff)} (${pct}%) more than the receipt: the tip. Dining charges may be up to ${MATCH_RULES.tipMaxPct}% above the receipt.`;
  } else {
    amountText = `The card was charged ${money(-diff)} less than the receipt.`;
  }

  const dateText =
    days === 0
      ? "Same day."
      : `The charge posted ${Math.abs(days)} ${Math.abs(days) === 1 ? "day" : "days"} ${days > 0 ? "after" : "before"} the purchase.`;

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">How Penny matched this receipt to your card</p>
        {receipt.match_confidence !== null && (
          <span className="pill bg-success/15 text-success-ink">
            {Math.round(receipt.match_confidence * 100)}% confident
          </span>
        )}
      </div>

      {/* Side by side: what the receipt says vs what the bank says */}
      <dl className="mt-2 grid grid-cols-[auto_1fr_auto] gap-x-4 gap-y-1 text-xs">
        <dt className="text-text-muted">Receipt</dt>
        <dd>
          {receipt.merchant} · {shortDate(receipt.date)}
        </dd>
        <dd className="text-right font-semibold tabular-nums">{money(receipt.total)}</dd>
        <dt className="text-text-muted">Bank</dt>
        <dd>Card charge · {shortDate(entry.date)}</dd>
        <dd className="text-right font-semibold tabular-nums">{money(entry.amount)}</dd>
      </dl>

      <ul className="mt-3 space-y-1.5 text-xs">
        <Rule label="Amount">{amountText}</Rule>
        <Rule label="Date">
          {dateText} Allowed: within {MATCH_RULES.maxDaysApart} days.
        </Rule>
        <Rule label="Store">
          Names are at least {MATCH_RULES.minNameSimilarityPct}% similar once store numbers and city names are removed.
        </Rule>
      </ul>

      <p className="mt-3 text-xs text-text-muted">
        Plain rules, no AI: Gemini only read the receipt. If no charge had passed all three checks, this would be
        counted as cash.
      </p>
    </>
  );
}

function CashReason({ receipt }: { receipt: Receipt }) {
  return (
    <>
      <p className="font-semibold">Why this counts as cash</p>
      <p className="mt-1 text-xs">
        No card charge within {MATCH_RULES.maxDaysApart} days of {shortDate(receipt.date)} matched{" "}
        {money(receipt.total)} at a similar store, so Penny records it as a cash purchase your bank never saw.
      </p>
    </>
  );
}

function Rule({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <Check size={14} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
      <span>
        <span className="font-semibold">{label}:</span> {children}
      </span>
    </li>
  );
}

function ScanSource({ receipt }: { receipt: Receipt }) {
  const viaPhone = receipt.source === "shortcut";
  const Icon = viaPhone ? Smartphone : Upload;
  const when = new Date(receipt.created_at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <p className="mt-3 flex items-center gap-1.5 border-t border-border pt-2 text-xs text-text-muted">
      <Icon size={13} aria-hidden="true" />
      {viaPhone ? "Scanned with the iPhone Shortcut" : "Uploaded on the web"} · {when}
    </p>
  );
}
