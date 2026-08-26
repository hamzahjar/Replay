from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.conversation import Conversation
from app.repositories.conversation_repository import ConversationRepository
from app.schemas.conversation import ConversationCreate
from app.schemas.message import MessageCreate
from app.services.ai_service import AIService
from app.services.message_service import MessageService


class ConversationService:
    def __init__(self, db: Session):
        self.repository = ConversationRepository(db)
        self.message_service = MessageService(db)
        self._ai_service: AIService | None = None

    @property
    def ai_service(self) -> AIService:
        if self._ai_service is None:
            self._ai_service = AIService()

        return self._ai_service

    def create_conversation(
        self,
        user_id: int,
        conversation_data: ConversationCreate,
        commit: bool = True,
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
                short_description=(
                    conversation_data.short_description
                ),
                long_description=(
                    conversation_data.long_description
                ),
                original_url=conversation_data.original_url,
                source=conversation_data.source,
                commit=commit,
            )

        now = datetime.now(timezone.utc)

        conversation = Conversation(
            user_id=user_id,
            provider=conversation_data.provider,
            provider_conversation_id=(
                conversation_data.provider_conversation_id
            ),
            title=conversation_data.title,
            short_description=(
                conversation_data.short_description
            ),
            long_description=(
                conversation_data.long_description
            ),
            original_url=conversation_data.original_url,
            source=conversation_data.source,
            created_at=now,
            updated_at=now,
        )

        return self.repository.create_conversation(
            conversation,
            commit=commit,
        )

    def sync_live_conversation(
        self,
        user_id: int,
        payload,
    ) -> Conversation:
        existing_conversation = (
            self.repository.get_by_provider_identity(
                user_id=user_id,
                provider=payload.provider,
                provider_conversation_id=(
                    payload.provider_conversation_id
                ),
            )
        )

        now = datetime.now(timezone.utc)

        if existing_conversation is None:
            conversation = Conversation(
                user_id=user_id,
                provider=payload.provider,
                provider_conversation_id=(
                    payload.provider_conversation_id
                ),
                title=payload.title,
                original_url=payload.original_url,
                source="extension",
                created_at=now,
                updated_at=now,
                last_synchronized_at=now,
            )

            conversation = (
                self.repository.create_conversation(
                    conversation,
                )
            )
        else:
            conversation = existing_conversation

            conversation.title = payload.title
            conversation.original_url = payload.original_url
            conversation.updated_at = now
            conversation.last_synchronized_at = now

            conversation = (
                self.repository.update_conversation(
                    conversation,
                )
            )

            self.message_service.delete_conversation_messages(
                conversation.id,
            )

        self.message_service.create_messages(
            conversation_id=conversation.id,
            messages_data=[
                MessageCreate(
                    role=message.role,
                    content=message.content,
                    sequence_number=message.sequence_number,
                    created_at=message.created_at,
                )
                for message in payload.messages
            ],
        )

        if payload.messages:
            try:
                metadata = (
                    self.ai_service.generate_conversation_metadata(
                        [
                            {
                                "role": message.role,
                                "content": message.content,
                            }
                            for message in payload.messages
                        ]
                    )
                )

                conversation.title = metadata.title
                conversation.short_description = (
                    metadata.short_description
                )
                conversation.long_description = (
                    metadata.long_description
                )
            except Exception:
                pass

        conversation.last_synchronized_at = now
        conversation.updated_at = now

        return self.repository.update_conversation(
            conversation,
        )

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
        conversation = (
            self.repository.get_conversation_by_id(
                conversation_id,
            )
        )

        if (
            conversation is None
            or conversation.user_id != user_id
        ):
            raise ValueError(
                "Conversation not found.",
            )

        return conversation

    def get_user_conversations(
        self,
        user_id: int,
        search: str | None = None,
    ) -> list[Conversation]:
        return self.repository.get_user_conversations(
            user_id,
            search=search,
        )

    def get_stats(
        self,
        user_id: int,
    ) -> tuple[int, int, int]:
        return self.repository.get_stats(user_id)

    def set_favourite(
        self,
        conversation_id: int,
        user_id: int,
        is_favourite: bool,
    ) -> Conversation:
        conversation = self.get_conversation(
            conversation_id,
            user_id,
        )

        conversation.is_favourite = is_favourite
        conversation.updated_at = (
            datetime.now(timezone.utc)
        )

        return self.repository.update_conversation(
            conversation,
        )

    def update_conversation(
        self,
        conversation: Conversation,
        title: str | None = None,
        short_description: str | None = None,
        long_description: str | None = None,
        original_url: str | None = None,
        source: str | None = None,
        commit: bool = True,
    ) -> Conversation:
        if title is not None:
            conversation.title = title

        if short_description is not None:
            conversation.short_description = (
                short_description
            )

        if long_description is not None:
            conversation.long_description = (
                long_description
            )

        if original_url is not None:
            conversation.original_url = original_url

        if source is not None:
            conversation.source = source

        conversation.updated_at = (
            datetime.now(timezone.utc)
        )

        return self.repository.update_conversation(
            conversation,
            commit=commit,
        )

    def delete_conversation(
        self,
        conversation_id: int,
        user_id: int,
    ) -> None:
        conversation = (
            self.repository.get_conversation_by_id(
                conversation_id,
            )
        )

        if (
            conversation is None
            or conversation.user_id != user_id
        ):
            raise ValueError(
                "Conversation not found.",
            )

        self.repository.delete_conversation(
            conversation,
        )
