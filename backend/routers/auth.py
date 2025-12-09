from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from typing import Optional

from schemas.user import UserCreate, UserRead, Token
from crud.user import create_user, authenticate_user, get_user_by_email, get_user_by_username
from core import security
from database import engine

router = APIRouter(prefix="", tags=["auth"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate):
    existing_username = get_user_by_username(user_in.username)
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")
    existing_email = get_user_by_email(user_in.email)
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = create_user(user_in)
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(data={"sub": user.username}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(data={"sub": user.username}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}




def _get_bearer_token(authorization: Optional[str] = Header(None)) -> Optional[str]:
    if not authorization:
        return None
    if not authorization.lower().startswith("bearer "):
        return None
    return authorization.split(" ", 1)[1]


@router.get("/verify-token")
def verify_token(token: Optional[str] = Depends(_get_bearer_token)):
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = security.decode_access_token(token)
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = get_user_by_username(username)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return {"username": user.username, "email": user.email, "id": user.id}

def get_current_user(token: str = Depends(_get_bearer_token)):
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = security.decode_access_token(token)
        username: str = payload.get("sub")

        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")

    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = get_user_by_username(username)

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user
