from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.conversation import ConversationResponse
from app.schemas.message import MessageResponse
from app.services.conversation_service import ConversationService
from app.services.message_service import MessageService


router = APIRouter(
    prefix="/conversations",
    tags=["Conversations"],
)


@router.get(
    "",
    response_model=list[ConversationResponse],
)
def get_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ConversationResponse]:
    service = ConversationService(db)

    return service.get_user_conversations(
        user_id=current_user.id
    )


@router.get(
    "/{conversation_id}",
    response_model=ConversationResponse,
)
def get_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ConversationResponse:
    service = ConversationService(db)

    try:
        return service.get_conversation(
            conversation_id=conversation_id,
            user_id=current_user.id,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )


@router.get(
    "/{conversation_id}/messages",
    response_model=list[MessageResponse],
)
def get_conversation_messages(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[MessageResponse]:
    conversation_service = ConversationService(db)

    try:
        conversation_service.get_conversation(
            conversation_id=conversation_id,
            user_id=current_user.id,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )

    message_service = MessageService(db)

    return message_service.get_conversation_messages(
        conversation_id=conversation_id
    )


@router.delete(
    "/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    service = ConversationService(db)

    try:
        service.delete_conversation(
            conversation_id=conversation_id,
            user_id=current_user.id,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )