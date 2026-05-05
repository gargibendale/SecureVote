from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from motor.motor_asyncio import AsyncIOMotorClient  # changed
from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")

client = AsyncIOMotorClient(MONGO_URI, server_api=ServerApi("1"))  # changed


async def connect_db():  # call at app startup
    try:
        await client.admin.command("ping")
        print("Connected to MongoDB Atlas !")
    except Exception as e:
        print("MongoDB connection failed:", e)


def get_db():
    return client["voting-system"]  # name your DB
