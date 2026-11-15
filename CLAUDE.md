# CLAUDE.md: Penny (HackUMass XIV)

## What we're building
**Penny: see where it went.** An AI financial ledger that tells users what they actually bought, not just what their bank charged.

A bank app shows `AMAZON $84.12`. Penny shows $60 of groceries and a $24 phone case, and it also counts cash purchases banks never see.

### Core flow
1. User double-taps the back of their iPhone (Back Tap runs an Apple Shortcut, no native app).
2. The Shortcut takes a photo or screenshot of a receipt, converts it to JPEG, resizes it and POSTs it as multipart form data (field name `file`, header `X-API-Key`) to `POST /receipt`.
3. Gemini extracts merchant, date, total, line items (name, price, category) and an overall category as JSON.
4. Backend matches the receipt to a Nessie (Capital One mock bank) transaction. No match means it is recorded as a cash purchase.
5. Dashboard updates with itemized purchases, category breakdowns, subscriptions and an Ask AI panel.

## Hackathon context
- 36 hours. **Initial Devpost submission due Saturday 11:59 PM. Final due Sunday 9:00 AM.** Judging Sunday 12:30 PM.
- Team of 3. Nobody has built a project with AI coding tools before, so explain what you do and why as you go.
- Target prizes: Most Impactful AI Hack (our one HackUMass track), Best Use of Nessie (Capital One), Best Use of Gemini API, Best Use of MongoDB Atlas, Best Use of Vultr (if we host there), GoDaddy domain, Best Agentic Hack (Sentient OS) via the Ask AI tool-calling design.
- Priority order: working end-to-end demo first, then features, then polish. Feature freeze at 7 PM Saturday.

## Tech stack
- Backend: Python 3.10+, FastAPI, uvicorn, python-multipart
- AI: Gemini via the `google-genai` SDK (use a current Flash model)
- Bank data: Capital One Nessie API via `requests`
- Database: MongoDB Atlas via `pymongo`
- Matching: `rapidfuzz` for fuzzy merchant names
- Frontend: Next.js (App Router, TypeScript, Tailwind) and Recharts
- Phone: Apple Shortcuts with Back Tap

## Repo structure
```
itemize/
├── backend/
│   ├── .venv/              (never commit)
│   ├── .env                (real keys, never commit)
│   ├── .env.example
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py         creates the FastAPI app, CORS, includes all routers
│   │   ├── config.py       the only place that reads env vars
│   │   ├── db.py           shared MongoDB client and collections
│   │   ├── models.py       shared Pydantic models (the contract in code)
│   │   ├── receipts/   Person A: router.py, gemini.py
│   │   ├── dashboard/  Person A: router.py, feed.py, summary.py
│   │   ├── bank/       B: router.py, nessie.py, matching.py
│   │   └── insights/   B: router.py, subscriptions.py, ask.py
│   ├── scripts/seed_nessie.py   B
│   └── tests/test_matching.py   B
├── frontend/               Person C (Next.js)
├── shortcut/README.md      how to install the iPhone Shortcut
├── docs/SPEC.md            API contract and JSON shapes
├── docs/TASKS.md           who builds what, in order
├── .gitignore
└── README.md
```
Run the backend from `backend/` with `source .venv/bin/activate` then `uvicorn app.main:app --reload`. API docs at http://localhost:8000/docs.

## Ownership (stay in your lane)
Full task lists with targets are in `docs/TASKS.md`. Data shapes and endpoints are in `docs/SPEC.md`. Follow those exactly.

- **Person A (capture and dashboard data):** `backend/app/receipts/`, `backend/app/dashboard/`, `shortcut/`. Shortcut, `POST /receipt`, Gemini extraction, the transaction feed, `/summary`, `/demo/reset`, hosting (ngrok or Vultr).
- **Person B (bank and intelligence):** `backend/app/bank/`, `backend/app/insights/`, `backend/scripts/`. Nessie client and seed script, sync, receipt to transaction matching, subscription detection, Ask AI. Also drafts the shared files (`models.py`, `main.py`).
- **Person C (frontend):** `frontend/`. Overview, Transactions, Insights and Ask AI pages plus a backup drag-and-drop receipt upload.
- Shared files (`main.py`, `models.py`, `config.py`, `db.py`, `docs/SPEC.md`) change only after telling the team. When working for one person, only edit that person's folders unless asked.

## Design decisions (do not change without asking)
- **Matching is deterministic, never an LLM.** Amount must match exactly or within a tip tolerance (receipt total up to about 25% below the bank charge for restaurants). Date within plus or minus 2 days. Merchant compared with `rapidfuzz` after normalizing (lowercase, strip store numbers and city names). If several candidates match, pick the highest combined score. No match means `is_cash = true`.
- **Nessie is a mock bank we fill ourselves.** `scripts/seed_nessie.py` creates a demo customer, an account and about a month of purchases, including ones that line up with the receipts we will scan in the demo. Nessie purchases reference a `merchant_id`, so merchant names come from the merchants endpoint.
- **Ask AI uses Gemini function calling, not raw data dumps.** Give Gemini tools such as `get_spending(category, start, end)`, `get_top_merchants(n, start, end)`, `get_subscriptions()` and `get_cash_vs_card(start, end)` that run real MongoDB queries. All arithmetic happens in Python. Gemini only picks tools and phrases the answer.
- **Subscription detection:** same merchant, similar amount (within about 5%), roughly 30 days apart, seen at least twice.
- **Anomaly badge (only if time allows):** a purchase more than about 3 times the user's usual amount for that category.
- **One hardcoded demo user. No auth.** The Shortcut authenticates with the `X-API-Key` header checked against `API_SECRET`.
- Investments and portfolio tracking are out of scope unless everything else is done.

## Rules for writing code here
- Never put secrets in code or commit `.env`. Read keys only through `app/config.py`.
- Keep changes small and runnable. After each change, say how to test it (a curl command or the /docs page).
- If you add a package, update `requirements.txt` with `pip freeze > requirements.txt` and say so.
- Prefer simple, readable code over clever code. Judges will ask us how it works.
- Add a short comment above anything non-obvious, especially in matching logic.
- The team wants to learn while building: explain new concepts briefly the first time they come up, and do not make large multi-file changes without describing the plan first.