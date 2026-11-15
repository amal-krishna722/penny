# Amal (Person B): Ask AI. Gemini only picks tools and phrases the answer;
# these Python functions do every query and every calculation.
from collections import defaultdict
from datetime import date
from typing import get_args

import httpx2  # the HTTP library google-genai uses; we catch its timeout
from google.genai import errors, types

from app.dashboard.feed import get_feed          # Anish's feed: receipts + bank transactions merged
from app.dashboard.summary import build_summary, category_split, merchant_key, merchant_label  # Anish's /summary math
from app.insights.subscriptions import get_subscriptions
from app.models import Category
from app.receipts.gemini import MODELS, RETRYABLE_CODES, _get_client  # Anish's tested models + client

MAX_ROUNDS = 5  # Gemini may ask for tools up to 5 times before it must answer

CATEGORIES = list(get_args(Category))  # the 10 SPEC categories, read from models.py

# ---------- The tools ----------
# Built on the same code as /transactions and /summary, so Ask AI can never
# disagree with what the dashboard shows. Dates are "YYYY-MM-DD" strings.


def get_spending(start: str, end: str, categories: list[str] | None = None, type: str | None = None) -> dict:
    """Total spent and number of purchases. Optional: only some categories, and/or only "card" or "cash".
    Takes a list so "food" (groceries + dining) is summed here in Python, not by Gemini."""
    feed = get_feed(start=start, end=end, type=type)
    if not categories:
        return {"total": round(sum(e["amount"] for e in feed), 2), "count": len(feed)}
    # Itemized purchases count per line item (same split as /summary), so a phone case
    # bought with groceries counts as shopping, not food.
    total, count = 0.0, 0
    for e in feed:
        part = sum(amount for category, amount in category_split(e).items() if category in categories)
        if part > 0:
            total += part
            count += 1
    return {"total": round(total, 2), "count": count}


def get_category_breakdown(start: str, end: str) -> list[dict]:
    """Spending per category, biggest first: [{category, amount, pct}]."""
    return build_summary(get_feed(start=start, end=end), start, end)["by_category"]


def get_top_merchants(n: int, start: str, end: str) -> list[dict]:
    """The n merchants with the most spending: [{merchant, amount, count}]."""
    # Group by Anish's merchant_key, so "Amazon" and "AMAZON MKTPLACE" count as one store,
    # exactly like top_merchants in /summary.
    totals = defaultdict(lambda: {"amount": 0.0, "count": 0, "names": []})
    for e in get_feed(start=start, end=end):
        group = totals[merchant_key(e.get("bank_merchant") or e["merchant"])]
        group["amount"] += e["amount"]
        group["count"] += 1
        group["names"].append(e["merchant"])
    ranked = sorted(totals.values(), key=lambda v: v["amount"], reverse=True)[: int(n)]
    return [{"merchant": merchant_label(v["names"]), "amount": round(v["amount"], 2), "count": v["count"]} for v in ranked]


def get_cash_vs_card(start: str, end: str) -> dict:
    """How much was paid in cash (receipts with no bank charge) vs by card."""
    s = build_summary(get_feed(start=start, end=end), start, end)
    return {"cash": s["cash_spent"], "card": s["card_spent"]}


def search_items(query: str, start: str | None = None, end: str | None = None) -> list[dict]:
    """Receipt line items whose name contains the query, newest first: [{name, price, merchant, date}].
    Only scanned receipts have line items; bank-only charges don't."""
    q = query.lower()
    hits = []
    for e in get_feed(start=start, end=end):  # the feed is already newest first
        for item in e["items"]:
            if q in item["name"].lower():
                hits.append({"name": item["name"], "price": item["price"], "merchant": e["merchant"], "date": e["date"]})
    return hits[:20]  # keep the answer we send to Gemini short


# get_subscriptions() comes straight from B5 (imported above): {total_monthly, subscriptions}.


# ---------- Describing the tools to Gemini ----------
# Gemini can't read our code. These "menu entries" tell it each tool's name, purpose and inputs.

START = {"type": "STRING", "description": "First day of the range, YYYY-MM-DD"}
END = {"type": "STRING", "description": "Last day of the range, YYYY-MM-DD"}


def _params(properties: dict, required: list[str]) -> dict:
    return {"type": "OBJECT", "properties": properties, "required": required}


TOOL_DECLARATIONS = [
    types.FunctionDeclaration(
        name="get_spending",
        description="Total amount spent and number of purchases in a date range. "
                    "Optionally only some categories, and/or only card or only cash purchases.",
        parameters=_params({
            "start": START, "end": END,
            "categories": {
                "type": "ARRAY",
                "items": {"type": "STRING", "enum": CATEGORIES},
                "description": "One or more categories. Food means ['groceries', 'dining'].",
            },
            "type": {"type": "STRING", "enum": ["card", "cash"]},
        }, ["start", "end"]),
    ),
    types.FunctionDeclaration(
        name="get_category_breakdown",
        description="Spending per category in a date range, biggest first, with percentages.",
        parameters=_params({"start": START, "end": END}, ["start", "end"]),
    ),
    types.FunctionDeclaration(
        name="get_top_merchants",
        description="The merchants where the most money was spent in a date range.",
        parameters=_params({
            "n": {"type": "INTEGER", "description": "How many merchants to return"},
            "start": START, "end": END,
        }, ["n", "start", "end"]),
    ),
    types.FunctionDeclaration(
        name="get_subscriptions",
        description="Recurring monthly subscriptions, their prices and the total per month.",
    ),
    types.FunctionDeclaration(
        name="get_cash_vs_card",
        description="How much was paid in cash vs by card in a date range.",
        parameters=_params({"start": START, "end": END}, ["start", "end"]),
    ),
    types.FunctionDeclaration(
        name="search_items",
        description="Find individual items bought (from scanned receipts) whose name contains a word, "
                    "e.g. 'coffee'. Returns each item's price, store and date, newest first.",
        parameters=_params({
            "query": {"type": "STRING", "description": "A word to look for in item names"},
            "start": START, "end": END,
        }, ["query"]),
    ),
]

# Tool name (what Gemini says) -> the Python function that actually runs.
TOOLS = {
    "get_spending": get_spending,
    "get_category_breakdown": get_category_breakdown,
    "get_top_merchants": get_top_merchants,
    "get_subscriptions": get_subscriptions,
    "get_cash_vs_card": get_cash_vs_card,
    "search_items": search_items,
}


def run_tool(name: str, args: dict):
    """Run the tool Gemini asked for. Problems come back as {"error": ...} instead of crashing,
    so Gemini can read the error and try again or explain."""
    if name not in TOOLS:
        return {"error": f"Unknown tool: {name}"}
    try:
        return TOOLS[name](**args)
    except Exception as e:
        return {"error": str(e)}


# ---------- The question-and-answer loop ----------

SYSTEM_PROMPT = """You answer questions about the user's own spending in the Penny app.
Today is {today}. "This month" means {month_start} to {today}.
Rules:
- If the question doesn't say a time range, use this month and say "this month".
- Every number you mention must come from a tool result. Never estimate, guess or do arithmetic yourself.
- If one tool call can answer (for example food = get_spending with categories ["groceries", "dining"]), use that.
- For "where did my money go" or "what do I spend most on", use get_category_breakdown (categories first; mention a top merchant only as extra detail).
- Answer in 1 to 3 short sentences. Write money like $12.34.
- If the tools can't answer the question, say so briefly."""


def _generate(contents: list, config: types.GenerateContentConfig):
    """Ask Gemini, trying Anish's model list in order if a model is busy or times out."""
    last_error = None
    for model in MODELS:
        try:
            return _get_client().models.generate_content(model=model, contents=contents, config=config)
        except errors.APIError as e:
            if e.code not in RETRYABLE_CODES:
                raise
            last_error = e
        except httpx2.TimeoutException as e:
            last_error = e
    raise last_error


def ask(question: str) -> dict:
    """Answer a spending question. Returns {"answer": str, "tools_used": [{"name", "args"}]}."""
    today = date.today()
    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT.format(today=today.isoformat(), month_start=today.replace(day=1).isoformat()),
        tools=[types.Tool(function_declarations=TOOL_DECLARATIONS)],
        # We run the tools ourselves (not the SDK), so we can record each call and cap the rounds.
        automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
    )
    contents = [types.Content(role="user", parts=[types.Part(text=question)])]  # the conversation so far
    tools_used = []

    for _ in range(MAX_ROUNDS):
        response = _generate(contents, config)
        calls = response.function_calls or []
        if not calls:  # no more tool requests: this is the final answer
            return {"answer": (response.text or "").strip(), "tools_used": tools_used}

        # Gemini asked for tools. Keep its request in the conversation, run each tool,
        # and send the results back so it can use them in the next round.
        contents.append(response.candidates[0].content)
        results = []
        for call in calls:
            args = dict(call.args or {})
            tools_used.append({"name": call.name, "args": args})
            results.append(types.Part.from_function_response(name=call.name, response={"result": run_tool(call.name, args)}))
        contents.append(types.Content(role="user", parts=results))

    return {"answer": "Sorry, I couldn't work that out. Try asking a bit more specifically.", "tools_used": tools_used}
