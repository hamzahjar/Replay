from fastapi import Cookie, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import AUTH_COOKIE_NAME, decode_access_token
from app.database.session import get_db
from app.models.user import User
from app.repositories.user_repository import UserRepository


def get_current_user(
    access_token: str | None = Cookie(
        default=None,
        alias=AUTH_COOKIE_NAME,
    ),
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    token: str | None = access_token

    if authorization:
        scheme, _, value = authorization.partition(" ")

        if scheme.lower() == "bearer" and value.strip():
            token = value.strip()

    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
        )

    try:
        user_id = decode_access_token(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
        ) from None

    repository = UserRepository(db)
    user = repository.get_user_by_id(int(user_id))

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists.",
        )

    return user
