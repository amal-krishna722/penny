# Person B: receipt-to-transaction matching. Deterministic, no LLM (see TASKS.md B4).


def match_receipt(receipt_id: str) -> dict | None:
    """Find the bank transaction for this receipt and save the link in MongoDB.
    Returns {"transaction_id": str, "confidence": float} or None if it's cash."""
    # STUB until B4: every receipt counts as cash for now.
    return None
