from sqlalchemy.orm import Session

from app.models.import_job import ImportJob


class ImportJobRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_import_job(
        self,
        import_job: ImportJob,
    ) -> ImportJob:
        self.db.add(import_job)
        self.db.commit()
        self.db.refresh(import_job)

        return import_job

    def get_import_job_by_id(
        self,
        import_job_id: int,
    ) -> ImportJob | None:
        return self.db.get(ImportJob, import_job_id)

    def update_import_job(
        self,
        import_job: ImportJob,
    ) -> ImportJob:
        self.db.commit()
        self.db.refresh(import_job)

        return import_job