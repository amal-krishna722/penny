# Owner: Amal (Person B). Endpoints: POST /bank/sync, GET /bank/account
from fastapi import APIRouter

from app.bank import nessie
from app.bank.matching import match_receipt
from app.config import NESSIE_ACCOUNT_ID
from app.db import receipts, transactions
from app.models import AccountResponse, SyncResponse

router = APIRouter(tags=["bank"])


def _account_id() -> str:
    if not NESSIE_ACCOUNT_ID:
        raise nessie.NessieError("NESSIE_ACCOUNT_ID is empty. Run scripts/seed_nessie.py and put the IDs in .env")
    return NESSIE_ACCOUNT_ID


def sync_from_nessie() -> dict:
    """Same as POST /bank/sync. Returns {"synced", "new", "matched"}.
    Copies every Nessie purchase into MongoDB `transactions`, then retries matching for cash receipts."""
    transactions.create_index("nessie_id", unique=True)  # database-level guard against duplicates

    purchases = nessie.list_purchases(_account_id())
    merchants = {}  # merchant_id -> merchant, so each merchant is fetched from Nessie only once
    new = 0
    for p in purchases:
        if p["merchant_id"] not in merchants:
            merchants[p["merchant_id"]] = nessie.get_merchant(p["merchant_id"])
        merchant = merchants[p["merchant_id"]]

        # Upsert: insert if this nessie_id is new, otherwise leave the existing document alone.
        # $setOnInsert only writes on insert, so a re-sync never wipes a match saved by matching.
        result = transactions.update_one(
            {"nessie_id": p["_id"]},
            {"$setOnInsert": {
                "id": p["_id"],
                "user_id": "demo",
                "nessie_id": p["_id"],
                "merchant": merchant["name"],
                "amount": p["amount"],
                "date": p["purchase_date"],
                "category": merchant["category"],
                "matched_receipt_id": None,
                "is_subscription": False,
            }},
            upsert=True,
        )
        if result.upserted_id is not None:
            new += 1

    # Receipts scanned before their bank charge arrived get another chance to match.
    matched = 0
    for r in receipts.find({"is_cash": True, "matched_transaction_id": None}, {"id": 1}):
        # SPEC says receipts have "id"; fall back to Mongo's _id so one odd receipt can't crash the sync.
        if match_receipt(r.get("id") or str(r["_id"])):
            matched += 1

    return {"synced": len(purchases), "new": new, "matched": matched}


@router.post("/bank/sync", response_model=SyncResponse)
def bank_sync():
    return sync_from_nessie()


@router.get("/bank/account", response_model=AccountResponse)
def bank_account():
    account = nessie.get_account(_account_id())
    return {"nickname": account["nickname"], "balance": account["balance"]}
