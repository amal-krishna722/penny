# Shared: creates the app and plugs in each person's router. Run: uvicorn app.main:app --reload
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import FRONTEND_URL
from app.receipts.router import router as receipts_router    # Person A
from app.dashboard.router import router as dashboard_router  # Person A
from app.bank.router import router as bank_router            # Person B
from app.insights.router import router as insights_router    # Person B

app = FastAPI(title="Itemize API")

# CORS: lets the frontend (localhost:3000) call this API from the browser.
app.add_middleware(CORSMiddleware, allow_origins=[FRONTEND_URL], allow_methods=["*"], allow_headers=["*"])

app.include_router(receipts_router)
app.include_router(dashboard_router)
app.include_router(bank_router)
app.include_router(insights_router)


@app.get("/health")
def health():
    return {"ok": True}
