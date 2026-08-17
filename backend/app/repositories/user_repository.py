from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_user_by_email(self, email: str) -> User | None:
        statement = select(User).where(User.email == email)

        return self.db.scalars(statement).first()

    def create_user(self, user: User) -> User:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        return user

    def get_user_by_id(self, user_id: int) -> User | None:
        return self.db.get(User, user_id)

    def delete_user(self, user: User) -> None:
        self.db.delete(user)
        self.db.commit()

        