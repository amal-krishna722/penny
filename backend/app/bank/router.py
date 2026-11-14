# Owner: Amal (Person B). Endpoints: POST /bank/sync, GET /bank/account
from fastapi import APIRouter

router = APIRouter(tags=["bank"])


def sync_from_nessie() -> dict:
    """Same as POST /bank/sync. Returns {"synced", "new", "matched"}."""
    # STUB until B3: nothing synced yet.
    return {"synced": 0, "new": 0, "matched": 0}
