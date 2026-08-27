import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.import_job import ImportJob
from app.repositories.import_job_repository import ImportJobRepository
from app.schemas.conversation import ConversationCreate
from app.schemas.message import MessageCreate
from app.services.ai_service import AIService
from app.services.conversation_service import ConversationService
from app.services.message_service import MessageService
from app.providers.chatgpt.parser import ChatGPTProvider


logger = logging.getLogger(__name__)


class ImportService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = ImportJobRepository(db)
        self.conversation_service = ConversationService(db)
        self.message_service = MessageService(db)
        self.settings = get_settings()
        self._ai_service: AIService | None = None

    @property
    def ai_service(self) -> AIService:
        if self._ai_service is None:
            self._ai_service = AIService()

        return self._ai_service

    def create_import_job(
        self,
        user_id: int,
        provider: str,
        source: str,
        filename: str | None = None,
    ) -> ImportJob:
        import_job = ImportJob(
            user_id=user_id,
            provider=provider,
            source=source,
            status="pending",
            filename=filename,
            total_conversations=0,
            processed_conversations=0,
            failed_conversations=0,
            error_message=None,
            started_at=None,
            completed_at=None,
            created_at=datetime.now(timezone.utc),
        )

        return self.repository.create_import_job(import_job)

    def start_import(
        self,
        import_job: ImportJob,
    ) -> ImportJob:
        import_job.status = "processing"
        import_job.started_at = datetime.now(timezone.utc)

        return self.repository.update_import_job(import_job)

    def complete_import(
        self,
        import_job: ImportJob,
        total_conversations: int,
        processed_conversations: int,
        failed_conversations: int,
    ) -> ImportJob:
        import_job.status = (
            "completed"
            if failed_conversations == 0
            else "completed_with_errors"
        )
        import_job.total_conversations = total_conversations
        import_job.processed_conversations = processed_conversations
        import_job.failed_conversations = failed_conversations
        import_job.completed_at = datetime.now(timezone.utc)

        return self.repository.update_import_job(import_job)

    def fail_import(
        self,
        import_job: ImportJob,
        error_message: str,
    ) -> ImportJob:
        import_job.status = "failed"
        import_job.error_message = error_message[:2000]
        import_job.completed_at = datetime.now(timezone.utc)

        return self.repository.update_import_job(import_job)

    def get_import_job(
        self,
        import_job_id: int,
        user_id: int,
    ) -> ImportJob:
        import_job = self.repository.get_import_job_by_id(
            import_job_id
        )

        if import_job is None or import_job.user_id != user_id:
            raise ValueError("Import job not found.")

        return import_job

    def process_chatgpt_export(
        self,
        import_job: ImportJob,
        user_id: int,
        data: Any,
    ) -> ImportJob:
        self.start_import(import_job)

        try:
            provider = ChatGPTProvider()
            conversations = provider.parse_conversations(data)
        except ValueError as error:
            return self.fail_import(import_job, str(error))
        except Exception:
            return self.fail_import(
                import_job,
                "The export file could not be parsed.",
            )

        import_job.total_conversations = len(conversations)
        self.repository.update_import_job(import_job)

        processed_conversations = 0
        failed_conversations = 0

        for index, conversation_data in enumerate(conversations):
            try:
                self._import_single_conversation(
                    user_id=user_id,
                    conversation_data=conversation_data,
                )

                self.db.commit()
                processed_conversations += 1
            except Exception as error:
                self.db.rollback()
                failed_conversations += 1
                logger.warning(
                    "Failed to import conversation %s: %s: %s",
                    conversation_data.get("provider_conversation_id"),
                    type(error).__name__,
                    error,
                )

            if self._should_report_progress(index, len(conversations)):
                import_job.processed_conversations = (
                    processed_conversations
                )
                import_job.failed_conversations = (
                    failed_conversations
                )
                self.repository.update_import_job(import_job)

        return self.complete_import(
            import_job=import_job,
            total_conversations=len(conversations),
            processed_conversations=processed_conversations,
            failed_conversations=failed_conversations,
        )

    def _should_report_progress(
        self,
        index: int,
        total: int,
    ) -> bool:
        if index == total - 1:
            return True

        return index % 10 == 0

    def _import_single_conversation(
        self,
        user_id: int,
        conversation_data: dict,
    ) -> None:
        messages_data = conversation_data["messages"]

        conversation = (
            self.conversation_service.create_conversation(
                user_id=user_id,
                conversation_data=self._build_conversation_create(
                    conversation_data
                ),
                commit=False,
            )
        )

        self.message_service.delete_conversation_messages(
            conversation.id,
            commit=False,
        )

        self.message_service.create_messages(
            conversation_id=conversation.id,
            messages_data=[
                self._build_message_create(message_data)
                for message_data in messages_data
            ],
            commit=False,
        )

        if self.settings.import_generate_metadata:
            self._apply_ai_metadata(
                conversation=conversation,
                messages_data=messages_data,
            )

        if conversation_data.get("created_at") is not None:
            conversation.created_at = conversation_data["created_at"]

        if conversation_data.get("updated_at") is not None:
            conversation.updated_at = conversation_data["updated_at"]

    def _apply_ai_metadata(
        self,
        conversation,
        messages_data: list[dict],
    ) -> None:
        try:
            metadata = (
                self.ai_service.generate_conversation_metadata(
                    [
                        {
                            "role": message["role"],
                            "content": message["content"],
                        }
                        for message in messages_data
                    ]
                )
            )
        except Exception as error:
            logger.warning(
                "AI metadata generation failed for conversation %s: %s: %s",
                conversation.provider_conversation_id,
                type(error).__name__,
                error,
            )
            return

        conversation.title = metadata.title
        conversation.short_description = (
            metadata.short_description
        )
        conversation.long_description = (
            metadata.long_description
        )

    def _build_conversation_create(
        self,
        conversation_data: dict,
    ) -> ConversationCreate:
        return ConversationCreate(
            provider=conversation_data["provider"],
            provider_conversation_id=(
                conversation_data["provider_conversation_id"]
            ),
            title=conversation_data["title"][:500],
            original_url=conversation_data.get("original_url"),
            source="export",
        )

    def _build_message_create(
        self,
        message_data: dict,
    ) -> MessageCreate:
        return MessageCreate(
            role=message_data["role"],
            content=message_data["content"],
            sequence_number=message_data["sequence_number"],
            created_at=message_data["created_at"],
        )
