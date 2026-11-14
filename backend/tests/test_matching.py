# Amal (Person B): tests for app/bank/matching.py. Run from backend/:  python -m pytest -v
from app.bank.matching import amount_score, date_score, merchant_score, normalize, pick_best


def receipt(merchant, total, day, category="groceries"):
    """A fake receipt with only the fields matching reads."""
    return {"merchant": merchant, "total": total, "date": day, "category": category}


def txn(merchant, amount, day, id="t1"):
    """A fake bank transaction with only the fields matching reads."""
    return {"id": id, "merchant": merchant, "amount": amount, "date": day}


# ---------- normalize ----------

def test_normalize_strips_store_number_and_symbols():
    assert normalize("STOP & SHOP #0412") == "stop shop"


def test_normalize_strips_trailing_city():
    assert normalize("CHIPOTLE 2741 AMHERST") == "chipotle"


def test_normalize_strips_noise_words():
    assert normalize("STARBUCKS STORE 1123") == "starbucks"


def test_normalize_keeps_receipt_names_readable():
    assert normalize("Chipotle Mexican Grill") == "chipotle mexican grill"


def test_normalize_never_empties_a_city_only_name():
    assert normalize("Amherst") == "amherst"


# ---------- merchant_score ----------

def test_merchant_score_demo_names_match_fully():
    assert merchant_score("Chipotle Mexican Grill", "CHIPOTLE 2741 AMHERST") == 1.0
    assert merchant_score("Stop & Shop", "STOP & SHOP #0412") == 1.0
    assert merchant_score("Amazon", "AMAZON MKTPLACE") == 1.0


def test_merchant_score_different_stores_score_low():
    assert merchant_score("El Guero Taco Truck", "STARBUCKS STORE 1123") < 0.6


# ---------- amount_score ----------

def test_amount_exact_and_within_a_cent():
    assert amount_score(47.85, 47.85, "groceries") == 1.0
    assert amount_score(84.12, 84.13, "shopping") == 1.0


def test_amount_tip_only_counts_for_dining():
    assert amount_score(23.40, 27.40, "dining") == 0.7
    assert amount_score(23.40, 27.40, "groceries") is None


def test_amount_rejects_huge_tip_and_lower_charge():
    assert amount_score(23.40, 31.00, "dining") is None  # 32% tip, over the 30% limit
    assert amount_score(47.85, 40.00, "groceries") is None


# ---------- date_score ----------

def test_date_score_by_days_apart():
    assert date_score("2026-11-14", "2026-11-14") == 1.0
    assert date_score("2026-11-14", "2026-11-15") == 0.8
    assert date_score("2026-11-14", "2026-11-12") == 0.6  # works in both directions
    assert date_score("2026-11-14", "2026-11-17") is None


# ---------- pick_best: the 5 cases from TASKS.md B4 ----------

def test_exact_match():
    r = receipt("Amazon", 84.12, "2026-11-14", "shopping")
    best, confidence = pick_best(r, [txn("AMAZON MKTPLACE", 84.12, "2026-11-14")])
    assert best["id"] == "t1"
    assert confidence == 1.0  # 0.5*1.0 + 0.3*1.0 + 0.2*1.0


def test_tip():
    r = receipt("Chipotle Mexican Grill", 23.40, "2026-11-14", "dining")
    best, confidence = pick_best(r, [txn("CHIPOTLE 2741 AMHERST", 27.40, "2026-11-14")])
    assert best["id"] == "t1"
    assert confidence == 0.91  # 0.5*1.0 + 0.3*0.7 (tip) + 0.2*1.0


def test_off_by_one_day():
    r = receipt("Stop & Shop", 47.85, "2026-11-14")
    best, confidence = pick_best(r, [txn("STOP & SHOP #0412", 47.85, "2026-11-15")])
    assert best["id"] == "t1"
    assert confidence == 0.96  # 0.5*1.0 + 0.3*1.0 + 0.2*0.8 (next day)


def test_wrong_merchant_is_cash():
    r = receipt("El Guero Taco Truck", 12.00, "2026-11-14", "dining")
    assert pick_best(r, [txn("STARBUCKS STORE 1123", 12.00, "2026-11-14")]) is None


def test_no_candidates_is_cash():
    r = receipt("El Guero Taco Truck", 12.00, "2026-11-14", "dining")
    assert pick_best(r, []) is None


# ---------- pick_best: choosing between several ----------

def test_picks_the_highest_confidence():
    r = receipt("Chipotle Mexican Grill", 23.40, "2026-11-14", "dining")
    candidates = [
        txn("CHIPOTLE 2741 AMHERST", 27.40, "2026-11-14", id="with_tip"),  # 0.91
        txn("CHIPOTLE 2741 AMHERST", 23.40, "2026-11-14", id="exact"),     # 1.0
    ]
    best, _ = pick_best(r, candidates)
    assert best["id"] == "exact"
