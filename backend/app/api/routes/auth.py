from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import hashlib
from typing import List
from app.database.session import get_db
from app.models.entities import User, UserRole
from app.schemas.schemas import (
    LoginRequest, RegisterRequest, SetupAdminRequest,
    SetupStatusResponse, TokenResponse, UserResponse
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

@router.get("/setup-status", response_model=SetupStatusResponse)
def get_setup_status(db: Session = Depends(get_db)):
    """Checks whether the system has registered users or requires first-time admin setup."""
    count = db.query(User).count()
    return SetupStatusResponse(
        is_setup_required=(count == 0),
        user_count=count
    )

@router.post("/setup-admin", response_model=TokenResponse)
def setup_initial_admin(payload: SetupAdminRequest, db: Session = Depends(get_db)):
    """First-time secure administrator setup flow when no users exist."""
    existing_count = db.query(User).count()
    if existing_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="System initialization already completed. Please log in or contact an existing administrator."
        )

    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

    admin_user = User(
        email=payload.email.strip().lower(),
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name.strip(),
        role=UserRole.ADMIN.value,
        is_active=True
    )
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)

    user_resp = UserResponse(
        id=admin_user.id,
        email=admin_user.email,
        full_name=admin_user.full_name,
        role=admin_user.role,
        is_active=admin_user.is_active
    )
    return TokenResponse(
        access_token=f"hydroguard-auth-token-{admin_user.id}-{admin_user.role}",
        token_type="bearer",
        user=user_resp
    )

@router.post("/register", response_model=TokenResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """Genuine user registration flow."""
    clean_email = payload.email.strip().lower()
    existing = db.query(User).filter(User.email == clean_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An account with email '{clean_email}' already exists."
        )

    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

    valid_roles = [UserRole.OPERATOR.value, UserRole.TECHNICIAN.value, UserRole.ADMIN.value]
    user_role = payload.role if payload.role in valid_roles else UserRole.OPERATOR.value

    new_user = User(
        email=clean_email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name.strip(),
        role=user_role,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    user_resp = UserResponse(
        id=new_user.id,
        email=new_user.email,
        full_name=new_user.full_name,
        role=new_user.role,
        is_active=new_user.is_active
    )
    return TokenResponse(
        access_token=f"hydroguard-auth-token-{new_user.id}-{new_user.role}",
        token_type="bearer",
        user=user_resp
    )

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Strict authentication against registered database accounts."""
    clean_email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()
    hashed = hash_password(payload.password)

    if not user or user.hashed_password != hashed:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid industrial credentials. Please verify your email and password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated by the system administrator."
        )

    user_resp = UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active
    )
    return TokenResponse(
        access_token=f"hydroguard-auth-token-{user.id}-{user.role}",
        token_type="bearer",
        user=user_resp
    )

@router.get("/users", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db)):
    """List registered users (excludes passwords)."""
    return db.query(User).all()
