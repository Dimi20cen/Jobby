from datetime import date, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.db.models import Application
from app.db.session import get_db
from app.schemas import (
    ApplicationActivityPoint,
    ApplicationActivityResponse,
    ApplicationDetail,
    ApplicationEmailLinksResponse,
    ApplicationsResponse,
    ApplicationSummary,
    CreateApplicationRequest,
    GmailConnectStartRequest,
    GmailConnectStartResponse,
    GmailSyncResponse,
    GmailConnectionStatus,
    HealthResponse,
    UpdateApplicationRequest,
)
from app.services.gmail import (
    GmailServiceError,
    build_connect_url,
    delete_link,
    get_application_email_links,
    get_connection_status,
    set_link_status,
    sync_threads,
)
from app.services.llm import LLMServiceError, generate_application

router = APIRouter()


def _normalize_list(value: list[str] | None) -> list[str]:
    if not value:
        return []
    return [item for item in value if isinstance(item, str)]


def _to_summary(application: Application) -> ApplicationSummary:
    return ApplicationSummary(
        id=application.id,
        company_name=application.company_name,
        job_title=application.job_title,
        location=application.location,
        status=application.status,
        applied_date=application.applied_date,
        cv_used=application.cv_used,
        created_at=application.created_at,
        updated_at=application.updated_at,
    )


def _to_detail(application: Application) -> ApplicationDetail:
    return ApplicationDetail(
        **_to_summary(application).model_dump(),
        job_url=application.job_url,
        job_description=application.job_description,
        notes=application.notes,
        cover_letter=application.cover_letter,
        interview_questions=_normalize_list(application.interview_questions),
        used_model=application.used_model,
        relevance_score=application.relevance_score,
        jd_coverage=_normalize_list(application.jd_coverage),
        risk_flags=_normalize_list(application.risk_flags),
    )


def _get_application_or_404(db: Session, application_id: UUID) -> Application:
    application = db.get(Application, application_id)
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found")
    return application


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok")


@router.get("/integrations/gmail/status", response_model=GmailConnectionStatus)
def gmail_status(db: Session = Depends(get_db)) -> GmailConnectionStatus:
    return GmailConnectionStatus(**get_connection_status(db))


@router.post("/integrations/gmail/connect/start", response_model=GmailConnectStartResponse)
def gmail_connect_start(
    payload: GmailConnectStartRequest, db: Session = Depends(get_db)
) -> GmailConnectStartResponse:
    try:
        auth_url = build_connect_url(db, payload.return_path)
    except GmailServiceError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return GmailConnectStartResponse(auth_url=auth_url)


@router.post("/integrations/gmail/sync", response_model=GmailSyncResponse)
def gmail_sync(db: Session = Depends(get_db)) -> GmailSyncResponse:
    try:
        result = sync_threads(db)
    except GmailServiceError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return GmailSyncResponse(
        connection=GmailConnectionStatus(**get_connection_status(db)),
        threads_synced=result.threads_synced,
        suggestions_updated=result.suggestions_updated,
    )


@router.get("/applications", response_model=ApplicationsResponse)
def list_applications(
    status_filter: str | None = Query(default=None, alias="status"),
    job_url: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    sort: str = Query(default="updated_at"),
    db: Session = Depends(get_db),
) -> ApplicationsResponse:
    sort_column = {
        "created_at": Application.created_at,
        "applied_date": Application.applied_date,
        "updated_at": Application.updated_at,
    }.get(sort, Application.updated_at)

    query = select(Application)
    if status_filter:
        query = query.where(Application.status == status_filter)
    if job_url:
        query = query.where(Application.job_url == job_url)
    rows = db.execute(query.order_by(desc(sort_column)).limit(limit)).scalars().all()
    return ApplicationsResponse(items=[_to_summary(row) for row in rows])


@router.get("/applications/activity", response_model=ApplicationActivityResponse)
def application_activity(
    days: int = Query(default=90, ge=7, le=365), db: Session = Depends(get_db)
) -> ApplicationActivityResponse:
    start_day = date.today() - timedelta(days=days - 1)
    rows = db.execute(select(Application).order_by(Application.created_at)).scalars().all()

    counts_by_day: dict[date, int] = {}
    for row in rows:
        day = row.applied_date or row.created_at.date()
        if day < start_day:
            continue
        counts_by_day[day] = counts_by_day.get(day, 0) + 1

    items = [
        ApplicationActivityPoint(day=start_day + timedelta(days=index), count=counts_by_day.get(start_day + timedelta(days=index), 0))
        for index in range(days)
    ]
    return ApplicationActivityResponse(items=items)


@router.post("/applications", response_model=ApplicationDetail, status_code=status.HTTP_201_CREATED)
def create_application(
    payload: CreateApplicationRequest, db: Session = Depends(get_db)
) -> ApplicationDetail:
    if payload.status == "applied" and payload.applied_date is None:
        raise HTTPException(status_code=400, detail="Applied applications require an applied_date.")
    application = Application(
        company_name=payload.company_name,
        job_title=payload.job_title,
        location=payload.location,
        status=payload.status,
        applied_date=payload.applied_date,
        job_url=payload.job_url,
        job_description=payload.job_description,
        cv_used=payload.cv_used,
        notes=payload.notes,
        cover_letter=payload.cover_letter,
        interview_questions=payload.interview_questions,
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    return _to_detail(application)


@router.get("/applications/{application_id}", response_model=ApplicationDetail)
def get_application(application_id: UUID, db: Session = Depends(get_db)) -> ApplicationDetail:
    return _to_detail(_get_application_or_404(db, application_id))


@router.get("/applications/{application_id}/email-links", response_model=ApplicationEmailLinksResponse)
def application_email_links(
    application_id: UUID, db: Session = Depends(get_db)
) -> ApplicationEmailLinksResponse:
    try:
        return ApplicationEmailLinksResponse(**get_application_email_links(db, application_id))
    except GmailServiceError as exc:
        if "not found" in str(exc).lower():
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.put("/applications/{application_id}", response_model=ApplicationDetail)
def update_application(
    application_id: UUID, payload: UpdateApplicationRequest, db: Session = Depends(get_db)
) -> ApplicationDetail:
    application = _get_application_or_404(db, application_id)
    updates = payload.model_dump(exclude_unset=True)
    next_status = updates.get("status", application.status)
    next_applied_date = updates.get("applied_date", application.applied_date)
    if next_status == "applied" and next_applied_date is None:
        raise HTTPException(status_code=400, detail="Applied applications require an applied_date.")
    for field, value in updates.items():
        setattr(application, field, value)
    db.add(application)
    db.commit()
    db.refresh(application)
    return _to_detail(application)


@router.delete("/applications/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(application_id: UUID, db: Session = Depends(get_db)) -> Response:
    application = _get_application_or_404(db, application_id)
    db.delete(application)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/applications/{application_id}/email-links/{thread_id}/link",
    response_model=ApplicationEmailLinksResponse,
)
def link_application_email_thread(
    application_id: UUID, thread_id: str, db: Session = Depends(get_db)
) -> ApplicationEmailLinksResponse:
    try:
        return ApplicationEmailLinksResponse(**set_link_status(db, application_id, thread_id, "linked"))
    except GmailServiceError as exc:
        if "not found" in str(exc).lower():
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post(
    "/applications/{application_id}/email-links/{thread_id}/reject",
    response_model=ApplicationEmailLinksResponse,
)
def reject_application_email_thread(
    application_id: UUID, thread_id: str, db: Session = Depends(get_db)
) -> ApplicationEmailLinksResponse:
    try:
        return ApplicationEmailLinksResponse(**set_link_status(db, application_id, thread_id, "rejected"))
    except GmailServiceError as exc:
        if "not found" in str(exc).lower():
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete(
    "/applications/{application_id}/email-links/{thread_id}",
    response_model=ApplicationEmailLinksResponse,
)
def unlink_application_email_thread(
    application_id: UUID, thread_id: str, db: Session = Depends(get_db)
) -> ApplicationEmailLinksResponse:
    try:
        return ApplicationEmailLinksResponse(**delete_link(db, application_id, thread_id))
    except GmailServiceError as exc:
        if "not found" in str(exc).lower():
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/applications/{application_id}/generate", response_model=ApplicationDetail)
def generate_for_application(
    application_id: UUID, db: Session = Depends(get_db)
) -> ApplicationDetail:
    application = _get_application_or_404(db, application_id)
    if len(application.job_description.strip()) < 30 or len(application.cv_used.strip()) < 30:
        raise HTTPException(
            status_code=400,
            detail="Job description and CV used must both be at least 30 characters before generating.",
        )

    try:
        (
            cover_letter,
            interview_questions,
            relevance_score,
            jd_coverage,
            risk_flags,
            used_model,
        ) = generate_application(
            job_description=application.job_description,
            cv_text=application.cv_used,
        )
    except LLMServiceError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    application.cover_letter = cover_letter
    application.interview_questions = interview_questions
    application.relevance_score = relevance_score
    application.jd_coverage = jd_coverage
    application.risk_flags = risk_flags
    application.used_model = used_model
    db.add(application)
    db.commit()
    db.refresh(application)
    return _to_detail(application)
