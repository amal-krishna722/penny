# Owner: Amal (Person B). Endpoints: GET /subscriptions, POST /ask
from fastapi import APIRouter, HTTPException

from app.insights.ask import ask
from app.insights.subscriptions import get_subscriptions
from app.models import AskRequest, AskResponse, SubscriptionsResponse

router = APIRouter(tags=["insights"])


@router.get("/subscriptions", response_model=SubscriptionsResponse)
def subscriptions():
    return get_subscriptions()


@router.post("/ask", response_model=AskResponse)
def ask_ai(body: AskRequest):
    try:
        return ask(body.question)
    except Exception as e:
        # 502 = "a service we depend on (Gemini) failed", same code Anish uses for receipts
        raise HTTPException(status_code=502, detail=f"Ask AI failed: {e}")
