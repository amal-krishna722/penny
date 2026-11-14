# Owner: Person A. MongoDB helpers for the `receipts` collection.
#
# ID convention (agreed with Person B): documents only have MongoDB's own `_id`
# (an ObjectId). Outside MongoDB we always use `id = str(_id)`. To look a receipt
# up by that string: receipts.find_one({"_id": ObjectId(receipt_id)}).
from datetime import datetime, timezone

from bson import ObjectId

from app.db import receipts
from app.models import Receipt


def doc_to_receipt(doc: dict) -> dict:
    """Turn a raw MongoDB document into the SPEC Receipt shape (`_id` becomes `id`)."""
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    # Validating through the shared model guarantees the response matches SPEC.
    return Receipt(**doc).model_dump()


def save_receipt(extracted: dict, source: str) -> str:
    """Insert a freshly extracted receipt as unmatched cash. Returns its id string."""
    doc = {
        **extracted,
        "user_id": "demo",
        "source": source,
        # UTC time like "2026-11-14T15:30:00Z"
        "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "is_cash": True,
        "matched_transaction_id": None,
        "match_confidence": None,
    }
    result = receipts.insert_one(doc)
    return str(result.inserted_id)


def get_receipt(receipt_id: str) -> dict:
    return doc_to_receipt(receipts.find_one({"_id": ObjectId(receipt_id)}))


def list_receipts() -> list[dict]:
    # created_at strings sort correctly as text because they're all the same ISO format.
    return [doc_to_receipt(d) for d in receipts.find({"user_id": "demo"}).sort("created_at", -1)]


def make_summary(receipt: dict) -> str:
    """e.g. "$23.40 at Chipotle Mexican Grill → dining (matched to card)" """
    how = "cash" if receipt["is_cash"] else "matched to card"
    return f"${receipt['total']:.2f} at {receipt['merchant']} → {receipt['category']} ({how})"
