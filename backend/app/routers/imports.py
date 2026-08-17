import json

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.import_job import ImportJobResponse
from app.services.import_service import ImportService


router = APIRouter(
    prefix="/imports",
    tags=["Imports"],
)


@router.post(
    "",
    response_model=ImportJobResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_import_job(
    provider: str,
    source: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ImportJobResponse:
    if provider != "chatgpt":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only ChatGPT imports are supported.",
        )

    if source != "export":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only export imports are supported.",
        )

    if file.filename is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A file is required.",
        )

    if not file.filename.lower().endswith(".json"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The import file must be a JSON file.",
        )

    try:
        file_contents = file.file.read()
        data = json.loads(file_contents)
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is not valid JSON.",
        )

    service = ImportService(db)

    import_job = service.create_import_job(
        user_id=current_user.id,
        provider=provider,
        source=source,
        filename=file.filename,
    )

    try:
        return service.process_chatgpt_export(
            import_job=import_job,
            user_id=current_user.id,
            data=data,
        )
    except ValueError as error:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        )
    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="The import could not be processed.",
        )


@router.get(
    "/{import_job_id}",
    response_model=ImportJobResponse,
)
def get_import_job(
    import_job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ImportJobResponse:
    service = ImportService(db)

    try:
        return service.get_import_job(
            import_job_id=import_job_id,
            user_id=current_user.id,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )