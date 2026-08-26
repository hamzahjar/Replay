from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.conversation import Conversation
from app.models.message import Message


class ConversationRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_conversation(
        self,
        conversation: Conversation,
        commit: bool = True,
    ) -> Conversation:
        self.db.add(conversation)

        if commit:
            self.db.commit()
            self.db.refresh(conversation)
        else:
            self.db.flush()

        return conversation

    def get_conversation_by_id(
        self,
        conversation_id: int,
    ) -> Conversation | None:
        return self.db.get(Conversation, conversation_id)

    def get_by_provider_identity(
        self,
        user_id: int,
        provider: str,
        provider_conversation_id: str,
    ) -> Conversation | None:
        statement = select(Conversation).where(
            Conversation.user_id == user_id,
            Conversation.provider == provider,
            Conversation.provider_conversation_id == provider_conversation_id,
        )

        return self.db.scalars(statement).first()

    def get_user_conversations(
        self,
        user_id: int,
        search: str | None = None,
    ) -> list[Conversation]:
        statement = select(Conversation).where(
            Conversation.user_id == user_id
        )

        if search:
            escaped = (
                search.replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_")
            )

            pattern = f"%{escaped}%"

            statement = statement.where(
                or_(
                    Conversation.title.ilike(pattern, escape="\\"),
                    Conversation.short_description.ilike(
                        pattern, escape="\\"
                    ),
                    Conversation.long_description.ilike(
                        pattern, escape="\\"
                    ),
                )
            )

        statement = statement.order_by(
            Conversation.updated_at.desc()
        )

        return list(self.db.scalars(statement).all())

    def get_stats(
        self,
        user_id: int,
    ) -> tuple[int, int, int]:
        conversation_count = self.db.scalar(
            select(func.count(Conversation.id)).where(
                Conversation.user_id == user_id
            )
        )

        favourite_count = self.db.scalar(
            select(func.count(Conversation.id)).where(
                Conversation.user_id == user_id,
                Conversation.is_favourite.is_(True),
            )
        )

        message_count = self.db.scalar(
            select(func.count(Message.id))
            .join(
                Conversation,
                Message.conversation_id == Conversation.id,
            )
            .where(Conversation.user_id == user_id)
        )

        return (
            conversation_count or 0,
            message_count or 0,
            favourite_count or 0,
        )

    def update_conversation(
        self,
        conversation: Conversation,
        commit: bool = True,
    ) -> Conversation:
        if commit:
            self.db.commit()
            self.db.refresh(conversation)
        else:
            self.db.flush()

        return conversation

    def delete_conversation(
        self,
        conversation: Conversation,
    ) -> None:
        self.db.delete(conversation)
        self.db.commit()
