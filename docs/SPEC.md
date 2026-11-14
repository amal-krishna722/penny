# Itemize: SPEC

This file is the **contract**. It says what data looks like and which endpoints exist. It does not say how to build them (that is `docs/TASKS.md`).

If you need to change anything in here, tell the team first and change this file in the same commit.

---

## 1. How the whole thing fits together

```
 ┌──────────────┐  photo   ┌─────────────────────────────┐
 │ iPhone       │ ───────▶ │ receipts/router.py      (A) │  POST /receipt
 │ Shortcut (A) │          │   └─ gemini.py          (A) │  image → receipt JSON
 └──────────────┘          │   └─ saves to MongoDB       │
                           │   └─ calls match_receipt()  │──┐
                           └─────────────────────────────┘  │
                                                            ▼
 ┌──────────────────────┐  fills   ┌──────────┐   ┌─────────────────────────────┐
 │ scripts/seed_nessie  │ ───────▶ │  Nessie  │──▶│ bank/                   (B) │
 │ (B, run once)        │          │ mock bank│   │   nessie.py   talks to Nessie│
 └──────────────────────┘          └──────────┘   │   matching.py receipt ↔ txn │
                                                  │   router.py   /bank/...     │
                                                  └─────────────────────────────┘
                                   MongoDB
                        ┌────────────┴────────────┐
                    receipts                transactions
                        └────────────┬────────────┘
                                     ▼
 ┌─────────────────────────────┐   ┌─────────────────────────────┐
 │ dashboard/              (A) │   │ insights/               (B) │
 │   feed.py    /transactions  │   │   subscriptions.py          │
 │   summary.py /summary       │   │   ask.py   Ask AI (Gemini)  │
 └─────────────────────────────┘   └─────────────────────────────┘
               └──────────────┬──────────────┘
                              ▼
                 ┌─────────────────────────┐
                 │ frontend/ (C) Next.js   │
                 │ dashboard in browser    │
                 └─────────────────────────┘
```

In words:
1. The **Shortcut** sends a photo to `POST /receipt`.
2. **Gemini** turns the photo into structured receipt data, which is saved in MongoDB.
3. **Matching** looks for the bank transaction that receipt belongs to.
4. **Bank transactions** come from Nessie, a fake bank we fill with demo data and copy into MongoDB.
5. The **dashboard endpoints** read both collections and give the frontend clean data.
6. The **frontend** shows it all, plus an Ask AI chat.

---

## 2. Every file and who owns it

```
itemize/
├── docs/
│   ├── SPEC.md                  everyone (this file)
│   └── TASKS.md                 everyone (who builds what, in order)
├── shortcut/README.md           A     how to install the iPhone Shortcut
├── frontend/                    C     the whole Next.js app
└── backend/
    ├── .env / .env.example      shared  API keys
    ├── requirements.txt         shared  Python packages
    ├── scripts/
    │   └── seed_nessie.py       B     fills Nessie with 60 days of demo purchases
    ├── tests/
    │   └── test_matching.py     B     tests for the matching logic
    └── app/
        ├── main.py              shared  starts the server, plugs in every router
        ├── config.py            shared  reads .env
        ├── db.py                shared  MongoDB connection
        ├── models.py            shared  the data shapes from section 3, in Python
        │
        ├── receipts/            A
        │   ├── router.py              POST /receipt, GET /receipts
        │   └── gemini.py              extract_receipt(): image → dict
        │
        ├── dashboard/           A
        │   ├── router.py              GET /transactions, GET /summary, POST /demo/reset
        │   ├── feed.py                builds the transaction feed
        │   └── summary.py             totals, categories, daily chart data
        │
        ├── bank/                B
        │   ├── router.py              POST /bank/sync, GET /bank/account
        │   ├── nessie.py              every call to the Nessie API
        │   └── matching.py            match_receipt(): receipt → transaction
        │
        └── insights/            B
            ├── router.py              GET /subscriptions, POST /ask
            ├── subscriptions.py       finds recurring charges
            └── ask.py                 Ask AI with Gemini function calling
```

**Rule of thumb:** a `router.py` only defines endpoints. The real logic lives in the other files in the same folder. That keeps each file small and easy to explain to judges.

**Shared files** (`main.py`, `config.py`, `db.py`, `models.py`): ask in the group chat before editing.

---

## 3. Data shapes

Rules for all data:
- Dates are strings like `"2026-11-14"`.
- Money is a number in dollars with 2 decimals, always positive: `23.40`.
- IDs are strings.
- There is one demo user. Every record has `"user_id": "demo"`.
- Categories must be one of: `groceries`, `dining`, `transport`, `shopping`, `entertainment`, `subscriptions`, `utilities`, `health`, `education`, `other`.

### LineItem (one row on a receipt)
```json
{ "name": "Chicken burrito bowl", "price": 11.25, "quantity": 1, "category": "dining" }
```

### Receipt (MongoDB collection `receipts`, created by A)
```json
{
  "id": "673a1f0c2e",
  "user_id": "demo",
  "merchant": "Chipotle Mexican Grill",
  "date": "2026-11-14",
  "subtotal": 21.50,
  "tax": 1.90,
  "tip": null,
  "total": 23.40,
  "category": "dining",
  "items": [ LineItem, LineItem ],
  "source": "shortcut",
  "matched_transaction_id": "673a2aa91b",
  "match_confidence": 0.92,
  "is_cash": false,
  "created_at": "2026-11-14T15:30:00Z"
}
```
- `source` is `"shortcut"` or `"web_upload"`.
- `subtotal`, `tax` and `tip` can be `null`.
- Before matching runs: `matched_transaction_id = null`, `match_confidence = null`, `is_cash = true`.

### Transaction (MongoDB collection `transactions`, created by Person B from Nessie)
```json
{
  "id": "673a2aa91b",
  "user_id": "demo",
  "nessie_id": "5f8e01",
  "merchant": "CHIPOTLE 2741 AMHERST",
  "amount": 27.40,
  "date": "2026-11-14",
  "category": "dining",
  "matched_receipt_id": "673a1f0c2e",
  "is_subscription": false
}
```
- `category` starts from a merchant lookup table in the seed script. When a receipt matches, it is replaced with the receipt's category.

### FeedEntry (what the Transactions page shows, built by A)
```json
{
  "id": "673a2aa91b",
  "type": "card",
  "merchant": "Chipotle Mexican Grill",
  "date": "2026-11-14",
  "amount": 27.40,
  "category": "dining",
  "items": [ LineItem ],
  "receipt_id": "673a1f0c2e",
  "transaction_id": "673a2aa91b",
  "is_subscription": false
}
```
How to build the feed:
| Situation | `type` | `amount` from | `items` | `receipt_id` | `transaction_id` |
|---|---|---|---|---|---|
| Transaction with a matched receipt | `card` | transaction | receipt items | set | set |
| Transaction with no receipt | `card` | transaction | `[]` | `null` | set |
| Receipt with no transaction | `cash` | receipt total | receipt items | set | `null` |

A matched pair appears **once**. Sort newest first.

---

## 4. Endpoints

| Method | Path | Owner | File | Used by |
|---|---|---|---|---|
| GET | `/health` | shared | `main.py` | everyone |
| POST | `/receipt` | A | `receipts/router.py` | Shortcut, Upload page |
| GET | `/receipts` | A | `receipts/router.py` | debugging |
| GET | `/transactions` | A | `dashboard/router.py` | Transactions page |
| GET | `/summary` | A | `dashboard/router.py` | Overview page |
| POST | `/demo/reset` | A | `dashboard/router.py` | before each demo |
| POST | `/bank/sync` | B | `bank/router.py` | run after seeding, and by `/demo/reset` |
| GET | `/bank/account` | B | `bank/router.py` | Overview page |
| GET | `/subscriptions` | B | `insights/router.py` | Insights page |
| POST | `/ask` | B | `insights/router.py` | Ask AI page |

### POST /receipt
- Header: `X-API-Key: <API_SECRET>` (wrong or missing → `401`)
- Body: multipart form, one field named `file` (JPEG or PNG)
- Query: `?source=shortcut` (default) or `?source=web_upload`
- Response:
```json
{
  "receipt": Receipt,
  "summary": "$23.40 at Chipotle Mexican Grill → dining (matched to card)"
}
```
- For cash, `summary` ends in `(cash)`. The Shortcut shows `summary` as a notification.
- Errors: `401` bad key, `422` Gemini couldn't read the image, `502` Gemini call failed.

### GET /receipts
Response: `Receipt[]`, newest first.

### GET /transactions
Query (all optional): `start`, `end`, `category`, `type` (`card` or `cash`).
Response: `FeedEntry[]`, newest first.

### GET /summary
Query (optional): `start`, `end`. Default: last 30 days.
```json
{
  "start": "2026-10-16",
  "end": "2026-11-14",
  "total_spent": 1284.37,
  "card_spent": 1190.12,
  "cash_spent": 94.25,
  "receipt_coverage_pct": 38.5,
  "by_category": [ { "category": "groceries", "amount": 312.40, "pct": 24.3 } ],
  "daily": [ { "date": "2026-11-14", "amount": 23.40 } ],
  "top_merchants": [ { "merchant": "Amazon", "amount": 210.33, "count": 4 } ]
}
```
- `receipt_coverage_pct` = percent of card spending that has a matched receipt.
- `daily` has one entry for every day in the range, with `0` for days without spending.

### POST /demo/reset
Deletes all receipts, sets `matched_receipt_id = null` on every transaction and resets their categories from the seed lookup. Response: `{ "ok": true }`

### POST /bank/sync
Copies every Nessie purchase for the demo account into `transactions` (no duplicates, keyed on `nessie_id`), then tries to match every unmatched receipt.
Response: `{ "synced": 62, "new": 3, "matched": 2 }`

### GET /bank/account
Response: `{ "nickname": "Everyday Checking", "balance": 2450.00 }`

### GET /subscriptions
```json
{
  "total_monthly": 55.46,
  "subscriptions": [
    { "merchant": "Netflix", "amount": 15.49, "last_charged": "2026-11-03", "next_expected": "2026-12-03", "times_seen": 2 }
  ]
}
```

### POST /ask
Request: `{ "question": "How much did I spend on food this month?" }`
```json
{
  "answer": "You spent $553.50 on food this month: $312.40 on groceries and $241.10 on dining.",
  "tools_used": [
    { "name": "get_spending", "args": { "category": "groceries", "start": "2026-11-01", "end": "2026-11-14" } }
  ]
}
```

---

## 5. Python functions that cross between people

These are the only places one person's code calls another person's code. Keep these signatures exactly.

```python
# backend/app/bank/matching.py  (Person B writes, A calls from POST /receipt)
def match_receipt(receipt_id: str) -> dict | None:
    """Find the bank transaction for this receipt and save the link in MongoDB.
    Returns {"transaction_id": str, "confidence": float} or None if it's cash."""

# backend/app/receipts/gemini.py  (A writes, used only by A)
def extract_receipt(image_bytes: bytes, mime_type: str) -> dict:
    """Send the image to Gemini. Returns merchant, date, subtotal, tax, tip,
    total, category, items. Raises ValueError if the image is unreadable."""

# backend/app/bank/router.py  (Person B writes, A calls from POST /demo/reset)
def sync_from_nessie() -> dict:
    """Same as POST /bank/sync. Returns {"synced", "new", "matched"}."""
```

**Person B commits a stub of `match_receipt` (always returns `None`) in the first 30 minutes**, so A can build `POST /receipt` without waiting.

---

## 6. Environment variables

`backend/.env`
```
GEMINI_API_KEY=
NESSIE_API_KEY=
NESSIE_CUSTOMER_ID=
NESSIE_ACCOUNT_ID=
MONGODB_URI=
API_SECRET=
FRONTEND_URL=http://localhost:3000
```

`frontend/.env.local`
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_API_SECRET=
```