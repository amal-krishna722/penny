from pymongo import MongoClient
from app.config import MONGODB_URI

client = MongoClient(MONGODB_URI)
db = client["itemize"]

receipts = db["receipts"]
transactions = db["transactions"]