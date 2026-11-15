# Owner: Person A. Builds GET /summary (SPEC section 4) from the same feed as /transactions.
# All arithmetic happens here in Python, so the Overview page can never disagree
# with the Transactions page.
from collections import defaultdict
from datetime import date, timedelta

from app.bank.matching import LOCAL_CITIES, normalize
from app.dashboard.feed import get_feed

TOP_MERCHANTS = 5


def merchant_key(name: str) -> str:
    """The grouping key for one store, however it was written.
    "Stop & Shop" and "STOP & SHOP #0412" -> "stop shop". Uses the same cleaning as matching.
    Anything that groups by merchant (top merchants, Ask AI) should group by this key."""
    return normalize(name) or name.strip().lower()


def merchant_label(names: list[str]) -> str:
    """Pick the name to show for a merchant group. A receipt name ("Stop & Shop") reads nicer
    than a bank name ("STOP & SHOP #0412"), so prefer names that aren't all caps, then the most common."""
    def score(n: str) -> tuple:
        return (not n.isupper(), names.count(n), -len(n))
    best = max(names, key=score)
    if not best.isupper():
        return best
    # Only bank names: "STOP & SHOP #0412" -> "Stop & Shop", "CHIPOTLE 2741 AMHERST" -> "Chipotle"
    words = [w for w in best.split() if not any(ch.isdigit() for ch in w)]
    if len(words) > 1 and words[-1].lower() in LOCAL_CITIES:
        words = words[:-1]
    return " ".join(words).title() or best


def _pct(part: float, whole: float) -> float:
    return round(part / whole * 100, 1) if whole else 0.0


def build_summary(feed: list[dict], start: str, end: str) -> dict:
    """Turn feed rows (already filtered to start..end) into the Summary shape."""
    total = sum(e["amount"] for e in feed)
    card = sum(e["amount"] for e in feed if e["type"] == "card")
    cash = sum(e["amount"] for e in feed if e["type"] == "cash")
    # Coverage: of the money charged to the card, how much has a scanned receipt attached.
    card_with_receipt = sum(e["amount"] for e in feed if e["type"] == "card" and e["receipt_id"])

    by_cat = defaultdict(float)
    by_day = defaultdict(float)
    by_merchant = defaultdict(lambda: {"amount": 0.0, "count": 0, "names": []})
    for e in feed:
        by_cat[e["category"]] += e["amount"]
        by_day[e["date"]] += e["amount"]
        group = by_merchant[merchant_key(e["merchant"])]
        group["amount"] += e["amount"]
        group["count"] += 1
        group["names"].append(e["merchant"])

    # One entry for every day in the range, 0 for days with no spending (SPEC).
    daily = []
    day, last = date.fromisoformat(start), date.fromisoformat(end)
    while day <= last:
        d = day.isoformat()
        daily.append({"date": d, "amount": round(by_day.get(d, 0.0), 2)})
        day += timedelta(days=1)

    categories = sorted(by_cat.items(), key=lambda kv: kv[1], reverse=True)
    merchants = sorted(by_merchant.items(), key=lambda kv: kv[1]["amount"], reverse=True)

    return {
        "start": start,
        "end": end,
        "total_spent": round(total, 2),
        "card_spent": round(card, 2),
        "cash_spent": round(cash, 2),
        "receipt_coverage_pct": _pct(card_with_receipt, card),
        "by_category": [
            {"category": c, "amount": round(a, 2), "pct": _pct(a, total)} for c, a in categories
        ],
        "daily": daily,
        "top_merchants": [
            {"merchant": merchant_label(v["names"]), "amount": round(v["amount"], 2), "count": v["count"]}
            for _, v in merchants[:TOP_MERCHANTS]
        ],
    }


def get_summary(start: str | None = None, end: str | None = None) -> dict:
    """Default range is the last 30 days including today (e.g. 10-16 to 11-14)."""
    end = end or date.today().isoformat()
    start = start or (date.fromisoformat(end) - timedelta(days=29)).isoformat()
    return build_summary(get_feed(start=start, end=end), start, end)
