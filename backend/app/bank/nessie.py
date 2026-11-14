# Person B: every call to the Capital One Nessie API (our mock bank) lives here.
import requests

from app.config import NESSIE_API_KEY

BASE_URL = "https://api.nessieisreal.com"


class NessieError(Exception):
    """Raised when a Nessie call fails, with a message that says why."""


def _request(method: str, path: str, body: dict | None = None):
    """Send one request to Nessie and return its JSON reply.
    method: "GET" or "POST". path: like "/customers". body: data to send (POST only)."""
    if not NESSIE_API_KEY:
        raise NessieError("NESSIE_API_KEY is empty. Add it to backend/.env")

    try:
        response = requests.request(
            method,
            BASE_URL + path,
            params={"key": NESSIE_API_KEY},  # Nessie wants the key in the URL: ?key=...
            json=body,                       # turns the dict into JSON for us
            timeout=10,                      # give up after 10 seconds instead of hanging
        )
    except requests.RequestException as e:
        # We never reached Nessie (no internet, wrong address, timeout).
        # "from None" hides the original error, whose text would contain the key.
        raise NessieError(f"Could not reach Nessie: {type(e).__name__}") from None

    if not response.ok:
        # Nessie answered but refused (bad key, missing field, unknown id).
        raise NessieError(f"{method} {path} failed with {response.status_code}: {response.text[:300]}")

    return response.json()


# Nessie requires an address on customers and merchants. We never show it, so one default is enough.
DEFAULT_ADDRESS = {
    "street_number": "650",
    "street_name": "North Pleasant St",
    "city": "Amherst",
    "state": "MA",
    "zip": "01003",
}


# ---------- Customers ----------

def create_customer(first_name: str, last_name: str) -> str:
    """Create a bank customer. Returns the new customer's id."""
    body = {"first_name": first_name, "last_name": last_name, "address": DEFAULT_ADDRESS}
    reply = _request("POST", "/customers", body)
    # Nessie replies {"code": 201, "message": "...", "objectCreated": {..., "_id": "..."}}
    return reply["objectCreated"]["_id"]


def get_customers() -> list[dict]:
    """Every customer that belongs to our API key."""
    return _request("GET", "/customers")


# ---------- Accounts ----------

def create_account(customer_id: str, nickname: str, balance: float) -> str:
    """Open a checking account for a customer. Returns the new account's id."""
    # Nessie's account "type" must be one of: "Checking", "Savings", "Credit Card"
    body = {"type": "Checking", "nickname": nickname, "rewards": 0, "balance": balance}
    reply = _request("POST", f"/customers/{customer_id}/accounts", body)
    return reply["objectCreated"]["_id"]


def get_account(account_id: str) -> dict:
    """One account: _id, type, nickname, rewards, balance, customer_id."""
    return _request("GET", f"/accounts/{account_id}")


# ---------- Merchants ----------

def create_merchant(name: str, category: str) -> str:
    """Create a store, e.g. ("CHIPOTLE 2741 AMHERST", "dining"). Returns the new merchant's id."""
    body = {
        "name": name,
        "category": category,
        "address": DEFAULT_ADDRESS,
        "geocode": {"lat": 42.3868, "lng": -72.5301},  # Nessie requires a location; this is Amherst
    }
    reply = _request("POST", "/merchants", body)
    return reply["objectCreated"]["_id"]


def get_merchant(merchant_id: str) -> dict:
    """One merchant: _id, name, category, address, geocode."""
    return _request("GET", f"/merchants/{merchant_id}")


# ---------- Purchases (the bank charges we match receipts against) ----------
# Nessie drops cents (27.40 is stored as 27), but matching needs exact amounts.
# So we store whole cents in Nessie (2740) and convert back to dollars when reading.
# The rest of the app only ever sees dollars.

def create_purchase(account_id: str, merchant_id: str, amount: float, date: str, description: str = "") -> str:
    """Record a card charge on an account. date is "YYYY-MM-DD". Returns the new purchase's id."""
    body = {
        "merchant_id": merchant_id,
        "medium": "balance",       # paid from the account balance (the other option is "rewards")
        "purchase_date": date,
        "amount": round(amount * 100),  # dollars -> cents; round fixes 2739.9999...
        "status": "completed",     # a settled charge, not "pending"
        "description": description,
    }
    reply = _request("POST", f"/accounts/{account_id}/purchases", body)
    return reply["objectCreated"]["_id"]


def list_purchases(account_id: str) -> list[dict]:
    """Every purchase on an account, with amount in dollars."""
    purchases = _request("GET", f"/accounts/{account_id}/purchases")
    for p in purchases:
        p["amount"] = p["amount"] / 100  # cents -> dollars
    return purchases
