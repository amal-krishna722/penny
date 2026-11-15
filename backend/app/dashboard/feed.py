# Owner: Person A. Builds the Transactions page feed (SPEC section 3, FeedEntry).
#
# The rule from SPEC: a bank transaction and its matched receipt are ONE purchase,
# so they become one "card" row. Receipts no transaction claimed are "cash" rows.
from app.db import receipts, transactions


def build_feed(receipt_docs: list[dict], transaction_docs: list[dict]) -> list[dict]:
    """Merge receipts and bank transactions into FeedEntry dicts (unsorted, unfiltered)."""
    receipts_by_id = {r["id"]: r for r in receipt_docs}
    used_receipt_ids = set()  # receipts already shown inside a card row
    feed = []

    # 1. Every bank transaction is a card purchase. Attach its receipt if it has one.
    for t in transaction_docs:
        r = receipts_by_id.get(t.get("matched_receipt_id"))
        if r:
            used_receipt_ids.add(r["id"])
        feed.append({
            "id": t["id"],
            "type": "card",
            "merchant": r["merchant"] if r else t["merchant"],  # receipt name reads nicer than "CHIPOTLE 2741 AMHERST"
            "date": t["date"],
            "amount": t["amount"],  # the bank amount is what was actually charged (includes tip)
            "category": t["category"],
            "items": r.get("items", []) if r else [],
            "receipt_id": r["id"] if r else None,
            "transaction_id": t["id"],
            "is_subscription": t.get("is_subscription", False),
            # Internal only (not in FeedEntry, so /transactions drops it): the bank's name,
            # which groups the same store even when the receipt name cleans differently.
            "bank_merchant": t["merchant"],
        })

    # 2. Receipts not attached to any transaction are cash purchases.
    for r in receipt_docs:
        if r["id"] in used_receipt_ids:
            continue
        feed.append({
            "id": r["id"],
            "type": "cash",
            "merchant": r["merchant"],
            "date": r["date"],
            "amount": r["total"],
            "category": r["category"],
            "items": r.get("items", []),
            "receipt_id": r["id"],
            "transaction_id": None,
            "bank_merchant": None,
            "is_subscription": False,
        })
    return feed


def get_feed(start=None, end=None, category=None, type=None) -> list[dict]:
    """Load the demo user's data, build the feed, apply filters, newest first."""
    r_docs = list(receipts.find({"user_id": "demo"}))
    t_docs = list(transactions.find({"user_id": "demo"}))
    # Same convention as receipts/store.py: `id` is str(_id). Older test docs
    # were saved before the `id` field existed, so fill it in from `_id`.
    for doc in r_docs + t_docs:
        doc.setdefault("id", str(doc["_id"]))

    feed = build_feed(r_docs, t_docs)

    # Dates are "YYYY-MM-DD" strings, so comparing them as text gives the right order.
    if start:
        feed = [e for e in feed if e["date"] >= start]
    if end:
        feed = [e for e in feed if e["date"] <= end]
    if category:
        feed = [e for e in feed if e["category"] == category]
    if type:
        feed = [e for e in feed if e["type"] == type]

    feed.sort(key=lambda e: e["date"], reverse=True)
    return feed
