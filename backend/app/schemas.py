from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

ApplicationStatus = Literal["draft", "applied", "interview", "offer", "rejected", "archived"]


class HealthResponse(BaseModel):
    status: str


class ApplicationBase(BaseModel):
    company_name: str = Field(min_length=1, max_length=255)
    job_title: str = Field(min_length=1, max_length=255)
    location: str | None = Field(default=None, max_length=255)
    status: ApplicationStatus = "draft"
    applied_date: date | None = None
    job_url: str | None = None
    job_description: str = ""
    cv_used: str = ""
    notes: str = ""
    cover_letter: str = ""
    interview_questions: list[str] = Field(default_factory=list)


class CreateApplicationRequest(ApplicationBase):
    pass


class UpdateApplicationRequest(BaseModel):
    company_name: str | None = Field(default=None, min_length=1, max_length=255)
    job_title: str | None = Field(default=None, min_length=1, max_length=255)
    location: str | None = Field(default=None, max_length=255)
    status: ApplicationStatus | None = None
    applied_date: date | None = None
    job_url: str | None = None
    job_description: str | None = None
    cv_used: str | None = None
    notes: str | None = None
    cover_letter: str | None = None
    interview_questions: list[str] | None = None


class ApplicationSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_name: str
    job_title: str
    location: str | None
    status: ApplicationStatus
    applied_date: date | None
    cv_used: str
    created_at: datetime
    updated_at: datetime


class ApplicationDetail(ApplicationSummary):
    job_url: str | None
    job_description: str
    notes: str
    cover_letter: str
    interview_questions: list[str]
    used_model: str | None
    relevance_score: int | None
    jd_coverage: list[str]
    risk_flags: list[str]


class ApplicationsResponse(BaseModel):
    items: list[ApplicationSummary]


class ApplicationActivityPoint(BaseModel):
    day: date
    count: int


class ApplicationActivityResponse(BaseModel):
    items: list[ApplicationActivityPoint]
