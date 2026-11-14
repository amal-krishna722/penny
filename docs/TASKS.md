# Itemize: TASKS

Who builds what, in what order. Each task says which files to touch, how to test it and when it counts as done. Work top to bottom. Check a box when the task is merged into `main`.

Data shapes and endpoint details live in `docs/SPEC.md`. Read sections 1 to 5 there before you start.

---

## Who owns what

Only edit your own folders. Shared files: ask in the group chat first.

| Person | Job | Owns (only edit these) | Tasks |
|---|---|---|---|
| **A** | Capture and dashboard data | `backend/app/receipts/`, `backend/app/dashboard/`, `shortcut/` | A1 to A7 |
| **B** | Bank and intelligence | `backend/app/bank/`, `backend/app/insights/`, `backend/scripts/`, `backend/tests/` | B0 to B7 |
| **C** | Frontend | `frontend/` | C1 to C7 |
| Shared | | `backend/app/main.py`, `config.py`, `db.py`, `models.py`, `requirements.txt`, `.env.example`, `docs/` | |

**Already set up (the skeleton):** `main.py` with `/health`, CORS and all 4 routers plugged in. Each backend folder has an empty `router.py`, so nobody needs to touch `main.py` to add endpoints. Create your other files (for example `gemini.py` or `matching.py`) when your task starts.

## Setup (everyone, once)
```
git pull
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # then paste the real keys from the group chat
uvicorn app.main:app --reload   # open http://localhost:8000/health
```
VS Code: Cmd+Shift+P → **Python: Select Interpreter** → `backend/.venv/bin/python`.

## Git habits
- `git pull` before you start, commit only files in your own folders, push often.
- Start commit messages with your task ID: `A2: POST /receipt saves to MongoDB`.
- Never commit `.env`. Keys go in the group chat only.
- Added a Python package? `pip freeze > requirements.txt` inside the venv, then commit it.

## Working alone vs. needing each other

**You can start right away without waiting for anyone:**
- **A:** A1 (Gemini, test with photos on disk), A3 (ngrok), A5 (Shortcut against httpbin.org first).
- **B:** B1 (Nessie client), B2 (seed script), B4 (matching logic and its tests).
- **C:** everything, using mock JSON copied from SPEC sections 3 and 4.

**Handoffs (someone is waiting on you):**

| Who gives | What | Who needs it | Needed by |
|---|---|---|---|
| B | `models.py` and the `match_receipt` stub (B0) | A (for A2) | 11:30 AM |
| B | `transactions` filled in MongoDB (B3) | A (for A4 and A6, until then fake rows) | 2:30 PM |
| B | `sync_from_nessie()` (B3) | A (for `/demo/reset` in A6) | 2:30 PM |
| A | `POST /receipt` working (A2) | C (C3), B (to test B4 on real receipts) | 1:30 PM |
| A | ngrok URL (A3) | C (`NEXT_PUBLIC_API_URL`), Shortcut | 2:00 PM |
| A | `GET /transactions`, `GET /summary` (A4, A6) | C (C2, C4) | 3:00 / 6:00 PM |
| B | `GET /bank/account`, `/subscriptions`, `/ask` (B3, B5, B6) | C (C4, C5, C6) | 2:30 / 5:00 / 7:00 PM |
| A + B | the 4 demo receipts (table in B2) | everyone for the demo | 1:30 PM |

If what you need isn't ready, keep using fake data and swap later. Don't block.

---

## Timeline (Saturday)

| Time | Everyone should have |
|---|---|
| 11:30 AM | Repo running locally for all 3. `models.py` and the `match_receipt` stub merged |
| 2:00 PM | **First end-to-end:** upload a receipt at `/docs` and see it on the Transactions page |
| 4:00 PM | Nessie seeded, matching working, Shortcut hitting a public URL |
| 7:00 PM | **Feature freeze.** Only bug fixes and polish after this |
| 7 to 11 PM | Deploy, rehearse the demo, record a backup video, write Devpost |
| 11:30 PM | Initial Devpost submitted |

---

## Person A: Capture and dashboard data

You own `backend/app/receipts/`, `backend/app/dashboard/` and `shortcut/`.

### A1. Gemini extraction (target 12:30 PM)
- [ ] **File:** `backend/app/receipts/gemini.py`
- **Build:** `extract_receipt(image_bytes, mime_type) -> dict` (signature in SPEC section 5).
  - Use the `google-genai` SDK with a current Flash model and `response_mime_type="application/json"`.
  - The prompt asks for: merchant, date (YYYY-MM-DD), subtotal, tax, tip, total, category, items (name, price, quantity, category). Paste the category list from SPEC section 3 into the prompt and say "use only these".
  - Afterwards: replace any unknown category with `other`, use today's date if none was found, raise `ValueError` if there's no total.
- **Test:** a small script that reads a receipt photo from disk and prints the result. Try 3 or 4 real receipts.
- **Done when:** it returns clean JSON for every test receipt.

### A2. POST /receipt (target 1:30 PM)
- [ ] **File:** `backend/app/receipts/router.py`
- **Build:**
  1. Check the `X-API-Key` header against `API_SECRET` from `app.config`. Wrong → `401`.
  2. Read the uploaded `file`, call `extract_receipt`.
  3. Save to the `receipts` collection with `user_id`, `source`, `created_at`, `is_cash=True`, match fields `null`.
  4. Call `match_receipt(receipt_id)` from `app.bank.matching` (a stub at first, so it returns `None`).
  5. Reload the receipt from MongoDB and return `{receipt, summary}` (SPEC section 4).
- Also add `GET /receipts`.
- **Test:** `/docs` → `POST /receipt` → Try it out → upload a photo, set the header.
- **Done when:** the receipt shows up in MongoDB Atlas and the response matches SPEC.

### A3. Public URL (target 2:00 PM)
- [ ] Install ngrok, run `ngrok http 8000`, post the `https://...` URL in the group chat.
- **Done when:** a teammate on another network can open `<url>/health`.

### A4. Transaction feed (target 3:00 PM)
- [ ] **Files:** `backend/app/dashboard/feed.py`, `backend/app/dashboard/router.py`
- **Build:** `GET /transactions` using the table in SPEC section 3 (FeedEntry). Support the `start`, `end`, `category` and `type` filters.
- **Test:** before Person B's Nessie data exists, insert 2 or 3 fake transactions in MongoDB by hand.
- **Done when:** a matched pair appears once, cash receipts show `type: "cash"`, newest first.

### A5. iPhone Shortcut (target 4:00 PM)
- [ ] **File:** `shortcut/README.md` (write down the steps and the iCloud share link)
- **Build in the Shortcuts app:**
  1. Take Photo
  2. Convert Image → JPEG
  3. Resize Image → width 1500
  4. Get Contents of URL: `<ngrok URL>/receipt?source=shortcut`, method POST, header `X-API-Key`, Request Body **Form**, field `file` = the image. Don't set Content-Type.
  5. Get Dictionary Value → `summary`
  6. Show Notification
- Then: Settings → Accessibility → Touch → Back Tap → Double Tap → this Shortcut.
- **Test with `https://httpbin.org/post` first**, then switch to the real URL.
- **Done when:** a double tap on a receipt shows the summary notification and the receipt appears in `/transactions`.

### A6. Summary and demo reset (target 6:00 PM)
- [ ] **Files:** `backend/app/dashboard/summary.py`, `backend/app/dashboard/router.py`
- **Build:** `GET /summary` exactly as in SPEC section 4. Compute everything in Python from the feed. Then `POST /demo/reset` (delete receipts, clear match fields, call Person B's `sync_from_nessie()`).
- **Done when:** the numbers add up by hand for a small date range.

### A7. After freeze
- [ ] Deploy the backend to Vultr if there's time (Vultr prize), otherwise keep ngrok running on one laptop.
- [ ] Print or screenshot the 4 demo receipts (listed in Person B's task B2).
- [ ] Own the Devpost write-up draft.

---

## Person B: Bank and intelligence

You own `backend/app/bank/`, `backend/app/insights/`, `backend/scripts/`, `backend/tests/`, plus first drafts of the shared files.

### B0. Unblock everyone (target 11:30 AM)
- [x] `main.py`, `config.py`, `db.py` and all 4 empty routers (done in the skeleton)
- [x] **Files:** `backend/app/models.py`, `backend/app/bank/matching.py` (plus a `sync_from_nessie()` stub in `bank/router.py` for A6)
- **Build:**
  - Pydantic models for every shape in SPEC section 3 and the request and response bodies in section 4.
  - A stub: `def match_receipt(receipt_id: str): return None`
- **Done when:** merged to `main` and A and C have pulled it.

### B1. Nessie client (target 12:30 PM)
- [ ] **File:** `backend/app/bank/nessie.py`
- **Build:** small functions that each wrap one Nessie API call: create customer, create account, create merchant, create purchase, list purchases for an account, get account. Read the key from `app.config`. **Check paths and field names against the Nessie docs first.**
- **Test:** call each one from a Python shell.
- **Done when:** you can create a purchase and read it back.

### B2. Seed script (target 1:30 PM)
- [ ] **File:** `backend/scripts/seed_nessie.py`
- **Build:** creates `Demo Student`, one checking account (about $2,450) and **60 days** of purchases (about 50 to 70):
  - Subscriptions on the same day each month: Netflix $15.49, Spotify $11.99, Planet Fitness $24.99, iCloud $2.99
  - Groceries weekly (Stop & Shop, Big Y), dining (Chipotle, Starbucks, local spots), shopping (Amazon, Target), transport (Uber), one big Best Buy purchase of $389.99
  - Plus the 4 **demo receipt** purchases below
  - Prints the customer and account IDs to paste into `.env`
  - Keeps a merchant → category lookup table (used for transactions without receipts)
- **Demo receipts** (agree with the team, then A prints or screenshots them):

  | Receipt | Seeded bank charge | Shows off |
  |---|---|---|
  | Amazon: groceries $60.12 + phone case $24.00 = $84.12 | `AMAZON MKTPLACE` $84.12, same day | one charge, two categories |
  | Chipotle $23.40 | `CHIPOTLE 2741 AMHERST` $27.40, same day | tip and messy merchant name |
  | Stop & Shop $47.85, 8 items | `STOP & SHOP #0412` $47.85, next day | posting delay |
  | Food truck $12.00 | none | cash purchase |

- **Done when:** running it once gives a full 60 days of data in Nessie.

### B3. Sync and account (target 2:30 PM)
- [ ] **File:** `backend/app/bank/router.py`
- **Build:** `sync_from_nessie()` (signature in SPEC section 5), `POST /bank/sync`, `GET /bank/account`. Upsert by `nessie_id` so running sync twice creates no duplicates. At the end, call `match_receipt` for every unmatched receipt.
- **Done when:** `transactions` in Atlas has every Nessie purchase, and syncing twice doesn't change the count.

### B4. Real matching (target 4:00 PM)
- [ ] **Files:** `backend/app/bank/matching.py`, `backend/tests/test_matching.py`
- **Build:** replace the stub. No LLM.
  1. **Candidates:** unmatched transactions within ±2 days of the receipt date.
  2. **Amount must pass one:** exact (difference ≤ $0.01), or for `dining` only, transaction between the receipt total and 1.30× the total (tip).
  3. **Merchant score:** `rapidfuzz.fuzz.token_set_ratio(normalize(a), normalize(b)) / 100`. `normalize` lowercases and strips digits, `#`, punctuation, `inc`, `llc`, `store` and a trailing city name. Must be ≥ 0.6.
  4. **Confidence** = 0.5 × merchant + 0.3 × amount (1.0 exact, 0.7 tip) + 0.2 × date (1.0 same day, 0.8 ±1 day, 0.6 ±2 days).
  5. Take the highest. Below 0.65 → return `None` (cash).
  6. On a match, update both documents: receipt gets `matched_transaction_id`, `match_confidence`, `is_cash=False`. Transaction gets `matched_receipt_id` and the receipt's `category`.
- **Tests:** exact match, tip, off by one day, wrong merchant, no candidates. Run with `pytest`.
- **Done when:** all 4 demo receipts match (or don't) as the table in B2 says.

### B5. Subscriptions (target 5:00 PM)
- [ ] **Files:** `backend/app/insights/subscriptions.py`, `backend/app/insights/router.py`
- **Build:** group transactions by normalized merchant, sort by date. A pair is recurring when amounts are within 5% and 26 to 35 days apart. 2+ recurring charges = subscription. `next_expected` = last + 30 days. Set `is_subscription=True` on those transactions. Endpoint `GET /subscriptions`.
- **Done when:** exactly the 4 seeded subscriptions come back.

### B6. Ask AI (target 7:00 PM)
- [ ] **Files:** `backend/app/insights/ask.py`, `backend/app/insights/router.py`
- **Build:** `POST /ask` with Gemini **function calling**. Each tool is a Python function that queries MongoDB and returns JSON:

  | Tool | Arguments | Returns |
  |---|---|---|
  | `get_spending` | category?, start, end, type? | `{total, count}` |
  | `get_category_breakdown` | start, end | `[{category, amount, pct}]` |
  | `get_top_merchants` | n, start, end | `[{merchant, amount, count}]` |
  | `get_subscriptions` | none | same as `/subscriptions` |
  | `get_cash_vs_card` | start, end | `{cash, card}` |
  | `search_items` | query, start?, end? | `[{name, price, merchant, date}]` |

  Loop: send question + tools → run whatever Gemini calls → send results back → repeat until it answers (max 5 rounds). Record every call in `tools_used`.
  System prompt: today's date, only use numbers from tools, never estimate, 1 to 3 sentences.
- **Test questions:** "How much did I spend on food this month?", "Where did most of my money go?", "How much cash did I spend?", "How much do I pay for subscriptions?", "When did I last buy coffee?"
- **Done when:** all 5 give correct numbers that you can verify against `/summary`.

### B7. After freeze
- [ ] Rehearse the demo end to end with `/demo/reset` before each run.
- [ ] Be ready to explain matching and Ask AI to judges. These are the most technical parts.

---

## Person C: Frontend

You own `frontend/`. Build everything against **mock data first** (copied from SPEC section 3 and 4), then switch to the real API when each endpoint is ready.

### C1. Setup (target 11:45 AM)
- [ ] From the repo root: `npx create-next-app@latest frontend` (TypeScript yes, ESLint yes, Tailwind yes, `src/` no, App Router yes, default alias). Delete `frontend/.git` if it exists.
- [ ] `npm install recharts`
- [ ] `frontend/.env.local` with `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_API_SECRET`
- [ ] `frontend/lib/api.ts`: one function per endpoint. A `USE_MOCKS` flag at the top returns data from `frontend/mocks/*.json` instead of calling the API.
- [ ] Layout with a sidebar: Overview, Transactions, Insights, Ask AI, Upload.
- **Done when:** all 5 pages exist (empty) and the nav works.

### C2. Transactions page (target 2:00 PM)
- [ ] **Uses:** `GET /transactions`
- List of FeedEntry rows: merchant, date, amount, category. Click a row to expand its line items. Badges: **Cash**, **Itemized** (has a receipt), **Subscription**. Filters for category and card/cash.
- Poll every 3 seconds so a double tap shows up live.
- **Done when:** it works on real data at the 2 PM integration.

### C3. Upload page (target 2:30 PM)
- [ ] **Uses:** `POST /receipt?source=web_upload`
- Drag-and-drop area, sends the file with the `X-API-Key` header, shows the returned `summary`. This is the backup if the Shortcut fails on stage.

### C4. Overview page (target 4:30 PM)
- [ ] **Uses:** `GET /summary`, `GET /bank/account`
- Stat cards: total spent, balance, cash vs card, receipt coverage %. Line chart of `daily`. Donut chart of `by_category`. Top merchants list.

### C5. Insights page (target 5:30 PM)
- [ ] **Uses:** `GET /subscriptions`
- Subscription cards with the monthly total at the top. Add more sections only if the backend adds endpoints.

### C6. Ask AI page (target 7:00 PM)
- [ ] **Uses:** `POST /ask`
- Chat box, 4 or 5 suggested questions as buttons, answers with `tools_used` shown as small chips underneath.

### C7. After freeze
- [ ] Turn off mocks everywhere, polish spacing and colors, empty and loading states.
- [ ] Optional: deploy to Vercel and add the Vercel URL to the backend's `FRONTEND_URL`.
- [ ] Take screenshots for Devpost.