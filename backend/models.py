from pydantic import BaseModel, EmailStr
from pydantic import BaseModel, Field
from typing import List
import datetime
from enum import Enum


class UserSignup(BaseModel):
    name: str
    dob: str
    email: EmailStr
    aadhaar: str
    password: str


class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"


class User(BaseModel):
    user_id: str
    name: str
    dob: str
    email: EmailStr
    aadhaar: str
    password: str
    role: list
    ekyc_verified: bool
    biometric_data: bool
    ekyc_verified_at: datetime.datetime | None = None
    created_at: datetime.datetime


class UserPublic(BaseModel):
    user_id: str
    name: str
    email: EmailStr
    dob: str
    role: list[UserRole]
    ekyc_verified: bool
    biometric_data: bool


class LoginResponse(BaseModel):
    access_token: str
    token_type: str  # could be JWT (token), JWS (signature), or JWE (encryption)
    user: UserPublic


class CandidateInput(BaseModel):
    name: str = Field(..., min_length=1)
    party: str = Field(..., min_length=1)
    description: str = Field(...)


class CreateElectionRequest(BaseModel):
    title: str = Field(..., min_length=1)
    description: str = Field(...)
    start_date: datetime.datetime = Field(...)
    end_date: datetime.datetime = Field(...)
    candidates: List[CandidateInput] = Field(..., min_length=1)


class CreateElectionResponse(BaseModel):
    tx_hash: str
    election_id: int
    candidate_ids: List[int]
    message: str


class EndElectionResponse(BaseModel):
    tx_hash: str
    election_id: int
    message: str
