import json

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.dependencies import get_current_user
from app.database.session import SessionLocal, get_db
from app.models.user import User
from app.schemas.import_job import ImportJobResponse
from app.services.import_service import ImportService


router = APIRouter(
    prefix="/imports",
    tags=["Imports"],
)


def _run_import(
    import_job_id: int,
    user_id: int,
    data,
) -> None:
    db = SessionLocal()

    try:
        service = ImportService(db)
        import_job = service.repository.get_import_job_by_id(
            import_job_id
        )

        if import_job is None:
            return

        service.process_chatgpt_export(
            import_job=import_job,
            user_id=user_id,
            data=data,
        )
    except Exception as error:
        db.rollback()

        try:
            service = ImportService(db)
            import_job = service.repository.get_import_job_by_id(
                import_job_id
            )

            if import_job is not None:
                service.fail_import(import_job, str(error))
        except Exception:
            pass
    finally:
        db.close()


@router.post(
    "",
    response_model=ImportJobResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def create_import_job(
    background_tasks: BackgroundTasks,
    provider: str = Query(default="chatgpt"),
    source: str = Query(default="export"),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ImportJobResponse:
    settings = get_settings()

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

    file_contents = await file.read()

    if len(file_contents) > settings.import_max_file_bytes:
        limit_mb = settings.import_max_file_bytes // (1024 * 1024)

        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=(
                f"The import file is larger than {limit_mb} MB."
            ),
        )

    if not file_contents:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty.",
        )

    try:
        data = json.loads(file_contents)
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is not valid JSON.",
        )

    del file_contents

    if not isinstance(data, (list, dict)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "The uploaded file is not a ChatGPT conversation export."
            ),
        )

    service = ImportService(db)

    import_job = service.create_import_job(
        user_id=current_user.id,
        provider=provider,
        source=source,
        filename=file.filename[:500],
    )

    background_tasks.add_task(
        _run_import,
        import_job.id,
        current_user.id,
        data,
    )

    return ImportJobResponse.model_validate(import_job)


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
        import_job = service.get_import_job(
            import_job_id=import_job_id,
            user_id=current_user.id,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )

    return ImportJobResponse.model_validate(import_job)
