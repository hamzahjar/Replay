from datetime import datetime

from pydantic import BaseModel


class ImportJobResponse(BaseModel):
    id: int
    user_id: int
    provider: str
    source: str
    status: str
    filename: str | None
    total_conversations: int
    processed_conversations: int
    failed_conversations: int
    error_message: str | None
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime