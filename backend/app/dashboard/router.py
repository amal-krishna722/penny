# Owner: Person A. Endpoints: GET /transactions, GET /summary, POST /demo/reset
from fastapi import APIRouter

router = APIRouter(tags=["dashboard"])
