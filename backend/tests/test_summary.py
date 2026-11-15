# Person A: tests for app/dashboard/summary.py. Run from backend/:  python -m pytest -v
from app.dashboard.summary import build_summary, merchant_key, merchant_label


def row(merchant, amount, day="2026-11-10", type="card", receipt_id=None, bank_merchant=None):
    """A fake feed row with only the fields build_summary reads."""
    return {"merchant": merchant, "amount": amount, "date": day, "type": type,
            "category": "groceries", "receipt_id": receipt_id, "bank_merchant": bank_merchant}


def test_merchant_key_groups_receipt_and_bank_names():
    assert merchant_key("Stop & Shop") == merchant_key("STOP & SHOP #0412") == "stop shop"
    assert merchant_key("CHIPOTLE 2741 AMHERST") == "chipotle"


def test_merchant_label_prefers_receipt_name():
    assert merchant_label(["STOP & SHOP #0412", "Stop & Shop", "STOP & SHOP #0412"]) == "Stop & Shop"
    assert merchant_label(["STOP & SHOP #0412"]) == "Stop & Shop"
    assert merchant_label(["CHIPOTLE 2741 AMHERST"]) == "Chipotle"


def test_top_merchants_merges_one_store():
    feed = [row("Stop & Shop", 47.85, type="cash", receipt_id="r1"),
            row("STOP & SHOP #0412", 88.53),
            row("Chipotle Mexican Grill", 12.00)]
    top = build_summary(feed, "2026-11-10", "2026-11-10")["top_merchants"]
    assert top[0] == {"merchant": "Stop & Shop", "amount": 136.38, "count": 2}
    assert len(top) == 2


def test_top_merchants_groups_matched_rows_by_bank_name():
    # The receipt name cleans to "chipotle mexican grill", the bank name to "chipotle".
    feed = [row("Chipotle Mexican Grill", 15.00, receipt_id="r1", bank_merchant="CHIPOTLE 2741 AMHERST"),
            row("CHIPOTLE 2741 AMHERST", 12.00, bank_merchant="CHIPOTLE 2741 AMHERST"),
            row("Amazon", 84.12, receipt_id="r2", bank_merchant="AMAZON MKTPLACE"),
            row("AMAZON MKTPLACE", 20.00, bank_merchant="AMAZON MKTPLACE")]
    top = build_summary(feed, "2026-11-10", "2026-11-10")["top_merchants"]
    assert top == [{"merchant": "Amazon", "amount": 104.12, "count": 2},
                   {"merchant": "Chipotle Mexican Grill", "amount": 27.0, "count": 2}]
