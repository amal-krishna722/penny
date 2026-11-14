# Amal (Person B): finds subscriptions (recurring charges) in bank transactions. Plain rules, no LLM.
from datetime import date, timedelta

from app.bank.matching import normalize
from app.db import transactions

PRICE_TOLERANCE = 0.05            # the price may change by up to 5% between charges
MIN_GAP_DAYS, MAX_GAP_DAYS = 26, 35  # "about a month" apart

# Bank names are ugly ("APPLE.COM/BILL"). Known subscription brands get a clean name;
# anything else falls back to the cleaned bank name in Title Case ("Black Sheep Deli").
CLEAN_NAMES = {
    "netflix com": "Netflix",
    "spotify usa": "Spotify",
    "planet fitness": "Planet Fitness",
    "apple com bill": "Apple iCloud",
}


def display_name(bank_name: str) -> str:
    key = normalize(bank_name)
    return CLEAN_NAMES.get(key, key.title())


def is_recurring(earlier: dict, later: dict) -> bool:
    """True if two charges look like back-to-back payments of the same subscription."""
    gap = (date.fromisoformat(later["date"]) - date.fromisoformat(earlier["date"])).days
    price_change = abs(later["amount"] - earlier["amount"]) / earlier["amount"]
    return MIN_GAP_DAYS <= gap <= MAX_GAP_DAYS and price_change <= PRICE_TOLERANCE


def detect_subscriptions(transactions: list[dict]) -> list[dict]:
    """Group charges by merchant, and call a merchant a subscription if two charges in a row
    are about a month apart at about the same price. Biggest subscription first."""
    by_merchant = {}
    for t in transactions:
        by_merchant.setdefault(normalize(t["merchant"]), []).append(t)

    subscriptions = []
    for charges in by_merchant.values():
        charges.sort(key=lambda t: t["date"])
        # zip(charges, charges[1:]) walks through neighbours: (1st, 2nd), (2nd, 3rd), ...
        recurring_ids = set()
        for earlier, later in zip(charges, charges[1:]):
            if is_recurring(earlier, later):
                recurring_ids.update({earlier["id"], later["id"]})
        if len(recurring_ids) < 2:
            continue

        recurring = [t for t in charges if t["id"] in recurring_ids]
        last = recurring[-1]
        subscriptions.append({
            "merchant": display_name(last["merchant"]),
            "amount": last["amount"],
            "last_charged": last["date"],
            "next_expected": (date.fromisoformat(last["date"]) + timedelta(days=30)).isoformat(),
            "times_seen": len(recurring),
            "transaction_ids": sorted(recurring_ids),  # used to flag them; not part of the API response
        })
    return sorted(subscriptions, key=lambda s: s["amount"], reverse=True)


def get_subscriptions() -> dict:
    """Find subscriptions in the demo user's transactions, flag them in MongoDB,
    and return the GET /subscriptions shape: {total_monthly, subscriptions}."""
    subs = detect_subscriptions(list(transactions.find({"user_id": "demo"})))
    ids = [tid for s in subs for tid in s.pop("transaction_ids")]  # pop: not part of the API response

    # Reset every flag, then set the current ones, so flags always match the latest detection.
    transactions.update_many({"user_id": "demo"}, {"$set": {"is_subscription": False}})
    if ids:
        transactions.update_many({"id": {"$in": ids}}, {"$set": {"is_subscription": True}})

    return {"total_monthly": round(sum(s["amount"] for s in subs), 2), "subscriptions": subs}
