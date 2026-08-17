from pydantic import BaseModel, Field


class ConversationMetadata(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    short_description: str = Field(min_length=1, max_length=300)
    long_description: str = Field(min_length=1, max_length=2000)