from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.conversation import Conversation
from app.repositories.conversation_repository import ConversationRepository
from app.schemas.conversation import ConversationCreate


class ConversationService:
    def __init__(self, db: Session):
        self.repository = ConversationRepository(db)

    def create_conversation(
        self,
        user_id: int,
        conversation_data: ConversationCreate,
    ) -> Conversation:
        existing_conversation = (
            self.repository.get_by_provider_identity(
                user_id=user_id,
                provider=conversation_data.provider,
                provider_conversation_id=(
                    conversation_data.provider_conversation_id
                ),
            )
        )

        if existing_conversation is not None:
            return self.update_conversation(
                conversation=existing_conversation,
                title=conversation_data.title,
                short_description=conversation_data.short_description,
                long_description=conversation_data.long_description,
                original_url=conversation_data.original_url,
                source=conversation_data.source,
            )

        now = datetime.now(timezone.utc)

        conversation = Conversation(
            user_id=user_id,
            provider=conversation_data.provider,
            provider_conversation_id=(
                conversation_data.provider_conversation_id
            ),
            title=conversation_data.title,
            short_description=conversation_data.short_description,
            long_description=conversation_data.long_description,
            original_url=conversation_data.original_url,
            source=conversation_data.source,
            created_at=now,
            updated_at=now,
        )

        return self.repository.create_conversation(conversation)

    def get_by_provider_identity(
        self,
        user_id: int,
        provider: str,
        provider_conversation_id: str,
    ) -> Conversation | None:
        return self.repository.get_by_provider_identity(
            user_id=user_id,
            provider=provider,
            provider_conversation_id=provider_conversation_id,
        )

    def get_conversation(
        self,
        conversation_id: int,
        user_id: int,
    ) -> Conversation:
        conversation = self.repository.get_conversation_by_id(
            conversation_id
        )

        if conversation is None or conversation.user_id != user_id:
            raise ValueError("Conversation not found.")

        return conversation

    def get_user_conversations(
        self,
        user_id: int,
    ) -> list[Conversation]:
        return self.repository.get_user_conversations(user_id)

    def update_conversation(
        self,
        conversation: Conversation,
        title: str | None = None,
        short_description: str | None = None,
        long_description: str | None = None,
        original_url: str | None = None,
        source: str | None = None,
    ) -> Conversation:
        if title is not None:
            conversation.title = title

        if short_description is not None:
            conversation.short_description = short_description

        if long_description is not None:
            conversation.long_description = long_description

        if original_url is not None:
            conversation.original_url = original_url

        if source is not None:
            conversation.source = source

        conversation.updated_at = datetime.now(timezone.utc)

        return self.repository.update_conversation(conversation)

    def delete_conversation(
        self,
        conversation_id: int,
        user_id: int,
    ) -> None:
        conversation = self.repository.get_conversation_by_id(
            conversation_id
        )

        if conversation is None or conversation.user_id != user_id:
            raise ValueError("Conversation not found.")

        self.repository.delete_conversation(conversation)