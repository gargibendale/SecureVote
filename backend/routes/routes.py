from fastapi import (
    APIRouter,
    HTTPException,
    UploadFile,
    File,
    Form,
    Depends,
    status,
    Request,
)
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import Response
from db import get_db
import asyncio
from loguru import logger
import uuid
from datetime import datetime, timedelta
from pwdlib import PasswordHash
from bson import ObjectId
from models import LoginResponse, UserPublic, UserRole, User, UserSignup
import base64, hashlib
from utils import (
    get_current_user,
    hash_aadhaar,
    extract_embedding_from_bytes,
    encrypt_embeddings,
    decrypt_embeddings,
    cosine_similarity,
    create_access_token,
    authenticate_user,
    generate_ed25519_keypair,
    hash_public_key,
    normalize,
)

router = APIRouter()
password_hash = PasswordHash.recommended()


## user sign up
@router.post("/signup")
async def create_user(user: UserSignup):
    logger.debug("[DEBUG] Signup request received")
    logger.debug(f"[DEBUG] Payload: {user}")

    db = get_db()
    users_collection = db["users"]

    hashed_pw = password_hash.hash(user.password)
    hashed_aadhaar = hash_aadhaar(user.aadhaar)

    existing_user = await users_collection.find_one(
        {"$or": [{"email": user.email}, {"aadhaar": user.aadhaar}]}
    )

    if existing_user:
        raise HTTPException(status_code=409, detail="User already registered")

    user_id = str(uuid.uuid4())

    user_doc = {
        "user_id": user_id,
        "name": user.name,
        "dob": user.dob,
        "email": user.email,
        "aadhaar": hashed_aadhaar,
        "password": hashed_pw,
        "role": [UserRole.USER],
        "ekyc_verified": False,
        "biometric_data": False,
        "ekyc_verified_at": None,
        "created_at": datetime.now(),
    }

    await users_collection.insert_one(user_doc)

    return {
        "message": "User registered successfully",
        "user_id": user_id,
    }


SIMILARITY_THRESHOLD = 0.60


## this verifies aadhaar of the person
@router.post("/verify_aadhaar")
async def verify_identity(
    request: Request,
    user_id: str = Form(...),
    name: str = Form(...),
    dob: str = Form(...),
    aadhaar: str = Form(...),
    image: UploadFile = File(...),
):
    logger.debug("[DEBUG] Verifying Aadhaar...")

    db = get_db()
    aadhaar_registry = db["aadhaar_registry"]
    users = db["users"]

    # 1. Aadhaar lookup
    hashed_aadhaar = hash_aadhaar(aadhaar)
    record = await aadhaar_registry.find_one(
        {"aadhaar": hashed_aadhaar, "name": name, "dob": dob}
    )

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aadhaar details not found or do not match",
        )

    # 2. Face verification
    stored_front = record["front"]
    stored_front_emb = decrypt_embeddings(
        stored_front["data"],
        tuple(stored_front["shape"]),
    )

    front_bytes = await image.read()
    live_front_emb = extract_embedding_from_bytes(front_bytes, request)
    front_score = cosine_similarity(stored_front_emb, live_front_emb)

    if front_score < SIMILARITY_THRESHOLD:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Face verification failed",
        )

    # 3. Update user KYC status
    update_result = await users.update_one(
        {"user_id": user_id},
        {"$set": {"ekyc_verified": True, "ekyc_verified_at": datetime.now()}},
    )

    if update_result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    return {
        "success": True,
        "message": "eKYC verification successful",
        "face_similarity": round(float(front_score), 4),
    }


## this collects facial data of the user
@router.post("/collect_biometric")
async def collect_face_data(
    request: Request,
    user_id: str = Form(...),
    front: UploadFile = File(...),
    side_left: UploadFile = File(...),
    side_right: UploadFile = File(...),
):
    db = get_db()
    users_collection = db["users"]
    embeddings_collection = db["face_embeddings"]
    if await embeddings_collection.find_one({"user_id": user_id}):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Biometric data already enrolled",
        )

    aadhaar_registry = db["aadhaar_registry"]

    # 1. Fetch user
    user = await users_collection.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # 2. Enforce eKYC
    if not user.get("ekyc_verified", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="eKYC verification required before biometric collection",
        )
    user_aadhaar = user["aadhaar"]
    # 3. Fetch Aadhaar registry record (trusted source)
    aadhaar_record = await aadhaar_registry.find_one(
        {
            "aadhaar": user_aadhaar,
        }
    )

    if not aadhaar_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Aadhaar reference record not found",
        )

    # 4. Compare live face with Aadhaar face
    stored_front = aadhaar_record["front"]
    stored_front_emb = decrypt_embeddings(
        stored_front["data"],
        tuple(stored_front["shape"]),
    )
    front_bytes = await front.read()
    left_bytes = await side_left.read()
    right_bytes = await side_right.read()
    live_front_emb, left_emb, right_emb = await asyncio.gather(
        asyncio.to_thread(extract_embedding_from_bytes, front_bytes, request),
        asyncio.to_thread(extract_embedding_from_bytes, left_bytes, request),
        asyncio.to_thread(extract_embedding_from_bytes, right_bytes, request),
    )
    front_score = cosine_similarity(stored_front_emb, live_front_emb)

    if front_score < SIMILARITY_THRESHOLD:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Face mismatch during biometric enrollment",
        )

    # 5. Extract & store biometric embeddings
    front_emb = normalize(live_front_emb)
    left_emb = normalize(left_emb)
    right_emb = normalize(right_emb)

    # Weighted mean (production-grade)
    final_embedding = 0.5 * front_emb + 0.25 * left_emb + 0.25 * right_emb

    final_embedding = normalize(final_embedding)
    # Encrypt ONLY ONE embedding
    encrypted_embedding = encrypt_embeddings(final_embedding)
    embeddings_doc = {
        "user_id": user_id,
        "model": "InsightFace_buffalo_l",
        "embeddings": {
            "data": encrypted_embedding,
            "shape": [512],
            "dtype": "float16",
        },
        "created_at": datetime.now(),
    }

    await embeddings_collection.insert_one(embeddings_doc)

    # 6. Mark biometric collected
    await users_collection.update_one(
        {"user_id": user_id}, {"$set": {"biometric_data": True}}
    )

    return {
        "success": True,
        "message": "Biometric data collected successfully",
        "face_similarity": round(float(front_score), 4),
    }


## this issues a pair of public and private keys which will be used to sign the vote
@router.post("/issue_creds")
async def issue_voting_credentials(
    current_user=Depends(get_current_user), db=Depends(get_db)
):
    if not current_user.ekyc_verified:
        raise HTTPException(status_code=403, detail="eKYC not verified")

    existing = await db.voter_registry.find_one({"user_id": current_user.user_id})
    if existing:
        raise HTTPException(status_code=400, detail="Voting credentials already issued")

    private_key_pem, public_key_bytes = generate_ed25519_keypair()
    pubkey_hash = hash_public_key(public_key_bytes)

    await db.voter_registry.insert_one(
        {
            "user_id": current_user.user_id,
            "pubkey_hash": pubkey_hash,
            "public_key": base64.b64encode(public_key_bytes).decode(),
            "issued_at": datetime.now(),
            "revoked": False,
        }
    )

    # Return as a downloadable .pem file directly from the API
    return Response(
        content=private_key_pem,
        media_type="application/x-pem-file",
        headers={"Content-Disposition": 'attachment; filename="voter_private_key.pem"'},
    )


## verify face against existing embeddings -> to be used before casting vote
@router.post("/verify_face")
async def verify_face(
    request: Request,
    user_id: str = Form(...),
    front_image: UploadFile = File(...),
    side_left_image: UploadFile = File(...),
    side_right_image: UploadFile = File(...),
):
    try:
        db = get_db()
        embeddings_collection = db["face_embeddings"]

        # 1. Fetch stored embeddings
        embeddings_doc = await embeddings_collection.find_one({"user_id": user_id})

        if not embeddings_doc:
            raise HTTPException(status_code=404, detail="Face embeddings not found")

        # 1. Decrypt SINGLE embedding
        stored = embeddings_doc["embeddings"]

        stored_emb = decrypt_embeddings(
            stored["data"],
            tuple(stored["shape"]),
        )
        stored_emb = normalize(stored_emb)

        front_bytes = await front_image.read()
        left_bytes = await side_left_image.read()
        right_bytes = await side_right_image.read()
        front_emb, left_emb, right_emb = await asyncio.gather(
            asyncio.to_thread(extract_embedding_from_bytes, front_bytes, request),
            asyncio.to_thread(extract_embedding_from_bytes, left_bytes, request),
            asyncio.to_thread(extract_embedding_from_bytes, right_bytes, request),
        )
        # 2. Extract live embeddings
        front_emb = normalize(front_emb)
        left_emb = normalize(left_emb)
        right_emb = normalize(right_emb)

        # 3. Aggregate live embedding
        live_emb = 0.5 * front_emb + 0.25 * left_emb + 0.25 * right_emb
        live_emb = normalize(live_emb)

        # 4. Single similarity
        score = cosine_similarity(stored_emb, live_emb)
        verified = score >= SIMILARITY_THRESHOLD

        return {
            "user_id": user_id,
            "verified": bool(verified),
            "score": float(round(score, 4)),
            "threshold": float(SIMILARITY_THRESHOLD),
            "timestamp": datetime.now().isoformat(),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


## endpoint for login
@router.post("/token", response_model=LoginResponse)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db=Depends(get_db),
):
    # OAuth2PasswordRequestForm uses 'username' field - we'll send email as username from frontend
    user = await authenticate_user(form_data.username, form_data.password, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=4320)
    access_token = create_access_token(
        data={"sub": user.user_id, "roles": user.role},
        expires_delta=access_token_expires,
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserPublic(
            user_id=user.user_id,
            name=user.name,
            email=user.email,
            dob=user.dob,
            role=user.role,
            ekyc_verified=user.ekyc_verified,
            biometric_data=user.biometric_data,
        ),
    }


@router.get("/me", response_model=UserPublic)
def get_me(current_user: User = Depends(get_current_user)):
    return UserPublic(
        user_id=current_user.user_id,
        name=current_user.name,
        email=current_user.email,
        dob=current_user.dob,
        role=current_user.role,
        ekyc_verified=current_user.ekyc_verified,
        biometric_data=current_user.biometric_data,
    )
