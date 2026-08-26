from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.ai import ConversationMetadata
from app.schemas.conversation import ConversationResponse
from app.schemas.message import MessageResponse
from app.services.ai_service import AIService
from app.services.conversation_service import ConversationService
from app.services.message_service import MessageService

router = APIRouter(
    prefix="/conversations",
    tags=["Conversations"],
)


class SyncMessage(BaseModel):
    role: str
    content: str
    sequence_number: int
    created_at: datetime | None = None


class SyncConversationRequest(BaseModel):
    provider: str = "chatgpt"
    provider_conversation_id: str = Field(
        min_length=1,
        max_length=255,
    )
    title: str = Field(
        default="Untitled Conversation",
        max_length=500,
    )
    original_url: str | None = None
    messages: list[SyncMessage] = []


class PreviewMetadataRequest(BaseModel):
    messages: list[SyncMessage] = Field(
        min_length=1,
        max_length=5000,
    )


class FavouriteUpdateRequest(BaseModel):
    is_favourite: bool


class ConversationStatsResponse(BaseModel):
    conversation_count: int
    message_count: int
    favourite_count: int


@router.get(
    "",
    response_model=list[ConversationResponse],
)
def get_conversations(
    search: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ConversationResponse]:
    return ConversationService(db).get_user_conversations(
        current_user.id,
        search=search,
    )


@router.get(
    "/stats",
    response_model=ConversationStatsResponse,
)
def get_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConversationStatsResponse:
    counts = ConversationService(db).get_stats(
        current_user.id,
    )

    return ConversationStatsResponse(
        conversation_count=counts[0],
        message_count=counts[1],
        favourite_count=counts[2],
    )


@router.post(
    "/preview-metadata",
    response_model=ConversationMetadata,
)
def preview_metadata(
    payload: PreviewMetadataRequest,
    current_user: User = Depends(get_current_user),
) -> ConversationMetadata:
    del current_user

    try:
        return AIService().generate_conversation_metadata(
            [
                {
                    "role": message.role,
                    "content": message.content,
                }
                for message in payload.messages
            ]
        )
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "AI conversation metadata could not be generated."
            ),
        ) from error


@router.post(
    "/sync",
    response_model=ConversationResponse,
)
def sync_conversation(
    payload: SyncConversationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConversationResponse:
    if payload.provider != "chatgpt":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Only ChatGPT synchronization is supported."
            ),
        )

    try:
        service = ConversationService(db)

        return service.sync_live_conversation(
            current_user.id,
            payload,
        )
    except ValueError as error:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "The conversation could not be synchronized."
            ),
        ) from error


@router.get(
    "/{conversation_id}",
    response_model=ConversationResponse,
)
def get_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConversationResponse:
    try:
        return ConversationService(db).get_conversation(
            conversation_id,
            current_user.id,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error


@router.get(
    "/{conversation_id}/messages",
    response_model=list[MessageResponse],
)
def get_messages(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[MessageResponse]:
    try:
        ConversationService(db).get_conversation(
            conversation_id,
            current_user.id,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error

    return MessageService(
        db
    ).get_conversation_messages(
        conversation_id,
    )


@router.patch(
    "/{conversation_id}/favourite",
    response_model=ConversationResponse,
)
def set_favourite(
    conversation_id: int,
    payload: FavouriteUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConversationResponse:
    try:
        return ConversationService(db).set_favourite(
            conversation_id,
            current_user.id,
            payload.is_favourite,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error


@router.delete(
    "/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    try:
        ConversationService(db).delete_conversation(
            conversation_id=conversation_id,
            user_id=current_user.id,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error