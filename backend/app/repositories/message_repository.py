from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.message import Message


class MessageRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_message(
        self,
        message: Message,
    ) -> Message:
        self.db.add(message)
        self.db.commit()
        self.db.refresh(message)

        return message

    def create_messages(
        self,
        messages: list[Message],
        commit: bool = True,
    ) -> list[Message]:
        if not messages:
            return []

        self.db.add_all(messages)

        if commit:
            self.db.commit()
        else:
            self.db.flush()

        return messages

    def get_message_by_id(
        self,
        message_id: int,
    ) -> Message | None:
        return self.db.get(Message, message_id)

    def get_conversation_messages(
        self,
        conversation_id: int,
    ) -> list[Message]:
        statement = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.sequence_number)
        )

        return list(self.db.scalars(statement).all())

    def delete_message(
        self,
        message: Message,
    ) -> None:
        self.db.delete(message)
        self.db.commit()

    def delete_conversation_messages(
        self,
        conversation_id: int,
        commit: bool = True,
    ) -> None:
        statement = delete(Message).where(
            Message.conversation_id == conversation_id
        )

        self.db.execute(statement)

        if commit:
            self.db.commit()
        else:
            self.db.flush()
