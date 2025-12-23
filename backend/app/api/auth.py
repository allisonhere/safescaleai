import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.db import get_session
from app.models.compliance import Organization, User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserRead
from app.services.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
async def register(
    payload: RegisterRequest,
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    exists = await session.execute(select(User).where(User.email == payload.email))
    if exists.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    while True:
        api_key = secrets.token_urlsafe(32)
        result = await session.execute(
            select(Organization).where(Organization.api_key == api_key)
        )
        if result.scalar_one_or_none() is None:
            break
    org = Organization(name=payload.org_name, api_key=api_key)
    session.add(org)
    await session.flush()
    hashed_password = hash_password(payload.password)
    user = User(email=payload.email, hashed_password=hashed_password, org_id=org.id)
    session.add(user)
    await session.commit()
    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    result = await session.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserRead)
async def me(user: User = Depends(get_current_user)) -> UserRead:
    return UserRead(id=user.id, org_id=user.org_id, email=user.email, created_at=user.created_at)
