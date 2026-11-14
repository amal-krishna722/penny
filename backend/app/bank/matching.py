# Amal (Person B): receipt-to-transaction matching. Deterministic, no LLM (see TASKS.md B4).
import re
from datetime import date, timedelta

from rapidfuzz import fuzz

from app.db import receipts, transactions

TIP_MAX = 1.30         # a dining charge can be up to 30% above the receipt total (the tip)
MIN_MERCHANT = 0.6     # names must be at least this similar
MIN_CONFIDENCE = 0.65  # below this, we'd rather call it cash than guess

NOISE_WORDS = {"inc", "llc", "store"}
LOCAL_CITIES = {"amherst", "hadley", "northampton", "springfield", "boston"}


def normalize(name: str) -> str:
    """Clean a merchant name so the receipt and bank versions can be compared.
    "STOP & SHOP #0412" -> "stop shop", "CHIPOTLE 2741 AMHERST" -> "chipotle" """
    text = re.sub(r"[^a-z\s]", " ", name.lower())  # keep only letters: drops digits, #, &, punctuation
    words = [w for w in text.split() if w not in NOISE_WORDS]
    # Banks often append the city. Drop it, but never if it's the only word left.
    if len(words) > 1 and words[-1] in LOCAL_CITIES:
        words = words[:-1]
    return " ".join(words)


def merchant_score(receipt_name: str, bank_name: str) -> float:
    """0 to 1: how similar two merchant names are after cleaning.
    token_set_ratio ignores word order and extra words, so "chipotle mexican grill" vs "chipotle" = 1.0"""
    return fuzz.token_set_ratio(normalize(receipt_name), normalize(bank_name)) / 100


def amount_score(receipt_total: float, charge: float, category: str) -> float | None:
    """1.0 if the amounts are equal, 0.7 if it's a dining charge that includes a tip,
    None if this charge can't belong to this receipt."""
    # round() because money in floats is imprecise: 84.13 - 84.12 = 0.010000000000005
    if round(abs(charge - receipt_total), 2) <= 0.01:
        return 1.0
    if category == "dining" and receipt_total < charge <= receipt_total * TIP_MAX:
        return 0.7
    return None


def date_score(receipt_date: str, charge_date: str) -> float | None:
    """1.0 same day, 0.8 one day apart, 0.6 two days apart, None if further.
    Card charges often post a day or two after the purchase."""
    days = abs((date.fromisoformat(charge_date) - date.fromisoformat(receipt_date)).days)
    return {0: 1.0, 1: 0.8, 2: 0.6}.get(days)


def score_pair(receipt: dict, txn: dict) -> float | None:
    """Confidence (0 to 1) that this bank transaction is this receipt's charge.
    None if any rule fails: names too different, amounts don't fit, or dates too far apart."""
    m = merchant_score(receipt["merchant"], txn["merchant"])
    a = amount_score(receipt["total"], txn["amount"], receipt["category"])
    d = date_score(receipt["date"], txn["date"])
    if m < MIN_MERCHANT or a is None or d is None:
        return None
    # Weighted average: the merchant name counts most, then the amount, then the date.
    return round(0.5 * m + 0.3 * a + 0.2 * d, 2)


def pick_best(receipt: dict, candidates: list[dict]) -> tuple[dict, float] | None:
    """The candidate transaction with the highest confidence, or None (cash) if none is good enough."""
    best, best_score = None, 0.0
    for txn in candidates:
        score = score_pair(receipt, txn)
        if score is not None and score > best_score:
            best, best_score = txn, score
    if best is None or best_score < MIN_CONFIDENCE:
        return None
    return best, best_score


def find_candidates(receipt: dict) -> list[dict]:
    """Unmatched bank transactions within 2 days of the receipt date (read-only)."""
    day = date.fromisoformat(receipt["date"])
    # Dates are "YYYY-MM-DD" strings, which sort the same as real dates, so $gte/$lte work on them.
    window = {"$gte": (day - timedelta(days=2)).isoformat(), "$lte": (day + timedelta(days=2)).isoformat()}
    return list(transactions.find({"matched_receipt_id": None, "date": window}))


def match_receipt(receipt_id: str) -> dict | None:
    """Find the bank transaction for this receipt and save the link in MongoDB.
    Returns {"transaction_id": str, "confidence": float} or None if it's cash."""
    receipt = receipts.find_one({"id": receipt_id})
    if receipt is None:
        return None  # unknown id, e.g. an old test receipt saved before receipts had an `id`
    if receipt.get("matched_transaction_id"):  # already matched earlier: don't match it twice
        return {"transaction_id": receipt["matched_transaction_id"], "confidence": receipt["match_confidence"]}

    result = pick_best(receipt, find_candidates(receipt))
    if result is None:
        return None  # stays cash (it was saved with is_cash=True)

    txn, confidence = result
    # Link both ways, using the SPEC field names.
    receipts.update_one(
        {"id": receipt_id},
        {"$set": {"matched_transaction_id": txn["id"], "match_confidence": confidence, "is_cash": False}},
    )
    transactions.update_one(
        {"id": txn["id"]},
        {"$set": {"matched_receipt_id": receipt_id, "category": receipt["category"]}},
    )
    return {"transaction_id": txn["id"], "confidence": confidence}
