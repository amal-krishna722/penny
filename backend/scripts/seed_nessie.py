# Amal (Person B): fills Nessie (our mock bank) with 60 days of demo purchases. Run once, from backend/:
#   python -m scripts.seed_nessie            (refuses if NESSIE_ACCOUNT_ID is already in .env)
#   python -m scripts.seed_nessie --fresh    (creates a brand-new demo customer anyway)
import random
import sys
from datetime import date, timedelta

from app.bank import nessie
from app.config import NESSIE_ACCOUNT_ID

START = date(2026, 9, 17)
END = date(2026, 11, 15)  # demo day

# Bank-statement name -> our category. The category is saved on the Nessie merchant,
# so sync (B3) can read it back. This is the "merchant lookup table" from TASKS.md.
MERCHANTS = {
    "PLANET FITNESS": "subscriptions",
    "NETFLIX.COM": "subscriptions",
    "SPOTIFY USA": "subscriptions",
    "APPLE.COM/BILL": "subscriptions",
    "STOP & SHOP #0412": "groceries",
    "BIG Y #57": "groceries",
    "STARBUCKS STORE 1123": "dining",
    "CHIPOTLE 2741 AMHERST": "dining",
    "BLACK SHEEP DELI": "dining",
    "ANTONIOS PIZZA": "dining",
    "AMAZON MKTPLACE": "shopping",
    "TARGET 00012345": "shopping",
    "BEST BUY 00001234": "shopping",
    "UBER TRIP": "transport",
}

# The bank charges the demo receipts (docs/demo-receipts/) must match. Do not change these.
DEMO_CHARGES = [
    ("AMAZON MKTPLACE", 84.12, "2026-11-14"),
    ("CHIPOTLE 2741 AMHERST", 27.40, "2026-11-14"),  # $23.40 receipt + $4.00 tip
    ("STOP & SHOP #0412", 47.85, "2026-11-15"),      # posts a day after the receipt
]
DEMO_MERCHANTS = {merchant for merchant, _, _ in DEMO_CHARGES}
# No random charges from the demo merchants near the demo dates, so only the planned charges can match.
QUIET_START, QUIET_END = date(2026, 11, 12), date(2026, 11, 16)

# (merchant, amount, day of month). Charged every month that falls inside START..END.
# Together: $55.46 a month, the same number as the SPEC example.
SUBSCRIPTIONS = [
    ("PLANET FITNESS", 24.99, 1),
    ("NETFLIX.COM", 15.49, 3),
    ("SPOTIFY USA", 11.99, 8),
    ("APPLE.COM/BILL", 2.99, 20),
]


def subscription_purchases() -> list[tuple]:
    out = []
    for merchant, amount, day in SUBSCRIPTIONS:
        for month in (9, 10, 11):
            d = date(2026, month, day)
            if START <= d <= END:
                out.append((merchant, amount, d.isoformat()))
    return out


def filler_purchases() -> list[tuple]:
    """Everyday spending. Random amounts, but a fixed seed makes them identical on every run."""
    rng = random.Random(42)
    # (merchants to take turns between, every N days, first-day offset, min $, max $)
    patterns = [
        (["STOP & SHOP #0412", "BIG Y #57"], 7, 0, 35, 95),        # weekly groceries
        (["STARBUCKS STORE 1123"], 4, 1, 4.50, 7.80),              # coffee
        (["CHIPOTLE 2741 AMHERST"], 12, 2, 11, 16),
        (["BLACK SHEEP DELI", "ANTONIOS PIZZA"], 10, 4, 9, 24),    # local spots
        (["AMAZON MKTPLACE", "TARGET 00012345"], 7, 3, 12, 70),    # shopping
        (["UBER TRIP"], 10, 5, 8, 26),
    ]
    out = []
    for merchants, every, offset, low, high in patterns:
        d, i = START + timedelta(days=offset), 0
        while d <= END:
            merchant = merchants[i % len(merchants)]
            amount = round(rng.uniform(low, high), 2)
            near_demo = QUIET_START <= d <= QUIET_END and merchant in DEMO_MERCHANTS
            if not near_demo:
                out.append((merchant, amount, d.isoformat()))
            d, i = d + timedelta(days=every), i + 1
    out.append(("BEST BUY 00001234", 389.99, "2026-10-24"))  # one big purchase (anomaly badge)
    return out


def all_purchases() -> list[tuple]:
    """Every purchase to create, oldest first."""
    return sorted(subscription_purchases() + filler_purchases() + DEMO_CHARGES, key=lambda p: p[2])


def main():
    if NESSIE_ACCOUNT_ID and "--fresh" not in sys.argv:
        print("NESSIE_ACCOUNT_ID is already in .env, so Nessie is already seeded. Nothing to do.")
        print("To create a brand-new demo customer anyway: python -m scripts.seed_nessie --fresh")
        return

    customer_id = nessie.create_customer("Demo", "Student")
    account_id = nessie.create_account(customer_id, "Everyday Checking", 2450)
    # Printed now too, so the IDs aren't lost if something fails halfway.
    print(f"Created customer {customer_id} and account {account_id}")

    merchant_ids = {name: nessie.create_merchant(name, category) for name, category in MERCHANTS.items()}
    print(f"Created {len(merchant_ids)} merchants")

    purchases = all_purchases()
    for n, (merchant, amount, day) in enumerate(purchases, start=1):
        nessie.create_purchase(account_id, merchant_ids[merchant], amount, day, "card purchase")
        print(f"  {n:>2}/{len(purchases)}  {day}  {merchant:<22} ${amount:>7.2f}")

    print("\nDone. Paste these two lines into backend/.env:")
    print(f"NESSIE_CUSTOMER_ID={customer_id}")
    print(f"NESSIE_ACCOUNT_ID={account_id}")


if __name__ == "__main__":
    main()
