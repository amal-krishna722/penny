# Owner: Person A. Turns a receipt photo into structured data with Gemini.
import json
from datetime import date

from google import genai
from google.genai import types

from app.config import GEMINI_API_KEY

# Flash model that answered reliably in testing (3.7/3.8 were overloaded and timing out).
MODEL = "gemini-3.5-flash"

# Allowed categories (SPEC section 3).
CATEGORIES = [
    "groceries", "dining", "transport", "shopping", "entertainment",
    "subscriptions", "utilities", "health", "education", "other",
]

PROMPT = f"""You are reading a photo or screenshot of a purchase receipt.
Return ONLY a JSON object with exactly these keys:
- "merchant": store name as a person would say it (e.g. "Chipotle Mexican Grill"), string
- "date": purchase date as "YYYY-MM-DD", or null if not visible
- "subtotal": number or null
- "tax": number or null
- "tip": number or null
- "total": final amount paid, number, or null if you cannot find it
- "category": the overall category of the purchase
- "items": list of line items, each {{"name": string, "price": number, "quantity": integer, "category": string}}
  ("price" is the line total for that row; quantity defaults to 1)

For "category" and each item's "category", use only these: {", ".join(CATEGORIES)}.
Money values are positive dollar amounts without "$".
If the image is not a receipt, return {{"total": null}}."""

# Created lazily so importing this file doesn't fail when the key is missing.
_client = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=GEMINI_API_KEY)
    return _client


def _money(value) -> float | None:
    """Turn 12.5, "12.50" or "$12.50" into 12.5; anything unparseable becomes None."""
    if value is None:
        return None
    try:
        return round(abs(float(str(value).replace("$", "").replace(",", ""))), 2)
    except ValueError:
        return None


def _category(value) -> str:
    value = str(value or "").lower().strip()
    return value if value in CATEGORIES else "other"


def extract_receipt(image_bytes: bytes, mime_type: str) -> dict:
    """Send the image to Gemini. Returns merchant, date, subtotal, tax, tip,
    total, category, items. Raises ValueError if the image is unreadable."""
    response = _get_client().models.generate_content(
        model=MODEL,
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            PROMPT,
        ],
        # Forces Gemini to answer with raw JSON (no ```json fences).
        config=types.GenerateContentConfig(response_mime_type="application/json"),
    )

    try:
        data = json.loads(response.text or "")
    except json.JSONDecodeError:
        raise ValueError("Gemini did not return valid JSON")
    if not isinstance(data, dict):
        raise ValueError("Gemini returned an unexpected shape")

    total = _money(data.get("total"))
    if total is None:
        raise ValueError("Could not find a total on this receipt")

    # Keep the date only if it really is YYYY-MM-DD, otherwise use today.
    receipt_date = data.get("date")
    try:
        date.fromisoformat(str(receipt_date))
    except ValueError:
        receipt_date = date.today().isoformat()

    items = []
    for item in data.get("items") or []:
        if not isinstance(item, dict):
            continue
        price = _money(item.get("price"))
        if price is None:
            continue
        try:
            quantity = int(item.get("quantity") or 1)
        except (TypeError, ValueError):
            quantity = 1
        items.append({
            "name": str(item.get("name") or "Item").strip(),
            "price": price,
            "quantity": quantity,
            "category": _category(item.get("category")),
        })

    return {
        "merchant": str(data.get("merchant") or "Unknown").strip(),
        "date": receipt_date,
        "subtotal": _money(data.get("subtotal")),
        "tax": _money(data.get("tax")),
        "tip": _money(data.get("tip")),
        "total": total,
        "category": _category(data.get("category")),
        "items": items,
    }
