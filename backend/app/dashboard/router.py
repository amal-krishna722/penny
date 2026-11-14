# Owner: Person A. Endpoints: GET /transactions, GET /summary, POST /demo/reset
from typing import Literal

from fastapi import APIRouter

from app.dashboard.feed import get_feed
from app.models import Category, FeedEntry

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
