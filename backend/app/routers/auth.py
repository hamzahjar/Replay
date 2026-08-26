from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.security import AUTH_COOKIE_NAME, create_access_token
from app.database.session import get_db
from app.models.user import User
from app.schemas.user import LoginRequest, TokenResponse, UserCreate, UserResponse
from app.services.user_service import UserService

router = APIRouter(prefix="/auth", tags=["Authentication"])


class ExtensionAuthResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)) -> UserResponse:
    try:
        return UserService(db).create_user(
            display_name=user_data.display_name.strip(),
            email=user_data.email,
            password=user_data.password,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error


@router.post("/login", response_model=TokenResponse)
def login(
    login_data: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
) -> TokenResponse:
    try:
        access_token = UserService(db).authenticate_user(
            email=login_data.email,
            password=login_data.password,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(error),
        ) from error

    response.set_cookie(
        key=AUTH_COOKIE_NAME,
        value=access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=60 * 60,
        path="/",
    )

    return TokenResponse(
        access_token="",
        token_type="cookie",
    )


@router.post("/extension-login", response_model=ExtensionAuthResponse)
def extension_login(
    login_data: LoginRequest,
    db: Session = Depends(get_db),
) -> ExtensionAuthResponse:
    service = UserService(db)

    try:
        access_token = service.authenticate_user(
            email=login_data.email,
            password=login_data.password,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(error),
        ) from error

    user = service.get_user_by_email(login_data.email)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists.",
        )

    return ExtensionAuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            display_name=user.display_name,
            email=user.email,
            created_at=user.created_at,
            updated_at=user.updated_at,
        ),
    )


@router.post("/extension-register", response_model=ExtensionAuthResponse)
def extension_register(
    user_data: UserCreate,
    db: Session = Depends(get_db),
) -> ExtensionAuthResponse:
    service = UserService(db)

    try:
        user = service.create_user(
            display_name=user_data.display_name.strip(),
            email=user_data.email,
            password=user_data.password,
        )
        access_token = service.authenticate_user(
            email=user.email,
            password=user_data.password,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error

    return ExtensionAuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            display_name=user.display_name,
            email=user.email,
            created_at=user.created_at,
            updated_at=user.updated_at,
        ),
    )


@router.post("/extension-token", response_model=TokenResponse)
def extension_token(current_user: User = Depends(get_current_user)) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(str(current_user.id)),
        token_type="bearer",
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response) -> None:
    response.delete_cookie(
        key=AUTH_COOKIE_NAME,
        path="/",
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return current_user
