from datetime import datetime

from pydantic import BaseModel


class MessageCreate(BaseModel):
    role: str
    content: str
    sequence_number: int
    created_at: datetime | None = None


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    role: str
    content: str
    sequence_number: int
    created_at: datetime | None