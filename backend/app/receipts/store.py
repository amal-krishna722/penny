# Owner: Person A. MongoDB helpers for the `receipts` collection.
#
# ID convention (SPEC section 3): every document stores a string `id`, equal to
# str(_id). Look receipts up by it: receipts.find_one({"id": receipt_id}).
# `_id` stays inside MongoDB and is never returned by the API.
from datetime import datetime, timezone

from bson import ObjectId

from app.db import receipts
from app.models import Receipt


def doc_to_receipt(doc: dict) -> dict:
    """Turn a raw MongoDB document into the SPEC Receipt shape (`_id` becomes `id`)."""
    doc = dict(doc)
    oid = doc.pop("_id")
    doc.setdefault("id", str(oid))  # fallback for old test docs saved before `id` existed
    # Validating through the shared model guarantees the response matches SPEC.
    return Receipt(**doc).model_dump()


def save_receipt(extracted: dict, source: str) -> str:
    """Insert a freshly extracted receipt as unmatched cash. Returns its id string."""
    # Duplicate guard: scanning the same receipt twice shouldn't count the purchase twice.
    # We compare only merchant, date and total, because Gemini can word line items
    # slightly differently each time it reads the same image.
    existing = receipts.find_one({
        "user_id": "demo",
        "merchant": extracted.get("merchant"),
        "date": extracted.get("date"),
        "total": extracted.get("total"),
    })
    if existing:
        return existing.get("id") or str(existing["_id"])

    oid = ObjectId()
    doc = {
        **extracted,
        "_id": oid,
        "id": str(oid),
        "user_id": "demo",
        "source": source,
        # UTC time like "2026-11-14T15:30:00Z"
        "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "is_cash": True,
        "matched_transaction_id": None,
        "match_confidence": None,
    }
    receipts.insert_one(doc)
    return doc["id"]


def get_receipt(receipt_id: str) -> dict:
    return doc_to_receipt(receipts.find_one({"id": receipt_id}))


def list_receipts() -> list[dict]:
    # created_at strings sort correctly as text because they're all the same ISO format.
    return [doc_to_receipt(d) for d in receipts.find({"user_id": "demo"}).sort("created_at", -1)]


def make_summary(receipt: dict) -> str:
    """e.g. "$23.40 at Chipotle Mexican Grill → dining (matched to card)" """
    how = "cash" if receipt["is_cash"] else "matched to card"
    return f"${receipt['total']:.2f} at {receipt['merchant']} → {receipt['category']} ({how})"
