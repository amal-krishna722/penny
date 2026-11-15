# Shared: creates the app and plugs in each person's router. Run: uvicorn app.main:app --reload
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import FRONTEND_URL
from app.receipts.router import router as receipts_router    # Person A
from app.dashboard.router import router as dashboard_router  # Person A
from app.bank.router import router as bank_router            # Amal (Person B)
from app.insights.router import router as insights_router    # Amal (Person B)

app = FastAPI(title="Penny API")

# CORS: lets the frontend call this API from the browser. FRONTEND_URL can list several
# origins, comma-separated, e.g. "http://localhost:3000,https://penny.vercel.app".
ALLOWED_ORIGINS = [o.strip().rstrip("/") for o in FRONTEND_URL.split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_methods=["*"], allow_headers=["*"])

app.include_router(receipts_router)
app.include_router(dashboard_router)
app.include_router(bank_router)
app.include_router(insights_router)


@app.get("/health")
def health():
    return {"ok": True}
