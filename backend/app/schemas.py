from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class GenerateRequest(BaseModel):
    job_description: str = Field(min_length=30)
    cv_text: str = Field(min_length=30)


class GenerateResponse(BaseModel):
    tailored_bullets: list[str]
    cover_letter: str
    interview_questions: list[str]
    relevance_score: int
    jd_coverage: list[str]
    risk_flags: list[str]
    used_model: str
    application_id: UUID
    created_at: datetime


class HealthResponse(BaseModel):
    status: str


class ApplicationHistoryItem(BaseModel):
    id: UUID
    tailored_bullets: list[str]
    cover_letter: str
    created_at: datetime


class ApplicationsResponse(BaseModel):
    items: list[ApplicationHistoryItem]
