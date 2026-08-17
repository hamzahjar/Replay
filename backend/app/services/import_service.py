from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models.import_job import ImportJob
from app.repositories.import_job_repository import ImportJobRepository
from app.services.ai_service import AIService
from app.services.conversation_service import ConversationService
from app.services.message_service import MessageService
from app.providers.chatgpt.parser import ChatGPTProvider


class ImportService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = ImportJobRepository(db)
        self.conversation_service = ConversationService(db)
        self.message_service = MessageService(db)
        self.ai_service = AIService()

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
        import_job.status = "completed"
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
        import_job.error_message = error_message
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

        provider = ChatGPTProvider()
        conversations = provider.parse_conversations(data)

        import_job.total_conversations = len(conversations)
        self.repository.update_import_job(import_job)

        processed_conversations = 0
        failed_conversations = 0

        for conversation_data in conversations:
            try:
                existing_conversation = (
                    self.conversation_service.get_by_provider_identity(
                        user_id=user_id,
                        provider=conversation_data["provider"],
                        provider_conversation_id=(
                            conversation_data[
                                "provider_conversation_id"
                            ]
                        ),
                    )
                )

                conversation = (
                    self.conversation_service.create_conversation(
                        user_id=user_id,
                        conversation_data=self._build_conversation_create(
                            conversation_data
                        ),
                    )
                )

                if existing_conversation is not None:
                    self.message_service.delete_conversation_messages(
                        conversation.id
                    )

                for message_data in conversation_data["messages"]:
                    self.message_service.create_message(
                        conversation_id=conversation.id,
                        message_data=self._build_message_create(
                            message_data
                        ),
                    )

                metadata = (
                    self.ai_service.generate_conversation_metadata(
                        conversation_data["messages"]
                    )
                )

                self.conversation_service.update_conversation(
                    conversation=conversation,
                    title=metadata.title,
                    short_description=metadata.short_description,
                    long_description=metadata.long_description,
                )

                processed_conversations += 1

            except Exception:
                self.db.rollback()
                failed_conversations += 1

            import_job.processed_conversations = processed_conversations
            import_job.failed_conversations = failed_conversations
            self.repository.update_import_job(import_job)

        if failed_conversations == 0:
            return self.complete_import(
                import_job=import_job,
                total_conversations=len(conversations),
                processed_conversations=processed_conversations,
                failed_conversations=failed_conversations,
            )

        import_job.status = "completed_with_errors"
        import_job.completed_at = datetime.now(timezone.utc)

        return self.repository.update_import_job(import_job)

    def _build_conversation_create(
        self,
        conversation_data: dict,
    ):
        from app.schemas.conversation import ConversationCreate

        return ConversationCreate(
            provider=conversation_data["provider"],
            provider_conversation_id=(
                conversation_data["provider_conversation_id"]
            ),
            title=conversation_data["title"],
            source="export",
        )

    def _build_message_create(
        self,
        message_data: dict,
    ):
        from app.schemas.message import MessageCreate

        return MessageCreate(
            role=message_data["role"],
            content=message_data["content"],
            sequence_number=message_data["sequence_number"],
            created_at=message_data["created_at"],
        )