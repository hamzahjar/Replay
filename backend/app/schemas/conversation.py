from datetime import datetime

from pydantic import BaseModel


class ConversationCreate(BaseModel):
    provider: str
    provider_conversation_id: str
    title: str
    short_description: str | None = None
    long_description: str | None = None
    original_url: str | None = None
    source: str


class ConversationResponse(BaseModel):
    id: int
    user_id: int
    provider: str
    provider_conversation_id: str
    title: str
    short_description: str | None
    long_description: str | None
    original_url: str | None
    source: str
    created_at: datetime
    updated_at: datetime
    last_synchronized_at: datetime | None