from pymongo import MongoClient
from dotenv import load_dotenv
import numpy as np
import cv2
import hashlib
import os

from insightface.app import FaceAnalysis
from utils import encrypt_embeddings  # your updated version

load_dotenv()

client = MongoClient(os.getenv("MONGO_URI"))
db = client["voting-system"]
collection = db["aadhaar_registry"]


# -------------------------------
# Hash Aadhaar
# -------------------------------
def hash_aadhaar(aadhaar: str) -> str:
    return hashlib.sha256(aadhaar.encode()).hexdigest()


# -------------------------------
# Load InsightFace model ONCE
# -------------------------------
face_app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
face_app.prepare(ctx_id=0, det_size=(640, 640))


# -------------------------------
# Extract embedding (InsightFace)
# -------------------------------
def extract_embedding(img_path: str):
    img = cv2.imread(img_path)

    if img is None:
        raise ValueError(f"Image not found: {img_path}")

    faces = face_app.get(img)

    if len(faces) == 0:
        raise ValueError("No face detected")

    face = max(faces, key=lambda x: x.det_score)

    embedding = face.embedding.astype(np.float32)

    # normalize (IMPORTANT — match runtime)
    embedding = embedding / np.linalg.norm(embedding)

    return embedding


# -------------------------------
# Input image
# -------------------------------
img_path = r"C:\1-voting-system\backend\images\gargitwo.jpg"


# -------------------------------
# Generate embedding
# -------------------------------
front_embedding = extract_embedding(img_path)

# # normalize BEFORE encryption (not needed RN)
# front_embedding = front_embedding / np.linalg.norm(front_embedding)

# Encrypt (this now stores float16 internally)
encrypted_front_embedding = encrypt_embeddings(front_embedding)


# -------------------------------
# Insert mock record
# -------------------------------
mock_records = [
    {
        "aadhaar": hash_aadhaar("733617254441"),
        "name": "Gargi R Bendale",
        "dob": "2004-07-20",
        "gender": "F",
        "phone": "9999999999",
        "status": "ACTIVE",
        "front": {
            "data": encrypted_front_embedding,
            "shape": [512],
            "dtype": "float16",  # ✅ FIXED
            "model": "InsightFace_buffalo_l",  # ✅ ADD THIS
        },
    }
]

collection.insert_many(mock_records)
print("✅ Mock Aadhaar data inserted!")
