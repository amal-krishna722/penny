# Owner: Person A. Endpoints: GET /transactions, GET /summary, POST /demo/reset
from typing import Literal

from fastapi import APIRouter

from app.bank.router import sync_from_nessie  # Amal's (Person B) Nessie sync
from app.dashboard.feed import get_feed
from app.dashboard.summary import get_summary
from app.db import receipts, transactions
from app.models import Category, FeedEntry, OkResponse, Summary

router = APIRouter(tags=["dashboard"])


# All filters are optional. Typing `category` and `type` with the SPEC's allowed
# values means FastAPI rejects typos (e.g. type=credit) with a clear 422 error.
@router.get("/transactions", response_model=list[FeedEntry])
def transactions_feed(
    start: str | None = None,  # "YYYY-MM-DD", inclusive
    end: str | None = None,    # "YYYY-MM-DD", inclusive
    category: Category | None = None,
    type: Literal["card", "cash"] | None = None,
):
    return get_feed(start=start, end=end, category=category, type=type)


@router.get("/summary", response_model=Summary)
def summary(
    start: str | None = None,  # "YYYY-MM-DD", inclusive. Default: 29 days before end
    end: str | None = None,    # "YYYY-MM-DD", inclusive. Default: today
):
    return get_summary(start=start, end=end)


# Wipes the demo back to a clean state before each run.
# Matching overwrites a transaction's category with the receipt's, and Amal's sync
# never rewrites existing transactions. So we delete the transactions too and let
# sync_from_nessie() re-create all of them with Nessie's original categories.
@router.post("/demo/reset", response_model=OkResponse)
def demo_reset():
    receipts.delete_many({"user_id": "demo"})
    transactions.delete_many({"user_id": "demo"})
    sync_from_nessie()
    return {"ok": True}
