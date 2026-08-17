from sqlalchemy.orm import Session

from app.models.message import Message
from app.repositories.message_repository import MessageRepository
from app.schemas.message import MessageCreate


class MessageService:
    def __init__(self, db: Session):
        self.repository = MessageRepository(db)

    def create_message(
        self,
        conversation_id: int,
        message_data: MessageCreate,
    ) -> Message:
        message = Message(
            conversation_id=conversation_id,
            role=message_data.role,
            content=message_data.content,
            sequence_number=message_data.sequence_number,
            created_at=message_data.created_at,
        )

        return self.repository.create_message(message)

    def get_conversation_messages(
        self,
        conversation_id: int,
    ) -> list[Message]:
        return self.repository.get_conversation_messages(
            conversation_id
        )

    def delete_message(
        self,
        message_id: int,
    ) -> None:
        message = self.repository.get_message_by_id(message_id)

        if message is None:
            raise ValueError("Message not found.")

        self.repository.delete_message(message)

    def delete_conversation_messages(
        self,
        conversation_id: int,
    ) -> None:
        self.repository.delete_conversation_messages(
            conversation_id
        )