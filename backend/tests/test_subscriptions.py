# Amal (Person B): tests for app/insights/subscriptions.py. Run from backend/:  python -m pytest -v
from app.insights.subscriptions import detect_subscriptions, display_name


def charge(merchant, amount, day, id):
    """A fake bank transaction with only the fields detection reads."""
    return {"id": id, "merchant": merchant, "amount": amount, "date": day}


def test_monthly_charge_is_a_subscription():
    subs = detect_subscriptions([
        charge("NETFLIX.COM", 15.49, "2026-10-03", "a"),
        charge("NETFLIX.COM", 15.49, "2026-11-03", "b"),
    ])
    assert len(subs) == 1
    s = subs[0]
    assert s["merchant"] == "Netflix"
    assert s["amount"] == 15.49
    assert s["last_charged"] == "2026-11-03"
    assert s["next_expected"] == "2026-12-03"  # last + 30 days
    assert s["times_seen"] == 2
    assert s["transaction_ids"] == ["a", "b"]


def test_small_price_change_still_counts():
    subs = detect_subscriptions([
        charge("SPOTIFY USA", 11.99, "2026-10-08", "a"),
        charge("SPOTIFY USA", 12.49, "2026-11-08", "b"),  # +4.2%, under the 5% limit
    ])
    assert len(subs) == 1
    assert subs[0]["amount"] == 12.49  # reports the latest price


def test_big_price_change_does_not_count():
    subs = detect_subscriptions([
        charge("SPOTIFY USA", 11.99, "2026-10-08", "a"),
        charge("SPOTIFY USA", 13.19, "2026-11-08", "b"),  # +10%
    ])
    assert subs == []


def test_weekly_charges_are_not_subscriptions():
    days = ["2026-10-01", "2026-10-08", "2026-10-15", "2026-10-22", "2026-10-29"]
    subs = detect_subscriptions([charge("STOP & SHOP #0412", 50.00, d, d) for d in days])
    assert subs == []


def test_single_charge_is_not_a_subscription():
    assert detect_subscriptions([charge("NETFLIX.COM", 15.49, "2026-11-03", "a")]) == []


def test_only_the_recurring_merchant_is_returned():
    subs = detect_subscriptions([
        charge("NETFLIX.COM", 15.49, "2026-10-03", "n1"),
        charge("STARBUCKS STORE 1123", 5.25, "2026-10-04", "s1"),
        charge("STARBUCKS STORE 1123", 6.10, "2026-10-08", "s2"),
        charge("NETFLIX.COM", 15.49, "2026-11-03", "n2"),
    ])
    assert [s["merchant"] for s in subs] == ["Netflix"]


def test_display_name():
    assert display_name("APPLE.COM/BILL") == "Apple iCloud"
    assert display_name("BLACK SHEEP DELI") == "Black Sheep Deli"  # fallback: Title Case
