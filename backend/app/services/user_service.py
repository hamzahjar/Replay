from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.repositories.user_repository import UserRepository


class UserService:
    def __init__(self, db: Session):
        self.repository = UserRepository(db)

    def create_user(
        self,
        display_name: str,
        email: str,
        password: str,
    ) -> User:
        existing_user = self.repository.get_user_by_email(email)

        if existing_user is not None:
            raise ValueError("A user with this email already exists.")

        password_hash = hash_password(password)

        user = User(
            display_name=display_name,
            email=email,
            password_hash=password_hash,
        )

        return self.repository.create_user(user)

    def get_user_by_email(self, email: str) -> User | None:
        return self.repository.get_user_by_email(email)

    def authenticate_user(
        self,
        email: str,
        password: str,
    ) -> str:
        user = self.repository.get_user_by_email(email)

        if user is None:
            raise ValueError("Invalid email or password.")

        if not verify_password(password, user.password_hash):
            raise ValueError("Invalid email or password.")

        return create_access_token(str(user.id))
