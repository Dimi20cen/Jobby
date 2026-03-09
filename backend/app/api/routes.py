from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import ValidationError
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.db.models import Application
from app.db.session import get_db
from app.schemas import (
    ApplicationHistoryItem,
    ApplicationsResponse,
    GenerateRequest,
    GenerateResponse,
    HealthResponse,
)
from app.services.llm import LLMServiceError, generate_application

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok")


@router.post("/generate", response_model=GenerateResponse)
def generate(payload: GenerateRequest, db: Session = Depends(get_db)) -> GenerateResponse:
    try:
        bullets, cover_letter = generate_application(
            job_description=payload.job_description,
            cv_text=payload.cv_text,
        )
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except LLMServiceError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    application = Application(
        job_description=payload.job_description,
        cv_text=payload.cv_text,
        tailored_bullets=bullets,
        cover_letter=cover_letter,
    )
    db.add(application)
    db.commit()
    db.refresh(application)

    return GenerateResponse(
        tailored_bullets=application.tailored_bullets,
        cover_letter=application.cover_letter,
        application_id=application.id,
        created_at=application.created_at,
    )


@router.get("/applications", response_model=ApplicationsResponse)
def list_applications(
    limit: int = Query(default=5, ge=1, le=20), db: Session = Depends(get_db)
) -> ApplicationsResponse:
    rows = db.execute(select(Application).order_by(desc(Application.created_at)).limit(limit)).scalars().all()

    return ApplicationsResponse(
        items=[
            ApplicationHistoryItem(
                id=row.id,
                tailored_bullets=row.tailored_bullets,
                cover_letter=row.cover_letter,
                created_at=row.created_at,
            )
            for row in rows
        ]
    )
