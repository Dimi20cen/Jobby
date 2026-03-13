from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

ApplicationStatus = Literal["draft", "applied", "interview", "offer", "rejected", "archived"]
ApplicationEmailLinkStatus = Literal["suggested", "linked", "rejected"]


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


class GmailConnectionStatus(BaseModel):
    connected: bool
    email_address: str | None
    connected_at: datetime | None
    has_pending_auth: bool


class GmailConnectStartRequest(BaseModel):
    return_path: str | None = "/"


class GmailConnectStartResponse(BaseModel):
    auth_url: str


class GmailSyncResponse(BaseModel):
    connection: GmailConnectionStatus
    threads_synced: int
    suggestions_updated: int


class ApplicationEmailThread(BaseModel):
    thread_id: str
    subject: str
    participants_summary: str
    snippet: str
    last_message_at: datetime | None
    message_count: int
    gmail_url: str
    status: ApplicationEmailLinkStatus
    match_score: int
    match_reasons: list[str]


class ApplicationEmailLinksResponse(BaseModel):
    connection: GmailConnectionStatus
    suggested: list[ApplicationEmailThread]
    linked: list[ApplicationEmailThread]
    rejected_thread_ids: list[str]
