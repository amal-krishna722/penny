# Owner: Person A. Endpoints: POST /receipt, GET /receipts
from typing import Literal

from fastapi import APIRouter, Header, HTTPException, UploadFile

from app.bank.matching import match_receipt
from app.config import API_SECRET
from app.models import Receipt, ReceiptResponse
from app.receipts import store
from app.receipts.gemini import extract_receipt

router = APIRouter(tags=["receipts"])


# Plain `def` (not `async def`): pymongo and the Gemini call block, so FastAPI
# runs this in a worker thread and the server stays responsive meanwhile.
@router.post("/receipt", response_model=ReceiptResponse)
def upload_receipt(
    file: UploadFile,
    source: Literal["shortcut", "web_upload"] = "shortcut",
    x_api_key: str | None = Header(default=None),  # FastAPI reads the "X-API-Key" header
):
    if not API_SECRET or x_api_key != API_SECRET:
        raise HTTPException(status_code=401, detail="Bad or missing X-API-Key")

    image_bytes = file.file.read()
    # The Shortcut sends JPEG; fall back to that if the upload has no image type.
    mime_type = file.content_type if (file.content_type or "").startswith("image/") else "image/jpeg"

    try:
        extracted = extract_receipt(image_bytes, mime_type)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"Couldn't read the receipt: {e}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini call failed: {e}")

    receipt_id = store.save_receipt(extracted, source)
    match_receipt(receipt_id)  # B's code updates the document in MongoDB if it finds a card match
    receipt = store.get_receipt(receipt_id)  # reload so we return whatever matching saved
    return {"receipt": receipt, "summary": store.make_summary(receipt)}


@router.get("/receipts", response_model=list[Receipt])
def all_receipts():
    return store.list_receipts()
