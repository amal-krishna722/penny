# Penny

**P**hoto **E**nabled **N**etwork, **N**eatly **Y**ours.

Your bank statement says `AMAZON $84.12`. That one line was actually $60 of groceries and a $24 phone case. Penny reads your receipts and fills in what the bank leaves out, including the cash purchases it never sees at all.

Built at HackUMass XIV.

## How it works

You double-tap the back of your iPhone. An Apple Shortcut takes a photo of the receipt and sends it to our backend, where Gemini pulls out the store, date, total and every line item with a category.

We then look for the matching charge in your bank transactions. For the hackathon, Capital One's Nessie API stands in for a real bank. The matching is plain code, not AI: the amounts have to line up (with room for a tip at restaurants), the dates have to be within two days, and the merchant names have to be a close fuzzy match, since banks write things like `CHIPOTLE 2741 AMHERST`. If nothing matches, the purchase is logged as cash.

The dashboard breaks your spending down by category, spots recurring subscriptions, and has an Ask AI box. When you ask "how much did I spend on food this month?", Gemini calls functions that query the database and does no math of its own, so the numbers come from your actual data.

## Stack

- Backend: Python and FastAPI
- AI: Gemini API
- Database: MongoDB Atlas
- Bank data: Capital One Nessie API
- Frontend: Next.js, Tailwind and Recharts
- Capture: Apple Shortcuts with Back Tap

## Running it locally

You'll need a Gemini API key, a Nessie API key and a MongoDB Atlas connection string.

Backend (Python 3.10+):

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env    # fill in your keys
uvicorn app.main:app --reload
```

The API docs are at http://localhost:8000/docs.

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Then open http://localhost:3000. The API contract between the backend and frontend is in [docs/SPEC.md](docs/SPEC.md).
