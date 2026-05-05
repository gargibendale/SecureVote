from deepface import DeepFace
import numpy as np
from fastapi import UploadFile, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from fastapi import Request
import tempfile
from loguru import logger
import hashlib
from db import get_db
import os
import cv2
from dotenv import load_dotenv
from cryptography.fernet import Fernet
from numpy.linalg import norm
from pwdlib import PasswordHash
from models import User
from datetime import datetime, timedelta, timezone
import jwt
from jose import JWTError
from bson import ObjectId
from bson.errors import InvalidId
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.backends import default_backend
from motor.motor_asyncio import AsyncIOMotorDatabase
import hashlib
import base64
import json

load_dotenv()

fernet_key = os.getenv("FERNET_KEY")
fernet = Fernet(fernet_key)

password_hash = PasswordHash.recommended()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="securevote/token")


# --- Password helpers ---
def verify_password(plain_password, hashed_password):
    return password_hash.verify(plain_password, hashed_password)


async def get_user_by_email(email: str, db) -> User | None:
    user_doc = await db["users"].find_one({"email": email})
    if not user_doc:
        return None

    return User(
        user_id=user_doc["user_id"],
        name=user_doc["name"],
        dob=user_doc["dob"],
        email=user_doc["email"],
        aadhaar=user_doc["aadhaar"],
        password=user_doc["password"],
        role=user_doc["role"],
        ekyc_verified=user_doc["ekyc_verified"],
        biometric_data=user_doc["biometric_data"],
        ekyc_verified_at=user_doc["ekyc_verified_at"],
        created_at=user_doc["created_at"],
    )


async def get_user_by_uid(uid: str, db) -> User | None:
    user_doc = await db.users.find_one({"user_id": uid})
    if not user_doc:
        return None

    return User(
        user_id=user_doc["user_id"],
        name=user_doc["name"],
        dob=user_doc["dob"],
        email=user_doc["email"],
        aadhaar=user_doc["aadhaar"],
        password=user_doc["password"],
        role=user_doc["role"],
        ekyc_verified=user_doc["ekyc_verified"],
        biometric_data=user_doc["biometric_data"],
        ekyc_verified_at=user_doc["ekyc_verified_at"],
        created_at=user_doc["created_at"],
    )


# --- Auth helpers ---
async def authenticate_user(email: str, password: str, db) -> User | None:
    user = await get_user_by_email(email, db)
    if not user:
        return None
    if not verify_password(password, user.password):
        return None
    return user


def create_access_token(data: dict, expires_delta: timedelta | None):
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    to_encode.update({"iat": now})
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=4320)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, os.getenv("SECRET_KEY"), algorithm=os.getenv("ALGORITHM")
    )
    return encoded_jwt


# --- Dependency: get current user from token ---
async def get_current_user(
    token: str = Depends(oauth2_scheme), db=Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        print("Getting current user...")
        leeway = 10
        payload = jwt.decode(
            token,
            os.getenv("SECRET_KEY"),
            algorithms=[os.getenv("ALGORITHM")],
            leeway=leeway,
        )
        uid: str | None = payload.get("sub")
        if uid is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = await get_user_by_uid(uid, db)
    print("Fetched user by uid...")
    if user is None:
        print("Error fetching user !")
        raise credentials_exception
    return user


def require_role(required_role: str):

    def role_checker(current_user=Depends(get_current_user)):

        if required_role not in current_user.role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )

        return current_user

    return role_checker


def normalize(v):
    return v / np.linalg.norm(v)


# extract face embeddings
# def extract_embedding(upload_file: UploadFile):
#     with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
#         tmp.write(upload_file.file.read())
#         tmp_path = tmp.name

#     embedding = DeepFace.represent(
#         img_path=tmp_path,
#         model_name="ArcFace",
#         detector_backend="retinaface",
#         enforce_detection=True,
#         align=True,
#     )

#     logger.debug(f"Embeddings extracted for {tmp_path}")

#     return np.array(embedding[0]["embedding"])


def extract_embedding_from_bytes(file_bytes: bytes, request: Request):
    face_app = request.app.state.face_app

    np_arr = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    faces = face_app.get(img)

    if len(faces) == 0:
        raise ValueError("No face detected")

    face = max(faces, key=lambda x: x.det_score)

    return face.embedding.astype(np.float32)


def encrypt_embeddings(embedding: np.ndarray) -> bytes:
    """
    Encrypts embedding (stored as float16)
    """
    embedding_fp16 = embedding.astype(np.float16)
    embedding_bytes = embedding_fp16.tobytes()

    encrypted = fernet.encrypt(embedding_bytes)

    return encrypted


# decrypt face embeddings
def decrypt_embeddings(encrypted_embedding: bytes, shape: tuple) -> np.ndarray:
    decrypted_bytes = fernet.decrypt(encrypted_embedding)

    embedding = np.frombuffer(decrypted_bytes, dtype=np.float16)
    embedding = embedding.reshape(shape)

    return embedding.astype(np.float32)


# verify person's aadhaar against database
async def verify_aadhaar(
    name: str, dob: str, aadhaar: str, upload_file: UploadFile
) -> bool:
    logger.debug("[DEBUG] Verifying Aadhaar...")
    logger.debug(f"[DEBUG] Input -> Name: {name}, DOB: {dob}, Aadhaar: {aadhaar}")

    db = get_db()
    aadhaar_registry = db["aadhaar_registry"]

    record = await aadhaar_registry.find_one(
        {"aadhaar": aadhaar, "name": name, "dob": dob}
    )

    if record:
        logger.debug("[DEBUG] Aadhaar verification SUCCESS")
        return True

    logger.debug("[DEBUG] Aadhaar verification FAILED")
    return False


# helper function to hash aadhaat
def hash_aadhaar(aadhaar: str) -> str:
    return hashlib.sha256(aadhaar.encode()).hexdigest()


def generate_ed25519_keypair():
    private_key = ed25519.Ed25519PrivateKey.generate()
    public_key = private_key.public_key()

    private_bytes = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )

    public_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.Raw, format=serialization.PublicFormat.Raw
    )

    return private_bytes.decode(), public_bytes


def hash_public_key(pubkey_bytes: bytes) -> str:
    return hashlib.sha256(pubkey_bytes).hexdigest()


def load_public_key(pubkey_b64: str):
    pubkey_bytes = base64.b64decode(pubkey_b64)
    return ed25519.Ed25519PublicKey.from_public_bytes(pubkey_bytes)


def verify_signature(public_key, message: bytes, signature_b64: str) -> bool:
    try:
        signature = base64.b64decode(signature_b64)
        public_key.verify(signature, message)
        return True
    except Exception:
        return False


def build_vote_message(payload: dict) -> bytes:
    ordered = {
        "election_id": payload["election_id"],
        "candidate_id": payload["candidate_id"],
        "nonce": payload["nonce"],
        "timestamp": payload["timestamp"],
    }
    result = json.dumps(ordered, separators=(",", ":"), sort_keys=True).encode()
    print("Message being verified:", result)  # 👈 add this
    return result


# calculates face embeddings similarity for face authentication
def cosine_similarity(emb1: np.ndarray, emb2: np.ndarray) -> float:
    return np.dot(emb1, emb2) / (norm(emb1) * norm(emb2))


async def get_next_id(db: AsyncIOMotorDatabase, counter_name: str) -> int:
    result = await db["counters"].find_one_and_update(
        {"_id": counter_name},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    return result["seq"]
