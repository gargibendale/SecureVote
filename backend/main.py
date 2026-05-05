from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from insightface.app import FaceAnalysis
from contextlib import asynccontextmanager
from loguru import logger
from routes.routes import router as app_router
from routes.elections import router as elections_router
from blockchain.contract import get_web3_and_contract
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from dotenv import load_dotenv
from db import connect_db
import os

load_dotenv()

logger.add("logs/app.log", rotation="10 MB", retention="10 days", level="DEBUG")

uri = os.getenv("MONGO_URI")

# Create a new client and connect to the server
client = MongoClient(uri, server_api=ServerApi("1"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    connect_db()
    contract_address = os.environ.get("CONTRACT_ADDRESS")
    if not contract_address:
        raise ValueError("CONTRACT_ADDRESS environment variable not set")
    w3, contract = get_web3_and_contract(contract_address)
    # Store on app.state — accessible anywhere via request.app.state
    app.state.w3 = w3
    app.state.contract = contract

    face_app = FaceAnalysis(
        name="buffalo_l",
        providers=["CPUExecutionProvider"],  # or CUDAExecutionProvider
    )
    face_app.prepare(ctx_id=0, det_size=(640, 640))

    app.state.face_app = face_app  # store globally

    print("✅ InsightFace model loaded")

    print(f"✅ Connected to Hardhat node. Contract loaded at {contract_address}")
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(app_router, tags=["securevote"], prefix="/securevote")
app.include_router(elections_router, tags=["elections"], prefix="/elections")
