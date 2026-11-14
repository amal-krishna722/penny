import certifi
from pymongo import MongoClient
from app.config import MONGODB_URI

# certifi supplies trusted certificates, so Atlas's encrypted connection works on every Mac
client = MongoClient(MONGODB_URI, tlsCAFile=certifi.where())
db = client["itemize"]

receipts = db["receipts"]
transactions = db["transactions"]