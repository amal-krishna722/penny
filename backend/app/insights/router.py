# Owner: Amal (Person B). Endpoints: GET /subscriptions, POST /ask
from fastapi import APIRouter

from app.insights.subscriptions import get_subscriptions
from app.models import SubscriptionsResponse

router = APIRouter(tags=["insights"])


@router.get("/subscriptions", response_model=SubscriptionsResponse)
def subscriptions():
    return get_subscriptions()
