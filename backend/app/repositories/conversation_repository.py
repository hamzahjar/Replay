from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.conversation import Conversation


class ConversationRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_conversation(
        self,
        conversation: Conversation,
    ) -> Conversation:
        self.db.add(conversation)
        self.db.commit()
        self.db.refresh(conversation)

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
    ) -> list[Conversation]:
        statement = select(Conversation).where(
            Conversation.user_id == user_id
        )

        return list(self.db.scalars(statement).all())

    def update_conversation(
        self,
        conversation: Conversation,
    ) -> Conversation:
        self.db.commit()
        self.db.refresh(conversation)

        return conversation

    def delete_conversation(
        self,
        conversation: Conversation,
    ) -> None:
        self.db.delete(conversation)
        self.db.commit()