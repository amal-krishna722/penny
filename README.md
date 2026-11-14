# Itemize: see where it went

An AI financial ledger that shows what you actually bought, not just what your bank charged.
Your bank says `AMAZON $84.12`. Itemize says $60 of groceries and a $24 phone case, and it also tracks cash purchases your bank never sees.

**How it works:** double-tap the back of an iPhone → a Shortcut sends a receipt photo to our API → Gemini reads the line items → we match it to a bank transaction (Capital One Nessie) or record it as cash → the dashboard updates.

Built at HackUMass XIV with FastAPI, Gemini, MongoDB Atlas, Capital One Nessie and Next.js.

---

## Who owns what

| Person | Job | Folders |
|---|---|---|
| **A** | Receipt capture and dashboard data | `backend/app/receipts/`, `backend/app/dashboard/`, `shortcut/` |
| **B** | Bank data, matching and Ask AI | `backend/app/bank/`, `backend/app/insights/`, `backend/scripts/` |
| **C** | Frontend | `frontend/` |

Shared files (`main.py`, `config.py`, `db.py`, `models.py`): ask in the group chat before editing.

## Docs
- [`docs/TASKS.md`](docs/TASKS.md): your task list, what you can do alone and who is waiting on you
- [`docs/SPEC.md`](docs/SPEC.md): data shapes and endpoints (the contract between A, B and C)

---

## Setup (once)

```bash
git clone https://github.com/amal-krishna722/itemize.git
cd itemize/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # then paste the real keys from the group chat
```

**VS Code:** Cmd+Shift+P → **Python: Select Interpreter** → `backend/.venv/bin/python`.

## Run the backend

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
```
- Health check: http://localhost:8000/health should show `{"ok": true}`
- API docs: http://localhost:8000/docs (each person's endpoints show up here once they add them)

## Run the frontend (after Person C sets it up)

```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:3000.

---

## Git workflow

```bash
git pull                     # always before you start
git add <your files>
git commit -m "A2: POST /receipt saves to MongoDB"
git push
```
- Start commit messages with your task ID (A2, B4, C3) so everyone can see progress.
- Only commit files in your own folders.
- **Never commit `.env`.** It is already in `.gitignore`. Share keys in the group chat only.
- Added a Python package? Run `pip freeze > requirements.txt` inside the venv and commit it.
