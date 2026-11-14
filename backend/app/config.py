import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
NESSIE_API_KEY = os.getenv("NESSIE_API_KEY", "")
NESSIE_CUSTOMER_ID = os.getenv("NESSIE_CUSTOMER_ID", "")
NESSIE_ACCOUNT_ID = os.getenv("NESSIE_ACCOUNT_ID", "")
MONGODB_URI = os.getenv("MONGODB_URI", "")
API_SECRET = os.getenv("API_SECRET", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")