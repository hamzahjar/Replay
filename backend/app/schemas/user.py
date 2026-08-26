from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    display_name: str
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    display_name: str
    email: EmailStr
    created_at: datetime
    updated_at: datetime


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str