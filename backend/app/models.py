# Shared: the data shapes from docs/SPEC.md sections 3 and 4, as Pydantic models.
# Change only together with SPEC.md, and tell the team first.
from typing import Literal

from pydantic import BaseModel

# Dates are "YYYY-MM-DD" strings. Money is a positive float in dollars.
Category = Literal[
    "groceries", "dining", "transport", "shopping", "entertainment",
    "subscriptions", "utilities", "health", "education", "other",
]


# ---------- SPEC section 3: data ----------

class LineItem(BaseModel):
    name: str
    price: float
    quantity: int = 1
    category: Category


class Receipt(BaseModel):
    """MongoDB collection `receipts` (Person A)."""
    id: str
    user_id: str = "demo"
    merchant: str
    date: str
    subtotal: float | None = None
    tax: float | None = None
    tip: float | None = None
    total: float
    category: Category
    items: list[LineItem] = []
    source: Literal["shortcut", "web_upload"] = "shortcut"
    matched_transaction_id: str | None = None
    match_confidence: float | None = None
    is_cash: bool = True
    created_at: str


class Transaction(BaseModel):
    """MongoDB collection `transactions` (built by Amal, Person B, from Nessie)."""
    id: str
    user_id: str = "demo"
    nessie_id: str
    merchant: str
    amount: float
    date: str
    category: Category
    matched_receipt_id: str | None = None
    is_subscription: bool = False


class FeedEntry(BaseModel):
    """One row on the Transactions page (built by Person A)."""
    id: str
    type: Literal["card", "cash"]
    merchant: str
    date: str
    amount: float
    category: Category
    items: list[LineItem] = []
    receipt_id: str | None = None
    transaction_id: str | None = None
    is_subscription: bool = False


# ---------- SPEC section 4: request and response bodies ----------

class ReceiptResponse(BaseModel):
    """POST /receipt"""
    receipt: Receipt
    summary: str


class CategoryAmount(BaseModel):
    category: Category
    amount: float
    pct: float


class DailyAmount(BaseModel):
    date: str
    amount: float


class MerchantAmount(BaseModel):
    merchant: str
    amount: float
    count: int


class Summary(BaseModel):
    """GET /summary"""
    start: str
    end: str
    total_spent: float
    card_spent: float
    cash_spent: float
    receipt_coverage_pct: float
    by_category: list[CategoryAmount]
    daily: list[DailyAmount]
    top_merchants: list[MerchantAmount]


class OkResponse(BaseModel):
    """POST /demo/reset"""
    ok: bool


class SyncResponse(BaseModel):
    """POST /bank/sync"""
    synced: int
    new: int
    matched: int


class AccountResponse(BaseModel):
    """GET /bank/account"""
    nickname: str
    balance: float


class Subscription(BaseModel):
    merchant: str
    amount: float
    last_charged: str
    next_expected: str
    times_seen: int


class SubscriptionsResponse(BaseModel):
    """GET /subscriptions"""
    total_monthly: float
    subscriptions: list[Subscription]


class AskRequest(BaseModel):
    """POST /ask (request body)"""
    question: str


class ToolCall(BaseModel):
    name: str
    args: dict


class AskResponse(BaseModel):
    """POST /ask (response)"""
    answer: str
    tools_used: list[ToolCall]
